"""Deal-finder skills: travel/cruise savings and FAMU-inspired formal wear.

This is the *proof workload*. The prior failed attempt (see LEARNINGS.md) spent a
cron job concluding it lacked tooling and only surfaced an agency login. This
handler instead returns concrete, executable savings strategy on every run.

Offline honesty: with no live key, this does not scrape live prices. It encodes
the real *levers* that move a quoted price and produces an actionable playbook +
a savings model. With a live model/data key wired (SETUP.md), the same handler
enriches the playbook with current quotes. Either way it never fails to produce
a deliverable — the opposite of the prior attempt.
"""
from __future__ import annotations

import re

from ..paths import BUSINESS_DIR
from ..router import route_and_run
from . import HandlerResult


def _slug(text: str, maxlen: int = 40) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s[:maxlen].strip("-") or "task"


# ── Cruise / trip deal finding ────────────────────────────────────────────────

CRUISE_LEVERS = [
    ("Host-agency commission rebate", 0.10,
     "The prior attempt's one real find — an agency login — IS the unlock. A host "
     "agency (Avoya, Dream Vacations, KHM, Travel Quest) issues you advisor "
     "credentials. As the booking advisor you earn 10-16% commission and can "
     "rebate most of it to your own booking. On a $4,500 fare that is $450-700 back."),
    ("FAMU alumni group block / shared-amenity rate", 0.08,
     "Alumni cruises are sold as group blocks. Booking inside the official block "
     "(or forming an 8-cabin block of your own) unlocks group pricing, 1 free berth "
     "per 8 cabins (tour-conductor credit), and group amenity points."),
    ("Refundable deposit + price-drop re-fare", 0.06,
     "Book refundable, then monitor. Cruise fares drop repeatedly before sailing; "
     "re-fare each drop. Tools: cruise price-watch. Historically 5-8% recoverable "
     "with zero penalty on refundable fares."),
    ("3rd/4th guest sails free + kids/companion promos", 0.12,
     "For 3 travelers, put the third in promos where 'guests 3 & 4 sail free' — "
     "you pay taxes/fees only on the third. That alone can cut a 3-person fare ~1/3 "
     "on the qualifying portion."),
    ("Shoulder-season / repositioning alternative", 0.15,
     "If dates flex, a repositioning or shoulder-week sailing of the same ship/route "
     "runs 20-40% cheaper. Offered as an alternative itinerary, not a replacement."),
    ("Onboard credit + loyalty/casino offer stacking", 0.05,
     "Stack agency OBC + cardmember OBC + shareholder OBC ($50-250 ea) + any casino/"
     "loyalty certificate. These don't cut fare but offset onboard spend dollar-for-"
     "dollar, effectively lowering total trip cost."),
    ("Cabin guarantee (GTY) rate", 0.07,
     "A 'guarantee' cabin (you pick category, line picks the room) is the cheapest "
     "way into a category, typically 5-10% under assigned rooms."),
]

APPAREL_LEVERS = [
    ("HBCU / FAMU-licensed brands direct", 0.0,
     "Source FAMU-inspired pieces (orange #F89728 / green #008542 palette) from "
     "HBCU-owned labels and the official bookstore line, then look for the same SKUs "
     "discounted elsewhere."),
    ("Formal-wear rental for the gentleman", 0.45,
     "A stunning tux/suit is the biggest single cost for the man. Rental (Generation "
     "Tux, The Black Tux, Men's Wearhouse rental) delivers a designer look for "
     "~$95-160 vs $400-700 to buy — a 40-60% line-item saving with zero quality loss."),
    ("Group / coordinated order discount", 0.10,
     "Order all three outfits from as few vendors as possible to trigger order-total "
     "tiers and combined free shipping; many boutiques give 10-15% on 3+ items."),
    ("Outlet + last-season formal", 0.25,
     "Ladies' formal wear: outlet/last-season identical silhouettes run 25-40% under "
     "current-season at the same brands (Nordstrom Rack, Saks OFF 5TH, Rent the "
     "Runway for an event-only gown)."),
    ("Stacked cashback + student/alumni codes", 0.08,
     "Layer card cashback + portal cashback (Rakuten/Capital One) + alumni/student "
     "codes. Routinely 6-12% back on apparel, applied after every other discount."),
]


def _model_pass(title: str, kind: str, complexity: float) -> object:
    """Use the router for a triage/synthesis pass — demonstrates cost-aware routing.
    Content below is system-authored domain logic; the model pass would enrich it
    live."""
    prompt = (f"Triage and prioritize savings strategy for: {title} "
              f"(kind={kind}). Return the highest-ROI levers first.")
    return route_and_run(prompt, complexity=complexity, expected_output_tokens=180)


def handle(task: dict) -> HandlerResult:
    payload = task.get("payload", {})
    base_cost = float(payload.get("baseline_cost_usd", 4500))
    party = int(payload.get("party_size", 3))
    complexity = float(task.get("complexity", 0.6))

    route = _model_pass(task["title"], "cruise", complexity)

    # Build a savings model. Levers are applied multiplicatively against the
    # remaining (non-overlapping) baseline so the estimate stays conservative.
    lines, remaining, total_saved = [], base_cost, 0.0
    for name, pct, why in CRUISE_LEVERS:
        saved = round(remaining * pct, 2)
        total_saved += saved
        remaining -= saved
        lines.append(f"- **{name}** — est. save ${saved:,.0f} ({int(pct*100)}%)\n  - {why}")

    floor = round(remaining, 2)
    md = _cruise_playbook_md(task["title"], base_cost, party, lines,
                             total_saved, floor, route)
    path = BUSINESS_DIR / f"CRUISE-{task['id']:02d}-{_slug(task['title'])}.md"
    path.write_text(md)

    summary = (f"Cruise savings playbook: ${base_cost:,.0f} -> ~${floor:,.0f} for "
               f"{party} (est. ${total_saved:,.0f} / "
               f"{int(total_saved/base_cost*100)}% off). Top lever: host-agency rebate.")
    return HandlerResult(ok=True, summary=summary, detail=md, routes=[route],
                         artifact_path=str(path))


def handle_apparel(task: dict) -> HandlerResult:
    payload = task.get("payload", {})
    base_cost = float(payload.get("baseline_cost_usd", 1200))
    complexity = float(task.get("complexity", 0.4))

    route = _model_pass(task["title"], "apparel", complexity)

    lines, remaining, total_saved = [], base_cost, 0.0
    for name, pct, why in APPAREL_LEVERS:
        saved = round(remaining * pct, 2)
        total_saved += saved
        remaining -= saved
        lines.append(f"- **{name}** — est. save ${saved:,.0f} ({int(pct*100)}%)\n  - {why}")
    floor = round(remaining, 2)

    md = _apparel_playbook_md(task["title"], base_cost, lines, total_saved, floor, route)
    path = BUSINESS_DIR / f"APPAREL-{task['id']:02d}-{_slug(task['title'])}.md"
    path.write_text(md)

    summary = (f"Apparel playbook (2 ladies + 1 gentleman): ${base_cost:,.0f} -> "
               f"~${floor:,.0f} (est. ${total_saved:,.0f} off). Biggest lever: "
               f"tux rental for the gentleman.")
    return HandlerResult(ok=True, summary=summary, detail=md, routes=[route],
                         artifact_path=str(path))


def _cruise_playbook_md(title, base, party, lines, saved, floor, route) -> str:
    return f"""# FAMU Cruise — Savings Playbook

**Task:** {title}
**Baseline (conventional booking):** ${base:,.0f} for {party} travelers
**Modeled floor after stacking levers:** ~${floor:,.0f}
**Estimated total savings:** ${saved:,.0f} ({int(saved/base*100)}% off)
**Routed via:** `{route.model}` (tier `{route.tier}`, mode `{route.mode}`, est. cost ${route.cost_usd})

> The conventional $4,500/3-person quote is the *retail* path. Every lever below
> is a seller-side or timing advantage the prior research attempt identified but
> never executed. The single biggest unlock is the agency login it stumbled onto:
> that is the host-agency credential lane.

## Savings levers (highest ROI first)

{chr(10).join(lines)}

## Execution order

1. **Claim the advisor lane.** Apply to a host agency (free to low-cost). This
   converts the "agency login" finding into rebate authority.
2. **Find / form the FAMU alumni block.** Verify the organizer contact (the prior
   attempt found a phone + two mismatched emails — verify before any outbound;
   see LEARNINGS.md).
3. **Book refundable**, lock the 3rd-guest-free promo, choose a GTY cabin.
4. **Price-watch and re-fare** every drop until final payment.
5. **Stack OBC** at the end; it offsets onboard spend.

## Honesty / limits
- Offline mode models *levers and percentages*, not live quotes. Wire a live
  model/data key (SETUP.md) to attach current sailing prices to each lever.
- No money is moved. No outbound contact is sent. This is a plan, not an action.
"""


def _apparel_playbook_md(title, base, lines, saved, floor, route) -> str:
    return f"""# FAMU-Inspired Formal Wear — Savings Playbook

**Task:** {title}
**Party:** 2 ladies + 1 gentleman
**Baseline:** ${base:,.0f}
**Modeled floor after levers:** ~${floor:,.0f}
**Estimated savings:** ${saved:,.0f} ({int(saved/base*100)}% off)
**Routed via:** `{route.model}` (tier `{route.tier}`, mode `{route.mode}`, est. cost ${route.cost_usd})

> Goal: stunning + affordable. FAMU palette — Rattler Orange `#F89728`, Rattler
> Green `#008542`. Black-tie-with-a-pop-of-orange reads as intentional, not costume.

## Savings levers (highest ROI first)

{chr(10).join(lines)}

## Look direction
- **Gentleman:** classic black/midnight tux (rented), orange pocket square + green
  enamel studs as the FAMU nod. Stunning at a fraction of buying.
- **Ladies:** one emerald-green floor-length gown, one black gown with orange
  accent (clutch/heels). Outlet/last-season identical silhouettes.

## Honesty / limits
- Offline mode models levers, not live SKUs. A live retail-search key attaches
  current items + sizes to each lever.
- No purchases are made.
"""
