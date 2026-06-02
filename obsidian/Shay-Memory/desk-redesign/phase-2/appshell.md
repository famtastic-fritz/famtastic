---
title: Phase 2 — AppShell progress
date: 2026-05-29
phase: 2-appshell
agent: appshell
permalink: shay-memory/desk-redesign/phase-2/appshell
---

## Scope delivered

Created the three-column resizable AppShell that will replace the legacy two-column `screens/Layout/Layout.tsx` shell in Phase 5. This pass is **additive only** — `Layout.tsx` was not modified; `App.tsx` still mounts the legacy layout. The new shell lives under `src/renderer/src/shell/`.

## Files created

- `src/renderer/src/shell/AppShell.tsx` — main three-column grid using `react-resizable-panels`. Accepts named slots (`sidebar`, `topbar`, `chatTabs`, `chat`, `rightPanel`, `statusBar`) so other Phase 2 agents (TopBar, Sidebar, ChatTabs) can wire content without touching the shell.
- `src/renderer/src/shell/AppShellSlots.tsx` — typed slot contracts (`AppShellSlots` interface, `AppShellSlotKey` type, `hasAnySlot` helper).
- `src/renderer/src/shell/AppShell.module.css` — CSS Modules layout-only styles (grid, panel chrome, resizer handle, hover-peek trigger). Tokens consumed from `styles/tokens.css` with sensible fallbacks.
- `src/renderer/src/shell/index.ts` — barrel re-export.

## Behaviour

- **Three columns** via `PanelGroup direction="horizontal"`:
  - **Left (Sidebar)** — `Panel` with `collapsible`, `collapsedSize=0`, min 4 %, max 36 %.
  - **Center (Chat)** — `Panel` with min 30 %. Inner stack: `chatTabs` slot → `chat` slot → `statusBar` slot.
  - **Right (RightPanel)** — `Panel` with `collapsible`, min 0 %, max 48 %. Defaults to `0` width (hidden) until `rightPanelDefaultVisible` is flipped on in Phase 3.
- **Persistence**
  - Panel widths persist via `react-resizable-panels` autosave (`autoSaveId="shay-appshell-v1"`).
  - Belt-and-suspenders: resize callbacks debounce 250 ms into `useCustomizeStore.layoutWidths` ({sidebar, rightPanel} px), so widths survive even if local-storage autosave is cleared. Conversion uses a `NOMINAL_PX=1440` baseline (resize stores absolute px; init derives % back from px).
- **Two-stage sidebar collapse** driven by `useSidebarStore.mode` (`'expanded' | 'icons' | 'hidden'`). Note: the build-plan spec mentioned `collapseStage`, but the Phase 0 store slice already ships the same three-state machine under the field name `mode` — adapted accordingly. An effect on `sidebarMode` calls `ImperativePanelHandle.resize()` to snap the panel to the requested width:
  - `expanded` — restores the last user-dragged width (or `DEFAULT_SIDEBAR_PCT=18`).
  - `icons` — collapses to ~56 px (`ICONS_PCT = pxToPct(56)`).
  - `hidden` — collapses to 0 %, and a left-edge hover-peek trigger button appears that pops the sidebar back to `icons` on hover/click/focus.
- **Resize handles** are 6 px col-resize gutters with focus-visible ring + active-state tint pulled from `--color-border-focus`.
- **Reduced motion** — transitions on resizer + hover-peek are forced to `0ms` when `prefers-reduced-motion: reduce`.
- **Per-slot FeatureBoundary** — every slot (topbar, sidebar, chatTabs, chat, statusBar inside center, rightPanel) is wrapped in a `FeatureBoundary` so a renderer crash in one surface does not nuke the rest of the shell.

## Constraints honoured

- Did not touch `screens/Layout/Layout.tsx`, `App.tsx`, or `package.json`.
- Did not modify any existing screen — additive only.
- TypeScript strict-mode clean (`npx tsc -p tsconfig.web.json --noEmit` reports no errors against any of the four new files; pre-existing errors elsewhere — `src/main/*` not in include list, `ChatTab.tsx` aria attribute conflict, `ElapsedTimer/ProjectChip` JSX namespace — are owned by other Phase 2 agents).
- Reused Phase 0/1 modules: `stores/sidebar`, `stores/customize`, `components/boundaries/FeatureBoundary`.

## Open hooks for Phase 3 / 5

- The outer `<div className={styles.statusbar}>` is currently empty — Phase 3 can either render `<StatusBar>` into this slot via a new top-level prop or keep the per-center `statusBar` slot (both shapes are now supported).
- `rightPanelDefaultVisible` defaults to `false` so the right column collapses to 0 on first mount. Phase 3 flips this on when right-panel content exists.
- Phase 5 polish migrates `App.tsx` from `Layout` to `AppShell` and wires the real `<TopBar>`, `<Sidebar>`, `<ChatTabsRow>` produced by the other Phase 2 agents.

## Verification

- TypeScript: `npx tsc -p tsconfig.web.json --noEmit` — no errors against `shell/AppShell.tsx`, `shell/AppShellSlots.tsx`, `shell/AppShell.module.css`, `shell/index.ts`.
- Did not run the dev server (no runtime smoke test in this pass); shell is not yet mounted by `App.tsx` so it can't regress the running app.