# Vendor Capability Full Audit Prompt

_Last updated: 2026-06-11_

Use this prompt to generate a full capability specification across OpenAI, Anthropic, Google/Gemini, and AWS Bedrock. This is not a narrow review of pasted links. It must start from official docs, discover the full platform surface, then produce a routing-ready capability matrix for Shay and FAMtastic.

---

## Prompt

You have access to the GitHub repo:

`famtastic-fritz/famtastic`

Your job is to perform a **full vendor capability audit** for AI platform surfaces that Fritz may already be paying for or underusing.

Do **not** limit the audit to links Fritz pasted. Use those links as seeds only. You must discover the broader official documentation tree for each vendor and produce a complete, routing-ready capability specification.

Primary vendors:

1. OpenAI / ChatGPT / Codex / OpenAI API
2. Anthropic / Claude / Claude Code / Claude Platform
3. Google AI Studio / Gemini API / Gemini Enterprise Agent Platform / Vertex AI / Google Cloud AI
4. AWS Bedrock / Claude Platform on AWS / Bedrock Agents / Bedrock Batch / Bedrock Evals

Optional secondary vendors if directly relevant:

- Microsoft Foundry / Azure AI Foundry
- Z.ai / GLM
- OpenRouter
- Vercel AI SDK
- Pinecone
- Resend
- GoDaddy / cPanel / hosting APIs

---

## Required Mindset

Stop thinking “best model.” Start thinking:

> Best platform surface for this task class.

For each vendor, identify capability surfaces such as:

- model families
- agent runtimes
- SDKs
- CLI tools
- hosted tools
- tool/function calling
- MCP/connectors
- skills/custom workflows
- background/async execution
- batch processing
- flex/priority/latency tiers
- prompt caching
- context compaction
- session/state management
- memory systems
- retrieval/RAG/file search/vector search
- web search/browsing tools
- code execution/sandbox/computer use
- evals/graders/datasets/synthetic data
- tracing/observability/logging
- prompt management/versioning
- workflow orchestration
- deployment surfaces
- authentication/secrets/governance
- billing/credits/free tiers/rate limits
- enterprise/governed variants
- known limitations/caveats

---

## Output File

Create or update:

`docs/famtastic-designs/vendor-capability-full-audit.md`

If that file already exists, update it carefully and preserve useful existing content.

Also create or update:

`docs/famtastic-designs/vendor-capability-verification-tasks.md`

This second file should list what still needs live account verification.

---

## Required Structure for `vendor-capability-full-audit.md`

# Vendor Capability Full Audit

## 1. Executive Summary

Include:

- biggest leverage findings
- strongest provider by task class
- immediate routing changes for Shay
- immediate opportunities for FAMtastic Designs
- what must be verified live in account dashboards

## 2. Source Policy

State clearly:

- Official vendor docs are preferred.
- Blog posts are secondary.
- Third-party posts are only supporting context.
- Feature availability, pricing, quotas, and credits must be verified live in Fritz’s account.
- If a feature is in public docs but may not be enabled for Fritz, mark it `VERIFY_ACCOUNT`.
- If a feature name cannot be verified in official docs, mark it `UNVERIFIED_TERM` and replace with official terminology.

## 3. Provider Surface Matrix

Create a table:

| Provider | Surface | Official feature name | What it does | Best task classes | Cost pattern | Maturity | Use now / Pilot / Defer / Avoid | Source | Account verification needed |
|---|---|---|---|---|---|---|---|---|---|

## 4. OpenAI Capability Spec

Cover at minimum:

- Responses API
- Agents SDK
- OpenAI SDK / CLI
- hosted tools
- web search
- file search / retrieval
- tool search
- computer use
- shell / local shell / code interpreter where applicable
- structured outputs
- function calling
- background mode
- streaming
- webhooks
- batch
- flex processing
- prompt caching
- conversation state
- compaction/context management
- evals
- graders
- datasets
- prompt optimizer if available
- Codex app / CLI / SDK / subagents / workflows / skills / MCP / GitHub integration
- ChatGPT custom GPTs / actions / Apps SDK / MCP apps / Workspace Agents / commerce if relevant
- model families and which task classes they should serve
- rate limits / usage tier considerations
- billing/credit caveats

For each feature:

- official name
- source URL
- summary
- best use in Shay
- best use in FAMtastic Designs
- when not to use
- cost/risk caveat
- experiment to validate

## 5. Anthropic Capability Spec

Cover at minimum:

- Messages API
- Claude Code
- Claude Code CLI/workflows/subagents/skills/MCP/hooks where documented
- prompt caching
- automatic/explicit cache breakpoints
- batch processing
- structured outputs
- tool use
- strict/parallel tool use
- programmatic tool calling
- tool context management
- tool search
- server tools: web search, web fetch, code execution, bash, computer use, text editor, memory tool if documented
- context windows
- compaction/context editing
- token counting
- MCP connector / remote MCP
- Skills / Skills API
- Managed Agents if documented
- Claude Platform on AWS
- Amazon Bedrock / Vertex variants
- model families and which task classes they should serve
- pricing/caching caveats
- billing/credit/account verification caveats

For each feature:

- official name
- source URL
- summary
- best use in Shay
- best use in FAMtastic Designs
- when not to use
- cost/risk caveat
- experiment to validate

## 6. Google Capability Spec

Split Google into clear lanes:

### 6.1 Google AI Studio / Gemini API

Cover:

- model playground/studio
- prompt/app prototyping
- model comparison
- API keys
- model families
- context windows
- grounding/search features if available
- structured output/function calling/tools if available
- Files API / retrieval if available
- batch/caching/cost features if available
- app export/deployment features if available

### 6.2 Gemini Enterprise Agent Platform / Vertex AI / Google Cloud

Cover:

- Agent Studio
- Managed Agents API
- Agent Development Kit (ADK)
- Agent Runtime
- Sessions
- Memory Bank
- RAG Engine
- Agent Retrieval / Vector Search / Agent Search
- Agent Gateway
- Agent Registry
- Skill Registry
- authentication/auth manager
- sandbox / code execution / computer use
- tracing / logging / monitoring
- observability / view traces / relationships
- evaluations / simulations / online monitors
- Example Store / synthetic data / prompt optimization if available
- BigQuery adjacency and analytics relevance
- Cloud Run/Functions/Workflows integration where useful

Important:

- Do not use unverified terms like `retrieveContexts`, `askContexts`, or `augmentPrompt` unless you find official docs for those exact names.
- If you cannot verify them, mark them `UNVERIFIED_TERM` and replace with official terms like Sessions, Memory Bank, RAG Engine, Agent Retrieval, Agent Runtime, or Agent Platform evaluation.

For each feature:

- official name
- source URL
- summary
- best use in Shay
- best use in FAMtastic Designs
- when not to use
- cost/risk caveat
- experiment to validate

## 7. AWS Bedrock Capability Spec

Cover:

- Bedrock foundation model access
- Bedrock Agents
- Action groups
- Knowledge Bases
- Guardrails
- Prompt Management
- Prompt variants/versioning
- Bedrock Flows if relevant
- Batch inference
- Provisioned throughput caveats
- Evaluation jobs: automatic, human, judge model, RAG evaluation
- Prompt routers if relevant
- S3/EventBridge integration
- AWS governance/security posture
- Claude on Bedrock vs Claude Platform on AWS distinction

Important caveat:

- Bedrock batch inference does **not** support tool calling/function calling or structured output. Note this clearly and route schema/tool-heavy tasks elsewhere.

For each feature:

- official name
- source URL
- summary
- best use in Shay
- best use in FAMtastic Designs
- when not to use
- cost/risk caveat
- experiment to validate

## 8. Cross-Provider Routing Matrix

Create a table:

| Task class | Best default surface | Cheapest acceptable surface | Premium escalation | Batch/background option | Cacheability | Retrieval/memory option | Eval/QA option | Avoid |
|---|---|---|---|---|---|---|---|---|

Task classes must include:

- strategy/architecture
- code generation
- repo editing
- multi-agent orchestration
- long-running research
- lead discovery
- lead classification
- presence scanning
- proof generation
- proof QA
- outreach drafting
- compliance/deliverability checking
- structured transforms
- document summarization
- RAG/retrieval
- memory/session management
- eval/regression testing
- image generation
- video generation
- voice/audio
- mobile app prototyping
- web app prototyping
- analytics/reporting
- cost auditing
- workflow automation

## 9. Shay Routing Policy Draft

Convert the research into actionable routing rules:

- local sync
- local async
- provider-managed session
- provider batch
- provider background
- provider retrieval service
- provider studio/prototype surface
- human review / escalation

Include a `cloud_offload_decision()` style pseudo-algorithm.

## 10. FAMtastic Designs Integration Plan

Explain exactly how these vendor capabilities can support:

- FAMtastic Proof Engine
- Church Connect
- nonprofit proofs
- local service proofs
- professional service proofs
- immersive site/showroom build
- app marketplace lane
- custom GPT / assistant products
- AI automation services for clients
- backend/admin/workstream tracker
- cost control
- eval and quality tracking

## 11. Experiments

Create experiment cards:

| Experiment | Provider | Feature | Hypothesis | Setup | Inputs | Success bar | Failure bar | Cost estimate | Owner | Output artifact | Decision after test |
|---|---|---|---|---|---|---|---|---|---|---|---|

Minimum experiments:

1. Anthropic prompt caching on recurring Shay scaffolds
2. Anthropic tool/context-management lane for research
3. OpenAI batch/flex/background for non-urgent transforms
4. OpenAI eval/graders for routing QA
5. OpenAI hosted web/file/search tools for presence scanning
6. Google Agent Studio / AI Studio prototype sprint
7. Google Sessions + Memory Bank + RAG Engine proof
8. Google Agent Runtime deployment proof
9. AWS Bedrock prompt management + prompt variants proof
10. AWS Bedrock batch proof for non-tool async jobs
11. Bedrock eval proof
12. Claude Platform on AWS vs Bedrock distinction bakeoff

## 12. Account Verification Checklist

Create checklist:

| Provider | Feature | Docs say available? | Account enabled? | Credit included? | Usage/rate limit known? | Billing risk | How to verify live | Status |
|---|---|---|---|---|---|---|---|---|

## 13. Recommendations

Give:

- immediate use now
- pilot next
- defer
- avoid
- best first 5 experiments
- top 10 routing rules to implement in Shay
- top 10 FAMtastic monetization opportunities from platform capabilities

---

## Required Structure for `vendor-capability-verification-tasks.md`

Create a practical checklist for Fritz/Shay to verify live-account access.

Each row:

| Task ID | Provider | Dashboard / CLI / URL | What to check | Why it matters | Safe to paste? | Owner | Status |
|---|---|---|---|---|---|---|---|

Rules:

- Do not ask Fritz to paste secrets.
- Ask for screenshots or non-secret status text only.
- Mark anything involving keys/tokens as `DO NOT PASTE SECRET`.
- If CLI checks are possible, provide commands that avoid printing secrets.

---

## Final Instruction

Do the audit like a real platform architect.

Do not just summarize vendor marketing pages.

Produce a capability spec that can become:

- Shay routing policy
- FAMtastic Proof Engine routing policy
- vendor-capability-matrix.md replacement or upgrade
- experiment backlog
- account verification checklist
- future FAMtastic Thoughts article seeds

Save the files and commit them to the repo.
