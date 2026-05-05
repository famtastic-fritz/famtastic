# Remaining Plan Triage — 2026-05-05

## Verdict

Keep the four active parent plans. Do not reopen the parked/absorbed plans. The stale part is not the four-parent structure; the stale part is that yesterday's completed slices are still described as next work in `plans/registry.json`.

## Closed, Do Not Re-Plan

These were plans or plan-like asks, but they have enough task/proof evidence to stay closed:

| Area | Closed evidence |
|---|---|
| Drive sync | Marked complete and parked; no active task remains. |
| Four-plan consolidation | `plans/registry.json`, `tasks/tasks.jsonl`, `runs/runs.jsonl`, `proofs/proof-ledger.jsonl`, and `FAMTASTIC-STATUS.md` exist. |
| Workbench frozen foundation | Seven-domain rail, contract pills, prompt-first Media Studio, and Plan mode were implemented and browser-proven. |
| Workbench Shay context | `workbench.foundation` provider is registered and actual Shay-Shay UI proof passed. |
| Knowledge capture pass 1 | `fam-hub capture extract <source-file>` creates review-only capture packets. |
| Workflow-as-data phase 1 | Stage catalog exists and `parallelBuild()` emits trace events. |
| Pipeline visualizer phase 1 | Workbench Plan mode renders inspect, trace, and propose lanes. |
| Three site workflow modes | `new_site_from_brief`, `adapt_existing_site`, and `rebuild_from_brief` are documented as architecture contracts. |
| MBSH backend/RSVP/sponsor/chatbot/content/audit/gap proof | Site-scoped proof packets exist; backend runtime proof is intentionally folded into deploy blockers. |

## Blocked Work

These are still real, but not runnable until the blocker changes.

| Task | Plan | Priority | Blocker |
|---|---|---|---|
| `task-2026-05-04-027` Finish MBSH deploy proof | `site-mbsh-reunion` | P0 | Needs Netlify, DNS, GoDaddy/PHP/MySQL, Resend, backend secrets, and production `API_BASE_URL`. |
| `task-2026-05-04-028` Complete MBSH media/story assets | `site-mbsh-reunion` | P1 | Needs seven referenced story images plus rights/approval manifest. |

## Needs Action-Item Development

These are the remaining plan-shaped asks that should become the next executable checklist.

| New task | Parent plan | Priority | Why it is still needed |
|---|---|---|---|
| `task-2026-05-05-001` Define Workbench default-shell cutover checklist | `studio-workbench-foundation` | P1 | Workbench is linked and proven, but not the default Studio shell. |
| `task-2026-05-05-002` Define Media Studio unification checklist | `studio-workbench-foundation` | P1 | Workbench has prompt-first Media Studio; production Studio has richer controls. They are not unified. |
| `task-2026-05-05-003` Define automatic status-packet regeneration checklist | `plan-task-run-intelligence` | P1 | `workbench-plan-state.json` and `FAMTASTIC-STATUS.md` are still manually updated mirrors. |
| `task-2026-05-05-004` Define capture-packet promotion checklist | `plan-task-run-intelligence` | P1 | Capture extraction exists, but canonical promotion is manual. |
| `task-2026-05-05-005` Define pipeline visualizer phase 2 checklist | `build-intent-fulfillment-trace` | P1 | Phase 1 is live; stage/event matching and missing-stage detection remain. |
| `task-2026-05-05-006` Define MBSH deploy access handoff checklist | `site-mbsh-reunion` | P0 | The live deploy proof is blocked, but the exact access/config handoff can be made ready now. |
| `task-2026-05-05-007` Define MBSH media/story readiness checklist | `site-mbsh-reunion` | P1 | The media blocker needs an asset list, generation/import path, and rights manifest before it becomes runnable. |

## Priority Order

1. P0 ready: `task-2026-05-05-006` MBSH deploy access handoff checklist.
2. P1 ready: `task-2026-05-05-003` automatic status-packet regeneration checklist.
3. P1 ready: `task-2026-05-05-004` capture-packet promotion checklist.
4. P1 ready: `task-2026-05-05-001` Workbench default-shell cutover checklist.
5. P1 ready: `task-2026-05-05-002` Media Studio unification checklist.
6. P1 ready: `task-2026-05-05-005` pipeline visualizer phase 2 checklist.
7. P1 ready: `task-2026-05-05-007` MBSH media/story readiness checklist.
8. P0 blocked: `task-2026-05-04-027` MBSH live deploy proof.
9. P1 blocked: `task-2026-05-04-028` MBSH media/story assets.

## Non-Active Records

These stay out of active execution:

| Record | Disposition |
|---|---|
| `famtastic-total-ask-plan` | Parked strategy context; useful asks are mapped to the four parent plans. |
| `studio-master-plan` | Absorbed into `studio-workbench-foundation`. |
| `multi-agent-resumable-plan-system` | Absorbed into `plan-task-run-intelligence`. |
| `shay-process-intelligence` | Source packet for `plan-task-run-intelligence`. |
| `build-orchestration-trace` | Absorbed into `build-intent-fulfillment-trace`. |
| `canonical-build-intent-v2` | Absorbed into `build-intent-fulfillment-trace`. |
| `baseline-closure-review`, `gap-123-4-closure`, `p0-p1-diagnostics` | Evidence only. |
| `outstanding-iterative-roadmap` | Dissolved into task ledgers; only explicitly promoted work stays active. |
| `plan_2026_05_05_ops_workspace_gui` | Proposed design packet; not a fifth active parent. It should be actionized under `studio-workbench-foundation` and `plan-task-run-intelligence` before any registry parent expansion. |

## Proposed Plan Needing Actionization

`plans/plan_2026_05_05_ops_workspace_gui/plan.json` is useful, but it is not yet executable reality. It defines an Ops workspace concept with 11 tabs, record-type visual language, and a Jobs-tab MVP. The correct treatment is:

1. Keep it out of `active_parent_ids` until a real parent-plan expansion is intentionally approved.
2. Convert its MVP into concrete tasks under the existing four-plan registry.
3. Start with the substrate: Ops read endpoints, freshness state, and record-type visual tokens.
4. Then build the Jobs tab MVP as the first UI slice.
