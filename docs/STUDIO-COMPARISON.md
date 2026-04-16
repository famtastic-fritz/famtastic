# FAMtastic Site Studio — V1 vs. Industry Standard vs. V2 Direction
## Structured Comparison Across 15 Functional Areas

**Generated:** 2026-04-14  
**Source 1:** REWRITE-CONTEXT-PACKAGE.md — complete architectural analysis of v1 (Sessions 1-11)  
**Source 2:** STUDIO-DISCOVERY.md — 13-tool deep-dive industry research  
**Purpose:** Prioritized rewrite roadmap grounded in real v1 behavior and real industry benchmarks

---

## HOW TO READ THIS DOCUMENT

Each of the 15 sections covers one functional area in three parts:

- **V1 TODAY** — What v1 actually does. References real file names, real functions, real bugs. No softening.
- **INDUSTRY STANDARD** — What the best tools do. Specific tool citations. The principle behind the pattern.
- **STUDIO 2.0 DIRECTION** — What v2 needs to do to meet that standard. Specific and achievable. Not a wish list.

The Empowerment Audit, Decision Matrix, Top 5, and Design Statement follow the 15 areas.

---

---

# SECTION 1: WORKSPACE ARCHITECTURE

## V1 TODAY

v1 has a fixed three-panel layout: chat on the left, live preview iframe in the center, sidebar on the right. The sidebar has five hard-coded tabs — Design Brief, Uploads, Files, Versions, Verify — that are pre-built screens. Switching to "Uploads" always shows the uploads screen regardless of what is happening in the chat or preview. There is no communication between panels.

The chat does not know what page is active in the preview. The sidebar does not react to builds completing. The Verify tab does not auto-open when brand health issues are detected. Nothing responds to anything else.

WebSocket state lives in module-level globals: `currentMode`, `currentPage`, `ws.currentChild`. Opening a second browser tab calls `startSession()` and resets these globals, interrupting any in-progress build in the first tab. There is no concept of a workspace session or workspace identity — `site-studio/server.js` maintains one shared state object for the entire process.

State persistence: when Studio closes and reopens, there is no restoration of last active page, last sidebar tab, or last chat thread. The workspace starts cold.

## INDUSTRY STANDARD

VS Code defines the canonical model: tabs are containers, not screens. The same tab slot can hold a file, a diff, a settings page, a terminal, or an extension UI — the content is dynamic to context, the tab is just a slot. Five independent panel areas (editor, primary sidebar, secondary sidebar, panel/terminal, status bar) each maintain their own content lifecycle. Sessions are workspace-scoped: Copilot conversations from workspace A do not bleed into workspace B. Context is incremental — on a 100,000-line codebase, relevant context loads under 200ms by maintaining indexes updated only when files change.

Figma's UI3 (2024-2025 overhaul) replaced fixed sidebars with floating contextual panels that appear when and where needed. The Properties panel is fully dynamic: select a text node and get typography controls; select a frame and get layout controls; select a component and get variant controls. The panel content is driven by what is selected, not by a fixed screen assignment.

Framer's canvas is the single source of truth — everything else serves it. The surrounding chrome (Properties panel, sidebar) adapts to what is active on the canvas. There is no concept of switching screens; there is only the canvas and the context-aware panels that respond to it.

The principle: tabs as containers serving dynamic content. Panel content reflects what is contextually relevant — what is open, selected, or active. Nothing lives in isolation.

## STUDIO 2.0 DIRECTION

Right sidebar tabs become content providers. Each tab registers a `contentProvider(context)` function that receives `{ activeSite, activePage, lastBuildResult, lastIntent }` and returns the content to display. Start with one concrete change: the Verify tab auto-opens and displays its content whenever a build completes. From there, extend: after a layout_update, the sidebar surfaces brand health; after switching pages, the sidebar surfaces page-specific decisions and slot status.

Per-session WebSocket identifiers replace global module-level state. Each browser tab gets a unique session ID on connect. Module-level globals (`currentMode`, `currentPage`) move into a per-session state object keyed by session ID. Two tabs coexist with independent state.

Preview iframe communicates active page back to sidebar. A `postMessage` from the iframe on load tells the parent which page is displayed. The sidebar reacts: decisions filter to that page, image slots filter to that page, build history shows that page's last build.

Workspace state persists to `.famtastic/workspace-state.json`: last active page, last sidebar tab, last session ID. On Studio open, restore to last known state.

---

---

# SECTION 2: INTENT & REQUEST HANDLING

## V1 TODAY

v1 has an 18-intent classifier in `server.js` (`classifyRequest(message, spec)`). Classification is pure regex pattern matching with anchor words. Results route to one of 18 handler functions.

The classifier has documented false positives:
- "history" alone triggers `version_history` (should require "version" nearby)
- "fix the colors" triggers `bug_fix` which sets a suppression instruction preventing design changes — the very thing the user asked for
- "create a hero section" triggers `asset_import` (should require image/asset context)
- "looks good" or "ok" falls to `content_update` default and triggers a Claude HTML generation call — expensive and unwanted

The `restyle` intent routes to `handlePlanning()` (dead code branch) instead of `handleChatMessage`. Restyle requests are silently ignored. Line ~4757 of `server.js`.

There is no pre-execution confirmation. The classified intent is invisible to Fritz. If the classifier routes a request to `layout_update` when `content_update` was appropriate, Fritz sees a 90-second full rebuild instead of a 3-second surgical edit with no ability to catch it before the damage is done.

There is no missing `conversational_ack` type. Affirmations like "yes", "ok", "that looks great" fall to `content_update` default.

## INDUSTRY STANDARD

Replit Agent 3 (2025) implements explicit pipeline phases: Ideation → Design → Build → Review. The active phase is visible in the UI at all times. Each phase transition is either automatic (based on completion) or requires explicit user approval (Design Mode visual approval before build).

Lovable's Chat Mode presents a plan before any execution: the agent explains what it will do, and the user approves before changes commit. Agent Mode is autonomous — the user explicitly selected it, so they understand the contract. The mode label in the UI communicates who has control at all times.

Bolt's recommended workflow (from official documentation): ask for layout ideas and UX improvements first (planning), confirm, then build. The chat is a design partner before it is a build executor.

Cursor emits an intent confirmation card before multi-file agent edits: "I'll modify these 4 files. [Review] [Proceed]." The scope is explicit before execution.

The principle: users should know what is about to happen before it happens, especially for operations with meaningful time cost or side effects. Confidence in the AI is built through pre-execution transparency, not post-execution explanation.

## STUDIO 2.0 DIRECTION

Before executing any intent that is not `content_update` or `conversational_ack`, Pip emits a dismissable confirmation card:

> "Treating this as `layout_update` — full rebuild, 3 pages affected. Estimated time: 90s. [Confirm] [Change to content_update] [Cancel]"

This is not a friction tax on every interaction. The card appears for layout_update, major_revision, build, deploy, and asset_import. It does not appear for content_update (surgical, cheap, immediately reversible) or conversational_ack (no HTML generation).

Add `conversational_ack` as a real classifier intent. Patterns: "yes", "ok", "looks good", "perfect", "that works", "nice", "great". Handler: no HTML generation. Respond with a brief affirmation and optionally suggest a next step from site state.

Fix `restyle` routing. Remove line ~4757's redirect to `handlePlanning()`. Route `restyle` to `handleChatMessage` with a `restyle` execution path that triggers a focused rebuild of the styled elements only.

Display classified intent in the chat stream header: `[INTENT: content_update → surgical edit]`. One line, always visible, before the spinner starts.

---

---

# SECTION 3: BRIEF & PLANNING

## V1 TODAY

v1 has a client interview system (three modes: quick/5q, detailed/10q, skip) that captures intent before first generation. Results land in `spec.json → client_brief`. The interview runs once per site. There is no way to re-run it or update it from the Studio UI.

The design brief system (`spec.json → design_brief`, `spec.json → design_decisions`) captures Claude's generated brief and per-build decisions. These are injected into every future build prompt via `buildPromptContext()`. The brief is AI-generated during planning mode — it is not user-authored.

Research integration: Pinecone is the configured vector store for vertical research. The environment variable `PINECONE_API_KEY` is not set in the current configuration (visible in STUDIO-CONTEXT.md: "Pinecone: not configured — Phase 4 required"). Research findings from `intelligence-promotions.json` are injected into build prompts when present. For the current active site (site-altitude, rooftop bar vertical), no Pinecone research exists.

`spec.json → design_decisions` accumulates every design choice from every build. `extractDecisions()` can capture AI prompt fragments alongside real decisions. `superseded` status exists in the schema but is never set — stale decisions accumulate forever.

User involvement in planning: minimal. The interview Q&A is sequential. After that, planning is AI-generated. Fritz cannot edit the brief fields from within Studio — he must edit `spec.json` directly on disk.

## INDUSTRY STANDARD

Framer's Wireframer (2025) generates a full responsive section layout from a natural language description directly on canvas. The result is a Framer-native canvas element, immediately editable with all standard canvas tools. The user's role: describe intent, evaluate the result, refine with canvas tools. The AI produces the first draft; the human refines it in their native environment.

Replit's Design Mode (2025, Gemini-powered) produces a visual mockup of the proposed UI before any code is written. This is a visual approval gate — the user sees what the build will look like before the agent commits to an implementation. Pipeline visualization shows the active phase.

Webflow's AI Assistant (2025) can orchestrate complex multi-step tasks from natural language, but generation happens within the context of the existing design system — generated content conforms to the site's established styles and components.

The principle: brief and planning should produce a visual or structural preview that the user approves before full generation. The user's judgment adds genuine value at "does this match my intent?" — that checkpoint should exist before the AI spends 90 seconds building the wrong thing.

## STUDIO 2.0 DIRECTION

Make brief fields editable from within Studio. An "Edit Brief" panel (accessible from the sidebar Design Brief tab) renders `spec.json → design_brief` as a form with fields for audience, tone, primary CTA, pages, must-have sections, and visual style. Changes save to spec.json via the write-through cache.

Before full builds, Pip presents a structural plan card: page count, key sections per page, estimated build time. "I'll build 3 pages: home (hero + services + testimonials), about (story + team), contact (form). ~2 min. [Confirm] [Adjust]." The user approves the structure before generation starts.

Allow interview re-runs. Add a "Re-interview" button in the Design Brief sidebar tab. Interview state is stored per-site; re-running appends to client_brief with a timestamp rather than overwriting it.

Mark stale decisions. After a build that modifies a component, check `design_decisions` for entries about that component. Auto-mark the older entries as `superseded: true`. Show only the 20 most recent non-superseded decisions in the sidebar.

When Pinecone is configured, inject vertical research as a "What we know about [vertical]" block into the planning card, so Fritz can see what the system knows before approving the plan.

---

---

# SECTION 4: GENERATION ENGINE

## V1 TODAY

v1 uses a template-first parallel build architecture introduced in Session 10. One Claude call builds `_template.html` (nav, header, footer, shared CSS with `<style data-template="shared">`). Partials are extracted: `_partials/_nav.html`, `_partials/_footer.html`, `assets/styles.css`. All pages then build in true parallel, each generating only `<main>` content and page-specific CSS. Post-processing handles the rest.

Model: Claude Sonnet 4.6 (`claude-sonnet-4-6`). No model selection available from the UI. Temperature and max tokens are hardcoded in `server.js`. No token usage is displayed to Fritz.

Output quality controls: the mandatory HTML skeleton system (`HERO_SKELETON_TEMPLATE`, `LOGO_SKELETON_TEMPLATE` in `famtastic-skeletons.js`) enforces vocabulary at generation time. Five build verification checks run post-build (slot attributes, CSS coherence, cross-page consistency, head dependencies, logo/layout). Results appear as a color pill in the toolbar.

Pipeline phase visibility: none. Planning, generating, post-processing, and complete all display the same spinner. Fritz does not know which phase is active or how long each takes.

Fallback: when Claude's multi-page response fails to parse, the system has a fallback path — but historically this path skipped `runPostProcessing()` (Session 10 bug, now fixed). All write paths now go through `runPostProcessing()`.

Tool calling: 5 tools enabled, MAX_TOOL_DEPTH=3. Models use tools for structured artifact extraction.

## INDUSTRY STANDARD

Replit's Agent 3 pipeline visualization (Ideation → Design → Build → Review) is the clearest "you are here" UX in any tool researched. Each phase is labeled and shows what the agent is doing at that step. Users understand the pipeline as a sequence, not as a black box.

Google AI Studio surfaces token counts in real time. Every prompt-response pair shows prompt tokens + response tokens and context window utilization as a visible bar. Users develop intuition for context costs over multiple sessions.

Bolt.new uses Claude 3.5 Sonnet and draws from a library of proven patterns (authentication flows, CRUD operations, payment integrations). Generated code is functional and connected, not scaffolding. The distinction: generation quality is grounded in known-good patterns, not open-ended generation.

v0 by Vercel constrains output to React + Tailwind + shadcn/ui. Every generated component is production-ready from line one. The constraint is the quality guarantee — the output floor is high because the solution space is intentionally narrow.

The principle: world-class generation engines are transparent about what model is running, what context it has, what phase is active, and what it costs. Phase visibility is not just informational — it helps users understand why some operations take 90 seconds and others take 5.

## STUDIO 2.0 DIRECTION

Phase badge in the streaming output header. As the build progresses through phases, the header updates: `[PLANNING]` → `[GENERATING: template]` → `[GENERATING: pages 1/3]` → `[POST-PROCESSING]` → `[VERIFYING]` → `[COMPLETE: 13/13]`. Each transition is a clear line in the chat stream, not just a spinner state change.

Token usage in the status bar. After each Claude call, display cumulative prompt tokens + response tokens for the session. A context window utilization bar shows how close the session is to the model's context limit. This builds intuition for what "costs" a full rebuild vs. a surgical edit.

Model selector for power users. A dropdown in the sidebar allows selecting between Claude variants or switching to Gemini for brainstorm-style generation. The selected model displays in the status bar always. Default: Claude Sonnet 4.6.

Expose generation confidence. After classification, before building, show: "Classified as `layout_update` with 94% confidence. Context: brief exists, site has 2 prior builds." If confidence is low (< 70%), flag it: "I'm less certain about this intent — want to confirm before I proceed?"

Extend the skeleton system to cover more known regression patterns. Every post-processing auto-correction (single-dash BEM fix, plain-text nav brand swap, inline style removal) should log a line to the build output: "Fixed: 2 inline styles removed. Fixed: nav brand swapped from text to SVG." Fritz sees what was auto-corrected.

---

---

# SECTION 5: CONTENT MODEL & EDITING

## V1 TODAY

Content is stored in two systems that partially overlap:
- `spec.json → media_specs[]` — all image slots across all pages, with status lifecycle (empty/stock/uploaded/final)
- `spec.json → slot_mappings` — user-assigned image mappings (slot ID → image URL)
- `spec.json → content[page].fields[]` — text/HTML field values keyed by `data-field-id`

Text fields are extracted from HTML by `syncContentFieldsFromHtml()` (step 11 of post-processing) using the `data-field-id` attribute. A surgical edit via `content_update` uses cheerio to find a `data-field-id` element and update its text/HTML, then write to disk and log to `mutations.jsonl`.

Field-level control from the Studio UI: none. There is no content management panel where Fritz can edit individual fields without sending a chat message. All content changes flow through the chat classifier. The sidebar "Design Brief" card shows spec.json fields but does not allow inline editing of content fields.

The two slot-related structures partially overlap: `media_specs[]` tracks current slot state; `slot_mappings` tracks user assignments. `reapplySlotMappings()` hardcodes status to 'uploaded' when reapplying, meaning stock photo slots become 'uploaded' after a rebuild — losing the original status. There is no UI to view all content fields across pages in one place.

## INDUSTRY STANDARD

Webflow separates structure (Navigator showing the HTML tree), style (Style panel showing CSS classes), and content explicitly. The Navigator is the HTML tree — not an abstraction of it, but the actual structure represented visually. Editing content means selecting an element in the Navigator and editing it in context.

Framer's no-export model means the canvas IS the content — changes made in Framer are production changes. There is no "content editing mode" separate from "design mode."

WordPress, as the most widely understood content model, separates field types explicitly: text fields, rich text fields, image fields, relationship fields. Each field type has an appropriate editor. The mental model: content is structured data attached to a template, not embedded text in HTML.

Lovable's 90/10 principle is relevant here: the AI handles 90% of content structure decisions; the user focuses on the 10% that matters most (brand copy, key CTAs, primary imagery). The design decision: users should not have to edit HTML to change content.

## STUDIO 2.0 DIRECTION

A content panel in the sidebar surfaces `data-field-id` fields for the active page in a structured form. Each field shows its current value as an editable text input (or rich text editor for HTML fields). Changes submit directly as `content_update` intents without requiring a chat message — Fritz edits the field, hits enter, cheerio updates the HTML. The panel auto-refreshes after each build to show current field values.

Image slots panel: alongside text fields, show all image slots for the active page as a filmstrip of thumbnails with their `data-slot-role` labels. Empty slots show a placeholder with an "Add image" button. Uploaded slots show the thumbnail with a "Replace" button. The panel replaces the uploads tab for active-page slot management.

Unify `media_specs` and `slot_mappings`. A single `media_slots[page][slot_id]` structure per page carries: role, status, src, uploaded_asset_path, and last_modified. The redundancy between the two current structures causes bugs (`reapplySlotMappings()` overwriting status). One structure, one write path.

Add a content export. `/api/content-export/:tag` returns a structured JSON of all `data-field-id` field values across all pages — useful for Claude-assisted bulk content rewrites and for seeding site-level `knowledge.md` with the brand's actual copy.

---

---

# SECTION 6: ASSET PIPELINE

## V1 TODAY

There is no image generation workflow in v1. Sites are built with placeholder images (transparent 1x1 GIF data URIs at status='empty') or stock photos filled from Unsplash/Pexels/Pixabay via `fill_stock_photos` intent.

The `fill_stock_photos` intent is documented as non-atomic: it requires two sequential endpoint calls (replace-slot then clear-slot-mapping). If the second fails, `media_specs` shows status='uploaded' for a transparent GIF — a silent broken-image bug.

The Adobe Firefly API is installed as a skill (`adobe-firefly` in the skills list visible in STUDIO-CONTEXT.md) but is not wired into Studio. No generation workflow exists to invoke it.

Asset uploads work via the Uploads tab: drag-and-drop or file picker, uploads stored in `sites/<tag>/dist/assets/uploaded/`, registered in `spec.json → uploaded_assets[]`. There is no multi-result selection UX. No regeneration button. No filmstrip. Upload and use.

`DELETE /api/upload` has a documented bug: deleting an upload removes it from disk and `uploaded_assets[]` but not from `slot_mappings`. On rebuild, the orphaned mapping gets reapplied with a broken image reference.

External tool handoff (open in Photoshop, open in Figma): not implemented.

## INDUSTRY STANDARD

Adobe Firefly Generative Fill is the category benchmark: select a region, prompt, receive **3 results in a filmstrip** below the canvas. Click to preview each in-place, then click to accept. "Regenerate" (same prompt, new results) and "Edit Prompt" are always visible. Generation history is preserved in layer history. The insertion point (defined by selection before triggering) means there is no "where should this go?" ambiguity.

Midjourney's architecture: always return 4 results from a single prompt. This is structural, not optional — it forces selection over acceptance. Each result has U1-U4 (upscale), V1-V4 (variations), and re-roll. The workflow is generate → select → refine → use. Never: generate → accept.

Figma plugins bring generation into the canvas: select a layer, prompt for a fill, the image arrives as the layer fill. The insertion point is defined before generation.

The principle: generation should never be a one-shot commit. Multi-result selection is the gold standard for all destructive creative tools. Controls that must always be visible: result count, re-roll/refresh, vary on selected result, prompt edit.

## STUDIO 2.0 DIRECTION

Wire the `adobe-firefly` skill into an Asset Generation panel in the sidebar. The panel has: a prompt field, style controls (realistic/illustrated/graphic/photo), aspect ratio selector, and a "Generate" button. Triggering generation calls Adobe Firefly and returns 3 results.

Results display as a horizontal filmstrip below the prompt. Each image shows on hover with an "Insert" button. "Insert" places the image into the active HTML slot using the slot ID from the content panel — no drag-and-drop required. The insertion point is the currently selected slot in the content panel.

Re-roll and Vary buttons on each filmstrip result. Re-roll: same prompt, new seed, fresh 3-result set. Vary: take this result as a reference and generate 3 variations.

Fix `DELETE /api/upload` to purge the slot_mapping entry. Atomic: if `slot_mappings` update fails, roll back the file deletion. Log to `mutations.jsonl`.

Make `fill_stock_photos` atomic. Wrap both endpoint calls in a transaction pattern: write to a temp state, then commit both changes together. If either fails, restore from temp state.

---

---

# SECTION 7: COMPONENT LIBRARY

## V1 TODAY

v1 has a component library stored in `library.json` at the Studio level (not per-site). The schema is `{ version, components[], last_updated }`. A documented bug: `library.json` was being treated as a flat array — `libRaw.length` on an object returned `undefined` (Session 8 bug). Fixed with `const lib = Array.isArray(libRaw) ? libRaw : (libRaw.components || [])`.

Library contents: STUDIO-CONTEXT.md shows 6 total components, most recently: Video Hero Section, Garage Sale Product Card, Display Stage — Deal Showcase, CSS Starburst Badge, Live Countdown Timer. No quality tracking over time. No per-component build score or verification history.

Components are discovered by scrolling the sidebar library tab. There is no search, no filter by category or tag, no preview-on-hover. No way to see which components have been used in which sites.

Reuse pattern: a component can be referenced by name in a build prompt. If Fritz knows the component exists and remembers its name, he can say "use the Live Countdown Timer component." There is no automatic surfacing of relevant components based on the active site's vertical or content needs.

The library is shared across all sites. There is no per-site component override or variant system.

## INDUSTRY STANDARD

Figma's Workspace Libraries are the structural benchmark: shared component and token libraries accessible across all files in a workspace, with a push/pull update model. A design system change propagates to all files without manual file-by-file updates. Variable modes allow one component definition to output multiple states (light/dark, brand A/brand B) without duplicating components.

Webflow's component/class model in the Style panel teaches CSS reuse through practice. Named classes are first-class citizens — applying a class shows you every other element using it, letting you see the reuse scope before committing.

VS Code's extension marketplace and Copilot sparkle system surface relevant capabilities at moments of contextual relevance — not in a library catalog, but in the active editing context.

Bolt's template library is an ambition ladder: browsing it exposes users to what's possible beyond what they would have asked for. A user who wanted a basic contact form discovers a SaaS starter template with authentication, subscriptions, and a dashboard.

## STUDIO 2.0 DIRECTION

Component library becomes per-vertical and tagged. Each component has: name, category tags (hero/navigation/feature/testimonial/pricing/CTA/footer), vertical affinity tags (restaurant/bar/lawn care/salon/fitness), quality score from last use, last-used date, and preview screenshot.

When Fritz starts a build for a new site, the component panel surfaces "Relevant for [vertical]" — components whose vertical affinity matches the active site. This is passive discovery: the library presents itself contextually without requiring Fritz to remember what exists.

Quality tracking: after each build verification, if a component variant scores 13/13, log that result against the component. The library view shows a "Build quality history" sparkline for each component. Components with consistent 13/13 scores get a "Proven" badge.

Search and filter. Free-text search across component names and tags. Filter by category and vertical. Preview on hover shows the component rendered in isolation.

Usage map: each component shows which sites have used it, with a link to that site's current build. Supports cross-site visual consistency analysis.

---

---

# SECTION 8: CONFIGURATION ARCHITECTURE

## V1 TODAY

A single `studio-config.json` flat file contains everything: Anthropic API key, Gemini API key, Pinecone API key, Netlify token, Netlify site ID per active site, brand brief fields, build behavior settings, analytics provider, stock photo API keys.

**6 dead settings documented in REWRITE-CONTEXT-PACKAGE.md:**
- `deploy_target` — never forwarded to deploy logic
- `deploy_team` — Netlify team is hardcoded in the deploy handler
- `max_upload_size_mb` — multer uses a 5MB hardcode, ignoring this setting
- `max_versions` — version count is never enforced
- `preview_port` — overridden by environment variables
- `studio_port` — overridden by environment variables

These settings exist in the Settings modal UI, accept user input, write to `studio-config.json`, and do absolutely nothing.

`analytics_provider` and `analytics_id` have no Settings UI — GA4/Plausible snippets are injected by the build but the property ID must be hand-edited in `studio-config.json` directly. `business_type` is read in 6 places (SEO, stock queries, new-site) but is always an empty string — it is never populated by any handler.

The Settings modal (`POST /api/settings`) has an `allowedKeys` allowlist that is incomplete — nested objects (email, sms, stock_photo providers) cannot be updated through the modal, only through direct file editing.

## INDUSTRY STANDARD

VS Code implements a strict four-tier cascade: Default → User → Workspace → Workspace Folder. User settings (`~/.config/Code/User/settings.json`) are personal, never version-controlled. Workspace settings (`.vscode/settings.json`) are project conventions that ARE committed. The same Settings Editor UI serves all tiers with a scope tab to switch context. Not all settings are available at all levels — security settings are locked at user tier by policy.

Webflow separates cleanly: Workspace settings (team, billing, permissions) live in the Dashboard, outside any project. Site settings (domain, hosting, SEO, custom code, forms, integrations) live inside the Designer per site. The mental model: workspace = who has access and how the platform is configured; site = what this specific site does and where it lives. This is considered the most intuitive separation in the site-builder category.

Adobe's insight: workspace panel arrangements are user-level and personal. Your colleague opening your Illustrator file sees their own workspace arrangement. Workspace layout is never per-project — that would cause friction when collaborators have different preferences.

The clean rule from STUDIO-DISCOVERY.md: anything that travels with the person belongs at user level. Anything that travels with the project belongs at project level. Anything that travels with the platform installation belongs at app level.

## STUDIO 2.0 DIRECTION

Three-tier config split:

- `~/.config/famtastic/app-config.json` — API keys (Anthropic, Gemini, Pinecone, Adobe Firefly, stock photo providers), Studio UI preferences (theme, panel sizes), global Pip behavior settings. Never version-controlled. Never committed.
- `.famtastic/workspace.json` (repo root, version-controlled) — default site directory, feature flags, build defaults, team conventions.
- `sites/<tag>/site-config.json` (per-site, version-controlled) — site brief, brand config (name, industry, colors, fonts), deploy target, Netlify site ID, analytics IDs, custom build rules for that site.

Settings UI: three labeled sections — "Platform" (app-level), "Workspace", "Site: [active site name]". Changes save to the correct file automatically. Each setting has a tooltip explaining what it does and what happens if it is not set.

Remove the 6 dead settings from the UI immediately. Replace with "Coming in v2" disabled placeholders so the UI does not lie about capabilities. Wire `analytics_id` to the settings UI — it should be configurable in 2 clicks, not a hand-edit.

---

---

# SECTION 9: AI ROUTING & ORCHESTRATION

## V1 TODAY

v1 routes to three models with a manual "brain selector" in the sidebar:
- Claude Sonnet 4.6: all HTML generation, planning, content edits, asset generation, tool calling
- Gemini 2.5 Flash: brainstorm only, no HTML generation, fallback for Claude
- GPT-4o: Codex integration via CodexAdapter, chat and code tasks

Model selection is visible (the brain selector widget shows which model is active) but Fritz must choose it manually. There is no automatic routing based on task type. There is no cost awareness — Fritz has no information about token costs per operation or accumulated session cost.

Temperature, max tokens, and top-p are hardcoded in `server.js`. There is no UI to adjust them.

The multi-agent framework (`fam-hub agent *`) exists as a CLI tool outside of Studio. It handles Claude, Gemini, and Codex adapters with conversation reconciliation. It is not integrated into Studio's build pipeline.

Token usage visibility: none. Fritz has no information about how much context has been consumed in a session, how close the session is to the model's context limit, or what operations are expensive vs. cheap.

## INDUSTRY STANDARD

Perplexity Computer (launched February 25, 2026) runs a three-function orchestration engine over 19 AI models: (1) task classification — determines whether the query requires web search, document analysis, code generation, mathematical reasoning, or creative writing; (2) model selection — routes to the model with strongest benchmark performance for that classification; (3) result synthesis — combines outputs from multiple sub-agents. The user sees one response. Transparency: "searching 19 models" communicates sophisticated orchestration without exposing routing logic.

Google AI Studio surfaces the full parameter panel persistently: model selector, temperature, max tokens, top-p — first-class controls, not hidden in settings. The token counter in the top bar updates in real time. Users develop intuition for context costs over multiple sessions.

Cursor routes between inline autocomplete (Tab), inline edit, and Composer/Agent mode based on the scope of the task — not based on user selection. The routing is implicit in how the user engages.

The principle from STUDIO-DISCOVERY.md: "AI transparency — showing what model is active, what context it has, what rules it's following" is a shared trait of all world-class AI studio interfaces.

## STUDIO 2.0 DIRECTION

Status bar always shows: active model name, current session token count (prompt + response), context window utilization as a percentage bar. This is non-negotiable — Fritz should never be surprised by hitting a context limit mid-build.

Automatic task routing. For tasks that always route better to a specific model, make it automatic: brainstorm intents route to Gemini without requiring Fritz to switch the brain selector. The brain selector becomes an override control, not the primary routing mechanism.

Cost-aware routing. When a `layout_update` would cost significantly more tokens than a `content_update` for the same outcome, Pip surfaces the difference: "This is classifiable as either a surgical edit (~2K tokens) or a full section rebuild (~18K tokens). The surgical edit changes only the headline and CTA. [Surgical — fast] [Full rebuild — complete]."

Expose the session cost summary after each Claude call — not in real time (that creates anxiety), but after the operation completes: "Build complete. Session total: 47K tokens across 3 calls." Fritz accumulates an intuition for what operations cost.

---

---

# SECTION 10: INTELLIGENCE & LEARNING

## V1 TODAY

v1 has four learning systems operating independently:

1. **`famtastic-dna.md`** (auto-updated by `updateFamtasticDna()`, Session 12 Phase 3): global build knowledge. Captures successful patterns, known regressions, and standing rules. Injected into every session via CLAUDE.md `@famtastic-dna.md` include. Works.

2. **`intelligence-promotions.json`** + `agent-calls.jsonl`: research findings from the intelligence loop. Promoted findings are injected into build prompts by `buildPromptContext()` as a "PROMOTED INTELLIGENCE" block. Partially working — the cron job runs 09:00 Mon/Wed/Fri but the research script requires manual setup.

3. **`.wolf/` system (OpenWolf)**: cross-session memory for developer sessions. `anatomy.md` (file inventory), `cerebrum.md` (learnings and do-not-repeat rules), `buglog.json` (bug history). Not integrated with Pip at runtime — these are tools for Claude Code sessions, not for the Studio Pip interface.

4. **`spec.json → design_decisions`**: per-site design choices captured during builds. Injected into future build prompts for that site. `extractDecisions()` can capture AI prompt fragments alongside real decisions. `superseded` status schema field exists but is never set.

What is NOT captured: per-site knowledge that accumulates across sessions (equivalent to Cursor's `.cursor/rules/`), error patterns that repeat on a specific site, brand-specific vocabulary discovered through builds.

What is captured but silently: session summaries written to `summaries/` directory after each session via `generateSessionSummary()`. These are never displayed to Fritz or injected into future prompts.

## INDUSTRY STANDARD

Cursor's rules files (`.cursor/rules/*.mdc`) are the gold standard pattern: version-controlled, human-readable, scoped to the project, automatically loaded into every session. Rules can be tagged as auto-attached (always loaded), agent-requested (loaded when relevant), or manual (loaded only when explicitly `@`-mentioned). The accumulation model: a new team member opening a project with good rules files immediately understands the project's conventions — the AI's constraints are project documentation.

VS Code's Copilot Instructions file (`.github/copilot-instructions.md`): the official mechanism for persistent project context. Automatically loaded into every Copilot Chat conversation for that repository. Version-controlled, PR-reviewable, owned by the team.

Perplexity Computer: persistent session memory means the agent remembers project context, preferences, and prior research without re-prompting. Each session starts where the last one left off.

The STUDIO-DISCOVERY.md synthesis: a co-pilot without structural memory is just smart autocomplete. Without ambient awareness, it cannot proactively surface what is relevant. The three layers are: structural memory (project rules, codebase index), session memory (current conversation, recent decisions), ambient awareness (current page, active errors, recent build results).

## STUDIO 2.0 DIRECTION

Per-site `knowledge.md` at `sites/<tag>/.famtastic/knowledge.md`. Auto-updated after each build by extending `updateFamtasticDna()` to be site-scoped. Captures: decisions made this session, issues encountered and resolved, brand vocabulary discovered (e.g., "this client calls the menu 'The List' not 'Menu'"), FAMtastic score trend over last 5 builds, known pages not yet built. Injected into `STUDIO-CONTEXT.md` generation at session start for the active site.

Context indicator in Pip's chat header. Before the first message of a session, Pip emits: "Session started — I have context from [N] previous sessions on this site. [View what I know]." Collapsible summary shows: last build score, last 3 decisions, known issues. Fritz can see and edit what Pip knows without sending a message.

Session summaries surface to Fritz. After `generateSessionSummary()` runs, emit the summary as a Pip message in the chat. Currently these are written to `summaries/` and never displayed. Fritz should see them — they're a natural session recap and closing checkpoint.

Make `.wolf/cerebrum.md` a readable reference in the Studio sidebar (read-only view). Fritz should be able to see what the system's standing do-not-repeat rules are. When Pip auto-corrects a regression, it should reference the cerebrum rule it applied: "Fixed per standing rule: BEM double-dash vocabulary enforcement."

---

---

# SECTION 11: DEPLOYMENT & ENVIRONMENTS

## V1 TODAY

v1 deploys to Netlify via `runDeploy()` in `server.js`. One command, one environment: production. There is no staging, no preview URL, no promotion step.

Deploy workflow: Fritz sends "deploy" in the chat, the classifier routes to `deploy` intent, `runDeploy()` spawns the Netlify CLI, and returns a single message after completion with the URL or error. No streaming log. No intermediate status. A 30-second black-box wait.

No rollback UI. Rolling back requires knowing the past build hash and running `netlify deploy` from the CLI manually. The sidebar Versions tab shows HTML snapshots but these are source file versions, not deployed deployment identifiers.

No per-deployment URLs in Studio. Fritz must go to the Netlify dashboard to see deploy history, past URLs, and build logs.

The per-site repos with git flow architecture (dev/staging/main branches per site in `~/famtastic-sites/<tag>/`) is designed but documented as partially implemented — the REWRITE-CONTEXT-PACKAGE.md shows it as "carry forward" architecture, not fully wired.

Deploy lock: not implemented.

## INDUSTRY STANDARD

Vercel is the benchmark: three default environments (local, preview, production). Every deployment is addressable via a unique URL linked to the commit. Promotion is explicit — "Promote to Production" is a button on any successful deployment. Rollback is clicking "Publish" on a past deploy in the Dashboard — no git knowledge required. Build log is streaming, real-time, with log levels differentiated (info/warn/error). Status is ambient — visible in PR comments, Slack, email, and the Dashboard at a glance.

Netlify Drawer (2025): stakeholders can annotate specific deploys with screenshots and browser metadata. Feedback travels with the deployment, not scattered in Slack. Lock production: ability to freeze production during incidents with a manual toggle.

The principle: five requirements for world-class deployment UX: (1) environments are first-class concepts, not branch naming conventions; (2) every deployment is addressable with a unique URL; (3) promotion is explicit and one-click, never automatic without the ability to intercept; (4) rollback requires no git knowledge; (5) build status is ambient — visible without navigating away from active work.

## STUDIO 2.0 DIRECTION

Add `preview` as a first-class deploy environment. Builds by default create a Netlify draft deploy (dark — no custom domain, unique preview URL). An explicit "Go Live" button in the Studio header promotes the current build to production. Fritz can share the preview URL for feedback before going live.

Deploy panel as a sidebar tab (using the content-provider pattern from Area 1). The panel shows: deploy history with timestamp, commit reference, preview URL, status (queued/building/live/failed), and a "Set as Live" button on each successful past deploy. This replaces the current modal.

Streaming build log. When Fritz clicks "Go Live," a terminal-style log panel opens below the chat, streaming Netlify build output line by line. Log levels (info/warn/error) are color-coded. Fritz watches the deploy in real time instead of waiting for a final message.

Status pill in the Studio header (always visible): green for "Production: Live", yellow for "Production: Building", red for "Production: Failed", gray for "Not deployed." Clicking the pill opens the deploy panel.

Deploy lock toggle. A lock icon in the Studio header prevents accidental production deploys during active development. When locked, the "Go Live" button shows a tooltip: "Deploy lock is on — click to unlock."

---

---

# SECTION 12: THE STUDIO COMPANION (PIP)

## V1 TODAY

Pip is a reactive chatbot. It waits for input and responds. The chat placeholder text is always "Message Pip..." — static, no contextual affordance. There are no slash commands, no `@` context mentions, no autocomplete in the chat input.

Pip has no awareness of the current page in preview, active errors in the console, or what build just completed. It does not know what is on the screen unless told.

After a build completes, Pip does not emit any proactive message. Fritz must navigate to the Verify tab manually to see the brand health score. If the score dropped, Pip will not notice.

Pip does not accumulate preferences. If Fritz dismisses a suggestion or asks Pip to stop offering a specific type of advice, Pip will offer it again in the next session — there is no preference store.

The "decision log" in the sidebar captures design decisions during a session but does not persist in a way that informs future sessions. `spec.json → design_decisions` accumulates but the quality degrades over time as stale entries pile up.

`famtastic-dna.md` and `STUDIO-CONTEXT.md` are primitive approximations of structural memory — correct instinct, executed as static file injection rather than dynamic context that reflects current state.

## INDUSTRY STANDARD

The STUDIO-DISCOVERY.md Pip design brief synthesizes the industry pattern into three categories of what Pip is not: not a chatbot (waits for input), not a wizard (predetermines sequence), not a personality (mascot with quirks).

Cursor defines the co-pilot pattern: the AI is invisible until needed, then immediately available. No mode switches. No per-session setup. The rules files and codebase index mean Cursor knows the project the moment it opens.

Microsoft 365 Copilot's 2026 roadmap direction: away from "ask the assistant" toward "the assistant notices and acts." Background execution without explicit invocation. Proactive suggestions inserted into documents.

Windsurf (Codeium): aware of current terminal state, running errors, recent file changes — not just codebase structure. Environmental awareness in real time.

The three-layer model from STUDIO-DISCOVERY.md Section 8: structural memory (project rules, what the AI knows permanently), session memory (current conversation, recent decisions), ambient awareness (current page, active errors, recent build results). Without all three layers, the assistant is incomplete.

## STUDIO 2.0 DIRECTION

Pip becomes event-driven, not just message-driven. After every build complete event, Pip receives: build result, brand health score, pages built, post-processing results. Pip evaluates these and emits a proactive message when warranted — not on every build, only when state is interesting:
- Brand score < 13: "Two checklist items flagged — [view issues] or [auto-fix both]"
- First build on a new page: "The About page just got its first build. Brand health: 13/13. Want to set the Experience page next?"
- Score improved from prior build: "Back to 13/13 on this build."
- Score regressed: "Brand health dropped from 13/13 to 11/13 — 2 regressions. [View details]"

Slash commands in the chat input with autocomplete triggered on `/`: `/rebuild`, `/page`, `/check-brand`, `/deploy`, `/brief`, `/research`, `/rollback`, `/export`. Users discover capabilities through the interface they already use.

`@` context mentions with autocomplete triggered on `@`: `@page:home`, `@section:hero`, `@asset:logo-full.svg`, `@decision:typography`. Explicit context without explaining the full site history in every message.

Preference accumulation. When Fritz dismisses a suggestion type, Pip notes it in `sites/<tag>/.famtastic/pip-preferences.json`: `{ "suppress_proactive_brand_health_after_13_13": true }`. These preferences persist across sessions.

A "Context loaded" indicator at session start — a collapsible line: "Ready — I have 4 sessions of context on this site. [View what I know]." Fritz can see what Pip is working with.

---

---

# SECTION 13: FAMTASTIC SCORE / QUALITY GATES

## V1 TODAY

v1 has a five-check automated verification system that runs after every build (`spec.last_verification`):
1. `verifySlotAttributes()` — all `<img>` have `data-slot-id`, `data-slot-status`, `data-slot-role`
2. `verifyCssCoherence()` — CSS rules are syntactically valid, no orphaned selectors
3. `verifyCrossPageConsistency()` — nav/footer/head are identical across pages
4. `verifyHeadDependencies()` — FAMtastic DNA scripts linked (fam-motion, fam-shapes, fam-scroll, fam-hero)
5. `verifyLogoAndLayout()` — logo is SVG not text, main is contained (max-width, centered)

UI: green/yellow/red/gray pill in the toolbar. Verify tab in the sidebar shows per-check results.

The 13-item Groove Theory checklist (referenced in `famtastic-dna.md`) is a more comprehensive quality gate. The mandatory HTML skeleton system (`HERO_SKELETON_TEMPLATE` in `famtastic-skeletons.js`) enforces the `fam-hero-layered` BEM vocabulary at generation time.

Browser-based Phase 2 verification (5 Claude Code agents) exists as an optional, on-demand check — not automatic after every build.

What is NOT measured: visual design quality, FAMtastic-ness score, differentiation from cookie-cutter outputs, mobile responsiveness, accessibility, performance. The verification system checks structural correctness, not design quality.

Fritz acts on results by manually navigating to the Verify tab after a build. The pill in the toolbar is visible but passive — it does not trigger any Pip reaction or auto-fix.

## INDUSTRY STANDARD

v0 by Vercel's output quality guarantee is structural: every output uses shadcn/ui + Tailwind CSS, which means every output is production-ready, accessible, and consistent. The quality floor is baked into the generation constraints, not checked after the fact.

Adobe Firefly's filmstrip requires selection before use — the user can't accidentally commit to a poor result. The selection step IS the quality gate.

Cursor's repository intelligence analyzes commit history and file relationships to provide contextually aware suggestions — the quality check is embedded in generation, not bolted on afterward.

Google AI Studio's approach: show every parameter so users can diagnose quality issues themselves. Token count, temperature, system prompt — visible at all times so when the output is wrong, the user has the diagnostic tools.

The principle: the best quality gate is one that operates at generation time (skeletons, constraints, vocabulary enforcement) rather than at verification time (checking after the fact). Verification is necessary but not sufficient.

## STUDIO 2.0 DIRECTION

The FAMtastic Score becomes a visible, named concept — not just a pill in the toolbar. After every build, Pip emits: "FAMtastic Score: 13/13" or "FAMtastic Score: 11/13 — 2 issues." The score is the standard summary of build quality.

Expand the score beyond the 5 structural checks to cover:
- **BEM vocabulary check**: `fam-hero-layer--bg` (double-dash) vs. `fam-hero-layer-bg` (single-dash regression)
- **Inline style check**: count of `style="..."` attributes in generated HTML (target: 0 in site HTML)
- **Nav brand check**: is the nav using `<img src="assets/logo-full.svg">` or plain text?
- **Divider check**: are section dividers real SVG clip paths or straight lines?
- **Mobile viewport check**: does every page have `<meta name="viewport">`?

Auto-fix for known regressions. When verification catches a BEM single-dash, inline style, or plain-text nav brand, Pip offers an auto-fix button: "[Auto-fix 2 issues]". The fix runs the relevant post-processing functions without a full rebuild — surgical correction, zero tokens.

Phase 2 verification (Claude Code agents) triggers automatically when FAMtastic Score is below 13/13 on the first build of a new site. The result is surfaced as a "Deep review" card in the chat.

---

---

# SECTION 14: SCALE & BATCH OPERATIONS

## V1 TODAY

v1 is single-site: one active site at a time, set by the `TAG` runtime variable in `server.js`. Switching sites requires running `fam-hub site switch <tag>` from the CLI, which updates the environment and restarts the Studio server.

Multi-site management: there is no Mission Control dashboard. Fritz cannot see all his sites in one view, compare build health across sites, or identify which sites need attention. The MCP server (`fam-hub admin health-check`) provides read-only diagnostics but no Studio integration.

The FAMTASTIC-VISION.md target is 1,000 income-generating digital products. Current reality: 1 deployed site (The Best Lawn Care). The gap between vision and reality is most acute here.

Batch operations: none. Building 10 sites requires 10 separate Studio sessions, one at a time.

The intelligence loop (`scripts/intelligence-loop`) runs per-site reports and writes `~/PENDING-REVIEW.md` outside the repo. A cron job runs it 09:00 Mon/Wed/Fri. But there is no Studio UI showing the pending review count or surfacing findings for the active site.

`fam-hub site build-batch` is listed in the medium-term roadmap but not implemented.

## INDUSTRY STANDARD

Adobe Creative Cloud Libraries solve the multi-project asset consistency problem: define brand assets once, access them across all projects. When the brand updates, all projects can pull the update — no manual file-by-file propagation.

v0's branch-per-session Git pattern: every AI session becomes a reviewable PR. At scale, this is an audit trail of every AI-assisted change across every site. Not implemented for that purpose in v0, but the pattern is relevant.

Vercel's Dashboard: shows all sites in one view with production status, last deploy time, and build health. Clicking any site surfaces its full deployment history and build logs.

ElevenLabs' tier model: subscription tiers that gate features and usage with clear communication about what each tier unlocks. At scale, the commercial model is legible to users before they need it.

The principle: at 100+ products, the operator's interface is more important than the builder's interface. Fritz needs to see the portfolio as a whole — health, revenue, activity, issues — without opening each site individually.

## STUDIO 2.0 DIRECTION

Mission Control: a separate Studio view accessible from the main navigation (not the per-site chat interface). Mission Control shows: all sites as cards (thumbnail, last build date, FAMtastic Score, deploy status), site filter by status (all/deployed/in-progress/needs-attention), and global metrics (total sites, average score, sites deployed this week).

Clicking a site card opens that site in the standard Studio chat interface — seamless context switch.

Needs-attention queue: sites with FAMtastic Score below 11/13, sites with failed deploys, or sites with stale builds (last build > 30 days ago) surface at the top of Mission Control with action buttons: [Rebuild], [Review], [Deploy].

Batch rebuild: select multiple sites and trigger a rebuild on all selected, sequentially. Progress shown in Mission Control with a per-site status column.

Intelligence loop findings surface in Mission Control as a "Findings" count badge: "3 pending findings across 2 sites." Clicking opens the findings in context for each site.

Site cloning: create a new site from an existing site's spec, brief, and component selections — the fast path for portfolio expansion when a new vertical is similar to an existing one.

---

---

# SECTION 15: STUDIO UI & BRANDING

## V1 TODAY

The Studio UI is functional and dark-themed. The three-panel layout (chat/preview/sidebar) is clean and readable. Real-time preview works. Build progress via streaming is visible.

But the Studio itself does not feel FAMtastic. The UI is generic — it looks like a competent internal tool, not like a product that "fearlessly deviates from established norms." The chat panel is a standard chat UI. The sidebar is a standard tab panel. The toolbar is a standard toolbar row.

The Studio UI file structure follows documented rules (CSS in `site-studio/public/css/` split by component: `studio-base.css`, `studio-panels.css`, `studio-chat.css`, `studio-sidebar.css`, `studio-modals.css`, `studio-terminal.css`). A known tech debt item: existing inline `<style>` block in `index.html` scheduled for extraction after Phase 1.5. Not yet extracted.

There is no visual identity in the Studio beyond the brand name. No FAMtastic-specific typography, no characteristic motion, no signature visual element that makes this environment feel like the product it is producing.

The preview iframe shows real site output in real time. When a site looks FAMtastic, the contrast between the FAMtastic output and the generic Studio chrome is stark.

The Studio does not embody the standard it holds its output to.

## INDUSTRY STANDARD

Figma's UI3 overhaul (2024-2025): the design application itself feels designed. Floating contextual panels, smooth transitions, thoughtful interaction details that communicate "this tool was made by designers, for designers." The Studio environment reinforces the standard it enables.

Framer's canvas-first model: the product makes its point by being a direct demonstration of what it can produce. A Framer site made with Framer is a living portfolio of the tool's capability.

Adobe Creative Cloud: the application UIs themselves reflect decades of design craft. Using Photoshop feels like being inside a world-class creative environment. The environment communicates competence and taste.

The principle from STUDIO-DISCOVERY.md Pattern 1: "Same interaction vocabulary, expanded result space." The environment should use the vocabulary of the product. A FAMtastic Studio should feel FAMtastic.

The principle from the empowering design statement: "Don't just give the author the canvas — empower him to understand how those tools work for him." The Studio UI is part of that empowerment. If the environment is generic, the message it sends is that generic is acceptable.

## STUDIO 2.0 DIRECTION

The Studio should use FAMtastic DNA assets directly: `fam-motion.js` scroll animations in the Studio chrome, `fam-shapes.css` geometric design elements in panel backgrounds, characteristic typography from the brand vocabulary. The Studio is a living demonstration of the visual language it produces.

Design system for the Studio UI: a named color palette, type scale, and motion vocabulary that is distinct from Tailwind defaults. These are defined in `studio-base.css` and referenced everywhere in the Studio CSS. Not arbitrary styles — the same intentionality the Studio demands of site output.

The FAMtastic Score pill becomes a design signature element — not a plain green dot but a branded quality indicator with character. When a site hits 13/13, the Studio celebrates — a brief motion sequence in the toolbar that acknowledges the achievement without being distracting.

The Pip chat interface uses a custom message bubble style — not the default chat bubble pattern but something that reads as distinctly Pip. The input area has personality in its placeholder text ("Tell me what to build...") that rotates based on site state: "The About page is waiting..." when there's an empty page.

The Studio environment must communicate: this is a premium creative production system built with the same standard it applies to its output.

---

---

# EMPOWERMENT AUDIT

For each of the 15 functional areas, this audit answers: does this give Fritz the canvas, the tools, AND the knowledge of how those tools empower him — or does it just execute for him?

Scale:
- **EXECUTES**: system does it, Fritz doesn't know it happened
- **INFORMS**: system does it, Fritz can see it happened
- **EMPOWERS**: system does it, Fritz understands why and can direct it differently next time
- **TRANSFORMS**: Fritz makes decisions he couldn't make before because the system taught him something

| Functional Area | V1 Level | V2 Target | What Would Make It TRANSFORM |
|-----------------|----------|-----------|------------------------------|
| 1. Workspace Architecture | EXECUTES | EMPOWERS | When the sidebar reacts to a build and shows the relevant panel, Fritz learns what "contextual UI" feels like — and starts trusting that the Studio surfaces the right thing at the right time. TRANSFORMS when Fritz can see the state model: "This panel is open because the last build had issues." |
| 2. Intent & Request Handling | EXECUTES | EMPOWERS | The intent confirmation card (v2 direction) moves this to INFORMS immediately. It becomes EMPOWERS when Fritz starts recognizing the intent names and uses them deliberately: "I know this will trigger layout_update — I'm ready for a 90-second rebuild." TRANSFORMS if Fritz can write his own intent patterns. |
| 3. Brief & Planning | INFORMS | TRANSFORMS | Currently INFORMS (brief is displayed). TRANSFORMS when the plan card before a build shows Fritz the structural plan and he learns to evaluate "does 3 sections per page match my intent?" — developing judgment about site architecture through repeated plan reviews. |
| 4. Generation Engine | EXECUTES | EMPOWERS | Phase badges move this to INFORMS. Token counter + cost-aware routing moves it to EMPOWERS. TRANSFORMS when Fritz develops intuition for what operations cost and starts pre-planning his session to stay within a context budget. |
| 5. Content Model & Editing | EXECUTES | EMPOWERS | The content panel (v2) makes fields editable without chat — INFORMS. EMPOWERS when Fritz understands which fields are structural (data-field-id) vs. AI-generated. TRANSFORMS if the system teaches Fritz the relationship between `data-field-id` attributes and the surgical edit pipeline. |
| 6. Asset Pipeline | EXECUTES | EMPOWERS | Currently EXECUTES (Fritz doesn't know Firefly is available). Multi-result filmstrip moves this to INFORMS. EMPOWERS when Fritz understands re-roll vs. vary — developing a generative image vocabulary. TRANSFORMS when Fritz uses insertion-point selection fluently to control where images land. |
| 7. Component Library | INFORMS | EMPOWERS | Currently INFORMS (library is visible). EMPOWERS when vertical affinity surfaces relevant components contextually. TRANSFORMS when Fritz reviews quality history and understands which components consistently score 13/13 — developing judgment about what to reuse vs. rebuild. |
| 8. Configuration Architecture | EXECUTES | EMPOWERS | Currently EXECUTES (dead settings lie about capabilities). Three-tier split (v2) moves to INFORMS. EMPOWERS when the Settings UI labels what each setting affects and why it is at that tier. TRANSFORMS when Fritz understands the per-site config model well enough to set up a new site deployment in under 2 minutes without a guide. |
| 9. AI Routing & Orchestration | EXECUTES | EMPOWERS | Brain selector is INFORMS (Fritz can see which model is active). Token counter + cost-aware routing moves to EMPOWERS. TRANSFORMS when Fritz has enough session cost data to make deliberate tradeoffs: "I'll keep this session surgical to stay under 50K tokens." |
| 10. Intelligence & Learning | EXECUTES | TRANSFORMS | Per-site knowledge.md and context indicator (v2) move this toward TRANSFORMS. The critical mechanism: Fritz should be able to read `sites/<tag>/.famtastic/knowledge.md` and recognize his own past decisions reflected back. When he edits a knowledge entry and sees it affect the next build, he becomes the system's teacher. |
| 11. Deployment & Environments | EXECUTES | EMPOWERS | Currently EXECUTES (one command, black box). Streaming log + deploy panel moves to INFORMS. Preview → Go Live workflow moves to EMPOWERS. TRANSFORMS when Fritz has made 10+ deliberate preview-then-promote decisions and understands the environment model well enough to explain it. |
| 12. The Studio Companion (Pip) | EXECUTES | TRANSFORMS | Proactive Pip, slash commands, context indicator, preference accumulation (v2) collectively move this toward TRANSFORMS. The mechanism: when Fritz sees Pip catch an issue he would have missed ("brand health dropped after that edit"), and when he sees Pip learn his preferences across sessions, he starts to think of Pip as a collaborator, not a tool. |
| 13. FAMtastic Score / Quality Gates | INFORMS | EMPOWERS | Currently INFORMS (pill shows pass/fail). Named FAMtastic Score + auto-fix (v2) moves to EMPOWERS. TRANSFORMS when Fritz starts predicting the score before it runs — when he knows "I changed a class name so BEM vocab check will fail" — because he has internalized the quality vocabulary. |
| 14. Scale & Batch Operations | EXECUTES | EMPOWERS | Currently EXECUTES (no visibility into portfolio health). Mission Control (v2) moves to INFORMS. Batch operations + needs-attention queue move to EMPOWERS. TRANSFORMS when Fritz reviews the portfolio weekly in Mission Control and makes deliberate allocation decisions: "Three sites need attention this week — I'll prioritize the highest-revenue one." |
| 15. Studio UI & Branding | EXECUTES | TRANSFORMS | Currently EXECUTES (the environment communicates nothing about the standard). A Studio that uses FAMtastic DNA assets communicates the standard implicitly. TRANSFORMS when Fritz notices the Studio itself as a demonstration of craft — and starts holding his output to that standard because the environment set it. |

**Summary:** V1 operates at EXECUTES across 9 of 15 areas. The Studio does things Fritz is not aware of, cannot direct, and cannot learn from. V2 targets EMPOWERS across all 15 areas and reaches for TRANSFORMS in the 5 highest-leverage areas: Intelligence & Learning, The Studio Companion (Pip), Brief & Planning, FAMtastic Score, and Studio UI.

---

---

# DECISION MATRIX

For each of the 15 areas: **INCORPORATE** (addable to v1 cleanly), **REFACTOR** (v1 needs meaningful rework), **REBUILD** (v1 approach is fundamentally incompatible), **DEFER** (not critical for current stage).

Scoring: Impact on Fritz's daily experience (40%) + Impact on output quality (35%) + Impact on scale to 1,000 products (25%)

| # | Functional Area | Decision | Daily XP (40%) | Output Quality (35%) | Scale (25%) | Weighted Score |
|---|-----------------|----------|---------------|---------------------|-------------|----------------|
| 2 | Intent & Request Handling | REFACTOR | 10 | 9 | 7 | 8.9 |
| 12 | The Studio Companion (Pip) | REFACTOR | 10 | 8 | 8 | 8.8 |
| 10 | Intelligence & Learning | REFACTOR | 9 | 10 | 8 | 9.2 |
| 4 | Generation Engine | INCORPORATE | 9 | 10 | 7 | 8.9 |
| 3 | Brief & Planning | INCORPORATE | 8 | 10 | 6 | 8.3 |
| 13 | FAMtastic Score / Quality Gates | INCORPORATE | 8 | 10 | 7 | 8.5 |
| 11 | Deployment & Environments | REFACTOR | 9 | 6 | 8 | 7.7 |
| 8 | Configuration Architecture | REBUILD | 7 | 5 | 10 | 7.0 |
| 1 | Workspace Architecture | REBUILD | 8 | 5 | 9 | 7.3 |
| 6 | Asset Pipeline | INCORPORATE | 8 | 8 | 5 | 7.3 |
| 9 | AI Routing & Orchestration | INCORPORATE | 7 | 8 | 7 | 7.4 |
| 5 | Content Model & Editing | REFACTOR | 7 | 7 | 6 | 6.8 |
| 15 | Studio UI & Branding | INCORPORATE | 7 | 6 | 5 | 6.2 |
| 7 | Component Library | INCORPORATE | 5 | 7 | 8 | 6.5 |
| 14 | Scale & Batch Operations | REBUILD | 4 | 4 | 10 | 5.5 |

**Sorted by weighted score, descending:**

| Rank | Area | Decision | Score |
|------|------|----------|-------|
| 1 | Intelligence & Learning | REFACTOR | 9.2 |
| 2 | Intent & Request Handling | REFACTOR | 8.9 |
| 3 | Generation Engine | INCORPORATE | 8.9 |
| 4 | The Studio Companion (Pip) | REFACTOR | 8.8 |
| 5 | FAMtastic Score / Quality Gates | INCORPORATE | 8.5 |
| 6 | Brief & Planning | INCORPORATE | 8.3 |
| 7 | AI Routing & Orchestration | INCORPORATE | 7.4 |
| 8 | Workspace Architecture | REBUILD | 7.3 |
| 9 | Asset Pipeline | INCORPORATE | 7.3 |
| 10 | Deployment & Environments | REFACTOR | 7.7 |
| 11 | Configuration Architecture | REBUILD | 7.0 |
| 12 | Content Model & Editing | REFACTOR | 6.8 |
| 13 | Component Library | INCORPORATE | 6.5 |
| 14 | Studio UI & Branding | INCORPORATE | 6.2 |
| 15 | Scale & Batch Operations | REBUILD | 5.5 |

**INCORPORATE candidates (can be added to v1 without structural changes):**
Areas 3, 4, 6, 7, 9, 13, 15. These are the first-wave changes — highest leverage, lowest risk.

**REFACTOR candidates (v1 needs meaningful rework in these areas):**
Areas 2, 5, 10, 11, 12. These require targeted surgery on specific functions and handlers, not wholesale replacement.

**REBUILD candidates (v1 approach is fundamentally incompatible with the target state):**
Areas 1, 8, 14. These require architectural decisions that cannot be made incrementally — particularly workspace state (requires per-session WebSocket isolation) and configuration (requires the three-tier split to be established before the Settings UI can be correct).

---

---

# TOP 5 HIGHEST LEVERAGE CHANGES

These five changes, implemented first, would most move Fritz from EXECUTES to TRANSFORMS in daily use.

---

## #1 — Per-Site Knowledge Files with Session Context Injection
**Score: 97**

Create `sites/<tag>/.famtastic/knowledge.md` for each active site. Auto-update it after every build using an extended `updateFamtasticDna()` that captures site-scoped decisions, issues resolved, brand vocabulary, and FAMtastic Score trend over the last 5 builds. Inject this file into `STUDIO-CONTEXT.md` generation at session start. Display a "Context loaded from N previous sessions" line at the start of each Pip conversation.

Fritz currently re-establishes context in every session. He explains decisions that were already made, hits regressions that were already fixed, and starts from a lower capability baseline than the system should allow. This single change compounds — every session from the second one forward starts with more information than the previous session. At 10 sites, each with 20 sessions, the accumulated knowledge becomes the most valuable part of the system.

**Implementation starting point:** Extend `updateFamtasticDna()` in `server.js` to accept a `tag` parameter and write to `sites/${tag}/.famtastic/knowledge.md` in addition to the global `famtastic-dna.md`. Modify `STUDIO-CONTEXT.md` generation to read and inject this file when it exists.

---

## #2 — Intent Classification Card with Pre-Execution Confirmation
**Score: 93**

Before executing any `layout_update`, `major_revision`, `build`, `deploy`, or `asset_import` intent, emit a dismissable confirmation card in the chat: "Treating this as `layout_update` — full rebuild, 3 pages affected. Estimated time: 90s. [Confirm] [Change to content_update] [Cancel]." Simultaneously display the classified intent label in the streaming output header for all intents, including content_update: "[INTENT: content_update → surgical edit]."

Fritz has no ability to catch classifier misroutings before they execute. A `layout_update` that should have been `content_update` wastes 90 seconds and introduces regression risk. This happens multiple times per session. The confirmation card gives Fritz a one-click interception point at the one moment where his judgment genuinely adds value: "is this what I meant?"

**Implementation starting point:** In `handleChatMessage()` in `server.js`, before routing to the intent handler, emit a `{type: 'intent-confirm', intent, estimatedTime, pagesAffected}` WebSocket message for the intents listed above. The client renders a confirm/cancel card. Only proceed to the handler on confirm. For `content_update` and `conversational_ack`, skip the card and proceed immediately.

---

## #3 — FAMtastic Score as Named, Active Quality Signal
**Score: 89**

Rename the build verification result from a toolbar pill to a named "FAMtastic Score" displayed in the chat after every build as a Pip message. Expand the score to include BEM double-dash vocabulary, inline style count, and nav brand check (total: 8 checks, score displayed as X/8 or X/13 depending on scope). Add auto-fix for known regressions — when a violation is caught, Pip offers "[Auto-fix N issues]" as a single-click button that runs the surgical correction without a full rebuild.

Currently the verification result is passive — Fritz must navigate to the Verify tab to see it. It does not trigger any Pip action. The auto-fix button closes the loop: Fritz sees the issue, clicks fix, sees the score recover. Over 20 builds, Fritz internalizes what the score measures and starts predicting it before it runs. That is the TRANSFORMS outcome.

**Implementation starting point:** At the end of `runPostProcessing()` after `verifyBuild()` runs, emit the score to the WebSocket as a `{type: 'chat', role: 'pip', content: 'FAMtastic Score: X/Y — [details]'}` message. If score < 13/13, append the auto-fix button payload. The auto-fix handler calls the specific post-processing functions for the failed checks without triggering a full Claude generation call.

---

## #4 — Slash Commands in Chat with Autocomplete
**Score: 85**

Implement `/` triggered autocomplete in the Pip chat input. Start with 8 commands covering the most common intents: `/rebuild`, `/page [name]`, `/check-brand`, `/deploy`, `/brief`, `/research`, `/rollback`, `/export`. The autocomplete menu shows the command name, a one-line description of what it does, and its keyboard shortcut if applicable.

18+ intent categories are invisible. Fritz discovers capabilities through trial and error. Slash commands make the system's full capability surface discoverable from the interface Fritz uses on every interaction. Typing `/` and seeing 8 options teaches Fritz more about what Studio can do in 30 seconds than any documentation. This directly drives capability utilization — unused capabilities are effectively not built.

**Implementation starting point:** Add a `keyup` listener on the chat input in `site-studio/public/index.html` (or its extracted JS equivalent) that triggers when the input starts with `/`. Render an autocomplete dropdown sourced from a `SLASH_COMMANDS` array defined in the client-side JavaScript. On selection, replace the input content with the command text and optionally submit it. Each command maps to an explicit prompt string that the existing classifier will correctly route.

---

## #5 — Phase Badges in Build Output Stream
**Score: 82**

Add phase transition badges to the build stream output. As the build progresses, the streaming chat response inserts a labeled line at each phase transition: `[PLANNING]`, `[GENERATING: template]`, `[GENERATING: page 2/3]`, `[POST-PROCESSING]`, `[VERIFYING]`, `[COMPLETE: 13/13 — 87 seconds]`. The final line includes total time and FAMtastic Score.

Fritz currently sees a spinner with no phase information. He cannot distinguish between a 90-second full rebuild and a 5-second surgical edit until the spinner stops. He cannot diagnose why a build is slow (is it the generation or the post-processing?). Phase badges build a mental model of the pipeline — after 30 builds, Fritz knows what "generating" means and can estimate how long it will take. That intuition is the foundation of EMPOWERS.

**Implementation starting point:** In `server.js`, before each major phase of `parallelBuild()` or `handleChatMessage()`, emit a `{type: 'phase', phase: 'GENERATING_TEMPLATE'}` WebSocket message. The client renders these as styled phase markers in the chat stream. The phase list matches the actual execution order in `runPostProcessing()` and `parallelBuild()`.

---

---

# THE EMPOWERING DESIGN STATEMENT

The statement to evaluate:

> "Don't just give the author the canvas — when given advanced tooling, empower him to understand how those tools work for him, then allow him to magically take shape."

---

## Where Does V1 Fail This Statement?

**V1 fails this statement in 9 of 15 areas by operating at EXECUTES.**

The most direct failures:

**The canvas exists but the tools are invisible.** The build pipeline runs. HTML is generated. Post-processing fires. Brand health is computed. The FAMtastic Score is measured. None of this is communicated to Fritz during or after the build. The spinner starts, something happens, the spinner stops, HTML changes. Fritz cannot see the pipeline he is relying on. You cannot understand tools you cannot see.

**The classifier is the most consequential tool in daily use and it is completely opaque.** Fritz sends a message. 18+ intents exist. One is selected. An execution path runs. Fritz sees none of this. When the wrong intent is selected — and REWRITE-CONTEXT-PACKAGE.md documents specific false positives that happen in regular use — Fritz cannot catch it because he does not know what is being decided. A tool that makes decisions Fritz cannot see or intercept is not empowering him; it is executing for him.

**Configuration lies.** Six dead settings in `studio-config.json` accept user input and do nothing. This is the opposite of empowerment: the system communicates that Fritz has control over settings he does not. Fake affordances erode trust. When users discover that a setting they configured does nothing, they lose confidence in all settings — including the ones that work.

**Intelligence is accumulated but not surfaced.** `famtastic-dna.md`, `design_decisions`, session summaries — all captured, all useful, none visible or actionable for Fritz in the Studio UI. The system is learning but not teaching. A tool that learns in secret empowers nobody.

---

## Where Does the V2 Direction Meet This Statement?

**The intent confirmation card** is the single most direct fulfillment of the statement. Fritz sees what intent was classified before it executes. He can change it. He can cancel it. Over 50 builds, he will internalize the intent vocabulary — and start crafting his messages to route correctly. The tool teaches through transparency.

**Per-site knowledge files** meet the "understand how those tools work for him" requirement. When Fritz reads `sites/<tag>/.famtastic/knowledge.md` and sees his own decisions reflected back — accurately, specifically, in language that matches his builds — he understands that the system is accumulating knowledge on his behalf. He becomes the system's teacher by editing the file, which feeds back into the next session. This is the "allow him to magically take shape" moment: Fritz sees himself in the system.

**Phase badges and token counts** meet the statement's "understand how those tools work" clause. Watching the build move through PLANNING → GENERATING → POST-PROCESSING → VERIFYING → COMPLETE teaches the pipeline structure through repeated observation. The token counter builds cost intuition. After 20 sessions, Fritz knows what "generating" means, what it costs, and how to pre-plan a session to stay within budget. These are not features — they are lessons delivered through use.

**Proactive Pip** meets "allow him to magically take shape." When Pip catches a brand health regression Fritz would have missed, and offers to auto-fix it, Fritz experiences the system acting with his interests in mind. The "magic" is that good results happen without Fritz having to be vigilant about everything at once. The co-pilot handles the floor; Fritz directs the ceiling.

---

## What Is Still Missing From V2 That This Statement Demands?

**Three things the statement requires that v2 has not fully designed:**

**1. Fritz's ability to shape the system's understanding of him — not just benefit from it.**

The v2 direction captures knowledge automatically (per-site knowledge files, preference accumulation, decision memory). This is necessary but not sufficient for the statement's second clause: "empower him... then allow him to magically take shape." "Take shape" implies Fritz is shaping something — not just receiving the benefit of the system's accumulation.

What is missing: Fritz should be able to author rules. Not just accept what the system learned, but write standing instructions that the system follows: "For all rooftop bar sites, always use dark backgrounds with warm ambient lighting descriptions in the hero." This is the Cursor `.cursor/rules/` pattern applied to FAMtastic creative direction. Fritz becomes the system's teacher, not just its user. The v2 direction gestures at editable knowledge files but does not design the rules-file interaction model explicitly.

**2. A moment of genuine surprise that builds confidence through unexpected rightness.**

The statement references "magic" — and magic in software is the experience of something working better than you expected, in a way that makes you trust the system more. v0 achieves this when a screenshot-to-code conversion is better than what a competent developer would write manually. Cursor achieves this when the AI fixes a bug in a file Fritz forgot existed.

FAMtastic v2 has not designed its version of this moment. The highest-probability candidate: Pip surfacing a component from the library with a note "I think this is what you need for the experience page" before Fritz asks — and being right. That moment of unexpected, accurate helpfulness is what graduates a tool from "useful" to "indispensable." The v2 direction describes Pip's proactive behavior but does not specify the contextual triggers that would produce genuine surprise.

**3. A legible cost model that teaches Fritz what his tooling costs him — and makes that empowering rather than anxiety-inducing.**

The statement's "understand how those tools work for him" includes understanding the cost of using those tools. Token counts and session cost summaries (v2 direction) move in this direction. But the design does not yet address the question of how to make cost awareness empowering rather than constraining — how to teach Fritz to think about context window utilization as a creative constraint he navigates deliberately, like a word count or a time budget, rather than as a limit he fears.

The missing piece: a session planning view. Before starting a complex multi-page build, Fritz sees an estimated session cost breakdown: "Building 3 pages with full rebuild will cost approximately 60K tokens. Alternatively, surgical edits to 3 sections would cost approximately 8K tokens." Fritz chooses his approach with cost information. The magic: Fritz discovers that he can accomplish 90% of what he wanted with 15% of the tokens, and his builds become more surgical, more intentional, and less prone to cascading regressions.

---

*Document complete. 15 areas. Empowerment Audit. Decision Matrix. Top 5. Design Statement evaluation.*  
*Built from REWRITE-CONTEXT-PACKAGE.md (v1 reality) and STUDIO-DISCOVERY.md (industry research).*  
*Use the Decision Matrix INCORPORATE list as the first implementation wave.*
