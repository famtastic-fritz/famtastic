#!/usr/bin/env bash
# dns/register-subdomain.sh — register a DNS record at GoDaddy
# Status: V1 manual-prompt (cpanel-mcp DNS coverage is partial).
# Usage: platform dns register-subdomain <site> <subdomain> <type> <value>

set -euo pipefail
PLATFORM_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HUB_ROOT="$(cd "$PLATFORM_ROOT/.." && pwd)"
VAULT="$PLATFORM_ROOT/vault/vault.sh"

SITE="${1:?Usage: dns register-subdomain <site> <subdomain> <type> <value>}"
SUBDOMAIN="${2:?subdomain required (e.g. api, www, send)}"
TYPE="${3:?type required (A, CNAME, TXT, etc.)}"
VALUE="${4:?value required}"
SPEC="$HUB_ROOT/sites/site-$SITE/spec.json"

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

# Try GoDaddy API if credentials in vault
if { vault_has studio.godaddy.api_key && vault_has studio.godaddy.api_secret; } || { vault_has godaddy.api_key && vault_has godaddy.api_secret; }; then
  API_KEY=$(vault_read_first studio.godaddy.api_key godaddy.api_key)
  API_SECRET=$(vault_read_first studio.godaddy.api_secret godaddy.api_secret)
  DOMAIN=$(python3 -c "import json;print(json.load(open('$SPEC'))['environments']['production']['custom_domain'])")
  echo "dns.register-subdomain: PUT to GoDaddy API for $SUBDOMAIN.$DOMAIN $TYPE → $VALUE"
  curl -s -X PUT \
    -H "Authorization: sso-key ${API_KEY}:${API_SECRET}" \
    -H "Content-Type: application/json" \
    "https://api.godaddy.com/v1/domains/$DOMAIN/records/$TYPE/$SUBDOMAIN" \
    -d "[{\"data\":\"$VALUE\",\"ttl\":600}]"
  echo ""
  RESULT="ok"
else
  echo "dns.register-subdomain: GoDaddy API credentials not in vault."
  echo ""
  echo "MANUAL STEP REQUIRED:"
  echo "  1. Log into GoDaddy → Domain Manager → Zone Editor"
  echo "  2. Add record: $SUBDOMAIN  $TYPE  $VALUE  (TTL 600)"
  echo "  3. Save"
  echo ""
  echo "Once done, run: platform vault write studio.godaddy.api_key '<key>' && platform vault write studio.godaddy.api_secret '<secret>'"
  echo "Then re-run this command for full automation."
  RESULT="manual_required"
fi

DAY=$(date +%Y-%m-%d)
printf '{"ts":"%s","capability":"dns.register-subdomain","args":{"site":"%s","sub":"%s","type":"%s"},"result":"%s"}\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$SITE" "$SUBDOMAIN" "$TYPE" "$RESULT" >> "$PLATFORM_ROOT/invocations/$DAY.jsonl"
