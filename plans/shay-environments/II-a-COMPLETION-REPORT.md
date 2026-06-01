# Phase 5 — Desk Background Tasks Routes — Completion Report

## Framework choice

**Native aiohttp handlers**, not a FastAPI APIRouter mounted via ASGI bridge.

Reasoning:
- The gateway's existing HTTP server (`shay-shay/gateway/platforms/api_server.py`)
  is built on `aiohttp` (`web.Application`, `web.RouteTableDef`). The existing
  `/v1/chat/completions`, `/v1/runs`, and `/api/jobs` routes are all native
  `add_get` / `add_post` registrations on the adapter's app.
- The scaffold's docstring explicitly allowed Phase 5 to "port the stubs to
  aiohttp `web.RouteTableDef` handlers" as option (b). Picking that over an
  ASGI bridge avoids dragging FastAPI/Starlette into the runtime path for one
  route family.
- The FastAPI `APIRouter` factory (`build_router()`) is preserved in the file
  as a documentation artifact / future portability hook, but is no longer the
  source of truth and is NOT mounted.

A comment at the top of `gateway/desk_tasks_routes.py` documents this choice.

## Files modified / created

```
gateway/desk_tasks_routes.py    | 841 +++++++++++++++++++++++++++++++++-------
gateway/platforms/api_server.py |  10 +
tests/gateway/test_desk_tasks_routes.py | +314 (new)
```

- `gateway/desk_tasks_routes.py` — rewritten: keeps the FastAPI scaffold for
  contract documentation, adds aiohttp handlers + a `register_desk_tasks_routes`
  entrypoint plus a tiny per-peer `_TokenBucket` for write-verb rate limits and
  an SSE iterator with the 1 KiB / 64 events/s caps from the security checklist.
- `gateway/platforms/api_server.py` — 10-line wiring block: after the existing
  `/v1/runs/{run_id}/stop` registration, calls
  `register_desk_tasks_routes(self._app, self)` inside a try/except so a
  desk-tasks import error never blocks the chat server starting up.
- `tests/gateway/test_desk_tasks_routes.py` — new test module, 12 tests, all
  pass.

## Routes implemented

| Method | Path                                  | Status |
| ------ | ------------------------------------- | ------ |
| GET    | `/v1/tasks`                           | implemented — merges kanban + cron + active kanban runs, filters by `source` / `status`, paginates via `limit`, returns `{tasks, counts}` |
| GET    | `/v1/tasks/stream`                    | implemented — SSE, emits `task-event` per change + `counts-event` per aggregate delta, 15s keepalive comment, enforced 1 KiB/event + 64 events/s cap |
| POST   | `/v1/tasks/{task_id}/cancel`          | implemented — kanban: `archive_task`; cron: `pause_job` |
| POST   | `/v1/tasks/{task_id}/retry`           | implemented — kanban: `unblock_task`; cron: `trigger_job` |
| POST   | `/v1/tasks/{task_id}/pause`           | implemented — kanban: `block_task`; cron: `pause_job` |
| POST   | `/v1/tasks/{task_id}/resume`          | implemented — kanban: `unblock_task`; cron: `resume_job` |
| POST   | `/v1/tasks/{task_id}/ping-me`         | **deferred** — records intent in process memory, returns `{"ok": true, "deferred": true, "enabled": <bool>}`. Inventing a new user-prefs store was out of scope; the Desk client already mirrors the preference locally |

All routes share the adapter's existing `_check_auth` bearer enforcement, so
behavior matches `/v1/chat/completions` exactly: no key configured → all
requests allowed; key set → `Authorization: Bearer <API_SERVER_KEY>` required.

Task IDs are namespaced (`k:` kanban, `c:` cron, `r:` run, `a:` agent,
`u:` custom) and validated against a fixed regex before any dispatch — no
shell or SQL interpolation, no raw input reaches `kanban_db` /
`cron.jobs` without first parsing the prefix.

## Tests

`tests/gateway/test_desk_tasks_routes.py` — **12 tests, 12 pass**:

- Auth: 401 with no bearer when key is configured, 401 with wrong bearer,
  200 with correct bearer + empty state
- List: merges kanban + cron into one list (with correct counts), filters
  by `source`, rejects invalid `status` with 400
- Actions: cancel a kanban task (archives + returns refreshed BackgroundTask
  with `status: cancelled`), 404 on unknown kanban id, 400 on malformed
  `task_id` format, cron pause flow (toggles `enabled: false` → returns
  `status: paused`)
- pingMe: records intent + returns `deferred: true`, updates module state
- Stream: SSE opens, drains chunks, both the open marker and a
  `counts-event` are observed

Existing `tests/gateway/test_api_server.py` was re-run after the wiring
change: **141/141 pass.**

Test command (after pytest-asyncio was installed into the venv from the
project's own `[dev]` extras — the dependency was listed in `pyproject.toml`
but missing from `.venv`; I treated that as restoring declared state, not as
introducing a new dependency):

```
scripts/run_tests.sh tests/gateway/test_desk_tasks_routes.py
```

## Open issues / follow-ups

1. **`pingMe` persistence**: deferred (as instructed). Eventual home is
   `~/.shay/desktop/task_prefs.json` per the scaffold's TODO. Today the
   handler records intent in `_PING_ME_PREFS` so reloads within a process
   lifetime are coherent; cross-process persistence remains a Phase 6 task.
2. **Run-source mutability**: `cancel`/`pause` on a `r:<run_id>` returns
   "run-scoped actions not supported in Phase 5". The kanban run model
   doesn't have a public independent mutation API; in practice clients
   should target the parent kanban task instead. The Desk client only
   surfaces parent-task verbs today, so this is not a blocker.
3. **Rate-limit storage**: `_TokenBucket` is in-process and per-adapter.
   Multi-worker deployments would need a shared store, but the gateway
   runs as a single aiohttp process today.
4. **SSE per-event signature**: change detection uses
   `status|ended_at` as the "did this task change?" key. That's enough to
   suppress duplicate emissions during the steady state, but cosmetic
   metadata changes (e.g. detail/title edits) won't trigger an event.
   Adequate for the Desk tray. Worth revisiting if the Web UI wants
   richer subscription semantics.

## Commit

Final commit on `shay-shay`: `85bd560c9666106753b26aeb07846e96cab9c6ef`
— `feat(gateway): implement /v1/tasks routes`
