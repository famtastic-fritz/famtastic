---
title: All-Night Arc — End-of-Arc Decisions Report (greenlight needed)
date: 2026-05-31
author: claude-code
tags:
- arc
- decisions
- phase3
- greenlight
- guards
permalink: shay-memory/plans/arc-decisions-2026-05-31
---

# End-of-Arc Decisions Report

The autonomous arc ran to a clean checkpoint. Deferred-per-directive: the Phase 3
tracks that need **installs** or **vault mutation** are NOT run unattended — each
is listed below with its exact next action + the guard it requires. Greenlight any
by name and I'll execute it with the stated guard.

## ✅ Done autonomously tonight (no decision needed)
- Desktop **20/20** units — app launches, IPC bridge alive, typecheck+build green.
- Phase 0 loop hygiene; Phase 1A/1B repair; Phase 2 launch test (2 latent runtime
  bugs fixed); 7 review fixes; path-doubling fix.
- Monitoring: `/api/arc` feed + arc.html + Telegram + **Web Push** (installable Android PWA).
- **Phase 3A — multi-provider tool registry** (define once → anthropic/openai/gemini/mcp). Built + smoke-tested.
- Companion research (clone+exceed mandate) + capability backlog recorded.

## ⏸ Awaiting greenlight — Phase 3 tracks (with guards)

### 3A.next — wire registry into BrainChain (LOW risk, no install)
Action: have BrainChain pull tool schemas from `tools.registry` per active provider
+ route tool-call results back through `registry.invoke`. Guard: smoke that one tool
round-trips through 2 providers live. → Safe to just do; flagged only because it
touches the brain hot path.

### 3B — Kanban SQLite substrate (LOW risk, no install; Hermes fork has it)
Action: replace `.ralph/prd.json` queue with the fork's SQLite Kanban; the desktop
already has the `kanban*` IPC. Guard: verify bidirectional read/write before any
loop re-run; ABORT if it would desync the queue. No external dep.

### 3C — obsidian-wiki (MED risk — VAULT MUTATION; pip install)
Action: `pip install` + run Ingest/Extract/Merge/Maintain over the vault to distill
session logs into a deduped wiki. Guards (MANDATORY): hash-baseline every hand-
authored .md before/after (buglog #207 — basic-memory once mutated files); write
ONLY to a separate generated namespace; cost dry-run on a bounded batch first;
run with ANTHROPIC_API_KEY absent from env (egress guard).

### 3D — SkillNet + mint 4 skills (MED risk — pip install)
Action: `pip install skillnet-ai`; run `analyze` OFFLINE to build the skill
relationship graph; mint micro-patch-living-file / render-spine-guard /
structural-prepass / code-graph-context. Guard: pinned commit, key-absent env,
no two-sources-of-truth (skill calls the pipeline helper, or replaces it with a
fixture-gate). Pairs with the SKILLS-disclosure design (find_skill + profiles).

### 3E — Memory spike (HIGHEST risk — installs + external stores; SEQUENCE, never parallel)
Order: agentmemory (92% token cut, MCP) → hindsight (Retain/Recall/Reflect, pipeline)
→ honcho (AGPL — license review FIRST; user-model). Guards (per candidate):
vault hash-baseline before/after; measure real token delta on a fixed transcript;
GO only if net reduction AND zero vault mutation; teardown the external vector
store + kill orphan processes BEFORE the next candidate. Do NOT swap backends in parallel.

## 📱 Companion app (Fritz's near-term wants — from capability backlog)
- **Brief-reader tab** (NEAR-TERM, low risk): read vault briefs on phone → [Make Todo]
  [Deeper Research] [Dispatch Job] [Archive]. Closes the "research with no reader" gap.
- **Web Push + install** — DONE tonight (activate by opening the PWA on the phone).
- **Phone-side device control** — V2 (native Android app + permissions).
- **Agent identity + credentials** — V2/V3, guards-first (dedicated email + keychain
  vault + key rotation = safe slice; autonomous spend = last, with budget cap +
  allowlist + approval gate + virtual cards + audit + kill switch).

## Recommended greenlight order
1. 3A.next (BrainChain wiring) + Brief-reader tab — low risk, immediate value.
2. 3B Kanban substrate — low risk, no install.
3. 3D SkillNet (offline) — needed for the skills-disclosure upgrade.
4. 3C obsidian-wiki — vault hygiene, guarded.
5. 3E memory spike — last, most guarded, sequenced.