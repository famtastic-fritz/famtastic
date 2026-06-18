"""Self-improvement loop.

After a batch, review performance (success rate, cost, latency, throughput-per-dollar)
and adjust tunable parameters in config.json for the next batch. Bounded by the
guardrails in config.json — it tunes config values only, never core code. Every
adjustment is logged and appended to LEARNINGS.md.
"""
import json
import os
from datetime import datetime, timezone

from . import db, ledger, log

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG = os.path.join(ROOT, "config.json")
LEARNINGS = os.path.join(ROOT, "LEARNINGS.md")


def _load():
    with open(CONFIG, encoding="utf-8") as fh:
        return json.load(fh)


def _save(cfg):
    with open(CONFIG, "w", encoding="utf-8") as fh:
        json.dump(cfg, fh, indent=2)
        fh.write("\n")


def _clamp(value, bounds):
    lo, hi = bounds
    return max(lo, min(hi, value))


def metrics():
    conn = db.connect()
    rows = conn.execute(
        "SELECT status, COUNT(*) c, AVG(latency_ms) lat, SUM(cost_usd) usd "
        "FROM tasks WHERE status IN ('done','failed') GROUP BY status"
    ).fetchall()
    conn.close()
    done = next((r["c"] for r in rows if r["status"] == "done"), 0)
    failed = next((r["c"] for r in rows if r["status"] == "failed"), 0)
    avg_lat = next((r["lat"] for r in rows if r["status"] == "done"), 0) or 0
    total = ledger.total()
    processed = done + failed
    success = (done / processed) if processed else 0.0
    tpd = (done / total["usd"]) if total["usd"] > 0 else float(done)  # tasks per dollar
    return {
        "done": done, "failed": failed, "processed": processed,
        "success_rate": round(success, 4), "avg_latency_ms": round(avg_lat, 1),
        "total_usd": round(total["usd"], 6), "tasks_per_dollar": round(tpd, 2),
    }


def _record(batch, m):
    conn = db.connect()
    with conn:
        for k in ("success_rate", "avg_latency_ms", "total_usd", "tasks_per_dollar"):
            conn.execute(
                "INSERT INTO runs (batch,metric,value,note,at) VALUES (?,?,?,?,?)",
                (batch, k, float(m[k]), None, db.now()),
            )
    conn.close()


def improve(batch, queue_depth):
    """Run one self-improvement pass. Returns (metrics, adjustments)."""
    cfg = _load()
    guards = cfg["config_guardrails"]
    m = metrics()
    _record(batch, m)

    adjustments = []
    before = {
        "max_concurrency": cfg["max_concurrency"],
        "escalate_threshold": cfg["routing"]["escalate_threshold"],
        "batch_size": cfg["batch_size"],
    }

    # Concurrency: scale up when reliable and work remains; pull back when failing.
    if m["success_rate"] >= 0.95 and queue_depth > cfg["max_concurrency"]:
        cfg["max_concurrency"] = int(_clamp(cfg["max_concurrency"] + 1, guards["max_concurrency"]))
    elif m["success_rate"] < 0.80:
        cfg["max_concurrency"] = int(_clamp(cfg["max_concurrency"] - 1, guards["max_concurrency"]))

    # Routing: if reliable, push more work onto the cheap tier (raise escalate
    # threshold) to lift throughput-per-dollar; if unreliable, escalate sooner.
    if m["success_rate"] >= 0.95:
        cfg["routing"]["escalate_threshold"] = round(
            _clamp(cfg["routing"]["escalate_threshold"] + 0.05, guards["routing.escalate_threshold"]), 4)
    elif m["success_rate"] < 0.85:
        cfg["routing"]["escalate_threshold"] = round(
            _clamp(cfg["routing"]["escalate_threshold"] - 0.05, guards["routing.escalate_threshold"]), 4)

    # Batch size: grow when reliable to amortize scheduling overhead.
    if m["success_rate"] >= 0.95:
        cfg["batch_size"] = int(_clamp(cfg["batch_size"] + 2, guards["batch_size"]))

    after = {
        "max_concurrency": cfg["max_concurrency"],
        "escalate_threshold": cfg["routing"]["escalate_threshold"],
        "batch_size": cfg["batch_size"],
    }
    for k in before:
        if before[k] != after[k]:
            adjustments.append(f"{k}: {before[k]} -> {after[k]}")

    _save(cfg)
    log.orch("self_improve", batch=batch, success=m["success_rate"],
             tasks_per_dollar=m["tasks_per_dollar"], adjustments=";".join(adjustments) or "none")
    _append_learnings(batch, m, adjustments)
    return m, adjustments


def _append_learnings(batch, m, adjustments):
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%SZ")
    if not os.path.exists(LEARNINGS):
        with open(LEARNINGS, "w", encoding="utf-8") as fh:
            fh.write("# LEARNINGS — Self-Improvement Log\n\n"
                     "Each entry is a post-batch review written by `src/improve.py`. The loop "
                     "adjusts only `config.json` values, within guardrails.\n")
    with open(LEARNINGS, "a", encoding="utf-8") as fh:
        fh.write(f"\n## Batch {batch} — {ts}\n")
        fh.write(f"- Processed: {m['processed']} (done {m['done']}, failed {m['failed']})\n")
        fh.write(f"- Success rate: {m['success_rate']:.2%}\n")
        fh.write(f"- Avg latency: {m['avg_latency_ms']} ms\n")
        fh.write(f"- Total estimated cost: ${m['total_usd']:.6f}\n")
        fh.write(f"- Throughput: {m['tasks_per_dollar']} tasks/$\n")
        if adjustments:
            fh.write(f"- **Adjustments for next batch:** {', '.join(adjustments)}\n")
        else:
            fh.write("- Adjustments for next batch: none (parameters already optimal "
                     "within guardrails)\n")
