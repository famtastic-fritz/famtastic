# FAMtastic Studio Intelligence Run - Final Briefing

**Status:** complete
**Branch:** `research/studio-intelligence-foundation-20260508`
**Purpose:** Plain-English readout of the research run.

## What Was Researched

The run reviewed public patterns from:

- AI app/site builders: Replit Agent, Bolt.new, v0, Lovable, Dyad.
- Agentic coding systems: Claude Code, OpenAI Codex cloud, GitHub Copilot coding agent, Cursor Background Agents, Windsurf Cascade, Cline/Roo-style agents.
- Multi-agent orchestration: CrewAI, LangGraph, AutoGen, OpenHands.
- Research/provenance systems: OpenAI Deep Research, LlamaIndex citation query engine, Haystack/RAG pipelines, LangChain retrieval/source patterns.
- Safety/cost failures: OWASP LLM risks, secret leakage, source maps/debug artifacts, unbounded spend, supply-chain/install risk.

## What They Do Well

- Fast prompt-to-preview loops.
- Built-in runtimes and deploy paths.
- Branch/PR handoffs for coding agents.
- Checkpoints and resume behavior.
- Human-in-loop patterns for high-risk actions.
- Growing visibility into cost and task state.

## What They Miss

- Research is not consistently required before generation.
- Preview is often treated as proof.
- Media assets lose prompt/source lineage.
- Component reuse lacks lifecycle and approval.
- Agent runs rarely state what they fixed, added, or proved.
- Cost is often a billing artifact instead of a planning constraint.
- Orchestration frameworks do not automatically create a good product UX.

## What FAMtastic Should Borrow

- Replit-style visible cost/checkpoints.
- Bolt/v0-style fast preview loop.
- Codex/Copilot/Cursor branch and PR handoff.
- Claude Code/Windsurf hook/status/todo ideas.
- LangGraph durable checkpoint/resume semantics.
- CrewAI separation of controlled flows and autonomous crews.
- Deep Research/source-node citation discipline.

## What FAMtastic Should Exploit

FAMtastic should own the gap between "AI can generate something" and "the system knows why this is the right thing, can prove it works, and can reuse the lesson."

The product definition remains:

> FAMtastic Studio is a research-driven, operator-controlled, agent-powered website and product build system.

## V1 Recommendations

1. Build Intelligence Brief before any full build test.
2. Implement Capability Truth records before autonomous actions.
3. Add Run Ledger and pass closeout packets.
4. Treat Media Library as an active registry.
5. Use component/slot mutation instead of broad rewrites.
6. Create server responsibility map before major backend growth.
7. Keep Shay visible/findable as a domain/home, not only a bubble.
8. Enforce `$50+` explicit approval.
9. Add deploy proof gates for secrets, sourcemaps/debug artifacts, smoke tests, and rollback.

## V2 Backlog

- automated deep competitive research
- full multi-agent runtime
- embedding-based recipe similarity
- full Media Studio automation
- Component marketplace behavior
- monthly improvement engine
- advanced cost optimization
- polished research UI visualizations
- complete server extraction
- public Site Assistant productization

## Setup Attempted

Local inspection only:

- package files located
- Studio scripts inspected
- server files counted
- route/function markers scanned
- server responsibility map created

No installs, deploys, API calls, or paid/cloud actions were run.

## Non-Blockers Logged

- `site-studio/server.js` is 20,150 lines and mixes many responsibilities. This does not block research, but should block major backend feature growth until modularization begins.
- Some competitive products expose richer behavior in logged-in product surfaces than public docs. Public documentation was sufficient for this run.

## Proof Exists

- Markdown artifacts `01` through `09`.
- Data files in `data/`.
- Server responsibility map, modularization plan, and proof note.
- Updated `RUN_STATUS.md`.

## First Build Run Should Do Next

Do not start the shipping site or MBSH V2 yet. First, review the Studio redesign spec and implement the minimum execution substrate:

1. Intelligence Brief object/view.
2. Run Ledger object/view.
3. Capability Truth probe records.
4. Proof Packet / pass closeout.
5. Learning candidate capture.
6. First low-risk server extraction plan.
