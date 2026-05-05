#!/usr/bin/env bash
# deploy/deploy-backend.sh — rsync backend/ to GoDaddy public_html/
# Usage: platform deploy backend <site>

set -euo pipefail
PLATFORM_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HUB_ROOT="$(cd "$PLATFORM_ROOT/.." && pwd)"
VAULT="$PLATFORM_ROOT/vault/vault.sh"

SITE="${1:?Usage: deploy backend <site>}"
SPEC="$HUB_ROOT/sites/site-$SITE/spec.json"
[[ -f "$SPEC" ]] || { echo "deploy.backend: spec not found at $SPEC"; exit 1; }

SITE_REPO=$(python3 -c "import json;print(json.load(open('$SPEC'))['site_repo']['path'])")
CPANEL_HOST=$(python3 -c "import json;print(json.load(open('$SPEC'))['backend']['cpanel_host'])")
CPANEL_USER=$(python3 -c "import json;print(json.load(open('$SPEC'))['backend']['cpanel_account'])")

[[ -d "$SITE_REPO/backend" ]] || { echo "deploy.backend: no backend/ in $SITE_REPO"; exit 1; }

echo "deploy.backend: rsync $SITE_REPO/backend/ → $CPANEL_USER@$CPANEL_HOST:public_html/"
RSYNC_LOG=$(mktemp)
if rsync -avz \
    --exclude='.env' \
    --exclude='.env.*' \
    --exclude='*.log' \
    --exclude='uploads/approved/sponsors/*' \
    --exclude='uploads/approved/memories/*' \
    --include='uploads/approved/.htaccess' \
    --include='uploads/approved/*/.gitkeep' \
    "$SITE_REPO/backend/" "$CPANEL_USER@$CPANEL_HOST:public_html/" >"$RSYNC_LOG" 2>&1; then
  cat "$RSYNC_LOG"
  DEPLOY_METHOD="rsync"
else
  cat "$RSYNC_LOG"
  echo "deploy.backend: rsync failed; attempting cPanel UAPI file upload fallback"

  CPANEL_TOKEN=$("$VAULT" read "studio.cpanel.api_token" 2>/dev/null || true)
  if [[ -z "$CPANEL_TOKEN" ]]; then
    echo "deploy.backend: missing studio.cpanel.api_token for cPanel upload fallback"
    exit 1
  fi

  cpanel_api2() {
    local func="$1"; shift
    curl -k -sS -G \
      -H "Authorization: cpanel ${CPANEL_USER}:${CPANEL_TOKEN}" \
      --data-urlencode "cpanel_jsonapi_user=${CPANEL_USER}" \
      --data-urlencode "cpanel_jsonapi_apiversion=2" \
      --data-urlencode "cpanel_jsonapi_module=Fileman" \
      --data-urlencode "cpanel_jsonapi_func=${func}" \
      "$@" \
      "https://${CPANEL_HOST}:2083/json-api/cpanel"
  }

  cpanel_mkdir() {
    local path="$1" name="$2"
    local response
    response=$(cpanel_api2 mkdir \
      --data-urlencode "path=${path}" \
      --data-urlencode "name=${name}" \
      --data-urlencode "permissions=0755")
    python3 -c 'import json, sys
target = sys.argv[1]
raw = sys.stdin.read()
data = json.loads(raw)
event = data.get("cpanelresult", {}).get("event", {})
error = data.get("cpanelresult", {}).get("error")
if event.get("result") == 1 or (error and "already exists" in error.lower()):
    print(f"deploy.backend: ensured directory {target}")
    sys.exit(0)
print(raw)
sys.exit(1)' "$path/$name" <<<"$response"
  }

  cpanel_upload() {
    local local_file="$1" remote_dir="$2" filename="$3"
    local response
    response=$(curl -k -sS \
      -H "Authorization: cpanel ${CPANEL_USER}:${CPANEL_TOKEN}" \
      -F "dir=${remote_dir}" \
      -F "overwrite=1" \
      -F "file-1=@${local_file};filename=${filename}" \
      "https://${CPANEL_HOST}:2083/execute/Fileman/upload_files")
    python3 -c 'import json, sys
target = sys.argv[1]
raw = sys.stdin.read()
data = json.loads(raw)
result = data.get("result", data)
if result.get("status") == 1:
    print(f"deploy.backend: uploaded {target}")
    sys.exit(0)
print(raw)
sys.exit(1)' "$remote_dir/$filename" <<<"$response"
  }

  (cd "$SITE_REPO/backend" && find . -type d | sed 's#^\./##' | grep -v '^\.$' | sort) | while IFS= read -r dir; do
    parent="public_html"
    IFS='/' read -r -a parts <<<"$dir"
    current=""
    for part in "${parts[@]}"; do
      [[ -z "$part" ]] && continue
      if [[ -z "$current" ]]; then
        cpanel_mkdir "$parent" "$part" || true
        current="$part"
      else
        cpanel_mkdir "$parent/$current" "$part" || true
        current="$current/$part"
      fi
    done
  done

  while IFS= read -r file; do
    rel="${file#"$SITE_REPO/backend/"}"
    case "$rel" in
      .env|.env.*|*.log|uploads/approved/sponsors/*|uploads/approved/memories/*) continue ;;
    esac
    remote_dir="public_html"
    if [[ "$rel" == */* ]]; then
      remote_dir="public_html/${rel%/*}"
    fi
    cpanel_upload "$file" "$remote_dir" "$(basename "$rel")"
  done < <(find "$SITE_REPO/backend" -type f | sort)
  DEPLOY_METHOD="cpanel_uapi"
fi
rm -f "$RSYNC_LOG"

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

echo "deploy.backend: complete via $DEPLOY_METHOD. Revision $REVISION live."
echo "Next: platform smoke test $SITE"
