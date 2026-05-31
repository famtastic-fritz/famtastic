---
title: logs-ui
type: note
permalink: shay-memory/desk-redesign/phase-5/logs-ui
---

# Phase 5 — Logs UI (label: logs-ui)

**Date:** 2026-05-30
**Owner:** logs-ui agent (recovery pass after session-cap)
**Status:** complete — additive only, no out-of-ownership edits.

## Files created / replaced

| Path | Action | Notes |
|---|---|---|
| `src/renderer/src/admin/logs/LogsPage.tsx` | create | SettingsPage wrapper hosting filters + stream + footer. Self-registers via `registerSettingsPage("logs", …)` + `registerSettingsNavEntry({ id:"logs", category:"Advanced", order:40 })`. |
| `src/renderer/src/admin/logs/LogStream.tsx` | create | Virtualized via `react-virtuoso` (already in `package.json` ^4.18.7). Imperative handle for `clear` / `scrollToBottom` / `snapshot`. Hydrates from `logs.history(filter, 250)`, then starts a live stream via `logs.stream(filter)` and subscribes to `subscribeStream`. Pause queues pending entries to a ref; resume drains. Buffer cap = 5 000 entries. |
| `src/renderer/src/admin/logs/LogFilters.tsx` | create | Controlled. Levels = chip multi-select (trace/debug/info/warn/error/fatal). Sources = chip multi-select rendered from `logs.sources()`. Since = select (5m/15m/1h/24h/all/custom). Free-text search. Exports `resolveLogFilter()` so the page can map UI state to the wire `LogFilter`. |
| `src/renderer/src/admin/logs/LogRow.tsx` | create | Grid row: time / level chip / source chip / message. Clickable; expanded state owned by `<LogStream>` via `expanded: Set<seq>`. Meta payload rendered as a key/value table when expanded. |
| `src/renderer/src/admin/logs/index.ts` | create | Barrel — exports the React surface and triggers the side-effect register on first import. |
| `src/renderer/src/services/logs-service.ts` | (kept) | Already real from the prior pass. Reviewed — surface matches the page's needs (`history`, `startStream`, `stopStream`, `subscribeStream`, `sources`). |
| `src/main/domains/logs.ts` | (kept) | Already real. File-tail aggregator with positional inode tracking, 1 Hz polling, rotation/truncation detection, JSONL + plaintext parsing, source enumeration via `~/.shay/logs/*.log`. Phase 6 will graft gateway SSE in via `configureAggregator({ gatewayBaseUrl, bearerToken })`. |
| `src/preload/logs-domain.ts` | (kept) | Already real. Exposes `window.shayLogsRpc` (strongly typed) alongside the existing `window.shay.logs` namespace. |
| `shay-shay/gateway/desk_logs_routes.py` | (kept) | Already a 501 stub from the prior pass — verified header docstring matches the contract this page consumes; left untouched. |

## Behaviour summary

- Settings nav row "Logs" lands under the **Advanced** category, order 40.
- Icon: registry has no `"logs"` entry; chose `"history"` as the closest semantic match rather than mutate `components/icons/registry.ts` (outside ownership). Phase 6 polish can promote to a real `"logs"` icon.
- The page renders inside `<SettingsPage>` so it inherits the standard error boundary and header chrome. The actions slot carries the live/paused status pill.
- Pause never drops entries — they queue on a ref and drain on resume; the resume button shows the pending count.
- Download exports the current visible buffer as `shay-logs-<iso>.ndjson` (one JSON record per line).
- Auto-scroll uses Virtuoso's `followOutput: "smooth"`; turning it off freezes the viewport without freezing the stream.
- Sources chip row polls `logs.sources()` every 5 s so new log files (e.g. an MCP server that just started) appear without a manual refresh.

## Constraints honoured

- Additive only; did not touch `package.json`, did not modify any file outside the declared ownership list.
- TypeScript strict: only pre-existing error is `src/shared/i18n/index.ts(332,14)` — unrelated to this change.
- `react-virtuoso` ^4.18.7 already present in `package.json` (verified before importing).
- `logs.ts` main domain + `logs-domain.ts` preload + `logs-service.ts` were all already complete in the prior pass; I confirmed contract alignment rather than re-writing them. No replacement was needed.

## Known follow-ups (for Phase 6)

- Real `"logs"` icon entry in `components/icons/registry.ts`.
- Wire gateway SSE leg in `main/domains/logs.ts::configureAggregator({ gatewayBaseUrl, bearerToken })` once the gateway-side `desk_logs_routes.py` is registered with the aiohttp router.
- Persist the filters value via `settings-service` (currently in-memory only).
- Hook up the admin/logs barrel import into the renderer entry (or settings/pages barrel) once the broader admin surface lands — same wiring gap as `admin/tasks`.