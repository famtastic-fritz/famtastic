# Ops State Contract

> Generated mirror of `plans/plan_2026_05_05_ops_workspace_gui/plan.json`
> `ws_phase0_state_contract.source_of_truth_matrix` and
> `freshness_derivation_table`.
>
> **The plan is the contract.** This document is a human-readable mirror.
> If they diverge, the plan wins and this file must be regenerated.

## Why this exists

The "false agents waiting" bug came from a UI counting stale `.worker-queue`
items as live work. This contract guarantees:

1. Every record type has exactly one authoritative file (writers list is
   closed).
2. Freshness (`live | idle | stale | parked | archived`) is **derived** from
   `(record_type, status, age_seconds)` — never stored as a parallel field.
3. `parked | archived | stale` records can never inflate any "live" count,
   lane, KPI tile, or Shay-Shay narration.
4. Every destructive `/api/ops/command/*` endpoint requires a governance
   approval token matching `plans/registry.json` `governance.hard_stop_conditions`.
5. Every GET `/api/ops/*` response is wrapped:
   `{ snapshot_version, generated_at, source_ledgers[], record_count, data }`.
6. Every `/ws/ops` topic message carries `{ snapshot_version, sequence_id }`;
   on gap or reconnect the client refetches the GET snapshot.

## Source-of-truth matrix

| Type | Authoritative file | Precedence rule | Writers allowed |
|---|---|---|---|
| plan | `plans/registry.json` | `registry.json` wins; `plan_*/plan.json` is detail-only and merged in | `fam-hub plan *`, `Ops API command/plan/*` |
| task | `tasks/tasks.jsonl` | `tasks.jsonl` wins; `site-studio/public/data/workbench-plan-state.json` is a derived mirror, never authoritative | `fam-hub task *`, `Ops API command/task/*` |
| job | `jobs/jobs.jsonl` + site-studio SQLite | SQLite wins for live state; `jobs.jsonl` is the durable append log; on conflict, replay log into SQLite and snapshot | site-studio dispatcher, `Ops API command/job/*` |
| run | `runs/runs.jsonl` | append-only; never mutated | site-studio runner, `Ops API command/run/*` |
| proof | `proofs/proof-ledger.jsonl` | ledger wins; physical artifacts under `proofs/` are immutable | `fam-hub proof attach`, `Ops API command/proof/*` |
| gap | `docs/ops/gaps.jsonl` (new) | gaps.jsonl wins; `SITE-LEARNINGS.md` known-gaps section is a derived human view | `fam-hub gap log`, `Ops API command/gap/*` |
| memory | `.wolf/cerebrum.md` + `memory/*.md` | `cerebrum.md` wins for Do-Not-Repeat / Decisions; `memory/*.md` wins for typed entries; conflict surfaces a Review | `fam-hub memory *`, `Ops API command/memory/*` |
| review | `reviews/reviews.jsonl` (new) | reviews.jsonl wins; per-round packets stored under `proofs/reviews/` | adversarial review loop, `fam-hub review *` |
| debt | `docs/ops/debt-inventory-YYYY-MM-DD.json` | latest dated inventory wins; older snapshots are historical only | `scripts/ops/inventory.js` |
| legacy_queue | `.worker-queue.backup-*.jsonl` | Read-only; lives only in Stale Debt drawer; never enters live lanes | (none) |

## Freshness derivation rules

Inputs: `(record_type, status, age_seconds_since_last_update)`.
Outputs: `freshness ∈ { live, idle, stale, parked, archived }`.

Age thresholds:
- `idle` boundary: 600 s (10 min)
- `stale` boundary: 604_800 s (7 d)
- `archived` boundary: 7_776_000 s (90 d)

| record_type | status | age < idle | age < stale | age < archived | age ≥ archived |
|---|---|---|---|---|---|
| job | running | live | live | live | live |
| job | pending | live | idle | stale | stale |
| job | approved | live | idle | stale | stale |
| job | blocked | live | live | stale | stale |
| job | done | idle | idle | idle | archived |
| job | failed | live | live | stale | stale |
| job | parked | parked | parked | parked | parked |
| task | in_progress | live | live | live | live |
| task | ready / backlog | live | live | stale | stale |
| task | waiting_on_me | live | live | live | live |
| task | waiting_on_agent | live | live | live | live |
| task | blocked | live | live | stale | stale |
| task | completed | idle | idle | idle | archived |
| run | active | live | live | live | live |
| run | done / failed | idle | idle | idle | archived |
| proof | passed / recorded / passed_with_blockers | live | live | live | archived |
| proof | blocked | stale | stale | stale | stale |
| plan | active | live | live | live | live |
| plan | proposed | live | live | stale | stale |
| plan | paused | parked | parked | parked | parked |
| plan | absorbed / completed | archived | archived | archived | archived |
| legacy_queue | * | parked | parked | parked | parked |

**Invariant** (enforced by `tests/ops/stale-cannot-inflate-live.test.js`):
`freshness ∈ {parked, archived, stale}` can NEVER appear in any
"live" count, lane, or KPI tile.

## Cross-link schema additions (planned, not yet migrated)

These fields will be written by new commands; existing records are not
back-filled. Readers must treat absence as "no link".

- **task**: `origin_job_id`, `promoted_from`
- **job**: `promoted_to_task_id`
- **review**: `reviews_record_id`, `reviews_record_type`
- **gap**: `converted_to_task_id`

## Destructive-action policy

`POST /api/ops/command/*` actions classified as destructive:

- `purge` — physical delete of legacy queue lines
- `cancel` (running) — interrupt a live runner
- `archive` — bulk archival affecting >1 record
- `promote` — write across two ledgers
- `migrate` — bulk migration writing to multiple ledgers

These reject with HTTP 403 unless the request carries a governance token
matching the conditions in `plans/registry.json` `governance.hard_stop_conditions`.

In MVP the gate is wired but token issuance is deferred — every destructive
call returns 403 with body `{ error: "governance_token_required", hard_stops: [...] }`.

## Snapshot envelope

Every `GET /api/ops/*` returns:

```json
{
  "snapshot_version": "ops-2026-05-05T15:30:00.000Z",
  "generated_at": "2026-05-05T15:30:00.000Z",
  "source_ledgers": ["jobs/jobs.jsonl"],
  "record_count": 0,
  "data": []
}
```

## WebSocket reconcile contract (deferred to post-MVP commit)

Every `/ws/ops` message carries `{ snapshot_version, sequence_id }`. The
client tracks the last `sequence_id` per topic. On gap (received id ≠
expected + 1) or reconnect, the client discards in-memory state and refetches
the matching `GET /api/ops/*`. WS is not implemented in MVP — Jobs tab
polls the GET endpoint every 5s.
