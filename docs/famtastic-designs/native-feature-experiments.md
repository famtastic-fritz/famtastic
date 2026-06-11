# Native Feature Experiments

Date: 2026-06-11
Purpose: concrete narrow experiments to validate underused native platform features before redesigning Shay routing around them.

## Experiment format

Each experiment includes:
- Question
- Why it matters
- Minimal setup
- Success criteria
- Failure criteria
- What changes if it works

## 1. Anthropic prompt caching on stable orchestration prefixes

Question:
- How much token/cost reduction do we get by caching stable orchestration prefixes: system prompt, tool definitions, routing rubric, and reusable brand packet?

Why it matters:
- Shay and related workers frequently resend stable scaffolding.

Minimal setup:
- Pick 3 recurring prompt families:
  1. vendor-docs research worker
  2. routing-recommendation worker
  3. client-education writer
- Isolate volatile input to the final user block.
- Place cache breakpoint at last shared stable block.

Success criteria:
- Meaningful cache read hit rate on follow-up turns
- net cost drop without quality regression
- no operational pain managing cache breakpoints

Failure criteria:
- volatile prefixes kill reuse
- cache write costs erase benefits
- worker structure too dynamic to be worth it

If it works:
- Build a prompt-cache planner module and tag workers as cacheable/non-cacheable.

## 2. Anthropic programmatic tool calling for doc-mining workers

Question:
- Does programmatic tool calling materially reduce latency and context bloat on multi-source research jobs?

Why it matters:
- Shay research lanes often loop through many tools and then drown the model in raw outputs.

Minimal setup:
- Re-run a vendor-docs research task with 10–20 document lookups.
- Compare:
  A. serial tool calls with results re-injected
  B. programmatic tool calling/code execution path that filters inside the execution environment

Success criteria:
- lower token usage
- lower latency
- cleaner final evidence packet

Failure criteria:
- setup overhead too high
- filtering logic becomes brittle
- little real savings in practice

If it works:
- Create a “tool-heavy research worker” localized to Anthropic.

## 3. Anthropic managed agents for long-running coding/research sessions

Question:
- Do managed sessions/events/webhooks reduce Shay’s infrastructure burden for long-running jobs enough to justify use?

Minimal setup:
- One long research or code-analysis task with tool access and session streaming.
- Log setup time, event visibility, resumability, and cleanup ergonomics.

Success criteria:
- less bespoke infrastructure than local loop
- clean event stream and pause/resume story
- reasonable observability

Failure criteria:
- too much beta friction
- difficult to map back into Shay’s own orchestration ledger

If it works:
- use for bounded long-lived specialist lanes, not the main sovereign brain.

## 4. OpenAI hosted web search + file search research scout

Question:
- Does OpenAI hosted search/retrieval beat current fetch-and-reinject loops for structured research scouts?

Minimal setup:
- Run same research prompt in two ways:
  A. local fetch + synth
  B. hosted search/file search inside agent workflow

Success criteria:
- cleaner evidence packets
- lower glue-code burden
- faster prototype time

Failure criteria:
- source control/citation fidelity insufficient
- hidden behavior makes audit harder

If it works:
- add an OpenAI scout-worker lane for product research and documentation mining.

## 5. OpenAI background mode for non-blocking long tasks

Question:
- Is background mode a better fit than keeping the user attached to a long synchronous run?

Minimal setup:
- Use 3 task types:
  1. large document synthesis
  2. eval suite run
  3. research packet generation

Success criteria:
- clean job lifecycle
- easy polling or callback behavior
- lower operator friction than current long foreground runs

Failure criteria:
- no real savings over local async process management
- difficult result retrieval semantics

If it works:
- route non-urgent premium runs to background mode by default.

## 6. OpenAI flex processing for “cheap if slow is fine” workloads

Question:
- What task families tolerate flex/low-priority processing without hurting workflow quality?

Minimal setup:
- Test on:
  1. tagging and classification
  2. schema extraction
  3. title/summary generation
  4. large-scale draft critique

Success criteria:
- meaningful cost reduction
- acceptable turnaround
- no quality cliff on narrow tasks

Failure criteria:
- delay too unpredictable
- output quality worse than cheaper alternative lanes already available

If it works:
- add async economics routing rule: narrow + non-urgent => flex.

## 7. OpenAI eval datasets / graders for routing and quality gates

Question:
- Can OpenAI eval surfaces become the quickest path to a real regression harness for Shay routing outputs?

Minimal setup:
- Build a small dataset of 30 routing decisions.
- Include expected route families and red-flag cases.
- Score: cheapest-sufficient chosen, premium escalation justified, observation/interpretation kept separate.

Success criteria:
- reusable harness
- grader correlation with human judgment strong enough to be useful

Failure criteria:
- rubric too vague
- graders overfit formatting instead of correctness

If it works:
- use as one leg of routing-policy QA.

## 8. Google Agent Studio prompt-to-webapp prototype lane

Question:
- How fast can FAMtastic go from idea -> prompt -> demo web app inside Agent Studio compared with hand-built mockups?

Why it matters:
- This is not toy value. It directly impacts app-building velocity and client/stakeholder demos.

Minimal setup:
- Build 3 tiny prototypes:
  1. client FAQ assistant
  2. branded concept explainer
  3. internal evaluation helper
- Deploy each as a web app from Agent Studio.

Success criteria:
- time-to-demo clearly faster than custom code path
- prompt variants are shareable and testable
- handoff to real build is understandable

Failure criteria:
- deployment too rigid
- hard to move from demo to repo-based implementation

If it works:
- create a dedicated “Agent Studio prototype worker.”

## 9. Google memory bank / sessions / observability for managed agent runtime

Question:
- Does Google’s managed runtime + memory bank + traces give a meaningfully better operations story than local orchestration for certain agent apps?

Minimal setup:
- Run a retrieval-heavy agent with sessions and memory bank.
- Inspect observability/tracing/topology outputs.

Success criteria:
- useful operational visibility
- easier debugging of agent behavior
- memory behavior understandable enough to trust

Failure criteria:
- setup complexity too high for value gained
- memory abstraction too opaque

If it works:
- use for customer-facing or internal app agents where observability matters.

## 10. Google retrieval/context APIs as a managed RAG layer

Question:
- Do retrieveContexts / askContexts / augmentPrompt beat current ad-hoc retrieval patterns for app-grounding tasks?

Minimal setup:
- Load one bounded corpus.
- Compare local retrieval stack vs managed context APIs on same queries.

Success criteria:
- better developer ergonomics
- acceptable grounding quality
- clear path to production use

Failure criteria:
- retrieval quality not strong enough
- too much cloud-specific configuration overhead

If it works:
- add a Google retrieval-backed app worker lane.

## 11. Bedrock prompt management for governed prompt assets

Question:
- Is Bedrock Prompt management useful enough as a governed prompt library for enterprise/client-facing prompt assets?

Minimal setup:
- Create one reusable prompt with variables and 2–3 variants.
- Compare variants and reuse path.

Success criteria:
- good version/variant hygiene
- useful for shared prompt assets

Failure criteria:
- too clunky versus repo-based prompt files

If it works:
- use only where prompt governance and AWS alignment matter.

## 12. Bedrock batch inference for async content/eval waves

Question:
- Is Bedrock batch inference a practical low-touch path for large async waves despite lack of tool calling and structured output in the surfaced docs?

Minimal setup:
- Batch a pure text task that does not require multi-turn/tool semantics.

Success criteria:
- easy S3-driven workflow
- good for high-volume offline jobs

Failure criteria:
- missing tool/structured-output support limits usefulness too much

If it works:
- reserve for offline text-only waves in AWS-aligned environments.

## 13. Claude Platform on AWS vs Bedrock for Anthropic-heavy lanes

Question:
- For Anthropic-centric workloads, is Claude Platform on AWS the better fit than Bedrock?

Minimal setup:
- Compare one identical workflow across:
  A. direct Anthropic
  B. Claude Platform on AWS
  C. Bedrock
- Evaluate feature parity, setup, latency, governance, and billing/admin value.

Success criteria:
- clear decision framework emerges

Failure criteria:
- differences negligible for actual FAMtastic needs

If it works:
- codify AWS decision rule instead of treating “AWS” as one thing.

## 14. Cross-provider cost-routing bakeoff

Question:
- Which task families are overpaying today?

Minimal setup:
- Select 5 tasks:
  1. narrow extraction
  2. vendor research synthesis
  3. architecture recommendation
  4. FAQ assistant prototype
  5. large eval wave
- Run through cheapest viable candidate lane and premium control lane.

Success criteria:
- identify price/quality cliffs and routing rules

Failure criteria:
- not enough difference to justify complexity

If it works:
- harden Shay’s routing policy with evidence instead of vibe.

## 15. Playground/studio-assisted prompt iteration workflow

Question:
- Which surface produces the fastest “good enough” prompt iteration loop for FAMtastic app/content experiments?

Candidates:
- Anthropic Workbench
- OpenAI prompt/eval surface
- Google Agent Studio / AI Studio
- Bedrock Prompt management

Success criteria:
- fastest time to useful prompt
- easiest compare/share loop
- strongest path from experiment to production artifact

If it works:
- standardize the surface by task type instead of one global favorite.

## First test order

1. Anthropic prompt caching
2. Anthropic programmatic tool calling
3. OpenAI background mode + flex processing
4. Google Agent Studio prompt-to-webapp prototype lane
5. Google retrieval/context APIs
6. Cross-provider cost-routing bakeoff
7. Claude Platform on AWS vs Bedrock comparison

## Why this order

Interpretation:
- The first two directly improve Shay’s orchestration brain.
- The next two attack cost and non-blocking execution.
- The next two attack app-building velocity.
- The last two clarify enterprise/cloud offload strategy.

## Success condition for the whole experiment set

If these experiments work, Shay changes from “clever local router” to “federated orchestration boss” with specific native cloud organs:
- Anthropic for long-run orchestration mechanics
- OpenAI for code-first hosted-tool and eval flows
- Google for studio-driven app prototypes and managed retrieval/runtime
- AWS for governed enterprise async lanes