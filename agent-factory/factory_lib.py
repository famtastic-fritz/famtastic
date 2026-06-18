"""Shared worker logic. Minted worker agents import this so the template stays
tiny and the orchestrator can mint new workers programmatically without
duplicating processing code.
"""
from __future__ import annotations

import json
import re
import time

import queue_db
import router
from deliverables import generate
from factory_paths import DELIVERABLES_DIR, assert_inside


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:50] or "task"


def process_claimed(task_id: int, worker_id: str) -> dict:
    """Process a task that the orchestrator already claimed for `worker_id`.

    Returns a result dict. Writes the deliverable, accounts cost, updates DB.
    """
    with queue_db.connect() as conn:
        row = conn.execute("SELECT * FROM tasks WHERE id=?", (task_id,)).fetchone()
        task = dict(row) if row else None
    if task is None:
        return {"ok": False, "error": f"task {task_id} not found"}

    payload = json.loads(task.get("payload") or "{}")

    try:
        # 1. Route to the cheapest capable model.
        decision = router.route(task)

        # 2. Produce the deliverable (this is the "model output").
        t0 = time.time()
        content = generate(task["type"], payload, task["title"])
        elapsed = time.time() - t0

        # 3. Write deliverable inside the sandbox.
        fname = f"{task['id']:03d}-{_slug(task['title'])}.md"
        out_path = DELIVERABLES_DIR / fname
        assert_inside(out_path)
        out_path.write_text(content, encoding="utf-8")

        # 4. Account for cost as if it were a real model call.
        prompt = f"TASK: {task['title']}\nTYPE: {task['type']}\nPAYLOAD: {payload}"
        call = router.call_model(decision["model"], prompt, content)
        cumulative = router.record_cost(task["id"], task["type"], call)

        # 5. Mark done.
        queue_db.complete_task(
            task["id"], str(out_path.relative_to(DELIVERABLES_DIR.parent)),
            call["model"], call["cost_usd"],
        )
        return {
            "ok": True,
            "task_id": task["id"],
            "worker_id": worker_id,
            "model": call["model"],
            "tier": decision["tier"],
            "mode": call["mode"],
            "cost_usd": call["cost_usd"],
            "cumulative_usd": cumulative,
            "latency_s": round(elapsed, 3),
            "deliverable": str(out_path.relative_to(DELIVERABLES_DIR.parent)),
            "routing_reason": decision["reason"],
        }
    except Exception as exc:  # noqa: BLE001 - workers must fail gracefully
        queue_db.fail_task(task["id"], str(exc))
        return {"ok": False, "task_id": task["id"], "error": str(exc)}
