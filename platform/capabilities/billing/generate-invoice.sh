#!/usr/bin/env bash
# billing/generate-invoice.sh — generate a structured invoice from an engagement spec.
# Generation (line totals, discount, tax, due date, invoice number, markdown + JSON)
# works end to end and writes files. Sending, PDF rendering, and online payment are
# manual_required until a payment provider is chosen (PayPal vs Stripe vs GoDaddy).
# This script NEVER calls an external API.

set -euo pipefail

PLATFORM_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HUB_ROOT="$(cd "$PLATFORM_ROOT/.." && pwd)"
SCHEMA="$PLATFORM_ROOT/capabilities/billing/invoice-spec.schema.json"
INVOCATIONS_DIR="$PLATFORM_ROOT/invocations"
OUT_DIR="${BILLING_OUT_DIR:-$PLATFORM_ROOT/billing/invoices}"
LEDGER="${BILLING_LEDGER:-$PLATFORM_ROOT/billing/ledger.jsonl}"
mkdir -p "$INVOCATIONS_DIR"

SPEC_FILE="${1:-}"
[[ -n "$SPEC_FILE" ]] || { echo "Usage: platform billing generate-invoice <engagement.json> [--check]" >&2; exit 1; }
shift || true

MODE="emit"
for arg in "$@"; do
  case "$arg" in
    --check|--dry-run) MODE="check" ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

[[ -f "$SPEC_FILE" ]] || { echo "generate-invoice: spec not found: $SPEC_FILE" >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo "generate-invoice: node is required" >&2; exit 1; }

# Compute the invoice. In --check mode the node helper validates inputs and prints the
# computed summary WITHOUT writing any files. In emit mode it writes the JSON + markdown
# and returns the invoice number / paths on stdout as a single JSON line.
RESULT="$(OWNER_PROFILE="$PLATFORM_ROOT/config/owner-profile.json" node - "$SPEC_FILE" "$OUT_DIR" "$MODE" <<'NODE'
const fs = require('fs');
const path = require('path');

const [specFile, outDir, mode] = process.argv.slice(2);
const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));

function fail(msg) { console.error('generate-invoice: ' + msg); process.exit(3); }

// --- validate the essentials (schema-aligned, not a full validator) ---
if (!spec.client || !spec.client.name) fail('client.name is required');
if (!Array.isArray(spec.line_items) || spec.line_items.length === 0) fail('line_items must have at least one entry');
spec.line_items.forEach((li, i) => {
  if (!li.description) fail(`line_items[${i}].description is required`);
  if (typeof li.unit_price !== 'number' || li.unit_price < 0) fail(`line_items[${i}].unit_price must be a non-negative number`);
});

const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
const currency = spec.currency || 'USD';
const today = new Date();
const isoDate = d => d.toISOString().slice(0, 10);
const issueDate = spec.issue_date || isoDate(today);

// --- line items + subtotal ---
const lines = spec.line_items.map(li => {
  const quantity = typeof li.quantity === 'number' ? li.quantity : 1;
  const amount = round2(quantity * li.unit_price);
  return { description: li.description, quantity, unit: li.unit || 'each', unit_price: round2(li.unit_price), amount };
});
const subtotal = round2(lines.reduce((s, l) => s + l.amount, 0));

// --- discount ---
let discountAmount = 0, discountLabel = null;
if (spec.discount && typeof spec.discount.value === 'number') {
  discountLabel = spec.discount.label || 'Discount';
  discountAmount = spec.discount.type === 'percent'
    ? round2(subtotal * (spec.discount.value / 100))
    : round2(spec.discount.value);
}
const taxable = round2(subtotal - discountAmount);

// --- tax ---
const taxRate = spec.tax && typeof spec.tax.rate_percent === 'number' ? spec.tax.rate_percent : 0;
const taxLabel = (spec.tax && spec.tax.label) || 'Tax';
const taxAmount = round2(taxable * (taxRate / 100));
const total = round2(taxable + taxAmount);

// --- due date ---
const terms = spec.terms || {};
let dueDate = terms.due_date;
if (!dueDate) {
  const netDays = typeof terms.net_days === 'number' ? terms.net_days : 14;
  const d = new Date(issueDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + netDays);
  dueDate = isoDate(d);
}

// --- invoice number ---
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const ym = issueDate.slice(0, 7).replace('-', '');
const base = spec.engagement_id || slug(spec.client.name);
let invoiceNumber = spec.invoice_number;
if (!invoiceNumber) {
  invoiceNumber = `FAM-${ym}-${base}`;
  if (spec.engagement_type === 'recurring' && spec.billing_period && spec.billing_period.label) {
    invoiceNumber += '-' + slug(spec.billing_period.label);
  }
}

const vendor = Object.assign({ name: 'FAMtastic' }, spec.vendor || {});
const fmt = n => `${currency} ${n.toFixed(2)}`;

// --- structured payment block (Cash App / generic link / manual) ---
// Backward compatible: when spec.payment is absent, `payment` stays null and
// rendering falls back to the legacy payment_instructions free text.
let payment = null;
if (spec.payment && typeof spec.payment === 'object') {
  const method = spec.payment.method || 'manual';
  if (!['cashapp', 'link', 'manual'].includes(method)) fail(`payment.method must be one of cashapp|link|manual`);
  payment = { method, instructions: spec.payment.instructions || null };
  if (method === 'cashapp') {
    // Cashtag resolution: spec wins, else fall back to the canonical owner
    // profile (platform/config/owner-profile.json). A cashtag is public
    // receive-info, so the default lives in git, not the vault.
    let cashtag = spec.payment.cashtag;
    if (!cashtag && process.env.OWNER_PROFILE) {
      try {
        const op = JSON.parse(fs.readFileSync(process.env.OWNER_PROFILE, 'utf8'));
        cashtag = op && op.payment && op.payment.cashapp && op.payment.cashapp.cashtag;
      } catch (_) { /* no profile; fall through to the validation error below */ }
    }
    if (!cashtag || !/^\$[A-Za-z][A-Za-z0-9_]{0,19}$/.test(cashtag)) {
      fail("payment.cashtag is required for method=cashapp (or set payment.cashapp.cashtag in config/owner-profile.json) and must look like '$Name'");
    }
    // Amount-prefilled tappable link; cashtag keeps its leading '$'.
    // e.g. https://cash.app/$Fritz/397.00
    const amountStr = total.toFixed(2);
    payment.cashtag = cashtag;
    payment.pay_url = `https://cash.app/${cashtag}/${amountStr}`;
    payment.profile_url = `https://cash.app/${cashtag}`;
    payment.pay_line = `Pay ${fmt(total)} via Cash App to ${cashtag}`;
  } else if (method === 'link') {
    const link = spec.payment.link;
    if (!link || !/^https?:\/\//.test(link)) fail('payment.link (http/https URL) is required for method=link');
    payment.link = link;
    payment.pay_line = `Pay ${fmt(total)} online`;
  }
}

const invoice = {
  invoice_number: invoiceNumber,
  engagement_id: spec.engagement_id || null,
  engagement_type: spec.engagement_type || 'one_time',
  site_tag: spec.site_tag || null,
  currency,
  issue_date: issueDate,
  due_date: dueDate,
  billing_period: spec.billing_period || null,
  vendor,
  client: spec.client,
  line_items: lines,
  subtotal,
  discount: discountLabel ? { label: discountLabel, amount: discountAmount } : null,
  tax: { label: taxLabel, rate_percent: taxRate, amount: taxAmount },
  total,
  terms: { net_days: terms.net_days != null ? terms.net_days : 14, notes: terms.notes || null },
  payment_instructions: spec.payment_instructions || null,
  payment,
  state: 'draft',
  generated_at: new Date().toISOString(),
  generated_by: 'billing.generate-invoice'
};

// --- markdown rendering ---
const md = [];
md.push(`# Invoice ${invoice.invoice_number}`);
md.push('');
md.push(`**From:** ${vendor.name}${vendor.email ? ` · ${vendor.email}` : ''}${vendor.website ? ` · ${vendor.website}` : ''}`);
md.push('');
md.push(`**Bill to:** ${invoice.client.name}`);
if (invoice.client.contact) md.push(`Attn: ${invoice.client.contact}`);
if (invoice.client.email) md.push(invoice.client.email);
if (invoice.client.address) md.push(invoice.client.address);
md.push('');
md.push(`**Issue date:** ${invoice.issue_date}  `);
md.push(`**Due date:** ${invoice.due_date}  `);
if (invoice.engagement_type === 'recurring' && invoice.billing_period) {
  md.push(`**Billing period:** ${invoice.billing_period.label || (invoice.billing_period.start + ' → ' + invoice.billing_period.end)}  `);
}
md.push('');
md.push('| Description | Qty | Unit | Unit price | Amount |');
md.push('| --- | ---: | --- | ---: | ---: |');
lines.forEach(l => {
  md.push(`| ${l.description} | ${l.quantity} | ${l.unit} | ${fmt(l.unit_price)} | ${fmt(l.amount)} |`);
});
md.push('');
md.push(`**Subtotal:** ${fmt(subtotal)}  `);
if (invoice.discount) md.push(`**${invoice.discount.label}:** -${fmt(invoice.discount.amount)}  `);
if (taxRate > 0) md.push(`**${taxLabel} (${taxRate}%):** ${fmt(taxAmount)}  `);
md.push(`**Total due:** ${fmt(total)}`);
md.push('');
if (invoice.terms.notes) { md.push(`_Terms: ${invoice.terms.notes}_`); md.push(''); }

// --- Pay this invoice (structured payment block) ---
if (payment && payment.method === 'cashapp') {
  md.push('## Pay this invoice');
  md.push('');
  md.push(payment.pay_line);
  md.push('');
  md.push(`[Pay with Cash App](${payment.pay_url})`);
  md.push('');
  md.push(`If the button above does not prefill the amount, send ${fmt(total)} to ${payment.profile_url}`);
  md.push('');
} else if (payment && payment.method === 'link') {
  md.push('## Pay this invoice');
  md.push('');
  md.push(payment.pay_line);
  md.push('');
  md.push(`[Pay now](${payment.link})`);
  md.push('');
} else if (invoice.payment_instructions) {
  // Legacy / manual: free-text remit instructions (unchanged behavior).
  md.push(`**Payment:** ${invoice.payment_instructions}`);
  md.push('');
}
// Optional extra free-text instructions attached to the structured block.
if (payment && payment.instructions) { md.push(`_${payment.instructions}_`); md.push(''); }
md.push('---');
md.push('_Generated by FAMtastic billing.generate-invoice. Delivery and online payment are not yet automated._');
const markdown = md.join('\n') + '\n';

let jsonPath = null, mdPath = null;
if (mode === 'emit') {
  fs.mkdirSync(outDir, { recursive: true });
  jsonPath = path.join(outDir, invoice.invoice_number + '.json');
  mdPath = path.join(outDir, invoice.invoice_number + '.md');
  fs.writeFileSync(jsonPath, JSON.stringify(invoice, null, 2) + '\n');
  fs.writeFileSync(mdPath, markdown);
}

console.log(JSON.stringify({
  invoice_number: invoice.invoice_number,
  client: invoice.client.name,
  currency,
  subtotal, discount: discountAmount, tax: taxAmount, total,
  issue_date: issueDate, due_date: dueDate,
  state: invoice.state,
  json_path: jsonPath,
  md_path: mdPath
}));
NODE
)" || { echo "generate-invoice: computation failed" >&2; exit 3; }

# Pull computed fields back into bash for reporting + ledger.
get() { node -e 'const r=JSON.parse(process.argv[1]);const v=r[process.argv[2]];process.stdout.write(v==null?"":String(v))' "$RESULT" "$1"; }
INVOICE_NUMBER="$(get invoice_number)"
CLIENT="$(get client)"
CURRENCY="$(get currency)"
TOTAL="$(get total)"
ISSUE_DATE="$(get issue_date)"
DUE_DATE="$(get due_date)"
JSON_PATH="$(get json_path)"
MD_PATH="$(get md_path)"

printf '\nInvoice %s\n' "$INVOICE_NUMBER"
printf '%s\n' "================================"
printf '  %-14s %s\n' "client" "$CLIENT"
printf '  %-14s %s %s\n' "total due" "$CURRENCY" "$TOTAL"
printf '  %-14s %s\n' "issue date" "$ISSUE_DATE"
printf '  %-14s %s\n' "due date" "$DUE_DATE"
printf '  %-14s %s\n' "state" "draft"

if [[ "$MODE" == "check" ]]; then
  printf '\n[check] inputs valid, totals compute. No files written, ledger untouched.\n'
else
  # Upsert into the local ledger (full rewrite to keep one record per invoice number).
  mkdir -p "$(dirname "$LEDGER")"
  touch "$LEDGER"
  node - "$LEDGER" "$INVOICE_NUMBER" "$CLIENT" "$CURRENCY" "$TOTAL" "$ISSUE_DATE" "$DUE_DATE" "$JSON_PATH" <<'NODE'
const fs = require('fs');
const [ledger, num, client, currency, total, issue, due, jsonPath] = process.argv.slice(2);
const lines = fs.readFileSync(ledger, 'utf8').split('\n').filter(Boolean);
const kept = lines.filter(l => { try { return JSON.parse(l).invoice_number !== num; } catch { return false; } });
kept.push(JSON.stringify({
  invoice_number: num, client, currency, total: Number(total),
  issue_date: issue, due_date: due, state: 'draft',
  json_path: jsonPath, updated_at: new Date().toISOString()
}));
fs.writeFileSync(ledger, kept.join('\n') + '\n');
NODE
  printf '\nWritten:\n  %s\n  %s\n' "$JSON_PATH" "$MD_PATH"
  printf 'Ledger:\n  %s (state=draft)\n' "$LEDGER"
fi

printf '\nmanual_required (not automated):\n'
printf '  - %s\n' \
  "Choose a payment provider (PayPal vs Stripe vs GoDaddy) before any send/charge — OPEN per SHAY-MASTER-PLAN income strategy" \
  "Render a PDF from the markdown (stubbed; no renderer wired)" \
  "Deliver the invoice to the client (email/portal send is not implemented)" \
  "Generate a payable link / collect payment (requires the chosen provider's vaulted credentials)"

day="$(date +%Y-%m-%d)"
printf '{"ts":"%s","capability":"billing.generate-invoice","args":{"spec":"%s","mode":"%s"},"result":"%s","invoice_number":"%s","total":%s,"manual_required":4}\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$SPEC_FILE" "$MODE" "$([[ "$MODE" == "check" ]] && echo checked || echo generated)" "$INVOICE_NUMBER" "$TOTAL" \
  >> "$INVOCATIONS_DIR/$day.jsonl"
