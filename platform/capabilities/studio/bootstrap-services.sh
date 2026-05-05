#!/usr/bin/env bash
# studio/bootstrap-services.sh — Site Studio-owned service auth bootstrap.
# Checks/migrates platform-level credentials without printing secret values.

set -euo pipefail

PLATFORM_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HUB_ROOT="$(cd "$PLATFORM_ROOT/.." && pwd)"
VAULT="$PLATFORM_ROOT/vault/vault.sh"
STUDIO_ENV="$HUB_ROOT/site-studio/.env"
CPANEL_ENV="$HUB_ROOT/tools/cpanel-mcp/.env"
STUDIO_CONFIG="${HOME}/.config/famtastic/studio-config.json"
INVOCATIONS_DIR="$PLATFORM_ROOT/invocations"
mkdir -p "$INVOCATIONS_DIR"

MODE="apply"
MIGRATE_ENV=true
WRITE_CONFIG=true

for arg in "$@"; do
  case "$arg" in
    --check|--dry-run) MODE="check"; WRITE_CONFIG=false; MIGRATE_ENV=false ;;
    --no-migrate-env) MIGRATE_ENV=false ;;
    --no-write-config) WRITE_CONFIG=false ;;
    --migrate-env) MIGRATE_ENV=true ;;
    *)
      echo "Unknown option: $arg" >&2
      echo "Usage: platform studio bootstrap-services [--check] [--no-migrate-env] [--no-write-config]" >&2
      exit 1
      ;;
  esac
done

status_lines=()
manual_lines=()

emit_status() {
  status_lines+=("$1|$2|$3")
}

manual_required() {
  manual_lines+=("$1")
}

env_value() {
  local file="$1" key="$2"
  [[ -f "$file" ]] || return 1
  awk -F= -v k="$key" '$1 == k { sub(/^[^=]*=/, ""); print; exit }' "$file"
}

vault_has() {
  "$VAULT" read "$1" >/dev/null 2>&1
}

vault_write_if_present() {
  local id="$1" value="$2" source="$3"
  [[ -n "$value" ]] || return 1
  if [[ "$MODE" == "apply" && "$MIGRATE_ENV" == true ]]; then
    "$VAULT" write "$id" "$value" >/dev/null
    emit_status "$id" "stored" "migrated from $source"
  else
    emit_status "$id" "available_to_migrate" "$source"
  fi
}

check_or_migrate_secret() {
  local id="$1" file="$2" key="$3"
  if vault_has "$id"; then
    emit_status "$id" "present" "platform vault"
    return 0
  fi
  local value
  value="$(env_value "$file" "$key" 2>/dev/null || true)"
  if [[ -n "$value" ]]; then
    vault_write_if_present "$id" "$value" "$(basename "$(dirname "$file")")/$(basename "$file"):$key" || true
    return 0
  fi
  emit_status "$id" "missing" "not found in vault or local env"
  return 1
}

write_studio_config_refs() {
  [[ "$WRITE_CONFIG" == true && "$MODE" == "apply" ]] || return 0
  mkdir -p "$(dirname "$STUDIO_CONFIG")"
  node - "$STUDIO_CONFIG" <<'NODE'
const fs = require('fs');
const path = require('path');
const configPath = process.argv[2];
let config = {};
try {
  if (fs.existsSync(configPath)) config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch {}
config.service_auth = {
  owner: 'site_studio',
  secret_store: 'platform_vault',
  updated_at: new Date().toISOString(),
  resend: {
    api_key_ref: 'vault://studio.resend.api_key',
    default_sender_domain_ref: 'site.backend.email_sending_domain',
  },
  database: {
    provider: 'studio_platform',
    admin_password_ref: 'vault://studio.db.admin_password',
    site_password_ref_pattern: 'vault://sites/<tag>/db_password.<env>',
    site_ref_pattern: 'vault://sites/<tag>/db_ref.<env>',
  },
  netlify: {
    auth_token_ref: 'vault://studio.netlify.auth_token',
    site_id_ref_pattern: 'vault://sites/<tag>/netlify_site_id',
  },
  godaddy: {
    api_key_ref: 'vault://studio.godaddy.api_key',
    api_secret_ref: 'vault://studio.godaddy.api_secret',
    cpanel_api_token_ref: 'vault://studio.cpanel.api_token',
  },
  ssh: {
    identity_ref_pattern: 'vault://studio.ssh.<host>.identity_file',
  },
};
fs.mkdirSync(path.dirname(configPath), { recursive: true });
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
NODE
  emit_status "studio-config.service_auth" "written" "$STUDIO_CONFIG"
}

check_netlify() {
  if ! command -v netlify >/dev/null 2>&1; then
    emit_status "studio.netlify.cli" "missing" "install netlify-cli"
    manual_required "Install Netlify CLI or make it available on PATH."
    return
  fi
  if netlify status >/tmp/famtastic-netlify-status.$$ 2>&1; then
    emit_status "studio.netlify.login" "present" "Netlify CLI session"
  else
    emit_status "studio.netlify.login" "missing" "netlify login required"
    manual_required "Run provider-enforced Netlify login once: netlify login."
  fi
  rm -f /tmp/famtastic-netlify-status.$$
  if vault_has "studio.netlify.auth_token"; then
    emit_status "studio.netlify.auth_token" "present" "platform vault"
  else
    emit_status "studio.netlify.auth_token" "optional_missing" "CLI session can be used; token can be vaulted later"
  fi
}

check_resend() {
  check_or_migrate_secret "studio.resend.api_key" "$STUDIO_ENV" "RESEND_API_KEY" || {
    manual_required "Create or retrieve one Resend API key for Site Studio, then store it as studio.resend.api_key."
    return
  }
  if vault_has "studio.resend.api_key"; then
    local key http
    key="$("$VAULT" read studio.resend.api_key)"
    http="$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $key" https://api.resend.com/domains || echo "000")"
    if [[ "$http" == "200" ]]; then
      emit_status "studio.resend.api" "verified" "GET /domains returned 200"
    else
      emit_status "studio.resend.api" "unverified" "GET /domains returned $http"
      manual_required "Verify the Studio Resend API key or rotate studio.resend.api_key."
    fi
  fi
}

check_cpanel_and_dns() {
  check_or_migrate_secret "studio.cpanel.api_token" "$CPANEL_ENV" "CPANEL_API_TOKEN" || {
    manual_required "Create or retrieve one cPanel API token for Site Studio, then store it as studio.cpanel.api_token."
  }
  if vault_has "studio.godaddy.api_key" && vault_has "studio.godaddy.api_secret"; then
    emit_status "studio.godaddy.dns_api" "present" "platform vault"
  else
    emit_status "studio.godaddy.dns_api" "missing" "DNS API credentials not vaulted"
    manual_required "If GoDaddy API access is available, store studio.godaddy.api_key and studio.godaddy.api_secret; otherwise DNS stays manual."
  fi
}

check_database_service() {
  if vault_has "studio.db.admin_password"; then
    emit_status "studio.db.admin_password" "present" "platform vault"
  else
    emit_status "studio.db.admin_password" "missing" "not required for cPanel-token path, but needed for direct DB admin path"
  fi
  check_or_migrate_secret "sites/mbsh-reunion-v2/db_password.production" "$STUDIO_ENV" "DB_PASSWORD" || true
  if vault_has "sites/mbsh-reunion-v2/db_password.production"; then
    local db_ref='{"owner":"site_studio","provider":"godaddy_cpanel","type":"mariadb","host":"localhost","database":"nineoo_mbsh96_reunion","user":"nineoo_mbsh_user","api_origin":"https://api.mbsh96reunion.com"}'
    if vault_has "sites/mbsh-reunion-v2/db_ref.production"; then
      emit_status "sites/mbsh-reunion-v2/db_ref.production" "present" "platform vault"
    elif [[ "$MODE" == "apply" ]]; then
      "$VAULT" write "sites/mbsh-reunion-v2/db_ref.production" "$db_ref" >/dev/null
      emit_status "sites/mbsh-reunion-v2/db_ref.production" "stored" "Studio-owned site DB reference"
    else
      emit_status "sites/mbsh-reunion-v2/db_ref.production" "available_to_store" "Studio-owned site DB reference"
    fi
  else
    manual_required "Provision or vault the MBSH production DB password through Studio before live backend smoke."
  fi
}

check_ssh() {
  local host="FAMTASTICINC.COM"
  if vault_has "studio.ssh.${host}.identity_file"; then
    emit_status "studio.ssh.${host}.identity_file" "present" "platform vault"
  else
    emit_status "studio.ssh.${host}.identity_file" "missing" "optional; SSH config may still work"
  fi
  local probe
  probe="$(ssh -o BatchMode=yes -o ConnectTimeout=5 "nineoo@${host}" 'printf ok' 2>&1 || true)"
  case "$probe" in
    ok) emit_status "studio.ssh.${host}.connection" "verified" "key-based SSH works" ;;
    *"Host key verification failed"*) emit_status "studio.ssh.${host}.connection" "blocked" "host key verification failed"; manual_required "Accept/repair SSH host key for nineoo@FAMTASTICINC.COM once." ;;
    *) emit_status "studio.ssh.${host}.connection" "blocked" "SSH auth unavailable or host unreachable"; manual_required "Configure SSH access for nineoo@FAMTASTICINC.COM once." ;;
  esac
}

write_studio_config_refs
check_netlify
check_resend
check_cpanel_and_dns
check_database_service
check_ssh

printf '\nSite Studio service bootstrap (%s)\n' "$MODE"
printf '%s\n' "===================================="
for line in "${status_lines[@]}"; do
  IFS='|' read -r id state detail <<< "$line"
  printf '  %-48s %-20s %s\n' "$id" "$state" "$detail"
done

if [[ ${#manual_lines[@]} -gt 0 ]]; then
  printf '\nNecessary human/provider actions only:\n'
  printf '  - %s\n' "${manual_lines[@]}"
else
  printf '\nNo human/provider actions required by this check.\n'
fi

day="$(date +%Y-%m-%d)"
result="ok"
[[ ${#manual_lines[@]} -gt 0 ]] && result="manual_required"
printf '{"ts":"%s","capability":"studio.bootstrap-services","args":{"mode":"%s"},"result":"%s","manual_required":%d}\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$MODE" "$result" "${#manual_lines[@]}" >> "$INVOCATIONS_DIR/$day.jsonl"
