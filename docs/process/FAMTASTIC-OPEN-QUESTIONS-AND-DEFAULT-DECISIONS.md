# FAMtastic Open Questions And Default Decisions

**Status:** planning/spec only  
**Primary anchor:** [FAMtastic Research-Driven Build System Blueprint](FAMTASTIC-RESEARCH-DRIVEN-BUILD-SYSTEM-BLUEPRINT.md)  
**Purpose:** capture unresolved questions and default decisions so the next chat/agent does not drift.

## Resolved User Decisions

- Shay gets visible/findable presence.
- Fully map Studio redesign/spec first.
- MBSH V2 refinement second.
- Shipping company full build test third.
- Logo/site waits until pipeline is ready.
- $50+ cost alert/approval.

## Recommended Defaults

- Component Studio spec now, implementation later.
- Logo Lab conceptually important, execution later.
- Video Lab planning/manual prompt packet until proven.
- Learning Board owns registry promotion; source workspaces nominate.
- Product Vision Protection Pass required.
- Capability Truth required before autonomous execution.
- Shipping site is not first; it follows Studio mapping and MBSH refinement.

## Still-Open Items

| Open item | Default until changed |
| --- | --- |
| Exact left-nav placement/name for Shay | Visible Shay domain/home or equivalent findable nav presence |
| Exact cost UI design | Cost / Usage panel plus Approval Center gate |
| Exact component object schema | Use Component Studio metadata fields as draft schema |
| Exact registry promotion workflow | Source nominates, Learning Board approves |
| Exact Plan Mode data model integration | Plan Mode approves full plan, Run Control executes guardrails |
| Exact Media Library storage schema | Registry object first; storage path and variants attached |

## Questions To Resolve Before Implementation

1. Should Shay be a primary nav domain, a persistent top-level home, or a domain inside an assistant area?
2. What is the first UI artifact for cost governance: run estimate, provider panel, or approval queue?
3. Which component schema format should become canonical: YAML-like docs, JSON schema, or database model?
4. Which registry gets built first: Recipe, Component, Media, Capability, or Learning?
5. How should Plan Mode persist approved guardrails into Run Control?
6. Where should media binaries live relative to metadata and proof?

## Recommended Next Chat Handoff

Next chat should not start code. It should produce the Studio redesign/spec map:

- left nav and domain map
- Mission Control screen contract
- Shay Home/Desk/Bubble placement
- Media Studio screens
- Component Studio screens
- Recipe Composer and Research flow
- Run Control and Approval Center flow
- Learning Board promotion flow

## Must Not Drift

- Do not start shipping company before Studio mapping and MBSH refinement.
- Do not start logo/site work before Media Studio and proof flows are ready.
- Do not turn unresolved questions into silent implementation assumptions.
- Do not forget that visible Shay presence is now locked.

## Acceptance Criteria

- Resolved decisions are easy to find.
- Defaults prevent next-agent drift.
- Open questions are explicit.
- Recommended handoff keeps implementation paused.

## Not Yet / Out Of Scope

- No decisions are implemented here.
- No registry is modified.
- No UI is created.
