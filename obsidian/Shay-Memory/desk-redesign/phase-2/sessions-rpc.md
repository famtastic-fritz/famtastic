---
title: Phase 2 — Sessions write-RPC scaffolding
date: 2026-05-29
phase: 2
label: sessions-rpc
status: shipped
permalink: shay-memory/desk-redesign/phase-2/sessions-rpc
---

## Summary

Stood up the Desk-owned overlay sqlite, the IPC adapter that merges its
fields on top of read-only `~/.shay/state.db`, the typed preload surface,
the renderer service wrapper, and the (unregistered) FastAPI router stub
for the gateway-side counterpart.

## Files created

- `shay-desktop-electron/src/main/sessions-overlay.ts` — better-sqlite3
  store at `app.getPath('userData')/sessions-overlay.db`. Tables:
  `session_meta(id, project_id, brain_id, mode, custom_title, pinned,
  archived, updated_at)`, `tabs(tab_id, session_id, position, pinned,
  split_group_id)`, `bookmarks(id, session_id, message_id, label,
  created_at)`. WAL journal mode, partial indexes on pinned/archived.
  Atomic upserts via `INSERT … ON CONFLICT DO UPDATE`. Test-only
  `__setOverlayPathForTests(path)` for redirecting the db.
- `shay-desktop-electron/src/main/sessions-rpc.ts` — IPC adapter.
  Channels: `shay.sessions.list`, `.get`, `.rename`, `.pin`, `.archive`,
  `.setProject`, `.setMode`, `.searchFuzzy`, `.fork`, `.delete`. Reads
  paginate `state.db` via the existing `listSessions()` and merge
  overlay fields. Writes hit the overlay only — `state.db` stays
  read-only (except `delete`, which has to clean up upstream).
  `searchFuzzy` tries FTS-backed `searchSessions()` first, falls back to
  substring rank over the 500 most recent sessions. `fork` throws
  `NotImplemented` (wired in Phase 3 once the chat-fork backend lands).
- `shay-desktop-electron/src/preload/sessions-domain.ts` — exposes
  `window.shaySessionsRpc.*` via `contextBridge`. Also patches into
  `window.shay.sessions` in non-isolated contexts. Does not touch the
  existing `window.hermesAPI` namespace.
- `shay-desktop-electron/src/renderer/src/services/sessions-service.ts`
  — thin TS wrapper. Resolves the surface from either
  `window.shaySessionsRpc` (preferred) or the merged
  `window.shay.sessions`. Rejects with a descriptive error when the
  bindings are missing (test harness path).
- `shay-shay/gateway/desk_sessions_routes.py` — FastAPI APIRouter at
  `/v1/desk/sessions/*`. Every handler returns a 501 stub envelope plus
  the parameters it received, with TODO blocks naming the SQL the
  Phase 5 implementation will run. Top-of-file comment notes the
  router is **not** registered with the gateway today — Phase 5 wires it
  in after a security review of loopback Bearer enforcement.

## Decisions

- **Two parallel preload surfaces.** Phase 0's
  `src/preload/domains.ts` mounts `window.shay.sessions` against the
  stub handlers in `src/main/domains/sessions.ts`. Rather than refactor
  that scaffold (out of my ownership scope), I added a parallel
  `window.shaySessionsRpc` surface that calls the new
  `shay.sessions.*`-channel handlers. The renderer service tries the
  RPC surface first, falls back to the merged `shay.sessions` shape.
  Phase 3+ can consolidate at its leisure.
- **State.db stays read-only from the renderer.** All writes route to
  the overlay; the only state.db mutation is the upstream delete
  inside `sessions-rpc.remove()`. Custom titles win over upstream
  titles at merge time.
- **FastAPI vs aiohttp.** The gateway today is aiohttp-based. The build
  plan specifies FastAPI APIRouter shape, so the new file is written
  as an APIRouter with a graceful `ImportError` fallback. Phase 5 will
  either bolt FastAPI on or port the handlers to
  `web.RouteTableDef` — the SQL TODOs are the contract that survives
  either choice.
- **Fork stub.** Build plan calls out fork as Phase 3 work. The handler
  is present so the IPC surface stays complete; it throws
  `NotImplemented` with a message the renderer can recognise.

## Channels exposed

| IPC channel | Renderer service method | Hits |
|---|---|---|
| `shay.sessions.list` | `sessionsService.list` | overlay + state.db |
| `shay.sessions.get` | `sessionsService.get` | overlay + state.db |
| `shay.sessions.rename` | `sessionsService.rename` | overlay |
| `shay.sessions.pin` | `sessionsService.pin` | overlay |
| `shay.sessions.archive` | `sessionsService.archive` | overlay |
| `shay.sessions.setProject` | `sessionsService.setProject` | overlay |
| `shay.sessions.setMode` | `sessionsService.setMode` | overlay |
| `shay.sessions.searchFuzzy` | `sessionsService.searchFuzzy` | state.db FTS + in-mem fallback |
| `shay.sessions.fork` | `sessionsService.fork` | **NotImplemented** (Phase 3) |
| `shay.sessions.delete` | `sessionsService.delete` | overlay + state.db |

## Follow-ups for downstream Phase 2 work

- `src/main/index.ts` needs to import and call
  `register(ipcMain)` from `./sessions-rpc` at startup. I did not touch
  `index.ts` because it falls outside the ownership scope of this
  subagent; the appshell/wire-up subagent (or a Phase 3 consolidation
  pass) should add the call.
- `src/preload/index.ts` needs to call `exposeSessionsDomain()` from
  `./sessions-domain` once. Same scope reason as above.
- `src/renderer/src/stores/sessions.ts` can now commit writes via
  `sessionsService.*`. The store today exposes
  `upsertSession`/`removeSession` setters — wiring those to RPC calls
  is a follow-up.

## Type-check

`npx tsc -p tsconfig.node.json --noEmit` — the only diagnostic is a
pre-existing TS2742 in `src/shared/i18n/index.ts` (unrelated to this
scope). `npx tsc -p tsconfig.web.json --noEmit` — the only diagnostic is
a pre-existing TS2304 in `src/renderer/src/shell/TopBar.tsx` (sibling
subagent's file). Both diagnostics existed before this scope landed.