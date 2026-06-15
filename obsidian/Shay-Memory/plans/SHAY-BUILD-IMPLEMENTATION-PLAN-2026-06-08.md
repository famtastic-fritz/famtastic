---
title: Shay Platform — Autonomous Swarm Implementation Plan
date: 2026-06-08
author: claude
source: directive
confidence: hypothesis
status: proposal
tags:
- implementation
- swarm
- autonomous
- build-plan
- anatomy
- ingestion
- cost-routing
permalink: shay-memory/plans/shay-build-implementation-plan-2026-06-08
---

# Shay Platform — Autonomous Swarm Implementation Plan

> **Note from Claude:** Fritz asked me to send this to you, Shay. This is *my* full implementation
> plan to build the new platform autonomously and as cheaply as possible, using dynamic cost-routed
> swarms — formatted the way you'd run it (modular build-specs via `brain-to-build`, anatomy naming,
> provenance, dispatch-planner flow). `confidence: hypothesis` — yours to accept/adjust.

## Operating principles (inherited from your doctrine)
- **Orchestration over execution.** Shay/Brain never writes code directly — she decomposes, dispatches, verifies. Each build-spec is a seed.
- **Modular, not monolithic.** Every unit is an independently callable build-spec with acceptance criteria. `research → plan → build` are separate modules.
- **Brain is the handoff medium.** Specs live in `~/basic-memory/builds/`; workers read + execute + report. Avoids the orchestrator's context-freeze.
- **Cost: $0-first.** Local Ollama and the flat GLM lane are free at the margin; metered (Claude/Codex) only for high-stakes verification. Never a metered/free-capped default (the 429 lesson).
- **Verify by a different actor + different model** (the same-model-review-is-theater lesson).

---

## The swarm: roles + cost routing (the AGENT-REGISTRY this plan assumes)

| Role | Model / lane | Cost | Used for |
|---|---|---|---|
| **Orchestrator (Brain)** | GLM-5.1 (flat sub) via gateway | $0 marginal | decompose, dispatch, verify-summary, drive-to-done |
| **Bulk worker pool** | local Ollama `qwen3:14b` (coder) | $0 | the implementation build-specs (parallel) |
| **Aux pool** | local Ollama (`gemma4`, `qwen3`) | $0 | summarize / classify / decompose / docs |
| **Reviewer (adversarial)** | a *different* lane than the author (GLM↔Codex↔Claude) | metered, 1×/artifact | DoD gate + refute pass |
| **Decisive escalation** | Claude / Codex | metered, rare | blocking architecture calls only |

**Dynamic scaling rule:** per phase, spawn `min(#independent build-specs, concurrency_cap, budget_remaining/spec_cost)` workers. Bulk work runs local (free) so the cap is CPU, not dollars. Metered spend is bounded to one reviewer per artifact + escalations.

---

## The autonomy loop (how each phase self-drives to done)

```
for each PHASE:
  1. Orchestrator reads phase goal from brain
  2. DECOMPOSE → N build-specs → write to ~/basic-memory/builds/{phase}/{spec}.md
     (provenance + file tree + module contract + acceptance criteria + constraints)
  3. CHECK capability/gap (Capability Engine) → log any gaps
  4. DISPATCH swarm: each spec → cost-routed worker (local first) reads spec, builds, reports
  5. GATE (The Doctor / DoD): typecheck + build + contract-check + render + reachability
        — run by a DIFFERENT actor than the author
  6. ADVERSARIAL REVIEW: different model tries to refute; ≥majority refute → reject
  7. fail → post-mortem + re-dispatch (max 2 retries) ;  pass → mark complete + update LOCKED.json
  8. COMPLETENESS CRITIC: "what's missing?" → feeds next round
  9. loop until phase gates green
ESCALATE to Fritz only on: a blocking decision, or 3 consecutive failures on one spec.
```

This is a bounded ralph loop per phase — autonomous, but it stops and asks on genuine blockers instead of spinning.

---

## Blocking decisions (gates before the dependent phases — orchestrator pauses for Fritz)
1. **Git topology** of the new repo vs `shay-shay` (absorb vs separate+socket) — gates Phase 0.
2. **Schema authority format** (JSON Schema → gen Zod+Pydantic) — gates Phase 1.
3. **Memory store** (embedded sqlite-vec vs managed) + re-embedding policy — gates Phase 2.
4. **`state.db` migration window** (read-through fallback) — gates Phase 2.

---

## The build: anatomy → architecture, in dependency order

Naming maps your anatomy to the architecture layers:

| Anatomy | System |
|---|---|
| **Spine** | Kernel — contracts, schema registry, event bus, capability registry, config/identity, vault |
| **Heart** | Memory Fabric — memory-as-a-service, tiered, decay, validity windows; + SOUL/identity |
| **Brain** | Orchestrator + Brain Router (single brain, cost routing, REQ-14 long-running resume) + Dispatch Planner + Anticipation Engine |
| **Digestive** | Ingestion Protocol — 4-stage (decompose → normalize → register → verify) + facet/skill adapters |
| **Senses** | External Bridge (MCP + A2A + OASF) + Release Radar |
| **Immune** | The Doctor — self-diagnostic, DoD gates, authority/permission tiers, ingestion conformance |
| **Organs** | Capabilities/Studios (Site/Media/Email/Idea) — pluggable via the contract |
| **Skin** | Surfaces — desktop/web/phone/CLI as thin gateway clients |

### Phase 0 — Harness & Foundation *(build the machine that builds)*
Goal: the autonomous swarm harness itself + clean repo scaffold.
- Build-specs (parallel): repo scaffold (anatomy dirs) · provenance tooling · `brain-to-build` runner · **swarm orchestrator + cost-routed worker pool** · The Doctor *skeleton* (gate runner) · LOCKED.json + divergence check.
- Gate: harness can dispatch a trivial spec end-to-end and verify it. Swarm: small (orchestrator + 2 local workers).

### Phase 1 — Spine (Kernel) *[needs 0; decision #2]*
- Build-specs: contract/schema registry (one neutral schema → gen validators) · event bus (append-only) · config/identity (`getActiveContext()` single SoT) · credential vault · capability-registry interface.
- Gate: any component can validate I/O + emit events. Swarm: ~5 local workers ∥, 1 reviewer.

### Phase 2 — Heart (Memory Fabric) *[needs 1; decisions #3, #4]*
- Build-specs: Memory API · canonical store (tiered T0–T3, decay, validity windows) · **write-shims (legacy stores read-only day 1)** · ingestion adapters for `.brain/`/`memory/`/vault · `state.db` read-through migration.
- Gate: a fact written once is readable from every surface; Shay functions throughout. Swarm: ~5 local ∥, 1 reviewer.

### Phase 3 — Brain (Orchestrator + Router) *[needs 1]*
- Build-specs: Brain Router (subscription-first, cap-aware, **REQ-14 checkpointed resume — no fallback-because-long**) · Dispatch Planner (decompose→check→select→log-gaps→dispatch) · agent loop · context-budget manager · Anticipation Engine (v1: observe→anticipate→confirm, authority-gated).
- Gate: a long task completes via resume; routing is the only path. Swarm: ~5 ∥, 1 reviewer.

### Phase 4 — Digestive (Ingestion Protocol) *[needs 1,2,3]* — **the core product**
- Build-specs: 4-stage pipeline (decompose → normalize → register → **verify**) · facet adapters (capabilities/skills/knowledge/memory/surfaces/routing) · **skill normalizer** (Claude/Codex/SKILL.md → internal, with tool-ref remapping) · ingestion conformance test · versioned/idempotent re-ingestion.
- **Ingestion run #1 = Hermes** (agent) + Hermes-desktop (surface). Gate: every claimed capability invocable + every skill runs + conformance report. Swarm: ~6 ∥, 2 reviewers (it's the keystone).

### Phase 5 — Senses (External Bridge + Release Radar) *[needs 4]*
- Build-specs: MCP (tool ingestion) · A2A (agent ingestion/coordination) · OASF (capability discovery) · **Release Radar** (watch upstreams → classify → link-to-ingested-system → "re-ingest" signal → digest).
- Gate: ingest a second external tool *through* MCP; a simulated upstream release fires a re-ingest signal. Swarm: ~4 ∥, 1 reviewer.

### Phase 6 — Immune (The Doctor, full) *[cross-cuts; skeleton from 0]*
- Build-specs: continuous self-diagnostic (`shay doctor {memory,agents,connectors,ingestion}`) · DoD gate (full) · **authority/permission tiers 0–4 for ingested capabilities** (sandbox by default) · orphaned-record + config-mismatch checks (would've caught the `glm-5.1`→Gemini 404).
- Gate: Doctor flags a seeded fault in each subsystem. Swarm: ~4 ∥, 1 reviewer.

### Phase 7 — Organs (Capabilities/Studios) *[needs 1,4]*
- Build-specs: register Site Studio via the contract · promote `site_bridge.py` to a first-class capability · 1 more studio (Email or Media).
- Gate: Shay invokes a studio through the contract (not raw shell). Swarm: ~4 ∥, 1 reviewer.

### Phase 8 — Skin (Surfaces) *[needs 3]*
- Build-specs: desktop (Electron) · web · phone · CLI — all thin gateway clients, zero brain/memory logic.
- Gate: every surface drives the same gateway; no duplicate brains. Swarm: ~4 ∥, 1 reviewer.

### Phase 9 — Consolidation & Cutover *[needs all]*
- Build-specs: retire migrated legacy silos · repo hygiene · collapse dueling docs to one SoT · full Doctor sweep · cutover from old gateway.
- Gate: Doctor green across all subsystems; old stack retired. Swarm: ~3 ∥, 2 reviewers.

---

## Cost posture (summary)
- ~90% of build work runs on **local Ollama = $0**. Orchestration on **flat GLM = $0 marginal**.
- Metered spend = **one adversarial reviewer per artifact + rare escalations** — bounded and predictable, not per-token-anxiety.
- Per-phase **token/$ budget cap**; the loop scales worker count to the budget and `log()`s anything it drops (no silent truncation).

## What I need from you, Shay (and Fritz)
1. Resolve the 4 blocking decisions (gates above).
2. Confirm the AGENT-REGISTRY lanes/costs match your `capability-engine/AGENT-REGISTRY.yaml`.
3. Say go on Phase 0 (the harness) — once it exists, Phases 1→9 are largely autonomous with escalation-only stops.

— Claude (relaying for Fritz)