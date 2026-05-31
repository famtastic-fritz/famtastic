#!/usr/bin/env python3
"""
Orchestrator heartbeat + checkpoint system
Run this in the background or call it after every significant action
"""

import json
import time
import os
from pathlib import Path

LOG_DIR = Path.home() / "famtastic/shay-agent-os/logs"
HEARTBEAT_DIR = LOG_DIR / "heartbeat"
CHECKPOINT_DIR = Path.home() / ".shay/checkpoints"

for d in [LOG_DIR, HEARTBEAT_DIR, CHECKPOINT_DIR]:
    d.mkdir(parents=True, exist_ok=True)


def write_orchestrator_heartbeat(step: str, status: str = "ALIVE", message: str = ""):
    """Call this after every significant action to show live progress"""
    hb = {
        "agent": "orchestrator",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "step": step,
        "status": status,
        "message": message,
    }
    path = HEARTBEAT_DIR / "orchestrator.json"
    with open(path, "w") as f:
        json.dump(hb, f, indent=2)
    # Also append to live log
    log_path = LOG_DIR / "orchestrator-live.log"
    with open(log_path, "a") as f:
        f.write(f"[{hb['timestamp']}] {status} | {step} | {message}\n")


def checkpoint(session_id: str, context: dict):
    """Save session state for crash recovery"""
    cp = {
        "session_id": session_id,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "context": context,
    }
    path = CHECKPOINT_DIR / f"{session_id}.json"
    with open(path, "w") as f:
        json.dump(cp, f, indent=2)
    return path


def latest_checkpoint():
    """Find the most recent checkpoint"""
    checkpoints = sorted(CHECKPOINT_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not checkpoints:
        return None
    with open(checkpoints[0]) as f:
        return json.load(f)


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "heartbeat":
        step = sys.argv[2] if len(sys.argv) > 2 else "idle"
        msg = sys.argv[3] if len(sys.argv) > 3 else ""
        write_orchestrator_heartbeat(step, message=msg)
        print(f"Heartbeat written: {step}")
    elif len(sys.argv) > 1 and sys.argv[1] == "checkpoint":
        session = sys.argv[2] if len(sys.argv) > 2 else "unknown"
        ctx = {"args": sys.argv[3:]} if len(sys.argv) > 3 else {}
        path = checkpoint(session, ctx)
        print(f"Checkpoint saved: {path}")
    else:
        print("Usage:")
        print("  python3 orchestrator-state.py heartbeat '<step>' '<message>'")
        print("  python3 orchestrator-state.py checkpoint <session-id> [context...]")
