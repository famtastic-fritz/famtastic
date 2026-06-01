---
title: RUN-MODEL
type: note
permalink: shay-memory/_system/run-model
tags: [canonical, run-model, orchestration, executors]
---

# Shay Run Model — orchestrators, executors, capabilities, routing (canonical)

> Single source of truth for HOW work runs. The router (below) should READ this model's
> intent (mirrored as `run-policy.yaml`) so the definitions DRIVE behavior, not just describe it.

## Two layers

### Layer 1 — ORCHESTRATORS (how work is *driven*)
| Run type | Shape | Fires when |
|---|---|---|
| **Interactive** (`shay chat`) | one turn, no loop | a single ask / conversation |
| **`.ralph` loop** | ONE loop, iterates N items **sequentially**, gate+commit each, resumable | a defined backlog you want done *carefully/ordered*; collision-prone items; default for "do these N things" |
| **Swarm** (kanban dispatcher) | fans N items out **in parallel** across workers (≤ `max_concurrent`) | you explicitly ask to "swarm" it; many independent, collision-free items |
| **Cron** | scheduled trigger → runs a task on a timer | recurring jobs (reflection, discovery) |
| *(delegate_task)* | nesting: any run can fan out sub-agents | inside any of the above |

**Worked example (Fritz's question):** 10 items, no swarm asked → **one `.ralph` loop, 10 sequential gated iterations**. 10 items, "swarm it" → **kanban dispatcher, parallel**. 1 item → single executor, no loop.

### Layer 2 — EXECUTORS (how ONE unit gets *done*) — called BY every orchestrator
| Executor | Backend | Best for |
|---|---|---|
| **claude-cli** | `claude -p "<task>"` (headless, completes-by-exit) | hard code builds — most reliable |
| **codex-cli** | `codex exec "<task>"` | bulk builds / 2nd-opinion (flat-rate sub = cheap) |
| **gemini-cli** | gemini headless | research / triage (cheapest) |
| **native** | `shay chat` worker / `build_app` / `surgical_patch` | small surgical edits, docs |

## Capability contract (what makes any executor reliable + brain-agnostic)
Every executor type MUST declare + satisfy:
- **tools** it needs (e.g. `kanban_complete`/`kanban_block` for swarm tasks) — verified pre-spawn (cap-check H2)
- **permission mode** = auto (no manual stalls)
- **completion contract** = can't-forget: process-exit (claude/codex) OR forced finalizer (native + Watcher)
- **gates** it runs (typecheck/build/pytest/import) before reporting done
Result: any brain satisfying a type's capability set produces equivalent results → **same results regardless of default brain.**

## ROUTING RULES (what the router applies)
1. **# of items + dependency:** 1 → interactive · N independent + "swarm" → swarm · N (default / ordered / collision-prone) → `.ralph` sequential.
2. **Task kind → executor:** code-build → claude-cli (escalate from codex/mid-tier per build-lane policy) · research → gemini-cli · doc/small-edit → native.
3. **Collision rule:** parallel across DIFFERENT files/repos; serial on the SAME file (until git-worktree isolation is wired).
4. **Cost:** route by $/energy telemetry; notify near low-funds (no cap).
5. **Verification:** every run, every orchestrator → adversarial review (plan) + gate (build) + Watcher (completion). Manual approval is OFF.

## Where this is stored / baked in (so it drives behavior)
- **This doc** = the human-readable canonical reference (browsable in Obsidian).
- **`run-policy.yaml`** (to build) = the machine source-of-truth the router reads.
- **Router** (to build) = picks orchestrator + executor per request from the policy.
- **Desktop** (future) = a "Run Model" view surfacing the live policy + which executor each lane uses.
