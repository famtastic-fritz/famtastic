"""worker_template.py — the TEMPLATE the factory mints concrete workers from.

This file is never run directly. `factory.mint_worker()` reads it, substitutes
the __PLACEHOLDER__ tokens, and writes a concrete worker module into workers/.
That concrete module is what the orchestrator spawns as a subprocess.

Minting from a template is what lets the orchestrator create new *kinds* of
agents programmatically at runtime (SANDBOX.md: process containment applies).
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time

# Minted workers live in workers/; ensure the factory root is importable
# whether this module is run from workers/ (minted) or in place (template).
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import core
import router
import task_queue

# --- baked in at mint time ---
WORKER_KIND = "__WORKER_KIND__"        # e.g. "research"
WORKER_SPECIALTY = "__WORKER_SPECIALTY__"  # human description
MINTED_AT = "__MINTED_AT__"


def run(task_id: int, worker_id: str) -> dict:
    """Do one task: route -> (stubbed) model work -> record result + cost."""
    cfg = core.load_config()
    conn = core.db()
    try:
        row = conn.execute("SELECT * FROM tasks WHERE id=?", (task_id,)).fetchone()
    finally:
        conn.close()
    if row is None:
        return {"task_id": task_id, "status": "missing"}
    task = dict(row)

    task_queue.mark_running(task_id)
    t0 = time.time()
    try:
        routed = router.route(task, cfg)
        task_queue.complete(
            task_id,
            model_used=routed["model"],
            result=routed["text"],
            cost_usd=routed["cost_usd"],
            tokens_in=routed["tokens_in"],
            tokens_out=routed["tokens_out"],
            latency_ms=routed["latency_ms"],
            complexity=routed["complexity"],
        )
        core.append_cost({
            "task_id": task_id,
            "worker_id": worker_id,
            "worker_kind": WORKER_KIND,
            "task_kind": task["kind"],
            "model": routed["model"],
            "escalated": routed["escalated"],
            "tokens_in": routed["tokens_in"],
            "tokens_out": routed["tokens_out"],
            "cost_usd": routed["cost_usd"],
            "stubbed": routed["stubbed"],
        })
        return {
            "task_id": task_id,
            "worker_id": worker_id,
            "status": "done",
            "model": routed["model"],
            "escalated": routed["escalated"],
            "cost_usd": routed["cost_usd"],
            "latency_ms": int((time.time() - t0) * 1000),
        }
    except Exception as exc:  # containment: a worker failure never crashes the orchestrator
        task_queue.fail(task_id, str(exc))
        return {"task_id": task_id, "worker_id": worker_id, "status": "failed",
                "error": str(exc)}


def main() -> None:
    ap = argparse.ArgumentParser(description=f"{WORKER_KIND} worker")
    ap.add_argument("--task-id", type=int, required=True)
    ap.add_argument("--worker-id", required=True)
    args = ap.parse_args()
    out = run(args.task_id, args.worker_id)
    # The orchestrator reads this single JSON line from stdout.
    print(json.dumps(out))
    sys.exit(0 if out.get("status") == "done" else 1)


if __name__ == "__main__":
    main()
