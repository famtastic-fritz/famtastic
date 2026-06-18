# Agent Factory

A sandboxed, **self-managing multi-agent system**. A long-running orchestrator
reads a task queue, decides how many and what kind of worker agents to spawn,
mints them from a template, routes each task to the cheapest capable model,
tracks cost, retires idle workers, and tunes its own parameters after each batch.

Everything runs **fully offline by default** — no API key, no spend. See
[SANDBOX.md](SANDBOX.md) for the containment contract and [SETUP.md](SETUP.md)
to wire real models later.

## Quickstart

```bash
cd agent-factory
./run.sh demo      # fresh seed -> orchestrator drains the queue -> dashboard
```

Or step by step:

```bash
./run.sh seed      # inject sample tasks (from the awesome-trading-agents repo)
./run.sh run       # orchestrator processes the queue, then exits (drain mode)
./run.sh status    # terminal readout + writes dashboard.html
./run.sh daemon    # long-running supervisor (Ctrl-C to stop)
./run.sh test      # end-to-end smoke test
```

No venv? `run.sh` falls back to system `python3`. The system needs only the
Python 3.11 standard library.

## How it works

| Component | File | Role |
|-----------|------|------|
| Task queue | `src/queue_db.py` | SQLite; atomic `claim_next` so workers never collide |
| Seeder | `src/seed.py` + `tasks/seed_tasks.json` | injects sample work immediately |
| Model layer | `src/llm.py` | OpenRouter-style; deterministic offline stub by default |
| Router | `src/router.py` | scores complexity, picks cheapest capable tier, escalates once if low-confidence, logs `COSTS.log` |
| Worker | `src/worker.py` | claims 1 task, routes, runs, reports, exits; retires when idle |
| Template | `src/worker_template.py` | orchestrator **mints** worker variants into `workers/` on demand |
| Orchestrator | `src/orchestrator.py` | in-process scheduler, dynamic spawn/retire, self-improvement loop |
| Dashboard | `src/dashboard.py` | terminal readout + `dashboard.html` |

### Self-management

- **Scheduling** is an in-process loop (no system cron). Cadence shortens when the
  queue is deep and backs off when idle.
- **Scaling**: desired worker count = `ceil(pending / tasks_per_worker)` clamped to
  `concurrency`. Workers retire themselves when the queue empties.
- **Cost control**: cheap triage model for simple tasks; stronger Claude tiers only
  when complexity warrants, with a single low-confidence escalation.
- **Self-improvement**: after a batch, it measures success/cost/latency, writes
  `LEARNINGS.md`, and tunes `config.json` within hard min/max clamps — never code.

See [SUMMARY.md](SUMMARY.md) for the full design write-up and extension guide.
