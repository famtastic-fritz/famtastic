#!/usr/bin/env python3
"""
Swarm Agent Launcher — Reliable Shay instance spawning
Avoids shell quoting bugs that create zombie processes

Usage:
    python3 ~/famtastic/shay-agent-os/launch-agent.py <agent-name> <prompt-file>

Example:
    python3 ~/famtastic/shay-agent-os/launch-agent.py ctrl-l-fix \
        ~/famtastic/prompts/ctrl-l-fix.md
"""

import sys
import os
import subprocess
import time
import json
import signal
from pathlib import Path

try:
    from brain_checkpoint import checkpoint as brain_checkpoint
except Exception:  # never let a missing brain bridge break a launch
    def brain_checkpoint(*_a, **_k):
        return None

LOG_DIR = Path.home() / "famtastic/shay-agent-os/logs"
HEARTBEAT_DIR = LOG_DIR / "heartbeat"
PID_DIR = LOG_DIR / "pids"

for d in [LOG_DIR, HEARTBEAT_DIR, PID_DIR]:
    d.mkdir(parents=True, exist_ok=True)


def write_heartbeat(agent_name: str, step: str, status: str = "ALIVE", message: str = ""):
    hb = {
        "agent": agent_name,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "step": step,
        "status": status,
        "message": message,
    }
    path = HEARTBEAT_DIR / f"{agent_name}.json"
    with open(path, "w") as f:
        json.dump(hb, f, indent=2)


def log_line(agent_name: str, line: str):
    path = LOG_DIR / f"agent-{agent_name}-live.log"
    ts = time.strftime("[%Y-%m-%dT%H:%M:%SZ]")
    with open(path, "a") as f:
        f.write(f"{ts} {line}\n")


def launch(agent_name: str, prompt_file: str):
    prompt_path = Path(prompt_file).expanduser()
    if not prompt_path.exists():
        print(f"ERROR: Prompt file not found: {prompt_path}", file=sys.stderr)
        sys.exit(1)

    prompt_text = prompt_path.read_text()
    if not prompt_text.strip():
        print(f"ERROR: Prompt file is empty: {prompt_path}", file=sys.stderr)
        sys.exit(1)

    log_path = LOG_DIR / f"agent-{agent_name}.log"
    pid_path = PID_DIR / f"{agent_name}.pid"

    # Check if already running
    if pid_path.exists():
        old_pid = pid_path.read_text().strip()
        try:
            os.kill(int(old_pid), 0)
            print(f"WARNING: Agent '{agent_name}' already running (PID {old_pid})", file=sys.stderr)
            print(f"  Kill it first: kill {old_pid}", file=sys.stderr)
            sys.exit(1)
        except (OSError, ValueError):
            pass  # Process dead, stale PID file

    write_heartbeat(agent_name, "starting", "ALIVE", f"Launching with prompt: {prompt_path}")
    log_line(agent_name, "LAUNCH — Starting Shay instance")

    # Brain Sync Contract: leave a session trace tied to this run's id.
    brain_checkpoint("start", session_id=f"shay-{agent_name}", agent="shay")

    # Spawn Shay with prompt via stdin to avoid shell quoting issues
    # Using -z flag which reads prompt from argument (safer than -q with shell expansion)
    cmd = [
        "shay",
        "--provider", "ollama", "-m", "hermes3:latest",
        "chat",
        "-z", prompt_text,
        "--yolo",
    ]

    with open(log_path, "a") as log_fh:
        log_fh.write(f"\n{'='*60}\n")
        log_fh.write(f"AGENT: {agent_name}\n")
        log_fh.write(f"STARTED: {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}\n")
        log_fh.write(f"PROMPT: {prompt_path}\n")
        log_fh.write(f"{'='*60}\n\n")
        log_fh.flush()

        proc = subprocess.Popen(
            cmd,
            stdout=log_fh,
            stderr=subprocess.STDOUT,
            text=True,
        )

    pid_path.write_text(str(proc.pid))
    write_heartbeat(agent_name, "running", "ALIVE", f"PID {proc.pid}")
    log_line(agent_name, f"RUNNING — PID {proc.pid}")

    print(f"✅ Agent '{agent_name}' launched (PID {proc.pid})")
    print(f"   Log:    {log_path}")
    print(f"   Heartbeat: {HEARTBEAT_DIR / agent_name}.json")
    print(f"   Monitor: watch -n 5 ~/famtastic/shay-agent-os/monitor.sh")

    return proc.pid


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 launch-agent.py <agent-name> <prompt-file>")
        print("")
        print("Examples:")
        print("  python3 launch-agent.py swarm-verify ~/famtastic/prompts/swarm-verify.md")
        print("  python3 launch-agent.py ctrl-l-fix ~/famtastic/prompts/ctrl-l-fix.md")
        sys.exit(1)

    agent_name = sys.argv[1]
    prompt_file = sys.argv[2]
    launch(agent_name, prompt_file)
