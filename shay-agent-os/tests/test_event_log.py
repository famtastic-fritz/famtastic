"""
tests/test_event_log.py — event spine unit tests (standalone, no orchestrator).

Run: SHAY_EVENTS_LOG=/tmp/t.jsonl python3 tests/test_event_log.py
The env override is what keeps this off the real ~/.shay/events.jsonl.
"""

from __future__ import annotations

import os
import sys
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def main() -> int:
    tmp = tempfile.mktemp(suffix=".jsonl")
    os.environ["SHAY_EVENTS_LOG"] = tmp

    # Import AFTER setting the env so events_path() resolves to the temp file.
    from api import event_log

    assert event_log.events_path().as_posix() == tmp, "env override not honored"
    assert event_log.read_tail() == [], "empty log should read []"
    assert event_log.file_size() == 0, "missing file size should be 0"

    # --- emit + schema ---
    e = event_log.emit(type="task_start", message="hello", severity="info",
                        agent_id="worker-1", source="test", extra_field=42)
    for key in ("id", "timestamp", "type", "agentId", "message", "severity", "source"):
        assert key in e, f"event missing {key}"
    assert e["type"] == "task_start" and e["agentId"] == "worker-1"
    assert e["meta"] == {"extra_field": 42}, "extra kwargs should land under meta"

    # --- bad type/severity coerce to safe defaults ---
    bad = event_log.emit(type="not-a-type", message="x", severity="loud")
    assert bad["type"] == "log" and bad["severity"] == "info", "coercion failed"

    # --- read_tail ordering + limit ---
    for i in range(5):
        event_log.system(f"sys {i}")
    tail = event_log.read_tail(limit=3, newest_first=True)
    assert len(tail) == 3, f"expected 3, got {len(tail)}"
    assert tail[0]["message"] == "sys 4", "newest_first ordering broken"
    oldest = event_log.read_tail(limit=3, newest_first=False)
    assert oldest[-1]["message"] == "sys 4", "newest_last ordering broken"

    # --- read_since incremental follower primitive ---
    off0 = event_log.file_size()
    event_log.emit(type="error", message="boom", severity="error")
    new_off, new_events = event_log.read_since(off0)
    assert len(new_events) == 1 and new_events[0]["message"] == "boom"
    assert new_off == event_log.file_size(), "offset should reach EOF"
    # No new data → no events, offset stable.
    same_off, none_events = event_log.read_since(new_off)
    assert none_events == [] and same_off == new_off, "spurious re-read"

    # --- truncation/rotation safety: offset past EOF restarts from head ---
    restart_off, restart_events = event_log.read_since(10**9)
    assert len(restart_events) >= 1, "over-large offset should restart from head"

    os.remove(tmp)
    print("OK — all event_log tests passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
