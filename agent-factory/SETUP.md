# SETUP.md — running the agent factory

Everything is stdlib Python 3.9+. No third-party packages are required to run
the system fully offline.

## 1. Environment

A venv already exists at `./.venv` (created during build, gitignored). To make
a fresh one:

```bash
cd agent-factory
python3 -m venv .venv
# no `pip install` needed — the system uses only the standard library
```

All commands below assume `./.venv/bin/python` (or just `python` with the venv
active).

## 2. Seed work and run the demo (offline, zero spend)

```bash
# Drain the queue once: spawns workers, routes, logs cost, runs one
# self-improvement pass, writes the dashboard, exits.
.venv/bin/python orchestrator.py --seed 8 --demo
```

`--seed N` enqueues the 12 built-in sample tasks plus `N` synthetic ones.

## 3. Run the long-lived supervisor

```bash
# Run forever (Ctrl-C to stop). The in-process scheduler drives draining,
# self-improvement, dashboard refresh, and adaptive cadence.
.venv/bin/python orchestrator.py --seed 12 --serve

# Or bound it to a time budget (useful for testing):
.venv/bin/python orchestrator.py --seed 12 --serve --seconds 30
```

Add more work at any time from another shell:

```bash
.venv/bin/python -c "import task_queue as q; q.enqueue('research','New task here',6)"
```

## 4. Watch it

```bash
# Terminal readout (also re-renders the HTML):
.venv/bin/python dashboard.py

# Live HTML dashboard (auto-refreshes every 3s, no server needed):
open dashboard/index.html        # macOS
xdg-open dashboard/index.html    # Linux
```

Logs and ledgers:
- `logs/ORCHESTRATOR.log` — every orchestrator decision
- `COSTS.log` — JSONL cost ledger (one line per model call batch)
- `LEARNINGS.md` — self-review journal, appended per batch
- `config.json → tuning_history` — machine-readable record of every knob change

Sample copies of all of these from a real run are committed under `proof/`.

## 5. Going live with real models (optional, opt-in, costs money)

The model layer (`models.py`) speaks an OpenRouter-style chat-completions API.
By default every call is **stubbed** so nothing leaves the machine.

To enable real calls:

```bash
cp .env.example .env
# edit .env:
#   OPENROUTER_API_KEY=sk-or-...   <-- your key
#   FACTORY_LIVE=1                 <-- master switch (default 0 keeps it mocked)
```

Two safeties must both be satisfied (`live_mode()` in `models.py`): a key must
be present **and** `FACTORY_LIVE=1`. Otherwise calls stay stubbed even with a
key, so you can't spend by accident.

The internal tier names map to real model slugs in `models._real_call()`:

| internal tier   | role             | example slug                  |
|-----------------|------------------|-------------------------------|
| `triage-cheap`  | triage           | `anthropic/claude-haiku-4.5`  |
| `worker-mid`    | default worker   | `anthropic/claude-sonnet-4.6` |
| `worker-strong` | escalation       | `anthropic/claude-opus-4.8`   |

Edit that mapping and the prices in `models.MODELS` to match your provider.

## 6. Connecting real task sources

`task_queue.enqueue(kind, prompt, priority)` is the single entry point. Wire any
producer to it: a webhook handler, a file watcher, a cron job that polls an
inbox, a message-bus consumer. The orchestrator picks up whatever is `pending`.
