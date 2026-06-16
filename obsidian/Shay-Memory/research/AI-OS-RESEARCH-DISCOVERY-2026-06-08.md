---
title: AI OS Research Discovery — ChatGPT Session Reference
date: 2026-06-08
author: shay
source: ingestion:chatgpt-session
confidence: observation
status: reference
tags:
- research
- ai-os
- agents
- memory
- repos
- github
- reference
streams:
- research
- shay-platform
permalink: shay-memory/research/ai-os-research-discovery-2026-06-08
---

# AI OS Research Discovery — External Session Reference

**Source:** ChatGPT session (not tied to FAMtastic repo)
**Date of session:** ~May 2026
**Ingested:** 2026-06-08 by Shay
**Purpose:** Capture all repos and concepts from a research session Fritz had with ChatGPT about building an AI Operating System architecture.

## Shay's Assessment (2026-06-08)

**Signal:** Page Agent, TencentDB memory tiering concept, RTK token compression concept.
**Noise for now:** Everything else is interesting but does not change Ph0→Ph9 build plan.
**Timing:** None of this blocks or alters the Claude YOLO build. Research feeds into Ph5 (Senses), Ph7 (Organs), Ph8 (Skin) evaluation.
**Warning:** ChatGPT rated everything 10/10 — that's amplification, not analysis. Prioritize Page Agent > Tencent concept > RTK concept > rest.

---

## Tier 1 — High Signal (Evaluate During Relevant Build Phase)

### Page Agent (Alibaba)
- **Repo:** https://github.com/nicepkg/page-agent
- **What:** AI agent that lives inside the webpage DOM. No Selenium/Puppeteer/vision model. Reads HTML structure, reasons about elements, takes actions.
- **Why it matters:** For Ph8 (Skin), natural language UI interaction instead of menus. "Deploy to staging" → Page Agent executes. "Show incomplete tasks" → Page Agent queries and renders.
- **Architecture shift:** DOM-based (fast, cheap, reliable) vs Screenshot→Vision→Guess (slow, expensive, flaky).
- **Shay questions to evaluate:**
  - Can it be embedded in an Electron app?
  - Can it control React-generated workflows?
  - Can it automate Drupal admin interfaces?
  - Can it become the front-end action layer for the Shay desktop?
- **Build phase target:** Ph5 (Senses) for evaluation, Ph8 (Skin) for integration.

### TencentDB Agent Memory
- **Repo:** https://github.com/Tencent/TencentDB-Agent-Memory
- **What:** Memory tiering architecture: L0 (Raw Data) → L1 (Facts) → L2 (Experiences) → L3 (Persona)
- **Why it matters:** The tiering MODEL is useful for our Heart (Ph2) memory fabric design. Not adopting the code — borrowing the concept.
- **Build phase target:** Ph2 (Heart) — inform memory tier design.

### RTK
- **Repo:** https://github.com/nicepkg/rtk
- **What:** Compress terminal output, reduce token waste.
- **Why it matters:** Immediate workflow improvement potential for long-running sessions. Concept worth studying, tool worth evaluating as a skill.
- **Build phase target:** Ongoing — evaluate as a standalone skill anytime.

---

## Tier 2 — Monitor (Re-evaluate at Ph5/Ph8)

### OpenSwarm
- **Repo:** https://github.com/nicepkg/open-swarm
- **What:** Multi-agent orchestration with specialist roles. "The fully open-source multi-agent system that does everything Claude Code can't."
- **Shay assessment:** Overlaps heavily with our dispatch planner skill and Brain (Ph3) router. The "specialist agents coordinated by orchestrator" pattern is already our architecture. Don't adopt the framework — we're building our own.
- **Useful concept:** Deliverable-oriented workflows (pitch decks, reports, images from a single request).

### ChatdollKit
- **Repo:** https://github.com/nicepkg/chatdollkit
- **What:** Unity-based 3D avatar + voice + LLM + animations + facial expressions.
- **Shay assessment:** Cool vision but Unity-based and we're Electron. V2/v3 territory. The "floating AI assistant" concept informs Ph8 (Skin) UI design direction.
- **Build phase target:** Post-Ph8 visual design exploration.

### TurboVec
- **Repo:** https://github.com/nicepkg/turbovec
- **What:** Compressed vector memory, fast retrieval, local-first.
- **Shay assessment:** We're using Ollama nomic-embed-text. Could evaluate if we hit scale issues. Not now.

### RLM-RS
- **Repo:** https://github.com/nicepkg/rlm-rs
- **What:** Rust-based recursive reasoning for large repositories.
- **Shay assessment:** Different language (Rust vs our TypeScript). The concept of recursive repo analysis is interesting. Not a dependency.

---

## Tier 3 — Reference Only

| Repo | What | Notes |
|------|------|-------|
| Google Always-On Memory Agent | Nightly reflection/consolidation | Concept overlaps with our self-learning loop |
| AutoResearchClaw | Autonomous research organization | Interesting for future research subsystem |
| 7 Skills Workflow | Workflow orchestration patterns | Study patterns, don't adopt framework |
| Andrej Karpathy Skills | Behavioral rules for agents | Reference for skill design |
| Pi Agent | Agent runtime, Hermes alternative | We're past the Hermes vs Pi decision — building our own |
| Token Optimizer | Ghost token removal, context hygiene | Overlaps with RTK concept |
| AutoLoop | Worker → Verify → Retry loop | We have this pattern in kanban already |
| Ralph-RLM | Failure recovery, file-based memory | Concepts worth studying |
| Codebuff | Multi-agent coding | Claude Code competitor, not relevant |
| CasaOS | Self-hosted AI infrastructure | For Hetzner box, not platform code |
| PM2 | Service orchestration | Already in our stack |
| Laguna XS.2 | Coding-specialized model | Future worker model candidate |
| Nemotron 3 Super | Long-context reasoning model | Future model candidate |
| Command A+ | Enterprise agent model | Future model candidate |
| MiniCPM | Edge AI, vision, audio, mobile | Future model candidate |

---

## Vision Architecture (North Star — NOT Build Plan)

The session landed on a grand stack:
```
Page Agent (UI) → OpenSwarm/Hermes (Orchestration) → RTK (Context) → RLM (Scaling) 
→ Tencent Memory (Identity) → TurboVec (Storage) → Models (Execution)
```

Plus a 3D UI vision:
```
Page Agent + React + Three.js/React Three Fiber + ChatdollKit Avatar + Hermes Backend
= 3D AI Operating System
```

**Shay note:** This is a vision, not an architecture. 10+ repos from different companies, different languages, different licenses, zero proven integration. Keep as north star for Ph8+ design exploration. Do NOT try to bolt these together as a build plan.

---

## Glassmorphism Studio Concept

Not a repo — a UI direction from the session:
- Dark theme, glass panels, floating assistant
- Agent dashboard, 3D cards, animated surfaces
- Translucent panels, glowing buttons, hover animations

**Shay note:** This is a visual direction, not a technology. When we hit Ph8 (Skin), this informs the design language. Not actionable now.

---

## Research Rule (Fritz Directive 2026-06-08)

> "We need to start tracking and keeping references to GitHub repos as a rule."

**Implementation:** Every research session that surfaces GitHub repos gets captured to the brain with:
1. Repo URL
2. What it does (one line)
3. Why it matters for FAMtastic (or why it doesn't)
4. Tier classification (evaluate now / monitor / reference only)
5. Build phase target (if applicable)

This document is the template for that format.