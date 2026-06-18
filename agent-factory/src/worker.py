"""Worker agent — spawned by the orchestrator as its own OS subprocess.

Lifecycle (single task, then exits — proves real spawn/retire churn):
    register -> claim one task -> route to a model -> run handler ->
    record cost -> complete task -> retire -> exit

Run directly for debugging:
    python3 -m src.worker --agent-id w-test
"""
import argparse
import json
import os
import time

from . import db, handlers, ledger, log, queue, router

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG = os.path.join(ROOT, "config.json")


def _load_routing():
    with open(CONFIG, encoding="utf-8") as fh:
        return json.load(fh).get("routing", {})


def _register(agent_id):
    conn = db.connect()
    with conn:
        conn.execute(
            "INSERT OR REPLACE INTO agents (id,pid,task_id,status,spawned_at) VALUES (?,?,?,?,?)",
            (agent_id, os.getpid(), None, "spawning", db.now()),
        )
    conn.close()


def _set_agent(agent_id, **fields):
    cols = ", ".join(f"{k}=?" for k in fields)
    conn = db.connect()
    with conn:
        conn.execute(f"UPDATE agents SET {cols} WHERE id=?", (*fields.values(), agent_id))
    conn.close()


def run(agent_id):
    _register(agent_id)
    routing = _load_routing()

    task = queue.claim_next(agent_id)
    if not task:
        _set_agent(agent_id, status="retired", retired_at=db.now())
        log.orch("worker_idle_exit", agent=agent_id)
        return 0

    _set_agent(agent_id, status="busy", task_id=task["id"])
    log.orch("worker_claimed", agent=agent_id, task=task["id"], kind=task["kind"],
             complexity=round(task["complexity"], 2))

    started = time.time()
    payload = json.loads(task["payload"])
    try:
        out = handlers.run(task["kind"], payload)
        run_spend = ledger.total()["usd"]
        model, _text, tin, tout, usd, mode = router.complete(
            out["prompt"], task["complexity"], routing, run_spend_usd=run_spend
        )
        ledger.record(task["id"], model, tin, tout, usd, mode)
        latency_ms = int((time.time() - started) * 1000)
        queue.complete(task["id"], model, out["summary"], out.get("artifact"),
                       usd, latency_ms, ok=True)
        _set_agent(agent_id, status="done", retired_at=db.now())
        log.orch("worker_done", agent=agent_id, task=task["id"], model=model,
                 usd=f"{usd:.6f}", mode=mode, latency_ms=latency_ms,
                 artifact=out.get("artifact") or "-")
        return 0
    except Exception as exc:  # mark failed, never crash the fleet
        latency_ms = int((time.time() - started) * 1000)
        queue.complete(task["id"], "-", f"error: {exc}", None, 0.0, latency_ms, ok=False)
        _set_agent(agent_id, status="crashed", retired_at=db.now())
        log.orch("worker_failed", agent=agent_id, task=task["id"], error=str(exc))
        return 1


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--agent-id", required=True)
    raise SystemExit(run(ap.parse_args().agent_id))
