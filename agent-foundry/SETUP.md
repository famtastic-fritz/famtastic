# SETUP — Running the Agent Factory

## Requirements
- Python 3.9+ (tested on 3.11). **Standard library only** — no `pip install`.
- That's it. The whole system runs offline.

## Quick start (offline, fully self-contained)
```bash
cd agent-foundry
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
python3 orchestrator.py --forever    # PERSISTENT daemon (autonomous; stop: touch data/STOP)
python3 add_task.py triage "ad-hoc job" 0.3 1   # inject a task into the live queue
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

## PayPal invoice DRAFTS (real API, drafts only) — optional
The `paypal_invoice_draft` task type creates **draft** invoices via PayPal
Invoicing v2. A draft is never sent and never charges anyone — see `paypal.py`
(there is no send/charge code). Offline it's stubbed and writes the exact request
body to `deliverables/invoices/`. To create **real drafts** in your PayPal
account:
1. Create a REST app at https://developer.paypal.com/dashboard/applications →
   get a **Client ID** and **Secret**. Start with **Sandbox** credentials.
2. In `.env`:
   ```
   PAYPAL_CLIENT_ID=...
   PAYPAL_CLIENT_SECRET=...
   PAYPAL_BUSINESS_EMAIL=you@yourbiz.com
   PAYPAL_ENV=sandbox          # switch to live only when you're ready
   FACTORY_LIVE_PAYPAL=true
   ```
3. In `config.json` set `"paypal_live": true`.
Both flags + both credentials must be present, or it stays stubbed. The code
calls **only** `POST /v2/invoicing/invoices` (create = status DRAFT). After a
run, review the drafts in your PayPal dashboard and send them yourself. Going
from sandbox to live is a single `PAYPAL_ENV=live` change.

## Other payment / email credentials
Remaining `PAYPAL_*` and `GODADDY_*` values in `.env` are consumed **only as
text** by the deliverable generators (so the generated business docs are ready to
use). The factory never moves money — see `SANDBOX.md`.
