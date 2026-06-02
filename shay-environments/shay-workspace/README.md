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

## Part 3 — Visible rebrand (Shay chrome overlay)

The `chrome/` directory contains the Tier-A visible rebrand overlay for
Shay Workspace. No edits land in `_refs/hermes-workspace-v2.3/`.

```
chrome/
  shay-chrome.css     theme + boot-splash overrides
  shay-chrome.js      preload script: title pin, icon/manifest rewrite,
                      splash <img> swap, meta description rewrite
  shay-favicon.svg    placeholder Shay monogram (regenerate via
                      muapi-logo-branding — flagged follow-up)
```

The overlay overrides the visible chrome surfaces enumerated in
`plans/shay-environments/PART-3-DECISIONS.md §4.3`:
title (`use-page-title.ts:3`, `__root.tsx:129`), favicon /
apple-touch-icon / manifest links (`__root.tsx:166-186`), boot-splash
`<img>` src + alt (`__root.tsx:473-474`), meta description
(`__root.tsx:134`), and the theme CSS custom properties declared at
`styles.css:712` and `:1086`.

### Activation status

**Dev mode (`run-shay-workspace.sh`):** the overlay **is active** via the
local Node proxy `dev-with-overlay.mjs`. The script spawns upstream Vite
on :3000 as a subprocess and serves the chrome-injected app on
**http://127.0.0.1:3002**. The proxy intercepts HTML responses and injects
the chrome `<link>`/`<script>` tags, and serves `/shay-chrome.css` +
`/shay-chrome.js` from this directory's `chrome/`. Raw upstream is still
reachable on :3000 if needed. See
`plans/shay-environments/PART-3-CHROME-WIRING-REPORT.md` for verification.

The Electron preload path described below is still the right target for
the packaged distribution — the dev-mode proxy is staging only.

**Packaged Electron distribution (deferred follow-up):** a thin Shay
Workspace.app wrapper that loads the workspace `dist/` (or
http://127.0.0.1:3000 in dev) with:

```js
new BrowserWindow({
  webPreferences: {
    preload: path.join(process.env.SHAY_CHROME_DIR, 'shay-chrome.js'),
    contextIsolation: false,  // overlay must touch DOM directly
  },
})
```

…activates the overlay end-to-end. That wrapper also handles the
electron-builder Tier-B work (`appId=com.famtastic.shayworkspace`,
`productName=Shay Workspace`, `copyright`, DMG title, GitHub publish
target, `package.json name/description`) which is **out of scope for
Part 3** per `PART-3-DECISIONS.md §5`.

### Inject pattern for the future wrapper

The wrapper registers a `file://` protocol handler (or a tiny local
static server) that maps `/shay-chrome/*` requests to
`$SHAY_CHROME_DIR/*`, then sets `window.__SHAY_CHROME_ASSET_BASE__ =
'/shay-chrome'` before the preload runs so `shay-chrome.js` can resolve
its assets without hardcoding absolute paths. The preload then:

1. Monkey-patches `document.title` setter + installs a `<title>`
   MutationObserver — defeats `BASE_TITLE` writes from
   `use-page-title.ts` and any TanStack head-manager re-renders.
2. Rewrites `<link rel=icon|apple-touch-icon|manifest>` hrefs to
   `/shay-chrome/*` assets. The manifest is replaced with a
   `data:application/manifest+json` URL so `public/manifest.json` stays
   untouched.
3. Observes `document.body` for the boot-splash `<img>` nodes and
   swaps their `src` + `alt` to Shay equivalents.
4. Rewrites `meta[name=description]`, `meta[property="og:title|og:description"]`,
   and `meta[name="apple-mobile-web-app-title"]`.
5. Injects `<link rel=stylesheet href="/shay-chrome/shay-chrome.css">`
   which overrides the Hermes theme tokens at `:root[data-theme=…]`.

### Assets — placeholder status

`chrome/shay-favicon.svg` is a placeholder generated inline (Shay Blue
field, Shay Cream "S", Shay Gold 3-point burst at upper-right) because
the `muapi-logo-branding` skill is not reachable from inside the
workflow agent that ran Part 3 Apply. The full asset set —
`shay-avatar.webp`, `shay-banner.png`, `shay-banner-light.png`,
`shay-icon-192.png`, `shay-icon-512.png`, `shay-apple-touch.png`,
`shay-favicon.ico`, plus refined SVG variants — must be regenerated via
`muapi-logo-branding` using the verbatim brief in
`plans/shay-environments/PART-3-DECISIONS.md §7`. Until then,
`shay-chrome.js` will 404 on every asset path except `shay-favicon.svg`
and `shay-chrome.css`. That is acceptable for staging; the wrapper
follow-up will block on the asset regeneration.

### Env reference

`SHAY_CHROME_DIR` (added in `.env` and `.env.example`) points the
future Electron wrapper at this overlay directory. It is unused by
`npm run dev`.
