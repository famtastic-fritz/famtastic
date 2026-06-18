# Agent Factory

A sandboxed, self-managing **meta-system that spawns, manages, and retires
worker agents on its own** to process high volumes of tasks cheaply. It reads a
task queue, decides what kinds of agents it needs and how many, mints them from
a template, runs them as subprocesses, routes each task to the cheapest capable
model, tracks spend, and tunes its own parameters between batches.

It runs **fully offline with zero spend** by default — the model layer is
stubbed unless you explicitly opt into real API calls (see `SETUP.md`).

```
                          ┌──────────────────────────────────────────┐
   seed_tasks.py ───▶     │              TASK QUEUE (SQLite)         │
   enqueue() ─────▶       └──────────────────────────────────────────┘
                                         ▲           │ claim_next() (atomic)
                                         │           ▼
   ┌───────────────────────── ORCHESTRATOR (supervisor) ───────────────────────┐
   │  decide capacity ─ mint worker kinds ─ spawn subprocs ─ reap ─ retire idle │
   │  in-process SCHEDULER (no OS cron) ── adaptive cadence by queue depth       │
   │  after each batch ─▶ SELF-IMPROVEMENT ─▶ tune config.json (bounded)         │
   └───────────────┬───────────────────────────────────┬───────────────────────┘
                   │ spawns                             │ writes
                   ▼                                    ▼
        WORKER (from worker_template.py)         logs/ORCHESTRATOR.log
        router.route() ─▶ models.call()          COSTS.log · LEARNINGS.md
        cheap triage ─▶ escalate only if hard    dashboard/index.html
```

## Components

| File | Role |
|------|------|
| `orchestrator.py` | Long-running supervisor. Capacity decisions, spawning, monitoring, retiring, batch loop, serve loop. |
| `task_queue.py` | SQLite queue with atomic claim, stats, cost rollups. |
| `seed_tasks.py` | Injects sample tasks so there's work immediately. |
| `worker_template.py` | Template the factory mints concrete workers from. |
| `factory.py` | `mint_worker(kind)` — programmatically creates/ retires worker modules. |
| `router.py` | Cost-aware routing: cheap triage, escalate to strong only when complex. |
| `models.py` | OpenRouter-style model tiers; stubs calls offline; estimates cost. |
| `scheduler.py` | In-process recurring-job scheduler (never touches OS cron). |
| `self_improve.py` | Reviews each batch, tunes bounded config knobs, writes `LEARNINGS.md`. |
| `dashboard.py` | Terminal readout + static auto-refreshing HTML. |
| `core.py` | Shared paths, DB, logging, config, cost ledger, runtime state. |

## Quick start

```bash
cd agent-factory
python3 -m venv .venv            # one-time (no deps to install)
.venv/bin/python orchestrator.py --seed 8 --demo
.venv/bin/python dashboard.py
```

See **`SETUP.md`** to run the long-lived supervisor, go live with real models,
and connect real task sources. See **`SANDBOX.md`** for the containment rules.
See **`proof/`** for captured output from a real run.
