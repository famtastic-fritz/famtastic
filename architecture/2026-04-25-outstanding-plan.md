# Outstanding Plan — Iterative Roadmap Forward
**Date captured:** 2026-04-25
**Status:** working roadmap, not a plan-of-record
**Supersedes:** the implicit plan that lived only in chat sessions

---

## Purpose

This doc is the iterative roadmap forward, in priority order. It is
the canonical answer to "what's next" between sessions. It is NOT a
spec — each item still requires its own scoping pass before
implementation. It IS the place where deferred work, parking-lot
decisions, and known-pending findings live so they don't fall out of
context between sessions.

Update cadence: append new items at session-end; promote items
across tiers as scope clarifies; mark items SHIPPED with the commit
hash when complete.

---

## IMMEDIATE (next session)

### 1. JJ Barbershop B&A site — build tonight, refine tomorrow

The R-NEW audit was for a JJ B&A build. The four R-NEW gaps that
audit surfaced are now closed. The site itself has not been
re-built against the closed gates. The next session should:

- Create the JJ B&A site via Shay Desk (the corrected baseline path)
- Capture the build output as the first FAMtastic-default
  Tier-B reference build post-closure
- Compare against the original audit findings — confirm the
  palette, hero skeleton, nav skeleton, and FAMtastic logo mode
  all fire correctly on the new build

### 2. Fix broken header links bug from baseline test

Logged in `.wolf/buglog.json` as
`bug-broken-header-links-2026-04-25`. The post-baseline-closure
church build successfully created the site but the rendered nav
links don't navigate correctly. Investigation steps in the buglog
entry. First inspection target:
`sites/site-church-atlanta-ga/dist/index.html`,
`dist/_template.html`, and the nav-emission path in
`writeTemplateArtifacts` + parallel-page builds.

### 3. Fix auto-build-trigger UX (Shay should confirm before firing)

Logged as `bug-shay-auto-build-no-confirmation-2026-04-25`.
`handleShayBuildRequest` runs `auth → extract → createSite →
synthesize → triggerSiteBuild` synchronously with no
human-in-the-loop checkpoint between extraction and dispatch. Three
candidate fixes in the buglog entry. Recommended approach:
introduce a `confirm_build_request` Shay tier-0 intent that returns
the extracted brief + tag + design_brief and waits for an explicit
follow-up before dispatching the build. Reuses existing tier-0
machinery; minimal new surface area.

---

## NEAR-TERM (this week)

### 4. Edge case test suite design — 5 categories, staged

Five categories of edge cases need coverage, layered over the
current 161-test suite. Both Shay-Shay-layer and API-layer:

- **Identity edge cases** — punctuation, abbreviations, foreign
  characters, emoji, mixed case, very long names, names that are
  also common words ("Church" as a business name vs church as
  a category)
- **Tag collision edge cases** — same business with different
  styling, different business with similar slug, near-collisions
  across `normalizeBizName`'s strip list
- **Intent ambiguity edge cases** — prompts that contain build
  keywords AND edit keywords, prompts that name multiple
  businesses, prompts that mention deployment in passing
- **Brief extraction edge cases** — prompts with no business
  details, prompts with very specific details, prompts in
  question form, prompts with explicit user metadata
- **Build-trigger edge cases** — no WS clients, multiple WS
  clients, WS client disconnects mid-dispatch, build dispatch
  fails partway through

Implementation strategy: stage the 5 categories across 5 test
sessions. Each category lands as a separate test file with its
own file-level documentation explaining what edge it covers and
why. Run the full suite (existing 161 + new edge cases) in CI.

### 5. Wizard-of-Oz orchestrated FAMtastic build session

Run a real site build with manual orchestration through Shay
prompts — every decision narrated, every prompt captured. Goal:
produce an **orchestration playbook** that becomes training
data for Shay-Shay's actual decision-making layer (V2 Phase 1
interpreter). The pattern is documented in SITE-LEARNINGS.md
(Baseline Closure Lessons #5). Choice of site for this session
should be a real client need, not a synthetic test — the
discipline of real stakes is part of what makes the captured
data useful.

### 6. Reunion site — mbsh96reunion.com (July 12 deadline)

Existing reunion-class site needs the closure-corrected build
pipeline applied. July 12 is a hard external deadline (event
date). Scope:

- Verify the reunion site spec is complete (PayPal handle,
  monthly_rate if applicable, event details, RSVP)
- Run a build through the closure-corrected pipeline
- Verify revenue-card + DNS-card flows work end-to-end on this
  site
- Confirm the `verifyRevenueAndState()` reunion check passes

This site is the first to exercise the post-baseline-closure
revenue path. Any breakage here surfaces problems before they
affect more sites.

---

## MEDIUM-TERM (next 2-4 weeks)

### 7. V2 Phase 1: Interpreter in isolation

The V2 BuildIntent architecture has 4 phases. Phase 1 builds the
interpreter as a standalone module (no server.js dependency,
no port binding) that can be tested in isolation against
recorded prompts. Spec in V2 doc (separate from this plan).

### 8. V2 Phase 2: extractBriefFromMessage wiring

Wire the V2 interpreter behind `extractBriefFromMessage` and the
new-site classifier so the existing call sites get V2 capability
without changing their contract. extractBriefFromMessage is
already returning the new status-based shape from the baseline
closure — V2 plugs in cleanly.

### 9. V2 Phase 3: handlePlanning replacement

Replace the brief-editor-only `handlePlanning` with a planning
layer that can also create new sites when needed. This closes
the architectural gap that the baseline test exposed: Studio
Chat's `handlePlanning` couldn't create new sites, only edit the
active site's brief.

### 10. V2 Phase 4: Shay-Shay routing unification

Unify Shay Desk's tier-0/1/2/3 routing with Studio Chat's
classifier so the same prompt classified the same way regardless
of entry point. The current divergence (Shay Desk uses
`.{0,30}` flexibility, Studio Chat used to use exact word order)
is exactly the divergence that the baseline test exposed at the
keyword level — Phase 4 forecloses the entire class of bug.

### 11. Brain adapter additions: DeepSeek V4-Flash + Kimi K2.6

Add two muscle-tier brains alongside the Claude orchestration
brain:

- **DeepSeek V4-Flash** — fast, cheap, good for parallelizable
  build work where Claude orchestrates and DeepSeek executes
- **Kimi K2.6** — long-context muscle for situations where
  the relevant context exceeds Claude's working window

Adapter contract: same `BrainInterface` pattern as Gemini and
Codex adapters. Tool calling stays Claude-only; the muscle tier
is for non-tool tasks.

### 12. Verify Pinecone and Perplexity firing on every build

The intelligence loop nominally calls Pinecone (research cache)
and Perplexity (live research) on every build, but in-the-wild
verification has been spotty. Action: instrument `buildPromptContext()`
to log a structured event every time it queries Pinecone or
Perplexity, with the result count and latency, and wire those
events into the existing telemetry layer. Then run 5 builds and
confirm both sources fired on all 5.

### 13. FAMtastic-applied research query composer

Current research is generic — "what works for barber shops" — but
the FAMtastic vision is "what works for FAMtastic-style barber
shops." Build a query composer that translates a vertical query
into a FAMtastic-applied query before sending it to research
sources. The composer becomes a small classifier itself:
"vertical: barber + tier: B + character: warm-confident" → query
"successful barber shop sites with bold, confident, warm
visual identity that avoid generic industry palette."

### 14. Conversation-based learning capture mechanism

Every Shay-Shay conversation produces decisions. Today those
decisions are lost between sessions (memory layer not yet
operational). Build a capture mechanism: a small async pipeline
that watches Shay-Shay conversations, extracts the orchestration
decisions (what got asked, what got accepted, what got
rejected), and writes them to a learning corpus that V2 Phase 1
can consume. This is the substrate that makes Shay-Shay improve
over time without manual rule additions.

### 15. Client review/preview/payment flow verification

Blocking for the reunion site. The flow is partially built
(revenue card, DNS card, approve button, PayPal link) but has
not been exercised end-to-end with a real client. Verification
steps:

- Build a preview URL that's safe to share with a non-technical
  user (no Studio chrome leaking into the preview)
- Verify "Mark as Client Approved" flips state correctly and
  generates the right PayPal link
- Verify the PayPal link actually receives a payment in PayPal's
  test environment
- Verify domain provisioning fires after payment
- Verify auto-deploy fires after domain provisioning

Each of these has known partial implementation; the verification
session is what proves they compose into a working flow.

---

## LONGER-TERM (parking lot, scoped not started)

These are real intentions, not aspirational fluff. Each entry
has had at least one design conversation; each is currently
deferred for capacity reasons, not direction reasons.

- **Shay relational identity programming (numerology-based).**
  See vision capture "On Shay-Shay (The Naming)." Programs
  Shay-Shay's identity with awareness of Fritz's numerology
  profile and the numerology of clients she interacts with.
- **Meta-research category in intelligence loop.** First queries
  seeded in the vision capture doc. Slower interval than
  vertical research; feeds into the system, not into specific
  builds.
- **Context architecture deep dive.** Parking lot entry in the
  vision capture doc. Becomes blocking after V2 ships and
  Shay-Shay's actual capacity ceiling becomes measurable.
- **Shay-Shay-Lite to Shay-Desk routing layer.** Currently a
  user must manually switch between Shay Lite and Shay Desk
  surfaces. The right pattern is for Lite to detect when an
  interaction is exceeding its surface (long output, structured
  data, multi-step orchestration) and offer to escalate to Desk
  with state preserved.
- **Log monitoring and conversational reporting.** Today
  studio.log is a tail-and-grep tool. The right pattern is for
  Shay-Shay to consume the log periodically and produce
  conversational summaries ("here's what's been happening since
  last session"). Connects to the conversation-based learning
  capture mechanism.
- **Component Studio extraction.** Per the Adobe Creative Cloud
  pattern, Component Studio is a separate full-identity studio
  with shared Platform services. Extraction means moving the
  current `lib/component-library` plumbing into its own studio
  with its own UI surface. Low priority until Site Studio is
  rock solid.
- **Media Studio extraction.** Same pattern as Component Studio.
  Currently Media Studio is a tab inside Site Studio. Extracting
  it means it becomes a sibling, with explicit message
  contracts to Site Studio.
- **Think Tank as separate studio.** Idea capture and refinement
  pipeline, currently a CLI subcommand (`fam-hub idea *`).
  Becomes a full studio when it grows enough surface to need one.
- **Promotion layer (the missing piece in product lifecycle).**
  Sites today get built and deployed but promotion (SEO, ads,
  social, content marketing) is a gap. Long-term this becomes
  its own coherent layer, possibly its own studio.
- **Schema audit follow-up.** colors/pages required-field
  mismatch tracked in
  `architecture/2026-04-24-schema-audit-followup.md`. Pre-existing
  issue, deferred to its own session.
- **UI rework: Shay Desk chat scroll, max-width, redundant
  buttons.** Multiple small UI issues in Shay Desk that don't
  affect correctness but degrade usability. Batch into a
  dedicated UI polish session rather than fixing piecemeal.

---

## PRINCIPLES TO HOLD

These principles distilled from the April 24-25 arc. They apply to
every future workstream until explicitly revised.

1. **Baseline always works end-to-end before adding features.**
   The April 24 R-NEW audit failed because feature work had been
   shipped on top of an unfinished base. The April 25 baseline
   closure was the correction. Future workstreams: confirm the
   baseline still passes before scoping new features.

2. **Adversarial review before structural changes.** The 9-round
   review of the closure plan caught real bugs in every round. No
   structural change should ship without at least one independent
   reviewer's eyes (Codex, Gemini, or fresh Claude session).

3. **Caller-owned vs helper-owned contracts documented in JSDoc.**
   Any helper that mutates shared state across module boundaries
   needs ownership invariants explicit in JSDoc. The
   `createSite()` JSDoc is the canonical example.

4. **Identity checks before destructive operations.** Anywhere a
   call site could "update" something it doesn't actually own,
   run an identity check first. The `checkSameBusinessIdentity`
   helper is the canonical pattern.

5. **Capture corpus from every session.** Wizard-of-Oz orchestration
   decisions are training data for Shay-Shay. Manual sessions are
   not waste — they are the dataset that V2 Phase 1's interpreter
   will consume.

6. **Tier B is FAMtastic default; Tier A is opt-in.** Confirmed in
   GAP-4 closure. `spec.tier` defaults to `'famtastic'`. `'clean'`
   is explicit, derived from clean-keyword detection or client
   request. Any future build path that defaults to clean is a
   regression.

7. **Documentation lives in the vision capture doc, not cerebrum.**
   `.wolf/cerebrum.md` is auto-generated and not the right home for
   durable architecture decisions. Architectural decisions go in
   `docs/FAMTASTIC-VISION-CAPTURE-2026-04-24.md` under "Architectural
   Decision Log." Cerebrum stays for runtime do-not-repeat rules.

---

## How to Use This Doc

- At session start: read the IMMEDIATE list. That is the queue
  for this session unless a specific task overrides.
- At session end: add new items to the appropriate tier; promote
  items between tiers as scope clarifies; mark shipped items with
  commit hash and remove if no longer relevant.
- When proposing a new architectural change: check it against
  PRINCIPLES TO HOLD before scoping; if any principle is in
  tension, surface that explicitly in the proposal.
- When a finding is logged in `.wolf/buglog.json`: cross-reference
  it from this doc under IMMEDIATE so the buglog entry is not the
  only place the finding is visible.
