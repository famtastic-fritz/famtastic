# Agent Factory

A sandboxed, self-managing multi-agent system. A long-running **orchestrator**
reads a **task queue**, decides how many and what kind of **worker agents** it
needs, **mints and spawns** them as child processes, **routes** each task to the
cheapest capable model, tracks **cost**, **retires** idle workers, then runs a
bounded **self-improvement** pass that tunes its own configuration between batches.
Everything is isolated inside this folder (see `SANDBOX.md`) and runs fully
offline with no spend (see `SETUP.md`).

```
seed → queue → orchestrator → route(model) → spawn worker → result + cost
                    ↑                                              │
              self-improve  ←──── batch stats ←───── monitor ──────┘
```

## Run it
```bash
node bin/seed.js              # inject sample tasks (incl. the NCS7 proof pipeline)
node bin/run.js --drain       # process until the queue is empty, then stop
node bin/run.js               # ...or run forever as a supervisor
node bin/status.js            # terminal readout + write dashboard.html
node bin/demo.js              # one-shot: reset → seed → run → dashboard
```

## What each piece is
| File | Role |
|------|------|
| `src/orchestrator.js` | Supervisor + in-process scheduler. Claims tasks, provisions/mints workers, routes, spawns, monitors, retires, records batches, triggers self-improvement. |
| `src/queue.js` | SQLite (`node:sqlite`) task queue + batch/exec records. |
| `src/router.js` | Per-task complexity estimate → cheapest capable model; writes the cost ledger. |
| `src/llm.js` | OpenRouter-style client. Live with a key; deterministic **offline stub** otherwise (no network, no spend). |
| `src/agents.js` | Worker **template** + programmatic mint / touch / retire. |
| `src/worker.js` | A spawned worker: takes ONE task, runs its skill, reports result+cost, exits. |
| `src/skills/*` | Task handlers: `prospect`, `analyze`, `propose`, `build-*`, `assemble`, generic. |
| `src/selfimprove.js` | Bounded tuner. Adjusts only `config/factory-config.json` within `_bounds`; logs to `LEARNINGS.md`. |
| `src/dashboard.js` | `dashboard.html` + terminal status. |
| `src/safepath.js` | Write-boundary enforcement — refuses any path outside this folder. |
| `config/factory-config.json` | Tunable params (concurrency, batch size, routing thresholds) + bounds. |
| `config/models.json` | Model catalog + pricing (tiers 1–3). |

## Outputs / proof
- `logs/ORCHESTRATOR.log` — every decision (mint, route, done, fail, retire, tune).
- `logs/COSTS.log` — per-task modeled cost ledger.
- `LEARNINGS.md` — per-batch self-improvement findings + config changes.
- `dashboard.html` — live status (auto-refresh).
- `docs/ncs7/` — discovery, audit, proposal artifacts (the business deliverables).
- `projects/ncs7/build/` — the assembled NCS7 demo (the "proof" project).

## The NCS7 proof
The seeded queue carries the full motion for the demo case
(https://www.nationalcadstandard.org/ncs7/): find look-alike prospects → audit the
site → propose a solution → build a React + 3D frontend, a simple CMS, an AI CMS
tutor, and a 3D CAD viewer → assemble. See `assets/ncs7/README.md` for the demo.
