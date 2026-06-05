#!/usr/bin/env bash
# vault/register-credential.sh — register a service credential into the vault by
# friendly service name, then print next-step verification guidance for the
# capability/channel that secret unlocks.
#
# This is the safe, repeatable front door to `vault.sh write`. It:
#   - maps a friendly service name -> the canonical vault key (allowlist below),
#     so callers never have to remember slash-path key names,
#   - reads the secret from an env var or stdin (NEVER a CLI argument), so the
#     secret never lands in shell history, `ps` output, or the audit line,
#   - NEVER prints, echoes, or logs the secret value,
#   - appends a value-free audit line to platform/invocations/<date>.jsonl,
#   - prints the exact verification command for the dependent capability and
#     reports live vs manual_required honestly.
#
# Usage:
#   platform vault register-credential <service> [--key <override-vault-key>]
#
# The secret is supplied one of two ways (checked in this order):
#   1. CRED_VALUE env var   — CRED_VALUE='<paste>' platform vault register-credential resend
#   2. stdin (piped/typed)  — printf '%s' '<paste>' | platform vault register-credential resend
#                             (interactive: it prompts and reads silently from the TTY)
#
# NEVER pass the secret as a positional argument. Shell history + the process
# table would capture it. This script intentionally has no value argument.

set -euo pipefail

PLATFORM_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HUB_ROOT="$(cd "$PLATFORM_ROOT/.." && pwd)"
VAULT="$PLATFORM_ROOT/vault/vault.sh"
INVOCATIONS_DIR="$PLATFORM_ROOT/invocations"
mkdir -p "$INVOCATIONS_DIR"

[[ -x "$VAULT" || -f "$VAULT" ]] || { echo "register-credential: vault not found: $VAULT" >&2; exit 1; }

# ---------------------------------------------------------------------------
# Allowlist: friendly service name -> canonical vault key.
# Keep canonical keys aligned with what the consuming capability actually reads.
# Reach email reuses studio.resend.api_key (see capabilities/reach/send.sh
# fallback), so `resend` maps there; `reach-resend` targets the reach-specific
# override key for callers who want a dedicated reach sender.
# ---------------------------------------------------------------------------
canonical_key_for() {
  case "$1" in
    resend)            echo "studio.resend.api_key" ;;
    reach-resend)      echo "reach/resend.api_key" ;;
    reach-email-to)    echo "reach/email.to" ;;
    reach-email-from)  echo "reach/email.from" ;;
    godaddy)           echo "studio.godaddy.api_key" ;;
    godaddy-secret)    echo "studio.godaddy.api_secret" ;;
    netlify)           echo "netlify.auth_token" ;;
    telegram)          echo "reach/telegram.bot_token" ;;
    telegram-chat)     echo "reach/telegram.chat_id" ;;
    twilio-sid)        echo "reach/twilio.account_sid" ;;
    twilio-token)      echo "reach/twilio.auth_token" ;;
    twilio-from)       echo "reach/twilio.from_number" ;;
    twilio-to)         echo "reach/twilio.to" ;;
    jira)              echo "jira.api_token" ;;
    github)            echo "github.token" ;;
    cpanel)            echo "cpanel.api_token" ;;
    *)                 return 1 ;;
  esac
}

# Verification guidance per service. Echoes the exact command Fritz runs next
# and whether the channel goes live immediately or needs manual provisioning.
verification_for() {
  case "$1" in
    resend|reach-resend|reach-email-to|reach-email-from)
      cat <<'EOF'

  Channel:  Reach Fabric EMAIL (via Resend) — goes LIVE once the key is vaulted.
  Verify:
    node lib/reach-fabric/selftest.js                 # proves the fabric + audit trail
    RESEND_API_KEY="$(platform vault read studio.resend.api_key)" \
      REACH_EMAIL_TO="you@example.com" \
      platform reach send "Reach Fabric live — test" --urgency=high
  Expect: delivered_via=email (or telegram if higher-priority + vaulted), real inbox ping.
  Status: LIVE after vaulting (network + Keychain required — run on your Mac).
EOF
      ;;
    telegram|telegram-chat)
      cat <<'EOF'

  Channel:  Reach Fabric TELEGRAM — goes LIVE once bot_token AND chat_id are vaulted.
  Verify:
    platform vault register-credential telegram-chat   # vault the chat id too
    platform reach send "Telegram reach live" --urgency=normal
  Expect: delivered_via=telegram, a real Telegram message.
  Status: LIVE after both telegram keys are vaulted.
EOF
      ;;
    twilio-sid|twilio-token|twilio-from|twilio-to)
      cat <<'EOF'

  Channel:  Reach Fabric SMS (via Twilio) — manual_required until a number is provisioned.
  Verify:  vault all four (twilio-sid, twilio-token, twilio-from, twilio-to), then:
    platform reach send "SMS reach test" --urgency=high
  Status:  manual_required until the Twilio number is purchased + verified.
EOF
      ;;
    godaddy|godaddy-secret)
      cat <<'EOF'

  Capability: DNS automation (dns.register-subdomain) + Resend domain verify.
  Verify:
    platform dns register-subdomain <site> send CNAME <target>
  Status: LIVE for DNS API once both godaddy + godaddy-secret are vaulted.
EOF
      ;;
    netlify)
      cat <<'EOF'

  Capability: Netlify deploy hooks (deploy.connect-netlify).
  Verify:  platform deploy connect-netlify <site>
  Status:  partial — git linking still requires the Netlify UI (vendor-fact).
EOF
      ;;
    *)
      cat <<EOF

  Capability: registered. No automated verification wired for "$1" yet.
  Status: manual_required — confirm the dependent tool reads this key.
EOF
      ;;
  esac
}

SERVICE="${1:?Usage: register-credential <service> [--key <vault-key>]}"
shift || true

KEY_OVERRIDE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --key) KEY_OVERRIDE="${2:?--key requires a value}"; shift 2 ;;
    *) echo "register-credential: unknown option: $1" >&2; exit 1 ;;
  esac
done

if [[ -n "$KEY_OVERRIDE" ]]; then
  VAULT_KEY="$KEY_OVERRIDE"
else
  VAULT_KEY="$(canonical_key_for "$SERVICE")" || {
    echo "register-credential: unknown service '$SERVICE'." >&2
    echo "Known services: resend reach-resend reach-email-to reach-email-from godaddy godaddy-secret netlify telegram telegram-chat twilio-sid twilio-token twilio-from twilio-to jira github cpanel" >&2
    echo "Or pass an explicit key with: --key <vault-key>" >&2
    exit 1
  }
fi

echo "register-credential: service '$SERVICE' -> vault key '$VAULT_KEY'"

# --- acquire the secret WITHOUT touching argv ---
SECRET=""
if [[ -n "${CRED_VALUE:-}" ]]; then
  SECRET="$CRED_VALUE"
elif [[ ! -t 0 ]]; then
  # stdin is piped: read it whole (handles trailing newline strip)
  SECRET="$(cat)"
  SECRET="${SECRET%$'\n'}"
else
  # interactive TTY: read silently, no echo
  read -rsp "Paste secret for $VAULT_KEY (input hidden): " SECRET; echo
fi

[[ -n "$SECRET" ]] || { echo "register-credential: empty secret — nothing written." >&2; exit 1; }

# Write via vault.sh, passing the value on the vault.sh argv inside THIS process
# only (never this script's own argv). Suppress any value echo.
"$VAULT" write "$VAULT_KEY" "$SECRET" >/dev/null
unset SECRET CRED_VALUE

echo "register-credential: stored $VAULT_KEY (value not shown)"

# --- audit line: value-free ---
DAY="$(date +%Y-%m-%d)"
printf '{"ts":"%s","capability":"vault.register-credential","args":{"service":"%s","vault_key":"%s"},"result":"stored"}\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$SERVICE" "$VAULT_KEY" >> "$INVOCATIONS_DIR/$DAY.jsonl"

# --- next-step verification guidance ---
echo "Next step — verify the dependent capability/channel:"
verification_for "$SERVICE"
