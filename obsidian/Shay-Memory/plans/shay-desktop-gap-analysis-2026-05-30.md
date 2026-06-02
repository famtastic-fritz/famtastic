---
title: Desktop Plan Gap Analysis — Shay vs Independent
date: 2026-05-30
shay_score: 5
ind_score: 7.5
permalink: shay-memory/plans/shay-desktop-gap-analysis-2026-05-30
---

I now have all the input needed. Here is the synthesis.

---

## GAP ANALYSIS REPORT — SHAY DESKTOP DAILY USABILITY
### As of 2026-05-30

---

## How Close Did Shay Come?

**Overall score: 6.5 / 10**

| Dimension | Score | Notes |
|---|---|---|
| Completeness | 5/10 | Plan was literally cut off mid-sentence. ~10 of 20 screens unassessed. No build order, no effort estimates, no session phasing. |
| Priority order | 7/10 | Correct structural diagnosis. Gateway-first framing is defensible but missed that `window.shay.*` is a one-line unlock that unblocks more faster. |
| Self-awareness | 6/10 | Correct on the big structural failures. Wrong on hermesAPI breadth (called it 3 bindings; it has 60+). Overstated session loss severity. Missed domains.ts scaffold entirely. |
| Honest state assessment | 7/10 | Headline claims are accurate and verified (unregistered routes, silent failures). The per-screen scores are the most useful artifact in either plan. Distortions are errors of measurement, not spin. |

---

## What Both Plans Agree On (High Confidence)

These gaps were found independently. They are definite.

1. `window.shay.*` namespace does not exist at runtime — only `window.hermesAPI` and `window.electron` are real `contextBridge` exposures. Every settings page calling `window.shay.account.*`, `window.shay.privacy.*`, `window.shay.tasks.*`, etc. silently fails or hits a warn fallback.
2. Five gateway Python routers (`desk_sessions_routes.py`, `desk_auth_routes.py`, `desk_mcp_routes.py`, `desk_logs_routes.py`, `desk_tasks_routes.py`) exist with real payload contracts but are not registered in `gateway/main.py` (or `run.py`). Every admin surface that calls these endpoints gets a 404 or 501.
3. Sessions do not fully persist across restarts. The resume path is broken.
4. The right panel stays empty — `usePanelsStore` has no persistent content assigned to tabs.
5. Settings sub-page action handlers are stubs (`console.log("TODO Phase 5")`).
6. Non-Chat screens beyond Splash/Welcome/Install/Setup have no functional mount path. App.tsx does not route to them. The nav store has push/cursor but nothing reads cursor to switch the rendered screen.

---

## What Only Shay Flagged

Things the independent plan missed because it lacked Shay's vault context.

- Per-screen percentage scores for all 20 screens — the most actionable diagnostic artifact produced. Even where the scores have measurement errors, the framework is correct and useful.
- Explicit identification that Chat-the-component is solid while Chat-the-system is broken. This is an important distinction that prevents misdirected work.
- The `sessions-overlay.db` / `sessions-rpc.ts` local SQLite layer as a distinct architectural piece, separate from gateway sync.
- The sidebar custom sections DnD store wiring as a discrete partially-complete feature.
- Welcome screen's failure to detect prior completed setup and skip onboarding.

---

## What Only Independent Flagged

Things Shay was blind to about herself.

- **`domains.ts` / `exposeShayDomains()` already exists.** The full `window.shay.*` namespace is implemented as a Phase 0 scaffold. It was never imported into `index.ts`. This is a one-line fix, not missing infrastructure. Shay diagnosed the symptom correctly but missed that the cure was already written.
- **hermesAPI has 60+ methods, not 3.** Shay's audit counted grep context hits and reported 3 bindings. The actual preload exposes kanban CRUD, cron jobs, skills install/uninstall, models CRUD, memory entries, soul read/write, toolsets, session cache, profiles, MCP servers, log reading, backups, and Claw3D. This changes the build order significantly — many screens are mountable-and-functional right now via hermesAPI.
- **Two distinct nav bugs, not one.** (1) App.tsx does not render non-Chat screens. (2) Even if it did, CommandPalette pushes to navStore but nothing reads `navStore.cursor` to switch the visible screen. Independent and sequential fixes.
- **Kanban, Schedules, and Memory could work immediately upon mounting.** `hermesAPI` already has `kanbanListBoards`, `kanbanCreateTask`, `listCronJobs`, `createCronJob`, `pauseCronJob`, `listMemoryEntries` wired all the way through to main. These screens are not broken — they are unmounted.
- **Admin MCP page may already work through hermesAPI.** `hermesAPI.listMcpServers()` is a real, wired IPC call. The `desk_mcp_routes.py` gap may not matter for the admin MCP surface.

---

## Shay's Biggest Self-Awareness Gaps

**1. She underestimated hermesAPI by ~20x.**
Reporting 3 IPC bindings when the preload has 60+ is not a small error. It caused her to treat "backend connection" as mostly absent when large portions of it are wired. This inflated the apparent severity of the gap and would have led to unnecessary backend work before easier frontend unlocks.

**2. She missed domains.ts entirely.**
The fix for `window.shay.*` is already written. Shay diagnosed the failure correctly but had no awareness that the remedy existed in the codebase. A one-line import + call in `index.ts` would unblock every settings page calling the shay namespace simultaneously.

**3. She overstated session loss.**
"Every app restart loses session context" is too strong. The overlay SQLite layer provides local persistence for session metadata independently of the gateway. The real gap is gateway sync for cross-device and advanced features, not total loss.

**4. She conflated screen count with screen assessment.**
The plan claimed to assess "all 20 screens" but covered roughly 10. The 7 admin sub-screens (`auth`, `diagnostics`, `logs`, `mcp`, `notifications`, `plugins`, `tasks`) were not counted or assessed.

**5. She produced no build order.**
For a "complete daily-usability plan," the sequenced priority list is the core deliverable. It was absent. State diagnosis without sequenced remediation is an audit report, not a plan.

---

## The Consolidated Priority List

Ordered by: unlock ratio (how many features unblocked per unit of work), then dependency chain.

**P0 — One-line unlocks (do these first, highest leverage)**
1. Import `exposeShayDomains()` into `preload/index.ts`. This wires the full `window.shay.*` namespace and unblocks every settings page simultaneously. Estimated effort: 5 minutes + smoke test.
2. Fix App.tsx routing so non-Chat screens can be mounted. Add a screen switcher that reads `navStore.cursor`. Estimated effort: 1-2 hours.

**P1 — Screen mounting (highest user-visible payoff, backend already exists)**
3. Mount and verify Kanban screen — hermesAPI CRUD is already wired.
4. Mount and verify Schedules screen — hermesAPI cron CRUD is already wired.
5. Mount and verify Memory screen — hermesAPI memory entries are already wired.
6. Mount and verify Sessions screen — overlay SQLite layer is functional for local persistence.
7. Fix CommandPalette so nav pushes actually switch the visible screen.

**P2 — Gateway registration (enables admin surfaces and cross-device features)**
8. Register `desk_sessions_routes.py` in gateway — session sync and resume will land on a real endpoint.
9. Register `desk_tasks_routes.py` — TaskTrayStrip and task history become functional.
10. Register `desk_mcp_routes.py` — admin MCP management beyond listMcpServers.
11. Register `desk_logs_routes.py` and `desk_auth_routes.py`.

**P3 — Settings completion**
12. Audit every settings sub-page: categorize as (a) calls hermesAPI and works, (b) calls window.shay and now works after P0, (c) still stub. Fix category (c) sub-pages by priority.
13. Wire VoiceAudio TTS settings to real hermesAPI calls.
14. Wire Billing and Usage pages to real data sources.

**P4 — Right panel and composer**
15. Assign persistent content to `usePanelsStore` tabs so the right panel renders real data.
16. Wire SlotStrip composer actions beyond TipTap initialization.
17. TerminalPanel node-pty native module rebuild (non-trivial, electron-rebuild dependency — plan a dedicated session).

**P5 — Polish and completeness**
18. Welcome screen: detect prior completed setup, skip onboarding with pre-fill.
19. Remaining screen functional verification pass.

---

## Updated Known Gaps (as of 2026-05-30)

**Done / Solid:**
- Chat send/receive pipeline (SSE, abort, streaming)
- Splash screen gate
- Welcome/Install/Setup onboarding flow
- AppShell 3-column layout with react-resizable-panels
- Sidebar collapse modes (expanded/icons/hidden)
- Column width persistence via customize store
- Keychain via safeStorage
- OS notifications + DND (main-side)
- hermesAPI preload: 60+ methods wired for kanban, cron, skills, models, memory, soul, toolsets, session cache, profiles, MCP list, logs, backups
- MCP server list via hermesAPI.listMcpServers()
- TipTap composer initialization

**Partial / Incomplete:**
- Sessions: local overlay SQLite works; gateway sync non-functional (P2)
- Settings sub-pages: hermesAPI-wired sub-pages functional; window.shay-calling sub-pages fail until P0 is done; some sub-pages remain console.log stubs
- CommandPalette: opens, renders, routes push to navStore but navStore.cursor is not consumed to switch screen
- SlotStrip: renders 10 slots; most slot actions are stubs
- Admin MCP page: list works via hermesAPI; advanced management stubs
- Sidebar custom sections: DnD store wired; section bodies render placeholders

**Stub / Not wired:**
- `window.shay.*` namespace (domains.ts exists but not imported)
- App.tsx non-Chat screen routing (screens are dead code)
- Right panel tab content (chrome renders, data feeds empty)
- `desk_sessions_routes.py` — unregistered in gateway
- `desk_auth_routes.py` — unregistered in gateway
- `desk_mcp_routes.py` — unregistered in gateway
- `desk_logs_routes.py` — unregistered in gateway
- `desk_tasks_routes.py` — unregistered in gateway
- TaskTrayStrip (calls window.shay.tasks.* which doesn't exist)
- TerminalPanel pty (node-pty native module not rebuilt for Electron)
- Welcome screen setup-completion detection
- Billing and Usage pages (no real data source wired)
- VoiceAudio TTS settings (stubs)

**Missing / Not started:**
- Cross-device session sync (depends on gateway P2)
- Agents, Office, Soul, Studio, Tools, Providers, Skills screen — unmounted, functional state unknown beyond hermesAPI surface coverage

---

## Next 3 Sessions Recommendation

**Session 1 — The Two-Line Unlock (~3-4 hours)**

Goal: make every settings page stop silently failing and make every screen reachable.

1. In `preload/index.ts`: import and call `exposeShayDomains()`. Verify `window.shay.*` is accessible from renderer devtools.
2. In `App.tsx` and `MainShell`: add screen switcher that reads `navStore.cursor`. Wire the `cursor` value to render the correct screen component.
3. Fix CommandPalette nav actions to confirm they now visibly switch screens.
4. Smoke test: navigate to at least 5 non-Chat screens via CommandPalette and confirm mount.

Deliverable: all screens are reachable; all settings pages calling window.shay.* no longer silently fail.

**Session 2 — Mount the Ready Screens (~4-5 hours)**

Goal: prove that hermesAPI-backed screens work without any new backend work.

1. Mount and functionally verify Kanban (kanbanListBoards, kanbanCreateTask).
2. Mount and functionally verify Schedules (listCronJobs, createCronJob, toggles).
3. Mount and functionally verify Memory (listMemoryEntries, createMemoryEntry).
4. Mount and verify Sessions screen local persistence (overlay SQLite, rename/pin).
5. Audit all settings sub-pages: mark each as (a) working, (b) window.shay unlocked by Session 1, (c) still stub. Produce a prioritized stub list.

Deliverable: Fritz can navigate to Kanban, Schedules, Memory, and Sessions and use their primary functions. Settings audit list produced.

**Session 3 — Gateway Registration (~3-4 hours)**

Goal: wire the five Python routers so admin surfaces and session sync have real endpoints.

1. Register `desk_sessions_routes.py` in `gateway/main.py`. Test session resume IPC path end-to-end.
2. Register `desk_tasks_routes.py`. Verify TaskTrayStrip and TaskHistoryTable render real data.
3. Register `desk_mcp_routes.py`. Verify admin MCP management beyond list.
4. Register `desk_logs_routes.py` and `desk_auth_routes.py`.
5. Smoke test all five admin sub-surfaces with real gateway running.

Deliverable: admin panel surfaces are functional; session persistence is end-to-end; Fritz stops seeing 404s from admin interactions.