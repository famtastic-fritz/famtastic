# Proof

## Target Commands

- `node tests/data-center-tests.js`
- `node tests/data-center-ingest-tests.js`
- `node scripts/data-center-ingest.js --dry-run --json`
- `git diff --check`
- `node scripts/plans/audit.js`

## Expected Evidence

- Source records are written under `data-center/sources/` and indexed in `data-center/sources/index.json`.
- Re-running ingestion without source changes reports `unchanged` records instead of duplicating writes.
- Claim and decision records retain explicit links to `source_id`, `claim_id`, and spec references.
- Redaction applies to token-like strings and secret-bearing keys before persistence.
