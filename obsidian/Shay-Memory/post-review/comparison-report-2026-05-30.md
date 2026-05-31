---
title: J′ vs Shay-Swarm — Head-to-Head Orchestration Benchmark
date: 2026-05-30
tags: [swarm, orchestrator, benchmark, j-prime, shay-agent-os, post-review]
permalink: shay-memory/post-review/comparison-report-2026-05-30
type: note
---

# J′ vs Shay-Swarm — Head-to-Head Orchestration Benchmark (2026-05-30)

Two orchestrators were run **on the same task in parallel** to test the claim
that shay-agent-os's local Ollama swarm is a viable substitute for cloud-LLM
fan-out under per-session token quotas. The task: produce a structured
comparison of three multi-agent orchestration patterns
(Anthropic-documented mode, generic Workflow-tool fan-out, shay-agent-os
SwarmOrchestrator) with concurrency, brain coupling, cost model, top
limitation, and a two-sentence pick recommendation.

Same task. Same day. Different substrates. Honest measurements below.

---

## 1. Headline numbers

| Metric | J′ (Workflow tool, cloud LLM) | Shay-swarm (local Ollama) |
|---|---|---|
| **Status** | Completed — 3 final artifacts | `budget_exhausted` — no final synthesis |
| **Wall-clock** | 41 min 0 s | 4 min 51 s |
| **Agents / sub-goals dispatched** | 27 | 19 (10-turn budget cap hit) |
| **Total tokens (approx)** | 2,126,132 (out) | unmeasured; per-call 512 tok cap × 19 ≈ ≤9,728 out |
| **Final synthesis produced?** | **Yes** — 3 markdown docs (swarm-arch, V2-plan, phone-app) | **No** — `final_result_chars: 0` |
| **Useful artifact written to disk?** | Yes — 167,202 chars across 3 .md files | Indirect only — 19 subgoal fragments in transcript |
| **Quality of output** | Coherent, sourced, R1+R2 critique-trailed | Off-topic drift, hallucinated terms, no synthesis |
| **Cost** | Anthropic Max plan (within quota — no hard 400s) | $0 (local) + ~5 min M-series compute |

---

## 2. Quality of the artifacts (read the actual outputs)

### J′ delivered

- **`swarm-architecture-2026-05-30.md`** — 107,941 chars, 9 top-level sections, 8-orchestrator comparative matrix with weighted scoring rubric, three reference policy YAMLs (`free-maximal`, `balanced`, `speed-first`), pattern library, explicit `Dispatcher` protocol spec to avoid vendor lock-in, three load-bearing caveats walked back from V1 over-claims (e.g., "the '500 agents in tens of minutes for free' claim that appeared in v1 was wrong"), §10 line-by-line response to critique.
- **`v2-build-plan-2026-05-30.md`** — 7,752 chars, lean delta-doc, R1→R2 accounting (one `revise-minor`, one `ship`), 15 numbered R2 deltas applied, honest phase-3 envelope correction (14 min → 27 min realistic), OpenRouter free-tier cap correction ($0 deposit = 50 RPD not 1000), worktree pool sized to 12 not 50, `shay-v2-resume` CLI defined.
- **`phone-app-plan-2026-05-30.md`** — 51,509 chars, 12 sections, FM-four-gate availability check, per-platform capability matrix vs Claude/ChatGPT/Codex/Perplexity, V1→V2→V3 critique trail.
- **`critique-trail-jprime-2026-05-30.json`** — 133,654 bytes, full R1 + R2 verbatim critiques across all three docs.

### Shay-swarm delivered

19 subgoal results stored in `swarm-benchmark-transcript-2026-05-30.md`. Snapshot of failure modes (from `swarm-benchmark-result-2026-05-30.json`):

- **SG-1** (Anthropic mode): hallucinated. Says "Orchestration Tool: Maximize" and "OpenAI/GPT-like models (e.g., Phi, Curie)" for an Anthropic prompt. Invented tool name.
- **SG-3** (shay-agent-os): generic, says "Ensure that the latest version of Shay OS is installed on all machines intended as nodes in your swarm" — Shay-OS doesn't exist as a distributed install, this is invented framing.
- **SG-4** (concurrency comparison): invented numbers — "Pattern A 50, Pattern B 75, Pattern C 30" with no grounding.
- **SG-9** (key bottleneck): completely off-topic. Talks about "Docker swarm mode network latency" — confused shay-agent-os with Docker Swarm.
- **SG-11** (two-sentence recommendation): drifted into Singleton/Observer OOP design patterns.
- **SG-13 → SG-19** (turns 4–10): **the judge model misread "brain coupling" (LLM provider coupling) as cognitive-neuroscience "brain coupling"** and decomposed the remaining 7 subgoals into questions about *working memory capacity, processing speed, and cognitive performance* in human subjects. Wall-clock and tokens spent on neuroscience essays. No correction mechanism caught it.

The transcript is publishable as a case study in goal-loop drift. It is not publishable as the requested deliverable.

---

## 3. Where each substrate genuinely wins

### J′ wins on

1. **Synthesis** — produces a final consolidated artifact, not 19 disjoint fragments.
2. **Adversarial review** — 9 skeptics R1 + 6 skeptics R2 caught real over-claims that ship-as-drafted would have shipped (the V1 "500-for-free" claim was killed by R1; the LangChain-vs-raw-HTTP coupling was sharpened by R1; the AsyncioDispatcher "engineered escape hatch" was honestly downgraded from "ready" to "stub + 2-week build at trigger" by R2). The honesty in the final docs is critique-driven, not orchestrator-driven.
3. **Topic anchoring** — every fan-out was prompted with its full context, so no drift.
4. **Tool quality** — Sonnet/Opus models follow structural instructions reliably; Ollama 1.5B/4B/8B models do not.

### Shay-swarm wins on

1. **Wall-clock per dispatched agent** — 4.9 min / 19 = ~15 s/agent; J′ averaged 41 min / 27 = ~91 s/agent. **Local Ollama is 6× faster per agent** when the agents themselves can do the work. (They can't here. But the substrate is faster.)
2. **Cost** — $0. J′ consumed ~2.1M output tokens against the Max plan.
3. **No session caps** — Shay-swarm cannot hit Anthropic's per-session ceiling because it never touches Anthropic. The earlier J′ failure (all 27 agents 400-ing in the first re-fire) was an Anthropic-side rate-limit, not a workflow problem.
4. **Trust gating present** — `trust_mode.py` checked the goal description against denylists before dispatch; J′ has no equivalent. (Trust check passed here because Fritz's level is `trusted`.)
5. **In-memory Redis fallback works** — when the `redis` python module isn't installed, MessageBus silently degrades to an in-memory dict. The swarm ran fine without Redis. This is **a real positive finding** that contradicts the J′ architecture doc's claim that Redis is a hard dependency.

---

## 4. Why shay-swarm failed at this specific task

Three root causes, ranked by remediability:

### 4.1 Judge model is too small (immediate, high-impact)

`JUDGE_MODEL = "hermes3:latest"` (8B) decomposes the goal. It cannot:

- Distinguish "brain (LLM provider)" from "brain (neural tissue)" without anchoring.
- Hold the 11-property comparison schema across decomposition iterations.
- Detect when its own sub-questions have drifted.

**Fix:** Swap judge for a stronger remote model (Sonnet/Codex/Gemini-Flash) while keeping workers on local Ollama. The judge is one call per turn, not per worker — cost stays near zero. This single change would likely fix the topic drift.

### 4.2 No completeness critic + no anti-drift loop (medium-impact)

`GoalLoop` has a `budget` ceiling (10 turns here) but no "are we still on the original goal?" check between turns. Once SG-13 went off-topic, SG-14 through SG-19 compounded the drift. J′'s adversarial-R1 phase exists specifically to catch this; shay-swarm has no equivalent.

**Fix:** Add a per-turn anchor-check sub-task that re-reads the original goal and the latest sub-goal description and votes `on-topic` / `off-topic` before dispatch. Cheap (one extra Ollama call per turn).

### 4.3 No final synthesis step (medium-impact)

`final_result_chars: 0` is not "the goal couldn't be synthesized"; it's "the goal loop never had a synthesis step." Subgoals completed and were stored; nothing reduced them into a final output. The reduce step is missing from the implementation.

**Fix:** Add a `synthesize_subgoals()` method to `GoalLoop` that runs after all subgoals complete (or budget exhausts), concatenates results, and runs them through the judge model with a "write the final consolidated output" prompt.

### 4.4 Model tier mapping is too aggressive at the low end

`"simple": "qwen2.5:1.5b"` is too small for any synthesis-quality output; 1.5B models are appropriate only for one-shot string transforms. The `medium` tier (phi4-mini 3.5B) was used 14/19 times here and still produced wandering output.

**Fix:** Drop `simple` tier or remap it to `qwen2.5-coder:7b`. Default to medium for everything except explicit one-shot tasks.

---

## 5. What this proves about Fritz's stated goal

> *"I should be able to dispatch 500 low-cost or free agents. If this was designed correctly. I don't like limits."*

The benchmark says: **today, shay-agent-os can dispatch 500 agents — but they will produce 500 fragments of off-topic local-LLM output, not 500 useful work units.** The plumbing works (3 workers, in-memory Redis fallback, Ollama tiered dispatch, trust gating, goal decomposition). The intelligence layer does not.

The J′ swarm-architecture doc names the path forward in §3 (Recommendation): keep `SwarmOrchestrator`/`TrustMode`/`ErrorRecovery`/`GoalLoop` as the policy/observability shell, replace `worker_pool.py` with a `Dispatcher` protocol that fronts LangGraph 1.2 today and lets us cut over to a greenfield asyncio + Redis Streams substrate later. Workers remain free to be Ollama-local, but the **dispatch + decompose + judge + synthesize** loop needs a stronger brain.

The four fixes in §4 above are the minimum-viable upgrade to make today's shay-agent-os swarm produce J′-quality output at near-zero cost. They are also enumerated as concrete tasks in the V2 build plan's Approval #0 dependencies.

---

## 6. Honest call

**For the deliverable Fritz asked for today** (comparative orchestrator review + V2 + phone-app, adversarially reviewed): J′ produced it; shay-swarm did not. Ship J′'s three docs as the canonical output.

**For the stated long-term goal** (500 free agents): J′ is the spec for how to get there. Shay-swarm is the substrate that needs the four fixes in §4 before it can execute that spec.

**Recommended sequence:**

1. Read J′'s three docs (`swarm-architecture-…md`, `v2-build-plan-…md`, `phone-app-plan-…md`) as the canonical V2 starting point.
2. Apply the four shay-swarm fixes in §4 as a discrete pre-V2 task (estimated ~4 hours of work).
3. Re-run this same benchmark with the fixes applied. If shay-swarm produces a coherent comparison doc with synthesis, the local-swarm path is viable for the actual V2 build. If not, V2 builds on LangGraph 1.2 behind the `Dispatcher` protocol as recommended in J′'s swarm-arch §3.

---

## 7. Artifacts produced this session (all at `~/famtastic/obsidian/Shay-Memory/post-review/`)

| File | Source | Size | Purpose |
|---|---|---|---|
| `swarm-architecture-2026-05-30.md` | J′ | 108k chars | Canonical V2 architecture |
| `v2-build-plan-2026-05-30.md` | J′ | 7.8k chars | V2 phase plan + R2 deltas |
| `phone-app-plan-2026-05-30.md` | J′ | 52k chars | Phone-app V2 spec |
| `critique-trail-jprime-2026-05-30.json` | J′ | 134k bytes | Full R1+R2 critiques (provenance) |
| `swarm-benchmark.py` | this session | 5.9k chars | Reusable harness |
| `swarm-benchmark-result-2026-05-30.json` | shay-swarm | 11.8k bytes | Run metrics |
| `swarm-benchmark-transcript-2026-05-30.md` | shay-swarm | 31k chars | Full subgoal outputs |
| `swarm-benchmark-2026-05-30.log` | this session | 862 bytes | Run log |
| `comparison-report-2026-05-30.md` | this doc | — | Head-to-head + recommendation |
| `post-mortem-2026-05-30.md` | J (prior) | 36k chars | Original honest post-mortem |
| `critique-trail-2026-05-30.md` | J (prior) | 139k chars | J's critique trail |

---

## 8. Linked notes

- [[swarm-architecture-2026-05-30]]
- [[v2-build-plan-2026-05-30]]
- [[phone-app-plan-2026-05-30]]
- [[post-mortem-2026-05-30]]
- [[critique-trail-2026-05-30]]
