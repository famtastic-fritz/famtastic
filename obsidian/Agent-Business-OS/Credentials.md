# Agent Business OS — Credential Reference (pointers, not secrets)

> ⚠️ **This file is git-tracked. Never paste a real key, token, password, or
> Cash App login here.** It lists *where* the money/credentials live and what
> each is for. Values live only in the Keychain-backed vault
> (`platform/vault/vault.sh`), which agents read on demand.

## How to store a secret (one time)

```bash
# from ~/famtastic
platform/vault/vault.sh write payments/cashapp.cashtag '$yourcashtag'
platform/vault/vault.sh write payments/stripe.secret_key      # prompts silently
platform/vault/vault.sh write payments/stripe.webhook_secret  # prompts silently
platform/vault/vault.sh list                                   # IDs only, no values
```

## The money secret IDs

| Secret ID | Purpose | Used by |
|---|---|---|
| `payments/cashapp.cashtag` | Your `$cashtag`, used to build `cash.app/$tag/<amount>` payment links | `payments payment-link`, `billing-agent` |
| `payments/stripe.secret_key` | Stripe API key — programmatic invoices + payment pages | `payments` (Stripe path), `billing-agent` |
| `payments/stripe.webhook_secret` | Verifies Stripe webhook signatures for autonomous reconciliation | Stripe webhook handler |

## Related, already-established service refs (for context)

| Secret ID | Purpose |
|---|---|
| `studio.resend.api_key` / `resend.api_key` | Email send (invoices, follow-ups) via Resend |
| `cpanel.api_token` | Hosting / deploy |

## Local (agent-side) vs deployed (Azure) — same secret, two homes

- **Agent-side capability scripts** (`platform/capabilities/payments/*`) read from
  the **Keychain vault** by these IDs. This is where the `billing-agent` runs.
- **Deployed Azure functions** (`/api/lead`, `/api/stripe-webhook`) can't reach
  the Keychain — they read **Azure app settings (env vars)**. At deploy time, copy
  each vault value into the matching app setting:

  | Vault ID | Azure app setting |
  |---|---|
  | `payments/stripe.secret_key` | `STRIPE_SECRET_KEY` (if a function needs it) |
  | `payments/stripe.webhook_secret` | `STRIPE_WEBHOOK_SECRET` |
  | — | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `LEADS_TABLE_CONNECTION_STRING` |

  The vault stays the single source of truth; app settings are deploy-time copies.

## The rule

- **Secrets:** Keychain vault only. Agents `vault read <id>`; Fritz `vault write` once.
- **This brain:** holds the *map* (which IDs exist, what they do, how collections
  uses them) — never the values.
- That is how "my Cash App info is in the collective brain" is honored safely:
  the brain knows the money plumbing; the keys stay in the keychain.
