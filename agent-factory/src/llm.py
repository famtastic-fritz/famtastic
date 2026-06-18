"""OpenRouter-style model client — STUBBED OFFLINE by default.

If OPENROUTER_API_KEY is set in .env, `complete()` will attempt a real HTTP
call. With no key (the default), it returns a deterministic mock completion so
the entire factory runs end-to-end with no network and no spend.

Token accounting is real in both modes so the cost ledger is meaningful.
"""
from __future__ import annotations

import json
import time
import urllib.request
from dataclasses import dataclass

from common import load_env


@dataclass
class Completion:
    text: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    stubbed: bool


def _estimate_tokens(text: str) -> int:
    # ~4 chars/token heuristic, good enough for ledger math.
    return max(1, len(text) // 4)


def complete(model: str, prompt: str, *, max_tokens: int = 1200,
             system: str = "") -> Completion:
    env = load_env()
    key = env.get("OPENROUTER_API_KEY")
    prompt_tokens = _estimate_tokens(system + prompt)

    if not key:
        # ---- OFFLINE MOCK PATH -------------------------------------------
        # Deterministic, model-flavored stub. The real *deliverable content*
        # for the business-model task is produced by the task handler itself;
        # this stub stands in for the raw LLM call so routing/cost is exercised.
        body = (
            f"[stubbed completion · model={model}]\n"
            f"Acknowledged request ({prompt_tokens} prompt tokens). "
            f"Produced structured output per task contract."
        )
        completion_tokens = min(max_tokens, _estimate_tokens(body) + 80)
        # Small realistic latency so concurrent workers actually share load and
        # the latency metrics are meaningful. Stronger models "think" longer.
        weight = {"strong": 0.45, "mid": 0.22}.get(model.split("/")[0], 0.10)
        time.sleep(weight + completion_tokens / 4000)
        return Completion(
            text=body,
            model=model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            stubbed=True,
        )

    # ---- REAL PATH (only if the user opted in with a key) -----------------
    url = env.get("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1") + "/chat/completions"
    payload = {
        "model": model,
        "messages": ([{"role": "system", "content": system}] if system else [])
        + [{"role": "user", "content": prompt}],
        "max_tokens": max_tokens,
    }
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read())
    text = data["choices"][0]["message"]["content"]
    usage = data.get("usage", {})
    return Completion(
        text=text,
        model=model,
        prompt_tokens=usage.get("prompt_tokens", prompt_tokens),
        completion_tokens=usage.get("completion_tokens", _estimate_tokens(text)),
        stubbed=False,
    )
