"""router.py — cost-aware model routing.

Policy (cheapest capable model wins):
  1. Estimate task complexity from cheap, deterministic signals.
  2. ALWAYS triage with the cheap model first (real triage spend is tiny).
  3. If the triaged complexity clears config.routing.complexity_threshold,
     escalate to the strong model. Otherwise the mid model finishes the job.

This optimizes throughput-per-dollar: most tasks never touch the expensive tier.
"""
from __future__ import annotations

import models

# Per-kind base difficulty (0..1). Tunable knowledge, not magic.
KIND_DIFFICULTY = {
    "triage": 0.15,
    "classify": 0.20,
    "summarize": 0.40,
    "research": 0.75,
    "codegen": 0.80,
}

HARD_SIGNALS = ("refactor", "design", "investigate", "root cause", "compare",
                "architecture", "policy", "async")


def estimate_complexity(kind: str, prompt: str) -> float:
    score = KIND_DIFFICULTY.get(kind, 0.5)
    p = prompt.lower()
    score += 0.05 * sum(1 for s in HARD_SIGNALS if s in p)
    score += min(0.15, len(prompt) / 1500.0)  # longer prompts skew harder
    return round(min(1.0, score), 3)


def route(task: dict, cfg: dict) -> dict:
    """Run the routing policy for one task.

    Returns a dict with the final result plus the routing trail:
      {complexity, triage, escalated, model, text, tokens_in, tokens_out,
       cost_usd, latency_ms, hops:[...]}
    """
    routing = cfg["routing"]
    threshold = routing["complexity_threshold"]
    kind = task["kind"]
    prompt = task["prompt"]

    complexity = estimate_complexity(kind, prompt)
    hops = []
    total_cost = 0.0
    total_in = total_out = 0
    total_latency = 0

    # 1) cheap triage pass — confirms/sharpens the complexity estimate.
    triage = models.call(routing["triage_model"], f"TRIAGE[{kind}]: {prompt}",
                         task_kind="triage")
    hops.append({"stage": "triage", **_slim(triage)})
    total_cost += triage["cost_usd"]
    total_in += triage["tokens_in"]
    total_out += triage["tokens_out"]
    total_latency += triage["latency_ms"]

    # 2) decide the worker tier.
    escalate = complexity >= threshold
    worker_model = routing["escalation_model"] if escalate else routing["default_model"]

    work = models.call(worker_model, prompt, task_kind=kind)
    hops.append({"stage": "work", **_slim(work)})
    total_cost += work["cost_usd"]
    total_in += work["tokens_in"]
    total_out += work["tokens_out"]
    total_latency += work["latency_ms"]

    return {
        "complexity": complexity,
        "escalated": escalate,
        "model": worker_model,
        "text": work["text"],
        "tokens_in": total_in,
        "tokens_out": total_out,
        "cost_usd": round(total_cost, 8),
        "latency_ms": total_latency,
        "stubbed": work["stubbed"],
        "hops": hops,
    }


def _slim(call_result: dict) -> dict:
    return {
        "model": call_result["model"],
        "cost_usd": call_result["cost_usd"],
        "tokens_in": call_result["tokens_in"],
        "tokens_out": call_result["tokens_out"],
    }
