"""Model layer — OpenRouter-style interface with an offline deterministic stub.

By default (no key, or AGENT_FACTORY_LIVE != 1) every call is served by a local
deterministic stub: no network, no spend, fully reproducible. If the operator
fills .env with a real OPENROUTER_API_KEY *and* sets AGENT_FACTORY_LIVE=1, the
same interface issues a real HTTP call via stdlib urllib (no extra deps).

A "model catalog" carries approximate per-million-token prices so the router can
optimise throughput-per-dollar. Prices are illustrative and easy to update.
"""
import hashlib
import json
import os
import random
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _load_env():
    """Tiny .env reader (no python-dotenv dependency)."""
    env_path = os.path.join(ROOT, ".env")
    vals = {}
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                vals[k.strip()] = v.strip()
    # process env overrides file
    for k in ("OPENROUTER_API_KEY", "AGENT_FACTORY_LIVE", "OPENROUTER_BASE_URL"):
        if os.environ.get(k):
            vals[k] = os.environ[k]
    return vals


# Tiered catalog: cheap triage -> capable -> strong -> frontier.
# Prices are USD per 1,000,000 tokens (input / output). Illustrative.
MODEL_CATALOG = {
    "triage":   {"id": "meta-llama/llama-3.1-8b-instruct", "in": 0.05,  "out": 0.08},
    "standard": {"id": "anthropic/claude-haiku-4-5",       "in": 0.80,  "out": 4.00},
    "strong":   {"id": "anthropic/claude-sonnet-4-6",      "in": 3.00,  "out": 15.00},
    "frontier": {"id": "anthropic/claude-opus-4-8",        "in": 15.00, "out": 75.00},
}
TIER_ORDER = ["triage", "standard", "strong", "frontier"]


def price_for(tier):
    return MODEL_CATALOG[tier]


def estimate_cost(tier, tokens_in, tokens_out):
    p = MODEL_CATALOG[tier]
    return (tokens_in / 1_000_000.0) * p["in"] + (tokens_out / 1_000_000.0) * p["out"]


def is_live():
    env = _load_env()
    return env.get("AGENT_FACTORY_LIVE") == "1" and bool(env.get("OPENROUTER_API_KEY"))


def _approx_tokens(text):
    # ~4 chars per token heuristic
    return max(1, int(len(text) / 4))


def call(tier, system, prompt, max_tokens=400):
    """Return dict: text, tokens_in, tokens_out, model, tier, latency_ms, live."""
    model = MODEL_CATALOG[tier]["id"]
    t0 = time.time()
    if is_live():
        text, tin, tout = _call_live(model, system, prompt, max_tokens)
        live = True
    else:
        text, tin, tout = _call_stub(tier, model, system, prompt, max_tokens)
        live = False
    return {
        "text": text,
        "tokens_in": tin,
        "tokens_out": tout,
        "model": model,
        "tier": tier,
        "latency_ms": int((time.time() - t0) * 1000),
        "live": live,
    }


def _call_live(model, system, prompt, max_tokens):
    env = _load_env()
    base = env.get("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    body = json.dumps({
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        "max_tokens": max_tokens,
    }).encode()
    req = urllib.request.Request(
        base.rstrip("/") + "/chat/completions",
        data=body,
        headers={
            "Authorization": "Bearer " + env["OPENROUTER_API_KEY"],
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read())
    text = data["choices"][0]["message"]["content"]
    usage = data.get("usage", {})
    tin = usage.get("prompt_tokens", _approx_tokens(system + prompt))
    tout = usage.get("completion_tokens", _approx_tokens(text))
    return text, tin, tout


def _call_stub(tier, model, system, prompt, max_tokens):
    """Deterministic offline response. Output volume scales with tier so cost
    accounting is realistic. Seeded by content hash for reproducibility."""
    seed = int(hashlib.sha256((tier + prompt).encode()).hexdigest(), 16) % (2**32)
    rng = random.Random(seed)
    # simulate a little work so latency/throughput are observable
    time.sleep(rng.uniform(0.02, 0.10))
    tin = _approx_tokens(system + prompt)
    base_out = {"triage": 40, "standard": 140, "strong": 320, "frontier": 520}[tier]
    tout = min(max_tokens, base_out + rng.randint(-15, 40))
    text = (
        f"[stub:{model}] " + _summarize_prompt(prompt, tier)
    )
    return text, tin, tout


def _summarize_prompt(prompt, tier):
    head = prompt.strip().splitlines()[0] if prompt.strip() else "(empty)"
    head = head[:160]
    return (
        f"({tier} tier deterministic result) Processed: {head} | "
        f"This is an offline stub response; wire OPENROUTER_API_KEY + "
        f"AGENT_FACTORY_LIVE=1 for real model output."
    )


if __name__ == "__main__":
    r = call("standard", "You are a triage agent.", "Classify: TradingAgents framework")
    print(json.dumps(r, indent=2))
    print("cost=$%.6f" % estimate_cost(r["tier"], r["tokens_in"], r["tokens_out"]))
