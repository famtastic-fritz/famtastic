# FAMtastic Operating Plan V3-final — 2026-04-27

**Status:** Ship-ready (Codex MINOR-ONLY, wording patches applied)
**Type:** Operating plan with hard exit gates
**Supersedes:** V1 unified plan (encyclopedia), V2/V3 operating plans
**Reference:** V1 stays as encyclopedia; V3-final is what gets run

---

## State Honesty

### Implemented and Tested
- All four R-NEW gaps closed (Saturday)
- Baseline failure structurally closed; church prompt creates real site end-to-end
- Shared `createSite()` helper as canonical site-creation path
- Two-tier design (`tier` canonical, `famtastic_mode` derived)
- 161/161 unit tests passing
- Deploy failures surface specific reasons
- Imagen 4.0 + Veo 2.0 working ($25 plan)
- Codex adversarial review pattern

### Designed but Unproven in Production
- Gap log + suggestion log infrastructure (writes work; consumers don't)
- Capability manifest concept
- Research source registry (firing unclear)
- Brain adapter pattern (Claude/Gemini/Codex)

### Aspirational
- Adobe Pattern as system architecture
- Generator → Reflector → Curator
- Mem0/Graphiti/Context7 integration
- Component Studio, Media Studio, Think Tank as separate studios

### Known Broken (P0 Targets)
- Header template rigidity + broken header links
- Auto-build fires without confirmation
- JJ B&A apparent template sameness
- CSS variable injection incomplete
- Preview server "Not found" on site switch
- Shay-Shay dynamic column never clears
- Schema drift (`colors`, `pages` required but not written)
- Studio EADDRINUSE crash loop
- Restyle path is dead code

---

## Phases

### P0 — Baseline Reliability
**Goal:** A clean site can be created, previewed, edited, deployed, and smoke-tested through the GUI without intervention.

**Sessions:** 4 (P0.0 through P0.3)

#### Session P0.0 — Smoke Suite Definition
**No product code changes.** Documentation only.

Output: `architecture/2026-04-27-smoke-suite.md` containing:
- Exact GUI click path for each test
- Expected artifacts at each step (file paths, file contents)
- Pass/fail evidence template (screenshots, file diffs, log lines)
- Reproducibility instructions

**Smoke steps:**
1. Open Studio at localhost:3334
2. Click New Site, paste defined test prompt
3. Verify site directory created at `sites/<tag>/`
4. Verify `spec.json` matches schema
5. Click Preview, verify site loads at localhost:3333
6. Make content edit through chat ("change hero headline to X")
7. Verify edit applies without rebuild
8. Click Deploy. **Pass condition:** if deploy provider available → Netlify URL returned. If deploy provider unavailable → specific failure reason surfaced (cli_missing, credentials_missing, etc.). For P0 exit: error-surfacing path is sufficient. Actual live deploy verification required before P2.
9. **Conditional on step 8 success only:** Load deployed URL, verify content matches local. Skipped if deploy provider unavailable.

#### Session P0.1 — Diagnostic Pass
- DOM/CSS/build artifact inspection of JJ B&A "hidden layer"
- Header template rigidity root cause
- Header links resolution
- CSS variable injection failure point
- Preview server `DIST_DIR(tag)` resolution
- Schema drift mapping
- EADDRINUSE crash loop reproduction
- Restyle path dead-code trace

**Output:** Diagnostic doc with line numbers and proposed fixes. NOT implementation.

#### Session P0.2 — Site Output Fixes
- Header template fix (scope from P0.1)
- Header links resolution
- CSS variable `:root {}` injection (documented exception to "all CSS in component files")
- Schema drift reconciliation

#### Session P0.3 — Studio UX Fixes
- Auto-build trigger UX (Shay confirms before firing)
- Preview server site-switch resolution
- Shay-Shay dynamic column state machine
- Preview toggle reliability
- EADDRINUSE crash loop fix
- Restyle path: fix or mark broken in capability manifest

**P0 Exit Gates:**
1. Smoke suite from P0.0 passes end-to-end on a fresh site (deploy provider unavailable acceptable; live deploy verified before P2)
2. JJ B&A site rebuilt cleanly with header links working and visual distinctiveness from other sites confirmed by Fritz inspection
3. EADDRINUSE: 50 consecutive cycles via wrapper script. **Wrapper behavior:** start Studio → wait for healthy port (HTTP 200 on /api/health or equivalent within 30s) → stop cleanly (SIGTERM, wait for exit) → verify port released (TCP probe returns connection refused) → repeat. Failure = log cycle number, exit code, stderr; abort gate.
4. Restyle path either works or returns clear "not implemented" message (no silent no-op)
5. Schema validates against runtime-written specs (script: load every site spec.json, run schema validator, all pass)

**Rollback:** Failed gate = stop, tag failed state, rescope. Revert only the session's own changes if safe on clean worktree. Never auto-revert if uncommitted work exists.

**Non-goals:** No edge case suite, no data loop closure, no MCP servers, no brain routing, no memory architecture.

---

### P1 — Site Quality and Diversity
**Goal:** Each site looks like its own brand. Verticals 1, 2, 3 visibly distinct.

**Sessions:** 2

**Sequencing flexibility:** P1 may be deferred if July 12 reunion deadline pressure exceeds P1's value. Decision rule: if 14 days before July 12 and P1 incomplete, skip to P2 with current state and complete P1 after reunion launch.

#### Session P1.1 — Edge Case Smoke
- Tier signaling, brief malformation, build path stress
- Round 1: 5–8 tests per category, ~20 total
- Through Shay-Shay's natural language interface where applicable
- Concurrent/spec-corruption deferred to P3

#### Session P1.2 — Visual Distinctiveness
- Archetype variation in build prompts
- Per-site style fingerprint (lightweight Global Style Object — design tokens, not IP-Adapter)
- Diversity check: rebuild JJ B&A, church, accounting firm side by side; visual inspection confirms distinct brands

**P1 Exit Gates:**
1. Edge case smoke 80%+ pass; failures categorized and logged
2. Three sites in three verticals visually distinct on Fritz inspection
3. Per-site style tokens persisted in spec.json
4. Build prompt incorporates style tokens consistently

**Non-goals:** No IP-Adapter, no LoRA, no automated diversity scoring, no FAMtastic Score automation.

---

### P2 — Revenue Pilot
**Goal:** Reunion site deployed and accepting registration revenue by July 12. Three additional verticals built end-to-end with full revenue ops.

**Sessions:** 5–7 (manual/lightweight only — no Stripe automation, no custom backend, no advanced approval flows)

#### Session P2.0 — Reunion Ops Checklist
Operational checklist before any code:
- Registration source of truth (spreadsheet, DB, form provider)
- Payment reconciliation flow (how Fritz matches payment to registrant)
- Confirmation email (template, sender, automated/manual)
- Privacy policy minimum text
- Refund/cancellation policy
- Spam protection (honeypot minimum; Turnstile if budget)
- Form submission backup (auto-forward to Fritz email AND store in provider)
- DNS/domain ownership confirmed (mbsh96reunion.com)
- Deploy fallback path (Cloudflare Pages or static manual upload, documented)
- Deploy rollback path (previous version preserved, command documented)

Output: `architecture/2026-04-27-reunion-ops-checklist.md`. All resolved before P2.1.

**Single source-of-truth table per registrant:**
`name, email, registration_status, payment_status, amount, payment_reference, confirmation_sent, notes`

#### Session P2.1 — Client Workflow Foundation
- Client preview link (Netlify deploy preview)
- Payment link (PayPal.me minimum)
- Approval state transition (deployed → approved)
- DNS/domain card with CNAME instructions
- Manual fallback documented per step

#### Session P2.2 — Reunion Site Build
- mbsh96reunion.com (July 12)
- Brief through current Shay-Shay path (no waiting for Phase 5)
- Most reliable existing path; manual fallback allowed
- Production pilot, not architecture validation

#### Session P2.3 — Lead Capture
- Form-to-email (Formspree or similar)
- Form submission backup auto-forward (per P2.0)
- Analytics (Plausible preferred, GA4 acceptable)
- Per-site lead inbox

#### Session P2.4 — Promotion Kit Generator
- Per deployed site: 5 social captions, 3-email welcome, Organization+FAQ schema, distribution checklist
- Single Claude call per site using existing spec.json
- 4–7 hours work

#### Session P2.5 — Three Vertical Pilots
- Three verticals from 60-site factory plan with clearest revenue path
- Each: deployable site + promotion kit + payment-ready preview
- Each follows P2.0 ops checklist

#### Session P2.6 — Revenue Path Verification
- End-to-end test: prospect → form → email captured + backed up → payment link → payment → reconciliation logged → confirmation email → site approved
- Manual where automation isn't ready; document each manual step
- At least one paid-test transaction (could be Fritz testing his own card with refund)

**P2 Exit Gates:**
1. Reunion site live on mbsh96reunion.com by July 12 with working registration flow including payment reconciliation, confirmation email, privacy/refund text
2. Three pilot verticals deployed with client preview + payment + analytics + promotion kit + ops checklist
3. At least one real or test payment transaction completed AND reconciled to a registrant via documented flow
4. Revenue path documented end-to-end with each manual step identified
5. Deploy fallback tested at least once **on a staging or disposable site, not the reunion production deploy** (intentional simulated Netlify failure → fallback succeeds)
6. Single source-of-truth registrant table populated and queryable

**Non-goals:** No Klaviyo, no Twilio/SMS, no call tracking, no automated review/approval workflow.

---

### P3 — Learning Loop
**Goal:** The intelligence the system collects starts feeding back into builds.

**Sessions:** 3

#### Session P3.1 — Wizard-of-Oz Orchestration #1
- Third vertical (NOT JJ B&A or FAMtastic.com)
- Narrate every orchestration decision
- Capture in structured doc: orchestration findings, brief findings, capability gaps, tooling findings, patterns
- Output: orchestration playbook v1

#### Session P3.2 — Data Loop Closure
- `getSuggestionPatterns()` → build prompt generator
- Gap auto-promotion (3+ in 30 days → backlog)
- `brand.json` injection into system prompt
- Capability manifest diff-to-action handler
- Forgetting policy on `gaps.jsonl` and `suggestions.jsonl` (forward-only)

#### Session P3.3 — Curator Step + Verifier Rewards
- Automated playbook updates (Generator → Reflector → Curator)
- Wire Lighthouse CI, axe-core, integration tests to suggestion outcome scoring
- Diversity / OOD monitoring on suggestion patterns

**P3 Exit Gates (observable proxies, no FAM score):**
1. Orchestration playbook v1 captures decisions from one Wizard-of-Oz session
2. New site build in vertical with prior history shows measurable improvement on at least two of: fewer Fritz manual corrections per build (counted), fewer failed automated checks (Lighthouse/axe/Linkinator pass rate), Fritz-rated quality 1–10 (recorded before/after)
3. Suggestion patterns visibly inform a build prompt (Fritz inspects assembled prompt, sees them)
4. Forgetting policy active; old entries decay or expire (verified by reading log timestamps before/after)
5. Codex review session detects fewer **issues per comparable review checklist** (normalized by review scope, not absolute count)

**Non-goals:** No Mem0/Graphiti, no real Pinecone embeddings, no FAMtastic Score automation, no meta-research.

---

### P4 — Architecture Expansion
**Triggered, not scheduled.**

| Item | Trigger |
|---|---|
| MCP server extraction | Job queue scaling pain, multi-process need, external client calling Studio |
| Mem0 integration | Shay-Shay forgetting context across sessions = recurring complaint |
| Context7 MCP | Stale docs causing build failures |
| Graphiti three-layer memory | Cross-session learning patterns can't be represented in current storage |
| DeepSeek V4-Flash / Kimi K2.6 | Cost-per-build measurement shows Claude is bottleneck AND quality gates pass with cheaper model A/B |
| Real Pinecone embeddings | Zero-embedding placeholder demonstrably breaks research effectiveness |
| Media Studio (IP-Adapter, LoRAs, full Global Style Object) | Sites in factory test fail diversity gates due to image quality, not template structure |
| Component Studio extraction | Components reused across 5+ sites with consistent edits |
| Meta-research category | P3 research layer demonstrates per-build research changes outcomes |

**P4 Exit Gates:** Each item has its own gate when triggered. No blanket P4 exit.

**Non-goals:** Component Studio, Think Tank, Promotion SMS/Twilio, Numerology personalization, Shay relational identity programming.

---

## Cross-Phase Standing Rules

1. Every session commits a rollback tag before starting
2. No new features in P0 fix sessions
3. CSS exception for `:root {}` injection documented in code comment
4. Adversarial review on every plan with structural changes
5. Each phase exit gate is binary: pass or stop-and-rescope (NOT auto-revert; safe rollback only on clean worktree)
6. Weekly check: are we still moving toward 1,000 sites? If not, scope cut.
7. P1 may be deferred if July 12 deadline pressure exceeds P1 value; P2 may start immediately after P0
8. P2 stays manual/lightweight. No Stripe automation, custom backend, or advanced approval workflows sneak in.

---

## Next Concrete Action

Run P0.0 (smoke suite definition session). No product code changes; documentation only. After commit, P0.1 diagnostic starts.

---

**End of plan. Ship.**
