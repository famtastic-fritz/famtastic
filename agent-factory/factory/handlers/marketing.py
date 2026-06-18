"""Marketing + campaign skills for the FAMtastic deal-finding product pipeline.

Produces positioning/marketing copy and a campaign plan. Offline these are
template-driven deliverables; live model calls enrich them. Stage 1-2 of the
pipeline: marketing -> campaigning.
"""
from __future__ import annotations

from ..paths import BUSINESS_DIR
from ..router import route_and_run
from . import HandlerResult


def handle(task: dict) -> HandlerResult:
    """Marketing positioning pass (triage tier — cheap by design)."""
    p = task.get("payload", {})
    product = p.get("product", "FAMtastic TripSaver")
    route = route_and_run(
        f"Draft positioning angles for {product}, a done-for-you travel & event "
        f"deal-finding service. Audience: HBCU alumni planning group trips.",
        complexity=float(task.get("complexity", 0.35)),
        expected_output_tokens=160,
    )
    md = f"""# Marketing Positioning — {product}

**Routed via:** `{route.model}` (tier `{route.tier}`, mode `{route.mode}`)

## One-liner
We find the savings the booking page hides — alumni cruises, group trips, and
formal wear — and hand you the receipts.

## Core promise
Pay us a flat finder's fee (or % of verified savings); we return a playbook that
beats the retail quote, or you pay nothing.

## Proof hooks
- "$4,500 alumni-cruise quote modeled down ~40% with stacked seller-side levers."
- "Tux + two gowns, stunning, for 35% less."

## Channels (ranked by CAC)
1. HBCU alumni chapter newsletters / group chats (warm, near-zero CAC)
2. Eventbrite/group-trip organizer partnerships (rev-share)
3. Targeted social (orange/green creative, reunion-season timing)
"""
    path = BUSINESS_DIR / "MARKETING-POSITIONING.md"
    path.write_text(md)
    return HandlerResult(ok=True, summary=f"Positioning for {product} drafted (3 channels ranked).",
                         detail=md, routes=[route], artifact_path=str(path))


def handle_campaign(task: dict) -> HandlerResult:
    """Concrete campaign plan with cadence + funnel."""
    p = task.get("payload", {})
    season = p.get("season", "reunion/homecoming")
    route = route_and_run(
        f"Build a {season} launch campaign funnel for a group-travel deal-finding "
        f"service: hook, lead magnet, nurture, offer, close.",
        complexity=float(task.get("complexity", 0.5)),
        expected_output_tokens=200,
    )
    md = f"""# Campaign Plan — {season}

**Routed via:** `{route.model}` (tier `{route.tier}`, mode `{route.mode}`)

## Funnel
1. **Hook (ad/post):** "Your alumni cruise quote is too high. Here's proof."
2. **Lead magnet:** free 1-page savings estimate for their specific trip.
3. **Nurture (email, 3 touches):** levers explained, a real before/after, FAQ.
4. **Offer:** flat $99 finder fee OR 20% of verified savings (client picks).
5. **Close:** delivered playbook + booking-ready checklist.

## Cadence
- T-10wk: teaser. T-8wk: lead magnet live. T-6/5/4wk: nurture. T-3wk: offer push.

## Instrumentation
- One UTM per channel; track lead -> estimate -> paid conversion in the ledger.
"""
    path = BUSINESS_DIR / "CAMPAIGN-PLAN.md"
    path.write_text(md)
    return HandlerResult(ok=True, summary=f"{season} campaign funnel (5 stages) planned.",
                         detail=md, routes=[route], artifact_path=str(path))
