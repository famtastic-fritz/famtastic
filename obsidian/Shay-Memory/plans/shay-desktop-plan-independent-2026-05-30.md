---
title: Independent Desktop Plan
author: independent
date: 2026-05-30
score: 7.5/10
permalink: shay-memory/plans/shay-desktop-plan-independent-2026-05-30
---

I now have enough to write a complete, independent, brutal assessment.

---

## 1. Brutal Honest State Assessment

**What actually works:**

- Chat send/receive pipeline: functional. `hermesAPI` is the only `contextBridge` exposure. IPC to main is real. SSE parsing is real. MessageList with react-virtuoso is real.
- Splash/Welcome/Install/Setup flow: real and gated properly.
- AppShell 3-column layout: renders. Sidebar session list reads from Zustand. TopBar back/forward reads from nav store.
- Settings decomposition: the 17 self-registering sub-pages are real TSX files. They render UI. Most of their action handlers are `console.log("TODO Phase 5")` stubs.
- MCP server list: `list-mcp-servers` IPC is registered and calls through to config.
- Session cache DB + sync: real code exists in `sessions-overlay.ts` and is bridged.
- Keychain (`safeStorage`): real.
- OS notifications + DND: real main-side code exists.

**What is a lie labeled as feature:**

- `window.shay.*` — **does not exist**. Only `window.hermesAPI` and `window.electron` are exposed via `contextBridge`. Every settings page that calls `window.shay.account.*`, `window.shay.privacy.*`, `window.shay.plugins.*`, `window.shay.connectors.*`, `window.shay.tts.*`, `window.shay.devtools.*`, `window.shay.tasks.*`, `window.shay.capture.*` is calling into a namespace that does not exist. These calls silently fail or hit the `console.warn` fallback. That is at minimum: Account, Billing, Privacy, General (telemetry toggle), VoiceAudio, Connectors, DesktopExtensions, DesktopDeveloper, Usage, CaptureToolbar, TaskTrayStrip.
- **18 of 20 screens are never mounted**. App.tsx only routes to splash/welcome/installing/setup/main. MainShell only mounts Chat. The other 18 screen components (Kanban, Memory, Schedules, Sessions, Gateway, Agents, Skills, Models, Providers, Office, Studio, Tools, Layout, Soul, Settings, Setup duplicate, etc.) have no mount path. The nav store has history/push/goBack but nothing reads the `cursor` to render a different screen. These screens are dead code in the running app.
- **5 gateway Python routers** (`desk_auth_routes.py`, `desk_mcp_routes.py`, `desk_logs_routes.py`, `desk_tasks_routes.py`, `desk_sessions_routes.py`) exist in `shay-shay/gateway/` but are not registered in `gateway/main.py`. The admin surfaces in the renderer that call these endpoints (AuthPage, McpServersPage, LogsPage, TaskHistoryTable) will get 404s from every request.
- **Admin panel surfaces**: well-built TSX, ~7,000 lines of UI code, zero functional backend connection.
- **Right panel tabs** (Tasks, Agents, etc.): the tab chrome renders. TaskTrayStrip references `window.shay.tasks.*` which doesn't exist.
- **SlotStrip composer**: TipTap is wired. The 10-slot SlotStrip renders. Most slot actions log to console.
- **CommandPalette**: renders and opens via ⌘K. Actions that route to non-Chat screens push to the nav store but nothing consumes the push to switch the visible screen.
- **Sessions screen**: exists as a 338-line component but is never mounted. Session list data flows correctly through Zustand from the Chat screen's session IPC calls, but the Sessions screen itself is unreachable.
- **Parity audit "43%" figure**: that is for CLI commands, not for the running app. The running app's functional completeness for anything outside Chat is closer to 5%.

**Real functional completeness by area:**

| Area | Actual |
|---|---|
| Chat (send/receive/history in session) | ~70% — works but history reload across sessions is not wired |
| Sidebar (session list, current session) | ~60% — renders but most actions are stubs |
| Settings (renders, persists some keys) | ~25% — most actions hit non-existent `window.shay` namespace |
| All non-Chat screens | 0% — not mounted |
| Admin panel (Auth/MCP/Logs/Tasks) | 0% — backend not registered |
| Right panel | ~10% — chrome renders, data calls broken |
| Composer (SlotStrip, TipTap) | ~40% — input works, advanced slots don't |

---

## 2. Priority Order

**Day 1 (must work to be usable at all):**
1. Route non-Chat screens to the AppShell center panel via a screen router that reads nav state
2. Register desk Python routers in `gateway/main.py`
3. Add `window.shay` (or extend `hermesAPI`) namespace in `preload/index.ts` with real IPC bridges for account, plugins, devtools, capture, tasks
4. Sessions screen: load past sessions, resume, rename, delete
5. Settings: make at least API key, model, theme, and language persist and actually apply

**Week 1:**
6. MCP server add/remove/test working end-to-end
7. Right panel Task tray reading real task data
8. Skills browse and enable/disable
9. Providers and Models screens functional
10. Logs screen streaming real gateway logs

**Month 1:**
11. Kanban (tasks as cards, drag-reorder)
12. Schedules/cron UI functional
13. Gateway pairing/webhook UI
14. Memory provider management
15. Agents + Office screens
16. Full CLI parity gap closure

---

## 3. Per-Feature Spec — Top 10 Gaps

**Gap 1: Screen router — non-Chat screens are unreachable**

File: `src/renderer/src/App.tsx`, `src/renderer/src/shell/AppShell.tsx`

The nav store has `push({kind, ref})` but `MainShell` unconditionally renders `<Chat>` as the center content. Fix: read `useNavStore(s => s.history[s.cursor])` in `MainShell`; if the current entry is `kind: "view"` render the matching screen component; if `kind: "session"` render Chat. The Sidebar session click should call `navStore.push({kind: "session", ref: sessionId, id: sessionId})`. Each sidebar secondary item (Sessions, Skills, etc.) calls `navStore.push({kind: "view", ref: "sessions", id: "sessions"})`. The center panel switches accordingly.

**Gap 2: `window.shay` namespace — 22+ call sites broken**

File: `src/preload/index.ts`

`contextBridge.exposeInMainWorld("shay", shayAPI)` is missing. Create a `shayAPI` object mirroring the namespaces referenced: `account`, `privacy`, `plugins`, `connectors`, `tts`, `devtools`, `diagnostics`, `tasks`, `capture`. Each method maps to a real IPC invoke or returns a typed empty/default. This unblocks all Settings pages that currently silently fail.

**Gap 3: Gateway desk routers not registered**

File: `/Users/famtasticfritz/famtastic/shay-shay/gateway/main.py`

Five routers exist as Python files but `app.include_router(...)` calls for them are absent. Add import + include_router for all five. Prefix: `/api/desk`. This unblocks AuthPage, McpServersPage, LogsPage, TaskHistoryTable, and the sessions admin view.

**Gap 4: Sessions screen — past session resumption**

File: `src/renderer/src/screens/Sessions/Sessions.tsx`

The screen exists. IPC (`listCachedSessions`, `syncSessionCache`, `searchSessions`) is bridged and the main handlers are registered. The only missing piece: (a) a nav push that makes the Sessions screen mount, and (b) on session row click, push a `kind: "session"` nav entry and load the session messages via `window.hermesAPI.loadSession(id)` (which needs to be added to preload + main if not present). The screen already has search UI and filter UI.

**Gap 5: Settings — actions that actually persist**

Files: `src/renderer/src/settings/pages/` (multiple)

General.tsx telemetry toggle calls `window.shay.diagnostics.setTelemetryEnabled` (does not exist). Privacy.tsx data export + clear calls same dead namespace. Account.tsx profile calls same. Fix: wire the settings IPC `set-config` and `get-config` (already registered in main) through a thin `shay.settings.*` namespace to persist each toggle. For account profile, accept that Shay's gateway controls identity and simply display read-only data from `window.hermesAPI.getEnv()`.

**Gap 6: MCP add/remove/test end-to-end**

File: `src/renderer/src/admin/mcp/McpServersPage.tsx`, `AddMcpServerDialog.tsx`

`list-mcp-servers` IPC is real. But add/remove/test MCP server calls reference the desk MCP router (`/api/desk/mcp/...`) which is not registered (Gap 3). Fix: register desk MCP router (covered by Gap 3), then confirm the renderer calls match the router route signatures.

**Gap 7: Task tray — right panel**

File: `src/renderer/src/right/TaskTrayStrip.tsx`

Calls `window.shay.tasks.*` (Gap 2 dead namespace). Once the `shay` namespace is created, wire `tasks.list()` to the `list-tasks` IPC handler in main (which exists via `cronjobs.ts` or a tasks domain), `tasks.cancel(id)` to the appropriate handler. The UI (`TaskRow.tsx`, `TaskTrayStrip.tsx`) is well-built and just needs real data.

**Gap 8: Skills browser — enable/disable functional**

File: `src/renderer/src/screens/Skills/Skills.tsx`

Screen needs to be reachable (Gap 1). Then: `window.hermesAPI.listSkills()` and `window.hermesAPI.setSkillEnabled(name, enabled)` need to be added to preload + main. Main-side: `src/main/skills.ts` already exists and likely has these functions; they just need IPC registration.

**Gap 9: Logs screen — live stream**

File: `src/renderer/src/admin/logs/LogStream.tsx`

`readLogs` IPC is registered. But live streaming requires either polling or a push channel. The LogStream component likely uses polling. The desk logs router (Gap 3) exposes a streaming endpoint. Wire: on mount, start a 2-second polling interval on `window.hermesAPI.readLogs(file, 200)` and append to the log buffer. Clear on unmount.

**Gap 10: Keychain migration from plaintext**

File: `src/main/keychain.ts`, `src/main/settings-handler.ts`

Users who configured the app before safeStorage was added still have `remoteApiKey` in plaintext in `desktop.json`. On first launch after upgrade, main should detect a plaintext key in config, migrate it to `safeStorage`, zero out the plaintext field, and write config. This is a silent data-loss-adjacent bug: the old key is readable by any process on the machine.

---

## 4. Where the Self-Healing Loop Will Break

**Break point 1: Screen router is missing, so any test that relies on navigating to a non-Chat screen will time out.**
The self-healing loop likely sends a command to "open Sessions" or "open Settings." Since no screen router exists, nothing happens. The loop will see a blank center panel and retry indefinitely, producing ghost test runs that consume tokens without making progress.

**Break point 2: `window.shay` is undefined; feature tests throw uncaught TypeError.**
Any test that presses a Settings toggle, opens the Account page, or uses the CaptureToolbar will throw `Cannot read properties of undefined (reading 'account')`. Error boundaries may catch this at the component level, but the self-healing loop will see a rendered error state and attempt to fix component code rather than the actual root cause (missing `contextBridge` exposure).

**Break point 3: Admin endpoints return 404; the loop will interpret this as a config/auth error.**
When the self-healing loop tests MCP server listing or task history, the fetch to `/api/desk/mcp/servers` returns 404 (router not registered). The loop will likely file a bug against the frontend network call rather than diagnosing that the Python router is not registered. It will attempt to fix the renderer code repeatedly without effect.

**Break point 4: Session resume is not wired, so chat context tests will create new sessions instead of resuming.**
The self-healing loop's conversation continuity tests will spawn fresh sessions on every iteration. The session cache will grow. If the loop does not explicitly verify session ID continuity, it will pass tests that should fail.

**Break point 5: The nav store push/render disconnect means UI snapshot tests will always show Chat.**
Any visual regression test that expects a different screen will compare against the Chat screen because `MainShell` unconditionally renders `<Chat>`. The loop will not detect the missing router — it will detect pixel differences and attempt to fix CSS.

**Break point 6: Gateway desk routers are missing in production `main.py` but may exist on a dev branch.**
If the self-healing loop runs against a local dev instance that has the routers manually registered, tests pass locally but fail on the packaged app. This creates a persistent flap that the loop cannot resolve because the failure is environment-dependent.

---

## 5. What the Plan is Missing That Shay Probably Won't Flag

**The screen router is the foundational blocker but Shay's plan does not list it as a discrete deliverable.** The V2 build plan and spec describe individual screens in detail but assume routing works. It does not. Every screen effort is blocked behind a 50-line fix in `App.tsx` and `AppShell.tsx` that no phase owns explicitly.

**The `window.shay` namespace gap is not called out as a blocker.** The parity audit counts CLI commands. It does not audit `contextBridge` surface coverage. Shay's build plan will spec individual settings pages as "wire to backend" without first establishing that the namespace bridge exists. Each page team will independently discover the missing namespace and implement a workaround, creating inconsistent patterns.

**No integration test exists for the Chat → non-Chat screen transition.** All 27 test files in `tests/` are unit tests for main-process utilities. There is no Playwright or Spectron test that actually launches the app and verifies that clicking "Sessions" in the sidebar shows the Sessions screen. The self-healing loop has no ground truth for this.

**The plaintext API key migration (Gap 10) is a security regression in production users today.** Shay's plan defers this. It should not be deferred — it is a live issue for any existing user.

**The `ChatSplitArea.tsx` has a `TODO(Phase 3)` comment on the composer mount point that was never resolved.** The real `<Composer>` component exists in `src/renderer/src/composer/Composer.tsx`. But `ChatSplitArea.tsx` still has the Phase 3 placeholder comment and may not be mounting the full Composer (only `<Chat>` in MainShell mounts `<ChatInput>` directly). The composer's TipTap, SlotStrip, MediaRow, and CaptureToolbar may not actually be active in the live app.

**There is no migration path for the Sidebar's other 18 screen nav items.** The `SidebarPrimaryActions` and `SidebarModeTabs` components presumably have nav items. If they push to the nav store but the store is never read for routing, every sidebar click silently does nothing. Users will assume the app is broken, and the self-healing loop will not detect this because it does not have a human to observe silence.

**CSS module coverage at 15% (3/20 screens) means styling regressions are untestable.** Shay flagged this as a known gap but it is actually a test-coverage gap as much as a style gap. Inline Tailwind-only components cannot be scoped-tested for style isolation. The plan should specify CSS module migration as a prerequisite for visual regression tests, not a separate cosmetic task.

**No error telemetry in production.** No Sentry, no structured error boundary reporting, no IPC error aggregation. When the packaged app crashes on a user machine, there is no signal. The self-healing loop operates on local dev only and cannot detect production failures.

---

## 6. Recommended Sequencing

**Sprint 0 — Foundations (2-3 days, one engineer):**
1. Add screen router to `MainShell` in `App.tsx` — render the correct screen based on nav store cursor. (50 lines)
2. Create `window.shay` namespace in `preload/index.ts` with stubs that call `console.warn` but do not throw. (100 lines)
3. Register all 5 desk Python routers in `gateway/main.py`. (5 lines each)
4. Migrate plaintext API key to safeStorage on startup. (20 lines)

Sprint 0 is the prerequisite unlock. Nothing else in any later sprint can be verified without it.

**Sprint 1 — Core user flows (1 week):**
5. Sessions screen: load, resume, rename, delete
6. Settings: wire top-10 most-used settings to real IPC (model, API key, theme, language, memory provider, MCP servers)
7. Skills browser: list, enable/disable
8. Chat history: load messages from a resumed session

**Sprint 2 — Admin surfaces (1 week):**
9. MCP add/remove/test end-to-end
10. Auth/credential pool real CRUD
11. Logs screen live stream
12. Task tray real data
13. Diagnostics/doctor runner

**Sprint 3 — Second-tier screens (1 week):**
14. Providers and Models screens functional
15. Kanban board basic drag-reorder
16. Schedules/cron UI
17. Memory provider management

**Sprint 4 — Parity closure (ongoing):**
18. Gateway pairing/webhook UI
19. Agents screen
20. Office screen
21. Studio integration

---

## 7. Critical Risks

**Risk 1 (Severity: Critical): Screen router missing blocks all user-facing work.**
Every sprint, every feature, every screen is blocked until `MainShell` routes nav state to the correct screen component. This is a single-file 50-line change that must happen before any other work is assigned to any agent.

**Risk 2 (Severity: Critical): `window.shay` undefined causes silent failures in ~22 call sites across 10+ components.**
These do not throw visible errors to users (most are wrapped in try/catch with console.log stubs). They silently do nothing. Users will file "Settings don't save" bugs that are impossible to diagnose without knowing the root cause is a missing `contextBridge` exposure.

**Risk 3 (Severity: High): 5 gateway routers are compile-clean but unregistered.**
The admin surfaces are effectively a demo. Any effort to build on them before registering the routers is wasted. Registration takes 5 minutes and unblocks ~7,000 lines of admin UI code.

**Risk 4 (Severity: High): No integration tests mean sprint completion criteria cannot be verified automatically.**
The 27 unit tests test utilities. There are no tests that verify the app renders the Sessions screen when the user clicks Sessions. Without Playwright-level integration tests, every sprint risks shipping broken-but-compiling features.

**Risk 5 (Severity: Medium): Self-healing loop will misdiagnose root causes due to the above.**
The loop will identify symptoms (wrong screen shown, 404 on MCP endpoints, settings not saving) without the context to find root causes (missing router, unregistered Python routes, missing namespace). It will generate patches for the wrong layer, accumulating technical debt.

**Risk 6 (Severity: Medium): The Composer may not actually be mounted in the live app.**
`ChatSplitArea.tsx` has an unresolved Phase 3 TODO. The TipTap editor, SlotStrip, MediaRow, and all composer extensions may not be active — only the simpler `ChatInput` textarea is definitively mounted. This needs immediate verification before any Phase 3 composer feature is treated as "built."

**Risk 7 (Severity: Medium): Plaintext API key is a live security issue for existing users.**
The safeStorage migration was built but no upgrade path exists. Any user who configured the app before this change still has their API key readable in plaintext on disk.