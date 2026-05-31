---
title: ULTIMATE Shay Desktop + Agent-OS — Build Plan (Shay-authored)
date: 2026-05-30
author: shay-pipeline
gate_passed: true-after-truncation-fix
tags:
- ultimate
- desktop
- agent-os
- ralph-ready
- prd
permalink: shay-memory/plans/ultimate-desktop-agentos-plan-2026-05-30
---

# Shay Desktop + Agent-OS: Complete Build Plan

## Vision
A fully-wired, daily-driver Electron desktop where every screen is routable, every Agent-OS control surface is live, and Shay can operate her entire swarm from one window — chat, dispatch agents, monitor tasks, manage memory, and configure everything — without touching a terminal.

---

## Current State
- **20 screen folders** exist under `src/renderer/src/screens/` — all scaffolded, most are stub/dead routes
- **Routing**: only Chat (`main`) is live; Soul + Models were just wired via nav view
- **IPC**: 33 proven `invoke` calls in preload; 232 `ipcMain.handle` handlers in main (128 still in monolithic `index.ts`)
- **Agent-OS swarm**: lives in `shay-agent-os/components/swarm/` — brain_client, goal_loop, dispatcher, pipeline are present but not surfaced in the desktop UI
- **Build method proven**: `build_app` + `surgical_patch` + typecheck gate + runtime render gate + rollback

---

## Screen & Surface Inventory

| # | Screen | Status | Category |
|---|--------|--------|----------|
| 1 | SplashScreen | scaffold | Shell |
| 2 | Setup | scaffold | Shell |
| 3 | Install | scaffold | Shell |
| 4 | Layout | scaffold | Shell |
| 5 | Welcome | scaffold | Shell |
| 6 | Chat | **LIVE** | Core |
| 7 | Sessions | scaffold | Core |
| 8 | Memory | scaffold | Core |
| 9 | Agents | scaffold | Agent-OS |
| 10 | Kanban | scaffold | Agent-OS |
| 11 | Schedules | scaffold | Agent-OS |
| 12 | Skills | scaffold | Agent-OS |
| 13 | Studio | scaffold | Agent-OS |
| 14 | Models | **nav-wired** | Config |
| 15 | Providers | scaffold | Config |
| 16 | Settings | scaffold | Config |
| 17 | Soul | **nav-wired** | Identity |
| 18 | Gateway | scaffold | Ops |
| 19 | Office | scaffold | Productivity |
| 20 | Tools | scaffold | Tools |
| 21 | Logs *(new)* | missing | Ops |
| 22 | Diagnostics *(new)* | missing | Ops |
| 23 | AgentMonitor *(new)* | missing | Agent-OS |
| 24 | CaptureInbox *(new)* | missing | Core |

**New surfaces (21–24) require folder + component creation before routing.**

---

## Agent-OS Integration

The swarm exposes three integration points the desktop must consume:

| Swarm Module | Desktop Surface | IPC Channel Needed |
|---|---|---|
| `brain_client` | AgentMonitor, Agents | `swarm:agent:list`, `swarm:agent:status` |
| `goal_loop` | AgentMonitor | `swarm:goal:current`, `swarm:goal:pause` |
| `dispatcher` | Agents (dispatch) | `swarm:dispatch`, `swarm:queue:list` |
| `pipeline` | Studio, Logs | `swarm:pipeline:run`, `swarm:log:stream` |

Each IPC channel requires: (a) `ipcMain.handle` registered in a new `src/main/domains/swarm.ts`, (b) `window.api.swarm.*` exposed in preload, (c) screen component consuming it.

---

## Build Order

Units are ordered by dependency. Each unit is a single gated build step.

```
U1  → Router scaffold (wire all 20 existing screens into the nav)
U2  → Shell polish (SplashScreen→Welcome→Chat default flow)
U3  → Sessions screen (live session list from IPC)
U4  → Memory screen (memory read/write via IPC)
U5  → Settings screen (read/write settings IPC)
U6  → Providers screen (list/edit providers IPC)
U7  → Models screen (promote from nav-stub to full CRUD)
U8  → Soul screen (promote from nav-stub to full editor)
U9  → swarm.ts IPC domain (all swarm handlers + preload bindings)
U10 → Agents screen (dispatch + list, consumes swarm IPC)
U11 → AgentMonitor screen (new — live heartbeat + kill/pause)
U12 → Kanban screen (task queue view, consumes swarm:queue:list)
U13 → Schedules screen (cron/schedule CRUD)
U14 → Skills screen (skill registry list + enable/disable)
U15 → Studio screen (pipeline runner UI)
U16 → Logs screen (new — streaming log viewer)
U17 → Diagnostics screen (new — system health panel)
U18 → Gateway screen (MCP server connections)
U19 → CaptureInbox screen (new — phone/voice/quick-capture feed)
U20 → Office screen (productivity surface)
U21 → Tools screen (tool registry + invoke UI)
U22 → Install screen (plugin install flow)
U23 → Global nav audit (all 24 surfaces reachable, active-state correct)
U24 → End-to-end smoke (spawn agent → see in AgentMonitor → task in Kanban)
```

---

## Per-Unit Recipe

Every unit follows this fixed recipe:

**Inputs**: screen folder path, IPC channels needed, acceptance checklist  
**Steps**:
1. `build_app` (or `surgical_patch` for existing files) — write/patch component + any new IPC domain file
2. **Typecheck gate**: `npx tsc --noEmit` — PASS required; on FAIL → rollback + diagnose
3. **Runtime render gate**: launch app subprocess, navigate to screen, assert no render loop / blank / crash within 5s
4. If both gates pass → commit unit; else → rollback to last clean commit

**New screen recipe** (U11, U16, U17, U19):
1. Create `src/renderer/src/screens/<Name>/index.tsx` (functional component, typed props)
2. Create `src/main/domains/<domain>.ts` if new IPC needed
3. Add preload binding in `src/preload/index.ts` (surgical_patch)
4. Add route entry in router (surgical_patch)
5. Run both gates

**Existing screen promotion recipe** (U3–U8, U10, U12–U15, U18, U20–U22):
1. `surgical_patch` replaces stub JSX with live data-bound component
2. Confirm IPC channel exists or add it
3. Run both gates

---

## Acceptance Criteria

**Per-unit (binary — all must be true to mark a unit DONE):**
- [ ] `npx tsc --noEmit` exits 0
- [ ] App launches and renders the screen without blank/crash/loop within 5s
- [ ] Screen is reachable via nav (not just direct URL)
- [ ] No new TypeScript `any` introduced without explicit comment
- [ ] Files written matches manifest (vacuous-pass guard: files_written ≥ 1)

**Project-complete (all 24 units done):**
- [ ] All 24 surfaces render and are nav-reachable
- [ ] `swarm:agent:list`, `swarm:dispatch`, `swarm:log:stream` IPC channels respond
- [ ] AgentMonitor shows live agent status (not mock data)
- [ ] CaptureInbox shows the Shay Phone test note
- [ ] Kanban reflects real swarm task queue
- [ ] Zero TypeScript errors on full `tsc --noEmit`
- [ ] Runtime render gate passes for all 24 screens in sequence

---

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| `swarm.ts` IPC domain — swarm modules may not export stable interfaces | High | Inspect actual exports before writing handlers; stub with mock returns if interface is unstable, gate on real data in U24 |
| `surgical_patch` fails on large files (preload index.ts is 841 lines) | Medium | Anchor patches to unique 3-line context; split preload into domain files if patch fails twice |
| Runtime render gate times out on a slow screen | Medium | Use a 5s render budget per screen; screens needing async data show a loading state that satisfies the gate without waiting on the network |
| New screens (21–24) add scope not in the original 20 | Medium | Build the 20 existing screens first (U1–U22 minus new); treat the 4 new surfaces as a second wave gated independently |
| Swarm IPC returns unstable shapes that crash the renderer | Medium | Type every swarm IPC return; render-gate each consuming screen; fall back to empty-state UI on malformed data |

---

## Completion Note
This plan was authored autonomously by Shay's pipeline (4 parallel research agents + grounded facts + gated planning_loop). The synthesis truncated on the final risk row at the token ceiling; that last row + this note were completed by hand. Gate status corrected to PASS — all 8 required sections present, ends complete. Ready to hand to the ralph-style autonomous build loop (one gated unit per iteration).
