"""End-to-end smoke test (offline, no spend). Verifies the whole pipeline:
seed -> orchestrator drains -> all tasks done -> cost ledger + learnings written.

    python -m tests.smoke
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from src import queue_db, seed, orchestrator, router, llm  # noqa: E402


def check(name, cond):
    print(("  PASS " if cond else "  FAIL ") + name)
    if not cond:
        raise SystemExit(1)


def main():
    print("smoke: seeding fresh queue")
    n = seed.seed(fresh=True)
    check(f"seeded {n} tasks (>0)", n > 0)

    print("smoke: routing scores cheap < expensive task types")
    cheap = router.score_complexity({"type": "triage", "payload": {}})
    hard = router.score_complexity({"type": "plan", "payload": {}})
    check("triage complexity < plan complexity", cheap < hard)

    print("smoke: offline stub is active (no live spend)")
    check("llm.is_live() is False without key", llm.is_live() is False)

    print("smoke: running orchestrator in drain mode")
    orchestrator.loop(mode="drain", max_ticks=500)

    counts = queue_db.counts()
    st = queue_db.stats()
    check("no tasks left pending", counts["pending"] == 0)
    check("no tasks in flight", counts["claimed"] + counts["running"] == 0)
    check("all tasks done (none failed)", counts["done"] == n and counts["failed"] == 0)
    check("total cost > 0 (cost tracked)", st["total_cost_usd"] > 0)
    check("multiple tiers used", len(st["by_tier"]) >= 2)

    costs_log = os.path.join(ROOT, "logs", "COSTS.log")
    check("COSTS.log written", os.path.exists(costs_log) and os.path.getsize(costs_log) > 0)
    lines = [json.loads(x) for x in open(costs_log) if x.strip()]
    check("cost ledger has a line per task", len(lines) >= n)

    learnings = os.path.join(ROOT, "LEARNINGS.md")
    check("LEARNINGS.md written by SI loop", os.path.exists(learnings))

    print("\nSMOKE OK — pipeline healthy. Stats:")
    print(json.dumps(st, indent=2))


if __name__ == "__main__":
    main()
