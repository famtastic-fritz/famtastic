#!/usr/bin/env bash
# deploy.sh — publish the Agent Business OS landing site to Netlify.
# The site is a static directory (dist/), so this works with the famtastic
# Netlify pipeline. Requires netlify-cli (npm i -g netlify-cli) and a one-time
# `netlify login`. Cash App pay buttons + lead form need no backend.
#
#   bash agent-business-os/deploy.sh            # production deploy
#   bash agent-business-os/deploy.sh --draft    # preview URL only

set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"

[ -f dist/index.html ] || { echo "no dist/index.html" >&2; exit 1; }
command -v netlify >/dev/null || { echo "netlify-cli not found. Install: npm i -g netlify-cli" >&2; exit 1; }

# Warn if the cashtag isn't set yet (pay buttons fall back to the form).
if ! grep -q "ABOS_CASHTAG *= *'\$" dist/assets/js/config.js 2>/dev/null; then
  echo "note: ABOS_CASHTAG isn't set in dist/assets/js/config.js — 'Pay with Cash App' stays off until you set it."
fi

if [ "${1:-}" = "--draft" ]; then
  netlify deploy --dir=dist
else
  netlify deploy --dir=dist --prod
fi
