# FAMTASTIC-STATE.md — Canonical Project Reference

**Last updated:** 2026-04-07

---

## What FAMtastic Site Studio Is

FAMtastic Site Studio is a chat-driven website factory that generates production-ready HTML+Tailwind CSS websites from natural language conversation. A user opens a browser-based chat interface, describes the site they want, and the system generates multi-page HTML, provides a live preview, and deploys to Netlify — all without the user writing code or leaving the chat. It differs from page builders like Squarespace or Wix in three ways: it produces standalone HTML files with no platform lock-in, it uses an AI-powered design brief and decision memory system that prevents cookie-cutter output across turns, and it runs entirely on localhost using the Claude CLI (no API keys, no SaaS dependency). The system is currently single-user and localhost-only, built and operated by Fritz Medine, a Drupal developer exploring AI-assisted site production for small business clients.

---

## Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| AI Engine | Claude CLI (`claude --print`) | Generates all HTML, SVG assets, design briefs, session summaries, and image prompts. Uses the Claude Code subscription — no separate API key. Default model: `claude-sonnet-4-5`. |
| Backend | Node.js + Express 4.21 | HTTP server, REST API endpoints, WebSocket server for real-time chat and preview updates. Single file: `site-studio/server.js` (6,830 lines). |
| Frontend | Single HTML file + Tailwind CDN + 8 CSS files | `site-studio/public/index.html` (~5,620 lines). VS Code-inspired layout: left sidebar (Explorer), tabbed canvas (Preview, Editable View, Images, Research, Compare), bottom CLI bar (Chat, Terminal, Codex), right sidebar (Studio State). 8 CSS component files in `public/css/`. No build step, no framework. |
| CSS (generated sites) | Tailwind CSS via CDN + `assets/styles.css` | Zero build step. CSS custom properties (`--color-primary`, `--color-accent`, `--color-bg`) map from spec colors. Shared styles extracted to external CSS by post-processor; page-specific styles stay inline via `<style data-page="true">`. STUDIO LAYOUT FOUNDATION block injected by post-processor. |
| WebSocket | `ws` 8.18 | Real-time bidirectional: chat messages, build progress, preview reload, panel updates. |
| File Upload | `multer` 2.1 | Image upload with drag-drop, paste, file picker. 5MB limit, 100 files per site (configurable). SVG sanitization on upload. |
| Email | `nodemailer` 8.0 | Share deployed sites via Gmail/Outlook/SendGrid SMTP. |
| SMS | `twilio` 5.13, `@vonage/server-sdk` 3.26 | Server-side SMS providers configured but practical path uses macOS `sms:` URI scheme. |
| Deploy | Netlify CLI (primary), Cloudflare Wrangler, Vercel CLI | `scripts/site-deploy` handles all three. Netlify is tested and deployed in production. |
| Testing | Vitest 4.1 | 56 unit tests across 11 function suites. No integration or smoke tests yet. |
| Config | `~/.config/famtastic/studio-config.json` | Model selection, deploy target/team, brainstorm profile, email/SMS credentials, upload limits (default 100), version limits, analytics, stock photo API keys (Unsplash/Pexels/Pixabay), `hero_full_width` (default true). Editable via Settings UI in Studio. |
| CLI | Bash (`scripts/fam-hub`) | Unified CLI dispatcher: `site`, `idea`, `agent`, `admin`, `convo`, `ingest` subcommands. |
| Conversation State | JSONL | Per-site `conversation.jsonl` with rolling window truncation (500 messages, trims at 600+). |
| Site State | JSON | `spec.json` (design brief, decisions, media specs, slot_mappings, deploy info, last_verification) + `.studio.json` (session state, versions) + `blueprint.json` (per-page sections, components, layout notes). |
| MCP | stdio JSON-RPC | `mcp-server/server.js` exposes site state to Claude Desktop/Code. 4 tools: `list_sites`, `get_site_state`, `get_session_summary`, `suggest_tech_stack`. |

---

## End-to-End Pipeline

**Step 1 — Launch.** `fam-hub site new <tag>` starts `server.js` on port 3334, opens browser, creates `sites/<tag>/` with minimal `spec.json` and empty `dist/`.

**Step 2 — Classification.** Message arrives over WebSocket. `classifyRequest()` checks for approved design brief. None → intent `new_site`.

**Step 3 — Planning.** `handlePlanning()` calls `spawnClaude()` (3-min timeout). Claude returns a structured `DESIGN_BRIEF` block. Stored in `spec.json`. Studio UI renders brief card: Build From Brief / Edit Brief / Skip to Build.

**Step 4 — Build (Template-First).** User clicks "Build From Brief." `parallelBuild()` now uses a template-first architecture:

1. **Template build:** Builds `_template.html` first — header, nav, footer, and shared CSS (`<style data-template="shared">`) in a single Claude call via `buildTemplatePrompt()`. No page content.
2. **Template artifact extraction:** `writeTemplateArtifacts()` extracts `_partials/_nav.html`, `_partials/_footer.html`, and `assets/styles.css` from the template.
3. **Parallel page builds:** ALL pages (including index.html) build in true parallel. Each page receives the template context via `loadTemplateContext()` — the full `<head>`, header HTML, footer HTML, and shared CSS — and generates only its `<main>` content + `<style data-page="pagename">` block.
4. **Fallback:** If template build fails (exit code 1 or 0 bytes), falls back to legacy build (no template context, `sharedRules` only). Sites predating the template system also use legacy path.

**Step 5 — Post-build pipeline.** `runPostProcessing()` runs 6 steps:
1. `extractAndRegisterSlots()` — scan for `data-slot-id`, merge into `media_specs` (runs FIRST so slots exist before mappings)
2. `reapplySlotMappings()` — re-apply saved `{ src, alt, provider, query, credit }` from `spec.slot_mappings`
3. `updateBlueprint()` + `injectSeoMeta()` — metadata updates
4. `reconcileSlotMappings()` — remove `slot_mappings` keys not found in any page HTML
5. `applyLogoV()` — swap `[data-logo-v]` anchor content (img if logo file exists, site name text otherwise)
6. **Layout path split:**
   - **Template-first (full build with `_template.html`):** `applyTemplateToPages()` swaps inline `<style data-template="shared">` for `<link href="assets/styles.css">`
   - **Legacy (full build without template):** `syncNavPartial()`, `syncFooterPartial()`, `ensureHeadDependencies()`, `syncHeadSection()`, `extractSharedCss()`
   - **Single-page edit with template:** `applyTemplateToPages()`
   - **Single-page edit without template:** `syncNavFromPage()`, `syncFooterFromPage()`, `ensureHeadDependencies()`
7. `fixLayoutOverflow()` — injects STUDIO LAYOUT FOUNDATION CSS block (always runs, idempotent)

**Step 6 — Build Verification.** `runBuildVerification(writtenPages)` runs 5 zero-token file-based checks automatically inside `finishParallelBuild()`. Results stored in `spec.last_verification`, sent to client via `verification-result` WS message. Failures trigger amber chat notification (`verification-warning` WS message).

**Step 7 — Images.** "Add images" → `fill_stock_photos` intent. Reads all `empty` slots from `media_specs`. Contextual queries: `"${businessName} ${industry} ${role}"`. Calls `scripts/stock-photo` per slot.

**Step 8 — Deploy.** "Deploy" → `runDeploy()` → `scripts/site-deploy`. Netlify deploy --prod. Updates `spec.json` with `deployed_url`, `deployed_at`, `deploy_provider`, `state: "deployed"`.

---

## Layout Containment System

The build system enforces a **page-template layout model** (inspired by Drupal's template hierarchy):

- **Page level:** `html, body { margin: 0; padding: 0; }` — reset only, no overflow-x hidden
- **Header/Footer:** Full viewport width. Nav content inside `<div class="container">` (capped at 90rem)
- **Main content:** `main { max-width: 90%; margin: 0 auto; }` — centered content area that can never push header/footer wider
- **Hero breakout:** When `hero_full_width` setting is true (default), first section in main breaks to full viewport: `main > section:first-of-type { width: 100vw; position: relative; left: 50%; margin-left: -50vw; }`
- **Container class:** `.container { max-width: 90rem; margin: 0 auto; padding: 0 1.5rem; }` — used inside header, footer, and every section

`fixLayoutOverflow()` injects the **STUDIO LAYOUT FOUNDATION** CSS block into `assets/styles.css` on every build (idempotent — strips old block before prepending). Falls back to inline `<style>` injection when no `styles.css` exists.

Layout rules are also injected into both `buildTemplatePrompt()` and `spawnPage()` prompts so Claude-generated pages follow the containment conventions at generation time.

---

## Feature Map

### Core Engine

**Request Classifier** — `classifyRequest(message, spec)`. 21 intent types with anchored patterns: `brief_edit`, `brand_health`, `brainstorm`, `rollback` (requires version/previous context near "restore"), `version_history` (requires "version" anchor), `summarize`, `data_model`, `tech_advice`, `template_import`, `page_switch`, `deploy`, `build`, `query`, `asset_import`, `fill_stock_photos`, `new_site`, `major_revision`, `restyle`, `layout_update`, `content_update`, `bug_fix`. Default fallback: `layout_update`.

**Planning Mode** — `handlePlanning()`. Produces `design_brief` in `spec.json`. Three-button UI: Build From Brief, Edit Brief, Skip to Build.

**Design Decisions Log** — `extractDecisions()`. Memory spine for every stylistic/structural decision. Injected into every prompt.

**Site Blueprint System** — `blueprint.json` per site. `updateBlueprint(writtenPages)` auto-extracts after every build. `buildBlueprintContext(page)` injects into prompts. Prevents rebuild regression. API: `GET/POST /api/blueprint`.

**Curated Prompt Builder** — `buildPromptContext()`. Returns `resolvedPage` and `templateContext`. Layered prompts: brief + all approved decisions (2000-char cap) + summaries + assets + blueprint + anti-cookie-cutter rules + slot ID preservation + layout rules + mode-specific instructions. Auto-page-switch matches both `about.html` and "the about page" patterns.

**Claude CLI Integration** — `spawnClaude()`. Calls `claude --print --model <model> --tools ""` directly (no wrapper script). Pipes prompt via `child.stdin.write()`. Runs from `os.tmpdir()` as cwd to avoid reading `CLAUDE.md` project instructions. All `CLAUDE_*` env vars stripped to prevent nested-session detection. Timeouts: 5min (builds), 3min (planning/brainstorm/data-model), 2min (summaries/image-prompts).

**spec.json Write-Through Cache** — `readSpec()`/`writeSpec()`. All spec access goes through cache. Invalidated on site switch.

### Template-First Build System (2026-03-25)

**Template Build** — `buildTemplatePrompt()` generates the prompt for `_template.html`. Contains header, nav, footer, shared CSS in `<style data-template="shared">`, no page content. Layout foundation CSS embedded in template. Logo instruction, nav links, color/font theming included.

**Template Extraction** — `extractTemplateComponents(templateHtml)` parses template into `{ headBlock, headerHtml, footerHtml, sharedCss, navHtml }` using `data-template` attribute anchors.

**Template Artifacts** — `writeTemplateArtifacts()` writes `_partials/_nav.html`, `_partials/_footer.html`, and `assets/styles.css` from template components.

**Template Context Loading** — `loadTemplateContext()` reads `_template.html`, strips `<title>` from headBlock (prevents duplicates), formats for prompt injection into parallel page builds.

**Template-to-Page Application** — `applyTemplateToPages()` swaps inline `<style data-template="shared">` for `<link href="assets/styles.css">` with `fs.existsSync` guard. Tracks per-file `changed` flag and `updated` counter.

**Guard Flags** — `templateSpawned` flag prevents double-build race between timeout handler and close handler.

### Build Verification System (2026-03-30)

**Phase 1 — File-Based (always-on, zero tokens).** Five functions run automatically inside `finishParallelBuild()` after every build:

| Function | What it checks |
|----------|----------------|
| `verifySlotAttributes(pages)` | Every `<img>` has `data-slot-id`, `data-slot-status`, `data-slot-role` |
| `verifyCssCoherence()` | `assets/styles.css` exists, ≥50 lines, STUDIO LAYOUT FOUNDATION present exactly once, `:root` with CSS vars, `main` with 90% max-width |
| `verifyCrossPageConsistency(pages)` | Nav and footer HTML match across all pages; Google Fonts URL consistent |
| `verifyHeadDependencies(pages)` | Tailwind CDN, `assets/styles.css` link, Google Fonts present in every page's `<head>` |
| `verifyLogoAndLayout(pages)` | `data-logo-v` in nav, no legacy placeholder paths (`via.placeholder.com`, `placehold.it`), `<main>` exists on every page |

`runBuildVerification(pages)` orchestrates all five, computes `overallStatus` (failed > warned > passed), stores in `spec.last_verification`, sends `verification-result` WS message. Failed builds also send `verification-warning` amber chat notification.

**Phase 2 — Browser-Based (on-demand, costs tokens).** Five Claude Code agent definitions in `~/.claude/agents/`:

| Agent | What it checks |
|-------|----------------|
| `famtastic-visual-layout.md` | Header/footer viewport width, hero visibility, content centering, overflow |
| `famtastic-console-health.md` | JS console errors, 404 network failures |
| `famtastic-mobile-responsive.md` | Layout at 375px / 768px / 1280px viewports |
| `famtastic-accessibility.md` | Alt text, heading hierarchy, contrast, form labels |
| `famtastic-performance.md` | Request count, render-blocking resources, asset sizes |

Triggered manually — ask Claude Code to run a visual audit. Requires Chrome DevTools MCP. Deliberate cost gate: browser-based checks are most useful for pre-deploy final reviews, not every iterative edit.

**API Endpoints:**
- `GET /api/verify` — returns `spec.last_verification` (or 404 if no verification yet)
- `POST /api/verify` — triggers a manual `runBuildVerification(listPages())` and saves result
- `POST /api/visual-verify` — returns agent readiness info (agent list, Chrome DevTools status)

**Studio UI:**
- Verification pill in preview toolbar (green Verified / yellow Warnings / red N Issues / gray Unchecked). Clicking opens Verify tab.
- Verify tab (8th sidebar tab) — overall status badge, collapsible check sections with pass/fail/warn counts, Run Verification button, View in Browser button (opens Phase 2 prompt-copy modal).
- Amber chat notification on build failure with issue count.

### Multi-Page Sites

**Parallel Build** — All pages build in true parallel (no index-first serialization). Template-first path provides template context; legacy path provides `sharedRules`.

**Nav/Footer/Head Sync (Legacy)** — `syncNavPartial()`, `syncFooterPartial()`, `syncHeadSection()`. Only run on legacy (no-template) builds.

**External CSS Extraction (Legacy)** — `extractSharedCss()`. Selectively strips only styles matching extracted content. Only runs on legacy builds.

### Image System

**Slot-Based Identity** — Every `<img>` carries `data-slot-id`, `data-slot-status` (`empty`/`stock`/`uploaded`/`final`), `data-slot-role` (`hero`/`testimonial`/`team`/`service`/`gallery`/`favicon`). Identity survives HTML regeneration.

**Logo-V System** — Logo anchors carry `data-logo-v`. `applyLogoV(pages)` runs after every build and every logo upload. If `assets/logo.{ext}` exists → `<img>`. If not → site name as styled text.

**media_specs** — Array in `spec.json`. Single source of truth for all image slots. Each entry: `{ slot_id, role, dimensions, status, page }`.

**Slot Extraction** — `extractSlotsFromPage()` / `extractAndRegisterSlots(pages)`. Runs after every build AND every single-page edit. Preserves existing status (never regresses `stock` → `empty`).

**Slot Lifecycle Integrity** — `reconcileSlotMappings()` removes orphaned slot_mappings after every build. `POST /api/rescan` re-scans + reconciles on demand. Slot ID stability injection in all build prompts.

**Slot Mapping Persistence** — `spec.json → slot_mappings` stores `{ src, alt, provider, query, credit }` per slot. `reapplySlotMappings()` re-applies after every build.

**Provider Abstraction** — `fetchFromProvider(provider, query, width, height, limit)`. Providers: `'unsplash'`, `'pexels'`, `'placeholder'` (styled SVG, zero dependencies).

**Stock Photo Fill** — `scripts/stock-photo` (3-provider fallback: Unsplash → Pexels → Pixabay). Endpoints: `POST /api/stock-photo` (auto-apply), `GET /api/stock-search` (6-thumb grid), `POST /api/stock-apply` (user-selected).

**Upload-to-Replace** — `POST /api/replace-slot`. Targets by slot ID.

**Visual Slot Mode** — Slot inspector overlays (red=empty, yellow=stock, green=uploaded), hover tooltips, click → QSF panel.

**Quick Slot Fill (QSF)** — Upload / Stock / AI buttons. Stock flow: editable query + 6-thumbnail provider grid.

### Studio UI

**Layout** — Three-panel: chat (left), live preview iframe (center), studio sidebar (right). Mobile responsive below 1024px.

**Preview Toolbar** — Page tabs, responsive preview toggle (Mobile 375px / Tablet 768px / Desktop), Slots toggle, Rescan button, verification pill indicator (green/yellow/red/gray).

**Studio Sidebar Tabs** — Eight tabs: Assets, Blueprint, Deploy, Design, History, Metrics, Verify, Server.

**Brand Health Metrics Dashboard** — Slot coverage %, upload usage, orphaned mappings, empty slots, key slots, image sets, social/meta, font icons.

**Project Picker** — Header dropdown. `POST /api/switch-site` / `POST /api/new-site`. Both handlers are `async` with `await endSession()` before TAG change to prevent session summaries writing to the wrong site.

**Settings Modal** — Model, deploy target/team, email/SMS, stock photo API keys, upload limits, version limits, analytics, hero_full_width toggle.

**Upload Modal** — Drag-drop, clipboard paste, file picker. Role selector + slot targeting.

**WebSocket Reconnect** — Exponential backoff (2s → 30s cap) + red banner.

**WebSocket Message Guard** — Client-side `ws.onmessage` wraps `JSON.parse()` in try/catch — malformed messages are silently dropped rather than crashing the message loop.

### Intelligence Features

**Session Summaries** — Auto-generated via Claude on session end (3+ messages). Last 2-3 injected into every prompt.

**Site Versioning** — `versionFile()` snapshots before every HTML write. Max 50 (configurable). `auto_version` toggle.

**Rollback** — Chat or panel button. Saves pre-rollback state first.

**Brainstorm Mode** — `handleBrainstorm()`. 3 profiles: deep/balanced/concise. "Build This" writes brainstorm to blueprint before triggering build.

**Build Metrics** — `build-metrics.jsonl` per site. Studio Metrics tab.

**Conversation History** — `loadRecentConversation(15)` injects last 15 messages into every prompt. Assistant HTML truncated to `CHANGES:` summary.

**Data Model Planning** — `handleDataModelPlanning()`. Concept-phase only.

**Tech Stack Analysis** — `analyzeTechStack()`. Classifies as static/CMS/dynamic.

**AI Image Prompt Export** — `POST /api/generate-image-prompt`. Midjourney/DALL-E prompts.

**Form Handling** — Netlify Forms template with honeypot spam protection.

**CSS Custom Properties** — `:root { --color-primary; --color-accent; --color-bg; }` required.

**Analytics** — `analytics_provider` (ga4/plausible) + `analytics_id` in settings.

**SEO Validator** — Brand Health checks meta description, canonical URL, Schema.org JSON-LD, viewport, title, lang, alt text.

### Deploy and Share

**Per-Site Repos** — Each site gets its own repo at `~/famtastic-sites/<tag>/` with `dev`, `staging`, `main` branches. Auto-created on first build via `createSiteRepo()`. Scaffold files: CLAUDE.md (tweak instructions), SITE-LEARNINGS.md (design context), README.md. GitHub repo created via `gh repo create --private`.

**Git Flow** — Push to Repo → dev branch. Deploy to Staging → merge dev→staging. Deploy to Production → merge staging→main. All merges use `--no-edit`. Failed merges auto-abort (`git merge --abort`). `syncSiteRepo()` handles the full branch-aware flow with concurrency guard.

**Deploy** — `scripts/site-deploy` (209 lines). Netlify (tested), Cloudflare Pages, Vercel. Accepts `--env staging|production` flag. Separate Netlify sites per environment.

**Hub Repo** — `~/famtastic/` is pure tooling (sites/ in .gitignore). "Push Studio Code" button in Server tab pushes tooling changes via `pushHubRepo()`.

**Share** — `POST /api/share`. Email (nodemailer), Text (macOS `sms:` URI), Copy Link. `shareSite()` reads deployed URL from `deployInfoCache` (not from a DOM element).

**Domain Helper** — `scripts/site-domain`. DNS record output for GoDaddy.

### Infrastructure

**Security** — CSRF, Path Traversal, Command Injection, ZIP Safety, SVG Sanitizer, Input Validation, Schema Validation, Conversation Truncation. API key redaction via `safeSettings()`.

**MCP Server** — `mcp-server/server.js` (343 lines). 4 tools via stdio JSON-RPC.

**Custom Claude Code Skills** — `/site-studio`, `/brainstorm`, `/export-site` in `.claude/skills/`.

---

## Known Gaps

### Open

| Gap | Priority | Detail |
|-----|----------|--------|
| Revenue path (end-to-end) | Tier 1 | The full transaction flow: site build → client preview → payment (PayPal) → domain provisioning (GoDaddy reseller) → live recurring-revenue product. Studio runs on localhost — need client preview URL (Cloudflare Tunnel or Netlify draft) and lightweight approval flow. See FAMTASTIC-VISION.md for the empire model this serves. |
| Template upload mode | Tier 2 | Future iteration: allow uploading pre-built templates (with CSS/rules included) where Studio's role shifts to tweaking/fine-tuning, not generating from scratch. Need to account for multiple upload types: full template (has own CSS/logic — don't apply STUDIO LAYOUT FOUNDATION) vs wireframe (no logic — Studio applies its rules). |
| Asset generate → insert | Tier 2 | SVG generation (`asset-generate`) creates files but doesn't wire back to replace placeholders in HTML. |
| Smoke / integration tests | Tier 2 | 56 unit tests exist (11 suites). No end-to-end pipeline tests, no API endpoint tests, no WebSocket message flow tests. |
| design_decisions unbounded | Tier 3 | `spec.design_decisions` array has no cap — grows forever on disk. Needs a max (e.g., 100) with oldest pruning. |
| uploaded_assets unbounded | Tier 3 | `spec.uploaded_assets` array has no cap — same issue. |
| Brainstorm recommendation chips | Tier 3 | Cherry-picking individual brainstorm suggestions not yet supported. |
| Blueprint cross-page relationships | Tier 3 | Blueprint auto-extract works per-page but doesn't track cross-page component relationships. |
| SMS send path non-functional | Tier 3 | Twilio/Vonage configured but practical path uses macOS `sms:` URI. |
| `final` slot status unused | Tier 4 | Defined but no automated flow transitions slots to it. |
| `claude --print` is text-only | Tier 4 | Cannot pass uploaded images for vision analysis. |
| Platform dashboard | Tier 2 | No multi-site management UI beyond CLI. Required before the 10-site milestone per FAMTASTIC-VISION.md scaling checkpoints. |
| Remaining code review items | Tier 2 | 12 high/medium/low issues from deep code review deferred — get their own session after verification system is confirmed working. |

### Recently Closed (2026-03-30, Build Verification + Critical Bugs + OpenWolf Cleanup)

- **Build Verification System** — Phase 1 (5 file-based checks, always-on) + Phase 2 (5 browser-based Claude Code agents, on-demand). Verify tab (8th sidebar tab), toolbar pill indicator.
- **Duplicate ws.on('close') handlers** — `activeClientCount` went negative after 2+ connect/disconnect cycles. Merged into single async handler.
- **endSession() not awaited on site switch** — session summaries wrote to wrong site's directory. Both /api/switch-site and /api/new-site now async with await.
- **ws.onmessage JSON.parse unguarded** — malformed server message crashed entire message loop. Wrapped in try/catch.
- **shareSite() read from hidden DOM element** — always showed "not deployed." Now reads from deployInfoCache.
- **OpenWolf CLAUDE.md overwrite** — OpenWolf had replaced ~/famtastic/CLAUDE.md with a 2-line redirect. Full FAMtastic rules restored with OpenWolf reference section at bottom.
- **OpenWolf ephemeral git pollution** — 17 .wolf/ files were tracked that should be local-only. .gitignore updated; files untracked.

### Recently Closed (2026-03-27, Per-Site Repo Architecture)

- **Per-site repos with branching** — dev/staging/main branches, auto-created on first build
- **famtastic repo is pure tooling** — sites/ removed from tracking, .gitignore updated
- **Deploy tab HTML nesting** — unclosed div caused 4 of 7 sidebar tabs to be invisible
- **Studio State URLs** — Local/Staging/Prod URLs shown in header with clickable links
- **Merge failure recovery** — git merge --abort prevents stuck MERGING state
- **Checkout exit codes** — staging/main checkout failures detected, prevents wrong-branch push
- **Hub repo cached** — execSync calls moved to startup, no more blocking per request
- **Tab refresh** — all tabs refresh data on panel open + tab switch

### Closed (2026-03-26, Layout Containment + spawnClaude Fix)

- **Nav width shifting across pages** — `fixLayoutOverflow()` injects STUDIO LAYOUT FOUNDATION: `main { max-width: 90%; margin: 0 auto }` so content never pushes header/footer wider
- **Hero images clipped** — Removed `overflow-x: hidden` from html/body; added hero breakout rule (`hero_full_width` setting, default true)
- **spawnClaude 0-byte output** — Changed cwd from `HUB_ROOT` to `os.tmpdir()`; CLAUDE.md in `~/famtastic/` was causing Claude CLI to read OpenWolf instructions with `--tools ""` active, producing empty output
- **claude-cli wrapper broken** — Bypassed `scripts/claude-cli` entirely; `spawnClaude()` now calls `claude --print` directly
- **CLAUDE_* env var interference** — All `CLAUDE_*` and `CLAUDECODE` env vars stripped from subprocess env

### Closed (2026-03-25, Template-First Build + Unified Overhaul)

- Template-first architecture replaces index-as-CSS-seed approach
- 7 of 11 post-processing steps eliminated when template exists
- `templateSpawned` guard prevents double-build race
- `applyTemplateToPages()` has `fs.existsSync` guard for styles.css
- Duplicate `<title>` tags fixed (stripped from template headBlock)
- Dead `hasSeedPage`/`innerPages` variables removed
- `updated` counter fixed (was never incremented)
- API key exposure redacted with `safeSettings()`
- Arbitrary spec overwrite whitelisted
- Post-processing pipeline reordered
- syncHeadSection MD5 hash fingerprinting
- extractSharedCss selective stripping
- Classifier false positives anchored
- buildPromptContext returns resolvedPage (no mutation)
- Multi-tab session guard
- Parallel build timeout race fix
- buildInProgress deadlock prevention
- 41 → 52 → 56 tests

### Closed (2026-03-24, Lifecycle Integrity + Media Intelligence + Visual Slot Mode + Studio Hardening)

- Slot extraction runs on every edit (isFullBuild guard removed)
- Orphaned slot_mappings reconciliation
- Upload limit raised to 100 (configurable)
- Upload thumbnails path fixed
- Stock photo contextual queries
- 3-provider stock fallback
- QSF stock preview grid
- Visual Slot Mode + Logo-V system
- Auto-placeholder removed
- slot_mappings persistence
- Blueprint system, external CSS extraction, brainstorm profiles, build metrics

### Closed (2026-03-23, Gap Analysis Waves 1–5)

All 34 findings closed: spec.json race condition, Claude CLI hang, security hardening (path traversal, CSRF, command injection, SVG, ZIP), data integrity, UX/accessibility, 41 unit tests, responsive preview, form handling, SEO validator, CSS custom properties, analytics.

---

## Developer Environment

### Global Settings (`~/.claude/settings.json`)

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1",
    "GITHUB_PERSONAL_ACCESS_TOKEN": "<set>",
    "GEMINI_API_KEY": "<set>"
  },
  "enabledPlugins": { "..." },
  "extraKnownMarketplaces": { "..." }
}
```

### OpenWolf

`openwolf@1.0.4` — token-conscious session tracking. Initialized in `~/famtastic/`. Creates `.wolf/` directory. Protocol: check `anatomy.md` before reading files, update `cerebrum.md` on new learnings, log to `memory.md` after significant actions, log bugs to `buglog.json`.

Three intelligence files are tracked in git: `anatomy.md`, `cerebrum.md`, `buglog.json`. Ephemeral files are excluded (added 2026-03-30): `token-ledger.json`, `memory.md`, `hooks/`, `config.json`, `*.log`.

**Important:** OpenWolf had overwritten `~/famtastic/CLAUDE.md` with a 2-line redirect. Restored 2026-03-30 — now contains full FAMtastic rules with OpenWolf reference section at the bottom.

### Agent Teams (Experimental)

`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` enabled. Requires new session to activate.

---

## Multi-Agent Integration

~60% built, currently paused. CLI wiring exists (`fam-hub agent run`, `fam-hub convo reconcile`). 3 agent adapters (Claude/Gemini/Codex). Conversation pipeline: `cj-compose-convo`, `cj-reconcile-convo`, `cj-ingest`, `cj-promote`. Resumes after site factory is generating revenue.

---

## What's Next

> The full strategic vision lives in `FAMTASTIC-VISION.md`. This section tracks the tactical priorities that serve that vision. Read FAMTASTIC-VISION.md first if you are orienting to a new session.

### Tier 1 — Revenue Path (Build This First)

The near-term priority is establishing a complete revenue path: from site build to client preview to payment to domain provisioning to live recurring-revenue product. This is more specific than "client-facing access" — it is the end-to-end transaction flow that turns the factory into a business. Components needed: client preview URL (Cloudflare Tunnel or Netlify draft), payment collection (PayPal integration), domain provisioning (GoDaddy reseller API), and a lightweight client approval flow inside Studio.

### Tier 2 — Portfolio Management (Needed at 10 Sites)

The Platform Dashboard does not exist yet. Managing 10+ sites through the CLI alone is unsustainable. A dashboard that shows all deployed sites, their revenue status, their health scores from the verification system, and their next action is required before the first milestone of 10 sites is complete.

### Tier 3 — Factory Quality (Ongoing)

These items improve the quality and reliability of what the factory produces. Second deployed client site (validates anti-cookie-cutter mechanisms work across projects). Asset generate → insert pipeline (SVG generation wires back to HTML slots). Template upload system (full template vs wireframe modes). Smoke and integration tests (56 unit tests exist, no end-to-end pipeline tests yet).

### Tier 4 — Factory Expansion (Needed at 50 Sites)

The multi-tier website factory expands the product range. Current output: HTML+Tailwind static sites. Next tiers: React+Next.js for interactive applications, WordPress for content-heavy sites, Drupal for enterprise CMS clients. Implementation begins after the revenue path is proven and the first 10-site milestone is reached.

### Tier 5 — Intelligence Loop (Build in Parallel)

Weekly research script using Gemini CLI surfaces new tools, API changes, and opportunities relevant to FAMtastic. Output written to `~/famtastic/intelligence/` directory. Relevant findings promoted into this What's Next section automatically. Pattern analysis across deployed sites feeds learnings back into build prompts and verification system. This runs as a background capability alongside all other tiers.

### Tier 6 — Multi-Agent Workflow (Resume at Revenue)

The multi-agent workflow is ~60% built and paused. CLI wiring, 3 adapters (Claude/Gemini/Codex), and conversation reconciliation all work. Resumes after the revenue path is established and the factory is generating consistent income. At that point, routing tasks to the best-suited agent and reconciling outputs becomes a meaningful productivity multiplier.

### Tier 7 — Platform Expansion (The Long Game)

Mobile apps (iOS/Google Play), AI image generation products, AI video products, VR experiences, and games. Each is a new product type that the factory learns to build. The sequence follows the portfolio — new product types get added as the factory capacity and revenue base grow to support them.

---

## Deployed Sites

| Site | URL | Pages | Netlify ID | Deploy Date |
|------|-----|-------|------------|-------------|
| The Best Lawn Care | https://the-best-lawn-care.netlify.app | 7 (index, services, about, testimonials, gallery, why-choose-us, contact) | d58f9ba9-78eb-4329-89e7-710fac8480fa | 2026-03-20 |

---

## File Inventory

### Strategic Documents

| File | Purpose |
|------|---------|
| `FAMTASTIC-VISION.md` | North star — empire model, scaling milestones, revenue path, intelligence loop, innovation mandate |
| `FAMTASTIC-STATE.md` | This file — canonical technical snapshot, feature map, file inventory, known gaps, 7-tier roadmap |
| `FAMtastic-Web-Context.md` | Full context document for Claude Web sessions |
| `SITE-LEARNINGS.md` | Authoritative technical reference — architecture notes, lessons learned, learnings log |
| `CHANGELOG.md` | Chronological session summaries |

### Core Application

| File | Lines | Purpose |
|------|-------|---------|
| `site-studio/server.js` | ~6,830 | Main backend. Express + WebSocket. Request classifier, prompt builder (returns resolvedPage + templateContext), template-first build system, layout containment (fixLayoutOverflow), build verification system (5 file-based checks), blueprint system, CSS extraction, lifecycle integrity, multi-provider image system, post-build pipeline (6 steps + verification), safeSettings() redaction, multi-tab session guard, deadlock prevention. spawnClaude calls claude directly from os.tmpdir(). |
| `site-studio/public/index.html` | ~5,620 | Single-file frontend. VS Code-inspired layout: left sidebar (Explorer with pages/sections/media), tabbed canvas (5 tabs: Preview, Editable View, Image Browser, Research View, Model Comparison), bottom CLI bar (3 tabs: Chat, Terminal, Codex), right sidebar (Studio State with mode selector + 8 tabs). Data-driven tab switching via querySelectorAll + data-hook attributes. Settings modal, upload modal, project picker, QSF panel. |
| `site-studio/package.json` | 24 | Dependencies: express, ws, multer, nodemailer, twilio, @vonage/server-sdk. Dev: vitest. |
| `site-studio/tests/unit.test.js` | ~458 | 56 unit tests: isValidPageName (4), sanitizeSvg (9), extractSlotsFromPage (4), classifyRequest (15+4 edge), extractBrandColors (3), labelToFilename (5), truncateAssistantMessage (5), ensureHeadDependencies (1), extractTemplateComponents (4). |
| `site-studio/vitest.config.js` | 7 | Vitest ESM configuration. |
| `mcp-server/server.js` | 343 | MCP server. 4 tools via stdio JSON-RPC. |

### Key Functions (2026-03-30, Build Verification)

| Function | File | Purpose |
|----------|------|---------|
| `verifySlotAttributes(pages)` | server.js | Checks all imgs for data-slot-id/status/role attrs |
| `verifyCssCoherence()` | server.js | Validates styles.css: exists, ≥50 lines, STUDIO LAYOUT FOUNDATION once, :root CSS vars, main 90% |
| `verifyCrossPageConsistency(pages)` | server.js | Nav/footer match across pages, Google Fonts URL consistent |
| `verifyHeadDependencies(pages)` | server.js | Tailwind CDN, assets/styles.css link, Google Fonts present per page |
| `verifyLogoAndLayout(pages)` | server.js | data-logo-v in nav, no legacy placeholder paths, main element exists |
| `runBuildVerification(pages)` | server.js | Runs all 5 checks, returns { status, checks, issues, timestamp }, saves to spec.last_verification |

### Key Functions (2026-03-27, Per-Site Repo)

| Function | File | Purpose |
|----------|------|---------|
| `createSiteRepo(ws)` | server.js | Creates per-site repo with dev/staging/main branches, scaffold files, gh repo create |
| `syncSiteRepo(ws, spec, branch, cb)` | server.js | Branch-aware sync: copies dist, commits dev, merges to target branch, pushes |
| `pushHubRepo(ws)` | server.js | Pushes famtastic tooling repo (separate from site repos) |
| `_tryGhRepoCreate(ws, spec, path, name)` | server.js | Helper: attempts gh repo create, saves site_repo to spec |

### Key Functions (2026-03-26, Layout + spawnClaude)

| Function | File | Purpose |
|----------|------|---------|
| `fixLayoutOverflow(ws)` | server.js | Injects STUDIO LAYOUT FOUNDATION CSS block (main 90% centered, hero breakout, box-sizing reset). Idempotent. |
| `spawnClaude(prompt)` | server.js | Calls `claude --print` directly from `os.tmpdir()`, strips CLAUDE_* env vars |

### Key Functions (2026-03-25, Template-First)

| Function | File | Purpose |
|----------|------|---------|
| `extractTemplateComponents(html)` | server.js | Parses `_template.html` into headBlock, headerHtml, footerHtml, sharedCss, navHtml |
| `buildTemplatePrompt()` | server.js | Generates Claude prompt for `_template.html` (chrome only, no page content) |
| `writeTemplateArtifacts()` | server.js | Extracts _partials/_nav.html, _partials/_footer.html, assets/styles.css from template |
| `loadTemplateContext()` | server.js | Reads template, strips title from headBlock, formats for prompt injection |
| `applyTemplateToPages(ws, pages)` | server.js | Swaps inline template styles for `<link>` references |

### Key Functions (2026-03-25, Overhaul)

| Function | File | Purpose |
|----------|------|---------|
| `safeSettings()` | server.js | Redacts API keys, returns `_configured: true/false` |
| `isTailwindClass(cls)` | server.js | Filters Tailwind utility classes in blueprint extraction |
| `truncateAssistantMessage(msg)` | server.js | Truncates HTML to summary for conversation history |
| `loadRecentConversation(count)` | server.js | Loads last N messages from conversation.jsonl |

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
| `scripts/stock-photo` | ~105 | 3-provider stock photo downloader (Unsplash → Pexels → Pixabay). |
| `scripts/claude-cli` | 12 | Claude CLI wrapper (bypassed by spawnClaude — kept for manual use). |

### Claude Code Agents (Phase 2 Visual Verification)

| File | Purpose |
|------|---------|
| `~/.claude/agents/famtastic-visual-layout.md` | Visual layout verifier — header width, hero visibility, content centering, overflow |
| `~/.claude/agents/famtastic-console-health.md` | Console errors + 404 checker |
| `~/.claude/agents/famtastic-mobile-responsive.md` | Responsive layout at 375/768/1280px |
| `~/.claude/agents/famtastic-accessibility.md` | Alt text, heading hierarchy, contrast, labels |
| `~/.claude/agents/famtastic-performance.md` | Request count, blocking resources, asset sizes |

### OpenWolf Files

| File | Git | Purpose |
|------|-----|---------|
| `.wolf/anatomy.md` | tracked | Project file index with token estimates |
| `.wolf/cerebrum.md` | tracked | Patterns, preferences, do-not-repeat rules |
| `.wolf/buglog.json` | tracked | Bug tracking across sessions |
| `.wolf/memory.md` | ignored | Per-session action log (ephemeral) |
| `.wolf/token-ledger.json` | ignored | Token usage ledger (ephemeral) |
| `.wolf/hooks/` | ignored | OpenWolf hooks (ephemeral) |
| `.wolf/config.json` | ignored | OpenWolf configuration (local) |

### Per-Site Files

| File | Purpose |
|------|---------|
| `sites/<tag>/spec.json` | Site spec: `design_brief`, `design_decisions`, `media_specs`, `uploaded_assets`, `slot_mappings`, `last_verification`, `deployed_url`, `netlify_site_id`, `data_model`. |
| `sites/<tag>/blueprint.json` | Per-page sections, components, layout notes. |
| `sites/<tag>/build-metrics.jsonl` | One object per build. |
| `sites/<tag>/.studio.json` | Session state, version metadata. |
| `sites/<tag>/conversation.jsonl` | Chat history. |
| `sites/<tag>/summaries/session-NNN.md` | AI-generated session summaries. |
| `sites/<tag>/dist/_template.html` | Shared template (header, nav, footer, shared CSS). |
| `sites/<tag>/dist/assets/styles.css` | Shared CSS (extracted from template or legacy extraction). |
| `sites/<tag>/dist/assets/stock/` | Stock photos named `{slot-id}.jpg`. |
| `sites/<tag>/dist/assets/uploads/` | User uploads. |
| `sites/<tag>/dist/_partials/_nav.html` | Canonical nav partial. |
| `sites/<tag>/dist/_partials/_footer.html` | Canonical footer partial. |

### Claude Code Skills

| File | Purpose |
|------|---------|
| `.claude/skills/export-site/SKILL.md` | `/export-site` |
| `.claude/skills/brainstorm/SKILL.md` | `/brainstorm` |
| `.claude/skills/site-studio/SKILL.md` | `/site-studio` |
