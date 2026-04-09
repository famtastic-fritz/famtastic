# Cerebrum

> OpenWolf's learning memory. Updated automatically as the AI learns from interactions.
> Do not edit manually unless correcting an error.
> Last updated: 2026-03-24

## Tool Availability (Verified April 8, 2026)

### Image Generation
- Google Imagen 4.0: AVAILABLE (Gemini API, $25 funded, ~$0.004/image)
- Leonardo.ai Phoenix: AVAILABLE (API, $5 free credit, ~$0.016/image)
- Adobe Firefly API: NOT AVAILABLE (requires enterprise $1K+/mo — verified in Developer Console)
- Adobe Firefly Web: AVAILABLE (Playwright automation, CC credits)

### Video Generation
- Google Veo: AVAILABLE (Gemini API, tested, 33s generation, 1.6MB output)
- Adobe Firefly Video: AVAILABLE via web only (CC credits, no API)

### Post-Processing
- Photoshop via adb-mcp: PARTIALLY AVAILABLE (installed, UXP plugin load bug being fixed)
- Premiere via adb-mcp: PARTIALLY AVAILABLE (installed, same UXP dependency)

### Code Review
- Codex plugin: AVAILABLE (/codex:review, /codex:adversarial-review, /codex:rescue)
- Codex MCP (official): AVAILABLE (Claude Desktop)
- Codex Bridge MCP: AVAILABLE (Claude Desktop)

### Standing Rule
Never attempt Adobe Firefly API calls. They will always fail.
Route to Google Imagen API or Firefly web via Playwright instead.
Every new API integration must be verified in the capability
registry before first use.

## User Preferences

<!-- How the user likes things done. Code style, tools, patterns, communication. -->

## Key Learnings

- **Summarization always uses Claude:** When conversation history exceeds 20 turns, the oldest 10 turns are summarized using Claude regardless of the currently active brain. This is a standing decision. Do not change to the active brain. Logged with source: "summarization".

- **Project:** famtastic
- **Description:** Owns adapters, router/config, and installers for agents. Writes local sources to:
- **Post-processing pipeline order matters:** extractAndRegisterSlots MUST run before reapplySlotMappings, otherwise renamed slots lose their images
- **buildPromptContext mutates currentPage:** This was a hidden side effect — now returns resolvedPage instead, caller updates explicitly
- **syncHeadSection 80-char fingerprint:** Style blocks were matched by first 80 chars which missed content-only updates. Now uses MD5 hash.
- **extractSharedCss strips ALL non-data-page styles:** This was removing page-specific styles. Now only strips styles that match content extracted from index.html.
- **summarizeHtml was a no-op:** It appended "FULL HTML:" + full source after the summary, defeating the purpose. Fixed to return summary only.
- **classifyRequest false positives:** "history" alone triggered version_history, "restore" alone triggered rollback. Both now require version/previous context words.
- **Multi-page fallback path has no post-processing:** When Claude's multi-page response failed to parse, HTML was written directly without any post-processing. Now calls runPostProcessing.
- **Single-page edits skip ensureHeadDependencies:** Only full builds called it. Now single-page edits call it too.
- **gemini-cli stdin consumed twice:** bash `$(cat)` reads stdin, then Python `os.read(0,...)` tries again on empty stdin. Fixed by piping with printf.
- **precommit-security had unclosed quote:** The security grep was silently bypassed because a single quote was never closed, swallowing the pipe.
- **Parallel build timeout race condition:** Timeout handler AND close handler both incremented `innerCompleted`. Fixed by removing increment from timeout (kill triggers close).
- **Two browser tabs cause session reset:** Each new WS connection called `startSession()`. Now only the first connection starts a session.
- **`chat` WS type dropped silently:** Server sent `{type:'chat'}` for build-in-progress errors but client had no handler. Added `case 'chat':` handler.
- **Template font URLs break with multi-word fonts:** `{{HEADING_FONT}}` in Google Fonts URL produced broken URLs for "Playfair Display". Added `{{HEADING_FONT_URL}}` with `+` encoding.

- **bp.global is dead code:** buildBlueprintContext() only reads bp.pages[page], never bp.global. nav_style, footer_style, logo are written but never injected into prompts.
- **Blueprint components never reconcile:** mergeComponents() only adds, never removes. Deleted popups/modals persist forever, causing Claude to re-insert them.
- **Blueprint escape hatch too wide:** "User requests always take priority" lets any change request override all blueprint protections. No mechanism to distinguish "change X" from "change Y but preserve X".
- **Blueprint title regex has stray pipe:** `/<title[^>]*>([^<|]+)/i` — the `|` in character class stops matching at literal pipe. Minor but technically wrong.
- **No blueprint page cleanup:** Deleted pages stay in bp.pages forever. Need reconciliation against DIST_DIR files.
- **restyle routes to handlePlanning() — wrong handler:** The routing switch at line ~4757 sends `restyle` to `handlePlanning()` (brief creation flow) instead of `handleChatMessage()`. The restyle mode instruction exists inside handleChatMessage but is unreachable dead code. Need to route restyle to handleChatMessage.
- **No conversational ack type:** Messages like "yes", "ok", "looks good" when brief exists fall to `layout_update` default and trigger full Claude HTML generation. Need a `conversational_ack` or `affirmation` classifier type.
- **fill_stock_photos too aggressive:** "add an image to the hero section" triggers bulk stock fill. Needs guard to distinguish single-image targeted requests from bulk fills.
- **asset_import catches hero as section name:** "create a hero section" fires asset_import because `hero` matches. Needs image/asset context words to disambiguate.
- **bug_fix catches non-bug uses of "fix":** "fix the colors to match brand" → bug_fix mode that says "fix only the specific problem, don't change design direction" — suppresses the actual change.
- **brainstorm-to-build hard-codes layout_update:** Should infer request type from brainstorm discussion context.
- **handleQuery() silent no-op:** If none of 4 internal branches match, user gets no response at all.
- **Prompt injection:** userMessage is injected verbatim into Claude prompt at `USER REQUEST: "${userMessage}"`. Pasted code/adversarial text has no sanitization.

- **POST /api/replace-placeholder has no newSrc validation:** Can inject `onerror="alert(1)"` into every `<img>` tag. Fix: validate scheme (only assets/, http(s)://), length cap, reject event handler patterns.
- **WebSocket has no origin check:** wss.on('connection') never validates Origin header. Any localhost page can establish a WS connection. Fix: check origin against localhost:3334.
- **DELETE /api/projects/:tag has no path traversal check:** `../important-dir` as tag would move directories above sites/. Fix: validate tag against `/^[a-z0-9][a-z0-9-]*$/`.
- **set-page WS message skips isValidPageName():** `../spec.json` as page could overwrite spec.json via Claude. Fix: call isValidPageName() before path operations.
- **6 dead settings in studio-config.json:** `deploy_target` (never forwarded to deploy script), `deploy_team` (script hardcodes "fritz-medine"), `max_upload_size_mb` (multer uses hardcoded 5MB), `max_versions` (never enforced), `preview_port`/`studio_port` (server reads env vars). Fix: wire each setting to its actual behavior or remove from UI.
- **analytics_provider/analytics_id have no Settings UI:** Build pipeline injects GA4/Plausible snippets but there's no modal field to configure them. Must edit studio-config.json by hand.
- **Site switch writes summary to wrong site:** endSession() is not awaited before TAG changes on site switch. generateSessionSummary resolves SUMMARIES_DIR() after TAG has changed, writing the summary to the new site's directory. Fix: await endSession() before changing TAG, or capture SUMMARIES_DIR() path before the switch.
- **134/137 ws.send calls unguarded:** No ws.readyState check before sending in child.on('close') and other build completion handlers. Mid-build WS disconnect causes unhandled throw → potential server crash. Fix: wrap all ws.send in a safeSend(ws, data) helper that checks readyState.
- **generateSessionSummary can hang gracefulShutdown:** Failed fs.writeFileSync inside the promise never calls resolve(). gracefulShutdown awaits endSession() which awaits the summary → SIGTERM handler blocks forever. Fix: wrap writeFileSync in try/catch inside the promise.
- **Client onmessage has no JSON.parse guard:** Malformed server message throws uncaught in the handler. Fix: wrap JSON.parse in try/catch.
- **MCP server is read-only:** 4 tools read from disk only. No write capability — cannot trigger builds, switch pages, fill images, or post chat messages. Studio has 40+ REST endpoints that should be exposed as MCP tools.
- **No programmatic chat/build endpoint:** Builds can only be triggered via browser WebSocket. Adding `POST /api/chat` would make the system scriptable from MCP, CLI, and CI.
- **Playwright MCP unused:** Installed but not connected to build validation or test pipeline. Should validate generated sites after builds.
- **settings.local.json has dead paths:** 155 allow entries reference old repos (famtastic-agent-hub, famtastic-platform, famtastic-think-tank) from before consolidation.
- **User brainstorm messages not tagged:** Only assistant responses get `intent:'brainstorm'`. User messages have no intent tag. Context-gathering heuristic at brainstorm-to-build transition is fragile — breaks if non-brainstorm entry appears mid-session.
- **20-message brainstorm cap drops context silently:** Long brainstorm sessions lose earliest ideas with no warning or summary step. No truncation notice in build instruction.
- **Empty brainstorm → "Build this" is destructive:** Falls through as literal `layout_update "Build this"` with no brainstorm context. Classifier bypassed. Could cause unintended regeneration.
- **Blueprint layout_notes never populated:** The `startsWith('assistant:')` filter in brainstorm-to-blueprint fails for multi-line content. All real sites have `layout_notes: []`.
- **No brainstorm-vs-brief conflict detection:** If brainstorm discusses contradicting the brief (e.g., "go dark mode" when brief says "white"), Claude reconciles silently with no flagging step.
- **DELETE /api/upload doesn't clean slot_mappings:** Deleting an upload removes it from uploaded_assets and disk but not from slot_mappings. The orphaned mapping gets reapplied on every rebuild → broken image in production. Fix: also delete slot_mappings entry pointing to that file.
- **parallelBuild missing slot stability instruction:** _slotStabilityInstruction is only built inside handleChatMessage, never inside parallelBuild. Full rebuilds let Claude rename slot IDs freely, orphaning all mappings. Fix: inject slot stability per-page in parallel build prompts.
- **clearSlotAssignment is non-atomic:** Two sequential calls (replace-slot then clear-slot-mapping). If second fails, media_specs shows status='uploaded' for a transparent GIF. Fix: create a dedicated clear endpoint or make it atomic.
- **reapplySlotMappings hardcodes status:'uploaded':** Stock photo slots become 'uploaded' after rebuild. Fix: store original status in slot_mappings and restore it.
- **scanBrandHealth has write side effect:** Writes spec.brand_health on every GET call, invalidating spec cache. Should compute and return without persisting, or cache separately.
- **spec.json schema required fields never written:** `colors` and `pages` are marked required in site-spec.schema.json but are never populated. Code falls through to `design_brief.must_have_sections` for pages and `extractBrandColors()` for colors. Schema is decorative — no runtime validation.
- **.studio.json has no write-through cache:** Unlike spec.json (readSpec/writeSpec), `.studio.json` uses raw read-modify-write from 4 code paths (versionFile, saveStudio, startSession, generateSessionSummary). Lost-write race possible during async summary generation.
- **writeSpec() not atomic:** Uses `fs.writeFileSync()` directly — no `.tmp` + rename pattern. Process crash mid-write could corrupt spec.json.
- **media_specs / slot_mappings redundancy:** Two structures track same slots with overlapping data. Could be unified by adding src/alt/provider/credit/query to media_specs entries directly.
- **business_type always empty:** Read in 6 places (SEO, stock queries, new-site flow) but written as empty string during creation and never updated.
- **design_decisions garbage entries:** extractDecisions() can capture AI prompt fragments as decisions. `superseded` status exists in schema but no code path ever sets it.
- **PUT /api/settings allowedKeys incomplete:** Nested objects (email, sms, stock_photo) can't be modified through the settings API — only direct file edit works.

## Do-Not-Repeat

<!-- Mistakes made and corrected. Each entry prevents the same mistake recurring. -->
<!-- Format: [YYYY-MM-DD] Description of what went wrong and what to do instead. -->
- [2026-03-25] Never mutate module-level state inside a function that looks like a pure reader (buildPromptContext). Return the resolved value and let the caller mutate.
- [2026-03-25] When extracting shared CSS, only strip blocks whose content matches what was extracted — don't blindly strip all non-data-page style blocks.
- [2026-03-25] String prefix matching (substring(0, 80)) is unreliable for deduplication. Use content hashes.
- [2026-03-25] Every HTML write path must go through runPostProcessing — no exceptions, including fallback paths.
- [2026-03-25] When a timeout handler kills a process, don't increment counters in both the timeout and the close event — the close event already fires from kill().

- **Root cause of all integration failures:** Five independent state readers (classifyRequest, buildPromptContext, runPostProcessing, HTTP handlers, WS handler) all read state from disk/globals independently. When one modifies state, others don't know. This is a state architecture problem, not a logic problem.
- **POST-PROCESSING CONTEXT section needed in prompts:** Claude doesn't know what happens to its output (nav sync, CSS extraction, head injection). Adding ~120 tokens of pipeline description prevents an entire class of CSS consistency and slot drift bugs.
- **server.js decomposition plan:** 5381 lines → ~200 line thin assembler + 12 modules in lib/. Key modules: SessionStore (owns all mutable state), SiteSpec (write-through cache), PromptBuilder (guaranteed context inclusion), Classifier (confidence tiers + session context), PostProcessor (document-map pattern — read once, mutate in-memory, write once), ClaudeRunner, ResponseParser, SlotManager, StockPhotoService, BlueprintStore, Settings (TTL cache), ConversationLog (with intent field).
- **Phase priority: 3→2→1→4→5→6→7.** PromptBuilder first (highest UX ROI), then ConversationLog+Settings, then SessionStore, then Classifier, then PostProcessor, then route extraction, then UI JS extraction.

## Decision Log

<!-- Significant technical decisions with rationale. Why X was chosen over Y. -->
- [2026-03-25] TEMPLATE-FIRST ARCHITECTURE APPROVED: Build `_template.html` first (header, nav, footer, shared CSS, head deps) in one Claude call, then build ALL pages in true parallel. Each page copies chrome verbatim from template, generates only `<main>` content + `<style data-page="pagename">` block. Eliminates 7 of 11 post-processing steps (syncNav, syncFooter, syncHead, ensureHeadDeps, extractSharedCss, reconcileSlotMappings, CSS seed extraction). Template uses `data-template="shared|header|footer"` attribute anchors for extraction. Per-page CSS stays inline (not separate files) at 3-10 page scale. `_template.html` lives in dist/ but is excluded from deploys. All SSGs (Hugo, Eleventy, Astro, Jekyll) use this pattern. Implementation: 5 phases, each independently shippable.
- [2026-03-25] POST-PROCESSING ORDER: extract slots → reapply mappings → metadata → reconcile → logo → nav/footer → head deps → head sync → CSS extract. This ensures slots exist before mappings are applied, and head dependencies are injected before head sync propagates them.
- [2026-03-25] SPEC WHITELIST: Only design_brief, design_decisions, site_name, business_type can be updated via WS update-spec. This prevents arbitrary spec overwrites.
- [2026-03-25] SETTINGS REDACTION: GET /api/settings redacts all API keys, showing only `_configured: true/false`. POST still accepts full values for saving.
- [2026-03-25] CLASSIFIER ANCHORING: version_history requires "version" as anchor word. Rollback requires "version" or "previous" near "restore". This prevents false positives on common words.
- [2026-04-07] VS_CODE_LAYOUT: Studio layout is now left sidebar + tabbed canvas + CLI bar + right sidebar. Key IDs: #left-sidebar, #center-area, #canvas-area, #canvas-tab-bar, #cli-bar, #cli-tab-bar. Old #chat-panel replaced by #cli-chat, old #preview-panel content moved to #canvas-preview. #studio-panel kept as right sidebar ID. Resizers: #resizer-left, #resizer-right (vertical), #resizer-h (horizontal).
- [2026-04-07] CLI_TAB_PANE_SPECIFICITY: When using ID-based display rules (#cli-terminal { display: flex }) alongside class-based hidden rules (.cli-tab-pane.hidden { display: none }), the ID wins. Fix: use !important on the hidden rule or avoid setting display on the ID selector.
- [2026-04-07] DATA_DRIVEN_TABS: Canvas and CLI tabs are now data-driven via querySelectorAll + data-pane/data-hook attributes. New tabs need only HTML — no JS array changes. Functions: switchCanvasTab(), switchCliTab(). Canvas tabs: preview, editable, images, research, compare. CLI tabs: chat, terminal, codex.
- [2026-04-07] CANVAS_PANE_HIDING: Use `display:none !important` for hidden canvas panes, not `opacity:0`. Opacity-based hiding leaks iframe content (especially Compare tab's side-by-side iframes).
- [2026-04-07] CODEX_STDIN_CLOSE: Always close stdin immediately when exec'ing codex-cli via execFile. The script has an interactive fallback (line 7) that hangs HTTP requests. Fix: `child.stdin.end()` after spawn.
- [2026-04-07] RESEARCH_FILENAME_ALLOWLIST: Never use req.params directly for file paths. Allowlist via readdirSync then check includes(). Pattern: `const allowed = fs.readdirSync(dir).filter(f => f.endsWith('.md')); if (!allowed.includes(filename)) return 404;`
- [2026-04-09] PHASE3_MULTI_AGENT: `logAgentCall()` appends to `sites/<tag>/agent-calls.jsonl`. `validateAgentHtml()` returns `{ valid, score, issues }` (valid = score >= 40). `/api/compare/generate-v2` implements Codex→Claude fallback. `/api/agent/stats` and `/api/agent/routing` serve analytics. HTML scoring must use pre-declared `const valid` for shorthand return to work.
- [2026-04-09] PHASE4_IMAGE_RESEARCH: `/api/image-suggestions` derives chips from `spec.design_brief`. Research verticals endpoint `/api/research/verticals` MUST be declared before `/api/research/:filename` (static before parameterized). Research trigger writes stub markdown to `sites/<tag>/research/`. Research-to-brief extractor reads markdown sections and returns `brief_text`. UI additions: suggested query chips, shortlist sidebar, A/B compare pane, research trigger form.
- [2026-04-09] PHASE5_INTELLIGENCE_LOOP: `generateIntelReport()` reads `agent-calls.jsonl`, `mutations.jsonl`, `library.json` — produces findings with category/severity. Five valid categories: cost, performance, mutations, components, agents. Four valid severities: critical, major, minor, opportunity. `POST /api/intel/promote` writes to `sites/<tag>/intelligence-promotions.json`. `POST /api/intel/run-research` writes stub to `docs/intelligence-reports/`. Return value must use `site: TAG` (not `SITE_TAG`). Library extraction: always `libRaw.components || []`.

## Do-Not-Repeat

- [2026-04-09] TAG_VS_SITE_TAG: The server has TWO site-tag variables. `process.env.SITE_TAG` is the startup env var — set once, never changes. `TAG` is the mutable runtime variable that changes whenever the user switches sites. Any function that needs the CURRENT active site must use `TAG` (and `SITE_DIR()`, `DIST_DIR()` helpers). Using `SITE_TAG` (env var) inside route handlers or `generateIntelReport()` causes a ReferenceError at runtime if the var name is wrong, or silently uses stale site data.
- [2026-04-09] LIBRARY_JSON_STRUCTURE: `library.json` is `{ version, components[], last_updated }` — NOT a flat array. Always extract: `const libRaw = JSON.parse(raw); const library = Array.isArray(libRaw) ? libRaw : (libRaw.components || []);`. Using `libRaw.length` when it's an object returns `undefined`, causing NaN in downstream math (e.g., `component_count`).
- [2026-04-09] EXPRESS_ROUTE_ORDERING: Static route segments MUST be declared BEFORE parameterized routes. Example: `app.get('/api/research/verticals', ...)` MUST come before `app.get('/api/research/:filename', ...)`. Express matches top-to-bottom; if the parameterized route is first, "verticals" gets treated as `:filename` and hits the allowlist → 404. This is permanent — never put `:param` before a fixed-string variant of the same path.
- [2026-04-09] RETURN_SHORTHAND_VS_INLINE: When a test asserts `return { valid, score, issues }` shorthand syntax exists in source, the code must use `const valid = expr; return { valid, score, issues }` — NOT `return { valid: expr, score, issues }`. The shorthand only works when the variable name matches the key and is pre-declared. Inline expressions break shorthand destructuring and also fail text-search assertions.
- [2026-04-09] FALLBACK_RESPONSE_COMPLETENESS: Empty/zero-data fallback responses (e.g., when a .jsonl file doesn't exist yet) MUST include ALL fields that the API contract promises. Tests run before any live data exists — the fallback path is exercised first. Missing fields like `failure_count` or `last_call` in an early-return cause tests to fail on fields that are trivially supported. Always document every field in the happy-path response and mirror them all in the fallback.
- [2026-04-09] SUBPROCESS_CLI_MULTI_TURN: DECISION — Multi-turn conversation for subprocess CLIs (spawnClaude, spawnBrainAdapter) is NOT solved in Session 8. `claude --print` supports `--input-format text` and `--input-format stream-json` only — NOT a JSON messages array format. Text-formatted history prepending (e.g., "Human: ... \n\nAssistant: ...") is best-effort convention, not a structured API. Real multi-turn is deferred to Session 9 SDK migration. spawnClaude() subprocess calls remain single-turn. Do NOT attempt to solve subprocess multi-turn before the SDK migration.
- [2026-04-09] SUMMARIZATION_ALWAYS_CLAUDE: When conversation history exceeds 20 turns, the oldest 10 turns are summarized using Claude regardless of the currently active brain. This is a standing decision — do not change to the active brain. Logged with source: "summarization". Applies to all three adapters (claude, gemini, codex).

- [2026-03-26] SPAWN_CLAUDE_CWD: Never set cwd to HUB_ROOT (~/famtastic/) in spawnClaude(). CLAUDE.md in that dir contains OpenWolf instructions; with --tools "" the subprocess cannot execute them and produces 0 bytes. Use os.tmpdir() instead.
- [2026-03-26] FIXED_LAYOUT_PATCHER_DOUBLE_INJECT: fixLayoutOverflow() used html.includes('STUDIO LAYOUT FOUNDATION') to skip already-patched pages. But the string is in styles.css (external), not in the HTML. So every build injected another inline <style> block into every page. Fix: skip ALL inline patching when styles.css exists.
- [2026-03-26] INLINE_CSS_INJECTION_NEWLINE: When injecting CSS into an existing <style> block, always prefix with \n. Without it, the injection concatenates onto the previous declaration's last token, silently breaking it.
- [2026-03-26] MAIN_OVERFLOW_COMMENT_ACCURACY: main { overflow-x: hidden } is a secondary clip layer. The primary protection against header stretching is html/body { overflow-x: hidden }. Do not comment main as "prevents header from widening" — that's the body rule doing it.
- [2026-03-26] TEMPLATE_PROMPT_MAIN_STYLES: Do not include main{} rules in buildTemplatePrompt() shared CSS block. Claude generates a template with no <main> in the body — it will skip or inconsistently include main styles. Post-processing (fixLayoutOverflow) handles main containment reliably.

### 2026-04-06 — Multi-page conversion via Studio chat: what works and what doesn't
- "Break into separate pages" classifies as `layout_update` — wrong. Need a `restructure` or `split_pages` classifier intent.
- "Rebuild the site with all 4 pages" classifies as `build` — correct. Use explicit rebuild language for multi-page generation.
- `execute-plan` WS handler silently drops plans generated from `layout_update` intent. No error, no build, no feedback. Only `build` classified plans actually trigger Claude.
- spec.json `pages` array MUST be manually updated before a multi-page rebuild. The brief approval and new_site handler only set `pages: ["home"]` regardless of how many pages the brief requests. The `design_brief.must_have_sections` field has the correct pages but they're never copied to `spec.pages`.
- Multiple plan cards accumulate in the DOM. When sending execute-plan, use the LAST plan card's planId, not the first.
- Working multi-page conversion path: (1) edit spec.json pages array, (2) send "Rebuild the site with all N pages: list them", (3) approve the plan.

### 2026-04-03 — Playwright autonomous build: DOM-based detection is the only viable approach
- WS messages in server.js are unicast (`ws.send()`), never broadcast. A standalone WS client cannot observe responses to another client's messages.
- DOM-based detection works: count `#chat-messages > div` before sending, wait for count to increase + `#step-log` to disappear.
- `page.fill()` works for the chat textarea but for long messages (>200 chars), `page.evaluate()` to set `.value` directly is faster and avoids input event timeouts.
- Plan approval cards (`build-plan` type) block automation — edits trigger plan proposals, not immediate builds. The Playwright script accidentally waited through the 240s timeout, at which point the plan auto-resolved.
- `new_site` classifier path doesn't generate multi-page sites from brief. It writes spec then calls handleChatMessage which builds single-page. Multi-page requires spec.pages to already have multiple entries before the build triggers.
- Targeted stock photo searches ("Search for X for the Y") misclassify as `layout_update` instead of stock-related intent.

## Key Learnings

- [2026-03-26] TEMPLATE_FIRST_PATTERN: Studio uses a two-phase build — template first (header/nav/footer/shared CSS), then all pages in parallel. Each page copies chrome verbatim. Functions: buildTemplatePrompt(), extractTemplateComponents(), loadTemplateContext(), writeTemplateArtifacts(), applyTemplateToPages(). Guard: templateSpawned flag prevents double-build race.
- [2026-03-26] NAV_CONTAINMENT_MODEL: Nav width stability = two rules: (1) html/body overflow-x:hidden stops body layout expanding past viewport. (2) main overflow-x:hidden clips page content inside main before it affects ancestors. .container class (max-width: 90rem) is injected into every styles.css as a shared utility.

### 2026-03-26 — overflow-x hidden breaks hero breakout
- `overflow-x: hidden` on body or main clips CSS breakout techniques (`width: 100vw; left: 50%; margin-left: -50vw`)
- For the hero breakout to work, neither body nor main can have overflow-x: hidden
- The 90% max-width on main is sufficient to prevent horizontal scrollbars — overflow-x hidden is not needed as a belt-and-suspenders

### 2026-03-26 — CLAUDE.md in cwd hijacks claude --print subprocess
- When `claude --print` runs from a directory containing CLAUDE.md, it reads project instructions
- With `--tools ""` active, those instructions (especially OpenWolf "check anatomy.md") cause empty output
- Fix: set cwd to os.tmpdir() so no CLAUDE.md is found
- Also: scripts/claude-cli wrapper fails with relative paths when cwd != HUB_ROOT — bypass it entirely

### 2026-03-31 — WS connection state and subprocess lifecycle (Wave A–D fixes)

- `currentMode` is module-level and MUST be reset at the top of `wss.on('connection')`. Any persistent session state that should be per-client (not per-process) must be reset on connect, not just on disconnect.
- `page_switch` intent must be checked BEFORE the brainstorm-mode fallthrough block. The pattern: classify first, then decide whether to fall into mode-specific routing.
- Input validation must happen BEFORE appendConvo and BEFORE classifyRequest — both functions accept arbitrary string length and have no guards themselves.
- All WS-routed `spawnClaude` calls must store the child ref on `ws.currentChild` (single child) or push to `ws.activeChildren[]` (parallel builds). `ws.on('close')` is the cleanup site — check both and kill.
- Haiku fallback in `handleChatMessage` reassigns `child` — must update `ws.currentChild` at the reassignment point, not just at the initial spawn.
- Test flood utilities: any `connect()` that could have concurrent listeners added should call `ws.setMaxListeners(0)` immediately — this suppresses `MaxListenersExceededWarning` without masking real leaks.

### 2026-03-27 — Studio code push UX needs rethinking
- Currently "Push Studio Code" in Server tab does a quick git add/commit/push of the famtastic hub repo
- But proper commits with meaningful messages should go through CLI
- Future: Studio should be able to manage its own code changes with commit message prompts, possibly a dedicated "Studio Updates" panel or integration with the existing git flow
- The separation of site repo vs hub repo pushes needs clearer UX — users shouldn't have to think about which repo they're pushing to
