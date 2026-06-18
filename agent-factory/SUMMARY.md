# SUMMARY — Agent Factory

A sandboxed, self-managing multi-agent system that spawns, routes, monitors, and
retires worker agents on its own to process a task queue efficiently and
cost-effectively. Built entirely inside `agent-factory/`, runs fully offline, no
spend. The "first task" — the [awesome-trading-agents](https://github.com/LLMQuant/awesome-trading-agents)
repo — is wired in as the seed workload it actually processes.

## What was built

| Component | File | What it does |
|-----------|------|--------------|
| **Orchestrator** | `src/orchestrator.py` | Long-running supervisor. In-process scheduler, decides worker count from queue depth, mints + spawns workers, monitors and retires them, runs the self-improvement pass. Logs every decision to `logs/ORCHESTRATOR.log`. |
| **Task queue** | `src/queue_db.py` | SQLite (`data/factory.db`, WAL). Atomic `claim_next` (BEGIN IMMEDIATE) so two workers never grab the same task. Tracks status, tier, model, cost, latency, confidence per task. |
| **Seeder** | `src/seed.py` + `tasks/seed_tasks.json` | Injects 16 sample tasks derived from the trading-agents list so the system has work immediately. |
| **Workers** | `src/worker.py` | Parameterized short-lived agent: claim one task, route, run, report result + cost, exit. Retires itself when the queue is empty or its quota is hit. |
| **Worker template** | `src/worker_template.py` | `mint_worker(spec)` writes a new standalone worker launcher into `workers/` at runtime — the orchestrator mints new agent variants programmatically. |
| **Model layer** | `src/llm.py` | OpenRouter-style `chat/completions` interface. Deterministic **offline stub** by default; real HTTP via stdlib `urllib` only when a key is present *and* `AGENT_FACTORY_LIVE=1`. Tiered price catalog. |
| **Router** | `src/router.py` | Scores task complexity, picks the **cheapest capable tier**, escalates one tier on low confidence, appends every call to `logs/COSTS.log`. |
| **Dashboard** | `src/dashboard.py` | Terminal readout + auto-refreshing `dashboard.html`: queue depth, active agents, throughput, total cost, tier usage. |
| **Smoke test** | `tests/smoke.py` | End-to-end assertion of the whole pipeline. |

## How the self-management works

**1. Self-scheduling (no system cron).** The orchestrator runs its own in-process
loop. Tick cadence adapts to queue depth: deep queue → as fast as 0.5s and spawn
aggressively; idle → backs off to 8s. The host crontab is never touched.

**2. Self-scaling.** Each tick it computes
`desired = ceil(pending / tasks_per_worker)` clamped to `concurrency`, spawns up
to that many workers, and lets idle workers retire themselves (a worker that
finds no task exits). It picks each new worker's **specialization** from the
pending task-type mix and mints a matching variant from the template.

**3. Cost control / model routing.** Simple work (triage, classify) runs on the
cheap nano model; extract/summarize on a mid Claude tier; compare/analyze on a
strong tier; synthesize/plan can reach frontier — and only a low-confidence
result escalates one tier. The cost ledger optimises for throughput-per-dollar.

**4. Self-improvement (bounded).** After each batch it measures success rate,
avg cost/task, latency, and tier usage; writes `LEARNINGS.md`; and tunes
`config.json` within hard `*_bounds` clamps — raise reliability (escalate sooner)
if success dips, cut cost (push cheaper, fewer spawn cycles) if over budget, or
buy throughput (more concurrency) when cheap and reliable. **It only edits config
values, never code.**

## Proof it runs

`./run.sh demo` was executed. Captured artifacts live in `proof/` (and
`LEARNINGS.md`). Headline numbers from that run:

- **16 tasks seeded → 16 done, 0 failed (100% success).**
- **6 worker agents minted + spawned** (W1–W6), each retiring on quota/idle —
  well past the "≥2" requirement. Minted files: `workers/worker_analysis.py`,
  `workers/worker_general.py`.
- **All four model tiers exercised** by the router:
  `triage` (3 tasks, $0.000029) · `standard` (5) · `strong` (6) · `frontier` (2).
- **Cost tracked**: total **$0.0981**, avg **$0.0061/task**, **163 tasks/$**.
- **Scheduler adapted cadence**: 0.50s while the queue was deep → 8.00s when idle.
- **One self-improvement pass ran** and tuned `concurrency 2 → 3` (logged in
  `LEARNINGS.md` and `proof/ORCHESTRATOR.log`).

Reproduce: `cd agent-factory && ./run.sh demo` then open `dashboard.html`, or
`./run.sh test` for the asserted smoke run.

## Assumptions logged (lowest-risk choices made without stopping)

1. **No nested git repo.** Delivered inside the `famtastic` monorepo on branch
   `claude/agent-factory-orchestrator-t605wf` so it is reviewable via PR; a nested
   `.git` would never reach review. The folder is fully self-contained and can be
   split out with `git subtree split --prefix=agent-factory`. (See `SANDBOX.md`.)
2. **Python 3.11 stdlib only**, with a `.venv/` for the isolated runtime — so the
   whole system runs offline with nothing to `pip install`.
3. **Offline stub is the default model backend.** Live calls require *both* a key
   and `AGENT_FACTORY_LIVE=1`, so real spend can never happen by accident.
4. **Model ids/prices in `MODEL_CATALOG` are illustrative** (cheap Llama for triage,
   Claude Haiku/Sonnet/Opus for the capable tiers). Update to match live pricing.
5. **Confidence is a deterministic proxy** in stub mode (tier + length). In live
   mode, replace `router._confidence` with a real self-rated/judge score.
6. **`config.json` is live-mutated by the self-improvement loop** and is shipped
   reflecting the proof run (concurrency 3, version 2). Hand-edit it to reset.
7. **Worker specialization is an orchestration-intent label** today; all workers
   pull from the shared priority queue. Type-affinity claiming is a documented
   extension point.
8. **Did not modify anything outside `agent-factory/`** — honoring the sandbox
   contract over the monorepo's broader doc-update conventions.

## How to extend it

- **Real models**: `cp .env.example .env`, set `OPENROUTER_API_KEY` and
  `AGENT_FACTORY_LIVE=1`. Point `OPENROUTER_BASE_URL` at any OpenAI-compatible
  endpoint (OpenRouter, local Ollama/vLLM). See `SETUP.md`.
- **Real task sources**: call `queue_db.enqueue(type, title, payload, priority)`
  from a webhook, file watcher, or poller instead of the static seed file. The
  orchestrator picks up new pending rows on its next tick.
- **Real workers**: replace the stub call in `src/llm.py` (already done by going
  live) and/or give each minted specialization its own system prompt + toolset in
  `worker_template.py`.
- **Smarter routing**: extend `router.score_complexity` and `MODEL_CATALOG`, or
  add a learned router that reads `COSTS.log` history.
- **Run continuously**: `./run.sh daemon` for the always-on supervisor.

---

## Three questions for the next iteration

1. **Live target** — when we go live, should the model layer route to **OpenRouter**
   (hosted, broad catalog) or a **local server** (Ollama/vLLM, zero marginal cost)?
   This decides which `OPENROUTER_BASE_URL` + catalog defaults I bake in next.
2. **Real workload** — should the next iteration ingest the actual
   awesome-trading-agents README on a schedule (fetch → diff → enqueue deep-dives
   on new/changed projects), or pull tasks from a different source (GitHub issues,
   a CSV, a queue you already have)?
3. **Worker autonomy** — do you want minted workers to become genuinely
   specialized (own prompts, own tools, type-affinity task claiming), or stay
   uniform agents differentiated only by the router? This is the biggest fork for
   how "multi-agent" the factory becomes.
