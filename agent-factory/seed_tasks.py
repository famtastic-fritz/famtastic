#!/usr/bin/env python3
"""Seed the task queue so the factory has work immediately.

Two waves:
  * proof wave  — the factory's first real job: the FAMtastic Designs business
    package and the six requested deliverables (high-value, varied complexity).
  * burst wave  — a flood of cheap triage/classify/summarize items to exercise
    routing variety and force the orchestrator to scale workers up then retire them.

Usage:
    python3 seed_tasks.py            # seed proof wave + a small burst
    python3 seed_tasks.py --burst 12 # add N extra cheap tasks
"""
import argparse

from src import db, queue

PROOF_TASKS = [
    # kind,                     payload,                                                   complexity, priority
    ("business_model",         {"product": "FAMtastic Designs"},                            0.90, 1),
    ("prompt_builder",         {"target": "claude-code"},                                   0.60, 2),
    ("shay_shay_spec",         {"name": "Shay-Shay v2"},                                    0.85, 2),
    ("agent_synthesis",        {"sources": ["hermes", "open-jarvis", "+6"]},                0.70, 3),
    ("odysseus_optimization",  {"repo": "pewdiepie-archdaemon/odysseus"},                   0.65, 3),
    ("system_audit",           {"inputs": ["buglog", "commits", "complaints"]},             0.75, 3),
]

SAMPLE_TEXTS = [
    ("triage",    "Customer says the site is DOWN right now, needs help ASAP"),
    ("triage",    "Hi, just browsing, no rush at all"),
    ("classify",  "What is the price for the Signature package?"),
    ("classify",  "I need help logging into my care-plan dashboard"),
    ("summarize", "The prospect runs a three-location barber shop in Atlanta and wants "
                  "online booking, a gallery, and a contact page, launched before the "
                  "holiday rush, with monthly upkeep afterward."),
]


def seed_proof():
    ids = []
    for kind, payload, cx, pr in PROOF_TASKS:
        ids.append(queue.add(kind, payload, complexity=cx, priority=pr))
    return ids


def seed_burst(n):
    ids = []
    for i in range(n):
        kind, text = SAMPLE_TEXTS[i % len(SAMPLE_TEXTS)]
        cx = {"triage": 0.12, "classify": 0.22, "summarize": 0.40}[kind]
        ids.append(queue.add(kind, {"text": text}, complexity=cx, priority=5))
    return ids


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--burst", type=int, default=5)
    ap.add_argument("--proof", action="store_true", help="seed proof wave only")
    args = ap.parse_args()
    db.init()
    proof = seed_proof()
    burst = [] if args.proof else seed_burst(args.burst)
    print(f"seeded {len(proof)} proof tasks + {len(burst)} burst tasks "
          f"(queue depth now {queue.depth()})")


if __name__ == "__main__":
    main()
