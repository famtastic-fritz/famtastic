# FAMtastic Studio QA Audit Report
**Date:** 2026-04-16  
**Auditor:** QA Agent  
**Studio URL:** http://localhost:3334  
**Active site:** site-altitude  
**Server state:** Running on pre-commit code (commits 2b6a7c7, 2b99b6a not loaded)

---

## Phase 1 — Audit Findings

### FINDING 001 — CRITICAL
**Flow:** Sidebar → Recent Sites  
**Expected:** All sites from `sites/` directory shown in "Recent Sites" section (18 directories, ~12 with spec.json)  
**Actual:** "Recent Sites" section is always empty  
**Root cause:** `studio-shell.js` `loadSiteTree()` fetches `GET /api/sites`. The server running does **not** have this endpoint — it was added in commit `2b99b6a` but the server was not restarted. The endpoint returns a `404 HTML` page, the `catch(() => {})` in `loadSiteTree()` silently swallows it, list stays empty.  
**Verified:** `fetch('/api/sites')` → `{ status: 404, ok: false }`

---

### FINDING 002 — CRITICAL
**Flow:** All tab navigation (Preview, Brief, Assets, Deploy)  
**Expected:** Clicking a tab shows that tab's content exclusively  
**Actual:** Chat messages always visible regardless of active tab. Preview/Brief/Assets/Deploy content unreachable without scrolling 377–754px below viewport.  
**Root cause:** `#tab-pane-chat` and `#tab-pane-preview` both have inline `style="display:flex;flex-direction:column;height:100%;overflow:hidden;"`. The CSS rule `.ws-tab-pane.hidden { display: none; }` is overridden by the inline `display:flex`. When `switchTab()` adds `.hidden` class to these panes, they still render at full height. The `canvas-area` container is `display:block` — panes stack vertically. Chat (377px) + Preview (377px) = 754px of invisible-but-present panes above all other tab content.  
**Verified DOM state (Deploy tab active):**
```
tab-pane-chat:    hidden=true, computedDisplay=flex, height=377  ← BLOCKING
tab-pane-preview: hidden=true, computedDisplay=flex, height=377  ← BLOCKING
tab-pane-deploy:  hidden=false, height=377                        ← content exists, pushed 754px down
```
**Affected tabs:** Preview, Brief, Assets, Deploy — all four are unreachable.

---

### FINDING 003 — HIGH
**Flow:** Shay-Shay → Worker queue message → Dismiss  
**Expected:** Clicking "Dismiss" clears the message and action buttons from the Shay-Shay column  
**Actual:** Dismiss click does nothing visible. Message and buttons persist.  
**Root cause:** The `Dismiss` action calls `closeCallout()`. That function targets `#pip-callout-msg` and `#pip-callout-actions` (the old floating callout elements). But `showMessage()` was overridden in a later code block to route messages to `#pip-response-area` and `#pip-action-row` (the column elements). `closeCallout()` clears the wrong elements — the floating callout was already hidden. Column content is never cleared.  
**Verified:** After Dismiss click — `#pip-response-area` still shows "4 tasks pending...", `#pip-action-row` still shows "View queue" / "Dismiss" buttons.

---

### FINDING 004 — MEDIUM
**Flow:** Shay-Shay validation panel  
**Expected:** Validation panel header reflects the currently active site  
**Actual:** Panel reads "Studio UI Validation — STREET-FAMILY-REUNION" when active site is site-altitude  
**Root cause:** Validation plan is stored globally at `site-studio/validation-plan.json` (one file, shared across all sites). The `title` field is hardcoded as "Studio UI Validation — street-family-reunion" from when it was created. No per-site scoping exists.  
**Verified:** `GET /api/validation-plan` → `{ "title": "Studio UI Validation — street-family-reunion", "status": "not_started" }`

---

### FINDING 005 — MEDIUM
**Flow:** Live preview renders after build  
**Expected:** Preview iframe loads site with all assets including animations  
**Actual:** Console shows 404 errors for `fam-motion.js` and `fam-scroll.js` on preview port 3333  
**Root cause:** `fam-motion.js` is not found in the `site-studio/lib/` or any path served by the preview server (port 3333). Generated site HTML references these files at the root of the preview domain but they are not served there.  
**Verified:** `GET http://localhost:3333/fam-motion.js` → 404, `GET http://localhost:3333/fam-scroll.js` → 404

---

### FINDING 006 — LOW
**Flow:** Studio loads  
**Expected:** No avoidable 404 errors on load  
**Actual:** `GET /favicon.ico` → 404  
**Root cause:** No favicon.ico served by the Studio server  
**Impact:** Cosmetic only. No functional impact.

---

### PASSING FLOWS

| Flow | Result | Notes |
|------|--------|-------|
| Studio loads | ✅ PASS | Title correct, WS connects, chat messages visible |
| Restart banner default state | ✅ PASS | `display:none`, `pointer-events:none` — banner fix works |
| Chat tab shows messages | ✅ PASS | Chat history visible, input focused |
| Shay-Shay routing: hello | ✅ PASS | tier 1, conversational response |
| Shay-Shay routing: restart studio | ✅ PASS | tier 0, `action: system_command` |
| Shay-Shay routing: brainstorm signal | ✅ PASS | tier 0, `action: suggest_brainstorm`, topic extracted |
| + New Site button UI | ✅ PASS | Clicking it hides button, shows inline form with tag input + Cancel |
| Validation dismiss (step prompt) | ✅ PASS | `× Dismiss` action exists, calls `dismissStepPrompt()`, no step marked |
| Sidebar Pages list | ✅ PASS | index, experience, reserve visible for site-altitude |
| Site name in breadcrumb | ✅ PASS | `site-altitude / index.html` correct |
| Status bar | ✅ PASS | Model, cost, duration all visible |

---

## Console Errors Summary
```
404  /favicon.ico                         (low)
404  http://localhost:3333/fam-motion.js  (medium)
404  http://localhost:3333/fam-scroll.js  (medium)
404  /api/sites                           (critical — from loadSiteTree())
```

---

## Sites Directory Contents (18 total, ~12 with spec.json expected)
```
auntie-gale-garage-sales    guys-classy-shoes      poc-site
readings-by-maria           readings-by-maria-codex site-altitude (active)
site-auntie-gale            site-auntie-gale-garage-sales
site-demo                   site-drop-the-beat     site-groove-theory
site-guys-classy-shoes      site-lawn-company      site-readings-by-maria
site-street-family-reunion  site-test-restructure  site-the-best-lawn-care
the-best-lawn-care
```
Directories without `site-` prefix likely lack `spec.json` and won't appear after fix.

