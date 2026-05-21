# Plan

1. Add focused tests for research-router skipCache, forceSource, and Perplexity metadata preservation.
2. Fix cached variable scope and return result.meta from queryResearch.
3. Update Perplexity adapter to read PERPLEXITY_API_KEY or PPLX_API_KEY and preserve metadata.
4. Add Data Center filesystem substrate and tests.
5. Add research job runner that loads ~/.shay/.env, calls shared research service, and writes sanitized proof artifacts.
6. Run one metadata proof job and two bounded swarm worker jobs.
7. Create this research-shaped spec folder from the evidence.
8. Update docs and run verification.
