---
title: Shay Desktop — Canonical App Decision (two apps, no crossing wires)
date: 2026-05-31
author: claude-code (Fritz decision)
tags:
- desktop
- canonical
- decision
- do-not-confuse
- swift
- electron
- retire
permalink: shay-memory/plans/desktop-canonical-2026-05-31
---

# Two desktops — which is which (DO NOT CROSS WIRES)

There are TWO separate Shay desktop apps. They are NOT merged and must not be confused.

## `shay-desktop` (Swift) — EXISTING, FROZEN, retiring
- Native macOS Swift app (`HermesDesktop`), from `dodo-reach/hermes-desktop`.
- BUILT + INSTALLED: `/Applications/ShayDesktop.app` (v0.8.1, ~9.2MB), last built 2026-05-19.
- This is the polished hand-built daily-driver Fritz already had.
- **Status: FROZEN.** No changes. It is the v1 that will be RETIRED once the
  Electron app reaches parity. Shay's build loop must NEVER touch it.

## `shay-desktop-electron` (Electron/TS) — GO-FORWARD, Shay-buildable
- Electron + TypeScript/React, from `fathah/hermes-desktop`, v0.4.3.
- This is the one Shay can AUTONOMOUSLY build/extend (TSX >> Swift for an LLM pipeline).
- Tonight: fixed dead preload bridge, completed the IPC contract (140/140, 0 console
  errors — 96 real + 44 graceful stubs), added the render-QA gate (`npm run qa`).
- **Status: ACTIVE.** All build work + Shay's ralph loop target THIS app only.

## The plan (Fritz, 2026-05-31)
Build them as separate apps. Drive the Electron app to feature-parity with the
Swift app, then **retire the Swift app** (replace `/Applications/ShayDesktop.app`).

## Easiest path to "Electron complete → retire Swift"
1. **Reuse the backend, don't rebuild it.** The 44 stubbed Electron methods map to
   capabilities the hermes-agent gateway/CLI ALREADY provides (the Swift app uses
   them). Wire the Electron main-process handlers as THIN PROXIES to that same
   gateway — far easier than writing 44 new backends.
2. **Parity checklist vs ShayDesktop.app** — enumerate what the Swift app does;
   drive the Electron app to match, gated per-screen by `npm run qa` (contract + vision).
3. **Cosmetic polish** via the visual-QA loop (fix cut-off text etc. flagged by visual_qa).
4. **Cutover** when QA + parity are green: build the Electron `.dmg`, replace
   `/Applications/ShayDesktop.app`, archive the Swift repo.

## Guardrails so we never cross wires again
- Shay's ralph loop / build_app target ONLY `shay-desktop-electron`.
- The Swift `shay-desktop` repo is frozen — no agent edits it until retirement.
- This note is the canonical reference; check it before any desktop work.