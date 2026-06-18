"""Action tasks — side-effecting work (vs. text-only deliverables).

An action handler returns a uniform dict:
  {"content": markdown, "model": str, "mode": str, "cost_usd": float}
factory_lib dispatches action-type tasks here before falling back to the
text-deliverable generators. Actions are still fully guarded and sandboxed:
the only action wired today (PayPal draft) cannot move money — see paypal.py.
"""
from __future__ import annotations

import json

import paypal
from factory_paths import DELIVERABLES_DIR, assert_inside


def _invoices_dir():
    d = DELIVERABLES_DIR / "invoices"
    d.mkdir(parents=True, exist_ok=True)
    return d


def handle_paypal_invoice_draft(payload: dict, task: dict) -> dict:
    """Create a DRAFT PayPal invoice (stub offline) and persist the artifact."""
    result = paypal.create_draft_from_payload(payload)

    # Write the raw draft artifact (request body + result) as JSON sidecar.
    sidecar = _invoices_dir() / f"invoice-draft-{task['id']:03d}.json"
    assert_inside(sidecar)
    sidecar.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")

    rcp = result["request_body"]["primary_recipients"][0]["billing_info"]
    item = result["request_body"]["items"][0]
    content = f"""# PayPal Invoice Draft — task #{task['id']}

> {task['title']}
>
> Mode: **{result['mode']}** ({result['reason']}) · {result['created_at']}

## Draft summary
- **Draft id:** `{result['draft_id']}`
- **Status:** {result['status']}
- **Bill to:** {rcp['name']['given_name']} {rcp['name']['surname']} <{rcp['email_address']}>
- **Item:** {item['name']} — qty {item['quantity']} @ {item['unit_amount']['value']} {item['unit_amount']['currency_code']}
- **Total:** {result['amount']}
- **Endpoint:** `POST {result['endpoint']}`

> {result['note']}

## Safety
This action creates a **draft only**. No invoice is sent, no customer is
notified, and no money moves. Sending is a manual step you take in the PayPal
dashboard after reviewing the draft. (See `paypal.py` — there is no send code.)

## Exact request body (PayPal Invoicing v2)
```json
{json.dumps(result['request_body'], indent=2)}
```

Full machine-readable artifact: `deliverables/invoices/{sidecar.name}`
"""
    return {
        "content": content,
        "model": "paypal/invoicing-v2-draft",
        "mode": result["mode"],
        "cost_usd": 0.0,
    }


# Action dispatch table: task type -> handler
ACTIONS = {
    "paypal_invoice_draft": handle_paypal_invoice_draft,
}


def is_action(task_type: str) -> bool:
    return task_type in ACTIONS
