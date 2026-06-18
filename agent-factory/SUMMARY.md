# SUMMARY — the agent factory

## What I built

A fully self-contained, sandboxed **agent factory** in `agent-factory/`: a
meta-system that spawns, manages, and retires worker agents on its own to drain
a task queue efficiently and cost-effectively. It runs **end-to-end offline** on
the Python standard library — no installs, no credentials, no live spend — and
it actually ran (proof below).

| Component | File | What it does |
| --- | --- | --- |
| **Orchestrator** | `src/orchestrator.py` | Long-running supervisor. Owns an **in-process scheduler** (min-heap of jobs — never the system cron). Reads the queue, decides worker count from queue depth, **mints** workers from a template, spawns them as subprocesses, monitors, reaps, and retires idle ones. Logs every decision to `logs/ORCHESTRATOR.log`. |
| **Task queue** | `src/queue.py` | SQLite with **atomic claim** (`BEGIN IMMEDIATE`) so concurrent workers never double-grab. `seed.py` injects a sample batch. |
| **Worker agents** | `templates/worker_template.py` → `agents/worker_*.py` | Parameterized agents minted **programmatically** by the orchestrator. Each claims a task, routes it to the cheapest capable model, runs the handler, writes an artifact, records cost, heartbeats, and **self-retires** when idle. |
| **Self-scheduling** | `src/orchestrator.py` (`_adaptive_tick`) | Cadence follows demand: deeper queue → faster ticks → more workers, capped by config. No external scheduler touched. |
| **Model routing / cost** | `src/router.py`, `src/llm.py` | Picks the cheapest model whose capability clears the bar the task's complexity demands. OpenRouter-style client, **stubbed offline** (real call only if `OPENROUTER_API_KEY` is set). Running ledger → `logs/COSTS.log`. |
| **Self-improvement** | `src/improve.py` | After each batch, reviews success rate / cost / latency, appends `LEARNINGS.md`, and **tunes `config.json` tunables only**, clamped to declared bounds. Core code is never self-modified. |
| **Observability** | `src/dashboard.py` | `dashboard/status.html` (auto-refresh) + terminal readout: active agents, queue depth, throughput, total cost. |

## How the self-management works

1. **Decide:** on each scheduler tick the orchestrator reads queue depth, maps it
   through `config.scaling.tiers` to a desired worker count, caps it at
   `tunables.max_workers`, and spawns the difference.
2. **Mint & spawn:** it writes a new `agents/worker_<id>.py` from the template
   (substituting id + specialty) and launches it as its own `python3`
   subprocess with a real PID it then monitors.
3. **Route & cost:** each worker asks `router.choose_model(complexity)` for the
   cheapest capable model. Triage/simple work rides `cheap/triage-haiku`; only
   hard work escalates to `mid/sonnet` or `strong/opus`. Every call is priced
   and logged.
4. **Retire:** idle workers self-retire after `idle_timeout_seconds`; the
   orchestrator reaps them and logs it.
5. **Self-schedule:** tick interval shortens when the queue is deep and relaxes
   when it drains — all inside the process.
6. **Self-improve:** when the batch fully drains, it compares **peak demand** vs
   capacity and reliability, then nudges `max_workers` and
   `routing_complexity_threshold` within bounds, writing the rationale to
   `LEARNINGS.md`.

## Proof it runs (canonical run `batch-20260618-081414`)

- Seeded **8 tasks**; orchestrator **minted + spawned 2 worker subprocesses**
  (pids 4638, 4639) which **shared the load** (w1: tasks 1,5,7 · w2: 2,3,4,6,8).
- **Routing differentiated:** `business_model` → `strong/opus` ($0.009525,
  478 ms); `proposal` → `mid/sonnet`; the five triage tasks → `cheap/triage-haiku`.
- **Cost ledger:** total **$0.012228**, avg $0.001529/task (`logs/COSTS.log`).
- **Throughput:** 8 done, 0 failed, **100% success**, avg latency 187 ms.
- Both workers **self-retired** on idle; orchestrator **reaped** them and ran a
  **self-improvement pass**: peak demand 8 exceeded capacity 2 at 100% success →
  raised `max_workers` 2→3; success ≥95% → raised routing threshold 0.55→0.6
  (push more work to the cheap lane). See `LEARNINGS.md` and the now-evolved
  `config.json`.
- Dashboard written to `dashboard/status.html`.

## The proof task (the deliverable you actually asked for)

The headline seeded task builds **`outputs/famtastic-designs-business-model.md`** —
a complete internal business model + end-to-end sales pipeline for selling
**FAMtastic Designs** as a product: offer/tier architecture, marketing,
campaigning, **contacting via GoDaddy custom domain/mailbox**, qualifying,
proposals, closing, and **payment collection via PayPal Business** (invoices +
deposit links + Care Plan subscriptions), plus a 30-day activation plan and a
risk register. It maps each pipeline stage onto a factory task type — because
the same orchestrator that cost-routes agents is the engine that would run that
revenue pipeline. The `vibe-serve` link in the brief is referenced as a pattern
for campaign landing/serve pages, non-blocking.

## Every assumption I logged

**Sandbox / build decisions** (also in `SANDBOX.md` / `LEARNINGS.md`):
- A **nested `.git` was avoided** so the folder stays reviewable on the parent
  branch; `./setup.sh init-repo` detaches it into its own repo on demand.
- **Stdlib-only Python** chosen for the strongest isolation (nothing to install).
- **LLM calls stubbed offline**; routing/cost math runs regardless of keys.
- I **built this directly rather than fanning out subagents** — lowest-risk for a
  self-contained code build where the deliverable *is* an orchestrator.
- **Commit messages kept clean of AI attribution** per the repo's CLAUDE.md
  commit policy (which explicitly overrides defaults).

**Business-model assumptions** (all marked **ASSUMPTION** inline, re-listed here):
- Pricing $900 / $2,400 / $4,800 + $79–199/mo Care Plan; >85% target gross margin.
- Target metrics: reply ≥6%, call-book ≥2%, close ≥25%, Care Plan attach ~40%.
- A dedicated outreach subdomain protects primary domain reputation; warm 2–3
  weeks, ≤20 sends/day/mailbox to start; SPF/DKIM/DMARC required.
- **GoDaddy SMTP is assumed available but flagged a deliverability risk** for
  cold volume — the `send` step is a pluggable interface so swapping to a
  dedicated cold-email ESP is config-only (non-blocking).
- PayPal Business credentials provided at activation; `PAYPAL_ENV=sandbox` until
  a refund/reconciliation policy exists. The factory never moves money on its own.

## How you extend it (real models, real task sources)

- **Real models:** put `OPENROUTER_API_KEY` in `.env`; `src/llm.py` switches to
  live calls. Edit `config.json` `models.catalog` with real model ids/prices —
  routing/cost logic is unchanged. See `SETUP.md`.
- **Real task sources:** anything that calls `queue.add_task(type, payload, …)`
  feeds the factory — a webhook, a CRM poll, a cron, an inbox. Replace `seed.py`
  with your ingestor.
- **Real integrations:** implement two adapter functions — `send_email(...)`
  (GoDaddy/ESP) and `create_invoice(...)` (PayPal) — and wire the PayPal
  `INVOICING.INVOICE.PAID` webhook to enqueue a `build` task. Documented in
  `SETUP.md`.
- **New worker types:** add a handler in `src/tasks/registry.py`; no orchestrator
  change needed.

---

## Three questions (only things that change the next iteration)

1. **Throughput target & budget:** what real daily task volume and monthly model
   budget should the factory optimize for? That sets the scaling tiers and the
   routing thresholds I'd tune toward (and whether `strong/opus` is ever allowed).
2. **Send infrastructure:** do you want me to wire the outreach `send` step to
   **GoDaddy SMTP directly**, or to a **dedicated cold-email ESP** behind the
   same `@famtasticdesigns.com` identity (my recommendation for deliverability)?
3. **Live money rails:** when you provide the PayPal Business credentials, should
   I build against **PayPal Sandbox first** (recommended) and gate the flip to
   `live` behind an explicit approval + reconciliation/refund policy?
