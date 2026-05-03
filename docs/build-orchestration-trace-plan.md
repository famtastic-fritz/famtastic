# Site Studio Build Orchestration, Token Strategy, and Trace Plan

Date: 2026-05-03

This document is a handoff plan for coworking sessions. It is intentionally written as product and architecture guidance, not as an implementation patch. The goal is to help another session continue the work without needing prior chat context.

## Core Thesis

Site Studio should not treat a build as only "generate pages from a prompt."

The build should be a traceable fulfillment system:

1. Capture what the user requested.
2. Decide what can be completed now.
3. Decide what needs planning, media, component work, integration, platform setup, or follow-up.
4. Generate the site using the lowest-cost path that still meets quality.
5. Verify the result.
6. Record what happened, why it happened, what it cost, what failed, and what should be learned.

The system should always be able to complete a minimum viable site, but it should not silently flatten unusual requests into cookie-cutter output. If the user asks for something like a virtual assistant, an animation set, a slideshow, a booking system, or another specialized capability, the build process should recognize that request as a feature with a fulfillment status.

## Platform Principle

Use this separation everywhere:

```text
If it affects more than one site, it belongs to Platform.
If it affects one site, it belongs to that Site.
If it affects the selected page, section, component, asset, or deployment state, it belongs in the Inspector.
If it is a temporary process, log, error, build message, audit output, or deployment feedback, it belongs in the System Console.
If it is planning, generation, critique, comparison, refactor suggestions, fixes, or summaries, it belongs in the AI/Shay layer.
```

Examples:

| Setting or action | Correct scope |
|---|---|
| Studio email, API keys, provider registry, global model choice | Platform |
| PayPal for Joe's Pizza | Joe's Pizza site |
| Alt text for one hero image | Inspector for selected asset/slot |
| Build logs, verification output, worker failures | System Console |
| Design critique, build plan, prompt improvement, follow-up suggestions | Shay / AI layer |

## Current Build Flow

Current code is mostly centralized in `site-studio/server.js`.

Important entry points:

| Area | Current location |
|---|---|
| Intent classification | `site-studio/server.js` `classifyRequest()` |
| Routing | `site-studio/server.js` `routeToHandler()` |
| Planning brief | `site-studio/server.js` `handlePlanning()` |
| Prompt context | `site-studio/server.js` `buildPromptContext()` |
| Main chat/build handler | `site-studio/server.js` `handleChatMessage()` |
| Multi-page build | `site-studio/server.js` `parallelBuild()` |
| Post-processing | `site-studio/server.js` `runPostProcessing()` |
| Verification | `site-studio/server.js` `runBuildVerification()` |
| Conversation log | `site-studio/server.js` `appendConvo()` |
| SDK/subscription calls | `site-studio/server.js` `callSDK()` and `spawnClaude()` usage |
| API telemetry | `site-studio/lib/api-telemetry.js` |
| SQLite builds/jobs | `site-studio/lib/db.js` |
| Media intelligence loop | `site-studio/lib/media-telemetry.js` |
| Worker/job tools | `site-studio/lib/tool-handlers.js` |
| Event bus | `site-studio/lib/studio-events.js` |

Current high-level flow:

```text
user request
-> classifyRequest()
-> routeToHandler()
-> optional planning brief
-> handleChatMessage()
-> deterministic fast path if possible
-> buildPromptContext()
-> parallelBuild() for multi-page builds
-> template-first generation
-> page generation
-> write files
-> runPostProcessing()
-> optional media auto-fill
-> runBuildVerification()
-> log telemetry/conversation/build metrics
-> send UI updates
```

## What Is Already Good

The repo already has useful foundations:

| Existing strength | Why it matters |
|---|---|
| Conversational acknowledgements can avoid API calls | Zero-token path |
| Deterministic handlers can apply simple edits | Avoids model calls for obvious work |
| Build context often uses page lists instead of full HTML | Reduces large prompt payloads |
| Restyle path summarizes large HTML | Prevents some runaway prompt cost |
| Assistant HTML is truncated in conversation history | Reduces repeated context bloat |
| Template-first build strategy exists | Improves consistency and reduces rework |
| Verification is mostly file-based | Quality checks without model tokens |
| SDK telemetry logs token and cost data | Starting point for cost intelligence |
| Media telemetry is richer than build telemetry | Good pattern for build trace/intelligence |
| Job tools and gap tools exist | Useful primitives for the future queue |

## Current Gaps

The main issue is not only token usage. The bigger issue is that the system makes decisions without durable decision records.

| Gap | Current problem |
|---|---|
| Status is not traceability | "Building page X" does not explain why a path was chosen |
| API vs subscription routing is too environment-driven | Path depends mostly on key availability, not task/cost/quality policy |
| Subscription work lacks real token/cost comparison | CLI/subscription path needs estimated token accounting |
| Some edit paths still send too much HTML | Structural index exists but is not fully used everywhere |
| Context is broad, not relevance-scored | Brain, research, assets, rules, session, and conversation context are included too generally |
| Page builds repeat large context | Shared context is resent to each page worker |
| Agent performance is not first-class | No durable scorecard by agent/tool/task type |
| Placeholder/follow-up handling is too informal | Specialized requests should create structured jobs/gaps |
| Research and learning are not always connected to build decisions | Learning should feed future prompts and routing |

## Desired Build Model

Rewrite the mental model as:

```text
intake
-> classify intent
-> design planning
-> capability decomposition
-> fulfillment planning
-> execution routing
-> artifact generation
-> post-processing
-> verification
-> gap capture
-> follow-up jobs
-> learning loop
```

Each requested capability should become a fulfillment item.

Example:

```text
Original request:
"Add a virtual assistant in the form of..."

Detected capability:
virtual assistant character + future interactive component

Fulfillment decision:
- Complete base site now.
- Create low-cost relevant placeholder graphic now.
- Add Media Studio job for character asset.
- Add Component Studio job for assistant component.
- Add Think Tank/Shay job for behavior and conversation design.
- Link all follow-up jobs to the original build request.
```

The build result should include:

1. Site files.
2. Fulfillment ledger.
3. Trace map.
4. Verification report.
5. Follow-up jobs.
6. Gap records.
7. Learning records.

## Token and Cost Strategy

API calls should be reserved for work where judgment or orchestration quality matters.

Bulk work should prefer subscription/free/comparable paths when the quality is comparable.

Recommended routing policy:

| Work type | Preferred path |
|---|---|
| Obvious classification | Deterministic rules |
| Ambiguous classification | Cheap model |
| Design planning | Best planning API model |
| Capability decomposition | API planning model or strongest available planner |
| Bulk page generation | Subscription worker if comparable |
| Simple content edits | Deterministic structural editor |
| Section-level edits | Send only selected section/field/slot context |
| Verification | Zero-token file checks first |
| Visual critique | Model only after screenshot/evidence exists |
| Media prompt improvement | Intelligence loop + provider telemetry |
| Follow-up job creation | Deterministic from fulfillment ledger |
| Final summaries | Cheap model or deterministic template |

Suggested routing decision:

```text
Can this be done deterministically?
If yes, do that.

Does this require planning or judgment?
If yes, use API planning model.

Is this bulk generation?
If yes, use subscription/free worker when quality is comparable.

Did output fail verification?
If yes, escalate, retry, or create a gap/job.
```

Token improvements to prioritize:

1. Wire structural-index context into all content/layout/bug edit paths.
2. Replace full-page HTML context with selected page/section/component/field context whenever possible.
3. Relevance-score brain, research, asset, session, and conversation context before injecting.
4. Give each prompt template a version and hash.
5. Estimate tokens for subscription/CLI prompts and outputs so those paths can be compared to API paths.
6. Avoid resending identical context to every page worker when a shared build run context can be referenced or summarized.
7. Store prompt-output-result pairs for the learning loop, not only raw cost.

## Trace Map Requirement

Live status updates are useful, but they are not enough.

The system needs persistent trace records that answer:

1. What did the orchestrator decide?
2. What alternatives were considered?
3. Why was this path chosen?
4. Which agent/tool/provider did the work?
5. Was the work API-billed, subscription/free, or zero-token?
6. How long did it take?
7. What did it cost?
8. Did it pass verification?
9. Did the user accept or reject it?
10. What should future runs learn?

Proposed event shape:

```json
{
  "trace_id": "run_123.step_07",
  "parent_trace_id": "run_123",
  "run_id": "run_123",
  "site_tag": "joes-pizza",
  "phase": "capability_decomposition",
  "step_id": "detect_virtual_assistant",
  "decision_type": "fulfillment_path",
  "requested_item": "virtual assistant character",
  "selected_path": "placeholder_now_create_jobs",
  "alternatives_considered": [
    "full_component_now",
    "ignore",
    "text_only_placeholder"
  ],
  "reason": "Specialized component and media asset are needed. Complete minimum site now and queue deeper work.",
  "agent": "orchestrator",
  "tool": "planner",
  "provider": "anthropic",
  "model": "planning-model-name",
  "cost_type": "api_billed",
  "prompt_hash": "abc123",
  "prompt_template_version": "build-plan-v4",
  "input_tokens_estimated": 1200,
  "output_tokens_estimated": 450,
  "input_tokens_actual": 1187,
  "output_tokens_actual": 431,
  "duration_ms": 8400,
  "status": "completed",
  "quality_score": null,
  "verification_refs": [],
  "created_jobs": [
    "job_media_1",
    "job_component_2"
  ],
  "gaps": [
    "specialized_asset_needed"
  ]
}
```

Storage options:

| Storage | Use |
|---|---|
| `sites/<site-tag>/build-trace.jsonl` | Simple per-site trace log |
| SQLite `runs` table | Build/session-level metadata |
| SQLite `trace_events` table | Queryable decision/event graph |
| SQLite `agent_performance` table | Long-term tool/model/agent scorecards |
| Existing `sdk-calls.jsonl` | Raw API call cost data |
| Existing `media-telemetry.jsonl` | Media provider intelligence |

## Fulfillment Ledger

Every build should create or update a fulfillment ledger.

Purpose:

1. Preserve what the user actually requested.
2. Track what was completed.
3. Track what was substituted or approximated.
4. Track what was deferred.
5. Link deferred work to jobs, gaps, and workspaces.

Example:

```json
{
  "request_id": "req_001",
  "source": "initial_build_prompt",
  "requested_capability": "virtual assistant character",
  "detected_type": "specialized_component_with_media_asset",
  "status": "placeholder_now_followup_required",
  "completed_now": [
    "base site section",
    "placeholder assistant image"
  ],
  "deferred": [
    "assistant component",
    "character asset set",
    "behavior design"
  ],
  "jobs": [
    {
      "workspace": "Media Studio",
      "job_type": "create_character_asset"
    },
    {
      "workspace": "Component Studio",
      "job_type": "build_assistant_component"
    },
    {
      "workspace": "Think Tank",
      "job_type": "define_assistant_behavior"
    }
  ],
  "reason": "The initial build can represent the concept, but full implementation requires specialized asset and component work."
}
```

## Gap Capture

The missing piece in the current learning loop is gap capture at the moment the gap appears.

The base rule should be:

```text
Research, data, anticipation, pattern recognition, and gap capture.
```

Gap types:

| Gap type | Example |
|---|---|
| `unfulfilled_request` | User asked for something that was not completed |
| `placeholder_used` | Temporary asset or section used |
| `specialized_asset_needed` | Character, animation, render, audio, video |
| `component_needed` | Slideshow, assistant, booking flow, calculator |
| `integration_needed` | PayPal, CRM, email, calendar, analytics |
| `design_uncertainty` | Prompt lacks brand/style direction |
| `provider_failure` | Image/API/deploy provider failed |
| `verification_failure` | Nav/footer/SEO/accessibility failed |
| `agent_weakness` | Agent repeatedly fails a task type |
| `prompt_pattern` | Prompt pattern improved or degraded output |
| `missing_capability` | Studio lacks a needed workflow/tool |

Each gap should route to a workspace:

| Destination | Use |
|---|---|
| Think Tank | Strategy, design direction, unclear ideas |
| Shay | Decisions, prioritization, client-facing explanation |
| Media Studio | Image, video, audio, character, brand assets |
| Component Studio | Reusable UI/functionality |
| Site Editor | Page-specific content/design fixes |
| Platform | Provider setup, API keys, global capability, shared system issue |
| Job Queue | Deferred work with owner/status/evidence |

## Agent and Tool Performance Loop

Every agent, model, provider, and tool should earn a scorecard by task type.

Track:

| Metric | Purpose |
|---|---|
| Task type | Know what kind of work was performed |
| Pass/fail rate | Basic quality proof |
| Retry rate | Hidden cost signal |
| Verification issues | Objective failure data |
| Human accept/reject | Real usefulness |
| Cost | Routing optimization |
| Duration | Speed optimization |
| Common weakness | Pattern recognition |
| Best use case | Future routing |

Example future routing intelligence:

```text
Agent A is strong at first-draft copy but weak at nav consistency.
Agent B is better at CSS coherence.
Subscription worker is good for bulk pages but weak at interactive components.
API planner is worth the cost for design decomposition.
Image provider X is cheapest but fails brand consistency more often.
```

## Workspace Visibility

The UI should expose a Trace Map, not only status.

Recommended views:

| View | Shows |
|---|---|
| Build Timeline | Human-readable phase progress |
| Decision Trace | Why the orchestrator chose each path |
| Agent Map | Which agent/tool/provider handled each branch |
| Cost Map | API billed vs subscription/free vs zero-token work |
| Fulfillment Ledger | Requested features and completion status |
| Gap Queue | What was deferred, failed, or needs follow-up |
| Verification Evidence | Checks, failures, scores, and linked artifacts |
| Learning Notes | Prompt, provider, or agent patterns learned |

This should sit mostly in the System Console / Build Inspector, with summaries promoted to Shay and Mission Control.

## Practical Implementation Order

Do not start by redesigning the whole UI.

Recommended order:

1. Add trace ID / run ID to the build process.
2. Add a small `build-trace.jsonl` writer.
3. Log major decisions from classification, routing, planning, build path, provider choice, fallback, post-processing, verification, and job creation.
4. Add estimated token accounting for subscription/CLI paths.
5. Add a fulfillment ledger generated before page build.
6. Convert unresolved capabilities into gap records and jobs.
7. Add agent/tool/provider scorecards from trace results.
8. Only then build richer UI views for trace map, fulfillment ledger, and cost map.

## Definition of Done for This Initiative

A build is considered properly orchestrated when Site Studio can answer:

1. What did the user ask for?
2. What did we complete now?
3. What did we intentionally approximate?
4. What did we defer?
5. Why did we choose each path?
6. Which agent/tool/provider did each part?
7. What was API-billed, subscription/free, or zero-token?
8. What failed verification?
9. What follow-up jobs were created?
10. What did the system learn that should improve the next run?

Final rule:

```text
Every build decision creates trace data.
Every requested capability gets a fulfillment status.
Every unfinished thing becomes a gap or job.
Every agent/tool/provider earns performance history.
Every future route learns from prior results.
```
