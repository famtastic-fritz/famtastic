#!/usr/bin/env bash
# db/apply-schema.sh — apply schema.sql via SSH (replaces phpMyAdmin paste)
# Usage: platform db apply-schema <site> <env>

set -euo pipefail
PLATFORM_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VAULT="$PLATFORM_ROOT/vault/vault.sh"

SITE="${1:?Usage: db apply-schema <site> <env>}"
ENV="${2:-production}"

SANDBOX="$HOME/famtastic/sites/site-$SITE"
SPEC="$SANDBOX/spec.json"
[[ -f "$SPEC" ]] || { echo "apply-schema: spec not found at $SPEC"; exit 1; }

# Read site repo path + cpanel host from spec
SITE_REPO=$(python3 -c "import json;print(json.load(open('$SPEC'))['site_repo']['path'])")
SCHEMA="$SITE_REPO/backend/schema.sql"
[[ -f "$SCHEMA" ]] || { echo "apply-schema: schema not found at $SCHEMA"; exit 1; }

if [[ "$ENV" == "dev" ]]; then
  DB_NAME=$(python3 -c "import json;print(json.load(open('$SPEC'))['backend']['database']['$ENV']['name'])")
  DB_USER=$(python3 -c "import json;print(json.load(open('$SPEC'))['backend']['database']['$ENV']['user'])")
  DB_PASSWORD=$("$VAULT" read "sites/$SITE/db_password.$ENV")
  echo "apply-schema: applying to local DB $DB_NAME"
  mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$SCHEMA"
  COUNT=$(mysql -u"$DB_USER" -p"$DB_PASSWORD" -N -e "SHOW TABLES;" "$DB_NAME" | wc -l | tr -d ' ')
else
  CPANEL_HOST=$(python3 -c "import json;print(json.load(open('$SPEC'))['backend']['cpanel_host'])")
  CPANEL_USER=$(python3 -c "import json;print(json.load(open('$SPEC'))['backend']['cpanel_account'])")
  DB_NAME=$(python3 -c "import json;print(json.load(open('$SPEC'))['backend']['database']['$ENV']['name'])")
  DB_USER=$(python3 -c "import json;print(json.load(open('$SPEC'))['backend']['database']['$ENV']['user'])")
  DB_PASSWORD=$("$VAULT" read "sites/$SITE/db_password.$ENV")

  REMOTE_PATH="/tmp/${SITE}-schema-$$.sql"
  echo "apply-schema: uploading schema to $CPANEL_HOST:$REMOTE_PATH"
  scp -q "$SCHEMA" "$CPANEL_USER@$CPANEL_HOST:$REMOTE_PATH"
  echo "apply-schema: applying schema on production"
  ssh "$CPANEL_USER@$CPANEL_HOST" \
    "mysql -u $DB_USER -p'$DB_PASSWORD' $DB_NAME < $REMOTE_PATH && rm $REMOTE_PATH"
  COUNT=$(ssh "$CPANEL_USER@$CPANEL_HOST" \
    "mysql -u $DB_USER -p'$DB_PASSWORD' -N -e 'SHOW TABLES;' $DB_NAME" | wc -l | tr -d ' ')
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
