"""Worker agent.

A worker is a short-lived process the orchestrator spawns on demand. It claims
one task at a time, routes it through the cost-aware router, records the result
and cost, and exits ("retires") when it has processed its quota OR finds the
queue empty. Exiting on an empty queue is how idle workers retire themselves.

Run directly:
    python -m src.worker --worker-id W1 --max-tasks 3
Or via a minted variant in workers/ (see worker_template.py).
"""
import argparse
import json
import os
import sys
import time

# Allow execution both as a module (-m src.worker) and as a spawned file.
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from src import queue_db, router  # noqa: E402

ORCH_LOG = os.path.join(ROOT, "logs", "ORCHESTRATOR.log")


def _log(worker_id, msg):
    os.makedirs(os.path.dirname(ORCH_LOG), exist_ok=True)
    line = f"{time.strftime('%Y-%m-%d %H:%M:%S')} [worker {worker_id}] {msg}"
    with open(ORCH_LOG, "a") as f:
        f.write(line + "\n")


def run(worker_id, max_tasks, specialization=None):
    config = _load_config()
    processed = 0
    _log(worker_id, f"spawned (max_tasks={max_tasks}"
                    + (f", specialization={specialization}" if specialization else "") + ")")
    while processed < max_tasks:
        task = queue_db.claim_next(worker_id)
        if task is None:
            _log(worker_id, f"no work — retiring after {processed} task(s)")
            return {"worker_id": worker_id, "processed": processed, "reason": "idle"}
        try:
            payload = json.loads(task["payload"]) if isinstance(task["payload"], str) else task["payload"]
            task["payload"] = payload
            queue_db.mark_running(task["id"], "?", "?")
            rec = router.route_and_run(task, config, worker_id)
            queue_db.complete(
                task["id"], rec["result"], rec["tier"], rec["model"],
                rec["confidence"], rec["tokens_in"], rec["tokens_out"],
                rec["cost_usd"], rec["latency_ms"],
            )
            processed += 1
            esc = " (escalated)" if rec["escalated"] else ""
            _log(worker_id, f"task {task['id']} [{task['type']}] -> {rec['tier']}{esc} "
                            f"conf={rec['confidence']} cost=${rec['cost_usd']:.6f}")
        except Exception as e:  # noqa: BLE001
            queue_db.fail(task["id"], e)
            _log(worker_id, f"task {task['id']} FAILED: {e}")
    _log(worker_id, f"quota reached — retiring after {processed} task(s)")
    return {"worker_id": worker_id, "processed": processed, "reason": "quota"}


def _load_config():
    with open(os.path.join(ROOT, "config.json")) as f:
        return json.load(f)


def main(argv=None):
    p = argparse.ArgumentParser()
    p.add_argument("--worker-id", required=True)
    p.add_argument("--max-tasks", type=int, default=None)
    p.add_argument("--specialization", default=None)
    args = p.parse_args(argv)
    max_tasks = args.max_tasks
    if max_tasks is None:
        max_tasks = _load_config().get("tasks_per_worker", 3)
    result = run(args.worker_id, max_tasks, args.specialization)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
