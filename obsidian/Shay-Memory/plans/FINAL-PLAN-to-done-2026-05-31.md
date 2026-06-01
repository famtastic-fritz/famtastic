---
title: FINAL-PLAN-to-done-2026-05-31
type: note
permalink: shay-memory/plans/final-plan-to-done-2026-05-31
---

# FINAL PLAN → "done" (2026-05-31)
"Done" = everything below built + gated (typecheck/build/qa/vision) + merged + packaged-app verified.
ONLY postponed: Nous/Step-3.7, train-our-own-model, mobile app, gemma4. (Agent OS port is IN scope.)

## Already done (this session, on main, gated)
Two-level nav IA · Providers fix · Soul editor · TopBar fix · Models page (H3) · Agent Monitor (H5) ·
DetailDrawer/CliVerbPanel template (H1) · concise skill · 12 research docs + master plan + architecture + 3 adversarial reviews.

## Remaining work to done — 4 tracks

### TRACK 1 — IPC backends (net-new, main-process; ATTENDED, quiesce gateway/loops first)
The real bottleneck: the desktop exposes only a thin slice of the CLI.
- T1a Skills: enable/disable, edit SKILL.md (write), sources/`tap` (Skills today = 5/14 verbs).
- T1b Security: pairing (list/approve/revoke), hooks (list/test/revoke), checkpoints (status/prune/clear) — ZERO handlers today.
- T1c Provider self-registration: wire the stubbed `shay:auth:*` channels (auth-pool.ts) → shell to `shay auth add`.
- T1d Usage/cost backend for Insights (or wire onChatUsage accumulation + OpenRouter balance — real data only, no fake).
Each: main handler + preload binding + index.d.ts. Needs app rebuild. Do attended (config/main edits collide with live gateway per adopt review).

### TRACK 2 — Renderer screens (after their backend lands; reuse H1 template)
- H4 Skills manager (T1a) · H7 Security screen (T1b) · H2 Add-Provider modal (T1c) · H6 Insights (T1d) · H8 Inbox (aggregate existing capture/jobs/research).
- H9 Chat 1:1 parity — top-right terminal/bg-tasks, below-input row, breadcrumb, Fritz→chat-settings. **FRITZ REVIEWS** (design-sensitive; you've corrected chat UI repeatedly).

### TRACK 3 — Agent OS port (IN SCOPE — the big one)
Native port of hermes-webui → `agentos` domain screens, per `agentos-port-plan-2026-05-31.md`. Break into per-screen stories; build on the proven Claude path, serial, gated; reuse H1 template. Its own focused run.

### TRACK 4 — ADOPT plumbing (ATTENDED, quiesce loops; per adopt adversarial review)
- caveman (PROVE worker-only scoping or defer) · rtk + token-optimizer (install) · L0→L3 memory (ADDITIVE + basic-memory backup first) · holographic enable (shadow) · credential pools · /goal loop · MCP P0 (Context7/GitHub/Filesystem, ≤6) · shay mcp serve.
- NOTE: D1 credential pools ≠ cross-vendor cap fix (fallback_providers already covers that).

## Execution order (when Fritz is back)
1. Quiesce gateway + any loops (safe edit window).
2. TRACK 1 backends (per gap) → TRACK 2 screen on top, gate+commit each.
3. H9 Chat parity (Fritz reviews) interleaved.
4. TRACK 3 Agent OS port (focused serial gated run, Fritz reviews UI).
5. TRACK 4 adopt plumbing (attended, additive, backups).
6. Final: full vision sweep + packaged-app verify in the real window → DONE.

## Why not unattended-now
Adopt + backend edits collide with the LIVE gateway (config is mtime-cached, not snapshotted); design-sensitive Chat + Agent-OS UI need Fritz's eyes (repeated corrections this session); free/Gemini swarm thrashes on render-spine UI (proven). Proven path = Claude builds, serial, gated, ATTENDED for the main-process/config parts.