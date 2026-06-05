---
title: shay-swarm-architecture-v4
type: note
permalink: shay-memory/post-review/shay-swarm-architecture-v4
---

# FAMtastic Swarm Architecture (V4): Specialized Agent Orchestration
**Date:** 2026-06-05
**Author:** Shay-Shay

## The Mandate
Fritzo, you want to scale up from a few static sub-agents to **specifically tailored swarms** that assemble on demand. I've reviewed the leading open-source swarm architectures (`ruflo`, `agency-swarm`, `agent-swarm`, `GPTSwarm`, and the `vercel-labs/skills` ecosystem) to extract the best patterns that fit our "save the brains for thinking" philosophy.

Here is the blueprint for how we will build the next evolution of `shay-agent-os/components/swarm/`.

---

## 1. Core Architecture: The "Queen & Swarm" Model

We are adopting a hybrid of the `ruflo` (Queen-led) and `agent-swarm` (Lead/Worker) topologies. 

### The Orchestrator (The Queen / Lead Agent)
* **Brain:** Claude 3.5 Sonnet / OpenAI Codex (High-Reasoning, High-Cost).
* **Role:** Decomposes user goals, selects the required skills, defines the communication flow, and dispatches the workers. *Never executes manual labor.*

### The Swarm (Worker Agents)
* **Brain:** Gemini 2.5 Flash / Local Ollama (Cheap/Free, High-Throughput).
* **Role:** Isolated execution environments. They receive a highly specific, narrowed context and a strict output schema. 
* **Dynamic Tailoring:** Instead of building 100 monolithic agents, workers are "blank slates" that get hot-loaded with specific `SKILL.md` instruction sets (inspired by `vercel-labs/skills`) right before dispatch. 

---

## 2. Dynamic Communication Flows (The Agency Pattern)

We will adopt the explicit, directional communication structure from `Agency Swarm`. Instead of all agents talking in a chaotic mesh, the Queen defines the "DAG" (Directed Acyclic Graph) for the task.

**Example: A "New Website Build" Swarm**
1. `Queen` -> `Architect` (Drafts the technical spec).
2. `Architect` -> `Frontend_Dev` (Generates React components based on spec).
3. `Architect` -> `Backend_Dev` (Generates Firebase schema based on spec).
4. `Frontend_Dev` & `Backend_Dev` -> `Reviewer` (Claude-powered quality gate).

*This prevents infinite loops and ensures cheap workers don't burn tokens talking to each other pointlessly.*

---

## 3. The "Skill Injection" System

We will implement a skill-loader compatible with the `agentskills.io` specification (as seen in the Vercel repo). 

When the Queen spawns a worker, she passes it a specific `SKILL.md` (e.g., `revenue-plans/upwork/proposal-template.md`). 
* **The Worker Context:** System Prompt + Skill.md + Current Task.
* **The Result:** We get an agent specifically tailored for *that exact second*, without maintaining a bloated registry of permanent agent classes.

---

## 4. Swarm Memory & Continuity

Taking cues from `desplega-ai/agent-swarm` and `ruflo`:
* **Isolated Scratchpads:** Workers execute in temporary, isolated directories (Docker or specific local paths) to prevent cross-contamination.
* **The Compounding Brain:** Workers cannot write directly to the master repository. They output "pull requests" or "artifacts" to a designated `data-center/` queue. 
* **The Synthesis Gate:** The Queen (Claude) reads the worker outputs, judges them against the original goal, and commits the finalized learnings/code to `obsidian/Shay-Memory/` and the main repo.

---

## 5. Execution Plan (Next Steps for Shay)

To build this into our current stack, here is my implementation plan for the `shay-agent-os`:

1. **Update the Dispatcher (`dispatcher.py`):** Add support for `dynamic_workers` that accept a `skill_file` path upon initialization.
2. **Build the Flow Engine (`swarm_graph.py`):** Implement directional graph logic (like GPTSwarm/Agency Swarm) so I can chain workers sequentially or in parallel, with data flowing explicitly from Node A to Node B.
3. **Integrate Vercel Skills CLI:** Allow Shay to pull community skills on-the-fly (`npx skills add ...`) to instantly grant workers new capabilities (like specific API integrations) without writing them from scratch.
4. **Human-in-the-Loop (HITL) Checkpoints:** Ensure the `ask-claude` escalation and CLI approval gates are strictly enforced before any worker output is merged into production.

---
*End of Blueprint.*