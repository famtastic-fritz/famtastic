---
title: build-coordinator-design-2026-06-01
type: note
permalink: shay-memory/research/build-coordinator-design-2026-06-01
tags: [run-model, coordinator, worktree, concurrency]
---

# Build Coordinator — safe concurrent multi-build (Fritz, 2026-06-01)

> The layer ABOVE the orchestrators. The run-router picks HOW one build runs (ralph/swarm +
> executor). The coordinator governs HOW MULTIPLE concurrent builds COEXIST. Fixes the
> 12:00-swarm / 12:30-ralph / 12:35-swarm collision scenario.

## Problem it solves
Today multiple builds overlap with NO cross-run lock → if they touch the same files they
clobber each other, and they all contend for the worker cap + credits. Collision-safety is
only enforced WITHIN one run, not ACROSS runs.

## Responsibilities
1. **Active-build registry** — each build = {id, orchestrator, repo, file_set (declared or
   inferred from the task/prd), worktree_path, status, started_at}. Persisted (survives restart).
2. **Worktree isolation** — on admit, `git worktree add` a fresh worktree of the build's repo;
   the build runs THERE, never the live tree. (The deferred auto-worktree rule, realized.)
3. **Overlap-aware admission**:
   - new build's file_set DISJOINT from all active → **admit in parallel**.
   - OVERLAP with an active build → **queue** (serialize) behind it.
   - unknown file_set → conservative: treat as overlapping its repo (serialize per-repo) until
     better inference exists.
4. **Reconciliation watcher** — on build GREEN (all gates pass): merge its worktree back to the
   live repo; on merge conflict, re-gate / escalate. On build fail: discard the worktree (clean,
   no live impact). Remove the worktree either way.
5. **Budget sharing** — a global cap on total concurrent workers across all builds; fair-share
   so one build can't starve the others; respects provider rate limits + the cost/low-funds signal.

## Integration
- Reads `run-policy.yaml` (the run-model source-of-truth).
- Wraps orchestrator start: ralph/swarm/cron call `coordinator.admit(build)` → get a worktree +
  go / or queued. On finish → `coordinator.reconcile(build)`.
- Collision rule becomes ENFORCED (not advisory) across runs.

## Surface
- `shay builds-active` / `shay coordinator status` — active builds, the queue, their worktrees,
  file-sets, and budget usage. So Fritz can SEE concurrency at a glance.
- Vault mirror of the live coordinator state for browsing.

## Buildable now vs later
- Now: registry + per-repo serialization + worktree add/merge + the CLI (works even with coarse
  repo-level file-sets).
- Later: fine-grained file-set inference (so same-repo disjoint builds parallelize) — pairs with
  the anti-drift trace graph.
- Advisory-first acceptable, but the WORKTREE isolation should be real from day one (that's the
  actual safety).
