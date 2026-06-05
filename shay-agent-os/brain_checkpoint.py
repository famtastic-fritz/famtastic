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
from __future__ import annotations  # PEP 604 (str | None) syntax on Python 3.9

import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]          # ~/famtastic
WRITER = ROOT / "scripts" / "brain" / "session-checkpoint.js"


def checkpoint(phase: str, session_id: str | None = None, agent: str = "shay",
               note: str | None = None) -> None:
    """Fire a brain checkpoint.

    phase  : 'start' | 'stop' | 'progress' | any event label.
    note   : optional one-line "what I'm doing right now"; lands in the session
             note's Timeline so mid-session work isn't lost between start/stop.

    Session id resolves to the REAL agent session when available — explicit arg,
    then CLAUDE_CODE_SESSION_ID (Claude Code), then BRAIN_SESSION_ID (any other
    surface) — and only falls back to a generated shay-<timestamp> as a last
    resort. This keeps every trace tied to one session id, not fragmented.
    """
    try:
        if not WRITER.exists():
            return
        sid = (session_id
               or os.environ.get("CLAUDE_CODE_SESSION_ID")
               or os.environ.get("BRAIN_SESSION_ID")
               or f"shay-{time.strftime('%Y%m%d%H%M%S')}")
        env = {**os.environ,
               "AI_AGENT": agent,
               "BRAIN_SESSION_ID": sid,
               "CLAUDE_PROJECT_DIR": str(ROOT)}
        if note:
            env["BRAIN_NOTE"] = str(note)
        subprocess.run(["node", str(WRITER), phase],
                       env=env, cwd=str(ROOT),
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                       timeout=8, check=False)
    except Exception:
        # Never let a brain write break a run.
        pass


if __name__ == "__main__":
    # CLI: brain_checkpoint.py <phase> [session_id] [--note "text"]
    argv = sys.argv[1:]
    note_val = None
    if "--note" in argv:
        i = argv.index("--note")
        note_val = argv[i + 1] if i + 1 < len(argv) else None
        argv = argv[:i] + argv[i + 2:]
    phase = argv[0] if len(argv) > 0 else "checkpoint"
    sid = argv[1] if len(argv) > 1 else None
    checkpoint(phase, sid, note=note_val)
