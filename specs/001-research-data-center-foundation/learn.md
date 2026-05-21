# Learn

Implementation learning:
- Perplexity currently returns cost metadata nested at usage.cost in the tested API response. Data Center proof should treat usage.cost as cost if top-level cost is absent.
- The old router bug was exactly the expected cached-scope issue and is now covered by regression tests.
- The shared research service still proxies Site Studio internals; moving implementation into lib/famtastic/research remains future work.
- The first useful Mission Control slice should read Data Center jobs/ledgers and show source/citation/usage/proof status.
