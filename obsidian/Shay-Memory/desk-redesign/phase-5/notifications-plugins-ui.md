---
title: notifications-plugins-ui
type: note
permalink: shay-memory/desk-redesign/phase-5/notifications-plugins-ui
---

# Phase 5 · notifications-plugins-ui

## Scope landed

Two new Advanced-category Settings sub-pages plus the renderer/main wiring
they need.

### Files created

Renderer · admin/notifications:
- `src/renderer/src/admin/notifications/NotificationsAdminPage.tsx`
- `src/renderer/src/admin/notifications/DndScheduler.tsx`
- `src/renderer/src/admin/notifications/CategoryRulesTable.tsx`
- `src/renderer/src/admin/notifications/NotificationsAdminPage.module.css`
- `src/renderer/src/admin/notifications/index.ts`

Renderer · admin/plugins:
- `src/renderer/src/admin/plugins/PluginsPage.tsx`
- `src/renderer/src/admin/plugins/PluginCard.tsx`
- `src/renderer/src/admin/plugins/PluginDetailsDrawer.tsx`
- `src/renderer/src/admin/plugins/InstallPluginDialog.tsx`
- `src/renderer/src/admin/plugins/PluginsPage.module.css`
- `src/renderer/src/admin/plugins/index.ts`

Renderer · services:
- `src/renderer/src/services/plugins-service.ts` — typed wrapper around
  `window.shay.plugins.*` with `shayPluginsRpc` fallback for isolated
  preload, mirroring the `notifications-service` pattern.

Main / preload (edits, not new):
- `src/main/domains/plugins.ts` — replaced the empty `listPluginsFromDisk`
  stub with a real best-effort disk walker. Resolves
  `$SHAY_BUNDLED_PLUGINS || bundled` + `~/.shay/plugins` +
  (optional, env-gated) `$PWD/.shay/plugins`. Reads each
  `plugin.yaml`/`plugin.yml` via an inline tiny YAML scalar/list parser
  (no `js-yaml` dependency yet). Cross-references
  `~/.shay/config.d/plugins.yaml` for `enabled` / `disabled` lists. All
  other write methods (`enable`/`disable`/`install`/`uninstall`/
  `configure`/`previewInstall`/`details`) still throw `NotImplemented`
  pending the gateway router landing in Phase 6 — the UI handles that
  gracefully (inline error, no crash).
- `src/preload/plugins-domain.ts` — unchanged; already exposes the
  surface via `shayPluginsRpc` (isolated) or merges into `window.shay`.

## Settings nav registrations

- `notifications-admin` → "Notifications (admin)" · category Advanced ·
  icon `dnd` · order 30. Mounts `NotificationsAdminPage`.
- `plugins` → "Plugins" · category Advanced · icon `context` · order 20.
  Mounts `PluginsPage`.

Icon choices: the icon registry has no `bell` or `plug` entry and that
file is outside our ownership. `dnd` (BellOff) reads correctly for the
admin notifications surface and `context` (SquareStack) is the closest
"stack of plugins" semantic available.

## Behaviour highlights

NotificationsAdminPage:
- `useEffect` fetch of `notificationsService.getDnd()` +
  `getRules()` on mount, with a status line + inline error.
- Two-column layout (collapses below 1100px) — DndScheduler on the left,
  CategoryRulesTable on the right.
- Every toggle persists immediately via `setDnd` / `setRule`, with
  optimistic local update and a revert on failure.
- "Send test" header action posts a `system/info` notification through
  `window.shay.notifications.emit` (Phase 3 surface).

DndScheduler:
- 7-day × N-category grid. Click an "All categories" cell to cycle
  through Night (22:00–07:00) → Workday (09:00–17:00) → off. Per-category
  rows are visually grouped but disabled (tooltip flags Phase 6 work)
  because the domain's `DndSchedule.windows[]` is currently global only.
- Includes "Apply every-night preset" and "Clear all" toolbar buttons.

CategoryRulesTable:
- Six categories (`approval`, `task`, `mention`, `system`, `auth`,
  `update`) × four channels (sound, banner, dock badge, ping-me-default).
- "Ping me" shadows `inAppPulse` until the domain grows a dedicated
  flag in Phase 6 — documented in the file header.

PluginsPage:
- Search box + count line + responsive auto-fill card grid.
- Header actions: Refresh / Browse marketplace (stub) / Install from
  URL/file (opens `InstallPluginDialog`).
- Optimistic enable/disable through `pluginsService.enable/disable`,
  with revert on `NotImplemented` and inline error display.
- Uninstall guarded behind `window.confirm` (keychain secrets preserved
  note inline).
- `PluginDetailsDrawer` mounts as a right-side overlay with manifest,
  permissions, file list (first 50), and changelog. Closes on Escape /
  backdrop click / Close button.

InstallPluginDialog:
- Three modes: From URL · Local file (`.zip`/`.tar.gz`/`.tgz`) · Marketplace
  (disabled — Phase 6). Local file uses a hidden `<input type="file">`
  and surfaces `file.path` (Electron renderer when sandbox=off).
- Two-stage flow: collect → previewInstall → confirm. Manifest +
  declared permissions are surfaced BEFORE the user confirms.

## Constraints honoured

- Additive only — no files outside the declared ownership were edited.
- `package.json` untouched.
- TypeScript strict passes (`tsc --noEmit` on both
  `tsconfig.node.json` and `tsconfig.web.json` shows only the
  pre-existing `src/shared/i18n/index.ts` portability warning, which is
  not in our scope and existed before this pass).
- Settings registration follows the canonical Account.tsx pattern
  (`registerSettingsPage` + `registerSettingsNavEntry`).

## Known follow-ups for Phase 6

1. Wire `enable/disable/install/uninstall/configure/previewInstall/details`
   to the real backend once `gateway/desk_plugins_routes.py` lands.
2. Replace the inline YAML reader with `js-yaml` once it is added as a
   dependency (current parser handles only top-level scalars + simple
   lists).
3. Extend the DndSchedule shape to per-category windows so the
   per-category rows in `DndScheduler` can edit.
4. Swap `setRule` for a bulk `setRules` in `CategoryRulesTable` once
   the domain method ships.
5. Add `bell` and `plug` icons to the icon registry and re-point the two
   nav entries at them.
6. The admin notifications page is not imported anywhere yet — Phase 6
   needs to add `import "@renderer/admin/notifications";` and
   `import "@renderer/admin/plugins";` to the renderer entry so the
   side-effect registrations actually run.