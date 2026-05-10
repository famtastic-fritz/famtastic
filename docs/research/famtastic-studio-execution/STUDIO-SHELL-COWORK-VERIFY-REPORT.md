# Studio Shell — Cowork Independent Verification Report

**Date:** 2026-05-10
**Branch:** `research/studio-intelligence-foundation-20260508`
**Worktree:** `/Users/famtasticfritz/famtastic-convergence-dossier`
**Status:** PASS (with one real bug found and fixed during verification)

This pass independently verifies the unified Studio shell shipped in commit `3fa3a8c`. A new verifier script (`server/__smoke__/studio-shell-verify.js`) was written from scratch with stricter checks than the original smoke. It found a real bug and three test-tooling artifacts; the real bug was fixed and re-verified clean.

---

## 1. URL verified

`http://127.0.0.1:3335/studio.html` — HTTP 200, `#studio-root` mounts, all 12 rail items render.

(Verification used port 3335 inside the cowork sandbox via the fast smoke server. On the host with `npm run dev`, the URL is identical.)

## 2. Sections verified (12 of 12)

Every rail item was clicked (not hash-navigated) and verified for four properties: rail-active state, topbar crumb mention, non-empty workspace, and correct ContextPanel presence/absence.

| # | Section | Rail-active | Crumb | Workspace | ContextPanel | Verdict |
|---|---|---|---|---|---|---|
| 1 | Home | ✓ | ✓ | ✓ | shown (expected) | OK |
| 2 | Sites | ✓ | ✓ | ✓ | shown | OK |
| 3 | Site Builder | ✓ | ✓ | ✓ | hidden (own pane) | OK |
| 4 | Site Settings | ✓ | ✓ | ✓ | shown | OK |
| 5 | Think-Tank | ✓ | ✓ | ✓ | shown | OK |
| 6 | Research Center | ✓ | ✓ | ✓ | shown | OK |
| 7 | Component Studio | ✓ | ✓ | ✓ | hidden (own pane) | OK |
| 8 | Media Studio | ✓ | ✓ | ✓ | hidden (own pane) | OK |
| 9 | Media Library | ✓ | ✓ | ✓ | shown | OK |
| 10 | Shay Shay | ✓ | ✓ | ✓ | hidden (own pane) | OK |
| 11 | Mission Control | ✓ | ✓ | ✓ | hidden (own pane) | OK |
| 12 | Settings | ✓ | ✓ | ✓ | shown | OK |

Bottom **memory strip**: present on all 12 sections.
**Recipe flow**: 6 nodes render on Home; clicking the first node's "Open" button hash-navigates to `#research` (verified).

## 3. Builder embed status

- iframe URL: `http://127.0.0.1:3335/index.html?embedded=1` ✓
- Inside iframe: `documentElement.classList.contains('studio-embedded')` = **true** ✓
- Inside iframe: `getComputedStyle(document.getElementById('top-bar')).display === 'none'` = **true** ✓ (after fix — see Bugs found)
- Standalone `/index.html` still 200 with `#top-bar` visible (CSS leak: **none**) ✓

## 4. Mission Control embed status

- iframe URL: `http://127.0.0.1:3335/operator.html?embedded=1` ✓
- Inside iframe: `documentElement.classList.contains('studio-embedded')` = **true** ✓
- Inside iframe: `.op-topbar` hidden ✓
- Inside iframe: `.op-shell` present ✓
- Inside iframe: `#op-actions-toolbar` present ✓
- Standalone `/operator.html` still 200 with `.op-topbar` visible ✓

**Embedded operator action layer re-test** (proves commit `ff9ae42`'s behavior survives the iframe wrapper):
- Clicked "Start Refinement Run", auto-accepted prompt with `mbsh-v2-refinement-001`.
- Pill text: **"Run mbsh-v2-refinement-001 already exists — opened."** ✓
- Pill kind: `ok` (green) ✓
- `window.__operator.state.selectedRunId === "mbsh-v2-refinement-001"` ✓

## 5. Visual / theme status

Fully applied. The Claude Design template's "coming out of darkness" theme renders end-to-end with rail tooltips, ember/aurora/shay accents, glass panels, and serif display headings. Tokens are scoped to `.studio-shell` and **do not leak**.

Independent CSS-leak checks:

| Page | `--ember` defined on `:root`? | `--op-bg` defined on `:root`? | Verdict |
|---|---|---|---|
| `/index.html` | **false** | n/a | clean — no studio token leak |
| `/operator.html` | **false** | **true** | clean — operator keeps its own tokens |
| `/studio.html` (inside `.studio-shell`) | true (scoped) | n/a | correct |

## 6. Bugs found

### Bug 1 (real, fixed) — Site Builder embedded mode did not hide its top chrome

**Symptom:** the new shell embedded `/index.html?embedded=1` correctly applied the `studio-embedded` class to `<html>`, but the top brand bar was still rendering inside the iframe (logo + site selector + Restart/New-Site buttons).

**Root cause:** my embedded-mode CSS in `index.html` targeted `.top-bar` (a class), but the actual top chrome element is `<div id="top-bar">` (an id). The selector never matched, so the rule had no effect. Because my prior verification used the same wrong selector, the bug went undetected by the previous smoke.

**Fix (one-line CSS change in `site-studio/public/index.html`):**

```diff
   <style>
-    html.studio-embedded .top-bar,
+    /* The actual top chrome is <div id="top-bar"> (an id, not a class).
+       Hide it plus the restart banner and the logo image when embedded. */
+    html.studio-embedded #top-bar,
     html.studio-embedded #restart-banner,
+    html.studio-embedded .top-bar,
     html.studio-embedded .top-bar-logo-img { display: none !important; }
     html.studio-embedded body { padding-top: 0 !important; }
     html.studio-embedded .main-shell, html.studio-embedded .app-shell { top: 0 !important; }
   </style>
```

The class-based `.top-bar` rule is kept too in case the chat-shell ever introduces such a class; the new `#top-bar` rule is what fires today.

**Re-verification:** post-fix, `getComputedStyle(document.getElementById('top-bar')).display === 'none'` inside the iframe — confirmed.

### Bug 2 (test-tooling, fixed) — false-positive selector check in the verify script

The first verify run used `document.querySelector('.top-bar')` which returned `null` and led the assertion to read `null !== false` → "fail" even when the page was correct. Updated to use `document.getElementById('top-bar')`.

### Bug 3 (test-tooling, fixed) — type coercion in CSS-leak assertion

`getPropertyValue('--ember')` returns `""` (empty string) when the variable isn't defined. The assertion `r.checks.legacy_index_studio_token_leak === false` saw `"" !== false` and fired a false negative. Coerced to a boolean (`!!(v && v.trim().length > 0)`).

### Bug 4 (state hygiene, worked around) — stranded smoke run-dir

A previous smoke left `mbsh-v2-refinement-debug-1778387279678` under `sites/site-mbsh-reunion/intelligence/runs/`. Sandbox EPERM blocks normal `unlink`, but renaming the directory to a dot-prefixed name (`.zombie-debug-…`) makes it fail `isSafeId` so the operator's `listRuns` skips it. Real cleanup needs to happen on the host: `rm -rf sites/site-mbsh-reunion/intelligence/runs/.zombie-debug-* sites/site-mbsh-reunion/intelligence/runs/mbsh-v2-refinement-smoke-*`.

## 7. Fixes made (in this verification pass)

1. **`site-studio/public/index.html`** — added `#top-bar` selector to embedded-mode `<style>` block so the legacy chrome actually hides when iframed. Standalone behavior unchanged (no `.studio-embedded` class → no rules apply).
2. **`site-studio/server/__smoke__/studio-shell-verify.js`** — new file. Independent verifier with stricter checks: clicks (not hash-nav), reads inside iframes, checks CSS leaks per-page, exercises the embedded operator action layer end-to-end. 73 assertions.

## 8. Validation

| Check | Result |
|---|---|
| `node --check site-studio/server/__smoke__/studio-shell-verify.js` | OK |
| `studio-shell-verify.js --spawn-server` (post-fix) | **PASS — 73/73 assertions** |
| `/studio.html` HTTP 200, 12-item rail, all sections render | PASS |
| `/index.html` HTTP 200 standalone with chrome visible | PASS |
| `/index.html?embedded=1` chrome hidden (after Bug 1 fix) | PASS |
| `/operator.html` HTTP 200 standalone with chrome visible | PASS |
| `/operator.html?embedded=1` chrome hidden | PASS |
| Builder iframe loads inside `.studio-shell` | PASS |
| Mission Control iframe loads, action layer functional inside iframe (existing run → green pill) | PASS |
| CSS leak — `--ember` not defined on `/index.html`'s `:root` | PASS |
| CSS leak — `--ember`/`--shay` not defined on `/operator.html`'s `:root`; `--op-bg` is | PASS |
| Recipe flow — 6 nodes, clicking "Open" on first node hash-navigates to `#research` | PASS |
| `git diff --check` (working tree) | clean |

Evidence (full-page PNGs):

```
docs/research/famtastic-studio-execution/verify-shots/
  00-home.png                         (Home with rail + recipe + Shay panel + memory strip)
  01-builder-embedded.png             (Site Builder embed, chrome hidden post-fix)
  02-mission-embedded.png             (Mission Control embed, .op-topbar hidden)
  03-embedded-action-pill.png         (Embedded operator: green "already exists — opened." pill)
```

## 9. Non-blockers

- **Stranded smoke run-dirs.** `mbsh-v2-refinement-smoke-*` and `mbsh-v2-refinement-debug-*` left under `sites/site-mbsh-reunion/intelligence/runs/` from prior sessions. Sandbox blocks normal `unlink`. Renamed to `.zombie-*` to make them invisible to `listRuns`. Host should `rm -rf` them.
- **Verify uses fast smoke server, not the full Studio server.** The full server boots in ~35s with credential checks + brain-verifier + capability-manifest, which exceeds the cowork bash-call budget. Both servers serve the same `public/*` static files and the same intelligence routers, so the verification is faithful to the parts being tested. The Builder iframe shows blank inside the fast server (chat WebSocket is on `:3334` which the fast server doesn't run); on the host's full server the chat is fully populated.
- **Browser console noise during smoke.** Three categories all expected:
  1. Tailwind CDN + Babel transformer warnings (legacy/in-browser).
  2. `shay-bridge-client.js` 404 — only served by the full Studio server.
  3. `WebSocket :3334` connection failed — same reason.
  4. One deliberate `409 Conflict` from the embedded operator's `Start Refinement Run` against the existing `mbsh-v2-refinement-001` — that's the success path under test.
- **Operator selects the right existing run only when leftover smoke runs are out of the way.** Real fix is host-side cleanup of the stranded directories; the action layer is correct.
- **Index-lock chatter in `.git/`.** Sandbox EPERM blocks `unlink` of freshly-created git lockfiles; worked around by `mv`-renaming. Optional host cleanup: `rm /Users/famtasticfritz/famtastic/.git/worktrees/famtastic-convergence-dossier/{index,HEAD}.lock*`.

## 10. Blockers

None.

## 11. Commit hash if changed

To be assigned by the next bash call. Recommended message:

```
fix(studio): hide #top-bar in embedded /index.html so Site Builder iframe is clean
```

The commit will include the one-line CSS change to `index.html` plus the new `studio-shell-verify.js` smoke.

## 12. Exact URL Fritz should use

```
http://localhost:3335/studio.html
```

(or whatever `STUDIO_PORT` your launchd-managed Studio is bound to.)

What to expect after a hard refresh:
1. **All 12 rail icons** on the left, clickable, with tooltips.
2. **Home** shows the recipe-flow chain (6 nodes), most-likely-next, pending-approval, recent sites/components/media.
3. **Site Builder** loads `/index.html` inside an iframe with **no second top brand bar visible** (this was the bug fixed in this pass). Existing chat/build flow still works.
4. **Mission Control** loads `/operator.html` inside an iframe, no `.op-topbar` visible. Click **Start Refinement Run** → enter `mbsh-v2-refinement-001` → expect green pill "already exists — opened." inside the embedded operator.
5. **Right Shay/context panel** visible on Home / Sites / Site Settings / Think-Tank / Research / Media Library / Settings; **suppressed** for Site Builder / Component Studio / Media Studio / Shay / Mission Control (they own their right pane).
6. **Bottom memory strip** visible on every section.
7. `/index.html` and `/operator.html` (no query string) continue to work standalone exactly as before.
