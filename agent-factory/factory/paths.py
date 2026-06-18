"""Sandbox path guard.

FACTORY_ROOT is the one and only directory this system is allowed to touch.
Every write path in the system flows through `safe_path()`, which refuses to
resolve anything above the root. This is the code-level enforcement of the
SANDBOX.md contract.
"""
from __future__ import annotations

import os
import time
from datetime import datetime, timezone
from pathlib import Path

# agent-factory/factory/paths.py -> agent-factory/
FACTORY_ROOT = Path(__file__).resolve().parent.parent

DATA_DIR = FACTORY_ROOT / "data"
LOGS_DIR = FACTORY_ROOT / "logs"
PUBLIC_DIR = FACTORY_ROOT / "public"
BUSINESS_DIR = FACTORY_ROOT / "business"

DB_PATH = DATA_DIR / "factory.db"
CONFIG_PATH = FACTORY_ROOT / "config.json"
ENV_PATH = FACTORY_ROOT / ".env"

ORCHESTRATOR_LOG = LOGS_DIR / "ORCHESTRATOR.log"
COSTS_LOG = LOGS_DIR / "COSTS.log"
LEARNINGS_MD = FACTORY_ROOT / "LEARNINGS.md"
DASHBOARD_HTML = PUBLIC_DIR / "dashboard.html"


def ensure_dirs() -> None:
    for d in (DATA_DIR, LOGS_DIR, PUBLIC_DIR, BUSINESS_DIR):
        d.mkdir(parents=True, exist_ok=True)


def safe_path(*parts: str) -> Path:
    """Resolve a path and guarantee it stays inside FACTORY_ROOT."""
    p = (FACTORY_ROOT.joinpath(*parts)).resolve()
    if FACTORY_ROOT not in p.parents and p != FACTORY_ROOT:
        raise PermissionError(
            f"Sandbox violation: {p} is outside FACTORY_ROOT ({FACTORY_ROOT})"
        )
    return p


def load_config() -> dict:
    import json
    return json.loads(CONFIG_PATH.read_text())


def log_line(path: Path, msg: str, *, also_print: bool = False) -> None:
    """Append a timestamped line to a sandbox log file."""
    ensure_dirs()
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")
    line = f"[{ts}Z] {msg}"
    with path.open("a") as f:
        f.write(line + "\n")
    if also_print:
        print(line, flush=True)


def load_env() -> dict:
    """Minimal .env loader (no python-dotenv dependency). Missing file is fine."""
    env = {}
    if ENV_PATH.exists():
        for line in ENV_PATH.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip()
    # Real process env wins over file (so the operator can override at the shell).
    for k in list(env):
        if os.environ.get(k):
            env[k] = os.environ[k]
    return env
