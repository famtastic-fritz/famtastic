# Agent Business OS — agent runtimes

The virtual agents that run and monitor the business. Dependency-free Node
(stdlib only), operating on one pipeline store so they run anywhere — cron, CI,
a laptop — without the Studio. Money decisions are **deterministic**; LLMs are
only for drafting copy (a later hook), never for deciding who paid.

## Agents

| Agent | What it does | Side effects |
|-------|--------------|--------------|
| `billing-agent` | Won deal → issue invoice (Stripe when live+keyed, else manual-pending w/ Cash App link) → dunning on overdue (capped, then escalate) → deal `collected` on payment | mutates pipeline; money-out NOT implemented (human-gated) |
| `monitor-agent` | Computes KPIs (cash/day, pipeline, funnel), SLA breaches, overdue/escalated → `ops/health.json` + tiered alerts | read-only on pipeline; writes health snapshot |
| `memo-agent` | Daily digest (KPIs + activity) into `obsidian/Agent-Business-OS/digests/` | writes a markdown note |

## Run

```bash
cd agent-business-os
node agents/run.js seed            # load a demo pipeline to try it
node agents/run.js tick            # billing + monitor (one cycle)
node agents/run.js win <dealId>    # mark a deal won → next tick invoices it
node agents/run.js mark-paid <id>  # payment landed (webhook/manual) → next tick collects
node agents/run.js memo            # write today's digest
node agents/run.js status          # print current KPIs/health
node agents/test.js                # full lifecycle test (no network)
```

## Autonomy (production)

Schedule on cron — `tick` every 15 min, `memo` once daily:

```cron
*/15 * * * *  cd /path/to/famtastic/agent-business-os && node agents/run.js tick   >> ~/abos-tick.log 2>&1
0    8 * * *  cd /path/to/famtastic/agent-business-os && node agents/run.js memo   >> ~/abos-memo.log 2>&1
```

Or `node agents/run.js loop 900` for a long-running process. Live Stripe billing
requires `ABOS_LIVE_BILLING=1` **and** `payments/stripe.secret_key` in the vault;
otherwise invoices are recorded manual-pending so nothing is lost.

## Config (env)

| Var | Default | Purpose |
|-----|---------|---------|
| `ABOS_STORE` | `ops/pipeline.json` | pipeline data file |
| `ABOS_LIVE_BILLING` | unset | `1` enables real Stripe invoicing |
| `ABOS_INVOICE_TERMS_DAYS` | `7` | invoice due window |
| `ABOS_DUNNING_MAX` / `ABOS_DUNNING_EVERY_HRS` | `3` / `48` | reminder cap + cadence |
| `ABOS_CASH_TARGET` | `0` | daily cash target (alerts if below; 0 = off) |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | — | warn/critical alerts (else stdout only) |

## How payment status gets in

The Stripe webhook (`agent-business-os/api/stripe-webhook`) is the source of
truth for "paid" in production. The store→webhook sync (flip the matching
invoice to `paid`) is the remaining integration seam — until it's wired,
`run.js mark-paid <id>` represents that signal. Everything downstream
(collected, KPIs, digest) already works.
