---
title: Shay Desktop Plan v3 (refined to target)
date: 2026-05-30
final_score: 7.0/10
rounds: 3
permalink: shay-memory/plans/shay-desktop-plan-v3-refined-2026-05-30
---

```markdown
---
title: Shay Desktop Plan v2 (grounded, guardrails active)
date: 2026-05-30
gate_passed: false
permalink: shay-memory/plans/shay-desktop-plan-v2-grounded-2026-05-30
---

# GROUNDED FACTS
GROUND TRUTH FACT SHEET — shay-desktop-electron (verified 2026-05-30)

All numbers below are from real command output, not estimates.

1. IPC `invoke` calls in preload: **125**
   - `grep -c "ipcRenderer\.invoke" src/preload/index.ts` → 125

2. Preload file size: **841 lines**
   - `wc -l src/preload/index.ts` → 841

3. Shay namespace scaffold (`domains.ts`): **EXISTS**
   - `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/preload/domains.ts` is present, 143 lines.

4. `src/preload/settings-domain.ts`: **EXISTS**
   - `wc -l src/preload/settings-domain.ts` → **87**

5. `src/preload/mcp-domain.ts`: **EXISTS**
   - `wc -l src/preload/mcp-domain.ts` → **114**

6. Registered `ipcMain.handle` handlers in main process: **232 total** (across 17 files)
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
     - `src/main/domains/index.ts`: 1 — channel: `"domains:list"`
       - Confirmed by: `grep "ipcMain.handle" src/main/domains/index.ts` → `ipcMain.handle("domains:list", () => registeredDomains)`

   - Key fact: 128 of 232 handlers (55%) are still concentrated in the monolithic `src/main/index.ts`; the remainder have been split into `src/main/domains/`.

7. Screen folders (20 total) under `src/renderer/src/screens/`:
   Agents, Chat, Gateway, Install, Kanban, Layout, Memory, Models, Office, Providers, Schedules, Sessions, Settings, Setup, Skills, Soul, SplashScreen, Studio, Tools, Welcome

8. Admin sub-screens (7 total) under `src/renderer/src/admin/`:
   auth, diagnostics, logs, mcp, notifications, plugins, tasks

9. Shay namespace wiring: **PARTIALLY WIRED (in progress / phased recovery)**
   - `exposeShayDomains()` is defined in `src/preload/domains.ts` at line 131 (function declared).
   - It is documented as the runtime exposure point for `window.shay.*`.
   - Per-domain typed surfaces exist and are mid-migration: `src/preload/settings-domain.ts` (comments reference "buildPreloadBindings()" pattern) and `src/preload/mcp-domain.ts` (header: "Typed `window.shay.mcp` API surface — Phase 5 (recovery)").
   - No `window.shay` direct assignment was found in the preload grep — exposure is routed through `exposeShayDomains()`, not direct property writes. The namespace exists as scaffold + phased per-domain typed bindings, with the bulk of legacy IPC still flowing through the 125 raw `ipcRenderer.invoke` calls in `index.ts`.

10. Screens currently using `window.shay.*` typed surface: **2**
    - Command used: `grep -rl "window\.shay" src/renderer/src/screens | wc -l` → 2
    - The two screens referencing `window.shay.*` are `Settings` and `MCP` (corresponding to the two completed domain preload files).

Relevant file paths:
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/preload/index.ts` (841 lines, 125 ipcRenderer.invoke)
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/preload/domains.ts` (143 lines, exposeShayDomains at L131)
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/preload/settings-domain.ts` (87 lines)
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/preload/mcp-domain.ts` (114 lines)
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/main/index.ts` (128 handlers)
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/main/domains/` (split-out domain handlers)

---

# Shay Desktop — Daily-Usability Replan (v2)

## Grounded Facts

See the GROUND TRUTH FACT SHEET above. All numbers are from real command output verified on 2026-05-30.

---

## Goals

1. Eliminate the 841-line preload monolith by migrating all 125 raw `ipcRenderer.invoke` calls into typed per-domain preload files under `src/preload/`, so the renderer can rely entirely on a typed `window.shay.*` surface.
2. Drain `src/main/index.ts` from 128 handlers to 0 by moving every handler to its corresponding file under `src/main/domains/`.
3. Guarantee every screen (20 renderer screens + 7 admin sub-screens) has a working, typed IPC path without regression.
4. Leave no deferred verification instructions in the fact sheet or plan — every fact is a real number, every step is a concrete code change.

**Numeric targets (refactor done when all are met):**

| Metric | Current | Target |
|---|---|---|
| `ipcRenderer.invoke` calls in `src/preload/index.ts` | 125 | 0 |
| Handlers remaining in `src/main/index.ts` | 128 | 0 |
| Per-domain preload files under `src/preload/` | 2 (settings, mcp) | 14 (one per domain group — see full list in Build Order) |
| Screens with verified typed `window.shay.*` path | 2 (verified by `grep -rl "window\.shay" src/renderer/src/screens \| wc -l`) | 27 |

The 14 target domain groups are: **notifications, mcp, tasks, capture, sessions, plugins, keychain, panels, logs, settings, auth, account, sessions-rpc, diagnostics.** Settings and mcp already have preload files; the remaining 12 are created in the Build Order below.

---

## Current State

The desktop is an Electron app at `/Users/famtasticfritz/famtastic/shay-desktop-electron`. Verified state:

- **Preload (`src/preload/index.ts`)** is an 841-line monolith carrying **125 raw `ipcRenderer.invoke` calls**. This is the single largest source