# Review Packet — FAMtastic Designs Child Docs Run (2026-06-11)

_For: Fritz + Shay/ChatGPT one-pass review · Produced by the run-all child docs execution (`mythos-run-all-child-docs-prompt-2026-06-11.md`) · No vendor research was performed in this run, per scope._

## 1. Files created/updated in this run

| File | Lines | What it is |
|---|---|---|
| `workflows.md` | 335 | 16 executable workflows (WF-01…WF-16) + master proof-to-profit diagram + cross-workflow rules |
| `campaigns.md` | 159 | Four full campaign configs (Church Connect signature; Nonprofits; Local Services; Professional) incl. queries, angles, offer ladders, 25-lead test plans, corrected geography |
| `backend.md` | 201 | All 14 objects build-ready (fields/types/indexes/statuses/APIs/validation), two-plane architecture, sync worker, GoDaddy eval gates, security model, admin views |
| `email-system.md` | 443 | Identities, DNS records (literal examples), 7 send-gates implementation map, warm-up table, 10 template skeletons, webhooks, stop-loss, launch checklist |
| `design.md` | 276 | Color/type/spacing/motion/3D systems with concrete defaults (ASSUMED hexes pending logo workstream), component + CTA + proof-card rules, 12 forbidden cookie-cutter patterns |
| `pages.md` | 380 | Full route table with render modes, nav/footer rules, form specs, /p/ + /claim/ page contracts, SEO/noindex rules, layered acceptance checklists |
| `roadmap.md` | 80 | Phase 0 (7-day sprint) → 0.5 (14-day deposit push) → 1 (30-day MVP) → 2 → 3, every item with owner/dependency/LB-flag/acceptance/risk/fallback/revenue impact |
| `review-packet-2026-06-11.md` | this file | |

Previously created (unchanged this run): `mythos-foundation-plan.md` (v2.1), `agents.md`.

## 2. Assumptions made (labeled in the docs)

| ID | Assumption | Where |
|---|---|---|
| A1 (standing) | Factory-as-backend behind swappable generator boundary | plan §10, all docs |
| A2 | GoDaddy MySQL passes §23 eval; PHP API per mbsh-reunion pattern | backend.md |
| A3/D4 | Stripe opens immediately; Cash App rail regardless | roadmap 0.4 |
| A4 | US-only, English-only outreach v1 (Spanish = D-C2, Phase 2 decision) | campaigns.md |
| A5 | Option A stack (Next.js+R3F on Vercel), Option B launch discipline | plan §28, design.md |
| A-P1 | `/p/<slug>` served as server-rendered shell reading proof record (expiry/tracking need live reads); embedded preview stays static factory output | pages.md |
| A-P3 | Slug = 16-char base62 (~95 bits) — satisfies both "10+ chars" (§11) and "≥64 bits" (§25) | pages.md, backend.md |
| DS-assumed | All design hex values + type stack (Archivo/Manrope/IBM Plex Mono) are ASSUMED pending logo workstream color extraction (DS-1) and Fritz specimen approval (DS-2) | design.md |
| New | Two-plane field-ownership rule (one writing plane per field) to kill stale-state class | backend.md |
| New | Suppression restore requires written justification; EmailEvent/AgentTaskLog insert-only at grant level | backend.md |
| New | Church campaign judged on 45-day committee-lag window, not 30 | campaigns.md, roadmap 2.10 |

## 3. Unresolved decisions for Fritz (defaults proceed if unanswered)

| ID | Decision | Default if silent | When needed |
|---|---|---|---|
| D1 | famtasticdesigns.com domain/DNS state | fallback domain Fritz holds | Sprint Day 1 |
| D3 | GoDaddy DB eval verdict | use it; seam to Neon/Supabase on fail | Day 1 |
| D4 | Stripe account | open Day 1; Cash App rail live regardless | Day 1 |
| D5 | Human mailbox provider | GoDaddy (already paid) | Day 1 |
| D-WF1 | Reply-inbox mechanism (IMAP poll vs forward-to-webhook) | IMAP poll of fritz@/hello@ | Day 1 |
| D-C1 | Church denominational mix priority in Primary ring | engine query defaults | Day 1 (improves batch #1) |
| D-C2 | Spanish-language outreach in v1 | OUT (English-only) | Phase 2 |
| DS-1/DS-2 | Old logo file location → real color tokens; type specimen approval | ASSUMED tokens ship | before showroom polish |
| D-B1 | Hosted admin auth | basic-auth + IP allowlist | Wave 3 |
| D-B2 | Upload storage root on GoDaddy | `~/private/famtastic-uploads/` | Days 8–9 |
| — | Physical mailing address for compliant footer | placeholder ships; **must be real before first send** (LB) | Day 2 |
| — | Booking/calendar tool | Cal.com free tier | Day 2 |

## 4. Risks introduced by this run

1. **Spec volume vs build speed** — ~2,000 new lines of spec could invite over-engineering. Mitigation: roadmap Phase 0 only needs items 0.1–0.9; everything else waits.
2. **Two-plane sync complexity** — a real moving part. Mitigation: field-ownership rule + 10-min cursor sync + "sync lag is degraded, not down" posture.
3. **Server-rendered /p/ pages (A-P1)** deviate from "static-first" instinct — justified by expiry/tracking needs, but adds a hosted render path to keep fast.
4. **Design tokens are assumptions** — building too much UI before DS-1/DS-2 risks rework. Mitigation: tokens are CSS variables; swap is cheap.
5. **Church 45-day fairness window** delays the day-30 scale decision for the signature campaign — accepted deliberately to protect the thesis from premature kill.

## 5. Deviations from the plan (and why)

1. **Workflows count is 16, not 13** — the run-all prompt's list (adds Claim Path QA, Cost Audit, Workstream Update as first-class workflows). Supersedes plan §34 item 2's "13 minimum."
2. **pages.md resolved the §11 vs §25 slug tension** (10+ chars vs 64 bits) at 16-char base62 rather than asking.
3. **EmailEvent has no status field** — carried forward as the documented deliberate deviation (append-only log).
4. **Professional campaign may open Secondary geography at week 2** (density argument) — a campaign-level exception to the ring-advance rule, flagged for Strategist proposal rather than hardcoded.

## 6. Build order recommendation

Exactly roadmap Phase 0 → 0.5 → 1. First three build sessions: (1) Day-1 infrastructure truths (D1/D3/D4/DNS/identities); (2) Day-2 claimable shell + claim-path QA to GREEN; (3) proof batch #1 via the factory. Nothing else starts until 0.5 is green.

## 7. What should be reviewed first vs what can proceed

- **Review first (changes downstream behavior):** campaigns.md angles/offers (CJ/Shay sharpen further), email-system.md templates (voice), roadmap Phase-0 sequence, the §3 decision defaults.
- **Can proceed without review:** backend.md table creation, workflows.md engine scaffolding, design-token CSS variables, pages.md route skeletons — all reversible and assumption-labeled.

## 8. Exact next prompt for Shay/ChatGPT

```text
You have access to the GitHub repo: famtastic-fritz/famtastic

Review the FAMtastic Designs child-doc set in one pass:

docs/famtastic-designs/review-packet-2026-06-11.md   (read first — assumptions, deviations, open decisions)
docs/famtastic-designs/workflows.md
docs/famtastic-designs/campaigns.md
docs/famtastic-designs/backend.md
docs/famtastic-designs/email-system.md
docs/famtastic-designs/design.md
docs/famtastic-designs/pages.md
docs/famtastic-designs/roadmap.md

Against: mythos-foundation-plan.md (v2.1) and agents.md.

Do not restart anything. Return:
1. Corrections as a patch list (file → section → change → why), severity-ordered.
2. Verdicts on the §3 open decisions you can resolve without Fritz.
3. Anything that blocks Sprint Day 1 from starting tomorrow.
4. Sharpened outreach copy for the four campaigns' template skeletons if you see weaknesses.
Keep it to one review packet; the next run executes your patch list and starts the Sprint.
```
