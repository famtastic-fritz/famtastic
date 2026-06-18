# SUMMARY — FAMtastic Deal Engine

A sandboxed, self-managing multi-agent system that spawns, routes, monitors, and
retires worker agents to process a task queue cost-effectively, schedules itself,
and improves its own parameters over time. Built and run end-to-end, fully offline.

## What I built

| Component | Where | What it does |
|-----------|-------|--------------|
| **Orchestrator** | `dealengine/orchestrator.py` | Long-running supervisor. Reads queue, decides worker count from queue depth, spawns workers as subprocesses, monitors them (with timeout/kill), retires idle ones, logs every decision to `logs/ORCHESTRATOR.log`. |
| **Task queue** | `dealengine/db.py` | SQLite queue + ledger (tasks, runs, batches, config_history). Atomic claim so workers never double-process. |
| **Worker template** | `dealengine/worker.py` | Parameterized agent the orchestrator mints on demand. Claims one task, runs its handler, reports result + cost + latency, exits. Idle workers exit (rc=3) = retirement. |
| **Self-scheduling** | `dealengine/orchestrator.py` | In-process cadence loop. 1s when busy, 5s when idle. **No system crontab touched.** |
| **Model routing / cost control** | `dealengine/router.py` | Picks the cheapest tier whose capability covers a task's complexity. Free local tier for triage, hosted "cheap" tier on escalation, "strong" only when needed. Writes `logs/COSTS.log`. |
| **Self-improvement loop** | `dealengine/orchestrator.py` | After each batch scores success/cost/latency, writes `LEARNINGS.md`, and tunes `config.json` (concurrency, routing threshold, cadence). Bounded — config only, never code. |
| **Observability** | `dealengine/dashboard.py` | Terminal readout + auto-refreshing `public/dashboard.html`. |
| **Handlers (skills)** | `dealengine/handlers/` | The proof workload: `deal_finder`, `apparel_finder`, `marketing`, `campaign`, `outreach`, `sales`, `payment`. |

## How the self-management works

1. **Decide:** `decide_worker_count(depth)` = `ceil(depth / queue_depth_per_worker)`,
   clamped to `[min_concurrency, max_concurrency]` and a hard cap. Empty queue → 0 workers.
2. **Spawn & monitor:** workers are `subprocess.Popen` of the worker template; the
   orchestrator waits with a per-worker timeout and kills stragglers.
3. **Route:** each worker asks the router for the cheapest capable model; cost is
   estimated from token counts × per-1k tier price and logged.
4. **Self-improve:** each cycle, metrics → `LEARNINGS.md`; healthy throughput with
   backlog scales concurrency **up**; poor success scales it **down** and lowers the
   escalation threshold (more work to stronger models); cheap+successful raises the
   threshold (more work to the free tier). All changes recorded in `config_history`.
5. **Schedule itself:** cadence tightens under load, relaxes when idle; batch mode
   self-terminates when the queue drains and stays empty.

## Proof of run (measured, offline)

- Seeded **10 tasks**; orchestrator drained them over **8 cycles**.
- Spawned **>10 workers** across cycles, up to **3 concurrent**; idle workers retired.
- Self-improvement scaled `max_concurrency` **2 → 6** and tuned the routing
  threshold **0.55 → 0.75** as it learned the batch was cheap and reliable.
- **Routing:** 6 low-complexity tasks ran on the **free local tier ($0)**; 4
  high-complexity tasks escalated to the cheap hosted tier.
- **Total estimated spend: $0.00385** for the full batch.
- **Deliverables produced** in `business/`: FAMU cruise playbook (modeled **~48%
  off** a $3,800 quote / ~41% off the $4,500 quote, host-agency rebate ranked #1),
  FAMU formal-wear playbook (2 ladies + 1 gentleman), plus marketing, campaign,
  outreach (draft-only), sales close, and PayPal invoice plan.

Re-run any time: `cd deal-engine && ./bin/deal-engine demo`.

## How the proof task answers the brief

The prior research attempt burned a cron job concluding it "lacked tooling" and
only surfaced an agency login. This engine does the opposite:

- The **agency login is treated as the #1 lever** (host-agency commission rebate),
  not a footnote — that is the real cruise-savings unlock.
- The **contact mismatch** it found (phone `407.600.4565`, visible
  `ewilson1911@yahoo.com`, mailto `megamindzproductions@gmail.com`) is encoded as a
  hard **verify-before-send** gate in the outreach handler.
- Every deal task **emits an executable playbook** — never a "we lack tooling" answer.
- Triage runs on a **free local tier** to save cost; only hard reasoning escalates.
- The whole sell-it pipeline (marketing → collection) is modeled in
  `business/BUSINESS-MODEL.md` and `business/PIPELINE.md`, with PayPal/GoDaddy as
  documented, never-auto-spending inputs.

## Assumptions logged (lowest-risk fork taken at each)

1. **"Its own git repo"** → built as a self-contained module on the famtastic
   feature branch (reviewable; extractable via `git subtree split`). A nested
   `.git` would be invisible to review. (See `SANDBOX.md`.)
2. **Runtime** → Python 3 stdlib only (sqlite3 included). Zero pip dependencies so
   it runs anywhere offline. venv optional.
3. **Offline by default** → no API key present, so model calls are deterministic
   stubs with *estimated* costs. A hard switch (`DEAL_ENGINE_ALLOW_LIVE_CALLS=1`) plus a
   key is required for any live call, and live errors fall back to stub.
4. **Workers do one task each** (per the brief) rather than draining the queue, so
   load genuinely fans out across workers and cycles.
5. **No money movement, no mail send** — PayPal/GoDaddy/host-agency are documented
   inputs only; outreach is drafted, invoices are created (never captured).
6. **Cruise/apparel savings are modeled levers + percentages**, not live scraped
   prices (offline). A live data key attaches current quotes.
7. **Committed `config.json` is the clean baseline**; runtime tuning is captured in
   `LEARNINGS.md` and the `config_history` table, not baked into the committed file.

## How to extend

- **Real models:** fill `OPENROUTER_API_KEY` and/or `LOCAL_MODEL_URL` in `.env`, set
  `DEAL_ENGINE_ALLOW_LIVE_CALLS=1`. Edit tiers/prices in `config.json → routing.models`.
- **Real task sources:** replace `seed.py` with an adapter that enqueues from your
  source (webhook, CSV, email inbox, CRM). The queue API is `db.enqueue(kind, title,
  payload, complexity, priority)`.
- **New skills:** add a handler in `dealengine/handlers/` and register it in
  `handlers/__init__.py:REGISTRY`. Orchestrator/workers pick it up automatically.
- **Run continuously:** `./bin/deal-engine daemon` (in-process scheduler, self-tuning).
- **Go-live pipeline:** wire PayPal (invoice creation) + GoDaddy email + host-agency
  advisor credentials per `business/BUSINESS-MODEL.md §6`.

## Questions (only ones that change the next iteration)

1. **Live vs. simulated for the next pass** — do you want me to wire a real model
   key (OpenRouter and/or a local Ollama endpoint) so the next run produces live
   cruise/apparel quotes, or keep it fully offline/simulated?
2. **Real task source** — should the queue pull from a concrete source next (e.g. a
   GoDaddy inbox, a Google Sheet of trips, or the Eventbrite/TravelJoy organizer
   listing), and if so which one first?
3. **Host-agency lane** — is pursuing host-agency advisor credentials in scope for
   me to research and stand up (it's the #1 savings unlock), or is that a step you
   want to own personally?
