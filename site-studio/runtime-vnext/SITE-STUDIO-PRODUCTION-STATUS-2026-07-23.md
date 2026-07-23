Title: Site Studio production status after runtime-vnext cutover
Purpose: Truth file for what is actually fixed versus what is still monolithic.
Goal: Keep rewrite work grounded in live state instead of wishful memory.
Status: active
Started: 2026-07-23
Execution: Dependency-first. Stabilize live rebuild path first, then extract server seams module by module.

What is actually fixed
- Visible Rebuild flow now calls POST /api/rebuild-runtime-vnext instead of sending the legacy WebSocket chat string "Rebuild the site".
- Runtime-vnext route registration is extracted to runtime-vnext/register-routes.js.
- Live launchd startup path defaults to FAMTASTIC_USE_RUNTIME_VNEXT=1.
- Native module/runtime mismatch was corrected for the live Node 24.14.0 launchd process.
- Browser QA timeout was reduced enough for live runs to complete inside the runtime timeout budget.
- JJ B&A Transport now produces a green proof report with 0 warnings / 0 errors.

What is not fixed
- server.js is still a monolith at ~21k lines.
- public/index.html is still very large at ~2.4k lines.
- server.js still owns too many responsibilities: spec persistence, deploy APIs, logs, repo management, websocket orchestration, page/component CRUD, verification flows, site state, build status, and legacy compatibility.
- The runtime-vnext cutover is production-usable, but the repo is not yet fully decomposed into clean modules.

Measured live state
- server.js: 21070 lines
- public/index.html: 2406 lines
- runtime-vnext/server-bridge.js: 141 lines
- server.js route count: 164 app.get/app.post/app.put/app.delete handlers

Remaining rewrite slices
1. Spec store extraction
   - Move readSpec/writeSpec/cache/revision/history responsibilities into a dedicated module.
   - Replace direct file writes from server.js with narrow helpers.

2. Runtime route extraction
   - Done for runtime-vnext entrypoints.
   - Next: build-status, proof-report, gap-log, and verify endpoints.

3. Deploy/repo lane extraction
   - Move deploy-info, deploy, create-site-repo, and related production/staging helpers into a deploy routes module.

4. Studio state and page CRUD extraction
   - Move page listing, page updates, component CRUD, and related mutations behind focused route modules.

5. WebSocket orchestration extraction
   - Pull connection setup, message routing, and status broadcast logic out of server.js.
   - Legacy chat path and vnext status events should become separate handlers.

6. Frontend panel decomposition
   - Split public/index.html script into modules for rebuild, verification, page editor, websocket client, and panel refresh.

Production proof as of this file
- Latest green run: site-jj-ba-transport/runs/run-60a02ba6bf9c
- Proof report: site-jj-ba-transport/runs/run-60a02ba6bf9c/reports/proof-report.json
- Gap log: site-jj-ba-transport/runs/run-60a02ba6bf9c/reports/gap-log.json

Blunt truth
The production path is now real.
The monolith is not gone yet.
The right claim is: cutover and live green proof are fixed; deeper decomposition is still underway.
