"""Model routing + cost control.

Picks the CHEAPEST model whose capability clears the bar that the task's
complexity demands, then records every call in COSTS.log as a running ledger.
This is the throughput-per-dollar optimizer: triage/simple work rides the cheap
model; only genuinely hard tasks escalate to the strong model.
"""
from __future__ import annotations

from common import COSTS_LOG, load_config, log, now_iso


def choose_model(complexity: float, *, threshold: float | None = None) -> dict:
    """Return the cheapest model in the catalog that is capable enough.

    capability_needed scales with complexity. We sort the catalog by total
    price and return the first model whose capability >= capability_needed.
    Below `threshold`, we force the cheap tier (pure triage).
    """
    cfg = load_config()
    catalog = cfg["models"]["catalog"]
    if threshold is None:
        threshold = cfg["tunables"]["routing_complexity_threshold"]

    # capability we require: a simple monotonic map of complexity.
    capability_needed = round(0.45 + 0.5 * complexity, 3)

    def total_price(m):
        return m["price_in_per_1k"] + m["price_out_per_1k"]

    ordered = sorted(catalog, key=total_price)

    if complexity < threshold:
        # triage lane: cheapest model, period.
        return ordered[0]

    for m in ordered:
        if m["capability"] >= capability_needed:
            return m
    return ordered[-1]  # nothing clears the bar → strongest available


def price_call(model: dict, prompt_tokens: int, completion_tokens: int) -> float:
    return round(
        prompt_tokens / 1000 * model["price_in_per_1k"]
        + completion_tokens / 1000 * model["price_out_per_1k"],
        6,
    )


_ledger_total = {"usd": 0.0}


def record_cost(*, task_id, task_type, model_id, prompt_tokens, completion_tokens,
                cost_usd, stubbed) -> float:
    """Append to COSTS.log and return the running total."""
    _ledger_total["usd"] = round(_ledger_total["usd"] + cost_usd, 6)
    log(
        COSTS_LOG,
        f"task={task_id} type={task_type} model={model_id} "
        f"tok_in={prompt_tokens} tok_out={completion_tokens} "
        f"cost=${cost_usd:.6f} worker_subtotal=${_ledger_total['usd']:.6f} "
        f"mode={'STUB' if stubbed else 'LIVE'}  "
        f"# authoritative grand total = SUM(tasks.cost_usd) in DB / dashboard",
        component="router",
    )
    return _ledger_total["usd"]


def running_total() -> float:
    return _ledger_total["usd"]
