# FAMtastic Site Studio — Architecture Reference
**Last updated:** 2026-04-16 (Session 13)

This document describes the internal architecture of `site-studio/server.js` and its supporting `lib/` modules. It is a technical map, not a user guide. Use it when you need to understand where something lives, how data flows, or why a specific design decision was made.

---

## Overview

Studio is a **monolithic Node.js/Express server** (~12,300 lines in `server.js`) with a real-time WebSocket connection to a single-file browser frontend (`public/index.html`). There is intentionally no framework abstraction, no ORM, no message broker. State lives in JSON files on disk. The monolith is a deliberate choice at this stage — the solo-operator advantage of zero context-switching cost outweighs the architectural purity of decomposition. Do not split `server.js` until a specific function is a measurable bottleneck.

---

## State Architecture

### The Five State Files (Per Site)

Every site lives at `~/famtastic/sites/<tag>/`. The five state files are:

| File | Owner | Write path | Cache |
|------|-------|-----------|-------|
| `spec.json` | `writeSpec()` | Atomic: `.tmp` + `renameSync` | `_specCache` + `_specCacheTag`, invalidated on write |
| `.studio.json` | `saveStudio()`, `versionFile()`, `startSession()` | Raw `fs.writeFileSync` (no cache, race possible during async summary) | None |
| `conversation.jsonl` | `appendConvo()` | `fs.appendFileSync` (append-only) | None |
| `agent-calls.jsonl` | `logAgentCall()` | `fs.appendFileSync` | None |
| `mutations.jsonl` | `writeSpec()` with mutation details | `fs.appendFileSync` | None |

**Critical:** `readSpec()` uses a write-through cache keyed by `_specCacheTag`. When `TAG` changes (site switch), the cache is stale until the next `writeSpec()` call. Always call `readSpec()` at the top of any handler that needs fresh spec data — never assume in-scope `spec` variable is current after async operations.

### Global Runtime Variables

Two site-tag variables exist. Confusing them causes the most common class of bug:

| Variable | Type | When set | Use |
|----------|------|---------|-----|
| `TAG` | `let` (mutable) | Set by site switch, startup | **Always use this** inside route handlers and build functions |
| `process.env.SITE_TAG` | env var (immutable) | Set at process start | Never use inside handlers — it goes stale on site switch |

Helper functions that always use `TAG`:
- `SITE_DIR()` → `~/famtastic/sites/${TAG}/`
- `DIST_DIR()` → `~/famtastic/sites/${TAG}/dist/`
- `SPEC_FILE()` → `~/famtastic/sites/${TAG}/spec.json`

---

## Request Lifecycle

### 1. WebSocket Message Arrives

```
ws.on('message', raw)
  → parse JSON
  → type === 'chat' → handleIncomingMessage(ws, data)
  → type === 'set-page' → isValidPageName() guard → set currentPage
  → type === 'execute-plan' → routeToHandler() for plan intents
  → type === 'set-brain' → brain routing
  → type === 'set-brain-model' → ws.brainModels[brain] = model
```

### 2. handleIncomingMessage

```
  → appendConvo(user message)
  → brain routing gate: currentBrain !== 'claude' → handleBrainstorm()
  → classifyRequest(message, spec) → intent
  → main WS switch(intent):
      'conversational_ack' → getAckResponse() → ws.send(), return (zero API)
      'brainstorm'         → handleBrainstorm()
      'run_worker_task'    → deterministic handler (no Claude)
      'new_site'           → handlePlanning()
      'major_revision'     → handlePlanning()
      'restyle'            → handleChatMessage(ws, msg, 'restyle', spec)
      'deploy'             → runDeploy()
      'page_switch'        → setActivePage()
      ... (all other intents) → routeToHandler()
```

### 3. classifyRequest

Priority order (first match wins):
1. `conversational_ack` — ACK_PATTERNS regex (short affirmations, zero-cost)
2. Structured brief detection → `build` or `new_site`
3. `brainstorm` signals
4. `rollback` signals (requires "version" or "previous" anchor)
5. `version_history` (requires "version" or "versions" anchor)
6. `new_site`
7. `major_revision`
8. `restructure`
9. `page_switch`
10. `run_worker_task`
11. `enhancement_pass`
12. 12 `content_update` patterns (surgical edit signals — highest precedence over layout)
13. `restyle` signals
14. `bug_fix` signals
15. `deploy`
16. `asset_import`
17. `fill_stock_photos`
18. `layout_update`
19. Default: `content_update`

**Plan-gated intents** (require user confirmation before execution): `layout_update`, `major_revision`, `build`, `restructure`. `restyle` is NOT plan-gated — it routes directly to `handleChatMessage`.

### 4. routeToHandler

```javascript
switch(requestType) {
  case 'conversational_ack': → getAckResponse() → return (no Claude)
  case 'layout_update':
  case 'content_update':
  case 'bug_fix':            → handleChatMessage(ws, msg, requestType, spec)
  case 'new_site':
  case 'major_revision':     → handlePlanning(ws, msg, spec)
  case 'restyle':            → handleChatMessage(ws, msg, 'restyle', spec)
  case 'restructure':
  case 'build':              → parallelBuild() or template flow
  // ... all other intents
}
```

---

## Build Pipeline (Template-First)

### Phase A — Template Build

`buildTemplatePrompt(spec, pageFiles, briefContext, ...)` constructs the prompt. One Claude SDK call (`callSDK()`). Claude emits:
- Full `_template.html` (nav, header, footer, `<style data-template="shared">`)
- Logo SVG blocks delimited by `<!-- LOGO_FULL -->`, `<!-- LOGO_ICON -->`, `<!-- LOGO_WORDMARK -->`

`writeTemplateArtifacts()` extracts:
- `dist/_partials/_nav.html`
- `dist/_partials/_footer.html`
- `dist/assets/styles.css`

`extractMultiPartSvg()` splits logo delimiters → `dist/assets/logo-full.svg`, `logo-icon.svg`, `logo-wordmark.svg`.

**`templateSpawned` flag** prevents race condition if two builds trigger simultaneously.

### Phase B — Parallel Page Builds

`parallelBuild()` spawns one `Promise` per page. Each page call:
1. `loadTemplateContext()` — reads `_template.html` and `_partials/`
2. Constructs page prompt: template chrome verbatim, generate only `<main>` + `<style data-page="pagename">`
3. Injects `LOGO_NOTE_PAGE` (never re-emit logos) and `_slotStabilityInstruction` (preserve slot IDs)
4. `sdk.messages.stream()` → streams to WebSocket + collects full response
5. Parses `HTML_UPDATE` block from response → writes page HTML to `dist/`

`Promise.allSettled()` waits for all pages. Failed pages log errors but don't block the rest.

### Phase C — Post-Processing (runPostProcessing)

Nine steps, always in this order:

1. `extractAndRegisterSlots(pages)` — scan `data-slot-id` in all pages → `spec.media_specs[]`
2. `reapplySlotMappings(pages)` — restore user-assigned images from `spec.slot_mappings`
3. `updateBlueprint(pages)` + `injectSeoMeta(ws)` — SEO metadata, schema.org JSON-LD
4. `reconcileSlotMappings()` — remove orphaned mappings for deleted slots
5. `applyLogoV(pages)` — swap text nav brand for `<img src="assets/logo-full.svg">` if file exists
6. Layout path:
   - Template-first: `applyTemplateToPages()` + `ensureHeadDependencies(ws)` (injects FAMtastic DNA)
   - Legacy: `syncNavPartial()` + `syncFooterPartial()` + `ensureHeadDependencies(ws)` + `syncHeadSection(ws)` + `extractSharedCss(ws)`
7. `fixLayoutOverflow(ws)` — injects STUDIO LAYOUT FOUNDATION (main containment)
8. `syncContentFieldsFromHtml(pages)` — extract `data-field-id` elements → `spec.content[page].fields[]`
9. **`surgicalEditor.buildStructuralIndex()`** (Session 13) — build structural index per page → `spec.structural_index[page]`

**Non-negotiable:** every HTML write path calls `runPostProcessing()`. No exceptions, including fallback paths, rollbacks, and imports.

### Phase D — Build Verification

`runBuildVerification(writtenPages)` — 5 zero-token checks:
1. `verifySlotAttributes()` — all `<img>` have `data-slot-id`, `data-slot-status`, `data-slot-role`
2. `verifyCssCoherence()` — no orphaned selectors
3. `verifyCrossPageConsistency()` — nav/footer/head identical across pages
4. `verifyHeadDependencies()` — FAMtastic DNA scripts linked
5. `verifyLogoAndLayout()` — logo is SVG, main is contained

Results in `spec.last_verification`. UI shows green/yellow/red pill in toolbar.

---

## Prompt Context Assembly (buildPromptContext)

`buildPromptContext(spec, requestType, userMessage, currentPage)` assembles the full context sent to Claude. Key sections, in order:

1. **FAMtastic DNA** — `famtastic-dna.md` content (injected via CLAUDE.md `@` include at session level)
2. **Design brief** — `spec.design_brief` fields (goal, audience, tone, must-have sections, style, inspiration)
3. **Client brief** — `spec.client_brief` fields (owner's own words — treated as authoritative)
4. **Revenue architecture** — `getRevenueBuildHints(spec.client_brief.revenue_model)` prompt additions and schema hints *(Session 13)*
5. **Design decisions** — `spec.design_decisions[]` (recent 20 non-superseded)
6. **Promoted intelligence** — `intelligence-promotions.json` findings with severity `major`/`opportunity`
7. **Font pairing** — from `lib/font-registry.js` based on vertical
8. **Layout variant** — from `lib/layout-registry.js` based on vertical
9. **HTML context** — varies by intent:
   - `build`, `major_revision`: page list only
   - `content_update`, `bug_fix`, `layout_update`: full current HTML
   - `restyle`: summarized HTML (via `summarizeHtml()` if > 3,000 chars)
10. **Slot stability instruction** — list of existing slot IDs + roles (prevents Claude renaming slots)
11. **User message** — injected at `USER REQUEST: "${userMessage}"` (no sanitization — known security gap)

---

## Surgical Editor (lib/surgical-editor.js)

Session 13 addition. Pure module — no file I/O, no side effects. All callers own persistence.

### buildStructuralIndex(html, page)

Scans for:
- `[data-section-id]`, `[data-fam-section]`, `section`, `main > div` elements at top level (skips nested)
- `[data-field-id]` elements (content fields)
- `[data-slot-id]` elements (image slots)

Returns `{ page, sections[], fields[], slots[], built_at }`. Stored in `spec.structural_index[page]` after every build.

**Token cost comparison:**
- Full page HTML: 600–1,200 tokens (typical)
- Single section via `extractSection()`: 80–150 tokens
- Reduction: ~85–90%

### Usage pattern (not yet wired into content_update path)

```javascript
// Future: in handleChatMessage for content_update intent
const index = spec.structural_index?.[currentPage];
if (index) {
  const match = findBestSection(index, userMessage); // semantic match
  if (match) {
    const sectionHtml = surgicalEditor.extractSection(fullHtml, match.selector);
    // Send only sectionHtml to Claude (~100 tokens vs ~800)
    const newSectionHtml = await callClaude(sectionHtml, userMessage);
    const updatedFullHtml = surgicalEditor.trySurgicalEdit(fullHtml, match.selector, newSectionHtml);
    if (updatedFullHtml) {
      fs.writeFileSync(pagePath, updatedFullHtml);
      runPostProcessing(ws, [currentPage]);
      return; // done — did not send full HTML
    }
  }
}
// fallback: send full HTML as before
```

---

## Client Interview (lib/client-interview.js)

Question flow — quick mode (6 questions):

| # | ID | Field stored | Notes |
|---|-----|-------------|-------|
| 1 | q_business | business_description | Owner's own words — highest priority |
| 2 | q_revenue | revenue_model | **Added Session 13.** Has `suggestion_chips` + `follow_up_map` |
| 3 | q_customer | ideal_customer | |
| 4 | q_differentiator | differentiator | |
| 5 | q_cta | primary_cta | Used verbatim as button/CTA language |
| 6 | q_style | style_notes | Optional |

`buildClientBrief()` normalizes `revenue_model`:
- Empty/null → `'stub'` + `revenue_ready: true`
- "not sure", "later" → `'stub'` + `revenue_ready: true`
- Any other value → stored as-is + `revenue_ready: true`

`getRevenueBuildHints(model)` returns `{ components[], prompt_additions[], schema_hints[] }`:

| Model | Components | Schema |
|-------|-----------|--------|
| `rank_and_rent` / `lead_gen` | lead-capture-form, call-tracking-slot | LocalBusiness, Service, ContactPoint |
| `reservations` | reservation-widget-slot, event-inquiry-form | FoodEstablishment, Event |
| `ecommerce` | product-grid, cart-slot | Product, Offer, ItemList |
| `affiliate` | comparison-table, review-section | FAQPage, Review, ItemList |
| `stub` / default | contact-form | Organization, WebSite |

---

## WebSocket Message Types

### Client → Server

| Type | Payload | Action |
|------|---------|--------|
| `chat` | `{ message }` | Main chat input — routes through classifier |
| `set-page` | `{ page }` | Switch active page (validated by `isValidPageName()`) |
| `execute-plan` | `{ planId, userMessage }` | Execute a pending plan |
| `set-brain` | `{ brain }` | Switch active brain (claude/gemini/openai) |
| `set-brain-model` | `{ brain, model }` | Override model for a specific brain |
| `cancel-build` | — | Kill active build processes |

### Server → Client

| Type | Payload | Purpose |
|------|---------|---------|
| `chat` | `{ role, message }` | AI response, status messages, ack responses |
| `status` | `{ content }` | Build status updates |
| `reload` | `{ page }` | Tell preview iframe to reload |
| `build-plan` | `{ planId, plan }` | Present plan for user approval |
| `brain-changed` | `{ brain }` | Notify of brain switch |
| `brain-status` | `{ ... }` | API verification results |
| `brain-fallback` | `{ from, to }` | Notify of automatic brain fallback |
| `mode-changed` | `{ mode }` | Mode state change (e.g., entered brainstorm) |
| `verify-result` | `{ result }` | Build verification results |
| `worker-queue-update` | `{ pending_count }` | Queue badge update |

---

## Security Model

### Validated
- Path traversal: `isValidPageName()` checks page names before any file operation
- `read_file` tool: `path.resolve() + startsWith(siteRoot + sep)` — sandboxed to SITE_DIR
- ZIP extraction: path validation before every file copy
- SVG sanitization: scripts, event handlers, JS URIs stripped
- Origin/Referer validation on WebSocket connection
- Input length caps on message inputs

### Known Gaps
- `POST /api/replace-placeholder` has no `newSrc` validation (can inject `onerror="alert(1)"`)
- User message injected verbatim into Claude prompts: `USER REQUEST: "${userMessage}"` — no sanitization
- `DELETE /api/projects/:tag` has no path traversal check

---

## FAMtastic DNA — Protected Files

**Never modify these.** They are shared across all sites and changes cascade:
- `site-studio/lib/fam-motion.js` — scroll/hover animation engine
- `site-studio/lib/fam-shapes.css` — geometric design patterns
- `site-studio/lib/character-branding.js` — character/mascot placement pipeline

`ensureHeadDependencies()` copies them into each site's `dist/assets/` and injects `<link>`/`<script>` tags.

---

## Express Route Registration (Critical Order Rule)

Static routes **MUST** be declared before parameterized routes of the same prefix:

```javascript
// CORRECT — static before parameterized
app.get('/api/research/verticals', ...)    // static
app.get('/api/research/:filename', ...)    // parameterized

app.get('/api/worker-queue', ...)          // static
// (any other /api/:param routes below)

// WRONG — parameterized before static → "verticals" hits :filename → 404
app.get('/api/research/:filename', ...)
app.get('/api/research/verticals', ...)
```

This is enforced by convention and documented in cerebrum.md. Express matches top-to-bottom.

---

## spawnClaude() — Deprecated

`spawnClaude()` is `@deprecated`. It spawns a `claude --print` subprocess — unreliable for multi-turn, stderr-heavy, stdin-fragile. All production paths use `callSDK()` (non-streaming) or `sdk.messages.stream()` (streaming via `ClaudeAdapter`). `spawnClaude()` remains as an emergency fallback only.

When `spawnClaude()` must be used:
- `cwd` must be `os.tmpdir()` — never `HUB_ROOT`. A `CLAUDE.md` in `HUB_ROOT` with `--tools ""` produces 0 bytes output.
- Strip all `CLAUDE_*` env vars from the subprocess environment.

---

## Intelligence Loop

`updateFamtasticDna()` runs after every successful build (Session 12 Phase 3). It appends a timestamped entry to `famtastic-dna.md` under the "Build context" section. When the file exceeds 40KB, the oldest auto-entries are condensed into a summary block.

`famtastic-dna.md` is injected into every Claude session via `@famtastic-dna.md` in CLAUDE.md. This means every build starts with the accumulated knowledge from every prior build — the compounding advantage.

`scripts/intelligence-loop` runs on a cron (09:00 Mon/Wed/Fri). It iterates all sites, calls `generateIntelReport()` and `getPromotedIntelligence()`, and writes `~/PENDING-REVIEW.md`. The startup banner (`checkPendingReview()`) reports global unreviewed counts on every Studio launch.

---

## Testing Conventions

All test files are in `tests/`. Each session produces at least one test file named `session{N}-phase{M}-tests.js`.

Tests use a minimal hand-rolled runner:
```javascript
function test(name, fn) { try { fn(); console.log(`  ✓ ${name}`); } catch(e) { console.error(`  ✗ ${name}\n    ${e.message}`); } }
function assert(cond, msg) { if (!cond) throw new Error(msg || 'Assertion failed'); }
```

Most tests do **source text analysis** (grep the built `server.js` for expected patterns) rather than importing and executing functions — this avoids the complexity of mocking the full server context. Behavioral tests use the relevant `lib/` modules directly.

**Run before committing:**
```bash
node tests/session13-phase0-tests.js
node tests/session13-phase1-tests.js
node tests/session13-phase2-tests.js
node tests/session12-phase0-tests.js
```

---

## Deployment Model (Per-Site Git Flow)

Each site gets its own git repo at `~/famtastic-sites/<tag>/` with three branches:
- `dev` — active development
- `staging` — staging deploys
- `main` — production

`fam-hub site deploy <tag>` triggers `scripts/site-deploy` → Netlify CLI.

Studio's own code lives in `~/famtastic/` (this repo). Separate from all site repos.

---

## Known Architecture Debts (Honest Assessment)

| Debt | Impact | Fix when |
|------|--------|---------|
| 12,300-line `server.js` | Hard to navigate, can't test in isolation | Specific bottleneck appears |
| Fragmented state readers | Silent desync when concurrent ops modify spec | Before multi-tab support |
| `.studio.json` no write-through cache | Lost-write race on async summary generation | Before heavy async use |
| `content_update` still sends full HTML | 10x unnecessary token cost | Session 14 priority |
| Sugar-coating prompt injection | `USER REQUEST: "${userMessage}"` unsanitized | Before any public exposure |
| `fill_stock_photos` non-atomic | Broken-image state if second call fails | Before bulk fill at scale |
