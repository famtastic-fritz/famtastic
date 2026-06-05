---
title: CAPABILITIES-MATRIX
type: note
permalink: shay-memory/post-review/capabilities-matrix
---

# Shay-Shay Capabilities Matrix
**Date:** 2026-06-05

## Core Competencies & Sub-Agent Mappings

This matrix maps my required sub-agents (as defined in our V4 Swarm Architecture) to specific capabilities, repos, and skills.

| Agent Role | Sub-Agent Brain | Capability Focus | Core Tools & Skills | References / Frameworks |
|---|---|---|---|---|
| **The Queen (Orchestrator)** | Claude 3.5 Sonnet / Codex | Task decomposition, Swarm DAG definition, Final synthesis | `delegate_task`, `basic-memory`, `run-policy.yaml` | `ruflo`, `GPTSwarm`, `agency-swarm` |
| **Architect** | Gemini 2.5 Pro | System design, Blueprinting, Spec drafting | `web_search`, `read_file`, `write_file` | Vercel Skills, `agent-swarm` HITL gates |
| **Deep Researcher** | Gemini Flash / Ollama | Iterative web research, report generation | `open_deep_research`, `deep-research`, `tavily` | `deer-flow` Sub-Agents, `open_deep_research` |
| **Frontend Dev** | Gemini Flash | React, Component generation, UI styling | `vercel-react-best-practices`, `web-design-guidelines` | `vercel-labs/skills` |
| **Backend Dev** | Gemini Flash | APIs, Firebase, Serverless functions | `deploy-to-vercel`, `vercel-composition-patterns` | `vercel-labs/skills` |
| **Reviewer / QA** | Claude Haiku / Opus | Code review, security scan, regression testing | `adversarial_verify()`, `judge_panel()` | `ruflo` AIDefence, `shay-agent-os` Gates |
| **Outreach/SDR** | Gemini Flash | Lead generation, initial contact drafts | Upwork snipe skills, `revenue-plans` | Autonomous Business OS |

## Integration Strategies (New Research)
- **Vercel Skills CLI:** Installed. Agents can be hot-loaded with specific instruction sets (`SKILL.md`) right before execution.
- **Deer-Flow:** Analyzed for Sandboxing and Context offloading patterns.
- **Open Deep Research:** Evaluated for iterative search patterns using structured outputs and LLM-as-a-judge scoring.