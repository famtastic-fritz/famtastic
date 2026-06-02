---
title: Deep Code + Security Review — shay-desktop-electron (2026-05-31)
date: 2026-05-31
author: code-review agent (Fritz overnight)
tags:
- review
- desktop
- security
- architecture
- do-not-repeat
permalink: shay-memory/reviews/deep-code-review-2026-05-31
---

# Deep Code Review — shay-desktop-electron

## CRITICAL (runtime broken / security)
- **C1 — `unstage-attachment` has NO main handler.** preload invokes it; nothing in src/main handles it → attachment removal silently no-ops. FIX: add ipcMain.handle("unstage-attachment", ...) + impl in attachment-staging.
- **C2 — `swarm` type lie.** index.d.ts types HermesAPI.swarm as an object; generated-bindings stubs it as a function; the REAL api is window.swarm (untyped). `window.hermesAPI.swarm.x()` throws. FIX: pick one shape, type window.swarm, drop the stub.
- **C3 — `sandbox:false` open attack surface.** Needed because preload/domains.ts imports fs-using main/domains/*. + webviewTag:true widens it. FIX: move buildPreloadBindings into fs-free preload/*-domain.ts files, strip fs/path, restore sandbox:true.
- **C4 — `swarm:log:stream` orphan process.** spawns `logs --follow`, never stores child, no cleanup on sender destroy → orphaned tails + throws on destroyed WebContents. FIX: store child, sender.once("destroyed", ()=>child.kill()), add swarm:log:stop.

## IMPORTANT
- **I1 — `registerDomains(ipcMain)` is NEVER called** from main/index.ts → all `window.shay.*` channels unregistered → raw "No handler" errors. FIX: import + call registerDomains in setupIPC.
- **I2 — event listeners double-register on HMR** (generated-bindings + preload both ipcRenderer.on same channels) → doubled chat chunks in dev. FIX: removeAllListeners before on.
- **I3 — swarm:dispatch writes jsonArgs to stdin but invokes CLI positionally** — args may be silently dropped. FIX: verify stdin protocol or pass --args.
- **I4 — qa_gate.mjs method regex `[(?:]` too loose** — matches object keys like `swarm:`; can false-pass. FIX: tighten to `[:(]` + exclude non-method keys / AST parse.
- **I5 — visual_qa.py reads ~/.shay/.env at import w/o try/except** — crashes on fresh machine. FIX: wrap in try/except, guard empty key.
- **I6 — useChatActions stale-closure on hermesSessionId** for approve/deny during stream → /approve hits wrong session. FIX: use a ref.

## ARCHITECTURE smells
- A1 — domain channel mismatch: stub `shay:sessions:list` (colon) vs real `shay.sessions.list` (dot) — can't coexist without migration.
- A2 — window.hermes + window.hermesAPI dual-expose (doubled surface) — track as migration target.
- A3 — index.d.ts doesn't declare window.hermes/swarm/shay → those surfaces are `any`.
- (from arch agent) Routing is two hand-maintained string lists (Sidebar SCREENS[] + App screenRegistry{}) with no ScreenId type → drift is how kanban/gateway got stubbed. FIX: single typed screen manifest {id,label,icon,group,lazy,cli} consumed by both → screen-per-command becomes additive + drift becomes a compile error.

## Harness notes
- loop.py commit messages say "ralph:" — violates CLAUDE.md commit policy (no harness/AI refs). Use human-style messages.
- scoped revert can restore stale index.d.ts/generated-bindings vs prior committed handlers (edge case).

## Already fixed this session
- Settings React #185 (useSyncExternalStore cached snapshot) ✓
- Kanban + Gateway dead-wiring (were placeholder divs; real screens now imported) ✓
- 138/140 IPC bound to real channels (multi-line ipcMain.handle scan fix) ✓