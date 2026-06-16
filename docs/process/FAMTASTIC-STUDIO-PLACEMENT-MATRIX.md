# FAMtastic Studio Placement Matrix

**Status:** planning/spec only
**Primary anchor:** [FAMtastic Research-Driven Build System Blueprint](FAMTASTIC-RESEARCH-DRIVEN-BUILD-SYSTEM-BLUEPRINT.md)
**Purpose:** define where each concept belongs in Studio so logic does not float around without a visible home.

## Placement Principles

Operator Cockpit is an umbrella experience, not a single route. Mission Control is the landing/control screen. Ops Workspace is technical/admin operations. Approval Center is the decision queue.

Logic becomes useful when it has a place, an owner, a user action, a registry relationship, and a QA relationship.

## Matrix

| Concept | Primary screen/workspace | Secondary screen/workspace | Data owned | User actions | Related registry | Related QA gates |
| --- | --- | --- | --- | --- | --- | --- |
| Research logic | Research Screen | Project Intake | research notes, source links, insight candidates | run scan, approve insights, mark gaps | Research Registry, Learning Registry | research completeness, source quality |
| Brief enhancement | Project Intake / Brief Enhancer | Research Screen | enhanced brief, questions, assumptions | answer high-value questions, approve enhanced brief | Brief Registry, Decision Registry | brief clarity, missing-input gate |
| Recipe logic | Recipe Composer | Build Mode | recipe request, selected recipe, module list | choose build type, approve modules | Recipe Registry | recipe compatibility gate |
| Dynamic recipe resolution | Recipe Composer + Recipe Registry | Learning Board | fingerprints, similarity scores, compatibility results | reuse, extend, hybridize, create new | Recipe Registry, Pattern Registry | recipe reuse gate |
| Theme rules | Theme Contract | Preview Board | tokens, typography, color, motion rules | approve or revise theme contract | Theme Registry | theme consistency gate |
| Page purpose | Page Purpose Map | Scene Board | page jobs, CTAs, user intent | approve page purpose, flag missing pages | Page Pattern Registry | page purpose gate |
| Section architecture | Scene Board | Component Studio | section archetypes, page sequence | approve scene order, replace section type | Section Registry, Component Registry | section archetype gate |
| Component injection | Component Studio + Component Installer | Scene Board | component contracts, install records | choose slot, preview install, approve injection | Component Registry | slot compatibility, visual QA |
| Component approval | Component Library | Component Studio | approved component metadata and proof | approve, reject, deprecate, create variant | Component Registry | component proof gate |
| Media asset approval | Media Library / Asset Board | Media Studio | media asset objects, variants, QA status | inspect, clean, approve, retire | Media Registry | alpha, crop, compression, contrast |
| Prompt objects | Research / Prompt Registry / Media Library | Recipe Composer | prompt object lineage, attempts, critique deltas | approve prompt, regenerate, bind to asset | Prompt Registry, Media Registry | prompt basis, asset QA |
| Run control | Build Ledger / Run Control | Mission Control | phases, passes, stop conditions, pass status | start, pause, resume, approve next gate | Plan Registry, Run Registry | pass closeout, proof gate |
| Agent trace | Build Trace | Run Control | prompts, commands, files, outputs, proofs | inspect trace, attach proof, escalate failure | Trace Registry | evidence completeness |
| Approvals | Approval Center | Mission Control | decision queue, blocked actions, approval records | approve, reject, defer, request info | Decision Registry | approval completeness gate |
| Capability truth | Capability Truth Layer | Ops Workspace | provider/tool status, probes, proof refs | probe, mark fallback, resolve blocker | Capability Registry | capability proof gate |
| Cost governance | Cost / Usage panel + Approval Center | Mission Control | estimates, actuals, thresholds, cost events | approve spend, choose cheap/premium lane | Cost Registry, Capability Registry | cost threshold gate |
| Learning promotion | Learning Board | Build Closeout | captured lessons, applied learnings, effectiveness | promote, park, reject, request proof | Learning Registry, Pattern Registry | learning effectiveness gate |
| Registry promotion | Learning Board | source workspaces nominate | candidate patterns, promotion decisions | approve reusable pattern, create variant | All registries | promotion proof gate |
| Shay | Shay Home/Domain + Bubble + Desk | Mission Control | Shay tasks, memory candidates, handoffs, settings | ask, review, train, approve memory, manage handoff | Shay Memory, Skill Registry | handoff clarity, memory approval |
| Site Assistant | Site Assistant Builder | Component Studio | site-specific assistant config, FAQ, actions | configure public assistant, test answers | Component Registry, Site Assistant Registry | assistant scope and safety gate |
| Deploy | Deploy Center | Mission Control | environments, links, release proof, rollback data | stage, promote, rollback, inspect deploy | Deploy Registry | deploy readiness, smoke gate |
| QA gates | QA Board | Preview Board | gate status, failures, proof links | run QA, accept risk, create blocker | QA Gate Registry | all registered gates |
| Ops health | Ops Workspace | Mission Control | jobs, queues, secrets status, freshness, provider health | inspect, retry, repair, escalate | Capability Registry, Job Registry | ops health gate |

## Mission Control

Mission Control answers: what needs Fritz right now?

It should show:

- blocked approvals
- active runs that are healthy
- active runs that need attention
- recent shipments
- cost or capability gates that need a decision

It should route to the right workspace rather than becoming the workspace.

## Ops Workspace

Ops Workspace owns technical/admin operations:

- jobs
- queues
- provider health
- deploy targets
- secrets status
- freshness checks
- capability probes
- cost telemetry

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

## Must Not Drift

- Do not build a generic dashboard.
- Do not hide Shay inside only a bubble.
- Do not let approvals live inline inside individual tools when they affect cost, DNS, payment, production, secrets, or destructive actions.
- Do not let source workspaces self-promote registry entries without Learning Board review.

## Acceptance Criteria

- Every listed concept has a primary home.
- Mission Control, Ops Workspace, and Approval Center have separate responsibilities.
- Shay has visible home/domain presence.
- Site Assistant is clearly separate from Shay.
- Registry and QA relationships are named.

## Not Yet / Out Of Scope

- No routes are created here.
- No UI layout is implemented here.
- No registry schema is updated here.
