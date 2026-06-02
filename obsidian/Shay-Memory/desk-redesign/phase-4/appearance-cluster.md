---
title: appearance-cluster
type: note
permalink: shay-memory/desk-redesign/phase-4/appearance-cluster
---

# Phase 4 — Appearance Cluster (Themes / Shortcuts / Language)

**Agent label:** appearance-cluster
**Date:** 2026-05-29
**Status:** Shipped (typecheck clean under strict mode)

## What landed

Three Settings sub-pages, all self-registering with the Phase 4 shell via
`registerSettingsPage` + `registerSettingsNavEntry`. Each page uses
`SettingsPage` + `SettingsField` + `useSettingsGroup` so persistence flows
through the Phase 0 `settings.get/set` IPC contract.

### `src/renderer/src/settings/pages/Themes.tsx`
- Group: `appearance` (`AppearanceSettings`).
- Theme tri-state (light / dark / system) — segmented control with ARIA
  `radiogroup` semantics.
- Density segmented control (compact / comfortable, see gap below).
- Accent picker — 10-swatch grid + free-form hex input with regex
  validation; invalid hex surfaces as inline error and does NOT call
  `set()` so the working copy stays clean.
- Font family select (system / inter / jetbrains-mono).
- Motion segmented control (auto / reduced / full).
- Live preview panel (right column) reading the **working copy**, not the
  persisted snapshot, so the user sees every edit before save. Preview
  shows accent swatch, primary/secondary buttons, sample text, and a
  metadata table.

### `src/renderer/src/settings/pages/Shortcuts.tsx`
- Group: `shortcuts` (`ShortcutsSettings.bindings`).
- Reads every entry from `@renderer/lib/shortcuts.SHORTCUTS`, groups by
  category via `shortcutsByCategory()`.
- Per-row UI: description + id/scope (mono), current binding button,
  Reset button. Reset is enabled only when row is overridden.
- Click the binding button → row enters "recording" mode. A global
  `keydown` capture listener converts the next non-modifier keystroke
  into a tinykeys-compatible string and writes the binding. Esc cancels.
- Conflict detection: after writing, if any other shortcut now resolves
  to the same effective key, the row shows "Conflicts with: …" in
  danger color. Resolving either side clears the message live.
- Header action: "Reset all" → `resetToDefaults()` (clears every
  override; Save commits, Discard reverts).
- Bindings persist as `ShortcutBinding` records:
  `{ id, scope, defaultKey, currentKey }`. Reset *deletes* the record so
  future manifest default changes flow through cleanly.

### `src/renderer/src/settings/pages/Language.tsx`
- Group: `language` (`LanguageSettings`).
- App locale select sourced from `APP_LOCALES` (7 locales: en, es, id,
  ja, pt-BR, zh-CN, zh-TW). Native-script labels.
- Region picker (US / UK / EU) with a live `Intl.DateTimeFormat` +
  `Intl.NumberFormat` preview panel. **Not persisted** (see gap below).
- "Spell-check while typing" checkbox toggling `spellCheckEnabled`.
- Spell-check dictionary picker — 10-language checkbox grid that mutates
  `spellCheckLanguages` (BCP-47 codes). Greyed out when spell-check is
  off. Dictionary list is delegated to the OS; we just publish the
  selection through the schema.

## How they wire into the shell

Each module ends with the self-registration pair:

```ts
registerSettingsPage("themes", () => <ThemesSettingsPage />);
registerSettingsNavEntry({ id: "themes", label: "Themes", icon: "theme",
  category: "Appearance", order: 10 });
```

The shell already had placeholder nav entries for these ids
(`themes`, `shortcuts`, `language`) in `SettingsNav.tsx`'s `DEFAULT_ENTRIES`,
so the re-registration just overwrites with the same metadata. The page
renderers populate the `pageRegistry` so the shell now resolves them
instead of showing the "Coming soon" placeholder.

For these to load, *something* in the renderer entry tree must import
each module (or a barrel). I did NOT add the imports because that lives
outside my ownership scope — recommend the Phase 4 settings-shell agent
or Phase 6 polish agent wire a `src/renderer/src/settings/pages/index.ts`
barrel that side-imports every page module, then have `App.tsx` (or
wherever SettingsShell mounts) import the barrel once.

## Schema gaps surfaced (NOT fixed — out of scope)

1. **Density tri-state.** Spec asks for compact / comfortable / spacious.
   `AppearanceSettings.density` only allows `"comfortable" | "compact"`.
   The Themes page renders Spacious as a disabled segmented option with
   a tooltip explaining the gap. Fix: extend the union in
   `src/shared/settings-schema.ts` and bump `DEFAULTS.appearance`.
2. **Typography scale.** Spec asks for "Font family + size (typography
   scale)". `AppearanceSettings` has `fontFamily` but no `fontSize`.
   Themes ships the family picker fully wired and a preview-only scale
   picker. Fix: add `fontSize: "sm" | "md" | "lg"` (or a token name) to
   `AppearanceSettings` + defaults.
3. **Region.** Spec asks for "Region (US/UK/EU date+number formats)".
   `LanguageSettings` has no `region` key. Language renders Region as a
   preview-only picker. Fix: add `region: "us" | "uk" | "eu"` (or full
   BCP-47) to `LanguageSettings` + defaults.

All three gaps are appropriate Phase 6 polish work or a quick
schema-only PR that this cluster's UI is already ready to consume.

## Verification

- `npx tsc -p tsconfig.web.json --noEmit` → no errors in any of the three
  new files. (Pre-existing errors in `Connectors.tsx` /
  `DesktopExtensions.tsx` are owned by other agents.)
- `screens/Settings/Settings.tsx` untouched — old monolith stays until
  Phase 6 polish per the constraints.
- No `package.json` changes. No edits outside my declared ownership.
- All persistence flows through `useSettingsGroup` → `settingsService` →
  Phase 0 `settings.get/set` IPC. No `localStorage` writes from these
  pages (theme/density helpers in `styles/theme.ts` + `styles/density.ts`
  remain the boot-time hydration path; they will be ported to read the
  `appearance` group in a later pass).

## Files

- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/renderer/src/settings/pages/Themes.tsx`
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/renderer/src/settings/pages/Shortcuts.tsx`
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/renderer/src/settings/pages/Language.tsx`