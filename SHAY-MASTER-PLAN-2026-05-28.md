# SHAY-SHAY MASTER PLAN — 2026-05-28

# Claude Code / Codex: read this first before doing anything.
# FIRST TASK: copy this to ~/famtastic/SHAY-MASTER-PLAN-2026-05-28.md and push to main.

---

## WHAT SHAY IS

Always-on AI assistant, orchestrator, idea capturer, money generator.
NOT a Studio tool — she dispatches TO Studios.
Base: Hermes Agent v0.13.0. Home: ~/.shay/. Sibling to Hermes, not replacement.

Repos:
- Core: ~/famtastic/shay-shay
- Desk: ~/famtastic/shay-desktop (Electron)
- Plans: ~/.shay/plans/master-plan.md

---

## THREE PHASE PLAN

### PHASE 1 — Stabilize (CURRENT)

DONE TODAY (2026-05-28):
- Split-brain home fixed (HERMES_HOME + SHAY_HOME → ~/.shay/)
- cron_mode: auto (was deny)
- Gateway launchd plist active (ai.shay.gateway)
- Claude Sonnet 4.6 default via Max subscription OAuth (not API credits)
- 10 aux slots → direct Gemini 2.5 Flash (no OpenRouter dependency)
- Fallback: direct Gemini → local Ollama hermes3 (free)
- Delegation: max_concurrent_children=30, max_spawn_depth=2
- Kanban initialized, verified working (triage→running→done)
- Telegram confirmed delivering
- Crons: 3 active (context-daemon, autonomous-curator, morning-command-center 7:30am)
- GEMINI_API_KEY rotated + secured
- Shay MEMORY.md updated with self-knowledge
- 8 overnight research jobs completed + verified
- Codex adversarial review caught Kanban bug — fixed in overnight_ops.py
- HermesDesktop zombie killed
- agentic-os = NOT Fritz's (Mihir Modi's) — do not merge

REMAINING PHASE 1:
- [ ] Desk overhaul (see Desk scope below)
- [ ] CLI↔Desk event bridge
- [ ] Wire Cognee MCP (graph memory — NOT done yet)
- [ ] Top up OpenRouter (restore DeepSeek/Kimi workers)
- [ ] Set API_SERVER_KEY before Hetzner exposure
- [ ] Add retry-once to overnight_ops.py run_task()
- [ ] Re-run competitor-analysis + home-services-market (min 10 citations)
- [ ] Morning interview via Telegram (payment, GoDaddy inventory)
- [ ] Move ~/agentic-os/ out of home dir

### PHASE 2 — Two Parallel Workstreams (after Phase 1 stable)

STREAM A — Shay Rebuild (Option B, true runtime):
- Own entry point, own runtime, Hermes as scaffold not ceiling
- ~/.shay/skills/ separate from Hermes defaults
- Desk swap = one config change

STREAM B — Studio Refactor:
- Site Studio: redesign + MCP server
- Media Studio: POC → production
- Component Studio: conceptualize → build
  Anchors: art deco nav medallion + Hi-Tide Harry
- All three as MCP servers, Shay is ONLY caller

INFRASTRUCTURE (decide before Phase 2):
- Git: feature branches vs worktrees
- Sandbox: Docker vs Hetzner staging vs cloud
- Commit management across two streams
- Testing gates

### PHASE 3 — Convergence
- Swap Desk to Shay B backend (one config change)
- All Studios MCP-wired
- Phone companion live
- Hetzner migration complete

---

## BRAIN TOPOLOGY (confirmed working 2026-05-28)

Orchestrator: Claude Sonnet 4.6 (Max OAuth)
Coder: Claude Code CLI (Max)
Research: Gemini 2.5 Flash (direct API)
Workers: Ollama hermes3 (free) + DeepSeek/Kimi via OpenRouter (when topped up)
Fallback: Gemini → Ollama
Rule: Claude plans + judges only. Never bulk work.

---

## MEMORY STACK

Tier 1: ~/.shay/SOUL.md + MEMORY.md + USER.md
Tier 2: FTS5 SQLite (64 sessions, 5,655 messages)
Tier 3: Cognee via MCP — NOT YET WIRED (Phase 1 remaining)

---

## ORCHESTRATION

delegate_task = sync, dies with parent. Quick fan-out only.
Kanban = durable, survives restarts. Use for anything that matters.
Control plane: ~/.shay/scripts/overnight_ops.py (Codex-hardened 2026-05-28)
Scheduler truth: ~/.shay/cron/jobs.json

---

## DESK PHASE 1 SCOPE

Panels to build:
- Mission Control (sessions, brain status, cost meter)
- Idea Inbox (capture → Kanban)
- Research Bench (briefs, approve/deeper/archive, citations required)
- Studios Bridge (MCP clients)
- Shay's Closet (persona, skills, memory)
- Cost Panel (balances, burn rate, key management)

UI requirements:
- Claude Code-quality chat (streaming, markdown, tool calls visible)
- Codex-style settings (MCP, hooks, git, environments, worktrees, computer use)
- Mode switching (Chat/Cowork/Code pattern)
- Top bar: model selector, access level, project/branch
- Inline terminal + computer-use thumbnail (xterm.js)
- Pop-out terminal → BrowserWindow
- Log watcher (tail -f, color-coded, filterable)
- CLI↔Desk bridge (push to desk, open in desk)
- Notification queue (SQLite-backed, no silent drops)
- Theme switching
- Side chat windows
Rule: Desk NEVER makes direct LLM calls.

---

## INCOME STRATEGY

Top plays:
1. Home Services Sites — $397/mo/site, 7-14 days to cash
2. Fractional AI Officer — $3.5-7.5k/mo
3. GoDaddy Reseller + FAMtastic packaging

Month-3 model: ~$23k/mo

OPEN — morning interview will answer:
- Payment: PayPal vs Stripe vs GoDaddy
- GoDaddy inventory (what exists, underutilized)
- GoDaddy reseller current state
- Pipeline: idea → built → sold → paid → recurring

SOUL.md directive: always ask how Fritz gets paid before finalizing income plans.

---

## ACTIVE CRONS

1. context-daemon — every 5 min
2. autonomous-curator — daily 2am (idle gate 2h)
3. morning-command-center — daily 7:30am (single Telegram digest)

---

## FILES NEEDING RE-RUN (quality issue)

~/.shay/plans/competitor-analysis.md — 0 citations, redo with web search
~/.shay/plans/home-services-market.md — 0 citations, redo with web search
Both: min 10 citations, Perplexity for search, Claude for synthesis.

---

## INSTRUCTIONS FOR CLAUDE CODE / CODEX

First thing every session:
1. Read ~/.shay/plans/master-plan.md (local canonical)
2. Read ~/.shay/plans/HANDOFF-2026-05-28.md
3. Check overnight-batch-verify.json for overnight job status
4. Work Phase 1 remaining items in priority order
5. Append decisions to master-plan.md after session
6. Commit with human-authored messages, no AI references

FIRST TASK RIGHT NOW:
- Copy this file to ~/famtastic/SHAY-MASTER-PLAN-2026-05-28.md
- git add, commit "Add session handoff and master plan", push to main
- Then work the Phase 1 remaining checklist
