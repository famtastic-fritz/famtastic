"""models.py — OpenRouter-style model layer with offline stubs.

Three tiers, priced per 1M tokens (illustrative, OpenRouter-ish). The router
picks the cheapest capable tier. Real calls only happen when BOTH a key is set
AND FACTORY_LIVE=1 — otherwise every call is deterministically stubbed so the
whole system runs offline with zero spend (SANDBOX.md rule 3).
"""
from __future__ import annotations

import hashlib
import os
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent

# price_in / price_out are USD per 1,000,000 tokens.
MODELS = {
    "triage-cheap":  {"price_in": 0.05,  "price_out": 0.25,  "tier": 0, "name": "triage-cheap"},
    "worker-mid":    {"price_in": 0.50,  "price_out": 1.50,  "tier": 1, "name": "worker-mid"},
    "worker-strong": {"price_in": 3.00,  "price_out": 15.00, "tier": 2, "name": "worker-strong"},
}


def _load_env() -> dict:
    """Tiny .env reader (no dependency on python-dotenv)."""
    env = dict(os.environ)
    envfile = ROOT / ".env"
    if envfile.exists():
        for line in envfile.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env.setdefault(k.strip(), v.strip())
    return env


def live_mode() -> bool:
    env = _load_env()
    return bool(env.get("OPENROUTER_API_KEY")) and env.get("FACTORY_LIVE") == "1"


def cost_usd(model: str, tokens_in: int, tokens_out: int) -> float:
    m = MODELS[model]
    return (tokens_in / 1_000_000) * m["price_in"] + (tokens_out / 1_000_000) * m["price_out"]


def _stub_tokens(prompt: str, model: str) -> tuple[int, int]:
    """Deterministic, prompt-dependent token counts so costs are reproducible.
    Stronger tiers 'spend' more output tokens (more reasoning)."""
    base_in = max(20, len(prompt) // 3)
    seed = int(hashlib.sha256((prompt + model).encode()).hexdigest(), 16)
    jitter = seed % 40
    out_factor = {"triage-cheap": 1, "worker-mid": 3, "worker-strong": 6}[model]
    base_out = (40 + jitter) * out_factor
    return base_in, base_out


def call(model: str, prompt: str, *, task_kind: str = "") -> dict:
    """Return {text, tokens_in, tokens_out, cost_usd, model, stubbed, latency_ms}."""
    if model not in MODELS:
        raise ValueError(f"unknown model {model!r}")
    t0 = time.time()

    if live_mode():
        result = _real_call(model, prompt)  # pragma: no cover - needs a key
        stubbed = False
    else:
        # Simulate a little latency proportional to tier so the dashboard shows
        # realistic throughput numbers, without ever blocking long.
        time.sleep(0.02 * (MODELS[model]["tier"] + 1))
        tin, tout = _stub_tokens(prompt, model)
        text = (
            f"[stub:{model}] handled {task_kind or 'task'} "
            f"({len(prompt)} chars) -> ok"
        )
        result = {"text": text, "tokens_in": tin, "tokens_out": tout}
        stubbed = True

    c = cost_usd(model, result["tokens_in"], result["tokens_out"])
    return {
        "model": model,
        "text": result["text"],
        "tokens_in": result["tokens_in"],
        "tokens_out": result["tokens_out"],
        "cost_usd": round(c, 8),
        "stubbed": stubbed,
        "latency_ms": int((time.time() - t0) * 1000),
    }


def _real_call(model: str, prompt: str) -> dict:  # pragma: no cover
    """Placeholder for a real OpenRouter call. Only reached when FACTORY_LIVE=1
    and a key exists. Implemented with stdlib urllib so there are no deps.
    Documented in SETUP.md; intentionally minimal."""
    import json
    import urllib.request

    env = _load_env()
    base = env.get("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    # Map our internal tier names to real OpenRouter model slugs here.
    slug = {
        "triage-cheap": "anthropic/claude-haiku-4.5",
        "worker-mid": "anthropic/claude-sonnet-4.6",
        "worker-strong": "anthropic/claude-opus-4.8",
    }[model]
    body = json.dumps({
        "model": slug,
        "messages": [{"role": "user", "content": prompt}],
    }).encode()
    req = urllib.request.Request(
        f"{base}/chat/completions", data=body,
        headers={
            "Authorization": f"Bearer {env['OPENROUTER_API_KEY']}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read())
    usage = data.get("usage", {})
    return {
        "text": data["choices"][0]["message"]["content"],
        "tokens_in": usage.get("prompt_tokens", 0),
        "tokens_out": usage.get("completion_tokens", 0),
    }
