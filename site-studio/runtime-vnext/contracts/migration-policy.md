# Contract: Migration Policy

**Owner milestones:** M12 (shadow/strangler), M14 (incremental extraction)
**Status:** DRAFT
**Freeze target:** After M12 captain review

## Purpose
Define how the vNext runtime replaces the existing monolith without breaking the active production path.

## Shadow / Strangler Slice
1. Run the new runtime **beside** the old path.
2. Old path remains the production authority.
3. New runtime writes to a separate workspace and separate output directory.
4. Differential replay compares old and new outputs.

## Rollback Mechanics
- Rollback trigger: parity check fails, new runtime crashes, or operator invokes rollback.
- Rollback window: keep old path untouched until parity is proven and recovery drills pass.
- Rollback action: switch consumer routing back to old path; new workspace is archived, not deleted.

## Data Migration
- Old `.studio.json`, `mutations.jsonl`, and build traces remain read-only archives.
- New runtime reads old specs via a read-only adapter but writes new `RunRecord`s to the authority.
- No in-place migration of old trace records; they are queryable projections only.

## Incremental Extraction Order
1. Template generation
2. Page fanout
3. Post-processing
4. Verification
5. Repair
6. Finalization

Each extracted slice must pass the characterization harness before the next slice is extracted.

## Claude Kill Path
Remove `spawnClaude` and direct Claude subprocess paths only after:
- Measured parity on all characterization scenarios.
- Rollback drills pass.
- Recovery drills pass.
- UI consumer compatibility verified.
- Trace/proof compatibility verified.

## Open Questions (to resolve in M12/M14)
1. How is consumer routing switched between old and new paths?
2. What is the exact parity threshold (e.g., 100% file diff match, 99% semantic match)?
3. How long is the shadow observation period?

## Anti-Goals
- Do not delete old code before parity is proven.
- Do not mutate old records during migration.
