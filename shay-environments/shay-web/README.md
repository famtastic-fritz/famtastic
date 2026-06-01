# Shay Web

Shay Web is the **second harness** wrapping the single Shay brain — upstream
[`nesquena/hermes-webui`](https://github.com/nesquena/hermes-webui) v0.51,
installed read-only out of `_refs/hermes-webui-v0.51/` and configured (via
env vars + a `hermes_cli` shim) to talk to Shay's gateway and Shay's data.

No upstream code is modified. All configuration lives in this directory.

## What's here

```
shay-environments/shay-web/
  .venv/                 — Python 3.11 venv (pip-managed, gitignored)
  .env                   — runtime config (loaded by run-shay-web.sh)
  .env.example           — committed template
  run-shay-web.sh        — boot script
  hermes-cli-shim/       — pip-installable `hermes_cli` -> `shay_cli` shim
  chrome/                — Part-3 visible rebrand overlay (CSS+JS+SVG)
  README.md
```

## Visible rebrand (Part 3)

The `chrome/` directory is wired to upstream hermes-webui via its native
extension contract (`api/extensions.py`). Three env vars (set in `.env`)
plug it in without modifying any upstream file:

```
HERMES_WEBUI_EXTENSION_DIR=…/shay-environments/shay-web/chrome
HERMES_WEBUI_EXTENSION_STYLESHEET_URLS=/extensions/shay-chrome.css
HERMES_WEBUI_EXTENSION_SCRIPT_URLS=/extensions/shay-chrome.js
```

Files:

| File | Purpose |
|---|---|
| `shay-chrome.css` | Overrides `--accent`, `--accent-hover`, `--gold` and related CSS custom properties at `:root` and `:root.dark` to the Shay palette (Blue `#1E5BFF`, Gold `#F5C542`, Red `#E63946`). Hides legacy caduceus mark if JS hasn't run yet. |
| `shay-chrome.js` | IIFE that (1) sets `window._botName='Shay'` before `applyBotName()`, (2) swaps `#appTitlebarTitle` text to "Shay Web", (3) replaces the inline caduceus SVG in `.app-titlebar-icon` with the Shay monogram, (4) rewrites favicon + apple-touch + theme-color + apple-mobile-web-app-title, (5) installs a `MutationObserver` on `<title>` to pin it against `applyBotName` clobbers, (6) post-i18n DOM/attribute sweep replacing residual "Hermes" → "Shay" in titlebar, onboarding modal, settings, dashboard tooltips, (7) re-runs on panel transitions. |
| `shay-mark.svg` | Shay monogram (S in Shay Blue with a gold magic-wand burst). Used as the titlebar mark and as a reference asset. |
| `shay-favicon.svg` | Vector favicon, served at `/extensions/shay-favicon.svg`. |

**Known limits (deferred to Tier B per the Part-3 decisions):**

- `_refs/hermes-webui-v0.51/static/manifest.json` still names the PWA
  "Hermes"; JS cannot override that after install. Already-installed PWAs
  keep the old name until reinstall. A future reverse-proxy `/manifest.json`
  rewrite is the proper fix.
- The Shay mark + favicon are placeholders generated inline; full-color
  variants from `muapi-logo-branding` will land in a follow-up.
- `i18n.js` "Hermes" strings are swept by the post-i18n DOM walk, not by
  patching the `t()` catalog itself; a future i18n monkey-patch is cleaner.

## Start / stop

```bash
# Start (foreground)
./run-shay-web.sh

# Or background
nohup ./run-shay-web.sh > /tmp/shay-web.log 2>&1 &

# Stop
pkill -f 'hermes-webui-v0.51/server.py'
```

Then open: <http://127.0.0.1:8787>

## How it's wired

| Concern | Wired to |
|---|---|
| Chat backend | Shay gateway at `http://127.0.0.1:8642` via `HERMES_WEBUI_CHAT_BACKEND=gateway` |
| Kanban / skills / memory data | `~/.shay/` via `HERMES_HOME` + the `hermes_cli` shim re-exporting `shay_cli.*` |
| Webui session DB / state | `~/.shay/webui/` via `HERMES_WEBUI_STATE_DIR` |
| Bind | `127.0.0.1:8787` (gateway 8642 / dashboard 9119 unaffected) |

The `hermes_cli` shim (`./hermes-cli-shim/`) is pip-installed into the venv;
it re-exports `shay_cli.kanban_db`, `shay_cli.skills`, etc. under the
`hermes_cli.*` namespace upstream webui expects.

## Env vars (see `.env`)

| Var | Value | Purpose |
|---|---|---|
| `HERMES_WEBUI_CHAT_BACKEND` | `gateway` | Route chat through Shay gateway |
| `HERMES_WEBUI_GATEWAY_BASE_URL` | `http://127.0.0.1:8642` | Gateway URL |
| `HERMES_WEBUI_GATEWAY_API_KEY` | *(empty)* | Bearer when gateway requires one |
| `HERMES_HOME` | `/Users/famtasticfritz/.shay` | Shay state root |
| `HERMES_WEBUI_STATE_DIR` | `/Users/famtasticfritz/.shay/webui` | Webui-only session DB |
| `HERMES_WEBUI_HOST` | `127.0.0.1` | Bind host |
| `HERMES_WEBUI_PORT` | `8787` | Bind port |
| `HERMES_WEBUI_PRESERVE_ENV` | `1` | Don't let upstream auto-load its own .env |

## Smoke test

```bash
./run-shay-web.sh &
sleep 5
for p in / /health /api/system/health /api/health/agent /api/gateway/status /api/kanban/boards; do
  code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 3 "http://127.0.0.1:8787$p")
  printf "%-30s HTTP %s\n" "$p" "$code"
done
pkill -f 'hermes-webui-v0.51/server.py'
```

Verified 2026-06-01: all six probes returned `200`. `/api/kanban/boards`
returning 200 confirms the `hermes_cli` shim resolves at runtime —
webui's in-process `kanban_bridge.py` successfully imports
`hermes_cli.kanban_db` and reads from Shay's data.

## Constraints

- `_refs/hermes-webui-v0.51/` is read-only. If something breaks, fix the
  env / shim — never patch upstream.
- `shay-shay/` and `hermes-cli-shim/` are read-only from this harness's
  perspective; they're installed editable but managed elsewhere.
- Don't commit `.env` if it contains real secrets — keep secrets out and
  commit `.env.example` only.
