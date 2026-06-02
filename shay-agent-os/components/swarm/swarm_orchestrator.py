"""
swarm_orchestrator.py — Main orchestrator tying together all swarm components.

Usage:
    from swarm import SwarmOrchestrator
    orch = SwarmOrchestrator()
    orch.start()
    session = orch.goal("Write a Python function that sorts a list of dicts by key")
    orch.stop()
"""

from __future__ import annotations

import json
import logging
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from .message_bus import Message, MessageBus
from .worker_pool import WorkerPool
from .goal_loop import GoalLoop, GoalSession
from .trust_mode import TrustMode
from .error_recovery import ErrorRecovery

logger = logging.getLogger("swarm.orchestrator")


class SwarmOrchestrator:
    """
    Top-level orchestrator for the Shay Agent OS swarm.
    """

    def __init__(
        self,
        redis_host: str = "localhost",
        redis_port: int = 6379,
        num_workers: int = 3,
        goal_budget: int = 20,
        log_level: str = "INFO",
    ):
        self._setup_logging(log_level)

        self.message_bus = MessageBus(redis_host=redis_host, redis_port=redis_port)
        self.worker_pool = WorkerPool(num_workers=num_workers)
        self.goal_loop = GoalLoop(
            worker_pool=self.worker_pool,
            message_bus=self.message_bus,
            budget=goal_budget,
        )
        self.trust_mode = TrustMode()
        self.error_recovery = ErrorRecovery(
            worker_pool=self.worker_pool,
            message_bus=self.message_bus,
        )

        self._started = False
        logger.info("SwarmOrchestrator initialized")

    def _setup_logging(self, level: str) -> None:
        logging.basicConfig(
            level=getattr(logging, level.upper(), logging.INFO),
            format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
            handlers=[
                logging.StreamHandler(sys.stdout),
            ],
        )

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def start(self) -> None:
        """Start all subsystems."""
        if self._started:
            return
        self.worker_pool.start()
        self.worker_pool.spawn_workers()
        self._started = True
        logger.info("SwarmOrchestrator started")

        # Subscribe to error channel for proactive recovery
        self.message_bus.subscribe("errors", self._on_error_message)

    def stop(self) -> None:
        """Graceful shutdown."""
        if not self._started:
            return
        self.worker_pool.stop()
        self.message_bus.close()
        self._started = False
        logger.info("SwarmOrchestrator stopped")

    # ------------------------------------------------------------------
    # Goal execution
    # ------------------------------------------------------------------

    def goal(self, description: str, session_id: Optional[str] = None) -> GoalSession:
        """
        Execute a goal end-to-end (blocking).
        Checks trust mode before executing.
        """
        trust_check = self.trust_mode.check(description)
        if not trust_check["allowed"]:
            logger.warning(f"Goal blocked by trust mode: {trust_check['reason']}")
            # Create a fake failed session
            from .goal_loop import GoalSession, GoalStatus
            sid = session_id or f"goal-denied-{int(time.time()*1000)}"
            session = GoalSession(
                id=sid,
                original_goal=description,
                status=GoalStatus.FAILED,
            )
            session.final_result = f"TRUST_DENIED: {trust_check['reason']}"
            return session

        logger.info(f"Goal approved by trust mode ({self.trust_mode.get_level()})")
        session = self.goal_loop.run(description, session_id)

        # Log completion
        if self.trust_mode.config.notify_after:
            logger.info(f"Goal session {session.id} finished with status={session.status}")

        return session

    def goal_async(self, description: str, session_id: Optional[str] = None) -> GoalSession:
        """Start a goal session (non-blocking, returns session for polling)."""
        trust_check = self.trust_mode.check(description)
        if not trust_check["allowed"]:
            sid = session_id or f"goal-denied-{int(time.time()*1000)}"
            from .goal_loop import GoalSession, GoalStatus
            session = GoalSession(
                id=sid,
                original_goal=description,
                status=GoalStatus.FAILED,
            )
            session.final_result = f"TRUST_DENIED: {trust_check['reason']}"
            return session

        return self.goal_loop.start(description, session_id)

    def step_session(self, session: GoalSession) -> None:
        """Advance an async session by one step."""
        self.goal_loop.step(session)

    # ------------------------------------------------------------------
    # Direct worker tasks
    # ------------------------------------------------------------------

    def ask(
        self,
        prompt: str,
        model_tier: str = "simple",
        timeout: float = 60.0,
    ) -> str:
        """Direct synchronous query to a worker."""
        tid = self.worker_pool.submit(prompt=prompt, model_tier=model_tier, timeout=timeout)
        task = self.worker_pool.wait(tid)
        if task and task.status.name == "COMPLETED":
            return task.result or ""
        return f"ERROR: {task.error if task else 'timeout'}"

    # ------------------------------------------------------------------
    # Error handling
    # ------------------------------------------------------------------

    def _on_error_message(self, msg: Message) -> None:
        """Callback for error channel messages."""
        if msg.topic == "task.failed":
            task_id = msg.payload.get("task_id")
            task = self.worker_pool.get_task(task_id)
            if task:
                self.error_recovery.handle(task)

    # ------------------------------------------------------------------
    # Health & status
    # ------------------------------------------------------------------

    def health(self) -> Dict[str, Any]:
        return {
            "started": self._started,
            "trust_level": self.trust_mode.get_level(),
            "message_bus": self.message_bus.health(),
            "worker_pool": self.worker_pool.health(),
            "active_goals": len([s for s in self.goal_loop.list_sessions() if s.status == "active"]),
            "total_goals": len(self.goal_loop.list_sessions()),
            "failures": len(self.error_recovery.get_failures(limit=1000)),
            "upgrade_opportunities": self.error_recovery.get_upgrade_opportunities(),
        }

    def status_report(self) -> str:
        h = self.health()
        lines = [
            "=== Swarm Orchestrator Status ===",
            f"Started: {h['started']}",
            f"Trust Level: {h['trust_level']}",
            f"Redis Connected: {h['message_bus']['connected']}",
            f"Workers: {len(h['worker_pool']['workers'])}",
            f"Ollama Reachable: {h['worker_pool']['ollama_reachable']}",
            f"Pending Tasks: {h['worker_pool']['pending_tasks']}",
            f"Active Goals: {h['active_goals']}",
            f"Total Goals: {h['total_goals']}",
            f"Recent Failures: {h['failures']}",
        ]
        if h['upgrade_opportunities']:
            lines.append("Upgrade Opportunities:")
            for opp in h['upgrade_opportunities']:
                lines.append(f"  - [{opp['priority']}] {opp['type']}: {opp['reason']}")
        return "\n".join(lines)
