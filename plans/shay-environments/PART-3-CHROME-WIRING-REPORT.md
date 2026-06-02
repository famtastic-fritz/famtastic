# Part 3 — Chrome delivery wiring report

Date: 2026-06-01
Scope: Wire delivery mechanism for previously-built Shay chrome (shay-chrome.js
+ shay-chrome.css + assets) in both Shay Web and Shay Workspace environments so
the chrome actually loads at runtime.

Hard guardrail honored: zero edits under `_refs/hermes-webui-v0.51/` or
`_refs/hermes-workspace-v2.3/`. Integration is by overlay only.

---

## Shay Web (port 8787)

### Diagnosis

The webui extension surface (upstream `api/extensions.py`) reads three env vars:

- `HERMES_WEBUI_EXTENSION_DIR`
- `HERMES_WEBUI_EXTENSION_SCRIPT_URLS`
- `HERMES_WEBUI_EXTENSION_STYLESHEET_URLS`

All three were already correctly set in
`shay-environments/shay-web/.env` (absolute path, valid `/extensions/*` URLs),
and the chrome dir contains the required files. PART-3-VERIFY-REPORT.md
reported chrome not loading; the actual failure was a stale process bound to
:8787 preventing the new run from taking the port. No code changes were
required to wire delivery on Shay Web — it works as configured.

### Verification (this session)

Run script: `shay-environments/shay-web/run-shay-web.sh` (unchanged).

Probe results after fresh boot:

```
/ status:200 title:<title>Hermes</title>
  <link rel="stylesheet" href="/extensions/shay-chrome.css">  ← present
  <script src="/extensions/shay-chrome.js" defer></script>     ← present
/extensions/shay-chrome.js  → 200
/extensions/shay-chrome.css → 200
/api/kanban/boards          → 200  (brain regression test PASS)
```

The server-rendered `<title>` is `Hermes` because the upstream Jinja template
emits it that way; the chrome JS swaps it to `Shay Web` client-side via the
MutationObserver guard (see `shay-chrome.js` lines 27, 56–57, 101). This is
expected and is the only way to defeat the title without modifying upstream.

### Operational note

If chrome appears not to load again, first check:
`lsof -ti :8787` — kill any stale process before re-running the script.

---

## Shay Workspace (port 3002)

### Diagnosis

Upstream `_refs/hermes-workspace-v2.3/package.json` `dev` script is
`vite dev`. There is no Vite extension hook equivalent to webui's
`HERMES_WEBUI_EXTENSION_DIR`. Two overlay artifacts were already built in
this directory by an earlier pass:

1. `vite.config.overlay.ts` — extends upstream config via a dynamic import +
   `mergeConfig`-style spread, adds a `transformIndexHtml` plugin and a
   middleware mount at `/shay-chrome/*`.
2. `dev-with-overlay.mjs` — alternative path: spawn upstream `npm run dev`
   on :3000, then a Node HTTP proxy on :3002 that injects chrome `<link>` +
   bootstrap `<script>` into HTML responses and serves chrome assets from
   `SHAY_CHROME_DIR`.

The proxy approach was chosen because it's TanStack-Start-version-agnostic
(no need to dynamically import upstream's vite config, which can carry side
effects on evaluation), and it cleanly separates the chrome injection from
the upstream Vite lifecycle.

`run-shay-workspace.sh` was still booting `npm run dev` directly inside
`_refs/hermes-workspace-v2.3/`, completely bypassing the overlay. That is
the wiring bug.

### Fix

Edited `shay-environments/shay-workspace/run-shay-workspace.sh` to exec
`node dev-with-overlay.mjs` from the shay-workspace dir instead of
`npm run dev` inside upstream. The overlay script then spawns upstream
Vite on :3000 as a subprocess and serves the chrome-injected proxy on
:3002. To bypass the overlay (raw upstream Vite on :3000), there are
commented instructions in the script.

To undo: revert that single edit — the `exec npm run dev` line on the
prior commit boots upstream untouched.

### Verification

```
http://127.0.0.1:3002/                        → 200, 11.9KB HTML
  occurrences of "shay-chrome" in HTML        → 5  (CSS link + bootstrap script)
  </head> present                              → yes (injection succeeded)
http://127.0.0.1:3002/shay-chrome.js          → 200
http://127.0.0.1:3002/shay-chrome.css         → 200
http://127.0.0.1:3002/api/gateway-status      → 200
  capabilities.health           = true
  capabilities.chatCompletions  = true
  mode                          = portable    (brain regression test PASS)
```

`<title>` in raw HTML is empty/Hermes-default because TanStack-Start renders
the head client-side; the chrome JS title-swap activates on hydration via
the same MutationObserver pattern used on Shay Web.

Dashboard capability (`capabilities.dashboard.available`) is `false`, but
that's because Shay's dashboard service on :9119 isn't running in this test
session — not a regression caused by the overlay.

---

## Remaining gaps

- **Title swap is client-side only.** Any tooling that screenshots without
  executing JS (e.g. raw `curl` HTML snapshot tests) will still see "Hermes"
  in the `<title>` tag. Tests that probe rebrand should drive a real browser
  (Playwright/Puppeteer) or check the chrome script load + observer presence,
  not the raw HTML title.
- **Shay Workspace overlay adds a port hop.** Upstream Vite runs on :3000,
  the chrome-injected app is served on :3002. Anything that hard-codes
  :3000 (Electron `electron:dev`, the `npm run start` bundled server) does
  NOT pick up the chrome. Electron + bundled server delivery is a future
  task — out of scope here.
- **`vite.config.overlay.ts` is still in the tree** as an alternative path.
  It is not currently used by `run-shay-workspace.sh` but was kept because
  the proxy approach is the simpler win and the overlay config is a viable
  fallback if the proxy's HMR proxying ever breaks.
