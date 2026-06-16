# FAMtastic Full-Run Plan Rule

**Status:** planning/spec only
**Primary anchor:** [FAMtastic Research-Driven Build System Blueprint](FAMTASTIC-RESEARCH-DRIVEN-BUILD-SYSTEM-BLUEPRINT.md)
**Purpose:** define that serious builds need full start-to-finish plans before execution.

## Rule

The full plan can be executed in passes, but all passes must be known before execution begins.

Phases are allowed. Piecemeal hidden planning is not allowed.

## What Piecemeal Means

Piecemeal means:

- writing only Phase 1 and forcing Fritz to ask for Phase 2 later
- hiding deploy, QA, proof, or learning work until after build work starts
- treating deferred items as memory instead of tracked backlog
- creating a plan that cannot answer what done proves

## Serious Build Plan Requirements

Every serious build must expose upfront:

- objective
- target level: local, staging MVP, production MVP, polished release, V2, maintenance
- phases/passes
- exit criteria per pass
- stop conditions
- continue conditions
- proof required per pass
- QA gates
- capability requirements
- cost estimate and threshold gates
- approval gates
- deferred/stub tracking
- closeout requirements
- learning capture target

## Run Execution

The orchestrator can continue when checks pass:

- pass exit criteria pass
- proof exists
- no stop condition triggers
- no Fritz-level decision is needed
- cost stays under approved threshold
- capability assumptions remain true
- scope stays inside plan

## Stop Conditions

Stop when:

- production deploy is next
- major visual/architecture/navigation decision needs Fritz
- projected cost exceeds threshold
- same task fails twice
- scope drifts
- proof is missing
- fallback materially weakens result
- destructive/secret/DNS/payment action is required

## Proof / Closeout

Every pass closeout includes:

- what changed
- what it fixes/adds/proves
- proof links
- QA results
- failures and resolutions
- deferred items
- learnings applied
- learnings captured
- next-pass recommendation

## Stubs And Deferred Items

All stubs/deferred items must be tracked with:

- owner
- reason
- fallback
- impact
- target pass
- blocking status
- proof required to close

## Must Not Drift

- Do not begin serious execution from a partial hidden plan.
- Do not let "we will figure out the rest later" become the plan.
- Do not claim completion without proof and closeout.
- Do not leave stubs outside the ledger.

## Acceptance Criteria

- A serious build can be reviewed from start to finish before work begins.
- Each pass can execute independently inside guardrails.
- Done means proof plus closeout, not only changed files.
- Fritz can answer what the plan proves without rereading the entire run.

## Not Yet / Out Of Scope

- No plan engine implementation.
- No plan registry mutation.
- No current build execution.
