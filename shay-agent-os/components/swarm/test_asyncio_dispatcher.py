#!/usr/bin/env python3
"""
test_asyncio_dispatcher.py — B2: AsyncioDispatcher real parallel fan_out.

Proves the fan-out is concurrent (not serial) without any network calls, by
overriding the per-task worker with a fixed-sleep fake and asserting wall-clock
is close to a single task's duration rather than N * duration. Also asserts
result order is preserved and the semaphore bounds concurrency.
"""

import sys
import threading
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent.parent))

from swarm import AsyncioDispatcher, DispatchTask, DispatchResult


class _FakeDispatcher(AsyncioDispatcher):
    """Replaces the real brain call with a fixed sleep so timing is the proof."""

    SLEEP = 0.3

    def __init__(self, *a, **kw):
        super().__init__(*a, **kw)
        self._in_flight = 0
        self._max_in_flight = 0
        self._lock = threading.Lock()

    def _run_one(self, task: DispatchTask) -> DispatchResult:
        with self._lock:
            self._in_flight += 1
            self._max_in_flight = max(self._max_in_flight, self._in_flight)
        try:
            time.sleep(self.SLEEP)
            return DispatchResult(
                task_id=task.id, status="completed",
                output=f"done:{task.id}", brain_used="fake",
            )
        finally:
            with self._lock:
                self._in_flight -= 1


def test_fan_out_runs_concurrently():
    n = 8
    d = _FakeDispatcher(max_concurrency=8)
    tasks = [DispatchTask(id=f"t{i}", prompt="x") for i in range(n)]

    t0 = time.time()
    results = d.fan_out(tasks)
    elapsed = time.time() - t0

    # Serial would be n * SLEEP = 2.4s; concurrent should be ~SLEEP (0.3s).
    serial = n * _FakeDispatcher.SLEEP
    assert elapsed < serial / 2, (
        f"fan_out looks serial: {elapsed:.2f}s vs serial {serial:.2f}s"
    )
    assert d._max_in_flight > 1, "no concurrency observed"
    assert all(r.status == "completed" for r in results)


def test_result_order_preserved():
    d = _FakeDispatcher(max_concurrency=4)
    tasks = [DispatchTask(id=f"t{i}", prompt="x") for i in range(6)]
    results = d.fan_out(tasks)
    assert [r.task_id for r in results] == [t.id for t in tasks]


def test_semaphore_bounds_concurrency():
    d = _FakeDispatcher(max_concurrency=3)
    tasks = [DispatchTask(id=f"t{i}", prompt="x") for i in range(9)]
    d.fan_out(tasks)
    assert d._max_in_flight <= 3, (
        f"concurrency {d._max_in_flight} exceeded bound 3"
    )
    assert d._max_in_flight >= 2, "expected real overlap under the bound"


def test_empty_fan_out():
    d = _FakeDispatcher()
    assert d.fan_out([]) == []


if __name__ == "__main__":
    test_fan_out_runs_concurrently()
    test_result_order_preserved()
    test_semaphore_bounds_concurrency()
    test_empty_fan_out()
    print("B2 asyncio-dispatcher concurrency tests passed")
