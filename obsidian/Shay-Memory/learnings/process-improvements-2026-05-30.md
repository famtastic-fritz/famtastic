---
title: "Process Improvements — Multi-Day Session Retrospective"
date: 2026-05-30
tags: [shay, process, retrospective, engineering, planning]
permalink: /shay-memory/learnings/process-improvements-2026-05-30
---

# Process Improvements — Multi-Day Session Retrospective

Retrospective from the full multi-day Phase 1 build session. These are process failures, not code failures. Most of the hard debugging in this session would have been unnecessary with better process up front.

---

## 1. Run the Benchmark BEFORE Planning

The Phase 1 benchmark failure was the most informative artifact in the entire session. It proved exactly what was broken — no inference, no theory, no speculation. It surfaced the dead-code bug, the missing synthesize step, and the drift problem all at once.

This benchmark was run at step N, after several planning and implementation passes.

**Improvement:** When the stated goal is "fix the engine," the benchmark is step 1. Run it first. Read the failure output. Plan from what you observe, not from what you expect. Benchmark-first is the difference between targeted surgery and exploratory debugging.

---

## 2. Adversarial Review Must Use a Different Model Than the Author

Gemini reviewing Gemini output is theater. Claude reviewing Claude output is theater. A model has systematic blind spots, and those blind spots are correlated with the outputs it generates. A reviewer sharing those blind spots will miss exactly the errors that matter.

**Improvement:** The reviewer-is-not-the-author rule must be enforced in the pipeline, not just recommended. If the author brain is Claude Sonnet, the reviewer must be Gemini or a local model. The pipeline should hard-block same-model review and log a warning when it detects it. "I'll review my own work carefully" is not an acceptable substitute.

---

## 3. Capability Gates Before Capability Claims

"Shay can build autonomously" is a claim. The benchmark is the gate. These are not the same thing.

A capability claim without a passing benchmark is a roadmap item, not a shipped feature. This distinction matters for Fritz's decision-making: if a capability is claimed but ungated, the system will be used in production contexts where it will fail.

**Improvement:** Every capability statement in documentation must reference the benchmark that validates it. If no benchmark exists, the capability is listed as "planned" or "in development." Running the benchmark after the claim does not count — the gate precedes the claim.

---

## 4. Phone Oversight Must Be Wired In From Day One

`ask_shay.py` was added late in the session, after several long-running autonomous jobs had already run without human check-in points. Multiple jobs made consequential decisions (sub-goal routing, brain selection, result acceptance) with no opportunity for Fritz to intervene.

**Improvement:** Phone oversight is not a feature to add later — it's a safety primitive that goes in before any autonomous job runs in a non-trivial context. The pattern is simple: job hits a defined gate → pushes notification → Fritz answers → job continues or redirects. Every long-running autonomous job spec must include at least one check-in point. Jobs with budget > 10 must include at least two.

---

## 5. Write Session Summaries Mid-Session, Not at the End

Context windows don't survive session boundaries. If a session ends before summaries are written — due to cap, timeout, or context overflow — the learnings are lost. This happened once during this session.

**Improvement:** Write a memory note to the vault at the end of each *significant step*, not at session end. A significant step is: a sub-system is built and tested, a benchmark is run, a root cause is confirmed, or a design decision is locked. The note takes 5 minutes. The alternative is reconstructing the session from git history and log files.

---

## 6. Design the Contract Before the Implementation

The Dispatcher protocol abstraction (Phase 2) should have been designed before Phase 1 started. It is the contract that everything else depends on: how jobs are specified, how brains are selected, how results are passed between stages. Instead, Phase 1 was built with implicit contracts that Phase 2 now needs to work around.

**Improvement:** For any system with multiple interacting components, design the interface contract first. This does not mean writing all the code first — it means writing the YAML schema or API signature that the components will use to communicate, reviewing it, and locking it before any implementation starts. Bottom-up and top-down planning must happen simultaneously, not sequentially.

---

## 7. Document the Honest Limit of Automated Quality Gates

Form checks and grounding checks catch structural problems: missing sections, wrong format, citation count below threshold. They do not catch "confidently wrong but structurally complete" output.

A sub-goal result that passes all automated gates can still be factually incorrect, subtly off-topic, or internally contradictory. This class of error requires a strong-model spot-check to catch — it cannot be gated away with regex or schema validation.

**Improvement:** Every quality gate in the pipeline must have a documented scope. The scope statement for automated gates should be explicit: "This gate checks form, not truth." A strong-model spot-check (adversarial review by a different brain) is the only gate that catches content-level errors, and it must appear at least once per job, after synthesis, before delivery.
