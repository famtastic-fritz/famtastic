# Agent Startup Contract

Date: 2026-05-21
Status: current

This file summarizes how Claude Code, Codex, Gemini, Cowork, and other agent surfaces should orient themselves before touching FAMtastic work.

## Current doctrine

1. Shay-Shay is broader ambient intelligence/orchestration; Site Studio, Media Studio, and Component Studio belong to the FAMtastic ecosystem and consume/produce platform intelligence.
2. Use research-first, spec-shaped, proof-driven development.
3. Existing capture boxes are raw intake. FAMtastic Data Center is the evidence/proof/claims/decisions layer.
4. Search/reuse before generating or rebuilding.
5. Route specialized needs to the owning system: Research/Data Center, Media Studio, Component Studio, Site Studio.
6. Every meaningful run/build/job needs post-evaluation and opportunity capture.
7. Do not run noisy check-in unless Fritz explicitly says multi-agent coordination is active.
8. Preserve old plans as reference; do not let stale plans override the current Phase 2 plan.
9. Use explicit commits and explicit staging. Never `git add .` in this repo during consolidation.

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
