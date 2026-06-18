#!/usr/bin/env python3
"""Seed the task queue with sample work so the factory has something to do.

Includes the PROOF task — the FAMtastic Designs business-model + sales pipeline —
plus a spread of cheap/triage tasks so model routing and self-scaling are
visibly exercised.

Usage:
    python3 seed.py            # reset DB and inject the sample batch
    python3 seed.py --keep     # add tasks without resetting
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

import queue as q  # noqa: E402


SAMPLE_TASKS = [
    # --- the headline proof task: high complexity → routes to STRONG model ---
    {
        "type": "business_model",
        "priority": 1,
        "complexity": 0.95,
        "payload": {
            "slug": "famtastic-designs-business-model",
            "product": "FAMtastic Designs",
            "paypal_account": "<PayPal Business — provided at activation>",
            "godaddy_domain": "famtasticdesigns.com",
            "outreach_from": "hello@famtasticdesigns.com",
        },
    },
    # --- a proposal: high complexity → STRONG model ---
    {
        "type": "proposal",
        "priority": 3,
        "complexity": 0.7,
        "payload": {"slug": "proposal-atlanta-barber", "business": "Tony's Barber Shop"},
    },
    # --- cheap triage lane: these ride the CHEAP model ---
    {"type": "personalize", "priority": 4, "complexity": 0.2,
     "payload": {"slug": "outreach-lunas", "name": "Luna", "business": "Luna's Flower Shop"}},
    {"type": "personalize", "priority": 4, "complexity": 0.2,
     "payload": {"slug": "outreach-marios", "name": "Mario", "business": "Mario's Pizza"}},
    {"type": "classify", "priority": 5, "complexity": 0.15,
     "payload": {"slug": "classify-1", "text": "Hi, my invoice didn't go through, can you help me pay?"}},
    {"type": "classify", "priority": 5, "complexity": 0.15,
     "payload": {"slug": "classify-2", "text": "The contact form on my new site is broken / throws an error."}},
    {"type": "summarize", "priority": 5, "complexity": 0.3,
     "payload": {"slug": "summary-dna", "text": (
         "FAMtastic Designs ships confidently-different marketing sites for local "
         "businesses fast, using a layered hero vocabulary, real SVG dividers, "
         "multi-part logos, and motion that a normal agency would not ship.")}},
    {"type": "summarize", "priority": 5, "complexity": 0.3,
     "payload": {"slug": "summary-pipeline", "text": (
         "The sales pipeline runs marketing to campaign to outreach to qualify to "
         "propose to close to PayPal collection to delivery to Care Plan upsell.")}},
]


def main():
    keep = "--keep" in sys.argv
    if keep:
        q.init_db()
    else:
        q.reset_db()
    ids = []
    for t in SAMPLE_TASKS:
        ids.append(q.add_task(t["type"], t["payload"],
                              priority=t["priority"], complexity=t["complexity"]))
    print(f"seeded {len(ids)} tasks (ids {min(ids)}–{max(ids)}); queue depth = {q.queue_depth()}")
    print("proof task: 'business_model' (complexity 0.95 → routes to strong model)")


if __name__ == "__main__":
    main()
