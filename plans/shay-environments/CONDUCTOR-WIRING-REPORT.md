# Conductor Missions API — Wiring Report

Date: 2026-06-01
Repo touched: `shay-shay/` only. `_refs/` was read-only.

## Goal

Flip the Workspace `conductor: true` capability flag (the last of 4 dormant
flags — kanban/mcp/enhancedChat already verified) by implementing a REAL
`/api/conductor/missions` CRUD surface on Shay's dashboard. The probe
(`_refs/hermes-workspace-v2.3/src/server/gateway-capabilities.ts::probeConductor`,
lines 581-603) flips the flag only when GET returns HTTP 200 + a JSON
content-type. Workspace also POSTs to spawn and DELETEs to stop missions, so
the full CRUD had to round-trip.

## Files changed

- **`shay-shay/shay_cli/conductor_missions.py`** (new) — JSON-file-backed
  mission store at `$SHAY_HOME/conductor/missions.json`. SHAY_HOME resolved
  via `shay_constants.get_shay_home()` (not hardcoded). Atomic writes
  (write-temp-then-`os.replace`) under a module `RLock`. Public API:
  `list_missions()`, `get_mission(id)`, `create_mission(...)`,
  `cancel_mission(id)`.
- **`shay-shay/shay_cli/web_server.py`** — added 4 routes + a
  `_ConductorSpawnBody` Pydantic model, declared **before**
  `_mount_plugin_api_routes()` / `mount_spa(app)` so the SPA catch-all can't
  swallow them. Auth is enforced globally by the existing `auth_middleware`
  for all `/api/` paths (no per-route auth needed). All responses are
  `JSONResponse` (application/json).
- **`shay-shay/tests/shay_cli/test_conductor_missions.py`** (new) — 12 tests,
  co-located with `test_dashboard_bearer_auth.py`.

## Routes

| Method | Path | Behavior |
|---|---|---|
| GET | `/api/conductor/missions` | `{"version":1,"missions":[...]}` — the flag-condition route |
| POST | `/api/conductor/missions` | Accepts `{goal}` and Workspace's `{name, prompt}` shape; creates a `planning` mission, returns it (with `name`+`session_id:null` echoed for `createDashboardConductorMission`) |
| GET | `/api/conductor/missions/{id}` | Returns one mission; optional `?lines=N` accepted (compat, non-mutating); 404 if missing |
| DELETE | `/api/conductor/missions/{id}` | Marks mission + non-terminal assignments `cancelled`; 404 if missing |

## SwarmMission shape matched

Mirrors `_refs/.../src/server/swarm-missions.ts` exactly:

```
SwarmMission = { id, title, state, createdAt, updatedAt, assignments[], events[] }
state ∈ planning|dispatching|executing|reviewing|blocked|complete|cancelled
SwarmMissionAssignment = { id, workerId, task, rationale, dependsOn[],
  reviewRequired, state, dispatchedAt, completedAt, reviewedAt,
  reviewedBy, checkpoint }
SwarmMissionEvent = { id, type, at, message, data? }
```

List response is `{ version: 1, missions: SwarmMission[] }` (swarm-missions.ts:76-79).

## Honest scope (no faked execution)

A created mission is **registered** in `planning` state with its assignments
recorded (`queued`) and a `created` event. Actual worker dispatch into the
shay-agent-os swarm pipeline was NOT bridged — `shay_agent_os` is not
importable from the shay-shay package path, so bridging it cleanly is a
documented **follow-up**. No checkpoints/results are fabricated.

## Test results

`tests/shay_cli/test_conductor_missions.py` — **12 passed** (no-auth 401,
empty-list JSON 200, content-type assertion, POST create, `{name,prompt}`
shape, assignment recording, empty-goal 400, GET-after-POST, `?lines`,
unknown-id 404, DELETE→cancelled+persisted, DELETE unknown 404).

Regression check `pytest tests/shay_cli/ -k 'dashboard or conductor'` —
**62 passed**, no regressions.

## Live verification (probe matched Workspace's probe)

GET (flag condition):
```
HTTP/1.1 200 OK
content-type: application/json
{"version":1,"missions":[]}
```

POST round-trip:
```
{"id":"mission-19e84934c2d-78b4d9","title":"Conductor: verify conductor wiring",
 "state":"planning","createdAt":1780340706349,"updatedAt":1780340706349,
 "assignments":[],"events":[{"id":"evt-...","type":"created",...}],
 "name":"Conductor: verify conductor wiring","session_id":null}
```

Also confirmed live: GET `/{id}` → 200, GET unknown → 404, DELETE → state
`cancelled` (persisted to `~/.shay/conductor/missions.json`). Live test
mission was cleaned out afterward (store reset to empty).

## Commit

SHA: `534a14dd93c20c8599960f09f0cb976986bb515a` (shay-shay repo)

Staged only the 3 touched files; pre-existing unrelated working-tree
changes (kanban.py, shay_constants.py, egg-info, tools/registry.py) were
left untouched.
