# Vendor Capability Matrix — OpenAI vs Anthropic vs Google/Gemini vs AWS/Bedrock

Date: 2026-06-11
Purpose: operational routing matrix for Shay orchestration, localized worker design, cloud offload decisions, app-building velocity, and FAMtastic Thoughts/product ideas.

## Scope and evidence notes

Observation:
- This matrix is grounded in first-party docs/pages reviewed during this pass: OpenAI API docs/guides (models, Agents SDK, tools, background mode, batch, flex processing, evals), Anthropic Claude docs (prompt engineering, prompt caching, compaction, tool use, MCP connector, managed agents, batch processing, AWS docs), Google Cloud Gemini Enterprise Agent Platform / Agent Studio docs, Google AI Studio pages, and AWS Bedrock docs (prompt caching, batch inference, prompt management, evaluation, Claude support).
- Some vendor pages were partially extractable or search-snippet-only. Where exact implementation details were thin in extraction, recommendations are marked as interpretation or experiment-first.

Interpretation:
- The winning pattern is not “pick one provider.” It is “route by task class, latency sensitivity, observability needs, and context-shape.”
- For FAMtastic, the real leverage is modular worker specialization plus selective provider-native offload.

## Active orchestration rule update

Observation:
- As of 2026-06-16, plan discussion alone is not sufficient for live multi-session work. Active sessions need an explicit work-packet restatement to avoid drift between conversational intent and execution-lane truth.

Interpretation:
- For FAMtastic orchestration, the minimum actionable packet is now: goal, tasks, branch, worktree, main-landing expectation, truth-surface updates (especially capability-matrix updates), and proof.
- If branch/worktree are not needed, the packet should say that explicitly instead of omitting the fields.

Observation:
- As of 2026-06-18, the default human-facing planning surface is now the ultra-brief scram-line format rather than the heavier packet. The scram-line brief carries: Title, Purpose, Goal, checkbox Tasks, Status, Started, Ended, Execution, Research, Review, Skills, optional Blocked By, and Proof.

Interpretation:
- The heavy packet remains the control-plane truth when a task needs machine-checkable lane/control details.
- The scram-line brief is the default communication surface for Fritz because resumability lives in the checkbox tasks and the richer orchestration data is already captured elsewhere in telemetry and ledgers.

## Executive matrix

| Task class | Modality | OpenAI strengths | Anthropic strengths | Google/Gemini strengths | AWS/Bedrock angle | Native features relevant to task | Cheapest sufficient pattern | Premium escalation pattern | Recommended worker shape | Observability / eval needs | Caveats / risks |
|---|---|---|---|---|---|---|---|---|---|---|---|
| High-stakes architecture reasoning | text | Strong Agents SDK surface; structured agent orchestration docs; server-managed continuations | Strong long-context reasoning; prompt engineering docs mature; compaction for long-running work | Gemini reasoning available in Agent Studio / Agent Platform; strong cloud integration | Bedrock gives governance and enterprise controls, not necessarily best ergonomics | OpenAI Agents SDK, Anthropic extended reasoning + compaction, Gemini Agent Platform sessions | Cheap reasoning worker only if task is narrow and reviewable | Premium reasoning model with adversarial review | Premium reviewer / architect lane | Must define eval criteria and compare outputs side-by-side | Lock-in if plans depend on provider-native agent runtime semantics |
| Long-running agent sessions | text + tools | ConversationId / previousResponseId continuation patterns; background mode | Server-side compaction; managed agents sessions/events/webhooks; multiagent sessions | Agent Platform sessions, managed runtime, memory bank | Bedrock useful if infra/compliance drive decision | Compaction, session stores, managed runtime, event streams | Local orchestrator + cheap workers + checkpointing | Managed session runtime for high-friction long tasks | Durable orchestrator lane | Need run history, token usage, stall detection, resumability | Managed runtime abstractions can create migration pain |
| Multi-tool research and synthesis | web + text + files | Hosted tools, web search, file search, tool search, sandbox agents | Programmatic tool calling reduces context bloat; tool search concept is especially strong; MCP connector | Agent Platform plus RAG/context APIs and Google Cloud data adjacencies | Bedrock can host batch and prompt assets but less elegant for iterative tool work | Tool search, programmatic tool calling, hosted search/retrieval | Cheap search workers + local synth | Premium synthesis over prefiltered artifacts | Research-scout workers + premium synthesizer | Need source capture, citation checks, answer grading | Search quality and tool behavior vary by vendor and can drift |
| Retrieval / file-grounded Q&A | files + text | File search/retrieval, stored prompts, server-managed context | Files API + prompt caching + MCP connector to external systems | RAG engine, retrieveContexts, askContexts, memory bank, BigQuery adjacency | Bedrock has prompt management and can combine with broader AWS data estate | File search, RAG, memory bank, cached contexts | Cheapest model + retrieval layer | Strong model over curated retrieval set | Retrieval worker | Need hallucination checks and source-grounding evals | Retrieval quality depends more on chunking/indexing than model brand |
| Browser/computer action | UI + text | Computer use docs; shell/skills/hosted tools inside Agents world | Computer use + code execution + managed agents tooling; strong for agentic loops | Google has agent platform runtimes but less obvious first-party emphasis on desktop/browser control in surfaced docs | Bedrock exposes agent computer use options via its agent layer | Computer use, code execution, session event streams | Use only when direct APIs unavailable | Premium model with narrow permission policy | Specialized browser-action worker | Must log each action and success criterion | Expensive and brittle versus API-native paths |
| Batch offline processing | text / files / evals | Batch API plus flex processing for non-urgent work | Message Batches API | Batch prediction jobs, datasets, evaluateInstances | Bedrock batch inference directly to S3 | Batch APIs, flex mode, cached prompts | Cheapest batch-capable model | Premium spot-check on batch samples only | Batch worker lane | Need sampling audits, error-rate reporting, cost dashboards | Some batch surfaces disable tools/structured interaction |
| Prompt iteration / playground work | text / multimodal | Evals/datasets/prompt tools and stored prompts | Workbench + prompt generator + eval tool | Agent Studio / AI Studio are strong collaborative prompt/playground surfaces; deploy prompt as web app | Bedrock Prompt management stores variants and compare/test flows | Prompt workbenches, saved prompts, variant testing, deploy-to-web | Cheap playground loop using flash-tier model | Premium judge or final creative pass | Prompt-lab worker | Must compare variants against real tasks, not vibes | Playground wins can fail in production unless inputs are realistic |
| Evaluation / regression testing | text / datasets | Evals, graders, datasets, agent evals | Define success criteria + develop tests docs; eval tool; batch testing | evaluateInstances, synthetic data generation, dataset machinery, observability | Bedrock model eval jobs and prompt datasets | Evals, graders, datasets, prompt datasets, synthetic data | Cheapest judge that correlates with human review | Premium judge for final cert or edge cases | QA/eval worker separate from implementer | Critical: separate observation from interpretation | Judge-model bias and rubric weakness can create false confidence |
| Cost-sensitive structured transformation | text / JSON | Structured outputs, batch, flex | Structured outputs; caching; cheap Haiku-like tier path | Flash-style fast cheap models; cachedContents | Bedrock cost savings depend on routing + cache patterns | Structured outputs, caching, batch | Cheapest small/flash model with JSON schema | Premium escalation only on failure or ambiguity | Localized parser / transformer worker | Need schema validation and retry taxonomy | Overusing premium models here is pure waste |
| App prototyping from prompts | text / UI / multimodal | Agents + stored prompts + hosted tools are strong for code-first | Managed agents + skills + Workbench can support serious prototyping | Agent Studio shines here: prompt iteration, share/save, deploy prompt as web app, Cloud Run bridge | Bedrock prompt management good for enterprise prompt assets, not the most fluid prototyping UX | Agent Studio deploy, OpenAI SDK, Anthropic workbench/skills | Start in studio/playground with cheap model | Escalate to premium reasoning only for architecture and QA | Prototype-lab lane | Need handoff path from demo to real repo/app | Studio demos can become dead-end toys if no code export path |
| Enterprise governance / IAM-heavy deployment | text + systems | Improving enterprise surface, but this pass centered more on developer tooling | Claude Platform on AWS offers full Anthropic feature surface under AWS billing/auth | Google strongest integrated cloud governance surface in docs reviewed | Bedrock strongest when AWS IAM, S3, EventBridge, compliance, regional control matter | IAM, webhooks, batch jobs, S3, Cloud Run, managed runtime | Use existing cloud estate first | Premium model only where outcome demands | Enterprise-runtime lane | Need audit logs, access policy tests, billing visibility | Governance benefits can hide feature lag or slower vendor rollouts |

## Operational takeaways by provider

### OpenAI

Observation:
- OpenAI docs strongly expose a code-first agent stack: Agents SDK, orchestration docs, evaluate-agent-workflows docs, tools, skills, shell, computer use, retrieval, webhooks, compaction, batch, background mode, flex processing, and eval datasets.
- OpenAI docs also expose server-managed continuation patterns: session objects, conversation IDs, previous response IDs.

Interpretation:
- OpenAI is strongest when Shay wants a documented developer platform for hosted tools plus code-defined agents without inventing the entire loop by hand.
- It is particularly good for: app-building accelerators, prototype-to-code workflows, hosted tool composition, and eval-driven agent refinement.

Best fit task classes:
- App prototypes
- Code-first agent apps
- Hosted web/file/computer tool workflows
- Batchable structured transforms
- Eval-heavy agent development

Worker recommendations:
- OpenAI app-prototyper worker
- OpenAI hosted-tools research worker
- OpenAI eval/grader worker

Risks:
- Easy to over-adopt hosted features and blur the line between portable orchestration logic and provider-specific runtime behavior.
- Computer-use/browser-native flows should be used surgically, not as default plumbing.

### Anthropic

Observation:
- Anthropic docs were unusually strong on long-context agent mechanics: prompt caching, server-side compaction, context editing, programmatic tool calling, MCP connector, managed agents, cloud sandboxes, session event streams, webhooks, skills, and multiagent sessions.
- Programmatic tool calling explicitly reduces round trips and token/context load by letting Claude write code that calls tools inside code execution.
- Prompt caching docs emphasize placing cache breakpoints at the last shared block and keeping volatile data out of cacheable prefixes.

Interpretation:
- Anthropic looks strongest for serious orchestration architecture, long-running sessions, tool-heavy work that would otherwise bloat context, and cases where you want context-window extension without hand-rolled summarizers.
- It is the clearest provider in this pass on “how to keep agent loops from drowning in their own history.”

Best fit task classes:
- Long-running orchestrators
- Tool-heavy research flows
- Complex coding/analysis sessions
- Reusable skill-driven specialist agents
- MCP-native external-tool access

Worker recommendations:
- Anthropic long-run orchestrator
- Anthropic MCP skill worker
- Anthropic programmatic-tool research worker

Risks:
- Feature set is rich enough that it can seduce the architecture into Anthropic-shaped assumptions.
- Some important features are beta-gated and may require header/version management.

### Google / Gemini / Agent Platform

Observation:
- Google’s docs exposed an unusually broad cloud-native agent surface: Agent Studio, deploy prompt as a web application, prompt sharing, sessions, memory bank, observability/traces/topology, offline evaluation, datasets, synthetic data generation, cachedContents, retrieveContexts/askContexts/augmentPrompt, RAG engine configuration, batch prediction jobs, and BigQuery integration.
- Agent Studio appears designed as a collaborative build/test/deploy surface rather than just a playground.
- BigQuery remote model support means FAMtastic can bring model inference closer to analytical data without building custom glue first.

Interpretation:
- Google is strongest where app-building, prototyping, data-adjacent retrieval, and managed observability matter more than minimalism.
- It is the most “platformy” of the three in the sense of bringing prompt iteration, managed runtime, retrieval, observability, and deployment under one roof.

Best fit task classes:
- Studio-assisted prototyping
- Prompt-to-webapp experiments
- Retrieval and context services
- Enterprise agent management with observability
- Data-adjacent agent workflows via BigQuery

Worker recommendations:
- Agent Studio prototype worker
- Gemini retrieval/context worker
- BigQuery-connected analytics worker

Risks:
- Surface area is large and potentially complex; easy to spend time configuring instead of shipping.
- Strong cloud integration can create deep dependence on Google-specific services if not modularized.

### AWS / Bedrock and Claude Platform on AWS

Observation:
- Bedrock gives prompt caching, prompt management, batch inference, model evaluation jobs, S3-backed async workflows, EventBridge notifications, and broad model marketplace access.
- Bedrock batch inference explicitly does not support tool calling or structured output in the surfaced docs, which matters for workflow design.
- Claude Platform on AWS is distinct from Bedrock: full Anthropic platform features through AWS billing/auth versus AWS-operated Bedrock API surface.
- AWS docs explicitly note that Claude Platform on AWS gets same-day Anthropic features, while Bedrock feature availability depends on AWS integration timeline.

Interpretation:
- The AWS decision is not one thing. There are two lanes:
  1. Bedrock for AWS-native governance, S3/EventBridge/batch/eval/prompt asset management.
  2. Claude Platform on AWS when you want Anthropic’s first-party features but need AWS billing/auth/control patterns.

Best fit task classes:
- Enterprise batch processing
- Governed prompt asset management
- S3-centric async pipelines
- AWS-identity-bound deployments
- Anthropic-on-AWS without losing Anthropic feature velocity

Worker recommendations:
- Bedrock batch/eval worker
- AWS-governed prompt-ops worker
- Claude-on-AWS enterprise orchestrator

Risks:
- Bedrock can lag first-party feature velocity.
- Bedrock API differences complicate portability if the team mentally treats it as “just Anthropic.”

## Task-class routing recommendations for Shay

### 1. Premium reasoning models
Use for:
- architecture decisions
- ambiguous synthesis
- adversarial review
- workflow/routing policy creation
- high-risk client-facing recommendations

Recommended lane:
- Anthropic premium or OpenAI premium as planner/reviewer
- keep Google premium in the comparative lane for studio/prototype and retrieval-heavy cases

### 2. Cheaper structured-output workers
Use for:
- extraction
- tagging
- classification
- schema fills
- summarization of narrow artifacts
- diff explanations

Recommended lane:
- OpenAI batch/flex or Gemini flash-style worker or Anthropic cheaper tier depending price/access
- never let premium reasoning be the default for predictable transforms

### 3. Native tools
Use for:
- web search, file search, code execution, retrieval, browser/computer actions, MCP access

Recommended lane:
- OpenAI when hosted tool suite is the shortest path
- Anthropic when tool-heavy work benefits from programmatic tool calling or MCP connector
- Google when retrieval/context/data integrations are the point

### 4. Batch/background workflows
Use for:
- non-urgent large-volume work
- nightly research pulls
- eval suites
- classification of large backlogs
- document conversion waves

Recommended lane:
- OpenAI Batch / Flex for volume discount patterns
- Anthropic Message Batches for async messages volume
- Bedrock batch inference for S3-centered enterprise jobs
- Google batch prediction jobs for Cloud-native runs

### 5. Cached prompt patterns
Use for:
- stable system prompts
- stable tool definitions
- reusable brand/context packets
- multi-turn sessions with large repeated prefixes

Recommended lane:
- Anthropic first for long agent sessions with shared prefixes
- Google cachedContents where context objects should be persisted cloud-side
- OpenAI prompt/storage features for prompt asset reuse
- Bedrock prompt caching when AWS is already the runtime estate

### 6. Memory stores / retrieval layers
Use for:
- long-lived knowledge packets
- per-project retrieval
- run history context
- app-side memory services

Recommended lane:
- Anthropic compaction for conversation memory, not knowledge base replacement
- Google memory bank / RAG / retrieveContexts for managed retrieval services
- OpenAI retrieval/file search for agent app grounding
- local memory remains necessary for portable, sovereign knowledge

### 7. Research-oriented models
Use for:
- doc mining
- literature comparison
- vendor monitoring
- market scans

Recommended lane:
- Hosted search tools or provider-native retrieval where citation capture matters
- local synthesizer should merge source packets and preserve observation/interpretation split

### 8. Managed / hosted agent flows
Use for:
- long-lived multi-step flows where infrastructure burden is the blocker
- secure enterprise sessions
- app prototypes with built-in observability and deployment

Recommended lane:
- Anthropic Managed Agents for code/tool/MCP-heavy flows
- Google Agent Platform when you want managed lifecycle + observability + memory bank + deployment surfaces
- OpenAI Agents SDK when code-first control matters more than a full hosted runtime

### 9. Studio / playground-assisted iteration
Use for:
- prompt tuning
- multimodal experiments
- rapid demo creation
- stakeholder review prototypes

Recommended lane:
- Google Agent Studio first for collaborative prompt-to-webapp work
- Anthropic Workbench for Claude-specific prompt refinement
- OpenAI prompt/evals/datasets tools for code-first refinement loops
- Bedrock Prompt management if enterprise prompt governance is the real requirement

## Cheapest-sufficient patterns by common FAMtastic task

| FAMtastic task | Cheapest sufficient pattern | Premium escalation |
|---|---|---|
| Tag and summarize captured ideas | cheap structured-output worker + schema validator | premium reviewer only for ambiguous/high-value items |
| Research competitor/vendor docs | hosted search/retrieval worker + local synth | premium model for final strategic memo |
| Generate capability matrix drafts | cheap worker populates rows from collected evidence | premium planner reconciles disagreements |
| Client education packet | studio/playground draft + cheap polishing worker | premium editorial pass |
| Prompt-library maintenance | cached prompt patterns + playground comparison | premium pass only when output drift appears |
| Large eval run | batch/flex/batchPrediction jobs | premium judge on stratified sample |
| Long-running coding or tool session | managed session + compaction or sandbox | premium model only at decision gates |
| UI/browser task with no API | narrow computer-use worker | premium model if the state is visually ambiguous |

## Recommended localized workers to create next

1. Vendor-docs miner
- Inputs: vendor URLs, themes, task classes
- Output: normalized markdown packet with observation vs interpretation split
- Best native leverage: hosted search/retrieval + batch updates

2. Prompt-cache planner
- Inputs: prompt templates, tool definitions, reuse frequency
- Output: cache breakpoint plan, volatility map, estimated savings hypotheses
- Best native leverage: Anthropic prompt caching, Google cachedContents, Bedrock prompt caching

3. Eval harness builder
- Inputs: task family, rubric, sample inputs, expected outputs
- Output: dataset, graders/judges, pass/fail thresholds
- Best native leverage: OpenAI evals/datasets, Anthropic test docs/eval tool, Google evaluateInstances

4. Retrieval/RAG surface selector
- Inputs: corpus type, freshness needs, access controls, latency target
- Output: recommend local vs provider-native retrieval architecture
- Best native leverage: Google context/RAG services, OpenAI retrieval, Anthropic MCP-backed external retrieval

5. Studio prototype worker
- Inputs: product idea, prompt, constraints
- Output: prompt variant set, demo artifact path, deploy recommendation
- Best native leverage: Google Agent Studio deploy-to-webapp, OpenAI code-first agent demo, Anthropic Workbench/skills

6. Batch economics router
- Inputs: volume, urgency, tool-use need, structured output need
- Output: sync vs background vs batch route with cost hypothesis
- Best native leverage: OpenAI flex/batch, Anthropic batches, Bedrock batch inference, Google batch jobs

## Lock-in / blind-spot warnings

1. Managed runtimes feel like progress until you need portability.
2. Retrieval features can hide the hard part: corpus design and evals still matter.
3. Computer-use/browser-use is tempting but often inferior to direct API integration.
4. Batch APIs save money only when the task can tolerate async and reduced interactivity.
5. Prompt caching is not free magic; volatile prefixes kill the savings.
6. Enterprise cloud governance benefits can come with feature lag and complexity.
7. Playground wins do not equal production wins unless paired with real evals and real inputs.

## Bottom line

Interpretation:
- Anthropic currently looks strongest for Shay’s long-running orchestration brain.
- OpenAI looks strongest for code-first agent app surfaces and hosted tool composition.
- Google looks strongest for studio-assisted prototyping, managed agent lifecycle, retrieval/context services, and observability-heavy cloud app workflows.
- AWS/Bedrock matters when governance, billing, IAM, and async enterprise pipelines outweigh feature-speed purity.

That means Shay should route by lane, not loyalty.