# FAMTASTIC-STATE.md — Canonical Project Reference

**Last updated:** 2026-05-21 (Final pre-Phase-2 consolidation completed: Phase 2 plan of record is tracked, broader pre-Shay-Shay worktree references are archived under `docs/archive/pre-shay-shay/`, Phase 2A brand/remotion starting inputs are tracked, local nested repos/probes are ignored, and Phase 1 foundation remains current.)

---

## What FAMtastic Site Studio Is

FAMtastic Site Studio is a chat-driven website factory that generates production-ready HTML+Tailwind CSS websites from natural language conversation. A user opens a browser-based chat interface (or talks to Shay-Shay through Shay Desk), describes the site they want, and the system generates multi-page HTML, provides a live preview, and deploys to Netlify — all without the user writing code or leaving the chat.

The system is currently single-user and localhost-only, built and operated by Fritz Medine. The architectural goal — captured in the canonical vision doc `docs/FAMTASTIC-VISION-CAPTURE-2026-04-24.md` — is the **Adobe Creative Cloud pattern**: separate full-identity studios (Site, Component, Media, Think Tank) atop shared Platform services (research, memory, intelligence loop, learning).

**Key recent milestones:**

- **2026-05-21** — Final pre-Phase-2 consolidation and clean-state prep. The current plan of record is `plans/PHASE2-VISUAL-WORKFLOWS-BRAND-SYSTEMS.md`. Broader pre-Shay-Shay worktree material was harvested into `docs/archive/pre-shay-shay/full-snapshots/` instead of merging stale UI/code wholesale; bulk MuAPI logo/media WIPs were preserved locally and indexed by `docs/archive/pre-shay-shay/local-artifact-manifests/epic-mclean-muapi-logo-outputs.md`. Phase 2A starting inputs are now tracked in main via `brand/FAMTASTIC-BRAND-MARK.md` and the `remotion/` FAMtastic logo motion composition source. Local nested repos/probes (`shay-shay/`, `shay-desktop*/`, `_tool-probes/`, etc.) are ignored by the hub repo; useful findings must be promoted into tracked docs/plans/Data Center records or separate repos.

- **2026-05-21** — Post-evaluation contract and Phase 1 opportunity forecast. Added `lib/famtastic/post-eval/index.js` with `buildPostEval()`, `recordPostEval()`, `listPostEvalRecords()`, `extractPhaseOneOpportunitySeeds()`, and `renderPostEvalReport()`. Data Center now treats `post-eval/` and `schemas/post-eval-record.schema.json` as first-class structure; records write JSON to `data-center/post-eval/`, Markdown reports to `data-center/reports/post-eval/`, and ledger events to `data-center/ledgers/post-eval.jsonl`. Mission Control reads post-eval records via `summary.post_eval` and `post_eval[]`, and `scripts/mission-control-report.js` renders post-eval counts. `scripts/post-eval-phase1.js` ran the real Phase 1 closeout plus Phase 2 plan through four live Perplexity-backed research proofs and produced `data-center/reports/post-eval/posteval_phase1_20260521.md` with 15 opportunities. Remaining gaps: post-eval is not yet automatically invoked by every studio/job endpoint, and promotion policy is not yet implemented for turning opportunities into skills, process rules, components, media recipes, claims, or Fritz review cards.

- **2026-05-21** — Wave 7 Site Studio quality-flow hook. Added `lib/famtastic/site-quality-flow/index.js` with `extractPlatformNeeds()`, `buildCrossStudioContract()`, and `buildSiteQualityFlowContext()`. `site-studio/server.js::buildPromptContext()` now appends a `SITE QUALITY FLOW` prompt block that encodes the platform rule: research first, search/reuse before generate, route media needs to Media Studio, route reusable UI needs to Component Studio, return structured proof to the caller, and record useful outputs in Data Center. The first extraction pass recognizes hero/gallery/video/logo media needs plus slideshow/hero/testimonial/pricing component needs, uses Component Studio `buildComponentReuseContext()` for candidates, and keeps Media Studio generation as dry-run/planned rather than pretending assets exist. Added `tests/site-quality-flow-tests.js`, `site-studio/tests/site-quality-flow-integration.test.js`, and `specs/007-site-studio-quality-flow/`. Remaining gaps: full cross-studio request broker, polished visual workflows, Media/Site/Component Studio screens, and actual approved media generation.

- **2026-05-21** — Phase 2 direction corrected to Visual Workflows & Brand Systems. After Wave 7, the next phase should prioritize product-value workflows over a Mission Control-first dashboard. Agreed order: Media Studio through FAMtastic logo/brand creation, Site Studio useful build/edit/enhance workflow, Component Studio from real repeated site/media needs, Mission Control visual orchestration, Data Center/Research Center/Second Brain visual UI, and Shay Desk Office tab integration.

- **2026-05-21** — Wave 6 Component Studio wrapper foundation. Added `lib/famtastic/component-studio/index.js` and `scripts/component-studio-search.js` as the first search-before-build substrate. The loader merges canonical `components/library.json` entries with manifest-only `components/*/component.json` folders, deterministic search scores by query/type/group, and `buildComponentReuseContext()` emits a build-prompt block that preserves `data-component-ref`, `data-field-id`, slots, CSS variables, dependencies, and provenance. Component proof jobs use Data Center `kind: component_reuse`, write `outputs/component-reuse-proof.json`, append sanitized `component-reuse` ledger rows, and appear in Mission Control as `summary.component_reuse` plus `component_reuse`. Added `tests/component-studio-tests.js`, `specs/006-component-studio-wrapper-foundation/`, and Wave 6 proof/status docs. Remaining gaps: registry drift remains (9 manifests vs 6 library entries), no visual Component Studio UI yet, partial-piece assembly is not implemented, and search is deterministic rather than semantic/vector-backed.

- **2026-05-21** — Wave 5 Media Studio wrapper foundation. Added `media-studio/model-aliases.json` and `media-studio/lib/index.js` as the first safe Media Studio substrate, with MuAPI model aliases/fallbacks, zero-spend dry-run planning, prompt hashing, Data Center `media_generation` jobs, `outputs/generation-proof.json`, and sanitized `data-center/ledgers/media-assets.jsonl` records. Added `scripts/media-studio-plan.js`; `--spend` intentionally throws because paid generation remains gated. Mission Control now reports `summary.media_generations` and a `media_generations` array. Added `tests/media-studio-wrapper-tests.js`, `specs/005-media-studio-wrapper-foundation/`, and proof/status docs under `shay-shay/observations/`; a live proof job exists at `data-center/jobs/media-20260521150816-wave-5-dry-run-hero-proof/` with `would_spend:false`. Remaining gaps: no paid MuAPI generation, no real OCR/composition validators, no Remotion render execution, and no Media Studio visual UI yet.

- **2026-05-20** — Wave 4 Mission Control observability reader. Added `lib/famtastic/mission-control/index.js` with `buildMissionControlSnapshot(options)`, a deterministic reader/projection over the canonical Data Center and existing capture/proof outputs. Added `scripts/mission-control-report.js` with human output and `--json`, plus `--root`, `--hub-root`, and `--stale-after-hours` for deterministic fixtures. The snapshot reports research jobs, latest witness/capability checks, claims, decisions, needs-Fritz items, stale/blocked items, proof artifacts, and raw capture inbox counts without creating a second knowledge store or moving raw captures. Added `tests/mission-control-tests.js`, `specs/004-mission-control-observability/`, `shay-shay/observations/SHAY-WAVE4-MISSION-CONTROL-PROOF-2026-05-20.md`, and updated `shay-shay/observations/SHAY-WAVE4-STATUS-2026-05-20.md`. Data Center claim `claim_a3b0cb120202f00c` and decision `decision_cce22f61a71f6dac` record the reader-only design choice. Focused verification passed: Mission Control test, Data Center tests, ingestion CLI tests, witness tests, autopilot tests, report JSON/human output, and `git diff --check`. Remaining gaps: no Desktop/cockpit UI yet, no live autopilot summaries until run-event ingestion reaches Data Center, and proof discovery starts with Data Center job outputs/proof-like Data Center ledger rows rather than every older root proof ledger.

- **2026-05-20** — Wave 3 Data Center ingestion + knowledge layer foundation. Extended `lib/famtastic/data-center/index.js` without breaking Wave 1/2 exports: the module still provisions the core Data Center/job/ledger/witness surfaces and now also supports source ingestion, source record upserts, claim records, and decision records. Raw intake remains the existing `captures/inbox/` and `captures/review/` folders; Wave 3 does not create a duplicate inbox. Added `scripts/data-center-ingest.js` as the bounded local runner with `--dry-run` and `--json`, and created `specs/003-data-center-knowledge-layer/` plus `shay-shay/observations/SHAY-WAVE3-DATA-CENTER-KNOWLEDGE-PROOF-2026-05-20.md`. Focused verification covers ingestion idempotency, redaction, and source/claim/decision linkage in `tests/data-center-tests.js` plus CLI argument/render behavior in `tests/data-center-ingest-tests.js`. Remaining gaps: no graph/export surface yet for claims or decisions, ingestion currently targets the raw capture box only, and no higher-level claim/decision promotion workflow exists yet on top of the primitives.

- **2026-05-19** — Wave 2 witness + autopilot foundation. Extended `~/famtastic/data-center/` with `witness/` and a `capability-witness.schema.json` plus `appendWitnessRecord()` / `readWitnessRecords()` in `lib/famtastic/data-center/index.js`. Added `scripts/witness-check.js` to run and register local capability checks for Data Center smoke, second-brain export smoke, and the Site Studio `research-router` metadata test command, with per-capability baseline comparison and the existing redaction path. Added `lib/famtastic/autopilot/index.js`, a deterministic run-health classifier over recent actions using success rate, diversity, and repeated-action streaks to return `productive`, `suspicious`, or `stuck` status only. Focused verification passes: `tests/autopilot-tests.js`, `tests/witness-check-tests.js`, `tests/data-center-tests.js`, `tests/second-brain-tests.js`, `site-studio/tests/research-router.test.js`, and witness CLI execution. Remaining gaps: no Mission Control/Desktop witness surface yet, no trend-aware baselines beyond previous run, and no live event feed from broader Shay tooling into the classifier.

- **2026-05-19** — Research Data Center foundation. Added `~/famtastic/data-center/` as the local evidence/research/proof substrate and `lib/famtastic/data-center/index.js` with `ensureDataCenter()`, `createResearchJob()`, `appendLedgerRecord()`, `listCaptureInbox()`, and `sanitizeRecord()`. Fixed `site-studio/lib/research-router.js::queryResearch()` so `skipCache` and `forceSource` paths no longer throw `cached is not defined`, and updated `site-studio/lib/research-registry.js::queryPerplexity()` to preserve citations, search results, usage, cost metadata, request id, model, and status code under `meta`. Added `scripts/research-job.js` to load `~/.shay/.env` locally, execute research through the shared proxy, and write sanitized Data Center job artifacts. Added second-brain export support at `lib/famtastic/second-brain/index.js`, proof notes under `second-brain/Research/`, canvas exports under `second-brain/Canvases/`, and the first research-shaped SDD packet at `specs/001-research-data-center-foundation/`. Focused verification passes: `site-studio/tests/research-router.test.js`, `tests/data-center-tests.js`, and `tests/second-brain-tests.js`. Remaining gaps: capture promotion is list-only, native shared research still proxies Site Studio, Mission Control panels are not built yet, and broad Site Studio unit execution is blocked by a missing `site-studio/public/js/shay-bridge-client.js` import unrelated to this slice.

- **2026-05-19** — Shay-Shay intelligence ledger substrate. Added `~/famtastic/shay-shay/agent/intelligence_ledger.py` as Wave 1 of Shay's continuous collect/analyze/adjust loop. The module writes sanitized append-only JSONL events to profile-scoped `get_shay_home() / "intelligence/events.jsonl"`, exposes `append_event()`, `read_events()`, `summarize_events()`, `intelligence_home()`, `events_path()`, and `is_enabled()`, and supports disabling writes with `SHAY_INTELLIGENCE_ENABLED=0|false|no|off|disabled`. Tests at `~/famtastic/shay-shay/tests/agent/test_intelligence_ledger.py` cover profile isolation, append/read/filter/limit behavior, disabled mode, corrupt-row tolerance, redaction basics, and summary counts; targeted pytest passes 7/7. Remaining gap: no lifecycle hooks, analyzer/report command, cron briefing, Desktop surface, or orchestration feedback loop is wired yet.

- **2026-05-19** — Electron Shay Desktop installed. Rebranded the correct `~/famtastic/shay-desktop-electron/` app from `fathah/hermes-desktop` into `/Applications/Shay Desktop.app` with app id `com.famtastic.shaydesktop`, executable `Shay Desktop`, ad-hoc local signing, and user data under `~/Library/Application Support/shay-desktop`. Runtime defaults now prefer `SHAY_HOME`/`~/.shay`, `SHAY_REPO`/`~/famtastic/shay-shay`, and `.venv/bin/shay` while retaining internal `HERMES_*` compatibility aliases. Verification: `npm run typecheck` passes, `npm run test` passes 435 tests across 33 files, `CSC_IDENTITY_AUTO_DISCOVERY=false npm run build:unpack` builds `dist/mac-arm64/Shay Desktop.app`, codesign verification passes, the installed app launches, helper processes use the new `shay-desktop` userData dir, and local Shay-Shay v0.13.0 CLI discovery works. Remaining gaps: screen-by-screen API compatibility with Shay-Shay still needs verification, Office/Claw3D runtime was not started, non-English/upstream docs and many internal symbols still say Hermes, no notarized DMG exists, and the temporary `SS` icon should be replaced when the real logo is ready.

- **2026-05-19** — Correct Shay Desktop lineage identified. Added `~/famtastic/shay-desktop-electron/` from `fathah/hermes-desktop`, the Electron + React + TypeScript app matching Fritz's screenshot with Chat, Sessions, Profiles, Office, Models, Providers, Skills, Persona/Soul, Memory, Tools, Schedules, Gateway, Settings, and Kanban. Initial verification showed `npm install`, `npm run typecheck`, `npm run test`, and `npm run dev` working; this repo is now the primary Shay Desktop base.

- **2026-05-19** — Shay Desktop Swift workbench bootstrap. Added `~/famtastic/shay-desktop/` as a rebranded fork of `dodo-reach/hermes-desktop` and installed `/Applications/ShayDesktop.app`. This app is a native Swift/macOS SSH workbench for Shay-Shay hosts, with Overview, Sessions, Files, Skills, Cron Jobs, Kanban, Usage, Terminal, and Workflows surfaces; it is not the primary Chat/Office desktop app from Fritz's screenshot. Branding/runtime changes include `packaging/Info.plist` display name/bundle id, `scripts/generate-app-icon.swift` temporary dark `SS` monogram icon, `scripts/build-macos-app.sh` emitting `dist/ShayDesktop.app`, app support at `~/Library/Application Support/ShayDesktop`, and source defaults for `SHAY_HOME`, `~/.shay`, and the `shay` CLI. Build/sign/launch verified; localhost SSH blocker fixed by enabling `com.openssh.sshd`, authorizing the local key, and adding a `~/.zshenv` PATH export so `ssh localhost 'shay --version'` succeeds. Remaining known gaps are Swift tests blocked by missing `Testing` module in this CLT environment and internal Swift module/executable names still saying `HermesDesktop`.

- **2026-05-14** — MBSH RSVP hero status: **Phase 3.4 marker-band surgical fixes complete locally, awaiting Fritz inspection**. In `~/famtastic-sites/mbsh-reunion`, the sealed `.hero-stage` remains visually and markup-stable — Variant B Harry left, centered headline, theater/check-in background, two-position camera flashes, dust/lamp atmosphere, tungsten pulse, and center MENU medallion were not touched. Only `.marker-band` changed: the velvet panel now sits inside the viewport with ~4vw edge padding, `.marker-plaque` remains HTML/CSS with centered `.marker-line-1` / `.marker-line-2`, 20 glowing top `.marker-bulb` lights, four `.marker-corner` Art Deco diamonds, the existing bottom `.bleed-bulb-row`, and an absolute `.chevron.layer--chevron.scroll-teaser` at the section bottom (`data-scroll-target="#rsvp-form"`) whose `chevronBounce` travels upward over the plaque area. Local proof passed desktop visual inspection, 390×844 mobile screenshot proof after marker-only containment, clean browser console, scroll-target click check, `node --check frontend/js/premiere.js`, `node --check frontend/js/rsvp.js`, and `git diff --check`; desktop Lighthouse is 98, mobile-throttled Lighthouse remains below 85 due to the broader existing CSS/font payload, no staging push has happened, and Fritz inspection remains the gate.

- **2026-05-12** — MBSH super-vibe-coder cinematic implementation pass. After the page-by-page assessment, the MBSH deploy repo at `~/famtastic-sites/mbsh-reunion` received a local staging-readiness implementation across `frontend/js/page-sequence.js`, `frontend/js/premiere.js`, and `frontend/css/premiere.css`. The pass enriches the canonical seven-scene map, upgrades interior page headers into layered cinematic heroes, injects mini-marquee Scene Markers directly below heroes, moves configurable Note-from-Usher panels into the correct slot, assigns machine-readable page slots/heights, wires available Wave 1 stills into page heroes, and adds page-specific form/card wow treatments. Captures added/updated include `captures/inbox/mbsh-super-vibe-coder-mission-scope-2026-05-12.md`, `captures/inbox/mbsh-super-vibe-coder-research-synthesis-2026-05-12.md`, `captures/inbox/mbsh-super-vibe-coder-implementation-report-2026-05-12.md`, and `captures/inbox/mbsh-staging-readiness-state-2026-05-12.md`. Local checks passed for JS syntax, required assets, browser rendering, and console errors on checked pages; no production deploy, push, DNS, or env change has happened yet. Remaining staging gap: the untracked Wave 1 asset folder must be included in the staging change set, and photoreal transparent Hi-Tide Harry assets remain future enhancement work.
- **2026-05-11** — Platform Refresh v2 implementation reconciliation. Added `docs/platform-refresh/PLATFORM-REFRESH-V2-IMPLEMENTATION-RECONCILIATION.md` to bridge the original read-only Platform Refresh v2 packet on `docs/platform-refresh-v2-cohesion` with the newer `/studio.html` implementation branch `research/studio-intelligence-foundation-20260508`. The reconciliation marks the original seven-domain Workbench/R1 navigation assumption as unsafe to execute without review, identifies the newer 12-section Studio IA as the implementation direction pending Fritz confirmation, and classifies `FIRST-BUILD-SEQUENCE.md` as first-wave substrate guidance rather than the full current completion plan. Also added top-of-file reconciliation notes to `docs/platform-refresh/REFRESH-READY-HANDOFF.md`, `docs/platform-refresh/FIRST-BUILD-SEQUENCE.md`, and `docs/platform-refresh/WORKSTREAM-MAP.md`. Preserved gaps: the current local branch lacks the implementation reports/files, Phase 1-3 action wiring report filenames were not found under the names supplied, and `plan_2026_05_05_workbench_per_page_design` closeout state differs between branches.
- **2026-05-05** — Site Studio Resend notifications. Configured Site Studio itself to send notification email through Resend with `fam-hub platform configure-resend`, `fam-hub platform send-test-email`, `site-studio/lib/studio-mailer.js`, and `site-studio/scripts/send-studio-test-email.js`. The Studio sender is `FAMtastic Site Studio`; the API key remains in `vault://studio.resend.api_key`, and a real test email was accepted by Resend. Known gap: the sender currently uses the only verified domain available, `send.mbsh96reunion.com`, until a FAMtastic-owned sending domain such as `send.famtastic.com` is verified.
- **2026-05-05** — Site Studio service auth ownership. Added Studio-owned service commands through `fam-hub platform bootstrap-services` and `fam-hub platform provision-site <site> --check --proof`, backed by `platform/capabilities/studio/bootstrap-services.sh` and `platform/capabilities/studio/provision-site.sh`. Provider auth for Netlify, Resend, cPanel/GoDaddy, DNS, SSH, and DB now belongs to Site Studio/platform; generated sites consume vault refs and generated config. Bootstrap migrated existing local Resend API, cPanel API token, MBSH production DB password, and MBSH DB ref into the platform vault; Resend verified via API. MBSH deploy proof is reframed as blocked by Studio service provisioning: production `API_BASE_URL` is still null, cPanel DNS/addon-domain automation needs wrapper coverage, and SSH host-key verification blocks `nineoo@FAMTASTICINC.COM`.
- **2026-05-05** — Configurable reporting density. Added `config/reporting-preferences.json` and `docs/operating-rules/reporting-density.md`. `scripts/fam-hub` now supports `fam-hub report style`, `fam-hub report style compact`, `fam-hub report style standard`, and `fam-hub report style detail`. Current/default density is `compact`; this changes response shape only, not proof standards, testing, or blocker visibility.
- **2026-05-05** — MBSH launch unblock grouping. Added `docs/sites/site-mbsh-reunion/mbsh-launch-unblock-packet-2026-05-05.md` and closed the media/story blocker for launch-safe generated/derivative assets. The v2 deploy repo now has all seven referenced `frontend/assets/story/*.jpg` files, a `frontend/assets/story/RIGHTS-MANIFEST.md`, and Playwright proof at `proofs/mbsh-story-assets-2026-05-05.json` / `.png`. `task-2026-05-04-028` is complete; `task-2026-05-04-027` remains blocked by Studio service provisioning and generated production config/API origin. `plans/registry.json` is internally consistent again with five active parent records, including the 2026-05-05 Ops Workspace GUI parent.
- **2026-05-04** — Four-plan registry execution substrate. `plans/registry.json` contains exactly four active parent plans: `studio-workbench-foundation`, `plan-task-run-intelligence`, `build-intent-fulfillment-trace`, and `site-mbsh-reunion`. The prior 11-record registry is backed up at `plans/registry.backup-2026-05-04.json`; stale plans are recorded as absorbed/parked metadata instead of active records. Populated `tasks/tasks.jsonl`, `runs/runs.jsonl`, and `proofs/proof-ledger.jsonl`, regenerated `FAMTASTIC-STATUS.md`, fixed `fam-hub task list` / `fam-hub run status`, and added `fam-hub plan review`, `fam-hub task promote`, and `fam-hub run start`. Workbench Plan mode renders a browser-safe consolidated state packet at `site-studio/public/data/workbench-plan-state.json`; Workbench also registers as `workbench.foundation` in `ShayContextRegistry` and has actual Shay-Shay UI proof that `context.page_context.domain = media` is seen and answered from. `fam-hub capture extract` creates review-only knowledge packets. Workflow-as-data phase 1 is cataloged, trace-instrumented, and visible through Workbench pipeline visualizer phase 1. MBSH backend inventory, RSVP/sponsor/chatbot browser proof, content delta, audit harness, and gap-promotion packets are complete; live deploy proof and media/story readiness are blocked by external access/config and missing story assets.
- **2026-05-04** — Consolidated execution checklist. Added `plans/consolidated-execution-checklist-2026-05-04.md` as the working four-plan consolidation artifact. The surviving parent plans are `studio-workbench-foundation`, `plan-task-run-intelligence`, `build-intent-fulfillment-trace`, and `site-mbsh-reunion`; `docs/famtastic-total-ask-plan.md` is parked as strategy context and mined for useful asks. Fritz marked Drive sync complete, so it is not carried as active work; workflow-as-data and the pipeline visualizer remain open under `build-intent-fulfillment-trace`. The registry rewrite, P0 task promotion, run/proof records, and status packet were applied in the follow-up four-plan registry milestone above.
- **2026-05-04** — Plan consolidation verification proposal. Added `plans/consolidation-verification-2026-05-04.md` to reduce the current 11 same-level plan records into 4 active parent plans, 1 parked strategy context, and 6 merged/closed evidence records. The registry itself is not mutated yet; approval is required before rewriting `plans/registry.json`, archiving merged records, or promoting embedded tasks into `tasks/tasks.jsonl`.
- **2026-05-04** — Studio UI Foundation freeze. Fritz approved `docs/STUDIO-UI-FOUNDATION.md` as the canonical Site Studio UI rulebook. The freeze locks the domain-level left nav, purpose-reactive workspaces, ambient Shay model, Fritz filter, Night visual system, page rule, required workspace contract, prompt-first Media Studio direction, contextual tools, and plan-then-approve pattern. Added `docs/decisions.jsonl`, `captures/inbox/2026-05-04-studio-ui-foundation-freeze.capture.json`, and `handoffs/studio-ui-foundation-freeze-2026-05-04.md`. Deferred: rebuilding the Workbench prototype from the frozen contract, registry-backed Plan mode, Shay context provider registration, and Media Studio unification.
- **2026-05-04** — Plan registry CLI substrate. Added `plans/registry.json` as the pilot canonical plan registry, three density contracts under `plans/templates/`, empty append-only ledgers for tasks/runs/jobs/proof/research, `FAMTASTIC-STATUS.md` for web/phone mirrors, and `docs/plan-registry-build-report-2026-05-04.md`. `scripts/fam-hub` gained read-only `plan`, `task`, and `run` status commands: `fam-hub plan list`, `fam-hub plan list --compact`, `fam-hub plan list --json`, `fam-hub plan show <id>`, `fam-hub task list`, and `fam-hub run status`. The later four-plan registry milestone added task promotion, run creation, and ledger records; automatic status export, schema validation, and Studio Plans panel rendering remain deferred.
- **2026-05-04** — Workbench Foundation screen + intelligence packets. Added `site-studio/public/workbench-foundation.html` plus separate `css/workbench-foundation.css` and `js/workbench-foundation.js`, then linked it into production Studio through a Workbench top-bar launcher, Sites-sidebar launcher, and `#tab-pane-workbench` iframe with full-screen fallback. The screen now follows the frozen seven-domain rail, exposes workspace contract pills, renders registry-backed Plan mode, keeps Media Studio prompt-first, and registers a Workbench page-context provider for Shay. Added `handoffs/claude-workbench-foundation-2026-05-04.md`, `research/workbench-foundation-research-2026-05-04.md`, `plans/consolidation-2026-05-04.json`, and `captures/inbox/2026-05-04-workbench-foundation.capture.json`. Deferred: making Workbench the default shell, broader Capability Store, FAMtastic brand asset pack, unified Media Studio controls, automatic status regeneration, and worker queue consumer.
- **2026-05-04** — Active plan pipeline pilot report. Added `docs/active-plan-pipeline-report-2026-05-04.md` as a review artifact for the emerging plan/task/run intelligence model. The report inventories active Studio/platform plan clusters, groups tasks, records inferred originators/runners/proof, and recommends generous governance: warn/log/notify by default, hard-stop only for destructive, production, auth/payment/DNS/domain, expensive API/media, or write-conflict cases. Deferred: canonical `plans/registry.json`, append-only task/run/proof/research ledgers, CLI status commands, and web/phone status export.
- **2026-05-04** — Multi-agent resumable plan capture. Added `docs/multi-agent-resumable-plan-system.md` plus first file-based plan packet at `plans/plan_2026_05_04_shay_process_intelligence/` (`README.md`, `plan.json`). The plan packet captures the Shay process-intelligence initiative as ten parallel workstreams across conversation capture, plan coordination, artifact/component schema, process maps, Shay ambient presence, component library enforcement, Media Studio integration, capability graph, evaluator proof system, and Studio workspace planning. Deferred: Plan Builder / Plan Board UI, SQLite `plan_id` / `workstream_id`, automatic conversation capture, and Process Map visualization.
- **2026-05-02** — MBSH audit + v2 build + platform layer. Cowork audit produced 8 deliverables at `docs/sites/site-mbsh-reunion/cowork-audit-001/`. Headline finding: Studio cannot produce MBSH today (gap 0.11). Full V1-BRIEF built as sibling deploy repo at `~/famtastic-sites/mbsh-reunion-v2/` (84 files). Platform capability layer scaffolded at `~/famtastic/platform/` — 10 operational primitives, macOS Keychain vault, standing-approval model. Repo-separation rule formalized: deploy repos live at `~/famtastic-sites/<site>/`, not nested inside Studio. Duplicate tag `site-mbsh96reunion` trashed. Iteration 3 shipped: capture flywheel (promote/extract/patterns), Shay v2 wired live (page_context, job polling, Show-Me-How), ecosystem substrate (registerStudio, shared services, components, recipes), Drive sync action.
- **2026-04-25** — Baseline closure shipped (3 commits + verification). Closed 6 stacked sub-gaps that caused the JJ B&A baseline test to fail. Introduced canonical `createSite()` helper, `handleShayBuildRequest` async chain, structured deploy failure reasons, and chat session-break dividers. 28/28 verification scenarios PASS. Two new findings logged for follow-up: build auto-fires without confirmation, generated site has broken header links.
- **2026-04-25** — Vision capture doc canonicalized. `docs/FAMTASTIC-VISION-CAPTURE-2026-04-24.md` is now the single home for FAMtastic vision and architectural decisions. Three architectural decision entries: Tier as Canonical (GAP-4), Site Creation Contract, plus parking-lot entries for Shay-Shay naming, meta-research, context architecture.
- **2026-04-24** — All four R-NEW build-layer gaps closed. GAP-1/2/3 in commit `8536a4a` (palette defaults + skeleton injection on single-page path). GAP-4 in commit `2c5e358` (`spec.tier` as canonical, `famtastic_mode` as derived).

**Prior session additions** (verbatim from earlier project history, preserved for continuity):

- **Session 11 (2026-04-10):** `client_brief` injection, FAMtastic DNA auto-copy, font registry, interview auto-trigger, `enhancement_pass` intent, layout registry, FAMtastic logo mode, worker-queue badge, `fam-hero.css`, head-guardrail hotfix.
- **Session 12 (2026-04-12):** HTML skeletons (`HERO_SKELETON_TEMPLATE`, `LOGO_SKELETON_TEMPLATE`, `LOGO_NOTE_PAGE`, 30 tests), worker queue terminal-status purge, `famtastic-dna.md` auto-update.
- **Session 13 (2026-04-16):** `conversational_ack` intent, atomic `spec.json` writes, restyle routing fix, `lib/surgical-editor.js`, revenue-first brief interview, `fam-hub site deal-memo`.
- **Session 16 (2026-04-16):** Surgical editor wired into `tryDeterministicHandler`, Layer 0 data sources (gap logger, suggestion logger, brand tracker, deploy history, agent cards, brief corrections, capability manifest), Shay-Shay seed.
- **Session 17 (2026-04-20):** `NAV_SKELETON`, preview server query-string fix, actionable intelligence cards, site-scoped dismiss, build backlog, orb state machine.
- **Session 18 (2026-04-21):** Shay Lite settings contract, mutually exclusive Lite identities, surface state machine, persistent Shay access, Mission Control restored, Media Studio mini-app restructure, movable Shay Lite.

---

## Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| AI Engine (Primary) | Anthropic SDK (`@anthropic-ai/sdk`) | All HTML generation, design briefs, brief extraction, session summaries, image prompts. Default model: `claude-sonnet-4-6`. `callSDK()` non-streaming; `sdk.messages.stream()` for streaming. |
| AI Engine (Secondary) | OpenAI SDK (`openai@^4`) via CodexAdapter | Chat + code tasks via `gpt-4o`. Multi-turn, streaming, tool calling. Requires `OPENAI_API_KEY`. |
| AI Engine (Tertiary) | Google Generative AI (`@google/generative-ai`) via GeminiAdapter | Brainstorm and research. `gemini-2.5-flash`. Requires `GEMINI_API_KEY`. |
| Brain Adapter Pattern | `BrainInterface` + adapters | Unified interface for Claude/Gemini/OpenAI. History, context headers, model override via `ws.brainModels`. Tool calling is Claude-only. |
| Tool Calling | `lib/studio-tools.js` + `lib/tool-handlers.js` | 5 Anthropic-format tools for Claude: get_site_context, get_component_library, get_research, dispatch_worker, read_file. `MAX_TOOL_DEPTH=3`. read_file sandboxed to SITE_DIR. |
| Studio UI Foundation | Frozen rulebook + mockup references | `docs/STUDIO-UI-FOUNDATION.md` is the canonical UI foundation. It locks the Site Studio identity as an AI Creation Workbench, domain-level left nav, purpose-reactive workspaces, ambient Shay, Fritz filter, Night visual tokens, page rule, workspace contract, prompt-first Media Studio, contextual tools, and plan-then-approve. Decision ledger: `docs/decisions.jsonl`. |
| Tier System | `lib/tier.js` + `lib/tier-gates.js` *(2026-04-24)* | `resolveTier()` precedence chain, `normalizeTierAndMode()` repair-on-read. `famtastic_mode` is now a derived boolean, not a stored toggle. Three gate helpers (`getLogoSkeletonBlock`, `getLogoNoteBlock`, `shouldInjectFamtasticLogoMode`) extracted from server.js for testability. |
| Site Creation | `createSite(brief, options)` in server.js *(2026-04-25)* | Canonical site-creation path. Caller-owned auth, helper-owned TAG switch, three `on_collision` modes gated by same-business identity comparison. JSDoc captures all four invariants. |
| Brief Extraction | `extractBriefFromMessage` in server.js *(2026-04-25)* | Returns `{ status: 'extracted', extraction_method: 'proper_noun'\|'type_location_synthesis', brief }` or `{ status: 'insufficient_identity', reason, clarification_question, raw_message }`. No more silent "New Business" / "site-new-site" fallback. |
| Build Trigger | `triggerSiteBuild(ws, spec)` in server.js *(2026-04-25)* | Canonical build dispatcher. Gates on WS client presence BEFORE dispatch. Used by both Studio Chat (`new_site_create` case) and Shay Desk (`handleShayBuildRequest`). |
| Client Interview | `lib/client-interview.js` | Pre-build Q&A: quick (6q) / detailed (11q) / skip. Revenue model question (q_revenue) is second question. `REVENUE_MODEL_OPTIONS` + `getRevenueBuildHints()`. `suggestion_chips` in formatted questions. |
| Surgical Editor | `lib/surgical-editor.js` | DOM-aware HTML surgery via cheerio. `buildStructuralIndex()`, `extractSection()`, `surgicalEdit()`, `trySurgicalEdit()`. Pure functions, no side effects. |
| HTML Skeletons | `lib/famtastic-skeletons.js` | `HERO_SKELETON_TEMPLATE` (BEM double-dash vocabulary), `LOGO_SKELETON_TEMPLATE` (nav logo wiring), `LOGO_NOTE_PAGE` (parallel page logo reference), `NAV_SKELETON` (mandated nav class names). `FAMTASTIC_DEFAULT_PALETTE` (5 hex values: primary `#00A79D`, accent `#F5B800`, navy `#001F3F`, coral `#FF6B6B`, background `#FDF4E3`). |
| Build DNA | `famtastic-dna.md` | Auto-updated by `updateFamtasticDna()` after every build. Cross-session build memory injected via CLAUDE.md `@famtastic-dna.md`. |
| Brain Verifier | `lib/brain-verifier.js` | Startup API probes for all 3 APIs + Codex CLI. Results cached, served via `/api/brain-status`. |
| Capability Manifest | `lib/capability-manifest.js` | `buildCapabilityManifest()` checks all env vars + CLI. `checkNetlify()` returns structured `{ ok, reason, details }` *(2026-04-25)*. Also reports Studio-owned service auth states for Resend, Studio email notifications, database, Netlify, cPanel, and DNS from platform vault/config refs. |
| Backend | Node.js + Express 4.21 | HTTP server, REST API, WebSocket. Single file: `site-studio/server.js` (~18,400 lines after baseline closure). |
| Frontend | Single HTML file + Tailwind CDN + CSS/JS files | `site-studio/public/index.html`. VS Code-inspired layout. Brain/Worker split panel. CSS: `public/css/` (8+ files). JS: `public/js/`. |
| Workbench Foundation Prototype | Static HTML + component CSS/JS, embedded in Studio | `site-studio/public/workbench-foundation.html`, `public/css/workbench-foundation.css`, `public/js/workbench-foundation.js`, `public/data/workbench-workspaces.json`, plus `#tab-pane-workbench` in `site-studio/public/index.html`. Follows the frozen seven-domain left rail (Sites, Brainstorm, Plans, Components, Media, Research, Admin), contract strip, collapsible domain object navigator, dynamic center workbench, live preview with translucent metadata/Shay/evidence overlays, registry-backed Plan mode, prompt-first Media Studio surface, contextual draggable/reorderable tool shelf with persisted order, bottom runs/logs/trace/approvals/proof panel, theme tokens, and modal shell. Registers `workbench.foundation` with `ShayContextRegistry`; actual Shay-Shay UI proof confirms `context.page_context` includes Workbench domain/object state. Linked from production Studio but not yet the default shell. |
| CSS (generated sites) | Tailwind CSS via CDN + `assets/styles.css` | Zero build step. CSS custom properties from spec colors. STUDIO LAYOUT FOUNDATION block injected by post-processor. |
| Event Bus | Node.js EventEmitter | `site-studio/lib/studio-events.js` singleton with 10 namespaced events. |
| API Telemetry | `site-studio/lib/api-telemetry.js` | Per-call SDK cost tracking. `logAPICall()` writes to `sites/<tag>/sdk-calls.jsonl`. |
| Cost Tracker | `site-studio/lib/api-cost-tracker.js` | `calculateCost(model, inputTokens, outputTokens)`. Rates for claude-sonnet, claude-haiku, gpt-4o, gpt-4o-mini, gemini-2.5-flash. `codex-cli` at $0. |
| Brain Sessions | `site-studio/lib/brain-sessions.js` | `initBrainSessions()` auth probe at startup. `getOrCreateBrainSession()` for persistent multi-turn. `resetSessions()` on site switch. |
| Model Config | `site-studio/lib/model-config.json` | Canonical model registry. |
| Font Registry | `site-studio/lib/font-registry.js` | 5 hand-tuned font pairings + vertical→pairing map. |
| Layout Registry | `site-studio/lib/layout-registry.js` | 5 layout variants + vertical map. |
| Multi-Layer Hero CSS | `site-studio/public/css/fam-hero.css` | 7-layer hero composition vocabulary. Auto-linked by head-guardrail. |
| Worker Queue | `.worker-queue.jsonl` | `dispatch_worker` tool writes task entries. No live consumer. Startup cleanup removes terminal-status and 7d-old entries. Visibility badge in sidebar polled every 15s. |
| Workflow Stage Catalog | `site-studio/lib/workflow-stage-catalog.json` | Catalog-only workflow-as-data phase 1. Declares build stage IDs, boundaries, inputs, outputs, and proof events without changing execution order. |
| Context Writer | `site-studio/lib/studio-context-writer.js` | Generates `STUDIO-CONTEXT.md` per site on every studio event. 10 sections. |
| Brain Injector | `site-studio/lib/brain-injector.js` | Per-brain context injection. Claude: `@-include`. Gemini/Codex: sidecar file. `reinject()` on brain switch. |
| Research Registry | `site-studio/lib/research-registry.js` | 4 provider-agnostic research sources. Auto-effectiveness scoring from build metrics. Perplexity now preserves `citations`, `search_results`, `usage`, `cost`/`usage_cost`, request id, model, and status code under `meta`. |
| Research Router | `site-studio/lib/research-router.js` | Pinecone-first caching, 90-day staleness, background refresh via `REQUERY_QUEUE`. `queryResearch()` now handles skip-cache/forced-source paths without the previous `cached` scope bug and returns provider metadata. |
| FAMtastic Data Center | `lib/famtastic/data-center/index.js` + `~/famtastic/data-center/` | Local filesystem substrate for research jobs, media-generation jobs, component-reuse proof jobs, ledgers, witness rows, sanitized events, source/claim/decision/proof artifacts, and capture-box ingestion from `captures/inbox/` + `captures/review/`. |
| Mission Control Reader | `lib/famtastic/mission-control/index.js` + `scripts/mission-control-report.js` | Local reader/projection over Data Center research jobs, media generations, component reuse proofs, witness checks, claims, decisions, needs-Fritz, stale/blocked, proofs, and raw capture counts. Human and JSON CLI output; no second store. |
| Media Studio Wrapper Foundation | `media-studio/lib/index.js` + `media-studio/model-aliases.json` + `scripts/media-studio-plan.js` | Safe zero-spend MuAPI planning layer. Resolves model aliases/fallbacks, hashes prompts, creates Data Center `media_generation` jobs, writes `generation-proof.json`, and appends sanitized `media-assets` ledger rows. Paid generation remains gated. |
| Component Studio Wrapper Foundation | `lib/famtastic/component-studio/index.js` + `scripts/component-studio-search.js` | Search-before-build substrate. Merges `components/library.json` with manifest-only component folders, searches by query/type/group, emits reusable build context, creates Data Center `component_reuse` proof jobs, and appends sanitized `component-reuse` ledger rows. |
| Second Brain Export | `lib/famtastic/second-brain/index.js` + `~/famtastic/second-brain/` | Projects Data Center research jobs into Markdown notes and Obsidian canvas-style graph files for visual/readable review. |
| WebSocket | `ws` 8.18 | Real-time: chat, build progress, preview reload, brain-changed, brain-status, brain-fallback, set-brain-model, site-switched (now triggers chat session-break divider). |
| Deploy | Netlify CLI (primary), Cloudflare Wrangler, Vercel CLI | `scripts/site-deploy`. `runDeploy()` now runs `checkNetlify()` preflight before flag mutation, has `child.on('error')` handler, parses stderr for known patterns, resets `deployInProgress` on every early-return. |
| Testing | Vitest 4.1.1 + Node assert scripts | Focused current Wave 6 proof passes `tests/component-studio-tests.js`, `tests/mission-control-tests.js`, `tests/media-studio-wrapper-tests.js`, `node scripts/component-studio-search.js --query 'cinematic hero with video background and CTA' --type hero --json`, `node scripts/plans/audit.js`, and `git diff --check`; earlier research-router, ingest, witness/autopilot, and second-brain focused proof remains valid. Broad Site Studio unit execution is currently blocked by missing `site-studio/public/js/shay-bridge-client.js`. |
| Config | `~/.config/famtastic/studio-config.json` | Model, deploy target/team, email/SMS creds, upload limits, stock photo API keys, `hero_full_width`, `service_auth` non-secret vault refs, and `notifications.email` for Studio-owned Resend notifications. |
| Platform Service Auth | `platform/capabilities/studio/` | `bootstrap-services.sh` checks/migrates Studio-owned provider auth into platform vault refs; `configure-resend.sh` configures Studio notification email; `send-test-email.sh` proves Studio can send; `provision-site.sh` verifies generated sites consume Studio-owned DB/email/deploy services and emits proof packets. |
| CLI | Bash (`scripts/fam-hub`) | Unified dispatcher: `site`, `idea`, `agent`, `admin`, `convo`, `ingest`, `research`, `plan`, `task`, `run`, `report`, and `platform` subcommands. `fam-hub platform bootstrap-services`, `configure-resend`, `send-test-email`, and `provision-site <site>` expose Studio service auth. |

---

## End-to-End Pipeline

**Step 1 — Launch.** `fam-hub site new <tag>` starts `server.js` (managed by launchd as `com.famtastic.studio`), opens browser, creates `sites/<tag>/`, writes initial `STUDIO-CONTEXT.md`, probes all 3 APIs via `verifyAllAPIs()`. Worker queue cleanup runs on startup. `readSpec()` runs `normalizeTierAndMode()` at every read so `tier` and derived `famtastic_mode` are always coherent.

**Step 2 — (Optional) Client Interview.** `POST /api/interview/start` → Q&A session → `client_brief` stored in spec.json.

**Step 3 — Site creation entry points.** Three paths now share the canonical `createSite(brief, options)` helper:
1. **`POST /api/new-site`** (Brief tab, programmatic) — `tag_source: 'caller_supplied'`, `on_collision: 'error'`.
2. **`runAutonomousBuild()`** (Shay-Shay autonomous) — `tag_source: 'extracted'`, `on_collision: 'update'`.
3. **`handleShayBuildRequest()`** (Shay Desk natural-language) — `tag_source: 'extracted'`, `on_collision: 'return_collision'`.
4. **Studio Chat `new_site_create` case** — same as Shay Desk path.

`createSite()` performs identity check first, directory creation, atomic spec write, TAG switch, cache invalidation, and WS notification. Different-business collisions ALWAYS return `'collision'` (or `'error'` for `on_collision: 'error'`) regardless of caller request — invariant guards against autonomous overwrites.

**Step 4 — Classification (Studio Chat).** Message arrives over WebSocket. `classifyRequest(message, spec)` runs gates in this order *(post-baseline-closure)*:
1. `new_site_create` — build phrase + identifiable target (proper noun OR business-type+location OR no active site) + no edit-language keywords + extracted target ≠ active spec.site_name.
2. Strong build signals.
3. Brief indicators.
4. Worker queue, brief edit, visual inspect, brand health, brainstorm, rollback, version history, summarize, data model, tech advice, template import, page navigation, git push.
5. **`!hasBrief` fallback** *(moved above deploy)* — unbriefed sites can't be hijacked by incidental "deploy" keyword.
6. Explicit commands (deploy, build/rebuild, query).
7. Asset generation, fill stock photos, content_update patterns (12), enhancement_pass, restyle, layout_update, bug_fix.

**Step 5 — Planning.** `handlePlanning()` for `new_site` / `major_revision` (brief editor only — does NOT create new sites). For `new_site_create`, the Studio Chat case runs the full chain inline.

**Step 6 — Build (Template-First).** `parallelBuild()` via `triggerSiteBuild()` shared dispatcher. `triggerSiteBuild` gates on WS client presence BEFORE any dispatch (corrects prior orphaned-job order).

**Step 7 — Post-build pipeline.** `runPostProcessing()` 9-step pipeline (slot extraction → reapply → blueprint → reconcile → applyLogoV → layout split → fixLayoutOverflow → syncContentFieldsFromHtml → buildStructuralIndex). Then `runBuildVerification(writtenPages)` — 6 file-based checks including `verifyRevenueAndState()`.

**Step 8 — Images, content edits, deploy.** Images via `fill_stock_photos`. Content edits via surgical editor. Deploy via `runDeploy()` with structured preflight + spawn error handling + stderr pattern parsing.

---

## Feature Map

### Core Engine

**Request Classifier (post-baseline-closure)** — `classifyRequest(message, spec)`. New `new_site_create` intent at the top precedence gate. `!hasBrief` fallback moved above the deploy keyword gate. `conversational_ack` first. 12 `content_update` patterns. Default fallback: `content_update`. Plan-gated: `layout_update`, `major_revision`, `build`, `restructure`. `restyle` routes to `handleChatMessage`. `new_site_create` is NOT plan-gated — handled inline in the WS switch.

**Site Creation Contract** *(2026-04-25)* — `createSite(brief, options)` is the single canonical site-creation path. Caller-owned auth (each entry point applies its own gate). Helper-owned TAG switch + WS notify on success path. `on_collision`: `'error'` (returns error_code: 'tag_exists'), `'update'` (same-business → updated_existing; different-business → still 'collision'), `'return_collision'` (same → updated_existing; different → 'collision'). Identity check uses `normalizeBizName` (lowercase, strip punctuation, strip noise words from `IDENTITY_STRIP_WORDS` set) and `checkSameBusinessIdentity()`.

**Brief Extraction** *(2026-04-25)* — `extractBriefFromMessage(text)` four-step logic: (1) Claude JSON extraction with meaningful-name + non-generic-tag check, (2) pattern-based proper-noun cluster (`extractBriefPatternBased`), (3) type+location synthesis via `tryTypeLocationSynthesis` for prompts like "a church in Atlanta" → tag `site-church-atlanta`, (4) insufficient_identity with `clarification_question`. `GENERIC_BUSINESS_TYPES` and `GENERIC_TAG_BLOCKLIST` ensure no silent fallback to "New Business" / "site-new-site".

**Build Trigger** *(2026-04-25)* — `triggerSiteBuild(ws, spec)` gates on WS clients before dispatch. Used by Studio Chat (`new_site_create` case) and Shay Desk (`handleShayBuildRequest`). Returns `{ triggered: boolean, reason?: 'no_ws_clients'\|'dispatch_error', error? }`. Real `ws` is used when provided; otherwise constructs a mockWs that broadcasts to all connected clients.

**Tier System** *(2026-04-24)* — `spec.tier` ('famtastic' | 'clean') is the canonical field. `famtastic_mode` is derived. `resolveTier(sources)` precedence: `explicit_request_tier > client_brief_tier > extracted_brief_tier > existing_spec_tier > 'famtastic'`. Invalid values at any slot are SKIPPED with `tier_normalization_warning` rather than corrupting an existing Tier-A spec. `normalizeTierAndMode()` runs at every readSpec — write-on-read repair pattern.

**Conversational Ack** — `getAckResponse(spec)` returns a contextual next-step suggestion. Zero API calls.

**Brain Routing Gate** — Before classifier: when `currentBrain !== 'claude'` and non-build intent → `handleBrainstorm()`.

**Content Data Layer** — `data-field-id` + `data-field-type` + `data-section-id` in all generated HTML. Surgical replacement via cheerio. `mutations.jsonl` logs every edit.

**DOM-aware Surgical Editor** — `lib/surgical-editor.js`. `buildStructuralIndex()` runs after every build. `extractSection()` + `surgicalEdit()` enable targeted section editing.

**Layer 0 Data Sources** *(Session 16)*: Gap Logger, Suggestion Logger, Brand Tracker, Deploy History, Agent Cards, Brief Corrections, Capability Manifest.

**Shay-Shay Seed** *(Session 16)* — `POST /api/shay-shay` orchestrator endpoint. Tier 0 deterministic routing. Tiers 1-3 AI via `callSDK()`. **Shay Desk full build chain** *(2026-04-25)* — `handleShayBuildRequest` async chain (auth → extract → createSite → synthesize → triggerSiteBuild) returns `shay_response` action.

**Tool Calling (Claude-only)** — `ClaudeAdapter._executeBlocking()` handles tool loop. `MAX_TOOL_DEPTH=3`. Tools: `get_site_context`, `get_component_library`, `get_research`, `dispatch_worker`, `read_file`. Gemini/OpenAI never receive tools.

**Client Interview + Revenue Architecture** — see Tech Stack. `buildPromptContext()` injects `REVENUE ARCHITECTURE` block.

**HTML Skeletons** — `lib/famtastic-skeletons.js`. BEM double-dash vocabulary enforcement. `FAMTASTIC_DEFAULT_PALETTE` injection on builds without client colors *(GAP-1 closed 2026-04-24)*.

**Deploy with Structured Failure Reasons** *(2026-04-25)* — `runDeploy` async with `await checkNetlify()` preflight before `deployInProgress` flag is set. `child.on('error', ...)` for spawn failures. `parseDeployStderr()` for known patterns (not-logged-in, network, site-id, permission, quota). `settle()` invariant resets `deployInProgress` on every early-return path.

### Three-Brain Ecosystem

**Brain Verifier** — `lib/brain-verifier.js`. Probes all 3 APIs at startup. `verifyAllAPIs()` runs concurrently. Results cached. `GET /api/brain-status` serves cached state.

**Brain/Worker Panel** — Brains: Claude/Gemini/OpenAI. Workers: claude-code/codex-cli/gemini-cli. Per-brain model selector dropdown.

**`ws.brainModels`** — Per-connection model overrides. Updated via `set-brain-model` WS message.

### Universal Context System

**`studio-events.js`** — Singleton EventEmitter. 10 events: `session:started`, `site:switched`, `build:started`, `build:completed`, `edit:applied`, `component:inserted`, `deploy:completed`, `brain:switched`, `research:updated`, `mode:changed`.

**`studio-context-writer.js`** — Regenerates `STUDIO-CONTEXT.md` on any event. 10 sections. CONTEXT_CACHE 30s TTL.

**`brain-injector.js`** — Per-brain context injection. `reinject()` on brain switch.

### Research Intelligence System

**`research-registry.js`** — 4 sources (gemini_loop, build_patterns, manual, perplexity). Effectiveness scoring persisted to `.local/research-effectiveness.json`. Perplexity reads `PERPLEXITY_API_KEY` or `PPLX_API_KEY` from process env and returns answer text plus source metadata (`citations`, `search_results`, `usage`, `cost`/`usage_cost`, request id, model, status code) without printing secrets.

**`research-router.js`** — Pinecone-first (configurable threshold, default 0.75), 90-day staleness with background refresh via `REQUERY_QUEUE`. `queryResearch()` now declares `cached` at function scope, returns `stale:false` for fresh cache hits, preserves provider metadata, and no longer fails for `skipCache:true` or `forceSource`.

**Data Center foundation** — `lib/famtastic/data-center/index.js` creates the `~/famtastic/data-center/` directory tree (`sources/`, `jobs/`, `ledgers/`, `witness/`, `claims/`, `citations/`, `decisions/`, `artifacts/`, `graphs/`, `reports/`, `schemas/`, `cache/`, `exports/`), creates per-job folders, appends sanitized JSONL records, lists the existing `captures/inbox/` rather than duplicating capture, supports append-only capability witness rows through `appendWitnessRecord()` / `readWitnessRecords()`, ingests the raw capture box into source records via `ingestCaptureSources()`, and stores claim/decision records with explicit source/spec linkage. `scripts/research-job.js` runs a research query, writes `research-events.jsonl`, `outputs/research-proof.json`, and `report.md`. `scripts/witness-check.js` runs bounded local witness checks and records baseline comparisons. `scripts/data-center-ingest.js` is the local Wave 3 ingestion runner with `--dry-run` and `--json`.

**Second Brain projection** — `lib/famtastic/second-brain/index.js` exports Data Center jobs into `second-brain/Research/*.md` and `second-brain/Canvases/*.canvas` for readable/visual review. The initial live proof jobs are `perplexity-metadata-preservation-proof`, `swarm-worker-a-research-synthesis-structure`, and `swarm-worker-b-research-shaped-sdd`.

**Wave-run autopilot** — `lib/famtastic/autopilot/index.js` classifies recent step/tool/event summaries as `productive`, `suspicious`, or `stuck` using deterministic thresholds over success rate, action diversity, and repeated action streak. This is currently a status-only local utility for later Mission Control/Desktop surfacing, not a controller that stops processes.

**Mission Control reader** — `lib/famtastic/mission-control/index.js` exports `buildMissionControlSnapshot(options)`, which reads Data Center jobs, witness JSONL, claims, decisions, ledgers, job outputs, and raw capture inbox counts to derive a status/proof snapshot. `scripts/mission-control-report.js` renders the snapshot as human terminal output or JSON. It is reader/projection code only; derived stale/blocked/needs-Fritz flags are not written back to Data Center records.

### Studio Chat UI

**Chat Session-Break Divider** *(2026-04-25)* — `addChatSessionBreak(label, opts)` in `index.html` inserts a styled divider into `#chat-messages` on TAG change (via `handleSiteSwitch`) and on WS reconnect (via `ws.onopen` after `/api/config` resolves). Dedupe via `__lastChatBreakTag` and `__lastChatBreakKey`. CSS: `.chat-session-break` in `studio-chat.css`.

### Command Center / Mission Control *(2026-06-02)*

**Command Center generator** — `scripts/command-center/build-command-center.js` (no deps). Read-only aggregator over the live ledgers (registry, tasks, runs, proofs, agents, capabilities, sites) that emits `command-center/{index.html, briefing.md, state.json}`: a mobile-first dashboard (Chart.js CDN — plan-health doughnut + autonomy×profit quadrant), a "Virtual Fritz" daily briefing, and a machine snapshot. Per-plan it derives **stage / momentum / autonomy / profit**; scoring is tunable in the `SCORING` constant. Tracked as plan `mission-control-command-center`. This is the visual cockpit the "Mission Control visual orchestration" gaps called for, built as an independent ledger reader (see Known Gaps: reconcile with `buildMissionControlSnapshot()`).

**Shay billing capability** — `platform/capabilities/billing/{generate-invoice,list-invoices,mark-paid}.sh` + `invoice-spec.schema.json`. Real invoice generation (math, numbering, ledger state machine); send/PDF/payable-link are `manual_required` pending a payment-provider decision. Registered in `platform/registry/capabilities.json` as `billing.*`.

**Shay work-ops capability** — `platform/capabilities/work/{draft-ticket-reply,draft-standup,outbox}.sh`. Drafts Jira replies and team standups (the latter reads `runs.jsonl`/`tasks.jsonl`) with a hard human-approval-before-send gate; send is `manual_required` pending vaulted `jira.*`/`slack.webhook`. Registered as `work.*`. Roadmap: `docs/shay-fritz-ready/ROADMAP.md`.

---

## API Endpoints (Full)

### Core Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/new-site` | Refactored 2026-04-25: thin wrapper around `createSite()`. Returns `{ success: true, tag }` on create or `{ error, error_code: 'tag_exists' }` on collision. |
| POST | `/api/sync-content-fields` | Scan HTML for data-field-id → spec.content[page].fields[] |
| GET | `/api/content-fields/:page` | List all fields for a page |
| POST | `/api/content-field` | Surgical field update (no AI), global cascade |
| POST | `/api/components/export` | Export component with version bump + skill sync |
| GET | `/api/image-suggestions` | Contextual query chips from spec.design_brief |
| POST | `/api/research/trigger` | Create vertical research stub (idempotent) |
| POST | `/api/research/to-brief` | Extract brief text from research file |
| GET | `/api/research/verticals` | 40+ known verticals + per-site researched list |
| POST | `/api/compare/generate-v2` | Codex→Claude fallback with HTML validation |
| GET | `/api/agent/stats` | Aggregated agent-calls.jsonl metrics |
| GET | `/api/agent/routing` | Intent→agent routing guide |
| GET | `/api/intel/report` | Full intelligence report |
| GET | `/api/intel/findings` | Findings only with severity counts |
| POST | `/api/intel/promote` | Promote finding to intelligence-promotions.json |
| POST | `/api/intel/dismiss` | Site-scoped dismiss — persists to `.dismissed-findings.json` |
| POST | `/api/intel/backlog` | Append finding to `.wolf/build-backlog.json` |
| POST | `/api/intel/run-research` | Create dated research stub |
| GET | `/api/context` | Return STUDIO-CONTEXT.md contents |
| POST | `/api/context` | Trigger manual context regeneration |
| GET | `/api/brain` | Current brain state |
| POST | `/api/brain` | Set active brain |
| GET | `/api/research/sources` | All research sources |
| GET | `/api/research/effectiveness` | Effectiveness report |
| POST | `/api/research/query` | Query research |
| POST | `/api/research/rate` | Rate a research result |
| GET | `/api/research/seed-status` | Pinecone seed status |
| GET | `/api/research/threshold-analysis` | Threshold calibration |
| GET | `/api/telemetry/sdk-cost-summary` | SDK call cost summary per session |
| GET | `/api/brain-status` | Live API verification state |
| GET | `/api/worker-queue` | Worker queue entries |
| POST | `/api/interview/start` | Start or resume client interview |
| POST | `/api/interview/answer` | Submit answer, get next question |
| GET | `/api/interview/status` | Interview state snapshot |
| GET | `/api/interview/health` | Interview system health check |
| GET | `/api/capability-manifest` | Live capability state (env checks + CLI availability) |
| POST | `/api/shay-shay` | Shay-Shay orchestrator. Tier-0 dispatcher now intercepts `build_request` BEFORE `handleShayShayTier0` and awaits `handleShayBuildRequest`. *(2026-04-25)* |
| POST | `/api/shay-shay/gap` | Explicit gap capture endpoint |
| POST | `/api/shay-shay/outcome` | Suggestion outcome scoring |
| POST | `/api/autonomous-build` | Trigger `runAutonomousBuild` (refactored to use `createSite`). |

**Route ordering rule:** Static routes must be declared BEFORE parameterized routes of the same prefix.

---

## Known Gaps

### Shay Desktop Electron gaps (2026-05-19)

- `/Applications/Shay Desktop.app` is installed and launches, but screen-by-screen API compatibility with Shay-Shay still needs verification. In particular, the app expects the upstream Hermes-compatible local API shape at `http://127.0.0.1:8642`; Chat, Providers, Models, Skills, Memory, Schedules, Gateway, and Sessions should each be checked against the current `~/famtastic/shay-shay` backend before calling the desktop integration complete.
- Office/Claw3D source builds but was not started or verified at runtime during the install pass.
- Internal Electron code keeps many `HERMES_*` compatibility names, `hermesAPI`/IPC names, and a `src/renderer/src/assets/hermes.png` filename even where the visible app is Shay-branded. Non-English READMEs and upstream docs still describe Hermes.
- The installed macOS app is ad-hoc signed for local use and not packaged/notarized as a production DMG.
- The temporary dark-glass `SS` icon should be replaced after the real FAMtastic/Shay logo exists.

### Platform Refresh v2 reconciliation gaps (2026-05-11)

- The original Platform Refresh v2 docs and newer `/studio.html` implementation branch are not yet merged into one working tree. Future feature work must inspect or merge `origin/research/studio-intelligence-foundation-20260508` before proceeding.
- Fritz still needs to confirm whether the 12-section Studio IA fully supersedes the old seven-domain R1 nav in all current docs.
- `FIRST-BUILD-SEQUENCE.md` is first-wave substrate guidance, not the full current completion plan for the newer Studio implementation.
- The exact Phase 1/2/3 action wiring report filenames from the web-session handoff were not found on the inspected branch and require verification.


### Open

| Gap | Priority | Detail |
|-----|----------|--------|
| Site Studio quality-flow broker | Tier 1 | Wave 7 injects the research-first/cross-studio contract into `buildPromptContext()`, but the full request broker is not built yet: Site Studio cannot yet create/await structured Research/Media/Component jobs and receive returned assets/components/proof as first-class build inputs. |
| Phase 2 Visual Workflows & Brand Systems | Tier 1 | Backend/foundation waves are complete enough to move into product workflows, but Media Studio logo/brand screens, Site Studio build/edit/enhance screens, Component Studio screens, Mission Control visual orchestration, Data Center/Research Center UI, and Shay Desk Office integration are not designed/built yet. |
| Data Center capture promotion | Tier 1 | Data Center can list the existing `captures/inbox/` and write research jobs/ledgers, but it does not yet promote captures into claims, citations, decisions, specs, or second-brain notes automatically. |
| Native shared research ownership | Tier 1 | `lib/famtastic/research/index.js` still proxies Site Studio research. The shared platform should eventually own research routing directly so Site, Media, Component, and Shay consume the same substrate. |
| Mission Control Desktop/cockpit UI | Tier 1 | Wave 4 ships the local Mission Control library/CLI reader, but no live Studio/Desktop cockpit consumes `buildMissionControlSnapshot()` yet. |
| Mission Control live autopilot feed | Tier 1 | `lib/famtastic/autopilot/index.js` exists, but Mission Control cannot summarize live run health until real run-event traces are ingested into Data Center. |
| Mission Control broader proof index | Tier 2 | Wave 4 proof discovery starts with Data Center job outputs and proof-like Data Center ledger rows; older root proof ledgers and cross-system proof files still need a fuller index. |
| Perplexity cost normalization | Tier 2 | Perplexity proof preserved raw `usage`; follow-up should normalize nested `usage.cost` into a first-class cost field when present and keep null when unavailable. |
| Site Studio broad unit-suite blocker | Tier 2 | Focused research-router tests pass, but `npm test -- --run tests/unit.test.js tests/research-router.test.js` currently fails before execution because `site-studio/public/js/shay-bridge-client.js` is missing. |
| Build auto-fires from Shay Desk without confirmation | Tier 1 | New finding 2026-04-25. `handleShayBuildRequest` runs the full chain synchronously with no human-in-the-loop checkpoint. Logged as `bug-shay-auto-build-no-confirmation-2026-04-25`. Tracked in outstanding plan. |
| Generated site has broken header links | Tier 1 | New finding 2026-04-25. Post-baseline-closure church build has nav links that don't navigate correctly. Logged as `bug-broken-header-links-2026-04-25`. Investigation deferred to next session. |
| Revenue path (end-to-end) | Tier 1 | Client preview URL + payment (PayPal) + domain provisioning + approval flow. Reunion site (mbsh96reunion.com, July 12 deadline) is the first end-to-end exerciser. |
| Shay-Shay Mem0/Kuzu integration | Tier 1 | Persistent memory layer not yet wired. Episodic/semantic/procedural memory schemas defined but not connected to Mem0 MCP. |
| Shay Developer Mode (full UX) | Tier 1 | `authorizeShayDeveloperAction` is wired into `runAutonomousBuild` and `handleShayBuildRequest` but the explicit UI for trust-mode toggling, scoped permissions, approval flow, and audit trail is not yet built. |
| Schema audit follow-up (colors/pages) | Tier 2 | Pre-existing required-field mismatch tracked in `architecture/2026-04-24-schema-audit-followup.md`. Three resolution options scoped, not chosen. |
| V2 BuildIntent Phases 1-4 | Tier 1 | Interpreter in isolation, extractBriefFromMessage wiring, handlePlanning replacement, Shay-Shay routing unification. Tracked in outstanding plan. |
| Brand drift intelligence promotion | Tier 2 | Brand tracker logs drift to console. Not yet promoted to intelligence-promotions.json. |
| Agent cards not loaded by brain router | Tier 2 | Files exist but brain router still uses hardcoded config. |
| Pinecone + Perplexity firing on every build | Tier 2 | Nominally called per build but in-the-wild verification spotty. Outstanding plan #12. |
| FAMtastic-applied research query composer | Tier 2 | Research is generic by vertical; not yet FAMtastic-applied. Outstanding plan #13. |
| Conversation-based learning capture | Tier 2 | Captured Wizard-of-Oz orchestration decisions need a substrate to feed V2 Phase 1. Outstanding plan #14. |
| Worker queue consumer | Tier 2 | `.worker-queue.jsonl` has no live consumer process. |
| Detailed interview mode UI | Tier 3 | 10-question detailed mode works via API only. |
| Brain routing in build path | Tier 2 | Build/content-edit paths use Anthropic SDK (Claude only). Non-Claude brains only work for chat/brainstorm. |
| Mission Control / Platform dashboard | Tier 2 | No multi-site management UI beyond CLI. |
| Template upload mode | Tier 2 | Uploading pre-built templates for Studio to tweak. |
| Pinecone zero-vectors | Tier 3 | All Pinecone vectors use placeholder zero-vectors. |
| seed-pinecone --vertical flag | Tier 3 | Add `--vertical <name>` for per-build auto-seeding. |
| server.js decomposition | Tier 3 | ~18,400 lines after baseline closure. Plan: thin assembler + modules in lib/. |
| Deferred Tier-1 hot list (UX polish) | Tier 3 | Shay Desk chat scroll, max-width, redundant buttons. Batch in dedicated UI session per outstanding plan. |
| Plan packets / multi-agent plan board | Tier 1 | File-based first plan exists at `plans/plan_2026_05_04_shay_process_intelligence/`, and file-backed task/run/proof ledgers are now populated. Studio still has no first-class Plan Builder / Plan Board UI, no SQLite `plan_id` / `workstream_id` fields, and no automatic conversion from captured conversation to grouped jobs. |
| Workflow-as-data instrumentation | Tier 1 | Phase 1 catalog exists at `site-studio/lib/workflow-stage-catalog.json`, and `parallelBuild()` now emits durable trace events for start, page inventory, template, page fanout/write/failure boundaries. Declarative execution refactor remains open. |
| Process Map / Recipe Map visualization | Tier 1 | Build trace and workflow catalog foundations exist, but no visual surface yet shows recipe steps, run traces, decision provenance, provider/model choices, token/cost details, research refs, verification, and follow-up jobs. |
| Workbench default shell cutover | Tier 1 | The production-linked Workbench prototype now follows the frozen seven-domain contract and has Playwright proof, but it is not yet the default Studio shell. |
| Workbench live registry generation | Tier 1 | Workbench Plan mode now reads `site-studio/public/data/workbench-plan-state.json`, a browser-safe mirror of registry/task/run/proof state. Automatic generation from source ledgers is still missing. |
| Media Studio unification | Tier 2 | Workbench has a prompt-first Media Studio surface and production Studio has the richer mini-app in `studio-screens.js`; generation/provider controls are not unified between them yet. |
| Studio notification sender domain | Tier 2 | Site Studio can send through Resend now, but the configured sender currently uses `studio@send.mbsh96reunion.com` because it is the only verified Resend sending domain. Verify `send.famtastic.com` or another FAMtastic-owned sending domain for long-term platform notifications. |
| MBSH movie-experience structure | Tier 1 | RSVP Phase 4 is complete locally with the approved Preview-B base preserved, subtle atmosphere/interaction polish added, mobile proof cleaned up, and the rectangular bleed-spill artifact removed; staging is still awaiting Fritz inspection. Remaining movie-experience work is the broader interior-page rollout/polish from `captures/inbox/mbsh-page-structure-unified-assessment-2026-05-12.md` and `captures/inbox/mbsh-page-by-page-experience-assessment-2026-05-12.md`: clone the RSVP recipe only after approval, then refine Tickets/Through the Years/In Memory/Capsule/Playlist, Usher info panels, section slot/height grammar, In Memory emotional page, form wow-factor upgrades, mobile verification, staging, and committee presentation. |
| MBSH runtime endpoint execution | Tier 1 | Backend inventory and browser-level RSVP/sponsor submission proof are complete. Runtime execution now depends on Studio-managed service provisioning: vaulted Studio Resend/cPanel/site DB refs exist, but production `API_BASE_URL` remains `null` until backend origin generation, cPanel DNS/addon-domain automation still needs wrapper coverage or manual UI, and SSH host-key trust blocks backend deploy/smoke. |
| MBSH archival/crowd-sourced media replacement | Tier 2 | Launch-safe generated/derivative story assets now exist and have a rights manifest. Future real archival/crowd-sourced replacements still need source attribution, permission, and approval logging before publishing. |
| Pipeline visualizer depth | Tier 1 | Workbench phase 1 renders inspect/trace/propose from the workflow catalog and trace API. Stage/event matching, missing-stage detection, and proposed patch preview are still missing. |
| Command Center reconciliation | Tier 1 | New 2026-06-02. `scripts/command-center/build-command-center.js` reads the ledgers directly rather than through the existing `lib/famtastic/mission-control/index.js` `buildMissionControlSnapshot()`. Two readers of the same data is exactly the parallel-implementation smell the 2026-05-05 rule warns against — reconcile so one is the source (prefer the generator consuming the snapshot, or the library consuming the generator's `state.json`). |
| Command Center delivery surfaces | Tier 1 | New 2026-06-02. The generator runs manually only — no `fam-hub command-center` command, no regen cron, not served via Studio `/api/ops`, and no automatic phone delivery of `briefing.md`. Tracked as `mission-control-command-center` tasks 001-003. |
| Shay billing/work send paths | Tier 1 | New 2026-06-02. `billing.*` generates invoices and `work.*` drafts ticket replies/standups, but both stop at `manual_required`: billing needs a payment-provider decision (PayPal/Stripe/GoDaddy); work needs vaulted `jira.api_token`/`base_url`/`email` (+ optional `slack.webhook`). Tracked as `mission-control-command-center` tasks 004-005. Work drafting is also deterministic (no LLM rewrite pass yet). |

### Closed 2026-04-25 — Baseline failure closure

- **Site creation duplication** — `/api/new-site` and `runAutonomousBuild` had drifting site-creation logic; Studio Chat had no path to create new sites. Now: single canonical `createSite(brief, options)` helper used by all entry points.
- **Classifier deploy-keyword hijack** — `\bdeploy\b` at L10788 hijacked the church prompt before the `!hasBrief` fallback could fire. Now: `!hasBrief` moved above the deploy gate.
- **Studio Chat strong-build-signals brittleness** — Required exact word order, missed "build me a 3-page website for". Now: new `new_site_create` intent above strong build signals with flexible target detection (proper noun OR business-type+location OR no active site).
- **Silent "New Business" fallback** — `extractBriefFromMessage` silently produced `business_name: 'New Business'` and `tag: 'site-new-site'` for unparseable inputs. Now: returns `insufficient_identity` with clarification question.
- **`handlePlanning` wrong-site brief-write** — Routing `new_site` to `handlePlanning` when active site already had an approved brief would have written church content into accounting-firm spec. Now: Studio Chat `new_site_create` case bypasses handlePlanning and uses createSite directly. handlePlanning unchanged — remains brief-editor-only.
- **Orphaned build dispatch** — `runAutonomousBuild` dispatched build via `routeToHandler` BEFORE checking WS clients. Now: `triggerSiteBuild` gates on WS clients first; returns "Open Studio" message when no browser is connected.
- **Deploy invisible failures** — `runDeploy` swallowed Netlify auth/CLI failures behind a generic message. Now: `checkNetlify()` returns structured `{ ok, reason, details }`; preflight runs before flag mutation; `parseDeployStderr` parses known failure modes.

### Closed 2026-04-24 — Build layer GAP-1/2/3 + GAP-4 (R-NEW audit)

- **GAP-1: No FAMtastic default palette** — `buildPromptContext()` `visualRequirements` block now injects `FAMTASTIC_DEFAULT_PALETTE` (5 hex values) when no client colors are specified.
- **GAP-2: `heroSkeleton` dead variable on single-page path** — `handleChatMessage()` destructure and prompt string now include `heroSkeleton` (gated to `build`/`layout_update`).
- **GAP-3: `navSkeleton` dead variable on single-page path** — same fix; `navSkeleton` injected unconditionally into single-page prompt. All five mandated nav class names preserved.
- **GAP-4: `spec.famtastic_mode` tacit toggle never set by code** — Promoted `spec.tier` to canonical with precedence chain. `famtastic_mode` is now derived. `normalizeTierAndMode()` runs on every readSpec.

### Closed in earlier sessions

See CHANGELOG.md and the prior version of this doc for Sessions 11/12/13/16/17/18 closures.

---

## File Inventory

### Strategic Documents

| File | Purpose |
|------|---------|
| `FAMTASTIC-VISION.md` | North star — empire model, scaling milestones, revenue path |
| `FAMTASTIC-STATE.md` | This file — canonical technical snapshot |
| `FAMTASTIC-SETUP.md` | Disaster recovery — Quick Start, MCP servers, env vars, dependencies |
| `SITE-LEARNINGS.md` | Authoritative technical reference. New section "Baseline Closure Lessons (2026-04-25)" — adversarial review value, implementation order, ownership contracts, identity checks, Wizard-of-Oz, classifier-keyword-collision class. |
| `CHANGELOG.md` | Chronological session summaries. |
| `famtastic-dna.md` | Auto-updated build knowledge — injected into every Claude session. |
| `docs/FAMTASTIC-VISION-CAPTURE-2026-04-24.md` | **CANONICAL VISION DOC.** 11-section vision audit + Adobe Pattern Addendum + Architectural Decision Log (Tier as Canonical, Site Creation Contract) + parking-lot sections (On Shay-Shay, Meta-Research, Context Architecture). |
| `docs/STUDIO-MASTER-PLAN.md` | Studio-first execution source of truth. Wave-based roadmap. |
| `docs/multi-agent-resumable-plan-system.md` | Plan-packet architecture for grouping conversation-derived initiatives into parallel, resumable workstreams across Codex, CLI, Cowork, Shay, and future agents. Defines lifecycle, job grouping, access scopes, handoff rules, Studio surfaces, capture modes, and enforcement rules. *(2026-05-04)* |
| `plans/plan_2026_05_04_shay_process_intelligence/` | First file-based plan packet. Captures the Shay process intelligence initiative as ten workstreams with machine-readable `plan.json` and human-readable `README.md`. *(2026-05-04)* |
| `architecture/2026-04-24-gap4-plan.md` | GAP-4 investigation + closure plan. |
| `architecture/2026-04-24-gap4-review-summary.md` | GAP-4 adversarial review verdict. |
| `architecture/2026-04-24-schema-audit-followup.md` | Pre-existing colors/pages required-field mismatch. Deferred. |
| `architecture/2026-04-25-baseline-failure-diagnostic.md` | Forensic diagnostic of the JJ B&A baseline failure. 6 sub-gaps mapped. |
| `architecture/2026-04-25-baseline-closure-verification.md` | 28/28 verification report. |
| `architecture/2026-04-25-outstanding-plan.md` | **WORKING ROADMAP.** Iterative plan forward — Immediate / Near-term / Medium-term / Longer-term parking lot + Principles to hold. |

### Core Application

| File | Lines | Purpose |
|------|-------|---------|
| `site-studio/server.js` | ~18,400 | Main backend. Express + WebSocket. Classifier (with `new_site_create` intent + reordered gates). `createSite()` helper, `handleShayBuildRequest`, `triggerSiteBuild`, `synthesizeDesignBriefForBuild`, `extractBriefFromMessage` (status-based), `runDeploy` (with preflight + spawn error + stderr parsing). All site-creation paths now go through `createSite`. |
| `site-studio/lib/tier.js` | ~80 | Tier canonicalization. `resolveTier(sources)` precedence chain, `normalizeTierAndMode(spec)` write-on-read. *(2026-04-24)* |
| `site-studio/lib/tier-gates.js` | ~40 | Pure gate helpers extracted from server.js: `getLogoSkeletonBlock`, `getLogoNoteBlock`, `shouldInjectFamtasticLogoMode`. *(2026-04-24)* |
| `site-studio/lib/capability-manifest.js` | ~115 | `checkNetlify()` returns structured `{ ok, reason, details }`. Exported for direct use by `runDeploy` preflight. |
| `site-studio/lib/gap-logger.js` | ~90 | Gap event logger. Auto-promotes at frequency ≥ 3. |
| `site-studio/lib/suggestion-logger.js` | ~90 | Suggestion outcome logger. Pattern promotion. |
| `site-studio/lib/brand-tracker.js` | ~80 | Brand token extractor. Drift detection. |
| `site-studio/lib/surgical-editor.js` | ~200 | DOM-aware surgical editor. |
| `site-studio/lib/famtastic-skeletons.js` | — | `HERO_SKELETON_TEMPLATE`, `LOGO_SKELETON_TEMPLATE`, `LOGO_NOTE_PAGE`, `NAV_SKELETON`, `FAMTASTIC_DEFAULT_PALETTE`. |
| `site-studio/lib/client-interview.js` | — | Client interview engine. |
| `site-studio/lib/brain-verifier.js` | — | Startup API verification. |
| `site-studio/lib/model-config.json` | — | Canonical model registry. |
| `site-studio/lib/studio-tools.js` | — | 5 Anthropic-format tools (Claude-only). |
| `site-studio/lib/tool-handlers.js` | — | Tool dispatch + path traversal sandbox. |
| `site-studio/lib/studio-events.js` | — | Singleton EventEmitter + 10 event constants. |
| `site-studio/lib/brain-interface.js` | — | Universal Studio-to-Brain communication. |
| `site-studio/lib/brain-adapter-factory.js` | — | `BrainAdapterFactory.create(brain)` → adapter. |
| `site-studio/lib/adapters/claude-adapter.js` | — | Anthropic SDK. Tool loop with `MAX_TOOL_DEPTH=3`. |
| `site-studio/lib/adapters/gemini-adapter.js` | — | Google Generative AI. |
| `site-studio/lib/adapters/codex-adapter.js` | — | OpenAI SDK. `gpt-4o`. |
| `site-studio/lib/brain-sessions.js` | — | Auth probe, session management. |
| `site-studio/lib/api-telemetry.js` | — | `logAPICall()`, cost tracking. |
| `site-studio/lib/api-cost-tracker.js` | — | `calculateCost(model, in, out)`. |
| `site-studio/lib/studio-context-writer.js` | — | STUDIO-CONTEXT.md generator. |
| `site-studio/lib/brain-injector.js` | — | Per-brain context injection. |
| `site-studio/lib/history-formatter.js` | — | Per-brain history format. |
| `site-studio/lib/research-registry.js` | — | 4 research sources; Perplexity metadata preservation. |
| `site-studio/lib/research-router.js` | — | Pinecone-first cache; fixed skip-cache/forced-source metadata path. |
| `lib/famtastic/data-center/index.js` | — | Data Center filesystem substrate, sanitized ledgers, job folders, witness rows, source ingestion, claim/decision records, capture inbox discovery. |
| `lib/famtastic/mission-control/index.js` | — | Mission Control reader/projection. `buildMissionControlSnapshot(options)` derives jobs, witness status, claims, decisions, needs-Fritz, stale/blocked, proofs, and raw capture counts from Data Center/capture outputs. |
| `lib/famtastic/second-brain/index.js` | — | Data Center to Markdown/canvas export layer. |
| `site-studio/lib/font-registry.js` | — | 5 vertical-aware font pairings. |
| `site-studio/lib/layout-registry.js` | — | 5 layout variants. |
| `site-studio/agent-cards/` | — | claude/codex/gemini .agent-card.json files. |
| `site-studio/shay-shay/skill.json` | — | Shay-Shay capability vocabulary. |
| `site-studio/shay-shay/instructions.md` | — | Shay-Shay behavioral contract. |
| `site-studio/public/index.html` | ~7,300 | Single-file frontend. `addChatSessionBreak()` helper, called from `handleSiteSwitch` and `ws.onopen`. |
| `site-studio/public/css/studio-base.css` | — | Resets, layout, typography. |
| `site-studio/public/css/studio-panels.css` | — | Three-panel layout, resizers. |
| `site-studio/public/css/studio-chat.css` | — | Chat panel, messages, plan cards. New `.chat-session-break` divider styling. *(2026-04-25)* |
| `site-studio/public/css/studio-sidebar.css` | — | Tabs, mode selector, status bar. |
| `site-studio/public/css/studio-modals.css` | — | Settings, upload, modal dialogs. |
| `site-studio/public/css/studio-terminal.css` | — | Terminal panel and toolbar. |
| `site-studio/public/css/studio-canvas.css` | — | Canvas panes. |
| `site-studio/public/css/studio-brain-selector.css` | — | Brain/Worker panel. |
| `site-studio/public/css/studio-orb.css` | — | Pip orb + Shay-Shay column styles. |
| `site-studio/public/js/brain-selector.js` | — | `BrainSelector` IIFE. |
| `site-studio/public/js/worker-queue-badge.js` | — | Worker queue badge polling. |
| `site-studio/public/js/studio-orb.js` | ~1,000 | Pip orb + Shay-Shay client. Falls through to `data.response` for `shay_response` action. |
| `site-studio/public/js/studio-shell.js` | — | Shell init, intel feed, site switcher. |
| `site-studio/.dismissed-findings.json` | — | Site-scoped intelligence dismiss store. |
| `.wolf/build-backlog.json` | — | Append-only build backlog. |
| `mcp-server/server.js` | 343 | MCP server. 4 tools via stdio JSON-RPC. |

### Test Suites

| Suite | Tests | Status |
|-------|-------|--------|
| `tests/unit.test.js` | 110 | Vitest. Pre-existing classifier + helper coverage + Part B tier parity tests. |
| `tests/gap4-tier-canonicality.test.js` | 28 | Vitest. V5 GAP-4 tier canonicality lockdown. *(2026-04-24)* |
| `tests/baseline-closure.test.js` | 23 | Vitest. NEW. classifier reordering, identity helpers, type+location synthesis. *(2026-04-25)* |
| `site-studio/tests/research-router.test.js` | 3 | Vitest. Research router regression coverage for skip-cache, forced source, and Perplexity metadata preservation. *(2026-05-19)* |
| `tests/data-center-tests.js` | script | Node assert coverage for Data Center directory creation, job folders, sanitized ledgers, capture/source ingestion, witness rows, and claim/decision linkage. *(2026-05-20)* |
| `tests/data-center-ingest-tests.js` | script | Node assert coverage for Data Center ingestion CLI argument parsing and human rendering. *(2026-05-20)* |
| `tests/witness-check-tests.js` | script | Node assert coverage for witness check registration and last-run baseline deltas. *(2026-05-19)* |
| `tests/autopilot-tests.js` | script | Node assert coverage for productive/suspicious/stuck wave-run classifier outputs. *(2026-05-19)* |
| `tests/mission-control-tests.js` | script | Node assert coverage for Mission Control reader/report behavior over temp Data Center fixtures: jobs, witness checks, claims, decisions, needs-Fritz, stale/blocked, proofs, raw capture counts. *(2026-05-20)* |
| `tests/second-brain-tests.js` | script | Node assert coverage for Markdown and canvas exports from Data Center jobs. *(2026-05-19)* |
| Legacy node-script suites | ~1,236 | In `tests/` folder. Not gating. Test runner: `npm test` runs vitest only. |

**Current focused proof:** `node tests/mission-control-tests.js`, `node tests/data-center-tests.js`, `node tests/data-center-ingest-tests.js`, `node tests/witness-check-tests.js`, and `node tests/autopilot-tests.js` pass; `node scripts/mission-control-report.js --json` parses and human output renders. Earlier focused research-router and second-brain proof remains valid. Broad Site Studio unit execution is currently blocked by missing `public/js/shay-bridge-client.js` before test execution.

### Key Functions (post-baseline-closure)

| Function | File | Purpose |
|----------|------|---------|
| `createSite(brief, options)` | server.js | Canonical site-creation helper. *(2026-04-25)* |
| `handleShayBuildRequest(message, context)` | server.js | Shay Desk full async build chain. *(2026-04-25)* |
| `triggerSiteBuild(ws, spec)` | server.js | Canonical build dispatcher. Gates on WS clients first. *(2026-04-25)* |
| `synthesizeDesignBriefForBuild(brief)` | server.js | Synthesize design_brief on active spec. Idempotent. *(2026-04-25)* |
| `extractBriefFromMessage(text)` | server.js | Returns status-based shape (extracted / insufficient_identity). *(2026-04-25)* |
| `tryTypeLocationSynthesis(text, baseBrief)` | server.js | Pattern → tag for "type in location" prompts. *(2026-04-25)* |
| `checkSameBusinessIdentity(a, b)` | server.js | Same-business comparison after noise-word stripping. *(2026-04-25)* |
| `normalizeBizName(name)` | server.js | Punctuation/noise-word strip helper. *(2026-04-25)* |
| `parseDeployStderr(stderr)` | server.js | Known-failure-pattern matcher for deploy errors. *(2026-04-25)* |
| `resolveTier(sources)` | lib/tier.js | Precedence-ordered tier resolver with invalid-skip semantics. *(2026-04-24)* |
| `normalizeTierAndMode(spec)` | lib/tier.js | Write-on-read tier/famtastic_mode repair. *(2026-04-24)* |
| `classifyRequest(message, spec)` | server.js | New `new_site_create` gate; `!hasBrief` moved above deploy. *(2026-04-25)* |
| `getAckResponse(spec)` | server.js | Zero-cost conversational ack. |
| `writeSpec(spec)` | server.js | Atomic spec.json write via .tmp + renameSync. |
| `routeToHandler(ws, requestType, userMessage, spec)` | server.js | Intent dispatch. |
| `runPostProcessing()` | server.js | 9-step pipeline after build. |
| `buildStructuralIndex()` | lib/surgical-editor.js | Scans DOM for sections/fields/slots. |
| `extractSection()` | lib/surgical-editor.js | Returns targeted node HTML. |
| `surgicalEdit()` | lib/surgical-editor.js | Cheerio DOM replacement. |
| `handleChatMessage()` | server.js | Primary SDK streaming handler. |
| `handleBrainstorm()` | server.js | Routes to selected brain. |
| `parallelBuild()` | server.js | SDK parallel page builds. |
| `updateFamtasticDna()` | server.js | Auto-updates famtastic-dna.md after every build. |
| `verifyAllAPIs()` | lib/brain-verifier.js | Concurrent probe of all 3 APIs. |
| `checkNetlify()` | lib/capability-manifest.js | Structured `{ ok, reason, details }` return. *(2026-04-25)* |
| `runDeploy(ws, env)` | server.js | Async with preflight + spawn error + stderr parsing + settle invariant. *(2026-04-25)* |
| `buildMissionControlSnapshot(options)` | lib/famtastic/mission-control/index.js | Reader/projection over Data Center jobs, witness checks, claims, decisions, needs-Fritz, stale/blocked, proofs, and raw capture inbox count. *(2026-05-20)* |
| `addChatSessionBreak(label, opts)` | public/index.html | Inserts session-break divider into chat. *(2026-04-25)* |

### Scripts

| File | Purpose |
|------|---------|
| `scripts/fam-hub` | Unified CLI: site, idea, agent, admin, convo, ingest, research, plan/task/run, and report style. |
| `config/reporting-preferences.json` | Project-level response/reporting density preferences. Current/default density is `compact`; valid densities are `compact`, `standard`, and `detail`. |
| `docs/operating-rules/reporting-density.md` | Operating rule for final-response density and CLI usage. |
| `scripts/gemini-cli` | Gemini API CLI (Node.js, gemini-2.5-flash) |
| `scripts/orchestrator-site` | Batch site generation |
| `scripts/stock-photo` | 3-provider stock photo downloader |
| `scripts/site-deploy` | Deploy to Netlify/Cloudflare/Vercel |
| `scripts/asset-generate` | SVG asset pipeline |
| `scripts/google-media-generate` | Imagen 4 / Veo 2 media generation |
| `scripts/seed-pinecone` | Seed Pinecone index from site specs |
| `scripts/intelligence-loop` | Per-site intelligence reports |
| `scripts/research-job.js` | Runs a research query through the shared research proxy, writes a Data Center job, and emits proof artifacts. |
| `scripts/data-center-ingest.js` | Ingests raw capture box files from `captures/inbox/` and `captures/review/` into Data Center source records; supports `--dry-run` and `--json`. |
| `scripts/witness-check.js` | Runs bounded local capability witness checks and appends latest/baseline records under `data-center/witness/`. |
| `scripts/mission-control-report.js` | Renders the Wave 4 Mission Control snapshot in human or JSON form; supports custom roots and stale threshold. |
| `scripts/fam-convo-*` | Multi-agent conversation pipeline |
| `scripts/install.sh` | Install flow (consolidated from famtastic-dev-setup) |

### Per-Site Files

| File | Purpose |
|------|---------|
| `sites/<tag>/STUDIO-CONTEXT.md` | Universal context — regenerated on every studio event. |
| `sites/<tag>/spec.json` | Design brief, decisions, content fields, media specs, deploy info. **Now includes `tier` (canonical), derived `famtastic_mode`, `tier_normalization_warning`.** *(2026-04-24)* |
| `sites/<tag>/agent-calls.jsonl` | Per-call agent telemetry. |
| `sites/<tag>/sdk-calls.jsonl` | Per-call Anthropic SDK cost log. |
| `sites/<tag>/mutations.jsonl` | Field-level edit log. |
| `sites/<tag>/intelligence-promotions.json` | Promoted intelligence findings. |
| `sites/<tag>/deal-memo.md` | Rank-and-rent deal memo. |
| `.worker-queue.jsonl` | Worker dispatch queue (root of repo). |
| `.local/research-effectiveness.json` | Research source effectiveness scores. |
| `data-center/` | Research/Data Center root: jobs, ledgers, artifacts, reports, schemas, exports, source/citation/decision folders. |
| `second-brain/Research/` | Markdown notes exported from Data Center research jobs. |
| `second-brain/Canvases/` | Obsidian canvas-style graph exports for research jobs. |
| `specs/001-research-data-center-foundation/` | First research-shaped SDD packet: capture, research, sources, claims, spec, plan, tasks, proof, decision log, learn. |
| `specs/002-wave2-witness-autopilot/` | Wave 2 SDD packet for witness ledger and autopilot foundation. |
| `specs/003-data-center-knowledge-layer/` | Wave 3 SDD packet for capture ingestion, source records, claims, and decisions. |
| `specs/004-mission-control-observability/` | Wave 4 SDD packet for Mission Control reader/report observability. |
| `plans/consolidation-2026-05-04.json` | Earlier proposed parent-lane consolidation packet; superseded by the applied four-parent `plans/registry.json`. |
| `plans/consolidation-verification-2026-05-04.md` | Verification proposal that led to the applied four-parent registry; retained as evidence. |
| `plans/consolidated-execution-checklist-2026-05-04.md` | Working four-plan execution checklist that parks the stale Total Ask as strategy context and maps remaining P0/P1/P2 asks to `studio-workbench-foundation`, `plan-task-run-intelligence`, `build-intent-fulfillment-trace`, and `site-mbsh-reunion`. |
| `plans/registry.backup-2026-05-04.json` | Backup of the prior 11-record pilot registry before the four-parent consolidation rewrite. |
| `tasks/tasks.jsonl` | Append-only task ledger; now populated with consolidated P0/P1/P2 tasks tied to the four parent plans. |
| `runs/runs.jsonl` | Append-only run ledger; now contains the active consolidation apply run. |
| `proofs/proof-ledger.jsonl` | Append-only proof ledger; now contains proof records for registry rewrite, task/run/proof setup, Drive-sync status correction, and CLI verification. |
| `docs/STUDIO-UI-FOUNDATION.md` | Frozen canonical Site Studio UI foundation and required workspace contract. Supersedes prior shell/layout proposals that conflict with the domain-level left nav, purpose-reactive workspaces, ambient Shay, Fritz filter, Night visual system, prompt-first Media Studio, contextual tools, or plan-then-approve. |
| `docs/decisions.jsonl` | Append-only UI/product decision ledger seeded with the Studio UI Foundation freeze decision. |
| `captures/inbox/2026-05-04-workbench-foundation.capture.json` | Proposed intelligence-loop capture packet for Workbench foundation decisions, complaints, research sources, gaps, and promotion targets. |
| `captures/review/2026-05-04-cowork-briefing-first-pass.json` | First review-only knowledge capture packet generated by `fam-hub capture extract`; includes proposed decisions, breakthroughs, gaps, lessons, contradictions, and destinations from the Cowork briefing. |
| `captures/inbox/2026-05-04-studio-ui-foundation-freeze.capture.json` | Approved intelligence-loop capture packet for the Studio UI Foundation freeze. |
| `captures/inbox/mbsh-super-vibe-coder-mission-scope-2026-05-12.md` | MBSH authorization/scope capture for the autonomous FAMtastic Site Studio pass: research, expert synthesis, page-by-page cinematic implementation, budget ceiling, no production deploy, and staging-readiness target. |
| `captures/inbox/mbsh-super-vibe-coder-research-synthesis-2026-05-12.md` | Research synthesis for the MBSH page feel/orientation, public imagery metaphors, ultra-realistic Hi-Tide Harry strategy, layered parallax/motion, Shay process improvements, and prompt-to-Studio automation lessons. |
| `captures/inbox/mbsh-super-vibe-coder-implementation-report-2026-05-12.md` | Implementation report for the local MBSH cinematic pass, naming edited deploy-repo files, page outcomes, verification performed, known staging gaps, and reusable FAMtastic Studio lessons. |
| `captures/inbox/mbsh-staging-readiness-state-2026-05-12.md` | Staging-readiness state packet with current MBSH branch/status, changed files, required Wave 1 asset folder, verification performed, recommended staging commands, and remaining production gaps. |
| `handoffs/studio-ui-foundation-freeze-2026-05-04.md` | Freeze handoff for future implementation work, including build order and hard stops. |
| `site-studio/public/data/workbench-workspaces.json` | Workbench domain contract defining purpose, center surface, primary objects, capabilities, proof requirements, and anti-patterns for Sites, Brainstorm, Plans, Components, Media Studio, Research, and Admin. |
| `site-studio/public/data/workbench-plan-state.json` | Browser-safe consolidated plan state consumed by Workbench Plan mode. Mirrors four active parent plans, priority lanes, current run, and Drive/workflow/visualizer status. |
| `site-studio/lib/workflow-stage-catalog.json` | Catalog-only workflow-as-data phase 1 defining build stage boundaries and proof event names for future trace and visualizer surfaces. |
| `architecture/2026-05-04-build-intent-v2-current.md` | Declaration that BuildIntent V2 supersedes V1 as the current direction, while implementation remains phased. |
| `architecture/site-workflow-modes-2026-05-04.md` | Architecture contract for `new_site_from_brief`, `adapt_existing_site`, and `rebuild_from_brief`, including inputs, ownership, permissions, config discovery, execution path, proof requirements, and gaps. |
| `docs/sites/site-mbsh-reunion/DEPLOY-STATE.md` | MBSH boundary document separating Studio canonical site state from the standalone deploy repo at `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/`. |
| `docs/sites/site-mbsh-reunion/backend-endpoint-inventory-2026-05-04.md` | MBSH v2 PHP/MySQL backend endpoint inventory covering public endpoints, admin pages, cron jobs, shared libraries, frontend consumers, config requirements, missing runtime files, blockers, and follow-up consumers. |
| `docs/sites/site-mbsh-reunion/rsvp-flow-verification-2026-05-04.md` | MBSH RSVP verification packet with frontend/browser proof, fixed deploy-repo files, backend hooks, and remaining runtime blockers. |
| `docs/sites/site-mbsh-reunion/sponsor-flow-verification-2026-05-04.md` | MBSH sponsor verification packet with frontend/browser proof, fixed deploy-repo files, backend hooks, and remaining runtime blockers. |
| `docs/sites/site-mbsh-reunion/deploy-proof-2026-05-04.md` | MBSH deploy proof packet naming frontend/backend/DNS/config/smoke/rollback requirements and external-access blockers. |
| `docs/sites/site-mbsh-reunion/media-story-assets-verification-2026-05-04.md` | MBSH media/story verification packet naming present brand/mascot/video assets and missing story/gallery image blockers. |
| `docs/sites/site-mbsh-reunion/chatbot-phase1-verification-2026-05-04.md` | MBSH chatbot Phase 1 verification with browser proof for FAQ and fallback behavior. |
| `docs/sites/site-mbsh-reunion/content-delta-verification-2026-05-04.md` | MBSH V1 brief vs v2 content delta packet. |
| `docs/sites/site-mbsh-reunion/studio-reproduction-audit-harness-2026-05-04.md` | MBSH Studio reproduction harness with exact prompt, audit method, required checks, and reusable gaps. |
| `docs/sites/site-mbsh-reunion/generalized-platform-gaps-2026-05-04.md` | MBSH-derived generalized platform gaps mapped back into existing parent plans. |
| `proofs/mbsh-rsvp-sponsor-browser-submit-2026-05-04.json` | Browser proof output for RSVP and sponsor submissions against the actual MBSH deploy repo pages with intercepted API payloads. |
| `proofs/mbsh-chatbot-phase1-browser-2026-05-04.json` | Browser proof output for Hi-Tide Harry FAQ and fallback collector behavior. |
| `proofs/workbench-pipeline-visualizer-2026-05-04.json` | Browser proof output for Workbench pipeline visualizer phase 1. |
| `proofs/workbench-pipeline-visualizer-2026-05-04.png` | Screenshot proof for Workbench pipeline visualizer phase 1. |
| `docs/operating-rules/studio-shay-ui-proof-2026-05-04.md` | Actual Studio UI proof for Shay-Shay `system status`, including fixed click-layer and PointerEvent message bugs. |

### OpenWolf Files

| File | Git | Purpose |
|------|-----|---------|
| `.wolf/anatomy.md` | tracked | File index with token estimates. |
| `.wolf/cerebrum.md` | tracked | Patterns, preferences, do-not-repeat rules. **Architectural decisions go in vision capture doc, NOT cerebrum.** |
| `.wolf/buglog.json` | tracked | Bug tracking across sessions. New entries 2026-04-25: JJ B&A R-NEW audit, baseline closure, auto-build no-confirmation, broken header links. |
| `.wolf/memory.md` | ignored | Per-session action log (ephemeral). |

---

## Developer Environment

### Runtime

- Studio is managed by **macOS launchd** as `com.famtastic.studio`. NEVER start manually with `node server.js`.
- Restart button calls `process.exit(0)` → launchd restarts in ~2s.
- Tail logs: `tail -f /tmp/studio.log`
- Force restart from terminal: `launchctl stop com.famtastic.studio`
- plist: `~/Library/LaunchAgents/com.famtastic.studio.plist`
- Runtime site variable is `TAG` (mutable) — NOT `process.env.SITE_TAG` (startup snapshot, goes stale).
- Express route ordering: static routes BEFORE parameterized routes of same prefix.
- Brain routing gate fires before classifier — check `currentBrain` before any intent logic.
- `STUDIO_NO_LISTEN=1` skips `server.listen()` for test mode.

### Security Constraints

- `read_file` tool: `path.resolve + startsWith(siteRoot + sep)` check — mandatory.
- `writeSpec()`: atomic write via `.tmp` + `renameSync` — never `writeFileSync` directly to SPEC_FILE().
- `createSite()` performs same atomic-write pattern for new spec.
- Never concatenate user input into shell strings.

### Standing Rules (Do Not Repeat)

- `TAG` not `process.env.SITE_TAG` inside any route handler.
- `library.json` is `{ version, components[], last_updated }` — always extract `.components`.
- Static Express routes before parameterized routes of same prefix.
- Every HTML write path through `runPostProcessing()` — no exceptions.
- BEM double-dash vocabulary (`--bg` not `-bg`).
- Inline styles prohibited in generated site HTML.
- Parallel page spawns must NOT emit logo SVGs — only the template call emits them.
- Nav class names must match `NAV_SKELETON` vocabulary.
- `#pip-dynamic-area` transitions go through `setOrbState(state, data)` only.
- Preview server must strip query string before filesystem lookup.
- All site-creation paths must go through `createSite()` — no inline `fs.mkdirSync(siteDir) + writeFileSync(spec)` patterns. *(2026-04-25)*
- `extractBriefFromMessage` returns `{ status, ... }` — callers must check status before accessing brief fields. *(2026-04-25)*
- `triggerSiteBuild` gates on WS client presence — never dispatch builds with no observer. *(2026-04-25)*
- `spec.tier` is canonical; `famtastic_mode` is derived. Never set `famtastic_mode` directly. *(2026-04-24)*
- `runDeploy` preflight runs BEFORE `deployInProgress` is set. The flag is reset on every early-return via `settle()`. *(2026-04-25)*
- Architectural decisions live in `docs/FAMTASTIC-VISION-CAPTURE-2026-04-24.md`, NOT cerebrum.

---

## Deployed Sites

| Site | URL | Pages | Deploy Date |
|------|-----|-------|-------------|
| The Best Lawn Care | https://the-best-lawn-care.netlify.app | 7 | 2026-03-20 |
| Auntie Gale's Garage Sales | https://effortless-tiramisu-ed9345.netlify.app | 5 | 2026-04-08 |
| Drop The Beat Entertainment | built, not deployed | 3 | 2026-04-10 |

---

## Pending Tasks

### This Week

- **Send PR to `ringo380/cpanel-mcp`** with the UAPI v3 response-parser fix
  (see `~/famtastic/tools/cpanel-mcp/PATCHES.md`). Without this patch every
  tool call fails with `Cannot read properties of undefined (reading 'event')`
  because the shipped client parses the legacy cPanel JSON-API shape but
  hits the modern `/execute/<Module>/<func>` UAPI v3 endpoint.
- **Fork-fallback check-in: 2026-05-13.** If the PR has not been reviewed
  by then, fork `ringo380/cpanel-mcp` publicly under `famtastic-fritz`,
  repoint the local clone's `origin` at the fork, and record the fork URL
  in `~/famtastic/tools/cpanel-mcp/PATCHES.md`. This stops every fresh
  clone or upstream pull from silently wiping the fix.
- **MBSH service provisioning blockers:** generate production `API_BASE_URL`
  after backend provisioning, add cPanel UAPI/MCP DNS/addon-domain wrappers or
  complete provider/manual DNS records, and repair SSH host-key trust for
  `nineoo@FAMTASTICINC.COM`.
- **MBSH addon domain (provider/manual unless API is extended):** add
  `mbsh96reunion.com` in cPanel by hand if Studio cannot automate it — the MCP
  does not yet expose `create_addon_domain`. Tracked as the #1 Layer-2
  extension in `docs/operating-rules/godaddy-mcp-spike.md`.

---

## What's Next

The full iterative roadmap is in `architecture/2026-04-25-outstanding-plan.md`.

Quick view:

**Immediate (next session):** Command Center delivery surfaces (`fam-hub command-center` + daily regen cron, serve `state.json` via Studio `/api/ops`, push `briefing.md` to phone) and reconcile it with `buildMissionControlSnapshot()`; decide the payment provider to unblock `billing.*`; JJ B&A site build + refine; fix broken header links bug; fix auto-build-trigger UX.

**Near-term (this week):** Edge case test suite design (5 categories); Wizard-of-Oz orchestrated build session; Reunion site (July 12 deadline).

**Medium-term (2-4 weeks):** V2 BuildIntent Phases 1-4; brain adapter additions (DeepSeek V4-Flash, Kimi K2.6); Pinecone+Perplexity verification; FAMtastic-applied research composer; conversation-based learning capture; client review/preview/payment flow verification.

**Longer-term (parking lot):** Shay relational identity (numerology), meta-research category, context architecture deep dive, Lite-to-Desk routing, log monitoring, Component/Media/Think Tank studio extractions, promotion layer, schema audit follow-up, UI polish.

**Principles to hold:** baseline always works end-to-end before adding features; adversarial review before structural changes; caller-owned vs helper-owned contracts in JSDoc; identity checks before destructive operations; capture corpus from every session; Tier B is FAMtastic default, Tier A is opt-in; documentation lives in vision capture doc.
