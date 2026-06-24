# PayPal Invoice Draft — task #11

> Draft invoice: Checkout Rescue Diagnostic
>
> Mode: **STUB** (config.paypal_live is false) · 2026-06-18T14:38:35

## Draft summary
- **Draft id:** `DRAFT-STUB-202606181438353288`
- **Status:** DRAFT (simulated — not created in PayPal)
- **Bill to:** Sample Merchant <merchant@example.com>
- **Item:** Checkout Rescue Diagnostic — 48h — qty 1 @ 500.00 USD
- **Total:** 500.00 USD
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
    "note": "48-hour checkout/funnel diagnostic. Credited toward the fix if you hire within 7 days.",
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
          "surname": "Merchant"
        },
        "email_address": "merchant@example.com"
      }
    }
  ],
  "items": [
    {
      "name": "Checkout Rescue Diagnostic \u2014 48h",
      "quantity": "1",
      "unit_amount": {
        "currency_code": "USD",
        "value": "500.00"
      },
      "unit_of_measure": "QUANTITY"
    }
  ]
}
```

Full machine-readable artifact: `deliverables/invoices/invoice-draft-011.json`
