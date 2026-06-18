"""Shared paths, config access, and logging — all sandboxed under agent-factory/.

Every path in the whole system resolves through here, which guarantees the
SANDBOX.md invariant: code physically cannot write outside this folder because
ROOT is pinned to the agent-factory directory and never to its parents' parent.
"""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

# ROOT is agent-factory/ (this file lives in agent-factory/src/common.py).
ROOT = Path(__file__).resolve().parents[1]

DATA_DIR = ROOT / "data"
LOG_DIR = ROOT / "logs"
AGENTS_DIR = ROOT / "agents"
OUTPUTS_DIR = ROOT / "outputs"
DASHBOARD_DIR = ROOT / "dashboard"
TEMPLATES_DIR = ROOT / "templates"

DB_PATH = DATA_DIR / "factory.db"
CONFIG_PATH = ROOT / "config.json"
ENV_PATH = ROOT / ".env"

ORCHESTRATOR_LOG = LOG_DIR / "ORCHESTRATOR.log"
COSTS_LOG = LOG_DIR / "COSTS.log"

for _d in (DATA_DIR, LOG_DIR, AGENTS_DIR, OUTPUTS_DIR, DASHBOARD_DIR, TEMPLATES_DIR):
    _d.mkdir(parents=True, exist_ok=True)


def _assert_sandboxed(path: Path) -> Path:
    """Defense-in-depth: refuse any path that escapes the sandbox root."""
    resolved = Path(path).resolve()
    if ROOT not in resolved.parents and resolved != ROOT:
        raise PermissionError(f"SANDBOX VIOLATION: refused to touch {resolved} (outside {ROOT})")
    return resolved


def now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime())


def load_config() -> dict:
    with open(CONFIG_PATH) as f:
        return json.load(f)


def save_config(cfg: dict) -> None:
    _assert_sandboxed(CONFIG_PATH)
    tmp = CONFIG_PATH.with_suffix(".json.tmp")
    with open(tmp, "w") as f:
        json.dump(cfg, f, indent=2)
        f.write("\n")
    tmp.replace(CONFIG_PATH)


def load_env() -> dict:
    """Tiny .env reader (no dependency). Missing file → empty dict (offline mode)."""
    env: dict[str, str] = {}
    if ENV_PATH.exists():
        for line in ENV_PATH.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip()
    # process env overrides file
    for k in list(env) + ["OPENROUTER_API_KEY"]:
        if os.environ.get(k):
            env[k] = os.environ[k]
    return env


def log(logfile: Path, msg: str, *, component: str = "orchestrator") -> None:
    _assert_sandboxed(logfile)
    line = f"[{now_iso()}] [{component}] {msg}"
    with open(logfile, "a") as f:
        f.write(line + "\n")
    # also echo orchestrator decisions to stdout so a live run is visible
    if logfile == ORCHESTRATOR_LOG:
        print(line, flush=True)


def olog(msg: str, *, component: str = "orchestrator") -> None:
    log(ORCHESTRATOR_LOG, msg, component=component)
