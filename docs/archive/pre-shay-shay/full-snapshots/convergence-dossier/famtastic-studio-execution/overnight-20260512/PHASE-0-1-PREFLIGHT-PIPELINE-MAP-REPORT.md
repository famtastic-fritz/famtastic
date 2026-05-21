# Overnight FAMtastic Studio MVP Mission — Phase 0/1 Report

Date: 2026-05-12 01:11 EDT
Worker scope: Phase 0 and Phase 1 only — preflight, safety, env inventory without printing secrets, baseline tests, and pipeline map.
Repo: `/Users/famtasticfritz/famtastic-convergence-dossier`
Branch: `research/studio-intelligence-foundation-20260508`

## Safety result

PASS for Phase 0/1.

No production deploy was run. No staging/preview deploy was run. No DNS was changed. No branches were merged or deleted. No secrets were printed, rotated, committed, or written to repo files. No paid provider/API/media calls were made.

Spend ledger initialized at:

`docs/research/famtastic-studio-execution/overnight-20260512/spend-ledger.jsonl`

Phase 0/1 estimated paid spend: `$0.00`.

## Continuity / prior-work read

Read the prior overnight log directory requested by Fritz:

- `.hermes/logs/overnight-20260512-011013/phase-0-1-preflight-pipeline-map.log` — file existed but was empty.
- `.hermes/logs/overnight-20260512-011013/phase-0-1-preflight-pipeline-map.prompt.md` — present.

Read current Studio execution docs, including:

- `docs/research/famtastic-studio-execution/FAMTASTIC-STUDIO-AI-VISION-MVP-PLAN.md`
- `docs/research/famtastic-studio-execution/RUN_STATUS.md`
- `docs/research/famtastic-studio-execution/WAVE-7-8-FINAL-HANDOFF-REPORT.md`

Important continuity finding: Wave 7-8 already documented that `/studio.html` is visually/locally useful, but the native builder-side execution of staged site drafts is still missing. That matches the mission's stated MVP gap.

## Repo status at preflight

Command:

```bash
git status --short --branch
```

Result summary:

- Current branch: `research/studio-intelligence-foundation-20260508`
- Worktree is dirty with substantial pre-existing/parallel changes.
- This worker did not create a new branch because Phase 0/1 is read-mostly plus docs/ledger write only, and existing branch is the user-provided mission branch.
- Do not sweep all dirty files into a commit; stage intentionally only after human/integration review.

Notable dirty files already present before this report/ledger were consistent with the prior Wave 7-8 handoff, including Studio UI/action files, workflow route files, ledgers, docs, and `.hermes/` logs.

Recent commits inspected:

```text
1302d5c 2026-05-11 docs(studio): record phase three commit hash
db05322 2026-05-11 feat(studio): wire phase three local creation workflows
72266a7 2026-05-10 fix(studio): mount workspace research and think-tank routes
506bf4f 2026-05-10 feat(studio): wire functional workspace sections into unified shell
31f5401 2026-05-10 fix(studio): hide #top-bar in embedded /index.html so Site Builder iframe is clean
3fa3a8c 2026-05-10 feat(studio): add unified Studio platform shell
57e9c7b 2026-05-10 docs(studio): realign Studio platform IA from Claude Design template
5ad7c7c 2026-05-10 test(operator): add headless browser smoke for refinement-run action layer
```

## Server / port inventory

Command used:

```bash
lsof -nP -iTCP -sTCP:LISTEN | egrep 'node|COMMAND|:3000|:5173|:8080|:8888|:5000|:5432' || true
```

Relevant listeners observed:

```text
ControlCe PID 699 listening on TCP *:5000
node PID 15654 listening on TCP *:3333 and *:3334
node PID 38456 listening on TCP *:3336 and *:3335
```

No server was started or stopped during Phase 0/1.

Node/npm inventory:

```text
node v24.14.0
npm 11.9.0
```

Netlify CLI inventory:

```text
netlify-cli/24.0.1 darwin-arm64 node-v24.14.0
```

## Package scripts inventory

Root `package.json` has no scripts; dependencies include Playwright and ws.

`site-studio/package.json` scripts:

```json
{
  "start": "node server.js",
  "dev": "node server.js",
  "studio": "while true; do node server.js; echo '[studio] server exited — restarting in 1s...'; sleep 1; done",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

`mcp-server/package.json` scripts:

```json
{
  "start": "node server.js"
}
```

## Environment / secrets inventory

Secret file checked without printing values:

`/Users/famtasticfritz/.famtastic-secrets/provider-keys.env.md`

Result:

- Exists: yes
- Mode: `0600`
- Size: 3080 bytes
- Simple `KEY=value` parser found no direct env-style assignments, likely because the file is markdown-formatted.

Live environment availability check was run without printing values. The terminal redaction layer masked available values. FAL key was reported unset by the environment check. No secret values were copied into any report.

## Baseline verification

Command run from repo root:

```bash
git diff --check && npm test --prefix site-studio && node tests/studio/lane-static-checks.js && node scripts/plans/audit.js && git status --short --branch
```

Exact result summary:

- `git diff --check`: PASS, no output.
- `npm test --prefix site-studio`: PASS.
  - Vitest v4.1.1.
  - Test files: 4 passed / 4.
  - Tests: 181 passed / 181.
  - Existing classifier/tier diagnostic stdout/stderr appeared; no failures.
- `node tests/studio/lane-static-checks.js`: PASS.
  - `STATIC: 187 PASS / 0 FAIL (total=187)`.
- `node scripts/plans/audit.js`: PASS / clean.
  - Active plans: 8.
  - Drift active + zero open tasks: 0.
  - Conflicts: 0.
  - Orphan tasks: 0.
  - Verdict: clean.
- Final `git status --short --branch`: ran successfully; worktree remains dirty and now includes this overnight report directory.

## Phase 1 pipeline map

### A. Current legacy/basic builder path (`/index.html` cockpit + server engine)

1. Browser client connects to `site-studio/server.js` WebSocket.
2. User sends chat message with `type: 'chat'`.
3. Server handler at `site-studio/server.js:17183+` parses the message.
4. Server loads active `spec.json`, classifies with `classifyRequest(...)`, and routes with `routeToHandler(...)`.
5. `routeToHandler(...)` at `site-studio/server.js:13440+` dispatches:
   - `new_site` / `major_revision` -> `handlePlanning(...)`
   - `build` / `restructure` -> `handleChatMessage(..., 'build', spec)` or `runOrchestratorSite(...)`
   - `content_update`, `layout_update`, `bug_fix`, `restyle` -> `handleChatMessage(...)`
6. The build path writes/updates generated site files under `sites/<tag>/dist/` and associated site state under `sites/<tag>/`.
7. Preview is local static serving from the generated site dist path, with Studio also embedding `/index.html` as the Site Builder screen in the newer Studio shell.

Key code anchors:

- WebSocket message handler: `site-studio/server.js:17183+`
- Dispatcher: `site-studio/server.js:13440+`
- Build trigger helper: `site-studio/server.js:8700+`
- Blueprint read/write API: `GET/POST /api/blueprint` at `site-studio/server.js:5463+`

### B. `/api/new-site` and canonical `createSite()` behavior

`POST /api/new-site` exists at `site-studio/server.js:4384+`.

Current behavior:

1. Requires `tag`.
2. Sanitizes slug and ensures `site-` prefix.
3. Explicitly rejects invalid tier values outside `famtastic` and `clean`.
4. Builds a brief object from body fields: `name`, `business_type`, `tier`, `client_brief`.
5. Calls canonical `createSite(brief, { tag_source: 'caller_supplied', tag, on_collision: 'error' })`.
6. Returns `{ success: true, tag }` on creation, or structured collision-ish error on failure.

Important limitation: `/api/new-site` currently creates/switches site state but does not itself synthesize the design brief or call `triggerSiteBuild(...)`. The helper comments explicitly say half-initialized site is recoverable and the build chain that follows may fail/retry, but the endpoint shown here stops at site creation.

`createSite(...)` exists at `site-studio/server.js:8397+`.

Current behavior:

- Performs identity/collision checks before side effects.
- Creates `sites/<tag>/dist/`.
- Writes `sites/<tag>/spec.json` with `tag`, `site_name`, `business_type`, `state: 'new'`, `tier`, timestamps, interview flags, optional client brief/pages.
- Activates the site: ends old session, switches global `TAG`, writes last site, invalidates cache, resets page/session/Shay state, emits websocket notifications.
- Does not generate HTML by itself.

Supporting build helpers:

- `synthesizeDesignBriefForBuild(brief)` at `site-studio/server.js:8613+` can synthesize/approve a `design_brief` and style fingerprint.
- `triggerSiteBuild(ws, spec)` at `site-studio/server.js:8700+` dispatches `routeToHandler(buildWs, 'build', buildMsg, spec)` but gates on websocket client presence if no ws proxy is supplied.

### C. Current `/studio.html` New Site path

The current new Studio shell Sites screen is `site-studio/public/studio/src/screens/sites.jsx`.

Current behavior:

1. `New site` button toggles a local wizard (`handleNewSite`).
2. Wizard collects:
   - `site_name`
   - `site_tag`
   - `site_type`
   - `starting_recipe`
   - `goal`
   - `notes`
3. `Stage local draft` calls `window.WorkflowAPI.createSiteDraft(payload)`.
4. The workflow API persists via `/api/studio-workflows/sites/drafts`.
5. Drafts are written to `sites/_drafts/<site-tag>/draft.json`.
6. A Studio task is appended to `tasks/tasks.jsonl`.
7. UI marks it as a safe staged draft and sets the resume tag.

Important limitation: this flow does not call `/api/new-site`, does not call `createSite()`, does not synthesize a design brief, and does not trigger the existing builder engine. This is the main MVP bridge gap.

### D. Studio workflow/intelligence ledgers currently available

Router: `site-studio/server/studio-workflows-routes.js`, mounted at `/api/studio-workflows`.

Endpoints mapped:

- `GET /api/studio-workflows/state?tag=` — aggregates workflow state.
- `GET /api/studio-workflows/sites/drafts` — lists site drafts from `sites/_drafts/`.
- `POST /api/studio-workflows/sites/drafts` — creates draft JSON and a Studio task.
- `GET/POST /api/studio-workflows/components/drafts` — component draft persistence.
- `GET/POST /api/studio-workflows/tasks` — Studio task read/append.
- `GET/POST /api/studio-workflows/learning` — learning candidate ledger.
- `GET/POST /api/studio-workflows/outcomes` — build/action outcome ledger.
- `GET/POST /api/studio-workflows/prompt-improvements` — prompt improvement ledger.

Current ledgers are local JSON/JSONL primitives, not yet a complete build/run/cost truth layer.

### E. Deploy readiness / deploy path

`GET /api/deploy-status` returns local/staging/production environment state from `spec.environments` and repo metadata around `site-studio/server.js:1120+`.

`POST /api/deploy` exists at `site-studio/server.js:1154+`.

Current behavior:

1. Accepts `env`, default `staging`.
2. Allows `staging` or `production` by code, but mission constraint says preview/staging only; next phase should block/hide production in Studio MVP flow.
3. Requires active `TAG`.
4. Rejects if deploy is already in progress.
5. Runs `checkNetlify()` preflight for structured failure reason.
6. If Netlify is available, dispatches `runDeploy(broadcastWs, env)` asynchronously and returns `{ ok: true, dispatched: true, env, tag }`.

`checkNetlify()` exists in `site-studio/lib/capability-manifest.js:80+`; Netlify CLI is present in this environment.

Important limitation: deploy endpoint is structured, but Studio MVP still needs an explicit visible preview/staging approval gate, production suppression for this mission, and post-deploy smoke checks.

### F. Edit prompt path

The existing builder chat path supports edits through WebSocket chat classification:

- `content_update`, `layout_update`, `bug_fix` -> `handleChatMessage(...)`
- `restyle` -> `handleChatMessage(..., 'restyle', spec)`
- brainstorm-to-build paths can route additive changes to `layout_update` or full rebuild to `build`.

MVP bridge should reuse this instead of writing a new edit engine. The Studio shell needs a visible edit prompt action that sends through the existing WebSocket/client builder path or a thin structured endpoint that proxies to it safely.

### G. Blueprint contract status

There is already a lightweight blueprint API:

- `GET /api/blueprint`
- `POST /api/blueprint`

It stores page entries with:

- `title`
- `sections`
- `components`
- `layout_notes`
- `global`

This is useful but below the canonical MVP blueprint contract described in `FAMTASTIC-STUDIO-AI-VISION-MVP-PLAN.md`, which wants site id/tag, audience, positioning, pages, sections, content blocks, components, assets, SEO metadata, schema/data requirements, forms/integrations, deploy target, analytics plan, budget estimate, and approval gates.

Phase 2 should extend minimally rather than replace this API.

## Main MVP blocker found

The stated blocker is confirmed:

`/studio.html` New Site currently stages a local draft only. The working builder engine is still behind `/index.html`/WebSocket and `/api/new-site`/`createSite()` primitives. There is no end-to-end Studio New Site -> existing builder engine -> real local preview flow in the current inspected path.

Safe fallback for next phase:

- Keep the existing builder untouched.
- Add a bridge endpoint/action that converts a Studio draft or prompt into the existing `/api/new-site`/`createSite()` brief, then calls `synthesizeDesignBriefForBuild(...)` and `triggerSiteBuild(...)` with a broadcasting websocket proxy or a clearly handled `no_ws_clients` fallback.
- Show draft/build status and preview path in Studio.
- Preserve draft staging as fallback if build dispatch fails.

## Files changed by Phase 0/1 worker

Created/updated:

- `docs/research/famtastic-studio-execution/overnight-20260512/spend-ledger.jsonl`
- `docs/research/famtastic-studio-execution/overnight-20260512/PHASE-0-1-PREFLIGHT-PIPELINE-MAP-REPORT.md`

No code files were modified in Phase 0/1.

## Known gaps for next phases

- Studio New Site does not execute the builder pipeline yet.
- `/api/new-site` creates and switches site state but does not build HTML.
- Studio workflow site drafts are safe handoff artifacts only.
- Blueprint API exists but is not yet the canonical site blueprint contract.
- Studio-visible cost/budget gate is not wired.
- Deploy endpoint permits production by code; MVP UI/bridge must enforce preview/staging only for this mission.
- Need browser smoke for New Site -> build -> preview -> edit -> deploy gate visibility.
- Need local build run/outcome/cost ledger records for each site build.

## Recommended next commands

For Phase 2 start:

```bash
git diff --check
npm test --prefix site-studio
node tests/studio/lane-static-checks.js
```

Then inspect these anchors before editing:

```text
site-studio/public/studio/src/screens/sites.jsx
site-studio/public/studio/src/lib/workflow-api.js
site-studio/public/studio/src/lib/sites-actions.js
site-studio/server/studio-workflows-routes.js
site-studio/server.js:4384
site-studio/server.js:8397
site-studio/server.js:8613
site-studio/server.js:8700
site-studio/server.js:13440
```

Recommended first implementation slice:

1. Add a tested `POST /api/studio-workflows/sites/build-draft` or `/api/studio-build/from-draft` bridge.
2. Reuse `createSite()`, `synthesizeDesignBriefForBuild()`, and `triggerSiteBuild()`.
3. Return structured statuses: created/same-site/collision/build_triggered/no_ws_clients/error.
4. Add UI button beside staged draft: `Build this draft`.
5. Preserve draft staging fallback and append outcome/prompt-improvement records.

## Merge readiness

Not merge-ready as a clean branch from this worker alone.

Phase 0/1 report is safe to stage independently, but the worktree contains many unrelated/parallel dirty files. Human or integration worker should inspect and stage intentionally.
