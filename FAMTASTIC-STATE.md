# FAMTASTIC-STATE.md — Canonical Project Reference

**Last updated:** 2026-04-16 (Session 13 — Trust Debt Fixes + Surgical Editor + Revenue-First Brief: 53 new tests, ~1,236 cumulative)

---

## What FAMtastic Site Studio Is

FAMtastic Site Studio is a chat-driven website factory that generates production-ready HTML+Tailwind CSS websites from natural language conversation. A user opens a browser-based chat interface, describes the site they want, and the system generates multi-page HTML, provides a live preview, and deploys to Netlify — all without the user writing code or leaving the chat.

**Session 11 additions:** Nine fixes wiring intelligence into the build pipeline. `client_brief` injected into `buildPromptContext()`. FAMtastic DNA auto-copied + linked into every build via head-guardrail. `lib/font-registry.js` (5 vertical-aware font pairings). Interview auto-triggered on new sites. `enhancement_pass` classifier intent with six opt-in passes. `lib/layout-registry.js` (5 layout variants + vertical map). FAMtastic logo mode + `extractMultiPartSvg()`. Worker-queue badge. `fam-hero.css` (7-layer hero composition vocabulary). Hotfix: template-first build path was silently skipping `ensureHeadDependencies()` — fixed.

**Session 12 additions:** Phase 0 — mandatory HTML skeletons force vocabulary fidelity (`HERO_SKELETON_TEMPLATE`, `LOGO_SKELETON_TEMPLATE` in `famtastic-skeletons.js`; 30 tests). Phase 2 — worker queue terminal-status purge, 7-day cleanup, honest handler. Phase 3 — `famtastic-dna.md` auto-update via `updateFamtasticDna()` after every build; intelligence loop closed.

**Session 13 additions (2026-04-16):**
1. **`conversational_ack` intent** — short affirmations ("ok", "looks good", "thanks") now return a zero-cost canned response via `getAckResponse(spec)`. No Claude API call fires. Added `ACK_PATTERNS` regex in `classifyRequest()`; both routing locations updated.
2. **Atomic `spec.json` writes** — `writeSpec()` now writes to `.tmp` then `fs.renameSync()` (POSIX atomic). New site creation path also atomic.
3. **Restyle intent routing fixed** — `restyle` was routing to `handlePlanning()` (dead code branch). Now routes to `handleChatMessage(ws, userMessage, 'restyle', spec)` in both routing locations. Silent no-op → working feature.
4. **`lib/surgical-editor.js`** — DOM-aware surgical editor. `buildStructuralIndex()`, `extractSection()`, `surgicalEdit()`, `trySurgicalEdit()`. Structural index built after every build (Step 7 of `runPostProcessing()`), stored in `spec.structural_index[page]`. Enables ~90% token reduction on content edits when routing is wired.
5. **Revenue-first brief interview** — `q_revenue` question added as second question in client interview. `REVENUE_MODEL_OPTIONS` (7 canonical models). `getRevenueBuildHints(model)` injects `REVENUE ARCHITECTURE` block into every build prompt. `formatQuestion()` passes through `suggestion_chips` and `follow_up_map`.
6. **`fam-hub site deal-memo <tag>`** — generates a rank-and-rent deal memo at `sites/<tag>/deal-memo.md`.

The system is currently single-user and localhost-only, built and operated by Fritz Medine.

---

## Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| AI Engine (Primary) | Anthropic SDK (`@anthropic-ai/sdk`) | All HTML generation, design briefs, session summaries, image prompts. Default model: `claude-sonnet-4-6`. `callSDK()` non-streaming; `sdk.messages.stream()` for streaming. `spawnClaude()` @deprecated — emergency fallback only. |
| AI Engine (Secondary) | OpenAI SDK (`openai@^4`) via CodexAdapter | Chat + code tasks via `gpt-4o`. Multi-turn, streaming, tool calling. Requires `OPENAI_API_KEY`. |
| AI Engine (Tertiary) | Google Generative AI (`@google/generative-ai`) via GeminiAdapter | Brainstorm and research. `gemini-2.5-flash`. Requires `GEMINI_API_KEY`. |
| Brain Adapter Pattern | `BrainInterface` + adapters | Unified interface for Claude/Gemini/OpenAI. History, context headers, model override via `ws.brainModels`. Tool calling is Claude-only. |
| Tool Calling | `lib/studio-tools.js` + `lib/tool-handlers.js` | 5 Anthropic-format tools for Claude: get_site_context, get_component_library, get_research, dispatch_worker, read_file. `MAX_TOOL_DEPTH=3`. read_file sandboxed to SITE_DIR. |
| Client Interview | `lib/client-interview.js` | Pre-build Q&A: quick (6q) / detailed (11q) / skip. Revenue model question (q_revenue) is second question. `REVENUE_MODEL_OPTIONS` + `getRevenueBuildHints()`. `suggestion_chips` in formatted questions. |
| Surgical Editor | `lib/surgical-editor.js` | DOM-aware HTML surgery via cheerio. `buildStructuralIndex()`, `extractSection()`, `surgicalEdit()`, `trySurgicalEdit()`. Pure functions, no side effects. |
| HTML Skeletons | `lib/famtastic-skeletons.js` | `HERO_SKELETON_TEMPLATE` (BEM double-dash vocabulary enforcement), `LOGO_SKELETON_TEMPLATE` (nav logo wiring), `LOGO_NOTE_PAGE` (parallel page logo reference). |
| Build DNA | `famtastic-dna.md` | Auto-updated by `updateFamtasticDna()` after every build. Cross-session build memory injected via CLAUDE.md `@famtastic-dna.md`. |
| Brain Verifier | `lib/brain-verifier.js` | Startup API probes for all 3 APIs + Codex CLI. Results cached, served via `/api/brain-status`. |
| Backend | Node.js + Express 4.21 | HTTP server, REST API, WebSocket. Single file: `site-studio/server.js` (~12,300 lines). |
| Frontend | Single HTML file + Tailwind CDN + CSS/JS files | `site-studio/public/index.html`. VS Code-inspired layout. Brain/Worker split panel. CSS: `public/css/` (8 files). JS: `public/js/`. |
| CSS (generated sites) | Tailwind CSS via CDN + `assets/styles.css` | Zero build step. CSS custom properties from spec colors. STUDIO LAYOUT FOUNDATION block injected by post-processor. |
| Event Bus | Node.js EventEmitter | `site-studio/lib/studio-events.js` singleton with 10 namespaced events. |
| API Telemetry | `site-studio/lib/api-telemetry.js` | Per-call SDK cost tracking. `logAPICall()` writes to `sites/<tag>/sdk-calls.jsonl`. |
| Cost Tracker | `site-studio/lib/api-cost-tracker.js` | `calculateCost(model, inputTokens, outputTokens)`. Rates for claude-sonnet, claude-haiku, gpt-4o, gpt-4o-mini, gemini-2.5-flash. `codex-cli` at $0. |
| Brain Sessions | `site-studio/lib/brain-sessions.js` | `initBrainSessions()` auth probe at startup. `getOrCreateBrainSession()` for persistent multi-turn. `resetSessions()` on site switch. |
| Model Config | `site-studio/lib/model-config.json` | Canonical model registry: claude (provider + models map), gemini (model), openai (model + fallback). |
| Font Registry | `site-studio/lib/font-registry.js` | 5 hand-tuned font pairings + vertical→pairing map. Injected into `briefContext`. |
| Layout Registry | `site-studio/lib/layout-registry.js` | 5 layout variants (`standard`, `centered_hero`, `logo_dominant`, `layered`, `split_screen`) + vertical map. Injected into `briefContext`. |
| Multi-Layer Hero CSS | `site-studio/public/css/fam-hero.css` | 7-layer hero composition vocabulary. Auto-linked by head-guardrail. |
| Worker Queue | `.worker-queue.jsonl` | `dispatch_worker` tool writes task entries. No consumer process. Startup cleanup removes terminal-status and 7d-old entries. Visibility badge in sidebar polled every 15s. |
| Worker Queue Badge | `site-studio/public/js/worker-queue-badge.js` | Polls `/api/worker-queue` every 15s, shows pulsing amber badge when `pending_count > 0`. |
| Context Writer | `site-studio/lib/studio-context-writer.js` | Generates `STUDIO-CONTEXT.md` per site on every studio event. 10 sections. |
| Brain Injector | `site-studio/lib/brain-injector.js` | Per-brain context injection. Claude: `@-include`. Gemini/Codex: sidecar file. `reinject()` on brain switch. |
| Research Registry | `site-studio/lib/research-registry.js` | 4 provider-agnostic research sources. Auto-effectiveness scoring from build metrics. |
| Research Router | `site-studio/lib/research-router.js` | Pinecone-first caching, 90-day staleness, background refresh via `REQUERY_QUEUE`, source selection. |
| WebSocket | `ws` 8.18 | Real-time: chat, build progress, preview reload, brain-changed, brain-status, brain-fallback, set-brain-model. |
| Deploy | Netlify CLI (primary), Cloudflare Wrangler, Vercel CLI | `scripts/site-deploy`. |
| Testing | Node.js scripts | ~1,236 tests across 22 suites. |
| Config | `~/.config/famtastic/studio-config.json` | Model, deploy target/team, email/SMS creds, upload limits, stock photo API keys, `hero_full_width`. |
| CLI | Bash (`scripts/fam-hub`) | Unified dispatcher: `site`, `idea`, `agent`, `admin`, `convo`, `ingest`, `research` subcommands. `site deal-memo` added Session 13. |

---

## End-to-End Pipeline

**Step 1 — Launch.** `fam-hub site new <tag>` starts `server.js`, opens browser, creates `sites/<tag>/`, writes initial `STUDIO-CONTEXT.md`, probes all 3 APIs via `verifyAllAPIs()`. Worker queue cleanup runs on startup.

**Step 2 — (Optional) Client Interview.** `POST /api/interview/start` → Q&A session → `client_brief` stored in spec.json. Quick mode: 6 questions (business → **revenue model** → customer → differentiator → CTA → style). `shouldInterview()` returns false if site already built or interview completed.

**Step 3 — Classification.** Message arrives over WebSocket. Brain routing gate: if `currentBrain !== 'claude'` and non-build intent → `handleBrainstorm()`. Otherwise → `classifyRequest()`. **`conversational_ack` checked first** (zero-cost path). 12 `content_update` patterns next. Default fallback: `content_update`. Plan-gated: `layout_update`, `major_revision`, `build`, `restructure`. `restyle` routes to `handleChatMessage` (fixed Session 13).

**Step 4 — Planning.** `handlePlanning()` → `callSDK()` (3-min timeout, 8192 tokens). Claude returns `DESIGN_BRIEF` block → `spec.json`. Studio UI renders brief card.

**Step 5 — Build (Template-First).** `parallelBuild()`:
1. Template build: `_template.html` — header, nav, footer, shared CSS. Logo SVGs emitted once here.
2. Template extraction: `writeTemplateArtifacts()` → `_partials/_nav.html`, `_partials/_footer.html`, `assets/styles.css`.
3. Parallel page builds (SDK). `LOGO_NOTE_PAGE` injected into parallel spawns (no logo re-emission).
4. Post-build: `logAgentCall()`, emits `BUILD_COMPLETED`. `updateFamtasticDna()` runs.

**Step 6 — Post-build pipeline.** `runPostProcessing()`:
1. `extractAndRegisterSlots()` — scan `data-slot-id`
2. `reapplySlotMappings()` — re-apply saved images
3. `updateBlueprint()` + `injectSeoMeta()`
4. `reconcileSlotMappings()`
5. `applyLogoV()`
6. Layout path split (template-first vs legacy) + `ensureHeadDependencies()`
7. `fixLayoutOverflow()` — STUDIO LAYOUT FOUNDATION
8. `syncContentFieldsFromHtml(pages)`
9. **`surgicalEditor.buildStructuralIndex()`** — build structural index per page → `spec.structural_index[page]` *(Session 13)*

**Step 7 — Build Verification.** `runBuildVerification(writtenPages)` — 5 zero-token file-based checks.

**Step 8 — Images.** "Add images" → `fill_stock_photos` → `scripts/stock-photo` per slot.

**Step 9 — Content Edit (Surgical).** `content_update` intent → `tryDeterministicHandler()` → cheerio replacement → `writeSpec()` (atomic) → `mutations.jsonl`.

**Step 10 — Deploy.** `runDeploy()` → `scripts/site-deploy` → Netlify.

---

## Feature Map

### Core Engine

**Request Classifier** — `classifyRequest(message, spec)`. `conversational_ack` checked first (ACK_PATTERNS regex). 12 `content_update` patterns (highest precedence after ack). Default fallback: `content_update`. Plan-gated intents: `layout_update`, `major_revision`, `build`, `restructure`. `restyle` routes to `handleChatMessage` (not `handlePlanning`).

**Conversational Ack** — `getAckResponse(spec)` returns a contextual next-step suggestion. Zero API calls. Patterns: "ok", "looks good", "thanks", "perfect", "great", "agreed", "love it", etc.

**Brain Routing Gate** — Before classifier: when `currentBrain !== 'claude'` and non-build intent → `handleBrainstorm()`.

**Content Data Layer** — `data-field-id` + `data-field-type` + `data-section-id` in all generated HTML. Surgical replacement via cheerio. `mutations.jsonl` logs every edit.

**DOM-aware Surgical Editor** — `lib/surgical-editor.js`. `buildStructuralIndex()` runs after every build. `extractSection()` + `surgicalEdit()` enable targeted section editing at ~80–150 tokens vs 600–1200 for full page. *(routing into content_update path is Phase 1 continuation work)*

**Tool Calling (Claude-only)** — `ClaudeAdapter._executeBlocking()` handles tool loop. `MAX_TOOL_DEPTH=3`. Tools: `get_site_context`, `get_component_library`, `get_research`, `dispatch_worker`, `read_file`. Gemini/OpenAI never receive tools.

**Client Interview** — `lib/client-interview.js`. Quick (6q) / detailed (11q) / skip. Revenue model question (q_revenue) is second question with `suggestion_chips`. `getRevenueBuildHints(model)` returns architecture instructions per model. `buildClientBrief()` captures `revenue_model` + `revenue_ready: true`. `shouldInterview(spec)` gate.

**Revenue Architecture** — `buildPromptContext()` injects `REVENUE ARCHITECTURE` block for non-stub models. Rank-and-rent builds include: lead capture form, call tracking slot, LocalBusiness schema. Reservations: booking widget slot. E-commerce: product grid, cart slot.

**HTML Skeletons** — `lib/famtastic-skeletons.js`. `HERO_SKELETON_TEMPLATE` enforces BEM double-dash vocabulary (`--bg`, `--fx`, `--character`, `--content`). `LOGO_SKELETON_TEMPLATE` enforces SVG nav logo wiring. `LOGO_NOTE_PAGE` prevents parallel page logo re-emission.

**Build DNA** — `famtastic-dna.md` auto-updated by `updateFamtasticDna()` after every build. Session 12 Phase 3. Injected into every Claude session via `@famtastic-dna.md` in CLAUDE.md.

### Three-Brain Ecosystem

**Brain Verifier** — `lib/brain-verifier.js`. Probes all 3 APIs at startup. `verifyAllAPIs()` runs concurrently. Results cached. `GET /api/brain-status` serves cached state.

**Brain/Worker Panel** — Brains (API-backed, clickable): Claude/Gemini/OpenAI. Workers (CLI-backed, display-only): claude-code/codex-cli/gemini-cli. Per-brain model selector dropdown.

**`ws.brainModels`** — Per-connection model overrides. Updated via `set-brain-model` WS message. `ClaudeAdapter._executeBlocking()` respects override.

### Universal Context System

**`studio-events.js`** — Singleton EventEmitter. 10 events: `session:started`, `site:switched`, `build:started`, `build:completed`, `edit:applied`, `component:inserted`, `deploy:completed`, `brain:switched`, `research:updated`, `mode:changed`.

**`studio-context-writer.js`** — Regenerates `STUDIO-CONTEXT.md` on any event. 10 sections. CONTEXT_CACHE 30s TTL.

**`brain-injector.js`** — Per-brain context injection. `reinject()` on brain switch.

### Research Intelligence System

**`research-registry.js`** — 4 sources (gemini_loop, build_patterns, manual, perplexity). Effectiveness scoring persisted to `.local/research-effectiveness.json`.

**`research-router.js`** — Pinecone-first (configurable threshold, default 0.75), 90-day staleness with background refresh via `REQUERY_QUEUE`.

---

## API Endpoints (Full)

### Core Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/sync-content-fields` | Scan HTML for data-field-id → spec.content[page].fields[] |
| GET | `/api/content-fields/:page` | List all fields for a page |
| POST | `/api/content-field` | Surgical field update (no AI), global cascade |
| POST | `/api/components/export` | Export component with version bump + skill sync |
| GET | `/api/image-suggestions` | Contextual query chips from spec.design_brief |
| POST | `/api/research/trigger` | Create vertical research stub (idempotent) |
| POST | `/api/research/to-brief` | Extract brief text from research file |
| GET | `/api/research/verticals` | 40+ known verticals + per-site researched list |
| POST | `/api/compare/generate-v2` | Codex→Claude fallback with HTML validation |
| GET | `/api/agent/stats` | Aggregated agent-calls.jsonl metrics |
| GET | `/api/agent/routing` | Intent→agent routing guide |
| GET | `/api/intel/report` | Full intelligence report |
| GET | `/api/intel/findings` | Findings only with severity counts |
| POST | `/api/intel/promote` | Promote finding to intelligence-promotions.json |
| POST | `/api/intel/run-research` | Create dated research stub |
| GET | `/api/context` | Return STUDIO-CONTEXT.md contents |
| POST | `/api/context` | Trigger manual context regeneration |
| GET | `/api/brain` | Current brain state |
| POST | `/api/brain` | Set active brain |
| GET | `/api/research/sources` | All research sources |
| GET | `/api/research/effectiveness` | Effectiveness report |
| POST | `/api/research/query` | Query research |
| POST | `/api/research/rate` | Rate a research result |
| GET | `/api/research/seed-status` | Pinecone seed status |
| GET | `/api/research/threshold-analysis` | Threshold calibration |
| GET | `/api/telemetry/sdk-cost-summary` | SDK call cost summary per session |
| GET | `/api/brain-status` | Live API verification state for all 3 brains + Codex |
| GET | `/api/worker-queue` | Current `.worker-queue.jsonl` entries with `pending_count`, `by_worker`, `by_status`, `oldest_pending` |
| POST | `/api/interview/start` | Start or resume client interview (mode: quick/detailed/skip) |
| POST | `/api/interview/answer` | Submit answer, get next question or completion + client_brief |
| GET | `/api/interview/status` | Current interview state snapshot |
| GET | `/api/interview/health` | Interview system health check |
| GET | `/api/brain-status` | Brain verification results |

**Route ordering rule:** Static routes must be declared BEFORE parameterized routes of the same prefix.

---

## Known Gaps

### Open

| Gap | Priority | Detail |
|-----|----------|--------|
| Revenue path (end-to-end) | Tier 1 | Client preview URL + payment (PayPal) + domain provisioning + approval flow. |
| Surgical editor routing not wired | Tier 1 | `lib/surgical-editor.js` is built, structural index is populated, but `content_update` path in `handleChatMessage` still sends full HTML to Claude. Phase 1 continuation: use `extractSection` + `surgicalEdit` when a matching section is found in `spec.structural_index`. |
| Prompt fidelity for FAMtastic vocabulary | Tier 1 | Claude does not consistently reach for `fam-hero__*` vocabulary or multi-part SVG logo on first prompt of fresh build. Infrastructure is in place; prompt language needs to be more imperative. |
| Revenue model suggestion chips not in UI | Tier 2 | `REVENUE_MODEL_OPTIONS` and `suggestion_chips` are exported from `client-interview.js` but the Studio chat UI doesn't render them yet. |
| Worker queue consumer | Tier 2 | `.worker-queue.jsonl` has no process polling it. `dispatch_worker` queues tasks that nothing executes. |
| Detailed interview mode UI | Tier 3 | 10-question detailed mode works via API only — no UI exposure. |
| Brain routing in build path | Tier 2 | Build/content-edit paths use Anthropic SDK (Claude only). Non-Claude brains only work for chat/brainstorm. |
| Intelligence Loop — real Gemini research | Tier 2 | `POST /api/intel/run-research` creates stubs only. `scripts/gemini-cli` not yet wired to populate them. |
| Mission Control / Platform dashboard | Tier 2 | No multi-site management UI beyond CLI. Required before 10-site milestone. |
| Template upload mode | Tier 2 | Uploading pre-built templates for Studio to tweak vs generate from scratch. |
| Pinecone zero-vectors | Tier 3 | All Pinecone vectors use placeholder zero-vectors. Real `text-embedding-3-small` embeddings required. |
| seed-pinecone --vertical flag | Tier 3 | Add `--vertical <name>` to `scripts/seed-pinecone` for per-build auto-seeding. |
| server.js decomposition | Tier 3 | ~12,300 lines. Plan: thin assembler + modules in lib/. Do not split until specific pain demands it. |
| deal-memo geography fallback | Tier 4 | Defaults to `[AREA]` placeholder when interview was skipped. Should pull from `spec.design_brief` as fallback. |

### Closed in Session 13 (2026-04-16)

- **`spec.json` write not atomic** — `writeSpec()` now uses `.tmp` + `renameSync()`. New site creation also atomic.
- **`conversational_ack` missing** — short affirmations no longer trigger Claude API calls.
- **Restyle dead code routing** — `restyle` now routes to `handleChatMessage` in both routing locations.

### Previously Closed

See CHANGELOG.md for full session history.

---

## File Inventory

### Strategic Documents

| File | Purpose |
|------|---------|
| `FAMTASTIC-VISION.md` | North star — empire model, scaling milestones, revenue path |
| `FAMTASTIC-STATE.md` | This file — canonical technical snapshot |
| `FAMTASTIC-SETUP.md` | Disaster recovery — Quick Start, MCP servers, env vars, dependencies |
| `SITE-LEARNINGS.md` | Authoritative technical reference — architecture notes, all sessions |
| `CHANGELOG.md` | Chronological session summaries |
| `famtastic-dna.md` | Auto-updated build knowledge — injected into every Claude session |
| `docs/DEEP-DISCOVERY.md` | Deep research sweep — 12 threads, synthesis, blind spots (2026-04-16) |
| `docs/STUDIO-COMPARISON.md` | V1 vs. industry standard vs. V2 direction across 15 areas |
| `docs/REWRITE-CONTEXT-PACKAGE.md` | Complete architectural analysis Sessions 1–11 |
| `docs/session-next-report.md` | Session 13 phase report |

### Core Application

| File | Lines | Purpose |
|------|-------|---------|
| `site-studio/server.js` | ~12,300 | Main backend. Express + WebSocket. Classifier (with conversational_ack), revenue architecture injection, atomic writeSpec(), restyle routing fixed, structural index in runPostProcessing. |
| `site-studio/public/index.html` | ~7,200 | Single-file frontend. Brain/Worker split panel. 6 canvas tabs. All WS handlers. |
| `site-studio/lib/surgical-editor.js` | ~200 | DOM-aware surgical editor. `buildStructuralIndex()`, `extractSection()`, `surgicalEdit()`, `trySurgicalEdit()`. Pure, no side effects. *(Session 13)* |
| `site-studio/lib/famtastic-skeletons.js` | — | `HERO_SKELETON_TEMPLATE`, `LOGO_SKELETON_TEMPLATE`, `LOGO_NOTE_PAGE`. BEM double-dash vocabulary enforcement. *(Session 12)* |
| `site-studio/lib/client-interview.js` | — | Client interview engine. 6-question quick mode. `REVENUE_MODEL_OPTIONS`, `getRevenueBuildHints()`, `startInterview()`, `recordAnswer()`, `shouldInterview()`. *(Revenue model added Session 13)* |
| `site-studio/lib/brain-verifier.js` | — | Startup API verification for Claude/Gemini/OpenAI/Codex. `verifyAllAPIs()`, `getBrainStatus()`. |
| `site-studio/lib/model-config.json` | — | Canonical model registry: claude, gemini, openai. |
| `site-studio/lib/studio-tools.js` | — | 5 Anthropic-format tools (Claude-only). |
| `site-studio/lib/tool-handlers.js` | — | Tool dispatch + dependency injection + path traversal sandbox. |
| `site-studio/lib/studio-events.js` | — | Singleton EventEmitter + 10 event constants. |
| `site-studio/lib/brain-interface.js` | — | Universal Studio-to-Brain communication. |
| `site-studio/lib/brain-adapter-factory.js` | — | `BrainAdapterFactory.create(brain)` → adapter. |
| `site-studio/lib/adapters/claude-adapter.js` | — | Anthropic SDK. Tool loop with `MAX_TOOL_DEPTH=3`. |
| `site-studio/lib/adapters/gemini-adapter.js` | — | Google Generative AI. |
| `site-studio/lib/adapters/codex-adapter.js` | — | OpenAI SDK. `gpt-4o`. Multi-turn streaming. |
| `site-studio/lib/brain-sessions.js` | — | Auth probe, session management, `resetSessions()`. |
| `site-studio/lib/api-telemetry.js` | — | `logAPICall()`, cost tracking, writes `sdk-calls.jsonl`. |
| `site-studio/lib/api-cost-tracker.js` | — | `calculateCost(model, in, out)`. Rates for all models. |
| `site-studio/lib/studio-context-writer.js` | — | STUDIO-CONTEXT.md generator (event-driven, 10 sections, 30s TTL cache). |
| `site-studio/lib/brain-injector.js` | — | Per-brain context injection. `reinject()` on brain switch. |
| `site-studio/lib/history-formatter.js` | — | Per-brain history format + Claude-based summarization. |
| `site-studio/lib/research-registry.js` | — | 4 research sources + effectiveness scoring. |
| `site-studio/lib/research-router.js` | — | Pinecone-first cache, REQUERY_QUEUE, source selection. |
| `site-studio/lib/font-registry.js` | — | 5 vertical-aware font pairings. |
| `site-studio/lib/layout-registry.js` | — | 5 layout variants + vertical map. |
| `site-studio/public/css/studio-base.css` | — | Resets, layout, typography |
| `site-studio/public/css/studio-panels.css` | — | Three-panel layout, resizers |
| `site-studio/public/css/studio-chat.css` | — | Chat panel, messages, plan cards |
| `site-studio/public/css/studio-sidebar.css` | — | Tabs, mode selector, status bar |
| `site-studio/public/css/studio-modals.css` | — | Settings, upload, all modal dialogs |
| `site-studio/public/css/studio-terminal.css` | — | Terminal panel and toolbar |
| `site-studio/public/css/studio-canvas.css` | — | Canvas panes |
| `site-studio/public/css/studio-brain-selector.css` | — | Brain/Worker panel, provider colors |
| `site-studio/public/js/brain-selector.js` | — | `BrainSelector` IIFE: `init(ws)`, `select()`, `setModel()`, status polling |
| `site-studio/public/js/worker-queue-badge.js` | — | Polls `/api/worker-queue` every 15s, pulsing amber badge |
| `mcp-server/server.js` | 343 | MCP server. 4 tools via stdio JSON-RPC. |

### Test Suites

| Suite | Tests | Phase |
|-------|-------|-------|
| `tests/session13-phase0-tests.js` | 14 | conversational_ack, atomic writes, restyle routing *(Session 13)* |
| `tests/session13-phase1-tests.js` | 21 | surgical-editor.js module + server integration *(Session 13)* |
| `tests/session13-phase2-tests.js` | 18 | Revenue model interview, getRevenueBuildHints, deal-memo *(Session 13)* |
| `tests/session12-phase0-tests.js` | 30 | HTML skeletons vocabulary enforcement *(Session 12)* |
| `tests/session11-fix4-tests.js` | — | Interview auto-trigger |
| `tests/session11-fix5-tests.js` | — | Enhancement pass intent |
| `tests/session11-fix6-tests.js` | 56/57 | Layout registry (1 pre-existing export gap) |
| `tests/session11-fix7-tests.js` | — | Multi-part SVG logo extraction |
| `tests/session11-fix8-tests.js` | 31 | Worker queue badge + endpoint |
| `tests/session11-fix9-tests.js` | 45 | fam-hero.css vocabulary |
| `tests/session10-phase0-tests.js` | 33 | Brain verifier, CodexAdapter SDK, model-config |
| `tests/session10-phase1-tests.js` | 12 | Brain/Worker UI, brain routing gate |
| `tests/session10-phase2-tests.js` | 31 | Tool calling foundation |
| `tests/session10-phase3-tests.js` | 48 | Client interview system |
| `tests/phase0-content-layer-tests.js` | 69 | Classifier, data-field-id, spec.content |
| `tests/phase1-component-skills-tests.js` | 64 | Component export/version, SKILL.md |
| `tests/phase2-ui-shell-tests.js` | 61 | content-field endpoint, global cascade |
| `tests/phase3-multi-agent-tests.js` | 75 | Agent telemetry, validation, routing |
| `tests/phase4-image-research-tests.js` | 61 | image-suggestions, research |
| `tests/phase5-intelligence-loop-tests.js` | 71 | Intel report, findings, promote |
| Sessions 7–9 | 709 | Full session suite history |

**Total: ~1,236 tests across 22 suites.**

### Key Functions

| Function | File | Purpose |
|----------|------|---------|
| `classifyRequest()` | server.js | `conversational_ack` first; 12 content_update patterns; default content_update |
| `getAckResponse()` | server.js | Zero-cost conversational ack response *(Session 13)* |
| `writeSpec()` | server.js | Atomic spec.json write via .tmp + renameSync *(Session 13)* |
| `routeToHandler()` | server.js | Intent dispatch; restyle → handleChatMessage *(Session 13)* |
| `runPostProcessing()` | server.js | 9-step pipeline; Step 9 = structural index *(Session 13)* |
| `buildStructuralIndex()` | lib/surgical-editor.js | Scans DOM for sections/fields/slots → index *(Session 13)* |
| `extractSection()` | lib/surgical-editor.js | Returns targeted node HTML (~80-150 tokens) *(Session 13)* |
| `surgicalEdit()` | lib/surgical-editor.js | Cheerio DOM replacement, single-node *(Session 13)* |
| `getRevenueBuildHints()` | lib/client-interview.js | Revenue model → build instructions *(Session 13)* |
| `buildClientBrief()` | lib/client-interview.js | Captures revenue_model + revenue_ready *(Session 13)* |
| `handleChatMessage()` | server.js | Primary SDK streaming handler. Brain routing gate checks currentBrain first. |
| `handleBrainstorm()` | server.js | Routes to selected brain via `routeToBrainForBrainstorm()` |
| `parallelBuild()` | server.js | SDK parallel page builds + subprocess fallback |
| `updateFamtasticDna()` | server.js | Auto-updates famtastic-dna.md after every build *(Session 12)* |
| `verifyAllAPIs()` | lib/brain-verifier.js | Concurrent probe of all 3 APIs at startup |
| `startInterview()` | lib/client-interview.js | Initialize Q&A state (quick/detailed/skip) |
| `recordAnswer()` | lib/client-interview.js | Validate, record, advance state machine |
| `shouldInterview()` | lib/client-interview.js | Gate: false if completed/built/deployed/null spec |
| `callSDK()` | server.js | Non-streaming SDK call with AbortController timeout |
| `syncContentFieldsFromHtml()` | server.js | Scan data-field-id → spec.content[page].fields[] |
| `tryDeterministicHandler()` | server.js | Surgical content edits, no AI, logs agent=none |
| `generateIntelReport()` | server.js | Read log data → findings[] + summary |

### Scripts

| File | Purpose |
|------|---------|
| `scripts/fam-hub` | Unified CLI: site (incl. `deal-memo`), idea, agent, admin, convo, ingest, research |
| `scripts/gemini-cli` | Gemini API CLI (Node.js, gemini-2.5-flash) |
| `scripts/orchestrator-site` | Batch site generation |
| `scripts/stock-photo` | 3-provider stock photo downloader |
| `scripts/site-deploy` | Deploy to Netlify/Cloudflare/Vercel |
| `scripts/asset-generate` | SVG asset pipeline |
| `scripts/google-media-generate` | Imagen 4 / Veo 2 media generation |
| `scripts/seed-pinecone` | Seed Pinecone index from site specs |
| `scripts/update-setup-doc` | Auto-update FAMTASTIC-SETUP.md |
| `scripts/fam-convo-*` | Multi-agent conversation pipeline (compose, reconcile, ingest, promote, tag) |
| `scripts/intelligence-loop` | Per-site intelligence reports, writes `~/PENDING-REVIEW.md` |

### Per-Site Files

| File | Purpose |
|------|---------|
| `sites/<tag>/STUDIO-CONTEXT.md` | Universal context — regenerated on every studio event |
| `sites/<tag>/spec.json` | Design brief, decisions, content fields, media specs, deploy info, `client_brief`, `interview_state`, `structural_index` |
| `sites/<tag>/agent-calls.jsonl` | Per-call agent telemetry |
| `sites/<tag>/sdk-calls.jsonl` | Per-call Anthropic SDK cost log |
| `sites/<tag>/mutations.jsonl` | Field-level edit log |
| `sites/<tag>/intelligence-promotions.json` | Promoted intelligence findings |
| `sites/<tag>/deal-memo.md` | Rank-and-rent deal memo (generated by `fam-hub site deal-memo`) *(Session 13)* |
| `.worker-queue.jsonl` | Worker dispatch queue (root of repo, shared across all sites) |
| `.local/research-effectiveness.json` | Research source effectiveness scores |

### OpenWolf Files

| File | Git | Purpose |
|------|-----|---------|
| `.wolf/anatomy.md` | tracked | File index with token estimates |
| `.wolf/cerebrum.md` | tracked | Patterns, preferences, do-not-repeat rules |
| `.wolf/buglog.json` | tracked | Bug tracking across sessions |
| `.wolf/memory.md` | ignored | Per-session action log (ephemeral) |

---

## Developer Environment

### Runtime

- Server starts with `source ~/.zshrc && node site-studio/server.js` (keys must be in env)
- Runtime site variable is `TAG` (mutable) — NOT `process.env.SITE_TAG` (startup snapshot, goes stale)
- Express route ordering: static routes BEFORE parameterized routes of same prefix
- Brain routing gate fires before classifier — check `currentBrain` before any intent logic
- `spawnClaude()` runs from `os.tmpdir()` — never set cwd to HUB_ROOT (CLAUDE.md hijacks subprocess)

### Security Constraints

- `read_file` tool: `path.resolve + startsWith(siteRoot + sep)` check — mandatory
- `writeSpec()`: atomic write via `.tmp` + `renameSync` — never `writeFileSync` directly to SPEC_FILE()
- Never concatenate user input into shell strings
- Pre-tool hook blocks shell-injection-prone child process APIs

### Standing Rules (Do Not Repeat)

- `TAG` not `process.env.SITE_TAG` inside any route handler
- `library.json` is `{ version, components[], last_updated }` — always extract `.components`
- Static Express routes before parameterized routes of same prefix
- Every HTML write path through `runPostProcessing()` — no exceptions
- BEM double-dash vocabulary (`--bg` not `-bg`) — enforced by skeletons and tests
- Inline styles prohibited in generated site HTML
- Parallel page spawns must NOT emit logo SVGs — only the template call emits them

---

## Deployed Sites

| Site | URL | Pages | Deploy Date |
|------|-----|-------|-------------|
| The Best Lawn Care | https://the-best-lawn-care.netlify.app | 7 | 2026-03-20 |
| Auntie Gale's Garage Sales | https://effortless-tiramisu-ed9345.netlify.app | 5 | 2026-04-08 |
| Drop The Beat Entertainment | built, not deployed | 3 | 2026-04-10 |

---

## What's Next

> Full strategic vision lives in `FAMTASTIC-VISION.md`.

### Tier 1 — Immediate (Before Scaling)

1. **Wire surgical editor into `content_update` path** — use `spec.structural_index` + `extractSection()` to send only targeted section to Claude. Closes the 90% token reduction gap.
2. **FAMtastic.com launch** — build and deploy the FAMtastic brand site using Studio (dogfood). Pre-loaded brief ready in `docs/session-next-report.md` Phase 3 spec.
3. **Revenue model suggestion chips in Studio UI** — render `suggestion_chips` from `q_revenue` as clickable chips in the chat interview panel.

### Tier 2 — Revenue Path

1. PayPal integration inside Studio (checkout → payment recorded)
2. Domain provisioning trigger (→ GoDaddy API)
3. Auto-deploy after payment (→ Netlify)
4. Client approval flow (email preview link, approve/revise)

### Tier 3 — Scale Infrastructure

1. Mission Control dashboard (all sites, health, revenue, decay signals)
2. Automated intelligence loop (cron + Gemini research, not manual)
3. Per-site Mem0+Kuzu memory store (compound knowledge across builds)
4. `fam-hub admin git-status --all` (git hygiene across all site repos)

### Tier 4 — Factory Expansion

React+Next.js → WordPress → Drupal. After revenue path proven.
