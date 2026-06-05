"""
api/event_log.py — the command-center event spine.

Append-only JSONL log that every surface writes to and the dashboard reads from.
This is the single source of truth for the Activity Feed. One file, many writers
(agent-os internals, cron, kanban mutations, the fleet bridge), one reader (the
dashboard via /api/events + /ws/events).

Design rules:
- Append-only. We never rewrite the file in normal operation (rotation is a
  separate, explicit concern).
- Multi-writer safe via an exclusive flock around each append, so concurrent
  emitters (Python orchestrator + Node fleet bridge + cron) never interleave a
  half-written line.
- Schema matches the dashboard's `ActivityEvent` (see
  components/dashboard/src/hooks/useDashboardStore.ts) so a line maps 1:1 to a
  feed row with no translation:
      { id, timestamp, type, agentId?, message, severity, source }
- Location is `$SHAY_EVENTS_LOG` if set, else `$SHAY_HOME/events.jsonl`, else
  `~/.shay/events.jsonl`. The env override is what lets tests and the cloud
  container (no ~/.shay) run without touching the real log.
"""

from __future__ import annotations

import json
import os
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

# Event types the dashboard renderer knows how to draw (TypeIcon in ActivityPanel).
EVENT_TYPES = {
    "heartbeat",
    "task_start",
    "task_complete",
    "task_fail",
    "log",
    "error",
    "command",
    "system",
}
SEVERITIES = {"info", "warn", "error", "success"}


def events_path() -> Path:
    """Resolve the events log path, honoring env overrides (test/cloud safe)."""
    override = os.environ.get("SHAY_EVENTS_LOG")
    if override:
        return Path(override).expanduser()
    home = os.environ.get("SHAY_HOME")
    base = Path(home).expanduser() if home else Path.home() / ".shay"
    return base / "events.jsonl"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize(
    *,
    type: str,
    message: str,
    severity: str = "info",
    agent_id: Optional[str] = None,
    source: str = "agent-os",
    timestamp: Optional[str] = None,
    id: Optional[str] = None,
    **extra: Any,
) -> Dict[str, Any]:
    """Build a schema-valid event dict (without writing it)."""
    etype = type if type in EVENT_TYPES else "log"
    sev = severity if severity in SEVERITIES else "info"
    event: Dict[str, Any] = {
        "id": id or f"evt-{uuid.uuid4().hex[:12]}",
        "timestamp": timestamp or _now_iso(),
        "type": etype,
        "agentId": agent_id,
        "message": message,
        "severity": sev,
        "source": source,
    }
    if extra:
        # Keep any extra structured fields under a namespaced key so they never
        # collide with the core schema the renderer depends on.
        event["meta"] = extra
    return event


def emit(
    *,
    type: str,
    message: str,
    severity: str = "info",
    agent_id: Optional[str] = None,
    source: str = "agent-os",
    **extra: Any,
) -> Dict[str, Any]:
    """Append one event to the spine and return it.

    Best-effort: if the log can't be written (e.g. read-only fs) we still return
    the event so callers/broadcast aren't blocked — emitting must never crash a
    task path. The dashboard tolerates gaps; it must never tolerate a crash.
    """
    event = normalize(
        type=type,
        message=message,
        severity=severity,
        agent_id=agent_id,
        source=source,
        **extra,
    )
    line = json.dumps(event, ensure_ascii=False) + "\n"
    path = events_path()
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "a", encoding="utf-8") as fh:
            _locked_append(fh, line)
    except Exception:  # noqa: BLE001 — emitting is best-effort by contract
        pass
    return event


def _locked_append(fh, line: str) -> None:
    """Append `line` under an exclusive advisory lock when fcntl is available."""
    try:
        import fcntl  # POSIX only (mac + linux); absent on Windows

        fcntl.flock(fh.fileno(), fcntl.LOCK_EX)
        try:
            fh.write(line)
            fh.flush()
        finally:
            fcntl.flock(fh.fileno(), fcntl.LOCK_UN)
    except ImportError:
        fh.write(line)
        fh.flush()


def read_tail(limit: int = 50, *, newest_first: bool = True) -> List[Dict[str, Any]]:
    """Return up to `limit` most-recent events as parsed dicts.

    Reads the whole file then slices — fine for the dashboard's scale (a feed,
    not an analytics store). Rotation keeps the file bounded. Malformed lines are
    skipped, never fatal.
    """
    path = events_path()
    if not path.exists():
        return []
    try:
        with open(path, "r", encoding="utf-8") as fh:
            lines = fh.readlines()
    except Exception:  # noqa: BLE001
        return []

    events: List[Dict[str, Any]] = []
    for raw in lines[-max(limit, 0) * 4 - limit :]:  # over-read, then trim post-parse
        raw = raw.strip()
        if not raw:
            continue
        try:
            events.append(json.loads(raw))
        except json.JSONDecodeError:
            continue
    events = events[-limit:] if limit else events
    if newest_first:
        events = list(reversed(events))
    return events


def file_size() -> int:
    """Current byte size of the log (0 if absent) — used by the WS follower."""
    path = events_path()
    try:
        return path.stat().st_size
    except FileNotFoundError:
        return 0


def read_since(offset: int) -> tuple[int, List[Dict[str, Any]]]:
    """Read complete events appended after byte `offset`.

    Returns (new_offset, events). Only consumes whole lines; a partial trailing
    line (mid-write) is left for the next poll by rewinding the offset to the
    last newline. This is the primitive the WebSocket follower polls.
    """
    path = events_path()
    if not path.exists():
        return 0, []
    try:
        with open(path, "rb") as fh:
            fh.seek(0, os.SEEK_END)
            size = fh.tell()
            if offset > size:  # file was truncated/rotated — restart from head
                offset = 0
            fh.seek(offset)
            chunk = fh.read()
    except Exception:  # noqa: BLE001
        return offset, []

    if not chunk:
        return offset, []

    last_nl = chunk.rfind(b"\n")
    if last_nl == -1:
        return offset, []  # no complete line yet
    complete = chunk[: last_nl + 1]
    new_offset = offset + last_nl + 1

    events: List[Dict[str, Any]] = []
    for raw in complete.decode("utf-8", errors="replace").splitlines():
        raw = raw.strip()
        if not raw:
            continue
        try:
            events.append(json.loads(raw))
        except json.JSONDecodeError:
            continue
    return new_offset, events


# Convenience wrappers mirroring the dashboard's event types -----------------

def task_start(message: str, agent_id: Optional[str] = None, **extra: Any) -> Dict[str, Any]:
    return emit(type="task_start", message=message, severity="info", agent_id=agent_id, **extra)


def task_complete(message: str, agent_id: Optional[str] = None, **extra: Any) -> Dict[str, Any]:
    return emit(type="task_complete", message=message, severity="success", agent_id=agent_id, **extra)


def task_fail(message: str, agent_id: Optional[str] = None, **extra: Any) -> Dict[str, Any]:
    return emit(type="task_fail", message=message, severity="error", agent_id=agent_id, **extra)


def system(message: str, severity: str = "info", **extra: Any) -> Dict[str, Any]:
    return emit(type="system", message=message, severity=severity, source="agent-os", **extra)
