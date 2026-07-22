# M2 Decision: Adopt vs Build Durable Orchestration

**Date:** 2026-07-22
**Owner:** M2 — Adopt-vs-build durable orchestration decision
**Status:** DECIDED

## Decision
**Build a narrow local runner backed by SQLite.**

Do not adopt Temporal, Inngest, BullMQ, or DBOS as the primary execution substrate. Use the existing `better-sqlite3` dependency for the authoritative run-state store and implement a small, purpose-built runner that supports exactly what Site Studio needs.

## Evaluation Criteria

| Criterion | Weight | Build SQLite Runner | BullMQ | Inngest | Temporal | DBOS |
|-----------|--------|---------------------|--------|---------|----------|------|
| Resumability | High | Good (persist stage state to SQLite) | Good | Excellent | Excellent | Excellent |
| Retries | High | Manual, simple | Built-in | Built-in | Built-in | Built-in |
| Cancellation | High | AbortController + child-process kill | Good | Built-in | Built-in | Supported |
| Graph / fanout | High | Implement topological sort + foreach | Must build on top | Good | Excellent | Must build on top |
| Migration cost | High | Lowest (no new infra) | Medium (add Redis) | Medium (external service) | High (Temporal server) | Medium (Postgres) |
| Ops cost | High | Lowest | Medium | Medium-High | High | Medium |
| Fit with Site Studio | High | Highest (single-node, dev-first, existing SQLite) | Medium | Medium | Low | Medium |

## Option Details

### 1. Build Narrow SQLite Runner (Selected)
- **What it is:** A small Node.js module that persists `RunRecord`, `StageAttempt`, and resolved-graph snapshots to SQLite and executes stages in process.
- **Pros:**
  - No new infrastructure.
  - Matches current `better-sqlite3` usage in `lib/db.js`.
  - Single-node dev server remains simple.
  - Full control over transaction boundaries and recovery semantics.
  - Easy to integrate incrementally alongside the old monolith.
- **Cons:**
  - Must implement graph execution, retries, and cancellation ourselves.
  - Not horizontally scalable (not required for Site Studio).
- **Mitigations:**
  - Keep the runner narrow: only support the recipe DSL defined in M9.
  - Reuse existing `AbortController` and child-process patterns from `server.js`.
  - Use SQLite transactions for atomic state updates.

### 2. BullMQ
- **Verdict:** Rejected.
- **Reason:** BullMQ is a job queue, not a workflow engine. Graph/fanout and resumable stage state would still need custom code. Adding Redis is a heavy ops cost for a dev tool.

### 3. Inngest
- **Verdict:** Rejected.
- **Reason:** Good workflow features, but adds an external service dependency and is optimized for cloud/event-driven architectures. Site Studio is a local dev server; the fit is poor.

### 4. Temporal
- **Verdict:** Rejected.
- **Reason:** Overkill for Site Studio. Requires a Temporal server (or cloud account), significant ops overhead, and a large mental model shift. The migration cost exceeds the value.

### 5. DBOS
- **Verdict:** Rejected.
- **Reason:** Interesting durable-workflow approach, but requires Postgres (new dependency) and is less mature. The SQLite runner gives similar local durability without adding Postgres.

## What "Narrow" Means
The runner will NOT be a general-purpose workflow engine. It supports exactly:
1. A resolved stage graph from the M9 recipe DSL.
2. In-process sequential/parallel stage execution.
3. `foreach` fanout into bounded stage attempts.
4. Per-stage retries with configurable owner.
5. Cancellation via `AbortSignal`.
6. Crash recovery by scanning SQLite for incomplete runs on startup.
7. Idempotent publish step.

## Open Questions Resolved
1. **What is the durable workflow substrate?** → Narrow SQLite-backed local runner.
2. **Does this affect the state-authority contract?** → Yes. SQLite is the recommended authoritative store (to be finalized in M6).
3. **Does this block horizontal scaling?** → No. Site Studio is intentionally single-node; if scaling becomes a requirement later, the contract boundaries make migration possible.

## Anti-Goals
- Do not build a generic workflow engine.
- Do not add Redis, Postgres, Temporal server, or external orchestration services.
- Do not let the runner depend on mutable global `TAG`.

## Next Steps
- M6 will finalize the SQLite schema and transaction boundary.
- M10 will implement the first executable slice against this runner.
