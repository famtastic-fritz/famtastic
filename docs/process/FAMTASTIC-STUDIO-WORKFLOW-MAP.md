# FAMtastic Studio Workflow Map

**Status:** planning/spec only
**Primary anchors:** [Research-Driven Build System Blueprint](FAMTASTIC-RESEARCH-DRIVEN-BUILD-SYSTEM-BLUEPRINT.md), [Development Convergence Dossier](FAMTASTIC-DEVELOPMENT-CONVERGENCE-DOSSIER.md)
**Purpose:** map full workflows across redesigned Studio screens.

## A. New Site From Vague Brief

- Start trigger: Fritz/client enters a rough request.
- Screens involved: Project Intake, Brief Enhancer, Research Screen, Recipe Composer, Full-Run Plan, Build Run Control.
- Data created: Project, Site, enhanced brief, assumptions, research tasks, recipe request.
- Agents/skills involved: brief enhancer, research strategist, recipe classifier.
- Stop conditions: missing core business facts, cost over threshold, unclear launch target.
- Approval points: enhanced brief, recipe, full-run plan, spend over $50.
- Proof required: enhanced brief diff, research summary, recipe decision log.
- Output artifact: approved build plan ready for guarded execution.

## B. Research-Driven Prompt Generation

- Start trigger: approved research insight or asset need.
- Screens involved: Research Screen, Prompt Registry, Media Studio, Media Library.
- Data created: Prompt Object, research basis, generation attempts, critique deltas.
- Agents/skills involved: research strategist, prompt critic, visual direction generator.
- Stop conditions: weak research basis, unapproved cost, provider unavailable.
- Approval points: prompt object for major brand/hero assets, cost over $50.
- Proof required: source links, prompt object, candidate comparison.
- Output artifact: approved prompt object or regeneration plan.

## C. Dynamic Recipe Resolution

- Start trigger: enhanced brief reaches Recipe Composer.
- Screens involved: Recipe Composer, Capability Truth, Cost / Usage, QA Board.
- Data created: recipe request, fingerprint, match scores, module compatibility result.
- Agents/skills involved: recipe classifier, conversion strategist, capability auditor.
- Stop conditions: no compatible recipe, required capability broken, high-cost module.
- Approval points: new recipe, hybrid recipe, premium lane.
- Proof required: resolver decision log and attached QA/capability gates.
- Output artifact: selected recipe bound to capabilities and QA gates.

## D. Asset Generation And Approval

- Start trigger: recipe/page/scene requires media.
- Screens involved: Media Studio, Asset Board / Media Library, Capability Truth, Cost / Usage.
- Data created: media asset, variants, QA results, usage rules.
- Agents/skills involved: asset director, visual QA critic, prompt regenerator.
- Stop conditions: provider failure, dirty alpha, poor crop, cost over threshold.
- Approval points: generated asset approval, paid generation, brand-level media.
- Proof required: contact sheet, QA checks, approved variants.
- Output artifact: approved media asset ready for component binding.

## E. Component Creation And Promotion

- Start trigger: missing reusable component or candidate pattern.
- Screens involved: Component Studio, Component Library, QA Board, Learning Board.
- Data created: component metadata, sandbox proof, variant list, promotion candidate.
- Agents/skills involved: UX specialist, visual QA critic, component planner.
- Stop conditions: no proof, slot incompatibility, accessibility failure.
- Approval points: library promotion, major visual component.
- Proof required: sandbox, responsive proof, accessibility proof, fallback.
- Output artifact: approved library component or parked candidate.

## F. Component / Slot Injection

- Start trigger: page/site slot needs replacement or enhancement.
- Screens involved: Scene Board, Component Installer, Media Library, QA Board.
- Data created: install record, slot binding, proof link.
- Agents/skills involved: component replacement planner, QA verifier.
- Stop conditions: slot mismatch, missing required data/assets, weak fallback.
- Approval points: major layout/navigation change.
- Proof required: before/after, targeted QA, usage record.
- Output artifact: installed component with rollback/fallback.

## G. Long-Running Build Execution

- Start trigger: approved full-run plan.
- Screens involved: Build Run Control, Build Ledger, Build Trace, Approval Center, QA Board, Deploy Center, Learning Board.
- Data created: Build Run, Passes, Agent Reports, Decisions, Failures, Closeouts.
- Agents/skills involved: medium-brain orchestrator, scoped subagents, verifiers.
- Stop conditions: production deploy next, major decision, cost over $50, same task fails twice, proof missing, scope drift.
- Approval points: stop-condition items and pass gates.
- Proof required: pass closeout, trace evidence, QA proof.
- Output artifact: completed run or paused run with clear resume contract.

## H. MBSH V2 Post-Launch Iteration

- Start trigger: after Studio redesign/spec review.
- Screens involved: Sites, Learning Board, Scene Board, Component Studio, Media Studio, QA, Deploy.
- Data created: V2 iteration plan, pattern reuse list, component/asset deltas.
- Agents/skills involved: learning curator, UX/visual QA, component planner.
- Stop conditions: attempting to rebuild instead of iterate, missing V2 scope, production approval needed.
- Approval points: major visual changes, production deploy.
- Proof required: before/after, applied MBSH learnings, regression QA.
- Output artifact: refined live-site iteration and Studio learning proof.

## I. Shipping Company Full-Build Test

- Start trigger: after Studio map and MBSH V2 refinement.
- Screens involved: Project Intake, Research, Recipe Composer, Media Studio, Component Studio, Build Runs, QA, Deploy, Learning.
- Data created: local-business recipe proof, research-to-prompt chain, conversion flow.
- Agents/skills involved: research strategist, conversion strategist, recipe classifier, asset director.
- Stop conditions: starting before prerequisites, missing business facts, capability gaps.
- Approval points: full-run plan, cost over $50, production deploy.
- Proof required: research, recipe decision, prompt objects, staging QA, learning capture.
- Output artifact: first end-to-end build test of the redesigned Studio pipeline.

## J. Logo Lab Future Workflow

- Start trigger: pipeline has Media Studio, Brand Kit, prompt objects, asset registry, usage tests.
- Screens involved: Logo Lab, Brand Kit, Media Studio, Adobe Handoff, QA.
- Data created: logo brief, concepts, variants, vector pass, usage tests.
- Agents/skills involved: creative director, visual QA, brand critic.
- Stop conditions: pipeline not ready, brand direction unclear, paid tool approval needed.
- Approval points: concept direction, final mark, paid tool use.
- Proof required: lockup comparison, usage tests, handoff packet.
- Output artifact: approved logo/brand asset set.

## K. Learning Capture -> Registry Promotion

- Start trigger: pass closeout, launch closeout, audit finding, or repeated pattern.
- Screens involved: Build Ledger, Build Trace, Learning Board, relevant source workspace.
- Data created: Learning, promotion candidate, effectiveness evidence, registry entry.
- Agents/skills involved: learning extractor, curator, verifier.
- Stop conditions: no proof, no reuse case, source workspace self-promotion.
- Approval points: promotion to registry, deprecation of old pattern.
- Proof required: captured, retrieved, applied, verified signal.
- Output artifact: promoted registry entry or parked learning.

## Must Not Drift

- Do not start downstream workflows before the preserved build order allows them.
- Do not treat workflows as isolated silos.
- Do not bypass approvals for cost, production, DNS, payment, secrets, or destructive work.
- Do not capture learning without retrieval/application/verification path.

## Acceptance Criteria

- Workflows A through K are present.
- Each workflow includes trigger, screens, data, agents/skills, stops, approvals, proof, and output.
- MBSH V2, shipping company, and logo workflows remain sequenced after Studio mapping.

## Not Yet / Out Of Scope

- No workflow automation.
- No build execution.
- No site launch.
- No logo execution.
