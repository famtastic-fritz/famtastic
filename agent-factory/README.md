# 🏭 agent-factory

A self-contained, sandboxed **agent factory**: a meta-system that spawns,
manages, and retires worker agents on its own to process a task queue
efficiently and cost-effectively. It schedules itself, decides what agents it
needs, routes each task to the cheapest capable model, tracks a cost ledger,
and tunes its own parameters after each batch.

Runs **fully offline** on the Python standard library — nothing to install, no
credentials required, no live spend. See `SANDBOX.md` for the isolation
contract and `SETUP.md` to run it.

```bash
cd agent-factory && ./setup.sh && ./run.sh
```

## What's inside

- **Orchestrator** (`src/orchestrator.py`) — long-running supervisor with its
  own in-process scheduler (never touches system cron). Reads the queue,
  decides worker count from queue depth, mints workers from a template, spawns
  them as subprocesses, monitors and retires idle ones. Logs every decision to
  `logs/ORCHESTRATOR.log`.
- **Task queue** (`src/queue.py`) — SQLite with atomic claim; `seed.py` injects
  a sample batch immediately.
- **Worker agents** (`templates/worker_template.py` → `agents/worker_*.py`) —
  parameterized agents minted programmatically; each claims a task, routes it,
  does it, reports result + cost, and self-retires when idle.
- **Self-scheduling** — adaptive cadence: deeper queue → faster ticks → more
  workers, capped by config.
- **Model routing / cost control** (`src/router.py`) — cheapest-capable-model
  per task; running ledger in `logs/COSTS.log`.
- **Self-improvement** (`src/improve.py`) — after each batch, reviews success
  rate / cost / latency, writes `LEARNINGS.md`, and tunes `config.json`
  (bounded; core code never self-modified).
- **Observability** (`src/dashboard.py`) — `dashboard/status.html` + terminal
  readout.

## Proof task

The seeded batch's headline task builds a complete internal **business model +
end-to-end sales pipeline for selling FAMtastic Designs** — marketing →
campaigning → contacting (GoDaddy) → selling → payment collection (PayPal) —
with every assumption logged. It lands at
`outputs/famtastic-designs-business-model.md`. This is deliberate: the same
orchestrator that scales and cost-routes agents is the engine that would run
that revenue pipeline.
