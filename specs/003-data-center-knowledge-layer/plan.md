# Plan

1. Extend `lib/famtastic/data-center/index.js` in place so existing imports continue to work.
2. Model source records as one JSON file per `source_id` plus a compact `sources/index.json` for idempotent scans.
3. Keep claims and decisions as separate append-safe JSON artifacts under `claims/` and `decisions/`.
4. Add `scripts/data-center-ingest.js` as the bounded local runner.
5. Prove the slice with temp-dir tests and a dry-run CLI execution.
