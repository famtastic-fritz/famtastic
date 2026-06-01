---
title: AI-OS Capability Map (2026-05-31)
type: report
permalink: shay-memory/research/capability-map-2026-05-31
---

# AI-OS Capability Map: Current Shay State vs. 11 Layers (2026-05-31)

This document maps current Shay capabilities and identified gaps against the proposed 11 layers of an AI Operating System, based on the research performed.

## Shay/Hermes Core Capability Definition

*   **Memory:** Agent's ability to store and recall information, both short-term (context window management) and long-term (knowledge bases, persistent state).
*   **Skills:** The set of reusable procedures, tools, or workflows an agent can execute to perform tasks.
*   **Context:** Mechanisms for managing, optimizing, and extending the information available to an LLM during its reasoning process (e.g., summarization, retrieval, token efficiency).
*   **Verification:** Processes and tools for ensuring the correctness, reliability, and safety of agent outputs and actions (e.g., testing, factual checking, formal verification).
*   **Orchestration:** The coordination and management of multiple agents, including task decomposition, workflow execution, inter-agent communication, and parallel processing.
*   **UI:** User interfaces enabling human interaction with agents, visualization of agent processes, and control mechanisms.

## Capability Mapping and Gap Analysis

| AI-OS Layer     | Key Repositories / Tools                               | Verdict       | Rationale & Shay/Hermes Mapping                     | Shay Current Capability & Gaps                                                                                                                                              |
| :-------------- | :----------------------------------------------------- | :------------ | :-------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RUNTIME**     | NousResearch/Hermes-Agent, VRSEN/OpenSwarm, earendil-works/pi | ADOPT-NOW / MONITOR | Core agent execution, multi-agent task handling. | Shay has basic runtime for single agents. Gaps: Scalable multi-agent runtime, robust process isolation/management, direct Hermes integration.                               |
| **MEMORY**      | Tencent/TencentDB-Agent-Memory, RyanCodrai/turbovec, GoogleCloudPlatform always-on-memory-agent, safishamsi/graphify, rohitg00/agentmemory, pablo-mano/Obsidian-CLI-skill | ADOPT-NOW / MONITOR | Persistent, scalable, semantic, and knowledge graph memory. | Shay utilizes Obsidian for long-term memory via the `memory` tool, but lacks dedicated local persistent databases or robust knowledge graph capabilities for agents.                                |
| **LONG-CONTEXT**| zircote/rlm-rs                                         | ADOPT-NOW     | Recursive Language Models for large document processing. | Shay's current context window is bound by upstream LLM providers. Gaps: Efficient handling of context beyond API limits, structured chunking/retrieval.                   |
| **CONTEXT-HYGIENE**| rtk-ai/rtk, alexgreensh/token-optimizer             | ADOPT-NOW / OVERLAPS-EXISTING | Token optimization, context quality, cost efficiency. | Shay implicitly manages context but lacks explicit, tool-driven token optimization and quality checks. Gaps: Automatic token reduction, ghost token identification.           |
| **VERIFICATION**| doeixd/opencode-ralph-rlm, 0xNyk/council-of-high-intelligence, yaoshengzhe/autoloop | ADOPT-NOW / MONITOR | Iterative development, sub-agent reviews, collective intelligence. | Shay is 'proof-driven' but lacks structured, automated verification loops or multi-LLM consensus mechanisms. Gaps: Formal verification, iterative refinement loops, collective decision-making. |
| **SKILLS**      | multica-ai/andrej-karpathy-skills, seb1n/awesome-ai-agent-skills, abinauv/business-consulting, anthropics/claude-plugins-official, pablo-mano/Obsidian-CLI-skill | ADOPT-NOW     | Foundational, specialized, and external skill acquisition. | Shay has a robust `skill` tool. Gaps: Curated, pre-built skill libraries, domain-specific skills, easy integration of external skill sets.                                     |
| **UI**          | alibaba/page-agent, nesquena/hermes-webui, outsourc-e/hermes-workspace, uezo/ChatdollKit | ADOPT-NOW / MONITOR | Web/mobile interaction, visual automation, integrated workspaces. | Shay's primary UI is CLI-driven (`shay chat`). Gaps: A rich web/desktop workspace, visual automation, mobile integration, natural language UI control.                     |
| **RESEARCH**    | aiming-lab/AutoResearchClaw, huggingface/ml-intern, unclecode/crawl4ai, liuchong/awesome-roadmaps, piesauce/awesome-dLLM-resources | ADOPT-NOW     | Autonomous research, ML development, information gathering. | Shay performs research via web search and reasoning. Gaps: Autonomous goal-driven research, automated ML model development, advanced data scraping, structured knowledge curation. |
| **CODING**      | CodebuffAI/codebuff, Laguna XS.2                    | ADOPT-NOW / MONITOR | Terminal-based code generation, specialized AI coding models. | Shay relies on delegating to coding subagents. Gaps: Highly efficient, domain-specific code generation *directly* integrated into Shay's core, improved coding models.       |
| **MODELS**      | Command A+, Nemotron 3 Super, OpenBMB/MiniCPM, vllm-project/vllm, unslothai/unsloth | ADOPT-NOW / MONITOR | Diverse LLMs, inference optimization (local/cloud). | Shay uses a mix of OpenRouter-backed models (Gemini, Claude, Ollama). Gaps: Optimized local model serving, specialized small models, robust multi-model routing.              |
| **INFRA**       | IceWhaleTech/CasaOS, unitech/pm2, web3infra-foundation/mega, arainho/awesome-api-security, vllm-project/vllm | ADOPT-NOW / MONITOR | Process management, personal cloud, monorepo, API security. | Shay runs in a local environment. Gaps: Robust process management (`pm2`), secure API interaction, personal cloud integration, scalable code repository.                         |
