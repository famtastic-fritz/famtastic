# PayPal Invoice Draft — task #12

> Draft invoice: FAMtastic Signature build (50% deposit)
>
> Mode: **STUB** (config.paypal_live is false) · 2026-06-18T09:29:16

## Draft summary
- **Draft id:** `DRAFT-STUB-202606180929166335`
- **Status:** DRAFT (simulated — not created in PayPal)
- **Bill to:** Sample Agency <agency@example.com>
- **Item:** FAMtastic Signature build — 50% deposit — qty 1 @ 1750.00 USD
- **Total:** 1750.00 USD
- **Endpoint:** `POST https://api-m.sandbox.paypal.com/v2/invoicing/invoices`

> Offline stub. Flip live per SETUP.md to create a real draft.

## Safety
This action creates a **draft only**. No invoice is sent, no customer is
notified, and no money moves. Sending is a manual step you take in the PayPal
dashboard after reviewing the draft. (See `paypal.py` — there is no send code.)

## Exact request body (PayPal Invoicing v2)
```json
{
  "detail": {
    "currency_code": "USD",
    "note": "Deposit to start. Remaining 50% due on approval before deploy.",
    "terms_and_conditions": "Due on receipt. Work begins once payment clears.",
    "payment_term": {
      "term_type": "DUE_ON_RECEIPT"
    }
  },
  "invoicer": {
    "name": {
      "given_name": "FAMtastic",
      "surname": "Designs"
    },
    "email_address": "you@example.com"
  },
  "primary_recipients": [
    {
      "billing_info": {
        "name": {
          "given_name": "Sample",
          "surname": "Agency"
        },
        "email_address": "agency@example.com"
      }
    }
  ],
  "items": [
    {
      "name": "FAMtastic Signature build \u2014 50% deposit",
      "quantity": "1",
      "unit_amount": {
        "currency_code": "USD",
        "value": "1750.00"
      },
      "unit_of_measure": "QUANTITY"
    }
  ]
}
```

Full machine-readable artifact: `deliverables/invoices/invoice-draft-012.json`
