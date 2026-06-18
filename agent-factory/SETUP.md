# SETUP — Running the Agent Factory

## Requirements
- Python 3.9+ (tested on 3.11). **Standard library only** — no `pip install`.
- That's it. The whole system runs offline.

## Quick start (offline, fully self-contained)
```bash
cd agent-factory
python3 run.py
```
This seeds the task queue, starts the orchestrator for 6 waves, spawns worker
agents, routes each task to the cheapest capable model, logs costs, runs a
self-improvement pass after every wave, and prints + writes the dashboard.

Open the dashboard:
```bash
open dashboard/index.html      # macOS
xdg-open dashboard/index.html  # Linux
```

## Individual components
```bash
python3 seed_tasks.py          # inject sample tasks
python3 orchestrator.py --cycles 3   # bounded supervisor run
python3 orchestrator.py --daemon     # run until queue drained, then idle-exit
python3 dashboard.py           # terminal readout
python3 dashboard.py --html    # (re)write dashboard/index.html
python3 dashboard.py --json    # machine-readable snapshot
python3 self_improve.py        # run one tuning pass manually
```

## Going live (real models, real spend) — optional
1. Copy the env template and fill it in:
   ```bash
   cp .env.example .env
   ```
2. Set in `.env`:
   - `OPENROUTER_API_KEY=sk-or-...` (from https://openrouter.ai/keys)
   - `FACTORY_LIVE_CALLS=true`
3. Set `"live_calls": true` in `config.json`.

Even then, `router.call_model` is **guarded**: it computes cost and marks the
call `LIVE-GUARDED` but does NOT perform a network request. To actually call
OpenRouter, add the POST in `router.call_model` where the `if live:` block is —
roughly:
```python
import urllib.request, json
req = urllib.request.Request(
    f"{env['OPENROUTER_BASE_URL']}/chat/completions",
    data=json.dumps({"model": model_id,
                     "messages": [{"role": "user", "content": prompt}]}).encode(),
    headers={"Authorization": f"Bearer {env['OPENROUTER_API_KEY']}",
             "Content-Type": "application/json"})
resp = json.loads(urllib.request.urlopen(req).read())
produced_output = resp["choices"][0]["message"]["content"]
```
This is deliberately left commented-out so the sandbox can never spend by
accident. The deliverable generators in `deliverables.py` are the offline
"model"; in live mode you'd feed the routed model the same prompts.

## Real task sources (replacing the seeder) — optional
`seed_tasks.add_task(type, title, payload, priority, complexity)` is the only
write path into the queue. Point any source at it:
- a webhook handler that calls `queue_db.add_task(...)`,
- a CSV/Sheet importer for outreach targets,
- the FAMtastic site studio emitting build tasks,
- an inbox poller turning replies into `triage` tasks.

## Payment / email credentials
`PAYPAL_*` and `GODADDY_*` in `.env` are consumed **only as text** by the
deliverable generators (so the generated business docs are ready to use). The
factory never calls a payment API and never moves money — see `SANDBOX.md`.
