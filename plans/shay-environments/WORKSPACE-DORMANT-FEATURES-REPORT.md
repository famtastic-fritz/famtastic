# Workspace Dormant-Features Wiring — Integration Report

Date: 2026-06-01
Author: Claude Code (Opus 4.7, 1M)
Plan: Wire 4 dormant Workspace features (Part 2c follow-on)

## Executive Summary

Four quick-win wiring commits landed against `shay-shay` and one shim commit
landed against `shay-environments/shay-workspace`. All four commits are
green at the unit level. **All four Workspace capability flags
(`kanban`, `mcp`, `enhancedChat`, `conductor`) remain `false` end-to-end
after a clean stack boot.** The wiring lit up the wrong port: the new
endpoints live on the **dashboard (`:9119`)** while Workspace's
`gateway-status` probe reads from the **gateway (`:8642`)**. Brain
regression: **PASS** (gateway + dashboard both `available: true`).

## Commits Shipped This Wave

| Phase | SHA | Repo | Surface |
|---|---|---|---|
| Quick-win: kanban manifest probe | `3b3d4d7` | `shay-shay` | bundled plugin manifest + `/api/plugins/kanban/board` |
| Quick-win: native `/api/mcp*` routes | `b2e4113` | `shay-shay` | CRUD + probe/discover on `web_server.py` |
| Quick-win: `claude-enhanced` chat stream | `881be91` | `shay-shay` | `POST /api/sessions/{sid}/chat/stream` (SSE) |
| Swarm-shim CLI | `a48e552` | `shay-environments/shay-workspace` | `shim/shay-shim-cli` (chat/mcp/cron verbs) |

All four landed independently; no merge conflicts.

## Stack State at Test Time

- shay-shay gateway: `http://127.0.0.1:8642` — `/health` = `{"status":"ok","platform":"shay-shay"}`
- shay-shay dashboard: `http://127.0.0.1:9119` — SPA reachable, token `shay-workspace-local-dev-token`
- Workspace overlay: Vite dev server on `:3000` (no `:3002` overlay proxy started in this boot — single-process mode)
- Boot log: `[gateway] mode=zero-fork core=[health, chatCompletions, models, streaming, dashboard] enhanced=[sessions, skills, memory, config, jobs] missing=[enhancedChat, mcp, mcpFallback]`

## Capability Matrix — BEFORE vs AFTER

`BEFORE` = adversarial verdicts captured before this wave.
`AFTER` = `GET http://localhost:3000/api/gateway-status` after boot of all
four commits.

| Capability | BEFORE | AFTER | Δ |
|---|---|---|---|
| health | true | true | — |
| chatCompletions | true | true | — |
| models | true | true | — |
| streaming | true | true | — |
| probed | true | true | — |
| sessions | true | true | — |
| skills | true | true | — |
| memory | true | true | — |
| config | true | true | — |
| jobs | true | true | — |
| dashboard.available | true | true | — |
| **enhancedChat** | **false** | **false** | unchanged |
| **mcp** | **false** | **false** | unchanged |
| **mcpFallback** | **false** | **false** | unchanged |
| **conductor** | **false** | **false** | unchanged |
| **kanban** | **false** | **false** | unchanged |

Mode: `zero-fork`. claudeUrl: `http://127.0.0.1:8642`. dashboardUrl: `http://127.0.0.1:9119`.

## Per-Feature Status

### 1. Kanban (`kanban: true` capability)

- Commit `3b3d4d7` added a `kanban` bundled plugin manifest in `shay-shay`
  and a working `GET /api/plugins/kanban/board` route on the dashboard.
- Probed directly: `GET http://127.0.0.1:9119/api/plugins/kanban/board` →
  HTTP 401 unauthenticated; HTTP 200 with `Authorization: Bearer
  shay-workspace-local-dev-token`.
- Probed via Workspace: `GET http://localhost:3000/api/kanban` → HTTP 200
  but body is the Vite SPA `index.html` (route fall-through). Capability
  flag `kanban: false`.
- **Root cause of no-light-up:** Workspace's `gateway-status` probe asks
  the **gateway (`:8642`)** about kanban; the wiring landed on the
  **dashboard (`:9119`)**. Gateway returns 404 on the kanban path, so the
  capability probe flips false.
- **Status:** wired but invisible to Workspace.

### 2. MCP integration

- Commit `b2e4113` added native `/api/mcp*` CRUD + probe routes plus a
  dual-named SPA session token on `shay-shay/shay_cli/web_server.py`. 25
  new tests pass.
- Probed via Workspace: `GET http://localhost:3000/api/mcp` → HTTP 200
  with `{"ok":false,"code":"capability_unavailable","capability":"mcp",
  "servers":[],"total":0}`. Workspace's portable MCP shim short-circuits
  to "capability unavailable" because the upstream gateway probe failed.
- Probed direct dashboard with token: `GET http://127.0.0.1:9119/api/mcp`
  → 200. Endpoints exist on the dashboard.
- Probed gateway: `GET http://127.0.0.1:8642/api/mcp` → 404.
- **Root cause:** same as kanban — Workspace gateway probe targets
  `:8642`, wiring landed on `:9119`. Capability stays false.
- **Status:** wired on the wrong port relative to the probe surface.

### 3. enhancedChat (`claude-enhanced` backend)

- Commit `881be91` added `POST /api/sessions/{session_id}/chat/stream`
  (SSE) and a capabilities advertisement on shay-shay. 7/7 tests pass.
- Probed via Workspace: `POST http://localhost:3000/api/sessions/test/chat/stream`
  → HTTP 200, body is the Vite SPA `index.html` — falls through to
  SPA catch-all. Capability flag `enhancedChat: false`.
- The capabilities advertisement that flips the flag is read by the
  gateway probe — gateway (`:8642`) does not expose the advertisement
  endpoint, so `enhancedChat` stays false.
- **Status:** SSE handler exists on dashboard, not seen by gateway
  capability probe.

### 4. Swarm / conductor (shay-shim-cli)

- Commit `a48e552` shipped `shim/shay-shim-cli` with full `chat` verbs
  (TUI + oneshot with checkpoint block accepted by `parseSwarmCheckpoint`)
  and parseable stubs for `mcp test`, `cron list/create/edit/remove/pause/resume/run`.
- `.env.example` updated with `HERMES_CLI_BIN=`; the working `.env` is
  gitignored so the local override exists only on this machine.
- Probed via Workspace: `POST /api/swarm-dispatch {"goal":"ping"}` → 400
  `{"error":"assignments[] or workerIds[] required"}` — endpoint exists,
  contract requires `assignments[{workerId,task}]` payload (not exercised
  in this boot because no roster was registered).
- Capability flag `conductor: false` (the gateway probe doesn't see a
  conductor endpoint regardless of the shim).
- **Status:** shim is in place and the chat oneshot returned a real
  brain answer in checkpoint shape during the swarm-shim author's unit
  test, but no flag flipped at the Workspace probe layer.

## Brain Regression

| Surface | Probe | Result |
|---|---|---|
| shay-shay gateway `:8642` | `GET /health` | `{"status":"ok","platform":"shay-shay"}` |
| shay-shay dashboard `:9119` | `GET /` | HTTP 200 SPA shell |
| Workspace `gateway-status.gateway.available` | true | PASS |
| Workspace `gateway-status.dashboard.available` | true | PASS |
| Core capabilities (health/chat/models/streaming/sessions/skills/memory/config/jobs/dashboard) | true | all PASS |

**Brain regression: PASS.** No core capability was lost. Mode is still
`zero-fork`. All ten baseline capabilities remain true.

## Follow-Ups (priority order)

1. **The architectural mismatch.** Either:
   a. Move the four wired endpoints (kanban board, `/api/mcp*`,
      `/api/sessions/:sid/chat/stream`) from the dashboard process onto
      the **gateway** at `:8642`, OR
   b. Teach Workspace's `gateway-status` capability probe to consult the
      **dashboard** (`:9119`) for these four capabilities and flip the
      flags accordingly.
   The codebase as committed assumes (b) was the design intent (note the
   "dashboard plugin manifest" framing) but the probe wiring still asks
   only the gateway. Pick one and finish it.

2. **Vite SPA catch-all masks 404s.** `/api/kanban`,
   `/api/sessions/:id/chat`, and similar unrouted paths return HTTP 200
   with the SPA `index.html` body. Add a dev middleware that returns 404
   JSON for unmatched `/api/*` so failures stop being silent.

3. **`mcpFallback` path.** Workspace exposes an `mcpFallback` flag that
   could surface local MCP daemons without gateway help. Currently false.
   If the dashboard-as-MCP-host design is the target, wire this flag to
   the dashboard probe.

4. **`HERMES_CLI_BIN` in `.env`.** Verified only via direct shim unit
   tests; the live `/api/swarm-roster`, `/api/swarm-dispatch`,
   `/api/conductor-spawn` round-trip was not driven to a 200 in this
   wave (dispatch needs an `assignments[]` payload + a registered
   roster). Add an integration test that posts a full assignment and
   asserts the checkpoint block round-trips.

5. **Conductor endpoint.** `GET /api/conductor` returned 200 with empty
   body — neither a real handler nor a clean 404. Decide whether
   `conductor: true` should be driven by the shim's presence or by a
   gateway-side handler, and wire accordingly.

6. **Vite stability under probing.** Adversarial verdict for swarm-shim
   reported Vite dying mid-test after a few requests. Did not reproduce
   in this boot but flagged for monitoring.

## Verdict

Wiring shipped. End-to-end light-up did not. The four capability flags
that this wave was meant to flip are all still `false` because the
Workspace probe and the new endpoints disagree about which port owns
them. Brain regression is clean. The next wave is a one-decision fix:
which process (gateway or dashboard) owns the capability surface —
then either move the endpoints or move the probe.

---

## CORRECTION — verified ground truth (Opus 4.8 overseer, post-workflow)

The "all four false" verdict above was a **stale-capability-cache artifact**, not
reality. Workspace probes capabilities ONCE at server startup; the workflow's
verifiers booted Workspace before the new endpoints were live (or before the
dashboard was up with the matching token), so the cache captured false. The
endpoints themselves were fine.

After a coordinated full-stack boot (gateway restarted to load enhanced-chat
routes; dashboard restarted with token; Workspace booted fresh to clear the
probe cache), **all four target flags are TRUE**, verified by direct probes
that replicate Workspace's exact probe conditions:

| Flag | Probe | Result | Status |
|---|---|---|---|
| kanban | `GET :9119/api/plugins/kanban/board` | 200 JSON (real board) | **TRUE** |
| mcp | `GET :9119/api/mcp` | 200 JSON (real servers) | **TRUE** |
| enhancedChat | `POST :8642/api/sessions/__probe__/chat/stream` | 400 (non-404/403/405) | **TRUE** |
| conductor | `GET :9119/api/conductor/missions` | 200 + application/json | **TRUE** |
| mcpFallback | (fallback for mcp=false) | false | correct — mcp is true |

Final Workspace `/api/gateway-status` capability matrix: kanban, mcp,
enhancedChat, conductor all `true`. Baseline (health, chatCompletions, models,
streaming, sessions, skills, memory, config, jobs, gateway.available,
dashboard.available) all `true`. **Zero regression.**

### What made each flag flip
- **kanban / mcp** — endpoints were already correct (commits `3b3d4d7`, `b2e4113`);
  only a fresh Workspace boot was needed to clear the stale probe cache.
- **enhancedChat** — route existed in committed code (`gateway/chat_stream_routes.py`,
  commit `881be91`) but the gateway process was running pre-commit code; a
  `shay gateway restart` loaded it. POST now returns a structured 400, which the
  probe reads as "enhanced fork present."
- **conductor** — needed a real endpoint (commit `534a14d`,
  `shay_cli/conductor_missions.py`): GET/POST/GET-one/DELETE backed by a JSON
  store at `$SHAY_HOME/conductor/missions.json`, returning the `SwarmMission`
  shape. Spawn/stop round-trip verified (GET /{id} 200, DELETE ok, unknown 404).

### Honest open follow-up (not a fake green)
Conductor missions are **registered** in `planning` state but actual worker
dispatch into the shay-agent-os swarm pipeline is NOT yet bridged — `shay_agent_os`
is not importable from the shay-shay package path. So a mission spawned from the
Conductor UI persists and is visible, but does not yet execute workers. This is
the genuine next frontier: bridge swarm execution (either make shay-agent-os
importable/installable into the dashboard+gateway venvs, or have the conductor
POST shell out to a dispatch entrypoint). Same underlying gap applies to the
swarm-shim's non-chat verbs. Everything else is live and verified.
