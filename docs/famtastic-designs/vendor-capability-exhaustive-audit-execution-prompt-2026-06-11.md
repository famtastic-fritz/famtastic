# Vendor Capability Exhaustive Audit Execution Prompt

_Last updated: 2026-06-11_

This is the tightened execution prompt for a truly exhaustive vendor capability research pass. It expands beyond link summaries and requires official-doc discovery, capability implications, practice translation, cross-platform use, learning/display strategy, and verification artifacts.

Use alongside:

- `docs/famtastic-designs/vendor-capability-full-audit-prompt-2026-06-11.md`
- `docs/famtastic-designs/vendor-capability-full-audit-addendum-openai-gpt-oss-gpts-2026-06-11.md`

---

## Prompt

You have access to the GitHub repo:

`famtastic-fritz/famtastic`

Your job is to run a **full exhaustive vendor capability audit** across OpenAI, Anthropic, Google/Gemini, and AWS Bedrock.

Do not only read links Fritz previously pasted.

Do not only summarize pages.

Do not only compare models.

You must build a capability intelligence package that answers:

1. What exists on each platform?
2. What does each feature actually unlock?
3. What task classes should use it?
4. What should Shay use it for?
5. What should FAMtastic Designs use it for?
6. What should be tested first?
7. What becomes a repeatable practice?
8. What becomes a workflow, skill, article, product, or service?
9. What should be displayed in dashboards, docs, or visual workflows?
10. What should be avoided because it is expensive, brittle, duplicated, or not needed yet?

---

## Required Source Strategy

For each vendor, start from official docs and discover the broader docs tree.

Official-doc priority:

1. Product documentation.
2. API reference.
3. SDK docs.
4. CLI docs.
5. Model docs / model cards.
6. Pricing docs.
7. Quota/rate-limit docs.
8. Security/privacy/auth docs.
9. Cookbook/tutorial docs.
10. Release notes/changelog.

Secondary sources may be used only to explain context, not as authority.

For every feature, mark source quality:

```text
SOURCE_OFFICIAL_DOC
SOURCE_OFFICIAL_BLOG
SOURCE_RELEASE_NOTE
SOURCE_THIRD_PARTY_CONTEXT
SOURCE_UNVERIFIED
```

If something is based only on a pasted link or prior conversation, mark it:

```text
SEED_ONLY_NOT_VERIFIED
```

---

## Exhaustiveness Requirement

For each vendor, create a capability inventory with categories:

- models
- model access methods
- agent runtimes
- SDKs
- CLI tools
- hosted tools
- tool/function calling
- MCP/connectors/actions/apps/plugins
- skills/custom workflows/custom GPTs
- open-weight/local/offline options
- background/async execution
- batch processing
- flex/priority/latency tiers
- prompt caching
- context compaction/context editing
- session/state management
- memory systems
- retrieval/RAG/file search/vector search
- web search/browsing tools
- code execution/sandbox/computer use
- evals/graders/datasets/synthetic data/simulation
- tracing/observability/logging/monitoring
- prompt management/versioning
- workflow orchestration
- deployment surfaces
- authentication/secrets/governance
- billing/credits/free tiers/rate limits
- enterprise/governed variants
- region/provider variants
- known limitations/caveats
- where official docs are missing or ambiguous

For each category, include:

```text
Feature name
Official source URL
What it does
What capability it unlocks
Best Shay use
Best FAMtastic Designs use
Best FAMtastic Thoughts/article use
Best client-service monetization use
Best cross-platform pairing
When not to use
Cost/latency/risk caveat
Account verification needed
Experiment needed
Routing recommendation: USE_NOW / PILOT / DEFER / AVOID
```

---

## Capability Meaning Layer

Do not stop at “Feature X exists.”

For every major capability, add a “What this means” section:

```text
Capability:
What it unlocks:
Why it matters:
Where it fits in Shay:
Where it fits in FAMtastic Designs:
Where it fits in FAMtastic client services:
What new workflow becomes possible:
What new business offer becomes possible:
What dashboard/visual/workflow should display it:
What skill or repeatable practice should be created:
```

Example style:

```text
Capability: Prompt caching
What it unlocks: reusable long scaffolds at lower cost
Why it matters: Shay repeats doctrine, tool definitions, routing policies, and brand packets
Practice: stable prefix design, volatile input placed late, cache hit reporting
Dashboard: cache hit ratio per worker, cache write/read cost, failed-cache reasons
Skill: prompt-cacheable-worker-design
```

---

## Cross-Platform Architecture Layer

For every major task class, recommend the best cross-platform stack.

Required task classes:

- strategy and architecture
- coding/repo edits
- long-running orchestration
- research
- lead discovery
- lead classification
- presence scanning
- proof generation
- proof QA
- outreach writing
- compliance checking
- structured transforms
- document ingestion
- retrieval/RAG
- memory/session management
- eval/regression testing
- app prototyping
- custom GPT/app products
- image generation
- video generation
- voice/audio
- analytics/reporting
- cost auditing
- workflow automation

For each task class, include:

```text
Task class
Best default provider/surface
Cheapest acceptable provider/surface
Premium escalation provider/surface
Batch/background option
Caching option
Retrieval/memory option
Eval/QA option
Dashboard display
Learning loop
Skill to create
Avoid list
```

---

## Practice Translation Layer

Create a section called:

`How These Capabilities Become Practice`

Include:

1. **Routing policy** — how Shay decides where a task goes.
2. **Worker design rules** — how workers are built to exploit platform features.
3. **Cost practice** — how caching, batch, flex, and cheap models become default.
4. **Memory practice** — sovereign memory vs provider memory vs retrieval context.
5. **Research practice** — how to avoid weak research runs and compare sources.
6. **Evaluation practice** — how to test worker outputs over time.
7. **Visualization practice** — how to show the flow, status, cost, and quality.
8. **Skill practice** — how successful patterns become reusable skills.
9. **Product practice** — how capabilities become GPTs, apps, templates, services, or articles.
10. **Review practice** — when Fritz/Shay must review vs when the system can self-check.

---

## Display / Observability Layer

Create a section called:

`What We Need To Display`

This should define dashboard widgets and visual workflow views, including:

- provider capability map
- active routing decision per task
- cost per task/provider/model
- cache hit rate
- batch/background queue state
- eval pass/fail trends
- research source coverage
- tool-call success/failure
- context/memory usage
- human review queue
- experiments status
- account verification gaps
- feature availability by account
- monetization opportunities by capability
- skills created from findings

---

## Learning Loop Layer

Create a section called:

`How We Learn From This`

For every experiment, define:

```text
Experiment
Question being answered
Inputs
Baseline
Provider/tool tested
Quality metric
Cost metric
Latency metric
Human review requirement
Pass/fail rule
What changes if it passes
What changes if it fails
What skill gets created
What dashboard metric gets added
```

---

## Required Files To Create

Create or update these files:

1. `docs/famtastic-designs/vendor-capability-full-audit.md`
2. `docs/famtastic-designs/vendor-capability-verification-tasks.md`
3. `docs/famtastic-designs/vendor-capability-routing-policy.md`
4. `docs/famtastic-designs/vendor-capability-experiments.md`
5. `docs/famtastic-designs/vendor-capability-dashboard-spec.md`
6. `docs/famtastic-designs/vendor-capability-practice-guide.md`

If a file already exists, update it carefully and preserve useful existing content.

---

## Required Final Report

After creating the files, report:

- files created/updated
- official docs coverage achieved
- features still uncertain
- account checks needed
- top 10 highest-leverage platform features
- top 10 cross-platform routing rules
- top 10 experiments to run
- top 10 FAMtastic monetization opportunities
- top 10 dashboard/visualization requirements
- top 10 skills/practices to create

---

## Do Not

- Do not call the work exhaustive if it only used pasted links.
- Do not assume Fritz has account access just because docs show a feature.
- Do not ask for secrets.
- Do not let premium models become the default answer.
- Do not confuse provider memory with sovereign Shay memory.
- Do not treat Google AI Studio and Google Cloud Agent Platform as the same lane.
- Do not treat Bedrock and Claude Platform on AWS as the same decision.
- Do not treat custom GPTs as direct revenue until monetization is verified.
- Do not treat gpt-oss/local models as production-ready until quality-gated.

---

## Commit Requirement

Save all files and commit/push to `origin/main`.

Use a commit message like:

`docs: add exhaustive vendor capability audit package`
