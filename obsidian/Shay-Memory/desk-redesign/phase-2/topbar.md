---
title: Phase 2 — TopBar (progress note)
date: 2026-05-29
tags:
- shay
- desk-redesign
- phase-2
- topbar
phase: 2
permalink: shay-memory/desk-redesign/phase-2/topbar
---

# Phase 2 — TopBar

## Ownership shipped

Five files, all NEW under `shay-desktop-electron/src/renderer/src/shell/`:

- `TopBar.tsx` — top shell row composing project chip, session picker,
  model dot, elapsed timer, pin/split, and overflow.
- `SessionNamePicker.tsx` — inline-editable name + chevron popover with
  Pinned / Recents / Search / "+ New session".
- `ProjectChip.tsx` — pill-shaped chip with popover. Per spec §5,
  switching project starts a NEW session bound to it (the parent owns the
  side-effect via `onSwitchProject`).
- `ElapsedTimer.tsx` — 1Hz tick when any task is `running`; otherwise
  "N ago" derived from `lastActivityAt`. Uses `tabular-nums` so digit
  roll causes zero layout reflow (acceptance criterion).
- `TopBarOverflow.tsx` — ⋮ menu with rename / duplicate / export /
  archive / delete / share.
- `TopBar.module.css` — scoped styles, all tokens via CSS vars.

## Stores wired

- `useNavStore` — back/forward via `goBack()` / `goForward()` /
  `canGoBack()` / `canGoForward()`.
- `useSessionsStore` — current session lookup via
  `useSyncExternalStore` so pin-flag flips re-render the icon; pin
  toggle writes `upsertSession({ ...session, pinned: !pinned })`.
- `useModelStore` — provider + model fields drive the model dot label.
- `useTabsStore` — split toggle collapses to single when already split;
  otherwise dispatches `open-in-split` CustomEvent for the ChatTabsRow
  agent to handle.
- `useTasksStore` — `selectTaskCounters().running > 0` gates the
  ElapsedTimer's ticking branch.

## Keyboard

- `cmd+shift+p` (registered locally via `tinykeys`) toggles pin on the
  current session. The shortcut id is not yet in the global
  `SHORTCUTS` manifest because that's edited only by the lib/shortcuts
  owner; when Settings → Shortcuts lands the id `topbar.pinSession`
  should be added there with `keys: "$mod+Shift+p"`.

## Cross-agent contracts

- **cmdk subagent**: `openCommandPalette()` is a prop. Until the cmdk
  agent ships its action, the search button falls back to
  `window.dispatchEvent(new CustomEvent("shay:open-command-palette"))`
  and emits one console.warn. TODO marker is in `TopBar.tsx`.
- **ChatTabsRow subagent**: split toggle emits
  `window.dispatchEvent(new CustomEvent("open-in-split", { detail: {
  sessionId, source: "topbar" } }))`. When already split, we collapse
  via `useTabsStore.setSplitMode("single", null)`.
- **Rename**: SessionNamePicker owns inline-edit. Overflow → "Rename"
  emits `shay:rename-session` so the picker can switch to edit mode
  without a parent prop drill.
- **AppShell agent**: imports of all five files use `@renderer/...`
  paths so any AppShell mount can `import { TopBar } from
  "@renderer/shell/TopBar"` without touching this barrel.

## Sessions overlay db (deferred)

Per build-plan §Phase 2, real session pin/rename/archive flows write to
`~/.shay/desktop/sessions-overlay.db` via Hermes RPC. For now:

- Pin toggle writes only the in-memory store. Persistence lands when
  the gateway PR for `PATCH /v1/sessions/{id}` is up.
- Overflow actions (rename/duplicate/export/archive/delete/share) are
  wired as props — the parent (AppShell wave) supplies the real
  callbacks. Disabled state shows when no `sessionId` is present.

## Acceptance vs build-plan §Phase 2

- [x] TopBar elapsed timer ticks without layout reflow
      (`font-variant-numeric: tabular-nums`).
- [x] Session-name dropdown shows pinned + recents + search inline.
- [x] All icons via `<Icon name=".." />`.
- [x] No hard-coded colors — every value via tokens.css CSS vars.
- [x] TypeScript strict passes for all five files under
      `src/renderer/src/shell/`.
- [ ] Pin/rename/archive routes through Hermes RPC + overlay db —
      deferred to the sessions-overlay wave (parent agent's wiring).
- [ ] CmdK fuzzy match — owned by cmdk subagent; this TopBar exposes
      the entry point via prop + event.

## Known follow-ups for next waves

- Register `topbar.pinSession` in `lib/shortcuts.ts` manifest so it's
  editable from Settings → Shortcuts.
- Replace the local outside-click + Escape handlers in ProjectChip /
  SessionNamePicker / TopBarOverflow with the shared `<Popover>`
  primitive when Phase 1 design system ships it (snapshot §2 flagged
  the missing primitive).
- `runStartedAt` on `<ElapsedTimer>` is currently `null` — the Phase
  3 task-aggregator owner should wire it to the most-recent
  `running` task's `startedAt`.
- ProjectChip falls back to using `currentSession.projectId` as both
  id AND name when no project list is supplied — fine for the shell
  scaffold; the real project list lands with `sessions-overlay.db`.