"""core.py — shared plumbing for the agent factory.

Every path is derived from ROOT (this file's directory) so the running system
can never write outside ./agent-factory/ (SANDBOX.md rule 1).
"""
from __future__ import annotations

import json
import os
import sqlite3
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
LOGS_DIR = ROOT / "logs"
WORKERS_DIR = ROOT / "workers"
DASH_DIR = ROOT / "dashboard"

DB_PATH = DATA_DIR / "factory.db"
STATE_PATH = DATA_DIR / "state.json"
CONFIG_PATH = ROOT / "config.json"

ORCH_LOG = LOGS_DIR / "ORCHESTRATOR.log"
COSTS_LOG = ROOT / "COSTS.log"
LEARNINGS = ROOT / "LEARNINGS.md"


def ensure_dirs() -> None:
    for d in (DATA_DIR, LOGS_DIR, WORKERS_DIR, DASH_DIR):
        d.mkdir(parents=True, exist_ok=True)


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def now_ms() -> int:
    return int(time.time() * 1000)


# --- config -----------------------------------------------------------------

def load_config() -> dict:
    with open(CONFIG_PATH, "r", encoding="utf-8") as fh:
        return json.load(fh)


def save_config(cfg: dict) -> None:
    tmp = CONFIG_PATH.with_suffix(".json.tmp")
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(cfg, fh, indent=2)
        fh.write("\n")
    os.replace(tmp, CONFIG_PATH)


def clamp(value, lo, hi):
    return max(lo, min(hi, value))


# --- database ---------------------------------------------------------------

def db() -> sqlite3.Connection:
    """Open the factory DB in WAL mode so concurrent worker subprocesses can
    read/write without clobbering each other."""
    ensure_dirs()
    conn = sqlite3.connect(DB_PATH, timeout=30, isolation_level=None)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA busy_timeout=30000;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    return conn


# --- logging ----------------------------------------------------------------

def log_event(logfile: Path, actor: str, message: str, **fields) -> None:
    """Append a single structured line. Decisions are auditable after the fact."""
    ensure_dirs()
    extra = ""
    if fields:
        extra = " " + " ".join(f"{k}={_fmt(v)}" for k, v in fields.items())
    line = f"[{now_iso()}] [{actor}] {message}{extra}\n"
    with open(logfile, "a", encoding="utf-8") as fh:
        fh.write(line)


def _fmt(v) -> str:
    if isinstance(v, float):
        return f"{v:.6f}".rstrip("0").rstrip(".")
    s = str(v)
    return f'"{s}"' if " " in s else s


def orch_log(message: str, **fields) -> None:
    log_event(ORCH_LOG, "orchestrator", message, **fields)


def append_cost(record: dict) -> None:
    """COSTS.log is JSONL — one cost event per line, machine-parseable."""
    ensure_dirs()
    record = {"ts": now_iso(), **record}
    with open(COSTS_LOG, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(record) + "\n")


# --- runtime state (for the dashboard) --------------------------------------

def write_state(state: dict) -> None:
    ensure_dirs()
    tmp = STATE_PATH.with_suffix(".json.tmp")
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(state, fh, indent=2)
    os.replace(tmp, STATE_PATH)


def read_state() -> dict:
    if not STATE_PATH.exists():
        return {}
    try:
        with open(STATE_PATH, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except (json.JSONDecodeError, OSError):
        return {}
