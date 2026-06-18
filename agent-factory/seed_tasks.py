"""Seed the queue with work so the factory has something to do immediately.

The 6 PROOF tasks build the complete go-to-market → sell → collect pipeline for
selling FAMtastic Designs (the deliverable the brief asked for). A few extra
low-complexity tasks are added so model routing has variety to demonstrate
(cheap triage vs. standard vs. premium).
"""
from __future__ import annotations

import sys

import queue_db

# (type, title, priority, complexity, payload)
PROOF_TASKS = [
    ("business_model",
     "Business model for selling FAMtastic Designs",
     1, 0.85,
     {"product": "FAMtastic Designs", "use": "internal"}),
    ("marketing_strategy",
     "Marketing & positioning for FAMtastic Designs",
     2, 0.7,
     {"beachhead": ["agencies", "merchants", "local-services"]}),
    ("campaign_plan",
     "First campaign plan (checkout rescue lane)",
     2, 0.65,
     {"primary_offer": "Checkout Rescue Diagnostic", "price_usd": 500}),
    ("outreach_system",
     "Outreach & contacting system (email + LinkedIn)",
     3, 0.75,
     {"channels": ["email", "linkedin", "upwork"]}),
    ("sales_process",
     "Sales process, offer copy & proposals",
     3, 0.8,
     {"entry_offer_usd": 500, "tripwire_usd": 149}),
    ("payment_fulfillment",
     "Payment collection & fulfillment (PayPal + GoDaddy)",
     1, 0.9,
     {"rail": "paypal-business", "email_provider": "godaddy"}),
]

# Extra throughput/variety so routing has cheap + mid + premium examples.
EXTRA_TASKS = [
    ("triage", "Classify inbound lead: agency vs merchant", 5, 0.2, {"lead": "sample"}),
    ("triage", "Tag 20 outreach targets by vertical", 5, 0.25, {"count": 20}),
    ("triage", "Draft 1-line subject A/B variants", 6, 0.3, {"variants": 3}),
    ("summary", "Summarize first-batch reply rates", 6, 0.45, {}),
]


def seed(include_extra: bool = True) -> list[int]:
    queue_db.init_db()
    ids = []
    for t in PROOF_TASKS:
        ids.append(queue_db.add_task(t[0], t[1], t[4], t[2], t[3]))
    if include_extra:
        for t in EXTRA_TASKS:
            ids.append(queue_db.add_task(t[0], t[1], t[4], t[2], t[3]))
    return ids


if __name__ == "__main__":
    extra = "--no-extra" not in sys.argv
    ids = seed(include_extra=extra)
    print(f"Seeded {len(ids)} tasks: {ids}")
    print("Queue status:", queue_db.count_by_status())
