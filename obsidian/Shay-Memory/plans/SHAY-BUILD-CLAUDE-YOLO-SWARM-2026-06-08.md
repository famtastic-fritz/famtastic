---
title: Shay Platform Build — Claude-Executor YOLO Swarm (Haiku + Sonnet, no Opus)
date: 2026-06-08
author: claude
source: directive
confidence: hypothesis
status: proposal
tags:
- implementation
- swarm
- claude
- haiku
- sonnet
- yolo
- autonomous
- no-opus
permalink: shay-memory/plans/shay-build-claude-yolo-swarm-2026-06-08
---

# Shay Platform Build — Claude-Executor YOLO Swarm

> **Note from Claude:** Fritz asked me to send this to you, Shay. Companion to
> `SHAY-BUILD-IMPLEMENTATION-PLAN-2026-06-08.md`. Same 10-phase anatomy build — but here the
> **executor is Claude Code's own multi-agent swarm**, cost-capped to **two tiers only:
> Haiku for grunt, Sonnet for judgment. ZERO Opus calls.** Run YOLO (high autonomy, minimal gating).
> `confidence: hypothesis`.

## Premise
- Builds the exact same target as the sibling plan (Spine→Heart→Brain→Digestive→Senses→Immune→Organs→Skin, phases 0–9). Only the **execution substrate** differs.
- Substrate = the Claude Code **Workflow tool** (deterministic JS orchestration that spawns model-routed subagents) + `Agent` worktree isolation.
- **No Opus, ever.** If a step seems to "need Opus" (hard, irreversible architecture), that is a signal to **escalate to Fritz as a blocking decision**, not to spend up a tier.

## Two-tier routing (the whole cost model)

| Tier | Model | Cost | Does |
|---|---|---|---|
| **Grunt** | **Haiku** | cheap, high-volume | scaffold files/dirs, boilerplate, mechanical edits, run typecheck/tests/build, inventory/search, generate docs from code, apply a spec's file list, formatting |
| **Judgment** | **Sonnet** | moderate, bounded | author build-specs (decompose phase→specs), in-spec design choices, **code review + adversarial refute (the gate)**, DoD pass/fail, resolve conflicts/ambiguity, synthesis, completeness critic |
| ~~Premium~~ | ~~Opus~~ | — | **not used** — would-be-Opus calls become Fritz escalations |

Rule of thumb: **Haiku makes it, Sonnet judges it.** Most calls are Haiku (cheap); Sonnet is reserved for decisions and the verify gate.

## Swarm mechanics (how the Workflow tool runs it)
- One **Workflow script per phase** (resumable via `resumeFromRunId`). Inside, `pipeline()` / `parallel()` fan work across build-specs.
- Per build-spec, the canonical chain:
  ```
  spec     = agent(decompose+spec,   {model:'sonnet'})                 // judgment
  build    = agent(implement spec,   {model:'haiku', isolation:'worktree'})  // grunt, isolated
  verdict  = agent(adversarial DoD,  {model:'sonnet'})                 // judgment, DIFFERENT tier than author
  → fail: retry build (≤2) or escalate ; pass: mark + LOCKED.json
  ```
- **`isolation:'worktree'`** on every Haiku builder so parallel workers can't clobber each other's files (they merge after verify).
- **Different-tier verify** satisfies the "never same author reviewing itself" lesson — Haiku built, Sonnet refutes.
- **Budget-scaled fan-out:** worker count per phase = `min(#specs, concurrency cap, budget.remaining/spec-cost)`; `log()` anything dropped (no silent truncation).
- **Completeness critic** (Sonnet) closes each phase: "what's missing?" → next round; loop-until-dry.

## YOLO autonomy posture
- Agents run in **high-autonomy mode** (accept-edits / sandboxed bypass) — they execute their build-spec end-to-end without per-step approval.
- **The only stops:** the 4 blocking decisions (below) and a spec that fails 3× → escalate to Fritz. Everything else self-drives.
- Worktrees keep YOLO parallel edits safe and reversible (auto-cleaned if unchanged).

## Blocking decisions (orchestrator pauses for Fritz)
Git topology (→Ph0) · schema authority format (→Ph1) · memory store + re-embedding (→Ph2) · `state.db` migration window (→Ph2).

## Phases (same anatomy; tier assignment per phase)
Each phase = Sonnet decomposes → Haiku swarm builds (worktree-isolated, parallel) → Sonnet gate+refute → loop.

- **Ph0 — Harness & Foundation:** Sonnet designs the per-phase Workflow template + Doctor-gate; Haiku scaffolds repo (anatomy dirs), provenance tooling, LOCKED.json.
- **Ph1 — Spine (Kernel):** Sonnet specs schema/contract registry + event bus + vault + capability-registry iface; Haiku implements; Sonnet verifies. *(decision #2)*
- **Ph2 — Heart (Memory Fabric):** specs for Memory API, tiered store, write-shims, `state.db` read-through. *(decisions #3,#4)*
- **Ph3 — Brain (Orchestrator+Router):** brain router (REQ-14 resume, no fallback-because-long), Dispatch Planner, Anticipation v1.
- **Ph4 — Digestive (Ingestion Protocol)** ← keystone: 4-stage (decompose→normalize→register→**verify**), facet adapters, **skill normalizer** (Claude/Codex/SKILL.md → internal + tool-ref remap). **Ingest Hermes = run #1.** (2 Sonnet reviewers here.)
- **Ph5 — Senses:** MCP + A2A + OASF + Release Radar.
- **Ph6 — Immune (The Doctor):** self-diagnostic, full DoD gate, authority tiers 0–4 for ingested code, config-mismatch checks.
- **Ph7 — Organs:** register Site Studio + promote `site_bridge` via the contract.
- **Ph8 — Skin:** desktop/web/phone/CLI as thin gateway clients.
- **Ph9 — Consolidation & cutover:** retire silos, one SoT, Doctor green, cut over.

## Cost posture
- ~80–90% of calls are **Haiku** (grunt) → low spend. **Sonnet** is bounded to one spec-author + one verify per artifact + the completeness critic. **No Opus** → no premium spend, predictable bill.
- Per-phase budget cap; fan-out scales to budget; resume between phases keeps cache warm and lets Fritz inspect between phases.

## How to launch (when go'd)
1. Resolve the 4 blocking decisions.
2. I author the Ph0 Workflow script (Sonnet template + Haiku scaffolders), run it, verify the harness end-to-end.
3. Each subsequent phase = one Workflow run, resumable; Fritz can inspect/approve between phases or let it roll.

## To start I need
- The 4 blocking decisions, and a **go on Phase 0**. Then it runs YOLO with escalation-only stops.

— Claude (relaying for Fritz)