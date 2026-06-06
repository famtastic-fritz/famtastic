"""
api/routes/events.py — Event feed endpoints, backed by the event spine.

GET  /api/events       → recent events from ~/.shay/events.jsonl (the spine)
POST /api/events       → append an event (any surface can emit) + live-broadcast

The spine (`api/event_log.py`) is the single source of truth; the message-bus
health is folded in so the dashboard still sees channel/listener counts.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from api import event_log
from api.deps import get_orchestrator

router = APIRouter()


class EventCreate(BaseModel):
    type: str = "log"
    message: str
    severity: str = "info"
    agentId: Optional[str] = None
    source: str = "external"


@router.get("")
async def list_events(limit: int = 50) -> Dict[str, Any]:
    """Recent events (newest first) from the spine + live bus health."""
    events = event_log.read_tail(limit=limit, newest_first=True)

    # Fold in message-bus health so the dashboard keeps its channel counters.
    channels: list = []
    listeners: dict = {}
    memory_queue_size = 0
    try:
        orch = get_orchestrator()
        health = orch.message_bus.health()
        channels = health.get("channels", [])
        listeners = health.get("listeners", {})
        memory_queue_size = health.get("memory_queue_size", 0)
    except Exception:  # noqa: BLE001 — feed must render even if the bus is down
        pass

    return {
        "events": events,
        "count": len(events),
        "channels": channels,
        "listeners": listeners,
        "memory_queue_size": memory_queue_size,
    }


@router.post("")
async def create_event(payload: EventCreate) -> Dict[str, Any]:
    """Append an event to the spine and push it to live WebSocket clients."""
    event = event_log.emit(
        type=payload.type,
        message=payload.message,
        severity=payload.severity,
        agent_id=payload.agentId,
        source=payload.source,
    )
    # Best-effort live fan-out; the follower would pick it up anyway on next poll.
    try:
        from api.server import broadcast_event

        await broadcast_event(event)
    except Exception:  # noqa: BLE001
        pass
    return {"ok": True, "event": event}
