# FAMTASTIC-STATE.md — Canonical Project Reference

**Last updated:** 2026-05-04 (Four-plan registry applied — active parent plans, task/run/proof ledgers populated, CLI review/promote/start commands added, and status packet updated.)

---

## What FAMtastic Site Studio Is

FAMtastic Site Studio is a chat-driven website factory that generates production-ready HTML+Tailwind CSS websites from natural language conversation. A user opens a browser-based chat interface (or talks to Shay-Shay through Shay Desk), describes the site they want, and the system generates multi-page HTML, provides a live preview, and deploys to Netlify — all without the user writing code or leaving the chat.

The system is currently single-user and localhost-only, built and operated by Fritz Medine. The architectural goal — captured in the canonical vision doc `docs/FAMTASTIC-VISION-CAPTURE-2026-04-24.md` — is the **Adobe Creative Cloud pattern**: separate full-identity studios (Site, Component, Media, Think Tank) atop shared Platform services (research, memory, intelligence loop, learning).

**Key recent milestones:**

- **2026-05-04** — Four-plan registry applied. `plans/registry.json` now contains exactly four active parent plans: `studio-workbench-foundation`, `plan-task-run-intelligence`, `build-intent-fulfillment-trace`, and `site-mbsh-reunion`. The prior 11-record registry is backed up at `plans/registry.backup-2026-05-04.json`; stale plans are recorded as absorbed/parked metadata instead of active records. Populated `tasks/tasks.jsonl`, `runs/runs.jsonl`, and `proofs/proof-ledger.jsonl`, regenerated `FAMTASTIC-STATUS.md`, fixed `fam-hub task list` / `fam-hub run status` so they do not skip the first JSONL record, and added `fam-hub plan review`, `fam-hub task promote`, and `fam-hub run start`. Deferred: Workbench registry rendering, Workbench Shay context provider, automatic status regeneration, workflow-as-data instrumentation, and pipeline visualizer.
- **2026-05-04** — Consolidated execution checklist. Added `plans/consolidated-execution-checklist-2026-05-04.md` as the working four-plan consolidation artifact. The surviving parent plans are `studio-workbench-foundation`, `plan-task-run-intelligence`, `build-intent-fulfillment-trace`, and `site-mbsh-reunion`; `docs/famtastic-total-ask-plan.md` is parked as strategy context and mined for useful asks. Fritz marked Drive sync complete, so it is not carried as active work; workflow-as-data and the pipeline visualizer remain open under `build-intent-fulfillment-trace`. The registry rewrite, P0 task promotion, run/proof records, and status packet were applied in the follow-up four-plan registry milestone above.
- **2026-05-04** — Plan consolidation verification proposal. Added `plans/consolidation-verification-2026-05-04.md` to reduce the current 11 same-level plan records into 4 active parent plans, 1 parked strategy context, and 6 merged/closed evidence records. The registry itself is not mutated yet; approval is required before rewriting `plans/registry.json`, archiving merged records, or promoting embedded tasks into `tasks/tasks.jsonl`.
- **2026-05-04** — Studio UI Foundation freeze. Fritz approved `docs/STUDIO-UI-FOUNDATION.md` as the canonical Site Studio UI rulebook. The freeze locks the domain-level left nav, purpose-reactive workspaces, ambient Shay model, Fritz filter, Night visual system, page rule, required workspace contract, prompt-first Media Studio direction, contextual tools, and plan-then-approve pattern. Added `docs/decisions.jsonl`, `captures/inbox/2026-05-04-studio-ui-foundation-freeze.capture.json`, and `handoffs/studio-ui-foundation-freeze-2026-05-04.md`. Deferred: rebuilding the Workbench prototype from the frozen contract, registry-backed Plan mode, Shay context provider registration, and Media Studio unification.
- **2026-05-04** — Plan registry CLI substrate. Added `plans/registry.json` as the pilot canonical plan registry, three density contracts under `plans/templates/`, empty append-only ledgers for tasks/runs/jobs/proof/research, `FAMTASTIC-STATUS.md` for web/phone mirrors, and `docs/plan-registry-build-report-2026-05-04.md`. `scripts/fam-hub` gained read-only `plan`, `task`, and `run` status commands: `fam-hub plan list`, `fam-hub plan list --compact`, `fam-hub plan list --json`, `fam-hub plan show <id>`, `fam-hub task list`, and `fam-hub run status`. The later four-plan registry milestone added task promotion, run creation, and ledger records; automatic status export, schema validation, and Studio Plans panel rendering remain deferred.
- **2026-05-04** — Workbench Foundation screen + intelligence packets. Added `site-studio/public/workbench-foundation.html` plus separate `css/workbench-foundation.css` and `js/workbench-foundation.js`, then linked it into production Studio through a Workbench top-bar launcher, Sites-sidebar launcher, and `#tab-pane-workbench` iframe with full-screen fallback. The screen now demonstrates a site/domain rail, collapsible scope-specific object navigator, mode strip (`Sites`, `Plan`, `Components`, `Media`, `Research`, `Deploy`), dynamic center workbench, live preview with translucent object/Shay/evidence overlays, prompt-first Media Studio surface, contextual draggable/reorderable tool shelf with persisted order, bottom `Runs`/`Logs`/`Trace`/`Approvals`/`Proof` panel, theme cycling, and reusable modal shell. Added `handoffs/claude-workbench-foundation-2026-05-04.md`, `research/workbench-foundation-research-2026-05-04.md`, `plans/consolidation-2026-05-04.json`, and `captures/inbox/2026-05-04-workbench-foundation.capture.json`. Deferred: making Workbench the default shell, registry-backed Plan mode, broader Capability Store, FAMtastic brand asset pack, unified Media Studio controls, Shay context provider registration, and worker queue consumer.
- **2026-05-04** — Active plan pipeline pilot report. Added `docs/active-plan-pipeline-report-2026-05-04.md` as a review artifact for the emerging plan/task/run intelligence model. The report inventories active Studio/platform plan clusters, groups tasks, records inferred originators/runners/proof, and recommends generous governance: warn/log/notify by default, hard-stop only for destructive, production, auth/payment/DNS/domain, expensive API/media, or write-conflict cases. Deferred: canonical `plans/registry.json`, append-only task/run/proof/research ledgers, CLI status commands, and web/phone status export.
- **2026-05-04** — Multi-agent resumable plan capture. Added `docs/multi-agent-resumable-plan-system.md` plus first file-based plan packet at `plans/plan_2026_05_04_shay_process_intelligence/` (`README.md`, `plan.json`). The plan packet captures the Shay process-intelligence initiative as ten parallel workstreams across conversation capture, plan coordination, artifact/component schema, process maps, Shay ambient presence, component library enforcement, Media Studio integration, capability graph, evaluator proof system, and Studio workspace planning. Deferred: Plan Builder / Plan Board UI, SQLite `plan_id` / `workstream_id`, automatic conversation capture, and Process Map visualization.
- **2026-05-02** — MBSH audit + v2 build + platform layer. Cowork audit produced 8 deliverables at `docs/sites/site-mbsh-reunion/cowork-audit-001/`. Headline finding: Studio cannot produce MBSH today (gap 0.11). Full V1-BRIEF built as sibling deploy repo at `~/famtastic-sites/mbsh-reunion-v2/` (84 files). Platform capability layer scaffolded at `~/famtastic/platform/` — 10 operational primitives, macOS Keychain vault, standing-approval model. Repo-separation rule formalized: deploy repos live at `~/famtastic-sites/<site>/`, not nested inside Studio. Duplicate tag `site-mbsh96reunion` trashed. Iteration 3 shipped: capture flywheel (promote/extract/patterns), Shay v2 wired live (page_context, job polling, Show-Me-How), ecosystem substrate (registerStudio, shared services, components, recipes), Drive sync action.
- **2026-04-25** — Baseline closure shipped (3 commits + verification). Closed 6 stacked sub-gaps that caused the JJ B&A baseline test to fail. Introduced canonical `createSite()` helper, `handleShayBuildRequest` async chain, structured deploy failure reasons, and chat session-break dividers. 28/28 verification scenarios PASS. Two new findings logged for follow-up: build auto-fires without confirmation, generated site has broken header links.
- **2026-04-25** — Vision capture doc canonicalized. `docs/FAMTASTIC-VISION-CAPTURE-2026-04-24.md` is now the single home for FAMtastic vision and architectural decisions. Three architectural decision entries: Tier as Canonical (GAP-4), Site Creation Contract, plus parking-lot entries for Shay-Shay naming, meta-research, context architecture.
- **2026-04-24** — All four R-NEW build-layer gaps closed. GAP-1/2/3 in commit `8536a4a` (palette defaults + skeleton injection on single-page path). GAP-4 in commit `2c5e358` (`spec.tier` as canonical, `famtastic_mode` as derived).

**Prior session additions** (verbatim from earlier project history, preserved for continuity):

- **Session 11 (2026-04-10):** `client_brief` injection, FAMtastic DNA auto-copy, font registry, interview auto-trigger, `enhancement_pass` intent, layout registry, FAMtastic logo mode, worker-queue badge, `fam-hero.css`, head-guardrail hotfix.
- **Session 12 (2026-04-12):** HTML skeletons (`HERO_SKELETON_TEMPLATE`, `LOGO_SKELETON_TEMPLATE`, `LOGO_NOTE_PAGE`, 30 tests), worker queue terminal-status purge, `famtastic-dna.md` auto-update.
- **Session 13 (2026-04-16):** `conversational_ack` intent, atomic `spec.json` writes, restyle routing fix, `lib/surgical-editor.js`, revenue-first brief interview, `fam-hub site deal-memo`.
- **Session 16 (2026-04-16):** Surgical editor wired into `tryDeterministicHandler`, Layer 0 data sources (gap logger, suggestion logger, brand tracker, deploy history, agent cards, brief corrections, capability manifest), Shay-Shay seed.
- **Session 17 (2026-04-20):** `NAV_SKELETON`, preview server query-string fix, actionable intelligence cards, site-scoped dismiss, build backlog, orb state machine.
- **Session 18 (2026-04-21):** Shay Lite settings contract, mutually exclusive Lite identities, surface state machine, persistent Shay access, Mission Control restored, Media Studio mini-app restructure, movable Shay Lite.

---

## Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| AI Engine (Primary) | Anthropic SDK (`@anthropic-ai/sdk`) | All HTML generation, design briefs, brief extraction, session summaries, image prompts. Default model: `claude-sonnet-4-6`. `callSDK()` non-streaming; `sdk.messages.stream()` for streaming. |
| AI Engine (Secondary) | OpenAI SDK (`openai@^4`) via CodexAdapter | Chat + code tasks via `gpt-4o`. Multi-turn, streaming, tool calling. Requires `OPENAI_API_KEY`. |
| AI Engine (Tertiary) | Google Generative AI (`@google/generative-ai`) via GeminiAdapter | Brainstorm and research. `gemini-2.5-flash`. Requires `GEMINI_API_KEY`. |
| Brain Adapter Pattern | `BrainInterface` + adapters | Unified interface for Claude/Gemini/OpenAI. History, context headers, model override via `ws.brainModels`. Tool calling is Claude-only. |
| Tool Calling | `lib/studio-tools.js` + `lib/tool-handlers.js` | 5 Anthropic-format tools for Claude: get_site_context, get_component_library, get_research, dispatch_worker, read_file. `MAX_TOOL_DEPTH=3`. read_file sandboxed to SITE_DIR. |
| Studio UI Foundation | Frozen rulebook + mockup references | `docs/STUDIO-UI-FOUNDATION.md` is the canonical UI foundation. It locks the Site Studio identity as an AI Creation Workbench, domain-level left nav, purpose-reactive workspaces, ambient Shay, Fritz filter, Night visual tokens, page rule, workspace contract, prompt-first Media Studio, contextual tools, and plan-then-approve. Decision ledger: `docs/decisions.jsonl`. |
| Tier System | `lib/tier.js` + `lib/tier-gates.js` *(2026-04-24)* | `resolveTier()` precedence chain, `normalizeTierAndMode()` repair-on-read. `famtastic_mode` is now a derived boolean, not a stored toggle. Three gate helpers (`getLogoSkeletonBlock`, `getLogoNoteBlock`, `shouldInjectFamtasticLogoMode`) extracted from server.js for testability. |
| Site Creation | `createSite(brief, options)` in server.js *(2026-04-25)* | Canonical site-creation path. Caller-owned auth, helper-owned TAG switch, three `on_collision` modes gated by same-business identity comparison. JSDoc captures all four invariants. |
| Brief Extraction | `extractBriefFromMessage` in server.js *(2026-04-25)* | Returns `{ status: 'extracted', extraction_method: 'proper_noun'\|'type_location_synthesis', brief }` or `{ status: 'insufficient_identity', reason, clarification_question, raw_message }`. No more silent "New Business" / "site-new-site" fallback. |
| Build Trigger | `triggerSiteBuild(ws, spec)` in server.js *(2026-04-25)* | Canonical build dispatcher. Gates on WS client presence BEFORE dispatch. Used by both Studio Chat (`new_site_create` case) and Shay Desk (`handleShayBuildRequest`). |
| Client Interview | `lib/client-interview.js` | Pre-build Q&A: quick (6q) / detailed (11q) / skip. Revenue model question (q_revenue) is second question. `REVENUE_MODEL_OPTIONS` + `getRevenueBuildHints()`. `suggestion_chips` in formatted questions. |
| Surgical Editor | `lib/surgical-editor.js` | DOM-aware HTML surgery via cheerio. `buildStructuralIndex()`, `extractSection()`, `surgicalEdit()`, `trySurgicalEdit()`. Pure functions, no side effects. |
| HTML Skeletons | `lib/famtastic-skeletons.js` | `HERO_SKELETON_TEMPLATE` (BEM double-dash vocabulary), `LOGO_SKELETON_TEMPLATE` (nav logo wiring), `LOGO_NOTE_PAGE` (parallel page logo reference), `NAV_SKELETON` (mandated nav class names). `FAMTASTIC_DEFAULT_PALETTE` (5 hex values: primary `#00A79D`, accent `#F5B800`, navy `#001F3F`, coral `#FF6B6B`, background `#FDF4E3`). |
| Build DNA | `famtastic-dna.md` | Auto-updated by `updateFamtasticDna()` after every build. Cross-session build memory injected via CLAUDE.md `@famtastic-dna.md`. |
| Brain Verifier | `lib/brain-verifier.js` | Startup API probes for all 3 APIs + Codex CLI. Results cached, served via `/api/brain-status`. |
| Capability Manifest | `lib/capability-manifest.js` | `buildCapabilityManifest()` checks all env vars + CLI. `checkNetlify()` returns structured `{ ok, reason, details }` *(2026-04-25)* — `cli_missing` / `credentials_missing` / `config_unreadable` / `other`. Exported for direct use by `runDeploy` preflight. |
| Backend | Node.js + Express 4.21 | HTTP server, REST API, WebSocket. Single file: `site-studio/server.js` (~18,400 lines after baseline closure). |
| Frontend | Single HTML file + Tailwind CDN + CSS/JS files | `site-studio/public/index.html`. VS Code-inspired layout. Brain/Worker split panel. CSS: `public/css/` (8+ files). JS: `public/js/`. |
| Workbench Foundation Prototype | Static HTML + component CSS/JS, embedded in Studio | `site-studio/public/workbench-foundation.html`, `public/css/workbench-foundation.css`, `public/js/workbench-foundation.js`, `public/data/workbench-workspaces.json`, plus `#tab-pane-workbench` in `site-studio/public/index.html`. Demonstrates site/domain rail, collapsible object navigator, dynamic center workbench, live preview with translucent metadata/Shay/evidence overlays, prompt-first Media Studio surface, contextual draggable/reorderable tool shelf with persisted order, bottom runs/logs/trace/approvals/proof panel, theme tokens, modal shell, and a workspace-purpose contract. Linked from production Studio but not yet the default shell. |
| CSS (generated sites) | Tailwind CSS via CDN + `assets/styles.css` | Zero build step. CSS custom properties from spec colors. STUDIO LAYOUT FOUNDATION block injected by post-processor. |
| Event Bus | Node.js EventEmitter | `site-studio/lib/studio-events.js` singleton with 10 namespaced events. |
| API Telemetry | `site-studio/lib/api-telemetry.js` | Per-call SDK cost tracking. `logAPICall()` writes to `sites/<tag>/sdk-calls.jsonl`. |
| Cost Tracker | `site-studio/lib/api-cost-tracker.js` | `calculateCost(model, inputTokens, outputTokens)`. Rates for claude-sonnet, claude-haiku, gpt-4o, gpt-4o-mini, gemini-2.5-flash. `codex-cli` at $0. |
| Brain Sessions | `site-studio/lib/brain-sessions.js` | `initBrainSessions()` auth probe at startup. `getOrCreateBrainSession()` for persistent multi-turn. `resetSessions()` on site switch. |
| Model Config | `site-studio/lib/model-config.json` | Canonical model registry. |
| Font Registry | `site-studio/lib/font-registry.js` | 5 hand-tuned font pairings + vertical→pairing map. |
| Layout Registry | `site-studio/lib/layout-registry.js` | 5 layout variants + vertical map. |
| Multi-Layer Hero CSS | `site-studio/public/css/fam-hero.css` | 7-layer hero composition vocabulary. Auto-linked by head-guardrail. |
| Worker Queue | `.worker-queue.jsonl` | `dispatch_worker` tool writes task entries. No live consumer. Startup cleanup removes terminal-status and 7d-old entries. Visibility badge in sidebar polled every 15s. |
| Context Writer | `site-studio/lib/studio-context-writer.js` | Generates `STUDIO-CONTEXT.md` per site on every studio event. 10 sections. |
| Brain Injector | `site-studio/lib/brain-injector.js` | Per-brain context injection. Claude: `@-include`. Gemini/Codex: sidecar file. `reinject()` on brain switch. |
| Research Registry | `site-studio/lib/research-registry.js` | 4 provider-agnostic research sources. Auto-effectiveness scoring from build metrics. |
| Research Router | `site-studio/lib/research-router.js` | Pinecone-first caching, 90-day staleness, background refresh via `REQUERY_QUEUE`. |
| WebSocket | `ws` 8.18 | Real-time: chat, build progress, preview reload, brain-changed, brain-status, brain-fallback, set-brain-model, site-switched (now triggers chat session-break divider). |
| Deploy | Netlify CLI (primary), Cloudflare Wrangler, Vercel CLI | `scripts/site-deploy`. `runDeploy()` now runs `checkNetlify()` preflight before flag mutation, has `child.on('error')` handler, parses stderr for known patterns, resets `deployInProgress` on every early-return. |
| Testing | Vitest 4.1.1 | Current: 161/161 passing across 3 files (`unit.test.js` 110, `gap4-tier-canonicality.test.js` 28, `baseline-closure.test.js` 23). Legacy node-script test suites still in `tests/` folder (~1,236 tests across 22 suites) — not gating. |
| Config | `~/.config/famtastic/studio-config.json` | Model, deploy target/team, email/SMS creds, upload limits, stock photo API keys, `hero_full_width`. |
| CLI | Bash (`scripts/fam-hub`) | Unified dispatcher: `site`, `idea`, `agent`, `admin`, `convo`, `ingest`, `research`, `plan`, `task`, and `run` subcommands. Plan/task/run commands are read-only in the 2026-05-04 pilot substrate. |

---

## End-to-End Pipeline

**Step 1 — Launch.** `fam-hub site new <tag>` starts `server.js` (managed by launchd as `com.famtastic.studio`), opens browser, creates `sites/<tag>/`, writes initial `STUDIO-CONTEXT.md`, probes all 3 APIs via `verifyAllAPIs()`. Worker queue cleanup runs on startup. `readSpec()` runs `normalizeTierAndMode()` at every read so `tier` and derived `famtastic_mode` are always coherent.

**Step 2 — (Optional) Client Interview.** `POST /api/interview/start` → Q&A session → `client_brief` stored in spec.json.

**Step 3 — Site creation entry points.** Three paths now share the canonical `createSite(brief, options)` helper:
1. **`POST /api/new-site`** (Brief tab, programmatic) — `tag_source: 'caller_supplied'`, `on_collision: 'error'`.
2. **`runAutonomousBuild()`** (Shay-Shay autonomous) — `tag_source: 'extracted'`, `on_collision: 'update'`.
3. **`handleShayBuildRequest()`** (Shay Desk natural-language) — `tag_source: 'extracted'`, `on_collision: 'return_collision'`.
4. **Studio Chat `new_site_create` case** — same as Shay Desk path.

`createSite()` performs identity check first, directory creation, atomic spec write, TAG switch, cache invalidation, and WS notification. Different-business collisions ALWAYS return `'collision'` (or `'error'` for `on_collision: 'error'`) regardless of caller request — invariant guards against autonomous overwrites.

**Step 4 — Classification (Studio Chat).** Message arrives over WebSocket. `classifyRequest(message, spec)` runs gates in this order *(post-baseline-closure)*:
1. `new_site_create` — build phrase + identifiable target (proper noun OR business-type+location OR no active site) + no edit-language keywords + extracted target ≠ active spec.site_name.
2. Strong build signals.
3. Brief indicators.
4. Worker queue, brief edit, visual inspect, brand health, brainstorm, rollback, version history, summarize, data model, tech advice, template import, page navigation, git push.
5. **`!hasBrief` fallback** *(moved above deploy)* — unbriefed sites can't be hijacked by incidental "deploy" keyword.
6. Explicit commands (deploy, build/rebuild, query).
7. Asset generation, fill stock photos, content_update patterns (12), enhancement_pass, restyle, layout_update, bug_fix.

**Step 5 — Planning.** `handlePlanning()` for `new_site` / `major_revision` (brief editor only — does NOT create new sites). For `new_site_create`, the Studio Chat case runs the full chain inline.

**Step 6 — Build (Template-First).** `parallelBuild()` via `triggerSiteBuild()` shared dispatcher. `triggerSiteBuild` gates on WS client presence BEFORE any dispatch (corrects prior orphaned-job order).

**Step 7 — Post-build pipeline.** `runPostProcessing()` 9-step pipeline (slot extraction → reapply → blueprint → reconcile → applyLogoV → layout split → fixLayoutOverflow → syncContentFieldsFromHtml → buildStructuralIndex). Then `runBuildVerification(writtenPages)` — 6 file-based checks including `verifyRevenueAndState()`.

**Step 8 — Images, content edits, deploy.** Images via `fill_stock_photos`. Content edits via surgical editor. Deploy via `runDeploy()` with structured preflight + spawn error handling + stderr pattern parsing.

---

## Feature Map

### Core Engine

**Request Classifier (post-baseline-closure)** — `classifyRequest(message, spec)`. New `new_site_create` intent at the top precedence gate. `!hasBrief` fallback moved above the deploy keyword gate. `conversational_ack` first. 12 `content_update` patterns. Default fallback: `content_update`. Plan-gated: `layout_update`, `major_revision`, `build`, `restructure`. `restyle` routes to `handleChatMessage`. `new_site_create` is NOT plan-gated — handled inline in the WS switch.

**Site Creation Contract** *(2026-04-25)* — `createSite(brief, options)` is the single canonical site-creation path. Caller-owned auth (each entry point applies its own gate). Helper-owned TAG switch + WS notify on success path. `on_collision`: `'error'` (returns error_code: 'tag_exists'), `'update'` (same-business → updated_existing; different-business → still 'collision'), `'return_collision'` (same → updated_existing; different → 'collision'). Identity check uses `normalizeBizName` (lowercase, strip punctuation, strip noise words from `IDENTITY_STRIP_WORDS` set) and `checkSameBusinessIdentity()`.

**Brief Extraction** *(2026-04-25)* — `extractBriefFromMessage(text)` four-step logic: (1) Claude JSON extraction with meaningful-name + non-generic-tag check, (2) pattern-based proper-noun cluster (`extractBriefPatternBased`), (3) type+location synthesis via `tryTypeLocationSynthesis` for prompts like "a church in Atlanta" → tag `site-church-atlanta`, (4) insufficient_identity with `clarification_question`. `GENERIC_BUSINESS_TYPES` and `GENERIC_TAG_BLOCKLIST` ensure no silent fallback to "New Business" / "site-new-site".

**Build Trigger** *(2026-04-25)* — `triggerSiteBuild(ws, spec)` gates on WS clients before dispatch. Used by Studio Chat (`new_site_create` case) and Shay Desk (`handleShayBuildRequest`). Returns `{ triggered: boolean, reason?: 'no_ws_clients'\|'dispatch_error', error? }`. Real `ws` is used when provided; otherwise constructs a mockWs that broadcasts to all connected clients.

**Tier System** *(2026-04-24)* — `spec.tier` ('famtastic' | 'clean') is the canonical field. `famtastic_mode` is derived. `resolveTier(sources)` precedence: `explicit_request_tier > client_brief_tier > extracted_brief_tier > existing_spec_tier > 'famtastic'`. Invalid values at any slot are SKIPPED with `tier_normalization_warning` rather than corrupting an existing Tier-A spec. `normalizeTierAndMode()` runs at every readSpec — write-on-read repair pattern.

**Conversational Ack** — `getAckResponse(spec)` returns a contextual next-step suggestion. Zero API calls.

**Brain Routing Gate** — Before classifier: when `currentBrain !== 'claude'` and non-build intent → `handleBrainstorm()`.

**Content Data Layer** — `data-field-id` + `data-field-type` + `data-section-id` in all generated HTML. Surgical replacement via cheerio. `mutations.jsonl` logs every edit.

**DOM-aware Surgical Editor** — `lib/surgical-editor.js`. `buildStructuralIndex()` runs after every build. `extractSection()` + `surgicalEdit()` enable targeted section editing.

**Layer 0 Data Sources** *(Session 16)*: Gap Logger, Suggestion Logger, Brand Tracker, Deploy History, Agent Cards, Brief Corrections, Capability Manifest.

**Shay-Shay Seed** *(Session 16)* — `POST /api/shay-shay` orchestrator endpoint. Tier 0 deterministic routing. Tiers 1-3 AI via `callSDK()`. **Shay Desk full build chain** *(2026-04-25)* — `handleShayBuildRequest` async chain (auth → extract → createSite → synthesize → triggerSiteBuild) returns `shay_response` action.

**Tool Calling (Claude-only)** — `ClaudeAdapter._executeBlocking()` handles tool loop. `MAX_TOOL_DEPTH=3`. Tools: `get_site_context`, `get_component_library`, `get_research`, `dispatch_worker`, `read_file`. Gemini/OpenAI never receive tools.

**Client Interview + Revenue Architecture** — see Tech Stack. `buildPromptContext()` injects `REVENUE ARCHITECTURE` block.

**HTML Skeletons** — `lib/famtastic-skeletons.js`. BEM double-dash vocabulary enforcement. `FAMTASTIC_DEFAULT_PALETTE` injection on builds without client colors *(GAP-1 closed 2026-04-24)*.

**Deploy with Structured Failure Reasons** *(2026-04-25)* — `runDeploy` async with `await checkNetlify()` preflight before `deployInProgress` flag is set. `child.on('error', ...)` for spawn failures. `parseDeployStderr()` for known patterns (not-logged-in, network, site-id, permission, quota). `settle()` invariant resets `deployInProgress` on every early-return path.

### Three-Brain Ecosystem

**Brain Verifier** — `lib/brain-verifier.js`. Probes all 3 APIs at startup. `verifyAllAPIs()` runs concurrently. Results cached. `GET /api/brain-status` serves cached state.

**Brain/Worker Panel** — Brains: Claude/Gemini/OpenAI. Workers: claude-code/codex-cli/gemini-cli. Per-brain model selector dropdown.

**`ws.brainModels`** — Per-connection model overrides. Updated via `set-brain-model` WS message.

### Universal Context System

**`studio-events.js`** — Singleton EventEmitter. 10 events: `session:started`, `site:switched`, `build:started`, `build:completed`, `edit:applied`, `component:inserted`, `deploy:completed`, `brain:switched`, `research:updated`, `mode:changed`.

**`studio-context-writer.js`** — Regenerates `STUDIO-CONTEXT.md` on any event. 10 sections. CONTEXT_CACHE 30s TTL.

**`brain-injector.js`** — Per-brain context injection. `reinject()` on brain switch.

### Research Intelligence System

**`research-registry.js`** — 4 sources (gemini_loop, build_patterns, manual, perplexity). Effectiveness scoring persisted to `.local/research-effectiveness.json`.

**`research-router.js`** — Pinecone-first (configurable threshold, default 0.75), 90-day staleness with background refresh via `REQUERY_QUEUE`.

### Studio Chat UI

**Chat Session-Break Divider** *(2026-04-25)* — `addChatSessionBreak(label, opts)` in `index.html` inserts a styled divider into `#chat-messages` on TAG change (via `handleSiteSwitch`) and on WS reconnect (via `ws.onopen` after `/api/config` resolves). Dedupe via `__lastChatBreakTag` and `__lastChatBreakKey`. CSS: `.chat-session-break` in `studio-chat.css`.

---

## API Endpoints (Full)

### Core Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/new-site` | Refactored 2026-04-25: thin wrapper around `createSite()`. Returns `{ success: true, tag }` on create or `{ error, error_code: 'tag_exists' }` on collision. |
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
| POST | `/api/intel/dismiss` | Site-scoped dismiss — persists to `.dismissed-findings.json` |
| POST | `/api/intel/backlog` | Append finding to `.wolf/build-backlog.json` |
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
| GET | `/api/brain-status` | Live API verification state |
| GET | `/api/worker-queue` | Worker queue entries |
| POST | `/api/interview/start` | Start or resume client interview |
| POST | `/api/interview/answer` | Submit answer, get next question |
| GET | `/api/interview/status` | Interview state snapshot |
| GET | `/api/interview/health` | Interview system health check |
| GET | `/api/capability-manifest` | Live capability state (env checks + CLI availability) |
| POST | `/api/shay-shay` | Shay-Shay orchestrator. Tier-0 dispatcher now intercepts `build_request` BEFORE `handleShayShayTier0` and awaits `handleShayBuildRequest`. *(2026-04-25)* |
| POST | `/api/shay-shay/gap` | Explicit gap capture endpoint |
| POST | `/api/shay-shay/outcome` | Suggestion outcome scoring |
| POST | `/api/autonomous-build` | Trigger `runAutonomousBuild` (refactored to use `createSite`). |

**Route ordering rule:** Static routes must be declared BEFORE parameterized routes of the same prefix.

---

## Known Gaps

### Open

| Gap | Priority | Detail |
|-----|----------|--------|
| Build auto-fires from Shay Desk without confirmation | Tier 1 | New finding 2026-04-25. `handleShayBuildRequest` runs the full chain synchronously with no human-in-the-loop checkpoint. Logged as `bug-shay-auto-build-no-confirmation-2026-04-25`. Tracked in outstanding plan. |
| Generated site has broken header links | Tier 1 | New finding 2026-04-25. Post-baseline-closure church build has nav links that don't navigate correctly. Logged as `bug-broken-header-links-2026-04-25`. Investigation deferred to next session. |
| Revenue path (end-to-end) | Tier 1 | Client preview URL + payment (PayPal) + domain provisioning + approval flow. Reunion site (mbsh96reunion.com, July 12 deadline) is the first end-to-end exerciser. |
| Shay-Shay Mem0/Kuzu integration | Tier 1 | Persistent memory layer not yet wired. Episodic/semantic/procedural memory schemas defined but not connected to Mem0 MCP. |
| Shay Developer Mode (full UX) | Tier 1 | `authorizeShayDeveloperAction` is wired into `runAutonomousBuild` and `handleShayBuildRequest` but the explicit UI for trust-mode toggling, scoped permissions, approval flow, and audit trail is not yet built. |
| Schema audit follow-up (colors/pages) | Tier 2 | Pre-existing required-field mismatch tracked in `architecture/2026-04-24-schema-audit-followup.md`. Three resolution options scoped, not chosen. |
| V2 BuildIntent Phases 1-4 | Tier 1 | Interpreter in isolation, extractBriefFromMessage wiring, handlePlanning replacement, Shay-Shay routing unification. Tracked in outstanding plan. |
| Brand drift intelligence promotion | Tier 2 | Brand tracker logs drift to console. Not yet promoted to intelligence-promotions.json. |
| Agent cards not loaded by brain router | Tier 2 | Files exist but brain router still uses hardcoded config. |
| Pinecone + Perplexity firing on every build | Tier 2 | Nominally called per build but in-the-wild verification spotty. Outstanding plan #12. |
| FAMtastic-applied research query composer | Tier 2 | Research is generic by vertical; not yet FAMtastic-applied. Outstanding plan #13. |
| Conversation-based learning capture | Tier 2 | Captured Wizard-of-Oz orchestration decisions need a substrate to feed V2 Phase 1. Outstanding plan #14. |
| Worker queue consumer | Tier 2 | `.worker-queue.jsonl` has no live consumer process. |
| Detailed interview mode UI | Tier 3 | 10-question detailed mode works via API only. |
| Brain routing in build path | Tier 2 | Build/content-edit paths use Anthropic SDK (Claude only). Non-Claude brains only work for chat/brainstorm. |
| Mission Control / Platform dashboard | Tier 2 | No multi-site management UI beyond CLI. |
| Template upload mode | Tier 2 | Uploading pre-built templates for Studio to tweak. |
| Pinecone zero-vectors | Tier 3 | All Pinecone vectors use placeholder zero-vectors. |
| seed-pinecone --vertical flag | Tier 3 | Add `--vertical <name>` for per-build auto-seeding. |
| server.js decomposition | Tier 3 | ~18,400 lines after baseline closure. Plan: thin assembler + modules in lib/. |
| Deferred Tier-1 hot list (UX polish) | Tier 3 | Shay Desk chat scroll, max-width, redundant buttons. Batch in dedicated UI session per outstanding plan. |
| Plan packets / multi-agent plan board | Tier 1 | File-based first plan exists at `plans/plan_2026_05_04_shay_process_intelligence/`, and file-backed task/run/proof ledgers are now populated. Studio still has no first-class Plan Builder / Plan Board UI, no SQLite `plan_id` / `workstream_id` fields, and no automatic conversion from captured conversation to grouped jobs. |
| Workflow-as-data instrumentation | Tier 1 | Still open. `parallelBuild()` needs stage names, boundaries, inputs, outputs, and proof events captured before any declarative pipeline refactor. |
| Process Map / Recipe Map visualization | Tier 1 | Build trace and fulfillment ledger foundations exist, but no visual surface yet shows recipe steps, run traces, decision provenance, provider/model choices, token/cost details, research refs, verification, and follow-up jobs. |
| Workbench frozen-contract rebuild | Tier 1 | `docs/STUDIO-UI-FOUNDATION.md` is frozen, but the production-linked Workbench prototype still needs to be rebuilt against the required workspace contract before it can become the default Studio shell. |
| Workbench registry wiring | Tier 1 | Workbench Foundation is reachable from production Studio and standalone, but Plan mode still uses static data instead of `plans/registry.json`, task/run ledgers, or live job state. |
| Workbench Shay context provider | Tier 2 | Workbench is not registered in `ShayContextRegistry` yet, so Shay cannot directly act on selected Workbench scope/object/tool state. |
| Media Studio unification | Tier 2 | Workbench has a prompt-first Media Studio surface and production Studio has the richer mini-app in `studio-screens.js`; generation/provider controls are not unified between them yet. |

### Closed 2026-04-25 — Baseline failure closure

- **Site creation duplication** — `/api/new-site` and `runAutonomousBuild` had drifting site-creation logic; Studio Chat had no path to create new sites. Now: single canonical `createSite(brief, options)` helper used by all entry points.
- **Classifier deploy-keyword hijack** — `\bdeploy\b` at L10788 hijacked the church prompt before the `!hasBrief` fallback could fire. Now: `!hasBrief` moved above the deploy gate.
- **Studio Chat strong-build-signals brittleness** — Required exact word order, missed "build me a 3-page website for". Now: new `new_site_create` intent above strong build signals with flexible target detection (proper noun OR business-type+location OR no active site).
- **Silent "New Business" fallback** — `extractBriefFromMessage` silently produced `business_name: 'New Business'` and `tag: 'site-new-site'` for unparseable inputs. Now: returns `insufficient_identity` with clarification question.
- **`handlePlanning` wrong-site brief-write** — Routing `new_site` to `handlePlanning` when active site already had an approved brief would have written church content into accounting-firm spec. Now: Studio Chat `new_site_create` case bypasses handlePlanning and uses createSite directly. handlePlanning unchanged — remains brief-editor-only.
- **Orphaned build dispatch** — `runAutonomousBuild` dispatched build via `routeToHandler` BEFORE checking WS clients. Now: `triggerSiteBuild` gates on WS clients first; returns "Open Studio" message when no browser is connected.
- **Deploy invisible failures** — `runDeploy` swallowed Netlify auth/CLI failures behind a generic message. Now: `checkNetlify()` returns structured `{ ok, reason, details }`; preflight runs before flag mutation; `parseDeployStderr` parses known failure modes.

### Closed 2026-04-24 — Build layer GAP-1/2/3 + GAP-4 (R-NEW audit)

- **GAP-1: No FAMtastic default palette** — `buildPromptContext()` `visualRequirements` block now injects `FAMTASTIC_DEFAULT_PALETTE` (5 hex values) when no client colors are specified.
- **GAP-2: `heroSkeleton` dead variable on single-page path** — `handleChatMessage()` destructure and prompt string now include `heroSkeleton` (gated to `build`/`layout_update`).
- **GAP-3: `navSkeleton` dead variable on single-page path** — same fix; `navSkeleton` injected unconditionally into single-page prompt. All five mandated nav class names preserved.
- **GAP-4: `spec.famtastic_mode` tacit toggle never set by code** — Promoted `spec.tier` to canonical with precedence chain. `famtastic_mode` is now derived. `normalizeTierAndMode()` runs on every readSpec.

### Closed in earlier sessions

See CHANGELOG.md and the prior version of this doc for Sessions 11/12/13/16/17/18 closures.

---

## File Inventory

### Strategic Documents

| File | Purpose |
|------|---------|
| `FAMTASTIC-VISION.md` | North star — empire model, scaling milestones, revenue path |
| `FAMTASTIC-STATE.md` | This file — canonical technical snapshot |
| `FAMTASTIC-SETUP.md` | Disaster recovery — Quick Start, MCP servers, env vars, dependencies |
| `SITE-LEARNINGS.md` | Authoritative technical reference. New section "Baseline Closure Lessons (2026-04-25)" — adversarial review value, implementation order, ownership contracts, identity checks, Wizard-of-Oz, classifier-keyword-collision class. |
| `CHANGELOG.md` | Chronological session summaries. |
| `famtastic-dna.md` | Auto-updated build knowledge — injected into every Claude session. |
| `docs/FAMTASTIC-VISION-CAPTURE-2026-04-24.md` | **CANONICAL VISION DOC.** 11-section vision audit + Adobe Pattern Addendum + Architectural Decision Log (Tier as Canonical, Site Creation Contract) + parking-lot sections (On Shay-Shay, Meta-Research, Context Architecture). |
| `docs/STUDIO-MASTER-PLAN.md` | Studio-first execution source of truth. Wave-based roadmap. |
| `docs/multi-agent-resumable-plan-system.md` | Plan-packet architecture for grouping conversation-derived initiatives into parallel, resumable workstreams across Codex, CLI, Cowork, Shay, and future agents. Defines lifecycle, job grouping, access scopes, handoff rules, Studio surfaces, capture modes, and enforcement rules. *(2026-05-04)* |
| `plans/plan_2026_05_04_shay_process_intelligence/` | First file-based plan packet. Captures the Shay process intelligence initiative as ten workstreams with machine-readable `plan.json` and human-readable `README.md`. *(2026-05-04)* |
| `architecture/2026-04-24-gap4-plan.md` | GAP-4 investigation + closure plan. |
| `architecture/2026-04-24-gap4-review-summary.md` | GAP-4 adversarial review verdict. |
| `architecture/2026-04-24-schema-audit-followup.md` | Pre-existing colors/pages required-field mismatch. Deferred. |
| `architecture/2026-04-25-baseline-failure-diagnostic.md` | Forensic diagnostic of the JJ B&A baseline failure. 6 sub-gaps mapped. |
| `architecture/2026-04-25-baseline-closure-verification.md` | 28/28 verification report. |
| `architecture/2026-04-25-outstanding-plan.md` | **WORKING ROADMAP.** Iterative plan forward — Immediate / Near-term / Medium-term / Longer-term parking lot + Principles to hold. |

### Core Application

| File | Lines | Purpose |
|------|-------|---------|
| `site-studio/server.js` | ~18,400 | Main backend. Express + WebSocket. Classifier (with `new_site_create` intent + reordered gates). `createSite()` helper, `handleShayBuildRequest`, `triggerSiteBuild`, `synthesizeDesignBriefForBuild`, `extractBriefFromMessage` (status-based), `runDeploy` (with preflight + spawn error + stderr parsing). All site-creation paths now go through `createSite`. |
| `site-studio/lib/tier.js` | ~80 | Tier canonicalization. `resolveTier(sources)` precedence chain, `normalizeTierAndMode(spec)` write-on-read. *(2026-04-24)* |
| `site-studio/lib/tier-gates.js` | ~40 | Pure gate helpers extracted from server.js: `getLogoSkeletonBlock`, `getLogoNoteBlock`, `shouldInjectFamtasticLogoMode`. *(2026-04-24)* |
| `site-studio/lib/capability-manifest.js` | ~115 | `checkNetlify()` returns structured `{ ok, reason, details }`. Exported for direct use by `runDeploy` preflight. |
| `site-studio/lib/gap-logger.js` | ~90 | Gap event logger. Auto-promotes at frequency ≥ 3. |
| `site-studio/lib/suggestion-logger.js` | ~90 | Suggestion outcome logger. Pattern promotion. |
| `site-studio/lib/brand-tracker.js` | ~80 | Brand token extractor. Drift detection. |
| `site-studio/lib/surgical-editor.js` | ~200 | DOM-aware surgical editor. |
| `site-studio/lib/famtastic-skeletons.js` | — | `HERO_SKELETON_TEMPLATE`, `LOGO_SKELETON_TEMPLATE`, `LOGO_NOTE_PAGE`, `NAV_SKELETON`, `FAMTASTIC_DEFAULT_PALETTE`. |
| `site-studio/lib/client-interview.js` | — | Client interview engine. |
| `site-studio/lib/brain-verifier.js` | — | Startup API verification. |
| `site-studio/lib/model-config.json` | — | Canonical model registry. |
| `site-studio/lib/studio-tools.js` | — | 5 Anthropic-format tools (Claude-only). |
| `site-studio/lib/tool-handlers.js` | — | Tool dispatch + path traversal sandbox. |
| `site-studio/lib/studio-events.js` | — | Singleton EventEmitter + 10 event constants. |
| `site-studio/lib/brain-interface.js` | — | Universal Studio-to-Brain communication. |
| `site-studio/lib/brain-adapter-factory.js` | — | `BrainAdapterFactory.create(brain)` → adapter. |
| `site-studio/lib/adapters/claude-adapter.js` | — | Anthropic SDK. Tool loop with `MAX_TOOL_DEPTH=3`. |
| `site-studio/lib/adapters/gemini-adapter.js` | — | Google Generative AI. |
| `site-studio/lib/adapters/codex-adapter.js` | — | OpenAI SDK. `gpt-4o`. |
| `site-studio/lib/brain-sessions.js` | — | Auth probe, session management. |
| `site-studio/lib/api-telemetry.js` | — | `logAPICall()`, cost tracking. |
| `site-studio/lib/api-cost-tracker.js` | — | `calculateCost(model, in, out)`. |
| `site-studio/lib/studio-context-writer.js` | — | STUDIO-CONTEXT.md generator. |
| `site-studio/lib/brain-injector.js` | — | Per-brain context injection. |
| `site-studio/lib/history-formatter.js` | — | Per-brain history format. |
| `site-studio/lib/research-registry.js` | — | 4 research sources. |
| `site-studio/lib/research-router.js` | — | Pinecone-first cache. |
| `site-studio/lib/font-registry.js` | — | 5 vertical-aware font pairings. |
| `site-studio/lib/layout-registry.js` | — | 5 layout variants. |
| `site-studio/agent-cards/` | — | claude/codex/gemini .agent-card.json files. |
| `site-studio/shay-shay/skill.json` | — | Shay-Shay capability vocabulary. |
| `site-studio/shay-shay/instructions.md` | — | Shay-Shay behavioral contract. |
| `site-studio/public/index.html` | ~7,300 | Single-file frontend. `addChatSessionBreak()` helper, called from `handleSiteSwitch` and `ws.onopen`. |
| `site-studio/public/css/studio-base.css` | — | Resets, layout, typography. |
| `site-studio/public/css/studio-panels.css` | — | Three-panel layout, resizers. |
| `site-studio/public/css/studio-chat.css` | — | Chat panel, messages, plan cards. New `.chat-session-break` divider styling. *(2026-04-25)* |
| `site-studio/public/css/studio-sidebar.css` | — | Tabs, mode selector, status bar. |
| `site-studio/public/css/studio-modals.css` | — | Settings, upload, modal dialogs. |
| `site-studio/public/css/studio-terminal.css` | — | Terminal panel and toolbar. |
| `site-studio/public/css/studio-canvas.css` | — | Canvas panes. |
| `site-studio/public/css/studio-brain-selector.css` | — | Brain/Worker panel. |
| `site-studio/public/css/studio-orb.css` | — | Pip orb + Shay-Shay column styles. |
| `site-studio/public/js/brain-selector.js` | — | `BrainSelector` IIFE. |
| `site-studio/public/js/worker-queue-badge.js` | — | Worker queue badge polling. |
| `site-studio/public/js/studio-orb.js` | ~1,000 | Pip orb + Shay-Shay client. Falls through to `data.response` for `shay_response` action. |
| `site-studio/public/js/studio-shell.js` | — | Shell init, intel feed, site switcher. |
| `site-studio/.dismissed-findings.json` | — | Site-scoped intelligence dismiss store. |
| `.wolf/build-backlog.json` | — | Append-only build backlog. |
| `mcp-server/server.js` | 343 | MCP server. 4 tools via stdio JSON-RPC. |

### Test Suites

| Suite | Tests | Status |
|-------|-------|--------|
| `tests/unit.test.js` | 110 | Vitest. Pre-existing classifier + helper coverage + Part B tier parity tests. |
| `tests/gap4-tier-canonicality.test.js` | 28 | Vitest. V5 GAP-4 tier canonicality lockdown. *(2026-04-24)* |
| `tests/baseline-closure.test.js` | 23 | Vitest. NEW. classifier reordering, identity helpers, type+location synthesis. *(2026-04-25)* |
| Legacy node-script suites | ~1,236 | In `tests/` folder. Not gating. Test runner: `npm test` runs vitest only. |

**Vitest total: 161/161 passing across 3 files.**

### Key Functions (post-baseline-closure)

| Function | File | Purpose |
|----------|------|---------|
| `createSite(brief, options)` | server.js | Canonical site-creation helper. *(2026-04-25)* |
| `handleShayBuildRequest(message, context)` | server.js | Shay Desk full async build chain. *(2026-04-25)* |
| `triggerSiteBuild(ws, spec)` | server.js | Canonical build dispatcher. Gates on WS clients first. *(2026-04-25)* |
| `synthesizeDesignBriefForBuild(brief)` | server.js | Synthesize design_brief on active spec. Idempotent. *(2026-04-25)* |
| `extractBriefFromMessage(text)` | server.js | Returns status-based shape (extracted / insufficient_identity). *(2026-04-25)* |
| `tryTypeLocationSynthesis(text, baseBrief)` | server.js | Pattern → tag for "type in location" prompts. *(2026-04-25)* |
| `checkSameBusinessIdentity(a, b)` | server.js | Same-business comparison after noise-word stripping. *(2026-04-25)* |
| `normalizeBizName(name)` | server.js | Punctuation/noise-word strip helper. *(2026-04-25)* |
| `parseDeployStderr(stderr)` | server.js | Known-failure-pattern matcher for deploy errors. *(2026-04-25)* |
| `resolveTier(sources)` | lib/tier.js | Precedence-ordered tier resolver with invalid-skip semantics. *(2026-04-24)* |
| `normalizeTierAndMode(spec)` | lib/tier.js | Write-on-read tier/famtastic_mode repair. *(2026-04-24)* |
| `classifyRequest(message, spec)` | server.js | New `new_site_create` gate; `!hasBrief` moved above deploy. *(2026-04-25)* |
| `getAckResponse(spec)` | server.js | Zero-cost conversational ack. |
| `writeSpec(spec)` | server.js | Atomic spec.json write via .tmp + renameSync. |
| `routeToHandler(ws, requestType, userMessage, spec)` | server.js | Intent dispatch. |
| `runPostProcessing()` | server.js | 9-step pipeline after build. |
| `buildStructuralIndex()` | lib/surgical-editor.js | Scans DOM for sections/fields/slots. |
| `extractSection()` | lib/surgical-editor.js | Returns targeted node HTML. |
| `surgicalEdit()` | lib/surgical-editor.js | Cheerio DOM replacement. |
| `handleChatMessage()` | server.js | Primary SDK streaming handler. |
| `handleBrainstorm()` | server.js | Routes to selected brain. |
| `parallelBuild()` | server.js | SDK parallel page builds. |
| `updateFamtasticDna()` | server.js | Auto-updates famtastic-dna.md after every build. |
| `verifyAllAPIs()` | lib/brain-verifier.js | Concurrent probe of all 3 APIs. |
| `checkNetlify()` | lib/capability-manifest.js | Structured `{ ok, reason, details }` return. *(2026-04-25)* |
| `runDeploy(ws, env)` | server.js | Async with preflight + spawn error + stderr parsing + settle invariant. *(2026-04-25)* |
| `addChatSessionBreak(label, opts)` | public/index.html | Inserts session-break divider into chat. *(2026-04-25)* |

### Scripts

| File | Purpose |
|------|---------|
| `scripts/fam-hub` | Unified CLI: site, idea, agent, admin, convo, ingest, research |
| `scripts/gemini-cli` | Gemini API CLI (Node.js, gemini-2.5-flash) |
| `scripts/orchestrator-site` | Batch site generation |
| `scripts/stock-photo` | 3-provider stock photo downloader |
| `scripts/site-deploy` | Deploy to Netlify/Cloudflare/Vercel |
| `scripts/asset-generate` | SVG asset pipeline |
| `scripts/google-media-generate` | Imagen 4 / Veo 2 media generation |
| `scripts/seed-pinecone` | Seed Pinecone index from site specs |
| `scripts/intelligence-loop` | Per-site intelligence reports |
| `scripts/fam-convo-*` | Multi-agent conversation pipeline |
| `scripts/install.sh` | Install flow (consolidated from famtastic-dev-setup) |

### Per-Site Files

| File | Purpose |
|------|---------|
| `sites/<tag>/STUDIO-CONTEXT.md` | Universal context — regenerated on every studio event. |
| `sites/<tag>/spec.json` | Design brief, decisions, content fields, media specs, deploy info. **Now includes `tier` (canonical), derived `famtastic_mode`, `tier_normalization_warning`.** *(2026-04-24)* |
| `sites/<tag>/agent-calls.jsonl` | Per-call agent telemetry. |
| `sites/<tag>/sdk-calls.jsonl` | Per-call Anthropic SDK cost log. |
| `sites/<tag>/mutations.jsonl` | Field-level edit log. |
| `sites/<tag>/intelligence-promotions.json` | Promoted intelligence findings. |
| `sites/<tag>/deal-memo.md` | Rank-and-rent deal memo. |
| `.worker-queue.jsonl` | Worker dispatch queue (root of repo). |
| `.local/research-effectiveness.json` | Research source effectiveness scores. |
| `plans/consolidation-2026-05-04.json` | Earlier proposed parent-lane consolidation packet; superseded by the applied four-parent `plans/registry.json`. |
| `plans/consolidation-verification-2026-05-04.md` | Verification proposal that led to the applied four-parent registry; retained as evidence. |
| `plans/consolidated-execution-checklist-2026-05-04.md` | Working four-plan execution checklist that parks the stale Total Ask as strategy context and maps remaining P0/P1/P2 asks to `studio-workbench-foundation`, `plan-task-run-intelligence`, `build-intent-fulfillment-trace`, and `site-mbsh-reunion`. |
| `plans/registry.backup-2026-05-04.json` | Backup of the prior 11-record pilot registry before the four-parent consolidation rewrite. |
| `tasks/tasks.jsonl` | Append-only task ledger; now populated with consolidated P0/P1/P2 tasks tied to the four parent plans. |
| `runs/runs.jsonl` | Append-only run ledger; now contains the active consolidation apply run. |
| `proofs/proof-ledger.jsonl` | Append-only proof ledger; now contains proof records for registry rewrite, task/run/proof setup, Drive-sync status correction, and CLI verification. |
| `docs/STUDIO-UI-FOUNDATION.md` | Frozen canonical Site Studio UI foundation and required workspace contract. Supersedes prior shell/layout proposals that conflict with the domain-level left nav, purpose-reactive workspaces, ambient Shay, Fritz filter, Night visual system, prompt-first Media Studio, contextual tools, or plan-then-approve. |
| `docs/decisions.jsonl` | Append-only UI/product decision ledger seeded with the Studio UI Foundation freeze decision. |
| `captures/inbox/2026-05-04-workbench-foundation.capture.json` | Proposed intelligence-loop capture packet for Workbench foundation decisions, complaints, research sources, gaps, and promotion targets. |
| `captures/inbox/2026-05-04-studio-ui-foundation-freeze.capture.json` | Approved intelligence-loop capture packet for the Studio UI Foundation freeze. |
| `handoffs/studio-ui-foundation-freeze-2026-05-04.md` | Freeze handoff for future implementation work, including build order and hard stops. |
| `site-studio/public/data/workbench-workspaces.json` | Workbench mode contract defining purpose, center surface, primary objects, capabilities, proof requirements, and anti-patterns for Build, Plan, Components, Media Studio, Research, and Deploy. |

### OpenWolf Files

| File | Git | Purpose |
|------|-----|---------|
| `.wolf/anatomy.md` | tracked | File index with token estimates. |
| `.wolf/cerebrum.md` | tracked | Patterns, preferences, do-not-repeat rules. **Architectural decisions go in vision capture doc, NOT cerebrum.** |
| `.wolf/buglog.json` | tracked | Bug tracking across sessions. New entries 2026-04-25: JJ B&A R-NEW audit, baseline closure, auto-build no-confirmation, broken header links. |
| `.wolf/memory.md` | ignored | Per-session action log (ephemeral). |

---

## Developer Environment

### Runtime

- Studio is managed by **macOS launchd** as `com.famtastic.studio`. NEVER start manually with `node server.js`.
- Restart button calls `process.exit(0)` → launchd restarts in ~2s.
- Tail logs: `tail -f /tmp/studio.log`
- Force restart from terminal: `launchctl stop com.famtastic.studio`
- plist: `~/Library/LaunchAgents/com.famtastic.studio.plist`
- Runtime site variable is `TAG` (mutable) — NOT `process.env.SITE_TAG` (startup snapshot, goes stale).
- Express route ordering: static routes BEFORE parameterized routes of same prefix.
- Brain routing gate fires before classifier — check `currentBrain` before any intent logic.
- `STUDIO_NO_LISTEN=1` skips `server.listen()` for test mode.

### Security Constraints

- `read_file` tool: `path.resolve + startsWith(siteRoot + sep)` check — mandatory.
- `writeSpec()`: atomic write via `.tmp` + `renameSync` — never `writeFileSync` directly to SPEC_FILE().
- `createSite()` performs same atomic-write pattern for new spec.
- Never concatenate user input into shell strings.

### Standing Rules (Do Not Repeat)

- `TAG` not `process.env.SITE_TAG` inside any route handler.
- `library.json` is `{ version, components[], last_updated }` — always extract `.components`.
- Static Express routes before parameterized routes of same prefix.
- Every HTML write path through `runPostProcessing()` — no exceptions.
- BEM double-dash vocabulary (`--bg` not `-bg`).
- Inline styles prohibited in generated site HTML.
- Parallel page spawns must NOT emit logo SVGs — only the template call emits them.
- Nav class names must match `NAV_SKELETON` vocabulary.
- `#pip-dynamic-area` transitions go through `setOrbState(state, data)` only.
- Preview server must strip query string before filesystem lookup.
- All site-creation paths must go through `createSite()` — no inline `fs.mkdirSync(siteDir) + writeFileSync(spec)` patterns. *(2026-04-25)*
- `extractBriefFromMessage` returns `{ status, ... }` — callers must check status before accessing brief fields. *(2026-04-25)*
- `triggerSiteBuild` gates on WS client presence — never dispatch builds with no observer. *(2026-04-25)*
- `spec.tier` is canonical; `famtastic_mode` is derived. Never set `famtastic_mode` directly. *(2026-04-24)*
- `runDeploy` preflight runs BEFORE `deployInProgress` is set. The flag is reset on every early-return via `settle()`. *(2026-04-25)*
- Architectural decisions live in `docs/FAMTASTIC-VISION-CAPTURE-2026-04-24.md`, NOT cerebrum.

---

## Deployed Sites

| Site | URL | Pages | Deploy Date |
|------|-----|-------|-------------|
| The Best Lawn Care | https://the-best-lawn-care.netlify.app | 7 | 2026-03-20 |
| Auntie Gale's Garage Sales | https://effortless-tiramisu-ed9345.netlify.app | 5 | 2026-04-08 |
| Drop The Beat Entertainment | built, not deployed | 3 | 2026-04-10 |

---

## Pending Tasks

### This Week

- **Send PR to `ringo380/cpanel-mcp`** with the UAPI v3 response-parser fix
  (see `~/famtastic/tools/cpanel-mcp/PATCHES.md`). Without this patch every
  tool call fails with `Cannot read properties of undefined (reading 'event')`
  because the shipped client parses the legacy cPanel JSON-API shape but
  hits the modern `/execute/<Module>/<func>` UAPI v3 endpoint.
- **Fork-fallback check-in: 2026-05-13.** If the PR has not been reviewed
  by then, fork `ringo380/cpanel-mcp` publicly under `famtastic-fritz`,
  repoint the local clone's `origin` at the fork, and record the fork URL
  in `~/famtastic/tools/cpanel-mcp/PATCHES.md`. This stops every fresh
  clone or upstream pull from silently wiping the fix.
- **MBSH addon domain (manual):** add `mbsh96reunion.com` in cPanel by hand
  — the MCP does not yet expose `create_addon_domain`. Tracked as the #1
  Layer-2 extension in `docs/operating-rules/godaddy-mcp-spike.md`.

---

## What's Next

The full iterative roadmap is in `architecture/2026-04-25-outstanding-plan.md`.

Quick view:

**Immediate (next session):** JJ B&A site build + refine; fix broken header links bug; fix auto-build-trigger UX.

**Near-term (this week):** Edge case test suite design (5 categories); Wizard-of-Oz orchestrated build session; Reunion site (July 12 deadline).

**Medium-term (2-4 weeks):** V2 BuildIntent Phases 1-4; brain adapter additions (DeepSeek V4-Flash, Kimi K2.6); Pinecone+Perplexity verification; FAMtastic-applied research composer; conversation-based learning capture; client review/preview/payment flow verification.

**Longer-term (parking lot):** Shay relational identity (numerology), meta-research category, context architecture deep dive, Lite-to-Desk routing, log monitoring, Component/Media/Think Tank studio extractions, promotion layer, schema audit follow-up, UI polish.

**Principles to hold:** baseline always works end-to-end before adding features; adversarial review before structural changes; caller-owned vs helper-owned contracts in JSDoc; identity checks before destructive operations; capture corpus from every session; Tier B is FAMtastic default, Tier A is opt-in; documentation lives in vision capture doc.
