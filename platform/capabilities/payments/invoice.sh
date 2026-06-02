#!/usr/bin/env bash
# payments/invoice.sh — create + send a Stripe invoice (the autonomous rail),
# with a Cash App $cashtag link in the footer as a human-friendly alternative.
# Reads the Stripe secret key (and optional cashtag) from the vault.
#
# Usage: platform payments invoice <email> <amount-usd> [description] [days-due]
#
# No key in the vault → surfaces manual_required (never silently degrades).
# This is the only script that asks for money; reconciliation is the Stripe
# webhook (agent-business-os/api/stripe-webhook), not a poll from here.

set -euo pipefail
PLATFORM_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VAULT="$PLATFORM_ROOT/vault/vault.sh"
LEDGER_DIR="$PLATFORM_ROOT/invocations"
mkdir -p "$LEDGER_DIR"
LEDGER="$LEDGER_DIR/$(date -u +%Y-%m-%d).jsonl"
API="https://api.stripe.com/v1"

EMAIL="${1:?Usage: payments invoice <email> <amount-usd> [description] [days-due]}"
AMOUNT="${2:?Usage: payments invoice <email> <amount-usd> [description] [days-due]}"
DESC="${3:-Agent Business OS}"
DUE="${4:-7}"

if ! printf '%s' "$AMOUNT" | grep -Eq '^[0-9]+(\.[0-9]{1,2})?$'; then
  echo "payments: amount must be a positive number (got '$AMOUNT')" >&2; exit 1
fi
if ! printf '%s' "$EMAIL" | grep -Eq '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'; then
  echo "payments: invalid email (got '$EMAIL')" >&2; exit 1
fi

SK="$("$VAULT" read payments/stripe.secret_key 2>/dev/null || true)"
if [[ -z "$SK" ]]; then
  printf '{"at":"%s","capability":"payments.invoice","rail":"stripe","status":"manual_required"}\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$LEDGER"
  echo "payments: manual_required — no Stripe key stored." >&2
  echo "  Run: platform/vault/vault.sh write payments/stripe.secret_key" >&2
  exit 2
fi

AMOUNT_CENTS="$(python3 -c "print(int(round(float('$AMOUNT')*100)))")"

# Optional Cash App alt link for the invoice footer.
CASHTAG="$("$VAULT" read payments/cashapp.cashtag 2>/dev/null || true)"
FOOTER="Questions? Just reply to this email."
if [[ -n "$CASHTAG" ]]; then
  FOOTER="Prefer Cash App? Pay $AMOUNT to https://cash.app/\$${CASHTAG#\$}/$AMOUNT — $FOOTER"
fi

sk_call() { curl -s -u "$SK:" "$@"; }
json_get() { python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('$1',''))"; }
is_error() { python3 -c "import json,sys;d=json.load(sys.stdin);sys.exit(0 if 'error' in d else 1)"; }

fail() { # $1 = stage, stdin = stripe response
  local body; body="$(cat)"
  local msg; msg="$(printf '%s' "$body" | python3 -c "import json,sys;print(json.load(sys.stdin).get('error',{}).get('message','unknown error'))" 2>/dev/null || echo 'unparseable response')"
  printf '{"at":"%s","capability":"payments.invoice","rail":"stripe","stage":"%s","status":"error"}\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$1" >> "$LEDGER"
  echo "payments: Stripe error at $1 — $msg" >&2
  exit 1
}

# 1) customer
CUST_RESP="$(sk_call "$API/customers" -d email="$EMAIL")"
printf '%s' "$CUST_RESP" | is_error && printf '%s' "$CUST_RESP" | fail customer
CUST_ID="$(printf '%s' "$CUST_RESP" | json_get id)"

# 2) invoice item
ITEM_RESP="$(sk_call "$API/invoiceitems" -d customer="$CUST_ID" -d amount="$AMOUNT_CENTS" -d currency=usd --data-urlencode description="$DESC")"
printf '%s' "$ITEM_RESP" | is_error && printf '%s' "$ITEM_RESP" | fail invoiceitem

# 3) invoice (send_invoice → emails a hosted pay page; fires invoice.paid webhook)
INV_RESP="$(sk_call "$API/invoices" -d customer="$CUST_ID" -d collection_method=send_invoice -d days_until_due="$DUE" -d auto_advance=true --data-urlencode footer="$FOOTER")"
printf '%s' "$INV_RESP" | is_error && printf '%s' "$INV_RESP" | fail invoice
INV_ID="$(printf '%s' "$INV_RESP" | json_get id)"

# 4) finalize + 5) send
sk_call "$API/invoices/$INV_ID/finalize" -X POST >/dev/null
SEND_RESP="$(sk_call "$API/invoices/$INV_ID/send" -X POST)"
printf '%s' "$SEND_RESP" | is_error && printf '%s' "$SEND_RESP" | fail send
URL="$(printf '%s' "$SEND_RESP" | json_get hosted_invoice_url)"

printf '{"at":"%s","capability":"payments.invoice","rail":"stripe","invoice":"%s","amount":"%s","status":"sent"}\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$INV_ID" "$AMOUNT" >> "$LEDGER"

echo "invoice $INV_ID sent to $EMAIL"
echo "$URL"
