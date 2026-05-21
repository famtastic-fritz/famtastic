# Research

Evidence collected through the fixed research router and Data Center job runner.

Jobs:
- research-20260519225124-perplexity-metadata-preservation-proof
- research-20260519225143-swarm-worker-a-research-synthesis-structure
- research-20260519225150-swarm-worker-b-research-shaped-sdd

Findings:
1. Source-grounded synthesis needs provenance, retrieval/extraction context, citations, search results, usage/cost metadata, and synthesis traceability.
2. Bounded research swarms should use a hybrid lead-orchestrator + specialist workers + verifier/editor structure, not uncontrolled flat swarms.
3. Research should be translated into explicit requirements, constraints, success signals, and acceptance criteria before implementation.
4. Specs should constrain AI agents and make outputs testable; tests/proofs and specs should evolve together.

Cost note:
- Perplexity returned usage.cost nested under usage for these jobs. The top-level cost field was null, so implementation should read both meta.cost and meta.usage.cost.
