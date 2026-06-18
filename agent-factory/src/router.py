"""Model routing + cost control (OpenRouter-style).

Picks the cheapest *capable* model for a task based on a complexity score and the
tunable routing thresholds in config.json. Cheap model for triage, mid for
standard work, strong model only when complexity demands it.

Calls are STUBBED by default (FACTORY_LIVE != "1" or no key): a deterministic
mock completion is returned with realistic token counts and the cost is computed
from the price table. This lets the whole system run end-to-end offline with a
real cost ledger and zero spend. If live mode is enabled AND a key is present,
the same interface would call OpenRouter — guarded by a hard per-run USD cap.
"""
import hashlib
import os

# Price table (USD per 1K tokens) modeled on OpenRouter listings. Tiers, cheapest
# capable first. These are used for the cost ledger whether stubbed or live.
TIERS = [
    {"name": "triage",   "model": "openrouter/cheap-haiku",  "in": 0.00025, "out": 0.00125, "cap": 0.34},
    {"name": "standard", "model": "openrouter/mid-sonnet",   "in": 0.00300, "out": 0.01500, "cap": 0.67},
    {"name": "hard",     "model": "openrouter/strong-opus",  "in": 0.01500, "out": 0.07500, "cap": 1.01},
]


def _tier_for(complexity, routing):
    """Map a 0..1 complexity score to a tier using tunable thresholds."""
    if complexity <= routing.get("triage_threshold", 0.34):
        return TIERS[0]
    if complexity <= routing.get("escalate_threshold", 0.67):
        return TIERS[1]
    return TIERS[2]


def choose(complexity, routing):
    return _tier_for(complexity, routing)


def _estimate_tokens(prompt, complexity):
    # Deterministic, model-free token estimate (~4 chars/token) plus a
    # complexity-scaled output budget.
    tin = max(64, len(prompt) // 4)
    tout = int(180 + complexity * 1400)
    return tin, tout


def _cost(tier, tin, tout):
    return (tin / 1000.0) * tier["in"] + (tout / 1000.0) * tier["out"]


def live_enabled():
    return os.environ.get("FACTORY_LIVE") == "1" and bool(os.environ.get("OPENROUTER_API_KEY"))


def complete(prompt, complexity, routing, run_spend_usd=0.0):
    """Return (model, text, tokens_in, tokens_out, usd, mode).

    mode is 'stub' (offline mock) or 'live' (would call OpenRouter). The hard
    spend cap protects against runaway cost even in live mode.
    """
    tier = choose(complexity, routing)
    tin, tout = _estimate_tokens(prompt, complexity)
    usd = _cost(tier, tin, tout)

    if live_enabled():
        cap = float(os.environ.get("FACTORY_MAX_RUN_USD", "1.0"))
        if run_spend_usd + usd > cap:
            # Refuse live spend over the cap; fall back to stub so work still completes.
            return _stub(tier, prompt, tin, tout, usd, reason="spend_cap")
        # NOTE: real OpenRouter call would go here. Intentionally not implemented
        # so the sandbox cannot make a live request. See SETUP.md to wire it.
        return _stub(tier, prompt, tin, tout, usd, reason="live_not_wired")

    return _stub(tier, prompt, tin, tout, usd)


def _stub(tier, prompt, tin, tout, usd, reason=None):
    # Deterministic mock: a short acknowledgement keyed by a prompt hash so runs
    # are reproducible. The real *content* of deliverables is produced by the
    # handlers; this stub only stands in for the LLM's "thinking" token usage.
    digest = hashlib.sha256(prompt.encode("utf-8")).hexdigest()[:8]
    text = f"[stub:{tier['name']}:{digest}] processed {tin}+{tout} tokens"
    return tier["model"], text, tin, tout, usd, "stub"
