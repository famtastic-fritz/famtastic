<!--
Pre-Shay-Shay harvested reference
Source worktree: /Users/famtasticfritz/famtastic-convergence-dossier
Source branch: research/studio-intelligence-foundation-20260508
Source path: docs/research/famtastic-studio-execution/server-responsibility-map.md
Consolidation status: current-backlog-reference
Rule: reference only unless reconciled into the current Phase 2 plan.
-->

# Server Responsibility Map - FAMtastic Studio

**Status:** initial research map complete
**Source:** local scan of `site-studio/server.js` on 2026-05-08.

## Finding

`site-studio/server.js` is 20,150 lines and currently mixes server entrypoint behavior with product logic, provider integrations, build orchestration, media handling, component handling, deployment, session state, and Shay orchestration.

This creates high risk for autonomous implementation because unrelated edits can collide inside one file.

## Responsibility Buckets Observed

| Bucket | Evidence from scan | Recommended owner module |
| --- | --- | --- |
| Entrypoint / Express app | Express route registrations and server startup | `server/app.js` or keep in `server.js` thin entrypoint |
| Settings / config / secrets | `loadSettings`, `saveSettings`, secret helper functions | `server/settings.js` |
| Session state | `startSession`, `endSession`, session summaries/history | `server/session-state.js` |
| Site files/spec/blueprint | `readSpec`, `writeSpec`, `SITE_DIR`, `DIST_DIR`, blueprint helpers | `server/site-files.js` |
| Version watcher/rollback | `versionFile`, `getVersions`, rollback endpoints | `server/version-watcher.js` |
| WebSocket events | `wss.clients`, progress/cancel broadcasts | `server/websocket-events.js` |
| Build lifecycle | build metrics, cancel, autonomous build functions | `server/build-pipeline.js` |
| Prompt/context/brain | `loadBrainContext`, prompt snapshot/builders, `.brain` helpers | `server/prompt-context.js`, `server/brain.js` |
| Shay / Shay-Shay | session init, brain select, prompt build, bridge calls | `server/shay/` |
| Components/slots | component routes, slot extraction/replacement, anchors | `server/components.js`, `server/slots.js` |
| Media/assets | uploads, background removal, stock search/apply, image prompt | `server/media.js` |
| Research/intel | `/api/research`, `/api/intel`, memory/jobs endpoints | `server/research.js`, `server/intel.js` |
| Deploy/publish | `/api/deploy`, deploy-info, Netlify handling | `server/deploy.js` |
| Validators | brand health, SEO validation, pure checks | `server/validators.js` |

## Route Concentration

Initial scan found many route registrations in one file, including:

- deploy and repo routes
- spec/site/page routes
- upload/media routes
- slot/component routes
- research/intel routes
- Shay/Shay-Shay routes
- build/cancel/metrics routes
- project/site switch/new site routes

## Risk

The risk is not line count alone. The risk is mixed ownership:

- UI-facing endpoints and provider auth logic live near build logic.
- media/component/slot logic lives near agent orchestration.
- WebSocket broadcast state is shared with unrelated routes.
- secret/config helpers are globally reachable.

## V1 Rule

Do not add major Studio behavior to `server.js` without either:

1. extracting the target responsibility first, or
2. documenting why the change is temporary and adding it to the modularization plan.
