# Platform Credits and Underused Benefits

Date: 2026-06-11
Purpose: identify known credits, free tiers, included surfaces, and underused platform-native benefits FAMtastic should exploit immediately.

## Scope warning

Observation:
- This pass focused more on platform surfaces than pricing tables, so only credits/free-tier items directly surfaced in first-party pages or existing repo context are listed as confirmed.
- Where a benefit is likely but not firmly confirmed in extracted docs, it is marked as “verify live in account.”

## Already-paying / already-available surfaces FAMtastic may be underusing

### 1. Poe subscription budget intelligence
Observation:
- Existing repo memory says Fritz uses Poe as primary chat surface, has a monthly points budget, and Haiku/Sonnet/Opus routing discipline is already relevant.

Interpretation:
- This vendor research packet should directly feed a Poe-side routing policy: cheap default for chat, premium only for adversarial review and hard synthesis.

Quick win:
- Add vendor-routing heuristics to Poe usage guidance and track “premium escalation only” compliance.

### 2. Anthropic Workbench / prompt generator / eval tool
Observation:
- Anthropic docs explicitly surfaced Workbench, prompt generator, eval tool, usage monitoring, batch testing, and pricing docs.

Interpretation:
- If FAMtastic is only using Anthropic as raw completion calls, it is underusing the platform.

Quick wins:
- test reusable orchestration prompts in Workbench
- trial eval tool on routing outputs
- pilot prompt caching on recurring workers

### 3. OpenAI eval datasets / agent evals / hosted tools
Observation:
- OpenAI docs surfaced datasets, eval getting started, agent evals, hosted tools, batch, background mode, flex processing, and stored prompt concepts.

Interpretation:
- If FAMtastic is only calling the model and ignoring hosted tool/eval surfaces, there is underused leverage.

Quick wins:
- build a routing-eval dataset
- test background mode on one long task class
- test flex processing on narrow non-urgent transforms

### 4. Google Agent Studio / prompt-to-webapp flow
Observation:
- Agent Studio supports prompt iteration, sharing, collaboration, and deploying a prompt as a web application.

Interpretation:
- This is likely underused by default because most teams still treat studios as demo toys.

Quick wins:
- prototype one internal app and one client-facing explainer in Agent Studio
- evaluate time-to-demo versus custom code path

### 5. Google managed observability / memory bank / retrieval surfaces
Observation:
- Google docs exposed sessions, memory bank, traces, topology, evaluateInstances, retrieveContexts, askContexts, augmentPrompt, datasets, and RAG configuration.

Interpretation:
- If FAMtastic wants app-building speed or managed agent ops, this surface is underused.

Quick wins:
- test one retrieval-grounded app
- test one observability-heavy agent workflow

### 6. AWS Bedrock prompt management / batch inference / model evaluation
Observation:
- Bedrock docs surfaced prompt management with variants, batch inference, EventBridge job notifications, and model evaluation jobs.

Interpretation:
- For any AWS-aligned environment, these are immediate operational levers.

Quick wins:
- test prompt management for governed prompt assets
- run one batch inference text-only wave
- compare Bedrock eval jobs vs local eval harness effort

## Confirmed credits / free-tier items surfaced in first-party docs

### Google Cloud
Confirmed:
- Google Cloud free program page surfaced $300 in free credit for new customers.
- Page also states some product free usage tiers exist up to monthly limits.
- Surfaced note from Google docs search results: the $300 free credit does not pay Gemini API costs in AI Studio; AI Studio has its own free-tier / billing rules to verify directly.

Action:
- Verify whether FAMtastic has unused GCP free-trial capacity or can still exploit free-tier services around Cloud Run, storage, BigQuery, etc.
- Do not assume AI Studio/Gemini usage is covered by the same credit bucket.

### Google product-specific free trials surfaced
Confirmed from the Google free page extract:
- product-specific trial examples include Cloud SQL, Spanner, and AlloyDB free trials

Interpretation:
- Not directly an LLM credit, but useful for app-building prototypes that need database backing.

### Anthropic
Confirmed in docs reviewed:
- no explicit trial-credit figure surfaced in the extracted docs during this pass
- major underused benefits are feature-surface benefits, not confirmed credit figures from the pages we pulled

Action:
- verify live in Anthropic console whether any startup/promotional credits or included usage buckets exist for the current workspace

### OpenAI
Confirmed in docs reviewed:
- no explicit free-credit figure surfaced in the extracted docs during this pass
- surfaced value is in product surfaces: evals, datasets, hosted tools, background mode, batch, flex

Action:
- verify current OpenAI account/billing dashboard for any included credits, promo grants, or dormant project allocations

### AWS / Bedrock
Confirmed in docs reviewed:
- no specific credit amount surfaced in the extracted pages for Bedrock itself during this pass
- surfaced operational benefits are prompt management, batch inference, evaluation, prompt caching, and enterprise integrations

Action:
- verify AWS account credits/free-tier status and whether any Bedrock promotional access or org credits are available

## Underused native storage / caching / memory / eval / studio features

### Anthropic high-value underused features
- prompt caching
- server-side compaction
- context editing
- programmatic tool calling
- MCP connector
- managed agents sessions/events/webhooks
- Workbench / prompt generator / eval tool
- usage and cost API

Immediate experiments:
1. prompt caching on orchestration scaffolds
2. programmatic tool calling on research lane
3. managed-agent session for one long-running job

### OpenAI high-value underused features
- Agents SDK
- server-managed continuations
- hosted search / file search / computer use / shell / skills surfaces
- background mode
- batch API
- flex processing
- eval datasets / graders / agent evals
- stored prompts / prompt infrastructure

Immediate experiments:
1. background mode for long synthesis
2. flex processing for narrow transforms
3. routing-eval dataset with graders

### Google high-value underused features
- Agent Studio collaboration and prompt iteration
- deploy prompt as web application
- prompt sharing
- sessions
- memory bank
- observability traces/topology
- retrieveContexts / askContexts / augmentPrompt
- cachedContents
- evaluateInstances
- generateSyntheticData
- batch prediction jobs
- BigQuery remote model integration

Immediate experiments:
1. prompt-to-webapp prototype sprint
2. retrieval/context service test
3. observability-heavy managed agent test

### AWS / Bedrock high-value underused features
- prompt management with variants
- prompt caching
- batch inference
- EventBridge notifications for batch jobs
- model evaluation jobs and prompt datasets
- Claude Platform on AWS for Anthropic feature parity under AWS auth/billing

Immediate experiments:
1. prompt management variant compare
2. one batch text-only workload
3. Claude Platform on AWS vs Bedrock comparison

## What FAMtastic is most likely underusing right now

Interpretation based on repo context + vendor research:
1. eval surfaces almost certainly underused
2. prompt caching almost certainly underused
3. background / batch / flex async economics underused
4. studio/playground surfaces for prototype velocity underused
5. managed retrieval/context services underused
6. managed session/event-stream features underused

## Quick-win experiments to cash in immediately

### Tier 1: fastest leverage
1. Anthropic prompt caching on recurring research/routing workers
2. OpenAI flex/background test on non-urgent transforms
3. Google Agent Studio prototype deployed as web app

### Tier 2: next operational leverage
4. OpenAI routing eval dataset
5. Anthropic programmatic tool calling research worker
6. Google retrieval/context API proof of concept

### Tier 3: enterprise/cloud strategy clarity
7. Claude Platform on AWS vs Bedrock bakeoff
8. Bedrock prompt management and batch inference proof
9. Google observability/memory bank trial on one managed agent app

## Decision notes by platform

### Best immediate cash-in opportunity
- Anthropic prompt caching

### Best immediate app-building velocity opportunity
- Google Agent Studio prompt-to-webapp flow

### Best immediate cost-governance opportunity
- OpenAI flex/background/batch experiments

### Best immediate enterprise-governed experimentation opportunity
- Bedrock prompt management + batch inference

## Verification checklist for live account review

Need to verify directly in current accounts:
- Anthropic: any workspace credits, beta access, usage/cost APIs enabled, managed agents access
- OpenAI: project-level unused grants, tool availability, eval surfaces enabled, batch/flex availability
- Google: current trial status, AI Studio billing behavior, Agent Platform permissions, Cloud Run deploy readiness
- AWS: credit status, Bedrock model access approvals, Claude Platform on AWS eligibility, regional availability

## Bottom line

Interpretation:
- The biggest “already paying but underusing” reality is probably not raw credits. It is unused platform capability.
- The fastest ROI is to exploit existing native features that cut plumbing, reduce premium-model misuse, and accelerate prototypes.
- Credits matter. Underused runtime surfaces matter more.