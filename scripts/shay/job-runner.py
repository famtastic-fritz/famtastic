#!/usr/bin/env python3
"""
job-runner.py — the missing executor that makes phone-dispatched jobs actually run.

The phone (shay-phone) already lets you ADD jobs (Dispatch tab → jobs.json) and VIEW
jobs (Tasks tab → /api/jobs), but nothing ever RAN them — they sat at "queued"
forever, which is why the phone felt un-synced / unusable. This is that worker:

  queued job  →  run it through Shay's gateway  →  write progress + result back
              →  emit events to the shared spine (~/.shay/events.jsonl)

so the phone's Tasks tab and Feed reflect real, live status. THIS is what makes
"send a job from my phone and Shay does it" actually work, end to end.

Stdlib-only (matches shay-phone/server.py) — no pip deps. Cross-process safe via
flock around every read-modify-write of jobs.json (the phone server writes it too).

RUN ON THE MAC (where Shay's gateway lives):
  python3 ~/famtastic/scripts/shay/job-runner.py            # poll forever (daemon)
  python3 ~/famtastic/scripts/shay/job-runner.py --once     # drain the queue, exit
  SHAY_JOB_RUNNER_MOCK=1 python3 ... --once                 # no gateway; echo (tests)

Config (env, all optional):
  SHAY_GATEWAY_URL   default http://127.0.0.1:8642/v1/chat/completions
  SHAY_MODEL         default "" (let the gateway pick its configured default)
  SHAY_GATEWAY_KEY   optional bearer token for the gateway
  SHAY_PHONE_JOBS    default ~/famtastic/shay-phone/jobs.json
  SHAY_EVENTS_LOG    default ~/.shay/events.jsonl (the shared spine)
  SHAY_JOB_POLL_SEC  default 3
"""
from __future__ import annotations

import json
import os
import sys
import time
import uuid
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path

HOME = Path.home()
JOBS_FILE = Path(os.environ.get("SHAY_PHONE_JOBS", str(HOME / "famtastic" / "shay-phone" / "jobs.json")))
EVENTS_LOG = Path(os.environ.get("SHAY_EVENTS_LOG", str(HOME / ".shay" / "events.jsonl")))
GATEWAY_URL = os.environ.get("SHAY_GATEWAY_URL", "http://127.0.0.1:8642/v1/chat/completions")
MODEL = os.environ.get("SHAY_MODEL", "").strip()
GATEWAY_KEY = os.environ.get("SHAY_GATEWAY_KEY", "").strip()
POLL_SEC = float(os.environ.get("SHAY_JOB_POLL_SEC", "3"))
MOCK = os.environ.get("SHAY_JOB_RUNNER_MOCK", "") not in ("", "0", "false", "False")


# --------------------------------------------------------------------------- #
# Shared event spine — same schema as shay-agent-os/api/event_log.py so the line
# maps 1:1 to a dashboard/phone ActivityEvent.
# --------------------------------------------------------------------------- #
def emit_event(etype: str, message: str, severity: str = "info", **meta) -> None:
    valid = {"heartbeat", "task_start", "task_complete", "task_fail", "log", "error", "command", "system"}
    event = {
        "id": "evt-" + uuid.uuid4().hex[:12],
        "timestamp": datetime.now().astimezone().isoformat(),
        "type": etype if etype in valid else "log",
        "agentId": "shay",
        "message": message,
        "severity": severity if severity in {"info", "warn", "error", "success"} else "info",
        "source": "shay",
    }
    if meta:
        event["meta"] = meta
    try:
        EVENTS_LOG.parent.mkdir(parents=True, exist_ok=True)
        with open(EVENTS_LOG, "a", encoding="utf-8") as fh:
            _flocked(fh, lambda: fh.write(json.dumps(event, ensure_ascii=False) + "\n"))
    except Exception:  # noqa: BLE001 — emitting must never break the runner
        pass


def _flocked(fh, fn):
    """Run fn() while holding an exclusive lock on fh (POSIX). Returns fn()'s value."""
    try:
        import fcntl
        fcntl.flock(fh.fileno(), fcntl.LOCK_EX)
        try:
            return fn()
        finally:
            fh.flush()
            fcntl.flock(fh.fileno(), fcntl.LOCK_UN)
    except ImportError:
        return fn()


# --------------------------------------------------------------------------- #
# Job store (jobs.json) — same shape the phone writes: a JSON list, newest first.
# Every mutation is a locked read-modify-write so we never race the phone server.
# --------------------------------------------------------------------------- #
def _load(fh) -> list:
    fh.seek(0)
    raw = fh.read().strip()
    if not raw:
        return []
    try:
        data = json.loads(raw)
        return data if isinstance(data, list) else []
    except json.JSONDecodeError:
        return []


def _dump(fh, jobs: list) -> None:
    fh.seek(0)
    fh.truncate()
    fh.write(json.dumps(jobs, indent=2))


def claim_next_job() -> dict | None:
    """Atomically find the oldest queued job, flip it to running, persist, return it."""
    if not JOBS_FILE.exists():
        return None
    with open(JOBS_FILE, "r+", encoding="utf-8") as fh:
        def _claim():
            jobs = _load(fh)
            # Oldest first among queued (jobs list is newest-first → reverse scan).
            for job in sorted([j for j in jobs if j.get("status") == "queued"],
                              key=lambda j: j.get("created", 0)):
                job["status"] = "running"
                job["started"] = time.time()
                _dump(fh, jobs)
                return dict(job)
            return None
        return _flocked(fh, _claim)


def update_job(jid: str, **fields) -> None:
    """Locked patch of a single job by id (status/output/completed/progress…)."""
    if not JOBS_FILE.exists():
        return
    with open(JOBS_FILE, "r+", encoding="utf-8") as fh:
        def _update():
            jobs = _load(fh)
            for job in jobs:
                if job.get("id") == jid:
                    progress = fields.pop("progress_append", None)
                    job.update(fields)
                    if progress is not None:
                        job.setdefault("progress", []).append(progress)
                    _dump(fh, jobs)
                    return
        _flocked(fh, _update)


# --------------------------------------------------------------------------- #
# Run a job through Shay's gateway (OpenAI-compatible chat completion).
# --------------------------------------------------------------------------- #
def run_with_shay(goal: str) -> str:
    if MOCK:
        return f"[mock] Shay would handle: {goal}"
    payload = {
        "messages": [
            {"role": "system", "content": "You are Shay. Complete the dispatched job and "
                                          "reply with the result, concisely and usefully."},
            {"role": "user", "content": goal},
        ],
        "stream": False,
    }
    if MODEL:
        payload["model"] = MODEL
    req = urllib.request.Request(
        GATEWAY_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json",
                 **({"Authorization": f"Bearer {GATEWAY_KEY}"} if GATEWAY_KEY else {})},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=300) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    # OpenAI-compatible shape; be defensive about variants.
    try:
        return data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, TypeError):
        return json.dumps(data)[:2000]


def process_one() -> bool:
    """Claim and run one job. Returns True if a job was processed, False if idle."""
    job = claim_next_job()
    if not job:
        return False
    jid, goal = job["id"], job.get("goal", "")
    print(f"[job-runner] running {jid}: {goal[:80]}", flush=True)
    emit_event("log", f"Shay started: {goal[:120]}", job_id=jid)
    update_job(jid, progress_append={"message": "Shay picked up the job", "ts": time.time()})
    try:
        output = run_with_shay(goal)
        update_job(jid, status="completed", output=output, completed=time.time(),
                   progress_append={"message": "Done", "ts": time.time()})
        emit_event("task_complete", f"Job done: {goal[:120]}", severity="success", job_id=jid)
        print(f"[job-runner] completed {jid}", flush=True)
    except Exception as exc:  # noqa: BLE001
        msg = f"{type(exc).__name__}: {exc}"
        update_job(jid, status="failed", output=msg, completed=time.time(),
                   progress_append={"message": f"Failed: {msg}", "ts": time.time()})
        emit_event("task_fail", f"Job failed: {goal[:80]} — {msg}", severity="error", job_id=jid)
        print(f"[job-runner] FAILED {jid}: {msg}", flush=True)
    return True


def main(argv: list[str]) -> int:
    once = "--once" in argv
    where = "MOCK" if MOCK else GATEWAY_URL
    print(f"[job-runner] store={JOBS_FILE}  gateway={where}  {'(drain once)' if once else f'(poll {POLL_SEC}s)'}",
          flush=True)
    emit_event("system", "Job runner online" + (" (mock)" if MOCK else ""), severity="success")
    if once:
        n = 0
        while process_one():
            n += 1
        print(f"[job-runner] drained {n} job(s).", flush=True)
        return 0
    # Daemon: poll forever.
    while True:
        try:
            if not process_one():
                time.sleep(POLL_SEC)
        except KeyboardInterrupt:
            print("\n[job-runner] stopping.", flush=True)
            return 0
        except Exception as exc:  # noqa: BLE001 — the loop must survive any single failure
            print(f"[job-runner] loop error: {exc}", flush=True)
            time.sleep(POLL_SEC)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
