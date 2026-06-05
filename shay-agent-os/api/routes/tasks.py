"""
api/routes/tasks.py — Task management.
"""

from __future__ import annotations

import time
from typing import Any, Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from api import event_log
from api.server import get_orchestrator

router = APIRouter()


class TaskCreate(BaseModel):
    prompt: str
    model_tier: str = "simple"
    priority: str = "NORMAL"
    timeout: float = 60.0


class GoalCreate(BaseModel):
    description: str
    session_id: Optional[str] = None


@router.get("")
async def list_tasks() -> Dict[str, Any]:
    """List tasks from the worker pool."""
    orch = get_orchestrator()
    health = orch.health()
    wp = health.get("worker_pool", {})
    return {
        "pending": wp.get("pending_tasks", 0),
        "completed": wp.get("completed_tasks", 0),
        "failed": wp.get("failed_tasks", 0),
    }


@router.post("")
async def create_task(payload: TaskCreate) -> Dict[str, Any]:
    """Submit a direct task to the worker pool."""
    orch = get_orchestrator()
    from components.swarm.worker_pool import TaskPriority
    prio_map = {
        "LOW": TaskPriority.LOW,
        "NORMAL": TaskPriority.NORMAL,
        "HIGH": TaskPriority.HIGH,
        "CRITICAL": TaskPriority.CRITICAL,
    }
    priority = prio_map.get(payload.priority.upper(), TaskPriority.NORMAL)
    tid = orch.worker_pool.submit(
        prompt=payload.prompt,
        model_tier=payload.model_tier,
        priority=priority,
        timeout=payload.timeout,
    )
    event_log.task_start(f"Task submitted: {payload.prompt[:80]}", source="agent-os",
                         task_id=tid, model_tier=payload.model_tier)
    return {"task_id": tid, "status": "submitted"}


@router.get("/{task_id}")
async def get_task(task_id: str) -> Dict[str, Any]:
    orch = get_orchestrator()
    task = orch.worker_pool.get_task(task_id)
    if task is None:
        return {"error": "Task not found"}
    return {
        "id": task.id,
        "status": task.status.name,
        "result": task.result,
        "error": task.error,
        "model_tier": task.model_tier,
        "worker_id": task.worker_id,
        "created_at": task.created_at,
        "started_at": task.started_at,
        "finished_at": task.finished_at,
    }


@router.post("/goal")
async def create_goal(payload: GoalCreate) -> Dict[str, Any]:
    """Submit a goal to the goal loop (async)."""
    orch = get_orchestrator()
    session = orch.goal_async(payload.description, payload.session_id)
    event_log.emit(type="command", message=f"Goal started: {payload.description[:80]}",
                   severity="info", source="agent-os", session_id=session.id)
    return {
        "session_id": session.id,
        "status": session.status,
        "goal": session.original_goal,
    }


@router.get("/goal/{session_id}")
async def get_goal(session_id: str) -> Dict[str, Any]:
    orch = get_orchestrator()
    session = orch.goal_loop.get_session(session_id)
    if session is None:
        return {"error": "Session not found"}
    return {
        "session_id": session.id,
        "status": session.status,
        "goal": session.original_goal,
        "turn": session.turn,
        "budget": session.budget,
        "final_result": session.final_result,
        "subgoals": [
            {
                "id": sg.id,
                "description": sg.description,
                "status": sg.status,
                "result": sg.result,
            }
            for sg in session.subgoals
        ],
    }
