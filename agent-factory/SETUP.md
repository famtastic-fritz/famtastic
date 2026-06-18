# SETUP — running it, and wiring real integrations later

## Run it now (offline, zero install)

```bash
cd agent-factory
./setup.sh        # creates .venv (no packages) + .env + seeds the queue
./run.sh          # bounded demo: spawns workers, routes, logs cost, self-improves
```

Then open `dashboard/status.html` in a browser, or:

```bash
python3 src/dashboard.py --serve   # http://127.0.0.1:8787/status.html (sandboxed)
```

Daemon (runs forever, ctrl-c to stop):

```bash
./run.sh --daemon
```

Re-seed at any time: `python3 seed.py` (resets) or `python3 seed.py --keep` (adds).

## Everything is mocked until you fill `.env`

Copy `.env.example` → `.env`. **With no keys, the whole system runs.** Each key
below unlocks one real integration; none is required.

### 1. Real model calls (OpenRouter-style)
- Set `OPENROUTER_API_KEY`. `src/llm.py` switches from deterministic stub to a
  real `chat/completions` POST. Routing/cost logic is unchanged — the router
  already picks the cheapest capable model from `config.json`'s catalog.
- To use real model IDs, edit the `models.catalog` ids/prices in `config.json`.

### 2. PayPal Business (payment collection — proof pipeline)
- Fill `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`, keep `PAYPAL_ENV=sandbox`.
- Implement one adapter function `create_invoice(amount, memo)` calling PayPal
  Invoicing; wire its webhook (`INVOICING.INVOICE.PAID`) to enqueue a `build`
  task. **Do not** set `PAYPAL_ENV=live` until a refund/reconciliation policy
  exists. The factory never moves money on its own.

### 3. GoDaddy outreach (contacting — proof pipeline)
- `GODADDY_DOMAIN`, `GODADDY_OUTREACH_FROM`, and SMTP creds drive cold email.
- Implement one adapter `send_email(to, subject, body)` over
  `smtpout.secureserver.net`. **Flagged risk:** GoDaddy SMTP throttles for cold
  volume — the `send` step is a pluggable interface so you can swap to a
  dedicated cold-email ESP without touching the pipeline (see business model §5).
- Set SPF/DKIM/DMARC on the domain and warm it before volume.

## Where things live

| Path | What |
| --- | --- |
| `src/orchestrator.py` | supervisor + in-process scheduler + worker lifecycle |
| `src/queue.py` | SQLite task queue (atomic claim) |
| `templates/worker_template.py` | the agent the orchestrator mints new workers from |
| `agents/worker_*.py` | minted worker instances (git-ignored, regenerated) |
| `src/router.py` | cheapest-capable-model routing + COSTS.log ledger |
| `src/llm.py` | OpenRouter-style client (stub ↔ live) |
| `src/improve.py` | bounded self-improvement → LEARNINGS.md + config tuning |
| `src/dashboard.py` | status.html + terminal readout |
| `src/tasks/` | task handlers incl. the business-model proof deliverable |
| `seed.py` | injects the sample batch incl. the proof task |
| `logs/ORCHESTRATOR.log` `logs/COSTS.log` | decision + cost ledgers |
| `outputs/` | task artifacts (the business model lands here) |
