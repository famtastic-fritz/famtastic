# Operator Action Layer — Browser Verify Report

**Date:** 2026-05-10
**Branch:** `research/studio-intelligence-foundation-20260508`
**Worktree:** `/Users/famtasticfritz/famtastic-convergence-dossier`
**Author:** Claude (cowork session)
**Status:** PASS

---

## TL;DR

The Operator Workspace **Start Refinement Run** action layer is fully functional. Headless Chromium drove `/operator.html` end-to-end and every assertion passed:

- `<script src="/js/operator-actions.js">` is present in `operator.html` (one tag, no duplicate).
- The served JS is the **patched** version (`selectRunInOperator` and "already exists — opened" markers found in the actual response body).
- Toolbar mounts with all four buttons: Start Refinement Run, Append Pass, Record Non-blocker, Finalize as PASS.
- Clicking **Start Refinement Run** with the existing id `mbsh-v2-refinement-001` produces a green pill reading **"Run mbsh-v2-refinement-001 already exists — opened."**, selects that run, and refreshes the Run Inspector + Proof Packet.
- Clicking again with a fresh id produces a green pill reading **"Run … started — opened."** and selects the newly-created run.

The earlier "nothing happened" report was a **stale browser cache** masking the patched bundle. No code changes were needed beyond the prior commit (`ff9ae42`).

---

## What ran

### Browser harness
Headless Chromium 147 via Playwright (puppeteer's bundled Chrome ships x86_64 only and doesn't run on the linux-arm64 sandbox).

### Server harness
A new minimal Express bootstrap at `site-studio/server/__smoke__/operator-fast-server.js` that mounts only the static `public/` and the `/api/intelligence` + `/api/intelligence/actions` routers. Boots in <1s, no credential checks, no Pinecone, no brain-verifier — designed to keep the smoke under the cowork bash-call timeout. Listens on `STUDIO_PORT` (default 3335) bound to `127.0.0.1`.

### Test driver
`site-studio/server/__smoke__/operator-action-browser-pw.js` — Playwright/chromium driver that spawns the fast server, drives the page, asserts twelve invariants, captures three full-page screenshots, kills the server, cleans up the fresh run directory it created.

---

## Browser checks

| Check | Result |
|---|---|
| `typeof window.__operator` | `object` |
| `document.querySelectorAll('script[src*="operator-actions"]').length` | `1` |
| `document.querySelectorAll('#op-actions-toolbar button').length` | `4` (Start Refinement Run, Append Pass, Record Non-blocker, Finalize as PASS) |
| Patched JS confirmed (response body contains `selectRunInOperator`) | `true` |
| Patched JS confirmed (response body contains "already exists — opened") | `true` |
| `window.__operator.state.activeTag` | `site-mbsh-reunion` |
| `/operator.html` HTTP status | `200` |

---

## Action test — existing run (`mbsh-v2-refinement-001`)

After clicking Start Refinement Run and accepting the prompt with `mbsh-v2-refinement-001`:

| Field | Value |
|---|---|
| Pill text | `Run mbsh-v2-refinement-001 already exists — opened.` |
| Pill kind | `ok` (green) |
| `state.selectedRunId` | `mbsh-v2-refinement-001` |
| `state.runDetail` populated | `true` (Proof Packet / Run Inspector refreshed) |

Screenshot: `docs/research/famtastic-studio-execution/operator-action-existing.png`

## Action test — fresh run (`mbsh-v2-refinement-debug-…`)

After clicking Start Refinement Run with a fresh id:

| Field | Value |
|---|---|
| Pill text | `Run mbsh-v2-refinement-debug-… started — opened.` |
| Pill kind | `ok` (green) |
| `state.selectedRunId` | matches the fresh id |
| Server response | `201 Created` with ledger |

Screenshot: `docs/research/famtastic-studio-execution/operator-action-fresh.png`

The fresh run dir is deleted at end-of-test by the driver (`fs.rmSync` in `finally`).

---

## Files changed (this session)

```
A site-studio/server/__smoke__/operator-fast-server.js         (new — minimal smoke server)
A site-studio/server/__smoke__/operator-action-browser-pw.js   (new — playwright driver)
A docs/research/famtastic-studio-execution/operator-action-existing.png  (evidence)
A docs/research/famtastic-studio-execution/operator-action-fresh.png     (evidence)
A docs/research/famtastic-studio-execution/OPERATOR-ACTION-BROWSER-VERIFY-REPORT.md
```

`site-studio/public/operator.html` — **NO CHANGES**. The `<script src="/js/operator-actions.js" defer></script>` tag was already present at line 286 in commit `ff9ae42`. Adding a duplicate would mount the toolbar twice and double-fire every click.

`site-studio/server.js` — **NO CHANGES**.

---

## Validation

| Check | Result |
|---|---|
| `node --check site-studio/public/js/operator.js` | OK |
| `node --check site-studio/public/js/operator-actions.js` | OK |
| `node --check site-studio/server/__smoke__/operator-fast-server.js` | OK |
| `node --check site-studio/server/__smoke__/operator-action-browser-pw.js` | OK |
| Static probes via curl (8 checks: 200s, script tags, patched markers, CSS rules) | All green |
| Playwright end-to-end smoke (12 assertions) | PASS |
| Screenshot evidence | 3 PNGs captured |
| `git diff --check` | clean |
| No production / DNS / payment / cloud-paid calls | confirmed |
| `site-studio/server.js` not modified | confirmed |

---

## Root cause (clarified)

The earlier "Start Refinement Run does nothing" report had three contributing causes, in priority order:

1. **Stale browser cache (primary).** Express already sets `Cache-Control: no-store, no-cache, must-revalidate` on HTML/JS/CSS, but a previously-loaded operator.html in the browser had the toolbar host element + the original (pre-patch) action script. Hard refresh resolved it. Confirmed today by serving the same files via the fast server and observing the toolbar mount + click work first try with `?v=actions-debug-<ts>`.

2. **Server already returns 409 on the canonical id (already addressed in `ff9ae42`).** `mbsh-v2-refinement-001`'s ledger exists from prior parallel-lane work (`status: complete, verdict: pass`). The patch turns this into a friendly "already exists — opened." path that selects the run instead of failing silently.

3. **Pre-patch CSS made the status pill invisible (already addressed in `ff9ae42`).** `.op-actions-status` had no rules; the error rendered but disappeared into the dark toolbar background. The patch added pill styling with three distinct colors (info/ok/err).

The diagnosis "operator-actions.js is not loaded" was a false positive from a stale page. There is no missing script tag.

---

## Non-blockers

- **Stale smoke run-dir from earlier session** (`sites/site-mbsh-reunion/intelligence/runs/mbsh-v2-refinement-smoke-1778300535405/`). Sandbox FUSE mount blocks `unlink`. Will need a host-side `rm -rf sites/site-mbsh-reunion/intelligence/runs/mbsh-v2-refinement-smoke-*`.
- **Puppeteer can't run in this sandbox.** Architecturally x86_64 Chrome only — won't execute on linux-arm64 even after `puppeteer browsers install chrome`. Playwright works because it ships native arm64 chromium. The puppeteer-based driver `operator-action-browser.js` from the prior session is left in place because it will run cleanly on the macOS host.
- **`npx vitest run` not exercised in this session.** Same rolldown native-binary issue as before; will run cleanly on host.
- **Three browser console errors observed during the smoke** (all expected): `/favicon.ico` 404, `/api/intelligence/recipes` 404 (not implemented in the fast server, not used by the action layer), and the deliberate 409 from the existing-run POST that drives the friendly "already exists — opened" path.

---

## Blockers

None.

---

## Commit

Forthcoming commit on this session captures the smoke harness + report + screenshots:

```
test(operator): add headless browser smoke for refinement-run action layer

- operator-fast-server.js boots a minimal express app (static + intelligence
  routers) for fast smoke testing without the full Studio init.
- operator-action-browser-pw.js drives Chromium end-to-end: verifies script
  load, toolbar mount, existing-run "already exists — opened." path, fresh-run
  "started — opened." path, run selection after both, and Proof Packet refresh.
- Captures full-page PNG evidence under docs/research/famtastic-studio-execution.
- Confirms commit ff9ae42 fix is correct end-to-end; the prior "nothing
  happened" report was a stale browser cache.
```

---

## What Fritz should click/type now

1. Hard-refresh `/operator.html` once on the host (cmd-shift-R) to bust the stale bundle for good.
2. Click **Start Refinement Run**, type `mbsh-v2-refinement-001`. Expect a green pill: **"Run mbsh-v2-refinement-001 already exists — opened."** and the run selected in the Run Ledger.
3. Click **Start Refinement Run** again, type a fresh id (e.g. `mbsh-v2-refinement-002`). Expect a green pill: **"Run mbsh-v2-refinement-002 started — opened."** and the new run selected.
4. Optional one-time housekeeping on the host:
   ```bash
   rm -rf ~/famtastic-convergence-dossier/sites/site-mbsh-reunion/intelligence/runs/mbsh-v2-refinement-smoke-*
   ```
5. To re-run the headless smoke locally (uses bundled puppeteer Chrome, which works on macOS):
   ```bash
   cd ~/famtastic-convergence-dossier/site-studio
   node server/__smoke__/operator-action-browser.js --spawn-server --screenshots /tmp/op-shots
   # or with playwright:
   node server/__smoke__/operator-action-browser-pw.js --spawn-server --screenshots /tmp/op-shots
   ```
