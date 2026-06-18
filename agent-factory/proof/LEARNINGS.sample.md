# LEARNINGS.md — the factory's self-review journal

Each batch, `self_improve.review_and_tune()` appends a section below: what the
batch did (success rate, cost, latency, model mix) and which config knobs it
turned in response, with the reason. This is the human-readable companion to
`config.json → tuning_history`.

The knobs it may turn (and only these): `concurrency`,
`routing.complexity_threshold`, `poll_interval_seconds` — each clamped to the
bounds in `config.json`. Core logic is never modified.

<!-- batch entries are appended below this line -->

## Batch 1 — 2026-06-18T04:09:01.461Z
- Completed **20**, failed 0, success **100%**
- Spend $0.04124 (avg $0.00206/task), avg latency 67ms
- Model mix: {'worker-mid': 13, 'worker-strong': 7}
- Pending after batch: 0
- Adjustments:
  - avg cost $0.0021 well under target -> lower escalation bar 0.55→0.52 (allow more quality)
  - queue drained -> poll slower 2→3s
