# Claims: Wave 4 Mission Control Observability

## Claim 1
Mission Control is a reader/projection over Data Center, not a second knowledge store.

Evidence:
- `lib/famtastic/mission-control/index.js` reads `data-center/jobs`, `data-center/witness`, `data-center/claims`, `data-center/decisions`, and `data-center/ledgers`.
- It does not write a Mission Control database or move raw captures.

## Claim 2
The local CLI can answer the target status questions in JSON and human form.

Evidence:
- `scripts/mission-control-report.js --json` emits snapshot JSON.
- `scripts/mission-control-report.js` emits human counts and bounded details.
- `tests/mission-control-tests.js` covers jobs, witness checks, claims, decisions, needs-Fritz events, stale/blocked items, proofs, and raw capture counts.
