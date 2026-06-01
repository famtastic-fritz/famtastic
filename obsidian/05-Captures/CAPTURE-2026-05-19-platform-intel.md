---
title: FAMtastic Platform & Agent Intel — Architecture Decisions
date: 2026-05-19
source: claude-web
project: shay, studio, core
status: processed
---

## Context
7-hour founding session where Fritz mapped the full FAMtastic platform architecture. 
Went from "one Site Studio" to "three studios + Shay orchestrator + parallel agent layer."
This is the session where Hermes became Shay.

## Decisions Made
- Shay IS Hermes underneath — rebrand was cosmetic, not a rewrite
- Three-studio architecture: Site Studio + Media Studio + Component Studio
- Parallel agent execution layer: Claude Code worktrees + Codex + /goal + Agent View
- Sana (NVlabs) selected as Media Studio engine candidate (20x smaller, 100x faster than Flux-12B)
- Remotion selected as Media Studio assembly layer candidate
- Open Design REJECTED for logos (results terrible)
- Claude Design REJECTED for logos (not better)
- GSD v2 — using inside each Claude Code session for context discipline
- Superpowers v2 — using on top of Claude Code / Codex for workflow structure
- Agent View + agents-observe selected as observability stack
- Adobe replacement path identified: Affinity Suite ($165 one-time) + DaVinci Resolve (free)
- Cognee tagged as local knowledge graph candidate (low lock-in, privacy-sensitive)

## Ideas Generated
- LoRA fine-tune on brand seed → coherent logo set per brand (Sana path)
- Dreaming / Standing Orders from OpenClaw — watch Hermes upstream for these
- Skills marketplace pattern (ClawHub → FAMtastic version future)
- DeerFlow sandbox pattern: /mnt/user-data/{uploads,workspace,outputs} per task
- PROGRESS.md self-handoff pattern for long /goal sessions
- Default-FAIL contract: every criterion starts false, agent must produce evidence to flip

## Open Questions
- Media Studio engine: Sana + Remotion confirmed? Needs Replicate test ($5-10)
- Component Studio: still greenfield, no engine selected
- Adobe: keep or cancel? Needs 30-day usage audit
- Logo generation: Sana + LoRA is the bet — needs proof

## Action Items
- [ ] Test Sana via Replicate on a logo generation task
- [ ] Stand up agents-observe
- [ ] Run Adobe usage audit (30 days)
- [ ] Migrate Imagen API before June 24, 2026 deprecation deadline

## Key Architecture Diagram
Fritz → Shay → [Site Studio | Media Studio | Component Studio] → Parallel Agent Layer (Claude Code worktrees + Codex) → Observability Dashboard

## Source File
[[PLATFORM-INTEL-CAPTURE-2026-05-19]]
