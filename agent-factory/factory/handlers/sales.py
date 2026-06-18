"""Sales + payment skills — stages 4-5 of the pipeline (selling -> collection).

Produces the offer/close artifact and a payment-collection plan. SAFETY: no money
movement. The PayPal flow is documented and stubbed; nothing is charged. A real
PayPal business credential (filled in .env later) would enable invoice *creation*,
never silent capture.
"""
from __future__ import annotations

from ..paths import BUSINESS_DIR, load_env
from ..router import route_and_run
from . import HandlerResult


def handle(task: dict) -> HandlerResult:
    p = task.get("payload", {})
    verified_savings = float(p.get("verified_savings_usd", 1800))
    route = route_and_run(
        "Write a tight sales close for a deal-finding service: confirm verified "
        "savings, present flat-fee vs %-of-savings, ask for the yes.",
        complexity=float(task.get("complexity", 0.45)),
        expected_output_tokens=170,
    )
    flat = 99.0
    pct_fee = round(verified_savings * 0.20, 2)
    md = f"""# Sales Close

**Routed via:** `{route.model}` (tier `{route.tier}`, mode `{route.mode}`)

## Offer
We modeled **${verified_savings:,.0f}** in verified savings on your trip. Two ways
to pay, your choice:
- **Flat finder fee:** ${flat:,.0f}
- **20% of verified savings:** ${pct_fee:,.0f}

Pick whichever is lower for you — we still win when you do.

## Close line
"Want me to send the booking-ready playbook and the invoice for the option you
picked?"
"""
    path = BUSINESS_DIR / "SALES-CLOSE.md"
    path.write_text(md)
    summary = f"Sales close drafted: flat ${flat:.0f} vs ${pct_fee:.0f} (20% of ${verified_savings:,.0f})."
    return HandlerResult(ok=True, summary=summary, detail=md, routes=[route],
                         artifact_path=str(path))


def handle_payment(task: dict) -> HandlerResult:
    """Payment collection plan — PayPal business invoice (STUBBED, no capture)."""
    env = load_env()
    have_paypal = bool(env.get("PAYPAL_CLIENT_ID") and env.get("PAYPAL_CLIENT_SECRET"))
    p = task.get("payload", {})
    amount = float(p.get("amount_usd", 99))

    route = route_and_run(
        "Summarize the steps to collect a one-time service fee via PayPal business "
        "invoice, with a confirmation step before any charge.",
        complexity=float(task.get("complexity", 0.3)),
        expected_output_tokens=120,
    )

    mode = "LIVE-CAPABLE (invoice creation only)" if have_paypal else "STUB (no credential present)"
    md = f"""# Payment Collection Plan

**Routed via:** `{route.model}` (tier `{route.tier}`)
**PayPal credential status:** {mode}
**Invoice amount:** ${amount:,.2f}

## Flow (no auto-capture, ever)
1. Create a PayPal **invoice** (not a silent charge) for the agreed amount.
2. Send invoice link from the GoDaddy-hosted business address.
3. Client pays via the link on their own action.
4. Webhook marks the pipeline ledger entry `paid`.

## Sandbox behavior
- With no `PAYPAL_CLIENT_ID`/`SECRET` in `.env`, this is fully stubbed: it records
  the *intent* to invoice ${amount:,.2f} and stops. No network call, no money.
- Even with credentials, the system only *creates/sends an invoice*. The client
  initiates payment. The factory never captures funds autonomously.
"""
    path = BUSINESS_DIR / "PAYMENT-PLAN.md"
    path.write_text(md)
    summary = (f"Payment plan for ${amount:,.2f} via PayPal invoice [{mode}]; "
               f"no auto-capture.")
    return HandlerResult(ok=True, summary=summary, detail=md, routes=[route],
                         artifact_path=str(path))
