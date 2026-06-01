#!/usr/bin/env python3
"""
run_phase3b.py — Phase 3b meta-test.

Shay runs the full knowledge-work arc through her own pipeline:
  1. Read existing specs from the vault as context
  2. Decompose the meta-goal into sub-tasks
  3. Research + draft in parallel workers
  4. Self-review adversarially
  5. Synthesize a final output
  6. Evaluate against quality gates
  7. Write results to the vault

Goal: prove Shay can autonomously produce J'-quality knowledge artifacts.
"""
import sys, time, json, os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent / "components"))

from swarm import WorkerPool, LocalSwarmDispatcher, load_policy, run_job
from swarm.pipeline import agent, parallel, adversarial_verify, completeness_critic
from swarm.brain_client import BrainAvailabilityCheck

OUT_DIR = Path.home() / "famtastic/obsidian/Shay-Memory/post-review"
OUT_DIR.mkdir(parents=True, exist_ok=True)
LOG = OUT_DIR / "phase3b-run-2026-05-30.log"
RESULT = OUT_DIR / "phase3b-result-2026-05-30.md"

def log(msg):
    line = f"[{time.strftime('%H:%M:%S')}] {msg}"
    print(line)
    with open(LOG, "a") as f:
        f.write(line + "\n")

# ── Load existing context from vault ─────────────────────────────────────────
def load_context():
    """Read the key specs that Shay needs to know about."""
    context_files = [
        Path.home() / "famtastic/obsidian/Shay-Memory/desk-redesign/spec-2026-05-29.md",
        Path.home() / "famtastic/obsidian/Shay-Memory/post-review/swarm-architecture-2026-05-30.md",
        Path.home() / "famtastic/obsidian/Shay-Memory/post-review/v2-build-plan-2026-05-30.md",
        Path.home() / "famtastic/obsidian/Shay-Memory/post-review/shay-self-orchestration-plan-2026-05-30.md",
        Path.home() / "famtastic/obsidian/Shay-Memory/post-review/comparison-report-2026-05-30.md",
    ]
    chunks = []
    for fp in context_files:
        if fp.exists():
            text = fp.read_text(errors="ignore")[:3000]  # cap per file
            chunks.append(f"### {fp.name}\n{text}")
            log(f"  loaded: {fp.name} ({len(text)} chars)")
        else:
            log(f"  MISSING: {fp.name}")
    return "\n\n".join(chunks)

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    LOG.write_text("")  # reset
    log("=== PHASE 3b META-TEST starting ===")

    policy = load_policy("balanced")
    log(f"Policy: {policy['name']}")

    pool = WorkerPool(num_workers=3)
    pool.start()
    pool.spawn_workers(3)
    dispatcher = LocalSwarmDispatcher(worker_pool=pool, policy=policy)
    BrainAvailabilityCheck(dispatcher._brain)

    log("Loading vault context...")
    context = load_context()
    log(f"Total context: {len(context)} chars")

    META_GOAL = """You are Shay's autonomous planning engine.

Using the context provided from the existing specs and plans, produce:
1. A SWARM ARCHITECTURE SUMMARY — 3 key decisions about how Shay's swarm should be structured, with the rationale for each (based on what was learned from the Phase 1+2+3a build)
2. A V2 DESKTOP BUILD PRIORITIES — the top 5 screens/features to build first in the Shay Desktop, ranked by impact, with one sentence on why each is first
3. A SELF-ASSESSMENT — honest evaluation of what Shay can do autonomously today vs. what still requires human execution, based on the gaps identified in the plans

Each section should be 150-250 words. Specific and actionable. No fluff."""

    JOB_SPEC = json.dumps({
        "name": "Phase 3b meta-test",
        "goal": META_GOAL,
        "phases": [
            {
                "name": "Research-from-context",
                "brain": "claude",
                "tier": "complex",
                "tasks": [
                    f"Context from existing Shay plans and specs:\n\n{context[:4000]}\n\nTask: Based on this context, summarize the 3 most important architectural decisions made in the Phase 1-3a swarm build and why they matter.",
                    f"Context:\n\n{context[4000:8000]}\n\nTask: Based on this context, identify the top 5 Shay Desktop screens to build first, ranked by user impact. One sentence rationale each.",
                    f"Context:\n\n{context[:3000]}\n\nTask: Based on this context, write an honest self-assessment of what Shay's autonomous swarm can do today vs. what still needs human execution. Be specific about the gaps.",
                ]
            },
            {
                "name": "Synthesize",
                "brain": "claude",
                "tier": "complex",
                "tasks": [
                    "Synthesize the three research outputs into a single, well-structured document with three clear sections: (1) Swarm Architecture Key Decisions, (2) Desktop Build Priorities, (3) Honest Self-Assessment. Each section 150-250 words. This is Shay's autonomous output — make it sharp."
                ]
            }
        ],
        "quality_gate": {"min_chars": 1000}
    })

    log("\nRunning meta-test job through Shay's pipeline...")
    t0 = time.time()
    result = run_job(JOB_SPEC, dispatcher)
    elapsed = time.time() - t0

    log(f"\nStatus:       {result.status}")
    log(f"Quality gate: {result.quality_gate}")
    log(f"Output chars: {len(result.final_output or '')}")
    log(f"Elapsed:      {elapsed:.1f}s")

    # ── Self-adversarial review ──────────────────────────────────────────────
    log("\nRunning adversarial self-review (2 skeptics)...")
    output = result.final_output or ""
    if output:
        survived = adversarial_verify(output[:2000], dispatcher, n=2, threshold=0.67)
        log(f"Adversarial review: {'SURVIVED' if survived else 'needs revision'}")

        gaps = completeness_critic(output, META_GOAL, dispatcher)
        log(f"Completeness critic found {len(gaps)} gap(s): {gaps[:3]}")

    # ── Quality gates ────────────────────────────────────────────────────────
    has_section1 = "architecture" in output.lower() or "swarm" in output.lower()
    has_section2 = "desktop" in output.lower() or "screen" in output.lower() or "priorit" in output.lower()
    has_section3 = "gap" in output.lower() or "cannot" in output.lower() or "human" in output.lower() or "self-assess" in output.lower()
    has_length = len(output) >= 1000

    log("\n=== QUALITY GATES ===")
    log(f"[{'PASS' if has_length else 'FAIL'}] length >= 1000 chars")
    log(f"[{'PASS' if has_section1 else 'FAIL'}] swarm architecture section present")
    log(f"[{'PASS' if has_section2 else 'FAIL'}] desktop priorities section present")
    log(f"[{'PASS' if has_section3 else 'FAIL'}] honest self-assessment section present")

    gate = all([has_length, has_section1, has_section2, has_section3])
    log(f"\n{'✅ PHASE 3b GATE: PASS' if gate else '❌ PHASE 3b GATE: FAIL'}")

    # ── Write to vault ───────────────────────────────────────────────────────
    md = f"""---
title: Phase 3b Meta-Test Result
date: 2026-05-30
tags: [phase3b, meta-test, autonomous, swarm]
gate: {'PASS' if gate else 'FAIL'}
elapsed_sec: {elapsed:.0f}
output_chars: {len(output)}
---

# Phase 3b Meta-Test — Shay's Autonomous Output

**Gate: {'PASS ✅' if gate else 'FAIL ❌'}**
**Elapsed:** {elapsed:.0f}s | **Chars:** {len(output)}

---

{output}

---
*Generated autonomously by Shay's Phase 1+2+3a pipeline*
"""
    RESULT.write_text(md)
    log(f"\nResult written to: {RESULT}")
    pool.stop()
    return 0 if gate else 1

if __name__ == "__main__":
    sys.exit(main())
