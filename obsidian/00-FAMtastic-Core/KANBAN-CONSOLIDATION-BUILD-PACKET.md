# Build Packet — Kanban.db Consolidation (one job store, one board)

> Closes the last gap from `COMMAND-CENTER-UX-SPEC.md`: the **duplicate job store**.
> Today the phone dispatches to `shay-phone/jobs.json` and the runner/Tasks tab read
> that — but Shay's real task system is `~/.shay/kanban.db`. Two stores = drift. This
> makes **`kanban.db` the single source of truth** for jobs, so "add / view / move a
> job" works the same on phone, runner, and laptop dashboard. The event spine
> (`~/.shay/events.jsonl`) stays the live nerve — unchanged.

## Goal (acceptance criteria — the build is done when ALL pass)
1. Dispatch a job from the **phone** → a row appears in **`kanban.db`** (Queued lane).
2. The **job runner** picks it up from `kanban.db`, runs it, and writes status +
   result back **to `kanban.db`** (Running → Done/Failed) + emits to the spine.
3. The phone **Tasks/Jobs tab** shows that job's live status read **from `kanban.db`**.
4. The **laptop dashboard** renders a real **board** (Queued / Running / Done lanes)
   from `kanban.db`, and a job dispatched anywhere shows in all three within seconds.
5. `jobs.json` is migrated once, then **retired** (or kept as a read-only mirror) —
   no new writes to it. No duplicate truth remains.

## Doctrine for this build
- **Reuse before generate.** If Shay already has a CLI/API/function that *creates*
  a task in `kanban.db` (with whatever triggers/defaults/`task_events` rows her
  system expects), the phone + runner MUST call THAT, not raw `INSERT`. Inventing a
  parallel write path is how the two-store drift started. Raw SQL only if no
  create-path exists.
- **Stdlib-safe.** The phone server + runner are stdlib-only; `sqlite3` is stdlib, so
  reading/writing `kanban.db` adds no deps. Keep it that way.
- **Spine stays the nerve.** Every state change still emits to `events.jsonl` exactly
  as it does now — the board reads jobs from `kanban.db`, the feed reads from the spine.

## STEP 0 (Shay, unblocks everything) — surface the real schema
Before any code, dump the truth so we conform to it, not guess:
```bash
sqlite3 ~/.shay/kanban.db ".schema"                 # full schema
sqlite3 ~/.shay/kanban.db ".tables"
sqlite3 ~/.shay/kanban.db "SELECT * FROM <tasks-table> LIMIT 3;"   # a few real rows
```
Report: the **tasks table name + columns**, the **status/lane column** and its allowed
values (where does "queued/running/done" live — a status enum? a lane/column id?),
the **id/created/updated** columns, and **whether a CLI/API exists to create a task**
(e.g. `shay kanban add …`, a gateway endpoint, or a Python function). That tells us
the exact mapping for the fields below.

## Field mapping (phone job → kanban.db task) — fill from STEP 0
| phone job (`jobs.json`) | kanban.db task (to confirm) |
|---|---|
| `id` | task id (let kanban generate; keep phone id in a note/external-ref field) |
| `goal` | title / description |
| `status` queued/running/completed/failed/cancelled | status enum / lane id |
| `created/started/completed` | created_at / updated_at / done_at |
| `output` | result field, or a `task_comments`/`task_events` row |
| `progress[]` | `task_events` rows (Shay's schema already has these) |
| `policy/priority` | priority field if present, else a tag |

## STEP 1 — Phone writes to kanban.db (`shay-phone/server.py`)
`dispatch_job()` calls Shay's task-create path (or `sqlite3` INSERT per STEP 0),
returns the kanban task id, and still `emit_event("task_start", …, source="phone")`.
`list_jobs()` / `/api/jobs` read from `kanban.db` (newest first, with status).

## STEP 2 — Runner reads/writes kanban.db (`scripts/shay/job-runner.py`)
`claim_next_job()` selects the oldest Queued task from `kanban.db` (atomic update to
Running), runs it through the gateway (unchanged), writes result + Done/Failed back to
`kanban.db`, appends progress as `task_events`, and emits to the spine as it does now.
Keep the `SHAY_JOB_RUNNER_MOCK` + `--once` modes.

## STEP 3 — Dashboard board (`shay-agent-os/api` + `components/dashboard`)
- API: add `GET /api/board` (or extend `/api/tasks`) reading `kanban.db` grouped by
  lane → `{ queued:[], running:[], done:[] }`. (Optional `POST` to move a lane.)
- UI: render three columns in the Workspace pane from `/api/board`; each card = a job
  (title, status dot, age). Dispatch box creates a Queued task. Live-refresh off the
  existing event stream (a `task_*` event → refetch the board).

## STEP 4 — Migrate + retire jobs.json
One-time importer: read `shay-phone/jobs.json`, create the equivalent `kanban.db`
tasks (idempotent — skip ids already imported), then point everything off jobs.json.
Keep `jobs.json` as a timestamped backup; stop writing to it.

## Division of labor (proposed)
- **Shay (owns kanban.db):** STEP 0 (schema dump) + confirm/expose the task-create path.
- **Claude (repo, can test):** STEP 1–4 code against the confirmed schema, with
  `MOCK`/`--once` tests + the dashboard's tsc+build gates, committed to `main`.

> Nothing here touches the working loop until it's ready — build behind the current
> `jobs.json` path, cut over only when acceptance #1–5 pass.
