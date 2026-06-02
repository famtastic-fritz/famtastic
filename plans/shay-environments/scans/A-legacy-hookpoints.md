# Scan A — Legacy hookpoints in shay-desktop-electron/

**Scope:** read-only scan
**Scanned commit:** `1603cd0c75c88e0d3180e24c23df47da1482a997` (separate git repo nested under famtastic; not a submodule)
**Date:** 2026-06-01

## Headline

- **17 distinct hookpoints** found across **~14 main-process files** + 1 domain module
- **Brain communication patterns observed:**
  1. **Process-spawn over `HERMES_PYTHON`** running `shay <subcommand>` (the canonical `shay-cli`). Used for: chat fallback, kanban CRUD, cron CRUD, skills, auth pool, security center, profiles, insights, `shay doctor`, `shay update`, and **spawning the gateway itself**.
  2. **Process-spawn over `shay-agent-os`** binary (Node CLI on PATH) for swarm dispatch + log follow.
  3. **HTTP to local gateway** at `http://127.0.0.1:8642` (chat completions) and `http://127.0.0.1:8765/healthz` (diagnostics probe). Tasks domain expects a bearer-authed gateway at a configurable base URL with `/v1/tasks` + SSE `/v1/tasks/stream`.
  4. **Direct file/SQLite reads of `<SHAY_HOME>`** = `~/.shay/` (or `$SHAY_HOME` / `$HERMES_HOME` overrides): `state.db`, `build-ledger.db`, `gateway.pid`, `config.yaml`, `auth.json`, `active_profile`, `desktop.json`, `mcp-overlay.json`, `site-studio-port`, profile dirs under `profiles/`, plus `SOUL.md`, `memories/MEMORY.md`/`USER.md`, `cron/jobs.json`.
  5. **Direct markdown read of the master plan** at `~/famtastic/obsidian/Shay-Memory/plans/MASTER-PLAN-2026-05-31.md` for the Plan-tab checklist (D3 anti-drift trace dir at `<SHAY_HOME>/trace/` is detected but not yet consumed).
  6. **SSH tunnel mode** for remote Hermes/Shay: `src/main/ssh-remote.ts` shells `shay kanban …` over `ssh`; `src/main/ssh-tunnel.ts` keeps a port-forwarded gateway alive locally.
- No direct Python-module import; no Unix socket; no direct `kanban_db.py` read. All brain access funnels through (a) `shay` CLI spawn, (b) gateway HTTP, or (c) raw file/SQLite reads of well-known files inside `SHAY_HOME`.

## Hookpoint inventory

### HP-01 — `HERMES_HOME` / `SHAY_HOME` resolution
- **File:** `src/main/installer.ts:23-77`
- **Symbol:** `defaultHermesHome()`, exports `HERMES_HOME`, `HERMES_REPO`, `HERMES_PYTHON`, `HERMES_SCRIPT`, `HERMES_ENV_FILE`, `HERMES_CONFIG_FILE`, `HERMES_AUTH_FILE`, `hermesCliArgs()`
- **What it does:** Resolves the Shay data root. Checks `$SHAY_HOME`, then `$HERMES_HOME`, else picks `~/.shay` (POSIX) or `%LOCALAPPDATA%\shay`/`~/.shay`/`~/.hermes` (Windows). Sniffs for `shay-shay/`, `hermes-agent/`, `gateway.pid`, `config.yaml`, `active_profile`, `.env`. Sets `HERMES_REPO` to `~/famtastic/shay-shay` when present.
- **Depends on:** env vars `SHAY_HOME`, `HERMES_HOME`, `SHAY_REPO`; presence of `~/famtastic/shay-shay`; venv at `$HERMES_REPO/.venv` or `venv` with `bin/python` + `bin/shay`.
- **Why it matters:** Every other hookpoint imports `HERMES_PYTHON` / `HERMES_HOME` / `hermesCliArgs()` from here. Porting this single resolver moves 80% of the integration.

### HP-02 — Generic `shay` CLI fallback for chat
- **File:** `src/main/hermes.ts:533-820`
- **Symbol:** `sendMessageViaCli()`
- **What it does:** Spawns `HERMES_PYTHON $HERMES_SCRIPT [-p profile] chat -q <msg> -Q --source desktop [--resume <sid>] [-m <model>]` from `cwd=HERMES_REPO`. Parses streaming stdout into `cb.onToken` / `cb.onToolProgress` / `cb.onDone`. Inlines text-file attachments as `<file …>` XML; images are dropped (gateway-only).
- **Depends on:** `HERMES_PYTHON`, `HERMES_REPO`, `HERMES_SCRIPT`, profile `.env`, the list of 20 `KNOWN_API_KEYS`.
- **Why it matters:** The fallback path when the gateway HTTP API isn't up. Any upstream port must keep both fast/slow paths.

### HP-03 — Gateway lifecycle (spawn / probe / kill)
- **File:** `src/main/hermes.ts:854-1005`
- **Symbol:** `startGateway()`, `stopGateway()`, `restartGateway()`, `isGatewayRunning()`, `readPidFile()`
- **What it does:** Spawns `HERMES_PYTHON shay gateway` detached with `API_SERVER_ENABLED=true` + all profile API keys in env. Reads `$HERMES_HOME/gateway.pid` (plain int or `{"pid":…}` JSON) to detect a gateway not started by this app. Verifies the PID image-name starts with `python`/`pythonw` (`pidIsAliveAs`).
- **Depends on:** `$HERMES_HOME/gateway.pid`, `HERMES_PYTHON`, `HERMES_REPO`, profile env keys.
- **Why it matters:** This is the canonical "is the brain up?" check, surfaced to renderer as `gateway-status` IPC and the `Gateway` screen pill in `StatusBar`.

### HP-04 — Gateway HTTP chat streaming (fast path)
- **File:** `src/main/hermes.ts:175-525`
- **Symbol:** `sendMessageViaApi()`, `LOCAL_API_URL = "http://127.0.0.1:8642"`, `getApiUrl()`, `getRemoteAuthHeader()`, `isApiServerReady()`
- **What it does:** POSTs OpenAI-shaped `/v1/chat/completions` (`stream:true`, with optional `session_id`) to either the local API server at port 8642 or a remote URL. Parses SSE chunks; on empty stream, makes a non-streaming probe to surface real errors. Honors a bearer token (`API_SERVER_KEY`) for remote/SSH-tunnel mode.
- **Depends on:** gateway listening on 8642 with API server enabled; remote-URL + bearer config (`getConnectionConfig()` from `src/main/config.ts`).
- **Why it matters:** This is the chat surface that the upstream hermes-webui already speaks; it's just retargeted at the Shay gateway here.

### HP-05 — Kanban CLI bridge (16 verbs)
- **File:** `src/main/kanban.ts:1-396`
- **Symbol:** `runKanban()` + `listBoards/currentBoard/switchBoard/createBoard/removeBoard/listTasks/getTask/createTask/assignTask/completeTask/blockTask/unblockTask/archiveTask/specifyTask/reclaimTask/commentTask/dispatchOnce`
- **What it does:** `execFile(HERMES_PYTHON, [HERMES_SCRIPT, '-p', profile, 'kanban', …args])` from `cwd=HERMES_HOME/hermes-agent`. Parses `--json` output. In SSH-tunnel mode delegates to `sshRunKanban()`. In remote-only mode returns a typed "unsupported" error.
- **Depends on:** `shay kanban` CLI in `shay-shay/shay_cli/`; `$HERMES_HOME/hermes-agent/` as cwd; profile resolution.
- **Why it matters:** This *is* the renderer's whole Kanban board — every IPC `kanban-*` channel (see HP-13) routes here. Note the **cwd hack** (`hermes-agent/`) — legacy directory name baked into the path.

### HP-06 — Cron CLI bridge
- **File:** `src/main/cronjobs.ts:1-200` (`runHermesCron()` near line 140-160)
- **Symbol:** `runHermesCron()`, jobs file at `profileHome(profile)/cron/jobs.json`
- **What it does:** Reads `cron/jobs.json` directly for status; mutations shell `HERMES_PYTHON shay cron …`.
- **Depends on:** `shay cron` CLI; `<profile>/cron/jobs.json`.
- **Why it matters:** Cron schedules surface in the Background Tasks tray (HP-15) and AgentMonitor cron grid.

### HP-07 — Skills CLI bridge
- **File:** `src/main/skills.ts:1-380`
- **Symbol:** `runShaySkills*` family — `execFileSync(HERMES_PYTHON, [shay, 'skills', verb, …])`, verbs `list`, `update`, `audit`, `check`, `tap list/add/remove`.
- **Depends on:** `shay skills` CLI; `$HERMES_HOME` env.
- **Why it matters:** Powers the Skills settings page + bundled-vs-installed split.

### HP-08 — Auth pool CLI bridge
- **File:** `src/main/auth-pool.ts:1-200`
- **Symbol:** `runShayAuth()`, `listAuthPool()` (block-parser since there's no `--json`)
- **Depends on:** `shay auth list/add/remove/use` CLI.
- **Why it matters:** AuthPage + provider fallback chain editor.

### HP-09 — Security-center CLI bridge
- **File:** `src/main/security-center.ts:1-180`
- **Symbol:** `runShaySecurity()` — pairings, hooks, checkpoints.
- **Depends on:** `shay security/hooks/checkpoints` subcommands.
- **Why it matters:** Surfaces three shay subsystems behind one Settings → Security panel.

### HP-10 — Insights CLI bridge
- **File:** `src/main/insights.ts:1-330`
- **Symbol:** `execFile(HERMES_PYTHON, [shay, 'insights', …])`
- **Depends on:** `shay insights` CLI.
- **Why it matters:** Usage/cost dashboard data.

### HP-11 — Profiles CLI bridge + state read
- **File:** `src/main/profiles.ts:1-300`
- **Symbol:** `execFileSync(HERMES_PYTHON, hermesCliArgs(['profile', 'use', …]))` plus direct read of `$HERMES_HOME/active_profile`, profile-level `gateway.pid`, `.env`, `SOUL.md`, skill counts.
- **Depends on:** `shay profile` CLI; `$HERMES_HOME/profiles/<name>/`.
- **Why it matters:** Per-profile gateway PIDs let the AgentMonitor show "Gateway running" per profile (file `src/renderer/.../Agents/index.tsx:205`).

### HP-12 — Installer / doctor / update spawn surface
- **File:** `src/main/installer.ts:358-1055`
- **Symbol:** `runHermesDoctor()`, `runHermesUpdate()`, plus install via `bash -c installCmd` or `powershell.exe` Phase 0 bootstrap.
- **Depends on:** `shay doctor`, `shay update`; bundled installers under `$HERMES_HOME/git`, `node`.
- **Why it matters:** First-run / repair path. Probably skipped in a fresh hermes-workspace v2.3 port (workspace ships its own).

### HP-13 — Index IPC mux (153 handlers)
- **File:** `src/main/index.ts:376-1300+`
- **Symbol:** `ipcMain.handle("<channel>", …)` × 153 distinct channels
- **Notable brain-relevant channels:**
  - `start-gateway`, `stop-gateway`, `gateway-status` (line 782-799)
  - `kanban-list-boards`, `kanban-current-board`, `kanban-switch-board`, `kanban-create-board`, `kanban-remove-board`, `kanban-list-tasks`, `kanban-get-task`, `kanban-create-task`, `kanban-assign-task`, `kanban-complete-task`, `kanban-block-task`, `kanban-unblock-task`, `kanban-archive-task`, `kanban-specify-task`, `kanban-reclaim-task`, `kanban-comment-task`, `kanban-dispatch-once` (line 1248-1310+)
  - `get-plan-checklist` (1210), `get-build-tracker` (1213)
  - `read-soul`, `write-soul`, `reset-soul`, `read-memory` (916-927, 872)
  - `list-sessions`, `get-session-messages`, `delete-session` (830-849)
  - `auth-pool-list`, `auth-pool-add` (1038-1039)
  - `security-pairing-*`, `security-hooks-*`, `security-checkpoints-*` (1014-1035)
- **Depends on:** all the modules above.
- **Why it matters:** This is the giant flat surface preload exposes as `window.hermesAPI.*`. Phase 0 plan in `domains/index.ts` is to migrate these to `shay:<domain>:<method>` namespaces.

### HP-14 — Swarm domain (`shay-agent-os` CLI)
- **File:** `src/main/domains/swarm.ts:1-140`
- **Symbol:** `registerSwarmHandlers()` — channels `swarm:agent:list`, `swarm:dispatch`, `swarm:log:stream` (push: `swarm:log:line`)
- **What it does:** `execFile('shay-agent-os', ['list','--json'])`, `spawn('shay-agent-os', ['dispatch', agent, task])` with JSON args piped to stdin, `spawn('shay-agent-os', ['logs', runId, '--follow'])` with stdout line-broadcast to renderer.
- **Depends on:** `shay-agent-os` binary on `PATH` (lives in `~/famtastic/shay-agent-os/`).
- **Why it matters:** The only hookpoint to the swarm dispatcher/pipeline. **Note:** it relies on PATH discovery, not `HERMES_REPO` — fragile if the user has multiple checkouts.

### HP-15 — Tasks domain (gateway HTTP + SSE + local fallback)
- **File:** `src/main/domains/tasks.ts:1-260`
- **Symbol:** `register()`, channels `shay:tasks:list/cancel/retry/pause/resume/pingMe`, push `shay:tasks:task-event` + `shay:tasks:counts-event`
- **What it does:** Calls `GET /v1/tasks` on the gateway (bearer-auth via `hooks.bearerToken`), falls back to merging `loadKanbanTasks()` + `loadCronTasks()` (locally enumerated). Subscribes to `GET /v1/tasks/stream` SSE and re-broadcasts events. Action verbs `PATCH /v1/tasks/{id}/cancel` etc. — 501 today (`gateway/desk_tasks_routes.py` is a stub).
- **Depends on:** gateway base URL + bearer; local kanban/cron loaders.
- **Why it matters:** This is the SSE pattern the upstream port should reuse for every domain (notifications, sessions, etc.).

### HP-16 — Sessions overlay + RPC over `state.db`
- **File:** `src/main/sessions.ts:1-50` (`DB_PATH = $HERMES_HOME/state.db`), `src/main/sessions-overlay.ts:1-260`, `src/main/sessions-rpc.ts:1-100`
- **Symbol:** `shay.sessions.list/get/rename/pin/archive/setProject/setMode/searchFuzzy/fork/delete`; overlay DB at `~/.shay/desktop/sessions-overlay.db` (own SQLite, brain_id + custom_title + pinned/archived).
- **What it does:** Read-only opens `$HERMES_HOME/state.db` for the agent's message history; writes Desk-owned mutations to the overlay DB. Joins both at read time.
- **Depends on:** `better-sqlite3`, schema written by `hermes_state.py` (uses sentinel prefix `\x00json:` for multimodal content).
- **Why it matters:** Reads the brain's authoritative session log without going through the CLI. **Tightly coupled to the agent's DB schema.**

### HP-17 — Plan tracker (master plan markdown reader)
- **File:** `src/main/plan-tracker.ts:1-244`
- **Symbol:** `getPlanChecklist()`, `parsePlanMarkdown()`
- **What it does:** Reads `~/famtastic/obsidian/Shay-Memory/plans/MASTER-PLAN-2026-05-31.md` (override: `$SHAY_PLAN_FILE`). Parses `## LANE X — …` headings and checklist lines `- [x] **A1** title · meta` with the `agnostic-resumable-checklist-v1` vocabulary (`[ ]/[~]/[x]/[!]`). Detects (but doesn't yet consume) anti-drift trace dir at `$SHAY_HOME/trace/nodes.jsonl`.
- **Depends on:** the hard-coded plan filename; obsidian directory layout under `~/famtastic/`.
- **Why it matters:** This is the right-pane Plan-tab checklist source. **Note: the plan filename is literally hardcoded with a date** — will need refresh logic in upstream port.

### HP-18 — Build tracker (durable ledger SQLite reader)
- **File:** `src/main/build-tracker.ts:1-312`
- **Symbol:** `getBuildTracker()`, `aggregate()`
- **What it does:** Opens `$SHAY_HOME/build-ledger.db` (override `$SHAY_BUILD_LEDGER`) read-only with `better-sqlite3`. Queries `SELECT build_id,task_title,profile,outcome,duration_s,tests_run,tests_passed,gate_bypass,protocol_violation,cost_usd,error_signature,ended_at FROM builds`. Computes per-brain p50/p95, failure modes, regression flags.
- **Depends on:** Shay's tracker capture step writing the ledger (capture is collision-free; this is read-only).
- **Why it matters:** Build Tracker analytics screen. **Schema is a hard contract** — any change on the Python writer side breaks this reader.

### HP-19 — Site-Studio sidecar spawn
- **File:** `src/main/site-studio.ts:1-200`
- **Symbol:** `spawn(node, ['server.js'], { cwd: ~/famtastic/site-studio })`; PID/port written to `$HERMES_HOME/site-studio-port` + `site-studio-preview-port`.
- **Depends on:** `~/famtastic/site-studio/server.js`; bundled node binary discovery via `getEnhancedPath()`.
- **Why it matters:** Embeds the FAMtastic Studio process inside the Desk lifecycle. Not strictly "brain", but ports of the legacy app inherit this coupling.

### HP-20 — SSH-tunnel kanban + remote shay
- **File:** `src/main/ssh-remote.ts:1-100`, `src/main/ssh-tunnel.ts:1-200`
- **Symbol:** `sshRunKanban()`, `spawn('ssh', buildSshArgs + [command])`; long-running `ssh -N -L <local>:127.0.0.1:<remote>` for the gateway port-forward.
- **What it does:** When `getConnectionConfig().mode === 'ssh'`, dispatches all kanban verbs over SSH to the remote `shay kanban` CLI; the chat path is served by the locally-tunneled gateway HTTP.
- **Depends on:** `ssh` on PATH; ControlMaster=auto multiplexing; `~/.shay/desktop.json` `connection` block.
- **Why it matters:** Remote-Shay story. The upstream port either inherits this verbatim or scopes it out.

## Backend interface summary

### Process-spawn surface
Two distinct CLIs are shelled:
- **`HERMES_PYTHON $HERMES_SCRIPT` = `$HERMES_HOME/.../venv/bin/python + .../bin/shay`** — driven through the shared helper `hermesCliArgs(args)` (`installer.ts:75`). Subcommands actively invoked: `chat -q -Q --source desktop [--resume]`, `gateway`, `kanban {boards,list,show,create,assign,complete,block,unblock,archive,specify,reclaim,comment,dispatch}`, `cron …`, `skills {list,update,audit,check,tap *}`, `auth {list,add,remove,use}`, `security/hooks/checkpoints`, `insights`, `profile use`, `doctor`, `update`. All run from `cwd = $HERMES_REPO` (or `$HERMES_HOME/hermes-agent` for kanban). All inherit a curated env: PATH (enhanced), HOME, HERMES_HOME, SHAY_HOME, PYTHONUNBUFFERED, all 20 `KNOWN_API_KEYS` + profile `.env`.
- **`shay-agent-os` (bare PATH lookup)** — subcommands `list --json`, `dispatch <agent> <task>` (JSON arg over stdin), `logs <runId> --follow`. **No env curation, no cwd pin.**

### File / IO surface (reads + writes under `$SHAY_HOME` and adjacent)
- Reads: `gateway.pid`, `config.yaml`, `auth.json`, `active_profile`, `desktop.json`, `mcp-overlay.json`, `state.db`, `build-ledger.db`, `site-studio-port`, `site-studio-preview-port`, `cron/jobs.json`, `SOUL.md`, `memories/MEMORY.md`, `memories/USER.md`, `.env`, `profiles/<name>/{.env,SOUL.md,gateway.pid,config.yaml,skills/*}`.
- Writes: `desktop.json` (Desk-owned settings), `mcp-overlay.json`, `desktop/sessions-overlay.db` (own SQLite), `SOUL.md`, memory files (via `safeWriteFile`). Never writes `state.db` or `build-ledger.db`.
- Cross-repo reads: `~/famtastic/obsidian/Shay-Memory/plans/MASTER-PLAN-2026-05-31.md` (master plan), `~/famtastic/site-studio/server.js` (sidecar).
- Anti-drift trace dir at `$SHAY_HOME/trace/nodes.jsonl` is *detected* (`plan-tracker.ts:73-80, 219`) but **not yet consumed**.

### Socket / HTTP surface
- Local: `http://127.0.0.1:8642` (LOCAL_API_URL — OpenAI-compatible `/v1/chat/completions` with SSE, plus `/health`, `/v1/tasks`, `/v1/tasks/stream`). Diagnostics also probes `http://127.0.0.1:8765/healthz` (TODO: pull from profile config).
- Remote: configurable base URL (`getConnectionConfig`) with `Authorization: Bearer <API_SERVER_KEY>`.
- No Unix domain sockets, no named pipes, no gRPC, no websockets (just SSE).

### IPC surface (main ↔ renderer)
- **153 flat `ipcMain.handle` channels** in `src/main/index.ts` — kebab-case (`kanban-create-task`, `start-gateway`, `get-plan-checklist`, `get-build-tracker`, `read-soul`, etc.) exposed via preload as `window.hermesAPI.*`.
- **New `shay:<domain>:<method>` namespaces** being migrated to (Phase 0 scaffold in `src/main/domains/index.ts` + `src/preload/domains.ts` mounting `window.shay`). Live today: `swarm:*` (HP-14), `shay:tasks:*` + push events (HP-15), `shay.sessions.*` (HP-16). Stubs for `auth`, `mcp`, `logs`, `notifications`, `settings`, `keychain`, `capture`, `panels`, `account`.
- Push channels: `swarm:log:line`, `shay:tasks:task-event`, `shay:tasks:counts-event`, `shay:sessions:changed`, hermes streaming token callbacks (passed by ChatHandle, not over IPC events).

## Notes for porting

### Tightly coupled to Electron internals (re-implement per harness)
- The chat-callback ChatHandle pattern in `hermes.ts` (controller.abort + onToken/onToolProgress/onDone) — this is Electron-renderer-specific and assumes long-running IPC.
- `BrowserWindow.webContents.send` for SSE event broadcast in HP-14/HP-15.
- The `contextBridge.exposeInMainWorld("shay", domains)` mount in `src/preload/domains.ts:138`.
- `HIDDEN_SUBPROCESS_OPTIONS` (`src/main/process-options.ts`) for Windows headless spawns of the gateway.
- The site-studio spawn (HP-19) and its port-file convention.

### Portable as-is (pure CLI + file I/O)
- **HP-01 resolver** — drop-in if the upstream uses the same `SHAY_HOME` env contract.
- **HP-05 kanban bridge** — `runKanban()` is pure `execFile` of `shay kanban …`; no Electron.
- **HP-06 cron, HP-07 skills, HP-08 auth, HP-09 security, HP-10 insights, HP-11 profiles, HP-12 doctor/update** — same pattern, pure CLI shells.
- **HP-17 plan tracker** — pure markdown read + parse, no Electron.
- **HP-18 build tracker** — pure `better-sqlite3` reader; the schema is the contract.
- **HP-16 sessions overlay** — pure SQLite; depends on agent's `_CONTENT_JSON_PREFIX = "\x00json:"` sentinel staying stable.
- **HP-15 tasks gateway client** — `gatewayJson()` + SSE pump is just `fetch` + parser; the IPC wrapping is the only Electron bit.

### Surprising / gotchas
- **Kanban cwd quirk:** `runKanban()` pins `cwd = $HERMES_HOME/hermes-agent` (`kanban.ts:121`) — a legacy directory name. If upstream hermes-workspace v2.3 no longer creates that dir, kanban will fail silently with cwd error. **Open question for the overseer.**
- **`shay-agent-os` PATH discovery is fragile** (HP-14) — no cwd, no env enrichment, no fallback to a known install dir like the Python CLI gets via `HERMES_REPO`.
- **Master-plan filename is hardcoded with a date** (`MASTER-PLAN-2026-05-31.md`, HP-17). Override via `$SHAY_PLAN_FILE` only.
- **Two parallel gateway-port assumptions:** chat path uses 8642 (`hermes.ts:26`), diagnostics probes 8765 (`diagnostics.ts:163`). Diagnostics has a TODO to pull from profile config.
- **Anti-drift trace is detected but not consumed** (`plan-tracker.ts:219`). Wiring this in is presumably part of the new integration the overseer is mapping.
- **The gateway-side endpoints `/v1/tasks`, `/v1/desk/sessions/*`, `/v1/desk/mcp/*`, `/v1/desk/plugins/*` are mostly 501 stubs today** (`gateway/desk_tasks_routes.py` etc. in `shay-shay`). The desktop already speaks the contract; upstream port should ensure the matching FastAPI routers exist before declaring parity.
- **`kanban_db.py` is never touched directly.** All kanban access is mediated through `shay kanban` CLI — important if upstream wants a process-less path, they'd need to add a Python addressable surface.
- **No brain_client / run-router / executor / gate references in the Electron source.** Those concepts live entirely behind the `shay` CLI + gateway HTTP boundary from the Desk's perspective.
