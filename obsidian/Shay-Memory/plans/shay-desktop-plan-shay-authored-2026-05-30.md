---
title: Shay's Own Desktop Plan
author: shay
date: 2026-05-30
score: 5/10
permalink: shay-memory/plans/shay-desktop-plan-shay-authored-2026-05-30
---

I have everything I need. Here is the complete plan.

---

# SHAY DESKTOP — COMPLETE DAILY-USABILITY PLAN
## 2026-05-30 — Authored by Shay

---

## 1. HONEST CURRENT STATE ASSESSMENT

### The single most important truth

Chat works. Everything else is scaffolding that compiles but does not function. The gap is not cosmetic — it is structural. The five gateway routers that power Sessions, Auth, MCP, Logs, and Tasks exist as Python files but are never imported into the running gateway. This means every admin surface, every session persistence call, and every right-panel data feed degrades to a silent no-op or an HTTP 501. Fritz cannot feel the difference between a stub and a crash because both look like an empty panel.

### Per-screen assessment (all 20)

**SplashScreen — 95% functional.** Renders, gates startup, no issues. Nothing to fix.

**Welcome — 75% functional.** Renders correctly, onboarding flow exists. Missing: it does not detect whether setup was previously completed and skip itself. If the user reinstalls or the config is wiped, they re-onboard from scratch with no pre-fill.

**Setup / Install — 75% functional.** UI is correct. The actual install verification calls go through `hermesAPI` which has only 3 IPC bindings surfaced at the preload layer (the audit found `hermesAPI lines in preload/index.ts: 3`). Most checks are fire-and-forget with no real-time feedback.

**Chat — 40% functional (real function, wrong score).** The Chat screen itself is actually the most functional thing in the app. Messages send, streaming works, abort works, drag-drop files works, model picker works, fast mode toggle works. The 40% score in the inventory is misleading — it reflects that the composer slot strip, right panel, and session persistence all around Chat are non-functional. Chat the component is solid. Chat the system is broken because sessions do not persist.

**Sessions — 60% stub.** The UI exists: date grouping, search, resume, new chat. But `sessions-overlay.db` writes depend on `desk_sessions_routes.py` which is not registered in the gateway. Sessions are stored in Hermes's own SQLite, not the desktop overlay. The "Resume Session" IPC path (`sessions-rpc.ts`) calls gateway endpoints that return 501. Result: every app restart loses session context. Fritz sees a blank chat on launch every time.

**Layout — 55% functional.** The AppShell three-column layout with react-resizable-panels renders. Column widths persist via the customize store. The sidebar collapse modes (expanded / icons / hidden) work. What does not work: the right panel stays empty because panel tab state comes from `usePanelsStore` which has no persistent content assigned to tabs yet.

**Sidebar custom sections — stub.** `SidebarCustomSections.tsx` renders a drag-reorderable list backed by the Zustand sidebar store. The store is wired. The DnD sensors are wired. But every section body renders a placeholder. The `provider` field (`basic-memory`, `vault`, `mcp`) is stored but never dispatched to any fetcher. Custom sections are cosmetically drag-reorderable but contain nothing.

**Right Panel — empty.** `RightPanel.tsx` exists, tab strip exists, split-pane layout exists. `variantForKind()` dispatches to 7 panel variants (BackgroundTasks, Plan, Files, Diff, Terminal, Preview, Custom). All 7 variants have component files. None receive live data because: (a) tasks come from `desk_tasks_routes.py` which is not registered; (b) the terminal variant has no xterm instance wired to a pty; (c) the diff variant has no file watcher feed. Result: the right panel shows its chrome (tab strip, resize handle) but every pane body is empty.

**Agents — 70% stub.** UI has agent cards, status badges, add/configure dialogs. No IPC backend for agent lifecycle (start/stop/status polling). The cards render static mock state.

**Gateway — 60% functional.** The gateway starts, handles chat, handles streaming. The Desktop-facing HTTP routes (auth, sessions, MCP management, logs, tasks) are all unregistered. The UI in Gateway.tsx shows connection status — that part works via the existing `hermesAPI.isRemoteMode()` and health-check IPC.

**Memory — 60% stub.** The Memory screen has sections for basic-memory and vault-search. The toggle controls and config fields render. But the MCP tool calls that would actually fetch memory entries go through the gateway MCP router — which is not registered.

**Models — 65% functional.** Model listing works via `readModels()` in main process. Switching works. The advanced model config fields (temperature, top-p, context window override) save to config but there is no validation feedback.

**Providers — 65% stub.** Provider cards render. Add/edit/delete UI exists. The actual credential write goes through `keychain.ts` IPC which IS registered (keychain domain is in the domains list). Providers is more functional than it appears — credential save/load through safeStorage works.

**Settings — 80% functional.** The 17 self-registering sub-pages render. Most toggles write to the settings store via IPC. Known gaps: the Usage page shows no real data (billing/token counts require an endpoint that does not exist); the Shortcuts page lists shortcuts but does not actually register custom ones.

**Skills — 70% stub.** Skills browser renders. IPC bindings for skills exist in the preload. The skills list loads from Hermes's skills directory. But the `check`, `update`, `audit`, `reset` operations (15 missing CLI commands from the parity audit) have no UI triggers. You can browse skills but not manage them.

**Soul — 50% stub.** The Soul screen (126 lines) is the personality/persona config surface. It renders a text area for Shay's system prompt and a save button. The save calls `window.hermesAPI` but the specific IPC channel for soul/persona config is not confirmed to exist in the 3-binding preload.

**Tools — 60% stub.** MCP tool list renders. Add/remove server UI exists. But tool execution and the MCP server management backend connect through `desk_mcp_routes.py` — not registered.

**Kanban — 65% functional.** This is the most self-contained screen. Kanban board renders, column drag, card drag, add card, card detail all work via local Zustand state. Nothing persists to a backend yet — it is local-only. This is actually fine for V1 daily use.

**Schedules — 60% stub.** Cron schedule UI exists. The schedule CRUD calls go through a backend that is not confirmed wired.

**Office — 55% stub.** Multi-agent office concept. Mostly placeholder with some layout scaffolding.

**Studio — 55% stub.** Links to FAMtastic Studio. Mostly a webview or iframe wrapper. The rendering depends on Studio being up via launchd.

---

## 2. PRIORITY ORDER — "Would Fritz feel this tomorrow?"

Ranked by direct daily friction, not technical elegance.

**Priority 1: Session persistence** — Fritz loses his conversation every restart. This is the single most painful daily gap. Every other feature compounds on this. Fix it first.

**Priority 2: Right panel has real content** — The right panel chrome is there but empty. Fritz sees a three-column layout where the right third is a void. Putting live background-task status in there makes the app feel real and functional even before everything else is wired.

**Priority 3: Gateway desk-router registration** — This is the unlock for ~8 other features. The 5 Python routers exist. They compile. Registering them in the gateway's aiohttp app takes one file and ~50 lines. Everything downstream unlocks: sessions DB writes, MCP management from the desktop, task feeds, log streaming.

**Priority 4: Sessions list actually loads** — Once the routes are registered, the Sessions screen's "Resume" needs to actually resume: push the session's messages back into the Chat component and restore hermesSessionId. Right now the UI exists but the resume action does nothing.

**Priority 5: Soul screen saves and reads correctly** — Fritz uses Shay's persona daily. If the Soul save doesn't go to the right IPC channel, every session starts with a generic Shay instead of the tuned one. This is a two-line fix once confirmed broken.

**Priority 6: Sidebar custom sections get one working provider** — basic-memory is already wired as an MCP tool. One section type — "Recent memories" pulling from basic-memory's list endpoint — gives the sidebar immediate utility. The DnD infrastructure is already built.

**Priority 7: Skills management surface** — Fritz actively manages 158 skills. Being able to browse, enable/disable, and check from the desktop saves CLI trips.

**Priority 8: Kanban persistence** — Kanban works locally. Adding a one-line sync to write the board state to `~/.shay/kanban.json` (read on startup) makes it durable without a full backend.

**Priority 9: Providers credential save confirmation** — Keychain IPC is wired. The UX gap is that there is no success/failure toast after saving a credential. Add the toast and Fritz trusts that his keys saved.

**Priority 10: Model pill / context indicator in the bottom row** — The composer SlotStrip exists with 10 slot positions. The ModelPill slot and ContextIndicator slot have component files. They are not rendering in the live composer. Wiring them in makes every conversation feel like you know what brain you're talking to.

---

## 3. PER-FEATURE SPEC — TOP 10 GAPS

---

### GAP 1: Session Persistence

**What it does:** When Fritz closes and reopens the app, his last N sessions appear in the Sessions panel. Clicking one restores the full message list and re-activates the hermesSessionId so the next message continues the conversation rather than starting fresh.

**Root cause of current failure:** `sessions-overlay.db` writes go through `desk_sessions_routes.py`. That file declares FastAPI-style routes but is never imported by the aiohttp gateway. Every write call from `sessions-rpc.ts` in main hits a 501 or a connection error that is silently swallowed.

**Files that change:**
- `/Users/famtasticfritz/famtastic/shay-shay/gateway/run.py` — import and mount the 5 desk routers using aiohttp's `add_routes()` or an ASGI adapter
- `/Users/famtasticfritz/famtastic/shay-shay/gateway/desk_sessions_routes.py` — convert from FastAPI APIRouter to aiohttp RouteTableDef handlers (the 501 stubs are already shaped correctly, just need the framework swap)
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/main/sessions-rpc.ts` — verify the endpoint URLs match after the port
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/renderer/src/screens/Sessions/Sessions.tsx` — the `onResumeSession` callback needs to push messages into Chat's state; currently it calls the prop but Chat.tsx only handles a `sessionId` string, it does not fetch the message history for that ID
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/renderer/src/shell/AppShell.tsx` (or wherever `messages` state lives at the App level) — add a `loadSession(id)` function that calls `window.hermesAPI.getSessionMessages(id)` and sets messages

**Acceptance test:** Restart the app. The Sessions panel shows at least the last session from before the restart. Clicking it populates the chat with the previous messages. Sending a new message continues the same Hermes session (same `hermesSessionId`).

---

### GAP 2: Gateway Desk-Router Registration

**What it does:** The 5 Python files (`desk_auth_routes.py`, `desk_mcp_routes.py`, `desk_logs_routes.py`, `desk_tasks_routes.py`, `desk_sessions_routes.py`) become live HTTP endpoints on the running gateway. All Desktop admin surfaces stop returning empty/501.

**Files that change:**
- `/Users/famtasticfritz/famtastic/shay-shay/gateway/run.py` — this is the aiohttp app builder. Add imports and `app.add_routes(desk_sessions_router)` etc. for all 5. Because the files are written in FastAPI/Starlette style, option (b) from the desk_sessions_routes.py header comment is the correct path: port the stubs to `aiohttp.web.RouteTableDef`. Each file has ~5-8 endpoints, all returning 501 JSON — the port is mechanical.
- Each of the 5 `desk_*_routes.py` files — convert `@router.get/post` decorators to `@routes.get/post` aiohttp style. Keep the 501 response bodies intact as they are correct JSON contracts.
- Add `Authorization: Bearer <API_SERVER_KEY>` enforcement to each handler (the security checklist in desk_sessions_routes.py line 22 documents exactly what to check).

**Acceptance test:** `curl -H "Authorization: Bearer $SHAY_KEY" http://127.0.0.1:8642/desk/sessions/list` returns `{"sessions": []}` (empty array, not 501 or 404). Repeat for `/desk/auth/credentials`, `/desk/mcp/servers`, `/desk/logs/stream`, `/desk/tasks/list`.

---

### GAP 3: Right Panel Background Tasks

**What it does:** The right panel's BackgroundTasksPanel variant shows live Hermes task/job status — running agents, pending approvals, completed jobs. Fritz can see the swarm draining without opening a terminal.

**Files that change:**
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/renderer/src/right/variants/BackgroundTasksPanel.tsx` — currently a stub. Wire it to poll `window.hermesAPI.tasks.list()` on mount and every 3 seconds. Show each task as a row with status badge, elapsed time, and an abort button.
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/main/domains/tasks.ts` — confirm the `tasks.list` IPC handler exists and returns the correct shape. If it calls the gateway tasks endpoint (which after Gap 2 is live), verify the response shape matches what the renderer expects.
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/renderer/src/stores/tasks.ts` — exists. Add a `startPolling()` / `stopPolling()` action that BackgroundTasksPanel calls on mount/unmount.
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/renderer/src/shell/AppShell.tsx` — default the right panel to `rightPanelDefaultVisible: true` and set the initial active tab to "tasks" so it appears immediately on launch.

**Acceptance test:** Launch the app. Right panel is visible with the "Tasks" tab active. Start a chat that triggers a tool call (e.g., "list my files"). A task row appears in the right panel while the tool runs and disappears or shows "completed" when done.

---

### GAP 4: Soul Screen IPC Wiring

**What it does:** Fritz's typed persona configuration (the system prompt that makes Shay feel like Shay) saves to the gateway config and is read back on next launch. Currently unknown whether the save IPC channel exists.

**Files that change:**
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/renderer/src/screens/Soul/Soul.tsx` — audit what IPC call the save button makes. If it calls `window.hermesAPI.saveSoulConfig(text)` and that is one of the missing channels, add it.
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/preload/index.ts` — only 3 hermesAPI channels are confirmed exposed. If `saveSoulConfig` and `getSoulConfig` are not among them, add them.
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/main/domains/settings.ts` — add handlers for soul config read/write. The backing store is the gateway's `config.py` (the `system_prompt` field that already exists in Shay's config YAML).

**Acceptance test:** Type a new system prompt in Soul screen, click Save. Kill and relaunch the app. Open Soul screen. The text you typed is there. Start a chat and confirm Shay's first response reflects the updated persona.

---

### GAP 5: Sessions Screen — Resume Actually Restores Messages

**What it does:** After Gap 1 makes session writes work, the resume button needs to actually reconstruct the chat. Right now `onResumeSession(id)` is passed as a prop to Sessions but the parent only uses it to update the `currentSessionId` string — it does not load the message history.

**Files that change:**
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/renderer/src/screens/Layout/Layout.tsx` (or wherever App-level session/message state lives) — add `loadSession(id)` that calls `window.hermesAPI.sessions.getMessages(id)`, maps the result to `ChatMessage[]`, and sets it via `setMessages`.
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/main/domains/sessions.ts` — add `sessions.getMessages` IPC handler that queries Hermes session history (either via the CLI `--resume` flag or the sessions SQLite directly).
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/preload/index.ts` — expose `sessions.getMessages`.

**Acceptance test:** Send 3 messages. Quit the app. Relaunch. Click the session in the Sessions panel. The 3 messages appear in Chat. Sending a 4th message adds to them rather than starting over.

---

### GAP 6: Sidebar Custom Sections — basic-memory Provider

**What it does:** A sidebar section titled "Recent Memories" queries basic-memory's list endpoint and shows the 5 most recently created notes as clickable chips. Clicking one inserts `@memory:note-title` into the composer.

**Files that change:**
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/renderer/src/shell/SidebarCustomSections.tsx` — replace the placeholder body renderer with a `switch (section.provider)` that dispatches to provider-specific sub-components. Add `case 'basic-memory': return <BasicMemorySection config={section.config} />`
- New file: `src/renderer/src/shell/providers/BasicMemorySection.tsx` — on mount, calls `window.hermesAPI.memory.listRecent()` (or uses the MCP tool via a gateway call). Renders a list of note titles with a click handler that calls a passed-in `onInsert(text)` callback.
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/main/domains/memory.ts` — add `memory.listRecent` IPC handler that calls the basic-memory MCP tool via the gateway.

**Acceptance test:** Open sidebar. Click "Add Section", choose "basic-memory", save. A section appears in the sidebar showing recent memory entries. Clicking one inserts a mention into the composer.

---

### GAP 7: Kanban Persistence

**What it does:** The Kanban board saves its state to `~/.shay/kanban.json` on every change and reads it on startup. Currently all board state is lost on reload.

**Files that change:**
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/renderer/src/screens/Kanban/Kanban.tsx` — on any board state change (card moved, card created, card deleted), call `window.hermesAPI.kanban.save(boardState)`.
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/renderer/src/screens/Kanban/Kanban.tsx` — on mount, call `window.hermesAPI.kanban.load()` and initialize board state from the result.
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/preload/index.ts` — expose `kanban.save` and `kanban.load`.
- New file: `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/main/domains/kanban.ts` — IPC handlers that write/read `~/.shay/kanban.json` using `fs.writeFileSync` / `fs.readFileSync`. No gateway dependency — this is local-only.

**Acceptance test:** Create a card. Quit. Relaunch. Navigate to Kanban. The card is still there.

---

### GAP 8: Skills Management — Enable/Disable from Desktop

**What it does:** The Skills screen shows each skill with an enabled toggle. Toggling calls the Hermes skills IPC to enable or disable the skill. Fritz can stop injecting unused skills into every prompt from the desktop rather than editing config files.

**Files that change:**
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/renderer/src/screens/Skills/Skills.tsx` — add a toggle switch to each skill row. On toggle, call `window.hermesAPI.skills.setEnabled(skillName, enabled)`.
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/main/domains/skills.ts` — verify the skills IPC domain exists (it does — `skills.ts` is in the domains list). Add `skills.setEnabled` handler that writes to the Hermes config's `skills.disabled_list` array.

**Acceptance test:** Open Skills. Toggle off one skill. Open a new chat. Confirm that skill's instructions are no longer injected (visible in the gateway logs or by asking Shay "what skills do you have?").

---

### GAP 9: Composer — Model Pill and Context Indicator Live in SlotStrip

**What it does:** The bottom composer row shows the current model (e.g., "claude-sonnet-4-6") and context usage (e.g., "12k / 200k — 6%") at all times. These exist as React components but the SlotStrip is not rendering them in the live Chat view.

**Files that change:**
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/renderer/src/screens/Chat/Chat.tsx` — the current Chat renders its own `<ModelPicker>` below the input area. The SlotStrip's `ModelPill` and `ContextIndicator` slots need to receive the same data. Either: (a) pass model state down into SlotStrip via props, or (b) move model state to the model Zustand store (which already exists at `stores/model.ts`) and have both components read from it.
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/renderer/src/composer/slots/ModelPill.tsx` — confirm it reads from `useModelStore` rather than local props. If it uses local props, migrate.
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/renderer/src/composer/slots/ContextIndicator.tsx` — confirm it reads token usage from the chat store or receives it via a shared context. Wire to the `usage` state that Chat.tsx already tracks.

**Acceptance test:** Open Chat. The bottom row shows the model name and a context percentage. Send a message. The context percentage increases.

---

### GAP 10: Providers — Save Confirmation Toast

**What it does:** When Fritz saves a new API key in Providers, a success toast appears ("Key saved to keychain"). Currently the save call fires but there is no feedback — Fritz cannot tell if it worked.

**Files that change:**
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/renderer/src/screens/Providers/Providers.tsx` — the save button's handler needs to `await` the IPC call and show a toast on success or an error message on failure.
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/renderer/src/notifications/NotificationToast.tsx` — exists. Wire a `showToast(message, variant)` call from Providers. The notification store (`stores/notifications.ts`) already exists — call `useNotificationsStore.getState().push(...)`.

**Acceptance test:** Enter an API key in Providers. Click Save. A green toast appears at the top-right: "Key saved to keychain." Reopen the Providers screen — the key is shown as saved (masked).

---

## 4. WHAT SHAY CAN BUILD AUTONOMOUSLY VS. WHAT NEEDS ORCHESTRATION

### Shay can build autonomously (code_job + self-healing loop):

These are bounded, well-defined changes with clear file targets and no architectural ambiguity:

- Gap 7: Kanban persistence (2 new IPC handlers + 2 render hooks, zero gateway dependency)
- Gap 9: Composer model pill + context indicator wiring (reading from existing stores, no new IPC)
- Gap 10: Providers save toast (one async/await wrapper + one store call)
- Gap 8: Skills enable/disable toggle (IPC handler already partially exists in `domains/skills.ts`, UI is a toggle + one IPC call)
- Gap 5 (renderer side only): Loading messages from a resolved session ID into Chat state — the React part is straightforward once the IPC exists
- Gap 4 (preload exposure only): Adding `saveSoulConfig` / `getSoulConfig` to the 3-channel preload

### Needs Claude Code orchestration (or careful human-supervised session):

These require cross-file changes across the Python gateway AND the Electron main process with security implications:

- Gap 2: Gateway router registration — converting FastAPI-style routes to aiohttp, security review, testing with live gateway. A mistake here breaks the entire Shay chat pipeline.
- Gap 1: Session persistence — depends on Gap 2, plus requires coordinating between the Python session DB schema and the TypeScript IPC layer. The resume flow touches 4 files in 3 different runtimes (Python gateway, Electron main, Electron renderer).
- Gap 3: Right panel task polling — depends on Gap 2 being live first. Cannot test the poller against 501s.
- Gap 6: basic-memory sidebar section — depends on knowing the exact MCP tool call shape that basic-memory exposes in the current config, which requires reading the live gateway MCP registration.

The architectural principle: Shay can write isolated renderer React + Zustand code autonomously with high confidence. Shay should not unilaterally rewrite Python gateway routing code that is in the critical path of the running chat system.

---

## 5. PHONE COMPANION INTEGRATION

### Current state

The phone companion was built through Task 32 (Shay PWA + LAN proxy) and Task 33 (approval/ask flow). Task 39 (Phone companion v2) is marked completed. However the self-orchestration plan describes the relay as Tailscale-based and the PWA as requiring Fritz to open the app to submit approvals (no silent background push).

### What flows between desktop and phone

**Desktop → Phone:**
- Push notification (Web Push or APNs) when a running agent job hits an approval gate or asks a question
- Job status updates (task started, task completed, task failed)
- Shay's response text when Fritz initiates a chat from the phone

**Phone → Desktop:**
- Chat messages that Fritz types on the phone (routed to the same Hermes session)
- Approval answers (yes/no/with-comment) that unblock suspended jobs
- Idea captures that flow into the idea pipeline

### The relay contract

The gateway runs at `http://127.0.0.1:8642` locally. On the phone, Shay connects via:
1. **Tailscale** (primary): Tailscale assigns the Mac a stable LAN IP visible to the phone when both are on the Tailscale mesh. The phone hits `http://<tailscale-ip>:8642` directly. No NetworkExtension entitlement needed in the PWA.
2. **Cloudflare Tunnel** (fallback): when the phone is off the Tailscale mesh (airport, client site), a Cloudflare Tunnel exposes the gateway over HTTPS with a stable URL.

The phone app needs to know which relay to use. The desktop's companion setup page generates a QR code containing `{"relay": "tailscale", "url": "...", "token": "<API_SERVER_KEY>"}`. Fritz scans once. The PWA stores the config in localStorage.

### What is blocking the phone companion from being fully useful today

1. The approval/ask flow (Task 33) depends on job suspension — jobs need to checkpoint their state to JSONL/SQLite before the approval gate fires, then resume from that checkpoint when the answer arrives. The checkpoint contract (`phone_wire_in` from Task 37) is described as completed but it is unclear whether the actual checkpoint write/resume is wired or only the signaling protocol.

2. The Sessions screen on the phone (Task 39 v2) needs the same session persistence that Gap 1 fixes on the desktop. If session writes are not working, the phone shows no history either.

3. Web Push on iOS requires Fritz to open the PWA to receive push — this is a documented limitation (iOS 16.4+ allows Web Push but only when the PWA is installed to the home screen). For background approval delivery, the workaround is a Shortcuts automation that opens the PWA when the Mac sends a ping via Tailscale.

### Recommended connection architecture (minimal delta from current)

Desktop AppShell adds a "Companion" tab to the right panel (new `CompanionPanel` variant). This panel shows: connected phone status (online/offline via Tailscale ping), pending approvals waiting on the phone, a QR code for pairing new devices. This makes the phone integration visible from the desktop without adding a new screen.

---

## 6. UPDATED KNOWN GAPS

### Closed (from old plans, confirmed done):
- Zustand 16-slice store: done (Phase 0)
- Typed SSE message union + BlockRenderer: done (Phase 1)
- AppShell 3-column with react-resizable-panels: done (Phase 2)
- SlotStrip 10-slot composer: done (Phase 3) — exists, not fully rendering
- Settings 17-page decomposition: done (Phase 4)
- 5 gateway desk routers created: done (Phase 5) — but NOT registered
- TipTap editor swap: done (Phase 6)
- CLI parity audit: done (Phase 6) — 43% functional parity measured
- Phone PWA + approval flow: done (Tasks 32, 33, 39)
- 158 skills wired into pipeline: done (Task 38)

### Still open (honest list):
1. 5 gateway desk routers exist but are not registered — ALL desktop admin surfaces are dead
2. Session persistence is broken — every restart loses chat history
3. Right panel is empty — no live data in any of the 7 panel variants
4. Sidebar custom sections render DnD structure but all bodies are placeholders
5. Preload exposes only 3 hermesAPI channels — the IPC surface is dramatically undersized for the renderer's needs
6. Soul screen save may or may not reach the actual gateway config
7. Kanban board is local-only — all state lost on restart
8. Skills management is browse-only — no enable/disable, update, audit from desktop
9. Model pill + context indicator are not rendering in the live SlotStrip
10. Providers save has no UX confirmation
11. No keychain migration from plaintext desktop.json — existing users with `remoteApiKey` in plaintext are unaware
12. Sessions screen "Resume" calls the prop but does not fetch message history
13. 81 CLI commands have no desktop UI equivalent (parity audit finding — these are the backlog, not a crisis)
14. Phone companion approval flow depends on job checkpoint contract whose implementation status is uncertain
15. Web Push on iOS requires manual app open — no background delivery without native app

---

## 7. RECOMMENDED NEXT 3 SESSIONS IN ORDER

### Session A — "The Gateway Unlock" (one focused session, ~3 hours with testing)

**Goal:** Register all 5 desk routers. Verify each endpoint returns 200/501 (not 404). Get session writes working end-to-end.

**Exact work:**
1. Port `desk_sessions_routes.py`, `desk_auth_routes.py`, `desk_mcp_routes.py`, `desk_logs_routes.py`, `desk_tasks_routes.py` from FastAPI APIRouter style to aiohttp RouteTableDef. Keep all 501 response bodies — do not implement the SQL yet.
2. Import and register all 5 in `gateway/run.py` with the `Authorization: Bearer` middleware from the existing API server pattern.
3. Restart gateway. Run curl tests against all 5.
4. Implement the actual SQL for `desk_sessions_routes.py` only — the `listSessions`, `getSession`, `createSession`, `updateSession` handlers against `~/.shay/state.db`.
5. Wire `sessions-rpc.ts` in main to hit the now-live endpoints.
6. Test: restart the app, send a message, restart again, confirm session appears in the Sessions panel.

**Why first:** This is the unlock for the largest cluster of broken features. Sessions, tasks, MCP management, logs, and auth all become live. The Sessions screen becomes useful overnight.

---

### Session B — "First Daily Habit Loop" (one focused session, ~2 hours)

**Goal:** Right panel shows task status. Sessions screen resumes conversations. Kanban persists.

**Exact work:**
1. Default right panel visible with BackgroundTasksPanel as active tab. Wire the task poller to `desk_tasks_routes.py`'s list endpoint (now live after Session A).
2. Add `loadSession(id)` to the App-level message state manager. Wire Sessions screen Resume to call it.
3. Add Kanban local persistence via `~/.shay/kanban.json` IPC handlers.
4. Add save toast to Providers screen.
5. Confirm Soul screen IPC — fix or add the 2 missing preload channels.

**Why second:** After Session A, the infrastructure works. Session B makes the daily loop tangible: Fritz opens the app, sees his sessions, resumes a conversation, glances at the right panel, and the Kanban board remembers his tasks.

---

### Session C — "Sidebar Comes Alive + Model Pill" (one focused session, ~2 hours)

**Goal:** The sidebar custom sections show real data. The composer SlotStrip shows model and context in real time.

**Exact work:**
1. Build `BasicMemorySection.tsx` provider component. Wire one custom section type end-to-end.
2. Migrate model state to the shared `stores/model.ts` Zustand store. Replace Chat.tsx's local ModelPicker with a read from the store. Confirm ModelPill slot in SlotStrip reads from the same store.
3. Wire ContextIndicator slot to the `usage` state that Chat.tsx already tracks — pass it through a context or put it in `stores/chat.ts`.
4. Skills screen — add the enable/disable toggle and wire to `domains/skills.ts`.

**Why third:** After Sessions A and B, the core loop works reliably. Session C makes the app feel intelligent and personalized — Fritz sees what model is running, how much context is left, recent memories in the sidebar, and can manage skills without touching a terminal. This is the session that makes Shay feel like Shay rather than a functional chat window.

---

### On the neuroscience drift and benchmark failure (honest retrospective)

The benchmark failure was real. The initial Phase 6 build claimed 43% parity but framed it as progress when the honest read is that 57% of documented CLI functionality has no desktop surface and the 5 gateway routers that power the admin layer were shipped as unregistered stubs. The lesson encoded here: "compile-clean" is not "functional." Every phase report going forward must include a live smoke test — at minimum, curl the endpoints and verify 200, not 404. The neuroscience drift was a different failure: spending cognitive bandwidth speccing a companion app architecture (the swarm phone spec) before the foundation (session persistence, right panel data) was solid. The corrective is what this plan embodies — ground truth from the actual running code first, vision second.