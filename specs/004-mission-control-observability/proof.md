# Proof: Wave 4 Mission Control Observability

## Target Commands

- `node tests/mission-control-tests.js`
- `node scripts/mission-control-report.js --json`
- `node scripts/mission-control-report.js`
- `git diff --check`

## Expected Evidence

- The test fixture proves the reader reports research jobs, witness checks, claims, decisions, needs-Fritz events, stale/blocked records, proof artifacts, and raw capture inbox counts without moving raw captures.
- The JSON report is parseable and includes the top-level Mission Control snapshot fields.
- Human output includes bounded status/proof sections.
- Diff whitespace check passes.
