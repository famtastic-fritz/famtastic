# FAMtastic Changelog

## 2026-03-24 — parallelBuild: hybrid CSS-seed strategy for design consistency

Replaced the fully-parallel build strategy (which caused CSS and nav inconsistencies) with a hybrid approach: index.html builds first to establish the design language, then its `<style>` blocks and `<nav>` HTML are extracted and injected as a seed into all inner page prompts, which then launch simultaneously. Inner pages no longer generate CSS from the brief alone — they copy the exact custom properties, font stacks, and nav structure from index.html. Per-page 5-minute timeouts remain from the previous fix. If index.html fails or times out, inner pages fall back to seedless parallel build rather than blocking. All 41 unit tests pass.

## 2026-03-24 — Lifecycle integrity, media intelligence, dev environment setup

Completed site lifecycle integrity system: `reconcileSlotMappings()` removes orphaned slot_mappings after every build, `POST /api/rescan` re-scans all pages on demand with a Rescan toolbar button, single-page edits now call `extractAndRegisterSlots` (removed isFullBuild guard), and slot ID stability injection in single-page prompts prevents ID drift. Upgraded the image system: `fetchFromProvider()` abstraction adds Pexels and SVG placeholder fallback (zero-dep, always works), `/api/stock-search` returns a 6-thumbnail preview grid with provider badges, QSF Stock panel now shows an editable query field and selectable results instead of auto-applying the first result, slot detail bar shows provider/credit/query with a Clear button, and stock queries now include business context (name + industry + role). Fixed three bugs: upload thumbnail paths (`/assets/` → `/site-assets/`), upload limit raised 20 → 100 (config-driven), `about-hero` not found in media_specs. Added `/api/site-info` alias, `/api/clear-slot-mapping` endpoint, and brand health metrics dashboard (progress bars, orphan count, upload usage — flat per-slot list removed). Separately: installed Claude Code plugin marketplace (9 plugins from anthropics/claude-plugins-official + gemini-tools from paddo/claude-tools), enabled CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS, installed and initialized openwolf for session-level token tracking, added GitHub PAT and Gemini API key to global settings.

## 2026-03-24 — Visual Slot Mode, Logo-V system, lifecycle integrity planning

Built Visual Slot Mode: a "Slots" toggle in the preview toolbar turns the iframe into an interactive image editor — every `[data-slot-id]` img gets a colored overlay (red/yellow/green by status), clicking any slot opens the Quick Slot Fill panel (QSF) with thumbnails, Stock, Upload, and AI buttons, and assignments apply without a rebuild. Built the Logo-V system: `applyLogoV()` post-processor swaps `[data-logo-v]` nav elements between styled text and `<img>` based on whether `assets/logo.{ext}` exists; upload handler copies logo uploads to canonical path and triggers the swap immediately. Fixed slot-mode bugs: regex attribute order mismatch in `reapplySlotMappings`, absolute `/assets/` path rewriting in slot-preview HTML. Session ended with a full lifecycle integrity plan (not yet implemented): rescan API, `reconcileSlotMappings`, orphan detection, slot ID stability injection, multi-provider image system with QSF preview grid, brand health dashboard overhaul, and delete UI for uploads.

## 2026-03-24 — Kill auto-placeholders, 3-provider stock photos, image persistence

Removed `bulkGeneratePlaceholders()` from all 3 automatic build pipeline call sites — empty slots now stay transparent until explicitly filled. Rewrote `scripts/stock-photo` with a 3-provider fallback chain (Unsplash → Pexels → Pixabay) replacing the dead `source.unsplash.com` fallback. Added Stock Photos section to Settings modal for API key management. Implemented slot mapping persistence (`spec.json → slot_mappings`) so uploaded and stock images survive rebuilds, with `reapplySlotMappings()` post-processor and prompt injection into Claude's build context. Post-processing pipeline clobbering identified as an open architectural issue for a future session.

## 2026-03-24 — Studio hardening: blueprint, CSS extraction, profiles, metrics

Added site blueprint system (`blueprint.json`) that auto-captures page sections, components, and layout rules after every build, preventing rebuild regression. Added CSS extraction post-processor that moves shared styles to `assets/styles.css` for cleaner page source. Added brainstorm chat profiles (deep/balanced/concise) selectable from the brainstorm banner. Added build metrics dashboard tab in Studio. Updated logo rules to prevent placeholder images. Deferred asset generate-to-insert wiring and brainstorm recommendation chips to future sessions.

## 2026-03-23 — Gap analysis, hardening, testing, and feature polish

Completed a 34-finding gap analysis across 5 waves: workflow-critical fixes (spec.json race condition, Claude CLI timeouts, default model), security hardening (path traversal, command injection, CSRF, SVG sanitizer, ZIP safety), data integrity (input validation, schema validation, conversation truncation), UX/accessibility (WS reconnect, mobile responsive, modal accessibility, ARIA), and feature polish (responsive preview toggle, form handling, SEO validator, CSS custom properties, analytics). Added 41 unit tests via vitest. Created FAMTASTIC-STATE.md as the canonical project reference and FAMtastic-Web-Context.md for Claude Web sessions.

## 2026-03-20 — First deployed site, share, nav sync, settings

Deployed "The Best Lawn Care" — 7-page site, first full end-to-end pipeline deploy to Netlify. Added share functionality (email via SMTP, text via sms: URI, copy link), nav partial system for cross-page consistency, settings modal with email/SMS provider config. Fixed three build-breaking issues: Sonnet silent failure under Claude Code (switched default to Haiku), echo prompt corruption (switched to printf), single-page builds ignoring brief sections.

## 2026-03-19 — Studio feature waves 1-6

Six feature waves in one session: (1) multi-page sites with MULTI_UPDATE format and page tabs, (2) brainstorm mode and site versioning with rollback, (3) export/import and tech stack analysis, (4) custom Claude Code skills and settings page, (5) MCP server and data model planning, (6) Studio panel UX overhaul — editable brief, decisions CRUD, session picker, brand health, media specs, AI prompt export, project picker with site switching.

## 2026-03-13 — Studio workflow overhaul

Rewrote site-studio/server.js and public/index.html to implement a 4-phase studio workflow: request classifier (18 intent types with precedence), planning mode (design brief artifact), design decisions log (memory spine), curated prompt builder with anti-cookie-cutter rules, step log with real timing, image upload with role metadata and SVG sanitization, post-generation change summaries.

## 2026-03-12 — Ecosystem consolidation and Claude CLI integration

Consolidated 4 repos into 1 (`~/famtastic/`). Deleted ~40% dead code. Moved Think-Tank CLIs to `cli/idea/`, Platform admin to `fam-hub admin`. Replaced all Anthropic Python SDK calls with `claude --print` — no API key needed. Archived famtastic-platform, famtastic-think-tank, famtastic-dev-setup. Created MANIFESTO.md.

## 2026-03-10 — Project plan and initial site builder

Created the conversational website builder plan (7 phases). Implemented walking skeleton: orchestrator-site for batch generation, site-preview for live reload, fam-hub CLI dispatcher, spec.json schema, 4 starter templates (event, business, portfolio, landing), deploy pipeline (Netlify + Cloudflare), asset-generate for SVG pipeline, and the chat studio web app (Express + WebSocket).
