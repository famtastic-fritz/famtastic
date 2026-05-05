#!/usr/bin/env bash
# studio/configure-resend.sh - configure Site Studio notification email via Resend.

set -euo pipefail

PLATFORM_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HUB_ROOT="$(cd "$PLATFORM_ROOT/.." && pwd)"
VAULT="$PLATFORM_ROOT/vault/vault.sh"
STUDIO_CONFIG="${HOME}/.config/famtastic/studio-config.json"

MODE="apply"
REQUESTED_DOMAIN=""
FROM_LOCAL="studio"
FROM_NAME="FAMtastic Site Studio"
REPLY_TO=""
TEST_RECIPIENT=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --check|--dry-run) MODE="check"; shift ;;
    --domain) REQUESTED_DOMAIN="${2:-}"; shift 2 ;;
    --from-local) FROM_LOCAL="${2:-studio}"; shift 2 ;;
    --from-name) FROM_NAME="${2:-FAMtastic Site Studio}"; shift 2 ;;
    --reply-to) REPLY_TO="${2:-}"; shift 2 ;;
    --test-recipient) TEST_RECIPIENT="${2:-}"; shift 2 ;;
    *)
      echo "Unknown option: $1" >&2
      echo "Usage: platform studio configure-resend [--check] [--domain <verified-domain>] [--from-local studio] [--from-name name] [--reply-to email]" >&2
      exit 1
      ;;
  esac
done

if ! "$VAULT" read studio.resend.api_key >/dev/null 2>&1; then
  echo "studio.resend.api_key missing. Run: fam-hub platform bootstrap-services" >&2
  exit 1
fi

key="$("$VAULT" read studio.resend.api_key)"
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
http="$(curl -s -o "$tmp" -w "%{http_code}" -H "Authorization: Bearer $key" https://api.resend.com/domains || echo "000")"
if [[ "$http" != "200" ]]; then
  echo "Resend domain lookup failed with HTTP $http" >&2
  exit 1
fi

node - "$STUDIO_CONFIG" "$tmp" "$MODE" "$REQUESTED_DOMAIN" "$FROM_LOCAL" "$FROM_NAME" "$REPLY_TO" "$TEST_RECIPIENT" <<'NODE'
const fs = require('fs');
const path = require('path');

const [configPath, domainsPath, mode, requestedDomain, fromLocal, fromName, replyToArg, testRecipientArg] = process.argv.slice(2);
let config = {};
try {
  if (fs.existsSync(configPath)) config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch {}
const domains = JSON.parse(fs.readFileSync(domainsPath, 'utf8'));
const verified = (domains.data || []).filter((d) => d.status === 'verified' && d.capabilities?.sending !== 'disabled');
let selected = null;
if (requestedDomain) selected = verified.find((d) => d.name === requestedDomain);
if (!selected) selected = verified.find((d) => d.name === 'send.famtastic.com');
if (!selected) selected = verified.find((d) => d.name.endsWith('.famtastic.com'));
if (!selected) selected = verified[0];
if (!selected) {
  console.error('No verified Resend sending domain found.');
  process.exit(1);
}
const replyTo = replyToArg || config.email?.user || '';
const testRecipient = testRecipientArg || config.email?.user || '';
const fromEmail = `${fromLocal || 'studio'}@${selected.name}`;
const emailConfig = {
  provider: 'resend',
  owner: 'site_studio',
  enabled: true,
  api_key_ref: 'vault://studio.resend.api_key',
  from_name: fromName || 'FAMtastic Site Studio',
  from_email: fromEmail,
  reply_to: replyTo,
  test_recipient: testRecipient,
  verified_domain: selected.name,
  verified_domain_status: selected.status,
  configured_at: new Date().toISOString(),
  note: selected.name.endsWith('.famtastic.com')
    ? 'Studio sender uses a FAMtastic-owned verified domain.'
    : 'Temporary Studio sender until a FAMtastic-owned Resend sending domain is verified.',
};
if (mode === 'apply') {
  config.notifications = config.notifications || {};
  config.notifications.email = emailConfig;
  config.service_auth = config.service_auth || {};
  config.service_auth.resend = config.service_auth.resend || {};
  config.service_auth.resend.api_key_ref = 'vault://studio.resend.api_key';
  config.service_auth.resend.studio_sender = {
    from_name: emailConfig.from_name,
    from_email: emailConfig.from_email,
    reply_to: emailConfig.reply_to,
    domain_ref: 'config.notifications.email.verified_domain',
  };
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}
console.log(`mode=${mode}`);
console.log('studio.resend.api_key=present');
console.log(`studio.email.provider=resend`);
console.log(`studio.email.from=${emailConfig.from_name} <${emailConfig.from_email}>`);
console.log(`studio.email.reply_to=${emailConfig.reply_to || '(none)'}`);
console.log(`studio.email.verified_domain=${emailConfig.verified_domain}`);
console.log(`studio.email.domain_note=${emailConfig.note}`);
NODE
