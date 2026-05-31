---
title: Phase 2 — Command Palette
date: 2026-05-29
phase: 2
label: command-palette
status: complete
permalink: shay-memory/desk-redesign/phase-2/command-palette
---

## Scope shipped

- `src/renderer/src/lib/command-registry.ts` — singleton registry +
  open-signal store. Exposes `registerCommand`, `unregisterCommand`,
  `getCommandEntries`, `getCommandsByGroup`, `subscribeCommands`,
  `subscribePaletteOpen`, `openCommandPalette`, `closeCommandPalette`,
  `ensureBuiltInCommands`. Eight built-in stubs pre-registered:
  `open-settings`, `new-session`, `toggle-sidebar`, `toggle-thinking`,
  `/compact`, `/clear`, `switch-brain`, `open-logs`. Each `run` dispatches a
  `shay:command:<name>` CustomEvent on `window` so the downstream
  Phase-2/3 owner of each surface (TopBar, Sidebar, Composer) can wire
  behavior without this module importing them.
- `src/renderer/src/lib/command-registry.test.ts` — 13 vitest cases.
  Covers built-ins, id uniqueness, group validation, register/unregister
  round-trip, duplicate-id rejection, unknown-group rejection,
  subscribe notifications, open/close + nonce, last-query persistence,
  and the CustomEvent dispatch path. All pass.
- `src/renderer/src/shell/CommandPalette.tsx` — cmdk-composed palette.
  Renders into a portal on `document.body`, gated by the registry's open
  signal. Subscribes to sessions via `stores/sessions` (Sessions group)
  and registry entries via `useSyncExternalStore` for the rest. Esc
  closes, overlay click closes, ⌘K toggles open/close via
  `useShortcuts({ "palette.open": togglePalette })`. Auto-focuses search
  on mount. Group order matches `COMMAND_GROUPS`: Sessions, Projects,
  Chapters, Commands, Skills, MCP Tools, Files in project. Empty groups
  are dropped silently.
- `src/renderer/src/shell/CommandPalette.module.css` — token-driven
  styling, honors `prefers-reduced-motion` and the theme/density CSS
  vars already shipped in `styles/tokens.css`.

## Continuity decision

Spec §5 calls for the last query to persist briefly after close. The
scope said "in stores/nav for a moment after close" but the nav store
sits outside command-palette ownership. I kept the persistence in the
registry singleton with a 60s TTL (`LAST_QUERY_TTL_MS`). Behavior is
identical from the user's point of view; if the TopBar owner later
wants the value to survive renderer reload, they can promote it to a
`nav.lastPaletteQuery` field then.

## Wire-up for downstream agents

- TopBar search button → call `openCommandPalette(initialQuery?)`.
- TopBar session-name dropdown → already gets sessions via the
  Sessions group automatically (sourced from `stores/sessions`).
- Sidebar / Slot menu / Skills / MCP / Files agents → call
  `registerCommand({ id, group: "Skills" | "MCP Tools" | ..., label,
  hint?, keywords?, icon?, run })` from their own module's mount
  effect; return the unsubscribe in the cleanup.
- Built-in stub event names (window CustomEvents):
  `shay:command:open-settings`, `…:new-session`, `…:toggle-sidebar`,
  `…:toggle-thinking`, `…:slash-compact`, `…:slash-clear`,
  `…:switch-brain`, `…:open-logs`, `…:open-session` (detail
  `{ sessionId }`).

## Verification

- `npx vitest run src/renderer/src/lib/command-registry.test.ts` — 13/13
  pass.
- `npx tsc -p tsconfig.web.json --noEmit` — clean for the four files
  owned by this label. Other shell-folder errors (ChatTab, ElapsedTimer,
  ProjectChip, SessionNamePicker, SidebarSection, TopBarOverflow) are
  pre-existing in files owned by other Phase 2 agents and were not
  modified.

## Not in scope here

- Wiring the palette into `AppShell` / mounting it once at the root.
- Providing real sources for Projects / Chapters / Skills / MCP Tools /
  Files in project (left as empty groups; downstream agents register
  entries from their owned modules).
- Promoting `lastPaletteQuery` into the nav slice — left as a registry
  TTL until a TopBar/AppShell owner decides whether to persist it.