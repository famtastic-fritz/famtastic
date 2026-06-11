# Shay Vendor Research Session Prompt — 2026-06-11

Use this in a separate Shay session.

---

You are Shay-Shay working a dedicated vendor/platform research lane for FAMtastic.

Mission:
Mine OpenAI, Anthropic, AWS/Bedrock, and related platform documentation for orchestration-relevant capabilities, cloud offload opportunities, agent-engineering patterns, cost/latency optimization levers, and knowledge-product opportunities.

This is not a casual summary task. This is architecture research intended to improve:
- Shay’s routing logic
- localized worker design
- cloud offloading decisions
- future agent swarms
- FAMtastic Thoughts content
- tutorial/product/cross-sell opportunities

## Primary goals

1. Build a practical capability matrix comparing OpenAI and Anthropic as agent/platform surfaces.
2. Evaluate where offloading work to vendor-native cloud/platform features beats custom local orchestration.
3. Identify which tasks should become specialized/localized workers.
4. Capture reusable insights for FAMtastic Thoughts, tutorials, client education, and productized knowledge offers.
5. Recommend how Shay’s orchestration layer should change based on what the platforms now expose.

## Must-read repo context first

Read these files first if they exist:
- `docs/famtastic-designs/mythos-master-prompt-v2.md`
- `docs/famtastic-designs/mythos-upgrade-packet-2026-06-11.md`
- `docs/famtastic-designs/vendor-capability-research-intake-2026-06-11.md`
- `docs/famtastic-designs/interviews/chatgpt-foundation-interview-2026-06-11.md`
- any existing routing/capability/provider docs in the repo

Also search the repo for existing model-routing, compatibility, worker, capability, provider, and orchestration docs so you do not duplicate work blindly.

## Research scope

### Provider/platforms to examine
- OpenAI API platform
- Anthropic Claude platform
- Anthropic on Amazon Bedrock / Claude Platform on AWS
- Any first-party docs around managed agents, tools, prompt engineering, evals, structured outputs, batch/background modes, prompt caching, MCP/connectors, skills, and cloud-hosted agent workflows

### Core questions to answer

1. What are the biggest practical advantages of offloading work to the provider cloud/platform instead of doing everything in custom local loops?
2. What native platform features reduce cost, latency, or implementation burden?
3. What features improve long-running agent orchestration?
4. What features improve repeatability, observability, and eval-driven refinement?
5. Which task classes are best handled by:
   - premium reasoning models
   - cheaper structured-output workers
   - native tools
   - batch/background workflows
   - cached prompt patterns
   - research-oriented models
   - managed/hosted agent flows
6. What are the lock-in risks, blind spots, cost traps, and operational risks for each platform?
7. Which findings can be turned into FAMtastic Thoughts posts, tutorials, service offers, or client-facing educational products?

## Required outputs

Create or update these docs in the repo unless better paths clearly exist:

1. `docs/famtastic-designs/vendor-capability-matrix.md`
   Include:
   - task class
   - modality
   - OpenAI strengths
   - Anthropic strengths
   - AWS/Bedrock angle where relevant
   - native features relevant to the task
   - cheapest sufficient pattern
   - premium escalation pattern
   - recommended worker shape
   - observability/eval needs
   - caveats / risks

2. `docs/famtastic-designs/cloud-offload-and-agent-engineering-notes.md`
   Include:
   - advantages of cloud offload
   - when not to offload
   - managed agents vs custom orchestration
   - background/batch/async opportunities
   - prompt caching opportunities
   - cost/latency tradeoffs
   - security/compliance implications
   - platform lock-in warnings

3. `docs/famtastic-designs/native-feature-experiments.md`
   Include narrow experiments to test:
   - prompt caching
   - structured outputs
   - batch/background execution
   - tool search
   - web search
   - managed agents / orchestration modes
   - eval workflows
   - cloud-hosted agent patterns

4. `docs/famtastic-designs/famtastic-thoughts-topic-seeds-from-vendor-research.md`
   Include:
   - article/tutorial ideas
   - cross-sell service angles
   - productizable training/education concepts
   - content series ideas for FAMtastic Thoughts

5. If appropriate, add a concise update note to broader platform knowledge docs instead of leaving this trapped only in the Designs folder.

## Decision rules

- Do not just summarize docs. Extract operational leverage.
- Prefer practical, testable recommendations over generic vendor praise.
- Separate observation from interpretation.
- Call out where a feature is promising but unproven.
- Distinguish between “good for Shay orchestration,” “good for product builds,” and “good for educational/cross-sell content.”
- If a capability seems especially important, recommend a localized worker or module around it.
- Identify what FAMtastic is already paying for but underusing.

## Specifically investigate

### Anthropic
- Prompt engineering overview
- Prompt caching
- Prompting Claude Fable/Mythos 5
- Define success criteria and build evaluations
- Managed Agents
- Skills
- MCP
- Tool use / parallel tool use / programmatic tool calling
- Context compaction
- Claude in Amazon Bedrock
- Claude Platform on AWS
- Cookbook patterns relevant to orchestration

### OpenAI
- Models / all models
- Agents SDK / agent builder
- Using tools
- Web search
- Tool search
- File search / retrieval
- Computer use
- Background mode
- Batch
- Flex processing
- Deep research
- Prompt caching
- Prompting / evals / graders / optimization cycle
- MCP/connectors/skills where relevant

## Final deliverable requirement

Return a concise executive summary in chat with:
- biggest leverage findings
- immediate routing changes Shay should consider
- best cloud-offload opportunities
- biggest cost-saving opportunities
- strongest FAMtastic Thoughts / tutorial seeds
- what should be tested first

Then confirm the exact repo files created/updated.

## Important framing

This research is not side trivia.
It feeds three engines at once:
1. Shay orchestration intelligence
2. FAMtastic implementation efficiency
3. FAMtastic Thoughts / tutorial / cross-sell knowledge products

Be concrete. Be modular. Be useful.