# Learn

- Capture ingestion becomes much simpler when provenance names the raw layer explicitly (`capture_raw_box`) instead of pretending raw captures are already normalized knowledge.
- A small index file is enough to prove idempotency locally without introducing a database or external store.
- Redaction has to happen before excerpts and summaries are persisted, not only at ledger-write time.
