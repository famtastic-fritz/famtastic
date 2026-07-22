You are Kimi Code working inside:
/Users/famtasticfritz/famtastic/site-studio

Primary implementation lane:
/Users/famtasticfritz/famtastic/site-studio

Mission
Execute the full Site Studio modular rewrite program toward a fully working runtime-vnext-based Site Studio, but DO NOT depend on Claude API, `claude -p`, `spawnClaude`, or any Anthropic-paid path for implementation success.

Hard constraint
The current goal is blocked by provider quota failure. Therefore, from this point forward, you must treat every Claude-dependent path as unavailable unless you are explicitly replacing/removing it.

That means:
- do NOT use `claude -p`
- do NOT rely on `spawnClaude()` as an implementation crutch
- do NOT assume Anthropic API keys or paid Claude quota exist
- do NOT pause waiting for Claude quota recovery

Allowed execution methods
1. Deterministic implementation by editing code directly.
2. runtime-vnext worker/module implementation using local code + tests.
3. Existing non-Claude providers already present in the repo/runtime, if needed, but only as optional provider adapters — not as the required backbone.
4. Kimi itself may author code, contracts, tests, and migration steps directly without external model calls.

Architectural rule
Do NOT replace a Claude-shaped monolith with a different provider-shaped monolith.
The win condition is a provider-agnostic modular runtime where generative stages are optional/adaptable and the deterministic build backbone does not require Claude.

Source of truth brief
Read and execute against:
/Users/famtasticfritz/famtastic/site-studio/runtime-vnext/SITE-STUDIO-MODULAR-REWRITE-IMPLEMENTATION-BRIEF.md

Execution contract
Run the full rewrite as a milestone-driven completion program, not as a single ungated blast.
You may proceed autonomously milestone by milestone, but you must create proof at each milestone boundary before moving on.
Do not stop after Milestone A unless you hit a real blocker.
Do not ask for opinions except when a decision changes production authority, destructive scope, or irreversible deploy behavior.

Mandatory milestones
A. Contract and validation freeze
B. Bootstrap/config/repo setup workers
C. Page/content/design build graph
D. Components/media/JS modularity with non-blocking fallback
E. SEO/QA/proof lane
F. Deploy preservation (Netlify staging + explicit prod routing)
G. Operator-path cutover to runtime-vnext
H. Legacy authority retirement / de-authorization

Critical reinterpretation for this run
Because Claude quota is unavailable, you must bias the rewrite toward deterministic and provider-agnostic modules first.
That means:
- contract extraction first
- deterministic workers first
- provider boundary isolation early
- generative provider adapters late and optional
- legacy Claude paths reduced to quarantined compatibility surfaces until removable

Specific implementation directives
1. Any code path in legacy Site Studio that currently assumes:
   - `spawnClaude()`
   - `spawnClaudeModel()`
   - `claude -p`
   - Anthropic SDK as the primary required path
   must be treated as legacy debt to isolate, route around, or retire.

2. Build success must remain possible when NO Claude path is available.

3. If a generative stage is not yet replaced, the system must still:
   - scaffold repos/folders/config
   - produce manifests/contracts
   - assemble build lanes
   - support placeholders/fallbacks
   - run QA/proof/deploy where structurally valid

4. Missing ideal components or media must not stop the whole build unless the missing item is structurally mandatory.

5. Preserve these real Site Studio responsibilities:
   - local repo/folder/config setup
   - Netlify staging deploy
   - explicit production deploy path
   - page SEO
   - Playwright browser QA
   - proof artifacts
   - Site-Studio-specific process/skill integration (example: SSL setup)

6. No new giant control blob.
   - do not build a new 20K equivalent under another name
   - keep modules narrow and contract-driven

Provider-routing rule
If you need an AI/provider abstraction in code, implement provider-neutral interfaces/contracts.
Do not make Kimi-specific or Claude-specific hard assumptions the new core architecture.
The core runtime must work with:
- deterministic-only stages
- optional provider-backed stages
- future provider substitution without architecture rewrite

Preferred order of work
1. Freeze BuildRequest + downstream artifact schemas.
2. Implement contract-validator and stage boundary enforcement.
3. Implement repo-bootstrap/config workers.
4. Implement architecture/sitemap/page-manifest workers.
5. Implement page build + shared assets + assembly workers.
6. Implement SEO/QA/proof workers.
7. Implement deploy preservation workers.
8. Move operator path to vNext.
9. De-authorize legacy Claude-dependent paths.

Proof requirements per milestone
For each milestone, produce:
- exact files changed
- exact tests run
- exact proof artifact/report path
- exact remaining blocker, if any
- exact commit SHA for milestone checkpoint if a clean scoped commit is warranted

Final success definition
Do NOT say "done" unless all of the following are true:
- Site Studio primary path no longer requires Claude quota or `claude -p`
- runtime-vnext is the primary working build backbone for supported slices
- single-page and multi-page builds work through the modular path
- repo/bootstrap/config scaffolding remains part of build success
- component/media opportunity handling is present and non-blocking
- SEO exists and is verified
- Netlify staging deploy remains working
- production deploy path remains explicit
- Playwright QA and proof artifacts exist
- legacy giant-file authority is removed or reduced to a thin compatibility shell

Stop conditions
Only stop early for:
- destructive production decision requiring owner authority
- missing credentials/secrets that are truly required for the next milestone
- irreversible deploy/routing choice not specified by the brief
- inability to proceed without violating the no-Claude-dependency rule

If blocked
Return only:
- milestone reached
- exact blocker
- exact file(s)/path(s) involved
- smallest next action needed from Fritz

If successful
Return only:
1. milestones completed
2. what now works
3. exact files changed
4. exact tests/proof run
5. exact report paths
6. exact commit SHA(s)
7. what legacy authority remains, if any

Important truth rule
Do not downgrade this into another bounded foundation-only slice unless a real blocker forces it.
The goal is a fully working rewritten Site Studio program, executed milestone by milestone, without Claude dependency in the primary path.