# Research: Wave 4 Mission Control Observability

This wave did not require external research calls. It inspected the local Wave 1-3 Data Center, witness, autopilot, source, claim, decision, proof, and capture structures and implemented a bounded local projection over them.

Key local findings:
- Data Center already provisions `jobs`, `ledgers`, `witness`, `sources`, `claims`, `decisions`, `reports`, and `exports`.
- Witness checks are append-only JSONL by capability, so Mission Control should read only the latest row for status while preserving history.
- Existing proof surfaces are split between Data Center job outputs, Data Center ledgers, and older root proof ledgers; this wave indexes Data Center job outputs and proof-like Data Center ledger rows first.
