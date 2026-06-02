"""Shared heartbeat helper for pipeline agents.

Each agent calls beat(name, status, detail) frequently — at minimum once per
loop iteration, and ideally before/after any blocking network call. The
Command Center reads these files and flags an agent HUNG when its heartbeat
goes stale even though the process is still alive. That is exactly the failure
mode the scout hit: PID alive, wedged on a network call, no progress.
"""
import json
import os
import time
from pathlib import Path

HEARTBEAT_DIR = Path.home() / "famtastic" / "pipeline" / "data" / "heartbeats"


def beat(name, status="ok", detail=None):
    try:
        HEARTBEAT_DIR.mkdir(parents=True, exist_ok=True)
        path = HEARTBEAT_DIR / f"{name}.json"
        tmp = path.with_suffix(".json.tmp")
        payload = {"name": name, "ts": time.time(), "status": status, "detail": detail}
        tmp.write_text(json.dumps(payload))
        os.replace(tmp, path)  # atomic
    except Exception:
        # Heartbeat must never crash the agent.
        pass
