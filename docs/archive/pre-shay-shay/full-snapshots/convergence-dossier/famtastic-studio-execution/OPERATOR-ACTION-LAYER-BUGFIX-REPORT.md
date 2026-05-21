# Operator Action Layer — Bugfix Report

**Date:** 2026-05-09
**Branch:** `research/studio-intelligence-foundation-20260508`
**Worktree:** `/Users/famtasticfritz/famtastic-convergence-dossier`
**Author:** Claude (cowork session)
**Status:** PASS (code) / BLOCKED (commit — see Blockers)

---

## Symptom

In `/operator.html`, clicking **Start Refinement Run**, entering `mbsh-v2-refinement-001`, and pressing OK produced no visible result. No toast, no run-list change, no run inspector update.

---

## Root cause

Three layered issues. The third was the actual user-visible failure today; the first two are amplifiers that would have made the same bug worse for the next person.

### 1. Primary — silent 409 from a previously-created run

`sites/site-mbsh-reunion/intelligence/runs/mbsh-v2-refinement-001/ledger.json` already existed (created earlier the same day by a parallel-lane test, `status: complete, verdict: pass`). The actions router correctly returned **HTTP 409** with body `{"error":"already_exists"}`. The client wrote `Start failed: already_exists` into the status `<span>`.

### 2. Amplifier A — invisible action-status feedback

`site-studio/public/css/operator.css` had **zero rules** for `.op-action-btn`, `.op-actions-status`, or `[data-kind="ok|err|info"]`. The status text rendered as unstyled inline text inside the toolbar. Functionally invisible against the dark background, no color/weight/border distinguished states.

### 3. Amplifier B — host-contract mismatch

`site-studio/public/js/operator-actions.js` reads:

```
op.currentTag()  /  op.state.tag
op.currentRunId() / op.state.runId
```

`site-studio/public/js/operator.js` exposed:

```
op.getActiveTag() / op.state.activeTag
                    op.state.selectedRunId
```

Mismatch consequences:

- `getCurrentTag()` returned `null` → all action requests omitted `?tag=` → server fell back to `resolveSiteDir()` (which today happens to point at `site-mbsh-reunion`, masking the bug).
- Pass / Non-blocker / Finalize buttons were permanently disabled because they only enable when a run is selected.
- On a 201, the post-create `refresh()` reloaded runs but never selected the new run, leaving the Run Inspector and Proof Packet stale.

---

## Fix (minimum-necessary)

### `site-studio/public/js/operator.js`

Extended `window.__operator` with the contract `operator-actions.js` actually uses:

```js
currentTag:   function () { return state.activeTag; },
currentRunId: function () { return state.selectedRunId; },
selectRun:    function (runId) { return Promise.resolve(selectRun(runId)); },
```

Existing keys (`state`, `getActiveTag`, `getRunDetail`, `refresh`, `h`, `consumed`) preserved.

### `site-studio/public/js/operator-actions.js`

Added `selectRunInOperator(runId)` helper. Updated **Start Refinement Run** handler:

- 201 Created → `setStatus(ok, "Run X started — opened.")` then `refresh().then(selectRun(X))`.
- 409 already_exists → `setStatus(ok, "Run X already exists — opened.")` then `refresh().then(selectRun(X))`. (Friendly path; the existing run becomes the active one.)
- Any other failure → `setStatus(err, "Start failed: <error_code or status>")`.

### `site-studio/public/css/operator.css`

Added real visible styling for:

- `.op-action-btn` — button surface, hover, focus-visible, disabled.
- `.op-actions-status` — pill shape, padding, min-height.
- `[data-kind="info|ok|err"]` — distinct colors using the existing operator design tokens (`--op-blue`, `--op-green`, `--op-red`).

### `site-studio/server/__smoke__/operator-action-repro.js` (new)

In-process smoke test that builds a sandbox sites root under `os.tmpdir()` (so it never touches the real worktree) and exercises three cases:

- **A** — POST `/runs/start` no-tag, existing run_id → asserts 409 `already_exists`.
- **B** — POST `/runs/start` `?tag=site-mbsh-reunion`, existing run_id → asserts 409 `already_exists`.
- **C** — POST `/runs/start` fresh run_id → asserts 201 with ledger.

Result: **PASS** locally.

---

## Files changed

```
M  site-studio/public/css/operator.css
M  site-studio/public/js/operator-actions.js
M  site-studio/public/js/operator.js
A  site-studio/server/__smoke__/operator-action-repro.js
A  docs/research/famtastic-studio-execution/OPERATOR-ACTION-LAYER-BUGFIX-REPORT.md
```

No `site-studio/server.js` changes. No new top-level files. Studio file-structure rule honored (CSS in `css/`, JS in `js/`, both already linked from `operator.html`).

---

## Route / button fixed

- **Button:** `Start Refinement Run` in `#op-actions-toolbar` (built by `operator-actions.js`).
- **Route:** `POST /api/intelligence/actions/runs/start` (already correctly wired in `server.js:1075` to `createActionsRouter`). No server-side change needed.
- **Payload:** `{ run_id, intent }` (unchanged).

---

## UI feedback added

- Visible status pill with three states (`info` blue, `ok` green, `err` red).
- Success path: "Run X started — opened." + new run selected automatically.
- Already-exists path: "Run X already exists — opened." + that run selected automatically.
- Failure path: "Start failed: <error code or HTTP status>".
- Run Ledger refresh + select-after-create wired through `op.refresh()` then `op.selectRun(runId)`, which also drives Proof Packet / Run Inspector update.

---

## Validation

| Check | Result |
|---|---|
| `node --check site-studio/public/js/operator.js` | OK |
| `node --check site-studio/public/js/operator-actions.js` | OK |
| `node --check site-studio/server/intelligence-actions.js` | OK |
| `node --check site-studio/server/__smoke__/operator-action-repro.js` | OK |
| Smoke A — no-tag, existing run_id → 409 `already_exists` | PASS |
| Smoke B — `?tag=` set, existing run_id → 409 `already_exists` | PASS |
| Smoke C — fresh run_id → 201 with ledger | PASS |
| `git diff --check` | clean (no whitespace errors) |
| `npx vitest run` | not run — see Non-blockers |
| Manual `/operator.html` verification | not run — see Non-blockers |

---

## Non-blockers

- **`npx vitest` cannot run inside the sandbox.** Vitest's `rolldown` ships a native binary keyed to the host arch (`darwin`); inside the Linux sandbox it errors `MODULE_NOT_FOUND: @rolldown/binding-linux-arm64-gnu`. Will run cleanly on the macOS host. No code change is needed for it.
- **No live `/operator.html` smoke.** I chose the in-process smoke test (Express router exercised directly) over a full Puppeteer click-through per the agreed "minimum-necessary" scope. Full UI smoke takes ~5 min to set up and is reasonable as a follow-up.
- **Stale smoke run-dir from first attempt (`mbsh-v2-refinement-smoke-1778300535405`)**: created during early iteration before I switched to a `/tmp` sandbox. Sandbox EPERM blocks me from cleaning it up. Can be removed on the host with: `rm -rf sites/site-mbsh-reunion/intelligence/runs/mbsh-v2-refinement-smoke-*`. Subsequent smoke runs use `os.tmpdir()` and never touch the worktree.

---

## Blockers

- **Cannot commit from sandbox.** A stale `index.lock` at `/Users/famtasticfritz/famtastic/.git/worktrees/famtastic-convergence-dossier/index.lock` cannot be unlinked from inside the cowork sandbox (FUSE mount EPERM). All edits are saved to the working tree and `git status` shows them as modified. The commit must be run on the host. See "What Fritz should click/type now."

---

## Commit hash

(Not yet committed — see Blockers.)

Recommended commit message (human-style, no AI attribution per CLAUDE.md):

```
fix(operator): make Start Refinement Run feedback visible and select-after-create

- Expose currentTag/currentRunId/selectRun on window.__operator so the
  action layer can read state and request selection.
- 409 already_exists now opens the existing run instead of erroring silently.
- Add CSS for .op-action-btn and .op-actions-status with info/ok/err styles
  so action feedback can't be missed.
- Add in-process smoke test under server/__smoke__ covering the three
  POST /runs/start outcomes.
```

---

## What Fritz should click/type now

On the host (macOS):

```bash
cd ~/famtastic-convergence-dossier
rm -f /Users/famtasticfritz/famtastic/.git/worktrees/famtastic-convergence-dossier/index.lock
rm -rf sites/site-mbsh-reunion/intelligence/runs/mbsh-v2-refinement-smoke-*

# Verify the smoke still passes from the host:
cd site-studio && node server/__smoke__/operator-action-repro.js && cd ..

# Run the project test suite to confirm no regressions:
( cd site-studio && npx vitest run )

# Commit:
git add site-studio/public/css/operator.css \
        site-studio/public/js/operator.js \
        site-studio/public/js/operator-actions.js \
        site-studio/server/__smoke__/operator-action-repro.js \
        docs/research/famtastic-studio-execution/OPERATOR-ACTION-LAYER-BUGFIX-REPORT.md
git commit -m "fix(operator): make Start Refinement Run feedback visible and select-after-create"
```

Then in a browser:

1. Open `http://localhost:<STUDIO_PORT>/operator.html`.
2. Click **Start Refinement Run**.
3. Type `mbsh-v2-refinement-001` and press OK.
4. Expected: green status pill reads "Run mbsh-v2-refinement-001 already exists — opened.", the run is selected in the Run Ledger, Proof Packet and Run Inspector populate from the existing ledger.
5. Click **Start Refinement Run** again, type a fresh ID like `mbsh-v2-refinement-002`.
6. Expected: green status pill reads "Run mbsh-v2-refinement-002 started — opened.", run appears at top of ledger and is selected.
