# Overnight FAMtastic Studio MVP Mission — Phase 3 Edit + Deploy Gate Report

Date: 2026-05-12 01:30 EDT
Worker scope: Phase 3 only — edit prompt loop where practical and Netlify preview/staging deploy readiness/gate. No production deploy.
Repo: `/Users/famtasticfritz/famtastic-convergence-dossier`
Branch: `research/studio-intelligence-foundation-20260508`

## Safety result

PASS for Phase 3 scope.

No production deploy was run. No DNS was changed. No branches were merged or deleted. No secrets were printed, rotated, committed, or written to repo files. No paid provider/API/media calls were made.

Phase 3 estimated paid spend: `$0.00`.

## Continuity read

Read requested prior overnight context before changing code:

- `.hermes/logs/overnight-20260512-011013/phase-3-edit-deploy-gate.log` — existed but empty.
- `docs/research/famtastic-studio-execution/overnight-20260512/PHASE-2-MVP-BRIDGE-REPORT.md`.
- `docs/research/famtastic-studio-execution/overnight-20260512/PHASE-0-1-PREFLIGHT-PIPELINE-MAP-REPORT.md`.

Phase 2 had already added `POST /api/studio-workflows/sites/build` and wired Studio New Site to the existing builder pipeline. This phase continued from that state and did not replace the builder engine.

## What was built

1. Added a Studio edit bridge endpoint:
   - `POST /api/studio-workflows/sites/edit`
   - Validates safe `site_tag` and non-empty edit prompt.
   - Delegates through an injected `editSite` dependency.
   - In the real server, `editSite` calls the existing classifier/chat edit dispatcher via `routeToHandler(...)` rather than creating a new edit engine.
   - Records a Studio task with edit dispatch metadata.

2. Added Netlify staging/preview deploy readiness endpoint:
   - `GET /api/studio-workflows/sites/deploy-readiness?site_tag=<tag>`
   - Returns `allowed_envs: ['staging']`, `production_allowed: false`, manual gate state, local preview URL, Netlify capability probe, and recorded staging state.

3. Added Netlify staging deploy gate endpoint:
   - `POST /api/studio-workflows/sites/deploy-preview`
   - Requires `approved: true`.
   - Accepts only `env: 'staging'` or `env: 'preview'`, but forces execution to the existing staging deploy path.
   - Rejects `production` with `400 { error: 'staging_only' }` before any deploy dispatch.
   - In the real server, runs the existing `runDeploy(..., 'staging')` only after `checkNetlify()` passes.

4. Wired Studio browser client helpers:
   - `window.WorkflowAPI.editSite(payload)`
   - `window.WorkflowAPI.getDeployReadiness(siteTag)`
   - `window.WorkflowAPI.deployPreview(payload)`

5. Added visible Studio UI controls on the Sites screen:
   - MVP edit prompt textarea.
   - `Request edit` button.
   - `Check deploy readiness` button.
   - `Approve Netlify staging deploy` button.
   - Production deploy status chip that stays blocked.
   - Allowed env chip that shows staging only.
   - Staging URL visibility when one is recorded.

## Exact files changed by this phase

Phase 3 intentionally touched the same Phase 2 bridge files and added tests:

- `site-studio/server/studio-workflows-routes.js`
  - Added `/sites/edit`.
  - Added `/sites/deploy-readiness`.
  - Added `/sites/deploy-preview`.
  - Added task logging for edit and staging deploy gate actions.

- `site-studio/server.js`
  - Injected `editSite`, `getDeployReadiness`, and `deployPreview` into the Studio workflows router.
  - Added `triggerStudioSiteEdit(prompt)` to reuse `classifyRequest(...)` and `routeToHandler(...)` with websocket broadcast.
  - Added `editStudioMvpSiteFromPrompt(payload)`.
  - Added `getStudioDeployReadiness(payload)`.
  - Added `deployStudioPreviewToStaging(payload)`.

- `site-studio/public/studio/src/lib/workflow-api.js`
  - Added edit/deploy readiness/deploy preview client calls to `window.WorkflowAPI`.

- `site-studio/public/studio/src/screens/sites.jsx`
  - Added edit prompt UI and status state.
  - Added deploy readiness/gate UI and status state.
  - Displays production as blocked and staging as the only deploy env.

- `site-studio/tests/studio-workflows-routes.test.js`
  - Added four tests covering edit dispatch, edit validation, deploy readiness contract, and production deploy rejection.

- `docs/research/famtastic-studio-execution/overnight-20260512/PHASE-3-EDIT-DEPLOY-GATE-REPORT.md`
  - This report.

## Tests and smokes run

### RED verification

Command:

```bash
npm test --prefix site-studio -- tests/studio-workflows-routes.test.js
```

Expected initial result before implementing routes:

```text
Test Files  1 failed (1)
Tests       4 failed | 3 passed (7)
Failure reason: new edit/deploy endpoints returned HTML 404, causing JSON parse failures.
```

### Focused route tests after implementation

Command:

```bash
npm test --prefix site-studio -- tests/studio-workflows-routes.test.js
```

Result:

```text
Test Files  1 passed (1)
Tests       7 passed (7)
```

### Full site-studio test suite + static checks

Command:

```bash
git diff --check && npm test --prefix site-studio && node tests/studio/lane-static-checks.js
```

Result:

```text
git diff --check: PASS, no output
Test Files  5 passed (5)
Tests       188 passed (188)
STATIC: 187 PASS / 0 FAIL  (total=187)
```

### Local API smoke

Started a local server with:

```bash
STUDIO_PORT=3434 PREVIEW_PORT=3433 npm run dev --prefix site-studio
```

Smoke commands/results:

```text
deploy-readiness-smoke PASS False credentials_missing
production-block-smoke PASS
edit-validation-smoke PASS
```

Meaning:

- Deploy readiness endpoint returned staging-only contract and `production_allowed: false`.
- Production deploy request was rejected before dispatch with `staging_only`.
- Empty edit prompt was rejected with `prompt_required`.
- Netlify probe reported `credentials_missing` in this local smoke environment, so no staging deploy was attempted.

### Browser smoke

Opened:

```text
http://127.0.0.1:3434/studio.html#sites
```

Observed in the Sites screen:

- `MVP edit + Netlify staging gate` panel appears once a resume/active target exists.
- Edit prompt textarea and `Request edit` button are visible.
- `Check deploy readiness` and `Approve Netlify staging deploy` buttons are visible.
- UI shows `Allowed deploy envs: staging`.
- UI shows `Production deploy: blocked`.
- Clicking `Check deploy readiness` updated Netlify state to `credentials_missing` and surfaced an existing staging URL for the active site.

No staging deploy button was clicked in the browser smoke because the readiness probe showed missing Netlify credentials for this isolated server session.

## Endpoints / UI flows added

### Edit loop

UI:

```text
/studio.html#sites → MVP edit + Netlify staging gate → Edit prompt → Request edit
```

API:

```text
POST /api/studio-workflows/sites/edit
{
  "site_tag": "site-example",
  "prompt": "Make the hero headline more premium."
}
```

Server behavior:

```text
Studio route → editStudioMvpSiteFromPrompt → triggerStudioSiteEdit → classifyRequest → routeToHandler → existing builder/chat edit path
```

Honest limitation: the real edit dispatch still needs an active matching site and at least one connected browser websocket client. If no browser is connected, it returns/records a waiting/blocked status rather than pretending to edit.

### Deploy readiness/gate

UI:

```text
/studio.html#sites → MVP edit + Netlify staging gate → Check deploy readiness
/studio.html#sites → MVP edit + Netlify staging gate → Approve Netlify staging deploy
```

API:

```text
GET /api/studio-workflows/sites/deploy-readiness?site_tag=site-example
POST /api/studio-workflows/sites/deploy-preview
{
  "site_tag": "site-example",
  "env": "staging",
  "approved": true
}
```

Production block:

```text
POST /api/studio-workflows/sites/deploy-preview
{ "site_tag": "site-example", "env": "production", "approved": true }
→ 400 { "ok": false, "error": "staging_only" }
```

## Sites built / deployed

None in Phase 3. This phase was scoped to edit loop and deploy gate wiring only.

No preview/staging deploy was executed because local readiness smoke reported Netlify `credentials_missing` for the isolated smoke server. Production deploy was explicitly blocked and not attempted.

## Known gaps remaining

- Edit dispatch uses the existing websocket-backed chat/edit path. Without a connected browser websocket client, the server returns `waiting_for_browser` / `no_ws_clients` instead of performing an orphaned edit.
- Edit dispatch currently requires the requested `site_tag` to match the active server `TAG`; it does not silently switch active sites.
- Deploy gate dispatch requires the requested `site_tag` to match active `TAG`; it does not silently switch active sites.
- Post-deploy smoke checks are not yet automated after `runDeploy`; this phase only added the staging dispatch gate and readiness visibility.
- The existing `/api/deploy` endpoint still technically accepts production. The Studio MVP flow added here hides/blocks production via `/api/studio-workflows/sites/deploy-preview`, but future hardening should consider mission-mode production suppression at the lower endpoint too.

## Merge readiness

Phase 3 code is locally test-clean for the commands above. The overall worktree remains dirty with substantial pre-existing/parallel overnight work, so do not bulk-stage the repo. Stage only the Phase 3 files listed above when preparing a checkpoint.

## Next recommended commands

```bash
git diff --check
npm test --prefix site-studio
node tests/studio/lane-static-checks.js
git status --short --branch
```

For a real manual MVP pass with a browser websocket connected:

```bash
npm run dev --prefix site-studio
# Open http://localhost:3334/studio.html#sites
# Build or resume a site → enter edit prompt → Request edit → Check deploy readiness
# Only click Approve Netlify staging deploy if readiness is green and staging deploy is intended.
```
