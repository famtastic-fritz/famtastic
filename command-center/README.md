# FAMtastic Command Center

One always-on dashboard that is the **single source of truth** for the whole
ecosystem: live agent health, real income, and a de-noised idea backlog. Zero
external dependencies — Node's built-in `http` + `crypto` only — so it runs as
a rock-solid launchd service alongside Studio.

> Why it exists: the ecosystem had five half-built "moving parts" and no honest
> view of any of them. The old `command-center/index.html` was a static mockup
> claiming "1,000 ideas / $50K potential" with buttons that fired `alert()`.
> This replaces fiction with live, traceable data.

## Run

Managed by launchd (`com.famtastic.commandcenter`, port **7878**):

```bash
launchctl load   ~/Library/LaunchAgents/com.famtastic.commandcenter.plist
launchctl kickstart -k gui/$(id -u)/com.famtastic.commandcenter   # restart after code changes
open http://localhost:7878
tail -f /tmp/command-center.log
```

## The three collectors

| Collector | File | What it reads | Honest behavior |
|---|---|---|---|
| **Process/agent health** | `collectors/process-health.js` | `ps` + `data/heartbeats/*.json` | PID alive **+ heartbeat freshness**. PID alive but stale heartbeat = **HUNG** (catches wedged agents). |
| **Income ledger** | `collectors/income-ledger.js` | `data/revenue.jsonl` | Only real, landed payments (Stripe/PayPal webhooks + manual entry). Never projections. |
| **Idea backlog** | `collectors/ideas.js` | idea docs + `revenue-plans/` | Collapses generator noise into one count; surfaces curated, dollar-bearing opportunities. |

## Heartbeat contract

Any agent that wants live "is it actually working?" monitoring writes
`pipeline/data/heartbeats/<name>.json` (`{name, ts, status, detail}`) at least
once per loop and around blocking calls. Python helper: `pipeline/lib/heartbeat.py`
(`from heartbeat import beat`). Register the agent in `data/agents-registry.json`
and the dashboard tracks it automatically.

## Income webhooks

- `POST /webhooks/stripe` — verifies `Stripe-Signature` via HMAC-SHA256 against
  `STRIPE_WEBHOOK_SECRET` (env). Records `checkout.session.completed`,
  `payment_intent.succeeded`, `charge.succeeded`.
- `POST /webhooks/paypal` — records payment events; marked **unverified** until
  PayPal verify creds are configured (shown honestly on the dashboard).
- `POST /api/income/manual` — `{amount, customer, description}` for cash/CashApp.

Public URL for webhooks (local dev): `stripe listen --forward-to localhost:7878/webhooks/stripe`.

## Kill switch (guardrail for autonomous send)

`POST /api/kill-switch {engaged: true}` writes `data/kill-switch.json`.
Autonomous-send agents (Phase 3) MUST check this file before sending anything
to a real customer. The dashboard button toggles it and the topbar goes red
while engaged.

## API

`GET /api/status` (aggregated), `/api/processes`, `/api/income`, `/api/ideas`,
`/api/kill-switch`, `/healthz`.

## Phase status

- **Phase 1 (this): Command Center** — DONE. Monitoring + income + ideas + kill switch.
- Phase 2: Income evaluation depth (Stripe/PayPal live creds, idea scoring tuning).
- Phase 3: Lead-gen / customer-response / follow-up agents that register here, heartbeat, and honor the kill switch.
- Phase 4: Autonomous orchestration on a schedule.
