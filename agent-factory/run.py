"""End-to-end proof runner: seed -> orchestrate -> self-improve -> dashboard.

    python run.py             # fresh seed + bounded run + dashboard
    python run.py --keep      # don't reset state, just run another batch

This is the single command that proves the whole system works offline.
"""
from __future__ import annotations

import sys

import dashboard
import queue_db
import seed_tasks
from factory_paths import COSTS_LOG, DB_PATH, assert_inside
from orchestrator import Orchestrator


def reset_state() -> None:
    for p in (DB_PATH, COSTS_LOG):
        assert_inside(p)
        if p.exists():
            p.unlink()
    # also clear WAL siblings
    for suffix in ("-wal", "-shm"):
        sib = DB_PATH.with_name(DB_PATH.name + suffix)
        if sib.exists():
            sib.unlink()


def main() -> int:
    keep = "--keep" in sys.argv
    if not keep:
        print("== Resetting sandbox state ==")
        reset_state()

    print("== Seeding tasks ==")
    queue_db.init_db()
    ids = seed_tasks.seed(include_extra=True)
    print(f"   seeded {len(ids)} tasks")

    print("== Starting orchestrator (bounded: 6 waves) ==")
    Orchestrator().run(cycles=6, daemon=False)

    print("\n== Final dashboard ==")
    print(dashboard.terminal_readout())
    html = dashboard.write_html()
    print(f"\nStatic dashboard written to: {html}")
    print("Cost ledger: logs/COSTS.log · Decisions: logs/ORCHESTRATOR.log")
    print("Self-improvement log: LEARNINGS.md · Deliverables: deliverables/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
