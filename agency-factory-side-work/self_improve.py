"""Self-improvement loop. After each batch it reviews performance, writes
findings to LEARNINGS.md, and tunes config.json WITHIN HARD BOUNDS.

It can only change a small allow-list of numeric knobs, each clamped to a safe
range. It cannot edit core code, cannot exceed the concurrency ceiling, and
cannot remove budget caps. Every change is logged with before/after values.
"""
from __future__ import annotations

import datetime as _dt

import queue_db
import router
from config_io import load_config, save_config
from factory_paths import LEARNINGS_PATH, assert_inside

# The ONLY parameters the loop may touch, with clamps. Anything else is frozen.
SAFE_BOUNDS = {
    "concurrency.current_max": (1, None),  # upper clamp from max_concurrency_ceiling
    "routing.complexity_threshold": (0.3, 0.85),
    "scheduler.base_interval_seconds": (1, 20),
}


def _get(cfg: dict, dotted: str):
    node = cfg
    for k in dotted.split("."):
        node = node[k]
    return node


def _set(cfg: dict, dotted: str, value) -> None:
    keys = dotted.split(".")
    node = cfg
    for k in keys[:-1]:
        node = node[k]
    node[keys[-1]] = value


def _clamp(dotted: str, value, cfg: dict):
    lo, hi = SAFE_BOUNDS[dotted]
    if dotted == "concurrency.current_max":
        hi = cfg["self_improvement"]["max_concurrency_ceiling"]
    if lo is not None:
        value = max(lo, value)
    if hi is not None:
        value = min(hi, value)
    return value


def run_pass(batch_label: str = "batch") -> dict:
    cfg = load_config()
    m = queue_db.metrics()
    total_cost = router.read_total_cost()
    si = cfg["self_improvement"]

    changes: list[dict] = []

    def propose(dotted: str, new_value, reason: str):
        old = _get(cfg, dotted)
        clamped = _clamp(dotted, new_value, cfg)
        if clamped != old:
            _set(cfg, dotted, clamped)
            changes.append(
                {"param": dotted, "from": old, "to": clamped, "reason": reason}
            )

    # --- Tuning policy --------------------------------------------------------
    success = m["success_rate"]
    cost_per_task = m["cost_per_task_usd"]
    pending = m["pending"]

    # 1. Concurrency: scale up if healthy + work waiting; down if failing.
    cur = cfg["concurrency"]["current_max"]
    if success >= si["target_success_rate"] and pending > cur:
        propose("concurrency.current_max", cur + 1,
                f"success {success:.0%} >= target and {pending} tasks waiting; scale up")
    elif success < si["target_success_rate"] and success > 0:
        propose("concurrency.current_max", cur - 1,
                f"success {success:.0%} below target; scale down to stabilize")

    # 2. Routing threshold: if cost/task is over target, raise the bar for using
    #    expensive tiers (route more to cheaper models). If well under, relax it.
    thr = cfg["routing"]["complexity_threshold"]
    if cost_per_task > si["target_cost_per_task_usd"] * 1.25:
        propose("routing.complexity_threshold", round(thr + 0.05, 3),
                f"cost/task ${cost_per_task:.4f} over target; push work to cheaper models")
    elif cost_per_task and cost_per_task < si["target_cost_per_task_usd"] * 0.5:
        propose("routing.complexity_threshold", round(thr - 0.05, 3),
                f"cost/task ${cost_per_task:.4f} well under target; allow stronger models")

    # 3. Cadence: speed up if backlog remains, slow down if drained.
    base = cfg["scheduler"]["base_interval_seconds"]
    if pending > cfg["scheduler"]["deep_queue_threshold"]:
        propose("scheduler.base_interval_seconds", base - 1, "deep backlog; tighten cadence")
    elif pending == 0:
        propose("scheduler.base_interval_seconds", base + 1, "queue drained; relax cadence")

    if changes:
        save_config(cfg)

    findings = {
        "ts": _dt.datetime.now().isoformat(timespec="seconds"),
        "batch": batch_label,
        "metrics": m,
        "total_cost_usd": total_cost,
        "changes": changes,
    }
    _append_learnings(findings)
    return findings


def _append_learnings(f: dict) -> None:
    assert_inside(LEARNINGS_PATH)
    m = f["metrics"]
    lines = [
        f"\n## {f['ts']} — self-improvement pass ({f['batch']})",
        "",
        f"- Tasks: {m['total']} total · {m['done']} done · {m['failed']} failed · {m['pending']} pending",
        f"- Success rate: **{m['success_rate']:.0%}** · avg latency: {m['avg_latency_s']}s",
        f"- Cost: **${m['total_cost_usd']:.4f}** total · ${m['cost_per_task_usd']:.4f}/task · ledger total ${f['total_cost_usd']:.4f}",
    ]
    if f["changes"]:
        lines.append("- Parameter changes applied (bounded):")
        for c in f["changes"]:
            lines.append(f"    - `{c['param']}`: {c['from']} → {c['to']} — {c['reason']}")
    else:
        lines.append("- No parameter changes — system within targets.")
    lines.append("")

    header = ""
    if not LEARNINGS_PATH.exists():
        header = (
            "# LEARNINGS — Agent Factory self-improvement log\n\n"
            "> Auto-appended after every batch by `self_improve.run_pass`. Each\n"
            "> entry records the metrics observed and any bounded config changes\n"
            "> made for the next batch. Core code is never modified here.\n"
        )
    with LEARNINGS_PATH.open("a", encoding="utf-8") as fh:
        if header:
            fh.write(header)
        fh.write("\n".join(lines))


if __name__ == "__main__":
    import json
    print(json.dumps(run_pass("manual"), indent=2))
