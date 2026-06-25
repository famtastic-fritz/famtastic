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

B2: fan_out is now a REAL parallel fan-out — N tasks run concurrently under
an asyncio semaphore bounded at max_concurrency, instead of serially. Each
brain call is blocking urllib, so it runs in a worker thread via
asyncio.to_thread; the semaphore caps how many are in flight at once.
Redis Streams durability is still deferred (export/import remain in-memory
JSONL), but the throughput trigger from plan §7.7 is now addressed.
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

class AsyncioDispatcher(Dispatcher):
    """
    Real parallel dispatcher. Satisfies the Dispatcher protocol and runs N
    tasks concurrently under an asyncio semaphore bounded at max_concurrency.
    Redis Streams durability is still deferred (checkpoints are in-memory
    JSONL), but fan-out is no longer serial.
    """

    def __init__(
        self,
        max_concurrency: int = 8,
        preferred_brain: str = "claude",
        policy: Optional[Dict[str, Any]] = None,
    ):
        self.max_concurrency = max(1, int(max_concurrency))
        self._preferred_brain = preferred_brain
        self.policy = policy or {}
        self._completed: List[DispatchResult] = []

    def _run_one(self, task: DispatchTask) -> DispatchResult:
        """Execute a single task on its own BrainChain (thread-safe — each call
        gets a fresh chain so concurrent calls don't clobber last_brain)."""
        t0 = time.time()
        try:
            task_family = str(task.context.get("task_family") or "").strip() or None
            preferred = None if task.brain == "auto" else task.brain
            brain = BrainChain(preferred=preferred or self._preferred_brain, task_family=task_family)
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

    async def _fan_out_async(self, tasks: List[DispatchTask]) -> List[DispatchResult]:
        sem = asyncio.Semaphore(self.max_concurrency)

        async def _bounded(task: DispatchTask) -> DispatchResult:
            async with sem:
                # Blocking urllib brain call runs in a worker thread so the
                # event loop can keep up-to max_concurrency calls in flight.
                return await asyncio.to_thread(self._run_one, task)

        # gather preserves input order in its result list.
        return await asyncio.gather(*[_bounded(t) for t in tasks])

    def fan_out(self, tasks: List[DispatchTask]) -> List[DispatchResult]:
        """
        Dispatch all tasks CONCURRENTLY (semaphore-bounded at max_concurrency)
        and return results in the same order as the input tasks.
        """
        if not tasks:
            return []
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            # No loop running — normal synchronous caller path.
            results = asyncio.run(self._fan_out_async(tasks))
        else:
            # Called from inside an existing event loop — run the parallel
            # fan-out on a dedicated loop in a worker thread to avoid nesting.
            import concurrent.futures

            def _runner() -> List[DispatchResult]:
                return asyncio.run(self._fan_out_async(tasks))

            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as ex:
                results = ex.submit(_runner).result()
        self._completed.extend(results)
        return list(results)

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
            "dispatcher": "AsyncioDispatcher",
            "max_concurrency": self.max_concurrency,
            "note": "Parallel fan-out (asyncio semaphore + to_thread); "
                    "Redis Streams durability deferred",
            "completed_tasks": len(self._completed),
        }
