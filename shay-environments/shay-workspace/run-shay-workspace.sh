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

cd "$UPSTREAM"

# Headless Vite/TanStack dev server (the Node + /api surface only).
# For the full Electron app, swap to:  npm run electron:dev
exec npm run dev
