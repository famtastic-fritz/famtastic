"""orchestrator.py — the self-managing supervisor.

Responsibilities (the "self-management"):
  * Read the queue and decide HOW MANY workers to run (config.concurrency) and
    WHAT KINDS to mint (from the kinds of pending tasks).
  * Mint workers from the template on demand, spawn them as subprocesses, give
    each a claimed task, and monitor them to completion.
  * Retire finished workers; retire idle minted worker *kinds* no longer needed.
  * Run its own recurring jobs via the in-process scheduler (no OS cron).
  * After each batch, run the self-improvement pass and adopt the new config.
  * Log every decision to logs/ORCHESTRATOR.log and publish runtime state for
    the dashboard.

Modes:
  --demo            drain the current queue, prove ≥2 workers + 1 improvement
                    pass, write the dashboard, and exit.
  --serve           run forever: schedule-driven, adapts cadence to queue depth.
  --seed N          seed sample tasks (+N synthetic) before running.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
import uuid

import core
import factory
import scheduler as sched_mod
import seed_tasks
import self_improve
import task_queue
import dashboard


class Orchestrator:
    def __init__(self) -> None:
        core.ensure_dirs()
        task_queue.init_db()
        self.cfg = core.load_config()
        self.batch = 0
        self.active = {}          # worker_id -> {proc, task_id, kind, started}
        self.minted_kinds = set()
        self.sched = sched_mod.Scheduler()
        self.serving = True
        self._spawned_total = 0

    # --- config -------------------------------------------------------------
    def reload_cfg(self) -> None:
        """Adopt config the self-improvement loop may have rewritten."""
        self.cfg = core.load_config()

    # --- decisions ----------------------------------------------------------
    def decide_capacity(self) -> int:
        """How many workers should be running right now?"""
        counts = task_queue.counts()
        pending = counts["pending"]
        want = min(self.cfg["concurrency"], pending)
        free = want - len(self.active)
        core.orch_log("capacity decision", pending=pending,
                      concurrency=self.cfg["concurrency"],
                      active=len(self.active), spawn=max(0, free))
        return max(0, free)

    def ensure_worker_kind(self, kind: str) -> None:
        """Mint a worker module for `kind` if we don't already have one."""
        if kind not in self.minted_kinds:
            path = factory.mint_worker(kind)
            self.minted_kinds.add(kind)
            core.orch_log("minted worker kind", kind=kind, module=path.name)

    # --- spawning / monitoring ---------------------------------------------
    def spawn_one(self) -> bool:
        """Claim a task and spawn a dedicated worker subprocess for it."""
        worker_id = f"W-{self.batch}-{uuid.uuid4().hex[:6]}"
        task = task_queue.claim_next(worker_id, self.batch)
        if task is None:
            return False
        kind = task["kind"]
        self.ensure_worker_kind(kind)
        module = factory.worker_path(kind)
        proc = subprocess.Popen(
            [sys.executable, str(module),
             "--task-id", str(task["id"]), "--worker-id", worker_id],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
        )
        self.active[worker_id] = {
            "proc": proc, "task_id": task["id"], "kind": kind,
            "started": time.time(),
        }
        self._spawned_total += 1
        core.orch_log("spawned worker", worker_id=worker_id, task_id=task["id"],
                      kind=kind, pid=proc.pid)
        return True

    def reap(self) -> None:
        """Collect finished workers and retire them."""
        done_ids = []
        for wid, w in self.active.items():
            ret = w["proc"].poll()
            if ret is None:
                continue
            out, err = w["proc"].communicate()
            summary = {}
            if out.strip():
                try:
                    summary = json.loads(out.strip().splitlines()[-1])
                except json.JSONDecodeError:
                    summary = {"raw": out.strip()[:120]}
            core.orch_log(
                "retired worker", worker_id=wid, task_id=w["task_id"],
                exit=ret, status=summary.get("status", "?"),
                model=summary.get("model", "-"),
                cost_usd=summary.get("cost_usd", 0),
            )
            if err.strip():
                core.orch_log("worker stderr", worker_id=wid,
                              tail=err.strip().splitlines()[-1][:160])
            done_ids.append(wid)
        for wid in done_ids:
            self.active.pop(wid, None)

    def retire_idle_kinds(self) -> None:
        """Drop minted worker modules whose kind has no pending/active work.

        This is the 'retire idle agents' behavior at the kind level: the factory
        does not keep specialized agents around once their backlog is gone.
        """
        pending = task_queue.pending_kinds()
        active_kinds = {w["kind"] for w in self.active.values()}
        for kind in sorted(self.minted_kinds):
            if pending.get(kind, 0) == 0 and kind not in active_kinds:
                if factory.retire_minted(kind):
                    core.orch_log("retired idle worker kind", kind=kind)
                self.minted_kinds.discard(kind)

    # --- runtime state for the dashboard -----------------------------------
    def publish_state(self) -> None:
        core.write_state({
            "ts": core.now_iso(),
            "batch": self.batch,
            "concurrency": self.cfg["concurrency"],
            "complexity_threshold": self.cfg["routing"]["complexity_threshold"],
            "poll_interval_seconds": self.cfg["poll_interval_seconds"],
            "active_workers": [
                {"worker_id": wid, "task_id": w["task_id"], "kind": w["kind"],
                 "age_s": round(time.time() - w["started"], 2)}
                for wid, w in self.active.items()
            ],
            "minted_kinds": sorted(self.minted_kinds),
            "spawned_total": self._spawned_total,
            "queue": task_queue.counts(),
            "scheduler": self.sched.status(),
            "serving": self.serving,
        })

    # --- the main work step -------------------------------------------------
    def drain_step(self) -> None:
        """One pass: spawn up to capacity, reap finished, refresh state."""
        self.reap()
        for _ in range(self.decide_capacity()):
            if not self.spawn_one():
                break
        self.reap()
        self.publish_state()

    def run_batch(self) -> dict:
        """Process the whole current queue as one batch, then self-improve."""
        self.batch += 1
        core.orch_log("batch start", batch=self.batch,
                      pending=task_queue.counts()["pending"],
                      concurrency=self.cfg["concurrency"])
        # keep spawning/reaping until nothing is pending and nothing is active
        while True:
            self.drain_step()
            counts = task_queue.counts()
            if counts["pending"] == 0 and not self.active:
                break
            time.sleep(0.05)
        # self-improvement: review this batch and adopt new knobs
        entry = self_improve.review_and_tune(self.batch)
        self.reload_cfg()
        core.orch_log("self-improvement applied", batch=self.batch,
                      reasons=";".join(entry["reasons"]))
        self.retire_idle_kinds()
        self.publish_state()
        dashboard.render_all()
        return entry

    # --- modes --------------------------------------------------------------
    def run_demo(self) -> None:
        core.orch_log("orchestrator boot", mode="demo")
        entry = self.run_batch()
        # If synthetic overflow left tasks, run a second batch to show adaptation.
        if task_queue.counts()["pending"] > 0:
            self.run_batch()
        core.orch_log("orchestrator demo complete",
                      spawned_total=self._spawned_total,
                      done=task_queue.counts()["done"])

    def serve(self, max_seconds: float | None = None) -> None:
        """Long-running supervised loop driven by the in-process scheduler."""
        core.orch_log("orchestrator boot", mode="serve")
        self.sched.every("drain", self.cfg["poll_interval_seconds"], self.drain_step)
        self.sched.every("improve_if_batch_done", 1.0, self._maybe_close_batch)
        self.sched.every("dashboard", 3.0, dashboard.render_all)
        self.sched.every("adapt_cadence", 2.0, self._adapt_cadence)
        self.batch = 1
        start = time.time()
        try:
            while self.serving:
                self.sched.tick()
                self.publish_state()
                if max_seconds and (time.time() - start) >= max_seconds:
                    core.orch_log("serve time budget reached")
                    break
                time.sleep(0.2)
        except KeyboardInterrupt:
            core.orch_log("orchestrator interrupted — shutting down")
        finally:
            self.serving = False
            self.reap()
            self.publish_state()

    def _maybe_close_batch(self) -> None:
        """In serve mode, close a batch (and self-improve) when the queue drains."""
        counts = task_queue.counts()
        if counts["pending"] == 0 and not self.active and counts["done"] > 0:
            already = self.cfg.get("_last_improved_done")
            if already == counts["done"]:
                return
            entry = self_improve.review_and_tune(self.batch)
            self.reload_cfg()
            self.cfg["_last_improved_done"] = counts["done"]
            self.retire_idle_kinds()
            core.orch_log("self-improvement applied", batch=self.batch,
                          reasons=";".join(entry["reasons"]))
            self.batch += 1

    def _adapt_cadence(self) -> None:
        """Self-scheduling: tighten the drain interval when the queue is deep."""
        pending = task_queue.counts()["pending"]
        base = self.cfg["poll_interval_seconds"]
        interval = max(0.2, base / 2) if pending > self.cfg["concurrency"] else base
        self.sched.set_interval("drain", interval)


def main() -> None:
    ap = argparse.ArgumentParser(description="Agent factory orchestrator")
    ap.add_argument("--demo", action="store_true", help="drain queue once and exit")
    ap.add_argument("--serve", action="store_true", help="run forever")
    ap.add_argument("--seconds", type=float, default=None,
                    help="time budget for --serve")
    ap.add_argument("--seed", type=int, default=None,
                    help="seed sample tasks (+N synthetic) before running")
    args = ap.parse_args()

    if args.seed is not None:
        n = seed_tasks.seed(args.seed)
        core.orch_log("seeded tasks", count=n)

    orch = Orchestrator()
    if args.serve:
        orch.serve(max_seconds=args.seconds)
    else:
        orch.run_demo()

    print(json.dumps({
        "batches": orch.batch,
        "spawned_total": orch._spawned_total,
        "queue": task_queue.counts(),
        "global": task_queue.global_stats(),
    }, indent=2))


if __name__ == "__main__":
    main()
