#!/usr/bin/env bash
# reach/send.sh — channel-agnostic outbound reach for Shay.
# Invocation: platform reach send "<message>" [--title=] [--urgency=] [--channels=a,b]
#
# This shim resolves the platform roots + vault (the same pattern as the other
# capabilities), hydrates any available reach secrets from the vault into the
# environment, then hands off to lib/reach-fabric/cli.js. Missing secrets are
# NOT an error: the fabric degrades channel-by-channel and always lands on the
# console fallback. The fabric itself writes the invocations audit line.

set -euo pipefail

PLATFORM_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HUB_ROOT="$(cd "$PLATFORM_ROOT/.." && pwd)"
VAULT="$PLATFORM_ROOT/vault/vault.sh"
INVOCATIONS_DIR="$PLATFORM_ROOT/invocations"
FABRIC="$HUB_ROOT/lib/reach-fabric/cli.js"
mkdir -p "$INVOCATIONS_DIR"

[[ -f "$FABRIC" ]] || { echo "reach send: fabric not found: $FABRIC" >&2; exit 1; }

MESSAGE="${1:-}"
[[ -n "$MESSAGE" ]] || { echo 'Usage: platform reach send "<message>" [--title=] [--urgency=] [--channels=a,b]' >&2; exit 1; }
shift || true

# vault_export <secret-id> <ENV_VAR> — set ENV_VAR from vault if the env var is
# not already set and the secret exists. Never fails the script when absent.
vault_export() {
  local id="$1" var="$2" val
  if [[ -n "${!var:-}" ]]; then return 0; fi
  if val="$("$VAULT" read "$id" 2>/dev/null)"; then
    export "$var"="$val"
  fi
}

# Map vaulted reach secrets -> the env-var contract documented in config.js.
# All optional. Whatever is present lights up its channel; the rest stay
# manual_required and the fabric reports that honestly.
vault_export "reach/resend.api_key"        RESEND_API_KEY
vault_export "reach/email.to"              REACH_EMAIL_TO
vault_export "reach/email.from"            REACH_EMAIL_FROM
vault_export "reach/telegram.bot_token"    TELEGRAM_BOT_TOKEN
vault_export "reach/telegram.chat_id"      TELEGRAM_CHAT_ID
vault_export "reach/twilio.account_sid"    TWILIO_ACCOUNT_SID
vault_export "reach/twilio.auth_token"     TWILIO_AUTH_TOKEN
vault_export "reach/twilio.from_number"    TWILIO_FROM_NUMBER
vault_export "reach/twilio.to"             REACH_SMS_TO
vault_export "reach/vapid.public_key"      VAPID_PUBLIC_KEY
vault_export "reach/vapid.private_key"     VAPID_PRIVATE_KEY
vault_export "reach/vapid.subject"         VAPID_SUBJECT
vault_export "reach/push.subscription"     REACH_PUSH_SUBSCRIPTION

# Fall back to the Studio-owned Resend key if no reach-specific key is vaulted,
# so email reach reuses the already-configured sender with zero extra setup.
if [[ -z "${RESEND_API_KEY:-}" ]]; then
  vault_export "studio.resend.api_key"     RESEND_API_KEY
fi

node "$FABRIC" "$MESSAGE" "$@"
