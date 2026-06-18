"""seed_tasks.py — inject sample tasks so the factory has work immediately.

Run: python seed_tasks.py [N]   (default: the built-in sample set)
The mix is deliberately varied in kind/complexity so the router and the
self-improvement loop have something interesting to react to.
"""
from __future__ import annotations

import sys

import task_queue

SAMPLE_TASKS = [
    ("triage",    "Sort this support ticket: 'app won't open after update'", 3),
    ("classify",  "Is this review positive or negative? 'Loved it, fast and cheap.'", 4),
    ("summarize", "Summarize: quarterly numbers were flat, churn down 2pts, hiring paused.", 5),
    ("summarize", "Summarize the meeting notes about the Q3 roadmap and staffing.", 5),
    ("research",  "Compare three approaches to rate-limiting an API and recommend one.", 6),
    ("research",  "Investigate why nightly batch latency doubled; propose root causes.", 6),
    ("codegen",   "Write a Python function that debounces calls with a 200ms window.", 7),
    ("codegen",   "Refactor a callback-pyramid into async/await and add error handling.", 7),
    ("triage",    "Route: 'billing charged me twice this month' — which queue?", 3),
    ("classify",  "Tag the intent of: 'how do I export my data to CSV?'", 4),
    ("summarize", "Condense a 5-paragraph incident report into 3 bullet points.", 5),
    ("research",  "Design a cost-aware model-routing policy for mixed task loads.", 8),
]


def seed(extra: int = 0) -> int:
    task_queue.init_db()
    n = 0
    for kind, prompt, prio in SAMPLE_TASKS:
        task_queue.enqueue(kind, prompt, prio)
        n += 1
    # Optional synthetic overflow to exercise concurrency scaling.
    for i in range(extra):
        kind = ["triage", "classify", "summarize", "research", "codegen"][i % 5]
        task_queue.enqueue(kind, f"Synthetic {kind} task #{i+1}", 5)
        n += 1
    return n


if __name__ == "__main__":
    extra = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    count = seed(extra)
    print(f"seeded {count} tasks")
    print(task_queue.counts())
