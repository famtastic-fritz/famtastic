#!/usr/bin/env python3
"""ORCHESTRATOR — the self-managing supervisor.

Responsibilities:
  • runs its OWN in-process scheduler (min-heap of jobs) — never the system cron
  • reads the task queue and decides how many/what workers are needed
  • MINTS new worker agents from templates/worker_template.py (programmatic)
  • spawns them as subprocesses, monitors them, reaps finished ones
  • retires idle workers (workers self-retire; orchestrator confirms + logs)
  • adapts its own scheduling cadence to queue depth
  • runs a self-improvement pass per batch that tunes config (bounded)
  • logs EVERY decision to logs/ORCHESTRATOR.log

Modes:
  --demo    bounded run: drain the seeded queue, ≥1 improvement pass, then exit
  --daemon  run forever (clean shutdown on SIGINT/SIGTERM)
"""
from __future__ import annotations

import heapq
import signal
import subprocess
import sys
import time
from pathlib import Path

import dashboard
import improve
import queue as q
from common import (AGENTS_DIR, TEMPLATES_DIR, load_config, now_iso, olog)

SPECIALTIES = ["generalist", "triage-specialist", "longform-writer"]


class Orchestrator:
    def __init__(self, mode: str = "demo", max_runtime: int = 180):
        self.mode = mode
        self.max_runtime = max_runtime
        self.batch_id = time.strftime("batch-%Y%m%d-%H%M%S")
        self.procs: dict[str, subprocess.Popen] = {}
        self.minted = 0
        self.running = True
        self.improved_batches = 0
        self.peak_depth = 0
        self._last_decision = None
        self.heap: list = []  # (next_run_ts, seq, job_name, interval)
        self._seq = 0
        self._last_tick_interval = None
        q.init_db()

    # ---- scheduler ------------------------------------------------------
    def schedule(self, job_name: str, interval: float, *, delay: float | None = None):
        """Re-arm a job. Fires after `delay` if given, else after `interval`."""
        self._seq += 1
        when = time.time() + (delay if delay is not None else interval)
        heapq.heappush(self.heap, (when, self._seq, job_name, interval))

    def _adaptive_tick(self) -> float:
        """Cadence follows queue depth: deep queue → tick faster."""
        cfg = load_config()
        base = cfg["tunables"]["scheduler_tick_seconds"]
        depth = q.queue_depth()
        if depth >= 6:
            tick = max(1, base / 2)
        elif depth >= 1:
            tick = base
        else:
            tick = base * 1.5
        if tick != self._last_tick_interval:
            olog(f"cadence: queue_depth={depth} → scheduler tick = {tick:.1f}s")
            self._last_tick_interval = tick
        return tick

    # ---- worker lifecycle ----------------------------------------------
    def desired_workers(self) -> int:
        cfg = load_config()
        depth = q.queue_depth()
        tier_workers = 0
        for tier in cfg["scaling"]["tiers"]:
            if depth >= tier["queue_at_least"]:
                tier_workers = tier["workers"]
        return min(tier_workers, cfg["tunables"]["max_workers"])

    def live_workers(self) -> int:
        self.reap()
        return len(self.procs)

    def mint_worker(self) -> Path:
        """Create a brand-new worker agent file from the template."""
        self.minted += 1
        worker_id = f"{self.batch_id}-w{self.minted}"
        specialty = SPECIALTIES[(self.minted - 1) % len(SPECIALTIES)]
        template = (TEMPLATES_DIR / "worker_template.py").read_text()
        code = template.replace("__WORKER_ID__", worker_id).replace("__SPECIALTY__", specialty)
        agent_file = AGENTS_DIR / f"worker_{worker_id}.py"
        agent_file.write_text(code)
        olog(f"MINTED new worker agent '{worker_id}' (specialty={specialty}) → "
             f"{agent_file.relative_to(agent_file.parents[1])}")
        return worker_id, agent_file

    def spawn_worker(self):
        worker_id, agent_file = self.mint_worker()
        proc = subprocess.Popen(
            [sys.executable, str(agent_file), self.batch_id],
            stdout=sys.stdout, stderr=sys.stderr,
        )
        self.procs[worker_id] = proc
        olog(f"SPAWNED worker '{worker_id}' as pid {proc.pid}")

    def reap(self):
        for wid in list(self.procs):
            p = self.procs[wid]
            if p.poll() is not None:
                olog(f"REAPED worker '{wid}' (pid {p.pid}, exit={p.returncode}) — retired")
                del self.procs[wid]

    def supervise(self):
        """The core decision: scale workers to demand, capped by config."""
        self.reap()
        depth = q.queue_depth()
        self.peak_depth = max(self.peak_depth, depth)
        live = len(self.procs)
        desired = self.desired_workers()
        if depth > 0 and live < desired:
            need = desired - live
            olog(f"DECISION: queue_depth={depth}, live_workers={live}, desired={desired} "
                 f"→ spawning {need} worker(s)")
            for _ in range(need):
                self.spawn_worker()
        elif depth == 0 and live > 0:
            msg = f"DECISION: queue empty, {live} worker(s) draining → self-retire on idle"
            if msg != self._last_decision:
                olog(msg)
                self._last_decision = msg
        # re-arm tick with adaptive cadence
        self.schedule("supervise", self._adaptive_tick())

    def refresh_dashboard(self):
        dashboard.render()
        self.schedule("dashboard", 2.0)

    def maybe_improve(self) -> bool:
        """Run a self-improvement pass once the batch has fully drained."""
        if q.queue_depth() == 0 and len(self.procs) == 0:
            olog(f"batch '{self.batch_id}' drained (peak queue depth {self.peak_depth}) "
                 f"→ running self-improvement pass")
            improve.review_and_tune(self.batch_id, peak_depth=self.peak_depth)
            self.improved_batches += 1
            self.peak_depth = 0
            return True
        return False

    # ---- run loops ------------------------------------------------------
    def run(self):
        olog(f"orchestrator starting (mode={self.mode}, batch={self.batch_id})")
        olog(f"seeded queue depth at start: {q.queue_depth()}")
        self.schedule("supervise", 0, delay=0)
        self.schedule("dashboard", 0, delay=0.5)
        start = time.time()

        while self.running:
            if not self.heap:
                break
            next_run, _, job, interval = self.heap[0]
            now = time.time()
            if now < next_run:
                time.sleep(min(0.25, next_run - now))
                continue
            heapq.heappop(self.heap)
            if job == "supervise":
                self.supervise()
            elif job == "dashboard":
                self.refresh_dashboard()

            # demo termination: queue drained, workers gone, improved once.
            if self.mode == "demo":
                if self.maybe_improve():
                    self.refresh_dashboard()
                    olog("demo batch complete — orchestrator shutting down cleanly")
                    break
            if time.time() - start > self.max_runtime:
                olog(f"max_runtime {self.max_runtime}s hit → stopping")
                break

        self.shutdown()

    def shutdown(self):
        for wid, p in self.procs.items():
            if p.poll() is None:
                p.terminate()
                olog(f"terminated lingering worker '{wid}' on shutdown")
        print(dashboard.render())
        olog("orchestrator stopped.")


def main():
    mode = "daemon" if "--daemon" in sys.argv else "demo"
    orch = Orchestrator(mode=mode)

    def _sig(_signum, _frame):
        olog("signal received → graceful shutdown")
        orch.running = False
    signal.signal(signal.SIGINT, _sig)
    signal.signal(signal.SIGTERM, _sig)

    if mode == "daemon":
        # daemon mode loops batches forever; self-improve between drains.
        olog("DAEMON mode: supervising indefinitely (ctrl-c to stop)")
        while orch.running:
            orch.run()
            if orch.running:
                time.sleep(2)
                orch.batch_id = time.strftime("batch-%Y%m%d-%H%M%S")
    else:
        orch.run()


if __name__ == "__main__":
    main()
