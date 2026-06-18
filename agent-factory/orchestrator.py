"""ORCHESTRATOR — the long-running supervisor.

Responsibilities:
  * Read the task queue and decide how many / what kind of workers are needed.
  * Mint worker agents from the template and spawn them as subprocesses.
  * Monitor them; requeue tasks whose worker died; retire idle workers.
  * Run an internal self-scheduler (adaptive cadence) — never the OS crontab.
  * Enforce the budget hard cap.
  * After each wave, trigger one self-improvement pass.
  * Log EVERY decision to logs/ORCHESTRATOR.log (and stdout).

Modes:
  python orchestrator.py --cycles 5      # bounded run (used by the proof)
  python orchestrator.py --daemon        # run until queue drained, then idle-exit
"""
from __future__ import annotations

import argparse
import datetime as _dt
import json
import subprocess
import sys
import time
from pathlib import Path

import dashboard
import queue_db
import router
import scheduler
import self_improve
from config_io import load_config
from factory_paths import (AGENTS_DIR, ORCHESTRATOR_LOG, WORKER_TEMPLATE,
                           assert_inside, rel)

WORKER_TIMEOUT_S = 90


class Orchestrator:
    def __init__(self) -> None:
        queue_db.init_db()
        self._wid = 0
        self.log("orchestrator_start", note="supervisor online", pid=__import__("os").getpid())

    # --- logging -----------------------------------------------------------
    def log(self, decision: str, **fields) -> None:
        entry = {
            "ts": _dt.datetime.now().isoformat(timespec="seconds"),
            "decision": decision,
            **fields,
        }
        assert_inside(ORCHESTRATOR_LOG)
        with ORCHESTRATOR_LOG.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(entry) + "\n")
        print(f"[orch] {decision}: " + ", ".join(f"{k}={v}" for k, v in fields.items()))

    # --- worker lifecycle --------------------------------------------------
    def mint_worker(self, specialty: str) -> tuple[str, Path]:
        """Create a concrete worker agent from the template (programmatic mint)."""
        self._wid += 1
        worker_id = f"w{self._wid:03d}"
        template = WORKER_TEMPLATE.read_text(encoding="utf-8")
        code = (
            template
            .replace("{{WORKER_ID}}", worker_id)
            .replace("{{MINTED_AT}}", _dt.datetime.now().isoformat(timespec="seconds"))
            .replace("{{SPECIALTY}}", specialty)
        )
        path = AGENTS_DIR / f"worker_{worker_id}.py"
        assert_inside(path)
        path.write_text(code, encoding="utf-8")
        self.log("mint_worker", worker_id=worker_id, specialty=specialty, file=rel(path))
        return worker_id, path

    def retire_worker(self, worker_id: str, path: Path, reason: str) -> None:
        try:
            if path.exists():
                path.unlink()
        except OSError:
            pass
        self.log("retire_worker", worker_id=worker_id, reason=reason)

    # --- decisions ---------------------------------------------------------
    def decide_concurrency(self, pending: int) -> int:
        cfg = load_config()
        cap = cfg["concurrency"]["current_max"]
        n = max(cfg["concurrency"]["min_workers"], min(cap, pending))
        idle_capacity = cap - n
        self.log(
            "decide_concurrency", pending=pending, concurrency_cap=cap,
            workers_to_spawn=n, idle_capacity_retired=idle_capacity,
        )
        return n

    def budget_ok(self) -> bool:
        cfg = load_config()
        spent = router.read_total_cost()
        cap = cfg["budget"]["hard_cap_usd"]
        if spent >= cap:
            self.log("budget_halt", spent_usd=spent, hard_cap_usd=cap)
            return False
        return True

    # --- one wave ----------------------------------------------------------
    def run_wave(self, wave: int) -> dict:
        requeued = queue_db.requeue_stale()
        if requeued:
            self.log("requeue_stale", count=requeued)

        pending = queue_db.pending_count()
        if pending == 0:
            self.log("wave_skip", wave=wave, reason="no pending tasks")
            return {"spawned": 0, "completed": 0, "failed": 0}

        if not self.budget_ok():
            return {"spawned": 0, "completed": 0, "failed": 0, "halted": True}

        n = self.decide_concurrency(pending)
        self.log("wave_start", wave=wave, pending=pending, spawning=n)

        procs = []  # (worker_id, path, task_id, Popen)
        for _ in range(n):
            worker_id, path = self.mint_worker(specialty="general")
            task = queue_db.claim_next(worker_id)
            if task is None:
                self.retire_worker(worker_id, path, reason="no task to claim")
                continue
            self.log("assign_task", worker_id=worker_id, task_id=task["id"],
                     task_type=task["type"], complexity=task["complexity"])
            proc = subprocess.Popen(
                [sys.executable, str(path), "--task-id", str(task["id"])],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
            )
            procs.append((worker_id, path, task["id"], proc))

        completed = failed = 0
        for worker_id, path, task_id, proc in procs:
            try:
                out, err = proc.communicate(timeout=WORKER_TIMEOUT_S)
            except subprocess.TimeoutExpired:
                proc.kill()
                out, err = proc.communicate()
                queue_db.fail_task(task_id, "worker timeout")
                self.log("worker_timeout", worker_id=worker_id, task_id=task_id)
                self.retire_worker(worker_id, path, reason="timeout")
                failed += 1
                continue

            result = None
            for line in (out or "").splitlines():
                line = line.strip()
                if line.startswith("{"):
                    try:
                        result = json.loads(line)
                    except json.JSONDecodeError:
                        pass
            if result and result.get("ok"):
                completed += 1
                self.log("worker_done", worker_id=worker_id, task_id=task_id,
                         model=result["model"], tier=result["tier"],
                         cost_usd=result["cost_usd"], mode=result["mode"],
                         deliverable=result["deliverable"])
            else:
                failed += 1
                self.log("worker_failed", worker_id=worker_id, task_id=task_id,
                         error=(result or {}).get("error", err.strip()[:200]))
            # one-shot worker: retire it now that its task is finished
            self.retire_worker(worker_id, path, reason="task complete (one-shot)")

        self.log("wave_end", wave=wave, completed=completed, failed=failed)
        return {"spawned": len(procs), "completed": completed, "failed": failed}

    # --- main loop ---------------------------------------------------------
    def run(self, cycles: int | None, daemon: bool) -> None:
        batch_id = queue_db.start_batch()
        wave = 0
        idle_strikes = 0
        while True:
            wave += 1
            result = self.run_wave(wave)

            # self-improvement after every wave (one pass per batch wave)
            findings = self_improve.run_pass(batch_label=f"wave-{wave}")
            self.log("self_improvement", wave=wave,
                     changes=len(findings["changes"]),
                     success_rate=findings["metrics"]["success_rate"],
                     cost_per_task=findings["metrics"]["cost_per_task_usd"])

            dashboard.write_html()  # refresh observability artifact

            pending = queue_db.pending_count()
            if pending == 0:
                idle_strikes += 1
            else:
                idle_strikes = 0

            # stop conditions
            if cycles is not None and wave >= cycles:
                self.log("loop_stop", reason="cycle limit reached", waves=wave)
                break
            if daemon and idle_strikes >= 2:
                self.log("loop_stop", reason="queue drained, idle", waves=wave)
                break
            if cycles is None and not daemon and pending == 0:
                self.log("loop_stop", reason="queue drained", waves=wave)
                break

            # adaptive, in-process scheduling decides the wait
            interval = scheduler.next_interval(pending)
            self.log("scheduler_tick", pending=pending, next_interval_s=interval)
            time.sleep(interval)

        summary = queue_db.metrics()
        queue_db.end_batch(batch_id, summary)
        self.log("orchestrator_stop", **{k: summary[k] for k in
                 ("done", "failed", "pending", "success_rate", "total_cost_usd")})


def main() -> int:
    ap = argparse.ArgumentParser(description="Agent Factory orchestrator")
    ap.add_argument("--cycles", type=int, default=None, help="bounded number of waves")
    ap.add_argument("--daemon", action="store_true", help="run until queue drained")
    args = ap.parse_args()
    Orchestrator().run(cycles=args.cycles, daemon=args.daemon)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
