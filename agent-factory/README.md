# Agent Factory

A sandboxed, self-managing multi-agent system. A long-running **orchestrator**
reads a **task queue**, decides how many **worker agents** to spawn, mints them
from a template as real OS subprocesses, routes each task to the **cheapest
capable model**, tracks a **cost ledger**, **schedules itself** (in-process, no
system cron), and after every batch runs a bounded **self-improvement loop** that
tunes its own config for better throughput-per-dollar.

It runs **fully offline with zero dependencies** (Python 3.8+ stdlib). All model
calls are stubbed; no money ever moves. See `SANDBOX.md` for the containment
contract and `SETUP.md` to run it and wire real models/sources later.

```
                +-------------------+
   seed_tasks ->|    TASK QUEUE     |<--- complete --- workers
                |  (SQLite, WAL)    |
                +---------+---------+
                          | claim / depth
                          v
                +-------------------+   spawn (subprocess)   +-----------+
                |   ORCHESTRATOR    |----------------------->| worker N  |
                |  scale + monitor  |<----- reap / retire ---| (1 task)  |
                |  + scheduler      |                        +-----------+
                +----+---------+----+                              |
        per batch    |         |  route (cheapest capable)         v
                     v         +---------------------------> ROUTER -> ledger
              SELF-IMPROVE                                   (COSTS.log)
            (tunes config.json)
                     |
                     v
              LEARNINGS.md  +  dashboard/status.html  +  logs/ORCHESTRATOR.log
```

## Quick start
```bash
cd agent-factory
python3 run_demo.py          # end-to-end proof
python3 tests/test_smoke.py  # tests
```

## Layout
| Path | Role |
|------|------|
| `src/orchestrator.py` | supervisor: scale / spawn / monitor / retire / drive batches |
| `src/scheduler.py` | in-process cadence (sleep + desired-workers by queue depth) |
| `src/worker.py` | spawnable worker agent (claims one task, runs it, reports, exits) |
| `src/router.py` | model routing + cost control (stubbed OpenRouter, hard spend cap) |
| `src/queue.py` / `src/db.py` | SQLite task queue, ledger, agent registry, runs |
| `src/ledger.py` | running cost ledger -> `logs/COSTS.log` |
| `src/improve.py` | bounded self-improvement loop -> tunes `config.json`, writes `LEARNINGS.md` |
| `src/handlers.py` | task work; generates the proof deliverables under `deliverables/` |
| `src/dashboard.py` | terminal readout + static `dashboard/status.html` |
| `seed_tasks.py` | injects the proof job + a sample burst |
| `run_demo.py` | the one-command proof run |
| `config.json` | tunable params + guardrails (mutated by the self-improvement loop) |

## The first job (proof of work)
The factory's seeded first job is a real deliverable set for selling **FAMtastic
Designs**: a full business model + 7-stage sales pipeline, the Claude Code prompt
builder (spec + runnable), a from-scratch **Shay-Shay v2** spec, an 8-agent
inspiration synthesis, an Odysseus optimization plan, and a system-improvement
audit. All land in `deliverables/`.
