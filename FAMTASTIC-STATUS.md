# FAMTastic Status Packet

**Updated:** 2026-05-04  
**Source of truth:** `plans/registry.json`  
**Purpose:** Read-only status mirror for Claude Web, phone, and other surfaces that may not have direct filesystem access.

## Current Reality

- The plan stack is consolidated to four active parent plans.
- `docs/famtastic-total-ask-plan.md` is parked as strategy context, not active execution truth.
- Drive sync is marked complete and should not be carried as open work.
- Workflow-as-data phase 1 is cataloged and `parallelBuild()` now emits trace stage events; the pipeline visualizer remains open under `build-intent-fulfillment-trace`.
- Task, run, and proof ledgers now contain first records.
- Workbench Plan mode now reads a browser-safe consolidated plan state packet at `site-studio/public/data/workbench-plan-state.json`.
- Workbench Foundation now follows the frozen seven-domain left rail, exposes contract pills in the workspace chrome, and keeps Media as prompt-first **Media Studio**.
- Actual Shay-Shay UI proof passed through Studio with the message `system status`; two UI bugs were fixed in the process.

## Active Parent Plans

| Plan | Status | Next action |
|---|---|---|
| `studio-workbench-foundation` | Active parent plan | Register Workbench as a Shay context provider after the frozen-contract rail/contracts and Plan mode wiring. |
| `plan-task-run-intelligence` | Active parent plan | Use the promoted task/run/proof ledgers as the operating checklist and build review/promote/start commands. |
| `build-intent-fulfillment-trace` | Active parent plan | Use the new trace events and stage catalog before building visualizer inspect/trace/propose. |
| `site-mbsh-reunion` | Site-scoped active parent plan | Execute the new site-scoped backend/RSVP/sponsor/deploy/media/chatbot/content/proof tasks and promote reusable gaps upward only when generalized. |

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

1. P0: Use Playwright and actual Shay/Shay-Shay calls for Studio behavior proof.
2. P0/P1: Execute MBSH backend, RSVP, sponsor, deploy, media, chatbot, content, and audit harness tasks.
3. P1/P2: Build pipeline visualizer inspect + trace + propose from real trace events.
4. P1: Register Workbench as a Shay context provider and automate status-packet regeneration.
5. P1: Build the first usable knowledge-capture pass.

## Newly Available

- `fam-hub plan review`
- `fam-hub task promote --dry-run`
- `fam-hub task promote --apply`
- `fam-hub run start <plan-id> [target] [--dry-run]`

## Still Missing

- Studio Plans panel rendering from registry/ledgers.
- Workbench Shay context provider.
- Automatic status-packet regeneration from code instead of manual update.
- Media Studio controls are still not unified between the Workbench surface and the richer production mini-app.
- Studio console still has non-blocking cleanup noise from the Shay proof: Tailwind CDN warning, unsupported preload `as`, and `/config/site-config.json` 404.
