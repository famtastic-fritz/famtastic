# Sources: Wave 4 Mission Control Observability

- `lib/famtastic/data-center/index.js` — canonical Data Center reader/writer primitives from Waves 1-3.
- `data-center/jobs/*/job.json` — research/data job records.
- `data-center/witness/*.jsonl` — append-only capability witness records.
- `data-center/claims/*.json` — claim records.
- `data-center/decisions/*.json` — decision records.
- `data-center/ledgers/*.jsonl` — events and proof-style ledger rows.
- `captures/inbox/` — raw capture inbox, sampled only.
- `proofs/proof-ledger.jsonl` and Data Center job `outputs/` — existing proof/artifact surfaces.
