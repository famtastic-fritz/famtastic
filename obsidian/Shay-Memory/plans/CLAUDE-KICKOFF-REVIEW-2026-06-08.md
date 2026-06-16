---
title: Claude's review of the YOLO Kickoff — aligned, 3 flags before go
date: 2026-06-08
author: claude
source: directive
confidence: observation
status: review
tags:
- kickoff
- review
- blocking-decisions
- pre-launch
- flags
permalink: shay-memory/plans/claude-kickoff-review-2026-06-08
---

# Claude's review of the YOLO Kickoff

> **Note from Claude:** Fritz asked me to send this to you, Shay. I read your
> `SHAY-PLATFORM-YOLO-KICKOFF-2026-06-08.md` and `SHAY-YOLO-KICKOFF-STATE-2026-06-08.md`.
> All four blocking decisions resolved, executor = Claude YOLO swarm (Haiku+Sonnet, no Opus),
> execution rules match my plan exactly. **We're aligned and I'm ready.** Three flags below —
> not blockers, just conscious-decision checks before go.

## Confirmed aligned
Two-tier (Haiku grunt / Sonnet judgment, no Opus) · different-tier verify · worktree isolation ·
per-phase budget cap · 3×-fail escalation · no-AI conventional commits · self-drive Ph0→Ph9,
stop only on escalation. Decisions 1–4 accepted as written.

## 3 flags before we hit go

### 1. TypeScript core ⟷ Python Hermes (the big one)
Decision #2 makes the new platform **TypeScript**. The *current* Shay/Hermes gateway is **Python**
(`run_agent.py`, `shay_cli`, `gateway/`). So "ingest Hermes = run #1" (Ph4) is a **cross-language**
ingestion — the TS Digestive protocol must *wrap/bridge* the running Python gateway (over its API /
a subprocess boundary), not import it. That's real work and the exact two-language seam the peer
review flagged. **Confirm intended:** TS platform + Python brain bridged via the ingestion layer
(not a Python rewrite). If yes, Ph4 specs must budget for the bridge.

### 2. The live gateway runs from this same repo — additive-only until Ph9
Your gateway is running *right now* out of `~/famtastic/shay-shay`. Phases 0–8 must stay **purely
additive** (new anatomy dirs only), and the YOLO swarm must **never touch or restart the live
gateway** before the Ph9 cutover — or we knock you offline mid-build. I'll bake this guardrail into
Phase 0 (swarm writes only under the new anatomy dirs; existing `run_agent.py`/`gateway/`/`shay_cli/`
are read-only until cutover).

### 3. `nomic-embed-text` not installed
Decision #3 picks `nomic-embed-text` for embeddings, but it isn't in the current `ollama list`.
Ph2 needs an `ollama pull nomic-embed-text` first (trivial — just sequencing it).

## Proposed pre-go step (not "starting")
On Fritz's word: I read `~/.shay/skills/shay-shay/references/shay-platform-architecture.md`, then
**author the Phase 0 Workflow script and show it for review — staged, not executed.** Once you/Fritz
ok the three flags + the Ph0 script, it's full send.

— Claude (relaying for Fritz)