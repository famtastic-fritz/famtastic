# FAMTastic Status Packet

**Updated:** 2026-05-04  
**Source of truth:** `plans/registry.json`  
**Purpose:** Read-only status mirror for Claude Web, phone, and other surfaces that may not have direct filesystem access.

## Current Reality

- The plan stack is consolidated to four active parent plans.
- `docs/famtastic-total-ask-plan.md` is parked as strategy context, not active execution truth.
- Drive sync is marked complete and should not be carried as open work.
- Workflow-as-data and the pipeline visualizer remain open under `build-intent-fulfillment-trace`.
- Task, run, and proof ledgers now contain first records.
- Workbench Plan mode now reads a browser-safe consolidated plan state packet at `site-studio/public/data/workbench-plan-state.json`.

## Active Parent Plans

| Plan | Status | Next action |
|---|---|---|
| `studio-workbench-foundation` | Active parent plan | Continue the frozen-contract Workbench rebuild now that Plan mode reads consolidated plan state. |
| `plan-task-run-intelligence` | Active parent plan | Use the promoted task/run/proof ledgers as the operating checklist and build review/promote/start commands. |
| `build-intent-fulfillment-trace` | Active parent plan | Instrument `parallelBuild()` before declarative workflow refactor or visualizer work. |
| `site-mbsh-reunion` | Site-scoped active parent plan | Split MBSH site work into backend/RSVP/sponsor/media/chatbot/deploy/content/proof tasks and promote reusable gaps upward. |

## Current Run

`run-2026-05-04-consolidation-apply` is active under `plan-task-run-intelligence` with target `complete_p0_then_report`.

## Local Commands

```bash
fam-hub plan list --compact
fam-hub task list
fam-hub run status
fam-hub plan show build-intent-fulfillment-trace
```

## Remaining Priority

1. P0: Rebuild the rest of Workbench against `docs/STUDIO-UI-FOUNDATION.md`.
2. P0: Use Playwright and actual Shay/Shay-Shay calls for Studio behavior proof.
3. P0/P1: Declare BuildIntent v2 current and instrument `parallelBuild()`.
4. P1/P2: Start workflow-as-data phase 1, then build pipeline visualizer inspect + trace + propose.
5. P0/P1: Split MBSH site work from reusable platform gaps.

## Newly Available

- `fam-hub plan review`
- `fam-hub task promote --dry-run`
- `fam-hub task promote --apply`
- `fam-hub run start <plan-id> [target] [--dry-run]`

## Still Missing

- Studio Plans panel rendering from registry/ledgers.
- Workbench Shay context provider.
- Automatic status-packet regeneration from code instead of manual update.
