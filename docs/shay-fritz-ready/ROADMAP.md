# Shay Fritz-Readiness Roadmap

**Question this answers:** What does Shay need in order to run your life and work
autonomously — ranked by autonomy × profitability.

**Date:** 2026-06-02 · **Audience:** Fritz · **Scoring is consistent and chartable**
(autonomy 0-100 = how much runs without you; profit 0-100 = direct or revenue-enabling).

---

## 1. Executive summary (to Fritz)

You already have the hard part: a persistent orchestrator with durable memory, a Kanban
that survives restarts, three live crons including the 7:30am Telegram digest, working
research jobs, and an autonomous site-build pipeline that goes brief → preview without a
browser. What you do *not* have yet is the layer that runs *your* work — invoices, Jira,
team messages, AMA/NIBS day-job, side-project tracking — and a way to drive all of it
from your phone. The highest-leverage moves are the ones that combine high autonomy with
direct revenue: get invoicing live so cash actually lands, wire the morning digest into a
two-way phone companion so you can approve/dispatch from anywhere, and stand up
draft-only Jira/team-message handling so the AMA/NIBS workload stops being your bottleneck.
Everything below is sequenced so the money-moving, hands-off items ship first and the
nice-to-haves wait. Per your SOUL.md directive, every income item names how you get paid.

---

## 2. What Shay can already do (grounded in the repo)

| Capability | Evidence (path) |
|---|---|
| Persistent orchestrator, not a chatbot — routes intent, accumulates memory | `docs/shay-shay-architecture.md` (§1-2); `SHAY-MASTER-PLAN-2026-05-28.md` (brain topology) |
| Durable Kanban (triage → running → done), survives restarts | `SHAY-MASTER-PLAN-2026-05-28.md` (Orchestration; `~/.shay/scripts/overnight_ops.py`) |
| Telegram delivery confirmed; 7:30am `morning-command-center` digest cron live | `SHAY-MASTER-PLAN-2026-05-28.md` (Active Crons §) |
| Three live crons: `context-daemon` (5min), `autonomous-curator` (2am), `morning-command-center` (7:30am) | `SHAY-MASTER-PLAN-2026-05-28.md` |
| Research jobs with citations, Data Center evidence substrate | `FAMTASTIC-STATE.md` (Research Data Center, 2026-05-19); `lib/famtastic/data-center/index.js` |
| Autonomous site build: brief → site → build → poll, no browser | `docs/autonomous-build-report.md`; `docs/shay-shay-reach.md` (`POST /api/autonomous-build`) |
| Capability/gap manifest + frequency-triggered backlog promotion | `docs/shay-shay-architecture.md` (§6); `~/.local/share/famtastic/gaps.jsonl` |
| Mission Control reader (snapshot over Data Center) — CLI/library only, no cockpit UI | `lib/famtastic/mission-control/index.js`; `scripts/mission-control-report.js` |
| Platform capabilities: site add, DB, DNS, deploy, email (Resend), vault | `platform/registry/capabilities.json` |
| Brain topology: Claude (plan/judge) + Gemini (research) + Codex (review) + Ollama (free workers) | `SHAY-MASTER-PLAN-2026-05-28.md` |

**Not present yet:** `billing` and `work` capabilities do not exist in
`platform/registry/capabilities.json` — two sibling agents are designing them now
(billing = invoice generation; work = Jira/standup drafting).

---

## 3. Capability gap map

Autonomy = how much runs without you. Profit = direct revenue or revenue-enabling.
Effort: S = ≤1 session, M = 2-4, L = 5+. Status: exists / in-design / not-started.

| # | Capability | What it unlocks | Autonomy | Profit | Effort | Dependencies | Status |
|---|---|---|---:|---:|:--:|---|---|
| 1 | **Invoicing / billing** | "I have an invoice that needs billing" → Shay generates, sends, tracks paid/unpaid. Cash lands. | 70 | 95 | M | payment-provider decision (#7); sibling `billing` capability | in-design |
| 2 | **Payment-provider decision + wiring** | Stripe/PayPal/GoDaddy chosen → invoices are actually payable + reconciled | 60 | 90 | S→M | Fritz decision; vault keys | not-started |
| 3 | **Morning command-center digest (two-way)** | Today's digest already sends; add reply-to-act so you triage/approve from the 7:30am message | 85 | 55 | S | exists (cron); needs Telegram action handlers | exists→extend |
| 4 | **Phone companion** | Run all of it from your phone: approve invoices, dispatch builds, answer Jira, send drafts | 80 | 70 | M | #3 two-way Telegram; approval policy (#7) | not-started |
| 5 | **Jira / work-ticket management** | Create/triage/respond to tickets across AMA + NIBS; standup drafting | 65 | 60 | M | sibling `work` capability; Jira access grant; draft-vs-send policy | in-design |
| 6 | **Team-message drafting** | Drafts messages to your team; you approve or auto-send per policy | 60 | 50 | S→M | sibling `work` capability; channel access; send policy | in-design |
| 7 | **AMA / NIBS day-job automation** | The full "automate all my work" — orchestrates #5+#6 against your two employers' workflows | 55 | 65 | L | #5, #6, access grants, approval policy | not-started |
| 8 | **Side-project tracking** | Side projects surface as tracked plans with status/momentum; nothing rots | 75 | 35 | S | Kanban (exists) + Mission Control plan tracking | exists→extend |
| 9 | **Home-services site sales ($397/mo)** | Recurring revenue from the autonomous build pipeline | 50 | 100 | M | #1 invoicing; #2 payment; deploy keys | partial (build exists) |
| 10 | **Fractional AI Officer ($3.5-7.5k/mo)** | Highest per-engagement revenue; Shay does the delivery work | 40 | 100 | L | #1, #5, #6 (proof of capability); your time to sell | not-started |
| 11 | **Mission Control cockpit (visual)** | One surface to see every plan's stage/momentum/autonomy/profit | 50 | 40 | M | command-center scorer (parent session building it) | in-design |

Notes on scoring consistency:
- Profit 90-100 = directly moves cash (invoicing, payment, the three income plays).
- Profit 50-65 = revenue-enabling / time-freeing (work automation lets you sell #10).
- Autonomy 80+ = runs unattended after setup; 40-60 = needs your judgment per item
  (selling, approving sends, employer-specific calls).

---

## 4. Priority sequence (autonomy × profit)

Opinionated, as your second-in-command. Rank = autonomy × profit, adjusted for unblock value.

1. **Payment-provider decision + wiring (#2).** *Score ~54, but it's the unblock.* Nothing
   in the money column moves until you pick a provider. It's a one-decision, small-build
   item. Do it first because it gates #1, #9, #10.
2. **Invoicing / billing (#1).** *Score ~67.* Your literal stated need ("an invoice that
   needs billing"). Highest profit of any non-blocked item. Ship the moment #2 lands. Start
   draft-and-send-on-approval, graduate to auto-send for trusted recipients.
3. **Two-way morning digest (#3).** *Score ~47, near-zero effort, already half-built.* Turns
   the existing 7:30am cron into a control surface. Cheapest autonomy gain on the board and
   the foundation for the phone companion.
4. **Phone companion (#4).** *Score ~56.* Your explicit "run all of this from my phone." Built
   on #3's two-way channel. Once this exists, every other capability becomes mobile for free.
5. **Side-project tracking (#8).** *Score ~26 but effort S and it rides existing Kanban +
   Mission Control.* Cheap, keeps nothing from rotting, and feeds the cockpit. Quick win.
6. **Jira / work-ticket management (#5).** *Score ~39.* The biggest chunk of "automate all my
   work." Start draft-only against one employer (pick AMA *or* NIBS), prove it, then expand.
7. **Team-message drafting (#6).** *Score ~30, effort S.* Pairs naturally with #5; same access
   work, same approval policy. Ship alongside #5 for the same employer.
8. **Home-services sites ($397/mo) (#9).** *Score 50.* Build pipeline already exists; gated only
   by #1/#2. Once invoicing + payment are live, this is recurring cash with little new code.
9. **AMA / NIBS full day-job automation (#7).** *Score ~36, effort L.* The convergence of #5+#6
   across both employers. Earn the trust (and the access) incrementally; don't grant it all
   on day one.
10. **Fractional AI Officer ($3.5-7.5k/mo) (#10).** *Score 40, profit 100.* Highest revenue, but
    it's a sales motion that depends on #1/#5/#6 existing as *proof*. Sequenced last because
    it needs the rest as a portfolio, not because it matters least.
11. **Mission Control cockpit UI (#11).** *Score ~20.* Valuable glue, low marginal autonomy/profit.
    The parent session is already building the scorer; let the visual surface follow the data.

---

## 5. Decisions only Fritz can make

Keep these short and concrete — they're the human-only forks blocking the sequence:

1. **Payment provider.** Stripe vs PayPal vs GoDaddy Payments. This unblocks invoicing and all
   three income plays. (Open item already flagged in `SHAY-MASTER-PLAN-2026-05-28.md`.)
2. **Jira/work access.** Which systems does Shay get credentials to — AMA Jira, NIBS Jira, both?
   Start with one. Which Slack/Teams/email channels for team messages?
3. **Send-vs-draft policy.** For each surface (invoices, Jira replies, team messages), decide:
   what may Shay *send autonomously* vs *draft for your one-tap approval*. Recommend: draft-only
   for anything customer- or boss-facing until trust is earned; auto-send for internal
   status/standup updates.
4. **GoDaddy inventory + reseller state.** What domains exist and what's underutilized
   (the morning-interview open item) — needed to price the $397/mo and reseller plays.

---

## 6. How this plugs into the Command Center

The parent session is building a Mission Control dashboard generator (`scripts/command-center`)
that scores plans by **stage / momentum / autonomy / profitability**. Every roadmap item above
should land as a **tracked plan**, not a loose note, so it shows up in that scorer:

- **Each numbered capability becomes a plan** under `plans/<plan-id>/` and is added to
  `active_parent_ids` (the same registry `scripts/plans/audit.js` reads for active / drift /
  stale). The audit already flags active-with-zero-open-tasks drift, so a roadmap item with no
  tasks will surface as needing tasking — exactly the behavior we want.
- **Autonomy and profit scores from Section 3 map directly onto the scorer's autonomy/profit
  axes.** They were written 0-100 and kept consistent specifically so they're chartable without
  re-derivation. Stage comes from plan status (in-design → building → shipped); momentum comes
  from recent commits / closeouts (the audit's stale check already approximates this).
- **The existing Mission Control reader** (`lib/famtastic/mission-control/index.js`,
  `scripts/mission-control-report.js`) projects Data Center jobs, witness checks, claims,
  decisions, and needs-Fritz items. The command-center scorer should consume the same snapshot
  so a roadmap plan's research proofs and capability checks roll up under it automatically.
- **Decisions in Section 5 surface as `needs-Fritz` items** in the snapshot — they are
  human-only forks, so they should appear in the cockpit as blocking flags on the plans they
  gate (payment provider blocks plans #1/#9/#10, etc.).
- **Income plays carry the profit weight**, so the scorer ranking will naturally float
  invoicing, payment wiring, and the three revenue plays to the top — matching the priority
  sequence in Section 4 and honoring the SOUL.md "how does Fritz get paid" directive.

Concrete next step for the parent session: register plans #1-#11 with the autonomy/profit scores
above, set initial stage from the Status column, and let `scripts/command-center` rank them so
the cockpit opens on the money-moving, hands-off work first.
