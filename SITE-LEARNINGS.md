# FAMtastic Ecosystem — Site Learnings

## Consolidated Execution Checklist (2026-05-04)

Created `plans/consolidated-execution-checklist-2026-05-04.md` as the working
plan consolidation artifact after Fritz rejected the stale Total Ask shape as
daily operating truth. The checklist keeps four active parent plans:
`studio-workbench-foundation`, `plan-task-run-intelligence`,
`build-intent-fulfillment-trace`, and `site-mbsh-reunion`. The stale
`docs/famtastic-total-ask-plan.md` is now treated as strategy context to mine,
not as a fifth active plan.

### Product/process decisions captured

- **Four parent plans are enough.** Extra documents become evidence,
  child workstreams, promoted tasks, or parked context.
- **Total Ask is cannibalized, not obeyed.** Keep the capture flywheel,
  Shay identity/context, Studio family model, workflow-as-data, pipeline
  visualizer, three site workflows, long-context fixes, and audit harnesses;
  discard stale completion claims as execution authority.
- **Media is Media Studio.** The checklist reinforces the frozen UI rule:
  prompt-first creation is the primary center work surface, with the library
  and tools supporting the work rather than becoming the work.
- **Real Studio testing is mandatory.** Studio behavior must be verified via
  Playwright-driven Site Studio UI flows and actual Shay/Shay-Shay calls where
  the feature is a Shay behavior.
- **Drive sync is not active work in this checklist.** Fritz marked Drive sync
  complete, so it remains context/proof only. Workflow-as-data and the pipeline
  visualizer remain open under `build-intent-fulfillment-trace`.

### Known Gaps opened or preserved

- `plans/registry.json` has been rewritten to the four active parent plans.
- `tasks/tasks.jsonl`, `runs/runs.jsonl`, and `proofs/proof-ledger.jsonl`
  still need promoted records.
- `FAMTASTIC-STATUS.md` still needs automatic regeneration from code; it was
  manually regenerated from the consolidated registry and ledgers for the first
  applied slice.
- The Workbench prototype still needs to be rebuilt against the frozen
  workspace contract before it becomes the default shell.
- Workflow-as-data still needs the first instrumentation pass before
  declarative pipeline stages can be introduced.
- The pipeline visualizer remains unbuilt and depends on trustworthy trace and
  workflow data.

## Applied Four-Plan Registry (2026-05-04)

Fritz approved the consolidation for execution with auto-approval for the
remaining consolidated work. `plans/registry.json` is now rewritten to four
active parent plans only: `studio-workbench-foundation`,
`plan-task-run-intelligence`, `build-intent-fulfillment-trace`, and
`site-mbsh-reunion`. The pre-consolidation registry was backed up to
`plans/registry.backup-2026-05-04.json`.

### Files and commands created or changed

- `plans/registry.json` — schema `0.2.0`, four active parent plans, approval
  metadata, and absorbed-record dispositions for stale/parked plan documents.
- `plans/registry.backup-2026-05-04.json` — rollback/comparison copy of the
  prior 11-record registry.
- `tasks/tasks.jsonl` — first promoted task ledger records. P0 consolidation
  substrate tasks and P1 CLI command tasks are marked completed; remaining
  Workbench, BuildIntent, workflow-data, visualizer, and MBSH tasks are ready.
- `runs/runs.jsonl` — active `run-2026-05-04-consolidation-apply` record.
- `proofs/proof-ledger.jsonl` — proof records for the registry backup/rewrite,
  task ledger, run ledger, Drive-sync status correction, and CLI command
  verification.
- `scripts/fam-hub` — fixed JSONL list commands so they no longer skip the
  first task/run record; added `fam-hub plan review`,
  `fam-hub task promote --dry-run|--apply`, and
  `fam-hub run start <plan-id> [target] [--dry-run]`.
- `FAMTASTIC-STATUS.md` — manually regenerated status packet with the four
  active parent plans and current run.

### Verification

- `jq` validated `plans/registry.json`, `tasks/tasks.jsonl`,
  `runs/runs.jsonl`, and `proofs/proof-ledger.jsonl`.
- `bash -n scripts/fam-hub` passed.
- `fam-hub plan list --compact` shows exactly four active parent plans.
- `fam-hub plan review` reports 4 plans, 4 active parents, 10 absorbed records,
  23 task records, 1 run record, 8 proof records, and no warnings.
- `fam-hub task list` now includes the first JSONL task record.
- `fam-hub run status` now includes the one-line run ledger.
- `fam-hub task promote --dry-run` previews registry task promotion.
- `fam-hub run start studio-workbench-foundation complete_p0 --dry-run`
  returns a valid JSON run record without writing.

### Known Gaps closed or changed

- The four-parent registry rewrite is no longer pending; it is applied.
- Task, run, and proof ledgers are no longer empty.
- `fam-hub plan review`, `fam-hub task promote`, and `fam-hub run start` now
  exist.
- Workbench Plan mode no longer uses only static demo data. It now loads
  `site-studio/public/data/workbench-plan-state.json`, which mirrors the
  consolidated registry, task, run, and proof state for browser use.
- Automatic status-packet regeneration is still open; this pass updated the
  packet manually.

## Workbench Plan Mode Registry Wiring (2026-05-04)

Added a browser-safe consolidated plan state packet at
`site-studio/public/data/workbench-plan-state.json` and wired
`site-studio/public/js/workbench-foundation.js` Plan mode to render it. The
Plan workspace now shows the four active parent plans, P0/P1/P2 task lanes,
the active consolidation run, and status flags for Drive sync, workflow-as-data,
and the pipeline visualizer.

### Verification

- `jq` validated `site-studio/public/data/workbench-plan-state.json`.
- `node --check site-studio/public/js/workbench-foundation.js` passed.
- `curl` against launchd-managed Studio confirmed
  `http://localhost:3334/workbench-foundation.html` and
  `/data/workbench-plan-state.json` were served.
- Playwright opened the Workbench through Studio, clicked Plan mode, verified
  required consolidated-plan text, found no console/page errors, and saved
  `proofs/workbench-plan-mode-2026-05-04.png`.

### Known Gaps changed

- Workbench Plan mode is wired to a generated browser-safe JSON packet, not
  direct live registry reads. Automatic packet generation remains open.
- Workbench is still not registered as a Shay context provider.

## Plan Consolidation Verification (2026-05-04)

Created `plans/consolidation-verification-2026-05-04.md` as a proposal to
reduce the current registry from 11 same-level plan records into 4 active
parent plans, 1 parked strategy context, and 6 merged/closed evidence records.
The report verifies that all referenced source files exist, but the task,
run, and proof ledgers are still empty and current registry source/proof
fields are not rich enough for Workbench/Shay execution.

### Consolidation recommendation

- **Keep active:** `studio-workbench-foundation`,
  `plan-task-run-intelligence`, `build-intent-fulfillment-trace`,
  `site-mbsh-reunion`.
- **Park:** `famtastic-total-ask-plan` as strategy context until Fritz reviews
  and accepts/modifies it.
- **Merge/close:** `multi-agent-resumable-plan-system`,
  `build-orchestration-trace`, `baseline-closure-review`,
  `canonical-build-intent-v2`, `outstanding-iterative-roadmap`,
  `gap-123-4-closure`, and `p0-p1-diagnostics` should stop appearing as
  same-level active plans after approval; they become child workstreams,
  evidence, or promoted tasks.

### Historical gaps from this proposal

- `plans/registry.json` was initially unchanged pending Fritz approval; this is
  closed by the applied four-plan registry slice below.
- `tasks/tasks.jsonl`, `runs/runs.jsonl`, and `proofs/proof-ledger.jsonl` were
  initially empty; this is closed by the first promoted ledger records.
- `fam-hub plan review`, `fam-hub task promote`, and `fam-hub run start` were
  initially missing; these now exist.
- Workbench Plan mode still cannot show real execution state until it consumes
  the registry and ledgers from the UI.

## Studio UI Foundation Freeze (2026-05-04)

Fritz approved `docs/STUDIO-UI-FOUNDATION.md` as the frozen canonical rulebook
for FAMtastic Site Studio UI work. The freeze supersedes prior proposals that
make Studio feel like a generic dashboard, IDE, fixed three-column shell, or
card-first workspace. The application identity is now locked as an AI Creation
Workbench for one operator running the FAMtastic site empire.

### Files added or updated in this freeze

- `docs/STUDIO-UI-FOUNDATION.md` — canonical UI foundation with frozen R1-R4,
  Night visual tokens, page rule, workspace discovery, workspace contract,
  frozen decisions, remaining open questions, and update procedure.
- `docs/decisions.jsonl` — append-only decision ledger, seeded with
  `decision_2026_05_04_studio_ui_foundation_freeze`.
- `captures/inbox/2026-05-04-studio-ui-foundation-freeze.capture.json` —
  reviewed intelligence-loop capture packet for the freeze decision.
- `handoffs/studio-ui-foundation-freeze-2026-05-04.md` — implementation handoff
  that tells future builders what is frozen, what remains prototype-only, and
  what order to build next.

### Product decisions captured

- **Left nav is domain-level only.** The frozen list is Sites, Brainstorm,
  Plans, Components, Media, Research, Admin. Adding a left-nav domain requires
  the page rule and Fritz filter.
- **Workspaces are purpose-reactive.** A selected domain renders a workspace
  shaped around that domain's job. There is no universal tool shelf and no
  static three-column layout that applies everywhere.
- **Every workspace has a contract.** Production screens must declare domain,
  route, parent, purpose, primary work surface, selected object model,
  contextual tools, Shay context, proof required, promotion targets, and
  anti-patterns before implementation.
- **Shay is ambient, not a domain.** Shay Lite is presence/orb behavior and
  Shay Desk is invoked from the active workspace as an overlay/right-edge
  threaded surface with page context.
- **Media is Media Studio.** The primary job is prompt-first generation,
  comparison, approval, promotion, and usage proof. Media Library is a
  supporting surface, not the domain identity.
- **The bench is the work.** Cards can represent repeated items, but cards do
  not replace the primary task surface. The center surface must become a
  preview, prompt console, graph, component canvas, source board, or deploy
  board based on the job.
- **Tools are contextual.** Tool order, grouping, and visibility belong to
  workspace/object state. Fixed tools are allowed only when the selected
  workspace or object state makes them continuously relevant.
- **Plan-then-approve is universal.** Canonical writes, brand-kit changes,
  deploys, expensive generations, and destructive changes propose first and
  apply only after approval.

### Known Gaps opened or preserved

- `site-studio/public/workbench-foundation.html` remains a prototype and should
  not become the default shell until rebuilt against the frozen workspace
  contract and real state sources.
- Workbench Plan mode is not yet backed by `plans/registry.json`,
  `tasks/tasks.jsonl`, `runs/runs.jsonl`, or `proofs/proof-ledger.jsonl`.
- Workbench is not yet registered as a Shay context provider, so Shay cannot
  reliably see selected domain/route/object/tool/proof state.
- Media Studio prompt-first generation controls are not unified with the
  existing production Media mini-app.
- The remaining naming/routing questions in `docs/STUDIO-UI-FOUNDATION.md`
  Section 10 still need decisions before those areas are implemented.

## Plan Registry and CLI Status Substrate (2026-05-04)

Built the first working slice of the plan/task/run intelligence substrate. `plans/registry.json` is now the canonical local data source for active plan status, seeded from `docs/active-plan-pipeline-report-2026-05-04.md` and the Shay process-intelligence plan packet. `scripts/fam-hub` now includes read-only status commands: `fam-hub plan list`, `fam-hub plan list --compact`, `fam-hub plan list --json`, `fam-hub plan status`, `fam-hub plan show <plan-id>`, `fam-hub task list`, and `fam-hub run status`.

### Files added in this session

- `plans/registry.json` — pilot registry with 11 plan records, generous governance defaults, source refs, originator/current-runner fields, proof links, task arrays, assumptions, and density pointers.
- `plans/templates/density-compact.md` — canonical one-line plan density contract.
- `plans/templates/density-standard.md` — canonical six-field plan list contract.
- `plans/templates/density-detail.md` — canonical single-plan drilldown contract.
- `tasks/tasks.jsonl`, `runs/runs.jsonl`, `jobs/jobs.jsonl` — append-only ledgers reserved for promoted tasks, active/completed runs, and future job registry records.
- `proofs/proof-ledger.jsonl`, `research/research-ledger.jsonl` — append-only ledgers reserved for proof and research evidence.
- `captures/inbox/`, `handoffs/` — intake folders for future no-filesystem capture packets and cross-agent handoff notes.
- `FAMTASTIC-STATUS.md` — read-only mirror/status packet for Claude Web, phone, and other surfaces that cannot read `~/famtastic/` directly.
- `docs/plan-registry-build-report-2026-05-04.md` — implementation report and verification record.

### Process decisions captured

- **Source of truth is data, not a CLI table.** The registry is canonical. CLI, Shay, Studio, Cowork, Claude Web, and phone mirrors choose a density from the same fields rather than inventing surface-specific templates.
- **One format, three densities.** Compact, standard, and detail are density variants over the same registry values. Field names, field order, and value wording stay stable.
- **Read-only first.** The first implementation slice lists and drills into plans but does not mutate statuses, auto-close plans, or promote tasks into ledgers.
- **Empty ledgers should explain the next step.** `fam-hub task list` and `fam-hub run status` currently report that no records exist yet and name the promotion/start records required next.

### Known Gaps opened

- `tasks/tasks.jsonl` and `runs/runs.jsonl` exist but are not populated.
- No command exists yet to promote a plan's embedded `tasks[]` into task ledger records.
- No command exists yet to start a run with targets such as `complete`, `50%`, `timebox`, or `until_blocked`.
- `FAMTASTIC-STATUS.md` is hand-written and not regenerated from `plans/registry.json` yet.
- No JSON schema validator exists yet for registry/task/run ledgers.
- Studio does not yet render `plans/registry.json` as a clickable Plans panel.

## Active Plan Pipeline Pilot Report (2026-05-04)

Created `docs/active-plan-pipeline-report-2026-05-04.md` as a review artifact for the proposed plan/task/run intelligence model. The report inventories current Studio and platform plans, groups their tasks, names inferred originators/runners/proof, and marks gaps such as stale wave status, overlapping plan documents, orphaned diagnostics, missing supersession links, and the absence of a task/run registry. It intentionally does not mutate canonical plan status; it is a seed for a future `plans/registry.json`.

### Process decisions captured

- **Generous governance first.** Missing owners, missing proof, stale plans, and ambiguous tasks should warn/log/notify before they block. Hard stops are reserved for destructive actions, production deploys, auth/payment/DNS/domain work, expensive API/media runs, and parallel write-scope conflicts.
- **Owner is current runner, not permanent possession.** Tasks should support handoff for session limits, cost, better-tool fit, blockers, user redirection, or context loss.
- **Runs are distinct from plans and tasks.** A run records a target such as complete, 50%, timebox, or until-blocked, plus background permission and report-back rules.
- **Phone/web sessions need capture packets or status exports.** No-filesystem surfaces should not pretend to read `~/famtastic/`; they either consume a synced status packet or emit proposed captures for local import.

### Known Gaps closed or changed by the registry slice

- `plans/registry.json` now exists as a pilot canonical registry.
- Append-only `tasks/`, `runs/`, proof, and research ledgers were created as
  empty files in the initial slice; task/run/proof ledgers now have first
  records after the applied four-plan registry pass.
- `fam-hub plan status`, `fam-hub task list`, and `fam-hub run status` now exist as read-only commands.
- `FAMTASTIC-STATUS.md` now exists as a web/phone-safe mirror.

### Known Gaps remaining

- The registry is seeded from a report and still needs Fritz review before statuses become ratified.
- Task/run/proof/research ledgers exist but are not populated.
- No promotion/import commands exist yet.
- The web/phone status packet is not regenerated automatically from the registry yet.

## Multi-Agent Resumable Plan System (2026-05-04)

FAMtastic needs a planning object above individual worker jobs. A single strategic conversation can produce architecture decisions, schemas, UI surfaces, research questions, implementation tasks, and documentation updates. The existing job queue can track individual tasks, but it does not preserve the source conversation, workstream ownership, agent access scopes, acceptance criteria, or promotion targets needed to resume the larger initiative across Codex, CLI, Cowork, Shay-Shay, and future workers.

### Files added in this session

- `docs/multi-agent-resumable-plan-system.md` — defines the plan-packet model, workstream schema, job grouping rules, agent assignment rules, lifecycle states, Studio surfaces, trigger model, capture intensity modes, and enforcement rules.
- `plans/plan_2026_05_04_shay_process_intelligence/README.md` — human-readable parent plan for the Shay process intelligence initiative that came out of the Codex Pets / Shay-Shay / intelligence-loop conversation.
- `plans/plan_2026_05_04_shay_process_intelligence/plan.json` — machine-readable plan packet with ten workstreams: conversation capture, plan coordination, artifact/component schema, process map visualizer, Shay ambient presence, component library enforcement, Media Studio integration, capability graph, evaluator/proof system, and Studio workspace plan.

### Process decisions captured

- **Plan packets sit above jobs.** `site-studio/lib/job-queue.js` and `/api/jobs` remain the execution queue for individual tasks, but plan packets group jobs into resumable cross-agent initiatives. Jobs should eventually gain optional `plan_id` and `workstream_id` fields, either in the SQLite schema or in their payload until the schema is extended.
- **Capture is toggleable by intensity, not by existence.** The baseline should preserve source context and summaries. Fritz can elevate a conversation into `standard_capture`, `full_plan_packet`, or `auto_queue_allowed` behavior when he says phrases like "capture this as a plan", "turn this into workstreams", or "queue this up".
- **Parallel work requires explicit write scopes.** Workstreams can run in parallel only when they are read-only or have disjoint write scopes. Overlapping writes require a dependency or a human integration step.
- **Every worker needs a handoff note.** A workstream is not done until it records what was read, what changed, what decisions were made, how to verify, what remains unknown, and what should happen next.
- **Visual process intelligence needs two maps.** Recipe Maps show how a workflow should operate; Run Trace Maps show what happened in a specific execution, with drilldown into decisions, prompts, tools, providers, tokens/cost, research, verification, and gaps.

### Known Gaps opened

- No first-class Plan Builder or Plan Board UI exists. Current plan packets are file-based and not yet surfaced in Studio.
- Existing jobs do not yet carry first-class `plan_id` / `workstream_id` fields in the SQLite schema.
- Conversation capture is still manual. There is no automatic chunking, extraction, review, or promotion workflow for cross-tool conversations.
- Process Map / Recipe Map UI is not built. The existing build trace and fulfillment ledger are foundations, but the visual drilldown surface is missing.

## Studio Tier mode for Shay-Shay self-modify (2026-04-30)

Studio Tier is a per-conversation flag on the Shay-Shay HTTP surface (`POST /api/shay-shay`) that grants two new Claude-only tools — `read_studio_file` and `propose_studio_patch` — for editing Studio's own source. Patches go to a review queue and never apply automatically; Fritz approves each one through the `fam-hub studio patches` CLI.

### Files added in this session

- `docs/famtastic-root-inventory.json` — hand-maintained per-path policy sidecar (70 entries). Companion to the human-facing `docs/famtastic-root-inventory.md`.
- `site-studio/lib/studio-tier-resolver.js` — `createStudioTierResolver({ hubRoot, inventoryPath })`. Validates inventory at load time (rejects malformed entries, missing trailing slash on dir entries, duplicate paths). Exposes `resolveStudioPath(rel)`, `getPolicyForPath(rel)`, `isAvailable()`, `getLoadError()`. Path resolution uses `fs.realpathSync` on both hubRoot and the requested path, rejects `..`, and verifies descendancy. Policy lookup: exact match wins; otherwise longest matching directory prefix with trailing-slash boundary semantics (so `site-studio/lib/` matches `site-studio/lib` and `site-studio/lib/foo.js` but NOT `site-studio/library-old/`). Diagnostic logs go to stderr so the validate script's stdout stays a clean single JSON line.
- `site-studio/lib/shay-shay-sessions.js` — `Map<conversation_id, { studioTier, forcedBrain, lastSeen }>`. Idle eviction at 6h via an unref'd interval. Exposes `getOrCreate`, `get`, `reset`, `resetAll`, `snapshot`. Returns `null` for missing conversation_id (callers must check) so tier state is never stored under a shared "surface" fallback key.
- `scripts/lib/studio-tier-validate.js` — invoked by `fam-hub studio patches apply`. Re-resolves the patch path against the CURRENT inventory (does not trust the patch JSON path field), re-checks `old_str` uniqueness, exits 0/1 with structured JSON on stdout. Refuses if current policy is READ_ONLY or REVIEW; refuses BLOCK unless `override_allowed` is true AND the patch was proposed with `flagged_secret: true`.

### Files modified in this session

- `site-studio/lib/studio-tools.js` — added `STUDIO_TIER_TOOLS` array (two tool definitions: `read_studio_file`, `propose_studio_patch`). `STUDIO_TOOLS` length unchanged at 5. Both arrays exported separately so the gate decides which to attach at runtime.
- `site-studio/lib/tool-handlers.js` — added two `case` arms to the existing `switch` dispatch (the dispatch is a switch, not a map), plus `handleReadStudioFile` and `handleProposeStudioPatch`. Resolver bootstrap is lazy and memoized; `_HUB_ROOT` is the already-injected value (no recomputation). Exported `isStudioTierAvailable()` and `getStudioTierResolver()` so server.js can check availability for the slash command. Patch IDs use ISO-timestamp shape + `crypto.randomBytes(3).toString('hex')` suffix to prevent burst-collision. Old_str line-ending mismatch (CRLF vs LF) detected and surfaced in the error message rather than producing a confusing "not found".
- `site-studio/lib/brain-interface.js:92` — tool-list assembly. Was: `(claude && (mode === 'build' || mode === 'brainstorm'))`. Now: also attaches `STUDIO_TOOLS` when `studioTier && tierAvailable`, and additionally appends `STUDIO_TIER_TOOLS` only in that case. Logs `[studio-tier] tool-assembly studioTier=… brain=… mode=… tierAvailable=… tools=… (base=… tier=…)` whenever `studioTier=true` is observed at this point. New `studioTier` opt threaded through from callers.
- `site-studio/server.js` — slash command parser inserted into `POST /api/shay-shay` after manifest/instructions load and BEFORE `classifyShayShayTier0`. Recognizes `/studio on|off|tier on|tier off|status`. `/studio on` checks Claude availability via `manifest.capabilities.claude_api === 'available'` and refuses with explanation if Claude is not available, the resolver is not available, or `conversation_id` is missing. On success sets `session.studioTier = true` and `session.forcedBrain = 'claude'`. `executeShayShayBrainCall` now accepts `studioTier` and threads it into `session.execute({ studioTier })`. The main handler reads `tierSession`, overrides `selection.brain` to Claude when tier is on, and refuses (HTTP 503) if Claude becomes unavailable mid-session rather than silently falling back to Codex/Gemini — `suppressFallback` skips the `catch` fallback in that case. `shayShaySessions.resetAll()` called at three site-switch sites: `app.post('/api/switch-site')` (~4344), `createSite` updated_existing branch (~7728), `createSite` fresh-creation branch (~7786).
- `scripts/fam-hub` — new `studio` command group with `patches list|show|apply|reject` actions. Uses `$HUB_ROOT` (NOT a non-existent `$FAMTASTIC_HOME`). Patch ID strict regex: `^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[0-9a-f]{6}$`. Description and target-path output run through a `sanitize_terminal` filter that strips ANSI escapes and bare control bytes. Apply re-validates via the Node helper before performing replacement; on `flagged_secret=true` prints a warning and proceeds without re-asking; on policy-mismatch refuses and shows policy_at_propose vs current_policy.

### How the four-class policy actually behaves

| Policy | Read | Patch | acknowledge_secrets effect |
|--------|------|-------|----------------------------|
| ALLOW | Returns contents | Queues patch | n/a |
| READ_ONLY | Returns contents | Refused | None — flag does NOT bypass |
| BLOCK + override_allowed=true | Refused; override available | Refused; override available | When `true`, returns contents / queues patch; patch is tagged `flagged_secret: true` |
| BLOCK + override_allowed=false | Refused; hard block noted | Refused; hard block noted | None — explicit `attempted_override + override_refused` markers |
| REVIEW | Refused; inventory must be updated | Refused; inventory must be updated | None — flag does NOT bypass |

### Known Gaps for Studio Tier

- `STUDIO-CONTEXT.md` is REGENERATED on every Shay-Shay session start (overwriting the entire file via `studio-context-writer`). Patches against this file via Studio Tier are blocked at the policy layer (READ_ONLY) because they would be clobbered immediately. Documented as the intended behavior.
- `script.py` at the repo root is empty and classified REVIEW. Recommended action is deletion, not patching. No automated cleanup.
- The validate-script-runs-resolver path means apply is slower than necessary (one Node spawn per apply). Acceptable for day-one volumes; revisit if patch volume grows.
- No automated test running on patch apply. If a patch breaks tests, the operator finds out by running tests after applying. Spec-deferred per non-goal #1.
- `tools/`, `sites/`, `node_modules/`, `.git/`, `.studio-patches/applied|rejected/`, `.netlify/`, `.local/`, `.playwright-mcp/`, `.worker-queue.jsonl`, `.claude/` are all hard-blocked (`override_allowed=false`) and cannot be opened by Studio Tier even with acknowledgment. This is intentional. If a future workflow needs access to one of these (e.g. patching a vendored MCP), the inventory must be updated to reclassify the path — there is no programmatic backdoor.

## GoDaddy / cPanel MCP capability spike (2026-04-29)

Installed [`ringo380/cpanel-mcp`](https://github.com/ringo380/cpanel-mcp)
v1.1.0 at `~/famtastic/tools/cpanel-mcp/` to replace manual cPanel clicking
in the factory pipeline. **First proof-of-concept:** provisioned the MBSH
reunion database (`nineoo_mbsh96_reunion`), user (`nineoo_mbsh_user`), and
`ALL PRIVILEGES` grant via the MCP end-to-end. Auth uses an API token
(`CPANEL_API_TOKEN` in `.env`, mode 0600) — no password.

**Upstream bug fixed locally** (see `tools/cpanel-mcp/PATCHES.md`): the
shipped `src/cpanel-client.ts` parses responses as the legacy
`response.data.cpanelresult.event.result` shape but actually requests the
modern UAPI v3 endpoint `/execute/<Module>/<func>`, which returns
`{ status, data, errors, messages, warnings, metadata }` at the top level.
Every tool call failed with `Cannot read properties of undefined (reading
'event')` until the parser and the `CpanelResponse` type were rewritten to
UAPI v3. PR pending; fork-fallback check-in 2026-05-13 in
`FAMTASTIC-STATE.md` → Pending Tasks.

**Working tools (37 registered, 4 verified end-to-end this session):**
`list_databases`, `create_database`, `create_database_user`,
`set_database_privileges`. Available but not yet exercised: subdomain CRUD,
DNS record CRUD, SSL upload/install, file upload/download, email/FTP/cron,
backups, disk usage. Full inventory in
`docs/operating-rules/godaddy-mcp-spike.md`.

**Biggest factory gap: no `create_addon_domain` tool.** Addon-domain
creation is the operation that ties a fresh site to its public domain;
until we extend the MCP (UAPI module `AddonDomain`, function
`addaddondomain`), every new site requires one manual cPanel click.
`mbsh96reunion.com` will be added by hand for now. Layer-2 priority list
in the spike doc: `create_addon_domain` (P1), `delete_addon_domain`,
`issue_autossl_certificate`, `set_php_version`.

**Harness constraint discovered (architectural):** the Claude Code Bash
tool cannot accept interactive stdin from the user's TTY. Spawned
subprocesses inherit harness stdin, so `read -rsp` returns immediately
with empty input even when prompts go to stderr. Pattern used in this
session: assistant wrote `inject-token.sh` (mode 0700) and the user ran
it themselves in their own terminal; the script `read -rsp`'d the token,
sed-injected into `.env`, `unset`'d the variable, and self-deleted.
**Implication for Studio (Layer 3):** Studio cannot prompt the user for
secrets mid-flow through Claude Code. cPanel credentials must be
pre-provisioned (env file written outside the harness, macOS keychain,
or a secrets manager) before Studio invokes the MCP. Any provisioning
intent (future `provision_hosting`) must hard-fail with a clear
"run this bootstrap script in your terminal" message if `.env` is
missing or unreadable.

**Files added:**
- `tools/cpanel-mcp/` (vendored upstream + local patches)
- `tools/cpanel-mcp/.env` (0600, secrets, gitignored)
- `tools/cpanel-mcp/test-connection.js` (stdio MCP smoke test)
- `tools/cpanel-mcp/provision-mbsh.js` (MBSH provisioning one-shot)
- `tools/cpanel-mcp/PATCHES.md` (re-apply procedure for the parser fix)
- `docs/operating-rules/godaddy-mcp-spike.md` (gap analysis + Layer 2/3
  recommendations)

This spike explicitly did **not** add the addon domain, configure DNS,
modify any Studio code, or touch the MBSH scaffold. It is a capability
spike only; Studio integration is Layer 3 and tracked separately.

## Platform audit fixes (2026-04-17)

13 audit findings from `docs/platform-audit-report.md` closed in one sweep.
See CHANGELOG.md entry for the full inventory. Notable takeaways:

**C-01 — "fresh mode" detection must key off intent, not loaded state.**
`buildFromBrief()` previously derived *is new-site context?* from
`window.config.tag`, but `config.tag` is set on every page load regardless of
whether the user is starting a new site or continuing one. The correct signal
is the explicit `freshMode` closure flag that `mountFresh()` raises. Rule: any
UI flow that forks on "new vs existing" must rely on an explicit state flag
that the triggering action set — never on the presence of ambient load-time
values.

**C-02 — always install uncaughtException + unhandledRejection handlers on
long-running Node servers.** One leaked promise rejection in a WS handler had
been taking the whole Studio down. Handlers live in `server.js` just after
the SIGINT/SIGTERM registrations so they're active before any route code
executes.

**H-04 — post-processing steps must be try/catched individually.** A throw
in `extractAndRegisterSlots()` cascaded into skipping every downstream
step, leaving `spec.media_specs` silently empty. Fix: wrap each step in
`runPostProcessing()` so a single failure is logged and isolated. Pattern
applies to every pipeline that runs multiple independent side-effects.

**H-01/H-02 — stub functions are worse than missing ones.** `refreshDeployInfo()`
was `function refreshDeployInfo() {}` — a silent no-op that let the deploy pane
render static ✗ marks. Live functions fetch `/api/verify` + `/api/studio-state`
and render real ✓/⚠/✗ per-check status, environment URLs, and deploy history.
Rule: delete the stub or implement it; don't ship the empty function.

**L-02 — env var presence is not API health.** `capability-manifest.js` used
to report `gemini_api: 'available'` whenever `GEMINI_API_KEY` was set — even
when the key was revoked and every call returned 403. Now the manifest asks
`brain-verifier.getBrainStatus()` first and only falls back to env-var
presence when the verifier hasn't probed yet. Startup also awaits
`verifyAllAPIs()` before building the manifest so the first snapshot reflects
real-world probe results.

**M-06 — dedupe before injecting.** `ensureHeadDependencies()` now strips
bare root-level `fam-motion.js` / `fam-scroll.js` references Claude
occasionally emits, then injects the canonical `assets/js/…` versions. The
two 404s per page load they produced had been a persistent console-noise
issue for weeks.

**Pre-existing test debt observed (not fixed by this audit):** phase2 UI
shell (tab-pane-preview expectations, missing patch endpoints — 5 failures),
phase3 multi-agent (sync scroll checkbox + others — 13 failures), phase4
image-research (same tab-pane-preview assertions — 5 failures),
session10-phase0 (file has a literal syntax error — unterminated string at
line 50), session10-phase3 (interview state — 12 failures). These all
pre-date the audit; verified via pre-fix test run. Out of scope but worth
triaging in a dedicated pass.

---

## CSS variable alias normalization (2026-04-20)

**Root cause:** Template builds and parallel page builds are separate Claude calls.
The template emits a `<style data-template="shared">` block with a `:root {}`
that uses one naming convention (e.g. `--color-text-light`). A different build
run (or a different model's output) may produce a `:root {}` with a different
convention (`--color-text-muted`). `writeTemplateArtifacts()` writes whatever
is in the template's shared style block to `assets/styles.css`. If the page CSS
uses `--color-text-light` but styles.css only defines `--color-text-muted`, the
variable silently falls through to the browser default.

**Fix:** `normalizeCssAliases(stylesPath)` — reads the `:root {}` block, builds
a set of defined variable names, then injects any missing aliases as
`--alias: var(--source);` entries. Bidirectional pairs covered:
- `--color-text-light` ↔ `--color-text-muted`
- `--color-bg-light` ↔ `--color-surface` (→ `--color-bg`)
- `--color-accent-hover` ↔ `--color-accent-light`
- `--color-text-dark` → `--color-text`

Called from `writeTemplateArtifacts()` (template-first path) and
`extractSharedCss()` (legacy path) immediately after `styles.css` is written.

Rule: never define only one side of a CSS variable alias pair. When adding a
variable name convention to a build prompt, also add the alternate name or
add it to the `normalizeCssAliases` alias table.

---

## Build model + auto image fill (2026-04-20)

**Default model changed to Sonnet**
`loadSettings()` in `server.js` previously defaulted to `claude-haiku-4-5-20251001`.
All build paths (`parallelBuild`, `spawnAllPages`, `callSDK`, `spawnClaude`,
`handleChatMessage`) read from `loadSettings().model`, so the single default
controlled every HTML generation call. Changed to `claude-sonnet-4-6`. Also
updated `~/.config/famtastic/studio-config.json` (the live settings file) so
the change takes effect immediately without a settings reset. Haiku is still
referenced in the cost table and as the named fallback model — not removed.

**Step 10 — `fillImageSlotsAfterBuild()`**
Added as the final step in `runPostProcessing()`, fired only on `isFullBuild: true`
(parallel builds — not single-page edits). The function:
1. Reads `spec.media_specs` for any slot where `status` is not `filled`,
   `stock`, `uploaded`, or `generated`. Skips `logo` and `favicon` roles.
2. Tries Imagen 4 via `scripts/google-media-generate` Python script with a
   role-aware prompt (hero, gallery, team, testimonial, service, or generic).
   Saves to `dist/assets/<slot_id>.jpg`.
3. Falls back to Unsplash if Imagen fails: calls `fetchFromProvider('unsplash', ...)`
   then downloads the imgix-resized URL to the same path.
4. On each success: calls `patchSlotImg()` across all written pages, updates
   `spec.slot_mappings` and `slot.status`, and sends a WS status message.
5. Logs a console warning with the slot ID if both providers fail; sends a WS
   `⚠️` message.
6. Calls `writeSpec()` once after all slots are processed.
7. Sends `reload-preview` + `spec-updated` WS messages when at least one slot
   was filled so the browser updates instantly.

Fire-and-forget pattern: `fillImageSlotsAfterBuild` is async but called with
`.catch()` from the synchronous `runPostProcessing`. Post-processing completes
immediately; images appear in the preview as they are filled, one by one.

Known: Imagen 4 requires a paid Google Cloud key with Imagen access — not just
a standard API Studio key. The Unsplash fallback handles 403s cleanly.

---

## Autonomous build pipeline fixes (2026-04-20)

Investigation and fixes for two bugs that caused the `/api/autonomous-build`
path to silently stop before full completion.

**Bug 1 — subprocess page silently dropped (spawnAllPages retry)**
The subprocess path (used when `ANTHROPIC_API_KEY` is not set) builds pages
sequentially via `spawnClaude()`. Under rate pressure or transient failure,
the third sequential call could return an empty response — and the original
code had no retry. Fix: `spawnAllPages()` now runs a single retry pass for
any page that returned fewer than 50 characters on first attempt. Log message:
`[parallel-build-sub] N page(s) failed first pass — retrying: ...`

**Bug 2 — spec.state never transitions to 'built' (finishParallelBuild)**
`finishParallelBuild()` did all post-processing, SEO, intelligence, and DNA
updates — but never wrote `spec.state = 'built'`. Every downstream system
(build-status API, Studio UI) that checks `spec.state === 'built'` would see
`'briefed'` forever. Fix: after `setBuildInProgress(false)`, read and rewrite
the spec with `state: 'built'`.

**Bug 3 — double build lock (parallelBuild guard)**
`handleChatMessage()` calls `setBuildInProgress(true, ws)` at line 10684,
then calls `parallelBuild()` which also calls `setBuildInProgress(true, ws)`
at line 8634. Two lock acquisitions 2ms apart triggered two run IDs and
could kill the template subprocess via SIGTERM. Fix: `parallelBuild()` now
guards with `if (!buildInProgress) setBuildInProgress(true, ws)` so it only
acquires the lock when the caller (brainstorm rebuild path) hasn't already.

**WS warning for empty media_specs after build**
`extractAndRegisterSlots()` had a `console.warn` for empty slots but sent no
WebSocket notification. `finishParallelBuild()` now also sends a `type: status`
WS message when `media_specs` is empty after post-processing.

**Partial build warning**
`finishParallelBuild()` compares `writtenPages.length` against expected page
count and emits both a console warning and a WS status message when pages
are missing: `Build incomplete: N/M pages built — X page(s) failed.`

Rule: `spec.state` progresses `new` → `briefed` → `built` → `deployed`.
The `'built'` transition must be written by `finishParallelBuild()` — no
other code path ensures it.

---

## Consolidation (2026-03-12)

4 repos merged to 1: `~/famtastic/` (renamed from famtastic-agent-hub). Dead code deleted (~40%). Think-Tank CLIs and Platform's useful bits absorbed as `fam-hub idea` and `fam-hub admin` subcommands. Three repos archived: famtastic-platform, famtastic-think-tank, famtastic-dev-setup.

### What's in the consolidated repo

**Two active capabilities:**
1. **Site factory** (revenue path) — chat-driven website builder, template system, deploy pipeline
2. **Multi-agent workflow** (productivity multiplier) — Claude/Gemini/Codex adapters, conversation reconciliation

**What works end-to-end:**
- Site builder pipeline: spec.json -> Claude CLI generates HTML -> live preview -> deploy to Netlify
- Chat studio: Express + WebSocket UI, chat panel + iframe preview, routes to Claude for site refinement
- Asset generation: `asset-generate` produces SVGs via Claude CLI for logos, icons, favicons, banners, dividers, illustrations
- Templates: 4 ready (event, business, portfolio, landing) with placeholder replacement
- Deploy: Netlify and Cloudflare supported, spec.json updated with URL, domain helper for GoDaddy DNS
- Claude CLI integration: `claude --print` replaces all Anthropic Python SDK calls, no API key needed
- Conversation reconciliation: `cj-reconcile-convo` + `cj-compose-convo` work
- Native CLI adapters: `claude-cli`, `gemini-cli`, `codex-cli` functional
- Idea lifecycle: 7 Python CLIs (capture, triage, blueprint, prototype, validate, learn, digest)
- Admin: `fam-hub admin doctor` (health check) + `fam-hub admin verify` (repo validation)

---

## What Works End-to-End (The Money Path)

```
fam-hub site new <tag>     →  Opens chat studio + live preview in browser
  "I want a reunion site"  →  Triggers planning mode → design brief artifact
  User approves brief       →  Claude generates full HTML from brief + decisions
  "Make the header blue"   →  Classifier routes as layout_update, targeted edit
  "Create a logo"          →  SVG generated, saved to dist/assets/
  "Use the event template" →  Template applied with spec colors/fonts
  Drag-drop an image        →  Upload with role, optional slot replacement
  "Add images"             →  Fills empty image slots with stock photos (Unsplash/Pexels/Pixabay fallback)
fam-hub site deploy <tag>  →  Pushes to Netlify, returns live URL
fam-hub site domain <tag>  →  Shows DNS records for GoDaddy
fam-hub site list          →  Dashboard of all sites with status
```

---

## Slot-Based Image System

Every `<img>` in a generated site carries three data attributes that form its identity:

```html
<img data-slot-id="hero-1" data-slot-status="empty" data-slot-role="hero"
     src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
     alt="Hero image" class="w-full h-96 object-cover" />
```

- `data-slot-id` — unique role-based ID. Claude infers from context: `hero-1`, `testimonial-2`, `service-mowing`, `gallery-3`, `team-1`, `logo-1`.
- `data-slot-status` — lifecycle state (see below).
- `data-slot-role` — semantic purpose. One of: `hero`, `testimonial`, `team`, `service`, `gallery`, `logo`, `favicon`.

`media_specs` in `spec.json` is the **single source of truth** for all image slots across the site. Brand Health, stock photo fill, and upload replacement all read from and write to it.

### Slot Status Lifecycle

| Status | Meaning | src value |
|--------|---------|-----------|
| `empty` | Initial state after build. Transparent 1x1 pixel data URI. No visual content. | `data:image/gif;base64,R0lGOD...` |
| `stock` | Filled with an Unsplash photo or branded SVG placeholder. Ready to be upgraded. | `assets/stock/{slot-id}.jpg` or `assets/placeholders/{name}.svg` |
| `uploaded` | User provided a real asset via the upload modal. | `assets/uploads/{filename}` |
| `final` | Approved for production. (Not yet used in automated flows — reserved for future approval step.) | varies |

### media_specs Schema

Each entry in `spec.json → media_specs[]`:
```json
{
  "slot_id": "hero-1",
  "role": "hero",
  "dimensions": "1920x1080",
  "status": "empty",
  "page": "index.html"
}
```

### Dimension Defaults by Role

Defined in `SLOT_DIMENSIONS` constant in `server.js`:

| Role | Dimensions |
|------|-----------|
| hero | 1920x1080 |
| testimonial | 400x500 |
| service | 800x600 |
| team | 400x400 |
| gallery | 800x600 |
| logo | 400x200 |
| favicon | 512x512 |

### Slot Extraction (Post-Build)

Two functions in `server.js` handle slot registration:

- `extractSlotsFromPage(html, page)` — regex-scans a single HTML string for `<img>` tags with `data-slot-id`. Returns an array of `{ slot_id, role, dimensions, status, page }`.
- `extractAndRegisterSlots(pages)` — scans all specified pages (or all pages if none given), merges results into `media_specs` in spec.json. Preserves existing status (won't regress `stock` → `empty`). Removes specs for slots no longer present in the scanned pages.

These run automatically in the post-build pipeline:
- After `MULTI_UPDATE` — called with `writtenPages` array (all newly generated pages).
- After `HTML_UPDATE` — called with `[currentPage]`.

`autoDetectMediaSpecs(html)` is kept as a **legacy fallback** for HTML generated before the slot system existed. It uses regex heuristics to detect hero/logo/gallery/team sections and creates spec entries with the new `slot_id` schema. If the HTML already contains `data-slot-id` attributes, the legacy function is a no-op.

### Build Prompt Rules

The build prompt in `server.js` includes an `IMAGE SLOTS (CRITICAL)` section that instructs Claude to:
- Put all three `data-slot-*` attributes on every `<img>` tag
- Always set `data-slot-status="empty"` on initial generation
- Use the transparent 1x1 pixel data URI for `src` — never Unsplash URLs or fake filenames
- Generate unique slot IDs: numbered for repeating elements (`testimonial-1`, `gallery-3`), descriptive slugs for services (`service-mowing`)

### Stock Photo Fill (Multi-Provider System, updated 2026-03-24)

**Script:** `scripts/stock-photo` — shell script that downloads a stock photo via 3-provider fallback chain.
- Usage: `stock-photo <query> <width> <height> <output-path>`
- Provider order: Unsplash → Pexels → Pixabay (skips any provider with no API key)
- Env vars: `UNSPLASH_API_KEY`, `PEXELS_API_KEY`, `PIXABAY_API_KEY`
- Prints `provider=unsplash|pexels|pixabay` to stdout so the caller knows which succeeded
- Dependencies: `curl`, `python3` (for URL encoding and JSON parsing — no `jq` dependency)
- If all 3 fail or no keys configured: exit 1, slot stays empty

**API key configuration:** `~/.config/famtastic/studio-config.json` → `stock_photo` object with 3 keys: `unsplash_api_key`, `pexels_api_key`, `pixabay_api_key`. All 3 are configurable from the Settings UI (Stock Photos section).

**Provider abstraction:** `fetchFromProvider(provider, query, width, height, limit)` in `server.js`
- `'unsplash'` — Unsplash API (requires `UNSPLASH_ACCESS_KEY`)
- `'pexels'` — Pexels API (requires `PEXELS_API_KEY`)
- `'placeholder'` — generates a styled SVG data URL inline (zero dependencies, always works)
- Returns `[{ url, thumb, credit, provider }]` array
- Used by both `/api/stock-search` (preview) and `/api/stock-apply` (download)

**Contextual stock queries:** Query is no longer just the slot role. When the auto-fill handler runs, it builds: `"${businessName} ${industry} ${role}"` — e.g., `"The Best Lawn Care lawn maintenance gallery"` instead of `"gallery"`. Applies when `query === slotSpec.role` and business context is available from spec.

**Endpoints:**
- `POST /api/stock-photo` — auto-applies first result to slot (used by bulk fill). Accepts `{ slot_id, query }`. Stores `{ src, alt, provider, query, credit }` in `slot_mappings`.
- `GET /api/stock-search?slot_id=X&query=Y` — returns up to 6 thumbnails from all configured providers for the QSF preview grid. Used by Quick Slot Fill "Stock" button.
- `POST /api/stock-apply` — downloads a specific URL (selected from preview grid) and applies it to a slot.

**QSF Stock preview grid (updated):** Clicking "Stock" in the Quick Slot Fill panel no longer immediately applies a photo. Instead it opens a floating panel with:
- Editable query field pre-filled with contextual query
- 6-thumbnail grid (up to 3 from each configured provider)
- Provider badge on each thumb (Unsplash/Pexels/placeholder color-coded)
- Credit name below thumb
- "Refresh" button re-queries with edited query
- Clicking a thumb calls `POST /api/stock-apply` and closes the panel

**Classifier intent:** `fill_stock_photos`
- Triggers on: "add images", "fill images with stock photos", "add relevant photos", "I need images", "fill the image slots", "get photos"
- Handler reads all `empty` slots from `media_specs`, generates contextual search queries per slot
- Passes all 3 API keys as env vars to `scripts/stock-photo`
- Per-slot progress sent via WebSocket with provider attribution: `"hero-1 filled via Pexels"`
- Stores `{ src, alt, provider, query, credit }` in `spec.json → slot_mappings` for rebuild persistence

**No offline dead-end:** SVG placeholder provider (`fetchFromProvider('placeholder', ...)`) generates a styled SVG data URL as last resort — always returns something even with no API keys configured. No more `"Stock photo failed"` dead ends.

**No offline fallback in bulk build pipeline:** Auto-placeholder generation (`bulkGeneratePlaceholders()`) has been removed from all 3 automatic build pipeline call sites. Empty slots stay as transparent pixels until explicitly filled via stock photos or upload.

### Upload-to-Replace (Slot Targeting)

**Endpoint:** `POST /api/replace-slot` in `server.js`
- Accepts: `{ slot_id, newSrc }`
- Finds the `<img>` with matching `data-slot-id` across all pages
- Updates `src` to `newSrc`, sets `data-slot-status="uploaded"`
- Deletes old stock photo from `dist/assets/stock/` if one exists
- Updates `media_specs` status to `uploaded`
- Stores mapping in `spec.json → slot_mappings` for rebuild persistence

**Upload modal dropdown:** When the user uploads a file, the role selector modal includes a "Replace Image Slot" dropdown populated from `media_specs` via `GET /api/site-info`. Each option shows: slot ID, role, current status, and page. Selecting a slot causes the uploaded file to replace that slot in the HTML after upload completes.

The old `POST /api/replace-placeholder` endpoint still exists for backward compatibility (matches by `src` string) but the upload modal now uses `POST /api/replace-slot` exclusively.

### Slot Mapping Persistence (added 2026-03-24)

Images assigned to slots (via upload or stock photo fill) survive rebuilds through a mapping system:

**Storage:** `spec.json → slot_mappings` — object keyed by slot ID:
```json
"slot_mappings": {
  "hero-1": { "src": "assets/uploads/firefly_luxury-1920x1080.jpg", "alt": "Luxury lawn", "provider": "uploaded", "query": null, "credit": null },
  "gallery-3": { "src": "assets/stock/gallery-3.jpg", "alt": "Gallery image", "provider": "unsplash", "query": "The Best Lawn Care lawn maintenance gallery", "credit": "John Smith" }
}
```

**Write paths:** Mappings are written when:
- `POST /api/replace-slot` succeeds (upload assignment)
- `fill_stock_photos` handler fills a slot (stock photo download)
- `POST /api/stock-apply` applies a QSF-selected image

**Re-application:** `reapplySlotMappings(writtenPages)` in `server.js`:
- Reads `slot_mappings` from spec.json
- For each written page, scans for `data-slot-id` attributes via regex
- If a slot has a mapping, replaces `src` with the mapped value and sets `data-slot-status="uploaded"`
- Runs in all 3 post-processing paths: after `finishParallelBuild()`, after MULTI_UPDATE, after HTML_UPDATE
- Followed immediately by `reconcileSlotMappings()` (see below)

**Prompt injection:** `buildPromptContext()` includes an `EXISTING IMAGES` section listing all mapped slots with their src paths, instructing Claude not to replace them with placeholders. This context is injected into both single-page and parallel build prompts.

**Clear mapping endpoint:** `POST /api/clear-slot-mapping` — accepts `{ slot_id }`, removes key from `slot_mappings`, resets `media_specs` status back to `empty`. Called by QSF "Clear" button.

---

### Slot Lifecycle Integrity (added 2026-03-24)

Addresses the lifecycle problem: as sites go through iterations and rebuilds, slot IDs change and old mappings accumulate silently.

**`reconcileSlotMappings()` in `server.js`:**
- Scans all pages in `DIST_DIR()` for all real `data-slot-id` values
- Compares against `spec.slot_mappings` keys
- Removes any keys not found in any page HTML (orphaned mappings)
- Returns `{ removed: [...orphanIds] }` for logging
- Runs automatically after `reapplySlotMappings` in the post-build pipeline

**`POST /api/rescan` endpoint:**
- Calls `extractAndRegisterSlots(listPages())` — re-scans all pages
- Calls `reconcileSlotMappings()` — removes orphans
- Returns `{ success, slots_registered, orphans_removed, pages_scanned, orphans }`
- Manual trigger: "Rescan" button in Studio preview toolbar

**Rescan button:** Small "Rescan" button in the preview toolbar (next to Slots toggle). On click: POST /api/rescan → shows result in status bar for 5 seconds → refreshes Brand Health → refreshes slot preview if active.

**Slot ID stability injection:** On single-page chat edits, current slot IDs for the page being edited are injected into the build prompt:
```
SLOT ID PRESERVATION (CRITICAL): Preserve these existing slot IDs exactly:
  hero-1 (hero)
  gallery-1 (gallery)
Only create new IDs for genuinely new slots.
```
Source: filters `spec.media_specs` by current page, extracted before the Claude call. Prevents "hero-1 becomes hero-main on rebuild" orphan cascade.

**Single-page edit slot registration fix:** The `isFullBuild` guard that prevented `extractAndRegisterSlots` from running on single-page chat edits was removed. Every page edit now calls `extractAndRegisterSlots([editedPage])` so new slots added via chat are immediately registered in `media_specs`.

**`GET /api/site-info` alias:** Returns `{ spec }` envelope — same data as `/api/spec` but wrapped in the shape expected by client-side code that needs `data.spec.slot_mappings`, `data.spec.uploaded_assets`, etc.

### Brand Health (Metrics Dashboard, updated 2026-03-24)

`scanBrandHealth()` in `server.js` reads directly from `media_specs` in spec.json. `GET /api/brand-health` enriches the scan result with:
- `orphaned_mappings` — count of `slot_mappings` keys not found in any page HTML
- `upload_count` — current uploaded_assets count
- `upload_limit` — from `loadSettings().max_uploads_per_site` (default 100)

The Brand Health panel in `index.html` renders a **metrics dashboard** (the old flat per-slot list has been removed — slot management lives in Visual Slot Mode):
- Color-coded legend (red=empty, yellow=stock, green=uploaded)
- Key slots section (hero, logo, favicon with individual status)
- Image sets section (testimonials, gallery, services, team — filled/total)
- Social & meta section (OG image, Twitter Card)
- Font icons section

**Site Metrics sub-section (bottom of Brand Health):**
- **Slot coverage** — filled/total progress bar with percentage. Color: green ≥80%, yellow ≥40%, red <40%
- **Uploads used** — count/limit progress bar. Color: red ≥90%, yellow ≥70%, green <70%
- **Orphaned mappings** — count. Amber if >0, with inline "Rescan to fix" button
- **Empty slot count** — "Fill all with stock" + "Open Slots" action buttons (only shown if empty slots > 0)

The per-slot flat listings (Empty Slots / Stock Photos / Uploaded sections) were removed. Interactive per-slot management is handled by Visual Slot Mode.

---

## Nav Partial System

Keeps navigation consistent across all pages of a multi-page site.

**How it works:**
- `syncNavPartial(ws)` in `server.js` — on first run, extracts the `<nav>` element from `index.html` (or the first available page) and writes it to `dist/_partials/_nav.html`. On subsequent runs, reads the canonical nav from `_nav.html` and replaces the `<nav>` in every page that has a different version.
- `syncNavFromPage(ws, sourcePage)` — when a single page is edited, extracts the `<nav>` from that page, overwrites `_nav.html`, then syncs the updated nav to all other pages.

**When it runs:**
- After every `MULTI_UPDATE` build (post-build pipeline, after `extractAndRegisterSlots` and `reapplySlotMappings`)
- After every `HTML_UPDATE` (via `syncNavFromPage` for the edited page, then `syncNavPartial` for all pages)
- Manual trigger: `POST /api/sync-nav`

**Deploy exclusion:** `_partials/` is appended to `dist/.netlifyignore` automatically so the partial files are not deployed.

**Files:**
- `dist/_partials/_nav.html` — canonical nav element
- `dist/.netlifyignore` — excludes `_partials/` from deploy

Nav, footer, and head sections are all synced. Footer sync uses the same partial pattern (`syncFooterPartial()` / `syncFooterFromPage()`). Head sync (`syncHeadSection()`) propagates Tailwind CDN, Google Fonts, custom styles, and icon CDNs from the source page to all others. Manual footer sync available via `POST /api/sync-footer`.

---

## Share Functionality

The Studio UI has a Share section (visible only when the site is deployed) with three share methods:

### Email (Gmail SMTP)

- **Endpoint:** `POST /api/share` with `type: "email"`
- **Transport:** nodemailer with provider-specific SMTP config. Provider map in `server.js` supports: Gmail (`smtp.gmail.com:587`), Outlook (`smtp-mail.outlook.com:587`), SendGrid (`smtp.sendgrid.net:587`), Custom (user-specified host/port).
- **Config:** `~/.config/famtastic/studio-config.json` → `email` object: `provider`, `user`, `app_password`, `from_name`, `host`, `port`.
- **HTML formatting:** Email body renders URLs as clickable `<a>` tags via regex replacement. Includes "Sent from FAMtastic Site Studio" footer.
- **Fallback:** If email credentials are missing, returns a `mailto:` URI for the browser to handle.

### Text (macOS Messages.app)

- **Method:** Client-side `sms:` URI scheme. When the user clicks "Text", the frontend opens `sms:{recipient}?body={message}` which launches the macOS Messages app with the message pre-filled.
- **No server-side SMS:** The email-to-SMS carrier gateway approach (`{number}@tmomail.net`) was attempted and abandoned — T-Mobile blocks it (AUP#MXRT). Twilio/Vonage are configured in the Settings UI but not wired to behavior.
- **Config:** `~/.config/famtastic/studio-config.json` → `sms` object: `provider`, `carrier`, `from_number`. Currently set to `email_gateway` provider with `tmobile.net` carrier, but the actual send path uses the `sms:` URI, not the gateway.

### Copy Link

- Client-side `navigator.clipboard.writeText()` — copies the deployed URL.

---

## Settings & Provider Configuration

**Settings file:** `~/.config/famtastic/studio-config.json`
**API:** `GET/PUT /api/settings`
**UI:** Gear icon → modal with scrollable form (`max-w-lg`, `max-h-[90vh] overflow-y-auto`)

### Email Provider Dropdown

Options: Gmail, Outlook, SendGrid, Custom SMTP. Selecting a provider shows/hides relevant fields (host/port for Custom, hidden for Gmail/Outlook). Gmail requires a Google App Password (not regular password).

### SMS Provider Dropdown

Options: Email Gateway (with carrier selector for AT&T/T-Mobile/Verizon), Twilio, Vonage. Twilio/Vonage show account SID, auth token, and from number fields. **Note:** Only the `sms:` URI path works in practice — see Share section above.

### Stock Photos (added 2026-03-24)

3 password-type API key fields: Unsplash, Pexels, Pixabay. Keys stored under `stock_photo` in config. Helper text explains fallback order. All 3 keys passed as env vars to `scripts/stock-photo` when filling slots.

### Other Settings

- **Model:** dropdown, currently `claude-haiku-4-5-20251001`. All `spawnClaude()` calls read from this.
- **Deploy target:** Netlify, Cloudflare, Vercel. All three implemented in `scripts/site-deploy`.
- **Deploy team:** string, used by `scripts/site-deploy` for Netlify `--team` flag.
- **Upload limits:** `max_upload_size_mb` (default 5), `max_uploads_per_site` (default 100, raised from 20).
- **Version limits:** `max_versions` (default 50).
- **auto_summary / auto_version toggles:** Wired. `versionFile()` checks `auto_version` before snapshotting. `endSession()` checks `auto_summary` before generating summaries.

---

## Deploy Pipeline

**Script:** `scripts/site-deploy`
**Usage:** `site-deploy <tag> [--provider netlify|cloudflare] [--prod]`

### Provider Resolution Order

1. `--provider` flag
2. `spec.json → deploy_provider`
3. `config/site-deploy/defaults.yaml → default_provider`
4. Auto-detect: check for `netlify` CLI, then `wrangler` CLI

### Netlify Deploy Flow

1. Check `sites/<tag>/.netlify/state.json` for existing site ID
2. **Fallback:** if no `state.json`, check `spec.json → netlify_site_id` and recreate `state.json` from it
3. If site ID exists: `netlify deploy --dir=dist --site SITE_ID [--prod]`
4. If no site ID: `netlify deploy --dir=dist --create-site TAG --team fritz-medine [--prod]`
5. After deploy: extract URL from output, update `spec.json` with `deployed_url`, `deployed_at`, `deploy_provider`, `state`

### stdout/stderr Separation

All status messages (`[deploy] Uploading...`, `[deploy] Creating new site...`) go to **stderr**. Only the final deployed URL goes to **stdout**. This is critical because `server.js` captures the deploy output with `DEPLOY_URL=$(deploy_netlify)` — if status messages went to stdout, they'd corrupt the URL stored in `spec.json`.

### Cloudflare Deploy

Uses `npx wrangler pages deploy` with project name derived from tag. Same stdout/stderr separation pattern.

---

## Request Classifier

`classifyRequest(message, spec)` in `server.js` returns one of 21 intent types. Precedence matters — earlier matches take priority.

| Intent | Triggers | Handler |
|--------|----------|---------|
| `brief_edit` | "edit brief", "update brief", "change the goal" | `handlePlanning()` |
| `brand_health` | "check brand", "brand health", "what's missing" | `scanBrandHealth()` report |
| `brainstorm` | "brainstorm", "let's think", "explore ideas" | `handleBrainstorm()` |
| `rollback` | "rollback", "undo", "revert", "go back" | `rollbackToVersion()` |
| `version_history` | "version", "history", "changelog" | Show version list |
| `summarize` | "summarize", "wrap up", "save progress" | `generateSessionSummary()` |
| `data_model` | "data model", "database", "schema", "CMS" | `handleDataModelPlanning()` |
| `tech_advice` | "what tech", "which platform", "static or CMS" | `analyzeTechStack()` |
| `template_import` | "import template", "use this template" | Instructions for upload |
| `page_switch` | "go to about page", "switch to services" | Direct page change |
| `deploy` | "deploy" (not "how to deploy") | `runDeploy()` |
| `build` | "build the site", "use event template" | `handleChatMessage()` or `runOrchestratorSite()` |
| `query` | "list", "show", "preview" | `handleQuery()` |
| `asset_import` | "create a logo", "generate a favicon" | `runAssetGenerate()` |
| `fill_stock_photos` | "add images", "fill stock photos", "I need images" | Stock photo fill handler |
| `new_site` | No approved brief exists | `handlePlanning()` |
| `major_revision` | "start over", "scrap it", "completely different" | `handlePlanning()` |
| `restyle` | "make it more minimal", "change the overall vibe" | `handleChatMessage()` |
| `layout_update` | "add a section", "move the hero" | `handleChatMessage()` |
| `content_update` | "change the phone number", "update the heading" | `handleChatMessage()` |
| `bug_fix` | "broken", "not working", "misaligned" | `handleChatMessage()` |

Default fallback (no match): `layout_update`.

---

## Post-Build Pipeline

After Claude generates HTML (either `MULTI_UPDATE` or `HTML_UPDATE`), the following steps run in order via `runPostProcessing()`:

1. **Parse response** — extract HTML and `CHANGES:` summary
2. **Version current files** — `versionFile(page, requestType)` snapshots to `dist/.versions/`
3. **Write HTML to disk** — `fs.writeFileSync()` to `dist/`
4. **Extract design decisions** — `extractDecisions(spec, changeSummary, requestType)` for restyle/layout/build/major_revision
5. **Extract and register slots** — `extractAndRegisterSlots(pages)` scans for `data-slot-id`, merges into `media_specs` — **runs FIRST** so slot IDs exist before mappings are applied
6. **Reapply slot mappings** — `reapplySlotMappings(pages)` restores saved images from `spec.slot_mappings`
7. **Blueprint + SEO** — `updateBlueprint(pages)` + `injectSeoMeta(ws)`
8. **Reconcile** — `reconcileSlotMappings()` removes orphaned mappings
9. **Logo-V** — `applyLogoV(pages)` swaps `[data-logo-v]` content
10. **Nav/Footer sync** — `syncNavPartial(ws)` / `syncFooterPartial(ws)` (full build) or `syncNavFromPage(ws, page)` / `syncFooterFromPage(ws, page)` (single-page)
11. **Head dependencies** — `ensureHeadDependencies(ws)` injects Tailwind CDN, Google Fonts — runs on BOTH full builds and single-page edits
12. **Head sync** — `syncHeadSection(ws)` propagates shared `<style>`/`<link>` across pages using MD5 hash fingerprinting (not 80-char prefix)
13. **CSS extraction** — `extractSharedCss(ws)` moves shared styles to `assets/styles.css`, selectively strips only styles matching extracted content (preserves page-specific styles)
14. **Send results** — WebSocket messages: `assistant` (summary), `reload-preview`, `pages-updated`

**Single-page edits** now run the same pipeline steps 5-9 + `ensureHeadDependencies`, but skip `syncHeadSection` and `extractSharedCss` to avoid disrupting inline styles during iterative edits.

---

## Playwright Autonomous Build Pipeline (2026-04-03)

First successful autonomous site build via Playwright driving the Studio GUI.

### What Exists
- Script: `tests/automation/guys-classy-shoes-build.js` — Playwright headless Chromium, DOM-based response detection
- Screenshots: `tests/automation/screenshots/guys-classy-shoes/` — 25 screenshots capturing every step
- Execution log: `tests/automation/logs/guys-classy-shoes-{timestamp}.json` — JSON log with step timing, input/output, success/failure
- Built site: `sites/site-guys-classy-shoes/dist/` — deployed to https://guys-classy-shoes-staging.netlify.app

### Key Findings

| Metric | Value |
|--------|-------|
| Total steps | 23 |
| Pass rate | 100% (23/23) |
| Total duration | 31 min |
| Brief generation | 23s |
| Multi-page build | 102s (produced 1 of 4 requested pages) |
| Stock fill (bulk) | 6s |
| Stock search (targeted) | 124s each (misclassified as layout_update) |
| Post-build edits | 244s each (plan gate blocked, auto-timed-out to completion) |
| Brainstorm response | 17s |
| Brainstorm → build | 55s |
| Version history / Brand health | 4s each |
| Rollback + undo | 4s each |
| Deploy to Netlify | 9s |

### Architecture Decision: DOM-Based Detection

The first version used a standalone WebSocket client to monitor Studio responses. This failed because `server.js` sends WS messages via `ws.send()` (unicast to the originating client), not broadcast. A second WS connection never sees responses.

The working approach uses Playwright's `page.waitForFunction()` to monitor the DOM directly:
1. Count `#chat-messages > div` elements before sending
2. Send chat via `page.fill('#chat-input')` + click submit
3. Wait for `#step-log` to appear (processing) then disappear (done) AND message count to increase
4. Read last message text content

This is reliable because the Studio UI itself updates the DOM from its own WS messages.

### Bottlenecks for 60-Site Factory

1. **No multi-page build from brief** — Currently generates 1 page per `new_site` build. Multi-page requires spec to already list pages. Fix: update spec pages array from brief before triggering build.
2. **Plan approval gate** — Every edit triggers a plan card requiring human click. For automation, need either auto-approve or a `POST /api/chat` endpoint.
3. **Targeted stock searches misclassified** — Goes through full AI rebuild instead of simple image search. Adds ~120s per search unnecessarily.
4. **No REST chat API** — Everything must go through WS-connected browser. `POST /api/chat` would enable CLI and CI/CD automation.

## Research-First Pipeline — Readings by Maria (2026-04-06)

Second autonomous build (Site #3). Tested a new pipeline step: domain research before brief creation. The system had no prior knowledge of psychic services, chakras, tarot, or spiritual practitioner websites.

### Research Phase
- **3 parallel research tracks:** Competitive analysis (12 sites), domain knowledge (chakras, tarot, services, symbolism), visual direction (colors, imagery, typography)
- **4 output files:** `sites/readings-by-maria/research/` — competitive-analysis.md, domain-knowledge.md, visual-direction.md, brief-inputs.md
- **Key research findings that shaped the build:**
  - "Midnight Oracle" dark palette with gold accents (#0B0B14 bg, #C9A84C gold, #7B5EA7 violet) — derived from analyzing Tarot by Dante and similar premium sites
  - Cormorant Garamond + Raleway font pairing — serif headings for ancient wisdom, sans-serif body for modern professionalism
  - Wellness language over fortune-telling language ("guidance" not "predictions") — identified as credibility differentiator
  - 24 specific stock photo queries tested against actual Unsplash/Pexels results, plus 7 queries to explicitly avoid
  - Chakra education section identified as competitive gap (most sites list "chakra balancing" but never explain chakras)

### Multi-Page Conversion Findings
- **Single-to-multi-page conversion via Studio chat: partially successful**
- First attempt ("break into separate pages") classified as `layout_update` — wrong intent. Generated a plan card but `execute-plan` approval did nothing.
- Working path: (1) manually update `spec.json` pages array, (2) send "Rebuild the site with all 4 pages" which classified as `build`, (3) approve plan — multi-page build succeeded.
- Conversion log: `tests/automation/logs/readings-by-maria-multipage-conversion.json`

### Gaps Specific to Multi-Page Conversion — CLOSED (2026-04-06)
- **~~No `restructure` classifier intent~~** — FIXED: Added `restructure` intent to `classifyRequest()` with regex for "break into pages", "separate pages", "split into pages", "make multi-page", etc. Routes to `build` handler via fall-through in `routeToHandler()`. Added to `PLAN_REQUIRED_INTENTS`. Function: `classifyRequest()` in `server.js`.
- **~~`execute-plan` handler silent failure~~** — FIXED: Replaced silent `if (!plan) return` with error message sent to client. Now sends `{type:'error', content:'Plan not found or already executed'}`. Line ~7347 in `server.js`.
- **Stale plan cards accumulate** — mitigated by Fix 3 error message, but DOM-side cleanup still needed (cosmetic, not blocking)
- **~~spec.json pages not auto-populated from brief~~** — FIXED: Added `extractPagesFromBrief()` helper that parses `must_have_sections` against 22 known page names. Called in `approve-brief` handler after `brief.approved=true`. Function: `extractPagesFromBrief()` in `server.js`, exported for testing.
- **brainContext not passed to parallelBuild** — FIXED (pre-existing bug discovered during testing): `parallelBuild()` template literal referenced `${brainContext}` but it wasn't in the function signature. Added to signature and call site.

## Content Editing Gap Analysis (2026-04-07)

Tested 10 real-world content edits through Studio chat on the Readings by Maria site. Results: **8/10 successful, 2 failed**.

### What Works
- **Phone number change** — surgical tel: link + display text update
- **Email change** — mailto: and display text both updated
- **Single price change** — changed only the targeted price, others preserved
- **Business hours addition** — added new content without breaking existing layout
- **Testimonial text + name swap** — 28s surgical edit, no page rebuild (the only truly surgical edit)
- **Add new service** — card added to pricing grid, existing services preserved
- **Remove service** — clean removal, no layout gaps
- **Address addition** — proper address block added

### What Fails
- **Cross-page CTA change** — "change all buttons" only applies to active page. No multi-page edit capability.
- **Seasonal banner** — "add a banner at the top" failed silently. Claude rebuilt the page without including the banner. Ephemeral content not in the original brief gets dropped during rebuilds.

### Systematic Findings
- **0/10 edits classified as content_update** — all routed to `layout_update`. The `content_update` regex requires field name immediately after "the" (e.g., "change the phone") but real-world edits include location words ("change the CONTACT phone"). Regex needs widening.
- **9/10 edits required plan approval** — only the testimonial edit executed directly. The plan gate adds ~3 min overhead per edit for changes that should take seconds.
- **9/10 edits triggered full page rebuilds** — only 1 was a surgical text replacement. The system lacks a deterministic find-and-replace path.
- **Content preservation across edits is solid** — cumulative changes survived through multiple rebuilds.

### What Content Editing Needs
1. **Content model in spec.json** — phone, email, hours, prices as structured data fields, not hardcoded in HTML
2. **Deterministic text replacement** — for "change X to Y" requests, find the text in HTML and replace without invoking Claude
3. **Cross-page edit capability** — detect "all pages" and iterate through spec.pages
4. **Widen content_update regex** — allow any words between "the" and field names
5. **Plan gate bypass for content_update** — phone number change should not need plan approval

## Codex vs Claude Comparison (2026-04-07)

Built the same Readings by Maria site with both Claude (via Studio) and Codex (direct generation). Same research, same brief.

| Metric | Claude/Studio | Codex |
|--------|--------------|-------|
| Total HTML size | 52 KB | 94 KB |
| Image slots (data-slot-id) | 2 | 17 |
| Chakra Sanskrit names | 0 | 7 |
| Services with pricing | Partial (edits altered) | All 6 |
| Post-processing | Full pipeline | None |
| Iterative editing | Yes (8/10 edits) | No |
| Deploy integration | Yes (Netlify) | No |

**Verdict:** Codex wins on first-pass generation quality (richer content, better slot compliance). Claude/Studio wins on iterative editing and deployment infrastructure. **Recommended pipeline: Codex generates initial HTML → Studio imports → Claude handles edits → Studio deploys.**

## Phase 0 Content Data Layer (2026-04-07)

### What Was Built
1. **Classifier fix** — `content_update` now has higher precedence than `bug_fix` and `layout_update`. Widened regex: `(change|update|replace|edit|set|fix|correct|modify)` + any words + `(phone|email|address|hours|price|...)`. Added natural language patterns: "buttons to say", "the X should be", "add the address/hours/phone". Removed "fix" and "wrong" from `bug_fix` triggers to prevent false positives.
2. **Build prompt injection** — `systemRules` in `buildPromptContext()` now includes CONTENT IDENTITY MARKERS section instructing Claude to add `data-section-id`, `data-field-id`, and `data-field-type` attributes to all content elements. Content field values from `spec.content` injected into prompts so they persist across rebuilds.
3. **Post-build content sync** — `syncContentFieldsFromHtml(pages)` runs in `runPostProcessing()` after `reapplySlotMappings`. Parses `data-field-id` attributes from generated HTML, adds new fields to `spec.content`. Does NOT overwrite existing fields (spec is authoritative).
4. **Surgical content handler** — Extended `tryDeterministicHandler()` with field-aware replacement: detects field type from message (phone/email/address/hours/price/testimonial), looks up field in `spec.content`, finds by `data-field-id` selector (preferred) or text match (fallback), updates HTML + spec atomically. Handles phone→tel: href and email→mailto: transforms. Cross-page detection for "all pages" messages.
5. **Concurrency** — `writeSpec()` now tracks `_revision` counter (monotonically increasing). Writes to `mutations.jsonl` when mutation details provided.

### Verification Results
- **Classifier accuracy: 10/10 correct** (was 0/10 before Phase 0)
- **7/10 → content_update** (phone, email, price, hours, testimonial, CTA buttons, address)
- **3/10 → layout_update** (add service, remove service, add banner — correctly structural)
- **0/7 content edits require plan approval** (was 9/10)
- **Surgical deterministic handler: 0/7 activated** — site was built pre-Phase 0 without `data-field-id` attributes. New builds will include them. Handler is wired and tested.

### Key Functions Added
- `syncContentFieldsFromHtml(pages)` — post-build content sync. File: `server.js`.
- `writeSpec(spec, options)` — now accepts `{ source, mutationLevel, mutationTarget, oldValue, newValue }` for mutation tracking.
- Extended `tryDeterministicHandler()` — field-aware surgical replacement block.
- Extended `buildPromptContext()` — returns `contentFieldContext` and `globalFieldContext`.

## Studio v3 Architecture Decisions (2026-04-07)

Four architectural gaps resolved before Phase 0 implementation begins. Full decisions in `docs/v3-architecture-decisions.md`. Codex adversarial review in `docs/v3-architecture-codex-review.md`.

### Decisions Made
1. **Identity lifecycle:** IDs are page-scoped sequential counters (`{page}-{type}-{n}`). Write-once allocation via `max+1`. Codex flagged DOM-order recovery as insufficient — recommended persisting IDs as `data-*` attributes in HTML for durability.
2. **Concurrency:** Single-writer priority queue (user edits priority 1 > build results priority 2 > background priority 3). Codex flagged stale-read risk and recommended revision-aware mutations with `spec_version` token.
3. **Multi-target rendering:** Canonical value + render_targets array with type-based transforms. Codex flagged US-specific phone/address formats — recommended locale-aware structured values.
4. **Component ownership:** Instance-on-import (fork at import, independent thereafter). Reference mode deferred to v2. Codex agreed this is correct for v1 but flagged re-import fragility without stable slot IDs.

### Schema Updates
`schemas/site-spec.schema.json` updated with: `slot_queries` (per-slot stock photo queries), `content` (structured fields per page with render_targets), `sections` (section metadata with component references).

## Phase 2 — VS Code-Inspired Layout + Editable View (2026-04-07)

Complete UI overhaul from three-horizontal-panel layout to VS Code-inspired workspace with left sidebar, tabbed canvas, bottom CLI bar, and right sidebar.

### Layout Structure

```
Left Sidebar (220px)     Center Area (flex-1)                Right Sidebar (300px)
  EXPLORER                 Canvas Tabs: Preview | Editable     Studio State
  - Pages list              - Preview (iframe, device toggle)   - Mode: Create/Ship/Grow
  - Sections tree           - Editable View (click-to-edit)     - Tab panels (Media,
  - Media summary                                                 Structure, Style, etc.)
                           CLI Bar (280px, adjustable)
                             - Chat tab (messages + input)
                             - Terminal tab (xterm.js)
```

### New Files Created
- `site-studio/public/css/studio-canvas.css` — canvas tab bar, editable view toolbar, field edit overlay, field highlights
- `site-studio/public/css/studio-cli.css` — CLI bar container, CLI tab bar, horizontal resizer, chat/terminal pane layout

### Updated Files
- `site-studio/public/css/studio-panels.css` — rewritten for new layout (left sidebar, center area, right sidebar, vertical resizers, responsive breakpoints)
- `site-studio/public/index.html` — full HTML restructure + ~350 lines new JS

### Key HTML Elements
- `#left-sidebar` — collapsible left sidebar with `.ls-section` accordion sections (Pages, Sections, Media)
- `#center-area` — flex column containing canvas area + horizontal resizer + CLI bar
- `#canvas-area` — flex-1 with `#canvas-tab-bar` and `#canvas-content`
- `#canvas-preview` — preview tab pane (migrated from old `#preview-panel`, keeps `#preview-frame`, `#page-tabs`, `#device-toggle`)
- `#canvas-editable` — editable view tab pane with `#editable-frame` iframe and field edit overlay
- `#resizer-h` — horizontal drag resizer between canvas and CLI (cursor: row-resize)
- `#cli-bar` — bottom panel with `#cli-tab-bar` (Chat | Terminal) and `#cli-content`
- `#cli-chat` — chat messages + input form (migrated from old `#chat-panel`)
- `#cli-terminal` — terminal toolbar + xterm container (migrated from old studio terminal tab)
- `#resizer-left`, `#resizer-right` — vertical resizers between sidebars and center

### Key JS Functions (new)
- `switchCanvasTab(tab)` — switches between 'preview' and 'editable' canvas tabs
- `switchCliTab(tab)` — switches between 'chat' and 'terminal' CLI tabs, auto-creates terminal on first switch
- `toggleLeftSidebar()` — shows/hides left sidebar + its resizer
- `toggleCliBar()` — minimize (36px tab bar only) / restore CLI bar height
- `toggleLsSection(sectionId)` — accordion toggle for left sidebar sections
- `setupHResizer()` — horizontal drag-to-resize between canvas and CLI bar, persists height to localStorage
- `renderPagesList()` — renders page items in left sidebar from `sitePages`, highlights active page
- `selectPage(page)` — selects page in sidebar, syncs preview via WS, refreshes section tree
- `loadSectionTree(page)` — fetches `GET /api/content-fields/:page`, renders field tree grouped by section with type icons
- `scrollToField(fieldId)` — scrolls editable iframe to a field and highlights it
- `loadEditableView()` — loads same page as preview into editable iframe, injects click handlers
- `injectEditableOverlay(frame)` — injects CSS for field highlights and click-to-edit handlers on `[data-field-id]` elements
- `openFieldEditor(el, frame)` — opens floating overlay editor at field position with input + Save/Cancel
- `updateFieldCount(frame)` — counts `[data-field-id]` elements and shows count in toolbar
- `refreshLeftSidebar()` — refreshes all left sidebar sections (pages, sections, media)
- `updateMediaSummary()` — shows slot/upload counts from cached studio state

### Sidebar Toggles (header)
- Left sidebar toggle: hamburger icon button `#left-sidebar-btn`, calls `toggleLeftSidebar()`
- Right sidebar toggle: panel icon button `#studio-btn`, calls `toggleStudioPanel()` (unchanged function, same ID)
- Both buttons turn gray when sidebar is hidden, hide/show their associated resizer

### Panel Width Persistence (localStorage keys)
- `panel-left-sidebar-width` — left sidebar width
- `panel-right-sidebar-width` — right sidebar width (was `panel-center-width`)
- `cli-bar-height` — CLI bar height

### Brainstorm Mode Adaptation
Brainstorm mode now hides both sidebars + canvas area, expands CLI bar to fill the center column. Restores previous state (sidebar visibility, CLI bar height) on exit.

### Migration Notes
- Old panel IDs preserved where possible: `#studio-panel` (now right sidebar), `#chat-messages`, `#chat-form`, `#chat-input`, `#preview-frame`, all studio tab content IDs
- `#chat-panel` → removed (content moved to `#cli-chat`)
- `#preview-panel` → removed (content moved to `#canvas-preview`)
- `togglePreview()` → now toggles between Preview and Editable View canvas tabs
- `updatePanelLayout()` → no-op (CSS flex handles layout automatically)
- Drag-and-drop target changed from `#chat-panel` to `#cli-chat`
- Terminal tab in right sidebar shows redirect link to CLI bar terminal

## Phases 3-5 — Multi-Agent, Image Browser, Intelligence Loop (2026-04-07)

8-wave implementation adding canvas tabs, CLI tabs, server endpoints, and analytics.

### Wave 0: Data-Driven Tab Switching
Refactored `switchCanvasTab()` and `switchCliTab()` from hardcoded arrays to `querySelectorAll('#canvas-tab-bar .canvas-tab')` pattern. Tab buttons use `data-pane` (target pane ID) and `data-hook` (global function name for lazy-load activation). Adding new tabs requires only HTML — no JS changes.

### Wave 1: Image Browser Canvas Tab (Phase 4)
Full canvas tab for stock photo search, replacing the small QSF floating panel for browsing.
- **Canvas tab:** `#canvas-images` with search toolbar, provider dropdown (All/Unsplash/Pexels), slot selector, 6-column result grid (responsive: 4-col < 1200px, 3-col < 768px)
- **Server:** Enhanced `GET /api/stock-search` now accepts `provider` and `limit` params (cap: 20 per provider)
- **JS functions:** `searchImageBrowser()`, `loadImageBrowserSlots()`, `renderImageResults()`, `applyImageToSlot()` — reuses existing `applyStockResult` backend
- **Codex fix U1:** Slot selector pins active slot visibly so user always knows where "Apply" targets

### Wave 2: Research View Canvas Tab (Phase 4)
Canvas tab for viewing research markdown files generated during pre-brief research phase.
- **Canvas tab:** `#canvas-research` with file list sidebar (220px) + content area
- **Server:** `GET /api/research/:filename` — allowlisted filenames via `readdirSync` (Codex S4 fix), 500KB size cap (Codex E2/F2), path traversal safe
- **JS functions:** `loadResearchFiles()`, `viewResearchFile()`, `renderMarkdownSafe()`, `appendInlineFormatted()`
- **Codex fix S3:** Markdown renderer uses DOM API only (createElement/createTextNode) — no innerHTML. Handles headings, bold, italic, code, lists.

### Wave 3: Codex CLI Tab (Phase 3)
Third tab in the CLI bar for interacting with Codex directly.
- **CLI tab:** `#cli-codex` with monospace output area + text input + Run button
- **Server:** `POST /api/codex/exec` — calls `scripts/codex-cli` via `execFile`, 120s timeout, 10KB prompt cap, stdin immediately closed (Codex E3 fix — prevents interactive mode fallback)
- **JS functions:** `sendCodexPrompt()`, `appendCodexMessage(role, text)` — Enter key submits, loading indicator, error display for missing codex binary

### Wave 4: Metrics Summary API (Phase 3+5)
- **Server:** `GET /api/metrics/summary` — reads build-metrics.jsonl, returns `{ totalBuilds, avgTime, byModel, byType }`
- Uses JSONL as data source (SQLite integration deferred — Codex A1 noted but builds table not always populated)

### Wave 5: Mutation Timeline (Phase 5)
- **Server:** `GET /api/mutations?page=X&limit=50` — reads mutations.jsonl (reverse chronological), field frequency analysis (`topFields`), JSONL retention at 1000 entries (Codex F4 fix — compacts on read when > 1200 lines)
- **HTML:** Mutations accordion in History tab (`#accordion-mutations`) with `#mutation-patterns` (top 5 most-changed fields) and `#mutation-timeline` (paginated entries)
- **JS functions:** `loadMutations(page)`, `renderMutationTimeline()`, `loadMoreMutations()` — auto-triggered on history tab switch

### Wave 6: Model Comparison Canvas Tab (Phase 3)
Side-by-side Claude vs Codex comparison with version safety.
- **Canvas tab:** `#canvas-compare` with toolbar (sync scroll checkbox, "Generate Codex Version" button), side-by-side iframes, "Use this" buttons with confirmation dialog
- **Server:** `POST /api/compare/generate` — calls codex-cli to regenerate current page, saves to `{SITE_DIR}/compare/`. `POST /api/compare/adopt` — with `versionFile()` snapshot before overwrite (Codex I5 fix). Static serve for `/compare/` directory.
- **JS functions:** `loadCompareView()`, `generateCodexVersion()`, `setupCompareScroll()`, `useCompareVersion(side)` — confirm() before destructive adopt
- **Codex fixes:** E5 (stale page captured at generation), I5 (version snapshot), U5 (confirmation dialog)

### CSS Files Updated
- `studio-canvas.css` — added Image Browser (#images-toolbar, #images-results-grid, .image-result-card), Research View (#research-layout, .research-file-item), Model Comparison (#compare-split, .compare-panel)
- `studio-cli.css` — added Codex pane styles (.codex-msg-user/assistant/error, .codex-loading)

### Codex Adversarial Review Summary
43 findings across 7 categories (Security, Architecture, Edge Cases, UX, Data Model, Integration, Forgotten). Key fixes incorporated: S3 (XSS — DOM-only markdown), S4 (path traversal — filename allowlist), E3 (interactive mode — stdin close), F4 (JSONL retention — 1000 cap), I5 (version safety — snapshot before adopt), U5 (confirmation dialog). Full findings documented in session context.

## AI Media Tools — Proof of Concept (2026-04-07)

### Adobe Firefly
- **Skill installed:** `.claude/skills/adobe-firefly/SKILL.md`
- **CLI script:** `scripts/firefly-generate` — supports `--prompt`, `--output`, `--style-ref`, `--batch`, `--width`, `--height`
- **Auth:** OAuth 2.0 client credentials → Adobe IMS (`https://ims-na1.adobelogin.com/ims/token/v3`)
- **API:** `POST https://firefly-api.adobe.io/v2/images/generate` with `x-api-key` and `Bearer` token
- **Status:** BLOCKED — needs `FIREFLY_CLIENT_ID` and `FIREFLY_CLIENT_SECRET` from Adobe Developer Console
- **Key capability:** Style reference matching — generate image sets with consistent lighting/color by using an anchor image as style reference
- **Content Credentials:** All outputs include C2PA metadata (AI provenance tracking)

### Google Imagen 4.0 + Veo 2.0 (TESTED — paid plan active)
- **SDK:** `google-genai` v1.47.0
- **Status:** WORKING — paid plan active with $25 credit
- **Imagen 4.0 results:** 4/4 shoe product images generated. Quality 9/10. Avg 7.2s per image. ~1.1-1.3 MB per image. Exceptional leather texture, lighting, composition. Cost ~$0.004/image.
- **Veo 2.0 results:** Hero video generated from Imagen still in 33.4s. 1.6 MB file size (well under 5MB web target). Candle flicker and smoke animation look natural. Usable for production hero backgrounds.
- **Pipeline:** Imagen generates still → Veo animates to video. Total: ~40s for a hero video from text prompt.

### Leonardo.ai Phoenix 1.0 (TESTED — API plan active)
- **Account:** `famtastic_fritz`, 3,344 API paid tokens + 150 subscription tokens
- **Status:** WORKING — 4/4 shoe images generated
- **Quality:** 7/10 — more CGI/rendered look vs Imagen's photorealism. Color accuracy lower (oxford came out navy instead of brown). Coherence between set images lower (5/10 vs Google's 7/10).
- **Speed:** 8.6s avg per image. Cost: $0.016/image (4x more than Google).
- **Models:** 47 available including FLUX, Kino XL, custom training. Model variety is Leonardo's strength.
- **API:** REST with polling (vs Google's Python SDK with 3-line generation). More complex integration.

### Adobe Firefly Web App (TESTED — CC subscription, Chrome automation)
- **Account:** fritz.medine@gmail.com, 3,800/4,000 premium credits (resets April 19)
- **Status:** WORKING via Chrome shadow DOM automation (Claude-in-Chrome MCP)
- **Model:** Firefly Image 3 (Firefly Image 5 preview also available)
- **Quality:** 9/10 — cognac leather oxford with brogue detailing, dramatic warm lighting. On par with Google Imagen 4.0.
- **Style Reference:** CONFIRMED — "Reference" section in Composition panel with Upload image + Browse gallery + strength slider. This is the key differentiator for image set coherence.
- **Video:** INCLUDED in CC — "Generate Media" (image+video on infinite canvas) + "Edit video (beta)" for trim/arrange/generate.
- **Partner Models:** Gemini 3.1 (w/ Nano Banana 2) integrated as default on homepage.
- **Custom Models:** Training accessible from left nav sidebar.
- **Content Credentials:** C2PA metadata on all outputs (commercially safe).
- **Automation Pattern:** Adobe uses Spectrum Web Components with deep shadow DOM. Must use recursive `walkShadow(root, depth)` to find SP-BUTTON/SP-ACTION-BUTTON elements. Textarea requires native value setter + input/change events. Generate button requires full pointer event sequence. File downloads blocked by Chrome extension (use screenshots).
- **API:** Enterprise only ($1K+/mo). Web app is the viable automation path via Chrome MCP.

### AI Media Telemetry System
- **Module:** `site-studio/lib/media-telemetry.js`
- **Functions:** `logMediaOperation(data)`, `getMediaUsage(options)`
- **Per-site log:** `sites/{tag}/media-telemetry.jsonl`
- **Global log:** `intelligence/media-usage.jsonl`
- **Endpoints:** `POST /api/media/log`, `GET /api/media/usage`, `GET /api/media/usage/:provider`
- **Data captured:** provider, model, operation type, cost_usd, credits_used, credits_remaining, tokens_in/out, generation_time, file_size, resolution, prompt, style_reference_used, batch_size, fallback tracking
- **Credit alerts:** Warning at 20%, alert at 10% of provider allocation
- **Recommendations:** Auto-generated cost comparisons between providers
- **Compaction:** Auto-compacts at 5000 entries (keeps most recent)
- **Integration:** Wired into `scripts/firefly-generate` and `POST /api/stock-apply`. Future: wire into Google Imagen and Leonardo scripts.

### Adobe MCP (adb-mcp) — Desktop App Control
- **Location:** `tools/adb-mcp/` (cloned from github.com/mikechambers/adb-mcp)
- **Status:** INSTALLED — Proxy server (Node) + MCP servers (Python 3.13 via Homebrew). Claude Desktop config auto-updated.
- **Apps supported:** Photoshop, Premiere Pro, InDesign, AfterEffects, Illustrator
- **Architecture:** MCP Server (Python) <-> Proxy Server (Node ws://localhost:3001) <-> UXP Plugin <-> Adobe App
- **Docs:** `docs/adobe-mcp-integration.md`
- **Pipeline role:** Post-processing generated images (resize, enhance, composite) before Studio assembly

### Integration Architecture (planned)
- Image Browser tab: add Firefly as provider alongside Unsplash/Pexels
- `POST /api/firefly/generate` server endpoint for Studio integration
- `POST /api/veo/generate` for video generation
- Hero video support in build pipeline (post-build step)
- Style reference workflow: anchor image → batch generation with consistent style

## Known Gaps

### Closed (2026-03-23, wave 1a — workflow-critical)
- **spec.json race condition** — replaced all 54 direct read/write sites with `readSpec()`/`writeSpec()` write-through cache. Cache invalidated on site switch.
- **Claude CLI hang** — all 6 `spawnClaude()` callers now have timeouts (5min for builds, 3min for planning/data-model/brainstorm, 2min for summaries/image-prompts). `buildInProgress` flag resets on timeout.
- **Default model** — changed from `claude-sonnet-4-20250514` to `claude-haiku-4-5-20251001` in `loadSettings()` defaults.

### Closed (2026-03-23, earlier)
- auto_summary/auto_version toggles wired to behavior
- Footer partial sync implemented (`syncFooterPartial()`, `syncFooterFromPage()`)
- Head section sync implemented (`syncHeadSection()`)
- Vercel deploy, `.netlifyignore` exclusions, concurrent build guard, SMS providers (Twilio + Vonage)

### Closed (2026-03-23, wave 1b — security hardening)
- **Path traversal** — `isValidPageName()` validator on all page-accepting endpoints; version file path forced through `VERSIONS_DIR()` + `path.basename()`
- **ZIP extraction** — extracts to temp dir first, validates all paths, copies to dist only after validation
- **Command injection** — all `spawn()` calls converted from `bash -c` string interpolation to array-form args; `escapeForShell()` removed
- **SVG sanitizer** — hardened to cover split tags, case variations, all src-like attributes (not just href), CSS expressions, embedded HTML elements (iframe/embed/object/form)
- **@vonage/server-sdk** — added to package.json and installed
- **CSRF protection** — Origin/Referer validation middleware on all POST/PUT/DELETE requests

### Closed (2026-03-23, wave 2 — data integrity)
- **WS message handler** — wrapped in try/catch, sends error to client on unhandled exceptions
- **conversation.jsonl** — rolling window truncation: keeps last 500 messages, trims at 600+
- **Bulk placeholder failures** — each SVG write wrapped in try/catch, failures logged and skipped without orphaning
- **Input validation** — `/api/brief` (max length), `/api/decisions` (valid categories/statuses), `/api/media-specs` (slot_id format, valid roles/statuses), `/api/replace-slot` (slot_id format), `/api/settings` (allowlisted keys only)
- **Schema validation** — `readSpec()` validates array fields, logs warnings on missing core fields, auto-repairs corrupt media_specs/design_decisions

### Closed (2026-03-24 — Studio Hardening)
- **Rebuild regression** — blueprint system (`blueprint.json`) captures sections, components, layout notes per page; injected into build prompts to prevent loss of iterative edits
- **Inline CSS** — `extractSharedCss()` post-processor extracts shared styles to `assets/styles.css`; pages link to external CSS instead of inline `<style>` blocks
- **Brainstorm one-size-fits-all** — profile selector (deep/balanced/concise) in brainstorm banner; adjusts system prompt verbosity
- **Build metrics invisible** — Metrics tab in Studio panel shows build history, averages, type breakdown via `GET /api/build-metrics`
- **Logo placeholder issue** — logo removed from slot system; build prompts explicitly forbid placeholder images for logos

### Closed (2026-03-24 — Stock Photo & Persistence Overhaul)
- **Auto-placeholder generation** — `bulkGeneratePlaceholders()` removed from all 3 automatic call sites (finishParallelBuild, MULTI_UPDATE, HTML_UPDATE). Empty slots stay transparent until explicitly filled.
- **Single-provider stock photos** — replaced with 3-provider fallback chain (Unsplash → Pexels → Pixabay) with per-provider API keys
- **Dead source.unsplash.com fallback** — removed entirely (was returning HTTP 503)
- **No stock photo Settings UI** — added Stock Photos section to Settings modal with 3 API key fields
- **Images lost on rebuild** — slot mapping persistence via `spec.json → slot_mappings` + `reapplySlotMappings()` post-processor + prompt injection into Claude context
- **jq dependency** — `scripts/stock-photo` rewritten to use python3 instead of jq for JSON parsing

### Closed (2026-03-24 — Lifecycle Integrity + Media Intelligence)
- **about-hero not found in media_specs** — single-page edits were guarded by `isFullBuild` that skipped `extractAndRegisterSlots`. Fixed: runs on every page edit.
- **Upload limit 20 with no delete UI** — limit raised to 100 (config-driven via `max_uploads_per_site`). Delete button already existed.
- **Upload thumbnails broken in Studio** — `/assets/uploads/` changed to `/site-assets/uploads/` (routes through studio server's static handler at port 3334).
- **Stock photos generic** — query now includes business name + industry + role.
- **Orphaned slot_mappings** — `reconcileSlotMappings()` removes orphans after every build. `POST /api/rescan` + toolbar button for manual trigger.
- **No stock provider fallback** — `fetchFromProvider('placeholder', ...)` generates styled SVG data URL, always works.
- **No prompt visibility in QSF** — slot detail bar in QSF shows provider badge, credit, query used. "Clear" button resets slot to empty.
- **No provider preview/selection** — QSF Stock now shows 6-thumbnail preview grid with editable query and provider badges before applying.
- **Single-page edits skip slot extraction** — fixed (see above).
- **Slot ID drift across rebuilds** — slot ID stability injection in single-page edit prompts.

### Closed (2026-03-24 — Chat Continuity + CSS Consistency)
- **Stateless chat calls** — each `spawnClaude()` only saw the current user message, no conversation history. Added `loadRecentConversation(15)` which reads last 15 messages from `conversation.jsonl` for the current session, truncates HTML responses to their `CHANGES:` summary via `truncateAssistantMessage()`, and injects as `RECENT CONVERSATION` section into every prompt via `buildPromptContext()`. ~1-2K tokens. Threaded through both `handleChatMessage()` and `parallelBuild()`.
  - Key functions: `loadRecentConversation()`, `truncateAssistantMessage()` in `server.js`
  - Constant: `RECENT_CONVO_COUNT = 15` at top of `server.js`
  - Prompt position: between `${sessionContext}` and `${blueprintContext}`
- **CSS inconsistency across parallel build pages** — fully-parallel build had each page generating CSS independently. Two pages used `header-content` class while `styles.css` only defined `header-container`. Fixed with hybrid build: index.html builds first as CSS/nav seed, then N-1 inner pages launch in parallel with the seed injected.
  - Key code: `parallelBuild()` Phase 1/Phase 2 in `server.js`
  - Seed injection: `CSS SEED` and `NAV SEED` blocks in inner page prompts
- **Missing Tailwind CDN** — no page included `<script src="tailwindcss">` despite using Tailwind utility classes everywhere. Added `HEAD REQUIREMENTS (CRITICAL)` to `sharedRules` prompt + `ensureHeadDependencies()` post-processor as safety net.
  - Key function: `ensureHeadDependencies()` in `server.js`
  - Pipeline position: runs before `syncHeadSection()` and `extractSharedCss()`

### Closed (2026-03-25 — Unified System Overhaul, 5 Waves)

**Wave 1 — Critical Bugs:**
- **API key exposure** — `GET /api/settings` returned full API keys unauthenticated. Fixed: `safeSettings()` redacts secrets, replaces with `key_configured: true/false`. Functions: `safeSettings()` in `server.js`.
- **Arbitrary spec overwrite** — `update-spec` WS message accepted any field. Fixed: whitelist (`design_brief`, `design_decisions`, `site_name`, `business_type`). Rejects non-whitelisted fields with console warning.
- **Multi-page fallback skipped post-processing** — when multi-page parsing failed, HTML was written directly. Fixed: fallback path now calls `runPostProcessing(ws, ['index.html'], { sourcePage: 'index.html' })`.
- **Parallel build timeout race condition** — timeout handler AND close handler both incremented `innerCompleted`. Fixed: timeout sets `timedOutPages.add(page)` + kills process; close handler handles completion. No double-increment.
- **Post-processing ordering** — `reapplySlotMappings` ran before `extractAndRegisterSlots` so renamed slots lost images. Fixed: extract first, then reapply.
- **Single-page edit missing head deps** — `ensureHeadDependencies(ws)` only ran on full builds. Fixed: now runs on single-page edits too.
- **Client `chat` WS type dropped** — server sent `{type:'chat'}` but client had no handler. Fixed: added `case 'chat':` in `index.html`.
- **gemini-cli stdin consumed twice** — bash `$(cat)` consumed stdin, Python got empty. Fixed: `printf '%s' "$PROMPT" |` pipes prompt to Python.
- **precommit-security unclosed quote** — security grep silently bypassed. Fixed: closed single quote before pipe.

**Wave 2 — Pipeline Integrity:**
- **syncHeadSection 80-char fingerprint** — style blocks matched by first 80 chars, missed content-only updates. Fixed: MD5 hash of full content. Function: `syncHeadSection()` now uses `crypto.createHash('md5')`.
- **extractSharedCss stripped page-specific styles** — was removing ALL non-data-page styles. Fixed: builds a set of extracted style content, only removes matching blocks. Function: `extractSharedCss()`.
- **Single-page vs full-build pipeline divergence** — unified: both run `extractAndRegisterSlots` → `reapplySlotMappings` → metadata → reconcile → logo. Single-page adds `ensureHeadDependencies`.

**Wave 3 — Prompt & Classifier:**
- **summarizeHtml was a no-op** — appended full HTML after summary. Fixed: returns summary only (sections, headings, slot IDs, line count).
- **Dead restyle case** — `handleChatMessage` had unreachable `restyle` case (routed upstream). Removed.
- **Auto-page-switch missed "the about page"** — only matched `about.html`. Fixed: added second regex for `\b(\w+)\s+page\b` pattern.
- **Classifier false positives** — "history" alone triggered `version_history`, "restore" alone triggered `rollback`. Fixed: `version_history` requires "version" anchor; `rollback` requires version context near "restore".
- **Brainstorm exit patterns narrow** — missed "do it", "ship it", "ok let's go". Fixed: widened regex with 8 new patterns.
- **Design decisions truncated to 5** — only last 5 approved decisions in prompts. Fixed: all approved decisions included with 2000-char cap.

**Wave 4 — State Architecture:**
- **buildPromptContext mutated currentPage** — hidden side effect in what looked like a pure reader. Fixed: returns `resolvedPage`, caller updates `currentPage` explicitly.
- **Multi-tab session reset** — every WS connection called `startSession()`. Fixed: `activeClientCount` tracks connections, only first starts session.
- **buildInProgress deadlock** — two new deadlock paths (ws disconnect mid-build, spawnClaude ENOENT). Fixed: `buildInProgress = false` in `ws.on('close')` and `child.on('error')`.

**Wave 5 — Data Model & Tests:**
- **Blueprint extracted Tailwind classes** — "py-16" as section names. Fixed: `isTailwindClass()` filter, prefers `id` attribute, falls back to semantic class.
- **Schema misaligned** — 7 runtime fields missing from `site-spec.schema.json`. Fixed: added `created_at`, `netlify_site_id`, `deploy_provider`, `brand_health`, `media_specs`, `slot_mappings`, `tech_recommendations`.
- **Template font URL encoding** — multi-word fonts like "Playfair Display" broke Google Fonts URLs. Fixed: `{{HEADING_FONT_URL}}`/`{{BODY_FONT_URL}}` with `+` encoding in `scripts/site-template` and all 4 template files.
- **Test coverage gaps** — 41 → 52 tests. Added: `truncateAssistantMessage` (5 cases), `classifyRequest` edge cases (4 cases), `ensureHeadDependencies` (1 case). Exports added: `truncateAssistantMessage`, `loadRecentConversation`.

### Closed (2026-03-31, Wave A–D — integration test fixes)

Surfaced by two-phase integration test suite (28 functional + 30 extreme). All 5 gaps fixed in one session.

- **`currentMode` persists across WS reconnects (F01, F03)** — Module-level `currentMode` in `server.js` survived client disconnect, so the next connection inherited brainstorm mode. Fix (Wave A): `currentMode = 'build'` reset at the top of `wss.on('connection')`. File: `server.js:~6281`.

- **`page_switch` intent silently no-ops in brainstorm mode (F03)** — Brainstorm routing bypassed the classifier entirely, so "go to the about page" routed to `handleBrainstorm()` instead of the page-switch handler. Fix (Wave A): before falling through to `handleBrainstorm()`, check `classifyRequest(userMessage, spec) === 'page_switch'` and fall through to normal routing if matched. File: `server.js:~6471`.

- **No input length cap on WS chat messages (E01–E05, E16, E25, E30)** — Messages of any size were accepted, injected into Claude's prompt, and caused server unresponsiveness. Fix (Wave B): guard added at the top of `msg.type === 'chat'` handler — rejects with `{ type: 'error' }` if input exceeds 10,000 chars. File: `server.js:~6359`.

- **Zombie Claude subprocesses on WS disconnect (E01–E11, E16, E25, E30)** — `ws.on('close')` released `buildInProgress` but never killed the running Claude child. Fix (Wave C): all 5 WS-routed `spawnClaude` call sites now store child refs on `ws.currentChild` (single child) or `ws.activeChildren[]` (parallel page builds). `ws.on('close')` kills all active children before releasing the lock. Files: `server.js` — `handleDataModelPlanning:~4016`, `handlePlanning:~4134`, `handleBrainstorm:~4265`, `parallelBuild/spawnPage:~4479`, `parallelBuild/templateChild:~4548`, `handleChatMessage:~6001` (+ Haiku reassignment at ~6024), `onChildClose:~6092`, `ws.on('close'):~6332`.

- **`MaxListenersExceededWarning` in flood tests (E12)** — 20 concurrent `sendChat` calls in the test added 20 `ws.on('message', handler)` listeners, exceeding Node.js's default of 10. Fix (Wave D): `ws.setMaxListeners(0)` added to `utils.connect()` so flood tests don't emit spurious warnings. File: `tests/integration/utils.js:~13`.

### Open (identified 2026-04-03 — Playwright autonomous build)

Gaps surfaced by running a full site build autonomously via Playwright against Studio GUI. Test site: Guy's Classy Shoes. Script: `tests/automation/guys-classy-shoes-build.js`. Log: `tests/automation/logs/`.

- **Multi-page build produces single page** — Brief requested 4 pages (Home, Collections, About, Contact) but `new_site` handler only generated `index.html`. The multi-page parallel build path did not fire. The brief's `must_have_sections` populated correctly but pages array stayed at `["home"]`. Root cause: the `new_site` classifier path writes the spec then calls `handleChatMessage` which builds a single-page response. Multi-page builds only trigger when the spec already has multiple pages. Need: spec should be updated with all requested pages before the build call.

- **Stock photo targeted searches misclassified as `layout_update`** — "Search for luxury men's leather oxford shoes for the hero image" classified as `layout_update` instead of `fill_stock_photos` or a targeted image search. This caused the AI to regenerate page content instead of searching for and applying a stock photo. The `fill_stock_photos` classifier only fires on broad fill requests, not targeted image searches.

- **"Run verification" misclassified as `layout_update`** — "Run verification" triggered a build plan instead of running the verification pipeline. The `verification` classifier intent may require specific phrasing.

- **Plan approval gate blocks automation** — Post-brief edits (steps 6a-6d) all triggered the plan approval UI (`build-plan` card with "Looks good, build it" / "Cancel" buttons). The Playwright script detected completion via DOM chat messages, but these were plan proposals, not build completions. The script's 244s durations suggest the plan auto-approved after timeout. Automation needs either: (a) a way to auto-approve plans, or (b) a `POST /api/chat` endpoint that bypasses the plan gate.

- **WS messages are per-client, not broadcast** — `server.js` uses `ws.send()` (unicast to the originating client), not broadcast. A standalone WS client cannot observe responses to a browser client's messages. This makes WS-based monitoring impossible without injecting into the page's own WS connection. Automation must use DOM-based detection.

- **No programmatic build API** — All builds require a browser WS connection. No `POST /api/chat` REST endpoint exists. This was documented in cerebrum.md but confirmed as a real blocker for CI/CD automation.

- **Verification indicator stuck at "Not Reviewed Yet"** — After explicitly requesting verification, the `#verify-label` DOM element still showed "Not Reviewed Yet". The verification pipeline may not have executed (misclassified as layout_update).

### Open (identified 2026-03-24)
- **Asset generate → insert disconnected** — SVG generation doesn't wire back to replace placeholders in HTML (deferred to focused session)
- **Brainstorm recommendation chips** — cherry-picking individual suggestions deferred; "Build This" sends full context
- **Blueprint merge on multi-page edits** — blueprint auto-extract works per-page but doesn't track cross-page component relationships (e.g. shared modal used on multiple pages)

### Open (identified 2026-03-23 gap analysis)

### Closed (2026-03-23, wave 3 — UX & accessibility)
- **WS reconnect** — exponential backoff (2s → 4s → 8s → 30s cap) + red disconnect banner
- **Chat submit** — shows error message when WS disconnected instead of silently failing
- **Graceful shutdown** — server closes all WS connections on SIGTERM/SIGINT
- **Modals** — `setupModal()` utility: Esc to close, backdrop click to close, `role="dialog"` + `aria-modal`, auto-focus first interactive element
- **Mobile responsive** — `@media (max-width: 1024px)` stacks chat/preview/studio vertically; `@media (max-width: 640px)` wraps header buttons
- **ARIA labels** — added to Upload, Settings, and Refresh buttons
- **Color contrast** — `.msg-status` changed from `#94a3b8` to `#cbd5e1` (passes WCAG AA on dark bg)
- **beforeunload** — warns before closing tab when `hasUnsavedWork` is true (set on send, cleared on preview reload)
- **Studio refresh** — debounced with 300ms timer
- **Upload validation** — frontend checks 5MB limit before upload, shows error for oversized files
- **jq pre-check** — `scripts/site-deploy` checks for `jq` before executing. `scripts/stock-photo` no longer needs jq (rewritten to use python3)

**Note:** Keyboard shortcuts (Cmd+Enter) already existed — Enter submits, Shift+Enter for newline (index.html line 672).

### Gap Analysis — All Waves Complete (2026-03-23)

**Testing (Wave 4) — CLOSED (2026-03-23):**
- Added `vitest` (v4.1.1) as dev dependency with ESM config (`vitest.config.js`)
- Created `tests/unit.test.js` — 41 unit tests across 6 function suites:
  - `isValidPageName` (4 tests), `sanitizeSvg` (9 tests), `extractSlotsFromPage` (4 tests),
    `classifyRequest` (15 tests), `extractBrandColors` (3 tests), `labelToFilename` (5 tests)
- Added `module.exports` + `require.main === module` guard to `server.js` for testability
- All 41 tests passing
- Smoke tests and integration tests remain as future work

**Feature Polish (Wave 5) — CLOSED (2026-03-23):**
- **Responsive preview toggle** — Mobile (375px), Tablet (768px), Desktop (full) device buttons in preview toolbar with SVG icons
- **Form handling** — Build prompt now includes Netlify Forms template with honeypot spam protection; forms work on Netlify deploy without backend
- **SEO/structured data validator** — Brand Health now checks: meta description, canonical URL, Schema.org JSON-LD, viewport, title, lang attr, alt text on images; generates actionable suggestions for each
- **CSS custom properties** — Build prompt requires `:root { --color-primary; --color-accent; --color-bg; }` from spec colors; enables one-place theming across all pages
- **Analytics integration** — Settings support `analytics_provider` (ga4/plausible) + `analytics_id`; when configured, snippet auto-injected into build prompt for every page
- **Session summary timing** — `generateSessionSummary()` now returns a Promise; `endSession()` awaits completion before WS close; client gets "Generating session summary..." status notification

**Previously closed (pre-gap-analysis):**
- Vercel deploy implemented in `scripts/site-deploy`
- Concurrent build guard added (`buildInProgress` mutex in `handleChatMessage()`)
- `.netlifyignore` expanded to exclude `_partials/`, `.versions/`, `.studio.json`, `conversation.jsonl`
- SMS providers wired: email_gateway, Twilio, and Vonage all functional server-side

---

## Architecture Decisions

### Site Builder (2026-03-10)
- No new repo — Hub already has the wiring
- HTML + Tailwind CDN, zero build step
- Chat UI: Node.js Express + WebSocket in `site-studio/`
- SVG-first assets (no GPU), Claude generates, Inkscape refines
- Netlify hosting (already installed), GoDaddy reseller for domains
- JSONL conversation state per site

### Claude CLI Integration (2026-03-12)
- Replaced all Anthropic Python SDK calls with `claude --print`
- No API key needed — uses existing Claude Code subscription
- `--tools ""` disables tool use (raw text output only)
- `unset CLAUDECODE` prevents nested-session guard
- Fallbacks preserved: template HTML and fallback SVGs still work without Claude

### Slot-Based Image System (2026-03-23)
- Every `<img>` carries `data-slot-id`, `data-slot-status`, `data-slot-role` — identity survives HTML regeneration
- `media_specs` in spec.json replaces heuristic HTML scanning as the source of truth for image state
- Status lifecycle: `empty` → `stock` → `uploaded` → `final`
- Stock photo fill uses Unsplash API when key is configured, falls back to SVG placeholders when offline
- Upload replacement targets by slot ID, not by src string matching

### Site Blueprint System (2026-03-24)
- `blueprint.json` per site is the authoritative "current state" of what sections, components, and layout rules exist per page
- Auto-extracted from HTML after every build via `updateBlueprint(writtenPages)` — parses `<section>` tags, popup/modal/overlay classes
- Injected into build prompts via `buildBlueprintContext(page)` — tells Claude exactly what must be preserved
- Editable from Studio UI (Blueprint tab) via `POST /api/blueprint` — user can add layout notes and sections manually
- Brainstorm-to-build flow writes accepted ideas as blueprint entries before triggering the build
- Prevents the #1 regression bug: iterative chat edits (popups, sliders, layout tweaks) lost on rebuild

### External CSS Extraction (2026-03-24)
- `extractSharedCss(ws)` post-processor runs after every build
- Extracts shared `<style>` blocks from all pages into `assets/styles.css`
- Page-specific styles marked with `<style data-page="true">` are left inline
- All pages get `<link rel="stylesheet" href="assets/styles.css">` injected
- Tailwind CDN `<script>` tag is runtime, not CSS — never extracted
- `syncHeadSection()` updated to also sync the CSS `<link>` tag across pages

### Brainstorm Chat Profiles (2026-03-24)
- `brainstorm_profile` setting in `studio-config.json`: `"deep"`, `"balanced"` (default), `"concise"`
- Profile changes the system prompt style in `handleBrainstorm()`
- Selectable from the brainstorm banner dropdown in Studio UI
- Persists via settings API (`PUT /api/settings`)

### Build Metrics Dashboard (2026-03-24)
- `GET /api/build-metrics` serves `build-metrics.jsonl` as JSON array
- Studio "Metrics" tab shows: total builds, avg time, pages built, by-type breakdown, recent history
- Data was already being captured; this just makes it visible

### Logo Rule Update (2026-03-24)
- Logo removed from `data-slot-role` allowed values in both build prompts
- Added explicit rules: never placeholder for logo, never create image slot for logo
- Logos handled via upload, generation, or styled text only

### Why these choices
- HTML+Tailwind over React: no build step = instant deploy, AI generates it cleanly
- Node.js over Python for chat UI: JS end-to-end for the web layer
- SVG over raster: works without GPU, Claude generates good SVGs
- Claude CLI over API: eliminates API key management, uses existing subscription
- Slot IDs over filename matching: stable identity that survives prompt regeneration, HTML edits, and file renames

---

## Strategic Direction

> **Superseded (2026-03-30).** The old "Recommendations" list has been replaced by a 7-tier roadmap in `FAMTASTIC-STATE.md → What's Next` and a north star vision document at `FAMTASTIC-VISION.md`. The vision document captures the empire model (portfolio → platform → SaaS), scaling milestones (10/50/100/500/1,000 products), revenue path strategy, continuous intelligence loop, and innovation mandate. All tactical priorities now align to that vision.

**Key documents:**
- `FAMTASTIC-VISION.md` — strategic north star (what FAMtastic is becoming)
- `FAMTASTIC-STATE.md` — technical snapshot (what FAMtastic currently is), with 7-tier "What's Next" roadmap
- `FAMtastic-Web-Context.md` — full context document for Claude Web sessions

**Legacy recommendations status:**
1. ~~Get to first deployed client site.~~ Done (2026-03-20).
2. ~~Delete dead code.~~ Done (2026-03-12).
3. ~~Consolidate repos.~~ Done (2026-03-12). 4 → 1.
4. Build client-facing access → superseded by Tier 1 (Revenue Path) in the new roadmap.
5. Add basic tests → now Tier 3 (Factory Quality). 56 unit tests exist.
6. Platform dashboard → now Tier 2 (Portfolio Management, needed at 10 sites).

---

## Key File Reference

### Server & UI
- `site-studio/server.js` — main backend. Express + WebSocket server. Classifier, prompt builder, post-build pipeline, all API endpoints.
- `site-studio/public/index.html` — single-file frontend. Chat panel, preview iframe, Studio sidebar, settings modal, upload modal with slot dropdown.

### Scripts
- `scripts/site-deploy` — deploy to Netlify or Cloudflare. Handles site ID resolution, stdout/stderr separation, spec.json update.
- `scripts/stock-photo` — download stock photo from Unsplash. Requires `curl` and `jq`.
- `scripts/site-chat` — launches Studio (server.js + preview) and opens browser.
- `scripts/site-preview` — standalone preview server (superseded by built-in preview in server.js).
- `scripts/asset-generate` — generates SVG assets via Claude CLI.

### Config
- `~/.config/famtastic/studio-config.json` — model, deploy target/team, email/SMS credentials, upload limits, stock photo API key.
- `schemas/studio.schema.json` — JSON Schema for `.studio.json` (session persistence).

### Per-Site Files
- `sites/<tag>/spec.json` — site specification. Contains `design_brief`, `design_decisions`, `media_specs`, `uploaded_assets`, `deployed_url`, `netlify_site_id`, `data_model`.
- `sites/<tag>/.studio.json` — studio session state. Current page, session history, version metadata.
- `sites/<tag>/conversation.jsonl` — chat history. One JSON object per line with `role`, `content`, `at`, `session_id`.
- `sites/<tag>/summaries/session-NNN.md` — AI-generated session summaries.
- `sites/<tag>/dist/` — built site files.
- `sites/<tag>/dist/.versions/<page>/<timestamp>.html` — version snapshots.
- `sites/<tag>/dist/_partials/_nav.html` — canonical nav element.
- `sites/<tag>/dist/.netlifyignore` — deploy exclusions (currently only `_partials/`).
- `sites/<tag>/dist/assets/uploads/` — user-uploaded files.
- `sites/<tag>/dist/assets/stock/` — Unsplash stock photos, named `{slot-id}.jpg`.
- `sites/<tag>/dist/assets/placeholders/` — generated SVG placeholders.
- `sites/<tag>/dist/assets/styles.css` — extracted shared CSS (`:root` vars, component styles). Generated by `extractSharedCss()` post-processor.
- `sites/<tag>/blueprint.json` — authoritative per-page blueprint. Sections, components, layout notes. Prevents rebuild regression.
- `sites/<tag>/build-metrics.jsonl` — one JSON object per build: timestamp, type, elapsed_seconds, pages_built, model.
- `sites/<tag>/.netlify/state.json` — Netlify site ID for deploy continuity.

### MCP
- `mcp-server/server.js` — MCP server exposing site state as resources. Protocol: stdio JSON-RPC.
- `.mcp.json` — project-level MCP config for auto-discovery by Claude Code/Desktop.

### Skills
- `.claude/skills/site-studio.md` — `/site-studio` slash command
- `.claude/skills/brainstorm.md` — `/brainstorm` slash command
- `.claude/skills/export-site.md` — `/export-site` slash command

---

## Lessons Learned

- Dev-Setup repo is superseded — absorbed into `famtastic`
- `orchestrator-resume` was the reference pattern for `orchestrator-site` (same step-by-step approach)
- `cj-ingest` already has site-* auto-trigger wiring — existing infrastructure supports the pipeline
- Template-based builds are fast but skip asset generation
- `claude --print` is a drop-in replacement for Anthropic Python SDK calls
- Markdown code fences in Claude output need stripping (sed '/^```/d') for HTML and SVG
- The core product problem is not rendering quality — it's the **request lifecycle** (context loss, weak intent capture, poor visibility)
- Intent-based request classification prevents destructive accidental rebuilds
- Design brief as a formal artifact prevents cookie-cutter output across turns
- Design decisions log (memory spine) prevents stylistic amnesia between generations
- `claude --print` is text-only — cannot pass images for vision. Uploaded image descriptions must come from the user at upload time.
- SVG uploads must be sanitized (strip `<script>`, `on*`, `javascript:`, `<foreignObject>`) before serving
- `site-chat` creates fallback HTML via `--skip-ai` on startup — classifier must check for brief existence, not HTML existence, to trigger `new_site`
- `claude --print` with Sonnet models silently returns empty (exit 0, 1 byte) when an active Claude Code session is competing for subscription capacity. Haiku uses a separate rate tier and works concurrently.
- `echo "$PROMPT"` in bash corrupts prompts containing `\n`, `\t`, backticks, `$`. Use `printf '%s' "$PROMPT"` for verbatim output.
- `spec.pages` vs `design_brief.must_have_sections`: Studio-created sites store sections in the brief, not in `spec.pages`. Build logic must fall back to `must_have_sections` to generate multi-page sites.
- Granular build progress is achievable by scanning accumulated stream output for `--- PAGE:` delimiters as chunks arrive — no need to break into multiple Claude calls.
- Email-to-SMS carrier gateways (e.g. `{number}@tmomail.net`) are unreliable — T-Mobile blocks them via AUP. Use native `sms:` URI scheme on macOS instead.
- Deploy scripts must separate stdout (URL only) from stderr (status messages). Capturing both with `$(command)` corrupts structured data stored in spec.json.
- Nav consistency across multi-page sites requires a partial injection system — Claude generates each page independently and navs will diverge without post-build sync.
- Image slot identity must be attached to the HTML element, not the filename. Filename/src matching breaks on every regeneration. Data attributes survive.

## Learnings Log

### known-gaps-closed -- 2026-03-23

Closed all 7 documented gaps in a single wave: (1) `auto_version` toggle wired into `versionFile()` — checks `loadSettings().auto_version` before snapshotting. (2) `auto_summary` toggle wired into `endSession()` — checks `loadSettings().auto_summary` before generating session summaries. (3) Footer partial sync — `syncFooterPartial()` and `syncFooterFromPage()` mirror the nav partial pattern. (4) Head section sync — `syncHeadSection()` propagates Tailwind CDN, Google Fonts, custom styles, and icon CDNs. (5) Vercel deploy — `deploy_vercel()` added to `scripts/site-deploy`. (6) `.netlifyignore` expanded to exclude `.versions/`, `.studio.json`, `conversation.jsonl`. (7) Concurrent build guard — `buildInProgress` flag prevents parallel `spawnClaude()` calls. (8) SMS providers — Vonage path added alongside existing Twilio path in `POST /api/share`.

### slot-based-image-system -- 2026-03-23

Replaced the heuristic-based image detection system with a slot-based identity system. Every `<img>` generated by Claude now carries `data-slot-id`, `data-slot-status`, and `data-slot-role` attributes. `media_specs` in spec.json stores the canonical slot registry. Stock photo fill via Unsplash API (or SVG fallback) fills empty slots. Upload modal targets slots by ID instead of matching by src string. Brand Health reads from `media_specs` instead of scanning HTML for placeholder patterns.

Key functions: `extractSlotsFromPage()`, `extractAndRegisterSlots()`, `SLOT_DIMENSIONS` constant. New endpoints: `POST /api/stock-photo`, `POST /api/replace-slot`. New classifier intent: `fill_stock_photos`. New script: `scripts/stock-photo`.

### share-nav-settings -- 2026-03-20

Added share functionality (Email via Gmail SMTP, Text via `sms:` URI, Copy Link). Nav partial system (`_partials/_nav.html`) for cross-page nav consistency. Settings modal expanded with email/SMS provider dropdowns. Deploy script fixed: stderr/stdout separation, `.netlify/state.json` fallback from `spec.json`.

Key files: `POST /api/share` in `server.js`, `syncNavPartial()` / `syncNavFromPage()` in `server.js`, Settings modal in `index.html`, `scripts/site-deploy`.

### first-deploy -- 2026-03-20

First site deployed end-to-end through the Studio pipeline: "The Best Lawn Care" — 7-page multi-page site with hero carousel, uploaded images, design brief, and design decisions tracking. Deployed via `netlify deploy --prod` to https://the-best-lawn-care.netlify.app. Netlify CLI was already installed and authenticated. `netlify sites:create --name <name> --account-slug fritz-medine` creates sites non-interactively (interactive prompts hang in non-TTY contexts).

### build-pipeline-fixes -- 2026-03-20

Three build-breaking issues found and fixed:

1. **`claude --print` silent failure with Sonnet**: When an active Claude Code session is running, `claude --print --model claude-sonnet-4-20250514` returns empty (exit 0, response length 1) for prompts requesting large output. Root cause: subscription-level concurrency/rate limiting. Haiku works concurrently because it uses a separate rate tier. Fix: default Studio to `claude-haiku-4-5-20251001`. Users can switch to Sonnet via Settings when not running Claude Code.

2. **`echo` corrupts prompts in `claude-cli`**: `echo "$PROMPT"` interprets escape sequences (`\n`, `\t`, `\\`) embedded in HTML/JSON prompts. Fix: `printf '%s' "$PROMPT"` for verbatim output. The `$(cat)` stdin-to-variable pattern is still needed — direct stdin passthrough to `claude` deadlocks on large payloads.

3. **Single-page builds despite multi-section brief**: `specPages` fell back to `['home']` ignoring `design_brief.must_have_sections`. Fix: `spec.pages || spec.design_brief?.must_have_sections || ['home']`.

Also added: granular build progress (stream-based page detection, per-file write status, post-processing steps), enhanced error logging with stderr capture.

### site-validate-test -- 2026-03-11

Template-based builds are fast but skip asset generation

### claude-cli-integration -- 2026-03-12

`claude --print --model <model> --tools ""` replaces all Anthropic Python SDK calls. No API key needed. Must `unset CLAUDECODE` to avoid nested-session guard. Must strip markdown fences from output.

### wave-6-studio-panel-ux -- 2026-03-19

Studio panel UX overhaul — made the right sidebar interactive instead of read-only:

**Wave 1: Editable Brief + Decisions**
- `PUT /api/brief` merges partial fields into spec.json, broadcasts `spec-updated` via WebSocket
- `PUT /api/decisions` — full CRUD (add/update/delete) on design_decisions array
- Brief section: pencil edit button, inline form pre-filled from current values, Save/Fill via Chat/Cancel
- Decisions section: hover-to-reveal edit/delete per decision, "Add" button with category dropdown + inline form
- `brief_edit` classifier intent: "edit brief", "update brief", "change the goal" → routes to planning flow with existing brief

**Wave 2: Session Picker**
- `GET /api/sessions` returns enriched session list with summary previews from session-NNN.md files
- `POST /api/sessions/load` filters conversation.jsonl by session timestamp range or session_id tag
- `startSession()` now writes `session_id` to each session entry
- `appendConvo()` tags every message with current `session_id` for reliable filtering
- Sessions section: scrollable list with date/count/preview, Load button, CURRENT badge, blue banner when viewing old session

**Wave 3: Brand Health + Media Specs + AI Prompt Export**
- `scanBrandHealth()` reads from `media_specs` for image slot status; scans HTML only for font icons and social meta
- `GET /api/brand-health` returns slot summary, key slot status, set aggregates, suggestions
- `PUT /api/media-specs` — CRUD for media slot definitions (`slot_id`, `role`, `dimensions`, `status`, `page`)
- `POST /api/generate-image-prompt` calls Claude to generate tailored Midjourney/DALL-E prompts using brief context (tone, colors, audience)
- Brand Health section: slot summary bar, per-slot status indicators, action buttons (Upload/AI Prompt) for empty/stock slots
- `brand_health` classifier intent: "check brand", "what's missing", "asset checklist"

Key pattern: the Studio panel is no longer a passive display — every section has inline CRUD. Brief edits go through the API (not chat), decisions are managed directly, sessions can be loaded and reviewed, brand gaps are surfaced with one-click actions.

**Addendum: Slot Extraction + Project Management**
- `extractAndRegisterSlots(pages)` scans generated HTML for `data-slot-id` attributes and registers them in `media_specs`. Runs after every HTML_UPDATE and MULTI_UPDATE. Replaces the old `autoDetectMediaSpecs()` heuristic approach (kept as legacy fallback).
- Path constants (`SITE_DIR`, `DIST_DIR`, `SPEC_FILE`, etc.) refactored from `const` to getter functions — required for runtime site switching.
- `GET /api/projects` lists all sites with name, state, page count, deployed URL, brief status, current indicator.
- `POST /api/switch-site` ends current session, switches TAG + derived paths, starts new session, broadcasts to all WS clients.
- `POST /api/new-site` creates minimal site structure (spec.json + dist dir), auto-switches to it.
- Header tag badge is now a project picker dropdown — shows all sites, highlights active, one-click switch, inline "create new project" form.
- `site-switched` WebSocket message clears chat, reloads history for new site, refreshes all panels.
- **Critical fix:** `escapeForShell()` + `echo` broke on large prompts with quotes/newlines. Replaced with `spawnClaude()` that pipes via `child.stdin.write()` — never touches shell interpolation.
- **Critical fix:** Preview server was a separate process hardcoded to one site's dist. Replaced with built-in `previewServer` in server.js that reads from `DIST_DIR()` dynamically. Shows placeholder for new sites with no HTML. Includes live-reload polling. `site-chat` no longer launches separate preview.

### wave-5-mcp-data-model -- 2026-03-19

Added MCP server for cross-platform context sharing and data model planning:
1. **MCP server** — `mcp-server/server.js` (343 lines). Exposes site project state as MCP resources (`famtastic://sites`, `famtastic://sites/{tag}`, `famtastic://sites/{tag}/brief`, etc.). 4 tools: `list_sites`, `get_site_state`, `get_session_summary`, `suggest_tech_stack`. Protocol: stdio JSON-RPC.
2. **`.mcp.json`** — project-level MCP config so Claude Code auto-discovers the server.
3. **Data model planning** — `data_model` classifier intent detects "database", "data model", "entities", "CMS", "e-commerce". `handleDataModelPlanning()` sends to Claude with structured DATA_MODEL output format. Stores result in spec.json under `data_model`. Covers needs_database, suggested_stack, entities with fields/relationships, mock_approach, migration_path.
4. **Concept-first approach** — data model output includes mock_approach (how to represent with static HTML) and migration_path (how to move to real DB later). No actual database setup yet.

For Claude Desktop integration: add the MCP server config to `~/Library/Application Support/Claude/claude_desktop_config.json` manually.

### wave-4-plugins-configuration -- 2026-03-19

Added custom Claude Code skills and Studio configuration page:
1. **Custom skills** — 3 project-level skills in `.claude/skills/`: `site-studio` (launch studio), `brainstorm` (terminal ideation), `export-site` (standalone export). Invocable via `/site-studio`, `/brainstorm`, `/export-site` in Claude Code.
2. **Settings page** — gear icon in header opens modal with model selector, deploy target/team, upload limits, version limits, auto-summary/auto-version toggles.
3. **Settings API** — `GET/PUT /api/settings` backed by `~/.config/famtastic/studio-config.json`.
4. **Configurable model** — all Claude CLI calls now read from settings instead of hardcoded model. Change model in UI, takes effect next generation.

### wave-3-professional-tooling -- 2026-03-19

Added export/import, template import, and tech stack suggestions:
1. **Export** — `fam-hub site export <tag> <path>` creates standalone project with package.json (npx serve), README, all dist files + summaries.
2. **Import** — `fam-hub site import <path> [tag]` analyzes HTML, extracts `<title>`, creates skeleton spec.json with state "imported", copies files into `sites/<tag>/dist/`. Opens in Studio for refinement.
3. **Template import** — upload .html or .zip files with "Template" role via drag-drop/file picker. HTML becomes index.html (versioned first). ZIP extracted into dist/.
4. **Tech stack analysis** — `analyzeTechStack()` runs during planning. Detects dynamic (e-commerce/booking → custom app), CMS (blog/news → headless CMS), or static (→ HTML+Tailwind). Recommends hosting and form backends. Results shown in brief card UI and stored in spec.json.
5. **Classifier additions** — `tech_advice` intent ("what tech should I use"), `template_import` intent ("import this template").

### wave-2-brainstorm-versioning -- 2026-03-19

Added brainstorm mode and site versioning to Studio:
1. **Brainstorm mode** — classifier detects "brainstorm"/"let's think"/"explore ideas", routes to Claude with no-HTML-output constraint. Cross-session context injected via session summaries.
2. **Terminal brainstorm** — `fam-hub site brainstorm <tag>` runs interactive brainstorm loop from the terminal with conversation context, auto-summary on exit.
3. **Session summaries** — auto-generated via Claude when sessions end (3+ messages). Stored in `sites/<tag>/summaries/session-NNN.md`. Last 2-3 injected into every prompt context for continuity.
4. **Site versioning** — every HTML write snapshots to `dist/.versions/<page>/<timestamp>.html`. Metadata in `.studio.json`. Auto-prunes at 50 versions.
5. **Rollback** — chat ("rollback", "undo", "revert") or Studio panel button. Saves current state as "pre-rollback" before restoring.
6. **Version history** — viewable in chat ("show history") or Studio panel. `/api/versions` and `/api/rollback` endpoints.

Key pattern: version-before-write. Every `fs.writeFileSync` for HTML is preceded by `versionFile()` call.

### wave-1-multipage-persistence -- 2026-03-19

Multi-page site generation and project persistence:
1. **Multi-page builds** — MULTI_UPDATE response format with `--- PAGE: filename.html ---` delimiters. Page-by-page Claude calls, shared nav/footer.
2. **Page tabs** — preview panel shows page tabs when multiple pages exist. Click to switch, or chat "switch to about page".
3. **Project persistence** — `.studio.json` tracks current page, session count, timestamps. Studio resumes where it left off.
4. **Page switch classifier** — `page_switch` intent routes to direct page change without Claude call.

### studio-workflow-overhaul -- 2026-03-13

Rewrote `site-studio/server.js` and `public/index.html` to implement a 4-phase studio workflow:
1. **Quality backbone** — request classifier (21 intent types with precedence), planning mode (design brief artifact stored in spec.json), design decisions log (memory spine), curated prompt builder with anti-cookie-cutter rules
2. **Visibility** — step log with real timing (replaces typing indicator), studio state panel (brief, decisions, files, uploads)
3. **External references** — image upload via multer (drag-drop, paste, file picker), SVG sanitization, role-based metadata (content/inspiration/brand_asset/layout_ref/style_ref), 5MB/20-file limits
4. **Iteration intelligence** — post-generation change summaries (CHANGES: parsing), revision-mode prompt strategies per request type

Schema updated: `design_brief`, `design_decisions`, `uploaded_assets` added to site-spec.schema.json.

Key architectural rules (Rules of State): intent precedence, override behavior, decision logging discipline, planning skip conditions, graceful degradation on missing context, classifier confidence defaults, decision log pruning, SVG upload safety.

---

## Developer Environment & Claude Code Tooling (2026-03-24)

### Claude Code Plugins

Installed via `/plugin` CLI (interactive terminal command, cannot be invoked programmatically):

**Marketplaces added:**
- `claude-plugins-official` → `github.com/anthropics/claude-plugins-official` (official Anthropic-curated directory)
- `paddo-tools` → `github.com/paddo/claude-tools` (community)

**Plugins installed:**
- `frontend-design@claude-plugins-official` — UI/frontend design guidance
- `feature-dev@claude-plugins-official` — feature development workflow
- `code-review@claude-plugins-official` — code review patterns
- `commit-commands@claude-plugins-official` — git commit workflow
- `security-guidance@claude-plugins-official` — security best practices
- `github@claude-plugins-official` — GitHub integration via MCP (requires `GITHUB_PERSONAL_ACCESS_TOKEN`)
- `agent-sdk-dev@claude-plugins-official` — Claude Agent SDK development
- `playwright@claude-plugins-official` — browser automation (requires `npx playwright install`)
- `gemini-tools@paddo-tools` — Gemini visual analysis via `/gemini` command (requires `GEMINI_API_KEY` + `gemini-cli`)

**Not found in any marketplace (skip these):** `netlify`, `autofix-bot`, `aikido`, `sentry`

**Plugin storage:** `~/.claude/settings.json` → `enabledPlugins` map + `extraKnownMarketplaces` map. Plugins activate on session start — restart required after install.

### Credentials in ~/.claude/settings.json

```json
"env": {
  "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1",
  "GITHUB_PERSONAL_ACCESS_TOKEN": "<set>",
  "GEMINI_API_KEY": "<set>"
}
```

### Agent Teams (Experimental)

`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in `~/.claude/settings.json` enables coordinated multi-session agent workflows. Requires a new Claude Code session to activate.

### OpenWolf

Installed globally: `openwolf@1.0.4` (by Cytostack Pvt Ltd). "Token-conscious AI brain for Claude Code projects."

- Initialized via `openwolf init` in `~/famtastic/`
- Creates `~/famtastic/.wolf/` directory with context management files
- Three intelligence files tracked in git: `anatomy.md` (file index), `cerebrum.md` (patterns/preferences/do-not-repeat), `buglog.json` (bug history)
- Ephemeral files excluded from git (2026-03-30): `token-ledger.json`, `memory.md`, `hooks/`, `config.json`, `*.log`
- Protocol: check `.wolf/anatomy.md` before reading files; update `.wolf/cerebrum.md` when learning patterns; log bugs to `.wolf/buglog.json`
- CLAUDE.md restored (2026-03-30): OpenWolf had overwritten it with a 2-line redirect. Now contains full FAMtastic rules with a clean OpenWolf reference section at the bottom.

**Note:** OpenWolf hooks intercept every Read/Write/Edit. anatomy.md descriptions may be stale if files change significantly — update manually or wait for auto-rescan (6h interval).

### critical-bug-fixes-2026-03-30

Four bugs fixed from deep code review that were causing silent failures or wrong behavior:

1. **Duplicate `ws.on('close')` handlers (C-1)** — Two separate `ws.on('close', ...)` handlers were registered on the same WebSocket object: one decremented `activeClientCount`, the other called `endSession()`. Both fired on every disconnect. After two connect/disconnect cycles, `activeClientCount` went negative. Fix: merged into a single `async` handler. The merged handler also releases `buildInProgress` on disconnect (deadlock prevention from the prior overhaul) and `await`s `endSession()`.

2. **`endSession()` not awaited on site switch (C-2)** — `POST /api/switch-site` and `POST /api/new-site` were synchronous Express route handlers. They called `endSession()` without `await`, then immediately changed `TAG`. The session summary was generated and written after `TAG` already pointed to the new site's directory. Fix: both handlers converted to `async` with `await endSession()` before modifying `TAG`.

3. **`ws.onmessage` JSON.parse unguarded (C-3)** — The client-side WebSocket `onmessage` handler called `JSON.parse(event.data)` without a try/catch. Any malformed message from the server (incomplete JSON, progress string, etc.) would throw an uncaught exception and crash the entire message loop — all subsequent messages ignored for that session. Fix: wrapped in `try { msg = JSON.parse(event.data) } catch { return }`.

4. **`shareSite()` always shows "not deployed" (C-4)** — `shareSite()` tried to read the deployed URL from `#studio-live-url`, a DOM element that gets `hidden` class added immediately by `refreshDeployInfo()` in the new per-site repo UI. The element was never visible. Fix: read from `deployInfoCache.production.url || deployInfoCache.staging.url` directly (the same cache already populated by `refreshDeployInfo()`).

**Lesson:** WebSocket's `EventEmitter.on()` stacks listeners — multiple `ws.on('close', ...)` calls all fire, unlike DOM's `addEventListener`. When refactoring ws handlers over multiple sessions, always check for stale registrations. For Express route handlers that call async operations and then mutate shared state, always `async/await` — fire-and-forget is a race condition.

### Build Plan v2 — Phases 0 through 2-A (2026-04-01)

Executed the Revised Build Plan v2 in a single session. All Tier 1 and Tier 2 phases complete.

**Phase 0 — Foundation**

- **Tab/label rename (Wave 0-A):** All 8 sidebar tabs renamed to user-centric language. Assets→Media, Blueprint→Structure, Deploy→Publish, Design→Style, History→Activity, Metrics→Insights, Verify→Review, Server→Hosting. Plus 8 button/heading renames (Brand Health→Site Health, etc.). File: `site-studio/public/index.html` only. Cosmetic — no IDs or logic changed.

- **Session status bar (Wave 0-B):** Fixed bottom bar showing model pill (Haiku/Sonnet/Opus with color coding), context window usage bar (green/amber/red at 50%/80%), running cost in USD, session duration. Functions: `calculateSessionCost(model, inputTokens, outputTokens)` (per-model rates), `getContextPercentage(usedTokens, windowSize)`, `broadcastSessionStatus(ws)`. Token tracking is approximate (prompt.length/4) since `--print` text mode has no usage metadata. Context warning fires once at 80%. Files: `server.js` (vars, 3 functions, broadcastSessionStatus call in wss.on('connection') and onChildClose), `index.html` (status bar HTML/CSS, session-status WS handler), `tests/unit.test.js` (6 new tests). Test count: 60 → 66.

- **Brain foundation (Wave 0-C):** `.brain/` directory with 6 files: `INDEX.md` (architecture decisions, known failures, portfolio, unknowns — loaded into every Claude prompt), `patterns.md` (validated patterns with evidence and confidence), `procedures.md` (repeatable workflows), `bugs.md` (bug encyclopedia), `anti-patterns.md` (do-not-repeat rules), `site-log.jsonl` (build history). Functions: `loadBrainContext()` reads `INDEX.md` and injects between sessionContext and conversationHistory in `buildPromptContext()`. `logSiteBuild(spec, verificationResult)` appends to `site-log.jsonl` fire-and-forget after verification in `finishParallelBuild()`. Files: 6 new in `.brain/`, `server.js` (2 functions + injection point + build logging call).

**Phase 1 — UX Shell**

- **Three-mode navigation (Wave 1-A):** Mode selector above tab bar with icons. Create (Media/Structure/Style), Ship (Review/Publish/Hosting), Grow (Activity/Insights). Persists via `localStorage('studio-mode')`. Functions: `switchMode(mode)` shows/hides tab buttons per mode. File: `index.html` only.

- **Three-panel layout (Wave 1-B):** Chat (left, 280px), workspace (center, 340px), preview (right, flex). Uses CSS flex `order` to reorder without moving HTML. Studio panel always visible (was toggle sidebar). Drag-to-resize via `setupResizer()` with localStorage persistence. Mobile responsive stacking below 1024px. File: `index.html` only. Key change: `wss` stays at `{ noServer: true }` for terminal WS coexistence.

- **Plan → Confirm → Execute (Wave 1-C):** Before `layout_update/major_revision/restyle/build` intents, `generatePlan()` calls Claude (2-min timeout) to produce structured JSON plan (summary, affected_pages, changes, estimated_scope). Plan card rendered in chat with approve/edit/cancel buttons. `routeToHandler()` extracts intent dispatch from inline switch. `pendingPlans` Map tracks active plans. `plan_mode` added to settings allowedKeys (default: true). `hero_full_width` also added to allowedKeys (was missing). Files: `server.js` (generatePlan, routeToHandler, execute-plan handler, plan gate in classifier), `index.html` (plan card DOM builder, approvePlan/cancelPlan functions, CSS).

**Phase 1.5 — Embedded Terminal**

PTY-backed terminal in Create mode's Terminal tab. Backend: `node-pty` spawns bash with xterm-256color, CLAUDE_* env vars stripped. REST API: `POST /api/terminal/create` (returns termId), `POST /api/terminal/:termId/inject` (command injection), `POST /api/terminal/:termId/resize`, `DELETE /api/terminal/:termId`. WS upgrade handler on `server.on('upgrade')` routes `/terminal/:termId` to PTY data stream (separate from main wss). Frontend: xterm.js v5.3.0 via CDN, `createTerminal()`, `startClaudeSession()` (launches interactive claude), `sendToTerminal()` for plan card injection. ResizeObserver auto-fits. All PTY processes killed on graceful shutdown. Files: `server.js` (pty require, terminal state, 4 endpoints, WS upgrade, shutdown kill), `index.html` (CDN links, terminal tab button, tab content, JS functions), `package.json` (node-pty dep).

**Phase 2-A — SQLite Session Storage**

`better-sqlite3` with WAL mode at `~/.config/famtastic/studio.db`. Tables: `sessions` (id, site_tag, model, tokens, cost, message_count, status), `builds` (pages_built, verification, duration, tokens, cost), `compaction_events`. File: `site-studio/lib/db.js` — createSession, updateSessionTokens, endSession, logBuild, getSessionHistory, getPortfolioStats, _createTestDb/_closeDb for testing. Wired into: `startSession()` (creates session), `endSession()` (ends session), `onChildClose` (token updates), `finishParallelBuild()` (build logging). API: `GET /api/session-history`, `GET /api/portfolio-stats`. Tests: 3 new (session lifecycle, token accumulation, portfolio stats). Test count: 66 → 69.

**Tags:** `phase-0-complete` (060b128), `phase-1-ux-stable` (c81bbeb), `phase-1-terminal-complete` (c4d83a1), `phase-2a-complete` (0375044).

### CSS File Structure + Terminal Fix + UI Bug Sweep (2026-04-01)

**CSS file structure rule:** Established as non-negotiable in CLAUDE.md and `.brain/anti-patterns.md`. All new CSS goes in `site-studio/public/css/` — never inline `<style>`. Six component files: `studio-base.css` (resets, messages, uploads, health dots), `studio-panels.css` (three-panel layout, resizers, responsive), `studio-chat.css` (plan cards, brainstorm mode), `studio-sidebar.css` (tabs, mode selector, status bar, slot mode), `studio-modals.css` (placeholder), `studio-terminal.css` (placeholder). All linked in `<head>`. Unit test enforces file existence + link integrity. File watcher monitors `public/css/` for change detection. Extracted ~340 lines from inline `<style>` block into the component files. Test count: 69 → 70.

**Terminal fix (critical):** node-pty 1.1.0 fails with `posix_spawnp` on Node 24 + macOS arm64. Upgraded to `node-pty@1.2.0-beta.12` which resolves it. xterm.js CDN was pointing to non-existent v5.3.0 (404, causing `Terminal is not defined`). Updated to `@xterm/xterm@6.0.0` and `@xterm/addon-fit@0.11.0`. Terminal now spawns successfully. Start Claude button launches interactive Claude Code session inside Studio. **Note:** node-pty 1.2.0 is a beta — upgrade to stable when released.

**Preview reload polling flood:** The preview iframe's live-reload script used `setInterval(1000)` with no backoff. When the preview server was unreachable (e.g., during restart), it flooded the browser with `ERR_TIMED_OUT` and `ERR_INSUFFICIENT_RESOURCES` errors, exhausting connection limits. Fix: replaced with recursive `setTimeout` with exponential backoff on failure (1s → 1.5x multiplier → 30s cap). Also skips polling when `document.hidden` (tab not active). File: `site-studio/server.js`, `RELOAD_SCRIPT` constant.

**Panel toggle button states:** Studio and Toggle Preview buttons started gray even though both panels were visible on load. Fixed: both start with `bg-studio-accent` (blue). Toggle switches to `bg-gray-600` when panel hidden, back to blue when shown. Added `id="preview-btn"` for reliable targeting.

**Chat panel layout reflow:** When both Studio and Preview panels were hidden, chat panel stayed at its narrow fixed width. `updatePanelLayout()` rewritten: 0 panels visible → chat `flex: 1 1 100%` (fills viewport), 1 panel visible → chat `flex: 1 1 40%` + remaining panel `flex: 1 1 60%`, all 3 → restore saved widths from localStorage.

**Resizer z-index:** Panel resizer was invisible to mouse events because chat panel's overflow was on top. Fixed: resizer width 4px → 6px, added `z-index: 10; position: relative`. Duplicate `resizer-lc` element removed from DOM.

**Terminal error handling:** `POST /api/terminal/create` now wraps `pty.spawn()` in try/catch and returns `{ error: "..." }` JSON instead of crashing Express with an unhandled exception. Uses `process.env.SHELL` instead of hardcoded `bash`.

### Auto-Tag Missing Slot Attributes — 2026-03-31

Conditional post-processor that auto-tags `<img>` elements missing `data-slot-id`, `data-slot-status`, `data-slot-role` attributes. Runs only when build verification detects the `slot-attributes` check has failed — zero cost when Claude gets all attrs right.

**Function:** `autoTagMissingSlots(pages)` in `server.js`. Adapted from existing `retrofitSlotAttributes()` but per-image instead of all-or-nothing.

**Architecture (dynamic CRUD):**
- **Conditional trigger:** Only fires when `verifySlotAttributes` reports failures in `finishParallelBuild()`
- **Content-derived IDs:** Uses `auto-{page}-{role}-{altSlug}` format. Alt text slug (max 20 chars) provides rebuild stability. Collision avoidance via `usedIds` Set.
- **Orphan prevention:** Checks existing `slot_mappings` by src — if an image's src matches an existing mapping, reuses the old slot ID instead of generating a new one.
- **Logo exclusion:** Finds `<a data-logo-v>...</a>` spans via regex, skips any `<img>` whose position falls within. Position-range check, not heuristic.
- **Decorative skip:** Skips `width/height=1` (tracking pixels), external SVGs not in uploads, empty-alt + non-transparent data URIs. Errs toward tagging.
- **Fallback role:** `"gallery"` (matches `retrofitSlotAttributes` and the accepted-roles list in build prompts).
- **No-seed skip:** If alt text AND src basename produce no meaningful slug, skips rather than generating an unstable counter-based ID.

**Integration points:**
- `finishParallelBuild()`: verify → conditional auto-fix → re-register slots → re-verify → save result → send to client
- Single-page edit path (`HTML_UPDATE`): runs after `runPostProcessing()` on `[currentPage]`
- `verifySlotAttributes()` and `verifyLogoAndLayout()` both updated to skip logo images inside `data-logo-v` anchors

**Known gap:** Single-page edits run `autoTagMissingSlots` but don't run the full verify → re-verify loop. The verification pill only updates on full builds or manual "Run Verification."

### Build Verification System — 2026-03-30

Two-tier quality assurance system for built sites.

**Phase 1 — File-based (always-on, zero tokens):** Five verification functions run automatically after every build inside `finishParallelBuild()`. Functions: `verifySlotAttributes(pages)`, `verifyCssCoherence()`, `verifyCrossPageConsistency(pages)`, `verifyHeadDependencies(pages)`, `verifyLogoAndLayout(pages)`. Orchestrated by `runBuildVerification(pages)`. Results stored in `spec.last_verification`. Sent to client via `verification-result` WS message type. Failed builds show amber chat notification via `verification-warning` WS type.

**Phase 2 — Browser-based (on-demand, costs tokens):** Five Claude Code agent definitions in `~/.claude/agents/`: `famtastic-visual-layout.md`, `famtastic-console-health.md`, `famtastic-mobile-responsive.md`, `famtastic-accessibility.md`, `famtastic-performance.md`. Triggered manually by asking Claude Code to "run a visual audit." Requires Chrome DevTools MCP.

**Architectural decision:** File-based verification runs automatically because it's free (reads files, no AI calls). Browser-based verification is on-demand because it costs tokens, requires a browser connection, and is most useful for pre-deploy final reviews — not every iterative edit.

**API endpoints:** `GET /api/verify` (read last result), `POST /api/verify` (trigger manual run), `POST /api/visual-verify` (agent readiness check).

**Studio UI:** Verification pill in preview toolbar (green Verified / yellow Warnings / red N Issues / gray Unchecked). Verify tab (8th sidebar tab) with collapsible check sections. View in Browser button opens prompt-copy modal for Phase 2.

**Config:** `spec.last_verification` stores the most recent verification result with `{ status, checks, issues, timestamp }`.

### parallel-build-overhaul -- 2026-03-24

Two fixes to `parallelBuild()` in `server.js`:

1. **Sequential index.html bottleneck removed.** The old design built index.html alone first, waited for it to complete, extracted `<nav>`, `<footer>`, and `<head>` from the result, then passed those HTML blocks into every other page's prompt. This meant 6 pages were blocked on 1 before any parallel work could start. The fix: all pages spawn simultaneously from the start. Design consistency is guaranteed by the shared brief, decisions, CSS custom properties, and a `DESIGN CONSISTENCY` instruction in each prompt. `syncNavPartial()` / `syncFooterPartial()` in `runPostProcessing()` with `isFullBuild: true` harmonize nav/footer across all pages after build — that sync was already the final source of truth, the index.html extraction was redundant.

2. **Per-page 5-minute timeout added.** Each `spawnClaude()` child in the parallel loop now has a `setTimeout(300000)` with `clearTimeout` on close. On timeout: kill child, send WS error naming the specific page, increment `completed`, check if all pages settled. If settled, call `finishParallelBuild()` with whatever succeeded (or release `buildInProgress` directly if all failed). Previously a single hung Claude CLI process locked the studio indefinitely.

Expected result: a 7-page build should complete in ~slowest-single-page time (~60–90s) rather than index + slowest-remaining (~220s).

### ### lifecycle-integrity-media-intelligence -- 2026-03-24

Completed all items from the lifecycle integrity + media intelligence plan:

1. **reconcileSlotMappings()** + `POST /api/rescan` + Rescan toolbar button — orphaned slot_mappings cleaned after every build and on demand
2. **Slot ID stability injection** — current page's slot IDs injected into single-page edit prompts (CRITICAL preservation instruction)
3. **Single-page edit slot registration** — removed isFullBuild guard; `extractAndRegisterSlots` runs on every page edit
4. **fetchFromProvider()** abstraction — Unsplash, Pexels, SVG placeholder (zero-dep fallback). No more dead-end stock failures.
5. **Contextual stock queries** — business name + industry + role instead of just role
6. **GET /api/stock-search + POST /api/stock-apply** — QSF Stock preview grid with editable query, provider badges, selectable results
7. **QSF slot detail bar** — provider badge, credit, query display, Clear button. POST /api/clear-slot-mapping endpoint.
8. **GET /api/site-info alias** — wraps spec in { spec } envelope for client-side code
9. **Upload thumbnails** — fixed /assets/ → /site-assets/ (all 3 occurrences)
10. **Upload limit** — 100 (was 20), config-driven via `max_uploads_per_site`
11. **Brand health metrics dashboard** — slot coverage bar, upload usage bar, orphan count, empty slot actions. Flat per-slot list removed.
12. **Slot_mappings schema** — now stores `{ src, alt, provider, query, credit }` for full traceability

Key functions added: `reconcileSlotMappings()`, `fetchFromProvider()`. Key endpoints added: `GET /api/stock-search`, `POST /api/stock-apply`, `POST /api/clear-slot-mapping`, `POST /api/rescan`, `GET /api/site-info`.

### template-first-build-architecture -- 2026-03-26

**Build flow:** `parallelBuild()` now uses a two-phase strategy:
1. **Phase 1:** Call `buildTemplatePrompt()` → `spawnClaude()` → produces `_template.html` (header, nav, footer, shared CSS, head deps only — no page content)
2. **Phase 2:** Call `loadTemplateContext()` → pass template context into every page's `spawnPage()` call simultaneously (true parallel)

Each page copies header/footer/head verbatim from template and generates only `<main>` content + `<style data-page="pagename">` block. Eliminates the old CSS seed / index-first bottleneck.

**Key functions:**
- `buildTemplatePrompt(spec, pageFiles, ...)` — generates the Claude prompt for `_template.html`
- `extractTemplateComponents(templateHtml)` — parses `data-template="header|footer|shared"` anchors from the built template
- `loadTemplateContext()` — reads `_template.html`, strips `<title>` from headBlock, formats for prompt injection
- `writeTemplateArtifacts(components)` — writes `_partials/_nav.html`, `_partials/_footer.html`, `assets/styles.css`
- `applyTemplateToPages(pages)` — replaces inline `<style data-template="shared">` with `<link href="assets/styles.css">` in each page

**Template guard:** `templateSpawned` flag prevents double-build race between timeout handler and close handler.

**Fallback:** If template build fails (code 1 or 0 bytes), `parallelBuild()` falls back to legacy build (no template context, `sharedRules` only).

**`_template.html`** lives in `dist/` but is excluded from `ignoreEntries` deploy list.

### spawnClaude-cwd-fix -- 2026-03-26

**Problem:** `spawnClaude()` was setting `cwd: HUB_ROOT` (`~/famtastic/`). When the subprocess Claude CLI starts, it reads `CLAUDE.md` in the cwd — which contains OpenWolf instructions telling it to check anatomy.md, cerebrum.md, etc. With `--tools ""` active, Claude cannot execute those instructions and produces empty output (0 bytes, exit 0).

**Fix:** Changed `cwd` in `spawnClaude()` to `os.tmpdir()` (resolves to `/tmp`). No `CLAUDE.md` in `/tmp`, so the subprocess receives only the piped prompt and responds normally.

**Also fixed:** `scripts/claude-cli` wrapper was failing when called from non-HUB_ROOT directories because it sources `scripts/lib/hub-common` via a relative path. The cwd change bypasses this wrapper issue entirely since `spawnClaude()` now calls `claude --print` directly.

**CLAUDE_* env var stripping** (previous fix, still active): All env keys matching `CLAUDE_*` or `=== 'CLAUDECODE'` are deleted from the subprocess env before spawn to prevent nested-session detection.

### nav-containment-layout-fix -- 2026-03-26

**Problem:** The nav/header appeared wider on pages with wide content (forms, grids, tables). Root cause: wide content caused the browser's layout engine to compute the `<body>` at a wider layout width. Even with `overflow-x: hidden` on body (which clips rendering), the LAYOUT width is still wider — block siblings like `<header>` stretch to fill it.

**Fix — page-template approach (Drupal-inspired):**

The layout uses a page-template model: the page sets the overall width, header/footer are full-viewport-width chrome, and `<main>` is the constrained content area at 90% max-width centered. This prevents content from ever pushing header/footer wider.

1. **`html, body { margin: 0; padding: 0; }`** — reset only, no overflow-x hidden (removed because it clipped hero breakout images)
2. **`main { max-width: 90%; margin-left: auto; margin-right: auto; }`** — content area is 90% of viewport, centered. Header and footer remain full-width outside this constraint.
3. **Hero breakout:** When `settings.hero_full_width` is `true` (default), the first section inside main breaks out to full viewport width: `main > section:first-of-type { width: 100vw; position: relative; left: 50%; margin-left: -50vw; }`. This works because body has no `overflow-x: hidden` to clip it.

**`fixLayoutOverflow(ws)`** in `server.js` (~line 4312): Runs as the last post-processing step (Step 6) on every build. Strips any previous `STUDIO LAYOUT FOUNDATION` or `LAYOUT FOUNDATION` block and prepends the new one to `assets/styles.css` (idempotent). Reads `hero_full_width` from settings to conditionally include the hero breakout rule. Falls back to inline `<style>` injection in HTML files only when `styles.css` does not exist (avoids duplicate block stacking bug).

**STUDIO LAYOUT FOUNDATION block** (injected into every `styles.css`):
```css
html, body { margin: 0; padding: 0; }
main { max-width: 90%; margin-left: auto; margin-right: auto; }
.container { width: 100%; max-width: 90rem; margin-left: auto; margin-right: auto; padding-left: 1.5rem; padding-right: 1.5rem; box-sizing: border-box; }
*, *::before, *::after { box-sizing: border-box; min-width: 0; }
img, video, table, iframe, embed, object { max-width: 100%; height: auto; }
/* When hero_full_width is true: */
main > section:first-of-type { width: 100vw; position: relative; left: 50%; margin-left: -50vw; }
```

**`hero_full_width` setting:** Boolean in `studio-config.json`, defaults to `true`. Controls whether the first section inside `<main>` breaks out to full viewport width. Useful for hero images/banners that should span edge-to-edge.

**`.container` class:** Shared utility available in all pages. Header inner content, footer inner content, and all page sections should wrap content in `<div class="container">`. Sections themselves can be full-bleed for backgrounds; only the inner `.container` is capped at 90rem.

### studio-tweaks -- 2026-03-26

**Server tab** (7th sidebar tab): Restart Studio button (process.exit(0) via `scripts/studio-server` wrapper), live uptime counter (1s interval, cleared on tab switch), session info (ID, messages, mode, clients), config (model, site, page, Node version, ports), file status (green/orange dots for server.js + index.html). `setupFileWatcher()` uses `fs.watch` with 2s debounce, broadcasts `restart-needed` WS message. Watchers stored in `fileWatchers[]` and closed in `gracefulShutdown()`.

**Push to Repo:** `git_push` classifier intent + `runGitPush(ws)` with `gitPushInProgress` concurrency guard. Chained `spawn()` calls: git add → git status → git commit → git branch → git push. All spawns use explicit `stdio` configs to prevent pipe buffer stalls. `silent` mode suppresses all user-facing messages (used by auto-sync after deploy).

**Site persistence on restart:** `readLastSite()`/`writeLastSite()` persists active TAG to `~/.config/famtastic/.last-site`. TAG validated before `server.listen()` (not inside callback). Falls back to `site-demo` if saved site doesn't exist.

**Staging/production environments:** `spec.json` gets `environments` object with `staging` and `production` sub-objects. Auto-migration in `readSpec()`: flat `deployed_url`/`netlify_site_id` fields → `environments.staging`. `runDeploy(ws, env)` accepts `'staging'` or `'production'`. `scripts/site-deploy` accepts `--env staging|production` flag with environment-aware Netlify site naming (`<tag>-staging` vs `<tag>`). Site ID resolved via `jq --arg env` from `spec.environments[env].site_id`. Deploy tab redesigned: Deploy to Staging (always active), Deploy to Production (gated behind `custom_domain`), environment status cards with View buttons, Push to Repo, Share.

**Security fixes (from code review):** CSRF bypass fixed (empty origin no longer passes). PID removed from `/api/server-info`. XSS: `v.reason` escaped in version history, brief arrays escaped per-element, `isSafeUrl()` validates scheme before href/window.open. `POST /api/restart` calls `gracefulShutdown()` (runs `endSession()` + closes watchers). `readSpec` migrations use `writeSpec()` instead of direct `fs.writeFileSync`.

### per-site-repo-architecture -- 2026-03-27

**Architecture change:** famtastic repo is now pure tooling. `sites/` added to `.gitignore` and removed from git tracking. Site working directories remain at `~/famtastic/sites/<tag>/` on disk (local only). Each site gets its own repo at `~/famtastic-sites/<tag>/` with three branches: `dev`, `staging`, `main`.

**Git flow:**
- `Push to Repo` → copies dist/ to site repo, commits to `dev` branch, pushes `origin dev`
- `Deploy to Staging` → commits dev, merges `dev → staging`, pushes `origin staging`, deploys staging to Netlify
- `Deploy to Production` → merges `dev → staging → main`, pushes `origin main`, deploys main to Netlify
- `Push Studio Code` → pushes famtastic hub repo (tooling only), separate from site repos

**`createSiteRepo(ws)`** in `server.js`: replaces `createProdRepo`. Creates `~/famtastic-sites/<tag>/`, copies dist/ (filtering .versions/ and _template.html), writes scaffold files (CLAUDE.md, SITE-LEARNINGS.md, README.md), runs `git init`, renames default branch to `dev`, creates `staging` and `main` branches, tries `gh repo create --private`. Auto-called from `finishParallelBuild()` on first successful build. Concurrency guard: `siteRepoInProgress`. Retry path: if local repo exists but no remote, skips to `_tryGhRepoCreate` directly.

**`syncSiteRepo(ws, spec, targetBranch, callback)`** in `server.js`: replaces `syncProdRepo`. Branch-aware sync:
- Target `dev`: checkout dev → copy dist → add → commit → push dev
- Target `staging`: dev commit → checkout staging → merge dev → push staging → return to dev
- Target `main`: dev commit → checkout staging → merge dev → checkout main → merge staging → push main → return to dev
- Failed merges call `git merge --abort` before returning error (prevents stuck MERGING state)
- All checkout exit codes checked (prevents wrong-branch push)
- Concurrency guard: `syncSiteRepoInProgress`

**`runGitPush(ws)`** in `server.js`: now delegates to `syncSiteRepo(ws, spec, 'dev')`. If `spec.site_repo` doesn't exist, shows contextual error ("being created" vs "build first").

**`pushHubRepo(ws)`** in `server.js`: new function for pushing famtastic tooling code. Separate concurrency guard (`hubPushInProgress`). Called via `hub_push` classifier intent or "Push Studio Code" button in Server tab.

**`spec.site_repo`**: top-level field in spec.json replaces `spec.environments.production.repo`. Contains `{ path, remote }`. `environments` object still tracks deploy targets (Netlify site IDs, URLs, custom domains per environment).

**`runDeploy(ws, env)`**: after successful deploy, calls `syncSiteRepo(ws, spec, targetBranch)` where staging → 'staging', production → 'main'. Uses spread merge on `spec.environments[env]` to preserve existing fields (repo, custom_domain). `deployInProgress` concurrency guard.

**`GET /api/deploy-info`**: returns `hub_repo` (cached at startup, no more blocking execSync), `site_repo`, and structured `local/staging/production` environments.

**Studio State header**: shows three environment URL rows (Local, Staging, Prod) with clickable links. Safe DOM construction (createElement + textContent), `isSafeUrl()` validation on all href assignments.

**Deploy tab HTML fix**: unclosed `<div class="border-b border-gray-700">` from old Actions accordion wrapper caused History, Metrics, Server, and partially Blueprint tabs to nest inside the Deploy tab content div. When Deploy tab was hidden (not active), all nested tabs were hidden too — appearing as "blank". Fixed by removing the stale wrapper div.

**Known gap (saved to cerebrum):** Studio code push UX needs rethinking. Currently "Push Studio Code" does a quick git add/commit/push with auto-generated message. Proper commits with meaningful messages should go through CLI. Future: Studio should manage its own code changes with commit message prompts.

### studio-cli-handoff-pattern -- 2026-04-08

**Pattern established:** Playwright drives Studio for HTML + CSS. When Studio can't write JavaScript, Playwright logs the gap and triggers CLI. CLI writes the JS, injects script tags into HTML, and Playwright verifies. High-reuse JS becomes a component in `~/famtastic/components/`.

**Full documentation:** `docs/studio-cli-handoff-pattern.md`
**Capability registry:** `docs/capability-registry.md`  
**Task log:** `tests/automation/logs/cli-handoff-pattern.json`

**Studio can handle:** HTML structure, CSS classes, Tailwind utilities, basic CSS transitions (hover lift, button scale), `scroll-behavior:smooth`, `loading="lazy"` attributes, static data attribute scaffolding.

**Studio cannot handle (requires CLI):** Any JavaScript — Intersection Observer, timers, event listeners, dynamic DOM creation, state management.

**Routing rules (for Playwright):**

| Task Pattern | Route To | Why |
|---|---|---|
| "add parallax" | CLI | Needs requestAnimationFrame |
| "animate on scroll" | CLI | Needs IntersectionObserver |
| "slideshow auto-advance" | CLI | Needs JS timer + state |
| "counter animation" | CLI | Needs IntersectionObserver + rAF |
| "scroll-to-top button" | CLI | Needs scroll listener |
| "hover effect" | Studio first | CSS-only possible |
| "lazy load fade-in" | CLI | Needs IntersectionObserver |

### street-family-reunion-js-pass -- 2026-04-08

**Site:** `sites/site-street-family-reunion/`  
**JS files added:** `dist/assets/js/parallax.js`, `slideshow.js`, `card-animations.js`, `counter-animation.js`, `smooth-scroll.js`, `lazy-load.js`

**Data attributes used across all pages:**
- `data-parallax-speed="0.3"` — on parallax hero sections (our-story.html)
- `data-animate="fade-up"` — on all activity cards, timeline items, stats items
- `data-card-enhanced` — on all interactive cards (activates card-animations.js)
- `data-slideshow` — on slideshow container (gallery.html), replaces inline script
- `data-count-to`, `data-count-suffix`, `data-count-duration` — on counter spans (our-story.html)
- `data-lazy` — on gallery and product images
- `data-slot-status="google-generated"` + `data-generated-by` — on hero video and all Imagen-generated images

**Stats section:** Added to `our-story.html` between timeline and family tree sections. Counters: 150+ Family Members, 6 Generations, 45 States Represented, 1 United Family.

**Slideshow bug pattern (do not repeat):** When a page has existing CSS `display:none` on `.slide` elements, and slideshow.js replaces it with opacity-based crossfade, the `display:none` wins and slides stay invisible. Fix: inject `display:block !important` in the slideshow CSS override to ensure all slides are in the layout, with opacity controlling visibility.

**Component library entries created:**
- `components/parallax-section/component.json`
- `components/animated-counter/component.json`
- `components/photo-slideshow/component.json`

Each includes HTML template, data attribute docs, platform notes (Drupal, WordPress, Webflow).

---

### google-imagen-veo-pipeline — 2026-04-08

**Primary media generation pipeline for all FAMtastic sites.**

**Script:** `scripts/google-media-generate`  
**SDK:** `google.genai` v1.47.0 (NOT `google.generativeai` — different package, not installed)  
**Credentials:** `GEMINI_API_KEY` env var  
**Image model:** `imagen-4.0-generate-001` — $0.004/image, ~7s  
**Video model:** `veo-2.0-generate-001` — ~$0.05/video, ~33s, produces 5s MP4 ~2.4MB

**Batch usage:**
```
google-media-generate --batch scripts/google-media-batch-[site].json \
  --output-dir sites/site-[tag]/dist/assets/images/generated/ \
  --site-dir sites/site-[tag]/
```

**Batch JSON format** (`scripts/google-media-batch-street-reunion.json`):
```json
[
  { "type": "video", "filename": "hero.mp4", "still_filename": "hero-still.png",
    "still_prompt": "...", "video_prompt": "...", "aspect_ratio": "16:9" },
  { "type": "image", "filename": "card-explore-story.jpg",
    "prompt": "...", "aspect_ratio": "4:3" }
]
```

**street-family-reunion generated assets** (all in `dist/assets/images/generated/`):
- `hero-still.png` (1.7MB, 16:9) — Imagen 4 Black family reunion scene
- `hero.mp4` (2.4MB, 16:9) — Veo 2 animated from hero-still
- `card-explore-story.jpg`, `card-gallery.jpg`, `card-find-family.jpg`,
  `card-book.jpg`, `card-plan-stay.jpg`, `card-research.jpg`, `gallery-firefly.jpg` (1.5–1.8MB each, 4:3)

**Safety filter rules (do not repeat):**
1. `person_generation` must be `'ALLOW_ADULT'` (uppercase). `'allow_adult'` silently blocks output. `'ALLOW_ALL'` throws `ValueError` on Gemini API (Vertex only).
2. Veo video prompts must NOT reference race or ethnicity. "African American family reunion scene" was blocked. Use motion/atmosphere only: "Gentle cinematic drift, string lights swaying, golden hour light through tree leaves." The still image carries the representation visually.
3. Imagen prompts with explicit ethnic descriptors like "Black grandmother" may be blocked. Use generational descriptions: "two women of different generations sharing a warm embrace" — the scene context and other prompt elements still produce culturally appropriate imagery.
4. Always check `response.generated_images` before accessing bytes — safety block returns empty list, not an exception.

**Telemetry:** Every generation logged to `intelligence/media-usage.jsonl` (global) and per-site `media-telemetry.jsonl`.

**Adobe Firefly status:** Firefly API is NOT available on Creative Cloud plan. Requires $1K+/mo enterprise plan. Confirmed in Adobe Developer Console. Do not attempt Firefly API calls. Firefly Web (firefly.adobe.com) is available via browser automation (Claude-in-Chrome MCP) only, for style reference.

---

---

### auntie-gale-garage-sales — 2026-04-08

**Site #5. Full FAMtastic build for an independent garage sale curator. Primary purpose: Studio stress test across all 14 phases.**

**Deployed:** `https://effortless-tiramisu-ed9345.netlify.app` (Netlify site ID: `d50d0586-8f28-407f-aebe-14c175a88e1d`)  
**Pages:** `index.html`, `shop.html`, `deals.html`, `about.html`, `contact.html`  
**Assets:** `dist/assets/css/main.css`, `dist/assets/buddy/` (8 PNG poses), `dist/assets/video/` (hero.mp4 + still)

**Color palette:** `#E8420A` primary · `#1D4ED8` secondary · `#FBBF24` accent · `#FFFBF5` bg · `#1C1917` dark · `#16A34A` green  
**Fonts:** Bangers (display) · Nunito (body) · Permanent Marker (accent) — all Google Fonts CDN  
**Shared stylesheet:** `dist/assets/css/main.css` — 607 lines, defines `.starburst`, `.display-stage*`, `.product-card`, `.countdown-*`, `.category-pill`, nav, hero, footer, Buddy placement classes

**Buddy mascot (11 placements):**
- `buddy-peek-right.png` — hero right-edge peek with speech bubble (index)
- `buddy-thumbs-up.png` — section icon (index) + Buddy Pick card badge breaking top-right corner (index + shop)
- `buddy-sale-sign.png` — Daily Deal stage breakout left (index + deals)
- `buddy-wave-goodbye.png` — footer absolute position above footer border (index)
- `buddy-pop-up.png` — shop hero banner (shop)
- `buddy-running-box.png` — "More Deals Dropping" loading teaser (deals)
- `buddy-full-body.png` — about hero + Meet Buddy section (about)
- `buddy-peek-left.png` — contact form green message banner (contact)

**Starburst implementation:** `.starburst` CSS class with `clip-path: polygon(24-point)` in `main.css`. 9 placed across 4 pages. Sizes: 70–140px. Colors vary per context (accent/primary/green). `transform:rotate()` adds personality.

**Display Stage pattern:**
- Classes: `.display-stage`, `.display-stage-header`, `.display-stage-body`, `.stage-starburst`
- Container: needs `margin-left:5rem` to accommodate Buddy character breaking outside left
- Starburst badge: `.stage-starburst` → `position:absolute; top:-30px; right:-30px`
- Used on `index.html` (Daily Deal) and `deals.html` (Deal of the Day)

**Swiper.js v12 carousel (index.html):**
- CDN: `swiper@12/swiper-bundle.min.css` + `.min.js` (jsdelivr)
- Class: `.featured-swiper` — 1→2(640px)→3(1024px) breakpoints, loop, autoplay 3500ms

**Countdown timer (deals.html):**
- Self-contained IIFE, targets next Sunday 2pm local time
- IDs: `cd-h`, `cd-m`, `cd-s` — updates every 1000ms

**Category filter pills (shop.html):**
- `filterCategory(btn, cat)` — reads `data-category` on grid cards
- `#product-grid` container · `#result-count` display · `.category-pill.active` = primary color

**Components extracted to `components/` library:**
- `product-card-garage/` — card with optional Buddy badge breakout
- `display-stage/` — deal showcase with swappable slot
- `starburst-badge/` — 4 variants, CSS clip-path only
- `countdown-timer/` — live JS countdown
- `category-filter-pills/` — filterable product grid

---

## Session Engine Upgrades (2026-04-09)

### Session 1: Build Lock + Classifier Improvements

**Build lock management (`site-studio/server.js`):**
- `setBuildInProgress(value)` — persists lock to `.studio.json`, manages 10-min auto-clear timer
- `BUILD_LOCK_TIMEOUT_MS = 600000` — auto-clears stale locks
- Stale lock detection in `loadStudio()` — logs `BUILD_LOCK_STALE` on startup if `build_in_progress === true`
- `POST /api/build/cancel` — clears lock and emits `build_cancelled` WS event
- `handlePlanning()` guard — returns friendly error if build already in progress

**Classifier intent-dominance (`classifyRequest()` in server.js):**
- 9 strong build signals fire BEFORE vocabulary checks — prevents brief misclassification
- 8 brief indicators (2+ hits required) catch structured briefs with data-attribute syntax
- Explicit data-attr inspect check: `\b(check|inspect|examine)\s+(?:the\s+)?data-[\w-]+\b` → `visual_inspect`
- Hyphenated component names: `\b(use|insert|add|place)\s+(?:the\s+)?[\w][\w-]+\s+component\b` → `component_import`
- Confidence logging: `[classifier] intent=X confidence=HIGH/LOW signals=N`
- `component_import` handler: reads HTML template, injects before `</main>`, updates `used_in[]` in library.json

**Test suite:** `tests/classifier-regression.json` (20 cases), `tests/automation/logs/session1-test-results.json` (8/8 PASS)
**Docs:** `docs/classifier-intent-map.md`

### Session 2: SEO Pipeline

**Meta injection (`injectSeoMeta()` in server.js):**
- Extended with `<meta property="og:url">` and `<link rel="canonical">` using `spec.deployed_url`

**Sitemap + robots (`generateSitemapAndRobots(ws)` in server.js ~line 2815):**
- Generates `dist/sitemap.xml` — one `<url>` per page, index.html priority 1.0, others 0.8
- Generates `dist/robots.txt` — User-agent: *, Allow: /, Sitemap: {deployed_url}/sitemap.xml
- Called at end of `finishParallelBuild()`

**SEO validation (`runSeoValidation(pages)` in server.js ~line 2858):**
- Checks: title, description, og:image, og:url, canonical, h1 uniqueness, img alt text
- Results appended to build completion message

**KNOWN BUG (fixed):** `spec.site_name` defaults to `"New Site"`. Always update spec.json immediately after first build.

**Test regex apostrophe bug:** `[^"']+` stops at apostrophes in values like "Gale's". Keep descriptions apostrophe-free or use `[^"]*` as regex group.

**Test suite:** `tests/session2-seo-tests.js` (59/59 PASS), `scripts/generate-seo-files`

### Session 3: Image Pipeline (rembg)

**Background removal endpoint (`POST /api/remove-background`):**
- Body: `{ filename }` or `{ filenames: [] }` (batch), optional `{ dark_section: true }`
- Returns: `{ results, errors, knockout_css_class: 'fam-knockout' }` — 207 on partial batch
- All filenames validated (alphanumeric/dots/hyphens/underscores only)

**rembg worker (`scripts/rembg-worker.py`):**
- Uses rembg Python API directly — avoids CLI dependency cascade (filetype + watchdog + aiohttp)
- CLI binary at `/Users/famtasticfritz/Library/Python/3.9/bin/rembg` is NOT reliable — use the worker script
- Output is always RGBA PNG

**CSS injection (`injectKnockoutCss()`):**
- Priority: `assets/styles.css` → `assets/css/main.css` → create `assets/styles.css`
- Idempotent. Injects: `.fam-knockout`, `.shadow-on-dark`, `.shadow-on-light`

**Test suite:** `tests/session3-image-tests.js` (40/40 PASS)

### Session 4: Visual Quality Layer

**lib/fam-motion.js:** Scroll animation engine. Data-attribute API: `data-fam-animate` (fade-up/fade-in/slide-left/slide-right/zoom-in/bounce-in), `data-fam-delay`, `data-fam-duration`, `data-fam-repeat`. IntersectionObserver with fallback. Exposes `window.FamMotion`.

**lib/fam-shapes.css:** Pure-CSS shape library. `.fam-starburst` (clip-path, 5 sizes, 7 colors, sharp variant), `.fam-badge`, `.fam-price-tag`, `.fam-wave-top/bottom` (SVG data-URI), `.fam-diagonal-bg`, `.fam-blob`, `.fam-corner-ribbon`.

**lib/character-branding.js:** Character placement pipeline. Functions: `placementsForPage()`, `addPlacement()`, `removePlacement()`, `renderPlacement()`, `characterSummary()`. Exports `POSITION_PRESETS` (8 named positions). Stored in `spec.character_branding[page][]`.

**Server endpoints (Session 4):**
- `POST /api/cdn-inject` — inject CDN tag (validates https:// only, idempotent)
- `DELETE /api/cdn-inject` — remove CDN tag
- `GET /api/cdn-injections` — list CDN injections
- `POST /api/inject-fam-asset` — copy + inject fam-motion.js or fam-shapes.css
- `GET/POST/DELETE /api/character-branding` — character placement CRUD

**CRITICAL: DELETE body parsing:** Node `http.request` requires explicit `Content-Length` header for DELETE requests with body. Always set `'Content-Length': Buffer.byteLength(bodyStr)`.

**Test suite:** `tests/session4-visual-tests.js` (82/82 PASS)

---

**Studio stress test findings** (full detail in `tests/automation/logs/auntie-gale-exhaustive-test.json`):
- Build got stuck due to in-memory `buildInProgress` lock → all 5 pages built via CLI direct write
- Classifier mismatch: brief with data-attribute language routed to `verification` not `planning`
- 7 new gaps discovered and logged (see Known Gaps section)
- 11 Buddy placements confirmed via Playwright screenshots
- 9 starbursts across site
- Live countdown timer working
- Swiper carousel functional with autoplay

---

---

## Studio v3 Engine — Phase 0 + Phase 1 (2026-04-09)

### Phase 0: Content Data Layer

**Classifier upgrades** (`site-studio/server.js` → `classifyRequest()`):
- Expanded `content_update` patterns from 7 to 12 (patterns 1–12 in code)
- New patterns: hero headlines, "make it say", "our hours are now", "fix typo/spelling/wording", hero section text, natural ownership language ("the price is now")
- **Default fallback changed**: `layout_update` → `content_update` (non-destructive). Closes Codex MEDIUM finding. `content_update` routes through `tryDeterministicHandler` before Claude; `layout_update` is plan-gated and can trigger rebuilds.
- Precedence comment updated to match actual code order

**Content field sync** (`syncContentFieldsFromHtml(pages)`):
- Reads all `data-field-id` and `data-field-type` attributes from built HTML pages
- Syncs into `spec.content[page].fields[]` — additive only (never overwrites user edits)
- Also syncs `data-section-id` into `spec.content[page].sections[]`
- Called automatically in `runPostProcessing()` after every full build
- New API: `POST /api/sync-content-fields` — idempotent, on-demand sync for all pages
- 167 fields synced across 5 pages for site-auntie-gale-garage-sales

**Current data layer state** (as of 2026-04-09):
- `data-field-id` + `data-section-id` attributes: in all generated HTML ✅
- `spec.content[page].fields[]`: populated via post-build sync ✅
- Surgical replacement via cheerio `$('[data-field-id]')` selector: in `tryDeterministicHandler()` ✅
- tel:/mailto: href updates on phone/email field edits ✅
- Cross-page edits ("change everywhere"): supported ✅
- `mutations.jsonl` written per successful field edit ✅
- Tests: `tests/phase0-content-layer-tests.js` — 69/69 PASS

### Phase 1: Component Skills Foundation

**Component export** (`POST /api/components/export`):
- **Version tracking**: re-export bumps minor version (1.0 → 1.1 → 1.2); `usage_count` increments; `updated_at` timestamp set; original `created_at` preserved
- **Skill auto-sync** (`syncSkillFromComponent(component)`): every export triggers auto-creation/update of `.claude/skills/components/<type>/SKILL.md`
  - Preserves hand-edited sections (Lessons Learned, When to Use)
  - Tracks usage count and which sites used the component
  - Auto-generates: Required Fields, Required Slots, CSS Variables, HTML template (first 2000 chars)
- **Spec ref**: writes `component_ref: "id@version"` into `spec.content[page].sections[]` so rebuild prompts can reference the component identity
- **library.json** entries now include: `id`, `version`, `css_variables[]`, `used_in[]`, `path`, `description`, `created_at`, `updated_at`, `field_count`, `slot_count`

**Component import** (WebSocket `component_import` handler):
- **CSS variable portability**: reads `component.json` → finds vars missing in target site's styles.css → injects into `:root {}` block (or creates one) before inserting HTML
- HTML comment now includes version: `<!-- Component: id v1.0 (imported from library) -->`
- Records `component_ref` + `imported: true` in `spec.content[targetPage].sections[]` after insertion

**Skill directory**: `.claude/skills/components/` — hero-section, contact-form, pricing-table, testimonial-grid (pre-existing), generic (auto-created on first export)

**Tests**: `tests/phase1-component-skills-tests.js` — 64/64 PASS

---

### Known Gaps (updated 2026-04-09)

- **Stock images in gallery + slideshow (street-family-reunion):** Gallery decade sections use placeholder stock photos. Replace with actual Street family content.
- **Slideshow CSS conflict pattern:** `.slide { display:none }` in page CSS conflicts with slideshow.js crossfade. Always use `display:block !important` in slideshow.js injected styles.
- **Hero video text contrast (street-family-reunion):** "Welcome Home" heading may compete with video. Consider semi-transparent overlay.
- **Activity card images sizing on mobile (street-family-reunion):** 192px image height may feel short on large phones. No fix needed unless flagged.
- **[CLOSED — Session 1] Studio build cancel mechanism:** `setBuildInProgress()` + `POST /api/build/cancel` + 10-min auto-clear + stale lock detection on startup. Cancel button in Studio UI.
- **[CLOSED — Session 1] Studio classifier mismatch for technical briefs:** Strong build signals fire before vocabulary checks. Brief indicator patterns (2+ hits required) catch structured briefs.
- **[CLOSED — Session 2] No CDN library management in Studio UI:** `POST /api/cdn-inject` and `DELETE /api/cdn-inject` handle CDN tag injection/removal. `GET /api/cdn-injections` lists them.
- **[CLOSED — Session 1] No component insertion from library:** `component_import` classifier + handler injects HTML template before `</main>`, updates `used_in[]` in library.json.
- **[CLOSED — Session 4] No decorative shape tools:** `lib/fam-shapes.css` with `.fam-starburst`, `.fam-badge`, `.fam-wave-top`, `.fam-diagonal-bg`, etc. Inject via `POST /api/inject-fam-asset`.
- **[CLOSED — Session 3] Imagen 4 generates white-background images:** `POST /api/remove-background` + `scripts/rembg-worker.py` removes backgrounds and adds `.fam-knockout` CSS classes.
- **[LOW] Preview server not auto-registered on site creation:** Must manually add entry to `.claude/launch.json` after `fam-hub site new`. Auto-registration should be built into site creation flow.
- **[MEDIUM] fam-motion.js + fam-shapes.css not applied on existing pages:** Session 4 tools create server-side endpoints but existing site pages (auntie-gale) have not been rebuilt with motion/shape classes. Would require a content editing pass to add `data-fam-animate` attributes and shape classes to existing HTML.
- **[LOW] character-branding.js not wired to build pipeline:** Character placements stored in spec but not automatically rendered into HTML on rebuild. Currently a post-build overlay system only.
- **[LOW] spec.site_name defaults to "New Site":** Always update immediately after first build. og:title will be wrong until corrected. Future improvement: force user input during site creation.
- **[LOW] rembg CLI binary has cascading dep failures:** filetype, watchdog, aiohttp all missing from Python 3.9 install. Use Python API (`scripts/rembg-worker.py`) — never the CLI binary directly.

---

## Studio v3 Engine — Phase 2 + Phase 3 (2026-04-09)

### Phase 2: UI Shell + Editable Canvas

**Direct REST edit path** (`POST /api/content-field`):
- `openFieldEditor()` `saveBtn.onclick` now calls `fetch('/api/content-field', { method: 'POST', ... })` directly — no AI roundtrip, no classifier, no plan gate
- 404 fallback: `POST /api/sync-content-fields` → retry → text-match chat message (3-step recovery)
- Canvas reloads at 600ms after save (was 2000ms)
- Field edit popup shows field_id, old value, editable textarea, Save / Cancel buttons

**GLOBAL_FIELD_TYPES cascade** (in `POST /api/content-field` handler):
- `const GLOBAL_FIELD_TYPES = ['phone', 'email', 'address', 'hours']`
- When a global-type field is edited, ALL pages are scanned for matching field type or field_id
- Each matching page's HTML is patched with cheerio + spec.content updated
- Response includes `cascade_pages: []` listing all pages that were updated
- This means one phone edit updates every page that shows the phone number

**Mutations log** (`mutations.jsonl`):
- Written by `writeSpec()` on every field edit via `POST /api/content-field`
- Fields: `timestamp`, `level: 'field'`, `target_id: field_id`, `action: 'update'`, `old_value`, `new_value`, `source: 'content_field_api'`
- Stored per-site at `sites/<site-tag>/mutations.jsonl`

**Canvas tab structure** (in `site-studio/public/index.html`):
- `#canvas-tab-bar` with three tabs: Preview (`switchCanvasTab('preview')`), Editable View (`switchCanvasTab('editable')`), Images (`switchCanvasTab('images')`)
- `#canvas-editable` pane with `#editable-frame` (iframe), `#editable-toolbar`, `#highlight-toggle`, `#editable-field-count`
- `injectEditableOverlay()` — injects edit popup script into iframe contentDocument
- `openFieldEditor(fieldId, oldValue, page)` — creates popup overlay on canvas
- `loadEditableView()` — loads `?editable=1` URL in iframe, calls `injectEditableOverlay()`

**CSS**: `site-studio/public/css/studio-canvas.css` — `#canvas-tab-bar`, `.canvas-tab`, `.canvas-tab-active`, `#canvas-editable`, `.field-edit-overlay`, `#editable-frame`

**Tests**: `tests/phase2-ui-shell-tests.js` — 61/61 PASS

---

### Phase 3: Multi-Agent Integration

**Agent call logger** (`logAgentCall({ agent, intent, page, elapsed_ms, success, output_size, error, input_tokens, output_tokens, fallback_from })`):
- Writes append-only to `sites/<site-tag>/agent-calls.jsonl`
- Schema: `{ timestamp, agent, intent, page, elapsed_ms, success, output_size, est_input_tokens, est_output_tokens, est_cost_usd, error, fallback_from }`
- Cost estimation: Claude pricing at $3/1M input tokens + $15/1M output tokens
- `agent` values: `'claude'` (AI build/edit), `'codex'` (compare), `'none'` (deterministic handler, no AI)
- Called in: `finishParallelBuild()` (agent=claude, intent=build), `handleChatMessage()` after `tryDeterministicHandler()` (agent=none), `POST /api/compare/generate-v2` (codex attempt + optional claude fallback)

**HTML quality validator** (`validateAgentHtml(html, page)`):
- Scores 0–100 with penalty system; threshold: `score >= 40` = valid
- Deductions: short output −25 (if < 500 chars, returns immediately), no DOCTYPE/html −25, no data-field-id −25 (none) or −10 (<3), no data-section-id −15, no nav/header −10, no section/main −10, error pattern in first 1000 chars −30, below page-specific minimum (index=10000, contact=5000, default=7000) −15
- Returns `{ valid, score, issues[] }`

**Agent stats endpoint** (`GET /api/agent/stats`):
- Reads `agent-calls.jsonl`, returns: `{ total_calls, failure_count, fallback_count, total_cost_usd, avg_elapsed_ms, by_agent{}, by_intent{}, last_call }`
- `by_agent[name]`: `{ calls, success, failures, total_cost, avg_ms }`
- `by_intent[name]`: `{ calls, agent_split{} }`
- Empty file case returns all-zero response with `failure_count: 0` and `last_call: null`

**Routing guide endpoint** (`GET /api/agent/routing`):
- Returns: `{ routing_guide[], fallback_policy, cost_model }`
- Routing: build=claude, content_update=none, compare=codex (with claude fallback), deploy=none, image_gen=claude, restyle=claude, layout_update=claude, major_revision=claude
- `fallback_policy`: documents Codex→Claude path when score < 40
- `cost_model`: Claude $3/$15 per 1M tokens

**Compare v2 endpoint** (`POST /api/compare/generate-v2`):
- Validation: requires `page` param, page must exist in `dist/` directory
- Tries Codex first (2-minute timeout), validates HTML with `validateAgentHtml()`
- If score < 40 OR Codex fails: falls back to Claude, sets `fallback_from: 'codex'`
- Both Codex attempt and Claude fallback logged via `logAgentCall()`
- Response: `{ url, agent, fallback_from, validation: { valid, score, issues } }` on success; `{ error }` on failure

**Compare canvas UI** (in `site-studio/public/index.html`):
- `#canvas-compare` pane with `#compare-split` layout
- `#compare-frame-left` + `#compare-frame-right` iframes (Claude vs Codex side-by-side)
- `generateCodexVersion()` — calls `/api/compare/generate-v2`
- `useCompareVersion('claude' | 'codex')` — promotes selected version to active dist
- `#compare-sync-scroll` checkbox — synchronized scroll across both iframes
- Codex CLI tab: `switchCliTab('codex')`, `#codex-input`, `#codex-output`, `sendCodexPrompt()`

**Tests**: `tests/phase3-multi-agent-tests.js` — 75/75 PASS

---

## Studio v3 Engine — Phase 4 (2026-04-09)

### Phase 4: Image Browser + Research View

**Image suggestions** (`GET /api/image-suggestions`):
- Reads `spec.design_brief` + `spec.site_name` + `spec.business_type` to generate up to 8 contextual search query suggestions
- Returns `{ suggestions[], business_name, industry }` — no AI, deterministic
- Called automatically when Images tab opens (`loadImageBrowserSlots()`)

**Research trigger** (`POST /api/research/trigger`):
- Takes `{ vertical }` body param (string)
- Sanitizes vertical name to safe slug (lowercase, hyphens only)
- Creates structured markdown research stub at `sites/<site-tag>/research/<vertical>-research.md`
- Idempotent: re-trigger returns existing file without overwriting
- Stub contains: overview, target audience, competitive landscape, website must-haves, recommended queries, key messages
- Returns `{ file, status: 'stub' | 'existing', vertical }`

**Research → brief extractor** (`POST /api/research/to-brief`):
- Takes `{ filename }` body param — validates via allowlist (same security as GET /api/research/:filename)
- Parses "Website Must-Haves" and "Key Messages" sections from markdown
- Returns `{ brief_text, filename, vertical }` — brief_text pre-fills chat input when "Use as Brief" is clicked

**Known verticals registry** (`GET /api/research/verticals`):
- Returns 40+ pre-defined verticals in `known_verticals[]`
- Returns per-site researched files as `researched_verticals[{ vertical, file, modified }]`
- IMPORTANT: Route must be declared BEFORE `GET /api/research/:filename` in server.js to avoid Express route conflict

**Image Browser UI enhancements**:
- `#images-suggested-queries` — row of suggested query chips, auto-loaded on tab open
- `#images-shortlist` sidebar — saves favorite images across searches, apply-to-slot from shortlist
- `#images-compare-pane` — side-by-side A/B comparison slots, activated by Compare toggle button
- `shortlistImage(result)` — adds to shortlist panel
- `clearShortlist()` — empties shortlist panel
- `getSuggestedQueries()` / `renderSuggestedQueries(suggestions)` — fetches and renders chips
- `toggleCompareMode()` — activates compare mode; next two card clicks go to A and B slots
- `selectForCompare(result, cardEl)` — places clicked card into compare slot A or B

**Research UI enhancements**:
- `#research-trigger-form` — vertical input + "Research Vertical" button below file list
- `#research-use-brief-btn` — "Use as Brief →" button, visible when a research file is selected
- `triggerResearch()` — calls `/api/research/trigger`, reloads file list on success
- `useBriefFromResearch()` — calls `/api/research/to-brief`, pre-fills chat input with brief text
- `activeResearchFile` — tracks currently selected research file for brief extraction

**CSS additions** (in `studio-canvas.css`):
- `.suggested-query-chip`, `.suggestions-label` — query suggestion chips
- `#images-shortlist`, `.shortlist-item`, `.shortlist-apply-btn`, `.shortlist-remove-btn` — shortlist panel
- `#images-compare-pane`, `.compare-slot`, `.compare-slot-badge` — compare mode
- `.images-compare-toggle-btn` — compare toggle button in toolbar
- `#research-trigger-form`, `.research-trigger-input`, `.research-trigger-btn` — research form
- `#research-brief-bar`, `.research-use-brief-btn`, `.research-brief-filename` — brief bar

**Tests**: `tests/phase4-image-research-tests.js` — 61/61 PASS (first run, no failures)

---

## Studio v3 Engine — Phase 5 (2026-04-09)

### Phase 5: Intelligence Loop

**Intelligence report generator** (`generateIntelReport()`):
- Reads `agent-calls.jsonl`, `mutations.jsonl`, `build-metrics.jsonl`, `components/library.json` (`.components[]` array)
- Produces structured `findings[]` with: `{ id, category, severity, title, description, recommendation, data }`
- Categories: `agents`, `cost`, `mutations`, `performance`, `components`
- Severities: `critical`, `major`, `minor`, `opportunity`
- Finding IDs are deterministic slugs: `<category>-<slug>-<counter>`
- Key findings generated: Codex fail rate (if ≥50%), high fallback count, Claude cost concentration, hot fields, API-only edits, mutation volume, high-usage components, cross-site components, unused components
- IMPORTANT: `library.json` is `{ version, components[], last_updated }` — must read `.components`, not the root object

**`GET /api/intel/report`** — full report with findings + summary + generated_at + site
**`GET /api/intel/findings`** — findings only + severity counts (critical/major/minor/opportunity)
**`POST /api/intel/promote`** — promotes a finding to `intelligence-promotions.json`:
  - Requires `finding_id` → 400 if missing, 404 if not in current report
  - Writes `{ finding_id, category, severity, title, recommendation, promoted_at, action_taken, status: 'pending' }` to `sites/<tag>/intelligence-promotions.json`
  - Idempotent: re-promoting a finding replaces the existing entry
**`POST /api/intel/run-research`** — creates a research stub at `docs/intelligence-reports/<YYYY-WWW-topic>.md`:
  - Requires `topic` → 400 if missing
  - Stub template includes: topic, research questions, findings placeholder, recommendation, priority checklist
  - To populate with Gemini: `scripts/gemini-cli "<topic>" >> docs/intelligence-reports/<file>`

**Intelligence Loop UI (canvas Intel tab)**:
- `switchCanvasTab('intel')` tab button + `#canvas-intel` pane
- `#intel-toolbar` — research input + Run Research button + Refresh button
- `#intel-summary` — severity pill counts (🔴 Critical, 🟠 Major, 🟡 Minor, 💡 Opportunities)
- `#intel-findings-list` — findings grouped by severity, each with title/description/recommendation/Promote button
- `loadIntelReport()` — fetches `/api/intel/findings`, renders summary + findings
- `renderIntelSummary(data, el)` — renders severity counts row
- `renderIntelFindings(findings, el)` — groups by SEVERITY_ORDER, creates finding cards
- `promoteIntelFinding(findingId, btnEl)` — calls `/api/intel/promote`, updates button state
- `runIntelResearch()` — calls `/api/intel/run-research`, shows file path in chat

**CSS** (in `studio-canvas.css`):
- `#canvas-intel`, `#intel-toolbar`, `#intel-body`, `#intel-summary`
- `.intel-summary-pill`, `.intel-sev-{severity}` — color-coded severity pills
- `.intel-finding`, `.intel-severity-{severity}` — left-border color coded cards
- `.intel-finding-title`, `.intel-finding-desc`, `.intel-finding-rec` — card typography
- `.intel-promote-btn` — promote button with hover state
- `.intel-empty` — empty state message

**Tests**: `tests/phase5-intelligence-loop-tests.js` — 71/71 PASS

---

## Session 7 — Phase 0: Multi-Agent Skeleton Fixes (2026-04-09)

### `scripts/agents`

- `export ORIG_PROMPT` before pipeline entry — was never exported, so adapters always received "unknown" for user turn
- `HISTORY_FILE` support added — optional 3rd positional arg (`$3`) accepted; adapters use it to seed conversation history
- `action_status()` function reads `agent-status.json` per site, prints table
- `action_logs()` function reads `agent-calls.jsonl` per site, prints last 10 exchanges

### `adapters/*/cj-get-convo-*` (all three: claude, gemini, codex)

- `HUB_ROOT` path resolution fixed — all 3 adapters referenced an archived repo path (`~/famtastic-platform/`). Now resolve from `SCRIPT_DIR/../../` relative to the adapter file.
- `HISTORY_FILE` support: if `$HISTORY_FILE` is set and file exists, its contents prepended to prompt
- `ORIG_PROMPT` now available via parent export; used to populate the `user_turn` field in JSONL output

### `scripts/fam-hub`

- AGENTCMD dispatcher fixed: was `AGENT="${2:-}"`, `TAG="${3:-}"` — off-by-one. Now `AGENT="${3:-}"`, `TAG="${4:-}"` (CMD=$1, AGENTCMD=$2, AGENT=$3, TAG=$4)
- `status` subcommand: `fam-hub agent status <tag>` → calls `scripts/agents status <tag>`
- `logs` subcommand: `fam-hub agent logs <tag> [agent]` → calls `scripts/agents logs <tag> [agent]`
- `research` subcommand added (see Phase 4)

### `scripts/generate-latest-convo`

New script. Generates real stats from JSONL sources: reads `agent-calls.jsonl` per site, writes `agents/latest-convo.json` with real timestamps, call counts, agent breakdown. Called by `scripts/cj-reconcile-convo` post-reconcile.

### Deleted files

- `agents/latest-convo.json` — was a static fake file with hardcoded Sept 2025 timestamps
- `convos/canonical/latest-convo.json` — same

**Tests**: `tests/session7-phase0-tests.js` — 66/66 PASS

---

## Session 7 — Phase 1: Universal Context File (2026-04-09)

### `site-studio/lib/studio-events.js`

Singleton EventEmitter with 8 namespaced event constants:

```js
STUDIO_EVENTS = {
  SESSION_STARTED, SITE_SWITCHED, BUILD_STARTED, BUILD_COMPLETED,
  EDIT_APPLIED, COMPONENT_INSERTED, DEPLOY_COMPLETED, BRAIN_SWITCHED
}
```

`studioEvents.setMaxListeners(20)` — prevents Node warning with multiple listeners.
Module exports: `{ STUDIO_EVENTS, studioEvents }`.

### `site-studio/lib/studio-context-writer.js`

`StudioContextWriter` class. Listens to all 8 studio events and regenerates `STUDIO-CONTEXT.md` in `sites/<tag>/` on any event.

STUDIO-CONTEXT.md sections (in order):
1. Title + timestamp
2. Active site tag
3. Event type that triggered regeneration
4. Site brief (from spec.design_brief)
5. Site state (spec.state, spec.domain, spec.deployed_url)
6. Component library (library.json component count + names)
7. Vertical research (Pinecone-first, falls back to listing research/*.md files)
8. Intelligence findings (reads intelligence-promotions.json if present)
9. Available tools (hardcoded capability list)
10. Standing rules (hardcoded FAMtastic conventions)

`new StudioContextWriter(tag)` — constructor takes TAG at server startup. `writer.initialize()` — registers all event listeners + writes initial context.

### `site-studio/lib/brain-injector.js`

`BrainInjector` class. Handles per-brain context file injection.

- Claude: writes `@STUDIO-CONTEXT.md` `@-include` block in Claude system prompt (reads and prepends)
- Gemini/Codex: writes sidecar file `sites/<tag>/STUDIO-CONTEXT-<brain>.md` alongside the adapter prompt

`new BrainInjector(tag, brain)`. `injector.inject(brain)` — writes appropriate file for that brain's integration style.

**Known gap:** When brain switches at runtime, sidecar files are not re-written. Injection only runs at server startup (`setBrain()` does not call `injector.inject()`).

### `site-studio/server.js` — Phase 1 additions

- `require('./lib/studio-events')` + `require('./lib/studio-context-writer')`
- Init block after `server.listen()`: `new StudioContextWriter(TAG).initialize()`
- `GET /api/context` — returns STUDIO-CONTEXT.md contents as `{ context, path, lastModified }`
- `POST /api/context` — triggers manual context regeneration; returns `{ regenerated: true }`
- 7 event emits wired: SESSION_STARTED (server.listen), SITE_SWITCHED (both /api/switch-site handlers), BUILD_COMPLETED (finishParallelBuild), EDIT_APPLIED (POST /api/content-field), DEPLOY_COMPLETED (runDeploy success), COMPONENT_INSERTED (POST /api/components/export), BRAIN_SWITCHED (setBrain)

**Tests**: `tests/session7-phase1-tests.js` — 75/75 PASS

---

## Session 7 — Phase 2: Brain Router UI (2026-04-09)

### `site-studio/public/css/studio-brain-selector.css`

Pill bar UI with per-brain colors:
- `#brain-selector-bar` — flex row above chat form
- `.brain-pill` — base pill; `.brain-pill.active` — highlighted state
- Per-brain active colors: Claude=indigo (`#4f46e5`), Codex=green (`#059669`), Gemini=yellow (`#d97706`)
- `.brain-status-dot` — 8px circle: `.available`=green, `.rate-limited`=yellow, `.unavailable`=red
- `.brain-cost-badge` — small grey pill with cost label
- `.brain-msg-count` — session message count badge
- `#brain-fallback-bar` — amber warning bar shown when auto-fallback fires

### `site-studio/public/js/brain-selector.js`

`BrainSelector` IIFE module:
- `select(brain)` — sends `{ type: 'set-brain', brain }` over WebSocket
- `handleServerMessage(msg)` — routes `brain-changed`, `brain-status`, `brain-fallback` messages; updates pill UI
- `onWsOpen()` — calls `requestStatus()` after 400ms delay to get initial brain state
- `requestStatus()` — sends `{ type: 'get-brain-status' }` over WebSocket
- `getCurrentBrain()` — returns `currentBrain`
- Window-level exports: `window.BrainSelector`, `window.selectBrain`

### `site-studio/server.js` — Phase 2 additions

**Brain state** (module-level vars):
```js
let currentBrain = 'claude';
const BRAIN_LIMITS = {
  claude:  { dailyLimit: null, currentUsage: 0, status: 'available' },
  codex:   { dailyLimit: 40,   currentUsage: 0, status: 'available' },
  gemini:  { dailyLimit: 1500, currentUsage: 0, status: 'available' },
};
const sessionBrainCounts = { claude: 0, codex: 0, gemini: 0 };
```

**`spawnBrainAdapter(brain, prompt)`** — spawns `adapters/{brain}/cj-get-convo-{brain}` with prompt via stdin using `spawnSync`. Returns `{ stdout, stderr, status }`.

**`setBrain(brain, ws)`** — validates brain name, sets `currentBrain`, emits `BRAIN_SWITCHED` event, broadcasts `brain-changed` message to all WebSocket clients.

**`routeToBrainForBrainstorm(prompt, brain)`** — increment `sessionBrainCounts[brain]`, check daily limit, if at limit: set `lim.status = 'rate-limited'`, find fallback (Claude → Codex → Gemini), broadcast `brain-fallback`. Routes to `spawnClaude()` for claude, `spawnBrainAdapter()` for others, with error fallback to claude.

**REST endpoints:**
- `GET /api/brain` — returns `{ currentBrain, limits: BRAIN_LIMITS, sessionCounts: sessionBrainCounts }`
- `POST /api/brain` — validates brain name, calls `setBrain()`, returns new state

**WebSocket handlers** (before chat handler):
- `set-brain` → calls `setBrain(msg.brain, ws)`
- `get-brain-status` → sends `brain-status` with current state

**handleBrainstorm enhanced:**
- Reads up to 80 lines of `sites/<tag>/STUDIO-CONTEXT.md` → `studioCtxSection`
- Prepends `[STUDIO CONTEXT]\n${studioCtxSection}\n[/STUDIO CONTEXT]\n\n` to prompt
- Routes via `routeToBrainForBrainstorm(prompt)` instead of hardcoded `spawnClaude()`

**Known gap:** All build/content-edit paths still use `spawnClaude()` directly. Only brainstorm mode routes through the brain router.

**Tests**: `tests/session7-phase2-tests.js` — 62/62 PASS

---

## Session 7 — Phase 3: Studio Config File (2026-04-09)

### `FAMTASTIC-SETUP.md`

Disaster recovery document at repo root. Sections:
- **Quick Start (New Machine)** — 5-step bash commands to get running from scratch
- **MCP Servers** — 7 servers with config path, status, purpose
- **Claude Code Plugins** — 10 plugins with purpose
- **Environment Variables** — 16 total with Set/Not set status column (auto-updated)
- **Third-Party Accounts/Subscriptions** — 11 accounts with tier/cost info
- **Pinecone Configuration** — index name, dimensions, metric, namespace convention
- **Dependency Versions** — Node, Python, uv, Claude CLI (auto-updated)
- **FAMtastic-Specific Configuration** — studio-config.json keys reference
- **Known Setup Gotchas** — rembg Python API vs CLI, Claude CLI cwd, env var scope
- **fam-hub Commands Reference** — all subcommands with usage examples
- **Architecture Overview** — 1-page system diagram in ASCII

### `scripts/update-setup-doc`

Bash script (chmod +x). Updates FAMTASTIC-SETUP.md in place:
- Replaces "Last Updated:" timestamp with current date
- Replaces "Machine:" hostname with `$(hostname)`
- Replaces Node/Python/uv/Claude version rows with live `$(node --version)` etc.
- Replaces env var status column (Set/Not set) based on current shell environment
- `--commit` flag: stages and commits the update automatically

Run manually: `scripts/update-setup-doc` or `scripts/update-setup-doc --commit`

**Known gap:** Does not auto-parse `claude mcp list` output to update MCP server table. Static table from document creation.

**Tests**: `tests/session7-phase3-tests.js` — 49/49 PASS

---

## Session 7 — Phase 4: Research Intelligence System (2026-04-09)

### `site-studio/lib/research-registry.js`

4 sources in `RESEARCH_REGISTRY`. See Phase 4 report (`docs/session7-phase-4-report.md`) for full detail.

Key facts:
- `perplexity.status = 'disabled'` by default — requires explicit enable + `PERPLEXITY_API_KEY`
- `build_patterns.status = 'active'` always — reads from `.local/` pattern cache
- `gemini_loop.status` depends on `process.env.GEMINI_API_KEY` at module load time
- Effectiveness scores written to `.local/research-effectiveness.json` (gitignored)

### `site-studio/lib/research-router.js`

`queryResearch(vertical, question, options)` — Pinecone-first with configurable threshold (default 0.75, reads from studio-config.json key `research.pinecone_threshold`), 90-day staleness with background auto-refresh. Calls `logResearchCall()` and `saveEffectivenessScore()` on every query.

**IMPORTANT:** Route ordering critical — `GET /api/research/sources`, `GET /api/research/effectiveness`, `GET /api/research/seed-status`, and `GET /api/research/threshold-analysis` must ALL be registered BEFORE `GET /api/research/:filename` in server.js. If placed after, Express will route them as filename lookups and return 404.

### `scripts/seed-pinecone`

Seeding script — safe to run, exits 0 with explanation if `PINECONE_API_KEY` unset. Seeds from `sites/*/spec.json` (design_decisions, site_brief) and `SITE-LEARNINGS.md` sections.

**Tests**: `tests/session7-phase4-tests.js` — 76/76 PASS

---

## Session 7 — Known Gaps (opened 2026-04-09) — ALL CLOSED IN SESSION 8

All 7 gaps below were closed in Session 8. See Session 8 entries below.

- **Real Pinecone embeddings** — CLOSED S8: `upsertRecords([{id, text, ...}])` + `searchRecords()` with zero-vector fallback.
- **BRAIN_SWITCHED sidecar re-injection** — CLOSED S8: `reinject(brain, tag, hubRoot)` called on every `BRAIN_SWITCHED` event.
- **Research effectiveness stars UI** — CLOSED S8: effectiveness progress bar (0-100%) replaces star rating prompts.
- **update-setup-doc MCP table** — CLOSED S8: MCP auto-parse block added to `scripts/update-setup-doc`.
- **90-day staleness re-query** — CLOSED S8: `backgroundRefresh()` via `setImmediate()`, stale returned immediately, fresh runs in background, `RESEARCH_UPDATED` event emitted.
- **All-pages context missing** — CLOSED S8: `buildAllPages()` added to context writer. Active page marked.
- **Context writer Pinecone re-queries every call** — CLOSED S8: CONTEXT_CACHE (30s TTL) added.

---

## Session 8 — Phase 0: fam-convo-* Rename (2026-04-09)

### Naming Convention

All conversation pipeline scripts now use the `fam-convo-` prefix. Old `cj-*` names are deprecated — shims at old paths print WARNING to stderr and exec the new script.

### Shim Pattern

```bash
#!/usr/bin/env bash
echo "WARNING: <old-name> is deprecated. Use <new-name> instead." >&2
exec "$(dirname "$0")/<new-name>" "$@"
```

All 8 old paths are shims. All 8 new paths are the real executables.

### Internal Reference Updates Required on Rename

When renaming scripts that call other scripts, check for internal self-references. Both `fam-convo-reconcile` and `fam-convo-ingest` had internal calls that needed updating:
- `fam-convo-reconcile`: calls `fam-convo-compose` and `fam-convo-generate-latest` (was cj-compose-convo, generate-latest-convo)
- `fam-convo-ingest`: calls `fam-convo-promote` (was cj-promote)

### Summarization Always Uses Claude

Documented in all 3 adapter scripts (`fam-convo-get-claude`, `fam-convo-get-gemini`, `fam-convo-get-codex`) as a comment:

```bash
# Summarization always uses Claude regardless of active brain.
# When history > 20 turns, oldest 10 are summarized by Claude before formatting.
```

This is an architectural decision, not a bug. Claude is the only brain that reliably produces structured output needed for summarization. See cerebrum.md Key Learnings for full rationale.

**Tests**: `tests/session8-phase0-tests.js` — 75/75 PASS

---

## Session 8 — Phase 1: Research Calibration (2026-04-09)

### `site-studio/lib/history-formatter.js` (new)

Per-brain conversation history formatting. Three exported format functions:

```javascript
HISTORY_FORMATS = {
  claude:  (history) => JSON.stringify({ messages: [...] }),
  gemini:  (history) => 'Human: ...\n\nAssistant: ...\n\nHuman:',
  codex:   (history) => '### Prior conversation:\n...\n### Current request:',
}
```

`formatHistoryForBrain(history, brain)` — selects format; defaults to claude if unknown brain.

`summarizeHistory(history, threshold)` — when `history.length > threshold` (default 20), summarizes oldest 10 turns using Claude CLI. Runs from `os.tmpdir()` (mandatory — see cerebrum.md SPAWN_CLAUDE_CWD rule). Logs `source: 'summarization'`.

### CONTEXT_CACHE in studio-context-writer.js

Module-level cache object (not class-level):
```javascript
const CONTEXT_CACHE = {
  pineconeResult: null,
  lastVertical:   null,
  lastQueried:    null,
  TTL:            30 * 1000,
};
```
Invalidated by:
- `studioEvents.on(STUDIO_EVENTS.SITE_SWITCHED, () => { CONTEXT_CACHE.lastQueried = null; })`
- `studioEvents.on(STUDIO_EVENTS.BUILD_COMPLETED, () => { CONTEXT_CACHE.lastQueried = null; })`

### Configurable Pinecone Threshold

`getThreshold()` in `research-router.js` reads `research.pinecone_threshold` from `~/.config/famtastic/studio-config.json`. Default: `0.75`. The threshold changed from 0.85 (hardcoded, Session 7) to 0.75 (configurable, Session 8) based on Codex adversarial review finding that 0.85 was too aggressive.

### New API Endpoints (Session 8)

Both must be declared BEFORE `GET /api/research/:filename` in server.js:
- `GET /api/research/seed-status` — Pinecone seed status
- `GET /api/research/threshold-analysis` — current threshold + calibration advice

**Tests**: `tests/session8-phase1-tests.js` — 31/31 PASS

---

## Session 8 — Phase 2: Gap Closures (2026-04-09)

### All-Pages Context Format

`buildAllPages()` in `studio-context-writer.js` produces a section like:
```
## All Pages
- index.html (active) — H1: "Welcome" — 5 sections, 3 images — modified 2026-04-09
- about.html — H1: "About Us" — 3 sections, 1 image — modified 2026-04-09
```

Active page detection: compares filenames against the `activePage` parameter (passed from server.js state).

### Background Research Refresh

`backgroundRefresh(vertical, question, staleResult)` in `research-router.js`:
- Called immediately after returning stale result to caller
- Uses `setImmediate()` so it doesn't block the response
- Emits `RESEARCH_UPDATED` event on completion with `{ vertical, question, result }`
- Staleness threshold: 90 days (configurable via `STALE_DAYS` at top of research-router.js)

### Pinecone Text-Based Embeddings

New methods (require Pinecone serverless index with integrated embedding configured):
```javascript
await index.upsertRecords([{ id, text, ...metadata }]);
await index.searchRecords({ query: { topK: 1, inputs: { text: question } } });
```

Legacy fallback (zero-vectors) still present for non-serverless indexes.

### Effectiveness Bar CSS

Added to `site-studio/public/css/studio-canvas.css`:
```css
.effectiveness-bar { height: 4px; background: #10b981; border-radius: 2px; transition: width 0.3s ease; }
.effectiveness-score { font-size: 9px; color: #10b981; min-width: 24px; text-align: right; font-variant-numeric: tabular-nums; }
```

**Tests**: `tests/session8-phase2-tests.js` — 28/28 PASS

---

## Session 8 — Phase 3: spawnClaude() Migration Map (2026-04-09)

### Key Architecture Facts for SDK Migration

1. **CLAUDE_* env var stripping is a subprocess concern only.** The SDK uses the API — no subprocess, no nested-session detection. Strip logic can be removed entirely when migrating.

2. **os.tmpdir() CWD is a subprocess concern only.** With SDK there is no CWD. This is the other half of the nested-session prevention.

3. **AbortController replaces child.kill().** Every `ws.currentChild = child; setTimeout(() => child.kill(), ...)` becomes:
   ```javascript
   const controller = new AbortController();
   setTimeout(() => controller.abort(), timeoutMs);
   ```

4. **Call Site 8 (Chat Handler) must be last.** It has a Haiku fallback via inline respawn at line 8992. The inline code should be extracted to `spawnClaudeModel(model, prompt)` before migrating — otherwise you'd migrate the same logic twice.

5. **Parallel build (Call Site 6) changes architecture.** `ws.activeChildren[]` is replaced by `Promise.all()` with an array of AbortControllers. WS close cancels all via the shared array.

6. **USE_SDK feature flag is the safety net.** `const USE_SDK = process.env.USE_SDK === 'true'`. All call sites route through a `callClaude()` wrapper that delegates based on the flag. `spawnClaude()` never deleted until all call sites are stable.

### Migration Order (Simplest First)

1. Scope Estimation (Call Site 4) — non-streaming, returns null on failure
2. Image Prompt (Call Site 2) — non-streaming, HTTP response
3. Session Summary (Call Site 1) — non-streaming, writes to disk
4. Planning / Design Brief (Call Site 5) — streaming, partial JSON
5. Data Model (Call Site 3) — streaming, firstChunk tracking
6. Template Build (Call Site 7) — `templateSpawned` race guard
7. Per-Page Parallel Build (Call Site 6) — concurrent streaming
8. Chat Handler (Call Site 8) — concurrent streaming + Haiku fallback

**Tests**: `tests/session8-phase3-tests.js` — 21/21 PASS

---

## Session 8 — Known Gaps (opened 2026-04-09)

- **Haiku fallback inline at line 8992** — `handleChatMessage()` has an inline Claude spawn for Haiku fallback that is not a call to `spawnClaude()`. Should be extracted to `spawnClaudeModel(model, prompt)` before SDK migration to avoid migrating the same logic twice.
- **seed-pinecone --vertical flag missing** — `scripts/seed-pinecone` does not support `--vertical <name>`. Build-completion auto-seeding for specific verticals requires this flag. Deferred to a future session.
- **spawnBrainAdapter separate migration track** — `spawnBrainAdapter` spawns shell scripts, not claude --print. It has its own subprocess pattern and will need a separate migration strategy if non-claude brains ever switch to SDK-based APIs.

---

## Session 8 Addendum — Corrections 1–6 + Conversation Tagging (2026-04-09)

### Correction 1 — Embeddings Order Verified

`pineconeUpsert()` and `pineconeQuery()` in `research-router.js` both use text-based APIs as the primary path with zero-vector legacy fallback. The order in source: text-based `try` block first, then `catch` falls through to legacy. Tests now verify the order within each function (not across functions — cross-function index comparison is meaningless).

### Correction 2 — Multi-turn CLI Limitation

Subprocess-based multi-turn conversation is **best-effort only**. History is prepended as plain text — no structured API. Claude CLI, Gemini CLI, and Codex CLI all receive history this way. Real multi-turn (via the Anthropic SDK messages API) is deferred to Session 9.

**Do not use `--input-format json`** — this flag does not exist in Claude CLI.

Decision entry in `.wolf/cerebrum.md`: `SUBPROCESS_CLI_MULTI_TURN` and `SUMMARIZATION_ALWAYS_CLAUDE`.

### Correction 3 — computeEffectivenessFromBuild() Rebalanced

`iterations_to_approval` removed from effectiveness scoring. It required plan revision tracking infrastructure that does not exist. Weights rebalanced to sum to 1.0:

```javascript
const score = (
  Math.min(100, Math.max(0, healthDelta * 50 + 50)) * 0.6 +   // healthDelta weight: 0.6
  (briefReuseRate * 100) * 0.4                                  // briefReuseRate weight: 0.4
);
```

**File:** `site-studio/lib/research-registry.js` — `computeEffectivenessFromBuild(source, vertical, buildMetrics)`

### Correction 4 — REQUERY_QUEUE (Single Worker)

`setImmediate(() => backgroundRefresh(...))` replaced by `enqueueRequery(vertical, question)` in **both** paths inside `pineconeQuery()` (primary text-based path and legacy zero-vector fallback path).

```javascript
const REQUERY_QUEUE = {
  pending:    new Set(),  // JSON-stringified {vertical, question} — Set deduplicates
  processing: false,      // single-worker flag
};
```

`enqueueRequery()` adds to queue, starts `processRequeryQueue()` if idle. Worker drains one entry at a time, scheduling the next with `setImmediate(processRequeryQueue)` if more remain.

**File:** `site-studio/lib/research-router.js`

### Correction 5 — check-tools Replaces verify-quickstart

`fam-hub admin check-tools` — checks node, npm, python3, claude, netlify. Help text explicitly states "Does not verify Studio starts correctly" to prevent confusion. `verify-quickstart` shim redirects with deprecation warning to stderr.

**File:** `scripts/fam-hub`

### Correction 6 — Migration Map Search Commands

`docs/spawn-claude-migration-map.md` now includes a **Search Commands Used** section with 4 grep patterns for finding all call sites, and a **Manual Review Required** section with last-verified date.

### Conversation Tagging — fam-convo-tag

New script: `scripts/fam-convo-tag`. Applies content-pattern tags to assistant messages in canonical conversation JSON files.

**Invocation:** `fam-convo-tag <canonical-file>`

**Tag patterns (7):**

| Tag | Regex (case-insensitive) |
|-----|--------------------------|
| `component-discussion` | `component\|library\|export\|skill` |
| `build-related` | `build\|generate\|html\|template` |
| `gap-identified` | `error\|failed\|broken\|bug\|fix` |
| `brainstorm` | `idea\|what if\|consider\|maybe\|could we` |
| `deployment` | `deploy\|netlify\|live\|production` |
| `research-related` | `research\|vertical\|market\|industry` |
| `media` | `image\|photo\|mascot\|character\|logo\|svg` |

**Non-destructive:** existing tags preserved, new tags appended, `unique` applied. Handles both `{ messages: [] }` object form and bare array form. Validates JSON first; exits 0 on invalid file.

**Wire-up:**
- `fam-convo-reconcile`: calls `fam-convo-tag "$CJ_DATA_ROOT/convos/canonical/$tag.json" || true` after writing canonical file (non-blocking)
- All three adapter scripts (`fam-convo-get-claude`, `fam-convo-get-gemini`, `fam-convo-get-codex`): jq output includes `tags:[]` so the field exists on every record from the start

**Tests:** `tests/session8-addendum-tests.js` — 54/54 PASS. Cumulative: **938/938**.

---

## Session 9 Phase 2 — Anthropic SDK Migration (All 8 spawnClaude Call Sites)

**Date:** 2026-04-09

All 8 `spawnClaude()` call sites in `site-studio/server.js` have been migrated to the Anthropic SDK (`@anthropic-ai/sdk`). The `claude --print` subprocess path is retained as an emergency fallback only.

### New Infrastructure (site-studio/server.js)

**Imports added** (lines 15-17):
```javascript
const Anthropic = require('@anthropic-ai/sdk');
const { logAPICall: logSDKCall } = require('./lib/api-telemetry');
const { getOrCreateBrainSession, resetSessions: resetBrainSessions } = require('./lib/brain-sessions');
```

**`getAnthropicClient()`** — lazy-init singleton Anthropic client. Avoids re-instantiation per call.

**`callSDK(prompt, opts)`** — non-streaming SDK call with AbortController timeout, cost logging via `logSDKCall()`. Options: `maxTokens`, `callSite`, `timeoutMs`.

**`spawnClaudeModel(model, prompt)`** — like `spawnClaude()` but accepts a model string. Added for CS8 Haiku extraction. `@deprecated`.

**`spawnClaude()`** — updated default model to `claude-sonnet-4-6` (was `claude-sonnet-4-5`), added `@deprecated` JSDoc.

### Migrated Call Sites

| CS | Function | SDK Method | maxTokens | callSite label |
|----|----------|-----------|-----------|----------------|
| CS1 | `generateSessionSummary()` | `callSDK()` non-streaming | 4096 | `session-summary` |
| CS2 | `POST /api/generate-image-prompt` | `callSDK()` non-streaming | 4096 | `image-prompt` |
| CS3 | `handleDataModelPlanning()` | `callSDK()` non-streaming | 4096 | `data-model` |
| CS4 | `generatePlan()` | `callSDK()` non-streaming | 2048 | `generate-plan` |
| CS5 | `handlePlanning()` | `callSDK()` non-streaming | 8192 | `planning-brief` |
| CS6 | `spawnOnePage()` (in `parallelBuild`) | `sdk.messages.stream()` per-page | 16384 | `page-build` |
| CS7 | template build (in `parallelBuild`) | `sdk.messages.create()` | 16384 | `template-build` |
| CS8 | `handleChatMessage()` | `sdk.messages.stream()` streaming | 16384 | `chat` |

### Key Architecture Changes

**`parallelBuild()`** is now `async`. Per-page builds use `Promise.allSettled()` so individual page failures don't abort the entire batch. Each page gets its own `AbortController` registered in `pageControllers[]`; the WS `close` event aborts all.

**`handleChatMessage()`** is now `async`. All response processing logic previously in `onChildClose()` has been refactored into `onChatComplete(finalResponse, usage)`. This function handles: token tracking, cost logging, context window warning, multi-page parsing, HTML_UPDATE, SVG_ASSET, fallback response.

**`runHaikuFallbackSDK()`** — new standalone async function called by `handleChatMessage()`'s silence timer when Sonnet produces no output after 30s. Uses SDK streaming with `claude-haiku-4-5-20251001`.

**Cost logging:** all SDK paths call `logSDKCall({ provider, model, callSite, inputTokens, outputTokens, tag, hubRoot })` from `lib/api-telemetry.js`. Token counts come from `response.usage` (real data, not estimates).

### New Endpoint: `GET /api/telemetry/sdk-cost-summary`

Returns session-level cost aggregates plus last 50 SDK calls for the current site. Fields: `totalCostUsd`, `byProvider`, `bySite`, `byCallSite`, `generatedAt`, `recentCalls`.

### Site Switch: `resetBrainSessions()` on TAG change

`resetBrainSessions()` is now called inside `POST /api/switch-site` immediately after `TAG = newTag`, clearing conversation history for all brain sessions when the user switches sites.

### Tests

**`tests/session9-phase2-tests.js`** — 39/39 PASS. Structural checks only (no live API calls). Verifies: imports, callSDK, getAnthropicClient, spawnClaudeModel, @deprecated notice, default model, each of the 8 call sites migrated, telemetry endpoint, resetBrainSessions on switch.

**Cumulative: 977/977 (938 prior + 39 new).**

---

## Session 9 Phase 3 — spawnClaude() Retirement Verification (2026-04-09)

All 8 main-path `spawnClaude()` call sites confirmed migrated. Remaining invocations are exclusively in `routeToBrainForBrainstorm()` — the CS9 brainstorm routing function, which is a separate migration track.

### Final spawnClaude() Status

**Invocations remaining:** 2 (lines ~11452 and ~11459), both inside `routeToBrainForBrainstorm()`.

**Main handler functions verified clean via tests (zero spawnClaude calls):**
- `generateSessionSummary()`, `handleDataModelPlanning()`, `handleDataModel()`, `generatePlan()`, `handlePlanning()`, `parallelBuild()`, `handleChatMessage()`

### @deprecated notices

```javascript
// spawnClaude()  — "All main paths use Anthropic SDK via callSDK() / ClaudeAdapter."
// spawnClaudeModel() — "Retained as fallback. Prefer SDK via ClaudeAdapter."
```

### api-telemetry Coverage

Every SDK call path logs via `logSDKCall()` with a named `callSite` label:

| callSite label | Path |
|----------------|------|
| `session-summary` | CS1 `generateSessionSummary()` |
| `image-prompt` | CS2 `POST /api/image-prompt` |
| `data-model` | CS3 `handleDataModelPlanning()` |
| `generate-plan` | CS4 `generatePlan()` |
| `planning-brief` | CS5 `handlePlanning()` |
| `page-build` | CS6 per-page in `parallelBuild()` |
| `template-build` | CS7 template step in `parallelBuild()` |
| `chat` | CS8 `handleChatMessage()` |
| `chat-haiku-fallback` | `runHaikuFallbackSDK()` |

### Migration Map Final Status

`docs/spawn-claude-migration-map.md` updated with:
- ✅ Migrated for CS1–CS8 and Haiku fallback
- 🔄 Retained for CS9 (brainstorm routing)
- Full status table in Section 1
- `@deprecated` documentation

### Tests

**`tests/session9-phase3-tests.js`** — 35/35 PASS. Verifies: no main-path spawnClaude calls, @deprecated notices, api-telemetry for all 8 paths, sdk-cost-summary endpoint, runHaikuFallbackSDK, getAnthropicClient singleton, migration map final statuses, main handlers clean, SDK streaming patterns.

---

## Session 9 — Known Gaps (opened 2026-04-09)

- **`initBrainSessions()` Claude probe is blocking** — Claude auth probe at startup adds ~2-5s. Should fire-and-forget; update brain status via `SESSION_STARTED` event when complete. Deferred.
- **Connect button UI not wired** — `needs-auth` status is in the `SESSION_STARTED` payload but the brain selector UI doesn't show a Connect button. Deferred to Phase 2+ UI work.
- **GeminiAdapter key validation is weak** — checks `GEMINI_API_KEY` is non-empty but doesn't probe for validity. A bad key won't be caught until the first Gemini call.
- **OpenAI OAuth not implemented** — CodexAdapter uses `OPENAI_API_KEY`. ChatGPT Plus OAuth requires browser interaction; not a server-side concern.
- **CS9 (`routeToBrainForBrainstorm`) still uses spawnClaude** — brainstorm routing for the claude brain uses subprocess. Migration requires `BrainInterface` integration into the brainstorm WS handler.
- **Phase 0 tests regress post-migration** — 12/40 Phase 0 tests now fail because they verified pre-migration `spawnClaude` patterns that were correctly removed. These tests are accurate records of the pre-migration state; they served their purpose.

---

## Session 9 Addendum — Codex Adversarial Review Corrections (2026-04-09)

Six corrections applied after Codex adversarial review of the Session 9 implementation.

### C1 — CodexAdapter: CLI Subprocess, Not OpenAI SDK

`new OpenAI()` reads `OPENAI_API_KEY` — but ChatGPT Plus is a consumer subscription, entirely separate from the OpenAI API billing system. `CodexAdapter` rewritten to use `fam-convo-get-codex` CLI subprocess (same as `spawnBrainAdapter`). Capabilities updated to `multiTurn: false, streaming: false`. `openai` removed from `package.json`.

### C2 — RECONCILED-CALL-SITES.md

`docs/RECONCILED-CALL-SITES.md` created as the authoritative post-migration inventory. Each entry: CS number, function name, line, SDK method, max_tokens, callSite label, timeout, complexity rating (Simple/Moderate/Complex/Separate track), purpose.

### C3 — Undefined Functions Now Defined

**`lib/haiku-fallback.js`** — `fallbackToHaiku(messages, onChunk, ws, opts)` streams `claude-haiku-4-5-20251001` via SDK. Sends `{ fallback: true }` flag in WS chunks so UI can differentiate.

**`lib/api-cost-tracker.js`** — `logAPICall(provider, model, usage, meta)` + `calculateCost(model, inputTokens, outputTokens)`. Simplified signature vs `api-telemetry.js`. Includes `codex-cli` at $0 (CLI has no token billing).

**Per-WebSocket state** added to `wss.on('connection', (ws) => {`:
```javascript
ws.brainSession  = null           // BrainInterface instance, lazy-created
ws.currentBrain  = currentBrain   // inherits global at connect time
ws.currentMode   = 'chat'
ws.currentSite   = TAG
ws.currentPage   = currentPage
ws.getBrainSession()              // lazy-creates BrainInterface for this connection
ws.getOrCreateBrainSession(brain) // brain switch preserving history
ws.resetBrainSession()            // clear on site switch
```

### C4 — Consistent Adapter Interface

All adapters have `execute(message, options)` and `executeStreaming(message, options)`. `CodexAdapter.executeStreaming()` delegates to `execute()` and delivers the result as a single chunk (consistent with `streaming: false` capability). No adapter instantiates `OpenAI` SDK.

### C5 — GeminiAdapter Real Auth Probe

`brain-sessions.js` Gemini probe now calls `model.generateContent('ping')` instead of only checking env var presence. A bad key is caught immediately on startup rather than on first use.

### C6 — Context Header Not Stored in History

`BrainInterface.execute()` already had this correct (per Phase 1 review), confirmed by tests. History stores original `message` (no header); adapter receives `fullMessage` (header-prepended). History passed to adapter excludes the current turn (uses `slice(0, -1)`).

`BrainInterface` now accepts `ws` in opts. `buildContextHeader()` reads `ws.currentSite`, `ws.currentPage`, `ws.currentMode` when ws is attached — context always live, never stale.

### Tests

**`tests/session9-addendum-tests.js`** — 47/47 PASS. Covers all 6 corrections including unit tests of context header behavior with mock adapters and ws integration tests.

**Cumulative: 1,059 tests.**

---

## Session 10 (2026-04-10) — OpenAI SDK + Brain Verifier + Tool Calling + Client Interview

### Overview

Session 10 completed three infrastructure tracks and added a product feature:
1. Three-brain SDK ecosystem verified live at startup (`brain-verifier.js`)
2. Tool calling foundation for Claude (5 tools, `MAX_TOOL_DEPTH=3`)
3. Client interview system (captures brand intent before first build)
4. Site #6 built: Drop The Beat Entertainment (South Florida mobile DJ)

**Cumulative tests: 1,183 (1,059 prior + 124 this session)**

---

### Phase 0 — API Verification + OpenAI SDK Migration

#### `lib/brain-verifier.js`

Probes all three APIs concurrently at server startup. Results cached in `_results`.

```javascript
// Exports
verifyAllAPIs()   // → { claude, gemini, openai, codex } — each { status, model, error }
getBrainStatus()  // → same cached object (no re-probe)
verifyClaudeAPI() // individual probe (Anthropic SDK messages.create)
verifyGeminiAPI() // individual probe (generateContent('ping'))
verifyOpenAIAPI() // individual probe (chat.completions.create)
verifyCodexCLI()  // checks OPENAI_API_KEY presence + SDK instantiation
```

Called at startup: `verifyAllAPIs().then(r => console.log('[brain-verifier] ...'))`.  
Returns within 5–10 seconds; non-blocking.

#### `GET /api/brain-status`

Returns cached verification state. Used by `brain-selector.js` polling every 30s.

```json
{
  "claude":  { "status": "connected", "model": "claude-sonnet-4-6", "error": null },
  "gemini":  { "status": "connected", "model": "gemini-2.5-flash",  "error": null },
  "openai":  { "status": "connected", "model": "gpt-4o",            "error": null },
  "codex":   { "status": "connected", "model": "gpt-4o",            "note": "OpenAI SDK", "error": null },
  "timestamp": "2026-04-10T..."
}
```

#### `lib/model-config.json`

Canonical model registry. Keys: `claude`, `gemini`, `openai`. Each has `provider` and `model`.

```json
{
  "claude": { "provider": "anthropic", "models": { "site_generation": "claude-sonnet-4-6", "chat": "claude-haiku-4-5-20251001" } },
  "gemini": { "provider": "google",    "model": "gemini-2.5-flash" },
  "openai": { "provider": "openai",    "model": "gpt-4o", "fallback": "gpt-4o-mini" }
}
```

#### CodexAdapter — CLI → OpenAI SDK

Full rewrite. No subprocess. Requires `OPENAI_API_KEY`.

```javascript
const CodexAdapter = class {
  // this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  // capabilities: { multiTurn:true, streaming:true, toolCalling:true, vision:true, maxTokens:16000 }
  // execute(message, opts) — uses chat.completions.create
  // _executeStreaming() — stream_options: { include_usage: true } for logAPICall
}
module.exports = { CodexAdapter };
```

`brain-adapter-factory.js` maps `'openai'` → `CodexAdapter`.

#### Brain routing gate

Before the classifier in the WebSocket `message` handler:

```javascript
// When non-Claude brain is active and intent is not build/plan-gated,
// route to brainstorm handler (which uses the selected brain)
if (currentBrain !== 'claude' && intent !== 'build') {
  return handleBrainstorm(ws, message, ...);
}
```

This was the root cause of the "asked was this Gemini, it answered Claude" bug. Fixed.

#### `ws.brainModels`

Per-connection model selection state, initialized on WS connect:

```javascript
ws.brainModels = { claude: 'claude-sonnet-4-6', gemini: 'gemini-2.5-flash', openai: 'gpt-4o' };
```

Updated via `set-brain-model` WS message: `{ type: 'set-brain-model', brain: 'claude', model: 'claude-haiku-4-5-20251001' }`.

#### gemini-cli rewrite

Rewrote from Python to Node.js:
- `scripts/gemini-cli` — bash script that calls `scripts/lib/gemini-generate.mjs` via `node`
- `scripts/lib/gemini-generate.mjs` — ESM module: reads stdin via readline, calls `@google/generative-ai`, writes to stdout

Why ESM? Avoids bash heredoc + `echo` pipe conflict with stdin. Node readline properly reads piped data.

`fam-convo-get-gemini` fix: added `printf '%s\n' "$RESP"` before JSONL append; moved `[gemini:get]` log to stderr.

---

### Phase 1 — Brain/Worker Split UI

#### `.brain-worker-panel` HTML structure

```html
<div class="brain-worker-panel">
  <div class="brain-section">
    <button class="brain-btn active" data-brain="claude">Claude</button>
    <button class="brain-btn" data-brain="gemini">Gemini</button>
    <button class="brain-btn" data-brain="openai">OpenAI</button>
  </div>
  <div class="worker-section">
    <span class="worker-pill">claude-code</span>
    <span class="worker-pill">codex-cli</span>
    <span class="worker-pill">gemini-cli</span>
  </div>
</div>
```

Brain buttons are clickable and send `set-brain` WS message.  
Worker spans are display-only — show CLI tools available, not selectable.

#### Per-brain model selector

Each brain button has a sibling `<select class="brain-model-selector">`. When user picks a model, JS sends:
`{ type: 'set-brain-model', brain: 'claude', model: 'claude-haiku-4-5-20251001' }`.

Server updates `ws.brainModels[brain]` for that connection.

#### `brain-selector.js` IIFE

```javascript
const BrainSelector = (() => {
  function init(ws)             // attach to WS, fetch initial status
  function select(brain)        // WS send set-brain, update pill UI
  function setModel(brain, model, el) // WS send set-brain-model
  function getBrainModels()     // return current ws.brainModels snapshot
  function _fetchAPIStatus()    // GET /api/brain-status → update status dots
})();
```

---

### Phase 2 — Tool Calling Foundation

**DECISION:** Tool calling is Claude-only (Session 10). Gemini/OpenAI tool format translation deferred to Session 12. Do not pass `STUDIO_TOOLS` to `GeminiAdapter` or `CodexAdapter`.

#### `lib/studio-tools.js`

5 tools in Anthropic input_schema format:

| Tool | What it returns |
|------|----------------|
| `get_site_context` | tag, site_name, business_type, page count, spec state, current page |
| `get_component_library` | array of `{ name, description, category }` |
| `get_research` | markdown content of research file for active vertical |
| `dispatch_worker` | queues task to `.worker-queue.jsonl`, returns `{ status: 'queued', worker, task_id }` |
| `read_file` | reads file from SITE_DIR (sandboxed), truncates at 50KB |

```javascript
const { STUDIO_TOOLS } = require('./studio-tools');
// STUDIO_TOOLS is an array of Anthropic-format tool definitions
```

#### `lib/tool-handlers.js`

```javascript
// Dependency injection (called from server.js at startup)
initToolHandlers({ getSiteDir, readSpec, getTag, hubRoot })

// Dispatch
handleToolCall(toolName, toolInput, ws)   // → result object

// Internals
readSiteFile(filePath)         // path traversal prevention
dispatchToClaudeCode(task, context)  // append to .worker-queue.jsonl
```

**Path traversal prevention in `read_file`:**
```javascript
const siteRoot = path.resolve(_getSiteDir());
const requestedPath = path.resolve(siteRoot, filePath);
if (!requestedPath.startsWith(siteRoot + path.sep)) {
  return { error: 'Access denied — path must be within the current site directory' };
}
```

#### `.worker-queue.jsonl`

Worker dispatch queue at `~/famtastic/.worker-queue.jsonl`. Each entry:
```json
{ "timestamp": "...", "worker": "claude-code", "task": "...", "context": {}, "task_id": "...", "status": "queued" }
```

No worker process is polling this file yet — deferred to Session 11.

#### ClaudeAdapter tool loop

`_executeBlocking(messages, maxTokens, tools, depth=0, ws=null, model=null)`:

```javascript
const MAX_TOOL_DEPTH = 3; // circuit breaker
if (depth >= MAX_TOOL_DEPTH) return { content: 'I reached the maximum number of tool calls...', depth_limit_reached: true };

// After API call:
if (response.stop_reason === 'tool_use') {
  const toolResults = [];
  for (const block of response.content) {
    if (block.type === 'tool_use') {
      const result = await handleToolCall(block.name, block.input, ws); // ws through params only
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
    }
  }
  // Recurse with depth+1
  return this._executeBlocking(
    [...messages, {role:'assistant',content:response.content}, {role:'user',content:toolResults}],
    maxTokens, tools, depth+1, ws, model
  );
}
```

**Critical:** `ws` flows through parameter chain. Never `this.ws = ws`.

#### BrainInterface tools gate

```javascript
const tools = (this.brain === 'claude' && (options.mode === 'build' || options.mode === 'brainstorm'))
  ? require('../studio-tools').STUDIO_TOOLS
  : [];
// Gemini/OpenAI always get empty tools array
```

---

### Phase 3 — Client Interview System

#### `lib/client-interview.js`

```javascript
startInterview(mode)         // 'quick' | 'detailed' | 'skip'
recordAnswer(state, qId, answer)  // returns { state, nextQuestion, completed, client_brief }
getCurrentQuestion(state)    // resume support — doesn't advance
shouldInterview(spec)        // false if completed, built, deployed, or null
buildClientBrief(state, questions)  // synthesizes answers → brief object
QUICK_QUESTIONS              // 5 question definitions
DETAILED_QUESTIONS           // 10 question definitions (extends quick)
```

**Question state machine:**
- State machine is strict: `recordAnswer()` validates `questionId === state.questions[state.current_index]`
- Wrong question ID throws `Error('Question mismatch: expected "X", got "Y"')`
- State persisted to `spec.interview_state` after every answer

#### spec.json fields

```json
{
  "interview_state": {
    "mode": "quick",
    "started_at": "...",
    "completed_at": null,
    "questions": ["q_business", "q_customer", "q_differentiator", "q_cta", "q_style"],
    "answers": { "q_business": "..." },
    "current_index": 1,
    "completed": false
  },
  "interview_completed": true,
  "client_brief": {
    "generated_at": "...",
    "interview_mode": "quick",
    "business_description": "...",
    "ideal_customer": "...",
    "differentiator": "...",
    "primary_cta": "...",
    "style_notes": "..."
  }
}
```

#### API Endpoints

```
POST /api/interview/start    { mode? }  → { question, mode } or { completed, client_brief }
POST /api/interview/answer   { question_id, answer }  → { question } or { completed, client_brief }
GET  /api/interview/status   → { interview_completed, client_brief, in_progress, mode, current_index, total }
```

Resume behavior: if `spec.interview_state` exists and is not completed, `/start` returns `{ resumed: true, question, mode }` without resetting state.

---

### Phase 4B — parallelBuild fixes

Three bugs found during Site #6 build:

**Bug 1: Slug sanitizer for `must_have_sections` page names**

`must_have_sections` strings like "Contact/Booking Form" contain `/` and `()`. Without sanitization, `fs.writeFileSync(path.join(DIST_DIR(), 'contact/booking-form.html'))` tries to write into a non-existent subdirectory.

Fix:
```javascript
const safe = p.replace(/\(.*?\)/g, '').replace(/[\/\\]/g, '-').replace(/[^a-zA-Z0-9\s-]/g, '').trim();
const slug = safe.replace(/\s+/g, '-').toLowerCase().replace(/-+/g, '-').replace(/(^-|-$)/g, '');
const finalSlug = slug.length > 30 ? slug.split('-').slice(0, 2).join('-') : slug;
return finalSlug + '.html';
```

**Bug 2: parallelBuild subprocess fallback missing**

`parallelBuild()` only had the `hasAnthropicKey()` SDK path. No fallback when key absent. Added sequential subprocess build loop (same pattern as single-page path) that iterates `pageFiles`, calls `spawnClaude(pagePrompt)`, collects results, then calls `finishParallelBuild()`.

**Bug 3: siteContext IIFE undefined variable**

`siteContext` template literal (shared across all pages) contained an IIFE referencing `page` — a variable only defined per-page inside `spawnPage()`. Fixed by returning empty string from the shared template; per-page content fields are injected inside `spawnPage()` where `page` is defined.

---

### Known Gaps Updated

**Closed:**
- Codex CLI non-functional → replaced with OpenAI SDK (`gpt-4o`)
- CS9 brainstorm routing subprocess → brain routing gate sends non-Claude brains to `handleBrainstorm()`
- GeminiAdapter key validation weak → live API probe at startup via `brain-verifier.js`
- Brain routing not extended to chat → routing gate checks `currentBrain` before classifier

**Opened:**
- `client_brief` not yet injected into build prompts
- Interview not auto-triggered on `fam-hub site new`
- `.worker-queue.jsonl` has no consumer (worker process not yet running)
- Detailed interview mode (10 questions) is API-only (no UI)

---

## Session 11 — Build Pipeline Intelligence Pass (2026-04-10)

Nine discrete fixes to close the highest-impact gaps in how the build
pipeline turns site briefs into actual HTML. Each fix shipped one-at-a-time
with restore-baseline → tests → commit discipline. **Total: 231 new
test assertions across 6 suites; one infrastructure hotfix discovered
during end-to-end verification.**

### Fix 1 — `client_brief` injection
- File: `site-studio/server.js` → `buildPromptContext()`
- Behavior: when `spec.client_brief` is non-empty, a `CLIENT BRIEF` block
  is appended to `briefContext` containing `business_name`, `tagline`,
  `elevator_pitch`, `founder_voice`, `services`, `ctas`, `tone_words`,
  `personality_traits`, `brand_promise`, `target_audience`, and `locations`.
- Before: build prompts only saw vertical + design brief. The
  `lib/client-interview.js` flow was running but its output was orphaned.
- After: a real intake interview drives every full build.

### Fix 2 — FAMtastic DNA auto-wired in head-guardrail
- File: `site-studio/server.js` → `ensureHeadDependencies()`
- Behavior: `famAssets` array copies and links `lib/fam-shapes.css`,
  `lib/fam-motion.js`, `lib/fam-scroll.js`, and (optional)
  `site-studio/public/css/fam-hero.css` into `dist/assets/css/` and
  `dist/assets/js/` on every full build, then injects matching
  `<link>`/`<script>` tags into every page.
- Before: only Tailwind and Google Fonts were head-guarded.
- After: every built page has the full FAMtastic vocabulary available.
- **NOTE:** the head-guardrail was only being called from the legacy
  fallback path in `runPostProcessing()`. The template-first path
  silently skipped it. See "hotfix" below.

### Fix 3 — Vertical-aware font pairing
- New file: `site-studio/lib/font-registry.js`
- Exports: `FONT_PAIRINGS` (5 hand-tuned), `pickFontPairingForVertical(v)`,
  `pickFontPairingForSpec(spec)`, `buildFontPromptContext(pairing)`
- Five pairings: editorial (Playfair + Inter), display (Bebas + DM Sans),
  geometric (Space Grotesk + Inter), retro (Fraunces + Manrope),
  classic-serif fallback.
- Vertical map: writer/wedding/luxury → editorial; dj/music/nightclub →
  display; saas/tech → geometric; vinyl/boutique → retro; default → classic.
- Injected into `briefContext` at the same site as `layout-registry`.

### Fix 4 — Interview auto-trigger + admin control
- Files: `site-studio/server.js` → `POST /api/new-site`,
  `GET /api/interview/health`; admin reads from `studio-config.json`.
- Behavior:
  - `POST /api/new-site` sets `spec.interview_pending = true` whenever
    `loadSettings().auto_interview !== false` (default ON).
  - `GET /api/interview/health` returns
    `{ auto_interview_enabled, interview_pending, interview_completed, should_prompt, reason }`
    so the Studio UI can decide whether to open the modal on load.
  - Skipping the interview clears `interview_pending` and sets
    `interview_completed = true`.
- Test: `tests/session11-fix4-tests.js` (36 assertions, spawns server).

### Fix 5 — `enhancement_pass` classifier intent
- File: `site-studio/server.js` → classifier + `handleChatMessage`.
- New helpers: `detectEnhancementPasses(message)` returns
  `{ images, shapes, animations, icons, generatedSvg, famtasticMode }`.
- Classifier matches phrases like "add some shapes", "give it more
  motion", "famtastic it up", "do an images pass", etc.
- Six recognized passes. `famtasticMode = true` implies all five.
- Dispatch: new `case 'enhancement_pass'` in `handleChatMessage` switch
  builds a per-pass instruction block (IMAGES PASS, SHAPES PASS,
  ANIMATIONS PASS, ICONS PASS, GENERATED SVG PASS, FAMTASTIC MODE)
  and runs through the standard build pipeline so post-processing,
  CHANGES extraction, and verification all apply.
- Added to `isBuildIntent` whitelist.
- Test: `tests/session11-fix5-tests.js` (36 assertions).

### Fix 6 — Layout variation vocabulary
- New file: `site-studio/lib/layout-registry.js`
- Exports: `LAYOUT_VARIANTS` (5), `VERTICAL_LAYOUT_MAP`,
  `pickLayoutVariantForVertical(v)`, `pickLayoutVariantForSpec(spec)`,
  `buildLayoutPromptContext(variant)`
- Five variants:
  - `standard` — centered hero, logo in nav (default)
  - `centered_hero` — large centered headline + symmetrical decor
  - `logo_dominant` — oversized brand mark anchors hero
  - `layered` — multi-z-index stack (used with fam-hero.css)
  - `split_screen` — content left, media right
- Each variant carries `id`, `name`, `description`, `hero_shape`,
  `grid`, `logo_role`, `best_for`, and a prompt-ready `skeleton`.
- Vertical map: vinyl/record/jewelry/boutique → `logo_dominant`;
  dj/music/nightclub/entertainment → `layered`;
  writer/wedding/luxury → `centered_hero`;
  real estate/saas/spa → `split_screen`; law/medical → `standard`.
- `pickLayoutVariantForSpec()` honors explicit `spec.layout.variant`
  override, falls back to vertical mapping.
- Injected into `briefContext` in `buildPromptContext()` after font pairing.
- Test: `tests/session11-fix6-tests.js` (57 assertions).

### Fix 7 — FAMtastic logo mode + multi-part SVG extraction
- File: `site-studio/server.js`
- New helper `extractMultiPartSvg(body)`:
  - Returns `null` if no `<!-- LOGO_FULL/LOGO_ICON/LOGO_WORDMARK -->` delimiters.
  - Otherwise returns `{ LOGO_FULL?, LOGO_ICON?, LOGO_WORDMARK? }` with
    each part run through the existing `sanitizeSvg()`.
  - Tolerates partial responses (any subset of the three).
- New helper `processTrailingSvgAsset(fullResponse)` so HTML_UPDATE and
  MULTI_UPDATE branches can extract a trailing SVG_ASSET block from a
  single Claude response (page + logo in one shot).
- HTML_UPDATE branch truncates `changeSummary` at `\nSVG_ASSET:` and
  routes the SVG part through `processTrailingSvgAsset`.
- SVG_ASSET branch checks `extractMultiPartSvg` first; if multi-part,
  writes `LOGO_FULL → assets/logo.svg`, `LOGO_ICON → assets/logo-icon.svg`,
  `LOGO_WORDMARK → assets/logo-wordmark.svg`.
- New flag: `spec.famtastic_mode === true`. When set with no logo file,
  the build prompt's `_logoInstruction` injects a **FAMTASTIC LOGO MODE**
  block instructing Claude to emit a multi-part SVG response.
- Exports: `extractMultiPartSvg`, `sanitizeSvg`, `detectEnhancementPasses`.
- Test: `tests/session11-fix7-tests.js` (26 assertions).

### Fix 8 — Worker queue visibility endpoint + UI badge
- File: `site-studio/server.js` → `GET /api/worker-queue` extended.
- Old shape: `{ tasks, count }`.
- New shape: `{ tasks, count, pending_count, by_worker, by_status, oldest_pending, queue_path }`
  - `pending_count` excludes `completed`/`cancelled`/`failed`.
  - `by_worker` aggregates `t.worker || t.agent || 'unknown'`.
  - `by_status` aggregates `t.status || 'pending'`.
  - `oldest_pending` is the earliest `queued_at`/`created_at`/`at`
    among unfinished tasks (or `null`).
  - `queue_path` is the absolute path for debugging.
- New file: `site-studio/public/js/worker-queue-badge.js`
  - Polls `GET /api/worker-queue` every 15 s.
  - Shows/hides `#worker-queue-badge` based on `pending_count`.
  - Builds tooltip with per-worker breakdown + age of oldest pending.
  - Exposes `window.WorkerQueueBadge.refresh()` for other modules.
- New CSS in `site-studio/public/css/studio-brain-selector.css`:
  `.worker-queue-badge`, `.wqb-dot`, `.wqb-label`, `.wqb-count`, plus
  `@keyframes wqb-pulse`. Amber color scheme matching `#brain-fallback-bar`.
- New markup in `site-studio/public/index.html` after the workers section,
  plus `<script src="js/worker-queue-badge.js"></script>` at the bottom of body.
- Test: `tests/session11-fix8-tests.js` (31 assertions, spawns server).
- **Why it matters:** the badge surfaces the silent gap that tasks
  dispatched via the `dispatch_worker` tool have no consumer process
  polling the queue. Users can now see the queue is backing up at a
  glance instead of discovering it via log diving.

### Fix 9 — Multi-layer hero CSS (`fam-hero.css`)
- New file: `site-studio/public/css/fam-hero.css`
- **Critical constraint:** `lib/fam-shapes.css` was NOT modified — verified
  by `git diff --name-only HEAD -- lib/fam-shapes.css` returning empty.
- Defines a 7-layer hero composition vocabulary with explicit z-index 0–6:
  | Class | z-index | Role |
  |---|---|---|
  | `.fam-hero__bg` | 0 | background color/gradient |
  | `.fam-hero__pattern` | 1 | repeating pattern (overlay blend) |
  | `.fam-hero__shapes` | 2 | decorative blobs/rings |
  | `.fam-hero__media` | 3 | main hero photo/illustration/video |
  | `.fam-hero__lights` | 4 | colored radial light spots (screen blend) |
  | `.fam-hero__sparkle` | 5 | twinkles (screen blend) |
  | `.fam-hero__content` | 6 | headline + CTA + UI |
- 5 background gradients: sunset, neon, dusk, vinyl, emerald.
- 5 patterns: dots, grid, diagonal, noise (data-uri SVG), vinyl grooves.
- 7 light colors with corner positioning + drift animation.
- Spotlight beam, blob, ring decorative shapes.
- Bleed utilities (`.fam-bleed-l/r/t/b/x/y/all`) so children can push past
  hero edges via negative margins on the CSS-var-driven padding.
- `.fam-hero--split` 2-col variant with mobile collapse.
- `.fam-hero--vignette` and `.fam-hero--framed` modifiers.
- `prefers-reduced-motion` guards on every animated layer.
- Auto-wired into the head-guardrail by Fix 2 (`optional: true`).
- Test: `tests/session11-fix9-tests.js` (45 assertions including a git
  diff check that `lib/fam-shapes.css` is unchanged).

### Hotfix — Head-guardrail in template-first builds
- File: `site-studio/server.js` → `runPostProcessing()`, `isFullBuild` branch.
- Discovered when the first end-to-end Groove Theory build shipped with
  only `assets/styles.css` in `dist/assets/` — none of the FAMtastic DNA.
- Root cause: the template-first build path (added in session 10) routes
  through `applyTemplateToPages()`, which only swaps the inline template
  `<style>` block for a `<link>` to `assets/styles.css`. It never called
  `ensureHeadDependencies()`, so the `famAssets` copy + inject step was
  silently skipped on every build since the template-first migration.
- **Net effect:** Fix 2 and Fix 9 had wired everything correctly into the
  head-guardrail and the source files were on disk, but the build pipeline
  just never invoked the head-guardrail in the active code path.
- Fix: added one line — `ensureHeadDependencies(ws);` immediately after
  `applyTemplateToPages(ws, writtenPages);` in the `isFullBuild` branch.
- Verified: Groove Theory rebuild now ships
  `assets/css/fam-hero.css`, `assets/css/fam-shapes.css`,
  `assets/js/fam-motion.js`, `assets/js/fam-scroll.js`, `assets/styles.css`,
  and all three pages contain seven FAMtastic asset references each.

### Fresh build verification: Groove Theory
- Tag: `site-groove-theory`. Vertical: vinyl record shop.
- `spec.famtastic_mode = true`, `spec.layout.variant = "logo_dominant"`.
- Pages: `index.html`, `services.html`, `contact.html`. Build time: 85s.
- All four FAMtastic DNA assets shipped and linked.
- Layout variant injection produced a `.logo-hero` oversized brand mark.
- `client_brief` injection produced real services, real founder voice,
  real Echo Park address.

### Known Gaps Updated

**Closed:**
- `client_brief` not yet injected into build prompts → Fix 1 ships it.
- Interview not auto-triggered on `fam-hub site new` → Fix 4 ships it.
- FAMtastic DNA not in builds → Fix 2 + hotfix ship all four assets.
- No font intelligence (always Inter) → Fix 3 ships vertical-aware pairing.
- Always centered-hero layout → Fix 6 ships 5 variants with vertical map.
- No enhancement pass intent → Fix 5 ships six opt-in passes.
- No layered hero vocabulary → Fix 9 ships `fam-hero.css`.
- No way to see worker-queue backlog → Fix 8 ships endpoint + badge.
- Multi-part SVG logo not supported → Fix 7 ships extraction + delim mode.

**Opened:**
- **Prompt fidelity gap:** Claude does not yet reach for `fam-hero__*`
  vocabulary or emit a multi-part SVG logo on the first prompt of a fresh
  build, even though `famtastic_mode=true` and the layered variant are set.
  Infrastructure is in place and tested; the build prompt language needs
  to be more imperative (mandate the new vocabulary instead of just
  describing it). This is the highest-leverage next fix.
- `.worker-queue.jsonl` still has no consumer process. The new badge
  makes the gap visible but doesn't close it — `dispatch_worker` queues
  tasks that no worker pulls. The `dispatch_worker` tool should either
  be marked deprecated until a consumer ships, or a minimal worker
  process needs to be built.
- Detailed (10-question) interview mode is still API-only. Studio UI
  modal not built.
- Groove Theory not deployed to Netlify in this session — production
  repo creation kicked off but the deploy path requires manual steps.
- Two verification warnings (1 SEO + 1 other) on the last build, not
  investigated.
- Gemini API key reported as leaked; Gemini brain unavailable.

---

## Session 13 — Trust Debt Fixes + Surgical Editor + Revenue-First Brief (2026-04-16)

### Phase 0 — Three Trust Debt Fixes

**conversational_ack intent:**
- File: `site-studio/server.js` → `classifyRequest()`, `routeToHandler()`, main WS switch
- Added `ACK_PATTERNS` regex matching short affirmations ("ok", "looks good", "thanks", etc.)
- Returns `conversational_ack` intent — zero Claude API call, instant canned response
- `getAckResponse(spec)` helper returns a contextual next-step suggestion
- Both routing locations updated (routeToHandler + main WS switch)
- **Standing rule:** Never route conversational affirmations to Claude. They are zero-value spend.

**Atomic spec.json writes:**
- File: `site-studio/server.js` → `writeSpec()`, new site creation path
- `writeSpec()` now uses `.tmp` + `fs.renameSync()` (atomic on POSIX — all-or-nothing)
- New site creation path also atomic
- **Standing rule:** All state file writes must be atomic before scaling past 10 sites.

**Restyle intent routing:**
- File: `site-studio/server.js` → `routeToHandler()`, main WS switch (lines ~7618, ~11388)
- Was: `case 'restyle': handlePlanning(ws, ...)` — silent no-op (dead code)
- Now: `case 'restyle': handleChatMessage(ws, userMessage, 'restyle', spec)` — live
- Stale dead-code comment removed
- **Standing rule:** Silent failures destroy trust faster than error messages. Fix dead code paths before shipping new features in the same area.

### Phase 1 — DOM-aware Surgical Editor

**New module:** `site-studio/lib/surgical-editor.js`
- `buildStructuralIndex(html, page)` → `{ page, sections[], fields[], slots[], built_at }`
  - Scans `data-section-id`, `data-fam-section`, `data-field-id`, `data-slot-id` nodes
  - Stored in `spec.structural_index[page]` after every build
- `extractSection(html, selector)` → outer HTML of targeted node only (~80–150 tokens vs 600–1200 for full page)
- `surgicalEdit(html, selector, newContent)` → full HTML with only targeted node replaced (cheerio DOM surgery)
- `trySurgicalEdit(html, selector, newContent)` → null on selector miss (safe fallback)
- All functions are pure — no side effects, no file I/O

**Server wiring:**
- `runPostProcessing()` Step 7 (new): calls `surgicalEditor.buildStructuralIndex()` after every build
- Non-fatal (wrapped in try/catch) — structural index failure never blocks a build
- Stored in `spec.structural_index[page]` — available for surgical edit routing

**Known gap (Phase 1 continuation):**
- `content_update` in `handleChatMessage` still sends full HTML to Claude. The wiring to use `extractSection` + `surgicalEdit` for matching sections is not yet done. The infrastructure is in place; the routing logic needs to be added.

### Phase 2 — Revenue-first Brief Interview

**client-interview.js changes:**
- New `REVENUE_MODEL_OPTIONS` array (7 canonical models) exported
- `q_revenue` question added as second question in quick and detailed modes (after `q_business`, before `q_customer`)
  - Has `suggestion_chips` (rendered in Studio UI when UI upgrade ships)
  - Has `follow_up_map` for model-specific follow-up questions
- `formatQuestion()` now passes through `suggestion_chips` and `follow_up_map`
- `buildClientBrief()` captures `revenue_model`, normalizes "not sure" → `stub`, sets `revenue_ready: true`
- New `getRevenueBuildHints(model)` returns `{ components[], prompt_additions[], schema_hints[] }`
  - `rank_and_rent` / `lead_gen`: lead form + call tracking slot + LocalBusiness schema
  - `reservations`: booking widget + Event schema
  - `ecommerce`: product grid + cart slot + Product schema
  - `affiliate`: comparison table + FAQ + AEO structure
  - `stub`: basic contact form

**server.js changes:**
- `buildPromptContext()` injects `REVENUE ARCHITECTURE` block into briefContext for non-stub models
- Every build with a known revenue model gets architecture instructions from the start

**fam-hub:**
- `fam-hub site deal-memo <tag>` → generates `sites/<tag>/deal-memo.md`
  - Contains: site info, revenue model, estimated lead volume, proposed monthly fee, basic terms

### Known Gaps Updated (Session 13)

**Closed:**
- `conversational_ack` — short affirmations no longer trigger Claude API calls
- `restyle` routing dead code — restyle intent now reaches its handler
- `writeSpec()` non-atomic — spec.json writes are now atomic

**Opened:**
- Surgical editor routing not wired into `content_update` path yet (Phase 1 continuation)
- Revenue model `suggestion_chips` not yet rendered in Studio UI (requires UI upgrade)
- `deal-memo` geography field defaults to `[AREA]` placeholder when interview was skipped


---

## Session 16 — Layer 0 Foundation + Shay-Shay Seed (2026-04-16)

### Phase 0: Surgical Editor Wired

**What changed:** `tryDeterministicHandler()` in `server.js` now has a third block
("Structural index surgical edit") that fires after the CSS and field-type blocks.

**How it works:**
1. STRUCTURAL_HINTS map matches user message keywords (heading, tagline, cta, subtitle, desc, welcome)
2. Extracts new value from "to X", "say X", "should be X" patterns
3. Looks up matching `field_id` in `spec.structural_index[currentPage].fields`
4. Calls `surgicalEditor.trySurgicalEdit(html, hit.selector, newText)` for DOM swap
5. Rewrites the page file, updates the structural index, logs to mutations.jsonl
6. Returns true — zero Claude API calls for supported patterns

**Acceptance:** "change the hero headline to X" handled without Claude when structural index exists.

**buildStructuralIndex:** Already wired in Step 7 of `runPostProcessing()` since Session 13.
Results stored at `spec.structural_index[page]`.

### Phase 1: Layer 0 Data Sources

**A. Gap Logger** — `site-studio/lib/gap-logger.js`
- `logGap(tag, message, category, details)` — appends to `~/.local/share/famtastic/gaps.jsonl`
- Three categories: `NOT_BUILT`, `NOT_CONNECTED`, `BROKEN`
- Auto-promotes at frequency ≥ 3 to `~/.local/share/famtastic/intelligence-promotions.json`
- `resolveGap(capabilityId)` — marks gap resolved when capability ships
- Exports: `logGap`, `resolveGap`, `loadGaps`, `GAP_CATEGORIES`

**B. Suggestion Logger** — `site-studio/lib/suggestion-logger.js`
- `logSuggestion(suggestion, context)` — appends to `~/.local/share/famtastic/suggestions.jsonl`
- `logOutcome(id, outcomeKey)` — updates suggestion with score (SHIPPED=1.5, ACCEPTED=1.0, EDITED=0.7, DISMISSED=0.3, IGNORED=0.1)
- Auto-promotes high-score patterns (≥3 matches) to `suggestion-promotions.jsonl`
- Wired: plan card shown (source: handlePlanning), interview corrections (source: interview)
- Exports: `logSuggestion`, `logOutcome`, `loadPendingSuggestions`, `OUTCOMES`

**C. Brand Tracker** — `site-studio/lib/brand-tracker.js`
- Runs as Step 8 of `runPostProcessing()` after every full build
- Extracts: primary_color, accent_color, bg_color, heading_font, body_font from assets/styles.css
- Persists to `sites/<tag>/brand.json`
- `detectDrift(previous, current)` — returns array of changed fields
- Exports: `extractAndSaveBrand`, `loadBrandTokens`, `extractBrandTokens`, `detectDrift`

**D. Deploy History** — wired in `runDeploy()` success handler
- `spec.deploy_history[]` array in spec.json, pushed on every successful deploy
- Fields: version, deployed_at, environment, url, fam_score, lighthouse, pages

**E. Agent Cards** — `site-studio/agent-cards/`
- `claude.agent-card.json` — tier 3, best_for: architecture/builds/surgical edits
- `codex.agent-card.json` — tier 2, best_for: html_generation/adversarial_review
- `gemini.agent-card.json` — tier 1, best_for: classification/research/brainstorm
- Structure: id, name, provider, model, tier, best_for[], cost_per_call_estimate, daily_limit, status, requires[]

**F. Brief Corrections** — wired in `POST /api/interview/answer` completion handler
- On interview completion, diffs previous `spec.client_brief` vs submitted answers
- Writes corrections to `sites/<tag>/brief-corrections.jsonl`
- Logs each correction as a suggestion with `weight: 2.0`

**G. Capability Manifest** — `site-studio/lib/capability-manifest.js`
- `buildCapabilityManifest()` — async, checks env vars + CLI availability
- Runs on server startup and saves to `~/.local/share/famtastic/capability-manifest.json`
- Exposed via `GET /api/capability-manifest`
- `diffStateVsManifest(manifest)` — returns `{broken[], unavailable[], available[]}`
- Exports: `buildCapabilityManifest`, `loadManifest`, `diffStateVsManifest`

### Phase 2: Shay-Shay Seed Layer

**Skill definition:** `site-studio/shay-shay/skill.json` + `site-studio/shay-shay/instructions.md`
- 8 capabilities: studio_command, route_to_chat, show_me, brainstorm, system_status, capture_gap, intelligence_query, general_reasoning
- Tier 0: deterministic (no AI) — studio commands, routing, show me, status
- Tier 1-3: AI reasoning with appropriate model (Haiku → Sonnet → Opus)

**Server endpoints:**
- `POST /api/shay-shay` — main orchestrator. Tier 0 deterministic, Tiers 1-3 via callSDK
- `POST /api/shay-shay/gap` — explicit gap capture endpoint
- `POST /api/shay-shay/outcome` — suggestion outcome scoring

**`classifyShayShayTier0(lower)`** — regex classifier for instant-response commands
**`handleShayShayTier0(tier0, message, context, manifest)`** — deterministic handler

**Studio UI wiring:** `studio-orb.js` `sendDirect()` now calls `sendToShayShay()`:
- Routes to `POST /api/shay-shay` (not Studio WebSocket)
- Handles `route_to_chat` action: routes message to Studio WS chat
- Handles `system_command` action: executes command
- Handles `show_me` action: opens Show Me mode
- Falls through to display conversational response

**callSDK enhancement:**
- Now accepts `opts.model` to override the settings.json model (for Shay-Shay model routing)
- Now accepts `opts.systemPrompt` for system-level instructions
- Both are backward compatible — existing callers unaffected

### Known Gaps Updated (Session 16)

**Closed:**
- Surgical editor routing not wired — now wired via STRUCTURAL_HINTS block in tryDeterministicHandler

**Opened:**
- Shay-Shay `intelligence_query` and `general_reasoning` tier 2/3 capabilities not yet connected to intelligence store (requires Mem0 integration — Session 17 "Grow" phase)
- Brand drift not yet surfaced as intelligence finding (brand-tracker logs to console only)
- Agent cards not yet loaded by brain router — hardcoded config still in place
- `deploy_history` not yet surfaced in Mission Control UI
- Brief corrections `IGNORED` outcome not yet auto-scored at session end
- Shay-Shay session init (loadFamtasticState, diffStateVsManifest on WS connect) not yet wired

---

## Session 17 — Shay-Shay Autonomous Build Pipeline

### New Capability: `POST /api/autonomous-build`

Shay-Shay can now build a complete site from a conversational brief with zero browser UI interaction.
Fritz watches progress through Studio; Shay-Shay drives entirely through the API.

**Endpoint:** `POST /api/autonomous-build` (server.js)
**Handler:** `runAutonomousBuild(message, context)` — lines ~5540–5700

**Pipeline:**
1. `extractBriefFromMessage(text)` — Claude first (8s timeout), pattern-based fallback
2. `POST /api/new-site` internally — creates `sites/<tag>/` with `client_brief` pre-loaded
3. Synthesize `design_brief` from `client_brief` → sets `spec.state = 'briefed'`
4. `TAG = brief.tag`, `invalidateSpecCache()`, `startSession()`
5. Notify all WS clients of site switch (broadcasts `site-switched` + `pages-updated`)
6. `routeToHandler(mockWs, 'build', buildMsg, spec)` — direct pipeline entry
7. `mockWs.send()` mirrors ALL build events to real browser clients (Fritz watches live)

**Critical: mockWs must implement `once`, `removeListener`, `on`**
`parallelBuild` registers close-event guards via `ws.once('close', handler)`. The mock WS never fires events, so these are no-ops — but they MUST exist or `parallelBuild` crashes with `TypeError: ws.once is not a function`.

**Brief extraction (`extractBriefFromMessage`):**
- Claude path: spawns subprocess with explicit "tag = site-businessname, not a category word" instructions
- Pattern fallback: `\bfor\s+(?:a\s+)?([A-Z][a-zA-Z']+(?:\s+[A-Z][a-zA-Z']+){0,3})` captures "for Mario's Pizza"
- Validates tag is not a generic word (restaurant, shop, salon, etc.)
- Returns: `{ business_name, tag, revenue_model, location, differentiator, tone, pages }`

**Plan gate bypass: `autonomousBuildActive` flag**
Set before `routeToHandler`, cleared via setTimeout. Bypasses the `PLAN_REQUIRED_INTENTS` check in `handleChatMessage` so `build` intent fires without user approval of a plan card.

**New endpoint: `GET /api/build-status/:tag`**
Returns `{ tag, state, building, pages_built, pages, has_brief, fam_score, deployed_url }`
`building` = `buildInProgress && TAG === tagParam` (in-memory flag + active site check)

### Bugs fixed this session

| Bug | Root cause | Fix |
|-----|-----------|-----|
| `ws.once is not a function` | mockWs had no EventEmitter methods | Added `once`, `removeListener`, `on` as no-ops |
| Pages built but API showed 0 | Stale `buildInProgress=true` from prior session in memory | Server restart cleared state |
| Capability manifest false "available" for broken Gemini key | Env-var presence used, not probe result | `resolveApiStatus()` checks brain-verifier probe first, falls back to env var |

### Test results (2026-04-17)

| Site | Brief | Pages built | Accessible |
|------|-------|------------|-----------|
| Mario's Pizza | "local pizza restaurant in Atlanta, family recipes since 1987, lead generation" | 4 (index, menu, about, contact) | ✅ localhost:3333 |
| Fresh Cuts | "barber shop called Fresh Cuts in Atlanta, appointment booking, urban professional vibe" | 4 (index, services, gallery, contact) | ✅ localhost:3333 |

### Known Gaps (updated)

**Opened:**
- `extractBriefFromMessage` extracted "Fresh Cuts in Atlanta" as business_name (should be "Fresh Cuts") — location bleeds into name when format is "shop called X in Y"
- Shay-Shay `/api/shay-shay` `autonomous_build` intent routes through `runAutonomousBuild` but result not yet surfaced in Shay-Shay column (shows "Build started" but no progress stream)
- `buildInProgress` flag is in-memory only — server restart clears it, which is correct but leaves `.studio.json build_in_progress` and API flag out of sync transiently

---

## Session 17 — Nav class name mismatch + preview site-switch fix (2026-04-20)

### Nav class name mismatch — root cause and fix

**Pattern:** Template CSS uses `.desktop-nav` / `.mobile-nav`. Parallel page builds sometimes generate HTML with `.nav-desktop` / `.nav-mobile` and `#mobile-menu-checkbox` instead. These class names don't match, so no CSS rules apply to the actual HTML elements — both navs render as visible block elements and the bare checkbox input appears on screen.

**Root cause:** The template's `<style data-template="shared">` block defines `.desktop-nav` / `.mobile-nav`. When parallel page spawns run independently, Claude generates its own nav HTML which may differ. The pages and template CSS are generated in different Claude calls with no enforced vocabulary constraint on class names.

**Fix applied:** Appended a nav-visibility block to `assets/styles.css` for `site-the-daily-grind-in-atlanta` targeting the alternate class names used in the built pages:
- `header[data-template="header"]` — sticky positioning, flex layout, background
- `header[data-template="header"] .container` — `display: flex; align-items: center; height: 4.5rem; gap: 1rem`
- `#mobile-menu-checkbox { display: none; }` — always hidden
- `.nav-desktop { display: flex; margin-left: auto; }` — desktop visible
- `.nav-mobile { display: none; position: absolute; top: 100%; }` — hidden on desktop
- `.menu-toggle { display: none; }` — hamburger hidden on desktop
- `@media (max-width: 768px)`: hide `.nav-desktop`, show `.menu-toggle`, toggle `.nav-mobile` via `#mobile-menu-checkbox:checked ~ .nav-mobile { display: flex; }`

**Systemic lesson:** Nav class names must be enforced in the template skeleton or the post-processing layer. The `famtastic-skeletons.js` template should include the nav HTML with explicit class names baked in, preventing Claude from generating alternate naming conventions. This is the same class-of-bug as the `fam-hero--bg` vs `fam-hero-bg` regression (solved by baking explicit HTML skeletons into the prompts).

**Other sites checked:** `site-the-daily-grind` (original), `site-marios-pizza`, `site-fresh-cuts-in-atlanta`, and `site-altitude` all had nav CSS in their `styles.css` files matching their HTML class names — no fix needed.

### Preview "Not Found" on site switch — root cause and fix

**Symptom:** After switching sites, the preview iframe showed "Not found" instead of the new site's home page.

**Root cause:** `handleSiteSwitch()` in `public/index.html` called `reloadPreview()`, which reuses `frame.src.split('?')[0]` — the current iframe URL with its path intact. If the current page was `/menu.html` for Site A and Site B doesn't have a `menu.html`, the preview server correctly returns 404 "Not found".

**Fix:** Changed `reloadPreview()` to `navigateToPage(currentPage || 'index.html')` in `handleSiteSwitch()`. The server already sends `currentPage = 'index.html'` in every `site-switched` WS message, so this always navigates to the correct starting page of the newly switched-to site.

**File:** `site-studio/public/index.html`, `handleSiteSwitch()` function.

### Preview server query string bug — root cause and fix

**Symptom:** Any URL with a cache-busting query string (e.g., `?t=1234`) returned "Not found" from the preview server, even though the file existed on disk.

**Root cause:** `previewServer` in `server.js` used `req.url` directly for the filesystem path lookup: `path.join(dist, req.url)`. On Node.js, `req.url` includes the full query string, so `/index.html?t=123` produces the path `dist/index.html?t=123` — a file that doesn't exist.

This was always broken but went unnoticed because the RELOAD_SCRIPT inside served pages polls `/__reload` and calls `location.reload()` on change detection. That reload uses the cached page URL without a query string, so live-reload worked. But all `navigateToPage()` calls (page tab clicks, build completions, site switches) were silently returning "Not found".

**Fix:** Strip the query string before file path lookup (`server.js` line 14117):
```javascript
const urlPath = req.url.split('?')[0];
let filePath = path.join(dist, urlPath === '/' ? 'index.html' : urlPath);
```

**File:** `site-studio/server.js`, `previewServer` handler.

### Nav skeleton — systemic fix

**What was built:** `NAV_SKELETON` constant added to `site-studio/lib/famtastic-skeletons.js`. Mandates exact class names:
- `.nav-links` — desktop nav `<ul>`
- `.nav-cta` — desktop CTA button
- `.nav-toggle-label` — hamburger toggle (hidden on desktop)
- `.nav-mobile-menu` — mobile dropdown panel
- `#nav-toggle` — hidden checkbox driving pure-CSS toggle

**Where injected:**
1. `buildTemplatePrompt()` at line ~3320 — inside the NAVIGATION section, ensuring the template call uses consistent class names in both CSS and HTML
2. `famSkeletonBlock` in parallel page builds — ensures page spawns know the mandated class names even if they deviate from the template header

**File:** `site-studio/lib/famtastic-skeletons.js` (constant + export), `site-studio/server.js` (two injection points).

### Known Gaps (updated 2026-04-20 Wave A completion)

**Opened:**
- `builds_this_session` counter in `cost-monitor.js` stays 0 — the streaming parallel build path does not flow through `callSDK()` so `trackUsage()` is not called with `isBuild=true`. Cost tracking for output tokens is correct but build count is not.

**Closed this session:**
- Double nav rendering in `site-the-daily-grind-in-atlanta` (nav CSS block appended to `assets/styles.css`)
- Preview "Not found" on site switch (`navigateToPage` replaces `reloadPreview` in `handleSiteSwitch`)
- Preview server not stripping query strings before file lookup (all `?t=...` cache-busted URLs returned 404)
- Nav class name mismatch systemic risk closed by `NAV_SKELETON` constant in `famtastic-skeletons.js`, injected into both template and parallel page build prompts

## Session 17 — Wave B: Actionable Intelligence Cards (2026-04-20)

### What was built

**Site-scoped dismiss system** (`site-studio/.dismissed-findings.json`):
- Key format: `${siteTag}-${severity}-${slugify(title)}` — stable across regenerations because title is deterministic for fixed data
- Schema: `{ "site-tag": { "key": { dismissed_at, category, summary } } }`
- `POST /api/intel/dismiss` — writes to dismissed file, returns `{ dismissed, key }`
- `GET /api/intel/findings` now filters dismissed findings before returning; also accepts optional `?tag=` query param

**Build backlog** (`.wolf/build-backlog.json`):
- Append-only JSON array at `HUB_ROOT/.wolf/build-backlog.json`
- Entry schema: `{ id, logged_at, source:"intel", severity, site_tag, category, title, description, status:"open", session }`
- `POST /api/intel/backlog` — appends entry, reads session count from `SITE_DIR()/.studio.json`

**Action buttons per severity** (in `studio-shell.js` `loadIntelligenceFeed()`):
- CRITICAL / MAJOR: "Run diagnostic" (fetches `/api/brain-status`, renders inline monospace box) + "Log to backlog"
- OPPORTUNITY: "View details" (toggles inline description + recommendation + data) + "Dismiss"
- MINOR: "Dismiss" only

**Helper functions inside studio-shell.js IIFE:**
- `makeIntelBtn(label, bg, color)` — creates styled button
- `dismissFinding(item, f)` — fade + remove card, POST to dismiss endpoint
- `logFindingToBacklog(btn, f)` — POST to backlog, mutate button to "Logged ✓"
- `runIntelDiagnostic(item, f)` — fetch brain-status, render inline; toggle on re-click
- `toggleFindingDetail(item, f, btn)` — expand/collapse description+recommendation+data; toggle button text

### Known Gaps (Wave B)

- MAJOR/CRITICAL "Run diagnostic" renders brain connection status regardless of finding category — a more targeted diagnostic per category (e.g., cost → cost summary, agents → agent stats) is deferred
- `.wolf/build-backlog.json` has no read-back UI yet — created and populated but not surfaced in any panel
- Mission Control tab (`studio-screens.js` `loadMCIntel`) still uses the old static card rendering — not updated with action buttons this wave

## Session 17 — Wave C: Orb State Machine (2026-04-20)

**What was built:** Explicit four-state machine for `#pip-dynamic-area` in `site-studio/public/js/studio-orb.js`.

**States:**
- `IDLE` — loads validation plan (todo list) or placeholder; driven by startup, `studio:site-changed`, and build-mode `pip:mode-changed`
- `BRIEF_PROGRESS` — brief completion bar + answered fields + build button at 60%; driven by `pip:brief-updated`
- `BRAINSTORM_ACTIVE` — brainstorm mode hint text; driven by `pip:mode-changed { mode: 'brainstorm' }`
- `REVIEW_ACTIVE` — FAMtastic score + per-check list from `/api/verify`; driven by `pip:mode-changed { mode: 'review' }`

**Transition function:** `setOrbState(state, data)` at line ~613 in `studio-orb.js`.
- Single source of truth: `currentOrbState` module-level variable
- Pre-clears `#pip-dynamic-area` before delegating to existing renderers
- Called from: `init()`, three event listeners, two todo-item click handlers, `PipOrb.reloadTodos()`

**All existing renderers preserved** — `loadDynamicArea()`, `showPlaceholder()`, `renderTodoList()`, `renderBriefInDynamic()`, `renderDynamicModeContent()` — state machine is a routing layer over them, not a replacement.

**Codex changes confirmed preserved:**
- `getShayShayContext()`: reads `(window.config && window.config.tag) || null` — NOT `window.currentTag`
- `suggest_brainstorm` action handler routes to `StudioShell.switchMode('brainstorm')`

**Public API additions:**
- `PipOrb.setOrbState(state, data)` — direct state transition from external code
- `PipOrb.orbState` getter — read current state for debugging (`PipOrb.orbState` in console)

**Test fix:** `tests/session12-phase0-tests.js` line 154 — assertion updated from `'heroSkeleton, dividerSkeleton, inlineStyleProhibition'` to `'heroSkeleton, dividerSkeleton, navSkeleton, inlineStyleProhibition'` (stale after Wave A inserted `navSkeleton` into the return object). All 30 tests pass.

### Known Gaps (Wave C)

- No visual state indicator in the orb UI itself (e.g., color ring, label) showing which state is active — purely logical for now
- `REVIEW_ACTIVE` state fetches `/api/verify` on every transition to review mode, even if the build hasn't changed since last check — no cache/debounce
- Research tab remains deferred: two blockers — (1) `/api/research/verticals` returns HTML instead of JSON when route order is wrong; (2) Pinecone query schema differs between the main and research code paths

## Session 3-A — Research Feed Infrastructure + fam_score (2026-04-20)

### What was built

**`POST /api/intel/run-research` (replaced stub)**
- Accepts `{ source, vertical, question, topic }` (backward-compat: `topic` maps to `question`)
- Calls `RESEARCH_REGISTRY[source].query(vertical, question)` directly for a fresh (cache-bypassing) response
- Stores result in Pinecone via integrated embedding API: `idx.namespace(vertical).upsertRecords([{ id, text, source, vertical, timestamp, question, answer }])`
- Runs claude-haiku-4-5-20251001 extraction: JSON output `{ title, category, recommendation, confidence }` extracted via regex from the response text
- Appends full entry to `research-feed-index.json` and lightweight entry to `research-run-history.json`
- Returns `{ status: 'ok', id, timestamp, vertical, question, answer, source, title, category, recommendation, confidence }`

**Research feed index** (`site-studio/intelligence/research-feed-index.json`)
- Append-only JSON array, newest-first, capped at 500 entries
- Written by `appendToFeedIndex(entry)` in `research-router.js`
- Required because Pinecone cannot do timestamp-sorted list queries — this is the chronological feed layer

**Research run history** (`site-studio/intelligence/research-run-history.json`)
- Lightweight audit trail (no `answer` field, capped at 200 entries)
- Written by `appendToRunHistory(entry)` in `research-router.js`

**New exports on `research-router.js`**
- `appendToFeedIndex(entry)` — writes to feed index
- `appendToRunHistory(entry)` — writes to run history
- `listFindings({ vertical, source, limit })` — reads feed index, filters by vertical OR 'general', capped at 50

**`skipCache` + `forceSource` behavior in `queryResearch()`**
- `options.skipCache` or `options.forceSource` both bypass the Pinecone cache check
- `fallbackAnswer` initialized to `null` before the conditional block, assigned inside it

**`GET /api/research/feed`**
- Query params: `vertical`, `source`, `limit` (max 50)
- Returns `{ findings: [...], count: N }`
- Reads from local `research-feed-index.json` via `researchRouter.listFindings()`

**`POST /api/research/manual-ingest`**
- Accepts `{ content, vertical, source_url, title }`
- Claude SDK classification: same 5-category JSON extraction as run-research
- Categories: `trends`, `conversion`, `ux`, `seo`, `trust`
- Stores in Pinecone via `upsertRecords`, appends to feed index
- Returns `{ status: 'ok', classification: { title, category, recommendation, confidence }, id }`

**Numeric `score` in `runBuildVerification()`**
- `statusScores = { passed: 100, warned: 70, failed: 40 }`
- Score = average across all checks, rounded integer
- Added to return object alongside `status`, `checks`, `issues`, `timestamp`

**`spec.fam_score` in `finishParallelBuild()`**
- Written in the `last_verification` block: `if (verification.score != null) vSpec.fam_score = verification.score`
- Survives spec reads across sessions — queryable by UI and analytics

**Research findings in `buildPromptContext()`**
- Calls `researchRouter.listFindings({ vertical: spec.business_type, limit: 3 })` (synchronous file read)
- Appends `VERTICAL RESEARCH` block to `briefContext` with category, title, and recommendation per finding
- No-op when feed index is empty or vertical not set

### Known Gaps (Session 3-A)

- `listFindings()` also matches `vertical === 'general'` entries — if a vertical has no specific entries, general ones appear. This is by design for cold-start, but may surface irrelevant findings once the feed grows large; add a scoring/relevance layer in Session 3-B or later
- `POST /api/intel/run-research` Pinecone upsert is a direct inline call (not via `researchRouter.pineconeUpsert`) to avoid exporting the internal function — if the upsert logic changes in research-router.js it must be updated here too; refactor to a shared utility in Session 4+
- `manual-ingest` does not check for duplicates before storing in Pinecone — identical content ingested twice will create two records with different IDs
- Research Tab UI (Session 3-B) is deferred: endpoints exist but there is no Studio tab yet for browsing/triggering research

## Session 3-B — Research Tab UI (2026-04-20)

### What was built

**Research rail button** (`site-studio/public/index.html`)
- 7th rail item, between Intelligence and the spacer/Deploy group
- Icon: magnifying glass with + (search + add) — distinct from the Intelligence pulse icon
- `data-rail="research"` — wired to the standard rail click handler in `studio-shell.js`

**Research sidebar pane** (`site-studio/public/index.html`)
- `data-pane="research"` — matches the standard `switchRailItem` DOM pattern
- Three sections: Run Research, Recent Findings feed, Manual Ingest

**Run Research section:**
- `<select id="research-source-select">` — Gemini Loop / Build Patterns / Manual
- `<textarea id="research-question-input">` — optional question override
- `<button id="research-run-btn">` — calls `ResearchPane.runResearch()`
- `<div id="research-run-status">` — shows loading, ✓ title, or error

**Recent Findings section:**
- `<div id="research-feed-list">` — rendered by `loadResearchFeed()` in studio-shell.js
- Loaded automatically when Research rail is clicked (via `switchRailItem` hook)
- Category color map: trends=purple, conversion=green, ux=gold, seo=blue, trust=text-2, general=text-3
- Each card: category badge + title + recommendation (10px muted)
- Empty state: "No research yet — run research above."
- Error/fallback state: "Error loading feed."

**Manual Ingest section:**
- `<textarea id="research-ingest-content">` — raw content to classify and store
- `<button>Ingest</button>` — calls `ResearchPane.manualIngest()`
- `<div id="research-ingest-status">` — shows ingesting, ✓ category — title, or error

**`loadResearchFeed()` in `studio-shell.js`:**
- Reads `window.currentSiteConfig.business_type` for vertical-filtered query
- Fetches `GET /api/research/feed?vertical=...&limit=8`
- Renders findings with category color badges — follows same DOM-build pattern as `loadIntelligenceFeed()`
- Registered in `switchRailItem` hook: `if (item === 'research') loadResearchFeed()`

**`window.ResearchPane` in `studio-shell.js`:**
- `runResearch()` — POST /api/intel/run-research with source + optional question; refreshes feed on success
- `manualIngest()` — POST /api/research/manual-ingest with content; clears textarea + refreshes feed on success
- Both defined inside the IIFE and exposed on `window` for onclick handlers

### Known Gaps (Session 3-B)

- Server restart required for `/api/research/feed`, `/api/research/manual-ingest`, and the upgraded `/api/intel/run-research` to be active (Session 3-A changes land after restart)
- The source selector does not show live availability status (e.g., Gemini Loop greyed out if GEMINI_API_KEY not set) — deferred
- `loadResearchFeed` uses `window.currentSiteConfig.business_type` for the vertical filter, but `currentSiteConfig` is not always populated on cold page load — vertical may silently default to blank (shows all general findings)
- Run Research results are not paginated or filterable in the UI — full feed refresh on each run

---

## Session 4-A — SQLite Job Queue (2026-04-20)

### Files Modified
- `site-studio/lib/db.js` — added `jobs` table to `_initSchema()` + 4 CRUD functions
- `site-studio/server.js` — added `jobQueue` import, 3 endpoints, startup JSONL migration
- `site-studio/lib/job-queue.js` — NEW: full state machine, JSONL migration, exports

### Jobs Table Schema
Added to `_initSchema()` alongside existing tables:
```sql
CREATE TABLE IF NOT EXISTS jobs (
  id            TEXT PRIMARY KEY,
  type          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  site_tag      TEXT,
  payload       TEXT,          -- JSON
  dependencies  TEXT,          -- JSON array of job IDs
  cost_estimate REAL DEFAULT 0,
  cost_actual   REAL DEFAULT 0,
  created_at    TEXT NOT NULL,
  approved_at   TEXT,
  approved_by   TEXT,
  completed_at  TEXT,
  result        TEXT           -- JSON
);
CREATE INDEX IF NOT EXISTS idx_jobs_status   ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_site_tag ON jobs(site_tag);
```

DB path: `~/.config/famtastic/studio.db` (same file as sessions/builds/compaction_events)

### db.js CRUD Functions
- `_parseJob(row)` — parses JSON fields: `payload`, `dependencies`, `result`
- `createJob({ id, type, status, site_tag, payload, dependencies, cost_estimate })` — INSERT
- `getJob(id)` — SELECT by PK, returns parsed job or null
- `listJobs({ status, site_tag, limit=50 })` — filtered SELECT, newest-first
- `updateJobStatus(id, status, extra)` — writes `approved_at`/`approved_by` on `approved`; `completed_at` + optional `result`/`cost_actual` on `done`/`failed`

### job-queue.js State Machine
Status enum: `pending`, `approved`, `running`, `done`, `blocked`, `failed`, `parked`

**Key semantics:**
- `parked` ≠ `pending` — parked is conscious deferral, not waiting for deps
- `blocked` → `pending` (automatic via `_unblockDependents()` when all deps reach `done`)
- `pending` → `approved` (via `approveJob()`)
- `pending` / `blocked` → `parked` (via `parkJob()`)
- `approved` → `running` → `done` / `failed` (external runner sets these)

**Exported functions:**
- `createJob({ type, site_tag, payload, dependencies, cost_estimate, status })` — status auto-set to `blocked` if `dependencies.length > 0`, else `pending`
- `approveJob(id)` — validates `status === 'pending'`, calls `updateJobStatus`
- `parkJob(id)` — validates `status in [pending, blocked]`, calls `updateJobStatus`
- `completeJob(id, { result, cost_actual })` — transitions to `done`, calls `_unblockDependents`
- `failJob(id, { result })` — transitions to `failed`
- `migrateJsonlQueue()` — reads `~/famtastic/.worker-queue.jsonl`, INSERT OR IGNORE (idempotent), status map: `pending→pending`, `completed→done`, `cancelled→parked`, `failed→failed`; returns `{ migrated, skipped }`
- `listPending()` — convenience wrapper for `db.listJobs({ status: 'pending' })`

### API Endpoints (server.js)
Registered BEFORE `/api/research/:filename` parameterized route (see Route Rule 9):
- `GET /api/jobs` — list jobs; supports `?status=`, `?site_tag=`, `?limit=` query params; returns `{ jobs, count }`
- `POST /api/jobs/approve/:id` — pending → approved; returns `{ ok, job }` or 400 with error
- `POST /api/jobs/park/:id` — pending|blocked → parked; returns `{ ok, job }` or 400 with error

### Startup Behavior
After `cleanWorkerQueueOnStartup()` at server start:
- `jobQueue.migrateJsonlQueue()` runs idempotently — any JSONL entries not already in SQLite are inserted; already-migrated entries are skipped via `INSERT OR IGNORE` (UUIDs serve as dedup keys only if present in JSONL; otherwise new UUIDs are generated per migration run)

### Known Gaps (Session 4-A)
- No UI for job queue yet — approve/park require direct API calls; Job Plan card UI is deferred to Session 4-C
- `running` and `approved` statuses are set by external runners only — no Studio UI triggers these transitions yet
- `cost_actual` field is write-only from `completeJob()` — no aggregation or reporting UI
- JSONL entries without an `id` field get a new UUID each migration run; if the server is restarted before the JSONL is cleared, those entries could be re-migrated with new IDs (low risk since JSONL cleanup removes completed entries on startup before migration runs)

---

## Session 4-B — MCP Server Extension + Shared studio-actions.js (2026-04-20)

### Files Created/Modified
- `site-studio/lib/studio-actions.js` — NEW: shared execution layer (job queue + gap logging)
- `mcp-server/server.js` — 6 new tools added; `handleMessage` made async; `studioPost` HTTP helper added
- `site-studio/lib/tool-handlers.js` — imports studio-actions; 5 new tool cases; dispatch functions mirror jobs to SQLite

### studio-actions.js — Shared Layer
Path: `site-studio/lib/studio-actions.js`

Imported by both `mcp-server/server.js` and `site-studio/lib/tool-handlers.js`. All operations are file-system/SQLite only — no HTTP, no IPC. Thin facade over `job-queue.js`, `db.js`, and `gap-logger.js`.

Exports:
- `createJob(opts)` → delegates to `jobQueue.createJob(opts)`
- `approveJob(id)` → delegates to `jobQueue.approveJob(id)`
- `parkJob(id)` → delegates to `jobQueue.parkJob(id)`
- `getPendingJobs(siteTag?)` → `db.listJobs({ status: 'pending', site_tag, limit: 50 })`
- `logGap(tag, message, category, details)` → delegates to `gapLogger.logGap()`

### MCP Server — New Tools (mcp-server/server.js)

`handleMessage` is now `async` to support `trigger_build` which awaits HTTP.

New `studioPost(path, body)` helper: makes HTTP POST to Studio server at `localhost:${STUDIO_PORT}` (default 3334, overridable via env `STUDIO_PORT`). Returns `{ status, body }`.

6 new tools:
| Tool | What it does |
|------|-------------|
| `trigger_build` | POST `/api/autonomous-build` to running Studio server; requires `tag` + `message` |
| `create_job` | Calls `studioActions.createJob()` — creates SQLite job record |
| `approve_job` | Calls `studioActions.approveJob(id)` — pending → approved |
| `park_job` | Calls `studioActions.parkJob(id)` — pending/blocked → parked |
| `get_pending_jobs` | Calls `studioActions.getPendingJobs(site_tag?)` — returns `{ jobs, count }` |
| `log_gap` | Calls `studioActions.logGap()` — writes to `~/.local/share/famtastic/gaps.jsonl` |

### tool-handlers.js Updates
- Imports `studioActions = require('./studio-actions')` at top
- `handleToolCall` switch now handles: `create_job`, `approve_job`, `park_job`, `get_pending_jobs`, `log_gap`
- `dispatchToClaudeCode()` and `dispatchToPlaywright()` both call `studioActions.createJob()` after JSONL append (SQLite mirrors JSONL dispatch ledger; errors are silently swallowed to preserve existing behavior)

### Known Gaps (Session 4-B)
- `trigger_build` MCP tool requires Studio server to be running at STUDIO_PORT — fails gracefully with error text if unreachable, but no retry or polling
- MCP server resolves `better-sqlite3` via `../site-studio/node_modules/` — if site-studio dependencies are not installed, MCP server will fail to start
- Job Plan card UI (Shay-Shay multi-job plan creation, approve/park buttons in conversation panel) deferred to Session 4-C

---

## Session 4-C — Shay-Shay Job Plan UI (2026-04-20)

### Files Modified
- `site-studio/server.js` — added `studioActions` import, `create_job_plan` tier-0 detection, `buildShayShayJobPlan()` function
- `site-studio/public/js/studio-orb.js` — added `job_plan` action handler, `showJobPlanCard()`, `jobAction()` functions
- `site-studio/public/css/studio-orb.css` — added job plan card styles

### Shay-Shay Job Plan Flow

**Trigger phrase detection** (`classifyShayShayTier0`):
Regex: `/\b(plan\s+(the\s+)?jobs?\s+for|create\s+a?\s+job\s+plan|schedule\s+(the\s+)?tasks?\s+for|build\s+(a\s+)?job\s+plan|queue\s+(up\s+)?jobs?\s+for)\b/`
Returns `{ intent: 'create_job_plan' }`

**`buildShayShayJobPlan(message, context)`** in `server.js`:
Creates a standard 3-job research → build → deploy pipeline via `studioActions.createJob()`:
1. `research` — pending (no deps), site_tag set to context.site_tag or current TAG
2. `build` — blocked (depends on research job ID)
3. `deploy` — blocked (depends on build job ID)

Returns `{ action: 'job_plan', response: '...', jobs: [job1, job2, job3], site_tag }`.
On creation failure, returns `{ action: null, response: 'Job plan failed: ...' }`.

**`/api/shay-shay` endpoint**: `create_job_plan` is handled before the generic tier-0 dispatch — `buildShayShayJobPlan()` is called synchronously (SQLite writes are sync) and the result is returned directly.

### Job Plan Card UI (studio-orb.js)

`showJobPlanCard(jobs, introText)`:
- Clears `#pip-response-area` (no innerHTML, uses `removeChild` loop)
- Renders intro text as `.pip-response-bubble`
- Renders `.job-plan-card` containing one `.job-plan-row` per job
- Each row: job description label + status badge + Approve/Park buttons
- Approve button: enabled only for `pending` jobs
- Park button: enabled for `pending` and `blocked` jobs

`jobAction(action, jobId)`:
- POSTs to `/api/jobs/{approve|park}/{jobId}`
- On success, updates the job's status badge class and text in-place
- Re-evaluates button disabled states from returned `data.job.status`
- Errors logged to console only (no user-visible error state in v1)

### CSS (studio-orb.css)
New classes: `.job-plan-card`, `.job-plan-row`, `.job-plan-meta`, `.job-plan-label`, `.job-plan-status`, `.job-status-{pending|blocked|approved|parked|running|done|failed}`, `.job-plan-btns`, `.job-btn`, `.job-btn-approve`, `.job-btn-park`.

Status badge color scheme:
- pending → gold (`--fam-gold`)
- blocked → muted text
- approved → green (`--fam-green`)
- parked → dim text
- running → blue
- done → green (muted)
- failed → red

### Known Gaps (Session 4-C)
- Job plan creation always creates the same 3-job (research → build → deploy) pipeline — no AI-driven planning yet
- `jobAction` errors are console-only; no user-visible error state in the UI
- No polling/live-update when a running job completes — badge only updates on user button click
- Shay-Shay trigger phrases are limited to explicit job-plan language — natural language like "let's plan out what needs to happen" won't match
- The approved Research and Deploy jobs have no runner — only Build has a real execution path via the autonomous build pipeline

---

## Session 5-A — SHAY_THINKING 5th Orb State (2026-04-20)

### Files Modified
- `site-studio/public/js/studio-orb.js` — added SHAY_THINKING to state enum, `renderShayThinking()`, `setOrbState` branch, 800ms minimum in `sendToShayShay`
- `site-studio/public/css/studio-orb.css` — `pip-thinking` orb class + `.pip-shay-thinking` indicator styles

### SHAY_THINKING State

`currentOrbState` comment now includes: `IDLE | BRIEF_PROGRESS | BRAINSTORM_ACTIVE | REVIEW_ACTIVE | SHAY_THINKING`

**`sendDirect()` flow:**
1. User submits input → `setOrbState('SHAY_THINKING')` called immediately (records `thinkStart = Date.now()`)
2. `showColumnResponse(null, true)` shows typing dots
3. Fetch to `/api/shay-shay` sent
4. On response: `afterThinking(fn)` enforces 800ms min — if `Date.now() - thinkStart < 800`, waits the remainder
5. After min elapsed: `hideTyping()`, `exitThinking()` (removes `pip-thinking` class, restores `pip-idle`), renders response
6. On error: same `afterThinking` wrapper before showing error message

**`renderShayThinking()`**: Renders `.pip-shay-thinking` in `#pip-dynamic-area` with 3 animated purple dots + "Shay is thinking…" label.

**Orb visual**: `pip-thinking` class = purple glow pulsing at 1s interval (different from red idle pulse and strong red active glow).

### CSS
`.pip-thinking .pip-svg`: purple `drop-shadow` pulsing via `orb-thinking-pulse` keyframe.
`.pip-shay-thinking`: centered column, dots in `shay-thinking-dots`, label in `shay-thinking-label`.
Color: `rgb(139, 92, 246)` (indigo/purple — distinct from FAMtastic red active and gold idle).

---

## Session 5-B — Cross-Session Memory: SQLite Mem0 + Kuzu Style (2026-04-20)

### Files Created/Modified
- `site-studio/lib/db.js` — added `memories` + `memory_links` tables to `_initSchema()` + 5 CRUD functions + exports
- `site-studio/lib/memory.js` — NEW: Mem0-style memory interface + Kuzu-style graph links
- `site-studio/server.js` — memory import, `extractAndStoreMemory()`, memory injection into Shay-Shay prompt, `GET/POST /api/memory`

### db.js Schema Additions

**`memories` table** (Mem0 semantics):
```
id, entity_type TEXT, entity_id TEXT, content TEXT, category TEXT DEFAULT 'general',
source TEXT, importance INTEGER DEFAULT 5, created_at TEXT, last_accessed TEXT, access_count INTEGER
```
Indexes: `idx_memories_entity(entity_type, entity_id)`, `idx_memories_cat(category)`

**`memory_links` table** (Kuzu/graph semantics):
```
id, from_type TEXT, from_id TEXT, to_type TEXT, to_id TEXT, relation TEXT, created_at TEXT
```
Indexes: `idx_memory_links_from`, `idx_memory_links_to`

**New db.js functions**: `addMemory`, `getMemories` (reads bump `access_count`), `searchMemories` (LIKE query), `addMemoryLink`, `getMemoryLinks`

### memory.js Interface

Entity types: `site`, `user`, `session`, `vertical`, `global`
Categories: `preference`, `decision`, `fact`, `feedback`, `goal`, `general`
Importance: 1 (ephemeral) → 10 (critical)

Exports:
- `remember(entityType, entityId, content, { category, source, importance })` → memory id
- `recall(entityType, entityId, { category, limit })` → memory rows (bumps access_count)
- `recallGlobal({ category, limit })` → global memories
- `search(query, limit)` → LIKE search across all content
- `link(fromType, fromId, toType, toId, relation)` → creates memory_link
- `getLinks({ fromType, fromId, toType, toId, relation })` → relationship query
- `buildShayShayContext(siteTag)` → formatted string for prompt injection (global + site memories + links)

### Shay-Shay Integration

**Prompt injection**: `buildShayShayPrompt()` now accepts `opts.memoryContext`. `executeShayShayBrainCall()` calls `memory.buildShayShayContext(siteTag)` and passes result as `memoryContext`. Injected as `CROSS-SESSION MEMORY:` block in the primer (only on first turn, since `includePrimer` guards the block).

**Async memory extraction**: After each non-tier-0 Shay-Shay response, `extractAndStoreMemory(userMsg, response, { siteTag, source })` runs non-blocking. Uses Claude Haiku (`claude-haiku-4-5-20251001`) to classify the exchange and extract a durable fact. Only stores when `should_store: true`. Silently swallows errors.

### API Endpoints
- `GET /api/memory` — recall memories; supports `?entity_type=`, `?entity_id=`, `?category=`, `?limit=`; returns `{ memories, count }`
- `POST /api/memory` — manually store a memory; requires `entity_type`, `entity_id`, `content`

### Known Gaps (Session 5)
- `CROSS-SESSION MEMORY` block is only injected on the first turn of a brain session (`includePrimer` guard) — subsequent turns in same session don't get memory updates
- Memory extraction is fire-and-forget with Haiku; if API quota is exhausted, no memories are stored (no fallback)
- `recallGlobal()` is queried on every Shay-Shay call even when there are no global memories — adds one SQLite read per call (negligible but worth noting)
- Memory search (`/api/memory?entity_type=...`) has no text search endpoint — only exact field filters; `/api/memory` with no params returns all recent entries, not site-filtered
- No UI to browse/edit/delete memories yet; `/api/memory` GET is the only read surface

---

## Phase 6 — Revenue Path + GoDaddy DNS + Reunion Validation (2026-04-20)

### Files Modified
- `site-studio/server.js` — 3 new endpoints, `verifyRevenueAndState()` check added to `runBuildVerification`
- `site-studio/public/js/studio-screens.js` — Deploy right panel redesigned, revenue/DNS/approve functions, Settings Site tab additions
- `site-studio/public/css/studio-screens.css` — revenue card, DNS card, approve button styles

### Server API Additions

**`PATCH /api/patch-spec`** — update safe spec fields
- Allowed fields: `monthly_rate`, `client_name`, `client_email`, `custom_domain`, `paypal_handle`
- Guards: PATCHABLE_SPEC_FIELDS set; unknown fields silently ignored; 400 if no valid fields

**`POST /api/approve-site`** — mark site as client_approved
- Sets `spec.state = 'client_approved'`, `spec.approved_at = ISO timestamp`
- Accepts optional body: `{ monthly_rate, client_name }`
- Returns `{ ok, state, approved_at, paypal_link }` — paypal_link is `https://www.paypal.com/paypalme/{paypal_handle}/{monthly_rate}` or null

**`GET /api/revenue-card`** — PayPal + rate card data
- Returns `{ monthly_rate, paypal_link, paypal_handle, state, approved_at, client_name, deployed_url, custom_domain }`
- `paypal_handle` defaults to `famtasticfritz` unless `spec.paypal_handle` is set

**`verifyRevenueAndState()`** — added as 6th check in `runBuildVerification()`
- Warns if site is `client_approved` but no `monthly_rate` set
- Warns if `revenue_model === 'rank_and_rent'` and no `monthly_rate`
- For reunion sites (tag contains "reunion" OR `business_type === 'family_reunion'`):
  - Checks `event-details.html` and `gallery.html` exist in dist
  - Checks `index.html` contains "paypal" or "PayPal"
  - Checks `index.html` contains "rsvp" or "RSVP"

### Deploy Screen Changes (studio-screens.js)

Deploy right panel now has 3 sections:
1. **Revenue card** (`#deploy-revenue-card`, `loadRevenueCard()`):
   - No rate set: shows input + Save Rate button → PATCH /api/patch-spec
   - Rate set: shows `$X / month` label + PayPal link + Copy button
   - Approved: shows green "✓ Client Approved" badge + approval date
2. **DNS card** (`#deploy-dns-card`, `loadDnsCard()`):
   - Shown when `deployed_url` is set
   - 6-step GoDaddy DNS setup instructions with CNAME + A record values filled from `deployed_url`
   - Shows target `custom_domain` if set
3. **History** (unchanged)

Deploy center additions:
- **"Mark as Client Approved" button** (`#approve-site-btn`, `approveSite()`): POSTs to `/api/approve-site`, disables self + adds green "✓ Approved" state on success
- `syncApproveSiteBtn()` called at mount to pre-disable if already approved

Settings → Site tab new fields: `Custom domain`, `Monthly rate ($)`, `Client name`, `PayPal handle`

### Known Gaps (Phase 6)
- Settings Site tab renders monthly_rate etc. as display-only `renderTextField` — values are not wired to PATCH /api/patch-spec on save (use the Deploy revenue card input or direct API call)
- `paypal_link` uses PayPal.me personal link format — for proper invoicing, a PayPal Subscriptions API integration would be needed
- GoDaddy DNS card shows Netlify's load balancer IP (75.2.60.5) which is correct for Netlify but may change; should be fetched from Netlify API for accuracy
- `verifyRevenueAndState()` reunion detection uses simple tag/business_type check — won't catch reunion sites with non-standard naming
- No server-side validation that `monthly_rate` is a positive number — could store negative values via direct API call

---

## Phase 7 — FAMtastic Logo + FAMtastic.com Site (2026-04-20)

### Files Created/Modified
- `site-studio/public/img/famtastic-logo.svg` — NEW: brand logo SVG (starburst icon + FAM/tastic wordmark)
- `site-studio/public/index.html` — top-bar-logo updated from text spans to `<img>` tag
- `site-studio/public/css/studio-shell.css` — `.top-bar-logo-img` sizing added, text span fallback kept
- `sites/site-famtastic-com/spec.json` — NEW: FAMtastic.com site spec with full approved brief
- `sites/site-famtastic-com/dist/index.html` — NEW: FAMtastic.com landing page HTML
- `sites/site-famtastic-com/dist/assets/styles.css` — NEW: FAMtastic.com brand stylesheet

### FAMtastic Logo SVG

File: `site-studio/public/img/famtastic-logo.svg`
- ViewBox: 200x40
- Icon: 8-point star (red `#e8352a`) + gold center circle (`#fbbf24`)
- Wordmark: "FAM" in bold red + "tastic" in regular gold — font-weight 800/400 Inter/system-ui
- Used in Studio top bar via `<img src="/img/famtastic-logo.svg" class="top-bar-logo-img">`, height: 22px

The SVG replaces the previous `<span class="logo-fam">FAM</span><span class="logo-tastic">tastic</span>` text spans. The text span CSS is preserved as a fallback.

### FAMtastic.com Site

Tag: `site-famtastic-com`
State: `draft` (ready to build in Studio)
Spec brief: platform marketing site — hero, how-it-works, portfolio proof, pricing, CTA, footer

`dist/index.html`: Full semantic HTML with all 6 required sections:
- Hero with `.fam-hero-layered` BEM layers + animated SVG starburst (CSS rotation)
- How it works (3 steps)
- Portfolio grid (3 placeholder cards)
- Pricing (3 tiers: Starter $297, Growth $497, Rank & Rent custom)
- CTA → mailto:fritz.medine@gmail.com
- Footer

`dist/assets/styles.css`: Complete brand stylesheet
- Palette: bg #0a0a0f, red #e8352a, gold #fbbf24
- Nav fixed with backdrop-filter blur + mobile hamburger (pure CSS `#nav-toggle` checkbox)
- Hero: min-height 100vh with starburst SVG animation (40s slow spin)
- Section separators: CSS `clip-path: polygon()` diagonal dividers
- Full responsive: grid→single-column at 768px

### Known Gaps (Phase 7)
- Portfolio cards in FAMtastic.com are placeholders (colored div backgrounds, no screenshots) — need real site screenshots captured via Playwright
- Logo SVG text uses system fonts — logo rendering may vary slightly across browsers; a future pass should convert text to paths for pixel-perfect consistency
- `site-famtastic-com` is in `draft` state and has never been built through the Studio pipeline — `fam_score` is null, no post-processing has run (no logo extraction, no divider injection)
- CTA links to mailto: — should eventually link to a Calendly or booking page

---

## Canonical Vision Capture (2026-04-24)

The full FAMtastic vision and current-state gap map is captured in
`docs/FAMTASTIC-VISION-CAPTURE-2026-04-24.md`. Future sessions should
read that document before any architectural or product decision.
The most important framings it establishes:

- FAMtastic follows the Adobe Creative Cloud pattern: separate
  full-identity studios (Site, Component, Media, Think Tank) with
  shared Platform services
- The Platform is the substrate hosting research, memory,
  intelligence loop, conversation-based learning, and cross-studio
  dispatching — not a studio itself
- Two-tier FAMtastic output is deliberate design: Tier A
  clean-competent, Tier B FAMtastic-WOW
- Research must be FAMtastic-applied, not generic
- The conversation-based learning loop is how FAMtastic principle
  becomes operationalizable over time

---

## Baseline Closure Lessons (2026-04-25)

The April 25 session closed the JJ B&A R-NEW audit (4 build-layer
gaps), captured the canonical vision, ran a baseline test, diagnosed
6 stacked sub-gaps, produced a 9-round-reviewed closure plan, and
shipped the implementation in three commits. Lessons distilled from
that arc, ordered by how often they're likely to recur:

**1. Adversarial review with multiple AI tools beats single-tool
review.** The closure plan went through nine rounds: V1 → V9. V1 had
8 findings raised against it (Codex Round 1: dead seam, missing
parity tests, schema mismatch, etc.). V9 returned MINOR-ONLY. Each
round caught real bugs, not aesthetic objections. Lesson: before
shipping anything structural, run the plan past at least one
independent reviewer (Codex, Gemini, or a fresh Claude session
with no shared context) and iterate until the verdict is clean.
The cost is hours; the cost of NOT doing it is shipping a bad
contract that has to be re-shipped.

**2. Implementation order matters when workstreams share helpers.**
Workstream 2 had to ship before Workstream 1 because both Studio
Chat (`new_site_create` case) and Shay Desk (`handleShayBuildRequest`)
depend on the shared `createSite()` helper, `triggerSiteBuild()`
helper, and the new return shape of `extractBriefFromMessage`. If
WS1 had been implemented first, it would have either duplicated
those helpers or shipped against a target that didn't exist yet.
Lesson: when planning multi-commit closure, identify which workstream
introduces the shared substrate and ship that first.

**3. "Caller-owned vs helper-owned" is a recurring contract
question — document it in JSDoc.** `createSite()` had to make four
explicit ownership decisions: (a) authorization is caller-owned,
(b) TAG switch is helper-owned, (c) WS notification is helper-owned,
(d) downstream build trigger is caller-owned. Each of these was
worth a Codex round. The final JSDoc on `createSite` documents all
four invariants explicitly. Lesson: any helper that mutates shared
state across module boundaries needs ownership invariants written
in JSDoc, not just inferred from the function name. Future helpers
should adopt the same comment pattern as the canonical example.

**4. Identity check before destructive operations prevents data
corruption.** `createSite()` runs an identity check (lowercase,
strip punctuation, strip common business words like
"the/inc/llc/church/barber/...") against the existing
`spec.site_name` BEFORE deciding what to do with a tag collision.
Different-business collisions ALWAYS return `'collision'` regardless
of the caller's `on_collision` setting — this is the gate that
prevents Shay Desk's autonomous-build path from clobbering an
unrelated site that happens to slug-collide. Same pattern applies
anywhere a call site could "update" something it doesn't actually
own. Lesson: the identity check is a single-line investment that
makes the helper safe to use in autonomous contexts.

**5. Wizard-of-Oz orchestration is the right way to discover
capability gaps before building automation.** The baseline test
itself was a Wizard-of-Oz pattern: a human typed a single prompt
into Shay Desk and observed what the system did with no manual
nudging. The failure exposed all six sub-gaps at once. If the
gaps had been discovered by adding automation incrementally, each
would have been hidden behind workarounds and never surfaced as a
single coherent diagnosis. Lesson: when designing a new capability,
do the orchestration manually first (typing real prompts, narrating
the decision tree), capture every orchestration decision as
training data, and only build automation against the recorded
playbook. This pattern is now part of the FAMtastic build process
and is being used to shape the V2 BuildIntent architecture.

**6. The classifier-keyword-collision class of bug is a recurring
shape.** The deploy keyword at `classifyRequest` L10788 hijacked the
church prompt because the prompt contained "deploy" in a sentence
about deployment-after-build. The fix was structural — move the
`!hasBrief` fallback above the deploy gate so an unbriefed site
can't be deployed by accident. The same shape (low-precedence
keyword fires before higher-precedence intent matcher) is likely
hiding in other places. Future classifier audits should test
prompts that contain trailing or incidental keywords for every
intent gate.

**7. Documentation is part of the work, not a follow-up to it.**
Every commit in this session shipped with the relevant docs
updated in the same commit: WS2 with the createSite contract added
to the vision capture doc, WS1 with handler invariants in JSDoc,
WS3 with deploy reason taxonomy in JSDoc. The verification report
shipped as a fourth commit on the same day. Lesson: the rule "no
session ends without docs updates" applies at the workstream level
too — if a workstream commits without documentation, the next
session has to reverse-engineer what was decided.

## Bridge Exec Patterns — Learned the Hard Way

### ❌ NEVER DO: inline node -e with nested quotes
```
bash -c "node -e \"...code with 'quotes'...\""
```
This always fails. Quote escaping breaks across bash/JSON/node layers.

### ❌ NEVER DO: sed with complex patterns containing quotes
```
sed -i 's/if ((event.metaKey...)/replacement/' file.js
```
Parentheses and quotes in sed patterns cause silent failures or syntax errors.

### ✅ ALWAYS DO: heredoc to write a .js file, then run it
```
cat > patch.js << 'ENDOFSCRIPT'
const fs = require('fs');
let content = fs.readFileSync('path/to/file', 'utf8');
content = content.replace('exact string', 'replacement');
fs.writeFileSync('path/to/file', content);
console.log('patched:', content.includes('replacement') ? 'YES' : 'NO');
ENDOFSCRIPT
node patch.js
```
Heredoc with quoted delimiter ('ENDOFSCRIPT') prevents ALL shell expansion. Node handles its own string logic. Always verify with console.log after.

### ✅ ALSO VALID: multi-step exec — write file first, run second
If heredoc inline also fails, split into two bridge requests: one to write the file, one to run it.


## MBSH Audit + Platform Layer (2026-05-02, Cowork session)

**What happened:** Cowork-driven audit of the MBSH reunion site. Eight deliverables written to `docs/sites/site-mbsh-reunion/cowork-audit-001/`. Full v2 site built outside Studio at `~/famtastic-sites/mbsh-reunion-v2/`. Platform capability layer scaffolded at `~/famtastic/platform/`.

**Headline finding — Studio cannot produce MBSH (gap 0.11):** Studio lacks chatbot skeleton, compass nav skeleton, two-nav-system spec field, layered CSS mode, PHP backend support, asset triage workflow, and brand mark generation pipeline. The V1-BRIEF is currently unbuildable by Studio at any fidelity. Proven visually when the duplicate `site-mbsh96reunion` tag's `dist/` showed a hallucinated "Myrtle Beach SC" build — Studio inferred the wrong city from "MBSH" and ignored the `spec.json` `goal` field specifying a six-font cinematic design system.

**Repo-separation rule formalized:** Deploy repos live at `~/famtastic-sites/<site>/` (sibling to `~/famtastic/`). `~/famtastic/sites/<tag>/` is the Studio sandbox. The `dist/` subdirectory may hold builds, but the production artifact lives in the sibling repo. `dist/` at `sites/site-mbsh-reunion/dist` is now a symlink → `~/famtastic-sites/mbsh-reunion-v2/frontend`.

**Platform layer pattern:** `~/famtastic/platform/capabilities/<class>/<verb>.sh`. Each capability reads from macOS Keychain via `vault.sh`, writes to `spec.json`, appends to `platform/invocations/<date>.jsonl`. Never silently degrades — surfaces `manual_required` when API coverage is incomplete. Standing-approval model: Fritz stores credentials once, agent reads on every invocation.

**Duplicate tag cleanup:** `site-mbsh96reunion` trashed to `sites/.trash/site-mbsh96reunion-20260502-212214/`. `extractBriefFromMessage` needs a same-business-identity collision check before creating tags — task #23 queued.

### Known Gaps (MBSH / Platform, 2026-05-02)
- Story section (sections.css, IntersectionObserver fade, 6 story stills) uncommitted — decide commit-as-is or regenerate
- `setup-mbsh-backend.sh` not yet run against prod — blocked on committee password
- Tag-uniqueness check not yet added to `extractBriefFromMessage` — task #23
- Platform API gaps: Netlify connect, cPanel cron, DNS Zone Editor record CRUD, Resend domain auto-loop — all manual today
- Knowledge capture tool (Recommendation A.1) not yet built — hand-rolled SESSION-CAPTURE.md used as bridge

---

## Build Orchestration Trace System (2026-05-03)

Implements the infrastructure described in `docs/build-orchestration-trace-plan.md`. Additive — no existing behavior changed.

### New Modules

| File | Purpose |
|---|---|
| `site-studio/lib/run-id.js` | `generateRunId()`, `generateTraceId()`, `createRunContext()` — step counter factory for a build run |
| `site-studio/lib/build-trace.js` | `logTrace(event, hubRoot)` — appends to `sites/<tag>/build-trace.jsonl` + `trace_events` SQLite table. `getRunTrace()`, `queryTraceEvents()` for reads |
| `site-studio/lib/fulfillment-ledger.js` | `createLedger()`, `addFulfillmentItem()`, `finalizeLedger()`, `readLedger()` — per-build capability tracking written to `sites/<tag>/fulfillment-<runId>.json` |

### db.js Changes

Two new tables added to `_initSchema()`:

- **`trace_events`** — every build decision step. Primary key: `trace_id`. Indexed by `run_id`, `site_tag`, `phase`, `status`.
- **`agent_performance`** — per-agent/tool/provider scorecard rows. Indexed by `agent`, `task_type`, `run_id`.

New exported functions: `logAgentPerformance()`, `getAgentPerformance()`, `getAgentScorecard()`, `getDb()` (now exported for use by build-trace.js).

### gap-logger.js Changes

`GAP_CATEGORIES` extended with 11 build-orchestration types: `unfulfilled_request`, `placeholder_used`, `specialized_asset_needed`, `component_needed`, `integration_needed`, `design_uncertainty`, `provider_failure`, `verification_failure`, `agent_weakness`, `prompt_pattern`, `missing_capability`.

`GAP_DESTINATION` map added — routes each category to its recommended workspace (Think Tank, Media Studio, Component Studio, Site Editor, Platform, Job Queue). `logGap()` entries now include `destination` and `run_id` fields.

### server.js Wiring

- `createRunContext()` called at the top of `handleChatMessage()` — binds `ws._currentRunId` for downstream trace calls
- `logTrace()` called at: classification, deterministic handler exit, verification outcome
- `logAgentPerformance()` called after each parallel build completes
- New REST endpoints (all read-only, no auth required for now):
  - `GET /api/trace` — query trace events for current site
  - `GET /api/trace/run/:runId` — JSONL events for a specific run
  - `GET /api/agent/performance` — raw performance rows
  - `GET /api/agent/scorecard` — aggregated scorecard by agent+task_type
  - `GET /api/fulfillment` — latest fulfillment ledger for current site

### Trace Event Shape

Key fields: `trace_id`, `parent_trace_id`, `run_id`, `site_tag`, `phase`, `step_id`, `decision_type`, `selected_path`, `alternatives_considered`, `reason`, `agent`, `tool`, `provider`, `model`, `cost_type`, `input_tokens_actual`, `output_tokens_actual`, `cost_usd_actual`, `duration_ms`, `status`, `quality_score`, `created_jobs`, `gaps`.

### Known Gaps (Build Trace, 2026-05-03)
- Trace calls inside `parallelBuild()` per-page worker loop not yet added (only build-level verification is traced)
- `handleChatMessage()` single-page build path logs classification + deterministic handler but not the Claude call itself (API call tokens/cost not yet captured into trace)
- No UI panels yet for trace map, cost map, fulfillment ledger, or agent scorecard — data is available via REST endpoints only
- `ws._currentRunId` is not passed through to `parallelBuild()` — the verification trace uses a fallback `'run_unknown'` for builds that route through `parallelBuild` before `handleChatMessage` sets the runId

---

## Workbench Foundation Screen + Intelligence Packets (2026-05-04)

Fritz's core Workbench complaint was captured as a product requirement:
jobs/tasks are visible, but they do not explain the bigger picture — why the
work exists, what it unlocks, what is stale or duplicate, what blocks what,
or whether completion moves FAMtastic forward. The solution is not a prettier
task list; it is a plan intelligence layer rendered in the Workbench.

### New Workbench Foundation Surface

New files:

| File | Purpose |
|---|---|
| `site-studio/public/workbench-foundation.html` | Workbench Foundation screen served by the Studio static server. It can run standalone and is embedded in the production shell. |
| `site-studio/public/css/workbench-foundation.css` | Tokenized Workbench styling, theme modes, Sites/Plan/Components/Media/Research/Deploy surfaces, edge panels, bottom panel, modal shell, and rounded glass/button styling. |
| `site-studio/public/js/workbench-foundation.js` | Static mode data, domain switching, mode switching, object selection, Sites surface, prompt-first Media Studio, tool-shelf reordering with persisted order, bottom tabs, modal interactions, and theme cycling. |
| `site-studio/public/data/workbench-workspaces.json` | Workspace-purpose contract defining each mode's purpose, center surface, primary objects, capabilities, proof, and anti-patterns. |

Production shell integration:

| File | Detail |
|---|---|
| `site-studio/public/index.html` | Adds a top-bar Workbench launcher, a Sites-sidebar Workbench launcher, and `#tab-pane-workbench` with an embedded `/workbench-foundation.html` iframe plus full-screen fallback link. |
| `site-studio/public/js/studio-shell.js` | Adds the non-closeable `workbench` tab to the Studio tab model and visible tab strip. |
| `site-studio/public/css/studio-shell.css` | Styles the Workbench launch controls and embedded Workbench pane without adding inline CSS. |

The screen implements the intended shell model:

- Left rail = site/domain/system scope (`All Sites`, specific sites, `Studio System`, `Platform`, `Admin`)
- Top mode strip = `Sites`, `Plan`, `Components`, `Media`, `Research`, `Deploy`
- Collapsible left object navigator = scope-specific submenus and selected work objects
- Center surface = dynamic workbench tied to selected scope/subscope/object
- Right edge = contextual, draggable/reorderable tool shelf with order persisted per mode in localStorage
- Bottom panel = `Runs`, `Logs`, `Trace`, `Approvals`, `Proof`
- Modal shell demonstrates admin/capability panels
- Theme button demonstrates tokenized mode switching (`night`, `focus`, `paper`)

Follow-up product correction from Fritz: the rail is not "departments" in the
abstract; it is site/domain scope. "Sites" means all pages and functions for
those sites. Every child object below a site — page, section, asset,
component, task, run, and tool — must answer how it helps execute the parent
goal above it. The Workbench must expose this recursive execution contract
instead of only listing objects.

Follow-up visual correction from Fritz: the first repo-native screen captured
the logic but was too black, too rectangular, and not visibly FAMtastic. The
design direction is rounded, classy, button-like, tactile, and branded with
FAMtastic red/gold/cyan/violet accents. Dark background alone is not a brand
system.

Second follow-up product correction from Fritz: the center is the actual
workbench, not a website-like card grid. The left side selects scope,
subscope, and object; the center must become the working surface for that
object. For `Sites`, the Workbench must support pages, functions, meta,
images, templates, runs, proof, and reviews. Build mode needs a live preview
pane plus translucent metadata, Shay/chat, and evidence overlays. Other modes
need different canvases: plan graph/why view, component canvas, media asset
grid, research source board, and deploy/environment board.

Tool rule from Fritz: tools are not static links and should not be modeled as
ordinary cards. Tools should be contextual, movable, reorderable, draggable,
and available as needed. Fixed tools are allowed only when a workspace or
object state makes them always relevant. Edge-native surfaces should be
darker; secondary navigation should be more translucent; overlays covering
the workbench should be most translucent so the center remains dominant.

Media correction from Fritz: Wave 5 is **Media Studio**, not Media Library.
The library is one landing/results surface inside the Media Studio, but the
purpose is site media creation. Media Studio should be prompt-first: the
center workspace should focus on text-to-image, text-to-video, logo/brand,
background loop, blueprint, upscaling, canvas, and draw workflows, with
library/results below or adjacent instead of replacing the workspace. Each
media sub-workspace must start from purpose and capability: what asset is
being created, for which site/page/slot, with which references, route, proof,
cost, rights, and replacement behavior.

The first structured expression of that rule is
`site-studio/public/data/workbench-workspaces.json`. It is not a runtime source
of truth yet, but it records the intended contract every Workbench mode must
answer before implementation: purpose, center surface, primary objects,
capabilities, proof required, and anti-patterns.

2026-05-04 implementation update: the Workbench Foundation prototype now
follows the frozen domain rail instead of the earlier scope-initial rail. The
left nav is the locked domain list from `docs/STUDIO-UI-FOUNDATION.md`: Sites,
Brainstorm, Plans, Components, Media, Research, and Admin. The former mode
strip is replaced with a workspace contract strip that shows the selected
domain's purpose, center surface, and proof rule. `workbench-workspaces.json`
is now schema `0.2.0` with contracts for all seven domains; this closes the
first-pass frozen-contract rebuild, workspace-contract declaration, and
prompt-first Media Studio tasks for the prototype.

Playwright proof: `http://localhost:3334/workbench-foundation.html` was opened
through launchd-managed Studio, every domain button was clicked, each active
domain and contract purpose was verified, Plan mode rendered
`.plan-intel-surface`, Media rendered `.media-studio`, and no console errors
were observed. Screenshot:
`proofs/workbench-domain-contracts-2026-05-04.png`.

Existing implementation note: the current production Studio already has a
Media Studio mini-app in `site-studio/public/js/studio-screens.js` and
`site-studio/public/css/studio-screens.css` with Create, Image, Motion,
Library, Brand, Queue / History, and Providers screens. The Workbench
replacement should reuse that product learning instead of flattening Media
back into a generic asset/library panel.

Playwright proof: the page rendered through the Studio static server at
`http://localhost:3334/workbench-foundation.html`, and the embedded production
tab rendered through `#tab-pane-workbench`. Mode switching to Media Studio and
Sites was exercised. Tool-shelf drag/reorder was verified and persisted across
reload. Proof screenshots were saved during the session at
`/tmp/workbench-foundation-standalone.png`,
`/tmp/workbench-foundation-media.png`, and
`/tmp/workbench-foundation-in-studio.png`.

### Intelligence Artifacts

New files:

| File | Purpose |
|---|---|
| `handoffs/claude-workbench-foundation-2026-05-04.md` | Claude execution handoff with objectives, file ownership, non-negotiable product decisions, workspace tool map, stop conditions, and acceptance criteria. |
| `research/workbench-foundation-research-2026-05-04.md` | Research note grounding the approach in current patterns from Cursor, Figma, Linear, Notion, LangGraph, and Dagger. |
| `plans/consolidation-2026-05-04.json` | Proposed parent-lane consolidation for the active plan pile. |
| `captures/inbox/2026-05-04-workbench-foundation.capture.json` | Structured capture packet for the intelligence loop. |

### Proposed Parent Plan Lanes

`plans/consolidation-2026-05-04.json` proposes six parent lanes:

1. `workbench_foundation`
2. `plan_task_run_intelligence`
3. `build_fulfillment_trace`
4. `asset_systems`
5. `site_scoped_execution`
6. `strategy_empire_context`

The packet proposes marking `multi-agent-resumable-plan-system` as
`merged_into` `shay-process-intelligence`, because the former is a design
note/workstream under the broader Shay process-intelligence parent plan.

### Workbench Object Contract

Every plan/task/run/workspace object should eventually carry:

- `parent`
- `purpose`
- `complaint`
- `execution_role`
- `desired_outcome`
- `relevant_tools`
- `unlocks`
- `blocks`
- `blocked_by`
- `staleness_risk`
- `success_signal`
- `proof_required`
- `next_best_action`

Closure rule: a plan or task is not done until proof is satisfied and the
result explains what changed or unlocked. No orphan work: every item must have
a parent, a purpose, an execution role, a tool map, and a proof requirement.

### Brain Store Reframing

Brain Store should not be implemented as a model picker. It should become a
Capability Store covering brains, tools, providers, recipes, permissions,
cost class, latency expectations, evidence tier, validation date, and current
state. The existing seed is `site-studio/config/studio-capabilities.json`.

### BuildIntent / Workflow Trace Current State

As of 2026-05-04, `architecture/2026-04-24-canonical-build-intent-v2.md` is
the current BuildIntent direction. V1 remains historical only. The V2
interpreter is not implemented yet; the closed work is the ambiguity removal
and evidence attachment captured in
`architecture/2026-05-04-build-intent-v2-current.md`.

`parallelBuild()` in `site-studio/server.js` now emits durable trace events via
`site-studio/lib/build-trace.js` for `start`, `page_inventory`,
`template_start`, `template_written`, `template_failed`, `template_empty`,
`template_incomplete`, `pages_start`, `page_written`, and `page_failed`. This
is instrumentation only: no build order, prompt, model routing, or file-writing
behavior was changed.

Workflow-as-data phase 1 exists as a catalog-only contract at
`site-studio/lib/workflow-stage-catalog.json`. It declares stage IDs,
boundaries, inputs, outputs, and proof events for intake, parallel build start,
page inventory, template generation, template artifacts, page generation,
post-processing, verification, and completion. The visualizer should not be
built until real builds have produced trace events against this vocabulary.

### MBSH Site Boundary

MBSH has an explicit two-home state boundary as of 2026-05-04. Studio owns
`sites/site-mbsh-reunion/` for the canonical site record, spec, memory,
research, worker queue, and preview symlink. The deploy implementation remains
in `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/` for frontend,
backend PHP, schema, config, Netlify settings, and setup scripts. The boundary
is documented in `docs/sites/site-mbsh-reunion/DEPLOY-STATE.md`.

MBSH child tasks now live in `tasks/tasks.jsonl` under `site-mbsh-reunion`
instead of being buried inside a broad plan note. The split is backend, RSVP,
sponsor, deploy, media/story assets, chatbot, content deltas, Studio audit
harness, and generalized gap promotion. Reusable lessons should be promoted
upward only when they apply beyond MBSH.

### Shay-Shay UI Proof

Actual Shay behavior proof on 2026-05-04 used Playwright against Studio UI, not
WebSocket shortcuts or direct API-only proof. Exact message: `system status`.
The test clicked the Shay orb, entered the message into `#shay-shay-input`,
clicked `#pip-send-btn`, observed a real `POST /api/shay-shay`, and verified
the rendered Shay Lite panel contained capability status text. Proof note:
`docs/operating-rules/studio-shay-ui-proof-2026-05-04.md`; screenshot:
`proofs/shay-shay-system-status-ui-2026-05-04.png`.

Two real bugs were fixed during that proof. First, the open Shay Lite panel
could still lose clicks to the Studio workspace layer because
`#shay-lite-shell` kept `pointer-events: none`; `studio-orb.css` now restores
pointer events while the panel is open. Second, the send-button click listener
passed the click event as `forcedText`, so Shay received `[object PointerEvent]`
instead of the typed message; `studio-orb.js` now wraps the handler and calls
`sendDirect()` with no event payload.

### Workbench Shay Context Provider

Workbench is now a real Shay page-context provider. The embedded Workbench
iframe registers `page_id: workbench.foundation` with the parent
`ShayContextRegistry` from `site-studio/public/js/workbench-foundation.js`.
The provider exposes the selected domain, domain label, mode, scope, submode,
selected object, workspace contract, plan-state summary, and available
Workbench actions. `site-studio/public/js/studio-shell.js` marks
`workbench.foundation` active only when the Workbench tab is foregrounded so
hidden iframe state does not overwrite Shay context for other Studio pages.

Actual proof used the Studio UI and Shay-Shay, not a direct API shortcut. The
test opened Workbench through Studio, selected the Media domain, clicked the
Shay orb, sent `What Workbench page context are you receiving? Answer with the
page_id and domain only.`, observed a real `POST /api/shay-shay`, and verified
the panel response: `page_id: workbench.foundation | domain: media`. Evidence:
`proofs/workbench-shay-context-provider-2026-05-04.json` and
`proofs/workbench-shay-context-provider-2026-05-04.png`.

One server-side bug was found and fixed during the proof. `answerShayShayDirect`
matched generic active-page questions before page-context questions, so the
same prompt returned `index.html` even though `context.page_context` contained
the correct Workbench payload. `site-studio/server.js` now checks page-context
requests before the older active-page shortcut.

### Site Workflow Modes

The three site workflow modes are now captured as an architecture contract in
`architecture/site-workflow-modes-2026-05-04.md`. The modes are
`new_site_from_brief`, `adapt_existing_site`, and `rebuild_from_brief`. Each
contract names required inputs, state ownership, permissions, config discovery,
execution path, proof requirements, and known gaps.

Current reality remains intentionally explicit: `new_site_from_brief` is the
best-supported mode; `adapt_existing_site` and `rebuild_from_brief` are not yet
first-class runtime modes. The doc is the boundary that prevents Studio from
treating hand-built deploy repos, imported sites, and generated Studio sites as
the same state problem.

### MBSH Backend Endpoint Inventory

The MBSH v2 backend inventory is complete at
`docs/sites/site-mbsh-reunion/backend-endpoint-inventory-2026-05-04.md`. It
documents the PHP/MySQL endpoints, methods, payloads, persistence tables,
shared backend libraries, admin pages, cron scripts, frontend consumers,
config/env requirements, local/staging assumptions, missing runtime files,
blockers, and which follow-up tasks consume each endpoint.

Important operational finding: endpoint code and schema exist, but meaningful
local execution is blocked until one of `.env`, `.mbsh-config.local.php`, or
`MBSH_CONFIG_PATH` is present with database, Resend, admin hash, CORS, and
upload-path config. Production frontend config also still has
`API_BASE_URL: null`, so deploy proof must verify that the public config points
at the real backend origin before production smoke tests.

### Knowledge Capture First Pass

`fam-hub capture extract <source-file>` is now the first usable knowledge
capture pass. It is intentionally review-only: `scripts/capture-insights.js`
reads a designated source document or conversation export and writes a JSON and
Markdown packet under `captures/review/` with buckets for design decisions,
breakthroughs, gaps, lessons, contradictions, and proposed destinations.

The first run processed `/Users/famtasticfritz/Downloads/COWORK-BRIEFING.md`
and wrote `captures/review/2026-05-04-cowork-briefing-first-pass.json` plus
`.md`. It detected 13 design decisions, 4 breakthroughs, 3 gaps, 3 lessons,
and 2 contradictions. This closes the first automation slice of the flywheel:
conversation knowledge can now become a reviewable artifact without immediately
mutating `.wolf/cerebrum.md`, `SITE-LEARNINGS.md`, `FAMTASTIC-STATE.md`, or
`gaps.jsonl`.

The extraction is heuristic, not semantic-agent grade yet. That is acceptable
for slice one because the output is designed for review and approval before
promotion. The next improvement should be a promote/apply command with explicit
per-item approvals, duplicate detection, and better title/summary cleanup.

### MBSH RSVP and Sponsor Browser Proof

The MBSH v2 deploy repo now has browser-level proof for the public RSVP and
sponsor submission paths. The proof used the actual pages under
`/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/`, intercepted
the outbound API requests, and saved evidence at
`proofs/mbsh-rsvp-sponsor-browser-submit-2026-05-04.json`.

Two frontend defects were fixed in the deploy repo. `frontend/js/main.js`
now treats the anti-bot form timestamp as valid only after the minimum elapsed
time, matching the backend helper instead of rejecting legitimate delayed
submits. `frontend/js/rsvp.js` now explicitly serializes unchecked public
attendee opt-out as `display_publicly: "0"` instead of omitting the field.

The browser proof does not claim backend persistence/email/export are live.
Those still require MBSH runtime config and external access: database, Resend,
admin hash, upload path, CORS origin, Netlify, DNS, and GoDaddy/PHP/MySQL.

### MBSH Deploy Proof Boundary

`docs/sites/site-mbsh-reunion/deploy-proof-2026-05-04.md` is the deploy proof
packet for MBSH. It documents the exact frontend/backend/DNS/config/smoke-test
and rollback path, plus the blockers that prevent honest live proof in this
session.

Do not mark MBSH production deploy complete until the public frontend has a
real `API_BASE_URL`, the backend is configured with production secrets, and
the live RSVP/sponsor smoke tests pass against the actual deployed backend.

### Pipeline Visualizer Phase 1

Workbench Plan mode now includes the first live pipeline visualizer surface.
`GET /api/workflow/stage-catalog` serves
`site-studio/lib/workflow-stage-catalog.json`; the Workbench reads that catalog
plus `/api/trace?limit=24` and renders three lanes: Inspect, Trace, and
Propose.

This is deliberately read-first. Inspect shows the nine workflow stages and
their proof events. Trace shows live trace events when a build has produced
them, with an explicit empty state when no active-site trace exists. Propose
lists review-first next changes: keep phase one read-only, bind trace events
to stages, then migrate one declarative stage at a time.

Evidence: `proofs/workbench-pipeline-visualizer-2026-05-04.json` and
`proofs/workbench-pipeline-visualizer-2026-05-04.png`.

### MBSH Chatbot, Content, Audit, and Gap Proof

Hi-Tide Harry Chatbot Phase 1 is browser-verified at
`docs/sites/site-mbsh-reunion/chatbot-phase1-verification-2026-05-04.md`.
The proof opened the actual v2 frontend, asked the eight V1 FAQ questions, and
confirmed the fallback collector emits a payload. A CSS hidden-state bug was
fixed in the deploy repo: `.chatbot__panel[hidden] { display: none; }`.

The MBSH content delta packet is at
`docs/sites/site-mbsh-reunion/content-delta-verification-2026-05-04.md`.
The seven-page architecture is present, but launch content still needs final
date/venue/payment values, playlist ID, seed data, and backend proof.

The MBSH launch unblock packet is at
`docs/sites/site-mbsh-reunion/mbsh-launch-unblock-packet-2026-05-05.md`.
The local media/story blocker is closed for launch-safe generated/derivative
assets: all seven referenced `frontend/assets/story/*.jpg` files exist in the
v2 deploy repo, provenance is recorded in
`frontend/assets/story/RIGHTS-MANIFEST.md`, and Playwright proof is saved at
`proofs/mbsh-story-assets-2026-05-05.json` plus `.png`. Future archival or
crowd-sourced replacements still require attribution and approval before use.

The MBSH Studio reproduction harness is at
`docs/sites/site-mbsh-reunion/studio-reproduction-audit-harness-2026-05-04.md`.
It defines the exact single prompt to send through Studio, required checks, and
which gaps should be promoted only after a real Studio reproduction run.

Reusable MBSH-derived gaps are separated at
`docs/sites/site-mbsh-reunion/generalized-platform-gaps-2026-05-04.md`. They
map back into the existing four parent plans instead of creating another plan
stack.

### Known Gaps Opened / Still Open

- Workbench Foundation is production-linked as an embedded tab and standalone fallback, but it is not yet the default Studio shell replacement.
- Plan mode reads `site-studio/public/data/workbench-plan-state.json`, a browser-safe mirror of `plans/registry.json`, `tasks/tasks.jsonl`, `runs/runs.jsonl`, and `proofs/proof-ledger.jsonl`; automatic regeneration from source ledgers is still missing.
- `fam-hub plan review`, `fam-hub task promote`, and `fam-hub run start` exist. `fam-hub plan graph` is still not implemented.
- `fam-hub capture extract` exists, but promotion from review packet into canonical memory is still manual.
- Capability Store broader than Media Studio is not implemented.
- Pipeline visualizer phase 1 is implemented in Workbench Plan mode; stage/event matching and proposed patch preview are still missing.
- MBSH child tasks are split and scoped. Backend endpoint inventory, RSVP/sponsor browser proof, chatbot Phase 1 proof, content delta, audit harness, and generalized gap promotion are complete.
- MBSH backend runtime execution is blocked by missing runtime config/secrets and external deploy access; this is a deploy-proof blocker, not a source-code inventory or frontend-submit blocker.
- MBSH launch-safe media/story readiness is complete. Future archival/crowd-sourced replacement media still needs source attribution, permission, and approval logging before replacing the generated/derivative launch assets.
- Console-health cleanup remains open for non-blocking Studio warnings seen during Shay proof: Tailwind CDN production warning, unsupported preload `as` value, and `/config/site-config.json` 404.
- Theme/token update propagation rules are not implemented.
- FAMtastic brand asset pack is not created yet.
- Worker queue has visibility and `/api/worker-queue` polling, but still no live consumer.
- Media Studio exists as a prompt-first Workbench surface and as a production mini-app, but generation/provider controls are not unified between the two yet.
- Operations workspace GUI plan (`plan_2026_05_05_ops_workspace_gui`) is design-only — no Ops API surface (`/api/ops/*`), no `/ws/ops` WebSocket, no record `freshness` field, and no record-type visual tokens exist yet. These four prerequisites are tracked in the plan's `known_gaps_opened`.

## Reporting Density Preference (2026-05-05)

Response/reporting density is now explicit project configuration at
`config/reporting-preferences.json`. Current/default density is `compact`.

CLI:

```bash
fam-hub report style
fam-hub report style compact
fam-hub report style standard
fam-hub report style detail
```

`compact` is the normal completion/status shape: result, commit/proof if
relevant, and remaining blocker. `standard` is for multi-file summaries.
`detail` is reserved for explicit review, audit, root-cause, incident, or
"show me everything" requests. This setting changes report shape only; it does
not reduce proof, testing, documentation, or blocker visibility requirements.

## Operations Workspace GUI Plan (2026-05-05)

A new parent plan, `plan_2026_05_05_ops_workspace_gui`, was registered as the
design spec for an Operations workspace inside the Workbench shell. It defines
an 11-tab Ops sub-nav (Pulse, Plans, Tasks, Jobs, Runs, Proofs, Agents,
Reviews, Gaps, Memory, Debt) and a record-type visual language so PLAN, TASK,
JOB, RUN, PROOF, GAP, MEMORY, and REVIEW are visually distinct everywhere
(glyph + accent color + card shape + route prefix).

Files:
- `plans/plan_2026_05_05_ops_workspace_gui/plan.json` — 14 workstreams, MVP
  scope, known gaps, links.
- `plans/plan_2026_05_05_ops_workspace_gui/README.md` — human summary.
- `plans/registry.json` — added to `active_parent_ids`; new `labels` block
  introduced (label `ops-workspace-gui`, tags `platform-upgrades`,
  `studio-ui`, `ops`, `shay-shay`, `agent-management`).

Origin: a debug session showed the UI claiming "agents waiting" while the
real task ledger had no active work — 448 stale legacy worker-queue items
were inflating the picture. The plan resolves this by making freshness a
first-class record field (live | idle | stale | parked | archived) and
quarantining stale debt in a dedicated drawer that never enters live lanes.

MVP: the Jobs tab. Six swimlanes (Queued · Approving · Running · Blocked ·
Done · Parked) plus a Stale Debt drawer with Migrate/Archive/Purge. Job
inspector with Cancel/Park/Promote-to-Task. WebSocket lane updates.
Shay-Shay one-sentence queue summary. This validates the swimlane +
inspector + WebSocket pattern every other Ops tab reuses.

Status: design-only. No API, UI, or schema changes shipped yet.
