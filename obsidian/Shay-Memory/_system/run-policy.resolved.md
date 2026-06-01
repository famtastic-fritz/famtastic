---
title: run-policy.resolved
type: note
permalink: shay-memory/_system/run-policy-resolved
tags: [run-model, run-policy, resolved, generated]
---

# Run Policy (resolved) — browsable mirror

> GENERATED — do not hand-edit. Mirrors the machine source-of-truth
> `run-policy.yaml` that the router (`shay_cli/run_router.py`) actually reads,
> so the Obsidian view always reflects live routing behavior.
>
> Regenerate: `cd ~/famtastic/shay-shay && .venv/bin/python scripts/mirror_run_policy.py`
> Canonical model: [[run-model|RUN-MODEL]]

- Resolved from: `/Users/famtasticfritz/famtastic/shay-shay/shay_cli/data/run-policy.yaml`
- Router mode: **advisory** (advisory — recommends, never hijacks an explicit request)
- Generated: 2026-06-01 06:36

## Sample routing decisions (what `shay run-plan` prints)

These are produced by feeding the policy through the router — proof the
definitions drive behavior, not just describe it.

```
Run plan for: "build these 10 screens"
============================================================
  mode:         advisory (recommendation only — nothing runs)
  items:        10
  orchestrator: ralph (sequential)

  executor:     claude-cli  (kind=code, all 10 items)

  why:
    - 10 items, no swarm keyword -> 'ralph' (sequential, gate+commit each, resumable) [Rule 1, default]
    - task-kind routing -> all items use 'claude-cli' [Rule 2]

  policy:       run-policy.yaml
------------------------------------------------------------
Run plan for: "swarm 10 research tasks"
============================================================
  mode:         advisory (recommendation only — nothing runs)
  items:        10
  orchestrator: swarm (parallel)

  executor:     gemini-cli  (kind=research, all 10 items)

  why:
    - 10 items + swarm keyword 'swarm' -> 'swarm' (fan out in parallel, independent items) [Rule 1]
    - task-kind routing -> all items use 'gemini-cli' [Rule 2]

  policy:       run-policy.yaml
------------------------------------------------------------
Run plan for: "fix the login bug"
============================================================
  mode:         advisory (recommendation only — nothing runs)
  items:        1
  orchestrator: interactive (sequential)

  executors:
     1. claude-cli  kind=code     item 1

  why:
    - 1 item -> 'interactive' (single ask, no loop) [Rule 1]
    - task-kind routing -> all items use 'claude-cli' [Rule 2]

  policy:       run-policy.yaml
------------------------------------------------------------
Run plan for: "update these 3 docs"
============================================================
  mode:         advisory (recommendation only — nothing runs)
  items:        3
  orchestrator: ralph (sequential)

  executor:     native  (kind=doc, all 3 items)

  why:
    - 3 items, no swarm keyword -> 'ralph' (sequential, gate+commit each, resumable) [Rule 1, default]
    - task-kind routing -> all items use 'native' [Rule 2]

  policy:       run-policy.yaml
```

## Active policy (verbatim run-policy.yaml)

```yaml
# =============================================================================
# run-policy.yaml — Shay Run Model, machine source-of-truth
# =============================================================================
# This file ENCODES the RUN-MODEL so its definitions DRIVE behavior. The router
# (shay_cli/run_router.py) reads THIS file and applies the rules below — it does
# not hardcode them. Edit here to change routing; the router follows.
#
# Source spec: obsidian/Shay-Memory/_system/RUN-MODEL.md
# Resolution order (run_router.load_policy):
#   1. $SHAY_RUN_POLICY (explicit override path)
#   2. $SHAY_HOME/run-policy.yaml      (user override, usually ~/.shay/)
#   3. <repo>/shay_cli/data/run-policy.yaml  (this packaged default)
#
# ADVISORY-FIRST: the router returns a recommendation. It does NOT execute and
# does NOT override an explicit human request yet. It exists so the routing
# decision is VISIBLE (via `shay run-plan`) before anything runs.
# =============================================================================

version: 1
mode: advisory   # advisory = recommend only; never hijack explicit requests

# -----------------------------------------------------------------------------
# Layer 1 — ORCHESTRATORS: how work is *driven*
# -----------------------------------------------------------------------------
orchestrators:
  interactive:
    shape: "one turn, no loop"
    fires_when: "a single ask / conversation (1 item)"
    parallel: false
  ralph:
    shape: "ONE loop, iterates N items sequentially, gate+commit each, resumable"
    fires_when: "a defined backlog done carefully/ordered; collision-prone items; DEFAULT for 'do these N things'"
    parallel: false
    resumable: true
  swarm:
    shape: "kanban dispatcher fans N items out in parallel across workers (<= max_concurrent)"
    fires_when: "explicit 'swarm' request; many independent, collision-free items"
    parallel: true
    max_concurrent: 4
  cron:
    shape: "scheduled trigger -> runs a task on a timer"
    fires_when: "recurring jobs (reflection, discovery)"
    parallel: false

# -----------------------------------------------------------------------------
# Layer 2 — EXECUTORS: how ONE unit gets *done* (called BY every orchestrator)
# Each executor declares its capability contract. Any brain satisfying a type's
# contract produces equivalent results -> same results regardless of default brain.
# -----------------------------------------------------------------------------
executors:
  claude-cli:
    backend: 'claude -p "<task>"'   # headless, completes-by-exit
    best_for: "hard code builds — most reliable"
    capability_contract:
      tools: [read, write, edit, bash]
      permission_mode: auto          # no manual stalls
      completion_contract: process-exit
      gates: [typecheck, build, pytest]
  codex-cli:
    backend: 'codex exec "<task>"'
    best_for: "bulk builds / 2nd-opinion (flat-rate sub = cheap)"
    capability_contract:
      tools: [read, write, edit, bash]
      permission_mode: auto
      completion_contract: process-exit
      gates: [typecheck, build]
  gemini-cli:
    backend: "gemini headless"
    best_for: "research / triage (cheapest)"
    capability_contract:
      tools: [read, web_search]
      permission_mode: auto
      completion_contract: process-exit
      gates: [import]
  native:
    backend: "shay chat worker / build_app / surgical_patch"
    best_for: "small surgical edits, docs"
    capability_contract:
      tools: [surgical_patch, build_app]
      permission_mode: auto
      completion_contract: forced-finalizer   # native + Watcher
      gates: [import]

# -----------------------------------------------------------------------------
# ROUTING RULES — what the router applies, in order
# -----------------------------------------------------------------------------
routing:
  # Rule 1: # of items + dependency -> orchestrator
  orchestrator_rule:
    single_item: interactive          # 1 item -> interactive, no loop
    swarm_keywords: [swarm, parallel, "fan out", "fan-out", concurrently, "in parallel"]
    swarm_when: "N items AND a swarm keyword AND items are independent (collision-free)"
    swarm_orchestrator: swarm
    default_multi: ralph              # N items (default / ordered / collision-prone) -> ralph sequential

  # Rule 2: task-kind -> executor (keyword match on the request + per-item text)
  executor_rule:
    default: claude-cli
    kinds:
      code:
        executor: claude-cli          # escalate from codex/mid-tier per build-lane policy
        keywords: [build, code, implement, screen, screens, component, feature,
                   fix, refactor, app, page, ui, endpoint, api, function, bug]
      research:
        executor: gemini-cli
        keywords: [research, investigate, triage, explore, survey, find out,
                   look into, analyze, compare, gather, study]
      doc:
        executor: native
        keywords: [doc, docs, document, note, readme, edit text, small edit,
                   tweak, rename, typo, comment]

  # Rule 3: collision rule
  collision_rule:
    parallel_across: "DIFFERENT files / repos"
    serial_on: "the SAME file (until git-worktree isolation is wired)"
    # If swarm requested but items collide on the same target, downgrade to ralph.
    downgrade_to_serial_on_collision: true

  # Rule 4: cost
  cost_rule:
    route_by: "$/energy telemetry"
    low_funds_notify: true
    hard_cap: false

  # Rule 5: verification layers (every run, every orchestrator)
  verification:
    plan: adversarial-review
    build: gate
    completion: watcher
    manual_approval: false
```
