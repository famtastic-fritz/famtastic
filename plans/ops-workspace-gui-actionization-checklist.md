# Ops Workspace GUI Actionization Checklist

## Goal

Convert `plans/plan_2026_05_05_ops_workspace_gui/plan.json` from a proposed design packet into executable tasks without adding a fifth active parent plan prematurely.

## Action Items

1. Keep the four active parent plans as the registry truth.
2. Treat the Ops GUI packet as proposed source material until API/schema/UI proof exists.
3. Promote only the MVP substrate into tasks first: Ops read endpoints, freshness state, record-type visual language, and Jobs tab MVP.
4. Put ledger/API work under `plan-task-run-intelligence`.
5. Put Workbench UI shell work under `studio-workbench-foundation`.
6. Do not show stale legacy worker-queue records as live work; quarantine them as stale debt.
7. Require browser proof through Studio before any Ops tab is called implemented.

## Acceptance

- `active_parent_ids` and `.plans` agree.
- Ops GUI work appears as tasks under existing parents, not as an invalid fifth parent.
- The first implementation slice is small enough to prove end-to-end: API read model + Jobs tab MVP.

## Hard Stops

- Do not create `/api/ops/*` command mutations until read endpoints and freshness semantics are proven.
- Do not purge stale queue debt without an archive/rollback record.
