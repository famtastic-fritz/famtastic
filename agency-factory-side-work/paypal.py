"""PayPal Invoicing v2 — DRAFT-ONLY integration.

Hard safety contract (enforced by what this module does and does NOT contain):
  * It can create a DRAFT invoice (`POST /v2/invoicing/invoices`). A draft is an
    unsent document. PayPal does not notify or charge anyone for a draft.
  * It NEVER sends an invoice. There is deliberately NO call to
    `/v2/invoicing/invoices/{id}/send`, NO capture, NO payout, NO refund, NO
    subscription charge — those functions do not exist in this file on purpose.
  * No money moves. The most this can ever do is leave a draft sitting in your
    PayPal account, waiting for YOU to review and send it manually.

Offline by default: with no credentials / live flag, every call is STUBBED and
returns the exact request body that *would* be sent, plus a simulated draft id,
so the whole factory still runs end-to-end with zero network and zero spend.
"""
from __future__ import annotations

import base64
import datetime as _dt
import json
import urllib.error
import urllib.parse
import urllib.request

from config_io import load_config
from factory_paths import load_env

# Endpoints. Defaults to SANDBOX for safety; switch via PAYPAL_ENV=live in .env.
_BASES = {
    "sandbox": "https://api-m.sandbox.paypal.com",
    "live": "https://api-m.paypal.com",
}

# This module exposes draft creation ONLY. Sending/charging is intentionally
# absent. If you ever need to send, do it by hand in the PayPal dashboard.
__all__ = ["build_invoice_payload", "create_draft_from_payload", "is_live"]


def _env():
    return load_env()


def is_live() -> tuple[bool, str]:
    """Return (live?, reason). Live requires creds + both opt-in flags."""
    env = _env()
    cfg = load_config()
    if not cfg.get("paypal_live"):
        return False, "config.paypal_live is false"
    if env.get("FACTORY_LIVE_PAYPAL", "false").lower() != "true":
        return False, "FACTORY_LIVE_PAYPAL is not true"
    if not (env.get("PAYPAL_CLIENT_ID") and env.get("PAYPAL_CLIENT_SECRET")):
        return False, "PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET missing"
    return True, "credentials + flags present"


def _base_url() -> str:
    return _BASES.get(_env().get("PAYPAL_ENV", "sandbox").lower(), _BASES["sandbox"])


def _split_name(full: str) -> tuple[str, str]:
    parts = (full or "").strip().split()
    if not parts:
        return "Valued", "Customer"
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])


def build_invoice_payload(payload: dict) -> dict:
    """Build a PayPal Invoicing v2 invoice body (the thing that becomes a draft).

    payload keys (all optional; sensible defaults applied):
      recipient_name, recipient_email, item_name, quantity, unit_amount,
      currency, note, terms, due ("DUE_ON_RECEIPT" | "NET_30" | ...)
    """
    env = _env()
    currency = payload.get("currency", "USD")
    qty = str(payload.get("quantity", 1))
    unit = f"{float(payload.get('unit_amount', 0)):.2f}"

    inv_given, inv_sur = _split_name(env.get("PAYPAL_INVOICER_NAME", "FAMtastic Designs"))
    rcp_given, rcp_sur = _split_name(payload.get("recipient_name", "Valued Customer"))

    return {
        "detail": {
            "currency_code": currency,
            "note": payload.get("note", "Thank you for your business."),
            "terms_and_conditions": payload.get(
                "terms", "Due on receipt. Work begins once payment clears."
            ),
            "payment_term": {"term_type": payload.get("due", "DUE_ON_RECEIPT")},
        },
        "invoicer": {
            "name": {"given_name": inv_given, "surname": inv_sur},
            "email_address": env.get("PAYPAL_BUSINESS_EMAIL", "you@example.com"),
        },
        "primary_recipients": [
            {
                "billing_info": {
                    "name": {"given_name": rcp_given, "surname": rcp_sur},
                    "email_address": payload.get("recipient_email", "client@example.com"),
                }
            }
        ],
        "items": [
            {
                "name": payload.get("item_name", "FAMtastic service"),
                "quantity": qty,
                "unit_amount": {"currency_code": currency, "value": unit},
                "unit_of_measure": "QUANTITY",
            }
        ],
    }


def _get_access_token() -> str:
    """OAuth2 client_credentials. Only ever called in live mode."""
    env = _env()
    creds = f"{env['PAYPAL_CLIENT_ID']}:{env['PAYPAL_CLIENT_SECRET']}".encode()
    req = urllib.request.Request(
        f"{_base_url()}/v1/oauth2/token",
        data=urllib.parse.urlencode({"grant_type": "client_credentials"}).encode(),
        headers={
            "Authorization": "Basic " + base64.b64encode(creds).decode(),
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:  # noqa: S310 - fixed host
        return json.loads(resp.read())["access_token"]


def create_draft_from_payload(payload: dict) -> dict:
    """Create a DRAFT invoice. Returns a uniform result dict either way.

    STUB mode (default): no network; returns the request body + a simulated id.
    LIVE mode: POSTs to create the draft. It is created with status DRAFT and is
    NOT sent — no notification, no charge. We never call the send endpoint.
    """
    invoice = build_invoice_payload(payload)
    live, reason = is_live()
    ts = _dt.datetime.now().isoformat(timespec="seconds")

    if not live:
        amount = invoice["items"][0]["unit_amount"]
        sim_id = "DRAFT-STUB-" + _dt.datetime.now().strftime("%Y%m%d%H%M%S%f")[:18]
        return {
            "mode": "STUB",
            "reason": reason,
            "created_at": ts,
            "draft_id": sim_id,
            "status": "DRAFT (simulated — not created in PayPal)",
            "endpoint": f"{_base_url()}/v2/invoicing/invoices",
            "request_body": invoice,
            "amount": f"{amount['value']} {amount['currency_code']}",
            "note": "Offline stub. Flip live per SETUP.md to create a real draft.",
        }

    # ---- LIVE: create a DRAFT only. No send. No charge. ----
    token = _get_access_token()
    req = urllib.request.Request(
        f"{_base_url()}/v2/invoicing/invoices",
        data=json.dumps(invoice).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",  # create => status DRAFT; we never POST .../send
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:  # noqa: S310
            body = json.loads(resp.read() or "{}")
            href = next(
                (l["href"] for l in body.get("links", []) if l.get("rel") == "self"),
                None,
            )
        return {
            "mode": "LIVE",
            "reason": reason,
            "created_at": ts,
            "draft_id": body.get("id") or (href or "").rstrip("/").split("/")[-1],
            "status": "DRAFT (created in PayPal, NOT sent)",
            "endpoint": f"{_base_url()}/v2/invoicing/invoices",
            "request_body": invoice,
            "href": href,
            "amount": f"{invoice['items'][0]['unit_amount']['value']} "
            f"{invoice['items'][0]['unit_amount']['currency_code']}",
            "note": "Review and send manually in the PayPal dashboard.",
        }
    except urllib.error.HTTPError as exc:  # surface API errors as a failed task
        detail = exc.read().decode(errors="replace")[:500]
        raise RuntimeError(f"PayPal draft create failed: {exc.code} {detail}") from exc
