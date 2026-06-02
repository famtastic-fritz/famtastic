# Agent Business OS — Rollout Plan: Concept → Collections

> The autonomous operating plan for **Agent Business OS** — the business whose
> front door we built at `agent-business-os/` (landing + `/api/lead` capture +
> fit scoring). This document is the "collective brain" record of how the
> business runs itself, end to end, and who (which virtual agent) owns each step.
>
> **Status:** plan + scaffolding. Money movement and live credentials are gated
> on the decisions at the bottom of this doc.
> **Last updated:** 2026-06-02

---

## 0. The spine: concept → cash

Every dollar travels the same six-stage pipe. Each stage is owned by a virtual
agent, runs on its own trigger, writes to the ledger, and reports into one
founder control plane.

```
CONCEPT → CAPTURE → DECISION → CONVERSION → FULFILLMENT → COLLECTIONS
 (done)    leads     qualify    book+close    deliver       get paid
```

The first four map 1:1 to the four layers advertised on the landing page
(Capture / Decision / Conversion / Fulfillment). **Collections** is the fifth —
the stage that turns a delivered outcome into money in the account — and it is
the one that needs a real decision about payment rail and credentials (Section 6).

---

## 1. Stage map (what happens, what triggers it, who owns it)

| # | Stage | Trigger | Owner agent | Output / ledger |
|---|-------|---------|-------------|-----------------|
| 0 | **Concept** | one-time | — (done) | Landing live, offer + ICP + pricing fixed |
| 1 | **Capture** | cron (outbound) + inbound form | `capture-agent` | new lead → `leads` table via `/api/lead` |
| 2 | **Decision** | on new lead (event) | `qualifier-agent` | `fitScore` + `priority` (hot/warm/nurture) + route |
| 3 | **Conversion** | on qualified lead + SLA timer | `sdr-agent` | booked call / sent proposal → `deal` opened |
| 4 | **Fulfillment** | on deal `won` | `delivery-agent` | onboarding done, delivery scorecard |
| 5 | **Collections** | on deal `won` / milestone | `billing-agent` | invoice → payment → reconciled → receipt |
| ∞ | **Control + Monitor** | continuous | `orchestrator` + `monitor-agent` | health, KPIs, alerts, founder gates |

The capture→decision→conversion→fulfillment chain already has its data contract:
the `/api/lead` function (`agent-business-os/api/lead/index.js`) emits
`{ name, email, revenue, bottleneck, lift, start7, fitScore, priority,
responseSlaMinutes, stage, status }`. Collections extends that record with
`invoiceId, amount, due, paid_at, rail, receipt_url`.

---

## 2. The autonomous operating loop

The business runs on **three clocks** layered over one job queue:

1. **Event-driven** — the `/api/lead` webhook wakes the pipeline the instant a
   lead arrives (capture → decision happens in seconds).
2. **SLA timers** — each priority carries a response deadline (hot 15m / warm 60m
   / nurture 240m). The monitor agent watches the clock and escalates breaches.
3. **Cron cadence** — outbound capture (50/day discipline), follow-up sequences,
   daily KPI digest, weekly memo, collections dunning.

All work is dispatched as **jobs** through the existing queue substrate
(`lib/job-queue.js` / `jobs` table in `~/.config/famtastic/studio.db`, mirrored
by `.worker-queue.jsonl`). Each agent run is a job with a type, a payload, a
cost estimate, and a status in the documented state machine
(`pending → approved → running → done/failed`, plus `blocked`/`parked`).

> **Reuse, don't reinvent:** the job queue, the spec-as-source-of-truth pattern,
> the platform vault, and the invocations ledger all already exist. Agent Business
> OS is an *invocation* of those primitives, not a new stack.

---

## 3. Virtual agent roster

Eight agents. Each is small, single-purpose, reads its inputs from the ledger,
and writes its outputs back. None of them hold credentials — they read from the
vault on demand.

### Pipeline agents

| Agent | Job | Runs on | Reads | Writes | Can act without a human? |
|-------|-----|---------|-------|--------|--------------------------|
| `capture-agent` | Source + enrich + send outbound (50/day), accept inbound | cron + webhook | ICP, prior touches | new `lead` rows | ✅ within volume cap |
| `qualifier-agent` | Score fit, set priority, route | on new lead | lead fields | `fitScore`, `priority`, `stage` | ✅ |
| `sdr-agent` | Follow-up sequences, booking, proposal | on qualified + SLA | lead, calendar | `deal`, touch log | ✅ for outreach; ❌ for discounts |
| `delivery-agent` | Onboarding automation, delivery QA scorecard | on deal `won` | deal, playbook | onboarding state, QA score | ✅ |

### Collections + control agents

| Agent | Job | Runs on | Reads | Writes | Can act without a human? |
|-------|-----|---------|-------|--------|--------------------------|
| `billing-agent` | Issue invoice / payment link, send, dun overdue | on deal `won` + cron | deal, **vault payment creds** | `invoice`, `payment` | **DECISION — see §7** |
| `orchestrator` | Dispatch jobs, resolve dependencies, enforce caps | continuous | job queue | job state | ✅ (dispatch only) |
| `monitor-agent` | Health, SLA breaches, error rates, KPI thresholds | continuous | ledgers, endpoints | alerts | ✅ alert-only |
| `memo-agent` | Daily KPI digest + weekly decision memo into this brain | cron | all ledgers | Obsidian notes | ✅ |

### Where the agents come from

The repo already has multi-agent plumbing (Claude / Gemini / Codex adapters,
`scripts/agents`, `site-studio` tool-calling, the worker queue). Each agent above
is a **prompt + tool allowlist + schedule**, dispatched through that existing
machinery — not a new framework. Specialized needs route to the owning service
(research → research router; media → media pipeline) per house doctrine.

---

## 4. Monitoring — "run, monitor, and all"

The `monitor-agent` is the always-on nervous system. It watches:

- **Liveness:** `/api/lead` reachable, queue draining, no jobs stuck `running`.
- **SLA:** any hot/warm/nurture lead past its response deadline → escalate.
- **Funnel health:** conversion rate per stage; alarm on a stage that flatlines.
- **Cash/day KPI:** the headline number — collected revenue per day vs target.
- **Errors:** function 5xx, webhook failures, payment reconcile mismatches.

**Alert channel:** Telegram (the `/api/lead` function already supports
`TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID`). Severity tiers: `info` (digest only),
`warn` (Telegram), `critical` (Telegram + halt the relevant agent).

**Proof + post-evaluation:** every meaningful job appends to the invocations
ledger (`platform/invocations/<date>.jsonl`); `memo-agent` runs the daily digest
and weekly memo, satisfying the "record proof / run post-evaluation" doctrine.

---

## 5. The control plane (founder gates)

"Autonomous" ≠ "unsupervised." Per the landing-page promise — *founder control
preserved, auditable logs, escalation thresholds under operator authority* —
these stay human-gated **by default**:

- 💸 **Money-out:** refunds, payouts, any spend above a set threshold.
- 🏷️ **Price changes:** discounts, custom quotes beyond a guardrail band.
- ✋ **Escalations:** anything an agent flags low-confidence, or a `critical` alert.
- 🔌 **First-time external actions:** the first invoice on a new rail, first
  outbound to a new channel.

Everything else runs on standing approval (the vault model): store the decision
once, agents execute repeatedly, Fritz sees only the decision points.

---

## 6. Collections — turning delivery into cash

This is the stage your message is really about ("concept → collections", "cash
app info in the brain"). Two realities shape it:

### 6a. Payment-rail reality

- **Cash App** is peer-to-peer. It gives you a shareable **`$cashtag` payment
  link** (`https://cash.app/$yourtag/<amount>`) you can drop into an invoice —
  but it has **no robust API to confirm an incoming payment**, so reconciliation
  ("did invoice #123 get paid?") is **manual or statement-parsed**. An agent can
  *ask* for money on Cash App; it can't reliably *know* it arrived. That caps how
  autonomous collections can be on Cash App alone.
- **Stripe** (or similar) is built for this: programmatic invoices + hosted
  payment pages + **webhooks** that fire the moment a payment clears → fully
  autonomous reconciliation, receipts, and dunning.

**Recommendation:** Stripe as the *autonomous* rail; Cash App as a *human-friendly
alt link* on the invoice. This is the decision in §7-Q1.

### 6b. Collections flow (rail-agnostic)

```
deal won → billing-agent issues invoice (amount, due, links)
        → send via email (Resend) + show payment link(s)
        → [Stripe webhook OR manual confirmation] → mark paid
        → receipt + move deal to `collected`
        → if overdue: dunning sequence (reminder cadence, then escalate)
```

### 6c. Where the credentials live (the important part)

**Cash App / payment info goes in the Keychain vault, NOT in a plaintext Obsidian
note.** The `obsidian/` vault is git-tracked — a secret pasted into a note would
be committed to the repo's history permanently. Instead:

- Secrets → `platform/vault/vault.sh` under stable IDs (you run `vault write`
  once; agents `vault read` forever):

  | Secret ID | What it is |
  |---|---|
  | `payments/cashapp.cashtag` | your `$cashtag` (e.g. `$fritzmedine`) — used to build links |
  | `payments/stripe.secret_key` | Stripe API key (if Stripe rail chosen) |
  | `payments/stripe.webhook_secret` | Stripe webhook signing secret |

- The **brain holds only the *reference*** — see `Credentials.md` in this folder.
  It lists which secret IDs exist and what each does, never the values. That's
  how the "cash app info is in the collective brain" intent is satisfied
  *safely*: the brain knows where the money keys are and how collections uses
  them, without ever storing the keys themselves.

The `payments` capability (`platform/capabilities/payments/`) reads these vault
IDs to generate payment links and (for Stripe) reconcile — matching every other
platform capability.

---

## 7. Open decisions (need your call before money moves)

I built everything above that's safe without your input. These three reshape the
collections + autonomy design and involve your money/credentials, so I'm not
guessing them:

- **Q1 — Payment rail:** Cash App only / Stripe (autonomous) + Cash App alt / something else.
- **Q2 — Credential storage:** Keychain vault + brain reference (recommended) vs. literally in an Obsidian note (I'll flag the git-leak risk but it's your call).
- **Q3 — Money autonomy:** how far the `billing-agent` goes before a human gate
  (issue+send+reconcile+dun fully auto, vs. issue auto / "mark paid" gated, vs.
  every invoice approved).

---

## 8. Rollout sequence (build order once Q1–Q3 are answered)

1. **Wave 1 — Wire the rails (1 sitting):** `vault write` the payment secrets;
   finish the `payments` capability for the chosen rail; set `/api/lead` env vars
   (table + Telegram); deploy the site + function.
2. **Wave 2 — Pipeline agents:** stand up `qualifier-agent` + `sdr-agent` on the
   existing queue; connect the `/api/lead` webhook to the orchestrator.
3. **Wave 3 — Collections:** `billing-agent` issues + sends + (Stripe) reconciles;
   dunning cadence; receipts.
4. **Wave 4 — Monitoring:** `monitor-agent` liveness/SLA/KPI + Telegram tiers;
   `memo-agent` daily digest + weekly memo into this brain.
5. **Wave 5 — Capture scale:** `capture-agent` outbound swarm at 50/day discipline.

Each wave is independently shippable and leaves the business more autonomous than
the last. Wave 1 + a manual nudge already lets a real lead become real cash.

---

## 9. Known gaps / honest limits

- **Cash App can't be auto-reconciled** — without Stripe (or a bank/statement
  feed), "mark invoice paid" is a manual or human-confirmed step.
- **Agents aren't deployed yet** — this is the plan + scaffold; the agent runtimes
  (prompts + schedules on the queue) are Wave 2–5.
- **Secrets aren't stored yet** — no real Cash App/Stripe credentials exist in the
  vault; the IDs in §6c are the slots to fill.
- **Nothing is live** — the site/function still need the Azure resource + env vars
  (see `agent-business-os/README.md`).
- **No KYC/compliance review** — automated collections has payment-processor ToS
  and tax/invoicing obligations that are out of scope here and your call.
