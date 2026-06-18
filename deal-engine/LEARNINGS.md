# LEARNINGS — Self-Improvement Log

The orchestrator appends a block here after every cycle's self-improvement pass.
It records batch performance and any bounded config tuning it applied. Tuning
touches `config.json` tunables only — never code.

## Seeded priors (from the prior FAMU research attempt — do not repeat its mistakes)
- The earlier cron job concluded it "lacked tooling" and produced no executable
  savings. Its ONE useful find was an **agency login** → that is the host-agency
  credential lane, the single biggest cruise-savings unlock. The deal_finder now
  treats it as the #1 lever instead of a footnote.
- Contact data was inconsistent on the organizer listing (phone 407.600.4565,
  visible email ewilson1911@yahoo.com, mailto megamindzproductions@gmail.com).
  The outreach handler now flags this mismatch and refuses to imply auto-send.
- Rule carried forward: **never resume from memory alone; never ship a "we lack
  tooling" non-answer.** Every deal task must emit an actionable playbook.

---

### Cycle 1 — 2026-06-18 17:18:59
- runs: 1 | success: 100% | failed: 0
- avg cost: $0.00094 | avg latency: 12ms | batch spend: $0.00094
- queue depth after batch: 10
- tuning applied:
  - `complexity_escalation_threshold` 0.75 → 0.8 — avg_cost $0.0009 & near-perfect success — favor cheaper tier

### Cycle 2 — 2026-06-18 17:19:00
- runs: 2 | success: 100% | failed: 0
- avg cost: $0.00099 | avg latency: 15ms | batch spend: $0.00198
- queue depth after batch: 8
- tuning applied: none (nominal)

### Cycle 3 — 2026-06-18 17:19:01
- runs: 2 | success: 100% | failed: 0
- avg cost: $0.00052 | avg latency: 16ms | batch spend: $0.00103
- queue depth after batch: 6
- tuning applied: none (nominal)

### Cycle 4 — 2026-06-18 17:19:02
- runs: 1 | success: 100% | failed: 0
- avg cost: $0.00000 | avg latency: 16ms | batch spend: $0.00000
- queue depth after batch: 5
- tuning applied: none (nominal)

### Cycle 5 — 2026-06-18 17:19:03
- runs: 2 | success: 100% | failed: 0
- avg cost: $0.00000 | avg latency: 17ms | batch spend: $0.00000
- queue depth after batch: 3
- tuning applied: none (nominal)

### Cycle 6 — 2026-06-18 17:19:04
- runs: 1 | success: 100% | failed: 0
- avg cost: $0.00094 | avg latency: 14ms | batch spend: $0.00094
- queue depth after batch: 2
- tuning applied: none (nominal)

### Cycle 7 — 2026-06-18 17:19:06
- runs: 1 | success: 100% | failed: 0
- avg cost: $0.00000 | avg latency: 12ms | batch spend: $0.00000
- queue depth after batch: 1
- tuning applied: none (nominal)

### Cycle 8 — 2026-06-18 17:19:07
- runs: 1 | success: 100% | failed: 0
- avg cost: $0.00000 | avg latency: 20ms | batch spend: $0.00000
- queue depth after batch: 0
- tuning applied: none (nominal)

### Cycle 9 — 2026-06-18 17:19:12
- runs: 0 | success: 100% | failed: 0
- avg cost: $0.00000 | avg latency: 0ms | batch spend: $0.00000
- queue depth after batch: 0
- tuning applied: none (nominal)

### Cycle 10 — 2026-06-18 17:19:17
- runs: 0 | success: 100% | failed: 0
- avg cost: $0.00000 | avg latency: 0ms | batch spend: $0.00000
- queue depth after batch: 0
- tuning applied: none (nominal)
