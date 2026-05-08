# FAMtastic Studio Intelligence Run - Competitive Map

**Status:** complete  
**Purpose:** Compare adjacent AI builders, coding agents, orchestration systems, research/provenance patterns, and safety failures so FAMtastic Studio can borrow proven mechanics without inheriting their gaps.

## Method

Sources prioritized official documentation, official GitHub repositories, official product pages, public engineering/security material, and public postmortems. Marketing claims are treated as lower-confidence unless backed by docs or observable behavior.

## AI App / Site Builders

| System | What it is | Does well | Misses / risk | Borrow | Exploit gap |
| --- | --- | --- | --- | --- | --- |
| Replit Agent | Browser IDE agent with checkpoints, plan mode, deployment, usage billing, and rollback concepts. | Integrated runtime, visible checkpoint cost, usage dashboard, alerts/budgets. | Cost model can turn complex work into expensive checkpoints; research/proof depth is not the main product primitive. | Checkpoints, rollback, visible spend, budget alerts. | Make cost tied to proof and build value, not just effort. |
| Bolt.new | Browser-based full-stack builder powered by WebContainers, prompt/run/edit/deploy loop. | Fast zero-local-setup iteration, live preview, deploy loop. | Preview/debug reliability can become the user bottleneck; app completion often needs external engineering discipline. | Instant preview and runnable environment. | Add proof, deploy readiness, and capability truth before "done." |
| v0 | Natural-language UI/app builder connected to Vercel projects and deploys. | Strong UI generation, deploy-to-Vercel path, integrations with Vercel resources. | Starts from generation; research and product strategy are not required first-class stages. | Prompt-to-project-to-deploy continuity. | Intelligence-first recipe/prompt objects before generation. |
| Lovable | Full-stack natural-language app platform with GitHub sync, deployment, backend/auth/database/integrations. | Broad lifecycle coverage and editable code. | Can blur prototype completion with production readiness. | GitHub sync, shared workspace, generated full-stack app model. | Stronger launch proof, source lineage, and registry promotion. |
| Dyad | Local open-source AI app builder alternative to v0/Lovable/Replit/Bolt. | Local control, open-source transparency, BYO models, reduced lock-in. | Local environment burden moves back to the operator; safety and proof depend on user setup. | Local-first cheap lane and open artifacts. | Studio can combine local-first control with guided capability checks. |

## Agentic Coding Systems

| System | What it is | Does well | Misses / risk | Borrow | Exploit gap |
| --- | --- | --- | --- | --- | --- |
| Claude Code | Terminal/IDE coding agent with hooks, status line, background tasks, and subagent events. | Rich hook lifecycle, statusline telemetry, background event model. | Hooks require trust and can add setup complexity. | Hook/event vocabulary for Run Control and Build Trace. | Surface it as product UX, not only terminal mechanics. |
| OpenAI Codex cloud | Cloud coding agent with sandboxed tasks, repo connection, branch/PR handoff. | Parallel tasks in isolated sandboxes; PR-oriented handoff. | Cloud context and repo setup can hide environment assumptions. | Isolated task sandboxes and PR footer/proof pattern. | Pair cloud lane with Capability Truth and local fallback. |
| GitHub Copilot coding agent | GitHub-native agent assigned from issues/chat/CLI/agents panel to produce PRs. | Native branch/PR workflow and human merge gate. | Agent output can be polluted by platform logic or opaque system behavior. | Issue-to-PR workflow and human merge boundary. | Require proof packet and trace before merge recommendation. |
| Cursor Background Agents | Async remote agents that clone GitHub repo, work on branches, push for handoff, and expose status/takeover. | Background task management, remote environment snapshots, branch handoff. | Requires repo permissions and short data retention assumptions. | Background agents panel, take-over, environment config. | Store durable run ledgers inside Studio, not only vendor UI. |
| Windsurf Cascade | IDE agent with Code/Chat modes, planning/Todo list, checkpoints, workflows, app deploys. | Plan tracking, real-time awareness, linter integration, one-click deploy. | Deploying from agent can make public sharing too easy. | Todo/run plan UX and checkpointing. | Add approval center and deploy proof gates before public release. |
| Cline / Roo-style agents | Local/editor coding agents with file edits, terminal, browser, checkpoints, and task resume. | Permissioned local changes and browser inspection. | Can become approval-heavy and token-expensive without run control. | Browser QA and checkpoint comparison. | Guarded-autonomous rules that continue until real stop conditions. |

## Multi-Agent / Orchestration Systems

| System | What it is | Does well | Misses / risk | Borrow | Exploit gap |
| --- | --- | --- | --- | --- | --- |
| CrewAI | Crews for agent collaboration plus Flows for event-driven workflow/state. | Separates autonomous crews from controlled flows. | Can become framework-first if product state is not explicit. | Flow + crew split. | Studio owns workflow state; agents are execution resources. |
| LangGraph | Durable execution, persistence, checkpointing, streaming, human-in-loop workflows. | Resume/retry semantics for long-running work. | Graph complexity can exceed product need. | Durable checkpoints and interrupt/resume pattern. | Keep user-facing workflow as Mission Control, not graph UI. |
| AutoGen | Multi-agent conversation/workflow framework with human-in-loop patterns. | Conversable agents, handoff, group workflows. | Conversation history can become state unless disciplined. | Agent roles and handoff semantics. | Bind every handoff to artifacts, proof, and ledger state. |
| OpenHands | Autonomous cloud coding agent platform emphasizing transparency, security, and model-agnostic control. | Cloud agent product framing and transparent control. | Still coding-agent centered, not Studio/product-builder centered. | Secure transparent cloud-agent posture. | FAMtastic keeps build intelligence and product domains central. |

## Research / Provenance Patterns

| Pattern | Does well | Risk | FAMtastic adaptation |
| --- | --- | --- | --- |
| OpenAI Deep Research | Multi-step source discovery, synthesis, citations. | Research can be detached from build execution. | Research artifacts become recipe, prompt, QA, and learning inputs. |
| LlamaIndex citation query engine | Citation chunks and source nodes. | Citation granularity can be arbitrary. | Store source spans, confidence, and freshness with each finding. |
| Haystack / RAG pipelines | Explicit retrievers, rankers, document stores, metadata. | Pipeline plumbing can be overbuilt. | Use minimal source registry plus evidence scoring first. |
| LangChain retrieval with sources | Connects retrieval to generation workflows. | Default chains can obscure source conflicts. | Surface conflict/freshness in Intelligence Brief and Shay readback. |

## Security / Cost / Safety Patterns

| Pattern | Source basis | FAMtastic requirement |
| --- | --- | --- |
| Prompt injection / excessive agency | OWASP LLM Top 10 2025. | Capability Truth before tools; dangerous actions routed to Approval Center. |
| Sensitive information disclosure / secret leakage | OWASP and GitHub secret scanning/push protection docs. | Never approve artifacts containing secrets; pre-commit/push checks and vault references. |
| Source map / debug artifact exposure | Public source map exposure reports and source map security guidance. | Production deploy gate checks for sourcemaps/debug artifacts. |
| Unbounded consumption / cost drain | OWASP unbounded consumption and agent spend-control patterns. | Visible cost, cheap lane default, $50+ explicit approval. |
| Supply-chain/package risk | OWASP supply-chain category and agent install risk. | Installs are capability-gated; untrusted plugin/package actions require proof or approval. |

## Key Competitive Conclusions

1. The market has converged on prompt -> runnable preview -> deploy, but not on research -> proof -> learning -> registry promotion.
2. Coding agents are better at branch/PR work than product systems are at explaining what work proved.
3. Orchestration frameworks solve persistence and delegation, but they do not create a product UX by themselves.
4. FAMtastic's defensible lane is not "another AI builder." It is intelligence-first build production with visible control, reusable patterns, and proof before promotion.

## Source Index

Detailed source records are stored in `data/sources.json`.

