# Platform Refresh v2 — Implementation Reconciliation

**Date:** 2026-05-11
**Current local branch inspected:** `docs/platform-refresh-v2-cohesion`
**Implementation branch inspected:** `origin/research/studio-intelligence-foundation-20260508`
**Purpose:** reconcile the original read-only Platform Refresh v2 packet with the newer `/studio.html` implementation work before any more feature work proceeds.

---

## 0. Executive read

The repo now has two valid truths that must be reconciled:

1. **Original Platform Refresh v2 packet** — `docs/platform-refresh/` on `docs/platform-refresh-v2-cohesion`. This is a read-only planning/governance packet. It locks the control-surface vocabulary, autonomous-build rules, cost governance, and the first Studio-driven build sequence.
2. **Newer Studio implementation work** — `origin/research/studio-intelligence-foundation-20260508`. This branch contains the functional `/studio.html` shell, a 12-section platform IA, read/action shells for Studio sections, and proof reports under `docs/research/famtastic-studio-execution/`.

The original packet remains authoritative for governance, proof discipline, cost gates, and control-surface ownership. The newer implementation appears to supersede the old seven-domain Workbench nav assumption with a 12-section Studio rail. That supersession should be confirmed by Fritz, but it is already the direction embodied in the newer branch's IA and implementation reports.

**Do not continue building features until the old packet and newer implementation are treated as one reconciled workstream.**

---

## 1. Local verification notes

Commands run from `/Users/famtasticfritz/famtastic`:

```bash
git status --short --branch
git branch --show-current
git log --oneline -10
git fetch --all --prune
git branch -a --list '*studio-intelligence*' '*platform*'
node scripts/agent-checkin.js --intent "platform refresh v2 implementation reconciliation"
git ls-tree -r --name-only origin/research/studio-intelligence-foundation-20260508 | grep -E 'docs/research/famtastic-studio-execution|studio.html|site-studio/public/studio'
```

Observed local state:

- Local branch is `docs/platform-refresh-v2-cohesion`.
- Dirty/untracked files existed before this reconciliation:
  - `.wolf/anatomy.md`
  - `memory/usage.jsonl`
  - `mbsh-recipe-test/`
- `docs/research/famtastic-studio-execution/` is **not present on the local branch**.
- The implementation branch exists as `origin/research/studio-intelligence-foundation-20260508` and is also checked out in another worktree (`+ research/studio-intelligence-foundation-20260508`).
- `agent-checkin.js` reported broad overlap, including `research/studio-intelligence-foundation-20260508`. Fritz supplied the platform web-session handoff, so this document is a coordination/reconciliation artifact, not a feature implementation.

---

## 2. Source-of-truth file status

| File | Status | Current role |
|---|---|---|
| `docs/platform-refresh/REFRESH-READY-HANDOFF.md` | Current for original packet; stale against `/studio.html` | Cold-start handoff for the original Platform Refresh v2 packet. Needs a pointer to this reconciliation. |
| `docs/platform-refresh/STUDIO-PLATFORM-REFRESH-V2.md` | Current for umbrella/governance; stale for implementation state | Defines the umbrella and ten branches. It explicitly says the packet is read-only and not a UI implementation. |
| `docs/platform-refresh/CONTROL-SURFACE-RECONCILIATION.md` | Still authoritative for ownership; needs nav reconciliation | Defines Operator Cockpit, Mission Control, Ops Workspace, Shay Desk, Approval Center, Build Ledger, Build Trace, Capability Truth Layer. |
| `docs/platform-refresh/AUTONOMOUS-BUILD-OPERATING-MODEL.md` | Current | Locks the nine-field run contract, autonomy ladder, pause classes, proof checkpoints, resume contract, and final handoff. |
| `docs/platform-refresh/API-COST-USAGE-GOVERNANCE.md` | Current | Locks cheap-lane default, cost thresholds, telemetry schema, approval gates, and provider routing rules. |
| `docs/platform-refresh/STUDIO-TOOLS-AND-PROCESSES-MATRIX.md` | Useful inventory; stale in implementation statuses | Some entries marked missing/partial are now partially implemented on `origin/research/studio-intelligence-foundation-20260508`. |
| `docs/platform-refresh/WORKSTREAM-MAP.md` | Current as original plan map; stale for 12-section IA | Maps the original Platform Refresh v2 packet to eight active parents and recommends N1-N6 children. Needs an implementation-delta companion. |
| `docs/platform-refresh/FIRST-BUILD-SEQUENCE.md` | First-wave plan, not full completion plan | Still valuable, but it does not account for `/studio.html` and Phase/functional shell work already done. |
| `docs/platform-refresh/INTELLIGENCE-LOOP-AUDIT.md` | Current for intelligence-loop gap | Capture works; retrieve/apply/verify are still the key gap unless the implementation branch proves otherwise. |
| `plans/registry.json` | Current local registry, but stale against newer branch | Local active parents remain the original platform-refresh shape; registry does not yet reflect the `/studio.html` implementation delta. |
| `plans/plan_2026_05_05_workbench_per_page_design/plan.json` | Current local plan; closeout differs by branch | Local plan audit says it is active with no closeout; implementation branch report says a `2026-05-10-needs_tasking.json` closeout exists. Reconcile when merging branches. |
| `docs/research/famtastic-studio-execution/STUDIO-FUNCTIONAL-WORKSPACE-RUN-REPORT.md` | Current on implementation branch only | Proof report for `/studio.html`: six implementation lanes, 12 sections, contextual right pane, recipes, memory strip, static proof. |
| `docs/research/famtastic-studio-execution/STUDIO-DRIFT-CORRECTION-NOTES.md` | Current on implementation branch only | Standing rule: platform sections come first; Mission Control is one section only. |
| `docs/research/famtastic-studio-execution/FAMTASTIC-STUDIO-PLATFORM-IA-AND-FUNCTIONAL-MAP.md` | Current on implementation branch only | Canonical 12-section platform IA on the newer branch. Explicitly supersedes the design template's shorter rail and corrects Mission Control drift. |
| `docs/research/famtastic-studio-execution/STUDIO-DESIGN-TO-IMPLEMENTATION-PLAN.md` | Current on implementation branch only | Parallel-shell implementation plan for `/studio.html`; preserve `/index.html` and `/operator.html`. |
| `docs/research/famtastic-studio-execution/FUNCTIONAL-SUBSTRATE-RUN-REPORT.md` | Current on implementation branch only | Proves intelligence substrate routes/readers/writers and MBSH V2 readiness artifacts. |
| `docs/research/famtastic-studio-execution/STUDIO-ACTION-WIRING-PHASE-1-RUN-REPORT.md` | Not found in inspected branch | The handoff mentions Phase 1; exact file name may differ or be uncommitted elsewhere. |
| `docs/research/famtastic-studio-execution/STUDIO-ACTION-WIRING-PHASE-2-RUN-REPORT.md` | Not found in inspected branch | Verify with the web session before treating as committed. |
| `docs/research/famtastic-studio-execution/STUDIO-ACTION-WIRING-PHASE-3-RUN-REPORT.md` | Not found in inspected branch | Verify with the web session before treating as committed. |

---

## 3. Locked decisions that still stand

These decisions should not be reopened unless Fritz explicitly says to reopen them:

- **Operator Cockpit** is the umbrella experience name, not a route/page/component.
- **Mission Control** answers "what needs Fritz right now?" and routes. It does not own site editing, media generation, component work, deployment mechanics, or content creation.
- **Mission Control is one section only** in the newer Studio IA. It must not become the whole Studio.
- **Ops Workspace** is technical ops inside Admin/Settings-style platform operations: jobs, capabilities, provider health, deploy targets, freshness, and similar operational state.
- **Approval Center** owns cross-system decisions: production deploys, DNS/domains, secrets, cost threshold crossings, destructive actions, schema migrations, and brand-kit changes.
- **Build Ledger** is per-site narrative; **Build Trace** is per-run machine record. They cross-reference; neither replaces the other.
- **Capability Truth Layer** is the only source of truth for what actually works. Status vocabulary remains `working`, `partial`, `stubbed`, `broken`, `manual_only`, `costly`, `approval_required`.
- **API cost governance** is first-class: cheap lane default, estimate before expensive calls, soft/hard thresholds, telemetry, and approval gates.
- **Autonomous builds** are core architecture: nine-field run contract, stop conditions, proof checkpoints, cadence, cost guardrails, and final handoff.
- **Dangerous action gates require Fritz**: production deploy, DNS/domain, payment/auth, secrets, destructive delete, parallel write conflict, expensive media/API over threshold, brand-kit change, schema migration.
- **No paid/cloud calls without explicit Fritz approval.**
- **Do not break `/index.html` or `/operator.html`.** `/studio.html` is a parallel shell until it can host their flows end-to-end.

---

## 4. Main reconciliation decision

### Old assumption

The original packet follows the Workbench/R1 model:

```text
Sites · Brainstorm · Plans · Components · Media · Research · Admin
```

Mission Control is described as the Sites-domain landing screen, Ops Workspace lives under Admin, and Shay remains ambient.

### Newer implementation direction

The implementation branch's IA declares 12 top-level sections:

```text
Home · Sites · Site Builder · Site Settings · Think-Tank · Research Center · Component Studio · Media Studio · Media Library · Shay Shay · Mission Control · Settings
```

It explicitly says Mission Control is one section among twelve and not the product frame.

### Reconciliation recommendation

Treat the **12-section `/studio.html` IA as the implementation source of truth**, pending Fritz confirmation, while preserving the old packet's governance and ownership rules.

That means:

- The seven-domain R1 model becomes historical/foundation context, not the current rail contract.
- Control-surface definitions still stand, but their route placement changes:
  - Mission Control = top-level section in `/studio.html`, not the entire home and not necessarily nested under Sites.
  - Ops/technical settings map into Settings/Admin-style platform operations until a dedicated route is built.
  - Shay can be both a top-level Shay Shay section and contextual/ambient assistance, as long as the distinction is explicit.
- `FIRST-BUILD-SEQUENCE.md` remains a first-wave substrate sequence, not the full completion plan for the 12-section Studio.

---

## 5. Built vs specified feature matrix

| Feature/system | Reconciled status | Evidence/files | What remains |
|---|---|---|---|
| `/studio.html` shell | Built/partially operational on implementation branch | `site-studio/public/studio.html`, `site-studio/public/studio/src/*`, `STUDIO-FUNCTIONAL-WORKSPACE-RUN-REPORT.md` | Merge/review branch, host browser verification, reconcile docs. |
| 12-section Studio IA | Spec + implemented shell direction | `FAMTASTIC-STUDIO-PLATFORM-IA-AND-FUNCTIONAL-MAP.md`, `STUDIO-DRIFT-CORRECTION-NOTES.md`, `shell.jsx` | Fritz confirmation and update old packet docs. |
| Sites / Site Builder / Site Settings | Built as read/action shell on implementation branch | `screens/sites.jsx`, `site-builder.jsx`, `site-settings.jsx`, `lib/sites-api.js`, `lib/site-context.js` | New-site wizard, preview/inspect/refine wiring, per-site overrides. |
| Mission Control | Built/contained as one section | `screens/mission-control.jsx`, `/operator.html`, `STUDIO-DRIFT-CORRECTION-NOTES.md` | Native port later; keep iframe/section containment. |
| Ops Workspace | Spec/partial | `CONTROL-SURFACE-RECONCILIATION.md`, `plans/plan_2026_05_05_ops_workspace_gui/**` | Decide Settings/Admin placement in 12-section IA; build real route/page if needed. |
| Approval Center | Spec/partial governance | `plans/registry.json`, `API-COST-USAGE-GOVERNANCE.md` | Implement actual approval queue UI and unblock/write mechanics. |
| Capability Truth Layer | Partial | `site-studio/lib/capability-manifest.js`, `site-studio/config/studio-capabilities.json`, platform docs | Extend to media/video/agents/MCP/cost/probes. |
| Cost telemetry | Spec/partial | `API-COST-USAGE-GOVERNANCE.md`; implementation branch includes `site-studio/lib/media-telemetry.js` | Formalize provider-call ledger/writer and UI consumption. |
| Build Ledger | Pattern proven; scaffold incomplete | `docs/sites/site-mbsh-reunion/**`, `AUTONOMOUS-BUILD-OPERATING-MODEL.md` | Scaffold script/schema for every site. |
| Build Trace | Partial | `/api/trace`, `build-intent-fulfillment-trace` plan | Stage/event matching, missing-stage detection, proposed patch preview. |
| QA gates | Mostly spec | `STUDIO-TOOLS-AND-PROCESSES-MATRIX.md`, `FIRST-BUILD-SEQUENCE.md` | Implement runnable Tier-1 gates and registry. |
| Recipe Registry | UI partial; formal registry missing | implementation branch `site-studio/public/studio/src/lib/recipes.js`, `recipe-flow.jsx`; original `FIRST-BUILD-SEQUENCE.md` | Create formal `plans/recipe-registry.json` or equivalent and bind to build engine. |
| Shay Desk / Shay context | Partial | implementation branch `screens/shay.jsx`, `lib/current-context.js`, right pane; original Shay docs | Clarify top-level Shay Shay vs contextual Shay; wire real chat/action behavior. |
| Media Studio | Partial/action shell | implementation branch `screens/media-studio.jsx`, `media-library.jsx`, `lib/media-api.js`; original Media Studio docs | Real generation/import/save/approval under cost gates. |
| Component Studio | Partial/action shell | implementation branch `screens/component-studio.jsx`, `lib/components-api.js` | Real component creation, registry, sandbox proof, safe insertion. |
| Research / Think-Tank | Partial | implementation branch `screens/research.jsx`, `think-tank.jsx`, `server/research-routes.js`, `server/think-tank-routes.js` | Confirm route mounts, write flows, provenance, and recipe promotion. |
| Plan/task/run/proof ledgers | Built/partial | `plans/registry.json`, `tasks/**`, `runs/**`, `proofs/**`; implementation branch intelligence reader/writer | Automate status regeneration and make `/studio.html` consume consistently. |
| Intelligence loop retrieve/apply/verify | Capture works; rest still gap | `INTELLIGENCE-LOOP-AUDIT.md`; implementation branch learning candidates | N6 workstream: searchable retrieval, applied-learning telemetry, verifier. |

---

## 6. Completion-plan status

There is **not yet a fully current completion plan** for the newer 12-section Studio implementation.

`docs/platform-refresh/FIRST-BUILD-SEQUENCE.md` is still useful, but it should now be read as the **first-wave substrate plan**:

1. Capability Truth Layer extension
2. Cost telemetry + build-credit guard
3. Build Ledger scaffold + run-contract schema
4. Approval Center + cost-gate behavior
5. Mission Control port
6. Tier-1 QA gates
7. Recipe Registry seed
8. Homeboy Shipping test build

The newer implementation branch means some UI/shell work has already advanced ahead of that sequence. The sequence should be updated into a new current implementation order rather than executed blindly from Step 1.

### Updated recommended execution sequence

1. **Merge/verify the `/studio.html` implementation branch state**
   - Confirm which functional/action reports are committed.
   - Resolve the local `workbench_per_page_design` closeout discrepancy.
   - Preserve `/index.html` and `/operator.html`.

2. **Update Platform Refresh docs for 12-section IA**
   - Add this reconciliation as the bridge.
   - Update `REFRESH-READY-HANDOFF.md` to point here.
   - Mark the seven-domain R1 nav as superseded by the 12-section implementation rail if Fritz confirms.

3. **Capability Truth + cost hardening**
   - Extend capability manifest to media/video/agents/MCP/cost/probe status.
   - Formalize provider-call telemetry and budget gate behavior.

4. **Approval Center / decision queue**
   - Build or map the cross-system queue in the 12-section shell.
   - Wire hard stops and cost threshold breaches.

5. **Formal Recipe Registry**
   - Convert UI recipes into a registry artifact consumed by the build engine.
   - Keep cheap lane defaults and Tier-1 gate lists per recipe.

6. **Build Ledger scaffold + QA gates**
   - Turn the MBSH pattern into repeatable scaffold and runnable gates.
   - Keep proof packets per run/site.

7. **Finish Media Studio and Component Studio action flows**
   - Media: import/generate/save/approve under cost gates.
   - Components: create/sandbox/promote/insert with proof.

8. **Close the intelligence loop**
   - Retrieve → apply → verify, with learning-candidate promotion and applied-learning telemetry.

9. **First Studio-driven build test**
   - Default remains Homeboy Shipping unless Fritz chooses a different test.
   - Success means Studio carries more of the build than MBSH required manually.

---

## 7. Immediate next executable step

Recommended next step:

**Bring the implementation branch into view cleanly before feature work: either merge/rebase `research/studio-intelligence-foundation-20260508` into the platform refresh branch or create a temporary comparison worktree, then verify the `/studio.html` shell and reconcile docs against the actual committed files.**

Why:

The current local branch does not contain the newer implementation docs or `/studio.html` files. Building from the local branch alone would continue the old packet as if the newer Studio work did not exist.

Files to inspect first after branch/worktree alignment:

- `docs/research/famtastic-studio-execution/STUDIO-FUNCTIONAL-WORKSPACE-RUN-REPORT.md`
- `docs/research/famtastic-studio-execution/STUDIO-DRIFT-CORRECTION-NOTES.md`
- `docs/research/famtastic-studio-execution/FAMTASTIC-STUDIO-PLATFORM-IA-AND-FUNCTIONAL-MAP.md`
- `docs/research/famtastic-studio-execution/STUDIO-DESIGN-TO-IMPLEMENTATION-PLAN.md`
- `site-studio/public/studio.html`
- `site-studio/public/studio/src/shell.jsx`
- `site-studio/public/studio/src/app.jsx`
- `plans/registry.json`

Commands:

```bash
cd ~/famtastic
git status --short --branch
git worktree list
git diff --stat docs/platform-refresh-v2-cohesion..origin/research/studio-intelligence-foundation-20260508 -- docs/research/famtastic-studio-execution site-studio/public/studio.html site-studio/public/studio site-studio/server.js plans
node scripts/agent-checkin.js --intent "reconcile platform refresh docs with studio html implementation"
```

Verification:

```bash
git diff --check
node scripts/plans/audit.js || true
```

If validating UI after switching to or merging the implementation branch:

```bash
cd site-studio
STUDIO_PORT=3335 PREVIEW_PORT=3336 npm run dev
# in another terminal, if file exists on the branch:
node server/__smoke__/studio-functional-verify.js || true
```

Definition of done for the next implementation-prep pass:

- The newer `/studio.html` implementation files and reports are visible in the active working tree or comparison worktree.
- Old packet assumptions are explicitly marked current/stale/superseded.
- 12-section IA is either confirmed by Fritz or left as a named blocking decision.
- `FIRST-BUILD-SEQUENCE.md` is clearly labeled as first-wave substrate plan, not full current completion plan.
- No MBSH production files, DNS, deploy, payment, secrets, or paid/cloud provider calls are touched.

---

## 8. Known risks and gaps

- **Navigation model drift:** old seven-domain R1 nav vs newer 12-section Studio rail.
- **Branch split:** local platform-refresh branch lacks the newer implementation branch's docs and files.
- **Plan closeout discrepancy:** local `node scripts/plans/audit.js` reports `plan_2026_05_05_workbench_per_page_design` active with no closeout; implementation report says a closeout packet exists on the newer branch.
- **Phase report naming gap:** `STUDIO-ACTION-WIRING-PHASE-1/2/3-RUN-REPORT.md` were not found in the inspected implementation branch under those exact names.
- **Capability Truth Layer incomplete:** media/video/agents/MCP/cost/probe expansion still needed.
- **Cost telemetry incomplete:** original governance exists; full provider-call ledger/writer/UI consumption still needed.
- **Approval Center incomplete:** governance hard stops exist; robust queue UI/write semantics remain open.
- **Recipe Registry incomplete:** UI recipes exist on the implementation branch; formal registry/build-engine consumption remains open.
- **Intelligence loop incomplete:** capture works; retrieve/apply/verify remain the durable gap.
- **Server growth risk:** implementation branch already modifies/mounts server routes; future work should add modular routers, not dump more behavior into `server.js`.

---

## 9. CLI instruction

CLI agent, your job is to keep Platform Refresh v2 and the newer `/studio.html` work from diverging further: do not build new features until the implementation branch is visible in the working tree or a comparison worktree, confirm whether Fritz accepts the 12-section Studio IA as the current source of truth, then update the platform-refresh handoff/sequence docs so the next implementation pass can proceed from one reconciled plan.
