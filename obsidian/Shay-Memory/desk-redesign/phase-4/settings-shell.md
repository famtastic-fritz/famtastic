---
title: Phase 4 — Settings Shell
date: 2026-05-29
label: settings-shell
phase: 4-settings-decomposition
permalink: shay-memory/desk-redesign/phase-4/settings-shell
---

## Scope delivered

Phase 4 Settings chrome — the container every sub-page consumes. No
sub-page logic; that's owned by sibling agents who land alongside.

## Files created (ownership)

- `src/renderer/src/settings/SettingsShell.tsx`
- `src/renderer/src/settings/SettingsNav.tsx`
- `src/renderer/src/settings/SettingsHeader.tsx`
- `src/renderer/src/settings/SettingsFooter.tsx`
- `src/renderer/src/settings/SettingsPage.tsx`
- `src/renderer/src/settings/SettingsField.tsx`
- `src/renderer/src/settings/useSettingsGroup.ts`
- `src/renderer/src/settings/SettingsShell.module.css`
- `src/renderer/src/settings/index.ts`
- `src/renderer/src/services/settings-service.ts`

Legacy `screens/Settings/Settings.tsx` left untouched per task — Phase 6
polish removes it.

## Architecture

`SettingsShell`
- Two-pane grid (240px nav rail + 1fr page). Layout-only styles in
  `SettingsShell.module.css`.
- Mounts; calls `settings-service.loadAll()` once to warm caches.
- Tracks the active sub-page id (`general` by default).
- Subscribes to the dirty registry via `useSyncExternalStore`.
- Renders `<SettingsFooter>` (sticky) when the active group is dirty.
- Confirms on close (`beforeunload`) and on nav-switch while dirty.
- Sub-pages register a renderer via `registerSettingsPage(id, fn)` or
  are passed inline via the `pages` prop. Falls back to a "Coming soon"
  card so an unimplemented id never blanks the panel.

`SettingsNav`
- Manifest registry — sub-pages call `registerSettingsNavEntry({...})`
  to plug in (or override label/icon). Pre-populated with the 17 ids
  the task lists: `general, account, privacy, billing, usage,
  capabilities, connectors, shay-code, cowork, desktop-app-general,
  desktop-app-extensions, desktop-app-developer, themes, shortcuts,
  notifications, language, voice-audio`.
- Categories: Account, App, Appearance, Capabilities, Notifications,
  Advanced.
- Renders a per-row dirty dot when `dirtyIds.has(entry.id)`.

`SettingsHeader` / `SettingsFooter`
- Header: title + subtitle + optional action area.
- Footer: Save / Discard buttons; disabled when not dirty. Save flashes
  a transient "Saving…" status. Sticky at the bottom of the page pane.

`SettingsPage` wrapper
- `<SettingsPage title subtitle actions>{children}</SettingsPage>`.
- Wraps every sub-page in a `<FeatureBoundary>` so a misbehaving panel
  never takes down the shell. Boundary label derives from the title.

`SettingsField`
- Label + help text + control slot + per-field dirty dot + inline error.
- `htmlFor` forwarded so the label binds to the underlying control.

`useSettingsGroup<G>(group)`
- Returns `{ values, set, isDirty, isFieldDirty, save, discard,
  resetToDefaults, isLoading, isSaving, error }`.
- Loads via `settings-service.getGroup(group)` and shallow-merges over
  schema defaults; warms `stores/settings` via `replaceGroup`.
- Tracks a working copy (local state) vs the last persisted snapshot
  (also local state). `isDirty` is a shallow-compare of the two.
- Publishes per-group dirty state into a module-level registry so
  `SettingsShell` can render the rail dot + footer + close confirm.
- Listens for `shay:settings:save` / `shay:settings:discard` window
  events so the shell footer can drive whichever sub-page is active
  without each sub-page wiring its own buttons. Save sends only the
  changed-key delta over IPC.

`services/settings-service.ts`
- Resolves a settings bridge per call:
  1. `window.shay.settings.get/set` (Phase 0 consolidated bridge).
  2. `window.hermesAPI.getSettings/setSettings` (legacy fallback).
  3. `window.electron.ipcRenderer.invoke("settings.get" | "settings.set", ...)`
     (raw consolidated channel from `src/main/settings-handler.ts`).
  4. `localStorage` fallback for dev / unit-test harnesses.
- Reads always merge over `DEFAULTS` so newly added schema fields adopt
  their default value for stale persisted state.
- Writes are partial patches.
- `NotImplemented` errors from the Phase 0 placeholder bridge fall
  through to the next resolver rather than throwing.

## Persistence flow

Sub-page → `useSettingsGroup` → `settings-service.{getGroup,setGroup}`
→ resolver → `window.shay.settings` / `hermesAPI` / `ipcRenderer`
→ `src/main/settings-handler.ts` → `<userData>/settings.json`.

The typed group keys come from `src/shared/settings-schema.ts`
(`SettingsByGroup`). The nav id strings (`shay-code`, `themes`,
`desktop-app-general`, etc.) are page slugs — not 1:1 with persistence
groups. Sub-pages map slug → schema group inside their own module.

## Behavior matches Claude Desktop where the spec is silent

- Save / Discard appear only when the active group has unsaved edits.
- Nav switching while dirty prompts (`window.confirm`) to discard.
- `beforeunload` is intercepted while any group is dirty.
- Per-field dirty dot mirrors the per-group dirty dot in the rail.

## TypeScript

`npx tsc -p tsconfig.web.json --noEmit` reports zero errors for any
file in my ownership. There is one pre-existing unrelated error in
`src/shared/i18n/index.ts:332` that I did not touch.

## Open work for sub-page agents

- Each sub-page agent imports `SettingsPage`, `SettingsField`, and
  `useSettingsGroup` from `@renderer/settings`, then calls
  `registerSettingsPage(id, () => <MyPanel />)` and (optionally)
  `registerSettingsNavEntry(...)` to override label/icon.
- Sub-pages do NOT render their own Save / Discard buttons — the shell
  footer drives them via the window events. They may render extra
  page-level actions in the `actions` slot of `<SettingsPage>` (e.g.
  "Reset to defaults", "Import…").
- Persistence groups currently in the schema:
  `general, appearance, shortcuts, notifications, language,
  voice-audio, capabilities, connectors, desktop-app`. Sub-page agents
  that need a new group must extend `src/shared/settings-schema.ts`
  first (outside my ownership).