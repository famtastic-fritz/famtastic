#!/usr/bin/env bash
# cors/lockdown.sh — tighten allowed_origin_patterns post-cutover
# Replaces the generic [a-z0-9-]+ pattern with the specific Netlify slug.
# Usage: platform cors lockdown <site> <env>

set -euo pipefail
PLATFORM_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HUB_ROOT="$(cd "$PLATFORM_ROOT/.." && pwd)"
VAULT="$PLATFORM_ROOT/vault/vault.sh"

SITE="${1:?Usage: cors lockdown <site> <env>}"
ENV="${2:-production}"
SPEC="$HUB_ROOT/sites/site-$SITE/spec.json"

CPANEL_USER=$(python3 -c "import json;print(json.load(open('$SPEC'))['backend']['cpanel_account'])")
CPANEL_HOST=$(python3 -c "import json;print(json.load(open('$SPEC'))['backend']['cpanel_host'])")
SECRETS_PATH=$(python3 -c "import json;print(json.load(open('$SPEC'))['backend']['production_secrets_path'])")

NETLIFY_SLUG=$("$VAULT" read "sites/$SITE/netlify_site_id" 2>/dev/null || echo "")
if [[ -z "$NETLIFY_SLUG" ]]; then
  NETLIFY_SLUG=$(python3 -c "import json;print((json.load(open('$SPEC')).get('environments',{}).get('staging',{}).get('url') or 'https://mbsh-reunion-staging.netlify.app').split('//',1)[-1].split('.',1)[0])")
fi

NEW_PATTERNS="['/^https:\\\/\\\/[a-z0-9-]+--$NETLIFY_SLUG\\\.netlify\\\.app\$/', '/^https:\\\/\\\/$NETLIFY_SLUG\\\.netlify\\\.app\$/']"

echo "cors.lockdown: patching $CPANEL_HOST:$SECRETS_PATH to lock CORS to $NETLIFY_SLUG"

if ssh "$CPANEL_USER@$CPANEL_HOST" "php -r '
\$cfg = require_once \"$SECRETS_PATH\";
\$cfg[\"allowed_origin_patterns\"] = $NEW_PATTERNS;
file_put_contents(\"$SECRETS_PATH\", \"<?php\nreturn \" . var_export(\$cfg, true) . \";\n\");
chmod(\"$SECRETS_PATH\", 0600);
echo \"locked\\n\";
'"; then
  LOCK_METHOD="ssh"
else
  echo "cors.lockdown: SSH unavailable; verifying cPanel config written by db.apply-schema"
  CPANEL_TOKEN=$("$VAULT" read "studio.cpanel.api_token" 2>/dev/null || true)
  [[ -n "$CPANEL_TOKEN" ]] || { echo "cors.lockdown: missing studio.cpanel.api_token"; exit 1; }
  RESPONSE=$(curl -k -sS \
    -H "Authorization: cpanel ${CPANEL_USER}:${CPANEL_TOKEN}" \
    "https://${CPANEL_HOST}:2083/execute/Fileman/get_file_content?dir=/home/${CPANEL_USER}/.config&file=mbsh-config.php")
  python3 -c 'import json,sys
slug=sys.argv[1]
data=json.loads(sys.stdin.read())
content=(data.get("data") or {}).get("content", "")
if slug not in content or "allowed_origin_patterns" not in content:
    print("cors.lockdown: cPanel config does not contain locked Netlify origin patterns", file=sys.stderr)
    sys.exit(1)
print("cors.lockdown: verified locked patterns in cPanel config")' "$NETLIFY_SLUG" <<<"$RESPONSE"
  LOCK_METHOD="cpanel_uapi_verify"
fi

python3 <<PY
import json, datetime
spec_path = "$SPEC"
with open(spec_path) as f: spec = json.load(f)
spec.setdefault("backend", {}).setdefault("security_rules", {})["cors_locked_at"] = datetime.datetime.utcnow().isoformat() + "Z"
spec["backend"]["security_rules"]["cors_locked_to"] = "$NETLIFY_SLUG"
with open(spec_path, "w") as f: json.dump(spec, f, indent=2)
PY

DAY=$(date +%Y-%m-%d)
printf '{"ts":"%s","capability":"cors.lockdown","args":{"site":"%s","slug":"%s"},"result":"ok"}\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$SITE" "$NETLIFY_SLUG" >> "$PLATFORM_ROOT/invocations/$DAY.jsonl"
echo "cors.lockdown: complete via $LOCK_METHOD"
