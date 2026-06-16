---
name: agent-business-os
description: Operate and monitor the Agent Business OS autonomous business — check KPIs/health, run the pipeline (sync→qualify→sdr→billing→monitor), diagnose stuck leads/invoices, manage the perpetual runner, and wire/verify the Stripe + Cash App money rails. Use when asked to run, check, fix, deploy, or report on Agent Business OS / the autonomous business / "the business that runs itself".
---

# Agent Business OS — operator skill

A fully-autonomous productized-service business. Pipeline: **capture → qualify →
sdr → billing → monitor**, with collections on Stripe (+ Cash App alt link) and a
daily digest into the Obsidian brain. It runs itself on launchd; this skill is
how an agent inspects and tends it.

Everything lives under `agent-business-os/`. Money decisions are deterministic;
money-out (refunds/payouts) is never automated.

## First: read the state of the world

- `agent-business-os/agents/README.md` — the agents + commands
- `obsidian/Agent-Business-OS/Rollout-Plan.md` — the operating model + decisions
- `obsidian/Agent-Business-OS/Go-Live-Runbook.md` — credential/deploy checklist
- `obsidian/Agent-Business-OS/Credentials.md` — vault secret IDs (never values)

## Common operations

```bash
cd agent-business-os
node agents/run.js status     # current KPIs + health (cash/day, funnel, alerts)
node agents/run.js tick       # one full cycle (safe, idempotent)
node agents/run.js sync       # pull live leads/payments from Azure Table
node agents/run.js memo       # write today's digest into the brain
node agents/test.js           # 28-check lifecycle test (no network) — run after edits
cat /tmp/abos-tick.log        # what the perpetual runner has been doing
```

Perpetual runner (macOS launchd):
```bash
bash agent-business-os/ops/launchd/install.sh            # start autonomous operation
bash agent-business-os/ops/launchd/install.sh uninstall  # stop
launchctl list | grep abos                               # is it running?
```

## Diagnosing

- **No cash showing?** `status` → check `invoicesByStatus`. Paid relies on the
  Stripe webhook (`api/stripe-webhook`) → Azure Table → `sync`. Verify
  `STRIPE_WEBHOOK_SECRET` app setting and that the webhook endpoint is live.
- **Leads not flowing?** `sync` needs `LEADS_TABLE_CONNECTION_STRING` (env or
  vault `payments/leads_table_connection_string`). Without it, sync is a no-op.
- **Invoices stay manual_pending?** Live billing needs `ABOS_LIVE_BILLING=1`
  AND `payments/stripe.secret_key` in the vault; else it records manual-pending
  (nothing lost). The launchd job sets the flag.
- **Escalated invoice alert?** A lead/customer hasn't paid after the dunning cap
  — a human decides whether to chase or write off.

## Guardrails (do not cross without explicit human approval)

- Never implement or invoke refunds/payouts (money-out) — human-gated by decision.
- Never paste a real secret into the Obsidian brain or any tracked file — it's
  git-tracked. Secrets go in `platform/vault/vault.sh` only.
- After changing agent code, run `node agents/test.js` and keep it green.

## Config knobs (env)

`ABOS_LIVE_BILLING=1` (real Stripe), `ABOS_AUTO_CLOSE=1` (no human win),
`ABOS_INVOICE_TERMS_DAYS`, `ABOS_DUNNING_MAX`/`ABOS_DUNNING_EVERY_HRS`,
`ABOS_CASH_TARGET`, `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID`.
