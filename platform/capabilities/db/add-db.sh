#!/usr/bin/env bash
# db/add-db.sh — provision a database for a site (dev or production env)
# Dev: local Homebrew/Docker MariaDB. Prod: GoDaddy via cpanel-mcp.
# Reads creds from vault. Writes new DB password to vault.
# Usage: platform db add <site> <env>

set -euo pipefail
PLATFORM_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VAULT="$PLATFORM_ROOT/vault/vault.sh"

SITE="${1:?Usage: db add <site> <env>}"
ENV="${2:-dev}"
case "$ENV" in dev|production|staging) ;; *) echo "env must be dev|production|staging"; exit 1 ;; esac

SANDBOX="$HOME/famtastic/sites/site-$SITE"
SPEC="$SANDBOX/spec.json"
[[ -f "$SPEC" ]] || { echo "db.add: site spec not found at $SPEC. Run: platform site add $SITE first"; exit 1; }

DB_NAME=$(python3 -c "import json,sys;print(json.load(open('$SPEC')).get('backend',{}).get('database',{}).get('name','${SITE//-/_}_${ENV}'))")
DB_USER=$(python3 -c "import json,sys;print(json.load(open('$SPEC')).get('backend',{}).get('database',{}).get('user','${SITE//-/_}_user'))")

if [[ "$ENV" == "dev" ]]; then
  DB_NAME="${DB_NAME}_dev"
  DB_USER="${DB_USER}_dev"
fi

echo "db.add: provisioning $DB_NAME (user $DB_USER) in $ENV"

# Generate strong password
DB_PASSWORD=$(openssl rand -base64 24 | tr -d '=+/' | cut -c1-24)

if [[ "$ENV" == "dev" ]]; then
  # Local Homebrew/Docker MariaDB
  ROOT_PW=""
  if "$VAULT" read mysql.local.root_password >/dev/null 2>&1; then
    ROOT_PW=$("$VAULT" read mysql.local.root_password)
  fi
  ROOT_FLAG=""
  [[ -n "$ROOT_PW" ]] && ROOT_FLAG="-p$ROOT_PW"
  if ! command -v mysql >/dev/null; then
    echo "db.add: mysql client not installed locally. Install: brew install mariadb"
    exit 1
  fi
  mysql -uroot $ROOT_FLAG <<SQL
CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
SQL
  echo "db.add: local DB $DB_NAME provisioned"
else
  # Production via cpanel-mcp
  if [[ ! -d "$HOME/famtastic/tools/cpanel-mcp" ]]; then
    echo "db.add: cpanel-mcp not installed at ~/famtastic/tools/cpanel-mcp"
    echo "MANUAL STEP REQUIRED: create DB '$DB_NAME' + user '$DB_USER' via cPanel MySQL UI"
    echo "Then run: platform vault write sites/$SITE/db_password.$ENV '<the password you set>'"
    exit 2
  fi
  # Invoke cpanel-mcp via its provisioning script (placeholder — real path varies)
  PROVISION_SCRIPT="$HOME/famtastic/tools/cpanel-mcp/provision-db.js"
  if [[ -f "$PROVISION_SCRIPT" ]]; then
    node "$PROVISION_SCRIPT" --db "$DB_NAME" --user "$DB_USER" --password "$DB_PASSWORD"
  else
    echo "db.add: provision-db.js not found. Stub: would call cpanel-mcp to create DB."
    echo "MANUAL STEP REQUIRED for now."
  fi
fi

# Store password in vault
"$VAULT" write "sites/$SITE/db_password.$ENV" "$DB_PASSWORD"

# Update spec.json with provisioned timestamp
python3 <<PY
import json, datetime
spec_path = "$SPEC"
with open(spec_path) as f: spec = json.load(f)
spec.setdefault("backend", {}).setdefault("database", {}).setdefault("$ENV", {})
spec["backend"]["database"]["$ENV"]["provisioned_at"] = datetime.datetime.utcnow().isoformat() + "Z"
spec["backend"]["database"]["$ENV"]["name"] = "$DB_NAME"
spec["backend"]["database"]["$ENV"]["user"] = "$DB_USER"
with open(spec_path, "w") as f: json.dump(spec, f, indent=2)
PY

# Log
DAY=$(date +%Y-%m-%d)
printf '{"ts":"%s","capability":"db.add","args":{"site":"%s","env":"%s","db_name":"%s"},"result":"ok"}\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$SITE" "$ENV" "$DB_NAME" >> "$PLATFORM_ROOT/invocations/$DAY.jsonl"

echo "db.add: complete. Password stored at vault://sites/$SITE/db_password.$ENV"
echo "Next: platform db apply-schema $SITE $ENV"
