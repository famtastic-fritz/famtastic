---
title: Phase 0 — IPC Domain Scaffolding
date: 2026-05-29
phase: 0
agent: ipc-domains
status: scaffolded
permalink: shay-memory/desk-redesign/phase-0/ipc-domains
---

## Summary

Landed the namespaced IPC scaffolding the redesign migrates onto. Phase 0 ships
typed RPC interfaces + stub handlers (`throw NotImplemented`) for every domain
the build plan calls out, plus a preload helper that exposes
`window.shay.<domain>.<method>` without touching the existing
`window.hermesAPI` surface. The 128 flat handlers in `src/main/index.ts` stay
authoritative through Phase 0 — nothing wired up yet, the scaffold is here so
later phase agents have a stable target to migrate handlers into.

## Files created

Domain modules (each exports a typed `<Domain>` interface, a
`register(ipcMain)` stub-handler installer, and `buildPreloadBindings(invoke,
on?)`):

- `src/main/domains/index.ts` — registry + `registerDomains(ipcMain)` +
  re-exports of every domain type
- `src/main/domains/auth.ts` — OAuth providers / accounts / start / complete /
  signOut
- `src/main/domains/mcp.ts` — list / listTools / add / remove / setEnabled /
  test / restart / login (replaces regex parsing of `config.yaml`)
- `src/main/domains/logs.ts` — list / tailStart / tailStop / exportToFile +
  `onTailEvent` push channel
- `src/main/domains/tasks.ts` — list / counts / pause / resume / cancel /
  streamStart / streamStop + `onTaskEvent` & `onCountsEvent` push channels
  (seq numbers in payload for renderer gap detection)
- `src/main/domains/notifications.ts` — list / unreadCount / markRead /
  markAllRead / dismiss / getDnd / setDnd / getRules / setRule + `onNew` /
  `onRead` push channels
- `src/main/domains/sessions.ts` — list / get / patch / fork / delete /
  search / pin / archive + `onChanged` push channel (overlay-db facing in
  Phase 2)
- `src/main/domains/settings.ts` — **PLACEHOLDER** for the settings-handler
  agent. Reserves `getSettings(group)` / `setSettings(group, patch)` /
  reset / exportAll / importAll + `onChanged`
- `src/main/domains/keychain.ts` — **PLACEHOLDER** for the keychain agent.
  Reserves status / has / get / set / delete / list / migrate
- `src/main/domains/capture.ts` — permissions / requestPermission / start /
  stop / cancel + `onProgress` push channel
- `src/main/domains/panels.ts` — getLayout / setLayout / openTab / closeTab /
  focusTab / popOut + `onLayoutChanged` & `onAutoSwitch` push channels

Preload helper:

- `src/preload/domains.ts` — `buildShayDomains()` plus `exposeShayDomains()`
  which calls `contextBridge.exposeInMainWorld("shay", domains)`. Not yet
  invoked from `src/preload/index.ts` (out of ownership for Phase 0).

## Channel convention

All channels namespaced `shay:<domain>:<method>` (e.g. `shay:auth:startOAuth`,
`shay:tasks:counts`). Push channels use the same prefix
(`shay:tasks:task-event`). This deliberately avoids any of the existing flat
channel names so both surfaces can coexist during the migration.

## Non-trivial design choices

- **Stub handlers throw, don't return**: `notImplemented(method)` throws so a
  misrouted caller fails loudly in dev rather than silently returning
  `undefined`. The `ipcMain.handle` registration still happens so the channel
  name is reserved (a second `handle()` for the same channel throws).
- **Push channels carry seq numbers** on `tasks` (per the Phase 1 SSE
  contract): the typed payload is `{ seq, task }` / `{ seq, counts }` so the
  Phase 1 renderer can detect gaps and resync via `*.snapshot()`. Other
  domains will adopt seq numbers as they migrate.
- **`buildPreloadBindings` takes `invoke` (and optionally `on`)** instead of
  importing `ipcRenderer` directly. This keeps each domain module
  context-neutral — the main file does the actual `ipcRenderer` import once
  in `src/preload/domains.ts`. It also makes the domains trivially mockable
  in renderer tests.
- **Did NOT modify `src/main/index.ts` or `src/preload/index.ts`** per the
  agent contract — the registry has a documented `registerDomains(ipcMain)`
  entry point and the preload helper has `exposeShayDomains()`. Phase 1's
  index-wiring agent flips both on in the same PR that lands the first real
  handler migration.

## Verification

Phase 0 verify is owned downstream. The scaffold compiles in isolation
against the project's existing strict TS settings (no `any`, narrow generics
on `SettingsDomain.get/set`, all `IpcMain` / `WebContents` types imported as
`type` to keep main↔preload split clean).