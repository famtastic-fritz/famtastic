---
title: External Research Scan — memory, skills, command-center, code-intel (2026-05-30)
date: 2026-05-30
author: claude-code (Fritz session)
tags:
- research
- reuse-before-build
- memory
- skills
- kanban
- command-center
- shay-roadmap
permalink: shay-memory/learnings/external-research-scan-2026-05-30
---

# Reuse-before-build scan — projects evaluated 2026-05-30

Recurring lesson tonight: mature OSS keeps turning out to be the productized
version of things we hand-build. Captured here so Shay's brain has it and we
ADOPT instead of rebuild. Verdicts: ADOPT / SPIKE / STEAL-CONCEPT / SKIP.

## Command center / control plane
- **TechBran/blackbox-poc** (proprietary, study-only) — **the working blueprint
  of the whole Shay desktop+phone vision.** Self-hosted FastAPI command center,
  9 concepts to steal CONCEPTUALLY:
  1. Snapshot ledger — append-only `SNAPSHOT_VOLUME.txt` w/ byte-offset index +
     3072-dim embeddings; 3 retrieval modes (recent / keyword / semantic). 6,600+
     snapshots, no perf loss. → Shay memory substrate pattern.
  2. Operator profiles — per-user log/embeddings/prefs (TTS voice, model).
  3. Local Portal command center — streaming chat, voice, per-message reasoning,
     system mgmt at localhost / over Tailscale. → the Shay desktop IS this.
  4. MCP memory tools — stdio MCP exposing search_snapshots/get_snapshot/
     mint_snapshot to ALL CLI agents. → exactly the agentmemory/honcho direction.
  5. CLI agents embedded in UI — real tmux sessions streamed as PTY bytes over
     WebSocket (PtyBridge), persist across restarts, auto-fullscreen TUI.
  6. Android remote — QR pair + Tailscale HTTPS + WebView + Termux terminals.
     → native upgrade path for the Shay phone PWA.
  7. Update+rollback — atomic `git reset --hard origin/main`, tag pre-update
     commit, idempotent install blocks, poll /health. → Shay's own update story.
  8. Apps/sub-app launcher — register any local web service → reverse-proxy at
     /app-proxy/<port>/, survives updates (gitignored Apps/).
  9. **Multi-provider tool registry** — 72 tools defined ONCE, formatted per
     provider (Anthropic input_schema / OpenAI parameters / Gemini / MCP). All
     surfaces (chat/voice/ComputerUse/CLI) share it. → **highest-value steal**;
     Shay's BrainChain+tools should adopt this exact one-registry-N-schemas shape.
  Stack: Python3.9+/FastAPI, vanilla JS, Kotlin Android, Tauri launcher, Asterisk.

## Memory (3 candidates — single-user personal agent)
- **plastic-labs/honcho** (AGPL-3.0, FastAPI+Postgres/pgvector) — **reasoning-first
  memory that models the USER** (theory-of-mind: what peer A knows about peer B).
  Store→Reason(bg)→Query→Inject. For a personal agent modeling Fritz over time
  this may be MORE on-point than the others. ⚠ AGPL copyleft — licensing check
  before embedding. VERDICT: SPIKE (user-model layer).
- **rohitg00/agentmemory** (TS/Node + iii-engine Rust) — 4-tier (working/episodic/
  semantic/procedural), hybrid BM25+vector+graph, 53 MCP tools, **~92% fewer
  tokens** vs vector-only → directly attacks the Claude weekly-cap burn. VERDICT:
  SPIKE (brain-side MCP recall).
- **vectorize-io/hindsight** (Python-first, embedded mode, Postgres) — World/
  Experiences/MentalModels + Retain/Recall/Reflect, SOTA long-term-memory bench.
  Pipeline-side: build_app could call Reflect on every run. VERDICT: SPIKE.
- Free now (no dep): relabel tonight's loop in Retain/Recall/Reflect terms
  (capture_planning_lesson=Retain, search_prior_art=Recall, add periodic Reflect).

## Skills
- **zjunlp/SkillNet** (Python, PyPI `skillnet-ai`, MCP, 500+ skills) — "npm for
  AI skills": search / install / **auto-create from repos/PDFs/logs** / evaluate
  (Safety·Completeness·Executability·Maintainability·Cost) / analyze relationships
  (similar_to/compose_with/depend_on). Integrates Claude Code/Codex/OpenClaw.
  → serves the "mint 4 skills" goal AND gives a publish/pull registry + a
  stealable 5-dim grading rubric. VERDICT: ADOPT for skill minting/eval.

## Knowledge base / vault
- **ar9av/obsidian-wiki** (Python, pip/npm, markdown skill-files) — **directly
  usable.** Karpathy LLM-wiki pattern over an Obsidian vault: Ingest→Extract→
  Merge→Maintain, delta tracking via .manifest.json, **multi-agent history mining
  (explicitly supports Hermes/OpenClaw/Claude/Pi sessions)**, wikilink coherence,
  optional semantic search. Shay's memory IS an Obsidian vault. Designed for this
  use → avoids the basic-memory file-mutation problem (buglog #207). VERDICT:
  ADOPT to distill Shay's session logs into a coherent deduped wiki.

## Code intelligence (earlier tonight)
- **Lum1104/Understand-Anything** — tree-sitter structural pass + 6 LLM agents →
  committable code knowledge-graph JSON. Steal: structural-prepass (cut brain
  tokens) + graph-as-context. ≈ our .wolf/anatomy, productized.
- **Hermes Kanban** (in Shay's own fork) — durable SQLite task board w/ dispatcher,
  dependency graphs, audit trail, worktree isolation, dashboard. ≈ our ralph
  prd.json loop. NOTE: the desktop ALREADY has the full kanban* IPC family wired.
  VERDICT: ADOPT as the build-queue substrate (next architectural upgrade).

## Synthesis — adoption order (independent tracks, can parallelize)
1. blackbox multi-provider tool-registry pattern (refactor, high value, low risk)
2. obsidian-wiki (vault hygiene; ADOPT — own track)
3. SkillNet (skill minting/eval; ADOPT — own track)
4. Memory SPIKE: honcho (user-model) + agentmemory (token-cut MCP) + hindsight
   (pipeline Reflect) — sequence these, do NOT swap memory backends in parallel
   (basic-memory mutation lesson, buglog #207).
5. Hermes Kanban as queue substrate (the desktop already has the IPC).