# Spec: Wave 3 Data Center Knowledge Layer

## Goal
Add the first local ingestion and knowledge-linking layer on top of the existing Wave 1/2 Data Center foundation.

## Requirements
1. Preserve `captures/inbox/` and `captures/review/` as the raw capture box; do not create a duplicate message inbox.
2. Add local/static ingestion primitives under `lib/famtastic/data-center/` without breaking existing Wave 1/2 APIs.
3. Ingest raw capture files into Data Center source records with stable IDs, metadata, hashes, timestamps, excerpts, and provenance.
4. Source records must be written idempotently and must never move or delete raw capture files.
5. Add claim records linked to one or more `source_id` values with `confidence`, `status`, `tags`, and provenance.
6. Add decision records linked to sources, claims, and specs with rationale and status.
7. Add a local CLI ingestion path with `--dry-run` and `--json`.
8. Secret-like keys and token-like values must be redacted before persistence in source/claim/decision artifacts and ledgers.

## Acceptance Criteria
- `tests/data-center-tests.js` proves source ingestion, idempotency, redaction, and claim/decision linkage.
- `tests/data-center-ingest-tests.js` proves CLI argument handling and text rendering.
- `node scripts/data-center-ingest.js --dry-run --json` runs locally without mutating raw captures.
- Existing Wave 1/2 calls (`ensureDataCenter`, research jobs, witness records, capture listing) remain functional.
