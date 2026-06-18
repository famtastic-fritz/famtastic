"""Worker agent template.

The orchestrator mints workers from this single template by spawning it as a
subprocess with a worker id. A worker:

  1. claims ONE task from the queue (atomic),
  2. runs the matching handler (which routes through the cost-aware model layer),
  3. writes result + cost + latency back to the queue,
  4. reports a line to ORCHESTRATOR.log, and
  5. exits.

If there is no work to claim, the worker exits immediately with code 3 — that is
how the orchestrator "retires" surplus capacity: an idle worker simply ends.

Exit codes: 0 = task done, 1 = task failed, 3 = no work (idle retire), 2 = error.
"""
from __future__ import annotations

import argparse
import sys
import time
import traceback

from . import db
from .handlers import get_handler
from .paths import ORCHESTRATOR_LOG, log_line


def run_once(worker_id: str) -> int:
    db.init_db()
    task = db.claim_next(worker_id)
    if not task:
        log_line(ORCHESTRATOR_LOG, f"WORKER {worker_id} idle — no task to claim, retiring.")
        return 3

    db.mark_running(task["id"])
    log_line(ORCHESTRATOR_LOG,
             f"WORKER {worker_id} claimed task#{task['id']} [{task['kind']}] "
             f"complexity={task['complexity']} :: {task['title']}")

    t0 = time.time()
    try:
        result = get_handler(task["kind"])(task)
    except Exception as e:  # a worker failure must never crash the factory
        tb = traceback.format_exc(limit=3)
        db.complete_task(task["id"], worker_id, success=False,
                         result=f"EXCEPTION: {e}\n{tb}", model_used="none",
                         tier="none", cost_usd=0.0,
                         latency_ms=int((time.time() - t0) * 1000))
        log_line(ORCHESTRATOR_LOG, f"WORKER {worker_id} task#{task['id']} FAILED: {e}")
        return 1

    db.complete_task(
        task["id"], worker_id,
        success=result.ok, result=result.summary + "\n\n" + (result.detail or ""),
        model_used=result.model_used, tier=result.tier,
        cost_usd=result.cost_usd, latency_ms=result.latency_ms,
    )
    status = "DONE" if result.ok else "FAILED"
    log_line(ORCHESTRATOR_LOG,
             f"WORKER {worker_id} task#{task['id']} {status} "
             f"model={result.model_used}/{result.tier} "
             f"cost=${result.cost_usd} latency={result.latency_ms}ms :: {result.summary}")
    return 0 if result.ok else 1


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Agent Factory worker")
    ap.add_argument("--worker-id", required=True)
    ap.add_argument("--drain", action="store_true",
                    help="keep claiming until the queue is empty (default: one task)")
    args = ap.parse_args(argv)

    if not args.drain:
        return run_once(args.worker_id)

    last = 3
    while True:
        rc = run_once(args.worker_id)
        if rc == 3:
            return last if last != 3 else 3
        last = rc


if __name__ == "__main__":
    sys.exit(main())
