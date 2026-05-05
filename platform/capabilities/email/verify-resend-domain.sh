#!/usr/bin/env bash
# email/verify-resend-domain.sh — create + poll a Resend sending domain
# Usage: platform email verify-resend-domain <site>

set -euo pipefail
PLATFORM_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HUB_ROOT="$(cd "$PLATFORM_ROOT/.." && pwd)"
VAULT="$PLATFORM_ROOT/vault/vault.sh"

SITE="${1:?Usage: email verify-resend-domain <site>}"
SPEC="$HUB_ROOT/sites/site-$SITE/spec.json"
[[ -f "$SPEC" ]] || { echo "verify-resend: spec not found"; exit 1; }

DOMAIN=$(python3 -c "import json;print(json.load(open('$SPEC')).get('backend',{}).get('email_sending_domain',''))")
[[ -n "$DOMAIN" ]] || { echo "verify-resend: backend.email_sending_domain not set in spec"; exit 1; }

read_vault_first() {
  local id
  for id in "$@"; do
    "$VAULT" read "$id" 2>/dev/null && return 0
  done
  return 1
}

API_KEY=$(read_vault_first studio.resend.api_key resend.api_key) || {
  echo "verify-resend: missing Studio Resend API key. Run: platform studio bootstrap-services"
  exit 1
}

echo "verify-resend: ensuring domain $DOMAIN exists at Resend"

# Check if domain already verified
EXISTING=$(curl -s -H "Authorization: Bearer $API_KEY" "https://api.resend.com/domains" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for d in data.get('data', []):
    if d.get('name') == '$DOMAIN':
        print(d.get('status', 'unknown'))
        break
")

if [[ "$EXISTING" == "verified" ]]; then
  echo "verify-resend: $DOMAIN already verified ✓"
  STATUS="ok"
else
  if [[ -z "$EXISTING" ]]; then
    echo "verify-resend: creating domain at Resend"
    CREATE=$(curl -s -X POST -H "Authorization: Bearer $API_KEY" -H "Content-Type: application/json" \
      "https://api.resend.com/domains" -d "{\"name\":\"$DOMAIN\"}")
    echo "$CREATE" | python3 -m json.tool 2>/dev/null || echo "$CREATE"
    echo ""
    echo "MANUAL STEP REQUIRED:"
    echo "  Add the DKIM/SPF records above to GoDaddy DNS Zone Editor for $DOMAIN"
    echo "  Then re-run: platform email verify-resend-domain $SITE"
    STATUS="manual_required"
  else
    echo "verify-resend: $DOMAIN exists but status is $EXISTING — DNS records may not have propagated yet"
    STATUS="pending"
  fi
fi

# Update spec
python3 <<PY
import json, datetime
spec_path = "$SPEC"
with open(spec_path) as f: spec = json.load(f)
spec.setdefault("backend", {})["email_sending_domain_state"] = "$STATUS"
if "$STATUS" == "ok":
    spec["backend"]["email_sending_domain_verified_at"] = datetime.datetime.utcnow().isoformat() + "Z"
with open(spec_path, "w") as f: json.dump(spec, f, indent=2)
PY

DAY=$(date +%Y-%m-%d)
printf '{"ts":"%s","capability":"email.verify-resend-domain","args":{"site":"%s","domain":"%s"},"result":"%s"}\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$SITE" "$DOMAIN" "$STATUS" >> "$PLATFORM_ROOT/invocations/$DAY.jsonl"
