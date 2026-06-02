---
title: "Skill Recommendations — Shay's Swarm Get-Smarter Loop"
date: 2026-05-30
tags: [shay, swarm, skills, roadmap, phase2, get-smarter]
permalink: /shay-memory/learnings/skill-recommendations-2026-05-30
---

# Skill Recommendations — Shay's Swarm Get-Smarter Loop

New skills Shay's swarm needs to develop as part of the get-smarter loop (Part H of the plan). Each entry includes what the skill does, why it's needed, and the canonical entry point or template it should be built from.

---

## 1. research-orchestration

**What it does:** Executes the full Phase 1→3b research pattern as a single reusable skill invocation.

Pipeline:
1. Decompose goal into sub-goals
2. Fan out workers (one brain call per sub-goal)
3. Anchor check on each proposed sub-goal before acceptance
4. Judge each result against the original goal
5. Synthesize accepted results into a coherent final output
6. Adversarial verify with a different brain than the author
7. Run quality gates (form + grounding)

**Why it's needed:** This pattern was rebuilt from scratch during Phase 1. Every research job in Phases 2 and 3 will need the same pipeline. Without a reusable skill, each new job author reinvents the loop and introduces new bugs at the seams.

**Entry point:** `~/.shay/swarm/goal_loop.py` (Phase 1 implementation). The skill wraps this with a clean YAML job spec interface and returns a structured result object.

---

## 2. brain-availability-check

**What it does:** Runs `BrainAvailabilityCheck` at the start of any autonomous job. Probes each configured brain (Anthropic, Gemini, OpenRouter, Ollama). Logs effective brains to the job record. Auto-selects fallback tiers. Returns a brain manifest the job uses for all subsequent brain selection.

**Why it's needed:** Three separate brain caps hit during this session. Jobs that started with a premium brain assumption failed mid-run. There is no retry logic at the job level, only at the individual call level. Starting with a verified brain manifest eliminates this class of failure.

**Behavior:**
- If no cloud brains are available: log warning, proceed with Ollama only, flag job as degraded
- If Ollama is also unavailable: halt and notify before the job starts, not mid-run
- Brain manifest is written to the job record and referenced for the job's lifetime

**Template:** `brain_client.py` probe pattern + job-spec brain-tier field.

---

## 3. benchmark-regression

**What it does:** Runs `swarm-benchmark.py` after any change to the swarm engine. Asserts all D-5 gates (completion rate, synthesis quality, drift score, adversarial pass rate, budget adherence). Logs results to the efficiency ledger. Fails loudly — with diff from prior run — if any previously-passing metric regresses.

**Why it's needed:** The Phase 1 benchmark failure caught bugs that code review missed. Without automated regression detection, future changes to `goal_loop.py`, `worker_pool.py`, or `brain_client.py` will silently break the engine until a human notices something wrong in production output.

**Behavior:**
- Reads prior benchmark results from efficiency ledger
- Compares metric-by-metric
- On regression: prints which metric regressed, by how much, and which commit introduced it
- On pass: appends results to ledger and exits 0

**Non-negotiable:** This skill must run before any swarm change is committed to main. It is the gate, not the audit.

---

## 4. cross-package-seam

**What it does:** Provides a canonical template and decision guide for integrating two Python packages that live in separate environments.

**Decision rules:**
- Two packages, separate envs, need to call each other → use stdlib-only HTTP
- Need to pass complex objects → serialize to JSON over HTTP, never pickle
- Need shell-level integration → subprocess with structured stdout, never shared imports
- Never attempt cross-package imports unless both packages are explicitly co-installed in a shared venv that is tested and pinned

**Template:** `brain_client.py` — reads `~/.shay/.env` for keys, uses `urllib.request` only, returns parsed JSON. Copy this pattern verbatim for any new cross-package seam.

**Why it's needed:** The `ModuleNotFoundError: yaml` failure cost two hours of debugging. The root cause was a single incorrect assumption about package boundaries. The `brain_client.py` pattern solves this permanently but only if it's treated as the canonical template, not a one-off fix.

---

## 5. job-spec-authoring

**What it does:** Given a natural-language goal, produces a valid YAML job spec with:
- Phases with names and descriptions
- Per-phase brain tier selection (with fallback)
- Quality gates per phase (form + grounding + adversarial)
- Phone check-in points (at minimum: after decomposition, after synthesis)
- Budget allocation per phase

**Why it's needed:** This is the Phase 3a primitive that allows Shay to author her own work orders. Without a spec-authoring skill, every new job requires Fritz to write the YAML manually. With it, Fritz describes the goal in plain language and Shay produces the spec for review before execution.

**Output format:** YAML, validated against the job spec schema. Shay presents the spec for Fritz's approval before any execution begins. The spec is the contract; execution doesn't start until the spec is signed off.

**Quality bar:** A spec authored by this skill must be indistinguishable from a handwritten spec in structure, completeness, and accuracy of gate thresholds.

---

## 6. session-capture-mid-run

**What it does:** Writes a structured memory note to the Obsidian vault at the end of each significant step during a session. Does not wait for session end.

**Trigger conditions (any of these = write a note):**
- A sub-system is built and passes its first test
- A benchmark is run (pass or fail)
- A root cause is confirmed
- A design decision is locked
- A brain cap is hit and a downgrade decision is made

**Note structure:**
```markdown
## [Step name] — [timestamp]
**What was built:** ...
**What failed (if anything):** ...
**Honest limit:** ...
**What's next:** ...
```

**Why it's needed:** Context windows don't survive session boundaries. If a session ends mid-arc — due to cap, timeout, or context overflow — learnings written only to the context window are lost. Notes written to the vault persist. The vault is the memory; the context window is the working set.

**Non-negotiable:** This skill must be called at step end, not session end. Session-end capture is a fallback, not the primary path.
