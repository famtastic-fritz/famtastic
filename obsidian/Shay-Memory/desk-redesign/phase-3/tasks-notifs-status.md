---
title: Phase 3 — Tasks, Notifications, Status (progress)
date: 2026-05-29
phase: 3
label: tasks-notifs-status
permalink: shay-memory/desk-redesign/phase-3/tasks-notifs-status
---

## Scope shipped

### Renderer

- `src/renderer/src/right/TaskTrayStrip.tsx` (+ .module.css) — sticky bottom
  strip with three pill counters (running, input-needed, done). Click on a
  counter filters the expanded list. Expand toggle opens an in-tray list
  driven by `stores/tasks`. Forwards Cancel / Retry / "ping me" callbacks
  to its parent (the RightPanel container will wire them to
  `window.shay.tasks.*`).
- `src/renderer/src/right/TaskRow.tsx` (+ .module.css) — single row for the
  tray + future BackgroundTasksPanel. Variant-aware status icon, action
  buttons (cancel/retry), "ping me" toggle, click-to-deep-link body. Pure
  presentational — no IPC.
- `src/renderer/src/status/StatusBar.tsx` (+ .module.css) — unified pill
  bar designed to mount at the very bottom of `<AppShell>`. Pills:
  Connection (reads `stores/connection`), Gateway (prop-driven),
  Service health (MCP count + vault index), Update widget, Notifications
  pulse (reads unread + DND from `stores/notifications`).
- `src/renderer/src/status/StatusPill.tsx` (+ .module.css) — atomic
  dot+label pill with `ok/running/paused/warning/error/unknown/info`
  variants, optional icon, optional badge count, optional pulse anim.
  Honors `prefers-reduced-motion`.
- `src/renderer/src/status/index.ts` — barrel.
- `src/renderer/src/notifications/NotificationCenter.tsx` (+ .module.css)
  — portal-based overlay (right side panel). Category tabs + unread
  toggle + Mark-all-read + Clear-all. ESC + focus-trap. Reads from
  `stores/notifications`, drives `markRead/remove/clear` on the store.
  Reuses the renderer-side `NotificationCategory` enum.
- `src/renderer/src/notifications/NotificationToast.tsx` (+ .module.css)
  — ephemeral toast with hover-pause + auto-dismiss after 5s. Includes a
  `NotificationToastHost` portal that picks the newest unread item and
  shows it bottom-right. Respects DND.
- `src/renderer/src/notifications/index.ts` — barrel.

### Main (Electron)

- `src/main/notifications-store.ts` — better-sqlite3 inbox at
  `<userData>/notifications.db`. Schema, indexes, insert/list/markRead/
  markAllRead/dismiss/clear/counts/unreadCount. Test hooks for path
  override.
- `src/main/notifications-os.ts` — OS Notification wrapper that respects
  DND via `notifications-dnd.shouldDeliver()`. `setBadgeUnread()` reflects
  unread total via `app.setBadgeCount` (no-ops gracefully where unsupported).
- `src/main/notifications-dnd.ts` — per-category rules (task, approval,
  mention, system, auth, update) and scheduled quiet hours. Wrap-midnight
  windows handled. `shouldDeliver(category)` returns channel decisions
  (`osBanner`, `dockBadge`, `inAppPulse`, `sound`) + a reason. Settings
  persistence is currently in-memory; Phase 4 wires it to settings store.
- `src/main/domains/notifications.ts` — REPLACES the Phase 0 skeleton.
  Registers full IPC namespace (`list, unreadCount, markRead, markAllRead,
  dismiss, clear, emit, getDnd, setDnd, getRules, setRule`). Exposes an
  `emit(input)` entrypoint other main modules call to insert + broadcast.
  Sender registry via `attachSender()`. Push channels: `new`, `read`,
  `cleared`.
- `src/main/domains/tasks.ts` — REPLACES the Phase 0 skeleton. Aggregator
  pulls from the gateway (`/v1/tasks`) when available, falls back to
  pluggable `loadKanbanTasks` / `loadCronTasks` hooks. Action verbs
  (cancel, retry, pause, resume, pingMe) call the gateway and degrade
  cleanly on 501. `configureAggregator()` is the wiring hook main/index
  will call once kanban + cronjobs sources are bound. Push channels:
  `task-event`, `counts-event` with monotonic seq.

### Gateway (Python, NOT yet registered)

- `shay-shay/gateway/desk_tasks_routes.py` — FastAPI APIRouter at
  `/v1/tasks` with `list`, `stream` (SSE), `cancel/{id}`, `retry/{id}`,
  `pause/{id}`, `resume/{id}`, `ping-me/{id}`. All return 501 stubs with
  TODO blocks describing the Phase 5 implementation. Security review
  checklist in the module docstring covers Bearer enforcement, task_id
  validation, rate limits, and SSE backpressure.

## Type check

`npx tsc -p tsconfig.web.json --noEmit` and `tsc -p tsconfig.node.json
--noEmit` both pass except for one pre-existing unrelated error in
`src/shared/i18n/index.ts:332` (sharedI18n type portability — unchanged
by this PR).

## Wiring left for follow-up agents

- Mount `<StatusBar />` in `AppShell` (or wherever the cleanup agent
  drops it).
- Mount `<NotificationToastHost />` near the AppShell root.
- Mount `<NotificationCenter open={...} onClose={...} />` driven by the
  StatusBar's pulse button.
- Mount `<TaskTrayStrip />` at the bottom of `<RightPanel />` (slot
  added by the right-panel agent).
- Wire `domains/tasks.configureAggregator({ loadKanbanTasks,
  loadCronTasks, gatewayBaseUrl, bearerToken })` from `src/main/index.ts`
  during boot.
- Register `attachSender(window.webContents)` for both `domains/tasks`
  and `domains/notifications` when a renderer window opens.
- Expose `window.shay.tasks` and `window.shay.notifications` via the
  preload bridge using `buildPreloadBindings(invoke, on)` from each
  domain module.
- Gateway-side Phase 5: register `desk_tasks_routes.build_router()` on
  the main gateway app once security review passes.

## Constraints respected

- All ownership files created or replaced as declared.
- No files touched outside ownership (verified by greping).
- `package.json` untouched.
- TypeScript strict mode passes (only the pre-existing i18n error remains).
- Components reuse Phase 0/1/2 modules: `components/icons`,
  `components/boundaries`, `stores/*`, `lib/errors` (indirectly via
  FeatureBoundary).