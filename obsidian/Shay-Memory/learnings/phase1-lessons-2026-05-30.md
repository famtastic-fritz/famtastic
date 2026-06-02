---
title: "Phase 1 Swarm Engine — Lessons Learned"
date: 2026-05-30
tags: [shay, swarm, phase1, lessons, engineering]
permalink: /shay-memory/learnings/phase1-lessons-2026-05-30
---

# Phase 1 Swarm Engine — Lessons Learned

Captured from the Phase 1 self-orchestration engine build and swarm fix session. These are real failures encountered in order, not retrospective idealizations.

---

## 1. The Dead-Code Bug: Trace the Full Call Path

`self.judge_model` was assigned in `GoalLoop.__init__()` and pointed at the configured judge model tier. It was never read again.

Both `_judge()` and `_decompose()` called `worker_pool.submit(model_tier='complex')`, which resolved to `hermes3` via `MODEL_MAP` — completely ignoring the config value stored in `self.judge_model`.

**Lesson:** An assignment is not a guarantee of use. Trace the full call path from config assignment to the place where the value actually influences behavior. If you can't find where the value is *read*, the config is dead code. Grep for the variable name in the entire call chain before declaring a config "wired."

---

## 2. The Cross-Package Import Trap

Routing brain calls through Shay's `plugin_llm.py` from the `shay-agent-os` package failed immediately with:

```
ModuleNotFoundError: yaml
```

The packages live in separate Python environments. Direct imports across package boundaries don't work without explicit shared environment setup — and that setup is fragile, not portable, and not worth doing.

**Fix:** `brain_client.py` — stdlib-only HTTP client that reads `~/.shay/.env` directly for keys. No cross-package imports. No shared venv assumptions.

**Lesson:** Never assume cross-package Python imports work without testing the boundary first. Any integration between two separately-installed Python packages must go through stdlib-only HTTP, subprocess, or an explicit shared venv. The `brain_client.py` pattern is the canonical template for this seam.

---

## 3. The Missing Synthesize Step

`final_result_chars` was 0 in the benchmark. The working hypothesis was that synthesis was failing — wrong model, bad prompt, network issue.

The actual cause: there was no reduce step at all. Sub-goal results were collected but never aggregated into a final answer. The fix was 30 lines of code.

**Lesson:** Before diagnosing *why* a step is failing, verify the step *exists*. Trace the data flow all the way to the output. Ask: where does `final_result` get written? If you can't find the assignment, it's not a bug in the step — the step is missing.

---

## 4. The Anchor Check: Drift Compounds Over Turns

Topic drift (the neuroscience incident) didn't happen in one turn — it compounded. Each decomposition step appended proposed sub-goals without checking them against the original goal. By turn 4, the sub-goals had almost no lexical overlap with the original goal.

**Fix:** A simple keyword blocklist + goal-word overlap check on every proposed sub-goal before it enters the queue. Caught 5 off-topic sub-goals in the benchmark run.

**Lesson:** Drift prevention needs to run at the point of sub-goal *acceptance*, not at the point of *synthesis*. Catching drift early is cheap; catching it at synthesis means re-running everything. The anchor check should be the first filter in the decompose loop, not an afterthought.

---

## 5. Budget Calibration Is a Config Value, Not a Code Change

`budget=10` exhausted before completing complex multi-source comparison tasks. `budget=15` produced clean completions on the same benchmarks.

This is not a logic bug. The engine is correct; the initial budget was undersized for the intended task class.

**Lesson:** Budget is a runtime configuration value, not a constant baked into the engine. Complex comparison tasks with 4+ competing sources need ~15 sub-goal slots. Simple summarization tasks work at 8–10. The budget should be settable per job spec, not shared across all task types.

---

## 6. Brain Caps Are a Recurring Pattern — Design for Them

Anthropic weekly cap, Codex subscription cap, OpenRouter per-key rate limit all hit during this session. At one point two premium brains were simultaneously unavailable.

The only always-available brains are **Gemini Flash** (free tier, generous limit) and **local Ollama** (self-hosted, no cap).

**Lesson:** Any autonomous job that assumes a specific premium brain is available will fail unpredictably. The architecture must include graceful degradation: detect cap → log effective brains → downgrade to available tier → continue. Never start a job without running `BrainAvailabilityCheck` first. Never design a pipeline where a single-brain failure blocks the job.

---

## 7. "6x Faster" Only Matters If Quality Is Assured

Local Ollama workers completed sub-goals approximately 6x faster than the cloud brain. The output was also substantially worse — hallucinations, factual drift, and off-topic completions that passed structural quality gates but failed adversarial review.

Speed is a multiplier on quality, not a substitute for it. 6x faster to garbage is still garbage.

**Lesson:** When evaluating a brain tier for swarm work, establish a quality floor *before* citing the speed advantage. The benchmark must include adversarial review, not just structural checks. Fast + wrong fails at synthesis and poisons downstream sub-goals. Slow + correct is recoverable.
