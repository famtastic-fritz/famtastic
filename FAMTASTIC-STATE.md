# FAMTASTIC-STATE.md — Canonical Project Reference

**Last updated:** 2026-03-25

---

## What FAMtastic Site Studio Is

FAMtastic Site Studio is a chat-driven website factory that generates production-ready HTML+Tailwind CSS websites from natural language conversation. A user opens a browser-based chat interface, describes the site they want, and the system generates multi-page HTML, provides a live preview, and deploys to Netlify — all without the user writing code or leaving the chat. It differs from page builders like Squarespace or Wix in three ways: it produces standalone HTML files with no platform lock-in, it uses an AI-powered design brief and decision memory system that prevents cookie-cutter output across turns, and it runs entirely on localhost using the Claude CLI (no API keys, no SaaS dependency). The system is currently single-user and localhost-only, built and operated by Fritz Medine, a Drupal developer exploring AI-assisted site production for small business clients.

---

## Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| AI Engine | Claude CLI (`claude --print`) | Generates all HTML, SVG assets, design briefs, session summaries, and image prompts. Uses the Claude Code subscription — no separate API key. Default model: `claude-haiku-4-5-20251001`. |
| Backend | Node.js + Express 4.21 | HTTP server, REST API endpoints, WebSocket server for real-time chat and preview updates. Single file: `site-studio/server.js` (5,162 lines). |
| Frontend | Single HTML file + Tailwind CDN | `site-studio/public/index.html` (3,768 lines). Chat panel, iframe preview, studio sidebar, modals. No build step, no framework. |
| CSS (generated sites) | Tailwind CSS via CDN + `assets/styles.css` | Zero build step. CSS custom properties (`--color-primary`, `--color-accent`, `--color-bg`) map from spec colors. Shared styles extracted to external CSS by post-processor; page-specific styles stay inline via `<style data-page="true">`. |
| WebSocket | `ws` 8.18 | Real-time bidirectional: chat messages, build progress, preview reload, panel updates. |
| File Upload | `multer` 2.1 | Image upload with drag-drop, paste, file picker. 5MB limit, 100 files per site (configurable). SVG sanitization on upload. |
| Email | `nodemailer` 8.0 | Share deployed sites via Gmail/Outlook/SendGrid SMTP. |
| SMS | `twilio` 5.13, `@vonage/server-sdk` 3.26 | Server-side SMS providers configured but practical path uses macOS `sms:` URI scheme. |
| Deploy | Netlify CLI (primary), Cloudflare Wrangler, Vercel CLI | `scripts/site-deploy` handles all three. Netlify is tested and deployed in production. |
| Testing | Vitest 4.1 | 52 unit tests across 10 function suites. No integration or smoke tests yet. |
| Config | `~/.config/famtastic/studio-config.json` | Model selection, deploy target/team, brainstorm profile, email/SMS credentials, upload limits (default 100), version limits, analytics, stock photo API keys (Unsplash/Pexels/Pixabay). Editable via Settings UI in Studio. |
| CLI | Bash (`scripts/fam-hub`) | Unified CLI dispatcher: `site`, `idea`, `agent`, `admin`, `convo`, `ingest` subcommands. |
| Conversation State | JSONL | Per-site `conversation.jsonl` with rolling window truncation (500 messages, trims at 600+). |
| Site State | JSON | `spec.json` (design brief, decisions, media specs, slot_mappings, deploy info) + `.studio.json` (session state, versions) + `blueprint.json` (per-page sections, components, layout notes). |
| MCP | stdio JSON-RPC | `mcp-server/server.js` exposes site state to Claude Desktop/Code. 4 tools: `list_sites`, `get_site_state`, `get_session_summary`, `suggest_tech_stack`. |

---

## End-to-End Pipeline

**Step 1 — Launch.** `fam-hub site new <tag>` starts `server.js` on port 3334, opens browser, creates `sites/<tag>/` with minimal `spec.json` and empty `dist/`.

**Step 2 — Classification.** Message arrives over WebSocket. `classifyRequest()` checks for approved design brief. None → intent `new_site`.

**Step 3 — Planning.** `handlePlanning()` calls `spawnClaude()` (3-min timeout). Claude returns a structured `DESIGN_BRIEF` block. Stored in `spec.json`. Studio UI renders brief card: Build From Brief / Edit Brief / Skip to Build.

**Step 4 — Build.** User clicks "Build From Brief." System reads `spec.pages` or falls back to `design_brief.must_have_sections`. For each page, constructs a prompt with: design brief, active decisions, session summaries, uploaded asset metadata, anti-cookie-cutter rules, blueprint context, slot ID preservation instruction, and `IMAGE SLOTS (CRITICAL)` section. Claude generates `MULTI_UPDATE` response with `--- PAGE: filename.html ---` delimiters.

**Step 5 — Post-build pipeline.** `runPostProcessing()` runs for each page:
1. `versionFile()` — snapshot to `dist/.versions/<page>/<timestamp>.html`
2. Write HTML to `dist/<page>`
3. `extractDecisions()` — parse `CHANGES:` summary, log design decisions
4. `extractAndRegisterSlots()` — scan for `data-slot-id`, merge into `media_specs` — **runs FIRST** so slots exist before mappings
5. `reapplySlotMappings()` — re-apply saved `{ src, alt, provider, query, credit }` from `spec.slot_mappings`
6. `updateBlueprint()` + `injectSeoMeta()` — metadata updates
7. `reconcileSlotMappings()` — remove `slot_mappings` keys not found in any page HTML
8. `applyLogoV()` — swap `[data-logo-v]` anchor content (img if logo file exists, site name text otherwise)
9. `syncNavPartial()` / `syncFooterPartial()` — extract and propagate nav/footer across pages
10. `ensureHeadDependencies()` — inject Tailwind CDN, Google Fonts (runs on full builds AND single-page edits)
11. `syncHeadSection()` — propagate shared head elements using MD5 hash fingerprinting
12. `extractSharedCss()` — extract shared `<style>` blocks to `dist/assets/styles.css` (selective — only strips styles matching extracted content)
13. Append build metrics to `build-metrics.jsonl`
14. WebSocket sends `reload-preview` and `pages-updated`

**Step 6 — Images.** "Add images" → `fill_stock_photos` intent. Reads all `empty` slots from `media_specs`. Builds contextual queries: `"${businessName} ${industry} ${role}"`. Calls `scripts/stock-photo` per slot. Stores `{ src, alt, provider, query, credit }` in `slot_mappings`.

**Step 7 — Deploy.** "Deploy" → `runDeploy()` → `scripts/site-deploy`. Checks Netlify site ID in `.netlify/state.json` (or falls back to `spec.json`). Runs `netlify deploy --dir=dist --prod`. Updates `spec.json` with `deployed_url`, `deployed_at`, `deploy_provider`, `state: "deployed"`.

---

## Feature Map

### Core Engine

**Request Classifier** — `classifyRequest(message, spec)`. 18 intent types with anchored patterns: `brief_edit`, `brand_health`, `brainstorm`, `rollback` (requires version/previous context near "restore"), `version_history` (requires "version" anchor), `summarize`, `data_model`, `tech_advice`, `template_import`, `page_switch`, `deploy`, `build`, `query`, `asset_import`, `fill_stock_photos`, `new_site`, `major_revision`, `restyle`, `layout_update`, `content_update`, `bug_fix`. Default fallback: `layout_update`.

**Planning Mode** — `handlePlanning()`. Produces `design_brief` in `spec.json`. Three-button UI: Build From Brief, Edit Brief, Skip to Build.

**Design Decisions Log** — `extractDecisions()`. Memory spine for every stylistic/structural decision. Injected into every prompt.

**Site Blueprint System** — `blueprint.json` per site. `updateBlueprint(writtenPages)` auto-extracts after every build. `buildBlueprintContext(page)` injects into prompts. Prevents rebuild regression. API: `GET/POST /api/blueprint`.

**Curated Prompt Builder** — `buildPromptContext()`. Returns `resolvedPage` (no longer mutates module-level `currentPage`). Layered prompts: brief + all approved decisions (2000-char cap) + summaries + assets + blueprint + anti-cookie-cutter rules + slot ID preservation + mode-specific instructions. Auto-page-switch matches both `about.html` and "the about page" patterns.

**Claude CLI Integration** — `spawnClaude()`. Pipes via `child.stdin.write()` to `claude --print --model <model> --tools ""` with `CLAUDECODE` unset. Timeouts: 5min (builds), 3min (planning/brainstorm/data-model), 2min (summaries/image-prompts).

**spec.json Write-Through Cache** — `readSpec()`/`writeSpec()`. All spec access goes through cache. Invalidated on site switch.

### Multi-Page Sites

**MULTI_UPDATE Format** — All pages in single response with `--- PAGE: filename.html ---` delimiters. Stream-based page detection for granular progress.

**Nav/Footer/Head Sync** — `syncNavPartial()`, `syncFooterPartial()`, `syncHeadSection()`. Run after every build.

**External CSS Extraction** — `extractSharedCss()`. Extracts shared `<style>` blocks to `dist/assets/styles.css`. Selectively strips only styles whose content matches what was extracted from index.html — page-specific styles stay inline.

### Image System

**Slot-Based Identity** — Every `<img>` carries `data-slot-id`, `data-slot-status` (`empty`/`stock`/`uploaded`/`final`), `data-slot-role` (`hero`/`testimonial`/`team`/`service`/`gallery`/`favicon`). Identity survives HTML regeneration.

**Logo-V System** — Logo anchors carry `data-logo-v`. `applyLogoV(pages)` runs after every build and every logo upload. If `assets/logo.{ext}` exists → `<img>`. If not → site name as styled text. Canonical path: `assets/logo.{ext}`.

**media_specs** — Array in `spec.json`. Single source of truth for all image slots. Each entry: `{ slot_id, role, dimensions, status, page }`.

**Slot Extraction** — `extractSlotsFromPage()` / `extractAndRegisterSlots(pages)`. Runs after every build AND every single-page edit (isFullBuild guard removed). Preserves existing status (never regresses `stock` → `empty`).

**Slot Lifecycle Integrity** — `reconcileSlotMappings()` removes orphaned slot_mappings after every build. `POST /api/rescan` re-scans all pages + reconciles on demand. "Rescan" button in preview toolbar. Slot ID stability injection in single-page edit prompts prevents ID drift across rebuilds.

**Slot Mapping Persistence** — `spec.json → slot_mappings` stores `{ src, alt, provider, query, credit }` per slot. Written by `replace-slot`, `fill_stock_photos`, and `stock-apply`. `reapplySlotMappings()` re-applies after every build. `POST /api/clear-slot-mapping` resets a slot to empty.

**Provider Abstraction** — `fetchFromProvider(provider, query, width, height, limit)`. Providers: `'unsplash'` (Unsplash API), `'pexels'` (Pexels API), `'placeholder'` (styled SVG data URL — zero dependencies, always works). Returns `[{ url, thumb, credit, provider }]`.

**Stock Photo Fill** — `scripts/stock-photo` (3-provider fallback: Unsplash → Pexels → Pixabay). Contextual queries: `"${businessName} ${industry} ${role}"`. Endpoints:
- `POST /api/stock-photo` — auto-applies first result (bulk fill)
- `GET /api/stock-search?slot_id&query` — returns 6-thumbnail preview grid for QSF
- `POST /api/stock-apply` — downloads and applies user-selected URL

**Upload-to-Replace** — `POST /api/replace-slot`. Targets by slot ID, updates status to `uploaded`, deletes old stock photo, stores mapping.

**Visual Slot Mode** — "Slots" toggle switches iframe to `/slot-preview/:page`. Slot inspector script decorates every `[data-slot-id]` with colored overlays (red=empty, yellow=stock, green=uploaded), hover tooltips, click handler → postMessage → QSF panel opens.

**Quick Slot Fill (QSF)** — Bottom-right panel. Shows upload thumbnails. Buttons: Upload / Stock / AI.
- **Stock flow:** Opens floating stock search panel with editable query + 6-thumbnail provider grid. Clicking a thumb applies via `POST /api/stock-apply`.
- **Slot detail bar:** Shows provider badge, credit, query used for already-assigned slot. "Clear" button calls `POST /api/clear-slot-mapping` + `POST /api/replace-slot` (resets to empty pixel).
- **Thumbnails:** Use `/site-assets/uploads/` path (routes through studio server port 3334 static handler).

**GET /api/site-info** — Alias that wraps `readSpec()` in `{ spec }` envelope for client code.

### Studio UI

**Layout** — Three-panel: chat (left), live preview iframe (center), studio sidebar (right). Mobile responsive: stacks vertically below 1024px.

**Preview Toolbar** — Page tabs, responsive preview toggle (Mobile 375px / Tablet 768px / Desktop), Slots toggle, Rescan button.

**Studio Sidebar Tabs** — Six tabs: Assets, Blueprint, Deploy, Design, History, Metrics.
- **Assets:** Brand Health (metrics dashboard), File Tree, Media Specs, Uploaded Assets.
- **Blueprint:** Per-page blueprint entries (sections, components, layout notes). Editable. API: `GET/POST /api/blueprint`.
- **Deploy:** Actions, Environments, Local Paths, Repository.
- **Design:** Design Brief (inline edit), Design Decisions (CRUD).
- **History:** Sessions, Version History.
- **Metrics:** Total builds, avg time, pages built, type breakdown, recent history. `GET /api/build-metrics`.

**Brand Health Metrics Dashboard** — Slot coverage progress bar (filled/total %), upload usage bar (count/limit), orphaned mappings count (amber if > 0, "Rescan to fix" inline), empty slot count with "Fill all with stock" + "Open Slots" actions. Key slots section (hero/logo/favicon), image sets (testimonials/gallery/services/team), social/meta, font icons. Flat per-slot list removed — slot management is in Slot Mode.

**Project Picker** — Header dropdown. One-click switch. `POST /api/switch-site` / `POST /api/new-site`.

**Settings Modal** — Model, deploy target/team, email/SMS providers, stock photo API keys (Unsplash/Pexels/Pixabay), upload limits (default 100), version limits, analytics. `GET /api/settings` returns redacted keys (`_configured: true/false`), `PUT /api/settings` accepts full values.

**Upload Modal** — Drag-drop, clipboard paste, file picker. Role selector + "Replace Image Slot" dropdown from `media_specs`. 5MB frontend validation. SVG sanitization.

**WebSocket Reconnect** — Exponential backoff (2s → 30s cap) + red banner.

**Accessibility** — `role="dialog"` + `aria-modal`, Esc/backdrop to close, auto-focus, ARIA labels, WCAG AA contrast.

### Intelligence Features

**Session Summaries** — Auto-generated via Claude on session end (3+ messages). Last 2-3 injected into every prompt.

**Site Versioning** — `versionFile()` snapshots before every HTML write. Max 50 (configurable). `auto_version` toggle.

**Rollback** — Chat or panel button. Saves pre-rollback state first. `GET /api/versions`, `POST /api/rollback`.

**Brainstorm Mode** — `handleBrainstorm()`. 3 profiles: deep/balanced/concise. Terminal mode: `fam-hub site brainstorm <tag>`. "Build This" writes brainstorm to blueprint before triggering build.

**Build Metrics** — `build-metrics.jsonl` per site. `GET /api/build-metrics`. Studio Metrics tab.

**Data Model Planning** — `handleDataModelPlanning()`. Concept-phase only. Stores `data_model` in spec.json.

**Tech Stack Analysis** — `analyzeTechStack()`. Runs during planning. Classifies as static/CMS/dynamic.

**AI Image Prompt Export** — `POST /api/generate-image-prompt`. Midjourney/DALL-E prompts tailored to brief.

**Form Handling** — Netlify Forms template with honeypot spam protection in build prompts.

**CSS Custom Properties** — `:root { --color-primary; --color-accent; --color-bg; }` required in build prompts.

**Analytics** — `analytics_provider` (ga4/plausible) + `analytics_id` in settings. Auto-injected into build prompts.

**SEO Validator** — Brand Health checks meta description, canonical URL, Schema.org JSON-LD, viewport, title, lang, alt text.

### Deploy and Share

**Deploy** — `scripts/site-deploy` (209 lines). Netlify (tested), Cloudflare Pages, Vercel. stdout/stderr separation.

**Share** — `POST /api/share`. Email (nodemailer), Text (macOS `sms:` URI), Copy Link (clipboard).

**Domain Helper** — `scripts/site-domain`. DNS record output for GoDaddy.

### Infrastructure

**CSRF, Path Traversal, Command Injection, ZIP Safety, SVG Sanitizer, Input Validation, Schema Validation, Conversation Truncation** — All implemented. See SITE-LEARNINGS.md gap analysis waves 1b–2.

**MCP Server** — `mcp-server/server.js` (343 lines). 4 tools via stdio JSON-RPC.

**Custom Claude Code Skills** — `/site-studio`, `/brainstorm`, `/export-site` in `.claude/skills/`.

---

## Known Gaps

### Open

| Gap | Priority | Detail |
|-----|----------|--------|
| Client-facing access | Tier 1 | Studio runs on localhost only. No way for clients to see or approve sites without deploying a draft URL. Biggest barrier to revenue. |
| Asset generate → insert | Tier 2 | SVG generation (`asset-generate`) creates files but doesn't wire back to replace placeholders in HTML. Deferred. |
| Smoke / integration tests | Tier 2 | 52 unit tests exist (10 suites). No end-to-end pipeline tests, no API endpoint tests, no WebSocket message flow tests. |
| Brainstorm recommendation chips | Tier 3 | Cherry-picking individual brainstorm suggestions not yet supported. "Build This" sends full context. |
| Blueprint cross-page relationships | Tier 3 | Blueprint auto-extract works per-page but doesn't track cross-page component relationships. |
| SMS send path non-functional | Tier 3 | Twilio/Vonage configured but practical path uses macOS `sms:` URI. Carrier gateways blocked. |
| `final` slot status unused | Tier 4 | Defined but no automated flow transitions slots to it. Reserved for future approval step. |
| `claude --print` is text-only | Tier 4 | Cannot pass uploaded images for vision analysis. Structural limitation of the CLI. |
| Platform dashboard deferred | Tier 4 | No multi-site management UI beyond CLI `fam-hub site list`. Deferred until 10+ sites. |

### Recently Closed (2026-03-25, Unified System Overhaul)

- **API key exposure** — GET /api/settings redacted with safeSettings()
- **Arbitrary spec overwrite** — update-spec WS whitelisted to 4 fields
- **Post-processing pipeline clobbering** — reordered: extract slots → reapply mappings → metadata → reconcile → logo → nav/footer → head deps → head sync → CSS extract. Single-page edits now run same core pipeline.
- **syncHeadSection 80-char fingerprint** — replaced with MD5 hash matching
- **extractSharedCss aggressive stripping** — now only strips styles matching extracted content
- **summarizeHtml was a no-op** — no longer dumps full HTML
- **Classifier false positives** — version_history anchored to "version", rollback anchored to version context
- **buildPromptContext mutation** — returns resolvedPage, caller mutates explicitly
- **Multi-tab session reset** — only first WS connection starts session
- **Parallel build timeout race condition** — timeout no longer double-increments counter
- **buildInProgress deadlock** — reset on ws.close and spawnClaude error
- **Multi-page fallback skipped post-processing** — now calls runPostProcessing
- **Single-page head deps missing** — ensureHeadDependencies runs on all paths
- **Template font URL encoding** — {{HEADING_FONT_URL}} with + encoding
- **Blueprint Tailwind classes** — isTailwindClass() filter, prefers id attribute
- **Schema misaligned** — 7 fields added to site-spec.schema.json
- **Tests** — 41 → 52 (11 new: truncateAssistantMessage, classifyRequest edge cases, ensureHeadDependencies)

### Closed (2026-03-24, Lifecycle Integrity + Media Intelligence)

- **about-hero not found in media_specs** — removed isFullBuild guard; `extractAndRegisterSlots` now runs on every page edit
- **Orphaned slot_mappings** — `reconcileSlotMappings()` + `POST /api/rescan` + toolbar button
- **Upload limit 20 with no recovery** — raised to 100 (config-driven via `max_uploads_per_site`)
- **Upload thumbnails broken** — `/assets/uploads/` → `/site-assets/uploads/`
- **Stock photo query generic** — now includes business name + industry + role
- **No stock provider fallback** — `fetchFromProvider('placeholder', ...)` SVG fallback, always works
- **No stock preview/selection** — QSF Stock shows 6-thumbnail grid with editable query + provider badges
- **No prompt visibility in stock fill** — slot detail bar in QSF: provider, credit, query, Clear button
- **Slot ID drift** — stability injection in single-page edit prompts

### Closed (2026-03-24, Visual Slot Mode + Logo-V)

- **No interactive image assignment UI** — Visual Slot Mode built: `/slot-preview/:page`, QSF panel.
- **Logo-V system** — `applyLogoV()`, `data-logo-v`, canonical `assets/logo.{ext}`.
- **Regex attribute order bug** — two-step patch for `src` before `data-slot-id` attribute order.

### Closed (2026-03-24, Stock Photo & Persistence)

- **Auto-placeholder in build pipeline** — removed from all 3 call sites.
- **Single-provider stock** — replaced with 3-provider fallback chain.
- **Images lost on rebuild** — `slot_mappings` persistence + `reapplySlotMappings()`.

### Closed (2026-03-24, Studio Hardening)

- Blueprint system, external CSS extraction, brainstorm profiles, build metrics dashboard, logo rule update.

### Closed (2026-03-23, Gap Analysis Waves 1–5)

All 34 findings closed: spec.json race condition, Claude CLI hang, security hardening (path traversal, CSRF, command injection, SVG, ZIP), data integrity (WS errors, conversation truncation, input/schema validation), UX/accessibility (reconnect, responsive, modals, ARIA, contrast), 41 unit tests, responsive preview toggle, form handling, SEO validator, CSS custom properties, analytics.

---

## Developer Environment

### Claude Code Plugins

Installed via `/plugin` CLI (interactive — cannot be scripted). Marketplaces: `claude-plugins-official` (Anthropic), `paddo-tools` (community).

Installed plugins: `frontend-design`, `feature-dev`, `code-review`, `commit-commands`, `security-guidance`, `github`, `agent-sdk-dev`, `playwright` from official marketplace; `gemini-tools` from paddo-tools.

Not available in any marketplace: `netlify`, `autofix-bot`, `aikido`, `sentry`.

### Global Settings (`~/.claude/settings.json`)

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1",
    "GITHUB_PERSONAL_ACCESS_TOKEN": "<set>",
    "GEMINI_API_KEY": "<set>"
  },
  "enabledPlugins": { ... },
  "extraKnownMarketplaces": { ... }
}
```

### OpenWolf

`openwolf@1.0.4` — token-conscious session tracking. Initialized in `~/famtastic/`. Creates `.wolf/` directory. 6 hooks registered in `~/famtastic/.claude/settings.json`. Daemon requires `pm2` (installed). Protocol: check `anatomy.md` before reading files, update `cerebrum.md` on new learnings, log to `memory.md` after significant actions.

### Agent Teams (Experimental)

`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` enabled. Requires new session to activate.

---

## Multi-Agent Integration

~60% built, currently paused. CLI wiring exists (`fam-hub agent run`, `fam-hub convo reconcile`). 3 agent adapters (Claude/Gemini/Codex). Conversation pipeline: `cj-compose-convo`, `cj-reconcile-convo`, `cj-ingest`, `cj-promote`. Resumes after site factory is generating revenue.

---

## What's Next

### 1. Client-Facing Access
Studio runs on localhost. Need a way for clients to see/approve work. Options: ngrok/Cloudflare Tunnel, Netlify draft deploys, or deploying Studio itself.

### 2. Asset Generate → Insert
SVG generation (`scripts/asset-generate`) creates assets but doesn't wire back to replace HTML slots. Planned: generate → approval modal → replace slot `src` → set status `final`.

### 3. Multi-Tier Website Factory
Current: HTML+Tailwind static only. Next: framework-aware factory supporting React+Next.js, Vue+Nuxt, WordPress, Drupal. In discussion phase.

### 4. Smoke and Integration Tests
41 unit tests exist. No API endpoint tests, no WebSocket flow tests, no end-to-end pipeline tests.

### 5. Second Deployed Client Site
Need to prove the system produces meaningfully different sites to validate anti-cookie-cutter mechanisms.

### 6. Multi-Agent Workflow Resume
~60% built, paused. Resumes after site factory revenue.

---

## Deployed Sites

| Site | URL | Pages | Netlify ID | Deploy Date |
|------|-----|-------|------------|-------------|
| The Best Lawn Care | https://the-best-lawn-care.netlify.app | 7 (index, services, about, testimonials, gallery, why-choose-us, contact) | d58f9ba9-78eb-4329-89e7-710fac8480fa | 2026-03-20 |

---

## File Inventory

### Core Application

| File | Lines | Purpose |
|------|-------|---------|
| `site-studio/server.js` | ~5,400 | Main backend. Express + WebSocket. Request classifier (anchored patterns), prompt builder (returns resolvedPage), blueprint system (semantic sections), CSS extraction (selective stripping), lifecycle integrity, multi-provider image system, post-build pipeline (ordered: slots→mappings→metadata→sync), safeSettings() redaction, multi-tab session guard, deadlock prevention. |
| `site-studio/public/index.html` | ~3,800 | Single-file frontend. Chat, preview iframe, studio sidebar (6 tabs), settings modal, upload modal, project picker, QSF panel with stock search grid and slot detail bar. Handles `chat` WS type. |
| `site-studio/package.json` | 24 | Node.js dependencies: express, ws, multer, nodemailer, twilio, @vonage/server-sdk. Dev: vitest. |
| `site-studio/tests/unit.test.js` | ~395 | 52 unit tests: isValidPageName (4), sanitizeSvg (9), extractSlotsFromPage (4), classifyRequest (15+4 edge), extractBrandColors (3), labelToFilename (5), truncateAssistantMessage (5), ensureHeadDependencies (1). |
| `site-studio/vitest.config.js` | 7 | Vitest ESM configuration. |
| `mcp-server/server.js` | 343 | MCP server. Exposes site state as resources via stdio JSON-RPC. 4 tools. |

### Key New Functions (2026-03-25)

| Function | File | Purpose |
|----------|------|---------|
| `safeSettings()` | server.js | Redacts API keys from settings, returns `_configured: true/false` |
| `isTailwindClass(cls)` | server.js | Filters Tailwind utility classes in blueprint section extraction |
| `truncateAssistantMessage(msg)` | server.js | Truncates HTML responses to summary for conversation history |
| `loadRecentConversation(count)` | server.js | Loads last N messages from conversation.jsonl |

### Key New Functions (2026-03-24)

| Function | File | Purpose |
|----------|------|---------|
| `reconcileSlotMappings()` | server.js | Removes orphaned slot_mappings keys after every build |
| `fetchFromProvider(provider, query, w, h, limit)` | server.js | Multi-provider abstraction: unsplash / pexels / placeholder |
| `applyLogoV(pages)` | server.js | Swaps `[data-logo-v]` anchor content based on logo file existence |
| `POST /api/rescan` | server.js | Manual rescan: extractAndRegisterSlots + reconcileSlotMappings |
| `GET /api/stock-search` | server.js | Returns 6-thumbnail preview grid for QSF Stock panel |
| `POST /api/stock-apply` | server.js | Downloads selected stock URL and applies to slot |
| `POST /api/clear-slot-mapping` | server.js | Removes slot_mappings key, resets status to empty |
| `GET /api/site-info` | server.js | `{ spec }` envelope alias of /api/spec |
| `showStockSearchPanel()` | index.html | QSF Stock preview grid with editable query |
| `runRescan()` | index.html | Calls /api/rescan, updates status bar + Brand Health |
| `clearSlotAssignment()` | index.html | QSF Clear button: empty pixel + clear mapping |

### Scripts

| File | Lines | Purpose |
|------|-------|---------|
| `scripts/fam-hub` | 340 | Unified CLI dispatcher. |
| `scripts/orchestrator-site` | 304 | Batch site generation. |
| `scripts/asset-generate` | 269 | SVG asset pipeline via Claude CLI. |
| `scripts/site-deploy` | 209 | Deploy to Netlify, Cloudflare, or Vercel. |
| `scripts/site-brainstorm` | 186 | Terminal brainstorm loop. |
| `scripts/lib/hub-common` | 161 | Shared bash library. |
| `scripts/tts-cli` | 149 | Text-to-speech CLI wrapper. |
| `scripts/site-export` | 101 | Export site as standalone project. |
| `scripts/site-import` | 101 | Import existing HTML into Studio. |
| `scripts/site-domain` | 84 | DNS record helper for GoDaddy. |
| `scripts/stock-photo` | 76 | 3-provider stock photo downloader (Unsplash → Pexels → Pixabay). |
| `scripts/claude-cli` | 12 | Claude CLI wrapper. |

### OpenWolf Files

| File | Purpose |
|------|---------|
| `.wolf/anatomy.md` | 266-file project index with token estimates |
| `.wolf/cerebrum.md` | Patterns, preferences, do-not-repeat rules |
| `.wolf/memory.md` | Per-session action log |
| `.wolf/config.json` | OpenWolf configuration |
| `.wolf/hooks/` | 6 JS hook files (pre-read, post-read, pre-write, post-write, session-start, stop) |
| `~/famtastic/.claude/settings.json` | Project-level hook registrations |

### Per-Site Files

| File | Purpose |
|------|---------|
| `sites/<tag>/spec.json` | Site spec: `design_brief`, `design_decisions`, `media_specs`, `uploaded_assets`, `slot_mappings` (`{ src, alt, provider, query, credit }`), `deployed_url`, `netlify_site_id`, `data_model`. |
| `sites/<tag>/blueprint.json` | Per-page sections, components, layout notes. |
| `sites/<tag>/build-metrics.jsonl` | One object per build. |
| `sites/<tag>/.studio.json` | Session state, version metadata. |
| `sites/<tag>/conversation.jsonl` | Chat history. |
| `sites/<tag>/summaries/session-NNN.md` | AI-generated session summaries. |
| `sites/<tag>/dist/assets/styles.css` | Extracted shared CSS. |
| `sites/<tag>/dist/assets/stock/` | Stock photos named `{slot-id}.jpg`. |
| `sites/<tag>/dist/assets/uploads/` | User uploads. |
| `sites/<tag>/dist/_partials/_nav.html` | Canonical nav. |

### Claude Code Skills

| File | Purpose |
|------|---------|
| `.claude/skills/export-site/SKILL.md` | `/export-site` |
| `.claude/skills/brainstorm/SKILL.md` | `/brainstorm` |
| `.claude/skills/site-studio/SKILL.md` | `/site-studio` |
