"""
brain_client.py — Self-contained, stdlib-only brain routing for the swarm.

NO imports from shay-shay / shay_cli — cross-package imports fail with
ModuleNotFoundError in the swarm's separate venv. All routing is pure stdlib
urllib + json. Keys are read directly from ~/.shay/.env.

Brain chain (default):
  Claude (Anthropic API, sk-ant-api key)
  → Claude via OpenRouter
  → Gemini Flash
  → Ollama hermes3 (always available)

Usage:
    from .brain_client import BrainChain, BrainAvailabilityCheck
    chain = BrainChain()
    check = BrainAvailabilityCheck(chain)  # logs which brains are up
    reply = chain.call(messages, system=SHAY_SYSTEM)
"""
from __future__ import annotations

import json
import logging
import os
import re
import time
import urllib.request
import urllib.error
from pathlib import Path
from typing import List, Dict, Optional

logger = logging.getLogger("swarm.brain_client")

ENV_FILE = Path.home() / ".shay" / ".env"

# Model + provider each brain route actually bills against. Used by the
# cost-telemetry hook below so per-call $-cost can be estimated through
# Shay-Shay's existing pricing tables (agent.cost_telemetry / usage_pricing).
# Local routes (ollama) carry no $ and are recorded at zero.
_BRAIN_BILLING: Dict[str, Dict[str, Optional[str]]] = {
    "claude": {"model": "gemini-2.5-pro", "provider": "gemini"},
    "openrouter": {"model": "gemini-2.5-pro", "provider": "gemini"},
    "gemini": {"model": "gemini-2.5-flash", "provider": "google"},
    "ollama": {"model": "hermes3:latest", "provider": "local"},
}
SHAY_SYSTEM = (
    "You are a task-execution brain inside Shay's multi-agent swarm. "
    "Be precise, concise, and return only what is asked. "
    "If asked for JSON, return ONLY valid JSON with no surrounding prose."
)


# ---------------------------------------------------------------------------
# Env reader
# ---------------------------------------------------------------------------

def _load_env() -> Dict[str, str]:
    env: Dict[str, str] = {}
    try:
        for line in ENV_FILE.read_text(errors="ignore").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip().strip('"').strip("'")
    except Exception:
        pass
    return env


_ENV: Optional[Dict[str, str]] = None


def _env() -> Dict[str, str]:
    global _ENV
    if _ENV is None:
        _ENV = _load_env()
    return _ENV


# ---------------------------------------------------------------------------
# Individual brain callers
# ---------------------------------------------------------------------------

def _call_anthropic(messages: List[Dict], system: str, timeout: float = 90.0) -> str:
    key = _env().get("ANTHROPIC_API_KEY", "")
    if not key.startswith("sk-ant-api"):
        raise RuntimeError("no direct Anthropic key (sk-ant-api…)")
    body = {
        "model": "claude-sonnet-4-6",
        "max_tokens": 2048,
        "system": system,
        "messages": messages,
    }
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=json.dumps(body).encode(),
        headers={
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        data = json.loads(r.read())
    return "".join(b.get("text", "") for b in data.get("content", [])).strip()


def _call_openrouter(messages: List[Dict], system: str, timeout: float = 90.0) -> str:
    key = _env().get("OPENROUTER_API_KEY", "")
    if not key:
        raise RuntimeError("no OPENROUTER_API_KEY")
    full_msgs = [{"role": "system", "content": system}] + messages
    body = {
        "model": "anthropic/claude-sonnet-4.6",
        "messages": full_msgs,
        "max_tokens": 2048,
    }
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost/shay-swarm",
            "X-Title": "Shay Swarm",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        data = json.loads(r.read())
    return data["choices"][0]["message"]["content"].strip()


def _call_gemini(messages: List[Dict], system: str, timeout: float = 90.0) -> str:
    key = _env().get("GEMINI_API_KEY", "")
    if not key:
        raise RuntimeError("no GEMINI_API_KEY")
    contents = [
        {
            "role": "user" if m["role"] == "user" else "model",
            "parts": [{"text": m["content"]}],
        }
        for m in messages
    ]
    body = {
        "system_instruction": {"parts": [{"text": system}]},
        "contents": contents,
        "generationConfig": {"maxOutputTokens": 2048},
    }
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-2.5-flash:generateContent?key={key}"
    )
    req = urllib.request.Request(
        url, data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        data = json.loads(r.read())
    return data["candidates"][0]["content"]["parts"][0]["text"].strip()


def _call_ollama(messages: List[Dict], system: str, timeout: float = 90.0) -> str:
    full_msgs = [{"role": "system", "content": system}] + messages
    body = {
        "model": "hermes3:latest",
        "messages": full_msgs,
        "stream": False,
        "options": {"temperature": 0.7, "num_predict": 1024},
    }
    req = urllib.request.Request(
        "http://localhost:11434/api/chat",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        data = json.loads(r.read())
    return data.get("message", {}).get("content", "").strip()


# ---------------------------------------------------------------------------
# BrainChain — tries brains in order, logs which actually answered
# ---------------------------------------------------------------------------

_CHAIN = [
    ("claude", _call_anthropic),
    ("openrouter", _call_openrouter),
    ("gemini", _call_gemini),
    ("ollama", _call_ollama),
]


# ---------------------------------------------------------------------------
# Cost telemetry hook (B1)
#
# Reuses Shay-Shay's existing cost accounting rather than duplicating it:
#   agent.cost_telemetry.request_cost() — turns a token estimate into $-cost
#   + an energy weight via the official-docs pricing tables.
#
# Behavior is OBSERVE-ONLY: every routed call records an estimated $-cost into
# a process-rolling total. A *low-funds NOTIFY* (not a spend cap — nothing is
# ever blocked) fires once when the rolling total crosses a soft threshold.
# The threshold defaults to $0, which disables the notify entirely, so adding
# this hook changes no behavior until the operator opts in via env
# SWARM_COST_NOTIFY_USD (or by calling configure_cost_notify()).
# ---------------------------------------------------------------------------

# Rough char→token ratio for estimating usage when the provider doesn't echo
# token counts back (our stdlib callers read only the text body). 4 chars/token
# is the standard coarse approximation.
_CHARS_PER_TOKEN = 4


def _import_cost_telemetry():
    """Best-effort import of Shay-Shay's cost telemetry. Returns the module or
    None. Guarded because the swarm can run in a venv where shay-shay isn't on
    the path — in that case cost recording silently no-ops."""
    try:
        from agent import cost_telemetry  # type: ignore
        from agent.usage_pricing import CanonicalUsage  # type: ignore
        return cost_telemetry, CanonicalUsage
    except Exception:
        # Try adding the sibling shay-shay checkout to sys.path once.
        try:
            import sys
            shay = Path.home() / "famtastic" / "shay-shay"
            if shay.exists() and str(shay) not in sys.path:
                sys.path.insert(0, str(shay))
            from agent import cost_telemetry  # type: ignore
            from agent.usage_pricing import CanonicalUsage  # type: ignore
            return cost_telemetry, CanonicalUsage
        except Exception:
            return None


class CostMeter:
    """Process-rolling estimated-spend meter with an optional low-funds NOTIFY.

    This is intentionally a soft signal: it never blocks a call. When the
    rolling estimated spend crosses ``notify_usd`` (default 0 = disabled) it
    fires the notify callback exactly once. The default callback routes to the
    swarm logger; a real low-funds surface can be injected.
    """

    def __init__(
        self,
        notify_usd: float = 0.0,
        notify_cb: Optional["callable"] = None,
    ):
        self.notify_usd = float(notify_usd or 0.0)
        self.total_usd = 0.0
        self.calls = 0
        self.by_brain: Dict[str, float] = {}
        self._notified = False
        self._notify_cb = notify_cb or self._default_notify
        self._tel = None  # lazy (module, CanonicalUsage) tuple

    @staticmethod
    def _default_notify(total_usd: float, threshold: float) -> None:
        logger.warning(
            "[cost] LOW-FUNDS NOTIFY — rolling swarm spend ~$%.4f crossed "
            "soft threshold $%.4f (notify only, no cap applied)",
            total_usd, threshold,
        )

    def configure(self, notify_usd: Optional[float] = None,
                  notify_cb: Optional["callable"] = None) -> None:
        if notify_usd is not None:
            self.notify_usd = float(notify_usd or 0.0)
            self._notified = False  # re-arm on reconfigure
        if notify_cb is not None:
            self._notify_cb = notify_cb

    def record(self, brain: str, prompt: str, output: str) -> float:
        """Estimate + record the $-cost of one routed call. Returns the
        estimated $ for that call (0.0 when un-priceable / local)."""
        if self._tel is None:
            self._tel = _import_cost_telemetry()
        amount = 0.0
        billing = _BRAIN_BILLING.get(brain, {})
        if self._tel and billing.get("provider") != "local":
            cost_telemetry, CanonicalUsage = self._tel
            try:
                in_tok = max(0, len(prompt) // _CHARS_PER_TOKEN)
                out_tok = max(0, len(output) // _CHARS_PER_TOKEN)
                usage = CanonicalUsage(input_tokens=in_tok, output_tokens=out_tok)
                rc = cost_telemetry.request_cost(
                    billing.get("model") or brain,
                    usage,
                    provider=billing.get("provider"),
                )
                if rc.amount_usd:
                    amount = float(rc.amount_usd)
            except Exception as exc:
                logger.debug("[cost] estimate failed for %s: %s", brain, exc)
        self.total_usd += amount
        self.calls += 1
        self.by_brain[brain] = self.by_brain.get(brain, 0.0) + amount
        self._maybe_notify()
        return amount

    def _maybe_notify(self) -> None:
        if (
            not self._notified
            and self.notify_usd > 0
            and self.total_usd >= self.notify_usd
        ):
            self._notified = True
            try:
                self._notify_cb(self.total_usd, self.notify_usd)
            except Exception as exc:
                logger.debug("[cost] notify callback raised: %s", exc)

    def snapshot(self) -> Dict[str, object]:
        return {
            "total_usd": round(self.total_usd, 6),
            "calls": self.calls,
            "by_brain": {k: round(v, 6) for k, v in self.by_brain.items()},
            "notify_usd": self.notify_usd,
            "notified": self._notified,
        }


def _initial_notify_threshold() -> float:
    try:
        return float(_env().get("SWARM_COST_NOTIFY_USD", "0") or 0)
    except (TypeError, ValueError):
        return 0.0


# Shared process-wide meter. Every BrainChain records into this so the rolling
# total spans the whole swarm run, not a single chain instance.
COST_METER = CostMeter(notify_usd=_initial_notify_threshold())


def configure_cost_notify(notify_usd: float,
                          notify_cb: Optional["callable"] = None) -> None:
    """Opt in to the low-funds NOTIFY at a soft $ threshold (0 disables)."""
    COST_METER.configure(notify_usd=notify_usd, notify_cb=notify_cb)


class BrainChain:
    """
    Routes a call through Claude → OpenRouter → Gemini → Ollama.
    First success wins. Records the effective brain for every call.
    """

    def __init__(self, preferred: Optional[str] = None):
        self.preferred = preferred
        self.last_brain: Optional[str] = None
        self.last_cost_usd: float = 0.0

    def call(
        self,
        messages: List[Dict],
        system: str = SHAY_SYSTEM,
        timeout: float = 90.0,
    ) -> str:
        chain = list(_CHAIN)
        if self.preferred:
            chain.sort(key=lambda b: 0 if b[0] == self.preferred else 1)
        errors = []
        for name, fn in chain:
            try:
                result = fn(messages, system, timeout)
                self.last_brain = name
                # Record estimated $-cost of this routed call (observe-only;
                # fires a low-funds NOTIFY near the soft threshold, never caps).
                try:
                    prompt_text = " ".join(m.get("content", "") for m in messages)
                    self.last_cost_usd = COST_METER.record(name, prompt_text, result)
                except Exception as exc:
                    logger.debug("[cost] record failed: %s", exc)
                if errors:
                    logger.info(f"[brain] answered via {name} (tried: {', '.join(errors)})")
                else:
                    logger.debug(f"[brain] answered via {name}")
                return result
            except Exception as exc:
                errors.append(f"{name}: {exc}")
        raise RuntimeError(f"all brains failed: {' | '.join(errors)}")

    def call_prompt(self, prompt: str, system: str = SHAY_SYSTEM, timeout: float = 90.0) -> str:
        """Convenience: single user-turn from a string prompt."""
        return self.call([{"role": "user", "content": prompt}], system, timeout)


# ---------------------------------------------------------------------------
# BrainAvailabilityCheck — run at startup, loud not silent
# ---------------------------------------------------------------------------

class BrainAvailabilityCheck:
    def __init__(self, chain: BrainChain):
        self.available: Dict[str, bool] = {}
        self._check(chain)

    def _check(self, chain: BrainChain) -> None:
        checks = [
            ("claude", lambda: bool(_env().get("ANTHROPIC_API_KEY", "").startswith("sk-ant-api"))),
            ("openrouter", lambda: bool(_env().get("OPENROUTER_API_KEY"))),
            ("gemini", lambda: bool(_env().get("GEMINI_API_KEY"))),
            ("ollama", self._ping_ollama),
        ]
        lines = []
        for name, fn in checks:
            try:
                ok = fn()
            except Exception:
                ok = False
            self.available[name] = ok
            lines.append(f"  {name}: {'✓' if ok else '✗'}")
        logger.info("Brain availability:\n" + "\n".join(lines))
        if not any(self.available.values()):
            logger.error("NO brains available — swarm will fail all judge/synth calls")

    @staticmethod
    def _ping_ollama() -> bool:
        try:
            with urllib.request.urlopen(
                "http://localhost:11434/api/tags", timeout=5
            ) as r:
                return r.status == 200
        except Exception:
            return False
