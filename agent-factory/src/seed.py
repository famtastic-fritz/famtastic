"""Seed the task queue with sample work so the factory has something to do.

Loads tasks/seed_tasks.json (work derived from the awesome-trading-agents repo)
and enqueues each one. Idempotent-ish: pass --fresh to wipe existing tasks first.
"""
import argparse
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from src import queue_db  # noqa: E402

SEED_FILE = os.path.join(ROOT, "tasks", "seed_tasks.json")


def seed(fresh=False):
    queue_db.init_db()
    if fresh:
        import sqlite3
        conn = sqlite3.connect(queue_db.DB_PATH)
        conn.execute("DELETE FROM tasks")
        conn.commit()
        conn.close()
        print("Wiped existing tasks.")

    with open(SEED_FILE) as f:
        data = json.load(f)

    n = 0
    for t in data["tasks"]:
        queue_db.enqueue(
            task_type=t["type"],
            title=t["title"],
            payload=t.get("payload", {}),
            priority=t.get("priority", 5),
        )
        n += 1
    print(f"Seeded {n} task(s) from {os.path.relpath(SEED_FILE, ROOT)}")
    print("Queue:", queue_db.counts())
    return n


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--fresh", action="store_true", help="wipe existing tasks first")
    args = p.parse_args()
    seed(fresh=args.fresh)
