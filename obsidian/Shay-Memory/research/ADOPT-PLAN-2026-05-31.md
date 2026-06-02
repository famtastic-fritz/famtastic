---
title: ADOPT-PLAN-2026-05-31
type: note
permalink: shay-memory/research/adopt-plan-2026-05-31
---

# ADOPT Plan — Shay-side plumbing (token-hygiene + memory + capabilities), 2026-05-31
Greenlit by Fritz. Distinct from the desktop renderer build. Run to completion AFTER adversarial review.

## A. Context-hygiene bundle (kills the cap-burn — highest ROI)
- A1 **caveman** skill — install; scope to WORKER lanes + commits + reviews + internal agent comms ONLY (NOT user-facing Shay chat). intensity=ultra for workers.
- A2 **homegrown "concise" skill** — a lightweight system directive for the USER-FACING chat: terse + readable (the readable counterpart to caveman; don't depend on the 1-star `concise` repo).
- A3 **rtk** — CLI proxy to compress tool/terminal output (Drush/composer/test/build).
- A4 **token-optimizer** — ghost-token removal / context-hygiene pass.
- A5 **/caveman-compress** our CLAUDE.md + SOUL.md + MEMORY.md (cuts every-call cost ~46%).

## B. Memory (Tencent L0→L3 over existing infra)
- B1 Adopt L0→L3 schema over basic-memory/Obsidian (L0 raw, L1 facts/NL-profile, L2 experiences, L3 persona/DNA).
- B2 **holographic** = the single chosen local-retrieval provider (enable it; it's installed).
- B3 Nightly **reflection/consolidation cron** that promotes L0→L1→L2 (formalize the existing learning loop).

## C. Plugins / MCP (keep active MCP <=6)
- C1 Enable bundled plugins: kanban-dashboard, observability/langfuse, holographic memory.
- C2 Add MCP P0: Context7, GitHub, Filesystem.

## D. Claim unused Hermes capabilities
- D1 **Credential pools** — multi-key same-provider rotation (fixes 'both vendors capped' before fallback).
- D2 **execute_code** programmatic tool-calling (token-saver).
- D3 **/goal** persistent loop (autonomous loop-until-done) — informed by ruflo's GOAP planner.
- D4 **shay mcp serve** — expose Shay to Claude Code + IDEs.
- D5 webhooks/event-hooks (event-driven vs cron-polling); daytona serverless build backend (eval).

## E. Mine ruflo patterns (don't adopt wholesale — Claude-Code-native, competes with Shay)
- E1 AgentDB + HNSW vector memory + SONA learning → feed the memory track (B).
- E2 GOAP goal planner → /goal loop (D3).
- E3 12 background workers (audit/test-gap/optimization) → a worker pattern Shay lacks.

## F. Discovery cron hardening
- F1 Add star/maturity FILTER to the 3-day model-discovery cron (don't chase 1-star noise).

## PARKED (not this run)
page-agent (EVALUATE — future shipped-site copilot), train-our-own-model (Mac-mini RAM), gemma4, Nous/Step-3.7, mobile app, PM2/CasaOS Mac-mini host (needs Mac-mini access).