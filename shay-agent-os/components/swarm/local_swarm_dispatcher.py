"""
local_swarm_dispatcher.py — Phase 2: LocalSwarmDispatcher.

Wraps the Phase 1 WorkerPool + BrainChain behind the Dispatcher protocol.
This is the default implementation — it uses local Ollama workers for
medium/complex tasks and routes judge/synth calls through BrainChain
(Claude → OpenRouter → Gemini → Ollama fallback).

No new infrastructure required. Works on a laptop with Ollama running.
"""
from __future__ import annotations

import json
import logging
import time
import uuid
from typing import Any, Dict, List, Optional

from .brain_client import BrainChain, BrainAvailabilityCheck
from .dispatcher import Dispatcher, DispatchTask, DispatchResult
from .worker_pool import WorkerPool, TaskPriority

logger = logging.getLogger("swarm.local_dispatcher")


class LocalSwarmDispatcher(Dispatcher):
    """
    Dispatcher backed by the Phase 1 WorkerPool + BrainChain.

    Routing:
      task.brain == "auto"    → tries Claude → OpenRouter → Gemini → Ollama
      task.brain == "claude"  → prefers Claude, falls back as normal
      task.brain == "ollama"  → forces Ollama (no cloud cost)
      task.tier  == "complex" → submits to WorkerPool (hermes3 local)
                                unless brain forces a cloud path

    Checkpoint: simple JSONL of completed results (no durability guarantee
    across process crash — that's AsyncioDispatcher's job in Phase 3).
    """

    def __init__(
        self,
        worker_pool: WorkerPool,
        policy: Optional[Dict[str, Any]] = None,
    ):
        self.worker_pool = worker_pool
        self.policy = policy or {}
        self._brain = BrainChain(preferred=self.policy.get("judge_brain", "claude"))
        self._availability = BrainAvailabilityCheck(self._brain)
        self._completed: List[DispatchResult] = []
        logger.info(f"LocalSwarmDispatcher ready. Policy: {self.policy.get('name', 'default')}")

    # ------------------------------------------------------------------
    # Dispatcher protocol
    # ------------------------------------------------------------------

    def fan_out(self, tasks: List[DispatchTask]) -> List[DispatchResult]:
        """Dispatch all tasks and return results in order."""
        if not tasks:
            return []
        results_by_id: Dict[str, DispatchResult] = {}
        cloud_tasks = []
        pool_tasks = []

        # Route: cloud brain tasks go direct; everything else via WorkerPool
        for task in tasks:
            if self._should_use_cloud(task):
                cloud_tasks.append(task)
            else:
                pool_tasks.append(task)

        # Execute cloud tasks (sequential for now — Phase 3 makes them truly parallel)
        for task in cloud_tasks:
            result = self._call_cloud(task)
            results_by_id[task.id] = result
            self._completed.append(result)

        # Submit all WorkerPool tasks, then collect
        pool_task_ids: Dict[str, str] = {}
        for task in pool_tasks:
            tid = self.worker_pool.submit(
                prompt=task.prompt,
                model_tier=task.tier,
                priority=TaskPriority.NORMAL,
                timeout=task.timeout,
                context=task.context,
            )
            pool_task_ids[task.id] = tid

        for task in pool_tasks:
            wtask = self.worker_pool.wait(pool_task_ids[task.id], max_wait=task.timeout + 10)
            if wtask and wtask.status.name == "COMPLETED":
                result = DispatchResult(
                    task_id=task.id,
                    status="completed",
                    output=wtask.result,
                    brain_used="ollama",
                    elapsed=float((wtask.finished_at or 0) - (wtask.started_at or 0)),
                )
            else:
                result = DispatchResult(
                    task_id=task.id,
                    status="failed",
                    error=wtask.error if wtask else "timeout",
                    brain_used="ollama",
                )
            results_by_id[task.id] = result
            self._completed.append(result)

        # Return in original task order
        return [results_by_id[t.id] for t in tasks]

    def export_checkpoint(self) -> str:
        """JSONL of all completed results (resumable state)."""
        lines = [json.dumps({
            "task_id": r.task_id,
            "status": r.status,
            "output": r.output,
            "error": r.error,
            "brain_used": r.brain_used,
        }) for r in self._completed]
        return "\n".join(lines)

    def import_checkpoint(self, jsonl: str) -> None:
        """Restore completed results from JSONL checkpoint."""
        self._completed = []
        for line in jsonl.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                d = json.loads(line)
                self._completed.append(DispatchResult(**d))
            except Exception as exc:
                logger.warning(f"Skipping malformed checkpoint line: {exc}")
        logger.info(f"Loaded {len(self._completed)} results from checkpoint")

    def health(self) -> Dict[str, Any]:
        pool_health = self.worker_pool.health()
        return {
            "dispatcher": "LocalSwarmDispatcher",
            "policy": self.policy.get("name", "default"),
            "brains_available": self._availability.available,
            "preferred_brain": self._brain.preferred,
            "worker_pool": {
                "workers": len(pool_health.get("workers", [])),
                "ollama_reachable": pool_health.get("ollama_reachable"),
                "pending_tasks": pool_health.get("pending_tasks", 0),
            },
            "completed_tasks": len(self._completed),
        }

    # ------------------------------------------------------------------
    # Internal routing
    # ------------------------------------------------------------------

    def _should_use_cloud(self, task: DispatchTask) -> bool:
        """Use cloud brain for a task if the policy or task.brain says so."""
        cloud_brains = {"claude", "openrouter", "gemini", "auto"}
        if task.brain in cloud_brains:
            return True
        policy_judge_brain = self.policy.get("judge_brain", "claude")
        if policy_judge_brain != "ollama" and task.tier == "complex":
            return True
        return False

    def _call_cloud(self, task: DispatchTask) -> DispatchResult:
        preferred = None if task.brain == "auto" else task.brain
        task_family = str(task.context.get("task_family") or "").strip() or None
        brain = BrainChain(preferred=preferred or self._brain.preferred, task_family=task_family)
        t0 = time.time()
        try:
            output = brain.call_prompt(task.prompt, timeout=task.timeout)
            return DispatchResult(
                task_id=task.id,
                status="completed",
                output=output,
                brain_used=brain.last_brain,
                elapsed=time.time() - t0,
            )
        except Exception as exc:
            return DispatchResult(
                task_id=task.id,
                status="failed",
                error=str(exc),
                elapsed=time.time() - t0,
            )
