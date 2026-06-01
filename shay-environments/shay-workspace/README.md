# Shay Workspace

Third Shay harness — upstream `outsourc-e/hermes-workspace` v2.3.0 wired to
talk to the Shay brain through three env-only hookpoints. Sibling of
`shay-environments/shay-web/` and the legacy Shay Desktop app.

## What this is

`hermes-workspace` is a TanStack Start (React + Vite) full-stack app wrapped
in Electron. The Node side hosts `/api/*` handlers that reach two external
services: a chat gateway and a management dashboard. Per the upstream design
note in `src/server/claude-api.ts`, workspace is a "zero-fork client" — all
backend wiring is controlled by environment variables. We use that.

| Hookpoint            | Env var                  | Shay-side service       |
| -------------------- | ------------------------ | ----------------------- |
| Chat / OpenAI-compat | `HERMES_API_URL`         | `shay gateway`   :8642  |
| Sessions / skills / config | `HERMES_DASHBOARD_URL` | `shay dashboard` :9119 |
| Dashboard bearer     | `HERMES_DASHBOARD_TOKEN` | must match `SHAY_DASHBOARD_TOKEN` in the dashboard process |
| Memory / knowledge / profiles FS root | `HERMES_HOME` | `~/.shay` |

No upstream source files are patched. The only side-effect of install is
`_refs/hermes-workspace-v2.3/node_modules/` being populated in place.

## Prereqs

1. `shay gateway` running on `127.0.0.1:8642` (managed by launchd / legacy boot).
2. `shay dashboard` running on `127.0.0.1:9119`, started with a matching
   bearer token in its environment, e.g.

   ```bash
   cd ~/famtastic/shay-shay
   .venv/bin/shay dashboard --stop 2>/dev/null
   SHAY_DASHBOARD_TOKEN=shay-workspace-local-dev-token \
     nohup .venv/bin/shay dashboard --no-open \
     > /tmp/shay-dash-for-workspace.log 2>&1 &
   disown
   ```

   Verify auth:

   ```bash
   curl -sS -o /dev/null -w "%{http_code}\n" \
     -H "Authorization: Bearer shay-workspace-local-dev-token" \
     http://127.0.0.1:9119/api/sessions
   # → 200
   ```

3. Node >= 22 (workspace's package.json engine requirement). Smoke-tested
   on Node v24.14.0.

## Start

```bash
./run-shay-workspace.sh
```

Loads `.env`, then `exec npm run dev` from inside the upstream clone. Vite
binds to **http://127.0.0.1:3000** (vite default — APP_PORT is honored by the
bundled Electron server, not by `vite dev`).

## Verify both backends reachable

```bash
curl -sS http://127.0.0.1:3000/api/gateway-status | head -c 600
```

Expect `gateway.available=true`, `dashboard.available=true`, and
`source: "env"` confirming the env vars from `.env` won.

## Stop

```bash
pkill -f 'vite dev'
```

Also kills the parent `npm run dev` and the Vite/TanStack child.

## Env reference

See `.env.example`. The single value that **must** be matched in two places
is `HERMES_DASHBOARD_TOKEN` (here) and `SHAY_DASHBOARD_TOKEN` (in the
dashboard's process env).

## Notes

- Upstream code in `_refs/hermes-workspace-v2.3/` is read-only.
  `node_modules/` is installed in place; the upstream `.gitignore` excludes
  it from that repo's working tree.
- The full Electron app launches with `npm run electron:dev` from inside the
  upstream clone. Defer that until interactive use is needed — the headless
  vite/TanStack server already exposes the full `/api/*` surface for
  validation.
- `HERMES_CLI_BIN` (swarm / cron / MCP shellouts) is intentionally unset for
  v1. Workspace degrades gracefully without it; `gateway-status` shows
  `mcp:false`, `conductor:false`, `kanban:false` and those features stay
  disabled.
