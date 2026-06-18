"""Single source of truth for every path inside the sandbox.

The whole isolation guarantee of this system rests on one idea: every path is
resolved relative to ROOT (this file's directory), and `assert_inside` is called
before any write. Nothing can be written outside the sandbox without raising.
"""
from __future__ import annotations

import os
from pathlib import Path

# ROOT is the agent-factory/ directory, resolved from this file. No matter where
# the process is launched from, every path hangs off this anchor.
ROOT = Path(__file__).resolve().parent

DATA_DIR = ROOT / "data"
LOGS_DIR = ROOT / "logs"
AGENTS_DIR = ROOT / "agents"
DELIVERABLES_DIR = ROOT / "deliverables"
DASHBOARD_DIR = ROOT / "dashboard"

DB_PATH = DATA_DIR / "factory.db"
ORCHESTRATOR_LOG = LOGS_DIR / "ORCHESTRATOR.log"
COSTS_LOG = LOGS_DIR / "COSTS.log"
CONFIG_PATH = ROOT / "config.json"
LEARNINGS_PATH = ROOT / "LEARNINGS.md"
DASHBOARD_HTML = DASHBOARD_DIR / "index.html"
WORKER_TEMPLATE = ROOT / "worker_template.py"
ENV_PATH = ROOT / ".env"

for _d in (DATA_DIR, LOGS_DIR, AGENTS_DIR, DELIVERABLES_DIR, DASHBOARD_DIR):
    _d.mkdir(parents=True, exist_ok=True)


def assert_inside(path: os.PathLike | str) -> Path:
    """Raise if `path` resolves outside the sandbox. Call before every write."""
    p = Path(path).resolve()
    try:
        p.relative_to(ROOT)
    except ValueError as exc:  # pragma: no cover - guardrail
        raise PermissionError(
            f"SANDBOX VIOLATION: refusing to touch {p} (outside {ROOT})"
        ) from exc
    return p


def load_env() -> dict[str, str]:
    """Minimal .env reader (no third-party deps). Missing file -> empty env."""
    env: dict[str, str] = {}
    if ENV_PATH.exists():
        for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            env[key.strip()] = val.strip()
    # Process env overrides file, so callers can export vars too.
    for key in list(env) + [
        "OPENROUTER_API_KEY",
        "FACTORY_LIVE_CALLS",
        "PAYPAL_BUSINESS_EMAIL",
        "GODADDY_DOMAIN",
    ]:
        if os.environ.get(key):
            env[key] = os.environ[key]
    return env


def rel(path: os.PathLike | str) -> str:
    """Pretty path relative to ROOT for logging."""
    try:
        return str(Path(path).resolve().relative_to(ROOT))
    except ValueError:
        return str(path)
