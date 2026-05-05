#!/usr/bin/env bash
# cron/register-crons.sh — register cron jobs from spec.backend.cron
# Status: V1 manual-prompt (cPanel cron API not yet wrapped).
# Usage: platform cron register <site>

set -euo pipefail
PLATFORM_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HUB_ROOT="$(cd "$PLATFORM_ROOT/.." && pwd)"
VAULT="$PLATFORM_ROOT/vault/vault.sh"

SITE="${1:?Usage: cron register <site>}"
SPEC="$HUB_ROOT/sites/site-$SITE/spec.json"
[[ -f "$SPEC" ]] || { echo "cron.register: spec not found"; exit 1; }

CPANEL_USER=$(python3 -c "import json;print(json.load(open('$SPEC'))['backend']['cpanel_account'])")
CRONS_JSON=$(python3 -c "import json;print(json.dumps(json.load(open('$SPEC'))['backend'].get('cron',[])))")

echo "cron.register: $SITE has $(echo "$CRONS_JSON" | python3 -c 'import json,sys;print(len(json.load(sys.stdin)))') cron job(s) declared in spec"
echo ""
CPANEL_TOKEN=$("$VAULT" read "studio.cpanel.api_token" 2>/dev/null || true)
[[ -n "$CPANEL_TOKEN" ]] || { echo "cron.register: missing studio.cpanel.api_token"; exit 1; }

CURRENT=$(curl -k -sS -G \
  -H "Authorization: cpanel ${CPANEL_USER}:${CPANEL_TOKEN}" \
  --data-urlencode "cpanel_jsonapi_user=${CPANEL_USER}" \
  --data-urlencode "cpanel_jsonapi_apiversion=2" \
  --data-urlencode "cpanel_jsonapi_module=Cron" \
  --data-urlencode "cpanel_jsonapi_func=fetchcron" \
  "https://FAMTASTICINC.COM:2083/json-api/cpanel")

python3 <<PY | while IFS=$'\t' read -r minute hour day month weekday command; do
import json
crons = json.loads('''$CRONS_JSON''')
for c in crons:
    parts = c.get('schedule', '? ? ? ? ?').split()
    if len(parts) != 5:
        raise SystemExit(f"Invalid cron schedule: {c}")
    script = c.get('script', '?')
    command = f"/usr/bin/php /home/$CPANEL_USER/public_html/{script}"
    print("\\t".join(parts + [command]))
PY
  if python3 -c 'import json,sys
data=json.loads(sys.argv[1])
command=sys.argv[2]
for row in data.get("cpanelresult", {}).get("data", []):
    if row.get("type") == "command" and row.get("command") == command:
        sys.exit(0)
sys.exit(1)' "$CURRENT" "$command"; then
    echo "cron.register: already present: $command"
    continue
  fi

  echo "cron.register: adding $minute $hour $day $month $weekday $command"
  RESPONSE=$(curl -k -sS -G \
    -H "Authorization: cpanel ${CPANEL_USER}:${CPANEL_TOKEN}" \
    --data-urlencode "cpanel_jsonapi_user=${CPANEL_USER}" \
    --data-urlencode "cpanel_jsonapi_apiversion=2" \
    --data-urlencode "cpanel_jsonapi_module=Cron" \
    --data-urlencode "cpanel_jsonapi_func=add_line" \
    --data-urlencode "minute=${minute}" \
    --data-urlencode "hour=${hour}" \
    --data-urlencode "day=${day}" \
    --data-urlencode "month=${month}" \
    --data-urlencode "weekday=${weekday}" \
    --data-urlencode "command=${command}" \
    "https://FAMTASTICINC.COM:2083/json-api/cpanel")
  python3 -c 'import json,sys
data=json.loads(sys.stdin.read())
event=data.get("cpanelresult", {}).get("event", {})
if event.get("result") == 1:
    sys.exit(0)
print(data)
sys.exit(1)' <<<"$RESPONSE"
done

DAY=$(date +%Y-%m-%d)
printf '{"ts":"%s","capability":"cron.register","args":{"site":"%s"},"result":"ok"}\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$SITE" >> "$PLATFORM_ROOT/invocations/$DAY.jsonl"
