#!/usr/bin/env bash
# billing/list-invoices.sh — list invoices and their state from the local ledger.
# Read-only. Never calls an external API. Optional --state filter and --json output.

set -euo pipefail

PLATFORM_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HUB_ROOT="$(cd "$PLATFORM_ROOT/.." && pwd)"
INVOCATIONS_DIR="$PLATFORM_ROOT/invocations"
LEDGER="${BILLING_LEDGER:-$PLATFORM_ROOT/billing/ledger.jsonl}"
mkdir -p "$INVOCATIONS_DIR"

FILTER_STATE=""
AS_JSON=false
for arg in "$@"; do
  case "$arg" in
    --json) AS_JSON=true ;;
    --state=*) FILTER_STATE="${arg#--state=}" ;;
    draft|sent|paid|void) FILTER_STATE="$arg" ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

command -v node >/dev/null 2>&1 || { echo "list-invoices: node is required" >&2; exit 1; }

if [[ ! -f "$LEDGER" || ! -s "$LEDGER" ]]; then
  if [[ "$AS_JSON" == true ]]; then echo "[]"; else echo "No invoices in ledger ($LEDGER)."; fi
  day="$(date +%Y-%m-%d)"
  printf '{"ts":"%s","capability":"billing.list-invoices","args":{"state":"%s"},"result":"empty","count":0}\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$FILTER_STATE" >> "$INVOCATIONS_DIR/$day.jsonl"
  exit 0
fi

COUNT="$(node - "$LEDGER" "$FILTER_STATE" "$AS_JSON" <<'NODE'
const fs = require('fs');
const [ledger, filter, asJsonArg] = process.argv.slice(2);
const asJson = asJsonArg === 'true';
const rows = fs.readFileSync(ledger, 'utf8').split('\n').filter(Boolean)
  .map(l => { try { return JSON.parse(l); } catch { return null; } })
  .filter(Boolean)
  .filter(r => !filter || r.state === filter)
  .sort((a, b) => (a.issue_date || '').localeCompare(b.issue_date || ''));

if (asJson) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  process.stderr.write('\nInvoices' + (filter ? ` (state=${filter})` : '') + '\n');
  process.stderr.write('='.repeat(32) + '\n');
  if (rows.length === 0) process.stderr.write('  (none)\n');
  for (const r of rows) {
    const total = `${r.currency || 'USD'} ${Number(r.total).toFixed(2)}`;
    const paid = r.paid_at ? ` paid:${r.paid_at.slice(0,10)}` : '';
    process.stderr.write(
      `  ${(r.invoice_number||'').padEnd(34)} ${(r.state||'').padEnd(7)} ${total.padStart(14)}  due ${r.due_date||'-'}  ${r.client||''}${paid}\n`
    );
  }
}
// emit count on stdout for the bash audit line
process.stdout.write(String(rows.length));
NODE
)"

day="$(date +%Y-%m-%d)"
printf '{"ts":"%s","capability":"billing.list-invoices","args":{"state":"%s","json":%s},"result":"listed","count":%s}\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$FILTER_STATE" "$AS_JSON" "${COUNT:-0}" >> "$INVOCATIONS_DIR/$day.jsonl"
