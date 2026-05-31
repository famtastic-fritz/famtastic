---
title: UI-SPRINT-LESSONS-2026-05-31
type: note
permalink: shay-memory/learnings/ui-sprint-lessons-2026-05-31
---

# Shay Desktop UI Sprint — Lessons (2026-05-31)

Captured into Shay's learning store via swarm.pipeline.capture_planning_lesson and minted as skills under shay-agent-os/skills/.

1. **useSyncExternalStore getSnapshot must return a cached/stable ref** — new Set()/{} each call → React #185 "Maximum update depth". Cache snapshot, rebuild only on real change. → skill: settings-store-snapshot-cache
2. **Dead-wiring** — a real screen (Kanban 991L, Gateway 260L) sat unimported behind `<div>Name</div>`. Hand-maintained registries drift. → skills: dead-wire-detector, typed-screen-manifest
3. **Scan multi-line `ipcMain.handle(`** — single-line grep missed 4+ channels → stubbed real methods. Parse newline-tolerant; verify bindings vs runtime. → skill: micro-patch-living-file (generated-bindings)
4. **Chat chrome must be screen-scoped** — mode pills + Pinned/Recents belong to the chat tab only, not the global shell. Gate on navView==='chat'.
5. **Default to the designed dark theme** — system/light on a light-mode Mac renders flat white "terrible" UI. → skill: claude-desktop-style-match
6. **Degrade gracefully on missing IPC handler** — treat "No handler registered" as NotImplemented → defaults, never raw error text.
7. **Done = runs + reachable + looks right + usable, NOT compiles** — gates tested the compile layer below where failures lived. → skill: render-spine-guard
8. **Vision QA is the missing gate** — blind gates can't see broken/ugly UI; add a screenshot vision judge as a required gate. → skill: visual-qa-gate