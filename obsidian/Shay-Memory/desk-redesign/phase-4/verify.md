---
title: verify
type: note
permalink: shay-memory/desk-redesign/phase-4/verify
---

# Phase 4 — Verify

## Typecheck
PASS. `npm run typecheck` clean (node + web tsc strict mode, no output).

## Lint
1543 problems (191 errors, 1352 warnings) with `--max-warnings=500`.
Delta vs Phase 3: not measured (no Phase 3 baseline captured in this run),
but the lint floor has clearly not been reset. Most errors look like
prettier/prettier formatting + a few `@typescript-eslint/explicit-function-return-type`
in tests. Recommend a `npm run lint -- --fix` sweep in Phase 6 polish —
~1350 of the 1352 warnings are auto-fixable formatting.

## File existence — all present
- `src/renderer/src/settings/` — SettingsField.tsx, SettingsFooter.tsx,
  SettingsHeader.tsx, SettingsNav.tsx, SettingsPage.tsx,
  SettingsShell.module.css, SettingsShell.tsx, index.ts,
  useSettingsGroup.ts, pages/
- `src/renderer/src/settings/pages/` — 17 page modules + index.ts:
  Account, Billing, Capabilities, Connectors, Cowork, DesktopDeveloper,
  DesktopExtensions, DesktopGeneral, General, Language, Notifications,
  Privacy, ShayCode, Shortcuts, Themes, Usage, VoiceAudio.
- `src/main/domains/settings.ts` — present
- `src/main/account-domain.ts` — present
- `src/preload/settings-domain.ts` — present

## Python compile
PASS. `python -m py_compile gateway/desk_tasks_routes.py` → exit 0. Em-dash
fix holds; module imports cleanly under the project venv.

## SettingsShell mount
CONFIRMED. `screens/Settings/Settings.tsx` imports `SettingsShell` (line 7),
side-effect imports the page barrel (line 11: `import "../../settings/pages";`),
and renders `<SettingsShell />` (line 1148) as the default Phase 4 entry
point. A `LEGACY_TOGGLE_KEY = "settings:useLegacy"` localStorage flag still
gates the 1079-LOC monolith for one release — by design per the build plan;
deletion is scheduled for Phase 6.

## 17-page nav coverage
PARTIAL. `SettingsNav.tsx` ships **all 17 placeholder entries** in
`DEFAULT_ENTRIES` (Account/Privacy/Billing/Usage; General/Connectors/
ShayCode/Cowork/Language; Themes/Shortcuts; Capabilities/VoiceAudio;
Notifications; DesktopApp-General/Extensions/Developer) — so the rail
renders all 17 rows out of the box.

However, **12 of 17 page modules call `registerSettingsNavEntry`** to
overwrite their placeholder. The 5 that do not:
DesktopDeveloper, DesktopExtensions, DesktopGeneral, Notifications,
VoiceAudio. Those rows will render with the placeholder label/icon
defined in `SettingsNav.tsx`. Cosmetic, not a blocker.

## CRITICAL BLOCKER — page barrel is empty
`src/renderer/src/settings/pages/index.ts` is a stub with only `export {};`
and a header comment that says "Phase 4 sub-page agents append `import
"./<id>"` lines here as they land." **No sub-page modules are imported.**

Result: `Settings.tsx`'s `import "../../settings/pages"` is a no-op. None
of the 17 pages ever execute their side-effect `registerSettingsPage(...)`
calls. `<SettingsShell>` will fall back to the "Coming soon" placeholder
renderer for every panel.

Fix is one-line-per-page (17 lines total) and should be added to the
barrel before Phase 5 work starts. Cross-cutting between settings-shell
agent and per-cluster agents — likely fell between hand-offs.

## Blockers for Phase 5 (Admin / MCP / Auth)
1. **(critical)** Populate `settings/pages/index.ts` with side-effect
   imports for all 17 sub-pages. Otherwise the new Shell is visually
   live but functionally empty. Phase 5 admin/MCP/auth panels will hit
   the same trap if they live under `settings/pages/`.
2. **(minor)** 5 pages (DesktopDeveloper, DesktopExtensions, DesktopGeneral,
   Notifications, VoiceAudio) don't overwrite their placeholder nav entry.
   Either trust the `DEFAULT_ENTRIES` or have those modules opt in.
3. **(minor)** Lint floor is high (191 errors, 1352 warnings). Phase 5
   should run `lint --fix` early so new admin/MCP/auth code lands clean.
4. **(none)** Backend (Python `desk_tasks_routes.py`) compiles clean and
   the Phase 0 settings-handler IPC surface is in place
   (`main/domains/settings.ts`, `preload/settings-domain.ts`,
   `main/account-domain.ts`). Phase 5 can wire admin/MCP/auth groups
   through the typed schema without additional plumbing.