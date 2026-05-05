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
- Workbench is now registered as `workbench.foundation` in `ShayContextRegistry`; an actual Shay-Shay UI call received `context.page_context.domain = media` and answered from that context.
- The three site workflow modes are defined in `architecture/site-workflow-modes-2026-05-04.md`: `new_site_from_brief`, `adapt_existing_site`, and `rebuild_from_brief`.
- MBSH backend endpoint inventory is complete at `docs/sites/site-mbsh-reunion/backend-endpoint-inventory-2026-05-04.md`; endpoint execution remains blocked until runtime config/secrets are provisioned.

## Active Parent Plans

| Plan | Status | Next action |
|---|---|---|
| `studio-workbench-foundation` | Active parent plan | Default-shell cutover, automatic status-packet regeneration, and Media Studio unification remain after the Workbench context provider proof. |
| `plan-task-run-intelligence` | Active parent plan | Use the promoted task/run/proof ledgers as the operating checklist and build review/promote/start commands. |
| `build-intent-fulfillment-trace` | Active parent plan | Use the new trace events, stage catalog, and workflow-mode contracts before building visualizer inspect/trace/propose. |
| `site-mbsh-reunion` | Site-scoped active parent plan | Execute RSVP, sponsor, deploy, media, chatbot, content, proof, and audit tasks; backend inventory is complete. |

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

1. P0: Execute MBSH RSVP, sponsor, and deploy proof tasks once local/production runtime config is available.
2. P1: Build the first usable knowledge-capture pass.
3. P1/P2: Build pipeline visualizer inspect + trace + propose from real trace events and workflow-mode contracts.
4. P1: Complete MBSH media, chatbot, content deltas, Studio reproduction audit, and generalized gap promotion.
5. P1: Automate status-packet regeneration and continue Workbench default-shell / Media Studio unification work.

## Newly Available

- `fam-hub plan review`
- `fam-hub task promote --dry-run`
- `fam-hub task promote --apply`
- `fam-hub run start <plan-id> [target] [--dry-run]`

## Still Missing

- Studio Plans panel rendering from registry/ledgers.
- Automatic status-packet regeneration from code instead of manual update.
- Media Studio controls are still not unified between the Workbench surface and the richer production mini-app.
- MBSH local endpoint execution is blocked by missing `.env`, `.mbsh-config.local.php`, or `MBSH_CONFIG_PATH` runtime config.
- Studio console still has non-blocking cleanup noise from the Shay proof: Tailwind CDN warning, unsupported preload `as`, and `/config/site-config.json` 404.
