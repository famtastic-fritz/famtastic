Title: Site Studio modular rewrite implementation
Purpose: Replace the legacy Site Studio monolith with a provider-agnostic, workerized runtime that preserves the full real-world build lifecycle: repo/bootstrap/config setup, page and asset generation, component/media opportunity routing, QA, staging deploy, production deploy pathing, SEO, proof, and Site-Studio-specific operational skills.
Goal: Implement a runtime-vnext-based Site Studio architecture where structured contracts drive modular workers, page builds can swarm in parallel, component/media gaps degrade gracefully instead of stopping builds, Netlify staging and production deploy routing remain intact, page SEO is first-class, and legacy Claude subprocess / giant-file authority is removed from the primary path.
Tasks:
- [ ] Freeze canonical build contracts and artifact schemas.
- [ ] Implement bootstrap/config/repo setup workers as first-class build responsibilities.
- [ ] Implement architecture, sitemap, and page-manifest planning workers.
- [ ] Implement content, design-token, component, media, and JS behavior worker families.
- [ ] Implement page build swarms and final assembly worker.
- [ ] Implement SEO, structural QA, content QA, browser QA, and proof workers.
- [ ] Preserve Netlify staging deploy and explicit production deploy routing.
- [ ] Capture Site-Studio-specific skills/processes as runtime-addressable capabilities.
- [ ] Cut operator path over to runtime-vnext.
- [ ] Remove legacy primary authority from server.js / spawnClaude / claude -p build orchestration.
Status: Drafted
Started: 2026-07-22
Ended:
Execution: Multi-swarm parallel orchestration after contract freeze. Dependency-first fanout: contracts -> bootstrap/planning -> page/content/design/component/media lanes -> SEO/QA/deploy lanes -> operator-path cutover -> legacy authority removal.
Research: Grounded in read-only audit of /Users/famtasticfritz/famtastic/site-studio runtime-vnext and legacy server.js, plus reverse-engineering of site-mbsh-reunion, site-famtastic-designs, and app-famtastic-by-the-numbers.
Review: Mandatory adversarial review before implementation swarm. Require second-pass review on contracts, deploy authority boundaries, and legacy cutover plan.
Skills:
- site-studio-build-request-normalizer
- site-studio-architecture-decider
- site-studio-sitemap-planner
- site-studio-repo-bootstrap
- site-studio-config-scaffold
- site-studio-page-copy-author
- site-studio-design-token-packager
- site-studio-component-selector
- site-studio-custom-component-builder
- site-studio-media-planner
- site-studio-media-generation
- site-studio-page-builder
- site-studio-js-behavior-writer
- site-studio-seo-packager
- site-studio-browser-qa
- site-studio-netlify-staging-deploy
- site-studio-prod-deploy-router
- site-studio-ssl-certificate-setup
- site-studio-proof-curator
- site-studio-gap-logger
Proof:
- Canonical BuildRequest and downstream artifact schemas frozen and exercised.
- Single-page and multi-page builds run through the same modular graph.
- Repo/bootstrap/config scaffolding is preserved as a first-class build outcome.
- Component/media opportunities are handled without stalling whole builds.
- Per-page SEO artifacts are emitted and verified.
- Netlify staging deploy works through vNext.
- Production deploy path is explicit and configurable.
- Site-Studio-specific skills are integrated into runtime operations.
- Playwright browser QA is mandatory and proof-backed.
- No primary build path depends on claude -p / spawnClaude.
- Legacy giant-file authority is removed or reduced to a thin compatibility shell.

Blocked By:
- Contract freeze not yet implemented.
- Existing Site Studio operator surfaces still carry legacy authority in server.js.
- Site-Studio-specific skills may exist in scattered form and need inventory/consolidation before runtime wiring.

1. Contract freeze

1.1 BuildRequest schema
- Freeze BuildRequest as the canonical input for all Site Studio builds.
- Required fields:
  - project_id, run_id, site_tag, product_type, deployment_mode, architecture_preference
  - business, positioning, brand, content_inputs, architecture_constraints
  - assets_available, component_opportunities, media_opportunities
  - seo_inputs, deploy, authority
- Deliverables:
  - runtime-vnext/contracts/build-request.schema.json
  - runtime-vnext/contracts/build-request.md
  - tests/runtime-vnext/build-request-contract.test.js

1.2 Downstream artifact schemas
- Freeze structured outputs for:
  - ArchitectureDecision
  - SiteManifest
  - PageManifest
  - ContentPacket
  - DesignTokenPack
  - ComponentPlan
  - MediaPlan
  - JsBehaviorPlan
  - SeoPack
  - BuildAssemblyManifest
  - QaReport
  - DeployReport
  - ProofReport
- Deliverables:
  - one schema file per artifact under runtime-vnext/contracts/
  - contract tests for validation and compatibility

1.3 Stage boundary validation
- Enforce validation at every module handoff.
- Failure mode must be explicit contract failure, not silent drift.
- Deliverables:
  - runtime-vnext/lib/contract-validator.js
  - tests covering valid/invalid stage outputs

2. Bootstrap and configuration lane

2.1 Repo bootstrap worker
- Implement repo-bootstrap-worker.
- Responsibilities:
  - create project folder structure
  - initialize repo/workspace targets
  - scaffold stack-specific folders
  - set up output/work/run directories
- Must run even if page/media generation is incomplete.
- Deliverables:
  - runtime-vnext/families/repo-bootstrap-runner.js
  - bootstrap recipe fixture + tests

2.2 Config scaffold worker
- Implement config-scaffold-worker.
- Responsibilities:
  - create env templates
  - create framework/app config stubs
  - create lint/build/test config stubs
  - create deploy config placeholders
- Deliverables:
  - runtime-vnext/families/config-scaffold-runner.js
  - tests for stack-specific scaffolding behavior

2.3 Safety rules
- Config/bootstrap must never overwrite unrelated existing deploy paths without explicit authority.
- Must emit report of what was created, reused, or skipped.

3. Planning lane

3.1 Architecture decider worker
- Implement architecture-decider.
- Responsibilities:
  - decide single-page vs multi-page vs hybrid vs app-like
  - respect known rejected patterns from input constraints/history
  - define route model and page-count expectations
- Deliverables:
  - runtime-vnext/families/architecture-decider-runner.js
  - deterministic tests using cases like MBSH single-page rejection

3.2 Sitemap planner worker
- Implement sitemap-planner.
- Responsibilities:
  - create SiteManifest
  - emit PageManifest[]
  - define page purpose, route, required sections, CTA, dependencies
- Deliverables:
  - runtime-vnext/families/sitemap-planner-runner.js
  - multi-page characterization tests

4. Content/design/component/media lane

4.1 Page copy worker
- Implement page-copy-worker.
- Responsibilities:
  - produce structured content per page
  - keep page sections machine-addressable
  - emit metadata copy inputs, CTA content, FAQ blocks, etc.
- Deliverables:
  - runtime-vnext/families/page-copy-runner.js
  - fixtures for service/business/reunion style pages

4.2 Design token worker
- Implement design-token-worker.
- Responsibilities:
  - color system
  - typography system
  - spacing/motion/visual rules
  - reusable tokens for all pages
- Deliverables:
  - runtime-vnext/families/design-token-runner.js

4.3 Component selector worker
- Implement component-selector-worker.
- Responsibilities:
  - identify reusable components from internal sources when available
  - decide reuse vs custom build
  - emit component contracts for each page
- Deliverables:
  - runtime-vnext/families/component-selector-runner.js
  - contract for component provenance and fallback behavior

4.4 Custom component builder worker
- Implement custom-component-builder-worker.
- Responsibilities:
  - build missing components only when needed
  - emit reusable metadata for future builds
- Deliverables:
  - runtime-vnext/families/custom-component-builder-runner.js

4.5 Media planner worker
- Implement media-planner-worker.
- Responsibilities:
  - classify each media need as existing | generate | placeholder | deferred
  - ensure ideal media gaps do not block full build completion unless structurally required
- Deliverables:
  - runtime-vnext/families/media-planner-runner.js

4.6 Media generation worker
- Implement media-generation-worker.
- Responsibilities:
  - generate hero/background/illustration/media candidates when required
  - record prompts/provenance/output paths
  - fallback safely when generation is unavailable
- Deliverables:
  - runtime-vnext/families/media-generation-runner.js

4.7 JS behavior writer worker
- Implement js-behavior-writer-worker.
- Responsibilities:
  - output narrow feature-level JS modules
  - no giant site-wide behavior blob
  - examples: nav, forms, accordions, motion hooks, analytics hooks
- Deliverables:
  - runtime-vnext/families/js-behavior-runner.js
  - modular JS assembly tests

5. Page build and assembly lane

5.1 Page builder worker
- Implement page-builder-worker.
- Responsibilities:
  - build one page from PageManifest + ContentPacket + tokens + components + media + SEO slice
  - support page-level swarm execution
- Deliverables:
  - runtime-vnext/families/page-builder-runner.js
  - single-page and multi-page tests

5.2 Shared assets worker
- Implement shared-assets-worker.
- Responsibilities:
  - shared CSS
  - shared JS bundle manifests
  - static asset packaging
- Deliverables:
  - runtime-vnext/families/shared-assets-runner.js

5.3 Assembly worker
- Implement final assembly-worker.
- Responsibilities:
  - route structure
  - asset linking
  - export/build assembly
  - dist/dist-vnext layout rules
- Deliverables:
  - runtime-vnext/families/assembly-runner.js
  - assembly proof fixtures

6. SEO lane

6.1 SEO pack worker
- Implement seo-pack-worker.
- Responsibilities:
  - titles/meta per page
  - OG/Twitter surface
  - canonicals
  - schema/structured data
  - robots/sitemap when appropriate
- Deliverables:
  - runtime-vnext/families/seo-pack-runner.js
  - tests verifying per-page SEO output exists

6.2 SEO verification
- Structural QA must fail or warn when required SEO output is absent.

7. QA lane

7.1 Structural QA worker
- Implement structural-qa-worker.
- Checks:
  - required pages exist
  - required sections exist
  - assets linked
  - metadata present
- Deliverables:
  - runtime-vnext/families/structural-qa-runner.js

7.2 Content QA worker
- Implement content-qa-worker.
- Checks:
  - missing CTA
  - placeholder leakage
  - tone drift
  - banned claims
- Deliverables:
  - runtime-vnext/families/content-qa-runner.js

7.3 Browser QA worker
- Implement browser-qa-worker.
- Requirements:
  - Playwright only
  - route coverage
  - viewport checks
  - form/navigation checks
  - console error checks
- Deliverables:
  - runtime-vnext/families/browser-qa-runner.js
  - proof artifacts captured to reports/

7.4 Proof curator worker
- Implement proof-curator-worker.
- Responsibilities:
  - gather run identity, outputs, QA, deploy, SEO, and artifact paths
  - produce final human-readable proof report
- Deliverables:
  - runtime-vnext/families/proof-curator-runner.js

7.5 Gap logger worker
- Implement gap-logger-worker.
- Responsibilities:
  - record every failure/workaround/GUI fix recommendation
- Deliverables:
  - runtime-vnext/families/gap-logger-runner.js

8. Deploy lane

8.1 Netlify staging deploy worker
- Preserve and re-implement staging deploy path in vNext.
- Responsibilities:
  - publish verified builds to staging
  - return staging URL and deployment report
- Deliverables:
  - runtime-vnext/families/netlify-staging-deploy-runner.js
  - staging deploy tests/proof artifacts

8.2 Production deploy router worker
- Preserve explicit production deploy path routing.
- Responsibilities:
  - choose prod path based on project target
  - prepare prod deploy or execute when authority allows
  - keep authority boundaries explicit
- Deliverables:
  - runtime-vnext/families/prod-deploy-router-runner.js

8.3 SSL/hardening integration
- Inventory and integrate Site Studio-specific skills such as free SSL certificate setup.
- Responsibilities:
  - attach existing proven process as callable runtime capability
  - do not reinvent already-proven domain/SSL flows
- Deliverables:
  - site-studio-ssl-certificate-setup skill reference surfaced in runtime docs/contracts
  - integration tests or manual proof procedure

9. Skill and process inventory

9.1 Existing skill inventory
- Search for existing Site Studio-adjacent skills/processes.
- Consolidate or patch them into a coherent Site Studio skill family.
- Deliverables:
  - skill inventory report
  - missing-skill gap list

9.2 Runtime skill invocation model
- Define where the runtime calls a skill vs where it uses native worker code.
- Rule of thumb:
  - stable procedural external ops can use skills
  - core deterministic build graph logic should live in worker code

10. Operator path cutover

10.1 UI/operator integration
- Route Site Studio operator actions through vNext graph rather than legacy monolith authority.
- Deliverables:
  - operator-facing endpoints/UI actions backed by frozen contracts and worker graph

10.2 Shadow and cutover
- Run legacy and vNext in comparison mode where needed.
- Cut over only when proof shows parity or intended superiority for supported slices.

11. Legacy authority removal

11.1 De-authorize legacy build backbone
- Remove primary dependency on:
  - spawnClaude
  - claude -p
  - giant mutable server.js build state
- Leave only thin compatibility shell if required during transition.

11.2 Giant JS reduction
- Break giant behavior/build outputs into feature modules.
- No new monolith replacement allowed.

12. Recommended implementation milestones

12.1 Milestone A — Contract and validation freeze
Success condition:
- BuildRequest + artifact schemas frozen and tested

12.2 Milestone B — Bootstrap/planning base
Success condition:
- repo/config/architecture/sitemap workers live

12.3 Milestone C — Page/content/design build graph
Success condition:
- single-page and multi-page deterministic builds via modular workers

12.4 Milestone D — Components/media/JS modularity
Success condition:
- missing ideal components/media no longer block build completion

12.5 Milestone E — SEO/QA/proof
Success condition:
- SEO + Playwright QA + proof are first-class and mandatory

12.6 Milestone F — Deploy preservation
Success condition:
- Netlify staging + explicit prod routing work in vNext

12.7 Milestone G — Operator-path cutover
Success condition:
- Site Studio operator flow uses vNext as primary authority

12.8 Milestone H — Legacy retirement
Success condition:
- claude subprocess build dependency removed from primary path
- server.js no longer owns build intelligence

13. Captain ruling

Do not patch the old monolith into false respectability.
Build the mastered version on runtime-vnext with frozen contracts, reusable workers, swarmable page lanes, preserved deploy authority, first-class SEO/QA/proof, and Site-Studio-specific skills integrated where they actually belong.

That is the implementation path that proves Site Studio is no longer in the learning phase.