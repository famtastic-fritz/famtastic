---
title: PLATFORM-INTEL-CAPTURE-2026-05-19
type: note
permalink: famtastic/01-shay-platform/platform-intel-capture-2026-05-19
---

## PLATFORM-INTEL-CAPTURE-2026-05-19.md

23.85 KB •399 lines•Formatting may be inconsistent from source  
\# FAMtastic Platform & Agent Intel Capture

\*Date: May 19, 2026\*  
\*Author: Fritz Medine (synthesis from Claude Web session)\*  
\*Status: Canonical reference for the agent/architecture decisions made this session\*

\---

\#\# Purpose

This is the master capture of every architectural decision, agent evaluation, and intel point gathered in our May 19 session. It exists so:

1\. \*\*Shay-Shay can read it\*\* on first wake and understand the whole shape, not just her own slice  
2\. \*\*Future Claude Web sessions\*\* don't have to re-derive what we already figured out  
3\. \*\*The next agent we add\*\* (or any parallel Shay instance) lands on a single doc instead of scattered chats  
4\. \*\*The decisions are visible\*\* — what we picked up, what we passed on, and why

If you're reading this on a fresh wake: this complements \`FAMTASTIC-STATE.md\` (current platform state) and \`SHAY-IDENTITY-2026-05-19.md\` (Shay's foundational doc). Read all three.

\---

\#\# The Big Picture

FAMtastic is no longer a single Studio. It's a \*\*three-studio platform\*\* with an \*\*always-on orchestration agent\*\* (Shay) and a \*\*parallel multi-agent execution layer\*\* beneath that.

\`\`\`  
                    THE FAMTASTIC PLATFORM (May 2026\)  
   ┌──────────────────────────────────────────────────────────────────────┐  
   │                                                                       │  
   │                            ┌─────────────┐                            │  
   │                            │   FRITZ     │                            │  
   │                            │  (the human)│                            │  
   │                            └──────┬──────┘                            │  
   │                                   │                                   │  
   │                                   ▼                                   │  
   │                            ┌─────────────┐                            │  
   │                            │  SHAY-SHAY  │  ◄── lives on Hetzner      │  
   │                            │  (always on)│      Telegram \= phone      │  
   │                            └──────┬──────┘      learns Fritz          │  
   │                                   │            orchestrates           │  
   │            ┌──────────────────────┼──────────────────────┐            │  
   │            ▼                      ▼                      ▼            │  
   │     ┌────────────┐         ┌────────────┐         ┌────────────┐      │  
   │     │ SITE       │         │ MEDIA      │         │ COMPONENT  │      │  
   │     │ STUDIO     │         │ STUDIO     │         │ STUDIO     │      │  
   │     │            │         │            │         │            │      │  
   │     │ \- briefs   │         │ \- text→img │         │ \- HTML     │      │  
   │     │ \- builds   │         │ \- text→vid │         │   elements │      │  
   │     │ \- deploys  │         │ \- assembly │         │ \- mobile   │      │  
   │     │ \- regrows  │         │            │         │ \- games    │      │  
   │     │            │         │ Sana?      │         │            │      │  
   │     │ MBSH LIVE  │         │ Remotion?  │         │ greenfield │      │  
   │     │ ✓ shipped  │         │ TBD        │         │            │      │  
   │     └────────────┘         └────────────┘         └────────────┘      │  
   │                                                                       │  
   │            Each repo separate: famtastic-fritz/{site, media,         │  
   │            component, shay-shay}-studio                              │  
   │                                                                       │  
   └──────────────────────────────────────────────────────────────────────┘  
                                     │  
                                     ▼  
   ┌──────────────────────────────────────────────────────────────────────┐  
   │                    THE PARALLEL AGENT EXECUTION LAYER                 │  
   │                                                                       │  
   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │  
   │  │ Claude Code  │  │ Claude Code  │  │ Codex local  │  │ Codex    │ │  
   │  │ local        │  │ cloud        │  │ (review)     │  │ cloud    │ │  
   │  │ (worktree A) │  │ (long /goal) │  │              │  │          │ │  
   │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └────┬─────┘ │  
   │         │                 │                 │                │       │  
   │         └────────┬────────┴─────────────────┴────────────────┘       │  
   │                  │                                                    │  
   │                  ▼                                                    │  
   │           Every agent emits hook events                               │  
   │                  │                                                    │  
   │                  ▼                                                    │  
   │  ┌──────────────────────────────────────────────────────────────┐   │  
   │  │            UNIFIED OBSERVABILITY DASHBOARD                    │   │  
   │  │  Agent View (Anthropic native) \+ agents-observe \+ Sidecar     │   │  
   │  └──────────────────────────────────────────────────────────────┘   │  
   │                                                                       │  
   └──────────────────────────────────────────────────────────────────────┘  
\`\`\`

\*\*Read the diagram as a sandwich:\*\* Fritz on top, three studios in the middle, parallel agents underneath doing the actual work, observability watching all of it. Shay is the layer that connects Fritz to everything below.

\---

\#\# The Parallel Architecture — Why It Matters

This is the shift you've been driving toward for weeks. The old shape was sequential: one Claude Code session at a time, one Codex session at a time, all single-threaded.

The new shape is parallel:

\- \*\*Multiple Claude Code sessions\*\* running simultaneously, each in its own \*\*git worktree\*\* or \*\*Docker container\*\*  
\- \*\*Codex local \+ Codex cloud\*\* running review or implementation in parallel with Claude Code  
\- \*\*Each session can hold a long-running \`/goal\`\*\* that keeps working across turns until completion  
\- \*\*Hermes (now Shay)\*\* as the always-on supervisor — never sleeps, pushes you on Telegram when something needs you  
\- \*\*Observability dashboard\*\* so you can see what's running, what's blocked, what's done — without juggling terminal tabs

The architectural unlock isn't "wait, then build." It's \*\*fan out NOW \+ add observability.\*\*

\---

\#\# Agent Harnesses — What We're Picking Up From Each

\#\#\# Hermes Agent → Shay-Shay (USING — became Shay May 19, 2026\)

\*\*What it is:\*\* Open-source agent kernel from Nous Research. MIT licensed. Persistent agent with self-learning loop, IM gateway (Telegram/Discord/Slack/WhatsApp/Signal), subagents, cron, \`/goal\` command, MCP support. 153k stars. v0.14.0 shipped May 16, 2026\.

\*\*What we lifted (rebrand \= mostly cosmetic):\*\*  
\- The full kernel — memory, IM gateway, subagents, cron, MCP  
\- The self-learning loop (skill creation from experience, agent-curated memory)  
\- The SOUL.md personality system → became Shay's identity slot  
\- The terminal TUI  
\- Built-in \`/goal\` support

\*\*What we replaced:\*\*  
\- SOUL.md content → Shay's FAMtastic identity  
\- Brand assets (banner, colors, prompt)  
\- Binary name (\`hermes\` → \`shay\`)  
\- Skills directory → adds FAMtastic-specific skills over time

\*\*Decision:\*\* Shay IS Hermes underneath. The rebrand was a weekend reskin, not a rewrite. Hermes shipped everything Shay needs to do; we just made her Fritz's.

\---

\#\#\# DeerFlow 2.0 (PARTIAL LIFT — research and skill patterns)

\*\*What it is:\*\* ByteDance super-agent harness. LangGraph \+ LangChain Python. 68k stars. v2.0 released late February 2026 — ground-up rewrite from v1. Built for long-horizon tasks: research, code, content workflows.

\*\*What we want to lift:\*\*  
\- \*\*Skill-based research workflow\*\* — DeerFlow's research skill could be ported into Shay  
\- \*\*Per-task sandbox\*\* with \`/mnt/user-data/{uploads, workspace, outputs}\` — clean separation pattern worth adopting in Site Studio  
\- \*\*Sub-agent fan-out\*\* with structured report-back — pattern matches our existing adversarial review concept  
\- \*\*Skill loading discipline\*\* — only load skills when needed, not all at once (keeps context windows lean)

\*\*What we're NOT taking:\*\*  
\- Their full harness — Shay has Hermes underneath; we don't need a second harness  
\- LangGraph dependency — Shay's stack is simpler

\*\*Status:\*\* Reference only. Shay can read DeerFlow's skill format and port what's useful.

\---

\#\#\# OpenClaw (REFERENCE — Hermes's parent)

\*\*What it is:\*\* The agent platform Hermes forked from. 300k+ stars. Has features Hermes is still catching up to:  
\- \*\*Dreaming\*\* — 3-stage memory consolidation  
\- \*\*Standing Orders\*\* — long-term persistent directives  
\- \*\*ClawHub\*\* — 5700+ community skills

\*\*What we want to watch:\*\*  
\- Hermes is gradually absorbing OpenClaw's better ideas. Watch their release notes.  
\- The skills marketplace pattern (ClawHub) is informative for our own future skills hub  
\- "Standing Orders" maps to our FAMtastic DNA principles — persistent rules that shape every interaction

\*\*Status:\*\* Don't fork; watch upstream.

\---

\#\#\# GSD v2 (USING — Fritz downloaded)

\*\*What it is:\*\* "Get Shit Done" v2 by \`gsd-build\`. 59k+ stars. Standalone CLI built on the Pi SDK with direct TypeScript control of the agent harness. Solves context rot by externalizing state.

\*\*What it does for us:\*\*  
\- Clears context between tasks (fresh window per dispatched plan)  
\- Injects exactly the right files at dispatch time  
\- Manages git branches automatically  
\- Tracks cost and tokens per task  
\- Detects stuck loops  
\- Recovers from crashes  
\- Auto-advances milestones  
\- Atomic git commits per task

\*\*Where it fits:\*\* Inside each Claude Code or Codex session. Layer underneath the agent that handles context discipline so we don't burn context on orchestration overhead.

\*\*Status:\*\* Installed. Use for any multi-phase Site Studio session.

\---

\#\#\# Superpowers v2 (USING — Fritz downloaded \~2 days ago)

\*\*What it is:\*\* Auto-triggering skills methodology by \`obra\`. Works across Claude Code, Codex, Cursor. Codifies a five-stage flow: brainstorm → spec → plan → execute → review.

\*\*What it does for us:\*\*  
\- Formalizes the adversarial review pattern we've been doing ad hoc  
\- Auto-triggers the right phase based on the request shape  
\- Brings structure to vibe-coded sessions

\*\*Where it fits:\*\* Layer ON TOP of Claude Code / Codex. Disciplines the workflow.

\*\*Status:\*\* Installed. Wire into Site Studio sessions going forward.

\---

\#\# Anthropic-Native Capabilities (Claude Code 2.1.139, May 11–12, 2026\)

\#\#\# \`/goal\` Command (USING)

Set a completion condition. Claude works autonomously across turns — hours, days — until the goal is met. Tracks elapsed time, turns, tokens in overlay. Has a \*\*supervisor architecture\*\*: a separate fresh-context Claude session audits the final state before declaring done.

\*\*Available in:\*\* interactive mode, \`-p\` flag, Remote Control. Also integrated into Codex CLI and Claude Code Mobile.

\*\*Limitation:\*\* sessions are local. Laptop sleeps → they stop. Run on Hetzner / Railway over SSH for overnight \`/goal\` runs. (This is exactly Shay's box.)

\*\*Pattern:\*\* Pair \`/goal\` with \`/bg\` (send to background) and Agent View (the dashboard) for a real multi-agent workflow.

\#\#\# Agent View (USING)

\`claude agents\` opens a single dashboard for every Claude Code session — running / blocked / done. Spacebar to peek, Enter to attach. Names sessions with \`/rename\` for readability.

\`claude \--bg \[task\]\` spawns new background sessions directly.

\*\*Mental model:\*\* like tmux built specifically for Claude Code. Replaces the "six terminal tabs" pattern.

\#\#\# \`anthropics/cwc-long-running-agents\` (PATTERNS)

Anthropic's official example repo from "Code with Claude 2026" Long-Running Agents station. Take-home patterns, not a turnkey harness.

\*\*What we lift:\*\*  
\- \*\*Default-FAIL contract\*\* — every criterion starts false; agent must produce evidence to flip  
\- \*\*Fresh-context evaluator subagent\*\* — separate agent with no Write/Edit tools reviews diffs from a context window that never saw the build  
\- \*\*PROGRESS.md self-handoff\*\* — agent maintains its own state file across session restarts  
\- \*\*Git checkpoint commits\*\* — meaningful checkpoints so \`git log\` is a second record

\*\*Status:\*\* Cherry-pick the patterns into Shay's skill library.

\---

\#\# Observability Stack — The Critical Piece

When you run 3–5 parallel agents, you can't track them mentally. You need dashboards. Multiple options exist; pick one or stack them:

| Tool | What It Does | Strength |  
|---|---|---|  
| \*\*Agent View\*\* (Anthropic native) | Built into Claude Code 2.1.139 | Zero setup, works with \`/goal\` and \`/bg\` out of the box |  
| \*\*\`simple10/agents-observe\`\*\* | Real-time hook event stream to React dashboard at localhost | Multi-agent, captures every tool call, fastest to stand up |  
| \*\*\`disler/claude-code-hooks-multi-agent-observability\`\*\* | Hooks → Bun server → SQLite → WebSocket → Vue dashboard | More mature, swim lanes per agent |  
| \*\*\`nexus-labs-automation/agent-observability\`\*\* | Claude Code plugin, 14 instrumentation skills, framework guides | Best if you also want LangGraph/CrewAI/AutoGen coverage |  
| \*\*\`jrenaldi79/sidecar\`\*\* | Parallel AI window — forks Claude Code conversations to Gemini/GPT/DeepSeek/OpenRouter | Cross-model verification without leaving the session |  
| \*\*OpenTelemetry\*\* (Agent SDK native) | Production traces to Honeycomb/Datadog/Grafana/Langfuse | Use when going to production scale |

\*\*Recommendation:\*\* Start with \*\*Agent View \+ agents-observe\*\*. Add Sidecar when you need cross-model checks. Add OpenTelemetry when production volume justifies.

\---

\#\# Media Generation Candidates (Media Studio Engine — Still Open)

\#\#\# Sana (CANDIDATE — engine of choice)

NVlabs. Apache 2.0. Linear Diffusion Transformer. 6.3k stars. \*\*20× smaller and 100× faster than Flux-12B.\*\* ICLR 2025 Oral, ICML 2025, ICCV 2025, ICLR 2026 Oral.

Variants:  
\- \*\*SANA-Sprint\*\* — 0.1s per 1024px image on H100, 0.3s on RTX 4090\. One/few-step generator.  
\- \*\*SANA-1.5\*\* — 4.8B params, top-tier quality  
\- \*\*SANA-Video\*\* — 5s linear DiT video, plus minute-length real-time with LongLive  
\- \*\*SANA-WM\*\* — 2.6B controllable world model, 720p / 1-min video with 6-DoF camera control  
\- \*\*LoRA training built-in\*\*  
\- \*\*4-bit quantization\*\* runs in 8GB VRAM  
\- \*\*ControlNet support\*\*

\*\*Why it matters:\*\* Open source, fast, trainable. Can run on Replicate ($5–10 test budget), then own hardware later. LoRA training is the path to brand coherence (consistent character generation across many sites).

\*\*Status:\*\* Not yet tested. First action item for Media Studio.

\#\#\# Remotion (CANDIDATE — assembly layer)

\`remotion-dev/remotion\`. 37.5k stars. \*\*Programmatic video in React/TS.\*\* Free for individuals and small companies; $100/mo Automator tier when scaled. Build-time renders stay free at any scale.

\*\*Why it matters:\*\* Site Studio's actual use case for Remotion isn't "make a promo video." It's \*"a site div needs an animated background → Media Studio fires a Remotion template → returns the asset."\* That's a build-time render — free.

\*\*Pattern:\*\* Remotion components live in Media Studio. Site Studio calls them with parameters. The output is a video asset that drops into the page.

\*\*Status:\*\* Candidate for the assembly layer once Sana lands.

\#\#\# What Failed (Don't Repeat)

\- \*\*Open Design as Media Studio starting point\*\* — tested for logo generation. Results were terrible.  
\- \*\*Claude Design (Anthropic's image gen)\*\* — also tested for logo generation. Not much better.

\*\*Lesson:\*\* General-purpose design models don't produce brand-coherent logos. The path forward is probably: \*\*Sana \+ LoRA fine-tune on brand seed → coherent logo set per brand.\*\* Open question; needs validation.

\---

\#\# Memory Architectures (For Future Reference)

| System | Type | Lock-in | Best For |  
|---|---|---|---|  
| \*\*Mem0\*\* | Drop-in memory layer | Low | Adding memory to any agent without rewriting |  
| \*\*Letta\*\* | Full agent runtime | High | Greenfield agent platforms |  
| \*\*Zep\*\* | Temporal knowledge graph | Medium | Tracking how facts about a user evolve over time |  
| \*\*Cognee\*\* | Local knowledge graph | Low | Privacy-sensitive, on-device memory |

\*\*Status:\*\* Shay uses Hermes's native memory. Reference table only. If we want to graduate to a more sophisticated system later, this is the menu.

\---

\#\# Adobe Replacement Plan (If We Cancel)

Per the question that came up: if Adobe gets cut, what fills the gaps?

| Adobe Tool | Used For | Replacement | Cost |  
|---|---|---|---|  
| \*\*Photoshop\*\* (via adb-mcp) | Programmatic image editing, Generative Fill/Expand, batch finishing | \*\*Affinity Photo 2\*\* \+ tacyan MCP | $70 one-time |  
| \*\*Premiere Pro\*\* (via adb-mcp) | Video editing/finishing, multi-clip stitching, color grading | \*\*DaVinci Resolve\*\* (free) | $0 |  
| \*\*Firefly web app\*\* | Manual image/video gen, style reference, partner models | \*\*Sana / Flux / Imagen / Leonardo\*\* | Existing stack |  
| \*\*Illustrator\*\* | Vector editing | \*\*Affinity Designer 2\*\* or \*\*Inkscape\*\* | $70 one-time / free |  
| \*\*Lightroom\*\* | Photo enhancement | \*\*Affinity Photo 2\*\* or \*\*Darktable\*\* | included / free |

\*\*Affinity Suite v2 bundle\*\* (Photo \+ Designer \+ Publisher) \= \*\*$165 one-time, no subscription.\*\* Roughly two months of current Adobe pricing, owned forever. tacyan's Affinity MCP gives the programmatic control surface that adb-mcp provides today.

\*\*Decision framework (not a recommendation):\*\*  
\- Heavy non-FAMtastic Adobe use → keep Adobe  
\- FAMtastic-only Adobe use \+ adb-mcp UXP still broken → cancel \+ Affinity stack  
\- Unclear → have Shay run a 30-day usage audit, then decide

\---

\#\# Master Decision Table — What We're Picking Up vs Leaving

| Tool / Pattern | Status | Where It Lives |  
|---|---|---|  
| Hermes Agent kernel | ✓ Using (as Shay) | \`famtastic-fritz/shay-shay\` |  
| DeerFlow research skill | Partial lift | Port into Shay's skills |  
| DeerFlow sandbox pattern | Partial lift | Adopt for Site Studio per-task sandboxes |  
| OpenClaw Dreaming / Standing Orders | Watch upstream | Hermes will absorb |  
| GSD v2 | ✓ Using | Inside each Claude Code session |  
| Superpowers v2 | ✓ Using | On top of Claude Code / Codex |  
| \`/goal\` command | ✓ Using | Native to Claude Code 2.1.139 |  
| Agent View | ✓ Using | Native to Claude Code 2.1.139 |  
| \`cwc-long-running-agents\` patterns | Cherry-pick | Into Shay's skills |  
| agents-observe | Candidate (pick one) | Local dashboard |  
| Sidecar | ✓ Using | Cross-model verification |  
| OpenTelemetry | Defer until scale | Production observability |  
| Sana | Candidate (test next) | Media Studio engine |  
| Remotion | Candidate | Media Studio assembly layer |  
| Open Design | ✗ Rejected | Failed logo test |  
| Claude Design | ✗ Rejected | Failed logo test |  
| Mem0 / Letta / Zep / Cognee | Reference only | Future memory upgrade menu |  
| Affinity Suite | Decision pending | Adobe replacement if we cancel |  
| DaVinci Resolve | Decision pending | Premiere replacement if we cancel |

\---

\#\# Open Problems / Decisions Still on the Board

1\. \*\*Media Studio engine\*\* — Sana \+ Remotion is the candidate stack. Needs a Replicate test ($5–10) to validate. Logo generation specifically needs LoRA fine-tune approach validation.

2\. \*\*Component Studio starting point\*\* — still greenfield. No engine selected yet.

3\. \*\*Adobe subscription\*\* — keep or cancel? Decision deferred until usage audit (Shay can run).

4\. \*\*Telegram setup for Shay\*\* — token captured during rebrand, but no chat ID yet. Fritz needs to \`/start\` the bot from his phone to capture chat ID, OR set up directly through Shay's \`shay gateway setup\`.

5\. \*\*MBSH design updates\*\* — pending. Not urgent (site is live). Queue when ready.

6\. \*\*Logo generation approach\*\* — Open Design failed. Claude Design failed. Sana \+ LoRA is the bet. Needs proof.

7\. \*\*Site Studio gaps\*\* — known to exist. A parallel Shay instance may end up focused here.

8\. \*\*Observability dashboard pick\*\* — Agent View is free with Claude Code. Add agents-observe when multi-agent traffic justifies it.

9\. \*\*\`adb-mcp\` UXP plugin status\*\* — last we checked, had a \`require('fs')\` compatibility issue. Verify current state before making the Adobe keep/cancel call.

10\. \*\*Imagen model deprecation\*\* — \`imagen-4.0-generate-001\` migration deadline is June 24, 2026\. Verify before next API call; migrate to \`gemini-2.5-flash-image\` if needed.

\---

\#\# Next Concrete Moves (Any Order, None Blocking)

\- \*\*Wake Shay\*\* (drop the brief, run \`shay\`, verify her orientation pass)  
\- \*\*Set up Shay's Telegram\*\* (\`shay gateway setup\`, paste token, \`/start\` from phone)  
\- \*\*Verify Agent View is live\*\* (\`claude \--version\` ≥ 2.1.139, then \`claude agents\`)  
\- \*\*Test Sana via Replicate\*\* (\~$5–10) on a logo generation task  
\- \*\*Stand up agents-observe\*\* (one install, immediate visibility into parallel runs)  
\- \*\*Run an Adobe usage audit\*\* via Shay (30 days observation → real keep/cancel call)  
\- \*\*Pick first FAMtastic skill to write for Shay\*\* — candidates: site-deploy, MBSH-tend, intelligence-loop-report, gap-promotion

Each of these is independent. Run them in parallel. The whole point of the new architecture is that they don't block each other.

\---

\#\# A Note on How We Got Here

The journey from "FAMtastic Site Studio" (one app) to "FAMtastic Platform" (three studios \+ Shay \+ parallel agents) wasn't a planned migration. It emerged from real usage:

\- Building MBSH revealed that Site Studio needed a sibling for media work  
\- Building media work revealed that components were a separate concern  
\- Running multiple Claude Code sessions in parallel revealed that we needed an orchestration layer  
\- Watching Claude Code 2.1.139 ship \`/goal\` and Agent View told us Anthropic agrees this is the right shape  
\- Hermes already shipped 80% of what we wanted in an orchestration agent — so we forked it and made it ours

\*\*Pattern-driven, not plan-driven.\*\* The intelligence loop spotted what was repeated and turned it into structure. Keep doing that.

\---

\*End of capture. This document should be re-read at the start of any session that touches platform-level decisions. Updates go via append \+ date stamp, not overwrite — the history is the proof.\*