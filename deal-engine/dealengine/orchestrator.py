"""ORCHESTRATOR — the self-managing supervisor.

Responsibilities
----------------
* Reads the task queue and decides how many / what kind of workers are needed.
* Spawns workers from the template (subprocesses), monitors them, retires idle
  capacity (idle workers exit themselves; the orchestrator simply spawns fewer).
* Schedules ITSELF: an in-process cadence loop whose interval adapts to queue
  depth. No system crontab is ever touched.
* Runs a bounded self-improvement pass each cycle: scores the last batch
  (success rate, cost, latency), writes findings to LEARNINGS.md, and tunes
  values in config.json (concurrency, routing threshold, cadence). It never
  rewrites code.

Every decision is logged to ORCHESTRATOR.log.

Modes
-----
  --once            : run a single cycle (spawn workers, drain available work).
  --max-cycles N    : run up to N cycles or until the queue stays empty.
  --daemon          : run forever (Ctrl-C to stop). Cadence self-adjusts.
"""
from __future__ import annotations

import argparse
import json
import math
import subprocess
import sys
import time

from . import db
from .paths import (CONFIG_PATH, ENGINE_ROOT, LEARNINGS_MD, ORCHESTRATOR_LOG,
                    log_line)


def log(msg: str) -> None:
    log_line(ORCHESTRATOR_LOG, msg, also_print=True)


def load_config() -> dict:
    return json.loads(CONFIG_PATH.read_text())


def save_config(cfg: dict) -> None:
    CONFIG_PATH.write_text(json.dumps(cfg, indent=2) + "\n")


# ── capacity decision ─────────────────────────────────────────────────────────

def decide_worker_count(depth: int, cfg: dict) -> int:
    tun = cfg["tunables"]
    hard_cap = cfg["limits"]["max_workers_hard_cap"]
    if depth <= 0:
        return 0
    per = max(1, tun["queue_depth_per_worker"])
    want = math.ceil(depth / per)
    want = max(tun["min_concurrency"], want)
    want = min(want, tun["max_concurrency"], hard_cap)
    return want


def spawn_workers(n: int, cycle: int) -> list[tuple[str, subprocess.Popen]]:
    procs = []
    for i in range(n):
        wid = f"w{cycle}-{i+1}"
        # One task per worker (spec: a worker takes a task, does it, exits).
        # Load spreads across workers within a cycle and across cycles; the
        # orchestrator keeps cycling until the queue drains.
        p = subprocess.Popen(
            [sys.executable, "-m", "dealengine.worker", "--worker-id", wid],
            cwd=str(ENGINE_ROOT),
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        procs.append((wid, p))
        log(f"DECISION spawn worker {wid} (pid={p.pid})")
    return procs


def monitor(procs, timeout_s: int) -> None:
    deadline = time.time() + timeout_s
    for wid, p in procs:
        remaining = max(0.1, deadline - time.time())
        try:
            rc = p.wait(timeout=remaining)
            log(f"MONITOR worker {wid} exited rc={rc}")
        except subprocess.TimeoutExpired:
            p.kill()
            log(f"MONITOR worker {wid} TIMEOUT after {timeout_s}s — killed/retired")


# ── self-improvement (bounded; tunes config only) ─────────────────────────────

def self_improve(cycle: int, batch_start_ts: float, cfg: dict, concurrency: int) -> dict:
    m = db.batch_metrics_since(batch_start_ts)
    db.record_batch(cycle, m, concurrency)
    tun = cfg["tunables"]
    changes = []

    def set_tun(key, new, reason):
        old = tun[key]
        if old == new:
            return
        tun[key] = new
        db.record_config_change(cycle, key, old, new, reason)
        changes.append((key, old, new, reason))

    hard_cap = cfg["limits"]["max_workers_hard_cap"]
    depth_after = db.queue_depth()

    if m["runs"] == 0:
        log(f"SELF-IMPROVE cycle {cycle}: no runs this batch, no tuning.")
    else:
        # Scale concurrency on healthy throughput with remaining work.
        if m["success_rate"] >= 0.9 and depth_after > 0 and tun["max_concurrency"] < hard_cap:
            set_tun("max_concurrency", tun["max_concurrency"] + 1,
                    f"success_rate {m['success_rate']:.2f} high & queue depth {depth_after}>0")
        # Pull back concurrency on poor success.
        if m["success_rate"] < 0.6 and tun["max_concurrency"] > tun["min_concurrency"]:
            set_tun("max_concurrency", tun["max_concurrency"] - 1,
                    f"success_rate {m['success_rate']:.2f} low — reduce parallel pressure")
        # Routing threshold: failures => route more work to stronger models.
        if m["success_rate"] < 0.6:
            new_t = round(max(0.30, tun["complexity_escalation_threshold"] - 0.05), 2)
            set_tun("complexity_escalation_threshold", new_t,
                    "lower escalation threshold so more tasks reach a stronger model")
        # Cost optimization: high success + nonzero spend => push cheaper.
        elif m["success_rate"] >= 0.95 and m["avg_cost_usd"] > 0:
            new_t = round(min(0.80, tun["complexity_escalation_threshold"] + 0.05), 2)
            set_tun("complexity_escalation_threshold", new_t,
                    f"avg_cost ${m['avg_cost_usd']:.4f} & near-perfect success — favor cheaper tier")
        # Cadence: slow latency => relax busy cadence a touch.
        if m["avg_latency_ms"] > 1500 and tun["batch_busy_sleep_seconds"] < 5:
            set_tun("batch_busy_sleep_seconds", tun["batch_busy_sleep_seconds"] + 1,
                    f"avg_latency {m['avg_latency_ms']:.0f}ms high — ease cadence")

    if changes:
        save_config(cfg)
        for k, o, n, why in changes:
            log(f"SELF-IMPROVE cycle {cycle}: tuned {k} {o} -> {n} ({why})")
    else:
        log(f"SELF-IMPROVE cycle {cycle}: metrics nominal, no tuning needed.")

    write_learnings(cycle, m, changes, depth_after)
    return m


def write_learnings(cycle: int, m: dict, changes: list, depth_after: int) -> None:
    if not LEARNINGS_MD.exists():
        LEARNINGS_MD.write_text(_learnings_header())
    ts = time.strftime("%Y-%m-%d %H:%M:%S")
    block = [f"\n### Cycle {cycle} — {ts}",
             f"- runs: {m['runs']} | success: {m['success_rate']:.0%} | "
             f"failed: {m['failed']}",
             f"- avg cost: ${m['avg_cost_usd']:.5f} | avg latency: {m['avg_latency_ms']:.0f}ms "
             f"| batch spend: ${m['total_cost_usd']:.5f}",
             f"- queue depth after batch: {depth_after}"]
    if changes:
        block.append("- tuning applied:")
        for k, o, n, why in changes:
            block.append(f"  - `{k}` {o} → {n} — {why}")
    else:
        block.append("- tuning applied: none (nominal)")
    with LEARNINGS_MD.open("a") as f:
        f.write("\n".join(block) + "\n")


def _learnings_header() -> str:
    return """# LEARNINGS — Self-Improvement Log

The orchestrator appends a block here after every cycle's self-improvement pass.
It records batch performance and any bounded config tuning it applied. Tuning
touches `config.json` tunables only — never code.

## Seeded priors (from the prior FAMU research attempt — do not repeat its mistakes)
- The earlier cron job concluded it "lacked tooling" and produced no executable
  savings. Its ONE useful find was an **agency login** → that is the host-agency
  credential lane, the single biggest cruise-savings unlock. The deal_finder now
  treats it as the #1 lever instead of a footnote.
- Contact data was inconsistent on the organizer listing (phone 407.600.4565,
  visible email ewilson1911@yahoo.com, mailto megamindzproductions@gmail.com).
  The outreach handler now flags this mismatch and refuses to imply auto-send.
- Rule carried forward: **never resume from memory alone; never ship a "we lack
  tooling" non-answer.** Every deal task must emit an actionable playbook.

---
"""


# ── main loop (the in-process scheduler) ──────────────────────────────────────

def run(mode: str, max_cycles: int) -> None:
    db.init_db()
    cfg = load_config()
    log(f"ORCHESTRATOR start mode={mode} max_cycles={max_cycles} "
        f"pid={__import__('os').getpid()}")

    cycle = 0
    empty_streak = 0
    while True:
        cycle += 1
        cfg = load_config()  # re-read in case self-improve changed it
        tun = cfg["tunables"]

        requeued = db.requeue_stale(tun["worker_timeout_seconds"])
        if requeued:
            log(f"RECOVERY requeued {requeued} stale task(s)")

        depth = db.queue_depth()
        n = decide_worker_count(depth, cfg)
        log(f"CYCLE {cycle} queue_depth={depth} -> decided workers={n} "
            f"(max_conc={tun['max_concurrency']})")

        batch_start = time.time()
        if n > 0:
            procs = spawn_workers(n, cycle)
            monitor(procs, tun["worker_timeout_seconds"])
            empty_streak = 0
        else:
            empty_streak += 1

        if cycle % cfg["limits"]["self_improve_every_n_cycles"] == 0:
            self_improve(cycle, batch_start, cfg, n)

        # Termination logic for bounded modes.
        if mode == "once":
            log("ORCHESTRATOR --once complete.")
            break
        if mode == "batch":
            if cycle >= max_cycles:
                log(f"ORCHESTRATOR reached max_cycles={max_cycles}; stopping.")
                break
            if db.queue_depth() == 0 and empty_streak >= 2:
                log("ORCHESTRATOR queue drained and stable; stopping.")
                break

        # Self-scheduling cadence: tighter when busy, relaxed when idle.
        cfg = load_config()
        sleep_s = (cfg["tunables"]["batch_busy_sleep_seconds"]
                   if db.queue_depth() > 0
                   else cfg["tunables"]["batch_idle_sleep_seconds"])
        log(f"SCHEDULER sleeping {sleep_s}s (depth={db.queue_depth()})")
        time.sleep(sleep_s)

    log(f"ORCHESTRATOR stopped after {cycle} cycle(s). Total spend "
        f"to date: ${db.total_cost():.5f}")


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="FAMtastic Deal Engine orchestrator")
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--once", action="store_true", help="run a single cycle")
    g.add_argument("--daemon", action="store_true", help="run forever")
    ap.add_argument("--max-cycles", type=int, default=None,
                    help="cap cycles in batch mode (default from config)")
    args = ap.parse_args(argv)

    cfg = load_config()
    default_cycles = cfg["limits"]["max_cycles_default"]
    if args.once:
        run("once", 1)
    elif args.daemon:
        run("daemon", 10**9)
    else:
        run("batch", args.max_cycles or default_cycles)
    return 0


if __name__ == "__main__":
    sys.exit(main())
