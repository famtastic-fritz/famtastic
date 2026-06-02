# Billing capability

Lets Shay generate and manage invoices for FAMtastic engagements (e.g. the
$397/mo home-services site care plans, one-time builds, fractional-officer
retainers) without touching a payment provider. Follows the platform
capability pattern: scripts at `platform/capabilities/billing/<verb>.sh`,
audit trail appended to `platform/invocations/<date>.jsonl`, `manual_required`
surfaced explicitly, never silently degrades.

## Invocation surface (proposed)

```
fam-hub platform billing generate-invoice <engagement.json> [--check]
fam-hub platform billing list-invoices [--state=draft|sent|paid|void] [--json]
fam-hub platform billing mark-paid <invoice-number> [--method=<m>] [--reference=<r>] [--date=<YYYY-MM-DD>] [--check]
```

Direct script form (used until `fam-hub platform billing` routing is wired):

```
platform/capabilities/billing/generate-invoice.sh examples/sample-engagement.json --check
platform/capabilities/billing/generate-invoice.sh examples/sample-engagement.json
platform/capabilities/billing/list-invoices.sh
platform/capabilities/billing/mark-paid.sh FAM-202606-tonys-barber-shop-care-plan-june-2026
```

## Inputs and outputs

- **Input contract:** `invoice-spec.schema.json` (client, line items, rates,
  one_time vs recurring, currency, discount, tax, due terms). See
  `examples/sample-engagement.json` for a realistic $397/mo deal.
- **Outputs (under `platform/billing/`, override with env vars below):**
  - `invoices/<invoice-number>.json` — structured invoice record
  - `invoices/<invoice-number>.md` — human-readable invoice (markdown)
  - `ledger.jsonl` — one line per invoice with current state
    (`draft` / `sent` / `paid` / `void`)
- **Invoice number:** `FAM-<YYYYMM>-<engagement_id|client-slug>[-<period>]`
  unless an explicit `invoice_number` is supplied.

Environment overrides (handy for tests / dry runs):
`BILLING_OUT_DIR` and `BILLING_LEDGER`.

## What works today

- Full invoice **generation**: line totals (`qty * unit_price`), subtotal,
  flat or percent discount, tax on the discounted base, grand total, issue
  date, and due date (`issue_date + net_days`, or explicit `terms.due_date`).
- Writes JSON + markdown and upserts the ledger (full rewrite, one record per
  invoice number — same ledger discipline as the worker queue cleanup).
- `--check` mode on `generate-invoice` and `mark-paid` validates inputs and
  prints the computed result with **no side effects**.
- `list-invoices` reads the ledger, supports a `--state` filter and `--json`.
- `mark-paid` transitions `draft|sent -> paid`, stamps method/reference/date,
  and keeps the invoice JSON's state in sync. Refuses double-paid.
- Every run appends an audit line to `platform/invocations/<date>.jsonl`.
- No script calls any external API.

## What is `manual_required` / stubbed

- **Payment provider is OPEN** — PayPal vs Stripe vs GoDaddy is unresolved per
  the SHAY master plan, and SOUL.md requires asking how Fritz gets paid before
  finalizing. No provider is wired. Hence `generate-invoice` status is
  `v1-no-send`.
- **Sending** the invoice (email/portal) is not implemented.
- **PDF rendering** is stubbed — only markdown + JSON are produced.
- **Payable links / charging** require the chosen provider's vaulted creds.
- **`mark-paid` is a manual assertion** — there is no provider reconciliation;
  it records a human-confirmed payment, so `v1-manual-confirm`.

## Vault keys + decision still needed

- **Decision (blocking real send/charge):** pick the payment provider.
- **Vault keys (not yet defined — to be added once provider is chosen):**
  - PayPal: `billing.paypal.client_id`, `billing.paypal.secret`
  - Stripe: `billing.stripe.secret_key`
  - GoDaddy Payments: `billing.godaddy.api_key` (and any required secret)
  - Sending domain reuse: the existing `studio.resend.api_key` could deliver
    invoice emails once a send path is built.

None of these are read today — the `reads_from_vault` arrays for the billing
capabilities are intentionally empty until a provider is selected.
