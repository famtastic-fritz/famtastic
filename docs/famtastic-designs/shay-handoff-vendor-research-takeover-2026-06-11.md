# Shay Handoff — Vendor Research Takeover and Exhaustive Audit Correction

_Date: 2026-06-11_

## Context

Fritz asked for a full platform capability discovery across OpenAI, Anthropic, Google/Gemini, AWS/Bedrock, and related surfaces. A previous Shay/local probe produced useful strategy notes and a vendor capability matrix, but Fritz noticed the probe appeared to be limited mostly to the links he pasted.

CJ/ChatGPT reviewed the vendor discovery packet and took over the research framing. The key correction is that Fritz does **not** want a summary of a few pasted links. He wants a full capability spec of what is available across the relevant platform sites, what each capability unlocks, how it maps to Shay/FAMtastic, how to combine providers, how to learn from experiments, how to display capability/routing decisions, and how it becomes practice.

This is Track 2 and should stay separate from Track 1 FAMtastic Designs build-plan review.

---

## What CJ/ChatGPT Took Over

CJ/ChatGPT did **not** complete the exhaustive vendor audit yet. Instead, CJ/ChatGPT corrected the research scope, created the proper exhaustive audit prompts, opened a Track 2 GitHub issue, and identified what the original probe missed.

Track 2 issue created:

`#15 — Track 2: Exhaustive vendor capability audit`

Required Track 2 outputs:

- `docs/famtastic-designs/vendor-capability-full-audit.md`
- `docs/famtastic-designs/vendor-capability-verification-tasks.md`
- `docs/famtastic-designs/vendor-capability-routing-policy.md`
- `docs/famtastic-designs/vendor-capability-experiments.md`
- `docs/famtastic-designs/vendor-capability-dashboard-spec.md`
- `docs/famtastic-designs/vendor-capability-practice-guide.md`

---

## What The Original Probe Did Right

The original probe correctly identified the most important high-level shift:

> Stop thinking “best model.” Start thinking “best platform surface for this task class.”

It also produced useful directional findings:

- Anthropic looks strong for orchestration, long-running sessions, caching, tool-heavy lanes, Claude Code, MCP/skills patterns.
- OpenAI looks strong for hosted tools, code-first agents, background/batch/flex economics, evals, graders, hosted search/file/tool workers, Codex/app-building surfaces.
- Google looks strong for Agent Studio / AI Studio prototyping, Google Cloud Agent Platform, managed runtime/session/memory/RAG/observability/eval infrastructure.
- AWS/Bedrock matters when governance, AWS billing/auth/IAM, prompt management, batch inference, S3/EventBridge, and enterprise evaluation are the primary constraints.
- The right long-term pattern is hybrid modularity: local sovereign orchestration dispatching into provider-native specialist modules where they reduce cost, time, or complexity.

The original probe also successfully pushed two useful draft docs:

- `docs/famtastic-designs/vendor-capability-matrix.md`
- `docs/famtastic-designs/cloud-offload-and-agent-engineering-notes.md`

These are useful inputs, but they are not the final exhaustive audit.

---

## What The Original Probe Did Wrong / Not Enough

### 1. It appears to have over-weighted the links Fritz pasted

Fritz’s concern was correct: the probe may have treated pasted links as the whole search universe instead of seed links.

Problem:

```text
Pasted links = starting points only
Official docs tree = real audit target
```

A true audit must traverse official product docs, API refs, SDK docs, CLI docs, model docs, pricing docs, rate-limit docs, security docs, cookbook/tutorial docs, and release notes.

### 2. It summarized surfaces without fully inventorying them

The previous matrix is useful, but it is not enough to know “everything on those sites.”

Missing level of detail:

- official feature names;
- source URL per feature;
- what the feature does;
- what capability it unlocks;
- best Shay use;
- best FAMtastic Designs use;
- best FAMtastic Thoughts/article/service use;
- cross-platform pairing;
- when not to use;
- cost/latency/risk caveat;
- account verification needed;
- experiment needed;
- routing recommendation.

### 3. It mixed official terms with terms that need verification

Examples flagged by CJ/ChatGPT:

- `retrieveContexts`
- `askContexts`
- `augmentPrompt`

If official docs for those exact terms cannot be found, they must be marked `UNVERIFIED_TERM` and replaced with official Google terms such as:

- Sessions
- Memory Bank
- RAG Engine
- Agent Retrieval
- Vector Search
- Agent Runtime
- Agent Platform evaluation

### 4. It did not fully cover OpenAI product surfaces Fritz specifically cares about

Fritz called out:

- `gpt-oss`
- custom GPTs
- GPT Actions
- GPT Store / publishing
- Apps SDK / ChatGPT apps
- Codex / coding workers / subagents / workflows / skills / MCP-style surfaces

These cannot be treated as normal API models only. They are product/workflow surfaces and potential FAMtastic lead-gen/product channels.

### 5. It did not fully convert findings into practice

Fritz wants to know:

- What does each capability mean?
- What workflow does it unlock?
- How does Shay use it?
- How does FAMtastic Designs use it?
- How do providers combine for best results?
- How do we test it?
- How do we display it?
- How does it become a repeatable practice?
- How does it become a skill, article, product, or service?

The original probe had good strategic notes, but not a complete practice layer.

### 6. It did not separate public docs verification from live account verification strongly enough

Public docs can confirm a feature exists.

They cannot confirm:

- Fritz’s account has access;
- the feature is enabled;
- credits are available;
- rate limits are high enough;
- region/provider restrictions;
- billing risk;
- current account-specific quotas.

The exhaustive audit must create a separate `vendor-capability-verification-tasks.md` file for live account checks.

---

## How To Make Shay Do It Exhaustively Next Time

The research instruction must explicitly say:

```text
Do not only read the links Fritz pasted. Use those links as seed URLs only.
Start from official vendor docs and discover the broader documentation tree.
For each provider, inventory every relevant capability surface and convert it into routing, practice, experiments, dashboard requirements, and monetization opportunities.
```

The worker should be required to produce:

1. Capability inventory.
2. Source policy.
3. Official source URL per feature.
4. Provider surface matrix.
5. Cross-provider routing matrix.
6. Shay routing policy.
7. FAMtastic Designs integration plan.
8. Experiments.
9. Account verification checklist.
10. Dashboard/visualization spec.
11. Practice guide.
12. Monetization/productization opportunities.

The audit must be graded against the question:

> Could Fritz look at this and understand what capabilities exist, what they unlock, when to use them, how to test them, how to display them, and how they become repeatable business practice?

If not, it is not exhaustive enough.

---

## How CJ/ChatGPT Built the Corrected Matrix Framing

CJ/ChatGPT reframed the vendor matrix around task-class routing, not model rankings.

The corrected frame:

```text
Provider capability ≠ model list.
Provider capability = model + tools + runtime + memory + retrieval + eval + batching + caching + observability + deployment + governance + billing surface.
```

CJ/ChatGPT created prompts requiring the matrix to capture:

- Provider.
- Surface.
- Official feature name.
- What it does.
- Best task classes.
- Cost pattern.
- Maturity.
- Use now / Pilot / Defer / Avoid.
- Source.
- Account verification needed.

Then, for every major capability, the audit must answer:

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

CJ/ChatGPT also required cross-platform routing rows for task classes like:

- strategy/architecture;
- coding/repo edits;
- orchestration;
- research;
- lead discovery;
- classification;
- presence scanning;
- proof generation;
- proof QA;
- outreach writing;
- compliance checking;
- structured transforms;
- document ingestion;
- retrieval/RAG;
- memory/session management;
- eval/regression testing;
- app prototyping;
- custom GPT/app products;
- image/video/voice;
- analytics/reporting;
- cost auditing;
- workflow automation.

Each row must identify:

- best default provider/surface;
- cheapest acceptable provider/surface;
- premium escalation provider/surface;
- batch/background option;
- caching option;
- retrieval/memory option;
- eval/QA option;
- dashboard display;
- learning loop;
- skill to create;
- avoid list.

---

## New Prompt Files CJ/ChatGPT Created

Use these to run the actual exhaustive audit:

1. `docs/famtastic-designs/vendor-capability-full-audit-prompt-2026-06-11.md`
2. `docs/famtastic-designs/vendor-capability-full-audit-addendum-openai-gpt-oss-gpts-2026-06-11.md`
3. `docs/famtastic-designs/vendor-capability-exhaustive-audit-execution-prompt-2026-06-11.md`

The third file is the strongest execution prompt and should be used for the real exhaustive run.

---

## Track 2 Issue

CJ/ChatGPT opened:

`Issue #15 — Track 2: Exhaustive vendor capability audit`

Purpose:

- keep vendor research separate from Track 1 FAMtastic Designs plan review;
- prevent the research from getting lost;
- point to the correct prompts;
- list the required outputs;
- mark it as a separate research workstream.

---

## Recommendation To Shay

When ready to run Track 2, do not run it as a vague “research the platforms” task.

Run:

```text
Read and execute:
docs/famtastic-designs/vendor-capability-exhaustive-audit-execution-prompt-2026-06-11.md

Use the other two vendor audit prompts as supporting instructions.
Do not limit yourself to Fritz's pasted links.
Official docs first.
Produce all six required files.
Commit/push.
```

Use a research-specialized / lower-cost lane where possible. Do **not** burn expensive Mythos planning cycles crawling public docs.

---

## Final Note

The original vendor packet was directionally useful, but it was not the exhaustive capability spec Fritz asked for.

The corrected audit must answer the bigger question:

> What can these platforms actually do for Shay, FAMtastic Designs, FAMtastic Thoughts, client services, automation, cost control, learning loops, dashboards, and repeatable skills?

That is the research standard now.
