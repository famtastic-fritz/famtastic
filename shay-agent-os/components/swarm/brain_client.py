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


class BrainChain:
    """
    Routes a call through Claude → OpenRouter → Gemini → Ollama.
    First success wins. Records the effective brain for every call.
    """

    def __init__(self, preferred: Optional[str] = None):
        self.preferred = preferred
        self.last_brain: Optional[str] = None

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
