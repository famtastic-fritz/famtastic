# FAMtastic Guarded Autonomous Build Run Contract

**Status:** planning/spec only
**Primary anchor:** [FAMtastic Research-Driven Build System Blueprint](FAMTASTIC-RESEARCH-DRIVEN-BUILD-SYSTEM-BLUEPRINT.md)
**Purpose:** define guarded-autonomous-to-completion.

## Contract

Guarded autonomous does not mean unsupervised. It means the orchestrator continues through approved passes until a defined stop condition triggers.

## Required Run Apparatus

- medium-brain orchestrator
- subagent delegation
- run ledger
- build trace
- coverage matrix
- decision log
- failure log
- deferred assets log
- pass closeouts
- stop conditions
- continue conditions
- cost gates
- capability gates
- Fritz approval gates
- final closeout

## Medium-Brain Orchestrator

The orchestrator owns continuity:

- keeps the plan and run state aligned
- delegates bounded work
- checks proof
- advances passes when guardrails allow
- pauses on stop conditions
- writes closeouts

Higher reasoning is reserved for expensive or irreversible decisions.

## Continue When

- exit criteria pass
- proof exists
- no stop condition triggers
- no Fritz-level decision is needed
- no scope drift occurs
- fallbacks are logged
- coverage matrix is updated

## Pause When

- production deploy is next
- major visual/architecture/navigation decision needs Fritz
- projected cost exceeds threshold
- same task fails twice
- scope drifts
- proof is missing
- fallback materially weakens result
- destructive/secret/DNS/payment action is required

## Cost Rule

Anything projected over $50 must alert Fritz and require explicit approval.

Cheap/local lanes are default. Premium generation must be justified by the plan and approved when it crosses threshold.

## Capability Gates

Capability Truth is checked before autonomous execution. A declared key or config value does not count as working capability without proof.

## Fritz Approval Gates

Approval is required for:

- production deploy
- DNS
- payment
- secrets
- destructive changes
- major visual/brand direction
- major architecture/navigation direction
- projected cost over $50
- fallback that weakens the agreed outcome

## Final Closeout

Final closeout answers:

- what shipped
- what was proven
- what remains
- what it fixed
- what it added
- what it taught Studio
- what should be promoted
- what should be parked

## Must Not Drift

- Do not use autonomy to hide decisions from Fritz.
- Do not pause for routine implementation details inside approved guardrails.
- Do not continue without proof.
- Do not spend over threshold without explicit approval.
- Do not let subagents duplicate each other.

## Acceptance Criteria

- Continue and pause conditions are explicit.
- Required logs are named.
- Cost and capability gates are mandatory.
- Final closeout captures proof and learning.

## Not Yet / Out Of Scope

- No autonomous runner implementation.
- No subagent orchestration code.
- No live build run.
