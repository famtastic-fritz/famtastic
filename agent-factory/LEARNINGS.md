# Agent Factory — Self-Improvement Learnings

Written by the orchestrator's self-improvement loop after each batch. Each entry records measured performance and the bounded config adjustments made for the next batch.

---

## 2026-06-18 07:57:02 — batch after 16 task(s)

- tasks: 16 | done: 16 | failed: 0 | success rate: 100.00%
- total cost: $0.098120 | avg cost/task: $0.006132
- avg latency: 66.9 ms | avg confidence: 0.879
- tier usage: {"frontier": {"n": 2, "cost": 0.06294}, "standard": {"n": 5, "cost": 0.003287}, "strong": {"n": 6, "cost": 0.031863}, "triage": {"n": 3, "cost": 2.9e-05}}
- **config adjustments for next batch:**
    - concurrency 2 -> 3 (cheap+reliable, add throughput)
- params now: concurrency=3, tasks_per_worker=3, strong_threshold=0.6, escalate_below=0.62

## 2026-06-18 10:22:15 — batch after 16 task(s)

- tasks: 16 | done: 16 | failed: 0 | success rate: 100.00%
- total cost: $0.098120 | avg cost/task: $0.006132
- avg latency: 67.1 ms | avg confidence: 0.879
- tier usage: {"frontier": {"n": 2, "cost": 0.06294}, "standard": {"n": 5, "cost": 0.003287}, "strong": {"n": 6, "cost": 0.031863}, "triage": {"n": 3, "cost": 2.9e-05}}
- **config adjustments for next batch:**
    - concurrency 3 -> 4 (cheap+reliable, add throughput)
- params now: concurrency=4, tasks_per_worker=3, strong_threshold=0.6, escalate_below=0.62

## 2026-06-18 10:22:22 — batch after 16 task(s)

- tasks: 16 | done: 16 | failed: 0 | success rate: 100.00%
- total cost: $0.098120 | avg cost/task: $0.006132
- avg latency: 67.1 ms | avg confidence: 0.879
- tier usage: {"frontier": {"n": 2, "cost": 0.06294}, "standard": {"n": 5, "cost": 0.003287}, "strong": {"n": 6, "cost": 0.031863}, "triage": {"n": 3, "cost": 2.9e-05}}
- **config adjustments for next batch:**
    - concurrency 4 -> 5 (cheap+reliable, add throughput)
- params now: concurrency=5, tasks_per_worker=3, strong_threshold=0.6, escalate_below=0.62

