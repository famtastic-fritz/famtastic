# FAMtastic — Full Project Context

This document is designed to be pasted into a Claude Web session to provide complete context about the FAMtastic project. It is the single reference needed for any Claude instance to reason about, extend, or discuss this system.

---

## 1. FAMtastic Definition

**FAMtastic** *(adj.)*: Fearless deviation from established norms with a bold and unapologetic commitment to stand apart on purpose, applying mastery of craft to the point that the results are the proof, and manifesting the extraordinary from the ordinary.

---

## 2. Project Overview

FAMtastic is a consolidated software ecosystem built by Fritz Medine — a Drupal developer with a business-first mindset. The system's primary revenue path is a **chat-driven website factory** called Site Studio: users describe what they want in natural language, an AI generates production-quality HTML+Tailwind sites, and the result deploys to Netlify with one command. The ecosystem also includes a multi-agent workflow engine (Claude/Gemini/Codex adapters with conversation reconciliation) and an idea lifecycle pipeline (capture → triage → blueprint → prototype → validate → learn → digest). Everything lives in one repository at `~/famtastic/`.

---

## 3. Ecosystem Layout

### Repository Structure

```
~/famtastic/                          # TOOLING repo — Studio code, CLI, scripts
  MANIFESTO.md                        # The FAMtastic declaration
  FAMtastic-Web-Context.md            # This file
  scripts/
    fam-hub                           # Unified CLI dispatcher
    studio-server                     # Server wrapper (auto-restart on UI restart)
    orchestrator-site                 # Batch site generation
    site-chat                         # Launches Studio + browser
    site-deploy                       # Deploy to Netlify/Cloudflare/Vercel (--env staging|production)
    site-preview                      # Standalone preview server
    site-brainstorm                   # Terminal brainstorm loop
    site-export / site-import         # Export/import sites
    asset-generate                    # SVG asset pipeline via Claude CLI
    stock-photo                       # Unsplash stock photo downloader
    claude-cli                        # Claude CLI wrapper (bypassed by spawnClaude)
    gemini-cli / codex-cli            # Other agent wrappers
  site-studio/
    server.js                         # Main backend (6,830 lines) — Express + WebSocket
    public/index.html                 # Single-file frontend (4,320 lines) — chat + preview + studio panel
  sites/<tag>/                        # LOCAL working directories (NOT in git — .gitignore)
    spec.json                         # Site specification (brief, decisions, media_specs, etc.)
    .studio.json                      # Session state, version metadata
    conversation.jsonl                # Chat history
    summaries/session-NNN.md          # AI-generated session summaries
    dist/                             # Built site files
  cli/idea/                           # 7 Python CLIs for idea lifecycle
  adapters/                           # Agent + tool adapters
  config/site-templates/              # 4 HTML templates (event, business, portfolio, landing)
  mcp-server/server.js                # MCP server for Claude Desktop/Code integration
  .claude/skills/                     # Custom Claude Code skills
  site-studio/tests/unit.test.js      # 56 unit tests (vitest)

~/famtastic-sites/<tag>/              # PER-SITE repos (one per client/project)
  branches: dev, staging, main        # Git flow: dev → staging → main
  CLAUDE.md                           # Tweak/maintain instructions for this site
  SITE-LEARNINGS.md                   # Design context from spec.json
  README.md                           # Site name, pages, staging URL
  index.html, about.html, ...        # Built site files (from dist/)
  assets/                            # CSS, images, uploads
```

### Shared Paths

- `~/.famtastic-bin/` — binaries
- `~/.local/share/famtastic/` — data
- `~/.config/famtastic/studio-config.json` — settings (model, deploy, email, SMS, limits)

### Archived Repos (superseded, on GitHub for reference)

- `famtastic-platform` → absorbed into `fam-hub admin`
- `famtastic-think-tank` → absorbed into `fam-hub idea`
- `famtastic-dev-setup` → absorbed into `famtastic/scripts/install.sh`

---

## 4. CLI Surface (`fam-hub`)

```
# Site Factory (revenue path)
fam-hub site new <tag>              # Create site + open chat studio
fam-hub site chat <tag>             # Open chat studio for existing site
fam-hub site brainstorm <tag>       # Terminal brainstorm (no HTML)
fam-hub site build <tag>            # Batch rebuild
fam-hub site preview <tag> [port]   # Live preview
fam-hub site deploy <tag> [--prod]  # Deploy to Netlify/Cloudflare/Vercel
fam-hub site domain <tag> <domain>  # DNS setup guide (GoDaddy)
fam-hub site export <tag> <path>    # Export as standalone project
fam-hub site import <path> [tag]    # Import existing HTML into Studio
fam-hub site list                   # Dashboard of all sites

# Idea Lifecycle
fam-hub idea capture "<text>"       # Capture a new idea
fam-hub idea triage [--list]        # Categorize ideas
fam-hub idea blueprint <tag>        # Create structured plan
fam-hub idea proto <tag>            # Build prototype
fam-hub idea validate <tag>         # Run 17 validation checks
fam-hub idea learn <tag>            # Record lesson learned
fam-hub idea digest [--all]         # Cross-stage summary

# Multi-Agent Workflow
fam-hub agent run <agent> <tag>     # Run agent on a tag
fam-hub convo reconcile <tag>       # Reconcile multi-agent conversation
fam-hub ingest <tag> {md|json}      # Ingest content

# Admin
fam-hub admin doctor                # Check tool dependencies
fam-hub admin verify                # Verify repo structure
```

---

## 5. Site Studio — How It Works

Site Studio is the chat-driven website builder. It runs as a local Express+WebSocket server with a browser UI: chat panel (left), live preview iframe (center), and a studio sidebar (right) showing the design brief, decisions, uploads, files, brand health, and version history.

### The Pipeline

```
User opens Studio → describes site in chat
  → Request classifier routes to intent handler (21 intent types)
  → Planning mode: Claude generates a design_brief artifact
  → User approves brief (Build/Edit/Skip buttons)
  → Template-first build: builds _template.html (header, nav, footer, shared CSS) first
    → ALL pages build in true parallel using template context
    → Each page copies chrome verbatim, generates only <main> + page-specific CSS
  → Post-build pipeline (6 steps): extract slots → reapply mappings → metadata
    → reconcile orphans → applyLogoV → template-to-page CSS swap → layout foundation
  → Build verification (5 file-based checks): slot attrs, CSS coherence, cross-page consistency,
    head dependencies, logo + layout — results stored in spec.last_verification, pill shown in toolbar
  → Layout containment: main { max-width: 90% } centered, hero breakout to 100vw
  → Live preview updates via WebSocket reload
  → User refines via conversation ("make the header blue", "add a contact section")
  → Each refinement re-classified, routed to appropriate handler
  → Site repo auto-created on first build (~/famtastic-sites/<tag>/, dev/staging/main branches)
  → Push to Repo: commits to dev branch in site repo
  → Deploy to Staging: merges dev → staging, deploys to Netlify staging site
  → Deploy to Production: merges staging → main, deploys to Netlify prod site
```

### Key Technical Decisions

- **HTML + Tailwind CDN, zero build step**: AI generates clean HTML, instant deploy, no webpack/vite/bundler
- **Claude CLI (`claude --print`)**: replaces all API SDK calls, no API key management, uses existing Claude Code subscription
- **`--tools ""`** disables tool use for raw text output; all `CLAUDE_*` env vars stripped to prevent nested-session detection
- **`spawnClaude()` runs from `os.tmpdir()`**: avoids reading `CLAUDE.md` project instructions that cause 0-byte output with `--tools ""`
- **Template-first build**: `_template.html` built once (chrome only), then all pages in true parallel — eliminates 7 of 11 post-processing steps
- **Layout containment**: `main { max-width: 90%; margin: 0 auto }` prevents content from pushing header/footer wider; hero breakout via `width: 100vw` negative-margin technique
- **Per-site repos**: each site gets its own repo at `~/famtastic-sites/<tag>/` with `dev`/`staging`/`main` branches. famtastic repo is pure tooling (`sites/` in .gitignore)
- **Git flow**: Push to Repo → dev. Deploy to Staging → merge dev→staging. Deploy to Production → merge staging→main. Failed merges auto-abort.
- **SVG-first assets**: no GPU needed, Claude generates SVGs, Inkscape refines
- **Slot-based image system**: every `<img>` carries `data-slot-id`, `data-slot-status`, `data-slot-role` — identity survives HTML regeneration
- **`printf '%s'` not `echo`**: echo corrupts escape sequences in HTML/JSON prompts

---

## 6. Capabilities Inventory

### Request Classifier (18 Intent Types)

The classifier routes every chat message to the right handler. Precedence matters — earlier matches win.

| Intent | What It Does |
|--------|-------------|
| `brief_edit` | Edit the design brief |
| `brand_health` | Scan and report image/SEO health |
| `brainstorm` | No-HTML ideation mode |
| `rollback` | Revert to a previous version |
| `version_history` | Show version timeline |
| `summarize` | Generate session summary |
| `data_model` | Plan database entities/schema (concept-phase) |
| `tech_advice` | Recommend tech stack (static/CMS/dynamic) |
| `template_import` | Import uploaded template |
| `page_switch` | Switch active page in preview |
| `deploy` | Push to hosting |
| `build` | Generate site from brief or template |
| `query` | List/show/preview operations |
| `asset_import` | Generate SVG logo/favicon/icon |
| `fill_stock_photos` | Fill empty image slots with Unsplash/SVG |
| `new_site` | Start planning (no brief exists) |
| `major_revision` | Start over from scratch |
| `restyle` | Change overall visual style |
| `layout_update` | Add/move/remove sections |
| `content_update` | Change text content |
| `bug_fix` | Fix broken/misaligned elements |

### Image System (Slot-Based)

- Every `<img>` has `data-slot-id`, `data-slot-status` (empty→stock→uploaded→final), `data-slot-role` (hero/testimonial/team/service/gallery/favicon)
- `media_specs` in spec.json is the source of truth for all image slots
- **Visual Slot Mode** — "Slots" toggle switches preview iframe to `/slot-preview/:page`; every `[data-slot-id]` gets a colored overlay + tooltip; clicking opens Quick Slot Fill (QSF) panel
- **QSF Stock preview** — "Stock" button shows 6-thumbnail grid with editable query, provider badges (Unsplash/Pexels/placeholder), credit. Clicking a thumb applies it. No auto-apply.
- **Slot detail bar** — if slot already has a mapping, QSF shows provider, credit, query used, and a "Clear" button to reset to empty
- **Slot mapping persistence** — `spec.slot_mappings` stores `{ src, alt, provider, query, credit }` per slot, survives rebuilds via `reapplySlotMappings()` post-processor
- **Lifecycle integrity** — `reconcileSlotMappings()` removes orphaned mappings after every build; `POST /api/rescan` + toolbar "Rescan" button for manual trigger; slot ID stability injection in single-page edit prompts
- **Provider abstraction** — `fetchFromProvider()` supports unsplash / pexels / placeholder (SVG fallback — always works with no API keys)
- **Contextual stock queries** — `"${businessName} ${industry} ${role}"` instead of just role name
- Upload modal targets slots by ID for replacement. Upload limit: 100 (config-driven).
- **Logo-V system** — nav logo anchor carries `data-logo-v`; `applyLogoV()` swaps it to `<img>` or site name text based on whether `assets/logo.{ext}` exists
- **Brand Health metrics dashboard** — slot coverage progress bar, upload usage bar, orphaned mappings count (with "Rescan to fix"), empty slot actions. Flat per-slot list removed.

### Multi-Page Sites (Template-First)

- **Template-first build**: `_template.html` built first — header, nav, footer, shared CSS (`<style data-template="shared">`). No page content.
- `writeTemplateArtifacts()` extracts `_partials/_nav.html`, `_partials/_footer.html`, `assets/styles.css` from template
- ALL pages build in true parallel — each receives template context and generates only `<main>` content
- `applyTemplateToPages()` swaps inline template styles for `<link>` references
- `MULTI_UPDATE` response format with `--- PAGE: filename.html ---` delimiters
- Page tabs in preview, `page_switch` classifier for navigation
- Legacy fallback: if template build fails, old sync-based post-processing runs (nav/footer/head sync)

### Versioning & Rollback

- Auto-snapshot before every HTML write to `dist/.versions/<page>/<timestamp>.html`
- Rollback via chat ("undo", "rollback") or Studio panel
- Pre-rollback snapshot saved for safety
- Max 50 versions (auto-prune)

### Session Management

- Sessions tracked in `.studio.json` with timestamps and IDs
- Auto-generated summaries on session end (3+ messages)
- Last 2-3 summaries injected into every prompt for continuity
- Session picker in Studio to load/review past sessions

### Design Memory

- Design brief artifact stored in `spec.json` — prevents cookie-cutter output
- Design decisions log (memory spine) with category/status/timestamp
- Decisions extracted from change summaries, injected into future prompts
- Anti-cookie-cutter rules in the prompt builder

### Deploy & Share

- **Per-site repos**: each site gets `~/famtastic-sites/<tag>/` with dev/staging/main branches, auto-created on first build
- **Git flow**: Push to Repo → dev. Deploy to Staging → merge dev→staging. Deploy to Production → merge staging→main.
- **Deploy targets**: Netlify (primary), Cloudflare Pages, Vercel. Separate Netlify sites per environment.
- **Studio State**: shows Local/Staging/Prod URLs with clickable links in sidebar header
- **Server tab**: Restart Studio button, Push Studio Code (hub repo), uptime, session info, file change detection
- **Share**: Email (Gmail/Outlook/SendGrid SMTP), Text (macOS `sms:` URI), Copy Link
- **Domain**: GoDaddy DNS record helper
- **Form handling**: Netlify Forms template with honeypot spam protection

### SEO & Analytics

- Brand Health checks: meta description, canonical URL, Schema.org JSON-LD, viewport, title, lang, alt text
- CSS custom properties (`--color-primary`, `--color-accent`, `--color-bg`) from spec colors
- Analytics: GA4 or Plausible snippet auto-injected when configured
- Responsive preview toggle: Mobile (375px), Tablet (768px), Desktop

### Build Verification System

- **Phase 1 — File-based (always-on, zero tokens)**: `verifySlotAttributes`, `verifyCssCoherence`, `verifyCrossPageConsistency`, `verifyHeadDependencies`, `verifyLogoAndLayout` — 5 functions run automatically after every build via `runBuildVerification(pages)`. Results in `spec.last_verification`.
- **Phase 2 — Browser-based (on-demand)**: 5 Claude Code agent definitions in `~/.claude/agents/`: visual-layout, console-health, mobile-responsive, accessibility, performance. Triggered by asking Claude Code to run a visual audit.
- **Studio UI**: Verification pill in toolbar (green/yellow/red/gray). Verify tab (8th sidebar tab) with collapsible checks, Run Verification, View in Browser buttons. Amber chat notification on failures.
- **API**: `GET /api/verify` (read last result), `POST /api/verify` (manual trigger), `POST /api/visual-verify` (agent readiness).

### Other Capabilities

- **Brainstorm mode**: no-HTML ideation via chat or terminal
- **Export/Import**: standalone project export with package.json; HTML import with auto-analysis
- **Template import**: upload .html/.zip with "Template" role
- **Tech stack analysis**: auto-detects static/CMS/dynamic during planning
- **Data model planning**: concept-phase DB schema, entities, migration paths
- **MCP server**: exposes site state to Claude Desktop/Code via stdio JSON-RPC
- **Custom skills**: `/site-studio`, `/brainstorm`, `/export-site` in Claude Code
- **Settings UI**: model, deploy, email/SMS, upload limits, version limits, auto-summary/auto-version toggles

---

## 7. Architecture — Security & Hardening

The system completed a 34-finding gap analysis across 5 waves (2026-03-23). Key hardening:

- **spec.json race condition**: write-through cache (`readSpec()`/`writeSpec()`) replaces all 54 direct read/write sites
- **Claude CLI hang protection**: timeouts on all `spawnClaude()` calls (2-5 min by type)
- **Path traversal**: `isValidPageName()` validator on all page-accepting endpoints
- **Command injection**: all `spawn()` calls use array-form args (no shell interpolation)
- **ZIP extraction**: validates all paths in temp dir before copying to dist
- **SVG sanitizer**: strips scripts, event handlers, javascript URIs, CSS expressions, split tags, embedded HTML
- **CSRF protection**: Origin/Referer validation on all POST/PUT/DELETE
- **Input validation**: max lengths, allowlisted keys, format checks on all API endpoints
- **Schema validation**: `readSpec()` auto-repairs corrupt arrays and logs warnings
- **WS resilience**: exponential backoff reconnect, error handling, graceful shutdown
- **Modal accessibility**: Esc/backdrop close, `role="dialog"`, `aria-modal`, auto-focus
- **Mobile responsive**: chat/preview/studio stack vertically below 1024px
- **56 unit tests**: vitest, covering validators, sanitizer, classifier, slot extraction, template components

---

## 8. Current State

### What's Deployed

- **The Best Lawn Care** — https://the-best-lawn-care.netlify.app — 7-page site, first full pipeline deploy (2026-03-20)

### What's Production-Ready

- Template-first build pipeline (spec → brief → template → parallel pages → verification → preview → deploy)
- Per-site repos with dev/staging/main branching and git flow
- Layout containment system (main 90% centered, hero breakout, nav/footer stable)
- Multi-page sites with template-based chrome propagation
- Image slot system with stock photo fill and upload replacement
- Staging/production deploy environments with separate Netlify sites
- Build Verification System: Phase 1 (5 file-based checks, always-on) + Phase 2 (5 browser-based agents, on-demand)
- Server tab with restart, uptime, session info, file change detection
- Versioning with rollback
- Session management with summaries
- Design brief and decisions memory
- 22-intent request classifier
- Security-hardened (5-wave gap analysis + 4 code review rounds)
- 56 unit tests passing

### What's Not Yet Built

- Client-facing access (Studio is localhost only)
- Template upload mode (full template vs wireframe — separate rule sets)
- Multi-framework output (currently HTML+Tailwind only — multi-tier factory is the next evolution)
- Smoke/integration tests (unit tests exist, broader coverage planned)

---

## 9. Multi-Agent Workflow (~60% Built, Paused)

The multi-agent system is paused until the site factory is fully shipping. Current state:

- **Native CLI adapters**: `claude-cli`, `gemini-cli`, `codex-cli` — all functional
- **Conversation reconciliation**: `cj-reconcile-convo` + `cj-compose-convo` work — merge multi-agent JSONL conversations into unified threads
- **Ingestion pipeline**: `cj-ingest` with site-* auto-trigger wiring
- **Agent runner**: `fam-hub agent run <agent> <tag>` dispatches to adapters

The vision: route different aspects of a task to the best-suited agent (Claude for reasoning, Gemini for search, Codex for code), then reconcile their outputs into a coherent result.

---

## 10. Idea Lifecycle

Seven Python CLIs forming a capture-to-validate pipeline:

| Stage | Command | What It Does |
|-------|---------|-------------|
| Capture | `fam-hub idea capture "<text>"` | Record raw idea with timestamp |
| Triage | `fam-hub idea triage` | Categorize and prioritize |
| Blueprint | `fam-hub idea blueprint <tag>` | Create structured implementation plan |
| Prototype | `fam-hub idea proto <tag>` | Build working prototype |
| Validate | `fam-hub idea validate <tag>` | Run 17 checks on site HTML/spec/assets |
| Learn | `fam-hub idea learn <tag>` | Record lessons, append to SITE-LEARNINGS.md |
| Digest | `fam-hub idea digest [--all]` | Cross-stage summary including agent-hub sites |

Ideas flow through `ideas/` directory stages: `ideas/captured/`, `ideas/triaged/`, etc.

---

## 11. Key Files Reference

| File | Purpose |
|------|---------|
| `site-studio/server.js` | Main backend (6,830 lines) — classifier, prompt builder, template-first build, layout containment, build verification (5 file-based checks), per-site repo system, post-build pipeline, all API endpoints |
| `site-studio/public/index.html` | Single-file frontend — chat, preview, studio panel, modals |
| `scripts/fam-hub` | Unified CLI dispatcher |
| `scripts/orchestrator-site` | Batch site generation |
| `scripts/site-deploy` | Deploy to Netlify/Cloudflare/Vercel |
| `scripts/site-chat` | Launch Studio + browser |
| `scripts/stock-photo` | Download Unsplash stock photos |
| `scripts/asset-generate` | SVG asset generation via Claude CLI |
| `scripts/claude-cli` | Claude CLI wrapper (bypassed by spawnClaude — kept for manual use) |
| `mcp-server/server.js` | MCP server for cross-platform context sharing |
| `site-studio/tests/unit.test.js` | 56 unit tests (vitest) |
| `cli/idea/*.py` | 7 Python CLIs for idea lifecycle |
| `~/.config/famtastic/studio-config.json` | Settings — model, deploy, email, SMS, limits |
| `~/SITE-LEARNINGS.md` | Full architecture docs and learnings log |
| `~/CLAUDE.md` | Global rules (commit policy, ecosystem layout, documentation rules) |

---

## 12. Active Direction

### Multi-Tier Website Factory (Next Evolution)

Site Studio currently produces HTML+Tailwind static sites. The next step is evolving it into a multi-framework website factory that can output:

- **Static HTML+Tailwind** (current) — landing pages, event sites, portfolios
- **React + Next.js** — interactive web applications
- **Vue + Nuxt** — alternative SPA/SSR framework
- **WordPress** — traditional CMS for content-heavy sites
- **Drupal** — enterprise CMS for complex content architectures
- **Extensible** — new frameworks addable as tiers

The approach prioritizes **production volume + variety** — not cookie-cutter templates, but sites that are genuinely different from each other. The tier system is in discussion phase; implementation begins after alignment on the approach.

### Template Upload System (Planned)

Two modes: **full template** (has own CSS/logic — Studio tweaks/fine-tunes, does NOT apply STUDIO LAYOUT FOUNDATION) and **wireframe** (no logic — Studio generates CSS and applies its own rules). Separate rule sets for each mode.

### Other Pending Items

- Client-facing access (Studio runs on localhost — need a way for clients to see/approve sites)
- Platform dashboard (deferred until 10+ sites exist)

---

## 13. User Context

Fritz Medine is a Drupal developer with enterprise CMS client potential. His philosophy is business-first — "interested in effect, not speed." He values honest assessment over polished summaries. The FAMtastic declaration is not just a tagline; it's a design principle that runs through every decision: fearless deviation, mastery of craft, results as proof.

Key working preferences:
- One thing at a time — implement and verify before moving to the next
- Commits must never reference AI — clean, professional, human-readable
- Documentation is part of the work, not separate from it
- `SITE-LEARNINGS.md` at `~/SITE-LEARNINGS.md` is the system's memory — must always reflect reality
- `CHANGELOG.md` at `~/famtastic/CHANGELOG.md` gets a session summary entry at end of every session

---

## 14. Configuration Reference

### studio-config.json (`~/.config/famtastic/studio-config.json`)

```json
{
  "model": "claude-sonnet-4-5",
  "hero_full_width": true,
  "deploy_target": "netlify",
  "deploy_team": "fritz-medine",
  "max_upload_size_mb": 5,
  "max_uploads_per_site": 20,
  "max_versions": 50,
  "auto_summary": true,
  "auto_version": true,
  "email": { "provider": "gmail", "user": "...", "app_password": "..." },
  "sms": { "provider": "email_gateway", "carrier": "tmobile.net" },
  "stock_photo": { "unsplash_api_key": "..." },
  "analytics_provider": "ga4|plausible",
  "analytics_id": "..."
}
```

### Per-Site spec.json (key fields)

```json
{
  "tag": "site-example",
  "site_name": "Example Site",
  "business_type": "lawn-care",
  "state": "approved|building|ready|deployed",
  "design_brief": { "goal": "...", "audience": "...", "must_have_sections": [...] },
  "design_decisions": [{ "decision": "...", "category": "...", "status": "active" }],
  "media_specs": [{ "slot_id": "hero-1", "role": "hero", "status": "empty", "page": "index.html" }],
  "uploaded_assets": [{ "filename": "...", "role": "brand_asset", "label": "..." }],
  "deployed_url": "https://...",
  "netlify_site_id": "...",
  "last_verification": { "status": "passed|warned|failed", "checks": [...], "issues": [...], "timestamp": "..." },
  "data_model": { "needs_database": false, "entities": [...], "migration_path": "..." }
}
```
