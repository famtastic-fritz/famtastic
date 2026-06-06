"""
api/server.py — FastAPI server connecting dashboard to swarm orchestrator.
Port: 8643
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

# Ensure components/swarm is on path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from api import event_log

# Orchestrator accessor lives in api.deps (a leaf module) so the route modules
# can import it without importing api.server — breaking the import cycle that
# crashed `python -m api.server`. See api/deps.py.
from api.deps import get_orchestrator, stop_orchestrator

logger = logging.getLogger("api.server")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_orchestrator()
    event_log.system("Command-center API online", severity="success")
    follower = asyncio.create_task(_event_follower())
    try:
        yield
    finally:
        follower.cancel()
        try:
            await follower
        except (asyncio.CancelledError, Exception):  # noqa: BLE001
            pass
        stop_orchestrator()


async def _event_follower(poll_interval: float = 1.0) -> None:
    """Tail the event spine and push new appends to all WebSocket clients.

    Polling (not inotify) keeps it portable across mac/linux and works no matter
    which process wrote the line — the agent-os orchestrator, cron, the kanban
    hook, or the Node fleet bridge. We start at the current end of file so a
    fresh client sees only events from connect-time forward; the initial
    backlog is served by GET /api/events.
    """
    offset = event_log.file_size()
    while True:
        try:
            await asyncio.sleep(poll_interval)
            if not _connected_websockets:
                # No listeners — keep the offset moving so we don't replay a
                # backlog to the next client that connects.
                offset = event_log.file_size()
                continue
            offset, new_events = event_log.read_since(offset)
            for ev in new_events:
                await broadcast_event(ev)
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # noqa: BLE001 — follower must never die
            logger.error(f"Event follower error: {exc}")


app = FastAPI(
    title="Shay Agent OS API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    # Allow the dashboard from localhost (dev) AND the phone over Tailscale
    # (*.ts.net MagicDNS, any port). A regex echoes the matched origin back, so
    # this stays compatible with allow_credentials (unlike a "*" wildcard).
    # Private LAN/tailnet tool — not exposed to the public internet.
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|[\w-]+\.ts\.net)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------
# Import routes
# ------------------------------------------------------------------
from api.routes import agents, tasks, events, trust, board

app.include_router(agents.router, prefix="/api/agents", tags=["agents"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
app.include_router(events.router, prefix="/api/events", tags=["events"])
app.include_router(trust.router, prefix="/api/trust", tags=["trust"])
app.include_router(board.router, prefix="/api/board", tags=["board"])


# ------------------------------------------------------------------
# Health & root
# ------------------------------------------------------------------

@app.get("/api/health")
async def health() -> Dict[str, Any]:
    orch = get_orchestrator()
    return orch.health()


@app.get("/api/status")
async def status() -> Dict[str, Any]:
    orch = get_orchestrator()
    return {"report": orch.status_report()}


@app.post("/api/heartbeat")
async def heartbeat(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Receive agent heartbeat."""
    agent_id = payload.get("agent_id", "unknown")
    logger.info(f"Heartbeat from {agent_id}")
    event_log.emit(type="heartbeat", message=f"Heartbeat from {agent_id}",
                   severity="info", agent_id=agent_id, source="agent-os")
    return {"received": True, "agent_id": agent_id, "timestamp": asyncio.get_event_loop().time()}


# ------------------------------------------------------------------
# WebSocket event stream
# ------------------------------------------------------------------

_connected_websockets: List[WebSocket] = []


@app.websocket("/ws/events")
async def websocket_events(websocket: WebSocket):
    await websocket.accept()
    _connected_websockets.append(websocket)
    logger.info(f"WebSocket client connected. Total: {len(_connected_websockets)}")
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            # Echo back or handle subscription
            await websocket.send_json({"type": "ack", "received": msg})
    except WebSocketDisconnect:
        _connected_websockets.remove(websocket)
        logger.info(f"WebSocket client disconnected. Total: {len(_connected_websockets)}")
    except Exception as exc:
        logger.error(f"WebSocket error: {exc}")
        if websocket in _connected_websockets:
            _connected_websockets.remove(websocket)


async def broadcast_event(event: Dict[str, Any]) -> None:
    """Broadcast an event to all connected WebSocket clients."""
    dead = []
    for ws in _connected_websockets:
        try:
            await ws.send_json(event)
        except Exception:
            dead.append(ws)
    for ws in dead:
        if ws in _connected_websockets:
            _connected_websockets.remove(ws)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8643)
