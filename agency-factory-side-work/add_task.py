"""Inject a task into the live queue — for testing the persistent daemon.

    python3 add_task.py <type> "<title>" [complexity] [priority]
    python3 add_task.py business_model "New product business model" 0.8 1
    python3 add_task.py paypal_invoice_draft "Draft: Acme retainer" 0.4 1 \\
        --payload '{"recipient_email":"acme@x.com","item_name":"Retainer","unit_amount":1500}'

Add tasks while `orchestrator.py --forever` is running and watch it pick them up.
"""
from __future__ import annotations

import argparse
import json

import queue_db


def main() -> int:
    ap = argparse.ArgumentParser(description="Add a task to the factory queue")
    ap.add_argument("type", help="task type (e.g. business_model, triage, paypal_invoice_draft)")
    ap.add_argument("title", help="human-readable task title")
    ap.add_argument("complexity", nargs="?", type=float, default=0.5,
                    help="0..1, drives model routing (default 0.5)")
    ap.add_argument("priority", nargs="?", type=int, default=5,
                    help="lower = sooner (default 5)")
    ap.add_argument("--payload", default="{}", help="JSON payload string")
    args = ap.parse_args()

    try:
        payload = json.loads(args.payload)
    except json.JSONDecodeError as exc:
        print(f"Invalid --payload JSON: {exc}")
        return 1

    queue_db.init_db()
    task_id = queue_db.add_task(
        args.type, args.title, payload, args.priority, args.complexity
    )
    print(f"Queued task #{task_id}: [{args.type}] {args.title} "
          f"(complexity={args.complexity}, priority={args.priority})")
    print("Queue status:", queue_db.count_by_status())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
