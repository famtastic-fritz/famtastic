# Parity Report: single-page-build

- **Old runtime case:** `runtime-vnext/harness/cases/old/single-page-build`
- **vNext runtime case:** `runtime-vnext/harness/cases/vnext/single-page-build`
- **Generated at:** 2026-07-22T19:29:06.680Z

## Old Runtime Health
- Status: ⚠️ Baseline is not healthy
- Reason: zero output files captured
- **Impact:** File-by-file parity cannot be measured against this baseline.

## Output File Comparison
| Metric | Value |
|--------|-------|
| Old files after | 0 |
| vNext files after | 1 |
| Matching files | 0 |
| Added files | 1 |
| Removed files | 0 |
| Changed files | 0 |
| Parity score | 0.0% |

### Added files (vNext only)
- `index.html`

## Event / Trace Comparison
| Metric | Old | vNext |
|--------|-----|-------|
| WebSocket events | 4 | 9 |
| Trace records | 0 | 0 |
| Mutation records | 0 | 0 |

### Event types
- Old only: status
- vNext only: run:running, stage:running, stage:succeeded, run:committed, run:published
- Shared: (none)

## Interpretation
The old-runtime baseline did not produce output files. In this situation the parity score is expected to be 0% because there are no old files to match. The vNext deterministic slice produced output independently and should be evaluated on its own consumer-contract tests rather than file parity.

