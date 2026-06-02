# Agent Business OS — Go-Live Runbook

> Everything that's built is in the repo and tested. This is the ordered
> checklist to take it from "works on my machine" to "running autonomously and
> taking money." Each step is small; the whole thing is one focused sitting.
> **Last updated:** 2026-06-02

## What's already done (no action needed)

- ✅ Landing site (`agent-business-os/dist/`) — hero, ROI calculator, qualification funnel, FAQ, pricing.
- ✅ Lead capture function (`api/lead`) — validation, fit scoring, honeypot, fail-soft persist + Telegram.
- ✅ Stripe rail — `payments/invoice.sh` (invoice + Cash App alt link) and `api/stripe-webhook` (signature-verified reconciliation).
- ✅ Agent loop (`agents/`) — capture → qualifier → sdr → billing → monitor → memo. Tested 24/24, CLI-proven cold-lead → collected.

## Step 1 — Store the credentials (vault, once)

```bash
cd ~/famtastic
platform/vault/vault.sh write payments/cashapp.cashtag '$yourcashtag'
platform/vault/vault.sh write payments/stripe.secret_key        # sk_live_…
platform/vault/vault.sh write payments/stripe.webhook_secret    # whsec_… (after Step 3)
platform/vault/vault.sh list                                     # confirm IDs (no values shown)
```

## Step 2 — Deploy the site + functions (Azure Static Web Apps)

1. Create an Azure Static Web Apps resource.
2. Repo secret `AZURE_STATIC_WEB_APPS_API_TOKEN_ABOS` = its deployment token.
3. Repo variable `ABOS_DEPLOY_ENABLED` = `true`.
4. App settings (these are the deploy-time copies of the vault values — see `Credentials.md`):
   - `STRIPE_WEBHOOK_SECRET`
   - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (optional alerts)
   - `LEADS_TABLE_CONNECTION_STRING`, `LEADS_TABLE_NAME` (optional persistence)
5. Push to `main` → the workflow uploads `dist/` + `api/`.

## Step 3 — Point Stripe's webhook at the function

- Stripe Dashboard → Developers → Webhooks → add endpoint
  `https://<your-host>/api/stripe-webhook`, events: `invoice.paid`,
  `invoice.payment_succeeded`, `checkout.session.completed`.
- Copy the signing secret → `STRIPE_WEBHOOK_SECRET` app setting **and**
  `payments/stripe.webhook_secret` in the vault.

## Step 4 — Set the front-end config

In `dist/assets/js/config.js`:
- `ABOS_LEAD_ENDPOINT` = `/api/lead` (already set)
- `ABOS_BOOKING_URL` = your Cal.com/Calendly link (CTAs open the scheduler)

## Step 5 — Start the perpetual runner (one command)

```bash
bash ~/famtastic/agent-business-os/ops/launchd/install.sh
```

That loads two launchd jobs — `tick` every 15 min (in live billing + auto-close
mode) and `memo` daily at 08:00 — so it runs forever with no babysitting.
`launchctl list | grep abos` to confirm; `install.sh uninstall` to stop. On
Linux, use the cron snippet in `agents/README.md` instead.

---

## The integration seams — now automatic (built 2026-06-02)

Both seams are wired and tested; no manual `ingest`/`mark-paid` needed.

- **Lead → store:** `sync-agent` reads the Azure Table (`LEADS_TABLE_CONNECTION_STRING`,
  env or vault `payments/leads_table_connection_string`) and calls `capture.ingest`
  for new inbound leads. Runs first in every `tick`.
- **Payment → store:** `invoice.sh` now emits the Stripe invoice id, billing stores
  it as `stripeInvoiceId`, and `sync-agent` flips the matching local invoice to
  `paid` from webhook payment rows (match by Stripe invoice id, else by email→open
  deal). Reconciliation is hands-off.

The only requirement is that the Azure functions persist to a table (set
`LEADS_TABLE_CONNECTION_STRING` app setting) and the Stripe webhook is configured
(Step 3). Cash App payments, which have no webhook, remain the one manual-confirm
path by nature.

## Guardrails in force (by your decision)

- **Money-out** (refunds/payouts) — not implemented in the agent layer; always human.
- **Closing a deal** (`won`) — a human signal (`run.js win`); the sdr only opens deals.
- **Live billing** — only when `ABOS_LIVE_BILLING=1` **and** a Stripe key is in the vault; otherwise invoices are manual-pending so nothing is lost.
