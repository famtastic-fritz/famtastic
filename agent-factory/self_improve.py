"""self_improve.py — bounded, logged self-tuning.

After each batch the factory reviews its own performance (success rate, cost,
latency) and adjusts a FIXED set of numeric knobs in config.json, each clamped
to declared bounds (SANDBOX.md rule 4). It never edits code. Every decision is
appended to LEARNINGS.md and to config.tuning_history.

The knobs it may turn:
  - concurrency            (how many workers run at once)
  - routing.complexity_threshold  (how eager it is to escalate to the strong model)
  - poll_interval_seconds  (base scheduler cadence)
"""
from __future__ import annotations

import core
import task_queue


def review_and_tune(batch: int) -> dict:
    cfg = core.load_config()
    stats = task_queue.batch_stats(batch)
    targets = cfg["targets"]
    bounds = cfg["bounds"]

    before = {
        "concurrency": cfg["concurrency"],
        "complexity_threshold": cfg["routing"]["complexity_threshold"],
        "poll_interval_seconds": cfg["poll_interval_seconds"],
    }
    reasons = []

    # queue pressure right now
    pending = task_queue.counts()["pending"]

    # --- concurrency: scale with success + remaining backlog -----------------
    if stats["success_rate"] >= targets["min_success_rate"] and pending > cfg["concurrency"]:
        new_conc = core.clamp(cfg["concurrency"] + 1, *bounds["concurrency"])
        if new_conc != cfg["concurrency"]:
            reasons.append(f"healthy success {stats['success_rate']:.0%} with "
                           f"{pending} pending -> concurrency {cfg['concurrency']}→{new_conc}")
            cfg["concurrency"] = new_conc
    elif stats["success_rate"] < targets["min_success_rate"]:
        new_conc = core.clamp(cfg["concurrency"] - 1, *bounds["concurrency"])
        if new_conc != cfg["concurrency"]:
            reasons.append(f"degraded success {stats['success_rate']:.0%} -> "
                           f"back off concurrency {cfg['concurrency']}→{new_conc}")
            cfg["concurrency"] = new_conc

    # --- routing threshold: defend the avg-cost target -----------------------
    th = cfg["routing"]["complexity_threshold"]
    if stats["avg_cost_usd"] > targets["max_avg_cost_usd"]:
        new_th = round(core.clamp(th + 0.05, *bounds["complexity_threshold"]), 3)
        if new_th != th:
            reasons.append(f"avg cost ${stats['avg_cost_usd']:.4f} over target "
                           f"${targets['max_avg_cost_usd']:.4f} -> raise escalation "
                           f"bar {th}→{new_th} (escalate less)")
            cfg["routing"]["complexity_threshold"] = new_th
    elif stats["avg_cost_usd"] < targets["max_avg_cost_usd"] * 0.5 and stats["completed"]:
        # plenty of cost headroom — allow slightly more escalation for quality
        new_th = round(core.clamp(th - 0.03, *bounds["complexity_threshold"]), 3)
        if new_th != th:
            reasons.append(f"avg cost ${stats['avg_cost_usd']:.4f} well under target "
                           f"-> lower escalation bar {th}→{new_th} (allow more quality)")
            cfg["routing"]["complexity_threshold"] = new_th

    # --- cadence: poll faster when backlog remains ---------------------------
    pi = cfg["poll_interval_seconds"]
    if pending >= cfg["concurrency"] * 2:
        new_pi = core.clamp(pi - 1, *bounds["poll_interval_seconds"])
        if new_pi != pi:
            reasons.append(f"deep backlog ({pending}) -> poll faster {pi}→{new_pi}s")
            cfg["poll_interval_seconds"] = new_pi
    elif pending == 0:
        new_pi = core.clamp(pi + 1, *bounds["poll_interval_seconds"])
        if new_pi != pi:
            reasons.append(f"queue drained -> poll slower {pi}→{new_pi}s")
            cfg["poll_interval_seconds"] = new_pi

    after = {
        "concurrency": cfg["concurrency"],
        "complexity_threshold": cfg["routing"]["complexity_threshold"],
        "poll_interval_seconds": cfg["poll_interval_seconds"],
    }

    entry = {
        "ts": core.now_iso(), "batch": batch, "stats": stats,
        "pending_after": pending, "before": before, "after": after,
        "reasons": reasons or ["no change — metrics within targets"],
    }
    cfg.setdefault("tuning_history", []).append(entry)
    core.save_config(cfg)
    _append_learnings(entry)
    return entry


def _append_learnings(entry: dict) -> None:
    s = entry["stats"]
    lines = [
        f"\n## Batch {entry['batch']} — {entry['ts']}",
        f"- Completed **{s['completed']}**, failed {s['failed']}, "
        f"success **{s['success_rate']:.0%}**",
        f"- Spend ${s['total_cost_usd']:.5f} (avg ${s['avg_cost_usd']:.5f}/task), "
        f"avg latency {s['avg_latency_ms']:.0f}ms",
        f"- Model mix: {s['model_mix'] or '{}'}",
        f"- Pending after batch: {entry['pending_after']}",
        "- Adjustments:",
    ]
    for r in entry["reasons"]:
        lines.append(f"  - {r}")
    with open(core.LEARNINGS, "a", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")
