"""
api/websocket.py — WebSocket event broadcaster.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, Dict, List

from fastapi import WebSocket

logger = logging.getLogger("api.websocket")

_connected: List[WebSocket] = []


async def broadcast(event: Dict[str, Any]) -> None:
    """Broadcast an event to all connected WebSocket clients."""
    dead = []
    for ws in _connected:
        try:
            await ws.send_json(event)
        except Exception:
            dead.append(ws)
    for ws in dead:
        if ws in _connected:
            _connected.remove(ws)


async def register(websocket: WebSocket) -> None:
    await websocket.accept()
    _connected.append(websocket)
    logger.info(f"WS registered. Total clients: {len(_connected)}")


async def unregister(websocket: WebSocket) -> None:
    if websocket in _connected:
        _connected.remove(websocket)
    logger.info(f"WS unregistered. Total clients: {len(_connected)}")
