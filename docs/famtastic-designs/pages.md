# FAMtastic Designs — Pages & Routes

_Created: 2026-06-11 · Child doc of mythos-foundation-plan.md (§34 item 7)_

This is the build-ready page/route specification for the FAMtastic Designs Foundation MVP. It is the rulebook the UX/Site Architect agent (agents.md §1.3) composes against: every `PageSpec` it emits must satisfy the rules here. Stack context (plan §28, confirmed): **Architecture Option A, launch discipline Option B** — Next.js App Router + Tailwind + GSAP (+ R3F maturing inside it) on Vercel; hosted PHP API + MySQL on GoDaddy for form/proof/payment state.

---

## 1. Route Map

Verbatim from plan §5 — these are the only routes in the Foundation MVP. No route is added without a new route class being approved by Fritz (agents.md §1.3: the Architect may not invent route classes).

| Route | Page | Render | Index? | Auth? |
|---|---|---|---|---|
| `/` | Home — immersive entry, Proof-to-Profit pipeline scene | SSG | Yes | No |
| `/the-famtastic-way` | The method: definition, 6 steps, animated workflow | SSG | Yes | No |
| `/services` | What We Build (websites, AI automation, mobile e-commerce) | SSG | Yes | No |
| `/preview` | Get a Preview / Business Review form ← PRIMARY CTA TARGET | SSG + API POST | Yes | No |
| `/church-connect` | Campaign: FAMtastic Church Connect (signature) | SSG from campaign config | Yes | No |
| `/nonprofits` | Campaign: Nonprofits & community orgs | SSG from campaign config | Yes | No |
| `/local-business` | Campaign: Local service businesses | SSG from campaign config | Yes | No |
| `/professional` | Campaign: Professional service providers | SSG from campaign config | Yes | No |
| `/proof-gallery` | Examples / before-after transformations | SSG | Yes | No |
| `/pricing` | Pricing / Claim Options | SSG | Yes | No |
| `/contact` | Contact | SSG + API POST | Yes | No |
| `/start` | Client onboarding form (post-claim) | SSG + API POST | **No** (noindex) | No (slug/token-linked) |
| `/p/<slug>` | PRIVATE proof/preview routes | Server-rendered shell reading proof record | **No** (noindex, nofollow) | Slug = the credential |
| `/claim/<slug>` | Claim/deposit page bound to a proof | Server-rendered, bound to proof record | **No** | Slug-bound |
| `/admin` (+ `/admin/*`) | Proof backend foundation | Server-rendered app | **No** | Yes (localhost-first; basic-auth hosted Wave 3) |

**Render-mode assumptions (labeled):**

- **A-P1:** `/p/<slug>` is server-rendered (not static-per-proof) because 30-day expiry, view/click event firing, and claimed/expired state changes require live proof-record reads. The embedded preview itself stays a static factory `dist/` on the previews host (plan §11 mechanics, D2). Decision point: confirm with D2 previews-host choice · Owner: Fritz · Next action: confirm at Wave-1 day 2 infrastructure check.
- **A-P2:** `/start` is noindex and reached only via the onboarding email link carrying the client token; it renders without login but loads/saves against the client record. Hard auth deferred (matches plan §16 "partial completion saved").

---

## 2. Public Pages

Each page declares purpose / persona / primary CTA / sections (per §7 rule 1). Sections compose from the shared component library (§13 below) — new page = new composition, not new components.

| Page | Purpose | Persona | Primary CTA | Section composition |
|---|---|---|---|---|
| `/` | Make the FAMtastic Way visible in 10 seconds; route visitors to their campaign path or `/preview` | All four campaign personas + cold traffic | Get a Preview → `/preview` | Hero scene (Proof-to-Profit; Tier-1 motion first, R3F scene lands later without changing the page contract) → FAMtastic definition block ("not a typo — the method") → animated workflow (build→deploy→track→grow) → 4 campaign path cards (Church Connect visually lead) → floating proof modules → dashboard mock → CTA band |
| `/the-famtastic-way` | Explain the method: definition + 6 steps (See/Prove/Claim/Build/Grow/Automate) | Considerers who clicked past the hero | Get a Preview | Definition hero → 6-step animated workflow → proof module strip → "results are the proof" credibility block → CTA band |
| `/services` | What We Build: websites, AI automation, mobile e-commerce | Buyers comparing capability | Get a Preview | Services hero → three service blocks (each ends in its own mini-CTA) → animated workflow → FAQ → CTA band |
| `/proof-gallery` | Before/after transformations as evidence | Skeptics needing proof | Get a Preview | Gallery hero → proof modules grid (anonymized/permissioned per §16 close-out rule) → dashboard mock ("Grow It" promise) → CTA band |
| `/pricing` | Pricing / claim options; show the full transformation path | Ready-to-buy + committee researchers | Claim path: Get a Preview (default) / Book a Call (systems tier) | Pricing hero → package ladder (Starter $199 deposit + monthly / Launch $499–$999 / Systems call-first) → church-flexibility note (pastor-paid, sponsor-funded, split schedules) → Cash App fallback visibility → FAQ → CTA band |
| `/contact` | Simple human contact | Anyone | Send message (form) | Contact hero → contact form → identities note (replies go to monitored inbox) → CTA band (secondary: Get a Preview) |

Wave sequencing (plan §31/§30): the Wave-1 claimable shell is the first version of `/` + `/pricing` + `/preview` — nothing is throwaway; it becomes the showroom's first page.

---

## 3. Campaign Pages

`/church-connect` · `/nonprofits` · `/local-business` · `/professional` — **one campaign template, four skins**, SSG'd from the campaign config record (plan §9). Adding campaign #5 is config + template, not new code.

**Fixed campaign page pattern (§9 — do not deviate):**

1. Persona hero (immersive module skinned per vertical)
2. Pain mirror section (campaign "core pains")
3. Proof feature walkthrough (animated — what the first proof must show, per the §9 table)
4. Offer ladder (campaign offer options)
5. Proof CTA (campaign-specific: Get a Preview, or Book a Call emphasis for committee verticals)
6. FAQ

**Per-campaign content keys (from plan §9 — the campaign config supplies these):** angle line, first-proof feature list, persona, core pains, money/value angle, offer options, conversion path.

**Church Connect extras (signature campaign):** top-level nav placement; additionally renders the full proof feature menu (giving, recurring giving, special offerings, sermon/media hub, events, visitor welcome, prayer requests, volunteer signup, ministry pages, mobile announcements, YouTube/livestream/Zoom embed, member access, members-only viewing, paid/donation event access, automated visitor follow-up, mobile-friendly church experience). Conversion path is proof → call → deposit, so the Book-a-Call CTA appears alongside Get a Preview, not below it.

**Tone gates:** church/nonprofit copy always passes the Brand/Voice Guardian respect screen (agents.md §1.2) before publish.

---

## 4. Private Preview Pages — `/p/<slug>`

A **sales page wrapped around a preview** (plan §11). Required blocks, in order — all eight, every proof:

1. **Personal header:** "Built for {Business Name}" + FAMtastic framing line
2. **Current gap/opportunity:** 2–4 observed facts from the presence scan — every claim traceable to scan data, no fabrication
3. **The new experience:** embedded/linked preview site (L1 teaser or L2 full build) — live and clickable, never screenshots
4. **Suggested flow:** visit → action → money/connection as a simple animated diagram
5. **Money/growth opportunity:** campaign-specific value framing — directional language only, no invented numbers ("could help increase giving," never "will increase giving 40%")
6. **Recommended package + full transformation path** (the upsell is showing everything)
7. **Claim button** → `/claim/<slug>`
8. **Talk-first option:** book-a-call link (required for church/nonprofit committee dynamics)

**Mechanics:**

- Slug: unguessable, **≥ 64 bits entropy** (plan §25). **Assumption A-P3:** 16-char base62 random (~95 bits) — satisfies both §11's "10+ char" and §25's entropy floor with margin.
- `noindex, nofollow` meta + `X-Robots-Tag` header; excluded from sitemap; `/p/` disallowed in `robots.txt` (§7, §11 below).
- View + click events fire to the backend (Preview Page object, plan §13: `view`, `claim_click`, `call_click`).
- **Expiry: 30 days default.** Claimed → converts to client workspace; expired → courteous revive form (no dead-end 404).
- Embedded preview hosted on the previews host (D2 default: `previews.famtasticdesigns.com` path-based on GoDaddy via cPanel UAPI).

---

## 5. Claim Pages — `/claim/<slug>`

Bound to the proof record (same slug binding as `/p/`). The page must satisfy the **§31 Claim Path QA conversion pieces** — all of these are launch-blocking (§36):

- **Trust/credibility block:** "Why FAMtastic / Why Fritz / Why this is real"
- **Clear claim terms** · **scope limits** · **revision limits**
- **What happens after deposit** (explicit next-steps timeline → `/start`)
- **What is / isn't included** in the recommended package
- **Book-a-call path** for churches/nonprofits/professionals (systems tier always routes call-first)
- **Payment fallback clarity:** Cash App rail ($FAMtasticFritz) visible alongside Stripe
- **Post-payment success confirmation** flow: success state → receipt (Resend) → `/start` onboarding link → admin status flips to `claimed` → Fritz notified

**Payment routing (plan §15):** Starter/Launch → Stripe Payment Link (Wave 1) / Stripe Checkout session bound to recommended package (Wave 2); Systems → Book a call → quote → invoice; Cash App fallback always visible. Church flexibility: pastor-personal payment with church-name invoicing supported as custom invoice — do not over-engineer.

**Hard gate:** no proof outreach sends until the full claim path is walked end-to-end and passes: `proof page → claim page → pay/book → confirmation → onboarding/start → admin status change → Fritz notification` (§31).

Decision point (booking tool): Cal.com free tier suggested (plan §32) · Owner: Fritz · Next action: pick + wire link Wave-1 day 2.

---

## 6. Forms

### 6.1 `/preview` — Business Review form (the inbound engine intake)

**Two-step, step 1 submittable alone** (plan §12):

- **Step 1 (10 seconds):** Business name · Category (4 campaigns + other) · Website/Facebook URL (optional) · Email. Submit works here; everything after is gravy.
- **Step 2 (optional enrichment):** What does growth look like? (calls / bookings / giving / donations / sales) · Biggest frustration (free text) · Phone (optional) · How soon? (now / 30 days / exploring).

**Pipeline:** POST → validate + honeypot + rate-limit (mbsh-reunion pattern) → `Lead(source=inbound_form)` → Haiku structured parse → score → queue L2 proof → Resend confirmation ("Your FAMtastic preview is being built — link within 24h") → Fritz notified for `score ≥ 80` or `timeline = now`.

### 6.2 `/contact` — simple

Name / email / message → `Contact` record + Resend notification to `hello@`. No scoring.

### 6.3 `/start` — onboarding intake (post-claim)

Brand assets upload (logo, photos — SVG sanitizer reused from Studio) · business facts · domain preference (have one / need one → GoDaddy reseller route) · campaign-specific content answers (services list, service area, giving links, sermon/stream URLs…). Partial completion saved; agent nudges at 48h/96h.

### 6.4 Form rules (all forms)

- **Spam defense: honeypot + time-trap + rate limit. No CAPTCHA** (friction not justified at this scale).
- Never ask what the scanner can find.
- Every field maps to a data-model field (plan §13) — no orphan questions.
- All submissions tracked with `source`, `utm_*`, referrer for §26 attribution.
- Upload limits follow the Studio precedent (5MB/file) — **assumption A-P4**, confirm against hosted-API limits at `/start` build time · Owner: build session · Next action: set PHP upload limits when the API lands.

---

## 7. Admin Routes — `/admin/*`

Auth-gated; **localhost-first** (matches current Studio posture), **basic-auth hosted in Wave 3** (plan §7/§13). Never indexed, never in nav/footer/sitemap; `robots.txt` disallowed.

**Minimum views (plan §13):**

| View | Route (assumption A-P5: flat sub-paths) | Core actions |
|---|---|---|
| Leads table | `/admin/leads` | rescore, reassign campaign, suppress, merge dupes |
| Proofs queue | `/admin/proofs` | **approve / reject**, regenerate, extend expiry, force-send |
| Payments | `/admin/payments` | reconcile, refund note, resend link, manual mark-paid |
| Email events | `/admin/email-events` | inspect (append-only log — no mutations) |
| Campaign compare | `/admin/campaigns` | weekly scorecard compare, pause |

**Launch-blocking requirement (§36):** the proofs queue / review surface must be **mobile-friendly enough for Fritz's daily 10-minute calibration review** (first 5 sends per campaign + flags + parks). Tables suffice — admin UI polish is explicitly non-blocking, mobile usability of the queue is not.

---

## 8. Navigation Rules

**Primary nav — exactly these 7 items, this order (plan §8):**

Home · The FAMtastic Way · Services · Church Connect · Get a Preview (CTA-styled) · Proof Gallery · Contact

- **Get a Preview** is visually a button, **always last, always visible** (sticky nav after scroll).
- **Church Connect** gets top-level placement (signature campaign). Other campaigns (Nonprofits, Local Business, Professional) live under a **"Who We Serve" dropdown** and/or the footer — nav stays ≤ 7.
- Mobile: full-screen overlay menu, same order, **CTA pinned at bottom**.
- Nav is one shared component rendered from config — no per-page nav variants.
- The Architect agent may not change nav (agents.md §1.3: nav changes are Fritz's).

**Assumption A-P6:** "Who We Serve" renders as a dropdown attached to the Services item on desktop and as a labeled group in the mobile overlay; it does not count as an 8th top-level item. Decision point: dropdown placement (Services-attached vs standalone) · Owner: Fritz · Next action: approve at first nav build review.

---

## 9. Footer Rules

**Four columns + legal strip (plan §8) — one shared component rendered from config (single source of truth):**

1. **Services** — Websites, AI Automation, Mobile E-commerce, Get a Preview
2. **Campaigns** — Church Connect, Nonprofits, Local Business, Professional Services
3. **Ecosystem** — FAMtastic Hosting (live cross-promote link **with UTM tagging** for cross-sell attribution), FAMtastic Thoughts (placeholder until that workstream ships), Support
4. **Company** — Contact, Pricing, Proof Gallery

**Legal strip:** Privacy · Terms · © FAMtastic Designs · **"FAMtastic is not a typo. It's the method."** micro-line · physical-mailing-address placeholder (CAN-SPAM; real address is plan §32 open item).

**Hard rules:** private (`/p/*`), claim (`/claim/*`), and admin routes **never** appear in nav or footer. Privacy + Terms pages must exist (launch-blocking "privacy/terms basics published") — **assumption A-P7:** they ship as static legal pages linked only from the footer legal strip (not in the §5 route map; they don't add a route class). Decision point: source the privacy/terms copy · Owner: Fritz · Next action: draft basics before Wave-1 day 2 claim-path QA.

---

## 10. SEO / Meta Rules

- **Title pattern:** `<Page> — FAMtastic Designs` (home may use a tagline form, e.g. `FAMtastic Designs — From Proof to Profit` — assumption A-P8, Fritz approves at homepage copy review).
- **Descriptions:** campaign pages get persona-keyword descriptions; all others get a purpose-led description.
- **JSON-LD `ProfessionalService`** on `/` and `/contact`.
- **OG images:** generated per campaign (the factory can produce these); every public page declares one.
- **Sitemap:** includes public marketing + campaign + form pages only; **excludes `/p/*`, `/claim/*`, `/admin/*`** (and `/start`, per A-P2).
- **`robots.txt`:** disallows `/p/`, `/claim/`, `/admin/` (and `/start`).
- Canonical URLs on every indexed page; GA4 + Search Console installed at launch (plan §22); proof views/claims are first-party DB events, not just GA (§26).

---

## 11. Route Protection / noindex Rules

| Route class | Protection |
|---|---|
| `/p/<slug>` | `noindex, nofollow` meta + `X-Robots-Tag`; slug ≥ 64 bits entropy is the access credential; excluded from sitemap + robots-allowed paths; 30-day default expiry → revive form; view/click events logged |
| `/claim/<slug>` | Same noindex/sitemap/robots exclusions; renders only against a live bound proof record; expired/unknown slug → courteous expired state, never a raw 404 |
| `/start` | noindex; reached via tokened onboarding email link (A-P2) |
| `/admin/*` | Auth-gated: localhost/tunnel first, basic-auth hosted Wave 3; never linked anywhere public |
| All public POST endpoints | rate-limit + validation (plan §25 pattern); Stripe webhooks signature-verified; uploads sanitized |

No page or component may ever link from a public page into `/p/`, `/claim/`, or `/admin/` — link-leakage is a QA failure.

---

## 12. Page Creation Rules

From plan §7 — applies to **all** public pages, enforced on every PageSpec:

1. Every page declares: **purpose, primary CTA, target persona, metadata block, section list.**
2. Sections compose from the shared component library — **new page = new composition, not new components** (reuse-before-generate).
3. **Every page ends in a CTA band** routing to `/preview` (default) or the campaign-specific claim path.
4. **No page ships without mobile + reduced-motion verification.**

Additions from the architecture: no new route classes without Fritz; pages are produced from a `PageSpec` (§16 below) authored by the UX/Site Architect agent; new page *patterns* (not instances) trigger human review (agents.md §1.3).

---

## 13. Section / Component Rules

**Shared component library (plan §7 — the only building blocks):**

| Component | Used on | Notes |
|---|---|---|
| Hero scene | `/`, campaign pages (skinned), section heroes | Tier-1 motion first; 3D loads progressively behind styled static first paint; `prefers-reduced-motion` swaps scenes for composed stills |
| Animated workflow | `/`, `/the-famtastic-way`, `/services` | build → deploy → track → grow diagrams; reusable section component |
| Proof modules | `/`, `/proof-gallery`, `/the-famtastic-way` | floating commercial-style transformation cards — "engine to build more scenes" |
| Dashboard mock | `/`, `/proof-gallery`, `/p/<slug>` flow block | animated giving/bookings/leads/sales visuals; later powers real client dashboards |
| CTA band | **every page, last section** | routes to `/preview` default or campaign claim path |
| FAQ | `/services`, `/pricing`, campaign pages | per-page question sets |

**Rules:** components carry their own reduced-motion behavior (defined before the fancy version — agents.md §1.4 discipline); no inline styles; every scene ends at a CTA; perf guardrails are plan-fixed (LCP < 2.5s mid-range mobile, Lighthouse ≥ 80 mobile) and not negotiable by any agent. A genuinely missing component goes back to the Architect as a library addition proposal — pages never ship one-off bespoke sections.

---

## 14. CTA Hierarchy

1. **Primary (sitewide default):** **Get a Preview → `/preview`** — the nav button, the default CTA band target, the home hero CTA.
2. **Campaign-primary:** campaign pages may route their CTA band to their claim-path emphasis — Church Connect/Nonprofits/Professional lead with **Book a Call** beside Get a Preview (committee/consultative dynamics); Local Business stays preview-first (claim-and-pay path).
3. **Proof-page CTAs:** **Claim button → `/claim/<slug>`** is primary; book-a-call is the always-present secondary.
4. **Claim-page CTAs:** **Pay deposit** (Stripe) primary; **Book a Call** co-primary for systems tier; Cash App rail visible as fallback, never hidden.
5. **Tertiary:** Contact. Never compete with the primary — one primary CTA per viewport-section.

Rule: a page has exactly one primary CTA (declared in its PageSpec); everything else styles as secondary.

---

## 15. Content Hierarchy

Ordering principle on every page (the FAMtastic Way journey, plan §4): **See It → Prove It → Claim It** — show the transformation first, evidence second, ask third.

1. **Hook/transformation** (hero — what's possible)
2. **The method/definition** ("FAMtastic is not a typo — it's the method"; define it explicitly, prove it through the work)
3. **Evidence** (proof modules, walkthroughs, dashboards — results are the proof)
4. **Offer/path** (packages, recommended + full transformation path — the upsell is showing everything)
5. **Ask** (CTA band)

**Voice rules (plan §4):** bold/creative first, tech-genius second, professional third, street-smart throughout; create the need around "see"; no jargon walls; cheap never reads as poor quality; money/growth framing is directional, never invented numbers; church/nonprofit copy passes the respect screen.

---

## 16. Required Page Data Fields

Every page is produced from a `PageSpec` (extends agents.md §1.3 output schema — the metadata block is expanded here so it's buildable):

```text
PageSpec = {
  route,                       // from the §1 route map only
  route_class,                 // public | campaign | private_proof | claim | form | admin
  purpose,                     // one sentence
  persona,                     // target persona(s)
  primary_cta,                 // { label, target } — exactly one
  sections: [{
    component,                 // from the §13 library only
    content_brief,             // what this instance says/shows
    reduced_motion_behavior    // still/fallback for this instance
  }],
  metadata: {
    title,                     // "<Page> — FAMtastic Designs"
    description,               // persona-keyworded on campaign pages
    og_image,                  // per-campaign generated where applicable
    index: true|false,         // per §1 route map
    canonical,
    jsonld                     // ProfessionalService on / and /contact; else null
  },
  reduced_motion_plan,         // page-level summary of fallbacks
  campaign_key,                // campaign + proof routes; null elsewhere
  campaign_config_version,     // campaign pages: which config skinned this build
  forms: [{ form_id, fields[], spam_defense, post_target }],   // form pages only
  events_tracked               // e.g. view, claim_click, call_click on /p/*
}
```

Private proof pages additionally bind to the `Proof`/`Preview Page` records (plan §13): `proof_id`, `slug`, `blocks{gaps[], flow, value, package}`, `expires_at`.

---

## 17. Page Acceptance Checklist

Run per page before it ships. Aligned with §36 launch-blocking items — a public page failing any unchecked-by-design item does not ship.

**Every page:**

- [ ] PageSpec complete: purpose, persona, primary CTA, metadata block, section list declared
- [ ] All sections compose from the §13 component library (no bespoke one-offs)
- [ ] Page ends in a CTA band (correct target per §14)
- [ ] Exactly one primary CTA
- [ ] Mobile verification passed (real device or emulated mid-range)
- [ ] **Reduced-motion pass:** `prefers-reduced-motion` renders composed stills, page fully usable
- [ ] Metadata: title pattern, description, OG image, canonical correct
- [ ] No links to `/p/`, `/claim/`, or `/admin/` from public content

**Public marketing + campaign pages (additionally):**

- [ ] **Lighthouse performance ≥ 80 mobile** (launch-blocking, §36; LCP < 2.5s mid-range mobile)
- [ ] Indexed: in sitemap, no noindex, JSON-LD present where required (`/`, `/contact`)
- [ ] Campaign pages: built from the campaign config, all six pattern sections present, church/nonprofit copy passed the respect screen

**Form pages (additionally):**

- [ ] Honeypot + time-trap + rate limit live; no CAPTCHA
- [ ] `/preview` step 1 submits alone; step 2 optional
- [ ] Every field maps to a data-model field; `source`/`utm_*`/referrer captured
- [ ] Confirmation email fires (where specified)

**Private proof pages (`/p/<slug>`) (additionally):**

- [ ] All 8 required blocks present and in order (§4)
- [ ] noindex/nofollow + sitemap/robots exclusion verified
- [ ] Slug ≥ 64 bits entropy; expiry set (30-day default); expired state shows revive form
- [ ] View/click events verified firing to backend
- [ ] Embedded preview is live and clickable (not screenshots); fast and mobile-correct (launch-blocking)

**Claim pages (`/claim/<slug>`) (additionally — §31 Claim Path QA):**

- [ ] Trust/credibility block ("Why FAMtastic / Why Fritz / Why this is real") present
- [ ] Claim terms, scope limits, revision limits visible
- [ ] What happens after deposit + what is/isn't included visible
- [ ] Book-a-call path live for churches/nonprofits/professionals
- [ ] Cash App fallback rail visible
- [ ] Post-payment success confirmation flow works
- [ ] **Full claim path walked end-to-end and passing:** proof page → claim page → pay/book → confirmation → `/start` → admin status change → Fritz notification

**Admin (additionally):**

- [ ] Auth gate verified (localhost-first; basic-auth when hosted)
- [ ] All five minimum views reachable; proofs queue approve/reject works
- [ ] **Review queue usable on mobile** (Fritz's daily calibration pass — launch-blocking)
- [ ] (Lighthouse on admin/preview routes: explicitly non-blocking, §36)

---

## Open Decision Points (consolidated)

| ID | Item | Default | Owner | Next action |
|---|---|---|---|---|
| D1 | famtasticdesigns.com domain/DNS state | own/acquire via reseller; 301 fallback | Fritz | Confirm before Wave-1 day 2 |
| D2 / A-P1 | Previews host + `/p/` render mode | GoDaddy path-based + server-rendered shell | Fritz | Confirm at day-2 infra check |
| A-P6 | "Who We Serve" dropdown placement | attached near Services, not an 8th item | Fritz | Approve at first nav review |
| A-P7 | Privacy/Terms copy | static legal pages, footer-only links | Fritz | Draft before day-2 claim-path QA |
| A-P8 | Homepage title tagline form | "FAMtastic Designs — From Proof to Profit" | Fritz | Approve at homepage copy review |
| — | Booking tool for call-first paths | Cal.com free tier | Fritz | Pick + wire Wave-1 day 2 |
| — | Physical mailing address for footer | placeholder until provided | Fritz | Supply before first outreach send |
