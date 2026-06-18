"""Task type registry: maps a task `type` to a handler.

A handler receives (payload, completion_text) and returns markdown for the
output artifact. The completion_text is the (stubbed or live) LLM output, so
every handler exercises the router/cost path even when its real value is
template-driven.
"""
from __future__ import annotations

from . import business_model


def _summarize(payload, comp):
    text = payload.get("text", "")
    words = text.split()
    head = " ".join(words[:25])
    return f"# Summary\n\nInput length: {len(words)} words.\n\nLead: {head}...\n\n_model note:_ {comp}\n"


def _classify(payload, comp):
    text = payload.get("text", "").lower()
    label = "billing" if "invoice" in text or "pay" in text else \
            "support" if "broken" in text or "error" in text else "general"
    return f"# Classification\n\nLabel: **{label}**\n\n_model note:_ {comp}\n"


def _personalize(payload, comp):
    name = payload.get("name", "there")
    biz = payload.get("business", "your business")
    return (f"# Outreach first line\n\nHi {name} — saw {biz}'s site and the bones "
            f"are good, but it's leaving money on the table. Mind if I send a "
            f"60-sec teardown?\n\n_model note:_ {comp}\n")


def _proposal(payload, comp):
    biz = payload.get("business", "the client")
    return (f"# Proposal — {biz}\n\nThree-tier (Storefront $900 / Signature $2,400 / "
            f"Flagship $4,800). 50% deposit via PayPal to start. Care Plan "
            f"$79/mo, first month free.\n\n_model note:_ {comp}\n")


def _business_model(payload, comp):
    return business_model.build(payload)


HANDLERS = {
    "summarize": _summarize,
    "classify": _classify,
    "personalize": _personalize,
    "proposal": _proposal,
    "business_model": _business_model,
}


def handle(task_type: str, payload: dict, completion_text: str) -> str:
    fn = HANDLERS.get(task_type)
    if fn is None:
        return f"# Unknown task type: {task_type}\n\nPayload: {payload}\n"
    return fn(payload, completion_text)
