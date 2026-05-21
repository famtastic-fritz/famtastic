# Proof

Commands run:

- npm test -- --run tests/research-router.test.js
  Result: PASS, 3 tests.

- node tests/data-center-tests.js
  Result: PASS.

- node scripts/research-job.js --vertical "research systems" --question "What metadata should an AI research pipeline preserve for source-grounded synthesis?" --perplexity --title "Perplexity metadata preservation proof"
  Result: ok=true, source=perplexity, citation_count=5, search_result_count=5, has_usage=true.

- node scripts/research-job.js --vertical "AI research swarms" --question "What structure should a bounded multi-agent research swarm use to synthesize cited reports efficiently?" --perplexity --title "Swarm worker A research synthesis structure"
  Result: ok=true, source=perplexity, citation_count=9, search_result_count=9, has_usage=true.

- node scripts/research-job.js --vertical "spec driven development" --question "How should research findings influence requirements specs and acceptance criteria before implementation?" --perplexity --title "Swarm worker B research shaped SDD"
  Result: ok=true, source=perplexity, citation_count=7, search_result_count=7, has_usage=true.

Artifacts:
- ~/famtastic/data-center/jobs/research-20260519225124-perplexity-metadata-preservation-proof/outputs/research-proof.json
- ~/famtastic/data-center/jobs/research-20260519225143-swarm-worker-a-research-synthesis-structure/outputs/research-proof.json
- ~/famtastic/data-center/jobs/research-20260519225150-swarm-worker-b-research-shaped-sdd/outputs/research-proof.json
