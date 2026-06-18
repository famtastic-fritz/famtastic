"""Seed the queue with sample work so the factory has something to do at once.

The seed reflects the proof workload: the full FAMtastic deal-finding business
pipeline (find deals -> market -> campaign -> contact -> sell -> collect), plus
the two concrete deal hunts (the $4,500 FAMU alumni cruise for 3, and stunning
affordable FAMU-inspired formal wear for two ladies + one gentleman).

Complexity is set per task so the model router demonstrably picks cheap tiers for
triage-grade work and escalates only the hard reasoning.
"""
from __future__ import annotations

from . import db

SEED_TASKS = [
    # The two headline deal hunts (higher complexity -> may escalate).
    ("deal_finder", "FAMU alumni cruise for 3 — beat the $4,500 quote",
     {"baseline_cost_usd": 4500, "party_size": 3,
      "source_url": "FAMU alumni cruise (TravelJoy/Eventbrite organizer block)"},
     0.7, 1),
    ("apparel_finder", "FAMU-inspired formal wear — 2 ladies + 1 gentleman, stunning + affordable",
     {"baseline_cost_usd": 1200}, 0.55, 2),

    # Business pipeline stages (mostly cheap/triage tiers).
    ("marketing", "Position 'FAMtastic TripSaver' deal-finding product",
     {"product": "FAMtastic TripSaver"}, 0.35, 3),
    ("campaign", "Reunion-season launch campaign funnel",
     {"season": "reunion/homecoming"}, 0.5, 3),
    ("outreach", "Draft first-contact to alumni cruise organizer (DRAFT ONLY)",
     {"target": "alumni cruise organizer"}, 0.4, 4),
    ("sales", "Sales close: flat fee vs % of verified savings",
     {"verified_savings_usd": 1800}, 0.45, 4),
    ("payment", "Payment-collection plan via PayPal invoice (stubbed)",
     {"amount_usd": 99}, 0.3, 5),

    # A few extra triage-grade tasks so the orchestrator has volume to scale into.
    ("marketing", "Position add-on: 'formal-wear-for-less' bundle",
     {"product": "FAMtastic Look Bundle"}, 0.3, 6),
    ("outreach", "Draft host-agency advisor application inquiry (DRAFT ONLY)",
     {"target": "host agency (advisor credentials)"}, 0.4, 6),
    ("deal_finder", "Shoulder-season cruise alternative for the same route",
     {"baseline_cost_usd": 3800, "party_size": 3}, 0.6, 5),
]


def seed(reset: bool = False) -> int:
    db.init_db()
    if reset:
        with db.connect() as c:
            c.execute("DELETE FROM tasks")
            c.execute("DELETE FROM runs")
            c.execute("DELETE FROM batches")
            c.execute("DELETE FROM config_history")
    n = 0
    for kind, title, payload, complexity, priority in SEED_TASKS:
        db.enqueue(kind, title, payload, complexity, priority)
        n += 1
    return n


if __name__ == "__main__":
    import sys
    reset = "--reset" in sys.argv
    count = seed(reset=reset)
    print(f"Seeded {count} tasks (reset={reset}). Queue depth: {db.queue_depth()}")
