"""
api/routes/trust.py — Trust mode query and set.
"""

from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter
from pydantic import BaseModel

from api.server import get_orchestrator

router = APIRouter()


class TrustSetRequest(BaseModel):
    level: str


@router.get("")
async def get_trust() -> Dict[str, Any]:
    """Get current trust mode configuration."""
    orch = get_orchestrator()
    return orch.trust_mode.to_dict()


@router.put("")
async def set_trust(payload: TrustSetRequest) -> Dict[str, Any]:
    """Set trust mode level."""
    orch = get_orchestrator()
    try:
        orch.trust_mode.set_level(payload.level)
        return {"success": True, "level": orch.trust_mode.get_level()}
    except ValueError as exc:
        return {"success": False, "error": str(exc)}
