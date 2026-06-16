#!/usr/bin/env bash
# payments/reconcile.sh — confirm whether an invoice has been paid.
#
# Usage: platform payments reconcile <invoice-id>
#
# Cash App has no reliable incoming-payment API, so this SURFACES manual_required
# rather than silently degrading — true to the platform's honesty rule. The
# autonomous path is Stripe webhooks (see README), which mark invoices paid the
# moment a payment clears, with no polling here.

set -euo pipefail
PLATFORM_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VAULT="$PLATFORM_ROOT/vault/vault.sh"
LEDGER_DIR="$PLATFORM_ROOT/invocations"
mkdir -p "$LEDGER_DIR"

INVOICE="${1:?Usage: payments reconcile <invoice-id>}"
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
LEDGER="$LEDGER_DIR/$(date -u +%Y-%m-%d).jsonl"

# If a Stripe key is present, the autonomous path is the webhook handler, not a
# poll from here. Flag that the webhook owns reconciliation.
if "$VAULT" read payments/stripe.secret_key >/dev/null 2>&1; then
  printf '{"at":"%s","capability":"payments.reconcile","rail":"stripe","invoice":"%s","status":"webhook_owned"}\n' \
    "$TS" "$INVOICE" >> "$LEDGER"
  echo "payments: invoice $INVOICE is reconciled by the Stripe webhook handler, not by polling."
  echo "  Ensure the webhook is configured (payments/stripe.webhook_secret) and pointed at the handler."
  exit 0
fi

# Cash App fallback: cannot auto-confirm.
printf '{"at":"%s","capability":"payments.reconcile","rail":"cashapp","invoice":"%s","status":"manual_required"}\n' \
  "$TS" "$INVOICE" >> "$LEDGER"
cat >&2 <<EOF
payments: manual_required — Cash App provides no API to confirm payment receipt.
  Confirm payment for invoice $INVOICE manually (or via statement), then have the
  billing-agent mark it paid. For autonomous reconciliation, choose the Stripe
  rail (see platform/capabilities/payments/README.md).
EOF
exit 2
