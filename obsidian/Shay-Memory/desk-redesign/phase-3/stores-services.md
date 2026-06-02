---
title: Phase 3 — stores-and-services
date: 2026-05-29
phase: 3
agent: stores-and-services
permalink: shay-memory/desk-redesign/phase-3/stores-services
---

## Scope completed

Additive expansion of six Zustand slices and three new IPC service
wrappers. All existing Phase 0/1/2 fields and actions preserved
verbatim; new Phase 3 surfaces sit alongside the legacy ones so
downstream agents (right-panel, status-bar, composer, slots, media)
can subscribe with either vocabulary without coordinated migrations.

### Stores expanded

- `src/renderer/src/stores/tasks.ts`
  - Added `tasks: Record<id, TaskRecord>` with the full Phase 3 task
    shape (`id, kind, title, sessionId, projectId, status, startedAt,
    endedAt, progress, output, error, pingMe, metadata`).
  - Pre-computed `runningCount`, `inputNeededCount`, `doneCount`,
    `failedCount` so `<TaskTrayStrip>` reads counters without
    iterating the map.
  - New actions: `setStatus`, `setProgress`, `setPingMe`. Status
    normalization across both `succeeded`/`done` and
    `input_needed`/`input-needed` so domain + gateway shapes coexist.
  - Phase 0 `byId/ids/setAll/upsert/remove/clear/selectTaskCounters`
    all preserved; `upsert` now accepts either `TaskRef` or
    `TaskRecord`.

- `src/renderer/src/stores/notifications.ts`
  - Added `countsByCategory: Record<NotificationCategory, number>`
    recomputed on every mutation.
  - Added `insert` (alias of `push`), `quietHours` (alias of `dnd`
    with its own `setQuietHours` setter).
  - All Phase 0 actions preserved (`push, markRead, markAllRead,
    remove, clear, setDnd, setCategoryRule`).

- `src/renderer/src/stores/panels.ts`
  - Added `active` (mirror of `activeTabId`), `openTabs` (mirror of
    `tabs`), `split: { upper, lower }` for vertical split ids, and
    `autoSwitch: boolean` master toggle.
  - Setters keep both mirrors in sync; `closeTab` clears split
    entries that reference the closed tab.
  - New actions: `setSplit`, `clearSplit`, `setAutoSwitchMaster`.

- `src/renderer/src/stores/composer.ts`
  - Added `isOpen`, `micMode` (`off|push|dictation|voice-mode`),
    `sendKey` (`enter|cmdEnter`), `historyIdx` (alias of `historyIndex`).
  - Setters: `setIsOpen, setMicMode, setSendKey`. History navigation
    updates both `historyIndex` and `historyIdx`.

- `src/renderer/src/stores/attachments.ts`
  - Added `list` (current attachments) and `history` (alias of
    `recent`), with `setList, addToList, removeFromList, clearList`.
  - All per-tab fields and actions preserved.

- `src/renderer/src/stores/customize.ts`
  - Added `captureToolBooleans: { screenshot, screenRecord, cam, mic }`,
    `slotStripOrder: SlotId[]`, and `slotAPinned: SlotAActionId[]`
    (clamped to max 3 in the setter).
  - `setSlotStripOrder` defensively dedupes + appends any missing
    canonical slot ids so the strip never silently loses a slot.
  - Persistence key + Phase 0 fields untouched.

### Services added

Each under 80 LOC, typed inputs/outputs, descriptive rejection when
`window.shay.*` bindings are absent (test harnesses).

- `src/renderer/src/services/tasks-service.ts` — wraps
  `window.shay.tasks` (`list, counts, pause, resume, cancel,
  streamStart, streamStop`). Exposes `streamFromIpc(cb)` and
  `subscribeCounts(cb)` returning unsubscribe functions.
- `src/renderer/src/services/notifications-service.ts` — wraps
  `window.shay.notifications` (`list, unreadCount, markRead,
  markAllRead, dismiss, getDnd, setDnd, getRules, setRule`). Exposes
  `subscribe(cb)` and `subscribeRead(cb)`.
- `src/renderer/src/services/capture-service.ts` — wraps
  `window.shay.capture` (`permissions, requestPermission, start,
  stop, cancel`). Exposes `onProgress(cb)` for screen-record byte
  ticks.

Domain types are re-declared locally in each service because the
renderer tsconfig (`tsconfig.web.json`) does not include
`src/main/**`. Each file calls out the source-of-truth path in its
header comment.

### App.tsx slot wiring

- Imported `RightPanel` from `./right/RightPanel` and `StatusBar`
  from `./status` (barrel).
- `MainShell` now passes `rightPanel={<RightPanel />}`,
  `rightPanelDefaultVisible`, and `statusBar={<StatusBar />}` into
  `<AppShell>`. The cleanup agent's existing
  `sidebar/topbar/chatTabs/chat` wiring is untouched.

## Coordination notes for other agents

- `right/RightPanel.tsx` — owned by the rightpanel agent. Until that
  file exists the renderer typecheck fails on line 16 of `App.tsx`
  (`Cannot find module './right/RightPanel'`). The PanelHeader
  comment block already references `RightPanel.tsx` as the expected
  parent, so the canonical path matches.
- StatusBar at `status/StatusBar.tsx` already exists with no required
  props — works as-is.
- Other compile errors surfaced by my pass are pre-existing in
  `composer/**` (JSX namespace, duplicate `role` attribute,
  cross-tree import of `src/main/domains/capture.ts`) — owned by the
  composer agent, not touched here.

## Backwards-compat audit

Phase 0/1/2 consumers grep-verified to still compile:

- `selectTaskCounters` selector still callable and returns the same
  `{running, inputNeeded, done, failed}` shape — now sourced from the
  pre-computed counter fields.
- `useNotificationsStore.push()` callers (StatusBar) unchanged.
- `useCustomizeStore.captureTools` (string[]) and `layoutWidths` both
  still authoritative for AppShell width persistence.
- `useComposerStore.moveHistory` return signature identical.
- `useAttachmentsStore.stagedByTab/recent` unchanged.

## Known gaps

- The auto-switch subscriber that flips `panels.active` on chat
  block events is not wired here — it belongs to the right-panel
  agent or a Phase 3 effect module. The store exposes
  `autoSwitch + autoSwitchEnabled[kind]` for them to read.
- Service unit tests not added — Phase 3 tests live with their
  consuming components per the build plan's testing pattern.
- `tasks-service.streamFromIpc` and `notifications-service.subscribe`
  do not yet de-dupe across renderer reloads; the gateway monotonic
  `seq` field is exposed on the event payload for the consumer to
  detect gaps and call `streamStart()` for a resync.