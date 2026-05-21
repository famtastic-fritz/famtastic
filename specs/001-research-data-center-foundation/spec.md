# Spec: Research Data Center Foundation

## Goal
Create the first working slice of FAMtastic's research-first, spec-shaped, proof-driven system.

## Requirements
1. The Site Studio research router must support skipCache and forceSource without referencing undefined cache state.
2. Perplexity results must preserve citations, search_results, usage, and cost metadata when present.
3. The Data Center must exist at ~/famtastic/data-center with stable folders for jobs, sources, ledgers, claims, citations, decisions, artifacts, graphs, reports, schemas, cache, and exports.
4. Each research job must get a sandbox with uploads, workspace, outputs, sources, events.jsonl, and report.md.
5. Data Center ledger writes must redact secret-like keys and token-like values.
6. Existing capture inbox must remain the raw intake layer.
7. A bounded research swarm proof must run with 2-3 workers and produce cited artifacts.
8. A spec folder must show capture -> research -> sources -> claims -> spec -> plan -> tasks -> proof -> decisions -> learn.

## Acceptance Criteria
- Focused router tests fail before the fix and pass after the fix.
- Data Center tests fail before the module exists and pass after implementation.
- A live Perplexity research job writes proof JSON with citation/search result counts and usage metadata.
- No API key appears in generated reports, docs, ledgers, or test output.
- SITE-LEARNINGS and CHANGELOG are updated before closeout.
