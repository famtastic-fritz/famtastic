---
title: settings-integration
type: note
permalink: shay-memory/desk-redesign/phase-4/settings-integration
---

# Phase 4 — settings-integration

**Agent:** settings-integration
**Date:** 2026-05-29
**Scope:** wire the new Settings shell into the existing Settings screen, extend the schema, and stand up the IPC plumbing (settings + account/billing).

## What landed

### Schema (`src/shared/settings-schema.ts`)
Added typed groups + DEFAULTS entries for every Phase 4 sub-page:

- `desktop-app-general` — split off the Advanced cluster
- `desktop-app-extensions` — with rich `DesktopAppExtensionEntry` map
- `desktop-app-developer` — devmode, devtools-on-error, log level
- `themes` — themeId + custom theme map + syncWithSystem
- `account` — read-mostly stub (accountId/email/displayName/provider)
- `privacy` — analytics/crash/training opt-ins + retentionDays
- `billing` — plan/status/renewsAt/portalUrl (read-only mirror)
- `usage` — token tally + per-provider breakdown (read-only mirror)
- `shay-code` — engine + autoApproveSafeTools + injectSoul
- `cowork` — bridgePort + notifyOnPeerJoin + trustedPeerIds

Existing `desktop-app` aggregate kept as compat alias (Phase 4 monolith still reads it). `SETTINGS_GROUPS` array updated so the runtime guard accepts every new id.

### Main process

**`src/main/domains/settings.ts`** — full rewrite. Phase 0 placeholder threw `NotImplemented` on every channel; now each handler proxies to `settings-handler.{getSettings,setSettings}` via the shared `<userData>/settings.json` cache. Surface:

- `shay:settings:get` → `readGroup(group)` — typed groups return merged defaults, loose groups return `{}`
- `shay:settings:set` → `writeGroup(group, patch)` — typed groups persist; loose groups echo the patch back (Phase 5 owns their storage)
- `shay:settings:reset` → applies `DEFAULTS[group]` for schema groups
- `shay:settings:exportAll` → snapshot every schema group + `schemaVersion: 1`
- `shay:settings:importAll` → walk the export payload and call `setSettings` per group
- `shay:settings:changed` push — fans every mutation to every other renderer `WebContents` so popped-out Settings panels stay in sync (sender is excluded to avoid echo)

The `SettingsGroup` union is intentionally loose — it covers the typed schema groups plus the Phase 5 ones (`connection`, `claude-code`, `chrome`, `plugins`, `mcp`, `logs`, `diagnostics`, `backup`, `update`) so the channel surface is forwards-compatible without forcing schema work on every Phase 5 panel up front.

**`src/main/account-domain.ts`** — Phase 4 stub for the auth subsystem. `getProfile()` / `getPlan()` read from the `account` / `billing` / `usage` groups in settings.json; `signOut()` resets the three groups to defaults; `disconnect(id)` removes a connector from `connectors.entries`. Phase 5 will replace these helpers with real PKCE / device-auth flows.

**`src/main/domains/account.ts`** — `shay:account:*` IPC registration that delegates to `account-domain.ts`. Added to `DOMAINS` + `DomainName` union in `src/main/domains/index.ts` so `registerDomains(ipcMain)` wires it on app boot.

### Preload

**`src/preload/settings-domain.ts`** — new module exposing the typed `ShaySettingsAPI`:

- `get<G>(group): Promise<SettingsByGroup[G]>` — schema-aware overload
- `set<G>(group, patch): Promise<SettingsByGroup[G]>` — schema-aware overload
- `reset(group)`, `exportAll()`, `importAll(payload)`
- `subscribe(cb)` — alias for `onChanged(cb)` (renderer-friendly name)

**`src/preload/domains.ts`** — `ShayDomains.settings` is now `ShaySettingsAPI & SettingsDomain` (Object.assign'd at build time) so callers can use either the typed `.subscribe` or the legacy `.onChanged`. Added `account: AccountDomain` to the namespace.

### Renderer

**`src/renderer/src/settings/index.ts`** — added a side-effect `import "./pages"` so the sub-page registry is warm whenever any caller imports the shell barrel.

**`src/renderer/src/settings/pages/index.ts`** — new barrel for Phase 4 sub-pages. Empty for now; Phase 4 sub-page agents add `import "./<id>"` lines as they land. The pages dir doesn't pre-export the registrars on purpose — each sub-page module calls `registerSettingsPage` + `registerSettingsNavEntry` at import time, so a side-effecting import is all the shell needs.

**`src/renderer/src/screens/Settings/Settings.tsx`** — kept the existing 1079-LOC monolith intact, marked the function as `@deprecated` and renamed it to `LegacySettings`. A new wrapper component `Settings` (exported as default) renders `<SettingsShell />` by default with a small `"Use legacy Settings"` checkbox in the top-right corner. The flag is persisted to `localStorage["settings:useLegacy"]` so power users can opt out for one release. Phase 6 polish deletes the legacy half.

## How persistence flows now

```
Phase 4 sub-page form
  ↓ useSettingsGroup("general").set({...})
local working copy + dirty registry
  ↓ shell dispatches "shay:settings:save"
useSettingsGroup save() → settings-service.setGroup
  ↓ window.shay.settings.set("general", patch)   ← typed Phase 4 surface
ipcRenderer.invoke("shay:settings:set", "general", patch)
  ↓
src/main/domains/settings.ts → writeGroup()
  ↓
src/main/settings-handler.ts → setSettings("general", patch) → flush JSON
  ↓
broadcastChange() fans push to every other renderer
  ↓
window.shay.settings.subscribe(...) listeners refresh
```

The renderer `settings-service` still falls through to `hermesAPI` / direct `ipcRenderer.invoke` / `localStorage` if `window.shay.settings.set` ever throws — so panels can opt into the new surface incrementally.

## What I did NOT touch

- `useSettingsGroup.ts`, `SettingsShell.tsx`, `SettingsNav.tsx`, `SettingsPage.tsx`, `SettingsField.tsx`, `SettingsFooter.tsx`, `SettingsHeader.tsx`, `SettingsShell.module.css` — Phase 4 chrome owned by the other Phase 4 agent.
- `src/main/index.ts` — Phase 0 already registers `settings-handler` separately. The new `shay:settings:*` channels register via `registerDomains(ipcMain)` (already wired) so I didn't need to plumb a new top-level call here.
- `src/preload/index.ts` — `exposeShayDomains()` runs from `domains.ts`; the typed surface lights up automatically.
- `package.json`, `tsconfig.*`, `electron.vite.config.ts` — out of scope per the brief.
- The 1079-LOC `LegacySettings` body — left intact behind the toggle.

## Verification

- `npx tsc --noEmit -p tsconfig.web.json` → only the pre-existing `i18n/index.ts` warning that's been there since before Phase 0.
- `npx tsc --noEmit -p tsconfig.node.json` → same, no new errors from my changes.
- `npx vitest run` → 489 passed / 1 failed. The failing test is `src/main/keychain.test.ts` (pre-existing crypto/IV mismatch unrelated to Settings).
- Manual surface check via `--listFiles` confirms `account-domain.ts`, `domains/account.ts`, `domains/settings.ts`, and `preload/settings-domain.ts` all participate in the node build.

## Handoff notes for Phase 4 sub-page agents

1. Drop your panel module under `src/renderer/src/settings/pages/<your-id>.tsx`.
2. At module load, call `registerSettingsPage(id, () => <YourPanel />)` and (optionally) `registerSettingsNavEntry({...})` to overwrite the placeholder label/icon.
3. Inside your panel use `useSettingsGroup("your-group")` — it now goes end-to-end (renderer → preload → main → settings.json → broadcast).
4. Add `import "./<your-id>";` to `src/renderer/src/settings/pages/index.ts` so the shell loads it on first import.
5. For Account / Billing / Usage panels: call `window.shay.account.profile()` / `.plan()` / `.signOut()` / `.disconnect(id)` — currently returns stub data backed by settings.json, ready to swap to real auth in Phase 5.

## Files touched (absolute paths)

- /Users/famtasticfritz/famtastic/shay-desktop-electron/src/shared/settings-schema.ts (extended)
- /Users/famtasticfritz/famtastic/shay-desktop-electron/src/main/domains/settings.ts (rewrote Phase 0 stub)
- /Users/famtasticfritz/famtastic/shay-desktop-electron/src/main/domains/account.ts (created)
- /Users/famtasticfritz/famtastic/shay-desktop-electron/src/main/domains/index.ts (registered account domain)
- /Users/famtasticfritz/famtastic/shay-desktop-electron/src/main/account-domain.ts (created)
- /Users/famtasticfritz/famtastic/shay-desktop-electron/src/preload/settings-domain.ts (created)
- /Users/famtasticfritz/famtastic/shay-desktop-electron/src/preload/domains.ts (added account + typed settings)
- /Users/famtasticfritz/famtastic/shay-desktop-electron/src/renderer/src/settings/index.ts (side-effect import of ./pages)
- /Users/famtasticfritz/famtastic/shay-desktop-electron/src/renderer/src/settings/pages/index.ts (created barrel)
- /Users/famtasticfritz/famtastic/shay-desktop-electron/src/renderer/src/screens/Settings/Settings.tsx (wrapped legacy behind toggle)