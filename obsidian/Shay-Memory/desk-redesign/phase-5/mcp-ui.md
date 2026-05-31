---
title: mcp-ui
type: note
permalink: shay-memory/desk-redesign/phase-5/mcp-ui
---

# Phase 5 — MCP Admin UI (label: mcp-ui)

Date: 2026-05-30
Status: complete (recovery pass after session-cap interruption)

## Scope delivered

Built the full MCP server lifecycle admin surface on top of the
already-real `main/domains/mcp.ts` backend (520 LOC with keychain
wiring + overlay file + best-effort gateway probes). All files in
the declared OWNERSHIP set were created — no existing files modified.

## Files created

Renderer UI — `src/renderer/src/admin/mcp/`:

- `McpServersPage.tsx` — SettingsPage wrapper. Lists configured
  servers in a table with name, status pill, tool count, env summary,
  enable toggle, and per-row actions. Header has Refresh + "+ Add MCP
  server". Self-registers via `registerSettingsPage("mcp-servers",
  ...)` + `registerSettingsNavEntry({ id: "mcp-servers", icon:
  "context", category: "Advanced", order: 5 })`. No `mcp` icon exists
  in the registry so we used the closest semantic — `context`
  (SquareStack).
- `McpServerRow.tsx` — purely presentational row component, delegates
  every action to the parent.
- `AddMcpServerDialog.tsx` — modal form: transport picker (stdio /
  http / sse), name, command + args (or url), env vars table with
  per-row secret toggle. Validation + inline Test (when server
  already exists). Calls `mcpService.add(...)`.
- `ConfigureMcpServerDialog.tsx` — thin wrapper around
  `AddMcpServerDialog` that pre-fills from the existing server and
  routes submit through `mcpService.configure({ ...input,
  originalName })` (supports rename).
- `TestMcpServerDialog.tsx` — runs `mcpService.test(name)` on open,
  renders the structured probe log (connecting → handshake →
  list-tools → ping-tool), supports Rerun.
- `McpLoginDialog.tsx` — kicks off `mcpService.login(name)` (which
  opens the OAuth URL via `shell.openExternal` on the main side),
  polls `loginStatus` every 2s until succeeded/failed, surfaces the
  authorize URL with a Re-open button for kiosks / headless setups.
- `McpToolList.tsx` — per-server tool list with a per-tool Test
  button. Reads from `mcpService.listTools(name)` which proxies to
  `/v1/desk/mcp/<name>/tools`. Renders an honest empty state when the
  gateway route is still missing.
- `McpServersPage.module.css` — full styles: table, pills, modal
  shell, env table, probe log, status pills (connected / starting /
  stopped / error / unknown).
- `index.ts` — barrel; side-effect imports `./McpServersPage` so the
  page registers with the SettingsShell on first import.

Renderer service — `src/renderer/src/services/`:

- `mcp-service.ts` — typed wrapper over `window.shay.mcp` /
  `window.shayMcpRpc`. Re-declares the domain types locally because
  the renderer tsconfig excludes `src/main/**` and `src/preload/**`.
  Each method rejects with a descriptive error when neither preload
  binding is present (unit tests, race during boot).

Preload — `src/preload/`:

- `mcp-domain.ts` — mirrors `logs-domain.ts` exactly: builds the typed
  `McpDomain` surface using `buildPreloadBindings` from
  `main/domains/mcp.ts` and mounts it as `window.shayMcpRpc`. Does
  not duplicate the work `domains.ts` already does (which already
  exposes `window.shay.mcp`); both surfaces hit the same IPC
  channels.

## Constraints honored

- Did NOT modify any files outside the OWNERSHIP set. Additive only.
- Did NOT touch `package.json`.
- `tsc --project tsconfig.web.json --noEmit` and `tsc --project
  tsconfig.node.json --noEmit` both pass cleanly — the only error is
  a pre-existing unrelated issue in `shared/i18n/index.ts` (TS2742
  on `sharedI18n` inferred type).
- Used `registerSettingsPage` + `registerSettingsNavEntry` per the
  Account.tsx canonical pattern.
- Read neighboring files first: `domains/mcp.ts`, `settings/pages/
  Account.tsx`, `settings/SettingsShell.tsx`, `settings/SettingsNav.tsx`,
  `preload/logs-domain.ts`, `services/logs-service.ts`,
  `admin/tasks/TaskHistoryTable.tsx`,
  `admin/tasks/BackgroundTasksCenter.module.css`,
  `components/icons/registry.ts`.

## Wiring notes for downstream agents

1. The MCP nav entry registers under `id: "mcp-servers"` in the
   `Advanced` category. It does NOT appear in the shipped manifest
   `SettingsNav.tsx` `DEFAULT_ENTRIES` block — sub-page registration
   adds it on import.
2. For the page to render, something must import
   `@renderer/admin/mcp` (or just `@renderer/admin/mcp/McpServersPage`)
   once at startup. The current `settings/pages/index.ts` does NOT
   import admin/mcp (it is outside the OWNERSHIP scope). The Phase
   6 wiring agent should add `import "@renderer/admin/mcp";` to
   wherever the SettingsShell is mounted (e.g. App root) so the page
   registers before first render.
3. The "Logs" row action dispatches a `shay:admin:logs:open`
   `CustomEvent` with `{ filter: { sources: [`mcp:${name}`] } }` —
   the Logs admin surface (`admin/logs/*`) can pick this up to jump
   directly to a server-filtered view.
4. The `McpLoginDialog` re-opens the authorize URL through
   `window.hermesAPI.openExternal` (legacy bridge) when the user
   clicks "Re-open in browser". `main/domains/mcp.ts → login` already
   calls `shell.openExternal` automatically when the gateway returns
   a URL, so this is just a manual-fallback hatch.

## Backend status surfaced honestly

Until the gateway-side `desk_mcp_routes.py` lands, the UI will show:

- Servers from `~/.shay/config.yaml` with `status: "unknown"`.
- Servers added through the Desk in `isOverlay: true` mode (from
  `~/.shay/mcp-overlay.json`).
- Empty tool list, empty logs, "Gateway unreachable" probe failures
  on Test, "failed" login attempts.

None of this is faked — every empty state is wired to the real
backend response and surfaces the honest reason.