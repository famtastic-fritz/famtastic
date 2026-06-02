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

## Step 5 — Schedule the agents (autonomy)

```cron
*/15 * * * *  cd ~/famtastic/agent-business-os && ABOS_LIVE_BILLING=1 node agents/run.js tick >> ~/abos-tick.log 2>&1
0    8 * * *  cd ~/famtastic/agent-business-os && node agents/run.js memo               >> ~/abos-memo.log 2>&1
```

(Or register via the platform cron capability once that wrapper lands.)

---

## The two integration seams still to wire (the only real code left)

The deployed functions write to **Azure Table**; the agents read the local
**`ops/pipeline.json`**. In production they must sync. Both are small and belong
in a `sync-agent`:

### Seam A — lead → store (inbound)
`api/lead` lands a lead in Azure Table. A `sync-agent` (or the function itself,
via a queue) should call `capture.ingest(lead)` so the qualifier/sdr pick it up.
Dedupe is already handled by `capture.ingest` (by email).

### Seam B — payment → store (reconciliation)
`api/stripe-webhook` marks a row collected in Azure Table. To flip the matching
**local** invoice to `paid`, the billing agent must record the **Stripe invoice
id** on the local invoice when it issues one (today `money.sendStripeInvoice`
returns only the hosted URL — also capture `in_…` id), and the sync matches
webhook `invoice.id` → local invoice → set `paid`. Until wired,
`run.js mark-paid <localInvoiceId>` is the manual stand-in.

> **Recommendation when you wire this:** have `invoice.sh` print the Stripe
> invoice id alongside the URL, store it as `stripeInvoiceId` on the local
> invoice, and key the sync off it. That's the one change that makes
> reconciliation fully hands-off. It needs a live Stripe key to test, which is
> why it isn't built yet — building it blind would be untested money code.

## Guardrails in force (by your decision)

- **Money-out** (refunds/payouts) — not implemented in the agent layer; always human.
- **Closing a deal** (`won`) — a human signal (`run.js win`); the sdr only opens deals.
- **Live billing** — only when `ABOS_LIVE_BILLING=1` **and** a Stripe key is in the vault; otherwise invoices are manual-pending so nothing is lost.
