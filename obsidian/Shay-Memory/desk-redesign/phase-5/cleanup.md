---
title: cleanup
type: note
permalink: shay-memory/desk-redesign/phase-5/cleanup
---

# Phase 5 · cleanup — Settings barrel + nav overrides

Label: `cleanup`
Date: 2026-05-29

## Scope

Fill in the Phase 4 settings-page barrel and complete the last 5
`registerSettingsNavEntry` calls so that every sub-page in
`src/renderer/src/settings/pages/` self-registers both its renderer AND
its nav row at module-init time.

## Files touched (additive only)

- `src/renderer/src/settings/pages/index.ts`
  - Replaced the lone `export {}` with 17 alphabetical side-effect
    imports (one per sub-page module). Order is alphabetical by file
    name for diff stability — load order is irrelevant for the page
    registry, and there are no conflicting nav-id overrides.
- `src/renderer/src/settings/pages/DesktopGeneral.tsx`
  - Added `registerSettingsNavEntry` import + call.
  - id `desktop-app-general`, label `Desktop App — General`, icon
    `settings`, category `Advanced`, order `10` (mirrors the
    `SettingsNav` default manifest).
- `src/renderer/src/settings/pages/DesktopExtensions.tsx`
  - id `desktop-app-extensions`, label `Desktop App — Extensions`,
    icon `plus`, category `Advanced`, order `20`.
- `src/renderer/src/settings/pages/DesktopDeveloper.tsx`
  - id `desktop-app-developer`, label `Desktop App — Developer`, icon
    `more-vertical`, category `Advanced`, order `30`.
- `src/renderer/src/settings/pages/Notifications.tsx`
  - id `notifications`, label `Notifications`, icon `warn`, category
    `Notifications`, order `10`.
- `src/renderer/src/settings/pages/VoiceAudio.tsx`
  - id `voice-audio`, label `Voice & Audio`, icon `voice`, category
    `Capabilities`, order `20`.

## Verification

- `npm run typecheck` → clean (node + web both passed).
- `npm run lint -- --max-warnings=1700` → exits OK at 1543 problems
  (191 errors, 1352 warnings). All pre-existing — scoped lint over
  just the 6 files I touched showed 3 errors, all on lines I did not
  modify (`Missing return type on function` in VoiceAudio.tsx at
  pre-existing arrow-function locations). My changes introduced no
  new lint errors.
- `grep -c "^import" .../settings/pages/index.ts` → 17 (matches the
  17 page modules in the directory).

## Notes for Phase 6

- The barrel is now the single canonical entry point — anything that
  needs every settings sub-page registered should
  `import "@renderer/settings/pages"` once.
- The nav-entry overrides in the 5 pages just touched re-state the
  values already present in `SettingsNav.DEFAULT_ENTRIES`. That's
  intentional: the page modules now own their nav identity, so future
  label/icon/order changes only need to be made in one place (the
  page file). The default manifest can be trimmed in a later cleanup
  pass once every page registers itself, but I left it alone here to
  stay strictly additive.
- The `Missing return type on function` errors flagged above in
  VoiceAudio.tsx pre-date this task and are unrelated to nav wiring;
  flagging here only so the Phase 6 lint sweep doesn't blame this PR.