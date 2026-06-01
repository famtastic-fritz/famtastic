# Part 2 Prep — Agent X findings (Q1 + Q4)

**Date:** 2026-06-01
**Scope:** READ-ONLY scan, no file modifications outside this report
**Sources:** `_refs/hermes-workspace-v2.3/` and `_refs/hermes-webui-v0.51/` + canonical Shay kanban_db at `shay-shay/shay_cli/kanban_db.py`

---

## Q1: Dashboard surface (HERMES_DASHBOARD_URL :9119)

### Headline
- **40 distinct paths** (parameterized) across **13 feature areas**
- All workspace calls funnel through `dashboardFetch()` defined in `src/server/gateway-capabilities.ts:330` (base = `CLAUDE_DASHBOARD_URL`) or its sibling proxy `src/server/kanban-dashboard-proxy.ts:85`
- The canonical, mostly-exhaustive surface index is `src/server/claude-dashboard-api.ts` (one function per endpoint)
- **Estimated shim scope: MEDIUM** — ~40 endpoints, but ~60% are read-only GETs over data Shay already has (sessions, skills, config, status). The expensive bits are: sessions DB read-shape parity, skills toggle persistence, cron CRUD, env-var CRUD, kanban plugin proxy (which Shay already has natively).

### Method notes
- "dashboardJson" wraps `dashboardFetch` and centralizes JSON+error handling (`claude-dashboard-api.ts:108`).
- "dashboardFetch" the kanban proxy version is local to `kanban-dashboard-proxy.ts` (a separate timeout-wrapped function, but uses the same `CLAUDE_DASHBOARD_URL` base).
- Some paths are reached via raw `fetch(${CLAUDE_DASHBOARD_URL}...)` outside the helpers — those are flagged in the table.
- Capability probes (`/`, `/api/status`, `/api/mcp`, `/api/conductor/missions`, `/api/plugins/kanban/board`) double as "is the dashboard alive + what features does it have" introspection.

### By feature area

#### Sessions (8 paths)
| Method | Path | Caller | Purpose |
|---|---|---|---|
| GET  | `/api/sessions?limit&offset` | `claude-dashboard-api.ts:124` (`listSessions`) | list sessions w/ paging |
| GET  | `/api/sessions/{id}` | `claude-dashboard-api.ts:130` (`getSession`); also `context-usage.ts:451` | session detail |
| GET  | `/api/sessions/{id}/messages` | `claude-dashboard-api.ts:138` (`getSessionMessages`) | full transcript |
| GET  | `/api/sessions/search?q=` | `claude-dashboard-api.ts:142` (`searchSessions`) | full-text search |
| POST | `/api/sessions` | `claude-dashboard-api.ts:154` (`createSession`) | new session row |
| PATCH| `/api/sessions/{id}` | `claude-dashboard-api.ts:165` (`updateSession`) | edit metadata |
| POST | `/api/sessions/{id}/fork` | `claude-dashboard-api.ts:175` (`forkSession`) | clone session |
| DELETE | `/api/sessions/{id}` | `claude-dashboard-api.ts:146` (`deleteSession`) | hard delete |
| GET  | `/api/sessions/{id}/...` (extra path) | `context-usage.ts:499` | context-usage drilldown (path concat — likely `/messages` or counters) |

#### Skills (3 paths)
| Method | Path | Caller | Purpose |
|---|---|---|---|
| GET  | `/api/skills` | `claude-dashboard-api.ts:181`; `routes/api/skills.ts:368` | list available skills |
| PUT  | `/api/skills/toggle` | `claude-dashboard-api.ts:188`; `routes/api/skills.ts:589`; `routes/api/skills/toggle.ts:44` | enable/disable a skill |
| (implied) `/api/skills/install` not found in v2.3 surface — install flow goes through MCP routes |

#### Config (5 paths)
| Method | Path | Caller | Purpose |
|---|---|---|---|
| GET  | `/api/config` | `claude-dashboard-api.ts:196`; `claude-api.ts:500` | active YAML config as JSON |
| PUT  | `/api/config` | `claude-dashboard-api.ts:276`; `claude-api.ts:514` | deep-merge patch save |
| GET  | `/api/config/schema` | `claude-dashboard-api.ts:203` | field metadata + category order |
| GET  | `/api/config/raw` | `claude-dashboard-api.ts:207` | raw YAML text |
| PUT  | `/api/config/raw` | `claude-dashboard-api.ts:286` | raw YAML save |

#### Cron Jobs (8 paths)
| Method | Path | Caller | Purpose |
|---|---|---|---|
| GET  | `/api/cron/jobs` | `claude-dashboard-api.ts:317`; `routes/api/claude-jobs.ts:83` | list jobs |
| POST | `/api/cron/jobs` | `claude-dashboard-api.ts:326`; `routes/api/claude-jobs.ts:138` | create job |
| GET  | `/api/cron/jobs/{id}` | `routes/api/claude-jobs.$jobId.ts:70` | one job detail |
| PATCH/PUT | `/api/cron/jobs/{id}` | `claude-jobs.$jobId.ts:148, 246` | edit job |
| DELETE | `/api/cron/jobs/{id}` | `claude-dashboard-api.ts:352`; `claude-jobs.$jobId.ts:293` | remove |
| POST | `/api/cron/jobs/{id}/pause` | `claude-dashboard-api.ts:334` | pause |
| POST | `/api/cron/jobs/{id}/resume` | `claude-dashboard-api.ts:340` | resume |
| POST | `/api/cron/jobs/{id}/trigger` | `claude-dashboard-api.ts:346` | run-now |

#### Env Vars (1 path, 3 methods)
| Method | Path | Caller | Purpose |
|---|---|---|---|
| GET  | `/api/env` | `claude-dashboard-api.ts:294` (`getEnvVars`) | listing with masked values |
| PUT  | `/api/env` | `claude-dashboard-api.ts:301` (`setEnvVar`) | set one key |
| DELETE | `/api/env` | `claude-dashboard-api.ts:309` (`deleteEnvVar`) | unset one key |

#### Analytics / Logs / Status (4 paths)
| Method | Path | Caller | Purpose |
|---|---|---|---|
| GET  | `/api/analytics/usage?days=` | `claude-dashboard-api.ts:358` | token + tool usage rollup |
| GET  | `/api/logs?file&lines&level&component` | `claude-dashboard-api.ts:385` | dashboard log tail |
| GET  | `/api/status` | `claude-dashboard-api.ts:389`; `gateway-capabilities.ts:563` | dashboard version, gateway state, active sessions (also a health probe) |
| GET  | `/` | `gateway-capabilities.ts:290` | reachability probe (root) |

#### Model Info (1 path)
| Method | Path | Caller | Purpose |
|---|---|---|---|
| GET  | `/api/model/info` | `claude-dashboard-api.ts:362`; `context-usage.ts:198`; `routes/api/model/info.ts:28` | active model + capacity |

#### Tools / Providers (2 paths)
| Method | Path | Caller | Purpose |
|---|---|---|---|
| GET  | `/api/tools/toolsets` | `claude-dashboard-api.ts:366` | toolset catalog + enabled flags |
| GET  | `/api/providers/oauth` | `claude-dashboard-api.ts:370` | OAuth provider catalog |

#### MCP (4 paths)
| Method | Path | Caller | Purpose |
|---|---|---|---|
| GET  | `/api/mcp` | `gateway-capabilities.ts:490`; `routes/api/mcp.ts:32` | list MCP servers |
| ANY  | `/api/mcp/{name}` | `routes/api/mcp/$name.ts:21` | per-server proxy passthrough |
| GET  | `/api/mcp/{name}/logs` | `routes/api/mcp/$name.logs.ts:53` | log tail |
| ANY  | `/api/mcp/configure` | `routes/api/mcp/configure.ts:27` | configure |
| ANY  | `/api/mcp/discover` | `routes/api/mcp/discover.ts:22` | discover (registry walk) |
| ANY  | `/api/mcp/test` | `routes/api/mcp/test.ts:24` | test connection |

#### Conductor / Missions (2 paths)
| Method | Path | Caller | Purpose |
|---|---|---|---|
| GET/POST | `/api/conductor/missions` | `gateway-capabilities.ts:584` (probe); `routes/api/conductor-spawn.ts:117` | list / spawn mission |
| GET/POST | `/api/conductor/missions/{id}?lines=` | `conductor-spawn.ts:379`; `conductor-stop.ts:66` | mission tail / stop |

#### OAuth (1 path)
| Method | Path | Caller | Purpose |
|---|---|---|---|
| GET  | `/api/oauth/poll-token/...` | `routes/api/oauth.poll-token.ts:74` | OAuth token polling for provider login flows |

#### Profiles (1 path)
| Method | Path | Caller | Purpose |
|---|---|---|---|
| GET  | `/api/profiles` | `server/profiles-browser.ts:201, 300` | list profiles known to dashboard (used when remote) |

#### Kanban plugin (4 paths)
Workspace also probes/proxies the dashboard's kanban plugin surface:
| Method | Path | Caller | Purpose |
|---|---|---|---|
| GET  | `/api/plugins/kanban/board?board=` | `gateway-capabilities.ts:615` (probe); `kanban-dashboard-proxy.ts:109` | full board |
| GET  | `/api/plugins/kanban/boards` | `kanban-dashboard-proxy.ts:202` | board list |
| GET/POST | `/api/plugins/kanban/tasks` | `kanban-dashboard-proxy.ts:150` | create task |
| GET/PATCH | `/api/plugins/kanban/tasks/{taskId}?board=` | `kanban-dashboard-proxy.ts:122, 175` | get + patch task |
| GET  | `/api/plugins/kanban/assignees` | `routes/api/claude-tasks-assignees.ts:136` | assignee list |

> Note: this surface is the SAME contract webui's `/api/kanban/*` exposes (see Q4). Shay's existing kanban_db plus a thin HTTP wrapper covers it.

### Surface summary for sizing
- ~40 endpoints, ~13 feature groups
- Cleanest implementation route: copy `claude-dashboard-api.ts` as the contract spec (it documents request/response shape for every endpoint via TS types). Implementing the **server** side requires:
  - Sessions table backend (likely Shay's chat history — schema may need a thin view)
  - Skills toggle (Shay's skill catalog — toggling already exists somewhere)
  - Config GET/PUT/RAW (a YAML file Shay owns)
  - Env CRUD (`.env` file or shay config — small)
  - Cron CRUD (Shay's scheduled-tasks MCP / scheduler — needs mapping)
  - Analytics, logs, model/info, status (mostly synthesizing existing telemetry)
  - MCP routes (mostly passthrough to MCP daemon)
  - Conductor (Shay's swarm dispatcher — already exists, wrap)
  - Plugins/kanban (already exists as Shay kanban — wrap in HTTP)

---

## Q4: kanban_db API compatibility

### Headline
- **Verdict: re-export shim viable** with one small caveat
- Symbols webui imports: **37** (35 public + 2 private)
- Symbols Shay provides: **all 37 present at matching names** in `shay-shay/shay_cli/kanban_db.py`
- Mismatches: **0 functional**; **2 cosmetic** (two private symbols webui pokes through `getattr` / direct access)
- Estimated shim size: **~5-10 lines** (single-file `hermes_cli/kanban_db.py` that does `from shay_cli.kanban_db import *` plus the two private re-exports)

### Webui's kanban_db symbol usage
All in `/Users/famtasticfritz/famtastic/_refs/hermes-webui-v0.51/api/kanban_bridge.py`:

| Symbol | First call line | Notes |
|---|---|---|
| `_normalize_board_slug` | 63, 820, 849, 888 | private, used for input validation |
| `_append_event` | 370, 639 | private, used via `hasattr(kb, "_append_event")` first |
| `_end_run` | 284 | private, used via direct call (no hasattr guard) |
| `DEFAULT_BOARD` (attribute) | 72, 749, 857, 932 | constant; webui uses `getattr(kb, "DEFAULT_BOARD", "default")` |
| `add_comment(conn, task_id, author, body)` | 448 | |
| `archive_task(conn, task_id)` | 386, 624 | |
| `assign_task(conn, task_id, profile)` | 373, 629 | |
| `block_task(conn, task_id, reason=...)` | 383, 672 | |
| `board_exists(slug)` | 75, 714, 823, 852, 891, 935 | |
| `board_stats(conn)` | 557 | guarded by `hasattr` |
| `child_ids(conn, task_id)` | 473 | |
| `claim_task` | 396 (mentioned in comment) | NOT directly called, only referenced in error msg |
| `clear_current_board()` | 756 | |
| `complete_task(conn, task_id, result=, summary=)` | 380 | |
| `connect(board=)` | 83, 717, 938 | |
| `create_board(slug, name=, description=, icon=, color=)` | 787 | |
| `create_task(conn, title=, body=, assignee=, created_by=, tenant=, priority=, parents=, triage=, workspace_kind=, workspace_path=, idempotency_key=, max_runtime_seconds=, skills=)` | 317 | |
| `dispatch_once(conn, dry_run=, max_spawn=)` | 654 | guarded by `hasattr` |
| `get_current_board()` | 745, 802, 864 | |
| `get_task(conn, task_id)` | 340, 406, 446, 459, 461, 480, 589, 619, 669, 683 | hot path |
| `init_db(board=)` | 82 | |
| `known_assignees(conn)` | 530, 575 | |
| `link_tasks(conn, parent_id, child_id)` | 466 | |
| `list_boards(include_archived=)` | 743 | |
| `list_comments(conn, task_id)` | 485 | |
| `list_events(conn, task_id)` | 486 | |
| `list_runs(conn, task_id)` | 488 | |
| `list_tasks(conn, tenant=, assignee=, include_archived=)` | 190 | |
| `parent_ids(conn, task_id)` | 472 | |
| `read_worker_log(task_id, tail_bytes=)` | 593 | guarded by `hasattr` |
| `recompute_ready(conn)` | 300 | guarded by `hasattr` |
| `remove_board(slug, archive=)` | 862 | |
| `set_current_board(slug)` | 798, 893 | |
| `task_age(task)` | 101 | guarded by try/except |
| `unblock_task(conn, task_id)` | 410, 675 | guarded by `hasattr` for fallback |
| `unlink_tasks(conn, parent_id, child_id)` | 464 | |
| `worker_log_path(task_id)` | 594 | guarded by `hasattr` |
| `write_board_metadata(slug, name=, description=, icon=, color=, archived=)` | 828 | |
| `write_txn(conn)` | 263 | context manager |

### Shay's kanban_db public surface (canonical: `shay-shay/shay_cli/kanban_db.py`)

Every webui-required symbol is present with a matching signature. Selected confirmations:

- `connect(db_path=None, *, board=None) -> sqlite3.Connection` (line 916) — matches webui's `kb.connect(board=board)` (kwarg form).
- `init_db(db_path=None, *, board=None) -> Path` (line 965) — matches.
- `list_tasks(conn, *, assignee=None, status=None, tenant=None, include_archived=False, limit=None)` (line 1501) — superset of webui's call (`tenant=`, `assignee=`, `include_archived=`).
- `get_task(conn, task_id)` (line 1496) — identical.
- `create_task(conn, *, title, body, assignee, created_by, workspace_kind, workspace_path, tenant, priority, parents, triage, idempotency_key, max_runtime_seconds, skills, max_retries, required_tools)` (line 1262) — superset of webui's kwargs; all webui kwargs match by name.
- `add_comment(conn, task_id, author, body) -> int` (line 1678) — identical.
- `complete_task(conn, task_id, *, result=None, summary=None, metadata=None, created_cards=None, expected_run_id=None)` (line 2407) — superset; webui only passes `result=, summary=`.
- `block_task(conn, task_id, *, reason=None, expected_run_id=None)` (line 2700) — matches.
- `unblock_task(conn, task_id)` (line 2755).
- `archive_task(conn, task_id)` (line 2895).
- `assign_task(conn, task_id, profile)` (line 1532).
- `link_tasks/unlink_tasks/parent_ids/child_ids` — present (1569, 1622, 1643, 1651).
- `dispatch_once(conn, *, spawn_fn=None, ttl_seconds=, dry_run=False, max_spawn=None, failure_limit=, board=None) -> DispatchResult` (line 4135) — superset; webui only passes `dry_run=, max_spawn=`. **DispatchResult is a dataclass** — webui's bridge already handles that via `asdict(result)` fallback (line 658 of kanban_bridge.py).
- `board_stats(conn)` (line 4789), `task_age(task)` (line 4835), `known_assignees(conn)` (line 5186), `read_worker_log` (5116), `worker_log_path` (5105), `recompute_ready` (1884), `list_runs/list_events/list_comments` — all present and signature-compatible.
- `list_boards(*, include_archived=True)` (line 468) — matches; webui passes `include_archived=...`.
- `create_board / remove_board / write_board_metadata / read_board_metadata / set_current_board / clear_current_board / get_current_board / board_exists / _normalize_board_slug / DEFAULT_BOARD` (constants at line 120) — all present.
- `write_txn(conn)` (line 1205) — context manager, matches.
- `_append_event(conn, task_id, kind, payload)` (line 1741) — private, present.
- `_end_run(conn, task_id, *, outcome, status, summary)` (line 1765) — private, present. Webui calls with kwargs `outcome=, status=, summary=` (line 284) — signature compatible.

### Compatibility matrix
| Webui call | Shay equivalent | Compatible? | Notes |
|---|---|---|---|
| `kb.connect(board=board)` | `connect(db_path=None, *, board=None)` | YES | exact match |
| `kb.init_db(board=board)` | `init_db(*, board=None)` | YES | exact match |
| `kb.list_tasks(conn, tenant=, assignee=, include_archived=)` | `list_tasks(conn, *, assignee, status, tenant, include_archived, limit)` | YES | Shay is superset; webui's kwargs all line up |
| `kb.create_task(conn, title=, body=, ..., skills=)` | `create_task(conn, *, title, ..., skills, max_retries, required_tools)` | YES | superset |
| `kb.complete_task(conn, task_id, result=, summary=)` | `complete_task(conn, task_id, *, result, summary, metadata, created_cards, expected_run_id)` | YES | superset; note `complete_task` may now raise `HallucinatedCardsError` (subclass of `ValueError`) when `created_cards` is passed — webui doesn't pass it, so no risk |
| `kb.block_task(conn, task_id, reason=)` | `block_task(conn, task_id, *, reason, expected_run_id)` | YES | superset |
| `kb.dispatch_once(conn, dry_run=, max_spawn=)` | `dispatch_once(conn, *, spawn_fn, ttl_seconds, dry_run, max_spawn, failure_limit, board)` | YES | superset; webui wraps return via `asdict()` |
| `kb._end_run(conn, task_id, outcome=, status=, summary=)` | `_end_run(conn, task_id, *, outcome, status, summary)` | YES | private but signature matches |
| `kb._append_event(conn, task_id, kind, payload)` | `_append_event(conn, task_id, kind, payload)` | YES | private, matches |
| `kb._normalize_board_slug(slug)` | `_normalize_board_slug(slug)` | YES | private, matches |
| `kb.DEFAULT_BOARD` | `DEFAULT_BOARD = "default"` | YES | module constant at line 120 |
| `kb.task_age(task) -> dict` | `task_age(task) -> dict` (line 4835) | YES | matches |
| `kb.board_stats(conn) -> dict` | `board_stats(conn) -> dict` (line 4789) | YES | webui's bridge guards with hasattr — defensive only |
| `kb.known_assignees(conn) -> list[dict]` | `known_assignees(conn) -> list[dict]` (line 5186) | YES | shape matches: `[{name, on_disk, counts}]` |
| `kb.read_worker_log(task_id, tail_bytes=)` / `kb.worker_log_path(task_id)` | present at 5116 / 5105 | YES | matches |
| `kb.recompute_ready(conn)` | present at 1884 | YES | matches |
| `kb.list_runs / list_comments / list_events / parent_ids / child_ids / link_tasks / unlink_tasks / assign_task / archive_task / unblock_task / add_comment / get_task` | all present | YES | identical signatures |
| `kb.list_boards / create_board / remove_board / write_board_metadata / read_board_metadata / set_current_board / clear_current_board / get_current_board / board_exists` | all present | YES | identical signatures |
| `kb.write_txn(conn)` | `write_txn(conn)` ctx mgr | YES | matches |

**Open question (minor):** webui's `_dispatch_payload` (kanban_bridge.py:653) calls `kb.dispatch_once(conn, dry_run=, max_spawn=)` **without** providing a `spawn_fn`. In Shay's signature `spawn_fn=None`. We should confirm the default path (`_default_spawn` at line 4394) is what webui expects — i.e. it actually spawns the Shay dispatcher worker. This is operational, not API-shape, so it's a runtime-behavior verification item, not a shim concern.

### Recommendation
A re-export shim is viable and tiny. Create `hermes_cli/kanban_db.py` containing:

```python
# hermes_cli/kanban_db.py — Shay re-export stub
from shay_cli.kanban_db import *  # noqa: F401,F403
from shay_cli.kanban_db import (  # private symbols webui accesses
    _append_event,
    _end_run,
    _normalize_board_slug,
)
```

Plus a `hermes_cli/__init__.py` (`# empty`) and any other `hermes_cli.*` modules webui needs (e.g. `hermes_cli.config.load_config` at kanban_bridge.py:536; `hermes_cli.profiles`, `hermes_cli.models`, `hermes_cli.auth`, `hermes_cli.plugins`, `hermes_cli.runtime_provider` — these are referenced elsewhere in webui and out of scope here, but worth noting that **kanban_db alone is sufficient for `/api/kanban/*`** to work).

Translation layer would be ~150-300 lines if needed; the shim is ~10 lines, and full API parity says we can skip translation entirely.

---

## Combined implications for Part 2 sizing

**Q1 → II.b (dashboard shim):** The :9119 dashboard surface is wider than a single-table shim — ~40 endpoints across 13 areas. About 60% are GETs that just synthesize JSON over data Shay already owns (sessions, skills, config, status, model/info, analytics). The expensive 40% are Cron CRUD (8 paths, full state machine), Env CRUD (write-back to .env), Conductor (2 paths but spawn semantics), and MCP (4-5 passthroughs). The Sessions feature is the single biggest unknown — `claude-dashboard-api.ts:1-50` documents the expected DashboardSession/DashboardMessage shape; whether Shay's chat history table maps cleanly will determine whether II.b is a week or three weeks. The Kanban plugin sub-surface inside the dashboard (5 paths) is "free" — Shay's kanban_db already covers it (see Q4); just wrap as HTTP. Realistic shim estimate: **medium scope, ~5-8 working days** for an MVP that covers Sessions/Status/Skills/Config/Kanban and stubs the rest with HTTP 503.

**Q4 → II.c (webui kanban bridge):** Re-export shim is the right call — a 10-line `hermes_cli/kanban_db.py` re-export will let webui's `api/kanban_bridge.py` work verbatim against Shay's canonical kanban_db. Zero translation, zero data-shape gymnastics. All 37 symbols webui touches (including the 2 private ones `_append_event` and `_end_run`, plus the `_normalize_board_slug` / `DEFAULT_BOARD` constants) are present at matching names with compatible (often superset) signatures. The only remaining risk is **webui's other `hermes_cli.*` imports** (config, profiles, models, auth, plugins, runtime_provider) which are out of scope here; those will need separate small shims or be wired around. Kanban itself: **2-4 hours**, including a smoke test against the SSE event stream.
