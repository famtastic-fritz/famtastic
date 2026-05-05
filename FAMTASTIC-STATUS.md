# FAMTastic Status Packet

**Updated:** 2026-05-05
**Source of truth:** `plans/registry.json`  
**Purpose:** Read-only status mirror for Claude Web, phone, and other surfaces that may not have direct filesystem access.

## Current Reality

- The plan stack has five active parent plans: the four consolidation parents plus the Ops Workspace GUI parent registered on 2026-05-05.
- `docs/famtastic-total-ask-plan.md` is parked as strategy context, not active execution truth.
- Drive sync is marked complete and should not be carried as open work.
- Workflow-as-data phase 1 is cataloged and `parallelBuild()` now emits trace stage events; the pipeline visualizer remains open under `build-intent-fulfillment-trace`.
- Task, run, and proof ledgers now contain first records.
- Workbench Plan mode now reads a browser-safe consolidated plan state packet at `site-studio/public/data/workbench-plan-state.json`.
- Workbench Foundation now follows the frozen seven-domain left rail, exposes contract pills in the workspace chrome, and keeps Media as prompt-first **Media Studio**.
- Actual Shay-Shay UI proof passed through Studio with the message `system status`; two UI bugs were fixed in the process.
- Workbench is now registered as `workbench.foundation` in `ShayContextRegistry`; an actual Shay-Shay UI call received `context.page_context.domain = media` and answered from that context.
- The first usable knowledge-capture pass exists: `fam-hub capture extract <source-file>` writes review-only packets under `captures/review/`.
- The three site workflow modes are defined in `architecture/site-workflow-modes-2026-05-04.md`: `new_site_from_brief`, `adapt_existing_site`, and `rebuild_from_brief`.
- MBSH backend endpoint inventory is complete at `docs/sites/site-mbsh-reunion/backend-endpoint-inventory-2026-05-04.md`.
- MBSH RSVP and sponsor frontend submission paths are browser-verified against the actual deploy repo pages; the shared anti-bot timing helper and RSVP public-attendee opt-out serialization are fixed in `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/`.
- Workbench pipeline visualizer phase 1 is live in Plan mode: inspect reads the workflow stage catalog, trace reads `/api/trace`, and propose shows review-first next changes.
- MBSH Chatbot Phase 1 is browser-verified for the eight FAQ answers and fallback payload.
- MBSH content deltas, reproduction audit harness, and generalized platform gaps are documented.
- MBSH media/story readiness is complete for launch-safe generated/derivative assets. The seven referenced `frontend/assets/story/*.jpg` files now exist in the v2 deploy repo, and provenance is documented in `frontend/assets/story/RIGHTS-MANIFEST.md`.
- MBSH live deploy proof is blocked by external access/config: Netlify, DNS, GoDaddy/PHP/MySQL, Resend, backend secrets, and production `API_BASE_URL`.

## Active Parent Plans

| Plan | Status | Next action |
|---|---|---|
| `studio-workbench-foundation` | Active parent plan | Default-shell cutover, automatic status-packet regeneration, and Media Studio unification remain after the Workbench context provider proof. |
| `plan-task-run-intelligence` | Active parent plan | Use the promoted task/run/proof ledgers as the operating checklist and build review/promote/start commands. |
| `build-intent-fulfillment-trace` | Active parent plan | Pipeline visualizer phase 1 is live; next work is stage/event matching and missing-stage detection. |
| `site-mbsh-reunion` | Site-scoped active parent plan | Media/story readiness is complete; only live deploy proof remains blocked by external production access/config. |
| `plan_2026_05_05_ops_workspace_gui` | Active parent plan | Build the Ops read/freshness substrate before command mutations or Jobs tab UI implementation. |

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

1. P0 blocked: Provision MBSH live deploy access/config and run production smoke + rollback proof.
2. P1/P2: Extend pipeline visualizer from phase-one inspect/trace/propose into stage/event matching and missing-stage detection.
3. P1: Add reviewed promotion from capture packets into canonical memory.
4. P1: Automate status-packet regeneration and continue Workbench default-shell / Media Studio unification work.

## Newly Available

- `fam-hub plan review`
- `fam-hub task promote --dry-run`
- `fam-hub task promote --apply`
- `fam-hub run start <plan-id> [target] [--dry-run]`

## Still Missing

- Studio Plans panel rendering from registry/ledgers.
- Automatic status-packet regeneration from code instead of manual update.
- Media Studio controls are still not unified between the Workbench surface and the richer production mini-app.
- Pipeline visualizer phase 1 is live, but stage/event matching and proposed patch preview are not implemented.
- MBSH backend runtime execution is blocked by missing `.env`, `.mbsh-config.local.php`, or `MBSH_CONFIG_PATH` runtime config, plus external Netlify/DNS/GoDaddy/Resend access for live proof.
- Future archival/crowd-sourced replacement media for MBSH still needs attribution and approval logging before replacing the launch-safe generated/derivative story assets.
- Studio console still has non-blocking cleanup noise from the Shay proof: Tailwind CDN warning, unsupported preload `as`, and `/config/site-config.json` 404.
