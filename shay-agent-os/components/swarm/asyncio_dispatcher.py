"""
asyncio_dispatcher.py — Phase 2: AsyncioDispatcher stub.

Interface-complete stub that satisfies the Dispatcher protocol today.
Grows into a production-grade semaphore-bounded asyncio + Redis Streams
substrate if/when LocalSwarmDispatcher's single-threaded fan_out becomes
a bottleneck.

Per the Phase 2 honest framing (v3.1 plan §7.5):
  "The escape hatch is therefore: (a) zero days of pattern/orchestrator
  rewrites because the Dispatcher protocol is honored from day one,
  (b) ~two weeks of dispatcher-substrate work if and only if the
  LocalSwarmDispatcher degradation triggers fire."

Trigger conditions (from plan §7.7):
  - fan_out wall-clock > 2× LocalSwarmDispatcher on identical task set
  - checkpoint round-trip fails a crash-recovery test
  - Ollama queue saturation > 80% on a 20-task fan-out

Until those trigger, use LocalSwarmDispatcher.
"""
from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import Any, Dict, List, Optional

from .brain_client import BrainChain
from .dispatcher import Dispatcher, DispatchTask, DispatchResult

logger = logging.getLogger("swarm.asyncio_dispatcher")

STUB_WARNING = (
    "AsyncioDispatcher is a Phase-2 stub. It satisfies the Dispatcher protocol "
    "but delegates to BrainChain sequentially. Redis Streams persistence and "
    "true async fan-out are deferred — promote this stub if LocalSwarmDispatcher "
    "triggers the degradation conditions in plan §7.7."
)


class AsyncioDispatcher(Dispatcher):
    """
    Stub implementation. Satisfies the Dispatcher protocol so patterns and
    pipelines can be authored against it today. Promotes to full async fan-out
    when the trigger fires.
    """

    def __init__(
        self,
        max_concurrency: int = 8,
        preferred_brain: str = "claude",
        policy: Optional[Dict[str, Any]] = None,
    ):
        logger.warning(STUB_WARNING)
        self.max_concurrency = max_concurrency
        self._brain = BrainChain(preferred=preferred_brain)
        self.policy = policy or {}
        self._completed: List[DispatchResult] = []

    def fan_out(self, tasks: List[DispatchTask]) -> List[DispatchResult]:
        """
        Stub: runs tasks sequentially through BrainChain.
        Production path: asyncio.gather() with semaphore bounded at max_concurrency.
        """
        results = []
        for task in tasks:
            t0 = time.time()
            try:
                output = self._brain.call_prompt(task.prompt, timeout=task.timeout)
                r = DispatchResult(
                    task_id=task.id,
                    status="completed",
                    output=output,
                    brain_used=self._brain.last_brain,
                    elapsed=time.time() - t0,
                )
            except Exception as exc:
                r = DispatchResult(
                    task_id=task.id,
                    status="failed",
                    error=str(exc),
                    elapsed=time.time() - t0,
                )
            results.append(r)
            self._completed.append(r)
        return results

    def export_checkpoint(self) -> str:
        return "\n".join(json.dumps({
            "task_id": r.task_id, "status": r.status,
            "output": r.output, "error": r.error, "brain_used": r.brain_used,
        }) for r in self._completed)

    def import_checkpoint(self, jsonl: str) -> None:
        self._completed = []
        for line in jsonl.splitlines():
            if line.strip():
                try:
                    self._completed.append(DispatchResult(**json.loads(line)))
                except Exception:
                    pass

    def health(self) -> Dict[str, Any]:
        return {
            "dispatcher": "AsyncioDispatcher (stub)",
            "max_concurrency": self.max_concurrency,
            "note": "Sequential stub — promote when degradation triggers fire",
            "completed_tasks": len(self._completed),
        }
