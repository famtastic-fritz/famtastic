"""Host-agency lane — the #1 cruise-savings unlock turned into an onboarding plan.

The prior research attempt stumbled onto an "agency login" and stopped. That login
is the doorway to host-agency advisor credentials: the single biggest lever in the
cruise playbook (commission you can rebate to your own booking + access to seller
portals). This handler produces an actionable onboarding playbook and models the
credential pipeline as trackable stages.

Offline honesty: agency names below are real, well-known host agencies, but exact
fees, splits, and onboarding times CHANGE and MUST be verified live before acting.
Every number here is labeled as a planning estimate, not a quote.
"""
from __future__ import annotations

from ..paths import BUSINESS_DIR
from ..router import route_and_run
from . import HandlerResult


# Real host agencies, grouped by why they'd fit a one-off self-booking goal.
# Fees/terms are planning estimates to verify live (flagged in the deliverable).
CANDIDATES = [
    ("Avoya Travel", "Independent-affiliate model; strong cruise relationships and "
     "live-lead support. Good if you want hand-holding on the first booking.",
     "est. low/no upfront; revenue split"),
    ("Dream Vacations (a CruiseOne brand)", "Cruise-first franchise/affiliate; deep "
     "cruise-line portal access. Strong if cruises are the whole point.",
     "est. franchise fee tiers; verify"),
    ("KHM Travel Group", "Popular host for new advisors; training + low monthly host "
     "fee; allows commission rebating to clients (including yourself).",
     "est. ~$35-50/mo host fee"),
    ("Travel Quest Network", "Low-cost host, fast onboarding, no/low monthly minimums; "
     "good for a single high-value booking then pause.",
     "est. low annual/monthly"),
    ("Outside Agents / Travel Planners International", "High commission splits for "
     "self-sufficient bookers; lighter support. Best once you know the ropes.",
     "est. per-booking or annual"),
]

PIPELINE_STAGES = [
    "1. Pick a host (optimize: low upfront, allows self-rebate, cruise portals).",
    "2. Apply + sign independent-contractor agreement.",
    "3. Complete required onboarding training (often a few hours, sometimes free).",
    "4. Receive advisor credentials + a CLIA/IATA card eligibility path.",
    "5. Register for cruise-line seller portals (CruisingPower for Royal/Celebrity, "
    "plus NCL / Carnival / Princess partner portals).",
    "6. Book the FAMU sailing AS THE ADVISOR; apply group/promo rates.",
    "7. Rebate the bulk of your commission to your own booking (the actual savings).",
]


def handle(task: dict) -> HandlerResult:
    complexity = float(task.get("complexity", 0.6))
    route = route_and_run(
        "Sequence the fastest, lowest-cost path to host-agency advisor credentials "
        "that allow rebating commission to one's own cruise booking.",
        complexity=complexity, expected_output_tokens=200,
    )

    fare = float(task.get("payload", {}).get("target_fare_usd", 4500))
    # Commission on cruise fare is typically ~10-16%; model a conservative 12%,
    # most of which a self-booking advisor can rebate to themselves.
    commission = round(fare * 0.12, 0)
    rebate = round(commission * 0.85, 0)

    cand = "\n".join(
        f"- **{n}** — {why}\n  - cost: {fee} _(verify live)_" for n, why, fee in CANDIDATES
    )
    stages = "\n".join(f"- {s}" for s in PIPELINE_STAGES)

    md = f"""# Host-Agency Onboarding — the #1 cruise savings lever

**Task:** {task['title']}
**Routed via:** `{route.model}` (tier `{route.tier}`, mode `{route.mode}`)

> The prior attempt's lone find — an "agency login" — is exactly this lane. As an
> affiliated advisor you earn commission on the fare and can rebate most of it to
> your own booking. On a ${fare:,.0f} fare: est. commission ~${commission:,.0f},
> of which ~${rebate:,.0f} is rebatable to you. That is real money, not a modeled
> percentage — it just requires the credential.

## Candidate hosts (real; verify current terms)
{cand}

## Credential pipeline (trackable stages)
{stages}

## Decision guidance
- **Fastest single-booking ROI:** a low-fee host (KHM / Travel Quest) — the host
  fee is dwarfed by the rebate on one $4,500 fare.
- **Most cruise support:** Dream Vacations / Avoya.
- Confirm the host **explicitly allows client rebating** before signing — not all do.

## Honesty / limits
- Agency names are real; **fees, splits, and onboarding times must be verified live**
  on each host's current site before acting. Numbers here are planning estimates.
- This is a real-world process (an application + agreement you sign), not something
  the factory can or should complete autonomously. It produces the plan; you execute.
- No money moves; no application is submitted by the system.
"""
    path = BUSINESS_DIR / "HOST-AGENCY-ONBOARDING.md"
    path.write_text(md)
    summary = (f"Host-agency onboarding plan: ~${rebate:,.0f} rebatable on a "
               f"${fare:,.0f} fare via advisor credentials; {len(CANDIDATES)} hosts "
               f"shortlisted, {len(PIPELINE_STAGES)}-stage pipeline.")
    return HandlerResult(ok=True, summary=summary, detail=md, routes=[route],
                         artifact_path=str(path))
