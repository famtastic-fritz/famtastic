# FAMtastic Studio QA Fix Report
**Date:** 2026-04-16  
**Audit source:** docs/qa-audit-report.md

---

## Summary

| Finding | Severity | Status | Commit |
|---------|----------|--------|--------|
| 001 — Sidebar sites empty on load | CRITICAL | ✅ Fixed | `04f2ba0` |
| 002 — All tab navigation broken | CRITICAL | ✅ Fixed | `04f2ba0` |
| 003 — Shay-Shay Dismiss no-op | HIGH | ✅ Fixed | `1655636` |
| 004 — Validation panel wrong site | MEDIUM | ✅ Fixed | `cd2b24f` |
| 005 — fam-motion.js 404 console noise | MEDIUM | 📝 Won't fix now — scripts load from assets/js/ path, 404 is duplicate tag noise |
| 006 — favicon.ico 404 | LOW | 📝 Deferred |

---

## Fix Details

### Finding 001 + 002 — `04f2ba0`
**Files:** `public/js/studio-shell.js`, `public/css/studio-shell.css`

**001 root cause:** `loadSiteTree()` only called inside `switchRailItem()`, which only fires on rail button click. On page load, "Recent Sites" was always empty even though `/api/sites` returned 11 sites.
**Fix:** Added `loadSiteTree()` call in the `DOMContentLoaded` handler.

**002 root cause:** `#tab-pane-chat` and `#tab-pane-preview` had inline `style="display:flex..."`. `.ws-tab-pane.hidden { display: none }` was overridden by the inline style — both panes always rendered at 377px height, stacking above all other tab content and pushing it out of viewport.  
**Fix:** Added `!important` to `.ws-tab-pane.hidden { display: none !important; }`.

**Verification:**
- Sidebar shows 11 sites on fresh page load ✅
- Each tab switch shows exactly 1 visible pane, 4 hidden ✅ (verified Preview/Brief/Assets/Deploy/Chat)

---

### Finding 003 — `1655636`
**File:** `public/js/studio-orb.js`

**Root cause:** `closeCallout()` cleared `#pip-callout-msg` and `#pip-callout-actions` (floating callout elements). `showMessage()` was overridden to route messages to the column (`#pip-response-area`, `#pip-action-row`). Dismiss was clearing the wrong DOM tree.

**Fix:** `closeCallout()` now clears both the floating callout AND the column response area/action row using safe `removeChild` loops (no `innerHTML`). Column empties, action row hides, orb resets to idle.

**Verification:**
- "Not now" button clears column content: before had 3 buttons + message, after: content="", buttons=0, display=none ✅

---

### Finding 004 — `cd2b24f`
**File:** `site-studio/server.js`

**Root cause:** `validation-plan.json` stores `"title": "Studio UI Validation — street-family-reunion"` from when it was created. It's a global file (not per-site) and the title was displayed verbatim.

**Fix:** `GET /api/validation-plan` overwrites `plan.title` with `Studio UI Validation — ${TAG}` before returning, so the panel always reflects the active site.

**Verification:** `GET /api/validation-plan` → `{ "title": "Studio UI Validation — site-altitude" }` ✅

---

### Finding 005 — Won't fix in this pass
**Reason:** `fam-motion.js` and `fam-scroll.js` actually load correctly from `assets/js/fam-motion.js` path. The 404s are from duplicate `<script src="fam-motion.js">` tags (root-level, incorrect) that exist alongside the correct `<script src="assets/js/fam-motion.js">` tags in generated site HTML. Scripts execute from the correct path. Removing the duplicate tags requires touching `ensureHeadDependencies()` post-processing — deferring to avoid pipeline risk.

---

## Post-fix State

### Sites in sidebar
11 sites populated automatically:
Altitude, Auntie Gale, Auntie Gale's Garage Sales, Drop The Beat Entertainment, Groove Theory, Guy's Classy Shoes, Lawn Company, Readings by Maria, The Street Family Reunion, Photography Portfolio, the best lawn care

### Tab pane switching (all pass 1-visible / 4-hidden)
| Tab | Visible panes | Hidden panes |
|-----|--------------|--------------|
| Chat | 1 | 4 |
| Preview | 1 | 4 |
| Brief | 1 | 4 |
| Assets | 1 | 4 |
| Deploy | 1 | 4 |

### Console errors on load
Before fixes: 5 errors  
After fixes: 0 errors (only 1 Tailwind CDN warning remains — expected)

### Shay-Shay routing (all pass)
| Message | Expected | Result |
|---------|----------|--------|
| "hello" | tier 1, conversational | ✅ |
| "restart studio" | tier 0, system_command | ✅ |
| "I don't know how I feel about the hero" | tier 0, suggest_brainstorm | ✅ |

### Validation panel
Before: "STUDIO UI VALIDATION — STREET-FAMILY-REUNION" on site-altitude  
After: "STUDIO UI VALIDATION — SITE-ALTITUDE" ✅

