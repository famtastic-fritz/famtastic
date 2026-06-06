# Build Packet — Kanban Consolidation (one job store, one board)

> **STEP 0 done (Shay, 2026-06-06).** The schema dump revealed the key fact that
> rewrites this plan: `shay kanban` is a **full task-lifecycle system**, not just a
> table. So the consolidation gets *simpler* — **reuse Shay's kanban, retire the
> parallel `jobs.json` + `job-runner.py`.** Don't reinvent what already exists.

## What STEP 0 found (the real architecture)
- **DB:** `~/.shay/kanban.db` · **table:** `tasks` (33 cols) · board: `default` (empty).
- **Key columns:** `id`(TEXT PK), `title`(goal), `body`(spec), `status`(lane),
  `assignee`, `priority`(int), `created_by`, `created_at/started_at/completed_at`(unix),
  `result`(worker output), `idempotency_key`(dedup), `skills`(JSON), `session_id`,
  `model_override`, + run/heartbeat/claim bookkeeping cols.
- **Lanes (`status`, `VALID_STATUSES`):** `triage → todo → scheduled → ready → running
  → review → done`, plus `blocked` and `archived` (terminal). External creators use
  `VALID_INITIAL_STATUSES = {running, blocked}` or flow through `triage`/`todo`.
- **Sibling tables:** `task_runs` (per-execution), `task_events` (lifecycle log),
  `task_comments`, `task_links` (deps), `task_attachments`, `kanban_notify_subs`.
- **CLI (the write/exec path — REUSE THIS):**
  `shay kanban create <title> [--body] [--assignee] [--priority N] [--triage]
  [--idempotency-key KEY] [--created-by NAME] [--skill S] [--json]` — plus the full
  lifecycle: `list show assign claim comment complete edit block unblock archive tail
  dispatch daemon watch stats log runs heartbeat gc`.
- **Python path (if calling in-process):** `~/.shay/hermes-agent/hermes_cli/kanban_db.py`
  (`VALID_STATUSES`, SQL helpers), `…/hermes_cli/kanban.py` (orchestrator),
  `…/tools/kanban_tools.py` (`kanban_create_task` etc.).

## The corrected architecture (reuse, don't reinvent)
```
PHONE Dispatch ──> `shay kanban create <goal> --idempotency-key <id> --created-by phone`
                        │
                   ~/.shay/kanban.db  (THE one job store)
                        │
   ┌────────────────────┼─────────────────────────┐
   ▼                    ▼                          ▼
GATEWAY dispatcher     PHONE Tasks tab           LAPTOP dashboard board
(EMBEDDED in the       reads kanban.db           reads kanban.db lanes
gateway pid, 60s tick   (/api/jobs)              (/api/board)
— picks up tasks in
status ready/todo,
spawns a worker)
                        │
                 events.jsonl spine  (still the live nerve; task_events → spine bridge)
```
- **No new runner, no separate daemon.** `job-runner.py` + `jobs.json` are *retired*
  (kept as backup). The kanban dispatcher is **embedded in the gateway** (pid on :8642,
  60-second tick) — `shay kanban daemon` is deprecated. A task created with
  `--status ready` (or `todo`) is picked up on the next tick and a worker is spawned;
  retries, runs, and events are handled there.
- **Idempotency key = the phone job id** so retries never double-create.
- The event **spine stays the nerve** — bridge `task_events` → `events.jsonl` so the
  phone Feed + dashboard feed still light up (one small shim, not a new pipeline).

## Acceptance criteria (done when ALL pass)
1. Phone Dispatch → a `tasks` row in `kanban.db` (via `shay kanban create`).
2. The kanban worker runs it → `status` flows to `done`, `result` populated.
3. Phone Tasks tab shows live status **read from `kanban.db`**.
4. Laptop dashboard renders a **board** (lanes) from `kanban.db`; a job dispatched
   anywhere appears in all views within seconds.
5. `jobs.json` no longer written; `job-runner.py` stopped. No duplicate truth.

## Division of labor (decided)
**Shay (Mac — owns kanban + phone runtime, can test the CLI live):**
- STEP 1: `shay-phone/server.py` `dispatch_job()` → shell out to
  `shay kanban create <goal> --status ready --idempotency-key <jobid> --created-by phone --json`,
  return the kanban task id; keep `emit_event("task_start", source="phone")`. (`--status
  ready` so the gateway's embedded dispatcher picks it up on the next 60s tick.)
- STEP 2: `/api/jobs` + Tasks tab → read `kanban.db` `tasks` (newest first, by lane).
- STEP 3: nothing to start — the dispatcher is **already embedded in the running
  gateway** (60s tick). Just bridge `task_events`/completion → `events.jsonl` so the
  Feed stays live.
- STEP 5: stop `job-runner.py` (pid 20298), archive `jobs.json` (one-time import of any
  open jobs via `shay kanban create --idempotency-key`).

**Claude (repo — testable against a mock kanban.db with this schema, no phone-file overlap):**
- STEP 4: `shay-agent-os/api` → `GET /api/board` reading `~/.shay/kanban.db` grouped by
  lane → `{triage,todo,…,done}`; `components/dashboard` → render the board in the
  Workspace pane, live-refresh off the event stream. Gated (tsc + vite build).

> Build behind the working `jobs.json` loop; cut over only when 1–5 pass. The current
> phone→runner→gateway loop keeps working untouched until the kanban path is proven.
