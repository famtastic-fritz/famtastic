#!/usr/bin/env bash
# db/apply-schema.sh — apply schema.sql via SSH (replaces phpMyAdmin paste)
# Usage: platform db apply-schema <site> <env>

set -euo pipefail
PLATFORM_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HUB_ROOT="$(cd "$PLATFORM_ROOT/.." && pwd)"
VAULT="$PLATFORM_ROOT/vault/vault.sh"

SITE="${1:?Usage: db apply-schema <site> <env>}"
ENV="${2:-production}"

SANDBOX="$HUB_ROOT/sites/site-$SITE"
SPEC="$SANDBOX/spec.json"
[[ -f "$SPEC" ]] || { echo "apply-schema: spec not found at $SPEC"; exit 1; }

# Read site repo path + cpanel host from spec
SITE_REPO=$(python3 -c "import json;print(json.load(open('$SPEC'))['site_repo']['path'])")
SCHEMA="$SITE_REPO/backend/schema.sql"
[[ -f "$SCHEMA" ]] || { echo "apply-schema: schema not found at $SCHEMA"; exit 1; }

if [[ "$ENV" == "dev" ]]; then
  DB_NAME=$(python3 -c "import json;db=json.load(open('$SPEC'))['backend']['database'];print((db.get('$ENV') or db)['name'])")
  DB_USER=$(python3 -c "import json;db=json.load(open('$SPEC'))['backend']['database'];print((db.get('$ENV') or db)['user'])")
  DB_PASSWORD=$("$VAULT" read "sites/$SITE/db_password.$ENV")
  echo "apply-schema: applying to local DB $DB_NAME"
  mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$SCHEMA"
  COUNT=$(mysql -u"$DB_USER" -p"$DB_PASSWORD" -N -e "SHOW TABLES;" "$DB_NAME" | wc -l | tr -d ' ')
else
  CPANEL_HOST=$(python3 -c "import json;print(json.load(open('$SPEC'))['backend']['cpanel_host'])")
  CPANEL_USER=$(python3 -c "import json;print(json.load(open('$SPEC'))['backend']['cpanel_account'])")
  DB_NAME=$(python3 -c "import json;db=json.load(open('$SPEC'))['backend']['database'];print((db.get('$ENV') or db)['name'])")
  DB_USER=$(python3 -c "import json;db=json.load(open('$SPEC'))['backend']['database'];print((db.get('$ENV') or db)['user'])")
  DB_PASSWORD=$("$VAULT" read "sites/$SITE/db_password.$ENV")

  REMOTE_PATH="/tmp/${SITE}-schema-$$.sql"
  echo "apply-schema: uploading schema to $CPANEL_HOST:$REMOTE_PATH"
  if scp -q "$SCHEMA" "$CPANEL_USER@$CPANEL_HOST:$REMOTE_PATH" && \
     ssh "$CPANEL_USER@$CPANEL_HOST" "mysql -u $DB_USER -p'$DB_PASSWORD' $DB_NAME < $REMOTE_PATH && rm $REMOTE_PATH"; then
    COUNT=$(ssh "$CPANEL_USER@$CPANEL_HOST" \
      "mysql -u $DB_USER -p'$DB_PASSWORD' -N -e 'SHOW TABLES;' $DB_NAME" | wc -l | tr -d ' ')
    APPLY_METHOD="ssh"
  else
    echo "apply-schema: SSH apply failed; attempting cPanel API temporary PHP runner"
    CPANEL_TOKEN=$("$VAULT" read "studio.cpanel.api_token" 2>/dev/null || true)
    RESEND_API_KEY=$("$VAULT" read "studio.resend.api_key" 2>/dev/null || true)
    [[ -n "$CPANEL_TOKEN" ]] || { echo "apply-schema: missing studio.cpanel.api_token"; exit 1; }
    [[ -n "$RESEND_API_KEY" ]] || { echo "apply-schema: missing studio.resend.api_key"; exit 1; }

    get_or_create_secret() {
      local id="$1" generator="$2" value
      value=$("$VAULT" read "$id" 2>/dev/null || true)
      if [[ -z "$value" ]]; then
        value=$(eval "$generator")
        "$VAULT" write "$id" "$value" >/dev/null
      fi
      printf '%s' "$value"
    }

    ADMIN_PASSWORD=$(get_or_create_secret "sites/$SITE/admin_password.production" "openssl rand -base64 24")
    ADMIN_CSRF_SECRET=$(get_or_create_secret "sites/$SITE/admin_csrf_secret.production" "openssl rand -hex 32")
    ADMIN_PASSWORD_HASH=$(ADMIN_PASSWORD="$ADMIN_PASSWORD" php -r 'echo password_hash(getenv("ADMIN_PASSWORD"), PASSWORD_DEFAULT);')

    cpanel_api2() {
      local module="$1" func="$2"; shift 2
      curl -k -sS -G \
        -H "Authorization: cpanel ${CPANEL_USER}:${CPANEL_TOKEN}" \
        --data-urlencode "cpanel_jsonapi_user=${CPANEL_USER}" \
        --data-urlencode "cpanel_jsonapi_apiversion=2" \
        --data-urlencode "cpanel_jsonapi_module=${module}" \
        --data-urlencode "cpanel_jsonapi_func=${func}" \
        "$@" \
        "https://${CPANEL_HOST}:2083/json-api/cpanel"
    }

    cpanel_save() {
      local dir="$1" file="$2" content_file="$3" response
      response=$(curl -k -sS -G \
        -H "Authorization: cpanel ${CPANEL_USER}:${CPANEL_TOKEN}" \
        --data-urlencode "dir=${dir}" \
        --data-urlencode "file=${file}" \
        --data-urlencode "content@${content_file}" \
        "https://${CPANEL_HOST}:2083/execute/Fileman/save_file_content")
      python3 -c 'import json, sys
raw=sys.stdin.read()
data=json.loads(raw)
result=data.get("result", data)
if result.get("status") == 1:
    sys.exit(0)
print(raw)
sys.exit(1)' <<<"$response"
    }

    cpanel_upload() {
      local dir="$1" file="$2" content_file="$3" response
      response=$(curl -k -sS \
        -H "Authorization: cpanel ${CPANEL_USER}:${CPANEL_TOKEN}" \
        -F "dir=${dir}" \
        -F "overwrite=1" \
        -F "file-1=@${content_file};filename=${file}" \
        "https://${CPANEL_HOST}:2083/execute/Fileman/upload_files")
      python3 -c 'import json, sys
raw=sys.stdin.read()
data=json.loads(raw)
result=data.get("result", data)
if result.get("status") == 1:
    sys.exit(0)
print(raw)
sys.exit(1)' <<<"$response"
    }

    cpanel_delete_public_file() {
      local file="$1"
      cpanel_api2 Fileman fileop \
        --data-urlencode "op=unlink" \
        --data-urlencode "sourcefiles=public_html/${file}" \
        --data-urlencode "doubledecode=1" >/dev/null || true
    }

    cpanel_api2 Fileman mkdir \
      --data-urlencode "path=/home/${CPANEL_USER}" \
      --data-urlencode "name=.config" \
      --data-urlencode "permissions=0700" >/dev/null || true

    CONFIG_TMP=$(mktemp)
    DB_NAME="$DB_NAME" DB_USER="$DB_USER" DB_PASSWORD="$DB_PASSWORD" RESEND_API_KEY="$RESEND_API_KEY" ADMIN_PASSWORD_HASH="$ADMIN_PASSWORD_HASH" ADMIN_CSRF_SECRET="$ADMIN_CSRF_SECRET" python3 >"$CONFIG_TMP" <<'PY'
import os

def q(value):
    return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'"

cfg = {
    "db_host": "localhost",
    "db_name": os.environ["DB_NAME"],
    "db_user": os.environ["DB_USER"],
    "db_password": os.environ["DB_PASSWORD"],
    "resend_api_key": os.environ["RESEND_API_KEY"],
    "resend_from_domain": "send.mbsh96reunion.com",
    "resend_from_noreply": "noreply@send.mbsh96reunion.com",
    "resend_from_committee": "committee@send.mbsh96reunion.com",
    "resend_from_harry": "harry@send.mbsh96reunion.com",
    "resend_reply_to": "mbsh96reunion@gmail.com",
    "committee_email": "mbsh96reunion@gmail.com",
    "admin_password_hash": os.environ["ADMIN_PASSWORD_HASH"],
    "admin_csrf_secret": os.environ["ADMIN_CSRF_SECRET"],
    "pending_uploads_path": "/home/nineoo/uploads-pending",
    "approved_uploads_path": "/home/nineoo/public_html/uploads/approved",
    "environment": "production",
}
allowed = ["https://mbsh96reunion.com", "https://www.mbsh96reunion.com", "https://mbsh-reunion-staging.netlify.app"]
patterns = ["/^https:\\/\\/[a-z0-9-]+--mbsh-reunion-staging\\.netlify\\.app$/", "/^https:\\/\\/mbsh-reunion-staging\\.netlify\\.app$/"]
print("<?php")
print("return [")
for k, v in cfg.items():
    print(f"  {q(k)} => {q(v)},")
print("  'allowed_origins' => [" + ", ".join(q(x) for x in allowed) + "],")
print("  'allowed_origin_patterns' => [" + ", ".join(q(x) for x in patterns) + "],")
print("];")
PY
    cpanel_save "/home/${CPANEL_USER}/.config" "mbsh-config.php" "$CONFIG_TMP"
    rm -f "$CONFIG_TMP"

    RUNNER="__mbsh_apply_schema_$(date +%s).php"
    RUNNER_TMP=$(mktemp)
    TOKEN=$(openssl rand -hex 24)
    SCHEMA_B64=$(base64 < "$SCHEMA" | tr -d '\n')
    cat >"$RUNNER_TMP" <<PHP
<?php
declare(strict_types=1);
header('Content-Type: application/json');
if (!hash_equals('$TOKEN', \$_GET['token'] ?? '')) {
  http_response_code(403);
  echo json_encode(['ok' => false, 'error' => 'forbidden']);
  exit;
}
\$cfg = require '/home/$CPANEL_USER/.config/mbsh-config.php';
\$mysqli = new mysqli(\$cfg['db_host'], \$cfg['db_user'], \$cfg['db_password'], \$cfg['db_name']);
if (\$mysqli->connect_errno) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => \$mysqli->connect_error]);
  exit;
}
\$mysqli->set_charset('utf8mb4');
\$sql = base64_decode('$SCHEMA_B64');
if (!\$mysqli->multi_query(\$sql)) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => \$mysqli->error]);
  exit;
}
do {
  if (\$res = \$mysqli->store_result()) { \$res->free(); }
} while (\$mysqli->more_results() && \$mysqli->next_result());
if (\$mysqli->errno) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => \$mysqli->error]);
  exit;
}
\$result = \$mysqli->query('SHOW TABLES');
echo json_encode(['ok' => true, 'tables' => \$result ? \$result->num_rows : 0]);
PHP
    cpanel_upload "public_html" "$RUNNER" "$RUNNER_TMP"
    rm -f "$RUNNER_TMP"

    APPLY_RESPONSE=$(curl -k -sS --max-time 30 "https://${CPANEL_HOST}/${RUNNER}?token=${TOKEN}")
    COUNT=$(python3 -c 'import json,sys
raw=sys.stdin.read()
try:
    data=json.loads(raw)
except Exception:
    print("apply-schema: schema runner returned non-JSON response", file=sys.stderr)
    print(raw[:1000], file=sys.stderr)
    sys.exit(1)
if data.get("ok") is not True:
    print("apply-schema: schema runner failed", file=sys.stderr)
    print(data, file=sys.stderr)
    sys.exit(1)
print(data.get("tables", 0))' <<<"$APPLY_RESPONSE")
    cpanel_delete_public_file "$RUNNER"
    APPLY_METHOD="cpanel_uapi_php_runner"
  fi
fi

echo "apply-schema: $COUNT tables present in $DB_NAME"

# Update spec
python3 <<PY
import json, datetime
spec_path = "$SPEC"
with open(spec_path) as f: spec = json.load(f)
spec.setdefault("backend", {}).setdefault("database", {}).setdefault("$ENV", {})
spec["backend"]["database"]["$ENV"]["schema_applied_at"] = datetime.datetime.utcnow().isoformat() + "Z"
spec["backend"]["database"]["$ENV"]["tables_count"] = $COUNT
with open(spec_path, "w") as f: json.dump(spec, f, indent=2)
PY

DAY=$(date +%Y-%m-%d)
printf '{"ts":"%s","capability":"db.apply-schema","args":{"site":"%s","env":"%s","tables":%d},"result":"ok"}\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$SITE" "$ENV" "$COUNT" >> "$PLATFORM_ROOT/invocations/$DAY.jsonl"
echo "apply-schema: complete via $APPLY_METHOD"
