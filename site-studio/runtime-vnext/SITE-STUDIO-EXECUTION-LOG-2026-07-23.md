Title: Site Studio execution log
Purpose: Maintain the live milestone-by-milestone evidence ledger for the Site Studio run-to-completion rewrite.
Goal: Track actual execution truth, proof, blockers, and resume state for the modular rewrite without losing continuity across sessions.
Plan File: /Users/famtasticfritz/famtastic/site-studio/runtime-vnext/SITE-STUDIO-RUN-TO-COMPLETION-BRIEF-2026-07-23.md
Status: active
Started: 2026-07-23
Ended:
Execution:
- Type: milestone-gated resumable execution log
- Strategy: update this file only with observed work, proof, blockers, and next steps; do not write aspirational completion language here
Proof Standard:
- every milestone entry must show real file paths, command results, endpoint results, browser/proof artifacts, or explicit blocker truth
- completed means verified, not merely attempted
- if work started but did not close, mark active and record the exact unfinished seam

How to use this log:
- Read the run-to-completion brief first.
- Then read this log and resume from the first milestone not marked complete.
- Update the Current State and Next Action before ending the session.
- Do not overwrite old evidence; append newer evidence under the correct milestone.

Current State:
- Active milestone: M5
- Overall verdict: in progress
- Resume point: extract studio-state, pages, and component CRUD route families after verified deploy/repo extraction
- Last updated by: Shay-Shay
- Last updated at: 2026-07-23

Milestone Status Board:
- [x] M0 Baseline + rollback anchors
- [x] M1 External contract freeze
- [x] M2 Spec-store extraction
- [x] M3 Runtime proof/status route extraction
- [x] M4 Deploy + repo lane extraction
- [ ] M5 Studio-state + CRUD extraction
- [ ] M6 WebSocket orchestration extraction
- [ ] M7 Frontend decomposition
- [ ] M8 Characterization + seam tests
- [ ] M9 Final proof + production readiness check

Execution Ledger:

M0. Baseline + rollback anchors
Status: complete
Started: 2026-07-23
Completed: 2026-07-23
Purpose: Capture current truth before any rewrite cuts.
Required deliverables:
- current route inventory for server.js
- current responsibilities map for public/index.html
- baseline line counts for server.js and public/index.html
- baseline proof artifacts for canonical validation site
- named rollback points / branch strategy
Checks:
- /api/vnext-build succeeds before changes
- canonical validation site still green
- launchd/runtime startup path verified
Evidence:
- Live lane truth captured:
  - pwd: /Users/famtasticfritz/famtastic/site-studio
  - repo root: /Users/famtasticfritz/famtastic
  - branch: codex/proof-mode-content-injection
  - worktree list captured
- Baseline files generated:
  - /Users/famtasticfritz/famtastic/site-studio/runtime-vnext/baseline/site-studio-baseline-inventory-2026-07-23.md
  - /Users/famtasticfritz/famtastic/site-studio/runtime-vnext/baseline/site-studio-baseline-routes-2026-07-23.json
  - /Users/famtasticfritz/famtastic/site-studio/runtime-vnext/baseline/site-studio-frontend-responsibility-hints-2026-07-23.json
  - /Users/famtasticfritz/famtastic/site-studio/runtime-vnext/baseline/site-studio-rollback-anchor-2026-07-23.md
- Measured live counts from direct file read:
  - server.js: 20,966 lines
  - public/index.html: 2,406 lines
  - route inventory: 163 routes total, 162 /api routes, 1 non-api route
- Runtime checks passed:
  - GET http://127.0.0.1:3334/api/config -> 200
  - GET http://127.0.0.1:3334/api/health -> 200
  - launchctl list | grep com.famtastic.studio -> loaded
- Live contract proof passed:
  - POST /api/vnext-build with allowed Origin header returned 200 published
  - fresh proof run: run-ca3111b07bce
  - proof report path: /Users/famtasticfritz/famtastic/site-studio/sites/eta-probe/runs/run-ca3111b07bce/reports/proof-report.json
  - gap log path: /Users/famtasticfritz/famtastic/site-studio/sites/eta-probe/runs/run-ca3111b07bce/reports/gap-log.json
- Canonical earlier green proof artifact confirmed on disk:
  - /Users/famtasticfritz/famtastic/site-studio/sites/site-jj-ba-transport/runs/run-60a02ba6bf9c/reports/proof-report.json
  - /Users/famtasticfritz/famtastic/site-studio/sites/site-jj-ba-transport/runs/run-60a02ba6bf9c/reports/gap-log.json
Artifacts:
- /Users/famtasticfritz/famtastic/site-studio/runtime-vnext/baseline/site-studio-baseline-inventory-2026-07-23.md
- /Users/famtasticfritz/famtastic/site-studio/runtime-vnext/baseline/site-studio-baseline-routes-2026-07-23.json
- /Users/famtasticfritz/famtastic/site-studio/runtime-vnext/baseline/site-studio-frontend-responsibility-hints-2026-07-23.json
- /Users/famtasticfritz/famtastic/site-studio/runtime-vnext/baseline/site-studio-rollback-anchor-2026-07-23.md
Open seams:
- none for M0
Blockers:
- none
Next action:
- freeze the external contract around /api/vnext-build and /api/rebuild-runtime-vnext using observed behavior, not assumed behavior
Proof verdict:
- complete

M1. External contract freeze
Status: complete
Started: 2026-07-23
Completed: 2026-07-23
Evidence:
- Live runtime-vnext route source identified at /Users/famtasticfritz/famtastic/site-studio/runtime-vnext/register-routes.js
- Contract response fields observed live from successful POST /api/vnext-build:
  - status
  - run_id
  - dist_dir
  - workspace_root
  - proof_report_path
  - gap_log_path
  - proof_report
  - gap_log
  - error
- Real gate discovered during live call:
  - request without allowed Origin header returned 403 {"error":"Cross-origin request blocked"}
  - request with Origin: http://127.0.0.1:3334 returned 200 published
- Live /api/rebuild-runtime-vnext proof also captured:
  - run_id: run-9d344a7eb90a
  - site_tag: site-jj-ba-transport
  - overall_status: green
  - pages_built: 4
  - total_issues: 0
Artifacts:
- /Users/famtasticfritz/famtastic/site-studio/runtime-vnext/SITE-STUDIO-CALLABLE-CONTRACT-2026-07-23.md
Open seams:
- none for M1
Blockers:
- none
Next action:
- proceed to spec-store extraction
Proof verdict:
- complete

M2. Spec-store extraction
Status: complete
Started: 2026-07-23
Completed: 2026-07-23
Evidence:
- Dedicated spec-store module created:
  - /Users/famtasticfritz/famtastic/site-studio/server/spec-store.js
- server.js now consumes createSpecStore(...) instead of owning the full inline spec-cache/write logic
- Duplicate site-level spec helpers removed from server.js to avoid redeclaration and keep spec responsibilities in one module
- Measured file reduction after extraction:
  - server.js: 20,966 -> 20,837 lines
  - extracted module: server/spec-store.js = 167 lines
- Verification passed after extraction:
  - node --check server.js -> clean
  - node --check server/spec-store.js -> clean
  - GET /api/config -> 200
  - GET /api/health -> 200
  - GET /api/spec -> 200
  - GET /api/site-info -> 200
  - POST /api/vnext-build -> 200 published
  - fresh post-extraction run: run-26255b5ea57d
  - proof report path: /Users/famtasticfritz/famtastic/site-studio/sites/eta-probe/runs/run-26255b5ea57d/reports/proof-report.json
  - gap log path: /Users/famtasticfritz/famtastic/site-studio/sites/eta-probe/runs/run-26255b5ea57d/reports/gap-log.json
- Seam map artifact generated:
  - /Users/famtasticfritz/famtastic/site-studio/runtime-vnext/baseline/spec-store-seam-map-2026-07-23.json
Artifacts:
- /Users/famtasticfritz/famtastic/site-studio/server/spec-store.js
- /Users/famtasticfritz/famtastic/site-studio/runtime-vnext/baseline/spec-store-seam-map-2026-07-23.json
Open seams:
- original consumer-contract blocker was a better-sqlite3 native binary ABI mismatch; rebuilt against active Node 22 runtime and cleared
- broader runtime-vnext test lane now passes for the verified slices
Blockers:
- none currently recorded for the spec-store slice
Next action:
- proceed to deploy + repo route-family extraction
Proof verdict:
- strong: live HTTP/build behavior verified and runtime-vnext SQLite-backed tests now passing

M3. Runtime proof/status route extraction
Status: complete
Started: 2026-07-23
Completed: 2026-07-23
Evidence:
- Dedicated runtime status route module created:
  - /Users/famtasticfritz/famtastic/site-studio/server/runtime-status-routes.js
- server.js now registers build-status and verify endpoints through the extracted module
- Measured file reduction after extraction:
  - server.js: 20,837 -> 20,805 lines
  - extracted module: server/runtime-status-routes.js = 72 lines
- Endpoint verification passed after extraction:
  - GET /api/build-status/site-jj-ba-transport -> 200
  - GET /api/verify -> 200
  - POST /api/verify -> 200
- Plan truth corrected:
  - there are no standalone /api/proof-report or /api/gap-log HTTP routes in the live code
  - proof_report_path and gap_log_path are artifact paths returned by the build contract
  - the run-to-completion brief was corrected to reflect this live reality
Artifacts:
- /Users/famtasticfritz/famtastic/site-studio/server/runtime-status-routes.js
- /Users/famtasticfritz/famtastic/site-studio/runtime-vnext/baseline/runtime-proof-status-route-map-2026-07-23.json
- /Users/famtasticfritz/famtastic/site-studio/runtime-vnext/SITE-STUDIO-RUN-TO-COMPLETION-BRIEF-2026-07-23.md
Open seams:
- POST /api/verify returned a failed verification payload for the current live site when smoke-tested; this is route-functionality truth, not necessarily route-breakage, and should be inspected later under verification/final proof work
Blockers:
- none on the extraction itself
Next action:
- proceed to deploy + repo route-family extraction
Proof verdict:
- complete

M4. Deploy + repo lane extraction
Status: complete
Started: 2026-07-23
Completed: 2026-07-23
Evidence:
- Dedicated deploy/repo route module verified in live code:
  - /Users/famtasticfritz/famtastic/site-studio/server/deploy-repo-routes.js
- server.js now registers deploy/repo endpoints through the extracted module:
  - registerDeployRepoRoutes(...) at /Users/famtasticfritz/famtastic/site-studio/server.js:1005
- Measured file reduction truth now visible in the live monolith counts:
  - server.js currently 20,699 lines
  - extracted module: server/deploy-repo-routes.js = 132 lines
- Syntax verification passed:
  - node --check server.js -> clean
  - node --check server/deploy-repo-routes.js -> clean
- Endpoint verification passed without triggering a live deploy:
  - GET /api/deploy-info -> 200 with structured local/staging/production payload
  - POST /api/deploy with invalid env -> structured invalid_env rejection
  - PUT /api/site-repo with empty body -> structured repoPath required rejection
- Additional route truth observed:
  - POST /api/create-site-repo is also owned by the extracted module
  - request without allowed Origin header is rejected by the existing cross-origin guard before route execution
Artifacts:
- /Users/famtasticfritz/famtastic/site-studio/server/deploy-repo-routes.js
Open seams:
- create-site-repo still depends on an active WebSocket client and was not side-effect tested in this pass
- deploy dispatch path itself was intentionally not triggered during this verification pass
Blockers:
- none on the extraction itself
Next action:
- proceed to studio-state + CRUD extraction
Proof verdict:
- complete

M5. Studio-state + CRUD extraction
Status: active
Started: 2026-07-23
Completed:
Evidence:
- Read-only seam map generated for the next extraction boundary:
  - /Users/famtasticfritz/famtastic/site-studio/runtime-vnext/baseline/studio-state-crud-seam-map-2026-07-23.json
- Verified current inline state/page routes still owned by server.js:
  - GET /api/spec
  - GET /api/site-info
  - GET /api/pages
  - POST /api/pages/current
  - GET /api/studio-state
- Verified helper coupling still anchored in server.js:
  - loadStudio()
  - saveStudio()
  - listPages()
- Verified component ownership is split today:
  - modular mount exists at server.js:975 -> server/component-routes.js
  - overlapping inline component handlers still exist later in server.js for /api/components, /api/components/:id, /api/components/import, and /api/components/export
Artifacts:
- /Users/famtasticfritz/famtastic/site-studio/runtime-vnext/baseline/studio-state-crud-seam-map-2026-07-23.json
Open seams:
- editor/state/page/component responsibilities still pending extraction
- duplicate /api/components ownership is now explicitly confirmed as a route-order ambiguity seam
Blockers:
- depends on backend extraction sequencing and careful preservation of currentPage shared authority
Next action:
- extract studio-state/page routes first, then unify component CRUD ownership under one module surface
Proof verdict:
- active discovery complete; extraction not yet cut

M6. WebSocket orchestration extraction
Status: pending
Started:
Completed:
Evidence:
- none yet
Artifacts:
- pending
Open seams:
- websocket setup, dispatch, and status broadcast logic still pending extraction
Blockers:
- depends on backend extraction sequencing and state/API stability
Next action:
- isolate websocket orchestration into dedicated module(s)
Proof verdict:
- not started

M7. Frontend decomposition
Status: pending
Started:
Completed:
Evidence:
- none yet
Artifacts:
- pending
Open seams:
- public/index.html remains oversized and still needs module split
Blockers:
- depends on stable backend seams
Next action:
- split frontend logic into focused modules after backend seam stabilization
Proof verdict:
- not started

M8. Characterization + seam tests
Status: pending
Started:
Completed:
Evidence:
- none yet
Artifacts:
- pending
Open seams:
- seam-level regression coverage not yet established for the extracted modules
Blockers:
- depends on at least initial module extraction
Next action:
- add characterization coverage around frozen contract and extracted route families
Proof verdict:
- not started

M9. Final proof + production readiness check
Status: pending
Started:
Completed:
Evidence:
- none yet
Artifacts:
- pending
Open seams:
- final live proof pass not yet executed in this rewrite lane
Blockers:
- depends on M1 through M8
Next action:
- run final UI/API/proof/startup validation once extraction and tests are complete
Proof verdict:
- not started

Session Notes:
- 2026-07-23: companion execution log created to pair with the run-to-completion brief and preserve milestone-level execution truth.
- 2026-07-23: initial state set to M0 active because the resumable structure existed, but the live evidence ledger did not.
- 2026-07-23: M0 completed with direct file-based metrics, route inventory, rollback anchor, runtime health checks, and a fresh successful /api/vnext-build proof run.
- 2026-07-23: M1 completed with live callable contract proofs for both /api/vnext-build and /api/rebuild-runtime-vnext.
- 2026-07-23: M2 began with a real spec-store extraction and a live post-extraction build verification.
- 2026-07-23: M3 completed with extracted runtime status routes and a correction to the plan where the old route assumptions did not match live code.
- 2026-07-23: M2 closed after the better-sqlite3 ABI mismatch was rebuilt away and the runtime-vnext SQLite-backed tests passed again.
- 2026-07-23: M4 verified complete from live code and no-side-effect endpoint smoke checks; the execution log had drifted behind reality and was corrected.
- 2026-07-23: M5 moved to active after a read-only seam map confirmed state/page helpers still live in server.js and component route ownership is currently split between a mounted module and later inline handlers.

Resume Protocol:
- Step 1: read the plan brief
- Step 2: read this execution log
- Step 3: jump to the first milestone not complete
- Step 4: verify only the prerequisite truth needed for that milestone
- Step 5: append evidence, artifacts, blockers, and next action before ending the session

Completion Rule:
- This log closes only when M0 through M9 are all marked complete and the final readiness verdict is explicit.

Final Readiness Verdict:
- pending
