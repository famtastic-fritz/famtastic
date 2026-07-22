# Site Studio Modular Rewrite Brief

Title: Site Studio modular rewrite — provider-agnostic, workerized, deploy-capable
Purpose: Replace the legacy monolithic Site Studio build backbone with a modular runtime that preserves real-world build responsibilities (repo setup, folder/config scaffolding, component/media generation opportunities, staging/prod deployment paths, SEO, QA, proof) without depending on Claude subprocess orchestration or the legacy 20K server.js control blob.
Goal: Ship a Site Studio vNext architecture where every build runs through structured modules/workers with typed inputs/outputs, supports single-page and multi-page sites, can optionally pull/create components and media without blocking the build, preserves Netlify staging and explicit production deploy paths, accounts for per-page SEO, and captures Site-Studio-specific skills/processes as first-class runtime capabilities.

Tasks:
1. Freeze the target architecture and authority boundaries.
2. Define the canonical build contract and all downstream structured artifacts.
3. Define the worker/module graph for site builds end-to-end.
4. Define non-blocking component/media acquisition and generation lanes.
5. Define repo/bootstrap/config/deploy/SEO/QA/proof modules that every build can reuse.
6. Define skill surfaces and process surfaces specific to Site Studio.
7. Define migration strategy from legacy server.js/spawnClaude flows to runtime-vnext.
8. Define proof gates for "mastered" status.

Status: Drafted
Started: 2026-07-22
Ended:
Execution: Multi-swarm by module family after architecture freeze. Dependency-first fanout: contract layer -> worker families -> deploy/QA/SEO lanes -> legacy cutover.
Research: Grounded in current repo audit across site-studio runtime-vnext, site-mbsh-reunion, site-famtastic-designs, and app-famtastic-by-the-numbers.
Review: Requires adversarial review before implementation swarm. Codex/second-model review standard.
Skills: site-build-request-normalizer, site-architecture-decider, site-sitemap-planner, site-page-copy-author, site-page-builder, site-component-selector, site-media-planner, site-js-behavior-writer, site-browser-qa, site-netlify-staging-deploy, site-prod-deploy-router, site-seo-packager, site-proof-curator
Proof:
- Legacy build/runtime responsibilities fully mapped into vNext modules
- Staging deploy preserved
- Production deploy path preserved
- SEO preserved
- Non-blocking media/component opportunities preserved
- No Claude subprocess dependency in primary build path
- Legacy giant-file authority removed

## 1) Core rewrite principle

Site Studio is not just a page generator. A build must still be able to:
- create/set up the repo
- create/set up local folders
- write config scaffolding
- choose or create components
- choose or create media assets
- build page artifacts
- assemble site-level assets
- run QA
- deploy to staging
- route to a production deploy path
- produce proof

Therefore the rewrite cannot reduce Site Studio to "HTML generation." It must become a modular production pipeline.

## 2) Canonical build contract

Every build begins with a canonical Build Request contract. No module downstream should have to parse loose conversation text.

BuildRequest
- project_id
- run_id
- site_tag
- product_type: site | app | landing | hybrid
- deployment_mode: none | staging-only | staging-and-prod-ready
- architecture_preference: single-page | multi-page | app-like | hybrid | auto
- business
  - name
  - category
  - description
  - location/service_area
  - public_contact
  - hours
- positioning
  - audience
  - ideal_customer
  - problem
  - desired_outcome
  - primary_goal
  - primary_cta
  - secondary_cta
- brand
  - colors
  - typography notes
  - mood
  - style references
  - do_not_do
- content_inputs
  - services
  - about
  - differentiators
  - credentials
  - testimonials
  - faqs
  - compliance notes
- architecture_constraints
  - required_pages
  - required_sections
  - rejected_patterns
  - must_support_forms
  - must_support_blog/news/case-studies/etc.
- assets_available
  - logo
  - photography
  - video
  - copy docs
  - prior site assets
- component_opportunities
  - reusable component candidates
  - component sources allowed
  - custom component needed flags
- media_opportunities
  - missing hero media
  - section illustration needs
  - icon/diagram needs
  - animation/video needs
- seo_inputs
  - target geography
  - target services/topics
  - page keywords by page if known
  - schema needs
- deploy
  - git remote target
  - netlify site linkage if any
  - staging required
  - production target type
  - custom domain(s)
  - ssl needs
- authority
  - can_publish_staging
  - can_prepare_prod_only
  - can_execute_prod_deploy

Artifacts emitted from BuildRequest
1. ArchitectureDecision
2. SiteManifest
3. PageManifest[]
4. ContentPacket[]
5. DesignTokenPack
6. ComponentPlan
7. MediaPlan
8. JsBehaviorPlan
9. SeoPack
10. BuildAssemblyManifest
11. QaReport
12. DeployReport
13. ProofReport

## 3) Worker/module graph

### A. Intake and planning lane
1. build-request-normalizer
Input: interview notes / imported structured intake / prior spec
Output: BuildRequest

2. architecture-decider
Input: BuildRequest
Output: ArchitectureDecision
Responsibilities:
- decide single-page vs multi-page vs hybrid
- respect known rejections (example: MBSH rejected single-page)
- identify page count, route model, layout model

3. sitemap-planner
Input: BuildRequest + ArchitectureDecision
Output: SiteManifest + PageManifest[]
Responsibilities:
- define routes/pages
- define page goals
- define required sections per page
- define dependencies between pages

### B. Bootstrap lane
4. repo-bootstrap-worker
Input: BuildRequest + SiteManifest
Output: RepoBootstrapReport
Responsibilities:
- create repo/folder structure
- initialize local project directories
- seed package/config files
- choose framework target if needed
- create working dist/workspace directories

5. config-scaffold-worker
Input: BuildRequest + chosen stack
Output: ConfigScaffoldReport
Responsibilities:
- generate env template files
- generate app/site config
- create deploy config stubs
- create lint/test/build config

This is critical: bootstrap/config happens even if page/media generation is incomplete.

### C. Design/content/component/media lane
6. design-token-worker
Input: BuildRequest
Output: DesignTokenPack
Responsibilities:
- colors
- type system
- spacing/radius/shadow/motion rules
- reusable visual rules for all pages

7. page-copy-worker
Input: PageManifest + BuildRequest
Output: ContentPacket for one page
Responsibilities:
- author structured copy
- CTA logic
- metadata copy inputs
- section-level content, not raw prose blobs only

8. component-selector-worker
Input: PageManifest + DesignTokenPack + available component libraries
Output: ComponentPlan
Responsibilities:
- detect reusable component opportunities
- pull from internal/shared component sources if available
- mark where custom components are needed
- never block whole build if a perfect component is unavailable

9. custom-component-builder-worker
Input: component need from ComponentPlan
Output: component artifact + contract
Responsibilities:
- build missing component when necessary
- emit reusable component metadata for future builds

10. media-planner-worker
Input: PageManifest + ContentPacket + available assets
Output: MediaPlan
Responsibilities:
- identify available vs missing assets
- route each need to: use existing | generate placeholder | request future generation
- missing media does not block the whole build

11. media-generation-worker
Input: MediaPlan item
Output: MediaArtifact
Responsibilities:
- create hero/background/illustration/media candidate when needed
- emit source/prompt/proof metadata
- if unavailable, return fallback placeholder decision

Rule: component/media opportunity must not stall repo/bootstrap/page assembly. Missing ideal assets degrade gracefully, not abort the build.

### D. Page/build assembly lane
12. page-builder-worker
Input: one PageManifest + ContentPacket + DesignTokenPack + ComponentPlan + MediaPlan slice + SeoPack slice
Output: page artifact
Responsibilities:
- build one page at a time
- page workers can swarm in parallel
- supports shared templates + per-page overrides

This is the most reusable worker in Site Studio. Every site needs this.

13. shared-assets-worker
Input: site-wide design/component/js/media decisions
Output: shared CSS/JS/assets bundle
Responsibilities:
- create site-level CSS
- shared JS modules
- icons/fonts/static support assets

14. js-behavior-writer-worker
Input: JsBehaviorPlan
Output: narrowly scoped JS modules
Responsibilities:
- nav interactions
- accordions
- filters
- motion hooks
- forms enhancement
- analytics hooks if needed

No giant JS blob. Behavior must be modular by feature.

15. assembly-worker
Input: page artifacts + shared assets + configs
Output: build directory + BuildAssemblyManifest
Responsibilities:
- final route structure
- asset linking
- manifest generation
- static export or framework build

### E. SEO lane
16. seo-pack-worker
Input: BuildRequest + SiteManifest + PageManifest + ContentPacket
Output: SeoPack
Responsibilities:
- title/meta per page
- open graph/Twitter image strategy
- canonicals
- heading/keyword coverage checks
- structured data/schema
- sitemap.xml / robots.txt when appropriate

Page SEO is not optional. It is its own module family.

### F. QA lane
17. structural-qa-worker
Input: BuildAssemblyManifest
Output: structural QA report
Checks:
- required pages exist
- required sections present
- routes valid
- assets present
- metadata present

18. browser-qa-worker
Input: built output
Output: Browser QA report
Checks via Playwright only:
- routes load
- mobile/desktop render
- nav works
- forms behave
- no console explosions
- no dead links in core path

19. content-qa-worker
Input: SiteManifest + ContentPacket[]
Output: content QA report
Checks:
- missing CTA
- placeholder leakage
- tone drift
- banned claims
- unsupported promises

20. diff/parity-worker
Input: expected manifest + actual build
Output: mismatch report
Used during migration and regression control.

### G. Deploy lane
21. netlify-staging-deploy-worker
Input: verified build + staging authority
Output: DeployReport
Responsibilities:
- deploy to Netlify staging
- return staging URL
- preserve this as a first-class path

22. prod-deploy-router-worker
Input: verified build + production deploy config
Output: ProductionDeployPlan or DeployReport
Responsibilities:
- choose production deployment path based on project target
- prepare or execute deploy
- support explicit prod deploy path configuration

23. ssl/prod-hardening-worker
Input: production domain/deploy config
Output: SSL/setup report
Responsibilities:
- attach free SSL certificate flow where applicable
- preserve/use existing Site Studio-specific skills (example: free SSL on prod domain)

### H. Proof/governance lane
24. proof-curator-worker
Input: all reports
Output: ProofReport
Responsibilities:
- summarize exact artifacts
- test/deploy/SEO/QA proof
- capture run identity and output paths

25. gap-logger-worker
Input: any failure/degradation/workaround
Output: gap log entry
Responsibilities:
- log exact failure
- workaround used
- recommended GUI/runtime fix

## 4) Swarm model

Use swarms for:
- per-page content authoring
- per-page building
- per-page QA
- media generation batches
- adversarial review of architecture or content

Do not swarm:
- final architecture authority
- final assembly
- final deploy
- final proof ruling

Preferred model
- 1 captain/orchestrator
- N page workers in parallel
- N media/component workers as needed
- 1 QA consolidator
- 1 deploy router
- 1 proof curator

## 5) Non-blocking build philosophy

A build should succeed in layers.

Green path
- repo/folders/config scaffolded
- page manifests created
- content created
- pages built
- QA green
- staging deployed

Yellow path
- repo/folders/config scaffolded
- pages built with placeholders/fallback components/media
- QA flags degradations
- staging deployed with proof + TODO ledger

Red path
- assembly impossible
- required route/build contract broken
- deploy blocked by structural failure

This preserves your rule: missing ideal components or media should not stop the entire build.

## 6) Site-Studio-specific skill surface

You said this explicitly and you’re right: there need to be skills and processes specific to Site Studio, not generic skills only.

Required skills
1. site-studio-build-request-normalizer
2. site-studio-architecture-decider
3. site-studio-sitemap-planner
4. site-studio-page-builder
5. site-studio-component-selector
6. site-studio-custom-component-builder
7. site-studio-media-planner
8. site-studio-js-behavior-writer
9. site-studio-seo-packager
10. site-studio-browser-qa
11. site-studio-netlify-staging-deploy
12. site-studio-prod-deploy-router
13. site-studio-ssl-certificate-setup
14. site-studio-proof-curator
15. site-studio-gap-logger

Skill rule
- Skills should map to one reusable module/process each.
- Skills should return structured outputs, not just advice.
- Existing proven skills (example: free SSL certificate setup) must be incorporated rather than rediscovered.

## 7) Runtime implementation target

The runtime-vnext layer should become the canonical execution engine.

Needed upgrades to runtime-vnext
- explicit worker family registry for content/page/component/media/seo/deploy/qa workers
- stable BuildRequest and artifact schemas checked at stage boundaries
- persisted run graph state for all modules
- page-level swarm execution support
- artifact registry for reusable components/media outputs
- deploy authority separation (staging vs prod)
- skill invocation hooks for Site Studio-specific procedures

## 8) Legacy removal targets

Legacy iteration-one dependencies to retire from primary authority
- server.js giant-file control plane
- global mutable build state in process memory
- spawnClaude / claude -p build backbone
- giant blended JS behavior file patterns where features should be modular
- conversation-only handoffs where typed contracts should exist

## 9) Migration plan

Phase M1 — Freeze contracts
- freeze BuildRequest
- freeze ArchitectureDecision
- freeze SiteManifest/PageManifest
- freeze SeoPack/QA/Deploy/Proof report schemas

Phase M2 — Bootstrap + assembly base
- repo-bootstrap-worker
- config-scaffold-worker
- shared-assets-worker
- assembly-worker

Phase M3 — Page lane
- page-copy-worker
- page-builder-worker
- js-behavior-writer-worker
- page swarm support

Phase M4 — Components/media lane
- component-selector-worker
- custom-component-builder-worker
- media-planner-worker
- media-generation-worker
- non-blocking fallback policy

Phase M5 — SEO + QA lane
- seo-pack-worker
- structural/content/browser QA workers

Phase M6 — Deploy lane
- netlify staging deploy preserved
- explicit production deploy router preserved
- SSL/hardening skill integration

Phase M7 — Operator path
- studio UI/operator path runs through vNext graph
- old legacy path shadowed, then cut over

Phase M8 — Legacy authority removal
- retire spawnClaude dependency from primary path
- shrink or de-authorize giant server.js control responsibilities

## 10) Definition of mastered

We can say Site Studio is mastered when all of this is true:
- BuildRequest contract is frozen and used everywhere.
- Multi-page and single-page builds run through the same modular graph.
- Repo/bootstrap/config creation is first-class and repeatable.
- Components can be pulled or custom-built without stalling whole builds.
- Media can be reused/generated/fallbacked without stalling whole builds.
- Per-page SEO is generated and verified.
- Netlify staging deploy remains working.
- Production deploy path remains configurable and executable.
- Site-Studio-specific skills are wired into the runtime where appropriate.
- Browser QA is mandatory and proof-backed.
- No primary build depends on Claude subprocess orchestration.
- Legacy giant-file authority is gone or reduced to a thin compatibility shell.

## 11) Captain recommendation

Do not do another incremental patch series on the legacy monolith.
Use runtime-vnext as the execution chassis and rebuild Site Studio around frozen contracts + worker families.

This is not iteration two of the old system.
This is the mastered version.