# FAMtastic Designs — Executable Roadmap

_Created: 2026-06-11 · Child doc #5 of `mythos-foundation-plan.md` (§34) · This is the living tracked version of plan §30/§31; each item maps to a Workstream record (backend.md §11) and a workflow (workflows.md)_

Legend: **LB** = launch-blocking (plan §36) · **NB** = non-blocking · Owner = agent per `agents.md` (or Fritz) · Rev = revenue impact (Direct / Enabling / Compounding).

## Phase 0 — 7-Day Cash Sprint (Days 1–7)

Goal: a deposit is possible by Day 7. **Hard gate: Claim Path QA (WF-07) GREEN before any send.**

| # | Item | Owner | Depends on | LB? | Expected output | Acceptance | Risk | Fallback | Rev |
|---|---|---|---|---|---|---|---|---|---|
| 0.1 | Domain/DNS truth (D1) + Resend domain verification started | Fritz + engine | — | LB | famtasticdesigns.com confirmed, DNS access | dig shows control; Resend verify pending ok | domain not owned | fallback domain Fritz holds, 301 later | E |
| 0.2 | Email identities + SPF/DKIM/DMARC records | engine (email-system.md) | 0.1 | LB | 5 addresses live, DNS records placed | mail-tester pass; DMARC p=none w/ rua | propagation lag | start records Day 1 morning | E |
| 0.3 | GoDaddy DB evaluation (D3) | engine | — | LB | pass/fail vs §23 bars | verdict logged + plane decision | fails eval | Neon/Supabase seam, half-day | E |
| 0.4 | Stripe account check (D4) + Payment Links + Cash App rail visible | Fritz | — | LB | one payment link per starter package | test-mode purchase completes | Stripe onboarding stalls | launch on Cash App + invoices | D |
| 0.5 | Claimable shell + full claim path (Day 2 scope per §31) | engine + Fritz walk | 0.1–0.4 | LB | shell live: pricing, trust block, claim terms/scope, /preview form, booking link, confirmation, /start intake, status tracker, reply inbox | **WF-07 GREEN all 7 hops** | underestimating conversion pieces | §31 list IS the checklist — no send until green | D |
| 0.6 | Proof batch #1 — 10 leads × 4 campaigns (campaigns.md test plans) | Lead Discovery + Proof Generator | 0.3 | LB | 40 L1 proofs at /p/ slugs | QA pass ≥ 85%; mobile-correct | factory cap | batch across nights; L1 only | D |
| 0.7 | Outreach batch #1 — calibration (first 5/campaign reviewed), ≤20/day | Writer→Guardian→Checker→Fritz | 0.5 GREEN, 0.6 | LB | ≤20 gated sends Day 4 | 7 gates pass; EmailEvents tracked | deliverability cold start | warm-up caps enforced in code | D |
| 0.8 | Reply handling live (WF-09, D-WF1 inbox decision) | engine + Fritz | 0.2 | LB | replies matched, opt-outs auto-suppressed, context cards to Fritz | test reply round-trips | unmatched senders | hello@ triage queue | D |
| 0.9 | Day-6 iterate + Day-7 close calls | Fritz + Strategist | 0.7 | — | double-down on clicking campaign; call every replier | scorecard v0 produced | small sample noise | no config changes < 20 sends | D |

## Phase 0.5 — 14-Day Deposit Push (Days 8–14)

Goal: ≥ 1 deposit collected; inbound flow zero-touch; engine loop nightly.

| # | Item | Owner | Depends | LB? | Output | Acceptance | Risk | Fallback | Rev |
|---|---|---|---|---|---|---|---|---|---|
| 1.1 | Hosted API + DB live (backend.md objects 1,3,4,5,8,10) | engine | 0.3 | LB | /api endpoints + tables | inbound form → Lead row; webhooks write events | GoDaddy quirks | seam D3 | E |
| 1.2 | /preview business review form wired end-to-end | engine | 1.1 | LB | form → Lead → score → L2 proof queued → confirmation email | zero manual steps (plan §36 crit. 3) | spam | honeypot+time-trap+rate-limit | D |
| 1.3 | Proof Engine orchestration v1 — nightly WF-01→06 unattended | all engine agents | 1.1 | LB | nightly run: discover→classify→scan→score→generate→QA→park | one full unattended night (crit. 4) | async races | one-proof-one-owner rule; parks not crashes | D |
| 1.4 | Stripe Checkout per-proof + webhook → Payment → onboarding kick | Payment Router | 1.1, 0.4 | LB | claim binds amount to package; auto-receipt; WF-11 fires | test purchase creates Client + onboarding email | webhook misses | daily reconcile sweep | D |
| 1.5 | Showroom pages 2–5 (FAMtastic Way, Services, Church Connect, Pricing) Tier-1 immersion | UX Architect + builder | design.md, pages.md | NB (shell already converts) | 4 pages live per pages.md acceptance | Lighthouse ≥ 80 mobile | scope creep | Option-B discipline: Tier-1 only | E |
| 1.6 | Outreach ramp wk2 (≤50/day) + follow-up sequences on | Checker + scheduler | 0.7 clean metrics | — | day-3/day-10 follow-ups firing, cancel-on-reply | suppression/dupe gates hold | stop-loss trip | auto-pause + page Fritz | D |
| 1.7 | Day-14 review: kill/fix worst angle per campaign | Strategist + Fritz | 0.9, WF-13 | — | ≤1 config change per campaign, versioned | sample guard ≥ 20 sends | overreacting | guard enforced | C |

## Phase 1 — 30-Day Foundation MVP (Days 15–30)

Goal: all §36 launch-blocking checks green; one campaign showing clear lead; ≥ 2 deposits.

| # | Item | Owner | Depends | LB? | Output | Acceptance | Risk | Fallback | Rev |
|---|---|---|---|---|---|---|---|---|---|
| 2.1 | 3D entry scene (R3F) + animated Proof-to-Profit workflow | 3D Planner → builder | design.md budgets | NB | Tier-2 scene live behind static first paint | perf budget held; reduced-motion twin | perf blowout | ship Tier-1 home; scene NB by design | E |
| 2.2 | Remaining campaign pages + proof gallery (permissioned) | UX Architect | 1.5 | NB | nonprofits/local/professional pages + gallery | pages.md acceptance | thin gallery | anonymized mockups until permissions | E |
| 2.3 | Admin dashboard v1 (6 views, mobile review queue) | engine | 1.1 | LB (review queue) | one-thumb approve/reject + 5 views | Fritz runs daily review from phone | UI rabbit hole | tables suffice (plan rule) | E |
| 2.4 | Onboarding automation + fulfillment task planner live (WF-11/12) | Planner agents | 1.4 | NB | claims spawn Workstreams w/ checklists | first real claim flows through | missing tasks | template + Fritz spot-check | D |
| 2.5 | Weekly scorecard automation (WF-13) + cost audit (WF-15) | Analytics + Cost Auditor | 1.3 | LB (core metrics) | scorecard + audit delivered Mondays | numbers from SQL only; six §26 questions answered | metric pipeline breaks | raw tables fallback | C |
| 2.6 | Lessons→Skills pipeline running (WF-14) | Librarian | 1.3 | NB | first promoted skills (spec templates, scan checklists) | ≥ 2 skills published + wired | noise | promotion bar | C |
| 2.7 | Auto-send graduation evaluation | Checker + Fritz | §36 gate data | NB | auto-send on/off decision for L1 low-risk | gate criteria met exactly | premature trust | stays off; church stricter cycle | D |
| 2.8 | Routing experiments #1–6 (plan §35) | Cost Auditor + agents | 1.3 | NB | experiment results in native-feature-experiments.md | pass bars evaluated | time sink | defer #7; batch #1–3 first | C |
| 2.9 | Day-28–30 hardening: backup/restore drill, suppression audit, Lighthouse pass, docs regeneration | engine + Docs Writer | all | LB (subset) | drills pass; SITE-LEARNINGS/state docs honest | restore actually tested; §36 checklist walked | skipped drills | calendar-blocked Day 28 | E |
| 2.10 | Day-30 scale decision: 2× lead volume on best campaign | Fritz + Strategist | 2.5 | — | decision logged; configs bumped | churches judged on 45-day window (fairness rule) | killing churches early | committee-lag window | D |

## Phase 2 — Automation Depth (Days 31–60, scope-locked until MVP ships)

| Item | Owner | LB? | Acceptance | Rev |
|---|---|---|---|---|
| Auto-send expansion (L2, more campaigns) as data earns it | Checker + Fritz | NB | graduation gates per tier | D |
| VPS relocation of orchestration (D7) via FAMtastic Hosting | engine | NB | 24/7 nightly runs off Fritz's machine; launchd→systemd | E |
| Client portal / hosted admin auth (D-B1) | engine | NB | clients see their dashboard | D |
| Review-request + missed-call-text-back automations (client upsells) | engine | NB | first upsell sold | D |
| Spanish-language outreach decision (D-C2) executed if approved | Fritz | NB | translated templates + Guardian rules | D |
| Monthly client performance reports automated | Analytics | NB | first month delivered to all actives | C |

## Phase 3 — Marketplace / App / GPT Lane (Day 60+, explicitly parked until Phase 2 stable)

| Item | Notes | Rev |
|---|---|---|
| Custom GPTs (interview GPT, business-review GPT) | Fritz's Q18 interest; product not plumbing | C |
| Branded portal pattern for sales teams | the approved templated-package exception | C |
| App-store free-download/paid-feature apps | "build once, sell many times" lane | C |
| Template/marketplace presence (curated, non-cookie-cutter) | only reusable *systems*, never final-site clones | C |
| Multi-tier factory (React/Next, WP, Drupal enterprise lane) | Fritz's Drupal depth; discussion phase | C |

## Standing Rules

1. The **14-day cash filter** governs all re-prioritization: doesn't help collect a deposit in 14 days → Phase 2.
2. Every item above is a Workstream row; WF-16 keeps them honest (no silent stalls).
3. LB items gate launch per plan §36; NB items ship whenever without blocking anything.
4. **Open decisions carried:** D1 (Day 1), D3 (Day 1), D4 (Day 1), D5 mailbox (Day 1, default GoDaddy), D-WF1 inbox mechanism (Day 1), D-B1 (Wave 3), D-C1 church mix (Day 1), D-C2 Spanish (Phase 2) — all owned by Fritz with engine defaults if unanswered (defaults proceed; see review packet).
