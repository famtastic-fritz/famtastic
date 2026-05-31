---
title: Phase 2 — chat-tabs progress
date: 2026-05-29
phase: 2
label: chat-tabs
status: complete
permalink: shay-memory/desk-redesign/phase-2/chat-tabs
---

# Phase 2 — chat-tabs

## Scope (delivered)
- Chrome-style chat tabs row (`ChatTabsRow`) with active tab raised + bottom-seam
  trick, muted inactive tabs, hover and focus states.
- `ChatTab` component supports pin icon (replaces close affordance), inline
  rename (double-click or context-menu → Rename…), and dnd-kit sortable handle.
- Drag-reorder via `@dnd-kit/core` + `@dnd-kit/sortable`, horizontal strategy,
  PointerSensor (4px activation) + KeyboardSensor. `constrainedMove()` enforces
  the chrome-style sticky-pin rule so unpinned tabs never jump left of pinned
  tabs.
- Right-click context menu with: open in split, duplicate, rename…, pin/unpin,
  close, close others, close to right. Outside-pointer / Escape dismisses.
- "+" new-tab button at tail invokes a local `openNewTab()` (the tabs store
  does not yet expose `openNew()`; we synthesize it from
  `stores/sessions.currentSessionId` + `stores/tabs.addTab` per the build
  plan's intent — left a comment so Phase 3 can replace with the real action
  once the session-picker flow lands).
- Keyboard cycle: ⌘⇧] (next) / ⌘⇧[ (previous) wired via `tinykeys`. The
  `lib/shortcuts` manifest does not yet carry these IDs and `lib/shortcuts`
  lives outside our ownership, so we bound a local listener. A follow-up
  ticket should promote them into the manifest so Settings → Shortcuts can
  customize them.
- `ChatSplitArea` renders one or two `ChatPane` containers. When
  `tabs.splitMode === "horizontal"` and `secondTabId` is set, panes are split
  via `react-resizable-panels` (PanelGroup horizontal, 50/50 default, 20%
  min, `autoSaveId="shay-chat-split"` for persistence). Otherwise a single
  pane fills.
- Each `ChatPane` subscribes per-tab to `stores/chat.byTab[tabId]` (messages
  + streaming) and mounts the Phase 1 `<VirtualMessageList>`. A visible
  placeholder marks where the Phase 3 composer wiring will land.

## Files
- `src/renderer/src/shell/ChatTabsRow.tsx`
- `src/renderer/src/shell/ChatTab.tsx`
- `src/renderer/src/shell/ChatSplitArea.tsx`
- `src/renderer/src/shell/ChatTabsRow.module.css`

## Constraints honored
- No files outside ownership were modified. The tabs store
  (`stores/tabs.ts`) was read but not changed; `openNew()` synthesized
  locally.
- No deletes. Additive only.
- TypeScript strict mode passes for the four new files. Pre-existing
  `JSX` namespace + dnd-kit attribute errors in sibling shell files
  (ElapsedTimer, ProjectChip, SessionNamePicker, SidebarSection, TopBar,
  TopBarOverflow) are not in our scope and were left untouched.
- Phase 0/1 modules consumed: `components/icons` (Icon + pin/close/plus),
  `components/chat` (VirtualMessageList), `stores/tabs`, `stores/sessions`,
  `stores/chat`, `stores/types` (TabRef, ChatMessage), `styles/tokens.css`
  (semantic color/space/motion/radius tokens via CSS-module file).
- Did NOT touch `package.json`. All deps (`@dnd-kit/core`, `@dnd-kit/sortable`,
  `react-resizable-panels`, `tinykeys`, `lucide-react`) already declared.

## Follow-ups for Phase 3 / later
- Promote `chat.cycleNext` / `chat.cyclePrev` into `lib/shortcuts.SHORTCUTS`
  so the keybindings are user-customizable in Settings.
- Replace the local `openNewTab()` synthesizer with a real
  `stores/tabs.openNew()` action that consults the session-picker / brain
  selector instead of binding to the currently-active session.
- Mount the TipTap composer + send pipeline inside each `ChatPane` (replace
  the `chat-split-composer-placeholder`).
- Wire the TopBar split toggle (⤢) so it cycles single ↔ horizontal — today
  the only entry points are the per-tab "Open in split" menu item and
  programmatic store mutations.
- Add `<Tooltip>` chrome to the close / new-tab buttons once the Phase-1
  tooltip primitive is exported from the components/common surface.