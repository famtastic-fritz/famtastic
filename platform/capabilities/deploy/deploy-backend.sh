#!/usr/bin/env bash
# deploy/deploy-backend.sh — rsync backend/ to GoDaddy public_html/
# Usage: platform deploy backend <site>

set -euo pipefail
PLATFORM_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

SITE="${1:?Usage: deploy backend <site>}"
SPEC="$HOME/famtastic/sites/site-$SITE/spec.json"
[[ -f "$SPEC" ]] || { echo "deploy.backend: spec not found at $SPEC"; exit 1; }

SITE_REPO=$(python3 -c "import json;print(json.load(open('$SPEC'))['site_repo']['path'])")
CPANEL_HOST=$(python3 -c "import json;print(json.load(open('$SPEC'))['backend']['cpanel_host'])")
CPANEL_USER=$(python3 -c "import json;print(json.load(open('$SPEC'))['backend']['cpanel_account'])")

[[ -d "$SITE_REPO/backend" ]] || { echo "deploy.backend: no backend/ in $SITE_REPO"; exit 1; }

echo "deploy.backend: rsync $SITE_REPO/backend/ → $CPANEL_USER@$CPANEL_HOST:public_html/"
rsync -avz \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='*.log' \
  --exclude='uploads/approved/sponsors/*' \
  --exclude='uploads/approved/memories/*' \
  --include='uploads/approved/.htaccess' \
  --include='uploads/approved/*/.gitkeep' \
  "$SITE_REPO/backend/" "$CPANEL_USER@$CPANEL_HOST:public_html/"

REVISION=$(git -C "$SITE_REPO" rev-parse --short HEAD 2>/dev/null || echo "unknown")

# Update spec
python3 <<PY
import json, datetime
spec_path = "$SPEC"
with open(spec_path) as f: spec = json.load(f)
spec.setdefault("backend", {})["deployed_at"] = datetime.datetime.utcnow().isoformat() + "Z"
spec["backend"]["deploy_revision"] = "$REVISION"
with open(spec_path, "w") as f: json.dump(spec, f, indent=2)
PY

DAY=$(date +%Y-%m-%d)
printf '{"ts":"%s","capability":"deploy.backend","args":{"site":"%s","revision":"%s"},"result":"ok"}\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$SITE" "$REVISION" >> "$PLATFORM_ROOT/invocations/$DAY.jsonl"

echo "deploy.backend: complete. Revision $REVISION live."
echo "Next: platform smoke test $SITE"
