#!/usr/bin/env python3
"""
swarm-benchmark.py — Run an architecture-comparison workload through
shay-agent-os SwarmOrchestrator and capture timing/output for the J' comparison.

The task mirrors what Workflow J's parallel "architecture comparison doc"
agent produces, but sized for local Ollama models (qwen2.5:1.5b /
phi4-mini / hermes3) so we can fairly compare local-swarm capability
to cloud-LLM fan-out.

Output: swarm-benchmark-result-2026-05-30.json + raw transcript.
"""
from __future__ import annotations

import json
import os
import sys
import time
import traceback
from pathlib import Path

SWARM_ROOT = Path("/Users/famtasticfritz/famtastic/shay-agent-os")
sys.path.insert(0, str(SWARM_ROOT))
sys.path.insert(0, str(SWARM_ROOT / "components"))

OUT_DIR = Path("/Users/famtasticfritz/famtastic/obsidian/Shay-Memory/post-review")
RESULT_PATH = OUT_DIR / "swarm-benchmark-result-2026-05-30.json"
TRANSCRIPT_PATH = OUT_DIR / "swarm-benchmark-transcript-2026-05-30.md"
LOG_PATH = OUT_DIR / "swarm-benchmark-2026-05-30.log"


def log(msg: str) -> None:
    line = f"[{time.strftime('%H:%M:%S')}] {msg}\n"
    sys.stdout.write(line)
    sys.stdout.flush()
    with LOG_PATH.open("a") as f:
        f.write(line)


def main() -> int:
    LOG_PATH.write_text("")  # truncate
    log("swarm-benchmark starting")
    try:
        from swarm import SwarmOrchestrator
    except Exception as exc:
        log(f"IMPORT_FAIL: {exc}\n{traceback.format_exc()}")
        RESULT_PATH.write_text(json.dumps({
            "status": "import_failed",
            "error": str(exc),
            "traceback": traceback.format_exc(),
        }, indent=2))
        return 1

    # Goal mirrors what J's parallel arch-doc agent produces.
    goal = (
        "Produce a structured comparison of three multi-agent orchestration "
        "patterns: (1) Anthropic's documented orchestration mode with Opus 4.8 "
        "and MAX_PARALLEL_AGENTS=10; (2) generic Workflow-tool fan-out with "
        "per-workflow concurrency caps and per-session token quotas; "
        "(3) shay-agent-os SwarmOrchestrator with local Ollama workers and "
        "goal decomposition. For each: list the maximum concurrent agents, "
        "the brain coupling (single-vendor vs multi-vendor), the cost model "
        "(per-token, per-minute, free), and the top limitation. End with a "
        "two-sentence recommendation on when to pick each pattern."
    )

    log(f"goal: {goal[:120]}...")
    log("initializing SwarmOrchestrator (num_workers=3, goal_budget=10)")

    t0 = time.time()
    orch = SwarmOrchestrator(num_workers=3, goal_budget=10, log_level="INFO")
    orch.start()
    log("orchestrator started")
    log(orch.status_report())

    try:
        session = orch.goal(goal)
        elapsed = time.time() - t0
        log(f"goal complete in {elapsed:.1f}s status={session.status} "
            f"turns={session.turn} subgoals={len(session.subgoals)}")
    except Exception as exc:
        elapsed = time.time() - t0
        log(f"GOAL_FAILED after {elapsed:.1f}s: {exc}\n{traceback.format_exc()}")
        orch.stop()
        RESULT_PATH.write_text(json.dumps({
            "status": "goal_exception",
            "elapsed_sec": round(elapsed, 1),
            "error": str(exc),
            "traceback": traceback.format_exc(),
        }, indent=2))
        return 1

    subgoals_data = [
        {
            "id": sg.id,
            "description": sg.description,
            "status": sg.status,
            "tier": sg.assigned_tier,
            "result_chars": len(sg.result) if sg.result else 0,
            "result_preview": (sg.result or "")[:300],
        }
        for sg in session.subgoals
    ]

    result = {
        "status": session.status,
        "elapsed_sec": round(elapsed, 1),
        "turns_used": session.turn,
        "budget": 10,
        "num_subgoals": len(session.subgoals),
        "tier_counts": {
            tier: sum(1 for sg in session.subgoals if sg.assigned_tier == tier)
            for tier in ("simple", "medium", "complex")
        },
        "final_result_chars": len(session.final_result) if session.final_result else 0,
        "subgoals": subgoals_data,
        "ollama_host": os.environ.get("OLLAMA_HOST", "http://localhost:11434"),
        "models_by_tier": {
            "simple": "qwen2.5:1.5b",
            "medium": "phi4-mini:latest",
            "complex": "hermes3:latest",
        },
    }
    RESULT_PATH.write_text(json.dumps(result, indent=2))
    log(f"wrote {RESULT_PATH}")

    transcript_lines = [
        "# Swarm Benchmark Transcript — 2026-05-30",
        "",
        f"**Goal:** {goal}",
        "",
        f"**Wall-clock:** {elapsed:.1f}s  ·  "
        f"**Status:** {session.status}  ·  "
        f"**Turns:** {session.turn}  ·  "
        f"**Sub-goals:** {len(session.subgoals)}",
        "",
        "## Sub-goals",
        "",
    ]
    for i, sg in enumerate(session.subgoals, 1):
        transcript_lines.append(f"### {i}. `{sg.id}` — tier={sg.assigned_tier} status={sg.status}")
        transcript_lines.append(f"**Description:** {sg.description}")
        transcript_lines.append("")
        transcript_lines.append("**Result:**")
        transcript_lines.append("")
        transcript_lines.append("```")
        transcript_lines.append(sg.result or "(no result)")
        transcript_lines.append("```")
        transcript_lines.append("")
    transcript_lines.append("## Final result")
    transcript_lines.append("")
    transcript_lines.append("```")
    transcript_lines.append(session.final_result or "(no final result)")
    transcript_lines.append("```")
    TRANSCRIPT_PATH.write_text("\n".join(transcript_lines))
    log(f"wrote {TRANSCRIPT_PATH}")

    orch.stop()
    log("orchestrator stopped — benchmark done")
    return 0


if __name__ == "__main__":
    sys.exit(main())
