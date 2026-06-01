# Shay Workspace — install report

**Date:** 2026-06-01
**Upstream:** `outsourc-e/hermes-workspace` v2.3.0
**Clone:** `_refs/hermes-workspace-v2.3/` (SHA `7f845bc9298ed80068f4b9e793fca34b73f3b569`)
**Boot artifacts:** `shay-environments/shay-workspace/`

## Outcome

Third Shay harness is online. Upstream `hermes-workspace` boots against the
Shay gateway (`:8642`) and the Shay dashboard (`:9119`) using nothing but
four environment variables and a matching bearer token. **Zero upstream
patches.**

## Node + dependencies

| | |
|---|---|
| Node version | **v24.14.0** (>= upstream requirement of 22) |
| `npm install` | Success: 1064 packages added, 0 errors, 6 advisory warnings (5 moderate, 1 critical — left for upstream; not blocking the install) |
| Install location | `_refs/hermes-workspace-v2.3/node_modules/` (in-place; upstream `.gitignore` excludes it) |

## Pre-flight: dashboard token verification

Restarted `shay dashboard` with `SHAY_DASHBOARD_TOKEN=shay-workspace-local-dev-token`
in its env. Verified before launching workspace:

```text
no-token probe  :  HTTP 401
with-token probe:  HTTP 200
```

Confirms the dashboard accepts only the matching bearer that workspace will
send via `HERMES_DASHBOARD_TOKEN`.

## Smoke test

`./run-shay-workspace.sh` → `npm run dev` (vite/TanStack). Vite ignored
`APP_PORT` and bound to **3000** (its default). All `/api/*` probes against
`http://127.0.0.1:3000`:

| Probe | Result |
|---|---|
| `GET /` | HTTP 200 |
| `GET /api/ping` | HTTP 200 |
| `GET /api/gateway-status` | HTTP 200 |
| `GET /api/connection-settings` | HTTP 200 |

### `gateway-status` body (the smoking gun)

```json
{
  "capabilities": {
    "health": true, "chatCompletions": true, "models": true, "streaming": true,
    "probed": true, "sessions": true, "enhancedChat": false,
    "skills": true, "memory": true, "config": true, "jobs": true,
    "mcp": false, "mcpFallback": false, "conductor": false, "kanban": false,
    "dashboard": { "available": true, "url": "http://127.0.0.1:9119" }
  },
  "mode": "zero-fork",
  "claudeUrl": "http://127.0.0.1:8642",
  "dashboardUrl": "http://127.0.0.1:9119",
  "gateway":   { "available": true, "url": "http://127.0.0.1:8642" },
  "dashboard": { "available": true, "url": "http://127.0.0.1:9119" }
}
```

`gateway.available=true` **and** `dashboard.available=true` — both Shay
backends are reachable through workspace's probe surface. `mode: zero-fork`
matches the upstream design contract. `source: "env"` (from
`/api/connection-settings`) confirms the `.env` values won.

`mcp/conductor/kanban` are `false` because `HERMES_CLI_BIN` is deliberately
unset (see follow-ups). Workspace degrades gracefully.

## Port note (deviation from spec)

The spec assumed `APP_PORT=3847` would bind the dev server. In practice,
`vite dev` honors only Vite's own port config (default 3000). `APP_PORT`
applies to the **bundled** Electron server (`server-entry.js`) launched by
`electron/main.cjs`. The `.env`, `.env.example`, and `README.md` now
document the split explicitly. Behavior is functionally correct — workspace
is reachable, just on 3000 in dev.

## Files added

- `shay-environments/shay-workspace/.env` (gitignored at repo root or via
  the staged-files filter — only `.env.example` is committed)
- `shay-environments/shay-workspace/.env.example`
- `shay-environments/shay-workspace/run-shay-workspace.sh` (+x)
- `shay-environments/shay-workspace/README.md`
- `plans/shay-environments/SHAY-WORKSPACE-INSTALL-REPORT.md` (this file)

## Follow-ups / open issues

1. **`HERMES_CLI_BIN` shim.** Swarm dispatch, cron profiles, and MCP CLI
   bridge stay disabled until/unless we ship a `shay-cli` shim. Tracked as
   H3 / H9 in scan C.
2. **Vite port.** If we want parity with the Electron wrapper's 3847,
   override Vite via `vite.config` or switch the run script to
   `npm start` (which boots the bundled server-entry under APP_PORT).
3. **Persisted dashboard token.** Right now the dashboard is started ad-hoc
   with `SHAY_DASHBOARD_TOKEN`. For production-of-one usage we should wire
   the token into the launchd plist or the dashboard's standard env file
   so it survives reboots automatically.
4. **`npm audit` advisories.** Six (one critical) — upstream concerns; not
   blocking but worth surfacing upstream.

## Commit

Subject: `feat(shay-environments): boot Shay Workspace`
SHA: `1e1f075`
