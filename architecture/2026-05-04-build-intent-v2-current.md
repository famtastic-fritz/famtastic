# BuildIntent V2 Current Declaration

**Date:** 2026-05-04  
**Parent plan:** `build-intent-fulfillment-trace`  
**Status:** Current direction declared. Implementation remains phased.

## Decision

`architecture/2026-04-24-canonical-build-intent-v2.md` is the current
BuildIntent architecture. `architecture/2026-04-24-canonical-build-intent.md`
is retained as a historical artifact and should not drive new work.

This declaration is intentionally narrow. It does not claim the V2 interpreter
is implemented. It closes the ambiguity where V1 and V2 both appeared active.

## Why V2 Wins

- The interpreter owns only intent extraction, not downstream design defaults.
- `build_mode` is caller-owned, so Studio Chat can review while autonomous
  build can run without conflating completeness with approval.
- Semantic fallback stays inside the interpreter; pattern fallback is reserved
  for total API or parse failure.
- Existing specs are not retrofitted until V2 survives real traffic.
- Test baselines are per-suite, not reduced to one misleading aggregate.

## Evidence Attached

| Evidence | Role |
|---|---|
| `architecture/2026-04-24-canonical-build-intent-v2.md` | Current canonical direction. |
| `architecture/2026-04-24-canonical-build-intent.md` | Superseded V1 reference. |
| `architecture/2026-04-25-baseline-closure-review.md` | Baseline issues to link as evidence, not independent active plan. |
| `architecture/2026-04-25-baseline-closure-verification.md` | Closure proof / verification residue. |
| `architecture/2026-04-24-gap123-live-verification.md` | Gap 1/2/3 evidence. |
| `architecture/2026-04-24-gap4-plan.md` | Gap 4 plan/evidence. |
| `docs/build-orchestration-trace-plan.md` | Fulfillment trace and workflow-as-data parent context. |

## Active Follow-Up

The next active work is not another BuildIntent design document. It is:

1. Instrument `parallelBuild()` before refactor.
2. Start workflow-as-data phase 1 by declaring stage names, boundaries,
   inputs, outputs, and proof events without changing execution order.
3. Wire V2 only through phased implementation with per-suite baselines.

