---
title: SHAY-SURFACES-MAP-AND-LAUNCH
type: note
permalink: famtastic/01-shay-platform/shay-surfaces-map-and-launch
---

# Shay Surfaces — Map & Launch

> Recreated 2026-06-05 from the surface READMEs + live verification. The file
> referenced in the original task did not exist on disk; this is the authoritative
> map of what is actually wired, with verified ports and launch order.

## The brain + its two backend services

Every Shay surface talks to the **same two local services**. Start these first —
the Desktop apps do NOT start them themselves.

| Service | Bind | Role | Start |
| --- | --- | --- | --- |
| `shay gateway` (API server platform) | `127.0.0.1:8642` | OpenAI-compat chat API — **the brain** | launchd `ai.shay.gateway`; needs `API_SERVER_ENABLED=true` in `~/.shay/.env` |
| `shay dashboard` | `127.0.0.1:9119` | sessions / skills / config / memory API (token-gated) | `SHAY_DASHBOARD_TOKEN=<token> shay dashboard --no-open` |

- The gateway API server only binds `:8642` when `API_SERVER_ENABLED=true` is in
  `~/.shay/.env` (the gateway loads that file). On loopback no API key is required.
- The dashboard bearer token **must match** `HERMES_DASHBOARD_TOKEN` in
  `shay-environments/shay-workspace/.env` (currently `shay-workspace-local-dev-token`).
- Verify:
  ```bash
  curl -s http://127.0.0.1:8642/health                       # → 200
  curl -s -H "Authorization: Bearer shay-workspace-local-dev-token" \
       http://127.0.0.1:9119/api/sessions                    # → 200
  ```

## The 3 surfaces

| Surface | Kind | Source | Reaches brain via |
| --- | --- | --- | --- |
| **Shay Desktop** | native Electron `.app` | `shay-desktop-electron/` (electron-vite + electron-builder) | defaults to `127.0.0.1:8642` (README §Local backend) |
| **Shay Workspace** | native Electron `.app` | upstream `_refs/hermes-workspace-v2.3` (read-only) wired via env | `HERMES_API_URL`→:8642, `HERMES_DASHBOARD_URL`→:9119, `HERMES_DASHBOARD_TOKEN` |
| **Shay Web** | PWA (no Electron) | upstream `_refs/hermes-webui-v0.51` via `shay-environments/shay-web/run-shay-web.sh` | `HERMES_WEBUI_GATEWAY_BASE_URL`→:8642, served on `127.0.0.1:8787` |

### Shay Desktop.app
- Build: `cd shay-desktop-electron && npx electron-vite build && npx electron-builder --dir`
  → `dist/mac-arm64/Shay Desktop.app` (appId `com.famtastic.shaydesktop`).
- Copy to `~/Desktop`. Reaches the brain on `:8642` as long as the gateway is up.

### Shay Workspace.app
- The packaged `.app` was a deferred follow-up in the workspace README; it is now built:
  ```bash
  cd _refs/hermes-workspace-v2.3
  pnpm electron:bundle-server                                  # esbuild server → electron/server-bundle.cjs
  npx electron-builder --dir -c.appId=com.famtastic.shayworkspace \
      -c.productName="Shay Workspace" --config electron-builder.config.cjs
  # → release/mac-arm64/Shay Workspace.app
  ```
- The packaged app's `electron/main.cjs` **defaults** `HERMES_API_URL`→`127.0.0.1:8642`
  and `HERMES_DASHBOARD_URL`→`127.0.0.1:9119`, so a Finder launch reaches the brain.
- For the dashboard **token** (Finder apps don't inherit shell env), the hookpoints are
  baked into the Desktop copy's `Info.plist` `LSEnvironment` (`HERMES_API_URL`,
  `HERMES_DASHBOARD_URL`, `HERMES_DASHBOARD_TOKEN`, `HERMES_HOME`) and the bundle is
  re-signed ad-hoc. Verified: its internal server (`:3847`) reports
  `gateway.available=true` + `dashboard.available=true`.
- Dev surface (no build, chrome overlay): `shay-environments/shay-workspace/run-shay-workspace.sh`
  → overlay on `127.0.0.1:3002`, raw upstream on `:3000`.

### Shay Web (PWA)
- Start: `shay-environments/shay-web/run-shay-web.sh` → `127.0.0.1:8787`.
- Install as an app window: open `http://127.0.0.1:8787` in Chrome → `⋮` → **Install**
  (or "Create shortcut → Open as window"). This is a manual browser gesture.
- The served manifest is upstream-branded "Hermes"; the `shay-chrome` extension overlay
  rewrites the visible chrome to Shay client-side.

## Launch order / automation

`shay-environments/shay-launch.sh` brings everything up idempotently:

```bash
./shay-environments/shay-launch.sh             # gateway + dashboard
./shay-environments/shay-launch.sh --web       # + Shay Web (:8787)
./shay-environments/shay-launch.sh --workspace # + Workspace dev surface (:3002)
./shay-environments/shay-launch.sh --status    # report only
```

Then double-click **Shay Desktop.app** / **Shay Workspace.app** on the Desktop.

## Known gaps
- The Desktop `.apps` are ad-hoc signed (not notarized) — first launch may need
  right-click → Open. They depend on the gateway/dashboard being up (run the launcher
  or add it as a login item).
- Shay Web PWA "Install" is a manual Chrome gesture (cannot be scripted).
- Workspace.app `Info.plist` `CFBundleName` still reads `hermes-workspace` internally
  (Finder shows "Shay Workspace"); a full rebrand needs the upstream builder config
  overridden at `productName`/`CFBundleName` + the Shay asset set regenerated.