# Plan Consolidation + Verification — 2026-05-04

**Status:** proposal, pending Fritz approval  
**Input registry:** `plans/registry.json`  
**Current count:** 11 plan records  
**Recommended after consolidation:** 4 active parent plans, 1 parked strategy context, 6 merged/closed evidence records  

## Verdict

Yes, there are too many plans. Several records are not plans anymore; they are
diagnostics, evidence packets, stale proposals, or child workstreams. Keeping
them all as active plans makes the registry harder to use and weakens the
Workbench logic.

The registry should distinguish:

- **Parent plans** — active, resumable execution containers
- **Child workstreams** — grouped under a parent plan
- **Evidence records** — proof attached to a parent, not active plans
- **Parked strategy** — reviewed context that should not drive execution until
  Fritz accepts it

Do not mutate `plans/registry.json` until Fritz approves this proposal.

## Verification Findings

| Check | Result | Meaning |
|---|---|---|
| Registry count | 11 records | Too many records are presented at the same level |
| Source files | All referenced source files found | No missing-file blocker for consolidation |
| Task ledger | Empty | Plan tasks are still embedded arrays, not executable records |
| Run ledger | Empty | No plan has a run state yet |
| Proof ledger | Empty | Closure/evidence is still scattered in docs |
| `source_refs` / `proof_links` fields | Null in current registry output | Registry needs richer linking, not just rendered Markdown links |
| Existing consolidation packet | Present at `plans/consolidation-2026-05-04.json` | Useful, but too many parent lanes remain active |

## Recommended Target Shape

### Active Parent Plans

Keep these as the active execution registry:

| Parent Plan | Absorbs | Why |
|---|---|---|
| `studio-workbench-foundation` | `studio-master-plan`, Workbench freeze artifacts, UI foundation | Owns Studio shell/workspace execution from frozen UI rules through default shell replacement |
| `plan-task-run-intelligence` | `shay-process-intelligence`, `multi-agent-resumable-plan-system` | Owns plans, tasks, runs, capture packets, handoffs, proof, and worker coordination |
| `build-intent-fulfillment-trace` | `build-orchestration-trace`, `canonical-build-intent-v2`, `baseline-closure-review`, `gap-123-4-closure`, `p0-p1-diagnostics` | Owns build intent, fulfillment trace, diagnostics, routing fixes, and proof that builds satisfy prompts |
| `site-mbsh-reunion` | Existing MBSH plan docs only | Site-scoped execution should stay separate from platform execution |

### Parked Context

| Record | Action | Why |
|---|---|---|
| `famtastic-total-ask-plan` | Park as `strategy-context` | It may be important, but should not drive execution until Fritz reviews and accepts/modifies it |

### Merge / Close Actions

| Current Plan | Recommended Action | Target |
|---|---|---|
| `studio-master-plan` | Merge into renamed/updated `studio-workbench-foundation` | Active parent |
| `build-orchestration-trace` | Merge | `build-intent-fulfillment-trace` |
| `baseline-closure-review` | Convert unresolved findings to tasks; attach doc as evidence | `build-intent-fulfillment-trace` |
| `canonical-build-intent-v2` | Make child spec/workstream; mark v1 superseded if accepted | `build-intent-fulfillment-trace` |
| `outstanding-iterative-roadmap` | Dissolve into task records; stop treating as a plan | Multiple parents as appropriate |
| `multi-agent-resumable-plan-system` | Mark `merged_into` | `plan-task-run-intelligence` |
| `shay-process-intelligence` | Rename / promote to parent | `plan-task-run-intelligence` |
| `gap-123-4-closure` | Close as evidence after proof links are attached | `build-intent-fulfillment-trace` |
| `p0-p1-diagnostics` | Close as evidence; promote remaining issues as tasks | `build-intent-fulfillment-trace` |
| `site-mbsh-reunion` | Keep active but move to site-scoped registry lane | Site parent |
| `famtastic-total-ask-plan` | Park pending review | Strategy context |

## Proposed Active Parents After Approval

### 1. `studio-workbench-foundation`

**Purpose:** Build the frozen Studio UI foundation into a real Workbench shell.

**Immediate work:**

- Rebuild Workbench from `docs/STUDIO-UI-FOUNDATION.md`
- Wire real workspace contract data
- Make Plan mode consume registry data
- Register Shay context provider
- Do not replace default shell until proof passes

**Proof required:**

- Playwright render through Studio
- domain -> workspace -> selected object -> tools -> proof state works
- Shay sees page context
- Media remains prompt-first Media Studio

### 2. `plan-task-run-intelligence`

**Purpose:** Make planning executable, resumable, and visible across CLI,
Studio, Shay, and future workers.

**Immediate work:**

- Promote embedded plan tasks to `tasks/tasks.jsonl`
- Add run records to `runs/runs.jsonl`
- Add proof records to `proofs/proof-ledger.jsonl`
- Build `fam-hub plan review`
- Generate `FAMTASTIC-STATUS.md` from registry instead of hand-writing it

**Proof required:**

- `fam-hub task list` shows promoted records
- `fam-hub run status` shows at least one run
- Workbench Plan mode reads the same state

### 3. `build-intent-fulfillment-trace`

**Purpose:** Ensure every build request becomes traceable fulfillment with
requested/completed/deferred/gap/proof state.

**Immediate work:**

- Attach diagnostics as evidence, not active plans
- Resolve BuildIntent v1/v2 supersession
- Convert serious baseline findings into tasks
- Surface fulfillment trace in Workbench

**Proof required:**

- one build run shows request, decisions, output, deferred items, verification,
  and follow-up tasks
- no orphan diagnostic plan remains active

### 4. `site-mbsh-reunion`

**Purpose:** Track MBSH site execution separately from platform work while
promoting reusable learnings back into platform plans.

**Immediate work:**

- Create site-scoped task records
- Separate backend/media/deploy/content tasks
- Promote reusable platform findings back to parent plans

**Proof required:**

- MBSH tasks are visible without polluting platform plan status
- platform learnings have explicit promotion targets

## Approval Gate

If Fritz approves this consolidation, the next implementation step is:

1. Back up `plans/registry.json`
2. Rewrite registry to the target parent shape
3. Move merged/closed records into archive/evidence fields
4. Promote actionable task arrays into `tasks/tasks.jsonl`
5. Add at least one run record for the active Workbench/plan consolidation work
6. Update `SITE-LEARNINGS.md`, `FAMTASTIC-STATE.md`, and `CHANGELOG.md`

This is an **Efficiency** and **Automation** move in the solution hierarchy.
It reduces duplicated plan reading and creates the data shape Workbench/Shay
need to operate without Fritz manually remembering which plan matters.
