# Hermes Agent Ecosystem: Deep Reverse Engineering Report

Source: https://github.com/0xNyk/awesome-hermes-agent
Last reviewed: 2026-05-27

## 1. Ecosystem Overview

The awesome-hermes-agent list catalogs ~100 repos across 8 major categories. Hermes Agent v0.12.0 (The Curator Release) is the core: a self-improving agent with 134k+ stars, 18 messaging platforms, 7 terminal backends (local/Docker/SSH/Singularity/Modal/Daytona/Vercel Sandbox), MCP integration, pluggable transports (Anthropic/ChatCompletions/Responses API/Bedrock), cron scheduling, and autonomous skill curation via `hermes curator` on a 7-day cycle.

Key patterns observed:
- **agentskills.io** emerging as the universal skill standard (cross-platform: Hermes, Claude Code, Cursor, Codex, OpenClaw)
- **Hermes Workspace + Mission Control** forming the canonical UI/orchestration stack
- **MCP (Model Context Protocol)** becoming the dominant integration bridge
- **Memory systems** proliferating as the hot differentiator (Mnemosyne, Hindsight, plur, Mnemo-hermes, Honcho, flowstate-qmd)
- **Skill evolution/self-improvement** as the next frontier (SkillClaw, hermes-curator-evolver, hermes-dojo)

---

## 2. Top 20 Most Relevant Repos (Ranked for Agent OS)

### Category: UIs / Command Centers

| # | Repo | Stars | Category | Capabilities | Install Complexity | Credentials | Verdict |
|---|------|-------|----------|-------------|-------------------|-------------|---------|
| 1 | [hermes-workspace](https://github.com/outsourc-e/hermes-workspace) | 5k | UI | Native web workspace: chat, terminal, memory browser, skills manager (2000+ skills), inspector, MCP catalog, Swarm mode (tmux-backed multi-agent), Agent View, Operations dashboard, Conductor mission dispatch, PWA, Tailscale. Zero-fork — runs on vanilla hermes-agent. | Medium: Node.js 22+, pnpm, Docker Compose option | None (local-first) | **INSTALL** — the canonical Hermes-native GUI |
| 2 | [mission-control](https://github.com/builderz-labs/mission-control) | 3.7k | Orchestration | Agent fleet dashboard: task dispatch, cost tracking, multi-gateway (OpenClaw/CrewAI/LangGraph/AutoGen/Claude SDK), 32 panels, real-time WebSocket+SSE, RBAC, Aegis review gates, Skills Hub (ClawdHub + skills.sh), cron templates, SQLite-backed, zero external deps. Alpha software. | Low: single `pnpm start` or Docker Compose | None (self-hosted) | **INSTALL** — best fleets/orchestration layer for multi-agent OS |
| 3 | [hermes-web-ui](https://github.com/EKKOLearnAI/hermes-web-ui) | 3.6k | UI | Vue3+TS dashboard: multi-session chat, 8 messaging channel config, token/cost analytics (30d trends), cron job scheduler, multi-profile gateway, multi-agent group chat with @mentions, WebSocket terminal, Skills browser. npm installable. | Low: `npm install -g hermes-web-ui` | None | **ADAPT** — good analytics layer; consider integrating into unified UI |

### Category: Core / Skills

| # | Repo | Stars | Category | Capabilities | Install Complexity | Credentials | Verdict |
|---|------|-------|----------|-------------|-------------------|-------------|---------|
| 4 | [wondelai/skills](https://github.com/wondelai/skills) | 380+ | Skills | Cross-platform agent skills (agentskills.io standard): product strategy, UX design, marketing CRO, sales, code craftsmanship, systems architecture. Plugin marketplace installable. | Low: `npx skills add wondelai/skills` | None | **INSTALL** — best curated skill library for Agent OS |
| 5 | [Anthropic-Cybersecurity-Skills](https://github.com/mukul975/Anthropic-Cybersecurity-Skills) | 4k+ | Skills | 754 cybersecurity skills mapped to MITRE ATT&CK, NIST CSF 2.0, MITRE ATLAS, D3FEND, NIST AI RMF. 26 domains. agentskills.io standard. | Low: clone + point agent at folder | None | **ADAPT** — huge security domain coverage, worth selective integration |
| 6 | [open-design](https://github.com/nexu-io/open-design) | 28k+ | Design/Skills | Open-source Claude Design alternative: 132 composable skills, 129 design systems, 16 coding-agent CLI auto-detection (includes Hermes ACP), image/video/audio gen (gpt-image-2, Seedance, HyperFrames), BYOK proxy, sandboxed previews, imports Claude Design exports. | Medium: pnpm + Node 22, optional local daemon | OpenAI/Azure/ByteDance keys for media gen | **ADAPT** — massive design skill ecosystem, integrate as skill pack |

### Category: Memory Systems

| # | Repo | Stars | Category | Capabilities | Install Complexity | Credentials | Verdict |
|---|------|-------|----------|-------------|-------------------|-------------|---------|
| 7 | [Mnemosyne](https://github.com/AxDSan/Mnemosyne) | — | Memory | Universal memory layer: SQLite + sqlite-vec hybrid search (50% vector/30% FTS5/20% importance), BEAM tiered architecture (working/episodic/scratchpad), temporal knowledge graph (TripleStore), time-aware fact invalidation. Zero deps. MCP-ready. Hermes native plugin. | Low: `pip install mnemosyne-memory` | None (fully local) | **INSTALL** — best all-around local memory stack for Agent OS |
| 8 | [SkillClaw](https://github.com/AMAP-ML/SkillClaw) | 705 | Skill Evolution | Auto-evolve, deduplicate, improve skill library from real session data. Post-task evolution loop on top of Hermes's built-in creation. Native `~/.hermes/skills` integration, safety flows (`skillclaw doctor` / `skillclaw restore`). Cross-device sync. | Medium: shell installer + Python 3.10+ | None | **INSTALL** — critical for self-improving Agent OS skill management |
| 9 | [hindsight](https://github.com/vectorize-io/hindsight) | — | Memory | Long-term memory with retain/recall/reflect workflows. Semantic + graph + temporal retrieval. State-of-the-art LongMemEval benchmark. Production at Fortune 500s. LLM Wrapper (2 lines of code). Docker or cloud. | Low-Medium: Docker container | OpenAI/Anthropic/Gemini key for LLM wrapper | **ADAPT** — excellent long-term memory but needs cloud dependency evaluation |
| 10 | [plur](https://github.com/plur-ai/plur) | — | Memory | Persistent cross-session/agent memory in YAML (open engram format). ACT-R activation model, feedback signals, hierarchical scope, polarity classification. MCP server. Works across Claude Code, Cursor, Hermes, OpenClaw. | Low: `npx @plur-ai/mcp init` | None (local-first) | **ADAPT** — good portable memory format, evaluate against Mnemosyne |
| 11 | [mnemo-hermes](https://github.com/eleion-ai/mnemo-hermes) | — | Memory | Semantic memory plugin for Hermes: pgvector vector search on top of built-in FTS5. 5 tools + `on_session_start` hook. Entirely local via Ollama, zero API keys. | Low: pip install into Hermes venv | None | **ADAPT** — solid local vector search but Mnemosyne is more comprehensive |

### Category: Plugins / Tooling

| # | Repo | Stars | Category | Capabilities | Install Complexity | Credentials | Verdict |
|---|------|-------|----------|-------------|-------------------|-------------|---------|
| 12 | [hermes-plugins (Evey)](https://github.com/42-evey/hermes-plugins) | — | Plugins | 23 plugins: autonomy engine, 3-model council, model delegation, telemetry, MQTT events, cost guard (Langfuse), reflection, hallucination detection, prompt injection guard, sandboxed execution, memory consolidation, identity (SOUL.md), Claude Code bridge, goals, research pipeline. | Medium: git clone + copy to ~/.hermes/plugins/ | Langfuse key (optional), MQTT broker (optional) | **INSTALL** — the most comprehensive plugin suite for autonomous ops |
| 13 | [rtk-hermes](https://github.com/ogallotti/rtk-hermes) | — | Plugin | Terminal output compression via RTK: 60-90% token reduction on shell commands. Uses `pre_tool_call` hook. Zero config, auto-loads on gateway boot. Benchmarked on 11M+ tokens. | Low: `pip install rtk-hermes` + `brew install rtk` | None | **INSTALL** — immediate token/cost savings, zero friction |
| 14 | [hermes-curator-evolver](https://github.com/pingchesu/hermes-curator-evolver) | — | Plugin | Evidence-driven skill evolution companion to v0.12 Curator. Observes events into SQLite, backfills session history, dry-run proposals, guarded daily autorun, optional Qwen embedding + bge reranking. | Medium: `hermes plugins install` + uv pip | None (default); Qwen embedding (optional) | **ADAPT** — good safety model; evaluate overlap with SkillClaw |
| 15 | [camofox-browser](https://github.com/jo-inc/camofox-browser) | 4k | Browser | Stealth headless browser with REST API. Bypasses Cloudflare, bot detection. Drop-in Puppeteer/Playwright replacement. Production used by askjo.ai. | Low: Docker or binary | None | **INSTALL** — critical for web automation on VPS/cloud infra |
| 16 | [agent-analytics-hermes-plugin](https://github.com/Agent-Analytics/agent-analytics-hermes-plugin) | — | Plugin | Read-only analytics dashboard tab for Hermes: multi-project analytics, explicit timeframe, theme-aware UI. Browser-login-first. | Low: `hermes plugins install` | Agent Analytics account | **ADAPT** — useful for ops telemetry if using Agent Analytics |

### Category: Connectors / Bridges

| # | Repo | Stars | Category | Capabilities | Install Complexity | Credentials | Verdict |
|---|------|-------|----------|-------------|-------------------|-------------|---------|
| 17 | [hermes-agent-acp-skill](https://github.com/Rainhoole/hermes-agent-acp-skill) | — | Multi-agent | ACP-style multi-agent delegation: routes tasks across Hermes internal subagents, Codex, Claude Code. Context isolation, timeouts, output limits. | Low: SKILL.md install | None | **INSTALL** — foundational for multi-agent orchestration in Agent OS |
| 18 | [hermes-nextcloud](https://github.com/adnw-vinc/hermes-nextcloud) | — | Connector | Self-hosted Nextcloud bridge: WebDAV files, Nextcloud Notes API, CalDAV calendar/tasks, CardDAV contacts. App Password auth. | Medium: configure Nextcloud app password | Nextcloud App Password | **ADAPT** — good for self-hosted users, not universally needed |
| 19 | [microsoft-workspace-skill](https://github.com/Andrew-Girgis/microsoft-workspace-skill) | — | Connector | Full Outlook/Microsoft 365 via Graph API: email, calendar, contacts, free/busy scheduling. OAuth2 with auto-refresh. Preview-before-send safety. | Medium: Azure AD app registration | Microsoft Graph API OAuth2 | **ADAPT** — valuable for enterprise integrations |
| 20 | [MeiGen-AI-Design-MCP](https://github.com/jau123/MeiGen-AI-Design-MCP) | 1k+ | MCP/Design | MCP server for AI image/video generation across 9 models (GPT Image 2, Midjourney V8.1, Flux 2, Seedance 2.0, Veo 3.1) + local ComfyUI. 1,446 curated prompts, parallel sub-agent orchestration. SSRF-hardened. | Low: `npm install -g meigen` | MeiGen cloud key or BYOK OpenAI-compatible | **ADAPT** — excellent media generation skill, integrate via MCP |

---

## 3. Hermes Workspace Pattern Analysis

### What it is
Hermes Workspace (outsourc-e/hermes-workspace) is the richest native UI for Hermes. It is NOT a fork — it attaches to vanilla hermes-agent via the gateway API.

### Architecture
- **Frontend**: Next.js web app (port 3000) with PWA + Tailscale support
- **Backend**: Connects to hermes-agent gateway at `HERMES_API_URL` (default port 8642)
- **Key components**:
  - Chat: SSE streaming, multi-session, markdown, tool call rendering
  - Memory Browser: browse, search, edit agent memory with live editor
  - Skills Manager: 2000+ skills with origin badges, filters, marketplace
  - Terminal: cross-platform PTY terminal via Monaco
  - MCP: full `/mcp` page with catalog + marketplace + sources
  - Operations: profile presets (Sage/Trader/Builder/Scribe/Ops)
  - Conductor: mission dispatch + decomposition (dashboard-backed or native Swarm fallback)
  - Swarm Mode: persistent tmux-backed workers, role-based dispatch (builder/reviewer/docs/research/ops/triage/QA/lab)
  - Dashboard: sessions, model mix, cost ledger, attention card
  - Security: auth middleware, CSP, path-traversal guard, fail-closed remote bind

### Swarm Mode Deep Dive
- Unlimited Hermes Agents + 1 orchestrator
- Persistent tmux workers keep context across tasks
- Role-based dispatch routes tasks to specialized agents
- Byte-verified review gate blocks PRs without sign-off
- Autonomous PR/issue lanes, lab experiments, repair playbook
- Kanban TaskBoard for backlog/ready/running/review/blocked/done
- TUI view for tmux attachment or shell/log stream

### Install Paths
1. One-line install: `curl -fsSL .../install.sh | bash`
2. Docker Compose (~2 min)
3. Attach to existing hermes-agent (~1 min)

### Verdict for Agent OS
**Primary UI layer.** Install first. Swarm mode aligns perfectly with unified Agent OS multi-agent vision. Zero-fork approach means it stays compatible with upstream Hermes releases.

---

## 4. Mission Control Pattern Analysis

### What it is
Mission Control (builderz-labs/mission-control) is an open-source dashboard for AI agent orchestration at fleet scale. It is framework-agnostic.

### Architecture
- **Stack**: Next.js 16 + TypeScript 5.7 + SQLite (zero external deps, no Redis/Postgres required)
- **Key components**:
  - 32 panels: tasks, agents, skills, logs, tokens, memory, security, cron, alerts, webhooks, pipelines
  - Real-time everything: WebSocket + SSE with smart polling pause
  - Role-based access: Viewer/Operator/Admin + Google Sign-In with approval
  - Quality gates: Aegis review system blocks task completion without sign-off
  - Skills Hub: browse/install/security-scan from ClawdHub + skills.sh
  - Multi-gateway: connect multiple agent gateways simultaneously
  - Framework adapters: OpenClaw, CrewAI, LangGraph, AutoGen, Claude SDK
  - Recurring tasks: natural language scheduling with cron spawning
  - Agent eval & security: 4-layer eval, trust scoring, secret detection, MCP auditing

### Distinction from Hermes Workspace
- Hermes Workspace = daily driver, chat-centric, Swarm mode, Hermes-native
- Mission Control = fleet ops, task-centric, framework-agnostic, cost tracking
- Together they form the ops stack: Workspace for individual agent interaction, Mission Control for fleet orchestration

### Verdict for Agent OS
**Secondary orchestration layer.** Install alongside Workspace for multi-agent fleet management and cost tracking. The framework adapters mean it can coordinate not just Hermes but also other agents in the ecosystem.

---

## 5. Memory Stack Evaluation

| System | Type | Arch | Pros | Cons | Verdict |
|--------|------|------|------|------|---------|
| **Mnemosyne** | Local-first | SQLite + sqlite-vec + FTS5 + BEAM tiers + temporal KG | Zero deps, sub-ms, universal (MCP + native plugins), Hermes native plugin included, time-aware invalidation | Newer, community size unknown | **Primary choice** |
| **hindsight** | Cloud + local Docker | PostgreSQL + proprietary retrieval | SOTA benchmarks, Fortune 500 proven, retain/recall/reflect workflows, 2-line integration | Cloud dependency, LLM API key needed, heavier | **Secondary/enterprise** |
| **plur** | Local-first YAML | Open engram format + ACT-R | Cross-tool portable, no API calls, hierarchical scope, polarity classification | YAML-based may not scale to millions of entries | **Portable complement** |
| **SkillClaw** | Skill-focused | Post-task evolution loop | Auto-dedup, auto-evolve skills from session data, cross-device sync, safety flows (doctor/restore) | Evolves skills, not raw memory | **Essential companion** |
| **mnemo-hermes** | Local vector | pgvector + FTS5 hybrid | 5 tools + auto-context hook, entirely local via Ollama | pgvector requirement, simpler than Mnemosyne | **Fallback option** |
| **flowstate-qmd** | Anticipatory | RAG + vector search | Pre-fetches context before queries | Early stage (beta) | **Evaluate** |
| **yantrikdb** | Hermes-native | Rust backend + HTTP | Self-maintaining memory (canonicalizes duplicates, surfaces contradictions, explainable recall) | Requires running Rust backend | **Evaluate for explainability** |

### Recommended Memory Stack for Agent OS
1. **Mnemosyne** as primary universal memory
2. **SkillClaw** for skill library evolution/deduplication
3. **plur** as portable engram format for cross-tool sync
4. **hindsight** as enterprise long-term backup (optional)

---

## 6. MCP Ecosystem

MCP (Model Context Protocol) is the dominant integration pattern:

| MCP Server | Purpose | Verdict |
|-----------|---------|---------|
| **Not Human Search** | Discover other MCP servers (8,600+ indexed) | **Install** — meta-discovery |
| **MeiGen** | Image/video generation (9 models) | **Adapt** — media gen pipeline |
| **Mnemosyne** | Memory access | **Install** — core memory |
| **Mistral MCP** | Full Mistral AI surface (chat, OCR, audio, FIM, etc.) | **Adapt** — specialized model routing |
| **Clarvia** | AEO scoring for MCP tools (15,400+ servers indexed) | **Adapt** — tool quality gate |
| **hindsight** | Long-term memory | **Adapt** — enterprise memory |
| **Agentic-MCP-Skill** | MCP client with agentskills.io validation | **Evaluate** |
| **hermes-blockchain-oracle** | Solana on-chain analytics | **Ignore** (domain-specific) |
| **hermes-council** | Adversarial multi-perspective debate | **Evaluate** |

---

## 7. Complete Categorization of All Significant Repos

### Agent Frameworks (Core)
| Repo | Stars | Notes |
|------|-------|-------|
| NousResearch/hermes-agent | 134k | Core agent, self-improving, 18 platforms |
| NousResearch/autonovel | — | Novel-writing pipeline |
| NousResearch/hermes-paperclip-adapter | — | Paperclip company integration |
| NousResearch/hermes-agent-self-evolution | — | DSPy/GEPA prompt optimization |
| NousResearch/tinker-atropos | — | RL training for tool-calling |

### Skills (agentskills.io Standard)
| Repo | Stars | Domain |
|------|-------|--------|
| wondelai/skills | 380+ | Product, UX, marketing, code, systems |
| mukul975/Anthropic-Cybersecurity-Skills | 4k+ | Security (754 skills) |
| youtube-skills | — | YouTube search/transcripts |
| chainlink-agent-skills | — | Blockchain oracles |
| black-forest-labs/skills | — | FLUX image generation |
| pydantic-ai-skills | — | Type-safe schema validation |
| drawio-skill | 1.1k | Diagram generation |
| open-design skills | 28k+ | 132 design skills |
| execplan-skill | — | Long-running task lifecycle |
| maestro | — | Skill orchestration (Conductor+Beads) |
| bmad-module-skill-forge | — | Repo → skills conversion |
| cognify-skills | — | Business ops (CRM, invoicing, PM) |
| x-twitter-scraper | — | X/Twitter API (typed JSON) |
| skillsdotnet | — | C# agentskills.io + MCP |
| colony-skill | — | Collaborative intelligence hub |
| AgentCash | — | 300+ premium API access + wallet |
| master-skill | — | Industry distillation (9 industries) |

### Tools / Utilities
| Repo | Stars | Purpose |
|------|-------|---------|
| hermes-workspace | 5k | Native web workspace |
| mission-control | 3.7k | Fleet orchestration dashboard |
| hermes-web-ui | 3.6k | Vue3 analytics dashboard |
| hermes-desktop | — | Native macOS workspace |
| hermes-ui | — | Single-file glassmorphic web UI |
| hermes-webui | — | Lightweight process monitoring |
| hermes-neurovision | — | Terminal neurovisualizer |
| lintlang | — | Agent config/prompt linter |
| nix-hermes-agent | — | Nix package + NixOS module |
| evey-setup | — | One-command full stack setup |
| camofox-browser | 4k | Stealth headless browser |
| vessel-browser | — | AI-native Linux browser |
| portable-hermes-agent | — | Windows desktop app (100 tools) |
| agenttrace | — | Session audit TUI/CLI |

### Plugins
| Repo | Purpose |
|------|---------|
| hermes-plugins (Evey) | 23 plugins: autonomy, observability, safety |
| plur | Shared memory layer |
| hermes-payguard | USDC/x402 safe payments |
| hermes-web-search-plus | Multi-provider search routing |
| hermes-weather-plugin | Professional weather (NWS/NEXRAD) |
| hermes-wxtrain-plugin | Weather ML pipeline |
| hermes-plugin-chrome-profiles | CDP profile switching |
| hermes-cloudflare | Cloudflare browser rendering |
| evey-bridge-plugin | Claude Code ↔ Hermes bridge |
| agent-analytics-hermes-plugin | Analytics dashboard tab |
| hermes-curator-evolver | Curator companion evolution |
| rtk-hermes | Terminal output compression |
| mnemo-hermes | Semantic memory (pgvector) |
| Mnemosyne | Universal memory (SQLite) |

### Memory Systems
| Repo | Approach |
|------|----------|
| Mnemosyne | SQLite + sqlite-vec + BEAM + temporal KG |
| hindsight | Retain/recall/reflect (cloud + Docker) |
| plur | YAML engrams (ACT-R) |
| SkillClaw | Skill evolution from sessions |
| mnemo-hermes | pgvector + FTS5 |
| flowstate-qmd | Anticipatory RAG |
| honcho-self-hosted | Self-hosted Honcho backend |
| yantrikdb | Self-maintaining memory (Rust) |

### Multi-Agent / Swarms
| Repo | Pattern |
|------|---------|
| Ankh.md | TAW Agent x Hermes swarm |
| gladiator | Competitive AI companies |
| bigiron | AI-native SDLC with Hermes |
| opencode-hermes-multiagent | 17 specialized agents |
| hermes-agent-acp-skill | ACP delegation (Hermes/Codex/Claude) |
| zouroboros-swarm-executors | Local executor bridge |
| oh-my-hermes | Multi-agent orchestration skills |

### Connectors / Integrations
| Repo | Integration |
|------|-------------|
| hermes-android | Android device bridge |
| hermes-miniverse | Miniverse pixel worlds |
| reina | Crustocean platform |
| nothumansearch-mcp | MCP server discovery |
| NemoHermes | NVIDIA GPU routing |
| microsoft-workspace-skill | Microsoft 365 |
| agent-android | LAN Android control (AIVane) |
| clawsocial-hermes-plugin | Social discovery network |
| mistral-mcp | Full Mistral AI surface |
| MeiGen-AI-Design-MCP | Image/video generation |
| hermes-nextcloud | Nextcloud bridge |

### Domain Applications
| Repo | Domain |
|------|--------|
| hermes-embodied | Robotics (VLA fine-tuning) |
| hermescraft | Minecraft companion |
| Hermes-mars-rover | Mars rover simulator (ROS2) |
| anihermes | Anime server/tracker |
| job-scout-agent | Job hunting |
| hermes-ai-infra-monitoring | Infrastructure monitoring |
| hermes-genesis | Procedural world engine |
| hermes-legal | Contract risk analysis |
| hermes-startup-architect | Startup kits |
| mercury | Blockchain cash flow |
| hermes-research-agent | LLM research |

---

## 8. Recommended Installation Order for Agent OS

### Phase 1: Core (Week 1)
1. `NousResearch/hermes-agent` — install via official installer
2. `outsourc-e/hermes-workspace` — primary UI (one-line install)
3. `builderz-labs/mission-control` — fleet orchestration (Docker Compose)

### Phase 2: Skills + Memory (Week 2)
4. `wondelai/skills` — curated skill library
5. `AxDSan/Mnemosyne` — primary memory system
6. `AMAP-ML/SkillClaw` — skill evolution companion

### Phase 3: Tooling + Optimization (Week 3)
7. `42-evey/hermes-plugins` — autonomy + observability suite
8. `ogallotti/rtk-hermes` — terminal compression (immediate savings)
9. `jo-inc/camofox-browser` — stealth browsing for VPS

### Phase 4: Connectors + Extras (Week 4+)
10. `Rainhoole/hermes-agent-acp-skill` — multi-agent delegation
11. `jau123/MeiGen-AI-Design-MCP` — media generation via MCP
12. `mukul975/Anthropic-Cybersecurity-Skills` — security domain coverage
13. `nexu-io/open-design` — design skill ecosystem
14. `unitedideas/nothumansearch-mcp` — MCP server discovery

---

## 9. Repos to IGNORE (for Agent OS)

| Repo | Reason |
|------|--------|
| Wizards-of-the-Ghosts | Novelty/RPG wrapper, not operational |
| super-hermes | Meta-prompting, too experimental |
| hermes-life-os | Lifestyle tracking, not core |
| acca-tracker | Betting-specific, narrow domain |
| hermes-skill-marketplace | Overlap with existing registries |
| personal-api | Obsidian-specific, niche |
| hermes-embodied | Robotics VLA, very narrow |
| Hermes-mars-rover | ROS2/Gazebo, very narrow |
| anihermes | Anime-specific |
| hermes-genesis | Procedural world engine, niche |
| hermes-legal | Legal analysis, narrow |
| hermes-startup-architect | Startup kit generator, narrow |
| orahermes-agent | Oracle-specific |
| hermes-skill-distillation | Research/hackathon project |
| gladiator | Competitive agent experiment |

---

## 10. Key Insights

1. **Hermes Workspace + Mission Control** are the two-pillar UI stack. Do not build a new UI — integrate these.
2. **Mnemosyne + SkillClaw** form the self-improving core: memory that compounds + skills that evolve from real work.
3. **agentskills.io** is the lingua franca. Any skill we build should follow this standard.
4. **MCP** is the integration backbone. Every new tool should expose an MCP server.
5. **Swarm Mode** (Hermes Workspace) is the most advanced multi-agent pattern in the ecosystem — persistent tmux workers with role-based dispatch.
6. **Token compression** (rtk-hermes) gives 60-90% savings with zero UX change. Install immediately.
7. **The Curator** (v0.12) is Hermes's built-in skill maintenance. SkillClaw and hermes-curator-evolver are the ecosystem companions.
8. **Evey's plugin suite** is the most comprehensive autonomy toolkit — autonomy engine, council, telemetry, cost guard, reflection, validation.
9. **Open Design** (28k stars) is the fastest-growing design skill ecosystem and auto-detects Hermes via ACP.
10. **Camofox** is the production-grade answer to Cloudflare blocking on VPS-hosted agents.

---

Report generated from reverse-engineering awesome-hermes-agent (0xNyk) and 30+ linked repositories.
