---
title: Structure Resolution — Architecture Ref Structure + Kickoff Sequence
date: 2026-06-08
author: shay
source: directive
confidence: fact
status: resolved
tags:
- kickoff
- structure
- resolution
- canonical
- blocker-cleared
permalink: shay-memory/plans/shay-structure-resolution-2026-06-08
---

# Structure Resolution — Canonical Pick

**Decision by:** Shay (Shay-Shay)
**Resolves:** `CLAUDE-PREFLIGHT-CONFLICT-2026-06-08.md`

## The Pick

**Architecture reference structure + Kickoff phase sequence.**

Claude's recommendation was correct. Adopting it.

## Structure (from architecture reference)

9 `@shay/*` packages:

| Package | Anatomy | What It Is |
|---------|---------|-----------|
| `@shay/core` | Spine | Kernel: config, schemas, event bus, credential vault |
| `@shay/memory` | Nervous System | Memory Fabric: SQL facts, vectors, entity graph, tiered recall |
| `@shay/brain` | Brain | Brain Router: one routing authority, context budget, Anticipation Engine (cross-cutting, NOT separate package) |
| `@shay/ingestion` | Digestive System | Ingestion Protocol: DISCOVER→TRANSLATE→INGEST→VERIFY, Skill Adapter Layer |
| `@shay/doctor` | Immune System | The Doctor: continuous self-diagnostic, post-ingestion verification |
| `@shay/capabilities` | Organs | Capability Registry: internal capabilities register with manifest |
| `@shay/bridge` | Organs (external) | External Bridge: MCP client, A2A Agent Cards, OASF compatibility |
| `@shay/surfaces` | Skin | Thin clients: Desktop (Electron), phone (Telegram), web, CLI, MCP |
| `@shay/anticipation` | — | **NOT a package.** Cross-cutting concern inside `@shay/brain`. If it grows, spins out later. |

## Heart = Authority, NOT Memory

Heart is the trust/permissions system. 5 trust tiers (Observe→Suggest→Draft→Confirm→Auto). Newly ingested systems start at tier 1. Fritz controls all promotions manually.

Memory = Nervous System (`@shay/memory`). SQL for facts, vectors for semantic recall, entity graph for relationships. Tiered: T0→T3.

## Phase Sequence (from kickoff — dependency-correct)

| Phase | What Ships | Depends On |
|-------|-----------|------------|
| 0 | Kernel Skeleton (`@shay/core`) + Doctor stub (`@shay/doctor`) | — |
| 1 | Spine contracts: schema registry, event bus, vault | Phase 0 |
| 2 | Heart (Authority + trust tiers) + Nervous System (Memory Fabric MVP) | Phase 1 |
| 3 | Brain Router + Anticipation Engine v1 (inside brain) | Phase 2 |
| 4 | Digestive System (Ingestion Protocol) — Hermes = run #1 | Phases 0–3 |
| 5 | Organs (Capability Registry + External Bridge) | Phase 3 |
| 6 | Senses (Release Monitor) | Phase 0 |
| 7 | Immune full build (Doctor continuous diagnostic) | Phases 4–5 |
| 8 | Skin (Desktop/web/phone/CLI surfaces) | Phase 7 |
| 9 | Consolidation & Cutover | All phases |

## What Changed From Kickoff

- 8 anatomy dirs → 9 `@shay/*` packages (TS monorepo native)
- Heart = Authority/Permissions (not Memory)
- Memory = Nervous System (`@shay/memory`)
- Anticipation stays inside Brain (not separate package)
- External Bridge is under Organs (`@shay/bridge`), not Senses
- Senses = Release Monitor only

## What Did NOT Change

- TypeScript + JSON Schema validation
- Worktree isolation for parallel builds
- Haiku grunt / Sonnet judge / no Opus
- Different-tier verify
- Live gateway read-only until Ph9
- No AI references in commits
- YOLO mode — self-driving, escalation-only stops

## Status

**BLOCKER CLEARED. Claude has green light on Phase 0. Full send.**

— Shay