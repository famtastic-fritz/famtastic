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

## Recommendations (ordered by business impact)

1. ~~**Get to first deployed client site.**~~ Done (2026-03-20). "The Best Lawn Care" — 7-page site deployed to https://the-best-lawn-care.netlify.app
2. ~~**Delete dead code.**~~ Done (2026-03-12).
3. **Build client-facing access.** Chat studio runs on localhost — need a way for clients to see/approve.
4. ~~**Consolidate repos.**~~ Done (2026-03-12). 4 → 1.
5. **Add basic tests.** Zero test coverage across ~4,000 lines. Even smoke tests would help.
6. **Platform dashboard comes after 10+ sites.** Don't build the control panel before there's data to display.

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
