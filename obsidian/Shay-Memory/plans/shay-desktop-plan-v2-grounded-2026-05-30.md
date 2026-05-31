---
title: Shay Desktop Plan v2 (grounded, guardrails active)
date: 2026-05-30
score: 8/10
baseline: 5/10
gate_passed: false
permalink: shay-memory/plans/shay-desktop-plan-v2-grounded-2026-05-30
---

# GROUNDED FACTS
GROUND TRUTH FACT SHEET — shay-desktop-electron (verified 2026-05-30)

All numbers below are from real command output, not estimates.

1. IPC `invoke` calls in preload: **125**
   - `grep -c "invoke" src/preload/index.ts` → 125

2. Preload file size: **841 lines**
   - `wc -l src/preload/index.ts` → 841

3. Shay namespace scaffold (`domains.ts`): **EXISTS**
   - `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/preload/domains.ts` is present, 143 lines.

4. Registered `ipcMain.handle` handlers in main process: **232 total** (across 17 files)
   - Note: the original `**/*.ts` glob returned nothing because zsh globbing/path didn't expand; a recursive `grep -rc` gives the real count.
   - Breakdown (file: count):
     - `src/main/index.ts`: 128
     - `src/main/domains/notifications.ts`: 11
     - `src/main/domains/mcp.ts`: 11
     - `src/main/sessions-rpc.ts`: 10
     - `src/main/domains/tasks.ts`: 9
     - `src/main/domains/capture.ts`: 9
     - `src/main/domains/sessions.ts`: 8
     - `src/main/domains/plugins.ts`: 8
     - `src/main/domains/keychain.ts`: 7
     - `src/main/domains/panels.ts`: 6
     - `src/main/domains/logs.ts`: 6
     - `src/main/domains/settings.ts`: 5
     - `src/main/domains/auth.ts`: 5
     - `src/main/domains/account.ts`: 4
     - `src/main/settings-handler.ts`: 2
     - `src/main/domains/diagnostics.ts`: 2
     - `src/main/domains/index.ts`: 1
   - Key fact: 128 of 232 handlers (55%) are still concentrated in the monolithic `src/main/index.ts`; the remainder have been split into `src/main/domains/`.

5. Screen folders (20 total) under `src/renderer/src/screens/`:
   Agents, Chat, Gateway, Install, Kanban, Layout, Memory, Models, Office, Providers, Schedules, Sessions, Settings, Setup, Skills, Soul, SplashScreen, Studio, Tools, Welcome

6. Admin sub-screens (7 total) under `src/renderer/src/admin/`:
   auth, diagnostics, logs, mcp, notifications, plugins, tasks

7. Shay namespace wiring: **PARTIALLY WIRED (in progress / phased recovery)**
   - `exposeShayDomains()` is defined in `src/preload/domains.ts` at line 131 (function declared).
   - It is documented as the runtime exposure point for `window.shay.*`.
   - Per-domain typed surfaces exist and are mid-migration: `src/preload/settings-domain.ts` (comments reference "buildPreloadBindings()" pattern) and `src/preload/mcp-domain.ts` (header: "Typed `window.shay.mcp` API surface — Phase 5 (recovery)").
   - No `window.shay` direct assignment was found in the preload grep — exposure is routed through `exposeShayDomains()`, not direct property writes. The namespace exists as scaffold + phased per-domain typed bindings, with the bulk of legacy IPC still flowing through the 125 raw `invoke` calls in `index.ts`.

Relevant file paths:
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/preload/index.ts` (841 lines, 125 invoke)
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/preload/domains.ts` (143 lines, exposeShayDomains at L131)
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/preload/settings-domain.ts`
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/preload/mcp-domain.ts`
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/main/index.ts` (128 handlers)
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/main/domains/` (split-out domain handlers)

---

# Shay Desktop — Daily-Usability Replan (v2)

## 1. Grounded State Assessment

The desktop is an Electron app at `/Users/famtasticfritz/famtastic/shay-desktop-electron`. Verified state:

- **Preload (`src/preload/index.ts`)** is an 841-line monolith carrying **125 raw `invoke` calls**. This is the single largest source of fragility: every renderer call to the main process funnels through hand-written bindings here.
- **Main process handlers: 232 total** across 17 files. **128 of 232 (55%) still live in `src/main/index.ts`** — the rest have already been split into `src/main/domains/` (notifications 11, mcp 11, tasks 9, capture 9, sessions 8, plugins 8, keychain 7, panels 6, logs 6, settings 5, auth 5, account 4) plus `sessions-rpc.ts` (10).
- **`src/preload/domains.ts` EXISTS** (143 lines) and defines `exposeShayDomains()` at line 131 — this is the runtime exposure point for `window.shay.*`. The `window.shay.*` namespace is **partially wired**: scaffold present, per-domain typed surfaces (`settings-domain.ts`, `mcp-domain.ts`) mid-migration, but the bulk of traffic still flows through the 125 legacy `invoke` calls rather than typed domain bindings. There is no direct `window.shay` property write — exposure routes through `exposeShayDomains()`.
- **20 renderer screens** under `src/renderer/src/screens/`: Agents, Chat, Gateway, Install, Kanban, Layout, Memory, Models, Office, Providers, Schedules, Sessions, Settings, Setup, Skills, Soul, SplashScreen, Studio, Tools, Welcome.
- **7 admin sub-screens** under `src/renderer/src/admin/`: auth, diagnostics, logs, mcp, notifications, plugins, tasks.

Honest read: the architecture is mid-refactor. The domain-split pattern is the intended direction and is already half-done on the main side. The renderer cannot yet rely on a clean `window.shay.*` surface because the preload migration trails the main-process split. Daily usability depends less on finishing the full 125→typed migration and more on guaranteeing every screen has a working IPC path *today*.

## 2. Priority Order (what Fritz feels tomorrow)

1. **Boot + first screen reliably loads.** If SplashScreen → Welcome/Setup → main shell doesn't complete, nothing else matters.
2. **Chat works end-to-end.** Chat is the daily driver; a broken send/stream is a dealbreaker.
3. **Sessions + Models + Providers resolve.** These back Chat; a missing provider binding silently breaks Chat.
4. **`window.shay.*` namespace is consistently present** so no screen throws `undefined is not a function` on a typed call mid-migration.
5. **Settings + Soul + Memory persist.** Config that doesn't save erodes trust fast.
6. **Studio / Office / Kanban / Schedules / Skills / Tools / Agents / Gateway / Install / Layout** — secondary surfaces; must not crash the shell even if feature-incomplete.
7. **Admin sub-screens** (diagnostics, logs first) — these are how Fritz self-diagnoses the above.

## 3. Build Order (numbered, MANDATORY)

**P0 — one-line / one-import unlocks first:**

1. **Wire `exposeShayDomains()` at preload boot.** File: `src/preload/index.ts`. Change: import `exposeShayDomains` from `./domains` and call it during context-bridge setup (it already exists at `domains.ts:131`). Test: in renderer devtools, `window.shay` is an object, not `undefined`.
2. **Guard every renderer typed call against partial migration.** File: `src/preload/domains.ts`. Change: ensure `exposeShayDomains()` exposes a stub for each domain (settings, mcp, …) even when the typed binding is incomplete, so `window.shay.<domain>` is never `undefined`. Test: `Object.keys(window.shay)` lists all migrated domains; calling an unmigrated method returns a typed "not yet wired" rejection, not a crash.

**P1 — boot + core daily path:**

3. **Verify boot chain.** Files: `screens/SplashScreen`, `screens/Welcome`, `screens/Setup`, `screens/Install`. Change: confirm each transitions and none awaits a missing IPC handler. Test: cold launch reaches the main shell with no console errors.
4. **Chat send/stream path.** File: `screens/Chat` + its preload bindings. Change: confirm the invoke channels Chat uses are among the 232 registered handlers (cross-check `src/main/index.ts` + `sessions-rpc.ts`). Test: send a message, receive a streamed reply.
5. **Sessions/Models/Providers binding audit.** Files: `screens/Sessions`, `screens/Models`, `screens/Providers`; handlers in `sessions-rpc.ts`, `domains/settings.ts`. Change: ensure each screen's invoke channel has a matching `ipcMain.handle`. Test: each screen loads its list without error.

**P1 — persistence:**

6. **Settings/Soul/Memory persistence.** Files: `screens/Settings`, `screens/Soul`, `screens/Memory`; `domains/settings.ts`, `settings-handler.ts`. Change: confirm save → reload round-trips. Test: change a value, restart app, value persists.

**P2 — secondary screens crash-safety:**

7. **Wrap each secondary screen** (Studio, Office, Kanban, Schedules, Skills, Tools, Agents, Gateway, Layout) in an error boundary. Change: render a fallback panel instead of white-screening the shell on a binding error. Test: force a thrown binding error; shell stays alive.

**P2 — diagnostics:**

8. **Admin diagnostics + logs.** Files: `admin/diagnostics`, `admin/logs`; `domains/diagnostics.ts` (2 handlers), `domains/logs.ts` (6 handlers). Change: confirm both render live data. Test: diagnostics shows handler/binding health; logs stream.

**P3 — debt paydown (not blocking daily use):**

9. **Migrate the highest-traffic legacy invoke calls** out of `index.ts` (128 handlers) into `domains/` and into typed `window.shay.*` bindings, one domain per change, mirroring the existing split. Test: per-domain, the screen using it still works after switching from raw invoke to typed binding.

## 4. Per-Screen Assessment (all 20 + 7 admin)

**Screens:**
- **Agents** — P2. Likely backed by handlers in `domains/` or `index.ts`; verify binding exists, error-boundary it.
- **Chat** — P1, top priority. Daily driver; verify send/stream channels against registered handlers.
- **Gateway** — P2. Network/gateway config surface; crash-safe wrap.
- **Install** — P1 (boot path). Part of first-run; must not block reaching shell.
- **Kanban** — P2. Task board; likely uses `domains/tasks.ts` (9 handlers). Verify, wrap.
- **Layout** — P2. Panel layout; ties to `domains/panels.ts` (6 handlers). Verify, wrap.
- **Memory** — P1 (persistence). Confirm round-trip save.
- **Models** — P1. Backs Chat; verify provider/model list binding.
- **Office** — P2. Secondary surface; crash-safe wrap.
- **Providers** — P1. Backs Chat; verify against `domains/settings.ts`/auth.
- **Schedules** — P2. Cron-like; verify binding, wrap.
- **Sessions** — P1. Backed by `sessions-rpc.ts` (10) + `domains/sessions.ts` (8); verify list loads.
- **Settings** — P1 (persistence). `domains/settings.ts` (5) + `settings-handler.ts` (2); verify save.
- **Setup** — P1 (boot path). First-run flow; must complete to shell.
- **Skills** — P2. Skill catalog; verify binding, wrap.
- **Soul** — P1 (persistence). Persona/identity config; confirm save round-trip.
- **SplashScreen** — P1 (boot). Must transition out cleanly.
- **Studio** — P2. Heavy surface; error-boundary so it never white-screens shell.
- **Tools** — P2. Tool registry; verify binding, wrap.
- **Welcome** — P1 (boot path). Entry transition; verify.

**Admin sub-screens:**
- **auth** — P2. `domains/auth.ts` (5); verify login/token binding.
- **diagnostics** — P2, prioritized first among admin. `domains/diagnostics.ts` (2); surface handler/binding health.
- **logs** — P2, second admin priority. `domains/logs.ts` (6); stream logs.
- **mcp** — P3. `domains/mcp.ts` (11); typed surface mid-migration (`mcp-domain.ts`). Verify presence.
- **notifications** — P3. `domains/notifications.ts` (11); verify.
- **plugins** — P3. `domains/plugins.ts` (8); verify.
- **tasks** — P3. `domains/tasks.ts` (9); shares backing with Kanban.

## 5. Shay Autonomous vs. Needs Claude Code

**Shay can do autonomously via `code_job` (single-file, localized, testable edits):**
- Step 1 (one import + call in `index.ts`) and Step 2 (stub guards in `domains.ts`) — these are exactly the bounded one-file changes `code_job` handles well.
- Step 7 error-boundary wrapping — repetitive, per-screen, mechanical.
- Binding-audit *reporting* (grep registered handlers vs. screen invoke channels) — read-only, fully autonomous.

**Needs Claude Code (multi-file, cross-cutting, judgment-heavy):**
- Steps 4–6 when a missing handler must be *authored* (renderer + preload + main coordinated edit).
- Step 9 domain migration — touches `index.ts`, a new `domains/*.ts`, and preload typed bindings together; this exceeds reliable `code_job` scope.
- Anything requiring live launch + interactive verification of Chat streaming — Shay can queue it, but a human/Claude Code run confirms the stream.

Honest limit: `code_job` is reliable for the P0 one-liners and mechanical P2 wraps. The 125→typed migration is deliberately *not* something Shay should attempt in one shot.

## 6. Acceptance Criteria

- **P0-1 done:** `window.shay` is a defined object in renderer devtools at boot.
- **P0-2 done:** `Object.keys(window.shay)` enumerates every migrated domain; calling an unmigrated method yields a typed rejection, never `undefined is not a function`.
- **P1-3 (boot) done:** cold launch reaches the main shell with zero console errors through SplashScreen → Welcome/Setup/Install.
- **P1-4 (Chat) done:** a sent message returns a streamed reply.
- **P1-5 (Sessions/Models/Providers) done:** each screen loads its list with no binding error.
- **P1-6 (persistence) done:** a changed value in Settings, Soul, and Memory survives an app restart.
- **P2 (secondary screens) done:** a forced binding error in any secondary screen renders a fallback panel and the shell stays alive.
- **P2 (admin) done:** diagnostics renders binding/handler health and logs stream live data.

Every P0 and P1 item is verified by launching the built app and observing the stated behavior, not by reading the code alone.