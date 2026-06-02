---
title: Phase 2 — Sidebar progress
date: 2026-05-29
phase: phase-2-sidebar
label: sidebar
permalink: shay-memory/desk-redesign/phase-2/sidebar
---

## Status

Sidebar shell landed. `npm run typecheck:web` passes clean. Pre-existing
`typecheck:node` error in `src/main/sessions-overlay.ts:281` is unrelated
to this slice.

## Files created

- `src/renderer/src/shell/Sidebar.tsx`
- `src/renderer/src/shell/SidebarModeTabs.tsx`
- `src/renderer/src/shell/SidebarPrimaryActions.tsx`
- `src/renderer/src/shell/SidebarSection.tsx`
- `src/renderer/src/shell/SidebarCustomSections.tsx`
- `src/renderer/src/shell/ProfileMenuButton.tsx`
- `src/renderer/src/shell/Sidebar.module.css`

No files outside the declared OWNERSHIP scope were touched. `package.json`
untouched.

## Layout (top → bottom)

1. **Header** — `SidebarModeTabs` (Chat / Cowork / Code) + collapse
   chevron. Reads/writes `stores/mode`. Under the Chat tab a small
   `terminal` chip wires to a stub callback per spec ("under Chat, add
   terminal capabilities").
2. **PrimaryActions** — vertical stack: `+ New session` (primary tone),
   `⚡ Routines`, `✏ Customize`, `⋯ More`. New session writes a stub
   `SessionRef` to `stores/sessions` and sets it current. A `TODO` is
   logged for wiring to `openCommandPalette('new session')` once the
   palette ships in this phase.
3. **Pinned** — `SidebarSection`, drag-reorder enabled via
   `@dnd-kit/sortable` + `PointerSensor` / `KeyboardSensor`. Reorder
   handler rewrites the local `ids` order via `setAll()`. Remote
   persistence will be wired through the sessions RPC in a later phase.
4. **Recents** — `SidebarSection`, flat-by-recency, sorted by
   `updatedAt desc`, capped at 50 items. No drag.
5. **CustomSections** — `SidebarCustomSections` reads
   `stores/sidebar.customSections`, drag-reorders them with `@dnd-kit/
   sortable`, and merges the new order back into `sectionOrder` while
   preserving the relative positions of built-in section ids. The
   `✏ Customize` action opens a small inline dialog that calls
   `addCustomSection({ id, title, provider })`.
6. **Footer / Profile** — `ProfileMenuButton` ("Fritz · Max" + avatar
   initials). Clicking opens a portal-rendered popover with: Account,
   Plan & Billing, Brains list (stubbed, "unknown" status dots), MCP
   Servers list (stubbed), "Manage Brains + MCP…" link, Theme cycle
   (dark → light → system → dark, applied via `styles/theme.setTheme`),
   Lock, Sign out (danger). Hand-rolled popover: outside-click + ESC
   close, focus moves to first menu item on open, ESC returns focus to
   the trigger.

## Two-stage collapse

`stores/sidebar.mode` drives the stage (`"expanded" | "icons" |
"hidden"`). Single-click chevron cycles expanded ↔ icons; double-click
within 220ms drops to `hidden`. Hidden renders an empty placeholder —
the parent `AppShell` owns the hover-peek trigger per scope.

`Sidebar` accepts an optional `stageOverride` prop so the AppShell can
force a stage (e.g. during a hover-peek) without mutating the store.

## Boundaries

Every subsection (ModeTabs, PrimaryActions, Pinned, Recents,
CustomSections, ProfileMenu) is wrapped in a `FeatureBoundary` with
`scope="panel"` so a single failing section can't take down the entire
sidebar.

## Accessibility notes

- `aria-label` on the sidebar root, `role="tablist"` on ModeTabs with
  `role="tab"` + `aria-selected` on each tab, `role="menu"` /
  `role="menuitem"` on the profile popover, `aria-current="page"` on
  the active session row, `aria-expanded` on the collapse chevron and
  section-header toggles.
- Keyboard: session rows are focusable (`tabIndex={0}`) and respond to
  Enter/Space. Profile popover ESC + outside-click close.
- Icon-only stage: icon buttons get `aria-label` + `title` so SR users
  and hover tooltips still surface the label.
- Inherits global `:focus-visible` ring from `styles/tokens.css`.

## Known follow-ups (out of scope for this slice)

1. Wire `+ New session` to the Phase 2 command palette
   (`openCommandPalette('new session')`).
2. Replace the Customize stub dialog with the real Customize sub-page
   when Phase 4 Settings lands.
3. Replace `BRAIN_STUBS` / `MCP_STUBS` in `ProfileMenuButton` with live
   data once the Phase 5 MCP / Auth admin lands.
4. Wire the terminal affordance chip (`SidebarModeTabs`) to a real
   in-Chat terminal launch when Phase 3 right-panel terminal lands.
5. Persist pinned-session reorder through the Hermes sessions RPC
   (`PATCH /v1/sessions/{id}`) — currently in-memory only.
6. `SidebarSection` exposes a `dragHandleProps` API in
   `SidebarSectionRenderArgs`, but the current renderer spreads the
   listeners directly on the row so the whole row is the drag handle.
   A dedicated grip handle (`Icon name="more-vertical"`) can be wired
   in later if drag-on-hover-only is desired.

## Verification

- `npm run typecheck:web` — pass
- `npm run typecheck:node` — pre-existing unrelated error in
  `src/main/sessions-overlay.ts:281`, untouched by this slice.
- No lint/format runs invoked — left to the parent orchestrator.