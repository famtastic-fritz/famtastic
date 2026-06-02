---
title: hermes-capabilities-audit-2026-05-31
type: note
permalink: shay-memory/research/hermes-capabilities-audit-2026-05-31
---

# Hermes / Shay-Shay Capability Audit — What We Use vs What We're Leaving on the Table

**Date:** 2026-05-31
**Scope:** Full Hermes/Shay-Shay agent capability surface vs FAMtastic's actual usage.
**Method:** Read local docs at `~/.shay/hermes-agent/website/docs/` (index, integrations, all `user-guide/features/*`, guides), the `shay` CLI subcommand surface (`~/.local/bin/shay --help` + sub-helps), the tool inventory at `~/famtastic/shay-shay/tools/`, live config/state (`shay cron list`, `shay kanban boards`, `shay mcp list`, `shay memory status`, `shay insights`, `~/.shay/config.yaml`), and a WebFetch of the live docs site.

**Legend:** ✅ USING · 🟡 PARTIAL · ⛔ NOT-USING

---

## Snapshot of what's actually live right now

- **Model stack:** primary `google/gemini-2.5-flash` (config), but real traffic last 7d ran on `claude-sonnet-4-6` (28 sessions), `gpt-5.5` (14), `deepseek-v4-flash` (15), `hermes3:latest` local (71 short sessions). Fallback chain configured: anthropic → gemini → local ollama `hermes3`.
- **Profiles:** 5 — `default` (gateway running), `builder`, `orchestrator`, `researcher` (nemotron), `reviewer` (all gateways stopped).
- **Kanban boards:** `default` (done=9), `agentos` (current), `deskbuild` (triage=9), `research` (blocked=1, done=1).
- **Cron jobs:** `context-daemon` (*/5), `autonomous-curator` (daily 02:00), `morning-command-center` (daily 07:30) — all `no-agent` script mode.
- **MCP servers:** `obsidian`, `basic-memory` (7 tools), `vault-search` (HTTP 8766). All enabled.
- **Memory provider:** built-in MEMORY.md/USER.md only. No external provider active (byterover/hindsight/holographic installed but off).
- **Platforms:** cli (101 sessions), **api_server (35 sessions, 37.5M tokens)**, cron (4). No messaging platform sessions recorded in last 7d.

---

## Category 1 — Orchestration & Multi-Agent

| Capability | Status | Notes / What we'd gain |
|---|---|---|
| **Kanban swarm board** (`shay kanban`) — SQLite task board, atomic claims, dependencies, worker lanes | ✅ USING | 4 boards live, worker-lane execution. |
| **Profiles** (`shay profile`) — isolated agents, per-profile aliases | ✅ USING | builder/orchestrator/researcher/reviewer split. |
| **Subagent delegation** (`delegate_task` tool) — spawn isolated children, parallel batch, only summary returns | 🟡 PARTIAL | We lean on kanban + profiles for parallelism; in-session `delegate_task` parallel batch underused. GAIN: fan-out research/review inside a single session without standing up a profile or board task. Ref: `features/delegation.md`, `guides/delegation-patterns.md`, `tools/delegate_tool.py`. |
| **Persistent Goals / `/goal`** — Ralph-loop; judge model checks goal each turn, auto-continues until done | ⛔ NOT-USING | GAIN: hands-off "fix every lint error / get CI green / finish this report" loops without us re-prompting "keep going". Ref: `features/goals.md`. |
| **`execute_code` / Programmatic Tool Calling** — Python script calls Shay tools over RPC, intermediate results never hit context | 🟡 PARTIAL | GAIN: collapse multi-step muapi/research pipelines into one inference turn, slashing token burn (we currently chain tool calls turn-by-turn). Ref: `features/code-execution.md`, `tools/code_execution_tool.py`. |
| **Profile distributions** — package a whole agent (SOUL+skills+cron+mcp+config) as one installable git repo | ⛔ NOT-USING | GAIN: ship a reproducible "FAMtastic researcher" or "deskbuild" agent across machines/teammates in one `shay profile install`. Ref: `user-guide/profile-distributions.md`. |
| **Mixture-of-agents** (`tools/mixture_of_agents_tool.py`) | ⛔ NOT-USING | GAIN: aggregate multiple models' answers for higher-quality one-shot synthesis on hard calls. |

## Category 2 — Memory & Knowledge

| Capability | Status | Notes / What we'd gain |
|---|---|---|
| **Built-in memory** (MEMORY.md / USER.md, curated, bounded) | ✅ USING | Active by default. |
| **basic-memory MCP + Smart Connections + vault-search** | ✅ USING | Our Obsidian brain stack (per recent commits). |
| **External memory providers** — Honcho (dialectic user modeling), OpenViking, Mem0, Hindsight (knowledge graphs), Holographic, RetainDB, ByteRover, Supermemory | ⛔ NOT-USING (built-in only) | GAIN: Honcho would auto-build a running model of Fritz's prefs/style across sessions instead of us hand-curating MEMORY.md; Hindsight gives a queryable knowledge graph. byterover/hindsight/holographic already installed, just off. Ref: `features/memory-providers.md`, `features/honcho.md`. |
| **Session search** (`session_search` tool, FTS5 + LLM summarize) | 🟡 PARTIAL | Available; not a habitual recall step. GAIN: "what did we decide about X three weeks ago" without grep. Ref: `features/sessions.md`, `tools/session_search_tool.py`. |
| **Curator** — background maintenance of agent-authored skills (active→stale→archived, never deletes) | ✅ USING | `autonomous-curator` cron runs daily. |

## Category 3 — Automation & Triggers

| Capability | Status | Notes / What we'd gain |
|---|---|---|
| **Cron scheduler** (`shay cron`) — time-based, any-platform delivery, agent or no-agent mode | ✅ USING | 3 jobs live. |
| **Dynamic webhooks** (`shay webhook`) — event-driven agent activation (GitHub PR, API POST) | ⛔ NOT-USING (platform not enabled) | GAIN: GitHub-PR-review-on-push, inbound-API triggers, event-driven builds instead of polling. Ref: `shay webhook`, `messaging/webhooks.md`, `guides/webhook-github-pr-review.md`, `guides/automation-templates.md`. |
| **Event hooks** — gateway hooks (HOOK.yaml), plugin hooks, shell hooks (`hooks:` block) for guardrails/auto-format/context-injection | ⛔ NOT-USING | GAIN: deterministic guardrails (block dangerous writes, auto-format on patch, inject project context) without relying on the model. Ref: `features/hooks.md`, `shay hooks`. |
| **Automation templates** — copy-paste cron/webhook/multi-skill recipes | ⛔ NOT-USING | GAIN: daily-briefing bot, PR-review agent off the shelf. Ref: `guides/automation-templates.md`, `guides/daily-briefing-bot.md`. |

## Category 4 — Skills

| Capability | Status | Notes / What we'd gain |
|---|---|---|
| **Skills system** (`shay skills`, self-creation, self-improvement loop) | ✅ USING | Large bundled + agent skill catalog; muapi recipes heavily used. |
| **Skills Hub / publish / tap** — install from skills.sh/ClawHub/GitHub, publish our own, manage sources | 🟡 PARTIAL | We install; we don't `publish` or run custom `tap` sources. GAIN: publish FAMtastic skills (site-studio, muapi recipes) to a private tap for reuse across profiles/machines. Ref: `shay skills publish/tap`, `features/skills.md`. |
| **Skill snapshot** (export/import skill config sets) | ⛔ NOT-USING | GAIN: version & port the exact enabled-skill set between profiles. |

## Category 5 — Web, Vision & Media

| Capability | Status | Notes / What we'd gain |
|---|---|---|
| **Web search / extract** (Firecrawl/Parallel/Tavily/Exa backends) | ✅ USING | Backend auto-detected; deep-research harness uses it. |
| **Browser automation** — Browserbase, Browser Use, local Chrome CDP, local Chromium, browser-supervisor | 🟡 PARTIAL | We use Chrome MCPs/Playwright elsewhere; Shay's native browser stack + `/browser connect` + supervisor underused. GAIN: agent-driven form-fill/scrape inside Shay sessions with anti-bot/CAPTCHA via Browserbase. Ref: `features/browser.md`, `tools/browser_supervisor.py`. |
| **Vision / image paste** — multimodal analysis | 🟡 PARTIAL | Available; ad hoc. |
| **Image generation** (FAL.ai, 9 models) | 🟡 PARTIAL | We route media through muapi recipes instead; Shay's built-in FAL gen is a redundant-but-unused path. |
| **Computer Use** (`shay computer-use`, cua-driver, macOS) | ⛔ NOT-USING | GAIN: full desktop GUI control for apps with no API/CLI. Ref: `features/computer-use.md`, `tools/computer_use/`. |

## Category 6 — Voice & Messaging

| Capability | Status | Notes / What we'd gain |
|---|---|---|
| **Messaging gateway** — 20+ platforms (Telegram, Discord, Slack, WhatsApp, Signal, Matrix, Teams, Email, SMS, Feishu…) | 🟡 PARTIAL | Gateway runs on `default` profile but no platform sessions in last 7d — effectively dormant. GAIN: talk to FAMtastic agents from phone/Telegram while builds run on the host. Ref: `messaging/index.md`. |
| **Voice mode** (real-time STT/TTS, Edge/ElevenLabs/NeuTTS, Discord VC) | ⛔ NOT-USING | GAIN: hands-free dictation/briefings. Ref: `features/voice-mode.md`, `tools/voice_mode.py`. |
| **Teams meeting pipeline** | ⛔ NOT-USING | GAIN: auto meeting notes/action items. Ref: `guides/operate-teams-meeting-pipeline.md`. |

## Category 7 — Integration & Runtime Surfaces

| Capability | Status | Notes / What we'd gain |
|---|---|---|
| **MCP client** (`shay mcp add`, per-tool filtering, OAuth) | ✅ USING | obsidian, basic-memory, vault-search wired. |
| **`shay mcp serve`** — expose Shay conversations *as* an MCP server to other agents | ⛔ NOT-USING | GAIN: let Claude Code / other agents call Shay-as-a-tool. Ref: `shay mcp serve`. |
| **API server** (OpenAI-compatible HTTP endpoint) | ✅ USING | 35 sessions / 37.5M tokens last 7d — this is a major live surface (likely the gateway/dashboard or `-z` pipelines). Ref: `features/api-server.md`. |
| **ACP editor integration** (VS Code/Zed/JetBrains, `shay acp`) | ⛔ NOT-USING | GAIN: Shay as editor-native coding agent with diffs/approvals inside the IDE. Ref: `features/acp.md`. |
| **`-z` one-shot / Python library / `acp`** scripting surfaces | 🟡 PARTIAL | `-z` likely used in scripts; Python library (`guides/python-library.md`) underused for embedding Shay in pipelines. |
| **Dashboard web UI** (`shay dashboard`, models/keys/sessions/embedded TUI chat) | 🟡 PARTIAL | Available; CLI-first habit. |
| **Insights / analytics** (`shay insights`) | 🟡 PARTIAL | Works (used for this audit); not a regular cost-watch ritual. GAIN: catch the 37.5M-token api_server burn before it surprises us. |

## Category 8 — Reliability, Safety & Cost

| Capability | Status | Notes / What we'd gain |
|---|---|---|
| **Fallback providers** (cross-provider failover) | ✅ USING | anthropic→gemini→local ollama chain configured. |
| **Credential pools** (same-provider multi-key rotation on 429/quota) | ⛔ NOT-USING | GAIN: directly addresses our documented "both vendor brains capped at once" pain (memory: codex_subscription_capped) — rotate multiple keys before falling back. Ref: `features/credential-pools.md`, `shay auth`. |
| **Checkpoints & `/rollback`** (shadow-git snapshots before destructive ops) | ⛔ NOT-USING (opt-in, off by default) | GAIN: one-command undo of bad writes/rm/sed during builds. Ref: `features/` checkpoints, `shay checkpoints`. |
| **Smart approval mode** (auxiliary-LLM risk scoring vs manual prompts) | 🟡 PARTIAL | Default `manual`. GAIN: `smart` mode auto-approves trivially-safe commands, only escalates real risk — less prompt friction in `--yolo`-adjacent flows. Ref: `user-guide/security.md`. |
| **Git worktrees** (parallel agents, isolated checkouts) | 🟡 PARTIAL | We have worktree tooling in the harness; Shay's `--worktree` flag + per-worktree checkpoint history underused. Ref: `user-guide/git-worktrees.md`. |
| **Terminal backends** — local/Docker/SSH/Daytona/Singularity/Modal (serverless hibernate) | ⛔ NOT-USING (local only) | GAIN: offload long builds/research to Modal/Daytona serverless that costs ~nothing idle, freeing the laptop. Ref: index "runs anywhere". |
| **Plugins** (custom tools/hooks/CLI commands) | ⛔ NOT-USING | GAIN: wrap FAMtastic-specific actions (trigger_build, site state) as first-class Shay tools/commands. Ref: `features/plugins.md`, `guides/build-a-hermes-plugin.md`. |

## Category 9 — Research / Training (likely out of scope, noted for completeness)

| Capability | Status | Notes |
|---|---|---|
| **Batch processing** (parallel prompts → ShareGPT trajectories) | ⛔ NOT-USING | GAIN: bulk-run research prompts / eval site copy at scale. Ref: `features/batch-processing.md`. |
| **RL training** (Atropos/Tinker, `rl_*` tools) | ⛔ NOT-USING | Out of scope unless fine-tuning a FAMtastic model. |
| **Trajectory export** | ⛔ NOT-USING | GAIN: dataset of our own agent runs for later tuning/eval. |

---

## Top capabilities we're leaving on the table (ranked)

1. **Persistent Goals / `/goal` (Ralph loop)** — biggest leverage-per-effort. Turns "keep going" babysitting into autonomous loop-until-done; aligns exactly with the repo's standing "ultracode / drive to goal" directive. (`features/goals.md`)
2. **`execute_code` programmatic tool calling** — collapses multi-step muapi/research pipelines into one turn; intermediate results bypass context. Direct token-cost win on a 64M-token/week footprint. (`features/code-execution.md`)
3. **Credential pools** — solves the documented dual-vendor-cap problem by rotating multiple keys before cross-provider fallback even fires. Low effort, high reliability. (`features/credential-pools.md`)
4. **External memory provider (Honcho)** — replaces hand-curated MEMORY.md with automatic dialectic user modeling; deepens personalization across sessions. (`features/honcho.md`, `features/memory-providers.md`)
5. **Webhooks + event hooks + automation templates** — move from cron-polling to event-driven (GitHub PR review on push, inbound-API builds) plus deterministic guardrails. (`features/hooks.md`, `messaging/webhooks.md`, `guides/automation-templates.md`)
6. **Serverless terminal backends (Modal/Daytona)** — offload long builds/research off the laptop, near-zero idle cost. (index)
7. **Checkpoints / `/rollback`** — cheap insurance against destructive build commands; currently fully off. (`shay checkpoints`)
8. **Custom plugin + profile distribution** — wrap FAMtastic build actions as native Shay tools and ship a reproducible agent bundle. (`features/plugins.md`, `user-guide/profile-distributions.md`)
9. **In-session `delegate_task` parallel batch** — fan-out without standing up a profile/board task. (`features/delegation.md`)
10. **`shay mcp serve` + ACP** — expose Shay to Claude Code and IDEs as a callable agent/tool. (`features/acp.md`)

## Redundant / superseded by our own stack (don't bother)

- Built-in **FAL image generation** and Shay's native **browser stack** — we already route media through muapi recipes and use dedicated Chrome/Playwright MCPs. Keep as fallback only.
- **RL training / batch trajectory** — irrelevant unless we start fine-tuning a model.

---

*Sources: `~/.shay/hermes-agent/website/docs/{index.md, integrations/index.md, user-guide/features/*.md, user-guide/*.md, guides/*.md}`; `~/.local/bin/shay {--help, cron list, kanban boards, mcp list, memory status, insights, config}`; `~/famtastic/shay-shay/tools/`; live docs https://hermes-agent.nousresearch.com/docs/.*