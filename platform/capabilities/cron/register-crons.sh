#!/usr/bin/env bash
# cron/register-crons.sh — register cron jobs from spec.backend.cron
# Status: V1 manual-prompt (cPanel cron API not yet wrapped).
# Usage: platform cron register <site>

set -euo pipefail
PLATFORM_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

SITE="${1:?Usage: cron register <site>}"
SPEC="$HOME/famtastic/sites/site-$SITE/spec.json"
[[ -f "$SPEC" ]] || { echo "cron.register: spec not found"; exit 1; }

CPANEL_USER=$(python3 -c "import json;print(json.load(open('$SPEC'))['backend']['cpanel_account'])")
CRONS_JSON=$(python3 -c "import json;print(json.dumps(json.load(open('$SPEC'))['backend'].get('cron',[])))")

echo "cron.register: $SITE has $(echo "$CRONS_JSON" | python3 -c 'import json,sys;print(len(json.load(sys.stdin)))') cron job(s) declared in spec"
echo ""
echo "MANUAL STEP REQUIRED (until cpanel-mcp adds cron CRUD):"
echo "  Open cPanel → Cron Jobs → Add New Cron Job"
echo ""
python3 <<PY
import json
crons = json.loads('''$CRONS_JSON''')
for c in crons:
    schedule = c.get('schedule', '? ? ? ? ?')
    script = c.get('script', '?')
    print(f"  {schedule} /usr/bin/php /home/$CPANEL_USER/public_html/{script}")
PY
echo ""
DAY=$(date +%Y-%m-%d)
printf '{"ts":"%s","capability":"cron.register","args":{"site":"%s"},"result":"manual_required"}\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$SITE" >> "$PLATFORM_ROOT/invocations/$DAY.jsonl"
