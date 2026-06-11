# Vendor Capability Research Intake — 2026-06-11

Purpose: capture the immediate platform-discovery thread sparked by Fritz's OpenAI and Anthropic platform exploration so it can be ingested into the broader FAMtastic knowledge base without losing momentum in the current FAMtastic Designs / Mythos lane.

## Why this matters

FAMtastic's current orchestration/routing thinking is too model-tier-centric.

It needs to become capability-aware and native-feature-aware.

This research thread surfaced that both OpenAI and Anthropic now expose substantial platform-native features that can reduce cost, reduce latency, improve structure, and support specialized worker design.

This is not just “more docs.” It is routing architecture material.

## Source links checked in this session

### OpenAI
- https://developers.openai.com/api/docs
- https://developers.openai.com/api/docs/models
- https://developers.openai.com/api/docs/models/all
- https://developers.openai.com/api/docs/guides/tools
- https://developers.openai.com/api/docs/guides/tools-web-search
- https://developers.openai.com/api/docs/guides/tools-tool-search
- https://developers.openai.com/api/docs/guides/tools-computer-use
- https://developers.openai.com/api/docs/guides/background
- https://developers.openai.com/api/docs/guides/deep-research
- https://developers.openai.com/api/docs/guides/flex-processing

### Anthropic
- https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
- https://platform.claude.com/cookbooks
- https://docs.anthropic.com

## Key findings from surface review

### OpenAI
The docs surface indicates operational platform capabilities around:
- models and providers
- Responses API tool use
- web search
- file search / retrieval
- tool search
- computer use
- background mode
- batch processing
- structured output paths
- deep research
- compaction
- agents SDK / agent builder / evals / graders
- flex processing / latency / cost optimization

Implication:
Some workflows that might otherwise be designed as custom generic agent loops should instead be designed around native OpenAI capability surfaces.

### Anthropic
The docs and cookbook surface indicates operational platform capabilities around:
- prompt caching
- structured outputs
- tool use
- parallel tool use
- batch processing
- skills
- MCP
- managed agents
- context compaction
- programmatic tool calling
- tool search with embeddings
- async multi-agent orchestration
- self-verifying outcomes loops
- hosted agent patterns

Implication:
Anthropic should not be treated as “just another smart model endpoint.” There are native orchestration and cost-saving patterns worth evaluating directly.

## Immediate architectural implication for Shay / FAMtastic

Routing should no longer be based only on:
- cheap
- medium
- premium

Routing should instead evaluate:
- task class
- modality
- reliability need
- speed sensitivity
- cost sensitivity
- provider-native fit
- structured-output fit
- tool-native fit
- background/batch/caching fit
- specialized worker suitability
- escalation path

## Immediate docs created in this lane

- `docs/famtastic-designs/mythos-upgrade-packet-2026-06-11.md`
- `docs/famtastic-designs/mythos-master-prompt-v2.md`

## Recommended next artifacts

1. `docs/famtastic-designs/vendor-capability-matrix.md`
   - compare OpenAI vs Anthropic vs other providers by task/capability

2. `docs/famtastic-designs/native-feature-experiments.md`
   - define narrow tests for prompt caching, background mode, tool search, structured outputs, etc.

3. Knowledge-base ingestion note in the Shay/obsidian system
   - summarize the routing implications for future orchestration design

## Recommended work split

Current lane:
- keep moving on FAMtastic Designs / Mythos prompt and planning

Separate Shay lane:
- mine vendor docs deeply
- build capability matrix
- map localized workers
- recommend routing updates for Shay and future swarms
- identify quick wins from features already being paid for

## Suggested follow-up prompt for a separate Shay session

“Mine the OpenAI and Anthropic platform docs for orchestration-relevant capabilities. Build a capability matrix focused on cost, latency, native tools, structured outputs, batch/background patterns, prompt caching, research modes, and specialized worker opportunities. Then recommend how Shay should update its model-routing and localized-worker strategy.”
