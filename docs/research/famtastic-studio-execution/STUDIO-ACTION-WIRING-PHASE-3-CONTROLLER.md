# STUDIO ACTION WIRING PHASE 3 CONTROLLER

**Date:** 2026-05-10  
**Branch:** `research/studio-intelligence-foundation-20260508`  
**Worktree:** `/Users/famtasticfritz/famtastic-convergence-dossier`  
**Status:** active  
**Objective:** Complete Studio Action Wiring Phase 3 across all major Studio work areas with real local-first creation, staging, and task workflows while preserving `/studio.html`, `/index.html`, `/operator.html`, Site Builder, and Mission Control.

---

## 1. Orchestrator role

The orchestrator owns scope control, integration sequencing, conflict resolution,
proof collection, regression preservation, and final reporting.

The orchestrator must:

1. Read the Phase 1 and Phase 2 run reports plus the Studio IA / recipe / drift docs first.
2. Define lane ownership before any non-trivial edits.
3. Prefer modular additive work over `server.js` growth.
4. Keep `/index.html` standalone behavior intact.
5. Keep Mission Control as one section only.
6. Continue past ordinary milestones until Phase 3 is complete or a hard blocker occurs.
7. Produce the final run report at:
   `docs/research/famtastic-studio-execution/STUDIO-ACTION-WIRING-PHASE-3-RUN-REPORT.md`

---

## 2. Parallel lane ownership

Each lane owns only the files listed in `may touch`. If integration requires a
shared file, the orchestrator performs the merge after lane work completes.

### LANE A3 — Sites / New Site / Builder Workflow

**Goal:** Make New Site and Continue Site usable locally, with safe staging when
full site creation is not appropriate.

**May touch**
- `site-studio/public/studio/src/screens/sites.jsx`
- `site-studio/public/studio/src/screens/site-builder.jsx`
- `site-studio/public/studio/src/lib/sites-actions.js`
- `site-studio/public/studio/src/lib/sites-api.js`
- `site-studio/public/studio/src/lib/site-context.js`
- `site-studio/public/studio/src/lib/site-settings-api.js`
- `site-studio/server/intelligence-reader.js`
- `site-studio/server/validators.js`

**Must not touch**
- `site-studio/public/index.html`
- `site-studio/public/operator.html`
- `site-studio/public/studio/src/screens/mission-control.jsx`
- `site-studio/server.js` unless the orchestrator explicitly approves a one-line modular mount only
- any real production deploy target

**Required proof**
- New Site wizard renders.
- Invalid site tag is rejected.
- Valid local draft or safe site staging is created.
- Continue Site selects a real site and updates current context.
- embedded builder preview/inspect/refine contracts still route through postMessage.
- `/index.html` standalone still loads.

### LANE B3 — Media Studio / Media Library Creation Flow

**Goal:** Make Media Studio create or import local assets, persist registry state,
and refresh Media Library with no paid or cloud generation.

**May touch**
- `site-studio/public/studio/src/screens/media-studio.jsx`
- `site-studio/public/studio/src/screens/media-library.jsx`
- `site-studio/public/studio/src/lib/media-actions.js`
- `site-studio/public/studio/src/lib/media-api.js`
- `site-studio/server/media-routes.js`
- `site-studio/server/media-registry.js`
- `site-studio/server/validators.js`

**Must not touch**
- any paid image provider adapter
- any cloud image call path
- `site-studio/public/studio/src/screens/mission-control.jsx`
- production asset locations outside the local Studio-safe registry path

**Required proof**
- local/manual asset appears in Media Library registry.
- status update works.
- assignment contract is recorded locally.
- refresh reflects new registry state.
- no paid/cloud call occurs.

### LANE C3 — Component Studio Creation / Safe Insert Flow

**Goal:** Make local component draft creation real and strengthen safe insertion
proof without mutating production pages.

**May touch**
- `site-studio/public/studio/src/screens/component-studio.jsx`
- `site-studio/public/studio/src/lib/components-actions.js`
- `site-studio/public/studio/src/lib/components-api.js`
- `site-studio/public/studio/src/lib/media-actions.js` for component-to-media handoff only if needed
- `site-studio/server/component-routes.js`
- `site-studio/server/component-inventory.js`
- `site-studio/server/validators.js`

**Must not touch**
- real production page files outside `sites/<tag>/_test/inserts/`
- `site-studio/public/studio/src/screens/mission-control.jsx`
- `site-studio/public/index.html`

**Required proof**
- duplicate or near-match check runs before new draft creation.
- component draft persists in a safe local path.
- media need is represented or linked into Media workflow.
- sandbox insert history updates with target/proof fields.
- real production pages are not mutated unless explicitly safe/test-only.

### LANE D3 — Research Center / Think-Tank Task Promotion

**Goal:** Turn research and brainstorm actions into real local task records.

**May touch**
- `site-studio/public/studio/src/screens/research.jsx`
- `site-studio/public/studio/src/screens/think-tank.jsx`
- `site-studio/public/studio/src/lib/research-actions.js`
- `site-studio/public/studio/src/lib/research-api.js`
- `site-studio/public/studio/src/lib/think-tank-actions.js`
- `site-studio/public/studio/src/lib/think-tank-api.js`
- `site-studio/server/research-routes.js`
- `site-studio/server/think-tank-routes.js`
- `site-studio/server/validators.js`

**Must not touch**
- external research-call code paths
- `site-studio/public/studio/src/screens/mission-control.jsx`
- paid/cloud research providers

**Required proof**
- capture record is created.
- promotion record is created.
- task appears in the relevant workspace or shared task list.
- research depth remains local/stateful only unless already safely wired.
- no paid/cloud research call occurs.

### LANE E3 — Shay Routing / Right Pane Action Execution

**Goal:** Make Shay stage real local actions and learning candidates based on
section context instead of giving fake chat answers.

**May touch**
- `site-studio/public/studio/src/shell.jsx`
- `site-studio/public/studio/src/lib/current-context.js`
- `site-studio/public/studio/src/lib/shay-actions.js`
- `site-studio/public/studio/src/lib/site-context.js`
- `site-studio/public/studio/src/lib/memory-tail.js`

**Must not touch**
- any paid AI backend
- `site-studio/public/studio/src/screens/mission-control.jsx`
- `site-studio/public/index.html`
- `site-studio/public/operator.html`

**Required proof**
- right pane still collapses and persists.
- section context changes update recommendations.
- route action creates or stages a local task.
- learning candidate records locally.
- readback modes remain short/operator/deep/next-action.
- no fake AI output is shown as real backend work.

### LANE F3 — Recipes / Workflow / Integration

**Goal:** Bind recipe nodes and memory strip to real local Phase 3 state across
sites, media, components, research, and Shay.

**May touch**
- `site-studio/public/studio/src/lib/recipes.js`
- `site-studio/public/studio/src/recipe-flow.jsx`
- `site-studio/public/studio/src/lib/memory-tail.js`
- `site-studio/public/studio/src/shell.jsx` only in recipe/memory-strip sections via orchestrator merge

**Must not touch**
- `site-studio/public/studio/src/screens/mission-control.jsx`
- `site-studio/public/index.html`
- `site-studio/public/operator.html`

**Required proof**
- recipe nodes update from real local state.
- clicking a node routes to the correct section.
- drilldown shows owner, inputs, outputs, current artifacts, next action, proof needed.
- memory strip reflects latest local actions/tasks.
- Mission Control stays proof/status only.

### LANE G3 — QA / Proof

**Goal:** Verify the full Phase 3 surface and preserve existing behavior.

**May touch**
- `tests/studio/lane-static-checks.js`
- `site-studio/server/__smoke__/studio-action-wiring-verify.js`
- `site-studio/server/__smoke__/studio-phase2-verify.js`
- a new Phase 3 verifier if needed under `site-studio/server/__smoke__/`
- Phase 3 run report inputs only

**Must not touch**
- implementation files unless the orchestrator explicitly requests a narrow proof fix
- production/deploy scripts

**Required proof**
- `git diff --check`
- `node tests/studio/lane-static-checks.js`
- available unit/smoke tests
- browser verification if practical
- exact reporting for any blocked browser prong

---

## 3. Files reserved for orchestrator-only integration

Only the orchestrator may edit these shared integration files:

- `site-studio/public/studio.html`
- `site-studio/public/studio/src/shell.jsx` when merging Lane E3 and F3 changes
- `site-studio/server.js`
- `docs/research/famtastic-studio-execution/STUDIO-ACTION-WIRING-PHASE-3-CONTROLLER.md`
- `docs/research/famtastic-studio-execution/STUDIO-ACTION-WIRING-PHASE-3-RUN-REPORT.md`
- `SITE-LEARNINGS.md`
- `CHANGELOG.md`
- `FAMTASTIC-STATE.md`

---

## 4. Integration order

1. A3, B3, C3, D3, E3, F3 lane work completes in parallel.
2. Orchestrator reviews all lane diffs and resolves shared-state conflicts.
3. Integrate local task/state contracts first:
   - Sites
   - Media
   - Components
   - Research / Think-Tank
   - Shay
4. Bind recipes and memory strip to the integrated state model.
5. Run static checks.
6. Run smoke/browser verification.
7. Fix proof failures.
8. Repeat validation until pass or a hard blocker occurs.
9. Write final run report.

---

## 5. Hard blockers

Stop only for these conditions:

1. repo write/build is impossible
2. existing Site Builder breaks and cannot be restored
3. existing Mission Control breaks and cannot be restored
4. repeated validation failure after documented retry/fix attempts
5. production/deploy/DNS/payment/destructive action is required
6. paid/cloud call is required without Fritz approval
7. major `server.js` growth is required without a modularization path

---

## 6. Non-blocker logging

Log but do not stop for:

- honest contract-only UI where backend wiring would violate local-first/no-paid rules
- draft staging instead of full creation when safety requires it
- browser-tool limitations in the sandbox
- existing unrelated dirty files in the worktree
- additive modular route growth outside `server.js`

Every non-blocker must be recorded in the Phase 3 run report with:
- what is working now
- what remains partial
- why it was kept honest instead of faked

---

## 7. Final end condition

Phase 3 is complete only when all of the following are true:

1. Sites/New Site/Continue workflows create or safely stage real local artifacts/tasks.
2. Media Studio and Media Library support real local save/update/assignment flows without paid/cloud calls.
3. Component Studio supports real local draft persistence, duplicate checking, and safe sandbox insertion proof.
4. Research Center and Think-Tank create real local captures, promotions, and task records.
5. Shay routes section-aware requests into real local tasks/actions and records learnings honestly.
6. Recipes reflect real local state across the five named core workflows.
7. Mission Control remains one section only and is not expanded into platform ownership.
8. `/studio.html` remains usable as the main Studio workbench.
9. `/index.html` standalone still works.
10. `/operator.html` standalone still works.
11. QA proof passes or exact blockers are documented.

If every item above is true, status is `PASS`. If a hard blocker stops the run,
status is `BLOCKED`. Any unmet end-condition without a qualifying hard blocker is
`FAIL`.
