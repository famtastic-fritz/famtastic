"""Orchestrator — the self-managing supervisor.

Responsibilities:
  * Run an in-process scheduler loop (NO system cron). Cadence adapts to queue
    depth: deep queue -> tick fast and spawn aggressively; idle -> back off.
  * Decide how many and what kind of workers are needed from the pending mix,
    MINT worker variants from the template, spawn them as subprocesses, monitor
    them, and let idle ones retire themselves.
  * After a batch drains, run a bounded self-improvement pass: measure success
    rate / cost / latency / throughput, write LEARNINGS.md, and tune config.json
    within documented clamps.
  * Log every decision to logs/ORCHESTRATOR.log and publish data/state.json for
    the dashboard.

Modes:
  --drain   process until the queue is empty, run one self-improvement pass, exit
            (used for the proof run)
  --daemon  run forever (the real long-running supervisor)
  --max-ticks N  safety cap on scheduler iterations
"""
import argparse
import json
import math
import os
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from src import queue_db, worker_template  # noqa: E402
from src import llm  # noqa: E402

CONFIG_PATH = os.path.join(ROOT, "config.json")
ORCH_LOG = os.path.join(ROOT, "logs", "ORCHESTRATOR.log")
STATE_PATH = os.path.join(ROOT, "data", "state.json")
LEARNINGS_PATH = os.path.join(ROOT, "LEARNINGS.md")

# Maps fine-grained task types to a worker specialization the orchestrator mints.
TYPE_TO_SPEC = {
    "triage": "triage", "classify": "triage",
    "extract": "general", "summarize": "general",
    "compare": "analysis", "analyze": "analysis",
    "synthesize": "analysis", "plan": "analysis",
}


def log(msg):
    os.makedirs(os.path.dirname(ORCH_LOG), exist_ok=True)
    line = f"{time.strftime('%Y-%m-%d %H:%M:%S')} [orchestrator] {msg}"
    with open(ORCH_LOG, "a") as f:
        f.write(line + "\n")
    print(line)


def load_config():
    with open(CONFIG_PATH) as f:
        return json.load(f)


def save_config(cfg):
    with open(CONFIG_PATH, "w") as f:
        json.dump(cfg, f, indent=2)
        f.write("\n")


def _clamp(v, lo, hi):
    return max(lo, min(hi, v))


def _pending_type_mix(db_counts_unused=None):
    """Return {spec: count} for pending tasks, to decide worker specialization mix."""
    import sqlite3
    conn = sqlite3.connect(queue_db.DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    mix = {}
    for r in conn.execute("SELECT type, COUNT(*) c FROM tasks WHERE status='pending' GROUP BY type"):
        spec = TYPE_TO_SPEC.get(r["type"], "general")
        mix[spec] = mix.get(spec, 0) + r["c"]
    conn.close()
    return mix


def desired_workers(pending, cfg):
    if pending <= 0:
        return 0
    by_load = math.ceil(pending / max(1, cfg["tasks_per_worker"]))
    return _clamp(by_load, 1, cfg["concurrency"])


def scheduler_interval(pending, cfg):
    s = cfg["scheduler"]
    if pending <= 0:
        return s["max_interval_sec"]
    capacity = max(1, cfg["concurrency"] * cfg["tasks_per_worker"])
    load_factor = pending / capacity
    interval = s["base_interval_sec"] / (1.0 + load_factor)
    return _clamp(interval, s["min_interval_sec"], s["max_interval_sec"])


def pick_spec(active_specs, mix):
    """Choose a specialization for the next worker: the most-needed type not yet
    saturated among active workers."""
    if not mix:
        return "general"
    # Prefer the spec with the largest pending share, breaking ties toward variety.
    ordered = sorted(mix.items(), key=lambda kv: (-kv[1], active_specs.count(kv[0])))
    return ordered[0][0]


def write_state(mode, cfg, active):
    counts = queue_db.counts()
    st = queue_db.stats()
    state = {
        "updated": time.strftime("%Y-%m-%d %H:%M:%S"),
        "mode": mode,
        "live_models": llm.is_live(),
        "config": {
            "concurrency": cfg["concurrency"],
            "tasks_per_worker": cfg["tasks_per_worker"],
            "routing": cfg["routing"],
        },
        "queue": counts,
        "stats": st,
        "active_workers": [
            {"worker_id": w["id"], "spec": w["spec"], "uptime_sec": round(time.time() - w["t0"], 1)}
            for w in active
        ],
    }
    os.makedirs(os.path.dirname(STATE_PATH), exist_ok=True)
    with open(STATE_PATH, "w") as f:
        json.dump(state, f, indent=2)
    return state


def spawn_worker(worker_id, spec, cfg):
    path = worker_template.mint_worker(spec)
    py = sys.executable
    proc = subprocess.Popen(
        [py, path, "--worker-id", worker_id, "--max-tasks", str(cfg["tasks_per_worker"])],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, cwd=ROOT,
    )
    log(f"minted+spawned worker {worker_id} (spec={spec}, pid={proc.pid}) from {os.path.relpath(path, ROOT)}")
    return {"id": worker_id, "spec": spec, "proc": proc, "t0": time.time()}


def reap(active):
    """Remove finished workers, logging their retirement. Returns survivors."""
    survivors = []
    for w in active:
        rc = w["proc"].poll()
        if rc is None:
            survivors.append(w)
        else:
            log(f"worker {w['id']} retired (rc={rc}, ran {round(time.time()-w['t0'],1)}s)")
    return survivors


def run_self_improvement(cfg, batch_label):
    si = cfg.get("self_improvement", {})
    st = queue_db.stats()
    log(f"self-improvement pass ({batch_label}): success={st['success_rate']:.2f} "
        f"avg_cost=${st['avg_cost_usd']:.6f} avg_latency={st['avg_latency_ms']}ms "
        f"total_cost=${st['total_cost_usd']:.6f}")

    before = json.loads(json.dumps(cfg))  # deep copy snapshot
    changes = []
    if si.get("enabled", True):
        r = cfg["routing"]
        target_sr = si.get("target_success_rate", 0.9)
        target_cost = si.get("target_cost_per_task_usd", 0.01)

        # 1) Reliability: if success is below target, escalate more readily and
        #    route to strong sooner.
        if st["success_rate"] < target_sr:
            lo, hi = r["escalate_below_confidence_bounds"]
            new = _clamp(round(r["escalate_below_confidence"] + 0.05, 3), lo, hi)
            if new != r["escalate_below_confidence"]:
                changes.append(f"escalate_below_confidence {r['escalate_below_confidence']} -> {new} (raise reliability)")
                r["escalate_below_confidence"] = new

        # 2) Cost: if we're over budget but reliable, push work toward cheaper tiers.
        elif st["avg_cost_usd"] > target_cost and st["total"] > 0:
            lo, hi = r["complexity_threshold_strong_bounds"]
            new = _clamp(round(r["complexity_threshold_strong"] + 0.05, 3), lo, hi)
            if new != r["complexity_threshold_strong"]:
                changes.append(f"complexity_threshold_strong {r['complexity_threshold_strong']} -> {new} (cut cost)")
                r["complexity_threshold_strong"] = new
            lo2, hi2 = cfg["tasks_per_worker_bounds"]
            ntpw = _clamp(cfg["tasks_per_worker"] + 1, lo2, hi2)
            if ntpw != cfg["tasks_per_worker"]:
                changes.append(f"tasks_per_worker {cfg['tasks_per_worker']} -> {ntpw} (fewer spawn cycles)")
                cfg["tasks_per_worker"] = ntpw

        # 3) Throughput: cheap + reliable -> buy parallelism.
        if st["success_rate"] >= target_sr and st["avg_cost_usd"] <= target_cost:
            lo, hi = cfg["concurrency_bounds"]
            nc = _clamp(cfg["concurrency"] + 1, lo, hi)
            if nc != cfg["concurrency"]:
                changes.append(f"concurrency {cfg['concurrency']} -> {nc} (cheap+reliable, add throughput)")
                cfg["concurrency"] = nc

    if changes:
        cfg["version"] = cfg.get("version", 1) + 1
        save_config(cfg)
        for c in changes:
            log(f"  tuned: {c}")
    else:
        log("  no config changes warranted")

    _append_learnings(batch_label, st, before, cfg, changes)
    return st, changes


def _append_learnings(batch_label, st, before, after, changes):
    first = not os.path.exists(LEARNINGS_PATH)
    with open(LEARNINGS_PATH, "a") as f:
        if first:
            f.write("# Agent Factory — Self-Improvement Learnings\n\n")
            f.write("Written by the orchestrator's self-improvement loop after each "
                    "batch. Each entry records measured performance and the bounded "
                    "config adjustments made for the next batch.\n\n---\n\n")
        f.write(f"## {time.strftime('%Y-%m-%d %H:%M:%S')} — {batch_label}\n\n")
        f.write(f"- tasks: {st['total']} | done: {st['done']} | failed: {st['failed']} "
                f"| success rate: {st['success_rate']:.2%}\n")
        f.write(f"- total cost: ${st['total_cost_usd']:.6f} | avg cost/task: ${st['avg_cost_usd']:.6f}\n")
        f.write(f"- avg latency: {st['avg_latency_ms']} ms | avg confidence: {st['avg_confidence']}\n")
        f.write(f"- tier usage: {json.dumps(st['by_tier'])}\n")
        if changes:
            f.write("- **config adjustments for next batch:**\n")
            for c in changes:
                f.write(f"    - {c}\n")
        else:
            f.write("- config adjustments: none (within targets)\n")
        f.write(f"- params now: concurrency={after['concurrency']}, "
                f"tasks_per_worker={after['tasks_per_worker']}, "
                f"strong_threshold={after['routing']['complexity_threshold_strong']}, "
                f"escalate_below={after['routing']['escalate_below_confidence']}\n\n")


def loop(mode="drain", max_ticks=2000):
    queue_db.init_db()
    cfg = load_config()
    active = []
    tick = 0
    next_worker_n = 1
    log(f"orchestrator starting (mode={mode}, live_models={llm.is_live()}, "
        f"concurrency={cfg['concurrency']}, tasks_per_worker={cfg['tasks_per_worker']})")
    log(f"model catalog: " + ", ".join(
        f"{t}={llm.MODEL_CATALOG[t]['id']}(${llm.MODEL_CATALOG[t]['in']}/${llm.MODEL_CATALOG[t]['out']} per 1M)"
        for t in llm.TIER_ORDER))

    drained_once = False
    while tick < max_ticks:
        tick += 1
        cfg = load_config()  # re-read so SI tuning takes effect live
        active = reap(active)
        requeued = queue_db.requeue_stale()
        if requeued:
            log(f"requeued {requeued} stale task(s)")

        counts = queue_db.counts()
        pending = counts["pending"]
        inflight = counts["claimed"] + counts["running"]
        want = desired_workers(pending, cfg)
        mix = _pending_type_mix()

        # Spawn up to the desired count.
        active_specs = [w["spec"] for w in active]
        while len(active) < want and pending > 0:
            spec = pick_spec(active_specs, mix)
            wid = f"W{next_worker_n}"
            next_worker_n += 1
            w = spawn_worker(wid, spec, cfg)
            active.append(w)
            active_specs.append(spec)
            # decrement local mix estimate so we vary specializations
            if mix.get(spec):
                mix[spec] = max(0, mix[spec] - cfg["tasks_per_worker"])

        interval = scheduler_interval(pending, cfg)
        state = write_state(mode, cfg, active)
        log(f"tick {tick}: queue(pending={pending}, inflight={inflight}, "
            f"done={counts['done']}, failed={counts['failed']}) "
            f"active={len(active)}/{want} next_interval={interval:.2f}s")

        # Batch boundary: queue fully drained and all workers retired.
        if pending == 0 and inflight == 0 and not active:
            if counts["done"] + counts["failed"] > 0 and not drained_once:
                log("queue drained — running self-improvement pass")
                run_self_improvement(cfg, batch_label=f"batch after {counts['done']} task(s)")
                drained_once = True
                write_state(mode, load_config(), active)
            if mode == "drain":
                log("drain complete — orchestrator exiting")
                return
            # daemon: idle until new work arrives
        time.sleep(interval)

    log(f"max_ticks={max_ticks} reached — exiting")


def main(argv=None):
    p = argparse.ArgumentParser()
    g = p.add_mutually_exclusive_group()
    g.add_argument("--drain", action="store_true", help="process queue then exit (proof run)")
    g.add_argument("--daemon", action="store_true", help="run forever")
    p.add_argument("--max-ticks", type=int, default=2000)
    args = p.parse_args(argv)
    mode = "daemon" if args.daemon else "drain"
    loop(mode=mode, max_ticks=args.max_ticks)


if __name__ == "__main__":
    main()
