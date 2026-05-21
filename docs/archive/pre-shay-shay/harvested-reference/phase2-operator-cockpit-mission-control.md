<!--
Pre-Shay-Shay harvested reference
Source worktree: /Users/famtasticfritz/famtastic-convergence-dossier
Source branch: research/studio-intelligence-foundation-20260508
Source path: docs/process/FAMTASTIC-OPERATOR-COCKPIT-AND-MISSION-CONTROL-SPEC.md
Consolidation status: reference-later-phase
Rule: reference only unless reconciled into the current Phase 2 plan.
-->

# FAMtastic Operator Cockpit And Mission Control Spec

**Status:** planning/spec only
**Primary anchor:** [FAMtastic Research-Driven Build System Blueprint](FAMTASTIC-RESEARCH-DRIVEN-BUILD-SYSTEM-BLUEPRINT.md)
**Purpose:** clarify operator/control terminology and screens.

## Operator Cockpit

Operator Cockpit is the umbrella control experience, not a route.

It describes the total experience of running the FAMtastic empire from one operator seat:

- Mission Control
- Run Control
- Approval Center
- Ops Workspace
- Build Ledger
- Build Trace
- Capability Truth
- Cost / Usage
- Shay guidance

## Mission Control

Mission Control is the landing/control screen answering:

```text
What needs Fritz right now?
```

Mission Control should show:

- blocked approvals
- runs that need attention
- runs that are continuing cleanly
- production/staging decisions waiting
- cost or capability gates
- recent shipments

Mission Control routes users to the right workspace. It should not become every workspace.

## Ops Workspace

Ops Workspace handles technical/admin operations:

- jobs
- queues
- health
- freshness
- deploy targets
- secrets
- provider health
- capability probes

## Approval Center

Approval Center is the cross-system queue for decisions:

- production deploys
- costly actions
- DNS
- payment
- secrets
- destructive changes
- brand decisions
- hard stops

## Capability Truth Layer

Capability Truth Layer is the substrate/data layer for what works.

It stores:

- status
- last probe
- last error
- proof reference
- cost tier
- fallback
- approval requirement

## Cost / Usage Governance

Cost / Usage Governance includes:

- visible cost
- cheap lane default
- $50+ alert/approval
- provider health
- build-minute guards
- media/API/video gates

## Build Run Control

Build Run Control controls long-running build state:

- current pass
- pass status
- stop/continue state
- proof state
- next action
- blockers
- handoff status

## Build Trace

Build Trace is machine-level evidence:

- prompts
- files
- commands
- tests
- outputs
- screenshots
- proof packets

## Must Not Drift

- Do not build a generic dashboard.
- Mission Control should show what needs Fritz, not every log.
- Operator Cockpit is not a left-nav item by itself.
- Ops Workspace is technical/admin; Approval Center is decisions.
- Capability Truth is data, not just UI.

## Acceptance Criteria

- Operator Cockpit, Mission Control, Ops Workspace, Approval Center, Capability Truth, Cost, Run Control, and Build Trace have separate definitions.
- Mission Control has a clear job.
- Decision queue ownership is explicit.
- Technical operations are not mixed with product guidance.

## Not Yet / Out Of Scope

- No dashboard implementation.
- No route selection.
- No UI layout.
- No telemetry implementation.
