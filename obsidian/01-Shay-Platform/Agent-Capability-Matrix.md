---
title: Agent-Capability-Matrix
type: note
permalink: famtastic/01-shay-platform/agent-capability-matrix
---

# Agent Capability Matrix

Last updated: 2026-06-17 (reality-class second pass: separated curated inventory from proof-backed live surfaces for core agents, channels, revenue tools, and uncensored-LLM rows; preserves prior 2026-06-16 runtime backfill, 2026-06-15 shared-vault milestone, and 2026-06-02 humanize-writing install milestone)

## Legend

### Inventory status
- ✅ = Installed / available in the current environment
- ⚠️ = Partial / conditional / needs more validation
- ❌ = Not installed / not present
- 🔧 = In progress / being built
- 💰 = Paid/subscription required

### Reality class
- live_verified = checked directly in the current runtime or host environment
- documented_present = supported by a named local truth surface, but not re-verified live in this pass
- curated_partial = intentionally curated shorthand; useful inventory, not proof by itself
- seeded_target = planned/known target, not yet present

Status language in this note is inventory shorthand, not universal proof by itself. Treat each row as a curated pointer that should be backed by a named proof surface when the exact live state matters.

---

## Core Agents

| Agent | Type | Status | Reality class | Proof surface | Cost | Best For | Install Command |
|-------|------|--------|---------------|---------------|------|----------|-----------------|
| **Shay-Shay** | Orchestration | ✅ Available | live_verified | current active runtime + built-in tool surface in this session | API usage | Primary boss, research, coordination | Built-in |
| **Hermes** | Terminal Agent | ✅ Available | live_verified | current active runtime + built-in tool surface in this session | Free | Skills, cron, messaging, memory | `curl -fsSL .../install.sh \| bash` |
| **Claude Code** | Coding Agent | ✅ Available | documented_present | shared local workflow + installed skill/control surfaces in current repo docs | $20/mo | Features, PRs, code review | `npm install -g @anthropic-ai/claude-code` |
| **Codex** | Coding Agent | ✅ Available | documented_present | shared local workflow + installed skill/control surfaces in current repo docs | API usage | Fast coding, PRs | `npm install -g @openai/codex` |
| **OpenClaw** | Gateway | ❌ Not installed | seeded_target | curated inventory only | Free | Multi-agent routing, 21+ channels | `npm install -g openclaw@latest` |
| **Gemini CLI** | Research Agent | ❌ Not installed | seeded_target | curated inventory only | Free | Web research, multi-modal | `npm install -g @google/gemini-cli` |
| **Kimi** | Research/Swarm | ❌ Not installed | seeded_target | curated inventory only | Free tier | Deep research, 300-agent swarms | `npm install -g kimi` |
| **Opencode** | Coding Agent | ❌ Not installed | seeded_target | curated inventory only | Free | Code generation, devops | `npm install -g @opencode/cli` |
| **NotebookLM** | Knowledge Engine | ❌ Not installed | seeded_target | curated inventory only | Free | Document synthesis, podcasts | Web app |
| **Cowork** | Coding Agent | ⚠️ Partial | curated_partial | older inventory row; exact runtime/install state not re-verified in this pass | API usage | Claude Code alternative | `npm install -g @anthropic-ai/cowork` |

---

## UI / Dashboard Agents

| Agent | Type | Status | Reality class | Proof surface | Cost | Best For | Install Command |
|-------|------|--------|---------------|---------------|------|----------|-----------------|
| **Hermes Workspace** | Web UI | ❌ Not installed | seeded_target | curated inventory only | Free | Native Hermes GUI, Swarm mode | One-line install script |
| **Mission Control** | Fleet Ops | ❌ Not installed | seeded_target | curated inventory only | Free | Multi-agent orchestration, cost tracking | `pnpm start` or Docker |
| **Hermes Web UI** | Analytics | ❌ Not installed | seeded_target | curated inventory only | Free | Token/cost analytics, scheduler | `npm install -g hermes-web-ui` |

---

## Memory Systems

| System | Type | Status | Reality class | Proof surface | Cost | Best For | Install Command |
|--------|------|--------|---------------|---------------|------|----------|-----------------|
| **Hermes FTS5** | Built-in | ✅ Available | documented_present | built-in transcript recall surface documented in Hermes runtime behavior | Free | Session search, summarization | Built into Hermes |
| **Built-in MEMORY.md / USER.md** | Curated agent memory | ✅ Available | live_verified | current runtime injects MEMORY/USER profile surfaces and exposes memory tool behavior in-session | Free | Durable user preferences, environment facts, compact always-loaded context | Built into Hermes |
| **Obsidian Vault + basic-memory MCP** | Shared vault memory | ✅ Available | live_verified | verified via `shay mcp list` (`basic-memory` enabled) | Free | Cross-session knowledge, shared notes, capability updates visible to all sessions through the vault | Built into current FAMtastic vault workflow |
| **vault-search MCP** | Semantic vault retrieval | ✅ Available | live_verified | verified via `shay mcp list` (`vault-search` enabled) | Free | Semantic recall over the Obsidian vault when keyword search is too brittle | Enabled via local HTTP MCP server |
| **session_search** | Transcript recall | ✅ Available | live_verified | current runtime exposes `session_search` tool in-session | Free | Search prior Hermes/Shay sessions with FTS5 + LLM summarization | Built into Hermes |
| **Mnemosyne** | Universal | ❌ Not installed | seeded_target | curated inventory only | Free | SQLite + vector + temporal KG | `pip install mnemosyne-memory` |
| **SkillClaw** | Skill Evolution | ❌ Not installed | seeded_target | curated inventory only | Free | Auto-evolve skills from sessions | Shell installer |
| **plur** | Portable | ❌ Not installed | seeded_target | curated inventory only | Free | Cross-tool memory in YAML | `npx @plur-ai/mcp init` |
| **hindsight** | Enterprise | ❌ Not installed | seeded_target | curated inventory only | 💰 API | Long-term memory, Fortune 500 | Docker container |

---

## Plugins / Extensions

| Plugin | Type | Status | Reality class | Proof surface | Cost | Best For | Install Command |
|--------|------|--------|---------------|---------------|------|----------|-----------------|
| **Evey Plugins** | Autonomy Suite | ❌ Not installed | seeded_target | curated inventory only | Free | 23 plugins: council, telemetry, safety | `git clone + copy to ~/.hermes/plugins/` |
| **rtk-hermes** | Compression | ❌ Not installed | seeded_target | curated inventory only | Free | 60-90% token reduction | `pip install rtk-hermes` |
| **camofox-browser** | Stealth Browser | ❌ Not installed | seeded_target | curated inventory only | Free | Bypass Cloudflare, bot detection | Docker or binary |
| **hermes-curator-evolver** | Skill Evolution | ❌ Not installed | seeded_target | curated inventory only | Free | Evidence-driven skill evolution | `hermes plugins install` |
| **agent-analytics** | Telemetry | ❌ Not installed | seeded_target | curated inventory only | 💰 Account | Multi-project analytics | `hermes plugins install` |

---

## Skills Libraries

| Library | Count | Status | Reality class | Proof surface | Cost | Best For | Install Command |
|---------|-------|--------|---------------|---------------|------|----------|-----------------|
| **Runtime skill catalog** | 183 | ✅ Available | live_verified | verified via `skills_list` in current runtime | Free | Full current skill surface exposed to this Shay runtime across automation, wiki, devops, media, MCP, Apple, and research flows | Verified via `skills_list` in current runtime |
| **Built-in Skills** | ~40 | ✅ Available | documented_present | built-in runtime tool/skill surface in the active session; approximate count remains shorthand | Free | Core web, file, browser, image, TTS, cron, delegation, messaging, and memory tools | Built into Hermes |
| **wondelai/skills** | 50+ | ❌ Not installed | seeded_target | curated inventory only | Free | Product, UX, marketing, code | `npx skills add wondelai/skills` |
| **Anthropic Cybersecurity** | 754 | ❌ Not installed | seeded_target | curated inventory only | Free | Security, MITRE ATT&CK | Clone + point agent |
| **Open Design** | 132 | ❌ Not installed | seeded_target | curated inventory only | Free | Design systems, media gen | `pnpm + Node 22` |
| **MeiGen MCP** | 1,446 prompts | ❌ Not installed | seeded_target | curated inventory only | 💰 Key | Image/video generation | `npm install -g meigen` |

### Installed Studio / Claude Code Skills (`.claude/skills/`)

Shared skill pool available to any Claude Code or Studio session. Mirrored to Shay's own pool (`shay-agent-os/skills/`) where noted.

| Skill | Status | Reality class | Proof surface | Cost | Best For | Installed where |
|-------|--------|---------------|---------------|------|----------|-----------------|
| **humanize-writing** | ✅ Available | documented_present | `docs/capability-registry.md` + `shay-agent-os/AGENTS.md` | Free | Remove AI tells, normalize burstiness, voice-calibrate prose >3 paragraphs | `.claude/skills/` **+ `shay-agent-os/skills/`** |
| **ask-claude** | ✅ Available | documented_present | `docs/capability-registry.md` | API usage | Escalate hard calls to Claude from non-Claude flows; second-opinion line | `scripts/ask-claude` **+ `shay-agent-os/skills/`** |
| **logo-transparent** | ✅ Available | documented_present | `docs/capability-registry.md` | Free | Background removal + transparent PNG cleanup for logos/images | `.claude/skills/` **+ `shay-agent-os/skills/`** |
| **gap-analysis** | ✅ Available | documented_present | `docs/capability-registry.md` | Free | Structured gap auditing: inventory → needed → diff → sequenced fixes | `.claude/skills/` **+ `shay-agent-os/skills/`** |
| **recover-codex-research** | ✅ Available | documented_present | `docs/capability-registry.md` | Free | Recover Codex session transcripts into staging/markdown so research survives reinstall | `scripts/recover-codex-research.sh` |
| adobe-firefly | ✅ Available | curated_partial | listed in shared skill pool, but direct runtime verification not performed in this pass | 💰 Key | AI image generation | `.claude/skills/` |
| brainstorm / site-studio / export-site | ✅ Available | curated_partial | listed in shared skill pool, but each flow was not re-verified in this pass | API usage | Site factory flows | `.claude/skills/` |
| register-credential | ✅ Available | curated_partial | listed in shared skill pool, but direct runtime verification not performed in this pass | Free | Vault a secret + verify the dependent capability | `.claude/skills/` |
| remotion-best-practices | ✅ Available | curated_partial | listed in shared skill pool, but direct runtime verification not performed in this pass | Free | Remotion video creation | `.claude/skills/` |

Source for humanize-writing: `github.com/aaaronmiller/humanize-writing` (installed 2026-06-02). Additional installed-skill evidence: `docs/capability-registry.md`.

### Installed Shay Agent OS Skills (`shay-agent-os/skills/`)

Confirmed in `shay-agent-os/AGENTS.md` as the local Shay-specific skill pool.

| Skill | Status | Reality class | Proof surface | Best For |
|-------|--------|---------------|---------------|----------|
| dead-wire-detector | ✅ Available | documented_present | `shay-agent-os/AGENTS.md` installed-skills section | Detecting dead UI wires / missing execution paths |
| typed-screen-manifest | ✅ Available | documented_present | `shay-agent-os/AGENTS.md` installed-skills section | Typed screen/state manifests for UI work |
| claude-desktop-style-match | ✅ Available | documented_present | `shay-agent-os/AGENTS.md` installed-skills section | Matching Claude Desktop style / shell behavior |
| render-spine-guard | ✅ Available | documented_present | `shay-agent-os/AGENTS.md` installed-skills section | Protecting render-spine assumptions during UI edits |
| visual-qa-gate | ✅ Available | documented_present | `shay-agent-os/AGENTS.md` installed-skills section | Visual QA gates before claiming UI closure |
| micro-patch-living-file | ✅ Available | documented_present | `shay-agent-os/AGENTS.md` installed-skills section | Surgical edits against active files without broad churn |
| settings-store-snapshot-cache | ✅ Available | documented_present | `shay-agent-os/AGENTS.md` installed-skills section | Settings store snapshots and cache consistency checks |
| humanize-writing | ✅ Available | documented_present | `shay-agent-os/AGENTS.md` + `docs/capability-registry.md` | Standing prose-output humanization filter |

### Runtime Control Surfaces

Verified directly from the current Shay runtime on 2026-06-16.

| Surface | Status | Reality class | Proof surface | Live evidence | Best For |
|---------|--------|---------------|---------------|---------------|----------|
| `shay mcp list` | ✅ Available | live_verified | direct runtime command output from prior 2026-06-16 verification pass | `obsidian`, `basic-memory`, and `vault-search` all enabled | Verifying live MCP connectivity before assuming brain surfaces are available |
| `shay cron list` | ✅ Available | live_verified | direct runtime command output from prior 2026-06-16 verification pass | 4 active jobs: bookmark ingest, Telegram morning briefing, overnight readiness audit, morning readiness ping | Scheduled automation and unattended reporting |
| `shay kanban boards` | ✅ Available | live_verified | direct runtime command output from prior 2026-06-16 verification pass | `default` board live with pending/ready/blockers history | Task orchestration and board-backed work tracking |
| `shay profile list` | ✅ Available | live_verified | direct runtime command output from prior 2026-06-16 verification pass | `default` profile running; `trader` profile stopped | Multi-profile runtime separation |

### Local Shay Agent OS Models / Infra

Confirmed in `shay-agent-os/AGENTS.md`.

| Component | Status | Reality class | Proof surface | Best For |
|-----------|--------|---------------|---------------|----------|
| `hermes3:latest` | ✅ Available | documented_present | `shay-agent-os/AGENTS.md` local-model section | General local reasoning |
| `qwen2.5:1.5b` | ✅ Available | documented_present | `shay-agent-os/AGENTS.md` local-model section | Fast worker tasks |
| `phi4-mini:latest` | ✅ Available | documented_present | `shay-agent-os/AGENTS.md` local-model section | Review / analysis |
| Redis (`homebrew.mxcl.redis`) | ✅ Available | documented_present | `shay-agent-os/AGENTS.md` notes Redis running via Homebrew | Local coordination / message-passing support |

---

## Communication Channels

| Channel | Status | Reality class | Proof surface | Cost | Best For |
|---------|--------|---------------|---------------|------|----------|
| **Telegram** | ✅ Available | documented_present | standing Shay/Hermes messaging workflow documented across local truth surfaces; not re-sent in this pass | Free | Primary notifications |
| **Discord** | ❌ Not installed | seeded_target | curated inventory only | Free | Community, team |
| **Slack** | ❌ Not installed | seeded_target | curated inventory only | Free | Enterprise |
| **WhatsApp** | ❌ Not installed | seeded_target | curated inventory only | Free | International |
| **Signal** | ❌ Not installed | seeded_target | curated inventory only | Free | Privacy |
| **Email** | ⚠️ Partial | curated_partial | older inventory row; exact configured send path not re-verified in this pass | Free | Formal comms |
| **iMessage** | ✅ Available | documented_present | Apple-side channel is supported in the loaded skill catalog (`apple/imessage`); direct send path not re-tested in this pass | Free | Apple ecosystem |

---

## Revenue Tools

| Tool | Status | Reality class | Proof surface | Cost | Best For |
|------|--------|---------------|---------------|------|----------|
| **Stripe** | ❌ Not installed | seeded_target | curated inventory only | 2.9% + 30¢ | Billing, subscriptions |
| **FAMtastic Site Studio** | 🔧 In progress | documented_present | FAMtastic repo doctrine + active project context; exact runtime/deploy state varies by workspace | API usage | Site factory |
| **Media Studio** | 🔧 In progress | curated_partial | strategic direction is documented, but install/runtime surface is not yet unified in one proof-bearing control plane | API usage | Logo, brand, media |
| **Component Studio** | ❌ Not started | seeded_target | strategic target only | API usage | Reusable components |

---

## Jailbroken / Uncensored LLMs

| Model | Status | Reality class | Proof surface | Cost | Best For | Access |
|-------|--------|---------------|---------------|------|----------|--------|
| **Gemma 4** | ❌ Not installed | seeded_target | curated inventory only | Free | Open weights, uncensored | HuggingFace |
| **OBLITERATUS** | ✅ Available | documented_present | available through the loaded built-in skill catalog in current runtime | Free | Remove refusals | Built-in skill |
| **GODMODE** | ✅ Available | documented_present | available through the loaded built-in skill catalog in current runtime | Free | Jailbreak prompts | Built-in skill |
| **ULTRAPLINIAN** | ✅ Available | documented_present | available through the loaded built-in skill catalog in current runtime | Free | Unfiltered reasoning | Built-in skill |
| **Local LLMs (llama.cpp)** | ❌ Not installed | seeded_target | curated inventory only | Free | Private inference | `llama.cpp` |

---

## Reality-class notes

- Rows marked `live_verified` were checked directly in the current runtime/host during this reconstruction pass or the immediately preceding runtime-control backfill.
- Rows marked `documented_present` are grounded in a named local truth surface, but the exact live state was not re-queried in this pass.
- Rows marked `curated_partial` should be treated as useful working inventory, not closure-proof. They are the next candidates for either live verification or downgrade.
- Rows marked `seeded_target` belong to roadmap/inventory space only. They should not be used as evidence that capability exists.

---

## Tags
#agent-os #capabilities #inventory #matrix #shay-shay #hermes #claude #codex