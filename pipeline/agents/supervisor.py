#!/usr/bin/env python3
"""Supervisor — Phase 4 autonomous orchestration.

Starts every pipeline agent, then watches their heartbeats. Any agent whose
process dies OR whose heartbeat goes stale (the wedged-but-alive failure that
sank the original scout) is killed and restarted. The supervisor heartbeats
itself, so the Command Center can confirm the orchestrator is alive too.

Run this ONE process (via launchd) instead of the old start-pipeline.sh, which
fire-and-forgot four agents with no restart and no stall detection.
"""
import json
import os
import signal
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path.home() / "famtastic" / "pipeline" / "lib"))
import config  # noqa: E402
from heartbeat import beat  # noqa: E402

AGENT_DIR = config.PIPELINE / "agents"

# name -> (script, max_stale_seconds before considered hung)
MANAGED = {
    "scout": ("scout.py", 420),
    "outreach": ("outreach.py", 300),
    "responder": ("responder.py", 240),
    "followup": ("followup.py", 600),
}

CHECK_EVERY = 20
procs = {}  # name -> Popen


def heartbeat_age(name):
    hb = config.HEARTBEATS / f"{name}.json"
    try:
        with open(hb) as f:
            ts = json.load(f).get("ts", 0)
        return time.time() - ts
    except Exception:
        return None


def start(name):
    script, _ = MANAGED[name]
    p = subprocess.Popen(
        [sys.executable, str(AGENT_DIR / script)],
        stdout=open(config.PIPELINE / "logs" / f"{name}.log", "a"),
        stderr=subprocess.STDOUT,
    )
    procs[name] = p
    beat("supervisor", "managing", f"started {name} pid {p.pid}")


def stop(name):
    p = procs.get(name)
    if not p:
        return
    try:
        p.terminate()
        p.wait(timeout=8)
    except Exception:
        try:
            p.kill()
        except Exception:
            pass
    procs.pop(name, None)


def supervise():
    (config.PIPELINE / "logs").mkdir(parents=True, exist_ok=True)
    for name in MANAGED:
        start(name)
        time.sleep(1)

    def shutdown(*_):
        beat("supervisor", "stopping", "received signal, terminating agents")
        for name in list(procs):
            stop(name)
        sys.exit(0)

    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)

    while True:
        for name, (_, max_stale) in MANAGED.items():
            p = procs.get(name)
            dead = (p is None) or (p.poll() is not None)
            age = heartbeat_age(name)
            hung = (age is not None) and (age > max_stale)
            if dead:
                beat("supervisor", "restart", f"{name} died — restarting")
                stop(name)
                start(name)
            elif hung:
                beat("supervisor", "restart", f"{name} hung ({int(age)}s stale) — restarting")
                stop(name)
                start(name)
        beat("supervisor", "watching", f"{len(procs)} agents alive")
        time.sleep(CHECK_EVERY)


if __name__ == "__main__":
    supervise()
