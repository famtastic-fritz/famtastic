# 🏭 Agent Factory

A sandboxed, self-managing multi-agent system: a meta-orchestrator that spawns,
routes, monitors, and retires worker agents on its own to process a task queue
efficiently and cost-effectively — and tunes itself between batches.

Runs **fully offline** with the Python standard library. No keys, no spend, no
network. Everything lives inside this folder (see `SANDBOX.md`).

## One command
```bash
python3 run.py
```

## Run it autonomously (persistent daemon)
```bash
python3 orchestrator.py --forever        # never exits; keeps watching for work
python3 add_task.py triage "new job" 0.3 # inject work live, from another shell
touch data/STOP                          # graceful stop (or Ctrl-C / SIGTERM)
```
In `--forever` mode the supervisor self-schedules: it backs off to slow polling
when the queue is empty and tightens cadence when work piles up — picking up
newly-added tasks on its own.

## How it manages itself
| Capability | Where | What it does |
|------------|-------|--------------|
| Supervisor | `orchestrator.py` | reads queue, decides worker count, mints/spawns/monitors/retires workers, logs every decision to `logs/ORCHESTRATOR.log` |
| Task queue | `queue_db.py` (SQLite) | atomic claim/complete/fail; `seed_tasks.py` fills it |
| Worker agents | `worker_template.py` → `agents/worker_*.py` | minted from a template on demand; one task each, report + exit |
| Self-scheduling | `scheduler.py` | in-process adaptive cadence by queue depth — **never the OS crontab** |
| Model routing / cost | `router.py` + `models.py` | cheapest capable model per task; ledger in `logs/COSTS.log` |
| Self-improvement | `self_improve.py` | reviews each batch, tunes `config.json` within hard bounds, writes `LEARNINGS.md` |
| Action tasks | `actions.py` + `paypal.py` | side-effecting tasks; **PayPal invoice DRAFTS only** (never sent, never charged), stubbed offline |
| Observability | `dashboard.py` → `dashboard/index.html` | live status: agents, queue depth, throughput, cost |

## The proof job
The seeded tasks build the **complete go-to-market → sell → collect pipeline**
for selling FAMtastic Designs (a productized service). After a run, see
`deliverables/` for: business model, marketing, campaign plan, outreach system,
sales process + copy, and payment/fulfillment — all ready to use.

## Layout
```
agency-factory-side-work/
├── run.py                 # end-to-end entrypoint
├── orchestrator.py        # the supervisor
├── scheduler.py           # in-process adaptive scheduler
├── queue_db.py            # SQLite task queue
├── router.py / models.py  # model routing + cost control
├── worker_template.py     # template the orchestrator mints workers from
├── factory_lib.py         # shared worker processing logic
├── deliverables.py        # the actual work products (the proof)
├── actions.py             # side-effecting action tasks (dispatch)
├── paypal.py              # PayPal Invoicing v2 — DRAFT-ONLY (no send/charge)
├── self_improve.py        # bounded self-tuning loop
├── dashboard.py           # terminal + static HTML observability
├── seed_tasks.py          # injects sample/proof tasks
├── config.json            # tunable params (self-improvement edits these)
├── factory_paths.py       # sandbox path anchor + assert_inside guardrail
├── agents/                # minted worker agents (transient)
├── data/factory.db        # queue + batch state
├── deliverables/          # generated business pipeline docs
├── logs/                  # ORCHESTRATOR.log, COSTS.log
└── dashboard/index.html   # live dashboard
```

See `SETUP.md` to run, `SANDBOX.md` for isolation rules, `SUMMARY.md` for the
full writeup.
