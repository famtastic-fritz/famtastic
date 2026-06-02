# Scan C — hermes-workspace v2.3 hookpoint scout

**Upstream:** https://github.com/outsourc-e/hermes-workspace (first URL worked; org slug is `outsourc-e` with hyphen-e suffix)
**Cloned to:** `_refs/hermes-workspace-v2.3`
**Commit SHA:** `7f845bc9298ed80068f4b9e793fca34b73f3b569` (HEAD of `main`, post-v2.3.0 by ~1 PR — #526 stream-drop fix)
**Version per package.json:** `2.3.0`
**Runtime:** Electron shell wrapping a TanStack-Start (React + Vite) full-stack web app; Node server is bundled into Electron and started as a child process by `electron/main.cjs`. Also runs standalone via `node server-entry.js` and ships a Docker compose.
**Date:** 2026-06-01

## Architecture snapshot

- **Stack:** TanStack Start (file-based routing under `src/routes/`), React 18 UI under `src/screens/` and `src/components/`, Zustand stores under `src/stores/`, server handlers colocated under `src/routes/api/**` plus shared modules under `src/server/`. TypeScript end-to-end. Vite for build/dev. Electron wrapper at `electron/main.cjs` + `electron/preload.cjs`. PTY via Python helper (`src/server/pty-helper.py`) — no `node-pty` native addon.
- **Process model:**
  - Electron main spawns the Node server on `APP_PORT=3847` (constant in `electron/main.cjs:18`).
  - Node server is the single backend for all `/api/*` handlers and serves the React UI.
  - **Two external Hermes services** are probed but NOT spawned by workspace: `gateway` at `http://127.0.0.1:8642` and `dashboard` at `http://127.0.0.1:9119`.
  - Electron also has IPC for `desktop:update-state`, single-instance lock, install-script flow (`HERMES_INSTALL_SCRIPT`).
- **Native backend (what it talks to out of the box):** The "Hermes Agent FastAPI" (`hermes-agent` Python package from NousResearch). Workspace is a **zero-fork client** of that backend — see `src/server/claude-api.ts` line 1–6:
  > "HTTP client for the Hermes Agent FastAPI backend (default: http://127.0.0.1:8642). Replaces legacy WebSocket connection for the Hermes Workspace fork."

## Native backend interface

The workspace server is essentially **a thin orchestration layer + a passthrough to two URLs** (gateway + dashboard). All URLs are configurable at runtime.

### URL resolution (the single biggest insight)

`src/server/gateway-capabilities.ts:60–75`:

```ts
export let CLAUDE_API = normalizeUrl(
  _initialOverrides.claudeApiUrl ||
    process.env.HERMES_API_URL ||
    process.env.CLAUDE_API_URL ||
    'http://127.0.0.1:8642',
)
export let CLAUDE_DASHBOARD_URL = normalizeUrl(
  _initialOverrides.claudeDashboardUrl ||
    process.env.HERMES_DASHBOARD_URL ||
    process.env.CLAUDE_DASHBOARD_URL ||
    'http://127.0.0.1:9119',
)
```

Precedence: persisted overrides (`~/.hermes/workspace-overrides.json`) → env vars → defaults. Runtime setters `setGatewayUrl()` / `setDashboardUrl()` mutate + persist + force re-probe. **This is the clean Shay-adapter target — point these at a Shay-shim and 80% of the integration is done.**

### Capability probe

`ensureGatewayProbed()` hits:
- Gateway: `/health`, `/v1/chat/completions`, `/v1/models`
- Dashboard: sessions, skills, config, cron, env, analytics endpoints

Returns a `capabilities` struct that downstream handlers branch on (e.g. `capabilities.dashboard.available`).

### Key native API contracts (FastAPI side, called by workspace)

| Domain | Caller (workspace) | Target endpoint |
|---|---|---|
| Chat session create | `claude-api.ts createSession` | `POST {GATEWAY}/v1/...` (with dashboard fallback `claude-dashboard-api.ts`) |
| Chat streaming send | `claude-api.ts streamChat` | `POST {GATEWAY}/v1/chat/completions` (SSE) |
| Session list/get/messages | `claude-api.ts` | dashboard `:9119` `sessions/*` |
| Models | gateway-capabilities probe | `GET {GATEWAY}/v1/models` |
| Skills install/list | `routes/api/skills/*` | dashboard `:9119` |
| Knowledge / memory | `memory-browser.ts`, `knowledge-browser.ts` | filesystem under `HERMES_HOME` (default `~/.hermes`) |
| Cron / config / jobs | `hermes-config-route.ts`, `hermes-cron-profiles.ts` | dashboard `:9119` |

### CLI shellout (secondary path)

A small set of features shells out to the `hermes` CLI binary (NOT the HTTP API). Search path is in `swarm-dispatch.ts:16–22`, `hermes-cron-profiles.ts:11`, `mcp-cli-bridge.ts:18`:

```ts
const HERMES_BIN_CANDIDATES = [
  process.env.HERMES_CLI_BIN,
  join(homedir(), '.hermes', 'hermes-agent', 'venv', 'bin', 'hermes'),
  join(homedir(), '.local', 'bin', 'hermes'),
  'hermes',
]
```

Used for: swarm dispatch, cron profile management, MCP CLI bridge. Override via `HERMES_CLI_BIN`.

### Filesystem roots

`memory-browser.ts:23–28`:
```ts
const envHome = (process.env.HERMES_HOME || process.env.CLAUDE_HOME)?.trim()
const resolved = envHome ? path.resolve(envHome) : path.resolve(path.join(os.homedir(), '.hermes'))
```
Memory, knowledge, profiles, workspace-overrides, swarm checkpoints all live under `~/.hermes` (or `HERMES_HOME`). **Pointing `HERMES_HOME` at a Shay-owned dir gives us a clean second sandbox.**

### Inventory of `/api/*` routes (139 files under `src/routes/api`)

Highlights grouped:
- **Chat:** `send-stream.ts`, `session-send.ts`, `session-status.ts`, `session-history.ts`, `sessions/send.ts`, `sessions/$sessionKey.*`
- **Terminal:** `terminal-input.ts`, `terminal-stream.ts`, `terminal-resize.ts`, `swarm-tmux-scroll.ts`
- **Skills:** `skills/install.ts`, `skills/uninstall.ts`, `skills/toggle.ts`, `skills/hub-search.ts`
- **Memory / Knowledge:** `swarm-memory/search.ts`, `knowledge/{read,search,graph,list,sync,config}.ts`
- **Swarm (multi-agent):** `swarm-dispatch.ts`, `swarm-roster.ts`, `swarm-kanban.ts`, `swarm-chat.ts`, `swarm-missions.ts`, `swarm-lifecycle.ts`, `swarm-runtime.ts`, `swarm-decompose.ts`, `swarm-environment.ts`, `swarm-orchestrator-loop.ts`, `conductor-spawn.ts`, `conductor-stop.ts`
- **Agents / Tasks:** `start-agent.ts`, `start-claude.ts`, `claude-tasks.ts`, `hermes-tasks.ts`, `claude-jobs.ts`, `claude-config.ts`, `claude-update.ts`
- **MCP:** `mcp.ts`, `mcp/{configure,hub-search,hub-sources.$id,$name.logs}.ts`
- **Inspector / Context:** `context-usage.ts`, `gateway-status.ts`, `crew-status.ts`
- **HermesWorld:** `hermesworld/reservations*` (reserve flow per `src/routes/hermes-world.tsx`)
- **Profiles:** `profiles/{list,read,create,update,delete,activate,rename}.ts`
- **Misc:** `transcribe.ts` (STT), `artifacts.ts`, `integrations.ts`, `local-providers.ts`, `connection-settings.ts`, `hermes-config.ts`, `config-patch.ts`, `playground-npc.ts`, `workspace.ts`, `ping.ts`

## Integration hookpoints (Shay-adapter targets)

### H1 — Gateway URL injection (PRIMARY HOOK)

- **File:** `src/server/gateway-capabilities.ts:60–75`
- **Endpoint / function:** module-level `CLAUDE_API`, `CLAUDE_DASHBOARD_URL` + runtime setters `setGatewayUrl`, `setDashboardUrl`
- **What it natively does:** Resolves which Hermes FastAPI URL to call for chat/sessions/skills. Honors persisted overrides → env → defaults.
- **What a Shay-adapter would need to do:** Run a Shay-shim FastAPI on a Shay-owned port that speaks the `hermes-agent` HTTP contract (at minimum `/health`, `/v1/chat/completions`, `/v1/models`, plus the dashboard session/skills surface for full features). Set `HERMES_API_URL=http://127.0.0.1:<shay-port>` and `HERMES_DASHBOARD_URL=...` before launching workspace. Zero workspace code changes.
- **Risk / complexity:** Low for chat-only (just emulate the OpenAI-compat surface). Medium for parity (dashboard sessions/skills/config). The shim is the bulk of the work — but it's a clean spec.

### H2 — `HERMES_HOME` filesystem root

- **File:** `src/server/memory-browser.ts:23–28`, `knowledge-browser.ts`, `workspace-state-dir.ts`
- **Endpoint:** env var `HERMES_HOME` (or legacy `CLAUDE_HOME`)
- **What it natively does:** Roots memory, knowledge, profiles, workspace overrides, swarm checkpoints under `~/.hermes`.
- **What a Shay-adapter would need to do:** Set `HERMES_HOME=~/.shay/hermes-workspace-home` (or symlink into existing Shay vault). Files Shay vault into Hermes' memory browser cleanly. Optional: bidirectional sync into `~/.shay/SOUL.md` + kanban via fs watcher.
- **Risk / complexity:** Low.

### H3 — `HERMES_CLI_BIN` shellout target

- **File:** `src/server/swarm-dispatch.ts:16–22`, `hermes-cron-profiles.ts:11`, `mcp-cli-bridge.ts:18`
- **Function:** `resolveHermesBin()`
- **What it natively does:** Locates the `hermes` Python CLI binary for swarm dispatch, cron profiles, MCP CLI bridge.
- **What a Shay-adapter would need to do:** Provide a `shay-cli`-shaped shim binary on PATH OR set `HERMES_CLI_BIN=/path/to/shay-shim-cli`. Shim translates the few subcommands workspace calls (mainly `hermes swarm dispatch …`, MCP, cron) into Shay actions.
- **Risk / complexity:** Medium — need to reverse-engineer the exact CLI argv contract from each caller. Skippable if swarm/cron features are out of scope for v1.

### H4 — Chat send: `send-stream` route

- **File:** `src/routes/api/send-stream.ts` + `src/server/chat-backends.ts` + `src/server/claude-api.ts streamChat`
- **Endpoint:** `POST /api/send-stream` (SSE), `POST /api/sessions/send`
- **What it natively does:** UI calls workspace `/api/send-stream`; handler resolves backend via `resolveChatBackend()` → `claude-enhanced` calls `streamChat` (hits gateway `/v1/chat/completions`) or `openai-compat` calls `openaiChat`.
- **What a Shay-adapter would need to do:** No code change — handled by H1. Optionally introduce a 3rd `ChatBackend = 'shay-native'` in `chat-mode.ts` for richer integration (e.g. routing through Shay's quality gates / brain chain pre-dispatch).
- **Risk / complexity:** Low (just URL) or Medium (native backend).

### H5 — Terminal session: PTY helper

- **File:** `src/server/terminal-sessions.ts`, `src/server/pty-helper.py`, routes `terminal-stream.ts` / `terminal-input.ts` / `terminal-resize.ts`
- **Endpoint:** `POST /api/terminal-stream` (SSE), `POST /api/terminal-input`, `POST /api/terminal-resize`
- **What it natively does:** Spawns a Python PTY helper as a child process; provides full TTY semantics over SSE.
- **What a Shay-adapter would need to do:** Probably no change needed — terminal is generic. If Shay wants to inject env (`SHAY_*` vars) or wrap shell with a Shay session-recorder, do it via `process.env.SHELL` override or by replacing the PTY entrypoint.
- **Risk / complexity:** Low (no change) to medium (custom shell wrapper).

### H6 — Skills surface

- **File:** `src/routes/api/skills/*.ts`, skill definitions under `skills/workspace-dispatch/SKILL.md`
- **Endpoint:** `POST /api/skills/install`, `/uninstall`, `/toggle`, `GET /api/skills/hub-search`
- **What it natively does:** install/uninstall calls dashboard `:9119` (when available). `hub-search` is local — scans frontmatter from a hub URL or local catalog via `execFile`.
- **What a Shay-adapter would need to do:** Make the Shay-shim dashboard expose `/api/skills/*` so install/toggle land in Shay's skill index. Or intercept `hub-search` by setting hub URL to a Shay-hosted catalog.
- **Risk / complexity:** Medium — multiple subroutes to mirror.

### H7 — Memory + Knowledge

- **File:** `src/server/memory-browser.ts`, `src/server/knowledge-browser.ts`, routes `api/knowledge/{read,search,graph,list,sync,config}.ts`, `api/swarm-memory/search.ts`
- **Endpoint:** GET/POST under `/api/knowledge/*`, `/api/swarm-memory/search`
- **What it natively does:** Reads markdown + frontmatter from `HERMES_HOME` (memory/, memories/, MEMORY.md), provides search + backlinks.
- **What a Shay-adapter would need to do:** Covered by H2 — pointing `HERMES_HOME` at Shay vault means workspace's memory UI reads Shay's notes directly. For semantic search, mount Shay's vault-semantic-search behind `/api/knowledge/search` (would require patch OR intercepting in the shim's reverse-proxy).
- **Risk / complexity:** Low (filesystem) to medium (semantic search).

### H8 — Inspector / Activity

- **File:** `src/components/inspector/inspector-panel.tsx`, `activity-store.ts`, `src/server/chat-event-bus.ts`
- **Endpoint:** internal event bus → SSE delta events on `/api/send-stream`; `publishChatEvent` is the producer
- **What it natively does:** Tails assistant deltas + tool calls in a side panel.
- **What a Shay-adapter would need to do:** If Shay's brain produces tool-call events server-side, surface them through `publishChatEvent` in the shim — workspace inspector picks them up for free.
- **Risk / complexity:** Low if shim emits same event shape.

### H9 — Swarm dispatch / agents

- **File:** `src/routes/api/swarm-dispatch.ts`, `agents/*/`, `swarm.yaml`, `memory/swarm/`
- **Endpoint:** `POST /api/swarm-dispatch`, `/api/swarm-roster`, `/api/swarm-kanban`, `/api/conductor-spawn`
- **What it natively does:** Shells out to `hermes` CLI to dispatch worker missions; manages roster, kanban, checkpoints, missions on disk (`~/.hermes/...`).
- **What a Shay-adapter would need to do:** Either (a) implement `hermes swarm dispatch …` argv contract in the `shay-cli` shim (H3) so missions become Shay tasks, or (b) skip swarm features in v1 (the workspace surface degrades gracefully when CLI is absent).
- **Risk / complexity:** High if pursued — swarm is the most complex surface and has its own mission/kanban/checkpoint state model. Recommend skipping for v1.

### H10 — HermesWorld + reservations

- **File:** `src/routes/hermes-world.tsx`, `src/routes/api/hermesworld/reservations*`
- **Endpoint:** `GET /api/hermesworld/reservations`, `POST /api/hermesworld/reservations/confirm`, plus reserve flow under `src/routes/reserve/`
- **What it natively does:** A standalone "early access / reservation" mini-app — likely product marketing, not core agent function.
- **What a Shay-adapter would need to do:** Probably nothing — leave native, or strip the route from the build.
- **Risk / complexity:** Low (ignore).

### H11 — Electron desktop IPC

- **File:** `electron/main.cjs`, `electron/preload.cjs`
- **Endpoint / IPC:** `desktop:update-state` (broadcast), single-instance lock, `HERMES_INSTALL_SCRIPT` runner, `electron-updater` integration pointed at the upstream electron-builder publish channel.
- **What it natively does:** Auto-updater, install-script bootstrap for `hermes-agent`, window mgmt.
- **What a Shay-adapter would need to do:** If shipping a "Shay Workspace" binary, replace `HERMES_INSTALL_SCRIPT` URL and `electron-builder.config.cjs` `publish` block. Auto-update can be disabled or pointed at a Shay release feed.
- **Risk / complexity:** Low (config-only fork).

## Adapter strategy recommendation

**Strategy: Shim, not fork.** Workspace v2.3 is unusually well-suited to adapter integration because the entire backend is reached via two configurable URLs (H1) + one filesystem root (H2) + one optional CLI binary (H3). The codebase was explicitly refactored to be a "zero-fork client" of `hermes-agent` (per the `claude-api.ts` header comment and `gateway-capabilities.ts` precedence comment).

**Minimum viable Shay integration (v1):**
1. Build a `shay-gateway` FastAPI shim that implements: `GET /health`, `POST /v1/chat/completions` (SSE), `GET /v1/models`. Have it call into Shay's brain chain / quality gates. Run on a Shay-owned port (e.g. 8742).
2. Build a `shay-dashboard` FastAPI shim covering sessions, skills, config endpoints workspace probes (catalogued by `ensureGatewayProbed`'s probe set in `gateway-capabilities.ts` — worth a focused follow-up to enumerate exactly).
3. Set `HERMES_API_URL`, `HERMES_DASHBOARD_URL`, `HERMES_HOME` before launching workspace's Electron binary.
4. Memory: symlink or point `HERMES_HOME` at a Shay-managed dir; let workspace's native knowledge browser read Shay's vault directly.
5. Skip H3 (swarm CLI) and H9 (swarm dispatch) for v1 — they degrade gracefully.

**Effort estimate:** Most work is in the gateway shim (mapping Shay's brain chain to the OpenAI-compat streaming contract). Workspace itself needs zero patches; possibly a small `electron-builder.config.cjs` fork for branding/auto-update.

**Compared to legacy Electron app's hookup pattern:** Legacy presumably forked + injected calls into `shay-cli` and `kanban_db.py` at chat/skill/memory sites. v2.3 architecture means we move that injection to a *single backend boundary* (the gateway shim) instead of N patch sites. Far cleaner.

## Open questions

1. **Exact dashboard probe surface:** `ensureGatewayProbed()` probes a specific set of dashboard URLs — need a quick enumeration of every distinct path workspace calls on `CLAUDE_DASHBOARD_URL` to scope the shim precisely. (Grep `dashboardFetch(` across `src/server/`.)
2. **Auth / bearer token:** `BEARER_TOKEN` in `gateway-capabilities.ts` — where is it sourced from? If env-injected, shim must accept it; if absent, shim must accept anonymous local calls.
3. **OpenAI-compat compliance level:** does workspace require strict OpenAI-spec streaming (`data: {choices:[{delta:...}]}`) or the Hermes Agent extended shape? `claude-api.ts streamChat` + `openai-compat-api.ts` will answer.
4. **Hermes Agent installer:** workspace's Electron main offers to run the upstream installer. For a Shay-branded build this needs disabling or repointing — minor.
5. **Swarm fork question:** is multi-worker swarm in scope for "Shay Workspace" v1? If yes, H3 + H9 become medium-effort instead of skipped.
6. **Cross-check with siblings A (legacy) and B (webui v0.51):** does v2.3 share storage / session shape with legacy so Shay state survives the migration?
