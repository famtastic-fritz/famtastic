"""Outreach / contacting skill — stage 3 of the pipeline.

Drafts outbound (email/DM) to organizers and leads. CRITICAL SAFETY: this handler
DRAFTS only. It never sends. It also encodes the prior attempt's hard-won lesson:
the TravelJoy page showed phone 407.600.4565 + visible email ewilson1911@yahoo.com,
but the mailto: resolved to megamindzproductions@gmail.com — a mismatch that MUST
be verified by a human before any real send.
"""
from __future__ import annotations

from ..paths import BUSINESS_DIR
from ..router import route_and_run
from . import HandlerResult


def handle(task: dict) -> HandlerResult:
    p = task.get("payload", {})
    target = p.get("target", "alumni cruise organizer")
    route = route_and_run(
        f"Draft a short, warm, professional first-contact email to a {target} "
        f"asking about group/alumni cruise block rates and advisor coordination.",
        complexity=float(task.get("complexity", 0.4)),
        expected_output_tokens=180,
    )
    draft = f"""Subject: FAMU alumni group cruise — coordinating block rates

Hi {{ORGANIZER_NAME}},

I'm helping coordinate a small FAMU group for the alumni cruise and want to make
sure we book inside the official block. Could you confirm:

1. The group/block rate and what's included (OBC, amenities)?
2. Whether you're handling bookings directly or through a host agency?
3. Current cabin availability for 3 travelers (one stateroom or two)?

Happy to work with your preferred advisor. Thank you!

{{YOUR_NAME}} · {{YOUR_PHONE}}
"""
    md = f"""# Outreach Draft — {target}

**Routed via:** `{route.model}` (tier `{route.tier}`, mode `{route.mode}`)
**STATUS: DRAFT ONLY — NOT SENT.**

## ⚠ Contact verification required (from prior-attempt learnings)
Before ANY send, verify the recipient. The earlier research found conflicting
contact points on the same listing:
- Visible phone: `407.600.4565`
- Visible email text: `ewilson1911@yahoo.com`
- Underlying `mailto:` resolved to: `megamindzproductions@gmail.com`

A human must confirm the correct address. Do not auto-send to a mismatched target.

## Draft
```
{draft}
```

## Send path (when authorized)
- From a GoDaddy-hosted custom address (e.g. `deals@yourdomain.com`).
- Logged to the pipeline ledger as `contacted`. No auto-send in this sandbox.
"""
    path = BUSINESS_DIR / "OUTREACH-DRAFT.md"
    path.write_text(md)
    return HandlerResult(
        ok=True,
        summary=f"Outreach draft to {target} prepared (DRAFT ONLY; contact mismatch flagged).",
        detail=md, routes=[route], artifact_path=str(path),
    )
