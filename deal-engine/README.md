# FAMtastic Deal Engine

A sandboxed, self-managing multi-agent system. A long-running **orchestrator**
reads a **task queue**, decides how many **worker agents** to spawn, routes each
task to the **cheapest capable model**, tracks a **cost ledger**, runs a bounded
**self-improvement loop** that tunes its own config, and exposes an
**observability dashboard** — all inside `deal-engine/`, fully offline by default.

```bash
cd deal-engine
./bin/deal-engine demo        # seed → orchestrate → dashboard, end to end
```

## What's inside

| Component | File | Role |
|-----------|------|------|
| Orchestrator | `dealengine/orchestrator.py` | supervisor + in-process scheduler + self-improvement |
| Task queue | `dealengine/db.py` | SQLite queue + run/cost/batch ledger |
| Worker template | `dealengine/worker.py` | parameterized agent: claim task → run → report → exit |
| Model router | `dealengine/router.py` | cheapest-capable-model routing, cost ledger, offline stub |
| Handlers (skills) | `dealengine/handlers/` | deal-finder, marketing, outreach, sales, payment |
| Seed | `dealengine/seed.py` | injects the proof workload |
| Dashboard | `dealengine/dashboard.py` | terminal + static HTML status |
| CLI | `bin/deal-engine` | one entrypoint for everything |

## The proof workload

The seeded tasks are a real business case: a **FAMU alumni cruise quoted $4,500
for 3** and **FAMU-inspired formal wear for two ladies + one gentleman**, plus the
full sell-it pipeline (marketing → campaign → outreach → sales → payment). The
engine processes them and writes executable savings playbooks to `business/`.

See `SANDBOX.md` (boundaries), `SETUP.md` (run it / go live), `SUMMARY.md`
(what was built + how to extend), and `business/BUSINESS-MODEL.md`.
