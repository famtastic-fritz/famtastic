"""Model catalog (OpenRouter-style ids) with cost tiers.

Prices are USD per 1,000,000 tokens, in the same ballpark as real OpenRouter
listings as of early 2026. They are used to estimate cost; no money moves.
The factory routes to the CHEAPEST model that is capable of a given task tier.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Model:
    id: str            # OpenRouter-style model id
    tier: str          # triage | standard | premium
    input_per_m: float  # USD / 1M input tokens
    output_per_m: float  # USD / 1M output tokens
    quality: float     # 0..1 rough capability score


# Cheapest-capable first within each tier.
CATALOG: list[Model] = [
    # triage: fast + nearly free, used to classify/route and do simple tasks
    Model("meta-llama/llama-3.1-8b-instruct", "triage", 0.02, 0.05, 0.45),
    Model("google/gemini-2.0-flash-lite", "triage", 0.04, 0.15, 0.55),
    # standard: the workhorse for most real deliverables
    Model("anthropic/claude-haiku-4.5", "standard", 0.80, 4.00, 0.78),
    Model("openai/gpt-4.1-mini", "standard", 0.40, 1.60, 0.72),
    # premium: only when complexity/confidence demands it
    Model("anthropic/claude-sonnet-4.6", "premium", 3.00, 15.00, 0.92),
    Model("anthropic/claude-opus-4.8", "premium", 5.00, 25.00, 0.97),
]

TIER_ORDER = {"triage": 0, "standard": 1, "premium": 2}


def cheapest_in_tier(tier: str) -> Model:
    candidates = [m for m in CATALOG if m.tier == tier]
    # cheapest by blended cost (assume 1:3 input:output ratio)
    return min(candidates, key=lambda m: m.input_per_m + 3 * m.output_per_m)


def by_id(model_id: str) -> Model:
    for m in CATALOG:
        if m.id == model_id:
            return m
    raise KeyError(model_id)


def estimate_cost(model: Model, input_tokens: int, output_tokens: int) -> float:
    return round(
        model.input_per_m * input_tokens / 1_000_000
        + model.output_per_m * output_tokens / 1_000_000,
        6,
    )
