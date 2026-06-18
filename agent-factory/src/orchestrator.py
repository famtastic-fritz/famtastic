"""ORCHESTRATOR — the self-managing supervisor.

Responsibilities:
  * read the task queue and decide how many workers are needed (scaled to queue
    depth, capped by max_concurrency from config.json),
  * spawn worker agents as real OS subprocesses,
  * monitor them and retire (reap) finished/idle ones,
  * run an internal, sandbox-only scheduler that sets its own cadence,
  * after each batch, trigger the self-improvement pass.

Every decision is logged to logs/ORCHESTRATOR.log via src.log.

Run standalone (assumes tasks are already seeded):
    python3 -m src.orchestrator --max-batches 3
"""
import argparse
import json
import os
import subprocess
import sys
import time

from . import db, dashboard, improve, log, queue, scheduler

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG = os.path.join(ROOT, "config.json")


class Orchestrator:
    def __init__(self):
        self._counter = 0
        self._procs = {}  # agent_id -> (Popen, spawn_time)
        db.init()

    # --- config -----------------------------------------------------------
    def load_config(self):
        with open(CONFIG, encoding="utf-8") as fh:
            return json.load(fh)

    # --- worker lifecycle -------------------------------------------------
    def _spawn(self):
        self._counter += 1
        agent_id = f"w-{int(time.time())}-{self._counter}"
        proc = subprocess.Popen(
            [sys.executable, "-m", "src.worker", "--agent-id", agent_id],
            cwd=ROOT,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        self._procs[agent_id] = (proc, time.time())
        log.orch("spawn_worker", agent=agent_id, pid=proc.pid, fleet=len(self._procs))
        return agent_id

    def _reap(self, idle_retire_seconds):
        """Poll workers; retire finished ones and terminate stragglers. Return alive count."""
        alive = 0
        for agent_id, (proc, started) in list(self._procs.items()):
            ret = proc.poll()
            if ret is None:
                # Straggler guard: terminate a worker that runs absurdly long.
                if time.time() - started > max(idle_retire_seconds * 6, 60):
                    proc.terminate()
                    log.orch("retire_straggler", agent=agent_id, pid=proc.pid)
                    self._procs.pop(agent_id, None)
                else:
                    alive += 1
            else:
                log.orch("retire_worker", agent=agent_id, pid=proc.pid, exit=ret)
                self._procs.pop(agent_id, None)
        return alive

    # --- supervision ------------------------------------------------------
    def drain(self, cfg):
        """Spawn/monitor until the queue is empty and all workers have retired."""
        sched = cfg.get("scheduler", {})
        idle = cfg.get("idle_retire_seconds", 8)
        while True:
            depth = queue.depth()
            alive = self._reap(idle)
            if depth == 0 and alive == 0:
                break
            want = scheduler.desired_workers(depth, cfg["max_concurrency"])
            deficit = max(0, want - alive)
            if deficit:
                log.orch("scale_decision", queue_depth=depth, alive=alive,
                         want=want, spawning=deficit, max_concurrency=cfg["max_concurrency"])
            for _ in range(deficit):
                self._spawn()
            tick = scheduler.next_tick_seconds(depth, sched)
            # Keep the demo responsive: cap the actual sleep, but log the chosen cadence.
            log.orch("scheduler_tick", queue_depth=depth, next_tick_s=tick)
            time.sleep(min(tick, 0.25))

    def run_batch(self, batch_no):
        cfg = self.load_config()  # reload each batch so self-improvement tuning takes effect
        start_depth = queue.depth()
        log.orch("batch_start", batch=batch_no, queue_depth=start_depth,
                 max_concurrency=cfg["max_concurrency"],
                 escalate_threshold=cfg["routing"]["escalate_threshold"])
        self.drain(cfg)
        # Feed the batch's *starting* depth to the improver so it can judge whether
        # demand exceeded concurrency this batch (post-drain depth is always 0).
        m, adjustments = improve.improve(batch_no, start_depth)
        dashboard.write_html()
        log.orch("batch_end", batch=batch_no, processed=m["processed"],
                 success_rate=m["success_rate"], total_usd=f"{m['total_usd']:.6f}",
                 tasks_per_dollar=m["tasks_per_dollar"])
        return m, adjustments

    def run(self, max_batches=3):
        log.orch("orchestrator_start", pid=os.getpid(), max_batches=max_batches)
        ran = 0
        for batch_no in range(1, max_batches + 1):
            if queue.depth() == 0:
                log.orch("idle_no_work", batch=batch_no)
                break
            self.run_batch(batch_no)
            ran += 1
        log.orch("orchestrator_stop", batches_run=ran)
        return ran


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-batches", type=int, default=3)
    args = ap.parse_args()
    orch = Orchestrator()
    orch.run(max_batches=args.max_batches)
    dashboard.render_terminal()
