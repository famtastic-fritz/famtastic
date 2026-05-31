# Agent OS — Software Design Document

**Version:** 0.1-draft
**Date:** 2026-05-27
**Owner:** FAMtastic / Fritz
**Status:** Draft for review

## 1. Executive Summary

Agent OS is a locally-hosted multi-agent orchestration system for FAMtastic. It coordinates multiple AI agent surfaces (Claude Code, Codex, Kimi, Ollama + Hermes, OpenRouter) under a unified goal engine, executes autonomous build waves with configurable trust, and drives revenue through studio integration (Site Studio, Media Studio, Component Studio).

**Core principle:** Reuse before generate. Rowboat (14.6K stars) is the fork base. ECC patterns (buddy consensus, inter-agent bus) are absorbed. FAMtastic-specific layers (jailbreak switcher, site studio bridge, revenue agents) are added.

**Anti-principles:** No generic chatbot. No Web3 baggage. No Hermes branding. No cutesy emoji taxonomy. Functional role names only.

## 2. System Architecture

### 2.1 High-Level Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      User Interface                           │
│            (Dashboard — React/Vue + Tailwind)                 │
└─────────────────────────────────────────────────────────────┘
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
┌────────────────────────┐      ┌──────────────────────┐
│   /goal Loop Engine    │      │   Trust Controller   │
│   (judge, budget,      │      │   (paranoid→godmode) │
│    checkpoint, resume) │      │   + buddy consensus  │
└────────────────────────┘      └──────────────────────┘
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
┌────────────────────────┐      ┌──────────────────────┐
│  Orchestrator Layer    │      │   Session Manager    │
│  (planner, delegator,  │      │   (checkpoints,      │
│   aggregator)          │      │    state, recovery)  │
└────────────────────────┘      └──────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Worker     │    │   Worker     │    │   Worker     │
│   Pool       │    │   Pool       │    │   Pool       │
│ (cheap/fast) │    │ (reasoning)  │    │ (local)      │
└──────────────┘    └──────────────┘    └──────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
                    ┌──────────────────┐
                    │  Message Bus     │
                    │  (Redis/Redis)   │
                    └──────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Site Studio  │    │ Media Studio │    │ Component    │
│ (build sites)│    │ (gen assets) │    │ Studio       │
└──────────────┘    └──────────────┘    │ (reusable UI)│
                                        └──────────────┘
```

### 2.2 Fork Base: Rowboat

Rowboat provides:
- Multi-agent orchestration (>10 agents)
- Electron desktop app
- Python + TypeScript SDK
- Memory system (ChromaDB)
- MCP (Model Context Protocol) integration
- Voice/TTS
- Background tasks
- Model switching (OpenAI, Anthropic, Ollama)

**What we modify:**
- Branding → FAMtastic Agent OS
- Add jailbreak brain switcher (OBLITERATUS, godmode, uncensored models)
- Add site studio bridge (direct API calls to fam-hub)
- Add revenue/trading agent templates
- Add model benchmarking sandbox
- Replace ChromaDB with Redis-backed ephemeral + disk checkpoint hybrid
- Add buddy consensus for trust modes
- Add `/goal` loop engine

### 2.3 Communication Bus

Replace Rowboat's built-in messaging with a Redis-backed message bus.

**Why Redis:**
- Lightweight (runs in Docker)
- Pub/sub for real-time events
- Lists for task queues
- Streams for ordered event logs
- TTL for automatic cleanup
- No additional infra needed (Docker already installed)

**Channels:**
```
agent:tasks          — task queue (LPUSH/BRPOP)
agent:events         — pub/sub for real-time updates
agent:results        — completed task results
agent:heartbeat      — worker health checks
agent:logs           — structured logs (Redis Streams)
```

## 3. Agent Taxonomy

No animals. No emojis. Functional names only.

### 3.1 Orchestrator Tier

| Agent | Model | Role |
|-------|-------|------|
| `orchestrator-plan` | Claude 4 / Kimi k1 | High-level planning, spec decomposition |
| `orchestrator-delegate` | Codex / Claude 4 | Task assignment, worker selection |
| `orchestrator-verify` | Claude 4 Opus | Code review, verification, judge for `/goal` |
| `orchestrator-reporter` | Fast model (Qwen 1.5B) | Status narration, heartbeat, human updates |

### 3.2 Worker Tier

| Agent | Model | Cost | Role |
|-------|-------|------|------|
| `worker-cheap` | Qwen2.5-1.5B-Instruct | Free (Ollama) | Text classification, simple extraction |
| `worker-code` | Codex / Claude 4 | Low | Code generation, file edits |
| `worker-reasoning` | Kimi k1 / DeepSeek-R1 | Medium | Spec analysis, architecture decisions |
| `worker-local` | Hermes-3-Llama-3.2-3B | Free (Ollama) | Private data processing, tool use |
| `worker-vision` | Claude 4 / Gemini | Medium | Image analysis, UI review |
| `worker-web` | Perplexity API / Firecrawl | Medium | Research, scraping, data gathering |

### 3.3 Studio Bridge Agents

| Agent | Target | Role |
|-------|--------|------|
| `bridge-site` | fam-hub site * | Execute site builds, deploys |
| `bridge-media` | Media Studio API | Generate images, videos, audio |
| `bridge-component` | Component Studio | Reuse/bake UI components |

## 4. Orchestration Flow

### 4.1 The /goal Loop Engine

Inspired by Hermes `/goal` and Codex CLI:

```python
def goal_loop(goal_text: str, budget_turns: int = 20):
    state = create_session(goal_text)
    judge = load_judge_model()  # lightweight: Qwen 1.5B or Hermes 3B

    for turn in range(budget_turns):
        # 1. Plan (orchestrator-plan)
        plan = orchestator_plan(state)

        # 2. Delegate (orchestrator-delegate)
        tasks = decompose(plan)
        for task in tasks:
            worker = select_worker(task, state.trust_mode)
            enqueue_task(task, worker)

        # 3. Execute (workers)
        results = await_workers(tasks, timeout=300)

        # 4. Aggregate (orchestrator-delegate)
        state = aggregate_results(state, results)

        # 5. Verify (orchestrator-verify / judge)
        goal_met = judge.evaluate(state, goal_text)
        if goal_met:
            commit_results(state)
            notify_human("Goal complete", state.summary)
            return state

        # 6. Checkpoint every 5 turns
        if turn % 5 == 0:
            save_checkpoint(state)

    # Budget exhausted
    notify_human("Goal budget exhausted", state.summary)
    save_checkpoint(state)
    return state
```

**Judge model behavior:**
- Conservative: false negative preferred over false positive
- Fail-open: broken/missing judge → continue, never block
- User messages always preempt loop
- Persisted in `SessionDB.state_meta`

**Subgoals:** Mid-run criteria addition without reset.

### 4.2 Swarm Execution Model

For parallel execution of independent tasks:

```python
def swarm_execute(tasks: list[Task], max_parallel: int = 16):
    """Execute tasks with configurable parallelism."""
    semaphore = asyncio.Semaphore(max_parallel)

    async def run_task(task):
        async with semaphore:
            worker = select_worker(task)
            result = await worker.execute(task)
            await bus.publish("agent:results", result)
            return result

    return await asyncio.gather(*[run_task(t) for t in tasks])
```

**Scaling to 500 agents:**
- Not 500 LLM instances — 500 concurrent task slots
- Actual workers = pool of model connections (Redis connection pooling)
- Rate limiter per provider (OpenRouter, Kimi, Anthropic)
- Backpressure: when queues fill, reduce `max_parallel`
- Circuit breaker: if provider fails, fail over to next model tier

## 5. Trust Modes & Buddy Consensus

### 5.1 Trust Mode Spectrum

From least to most autonomous:

| Mode | Behavior | Use Case |
|------|----------|----------|
| `paranoid` | Ask human before every non-trivial action | Production deploys, financial transactions |
| `cautious` | Auto-approve under $X, ask above | Routine builds, testing |
| `trusted` | Auto-approve most, notify on completion | Standard dev workflow |
| `godmode` | Execute everything, notify after | Research, exploration, time-critical sprints |

### 5.2 Buddy Consensus (from ECC)

For critical operations in `paranoid` or `cautious` mode, require buddy consensus:

```python
def buddy_consensus(operation: Operation, buddy_count: int = 2) -> bool:
    """Require N agents to independently agree before executing."""
    buddies = select_buddies(operation, count=buddy_count)
    votes = [b.evaluate(operation) for b in buddies]

    # NAND gate: all must agree (no dissent)
    # If any buddy votes False → abort
    if all(votes):
        execute(operation)
        return True
    else:
        escalate_to_human(operation, votes)
        return False
```

**Buddy selection rules:**
- Different model families (Claude + Kimi + Codex = diversity)
- Different tiers (orchestrator + worker = perspective)
- Never the same model that proposed the operation

### 5.3 Configuration File

```json
{
  "trust_mode": "cautious",
  "cautious_threshold_usd": 50.0,
  "buddy_consensus": {
    "enabled": true,
    "buddy_count": 2,
    "operations": ["deploy", "git_push", "payment", "schema_migration"]
  },
  "rate_limits": {
    "openrouter": "50/min",
    "kimi": "30/min",
    "anthropic": "20/min"
  }
}
```

## 6. Autonomous Build Loop

### 6.1 Full Loop Specification

```
┌──────────────────────────────────────────────────────┐
│  PHASE 0: SESSION START                              │
│  - Load checkpoint if resume                         │
│  - Read handoff doc if new session                   │
│  - Initialize /goal                                  │
└──────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────┐
│  PHASE 1: PLAN                                       │
│  - orchestrator-plan reads spec/handoff              │
│  - Decomposes into tasks with acceptance criteria    │
│  - Writes plan.md                                    │
│  - Adds tasks to Kanban board                        │
└──────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────┐
│  PHASE 2: DELEGATE                                   │
│  - orchestrator-delegate assigns workers             │
│  - Selects model per task (cheap vs smart)           │
│  - Enqueues to Redis task queue                      │
│  - Updates Kanban → in_progress                      │
└──────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────┐
│  PHASE 3: EXECUTE                                    │
│  - Workers pull from queue                           │
│  - Heartbeat every 30s to agent:heartbeat            │
│  - Reporter narrates progress to human               │
│  - Errors → retry (3x) → escalate → human            │
└──────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────┐
│  PHASE 4: VERFIY                                     │
│  - orchestrator-verify runs tests/checks             │
│  - Judge evaluates goal satisfaction                 │
│  - If FAIL → loop to Phase 2 with corrections        │
│  - If PASS → proceed to Phase 5                      │
└──────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────┐
│  PHASE 5: COMMIT                                     │
│  - Git commit with descriptive message               │
│  - Write handoff doc                                 │
│  - Update SITE-LEARNINGS.md                          │
│  - Update CHANGELOG.md                               │
└──────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────┐
│  PHASE 6: REPORT                                     │
│  - Send completion notification                      │
│  - Include summary, diff, next steps                 │
│  - Mark Kanban tasks complete                        │
│  - Save checkpoint                                   │
└──────────────────────────────────────────────────────┘
```

### 6.2 Heartbeat Protocol

Every running worker must heartbeat every 30 seconds:

```json
{
  "agent_id": "worker-code-001",
  "task_id": "task-build-navbar",
  "status": "running",
  "progress_pct": 45,
  "last_output": "Generating React component...",
  "timestamp": "2026-05-27T18:30:00Z",
  "uptime_sec": 120
}
```

**Dead agent detection:**
- No heartbeat for 90s → mark task as failed
- Requeue task to another worker
- Log incident

**Reporter agent (`orchestrator-reporter`):**
- Reads heartbeats from `agent:heartbeat`
- Summarizes progress every 2 minutes
- Sends to human via chosen channel (terminal, desktop notification, Telegram)
- Escalates on stalls/errors

## 7. UI / Dashboard Specification

**Note:** Based on ChatGPT Design.md as visual reference only. All branding is FAMtastic, not Hermes.

### 7.1 Layout: Three-Pane Workspace

```
┌──────────────────────────────────────────────────────────────┐
│  TOPBAR                                                      │
│  [Goal: Build landing page]  [Trust: cautious]  [Status ●]   │
├──────────────┬───────────────────────────────┬───────────────┤
│  LEFT PANEL  │        CENTER PANEL           │  RIGHT PANEL  │
│              │                               │               │
│  Agent List  │    Main Workspace             │  Activity     │
│  ├── plan    │    ├── Current task output    │  ├── Logs     │
│  ├── code    │    ├── Code preview           │  ├── Errors   │
│  ├── verify  │    ├── Live preview (iframe)  │  ├── Commits  │
│  └── ...     │    └── File tree              │  └── Metrics  │
│              │                               │               │
├──────────────┴───────────────────────────────┴───────────────┤
│  COMMAND BAR                                                 │
│  > [type commands...]   [Send]                               │
└──────────────────────────────────────────────────────────────┘
```

### 7.2 Core Panels

**Left Panel — Agent Directory:**
- List of active agents with status (idle, running, error)
- Color-coded: green = healthy, yellow = busy, red = error
- Click agent → see its current task, model, cost so far
- Drag agent to assign to task

**Center Panel — Workspace:**
- Tabbed: Code / Preview / Logs / Plan
- Code: Monaco editor with syntax highlighting
- Preview: Live iframe of built site
- Plan: Markdown view of current plan.md
- Logs: Structured filterable logs from Redis streams

**Right Panel — Activity:**
- Real-time event feed (Redis pub/sub)
- Error alerts with stack traces
- Git commit history
- Cost tracker (running total per session)

**Topbar:**
- Current goal (editable, triggers /goal loop)
- Trust mode selector (dropdown)
- System status: agents active / tasks queued / cost today

**Command Bar:**
- Natural language commands ("deploy to netlify", "add auth")
- Slash commands: `/goal`, `/trust`, `/deploy`, `/pause`, `/resume`
- Context-aware suggestions

### 7.3 Styling

- Dark theme only (inspired by Terminal, Warp, VS Code)
- Accent color: FAMtastic brand color (#FF6B00 orange, adaptable)
- Glassmorphism panels for overlay states
- Monospace for code/logs, sans-serif for UI chrome
- Animations: Framer Motion for agent card transitions, heartbeat pulses

## 8. Model Selection & Cost Optimization

### 8.1 Model Registry

```yaml
models:
  qwen-1.5b:
    provider: ollama
    name: Qwen2.5-1.5B-Instruct
    cost_per_1m: 0.0
    context: 32768
    speed: very_fast
    capability: low
    use_cases: [classification, extraction, simple_qa]

  phi-4-mini:
    provider: ollama
    name: Phi-4-mini-instruct
    cost_per_1m: 0.0
    context: 128000
    speed: fast
    capability: medium
    use_cases: [code_gen, summarization, reasoning]

  hermes-3b:
    provider: ollama
    name: Hermes-3-Llama-3.2-3B
    cost_per_1m: 0.0
    context: 8192
    speed: fast
    capability: medium
    use_cases: [tool_use, local_tasks, private_data]

  codex:
    provider: openai
    name: codex-latest
    cost_per_1m: 1.50
    context: 128000
    speed: fast
    capability: high
    use_cases: [code_gen, architecture, bug_fix]

  claude-4:
    provider: anthropic
    name: claude-opus-4
    cost_per_1m: 15.00
    context: 200000
    speed: medium
    capability: very_high
    use_cases: [planning, verification, complex_reasoning]

  kimi-k1:
    provider: kimi
    name: kimi-k1
    cost_per_1m: 0.60
    context: 128000
    speed: medium
    capability: high
    use_cases: [reasoning, coding, multilingual]

  deepseek-r1:
    provider: openrouter
    name: deepseek/deepseek-r1
    cost_per_1m: 0.50
    context: 64000
    speed: medium
    capability: high
    use_cases: [math, reasoning, step_by_step]
```

### 8.2 Cost Routing Logic

```python
def select_model(task: Task, budget_remaining: float) -> Model:
    # 1. Try free models first (Ollama)
    if task.complexity <= "medium" and ollama_available():
        return cheapest_free_model(task)

    # 2. If budget tight, use cheaper remote
    if budget_remaining < 10.0:
        return cheapest_paid_model(task)

    # 3. Use best model for critical tasks
    if task.critical:
        return best_available_model(task)

    # 4. Default: balanced
    return balanced_model(task)
```

### 8.3 OpenRouter Fallback

For cheap access to premium models without direct API keys:
- OpenRouter aggregates multiple providers
- One API key → access to Anthropic, OpenAI, Google, Mistral, etc.
- Good for fallback when primary provider is down

## 9. Integration Points

### 9.1 FAMtastic Studio Bridges

**Site Studio Bridge (`bridge-site`):**
```python
class SiteStudioBridge:
    def build_site(self, site_id: str, config: dict):
        # Calls fam-hub site build
        subprocess.run(["fam-hub", "site", "build", site_id])

    def deploy_site(self, site_id: str, target: str = "netlify"):
        subprocess.run(["fam-hub", "site", "deploy", site_id, target])

    def preview_site(self, site_id: str) -> str:
        # Returns preview URL
        return f"http://localhost:{port}/preview/{site_id}"
```

**Media Studio Bridge (`bridge-media`):**
```python
class MediaStudioBridge:
    def generate_image(self, prompt: str, style: str) -> str:
        # Calls muapi or local ComfyUI
        pass

    def generate_video(self, script: str, duration: int) -> str:
        pass

    def generate_audio(self, text: str, voice: str) -> str:
        pass
```

### 9.2 MCP (Model Context Protocol)

Agent OS exposes MCP servers for external tools:
```
filesystem MCP — file operations
browser MCP — web browsing, screenshots
git MCP — repository operations
terminal MCP — shell execution
studio MCP — FAMtastic studio API
```

### 9.3 Kanban Integration

Shay-Shay Kanban board is the task source of truth:
- orchestrator reads open tasks from Kanban
- On task complete → update Kanban status
- On task fail → log to Kanban with error context

## 10. Implementation Phases

### Phase 0: Foundation (Week 1)
- Fork Rowboat to `~/famtastic/agent-os/`
- Docker + Redis setup
- Model registry + Ollama workers
- Basic message bus working
- `/goal` loop MVP

### Phase 1: Core Orchestration (Week 2)
- Multi-agent task delegation
- Trust modes + buddy consensus
- Heartbeat + reporter
- Session checkpoints
- Dashboard shell (React)

### Phase 2: Studio Integration (Week 3)
- Site Studio bridge
- Media Studio bridge
- Component Studio bridge
- Revenue agent templates
- Cost tracking

### Phase 3: Scale & Polish (Week 4)
- 500-agent swarm scaling (connection pooling)
- Advanced model routing
- Notification system (desktop, Telegram, email)
- Performance benchmarking
- Documentation

## 11. Known Gaps

| Gap | Impact | Mitigation |
|-----|--------|------------|
| Kimi API key not yet acquired | Can't use Kimi orchestrator | Use Claude/Codex tier 1 for now |
| Claude Code auth intermittent | May need re-auth periodically | Fallback to Codex for code tasks |
| No notification system built | Agent can't reach human when stuck | Terminal polling + Telegram bot |
| Redis not yet running | Can't test message bus | Will install in Phase 0 |
| Dashboard not started | No visual monitoring | CLI + logs sufficient for Phase 0-1 |
| ECC has no source code | Can't fork directly | Use as pattern reference only |
| Open WebUI uninstalled | Could have been quick UI | Building custom dashboard instead |

## 12. Appendix: References

- ECC repo: https://github.com/affaan-m/ECC (architecture patterns)
- Rowboat: https://github.com/rowboatlabs/rowboat (fork base)
- Hermes goals: https://hermes-agent.nousresearch.com/docs/user-guide/features/goals
- Design.md: `~/Downloads/HERMES Agent OS — Design.md` (visual reference)
- FAMtastic ecosystem: `~/famtastic/SITE-LEARNINGS.md`
- AGENTS.md: `~/famtastic/AGENTS.md`
