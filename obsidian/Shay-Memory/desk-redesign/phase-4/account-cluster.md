---
title: Phase 4 — Settings · Account cluster
date: 2026-05-29
label: account-cluster
phase: 4-settings-decomposition
permalink: shay-memory/desk-redesign/phase-4/account-cluster
---

## Scope delivered

Five sibling Settings sub-pages registered into the Phase 4 SettingsShell
via `registerSettingsPage` + `registerSettingsNavEntry`.

## Files created (ownership)

- `src/renderer/src/settings/pages/General.tsx`
- `src/renderer/src/settings/pages/Account.tsx`
- `src/renderer/src/settings/pages/Privacy.tsx`
- `src/renderer/src/settings/pages/Billing.tsx`
- `src/renderer/src/settings/pages/Usage.tsx`

No files outside ownership touched. The legacy
`screens/Settings/Settings.tsx` was left untouched — Phase 6 removes it.
No edits to `package.json`, `settings-schema.ts`, or any shared chrome.

## Architecture

All five pages share the same shape:

- Default export + named export of a `*SettingsPage` component.
- Module-level `registerSettingsPage(id, () => <Page />)` so the shell
  renders us whenever its `activeId` matches.
- Module-level `registerSettingsNavEntry({ id, label, icon, category,
  order })` so the rail entry is authoritative even if the default
  manifest changes.
- Every page is wrapped in `<SettingsPage title subtitle [actions]>`,
  which itself wraps a `<FeatureBoundary>`. Body controls compose
  `<SettingsField>` so labels, help text, dirty dots, and errors are
  consistent.
- No page renders its own Save / Discard buttons — the shell footer
  drives those via the `shay:settings:save` / `shay:settings:discard`
  window events listened to by `useSettingsGroup`.

## Persistence mapping

| Field                                | Backing                                          |
|--------------------------------------|--------------------------------------------------|
| General · Launch on startup          | `general.launchOnStartup` (schema)               |
| General · Default mode on launch     | `general.defaultMode` (schema)                   |
| General · Confirm quit with tasks    | `general.confirmQuitWithRunningTasks` (schema)   |
| General · Startup behavior           | local UI state (schema field not yet defined)    |
| General · Default project on launch  | placeholder dropdown (project list = Phase 5)    |
| General · Send anonymous diagnostics | stub `window.shay.diagnostics.setTelemetryEnabled` |
| Privacy · Send anonymous telemetry   | stub `window.shay.privacy.setTelemetryEnabled`   |
| Privacy · Send crash reports         | `desktop-app.crashReporterEnabled` (schema)      |
| Privacy · Improve via my prompts     | stub `window.shay.privacy.setPromptImprovementEnabled` (default OFF) |
| Privacy · Export my data             | stub `window.shay.privacy.exportData`            |
| Privacy · Clear local cache          | stub `window.shay.privacy.clearLocalCache`       |
| Account · Profile, providers         | read `window.shay.account.profile/providers`     |
| Account · Sign out / Switch account  | stub `window.shay.account.{signOut,switchAccount}` |
| Billing · Plan, allowances, invoices | read `window.shay.account.{plan,invoices}`       |
| Billing · Manage plan CTA            | `window.shay.account.openManagePlan` → `shell.openExternal` → `window.open` |
| Usage · Windows, per-brain, daily    | read `window.shay.account.usage()`               |
| Usage · Extra-usage manage link      | external `https://claude.ai/settings/usage`      |

Stub calls log a `console.info` with the precise method name + payload so
they're discoverable when Phase 5 lands. They never throw — if the bridge
is missing, the UI keeps working with sensible defaults.

## Behavior matches Claude Desktop where the spec is silent

- Quick-link cards on General fire a `shay:settings:navigate` window
  event with the target `groupId`. The shell does not yet listen for
  that event (its nav-switching is driven by `SettingsNav.onSelect`),
  so the chrome agent can add a one-line `addEventListener` to wire it
  in Phase 6. Until then the cards still render and behave like
  affordances; clicking is a no-op rather than a crash.
- Per-bar usage colors: blue under 70%, amber 70–89%, red ≥ 90%. Same
  thresholds on Billing's allowances and Usage's plan windows.
- Avatar falls back to initials chip when no `avatarUrl` is provided.
- Plan / providers / allowances / invoices each render a polite empty
  state when the bridge is missing or returns nothing.
- "Send anonymous telemetry", "Send crash reports", and "Allow improving
  Shay via my prompts" all default to OFF (the prompt-improvement
  default is called out by the task brief).

## TypeScript

`npx tsc -p tsconfig.web.json --noEmit` reports zero errors for any of
the five files in my ownership. The two pre-existing errors in
`src/renderer/src/settings/pages/DesktopExtensions.tsx` (a sibling
agent's file) are unchanged and untouched.

## Stub surface for Phase 5

The bridges expected on `window.shay` (all optional, all narrow):

```ts
window.shay.account = {
  profile(): { name; email; avatarUrl? } | null
  providers(): Array<{ id; provider; label; status; lastSignedInAt? }>
  signOut(): void
  switchAccount(): void
  plan(): {
    name; renewalCadence?; renewsAt?; manageUrl?;
    allowances?: Array<{ id; label; used; limit; unit? }>
  } | null
  invoices(): Array<{ id; date; amountFormatted; status; url? }>
  openManagePlan(url?): void
  usage(): {
    windows: Array<{ id; label; used; limit; resetsAt?; unit? }>
    perBrain: Array<{ id; label; used; unit? }>
    daily: Array<{ date; used }>
    extraUsage?: { enabled; manageUrl? }
  } | null
}

window.shay.privacy = {
  getTelemetryEnabled() / setTelemetryEnabled(boolean)
  getPromptImprovementEnabled() / setPromptImprovementEnabled(boolean)
  exportData(): string | null         // returns export path
  clearLocalCache(): void
}

window.shay.diagnostics = {
  getTelemetryEnabled() / setTelemetryEnabled(boolean)
}

window.shay.shell = {
  openExternal(url: string): void
}
```

## Open follow-ups

- Extend `src/shared/settings-schema.ts` with `privacy` and (optionally)
  `account-prefs` groups so the stub-backed toggles flip to
  schema-backed without UI changes. Until then, telemetry +
  prompt-improvement settings live in process memory.
- Wire `shay:settings:navigate` listener in `SettingsShell` so the
  General quick-links actually flip the active panel. One-liner.
- Plug a real project list into "Default project on launch" once the
  project slice exposes one.
- Add per-day usage chart visualization (sparkline / line chart) when a
  charting primitive ships in `components/charts/`.
