# Spec: Wave 4 Mission Control Observability

## Goal
Ship the first useful local Mission Control reader: a deterministic status/proof projection over the existing Data Center, witness records, source/claim/decision records, raw capture inbox counts, and proof artifacts.

## Non-negotiables
1. Data Center remains canonical. Mission Control must not create a second knowledge store.
2. Mission Control is read/projection/report code only; it must not move, delete, or promote raw capture files.
3. The first slice is local and bounded: library + CLI report, not a full cockpit UI.
4. Secret hygiene must be preserved by reading existing sanitized Data Center records and not printing provider keys.
5. Output must be deterministic enough for tests and future Desktop/Mission Control panels.

## Requirements
1. Add `lib/famtastic/mission-control/index.js` with `buildMissionControlSnapshot(options)`.
2. Snapshot must answer:
   - what research/data jobs exist;
   - what witness/capability checks exist and whether the latest row passes;
   - what claims and decisions exist;
   - what needs Fritz;
   - what is stale or blocked;
   - what proof artifacts are available.
3. Add `scripts/mission-control-report.js` with human output and `--json`.
4. Preserve raw capture inbox as raw intake and only count/sample it.
5. Include focused tests for reader/report behavior using a temp Data Center fixture.
6. Include proof and closeout notes under `shay-shay/observations/`.

## Acceptance Criteria
- `node tests/mission-control-tests.js` passes.
- `node scripts/mission-control-report.js --json` returns parseable JSON with `summary`, `research_jobs`, `witness_checks`, `claims`, `decisions`, `needs_fritz`, `stale_or_blocked`, `proofs`, and `raw_capture_inbox` fields.
- Human output includes top-level Mission Control counts and bounded detail sections.
- `git diff --check` passes for Wave 4 changes.
- Docs update `SITE-LEARNINGS.md`, `CHANGELOG.md`, and regenerated `FAMTASTIC-STATE.md` entries.
