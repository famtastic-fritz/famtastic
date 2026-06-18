# LEARNINGS — self-improvement log

The orchestrator appends one entry per batch below. Each entry records measured
performance (success rate, cost, latency), what it concluded, and any parameter
it tuned (within the bounds in `config/factory-config.json`). Core code is never
modified — only configuration.

## 2026-06-18T09:59:45.883Z — batch #1
- processed: 6 · succeeded: 6 · failed: 0
- success rate: 100.0% · avg cost: $0.0016 · avg latency: 2ms · batch cost: $0.0098
- queue depth after: 24
- finding: Healthy with backlog of 24; scaling batch size and concurrency up for throughput.
- tuned **batch_size**: 6 → 8 (drain backlog faster)
- tuned **concurrency**: 2 → 3 (drain backlog faster)

## 2026-06-18T09:59:47.557Z — batch #2
- processed: 8 · succeeded: 8 · failed: 0
- success rate: 100.0% · avg cost: $0.0003 · avg latency: 1ms · batch cost: $0.0023
- queue depth after: 16
- finding: Healthy with backlog of 16; scaling batch size and concurrency up for throughput.
- tuned **batch_size**: 8 → 10 (drain backlog faster)
- tuned **concurrency**: 3 → 4 (drain backlog faster)

## 2026-06-18T09:59:50.754Z — batch #3
- processed: 10 · succeeded: 10 · failed: 0
- success rate: 100.0% · avg cost: $0.0000 · avg latency: 0ms · batch cost: $0.0000
- queue depth after: 6
- finding: Within all targets; no parameter changes.
- no config changes

## 2026-06-18T09:59:53.886Z — batch #4
- processed: 6 · succeeded: 6 · failed: 0
- success rate: 100.0% · avg cost: $0.0000 · avg latency: 0ms · batch cost: $0.0000
- queue depth after: 0
- finding: Queue empty; trimming concurrency back toward baseline.
- tuned **concurrency**: 4 → 3 (no backlog)
