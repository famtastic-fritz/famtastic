# FAMtastic Ecosystem — Site Learnings

## Consolidation (2026-03-12)

4 repos merged to 1: `~/famtastic/` (renamed from famtastic-agent-hub). Dead code deleted (~40%). Think-Tank CLIs and Platform's useful bits absorbed as `fam-hub idea` and `fam-hub admin` subcommands. Three repos archived: famtastic-platform, famtastic-think-tank, famtastic-dev-setup.

### What's in the consolidated repo

**Two active capabilities:**
1. **Site factory** (revenue path) — chat-driven website builder, template system, deploy pipeline
2. **Multi-agent workflow** (productivity multiplier) — Claude/Gemini/Codex adapters, conversation reconciliation

**What works end-to-end:**
- Site builder pipeline: spec.json -> Claude CLI generates HTML -> live preview -> deploy to Netlify
- Chat studio: Express + WebSocket UI, chat panel + iframe preview, routes to Claude for site refinement
- Asset generation: `asset-generate` produces SVGs via Claude CLI for logos, icons, favicons, banners, dividers, illustrations
- Templates: 4 ready (event, business, portfolio, landing) with placeholder replacement
- Deploy: Netlify and Cloudflare supported, spec.json updated with URL, domain helper for GoDaddy DNS
- Claude CLI integration: `claude --print` replaces all Anthropic Python SDK calls, no API key needed
- Conversation reconciliation: `cj-reconcile-convo` + `cj-compose-convo` work
- Native CLI adapters: `claude-cli`, `gemini-cli`, `codex-cli` functional
- Idea lifecycle: 7 Python CLIs (capture, triage, blueprint, prototype, validate, learn, digest)
- Admin: `fam-hub admin doctor` (health check) + `fam-hub admin verify` (repo validation)

---

## What Works End-to-End (The Money Path)

```
fam-hub site new <tag>     →  Opens chat studio + live preview in browser
  "I want a reunion site"  →  Triggers planning mode → design brief artifact
  User approves brief       →  Claude generates full HTML from brief + decisions
  "Make the header blue"   →  Classifier routes as layout_update, targeted edit
  "Create a logo"          →  SVG generated, saved to dist/assets/
  "Use the event template" →  Template applied with spec colors/fonts
  Drag-drop an image        →  Upload with role, optional slot replacement
  "Add images"             →  Fills empty image slots with stock photos (Unsplash/Pexels/Pixabay fallback)
fam-hub site deploy <tag>  →  Pushes to Netlify, returns live URL
fam-hub site domain <tag>  →  Shows DNS records for GoDaddy
fam-hub site list          →  Dashboard of all sites with status
```

---

## Slot-Based Image System

Every `<img>` in a generated site carries three data attributes that form its identity:

```html
<img data-slot-id="hero-1" data-slot-status="empty" data-slot-role="hero"
     src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
     alt="Hero image" class="w-full h-96 object-cover" />
```

- `data-slot-id` — unique role-based ID. Claude infers from context: `hero-1`, `testimonial-2`, `service-mowing`, `gallery-3`, `team-1`, `logo-1`.
- `data-slot-status` — lifecycle state (see below).
- `data-slot-role` — semantic purpose. One of: `hero`, `testimonial`, `team`, `service`, `gallery`, `logo`, `favicon`.

`media_specs` in `spec.json` is the **single source of truth** for all image slots across the site. Brand Health, stock photo fill, and upload replacement all read from and write to it.

### Slot Status Lifecycle

| Status | Meaning | src value |
|--------|---------|-----------|
| `empty` | Initial state after build. Transparent 1x1 pixel data URI. No visual content. | `data:image/gif;base64,R0lGOD...` |
| `stock` | Filled with an Unsplash photo or branded SVG placeholder. Ready to be upgraded. | `assets/stock/{slot-id}.jpg` or `assets/placeholders/{name}.svg` |
| `uploaded` | User provided a real asset via the upload modal. | `assets/uploads/{filename}` |
| `final` | Approved for production. (Not yet used in automated flows — reserved for future approval step.) | varies |

### media_specs Schema

Each entry in `spec.json → media_specs[]`:
```json
{
  "slot_id": "hero-1",
  "role": "hero",
  "dimensions": "1920x1080",
  "status": "empty",
  "page": "index.html"
}
```

### Dimension Defaults by Role

Defined in `SLOT_DIMENSIONS` constant in `server.js`:

| Role | Dimensions |
|------|-----------|
| hero | 1920x1080 |
| testimonial | 400x500 |
| service | 800x600 |
| team | 400x400 |
| gallery | 800x600 |
| logo | 400x200 |
| favicon | 512x512 |

### Slot Extraction (Post-Build)

Two functions in `server.js` handle slot registration:

- `extractSlotsFromPage(html, page)` — regex-scans a single HTML string for `<img>` tags with `data-slot-id`. Returns an array of `{ slot_id, role, dimensions, status, page }`.
- `extractAndRegisterSlots(pages)` — scans all specified pages (or all pages if none given), merges results into `media_specs` in spec.json. Preserves existing status (won't regress `stock` → `empty`). Removes specs for slots no longer present in the scanned pages.

These run automatically in the post-build pipeline:
- After `MULTI_UPDATE` — called with `writtenPages` array (all newly generated pages).
- After `HTML_UPDATE` — called with `[currentPage]`.

`autoDetectMediaSpecs(html)` is kept as a **legacy fallback** for HTML generated before the slot system existed. It uses regex heuristics to detect hero/logo/gallery/team sections and creates spec entries with the new `slot_id` schema. If the HTML already contains `data-slot-id` attributes, the legacy function is a no-op.

### Build Prompt Rules

The build prompt in `server.js` includes an `IMAGE SLOTS (CRITICAL)` section that instructs Claude to:
- Put all three `data-slot-*` attributes on every `<img>` tag
- Always set `data-slot-status="empty"` on initial generation
- Use the transparent 1x1 pixel data URI for `src` — never Unsplash URLs or fake filenames
- Generate unique slot IDs: numbered for repeating elements (`testimonial-1`, `gallery-3`), descriptive slugs for services (`service-mowing`)

### Stock Photo Fill (Multi-Provider System, updated 2026-03-24)

**Script:** `scripts/stock-photo` — shell script that downloads a stock photo via 3-provider fallback chain.
- Usage: `stock-photo <query> <width> <height> <output-path>`
- Provider order: Unsplash → Pexels → Pixabay (skips any provider with no API key)
- Env vars: `UNSPLASH_API_KEY`, `PEXELS_API_KEY`, `PIXABAY_API_KEY`
- Prints `provider=unsplash|pexels|pixabay` to stdout so the caller knows which succeeded
- Dependencies: `curl`, `python3` (for URL encoding and JSON parsing — no `jq` dependency)
- If all 3 fail or no keys configured: exit 1, slot stays empty

**API key configuration:** `~/.config/famtastic/studio-config.json` → `stock_photo` object with 3 keys: `unsplash_api_key`, `pexels_api_key`, `pixabay_api_key`. All 3 are configurable from the Settings UI (Stock Photos section).

**Provider abstraction:** `fetchFromProvider(provider, query, width, height, limit)` in `server.js`
- `'unsplash'` — Unsplash API (requires `UNSPLASH_ACCESS_KEY`)
- `'pexels'` — Pexels API (requires `PEXELS_API_KEY`)
- `'placeholder'` — generates a styled SVG data URL inline (zero dependencies, always works)
- Returns `[{ url, thumb, credit, provider }]` array
- Used by both `/api/stock-search` (preview) and `/api/stock-apply` (download)

**Contextual stock queries:** Query is no longer just the slot role. When the auto-fill handler runs, it builds: `"${businessName} ${industry} ${role}"` — e.g., `"The Best Lawn Care lawn maintenance gallery"` instead of `"gallery"`. Applies when `query === slotSpec.role` and business context is available from spec.

**Endpoints:**
- `POST /api/stock-photo` — auto-applies first result to slot (used by bulk fill). Accepts `{ slot_id, query }`. Stores `{ src, alt, provider, query, credit }` in `slot_mappings`.
- `GET /api/stock-search?slot_id=X&query=Y` — returns up to 6 thumbnails from all configured providers for the QSF preview grid. Used by Quick Slot Fill "Stock" button.
- `POST /api/stock-apply` — downloads a specific URL (selected from preview grid) and applies it to a slot.

**QSF Stock preview grid (updated):** Clicking "Stock" in the Quick Slot Fill panel no longer immediately applies a photo. Instead it opens a floating panel with:
- Editable query field pre-filled with contextual query
- 6-thumbnail grid (up to 3 from each configured provider)
- Provider badge on each thumb (Unsplash/Pexels/placeholder color-coded)
- Credit name below thumb
- "Refresh" button re-queries with edited query
- Clicking a thumb calls `POST /api/stock-apply` and closes the panel

**Classifier intent:** `fill_stock_photos`
- Triggers on: "add images", "fill images with stock photos", "add relevant photos", "I need images", "fill the image slots", "get photos"
- Handler reads all `empty` slots from `media_specs`, generates contextual search queries per slot
- Passes all 3 API keys as env vars to `scripts/stock-photo`
- Per-slot progress sent via WebSocket with provider attribution: `"hero-1 filled via Pexels"`
- Stores `{ src, alt, provider, query, credit }` in `spec.json → slot_mappings` for rebuild persistence

**No offline dead-end:** SVG placeholder provider (`fetchFromProvider('placeholder', ...)`) generates a styled SVG data URL as last resort — always returns something even with no API keys configured. No more `"Stock photo failed"` dead ends.

**No offline fallback in bulk build pipeline:** Auto-placeholder generation (`bulkGeneratePlaceholders()`) has been removed from all 3 automatic build pipeline call sites. Empty slots stay as transparent pixels until explicitly filled via stock photos or upload.

### Upload-to-Replace (Slot Targeting)

**Endpoint:** `POST /api/replace-slot` in `server.js`
- Accepts: `{ slot_id, newSrc }`
- Finds the `<img>` with matching `data-slot-id` across all pages
- Updates `src` to `newSrc`, sets `data-slot-status="uploaded"`
- Deletes old stock photo from `dist/assets/stock/` if one exists
- Updates `media_specs` status to `uploaded`
- Stores mapping in `spec.json → slot_mappings` for rebuild persistence

**Upload modal dropdown:** When the user uploads a file, the role selector modal includes a "Replace Image Slot" dropdown populated from `media_specs` via `GET /api/site-info`. Each option shows: slot ID, role, current status, and page. Selecting a slot causes the uploaded file to replace that slot in the HTML after upload completes.

The old `POST /api/replace-placeholder` endpoint still exists for backward compatibility (matches by `src` string) but the upload modal now uses `POST /api/replace-slot` exclusively.

### Slot Mapping Persistence (added 2026-03-24)

Images assigned to slots (via upload or stock photo fill) survive rebuilds through a mapping system:

**Storage:** `spec.json → slot_mappings` — object keyed by slot ID:
```json
"slot_mappings": {
  "hero-1": { "src": "assets/uploads/firefly_luxury-1920x1080.jpg", "alt": "Luxury lawn", "provider": "uploaded", "query": null, "credit": null },
  "gallery-3": { "src": "assets/stock/gallery-3.jpg", "alt": "Gallery image", "provider": "unsplash", "query": "The Best Lawn Care lawn maintenance gallery", "credit": "John Smith" }
}
```

**Write paths:** Mappings are written when:
- `POST /api/replace-slot` succeeds (upload assignment)
- `fill_stock_photos` handler fills a slot (stock photo download)
- `POST /api/stock-apply` applies a QSF-selected image

**Re-application:** `reapplySlotMappings(writtenPages)` in `server.js`:
- Reads `slot_mappings` from spec.json
- For each written page, scans for `data-slot-id` attributes via regex
- If a slot has a mapping, replaces `src` with the mapped value and sets `data-slot-status="uploaded"`
- Runs in all 3 post-processing paths: after `finishParallelBuild()`, after MULTI_UPDATE, after HTML_UPDATE
- Followed immediately by `reconcileSlotMappings()` (see below)

**Prompt injection:** `buildPromptContext()` includes an `EXISTING IMAGES` section listing all mapped slots with their src paths, instructing Claude not to replace them with placeholders. This context is injected into both single-page and parallel build prompts.

**Clear mapping endpoint:** `POST /api/clear-slot-mapping` — accepts `{ slot_id }`, removes key from `slot_mappings`, resets `media_specs` status back to `empty`. Called by QSF "Clear" button.

---

### Slot Lifecycle Integrity (added 2026-03-24)

Addresses the lifecycle problem: as sites go through iterations and rebuilds, slot IDs change and old mappings accumulate silently.

**`reconcileSlotMappings()` in `server.js`:**
- Scans all pages in `DIST_DIR()` for all real `data-slot-id` values
- Compares against `spec.slot_mappings` keys
- Removes any keys not found in any page HTML (orphaned mappings)
- Returns `{ removed: [...orphanIds] }` for logging
- Runs automatically after `reapplySlotMappings` in the post-build pipeline

**`POST /api/rescan` endpoint:**
- Calls `extractAndRegisterSlots(listPages())` — re-scans all pages
- Calls `reconcileSlotMappings()` — removes orphans
- Returns `{ success, slots_registered, orphans_removed, pages_scanned, orphans }`
- Manual trigger: "Rescan" button in Studio preview toolbar

**Rescan button:** Small "Rescan" button in the preview toolbar (next to Slots toggle). On click: POST /api/rescan → shows result in status bar for 5 seconds → refreshes Brand Health → refreshes slot preview if active.

**Slot ID stability injection:** On single-page chat edits, current slot IDs for the page being edited are injected into the build prompt:
```
SLOT ID PRESERVATION (CRITICAL): Preserve these existing slot IDs exactly:
  hero-1 (hero)
  gallery-1 (gallery)
Only create new IDs for genuinely new slots.
```
Source: filters `spec.media_specs` by current page, extracted before the Claude call. Prevents "hero-1 becomes hero-main on rebuild" orphan cascade.

**Single-page edit slot registration fix:** The `isFullBuild` guard that prevented `extractAndRegisterSlots` from running on single-page chat edits was removed. Every page edit now calls `extractAndRegisterSlots([editedPage])` so new slots added via chat are immediately registered in `media_specs`.

**`GET /api/site-info` alias:** Returns `{ spec }` envelope — same data as `/api/spec` but wrapped in the shape expected by client-side code that needs `data.spec.slot_mappings`, `data.spec.uploaded_assets`, etc.

### Brand Health (Metrics Dashboard, updated 2026-03-24)

`scanBrandHealth()` in `server.js` reads directly from `media_specs` in spec.json. `GET /api/brand-health` enriches the scan result with:
- `orphaned_mappings` — count of `slot_mappings` keys not found in any page HTML
- `upload_count` — current uploaded_assets count
- `upload_limit` — from `loadSettings().max_uploads_per_site` (default 100)

The Brand Health panel in `index.html` renders a **metrics dashboard** (the old flat per-slot list has been removed — slot management lives in Visual Slot Mode):
- Color-coded legend (red=empty, yellow=stock, green=uploaded)
- Key slots section (hero, logo, favicon with individual status)
- Image sets section (testimonials, gallery, services, team — filled/total)
- Social & meta section (OG image, Twitter Card)
- Font icons section

**Site Metrics sub-section (bottom of Brand Health):**
- **Slot coverage** — filled/total progress bar with percentage. Color: green ≥80%, yellow ≥40%, red <40%
- **Uploads used** — count/limit progress bar. Color: red ≥90%, yellow ≥70%, green <70%
- **Orphaned mappings** — count. Amber if >0, with inline "Rescan to fix" button
- **Empty slot count** — "Fill all with stock" + "Open Slots" action buttons (only shown if empty slots > 0)

The per-slot flat listings (Empty Slots / Stock Photos / Uploaded sections) were removed. Interactive per-slot management is handled by Visual Slot Mode.

---

## Nav Partial System

Keeps navigation consistent across all pages of a multi-page site.

**How it works:**
- `syncNavPartial(ws)` in `server.js` — on first run, extracts the `<nav>` element from `index.html` (or the first available page) and writes it to `dist/_partials/_nav.html`. On subsequent runs, reads the canonical nav from `_nav.html` and replaces the `<nav>` in every page that has a different version.
- `syncNavFromPage(ws, sourcePage)` — when a single page is edited, extracts the `<nav>` from that page, overwrites `_nav.html`, then syncs the updated nav to all other pages.

**When it runs:**
- After every `MULTI_UPDATE` build (post-build pipeline, after `extractAndRegisterSlots` and `reapplySlotMappings`)
- After every `HTML_UPDATE` (via `syncNavFromPage` for the edited page, then `syncNavPartial` for all pages)
- Manual trigger: `POST /api/sync-nav`

**Deploy exclusion:** `_partials/` is appended to `dist/.netlifyignore` automatically so the partial files are not deployed.

**Files:**
- `dist/_partials/_nav.html` — canonical nav element
- `dist/.netlifyignore` — excludes `_partials/` from deploy

Nav, footer, and head sections are all synced. Footer sync uses the same partial pattern (`syncFooterPartial()` / `syncFooterFromPage()`). Head sync (`syncHeadSection()`) propagates Tailwind CDN, Google Fonts, custom styles, and icon CDNs from the source page to all others. Manual footer sync available via `POST /api/sync-footer`.

---

## Share Functionality

The Studio UI has a Share section (visible only when the site is deployed) with three share methods:

### Email (Gmail SMTP)

- **Endpoint:** `POST /api/share` with `type: "email"`
- **Transport:** nodemailer with provider-specific SMTP config. Provider map in `server.js` supports: Gmail (`smtp.gmail.com:587`), Outlook (`smtp-mail.outlook.com:587`), SendGrid (`smtp.sendgrid.net:587`), Custom (user-specified host/port).
- **Config:** `~/.config/famtastic/studio-config.json` → `email` object: `provider`, `user`, `app_password`, `from_name`, `host`, `port`.
- **HTML formatting:** Email body renders URLs as clickable `<a>` tags via regex replacement. Includes "Sent from FAMtastic Site Studio" footer.
- **Fallback:** If email credentials are missing, returns a `mailto:` URI for the browser to handle.

### Text (macOS Messages.app)

- **Method:** Client-side `sms:` URI scheme. When the user clicks "Text", the frontend opens `sms:{recipient}?body={message}` which launches the macOS Messages app with the message pre-filled.
- **No server-side SMS:** The email-to-SMS carrier gateway approach (`{number}@tmomail.net`) was attempted and abandoned — T-Mobile blocks it (AUP#MXRT). Twilio/Vonage are configured in the Settings UI but not wired to behavior.
- **Config:** `~/.config/famtastic/studio-config.json` → `sms` object: `provider`, `carrier`, `from_number`. Currently set to `email_gateway` provider with `tmobile.net` carrier, but the actual send path uses the `sms:` URI, not the gateway.

### Copy Link

- Client-side `navigator.clipboard.writeText()` — copies the deployed URL.

---

## Settings & Provider Configuration

**Settings file:** `~/.config/famtastic/studio-config.json`
**API:** `GET/PUT /api/settings`
**UI:** Gear icon → modal with scrollable form (`max-w-lg`, `max-h-[90vh] overflow-y-auto`)

### Email Provider Dropdown

Options: Gmail, Outlook, SendGrid, Custom SMTP. Selecting a provider shows/hides relevant fields (host/port for Custom, hidden for Gmail/Outlook). Gmail requires a Google App Password (not regular password).

### SMS Provider Dropdown

Options: Email Gateway (with carrier selector for AT&T/T-Mobile/Verizon), Twilio, Vonage. Twilio/Vonage show account SID, auth token, and from number fields. **Note:** Only the `sms:` URI path works in practice — see Share section above.

### Stock Photos (added 2026-03-24)

3 password-type API key fields: Unsplash, Pexels, Pixabay. Keys stored under `stock_photo` in config. Helper text explains fallback order. All 3 keys passed as env vars to `scripts/stock-photo` when filling slots.

### Other Settings

- **Model:** dropdown, currently `claude-haiku-4-5-20251001`. All `spawnClaude()` calls read from this.
- **Deploy target:** Netlify, Cloudflare, Vercel. All three implemented in `scripts/site-deploy`.
- **Deploy team:** string, used by `scripts/site-deploy` for Netlify `--team` flag.
- **Upload limits:** `max_upload_size_mb` (default 5), `max_uploads_per_site` (default 100, raised from 20).
- **Version limits:** `max_versions` (default 50).
- **auto_summary / auto_version toggles:** Wired. `versionFile()` checks `auto_version` before snapshotting. `endSession()` checks `auto_summary` before generating summaries.

---

## Deploy Pipeline

**Script:** `scripts/site-deploy`
**Usage:** `site-deploy <tag> [--provider netlify|cloudflare] [--prod]`

### Provider Resolution Order

1. `--provider` flag
2. `spec.json → deploy_provider`
3. `config/site-deploy/defaults.yaml → default_provider`
4. Auto-detect: check for `netlify` CLI, then `wrangler` CLI

### Netlify Deploy Flow

1. Check `sites/<tag>/.netlify/state.json` for existing site ID
2. **Fallback:** if no `state.json`, check `spec.json → netlify_site_id` and recreate `state.json` from it
3. If site ID exists: `netlify deploy --dir=dist --site SITE_ID [--prod]`
4. If no site ID: `netlify deploy --dir=dist --create-site TAG --team fritz-medine [--prod]`
5. After deploy: extract URL from output, update `spec.json` with `deployed_url`, `deployed_at`, `deploy_provider`, `state`

### stdout/stderr Separation

All status messages (`[deploy] Uploading...`, `[deploy] Creating new site...`) go to **stderr**. Only the final deployed URL goes to **stdout**. This is critical because `server.js` captures the deploy output with `DEPLOY_URL=$(deploy_netlify)` — if status messages went to stdout, they'd corrupt the URL stored in `spec.json`.

### Cloudflare Deploy

Uses `npx wrangler pages deploy` with project name derived from tag. Same stdout/stderr separation pattern.

---

## Request Classifier

`classifyRequest(message, spec)` in `server.js` returns one of 21 intent types. Precedence matters — earlier matches take priority.

| Intent | Triggers | Handler |
|--------|----------|---------|
| `brief_edit` | "edit brief", "update brief", "change the goal" | `handlePlanning()` |
| `brand_health` | "check brand", "brand health", "what's missing" | `scanBrandHealth()` report |
| `brainstorm` | "brainstorm", "let's think", "explore ideas" | `handleBrainstorm()` |
| `rollback` | "rollback", "undo", "revert", "go back" | `rollbackToVersion()` |
| `version_history` | "version", "history", "changelog" | Show version list |
| `summarize` | "summarize", "wrap up", "save progress" | `generateSessionSummary()` |
| `data_model` | "data model", "database", "schema", "CMS" | `handleDataModelPlanning()` |
| `tech_advice` | "what tech", "which platform", "static or CMS" | `analyzeTechStack()` |
| `template_import` | "import template", "use this template" | Instructions for upload |
| `page_switch` | "go to about page", "switch to services" | Direct page change |
| `deploy` | "deploy" (not "how to deploy") | `runDeploy()` |
| `build` | "build the site", "use event template" | `handleChatMessage()` or `runOrchestratorSite()` |
| `query` | "list", "show", "preview" | `handleQuery()` |
| `asset_import` | "create a logo", "generate a favicon" | `runAssetGenerate()` |
| `fill_stock_photos` | "add images", "fill stock photos", "I need images" | Stock photo fill handler |
| `new_site` | No approved brief exists | `handlePlanning()` |
| `major_revision` | "start over", "scrap it", "completely different" | `handlePlanning()` |
| `restyle` | "make it more minimal", "change the overall vibe" | `handleChatMessage()` |
| `layout_update` | "add a section", "move the hero" | `handleChatMessage()` |
| `content_update` | "change the phone number", "update the heading" | `handleChatMessage()` |
| `bug_fix` | "broken", "not working", "misaligned" | `handleChatMessage()` |

Default fallback (no match): `layout_update`.

---

## Post-Build Pipeline

After Claude generates HTML (either `MULTI_UPDATE` or `HTML_UPDATE`), the following steps run in order via `runPostProcessing()`:

1. **Parse response** — extract HTML and `CHANGES:` summary
2. **Version current files** — `versionFile(page, requestType)` snapshots to `dist/.versions/`
3. **Write HTML to disk** — `fs.writeFileSync()` to `dist/`
4. **Extract design decisions** — `extractDecisions(spec, changeSummary, requestType)` for restyle/layout/build/major_revision
5. **Extract and register slots** — `extractAndRegisterSlots(pages)` scans for `data-slot-id`, merges into `media_specs` — **runs FIRST** so slot IDs exist before mappings are applied
6. **Reapply slot mappings** — `reapplySlotMappings(pages)` restores saved images from `spec.slot_mappings`
7. **Blueprint + SEO** — `updateBlueprint(pages)` + `injectSeoMeta(ws)`
8. **Reconcile** — `reconcileSlotMappings()` removes orphaned mappings
9. **Logo-V** — `applyLogoV(pages)` swaps `[data-logo-v]` content
10. **Nav/Footer sync** — `syncNavPartial(ws)` / `syncFooterPartial(ws)` (full build) or `syncNavFromPage(ws, page)` / `syncFooterFromPage(ws, page)` (single-page)
11. **Head dependencies** — `ensureHeadDependencies(ws)` injects Tailwind CDN, Google Fonts — runs on BOTH full builds and single-page edits
12. **Head sync** — `syncHeadSection(ws)` propagates shared `<style>`/`<link>` across pages using MD5 hash fingerprinting (not 80-char prefix)
13. **CSS extraction** — `extractSharedCss(ws)` moves shared styles to `assets/styles.css`, selectively strips only styles matching extracted content (preserves page-specific styles)
14. **Send results** — WebSocket messages: `assistant` (summary), `reload-preview`, `pages-updated`

**Single-page edits** now run the same pipeline steps 5-9 + `ensureHeadDependencies`, but skip `syncHeadSection` and `extractSharedCss` to avoid disrupting inline styles during iterative edits.

---

## Playwright Autonomous Build Pipeline (2026-04-03)

First successful autonomous site build via Playwright driving the Studio GUI.

### What Exists
- Script: `tests/automation/guys-classy-shoes-build.js` — Playwright headless Chromium, DOM-based response detection
- Screenshots: `tests/automation/screenshots/guys-classy-shoes/` — 25 screenshots capturing every step
- Execution log: `tests/automation/logs/guys-classy-shoes-{timestamp}.json` — JSON log with step timing, input/output, success/failure
- Built site: `sites/site-guys-classy-shoes/dist/` — deployed to https://guys-classy-shoes-staging.netlify.app

### Key Findings

| Metric | Value |
|--------|-------|
| Total steps | 23 |
| Pass rate | 100% (23/23) |
| Total duration | 31 min |
| Brief generation | 23s |
| Multi-page build | 102s (produced 1 of 4 requested pages) |
| Stock fill (bulk) | 6s |
| Stock search (targeted) | 124s each (misclassified as layout_update) |
| Post-build edits | 244s each (plan gate blocked, auto-timed-out to completion) |
| Brainstorm response | 17s |
| Brainstorm → build | 55s |
| Version history / Brand health | 4s each |
| Rollback + undo | 4s each |
| Deploy to Netlify | 9s |

### Architecture Decision: DOM-Based Detection

The first version used a standalone WebSocket client to monitor Studio responses. This failed because `server.js` sends WS messages via `ws.send()` (unicast to the originating client), not broadcast. A second WS connection never sees responses.

The working approach uses Playwright's `page.waitForFunction()` to monitor the DOM directly:
1. Count `#chat-messages > div` elements before sending
2. Send chat via `page.fill('#chat-input')` + click submit
3. Wait for `#step-log` to appear (processing) then disappear (done) AND message count to increase
4. Read last message text content

This is reliable because the Studio UI itself updates the DOM from its own WS messages.

### Bottlenecks for 60-Site Factory

1. **No multi-page build from brief** — Currently generates 1 page per `new_site` build. Multi-page requires spec to already list pages. Fix: update spec pages array from brief before triggering build.
2. **Plan approval gate** — Every edit triggers a plan card requiring human click. For automation, need either auto-approve or a `POST /api/chat` endpoint.
3. **Targeted stock searches misclassified** — Goes through full AI rebuild instead of simple image search. Adds ~120s per search unnecessarily.
4. **No REST chat API** — Everything must go through WS-connected browser. `POST /api/chat` would enable CLI and CI/CD automation.

## Research-First Pipeline — Readings by Maria (2026-04-06)

Second autonomous build (Site #3). Tested a new pipeline step: domain research before brief creation. The system had no prior knowledge of psychic services, chakras, tarot, or spiritual practitioner websites.

### Research Phase
- **3 parallel research tracks:** Competitive analysis (12 sites), domain knowledge (chakras, tarot, services, symbolism), visual direction (colors, imagery, typography)
- **4 output files:** `sites/readings-by-maria/research/` — competitive-analysis.md, domain-knowledge.md, visual-direction.md, brief-inputs.md
- **Key research findings that shaped the build:**
  - "Midnight Oracle" dark palette with gold accents (#0B0B14 bg, #C9A84C gold, #7B5EA7 violet) — derived from analyzing Tarot by Dante and similar premium sites
  - Cormorant Garamond + Raleway font pairing — serif headings for ancient wisdom, sans-serif body for modern professionalism
  - Wellness language over fortune-telling language ("guidance" not "predictions") — identified as credibility differentiator
  - 24 specific stock photo queries tested against actual Unsplash/Pexels results, plus 7 queries to explicitly avoid
  - Chakra education section identified as competitive gap (most sites list "chakra balancing" but never explain chakras)

### Multi-Page Conversion Findings
- **Single-to-multi-page conversion via Studio chat: partially successful**
- First attempt ("break into separate pages") classified as `layout_update` — wrong intent. Generated a plan card but `execute-plan` approval did nothing.
- Working path: (1) manually update `spec.json` pages array, (2) send "Rebuild the site with all 4 pages" which classified as `build`, (3) approve plan — multi-page build succeeded.
- Conversion log: `tests/automation/logs/readings-by-maria-multipage-conversion.json`

### Gaps Specific to Multi-Page Conversion — CLOSED (2026-04-06)
- **~~No `restructure` classifier intent~~** — FIXED: Added `restructure` intent to `classifyRequest()` with regex for "break into pages", "separate pages", "split into pages", "make multi-page", etc. Routes to `build` handler via fall-through in `routeToHandler()`. Added to `PLAN_REQUIRED_INTENTS`. Function: `classifyRequest()` in `server.js`.
- **~~`execute-plan` handler silent failure~~** — FIXED: Replaced silent `if (!plan) return` with error message sent to client. Now sends `{type:'error', content:'Plan not found or already executed'}`. Line ~7347 in `server.js`.
- **Stale plan cards accumulate** — mitigated by Fix 3 error message, but DOM-side cleanup still needed (cosmetic, not blocking)
- **~~spec.json pages not auto-populated from brief~~** — FIXED: Added `extractPagesFromBrief()` helper that parses `must_have_sections` against 22 known page names. Called in `approve-brief` handler after `brief.approved=true`. Function: `extractPagesFromBrief()` in `server.js`, exported for testing.
- **brainContext not passed to parallelBuild** — FIXED (pre-existing bug discovered during testing): `parallelBuild()` template literal referenced `${brainContext}` but it wasn't in the function signature. Added to signature and call site.

## Content Editing Gap Analysis (2026-04-07)

Tested 10 real-world content edits through Studio chat on the Readings by Maria site. Results: **8/10 successful, 2 failed**.

### What Works
- **Phone number change** — surgical tel: link + display text update
- **Email change** — mailto: and display text both updated
- **Single price change** — changed only the targeted price, others preserved
- **Business hours addition** — added new content without breaking existing layout
- **Testimonial text + name swap** — 28s surgical edit, no page rebuild (the only truly surgical edit)
- **Add new service** — card added to pricing grid, existing services preserved
- **Remove service** — clean removal, no layout gaps
- **Address addition** — proper address block added

### What Fails
- **Cross-page CTA change** — "change all buttons" only applies to active page. No multi-page edit capability.
- **Seasonal banner** — "add a banner at the top" failed silently. Claude rebuilt the page without including the banner. Ephemeral content not in the original brief gets dropped during rebuilds.

### Systematic Findings
- **0/10 edits classified as content_update** — all routed to `layout_update`. The `content_update` regex requires field name immediately after "the" (e.g., "change the phone") but real-world edits include location words ("change the CONTACT phone"). Regex needs widening.
- **9/10 edits required plan approval** — only the testimonial edit executed directly. The plan gate adds ~3 min overhead per edit for changes that should take seconds.
- **9/10 edits triggered full page rebuilds** — only 1 was a surgical text replacement. The system lacks a deterministic find-and-replace path.
- **Content preservation across edits is solid** — cumulative changes survived through multiple rebuilds.

### What Content Editing Needs
1. **Content model in spec.json** — phone, email, hours, prices as structured data fields, not hardcoded in HTML
2. **Deterministic text replacement** — for "change X to Y" requests, find the text in HTML and replace without invoking Claude
3. **Cross-page edit capability** — detect "all pages" and iterate through spec.pages
4. **Widen content_update regex** — allow any words between "the" and field names
5. **Plan gate bypass for content_update** — phone number change should not need plan approval

## Codex vs Claude Comparison (2026-04-07)

Built the same Readings by Maria site with both Claude (via Studio) and Codex (direct generation). Same research, same brief.

| Metric | Claude/Studio | Codex |
|--------|--------------|-------|
| Total HTML size | 52 KB | 94 KB |
| Image slots (data-slot-id) | 2 | 17 |
| Chakra Sanskrit names | 0 | 7 |
| Services with pricing | Partial (edits altered) | All 6 |
| Post-processing | Full pipeline | None |
| Iterative editing | Yes (8/10 edits) | No |
| Deploy integration | Yes (Netlify) | No |

**Verdict:** Codex wins on first-pass generation quality (richer content, better slot compliance). Claude/Studio wins on iterative editing and deployment infrastructure. **Recommended pipeline: Codex generates initial HTML → Studio imports → Claude handles edits → Studio deploys.**

## Phase 0 Content Data Layer (2026-04-07)

### What Was Built
1. **Classifier fix** — `content_update` now has higher precedence than `bug_fix` and `layout_update`. Widened regex: `(change|update|replace|edit|set|fix|correct|modify)` + any words + `(phone|email|address|hours|price|...)`. Added natural language patterns: "buttons to say", "the X should be", "add the address/hours/phone". Removed "fix" and "wrong" from `bug_fix` triggers to prevent false positives.
2. **Build prompt injection** — `systemRules` in `buildPromptContext()` now includes CONTENT IDENTITY MARKERS section instructing Claude to add `data-section-id`, `data-field-id`, and `data-field-type` attributes to all content elements. Content field values from `spec.content` injected into prompts so they persist across rebuilds.
3. **Post-build content sync** — `syncContentFieldsFromHtml(pages)` runs in `runPostProcessing()` after `reapplySlotMappings`. Parses `data-field-id` attributes from generated HTML, adds new fields to `spec.content`. Does NOT overwrite existing fields (spec is authoritative).
4. **Surgical content handler** — Extended `tryDeterministicHandler()` with field-aware replacement: detects field type from message (phone/email/address/hours/price/testimonial), looks up field in `spec.content`, finds by `data-field-id` selector (preferred) or text match (fallback), updates HTML + spec atomically. Handles phone→tel: href and email→mailto: transforms. Cross-page detection for "all pages" messages.
5. **Concurrency** — `writeSpec()` now tracks `_revision` counter (monotonically increasing). Writes to `mutations.jsonl` when mutation details provided.

### Verification Results
- **Classifier accuracy: 10/10 correct** (was 0/10 before Phase 0)
- **7/10 → content_update** (phone, email, price, hours, testimonial, CTA buttons, address)
- **3/10 → layout_update** (add service, remove service, add banner — correctly structural)
- **0/7 content edits require plan approval** (was 9/10)
- **Surgical deterministic handler: 0/7 activated** — site was built pre-Phase 0 without `data-field-id` attributes. New builds will include them. Handler is wired and tested.

### Key Functions Added
- `syncContentFieldsFromHtml(pages)` — post-build content sync. File: `server.js`.
- `writeSpec(spec, options)` — now accepts `{ source, mutationLevel, mutationTarget, oldValue, newValue }` for mutation tracking.
- Extended `tryDeterministicHandler()` — field-aware surgical replacement block.
- Extended `buildPromptContext()` — returns `contentFieldContext` and `globalFieldContext`.

## Studio v3 Architecture Decisions (2026-04-07)

Four architectural gaps resolved before Phase 0 implementation begins. Full decisions in `docs/v3-architecture-decisions.md`. Codex adversarial review in `docs/v3-architecture-codex-review.md`.

### Decisions Made
1. **Identity lifecycle:** IDs are page-scoped sequential counters (`{page}-{type}-{n}`). Write-once allocation via `max+1`. Codex flagged DOM-order recovery as insufficient — recommended persisting IDs as `data-*` attributes in HTML for durability.
2. **Concurrency:** Single-writer priority queue (user edits priority 1 > build results priority 2 > background priority 3). Codex flagged stale-read risk and recommended revision-aware mutations with `spec_version` token.
3. **Multi-target rendering:** Canonical value + render_targets array with type-based transforms. Codex flagged US-specific phone/address formats — recommended locale-aware structured values.
4. **Component ownership:** Instance-on-import (fork at import, independent thereafter). Reference mode deferred to v2. Codex agreed this is correct for v1 but flagged re-import fragility without stable slot IDs.

### Schema Updates
`schemas/site-spec.schema.json` updated with: `slot_queries` (per-slot stock photo queries), `content` (structured fields per page with render_targets), `sections` (section metadata with component references).

## Phase 2 — VS Code-Inspired Layout + Editable View (2026-04-07)

Complete UI overhaul from three-horizontal-panel layout to VS Code-inspired workspace with left sidebar, tabbed canvas, bottom CLI bar, and right sidebar.

### Layout Structure

```
Left Sidebar (220px)     Center Area (flex-1)                Right Sidebar (300px)
  EXPLORER                 Canvas Tabs: Preview | Editable     Studio State
  - Pages list              - Preview (iframe, device toggle)   - Mode: Create/Ship/Grow
  - Sections tree           - Editable View (click-to-edit)     - Tab panels (Media,
  - Media summary                                                 Structure, Style, etc.)
                           CLI Bar (280px, adjustable)
                             - Chat tab (messages + input)
                             - Terminal tab (xterm.js)
```

### New Files Created
- `site-studio/public/css/studio-canvas.css` — canvas tab bar, editable view toolbar, field edit overlay, field highlights
- `site-studio/public/css/studio-cli.css` — CLI bar container, CLI tab bar, horizontal resizer, chat/terminal pane layout

### Updated Files
- `site-studio/public/css/studio-panels.css` — rewritten for new layout (left sidebar, center area, right sidebar, vertical resizers, responsive breakpoints)
- `site-studio/public/index.html` — full HTML restructure + ~350 lines new JS

### Key HTML Elements
- `#left-sidebar` — collapsible left sidebar with `.ls-section` accordion sections (Pages, Sections, Media)
- `#center-area` — flex column containing canvas area + horizontal resizer + CLI bar
- `#canvas-area` — flex-1 with `#canvas-tab-bar` and `#canvas-content`
- `#canvas-preview` — preview tab pane (migrated from old `#preview-panel`, keeps `#preview-frame`, `#page-tabs`, `#device-toggle`)
- `#canvas-editable` — editable view tab pane with `#editable-frame` iframe and field edit overlay
- `#resizer-h` — horizontal drag resizer between canvas and CLI (cursor: row-resize)
- `#cli-bar` — bottom panel with `#cli-tab-bar` (Chat | Terminal) and `#cli-content`
- `#cli-chat` — chat messages + input form (migrated from old `#chat-panel`)
- `#cli-terminal` — terminal toolbar + xterm container (migrated from old studio terminal tab)
- `#resizer-left`, `#resizer-right` — vertical resizers between sidebars and center

### Key JS Functions (new)
- `switchCanvasTab(tab)` — switches between 'preview' and 'editable' canvas tabs
- `switchCliTab(tab)` — switches between 'chat' and 'terminal' CLI tabs, auto-creates terminal on first switch
- `toggleLeftSidebar()` — shows/hides left sidebar + its resizer
- `toggleCliBar()` — minimize (36px tab bar only) / restore CLI bar height
- `toggleLsSection(sectionId)` — accordion toggle for left sidebar sections
- `setupHResizer()` — horizontal drag-to-resize between canvas and CLI bar, persists height to localStorage
- `renderPagesList()` — renders page items in left sidebar from `sitePages`, highlights active page
- `selectPage(page)` — selects page in sidebar, syncs preview via WS, refreshes section tree
- `loadSectionTree(page)` — fetches `GET /api/content-fields/:page`, renders field tree grouped by section with type icons
- `scrollToField(fieldId)` — scrolls editable iframe to a field and highlights it
- `loadEditableView()` — loads same page as preview into editable iframe, injects click handlers
- `injectEditableOverlay(frame)` — injects CSS for field highlights and click-to-edit handlers on `[data-field-id]` elements
- `openFieldEditor(el, frame)` — opens floating overlay editor at field position with input + Save/Cancel
- `updateFieldCount(frame)` — counts `[data-field-id]` elements and shows count in toolbar
- `refreshLeftSidebar()` — refreshes all left sidebar sections (pages, sections, media)
- `updateMediaSummary()` — shows slot/upload counts from cached studio state

### Sidebar Toggles (header)
- Left sidebar toggle: hamburger icon button `#left-sidebar-btn`, calls `toggleLeftSidebar()`
- Right sidebar toggle: panel icon button `#studio-btn`, calls `toggleStudioPanel()` (unchanged function, same ID)
- Both buttons turn gray when sidebar is hidden, hide/show their associated resizer

### Panel Width Persistence (localStorage keys)
- `panel-left-sidebar-width` — left sidebar width
- `panel-right-sidebar-width` — right sidebar width (was `panel-center-width`)
- `cli-bar-height` — CLI bar height

### Brainstorm Mode Adaptation
Brainstorm mode now hides both sidebars + canvas area, expands CLI bar to fill the center column. Restores previous state (sidebar visibility, CLI bar height) on exit.

### Migration Notes
- Old panel IDs preserved where possible: `#studio-panel` (now right sidebar), `#chat-messages`, `#chat-form`, `#chat-input`, `#preview-frame`, all studio tab content IDs
- `#chat-panel` → removed (content moved to `#cli-chat`)
- `#preview-panel` → removed (content moved to `#canvas-preview`)
- `togglePreview()` → now toggles between Preview and Editable View canvas tabs
- `updatePanelLayout()` → no-op (CSS flex handles layout automatically)
- Drag-and-drop target changed from `#chat-panel` to `#cli-chat`
- Terminal tab in right sidebar shows redirect link to CLI bar terminal

## Phases 3-5 — Multi-Agent, Image Browser, Intelligence Loop (2026-04-07)

8-wave implementation adding canvas tabs, CLI tabs, server endpoints, and analytics.

### Wave 0: Data-Driven Tab Switching
Refactored `switchCanvasTab()` and `switchCliTab()` from hardcoded arrays to `querySelectorAll('#canvas-tab-bar .canvas-tab')` pattern. Tab buttons use `data-pane` (target pane ID) and `data-hook` (global function name for lazy-load activation). Adding new tabs requires only HTML — no JS changes.

### Wave 1: Image Browser Canvas Tab (Phase 4)
Full canvas tab for stock photo search, replacing the small QSF floating panel for browsing.
- **Canvas tab:** `#canvas-images` with search toolbar, provider dropdown (All/Unsplash/Pexels), slot selector, 6-column result grid (responsive: 4-col < 1200px, 3-col < 768px)
- **Server:** Enhanced `GET /api/stock-search` now accepts `provider` and `limit` params (cap: 20 per provider)
- **JS functions:** `searchImageBrowser()`, `loadImageBrowserSlots()`, `renderImageResults()`, `applyImageToSlot()` — reuses existing `applyStockResult` backend
- **Codex fix U1:** Slot selector pins active slot visibly so user always knows where "Apply" targets

### Wave 2: Research View Canvas Tab (Phase 4)
Canvas tab for viewing research markdown files generated during pre-brief research phase.
- **Canvas tab:** `#canvas-research` with file list sidebar (220px) + content area
- **Server:** `GET /api/research/:filename` — allowlisted filenames via `readdirSync` (Codex S4 fix), 500KB size cap (Codex E2/F2), path traversal safe
- **JS functions:** `loadResearchFiles()`, `viewResearchFile()`, `renderMarkdownSafe()`, `appendInlineFormatted()`
- **Codex fix S3:** Markdown renderer uses DOM API only (createElement/createTextNode) — no innerHTML. Handles headings, bold, italic, code, lists.

### Wave 3: Codex CLI Tab (Phase 3)
Third tab in the CLI bar for interacting with Codex directly.
- **CLI tab:** `#cli-codex` with monospace output area + text input + Run button
- **Server:** `POST /api/codex/exec` — calls `scripts/codex-cli` via `execFile`, 120s timeout, 10KB prompt cap, stdin immediately closed (Codex E3 fix — prevents interactive mode fallback)
- **JS functions:** `sendCodexPrompt()`, `appendCodexMessage(role, text)` — Enter key submits, loading indicator, error display for missing codex binary

### Wave 4: Metrics Summary API (Phase 3+5)
- **Server:** `GET /api/metrics/summary` — reads build-metrics.jsonl, returns `{ totalBuilds, avgTime, byModel, byType }`
- Uses JSONL as data source (SQLite integration deferred — Codex A1 noted but builds table not always populated)

### Wave 5: Mutation Timeline (Phase 5)
- **Server:** `GET /api/mutations?page=X&limit=50` — reads mutations.jsonl (reverse chronological), field frequency analysis (`topFields`), JSONL retention at 1000 entries (Codex F4 fix — compacts on read when > 1200 lines)
- **HTML:** Mutations accordion in History tab (`#accordion-mutations`) with `#mutation-patterns` (top 5 most-changed fields) and `#mutation-timeline` (paginated entries)
- **JS functions:** `loadMutations(page)`, `renderMutationTimeline()`, `loadMoreMutations()` — auto-triggered on history tab switch

### Wave 6: Model Comparison Canvas Tab (Phase 3)
Side-by-side Claude vs Codex comparison with version safety.
- **Canvas tab:** `#canvas-compare` with toolbar (sync scroll checkbox, "Generate Codex Version" button), side-by-side iframes, "Use this" buttons with confirmation dialog
- **Server:** `POST /api/compare/generate` — calls codex-cli to regenerate current page, saves to `{SITE_DIR}/compare/`. `POST /api/compare/adopt` — with `versionFile()` snapshot before overwrite (Codex I5 fix). Static serve for `/compare/` directory.
- **JS functions:** `loadCompareView()`, `generateCodexVersion()`, `setupCompareScroll()`, `useCompareVersion(side)` — confirm() before destructive adopt
- **Codex fixes:** E5 (stale page captured at generation), I5 (version snapshot), U5 (confirmation dialog)

### CSS Files Updated
- `studio-canvas.css` — added Image Browser (#images-toolbar, #images-results-grid, .image-result-card), Research View (#research-layout, .research-file-item), Model Comparison (#compare-split, .compare-panel)
- `studio-cli.css` — added Codex pane styles (.codex-msg-user/assistant/error, .codex-loading)

### Codex Adversarial Review Summary
43 findings across 7 categories (Security, Architecture, Edge Cases, UX, Data Model, Integration, Forgotten). Key fixes incorporated: S3 (XSS — DOM-only markdown), S4 (path traversal — filename allowlist), E3 (interactive mode — stdin close), F4 (JSONL retention — 1000 cap), I5 (version safety — snapshot before adopt), U5 (confirmation dialog). Full findings documented in session context.

## AI Media Tools — Proof of Concept (2026-04-07)

### Adobe Firefly
- **Skill installed:** `.claude/skills/adobe-firefly/SKILL.md`
- **CLI script:** `scripts/firefly-generate` — supports `--prompt`, `--output`, `--style-ref`, `--batch`, `--width`, `--height`
- **Auth:** OAuth 2.0 client credentials → Adobe IMS (`https://ims-na1.adobelogin.com/ims/token/v3`)
- **API:** `POST https://firefly-api.adobe.io/v2/images/generate` with `x-api-key` and `Bearer` token
- **Status:** BLOCKED — needs `FIREFLY_CLIENT_ID` and `FIREFLY_CLIENT_SECRET` from Adobe Developer Console
- **Key capability:** Style reference matching — generate image sets with consistent lighting/color by using an anchor image as style reference
- **Content Credentials:** All outputs include C2PA metadata (AI provenance tracking)

### Google Imagen 4.0 + Veo 2.0 (TESTED — paid plan active)
- **SDK:** `google-genai` v1.47.0
- **Status:** WORKING — paid plan active with $25 credit
- **Imagen 4.0 results:** 4/4 shoe product images generated. Quality 9/10. Avg 7.2s per image. ~1.1-1.3 MB per image. Exceptional leather texture, lighting, composition. Cost ~$0.004/image.
- **Veo 2.0 results:** Hero video generated from Imagen still in 33.4s. 1.6 MB file size (well under 5MB web target). Candle flicker and smoke animation look natural. Usable for production hero backgrounds.
- **Pipeline:** Imagen generates still → Veo animates to video. Total: ~40s for a hero video from text prompt.

### Leonardo.ai Phoenix 1.0 (TESTED — API plan active)
- **Account:** `famtastic_fritz`, 3,344 API paid tokens + 150 subscription tokens
- **Status:** WORKING — 4/4 shoe images generated
- **Quality:** 7/10 — more CGI/rendered look vs Imagen's photorealism. Color accuracy lower (oxford came out navy instead of brown). Coherence between set images lower (5/10 vs Google's 7/10).
- **Speed:** 8.6s avg per image. Cost: $0.016/image (4x more than Google).
- **Models:** 47 available including FLUX, Kino XL, custom training. Model variety is Leonardo's strength.
- **API:** REST with polling (vs Google's Python SDK with 3-line generation). More complex integration.

### Adobe Firefly Web App (TESTED — CC subscription, Chrome automation)
- **Account:** fritz.medine@gmail.com, 3,800/4,000 premium credits (resets April 19)
- **Status:** WORKING via Chrome shadow DOM automation (Claude-in-Chrome MCP)
- **Model:** Firefly Image 3 (Firefly Image 5 preview also available)
- **Quality:** 9/10 — cognac leather oxford with brogue detailing, dramatic warm lighting. On par with Google Imagen 4.0.
- **Style Reference:** CONFIRMED — "Reference" section in Composition panel with Upload image + Browse gallery + strength slider. This is the key differentiator for image set coherence.
- **Video:** INCLUDED in CC — "Generate Media" (image+video on infinite canvas) + "Edit video (beta)" for trim/arrange/generate.
- **Partner Models:** Gemini 3.1 (w/ Nano Banana 2) integrated as default on homepage.
- **Custom Models:** Training accessible from left nav sidebar.
- **Content Credentials:** C2PA metadata on all outputs (commercially safe).
- **Automation Pattern:** Adobe uses Spectrum Web Components with deep shadow DOM. Must use recursive `walkShadow(root, depth)` to find SP-BUTTON/SP-ACTION-BUTTON elements. Textarea requires native value setter + input/change events. Generate button requires full pointer event sequence. File downloads blocked by Chrome extension (use screenshots).
- **API:** Enterprise only ($1K+/mo). Web app is the viable automation path via Chrome MCP.

### AI Media Telemetry System
- **Module:** `site-studio/lib/media-telemetry.js`
- **Functions:** `logMediaOperation(data)`, `getMediaUsage(options)`
- **Per-site log:** `sites/{tag}/media-telemetry.jsonl`
- **Global log:** `intelligence/media-usage.jsonl`
- **Endpoints:** `POST /api/media/log`, `GET /api/media/usage`, `GET /api/media/usage/:provider`
- **Data captured:** provider, model, operation type, cost_usd, credits_used, credits_remaining, tokens_in/out, generation_time, file_size, resolution, prompt, style_reference_used, batch_size, fallback tracking
- **Credit alerts:** Warning at 20%, alert at 10% of provider allocation
- **Recommendations:** Auto-generated cost comparisons between providers
- **Compaction:** Auto-compacts at 5000 entries (keeps most recent)
- **Integration:** Wired into `scripts/firefly-generate` and `POST /api/stock-apply`. Future: wire into Google Imagen and Leonardo scripts.

### Adobe MCP (adb-mcp) — Desktop App Control
- **Location:** `tools/adb-mcp/` (cloned from github.com/mikechambers/adb-mcp)
- **Status:** INSTALLED — Proxy server (Node) + MCP servers (Python 3.13 via Homebrew). Claude Desktop config auto-updated.
- **Apps supported:** Photoshop, Premiere Pro, InDesign, AfterEffects, Illustrator
- **Architecture:** MCP Server (Python) <-> Proxy Server (Node ws://localhost:3001) <-> UXP Plugin <-> Adobe App
- **Docs:** `docs/adobe-mcp-integration.md`
- **Pipeline role:** Post-processing generated images (resize, enhance, composite) before Studio assembly

### Integration Architecture (planned)
- Image Browser tab: add Firefly as provider alongside Unsplash/Pexels
- `POST /api/firefly/generate` server endpoint for Studio integration
- `POST /api/veo/generate` for video generation
- Hero video support in build pipeline (post-build step)
- Style reference workflow: anchor image → batch generation with consistent style

## Known Gaps

### Closed (2026-03-23, wave 1a — workflow-critical)
- **spec.json race condition** — replaced all 54 direct read/write sites with `readSpec()`/`writeSpec()` write-through cache. Cache invalidated on site switch.
- **Claude CLI hang** — all 6 `spawnClaude()` callers now have timeouts (5min for builds, 3min for planning/data-model/brainstorm, 2min for summaries/image-prompts). `buildInProgress` flag resets on timeout.
- **Default model** — changed from `claude-sonnet-4-20250514` to `claude-haiku-4-5-20251001` in `loadSettings()` defaults.

### Closed (2026-03-23, earlier)
- auto_summary/auto_version toggles wired to behavior
- Footer partial sync implemented (`syncFooterPartial()`, `syncFooterFromPage()`)
- Head section sync implemented (`syncHeadSection()`)
- Vercel deploy, `.netlifyignore` exclusions, concurrent build guard, SMS providers (Twilio + Vonage)

### Closed (2026-03-23, wave 1b — security hardening)
- **Path traversal** — `isValidPageName()` validator on all page-accepting endpoints; version file path forced through `VERSIONS_DIR()` + `path.basename()`
- **ZIP extraction** — extracts to temp dir first, validates all paths, copies to dist only after validation
- **Command injection** — all `spawn()` calls converted from `bash -c` string interpolation to array-form args; `escapeForShell()` removed
- **SVG sanitizer** — hardened to cover split tags, case variations, all src-like attributes (not just href), CSS expressions, embedded HTML elements (iframe/embed/object/form)
- **@vonage/server-sdk** — added to package.json and installed
- **CSRF protection** — Origin/Referer validation middleware on all POST/PUT/DELETE requests

### Closed (2026-03-23, wave 2 — data integrity)
- **WS message handler** — wrapped in try/catch, sends error to client on unhandled exceptions
- **conversation.jsonl** — rolling window truncation: keeps last 500 messages, trims at 600+
- **Bulk placeholder failures** — each SVG write wrapped in try/catch, failures logged and skipped without orphaning
- **Input validation** — `/api/brief` (max length), `/api/decisions` (valid categories/statuses), `/api/media-specs` (slot_id format, valid roles/statuses), `/api/replace-slot` (slot_id format), `/api/settings` (allowlisted keys only)
- **Schema validation** — `readSpec()` validates array fields, logs warnings on missing core fields, auto-repairs corrupt media_specs/design_decisions

### Closed (2026-03-24 — Studio Hardening)
- **Rebuild regression** — blueprint system (`blueprint.json`) captures sections, components, layout notes per page; injected into build prompts to prevent loss of iterative edits
- **Inline CSS** — `extractSharedCss()` post-processor extracts shared styles to `assets/styles.css`; pages link to external CSS instead of inline `<style>` blocks
- **Brainstorm one-size-fits-all** — profile selector (deep/balanced/concise) in brainstorm banner; adjusts system prompt verbosity
- **Build metrics invisible** — Metrics tab in Studio panel shows build history, averages, type breakdown via `GET /api/build-metrics`
- **Logo placeholder issue** — logo removed from slot system; build prompts explicitly forbid placeholder images for logos

### Closed (2026-03-24 — Stock Photo & Persistence Overhaul)
- **Auto-placeholder generation** — `bulkGeneratePlaceholders()` removed from all 3 automatic call sites (finishParallelBuild, MULTI_UPDATE, HTML_UPDATE). Empty slots stay transparent until explicitly filled.
- **Single-provider stock photos** — replaced with 3-provider fallback chain (Unsplash → Pexels → Pixabay) with per-provider API keys
- **Dead source.unsplash.com fallback** — removed entirely (was returning HTTP 503)
- **No stock photo Settings UI** — added Stock Photos section to Settings modal with 3 API key fields
- **Images lost on rebuild** — slot mapping persistence via `spec.json → slot_mappings` + `reapplySlotMappings()` post-processor + prompt injection into Claude context
- **jq dependency** — `scripts/stock-photo` rewritten to use python3 instead of jq for JSON parsing

### Closed (2026-03-24 — Lifecycle Integrity + Media Intelligence)
- **about-hero not found in media_specs** — single-page edits were guarded by `isFullBuild` that skipped `extractAndRegisterSlots`. Fixed: runs on every page edit.
- **Upload limit 20 with no delete UI** — limit raised to 100 (config-driven via `max_uploads_per_site`). Delete button already existed.
- **Upload thumbnails broken in Studio** — `/assets/uploads/` changed to `/site-assets/uploads/` (routes through studio server's static handler at port 3334).
- **Stock photos generic** — query now includes business name + industry + role.
- **Orphaned slot_mappings** — `reconcileSlotMappings()` removes orphans after every build. `POST /api/rescan` + toolbar button for manual trigger.
- **No stock provider fallback** — `fetchFromProvider('placeholder', ...)` generates styled SVG data URL, always works.
- **No prompt visibility in QSF** — slot detail bar in QSF shows provider badge, credit, query used. "Clear" button resets slot to empty.
- **No provider preview/selection** — QSF Stock now shows 6-thumbnail preview grid with editable query and provider badges before applying.
- **Single-page edits skip slot extraction** — fixed (see above).
- **Slot ID drift across rebuilds** — slot ID stability injection in single-page edit prompts.

### Closed (2026-03-24 — Chat Continuity + CSS Consistency)
- **Stateless chat calls** — each `spawnClaude()` only saw the current user message, no conversation history. Added `loadRecentConversation(15)` which reads last 15 messages from `conversation.jsonl` for the current session, truncates HTML responses to their `CHANGES:` summary via `truncateAssistantMessage()`, and injects as `RECENT CONVERSATION` section into every prompt via `buildPromptContext()`. ~1-2K tokens. Threaded through both `handleChatMessage()` and `parallelBuild()`.
  - Key functions: `loadRecentConversation()`, `truncateAssistantMessage()` in `server.js`
  - Constant: `RECENT_CONVO_COUNT = 15` at top of `server.js`
  - Prompt position: between `${sessionContext}` and `${blueprintContext}`
- **CSS inconsistency across parallel build pages** — fully-parallel build had each page generating CSS independently. Two pages used `header-content` class while `styles.css` only defined `header-container`. Fixed with hybrid build: index.html builds first as CSS/nav seed, then N-1 inner pages launch in parallel with the seed injected.
  - Key code: `parallelBuild()` Phase 1/Phase 2 in `server.js`
  - Seed injection: `CSS SEED` and `NAV SEED` blocks in inner page prompts
- **Missing Tailwind CDN** — no page included `<script src="tailwindcss">` despite using Tailwind utility classes everywhere. Added `HEAD REQUIREMENTS (CRITICAL)` to `sharedRules` prompt + `ensureHeadDependencies()` post-processor as safety net.
  - Key function: `ensureHeadDependencies()` in `server.js`
  - Pipeline position: runs before `syncHeadSection()` and `extractSharedCss()`

### Closed (2026-03-25 — Unified System Overhaul, 5 Waves)

**Wave 1 — Critical Bugs:**
- **API key exposure** — `GET /api/settings` returned full API keys unauthenticated. Fixed: `safeSettings()` redacts secrets, replaces with `key_configured: true/false`. Functions: `safeSettings()` in `server.js`.
- **Arbitrary spec overwrite** — `update-spec` WS message accepted any field. Fixed: whitelist (`design_brief`, `design_decisions`, `site_name`, `business_type`). Rejects non-whitelisted fields with console warning.
- **Multi-page fallback skipped post-processing** — when multi-page parsing failed, HTML was written directly. Fixed: fallback path now calls `runPostProcessing(ws, ['index.html'], { sourcePage: 'index.html' })`.
- **Parallel build timeout race condition** — timeout handler AND close handler both incremented `innerCompleted`. Fixed: timeout sets `timedOutPages.add(page)` + kills process; close handler handles completion. No double-increment.
- **Post-processing ordering** — `reapplySlotMappings` ran before `extractAndRegisterSlots` so renamed slots lost images. Fixed: extract first, then reapply.
- **Single-page edit missing head deps** — `ensureHeadDependencies(ws)` only ran on full builds. Fixed: now runs on single-page edits too.
- **Client `chat` WS type dropped** — server sent `{type:'chat'}` but client had no handler. Fixed: added `case 'chat':` in `index.html`.
- **gemini-cli stdin consumed twice** — bash `$(cat)` consumed stdin, Python got empty. Fixed: `printf '%s' "$PROMPT" |` pipes prompt to Python.
- **precommit-security unclosed quote** — security grep silently bypassed. Fixed: closed single quote before pipe.

**Wave 2 — Pipeline Integrity:**
- **syncHeadSection 80-char fingerprint** — style blocks matched by first 80 chars, missed content-only updates. Fixed: MD5 hash of full content. Function: `syncHeadSection()` now uses `crypto.createHash('md5')`.
- **extractSharedCss stripped page-specific styles** — was removing ALL non-data-page styles. Fixed: builds a set of extracted style content, only removes matching blocks. Function: `extractSharedCss()`.
- **Single-page vs full-build pipeline divergence** — unified: both run `extractAndRegisterSlots` → `reapplySlotMappings` → metadata → reconcile → logo. Single-page adds `ensureHeadDependencies`.

**Wave 3 — Prompt & Classifier:**
- **summarizeHtml was a no-op** — appended full HTML after summary. Fixed: returns summary only (sections, headings, slot IDs, line count).
- **Dead restyle case** — `handleChatMessage` had unreachable `restyle` case (routed upstream). Removed.
- **Auto-page-switch missed "the about page"** — only matched `about.html`. Fixed: added second regex for `\b(\w+)\s+page\b` pattern.
- **Classifier false positives** — "history" alone triggered `version_history`, "restore" alone triggered `rollback`. Fixed: `version_history` requires "version" anchor; `rollback` requires version context near "restore".
- **Brainstorm exit patterns narrow** — missed "do it", "ship it", "ok let's go". Fixed: widened regex with 8 new patterns.
- **Design decisions truncated to 5** — only last 5 approved decisions in prompts. Fixed: all approved decisions included with 2000-char cap.

**Wave 4 — State Architecture:**
- **buildPromptContext mutated currentPage** — hidden side effect in what looked like a pure reader. Fixed: returns `resolvedPage`, caller updates `currentPage` explicitly.
- **Multi-tab session reset** — every WS connection called `startSession()`. Fixed: `activeClientCount` tracks connections, only first starts session.
- **buildInProgress deadlock** — two new deadlock paths (ws disconnect mid-build, spawnClaude ENOENT). Fixed: `buildInProgress = false` in `ws.on('close')` and `child.on('error')`.

**Wave 5 — Data Model & Tests:**
- **Blueprint extracted Tailwind classes** — "py-16" as section names. Fixed: `isTailwindClass()` filter, prefers `id` attribute, falls back to semantic class.
- **Schema misaligned** — 7 runtime fields missing from `site-spec.schema.json`. Fixed: added `created_at`, `netlify_site_id`, `deploy_provider`, `brand_health`, `media_specs`, `slot_mappings`, `tech_recommendations`.
- **Template font URL encoding** — multi-word fonts like "Playfair Display" broke Google Fonts URLs. Fixed: `{{HEADING_FONT_URL}}`/`{{BODY_FONT_URL}}` with `+` encoding in `scripts/site-template` and all 4 template files.
- **Test coverage gaps** — 41 → 52 tests. Added: `truncateAssistantMessage` (5 cases), `classifyRequest` edge cases (4 cases), `ensureHeadDependencies` (1 case). Exports added: `truncateAssistantMessage`, `loadRecentConversation`.

### Closed (2026-03-31, Wave A–D — integration test fixes)

Surfaced by two-phase integration test suite (28 functional + 30 extreme). All 5 gaps fixed in one session.

- **`currentMode` persists across WS reconnects (F01, F03)** — Module-level `currentMode` in `server.js` survived client disconnect, so the next connection inherited brainstorm mode. Fix (Wave A): `currentMode = 'build'` reset at the top of `wss.on('connection')`. File: `server.js:~6281`.

- **`page_switch` intent silently no-ops in brainstorm mode (F03)** — Brainstorm routing bypassed the classifier entirely, so "go to the about page" routed to `handleBrainstorm()` instead of the page-switch handler. Fix (Wave A): before falling through to `handleBrainstorm()`, check `classifyRequest(userMessage, spec) === 'page_switch'` and fall through to normal routing if matched. File: `server.js:~6471`.

- **No input length cap on WS chat messages (E01–E05, E16, E25, E30)** — Messages of any size were accepted, injected into Claude's prompt, and caused server unresponsiveness. Fix (Wave B): guard added at the top of `msg.type === 'chat'` handler — rejects with `{ type: 'error' }` if input exceeds 10,000 chars. File: `server.js:~6359`.

- **Zombie Claude subprocesses on WS disconnect (E01–E11, E16, E25, E30)** — `ws.on('close')` released `buildInProgress` but never killed the running Claude child. Fix (Wave C): all 5 WS-routed `spawnClaude` call sites now store child refs on `ws.currentChild` (single child) or `ws.activeChildren[]` (parallel page builds). `ws.on('close')` kills all active children before releasing the lock. Files: `server.js` — `handleDataModelPlanning:~4016`, `handlePlanning:~4134`, `handleBrainstorm:~4265`, `parallelBuild/spawnPage:~4479`, `parallelBuild/templateChild:~4548`, `handleChatMessage:~6001` (+ Haiku reassignment at ~6024), `onChildClose:~6092`, `ws.on('close'):~6332`.

- **`MaxListenersExceededWarning` in flood tests (E12)** — 20 concurrent `sendChat` calls in the test added 20 `ws.on('message', handler)` listeners, exceeding Node.js's default of 10. Fix (Wave D): `ws.setMaxListeners(0)` added to `utils.connect()` so flood tests don't emit spurious warnings. File: `tests/integration/utils.js:~13`.

### Open (identified 2026-04-03 — Playwright autonomous build)

Gaps surfaced by running a full site build autonomously via Playwright against Studio GUI. Test site: Guy's Classy Shoes. Script: `tests/automation/guys-classy-shoes-build.js`. Log: `tests/automation/logs/`.

- **Multi-page build produces single page** — Brief requested 4 pages (Home, Collections, About, Contact) but `new_site` handler only generated `index.html`. The multi-page parallel build path did not fire. The brief's `must_have_sections` populated correctly but pages array stayed at `["home"]`. Root cause: the `new_site` classifier path writes the spec then calls `handleChatMessage` which builds a single-page response. Multi-page builds only trigger when the spec already has multiple pages. Need: spec should be updated with all requested pages before the build call.

- **Stock photo targeted searches misclassified as `layout_update`** — "Search for luxury men's leather oxford shoes for the hero image" classified as `layout_update` instead of `fill_stock_photos` or a targeted image search. This caused the AI to regenerate page content instead of searching for and applying a stock photo. The `fill_stock_photos` classifier only fires on broad fill requests, not targeted image searches.

- **"Run verification" misclassified as `layout_update`** — "Run verification" triggered a build plan instead of running the verification pipeline. The `verification` classifier intent may require specific phrasing.

- **Plan approval gate blocks automation** — Post-brief edits (steps 6a-6d) all triggered the plan approval UI (`build-plan` card with "Looks good, build it" / "Cancel" buttons). The Playwright script detected completion via DOM chat messages, but these were plan proposals, not build completions. The script's 244s durations suggest the plan auto-approved after timeout. Automation needs either: (a) a way to auto-approve plans, or (b) a `POST /api/chat` endpoint that bypasses the plan gate.

- **WS messages are per-client, not broadcast** — `server.js` uses `ws.send()` (unicast to the originating client), not broadcast. A standalone WS client cannot observe responses to a browser client's messages. This makes WS-based monitoring impossible without injecting into the page's own WS connection. Automation must use DOM-based detection.

- **No programmatic build API** — All builds require a browser WS connection. No `POST /api/chat` REST endpoint exists. This was documented in cerebrum.md but confirmed as a real blocker for CI/CD automation.

- **Verification indicator stuck at "Not Reviewed Yet"** — After explicitly requesting verification, the `#verify-label` DOM element still showed "Not Reviewed Yet". The verification pipeline may not have executed (misclassified as layout_update).

### Open (identified 2026-03-24)
- **Asset generate → insert disconnected** — SVG generation doesn't wire back to replace placeholders in HTML (deferred to focused session)
- **Brainstorm recommendation chips** — cherry-picking individual suggestions deferred; "Build This" sends full context
- **Blueprint merge on multi-page edits** — blueprint auto-extract works per-page but doesn't track cross-page component relationships (e.g. shared modal used on multiple pages)

### Open (identified 2026-03-23 gap analysis)

### Closed (2026-03-23, wave 3 — UX & accessibility)
- **WS reconnect** — exponential backoff (2s → 4s → 8s → 30s cap) + red disconnect banner
- **Chat submit** — shows error message when WS disconnected instead of silently failing
- **Graceful shutdown** — server closes all WS connections on SIGTERM/SIGINT
- **Modals** — `setupModal()` utility: Esc to close, backdrop click to close, `role="dialog"` + `aria-modal`, auto-focus first interactive element
- **Mobile responsive** — `@media (max-width: 1024px)` stacks chat/preview/studio vertically; `@media (max-width: 640px)` wraps header buttons
- **ARIA labels** — added to Upload, Settings, and Refresh buttons
- **Color contrast** — `.msg-status` changed from `#94a3b8` to `#cbd5e1` (passes WCAG AA on dark bg)
- **beforeunload** — warns before closing tab when `hasUnsavedWork` is true (set on send, cleared on preview reload)
- **Studio refresh** — debounced with 300ms timer
- **Upload validation** — frontend checks 5MB limit before upload, shows error for oversized files
- **jq pre-check** — `scripts/site-deploy` checks for `jq` before executing. `scripts/stock-photo` no longer needs jq (rewritten to use python3)

**Note:** Keyboard shortcuts (Cmd+Enter) already existed — Enter submits, Shift+Enter for newline (index.html line 672).

### Gap Analysis — All Waves Complete (2026-03-23)

**Testing (Wave 4) — CLOSED (2026-03-23):**
- Added `vitest` (v4.1.1) as dev dependency with ESM config (`vitest.config.js`)
- Created `tests/unit.test.js` — 41 unit tests across 6 function suites:
  - `isValidPageName` (4 tests), `sanitizeSvg` (9 tests), `extractSlotsFromPage` (4 tests),
    `classifyRequest` (15 tests), `extractBrandColors` (3 tests), `labelToFilename` (5 tests)
- Added `module.exports` + `require.main === module` guard to `server.js` for testability
- All 41 tests passing
- Smoke tests and integration tests remain as future work

**Feature Polish (Wave 5) — CLOSED (2026-03-23):**
- **Responsive preview toggle** — Mobile (375px), Tablet (768px), Desktop (full) device buttons in preview toolbar with SVG icons
- **Form handling** — Build prompt now includes Netlify Forms template with honeypot spam protection; forms work on Netlify deploy without backend
- **SEO/structured data validator** — Brand Health now checks: meta description, canonical URL, Schema.org JSON-LD, viewport, title, lang attr, alt text on images; generates actionable suggestions for each
- **CSS custom properties** — Build prompt requires `:root { --color-primary; --color-accent; --color-bg; }` from spec colors; enables one-place theming across all pages
- **Analytics integration** — Settings support `analytics_provider` (ga4/plausible) + `analytics_id`; when configured, snippet auto-injected into build prompt for every page
- **Session summary timing** — `generateSessionSummary()` now returns a Promise; `endSession()` awaits completion before WS close; client gets "Generating session summary..." status notification

**Previously closed (pre-gap-analysis):**
- Vercel deploy implemented in `scripts/site-deploy`
- Concurrent build guard added (`buildInProgress` mutex in `handleChatMessage()`)
- `.netlifyignore` expanded to exclude `_partials/`, `.versions/`, `.studio.json`, `conversation.jsonl`
- SMS providers wired: email_gateway, Twilio, and Vonage all functional server-side

---

## Architecture Decisions

### Site Builder (2026-03-10)
- No new repo — Hub already has the wiring
- HTML + Tailwind CDN, zero build step
- Chat UI: Node.js Express + WebSocket in `site-studio/`
- SVG-first assets (no GPU), Claude generates, Inkscape refines
- Netlify hosting (already installed), GoDaddy reseller for domains
- JSONL conversation state per site

### Claude CLI Integration (2026-03-12)
- Replaced all Anthropic Python SDK calls with `claude --print`
- No API key needed — uses existing Claude Code subscription
- `--tools ""` disables tool use (raw text output only)
- `unset CLAUDECODE` prevents nested-session guard
- Fallbacks preserved: template HTML and fallback SVGs still work without Claude

### Slot-Based Image System (2026-03-23)
- Every `<img>` carries `data-slot-id`, `data-slot-status`, `data-slot-role` — identity survives HTML regeneration
- `media_specs` in spec.json replaces heuristic HTML scanning as the source of truth for image state
- Status lifecycle: `empty` → `stock` → `uploaded` → `final`
- Stock photo fill uses Unsplash API when key is configured, falls back to SVG placeholders when offline
- Upload replacement targets by slot ID, not by src string matching

### Site Blueprint System (2026-03-24)
- `blueprint.json` per site is the authoritative "current state" of what sections, components, and layout rules exist per page
- Auto-extracted from HTML after every build via `updateBlueprint(writtenPages)` — parses `<section>` tags, popup/modal/overlay classes
- Injected into build prompts via `buildBlueprintContext(page)` — tells Claude exactly what must be preserved
- Editable from Studio UI (Blueprint tab) via `POST /api/blueprint` — user can add layout notes and sections manually
- Brainstorm-to-build flow writes accepted ideas as blueprint entries before triggering the build
- Prevents the #1 regression bug: iterative chat edits (popups, sliders, layout tweaks) lost on rebuild

### External CSS Extraction (2026-03-24)
- `extractSharedCss(ws)` post-processor runs after every build
- Extracts shared `<style>` blocks from all pages into `assets/styles.css`
- Page-specific styles marked with `<style data-page="true">` are left inline
- All pages get `<link rel="stylesheet" href="assets/styles.css">` injected
- Tailwind CDN `<script>` tag is runtime, not CSS — never extracted
- `syncHeadSection()` updated to also sync the CSS `<link>` tag across pages

### Brainstorm Chat Profiles (2026-03-24)
- `brainstorm_profile` setting in `studio-config.json`: `"deep"`, `"balanced"` (default), `"concise"`
- Profile changes the system prompt style in `handleBrainstorm()`
- Selectable from the brainstorm banner dropdown in Studio UI
- Persists via settings API (`PUT /api/settings`)

### Build Metrics Dashboard (2026-03-24)
- `GET /api/build-metrics` serves `build-metrics.jsonl` as JSON array
- Studio "Metrics" tab shows: total builds, avg time, pages built, by-type breakdown, recent history
- Data was already being captured; this just makes it visible

### Logo Rule Update (2026-03-24)
- Logo removed from `data-slot-role` allowed values in both build prompts
- Added explicit rules: never placeholder for logo, never create image slot for logo
- Logos handled via upload, generation, or styled text only

### Why these choices
- HTML+Tailwind over React: no build step = instant deploy, AI generates it cleanly
- Node.js over Python for chat UI: JS end-to-end for the web layer
- SVG over raster: works without GPU, Claude generates good SVGs
- Claude CLI over API: eliminates API key management, uses existing subscription
- Slot IDs over filename matching: stable identity that survives prompt regeneration, HTML edits, and file renames

---

## Strategic Direction

> **Superseded (2026-03-30).** The old "Recommendations" list has been replaced by a 7-tier roadmap in `FAMTASTIC-STATE.md → What's Next` and a north star vision document at `FAMTASTIC-VISION.md`. The vision document captures the empire model (portfolio → platform → SaaS), scaling milestones (10/50/100/500/1,000 products), revenue path strategy, continuous intelligence loop, and innovation mandate. All tactical priorities now align to that vision.

**Key documents:**
- `FAMTASTIC-VISION.md` — strategic north star (what FAMtastic is becoming)
- `FAMTASTIC-STATE.md` — technical snapshot (what FAMtastic currently is), with 7-tier "What's Next" roadmap
- `FAMtastic-Web-Context.md` — full context document for Claude Web sessions

**Legacy recommendations status:**
1. ~~Get to first deployed client site.~~ Done (2026-03-20).
2. ~~Delete dead code.~~ Done (2026-03-12).
3. ~~Consolidate repos.~~ Done (2026-03-12). 4 → 1.
4. Build client-facing access → superseded by Tier 1 (Revenue Path) in the new roadmap.
5. Add basic tests → now Tier 3 (Factory Quality). 56 unit tests exist.
6. Platform dashboard → now Tier 2 (Portfolio Management, needed at 10 sites).

---

## Key File Reference

### Server & UI
- `site-studio/server.js` — main backend. Express + WebSocket server. Classifier, prompt builder, post-build pipeline, all API endpoints.
- `site-studio/public/index.html` — single-file frontend. Chat panel, preview iframe, Studio sidebar, settings modal, upload modal with slot dropdown.

### Scripts
- `scripts/site-deploy` — deploy to Netlify or Cloudflare. Handles site ID resolution, stdout/stderr separation, spec.json update.
- `scripts/stock-photo` — download stock photo from Unsplash. Requires `curl` and `jq`.
- `scripts/site-chat` — launches Studio (server.js + preview) and opens browser.
- `scripts/site-preview` — standalone preview server (superseded by built-in preview in server.js).
- `scripts/asset-generate` — generates SVG assets via Claude CLI.

### Config
- `~/.config/famtastic/studio-config.json` — model, deploy target/team, email/SMS credentials, upload limits, stock photo API key.
- `schemas/studio.schema.json` — JSON Schema for `.studio.json` (session persistence).

### Per-Site Files
- `sites/<tag>/spec.json` — site specification. Contains `design_brief`, `design_decisions`, `media_specs`, `uploaded_assets`, `deployed_url`, `netlify_site_id`, `data_model`.
- `sites/<tag>/.studio.json` — studio session state. Current page, session history, version metadata.
- `sites/<tag>/conversation.jsonl` — chat history. One JSON object per line with `role`, `content`, `at`, `session_id`.
- `sites/<tag>/summaries/session-NNN.md` — AI-generated session summaries.
- `sites/<tag>/dist/` — built site files.
- `sites/<tag>/dist/.versions/<page>/<timestamp>.html` — version snapshots.
- `sites/<tag>/dist/_partials/_nav.html` — canonical nav element.
- `sites/<tag>/dist/.netlifyignore` — deploy exclusions (currently only `_partials/`).
- `sites/<tag>/dist/assets/uploads/` — user-uploaded files.
- `sites/<tag>/dist/assets/stock/` — Unsplash stock photos, named `{slot-id}.jpg`.
- `sites/<tag>/dist/assets/placeholders/` — generated SVG placeholders.
- `sites/<tag>/dist/assets/styles.css` — extracted shared CSS (`:root` vars, component styles). Generated by `extractSharedCss()` post-processor.
- `sites/<tag>/blueprint.json` — authoritative per-page blueprint. Sections, components, layout notes. Prevents rebuild regression.
- `sites/<tag>/build-metrics.jsonl` — one JSON object per build: timestamp, type, elapsed_seconds, pages_built, model.
- `sites/<tag>/.netlify/state.json` — Netlify site ID for deploy continuity.

### MCP
- `mcp-server/server.js` — MCP server exposing site state as resources. Protocol: stdio JSON-RPC.
- `.mcp.json` — project-level MCP config for auto-discovery by Claude Code/Desktop.

### Skills
- `.claude/skills/site-studio.md` — `/site-studio` slash command
- `.claude/skills/brainstorm.md` — `/brainstorm` slash command
- `.claude/skills/export-site.md` — `/export-site` slash command

---

## Lessons Learned

- Dev-Setup repo is superseded — absorbed into `famtastic`
- `orchestrator-resume` was the reference pattern for `orchestrator-site` (same step-by-step approach)
- `cj-ingest` already has site-* auto-trigger wiring — existing infrastructure supports the pipeline
- Template-based builds are fast but skip asset generation
- `claude --print` is a drop-in replacement for Anthropic Python SDK calls
- Markdown code fences in Claude output need stripping (sed '/^```/d') for HTML and SVG
- The core product problem is not rendering quality — it's the **request lifecycle** (context loss, weak intent capture, poor visibility)
- Intent-based request classification prevents destructive accidental rebuilds
- Design brief as a formal artifact prevents cookie-cutter output across turns
- Design decisions log (memory spine) prevents stylistic amnesia between generations
- `claude --print` is text-only — cannot pass images for vision. Uploaded image descriptions must come from the user at upload time.
- SVG uploads must be sanitized (strip `<script>`, `on*`, `javascript:`, `<foreignObject>`) before serving
- `site-chat` creates fallback HTML via `--skip-ai` on startup — classifier must check for brief existence, not HTML existence, to trigger `new_site`
- `claude --print` with Sonnet models silently returns empty (exit 0, 1 byte) when an active Claude Code session is competing for subscription capacity. Haiku uses a separate rate tier and works concurrently.
- `echo "$PROMPT"` in bash corrupts prompts containing `\n`, `\t`, backticks, `$`. Use `printf '%s' "$PROMPT"` for verbatim output.
- `spec.pages` vs `design_brief.must_have_sections`: Studio-created sites store sections in the brief, not in `spec.pages`. Build logic must fall back to `must_have_sections` to generate multi-page sites.
- Granular build progress is achievable by scanning accumulated stream output for `--- PAGE:` delimiters as chunks arrive — no need to break into multiple Claude calls.
- Email-to-SMS carrier gateways (e.g. `{number}@tmomail.net`) are unreliable — T-Mobile blocks them via AUP. Use native `sms:` URI scheme on macOS instead.
- Deploy scripts must separate stdout (URL only) from stderr (status messages). Capturing both with `$(command)` corrupts structured data stored in spec.json.
- Nav consistency across multi-page sites requires a partial injection system — Claude generates each page independently and navs will diverge without post-build sync.
- Image slot identity must be attached to the HTML element, not the filename. Filename/src matching breaks on every regeneration. Data attributes survive.

## Learnings Log

### known-gaps-closed -- 2026-03-23

Closed all 7 documented gaps in a single wave: (1) `auto_version` toggle wired into `versionFile()` — checks `loadSettings().auto_version` before snapshotting. (2) `auto_summary` toggle wired into `endSession()` — checks `loadSettings().auto_summary` before generating session summaries. (3) Footer partial sync — `syncFooterPartial()` and `syncFooterFromPage()` mirror the nav partial pattern. (4) Head section sync — `syncHeadSection()` propagates Tailwind CDN, Google Fonts, custom styles, and icon CDNs. (5) Vercel deploy — `deploy_vercel()` added to `scripts/site-deploy`. (6) `.netlifyignore` expanded to exclude `.versions/`, `.studio.json`, `conversation.jsonl`. (7) Concurrent build guard — `buildInProgress` flag prevents parallel `spawnClaude()` calls. (8) SMS providers — Vonage path added alongside existing Twilio path in `POST /api/share`.

### slot-based-image-system -- 2026-03-23

Replaced the heuristic-based image detection system with a slot-based identity system. Every `<img>` generated by Claude now carries `data-slot-id`, `data-slot-status`, and `data-slot-role` attributes. `media_specs` in spec.json stores the canonical slot registry. Stock photo fill via Unsplash API (or SVG fallback) fills empty slots. Upload modal targets slots by ID instead of matching by src string. Brand Health reads from `media_specs` instead of scanning HTML for placeholder patterns.

Key functions: `extractSlotsFromPage()`, `extractAndRegisterSlots()`, `SLOT_DIMENSIONS` constant. New endpoints: `POST /api/stock-photo`, `POST /api/replace-slot`. New classifier intent: `fill_stock_photos`. New script: `scripts/stock-photo`.

### share-nav-settings -- 2026-03-20

Added share functionality (Email via Gmail SMTP, Text via `sms:` URI, Copy Link). Nav partial system (`_partials/_nav.html`) for cross-page nav consistency. Settings modal expanded with email/SMS provider dropdowns. Deploy script fixed: stderr/stdout separation, `.netlify/state.json` fallback from `spec.json`.

Key files: `POST /api/share` in `server.js`, `syncNavPartial()` / `syncNavFromPage()` in `server.js`, Settings modal in `index.html`, `scripts/site-deploy`.

### first-deploy -- 2026-03-20

First site deployed end-to-end through the Studio pipeline: "The Best Lawn Care" — 7-page multi-page site with hero carousel, uploaded images, design brief, and design decisions tracking. Deployed via `netlify deploy --prod` to https://the-best-lawn-care.netlify.app. Netlify CLI was already installed and authenticated. `netlify sites:create --name <name> --account-slug fritz-medine` creates sites non-interactively (interactive prompts hang in non-TTY contexts).

### build-pipeline-fixes -- 2026-03-20

Three build-breaking issues found and fixed:

1. **`claude --print` silent failure with Sonnet**: When an active Claude Code session is running, `claude --print --model claude-sonnet-4-20250514` returns empty (exit 0, response length 1) for prompts requesting large output. Root cause: subscription-level concurrency/rate limiting. Haiku works concurrently because it uses a separate rate tier. Fix: default Studio to `claude-haiku-4-5-20251001`. Users can switch to Sonnet via Settings when not running Claude Code.

2. **`echo` corrupts prompts in `claude-cli`**: `echo "$PROMPT"` interprets escape sequences (`\n`, `\t`, `\\`) embedded in HTML/JSON prompts. Fix: `printf '%s' "$PROMPT"` for verbatim output. The `$(cat)` stdin-to-variable pattern is still needed — direct stdin passthrough to `claude` deadlocks on large payloads.

3. **Single-page builds despite multi-section brief**: `specPages` fell back to `['home']` ignoring `design_brief.must_have_sections`. Fix: `spec.pages || spec.design_brief?.must_have_sections || ['home']`.

Also added: granular build progress (stream-based page detection, per-file write status, post-processing steps), enhanced error logging with stderr capture.

### site-validate-test -- 2026-03-11

Template-based builds are fast but skip asset generation

### claude-cli-integration -- 2026-03-12

`claude --print --model <model> --tools ""` replaces all Anthropic Python SDK calls. No API key needed. Must `unset CLAUDECODE` to avoid nested-session guard. Must strip markdown fences from output.

### wave-6-studio-panel-ux -- 2026-03-19

Studio panel UX overhaul — made the right sidebar interactive instead of read-only:

**Wave 1: Editable Brief + Decisions**
- `PUT /api/brief` merges partial fields into spec.json, broadcasts `spec-updated` via WebSocket
- `PUT /api/decisions` — full CRUD (add/update/delete) on design_decisions array
- Brief section: pencil edit button, inline form pre-filled from current values, Save/Fill via Chat/Cancel
- Decisions section: hover-to-reveal edit/delete per decision, "Add" button with category dropdown + inline form
- `brief_edit` classifier intent: "edit brief", "update brief", "change the goal" → routes to planning flow with existing brief

**Wave 2: Session Picker**
- `GET /api/sessions` returns enriched session list with summary previews from session-NNN.md files
- `POST /api/sessions/load` filters conversation.jsonl by session timestamp range or session_id tag
- `startSession()` now writes `session_id` to each session entry
- `appendConvo()` tags every message with current `session_id` for reliable filtering
- Sessions section: scrollable list with date/count/preview, Load button, CURRENT badge, blue banner when viewing old session

**Wave 3: Brand Health + Media Specs + AI Prompt Export**
- `scanBrandHealth()` reads from `media_specs` for image slot status; scans HTML only for font icons and social meta
- `GET /api/brand-health` returns slot summary, key slot status, set aggregates, suggestions
- `PUT /api/media-specs` — CRUD for media slot definitions (`slot_id`, `role`, `dimensions`, `status`, `page`)
- `POST /api/generate-image-prompt` calls Claude to generate tailored Midjourney/DALL-E prompts using brief context (tone, colors, audience)
- Brand Health section: slot summary bar, per-slot status indicators, action buttons (Upload/AI Prompt) for empty/stock slots
- `brand_health` classifier intent: "check brand", "what's missing", "asset checklist"

Key pattern: the Studio panel is no longer a passive display — every section has inline CRUD. Brief edits go through the API (not chat), decisions are managed directly, sessions can be loaded and reviewed, brand gaps are surfaced with one-click actions.

**Addendum: Slot Extraction + Project Management**
- `extractAndRegisterSlots(pages)` scans generated HTML for `data-slot-id` attributes and registers them in `media_specs`. Runs after every HTML_UPDATE and MULTI_UPDATE. Replaces the old `autoDetectMediaSpecs()` heuristic approach (kept as legacy fallback).
- Path constants (`SITE_DIR`, `DIST_DIR`, `SPEC_FILE`, etc.) refactored from `const` to getter functions — required for runtime site switching.
- `GET /api/projects` lists all sites with name, state, page count, deployed URL, brief status, current indicator.
- `POST /api/switch-site` ends current session, switches TAG + derived paths, starts new session, broadcasts to all WS clients.
- `POST /api/new-site` creates minimal site structure (spec.json + dist dir), auto-switches to it.
- Header tag badge is now a project picker dropdown — shows all sites, highlights active, one-click switch, inline "create new project" form.
- `site-switched` WebSocket message clears chat, reloads history for new site, refreshes all panels.
- **Critical fix:** `escapeForShell()` + `echo` broke on large prompts with quotes/newlines. Replaced with `spawnClaude()` that pipes via `child.stdin.write()` — never touches shell interpolation.
- **Critical fix:** Preview server was a separate process hardcoded to one site's dist. Replaced with built-in `previewServer` in server.js that reads from `DIST_DIR()` dynamically. Shows placeholder for new sites with no HTML. Includes live-reload polling. `site-chat` no longer launches separate preview.

### wave-5-mcp-data-model -- 2026-03-19

Added MCP server for cross-platform context sharing and data model planning:
1. **MCP server** — `mcp-server/server.js` (343 lines). Exposes site project state as MCP resources (`famtastic://sites`, `famtastic://sites/{tag}`, `famtastic://sites/{tag}/brief`, etc.). 4 tools: `list_sites`, `get_site_state`, `get_session_summary`, `suggest_tech_stack`. Protocol: stdio JSON-RPC.
2. **`.mcp.json`** — project-level MCP config so Claude Code auto-discovers the server.
3. **Data model planning** — `data_model` classifier intent detects "database", "data model", "entities", "CMS", "e-commerce". `handleDataModelPlanning()` sends to Claude with structured DATA_MODEL output format. Stores result in spec.json under `data_model`. Covers needs_database, suggested_stack, entities with fields/relationships, mock_approach, migration_path.
4. **Concept-first approach** — data model output includes mock_approach (how to represent with static HTML) and migration_path (how to move to real DB later). No actual database setup yet.

For Claude Desktop integration: add the MCP server config to `~/Library/Application Support/Claude/claude_desktop_config.json` manually.

### wave-4-plugins-configuration -- 2026-03-19

Added custom Claude Code skills and Studio configuration page:
1. **Custom skills** — 3 project-level skills in `.claude/skills/`: `site-studio` (launch studio), `brainstorm` (terminal ideation), `export-site` (standalone export). Invocable via `/site-studio`, `/brainstorm`, `/export-site` in Claude Code.
2. **Settings page** — gear icon in header opens modal with model selector, deploy target/team, upload limits, version limits, auto-summary/auto-version toggles.
3. **Settings API** — `GET/PUT /api/settings` backed by `~/.config/famtastic/studio-config.json`.
4. **Configurable model** — all Claude CLI calls now read from settings instead of hardcoded model. Change model in UI, takes effect next generation.

### wave-3-professional-tooling -- 2026-03-19

Added export/import, template import, and tech stack suggestions:
1. **Export** — `fam-hub site export <tag> <path>` creates standalone project with package.json (npx serve), README, all dist files + summaries.
2. **Import** — `fam-hub site import <path> [tag]` analyzes HTML, extracts `<title>`, creates skeleton spec.json with state "imported", copies files into `sites/<tag>/dist/`. Opens in Studio for refinement.
3. **Template import** — upload .html or .zip files with "Template" role via drag-drop/file picker. HTML becomes index.html (versioned first). ZIP extracted into dist/.
4. **Tech stack analysis** — `analyzeTechStack()` runs during planning. Detects dynamic (e-commerce/booking → custom app), CMS (blog/news → headless CMS), or static (→ HTML+Tailwind). Recommends hosting and form backends. Results shown in brief card UI and stored in spec.json.
5. **Classifier additions** — `tech_advice` intent ("what tech should I use"), `template_import` intent ("import this template").

### wave-2-brainstorm-versioning -- 2026-03-19

Added brainstorm mode and site versioning to Studio:
1. **Brainstorm mode** — classifier detects "brainstorm"/"let's think"/"explore ideas", routes to Claude with no-HTML-output constraint. Cross-session context injected via session summaries.
2. **Terminal brainstorm** — `fam-hub site brainstorm <tag>` runs interactive brainstorm loop from the terminal with conversation context, auto-summary on exit.
3. **Session summaries** — auto-generated via Claude when sessions end (3+ messages). Stored in `sites/<tag>/summaries/session-NNN.md`. Last 2-3 injected into every prompt context for continuity.
4. **Site versioning** — every HTML write snapshots to `dist/.versions/<page>/<timestamp>.html`. Metadata in `.studio.json`. Auto-prunes at 50 versions.
5. **Rollback** — chat ("rollback", "undo", "revert") or Studio panel button. Saves current state as "pre-rollback" before restoring.
6. **Version history** — viewable in chat ("show history") or Studio panel. `/api/versions` and `/api/rollback` endpoints.

Key pattern: version-before-write. Every `fs.writeFileSync` for HTML is preceded by `versionFile()` call.

### wave-1-multipage-persistence -- 2026-03-19

Multi-page site generation and project persistence:
1. **Multi-page builds** — MULTI_UPDATE response format with `--- PAGE: filename.html ---` delimiters. Page-by-page Claude calls, shared nav/footer.
2. **Page tabs** — preview panel shows page tabs when multiple pages exist. Click to switch, or chat "switch to about page".
3. **Project persistence** — `.studio.json` tracks current page, session count, timestamps. Studio resumes where it left off.
4. **Page switch classifier** — `page_switch` intent routes to direct page change without Claude call.

### studio-workflow-overhaul -- 2026-03-13

Rewrote `site-studio/server.js` and `public/index.html` to implement a 4-phase studio workflow:
1. **Quality backbone** — request classifier (21 intent types with precedence), planning mode (design brief artifact stored in spec.json), design decisions log (memory spine), curated prompt builder with anti-cookie-cutter rules
2. **Visibility** — step log with real timing (replaces typing indicator), studio state panel (brief, decisions, files, uploads)
3. **External references** — image upload via multer (drag-drop, paste, file picker), SVG sanitization, role-based metadata (content/inspiration/brand_asset/layout_ref/style_ref), 5MB/20-file limits
4. **Iteration intelligence** — post-generation change summaries (CHANGES: parsing), revision-mode prompt strategies per request type

Schema updated: `design_brief`, `design_decisions`, `uploaded_assets` added to site-spec.schema.json.

Key architectural rules (Rules of State): intent precedence, override behavior, decision logging discipline, planning skip conditions, graceful degradation on missing context, classifier confidence defaults, decision log pruning, SVG upload safety.

---

## Developer Environment & Claude Code Tooling (2026-03-24)

### Claude Code Plugins

Installed via `/plugin` CLI (interactive terminal command, cannot be invoked programmatically):

**Marketplaces added:**
- `claude-plugins-official` → `github.com/anthropics/claude-plugins-official` (official Anthropic-curated directory)
- `paddo-tools` → `github.com/paddo/claude-tools` (community)

**Plugins installed:**
- `frontend-design@claude-plugins-official` — UI/frontend design guidance
- `feature-dev@claude-plugins-official` — feature development workflow
- `code-review@claude-plugins-official` — code review patterns
- `commit-commands@claude-plugins-official` — git commit workflow
- `security-guidance@claude-plugins-official` — security best practices
- `github@claude-plugins-official` — GitHub integration via MCP (requires `GITHUB_PERSONAL_ACCESS_TOKEN`)
- `agent-sdk-dev@claude-plugins-official` — Claude Agent SDK development
- `playwright@claude-plugins-official` — browser automation (requires `npx playwright install`)
- `gemini-tools@paddo-tools` — Gemini visual analysis via `/gemini` command (requires `GEMINI_API_KEY` + `gemini-cli`)

**Not found in any marketplace (skip these):** `netlify`, `autofix-bot`, `aikido`, `sentry`

**Plugin storage:** `~/.claude/settings.json` → `enabledPlugins` map + `extraKnownMarketplaces` map. Plugins activate on session start — restart required after install.

### Credentials in ~/.claude/settings.json

```json
"env": {
  "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1",
  "GITHUB_PERSONAL_ACCESS_TOKEN": "<set>",
  "GEMINI_API_KEY": "<set>"
}
```

### Agent Teams (Experimental)

`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in `~/.claude/settings.json` enables coordinated multi-session agent workflows. Requires a new Claude Code session to activate.

### OpenWolf

Installed globally: `openwolf@1.0.4` (by Cytostack Pvt Ltd). "Token-conscious AI brain for Claude Code projects."

- Initialized via `openwolf init` in `~/famtastic/`
- Creates `~/famtastic/.wolf/` directory with context management files
- Three intelligence files tracked in git: `anatomy.md` (file index), `cerebrum.md` (patterns/preferences/do-not-repeat), `buglog.json` (bug history)
- Ephemeral files excluded from git (2026-03-30): `token-ledger.json`, `memory.md`, `hooks/`, `config.json`, `*.log`
- Protocol: check `.wolf/anatomy.md` before reading files; update `.wolf/cerebrum.md` when learning patterns; log bugs to `.wolf/buglog.json`
- CLAUDE.md restored (2026-03-30): OpenWolf had overwritten it with a 2-line redirect. Now contains full FAMtastic rules with a clean OpenWolf reference section at the bottom.

**Note:** OpenWolf hooks intercept every Read/Write/Edit. anatomy.md descriptions may be stale if files change significantly — update manually or wait for auto-rescan (6h interval).

### critical-bug-fixes-2026-03-30

Four bugs fixed from deep code review that were causing silent failures or wrong behavior:

1. **Duplicate `ws.on('close')` handlers (C-1)** — Two separate `ws.on('close', ...)` handlers were registered on the same WebSocket object: one decremented `activeClientCount`, the other called `endSession()`. Both fired on every disconnect. After two connect/disconnect cycles, `activeClientCount` went negative. Fix: merged into a single `async` handler. The merged handler also releases `buildInProgress` on disconnect (deadlock prevention from the prior overhaul) and `await`s `endSession()`.

2. **`endSession()` not awaited on site switch (C-2)** — `POST /api/switch-site` and `POST /api/new-site` were synchronous Express route handlers. They called `endSession()` without `await`, then immediately changed `TAG`. The session summary was generated and written after `TAG` already pointed to the new site's directory. Fix: both handlers converted to `async` with `await endSession()` before modifying `TAG`.

3. **`ws.onmessage` JSON.parse unguarded (C-3)** — The client-side WebSocket `onmessage` handler called `JSON.parse(event.data)` without a try/catch. Any malformed message from the server (incomplete JSON, progress string, etc.) would throw an uncaught exception and crash the entire message loop — all subsequent messages ignored for that session. Fix: wrapped in `try { msg = JSON.parse(event.data) } catch { return }`.

4. **`shareSite()` always shows "not deployed" (C-4)** — `shareSite()` tried to read the deployed URL from `#studio-live-url`, a DOM element that gets `hidden` class added immediately by `refreshDeployInfo()` in the new per-site repo UI. The element was never visible. Fix: read from `deployInfoCache.production.url || deployInfoCache.staging.url` directly (the same cache already populated by `refreshDeployInfo()`).

**Lesson:** WebSocket's `EventEmitter.on()` stacks listeners — multiple `ws.on('close', ...)` calls all fire, unlike DOM's `addEventListener`. When refactoring ws handlers over multiple sessions, always check for stale registrations. For Express route handlers that call async operations and then mutate shared state, always `async/await` — fire-and-forget is a race condition.

### Build Plan v2 — Phases 0 through 2-A (2026-04-01)

Executed the Revised Build Plan v2 in a single session. All Tier 1 and Tier 2 phases complete.

**Phase 0 — Foundation**

- **Tab/label rename (Wave 0-A):** All 8 sidebar tabs renamed to user-centric language. Assets→Media, Blueprint→Structure, Deploy→Publish, Design→Style, History→Activity, Metrics→Insights, Verify→Review, Server→Hosting. Plus 8 button/heading renames (Brand Health→Site Health, etc.). File: `site-studio/public/index.html` only. Cosmetic — no IDs or logic changed.

- **Session status bar (Wave 0-B):** Fixed bottom bar showing model pill (Haiku/Sonnet/Opus with color coding), context window usage bar (green/amber/red at 50%/80%), running cost in USD, session duration. Functions: `calculateSessionCost(model, inputTokens, outputTokens)` (per-model rates), `getContextPercentage(usedTokens, windowSize)`, `broadcastSessionStatus(ws)`. Token tracking is approximate (prompt.length/4) since `--print` text mode has no usage metadata. Context warning fires once at 80%. Files: `server.js` (vars, 3 functions, broadcastSessionStatus call in wss.on('connection') and onChildClose), `index.html` (status bar HTML/CSS, session-status WS handler), `tests/unit.test.js` (6 new tests). Test count: 60 → 66.

- **Brain foundation (Wave 0-C):** `.brain/` directory with 6 files: `INDEX.md` (architecture decisions, known failures, portfolio, unknowns — loaded into every Claude prompt), `patterns.md` (validated patterns with evidence and confidence), `procedures.md` (repeatable workflows), `bugs.md` (bug encyclopedia), `anti-patterns.md` (do-not-repeat rules), `site-log.jsonl` (build history). Functions: `loadBrainContext()` reads `INDEX.md` and injects between sessionContext and conversationHistory in `buildPromptContext()`. `logSiteBuild(spec, verificationResult)` appends to `site-log.jsonl` fire-and-forget after verification in `finishParallelBuild()`. Files: 6 new in `.brain/`, `server.js` (2 functions + injection point + build logging call).

**Phase 1 — UX Shell**

- **Three-mode navigation (Wave 1-A):** Mode selector above tab bar with icons. Create (Media/Structure/Style), Ship (Review/Publish/Hosting), Grow (Activity/Insights). Persists via `localStorage('studio-mode')`. Functions: `switchMode(mode)` shows/hides tab buttons per mode. File: `index.html` only.

- **Three-panel layout (Wave 1-B):** Chat (left, 280px), workspace (center, 340px), preview (right, flex). Uses CSS flex `order` to reorder without moving HTML. Studio panel always visible (was toggle sidebar). Drag-to-resize via `setupResizer()` with localStorage persistence. Mobile responsive stacking below 1024px. File: `index.html` only. Key change: `wss` stays at `{ noServer: true }` for terminal WS coexistence.

- **Plan → Confirm → Execute (Wave 1-C):** Before `layout_update/major_revision/restyle/build` intents, `generatePlan()` calls Claude (2-min timeout) to produce structured JSON plan (summary, affected_pages, changes, estimated_scope). Plan card rendered in chat with approve/edit/cancel buttons. `routeToHandler()` extracts intent dispatch from inline switch. `pendingPlans` Map tracks active plans. `plan_mode` added to settings allowedKeys (default: true). `hero_full_width` also added to allowedKeys (was missing). Files: `server.js` (generatePlan, routeToHandler, execute-plan handler, plan gate in classifier), `index.html` (plan card DOM builder, approvePlan/cancelPlan functions, CSS).

**Phase 1.5 — Embedded Terminal**

PTY-backed terminal in Create mode's Terminal tab. Backend: `node-pty` spawns bash with xterm-256color, CLAUDE_* env vars stripped. REST API: `POST /api/terminal/create` (returns termId), `POST /api/terminal/:termId/inject` (command injection), `POST /api/terminal/:termId/resize`, `DELETE /api/terminal/:termId`. WS upgrade handler on `server.on('upgrade')` routes `/terminal/:termId` to PTY data stream (separate from main wss). Frontend: xterm.js v5.3.0 via CDN, `createTerminal()`, `startClaudeSession()` (launches interactive claude), `sendToTerminal()` for plan card injection. ResizeObserver auto-fits. All PTY processes killed on graceful shutdown. Files: `server.js` (pty require, terminal state, 4 endpoints, WS upgrade, shutdown kill), `index.html` (CDN links, terminal tab button, tab content, JS functions), `package.json` (node-pty dep).

**Phase 2-A — SQLite Session Storage**

`better-sqlite3` with WAL mode at `~/.config/famtastic/studio.db`. Tables: `sessions` (id, site_tag, model, tokens, cost, message_count, status), `builds` (pages_built, verification, duration, tokens, cost), `compaction_events`. File: `site-studio/lib/db.js` — createSession, updateSessionTokens, endSession, logBuild, getSessionHistory, getPortfolioStats, _createTestDb/_closeDb for testing. Wired into: `startSession()` (creates session), `endSession()` (ends session), `onChildClose` (token updates), `finishParallelBuild()` (build logging). API: `GET /api/session-history`, `GET /api/portfolio-stats`. Tests: 3 new (session lifecycle, token accumulation, portfolio stats). Test count: 66 → 69.

**Tags:** `phase-0-complete` (060b128), `phase-1-ux-stable` (c81bbeb), `phase-1-terminal-complete` (c4d83a1), `phase-2a-complete` (0375044).

### CSS File Structure + Terminal Fix + UI Bug Sweep (2026-04-01)

**CSS file structure rule:** Established as non-negotiable in CLAUDE.md and `.brain/anti-patterns.md`. All new CSS goes in `site-studio/public/css/` — never inline `<style>`. Six component files: `studio-base.css` (resets, messages, uploads, health dots), `studio-panels.css` (three-panel layout, resizers, responsive), `studio-chat.css` (plan cards, brainstorm mode), `studio-sidebar.css` (tabs, mode selector, status bar, slot mode), `studio-modals.css` (placeholder), `studio-terminal.css` (placeholder). All linked in `<head>`. Unit test enforces file existence + link integrity. File watcher monitors `public/css/` for change detection. Extracted ~340 lines from inline `<style>` block into the component files. Test count: 69 → 70.

**Terminal fix (critical):** node-pty 1.1.0 fails with `posix_spawnp` on Node 24 + macOS arm64. Upgraded to `node-pty@1.2.0-beta.12` which resolves it. xterm.js CDN was pointing to non-existent v5.3.0 (404, causing `Terminal is not defined`). Updated to `@xterm/xterm@6.0.0` and `@xterm/addon-fit@0.11.0`. Terminal now spawns successfully. Start Claude button launches interactive Claude Code session inside Studio. **Note:** node-pty 1.2.0 is a beta — upgrade to stable when released.

**Preview reload polling flood:** The preview iframe's live-reload script used `setInterval(1000)` with no backoff. When the preview server was unreachable (e.g., during restart), it flooded the browser with `ERR_TIMED_OUT` and `ERR_INSUFFICIENT_RESOURCES` errors, exhausting connection limits. Fix: replaced with recursive `setTimeout` with exponential backoff on failure (1s → 1.5x multiplier → 30s cap). Also skips polling when `document.hidden` (tab not active). File: `site-studio/server.js`, `RELOAD_SCRIPT` constant.

**Panel toggle button states:** Studio and Toggle Preview buttons started gray even though both panels were visible on load. Fixed: both start with `bg-studio-accent` (blue). Toggle switches to `bg-gray-600` when panel hidden, back to blue when shown. Added `id="preview-btn"` for reliable targeting.

**Chat panel layout reflow:** When both Studio and Preview panels were hidden, chat panel stayed at its narrow fixed width. `updatePanelLayout()` rewritten: 0 panels visible → chat `flex: 1 1 100%` (fills viewport), 1 panel visible → chat `flex: 1 1 40%` + remaining panel `flex: 1 1 60%`, all 3 → restore saved widths from localStorage.

**Resizer z-index:** Panel resizer was invisible to mouse events because chat panel's overflow was on top. Fixed: resizer width 4px → 6px, added `z-index: 10; position: relative`. Duplicate `resizer-lc` element removed from DOM.

**Terminal error handling:** `POST /api/terminal/create` now wraps `pty.spawn()` in try/catch and returns `{ error: "..." }` JSON instead of crashing Express with an unhandled exception. Uses `process.env.SHELL` instead of hardcoded `bash`.

### Auto-Tag Missing Slot Attributes — 2026-03-31

Conditional post-processor that auto-tags `<img>` elements missing `data-slot-id`, `data-slot-status`, `data-slot-role` attributes. Runs only when build verification detects the `slot-attributes` check has failed — zero cost when Claude gets all attrs right.

**Function:** `autoTagMissingSlots(pages)` in `server.js`. Adapted from existing `retrofitSlotAttributes()` but per-image instead of all-or-nothing.

**Architecture (dynamic CRUD):**
- **Conditional trigger:** Only fires when `verifySlotAttributes` reports failures in `finishParallelBuild()`
- **Content-derived IDs:** Uses `auto-{page}-{role}-{altSlug}` format. Alt text slug (max 20 chars) provides rebuild stability. Collision avoidance via `usedIds` Set.
- **Orphan prevention:** Checks existing `slot_mappings` by src — if an image's src matches an existing mapping, reuses the old slot ID instead of generating a new one.
- **Logo exclusion:** Finds `<a data-logo-v>...</a>` spans via regex, skips any `<img>` whose position falls within. Position-range check, not heuristic.
- **Decorative skip:** Skips `width/height=1` (tracking pixels), external SVGs not in uploads, empty-alt + non-transparent data URIs. Errs toward tagging.
- **Fallback role:** `"gallery"` (matches `retrofitSlotAttributes` and the accepted-roles list in build prompts).
- **No-seed skip:** If alt text AND src basename produce no meaningful slug, skips rather than generating an unstable counter-based ID.

**Integration points:**
- `finishParallelBuild()`: verify → conditional auto-fix → re-register slots → re-verify → save result → send to client
- Single-page edit path (`HTML_UPDATE`): runs after `runPostProcessing()` on `[currentPage]`
- `verifySlotAttributes()` and `verifyLogoAndLayout()` both updated to skip logo images inside `data-logo-v` anchors

**Known gap:** Single-page edits run `autoTagMissingSlots` but don't run the full verify → re-verify loop. The verification pill only updates on full builds or manual "Run Verification."

### Build Verification System — 2026-03-30

Two-tier quality assurance system for built sites.

**Phase 1 — File-based (always-on, zero tokens):** Five verification functions run automatically after every build inside `finishParallelBuild()`. Functions: `verifySlotAttributes(pages)`, `verifyCssCoherence()`, `verifyCrossPageConsistency(pages)`, `verifyHeadDependencies(pages)`, `verifyLogoAndLayout(pages)`. Orchestrated by `runBuildVerification(pages)`. Results stored in `spec.last_verification`. Sent to client via `verification-result` WS message type. Failed builds show amber chat notification via `verification-warning` WS type.

**Phase 2 — Browser-based (on-demand, costs tokens):** Five Claude Code agent definitions in `~/.claude/agents/`: `famtastic-visual-layout.md`, `famtastic-console-health.md`, `famtastic-mobile-responsive.md`, `famtastic-accessibility.md`, `famtastic-performance.md`. Triggered manually by asking Claude Code to "run a visual audit." Requires Chrome DevTools MCP.

**Architectural decision:** File-based verification runs automatically because it's free (reads files, no AI calls). Browser-based verification is on-demand because it costs tokens, requires a browser connection, and is most useful for pre-deploy final reviews — not every iterative edit.

**API endpoints:** `GET /api/verify` (read last result), `POST /api/verify` (trigger manual run), `POST /api/visual-verify` (agent readiness check).

**Studio UI:** Verification pill in preview toolbar (green Verified / yellow Warnings / red N Issues / gray Unchecked). Verify tab (8th sidebar tab) with collapsible check sections. View in Browser button opens prompt-copy modal for Phase 2.

**Config:** `spec.last_verification` stores the most recent verification result with `{ status, checks, issues, timestamp }`.

### parallel-build-overhaul -- 2026-03-24

Two fixes to `parallelBuild()` in `server.js`:

1. **Sequential index.html bottleneck removed.** The old design built index.html alone first, waited for it to complete, extracted `<nav>`, `<footer>`, and `<head>` from the result, then passed those HTML blocks into every other page's prompt. This meant 6 pages were blocked on 1 before any parallel work could start. The fix: all pages spawn simultaneously from the start. Design consistency is guaranteed by the shared brief, decisions, CSS custom properties, and a `DESIGN CONSISTENCY` instruction in each prompt. `syncNavPartial()` / `syncFooterPartial()` in `runPostProcessing()` with `isFullBuild: true` harmonize nav/footer across all pages after build — that sync was already the final source of truth, the index.html extraction was redundant.

2. **Per-page 5-minute timeout added.** Each `spawnClaude()` child in the parallel loop now has a `setTimeout(300000)` with `clearTimeout` on close. On timeout: kill child, send WS error naming the specific page, increment `completed`, check if all pages settled. If settled, call `finishParallelBuild()` with whatever succeeded (or release `buildInProgress` directly if all failed). Previously a single hung Claude CLI process locked the studio indefinitely.

Expected result: a 7-page build should complete in ~slowest-single-page time (~60–90s) rather than index + slowest-remaining (~220s).

### ### lifecycle-integrity-media-intelligence -- 2026-03-24

Completed all items from the lifecycle integrity + media intelligence plan:

1. **reconcileSlotMappings()** + `POST /api/rescan` + Rescan toolbar button — orphaned slot_mappings cleaned after every build and on demand
2. **Slot ID stability injection** — current page's slot IDs injected into single-page edit prompts (CRITICAL preservation instruction)
3. **Single-page edit slot registration** — removed isFullBuild guard; `extractAndRegisterSlots` runs on every page edit
4. **fetchFromProvider()** abstraction — Unsplash, Pexels, SVG placeholder (zero-dep fallback). No more dead-end stock failures.
5. **Contextual stock queries** — business name + industry + role instead of just role
6. **GET /api/stock-search + POST /api/stock-apply** — QSF Stock preview grid with editable query, provider badges, selectable results
7. **QSF slot detail bar** — provider badge, credit, query display, Clear button. POST /api/clear-slot-mapping endpoint.
8. **GET /api/site-info alias** — wraps spec in { spec } envelope for client-side code
9. **Upload thumbnails** — fixed /assets/ → /site-assets/ (all 3 occurrences)
10. **Upload limit** — 100 (was 20), config-driven via `max_uploads_per_site`
11. **Brand health metrics dashboard** — slot coverage bar, upload usage bar, orphan count, empty slot actions. Flat per-slot list removed.
12. **Slot_mappings schema** — now stores `{ src, alt, provider, query, credit }` for full traceability

Key functions added: `reconcileSlotMappings()`, `fetchFromProvider()`. Key endpoints added: `GET /api/stock-search`, `POST /api/stock-apply`, `POST /api/clear-slot-mapping`, `POST /api/rescan`, `GET /api/site-info`.

### template-first-build-architecture -- 2026-03-26

**Build flow:** `parallelBuild()` now uses a two-phase strategy:
1. **Phase 1:** Call `buildTemplatePrompt()` → `spawnClaude()` → produces `_template.html` (header, nav, footer, shared CSS, head deps only — no page content)
2. **Phase 2:** Call `loadTemplateContext()` → pass template context into every page's `spawnPage()` call simultaneously (true parallel)

Each page copies header/footer/head verbatim from template and generates only `<main>` content + `<style data-page="pagename">` block. Eliminates the old CSS seed / index-first bottleneck.

**Key functions:**
- `buildTemplatePrompt(spec, pageFiles, ...)` — generates the Claude prompt for `_template.html`
- `extractTemplateComponents(templateHtml)` — parses `data-template="header|footer|shared"` anchors from the built template
- `loadTemplateContext()` — reads `_template.html`, strips `<title>` from headBlock, formats for prompt injection
- `writeTemplateArtifacts(components)` — writes `_partials/_nav.html`, `_partials/_footer.html`, `assets/styles.css`
- `applyTemplateToPages(pages)` — replaces inline `<style data-template="shared">` with `<link href="assets/styles.css">` in each page

**Template guard:** `templateSpawned` flag prevents double-build race between timeout handler and close handler.

**Fallback:** If template build fails (code 1 or 0 bytes), `parallelBuild()` falls back to legacy build (no template context, `sharedRules` only).

**`_template.html`** lives in `dist/` but is excluded from `ignoreEntries` deploy list.

### spawnClaude-cwd-fix -- 2026-03-26

**Problem:** `spawnClaude()` was setting `cwd: HUB_ROOT` (`~/famtastic/`). When the subprocess Claude CLI starts, it reads `CLAUDE.md` in the cwd — which contains OpenWolf instructions telling it to check anatomy.md, cerebrum.md, etc. With `--tools ""` active, Claude cannot execute those instructions and produces empty output (0 bytes, exit 0).

**Fix:** Changed `cwd` in `spawnClaude()` to `os.tmpdir()` (resolves to `/tmp`). No `CLAUDE.md` in `/tmp`, so the subprocess receives only the piped prompt and responds normally.

**Also fixed:** `scripts/claude-cli` wrapper was failing when called from non-HUB_ROOT directories because it sources `scripts/lib/hub-common` via a relative path. The cwd change bypasses this wrapper issue entirely since `spawnClaude()` now calls `claude --print` directly.

**CLAUDE_* env var stripping** (previous fix, still active): All env keys matching `CLAUDE_*` or `=== 'CLAUDECODE'` are deleted from the subprocess env before spawn to prevent nested-session detection.

### nav-containment-layout-fix -- 2026-03-26

**Problem:** The nav/header appeared wider on pages with wide content (forms, grids, tables). Root cause: wide content caused the browser's layout engine to compute the `<body>` at a wider layout width. Even with `overflow-x: hidden` on body (which clips rendering), the LAYOUT width is still wider — block siblings like `<header>` stretch to fill it.

**Fix — page-template approach (Drupal-inspired):**

The layout uses a page-template model: the page sets the overall width, header/footer are full-viewport-width chrome, and `<main>` is the constrained content area at 90% max-width centered. This prevents content from ever pushing header/footer wider.

1. **`html, body { margin: 0; padding: 0; }`** — reset only, no overflow-x hidden (removed because it clipped hero breakout images)
2. **`main { max-width: 90%; margin-left: auto; margin-right: auto; }`** — content area is 90% of viewport, centered. Header and footer remain full-width outside this constraint.
3. **Hero breakout:** When `settings.hero_full_width` is `true` (default), the first section inside main breaks out to full viewport width: `main > section:first-of-type { width: 100vw; position: relative; left: 50%; margin-left: -50vw; }`. This works because body has no `overflow-x: hidden` to clip it.

**`fixLayoutOverflow(ws)`** in `server.js` (~line 4312): Runs as the last post-processing step (Step 6) on every build. Strips any previous `STUDIO LAYOUT FOUNDATION` or `LAYOUT FOUNDATION` block and prepends the new one to `assets/styles.css` (idempotent). Reads `hero_full_width` from settings to conditionally include the hero breakout rule. Falls back to inline `<style>` injection in HTML files only when `styles.css` does not exist (avoids duplicate block stacking bug).

**STUDIO LAYOUT FOUNDATION block** (injected into every `styles.css`):
```css
html, body { margin: 0; padding: 0; }
main { max-width: 90%; margin-left: auto; margin-right: auto; }
.container { width: 100%; max-width: 90rem; margin-left: auto; margin-right: auto; padding-left: 1.5rem; padding-right: 1.5rem; box-sizing: border-box; }
*, *::before, *::after { box-sizing: border-box; min-width: 0; }
img, video, table, iframe, embed, object { max-width: 100%; height: auto; }
/* When hero_full_width is true: */
main > section:first-of-type { width: 100vw; position: relative; left: 50%; margin-left: -50vw; }
```

**`hero_full_width` setting:** Boolean in `studio-config.json`, defaults to `true`. Controls whether the first section inside `<main>` breaks out to full viewport width. Useful for hero images/banners that should span edge-to-edge.

**`.container` class:** Shared utility available in all pages. Header inner content, footer inner content, and all page sections should wrap content in `<div class="container">`. Sections themselves can be full-bleed for backgrounds; only the inner `.container` is capped at 90rem.

### studio-tweaks -- 2026-03-26

**Server tab** (7th sidebar tab): Restart Studio button (process.exit(0) via `scripts/studio-server` wrapper), live uptime counter (1s interval, cleared on tab switch), session info (ID, messages, mode, clients), config (model, site, page, Node version, ports), file status (green/orange dots for server.js + index.html). `setupFileWatcher()` uses `fs.watch` with 2s debounce, broadcasts `restart-needed` WS message. Watchers stored in `fileWatchers[]` and closed in `gracefulShutdown()`.

**Push to Repo:** `git_push` classifier intent + `runGitPush(ws)` with `gitPushInProgress` concurrency guard. Chained `spawn()` calls: git add → git status → git commit → git branch → git push. All spawns use explicit `stdio` configs to prevent pipe buffer stalls. `silent` mode suppresses all user-facing messages (used by auto-sync after deploy).

**Site persistence on restart:** `readLastSite()`/`writeLastSite()` persists active TAG to `~/.config/famtastic/.last-site`. TAG validated before `server.listen()` (not inside callback). Falls back to `site-demo` if saved site doesn't exist.

**Staging/production environments:** `spec.json` gets `environments` object with `staging` and `production` sub-objects. Auto-migration in `readSpec()`: flat `deployed_url`/`netlify_site_id` fields → `environments.staging`. `runDeploy(ws, env)` accepts `'staging'` or `'production'`. `scripts/site-deploy` accepts `--env staging|production` flag with environment-aware Netlify site naming (`<tag>-staging` vs `<tag>`). Site ID resolved via `jq --arg env` from `spec.environments[env].site_id`. Deploy tab redesigned: Deploy to Staging (always active), Deploy to Production (gated behind `custom_domain`), environment status cards with View buttons, Push to Repo, Share.

**Security fixes (from code review):** CSRF bypass fixed (empty origin no longer passes). PID removed from `/api/server-info`. XSS: `v.reason` escaped in version history, brief arrays escaped per-element, `isSafeUrl()` validates scheme before href/window.open. `POST /api/restart` calls `gracefulShutdown()` (runs `endSession()` + closes watchers). `readSpec` migrations use `writeSpec()` instead of direct `fs.writeFileSync`.

### per-site-repo-architecture -- 2026-03-27

**Architecture change:** famtastic repo is now pure tooling. `sites/` added to `.gitignore` and removed from git tracking. Site working directories remain at `~/famtastic/sites/<tag>/` on disk (local only). Each site gets its own repo at `~/famtastic-sites/<tag>/` with three branches: `dev`, `staging`, `main`.

**Git flow:**
- `Push to Repo` → copies dist/ to site repo, commits to `dev` branch, pushes `origin dev`
- `Deploy to Staging` → commits dev, merges `dev → staging`, pushes `origin staging`, deploys staging to Netlify
- `Deploy to Production` → merges `dev → staging → main`, pushes `origin main`, deploys main to Netlify
- `Push Studio Code` → pushes famtastic hub repo (tooling only), separate from site repos

**`createSiteRepo(ws)`** in `server.js`: replaces `createProdRepo`. Creates `~/famtastic-sites/<tag>/`, copies dist/ (filtering .versions/ and _template.html), writes scaffold files (CLAUDE.md, SITE-LEARNINGS.md, README.md), runs `git init`, renames default branch to `dev`, creates `staging` and `main` branches, tries `gh repo create --private`. Auto-called from `finishParallelBuild()` on first successful build. Concurrency guard: `siteRepoInProgress`. Retry path: if local repo exists but no remote, skips to `_tryGhRepoCreate` directly.

**`syncSiteRepo(ws, spec, targetBranch, callback)`** in `server.js`: replaces `syncProdRepo`. Branch-aware sync:
- Target `dev`: checkout dev → copy dist → add → commit → push dev
- Target `staging`: dev commit → checkout staging → merge dev → push staging → return to dev
- Target `main`: dev commit → checkout staging → merge dev → checkout main → merge staging → push main → return to dev
- Failed merges call `git merge --abort` before returning error (prevents stuck MERGING state)
- All checkout exit codes checked (prevents wrong-branch push)
- Concurrency guard: `syncSiteRepoInProgress`

**`runGitPush(ws)`** in `server.js`: now delegates to `syncSiteRepo(ws, spec, 'dev')`. If `spec.site_repo` doesn't exist, shows contextual error ("being created" vs "build first").

**`pushHubRepo(ws)`** in `server.js`: new function for pushing famtastic tooling code. Separate concurrency guard (`hubPushInProgress`). Called via `hub_push` classifier intent or "Push Studio Code" button in Server tab.

**`spec.site_repo`**: top-level field in spec.json replaces `spec.environments.production.repo`. Contains `{ path, remote }`. `environments` object still tracks deploy targets (Netlify site IDs, URLs, custom domains per environment).

**`runDeploy(ws, env)`**: after successful deploy, calls `syncSiteRepo(ws, spec, targetBranch)` where staging → 'staging', production → 'main'. Uses spread merge on `spec.environments[env]` to preserve existing fields (repo, custom_domain). `deployInProgress` concurrency guard.

**`GET /api/deploy-info`**: returns `hub_repo` (cached at startup, no more blocking execSync), `site_repo`, and structured `local/staging/production` environments.

**Studio State header**: shows three environment URL rows (Local, Staging, Prod) with clickable links. Safe DOM construction (createElement + textContent), `isSafeUrl()` validation on all href assignments.

**Deploy tab HTML fix**: unclosed `<div class="border-b border-gray-700">` from old Actions accordion wrapper caused History, Metrics, Server, and partially Blueprint tabs to nest inside the Deploy tab content div. When Deploy tab was hidden (not active), all nested tabs were hidden too — appearing as "blank". Fixed by removing the stale wrapper div.

**Known gap (saved to cerebrum):** Studio code push UX needs rethinking. Currently "Push Studio Code" does a quick git add/commit/push with auto-generated message. Proper commits with meaningful messages should go through CLI. Future: Studio should manage its own code changes with commit message prompts.

### studio-cli-handoff-pattern -- 2026-04-08

**Pattern established:** Playwright drives Studio for HTML + CSS. When Studio can't write JavaScript, Playwright logs the gap and triggers CLI. CLI writes the JS, injects script tags into HTML, and Playwright verifies. High-reuse JS becomes a component in `~/famtastic/components/`.

**Full documentation:** `docs/studio-cli-handoff-pattern.md`
**Capability registry:** `docs/capability-registry.md`  
**Task log:** `tests/automation/logs/cli-handoff-pattern.json`

**Studio can handle:** HTML structure, CSS classes, Tailwind utilities, basic CSS transitions (hover lift, button scale), `scroll-behavior:smooth`, `loading="lazy"` attributes, static data attribute scaffolding.

**Studio cannot handle (requires CLI):** Any JavaScript — Intersection Observer, timers, event listeners, dynamic DOM creation, state management.

**Routing rules (for Playwright):**

| Task Pattern | Route To | Why |
|---|---|---|
| "add parallax" | CLI | Needs requestAnimationFrame |
| "animate on scroll" | CLI | Needs IntersectionObserver |
| "slideshow auto-advance" | CLI | Needs JS timer + state |
| "counter animation" | CLI | Needs IntersectionObserver + rAF |
| "scroll-to-top button" | CLI | Needs scroll listener |
| "hover effect" | Studio first | CSS-only possible |
| "lazy load fade-in" | CLI | Needs IntersectionObserver |

### street-family-reunion-js-pass -- 2026-04-08

**Site:** `sites/site-street-family-reunion/`  
**JS files added:** `dist/assets/js/parallax.js`, `slideshow.js`, `card-animations.js`, `counter-animation.js`, `smooth-scroll.js`, `lazy-load.js`

**Data attributes used across all pages:**
- `data-parallax-speed="0.3"` — on parallax hero sections (our-story.html)
- `data-animate="fade-up"` — on all activity cards, timeline items, stats items
- `data-card-enhanced` — on all interactive cards (activates card-animations.js)
- `data-slideshow` — on slideshow container (gallery.html), replaces inline script
- `data-count-to`, `data-count-suffix`, `data-count-duration` — on counter spans (our-story.html)
- `data-lazy` — on gallery and product images
- `data-slot-status="google-generated"` + `data-generated-by` — on hero video and all Imagen-generated images

**Stats section:** Added to `our-story.html` between timeline and family tree sections. Counters: 150+ Family Members, 6 Generations, 45 States Represented, 1 United Family.

**Slideshow bug pattern (do not repeat):** When a page has existing CSS `display:none` on `.slide` elements, and slideshow.js replaces it with opacity-based crossfade, the `display:none` wins and slides stay invisible. Fix: inject `display:block !important` in the slideshow CSS override to ensure all slides are in the layout, with opacity controlling visibility.

**Component library entries created:**
- `components/parallax-section/component.json`
- `components/animated-counter/component.json`
- `components/photo-slideshow/component.json`

Each includes HTML template, data attribute docs, platform notes (Drupal, WordPress, Webflow).

---

### google-imagen-veo-pipeline — 2026-04-08

**Primary media generation pipeline for all FAMtastic sites.**

**Script:** `scripts/google-media-generate`  
**SDK:** `google.genai` v1.47.0 (NOT `google.generativeai` — different package, not installed)  
**Credentials:** `GEMINI_API_KEY` env var  
**Image model:** `imagen-4.0-generate-001` — $0.004/image, ~7s  
**Video model:** `veo-2.0-generate-001` — ~$0.05/video, ~33s, produces 5s MP4 ~2.4MB

**Batch usage:**
```
google-media-generate --batch scripts/google-media-batch-[site].json \
  --output-dir sites/site-[tag]/dist/assets/images/generated/ \
  --site-dir sites/site-[tag]/
```

**Batch JSON format** (`scripts/google-media-batch-street-reunion.json`):
```json
[
  { "type": "video", "filename": "hero.mp4", "still_filename": "hero-still.png",
    "still_prompt": "...", "video_prompt": "...", "aspect_ratio": "16:9" },
  { "type": "image", "filename": "card-explore-story.jpg",
    "prompt": "...", "aspect_ratio": "4:3" }
]
```

**street-family-reunion generated assets** (all in `dist/assets/images/generated/`):
- `hero-still.png` (1.7MB, 16:9) — Imagen 4 Black family reunion scene
- `hero.mp4` (2.4MB, 16:9) — Veo 2 animated from hero-still
- `card-explore-story.jpg`, `card-gallery.jpg`, `card-find-family.jpg`,
  `card-book.jpg`, `card-plan-stay.jpg`, `card-research.jpg`, `gallery-firefly.jpg` (1.5–1.8MB each, 4:3)

**Safety filter rules (do not repeat):**
1. `person_generation` must be `'ALLOW_ADULT'` (uppercase). `'allow_adult'` silently blocks output. `'ALLOW_ALL'` throws `ValueError` on Gemini API (Vertex only).
2. Veo video prompts must NOT reference race or ethnicity. "African American family reunion scene" was blocked. Use motion/atmosphere only: "Gentle cinematic drift, string lights swaying, golden hour light through tree leaves." The still image carries the representation visually.
3. Imagen prompts with explicit ethnic descriptors like "Black grandmother" may be blocked. Use generational descriptions: "two women of different generations sharing a warm embrace" — the scene context and other prompt elements still produce culturally appropriate imagery.
4. Always check `response.generated_images` before accessing bytes — safety block returns empty list, not an exception.

**Telemetry:** Every generation logged to `intelligence/media-usage.jsonl` (global) and per-site `media-telemetry.jsonl`.

**Adobe Firefly status:** Firefly API is NOT available on Creative Cloud plan. Requires $1K+/mo enterprise plan. Confirmed in Adobe Developer Console. Do not attempt Firefly API calls. Firefly Web (firefly.adobe.com) is available via browser automation (Claude-in-Chrome MCP) only, for style reference.

---

---

### auntie-gale-garage-sales — 2026-04-08

**Site #5. Full FAMtastic build for an independent garage sale curator. Primary purpose: Studio stress test across all 14 phases.**

**Deployed:** `https://effortless-tiramisu-ed9345.netlify.app` (Netlify site ID: `d50d0586-8f28-407f-aebe-14c175a88e1d`)  
**Pages:** `index.html`, `shop.html`, `deals.html`, `about.html`, `contact.html`  
**Assets:** `dist/assets/css/main.css`, `dist/assets/buddy/` (8 PNG poses), `dist/assets/video/` (hero.mp4 + still)

**Color palette:** `#E8420A` primary · `#1D4ED8` secondary · `#FBBF24` accent · `#FFFBF5` bg · `#1C1917` dark · `#16A34A` green  
**Fonts:** Bangers (display) · Nunito (body) · Permanent Marker (accent) — all Google Fonts CDN  
**Shared stylesheet:** `dist/assets/css/main.css` — 607 lines, defines `.starburst`, `.display-stage*`, `.product-card`, `.countdown-*`, `.category-pill`, nav, hero, footer, Buddy placement classes

**Buddy mascot (11 placements):**
- `buddy-peek-right.png` — hero right-edge peek with speech bubble (index)
- `buddy-thumbs-up.png` — section icon (index) + Buddy Pick card badge breaking top-right corner (index + shop)
- `buddy-sale-sign.png` — Daily Deal stage breakout left (index + deals)
- `buddy-wave-goodbye.png` — footer absolute position above footer border (index)
- `buddy-pop-up.png` — shop hero banner (shop)
- `buddy-running-box.png` — "More Deals Dropping" loading teaser (deals)
- `buddy-full-body.png` — about hero + Meet Buddy section (about)
- `buddy-peek-left.png` — contact form green message banner (contact)

**Starburst implementation:** `.starburst` CSS class with `clip-path: polygon(24-point)` in `main.css`. 9 placed across 4 pages. Sizes: 70–140px. Colors vary per context (accent/primary/green). `transform:rotate()` adds personality.

**Display Stage pattern:**
- Classes: `.display-stage`, `.display-stage-header`, `.display-stage-body`, `.stage-starburst`
- Container: needs `margin-left:5rem` to accommodate Buddy character breaking outside left
- Starburst badge: `.stage-starburst` → `position:absolute; top:-30px; right:-30px`
- Used on `index.html` (Daily Deal) and `deals.html` (Deal of the Day)

**Swiper.js v12 carousel (index.html):**
- CDN: `swiper@12/swiper-bundle.min.css` + `.min.js` (jsdelivr)
- Class: `.featured-swiper` — 1→2(640px)→3(1024px) breakpoints, loop, autoplay 3500ms

**Countdown timer (deals.html):**
- Self-contained IIFE, targets next Sunday 2pm local time
- IDs: `cd-h`, `cd-m`, `cd-s` — updates every 1000ms

**Category filter pills (shop.html):**
- `filterCategory(btn, cat)` — reads `data-category` on grid cards
- `#product-grid` container · `#result-count` display · `.category-pill.active` = primary color

**Components extracted to `components/` library:**
- `product-card-garage/` — card with optional Buddy badge breakout
- `display-stage/` — deal showcase with swappable slot
- `starburst-badge/` — 4 variants, CSS clip-path only
- `countdown-timer/` — live JS countdown
- `category-filter-pills/` — filterable product grid

---

## Session Engine Upgrades (2026-04-09)

### Session 1: Build Lock + Classifier Improvements

**Build lock management (`site-studio/server.js`):**
- `setBuildInProgress(value)` — persists lock to `.studio.json`, manages 10-min auto-clear timer
- `BUILD_LOCK_TIMEOUT_MS = 600000` — auto-clears stale locks
- Stale lock detection in `loadStudio()` — logs `BUILD_LOCK_STALE` on startup if `build_in_progress === true`
- `POST /api/build/cancel` — clears lock and emits `build_cancelled` WS event
- `handlePlanning()` guard — returns friendly error if build already in progress

**Classifier intent-dominance (`classifyRequest()` in server.js):**
- 9 strong build signals fire BEFORE vocabulary checks — prevents brief misclassification
- 8 brief indicators (2+ hits required) catch structured briefs with data-attribute syntax
- Explicit data-attr inspect check: `\b(check|inspect|examine)\s+(?:the\s+)?data-[\w-]+\b` → `visual_inspect`
- Hyphenated component names: `\b(use|insert|add|place)\s+(?:the\s+)?[\w][\w-]+\s+component\b` → `component_import`
- Confidence logging: `[classifier] intent=X confidence=HIGH/LOW signals=N`
- `component_import` handler: reads HTML template, injects before `</main>`, updates `used_in[]` in library.json

**Test suite:** `tests/classifier-regression.json` (20 cases), `tests/automation/logs/session1-test-results.json` (8/8 PASS)
**Docs:** `docs/classifier-intent-map.md`

### Session 2: SEO Pipeline

**Meta injection (`injectSeoMeta()` in server.js):**
- Extended with `<meta property="og:url">` and `<link rel="canonical">` using `spec.deployed_url`

**Sitemap + robots (`generateSitemapAndRobots(ws)` in server.js ~line 2815):**
- Generates `dist/sitemap.xml` — one `<url>` per page, index.html priority 1.0, others 0.8
- Generates `dist/robots.txt` — User-agent: *, Allow: /, Sitemap: {deployed_url}/sitemap.xml
- Called at end of `finishParallelBuild()`

**SEO validation (`runSeoValidation(pages)` in server.js ~line 2858):**
- Checks: title, description, og:image, og:url, canonical, h1 uniqueness, img alt text
- Results appended to build completion message

**KNOWN BUG (fixed):** `spec.site_name` defaults to `"New Site"`. Always update spec.json immediately after first build.

**Test regex apostrophe bug:** `[^"']+` stops at apostrophes in values like "Gale's". Keep descriptions apostrophe-free or use `[^"]*` as regex group.

**Test suite:** `tests/session2-seo-tests.js` (59/59 PASS), `scripts/generate-seo-files`

### Session 3: Image Pipeline (rembg)

**Background removal endpoint (`POST /api/remove-background`):**
- Body: `{ filename }` or `{ filenames: [] }` (batch), optional `{ dark_section: true }`
- Returns: `{ results, errors, knockout_css_class: 'fam-knockout' }` — 207 on partial batch
- All filenames validated (alphanumeric/dots/hyphens/underscores only)

**rembg worker (`scripts/rembg-worker.py`):**
- Uses rembg Python API directly — avoids CLI dependency cascade (filetype + watchdog + aiohttp)
- CLI binary at `/Users/famtasticfritz/Library/Python/3.9/bin/rembg` is NOT reliable — use the worker script
- Output is always RGBA PNG

**CSS injection (`injectKnockoutCss()`):**
- Priority: `assets/styles.css` → `assets/css/main.css` → create `assets/styles.css`
- Idempotent. Injects: `.fam-knockout`, `.shadow-on-dark`, `.shadow-on-light`

**Test suite:** `tests/session3-image-tests.js` (40/40 PASS)

### Session 4: Visual Quality Layer

**lib/fam-motion.js:** Scroll animation engine. Data-attribute API: `data-fam-animate` (fade-up/fade-in/slide-left/slide-right/zoom-in/bounce-in), `data-fam-delay`, `data-fam-duration`, `data-fam-repeat`. IntersectionObserver with fallback. Exposes `window.FamMotion`.

**lib/fam-shapes.css:** Pure-CSS shape library. `.fam-starburst` (clip-path, 5 sizes, 7 colors, sharp variant), `.fam-badge`, `.fam-price-tag`, `.fam-wave-top/bottom` (SVG data-URI), `.fam-diagonal-bg`, `.fam-blob`, `.fam-corner-ribbon`.

**lib/character-branding.js:** Character placement pipeline. Functions: `placementsForPage()`, `addPlacement()`, `removePlacement()`, `renderPlacement()`, `characterSummary()`. Exports `POSITION_PRESETS` (8 named positions). Stored in `spec.character_branding[page][]`.

**Server endpoints (Session 4):**
- `POST /api/cdn-inject` — inject CDN tag (validates https:// only, idempotent)
- `DELETE /api/cdn-inject` — remove CDN tag
- `GET /api/cdn-injections` — list CDN injections
- `POST /api/inject-fam-asset` — copy + inject fam-motion.js or fam-shapes.css
- `GET/POST/DELETE /api/character-branding` — character placement CRUD

**CRITICAL: DELETE body parsing:** Node `http.request` requires explicit `Content-Length` header for DELETE requests with body. Always set `'Content-Length': Buffer.byteLength(bodyStr)`.

**Test suite:** `tests/session4-visual-tests.js` (82/82 PASS)

---

**Studio stress test findings** (full detail in `tests/automation/logs/auntie-gale-exhaustive-test.json`):
- Build got stuck due to in-memory `buildInProgress` lock → all 5 pages built via CLI direct write
- Classifier mismatch: brief with data-attribute language routed to `verification` not `planning`
- 7 new gaps discovered and logged (see Known Gaps section)
- 11 Buddy placements confirmed via Playwright screenshots
- 9 starbursts across site
- Live countdown timer working
- Swiper carousel functional with autoplay

---

---

## Studio v3 Engine — Phase 0 + Phase 1 (2026-04-09)

### Phase 0: Content Data Layer

**Classifier upgrades** (`site-studio/server.js` → `classifyRequest()`):
- Expanded `content_update` patterns from 7 to 12 (patterns 1–12 in code)
- New patterns: hero headlines, "make it say", "our hours are now", "fix typo/spelling/wording", hero section text, natural ownership language ("the price is now")
- **Default fallback changed**: `layout_update` → `content_update` (non-destructive). Closes Codex MEDIUM finding. `content_update` routes through `tryDeterministicHandler` before Claude; `layout_update` is plan-gated and can trigger rebuilds.
- Precedence comment updated to match actual code order

**Content field sync** (`syncContentFieldsFromHtml(pages)`):
- Reads all `data-field-id` and `data-field-type` attributes from built HTML pages
- Syncs into `spec.content[page].fields[]` — additive only (never overwrites user edits)
- Also syncs `data-section-id` into `spec.content[page].sections[]`
- Called automatically in `runPostProcessing()` after every full build
- New API: `POST /api/sync-content-fields` — idempotent, on-demand sync for all pages
- 167 fields synced across 5 pages for site-auntie-gale-garage-sales

**Current data layer state** (as of 2026-04-09):
- `data-field-id` + `data-section-id` attributes: in all generated HTML ✅
- `spec.content[page].fields[]`: populated via post-build sync ✅
- Surgical replacement via cheerio `$('[data-field-id]')` selector: in `tryDeterministicHandler()` ✅
- tel:/mailto: href updates on phone/email field edits ✅
- Cross-page edits ("change everywhere"): supported ✅
- `mutations.jsonl` written per successful field edit ✅
- Tests: `tests/phase0-content-layer-tests.js` — 69/69 PASS

### Phase 1: Component Skills Foundation

**Component export** (`POST /api/components/export`):
- **Version tracking**: re-export bumps minor version (1.0 → 1.1 → 1.2); `usage_count` increments; `updated_at` timestamp set; original `created_at` preserved
- **Skill auto-sync** (`syncSkillFromComponent(component)`): every export triggers auto-creation/update of `.claude/skills/components/<type>/SKILL.md`
  - Preserves hand-edited sections (Lessons Learned, When to Use)
  - Tracks usage count and which sites used the component
  - Auto-generates: Required Fields, Required Slots, CSS Variables, HTML template (first 2000 chars)
- **Spec ref**: writes `component_ref: "id@version"` into `spec.content[page].sections[]` so rebuild prompts can reference the component identity
- **library.json** entries now include: `id`, `version`, `css_variables[]`, `used_in[]`, `path`, `description`, `created_at`, `updated_at`, `field_count`, `slot_count`

**Component import** (WebSocket `component_import` handler):
- **CSS variable portability**: reads `component.json` → finds vars missing in target site's styles.css → injects into `:root {}` block (or creates one) before inserting HTML
- HTML comment now includes version: `<!-- Component: id v1.0 (imported from library) -->`
- Records `component_ref` + `imported: true` in `spec.content[targetPage].sections[]` after insertion

**Skill directory**: `.claude/skills/components/` — hero-section, contact-form, pricing-table, testimonial-grid (pre-existing), generic (auto-created on first export)

**Tests**: `tests/phase1-component-skills-tests.js` — 64/64 PASS

---

### Known Gaps (updated 2026-04-09)

- **Stock images in gallery + slideshow (street-family-reunion):** Gallery decade sections use placeholder stock photos. Replace with actual Street family content.
- **Slideshow CSS conflict pattern:** `.slide { display:none }` in page CSS conflicts with slideshow.js crossfade. Always use `display:block !important` in slideshow.js injected styles.
- **Hero video text contrast (street-family-reunion):** "Welcome Home" heading may compete with video. Consider semi-transparent overlay.
- **Activity card images sizing on mobile (street-family-reunion):** 192px image height may feel short on large phones. No fix needed unless flagged.
- **[CLOSED — Session 1] Studio build cancel mechanism:** `setBuildInProgress()` + `POST /api/build/cancel` + 10-min auto-clear + stale lock detection on startup. Cancel button in Studio UI.
- **[CLOSED — Session 1] Studio classifier mismatch for technical briefs:** Strong build signals fire before vocabulary checks. Brief indicator patterns (2+ hits required) catch structured briefs.
- **[CLOSED — Session 2] No CDN library management in Studio UI:** `POST /api/cdn-inject` and `DELETE /api/cdn-inject` handle CDN tag injection/removal. `GET /api/cdn-injections` lists them.
- **[CLOSED — Session 1] No component insertion from library:** `component_import` classifier + handler injects HTML template before `</main>`, updates `used_in[]` in library.json.
- **[CLOSED — Session 4] No decorative shape tools:** `lib/fam-shapes.css` with `.fam-starburst`, `.fam-badge`, `.fam-wave-top`, `.fam-diagonal-bg`, etc. Inject via `POST /api/inject-fam-asset`.
- **[CLOSED — Session 3] Imagen 4 generates white-background images:** `POST /api/remove-background` + `scripts/rembg-worker.py` removes backgrounds and adds `.fam-knockout` CSS classes.
- **[LOW] Preview server not auto-registered on site creation:** Must manually add entry to `.claude/launch.json` after `fam-hub site new`. Auto-registration should be built into site creation flow.
- **[MEDIUM] fam-motion.js + fam-shapes.css not applied on existing pages:** Session 4 tools create server-side endpoints but existing site pages (auntie-gale) have not been rebuilt with motion/shape classes. Would require a content editing pass to add `data-fam-animate` attributes and shape classes to existing HTML.
- **[LOW] character-branding.js not wired to build pipeline:** Character placements stored in spec but not automatically rendered into HTML on rebuild. Currently a post-build overlay system only.
- **[LOW] spec.site_name defaults to "New Site":** Always update immediately after first build. og:title will be wrong until corrected. Future improvement: force user input during site creation.
- **[LOW] rembg CLI binary has cascading dep failures:** filetype, watchdog, aiohttp all missing from Python 3.9 install. Use Python API (`scripts/rembg-worker.py`) — never the CLI binary directly.

---

## Studio v3 Engine — Phase 2 + Phase 3 (2026-04-09)

### Phase 2: UI Shell + Editable Canvas

**Direct REST edit path** (`POST /api/content-field`):
- `openFieldEditor()` `saveBtn.onclick` now calls `fetch('/api/content-field', { method: 'POST', ... })` directly — no AI roundtrip, no classifier, no plan gate
- 404 fallback: `POST /api/sync-content-fields` → retry → text-match chat message (3-step recovery)
- Canvas reloads at 600ms after save (was 2000ms)
- Field edit popup shows field_id, old value, editable textarea, Save / Cancel buttons

**GLOBAL_FIELD_TYPES cascade** (in `POST /api/content-field` handler):
- `const GLOBAL_FIELD_TYPES = ['phone', 'email', 'address', 'hours']`
- When a global-type field is edited, ALL pages are scanned for matching field type or field_id
- Each matching page's HTML is patched with cheerio + spec.content updated
- Response includes `cascade_pages: []` listing all pages that were updated
- This means one phone edit updates every page that shows the phone number

**Mutations log** (`mutations.jsonl`):
- Written by `writeSpec()` on every field edit via `POST /api/content-field`
- Fields: `timestamp`, `level: 'field'`, `target_id: field_id`, `action: 'update'`, `old_value`, `new_value`, `source: 'content_field_api'`
- Stored per-site at `sites/<site-tag>/mutations.jsonl`

**Canvas tab structure** (in `site-studio/public/index.html`):
- `#canvas-tab-bar` with three tabs: Preview (`switchCanvasTab('preview')`), Editable View (`switchCanvasTab('editable')`), Images (`switchCanvasTab('images')`)
- `#canvas-editable` pane with `#editable-frame` (iframe), `#editable-toolbar`, `#highlight-toggle`, `#editable-field-count`
- `injectEditableOverlay()` — injects edit popup script into iframe contentDocument
- `openFieldEditor(fieldId, oldValue, page)` — creates popup overlay on canvas
- `loadEditableView()` — loads `?editable=1` URL in iframe, calls `injectEditableOverlay()`

**CSS**: `site-studio/public/css/studio-canvas.css` — `#canvas-tab-bar`, `.canvas-tab`, `.canvas-tab-active`, `#canvas-editable`, `.field-edit-overlay`, `#editable-frame`

**Tests**: `tests/phase2-ui-shell-tests.js` — 61/61 PASS

---

### Phase 3: Multi-Agent Integration

**Agent call logger** (`logAgentCall({ agent, intent, page, elapsed_ms, success, output_size, error, input_tokens, output_tokens, fallback_from })`):
- Writes append-only to `sites/<site-tag>/agent-calls.jsonl`
- Schema: `{ timestamp, agent, intent, page, elapsed_ms, success, output_size, est_input_tokens, est_output_tokens, est_cost_usd, error, fallback_from }`
- Cost estimation: Claude pricing at $3/1M input tokens + $15/1M output tokens
- `agent` values: `'claude'` (AI build/edit), `'codex'` (compare), `'none'` (deterministic handler, no AI)
- Called in: `finishParallelBuild()` (agent=claude, intent=build), `handleChatMessage()` after `tryDeterministicHandler()` (agent=none), `POST /api/compare/generate-v2` (codex attempt + optional claude fallback)

**HTML quality validator** (`validateAgentHtml(html, page)`):
- Scores 0–100 with penalty system; threshold: `score >= 40` = valid
- Deductions: short output −25 (if < 500 chars, returns immediately), no DOCTYPE/html −25, no data-field-id −25 (none) or −10 (<3), no data-section-id −15, no nav/header −10, no section/main −10, error pattern in first 1000 chars −30, below page-specific minimum (index=10000, contact=5000, default=7000) −15
- Returns `{ valid, score, issues[] }`

**Agent stats endpoint** (`GET /api/agent/stats`):
- Reads `agent-calls.jsonl`, returns: `{ total_calls, failure_count, fallback_count, total_cost_usd, avg_elapsed_ms, by_agent{}, by_intent{}, last_call }`
- `by_agent[name]`: `{ calls, success, failures, total_cost, avg_ms }`
- `by_intent[name]`: `{ calls, agent_split{} }`
- Empty file case returns all-zero response with `failure_count: 0` and `last_call: null`

**Routing guide endpoint** (`GET /api/agent/routing`):
- Returns: `{ routing_guide[], fallback_policy, cost_model }`
- Routing: build=claude, content_update=none, compare=codex (with claude fallback), deploy=none, image_gen=claude, restyle=claude, layout_update=claude, major_revision=claude
- `fallback_policy`: documents Codex→Claude path when score < 40
- `cost_model`: Claude $3/$15 per 1M tokens

**Compare v2 endpoint** (`POST /api/compare/generate-v2`):
- Validation: requires `page` param, page must exist in `dist/` directory
- Tries Codex first (2-minute timeout), validates HTML with `validateAgentHtml()`
- If score < 40 OR Codex fails: falls back to Claude, sets `fallback_from: 'codex'`
- Both Codex attempt and Claude fallback logged via `logAgentCall()`
- Response: `{ url, agent, fallback_from, validation: { valid, score, issues } }` on success; `{ error }` on failure

**Compare canvas UI** (in `site-studio/public/index.html`):
- `#canvas-compare` pane with `#compare-split` layout
- `#compare-frame-left` + `#compare-frame-right` iframes (Claude vs Codex side-by-side)
- `generateCodexVersion()` — calls `/api/compare/generate-v2`
- `useCompareVersion('claude' | 'codex')` — promotes selected version to active dist
- `#compare-sync-scroll` checkbox — synchronized scroll across both iframes
- Codex CLI tab: `switchCliTab('codex')`, `#codex-input`, `#codex-output`, `sendCodexPrompt()`

**Tests**: `tests/phase3-multi-agent-tests.js` — 75/75 PASS

---

## Studio v3 Engine — Phase 4 (2026-04-09)

### Phase 4: Image Browser + Research View

**Image suggestions** (`GET /api/image-suggestions`):
- Reads `spec.design_brief` + `spec.site_name` + `spec.business_type` to generate up to 8 contextual search query suggestions
- Returns `{ suggestions[], business_name, industry }` — no AI, deterministic
- Called automatically when Images tab opens (`loadImageBrowserSlots()`)

**Research trigger** (`POST /api/research/trigger`):
- Takes `{ vertical }` body param (string)
- Sanitizes vertical name to safe slug (lowercase, hyphens only)
- Creates structured markdown research stub at `sites/<site-tag>/research/<vertical>-research.md`
- Idempotent: re-trigger returns existing file without overwriting
- Stub contains: overview, target audience, competitive landscape, website must-haves, recommended queries, key messages
- Returns `{ file, status: 'stub' | 'existing', vertical }`

**Research → brief extractor** (`POST /api/research/to-brief`):
- Takes `{ filename }` body param — validates via allowlist (same security as GET /api/research/:filename)
- Parses "Website Must-Haves" and "Key Messages" sections from markdown
- Returns `{ brief_text, filename, vertical }` — brief_text pre-fills chat input when "Use as Brief" is clicked

**Known verticals registry** (`GET /api/research/verticals`):
- Returns 40+ pre-defined verticals in `known_verticals[]`
- Returns per-site researched files as `researched_verticals[{ vertical, file, modified }]`
- IMPORTANT: Route must be declared BEFORE `GET /api/research/:filename` in server.js to avoid Express route conflict

**Image Browser UI enhancements**:
- `#images-suggested-queries` — row of suggested query chips, auto-loaded on tab open
- `#images-shortlist` sidebar — saves favorite images across searches, apply-to-slot from shortlist
- `#images-compare-pane` — side-by-side A/B comparison slots, activated by Compare toggle button
- `shortlistImage(result)` — adds to shortlist panel
- `clearShortlist()` — empties shortlist panel
- `getSuggestedQueries()` / `renderSuggestedQueries(suggestions)` — fetches and renders chips
- `toggleCompareMode()` — activates compare mode; next two card clicks go to A and B slots
- `selectForCompare(result, cardEl)` — places clicked card into compare slot A or B

**Research UI enhancements**:
- `#research-trigger-form` — vertical input + "Research Vertical" button below file list
- `#research-use-brief-btn` — "Use as Brief →" button, visible when a research file is selected
- `triggerResearch()` — calls `/api/research/trigger`, reloads file list on success
- `useBriefFromResearch()` — calls `/api/research/to-brief`, pre-fills chat input with brief text
- `activeResearchFile` — tracks currently selected research file for brief extraction

**CSS additions** (in `studio-canvas.css`):
- `.suggested-query-chip`, `.suggestions-label` — query suggestion chips
- `#images-shortlist`, `.shortlist-item`, `.shortlist-apply-btn`, `.shortlist-remove-btn` — shortlist panel
- `#images-compare-pane`, `.compare-slot`, `.compare-slot-badge` — compare mode
- `.images-compare-toggle-btn` — compare toggle button in toolbar
- `#research-trigger-form`, `.research-trigger-input`, `.research-trigger-btn` — research form
- `#research-brief-bar`, `.research-use-brief-btn`, `.research-brief-filename` — brief bar

**Tests**: `tests/phase4-image-research-tests.js` — 61/61 PASS (first run, no failures)

---

## Studio v3 Engine — Phase 5 (2026-04-09)

### Phase 5: Intelligence Loop

**Intelligence report generator** (`generateIntelReport()`):
- Reads `agent-calls.jsonl`, `mutations.jsonl`, `build-metrics.jsonl`, `components/library.json` (`.components[]` array)
- Produces structured `findings[]` with: `{ id, category, severity, title, description, recommendation, data }`
- Categories: `agents`, `cost`, `mutations`, `performance`, `components`
- Severities: `critical`, `major`, `minor`, `opportunity`
- Finding IDs are deterministic slugs: `<category>-<slug>-<counter>`
- Key findings generated: Codex fail rate (if ≥50%), high fallback count, Claude cost concentration, hot fields, API-only edits, mutation volume, high-usage components, cross-site components, unused components
- IMPORTANT: `library.json` is `{ version, components[], last_updated }` — must read `.components`, not the root object

**`GET /api/intel/report`** — full report with findings + summary + generated_at + site
**`GET /api/intel/findings`** — findings only + severity counts (critical/major/minor/opportunity)
**`POST /api/intel/promote`** — promotes a finding to `intelligence-promotions.json`:
  - Requires `finding_id` → 400 if missing, 404 if not in current report
  - Writes `{ finding_id, category, severity, title, recommendation, promoted_at, action_taken, status: 'pending' }` to `sites/<tag>/intelligence-promotions.json`
  - Idempotent: re-promoting a finding replaces the existing entry
**`POST /api/intel/run-research`** — creates a research stub at `docs/intelligence-reports/<YYYY-WWW-topic>.md`:
  - Requires `topic` → 400 if missing
  - Stub template includes: topic, research questions, findings placeholder, recommendation, priority checklist
  - To populate with Gemini: `scripts/gemini-cli "<topic>" >> docs/intelligence-reports/<file>`

**Intelligence Loop UI (canvas Intel tab)**:
- `switchCanvasTab('intel')` tab button + `#canvas-intel` pane
- `#intel-toolbar` — research input + Run Research button + Refresh button
- `#intel-summary` — severity pill counts (🔴 Critical, 🟠 Major, 🟡 Minor, 💡 Opportunities)
- `#intel-findings-list` — findings grouped by severity, each with title/description/recommendation/Promote button
- `loadIntelReport()` — fetches `/api/intel/findings`, renders summary + findings
- `renderIntelSummary(data, el)` — renders severity counts row
- `renderIntelFindings(findings, el)` — groups by SEVERITY_ORDER, creates finding cards
- `promoteIntelFinding(findingId, btnEl)` — calls `/api/intel/promote`, updates button state
- `runIntelResearch()` — calls `/api/intel/run-research`, shows file path in chat

**CSS** (in `studio-canvas.css`):
- `#canvas-intel`, `#intel-toolbar`, `#intel-body`, `#intel-summary`
- `.intel-summary-pill`, `.intel-sev-{severity}` — color-coded severity pills
- `.intel-finding`, `.intel-severity-{severity}` — left-border color coded cards
- `.intel-finding-title`, `.intel-finding-desc`, `.intel-finding-rec` — card typography
- `.intel-promote-btn` — promote button with hover state
- `.intel-empty` — empty state message

**Tests**: `tests/phase5-intelligence-loop-tests.js` — 71/71 PASS

---

## Session 7 — Phase 0: Multi-Agent Skeleton Fixes (2026-04-09)

### `scripts/agents`

- `export ORIG_PROMPT` before pipeline entry — was never exported, so adapters always received "unknown" for user turn
- `HISTORY_FILE` support added — optional 3rd positional arg (`$3`) accepted; adapters use it to seed conversation history
- `action_status()` function reads `agent-status.json` per site, prints table
- `action_logs()` function reads `agent-calls.jsonl` per site, prints last 10 exchanges

### `adapters/*/cj-get-convo-*` (all three: claude, gemini, codex)

- `HUB_ROOT` path resolution fixed — all 3 adapters referenced an archived repo path (`~/famtastic-platform/`). Now resolve from `SCRIPT_DIR/../../` relative to the adapter file.
- `HISTORY_FILE` support: if `$HISTORY_FILE` is set and file exists, its contents prepended to prompt
- `ORIG_PROMPT` now available via parent export; used to populate the `user_turn` field in JSONL output

### `scripts/fam-hub`

- AGENTCMD dispatcher fixed: was `AGENT="${2:-}"`, `TAG="${3:-}"` — off-by-one. Now `AGENT="${3:-}"`, `TAG="${4:-}"` (CMD=$1, AGENTCMD=$2, AGENT=$3, TAG=$4)
- `status` subcommand: `fam-hub agent status <tag>` → calls `scripts/agents status <tag>`
- `logs` subcommand: `fam-hub agent logs <tag> [agent]` → calls `scripts/agents logs <tag> [agent]`
- `research` subcommand added (see Phase 4)

### `scripts/generate-latest-convo`

New script. Generates real stats from JSONL sources: reads `agent-calls.jsonl` per site, writes `agents/latest-convo.json` with real timestamps, call counts, agent breakdown. Called by `scripts/cj-reconcile-convo` post-reconcile.

### Deleted files

- `agents/latest-convo.json` — was a static fake file with hardcoded Sept 2025 timestamps
- `convos/canonical/latest-convo.json` — same

**Tests**: `tests/session7-phase0-tests.js` — 66/66 PASS

---

## Session 7 — Phase 1: Universal Context File (2026-04-09)

### `site-studio/lib/studio-events.js`

Singleton EventEmitter with 8 namespaced event constants:

```js
STUDIO_EVENTS = {
  SESSION_STARTED, SITE_SWITCHED, BUILD_STARTED, BUILD_COMPLETED,
  EDIT_APPLIED, COMPONENT_INSERTED, DEPLOY_COMPLETED, BRAIN_SWITCHED
}
```

`studioEvents.setMaxListeners(20)` — prevents Node warning with multiple listeners.
Module exports: `{ STUDIO_EVENTS, studioEvents }`.

### `site-studio/lib/studio-context-writer.js`

`StudioContextWriter` class. Listens to all 8 studio events and regenerates `STUDIO-CONTEXT.md` in `sites/<tag>/` on any event.

STUDIO-CONTEXT.md sections (in order):
1. Title + timestamp
2. Active site tag
3. Event type that triggered regeneration
4. Site brief (from spec.design_brief)
5. Site state (spec.state, spec.domain, spec.deployed_url)
6. Component library (library.json component count + names)
7. Vertical research (Pinecone-first, falls back to listing research/*.md files)
8. Intelligence findings (reads intelligence-promotions.json if present)
9. Available tools (hardcoded capability list)
10. Standing rules (hardcoded FAMtastic conventions)

`new StudioContextWriter(tag)` — constructor takes TAG at server startup. `writer.initialize()` — registers all event listeners + writes initial context.

### `site-studio/lib/brain-injector.js`

`BrainInjector` class. Handles per-brain context file injection.

- Claude: writes `@STUDIO-CONTEXT.md` `@-include` block in Claude system prompt (reads and prepends)
- Gemini/Codex: writes sidecar file `sites/<tag>/STUDIO-CONTEXT-<brain>.md` alongside the adapter prompt

`new BrainInjector(tag, brain)`. `injector.inject(brain)` — writes appropriate file for that brain's integration style.

**Known gap:** When brain switches at runtime, sidecar files are not re-written. Injection only runs at server startup (`setBrain()` does not call `injector.inject()`).

### `site-studio/server.js` — Phase 1 additions

- `require('./lib/studio-events')` + `require('./lib/studio-context-writer')`
- Init block after `server.listen()`: `new StudioContextWriter(TAG).initialize()`
- `GET /api/context` — returns STUDIO-CONTEXT.md contents as `{ context, path, lastModified }`
- `POST /api/context` — triggers manual context regeneration; returns `{ regenerated: true }`
- 7 event emits wired: SESSION_STARTED (server.listen), SITE_SWITCHED (both /api/switch-site handlers), BUILD_COMPLETED (finishParallelBuild), EDIT_APPLIED (POST /api/content-field), DEPLOY_COMPLETED (runDeploy success), COMPONENT_INSERTED (POST /api/components/export), BRAIN_SWITCHED (setBrain)

**Tests**: `tests/session7-phase1-tests.js` — 75/75 PASS

---

## Session 7 — Phase 2: Brain Router UI (2026-04-09)

### `site-studio/public/css/studio-brain-selector.css`

Pill bar UI with per-brain colors:
- `#brain-selector-bar` — flex row above chat form
- `.brain-pill` — base pill; `.brain-pill.active` — highlighted state
- Per-brain active colors: Claude=indigo (`#4f46e5`), Codex=green (`#059669`), Gemini=yellow (`#d97706`)
- `.brain-status-dot` — 8px circle: `.available`=green, `.rate-limited`=yellow, `.unavailable`=red
- `.brain-cost-badge` — small grey pill with cost label
- `.brain-msg-count` — session message count badge
- `#brain-fallback-bar` — amber warning bar shown when auto-fallback fires

### `site-studio/public/js/brain-selector.js`

`BrainSelector` IIFE module:
- `select(brain)` — sends `{ type: 'set-brain', brain }` over WebSocket
- `handleServerMessage(msg)` — routes `brain-changed`, `brain-status`, `brain-fallback` messages; updates pill UI
- `onWsOpen()` — calls `requestStatus()` after 400ms delay to get initial brain state
- `requestStatus()` — sends `{ type: 'get-brain-status' }` over WebSocket
- `getCurrentBrain()` — returns `currentBrain`
- Window-level exports: `window.BrainSelector`, `window.selectBrain`

### `site-studio/server.js` — Phase 2 additions

**Brain state** (module-level vars):
```js
let currentBrain = 'claude';
const BRAIN_LIMITS = {
  claude:  { dailyLimit: null, currentUsage: 0, status: 'available' },
  codex:   { dailyLimit: 40,   currentUsage: 0, status: 'available' },
  gemini:  { dailyLimit: 1500, currentUsage: 0, status: 'available' },
};
const sessionBrainCounts = { claude: 0, codex: 0, gemini: 0 };
```

**`spawnBrainAdapter(brain, prompt)`** — spawns `adapters/{brain}/cj-get-convo-{brain}` with prompt via stdin using `spawnSync`. Returns `{ stdout, stderr, status }`.

**`setBrain(brain, ws)`** — validates brain name, sets `currentBrain`, emits `BRAIN_SWITCHED` event, broadcasts `brain-changed` message to all WebSocket clients.

**`routeToBrainForBrainstorm(prompt, brain)`** — increment `sessionBrainCounts[brain]`, check daily limit, if at limit: set `lim.status = 'rate-limited'`, find fallback (Claude → Codex → Gemini), broadcast `brain-fallback`. Routes to `spawnClaude()` for claude, `spawnBrainAdapter()` for others, with error fallback to claude.

**REST endpoints:**
- `GET /api/brain` — returns `{ currentBrain, limits: BRAIN_LIMITS, sessionCounts: sessionBrainCounts }`
- `POST /api/brain` — validates brain name, calls `setBrain()`, returns new state

**WebSocket handlers** (before chat handler):
- `set-brain` → calls `setBrain(msg.brain, ws)`
- `get-brain-status` → sends `brain-status` with current state

**handleBrainstorm enhanced:**
- Reads up to 80 lines of `sites/<tag>/STUDIO-CONTEXT.md` → `studioCtxSection`
- Prepends `[STUDIO CONTEXT]\n${studioCtxSection}\n[/STUDIO CONTEXT]\n\n` to prompt
- Routes via `routeToBrainForBrainstorm(prompt)` instead of hardcoded `spawnClaude()`

**Known gap:** All build/content-edit paths still use `spawnClaude()` directly. Only brainstorm mode routes through the brain router.

**Tests**: `tests/session7-phase2-tests.js` — 62/62 PASS

---

## Session 7 — Phase 3: Studio Config File (2026-04-09)

### `FAMTASTIC-SETUP.md`

Disaster recovery document at repo root. Sections:
- **Quick Start (New Machine)** — 5-step bash commands to get running from scratch
- **MCP Servers** — 7 servers with config path, status, purpose
- **Claude Code Plugins** — 10 plugins with purpose
- **Environment Variables** — 16 total with Set/Not set status column (auto-updated)
- **Third-Party Accounts/Subscriptions** — 11 accounts with tier/cost info
- **Pinecone Configuration** — index name, dimensions, metric, namespace convention
- **Dependency Versions** — Node, Python, uv, Claude CLI (auto-updated)
- **FAMtastic-Specific Configuration** — studio-config.json keys reference
- **Known Setup Gotchas** — rembg Python API vs CLI, Claude CLI cwd, env var scope
- **fam-hub Commands Reference** — all subcommands with usage examples
- **Architecture Overview** — 1-page system diagram in ASCII

### `scripts/update-setup-doc`

Bash script (chmod +x). Updates FAMTASTIC-SETUP.md in place:
- Replaces "Last Updated:" timestamp with current date
- Replaces "Machine:" hostname with `$(hostname)`
- Replaces Node/Python/uv/Claude version rows with live `$(node --version)` etc.
- Replaces env var status column (Set/Not set) based on current shell environment
- `--commit` flag: stages and commits the update automatically

Run manually: `scripts/update-setup-doc` or `scripts/update-setup-doc --commit`

**Known gap:** Does not auto-parse `claude mcp list` output to update MCP server table. Static table from document creation.

**Tests**: `tests/session7-phase3-tests.js` — 49/49 PASS

---

## Session 7 — Phase 4: Research Intelligence System (2026-04-09)

### `site-studio/lib/research-registry.js`

4 sources in `RESEARCH_REGISTRY`. See Phase 4 report (`docs/session7-phase-4-report.md`) for full detail.

Key facts:
- `perplexity.status = 'disabled'` by default — requires explicit enable + `PERPLEXITY_API_KEY`
- `build_patterns.status = 'active'` always — reads from `.local/` pattern cache
- `gemini_loop.status` depends on `process.env.GEMINI_API_KEY` at module load time
- Effectiveness scores written to `.local/research-effectiveness.json` (gitignored)

### `site-studio/lib/research-router.js`

`queryResearch(vertical, question, options)` — Pinecone-first with 0.85 threshold, 90-day staleness. Calls `logResearchCall()` and `saveEffectivenessScore()` on every query.

**IMPORTANT:** Route ordering critical — `GET /api/research/sources` and `GET /api/research/effectiveness` must be registered BEFORE `GET /api/research/:filename` in server.js. If placed after, Express will route `/sources` and `/effectiveness` as filename lookups and return 404.

### `scripts/seed-pinecone`

Seeding script — safe to run, exits 0 with explanation if `PINECONE_API_KEY` unset. Seeds from `sites/*/spec.json` (design_decisions, site_brief) and `SITE-LEARNINGS.md` sections.

**Tests**: `tests/session7-phase4-tests.js` — 76/76 PASS

---

## Session 7 — Known Gaps (opened 2026-04-09)

- **Brain routing in build path** — `routeToBrainForBrainstorm()` only used in brainstorm mode. All build/content-edit paths call `spawnClaude()` directly. Extending to builds requires parsing HTML_UPDATE responses from non-Claude brains.
- **Real Pinecone embeddings** — `seed-pinecone` uses placeholder zero-vectors. Real `text-embedding-3-small` embeddings required for semantic similarity to work.
- **BRAIN_SWITCHED sidecar re-injection** — `brain-injector.js` runs at startup only. Runtime brain switches do not update sidecar files.
- **Research effectiveness stars UI** — `POST /api/research/rate` exists; client-side rating prompt after build not wired.
- **seed-pinecone manual run** — no automation hook. Must run manually when `PINECONE_API_KEY` is set.
- **update-setup-doc MCP table** — static; does not auto-parse `claude mcp list` output.
- **90-day staleness re-query** — detected but not automatically triggered; only re-queries if another `queryResearch()` call is made.
