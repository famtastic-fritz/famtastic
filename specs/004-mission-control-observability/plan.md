# Plan: Wave 4 Mission Control Observability

## Bounded Slice

1. Inspect Wave 1-3 Data Center/witness/source/claim/decision structures.
2. Write a focused failing test for a temp Data Center fixture.
3. Implement a pure reader library under `lib/famtastic/mission-control/`.
4. Implement a CLI report script with `--json` and human output.
5. Run focused tests and `git diff --check`.
6. Write proof/status/doc closeout.

## Out of Scope

- No new DB.
- No Desktop UI panels yet.
- No automatic remediation.
- No raw capture movement/deletion.
- No provider-key or external research calls.

## Design Notes

`buildMissionControlSnapshot()` reads Data Center structures and returns a single JSON object suitable for terminal reports now and future Desktop panels later. Staleness defaults to 48 hours and is caller-configurable. Jobs and witness checks are sorted by latest timestamp descending so reports are stable.
