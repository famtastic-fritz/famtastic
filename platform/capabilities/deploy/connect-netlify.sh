#!/usr/bin/env bash
# deploy/connect-netlify.sh — connect Netlify to GitHub repo
# Status: V1 manual-prompt (Netlify "connect to git" has no clean API; future: Chrome MCP automation).
# Usage: platform deploy connect-netlify <site>

set -euo pipefail
PLATFORM_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VAULT="$PLATFORM_ROOT/vault/vault.sh"

SITE="${1:?Usage: deploy connect-netlify <site>}"
SPEC="$HOME/famtastic/sites/site-$SITE/spec.json"
REMOTE=$(python3 -c "import json;print(json.load(open('$SPEC'))['site_repo']['remote'])")

vault_has() {
  "$VAULT" read "$1" >/dev/null 2>&1
}

vault_read_first() {
  local id
  for id in "$@"; do
    "$VAULT" read "$id" 2>/dev/null && return 0
  done
  return 1
}

# If netlify-cli is installed and we have a token, try the API path
if command -v netlify >/dev/null && { vault_has studio.netlify.auth_token || vault_has netlify.auth_token; }; then
  TOKEN=$(vault_read_first studio.netlify.auth_token netlify.auth_token)
  export NETLIFY_AUTH_TOKEN="$TOKEN"
  echo "deploy.connect-netlify: creating site via netlify-cli"
  netlify sites:create --name "$SITE" --account-slug "$(netlify api listAccountsForUser | python3 -c 'import json,sys;print(json.load(sys.stdin)[0][\"slug\"])')" || true
  echo "deploy.connect-netlify: setup-git-deploy step requires the UI flow"
  echo "→ Open https://app.netlify.com/sites/$SITE/settings/deploys"
  echo "→ Link the site to: $REMOTE"
  STATUS="partial"
else
  echo "MANUAL STEP REQUIRED:"
  echo "  1. https://app.netlify.com → Add new site → Import an existing project"
  echo "  2. Connect to GitHub → select: $REMOTE"
  echo "  3. Build settings: auto-detected from netlify.toml (publish dir = frontend/)"
  echo "  4. Deploy. Note the netlify slug (e.g. mbsh-reunion-v2.netlify.app)"
  echo ""
  echo "Then run: platform vault write sites/$SITE/netlify_site_id '<the slug>'"
  STATUS="manual_required"
fi

DAY=$(date +%Y-%m-%d)
printf '{"ts":"%s","capability":"deploy.connect-netlify","args":{"site":"%s"},"result":"%s"}\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$SITE" "$STATUS" >> "$PLATFORM_ROOT/invocations/$DAY.jsonl"
