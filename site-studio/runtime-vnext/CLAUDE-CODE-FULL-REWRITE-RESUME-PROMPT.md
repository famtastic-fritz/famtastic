You are Claude Code working inside:
/Users/famtasticfritz/famtastic/site-studio

Primary implementation lane:
/Users/famtasticfritz/famtastic/site-studio

Mission
Pick up from where Kimi left off and execute the full Site Studio modular rewrite program toward a fully working runtime-vnext-based Site Studio.

Context
Kimi was blocked by provider quota limits. You are the replacement execution lane. Do not restart the thinking from zero. Resume the rewrite program from the current repo state and continue forward.

Source-of-truth files to read first
1. /Users/famtasticfritz/famtastic/site-studio/runtime-vnext/SITE-STUDIO-MODULAR-REWRITE-IMPLEMENTATION-BRIEF.md
2. /Users/famtasticfritz/famtastic/site-studio/runtime-vnext/SITE-STUDIO-MODULAR-REWRITE-BRIEF.md
3. /Users/famtasticfritz/famtastic/site-studio/runtime-vnext/KIMI-FULL-REWRITE-NO-CLAUDE-DEPENDENCY-PROMPT.md

Important architectural rule
Even though you are Claude Code, do NOT preserve Claude dependency as the primary architecture.
Your job is to help eliminate Claude-dependence from Site Studio’s primary build path.
Do NOT replace the old monolith with a new Claude-shaped monolith.
The end state must be provider-agnostic and modular.

Hard design constraints
- provider-agnostic runtime-vnext primary path
- deterministic backbone first
- contract-driven worker boundaries
- no new giant control blob
- component/media opportunities must not block whole build completion
- repo/bootstrap/config setup must remain first-class build output
- Netlify staging must remain supported
- explicit production deploy path must remain supported
- per-page SEO must remain supported
- Playwright browser QA must remain required
- proof artifacts must remain required
- Site-Studio-specific process/skill integration must remain possible

Mandatory milestones
A. Contract and validation freeze
B. Bootstrap/config/repo setup workers
C. Page/content/design build graph
D. Components/media/JS modularity with non-blocking fallback
E. SEO/QA/proof lane
F. Deploy preservation (Netlify staging + explicit prod routing)
G. Operator-path cutover to runtime-vnext
H. Legacy authority retirement / de-authorization

Execution contract
- Proceed milestone by milestone.
- Do not stop after Milestone A unless there is a real blocker.
- Create proof at each milestone boundary before moving on.
- Preserve real build capability, not just code motion.
- If existing repo state already covers part of a milestone, verify it and continue rather than redoing it blindly.

Critical reinterpretation
The rewrite should bias toward deterministic and provider-agnostic modules first:
- contract extraction first
- deterministic workers first
- provider boundary isolation early
- generative provider adapters late and optional
- legacy Claude-dependent paths reduced to quarantined compatibility surfaces until removable

Specific directives
1. Treat any code path assuming `spawnClaude()`, `spawnClaudeModel()`, `claude -p`, or Anthropic SDK as primary required path as legacy debt to isolate or retire.
2. Build success must remain possible when no Claude path is available.
3. If a generative stage is not yet replaced, the system must still:
   - scaffold repos/folders/config
   - produce manifests/contracts
   - assemble build lanes
   - support placeholders/fallbacks
   - run QA/proof/deploy where structurally valid
4. Missing ideal components or media must not stop the whole build unless structurally mandatory.
5. Do not build a new 20K replacement file under another name.

Preferred work order
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
Do NOT say done unless all of the following are true:
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
- missing credentials/secrets truly required for the next milestone
- irreversible deploy/routing choice not specified by the brief
- inability to proceed without violating the provider-agnostic rewrite goal

Required final report shape
Return only:
1. milestones completed
2. what now works
3. exact files changed
4. exact tests/proof run
5. exact report paths
6. exact commit SHA(s)
7. what legacy authority remains, if any

Important truth rule
Do not downgrade this into another foundation-only slice unless a real blocker forces it.
The goal is a fully working rewritten Site Studio program, executed milestone by milestone, resuming from current repo state and pushing toward a provider-agnostic primary path.