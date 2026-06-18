# LEARNINGS — agent factory self-improvement journal

Auto-appended after every batch. The orchestrator reads its own
performance and tunes `config.json` tunables (bounded). Core code is
never self-modified — only numeric config moves, and only within the
min/max bounds declared in config.json.

## Design decisions (human-seeded)
- Nested `.git` avoided so the sandbox stays reviewable on the parent
  branch; `setup.sh init-repo` detaches it on demand.
- Stdlib-only Python → strongest isolation (nothing to install).
- LLM layer stubbed offline; routing/cost math runs regardless of keys.

---

## 2026-06-18T08:14:21 — batch `batch-20260618-081414`
- **Throughput:** 8 done, 0 failed, success 100%
- **Cost:** total $0.012234, avg $0.001529/task
- **Latency:** avg 187 ms
- **Tuning:** `max_workers` 2 → 3, `routing_complexity_threshold` 0.55 → 0.6
  - peak demand 8 exceeded capacity 2 at 100% success → raise max_workers to 3
  - success 100% ≥95% → raise routing threshold to 0.6 (more triage on cheap model, lower $)
