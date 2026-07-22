# M3 Inventory: Live Truth Surfaces and Consumers

**Date:** 2026-07-22
**Owner:** M3 — Inventory live truth surfaces and consumers
**Status:** COMPLETE
**Scope:** `server.js`, `lib/`, and route modules in `server/`

## Summary
Site Studio's runtime authority is currently a mutable global `TAG` plus a set of derived path functions and in-memory state in `server.js`. Persistence is split across SQLite, JSONL, and individual JSON files. Provider calls are centralized through `callSDK()` and `BrainInterface`, but a fallback `spawnClaude()` subprocess path still exists.

## 1. Global TAG Authority

**Location:** `server.js:63`
```js
let TAG = process.env.SITE_TAG || readLastSite() || 'site-demo';
```

**Usage count:** 162 references in `server.js` alone (plus `lib/` modules that receive it via closures/options).

**Authority derived from TAG:**
- `SITE_DIR()` → all site files
- `DIST_DIR()` → build outputs
- `SPEC_FILE()` → canonical spec
- `STUDIO_FILE()` → studio state
- `CONVO_FILE()` → conversation history
- `VERSIONS_DIR()` → versioned outputs
- `SUMMARIES_DIR()` → session summaries
- `UPLOADS_DIR()` → uploaded assets

**Switch sites:** `server.js:5085`, `9251`, `9309` mutate `TAG` directly, then notify WebSocket clients.

**Hard rule for vNext:** No stage in the new runtime may read `TAG` or derive paths from a mutable global. `ProjectContext.project_id` becomes the stable authority; `site_tag` is a projection only.

## 2. Path Derivation

**Functions in `server.js`:**
| Function | Derived path | Notes |
|----------|--------------|-------|
| `SITE_DIR()` | `sites/<TAG>` | All site-scoped state |
| `DIST_DIR()` | `sites/<TAG>/dist` | Build outputs served by Express |
| `SPEC_FILE()` | `sites/<TAG>/spec.json` | Canonical site spec with in-memory cache |
| `STUDIO_FILE()` | `sites/<TAG>/.studio.json` | Studio UI state, build lock flag |
| `CONVO_FILE()` | `sites/<TAG>/conversation.jsonl` | Chat history |
| `VERSIONS_DIR()` | `sites/<TAG>/dist/.versions` | Page version snapshots |
| `SUMMARIES_DIR()` | `sites/<TAG>/summaries` | Session summary markdown |
| `UPLOADS_DIR()` | `sites/<TAG>/dist/assets/uploads` | User uploads |
| `BLUEPRINT_FILE()` | `sites/<TAG>/blueprint.json` | Extracted page structure |

**vNext mapping:** These become projections computed from `ProjectContext` + `RunContext.workspace_root`. The runtime never recomputes paths from `TAG` at execution time.

## 3. Build Lock State

**In-memory globals:** `server.js:298-304`
```js
let buildInProgress = false;
let autonomousBuildActive = false;
let buildOwnerWs = null;
let currentBuildRunId = null;
```

**Lock helper:** `setBuildInProgress(value, ownerWs)` — `server.js:326`
- Sets 10-minute auto-clear timeout.
- Persists `build_in_progress` to `.studio.json`.
- Generates run id: `build-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`.

**Cancel/disconnect:** `killBuildProcesses(ws)` — `server.js:371`
- Kills `ws.currentChild` and `ws.activeChildren`.
- Build owner disconnect releases lock at `server.js:17995`.

**vNext mapping:** Build lock becomes a `RunRecord` status in the authoritative SQLite store. Cancellation propagates via `AbortSignal` to active `StageAttempt`s. Child processes are tracked per `RunContext`, not per `WebSocket`.

## 4. WebSocket Ownership

**WS-attached mutable state observed:**
- `ws.currentChild` — active subprocess
- `ws.activeChildren` — array of subprocesses
- `ws.currentSite`, `ws.currentPage`, `ws.currentMode` — live context
- `ws.brainModels` — per-connection model overrides

**Consumer surface:** `ws.send(JSON.stringify({ type, ... }))` — 282 call sites in `server.js`.

**Key message types (consumers):**
- `status` — progress updates
- `error` — failure notices
- `chat` / `assistant` — chat responses
- `build-plan` — plan approval UI
- `brief` — design brief JSON
- `phase_update` — build phase progress
- `verification-result` / `verification-warning`
- `reload-preview`, `spec-updated`, `pages-updated`
- `site-switched`

**vNext mapping:** WS becomes a subscriber to `RunRecord` events, not the owner of build state. The runtime emits events; WS layer forwards them.

## 5. Spec Read / Write / Cache

**Location:** `server.js:150-266`

**State:**
- `_specCache` — in-memory cache
- `_specCacheTag` — cache ownership tag
- `_specRevision` — monotonic counter persisted in `spec._revision`

**Functions:**
- `readSpec()` — reads `spec.json`, migrates old formats, normalizes fields.
- `writeSpec(spec, options)` — atomic write via tmp file + rename; appends mutation log.
- `invalidateSpecCache()` — clears cache.

**Mutation log:** `sites/<TAG>/mutations.jsonl` — records `level`, `target_id`, `action`, old/new values.

**vNext mapping:** Spec becomes an artifact produced/consumed by recipe stages. `RunContext` carries the immutable input spec; stage outputs produce spec patches as artifacts. The old `_specCache` is replaced by run-scoped input artifacts.

## 6. Trace Writes

**Module:** `lib/build-trace.js`

**Dual write:**
1. Per-site JSONL: `sites/<TAG>/build-trace.jsonl`
2. SQLite: `trace_events` table in `~/.config/famtastic/studio.db`

**Trace shape:** `trace_id`, `parent_trace_id`, `run_id`, `site_tag`, `phase`, `step_id`, `decision_type`, `requested_item`, `selected_path`, `alternatives_considered`, `reason`, `agent`, `tool`, `provider`, `model`, cost fields, `duration_ms`, `status`, `quality_score`, `verification_refs`, `created_jobs`, `gaps`, `error`, `created_at`.

**vNext mapping:** Trace events become first-class `ArtifactManifest` entries with kind `trace_event`. The old `site_tag` field becomes `project_id`. JSONL per run is retained for portability; SQLite remains a queryable projection.

## 7. SQLite Schema Surfaces

**Database:** `~/.config/famtastic/studio.db`

**Tables:**
| Table | Purpose | Authority? |
|-------|---------|------------|
| `sessions` | Chat session metadata | Projection (UI/history) |
| `builds` | Build summary stats | Projection / telemetry |
| `compaction_events` | Context compaction | Telemetry |
| `jobs` | Approval/job queue | Partial workflow state |
| `memories` | Shay-Shay memory | Long-term memory (keep) |
| `memory_links` | Entity relationships | Long-term memory (keep) |
| `trace_events` | Build trace events | Projection of JSONL |
| `agent_performance` | Agent eval telemetry | Telemetry |

**vNext mapping:** Add authoritative run-state tables: `projects`, `runs`, `stage_attempts`, `artifacts`. Existing tables remain as projections/telemetry. `jobs` table may be subsumed by recipe stage attempts or kept for human approval gates.

## 8. Provider Call Surfaces

### Primary: `callSDK(prompt, opts)` — `server.js:20155`
- Uses Anthropic SDK (`_anthropicClient`).
- Falls back to `spawnClaude()` if no API key.
- Timeout handling; supports `maxTokens`, `callSite`, `timeoutMs`.

### Secondary: `spawnClaude(prompt)` — `server.js:20205`
- Spawns `claude --print --model <model> --tools ''`.
- Used when SDK is unavailable or for streaming fallback.
- **Target for M15 removal.**

### `spawnClaudeModel(model, prompt)` — `server.js:20241`
- Same as above but accepts explicit model.

### `BrainInterface` — `lib/brain-interface.js`
- Universal adapter wrapper.
- Maintains per-instance conversation history.
- Injects context header `[MODE] [SITE] [PAGE]`.
- Supports streaming and tool use for Claude only.

### Adapters — `lib/adapters/`
- `claude-adapter.js`
- `codex-adapter.js`
- `gemini-adapter.js`

### Image providers
- `lib/openai-image-adapter.js`
- `@fal-ai/client` direct usage in `server.js`

**vNext mapping:** All provider calls go through execution-family contracts (`TextModelRunner`, `ImageGenerator`, etc.) with adapter registration. `BrainInterface` is reconciled in M7. `spawnClaude` is removed in M15.

## 9. Consumer Surfaces

### HTTP API routes (`server.js` + `server/`)
- `/api/bridge/*` — file read/write/exec bridge for Shay-Shay
- `/api/intelligence/*` — research/actions
- `/api/media` — media registry
- `/api/refinement` — visual refinement
- `/site-assets/*` — static dist assets
- Status/health endpoints

### WebSocket consumers
- Studio UI (localhost:3333)
- Shay-Shay sessions
- Build progress/status stream

### File consumers
- `sites/<TAG>/dist/*.html` — preview server
- `sites/<TAG>/spec.json` — UI spec editor
- `sites/<TAG>/.studio.json` — UI state

**vNext mapping:** Consumers read from published artifacts and `RunRecord` projections. The active production path stays unchanged during shadow execution.

## 10. Job Queue / Memory / Sessions

### Job Queue — `lib/job-queue.js`
- SQLite-backed via `db.jobs`.
- Supports `pending`, `approved`, `running`, `done`, `blocked`, `failed`, `parked`.
- Dependency unblocking on completion.
- Legacy JSONL migration path from `~/.worker-queue.jsonl`.

### Memory — `lib/memory.js`
- SQLite-backed via `db.memories` and `db.memory_links`.
- Entity types: `site`, `user`, `session`, `vertical`, `global`.
- Should remain unchanged; runtime may read memory as input.

### Sessions — `lib/db.js` sessions table
- Tracks `site_tag`, model, tokens, cost, status.
- vNext: link sessions to `run_id`s; keep table as projection.

## 11. Stub / Dead / Broken Paths

**Known dead/stub patterns to investigate further:**
- `server.js` lines 20201+ — `spawnClaude` marked deprecated / emergency fallback.
- `autonomousBuildActive` flag — bypasses plan gate; may be superseded by recipe triggers.
- `_manifestCache` and `_recentCommitsCache` — global caches keyed by time; not run-scoped.
- `pendingPlans` Map — plan approval state in memory; needs run-scoped persistence.
- `BRAIN_LIMITS` — daily usage counters in memory; not persisted across restarts.
- `sessionBrainCounts` — per-session counts in memory.
- `currentBrain` — global brain selection; should move to `RunContext` recipe config.

## 12. Open Questions for Downstream Milestones

1. How many of the 162 `TAG` references are inside the build pipeline vs. UI/admin routes?
2. Which `ws.send` messages are required for consumer parity in the characterization harness?
3. What is the exact contract between `callSDK` and the build stages that need to be preserved?
4. Are old `trace_events` records authoritative, or can they be treated as read-only archive?
5. Does the job queue need to remain a separate system, or should it become a recipe stage family (`HumanApprovalGate`)?

## Files to Freeze
Based on this inventory, the following files are part of the live truth surface and must be covered by vNext contracts:
- `server.js` (build pipeline sections)
- `lib/brain-interface.js`
- `lib/brain-adapter-factory.js`
- `lib/adapters/*.js`
- `lib/build-trace.js`
- `lib/db.js`
- `lib/job-queue.js`
- `lib/studio-events.js`
- `lib/tool-handlers.js`
- `lib/run-id.js`
