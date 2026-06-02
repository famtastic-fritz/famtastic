# `payments` capability

The collections primitive for Agent Business OS. Like every platform capability,
it reads credentials from the vault, writes an audit line to
`platform/invocations/`, and **surfaces `manual_required` rather than silently
degrading** when a rail can't do something autonomously.

## Surface

| Invocation | Backing | Status |
|---|---|---|
| `payments payment-link <amount> [note]` | Cash App `$cashtag` (from vault) | ✓ builds a `cash.app/$tag/<amount>` link — no money moves |
| `payments reconcile <invoice-id>` | Stripe webhook *or* Cash App | ⚠ Stripe = autonomous (webhook-owned); Cash App = `manual_required` |
| `payments invoice <deal-id>` (Stripe) | Stripe API | ✗ not built — Wave 3, gated on rail decision (Q1) |

## Credentials (vault IDs — values never in git)

- `payments/cashapp.cashtag`
- `payments/stripe.secret_key`
- `payments/stripe.webhook_secret`

Store once: `platform/vault/vault.sh write <id>`. See
`obsidian/Agent-Business-OS/Credentials.md` for the full map.

## Rail reality

- **Cash App** — shareable payment links, but **no incoming-payment API**, so
  reconciliation is manual/statement-based. Good as a human-friendly alt link;
  it caps autonomy.
- **Stripe** — programmatic invoices + hosted payment pages + webhooks → fully
  autonomous reconciliation, receipts, dunning. The recommended autonomous rail.

## Why money movement isn't wired yet

Issuing/charging and "mark paid" touch real money and real credentials. Those
are gated on three decisions (payment rail, credential storage, autonomy depth)
recorded in `obsidian/Agent-Business-OS/Rollout-Plan.md` §7. The safe pieces
(link building, honest reconcile signaling) are here now; the rest lands in
Wave 3 once those are answered.
