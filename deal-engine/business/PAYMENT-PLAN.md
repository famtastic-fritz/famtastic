# Payment Collection Plan

**Routed via:** `llama3.1:8b` (tier `local-triage`)
**PayPal credential status:** STUB (no credential present)
**Invoice amount:** $99.00

## Flow (no auto-capture, ever)
1. Create a PayPal **invoice** (not a silent charge) for the agreed amount.
2. Send invoice link from the GoDaddy-hosted business address.
3. Client pays via the link on their own action.
4. Webhook marks the pipeline ledger entry `paid`.

## Sandbox behavior
- With no `PAYPAL_CLIENT_ID`/`SECRET` in `.env`, this is fully stubbed: it records
  the *intent* to invoice $99.00 and stops. No network call, no money.
- Even with credentials, the system only *creates/sends an invoice*. The client
  initiates payment. The engine never captures funds autonomously.
