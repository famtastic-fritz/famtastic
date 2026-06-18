# SETUP

Zero-dependency by design. Runs on Node.js (built-ins + experimental `node:sqlite`).

## Requirements
- Node.js >= 22 (uses `node:sqlite`, available in 22+). Check: `node --version`.
- No `npm install` needed for the factory itself. No external packages.

## Quick start
```bash
cd agent-factory

# 1. Seed the task queue with sample work (includes the NCS7 proof tasks)
node bin/seed.js

# 2. Run the orchestrator for one or more batches, then stop (great for a demo)
node bin/run.js --batches 3

#    ...or run it continuously as a long-lived supervisor:
node bin/run.js

# 3. See a live terminal readout any time (separate shell)
node bin/status.js

# 4. One-shot end-to-end proof (seed + run + dashboard + open report)
node bin/demo.js
```

The dashboard is written to `dashboard.html` after every batch. Open it in a
browser, or run `node bin/status.js` for the terminal version.

## Environment variables (`.env`, all optional)
Copy `.env.example` to `.env` and fill in only what you want. With **none** set,
the whole system runs fully offline using a deterministic LLM stub and modeled
costs — nothing is ever charged.

| Var | Purpose | Default if unset |
|-----|---------|------------------|
| `OPENROUTER_API_KEY` | Enables real model calls via OpenRouter | unset → **stub mode**, no network, no spend |
| `OPENROUTER_BASE_URL` | Override API base | `https://openrouter.ai/api/v1` |
| `FACTORY_MAX_CONCURRENCY` | Hard ceiling on concurrent workers | from `config/factory-config.json` |
| `PORT` | Port for the NCS7 CMS demo server | `4178` |

### Going live with real models
1. Get an OpenRouter key (https://openrouter.ai). Put it in `.env`.
2. `src/llm.js` automatically switches from stub to live calls when the key is
   present. Pricing in `config/models.json` is used for the cost ledger; update it
   to match current OpenRouter prices.
3. Nothing else changes — the router, queue, workers, and self-improvement loop
   are model-agnostic.

### Plugging in real task sources
The queue (`src/queue.js`) is a thin SQLite table. Any producer can insert rows:
- a webhook receiver, a cron feed, a CRM export, an email scraper, etc.
Just call `queue.enqueue({type, payload, priority})`. See `bin/seed.js` for shape.

## The NCS7 demo (the proof)
After a factory run, the assembled demo lives in `projects/ncs7/build/`. Run it:
```bash
node projects/ncs7/build/cms/server.js     # serves frontend + CMS + admin + tutor
# then open the printed URL (default http://localhost:4178)
# admin at http://localhost:4178/admin   (stub login: any user/pass)
```
See `assets/ncs7/README.md` for full details of the demo.
