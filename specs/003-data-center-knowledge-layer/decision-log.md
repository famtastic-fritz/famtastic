# Decision Log

## D1
Keep the raw capture box where it already exists: `captures/inbox/` and `captures/review/`. The Data Center ingests from those folders into source records and does not introduce a second inbox abstraction.

## D2
Use one JSON file per source/claim/decision record instead of a database. This preserves the repo's local/static-first rule and keeps proof inspectable in git-friendly artifacts.

## D3
Use a compact `sources/index.json` keyed by `source_id` for idempotent scans instead of diffing every record file on each run.
