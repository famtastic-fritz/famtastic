# FAMtastic Development Convergence Dossier

**Status:** planning/spec only
**Primary anchor:** [FAMtastic Research-Driven Build System Blueprint](FAMTASTIC-RESEARCH-DRIVEN-BUILD-SYSTEM-BLUEPRINT.md)
**Purpose:** merge the research-driven build-system session with the platform refresh, operator cockpit, Shay, component, media, and long-running build lessons into one no-drift planning source.

## Executive Summary

FAMtastic Studio is a research-driven, operator-controlled, agent-powered website and product build system.

The first session established the law: every build starts with intelligence. The second session added the missing control mechanics: long-running run control, capability truth, cost governance, component and media lifecycles, Shay presence, and an operator surface that lets Fritz direct many builds without losing proof or decisions.

The combined system is not a generic website builder and not a generic dashboard. It is a production engine where research, strategy, prompts, assets, components, build runs, QA, deploys, and learning are visible, governed, and reusable.

## Shared Core

Both sessions point at the same product truth:

- Simple does not mean generic.
- The client brief is the starting point, not the ceiling.
- Build type controls scope, depth, module count, and polish level, not whether intelligence applies.
- Every build should leave reusable learning behind.
- Work should be visible enough for Fritz to approve decisions without reading raw code.
- Plans, runs, proof, failures, deferred items, and learnings must survive the chat that created them.

## Research-Driven Build System Contribution

The research-driven blueprint contributes the intelligence spine:

- Brief enhancement before building.
- Research before prompt generation.
- Opportunity finding and positioning as first-class build steps.
- Flexible recipes instead of rigid templates.
- Prompt objects with research basis, target customer, composition, visual style, negative constraints, and generation attempts.
- QA gates tied to launch readiness.
- A learning loop that captures, retrieves, applies, and verifies lessons across builds.

## Platform / Operator / Shay / Component Contribution

The platform refresh contribution supplies the control system:

- Operator Cockpit as the umbrella control experience.
- Mission Control as the landing/control screen answering what needs Fritz now.
- Run Control and Build Ledger for long-running work.
- Build Trace for evidence: prompts, files, commands, tests, outputs, and proof.
- Approval Center for decisions that cannot be hidden inside automation.
- Capability Truth Layer for honest status of tools, providers, costs, and fallbacks.
- Cost governance with cheap/local lanes by default and explicit approval for projected spend over $50.
- Component Studio, Component Library, and Component Installer.
- Media Library as an active asset registry, not storage.
- Shay as a findable Studio-wide assistant domain/home plus bubble and desk.

## Final Combined Product Definition

FAMtastic Studio turns vague requests into researched, strategic, visually intentional, conversion-aware, launchable products. It does this through a governed production loop:

```text
brief -> enhanced brief -> research -> opportunity -> positioning
-> recipe -> full-run plan -> prompt intelligence -> media/assets
-> component binding -> slot injection -> build run -> QA
-> staging -> production -> proof -> learning capture
```

## Final Canonical Architecture

### 1. Intelligence Layer

- research
- opportunity finding
- positioning
- recipes
- prompts
- learning

### 2. Control Layer

- Mission Control
- Approval Center
- Build Run Control
- Capability Truth
- Cost / usage
- Ops Workspace

### 3. Creation Layer

- Media Studio
- Component Studio
- Site Builder
- Logo Lab
- Character / Assistant tools

### 4. Guide Layer

- Shay Bubble
- Shay Desk
- Shay Domain/Home
- task guidance
- explanation
- handoff

## Final Workstream Map

| Workstream | Owns | Output |
| --- | --- | --- |
| Studio Redesign Spec | screens, workflows, placement, rules | complete map before implementation |
| Recipe Resolver | flexible recipes and compatibility | full-run plan inputs |
| Run Control | guarded autonomous execution | ledger, trace, stop/continue state |
| Capability Truth | provider/tool reality | status, proof, fallbacks, approvals |
| Cost Governance | spend visibility | estimates, thresholds, approval gates |
| Media Studio | assets and prompt lineage | approved media assets and variants |
| Component Studio | component lifecycle | proofed library components |
| Shay Domain | guide layer and memory/task presence | visible assistant home, bubble, desk |
| Learning Loop | capture/retrieve/apply/verify | promoted patterns and effectiveness evidence |
| Deploy Center | stage/prod transition | release proof and rollback path |

## Conflicts / Drift Risks

- Shay placement drift: platform-refresh v2 said Shay is ambient and not a left-nav domain. Current user decision overrides that: Shay must be visible/findable through a domain/home or equivalent navigation presence.
- Dashboard drift: Mission Control can become a generic log wall. It must answer what needs Fritz now.
- Infrastructure drift: capability truth, cost, and run ledgers can bury the product vision. Infrastructure exists to serve Studio.
- Template drift: recipes can collapse back into rigid site types. Recipes must stay modular and intelligence-backed.
- Media drift: generated images can be dropped directly into pages. Media must be registered, QA'd, approved, and bound.
- Component drift: whole-page rewrites can replace slot-level mutation. Component-aware edits are the default.

## User Decisions Now Locked

- Shay must be findable and visibly present in Studio, not only a floating bubble.
- Fully map the redesigned FAMtastic Studio first.
- Use MBSH V2 second to refine post-launch iteration.
- Use the shipping company site third as the first full end-to-end build test.
- Wait on FAMtastic logo/site execution until the pipeline can support serious media, brand, proof, and usage flows.
- All cost must be visible.
- Anything projected over $50 must alert Fritz and require explicit approval.
- Cheap/local lanes remain default.

## Open Questions And Recommended Defaults

| Question | Recommended default |
| --- | --- |
| Exact Shay nav label | "Shay" as a visible domain/home, with Bubble and Desk as surfaces under it |
| Exact cost UI | Cost / Usage panel plus Approval Center cost gate |
| Exact component schema | Start with the lifecycle metadata in the Component Studio spec |
| Registry promotion ownership | Learning Board owns final promotion; source workspaces nominate |
| Plan Mode data model | Plan Mode approves; Run Control executes within guardrails |
| Media storage schema | Asset Registry object first; physical storage path second |

## What Must Not Be Lost

- FAMtastic definition anchor.
- Every build starts with intelligence.
- Simple does not mean generic.
- Flexible recipes, not rigid templates.
- Full-run planning before serious execution.
- Guarded autonomy with stop conditions.
- Proof for every pass.
- MBSH learnings as real test data.
- Shay as a visible Studio-wide work partner.
- Component and media lifecycle discipline.

## What Must Not Be Built Yet

- Do not start shipping company build.
- Do not start MBSH V2.
- Do not start FAMtastic logo execution.
- Do not implement Studio UI from this packet.
- Do not register new plans or mutate registries from this packet.
- Do not rewrite existing docs destructively.

## Suggested Execution Order

1. Fully map Studio redesign/spec first.
2. Use MBSH V2 for refinement/post-launch iteration.
3. Use shipping company as full build test.
4. Use matured pipeline for FAMtastic logo/site work.

## Must Not Drift

This dossier is the convergence layer. Future work should update this set when product-control decisions change, not create another parallel naming system.

## Acceptance Criteria

- The combined product definition is explicit.
- The four-layer architecture is captured.
- User decisions are locked.
- Shay placement conflict is recorded.
- Execution order is clear.
- No implementation work is implied as already approved.

## Not Yet / Out Of Scope

- No code changes.
- No UI implementation.
- No plan registry edits.
- No provider setup.
- No build/test-site execution.
