# FAMTASTIC-STATE.md — Canonical Project Reference

**Last updated:** 2026-04-10 (Session 10 — OpenAI SDK, Brain Verifier, Tool Calling, Client Interview, Site #6, 1,183 cumulative tests)

---

## What FAMtastic Site Studio Is

FAMtastic Site Studio is a chat-driven website factory that generates production-ready HTML+Tailwind CSS websites from natural language conversation. A user opens a browser-based chat interface, describes the site they want, and the system generates multi-page HTML, provides a live preview, and deploys to Netlify — all without the user writing code or leaving the chat.

**Session 10 additions:** All three AI APIs verified live at startup (Claude, Gemini, OpenAI). CodexAdapter migrated from CLI subprocess to OpenAI SDK. Tool calling added to Claude (5 tools, `MAX_TOOL_DEPTH=3`). Client interview system captures brand intent before first build. Brain/Worker split UI with per-brain model selector. Site #6 built (Drop The Beat Entertainment).

The system is currently single-user and localhost-only, built and operated by Fritz Medine.

---

## Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| AI Engine (Primary) | Anthropic SDK (`@anthropic-ai/sdk`) | All HTML generation, design briefs, session summaries, image prompts. Default model: `claude-sonnet-4-6`. `callSDK()` non-streaming; `sdk.messages.stream()` for streaming. `spawnClaude()` @deprecated — emergency fallback only. |
| AI Engine (Secondary) | OpenAI SDK (`openai@^4`) via CodexAdapter | Chat + code tasks via `gpt-4o`. Multi-turn, streaming, tool calling. Requires `OPENAI_API_KEY`. |
| AI Engine (Tertiary) | Google Generative AI (`@google/generative-ai`) via GeminiAdapter | Brainstorm and research. `gemini-2.5-flash`. Requires `GEMINI_API_KEY`. |
| Brain Adapter Pattern | `BrainInterface` + adapters | Unified interface for Claude/Gemini/OpenAI. History, context headers, model override via `ws.brainModels`. Tool calling is Claude-only (Session 10 decision). |
| Tool Calling | `lib/studio-tools.js` + `lib/tool-handlers.js` | 5 Anthropic-format tools for Claude: get_site_context, get_component_library, get_research, dispatch_worker, read_file. `MAX_TOOL_DEPTH=3`. read_file sandboxed to SITE_DIR. |
| Client Interview | `lib/client-interview.js` | Pre-build Q&A: quick (5q) / detailed (10q) / skip. Persists `interview_state` → `client_brief` to spec.json. |
| Brain Verifier | `lib/brain-verifier.js` | Startup API probes for all 3 APIs + Codex CLI. Results cached, served via `/api/brain-status`. |
| Backend | Node.js + Express 4.21 | HTTP server, REST API, WebSocket. Single file: `site-studio/server.js` (~12,200 lines). |
| Frontend | Single HTML file + Tailwind CDN + CSS/JS files | `site-studio/public/index.html`. VS Code-inspired layout. Brain/Worker split panel. CSS: `public/css/` (8 files). JS: `public/js/` (brain-selector.js + others). |
| CSS (generated sites) | Tailwind CSS via CDN + `assets/styles.css` | Zero build step. CSS custom properties from spec colors. STUDIO LAYOUT FOUNDATION block injected by post-processor. |
| Event Bus | Node.js EventEmitter | `site-studio/lib/studio-events.js` singleton with 10 namespaced events. Drives STUDIO-CONTEXT.md regeneration. |
| API Telemetry | `site-studio/lib/api-telemetry.js` | Per-call SDK cost tracking. `logAPICall()` writes to `sites/<tag>/sdk-calls.jsonl`. |
| Cost Tracker | `site-studio/lib/api-cost-tracker.js` | `calculateCost(model, inputTokens, outputTokens)`. Rates for claude-sonnet, claude-haiku, gpt-4o, gpt-4o-mini, gemini-2.5-flash. `codex-cli` at $0. |
| Brain Sessions | `site-studio/lib/brain-sessions.js` | `initBrainSessions()` auth probe at startup. `getOrCreateBrainSession()` for persistent multi-turn. `resetSessions()` on site switch. |
| Model Config | `site-studio/lib/model-config.json` | Canonical model registry: claude (provider + models map), gemini (model), openai (model + fallback). |
| Worker Queue | `.worker-queue.jsonl` | `dispatch_worker` tool writes task entries. No consumer yet (Session 11). |
| Context Writer | `site-studio/lib/studio-context-writer.js` | Generates `STUDIO-CONTEXT.md` per site on every studio event. 10 sections. |
| Brain Injector | `site-studio/lib/brain-injector.js` | Per-brain context injection. Claude: `@-include`. Gemini/Codex: sidecar file. `reinject()` on brain switch. |
| Research Registry | `site-studio/lib/research-registry.js` | 4 provider-agnostic research sources. Auto-effectiveness scoring from build metrics. |
| Research Router | `site-studio/lib/research-router.js` | Pinecone-first caching, 90-day staleness, background refresh via `REQUERY_QUEUE`, source selection. |
| WebSocket | `ws` 8.18 | Real-time: chat, build progress, preview reload, brain-changed, brain-status, brain-fallback, set-brain-model. |
| Deploy | Netlify CLI (primary), Cloudflare Wrangler, Vercel CLI | `scripts/site-deploy`. |
| Testing | Node.js scripts | 1,183 tests across 19 suites. |
| Config | `~/.config/famtastic/studio-config.json` | Model, deploy target/team, email/SMS creds, upload limits, stock photo API keys, `hero_full_width`. |
| CLI | Bash (`scripts/fam-hub`) | Unified dispatcher: `site`, `idea`, `agent`, `admin`, `convo`, `ingest`, `research` subcommands. |

---

## End-to-End Pipeline

**Step 1 — Launch.** `fam-hub site new <tag>` starts `server.js`, opens browser, creates `sites/<tag>/`, writes initial `STUDIO-CONTEXT.md`, probes all 3 APIs via `verifyAllAPIs()`.

**Step 2 — (Optional) Client Interview.** `POST /api/interview/start` → Q&A session → `client_brief` stored in spec.json. Skippable. `shouldInterview()` returns false if site already built or interview completed.

**Step 3 — Classification.** Message arrives over WebSocket. Brain routing gate: if `currentBrain !== 'claude'` and non-build intent → `handleBrainstorm()`. Otherwise → `classifyRequest()`. 12 `content_update` patterns checked first. Default fallback: `content_update`. Plan-gated: `layout_update`, `major_revision`, `restyle`, `build`, `restructure`.

**Step 4 — Planning.** `handlePlanning()` → `callSDK()` (3-min timeout, 8192 tokens). Claude returns `DESIGN_BRIEF` block → `spec.json`. Studio UI renders brief card: Build From Brief / Edit Brief / Skip to Build.

**Step 5 — Build (Template-First).** `parallelBuild()`:
1. Template build: `_template.html` — header, nav, footer, shared CSS.
2. Template extraction: `writeTemplateArtifacts()` → `_partials/_nav.html`, `_partials/_footer.html`, `assets/styles.css`.
3. Parallel page builds (SDK) or sequential subprocess fallback when `ANTHROPIC_API_KEY` absent.
4. Post-build: `logAgentCall()`, emits `BUILD_COMPLETED`.

**Step 6 — Post-build pipeline.** `runPostProcessing()`:
1. `extractAndRegisterSlots()` — scan `data-slot-id`
2. `reapplySlotMappings()` — re-apply saved images
3. `updateBlueprint()` + `injectSeoMeta()`
4. `reconcileSlotMappings()`
5. `applyLogoV()`
6. Layout path split (template-first vs legacy)
7. `fixLayoutOverflow()` — STUDIO LAYOUT FOUNDATION
8. `syncContentFieldsFromHtml(pages)`

**Step 7 — Build Verification.** `runBuildVerification(writtenPages)` — 5 zero-token file-based checks.

**Step 8 — Images.** "Add images" → `fill_stock_photos` → `scripts/stock-photo` per slot.

**Step 9 — Content Edit (Surgical).** `content_update` intent → `tryDeterministicHandler()` → cheerio replacement → `writeSpec()` → `mutations.jsonl`.

**Step 10 — Deploy.** `runDeploy()` → `scripts/site-deploy` → Netlify.

---

## Feature Map

### Core Engine

**Request Classifier** — `classifyRequest(message, spec)`. 12 `content_update` patterns (highest precedence). Default fallback: `content_update`. Plan-gated: `layout_update`, `major_revision`, `restyle`, `build`, `restructure`.

**Brain Routing Gate** — Before classifier: when `currentBrain !== 'claude'` and non-build intent → `handleBrainstorm()` which routes to the selected brain. Fixes the "asked Gemini, got Claude" bug.

**Content Data Layer** — `data-field-id` + `data-field-type` + `data-section-id` in all generated HTML. Surgical replacement via cheerio. `mutations.jsonl` logs every edit.

**Tool Calling (Claude-only)** — `ClaudeAdapter._executeBlocking()` handles `stop_reason === 'tool_use'` with recursive tool loop. `MAX_TOOL_DEPTH=3`. Tools: `get_site_context`, `get_component_library`, `get_research`, `dispatch_worker`, `read_file`. Gemini/OpenAI never receive tools.

**Client Interview** — `lib/client-interview.js`. Quick (5q) / detailed (10q) / skip. State machine: strict question ordering. Persists to `spec.json`. `shouldInterview(spec)` gate. 3 API endpoints.

**Component Skills System** — `.claude/skills/components/<type>/SKILL.md` auto-created/updated on export. Version tracking.

**Multi-Agent Pipeline** — `logAgentCall()` writes to `agent-calls.jsonl`. `validateAgentHtml()` scores 0–100. `POST /api/compare/generate-v2` Codex→Claude fallback.

**Intelligence Loop** — `generateIntelReport()` reads log data → `findings[]` with category/severity/title/recommendation.

### Three-Brain Ecosystem (Session 10)

**Brain Verifier** — `lib/brain-verifier.js`. Probes all 3 APIs at startup. `verifyAllAPIs()` runs Claude/Gemini/OpenAI probes concurrently. Results cached. `GET /api/brain-status` serves cached state.

**Brain/Worker Panel** — Two zones in sidebar:
- **Brains** (API-backed, clickable): Claude / Gemini / OpenAI with provider colors (purple/blue/green). Per-brain model selector dropdown.
- **Workers** (CLI-backed, display-only): claude-code / codex-cli / gemini-cli as `<span>` pills.

**`ws.brainModels`** — Per-connection model overrides `{ claude, gemini, openai }`. Updated via `set-brain-model` WS message. `ClaudeAdapter._executeBlocking()` respects `ws.brainModels.claude` override.

**`lib/model-config.json`** — Canonical model registry. `claude.models.site_generation: 'claude-sonnet-4-6'`, `gemini.model: 'gemini-2.5-flash'`, `openai.model: 'gpt-4o'`.

### Universal Context System

**`studio-events.js`** — Singleton EventEmitter. 10 events: `session:started`, `site:switched`, `build:started`, `build:completed`, `edit:applied`, `component:inserted`, `deploy:completed`, `brain:switched`, `research:updated`, `mode:changed`.

**`studio-context-writer.js`** — Regenerates `STUDIO-CONTEXT.md` on any event. 10 sections including all-pages inventory.

**`brain-injector.js`** — Claude: `@-include` block. Gemini/Codex: sidecar file. `reinject()` on brain switch.

### Research Intelligence System

**`research-registry.js`** — 4 sources (gemini_loop, build_patterns, manual, perplexity). Effectiveness scoring persisted to `.local/research-effectiveness.json`.

**`research-router.js`** — Pinecone-first (configurable threshold, default 0.75), 90-day staleness with background refresh via `REQUERY_QUEUE` (single-worker, Set deduplication), text-based `upsertRecords()`.

---

## API Endpoints (Full)

### v3 Engine Endpoints

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

### Session 7 Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/context` | Return STUDIO-CONTEXT.md contents |
| POST | `/api/context` | Trigger manual context regeneration |
| GET | `/api/brain` | Current brain state |
| POST | `/api/brain` | Set active brain |
| GET | `/api/research/sources` | All research sources |
| GET | `/api/research/effectiveness` | Effectiveness report |
| POST | `/api/research/query` | Query research |
| POST | `/api/research/rate` | Rate a research result |

### Session 8 Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/research/seed-status` | Pinecone seed status |
| GET | `/api/research/threshold-analysis` | Threshold calibration |

### Session 9 Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/telemetry/sdk-cost-summary` | SDK call cost summary per session |

### Session 10 Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/brain-status` | Live API verification state for all 3 brains + Codex |
| GET | `/api/worker-queue` | Current `.worker-queue.jsonl` entries |
| POST | `/api/interview/start` | Start or resume client interview (mode: quick/detailed/skip) |
| POST | `/api/interview/answer` | Submit answer, get next question or completion + client_brief |
| GET | `/api/interview/status` | Current interview state snapshot |

**Route ordering rule:** Static routes must be declared BEFORE parameterized routes of the same prefix. Specifically: `/api/research/sources`, `/api/research/verticals`, `/api/research/effectiveness`, `/api/research/seed-status`, `/api/research/threshold-analysis` must all appear before `/api/research/:filename`. Same for `/api/worker-queue` before any parameterized route.

---

## Known Gaps

### Open

| Gap | Priority | Detail |
|-----|----------|--------|
| Revenue path (end-to-end) | Tier 1 | Client preview URL + payment (PayPal) + domain provisioning + approval flow. Studio runs on localhost — bridge to real product. |
| `client_brief` injection into build prompts | Tier 2 | Interview captures brief but it's not yet injected into planning or build prompts. Session 11. |
| Worker queue consumer | Tier 2 | `.worker-queue.jsonl` has no process polling it. `dispatch_worker` tool queues tasks but nothing executes them. Session 11. |
| Interview auto-trigger on `fam-hub site new` | Tier 2 | Interview module exists and works via API, but CLI doesn't prompt for interview on site creation. |
| Detailed interview mode UI | Tier 3 | 10-question detailed mode works via API only — no UI exposure. |
| Brain routing in build path | Tier 2 | Build/content-edit paths use Anthropic SDK (Claude only). Non-Claude brains only work for chat/brainstorm. |
| initBrainSessions() probe is blocking | Tier 3 | Claude auth probe at startup adds ~2–5s. Should fire-and-forget. |
| Intelligence Loop — real Gemini research | Tier 2 | `POST /api/intel/run-research` creates stubs only. `scripts/gemini-cli` not yet wired to populate them. |
| Platform dashboard | Tier 2 | No multi-site management UI beyond CLI. Required before 10-site milestone. |
| Template upload mode | Tier 2 | Uploading pre-built templates for Studio to tweak vs generate from scratch. |
| Connect button UI not wired | Tier 3 | `needs-auth` status not surfaced in brain selector Connect button. |
| Pinecone zero-vectors | Tier 3 | All Pinecone vectors use placeholder zero-vectors. Real `text-embedding-3-small` embeddings required for semantic similarity. |
| seed-pinecone --vertical flag | Tier 3 | Add `--vertical <name>` to `scripts/seed-pinecone` for per-build auto-seeding. |
| spec.json write not atomic | Tier 3 | Uses `fs.writeFileSync()` directly — no `.tmp` + rename. |
| server.js decomposition | Tier 3 | ~12,200 lines. Plan: thin assembler + modules in lib/. |
| Brainstorm recommendation chips | Tier 4 | Cherry-picking individual brainstorm suggestions not supported. |

### Closed This Session (2026-04-10 — Session 10)

- **Codex CLI non-functional** — `CodexAdapter` fully rewrote from CLI subprocess to OpenAI SDK (`gpt-4o`). Multi-turn, streaming, tool calling enabled.
- **CS9 brainstorm routing still subprocess** — Brain routing gate added: non-Claude brains now route to `handleBrainstorm()` for all non-build chat messages.
- **GeminiAdapter key validation weak** — `brain-verifier.js` makes live API probe at startup; bad key caught immediately.
- **Brain routing not extended to chat** — routing gate checks `currentBrain` before classifier for all non-build messages.
- **No startup API health check** — `verifyAllAPIs()` now called at server start; `GET /api/brain-status` exposes results.
- **No model-per-brain selection** — `ws.brainModels` per-connection state + per-brain model selector dropdown + `set-brain-model` WS handler.

### Previously Closed

See CHANGELOG.md for sessions prior to 2026-04-10.

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

### Core Application

| File | Lines | Purpose |
|------|-------|---------|
| `site-studio/server.js` | ~12,200 | Main backend. Express + WebSocket. Classifier, content layer, build, brain routing, tool calling, interview endpoints, universal context, research intelligence. |
| `site-studio/public/index.html` | ~7,200 | Single-file frontend. Brain/Worker split panel. 6 canvas tabs. All WS handlers. |
| `site-studio/lib/brain-verifier.js` | — | Startup API verification for Claude/Gemini/OpenAI/Codex. `verifyAllAPIs()`, `getBrainStatus()`. |
| `site-studio/lib/model-config.json` | — | Canonical model registry: claude, gemini, openai. |
| `site-studio/lib/studio-tools.js` | — | 5 Anthropic-format tools (Claude-only): get_site_context, get_component_library, get_research, dispatch_worker, read_file. |
| `site-studio/lib/tool-handlers.js` | — | Tool dispatch + dependency injection + path traversal sandbox. `initToolHandlers()`, `handleToolCall()`. |
| `site-studio/lib/client-interview.js` | — | Client interview engine. `startInterview()`, `recordAnswer()`, `getCurrentQuestion()`, `shouldInterview()`. |
| `site-studio/lib/studio-events.js` | — | Singleton EventEmitter + 10 event constants. |
| `site-studio/lib/brain-interface.js` | — | Universal Studio-to-Brain communication. Context headers, history, model override via `ws.brainModels`, tools Claude-only. |
| `site-studio/lib/brain-adapter-factory.js` | — | `BrainAdapterFactory.create(brain)` → adapter. claude→ClaudeAdapter, gemini→GeminiAdapter, openai→CodexAdapter. |
| `site-studio/lib/adapters/claude-adapter.js` | — | Anthropic SDK. Tool loop with `MAX_TOOL_DEPTH=3`. `execute()` + `executeStreaming()`. ws through params only. |
| `site-studio/lib/adapters/gemini-adapter.js` | — | Google Generative AI. `startChat({history})`, `sendMessageStream()`. |
| `site-studio/lib/adapters/codex-adapter.js` | — | OpenAI SDK. `gpt-4o`. messages array multi-turn. Real streaming with `include_usage`. |
| `site-studio/lib/brain-sessions.js` | — | `initBrainSessions()` auth probe, `getOrCreateBrainSession()`, `resetSessions()`. |
| `site-studio/lib/api-telemetry.js` | — | `logAPICall()`, `calculateCost()`, `getSessionSummary()`. Writes `sdk-calls.jsonl`. |
| `site-studio/lib/api-cost-tracker.js` | — | `logAPICall(provider, model, usage)`, `calculateCost(model, in, out)`. Rates for claude/gpt-4o/gpt-4o-mini/gemini/codex-cli. |
| `site-studio/lib/studio-context-writer.js` | — | STUDIO-CONTEXT.md generator (event-driven, 10 sections). CONTEXT_CACHE 30s TTL. |
| `site-studio/lib/brain-injector.js` | — | Per-brain context injection. `reinject()` on brain switch. |
| `site-studio/lib/history-formatter.js` | — | Per-brain history format functions + Claude-based summarization. |
| `site-studio/lib/research-registry.js` | — | 4 research sources + effectiveness scoring. |
| `site-studio/lib/research-router.js` | — | Pinecone-first cache, source selection, REQUERY_QUEUE. |
| `site-studio/public/css/studio-base.css` | — | Resets, layout, typography |
| `site-studio/public/css/studio-panels.css` | — | Three-panel layout, resizers |
| `site-studio/public/css/studio-chat.css` | — | Chat panel, messages, plan cards |
| `site-studio/public/css/studio-sidebar.css` | — | Tabs, mode selector, status bar |
| `site-studio/public/css/studio-modals.css` | — | Settings, upload, all modal dialogs |
| `site-studio/public/css/studio-terminal.css` | — | Terminal panel and toolbar |
| `site-studio/public/css/studio-canvas.css` | — | Canvas panes: editable view, images, research, compare, intel |
| `site-studio/public/css/studio-brain-selector.css` | — | Brain/Worker panel, provider colors, model selector, worker pills |
| `site-studio/public/js/brain-selector.js` | — | `BrainSelector` IIFE: `init(ws)`, `select()`, `setModel()`, status polling |
| `mcp-server/server.js` | 343 | MCP server. 4 tools via stdio JSON-RPC. |

### Test Suites

**v3 Engine (401 tests):**

| File | Tests | Phase |
|------|-------|-------|
| `tests/phase0-content-layer-tests.js` | 69 | Classifier, data-field-id, spec.content, mutations.jsonl |
| `tests/phase1-component-skills-tests.js` | 64 | Component export/version, SKILL.md, CSS portability |
| `tests/phase2-ui-shell-tests.js` | 61 | content-field endpoint, global cascade, mutation log |
| `tests/phase3-multi-agent-tests.js` | 75 | logAgentCall, validateAgentHtml, agent stats, routing |
| `tests/phase4-image-research-tests.js` | 61 | image-suggestions, research trigger/to-brief/verticals |
| `tests/phase5-intelligence-loop-tests.js` | 71 | Intel report, findings, promote, run-research |

**Session 7 (328 tests):**

| File | Tests | Phase |
|------|-------|-------|
| `tests/session7-phase0-tests.js` | 66 | Multi-agent skeleton fixes |
| `tests/session7-phase1-tests.js` | 75 | Universal Context File system |
| `tests/session7-phase2-tests.js` | 62 | Brain Router UI |
| `tests/session7-phase3-tests.js` | 49 | Studio Config File |
| `tests/session7-phase4-tests.js` | 76 | Research Intelligence System |

**Session 8 (155 tests):**

| File | Tests | Phase |
|------|-------|-------|
| `tests/session8-phase0-tests.js` | 75 | cj-* → fam-convo-* rename + deprecation shims |
| `tests/session8-phase1-tests.js` | 31 | Research calibration (C1–C7) |
| `tests/session8-phase2-tests.js` | 28 | Session 7 known gaps (G1–G7) |
| `tests/session8-phase3-tests.js` | 21 | spawnClaude migration map |

**Session 8 Addendum (54 tests):**

| File | Tests | Coverage |
|------|-------|----------|
| `tests/session8-addendum-tests.js` | 54 | Embeddings order, REQUERY_QUEUE, check-tools rename, conversation tagging |

**Session 9 (174 tests):**

| File | Tests | Coverage |
|------|-------|----------|
| `tests/session9-phase0-tests.js` | 40 | Migration map defect fixes (M1–M7) |
| `tests/session9-phase1-tests.js` | 60 | Brain Adapter Pattern, adapters, brain-sessions, api-telemetry |
| `tests/session9-phase2-tests.js` | 39 | CS1–CS8 SDK migrations, sdk-cost-summary |
| `tests/session9-phase3-tests.js` | 35 | spawnClaude retirement, @deprecated, final migration statuses |

**Session 9 Addendum (47 tests):**

| File | Tests | Coverage |
|------|-------|----------|
| `tests/session9-addendum-tests.js` | 47 | Per-WS state, context header live reads, api-cost-tracker, adapter interface consistency |

**Session 10 (124 tests):**

| File | Tests | Coverage |
|------|-------|----------|
| `tests/session10-phase0-tests.js` | 33 | brain-verifier exports, API verification, CodexAdapter SDK, model-config, api-cost-tracker OpenAI rates |
| `tests/session10-phase1-tests.js` | 12 | Brain/Worker UI HTML, CSS, brain routing gate, model selector, ws.brainModels |
| `tests/session10-phase2-tests.js` | 31 | studio-tools definitions, tool-handlers injection, read_file sandbox, dispatch_worker queue |
| `tests/session10-phase3-tests.js` | 48 | client-interview logic, modes, Q&A state machine, shouldInterview, API endpoints in server.js |

**Total: 1,183 tests, 1,183 passing.**

### Key Functions

| Function | File | Purpose |
|----------|------|---------|
| `classifyRequest()` | server.js | 12 content_update patterns; default fallback content_update |
| `handleChatMessage()` | server.js | Primary SDK streaming handler. Brain routing gate checks currentBrain first. |
| `handleBrainstorm()` | server.js | Routes to selected brain via `routeToBrainForBrainstorm()` |
| `routeToBrainForBrainstorm()` | server.js | Rate-limit check, fallback chain, brain dispatch. Handles openai via EventEmitter-wrapped CodexAdapter. |
| `parallelBuild()` | server.js | SDK parallel page builds + subprocess fallback + slug sanitizer + siteContext guard |
| `verifyAllAPIs()` | lib/brain-verifier.js | Concurrent probe of all 3 APIs at startup |
| `getBrainStatus()` | lib/brain-verifier.js | Returns cached verification results |
| `startInterview()` | lib/client-interview.js | Initialize Q&A state (quick/detailed/skip) |
| `recordAnswer()` | lib/client-interview.js | Validate, record, advance state machine |
| `shouldInterview()` | lib/client-interview.js | Gate: false if completed/built/deployed/null spec |
| `initToolHandlers()` | lib/tool-handlers.js | Inject server context (getSiteDir, readSpec, getTag, hubRoot) |
| `handleToolCall()` | lib/tool-handlers.js | Dispatch tool invocation, enforce read_file sandbox |
| `BrainInterface.execute()` | lib/brain-interface.js | Inject tools (Claude only), model from ws.brainModels, ws through options |
| `ClaudeAdapter._executeBlocking()` | lib/adapters/claude-adapter.js | Tool loop with MAX_TOOL_DEPTH=3 recursion, ws through params |
| `CodexAdapter.execute()` | lib/adapters/codex-adapter.js | OpenAI SDK chat.completions.create, streaming with include_usage |
| `callSDK()` | server.js | Non-streaming SDK call with AbortController timeout + api-telemetry |
| `runHaikuFallbackSDK()` | server.js | SDK streaming fallback with claude-haiku model |
| `spawnClaude()` | server.js | @deprecated. Emergency fallback subprocess only. |
| `StudioContextWriter` | lib/studio-context-writer.js | Regenerate STUDIO-CONTEXT.md on every studio event |
| `queryResearch()` | lib/research-router.js | Pinecone-first query, source selection |
| `generateIntelReport()` | server.js | Read log data → findings[] + summary |
| `getAnthropicClient()` | server.js | Lazy singleton Anthropic SDK client |
| `hasAnthropicKey()` | server.js | `!!(process.env.ANTHROPIC_API_KEY && trim())` — truthy check only |
| `syncContentFieldsFromHtml()` | server.js | Scan data-field-id → spec.content[page].fields[] |
| `tryDeterministicHandler()` | server.js | Surgical content edits, no AI, logs agent=none |

### Scripts

| File | Purpose |
|------|---------|
| `scripts/fam-hub` | Unified CLI: site, idea, agent, admin, convo, ingest, research |
| `scripts/gemini-cli` | Gemini API CLI (Node.js, calls gemini-generate.mjs, default gemini-2.5-flash) |
| `scripts/lib/gemini-generate.mjs` | ESM: read stdin → Gemini API → stdout (avoids bash heredoc/pipe conflict) |
| `scripts/orchestrator-site` | Batch site generation |
| `scripts/stock-photo` | 3-provider stock photo downloader |
| `scripts/site-deploy` | Deploy to Netlify/Cloudflare/Vercel |
| `scripts/asset-generate` | SVG asset pipeline |
| `scripts/google-media-generate` | Imagen 4 / Veo 2 media generation |
| `scripts/seed-pinecone` | Seed Pinecone index from site specs + SITE-LEARNINGS |
| `scripts/update-setup-doc` | Auto-update FAMTASTIC-SETUP.md |
| `scripts/fam-convo-compose` | Compose conversation |
| `scripts/fam-convo-reconcile` | Reconcile multi-agent conversation |
| `scripts/fam-convo-ingest` | Ingest conversation into JSONL |
| `scripts/fam-convo-promote` | Promote conversation to canonical |
| `scripts/fam-convo-generate-latest` | Generate real agent stats from JSONL sources |
| `scripts/fam-convo-tag` | Auto-tag assistant messages (7 content-pattern tags via jq) |
| `adapters/claude/fam-convo-get-claude` | Claude multi-agent adapter |
| `adapters/gemini/fam-convo-get-gemini` | Gemini multi-agent adapter (stdout fixed, log→stderr) |
| `adapters/codex/fam-convo-get-codex` | Codex multi-agent adapter |

### Per-Site Files

| File | Purpose |
|------|---------|
| `sites/<tag>/STUDIO-CONTEXT.md` | Universal context file — regenerated on every studio event |
| `sites/<tag>/spec.json` | Design brief, decisions, content fields, media specs, deploy info, `client_brief`, `interview_state`, `interview_completed` |
| `sites/<tag>/agent-calls.jsonl` | Per-call agent telemetry |
| `sites/<tag>/sdk-calls.jsonl` | Per-call Anthropic SDK cost log |
| `sites/<tag>/mutations.jsonl` | Field-level edit log |
| `sites/<tag>/intelligence-promotions.json` | Promoted findings |
| `sites/<tag>/research/<vertical>-research.md` | Per-vertical research stubs |
| `.worker-queue.jsonl` | Worker dispatch queue (root of repo, shared across all sites) |
| `.local/research-effectiveness.json` | Research source effectiveness scores |

### Session 10 Docs

| File | Purpose |
|------|---------|
| `docs/session10-master-report.md` | Session 10 master report — all phases, test counts, architecture changes, gaps |
| `docs/session10-phase0-report.md` | Phase 0: API verification, CodexAdapter SDK, model-config |
| `docs/session10-phase1-report.md` | Phase 1: Brain/Worker split UI, model selector |
| `docs/session10-phase2-report.md` | Phase 2: Tool calling foundation |
| `docs/session10-phase3-report.md` | Phase 3: Client interview system |

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
- Runtime site variable is `TAG` (mutable, changes on site switch) — NOT `process.env.SITE_TAG`
- Any function reading current site must use `TAG`, `SITE_DIR()`, `DIST_DIR()`, etc.
- Express route ordering: static routes BEFORE parameterized routes of same prefix
- Brain routing gate fires before classifier — check `currentBrain` before any intent logic

### Security Constraints

- Pre-tool hook blocks shell-injection-prone child process APIs
- Use `spawnSync` with argument arrays for all child process calls
- `read_file` tool: path.resolve + startsWith(siteRoot + sep) check — mandatory
- Never concatenate user input into shell strings

### Tool Calling Constraints (Session 10)

- Tools are Claude-only. `BrainInterface.execute()` passes empty `[]` for Gemini/OpenAI
- `MAX_TOOL_DEPTH = 3` — hard limit; returns error message if exceeded
- `ws` parameter flows through the call chain (never `this.ws = ws`)
- `model` override from `ws.brainModels` respected in `ClaudeAdapter._executeBlocking()`

### OpenWolf

`openwolf@1.0.4`. Intelligence files tracked in git: `anatomy.md`, `cerebrum.md`, `buglog.json`.

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

### Tier 1 — Revenue Path

End-to-end transaction: site build → client preview URL → payment → domain provisioning → live product.

### Tier 2 — Wire client_brief into Build Prompts (Session 11)

`spec.json.client_brief` is captured but not injected into planning or build prompts. Wire it in `handlePlanning()` and `parallelBuild()`. Also: interview auto-trigger on `fam-hub site new`.

### Tier 3 — Worker Queue Consumer (Session 11)

`dispatch_worker` writes to `.worker-queue.jsonl` but nothing processes it. Build a polling worker that reads entries and executes them (e.g., via Claude Code subprocess or Codex API).

### Tier 4 — Extend Brain Router to Build Path

Build/content-edit paths currently Claude-only. Extending to Gemini/OpenAI requires parsing HTML_UPDATE from those adapters.

### Tier 5 — Platform Dashboard

No multi-site management UI beyond CLI. Required before 10-site milestone.

### Tier 6 — Real Gemini Research

`POST /api/intel/run-research` creates stubs only. Wire `scripts/gemini-cli` to populate them.

### Tier 7 — seed-pinecone --vertical Flag

Add `--vertical <name>` to `scripts/seed-pinecone` for per-build auto-seeding of the specific vertical just built.

### Tier 8 — Factory Expansion

React+Next.js → WordPress → Drupal. After revenue path proven.
