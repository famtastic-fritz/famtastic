---
title: Phase 4 — Desktop app cluster (General / Extensions / Developer)
date: 2026-05-29
label: desktop-cluster
phase: 4-settings-decomposition
permalink: shay-memory/desk-redesign/phase-4/desktop-cluster
---

## Scope delivered

Three sub-pages under the Settings → Desktop app subsection, each landing
alongside the legacy `screens/Settings/Settings.tsx` monolith. The monolith
remains untouched; Phase 6 polish removes it.

## Files created (ownership)

- `src/renderer/src/settings/pages/DesktopGeneral.tsx`
- `src/renderer/src/settings/pages/DesktopExtensions.tsx`
- `src/renderer/src/settings/pages/DesktopDeveloper.tsx`

## Files touched outside ownership

- `src/shared/settings-schema.ts` — extended the three dedicated per-page
  groups (`desktop-app-general`, `desktop-app-extensions`,
  `desktop-app-developer`) and the legacy aggregate `desktop-app` group
  with the fields this cluster needs:
  - `desktop-app-general`: added `launchOnLogin`, `minimizeToTray`,
    `dockBadgeStyle`, `closeAction`. The agent that introduced the split
    groups had already added `windowSizeOnLaunch` and `alwaysOnTop`.
  - `desktop-app-developer`: added `autoOpenDevToolsOnError`.
  - `desktop-app` (legacy aggregate): added the same fields plus the
    Phase-4 dock/window controls so any code still reading the umbrella
    group continues to type-check. Both groups coexist — the new pages
    write to the dedicated per-page groups, not the umbrella.
  - DEFAULTS updated for all touched groups.

Schema extension is necessary because the task scope (launch-at-login,
tray, always-on-top, dock badge style, window size, close action,
auto-open-devtools-on-error) is not expressible against the pre-split
schema. The settings-shell agent's notes explicitly anticipated this:
"Sub-page agents that need a new group must extend `settings-schema.ts`
first."

## Architecture

All three pages follow the same skeleton:

1. Import `SettingsPage`, `SettingsField`, `useSettingsGroup`, and
   `registerSettingsPage` from `@renderer/settings`.
2. Call `useSettingsGroup("<group-slug>")` for typed values + dirty
   tracking + save/discard wiring.
3. Render fields using `<SettingsField label help htmlFor isDirty>`.
4. Self-register with the shell at module load via
   `registerSettingsPage("<nav-entry-id>", () => <Page />)`. The nav
   entry ids are already pre-populated by `SettingsNav.tsx`'s
   `DEFAULT_ENTRIES` manifest.

No page renders its own Save / Discard — the shell footer drives them
via the `shay:settings:save` / `shay:settings:discard` window events
that `useSettingsGroup` listens for.

### DesktopGeneral

Group: `desktop-app-general`. Fields surfaced:

| Control                | Schema field            | Type    |
|------------------------|-------------------------|---------|
| Launch at login        | `launchOnLogin`         | bool    |
| Minimize to tray       | `minimizeToTray`        | bool    |
| Always on top          | `alwaysOnTop`           | bool    |
| Dock badge style       | `dockBadgeStyle`        | select  |
| Window size on launch  | `windowSizeOnLaunch`    | select  |
| When I close the window| `closeAction`           | select  |

`dockBadgeStyle` is `count | dot | none`. `windowSizeOnLaunch` is
`restore | default | maximize`. `closeAction` is `hide | quit`.

### DesktopExtensions

Group: `desktop-app-extensions`. Page-level field:

- Auto-update extensions → `autoUpdate`

Per-row controls in the extensions table:

- Enable/disable toggle → patches `entries[id].enabled` while preserving
  `id`, `name`, and `installedAt`.
- View details → calls `window.shay.plugins.openDetails(id)` if present,
  otherwise alerts that it's coming with Phase 5.
- Uninstall → confirms, calls `window.shay.plugins.uninstall(id)`,
  removes the persisted entry from `entries` and `loadedIds`.

The page resolves the live manifest list via `window.shay.plugins.list()`
defensively — feature-detects the bridge at call time and degrades to an
empty state with a friendly message when the bridge isn't wired yet
(Phase 5 work). When the bridge is available, live plugin data is
merged over the persisted `entries` so the table renders before the
bridge wakes up. Bridge surface assumed:

```ts
interface ShayPluginsBridge {
  list?: () => Promise<PluginManifestEntry[]>;
  uninstall?: (id: string) => Promise<{ success: boolean; error?: string }>;
  openDetails?: (id: string) => Promise<void> | void;
  reload?: (id: string) => Promise<void> | void;
}
```

The Refresh action in the page header re-pulls the live list.

### DesktopDeveloper

Group: `desktop-app-developer`. Fields surfaced:

| Control                          | Schema field              | Type    |
|----------------------------------|---------------------------|---------|
| Open DevTools on launch          | `openDevToolsOnLaunch`    | bool    |
| Auto-open DevTools on error      | `autoOpenDevToolsOnError` | bool    |
| Log level                        | `logLevel`                | select  |

Buttons (bridge-driven, no schema persistence):

- Open user data dir → `window.shay.devtools.openUserDataDir()`, falls
  back to `getUserDataPath()` + `hermesAPI.openExternal(file://…)`,
  falls back to a friendly "coming with Phase 5" toast.
- Open logs dir → mirror chain via `openLogsDir` / `getLogsPath`.
- Reset Desk → `window.confirm` → `window.shay.devtools.resetDesk()`.
  Confirm message spells out exactly what gets wiped (Desk-local state)
  and what stays (gateway data).

Bridge surface assumed:

```ts
interface ShayDevtoolsBridge {
  openDevTools?: () => Promise<void> | void;
  closeDevTools?: () => Promise<void> | void;
  openUserDataDir?: () => Promise<void> | void;
  openLogsDir?: () => Promise<void> | void;
  resetDesk?: () => Promise<{ success: boolean; error?: string }>;
  getUserDataPath?: () => Promise<string>;
  getLogsPath?: () => Promise<string>;
}
```

A transient `status` line beneath the relevant control flashes for 3s
to confirm the action or surface a friendly error.

## Persistence flow (verified by inspection, not yet wired E2E)

`<page>` → `useSettingsGroup("desktop-app-*")` →
`settings-service.{getGroup,setGroup}` → resolver chain
(`window.shay.settings` → `hermesAPI` → raw IPC → localStorage) →
Phase-0 `settings-handler` → `<userData>/settings.json`.

Save sends only the changed-key delta (per the shell agent's
implementation), so two pages writing different sub-keys of the same
record never trample each other's edits.

## Behavior matches Claude Desktop where spec is silent

- Save/Discard appear only when the active group has unsaved edits.
- Nav switching while dirty prompts to discard (via the shell-level
  `beforeunload` handler in `SettingsShell.tsx`).
- Plugin bridge absence does not throw — degrades to a friendly empty
  state and "coming with Phase 5" toasts.

## TypeScript

`npx tsc -p tsconfig.web.json --noEmit` reports zero errors for any
file in my ownership, and zero new errors elsewhere. Pre-existing
errors documented in earlier Phase 4 notes (legacy `screens/Settings/
Settings.tsx`, `src/shared/i18n/index.ts:332`) are unchanged.

## Open work for downstream phases

- Phase 5 plugins backend needs to expose `window.shay.plugins.list /
  uninstall / openDetails` so DesktopExtensions populates.
- Phase 5 devtools backend needs to expose `window.shay.devtools.*` so
  the buttons stop showing "coming with Phase 5" status.
- Main process (`src/main/`) needs to react to:
  - `desktop-app-general.launchOnLogin` → `app.setLoginItemSettings(...)`
  - `desktop-app-general.alwaysOnTop` → `mainWindow.setAlwaysOnTop(...)`
  - `desktop-app-general.dockBadgeStyle` → `app.dock.setBadge(...)` /
    Windows overlay icon
  - `desktop-app-general.windowSizeOnLaunch` → window restore behavior
    in `createWindow()`
  - `desktop-app-general.closeAction` → tweak the existing
    `'close'` handler on the main window
  - `desktop-app-developer.openDevToolsOnLaunch` → DevTools open at
    window ready
  - `desktop-app-developer.autoOpenDevToolsOnError` → install a
    `window.onerror` / `webContents.on('render-process-gone')` listener
  - `desktop-app-developer.logLevel` → push into the existing logger.

All of those are downstream wiring jobs — the UI surface and durable
schema are in place now.
