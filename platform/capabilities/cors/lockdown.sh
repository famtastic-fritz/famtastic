#!/usr/bin/env bash
# cors/lockdown.sh — tighten allowed_origin_patterns post-cutover
# Replaces the generic [a-z0-9-]+ pattern with the specific Netlify slug.
# Usage: platform cors lockdown <site> <env>

set -euo pipefail
PLATFORM_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VAULT="$PLATFORM_ROOT/vault/vault.sh"

SITE="${1:?Usage: cors lockdown <site> <env>}"
ENV="${2:-production}"
SPEC="$HOME/famtastic/sites/site-$SITE/spec.json"

CPANEL_USER=$(python3 -c "import json;print(json.load(open('$SPEC'))['backend']['cpanel_account'])")
CPANEL_HOST=$(python3 -c "import json;print(json.load(open('$SPEC'))['backend']['cpanel_host'])")
SECRETS_PATH=$(python3 -c "import json;print(json.load(open('$SPEC'))['backend']['production_secrets_path'])")

NETLIFY_SLUG=$("$VAULT" read "sites/$SITE/netlify_site_id" 2>/dev/null || echo "")
[[ -n "$NETLIFY_SLUG" ]] || { echo "cors.lockdown: netlify slug not in vault. Run: platform deploy connect-netlify $SITE first"; exit 1; }

NEW_PATTERNS="['/^https:\\\/\\\/[a-z0-9-]+--$NETLIFY_SLUG\\\.netlify\\\.app\$/', '/^https:\\\/\\\/$NETLIFY_SLUG\\\.netlify\\\.app\$/']"

echo "cors.lockdown: patching $CPANEL_HOST:$SECRETS_PATH to lock CORS to $NETLIFY_SLUG"

ssh "$CPANEL_USER@$CPANEL_HOST" "php -r '
\$cfg = require_once \"$SECRETS_PATH\";
\$cfg[\"allowed_origin_patterns\"] = $NEW_PATTERNS;
file_put_contents(\"$SECRETS_PATH\", \"<?php\nreturn \" . var_export(\$cfg, true) . \";\n\");
chmod(\"$SECRETS_PATH\", 0600);
echo \"locked\\n\";
'"

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
