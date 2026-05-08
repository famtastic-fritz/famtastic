# FAMtastic Plan Mode Run Control Reconciliation

**Status:** planning/spec only
**Primary anchor:** [FAMtastic Research-Driven Build System Blueprint](FAMTASTIC-RESEARCH-DRIVEN-BUILD-SYSTEM-BLUEPRINT.md)
**Purpose:** reconcile Plan Mode, Full-Run Plan Rule, Build Ledger, Run Control, and agent execution.

## Core Distinction

Plan Mode is not the same as Run Control.

Plan approval does not mean production approval.

Run Control can continue across passes only inside approved guardrails.

## Responsibilities

| Layer | Responsibility |
| --- | --- |
| Plan Mode | creates/approves the plan |
| Full-Run Plan Rule | requires full start-to-finish plan upfront |
| Run Control | executes/monitors the plan |
| Build Ledger | human-readable state |
| Build Trace | machine evidence |
| Orchestrator | manages continuation |
| Approval Center | handles blocked decisions |
| Learning Board | captures after-action lessons |

## Flow

```text
Plan Mode drafts full run
-> Fritz approves plan guardrails
-> Run Control starts pass
-> Orchestrator executes or delegates
-> Build Trace records evidence
-> Build Ledger summarizes human state
-> Approval Center handles stop decisions
-> pass closeout captures proof
-> Learning Board captures/promotes lessons
```

## Approval Levels

Plan approval allows work inside the plan. It does not automatically approve:

- production deploy
- DNS changes
- payment actions
- destructive actions
- secrets actions
- cost over $50
- major brand/navigation/architecture decisions

## Build Ledger

Build Ledger is human-readable:

- current pass
- status
- completed work
- blockers
- proof links
- decisions
- next action

## Build Trace

Build Trace is evidence:

- prompts
- commands
- files
- screenshots
- tests
- outputs
- proof artifacts

## Orchestrator

The orchestrator:

- follows approved plan
- updates ledger
- checks stop/continue conditions
- delegates scoped tasks
- prevents duplicate work
- pauses when guardrails require Fritz

## Learning Board

Learning Board receives:

- pass closeout lessons
- reusable patterns
- QA gate candidates
- component promotion candidates
- recipe promotion candidates
- failed assumptions

## Must Not Drift

- Do not treat Plan Mode as execution.
- Do not treat plan approval as production approval.
- Do not let Build Trace replace human-readable ledger.
- Do not let closeouts skip learning capture.

## Acceptance Criteria

- Plan approval and production approval are separate.
- Run Control has clear authority and limits.
- Build Ledger and Build Trace have separate jobs.
- Learning Board gets after-action inputs.

## Not Yet / Out Of Scope

- No Plan Mode schema work.
- No Run Control implementation.
- No orchestration code.
