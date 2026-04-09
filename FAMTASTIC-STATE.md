# FAMTASTIC-STATE.md — Canonical Project Reference

**Last updated:** 2026-04-09 (Session 7 — Universal Context, Brain Router, Research Intelligence)

---

## What FAMtastic Site Studio Is

FAMtastic Site Studio is a chat-driven website factory that generates production-ready HTML+Tailwind CSS websites from natural language conversation. A user opens a browser-based chat interface, describes the site they want, and the system generates multi-page HTML, provides a live preview, and deploys to Netlify — all without the user writing code or leaving the chat. It differs from page builders like Squarespace or Wix in three ways: it produces standalone HTML files with no platform lock-in, it uses an AI-powered design brief and decision memory system that prevents cookie-cutter output across turns, and it runs entirely on localhost using the Claude CLI (no API keys, no SaaS dependency). Session 7 added multi-brain routing (Claude, Codex, Gemini), a universal context file (STUDIO-CONTEXT.md) injected into every brain at startup, and a modular research intelligence system with Pinecone-first caching. The system is currently single-user and localhost-only, built and operated by Fritz Medine.

---

## Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| AI Engine | Claude CLI (`claude --print`) | Generates all HTML, SVG assets, design briefs, session summaries, and image prompts. Default model: `claude-sonnet-4-5`. No separate API key — uses Claude Code subscription. |
| Secondary Brains | Gemini CLI + Codex CLI | `adapters/{brain}/fam-convo-get-{brain}` shell adapters. Routed via `routeToBrainForBrainstorm()` in brainstorm mode. Rate-limit auto-fallback: Claude → Codex → Gemini. |
| Backend | Node.js + Express 4.21 | HTTP server, REST API, WebSocket. Single file: `site-studio/server.js` (~11,570 lines). |
| Frontend | Single HTML file + Tailwind CDN + CSS/JS files | `site-studio/public/index.html` (~7,100 lines). VS Code-inspired layout: left sidebar, tabbed canvas (Preview, Editable View, Images, Research, Compare, Intel), bottom CLI bar (Chat, Terminal, Codex), right sidebar. CSS: `public/css/` (7 files). JS: `public/js/` (brain-selector.js + others). |
| CSS (generated sites) | Tailwind CSS via CDN + `assets/styles.css` | Zero build step. CSS custom properties map from spec colors. STUDIO LAYOUT FOUNDATION block injected by post-processor. |
| Event Bus | Node.js EventEmitter | `site-studio/lib/studio-events.js` singleton with 8 namespaced events. Drives STUDIO-CONTEXT.md regeneration. |
| Context Writer | `site-studio/lib/studio-context-writer.js` | Generates `STUDIO-CONTEXT.md` per site on every studio event. Sections: title, timestamp, site, event, brief, state, components, vertical research, findings, tools, rules. |
| Brain Injector | `site-studio/lib/brain-injector.js` | Per-brain context injection. Claude: `@-include`. Gemini/Codex: sidecar file. |
| Research Registry | `site-studio/lib/research-registry.js` | 4 provider-agnostic research sources. Effectiveness scoring persisted to `.local/research-effectiveness.json`. |
| Research Router | `site-studio/lib/research-router.js` | Pinecone-first caching (0.85 threshold), 90-day staleness, source selection, call logging. |
| WebSocket | `ws` 8.18 | Real-time bidirectional: chat, build progress, preview reload, brain-changed, brain-status, brain-fallback. |
| File Upload | `multer` 2.1 | Image upload with drag-drop, paste, file picker. 5MB limit. SVG sanitization. |
| Email | `nodemailer` 8.0 | Share deployed sites via SMTP. |
| SMS | `twilio` 5.13, `@vonage/server-sdk` 3.26 | Server-side providers. Practical path uses macOS `sms:` URI. |
| Deploy | Netlify CLI (primary), Cloudflare Wrangler, Vercel CLI | `scripts/site-deploy`. Netlify tested and deployed. |
| Testing | Node.js scripts | 729 tests across 11 suites (401 v3 engine + 328 Session 7). |
| Config | `~/.config/famtastic/studio-config.json` | Model, deploy target/team, email/SMS creds, upload limits, stock photo API keys, `hero_full_width`. |
| CLI | Bash (`scripts/fam-hub`) | Unified dispatcher: `site`, `idea`, `agent`, `admin`, `convo`, `ingest`, `research` subcommands. |
| Conversation State | JSONL | Per-site `conversation.jsonl` with rolling window (500 msgs, trims at 600+). |
| Site State | JSON | `spec.json` (design brief, decisions, media specs, slot_mappings, content fields) + `.studio.json` (session state) + `blueprint.json` (per-page sections). |
| MCP | stdio JSON-RPC | `mcp-server/server.js`. 4 tools: `list_sites`, `get_site_state`, `get_session_summary`, `suggest_tech_stack`. |

---

## End-to-End Pipeline

**Step 1 — Launch.** `fam-hub site new <tag>` starts `server.js` on port 3334, opens browser, creates `sites/<tag>/`, writes initial `STUDIO-CONTEXT.md`, registers all 8 event listeners.

**Step 2 — Classification.** Message arrives over WebSocket. `classifyRequest()` checks for approved design brief. 12 `content_update` patterns checked first (highest precedence). Default fallback: `content_update`. Plan-gated intents: `layout_update`, `major_revision`, `restyle`, `build`, `restructure`.

**Step 3 — Planning.** `handlePlanning()` calls `spawnClaude()` (3-min timeout). Claude returns `DESIGN_BRIEF` block. Stored in `spec.json`. Studio UI renders brief card: Build From Brief / Edit Brief / Skip to Build.

**Step 4 — Build (Template-First).** User clicks "Build From Brief." `parallelBuild()`:
1. **Template build:** `_template.html` — header, nav, footer, shared CSS.
2. **Template extraction:** `writeTemplateArtifacts()` extracts `_partials/_nav.html`, `_partials/_footer.html`, `assets/styles.css`.
3. **Parallel page builds:** ALL pages build in true parallel with template context.
4. **Post-build:** `logAgentCall()`, emits `BUILD_COMPLETED` — STUDIO-CONTEXT.md regenerated.

**Step 5 — Post-build pipeline.** `runPostProcessing()`:
1. `extractAndRegisterSlots()` — scan `data-slot-id`
2. `reapplySlotMappings()` — re-apply saved images
3. `updateBlueprint()` + `injectSeoMeta()`
4. `reconcileSlotMappings()`
5. `applyLogoV()`
6. Layout path split (template-first vs legacy)
7. `fixLayoutOverflow()` — STUDIO LAYOUT FOUNDATION
8. `syncContentFieldsFromHtml(pages)` — populate `spec.content[page].fields[]`

**Step 6 — Build Verification.** `runBuildVerification(writtenPages)` — 5 zero-token file-based checks. Results in `spec.last_verification`.

**Step 7 — Images.** "Add images" → `fill_stock_photos` → `scripts/stock-photo` per slot.

**Step 8 — Content Edit (Surgical).** `content_update` intent → `tryDeterministicHandler()` → cheerio replacement → `writeSpec()` → `mutations.jsonl` → emits `EDIT_APPLIED` — STUDIO-CONTEXT.md regenerated.

**Step 9 — Deploy.** `runDeploy()` → `scripts/site-deploy` → Netlify. Updates `spec.json`. Emits `DEPLOY_COMPLETED` — STUDIO-CONTEXT.md regenerated.

---

## Feature Map

### Core Engine

**Request Classifier** — `classifyRequest(message, spec)`. 21+ intent types. 12 `content_update` patterns (highest precedence). Default fallback: `content_update`. Plan-gated: `layout_update`, `major_revision`, `restyle`, `build`, `restructure`.

**Content Data Layer** — `data-field-id` + `data-field-type` + `data-section-id` in all generated HTML. `spec.content[page].fields[]` populated by `syncContentFieldsFromHtml(pages)`. Surgical replacement via cheerio. `mutations.jsonl` logs every edit.

**Component Skills System** — `.claude/skills/components/<type>/SKILL.md` auto-created/updated on export via `syncSkillFromComponent()`. Version tracking (1.0 → 1.1 → 1.2). CSS variable portability on import.

**Multi-Agent Pipeline** — `logAgentCall()` writes to `agent-calls.jsonl`. `validateAgentHtml(html, page)` scores 0–100 (threshold 40). `POST /api/compare/generate-v2` Codex → Claude fallback.

**Intelligence Loop** — `generateIntelReport()` reads all log data → `findings[]` with category/severity/title/description/recommendation.

**Planning Mode** — `handlePlanning()` → `design_brief` in spec.json → three-button UI.

**Design Decisions Log** — `extractDecisions()`. Injected into every prompt.

**Site Blueprint System** — `blueprint.json`. `updateBlueprint(writtenPages)` auto-extracts after build.

**Claude CLI Integration** — `spawnClaude()`. `claude --print --model <model> --tools ""`. Prompt via stdin. Runs from `os.tmpdir()`. All `CLAUDE_*` env vars stripped.

### Universal Context System (Session 7 — Phase 1)

**`studio-events.js`** — Singleton EventEmitter. 8 events: `session:started`, `site:switched`, `build:started`, `build:completed`, `edit:applied`, `component:inserted`, `deploy:completed`, `brain:switched`. All hooks wired in `server.js` (init block + 7 emits).

**`studio-context-writer.js`** — `StudioContextWriter` class. Listens to all 8 events, regenerates `STUDIO-CONTEXT.md` on any event. 10 sections: title, timestamp, active site, event type, site brief, site state, component library, vertical research (Pinecone-first), intelligence findings, available tools, standing rules.

**`brain-injector.js`** — `BrainInjector` class. Claude: `@-include` block. Gemini/Codex: sidecar file `STUDIO-CONTEXT-<brain>.md`. Runs at server startup. **Gap:** not re-run on runtime brain switch.

**`GET /api/context`** — returns STUDIO-CONTEXT.md contents.  
**`POST /api/context`** — triggers manual regeneration.

### Brain Router System (Session 7 — Phase 2)

**Brain state** (server.js module-level):
```
currentBrain: 'claude'
BRAIN_LIMITS: { claude: {dailyLimit: null}, codex: {dailyLimit: 40}, gemini: {dailyLimit: 1500} }
sessionBrainCounts: { claude: 0, codex: 0, gemini: 0 }
```

**`spawnBrainAdapter(brain, prompt)`** — spawns `adapters/{brain}/fam-convo-get-{brain}` via stdin using spawnSync.

**`setBrain(brain, ws)`** — updates `currentBrain`, emits `BRAIN_SWITCHED`, broadcasts `brain-changed` to all WS clients.

**`routeToBrainForBrainstorm(prompt)`** — checks daily limit → rate-limit + auto-fallback if exceeded → routes to appropriate spawn function. Broadcasts `brain-fallback` with reason when fallback fires.

**`handleBrainstorm` enhanced** — injects up to 80 lines of STUDIO-CONTEXT.md, routes via `routeToBrainForBrainstorm()`.

**WS events:** `set-brain` → `setBrain()`. `get-brain-status` → returns current state.

**REST endpoints:** `GET /api/brain`, `POST /api/brain`.

**Brain Selector UI** — `studio-brain-selector.css` + `brain-selector.js` (IIFE module). Pill bar with status dots, cost badges, session message counts, fallback warning bar.

**Known gap:** Build/content-edit paths still use `spawnClaude()` directly. Only brainstorm uses the brain router.

### Setup Documentation (Session 7 — Phase 3)

**`FAMTASTIC-SETUP.md`** — Disaster recovery doc at repo root. Covers: Quick Start, MCP Servers (7), Plugins (10), Env Vars (16), Accounts (11), Pinecone config, dependency versions, known gotchas, fam-hub commands, architecture overview.

**`scripts/update-setup-doc`** — Auto-updates timestamp, hostname, Node/Python/uv/Claude versions, env var status. `--commit` flag for automated git commits.

**`fam-hub research`** — New subcommand with 4 actions: `seed-from-sites`, `sources`, `effectiveness`, `query <vertical> "<question>"`.

### Research Intelligence System (Session 7 — Phase 4)

**`research-registry.js`** — `RESEARCH_REGISTRY` with 4 sources (gemini_loop, build_patterns, manual, perplexity). Effectiveness scoring persisted to `.local/research-effectiveness.json`. Exports: `RESEARCH_REGISTRY`, `saveEffectivenessScore`, `getEffectivenessReport`, `loadEffectivenessScores`.

**`research-router.js`** — `queryResearch(vertical, question, options)`: Pinecone-first (0.85 threshold), 90-day staleness, source selection, upsert, call logging. `rateResearch(source, vertical, score)`: validates 1–5. `selectSource(vertical, question, options)`: build_patterns → manual → gemini_loop → perplexity.

**`scripts/seed-pinecone`** — Seeds `famtastic-intelligence` Pinecone index from site specs and SITE-LEARNINGS.md. Exits 0 gracefully when `PINECONE_API_KEY` not set.

**Research Sources Panel** (Intel tab) — `#research-sources-panel`, source cards with status/cost/bestFor, vertical dropdown, question input, query result display. `loadResearchSources()`, `runResearchQuery()`. Auto-loads when Intel tab opens.

**Known gap:** All Pinecone vectors use placeholder zero-vectors. Real `text-embedding-3-small` embeddings required for semantic similarity.

### Multi-Agent Pipeline (Session 7 — Phase 0 fixes)

**ORIG_PROMPT export** — `scripts/agents` now exports `ORIG_PROMPT` before pipeline entry. All 3 adapters receive the original user prompt correctly.

**HUB_ROOT path** — All 3 adapters (`adapters/claude/`, `adapters/gemini/`, `adapters/codex/`) now resolve `HUB_ROOT` from `SCRIPT_DIR/../../` (correct). Previously pointed to archived repo path.

**fam-hub dispatcher fix** — `fam-hub agent run <agent> <tag>` now correctly assigns `AGENT=$3`, `TAG=$4` (was off by one).

**fam-hub agent subcommands** — `status <tag>` and `logs <tag> [agent]` added.

**`scripts/generate-latest-convo`** — Generates real stats from JSONL sources; replaces deleted static fake file.

### Studio UI (VS Code Layout)

**Canvas Tabs (6):**
1. **Preview** — live preview iframe with page tabs, responsive toggle, slots overlay
2. **Editable View** — rendered page with click-to-edit on `data-field-id` elements → popup → direct REST `POST /api/content-field` → 600ms reload
3. **Images** — image browser with suggested query chips, shortlist sidebar, A/B compare pane, provider filter, slot selector
4. **Research** — file list + markdown viewer + vertical trigger form + "Use as Brief" button
5. **Compare** — side-by-side Claude vs Codex renders with sync scroll
6. **Intel** — intelligence loop findings + research sources panel (Session 7: brain-aware query routing, Pinecone-first results)

**CLI Tabs (3):** Chat, Terminal, Codex

**Right Sidebar Tabs (8):** Assets, Blueprint, Deploy, Design, History, Metrics, Verify, Server

---

## API Endpoints (Full)

### v3 Engine Endpoints (Phases 0–5, 2026-04-09)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/sync-content-fields` | Scan HTML for data-field-id, populate spec.content[page].fields[] |
| GET | `/api/content-fields/:page` | List all fields for a page |
| POST | `/api/content-field` | Surgical field update (no AI), global cascade for phone/email/address/hours |
| POST | `/api/components/export` | Export component with version bump + skill sync |
| GET | `/api/image-suggestions` | Contextual query chips from spec.design_brief |
| POST | `/api/research/trigger` | Create vertical research stub (idempotent) |
| POST | `/api/research/to-brief` | Extract brief text from research file |
| GET | `/api/research/verticals` | 40+ known verticals + per-site researched list |
| POST | `/api/compare/generate-v2` | Codex→Claude fallback with HTML validation |
| GET | `/api/agent/stats` | Aggregated agent-calls.jsonl metrics |
| GET | `/api/agent/routing` | Intent→agent routing guide |
| GET | `/api/intel/report` | Full intelligence report (findings + summary) |
| GET | `/api/intel/findings` | Findings only with severity counts |
| POST | `/api/intel/promote` | Promote finding to intelligence-promotions.json |
| POST | `/api/intel/run-research` | Create dated research stub in docs/intelligence-reports/ |

### Session 7 Endpoints (2026-04-09)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/context` | Return STUDIO-CONTEXT.md contents |
| POST | `/api/context` | Trigger manual context regeneration |
| GET | `/api/brain` | Current brain state (currentBrain, BRAIN_LIMITS, sessionCounts) |
| POST | `/api/brain` | Set active brain; triggers setBrain() + WS broadcast |
| GET | `/api/research/sources` | All research sources from RESEARCH_REGISTRY |
| GET | `/api/research/effectiveness` | Effectiveness report sorted by avg score |
| POST | `/api/research/query` | Query research via queryResearch(vertical, question) |
| POST | `/api/research/rate` | Rate a research result (score 1–5) |

**Route ordering rule:** `/api/research/sources` and `/api/research/effectiveness` must be declared BEFORE `/api/research/:filename`. Same applies to `/api/research/verticals` (v3 engine).

---

## Known Gaps

### Open

| Gap | Priority | Detail |
|-----|----------|--------|
| Revenue path (end-to-end) | Tier 1 | Client preview URL + payment (PayPal) + domain provisioning + approval flow. Studio runs on localhost — bridge to real product. |
| Brain routing in build path | Tier 2 | Only brainstorm mode uses `routeToBrainForBrainstorm()`. Build/content-edit paths call `spawnClaude()` directly. Extending requires parsing HTML_UPDATE from non-Claude brains. |
| Real Pinecone embeddings | Tier 2 | `seed-pinecone` uses placeholder zero-vectors. `text-embedding-3-small` integration required for semantic similarity. |
| Intelligence Loop — real Gemini research | Tier 2 | `POST /api/intel/run-research` creates stubs only. `scripts/gemini-cli` must be wired to populate them. |
| Codex CLI non-functional | Tier 2 | `codex-cli` binary times out 100% of compare calls. `/api/compare/generate-v2` falls back to Claude every time. |
| Platform dashboard | Tier 2 | No multi-site management UI beyond CLI. Required before 10-site milestone. |
| Template upload mode | Tier 2 | Uploading pre-built templates for Studio to tweak vs generate from scratch. |
| BRAIN_SWITCHED sidecar re-injection | Tier 3 | `brain-injector.js` writes sidecar files at startup only. Runtime brain switch does not update them. |
| Research effectiveness stars UI | Tier 3 | `POST /api/research/rate` endpoint exists. Client-side post-build rating prompt not wired. |
| update-setup-doc MCP table | Tier 3 | Static MCP table in FAMTASTIC-SETUP.md. Does not auto-parse `claude mcp list`. |
| 90-day staleness auto-re-query | Tier 3 | Staleness detected but re-query only triggered by next `queryResearch()` call. |
| Asset generate → insert | Tier 3 | SVG generation creates files but doesn't wire back to HTML slots. |
| design_decisions unbounded | Tier 3 | `spec.design_decisions` array has no cap. |
| spec.json write not atomic | Tier 3 | Uses `fs.writeFileSync()` directly — no `.tmp` + rename. |
| server.js decomposition | Tier 3 | ~11,570 lines. Plan: thin assembler + modules in lib/. |
| library.json structure ambiguity | Tier 3 | Must read `.components` not root. Consider flattening. |
| Brainstorm recommendation chips | Tier 4 | Cherry-picking individual brainstorm suggestions not supported. |
| SMS send path non-functional | Tier 4 | Twilio/Vonage configured; practical path uses macOS `sms:` URI. |

### Closed This Session (2026-04-09 — Session 7)

- **Multi-agent pipeline non-functional** — ORIG_PROMPT export, adapter path resolution, fam-hub off-by-one dispatcher all fixed. `fam-hub agent run claude site-foo` now routes correctly.
- **No universal context for brains** — STUDIO-CONTEXT.md generated on every studio event; injected into all brains at startup.
- **Brain routing in brainstorm** — `routeToBrainForBrainstorm()` routes brainstorm mode through brain selector with rate-limit enforcement and fallback chain.
- **No setup/disaster recovery doc** — `FAMTASTIC-SETUP.md` created with full environment reference.
- **No research intelligence** — `research-registry.js` + `research-router.js` + `seed-pinecone` + Research Sources panel built.
- **fam-hub agent status/logs missing** — `fam-hub agent status <tag>` and `fam-hub agent logs <tag>` subcommands added.

### Previously Closed

See CHANGELOG.md for sessions prior to 2026-04-09.

---

## File Inventory

### Strategic Documents

| File | Purpose |
|------|---------|
| `FAMTASTIC-VISION.md` | North star — empire model, scaling milestones, revenue path |
| `FAMTASTIC-STATE.md` | This file — canonical technical snapshot |
| `FAMTASTIC-SETUP.md` | Disaster recovery — Quick Start, MCP servers, env vars, dependencies, gotchas |
| `SITE-LEARNINGS.md` | Authoritative technical reference — architecture notes, all sessions |
| `CHANGELOG.md` | Chronological session summaries |

### Core Application

| File | Lines | Purpose |
|------|-------|---------|
| `site-studio/server.js` | ~11,570 | Main backend. Express + WebSocket. All classifier, content data layer, component skills, multi-agent, intel loop, brain router, universal context, research intelligence, image/research/deploy/compare endpoints. |
| `site-studio/public/index.html` | ~7,100 | Single-file frontend. 6 canvas tabs. Brain selector pill bar. Research sources panel. All WS handlers. |
| `site-studio/lib/studio-events.js` | — | Singleton EventEmitter + 8 event constants |
| `site-studio/lib/studio-context-writer.js` | — | STUDIO-CONTEXT.md generator (event-driven, 10 sections) |
| `site-studio/lib/brain-injector.js` | — | Per-brain context injection (Claude @-include, Gemini/Codex sidecar) |
| `site-studio/lib/research-registry.js` | — | 4 research sources + effectiveness scoring |
| `site-studio/lib/research-router.js` | — | Pinecone-first cache, source selection, call logging |
| `site-studio/public/css/studio-base.css` | — | Resets, layout, typography |
| `site-studio/public/css/studio-panels.css` | — | Three-panel layout, resizers |
| `site-studio/public/css/studio-chat.css` | — | Chat panel, messages, plan cards |
| `site-studio/public/css/studio-sidebar.css` | — | Tabs, mode selector, status bar |
| `site-studio/public/css/studio-modals.css` | — | Settings, upload, all modal dialogs |
| `site-studio/public/css/studio-terminal.css` | — | Terminal panel and toolbar |
| `site-studio/public/css/studio-canvas.css` | — | Canvas panes: editable view, images, research, compare, intel |
| `site-studio/public/css/studio-brain-selector.css` | — | Brain selector pill bar, status dots, cost badges, fallback bar |
| `site-studio/public/js/brain-selector.js` | — | BrainSelector IIFE module (select, sync, fallback display) |
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

**Total: 729 tests, 729 passing.**

### Key Functions

| Function | File | Purpose |
|----------|------|---------|
| `classifyRequest()` | server.js | 12 content_update patterns; default fallback content_update |
| `syncContentFieldsFromHtml(pages)` | server.js | Scan data-field-id → spec.content[page].fields[] |
| `tryDeterministicHandler()` | server.js | Surgical content edits, no AI, logs agent=none |
| `syncSkillFromComponent()` | server.js | Auto-create/update SKILL.md on component export |
| `logAgentCall()` | server.js | Append-only agent-calls.jsonl with cost estimate |
| `validateAgentHtml()` | server.js | Score HTML 0–100; threshold 40 |
| `generateIntelReport()` | server.js | Read log data → findings[] + summary |
| `spawnClaude()` | server.js | Claude CLI spawn with stdin prompt, CLAUDE_* env stripped |
| `spawnBrainAdapter()` | server.js | Spawn adapters/{brain}/fam-convo-get-{brain} via stdin |
| `setBrain()` | server.js | Set currentBrain, emit BRAIN_SWITCHED, broadcast WS |
| `routeToBrainForBrainstorm()` | server.js | Rate-limit check, fallback chain, brain dispatch |
| `StudioContextWriter` | lib/studio-context-writer.js | Regenerate STUDIO-CONTEXT.md on every studio event |
| `BrainInjector` | lib/brain-injector.js | Inject context for Claude (@-include) or Gemini/Codex (sidecar) |
| `queryResearch()` | lib/research-router.js | Pinecone-first query, source selection, upsert, logging |
| `saveEffectivenessScore()` | lib/research-registry.js | Persist research rating to .local/research-effectiveness.json |
| `loadResearchSources()` | index.html | Fetch /api/research/sources → render source cards |
| `runResearchQuery()` | index.html | POST /api/research/query → show result + cache badge |
| `BrainSelector.select()` | js/brain-selector.js | WS send set-brain, update pill UI |

### Scripts

| File | Purpose |
|------|---------|
| `scripts/fam-hub` | Unified CLI: site, idea, agent, admin, convo, ingest, research |
| `scripts/orchestrator-site` | Batch site generation |
| `scripts/gemini-cli` | Gemini API CLI |
| `scripts/rembg-worker.py` | Background removal (Python API) |
| `scripts/stock-photo` | 3-provider stock photo downloader |
| `scripts/site-deploy` | Deploy to Netlify/Cloudflare/Vercel |
| `scripts/asset-generate` | SVG asset pipeline |
| `scripts/google-media-generate` | Imagen 4 / Veo 2 media generation |
| `scripts/seed-pinecone` | Seed Pinecone index from site specs + SITE-LEARNINGS |
| `scripts/update-setup-doc` | Auto-update FAMTASTIC-SETUP.md (versions, env vars) |
| `scripts/generate-latest-convo` | Generate real agent stats from JSONL sources |
| `adapters/claude/fam-convo-get-claude` | Claude multi-agent adapter (cj-get-convo-claude is a deprecation shim) |
| `adapters/gemini/fam-convo-get-gemini` | Gemini multi-agent adapter (cj-get-convo-gemini is a deprecation shim) |
| `adapters/codex/fam-convo-get-codex` | Codex multi-agent adapter (cj-get-convo-codex is a deprecation shim) |

### Per-Site Files

| File | Purpose |
|------|---------|
| `sites/<tag>/STUDIO-CONTEXT.md` | Universal context file — regenerated on every studio event |
| `sites/<tag>/agent-calls.jsonl` | Per-call agent telemetry |
| `sites/<tag>/mutations.jsonl` | Field-level edit log |
| `sites/<tag>/intelligence-promotions.json` | Promoted findings |
| `sites/<tag>/research/<vertical>-research.md` | Per-vertical research stubs |
| `sites/<tag>/spec.json` | Design brief, decisions, content fields, media specs, deploy info |
| `.local/research-effectiveness.json` | Research source effectiveness scores (gitignored) |
| `.local/research-calls.jsonl` | Research call log (gitignored) |

### OpenWolf Files

| File | Git | Purpose |
|------|-----|---------|
| `.wolf/anatomy.md` | tracked | File index with token estimates |
| `.wolf/cerebrum.md` | tracked | Patterns, preferences, do-not-repeat rules |
| `.wolf/buglog.json` | tracked | Bug tracking across sessions |
| `.wolf/memory.md` | ignored | Per-session action log (ephemeral) |

### Session 7 Docs

| File | Purpose |
|------|---------|
| `docs/session7-master-report.md` | Session 7 master report — all phases, test counts, file inventory |
| `docs/session7-phase-0-report.md` | Phase 0: multi-agent skeleton fixes |
| `docs/session7-phase-1-report.md` | Phase 1: universal context file |
| `docs/session7-phase-2-report.md` | Phase 2: brain router UI |
| `docs/session7-phase-3-report.md` | Phase 3: studio config file |
| `docs/session7-phase-4-report.md` | Phase 4: research intelligence system |

---

## Developer Environment

### Runtime

- Server starts with `SITE_TAG=<tag> node site-studio/server.js`
- Runtime site variable is `TAG` (mutable, changes on site switch) — NOT `process.env.SITE_TAG`
- Any function reading current site must use `TAG`, `SITE_DIR()`, `DIST_DIR()`, etc. — never the env var directly
- Express route ordering: static routes must be declared BEFORE parameterized routes of the same prefix
  - `/api/research/sources` before `/api/research/:filename`
  - `/api/research/verticals` before `/api/research/:filename`

### Security Constraint

- Pre-tool hook blocks shell-injection-prone child process APIs (execSync, shell-mode exec)
- Use `spawnSync` with argument arrays for all child process calls in server.js and lib/ files
- Never concatenate user input into shell strings

### OpenWolf

`openwolf@1.0.4`. Intelligence files tracked in git: `anatomy.md`, `cerebrum.md`, `buglog.json`.

---

## Deployed Sites

| Site | URL | Pages | Deploy Date |
|------|-----|-------|-------------|
| The Best Lawn Care | https://the-best-lawn-care.netlify.app | 7 | 2026-03-20 |
| Auntie Gale's Garage Sales | https://effortless-tiramisu-ed9345.netlify.app | 5 | 2026-04-08 |

---

## What's Next

> Full strategic vision lives in `FAMTASTIC-VISION.md`.

### Tier 1 — Revenue Path (Build This First)

End-to-end transaction flow: site build → client preview URL → payment (PayPal) → domain provisioning (GoDaddy reseller) → live recurring-revenue product.

### Tier 2 — Extend Brain Router to Build Path

`routeToBrainForBrainstorm()` only covers brainstorm mode. Extend to full builds + content edits. Requires parsing HTML_UPDATE responses from Gemini and Codex adapters.

### Tier 3 — Real Pinecone Embeddings

Replace placeholder zero-vectors with `text-embedding-3-small` embeddings. Unlocks actual semantic similarity for research caching.

### Tier 4 — Fix Codex CLI

`codex-cli` times out 100% of compare calls. Investigate or replace with Codex API endpoint.

### Tier 5 — Platform Dashboard

No multi-site management UI beyond CLI. Required before 10-site milestone.

### Tier 6 — Wire Intelligence Loop to Gemini

`POST /api/intel/run-research` creates stubs only. Wire `scripts/gemini-cli` to populate them.

### Tier 7 — Factory Expansion

React+Next.js → WordPress → Drupal. After revenue path proven.
