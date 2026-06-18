"""Cost-aware model router.

Given a task, score its complexity and pick the cheapest capable tier. Cheap
"triage"/classify work stays on the nano model; analysis/synthesis escalates.
After a call, if confidence is below threshold the router escalates one tier and
retries (bounded to a single escalation) — demonstrating "use the stronger model
only when needed." Every call is appended to logs/COSTS.log as a JSON line.
"""
import json
import os
import time

from . import llm

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COSTS_LOG = os.path.join(ROOT, "logs", "COSTS.log")

# Per-type base complexity. Higher -> needs a stronger model.
TYPE_COMPLEXITY = {
    "triage": 0.10,
    "classify": 0.15,
    "extract": 0.35,
    "summarize": 0.40,
    "compare": 0.65,
    "analyze": 0.70,
    "synthesize": 0.78,
    "plan": 0.88,
}

SYSTEM_PROMPTS = {
    "triage": "You are a fast triage agent. Categorize the item in one short line.",
    "classify": "You are a classifier. Assign the most fitting category and why.",
    "extract": "You extract structured fields. Return concise key facts.",
    "summarize": "You write a tight, accurate 2-3 sentence summary.",
    "compare": "You compare options on the axes that matter and pick a winner.",
    "analyze": "You analyze trade-offs rigorously and surface risks.",
    "synthesize": "You synthesize multiple inputs into one coherent recommendation.",
    "plan": "You produce a concrete, ordered implementation plan.",
}


def score_complexity(task):
    """Return 0..1. Combines task type with payload size signal."""
    base = TYPE_COMPLEXITY.get(task["type"], 0.5)
    payload = task.get("payload") or {}
    text = json.dumps(payload)
    size_signal = min(0.15, len(text) / 8000.0)  # long inputs bump complexity
    n_items = len(payload.get("items", [])) if isinstance(payload, dict) else 0
    fanout_signal = min(0.15, n_items * 0.02)
    return round(min(1.0, base + size_signal + fanout_signal), 3)


def pick_tier(complexity, routing):
    if complexity >= routing.get("complexity_threshold_frontier", 0.85) \
            and routing.get("allow_frontier", True):
        return "frontier"
    if complexity >= routing.get("complexity_threshold_strong", 0.60):
        return "strong"
    if complexity >= routing.get("complexity_threshold_standard", 0.30):
        return "standard"
    return "triage"


def _next_tier(tier):
    i = llm.TIER_ORDER.index(tier)
    return llm.TIER_ORDER[min(i + 1, len(llm.TIER_ORDER) - 1)]


def _build_prompt(task):
    payload = task.get("payload") or {}
    return (
        f"Task: {task['title']}\n"
        f"Type: {task['type']}\n"
        f"Input:\n{json.dumps(payload, indent=2)}\n"
    )


def _confidence(result_text, tier):
    """Cheap deterministic confidence proxy: longer, higher-tier answers read as
    more confident. In LIVE mode you'd replace this with a self-rated score."""
    base = {"triage": 0.68, "standard": 0.78, "strong": 0.88, "frontier": 0.94}[tier]
    length_bonus = min(0.1, len(result_text) / 4000.0)
    return round(min(0.99, base + length_bonus), 3)


def route_and_run(task, config, worker_id):
    """Route a task, run it (with at most one escalation), log cost, return a
    record dict ready for queue_db.complete()."""
    routing = config["routing"]
    complexity = score_complexity(task)
    tier = pick_tier(complexity, routing)
    system = SYSTEM_PROMPTS.get(task["type"], "You are a helpful agent.")
    prompt = _build_prompt(task)

    attempts = []
    escalated = False
    resp = llm.call(tier, system, prompt)
    conf = _confidence(resp["text"], tier)
    attempts.append((tier, conf))

    # Escalate once if confidence is too low and we're not already at the top.
    threshold = routing.get("escalate_below_confidence", 0.62)
    if conf < threshold and tier != llm.TIER_ORDER[-1]:
        if tier == "frontier" or (tier == "strong" and not routing.get("allow_frontier", True)):
            pass
        else:
            tier = _next_tier(tier)
            escalated = True
            resp = llm.call(tier, system, prompt)
            conf = _confidence(resp["text"], tier)
            attempts.append((tier, conf))

    cost = llm.estimate_cost(resp["tier"], resp["tokens_in"], resp["tokens_out"])

    record = {
        "tier": resp["tier"],
        "model": resp["model"],
        "confidence": conf,
        "complexity": complexity,
        "escalated": escalated,
        "tokens_in": resp["tokens_in"],
        "tokens_out": resp["tokens_out"],
        "cost_usd": round(cost, 8),
        "latency_ms": resp["latency_ms"],
        "live": resp["live"],
        "result": {
            "text": resp["text"],
            "attempts": [{"tier": t, "confidence": c} for t, c in attempts],
        },
    }
    _log_cost(task, record, worker_id)
    return record


def _log_cost(task, record, worker_id):
    os.makedirs(os.path.dirname(COSTS_LOG), exist_ok=True)
    line = {
        "ts": round(time.time(), 3),
        "task_id": task["id"],
        "type": task["type"],
        "worker_id": worker_id,
        "tier": record["tier"],
        "model": record["model"],
        "complexity": record["complexity"],
        "escalated": record["escalated"],
        "tokens_in": record["tokens_in"],
        "tokens_out": record["tokens_out"],
        "cost_usd": record["cost_usd"],
        "latency_ms": record["latency_ms"],
        "live": record["live"],
    }
    with open(COSTS_LOG, "a") as f:
        f.write(json.dumps(line) + "\n")
