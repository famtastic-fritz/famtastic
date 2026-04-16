# Cross-System Architecture
## Shay-Shay Research Applied Across Every FAMtastic Component
### Document date: 2026-04-16

---

## How to Read This Document

The Shay-Shay architecture research (shay-shay-architecture.md, Threads 1–6) produced
findings across six domains: intent routing, Mem0/Kuzu memory, skill definition, implicit
learning, capability manifests, and gap detection. This document maps each finding to
every major FAMtastic component and answers: what changes, in what order, and what it
unlocks.

The session-by-session order matters. Each row of the final dependency map is a
prerequisite for the next. Nothing here is speculative — every entry maps to an existing
file, endpoint, or pipeline documented in FAMTASTIC-STATE.md.

---

## 1. STUDIO — The Chat Interface and Build Pipeline

### Which research findings apply

**Routing (Thread 1):** Studio's current classifier is the right architecture at the
wrong layer. It lives in `server.js` as a flat function. With Shay-Shay, the classifier
becomes the Layer 1 fast router — same logic, new home. Studio's WebSocket becomes one
of Shay-Shay's MCP endpoints, not the entry point.

**Memory (Thread 2):** Every plan card approval, build outcome, and correction message
that flows through Studio's WebSocket is an episodic memory event. Studio already
generates this signal; none of it is captured.

**Capability manifest (Thread 6):** Studio's `server.js` hosts features at various
states of completeness. The restyle dead code path, the surgical editor that's built
but not wired, the suggestion chips that exist in the backend but not the UI — these
are exactly the three failure categories (broken, not_connected, not_built). Studio
needs to publish its actual capability state, not its theoretical one.

**Gap detection (Thread 6):** When a user asks Studio to do something that fails
silently (restyle, currently), that is a Category 3 gap event. Studio should log it
rather than swallow it.

### What changes or gets added

**Seed:**
- `server.js` adds a gap event logger. On intent classification failure or known-broken
  route: `appendGapEvent(capability_id, user_intent, failure_category, session_id)`.
  Writes to `~/.local/share/famtastic/gaps.jsonl`. Four lines of code.
- Studio's WebSocket `open` handler publishes a capability snapshot to Shay-Shay on
  connect: which tools are live, which are degraded, which are broken. This is the seed
  of the capability manifest.
- Suggestion logging: plan card `shown` → `accepted` / `dismissed` events written to
  `.wolf/memory/suggestions.jsonl`. The data exists (WS events fire already); the write
  is missing.

**Grow:**
- Studio wraps itself in an MCP server definition (not a new process — a thin adapter
  around the existing HTTP endpoints). Shay-Shay routes to Studio via MCP tool calls
  instead of direct WebSocket commands. Studio stops being the entry point; it becomes
  a routable tool.
- `GET /api/capability-state` endpoint — Studio publishes its live capability manifest.
  Evaluated at session start: pings WS, checks env vars, checks MCP registry, marks
  each capability `available` / `degraded` / `not_connected` / `broken`.
- Gap frequency check wired into the classifier: before returning an error or fallback
  response, check `gaps.jsonl` for `capability_id` frequency. At ≥ 3: response includes
  the frequency and the "add to backlog?" offer.

**Mature:**
- Studio's build events (`build:completed`, `edit:applied`) emit structured memory
  payloads to Mem0 via MCP. Episodic events stop being transient WebSocket messages
  and become persistent memory.
- Studio's Intelligence pane gains a "Gaps" tab: shows `gaps.jsonl` entries grouped
  by `capability_id`, sorted by frequency, with "Add to backlog" button per entry.

### What this unlocks

Silent failures become visible signals. The restyle path — currently the highest-trust
debt in the system — stops eating user requests. Shay-Shay can tell Fritz "you've tried
to restyle three times; the path is broken; here is the workaround." That is not just
better UX. That is the difference between a user who gives up and a user who trusts the
system enough to keep building.

---

## 2. THE INTELLIGENCE LOOP — `scripts/intelligence-loop` + `generateIntelReport()`

### Which research findings apply

**Memory promotion (Thread 4):** The intelligence loop already runs the pattern:
collect signals → surface findings → promote to `intelligence-promotions.json`. This
is episodic-to-semantic promotion without being called that. Shay-Shay formalizes and
automates what the intelligence loop does manually.

**Gap detection (Thread 6):** Gaps reaching frequency ≥ 3 should be promoted to
intelligence findings through the same pipeline the loop already uses. The gap log
(`gaps.jsonl`) becomes an input to `generateIntelReport()`, not a separate system.

**Implicit learning (Thread 4):** The intelligence loop currently generates findings
from build logs. Adding suggestion scores (`suggestions.jsonl`) and gap frequencies
(`gaps.jsonl`) as additional inputs gives the loop two new signal sources it doesn't
currently have.

### What changes or gets added

**Seed:**
- `generateIntelReport()` gains two new input sources: `suggestions.jsonl` (build
  outcomes and scores) and `gaps.jsonl` (failed routing attempts). No structural
  change — two new `readFileSync` + parse calls at the top of the function.
- Gap findings formatted the same as existing findings:
  `{ type: 'capability_gap', severity: 'opportunity', message: '...', site_tag, count }`

**Grow:**
- The weekly promotion job (`fam-hub` cron) reads `suggestions.jsonl`, identifies
  patterns with composite_score ≥ 2.5 across 3+ events, and promotes to semantic
  memory via Mem0 write. This is the episodic → semantic promotion loop.
- `promotions.jsonl` created as audit trail: every promotion recorded with date,
  pattern, evidence count, and which semantic memory entry it created.
- `generateIntelReport()` reads `promotions.jsonl` and includes a "What Shay-Shay
  Learned" section in the intelligence report.

**Mature:**
- Vertical intelligence summaries: after 10 builds in the same vertical, the
  intelligence loop generates a vertical summary from that vertical's episodic and
  semantic memories. Written to `~/.local/share/famtastic/verticals/<name>.md`. Injected
  into `buildPromptContext()` for all future builds in that vertical.
- The loop's effectiveness scoring (`research-effectiveness.json`) expands to score
  Shay-Shay's suggestions: which suggestion types have the highest shipped rate by
  vertical. This closes the feedback loop from memory → suggestions → outcomes → memory.

### What this unlocks

The intelligence loop currently produces findings Fritz reads. With these additions, it
produces findings that automatically improve future builds. The loop stops being a
reporting tool and becomes an active feedback mechanism. At 50 sites, the loop has
enough signal to make the 51st build in any vertical measurably better than the first.

---

## 3. THE BRIEF INTERVIEW — `lib/client-interview.js`

### Which research findings apply

**Memory (Thread 2):** The brief interview collects structured intent. That intent —
revenue model, audience, tone, must-have sections — is exactly what per-site semantic
memory should store. Currently it goes into `spec.json` and stops there.

**Routing (Thread 1):** The interview is a linear Q&A. Shay-Shay's routing layer
can make it adaptive: if per-site memory shows Fritz always wants dark themes for
hospitality verticals, the visual direction question can pre-populate with that pattern
and ask for confirmation rather than asking cold.

**Implicit learning (Thread 4):** Every time Fritz modifies a brief answer (edits after
reviewing the brief card), that is a correction signal. Currently there is no
mechanism to capture "Fritz changed the tone from 'casual' to 'bold' after seeing
the first build" as a preference signal.

### What changes or gets added

**Seed:**
- On interview completion, write a structured memory event to the per-site episodic
  log: `{ type: 'brief_completed', revenue_model, tone, audience, visual_direction,
  timestamp }`. Four lines after `buildClientBrief()`.
- On brief card edit (user modifies the brief after seeing it), log a correction event:
  `{ type: 'brief_correction', field, before, after, timestamp }`. This is the most
  valuable implicit signal in the entire build flow.

**Grow:**
- Interview `startInterview()` checks per-site semantic memory before presenting each
  question. If memory contains a high-confidence pattern for this site or vertical, the
  question includes it as a default: "Last time you built a rooftop bar you chose
  rank-and-rent. Same this time?"
- `REVENUE_MODEL_OPTIONS` suggestion chips gain memory-weighted ordering: models Fritz
  has selected before in the same vertical appear first.
- Brief corrections (before/after diffs) feed the suggestion scorer. A correction on
  the tone field scores `tone_suggestion: dismissed` and increments the evidence for
  "Fritz's tone preferences differ from system defaults in hospitality verticals."

**Mature:**
- Vertical brief templates: after 5 completed briefs in the same vertical, the
  interview can offer "Use the rooftop bar template?" — pre-filling all fields with
  the median choices from previous builds, asking only for confirmation or changes.
  The template is generated from semantic memory, not hardcoded.
- Brief corrections aggregate into a `vertical_preferences.json` per vertical: the
  learned defaults for visual direction, tone, revenue model by vertical category.
  This file is injected into `buildPromptContext()` alongside `famtastic-dna.md`.

### What this unlocks

The interview stops being a form and becomes an accumulation. By the 10th rooftop bar
site, Shay-Shay pre-fills the brief with high confidence. Fritz reviews and confirms
rather than answering from scratch. Interview time drops from 5 minutes to 30 seconds
for known verticals. This is the operational leverage that makes 1,000 sites feasible
for one person.

---

## 4. ASSET PIPELINE — Logo extraction, stock photos, brand.json

### Which research findings apply

**Capability manifest (Thread 6):** The asset pipeline has the most mixed capability
states of any FAMtastic component. Logo extraction works. Recraft API integration
doesn't exist. Adobe Firefly isn't connected. SVGMaker MCP isn't configured. These
are Categories 1, 2, and 3 failures that currently produce silent gaps.

**Gap detection (Thread 6):** When a user uploads a PNG logo and there is no
vectorizer path, that is a Category 1 gap (`upload_logo` intent: not_built). When a
user asks to "improve the logo" and the only path is a full rebuild, that is a Category
2 gap (capability exists in theory, no route from here).

**Memory (Thread 2):** Brand DNA (`brand.json`) is the semantic memory equivalent for
a site's visual identity. Once generated, it should persist and be injected into every
future build for that site — not re-derived from the HTML each time.

### What changes or gets added

**Seed:**
- `runPostProcessing()` Step 10 (new): after structural index, generate `brand.json`
  from the built HTML. Extract: primary/secondary/accent hex values from CSS custom
  properties, font families from `<link>` tags, logo file paths, tone keywords from
  `spec.design_brief.tone`. Write to `sites/<tag>/brand.json`.
- `brand.json` injected into `buildPromptContext()` on subsequent builds. One line:
  `if (brandJson exists) context += 'BRAND DNA:\n' + JSON.stringify(brandJson)`.
  This closes the color drift and typography inconsistency gaps documented in
  DEEP-DISCOVERY Thread 5 without any AI call.
- Gap log entries for `upload_logo` (PNG supplied, no vectorizer path): logged as
  `failure_category: not_built`.

**Grow:**
- `brand.json` promoted to per-site semantic memory via Mem0. Brand DNA becomes
  queryable: "What color palette did Altitude use?" returns from memory without reading
  the site HTML.
- SVGMaker MCP integration: when a logo extraction produces a low-fidelity SVG (heuristic:
  fewer than 10 path elements), Shay-Shay offers "I can try to improve this via
  SVGMaker. Want me to?" — making the capability visible rather than silently accepting
  the low-fidelity output.
- Capability manifest entry for `vectorize_logo` updated from `not_built` to
  `not_connected` once the SVGMaker MCP config entry is added.

**Mature:**
- Recraft API integration: `upload_logo` intent (PNG upload) routes to Recraft
  vectorizer. Output replaces the Claude-generated SVG in `assets/logo-full.svg`.
  Capability manifest: `upload_logo` moves from `not_built` to `available`.
- Brand consistency check on rebuild: compare new build's extracted brand tokens against
  `brand.json`. If primary color drifted by more than 15% in hue, flag as a verification
  warning. This catches the color drift problem automatically.

### What this unlocks

Brand consistency across sessions without Fritz having to re-specify colors. Sites that
rebuild months later look like the same brand, not a new one. The `brand.json` seed
is two hours of work with no dependencies. It fixes one of the most common trust-
breaking bugs (color drift on rebuild) before it compounds at scale.

---

## 5. COMPONENT LIBRARY — `library.json`, component export, usage tracking

### Which research findings apply

**Memory (Thread 2):** The component library needs the same treatment as per-site
memory, but at the ecosystem level. Which component was used on which site, when, with
what outcome, is episodic memory for the component system. Currently none of this is
captured.

**Implicit learning (Thread 4):** A component that ships on three sites and all three
pass the 13-point checklist at 13/13 has a quality signal attached to it. A component
that consistently causes build failures has a negative signal. These signals should
drive library curation automatically, not manually.

**Capability manifest (Thread 6):** Components are capabilities. A component in the
library but never tested in a current build is `status: available`. A component that
consistently fails when used in certain verticals is `status: degraded`. The manifest
pattern applies.

### What changes or gets added

**Seed:**
- Component lineage logging: when `runPostProcessing()` detects a component from
  `library.json` was included in a build, log `{ component_id, site_tag, build_date,
  checklist_score }` to `sites/<tag>/spec.json` as `spec.component_lineage[]`. This
  is the shadcn ownership model applied — per-site record of which components were used.
- `library.json` schema addition: `tags: []` field per component. 30 minutes. Enables
  filtering in the Studio Components pane without any other changes.

**Grow:**
- Component quality scores: the promotion job reads `component_lineage` across all
  sites and computes per-component `{ uses, avg_checklist_score, fail_rate }`. Written
  to `library.json` per component as `quality_signal`. Components with `fail_rate > 0.3`
  flagged for review in the Intelligence pane.
- Component memory: high-performing components (avg_score ≥ 12/13, uses ≥ 3) promoted
  to global semantic memory: "Video Hero Section performs at 13/13 on hospitality
  verticals." This signal is available to Shay-Shay when selecting components for a
  new build.
- Components pane in Studio renders `tags` filter and `quality_signal` badge (green/
  amber/red dot). No new API endpoints needed — `GET /api/components` already returns
  `library.json`.

**Mature:**
- Vertical component recommendations: Shay-Shay reads component quality signals by
  vertical from semantic memory and proactively suggests: "For rooftop bars, Video Hero
  Section has shipped at 13/13 on 4 of 5 builds. Include it?" This is a suggestion
  with full attribution — not a hallucinated recommendation.
- Component versioning: each export bumps the component's semver in `library.json`.
  Per-site copies in `sites/<tag>/assets/components/` are pinned to the version used
  at build time. Regression when the shared library updates is impossible.

### What this unlocks

The library stops being a growing flat array and becomes a curated, quality-signaled
catalog. By the 20th build, the system knows which components work for which verticals
and can recommend with evidence. This is vertical AI applied to component selection —
and no competitor has it.

---

## 6. MULTI-BRAIN ROUTER — Claude, Gemini, Codex adapters + `brain-adapter-factory.js`

### Which research findings apply

**Routing (Thread 1):** The current routing table is hardcoded: brainstorm → Gemini,
code review → Codex, builds → Claude. This is the rules-table anti-pattern. A2A Agent
Cards replace it with declared capabilities that Shay-Shay reads at session start.

**Capability manifest (Thread 6):** Each brain has its own capability state. Gemini is
`degraded` when `GEMINI_API_KEY` is missing. Codex is `available` when the CLI is
present and `not_connected` when it isn't. `lib/brain-verifier.js` already probes all
three at startup — that probe output becomes the brain capability manifest.

**Implicit learning (Thread 4):** When a brain produces output that Fritz corrects or
a build that fails verification, that is a negative brain signal. Currently no routing
adjustment happens. With suggestion scoring, brain performance per task type becomes
a learned signal.

### What changes or gets added

**Seed:**
- Agent Card files for each brain: `.famtastic/agents/claude-sonnet.agent-card.json`,
  `gemini-flash.agent-card.json`, `codex.agent-card.json`. Each declares:
  `capabilities[]`, `cost_tier`, `latency_target_ms`, `requires[]`. Shay-Shay reads
  these at session start. Adding a new brain adapter is now a JSON file, not a code
  change.
- `brain-verifier.js` probe results formatted as a capability snapshot and written to
  `.famtastic/shay-shay-capabilities.json` at startup. This is the same manifest the
  Studio WebSocket publishes — one source of truth.
- Brain routing logs: when a brain is selected for a task, log `{ brain, task_type,
  intent, timestamp }` to `~/.local/share/famtastic/brain-routing.jsonl`. This is the
  data source for brain performance scoring.

**Grow:**
- Brain performance scores: the promotion job reads `brain-routing.jsonl` and computes
  per-brain `{ task_type, avg_checklist_score, correction_rate }`. A brain that
  consistently produces output Fritz corrects on `content_update` tasks has a lower
  routing weight for that task type.
- Shay-Shay's Layer 2 reasoned routing uses Agent Cards + brain performance scores
  to select the brain. No longer hardcoded. "I'm routing this to Gemini because it's
  a research task and Gemini has a 94% accept rate on research tasks."
- Fallback routing: when the selected brain is `degraded` or `unavailable`, Shay-Shay
  routes to the next-best brain by capability overlap and logs the fallback event.
  Fritz sees: "Gemini is unavailable — routing to Claude for this research task."

**Mature:**
- Brain consensus for high-stakes decisions: Shay-Shay sends the same planning request
  to two brains and synthesizes the outputs. Used for `major_revision` and `build`
  intents when the estimated scope is `large`. Cost is explicit: "This will call
  Claude + Gemini. Estimated cost: $0.03. Proceed?"
- Task-type specialization emerges from data: after 50 builds, routing.jsonl contains
  enough signal to identify which brain performs best on which vertical + task_type
  combination. Shay-Shay's routing becomes vertical-aware without being explicitly
  programmed to be.

### What this unlocks

Brain routing becomes adaptive and transparent. Fritz can see why a brain was selected
and correct it. Over time, the system learns which brain to trust for which task type
on which vertical — without Fritz having to manage it. This is the multi-agent
architecture that DEEP-DISCOVERY Thread 2 identified as the missing piece: shared
working memory and adaptive routing, not serial prompt-chaining.

---

## 7. DEPLOYMENT PIPELINE — `scripts/site-deploy`, Netlify CLI, deploy intent

### Which research findings apply

**Capability manifest (Thread 6):** Deployment has the clearest capability states of
any pipeline component. `deploy_staging` is `available` when Netlify CLI is present
and `NETLIFY_AUTH_TOKEN` is set. `deploy_production` requires the same plus a confirmed
staging deployment. These are runtime checks, not assumptions.

**Gap detection (Thread 6):** When a user asks to deploy and the auth token is missing,
that is a Category 3 failure (capability exists, will fail). Currently the deploy
script fails with an error that propagates as a generic WebSocket error. That should
be a named gap event with a specific resolution path.

**Memory (Thread 2):** Every deploy is an episodic event that should persist: what
was deployed, when, to which URL, what the checklist score was at deploy time. This
is the data source for Mission Control's decay detection.

### What changes or gets added

**Seed:**
- Deploy events written to per-site episodic memory: `{ type: 'deployed', environment,
  url, checklist_score, page_count, timestamp }`. One write after successful
  `runDeploy()`. This is the seed of Mission Control's data model.
- Deploy capability pre-check: before invoking `scripts/site-deploy`, check that
  the required env vars and CLI tools are present. If not, log a Category 3 gap event
  and return a named error: "Netlify auth token missing — set NETLIFY_AUTH_TOKEN to
  enable deployment." Not a generic script failure.
- `sites/<tag>/spec.json` gains `deploy_history: []` — an array of deploy events.
  `writeSpec()` appends each deploy. Atomic write ensures no corruption.

**Grow:**
- Shay-Shay's deployment confirmation includes memory context: "This is the first
  deployment of site-altitude. The last build passed 13/13. Deploy to staging?" The
  context comes from per-site episodic memory, not from reading the spec.
- Staging → production gate: Shay-Shay checks whether a staging deploy exists before
  allowing production deploy. If no staging deploy: "I don't see a staging deployment
  for this site. Deploy to staging first?" — not a hard block, a confirmation pattern.
- Post-deploy semantic memory: after three production deploys of the same site, Shay-Shay
  promotes the deploy pattern to semantic memory: "site-altitude deploys to production
  after an average of 2 staging cycles. Checklist score at deploy time is consistently
  13/13." This becomes context for future deploys.

**Mature:**
- Decay detection via deploy history: the intelligence loop reads `deploy_history[]`
  and flags sites where the last deploy was >60 days ago with a non-zero checklist
  score. This is the Mission Control decay signal — no new infrastructure required.
- Cloudflare Durable Objects routing: deploy intent on sites with `revenue_model:
  reservations` or `revenue_model: lead_gen` routes to Cloudflare Workers instead of
  Netlify static. The site gets a Durable Object for form submissions. This is the
  DEEP-DISCOVERY Thread 8 / Thread 11 non-static site architecture.

### What this unlocks

Deployment becomes a documented, auditable event rather than a side effect. The deploy
history enables Mission Control without building Mission Control first — the data is
already accumulating. The Cloudflare routing path unblocks the rank-and-rent revenue
model's lead capture requirement.

---

## 8. MISSION CONTROL — Portfolio management, decay detection, revenue tracking

### Which research findings apply

**All of them.** Mission Control is the output layer that consumes signals from every
other component. It cannot be built first. It is built when there is data to display.

**Memory (Thread 2):** Mission Control reads from per-site episodic and semantic
memory. Sites that have memory know their history. Sites without memory appear as stubs.
The richer the memory layer, the richer Mission Control becomes.

**Gap detection (Thread 6):** Mission Control is one of the outputs of gap promotion.
When `gaps.jsonl` has 10 entries for `sms_lead_routing` across 5 sites, Mission
Control surfaces: "5 sites have requested a capability that doesn't exist yet. Consider
building it."

**Intelligence loop (Thread 4):** Mission Control is the UI for the intelligence loop.
The loop generates findings; Mission Control displays them with site context. These are
not separate systems.

### What changes or gets added

**Seed:**
Nothing. Mission Control cannot be seeded without data. Its seed is the deploy events,
suggestion logs, gap logs, and brief corrections that other components start writing.

**Grow (after 5+ sites with deploy history):**
- `fam-hub admin status` CLI command: reads all `sites/<tag>/spec.json` files, extracts
  `deploy_history[-1]`, `spec.state`, `spec.revenue_model`, `spec.structural_index`
  key count. Outputs a markdown table. This is the minimum viable Mission Control — a
  CLI report, not a UI.
- Git hygiene sub-report: reads all site git repos, checks for uncommitted changes,
  detached HEAD, diverged branches. Outputs alongside the status table.

**Mature (after 20+ sites, 60+ days of signal):**
- Mission Control Studio tab: a dedicated canvas pane (alongside Chat, Preview, Brief)
  that renders the multi-site portfolio view. Reads from `fam-hub admin status` output.
  Shows: tag, state, last deploy date, revenue model, last checklist score, decay flag.
- Decay detection: sites where `(today - last_deploy_date) > 60 days` AND
  `deploy_history.length > 0` flagged with amber indicator. Clicking opens that site in
  Studio.
- Revenue tracking: `spec.revenue_model` + a new `spec.revenue_active: bool` field
  (set manually when Fritz confirms a site is generating income). Mission Control shows
  which sites are confirmed revenue vs. built-but-not-earning.
- Capability gap aggregation: Mission Control reads `gaps.jsonl` and surfaces
  cross-site gap patterns: "8 sites have hit the `sms_lead_routing` gap. This is the
  highest-frequency unbuilt capability."

### What this unlocks

At 20 sites, Mission Control is the difference between knowing your portfolio and
guessing. At 100 sites, it is the operational requirement. At 1,000 sites, it is the
only thing that makes one-person operation possible. But it only works if the data
layers beneath it are populated — which is why every other component writes events
first.

---

## 9. SURGICAL EDITOR — `lib/surgical-editor.js` (built, not wired)

### Which research findings apply

**Capability manifest (Thread 6):** The surgical editor is the clearest example of
Category 2 in the entire system. The capability exists (`lib/surgical-editor.js` is
built, `spec.structural_index` is populated after every build), but it is not connected
to the `content_update` path. Shay-Shay's capability manifest marks it `not_connected`,
not `not_built`.

**Routing (Thread 1):** The surgical editor is a routing decision, not a build task.
When `content_update` fires and `spec.structural_index` has a matching section, route
to `trySurgicalEdit()`. When it doesn't match, fall back to full-page Claude call.
This is a classifier change, not a new feature.

**Memory (Thread 2):** Surgical edit outcomes (which sections were edited, what the
before/after was) are episodic events. After 3 successful surgical edits on the same
section type, that section type is a candidate for semantic memory: "this site's hero
content is updated frequently — always index it for surgical targeting."

### What changes or gets added

**Seed (this is Tier 1 in FAMTASTIC-STATE.md — do it now):**
- Wire `content_update` path to use surgical editor when structural index matches.
  In `handleChatMessage()`, before calling Claude: check `spec.structural_index[activePage]`
  for a section matching the detected edit target. If found: call `trySurgicalEdit()`.
  If surgical edit succeeds: skip Claude call entirely. If it fails: fall back to Claude
  with full page. This is 15 lines of code that closes a documented Tier 1 gap.
- Capability manifest entry: `surgical_edit` status changes from `not_connected` to
  `available` once the wiring is in place.
- Gap log entry for `surgical_edit` removed (it was `not_connected`; now it's `available`).

**Grow:**
- Surgical edit outcome logging: on successful `trySurgicalEdit()`, log `{ section,
  tokens_saved_estimate, timestamp }` to `suggestions.jsonl`. This is the 90% token
  reduction signal — track it so the intelligence loop can surface it as a cost saving.
- Structural index richness: `buildStructuralIndex()` gains two new fields per section:
  `edit_frequency` (how many times this section has been surgically edited) and
  `last_edited_at`. Sections with high edit frequency are promoted to "hot sections"
  — prioritized in index lookups.

**Mature:**
- Proactive surgical targeting: when Shay-Shay receives a `content_update` intent, she
  reads the structural index and offers: "I can edit just the hero content section
  (~120 tokens) rather than the full page (~900 tokens). Want me to proceed?" Explicit
  cost savings, visible to Fritz.
- Cross-site surgical patterns: after 20 surgical edits across multiple sites, the
  sections most frequently edited are promoted to global semantic memory: "hero content
  and CTA text are the highest-frequency surgical targets across all sites." Build
  prompts can deprioritize making those sections overly complex.

### What this unlocks

Wiring the surgical editor is the single highest-ROI change available right now. It
closes a Tier 1 known gap, reduces per-edit costs by ~90% at scale, and requires no
new features — only routing. At 1,000 sites with daily content edits, the cost
difference is the difference between sustainable and unsustainable unit economics.

---

## UNIFIED DEPENDENCY MAP

This map answers: what must be built first because everything else depends on it, what
can be built in parallel, and what should wait until data exists.

```
LAYER 0 — FOUNDATION (build first, everything else depends on these)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────────────────────────────────────┐
│  A. gaps.jsonl + gap event logger in server.js                  │
│     → 4 lines. No dependencies.                                 │
│     → Everything that detects and surfaces gaps depends on this │
├─────────────────────────────────────────────────────────────────┤
│  B. suggestions.jsonl + plan card outcome logging               │
│     → ~10 lines in WS handlers. No dependencies.               │
│     → All learning, scoring, and memory promotion depend on this │
├─────────────────────────────────────────────────────────────────┤
│  C. brand.json generation in runPostProcessing()                │
│     → Step 10. ~30 lines. Depends only on existing build output │
│     → Closes color drift. Feeds per-site memory.               │
├─────────────────────────────────────────────────────────────────┤
│  D. Surgical editor wired into content_update path             │
│     → ~15 lines. Depends on existing surgical-editor.js         │
│     → Tier 1 gap. Closes immediately.                          │
├─────────────────────────────────────────────────────────────────┤
│  E. Shay-Shay skill.json + instructions.md                      │
│     → New files, no code changes.                              │
│     → Defines the behavioral contract before code is written    │
├─────────────────────────────────────────────────────────────────┤
│  F. Capability manifest (.famtastic/shay-shay-capabilities.json)│
│     → Reads from brain-verifier.js probe results               │
│     → Depends on: brain-verifier.js (already exists)           │
│     → Studio publishes live capability state on WS connect      │
├─────────────────────────────────────────────────────────────────┤
│  G. Agent Cards for each brain                                  │
│     → JSON files. No code changes.                             │
│     → Depends on: nothing                                      │
│     → Enables dynamic routing, makes brain-adding a config op  │
└─────────────────────────────────────────────────────────────────┘

LAYER 0 items A–G can ALL be built in parallel.
None depends on another. Combined effort: 1 session.


LAYER 1 — DATA LAYER (build after Layer 0, requires its signals)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────────────────────────────────────┐
│  H. Mem0 + Kuzu MCP server integration                          │
│     → Depends on: B (suggestions.jsonl has data to store)      │
│     → Per-site episodic + global semantic memory                │
│     → Target: after 5 sites with Layer 0 running               │
├─────────────────────────────────────────────────────────────────┤
│  I. deploy_history[] in spec.json + deploy event logging        │
│     → Depends on: A (uses gap logger for deploy failures)       │
│     → Enables: Mission Control data model                       │
├─────────────────────────────────────────────────────────────────┤
│  J. component_lineage[] + library.json tags field               │
│     → Depends on: nothing (additive schema change)             │
│     → Enables: component quality scoring in Layer 2             │
├─────────────────────────────────────────────────────────────────┤
│  K. Brief correction logging (before/after diffs)               │
│     → Depends on: B (same log format)                          │
│     → Enables: vertical preference learning in Layer 2          │
├─────────────────────────────────────────────────────────────────┤
│  L. brain-routing.jsonl (brain selection + outcome log)         │
│     → Depends on: B (same pattern)                             │
│     → Enables: adaptive brain routing in Layer 2               │
└─────────────────────────────────────────────────────────────────┘

LAYER 1 items H–L can be built in parallel.
All depend on Layer 0 existing. Combined effort: 1-2 sessions.


LAYER 2 — INTELLIGENCE LAYER (requires Layer 1 data to be meaningful)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────────────────────────────────────┐
│  M. Promotion job: suggestions.jsonl → semantic memory          │
│     → Depends on: B, H (Mem0 must exist to write to)           │
│     → Target: after 10 builds with Layer 1 running             │
├─────────────────────────────────────────────────────────────────┤
│  N. Gap → intelligence finding promotion                        │
│     → Depends on: A, generateIntelReport() extension           │
│     → Gaps at frequency ≥3 surface in Intelligence pane         │
├─────────────────────────────────────────────────────────────────┤
│  O. Component quality scoring                                   │
│     → Depends on: J (lineage data must exist)                  │
│     → Target: after 10 builds per component                    │
├─────────────────────────────────────────────────────────────────┤
│  P. Brain performance scoring + weighted routing                │
│     → Depends on: G (Agent Cards), L (routing log)             │
│     → Brain routing becomes data-driven                        │
├─────────────────────────────────────────────────────────────────┤
│  Q. Vertical preference templates (brief pre-population)        │
│     → Depends on: K (correction data), H (Mem0 storage)        │
│     → Target: after 5 completed briefs per vertical             │
├─────────────────────────────────────────────────────────────────┤
│  R. Studio capability endpoint + gap frequency check            │
│     → Depends on: A (gaps.jsonl must have data)                │
│     → GET /api/capability-state + "add to backlog?" prompt      │
└─────────────────────────────────────────────────────────────────┘

LAYER 2 items M–R can largely be built in parallel.
Each depends on specific Layer 1 data sources. Combined: 2-3 sessions.


LAYER 3 — SURFACE LAYER (wait until Layers 0-2 have real data)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────────────────────────────────────┐
│  S. Memory inspector in Studio Intelligence pane                │
│     → Depends on: H (Mem0 must have entries to display)        │
│     → Shows episodic log, semantic patterns, promotions.jsonl   │
├─────────────────────────────────────────────────────────────────┤
│  T. Mission Control — fam-hub admin status CLI                  │
│     → Depends on: I (deploy_history must be populated)         │
│     → Target: after 5+ sites with at least 1 deploy each       │
├─────────────────────────────────────────────────────────────────┤
│  U. Vertical intelligence summaries                             │
│     → Depends on: M (semantic memory must have vertical data)  │
│     → Target: after 10 builds per vertical                     │
├─────────────────────────────────────────────────────────────────┤
│  V. Playwright MCP visual verification                          │
│     → Depends on: nothing (independent MCP integration)        │
│     → But: low value until builds are consistent (after L0)     │
├─────────────────────────────────────────────────────────────────┤
│  W. Mission Control UI tab in Studio                            │
│     → Depends on: T (CLI must work first), S (memory display)  │
│     → Target: after 20 sites with consistent data              │
├─────────────────────────────────────────────────────────────────┤
│  X. Twilio SMS lead routing                                     │
│     → Depends on: rank-and-rent sites being live               │
│     → Independent of all other layers                          │
└─────────────────────────────────────────────────────────────────┘

LAYER 3 depends on Layers 0-2 having operated for weeks.
No point building S, T, U before the data exists.
```

---

## What to Build First — The Ordered List

This is the implementation sequence derived from the dependency map. Each item is
blocked until all items above it that it depends on are done.

**Session 14 (this session or next):**
1. Wire surgical editor into `content_update` path (D) — closes Tier 1 gap, highest ROI
2. `gaps.jsonl` + gap event logger in `server.js` (A) — 4 lines, enables everything
3. `suggestions.jsonl` + plan card outcome logging (B) — enables learning
4. `brand.json` generation in `runPostProcessing()` (C) — closes color drift
5. `shay-shay-capabilities.json` (F) — from existing `brain-verifier.js` output
6. Agent Cards JSON files for each brain (G) — no code changes
7. `Shay-Shay skill.json` + `instructions.md` (E) — behavioral contract
8. `component_lineage[]` + `library.json` tags (J) — additive schema changes
9. `deploy_history[]` in `spec.json` + deploy event writes (I)
10. Brief correction logging (K)
11. `brain-routing.jsonl` (L)

All of these are Layer 0 and Layer 1. All can be written in a single session.
None requires a new API, a new process, or architectural change.

**After 5 sites with above running:**
12. Mem0 + Kuzu MCP server integration (H)
13. Gap → intelligence promotion extension to `generateIntelReport()` (N)
14. `GET /api/capability-state` + gap frequency check + "add to backlog?" prompt (R)
15. `fam-hub admin status` CLI (T)

**After 10 builds with Layer 1 data:**
16. Promotion job: suggestions → semantic memory (M)
17. Component quality scoring (O)
18. Brain performance scoring + weighted routing (P)

**After 5 completed briefs per vertical:**
19. Vertical preference templates for brief pre-population (Q)

**After Layer 2 has data:**
20. Memory inspector in Studio Intelligence pane (S)
21. Vertical intelligence summaries (U)
22. Playwright MCP visual verification (V)

**After 20 sites with consistent data:**
23. Mission Control UI tab (W)

**When rank-and-rent sites are live:**
24. Twilio SMS lead routing (X)

---

## What NOT to Build Yet

**Mission Control UI before `fam-hub admin status` works.** The CLI must validate
the data model before the UI is built. Building the UI first produces a beautiful
empty dashboard.

**Mem0 integration before suggestions.jsonl has data.** There is nothing to store in
Mem0 until the signal files are being written. Integration before data is infrastructure
for an empty database.

**Vertical preference templates before 5 briefs per vertical.** Three data points is
not enough to infer a preference. Templates generated from insufficient data will be
wrong more often than they're right — which destroys the trust they're supposed to build.

**Brain performance routing before brain-routing.jsonl has 20+ entries per brain.**
Routing weights from 3 data points are noise. Routing weights from 50 data points are
signal.

**Playwright visual verification before builds are consistent.** Visual verification
catches regressions. Regressions only matter once there is a baseline to regress from.
A platform with inconsistent build quality has no meaningful baseline. Wire surgical
editor first; stabilize quality; then add visual verification.

---

## The Strategic View

Every item in Layer 0 is additive — nothing is removed, nothing is restructured. Each
is a write to a new file or a route to an existing function. The combined effort is one
session. But the combined effect is: every subsequent build starts generating the data
that makes every future capability possible.

The dependency map is not a project plan. It is a compounding structure. Layer 0 data
feeds Layer 1 analysis. Layer 1 analysis feeds Layer 2 intelligence. Layer 2
intelligence feeds Layer 3 surfaces. By the time Mission Control needs to be built, the
data it displays has been accumulating for weeks across dozens of sites. The dashboard
is easy to build when the data is rich.

This is the Lego principle applied to the architecture itself. Every Layer 0 item is a
universal connector — it plugs into every layer above it. Every Layer 3 item consumes
everything below it. No puzzle pieces. Every piece expands what was already there.

---

*Cross-system architecture document: 2026-04-16*  
*Source research: shay-shay-architecture.md (Threads 1–6), DEEP-DISCOVERY.md (Threads 1–12), FAMTASTIC-STATE.md (Session 13 state)*  
*Next action: Session 14 — implement Layer 0 items A–L in a single build session*
