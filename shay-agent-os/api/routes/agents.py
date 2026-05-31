"""
api/routes/agents.py — Agent listing and status.
"""

from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter

from api.server import get_orchestrator

router = APIRouter()


@router.get("")
async def list_agents() -> Dict[str, Any]:
    """List all agents with status from SwarmOrchestrator."""
    orch = get_orchestrator()
    health = orch.health()
    workers = health.get("worker_pool", {}).get("workers", {})

    agents: List[Dict[str, Any]] = [
        {
            "id": "orch-1",
            "name": "Orchestrator Alpha",
            "model": "swarm-orchestrator",
            "role": "orchestrator",
            "status": "busy" if health.get("started") else "offline",
            "lastHeartbeat": health.get("message_bus", {}).get("connected", False),
            "tasksCompleted": health.get("total_goals", 0),
            "tasksFailed": health.get("failures", 0),
            "currentTask": f"Trust: {health.get('trust_level', 'unknown')}",
        }
    ]

    for wid, wdata in workers.items():
        status = wdata.get("status", "idle")
        agents.append({
            "id": wid,
            "name": wid.replace("-", " ").title(),
            "model": wdata.get("model", "unknown"),
            "role": "worker",
            "status": status,
            "lastHeartbeat": wdata.get("last_heartbeat", 0),
            "tasksCompleted": wdata.get("total_tasks", 0),
            "tasksFailed": wdata.get("failed_tasks", 0),
            "currentTask": None,
        })

    return {"agents": agents, "count": len(agents)}


@router.get("/{agent_id}")
async def get_agent(agent_id: str) -> Dict[str, Any]:
    orch = get_orchestrator()
    health = orch.health()
    workers = health.get("worker_pool", {}).get("workers", {})
    if agent_id in workers:
        w = workers[agent_id]
        return {
            "id": agent_id,
            "name": agent_id.replace("-", " ").title(),
            "model": w.get("model", "unknown"),
            "role": "worker",
            "status": w.get("status", "idle"),
            "lastHeartbeat": w.get("last_heartbeat", 0),
            "tasksCompleted": w.get("total_tasks", 0),
            "tasksFailed": w.get("failed_tasks", 0),
        }
    if agent_id == "orch-1":
        return {
            "id": "orch-1",
            "name": "Orchestrator Alpha",
            "model": "swarm-orchestrator",
            "role": "orchestrator",
            "status": "busy" if health.get("started") else "offline",
        }
    return {"error": "Agent not found"}
