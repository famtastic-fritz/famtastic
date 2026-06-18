#!/usr/bin/env python3
"""End-to-end proof run.

Starts the orchestrator, seeds tasks, processes them by spawning real worker
subprocesses, routes each to the cheapest capable model, logs costs, runs the
self-improvement loop after each batch, and renders the dashboard.

It deliberately runs in TWO batches with a fresh burst seeded between them so the
self-improvement loop has a second batch on which to apply its tuning.

    python3 run_demo.py
"""
import os

from src import db, dashboard, log
from src.orchestrator import Orchestrator
import seed_tasks

ROOT = os.path.dirname(os.path.abspath(__file__))


def main():
    print("\n>>> AGENT FACTORY — END-TO-END PROOF RUN\n")
    db.reset()  # clean slate so the proof run is reproducible
    log.orch("demo_start")

    orch = Orchestrator()

    # ---- Batch 1: the proof wave (the real first job) + a small burst ----
    proof = seed_tasks.seed_proof()
    burst1 = seed_tasks.seed_burst(5)
    print(f"[seed] batch 1: {len(proof)} proof tasks + {len(burst1)} burst tasks")
    orch.run_batch(1)

    # ---- Batch 2: a bigger burst to show scaling + adaptation ----
    burst2 = seed_tasks.seed_burst(10)
    print(f"[seed] batch 2: {len(burst2)} burst tasks")
    orch.run_batch(2)

    log.orch("demo_stop")

    # ---- Observability ----
    print()
    dashboard.render_terminal()
    html = dashboard.write_html()
    print(f"\nStatic dashboard written to: {os.path.relpath(html, ROOT)}")
    print("Deliverables written to:    deliverables/")
    print("Logs:                       logs/ORCHESTRATOR.log, logs/COSTS.log")
    print("Self-improvement findings:  LEARNINGS.md\n")


if __name__ == "__main__":
    main()
