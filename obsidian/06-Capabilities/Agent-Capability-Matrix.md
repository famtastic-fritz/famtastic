---
title: Agent-Capability-Matrix
type: note
permalink: famtastic/06-capabilities/agent-capability-matrix
---

# Agent Capability Matrix

Last updated: 2026-06-02 (added humanize-writing skill; installed for Claude Code + Shay)

## Legend
- ✅ = Installed & Active
- ⚠️ = Installed but needs config
- ❌ = Not installed
- 🔧 = In progress
- 💰 = Paid/subscription required

---

## Core Agents

| Agent | Type | Status | Cost | Best For | Install Command |
|-------|------|--------|------|----------|-----------------|
| **Shay-Shay** | Orchestration | ✅ Active | API usage | Primary boss, research, coordination | Built-in |
| **Hermes** | Terminal Agent | ✅ Active | Free | Skills, cron, messaging, memory | `curl -fsSL .../install.sh \| bash` |
| **Claude Code** | Coding Agent | ✅ Active | $20/mo | Features, PRs, code review | `npm install -g @anthropic-ai/claude-code` |
| **Codex** | Coding Agent | ✅ Active | API usage | Fast coding, PRs | `npm install -g @openai/codex` |
| **OpenClaw** | Gateway | ❌ Not installed | Free | Multi-agent routing, 21+ channels | `npm install -g openclaw@latest` |
| **Gemini CLI** | Research Agent | ❌ Not installed | Free | Web research, multi-modal | `npm install -g @google/gemini-cli` |
| **Kimi** | Research/Swarm | ❌ Not installed | Free tier | Deep research, 300-agent swarms | `npm install -g kimi` |
| **Opencode** | Coding Agent | ❌ Not installed | Free | Code generation, devops | `npm install -g @opencode/cli` |
| **NotebookLM** | Knowledge Engine | ❌ Not installed | Free | Document synthesis, podcasts | Web app |
| **Cowork** | Coding Agent | ⚠️ Partial | API usage | Claude Code alternative | `npm install -g @anthropic-ai/cowork` |

---

## UI / Dashboard Agents

| Agent | Type | Status | Cost | Best For | Install Command |
|-------|------|--------|------|----------|-----------------|
| **Hermes Workspace** | Web UI | ❌ Not installed | Free | Native Hermes GUI, Swarm mode | One-line install script |
| **Mission Control** | Fleet Ops | ❌ Not installed | Free | Multi-agent orchestration, cost tracking | `pnpm start` or Docker |
| **Hermes Web UI** | Analytics | ❌ Not installed | Free | Token/cost analytics, scheduler | `npm install -g hermes-web-ui` |

---

## Memory Systems

| System | Type | Status | Cost | Best For | Install Command |
|--------|------|--------|------|----------|-----------------|
| **Hermes FTS5** | Built-in | ✅ Active | Free | Session search, summarization | Built into Hermes |
| **Mnemosyne** | Universal | ❌ Not installed | Free | SQLite + vector + temporal KG | `pip install mnemosyne-memory` |
| **SkillClaw** | Skill Evolution | ❌ Not installed | Free | Auto-evolve skills from sessions | Shell installer |
| **plur** | Portable | ❌ Not installed | Free | Cross-tool memory in YAML | `npx @plur-ai/mcp init` |
| **hindsight** | Enterprise | ❌ Not installed | 💰 API | Long-term memory, Fortune 500 | Docker container |

---

## Plugins / Extensions

| Plugin | Type | Status | Cost | Best For | Install Command |
|--------|------|--------|------|----------|-----------------|
| **Evey Plugins** | Autonomy Suite | ❌ Not installed | Free | 23 plugins: council, telemetry, safety | `git clone + copy to ~/.hermes/plugins/` |
| **rtk-hermes** | Compression | ❌ Not installed | Free | 60-90% token reduction | `pip install rtk-hermes` |
| **camofox-browser** | Stealth Browser | ❌ Not installed | Free | Bypass Cloudflare, bot detection | Docker or binary |
| **hermes-curator-evolver** | Skill Evolution | ❌ Not installed | Free | Evidence-driven skill evolution | `hermes plugins install` |
| **agent-analytics** | Telemetry | ❌ Not installed | 💰 Account | Multi-project analytics | `hermes plugins install` |

---

## Skills Libraries

| Library | Count | Status | Cost | Best For | Install Command |
|---------|-------|--------|------|----------|-----------------|
| **Built-in Skills** | ~40 | ✅ Active | Free | Web, file, browser, image, TTS | Built into Hermes |
| **wondelai/skills** | 50+ | ❌ Not installed | Free | Product, UX, marketing, code | `npx skills add wondelai/skills` |
| **Anthropic Cybersecurity** | 754 | ❌ Not installed | Free | Security, MITRE ATT&CK | Clone + point agent |
| **Open Design** | 132 | ❌ Not installed | Free | Design systems, media gen | `pnpm + Node 22` |
| **MeiGen MCP** | 1,446 prompts | ❌ Not installed | 💰 Key | Image/video generation | `npm install -g meigen` |

### Installed Studio / Claude Code Skills (`.claude/skills/`)

Shared skill pool available to any Claude Code or Studio session. Mirrored to Shay's own pool (`shay-agent-os/skills/`) where noted.

| Skill | Status | Cost | Best For | Installed where |
|-------|--------|------|----------|-----------------|
| **humanize-writing** | ✅ Active | Free | Remove AI tells, normalize burstiness, voice-calibrate prose >3 paragraphs | `.claude/skills/` **+ `shay-agent-os/skills/`** |
| adobe-firefly | ✅ Active | 💰 Key | AI image generation | `.claude/skills/` |
| brainstorm / site-studio / export-site | ✅ Active | API usage | Site factory flows | `.claude/skills/` |
| register-credential | ✅ Active | Free | Vault a secret + verify the dependent capability | `.claude/skills/` |
| remotion-best-practices | ✅ Active | Free | Remotion video creation | `.claude/skills/` |

Source for humanize-writing: `github.com/aaaronmiller/humanize-writing` (installed 2026-06-02).

---

## Communication Channels

| Channel | Status | Cost | Best For |
|---------|--------|------|----------|
| **Telegram** | ✅ Active | Free | Primary notifications |
| **Discord** | ❌ Not installed | Free | Community, team |
| **Slack** | ❌ Not installed | Free | Enterprise |
| **WhatsApp** | ❌ Not installed | Free | International |
| **Signal** | ❌ Not installed | Free | Privacy |
| **Email** | ⚠️ Partial | Free | Formal comms |
| **iMessage** | ✅ Active | Free | Apple ecosystem |

---

## Revenue Tools

| Tool | Status | Cost | Best For |
|------|--------|------|----------|
| **Stripe** | ❌ Not installed | 2.9% + 30¢ | Billing, subscriptions |
| **FAMtastic Site Studio** | 🔧 In progress | API usage | Site factory |
| **Media Studio** | 🔧 In progress | API usage | Logo, brand, media |
| **Component Studio** | ❌ Not started | API usage | Reusable components |

---

## Jailbroken / Uncensored LLMs

| Model | Status | Cost | Best For | Access |
|-------|--------|------|----------|--------|
| **Gemma 4** | ❌ Not installed | Free | Open weights, uncensored | HuggingFace |
| **OBLITERATUS** | ✅ Available | Free | Remove refusals | Built-in skill |
| **GODMODE** | ✅ Available | Free | Jailbreak prompts | Built-in skill |
| **ULTRAPLINIAN** | ✅ Available | Free | Unfiltered reasoning | Built-in skill |
| **Local LLMs (llama.cpp)** | ❌ Not installed | Free | Private inference | `llama.cpp` |

---

## Tags
#agent-os #capabilities #inventory #matrix #shay-shay #hermes #claude #codex