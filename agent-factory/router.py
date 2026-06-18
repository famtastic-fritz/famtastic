"""Model routing + cost control.

Strategy (throughput-per-dollar):
  1. Always triage with the cheapest model first to estimate task complexity.
  2. Pick the cheapest tier whose quality clears the task's complexity bar.
  3. Escalate one tier only if the triage confidence is below the floor.
  4. Record every call to the cost ledger (logs/COSTS.log).

The actual model call is an OpenRouter-style interface that STUBS itself when no
key / live-calls flag is present, so the whole system runs offline. The stub
returns content produced by the deliverable generators, and cost is estimated
from token counts — identical accounting to a live run.
"""
from __future__ import annotations

import datetime as _dt
import json
import threading

import models
from config_io import load_config
from factory_paths import COSTS_LOG, assert_inside, load_env

_LOCK = threading.Lock()


def _now() -> str:
    return _dt.datetime.now().isoformat(timespec="seconds")


def approx_tokens(text: str) -> int:
    """Cheap token estimate: ~4 chars/token. Good enough for budgeting."""
    return max(1, len(text) // 4)


def route(task: dict) -> dict:
    """Return a routing decision for a task: which tier/model and why.

    `task["complexity"]` is 0..1 (set by the seeder or by triage). Higher =>
    needs a stronger (more expensive) model.
    """
    cfg = load_config()
    threshold = cfg["routing"]["complexity_threshold"]
    floor = cfg["routing"]["confidence_floor"]

    complexity = float(task.get("complexity", 0.5))

    # Step 1: pick the base tier from complexity.
    if complexity < threshold * 0.6:
        tier = "triage"
    elif complexity < threshold + 0.2:
        tier = "standard"
    else:
        tier = "premium"

    # Step 2: triage-confidence escalation. Lower confidence on ambiguous tasks.
    confidence = round(1.0 - abs(complexity - 0.5), 3)
    escalated = False
    if cfg["routing"]["escalate_on_low_confidence"] and confidence < floor:
        order = ["triage", "standard", "premium"]
        idx = min(order.index(tier) + 1, len(order) - 1)
        if order[idx] != tier:
            escalated = True
        tier = order[idx]

    model = models.cheapest_in_tier(tier)
    return {
        "tier": tier,
        "model": model.id,
        "complexity": complexity,
        "confidence": confidence,
        "escalated": escalated,
        "reason": (
            f"complexity={complexity:.2f} -> {tier} tier; "
            f"confidence={confidence:.2f}"
            + (" (escalated)" if escalated else "")
        ),
    }


def call_model(model_id: str, prompt: str, produced_output: str) -> dict:
    """OpenRouter-style call. STUBBED unless a key + live flag are set.

    `produced_output` is what the deliverable generator made; in live mode this
    is what we'd send-and-receive from the API. Either way we account for cost
    identically so the ledger is honest.
    """
    env = load_env()
    cfg = load_config()
    live = (
        cfg.get("live_calls")
        and env.get("FACTORY_LIVE_CALLS", "false").lower() == "true"
        and bool(env.get("OPENROUTER_API_KEY"))
    )

    model = models.by_id(model_id)
    in_tok = approx_tokens(prompt)
    out_tok = approx_tokens(produced_output)
    cost = models.estimate_cost(model, in_tok, out_tok)

    mode = "LIVE" if live else "STUB"
    # NOTE: even when `live` is True we do NOT make a network call here on
    # purpose — wiring the real httpx/urllib POST is a one-liner documented in
    # SETUP.md, deliberately left out so this sandbox can never spend by accident.
    if live:
        mode = "LIVE-GUARDED"

    return {
        "mode": mode,
        "model": model_id,
        "input_tokens": in_tok,
        "output_tokens": out_tok,
        "cost_usd": cost,
    }


def record_cost(task_id: int, task_type: str, call_result: dict) -> float:
    """Append one line to the cost ledger and return cumulative spend."""
    assert_inside(COSTS_LOG)
    with _LOCK:
        cumulative = read_total_cost() + call_result["cost_usd"]
        entry = {
            "ts": _now(),
            "task_id": task_id,
            "task_type": task_type,
            "model": call_result["model"],
            "mode": call_result["mode"],
            "input_tokens": call_result["input_tokens"],
            "output_tokens": call_result["output_tokens"],
            "cost_usd": call_result["cost_usd"],
            "cumulative_usd": round(cumulative, 6),
        }
        with COSTS_LOG.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(entry) + "\n")
    return round(cumulative, 6)


def read_total_cost() -> float:
    if not COSTS_LOG.exists():
        return 0.0
    total = 0.0
    for line in COSTS_LOG.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            total += json.loads(line)["cost_usd"]
        except (json.JSONDecodeError, KeyError):
            continue
    return round(total, 6)
