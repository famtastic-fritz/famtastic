---
title: SHAY-SWARM-RUNTIME-LOGIC
type: note
permalink: famtastic/01-shay-platform/shay-swarm-runtime-logic
---

# Shay Swarm Runtime Logic

Last updated: 2026-06-24
Authority class: shared runtime truth surface for current swarm logic and routing doctrine

## Purpose

Give every session one canonical place to read the current Shay swarm logic without re-deriving it from scattered code, post-review notes, or control-plane docs.

This note consolidates:
- the active local swarm runtime in `shay-agent-os/components/swarm/`
- the current Shay routing doctrine in `shay-shay/docs/agent-template-routing-matrix-2026-06-24.md`
- the capability-engine dispatch model in `obsidian/01-Shay-Platform/CAPABILITY-ENGINE.md`
- the older architecture blueprints that explain why the current shape exists

## Binary truth first

- Yes: Shay already has real swarm runtime code on disk.
- Yes: Shay already has a real agent-class routing matrix on disk.
- No: the per-task best-model map is not fully production-measured yet.
- No: the current runtime is not a finished 300/500-agent production swarm.
- Yes: this note is the consolidated shared-session swarm logic surface.

## Canonical code surfaces

### Runtime orchestrator
- `shay-agent-os/components/swarm/swarm_orchestrator.py`
- Top-level shell that ties together:
  - `MessageBus`
  - `WorkerPool`
  - `GoalLoop`
  - `TrustMode`
  - `ErrorRecovery`
- Responsibilities:
  - start/stop swarm subsystems
  - gate goals through trust mode
  - run synchronous and async goal sessions
  - submit direct worker asks
  - surface health/status
  - subscribe to the error channel and trigger recovery

### Dispatcher layer
- `shay-agent-os/components/swarm/local_swarm_dispatcher.py`
- Current concrete dispatcher that wraps the local worker pool + `BrainChain`
- Routing shape in code today:
  - `task.brain == auto|claude|openrouter|gemini` can go cloud-brain path
  - `task.brain == ollama` forces local/no-cloud path
  - `task.tier == complex` prefers cloud if policy judge brain is not `ollama`
- Current durability shape:
  - JSONL checkpoint export/import only
  - enough for resumable local state
  - not a production-grade distributed durability substrate

### Graph / flow scaffold
- `shay-agent-os/components/swarm/swarm_graph.py`
- Holds explicit node/edge graph structure
- Current truth:
  - directional DAG concept is present
  - implementation is still scaffold-grade
  - `execute()` is stub-like and dispatches per node synchronously for demo purposes
  - it does not yet perform a true topological dependency walk with explicit parent-output passing

### Integration test surface
- `shay-agent-os/components/swarm/test_swarm.py`
- Current verification target for:
  - MessageBus
  - WorkerPool
  - GoalLoop
  - TrustMode
  - ErrorRecovery
  - full orchestrator path

## Current runtime architecture

### 1. Captain / orchestration shell
The swarm runtime is still built around a captain-first model.

Code truth:
- `SwarmOrchestrator` is the runtime shell
- trust gating happens before goal execution
- error recovery is downstream of worker/task failures
- direct asks and goal sessions both route through the same swarm substrate

Doctrine truth:
- brain lanes orchestrate, judge, synthesize
- worker lanes execute narrower tasks
- the captain should not waste premium reasoning on worker labor

### 2. Worker execution substrate
Current real execution substrate is still local-worker-pool-centered.

What exists now:
- `WorkerPool`-backed execution
- local Ollama support as the grounded baseline
- cloud-brain fallback/selection through `BrainChain`
- `LocalSwarmDispatcher` as the current dispatcher implementation

What does not exist yet as finished truth:
- a production-grade multi-host worker pool
- dynamic worker discovery beyond declared routing surfaces
- telemetry-backed cheapest-sufficient assignment for every task family

### 3. Trust and recovery shell
The runtime is not just a fanout toy.

What is load-bearing now:
- trust gating before action (`TrustMode`)
- recovery path after worker/task failure (`ErrorRecovery`)
- health/status reporting from the orchestrator shell

This means the current swarm is already more than “spawn N workers.” It is an orchestrated shell with policy and recovery surfaces, even if the scaling substrate is still partial.

## Current routing doctrine shared across Shay

Primary routing doctrine now lives in:
- `shay-shay/docs/agent-template-routing-matrix-2026-06-24.md`

### Agent classes currently defined
- Scout
- Builder
- Critic
- Reviewer
- Clerk
- Watcher
- Browser Operator
- Captain / Router

### Current lane defaults
These are doctrine defaults, not final measured truth:

- Scout
  - default: cheap
  - escalate: mid
- Builder
  - default: mid
  - escalate: premium
- Critic
  - default: mid
  - escalate: premium
- Reviewer
  - default: premium
  - never downgrade grounded review to cheap-only lanes
- Clerk
  - default: cheap
  - escalate: mid only on conflicting signals
- Watcher
  - default: cheap
  - escalate: mid for anomaly diagnosis
- Browser Operator
  - default: capability-first
  - use browser truth before prestige-model preference
- Captain / Router
  - default: cheap-to-mid orchestration depending on ambiguity and packet design

### Routing principles
The current routing matrix explicitly says:
1. default to the cheapest sufficient lane
2. do not downgrade grounded review below the level needed to cite artifacts
3. prefer capability-fit over prestige
4. escalate on contradiction / ambiguity collapse / repeated failed verification
5. browser/UI work is capability-first

## Capability-engine relationship

Shared dispatch doctrine from `CAPABILITY-ENGINE.md`:
- decompose -> check -> select -> log gaps -> build plan -> dispatch
- free > subscription > paid unless capability truth demands otherwise
- brain vs worker separation is mandatory
- capability gaps must be logged rather than hand-waved

This means the routing matrix and the swarm runtime are not separate ideas:
- swarm runtime = execution shell
- routing matrix = class-level dispatch doctrine
- capability engine = selection framework and gap discipline

## What is real vs partial right now

### Live / real enough to treat as current truth
- `SwarmOrchestrator` runtime shell exists
- `LocalSwarmDispatcher` exists
- trust gating exists
- recovery logic exists
- agent-class routing matrix exists
- benchmark packet seeds exist in `shay-shay/docs/benchmark-packets-wave-1-2026-06-24.yaml`
- route scorecard schema exists in `shay-shay/docs/route-scorecard-schema-2026-06-24.yaml`
- model-probe control-plane hooks exist in Shay CLI

### Partial / not yet production-proven
- `swarm_graph.py` is still scaffold-grade, not a full DAG executor
- task-to-model assignment is benchmark-seeded, not fully benchmark-backed
- route scorecards are schema-defined, but not yet the source of a broad measured-routing doctrine
- dynamic worker-pool scheduling is still an initial scorer/re-ranker story, not a finished autonomous worker-market
- the current local dispatcher checkpoint is resumable state, not industrial durability

## Maturity labels

Use these labels when talking about swarm logic:
- `policy-only` = concept/doctrine exists but little measurement
- `benchmark-seeded` = benchmark packets/schema/matrix exist
- `benchmark-backed` = repeated harness evidence exists
- `lane-proven` = live controller-path evidence exists for that lane
- `production-observed` = repeated real-run evidence exists
- `production-doctrine-approved` = Fritz reviewed and blessed the defaults

Current honest status:
- swarm runtime shell: lane-proven for local/runtime existence
- agent-class routing matrix: benchmark-seeded
- per-task best-model truth: partial, not benchmark-backed across the board
- production 300+/500+ swarm claim: not proven

## Older architecture docs that still matter

### `obsidian/Shay-Memory/post-review/swarm-architecture-2026-05-30.md`
This is the heavy comparative/rebuild spec.
Use it for:
- 500-agent architecture thinking
- dispatcher-protocol reasoning
- policy schema / scaling doctrine
- LangGraph vs Temporal vs greenfield reasoning

### `obsidian/Shay-Memory/post-review/shay-swarm-architecture-v4.md`
This is the tailored-swarm/Queen-and-workers blueprint.
Use it for:
- dynamic worker specialization
- skill injection model
- explicit directional communication flow
- synthesis-gate philosophy

These older docs are still conceptually relevant, but current runtime truth must yield to the actual code paths and current routing matrix when they disagree.

## Authority order for swarm truth

When swarm sources disagree, use this order:
1. Fritz's direct live instruction
2. current runtime code in `shay-agent-os/components/swarm/`
3. current Shay routing docs in `shay-shay/docs/`
4. current capability-engine / capability-matrix truth surfaces
5. older post-review architecture notes

## Verification path for this note

Grounding sources used for this consolidation:
- `shay-agent-os/components/swarm/swarm_orchestrator.py`
- `shay-agent-os/components/swarm/local_swarm_dispatcher.py`
- `shay-agent-os/components/swarm/swarm_graph.py`
- `shay-agent-os/components/swarm/test_swarm.py`
- `shay-shay/docs/agent-template-routing-matrix-2026-06-24.md`
- `obsidian/01-Shay-Platform/CAPABILITY-ENGINE.md`
- `obsidian/Shay-Memory/post-review/swarm-architecture-2026-05-30.md`
- `obsidian/Shay-Memory/post-review/shay-swarm-architecture-v4.md`

## Known gaps
- No single command yet emits this entire consolidated swarm-runtime truth automatically.
- `swarm_graph.py` is still a scaffold and should not be described as a finished DAG executor.
- The benchmark runner / scorecard reducer / lane audit command surfaces described in Shay docs are still next-wave work, not current runtime closure.
- Current route selection is stronger than before, but still not a fully measured cheapest-sufficient system for every class and task family.

## Session-use rule

When a future session asks:
- what swarm logic exists now
- whether the routing model is real yet
- where the current captain/worker split lives
- whether the current swarm is doctrine, code, or measured truth

Start with this note, then drill into the referenced code or routing docs as needed.
