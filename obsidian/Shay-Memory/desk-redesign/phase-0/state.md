---
title: state
type: note
permalink: shay-memory/desk-redesign/phase-0/state
---

# Phase 0 — Zustand store skeleton

## What was built

Stubbed Zustand store skeleton with 16 slices + shared types + a barrel
re-export. Every slice exports:
- Its state shape interface (TypeScript)
- A store created via `create<...>()(persist?(...))` from zustand
- A custom selector hook (`useFoo<T>(selector)`) backed by
  `zustand/react/shallow` `useShallow`

Slices that need to survive an app restart use `persist` with
`createJSONStorage(() => localStorage)` and `localStorage` keys of the
form `shay-desk-<slice>`. The Phase 0 plan calls out tabs, sidebar
widths, customize, and settings as persistence targets — I also persisted
mode, model (provider/model/thinking, not live cost), and slots since
those are user-customised and called out in Section 1 of the build plan.

All slices stub minimal state + actions only. Real data wiring (IPC,
SSE subscription, gateway RPC) happens in later phases per the plan.

## Files created

- `src/renderer/src/stores/types.ts` — shared types
  (`Mode`, `Provider`, `ThinkingBudget`, `ConnectionStatus`,
   `SidebarMode`, `SplitOrientation`, `PanelKind`, `SlotId`,
   `NotificationCategory`, `NotificationSeverity`, `TaskStatus`,
   `ChatRole`, `SessionRef`, `TabRef`, `PanelTabRef`,
   `NotificationRef`, `TaskRef`, `NavEntry`, `BlockKind`,
   `ChatBlock`, `ChatMessage`, `AttachmentRef`).
- `src/renderer/src/stores/sessions.ts` — `useSessionsStore`,
  `useSessions`, `SessionsState` (no persistence — overlay DB owns
  truth in Phase 2).
- `src/renderer/src/stores/tabs.ts` — `useTabsStore`, `useTabs`,
  `TabsState` (persisted key `shay-desk-tabs`, partialized).
- `src/renderer/src/stores/slots.ts` — `useSlotsStore`, `useSlots`,
  `SlotsState`, `PinnedActionId` (persisted key `shay-desk-slots`).
- `src/renderer/src/stores/panels.ts` — `usePanelsStore`,
  `usePanels`, `PanelsState` (no persistence yet — split ratio +
  autoswitch toggles move to settings panel in Phase 4).
- `src/renderer/src/stores/notifications.ts` —
  `useNotificationsStore`, `useNotifications`,
  `NotificationsState`, `DndSchedule`, `CategoryRule` (rules + DND
  belong to Settings; persistence deferred until Settings IPC is
  wired in Phase 0 follow-up).
- `src/renderer/src/stores/tasks.ts` — `useTasksStore`, `useTasks`,
  `selectTaskCounters`, `TasksState`.
- `src/renderer/src/stores/mode.ts` — `useModeStore`, `useMode`,
  `ModeState` (persisted key `shay-desk-mode`).
- `src/renderer/src/stores/model.ts` — `useModelStore`, `useModel`,
  `ModelState` (persisted key `shay-desk-model`, partialized so live
  cost stream doesn't get cached).
- `src/renderer/src/stores/customize.ts` — `useCustomizeStore`,
  `useCustomize`, `CustomizeState`, `Density`, `MotionPref`,
  `LayoutWidths` (persisted key `shay-desk-customize` — sidebar +
  right-panel widths live here per build plan §2).
- `src/renderer/src/stores/connection.ts` — `useConnectionStore`,
  `useConnection`, `ConnectionState` (gateway + hermes status,
  `bearerProtected` / `secretsProtected` flags for the Phase 0
  security pills).
- `src/renderer/src/stores/sidebar.ts` — `useSidebarStore`,
  `useSidebar`, `SidebarState`, `CustomSectionConfig` (persisted
  key `shay-desk-sidebar` including `mode`, `sectionOrder`,
  `sectionVisibility`, `customSections`).
- `src/renderer/src/stores/composer.ts` — `useComposerStore`,
  `useComposer`, `ComposerState`, `TriggerState`, `TriggerSigil`,
  `ComposerSnapshot`.
- `src/renderer/src/stores/attachments.ts` — `useAttachmentsStore`,
  `useAttachments`, `AttachmentsState` (per-tab staged map +
  recent history + inspect/annotate open state).
- `src/renderer/src/stores/chat.ts` — `useChatStore`, `useChat`,
  `ChatState`, `PerTabChatState`, `ScrollState`,
  `SearchOverlayState` (keyed by tab id; messages/streaming/scroll/
  search/bookmarks per tab as called out in Section 4 of the build
  plan).
- `src/renderer/src/stores/nav.ts` — `useNavStore`, `useNav`,
  `NavState` (history stack with cursor backing TopBar back/forward
  in Phase 2).
- `src/renderer/src/stores/settings.ts` — `useSettingsStore`,
  `useSettings`, `SettingsState`, `SettingsGroup`,
  `SettingsGroupValue` (persisted key `shay-desk-settings`; ready
  for the single `getSettings(group)`/`setSettings(group, patch)`
  IPC contract in Phase 0 IPC namespacing).
- `src/renderer/src/stores/index.ts` — barrel re-exports of every
  slice hook, store, and key type so feature code imports from
  `@renderer/stores`.

## Notes for downstream phases

- No store imports `window.electron` / `window.api` / Hermes RPC yet
  — wiring lands when each phase's IPC contract is implemented.
- `useShallow` selectors are exposed instead of inline `shallow`
  comparators because Zustand 5 deprecates the second `equalityFn`
  argument. Selector hooks let consumers keep using a simple
  `useSessions(s => s.byId[id])` pattern without footguns.
- `tabs.ts` partializes its persisted snapshot so that ephemeral
  fields (none today, but easy to add) won't pollute storage on
  upgrade.
- `chat.ts` lazily creates a per-tab state record on first write to
  keep selectors null-safe; this avoids needing every consumer to
  guard `byTab[tabId]`.
- `nav.ts` ring-trims to 100 entries and truncates forward history
  when a new entry is pushed from the middle — matches standard
  back/forward semantics.
- Persistence keys are namespaced under `shay-desk-` so a future
  multi-profile / multi-window split can swap the key prefix per
  profile without colliding with other Shay UI surfaces.