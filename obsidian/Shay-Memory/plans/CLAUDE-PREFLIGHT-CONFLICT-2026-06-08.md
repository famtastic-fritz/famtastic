---
title: Pre-flight conflict — kickoff vs architecture reference (must resolve before
  Phase 0)
date: 2026-06-08
author: claude
source: directive
confidence: observation
status: blocker
tags:
- kickoff
- conflict
- pre-launch
- anatomy
- phases
- blocker
- source-of-truth
permalink: shay-memory/plans/claude-preflight-conflict-2026-06-08
---

# Pre-flight conflict — resolve before Phase 0 scaffolds

> **Note from Claude:** Fritz asked me to send this to you, Shay. I read the architecture
> reference at `~/.shay/skills/autonomous-ai-agents/shay-shay/references/shay-platform-architecture.md`
> (kickoff had a slightly wrong path — found it). It's solid and answers my 3 flags. **But it
> conflicts with the kickoff spec on the structure Phase 0 has to bake in.** One reconciliation
> needed, then it's full send. Not scaffolding until you pick.

## Confirmed good (flags answered)
- **TypeScript monorepo** confirmed (`@shay/*` packages).
- **Flag #1 (TS↔Python):** answered — Hermes is *bridged*, not rewritten, via the Ingestion Protocol (DISCOVER→TRANSLATE→INGEST→VERIFY) with a Skill Adapter per foreign format.
- **Flag #2 (live-gateway guardrail):** I'll bake additive-only + no-restart-until-Ph9 into Phase 0.
- **Flag #3 (`nomic-embed-text`):** sequence an `ollama pull` in the memory phase.

## The conflict (kickoff spec vs architecture reference)

| Dimension | `SHAY-PLATFORM-YOLO-KICKOFF` | `shay-platform-architecture.md` |
|---|---|---|
| Root structure | 8 anatomy dirs: `Brain/ Spine/ Heart/ Digestive/ Senses/ Immune/ Organs/ Skin/` | 9 packages: `@shay/{core,brain,memory,capabilities,doctor,ingestion,bridge,anticipation,surfaces}` |
| "Heart" means | **Memory Fabric** | **Authority/Permissions (trust tiers 0–4)** |
| Memory lives in | `Heart/` | **"Nervous System"** (`@shay/memory`) |
| Anticipation | folded into Brain (Ph3) | its own package `@shay/anticipation` |
| External Bridge | under `Senses/` | under ORGANS (`@shay/bridge`) + Senses = Release Monitor |
| Phase plan | 10 phases (0 Harness→9 Consolidation; Doctor=Ph6, Ingestion=Ph4) | 11 phases (0 Kernel, **0.5 Doctor+Ingestion early**, 1 Memory, 2 Brain, 5 Hermes, 8 Release Monitor) |

Phase 0 creates the directory/package skeleton that everything imports from. If the two docs
disagree, I scaffold the wrong tree — and renaming later churns every phase. This is the exact
"dueling sources of truth / locked-vs-working divergence" failure class from `.wolf/buglog`.

## Decision needed (one pick)
**Which is canonical for structure — the kickoff's 8 anatomy dirs, or the architecture reference's
9 `@shay/*` packages?** (And confirm "Heart" = Authority vs Memory.)

**Claude's recommendation:** adopt the **architecture reference** as canonical for structure (9
`@shay/*` packages — it's the internally-consistent considered design, and keeps Shay's "point at
the body part" navigability with Heart=Authority / Nervous System=Memory). Keep the **kickoff's
dependency-correct phase order** (Spine → Memory → Brain → Ingestion …) rather than the arch ref's
looser ordering. Net: arch-ref *structure* + kickoff *sequence*.

Once you confirm the structure, Phase 0 is unambiguous and the swarm full-sends.

— Claude (relaying for Fritz)