# Consolidated Execution Checklist — 2026-05-04

**Status:** Working consolidation for Fritz review  
**Inputs reviewed:** `plans/registry.json`, `plans/consolidation-verification-2026-05-04.md`, `docs/famtastic-total-ask-plan.md`, `plans/plan_2026_05_04_shay_process_intelligence/plan.json`, `docs/STUDIO-UI-FOUNDATION.md`  
**Registry mutation:** Not applied yet. This checklist is the authority proposal for the rewrite.
**Status correction:** Drive sync is marked complete; workflow-as-data and the pipeline visualizer remain open.

---

## Decision

The current plan stack is too wide. The registry should collapse to **four active parent plans**. The stale Total Ask Plan should not remain as a fifth execution plan. It should be treated as strategy context and mined for useful asks.

This follows the solution hierarchy:

1. **Efficiency:** Fewer active plans, one task ledger, less repeated status review.
2. **Automation:** Four parent plans can feed `fam-hub`, Workbench Plan mode, and Shay without translation.
3. **Revenue potential:** Keeps MBSH and reusable Studio capability work visible.
4. **It works:** Existing loose documents are preserved as evidence, not used as daily operating truth.

---

## The Four Plans Left

| Parent Plan | What It Is For | Still Needed? | Why |
|---|---|---:|---|
| `studio-workbench-foundation` | The real Studio shell: domain-level left nav, purpose-built workspaces, frozen UI contract, ambient Shay, Media Studio, Workbench Plan mode. | Yes | This is the operator surface. If the UI stays generic, everything downstream feels fragmented. |
| `plan-task-run-intelligence` | The execution brain: plan registry, task/run/proof ledgers, resumable workstreams, capture packets, status export, phone/web sync. | Yes | This is how the system stops losing decisions and stops multiplying stale plans. |
| `build-intent-fulfillment-trace` | The build reliability layer: BuildIntent v2, request fulfillment, trace, proof, workflow-as-data, pipeline visualizer, eval harnesses. | Yes | This is how the factory learns from every site instead of only surviving each build. |
| `site-mbsh-reunion` | Site-scoped production proof for MBSH: backend, RSVP, sponsor flow, media, chatbot, deploy, content, and reusable platform gaps. | Yes | This is the near-term revenue/proof case and should not be buried inside platform planning. |

---

## What Gets Absorbed

| Old Plan / Document | Keep As Active? | Destination |
|---|---:|---|
| `famtastic-total-ask-plan` | No | Park as strategy context. Absorb useful chunks into the four parent plans below. |
| `studio-master-plan` | No | Absorb into `studio-workbench-foundation`. |
| `multi-agent-resumable-plan-system` | No | Absorb into `plan-task-run-intelligence`. |
| `shay-process-intelligence` | No separate parent | Absorb into `plan-task-run-intelligence`; preserve the workstream packet as source evidence. |
| `build-orchestration-trace` | No separate parent | Absorb into `build-intent-fulfillment-trace`. |
| `canonical-build-intent-v2` | No separate parent | Absorb into `build-intent-fulfillment-trace`. |
| `baseline-closure-review` | No separate parent | Convert unresolved items into `build-intent-fulfillment-trace` tasks; close verified items as evidence. |
| `gap-123-4-closure` | No | Attach closure proof to `build-intent-fulfillment-trace`; only promote gaps still failing. |
| `p0-p1-diagnostics` | No | Attach diagnostics as evidence; promote only live issues. |
| `outstanding-iterative-roadmap` | No | Dissolve into concrete tasks under the four parent plans. |

---

## Total Ask Items To Keep

### Do Not Carry Forward As Open Work

- Drive sync fix and Drive diff report: marked complete. Keep as proof/context only, not as an active task.

### Keep Under `studio-workbench-foundation`

- Shay v2 as an ambient operator surface, not a disconnected widget.
- Studio family identity: Site Studio, Media Studio, Component Studio, Research/Brainstorm surfaces on shared platform services.
- Prompt-first Media Studio: center work surface for generation, comparison, approval, promotion, and library use.
- Page/workspace discovery before design implementation.
- Plan-then-approve in the UI for changes, deploys, expensive generation, and canonical writes.

### Keep Under `plan-task-run-intelligence`

- Capture Flywheel: conversation import, extraction, review, canonical promotion.
- Persistent plan packets above jobs.
- Append-only task/run/proof/research ledgers.
- Web/phone status export so non-filesystem surfaces stop guessing.
- Knowledge capture that routes decisions, gaps, contradictions, and lessons to the right canonical files.

### Keep Under `build-intent-fulfillment-trace`

- Workflow-as-data: still open. Phase it from instrumentation first to declarative stages later.
- Pipeline visualizer: still open. Build inspect, trace, and propose first; reorder, swap, compare, and history later.
- Long-context fixes: prompt caching for injection bloat, structured stage handoffs for accumulation bloat, isolated sub-agents for monolithic-context bloat.
- Evaluation/audit harnesses that output both a verdict and a system-improvement backlog.
- Three site workflows: `new_site_from_brief`, `adapt_existing_site`, `rebuild_from_brief`.

### Keep Under `site-mbsh-reunion`

- MBSH as the immediate revenue/proof site.
- Site-specific backend, RSVP, sponsor, media, chatbot, deploy, and content work.
- Reusable platform gaps promoted upward only when they generalize beyond MBSH.
- Audit proof that Studio can or cannot reproduce the site from intent.

---

## Priority Checklist

### P0 — Make The System Executable

- [ ] Rewrite `plans/registry.json` to the four active parent plans above.
- [ ] Back up the current registry before rewrite.
- [ ] Promote embedded registry task arrays into `tasks/tasks.jsonl` with `plan_id`, priority, owner/runner, acceptance, proof requirement, and status.
- [ ] Add at least one `runs/runs.jsonl` record for the consolidation run.
- [ ] Add proof records for the freeze, consolidation, and any closed baseline/gap evidence.
- [ ] Update `FAMTASTIC-STATUS.md` from the consolidated registry.

### P0 — Protect The Workbench Direction

- [ ] Rebuild Workbench against `docs/STUDIO-UI-FOUNDATION.md`, not against the earlier generic prototype.
- [ ] Make every workspace declare its workspace contract before implementation.
- [ ] Keep Media as **Media Studio**, with prompt input as the primary center work surface and library/tooling as support.
- [x] Wire Workbench Plan mode to registry/task/run/proof data instead of static demo data.

### P0 — Prove Builds Through Actual Studio

- [ ] Test through Site Studio UI using Playwright browser automation.
- [ ] Use actual Shay/Shay-Shay calls where the feature is a Shay behavior.
- [ ] Record exact Studio message, observed failure/success, CLI workaround if any, and proposed GUI fix for every gap.
- [ ] Do not use WebSocket shortcuts as proof for Studio behavior.

### P1 — Make Shay/Plans Resumable

- [x] Add `fam-hub plan review` for consolidation/drift checks.
- [x] Add `fam-hub task promote` to move plan tasks into the task ledger.
- [x] Add `fam-hub run start` with targets like `complete`, `timebox`, `until_blocked`, and report-back rules.
- [ ] Add automatic status export from registry and ledgers.
- [ ] Register Workbench as a Shay context provider: domain, route, selected object, selected tool, proof state, open plan/run.

### P1 — Make Build Intent Auditable

- [ ] Declare BuildIntent v2 current and archive/supersede v1.
- [ ] Attach baseline closure, gap 1/2/3/4, and P0/P1 diagnostics as evidence.
- [ ] Promote only unresolved diagnostics into active tasks.
- [ ] Surface fulfillment status in Workbench: requested, completed, deferred, placeholdered, proof.
- [ ] Instrument `parallelBuild()` before refactoring it.
- [ ] Start workflow-as-data phase 1: define stage names, boundaries, inputs, outputs, and proof events without changing execution order.

### P1 — Move MBSH Without Losing Platform Learnings

- [ ] Create site-scoped tasks for MBSH backend, RSVP, sponsor, media, chatbot, deploy, content, and proof.
- [ ] Separate MBSH-specific asks from reusable Studio/platform gaps.
- [ ] Promote generalized gaps upward to the appropriate parent plan.
- [ ] Keep deploy repo state separate from Studio repo state.

### P2 — Build The Higher-Order Surfaces

- [ ] Build Process Map / Recipe Map UI after traces are trustworthy.
- [ ] Add pipeline visualizer inspect + trace + propose.
- [ ] Add conversation capture import/review/promotion workflow.
- [ ] Add component/artifact schema enforcement after Workbench registry wiring is real.
- [ ] Add capability graph once current capabilities are reliably discoverable.

---

## What Is Not Needed Now

- A fifth active Total Ask plan.
- Drive sync as an active task; it is complete and should only appear as proof/context.
- More wave documents.
- More generic Workbench layout passes before page/workspace discovery.
- A visualizer before instrumentation exists.
- A multi-agent plan board before task/run/proof ledgers have real records.

---

## Next Apply Step

If this shape is approved, apply it in this order:

1. Create `plans/registry.backup-2026-05-04.json`.
2. Rewrite `plans/registry.json` to four active parent records plus parked/evidence records.
3. Promote P0 tasks into `tasks/tasks.jsonl`.
4. Add one run record for the consolidation.
5. Regenerate `FAMTASTIC-STATUS.md`.
6. Update `SITE-LEARNINGS.md`, `FAMTASTIC-STATE.md`, and `CHANGELOG.md`.
7. Commit with a human-readable docs message.
