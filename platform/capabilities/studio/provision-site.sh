#!/usr/bin/env bash
# studio/provision-site.sh — check a generated site against Studio-owned services.
# This command treats the site as a consumer of Site Studio/platform capability.

set -euo pipefail

PLATFORM_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HUB_ROOT="$(cd "$PLATFORM_ROOT/.." && pwd)"
VAULT="$PLATFORM_ROOT/vault/vault.sh"
INVOCATIONS_DIR="$PLATFORM_ROOT/invocations"
mkdir -p "$INVOCATIONS_DIR" "$HUB_ROOT/proofs"

SITE="${1:-}"
[[ -n "$SITE" ]] || { echo "Usage: platform studio provision-site <site> [--check] [--emit-proof]" >&2; exit 1; }
shift || true

MODE="check"
EMIT_PROOF=false
for arg in "$@"; do
  case "$arg" in
    --check|--dry-run) MODE="check" ;;
    --emit-proof|--proof) EMIT_PROOF=true ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

normalized="${SITE#site-}"
hub_tag="site-$normalized"
if [[ "$normalized" == "mbsh-reunion-v2" ]]; then
  hub_tag="site-mbsh-reunion"
fi

SPEC="$HUB_ROOT/sites/$hub_tag/spec.json"
DEPLOY_REPO="$HOME/famtastic-sites/$normalized"
if [[ ! -d "$DEPLOY_REPO" && "$hub_tag" == "site-mbsh-reunion" && -d "$HOME/famtastic-sites/mbsh-reunion-v2" ]]; then
  DEPLOY_REPO="$HOME/famtastic-sites/mbsh-reunion-v2"
fi

[[ -f "$SPEC" ]] || { echo "provision-site: spec not found: $SPEC" >&2; exit 1; }
[[ -d "$DEPLOY_REPO" ]] || { echo "provision-site: deploy repo not found: $DEPLOY_REPO" >&2; exit 1; }

checks=()
manual=()
blocked=0

add_check() {
  checks+=("$1|$2|$3")
  if [[ "$2" == "blocked" || "$2" == "missing" ]]; then
    blocked=$((blocked + 1))
  fi
}

manual_required() {
  manual+=("$1")
}

vault_has() {
  "$VAULT" read "$1" >/dev/null 2>&1
}

json_value() {
  local file="$1" expr="$2"
  node - "$file" "$expr" <<'NODE'
const fs = require('fs');
const file = process.argv[2];
const expr = process.argv[3].split('.');
let value = JSON.parse(fs.readFileSync(file, 'utf8'));
for (const part of expr) value = value && value[part];
if (value === undefined || value === null) process.exit(1);
if (typeof value === 'object') console.log(JSON.stringify(value));
else console.log(String(value));
NODE
}

site_config="$DEPLOY_REPO/config/site-config.json"
schema="$DEPLOY_REPO/backend/schema.sql"
backend_config="$DEPLOY_REPO/backend/lib/config.php"
netlify_toml="$DEPLOY_REPO/netlify.toml"

api_base="$(json_value "$site_config" "API_BASE_URL" 2>/dev/null || true)"
custom_domain="$(json_value "$SPEC" "environments.production.custom_domain" 2>/dev/null || echo "mbsh96reunion.com")"
api_origin="$(json_value "$SPEC" "backend.subdomain" 2>/dev/null || echo "api.$custom_domain")"
email_domain="$(json_value "$SPEC" "backend.email_sending_domain" 2>/dev/null || echo "send.$custom_domain")"
db_name="$(json_value "$SPEC" "backend.database.name" 2>/dev/null || true)"
db_user="$(json_value "$SPEC" "backend.database.user" 2>/dev/null || true)"

if vault_has "studio.resend.api_key"; then
  add_check "studio.resend.api_key" "present" "Studio owns the Resend provider credential"
else
  add_check "studio.resend.api_key" "missing" "Run platform studio bootstrap-services"
  manual_required "Store or migrate the Studio Resend API key."
fi

if vault_has "sites/$normalized/db_password.production" || vault_has "sites/$hub_tag/db_password.production"; then
  add_check "site.db_password.production" "present" "Site DB credential is vaulted under Studio ownership"
else
  add_check "site.db_password.production" "missing" "No site DB password ref found in vault"
  manual_required "Provision or vault the site DB password through Studio."
fi

if vault_has "sites/$normalized/db_ref.production" || vault_has "sites/$hub_tag/db_ref.production"; then
  add_check "site.db_ref.production" "present" "Studio-owned DB reference is vaulted"
elif [[ -n "$db_name" && -n "$db_user" ]]; then
  add_check "site.db_ref.production" "ready_from_spec" "$db_name / $db_user"
else
  add_check "site.db_ref.production" "blocked" "Spec lacks DB name/user"
fi

if [[ -f "$schema" ]]; then
  add_check "site.schema" "ready" "$schema"
else
  add_check "site.schema" "blocked" "backend/schema.sql missing"
fi

if [[ -f "$backend_config" ]] && grep -q "fam_load_config" "$backend_config"; then
  add_check "site.backend_config_loader" "ready" "backend reads generated secrets/config"
else
  add_check "site.backend_config_loader" "blocked" "backend/lib/config.php missing or incompatible"
fi

if [[ "$api_base" == "https://$api_origin" ]]; then
  add_check "site.API_BASE_URL" "ready" "$api_base"
else
  add_check "site.API_BASE_URL" "blocked" "current value is ${api_base:-null}; expected https://$api_origin"
  manual_required "Let Studio generate or update config/site-config.json with the production API origin after backend provisioning."
fi

if [[ -f "$netlify_toml" ]] && grep -q "https://$api_origin" "$netlify_toml"; then
  add_check "site.netlify_csp" "ready" "CSP allows https://$api_origin"
else
  add_check "site.netlify_csp" "blocked" "netlify.toml does not allow https://$api_origin"
fi

if vault_has "studio.netlify.auth_token"; then
  add_check "studio.netlify.auth_token" "present" "Studio can use token-based Netlify automation"
else
  if command -v netlify >/dev/null 2>&1 && netlify status >/tmp/famtastic-netlify-provision.$$ 2>&1; then
    add_check "studio.netlify.session" "present" "Netlify CLI session exists"
  else
    add_check "studio.netlify.session" "missing" "No vaulted token or CLI session"
    manual_required "Complete provider-enforced Netlify login once."
  fi
  rm -f /tmp/famtastic-netlify-provision.$$
fi

if vault_has "studio.cpanel.api_token"; then
  add_check "studio.cpanel.api_token" "present" "Studio can use cPanel MCP/API token"
else
  add_check "studio.cpanel.api_token" "missing" "Run platform studio bootstrap-services"
  manual_required "Store or migrate the Studio cPanel API token."
fi

if vault_has "studio.cpanel.api_token"; then
  add_check "studio.dns_control" "primary" "Use cPanel UAPI/MCP for DNS/hosting operations; GoDaddy API is optional fallback"
elif vault_has "studio.godaddy.api_key" && vault_has "studio.godaddy.api_secret"; then
  add_check "studio.dns_control" "fallback" "Direct GoDaddy DNS API refs are vaulted"
else
  add_check "studio.dns_control" "missing" "No cPanel token or direct DNS fallback refs found"
fi

if [[ -n "$email_domain" ]]; then
  add_check "site.email_sending_domain" "ready" "$email_domain consumes Studio Resend"
else
  add_check "site.email_sending_domain" "blocked" "Spec lacks backend.email_sending_domain"
fi

raw_required="no"
if [[ -f "$DEPLOY_REPO/.env.example" ]] && grep -Eq '^RESEND_API_KEY=re_[A-Za-z0-9_=-]{20,}|^DB_PASSWORD=[^[:space:]#]{12,}' "$DEPLOY_REPO/.env.example"; then
  raw_required="maybe"
fi
if [[ -f "$site_config" ]] && grep -Eq '"(RESEND_API_KEY|DB_PASSWORD|NETLIFY_AUTH_TOKEN)"[[:space:]]*:[[:space:]]*"[^"]{12,}"' "$site_config"; then
  raw_required="maybe"
fi
add_check "site.raw_provider_secrets_required" "$([[ "$raw_required" == "no" ]] && echo ready || echo blocked)" "deploy repo source does not require committed provider secrets"

printf '\nStudio provision-site check: %s\n' "$SITE"
printf '%s\n' "================================"
for line in "${checks[@]}"; do
  IFS='|' read -r id state detail <<< "$line"
  printf '  %-42s %-12s %s\n' "$id" "$state" "$detail"
done

if [[ ${#manual[@]} -gt 0 ]]; then
  printf '\nNecessary human/provider actions only:\n'
  printf '  - %s\n' "${manual[@]}"
fi

status="passed_with_blockers"
[[ "$blocked" -eq 0 ]] && status="passed"

proof_path=""
if [[ "$EMIT_PROOF" == true ]]; then
  proof_path="$HUB_ROOT/proofs/studio-service-auth-${normalized}-$(date +%Y-%m-%d).json"
  node - "$proof_path" "$SITE" "$hub_tag" "$DEPLOY_REPO" "$status" "$blocked" "$custom_domain" "$api_origin" "$email_domain" "${checks[@]}" <<'NODE'
const fs = require('fs');
const [proofPath, site, hubTag, deployRepo, status, blocked, domain, apiOrigin, emailDomain, ...rows] = process.argv.slice(2);
const checks = rows.map(row => {
  const [id, state, detail] = row.split('|');
  return { id, state, detail };
});
const proof = {
  generated_at: new Date().toISOString(),
  site,
  hub_tag: hubTag,
  deploy_repo: deployRepo,
  verdict: status,
  blocked_checks: Number(blocked),
  service_owner: 'site_studio',
  site_role: 'generated_product_consumer',
  production_domain: domain,
  api_origin: `https://${apiOrigin}`,
  email_sending_domain: emailDomain,
  checks,
};
fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2));
NODE
  printf '\nProof written: %s\n' "$proof_path"
fi

day="$(date +%Y-%m-%d)"
printf '{"ts":"%s","capability":"studio.provision-site","args":{"site":"%s","mode":"%s","proof":"%s"},"result":"%s","blocked_checks":%d}\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$SITE" "$MODE" "$proof_path" "$status" "$blocked" >> "$INVOCATIONS_DIR/$day.jsonl"

[[ "$blocked" -eq 0 ]] || exit 2
