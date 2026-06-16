# Agent Business OS — agent runtimes

The virtual agents that run and monitor the business. Dependency-free Node
(stdlib only), operating on one pipeline store so they run anywhere — cron, CI,
a laptop — without the Studio. Money decisions are **deterministic**; LLMs are
only for drafting copy (a later hook), never for deciding who paid.

## Agents

| Agent | What it does | Side effects |
|-------|--------------|--------------|
| `sync-agent` | Bridges the live Azure functions ↔ store: pulls inbound leads in, flips invoices to `paid` from webhook payment rows (match by Stripe invoice id, else email→open deal). No-op without a table connection | mutates leads/invoices |
| `capture-agent` | Ingests + dedupes + scores an inbound lead into the store (outbound sourcing is a later hook) | adds a lead |
| `qualifier-agent` | Scores any unscored lead, routes hot/warm → `qualified`, else `nurtured` | mutates leads |
| `sdr-agent` | First-touch qualified leads (clears SLA clock) → `conversion`; opens a deal for hot leads. **Never marks `won`** | mutates leads/deals |
| `billing-agent` | Won deal → issue invoice (Stripe when live+keyed, else manual-pending w/ Cash App link) → dunning on overdue (capped, then escalate) → deal `collected` on payment | mutates pipeline; money-out NOT implemented (human-gated) |
| `monitor-agent` | Computes KPIs (cash/day, pipeline, funnel), SLA breaches, overdue/escalated → `ops/health.json` + tiered alerts | read-only on pipeline; writes health snapshot |
| `memo-agent` | Daily digest (KPIs + activity) into `obsidian/Agent-Business-OS/digests/` | writes a markdown note |

`tick` runs them in pipeline order: **sync → qualify → sdr → billing → monitor**.

### Fully autonomous mode (no human in the loop)

Set `ABOS_AUTO_CLOSE=1` and the sdr treats a qualified hot inbound as the close
trigger — it opens *and* wins the deal so billing sends the pay page immediately,
with no human `win`. Tradeoff: some invoiced leads won't pay; dunning + lapse
handle that, and you only ever **collect** when they actually pay. Money-out
(refunds/payouts) is still never automated. Leave the flag unset to keep `win` a
human signal.

## Run it forever (macOS launchd)

```bash
bash agent-business-os/ops/launchd/install.sh            # tick every 15m + memo daily 08:00
bash agent-business-os/ops/launchd/install.sh uninstall  # stop
```

The installed runner sets `ABOS_LIVE_BILLING=1` and `ABOS_AUTO_CLOSE=1`. On Linux,
use cron instead (snippet below).

## Run

```bash
cd agent-business-os
node agents/run.js seed              # load a demo pipeline to try it
node agents/run.js ingest '<json>'   # land an inbound lead {name,email,revenue,bottleneck,lift,start7}
node agents/run.js tick              # qualify → sdr → billing → monitor (one cycle)
node agents/run.js win <dealId>      # close a deal → next tick invoices it
node agents/run.js mark-paid <id>    # payment landed (webhook/manual) → next tick collects
node agents/run.js memo              # write today's digest
node agents/run.js status            # print current KPIs/health
node agents/test.js                  # full lifecycle test (no network) — 24 checks
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
