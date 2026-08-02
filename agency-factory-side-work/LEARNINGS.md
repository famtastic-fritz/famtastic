# LEARNINGS — Agent Factory self-improvement log

> Auto-appended after every batch by `self_improve.run_pass`. Each
> entry records the metrics observed and any bounded config changes
> made for the next batch. Core code is never modified here.

## 2026-06-18T09:12:11 — self-improvement pass (wave-1)

- Tasks: 10 total · 2 done · 0 failed · 8 pending
- Success rate: **100%** · avg latency: 0.0s
- Cost: **$0.0274** total · $0.0137/task · ledger total $0.0274
- Parameter changes applied (bounded):
    - `concurrency.current_max`: 2 → 3 — success 100% >= target and 8 tasks waiting; scale up
    - `scheduler.base_interval_seconds`: 4 → 3 — deep backlog; tighten cadence

## 2026-06-18T09:12:12 — self-improvement pass (wave-2)

- Tasks: 10 total · 5 done · 0 failed · 5 pending
- Success rate: **100%** · avg latency: 0.0s
- Cost: **$0.0435** total · $0.0087/task · ledger total $0.0435
- Parameter changes applied (bounded):
    - `concurrency.current_max`: 3 → 4 — success 100% >= target and 5 tasks waiting; scale up
    - `routing.complexity_threshold`: 0.55 → 0.5 — cost/task $0.0087 well under target; allow stronger models

## 2026-06-18T09:12:14 — self-improvement pass (wave-3)

- Tasks: 10 total · 9 done · 0 failed · 1 pending
- Success rate: **100%** · avg latency: 0.0s
- Cost: **$0.0585** total · $0.0065/task · ledger total $0.0585
- Parameter changes applied (bounded):
    - `routing.complexity_threshold`: 0.5 → 0.45 — cost/task $0.0065 well under target; allow stronger models

## 2026-06-18T09:12:23 — self-improvement pass (wave-4)

- Tasks: 10 total · 10 done · 0 failed · 0 pending
- Success rate: **100%** · avg latency: 0.0s
- Cost: **$0.0587** total · $0.0059/task · ledger total $0.0587
- Parameter changes applied (bounded):
    - `routing.complexity_threshold`: 0.45 → 0.4 — cost/task $0.0059 well under target; allow stronger models
    - `scheduler.base_interval_seconds`: 3 → 4 — queue drained; relax cadence

## 2026-06-18T09:12:35 — self-improvement pass (wave-5)

- Tasks: 10 total · 10 done · 0 failed · 0 pending
- Success rate: **100%** · avg latency: 0.0s
- Cost: **$0.0587** total · $0.0059/task · ledger total $0.0587
- Parameter changes applied (bounded):
    - `routing.complexity_threshold`: 0.4 → 0.35 — cost/task $0.0059 well under target; allow stronger models
    - `scheduler.base_interval_seconds`: 4 → 5 — queue drained; relax cadence

## 2026-06-18T09:12:50 — self-improvement pass (wave-6)

- Tasks: 10 total · 10 done · 0 failed · 0 pending
- Success rate: **100%** · avg latency: 0.0s
- Cost: **$0.0587** total · $0.0059/task · ledger total $0.0587
- Parameter changes applied (bounded):
    - `routing.complexity_threshold`: 0.35 → 0.3 — cost/task $0.0059 well under target; allow stronger models
    - `scheduler.base_interval_seconds`: 5 → 6 — queue drained; relax cadence

## 2026-06-18T09:29:15 — self-improvement pass (wave-1)

- Tasks: 12 total · 4 done · 0 failed · 8 pending
- Success rate: **100%** · avg latency: 0.0s
- Cost: **$0.0373** total · $0.0093/task · ledger total $0.0373
- Parameter changes applied (bounded):
    - `concurrency.current_max`: 4 → 5 — success 100% >= target and 8 tasks waiting; scale up
    - `scheduler.base_interval_seconds`: 6 → 5 — deep backlog; tighten cadence

## 2026-06-18T09:29:16 — self-improvement pass (wave-2)

- Tasks: 12 total · 9 done · 0 failed · 3 pending
- Success rate: **100%** · avg latency: 0.0s
- Cost: **$0.0762** total · $0.0085/task · ledger total $0.0762
- No parameter changes — system within targets.

## 2026-06-18T09:29:20 — self-improvement pass (wave-3)

- Tasks: 12 total · 12 done · 0 failed · 0 pending
- Success rate: **100%** · avg latency: 0.0s
- Cost: **$0.0769** total · $0.0064/task · ledger total $0.0769
- Parameter changes applied (bounded):
    - `scheduler.base_interval_seconds`: 5 → 6 — queue drained; relax cadence

## 2026-06-18T09:29:38 — self-improvement pass (wave-4)

- Tasks: 12 total · 12 done · 0 failed · 0 pending
- Success rate: **100%** · avg latency: 0.0s
- Cost: **$0.0769** total · $0.0064/task · ledger total $0.0769
- Parameter changes applied (bounded):
    - `scheduler.base_interval_seconds`: 6 → 7 — queue drained; relax cadence

## 2026-06-18T09:29:59 — self-improvement pass (wave-5)

- Tasks: 12 total · 12 done · 0 failed · 0 pending
- Success rate: **100%** · avg latency: 0.0s
- Cost: **$0.0769** total · $0.0064/task · ledger total $0.0769
- Parameter changes applied (bounded):
    - `scheduler.base_interval_seconds`: 7 → 8 — queue drained; relax cadence

## 2026-06-18T09:30:23 — self-improvement pass (wave-6)

- Tasks: 12 total · 12 done · 0 failed · 0 pending
- Success rate: **100%** · avg latency: 0.0s
- Cost: **$0.0769** total · $0.0064/task · ledger total $0.0769
- Parameter changes applied (bounded):
    - `scheduler.base_interval_seconds`: 8 → 9 — queue drained; relax cadence

## 2026-06-18T14:38:35 — self-improvement pass (wave-1)

- Tasks: 12 total · 5 done · 0 failed · 7 pending
- Success rate: **100%** · avg latency: 0.0s
- Cost: **$0.0473** total · $0.0095/task · ledger total $0.0473
- Parameter changes applied (bounded):
    - `concurrency.current_max`: 5 → 6 — success 100% >= target and 7 tasks waiting; scale up
    - `scheduler.base_interval_seconds`: 9 → 8 — deep backlog; tighten cadence

## 2026-06-18T14:38:36 — self-improvement pass (wave-2)

- Tasks: 12 total · 11 done · 0 failed · 1 pending
- Success rate: **100%** · avg latency: 0.0s
- Cost: **$0.0767** total · $0.0070/task · ledger total $0.0767
- No parameter changes — system within targets.

## 2026-06-18T14:39:00 — self-improvement pass (wave-3)

- Tasks: 12 total · 12 done · 0 failed · 0 pending
- Success rate: **100%** · avg latency: 0.0s
- Cost: **$0.0769** total · $0.0064/task · ledger total $0.0769
- Parameter changes applied (bounded):
    - `scheduler.base_interval_seconds`: 8 → 9 — queue drained; relax cadence

## 2026-06-18T14:39:27 — self-improvement pass (wave-4)

- Tasks: 12 total · 12 done · 0 failed · 0 pending
- Success rate: **100%** · avg latency: 0.0s
- Cost: **$0.0769** total · $0.0064/task · ledger total $0.0769
- Parameter changes applied (bounded):
    - `scheduler.base_interval_seconds`: 9 → 10 — queue drained; relax cadence

## 2026-06-18T14:39:57 — self-improvement pass (wave-5)

- Tasks: 12 total · 12 done · 0 failed · 0 pending
- Success rate: **100%** · avg latency: 0.0s
- Cost: **$0.0769** total · $0.0064/task · ledger total $0.0769
- Parameter changes applied (bounded):
    - `scheduler.base_interval_seconds`: 10 → 11 — queue drained; relax cadence

## 2026-06-18T14:40:27 — self-improvement pass (wave-6)

- Tasks: 12 total · 12 done · 0 failed · 0 pending
- Success rate: **100%** · avg latency: 0.0s
- Cost: **$0.0769** total · $0.0064/task · ledger total $0.0769
- Parameter changes applied (bounded):
    - `scheduler.base_interval_seconds`: 11 → 12 — queue drained; relax cadence

## 2026-06-18T14:41:36 — self-improvement pass (wave-2)

- Tasks: 13 total · 13 done · 0 failed · 0 pending
- Success rate: **100%** · avg latency: 0.0s
- Cost: **$0.0771** total · $0.0059/task · ledger total $0.0771
- Parameter changes applied (bounded):
    - `scheduler.base_interval_seconds`: 12 → 13 — queue drained; relax cadence

## 2026-06-18T14:42:07 — self-improvement pass (wave-3)

- Tasks: 14 total · 14 done · 0 failed · 0 pending
- Success rate: **100%** · avg latency: 0.071s
- Cost: **$0.0771** total · $0.0055/task · ledger total $0.0771
- Parameter changes applied (bounded):
    - `scheduler.base_interval_seconds`: 13 → 14 — queue drained; relax cadence
