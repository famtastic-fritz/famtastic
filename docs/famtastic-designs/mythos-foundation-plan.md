# Mythos Foundation Plan — FAMtastic Designs Foundation MVP

_Generated: 2026-06-11 · Status: patched per review · Source: mythos-master-prompt-v2.md + foundation-findings.md + infrastructure-inputs.md + ChatGPT foundation interview (2026-06-11) + repo reality audit_

_Revision 2026-06-11 (v2.1): patched in place per `mythos-plan-patch-prompt-2026-06-11.md` (ChatGPT/CJ review) — generator boundary strengthened, geography corrected to Treasure Coast/South Florida, Church Connect elevated to signature campaign, Cash Sprint claim-path QA added, Fritz-review calibration model, expanded launch-blocking list. The pre-patch version is preserved in git history (commit 12f1bbe)._

> **Standing assumption A1 (Fritz-confirmed during interview):** Proof Engine v1 builds on the existing fam-hub site factory as its execution backend, but is architected as a separate orchestration layer with a **swappable generator boundary**. All other open details proceed on labeled assumptions with decision points — nothing in this plan stalls on missing information.
>
> **Citation key:** references like "Q9", "Q18/A33" point to `docs/famtastic-designs/interviews/chatgpt-foundation-interview-2026-06-11.md` (currently on origin/main only — read via `git show origin/main:<path>`). Mythos's own interview used 1 of its allotted 7 questions.

---

## 1. Executive Summary

FAMtastic Designs is not a web agency with a website. It is a **proof-first revenue engine** with an immersive digital showroom in front of it and an agent swarm behind it.

The core insight from the repo audit: **most of the engine already exists.** The fam-hub site factory builds FAMtastic-grade multi-page sites today (template-first parallel builds, DNA rules, hero/nav skeletons, logo pipeline, post-processing, Netlify deploy — proven by the-best-lawn-care.netlify.app). A lead pipeline skeleton already exists at `pipeline/agents/` (scout, outreach, followup, responder, supervisor) with a gated `sender.py` choke point. A working Resend + MySQL + GoDaddy backend reference exists at `~/famtastic-sites/mbsh-reunion/backend/`. A SQLite job queue with cost tracking exists at `~/.config/famtastic/studio.db`.

This plan therefore does **not** propose building a new system. It proposes:

1. **Wire what exists into one Proof Engine** — a thin orchestration layer that drives lead discovery → scoring → proof generation (via the site factory) → AI quality review → gated outreach → claim/deposit.
2. **Build the immersive public shell** — FAMtasticDesigns.com as a digital showroom (3D entry, animated Proof-to-Profit pipeline, campaign paths) on a modern front end, separate from factory-generated proof sites.
3. **Launch 4 parallel campaigns** — Church Connect, Nonprofits, Local Service, Professional Services — through one shared engine with per-campaign skins and metrics.
4. **Route every task to the cheapest sufficient capability** — subscription lanes first (Claude Code, existing CLIs), then Haiku/Batch/structured-outputs for repetitive work, premium models only for architecture and final QA.

**Primary metric:** deposits collected. **Target:** first deposit within 14 days of build start; the 7-Day Cash Sprint (§31) is designed to make that possible before the immersive site is even finished.

---

## 2. Product Thesis

**What FAMtastic Designs sells:** transformation, demonstrated before it is purchased.

The proof IS the pitch. A prospect doesn't read a portfolio — they open a private link and see *their own business* already transformed: their name, their services, their gaps closed, their money path visualized. The FAMtastic definition ("results are the proof") is the literal product mechanic, not a slogan.

Three structural advantages over a normal agency:

1. **Marginal cost of a proof approaches zero.** The site factory builds a tailored multi-page site in ~4–6 minutes on a flat-rate Claude subscription. Competitors quote; FAMtastic ships the preview first.
2. **The engine runs while Fritz sleeps.** Discovery, scoring, proof generation, QA, and (gated) outreach are agent work. Fritz handles exceptions, calls, and closes.
3. **Every sale compounds.** Each fulfilled site produces reusable workflows, skills, vertical knowledge (Pinecone research), and proof-gallery assets that make the next proof better and cheaper.

What it is NOT: a cookie-cutter template shop, a page-count vendor, or a YouTube-agency clone chasing the same lawn-care niches with the same scripts. Reusable = workflows, engines, scoring, skills. Custom = the final site, story, copy, and offer.

---

## 3. Revenue-First Launch Strategy

**The 14-day cash filter (adopted from the foundation findings):** if a task doesn't help collect a deposit in the next 14 days, it goes to Phase 2. Applied ruthlessly:

| Helps collect a deposit in 14 days | Phase 2 |
|---|---|
| Proof generation via existing factory | Custom proof-generation pipeline rewrite |
| Claim page + Stripe Payment Link | Full subscription billing portal |
| Business review form → email → manual triage | Fully automated inbound scoring |
| 10 hand-picked leads per campaign, semi-auto outreach | Mass automated discovery |
| Simple deposit-capable landing shell (1 page, FAMtastic-grade) | Full immersive 3D showroom |
| Resend domain verification + 2 addresses | Full email identity suite |

**Launch sequencing (three waves):**

- **Wave 1 (Days 1–7) — Cash Sprint:** §31. Minimal claimable shell, 20–40 proofs across 4 campaigns, manual-gated outreach, deposit path live. Revenue possible by day 7.
- **Wave 2 (Days 8–21) — Foundation:** Immersive shell pages, business review form wired to backend, proof engine orchestration (auto pipeline with AI QA gate), admin views, campaign metrics.
- **Wave 3 (Days 22–30) — Compounding:** Auto-send for high-confidence proofs, proof gallery, onboarding automation, workstream dashboard, skills extraction.

**Pricing posture (flexible, not rigid — per Fritz):**

- **Starter / Claim-Your-Proof:** $199 deposit + $50–$99/mo (hosting + care via FAMtastic Hosting cross-sell).
- **Launch:** $499–$999 flat depending on scope.
- **Systems (church/nonprofit/e-com/automation):** custom quote, call-first.
- **Church flexibility:** pastor-paid deposit with church reimbursement; sponsor/donor-funded setup; split schedules.
- Every proof page shows a *recommended* package but presents the full transformation path — the upsell is showing everything.

---

## 4. FAMtastic Way Brand/Offer System

**The definition is the product:**

> FAMtastic (adj.): Fearless deviation from established norms with a bold and unapologetic commitment to stand apart on purpose, applying mastery of craft to the point that the results are the proof, and manifesting the extraordinary from the ordinary.

**The FAMtastic Way — six-step customer journey (from the interview):**

1. **See It** — the immersive site + the proof show what's possible.
2. **Prove It** — a private preview of *their* business, transformed.
3. **Claim It** — deposit or call; the proof becomes theirs.
4. **Build It** — factory + human polish ships the real site.
5. **Grow It** — tracking dashboards show calls, bookings, giving, sales.
6. **Automate It** — AI workflows (free for early clients to build buzz; future upsell).

**Brand personality stack (Fritz's order):** Bold/creative first ("Wow, this is who I'm working with?"), tech-genius/AI-powered second, corporate/professional third, street-smart entrepreneur energy throughout.

**Voice rules:** create the need around "see." No jargon walls. Cheap never reads as poor quality. Define FAMtastic explicitly on the site (it is not a typo — it is the method) and prove it through the work.

**Working phrase:** *From Proof to Profit: See how the FAMtastic Way can glow up your business.*

**Logo/visual carryover (logo redesign is a separate workstream — do not touch here):** FAM capitalized and emphasized as the impact point; explosion/burst transformation symbolism; bold separate colors for F/A/M as historic cues; "tastic" secondary. Until redesign lands, use a styled text treatment with correct FAM capitalization — **never a placeholder SVG** (standing rule).

---

## 5. Foundation MVP Site Map

```
famtasticdesigns.com
├── /                       Home — immersive 3D entry, Proof-to-Profit pipeline scene
├── /the-famtastic-way      The method: definition, 6 steps, animated workflow
├── /services               What We Build (websites, AI automation, mobile e-commerce)
├── /preview                Get a Preview / Business Review form  ← PRIMARY CTA TARGET
├── /church-connect         Campaign: FAMtastic Church Connect
├── /nonprofits             Campaign: Nonprofits & community orgs
├── /local-business         Campaign: Local service businesses
├── /professional           Campaign: Professional service providers
├── /proof-gallery          Examples / before-after transformations
├── /pricing                Pricing / Claim Options
├── /contact                Contact
├── /start                  Client onboarding form (post-claim)
├── /p/<proof-slug>         PRIVATE proof/preview routes (noindex, unguessable slug)
├── /claim/<proof-slug>     Claim/deposit page bound to a proof
└── /admin                  Proof backend foundation (auth-gated; can start localhost-only)
```

**Assumption (labeled):** `famtasticdesigns.com` is owned or acquirable via the GoDaddy reseller account. **Decision point D1:** confirm domain + DNS state before Wave 1 day 2. If unavailable, fall back to a domain Fritz already holds and 301 later.

---

## 6. Immersive Design System

**Direction: digital showroom, not agency site with a 3D hero.** The showroom proves the FAMtastic Way by showing transformation in motion.

**Core scenes/mechanics:**

1. **3D entry (Home):** the Proof-to-Profit pipeline as a navigable 3D scene — ordinary storefront/church/office on one side, agent-worker nodes transforming it mid-scene, glowing professional growth-system on the other. Scroll/drag drives the camera through the transformation.
2. **Animated workflows:** "how FAMtastic builds, launches, tracks, grows" rendered as animated diagrams (build → deploy → track → grow), reused as section components across pages.
3. **Interactive campaign paths:** from the entry scene, four lit paths (Church / Nonprofit / Local / Professional) that fly the camera toward that campaign's world before routing to its page.
4. **Visual dashboards:** animated mock dashboards (giving, bookings, leads, sales) as proof of the tracking promise — the same components later power real client dashboards.
5. **Floating proof modules:** commercial-style cards showcasing transformations, usable as headers/sections anywhere ("engine to build more scenes," per the interview).

**Technique stack (cheapest sufficient first):**

- **Tier 1 (always):** scroll-driven CSS/WebGL motion, parallax, Lottie/Rive animations, GSAP ScrollTrigger timelines. Carries 80% of the immersion at 5% of the cost.
- **Tier 2 (hero + campaign paths):** Three.js via React Three Fiber + drei. One well-crafted scene with instanced/low-poly assets, baked lighting.
- **Tier 3 (deferred):** generated video/Seedance/HeyGen content modules — pilot later, don't block launch.

**Guardrails (hard rules):** immersive not cluttered; premium not gimmicky; LCP < 2.5s on mid-range mobile — 3D loads progressively behind a styled static first paint; full keyboard/reduced-motion fallbacks (`prefers-reduced-motion` swaps scenes for composed stills); every scene ends at a CTA; Lighthouse perf ≥ 80 mobile is launch-blocking (§36).

**Relationship to the factory design system:** the showroom front end is a separate codebase from factory-generated sites, but adopts the same brand DNA (FAM emphasis, transformation motion vocabulary). Factory sites keep the `fam-hero-layered` BEM system; the showroom may use richer tooling since it is hand-built once.

---

## 7. Page and Route Logic

**Page creation rules (applies to all public pages):**

1. Every page declares: purpose, primary CTA, target persona, metadata block, section list.
2. Sections compose from a shared component library (hero scene / animated workflow / proof modules / dashboard mock / CTA band / FAQ). New page = new composition, not new components.
3. Every page ends in a CTA band routing to `/preview` (default) or campaign-specific claim path.
4. No page ships without mobile + reduced-motion verification.

**Route classes:**

| Class | Pattern | Index? | Render |
|---|---|---|---|
| Public marketing | `/`, `/services`, … | Yes | Static/SSG, immersive components |
| Campaign | `/church-connect`, … | Yes | SSG from campaign config (one template, 4 skins) |
| Private proof | `/p/<slug>` | **No** (noindex, nofollow, unguessable slug) | Static per-proof build OR server-rendered shell reading proof record |
| Claim | `/claim/<slug>` | No | Bound to proof record; payment + call routing |
| Forms | `/preview`, `/start`, `/contact` | Yes | Static page + API POST |
| Admin | `/admin/*` | No | Auth-gated (start: localhost/tunnel; Wave 3: basic-auth hosted) |

**SEO/metadata logic:** title pattern `<Page> — FAMtastic Designs`; campaign pages get persona-keyword descriptions; OG images generated per campaign (factory can produce these); JSON-LD `ProfessionalService` on home/contact; sitemap excludes `/p/*`, `/claim/*`, `/admin/*`; `robots.txt` disallows the same.

---

## 8. Navigation/Footer Logic

**Primary nav (7 items max, per findings):** Home · The FAMtastic Way · Services · Church Connect · Get a Preview (CTA-styled) · Proof Gallery · Contact.

- Campaigns other than Church Connect live under a "Who We Serve" dropdown (or the footer) to keep nav ≤ 7 — Church Connect gets top-level placement because it is the distinctive thesis.
- "Get a Preview" is visually a button, always last, always visible (sticky nav after scroll).
- Mobile: full-screen overlay menu with the same order; CTA pinned at bottom.

**Footer (four columns + legal strip):**

1. **Services** — Websites, AI Automation, Mobile E-commerce, Get a Preview.
2. **Campaigns** — Church Connect, Nonprofits, Local Business, Professional Services.
3. **Ecosystem** — FAMtastic Hosting (live cross-promote link), FAMtastic Thoughts (placeholder until that workstream ships), Support.
4. **Company** — Contact, Pricing, Proof Gallery.
5. Legal strip — Privacy, Terms, © FAMtastic Designs, "FAMtastic is not a typo. It's the method." micro-line.

**Rules:** private/claim/admin routes never appear in nav or footer; footer is one shared component rendered from config (single source of truth); Hosting link carries UTM tagging for cross-sell attribution.

---

## 9. Campaign Architecture

One shared Proof Engine, four campaign skins. A campaign = config record (`Campaign` object, §13) defining persona, signals, proof template emphasis, outreach angles, offer ladder, and metrics. Adding campaign #5 is a config + template exercise, not new code.

**Campaign hierarchy (patched per 2026-06-11 review — these are not four equal cards):**

- **Church Connect — the signature campaign.** The flagship proof of FAMtastic differentiation. Churches gather support weekly; FAMtastic shows how digital giving, streaming, events, member access, visitor follow-up, and mobile connection support giving, attendance, and engagement all week. Fritz's gut insight stays front and center.
- **Local Services — the proven fast-cash lane.** Carries near-term deposits while signature accounts mature.
- **Nonprofits — the close cousin to churches.** Shared proof features (donate/volunteer/events), shared respect rules.
- **Professional Services — the higher-ticket authority lane.** One serious client can pay for the whole system.

**Sharpened campaign angles:**

| Campaign | Angle | First proof must show | Offer |
|---|---|---|---|
| Church Connect | Your church already gathers support weekly. Let's make giving, streaming, events, and member connection easier all week. | Giving button, livestream hub, event registration, visitor follow-up, prayer request, member access | Founding Church Connect setup + flexible deposit |
| Nonprofits | Your mission needs a clearer donation, volunteer, and event path. | Donate, volunteer, event signup, sponsor credibility, impact story | Nonprofit Growth Proof + donation/event setup |
| Local Services | Turn local searches into calls, bookings, and jobs. | Click-to-call, booking, reviews, service areas, before/after gallery | Claim your local business proof |
| Professional Services | One serious client can pay for the whole system. | Authority homepage, consultation CTA, lead magnet, booking, credibility blocks | Professional Authority Site |

| | 1. Church Connect | 2. Nonprofits | 3. Local Service | 4. Professional |
|---|---|---|---|---|
| **Persona** | Pastor / ministry leader / trustee board of a small-to-mid church | ED / founder / volunteer coordinator of a community org | Owner-operator (lawn, cleaning, trainers, barbers, detailers, contractors) | Tax prep, consultants, realtors, insurance, coaches |
| **Core pains** | Outdated/no site; messy streaming; giving friction; visitor follow-up gaps | Donation friction; volunteer chaos; credibility gap; event registration | Invisible on Google; Facebook-only; missed calls = lost jobs | Looks smaller than they are; no booking flow; referral-only growth |
| **Money/value angle** | Churches collect money weekly — show giving, attendance, engagement growth | Donations + grants need credibility; events need registration | Searches → calls → booked jobs, trackable | Higher ticket; one client pays for the site |
| **Proof page angle** | "Your digital giving, connection & growth system" — giving page, sermon hub, events, visitor welcome | Donate + volunteer + event flows live in the preview | "Your business found, called, booked" — call/booking CTAs everywhere | Authority site: credentials, booking, lead magnet |
| **Outreach angle** | Value-first, ministry-respectful; reference their actual livestream/site state | Mission-forward; reference their actual campaigns | Direct: "searched X in <city>, here's what shows up — and what could" | Consultative; peer-professional tone |
| **Offer options** | Flexible schedules; pastor-paid deposit; sponsor-funded | Discounted/sponsored tier; grant-friendly invoicing | $199 down + monthly; fast launch | $499–$999 flat or custom |
| **Conversion path** | Proof → call (decision-by-committee) → deposit | Proof → call → deposit | Proof → claim → pay immediately | Proof → claim or call |
| **Fulfillment complexity** | High (giving/stream/member features phased) | Medium-high | Low (factory sweet spot — proven verticals) | Medium |
| **Track** | Full metric set (§26) per campaign, weekly compare | same | same | same |

**Campaign page rules:** built from one campaign template: persona hero (immersive module skinned per vertical) → pain mirror section → proof feature walkthrough (animated) → offer ladder → proof CTA → FAQ. Church Connect additionally lists the proof feature menu (giving, recurring giving, special offerings, sermon/media hub, events, visitor welcome, prayer requests, volunteer signup, ministry pages, mobile announcements, YouTube/livestream/Zoom embed, member access, members-only viewing, paid/donation event access, automated visitor follow-up, mobile-friendly church experience).

**Expected dynamics (be honest in tracking):** local service likely converts fastest; churches likely produce the largest and most durable accounts but with committee lag. The engine's job is to measure, not presume — Fritz's gut says churches; the data will confirm or redirect within 30 days.

---

## 10. Proof Engine Architecture

The revenue core. **Design principle: orchestration layer over existing components, with a swappable generator boundary** (Fritz-confirmed).

```
                       ┌──────────────────────────────────────────────┐
                       │            PROOF ENGINE (orchestrator)        │
                       │  state machine + job queue (extends studio.db)│
                       └──────────────────────────────────────────────┘
   OUTBOUND                                                    INBOUND
   1. Discover (Maps/directories) ──┐                ┌── 1. /preview form POST
   2. Classify (campaign, Haiku)    │                │   2. Parse + validate (structured)
   3. Presence scan (site/social/GBP)│   ┌────────┐  │   3. Score opportunity
   4. Score (signals → 0-100)       ├──▶│ LEAD   │◀─┤   4. Queue proof
   5. Generate proof  ──────────────┤   │ RECORD │  │   5. Recommend package
        │ via GENERATOR BOUNDARY    │   └────────┘  │   6. Notify Fritz (high-value)
        ▼                           │                │
   ┌─────────────────────────────┐  │                │
   │ Generator v1: fam-hub site  │  │                │
   │ factory (spec.json → build  │  │                │
   │ → runPostProcessing → dist) │  │                │
   │ [swappable: v2 could be     │  │                │
   │  component-assembly, API,   │  │                │
   │  or new pipeline]           │  │                │
   └─────────────────────────────┘  │
   6. AI quality review (rubric)    │
   7. Outreach draft (personalized) │
   8. Compliance/deliverability gate│──▶ sender.py choke point (ONLY exit)
   9. Deliver proof link            │
   10. Track click/reply/form       │
   11. Claim/deposit path           │
   12. Onboarding + fulfillment     │
   13. Lessons learned → skills     │
```

**Orchestration ownership (patched per 2026-06-11 review — this is a hard boundary):**

> **Site Studio / fam-hub is a generation worker. The FAMtastic Proof Engine is the orchestrator.**

The Proof Engine — never the factory — owns: campaign selection, lead classification, scan facts, lead scoring, proof-level decision, claim strategy, personalization rules, outreach rules, QA gates, event tracking, lesson capture, and skill creation. The factory executes proof/site generation behind the boundary and decides nothing about the funnel.

**Generator boundary contract (the swappable seam — strengthened):**

```text
ProofRequest = {
  lead_snapshot,                            // frozen copy — generator never reads live DB
  campaign_key,
  campaign_config_version,                  // pin: which config produced this proof
  proof_level: L1 | L2 | L3,
  scan_findings,
  source_facts_allowed_for_personalization, // ONLY these facts may appear in copy
  required_blocks,                          // campaign-mandated sections
  forbidden_claims,                         // e.g. invented metrics, guarantees
  asset_policy,                             // logo rule, image sourcing
  tone_policy,
  claim_cta_policy,
  expiration_policy,
  qa_policy,                                // which checklist version gates this proof
  requester_agent,
  request_reason
}

generate_proof(ProofRequest) → ProofArtifact

ProofArtifact = {
  proof_id,
  generator_id, generator_version,
  campaign_config_version,                  // echoed for audit
  pages, page_map,
  dist_path, preview_url,
  proof_manifest,                           // machine-readable: blocks present, assets used
  source_facts_used,                        // must be ⊆ source_facts_allowed
  claims_made,                              // every claim, traceable to a fact
  cta_map,
  qa_checklist_result,
  screenshot_paths, mobile_snapshot_paths,
  build_log,
  cost_estimate, cost_actual,
  rollback_or_delete_path,
  regeneration_reason,                      // null on first build
  failure_reason_enum                       // null on success
}
```

The engine validates `source_facts_used ⊆ source_facts_allowed_for_personalization` and `claims_made` against `forbidden_claims` **before** the proof can reach `qa_review` — fabrication is caught structurally, not by vibes.

v1 implementation calls the factory headlessly: write `spec.json` from the ProofRequest → invoke build → `runPostProcessing()` (mandatory — no bypass) → deploy `dist/` to the previews host → screenshot pass → return the ProofArtifact. Anything that satisfies the contract can replace it later without touching the engine.

**Proof depth ladder (cost control):**

- **L1 — Teaser (cheap, default for cold outbound):** single proof landing page from the factory's landing template + GBP/scan data. ~1 factory call.
- **L2 — Full preview (inbound requests + leads scoring ≥ 70):** 3–5 page tailored site.
- **L3 — Systems demo (claimed/call-booked only):** giving flows, booking embeds, dashboard mock.

Cold outreach gets L1 with "want the full preview?" as the click incentive — protects build minutes and makes click-tracking meaningful.

**State machine (Proof):** `queued → generating → qa_review → ready → sent → clicked → claimed | expired | rejected`. Every transition logged with timestamp, agent, model/tool, cost — this powers §17 and §20's observability.

**AI quality review (step 6):** fixed binary checklist, NOT a 0–10 vibe score (standing lesson from cerebrum): correct business name everywhere / no placeholder text / no broken images / logo rule respected (real or styled text, never placeholder) / mobile renders / claims match scan facts / campaign-appropriate tone / CTA + claim link present / loads under threshold. Any failure → flagged to Fritz. Pass → eligible for send under the **calibration-first review model** (patched per 2026-06-11 review; preserves Fritz's F-then-A answer without making him the bottleneck):

```text
Wave 1: Fritz reviews the first 5 sends per campaign + high-value church/system
        leads + anything flagged by QA, compliance, sensitive-language,
        uncertainty, or high-risk gates. AI quality review handles normal
        cases after calibration.
Wave 2: Fritz reviews flags/exceptions only. Auto-send stays blocked until
        graduation criteria (§36) are met.
Wave 3: Auto-send for L1 low-risk proofs that pass all gates and meet the
        confidence threshold. Church/nonprofit may keep a stricter review
        cycle longer if the data shows risk.
```

---

## 11. Private Preview Page Pattern

Each proof gets a private page at `/p/<slug>` (slug = 10+ char random, unguessable; `noindex`). It is a **sales page wrapped around a preview**, with these required blocks:

1. **Personal header:** "Built for {Business Name}" + FAMtastic framing line.
2. **Current gap/opportunity:** 2–4 observed facts from the presence scan (no fabrication — every claim traceable to scan data; compliance rule).
3. **The new experience:** embedded/linked preview site (L1 teaser or L2 full build) — live and clickable, not screenshots.
4. **Suggested flow:** "how customers/members would move through this" — visit → action → money/connection, as a simple animated diagram.
5. **Money/growth opportunity:** campaign-specific value framing (giving uplift, booked jobs, donations) — directional language, no invented numbers.
6. **Recommended package** + full transformation path (the upsell is showing everything).
7. **Claim button** → `/claim/<slug>`.
8. **Talk-first option:** book-a-call link (required for church/nonprofit committee dynamics).

**Mechanics:** view + click events fire to the backend (`Email Event` / proof tracking, §13); pages expire (default 30 days) → claimed proofs convert to client workspaces, expired ones show a courteous revive form; preview hosting on a wildcard previews host (D2: `previews.famtasticdesigns.com` subpaths vs per-proof Netlify subdomains — start with the path-based host, cheaper and one cert).

---

## 12. Business Review / Contact Form Flow

**Business review form (`/preview`) — the inbound engine intake.** Two-step to maximize completion:

- **Step 1 (10 seconds):** Business name · Category (4 campaigns + other) · Website/Facebook URL (optional) · Email. → Submit works here; everything after is gravy.
- **Step 2 (optional enrichment):** What does growth look like? (calls / bookings / giving / donations / sales) · Biggest frustration (free text) · Phone (optional) · How soon? (now / 30 days / exploring).

**Pipeline:** POST → validate + honeypot + rate-limit (mbsh-reunion backend pattern: `validate.php`, `rate-limit.php` equivalents) → create `Lead(source=inbound_form)` → structured parse (Haiku, structured outputs) normalizes free text into signals → score → queue proof (L2 — inbound earns the full preview) → confirmation email via Resend ("Your FAMtastic preview is being built — link within 24h") → Fritz notified for `score ≥ 80` or `timeline = now`.

**Contact form (`/contact`):** simple name/email/message → `Contact` record + Resend notification to `hello@`. No scoring.

**Form field logic (rules):** never ask what the scanner can find; every field maps to a data-model field (no orphan questions); spam defense = honeypot + time-trap + rate limit (skip CAPTCHA friction at this scale); all submissions tracked with `source`, `utm_*`, referrer for §26 attribution.

---

## 13. Backend/Admin Data Model

**Two data planes (deliberate):**

- **Hosted plane** (forms, proof tracking, payments, email events — must be reachable from the public site): MySQL on the existing GoDaddy database **(assumption A2 — pending §23 evaluation)** behind a small PHP API following the proven mbsh-reunion pattern (`db.php`, `resend.php`, `rate-limit.php`, `cors.php`, `validate.php`).
- **Orchestration plane** (swarm jobs, build state, costs — lives where the agents live): extends the existing SQLite `~/.config/famtastic/studio.db` job-queue schema (already has approval state machine + `cost_estimate`/`cost_actual`).
- A sync worker reconciles the two on a schedule (hosted events pulled down; proof statuses pushed up). **Decision point D3:** if GoDaddy MySQL fails the §23 evaluation, swap the hosted plane to Neon/Supabase Postgres free tier — the PHP API is the only layer that changes.

**Objects (purpose · key fields · relationships · statuses · tracked events · admin actions):**

| Object | Purpose | Key fields | Relationships | Status values | Tracked events | Admin actions |
|---|---|---|---|---|---|---|
| **Lead** | A business/org worth a proof | name, category, location, urls{site,fb,gbp}, contact{email,phone}, source, signals[], score, utm | → Campaign, → Proofs, → Contact | new, scanned, scored, proofed, contacted, replied, claimed, client, dead, suppressed | created, scanned, scored, status_change | rescore, reassign campaign, suppress, merge dupes |
| **Campaign** | A vertical engine config | key, persona, signals_weighting, proof_template, outreach_angles[], offer_ladder, status | → Leads, → Proofs, → metrics rollup | draft, active, paused, retired | launched, paused, weekly rollup | edit config, pause, compare |
| **Proof** | One generated preview + its lifecycle | lead_id, level(L1-3), slug, preview_url, generator{id,version}, qa{checklist,result}, cost_actual, expires_at | → Lead, → PreviewPage, → EmailEvents, → Payment | queued, generating, qa_review, ready, sent, clicked, claimed, expired, rejected | every transition + view/click | approve, reject, regenerate, extend expiry, force-send |
| **Preview Page** | The /p/<slug> sales wrapper | proof_id, blocks{gaps[],flow,value,package}, views, last_viewed | → Proof | live, expired, converted | view, claim_click, call_click | edit blocks, expire, revive |
| **Contact** | A human we may email | name, email, phone, role, lead_id, opt_out, suppression_reason | → Lead, → EmailEvents | active, unsubscribed, bounced, suppressed | opt_out, bounce, complaint | suppress, restore, edit |
| **Client** | A claimed/paying account | lead_id, package_id, sites[], hosting_crosssell, mrr, health | → Lead, → Payments, → OnboardingForm, → Workstreams | onboarding, active, paused, churned | status_change, mrr_change | edit, add site, pause |
| **Package** | A sellable offer | name, campaign_key, deposit, monthly, flat, includes[], fulfillment_complexity | → Payments, → Clients | active, retired | conversion stats | edit, retire, clone |
| **Payment** | Money movement | client_id/proof_id, provider(stripe/cashapp/invoice), type(deposit/monthly/flat), amount, external_id, status | → Client, → Package | pending, paid, failed, refunded | webhook events, manual mark-paid | reconcile, refund note, resend link |
| **Onboarding Form** | Post-claim intake | client_id, brand_assets[], content_answers, domain_pref, completed_pct | → Client | sent, partial, complete | submitted, nudge_sent | nudge, edit, mark complete |
| **Email Event** | Every send + its fate | contact_id, proof_id, identity(from), template, resend_id, type(send/open/click/bounce/complaint/unsub) | → Contact, → Proof | none — deliberate deviation: append-only immutable log; lifecycle state lives on Contact (suppression) and Proof (sent/clicked) | all Resend webhooks | inspect, replay-safe view |
| **Workstream** | A build-the-business track | name, owner(agent/Fritz), priority, revenue_impact, dependency, blocker, next_action, deadline, cost | → LessonsLearned | planned, active, blocked, done, parked | status_change, blocker_set | update, reprioritize, close |
| **Lesson Learned** | Captured improvement | context(agent/workstream/proof), what_happened, root_cause, fix, reusable? | → Workstream, → ReusableSkill | logged, promoted, retired | promoted_to_skill | promote, edit, retire |
| **Reusable Skill** | A packaged repeatable workflow | name, trigger, steps, owner_agent, source_lessons[], version | → LessonsLearned | draft, active, deprecated | usage_count | publish, version, deprecate |

**Admin foundation (Wave 2):** a single `/admin` table-view app (leads, proofs queue with approve/reject, payments, email events, campaign compare). Start localhost-only (matches current Studio posture; client-facing access is a known gap) — basic-auth hosted view in Wave 3.

---

## 14. Email and Deliverability Architecture

**Identities (create at GoDaddy/Workspace level for human inboxes; verify domain in Resend for automated):**

| Address | Purpose | Sender display | System |
|---|---|---|---|
| `hello@famtasticdesigns.com` | Human-facing general | FAMtastic Designs | GoDaddy/Workspace inbox |
| `fritz@famtasticdesigns.com` | Personal outreach + replies | Fritz at FAMtastic Designs | GoDaddy/Workspace inbox |
| `previews@famtasticdesigns.com` | Proof delivery/outreach | FAMtastic Designs | Resend (replies route to fritz@) |
| `billing@famtasticdesigns.com` | Payment/receipts | FAMtastic Designs Billing | Resend |
| `notify@famtasticdesigns.com` | System notifications (to Fritz) | FAMtastic Notify | Resend |
| `support@famtasticdesigns.com` | Support (Wave 3) | FAMtastic Support | GoDaddy inbox |

No `agent@` or robotic senders on first contact. Reply-To on automated sends always points at a monitored human inbox.

**DNS/deliverability checklist (launch-blocking):** SPF includes both GoDaddy mail and Resend; DKIM keys for both; DMARC starting `p=none` with `rua` reporting → tighten to `quarantine` after 2 clean weeks; Resend domain verified; bounce + complaint webhooks wired to `Email Event` and auto-suppression.

**Warm-up discipline:** cold-start the domain gently — ≤ 20 outreach sends/day week 1, ≤ 50/day week 2, scale with clean metrics. Outreach from `previews@`; transactional separated on `billing@`/`notify@` so outreach reputation never poisons receipts.

**The seven-gate send rule (hard requirement — enforced in `sender.py`, the single choke point):** no outreach leaves without (1) source recorded, (2) reason-for-outreach recorded, (3) personalized context present, (4) suppression check, (5) duplicate check (no contact emailed twice in 30 days without a reply), (6) deliverability check (syntax/MX/disposable), (7) compliance check (§27: accurate from/subject, physical address, working opt-out). Any gate fails → draft parked for review, never silently dropped.

---

## 15. Payment / Deposit / Claim Flow

**Per the interview (Q9):** starter packages pay immediately; bigger systems book a call.

```
/claim/<slug>
 ├── Starter / Launch tier → Stripe Payment Link (deposit) → success → /start onboarding + receipt (Resend) + Fritz notified
 ├── Systems tier (church/nonprofit/custom) → Book a call (calendar link) → quote → invoice/payment link
 └── Fallback rail: Cash App $FAMtasticFritz (already canonical in platform/config/owner-profile.json; invoice generator exists)
```

- **Wave 1:** static Stripe Payment Links per package (no code, live in minutes) + Cash App fallback. Manual reconciliation in admin. **Assumption A3:** a Stripe account exists or can be opened immediately; **decision point D4** — if Stripe onboarding stalls, launch on Cash App + invoices (already working) and add Stripe in Wave 2.
- **Wave 2:** Stripe Checkout sessions created per-proof (amount bound to recommended package), webhook → `Payment` record → proof `claimed` → onboarding email automatically.
- **Wave 3:** recurring billing for monthly care plans (Stripe subscriptions); FAMtastic Hosting cross-sell attached to every closed site (domains/hosting/email through the reseller).
- **Church flexibility:** payment links support pastor-personal payment with church-name invoicing; split-schedule handled as custom invoices initially — do not over-engineer.

---

## 16. Onboarding and Fulfillment Flow

1. **Claim/payment confirmed** → `Client` created → onboarding email (Resend, from previews@/billing@) with `/start` link.
2. **`/start` onboarding form:** brand assets upload (logo, photos), business facts, domain preference (have one / need one — route to GoDaddy reseller), content answers per campaign (services list, service area, giving links, sermon/stream URLs…). Partial completion saved; agent nudges at 48h/96h.
3. **Fulfillment task generation (automatic):** claimed proof spawns a fulfillment `Workstream` with checklist: finalize content → upgrade proof L1→L2/L3 as needed → domain/DNS via reseller → deploy production → connect forms/giving/booking → QA checklist → launch handoff email → tracking dashboard link.
4. **Factory does the heavy lift:** production site = the proof, upgraded with real assets through the same pipeline (surgical edits via Studio, `runPostProcessing` always).
5. **Care loop (MRR justification):** monthly automated performance email (visits, calls/clicks, form fills) — the "Grow It" promise made tangible; early clients also get the free automation starter (contact-form-to-email + lead tracker + welcome sequence) per Fritz's buzz-building decision.
6. **Close-out:** lessons logged (§18), proof assets added to gallery (with permission), vertical knowledge fed back to research/Pinecone.

---

## 17. Workstream Tracking System

Track the **business build itself**, not just leads — using the `Workstream` object (§13) surfaced in admin and mirrored to the existing plans system (`plans/` + `scripts/plans/audit.js`) so it inherits the closeout discipline already enforced in this repo.

**Initial workstreams (each with owner, priority, revenue impact, dependency, blocker, next action, deadline, cost, lessons, skill-created):**

1. Site shell (immersive showroom) — P1, direct revenue enabler
2. Proof Engine orchestration — P0, the revenue engine
3. Church Connect campaign — P1
4. Nonprofit campaign — P2
5. Local business campaign — P1 (fastest cash)
6. Professional services campaign — P2
7. Email/deliverability system — P0 (blocks outreach)
8. GoDaddy reseller integration — P2 (cross-sell)
9. Payment/checkout flow — P0 (blocks deposits)
10. Fulfillment automation — P2
11. 3D/immersive design system — P1
12. Agent swarm architecture — P1
13. Skills/workflow library — P3 (compounds)
14. Marketplace/product lane — parked (post-MVP, explicitly)

**Cadence:** weekly automated rollup (agent-generated) → blockers, deposits, per-campaign metrics, cost burn → delivered to notify@ and the admin dashboard. No workstream sits `active` with zero next-action (existing plan-closeout rule applies).

---

## 18. Lessons Learned / Skill Creation System

**The loop:** incident/insight → `Lesson Learned` record → review → promote to `Reusable Skill` → skill referenced by agents on next run.

- **Capture triggers (automatic):** QA failure, send-gate failure, build failure, model fallback fired, Fritz correction, claimed proof (success analysis), expired proof (post-mortem).
- **Storage honors existing memory homes:** lessons append to `.wolf/cerebrum.md`/`buglog.json` patterns where code-related; business lessons live in the data model + brain notes; promoted skills become actual `.claude/skills/` entries or `pipeline/` workflow modules so the swarm literally runs them.
- **Skill promotion bar:** a lesson becomes a skill when it (a) recurred or will recur, (b) has a written trigger + steps, (c) saved measurable time/cost/quality. Examples expected early: "church proof spec template," "GBP scan checklist," "outreach personalization recipe per signal type."
- **Per Fritz (Q18/A33):** after any successful new process, a custom skill is created so the flow is repeatable — this is a standing rule for every agent, not an aspiration.

---

## 19. Multi-Agent Swarm Architecture

**Shared contract (applies to every agent; avoids repeating 13 attributes × 20):** every agent logs `{agent, model/tool, tokens/cost, duration, result, misses}` per task to the orchestration DB; failures route to fallback then park for review (never silent); every agent writes lessons on failure AND on notable success; quality gates are binary checklists; human (Fritz) review triggers are listed per agent; each agent's proven process gets extracted into a Reusable Skill.

**Routing tiers referenced below:** **T1** = flat-rate subscription lanes (Claude Code CLI, Codex weekly-capped, Gemini CLI) — preferred for anything they can do (standing cerebrum rule: subscription-first, cap-aware fallback). **T2** = cheap API (Haiku 4.5 $1/$5 per MTok, structured outputs, Batch at 50%). **T3** = mid API (Sonnet 4.6 $3/$15). **T4** = premium (Opus 4.8 $5/$25) — architecture, hard reasoning, final QA only.

> **Note on attribute coverage:** the master prompt requires 13 attributes per agent. The tables below carry the 8 that drive build decisions (purpose, I/O, model, fallback, cost risk, key failure mode, human review trigger); the shared contract above covers quality-check method, tracking metrics, lessons logging, and skill creation uniformly. The remaining per-agent detail (full metrics, prompts, checklists) is **deliberately deferred** to `docs/famtastic-designs/agents.md` (§34 item 6) — a conscious deviation to keep this plan readable.

### Planning & design agents

| Agent | Purpose | In → Out | Best | Fallback | Cost risk | Key failure mode | Human review |
|---|---|---|---|---|---|---|---|
| **Strategy Architect** | Architecture/offer/roadmap decisions | metrics + state → decisions, revised plans | T4 Opus | T3 Sonnet | High per-call, low frequency | Plausible-but-wrong strategy from stale data | All output reviewed (low frequency, high stakes) |
| **Brand/Voice Guardian** | Enforce FAMtastic voice + FAM logic in all copy | drafts → pass/fail + edits | T3 Sonnet | T2 Haiku checklist mode | Low | Over-blocking (kills good copy) or rubber-stamping | Sensitive church/nonprofit language always |
| **UX/Site Architect** | Page compositions, flows, CTA logic | briefs → page specs | T3 | T1 Claude Code | Low-med | Spec drift from design system | New page patterns |
| **Immersive/3D Design Planner** | Scene specs, motion storyboards, perf budgets | brand + page specs → scene plans | T4 (novel creative) | T3 | High per-call, rare | Over-scoped scenes blowing perf budget | Scene plans before build |

### Engine agents (the 24/7 loop)

| Agent | Purpose | In → Out | Best | Fallback | Cost risk | Key failure mode | Human review |
|---|---|---|---|---|---|---|---|
| **Lead Discovery** | Find candidate businesses/churches | campaign config → raw lead list | T1 scripts + Maps/directory APIs (extend `pipeline/agents/scout.py`) | T2 Haiku parse | Med (Places API quota) | Dupes/junk leads flooding the queue | None (downstream gates) |
| **Lead Classifier** | Campaign + dedupe + normalize | raw lead → typed Lead | T2 Haiku + structured outputs, **batched** | rules-only fallback | Low (batched) | Misroutes (historical #1 classifier bug class) | Misroute rate sampled weekly |
| **Presence Scanner** | Site/social/GBP audit → signals | lead urls → findings[] | T2 + OpenAI web search OR fetch+Haiku extract | manual checklist | Med (per-lead web calls) | Hallucinated findings → false personalization | None |
| **Lead Scorer** | Signals → 0–100 + reason codes | findings → score | T2 Haiku structured, **batched** | static weight formula | Low (batched) | Score inflation/drift vs outcomes | Score-vs-outcome audit monthly |
| **Campaign Strategist** | Tune angles/offers from results | weekly metrics → config changes | T3 | T4 escalation if stuck | Low-med | Overreacting to small samples | Config changes approved by Fritz |
| **Proof Generator** | Drive generator boundary | lead + campaign → ProofArtifact | **T1 site factory** (flat-rate Claude sub — near-zero marginal cost) | retry, then park | Low marginal; **subscription-cap risk** | Cap exhaustion silently stalling the queue | QA gate downstream |
| **Outreach Writer** | Personalized, signal-grounded drafts | lead + proof + findings → email draft | T3 Sonnet | T2 Haiku for L1 teasers | Med (per-draft Sonnet) | Generic/mismatched pitch (the credibility killer) | First 5 per campaign (calibration); then flags + high-value only |
| **Compliance/Deliverability Checker** | Seven-gate enforcement | draft + contact → pass/park | T2 Haiku checklist + deterministic checks | deterministic-only | Low | False-pass (worst case: compliance incident) | Every parked draft |
| **Quality Reviewer** | Binary proof checklist (§10) | ProofArtifact → pass/flag | T3 Sonnet (vision-capable pass on screenshots later) | T2 checklist | Med | Rubber-stamping broken proofs | Every flag |
| **Pricing/Package Recommender** | Map proof+signals → offer | lead + proof → package rec | T2 structured | rules table | Low | Under-pricing systems deals | Custom quotes always |
| **Payment/Onboarding Router** | Claims → payments → onboarding tasks | webhook events → records + emails | deterministic code (no LLM) | n/a | None | Double-processing webhooks (idempotency) | Payment anomalies |
| **Fulfillment Task Planner** | Claimed proof → build checklist | client + proof → Workstream tasks | T2 | template-only | Low | Missing tasks → fulfillment gaps | Complex/custom scope |

### Operations agents

| Agent | Purpose | In → Out | Best | Fallback | Cost risk | Key failure mode | Human review |
|---|---|---|---|---|---|---|---|
| **Analytics/Results Tracker** | Metrics rollups, campaign compare | event log → weekly report | deterministic + T2 summary | raw tables | Low | LLM-invented numbers (rule: numbers from SQL only) | Weekly read |
| **Workstream Manager** | Keep workstreams honest (next actions, blockers) | workstream state → updates/nudges | T2 | n/a | Low | Nag fatigue / stale state | Blocker escalations |
| **Lessons/Skills Librarian** | Capture lessons, propose skill promotions | events → lessons, skill drafts | T3 | T2 | Low | Noise lessons burying signal | Skill promotions approved |
| **Cost Auditor** | Spend per proof/agent/model; routing recommendations | cost log → audit + alerts | deterministic + T2 | n/a | Low | Missing a silent paid-lane flip | Threshold alerts (cost/proof > $1.00 — 2× the $0.50 target; the band allows normal variance while catching runaway routing before it doubles spend) |
| **Repo/Docs Writer** | Keep docs honest (SITE-LEARNINGS, plan files, this doc's children) | session results → doc updates | T1 Claude Code | T3 | Low (subscription) | Documenting plans instead of reality (Rule 4) | docs: commits reviewed |

**Failure-mode notes baked in from the buglog (recurring classes):** cap-aware routing (subscription limits silently flipping to paid is the #1 historical failure — every T1 agent must 429→explicit fallback, never silent billing); prompt/template drift (skeletons and checklists injected literally into prompts, never "use good judgment"); async lifecycle races (one proof job = one owned directory + state row; no concurrent writes to a lead); classifier misroutes (default to the cheap/safe intent; sampled audits).

**Autonomy posture (per §Automation Philosophy, calibration-first):** agents run the loop end-to-end; Fritz touches: the first 5 sends per campaign (calibration), high-value leads, QA flags, sensitive church/nonprofit language, payment issues, custom replies, uncertainty parks. AI review handles normal cases after calibration; auto-send is earned per §36 criteria.

---

## 20. Model/Tool Routing and Cost-Control Strategy

### 20.1 Native provider capability map

| Provider | Surface | Role in this architecture | Verdict |
|---|---|---|---|
| Anthropic | Claude Code subscription lane | Proof/site generation (factory), docs writing — near-zero marginal cost | USE NOW (cornerstone) |
| Anthropic | API: Haiku 4.5 / Sonnet 4.6 / Opus 4.8 | Engine bulk work / copy+QA / architecture+escalation respectively | USE NOW |
| Anthropic | Prompt caching · Batch (50%) · structured outputs · tool use | API-lane cost floor: cached prefixes + nightly batches + schema-bound outputs | USE NOW |
| Anthropic | Skills · MCP | Repeatable-process packaging; engine state exposure | USE NOW (already in repo) |
| Anthropic | Managed agents / hosted orchestration · compaction | Future cloud relocation; long sessions | DEFER / PILOT |
| OpenAI | Web search · structured outputs · batch | Presence-scanning class tasks | USE NOW / PILOT |
| OpenAI | Deep research · background mode · flex tiers | Per-vertical research fuel; long async tasks | PILOT |
| OpenAI | Computer use · file search · tool search | No current fit (scripts/Pinecone cover it) | AVOID / DEFER |
| Google | Maps/Places · Gemini CLI (free tier) | Lead discovery backbone; research/second-opinion lane | USE NOW |

Pricing facts used in this section (Opus 4.8 $5/$25 per MTok, Sonnet 4.6 $3/$15, Haiku 4.5 $1/$5; batch −50%; cache reads ≈0.1×, 5-min-TTL writes 1.25×; cache minimums 4096 tokens Opus/Haiku 4.5, 2048 Sonnet 4.6) are **per Anthropic platform docs as cached 2026-05** — re-verify and pin them in `vendor-capability-matrix.md` (§34 item 8) before treating the routing matrix as costed. Full per-feature reasoning: §21.

### 20.2 Cheapest-sufficient routing matrix

| Task class | Modality | Reliability need | Speed | Cost sens. | Native/specialized option | Cheapest sufficient default | Premium escalation | Owner agent | QA gate | Failure fallback |
|---|---|---|---|---|---|---|---|---|---|---|
| Strategy/architecture | text | very high | low | low | — | Opus 4.8 (T4) | already premium | Strategy Architect | Fritz review | Sonnet draft + Fritz |
| Research | text+web | high | low | med | OpenAI deep research; Gemini CLI free | Gemini CLI / Sonnet+web | Opus synthesis | Campaign Strategist | source-grounding check | manual research |
| Lead discovery | web/API | med | med | high | Maps/directory APIs (no LLM) | scripts + API calls | n/a | Lead Discovery | dedupe+schema check | manual lists |
| Lead classification | text | med | high (bulk) | high | **Batch API (50%) + structured outputs** | Haiku batched | Sonnet on low-confidence | Lead Classifier | sampled audit | rules-only |
| Presence scanning | web+text | med | med | high | OpenAI web search tool | fetch + Haiku extract | Sonnet on parse failure | Presence Scanner | findings schema | manual scan checklist |
| Proof generation | code/HTML | high | med | high | **fam-hub factory on Claude subscription** | T1 factory (flat-rate) | Opus for novel verticals' spec design | Proof Generator | binary QA checklist | retry → park |
| Outreach drafting | text | high | med | med | structured outputs for fields | Sonnet | Opus for high-value leads | Outreach Writer | compliance gates | Fritz writes |
| Deliverability/compliance | text+rules | very high | high | high | deterministic checks first | Haiku checklist + code | n/a (never premium) | Compliance Checker | gate itself | park for Fritz |
| Form parsing/intake | text | high | high | high | **structured outputs** | Haiku structured | Sonnet on validation fail | (inbound flow) | schema validation | raw text stored |
| Payment/onboarding routing | events | very high | high | high | Stripe webhooks (no LLM) | deterministic code | n/a | Payment Router | idempotency checks | manual reconcile |
| Analytics/reporting | data | med | low | high | SQL + templates | deterministic + Haiku prose | Sonnet monthly deep-dive | Analytics Tracker | numbers from SQL only | raw tables |
| Repo/docs writing | text | med | low | high | Claude Code subscription | T1 Claude Code | Sonnet API if cap hit | Docs Writer | docs: commit review | manual |
| Quality review | text+vision | high | med | med | screenshot+vision pass | Sonnet checklist | Opus on disputes | Quality Reviewer | binary checklist | Fritz reviews |
| Cost auditing | data | high | low | high | usage APIs + logs | deterministic + Haiku | n/a | Cost Auditor | reconciles to invoices | manual export |

### 20.3 Prompt caching opportunities

- **Proof-generation prompts:** factory runs on the subscription lane (caching is Anthropic-side there), but any API-lane generation uses a frozen prefix: brand DNA + campaign template + skeletons (≥ 4k tokens, well above Opus/Haiku's 4096-token cache minimum; Sonnet's is 2048) with lead-specific data after the last breakpoint. Cache reads ≈ 0.1× input price; 5-min TTL writes 1.25×.
- **Outreach + QA prompts:** stable rubric/voice prefix cached; per-lead context appended. Order discipline: tools → system → volatile (a known silent-invalidator class — no timestamps in system prompts).
- **Batch+cache combo:** batched classification shares one cached system prefix across thousands of requests — the two discounts stack.

### 20.4 Batch/background opportunities

- **Nightly batches (50% off, results well within 24h):** lead classification, lead scoring, re-scoring on new signals, weekly metrics prose, suppression-list hygiene. None of these are latency-sensitive — the engine queues all day, batches at night.
- **Background-style execution:** long factory builds already run as background jobs in the queue; OpenAI background mode is the equivalent if any OpenAI-side long task emerges (pilot only).

### 20.5 Specialized worker recommendations

- **Don't use an LLM where code works:** discovery API calls, dedupe, webhook routing, DNS checks, MX validation, metrics SQL — deterministic workers.
- **Reuse existing specialized workers:** `pipeline/lib/sender.py` (gated send), `copywriter.py`, factory adapters, `inkscape`/`potrace` adapters for asset work, cpanel-mcp for GoDaddy deploys.
- **Local models:** avoided for now per Fritz's standing rule (not proven/tested/quality-checked in this stack).

### 20.6 Premium escalation rules

Escalate to Opus 4.8 only when: (1) novel architecture/strategy decision, (2) a T2/T3 agent failed twice with different prompts, (3) high-value lead (score ≥ 85 or church systems deal) final-pass review, (4) monthly deep-dive analysis. Every escalation logs its reason — the Cost Auditor reports escalation rate; > 10% of engine tasks escalating = routing bug, not model need (cerebrum rule: weak output → fix the harness, not the model).

### 20.7 Cost observability requirements

Every LLM call records: agent, provider, model, tokens (in/out/cached), cost estimate, task id, result quality flag — into the orchestration DB (extend the existing `cost_estimate`/`cost_actual` columns). Dashboards answer: **cost per proof** (target < $0.50 marginal on the API lane, alert at $1.00 = 2× target; near-$0 when factory/subscription carries generation), **cost per deposit**, cost per agent per week, subscription-cap utilization (Claude/Codex/z.ai caps — alert before, not after). The §26 metric "AI/tool cost per proof" comes straight from this log.

### 20.8 Experiments to validate routing assumptions

Seven experiments, each with hypothesis → method → pass bar → decision: (1) Haiku-vs-Sonnet scoring quality, (2) nightly batch latency fit, (3) prompt-cache hit verification, (4) OpenAI web search vs fetch+Haiku scanning, (5) factory L1 proof cost/quality at volume, (6) outreach writer tier A/B by reply rate, (7) deep-research value per dollar vs Gemini CLI. Full experiment cards with success criteria: §35; results recorded in `native-feature-experiments.md` (§34 item 9).

---

## 21. Native Provider Capability Map

Verdicts: **USE NOW** / **PILOT** (narrow test) / **DEFER** / **AVOID**.

### Anthropic

| Capability | Verdict | Why |
|---|---|---|
| Prompt caching | **USE NOW** | Engine prompts are long-stable-prefix by design (§20.3); 0.1× reads are the single biggest API-lane saving. |
| Structured outputs (`output_config.format`, strict tools) | **USE NOW** | Scoring, classification, intake parsing, package recs all schema-bound — eliminates parse-retry loops (a recurring buglog class). |
| Tool use / parallel tool use | **USE NOW** | Scanner and engine agents are tool loops; parallel calls for multi-URL scans. |
| Batch processing (50%) | **USE NOW** | Nightly classification/scoring is the textbook case. |
| Skills | **USE NOW** | Already core to this repo (`.claude/skills/`); §18 promotes proven processes into skills — same mechanism, now revenue-facing. |
| MCP | **USE NOW (already in use)** | `mcp-server/`, cpanel-mcp exist; proof-engine state can be exposed to any agent surface the same way. |
| Claude Code subscription lane | **USE NOW (cornerstone)** | The factory's near-zero marginal build cost is the business's structural advantage. Cap-aware fallback mandatory. |
| Managed Agents / hosted orchestration | **DEFER** | The repo already has a working local orchestration layer (queue, launchd, adapters). Hosted agents add per-session container cost + new failure surface without removing any current constraint. Revisit when client-facing/always-on cloud execution is needed (it eventually will be — note in roadmap). |
| Context compaction / long-context controls | **PILOT** | Useful for long fulfillment sessions; not engine-critical. Test in one long Studio session. |
| Cookbook patterns (verification loops, orchestrator-worker) | **USE NOW (as patterns)** | The QA-gate + parked-exception design is exactly the self-verification pattern; no new infra needed. |

### OpenAI

| Capability | Verdict | Why |
|---|---|---|
| Responses API tool use | **PILOT** | Useful where OpenAI-side tools (web search) are the draw; not a second orchestration stack. |
| Web search | **USE NOW** | Best productized fit for presence scanning — replaces a custom scrape-parse loop for GBP/social discovery. |
| File search / retrieval | **DEFER** | Pinecone + local research index already cover retrieval. |
| Tool search | **DEFER** | Tool count per agent is small; not the bottleneck. |
| Computer use | **AVOID (for now)** | Slow/expensive for what scripts + APIs do deterministically; revisit for directory-form submissions if that channel matters later. |
| Skills/MCP/connectors | **PILOT** | Only where an OpenAI-side worker earns a permanent role. |
| Background mode | **PILOT** | Pair with any long OpenAI-side research task. |
| Batch processing | **USE NOW (if OpenAI lane active)** | Same nightly-batch logic as Anthropic's. |
| Structured outputs | **USE NOW (where OpenAI used)** | Same schema-bound rationale. |
| Deep research | **PILOT** | One run per campaign vertical ("digital giving adoption in small churches") as outreach/strategy fuel; compare against Gemini-CLI research before making it a habit (cost). |
| Flex/latency-cost tiers | **PILOT** | Candidate for batch-class work if OpenAI lane grows. |
| Custom GPTs (Fritz's interest, Q18) | **DEFER to product lane** | Real opportunity (interview GPT, business-review GPT) but it's a Phase-2 product, not Foundation MVP plumbing. Captured in workstream 14. |

### Google / other

| Capability | Verdict | Why |
|---|---|---|
| Gemini CLI (existing, free-tier) | **USE NOW** | Already wired as an adapter; research + second-opinion lane at zero marginal cost. |
| Google Maps/Places API | **USE NOW** | Primary lead-discovery source (Fritz's #1 pick). Watch quota pricing; cache aggressively. |
| z.ai GLM / Ollama | **AVOID for this engine** | Reserved for Shay's brain per standing rule; engine quality bar needs proven lanes. |

---

## 22. Google Ecosystem Integration Plan

- **Maps/Places API** — lead discovery backbone (campaign category × geography queries; ratings/review-count/website-presence fields feed scoring directly). First-market queries target the Treasure Coast/Palm Beach primary geography (§32), expanding to Broward/Miami-Dade, then Florida statewide. USE NOW.
- **Google Business Profile signals** — scanner checks GBP existence/completeness/photos/hours; "bad or missing GBP" is a top qualified-lead signal and a concrete outreach hook. USE NOW (via Places data + page fetch; the GBP management API needs client authorization — that's a *fulfillment upsell*, not a scanning tool).
- **Search Console + GA4** — installed on famtasticdesigns.com at launch; offered to every client site as part of "Grow It" tracking. USE NOW.
- **Google Sheets** — optional mirror of the leads table for Fritz's mobile review convenience (one-way export; the DB stays canonical). PILOT.
- **YouTube embeds** — church livestream integration in proofs (embed-only; no API needed at MVP). USE NOW.
- **Gemini API/CLI** — research lane as above. USE NOW.
- **Google Workspace** — only if GoDaddy mailbox provisioning proves worse; otherwise skip (D5).

## 23. GoDaddy / Reseller / Existing DB Evaluation Plan

**Reseller account (already paid for — use it):** domain cross-sell on every closed client (margin + stickiness); DNS automation via the existing GoDaddy domain helper; client email upsell. The reseller storefront itself is NOT the MVP funnel — FAMtasticDesigns.com is.

**Existing GoDaddy-hosted database — structured evaluation (Wave 1, day 2; 60–90 minutes):**

| Check | Pass bar | How |
|---|---|---|
| Type/version | MySQL ≥ 5.7 / MariaDB ≥ 10.3 | cPanel info |
| Remote access | External connections allowed (or cPanel API reachable) | connection test from dev machine |
| Connection limits | ≥ 25 concurrent | plan docs / test |
| Performance | < 100ms simple queries from PHP on same host | timed probe |
| Backups | Automated daily or scriptable dump | cPanel |
| Security | Per-app user, TLS, no wildcard grants | config review |
| Migration path | mysqldump portable to Postgres/MySQL elsewhere | by construction |
| Fit | Handles Lead/Proof/EmailEvent/Payment volume (thousands of rows — trivial) | schema review |

**Verdict logic (the standing decision rule applied):** the mbsh-reunion backend already proved PHP + MySQL + Resend works on this exact hosting — so **default = use it for the hosted plane** (A2), with the API layer as the migration seam. Use it because it launches faster and is already paid for; leave it the moment it limits automation/tracking/security (D3 swap to Neon/Supabase — a half-day move thanks to the seam). Known deploy gotchas already documented: cPanel UAPI overwrite is the working deploy path; Netlify cannot link a git repo via API (vendor-UI step — plan around it once).

## 24. Resend / Email Automation Plan

Resend (key exists — verify domain on day 1) carries all automated mail:

| Flow | Template | Trigger |
|---|---|---|
| Proof delivery | "Your FAMtastic preview is ready" + private link | proof `ready` + send approved |
| Outreach (cold) | campaign-specific, personalized, 7-gate-checked | engine schedule, warm-up limited |
| Follow-up sequence | 2 touches max (day 3 nudge, day 10 last-call before expiry) — value-add framing, never nag | proof `sent` and unclicked |
| Inbound confirmation | "Preview being built — 24h" | form submit |
| Checkout/receipt | payment confirmation | Stripe/Cash App event |
| Onboarding | welcome + /start link + nudges | claim |
| Performance report | monthly client stats | cron |
| System notify | flags, parks, deposits → Fritz | engine events |

**Event tracking:** Resend webhooks (delivered/opened/clicked/bounced/complained) → `Email Event` → auto-suppression on bounce/complaint → open/click rates per campaign feed §26. Idempotent webhook handling (dedupe on event id — webhook retries are a known class of double-count bug).

## 25. Security and Secrets Policy

- **No secrets in the repo, chat, or docs — ever.** Placeholders + env names only (`OPENAI_API_KEY=`, `ANTHROPIC_API_KEY=`, `GOOGLE_API_KEY=`, `GEMINI_API_KEY=`, `RESEND_API_KEY=`, `DATABASE_URL=`, `GODADDY_API_KEY=`, `GODADDY_API_SECRET=`, `STRIPE_SECRET_KEY=`, `STRIPE_WEBHOOK_SECRET=`).
- **Storage:** local dev → `.env.local` (gitignored) and the existing platform vault (`platform/vault/vault.sh`, Keychain-backed — already built, use it); hosted PHP API → env/config outside webroot with deny rules; CI → GitHub Actions secrets if/when used.
- **Agent rule:** agents never print, log, or commit secrets; the send choke point and payment router are the only components touching live credentials.
- **App security:** rate-limit + validate every public POST (pattern exists); private slugs ≥ 64 bits entropy; admin behind auth (localhost first); Stripe webhooks signature-verified; uploaded assets sanitized (SVG sanitizer already exists in Studio — reuse); destructive admin actions behind the existing `checkGovernance()`-style gate.
- **Data care:** lead data is business-public information + voluntarily submitted form data; honor opt-outs permanently (suppression list never pruned); no purchased lists.

## 26. Analytics and Success Metrics

**Hierarchy (Fritz's order):** 1) **Deposits collected** · 2) Proof clicks + business-review form completions · 3) MRR.

**Per-campaign weekly scorecard (every metric from §Success Metrics tracked):** leads found, proofs generated, proofs sent, open rate, click rate, reply rate, form completions, deposit rate, average package value, time to close, fulfillment complexity (hrs), support burden, MRR added, AI/tool cost per proof, best-performing message, best offer, lessons logged.

**The six questions the dashboard must answer (verbatim from findings):** which category clicks? replies? pays? is easiest to fulfill? creates recurring revenue? wastes time?

**Instrumentation:** site → GA4 + server-side event log (proof views/claims are first-party DB events, not just GA); email → Resend webhooks; payments → Stripe webhooks; engine → orchestration DB. The Analytics agent compiles weekly; numbers come from SQL, prose from Haiku (numbers never LLM-generated).

**Decision cadence:** day 14 — kill/fix worst-performing outreach angle per campaign. Day 30 — scale the campaign with the best deposit rate ×2 in lead volume; re-tool the laggard, don't kill it yet (committee-lag fairness for churches).

## 27. Compliance and Outreach Guardrails

- **CAN-SPAM posture (US B2B cold email is lawful when compliant):** accurate header/from, non-deceptive subject, physical postal address in footer, visible working unsubscribe honored immediately and permanently, no harvested-via-prohibited-means lists. **Assumption A4:** US-only outreach at MVP — if Canada/EU prospects enter, CASL/GDPR consent rules are stricter; geography filter until then.
- **Truthfulness rule (stronger than the law):** every personalization claim traceable to a scan finding; no fake personalization, no mismatched pitch, no invented metrics ("could help increase giving" framing, never "will increase giving 40%").
- **Volume discipline:** warm-up curve (§14); per-domain daily caps; stop-loss rule — bounce > 5% or complaint > 0.1% in any 24h window → engine auto-pauses outreach and pages Fritz.
- **Sensitive-category handling:** church/nonprofit drafts always pass the Brand Guardian's respect check; calibration-first review (§10) applies — Fritz reviews the first 5 per campaign plus all high-value church/system leads and every sensitive-language flag; church/nonprofit may keep a stricter review cycle longer if the data shows risk.
- **Channels:** email only at MVP. No SMS (TCPA risk), no automated DMs, no scraping behind logins.
- **The seven send-gates (§14) are the enforcement mechanism — compliance is code, not intention.**

## 28. Recommended Stack Options

**Recommended (Option A) — labeled assumption A5, Fritz leaned "hybrid" and asked Mythos to choose:**

| Layer | Choice | Why |
|---|---|---|
| Showroom front end | **Next.js (App Router) + React Three Fiber + drei + GSAP + Tailwind** | The immersive requirement demands a real component/3D stack; SSG for marketing pages keeps it fast; massive ecosystem; vercel-* skills already installed in this environment |
| Showroom hosting | **Vercel** (free/hobby tier to start) | Zero-ops, preview deploys, edge; deploy skills exist. D6: Netlify acceptable alternative (existing account) — but the git-link-via-API limitation is a known friction |
| Proof previews | **Static factory output** on `previews.famtasticdesigns.com` (GoDaddy hosting path-based, deployed via cPanel UAPI — proven) or Netlify | Factory already emits static dist/; keep generation and showroom decoupled |
| Hosted API + DB | **PHP 8 + MySQL on existing GoDaddy** (mbsh-reunion pattern) | Proven on this exact infra, already paid, fastest path; swappable via API seam (D3) |
| Orchestration | **Node/Python on Fritz's machine** extending fam-hub + `pipeline/` + studio.db queue, launchd-managed | It exists, it works, it's flat-rate; cloud-relocate later if 24/7 uptime demands it (D7: a $6 VPS via FAMtastic Hosting is the natural future home) |
| Payments | **Stripe** (links → checkout → subscriptions) + Cash App fallback | Industry default; webhooks power automation |
| Email | **Resend** (automated) + GoDaddy mailboxes (human) | Key exists; reference implementation exists |

**Option B (maximum-reuse, fastest):** factory-built static showroom (skip React; Tier-1 immersion only via GSAP/CSS + one vanilla Three.js hero) on Netlify + same backend. Choose if Wave-1 speed matters more than the full showroom — the proof engine doesn't care which shell fronts it. **Option C (enterprise-bridge):** Drupal/Next hybrid leveraging Fritz's Drupal depth (an old Drupal `site-famtastic-designs` exists in `sites/`) — explicitly **rejected for MVP** (slowest to immersive), but Drupal remains the multi-tier factory's enterprise lane later.

**Decision (confirmed by 2026-06-11 review): Architecture: Option A. Launch discipline: Option B.** Build on the proper Next.js/component foundation from the start — no throwaway landing page — but ship Tier-1 immersion first (motion, scroll, workflow visuals, proof cards, dashboard visuals) and never wait on the full 3D entry scene before collecting deposits. The R3F scene matures inside the Option-A foundation while revenue runs. The MVP remains a **FAMtastic Designs Foundation MVP**, not a landing page.

## 29. Recommended Repos / Plugins / Frameworks / APIs

**Already in-house (reuse, do not rebuild):** fam-hub site factory + Studio; `pipeline/agents/*` + `sender.py` + `store.py`; mbsh-reunion PHP backend modules; studio.db queue (`lib/db.js`); platform vault + capabilities; cpanel-mcp; adapters (claude/codex/gemini/inkscape/potrace); plans/closeout system; Pinecone research index; `.claude/skills/` mechanism.

**Add (external):** `three` + `@react-three/fiber` + `@react-three/drei`; `gsap` (ScrollTrigger); `framer-motion` (UI-level); `next` + `tailwindcss`; `stripe` SDK + Payment Links; `resend` SDK (or keep raw-API PHP pattern); Google Places API client; `zod` (form/schema validation mirroring structured-output schemas); Lottie/Rive player for animated workflows; Plausible or GA4 for web analytics.

**Explicitly not adding:** a workflow SaaS (n8n/Zapier) — the queue + agents already cover it without a new bill; a CRM — the Lead/Client tables are the CRM until volume proves otherwise; LangChain-class frameworks — direct SDK + existing adapters are leaner and already understood.

## 30. 30-Day Build Roadmap

**Week 1 — Cash Sprint (§31, detail below).** Outcome: deposit path live, 20–40 proofs out, first replies.

**Week 2 — Foundation hardening:**
- Days 8–9: Business review form + hosted API + Lead/Proof/EmailEvent tables live; Resend webhooks; inbound flow end-to-end.
- Days 10–11: Proof Engine orchestration v1 — queue-driven discover→classify→scan→score→generate→QA→park-for-approval loop running nightly (batched classification/scoring).
- Days 12–13: Showroom pages 2–5 (FAMtastic Way, Services, Church Connect, Pricing) at Tier-1 immersion; claim pages bound to proof records (Stripe Checkout + webhook).
- Day 14: metrics scorecard v1; kill/fix decision on worst outreach angle.

**Week 3 — Immersive + scale:**
- Days 15–17: 3D entry scene (R3F) + animated Proof-to-Profit workflow; reduced-motion fallbacks; perf budget enforced.
- Days 18–19: remaining campaign pages + proof gallery (first real proofs, anonymized/permissioned); onboarding form + fulfillment task automation.
- Days 20–21: outreach volume ramp (warm-up curve); follow-up sequences on; admin dashboard v1 (queue approve/reject from one screen).

**Week 4 — Compounding:**
- Days 22–24: auto-send for high-confidence proofs (if §36 gate met); Lessons→Skills pipeline running; cost auditor reports.
- Days 25–27: routing experiments (§35) executed; weekly rollup automation; campaign compare + scale decision.
- Days 28–30: hardening (backup/restore drill, suppression audit, Lighthouse pass), docs regeneration (§34 files), Phase-2 scoping (client portal, custom GPTs, marketplace lane, VPS relocation).

**Throughout:** every wave ends with SITE-LEARNINGS/CHANGELOG updates per repo rules; deposits and metrics reviewed daily from day 7.

## 31. 7-Day Cash Sprint Plan

Goal: **a deposit is possible by day 7** without waiting for any Wave-2 infrastructure.

**Claim Path QA (hard gate, patched per 2026-06-11 review):** no proof outreach sends until this full path works end-to-end, verified by walking it:

```text
proof page → claim page → pay/book → confirmation → onboarding/start → admin status change → Fritz notification
```

Required conversion pieces (launch-blocking, mirrored in §36): trust/credibility block ("Why FAMtastic / Why Fritz / Why this is real"); clear claim terms; scope limits; revision limits; what happens after deposit; what is/isn't included; book-a-call path for churches/nonprofits/professionals; reply routing to a monitored inbox; payment fallback clarity (Cash App rail visible); compliant footer with physical-mailing-address placeholder; privacy/terms basics; success confirmation flow after payment.

| Day | Ship | Detail |
|---|---|---|
| **1** | Infrastructure truths | D1 domain/DNS confirmed; Resend domain verification started; email identities created; GoDaddy DB evaluated (§23); Stripe account check (D4) |
| **2** | Claimable shell + **claim path QA** | Preview/landing shell live; pricing/claim options visible; trust + claim-terms/scope blocks live; Stripe Payment Link or fallback live; booking link live; post-payment confirmation live; onboarding/start form (or temporary intake) live; admin status change or manual status tracker live; support/reply inbox confirmed; **full claim path walked and passing** |
| **3** | Proof batch #1 | Hand-pick 10 leads × 4 campaigns (Maps + Fritz's local knowledge in the Treasure Coast/Palm Beach primary geography, incl. the few personal-network candidates); factory generates L1 proofs; private slugs on previews host |
| **4** | Outreach batch #1 | Personalized drafts (signal-grounded), 7-gate checked, **calibration review: Fritz approves the first 5 per campaign**, ≤ 20 sends from previews@; track via Resend |
| **5** | Proof batch #2 + follow-up plumbing | 10–20 more proofs; click-tracking reviewed; reply handling (fritz@) |
| **6** | Iterate on signal | Double down on whichever campaign clicked/replied; revise angles; second sends within warm-up caps |
| **7** | Close + assess | Call every replier; claim pages exercised; first deposit target; scorecard v0 → Week-2 plan adjusted |

Constraint honored: nothing in the sprint is throwaway — the shell becomes the showroom's first page, the proofs seed the gallery, the leads seed the database, the send discipline becomes the engine's gates.

## 32. Missing Details Checklist

Fill-in-later items, each with its decision point:

- [ ] **D1** Domain/DNS state of famtasticdesigns.com (owner, registrar, current records)
- [ ] **D2** Previews host choice (path-based on GoDaddy vs Netlify) — default: GoDaddy path-based
- [ ] **D3** GoDaddy DB evaluation results (§23) — default: use it
- [ ] **D4 / A3** Stripe account status (A3 assumes one exists or opens immediately) — default: open one day 1; Cash App fallback live regardless
- [ ] **D5** GoDaddy mailbox vs Google Workspace for human inboxes — default: GoDaddy (already paid)
- [ ] **D6 / A5** Showroom stack + host (A5 assumes Option A: Next.js + R3F on Vercel) — default: Vercel; confirm or pick Option B at Wave-2 start
- [ ] **D7** Orchestration relocation to VPS (24/7) — default: Fritz's machine until auto-send is earned
- [ ] Which API keys actually exist and their billing state (OpenAI, Google/Places quota, Resend plan limits)
- [ ] Resend domain verification status for famtasticdesigns.com
- [ ] Physical mailing address for CAN-SPAM footer
- [ ] Calendar/booking tool for call-first paths (Cal.com free tier suggested)
- [x] Outreach geography (corrected per 2026-06-11 review — A4 US-only stands). **Primary:** Port St. Lucie, Fort Pierce, Stuart, Treasure Coast, Palm Beach County. **Secondary:** Fort Lauderdale, Broward County, Miami, Miami-Dade County. **Expansion:** Florida statewide; Atlanta/Southeast only with a specific strategic reason later. Rationale: this is the region Fritz can credibly understand, reference, and serve.
- [ ] Exact starter-package "includes" lists per campaign (draft in §15/§29 files)
- [ ] Old logo file location + color extraction for the temporary text treatment
- [ ] How Fritz prefers to review parks/flags — default: notify@ email digest + admin queue (mobile-friendly)

## 33. Risks, Pitfalls, and How to Avoid Them

| Risk | Likelihood | Mitigation (built into this plan) |
|---|---|---|
| **Architecture-instead-of-revenue spiral** (the brutal-feedback risk) | High — the vision is big | 14-day cash filter (§3); Cash Sprint ships before the 3D scene; immersion tiered so Tier-1 carries launch |
| Immersive site delays everything | Medium | Showroom decoupled from engine; Option-B sequencing inside Option A; proof links work day 3 |
| Deliverability burn (domain blacklisted early) | Medium | Warm-up curve, 7 gates, stop-loss auto-pause, transactional/outreach separation |
| Subscription caps silently flipping to paid lanes | High (it's the #1 historical failure class) | Cap-aware routing, explicit 429 fallbacks, Cost Auditor alerts, "no silent billing" rule |
| Proof quality regression at volume | Medium | Binary QA checklist, gated sends until §36 earned, DNA/skeleton injection (template-drift lesson) |
| Church sales cycle slower than cash needs | Medium-high | 4 parallel campaigns by design; local-service lane carries near-term cash while church accounts mature |
| GoDaddy DB becomes a ceiling | Low at this scale | API seam = half-day migration (D3) |
| One-person bottleneck (Fritz reviews everything) | Medium | Review queue is batched + mobile-friendly; auto-send graduation criteria defined; exceptions-only posture |
| Scope confusion with Hosting/Thoughts/Church-Connect-as-business | Low (explicitly bounded) | §Project boundaries restated; Church Connect is a campaign; Thoughts deferred; Hosting is a cross-sell |
| Cookie-cutter drift (the anti-thesis) | Medium under deadline pressure | Reusable=systems / custom=result rule enforced in QA checklist ("campaign-appropriate, tailored feel" is a gate) |
| Local-machine orchestration downtime | Medium | launchd restart pattern exists; D7 VPS relocation planned before auto-send scales |

## 34. Files to Create Next

Order matters — each unblocks the next build step. (Sequence revised per the 2026-06-11 patch prompt: agents first, then workflow/campaign methodology, then build specs. These are build-ready specifications, not generic docs.)

1. **`docs/famtastic-designs/agents.md`** — ✅ **created with this patch.** Every agent as an operating unit (mission, decision authority, methodology, budgets, retry/escalation rules, logs, metrics) + the shared AgentTaskLog schema. *Unblocks engine v1.*
2. **`docs/famtastic-designs/workflows.md`** — the 13 minimum workflows (lead discovery, lead scoring, presence scan, proof generation, proof QA, claim path QA, outreach send, reply handling, payment/deposit, onboarding, fulfillment, weekly campaign review, lesson-to-skill promotion), each with trigger, steps, responsible agent, inputs/outputs, decision gates, failure handling, logs, cost controls, human review triggers, completion criteria. *Unblocks orchestration code.*
3. **`docs/famtastic-designs/campaigns.md`** — the four campaign configs in full (personas, signals, sharpened angles from §9, offers, templates, geography). *Unblocks proof batch #1.*
4. **`docs/famtastic-designs/backend.md`** — full schemas for §13 objects + AgentTaskLog, API endpoints, status machines, admin requirements, sync design. *Unblocks API + DB build.*
5. **`docs/famtastic-designs/email-system.md`** — identities, DNS records, templates, sequences, webhook handling, suppression logic, warm-up schedule. *Unblocks day-1 DNS work.*
6. **`docs/famtastic-designs/design.md`** — brand definition, FAM logic, temp logo treatment, colors, type, spacing, motion rules, 3D/immersive rules, component styles, CTA rules, accessibility. *Unblocks showroom build.*
7. **`docs/famtastic-designs/pages.md`** — site map, page templates, route classes, page-creation rules, campaign page pattern, private preview pattern, SEO rules, content hierarchy. *Unblocks page production.*
8. **`docs/famtastic-designs/vendor-capability-matrix.md`** — §20/§21 expanded with live pricing/quota notes per provider; updated by the Cost Auditor.
9. **`docs/famtastic-designs/native-feature-experiments.md`** — §35 experiment cards with results columns.
10. **`docs/famtastic-designs/roadmap.md`** — §30/§31 as the living tracked version, tied to workstreams.

## 35. Experiments to Validate Routing Assumptions

Each experiment: hypothesis → method → success criterion → decision.

1. **Haiku-vs-Sonnet scoring quality:** score 100 leads with both; Fritz spot-grades 20. *Pass:* Haiku agrees with Sonnet/Fritz ≥ 85% → Haiku is the default scorer.
2. **Batch latency fit:** submit nightly classification batch; measure completion. *Pass:* results by morning ≥ 95% of nights → batch is the default; else split urgent/bulk.
3. **Prompt-cache hit verification:** instrument `cache_read_input_tokens` on engine prompts for 3 days. *Pass:* >70% read ratio on repeat tasks; zero reads → run the silent-invalidator audit (timestamps, unsorted JSON, varying tools).
4. **OpenAI web search vs fetch+Haiku scanning:** scan the same 30 leads both ways; compare signal completeness + cost. Winner becomes the Presence Scanner default.
5. **Factory L1 proof cost/quality at volume:** 20 L1 proofs in one nightly run; measure wall-time, failures, QA pass rate, subscription-cap impact. *Pass:* ≥ 85% QA pass, no cap breach → L1 default confirmed.
6. **Outreach model tier test:** 50/50 split Sonnet vs Haiku drafts on L1 outreach (same gates); compare reply rates after 100 sends. Data decides the writer tier.
7. **Deep-research value test:** one OpenAI deep-research run vs one Gemini-CLI research run on "small-church digital giving adoption"; Fritz judges usefulness per dollar. Decides the research lane.

## 36. Evaluation and Acceptance Rubric

**Foundation MVP success criteria (the build is "working" when):**

1. ≥ 1 deposit collected (the metric).
2. ≥ 40 proofs generated and ≥ 30 sent across ≥ 3 campaigns with full event tracking.
3. Inbound: business-review form → scored lead → proof queued with zero manual steps.
4. Outbound: nightly engine run completes discover→score→generate→QA→park unattended.
5. Every send passed all 7 gates; zero compliance incidents; bounce < 5%, complaints < 0.1%.
6. Cost observability answers "what did this proof cost?" for any proof.
7. Showroom live with Tier-1 immersion ≥ Lighthouse 80 mobile; 3D entry scene live or consciously deferred (non-blocking).

**Launch-blocking vs non-blocking gaps:**

| Launch-blocking | Non-blocking (ship without, track as known gaps) |
|---|---|
| Deposit path works end-to-end (full claim path QA, §31) | 3D entry scene polish |
| Booking link works for churches/nonprofits/professionals | Proof gallery breadth |
| Claim terms / scope limits / revision limits / what's included visible | Auto-send (earned later) |
| Trust/credibility block ("Why FAMtastic / Why Fritz / Why this is real") | Admin UI polish (tables suffice) |
| Proof links private, fast, mobile-correct | Onboarding nudge automation |
| 7 send-gates enforced in code | Monthly client report automation |
| SPF/DKIM/DMARC verified | Cross-provider routing experiments complete |
| Suppression/unsubscribe honored | Full client portal |
| Physical mailing address placeholder/solution in compliant footer | Lighthouse on admin/preview routes |
| Privacy/terms basics published | |
| Reply routing to a monitored inbox | |
| Payment fallback clarity (Cash App rail visible) | |
| Post-payment success confirmation flow | |
| QA checklist gating sends | |
| Core metrics captured: deposits/clicks/forms per campaign | |
| Mobile-friendly review queue or review digest for Fritz | |
| Lighthouse perf ≥ 80 mobile on public marketing pages (§6) | |

**Metrics that prove the plan is working (30-day bars):** ≥ 2 deposits; proof click rate ≥ 8% of delivered; reply rate ≥ 3%; form completions ≥ 10; cost per proof < $0.50 API-lane marginal; one campaign showing clear lead over others (the engine's whole point).

**How Fritz judges "good enough to launch":** run the launch-blocking column as a literal checklist; if all check, launch — regardless of how much of the non-blocking column is unfinished. Perfection is the failure mode this rubric exists to prevent.

**Manual review vs automated evaluation:**

| Fritz reviews manually | Automatically evaluated |
|---|---|
| First 5 sends per campaign (calibration), high-value church/system leads, sensitive-language flags | QA checklist on every proof |
| Flagged proofs + parked drafts | 7 send-gates |
| Custom quotes + prospect replies | Bounce/complaint thresholds + auto-pause |
| Weekly scorecard read + kill/scale calls | Cost per proof + cap utilization alerts |
| Skill promotions | Lesson capture triggers |

**Auto-send graduation gate (the F→A transition Fritz chose, adapted to calibration-first review):** 100 AI-QA-passed sends with (a) Fritz rejection rate < 5% on everything he did review (calibration sets + flags + spot-checks), (b) zero rejections in his most recent 25 reviews, and (c) clean deliverability for 14 days → auto-send enabled for L1 low-risk proofs meeting the confidence threshold; church/nonprofit may keep a stricter review cycle longer if the data shows risk.

## 37. Final Recommendation

Build it in this order, and be stubborn about the order: **deposit path → proofs → outreach gates → engine loop → immersive showroom → automation depth.**

The brutal truth applied to this plan: the single biggest risk is not technical — every hard component already exists in this repo in working form. The risk is sequencing: polishing the 3D showroom while zero proofs are in pastors' and owners' inboxes. The 14-day cash filter and the 7-day sprint are the defense. Hold to them.

Three commitments this plan asks of Fritz:

1. **Work the exception queue daily during Waves 1–2** (10 minutes, mobile) — calibrate the first 5 sends per campaign, then only flags, high-value leads, and parks. The engine generates; the calibrated AI gate earns the trust that unlocks auto-send.
2. **Let the data pick the winning campaign** — gut says churches; the engine will confirm or redirect by day 30. Both outcomes are wins because four lanes run in parallel.
3. **Feed the loop** — every close, every miss, every lesson goes into the system. The compounding (skills, vertical knowledge, proof gallery, routing data) is what turns a freelance hustle into the FAMtastic operating system.

The Foundation MVP defined here is big enough to grow from, small enough to launch in 30 days, structured enough to avoid rework (every seam — generator, DB, host, payment — is swappable), and impressive enough to sell the vision. From Proof to Profit.

---

*Next action: Fritz reviews this plan → corrections folded in → generate the §34 files in order → Day 1 of the Cash Sprint.*


