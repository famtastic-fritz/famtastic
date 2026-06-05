#!/usr/bin/env bash
# billing/mark-paid.sh — record a payment against an invoice in the local ledger.
# This records a manually-confirmed payment. It does NOT verify the payment with any
# provider and never calls an external API. State transitions: draft|sent -> paid.

set -euo pipefail

PLATFORM_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HUB_ROOT="$(cd "$PLATFORM_ROOT/.." && pwd)"
INVOCATIONS_DIR="$PLATFORM_ROOT/invocations"
LEDGER="${BILLING_LEDGER:-$PLATFORM_ROOT/billing/ledger.jsonl}"
OUT_DIR="${BILLING_OUT_DIR:-$PLATFORM_ROOT/billing/invoices}"
mkdir -p "$INVOCATIONS_DIR"

INVOICE_NUMBER="${1:-}"
[[ -n "$INVOICE_NUMBER" ]] || { echo "Usage: platform billing mark-paid <invoice-number> [--method=<m>] [--reference=<r>] [--date=<YYYY-MM-DD>] [--check]" >&2; exit 1; }
shift || true

MODE="apply"
METHOD="manual"
REFERENCE=""
PAID_DATE="$(date -u +%Y-%m-%d)"
for arg in "$@"; do
  case "$arg" in
    --check|--dry-run) MODE="check" ;;
    --method=*) METHOD="${arg#--method=}" ;;
    --reference=*) REFERENCE="${arg#--reference=}" ;;
    --date=*) PAID_DATE="${arg#--date=}" ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

command -v node >/dev/null 2>&1 || { echo "mark-paid: node is required" >&2; exit 1; }
[[ -f "$LEDGER" && -s "$LEDGER" ]] || { echo "mark-paid: no ledger at $LEDGER — generate an invoice first" >&2; exit 1; }

RESULT="$(node - "$LEDGER" "$OUT_DIR" "$INVOICE_NUMBER" "$METHOD" "$REFERENCE" "$PAID_DATE" "$MODE" <<'NODE'
const fs = require('fs');
const path = require('path');
const [ledger, outDir, num, method, reference, paidDate, mode] = process.argv.slice(2);

const lines = fs.readFileSync(ledger, 'utf8').split('\n').filter(Boolean)
  .map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
const rec = lines.find(r => r.invoice_number === num);
if (!rec) { console.error('mark-paid: invoice not found in ledger: ' + num); process.exit(2); }
if (rec.state === 'paid') { console.error('mark-paid: invoice already marked paid: ' + num); process.exit(2); }

const updated = Object.assign({}, rec, {
  state: 'paid', paid_at: paidDate, paid_method: method,
  paid_reference: reference || null, updated_at: new Date().toISOString()
});

if (mode === 'apply') {
  const out = lines.map(r => r.invoice_number === num ? updated : r);
  fs.writeFileSync(ledger, out.map(r => JSON.stringify(r)).join('\n') + '\n');
  // Best-effort: keep the invoice JSON's state in sync if it exists.
  if (rec.json_path) {
    try {
      const inv = JSON.parse(fs.readFileSync(rec.json_path, 'utf8'));
      inv.state = 'paid'; inv.paid_at = paidDate; inv.paid_method = method; inv.paid_reference = reference || null;
      fs.writeFileSync(rec.json_path, JSON.stringify(inv, null, 2) + '\n');
    } catch (e) { /* invoice file optional */ }
  }
}
console.log(JSON.stringify({
  invoice_number: num, prev_state: rec.state, new_state: 'paid',
  client: rec.client, currency: rec.currency, total: rec.total,
  paid_at: paidDate, method, reference: reference || null
}));
NODE
)" || { echo "mark-paid: failed" >&2; exit 2; }

get() { node -e 'const r=JSON.parse(process.argv[1]);const v=r[process.argv[2]];process.stdout.write(v==null?"":String(v))' "$RESULT" "$1"; }
PREV="$(get prev_state)"
CLIENT="$(get client)"
CURRENCY="$(get currency)"
TOTAL="$(get total)"

printf '\nmark-paid %s\n' "$INVOICE_NUMBER"
printf '%s\n' "================================"
printf '  %-14s %s -> paid\n' "state" "$PREV"
printf '  %-14s %s\n' "client" "$CLIENT"
printf '  %-14s %s %s\n' "total" "$CURRENCY" "$TOTAL"
printf '  %-14s %s\n' "paid date" "$PAID_DATE"
printf '  %-14s %s\n' "method" "$METHOD"
[[ -n "$REFERENCE" ]] && printf '  %-14s %s\n' "reference" "$REFERENCE"

if [[ "$MODE" == "check" ]]; then
  printf '\n[check] transition is valid. Ledger NOT modified.\n'
else
  printf '\nLedger updated: %s\n' "$LEDGER"
fi

printf '\nmanual_required (not automated):\n'
printf '  - %s\n' \
  "Payment is recorded as manually confirmed — no provider reconciliation. Verify funds landed before relying on 'paid'." \
  "Automatic paid-state detection requires the chosen payment provider's webhook/credentials (PayPal vs Stripe vs GoDaddy — OPEN)"

day="$(date +%Y-%m-%d)"
printf '{"ts":"%s","capability":"billing.mark-paid","args":{"invoice_number":"%s","method":"%s","mode":"%s"},"result":"%s","manual_required":2}\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$INVOICE_NUMBER" "$METHOD" "$MODE" "$([[ "$MODE" == "check" ]] && echo checked || echo marked_paid)" \
  >> "$INVOCATIONS_DIR/$day.jsonl"
