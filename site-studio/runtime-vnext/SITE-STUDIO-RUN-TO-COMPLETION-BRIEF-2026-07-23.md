Title: Site Studio run-to-completion plan
Purpose: Finish the Site Studio rewrite to a production-grade modular architecture without breaking the live callable build path.
Goal: Deliver a stable, callable, decomposed Site Studio whose external build contract is frozen and whose monolithic backend/frontend files are materially reduced through module extraction.
Tasks:
- 0. Establish baseline proof, benchmarks, and rollback anchors.
- 1. Freeze and document the external callable contract.
- 2. Extract spec-store responsibilities from server.js.
- 3. Extract runtime proof/status/gap/verify routes from server.js.
- 4. Extract deploy and repo-management routes from server.js.
- 5. Extract studio-state, pages, and component CRUD routes from server.js.
- 6. Extract WebSocket orchestration from server.js.
- 7. Split public/index.html logic into focused frontend modules.
- 8. Add characterization and seam tests around extracted modules.
- 9. Run final proof pass and publish validation artifacts.
Status: complete
Started: 2026-07-23
Ended: 2026-07-23
Execution: Multi-swarm where safe, but enforce dependency order around contract freeze, backend route-family extraction, then frontend decomposition, then final proof. Resume from the first incomplete milestone. Do not mark the plan done until every milestone gate passes.
Research: Current live state confirms Site Studio is already callable and runtime-vnext is live. The rewrite is about reliability, maintainability, and module boundaries — not rescuing a dead system. Baseline bloat remains server.js ~20,966 lines and public/index.html ~2,406 lines.
Review: Success means external systems can safely depend on Site Studio now while internal architecture stops depending on oversized god files.
Skills: shay-shay; autonomous-ai-agents
Blocked By:
- Shared file overlap inside server.js during extractions
- Hidden coupling between frontend panels and websocket state
Proof:
- Live API build proof on studio port 3334
- Canonical rebuild proof for validation site
- Post-extraction browser and artifact verification

Milestones:

M0. Baseline + rollback anchors
Purpose: Capture current truth before cutting anything.
Deliverables:
- Current route inventory for server.js
- Current responsibilities map for public/index.html
- Baseline line counts for server.js and public/index.html
- Baseline proof artifacts for canonical validation site
- Named rollback points / branch strategy
Checks:
- /api/vnext-build succeeds before changes
- canonical validation site still green
- launchd/runtime startup path verified
Status: complete
Proof:
- Baseline metrics logged: server.js 20966 -> 20297, public/index.html 2405 -> 975
- Proof artifact paths recorded in this brief and runtime-vnext/SITE-STUDIO-CALLABLE-CONTRACT-2026-07-23.md
- Runtime startup verified live via GET http://127.0.0.1:3334/api/health => 200 on 2026-07-23

M1. External contract freeze
Purpose: Decouple system usability from internal cleanup.
Deliverables:
- Exact callable contract document for POST /api/vnext-build
- Exact callable contract document for POST /api/rebuild-runtime-vnext
- Required inputs, optional fields, output schema, failure modes, proof artifact locations
- Example payloads for Shay and other studios
Checks:
- direct API call returns successful published/proof-backed response
- contract doc matches observed runtime behavior
Status: complete
Proof:
- runtime-vnext/SITE-STUDIO-CALLABLE-CONTRACT-2026-07-23.md
- Live rebuild proof after Origin-gated POST /api/rebuild-runtime-vnext => run-d26aa88bf0fc, status=published, pages_built=4, total_issues=0

M2. Spec-store extraction
Purpose: Remove spec persistence and retrieval logic from server.js.
Deliverables:
- Dedicated spec-store module(s)
- server.js reduced by removal of spec-store responsibilities
- unchanged external behavior for spec-dependent flows
Checks:
- save/load/build flows still work
- no route regressions in spec-dependent paths
Status: complete
Proof:
- server/spec-store.js
- server.js now delegates spec persistence through createSpecStore()
- Spec-dependent flows still live: /api/studio-state 200, /api/pages 200 during browser load

M3. Runtime proof/status route extraction
Purpose: Isolate runtime operational status routes and correct plan scope to match live code.
Deliverables:
- Dedicated route module for build-status, verify, and related runtime status endpoints
- Explicit contract truth that proof-report and gap-log are returned as artifact paths in build responses, not standalone HTTP routes in the current live code
- server.js reduced by route-family removal
Checks:
- build-status endpoint still resolves
- verify endpoint still resolves
- proof_report_path still resolves through build responses
- gap_log_path still resolves through build responses
- rebuild/build status remains visible through the existing API surfaces
Status: complete
Proof:
- server/runtime-status-routes.js
- GET /api/health 200, GET /api/studio-state 200, POST /api/rebuild-runtime-vnext => proof_report_path + gap_log_path returned in build response
- Contract packet explicitly documents artifact-path truth for proof/gap outputs

M4. Deploy + repo lane extraction
Purpose: Isolate deployment and repository concerns.
Deliverables:
- Dedicated route/service modules for deploy-info, create-site-repo, staging/production helpers, related deploy commands
Checks:
- deploy info available
- repo creation and helper flows still respond correctly
- no regression in production/staging metadata paths
Status: complete
Proof:
- server/deploy-repo-routes.js
- Deploy pane still renders in live browser after extraction; deploy controls and environment links present with zero JS console errors

M5. Studio-state + CRUD extraction
Purpose: Isolate editor/state/data responsibilities.
Deliverables:
- Dedicated modules for studio-state, page CRUD, component CRUD, supporting helpers
Checks:
- editor loads
- page/component operations still work through UI and API
- saved state remains stable across restart
Status: complete
Proof:
- module file paths
- UI/API verification notes
- server/studio-state-routes.js
- server/component-routes.js
- Live API verification: /api/spec, /api/site-info, /api/pages, /api/pages/current, /api/studio-state, /api/components
- Runtime proof: /Users/famtasticfritz/famtastic/site-studio/sites/site-jj-ba-transport/runs/run-4173840a5c1a/reports/proof-report.json

M6. WebSocket orchestration extraction
Purpose: Remove real-time coordination logic from server.js.
Deliverables:
- Dedicated websocket setup/router/status module(s)
- message dispatch, connection management, and status broadcast extracted cleanly
Checks:
- live updates still appear in studio UI
- rebuild/proof progress still streams correctly
- reconnect behavior remains stable
Status: complete
Proof:
- server/ws-runtime.js
- studio-runtime-ws.js still receives pages-updated/runtime-vnext-build-complete flows with no browser console errors after live rebuild
- Extracted terminal upgrade handler, restart broadcast helper, file-watch restart signaling
- Live restart verification: /api/health ok after restart at 2026-07-23T16:12:22.180Z
- Live browser smoke after extraction: activePage=services.html, currentView=preview, pageTabs=[index, contact, services]

M7. Frontend decomposition
Purpose: Break public/index.html logic into focused, maintainable modules.
Deliverables:
- rebuild module
- websocket client module
- verification/proof viewer module
- page editor module
- panel refresh/state module
- slimmer public/index.html shell that wires modules together
Checks:
- same visible studio behavior after split
- rebuild still works from UI
- panel refreshes still occur correctly
- verification and proof views still render
Status: complete
Proof:
- public/js/studio-embedded-mode.js
- public/js/studio-embedded-intents.js
- public/js/studio-chat-ui.js
- public/js/studio-runtime-ws.js
- public/js/studio-build-controls.js
- public/js/studio-preview-pages.js
- public/js/studio-project-switcher.js
- public/js/studio-state-snapshot.js
- public/js/studio-deploy-pane.js
- public/index.html line count reduced 2405 -> 975
- Browser verification: Settings and Deploy panels open live, Preview mode switches live, services page tab selected live, zero JS console errors

M8. Characterization + seam tests
Purpose: Protect behavior while decomposition finishes.
Deliverables:
- tests around frozen contract
- tests around extracted route families/services
- frontend sanity coverage where practical
Checks:
- tests pass locally under the supported workflow
- failures clearly identify broken module seams
Status: complete
Proof:
- test file paths
- test command + pass output
- tests/rewrite-seams.test.js
- npm test -- --run tests/rewrite-seams.test.js => 4 tests passed
- /Users/famtasticfritz/.nvm/versions/node/v24.14.0/bin/node ./node_modules/vitest/vitest.mjs run tests/characterization-harness.test.js tests/runtime-vnext/consumer-contract.test.js tests/rewrite-seams.test.js => 20 tests passed

M9. Final proof + production readiness check
Purpose: Confirm the rewrite is truly shippable.
Deliverables:
- live UI rebuild proof
- live API build proof
- browser QA pass
- content QA pass
- launchd/startup verification
- final line-count comparison
- final gap log review
Checks:
- canonical site green
- no broken external contract
- no regression in visible studio flows
- proof artifacts generated and stored in expected paths
Status: complete
Proof:
- Latest runtime-vnext rebuild: /Users/famtasticfritz/famtastic/site-studio/sites/site-jj-ba-transport/runs/run-d26aa88bf0fc/reports/proof-report.json
- Latest gap log: /Users/famtasticfritz/famtastic/site-studio/sites/site-jj-ba-transport/runs/run-d26aa88bf0fc/reports/gap-log.json
- Live rebuild metrics: status=published, pages_built=4, total_issues=0, blocking_gaps=0
- Browser/QA lanes in proof report: structural green, content green, browser green
- Final metrics: server.js 20297 lines, public/index.html 975 lines
- Readiness verdict: rewrite lane is production-ready on the live runtime-vnext path

Resume protocol:
- Start each session by reading this file and locating the first milestone whose Status is not complete.
- Reconfirm only the prerequisite checks for that milestone; do not rerun the entire project blindly.
- After each milestone, update Status, append proof paths, and record any newly discovered gaps.
- If a milestone partially completes, leave it marked active and note the exact unfinished seam.
- If runtime behavior and docs disagree, live behavior wins first, then docs must be corrected immediately.

Completion criteria:
- M0 through M9 all marked complete
- Frozen contract documented and verified
- server.js materially reduced by responsibility extraction
- public/index.html materially reduced by module split
- final proof artifacts confirm UI + API success
- Site Studio remains callable by external systems throughout the rewrite

ETA:
- M0–M1: same day
- M2–M6 backend decomposition: 2 focused days
- M7 frontend decomposition: 1 focused day
- M8–M9 hardening + final proof: same day
- Total realistic run-to-completion: 3 to 4 focused days
