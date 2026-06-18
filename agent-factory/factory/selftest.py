"""End-to-end self-test. No network, no keys, no spend. Pure assertions.

Runs the full system in a throwaway state and verifies the core invariants:
  * the queue drains (every seeded task reaches a terminal state),
  * workers actually ran and produced cost-ledger rows,
  * model routing used >1 tier and kept triage on the free tier,
  * each pipeline stage produced its business artifact,
  * the self-improvement loop recorded at least one batch,
  * the sandbox path guard rejects writes above the root,
  * the live HTTP path works against the local mock (mode=live).

Run:  python -m factory.selftest      (or ./bin/factory test)
Exit: 0 all pass, 1 any failure.
"""
from __future__ import annotations

import sys

from . import db, seed, orchestrator, verify_live
from .paths import BUSINESS_DIR, FACTORY_ROOT, safe_path

PASS, FAIL = "PASS", "FAIL"
_results = []


def check(name: str, cond: bool, detail: str = "") -> None:
    _results.append(cond)
    print(f"  [{PASS if cond else FAIL}] {name}" + (f" — {detail}" if detail else ""))


def main() -> int:
    print("== Agent Factory self-test (offline) ==\n")

    # Clean slate.
    n = seed.seed(reset=True)
    print(f"seeded {n} tasks\n")

    print("Phase A: orchestrate to completion")
    orchestrator.run("batch", max_cycles=20)
    counts = db.counts_by_status()
    check("queue fully drained", db.queue_depth() == 0, str(counts))
    check("all tasks terminal (done/failed)",
          set(counts) <= {"done", "failed"}, str(counts))
    check("at least one task done", counts.get("done", 0) >= 1, str(counts))

    print("\nPhase B: cost ledger + routing")
    runs = db.recent_runs(50)
    check("worker runs recorded", len(runs) >= n, f"{len(runs)} runs")
    tiers = {r["tier"] for r in runs}
    check("routing used more than one tier", len(tiers) > 1, str(tiers))
    free = [r for r in runs if r["tier"] == "local-triage"]
    check("triage stayed on the free tier ($0)",
          all(r["cost_usd"] == 0 for r in free) and len(free) > 0,
          f"{len(free)} free-tier runs")
    check("total spend is tiny but >0", 0 < db.total_cost() < 1.0,
          f"${db.total_cost():.5f}")

    print("\nPhase C: business deliverables")
    for fragment in ("MARKETING-POSITIONING.md", "CAMPAIGN-PLAN.md",
                     "OUTREACH-DRAFT.md", "SALES-CLOSE.md", "PAYMENT-PLAN.md",
                     "HOST-AGENCY-ONBOARDING.md"):
        check(f"artifact {fragment}", (BUSINESS_DIR / fragment).exists())
    cruise = list(BUSINESS_DIR.glob("CRUISE-*.md"))
    apparel = list(BUSINESS_DIR.glob("APPAREL-*.md"))
    check("cruise playbook(s) produced", len(cruise) >= 1, f"{len(cruise)} file(s)")
    check("apparel playbook produced", len(apparel) >= 1, f"{len(apparel)} file(s)")

    print("\nPhase D: self-improvement loop")
    with db.connect() as c:
        nb = c.execute("SELECT COUNT(*) FROM batches").fetchone()[0]
    check("self-improvement recorded batches", nb >= 1, f"{nb} batches")

    print("\nPhase E: sandbox path guard")
    guarded = False
    try:
        safe_path("..", "escape.txt")
    except PermissionError:
        guarded = True
    check("path guard blocks writes above sandbox root", guarded)
    check("FACTORY_ROOT is the agent-factory dir",
          FACTORY_ROOT.name == "agent-factory", str(FACTORY_ROOT))

    print("\nPhase F: live HTTP path (mock model)")
    live_rc = verify_live.main()
    check("live model path proven", live_rc == 0)

    passed = sum(_results)
    total = len(_results)
    print(f"\n== {passed}/{total} checks passed ==")
    ok = passed == total
    print("SELF-TEST PASSED ✅" if ok else "SELF-TEST FAILED ❌")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
