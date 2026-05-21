# Plan

1. Run read-only scouts over existing media plans, external media stack, and ledger/proof needs.
2. Add failing test for Media Studio alias resolution, dry-run planning, job/proof creation, asset ledger, and Mission Control visibility.
3. Implement minimal model alias registry and Media Studio library.
4. Add CLI dry-run planner.
5. Run one live zero-spend proof job into Data Center.
6. Update docs/state and Wave 5 report.

## Verification

- `node tests/media-studio-wrapper-tests.js`
- `node tests/mission-control-tests.js`
- `node tests/data-center-tests.js`
- `git diff --check`
