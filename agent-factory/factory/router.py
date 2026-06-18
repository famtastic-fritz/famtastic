"""Model routing + cost control.

Picks the cheapest *capable* model per task and tracks a running cost ledger in
COSTS.log. Optimizes throughput-per-dollar: cheap/local tiers handle triage and
simple work; the strong tier is only used when a task's complexity demands it.

Runs OFFLINE by default. A model "call" returns deterministic synthetic output
and an *estimated* cost. A real OpenRouter/local call is attempted only if BOTH
an API key is present AND FACTORY_ALLOW_LIVE_CALLS=1 — and even then it falls
back to stub on any error, so the whole system always runs end-to-end.
"""
from __future__ import annotations

import hashlib
import json
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, asdict

from .paths import CONFIG_PATH, COSTS_LOG, load_env


@dataclass
class RouteResult:
    tier: str
    model: str
    provider: str
    mode: str            # "stub" | "live"
    input_tokens: int
    output_tokens: int
    cost_usd: float
    latency_ms: int
    text: str


def load_config() -> dict:
    return json.loads(CONFIG_PATH.read_text())


def _est_tokens(text: str) -> int:
    # ~4 chars/token heuristic, floor of 1.
    return max(1, len(text) // 4)


def required_capability(complexity: float) -> float:
    """Map a task's [0,1] complexity to the minimum model capability needed."""
    return max(0.0, min(1.0, complexity))


def choose_tier(complexity: float, cfg: dict, env: dict) -> tuple[str, dict]:
    """Cheapest tier whose capability covers the task. Respects cheap_first and
    the escalation threshold from tunables."""
    routing = cfg["routing"]
    tun = cfg["tunables"]
    need = required_capability(complexity)

    order = routing["tier_order"]
    models = routing["models"]

    # If complexity exceeds the escalation threshold, never start below "cheap":
    # local-triage is fine for sorting, not for the hard task itself.
    escalate = complexity >= tun["complexity_escalation_threshold"]

    candidates = order if tun.get("cheap_first", True) else list(reversed(order))
    for name in candidates:
        spec = models[name]
        if escalate and spec["max_capability"] < required_capability(0.5):
            continue
        if spec["max_capability"] >= need:
            return name, spec
    # Nothing covers it — use the strongest available.
    strongest = max(models.items(), key=lambda kv: kv[1]["max_capability"])
    return strongest[0], strongest[1]


def _stub_response(prompt: str, spec: dict, out_tokens: int) -> str:
    """Deterministic synthetic completion so offline runs are reproducible."""
    h = hashlib.sha256(prompt.encode()).hexdigest()[:8]
    return (f"[stub:{spec['model']}#{h}] processed {out_tokens}-token response "
            f"for prompt of {_est_tokens(prompt)} tokens")


def _post_json(url: str, body: bytes, headers: dict, timeout: float, retries: int):
    """POST and parse an OpenAI-compatible chat-completion response.

    Returns (text, usage_dict) or None on any failure. usage_dict carries real
    prompt/completion token counts when the endpoint reports them, so cost is
    measured rather than estimated.
    """
    last_err = None
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, data=body, headers=headers)
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                data = json.loads(resp.read())
            text = data["choices"][0]["message"]["content"]
            usage = data.get("usage", {}) or {}
            return text, usage
        except Exception as e:  # transient network / parse error -> retry then give up
            last_err = e
            if attempt < retries:
                time.sleep(0.25 * (attempt + 1))
    return None


def _live_openrouter(prompt: str, spec: dict, env: dict, timeout: float, retries: int):
    key = env.get("OPENROUTER_API_KEY", "")
    if not key:
        return None
    body = json.dumps({
        "model": spec["model"],
        "messages": [{"role": "user", "content": prompt}],
    }).encode()
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    base = env.get("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    return _post_json(base.rstrip("/") + "/chat/completions",
                      body, headers, timeout, retries)


def _live_local(prompt: str, spec: dict, env: dict, timeout: float, retries: int):
    base = env.get("LOCAL_MODEL_URL", "")
    if not base:
        return None
    body = json.dumps({
        "model": env.get("LOCAL_MODEL_NAME", spec["model"]),
        "messages": [{"role": "user", "content": prompt}],
    }).encode()
    return _post_json(base.rstrip("/") + "/chat/completions",
                      body, {"Content-Type": "application/json"}, timeout, retries)


def route_and_run(prompt: str, complexity: float,
                  expected_output_tokens: int = 220) -> RouteResult:
    cfg = load_config()
    env = load_env()
    tier, spec = choose_tier(complexity, cfg, env)

    in_tok = _est_tokens(prompt)
    out_tok = expected_output_tokens

    live_allowed = env.get("FACTORY_ALLOW_LIVE_CALLS") == "1"
    timeout = float(cfg["tunables"].get("live_call_timeout_seconds", 20))
    retries = int(cfg["tunables"].get("live_call_retries", 1))
    mode = "stub"
    text = None
    t0 = time.time()

    if live_allowed:
        out = None
        if spec["provider"] == "openrouter":
            out = _live_openrouter(prompt, spec, env, timeout, retries)
        elif spec["provider"] == "local":
            out = _live_local(prompt, spec, env, timeout, retries)
        if out is not None:
            text, usage = out
            mode = "live"
            # Prefer the endpoint's reported token usage; fall back to estimate.
            in_tok = int(usage.get("prompt_tokens") or in_tok)
            out_tok = int(usage.get("completion_tokens") or _est_tokens(text))

    if text is None:
        text = _stub_response(prompt, spec, out_tok)
        # tiny deterministic delay so latency metrics are non-zero
        time.sleep(0.01 + (in_tok % 7) * 0.002)

    latency_ms = int((time.time() - t0) * 1000)
    cost = (in_tok / 1000.0) * spec["cost_per_1k_input"] + \
           (out_tok / 1000.0) * spec["cost_per_1k_output"]

    result = RouteResult(
        tier=tier, model=spec["model"], provider=spec["provider"], mode=mode,
        input_tokens=in_tok, output_tokens=out_tok, cost_usd=round(cost, 6),
        latency_ms=latency_ms, text=text,
    )
    _log_cost(result)
    return result


def _log_cost(r: RouteResult) -> None:
    entry = {"ts": round(time.time(), 3), **asdict(r)}
    entry.pop("text", None)  # keep ledger compact
    COSTS_LOG.parent.mkdir(parents=True, exist_ok=True)
    with COSTS_LOG.open("a") as f:
        f.write(json.dumps(entry) + "\n")
