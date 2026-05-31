"""
error_recovery.py — When a worker fails, retry with exponential backoff.

If still failing, escalate to orchestrator.
Log all failures as upgrade opportunities.
"""

from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional

from .message_bus import Message, MessageBus
from .worker_pool import Task, TaskPriority, TaskStatus, WorkerPool

logger = logging.getLogger("swarm.error_recovery")


class RecoveryStrategy(Enum):
    RETRY_SAME_WORKER = "retry_same"
    RETRY_DIFFERENT_TIER = "retry_different_tier"
    ESCALATE_TO_ORCHESTRATOR = "escalate"
    GIVE_UP = "give_up"


@dataclass
class FailureRecord:
    task_id: str
    error: str
    worker_id: Optional[str]
    model_tier: str
    timestamp: float = field(default_factory=time.time)
    attempt: int = 1
    strategy: str = ""
    resolved: bool = False
    resolution: str = ""


class ErrorRecovery:
    """
    Handles worker failures with retry, escalation, and logging.
    """

    def __init__(
        self,
        worker_pool: WorkerPool,
        message_bus: Optional[MessageBus] = None,
        max_retries: int = 3,
        base_delay: float = 2.0,
        max_delay: float = 60.0,
        escalation_threshold: int = 3,
    ):
        self.worker_pool = worker_pool
        self.message_bus = message_bus
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.escalation_threshold = escalation_threshold
        self._failures: List[FailureRecord] = []
        self._recovery_callbacks: List[Callable[[FailureRecord], None]] = []
        self._lock = False  # simple flag, not threading.Lock for this design

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def handle(self, task: Task) -> Optional[str]:
        """
        Handle a failed task. Returns new task ID if retried, None if given up.
        """
        if task.status not in (TaskStatus.FAILED, TaskStatus.TIMEOUT):
            return None

        record = FailureRecord(
            task_id=task.id,
            error=task.error or "unknown",
            worker_id=task.worker_id,
            model_tier=task.model_tier,
            attempt=task.attempt,
        )
        self._failures.append(record)

        logger.warning(
            f"Handling failure for task {task.id} "
            f"(attempt {task.attempt}/{self.max_retries}, error: {record.error[:100]})"
        )

        if self.message_bus:
            self.message_bus.publish("errors", Message(
                topic="task.failed",
                payload={
                    "task_id": task.id,
                    "error": record.error,
                    "attempt": task.attempt,
                    "worker_id": task.worker_id,
                },
                sender="error_recovery",
            ))

        if task.attempt >= self.max_retries:
            record.strategy = RecoveryStrategy.ESCALATE_TO_ORCHESTRATOR.value
            record.resolved = False
            self._escalate(record)
            return None

        # Decide strategy
        strategy = self._choose_strategy(task)
        record.strategy = strategy.value

        if strategy == RecoveryStrategy.RETRY_SAME_WORKER:
            return self._retry(task, same_tier=True, record=record)
        elif strategy == RecoveryStrategy.RETRY_DIFFERENT_TIER:
            return self._retry(task, same_tier=False, record=record)
        elif strategy == RecoveryStrategy.ESCALATE_TO_ORCHESTRATOR:
            self._escalate(record)
            return None
        else:
            record.resolved = False
            record.resolution = "gave_up"
            logger.error(f"Giving up on task {task.id} after {task.attempt} attempts")
            return None

    def on_recovery(self, callback: Callable[[FailureRecord], None]) -> None:
        """Register a callback for failure events."""
        self._recovery_callbacks.append(callback)

    def get_failures(
        self,
        resolved_only: Optional[bool] = None,
        limit: int = 100,
    ) -> List[FailureRecord]:
        """Get failure records, optionally filtered."""
        records = self._failures
        if resolved_only is not None:
            records = [r for r in records if r.resolved == resolved_only]
        return records[-limit:]

    def get_upgrade_opportunities(self) -> List[Dict[str, Any]]:
        """
        Analyze failures and suggest system upgrades.
        Returns list of suggestions.
        """
        suggestions = []
        tier_counts: Dict[str, int] = {}
        error_patterns: Dict[str, int] = {}

        for f in self._failures:
            if not f.resolved:
                tier_counts[f.model_tier] = tier_counts.get(f.model_tier, 0) + 1
                # Simple pattern extraction
                err = f.error.lower()
                if "timeout" in err:
                    error_patterns["timeout"] = error_patterns.get("timeout", 0) + 1
                elif "connection" in err:
                    error_patterns["connection"] = error_patterns.get("connection", 0) + 1
                elif "memory" in err or "oom" in err:
                    error_patterns["memory"] = error_patterns.get("memory", 0) + 1
                else:
                    error_patterns["other"] = error_patterns.get("other", 0) + 1

        if error_patterns.get("timeout", 0) >= 3:
            suggestions.append({
                "type": "increase_timeout",
                "reason": f"{error_patterns['timeout']} timeout failures detected",
                "priority": "high",
            })

        if error_patterns.get("connection", 0) >= 3:
            suggestions.append({
                "type": "check_ollama_health",
                "reason": f"{error_patterns['connection']} connection failures detected",
                "priority": "critical",
            })

        if tier_counts.get("simple", 0) >= 5:
            suggestions.append({
                "type": "upgrade_model_tier",
                "reason": f"{tier_counts['simple']} failures on simple tier — consider using medium tier",
                "priority": "medium",
            })

        if not suggestions and self._failures:
            suggestions.append({
                "type": "review_failures",
                "reason": f"{len(self._failures)} total failures, no clear pattern",
                "priority": "low",
            })

        return suggestions

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _choose_strategy(self, task: Task) -> RecoveryStrategy:
        """Pick a recovery strategy based on failure history."""
        if task.attempt >= self.escalation_threshold:
            return RecoveryStrategy.ESCALATE_TO_ORCHESTRATOR

        # If same tier failed twice, try different tier
        same_tier_fails = sum(
            1 for f in self._failures
            if f.task_id == task.id and f.model_tier == task.model_tier
        )
        if same_tier_fails >= 2:
            return RecoveryStrategy.RETRY_DIFFERENT_TIER

        return RecoveryStrategy.RETRY_SAME_WORKER

    def _retry(self, task: Task, same_tier: bool, record: FailureRecord) -> Optional[str]:
        """Retry a task with exponential backoff."""
        delay = min(self.base_delay * (2 ** (task.attempt - 1)), self.max_delay)
        logger.info(f"Retrying task {task.id} in {delay}s (attempt {task.attempt + 1})")
        time.sleep(delay)

        new_tier = task.model_tier
        if not same_tier:
            tier_map = {"simple": "medium", "medium": "complex", "complex": "complex"}
            new_tier = tier_map.get(task.model_tier, "complex")
            logger.info(f"Upgrading task {task.id} from {task.model_tier} to {new_tier}")

        new_task_id = self.worker_pool.submit(
            prompt=task.prompt,
            model_tier=new_tier,
            priority=TaskPriority.HIGH,
            timeout=task.timeout * 1.5,  # increase timeout on retry
            max_retries=task.max_retries,
            context={**task.context, "retry_of": task.id, "attempt": task.attempt + 1},
        )

        record.resolved = True
        record.resolution = f"retried_as_{new_task_id}"
        logger.info(f"Task {task.id} retried as {new_task_id}")

        # Fire callbacks
        for cb in self._recovery_callbacks:
            try:
                cb(record)
            except Exception as exc:
                logger.error(f"Recovery callback error: {exc}")

        return new_task_id

    def _escalate(self, record: FailureRecord) -> None:
        """Escalate to orchestrator via message bus."""
        logger.error(f"ESCALATION: Task {record.task_id} failed after {record.attempt} attempts")
        if self.message_bus:
            self.message_bus.publish("errors", Message(
                topic="task.escalated",
                payload={
                    "task_id": record.task_id,
                    "error": record.error,
                    "attempts": record.attempt,
                    "strategy": record.strategy,
                },
                sender="error_recovery",
            ))
        for cb in self._recovery_callbacks:
            try:
                cb(record)
            except Exception as exc:
                logger.error(f"Escalation callback error: {exc}")

    def export_failures(self, path: str) -> None:
        """Export failure log to JSON for analysis."""
        data = [
            {
                "task_id": f.task_id,
                "error": f.error,
                "worker_id": f.worker_id,
                "model_tier": f.model_tier,
                "timestamp": f.timestamp,
                "attempt": f.attempt,
                "strategy": f.strategy,
                "resolved": f.resolved,
                "resolution": f.resolution,
            }
            for f in self._failures
        ]
        with open(path, "w") as f:
            json.dump(data, f, indent=2, default=str)
        logger.info(f"Exported {len(data)} failures to {path}")
