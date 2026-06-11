# Mythos Upgrade Packet — 2026-06-11

Purpose: strengthen the current Mythos planning prompt so it designs the FAMtastic Designs Foundation MVP with explicit specialized-capability routing, native vendor feature awareness, and cheapest-sufficient execution logic.

## What was checked

Primary source files reviewed from origin/main:
- docs/famtastic-designs/mythos-master-prompt.md
- docs/famtastic-designs/foundation-findings.md
- docs/famtastic-designs/infrastructure-inputs.md
- docs/famtastic-designs/interviews/chatgpt-foundation-interview-2026-06-11.md

Vendor docs checked directly:
- OpenAI API docs surface (models/tools/background/tool search/web search/etc.)
- Anthropic prompt caching docs
- Anthropic cookbook index

## Core finding

The current Mythos prompt package is strong on:
- business thesis
- proof-first revenue logic
- immersive/non-cookie-cutter direction
- multi-agent requirement
- interview-first planning

But it is still weak on one key dimension:

It does not force Mythos to actively prefer specialized/native capabilities and cheapest-sufficient execution paths before defaulting to premium general reasoning models.

## What needs to change

Mythos should be explicitly required to:
1. identify provider-native features before inventing generic workflows
2. separate premium reasoning from repetitive worker execution
3. recommend specialized workers where tasks recur
4. evaluate cost-saving API features such as prompt caching, batch/background processing, structured outputs, and tool-native execution
5. produce a routing design based on capability fit, not just model prestige

## Surgical additions for mythos-master-prompt.md

### Add this section after “High-Level Outcome”

## Specialized Capability / Cheapest-Sufficient Rule

Do not default to premium general-purpose reasoning for every task.

For each major workflow or agent responsibility, first evaluate whether the task is better served by:

- A provider-native feature
- A specialized model
- A purpose-built endpoint or tool
- A lower-cost model with structured output or tool support
- A background, batch, cached, or asynchronous execution pattern
- A dedicated localized worker instead of a general reasoning loop

Decision rule:

> Prefer the cheapest sufficient specialized capability that meets the quality bar. Use premium reasoning models only where architecture, ambiguity, novel strategy, or final quality review truly require them.

Your plan must not merely rank models by “smartness.” It must map work to the right capability surface.

---

### Add this section after “Multi-Agent Swarm Requirement”

## Native Platform Feature Evaluation Requirement

For both OpenAI and Anthropic, evaluate whether the Foundation MVP should use native platform capabilities as part of the architecture.

At minimum, consider and comment on fit for:

### Anthropic
- Prompt caching
- Structured outputs
- Tool use
- Parallel tool use
- Batch processing
- Skills
- MCP
- Managed agents / orchestration patterns
- Context compaction or long-context controls
- Cookbook patterns relevant to multi-agent execution, verification loops, tool search, and hosted agents

### OpenAI
- Responses API tool use
- Web search
- File search / retrieval
- Tool search
- Computer use
- Skills / MCP / connectors where relevant
- Background mode
- Batch processing
- Structured outputs
- Deep research / research-oriented model paths where relevant
- Flex / latency / cost optimization features where relevant

For each feature you mention, specify whether it should be:
- used now
- deferred
- avoided
- tested in a narrow pilot

And explain why.

---

### Add this section after “Model/tool routing principle”

## Routing Matrix Requirement

Your final plan must include a routing matrix for major task classes.

For each task class, define:
- Task class
- Required modality
- Required reliability level
- Speed sensitivity
- Cost sensitivity
- Native/specialized feature option
- Cheapest sufficient default
- Premium escalation path
- Best worker/agent owner
- QA gate
- Failure fallback

Minimum task classes to cover:
- Strategy / architecture
- Research
- Lead discovery
- Lead classification
- Presence scanning
- Proof generation
- Outreach drafting
- Deliverability/compliance review
- Form parsing / structured intake
- Payment / onboarding routing
- Analytics / reporting
- Repo / docs writing
- Quality review
- Cost auditing

---

### Strengthen the final output requirement

Under section 20, “Model/Tool Routing and Cost-Control Strategy,” require these subsections:
- Native provider capability map
- Cheapest-sufficient routing matrix
- Prompt caching opportunities
- Batch/background opportunities
- Specialized worker recommendations
- Premium escalation rules
- Cost observability requirements
- Experiments to validate routing assumptions

## Short verdict on current vendor opportunities

### Anthropic
Real opportunities already visible from the checked docs/cookbooks:
- prompt caching for repeated long-prefix planning/orchestration prompts
- async multi-agent orchestration patterns
- managed-agent coordination patterns
- programmatic tool calling for lower latency/token use
- automatic context compaction
- self-verifying outcome loops

### OpenAI
Real opportunities already visible from the checked docs surface:
- explicit tool landscape is broad and operational, not just theoretical
- web search, tool search, file search, computer use, background mode, batch, structured outputs, and deep research are all routing variables
- this means some tasks should be designed around productized API features instead of custom generic agent loops

## Immediate recommendation

Use the current Mythos prompt as the base, but strengthen it with the sections above before using it for the final planning run.

## Suggested next files

- docs/famtastic-designs/mythos-master-prompt-v2.md
- docs/famtastic-designs/model-routing-notes.md
- docs/famtastic-designs/vendor-capability-matrix.md
- docs/famtastic-designs/native-feature-experiments.md

## Operational note

The local repo working tree is heavily dirty, so remote-origin inspection was used to read the canonical Mythos source files safely without disturbing active local changes.
