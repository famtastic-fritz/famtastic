# SETUP — Agent Factory

Zero-dependency. Python 3.9+ standard library only. Runs fully offline.

## Quick start (offline, no keys)

```bash
cd agent-factory

# optional isolated env (no packages needed, but keeps it tidy)
python3 -m venv .venv && source .venv/bin/activate

# seed work, run the self-managing orchestrator, see the dashboard
./bin/factory demo
```

`demo` = `seed --reset` → `run` (orchestrator spawns workers, routes, logs cost,
self-improves, self-terminates) → terminal dashboard + `public/dashboard.html`.

## Individual commands

```bash
./bin/factory seed --reset           # inject sample tasks
./bin/factory run --max-cycles 8     # batch run, self-terminating when drained
./bin/factory once                   # single cycle
./bin/factory daemon                 # run forever, self-scheduling (Ctrl-C)
./bin/factory worker --worker-id w1  # mint one worker by hand
./bin/factory status                 # terminal dashboard
./bin/factory dashboard --html       # + write public/dashboard.html
```

Open the dashboard in a browser:
```bash
open public/dashboard.html        # macOS
xdg-open public/dashboard.html    # Linux
```

## Going live (optional — still no money movement)

Everything below is optional. Missing keys never block a run.

1. `cp .env.example .env` and fill what you have.
2. **Model calls:** set `OPENROUTER_API_KEY` (cloud) and/or `LOCAL_MODEL_URL`
   (Ollama/llama.cpp for the free local tier). Then set
   `FACTORY_ALLOW_LIVE_CALLS=1` — the hard safety switch. Without it, the router
   stays in stub mode no matter what keys exist. Any live-call error falls back
   to stub, so the system never breaks.
3. **Cost tiers** live in `config.json → routing.models`. Edit model ids and
   per-1k prices to match your provider. The router always picks the cheapest
   tier whose `max_capability` covers the task's complexity.

### Business-pipeline secrets (documented, never used for live spend)
`PAYPAL_*`, `GODADDY_*`, `OUTREACH_FROM_EMAIL` are placeholders for the
deal-finding product pipeline. Even when filled, this sandbox only **drafts**
outreach and **describes** invoice creation — it never sends mail or captures
funds. See `business/PIPELINE.md` and `SANDBOX.md`.

## Files & logs
- `logs/ORCHESTRATOR.log` — every orchestrator + worker decision (gitignored)
- `logs/COSTS.log` — per-call cost ledger, JSONL (gitignored)
- `LEARNINGS.md` — self-improvement findings, appended each cycle
- `data/factory.db` — SQLite queue + ledger (gitignored)
- `business/*.md` — deliverables produced by the deal/marketing/sales handlers
