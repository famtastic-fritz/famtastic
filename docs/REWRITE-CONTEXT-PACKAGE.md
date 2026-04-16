# FAMtastic Site Studio — Rewrite Context Package

**Generated:** 2026-04-13  
**Scope:** Complete architectural analysis of FAMtastic Site Studio (Sessions 1-11)  
**Purpose:** Bridge document for rewrite/major refactoring of the core system

---

## SECTION 1: WHAT WAS BUILT

### System Overview

FAMtastic Site Studio is a **chat-driven website factory** — an AI-powered production system that takes natural language descriptions and converts them to production-ready HTML+Tailwind CSS websites. The system is **single-user, localhost-only, and open-source**, built entirely by Fritz Medine from 2026-01 to present.

**Core pipeline:**
1. User opens chat interface in browser
2. Describes desired website in natural language
3. System classifies the request into one of 18+ intents
4. Routes to appropriate handler (planning, building, editing, deploying)
5. AI generates HTML, CSS, and metadata
6. User previews live in browser
7. User refines via conversation ("make the header blue", "add a contact form")
8. Deploys to Netlify with one command

**What it produces:** Multi-page HTML+Tailwind CSS sites (zero build step, CDN only) with managed images, versioning, and rollback. Currently outputs static sites only. Deployed example: The Best Lawn Care (7 pages, live at https://the-best-lawn-care.netlify.app, 2026-03-20).

### Architecture

**Backend:** Single 12,200-line Node.js/Express file (`site-studio/server.js`). No external database. State stored in:
- Per-site JSON files: `spec.json` (site metadata, design decisions, image specs), `.studio.json` (session state, versions)
- JSONL files: `conversation.jsonl` (chat history), `agent-calls.jsonl` (multi-agent routing), `mutations.jsonl` (content edits)
- Disk directories: `dist/` (built site), `dist/.versions/` (snapshots), `summaries/` (session summaries)

**Frontend:** Single HTML file (`site-studio/public/index.html`, 4,320 lines) with inline Tailwind via CDN. Real-time bidirectional WebSocket. Three-panel layout:
- Left: chat panel with message history
- Center: live preview iframe (auto-reloads on builds)
- Right: studio sidebar (design brief card, decisions, uploads, files, brand health, version picker)

**AI Engines (Tri-Brain):**
- **Claude** (primary): `@anthropic-ai/sdk`, model `claude-sonnet-4-6`. Handles all HTML generation, planning, content edits, asset generation. Tool calling enabled (5 tools, MAX_TOOL_DEPTH=3).
- **Gemini** (secondary): Google Generative AI SDK, model `gemini-2.5-flash`. Brainstorm only (no HTML generation). Fallback for Claude.
- **OpenAI** (tertiary): OpenAI SDK, model `gpt-4o`. Codex integration via CodexAdapter. Chat + code tasks.

**WebSocket:** Real-time chat, build progress, preview reload, brain-changed events. Single WebSocket per browser tab, unguarded against concurrent connections (Session 11 bug — second tab resets session state).

**State Architecture:** **Severely fragmented.** Five independent state readers (classifyRequest, buildPromptContext, runPostProcessing, HTTP handlers, WS handler) all read from disk/globals independently. When one modifies state, others don't know. Causes silent failures and lost updates.

### Features Map (18+ Intent Types)

| Intent | Status | Handler | Behavior |
|--------|--------|---------|----------|
| `content_update` | ✅ Working | Surgical cheerio replacement | Change text, no rebuild |
| `layout_update` | ✅ Working | Full Claude rebuild | Add/move/remove sections, requires approval |
| `build` | ✅ Working | parallelBuild() | Generate from brief or template |
| `restyle` | ⚠️ Routed wrong | handlePlanning() (dead code) | Should go to handleChatMessage |
| `brainstorm` | ✅ Working | handleBrainstorm() | No-HTML ideation, routes to Gemini if active |
| `new_site` | ✅ Working | handleNewSite() | Create spec, trigger planning |
| `major_revision` | ✅ Working | Full rebuild with clean slate | Start over |
| `version_history` | ✅ Working | List versions | Show snapshot timeline |
| `rollback` | ✅ Working | Load version | Revert to previous state |
| `summarize` | ✅ Working | generateSessionSummary() | AI-generated session recap |
| `deploy` | ✅ Working | runDeploy() | Push to Netlify/Cloudflare/Vercel |
| `asset_import` | ⚠️ False positives | SVG generation | "create a hero section" triggers this |
| `fill_stock_photos` | ⚠️ Too aggressive | Stock photo fill | Catches "add an image" too broadly |
| `template_import` | ✅ Working | Upload .html or .zip | Apply template with spec colors |
| `page_switch` | ✅ Working | Preview state | Switch between pages in preview |
| `data_model` | ✅ Working | Concept planning | Plan DB schema (not executed) |
| `brand_health` | ⚠️ Side effect | scanBrandHealth() | Writes to spec on GET request |
| `bug_fix` | ⚠️ Suppresses changes | "Fix only the specific problem" instruction | Prevents design changes |

### Template-First Build (Session 10 Major Win)

**What it does:**
1. Build `_template.html` once: header, nav, footer, shared CSS (`<style data-template="shared">`)
2. Extract reusable components: `_partials/_nav.html`, `_partials/_footer.html`, `assets/styles.css`
3. Build ALL pages in true parallel: each page copies chrome verbatim from template, generates only `<main>` content + page-specific CSS
4. Post-processing: extract slots, reapply image mappings, sync metadata, fix layout containment

**Why it matters:** Eliminated 7 of 11 legacy post-processing steps (syncNav, syncFooter, syncHead, ensureHeadDeps, extractSharedCss, reconcileSlots, CSS seed extraction). Dramatically faster, fewer edge cases, cleaner architecture.

**Implementation:** `buildTemplatePrompt()`, `extractTemplateComponents()`, `loadTemplateContext()`, `writeTemplateArtifacts()`, `applyTemplateToPages()`. Guards: `templateSpawned` flag prevents race condition.

### Slot-Based Image System

Every `<img>` tag is a **named slot** with identity that survives HTML regeneration:

```html
<img data-slot-id="hero-1" 
     data-slot-status="empty|stock|uploaded|final"
     data-slot-role="hero|testimonial|team|service|gallery|logo|favicon"
     src="..." alt="..." />
```

**Slot status lifecycle:**
- `empty`: Initial. Transparent 1x1 GIF data URI.
- `stock`: Filled with Unsplash/Pexels photo or SVG placeholder.
- `uploaded`: User provided asset via upload modal.
- `final`: Approved (not yet used in automated flows).

**Source of truth:** `spec.json → media_specs[]` — list of all slots across all pages. Persisted to disk, survives rebuilds.

**Post-processing flow:**
1. Extract slots from generated HTML → `media_specs`
2. Apply saved mappings (`spec.slot_mappings`) to slots
3. Reconcile orphaned mappings (remove if slot deleted)
4. Rescan brand health (slot coverage, upload usage)

**Image providers:** Unsplash (primary), Pexels, Pixabay, placeholder (SVG fallback, always works with no API keys).

### Post-Processing Pipeline (8 Steps)

**Order matters. Every HTML write must go through `runPostProcessing()`.**

1. **extractAndRegisterSlots()** — scan `data-slot-id`, register in media_specs
2. **reapplySlotMappings()** — restore saved images from slot_mappings
3. **updateBlueprint()** — save to blueprint for future builds
4. **injectSeoMeta()** — add title, description, canonical, lang, Schema.org JSON-LD
5. **reconcileSlotMappings()** — remove orphaned mappings for deleted slots
6. **applyLogoV()** — swap nav logo from text to SVG if `assets/logo-full.svg` exists
7. **Layout path split:**
   - **Template-first path:** skip sync steps, applyTemplateToPages() (swap inline styles for CSS link)
   - **Legacy path:** syncNav/syncFooter/syncHead (for old sites or template failure fallback)
8. **fixLayoutOverflow()** — inject STUDIO LAYOUT FOUNDATION (main containment)
9. **ensureHeadDependencies()** — inject FAMtastic DNA scripts (fam-motion.js, fam-shapes.css, fam-scroll.js, fam-hero.css)
10. **syncHeadSection()** — dedupe head blocks across pages (uses MD5 hash, not substring matching)
11. **syncContentFieldsFromHtml()** — extract data-field-id elements into spec.content[page].fields[]

### Build Verification System (Phase 1: Zero-Token)

Five automatic file-based checks run after every build. Results in `spec.last_verification`:

1. **verifySlotAttributes()** — All `<img>` have `data-slot-id`, `data-slot-status`, `data-slot-role`
2. **verifyCssCoherence()** — CSS rules are syntactically valid, no orphaned selectors
3. **verifyCrossPageConsistency()** — nav/footer/head are identical across pages
4. **verifyHeadDependencies()** — FAMtastic DNA scripts are linked (fam-motion, fam-shapes, fam-scroll, fam-hero)
5. **verifyLogoAndLayout()** — Logo is SVG (not text), main is contained (max-width, centered)

UI: Green/yellow/red/gray pill in toolbar. Verify tab in sidebar. Browser-based Phase 2 (5 Claude Code agents) is optional, on-demand.

### Strengths

- **Works end-to-end:** spec → brief → template → parallel pages → verification → preview → deploy. One deployed site live in production.
- **Real HTML, no abstraction layers:** Zero build step, instant deploy, no webpack/vite complexity.
- **Live preview that works:** WebSocket reload, multi-page tabs, slot preview mode with visual overlays.
- **Template-first parallelization:** Built once, copied N times. Eliminates 7 post-processing steps.
- **Image identity across rebuilds:** Slot system survives HTML regeneration. Users can replace images without fear of losing assignments.
- **Per-site repos with git flow:** Each site is its own repo with dev/staging/main branches. Proper separation of tooling repo from site repos.
- **Tri-brain routing:** Claude (default), Gemini (brainstorm), OpenAI (code) — user can switch mid-conversation.
- **Interview system:** Pre-build Q&A captures client intent before first generation (quick/detailed/skip modes).
- **Good test coverage:** 56 unit tests passing (validators, classifier, slot extraction, template components, sanitizer).
- **Security-hardened:** 34-finding gap analysis (5 waves, 2026-03-23 to 2026-04-09). Spec write-through cache, path traversal validation, command injection guards, ZIP extraction safety, SVG sanitizer.

### Weaknesses

#### Architectural

1. **Monolithic server.js (12,200 lines).** No module structure. All state, all handlers, all utilities in one file. Unmaintainable, untestable in isolation, impossible to parallelize or scale. Session 7 cerebrum identified decomposition plan (200-line assembler + 12 modules), never implemented.

2. **Fragmented state architecture.** Five independent state readers. No central state authority. `buildPromptContext()` mutates `currentPage`. `classifyRequest()` reads from different snapshot than `runPostProcessing()`. When one modifies spec.json, others don't invalidate cache. Causes silent failures and lost updates. **Root cause of all integration failures.**

3. **No unified error handling.** 134/137 `ws.send()` calls are unguarded. Mid-build WS disconnect throws uncaught → potential server crash. `generateSessionSummary()` can hang gracefulShutdown (fs.writeFileSync with no error wrapping).

4. **WebSocket state per-tab not per-client.** `currentMode`, `currentPage`, `ws.currentChild` are module-level globals. Two tabs cause state collision: second tab triggers `startSession()` which resets mode → first tab's build is interrupted.

5. **State readers don't know what state they see.** classifyRequest reads spec version A, buildPromptContext reads spec version B (updated meanwhile), post-processing reads spec version C. Silent desync.

#### Classifier Issues

6. **`restyle` is routed to wrong handler.** Line ~4757 sends restyle to handlePlanning() (brief creation flow, dead code branch). Real restyle logic inside handleChatMessage is unreachable. Result: restyle requests are ignored.

7. **False positives on common words.**
   - "history" alone triggers `version_history` (should require "version" nearby)
   - "fix the colors" triggers `bug_fix` (prevents design changes)
   - "create a hero section" triggers `asset_import` (should require image/asset context)
   - "add an image" could trigger `fill_stock_photos` with no confirmation

8. **Missing conversational ack type.** "yes", "ok", "looks good" when brief exists fall to `content_update` default and trigger full Claude HTML generation (expensive, unwanted).

9. **`content_update` default is correct.** But when ambiguous messages should NOT trigger anything (e.g., "that looks good"), they do anyway.

#### Image/Slot System Issues

10. **`fill_stock_photos` is non-atomic.** Two endpoint calls (replace-slot then clear-slot-mapping). If second fails, media_specs shows status='uploaded' for a transparent GIF.

11. **`reapplySlotMappings` hardcodes status to 'uploaded'.** Stock photo slots become 'uploaded' after rebuild, losing original status.

12. **`scanBrandHealth` has write side effect.** Writes spec.brand_health on every GET call, invalidating spec cache. Should compute and return without persisting.

13. **`DELETE /api/upload` orphans slot_mappings.** Deleting an upload removes it from disk/uploaded_assets but not from slot_mappings. On rebuild, orphaned mapping gets reapplied → broken image.

14. **`parallelBuild` missing slot stability instruction.** `_slotStabilityInstruction` only built inside handleChatMessage. Full rebuilds let Claude rename slot IDs freely → orphans all mappings.

#### Blueprint/Spec Issues

15. **No blueprint page cleanup.** Deleted pages stay in `bp.pages` forever. Need reconciliation against DIST_DIR files.

16. **Blueprint components never reconcile.** `mergeComponents()` only adds, never removes. Deleted popups/modals persist forever, causing Claude to re-insert them on rebuilds.

17. **Blueprint layout_notes always empty.** Multi-line content filter breaks. All real sites have `layout_notes: []`.

18. **Blueprint escape hatch too wide.** "User requests always take priority" lets any change request override all protections.

19. **spec.json schema required fields never written.** `colors` and `pages` are marked required but never populated. Schema is decorative.

20. **`.studio.json` has no write-through cache.** Raw read-modify-write from 4 code paths (versionFile, saveStudio, startSession, generateSessionSummary). Lost-write race possible during async summary generation.

21. **`writeSpec()` not atomic.** Direct `fs.writeFileSync()` with no `.tmp` + rename pattern. Process crash mid-write corrupts spec.json.

#### Configuration Issues

22. **6 dead settings in studio-config.json.** `deploy_target` (never forwarded), `deploy_team` (hardcoded), `max_upload_size_mb` (multer uses 5MB hardcode), `max_versions` (never enforced), `preview_port`/`studio_port` (env vars override). Fix: wire each setting or remove from UI.

23. **analytics_provider/analytics_id have no Settings UI.** Build injects GA4/Plausible snippets but no modal field to configure them. Hand-edit studio-config.json required.

24. **business_type always empty.** Read in 6 places (SEO, stock queries, new-site) but written as empty string, never updated.

25. **Spec whitelist incomplete.** Only design_brief, design_decisions, site_name, business_type can be updated via WS. No way to edit other fields.

#### Multi-Page Issues

26. **spec.json `pages` array must be manually updated.** Brief approval and new_site handler only set `pages: ["home"]` regardless of how many pages the brief requests. The `design_brief.must_have_sections` has the correct list but is never copied to `spec.pages`.

27. **"Break into separate pages" misclassifies.** Classified as `layout_update` (wrong). Need a `restructure` or `split_pages` intent.

28. **`execute-plan` WS handler silently drops plans from `layout_update`.** No error, no build, no feedback.

#### Security Issues

29. **`POST /api/replace-placeholder` has no newSrc validation.** Can inject `onerror="alert(1)"` into every `<img>` tag.

30. **WebSocket has no origin check.** Any localhost page can establish WS connection.

31. **`DELETE /api/projects/:tag` has no path traversal check.** `../important-dir` as tag would move directories above sites/.

32. **`set-page` WS message skips `isValidPageName()`.** `../spec.json` as page could overwrite spec.json.

33. **`POST /api/settings` allowedKeys incomplete.** Nested objects (email, sms, stock_photo) can't be modified — only direct file edit works.

34. **Prompt injection in Claude calls.** userMessage injected verbatim: `USER REQUEST: "${userMessage}"`. No sanitization.

#### Integration Issues

35. **MCP server is read-only.** 4 tools read from disk only. No write capability — cannot trigger builds, switch pages, fill images, or post chat messages.

36. **No programmatic chat/build endpoint.** Builds only via browser WebSocket. Adding `POST /api/chat` would make the system scriptable from MCP, CLI, CI.

37. **Playwright MCP unused.** Installed but not connected to build validation or test pipeline.

#### Data Issues

38. **media_specs / slot_mappings redundancy.** Two structures track same slots with overlapping data. Could be unified.

39. **design_decisions garbage entries.** `extractDecisions()` can capture AI prompt fragments. `superseded` status exists in schema but never set.

---

## SECTION 2: HARD-WON LESSONS — DO NOT REPEAT

### Root Causes of Recurring Bugs

**The Core Problem:** Independent state readers cause cascading failures.

Five functions read state independently:
- `classifyRequest(message, spec)` — reads spec snapshot at time T0
- `buildPromptContext()` — reads spec snapshot at time T1, may mutate currentPage
- `runPostProcessing(html, page)` — reads spec snapshot at time T2
- HTTP handlers — read spec snapshot at time T3
- WS handler — reads spec snapshot at time T4

When one modifies `spec.json`, others don't invalidate. Silent desync.

**Fix pattern (Session 10):** Write-through cache for spec.json.
```javascript
function readSpec(tag) {
  // ... cached read ...
}
function writeSpec(tag, spec) {
  // ... atomic write with .tmp + rename ...
  // ... invalidate cache ...
}
```

**Applies to:** All mutable state. Not just spec.json. Also `.studio.json`, mutations.jsonl, etc.

---

### Session 3 — `fam-hero-single-dash` Regression

**Symptom:** Hero rendered but layer stacking was wrong. Classes didn't match CSS.

**Root cause:** Prompt said "use BEM naming" as suggestion. Claude produced single-dash class names (`.fam-hero-layer-bg`) because both spellings look correct in isolation.

**Fix:** `HERO_SKELETON_TEMPLATE` in `famtastic-skeletons.js` is now literal HTML with `--bg`, `--fx`, `--character`, `--content` baked in. Tests assert the double-dash vocabulary.

**Lesson:** Never ask Claude to follow naming conventions without a skeleton. Skeleton > prompt guidance.

---

### Session 4 — Plain-Text Nav Brand Regression

**Symptom:** Groove Theory rebuild scored 12/13 because nav showed "Groove Theory" as text, not logo SVG.

**Root cause:** "use the logo" was ambiguous. Claude sometimes substituted brand name as styled text.

**Fix:** `LOGO_SKELETON_TEMPLATE` contains explicit `<a><img src="assets/logo-full.svg"></a>` structure. `applyLogoV()` prefers `assets/logo-full.svg` as fallback.

**Lesson:** Never trust Claude to disambiguate between similar-looking options. Use skeleton HTML.

---

### Session 5 — Parallel-Page Logo Race

**Symptom:** Parallel spawns overwrote clean SVGs with conflicting markup. Different logos on different pages.

**Root cause:** Every parallel spawn received logo instructions and emitted its own SVG block.

**Fix:** Only template call emits logo SVGs. Parallel spawns get `LOGO_NOTE_PAGE` in prompt, instructing them to reference `assets/logo-full.svg` and never re-emit.

**Lesson:** When one step produces shared artifacts, other steps must reference (not regenerate). Use blocking comments in skeleton.

---

### Session 6 — `content_update` vs `layout_update` Misrouting

**Symptom:** Single-sentence edits triggered full rebuilds and plan gates.

**Root cause:** Classifier defaulted ambiguous intents to `layout_update` (expensive).

**Fix:** Default to `content_update` (surgical). `PLAN_REQUIRED_INTENTS` excludes it.

**Lesson:** Conservative default == bad UX. Aggressive default + explicit gates == better.

---

### Session 7 — `process.env.SITE_TAG` Staleness Bug

**Symptom:** After switching sites, builds wrote to the previous site's directory.

**Root cause:** `process.env.SITE_TAG` was set once at startup. `TAG` was the live runtime variable. Some code paths read the wrong one.

**Fix:** All build paths now read `TAG` (not env var). Cerebrum do-not-repeat list enforces this.

**Lesson:** **Never use startup env vars inside runtime handlers.** Use mutable module-level variable. Document which is which.

---

### Session 8 — `library.json` Structure Confusion

**Symptom:** Library render returned NaN component counts because code treated array like object.

**Root cause:** `library.json` is `{ version, components[], last_updated }` (object), not a flat array. Code did `libRaw.length` on an object → undefined.

**Fix:** Always extract `.components` with fallback: `const lib = Array.isArray(libRaw) ? libRaw : (libRaw.components || [])`.

**Lesson:** Schema must be explicit in code, not in comments. Comments lie. Code doesn't.

---

### Session 9 — buildPromptContext() Mutations

**Symptom:** Tests expected currentPage to be unchanged. buildPromptContext() mutated it.

**Root cause:** Hidden side effect inside a function that looked like a pure reader.

**Fix:** Returned resolvedPage instead. Caller updates explicitly.

**Lesson:** Never mutate non-local state inside functions that look like readers. Pure functions > convenient mutations.

---

### Session 10 — syncHeadSection() Substring Matching

**Symptom:** Style blocks were deduplicated by first 80 characters. Content-only updates (same selector, different rule) were missed.

**Root cause:** Substring matching is unreliable. "Same prefix" ≠ "same block".

**Fix:** Use MD5 hash of block content, not substring.

**Lesson:** String prefix matching is a code smell. Use hashes.

---

### Session 10 — extractSharedCss Stripping

**Symptom:** Extracted CSS was stripping page-specific styles from shared blocks.

**Root cause:** Code stripped ALL non-data-page styles. Missed that some were page-specific.

**Fix:** Only strip styles whose content matches what was extracted from index.html.

**Lesson:** When extracting, do a difference check (old - extracted, not old - all).

---

### Session 10 — summarizeHtml No-Op

**Symptom:** Summary was 500 words instead of 100. Contained full HTML twice.

**Root cause:** Function appended "FULL HTML:" + source after summary, defeating the purpose.

**Fix:** Return summary only.

**Lesson:** Test the happy path. The function looked correct in isolation but wasn't.

---

### Session 10 — classifyRequest() False Positives

**Symptom:** "history" alone triggered `version_history`. "restore" triggered rollback.

**Root cause:** Pattern matching was too loose. No context words required.

**Fix:** Added anchor words. "version_history" requires "version" or "versions". Rollback requires "version" or "previous" near "restore".

**Lesson:** Loose classifiers cause user frustration. Every classifier needs constraints.

---

### Session 10 — Multi-Page Fallback Missing Post-Processing

**Symptom:** When Claude's multi-page response failed to parse, HTML was written directly without post-processing.

**Root cause:** Fallback path was a shortcut.

**Fix:** All write paths now go through `runPostProcessing()`. No exceptions.

**Lesson:** Post-processing is not optional. Make it the only path.

---

### Session 10 — Single-Page Edits Skip ensureHeadDependencies

**Symptom:** Single-page edits didn't inject FAMtastic DNA scripts.

**Root cause:** Only full builds called it.

**Fix:** Single-page edits call it too.

**Lesson:** When you add a new post-processing step, add it to ALL write paths, not just the main one.

---

### Session 10 — Template Font URL Breaks

**Symptom:** "Playfair Display" (multi-word font) produced broken Google Fonts URL.

**Root cause:** `{{HEADING_FONT}}` template var wasn't encoded for URL.

**Fix:** Added `{{HEADING_FONT_URL}}` with `+` encoding.

**Lesson:** URL-safe encoding is a property, not a default. Explicitly name variants.

---

### Session 10 — Parallel Build Timeout Race

**Symptom:** Timeout handler AND close handler both incremented `innerCompleted`. Counter went out of sync.

**Root cause:** `kill()` triggers close, but timeout doesn't wait for close to fire.

**Fix:** Remove increment from timeout. Close will fire and handle the count.

**Lesson:** When async handlers share counters, one is the owner. Don't duplicate.

---

### Session 10 — Blueprint Components Never Removed

**Symptom:** Deleted popups persisted forever. Claude re-inserted them on rebuilds.

**Root cause:** `mergeComponents()` only adds, never removes.

**Fix:** Need to reconcile against what was actually generated (not what was in blueprint).

**Lesson:** Add-only data structures hide bugs. Need explicit cleanup.

---

### Session 11 — Template-First Missing ensureHeadDeps

**Symptom:** FAMtastic DNA assets (fam-motion.js, fam-shapes.css) absent from every build since Session 10.

**Root cause:** Template-first path was skipping `ensureHeadDependencies()`.

**Fix:** One-line: Call it in template-first path too.

**Lesson:** When you refactor a code path, every post-processing step must be present. Don't use feature flags to skip steps.

---

### Session 11 — Two Browser Tabs Cause Reset

**Symptom:** Opening a second browser tab reset the first tab's build state.

**Root cause:** `wss.on('connection')` called `startSession()` without checking if already started. Each tab triggered session reset.

**Fix:** Check if session already exists. Only call startSession() once.

**Lesson:** Per-connection state lives in ws object. Module-level state should be per-logical-session, not per-socket.

---

### Session 11 — `chat` WS Message Type Dropped

**Symptom:** Build-in-progress errors were sent as `{type:'chat'}` but client had no handler.

**Root cause:** Server sent a message type the client didn't understand.

**Fix:** Added `case 'chat':` handler on client.

**Lesson:** When adding a new WS message type, update both server AND client. Test in browser.

---

### Session 11 — `bp.global` Dead Code

**Symptom:** Blueprint nav_style, footer_style, logo were written but never injected.

**Root cause:** `buildBlueprintContext()` only reads `bp.pages[page]`. `bp.global` never used.

**Fix:** Either inject bp.global or remove it.

**Lesson:** Dead code accumulates. Periodically sweep for write-only state.

---

### Session 11 — Node.js CLI Stdin Consumed Twice

**Symptom:** When piping stdin to `gemini-cli` subprocess via `claude` CLI, second stdin read failed.

**Root cause:** Bash `$(cat)` reads stdin, then Python `os.read(0,...)` tries again on empty pipe.

**Fix:** Use `printf` instead of `echo`, pipe directly.

**Lesson:** Shell escaping and stdin handling interact in surprising ways. Test subprocesses with real input.

---

### Session 11 — Pre-Commit Security Grep Swallowed

**Symptom:** Security check was silently bypassed because quote was unclosed.

**Root cause:** Single quote in grep pattern was never closed. Pipe swallowed.

**Fix:** Proper quoting.

**Lesson:** Complex shell pipelines are error-prone. Test security checks end-to-end.

---

### Standing Rule: Template Extraction

**Do NOT modify these files — they are shared across all sites:**
- `site-studio/lib/fam-motion.js`
- `site-studio/lib/fam-shapes.css`
- `site-studio/lib/character-branding.js`

Changes cascade to all sites. Coordinate with whoever owns the shared library.

---

### Standing Rule: Route Registration Order

Static routes MUST be declared BEFORE parameterized routes:
```javascript
app.get('/api/research/verticals', ...)    // static
app.get('/api/research/:filename', ...)    // parameterized
```

Express matches top-to-bottom. If parameterized comes first, `/api/research/verticals` gets treated as `/:filename` → 404.

---

### Standing Rule: Post-Processing is Non-Negotiable

**Every HTML write path must go through `runPostProcessing()`.**

- Main build: yes
- Fallback build: yes
- Surgical edit: yes
- Rollback: yes
- Import: yes

No exceptions. Post-processing is the ONLY way to ensure:
- Slots are extracted
- Mappings are reapplied
- Head dependencies are injected
- Logo is swapped
- Layout is contained

---

### Standing Rule: Slot Stability in Single-Page Edits

When Claude edits a single page, inject a stability instruction:
```
"Maintain all existing slot IDs exactly as they are. 
Do not rename slots. Preserve: [list of slot IDs and roles]"
```

Without this, parallel rebuilds orphan all image mappings.

---

### Standing Rule: Classifier Default is content_update

Ambiguous messages route to `content_update` (surgical edit, no plan gate). Explicit keywords (add, remove, rebuild, redesign, new) are required to trigger `layout_update`.

The alternative (defaulting to layout_update) makes every ambiguous message trigger a full rebuild → expensive, frustrating, slow.

---

---

## SECTION 3: WHAT WORKS — CARRY FORWARD

### Template-First Architecture

**Why:** Eliminates 7 post-processing steps. Faster, cleaner, fewer bugs.

**How:**
1. One Claude call: `buildTemplatePrompt()` → `_template.html` (chrome only: header, nav, footer, `<style data-template="shared">`)
2. Extract reusable pieces: `writeTemplateArtifacts()` → `_partials/_nav.html`, `_partials/_footer.html`, `assets/styles.css`
3. True parallel: All pages build concurrently, each receives template context
4. Each page: copies chrome verbatim, generates only `<main>` + `<style data-page="pagename">`
5. Post-processing: swap inline template styles for CSS `<link>`

**Keep:** This pattern. It's proven, fast, and scales to 100+ pages.

---

### Slot-Based Image System

**Why:** Image assignments survive HTML regeneration. Users can replace images without losing metadata.

**How:**
- Every `<img>` carries `data-slot-id` (unique, claude-inferred), `data-slot-status` (lifecycle state), `data-slot-role` (semantic purpose)
- `spec.json → media_specs[]` is single source of truth
- `spec.json → slot_mappings` stores user-assigned images
- Post-processing: extract, reapply, reconcile in order

**Keep:** This system. It's elegant, solves a real problem, and has proven itself across multiple rebuilds.

---

### Per-Site Repos with Git Flow

**Why:** Each site is independently deployable, versionable, and maintainable.

**How:**
- On first build: auto-create `~/famtastic-sites/<tag>/` with dev/staging/main branches
- Push to Repo: commit to dev
- Deploy to Staging: merge dev → staging, deploy to Netlify staging
- Deploy to Production: merge staging → main, deploy to Netlify prod
- Proper separation: tooling repo (famtastic/) vs site repos (famtastic-sites/)

**Keep:** This structure. It's enterprise-grade and scales.

---

### WebSocket Real-Time Preview

**Why:** Live feedback loop. User sees changes instantly without manual refresh.

**How:**
- Server sends `{ type: 'reload', page: '...' }` on build completion
- Client reloads preview iframe with `src="http://localhost:3333/preview/page.html"`
- Multi-page tabs in preview: `page_switch` intent switches active tab

**Keep:** This pattern. It's responsive and intuitive.

---

### Design Brief + Decisions Memory

**Why:** Prevent cookie-cutter output. Every site is unique because its design philosophy is explicit.

**How:**
- Planning mode: Claude generates `DESIGN_BRIEF` block (goal, audience, must-have sections, style, inspiration)
- `spec.json → design_brief` stores it
- `spec.json → design_decisions` logs every design choice (color palette, typography, layout, feature X)
- Injected into every future build prompt

**Keep:** This model. Cookie-cutter is a disease. Explicit design memory is the cure.

---

### Request Classifier with Anchor Words

**Why:** Reduce false positives. Necessary because natural language is ambiguous.

**How:**
- Pattern matching with required anchor words
- `version_history` requires "version" or "versions"
- Rollback requires "version" or "previous" near "restore"
- Default fallback: `content_update` (cheap, not `layout_update` (expensive)

**Keep:** This approach. Good classifiers make good UX.

---

### Surgical Content Edits (cheerio)

**Why:** Change text without touching layout or CSS. Fast, predictable, no AI needed.

**How:**
- Scan for `data-field-id` in HTML
- Cheerio parse → find element → update text/HTML → serialize
- Write to disk
- Log to `mutations.jsonl`

**Keep:** This pattern. It's deterministic and scales.

---

### Build Verification System (Phase 1)

**Why:** Catch generated-site defects automatically. No human review needed. Zero-token cost.

**How:**
- 5 file-based checks: slot attributes, CSS coherence, cross-page consistency, head deps, logo/layout
- Run after every build automatically
- Results in `spec.last_verification`
- UI shows pass/warn/fail pill in toolbar

**Keep:** This system. Verify every build. Never ship unverified.

---

### Client Interview System

**Why:** Capture intent before first generation. Prevent "that's not what I wanted" after the first build.

**How:**
- Three modes: quick (5q), detailed (10q), skip
- Q&A state machine with strict ordering
- Results in `spec.json → client_brief`
- Injected into build prompt

**Keep:** This flow. It works. It's been used in production.

---

### FAMtastic DNA (Shared Assets)

**Why:** Consistent hero composition, motion, and visual language across all sites.

**What:**
- `lib/fam-motion.js` — reusable scroll/hover animations
- `lib/fam-shapes.css` — geometric design patterns (blobs, wave dividers, layered backgrounds)
- `lib/fam-scroll.js` — scroll-triggered animations
- `lib/fam-hero.css` — 7-layer hero composition vocabulary

**How:** Auto-copied to every site's dist/assets/ by `ensureHeadDependencies()`. Linked in `<head>`.

**Keep:** This library. It's the visual signature of FAMtastic. Protect it from casual mutation.

---

### Tri-Brain Ecosystem

**Why:** Different AI models for different tasks. Route intelligently.

**How:**
- **Claude** (primary): HTML generation, planning, asset generation, code, tool use. Model: claude-sonnet-4-6. SDK: @anthropic-ai/sdk.
- **Gemini** (secondary): Brainstorm, research, exploration. Model: gemini-2.5-flash. SDK: @google/generative-ai.
- **OpenAI** (tertiary): Code review, chat. Model: gpt-4o. SDK: openai.

UI: Brain selector in sidebar. User can switch mid-conversation. Per-brain model override via dropdown.

**Keep:** This architecture. Multi-model routing is a strength, not a hack.

---

### Decomposition Plan (Session 7)

**Status:** Planned, never implemented. Still valid.

**Scope:** Break 12,200-line monolith into ~200-line assembler + 12 modules:

1. **SessionStore** — owns all mutable state (spec, .studio.json, conversation.jsonl)
2. **SiteSpec** — write-through cache for spec.json
3. **PromptBuilder** — guarantees context inclusion (NO state mutations)
4. **Classifier** — confidence tiers, session context (no side effects)
5. **PostProcessor** — document-map pattern (read once, mutate in-memory, write once)
6. **ClaudeRunner** — SDK calls, fallback, streaming, error handling
7. **ResponseParser** — extract artifacts (DESIGN_BRIEF, MULTI_UPDATE, etc.)
8. **SlotManager** — extract, reapply, reconcile
9. **StockPhotoService** — fetch from providers
10. **BlueprintStore** — read/write/merge
11. **Settings** — TTL cache, schema validation
12. **ConversationLog** — append with intent field

**Why:** Testing becomes possible. Modules are reusable. State flows are explicit. Parallelization is feasible. Refactor time estimate: 80-120 hours of focused work.

**Keep:** This plan. It's the path forward. Don't deviate from it.

---

### Test Coverage (56 Tests)

**Status:** 1,183 cumulative tests across 19 suites. All passing.

**What's tested:**
- Input validators (path traversal, page names, slot IDs)
- Classifier (intent detection, edge cases, false positives)
- Slot extraction (registration, orphan reconciliation)
- Template components (extraction, artifact writing)
- SVG sanitizer (script stripping, event handler removal)
- Content field scanning (data-field-id extraction)
- Build verification checks (5 file-based checks)

**Keep:** This test suite. Run it on every change. Add tests before fixing bugs.

---

### Security Hardening (34-Finding Gap)

**Status:** Wave 5 (2026-04-09) closed major gaps.

**What works:**
- spec.json write-through cache (prevents desync)
- Path traversal validation (`isValidPageName()`)
- Command injection guards (array-form spawn calls)
- ZIP extraction safety (path validation before copy)
- SVG sanitizer (scripts, event handlers, JS URIs stripped)
- CSRF protection (Origin/Referer validation)
- Input validation (max lengths, allowlisted keys)
- Modal accessibility (Esc/backdrop close, roles, aria)
- WS resilience (exponential backoff, error handling)

**Keep:** These hardening patterns. Security is not optional.

---

---

## SECTION 4: THE VISION DELTA

### The North Star (FAMTASTIC-VISION.md)

**What was envisioned:**

1. **Empire Model (Three Layers)**
   - Layer 1: Portfolio (1,000 $100/mo digital products)
   - Layer 2: Platform (FAMtastic Studio, proven internally)
   - Layer 3: SaaS (Studio available to other creators)

2. **Scaling Milestones**
   - 10 sites: Anti-cookie-cutter mechanisms work
   - 50 sites: Management layer works
   - 100 sites: Revenue model works at scale
   - 500 sites: Factory operates with minimal manual intervention
   - 1,000 sites: Empire established

3. **Revenue Path**
   - Client discovers opportunity → Studio builds & deploys → preview & approve → payment → domain provisioned → live as recurring product
   - Infrastructure exists: PayPal, GoDaddy, Netlify, Adobe
   - Missing piece: end-to-end transaction flow inside Studio

4. **Continuous Intelligence Loop**
   - Research: surface new tools/integrations/frameworks weekly
   - Analysis: promote relevant findings to roadmap
   - Integration: learnings from production use feed back into factory
   - Implementation: weekly research script using Gemini CLI

5. **Innovation Mandate**
   - Not just faster — more capable
   - System should always move toward capability, not away

### What Was Actually Built (Sessions 1-11)

| Vision | Reality | Gap |
|--------|---------|-----|
| 1,000 income-generating digital products | 1 deployed site (The Best Lawn Care) | 999x away from first milestone |
| End-to-end revenue transaction flow | Not built. Infrastructure exists but not connected. | Revenue path incomplete |
| Three-layer empire | Only Layer 2 exists (internal platform) | Layer 1 and 3 not started |
| Continuous intelligence loop | Started (intelligence-promotions.json exists) | Research runs manually, not automated |
| Multi-framework output (HTML, React, WordPress, Drupal) | HTML+Tailwind only | Multi-tier factory not started |
| Mobile apps, VR, games in portfolio | Not started | Focus remains on websites |
| Studio available as SaaS | Localhost-only, single-user | No multi-tenancy, auth, billing |

### What CHANGED From Original Vision

1. **Template-First Build (Session 10 innovation)**
   - Not in original vision
   - Introduced because CSS sync was buggy
   - Became the most important architectural decision
   - Validates: "innovation is continuous" mandate

2. **Tri-Brain Ecosystem (Session 10)**
   - Original vision was Claude-only
   - Added Gemini for brainstorm, OpenAI for code
   - Proved multi-model routing is more powerful than single brain
   - Validates: "more capable, not faster" mandate

3. **Design Brief + Decisions Memory (Sessions 7-9)**
   - Not in original vision but critical for anti-cookie-cutter
   - Design memory became the core differentiation
   - Validates: preventing "same site, different colors" outcome

4. **Per-Site Repos with Git Flow (Session 6)**
   - Not in original vision (was going to use shared repo)
   - Forced by need for independent versioning/deployment
   - Proved: sites need their own version control

### What's MISSING From Original Vision

1. **Revenue Transaction Flow**
   - PayPal integration: exists but not in Studio
   - GoDaddy domain provisioning: exists but manual
   - Netlify deploy: works but requires technical step
   - **What's needed:** Unified checkout → domain provision → deploy → live URL flow inside Studio UI

2. **Continuous Intelligence Loop (Automated)**
   - Manual research: partially working
   - Gemini research script: not automated
   - Weekly cadence: not scheduled
   - **What's needed:** Cron job, structured findings, promotion workflow, dashboard

3. **Multi-Tier Factory**
   - React/Next.js: not started
   - WordPress: not started
   - Drupal: not started
   - **What's needed:** Output abstraction layer that routes to different generators

4. **Portfolio Growth**
   - 1 deployed site (0.1% of first milestone)
   - **What's needed:** Faster, cheaper site generation. Revenue math (can we build 10 sites/week at $100/mo each?)

5. **Multi-Tenancy / SaaS**
   - Single-user, localhost
   - **What's needed:** Authentication, per-user site limit, billing integration, hosted cloud version

### Known Gaps That Stay in SITE-LEARNINGS (Honest Assessment)

These are real limitations. Not bugs. Not oversights. Working-as-designed limitations that should be addressed before the next phase:

1. **Claude does not aggressively reach for FAMtastic DNA vocabulary.** Infrastructure (fam-hero.css, fam-shapes.css) is in place. But build prompt language needs to be more imperative. Workaround: manually guide Claude with specific asks ("use the 7-layer hero vocabulary").

2. **Client interview has no persistence across sessions.** Interview runs once per site. If user returns later and wants to redo it, they can't. Workaround: manual spec edit.

3. **No approval gate for major design changes.** Full rebuilds can silently change the site radically. Workaround: preview before approving.

4. **restyle intent is dead code.** Should go to handleChatMessage but routes to handlePlanning. Workaround: use "redesign" or "rebuild" instead.

5. **Classifier false positives on common words.** "fix" can trigger bug_fix (suppressing design changes). "add" can trigger stock fill. Workaround: be explicit.

6. **No explicit conversational ack type.** "looks good" still generates HTML. Workaround: say nothing and preview instead.

7. **No template upload mode.** Can't drag-drop a PSD/Figma export. Workaround: hand-code template HTML, upload via template_import.

8. **Multi-page sites need manual spec.json pages array update.** Brief says 5 pages but spec.pages = ["home"]. Workaround: edit spec.json before build.

9. **Business type is always empty.** Stock queries and SEO use it but it's never populated. Workaround: manually set in spec.json.

10. **No analytics configuration UI.** GA4 snippet is injected but no way to set property ID from Studio. Workaround: edit studio-config.json by hand.

### Recommendations for Next Phase

**Immediate (Before Revenue Path):**
1. Implement `runPostProcessing()` refactor (atomic, centralized)
2. Fix restyle routing (line 4757)
3. Add conversational_ack classifier type
4. Wire all studio-config.json settings to actual behavior
5. Manual pages array update → auto-copy from brief

**Short-Term (Revenue Path):**
1. PayPal integration inside Studio (checkout → payment recorded)
2. Domain provisioning trigger (→ GoDaddy API)
3. Auto-deploy after payment (→ Netlify)
4. Client approval flow (email preview link, approve/revise)
5. Invoice + receipts (PDF generation)

**Medium-Term (Growth):**
1. Decompose monolithic server.js (12 modules)
2. Implement automated intelligence loop (cron + Gemini research)
3. Add multi-tier output (React/Next.js as second output)
4. Template library + discovery (pre-built templates, gallery UI)
5. Batch site generation (fam-hub site build-batch)

**Long-Term (SaaS):**
1. Multi-tenancy (auth, per-user site limit, billing)
2. Cloud hosting (deploy Studio to AWS/DigitalOcean)
3. Client-facing access (remove localhost restriction)
4. Admin dashboard (monitor fleet, cost tracking, usage analytics)
5. Marketplace for templates, themes, integrations

---

## Conclusion

FAMtastic Site Studio is a **working, deployed system** that proves the core idea: AI can generate production-quality websites in conversation. One site is live in production. The template-first architecture, slot system, and tri-brain routing are proven.

What's **missing** is not core capability but **scale and transaction closure.** The system can generate sites. It cannot yet generate 1,000 sites, manage revenue from them, or serve them through a SaaS interface.

The **rewrite should not start from scratch.** The template-first architecture, slot system, request classifier, and verification system are solid. The rewrite should:
1. Decompose the monolith into modules
2. Fix the state architecture (centralize state, eliminate silent desync)
3. Build the revenue path (payment → provision → deploy)
4. Automate the intelligence loop

The next 11 sessions should aim for: **100 sites deployed, revenue flowing, and the factory proven at scale.**

---

**End of Context Package**
