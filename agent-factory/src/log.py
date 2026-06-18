"""Tiny dependency-free logging helpers.

Every orchestrator decision goes to logs/ORCHESTRATOR.log; every cost event goes
to logs/COSTS.log. Lines are timestamped and also echoed to stdout so a live tail
or the terminal dashboard can show them.
"""
import os
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOG_DIR = os.path.join(ROOT, "logs")
ORCH_LOG = os.path.join(LOG_DIR, "ORCHESTRATOR.log")
COST_LOG = os.path.join(LOG_DIR, "COSTS.log")


def _now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")


def _write(path, line, echo=True):
    os.makedirs(LOG_DIR, exist_ok=True)
    stamped = f"{_now()} {line}"
    with open(path, "a", encoding="utf-8") as fh:
        fh.write(stamped + "\n")
    if echo:
        print(stamped, flush=True)


def orch(event, **fields):
    """Log a structured orchestrator decision/event."""
    extra = " ".join(f"{k}={v}" for k, v in fields.items())
    _write(ORCH_LOG, f"[{event}] {extra}".rstrip())


def cost(model, task_id, tokens_in, tokens_out, usd, mode):
    """Append a cost event to the ledger log."""
    _write(
        COST_LOG,
        f"model={model} task={task_id} tok_in={tokens_in} tok_out={tokens_out} "
        f"usd={usd:.6f} mode={mode}",
        echo=False,
    )
