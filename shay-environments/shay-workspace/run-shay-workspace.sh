#!/usr/bin/env bash
# Boot Shay Workspace — upstream hermes-workspace v2.3 wired to talk to Shay.
#
# Prereqs:
#   - shay gateway   running on :8642
#   - shay dashboard running on :9119, started with
#       SHAY_DASHBOARD_TOKEN=<same-value-as-HERMES_DASHBOARD_TOKEN>
#
# Upstream source stays read-only under _refs/hermes-workspace-v2.3/.
# node_modules/ inside that clone is the only side-effect of installing.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
UPSTREAM="/Users/famtasticfritz/famtastic/_refs/hermes-workspace-v2.3"

# Load .env (export every key/value)
set -a
. "$HERE/.env"
set +a

# Boot via the local overlay proxy (dev-with-overlay.mjs) so Shay chrome
# (shay-chrome.css + shay-chrome.js) is injected into upstream's index.html
# at serve time without modifying _refs/. The proxy starts upstream Vite
# internally on :3000 and re-serves the chrome-injected app on :3002.
#
# Default URLs:
#   http://127.0.0.1:3002 — Shay Workspace (chrome injected)
#   http://127.0.0.1:3000 — raw upstream (no chrome)
#
# To bypass the overlay, comment the exec below and uncomment the upstream
# block:
#   cd "$UPSTREAM"
#   exec npm run dev
cd "$HERE"
exec node dev-with-overlay.mjs
