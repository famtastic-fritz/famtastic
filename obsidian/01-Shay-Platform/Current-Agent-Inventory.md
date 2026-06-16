---
title: Current-Agent-Inventory
type: note
permalink: famtastic/06-capabilities/current-agent-inventory
---

# Current Agent Inventory

Last updated: 2026-05-27

## Active Agents (Installed & Running)

### 1. Shay-Shay (Primary)
- **Role**: AI Boss, orchestration, research, coordination
- **Provider**: OpenAI Codex (gpt-5.5)
- **Status**: ✅ Active
- **Channels**: Telegram, iMessage
- **Tools**: 40+ built-in (web, file, browser, image, TTS)
- **Memory**: Hermes FTS5 + session search
- **Skills**: 91 skills loaded
- **Cost**: API usage

### 2. Hermes Agent
- **Role**: Terminal agent, skills, cron, messaging
- **Version**: v0.12.0 (The Curator Release)
- **Status**: ✅ Active
- **Channels**: 18 platforms (Telegram primary)
- **Tools**: 40+ built-in
- **Memory**: SQLite FTS5 + LLM summarization
- **Skills**: Self-improving, agentskills.io standard
- **Cost**: Free

### 3. Claude Code
- **Role**: Coding agent, features, PRs
- **Status**: ✅ Active
- **Tools**: File system, terminal, web
- **Cost**: $20/month

### 4. Codex
- **Role**: Coding agent, fast PRs
- **Status**: ✅ Active
- **Tools**: File system, terminal
- **Cost**: API usage

### 5. Cowork
- **Role**: Claude Code alternative
- **Status**: ⚠️ Partial (installed but rarely used)
- **Cost**: API usage

---

## Agents to Install (Priority Order)

### Phase 1: Core Expansion (This Week)
1. **OpenClaw** — Multi-agent gateway, 21+ channels
2. **Gemini CLI** — Free research agent
3. **Kimi** — Deep research, 300-agent swarms
4. **Opencode** — Free coding agent

### Phase 2: UI Layer (Next Week)
5. **Hermes Workspace** — Native web GUI, Swarm mode
6. **Mission Control** — Fleet orchestration, cost tracking
7. **Hermes Web UI** — Analytics dashboard

### Phase 3: Memory & Skills (Week 3)
8. **Mnemosyne** — Universal memory (SQLite + vector)
9. **SkillClaw** — Auto-evolve skills
10. **Evey Plugins** — 23-plugin autonomy suite
11. **rtk-hermes** — Token compression (60-90% savings)

### Phase 4: Specialized (Week 4)
12. **camofox-browser** — Stealth browsing
13. **MeiGen MCP** — Media generation
14. **Open Design** — Design skill ecosystem
15. **NotebookLM** — Knowledge synthesis

---

## Agent Communication Map

```
┌─────────────────────────────────────────┐
│           SHAY-SHAY (Boss)              │
│         Orchestration Layer             │
└─────────────┬───────────────────────────┘
              │
    ┌─────────┼─────────┐
    │         │         │
┌───▼───┐ ┌──▼────┐ ┌──▼────┐
│Hermes │ │Claude │ │ Codex │
│Agent  │ │ Code  │ │       │
└───┬───┘ └──┬────┘ └──┬────┘
    │        │         │
    └────────┼─────────┘
             │
    ┌────────▼────────┐
    │  OpenClaw       │
    │  (Gateway)      │
    │  — when installed │
    └────────┬────────┘
             │
    ┌────────┼────────┐
    │        │        │
┌───▼───┐ ┌─▼─────┐ ┌▼──────┐
│Kimi   │ │Gemini │ │Opencode│
│Swarms │ │CLI    │ │       │
└───────┘ └───────┘ └───────┘
```

---

## Agent Cost Tracker

| Agent | Monthly Cost | Usage Pattern |
|-------|-------------|---------------|
| Shay-Shay | $50-200 | Heavy research, coordination |
| Claude Code | $20 | Coding sessions |
| Codex | $30-100 | Fast coding, PRs |
| Hermes | $0 | Always on, skills, cron |
| **Total Current** | **$100-320/mo** | |
| **Target with expansion** | **$200-500/mo** | With Kimi, Gemini, Opencode |

---

## Notes

- All agents should write session summaries to Obsidian vault
- Agent-to-agent communication currently manual (Shay-Shay routes)
- OpenClaw will enable true multi-agent routing when installed
- Kimi swarms will enable 300-agent parallel research

## Tags
#agent-os #inventory #agents #shay-shay #hermes #claude #codex #cost-tracking