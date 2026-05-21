# Overnight FAMtastic Studio MVP Mission — Phase 4 Shay Shay MVP Report

Date: 2026-05-12 01:39 EDT
Worker scope: Phase 4 only — wire unified Shay Shay as a useful MVP orchestrator for new site/build/state/learning/outcome/prompt-improvement/deploy-readiness actions. No production deploy.
Repo: `/Users/famtasticfritz/famtastic-convergence-dossier`
Branch: `research/studio-intelligence-foundation-20260508`

## Safety result

PASS for Phase 4 scope.

No production deploy was run. No DNS was changed. No branches were merged or deleted. No secrets were printed, rotated, committed, or written to repo files. No paid provider/API/media calls were made.

Phase 4 estimated paid spend: `$0.00`.

## Continuity read

Read requested prior overnight context before changing code:

- `.hermes/logs/overnight-20260512-011013/phase-4-shay-mvp.log` — existed but empty.
- `docs/research/famtastic-studio-execution/overnight-20260512/PHASE-3-EDIT-DEPLOY-GATE-REPORT.md`.
- `docs/research/famtastic-studio-execution/overnight-20260512/PHASE-2-MVP-BRIDGE-REPORT.md`.
- `site-studio/server/studio-workflows-routes.js`.
- `site-studio/public/studio/src/lib/shay-actions.js`.
- `site-studio/public/studio/src/screens/shay.jsx`.

Phase 2 had already wired Studio build to the existing builder bridge. Phase 3 had already wired edit and staging-only deploy readiness/gate. Phase 4 continued from that state and did not replace the builder engine.

## What was built

1. Added a unified Shay Shay API orchestrator endpoint:
   - `POST /api/studio-workflows/shay/actions`
   - Supports these actions:
     - `new_site`
     - `build_site`
     - `inspect_state`
     - `record_learning`
     - `record_outcome`
     - `capture_prompt_improvement`
     - `deploy_readiness`
   - Every response includes a `shay` contract with `unified_name: "Shay Shay"` and `decorative: false`.
   - Legacy naming is explicitly contained as `legacy_names: ["Shay Lite"]`; no separate assistant was introduced.

2. Reused existing Studio workflow primitives instead of duplicating engines:
   - `new_site` writes the same real Studio site draft format as `/sites/drafts` and creates a task.
   - `build_site` builds a canonical blueprint and delegates to the injected existing builder bridge (`deps.buildSite`).
   - `inspect_state` returns the existing Studio truth layer from `collectState(...)`.
   - `record_learning`, `record_outcome`, and `capture_prompt_improvement` write to the same local intelligence JSONL ledgers as the existing endpoints.
   - `deploy_readiness` delegates to the existing Phase 3 staging/preview readiness dependency and keeps production blocked.

3. Added browser client support:
   - `window.WorkflowAPI.runShayAction(action, payload)`.
   - `window.ShayActions.runMvpAction(action, payload)`.
   - Convenience wrappers:
     - `window.ShayActions.createNewSite(payload)`
     - `window.ShayActions.buildSite(payload)`
     - `window.ShayActions.inspectState(payload)`
     - `window.ShayActions.checkDeployReadiness(payload)`
     - `window.ShayActions.lastMvpAction()`

4. Updated the Shay Shay screen with a real MVP orchestrator panel:
   - Preloaded with Institute for the Studies of Fungi.
   - Visible inputs for site name, site tag, and MVP build goal.
   - Buttons wired to real API calls:
     - `New site`
     - `Build draft`
     - `Inspect state`
     - `Deploy readiness`
     - `Learning`
     - `Outcome`
     - `Prompt improvement`
   - Displays action status, staging-only allowed envs, production blocked state, and Netlify readiness reason.

5. Refactored route helpers to reduce duplicate route logic:
   - Site draft creation helper shared by `/sites/drafts` and Shay `new_site`.
   - Learning/outcome/prompt-improvement helper functions shared by direct endpoints and Shay action endpoint.

## Exact files changed by this phase

Phase 4 changed these files:

- `site-studio/server/studio-workflows-routes.js`
  - Added helper functions for shared draft/ledger creation.
  - Added `shayActionMeta(...)` response contract.
  - Added `POST /shay/actions`.
  - Refactored `/sites/drafts`, `/learning`, `/outcomes`, and `/prompt-improvements` to use shared helpers.

- `site-studio/public/studio/src/lib/workflow-api.js`
  - Added `runShayAction(action, payload)`.
  - Exposed it on `window.WorkflowAPI`.

- `site-studio/public/studio/src/lib/shay-actions.js`
  - Added `runMvpAction(...)` and MVP action wrappers.
  - Stores the last MVP action in `window.__shayLastMvpAction` for inspection/debugging.

- `site-studio/public/studio/src/screens/shay.jsx`
  - Added the visible MVP orchestrator panel.
  - Updated Shay capability truth to include verified MVP orchestration.

- `site-studio/tests/studio-workflows-routes.test.js`
  - Added four tests for the unified Shay Shay MVP orchestrator.

- `tasks/studio-learning-candidates.jsonl`
  - Local smoke added one learning candidate: `Phase 4 local smoke: Shay orchestrator endpoint works.`

- `docs/research/famtastic-studio-execution/overnight-20260512/PHASE-4-SHAY-MVP-REPORT.md`
  - This report.

## Endpoints / UI flows added

### Unified Shay action endpoint

```text
POST /api/studio-workflows/shay/actions
{
  "action": "new_site",
  "payload": {
    "site_name": "Institute for the Studies of Fungi",
    "site_tag": "site-institute-for-the-studies-of-fungi",
    "site_type": "research education affiliate",
    "goal": "Premium FAMtastic research and education site."
  }
}
```

Supported actions:

```text
new_site
build_site
inspect_state
record_learning
record_outcome
capture_prompt_improvement
deploy_readiness
```

Response contract includes:

```text
shay.unified_name = "Shay Shay"
shay.decorative = false
shay.explanation = action-specific explanation
shay.next_actions = recommended follow-up actions
```

### Shay screen UI flow

```text
/studio.html#shay
→ MVP orchestrator
→ New site / Build draft / Inspect state / Deploy readiness / Learning / Outcome / Prompt improvement
```

Browser smoke verified `/studio.html#shay` displays the MVP orchestrator panel and that clicking `Deploy readiness` updates the panel with:

```text
Allowed envs: staging
Production: blocked
Netlify: credentials_missing
```

## Tests and smokes run

### RED verification

Command:

```bash
npm test --prefix site-studio -- tests/studio-workflows-routes.test.js
```

Expected initial result before implementing `/shay/actions`:

```text
Test Files  1 failed (1)
Tests       4 failed | 7 passed (11)
Failure reason: /api/studio-workflows/shay/actions returned HTML 404, causing JSON parse failures.
```

### Focused route tests after implementation

Command:

```bash
npm test --prefix site-studio -- tests/studio-workflows-routes.test.js
```

Result:

```text
Test Files  1 passed (1)
Tests       11 passed (11)
```

### Full site-studio test suite

Command:

```bash
npm test --prefix site-studio
```

Result:

```text
Test Files  5 passed (5)
Tests       192 passed (192)
```

### Static checks

Command:

```bash
node tests/studio/lane-static-checks.js
```

Result:

```text
STATIC: 187 PASS / 0 FAIL  (total=187)
```

### Whitespace/diff check

Command:

```bash
git diff --check
```

Result: PASS, no output.

### Local API smoke

Started local server with:

```bash
STUDIO_PORT=3434 PREVIEW_PORT=3433 npm run dev --prefix site-studio
```

Smoke result:

```text
inspect_state 200 True False state
deploy_readiness 200 True False False
record_learning 200 True False learning-20260512053912-sehqr
```

Meaning:

- `inspect_state` returned ok and `shay.decorative=false`.
- `deploy_readiness` returned ok, `shay.decorative=false`, and `production_allowed=false`.
- `record_learning` wrote a real local learning candidate.

### Browser smoke

Opened:

```text
http://127.0.0.1:3434/studio.html#shay
```

Observed:

- `MVP ORCHESTRATOR` panel visible.
- `unified Shay Shay` chip visible.
- Inputs visible for site name, site tag, and MVP build goal.
- Buttons visible for New site, Build draft, Inspect state, Deploy readiness, Learning, Outcome, Prompt improvement.
- Clicking `Deploy readiness` updated the panel with staging-only readiness:
  - `Allowed envs: staging`
  - `Production: blocked`
  - `Netlify: credentials_missing`

No deploy was run.

## Sites built / deployed

None in Phase 4. This phase was scoped to Shay Shay wiring and tests only.

No staging/preview deploy was executed. No production deploy was attempted.

## Spend/cost estimate

Paid provider/API/media spend for Phase 4: `$0.00`.

No paid model/media/research call was made.

## Known gaps remaining

- `build_site` still depends on the existing Phase 2 builder bridge behavior. In the real server that bridge can return `created_waiting_for_browser` / `no_ws_clients` if no browser websocket client is connected. Shay reports the actual result and does not pretend the build completed.
- `deploy_readiness` is staging/preview readiness only. It does not deploy and does not override the Phase 3 approval gate.
- The Shay screen action panel is now useful, but it is still form/button-driven. Natural-language intent classification inside Shay can come later.
- UI smoke covered the Deploy readiness button. The full browser click path for every Shay button was not exhaustively clicked because the route-level tests cover the action contract and side effects.

## Merge readiness

Phase 4 code is locally test-clean for the commands above. The overall worktree remains dirty with substantial pre-existing/parallel overnight work, so do not bulk-stage the repo. Stage only the Phase 4 files listed above when preparing a checkpoint.

## Next recommended commands

```bash
git diff --check
npm test --prefix site-studio
node tests/studio/lane-static-checks.js
git status --short --branch
```

For the next phase/manual MVP pass:

```bash
npm run dev --prefix site-studio
# Open http://localhost:3334/studio.html#shay
# Use MVP orchestrator: New site → Build draft → Inspect state → Deploy readiness → record Outcome/Learning/Prompt improvement
```

## 5-site goal status

Not reached in Phase 4 because this phase was explicitly scoped to Shay Shay MVP orchestration only. No sites were built or deployed in this phase.
