# Agent Startup Contract

Date: 2026-05-21
Status: current

This file summarizes how Claude Code, Codex, Gemini, Cowork, and other agent surfaces should orient themselves before touching FAMtastic work.

## Current doctrine

1. Shay-Shay is broader ambient intelligence/orchestration; Site Studio, Media Studio, and Component Studio belong to the FAMtastic ecosystem and consume/produce platform intelligence.
2. Use research-first, spec-shaped, proof-driven development.
3. Treat every real multi-step plan as a resumable brief, not a loose conversation. Default human-facing shape is the scram-line brief: `Title`, `Purpose`, `Goal`, checkbox `Tasks`, `Status`, `Started`, `Ended`, `Execution`, `Research`, `Review`, `Skills`, optional `Blocked By`, and `Proof`. Rich orchestration detail belongs in telemetry, ledgers, reviews, and control-plane artifacts. If a task truly needs the heavier control-plane packet, restate it separately with goal (outcome, why it matters, success criteria, proof), explicit tasks, execution lane (feature branch name and worktree path when applicable), landing path to `main`, required truth-surface updates (especially capability matrix updates), and proof.
4. Plans should run to completion without intervention from Fritz unless they hit a real blocker, destructive side effect, missing credential, or irreversible decision Fritz must personally own.
5. Multi-swarm and parallel orchestrated swarms are allowed and preferred when dependencies permit and they are the most efficient path.
6. The task list must be updated as each task completes, blocks, or changes state so the plan can resume cleanly after interruption.
7. Existing capture boxes are raw intake. FAMtastic Data Center is the evidence/proof/claims/decisions layer.
8. Search/reuse before generating or rebuilding.
9. Route specialized needs to the owning system: Research/Data Center, Media Studio, Component Studio, Site Studio.
10. Every meaningful run/build/job needs post-evaluation and opportunity capture.
11. Every meaningful research pass must create a durable artifact, not just a chat answer or terminal trace. Separate observation from interpretation, preserve source trace, and record capability notes so future sessions can reuse the research.
12. Do not run noisy check-in unless Fritz explicitly says multi-agent coordination is active.
13. Preserve old plans as reference; do not let stale plans override the current Phase 2 plan.
14. Use explicit commits and explicit staging. Never `git add .` in this repo during consolidation.

Note: if branch/worktree are not needed for a packet, say that explicitly instead of omitting the fields.

## Phase 2 priority

Phase 2 is Visual Workflows & Brand Systems, in this order:

1. Media Studio through FAMtastic logo/brand creation.
2. Site Studio useful build/edit/enhance workflow.
3. Component Studio from real repeated site/media needs.
4. Mission Control visual orchestration.
5. Data Center / Research Center / Second Brain visual UI.
6. Shay Desk Office tab integration.

## Role guidance

- Discovery scouts: read-only, source-indexed, cite exact paths/commits, identify current/stale/conflicting material.
- Writer agents: one writer lane per touched area; tests/proof before closeout.
- Review agents: verify diffs, tests, docs/state, and known gaps.
- Visual/product agents: preserve Fritz's approved visual direction and avoid generic startup output.

## Required closeout

Before saying done:

- Run focused tests and `git diff --check`.
- Update `SITE-LEARNINGS.md`, `CHANGELOG.md`, and `FAMTASTIC-STATE.md` when structure/features changed.
- Run `node scripts/plans/audit.js` when applicable.
- Record post-eval/opportunities for meaningful work.
