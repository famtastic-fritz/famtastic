"""Task handler registry.

A handler is a function `handle(task: dict) -> HandlerResult`. Each handler may
call the model router one or more times; the worker aggregates the resulting
cost/latency. Handlers are the "skills" a worker can perform. New task kinds are
added by registering a new handler here — the orchestrator and workers pick them
up automatically.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable

from ..router import RouteResult


@dataclass
class HandlerResult:
    ok: bool
    summary: str
    detail: str = ""
    routes: list[RouteResult] = field(default_factory=list)
    artifact_path: str | None = None

    @property
    def cost_usd(self) -> float:
        return round(sum(r.cost_usd for r in self.routes), 6)

    @property
    def latency_ms(self) -> int:
        return sum(r.latency_ms for r in self.routes)

    @property
    def model_used(self) -> str:
        return self.routes[-1].model if self.routes else "none"

    @property
    def tier(self) -> str:
        return self.routes[-1].tier if self.routes else "none"


from . import deal_finder, marketing, outreach, sales  # noqa: E402

REGISTRY: dict[str, Callable[[dict], HandlerResult]] = {
    "deal_finder": deal_finder.handle,
    "apparel_finder": deal_finder.handle_apparel,
    "marketing": marketing.handle,
    "campaign": marketing.handle_campaign,
    "outreach": outreach.handle,
    "sales": sales.handle,
    "payment": sales.handle_payment,
}


def get_handler(kind: str) -> Callable[[dict], HandlerResult]:
    return REGISTRY.get(kind, _unknown)


def _unknown(task: dict) -> HandlerResult:
    return HandlerResult(ok=False, summary=f"No handler for kind '{task.get('kind')}'")
