# Platform Audit Report
## Date: 2026-04-17
## Scenarios tested: 7
## Auditor: QA Agent (Claude Code)
## Session: site-altitude active, server session #21

---

## CRITICAL FINDINGS (blocks core workflow)

### C-01: Fresh Mode Build Fires Against Active Site, Not New Site
**Scenario:** 1 — New Site from Scratch  
**Expected:** Clicking "Build this site →" in fresh mode (new site interview) creates a new site for Mario's Pizza, then builds it  
**Actual:** `buildFromBrief()` checks `isNewSiteContext = !currentTag || currentTag === '' || currentTag === 'undefined'`. Since `window.config.tag = "site-altitude"` (truthy, not empty/undefined), the check evaluates `false` and falls through to `fireBuildMessage()` which sends "Build from brief" to the **current active site** (site-altitude), not to a new Mario's Pizza site.  
**Evidence:** After clicking build, `siteTagAfterBuild: "site-altitude"`, `lastChatMsg` showed site-altitude welcome message, chat history didn't clear for new site.  
**Severity:** CRITICAL  
**Root cause:** `buildFromBrief()` in `studio-brief.js` uses the wrong condition to detect "new site context." The condition must check `freshMode` flag instead of checking `config.tag`.  
**File:** `site-studio/public/js/studio-brief.js` — `buildFromBrief()` function, line ~389  
**Fix required:** Replace `var isNewSiteContext = !currentTag || currentTag === '' || currentTag === 'undefined'` with `var isNewSiteContext = freshMode`  
**Screenshot:** `docs/screenshots/audit-02-brief-complete.png`

---

### C-02: Server Stability — Crashed During Audit Run
**Scenario:** 1 (occurred mid-scenario)  
**Expected:** Server stays running through normal UI interactions  
**Actual:** During the first audit run, the server dropped connection with `net::ERR_CONNECTION_REFUSED` errors to both port 3333 and 3334. API calls to `/api/interview/status` and `/api/interview/start` both returned connection refused. Server required manual restart.  
**Evidence:** Console log entries at ~35s mark showed WS disconnect, all subsequent API calls failed.  
**Severity:** CRITICAL  
**Root cause hypothesis:** Unknown trigger — possibly related to the `POST /api/new-site` being called while fresh mode was active and the site-altitude context was live. OR memory/process issue. Needs investigation.  
**File:** `site-studio/server.js` — startup/teardown stability  
**Screenshot:** N/A (server was down)

---

## HIGH FINDINGS (significant friction)

### H-01: Deploy Pre-Flight UI Shows ALL ✗ Regardless of Actual Check Status
**Scenario:** 6 — Deploy Flow  
**Expected:** Pre-flight check list shows ✓ for passing checks, ✗ for failing, ⚠ for warnings  
**Actual:** All 5 pre-flight items show ✗ in the deploy pane. API `/api/verify` returns 3 passed, 1 failed, 1 warned. The UI is not reading status from the API — it renders static ✗ marks regardless.  
**Evidence:**  
- `uiXCount: 5, uiCheckCount: 0` (zero checkmarks in entire deploy pane)  
- API: `passCount: 3, failCount: 1, warnCount: 1`  
**Severity:** HIGH — deploy decisions are made on incorrect data  
**Root cause:** The deploy pane HTML is a static template. The JS that should dynamically populate pre-flight status from `/api/verify` is either not running or using static markup. `#deploy-status-area` returned `EMPTY` — no content loaded dynamically.  
**Files:** `site-studio/public/index.html` (deploy pane template), likely missing `refreshDeployInfo()` or `loadVerifyResults()` call  
**Screenshot:** `docs/screenshots/audit-03-deploy-tab.png`

---

### H-02: Deploy Pane Shows No Live Data (FAMtastic Score, Lighthouse, Pipeline Status)
**Scenario:** 6 — Deploy Flow  
**Expected:** Deploy pane shows real FAMtastic Score (e.g. 3/5), Lighthouse score, deploy pipeline status  
**Actual:** `#deploy-status-area` content is EMPTY. No FAMtastic Score, no Lighthouse score, deploy pipeline shows "Waiting" for all steps with no data loading. `hasFAMtasticScore: false`, `hasLighthouse: false`.  
**Evidence:** `deployStatusAreaContent: "EMPTY"`, `deployInfo` API works fine (returns correct local/staging/production data)  
**Severity:** HIGH — deploy pane is visually non-functional  
**Root cause:** `refreshDeployInfo()` function exists in index.html but is a no-op (`function refreshDeployInfo() {}`). FAMtastic score is computed by `/api/verify` but never injected into the deploy pane. Lighthouse score integration not implemented.  
**Files:** `site-studio/public/index.html` — `refreshDeployInfo()` stub, deploy pane template

---

### H-03: Shay-Shay Brief Data Persists After Site Switch
**Scenario:** 2 — Site Switching  
**Expected:** When switching sites, Shay-Shay's dynamic area resets to placeholder or shows new site's data  
**Actual:** After completing the fresh-mode Mario's Pizza interview on site-altitude, then switching to site-guys-classy-shoes and back to site-altitude, the Shay-Shay dynamic area still shows "BRIEF / 100% complete / Business: Mario's Pizza / Revenue: lead_generation" from the old interview.  
**Evidence:** Screenshot `audit-03-deploy-tab.png` shows Mario's Pizza data in right column while on site-altitude  
**Severity:** HIGH — misleading context data for the wrong site  
**Root cause:** The `studio:site-changed` listener in `studio-orb.js` calls `showPlaceholder()` but only on non-brief dynamic content. The `pip:brief-updated` event from the fresh-mode interview wrote to the dynamic area and this state persists across site switches because it's not explicitly cleared by the site-changed handler when brief mode was last active.  
**Files:** `site-studio/public/js/studio-orb.js` — `studio:site-changed` listener (~line 764)

---

### H-04: Image Pipeline Not Triggering — Zero Images on Built Sites
**Scenario:** 4 — Image Pipeline  
**Expected:** "Add a hero background image of an Italian restaurant" triggers stock photo fill, downloads image, places in hero slot  
**Actual:** Request classified as `content_update`, routed to Claude which flagged a brand conflict (correctly: Altitude is a rooftop bar, not Italian restaurant). No `fill_stock_photos` intent triggered. `mediaSpecCount: 0`, `uploadCount: 0`, assets directory has no images.  
**Evidence:**  
- `/api/studio-state` returns `media_specs: {}` — no image slots registered  
- `sites/site-altitude/dist/assets/` contains only: css/, js/, logo-*.svg, styles.css — no images  
- 5 `data-slot-status` attributes found in HTML but spec.json has no `media_specs`  
**Severity:** HIGH — image placement is broken or never initialized  
**Root cause (hypothesis):** Either (1) `extractAndRegisterSlots()` in `runPostProcessing()` failed to populate `spec.media_specs`, OR (2) site-altitude was never fully built through the post-processing pipeline. The HTML contains slot attributes but spec.json doesn't reflect them.  
**Files:** `site-studio/server.js` — `extractAndRegisterSlots()`, `runPostProcessing()` step 1  
**Additional note:** Even if slots were registered, requesting an Italian restaurant image on a rooftop bar site would be blocked by Claude's brand protection — which is correct behavior. A better test would be "add the hero skyline background photo" on the Altitude site.

---

### H-05: Build Button Location — Only in Shay-Shay Column, Not in Brief Canvas
**Scenario:** 1 — New Site  
**Expected:** After completing the 6-step brief interview in the canvas, a "Build this site →" button appears in the canvas pane  
**Actual:** `buildBtnInCanvas: false`. The `#brief-build-btn` element does not exist in the canvas. The build button exists only in Shay-Shay's dynamic area (`buildBtnInShayShay: true`). Fritz must look right to find the build button.  
**Evidence:** After submitting all 6 answers, the canvas still shows "Step 6 of 6" with "Finish →" — the canvas never transitions to a "complete + build" state. The build button only appears in the Shay-Shay column sidebar.  
**Severity:** HIGH — discoverability issue, workflow completion is non-obvious  
**Root cause:** The brief panel was moved from the canvas to the Shay-Shay dynamic area in a recent commit. The canvas brief pane has no `renderBriefPanel()` call anymore — it only renders the question column. The build button was previously in `renderBriefPanel()`.  
**Files:** `site-studio/public/js/studio-brief.js` — `renderInterviewShell()`, `updateBriefPanel()` → now dispatches events instead of rendering

---

## MEDIUM FINDINGS (noticeable, workaround exists)

### M-01: Hidden Duplicate `#new-site-btn` in Dropdown
**Scenario:** 7 — Duplicate Button Hunt  
**Expected:** One visible "+ New Site" button  
**Actual:** Two "+ New Site" buttons exist: (1) `#new-site-btn` inside the now-removed sidebar site form — invisible (0x0 dimensions), never clickable. (2) `.top-bar-btn.primary` in the top bar — visible and works correctly.  
**Severity:** MEDIUM — dead UI element consuming DOM  
**Root cause:** `#new-site-btn` was left in the sidebar pane from a previous layout iteration. The `showNewSiteDialog()` function referenced by the sidebar button now opens the Brief tab, but the button is hidden inside the project picker dropdown.  
**Files:** `site-studio/public/index.html` — sidebar site pane HTML

---

### M-02: Duplicate "Rebuild" Buttons
**Scenario:** 7 — Duplicate Button Hunt  
**Expected:** One rebuild action in the UI  
**Actual:** Two "Rebuild" buttons: (1) Red "Rebuild" button in workspace topbar (top right) — calls `rebuildSite()`. (2) "↺ Rebuild" button in toolbar tools-row — also calls `rebuildSite()`. Both visible, both functional, same function.  
**Severity:** MEDIUM — UI clutter, confusing hierarchy  
**Root cause:** The topbar Rebuild button was added as a primary action and the tools-row Rebuild button was never removed from the toolbar.  
**Files:** `site-studio/public/index.html` — workspace-topbar + tools-row  
**Screenshot:** `docs/screenshots/audit-01-initial-load.png`

---

### M-03: Duplicate "Brief" Buttons
**Scenario:** 7 — Duplicate Button Hunt  
**Expected:** One way to open Brief from the current view  
**Actual:** Two "Brief" buttons: (1) `sidebar-nav-item` in WORKSPACE section of sidebar. (2) `tool-btn` in toolbar tools-row. Both open the Brief tab — same function, two places.  
**Severity:** MEDIUM — minor, but inconsistent  
**Root cause:** Toolbar buttons were not cleaned up when sidebar nav was added.  
**Files:** `site-studio/public/index.html`

---

### M-04: View Mode Switches to "preview" After Any Edit
**Scenario:** 3 — Content Edit  
**Expected:** After a surgical edit, user stays in Chat view  
**Actual:** `viewModeAfter: "preview"` — the view automatically switches to Preview mode after any successful edit. `expandPreviewIfHidden()` is called on every `reload-preview` WS event, which calls `setViewMode('preview')`.  
**Severity:** MEDIUM — unexpected context switch disrupts chat flow  
**Root cause:** `expandPreviewIfHidden()` was changed to always call `setViewMode('preview')` rather than only expanding if collapsed. Every build or edit now hijacks the view.  
**Files:** `site-studio/public/index.html` — `expandPreviewIfHidden()` function

---

### M-05: `textarea.value` Without Input Event Doesn't Submit Brief Answer
**Scenario:** 1 — New Site (discovered during test automation)  
**Expected:** Setting textarea value via code submits the answer  
**Actual:** The brief interview uses `input.value.trim()` on submit — which works — but if value is set programmatically without a change/input event, the selectedChip doesn't reset. The step 6 "Finish →" click submitted with `value = ''` if the textarea.value wasn't set via proper DOM events.  
**Severity:** MEDIUM — affects any automation/testing of the brief flow  
**Root cause:** `selectedChip || input.value.trim()` — the selectedChip from a previous step could conflict.  
**Files:** `site-studio/public/js/studio-brief.js` — `renderQuestion()` next button click handler

---

### M-06: Console Errors on Every Load (fam-motion.js, fam-scroll.js 404)
**Scenario:** All scenarios  
**Expected:** 0 console errors on page load  
**Actual:** 2 persistent 404 errors on every page load: `http://localhost:3333/fam-motion.js` and `http://localhost:3333/fam-scroll.js`. These are duplicate script tags injected at root-level in generated site HTML. The scripts DO load from `assets/js/` (correct path), but duplicate root-level references always 404.  
**Severity:** MEDIUM — noise in console, minor performance  
**Root cause:** `ensureHeadDependencies()` injects `fam-motion.js` at root level AND at `assets/js/` path, creating duplicates.  
**Files:** `site-studio/server.js` — `ensureHeadDependencies()`

---

## LOW FINDINGS (polish)

### L-01: Preview "Hide ▶" Button in Preview Mode Header Reads Backwards
**Scenario:** 7 — visual scan  
**Expected:** "Show Preview ◀" when preview is visible (to suggest you can hide it)  
**Actual:** Button shows "Hide ▶" when in preview mode, "Show Preview ◀" when hidden — arrows point left in both states (◀) when preview is showing, which implies "collapse left" but the button triggers a full toggle.  
**Severity:** LOW  
**Files:** `site-studio/public/index.html` — `setViewMode()`

---

### L-02: Shay-Shay Capability Manifest Shows "Gemini" Available (API Key Leaked/Invalid)
**Scenario:** 5 — Shay-Shay  
**Expected:** Gemini shown as unavailable  
**Actual:** `what's broken right now` response included "Working: gemini_api" but startup logs show `[403 Forbidden] Your API key was reported as leaked`. The capability manifest incorrectly marks it as available when env var exists but API is actually broken.  
**Severity:** LOW — misleading status  
**Files:** `site-studio/lib/capability-manifest.js` — `checkGeminiKey()` only checks env var, not actual API response

---

### L-03: Chat History Not Cleared on Site Switch
**Scenario:** 2 — Site Switching  
**Expected:** Chat history clears when switching sites (shows new site context)  
**Actual:** Previous site's chat messages remain visible after switching. Only a new "Welcome back! Session #N for [tag]" message is appended.  
**Severity:** LOW — the welcome message signals the switch, but old messages remain  
**Files:** `site-studio/public/index.html` — `handleSiteSwitch()` doesn't clear `#chat-messages`

---

## IMAGE PIPELINE DIAGNOSIS

### Root cause chain:
1. **Site-altitude has no `media_specs` in spec.json** — `mediaSpecCount: 0`
2. **HTML has 5 `data-slot-status` attributes** (confirmed via grep) — slots exist in HTML
3. **`extractAndRegisterSlots()` was not called or failed** — Step 1 of `runPostProcessing()` should populate `spec.media_specs` from these slot attributes, but spec.json shows empty
4. **Result:** `fill_stock_photos` intent has nothing to fill — it requires `spec.media_specs` entries to know which slots to target

### Stock photo pipeline would work IF:
- `spec.media_specs` had entries (slots registered)
- Stock photo API credentials were configured
- An appropriate image request matched the site's vertical (Italian restaurant ≠ rooftop bar)

### What actually happened when image was requested:
1. Message classified as `content_update` (not `fill_stock_photos`)
2. Routed to Claude
3. Claude correctly flagged brand conflict (Altitude is a rooftop bar, not Italian restaurant)
4. No image placed — **correct behavior for wrong request**
5. Image pipeline was never reached because classifier didn't route there

### Correct trigger for image pipeline:
- Must use phrases like "add images", "fill in stock photos", "add images to all slots" to trigger `fill_stock_photos` intent
- Specific image requests go to Claude as content edits

---

## DUPLICATE BUTTON MAP

| Button Text | Count | Locations | Same function? |
|-------------|-------|-----------|----------------|
| `+ New Site` | 2 | Top bar (visible ✓) + Sidebar dropdown (hidden, 0x0 ✗) | No — sidebar is dead |
| `Rebuild` | 2 | Workspace topbar (top-right, always visible) + Toolbar tools-row | Yes — both call `rebuildSite()` |
| `↺ Rebuild` | 1 | Toolbar only | Same as above |
| `Brief` | 2 | Sidebar WORKSPACE nav item + Toolbar tools-row button | Yes — both call `StudioShell.switchTab('brief')` |
| `Preview` | 1 | Tab bar toggle (right side) | Unique |
| `Build` | 1 | Mode selector (Build/Review/Brainstorm) — NOT a build trigger, it's mode switch | Unique function |
| `Chat` | 1 | Tab bar toggle (right side) | Unique |
| `Assets` | 2 | Sidebar nav item + Toolbar tools-row | Yes — both open assets tab |
| `Deploy` | 2 | Sidebar nav item + Sidebar deploy pane rail button | Both open deploy — sidebar nav is primary |

---

## ROOT CAUSE PATTERNS

### Pattern 1: Stale layout artifacts (5 findings)
The UI has been restructured multiple times. Old buttons, panels, and state from previous layouts remain as dead code:
- `#new-site-btn` (old sidebar placement)
- Toolbar "Brief" and "Assets" buttons (redundant with sidebar nav)
- Second "Rebuild" button in toolbar
- `renderBriefPanel()` call removed but canvas pane expects it

### Pattern 2: No-op stub functions (2 findings)  
Functions defined as empty stubs never implemented:
- `refreshDeployInfo() {}` — deploy pane never loads live data
- `function refreshBlueprint() {}`, `function refreshMetrics() {}` — all no-ops

### Pattern 3: Event-based state doesn't survive context switches (2 findings)
State written via custom events (`pip:brief-updated`) persists beyond its scope:
- Mario's Pizza brief shown in Shay-Shay after switching back to site-altitude
- `_currentViewMode` switches to 'preview' after every build (unexpected side effect)

### Pattern 4: Fresh mode / existing site logic gap (1 critical finding)
The fresh-mode brief interview was designed to work before a site exists, but `buildFromBrief()` uses `config.tag` instead of `freshMode` to detect this state. A loaded `config.tag` (always set for any page load) always short-circuits the "create new site" path.

### Pattern 5: Spec.json not synchronized with HTML (1 finding)
`spec.media_specs` is empty despite HTML having `data-slot-status` attributes. The `extractAndRegisterSlots()` pipeline step either didn't run or failed silently for site-altitude, leaving the image pipeline with no slots to target.

---

## RECOMMENDED FIX ORDER

### Immediate (blocks building new sites)
1. **C-01** — `buildFromBrief()` fresh mode check: change condition from `!currentTag` to `freshMode` — 1 line fix
2. **H-05** — Restore build button in canvas brief pane OR add clear instruction pointing to Shay-Shay — UX critical

### High priority (affects daily use)
3. **H-01 + H-02** — Deploy pane live data: implement `refreshDeployInfo()` to call `/api/verify` and render results with correct ✓/✗/⚠ icons. Add FAMtastic score and pipeline status display
4. **H-03** — Site switch clears brief data: in `studio:site-changed` listener, also reset dynamic area if it contains brief data
5. **M-04** — `expandPreviewIfHidden()`: only expand if actually hidden, don't force `setViewMode('preview')`

### Medium priority (cleanup)
6. **M-01/M-02/M-03** — Remove dead `#new-site-btn`, one of the two "Rebuild" buttons, toolbar "Brief" and "Assets" buttons
7. **H-04** — Register image slots for site-altitude: trigger `POST /api/sync-content-fields` to rebuild spec from HTML
8. **L-02** — Capability manifest: verify API key is actually working before marking as available

### Low priority (polish)
9. **M-06** — Fix duplicate fam-motion.js script tags in generated HTML
10. **L-03** — Clear chat history on site switch (optional — welcome message may be sufficient)

---

## SCENARIO PASS/FAIL SUMMARY

| Scenario | Pass | Fail | Notes |
|----------|------|------|-------|
| 1 — New Site | Partial | Yes | Brief launches ✓, all 6 steps ✓, Shay-Shay live update ✓, Build fires to WRONG site ✗ |
| 2 — Site Switching | Partial | No | Switch works ✓, brief data persists in Shay-Shay ✗ |
| 3 — Content Edit (Surgical) | PASS | — | Surgical editor fires, no AI call, preview updates |
| 4 — Image Pipeline | N/A | Yes | No image slots registered, pipeline never reached |
| 5 — Shay-Shay Routing | PASS | — | All 5 routing tests pass |
| 6 — Deploy Flow | Fail | Yes | Pre-flight all ✗ in UI, deploy-status-area empty |
| 7 — Duplicate Buttons | Audit | — | 5+ duplicate/dead buttons found |

