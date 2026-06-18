#!/usr/bin/env python3
"""WORKER AGENT (minted from template).

This file is a TEMPLATE. The orchestrator mints concrete workers from it by
substituting __WORKER_ID__ / __SPECIALTY__ and writing agents/worker_<id>.py,
then spawns that file as its own subprocess. That is how the orchestrator
"creates new agents programmatically."

A worker:
  1. registers itself,
  2. loops: claim a task → route to cheapest capable model → run handler →
     write the output artifact → record cost → heartbeat,
  3. self-retires after `idle_timeout_seconds` with no work, then exits.
"""
import json
import sys
import time
from pathlib import Path

SRC = Path(__file__).resolve().parents[1] / "src"
sys.path.insert(0, str(SRC))

import queue as q                      # noqa: E402
import router                          # noqa: E402
from llm import complete               # noqa: E402
from tasks.registry import handle      # noqa: E402
from common import OUTPUTS_DIR, load_config, now_iso  # noqa: E402

WORKER_ID = "__WORKER_ID__"
SPECIALTY = "__SPECIALTY__"            # informational tag only


def run_task(task: dict) -> None:
    t0 = time.time()
    cfg = load_config()
    model = router.choose_model(
        task["complexity"],
        threshold=cfg["tunables"]["routing_complexity_threshold"],
    )
    prompt = f"Task type={task['type']} payload={json.dumps(task['payload'])[:800]}"
    comp = complete(model["id"], prompt, system=f"You are worker {WORKER_ID} ({SPECIALTY}).")
    cost = router.price_call(model, comp.prompt_tokens, comp.completion_tokens)

    artifact = handle(task["type"], task["payload"], comp.text)
    slug = task["payload"].get("slug") or f"{task['type']}-{task['id']}"
    out_path = OUTPUTS_DIR / f"{slug}.md"
    out_path.write_text(artifact)

    latency_ms = int((time.time() - t0) * 1000)
    router.record_cost(
        task_id=task["id"], task_type=task["type"], model_id=model["id"],
        prompt_tokens=comp.prompt_tokens, completion_tokens=comp.completion_tokens,
        cost_usd=cost, stubbed=comp.stubbed,
    )
    q.complete_task(
        task["id"], model_used=model["id"], cost_usd=cost,
        latency_ms=latency_ms, result_path=str(out_path.relative_to(out_path.parents[1])),
        batch_id=BATCH_ID,
    )
    q.heartbeat(WORKER_ID, "working", did_task=True)
    print(f"[{now_iso()}] [{WORKER_ID}] did task {task['id']} ({task['type']}) "
          f"via {model['id']} ${cost:.6f} {latency_ms}ms", flush=True)


def main():
    global BATCH_ID
    BATCH_ID = sys.argv[1] if len(sys.argv) > 1 else "adhoc"
    cfg = load_config()
    idle_timeout = cfg["tunables"]["idle_timeout_seconds"]

    import os
    q.register_worker(WORKER_ID, os.getpid())
    print(f"[{now_iso()}] [{WORKER_ID}] spawned (pid={os.getpid()}, batch={BATCH_ID})", flush=True)

    last_work = time.time()
    while True:
        task = q.claim_next(WORKER_ID)
        if task is None:
            q.heartbeat(WORKER_ID, "idle")
            if time.time() - last_work >= idle_timeout:
                q.retire_worker(WORKER_ID)
                print(f"[{now_iso()}] [{WORKER_ID}] idle {idle_timeout}s → self-retiring", flush=True)
                return
            time.sleep(0.4)
            continue
        try:
            run_task(task)
        except Exception as e:  # noqa: BLE001
            q.fail_task(task["id"], repr(e), BATCH_ID)
            print(f"[{now_iso()}] [{WORKER_ID}] FAILED task {task['id']}: {e!r}", flush=True)
        last_work = time.time()


if __name__ == "__main__":
    main()
