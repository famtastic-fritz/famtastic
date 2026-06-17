# Autonomous Build Readiness Audit — 2026-06-16

## Executive verdict

**Verdict: not morning-ready for true autonomous builds.**

There are real automation pieces in this repo, but the system is still split across three maturity levels:

1. **Implemented and runnable:** command-center generation, plan/task/proof ledgers, ops inventory snapshots, the autopilot dry-run loop, the content-engine build loop, and Site Studio's autonomous-build endpoint.
2. **Partially implemented:** workflow tracing, Workbench plan mirrors, Ops freshness substrate, scheduled/autonomous runner installation scripts, and revenue-oriented autonomous lanes.
3. **Declared but missing:** automatic status export, real live publishing, real analytics feedback, canonical capture promotion, browser-proofed unattended Site Studio build execution, and a fully wired morning delivery path.

If the question is **"Can FAMtastic safely run unattended autonomous build work by morning and give trustworthy outputs?"** the answer is **no**. It can run some autonomous content-production loops and generate morning artifacts, but the core cross-plan autonomous build substrate is still missing key truth-sync, execution, and proof pieces.

---

## What is already automation-ready

### 1) Command Center generation is real
**Implemented.**

Verified by running:

- `node scripts/command-center/build-command-center.js`

Observed result:

- `command-center/` regenerated successfully
- output reported: `plans: 14 | needs you: 5 | blocked: 0 | open tasks: 35`

Evidence:

- `scripts/command-center/build-command-center.js`
- `command-center/state.json`
- `command-center/briefing.md`

### 2) Plan/task/proof substrate exists and is queryable
**Implemented, but stale in parts.**

Verified by running:

- `node scripts/plans/audit.js`
- `./scripts/fam-hub plan list --compact`
- `./scripts/fam-hub task list`

Observed:

- 14 active plans
- 78 task records total
- task status mix: 39 completed / 14 blocked / 25 ready
- 29 proof records
- plan audit reports `Drift: 0`, `Conflicts: 0`, `Orphan tasks: 0`

Evidence:

- `plans/registry.json`
- `tasks/tasks.jsonl`
- `proofs/proof-ledger.jsonl`
- `scripts/plans/audit.js`
- `scripts/fam-hub`

### 3) Ops inventory snapshot generation is real
**Implemented.**

Verified by running:

- `node scripts/ops/inventory.js --stdout`

Observed before downstream pipe failure:

- snapshot written to `docs/ops/inventory-2026-06-17.json`
- summary reported `122 records (live=51 stale=14 parked=0 archived=49)`

Important nuance:

- the script writes the snapshot, but when piped to a process that closes early it throws an `EPIPE`. That is not a blocker for direct file generation, but it is a hardening issue if this gets wrapped in more automation.

Evidence:

- `scripts/ops/inventory.js`
- `docs/ops/state-contract.md`
- `docs/ops/inventory-2026-06-17.json`

### 4) Autopilot lane exists and passes its own dry-run test suite
**Implemented for dry-run/staging mode only.**

Verified by running:

- `node --test autopilot/tests/autopilot.test.mjs`
- `node autopilot/cli.mjs status`
- `bash autopilot/install-cron.sh status`

Observed:

- 9/9 tests passed
- status shows `live publishing : OFF (dry-run / staging)`
- status shows zero concepts/inventory/published/runs in current state
- scheduled agent status: `not loaded`

Evidence:

- `autopilot/tests/autopilot.test.mjs`
- `autopilot/cli.mjs`
- `autopilot/README.md`
- `autopilot/install-cron.sh`
- `autopilot/autopilot.config.json`

### 5) Autonomous content engine can run unattended build loops
**Implemented for local static-site assembly, not fully implemented for live production publishing.**

Verified by running:

- `node scripts/content-engine/run.js --help`

Observed actual behavior:

- the script performed a full run
- 9 existing article files were detected and skipped
- static site assembled successfully into `scripts/content-engine/dist`
- run summary written to `scripts/content-engine/results/2026-06-17.json`

Evidence:

- `scripts/content-engine/run.js`
- `scripts/content-engine/results/2026-06-17.json`
- `scripts/content-engine/README.md`
- `scripts/content-engine/publish.sh`

### 6) Site Studio has a real autonomous-build endpoint
**Implemented, but not actually unattended-ready.**

Repo evidence shows:

- `site-studio/server.js` defines `runAutonomousBuild(message, context = {})`
- `POST /api/autonomous-build` exists
- the flow does brief extraction → site creation/update → design brief synthesis → build trigger

But the implementation explicitly stops if no browser/WebSocket client is connected.

Evidence:

- `site-studio/server.js:9074-9253`
- `site-studio/server.js:9481-9486`

Critical code path:

- if `triggerSiteBuild()` returns `reason === 'no_ws_clients'`, the function returns:
  - `success: false`
  - message: `Open Studio to trigger build — no browser connected.`

That means the flagship autonomous Site Studio build path is **not** actually able to run unattended overnight.

---

## What is not ready

### 1) Automatic status export is still missing
**Declared in tasks. Missing in implementation.**

The repo says the next step is:

- `task-2026-05-05-008` — implement automatic status-packet regeneration
- next action explicitly says: build `fam-hub plan export-status`

Verified missing by running:

- `./scripts/fam-hub plan export-status`

Observed:

- command does not exist; help output only lists `list`, `status`, `show`, `review`

Evidence:

- `tasks/tasks.jsonl` task `task-2026-05-05-008`
- `scripts/fam-hub`

### 2) Workbench plan mirror is stale
**Partially implemented and stale.**

Verified evidence:

- `site-studio/public/data/workbench-plan-state.json` has `generated_at: 2026-05-05T13:00:00.000-04:00`
- it still describes the old four-parent view and old counts (`task_count: 51`, `open_task_count: 12`)
- current ledger reality is 14 active plans and 78 tasks

That means the Workbench mirror is not truth-synced and cannot be trusted as a morning automation readout.

Evidence:

- `site-studio/public/data/workbench-plan-state.json`
- `plans/registry.json`
- `tasks/tasks.jsonl`

### 3) Run tracking is basically frozen
**Implemented structurally, not operationally.**

Verified evidence:

- `runs/runs.jsonl` contains exactly **one** run record
- that one active run is from `2026-05-04/05`
- command center still treats it as the current run

A system claiming autonomous build readiness needs ongoing run creation, completion, and turnover. Right now the run substrate exists, but it is not being used like a living scheduler/executor ledger.

Evidence:

- `runs/runs.jsonl`
- `command-center/state.json`
- `command-center/briefing.md`

### 4) Active plans are mixed between real executable packets and metadata-only ghosts
**Partially implemented.**

Plan audit says drift is clean, but that only means the registry and task ledger do not conflict.

It does **not** mean all active plans are execution-ready.

Observed:

- multiple active plans have `open=0 total=0` and are checkpoint/needs-tasking records rather than executable waves:
  - `plan_2026_05_05_ops_workspace_gui`
  - `plan_2026_05_05_platform_site_promotion`
  - `plan_2026_05_05_chat_capture_learn_optimize`
  - `plan_2026_05_05_agent_coordination`
  - `plan_2026_05_05_workbench_per_page_design`

So the active plan surface is operationally noisy: some entries are real work packets, others are status placeholders.

Evidence:

- `node scripts/plans/audit.js` output
- `plans/registry.json`
- `command-center/state.json`

### 5) Site Studio autonomous builds still depend on interactive browser presence
**Implemented but not autonomous.**

This is the biggest build-readiness blocker for the core site factory.

The autonomous endpoint can create/update the site record, but it refuses to dispatch the build when there is no connected browser client.

That means the overnight system cannot reliably wake up, build a site, and prove the result without a human or persistent UI session.

Evidence:

- `site-studio/server.js:9196-9205`

### 6) Autopilot live publishing is not wired
**Declared. Missing.**

Repo docs are honest here:

- README says live upload calls are stubbed integration points in `publishers.mjs`
- task `ws_live_publishing` is blocked
- task `ws_real_analytics` is blocked
- task `ws_client_email_send` is blocked
- cron installer exists, but scheduler is not loaded on this machine

So the autopilot can stage bundles and simulate performance, but it cannot yet claim real autonomous business execution.

Evidence:

- `autopilot/README.md`
- `autopilot/autopilot.config.json` (`live: false`)
- `tasks/tasks.jsonl`
- `bash autopilot/install-cron.sh status` → `not loaded`

### 7) Content-engine production publish path is still a stub/handoff
**Partially implemented.**

Repo docs say:

- `publish.sh` is an “honest deploy stub”
- README explicitly says the real deploy runs on Fritz's Mac with the token
- README also says human editing is still needed before publish

So it is a credible build scaffold, not a finished autonomous publishing loop.

Evidence:

- `scripts/content-engine/README.md`
- `scripts/content-engine/publish.sh`

### 8) Morning report delivery is not fully wired to a reach surface
**Declared. Missing.**

Mission Control/Command Center has generated artifacts, but the plan still lists the phone/reach delivery path as blocked:

- `task-2026-06-02-003` — connect command-center briefing output to future phone/reach surface

So the system can create a morning briefing file, but not yet guarantee autonomous delivery through the intended omnipresent Shay surface.

Evidence:

- `tasks/tasks.jsonl`
- `command-center/briefing.md`

---

## Verified evidence

### Commands executed during this audit

- `node scripts/command-center/build-command-center.js`
- `node scripts/plans/audit.js`
- `./scripts/fam-hub plan list --compact`
- `./scripts/fam-hub task list`
- `node --test autopilot/tests/autopilot.test.mjs`
- `node autopilot/cli.mjs status`
- `bash autopilot/install-cron.sh status`
- `node scripts/content-engine/run.js --help`
- `./scripts/fam-hub plan export-status`
- `node scripts/ops/inventory.js --stdout`
- `bash -n platform/capabilities/cron/register-crons.sh`

### File evidence inspected

- `plans/registry.json`
- `plans/*/plan.json` for active autonomous-adjacent plans
- `tasks/tasks.jsonl`
- `runs/runs.jsonl`
- `proofs/proof-ledger.jsonl`
- `scripts/fam-hub`
- `scripts/command-center/build-command-center.js`
- `scripts/ops/inventory.js`
- `site-studio/server.js`
- `site-studio/public/data/workbench-plan-state.json`
- `autopilot/README.md`
- `autopilot/cli.mjs`
- `autopilot/install-cron.sh`
- `autopilot/autopilot.config.json`
- `autopilot/tests/autopilot.test.mjs`
- `scripts/content-engine/README.md`
- `scripts/content-engine/publish.sh`
- `scripts/content-engine/results/2026-06-17.json`
- `command-center/state.json`
- `command-center/briefing.md`
- `docs/ops/state-contract.md`
- `platform/registry/capabilities.json`
- `FAMTASTIC-STATE.md`
- `FAMTASTIC-STATUS.md`
- `AGENTS.md`
- `CLAUDE.md`

### Distinctions that matter

- **Implemented:** command-center generation, ledger queries, ops inventory snapshotting, autopilot dry-run tests, content-engine local assembly, Site Studio autonomous-build endpoint.
- **Partially implemented:** Workbench plan mirror, workflow trace surface, content-engine publishing, autopilot scheduling/live mode, ops read-model/reporting, autonomous plan orchestration.
- **Declared:** status export command, capture promotion command path as canonical flow, live autopilot publishing/analytics, morning reach-surface delivery.
- **Missing:** unattended Site Studio build execution without browser presence, canonical automatic truth-sync for plan mirrors, live scheduler enablement, reliable run turnover for active autonomous execution.

---

## Gaps and blockers

### Blocker A — core Site Studio autonomous builds are not unattended-capable
This is the hardest blocker.

The repo has an autonomous-build endpoint, but it still requires a connected browser session to actually dispatch the build. That is not autonomous. That is remote-assisted interactive execution.

### Blocker B — status truth surfaces are out of sync
The system now has 14 active plans, but the Workbench mirror is still frozen at the old four-parent snapshot from 2026-05-05. Morning automation that reads stale mirrors is fake confidence.

### Blocker C — run substrate is not being used as the live executor ledger
One old active run in `runs/runs.jsonl` is not a run-management system. It is a receipt.

### Blocker D — scheduler installation exists, but actual schedule enablement does not
Autopilot has an installer and status command, but `status` reports `not loaded`. A capability that is merely installable is not yet operating autonomously.

### Blocker E — revenue/autonomous lanes are still mostly dry-run or staging
Autopilot and content-engine both have honest docs that admit the remaining gaps:

- live publishing not wired
- analytics simulated or absent
- monetization/provider handoff still manual
- publish/deploy still stubbed or human-mediated

### Blocker F — active plan surface still mixes execution, summaries, and stalled placeholders
That makes it harder for automation to decide what can actually run next without human interpretation.

### Blocker G — morning delivery surface is not finished
Morning artifacts can be generated, but not yet reliably pushed through the future omnipresent Shay channel.

---

## Proposed solutions

### 1) Ship `fam-hub plan export-status` first
**Why first:** it fixes truth drift fast and unlocks every downstream morning surface.

Concrete scope:

- add `fam-hub plan export-status`
- regenerate both:
  - `FAMTASTIC-STATUS.md`
  - `site-studio/public/data/workbench-plan-state.json`
- source from:
  - `plans/registry.json`
  - `tasks/tasks.jsonl`
  - `runs/runs.jsonl`
  - `proofs/proof-ledger.jsonl`
- add validation rules:
  - output JSON must parse
  - counts must match ledger reality
  - `generated_at` must update each run
  - current active plan count must match registry

Proof criteria:

- command exists in `scripts/fam-hub`
- running it updates both files
- Workbench mirror reflects 14 active plans and current task counts
- no hand-edits needed after ledger changes

### 2) Decouple Site Studio autonomous build execution from browser/WebSocket presence
**Why second:** until this lands, the core site factory cannot run overnight unattended.

Concrete scope:

- introduce a server-side build dispatch path for `runAutonomousBuild()` that does not depend on active WS clients
- keep WS broadcasting as optional observer output, not execution prerequisite
- create a build job/run record when autonomous build starts
- write trace/proof artifacts even when no UI is attached

Proof criteria:

- `POST /api/autonomous-build` succeeds with no browser connected
- run/proof records are appended automatically
- resulting site files change on disk
- Playwright proof validates completed build after the fact, not as prerequisite for dispatch

### 3) Turn the run ledger into a real executor ledger
**Why third:** autonomous systems need active turnover, not static archival rhetoric.

Concrete scope:

- every autonomous execution lane writes run start/update/finish records
- stale `active` runs older than threshold get auto-flagged
- command center should stop showing ancient “current run” records as if they are alive
- build health/freshness should be derived in one place and reused

Proof criteria:

- `runs/runs.jsonl` grows with new runs for command-center/content-engine/autopilot/export jobs
- no single active run remains open for weeks without update
- command center current run matches real latest active work

### 4) Enable one real scheduler, not just installer scripts
**Why fourth:** installability is not autonomy.

Concrete scope:

- choose the initial morning/overnight cadence
- load either the autopilot launchd agent or a higher-level orchestration launch agent
- have that job run a wrapper that executes:
  1. status export
  2. command-center rebuild
  3. selected autonomous lane ticks
  4. proof/report generation

Proof criteria:

- scheduler status shows loaded
- next fire produces fresh outputs without manual kickoff
- morning report timestamps reflect overnight execution

### 5) Separate executable active plans from summary/reference actives
**Why fifth:** automation needs clearer routing.

Concrete scope:

- mark summary-only active plans distinctly in registry output and command-center UI
- optionally split `active` into clearer submodes like `active-executable` vs `active-summary`
- ensure automation picks only plans with runnable task lanes

Proof criteria:

- automation-facing plan list can filter to executable plans only
- command-center no longer implies every active plan is immediately runnable

### 6) Harden autonomous revenue lanes honestly
**Why sixth:** both revenue lanes are promising but not done.

For autopilot:

- wire official API upload paths
- wire real analytics ingest
- enable loaded scheduler
- keep dry-run governance guardrails

For content-engine:

- convert `publish.sh` from stub/handoff into a real deploy command path
- add domain/deploy/monetization preflight checks
- keep FTC and quality gate enforcement

Proof criteria:

- autopilot can produce at least one real staged-to-live upload with permalink logging
- content-engine can publish to chosen deploy target from the canonical command path
- failures produce proof records, not silent logs only

### 7) Finish morning reach-surface wiring
**Why seventh:** generated briefings are only half the job.

Concrete scope:

- bind `command-center/briefing.md` into the chosen Shay phone/Telegram delivery path
- attach freshness metadata and top blockers
- suppress sends when nothing meaningful changed

Proof criteria:

- overnight job produces one delivery payload
- delivery reflects latest regenerated state, not stale mirrors
- silent mode works when there is genuinely nothing new

---

## Recommended priority order for tomorrow morning

1. **Implement `fam-hub plan export-status`.** This is the fastest leverage move and fixes stale truth surfaces.
2. **Remove the WebSocket/browser dependency from `runAutonomousBuild()`.** Without that, Site Studio is not autonomous.
3. **Create a real overnight wrapper job** that runs export → command-center rebuild → selected lane ticks → report.
4. **Start writing real run records** for each autonomous lane and auto-close stale actives.
5. **Load one scheduler for real** and verify a full unattended pass succeeds.
6. **Promote executable-vs-summary distinctions in plan surfaces** so automation stops treating all active plans equally.
7. **Then harden live publishing and monetization lanes** for autopilot and content-engine.

If only one thing gets done tomorrow morning, it should be **status export + Workbench mirror refresh**. Right now the system's morning-facing truth surfaces are stale, and that poisons every downstream dashboard and briefing.

---

## Which active plans should be updated

### Highest-priority updates

#### `plan-task-run-intelligence`
Needs update immediately.

Why:

- `task-2026-05-05-008` is still pending and is the main truth-sync blocker
- `task-2026-05-05-016` and `task-2026-05-05-017` are directly relevant to autonomous ops visibility
- current run bookkeeping is stale relative to actual autonomous-readiness needs

Update focus:

- implement status export
- formalize run freshness / stale-active detection
- define canonical overnight wrapper outputs

#### `build-intent-fulfillment-trace`
Needs update soon after.

Why:

- core site build tracing exists, but autonomous proof is still weak for unattended runs
- stage/event matching is still only a ready task, not completed

Update focus:

- tie unattended build runs to durable trace/proof packets
- surface missing-stage or partial-stage diagnostics automatically

#### `mission-control-command-center`
Needs update.

Why:

- generator is real, but delivery surface is still blocked
- this plan is the natural home for morning-ready reporting automation

Update focus:

- stable command path for rebuilds
- scheduled generation
- reach-surface delivery binding

### Important supporting updates

#### `plan_2026_06_02_autopilot_faceless`
Needs update.

Why:

- dry-run execution is proven, but scheduler is not loaded and live publishing is blocked

Update focus:

- scheduler enablement
- live publisher adapters
- real analytics

#### `autonomous-content-engine`
Needs update.

Why:

- build loop works, but publish path is still a stub/handoff and monetization/provider state is external/manual

Update focus:

- canonical deploy command
- domain/deploy/monetization preflight
- proof-backed publish records

### Plans that should probably be reclassified or closed instead of left fuzzy

- `plan_2026_05_05_ops_workspace_gui`
- `plan_2026_05_05_platform_site_promotion`
- `plan_2026_05_05_chat_capture_learn_optimize`
- `plan_2026_05_05_agent_coordination`
- `plan_2026_05_05_workbench_per_page_design`

These may still matter, but as active automation-readiness inputs they are currently more like stale metadata or future shaping packets than executable morning-autonomy lanes.

---

## Bottom line

The repo is **not empty theater**. There is real autonomous infrastructure here.

But the system is **not yet ready to claim reliable overnight autonomous build readiness** for the platform as a whole.

The blunt version:

- **Command Center:** real
- **Ledgers:** real
- **Ops inventory:** real
- **Autopilot dry-run:** real
- **Content-engine local build loop:** real
- **Site Studio autonomous endpoint:** real but still chained to browser presence
- **Automatic status truth-sync:** missing
- **Live scheduler enablement:** mostly missing
- **Morning delivery path:** missing
- **True unattended platform builds by morning:** not ready

The fastest path from "interesting automation" to "morning-ready autonomous build system" is:

1. truth-sync export,
2. unattended Site Studio dispatch,
3. real run turnover,
4. scheduled wrapper execution,
5. only then broader live publishing hardening.
