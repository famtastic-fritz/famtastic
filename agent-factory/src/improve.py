"""Self-improvement loop.

After a batch, read the batch's real performance from the DB and tune the
*config tunables only* — never core code. Every adjustment is clamped to the
documented bounds in config.json, so self-modification is bounded and auditable.
Findings are appended to LEARNINGS.md.
"""
from __future__ import annotations

import queue as q
from common import ROOT, load_config, now_iso, olog, save_config

LEARNINGS = ROOT / "LEARNINGS.md"


def _clamp(value, bounds):
    lo, hi = bounds
    return max(lo, min(hi, value))


def review_and_tune(batch_id: str, peak_depth: int = 0) -> dict:
    cfg = load_config()
    tun = cfg["tunables"]
    s = q.stats()  # global view; batch_id available for per-batch if needed
    before = {
        "max_workers": tun["max_workers"],
        "routing_complexity_threshold": tun["routing_complexity_threshold"],
        "idle_timeout_seconds": tun["idle_timeout_seconds"],
    }
    notes = []

    # --- Rule 1: scale concurrency to PEAK demand + reliability -----------
    # Use the batch's peak queue depth, not the post-drain depth (which is
    # always 0 at review time). This is the fix for the "starve to the floor"
    # bug noted in LEARNINGS — see buglog.
    if peak_depth > tun["max_workers"] and s["success_rate"] >= 0.9:
        tun["max_workers"] = _clamp(tun["max_workers"] + 1, tun["max_workers_bounds"])
        notes.append(f"peak demand {peak_depth} exceeded capacity "
                     f"{before['max_workers']} at {s['success_rate']:.0%} success "
                     f"→ raise max_workers to {tun['max_workers']}")
    elif peak_depth and peak_depth <= tun["max_workers"] / 2 \
            and tun["max_workers"] > tun["max_workers_bounds"][0]:
        tun["max_workers"] = _clamp(tun["max_workers"] - 1, tun["max_workers_bounds"])
        notes.append(f"peak demand {peak_depth} well under capacity "
                     f"{before['max_workers']} → trim max_workers to {tun['max_workers']} "
                     f"(save spawn cost)")

    # --- Rule 2: routing threshold follows cost vs reliability ------------
    if s["success_rate"] >= 0.95:
        # winning on quality → push more work to the cheap lane (raise threshold)
        tun["routing_complexity_threshold"] = round(
            _clamp(tun["routing_complexity_threshold"] + 0.05,
                   tun["routing_complexity_threshold_bounds"]), 3)
        notes.append(f"success {s['success_rate']:.0%} ≥95% → raise routing threshold to "
                     f"{tun['routing_complexity_threshold']} (more triage on cheap model, lower $)")
    elif s["success_rate"] < 0.8:
        tun["routing_complexity_threshold"] = round(
            _clamp(tun["routing_complexity_threshold"] - 0.1,
                   tun["routing_complexity_threshold_bounds"]), 3)
        notes.append(f"success {s['success_rate']:.0%} <80% → lower routing threshold to "
                     f"{tun['routing_complexity_threshold']} (escalate sooner for quality)")

    # --- Rule 3: latency → idle timeout ----------------------------------
    if s["avg_latency_ms"] and s["avg_latency_ms"] > 2000:
        tun["idle_timeout_seconds"] = _clamp(tun["idle_timeout_seconds"] + 1,
                                             tun["idle_timeout_bounds"])
        notes.append(f"avg latency {s['avg_latency_ms']:.0f}ms high → keep workers warm "
                     f"longer (idle_timeout={tun['idle_timeout_seconds']})")

    if not notes:
        notes.append("metrics within target bands → no tuning needed this pass")

    save_config(cfg)
    after = {
        "max_workers": tun["max_workers"],
        "routing_complexity_threshold": tun["routing_complexity_threshold"],
        "idle_timeout_seconds": tun["idle_timeout_seconds"],
    }
    _append_learnings(batch_id, s, before, after, notes)
    olog(f"self-improvement pass complete for batch {batch_id}: {'; '.join(notes)}",
         component="improve")
    return {"stats": s, "before": before, "after": after, "notes": notes}


def _append_learnings(batch_id, s, before, after, notes):
    if not LEARNINGS.exists():
        LEARNINGS.write_text(
            "# LEARNINGS — agent factory self-improvement journal\n\n"
            "Auto-appended after every batch. The orchestrator reads its own\n"
            "performance and tunes `config.json` tunables (bounded). Core code is\n"
            "never self-modified — only numeric config moves, and only within the\n"
            "min/max bounds declared in config.json.\n\n"
            "## Design decisions (human-seeded)\n"
            "- Nested `.git` avoided so the sandbox stays reviewable on the parent\n"
            "  branch; `setup.sh init-repo` detaches it on demand.\n"
            "- Stdlib-only Python → strongest isolation (nothing to install).\n"
            "- LLM layer stubbed offline; routing/cost math runs regardless of keys.\n\n"
            "---\n"
        )
    delta = []
    for k in before:
        if before[k] != after[k]:
            delta.append(f"`{k}` {before[k]} → {after[k]}")
    delta_str = ", ".join(delta) if delta else "no config change"
    block = (
        f"\n## {now_iso()} — batch `{batch_id}`\n"
        f"- **Throughput:** {s['done']} done, {s['failed']} failed, "
        f"success {s['success_rate']:.0%}\n"
        f"- **Cost:** total ${s['total_cost_usd']:.6f}, avg ${s['avg_cost_usd']:.6f}/task\n"
        f"- **Latency:** avg {s['avg_latency_ms']:.0f} ms\n"
        f"- **Tuning:** {delta_str}\n"
        + "".join(f"  - {n}\n" for n in notes)
    )
    with open(LEARNINGS, "a") as f:
        f.write(block)
