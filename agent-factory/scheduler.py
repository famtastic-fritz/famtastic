"""scheduler.py — an IN-PROCESS recurring-job scheduler.

This is the factory's self-scheduling layer. It deliberately does NOT touch the
real OS crontab/launchd/systemd (SANDBOX.md rule 2). Jobs are plain callables
run on intervals from inside the orchestrator's own loop. When the orchestrator
stops, every schedule stops with it.

Cadence is adaptive: the orchestrator can call set_interval() to speed a job up
when the queue is deep and slow it down when the queue is shallow.
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Callable


@dataclass
class Job:
    name: str
    fn: Callable[[], None]
    interval_s: float
    next_due: float = 0.0
    runs: int = 0
    enabled: bool = True


@dataclass
class Scheduler:
    jobs: dict = field(default_factory=dict)

    def every(self, name: str, interval_s: float, fn: Callable[[], None]) -> None:
        self.jobs[name] = Job(name=name, fn=fn, interval_s=interval_s,
                              next_due=time.time())

    def set_interval(self, name: str, interval_s: float) -> None:
        if name in self.jobs:
            self.jobs[name].interval_s = max(0.1, interval_s)

    def enable(self, name: str, on: bool = True) -> None:
        if name in self.jobs:
            self.jobs[name].enabled = on

    def tick(self) -> list[str]:
        """Run any jobs whose time has come. Returns the names that fired."""
        now = time.time()
        fired = []
        for job in self.jobs.values():
            if not job.enabled or now < job.next_due:
                continue
            job.fn()
            job.runs += 1
            job.next_due = now + job.interval_s
            fired.append(job.name)
        return fired

    def status(self) -> list[dict]:
        now = time.time()
        return [
            {"name": j.name, "interval_s": round(j.interval_s, 2),
             "runs": j.runs, "due_in_s": round(max(0, j.next_due - now), 2),
             "enabled": j.enabled}
            for j in self.jobs.values()
        ]
