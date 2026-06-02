#!/usr/bin/env bash
# payments/payment-link.sh — build a payment request link. No money moves here;
# this only constructs a link a buyer can use. Reads the cashtag from the vault.
#
# Usage: platform payments payment-link <amount-usd> [note]
#
# Cash App: returns https://cash.app/$<cashtag>/<amount>
# (Stripe payment links are created via the Stripe path once that rail is chosen.)

set -euo pipefail
PLATFORM_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VAULT="$PLATFORM_ROOT/vault/vault.sh"
LEDGER_DIR="$PLATFORM_ROOT/invocations"
mkdir -p "$LEDGER_DIR"

AMOUNT="${1:?Usage: payments payment-link <amount-usd> [note]}"
NOTE="${2:-}"

# Validate amount is a positive number.
if ! printf '%s' "$AMOUNT" | grep -Eq '^[0-9]+(\.[0-9]{1,2})?$'; then
  echo "payments: amount must be a positive number (got '$AMOUNT')" >&2
  exit 1
fi

CASHTAG="$("$VAULT" read payments/cashapp.cashtag 2>/dev/null || true)"
if [[ -z "$CASHTAG" ]]; then
  echo "payments: manual_required — no cashtag stored." >&2
  echo "  Run: platform/vault/vault.sh write payments/cashapp.cashtag '\$yourtag'" >&2
  exit 2
fi

# Normalize: accept stored value with or without a leading '$'.
TAG="${CASHTAG#\$}"
LINK="https://cash.app/\$${TAG}/${AMOUNT}"

# Audit trail (ledger is gitignored).
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
printf '{"at":"%s","capability":"payments.payment-link","rail":"cashapp","amount":"%s","note":"%s","status":"ok"}\n' \
  "$TS" "$AMOUNT" "$(printf '%s' "$NOTE" | tr '"' "'")" >> "$LEDGER_DIR/$(date -u +%Y-%m-%d).jsonl"

echo "$LINK"
