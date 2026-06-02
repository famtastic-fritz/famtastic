"""
api/routes/events.py — Event streaming endpoints.
"""

from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter

from api.server import get_orchestrator

router = APIRouter()


@router.get("")
async def list_events(limit: int = 50) -> Dict[str, Any]:
    """List recent events from message bus memory queue."""
    orch = get_orchestrator()
    mb = orch.message_bus
    health = mb.health()
    return {
        "events": [],
        "channels": health.get("channels", []),
        "listeners": health.get("listeners", {}),
        "memory_queue_size": health.get("memory_queue_size", 0),
    }
