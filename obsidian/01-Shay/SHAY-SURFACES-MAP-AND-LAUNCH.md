# Shay Surfaces — map, wiring & desktop-launch handoff (2026-06-05)

> Goal: all 3 surfaces wired + clickable on Fritz's desktop. Desktop + Workspace = Electron .apps;
> Web UI = install as a PWA (not natively Electron). This is a Mac build job → local Claude session.

## Map
| Surface | Path | Type | Launch |
|---|---|---|---|
| Shay Web | `shay-environments/shay-web/` (wraps `_refs/hermes-webui-v0.51`) | web server (browser) | `run-shay-web.sh` |
| Shay Workspace | `shay-environments/shay-workspace/` (wraps `_refs/hermes-workspace-v2.3`, Electron) | Electron | `run-shay-workspace.sh` |
| Shay Desktop | `shay-desktop-electron/` (root, gitignored) | Electron | the project's electron start/build |

## Wiring requirements
- ALL: `shay gateway` on `127.0.0.1:8642`.
- WORKSPACE also needs `shay dashboard` on `127.0.0.1:9119` with `SHAY_DASHBOARD_TOKEN` matching the
  workspace's `HERMES_DASHBOARD_TOKEN`. Env hookpoints: `HERMES_API_URL`→gateway, `HERMES_DASHBOARD_URL`→dashboard,
  `HERMES_DASHBOARD_TOKEN`, `HERMES_HOME`→`~/.shay`.
- WEB: `chrome/` overlay env vars (HERMES_WEBUI_EXTENSION_*) + the `hermes_cli` shim → gateway.

## Handoff (local Claude session on the Mac)
```
Wire all 3 Shay surfaces and make Desktop + Workspace clickable .apps on my desktop.

PREREQ — confirm services up:
  - shay gateway on :8642 (launchd-managed).
  - shay dashboard on :9119 with SHAY_DASHBOARD_TOKEN set (Workspace needs this — see
    shay-environments/shay-workspace/README.md for the exact start command + token match).

1. WORKSPACE (Electron): from shay-environments/shay-workspace/, confirm run-shay-workspace.sh launches
   it wired to the gateway+dashboard. Then BUILD a real .app: in the upstream Electron project
   (_refs/hermes-workspace-v2.3), run its electron build (electron-builder / npm run build:mac or
   equivalent) to produce a "Shay Workspace.app", and copy it to ~/Desktop (or /Applications). Verify
   it opens wired to Shay (chat + sessions load).

2. DESKTOP (Electron): in ~/famtastic/shay-desktop-electron, build the .app the same way
   (electron-builder → "Shay Desktop.app"), place on ~/Desktop. Verify it opens wired to the gateway.

3. WEB UI (not native Electron): set it up as a clickable app WITHOUT building Electron —
   start run-shay-web.sh, open it in Chrome, then ⋮ → Install ("Shay Web") for a desktop app-window/icon.
   (Or, if a real Electron shell is wanted, wrap it with a thin Electron/Tauri loader pointed at the
   web-server URL — but PWA install is the fast path.)

4. Make launch repeatable: for each .app, ensure it (or a wrapper .command) starts the needed services
   if they're not running, OR document the start order. Confirm all 3 open and reach the brain.

Report: which .apps are on the Desktop, and `shay gateway`/`shay dashboard` status.
```

## Notes
- Don't run this on Shay while she's mid vault-semantic rebuild — use a separate local Claude session.
- Web UI as PWA is the pragmatic "desktop app" for the browser surface; native Electron-wrapping it is optional.
