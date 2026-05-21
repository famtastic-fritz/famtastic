# Overnight FAMtastic Studio MVP Mission — Phase 2 MVP Bridge Report

Date: 2026-05-12 01:21 EDT
Worker scope: Phase 2 only — bridge Studio New Site / staged draft / canonical blueprint into the existing builder engine. No deploys.
Repo: `/Users/famtasticfritz/famtastic-convergence-dossier`
Branch: `research/studio-intelligence-foundation-20260508`

## Safety result

PASS for Phase 2 scope.

No production deploy was run. No staging/preview deploy was run. No DNS was changed. No branches were merged or deleted. No secrets were printed, rotated, committed, or written to repo files. No paid provider/API/media calls were made.

Phase 2 estimated paid spend: `$0.00`.

## Continuity read

Read the requested prior overnight path and existing Studio execution docs before changes:

- `.hermes/logs/overnight-20260512-011013/phase-2-mvp-bridge.log` — existed but empty.
- `docs/research/famtastic-studio-execution/overnight-20260512/PHASE-0-1-PREFLIGHT-PIPELINE-MAP-REPORT.md`.

The Phase 0/1 report identified the exact blocker this phase addressed: `/studio.html` New Site staged local drafts only and did not call the existing `createSite() / synthesizeDesignBriefForBuild() / triggerSiteBuild()` pipeline.

## What was built

Built a thin MVP bridge instead of replacing the builder engine:

1. Added a canonical Studio site blueprint contract builder in `site-studio/server/studio-workflows-routes.js`.
2. Added `POST /api/studio-workflows/sites/build`.
3. Wired the route to the existing builder engine from `site-studio/server.js` through an injected `buildSite` dependency.
4. Added `buildStudioMvpSiteFromBlueprint()` in `site-studio/server.js`, which reuses:
   - `createSite(...)`
   - `synthesizeDesignBriefForBuild(...)`
   - `triggerSiteBuild(...)`
5. Added `window.WorkflowAPI.buildSiteDraft(...)` in the Studio browser client.
6. Updated the Sites screen wizard to show:
   - `Build real site`
   - `Stage local draft`
   - build in-progress / success / failure chip state
   - preview URL visibility when the engine returns one
7. Updated staged draft rows to include `Build this draft`.
8. Added focused Vitest coverage for the route-level bridge contract.

## Endpoints / flows added

### `POST /api/studio-workflows/sites/build`

Purpose: Studio-native bridge endpoint that turns a wizard payload or staged draft into a canonical blueprint, then delegates to the existing builder engine.

Request shapes supported:

- Direct wizard payload:
  - `site_name`
  - `site_tag`
  - `site_type`
  - `goal`
  - `notes`
  - `starting_recipe`
- Staged draft lookup:
  - `{ "site_tag": "site-example" }`
  - The route loads `sites/_drafts/<site_tag>/draft.json` when `site_name` is omitted.

Blueprint contract returned:

- `contract_version: studio-site-blueprint/v1`
- `builder_entrypoint: createSite+synthesizeDesignBriefForBuild+triggerSiteBuild`
- `site_name`
- `site_tag`
- `site_type`
- `prompt`
- `brief` with `client_brief`
- `pages`
- `seo`
- `assets`
- `components`
- `deploy_target: local-preview-first`
- `approval_gates: [local_build, preview_review, staging_deploy_approval]`
- `budget_estimate_usd: 0`

### Studio UI flow

`/studio.html` → `Sites` → `New site` → fill wizard → `Build real site`

This calls:

`window.WorkflowAPI.buildSiteDraft(payload)` → `POST /api/studio-workflows/sites/build` → existing builder pipeline.

Staged draft flow:

`/studio.html` → `Sites` → `Staged local drafts` → `Build this draft`

This calls the same endpoint with `{ site_tag }` and lets the server load the draft.

## Exact files changed by this phase

- `site-studio/server/studio-workflows-routes.js`
  - Added `normalizeSiteTag(...)`.
  - Added `buildCanonicalSiteBlueprint(...)`.
  - Changed `createStudioWorkflowsRouter(repoRoot)` to `createStudioWorkflowsRouter(repoRoot, deps = {})`.
  - Added `POST /sites/build` under `/api/studio-workflows`.
  - Exported `buildCanonicalSiteBlueprint`.

- `site-studio/server.js`
  - Mounted `/api/studio-workflows` with `{ buildSite: buildStudioMvpSiteFromBlueprint }`.
  - Added `buildStudioMvpSiteFromBlueprint(blueprint)` to call the existing engine helpers.

- `site-studio/public/studio/src/lib/workflow-api.js`
  - Added `buildSiteDraft(payload)` client wrapper for `POST /api/studio-workflows/sites/build`.
  - Exposed it on `window.WorkflowAPI`.

- `site-studio/public/studio/src/screens/sites.jsx`
  - Added build state UI.
  - Added `Build real site` action to the New Site wizard.
  - Kept `Stage local draft` as fallback.
  - Added `Build this draft` to staged draft rows.
  - Added visible bridge/preview messaging.

- `site-studio/tests/studio-workflows-routes.test.js`
  - New focused tests for the MVP bridge.

- `docs/research/famtastic-studio-execution/overnight-20260512/PHASE-2-MVP-BRIDGE-REPORT.md`
  - This report.

## Tests run and exact results

### RED verification

Command:

```bash
npm test --prefix site-studio -- tests/studio-workflows-routes.test.js
```

Initial expected failure before route implementation:

- Test file: 1 failed.
- Tests: 3 failed / 3.
- Failure reason: `POST /api/studio-workflows/sites/build` did not exist yet and returned HTML 404 instead of JSON.

### Focused bridge tests after implementation

Command:

```bash
npm test --prefix site-studio -- tests/studio-workflows-routes.test.js
```

Result:

```text
Test Files  1 passed (1)
Tests       3 passed (3)
```

Covered behavior:

- Direct Studio draft payload becomes canonical blueprint and delegates to injected builder.
- Previously staged draft can be built by `site_tag` lookup.
- Missing builder dependency fails safely with `501` and `build_engine_unavailable`.

### Full site-studio test suite

Command:

```bash
npm test --prefix site-studio
```

Result:

```text
Test Files  5 passed (5)
Tests       184 passed (184)
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

## Known gaps remaining

- This phase did not run a real browser end-to-end build for Institute for the Studies of Fungi; Phase 2 was limited to wiring and tests, with deploys explicitly avoided.
- `triggerSiteBuild(null, spec)` still depends on a connected Studio/browser WebSocket client for full dispatch. If no browser is connected, the bridge returns `created_waiting_for_browser` / `no_ws_clients` honestly instead of claiming a build ran.
- The route-level tests use an injected fake builder dependency to prove the bridge contract without creating real sites or invoking paid/provider work.
- Edit prompt loop and deploy/staging gate are intentionally not included; those are Phase 3+.
- The route is mounted before the existing CSRF middleware in `server.js`, matching the current mount pattern for modular routes. If CSRF hardening is revisited, modular API mounts should be checked as a group.

## Merge readiness

Phase 2 code is test-clean locally for the commands above, but the overall worktree had many pre-existing dirty files from prior/parallel Studio work. Do not bulk-stage the entire repo. Stage only the Phase 2 files listed above when ready.

## Next recommended commands

```bash
git diff --check
npm test --prefix site-studio
node tests/studio/lane-static-checks.js
git status --short --branch
```

For manual Phase 3 / browser verification later:

```bash
npm run dev --prefix site-studio
# Open http://localhost:3334/studio.html#sites
# New site → fill Institute for the Studies of Fungi → Build real site
```
