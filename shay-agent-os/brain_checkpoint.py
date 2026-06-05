#!/usr/bin/env python3
"""
brain_checkpoint.py — Shay's bridge into the Brain Sync Contract.

Every Shay run must leave a session trace in the brain, the same way Claude Code
does via its hooks. This wraps the canonical writer
(`scripts/brain/session-checkpoint.js`) so Python agent surfaces get the same
trace at `obsidian/05-Captures/sessions/<date>/SESSION-<id>.md`.

Usage (CLI):
    python3 shay-agent-os/brain_checkpoint.py start [session_id]
    python3 shay-agent-os/brain_checkpoint.py stop  [session_id]

Usage (import):
    from brain_checkpoint import checkpoint
    checkpoint("start", session_id="overnight-arc-20260602")

Contract: never raises, never blocks — a brain-write failure must not break a run.
"""
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]          # ~/famtastic
WRITER = ROOT / "scripts" / "brain" / "session-checkpoint.js"


def checkpoint(phase: str, session_id: str | None = None, agent: str = "shay") -> None:
    """Fire a brain checkpoint. phase is 'start' or 'stop' (or any event label)."""
    try:
        if not WRITER.exists():
            return
        sid = session_id or os.environ.get("BRAIN_SESSION_ID") \
            or f"shay-{time.strftime('%Y%m%d%H%M%S')}"
        env = {**os.environ,
               "AI_AGENT": agent,
               "BRAIN_SESSION_ID": sid,
               "CLAUDE_PROJECT_DIR": str(ROOT)}
        subprocess.run(["node", str(WRITER), phase],
                       env=env, cwd=str(ROOT),
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                       timeout=8, check=False)
    except Exception:
        # Never let a brain write break a run.
        pass


if __name__ == "__main__":
    phase = sys.argv[1] if len(sys.argv) > 1 else "checkpoint"
    sid = sys.argv[2] if len(sys.argv) > 2 else None
    checkpoint(phase, sid)
