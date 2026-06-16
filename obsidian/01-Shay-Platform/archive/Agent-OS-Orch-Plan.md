---
title: Agent-OS-Orch-Plan
type: note
permalink: famtastic/projects/agent-os-orch-plan
---

# Agent Orchestration Plan — Shay-Shay Agent OS
## Auto-generated from interview findings

---

## GOAL
Build the Agent OS foundation executing across parallel agents under a single orchestrator.

## ORCHESTRATION MODEL
**Inspired by:** Kimi agent swarms, but with our own control layer

### Master Orchestrator Agent
- Receives user intent / single prompt
- Decomposes into sub-tasks
- Spawns specialized agents with clear inputs/outputs
- Monitors progress, handles failures, aggregates results
- Presents unified output to user

### Agent Types Needed

| Agent | Role | Model Type | When Spawned |
|-------|------|-----------| -------------|
| **Research Agent** | Deep discovery, citations, competitive analysis | Cheap/fast (GPT-4o-mini, local) | Every new task |
| **Architecture Agent** | Design systems, choose tech stack, plan modules | Reasoning (Claude, o3, local uncensored) | After research |
| **Builder Agent** | Write code, build proofs | Code-optimized (Codex, Claude, local) | After architecture |
| **Test Agent** | Validate correctness, run tests | Same as builder or cheap | After build |
| **Review Agent** | Quality gates, security scan, style check | Reasoning | After test |
| **Deploy Agent** | Ship, configure, monitor | CLI tools | After review |
| **Jailbreak Agent** | Handle sensitive queries without refusal | Uncensored (Gemma-4-uncensored, etc.) | On demand |
| **Debate Agent** | Present opposing viewpoints | Multiple models | On demand |
| **Ambient Agent** | Background monitoring, context capture | Lightweight | Always on |

### Spawn Triggers
- **Explicit:** User says "spawn research agent for X"
- **Implicit:** Orchestrator detects need (research before build)
- **Scheduled:** Cron-based periodic tasks (context daemon)
- **Event-driven:** File changes, new emails, calendar events

## PARALLEL EXECUTION RULES

1. Research + Architecture can run in parallel AFTER initial decomposition
2. Builder agents can parallelize by module/component
3. Test must follow Build (dependency)
4. Review must follow Test (dependency)
5. Deploy must follow Review (dependency)
6. BUT: Builder 2 can start while Builder 1 is testing (pipelining)

## COMMUNICATION PROTOCOL

Option A: **MCP (Model Context Protocol)**
- Standard, growing ecosystem
- Good for tool calling
- Slower for agent-to-agent chat

Option B: **Custom JSON bus**
- Fast, tailored to our needs
- Agent writes to shared message queue
- Other agents poll or get push notifications

Option C: **Hybrid**
- MCP for external tool integration
- Custom bus for agent-to-agent coordination
- File-based for large artifacts (code, images)

**Recommendation:** Start with C (Hybrid). Use MCP where available, custom protocol for internal swarm.

## ERROR RECOVERY

| Failure Type | Response |
|-------------|----------|
| Agent crash | Restart agent, replay last state |
| Build failure | Send error to Architecture Agent for redesign |
| Test failure | Auto-retry with fixes, escalate to user after 3 tries |
| Research dead-end | Spawn alternative research agent with different query |
| Timeout | Kill agent, report partial results, ask user |

## LEARNING LOOP INTEGRATION

After every completed task:
1. Extract: what worked, what didn't, new tools discovered
2. Write: skill file if reusable pattern found
3. Update: memory with new preferences/conventions
4. Archive: research findings in Research Center

## VALIDATION: FOREX/STOCK TRADER

This becomes our end-to-end test:
- Research: market APIs, strategies, compliance
- Architecture: system design, data pipeline, risk management
- Build: trading engine, backtesting, paper trading
- Test: strategy validation, edge cases
- Review: security audit, cost analysis
- Deploy: live trading with trust-level restrictions

If the swarm can build this from a single prompt, the system works.