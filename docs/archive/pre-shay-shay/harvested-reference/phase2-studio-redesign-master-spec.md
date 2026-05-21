<!--
Pre-Shay-Shay harvested reference
Source worktree: /Users/famtasticfritz/famtastic-convergence-dossier
Source branch: research/studio-intelligence-foundation-20260508
Source path: docs/process/FAMTASTIC-STUDIO-REDESIGN-MASTER-SPEC.md
Consolidation status: superseded-by-phase2-order-reference-only
Rule: reference only unless reconciled into the current Phase 2 plan.
-->

# FAMtastic Studio Redesign Master Spec

**Status:** planning/spec only
**Primary anchors:** [Research-Driven Build System Blueprint](FAMTASTIC-RESEARCH-DRIVEN-BUILD-SYSTEM-BLUEPRINT.md), [Development Convergence Dossier](FAMTASTIC-DEVELOPMENT-CONVERGENCE-DOSSIER.md)
**Purpose:** define the complete FAMtastic Studio product layout and operating model before implementation.

## Product Definition

FAMtastic Studio is a research-driven, operator-controlled, agent-powered website and product build system. It turns vague requests into researched, strategic, visually intentional, conversion-aware, launchable products while preserving proof, decisions, costs, capabilities, and reusable learning.

The product is not a dashboard, not a generic site generator, and not a pile of agent features. It is a production system with visible control surfaces and reusable intelligence.

## Preserved Build Order

1. Studio redesign/spec map.
2. MBSH V2 refinement/post-launch iteration.
3. Shipping company full build test.
4. FAMtastic logo/site pipeline use.

## Primary Navigation Model

The left nav should expose domains, not transient actions. Domains are stable homes for product intent.

Required domains:

- Mission Control
- Sites
- Research
- Recipes
- Media Studio
- Component Studio
- Assistants
- Shay
- Build Runs
- QA
- Deploy
- Learning
- Ops / Admin
- Settings

Shay must be visible/findable as a domain or home area. Bubble-only Shay is not acceptable.

## Domain Map

| Domain | Owns | Does not own |
| --- | --- | --- |
| Mission Control | what needs Fritz now, routing, run attention | raw logs, deep editing |
| Sites | project/site inventory, site state, page map entry | provider administration |
| Research | scans, insights, opportunity, positioning inputs | final recipe promotion |
| Recipes | recipe resolution, modules, lifecycle, capability requirements | direct code edits |
| Media Studio | prompt lineage, media registry, asset QA, Logo Lab, Video Lab | untracked page image drops |
| Component Studio | component creation, sandbox, proof, promotion candidates | whole-page rewrites |
| Assistants | public site assistants and character assistants | Shay's Studio-wide memory/work |
| Shay | Studio guide, tasks, memory, handoffs, desk, bubble, training | public site assistant scope |
| Build Runs | run control, ledger, trace, pass state | plan approval authority |
| QA | gates, failures, proof, readiness | hidden subjective signoff |
| Deploy | staging, production, links, rollback proof | DNS/payment decisions without approval |
| Learning | capture, retrieve, apply, verify, registry promotion | source workspace self-promotion |
| Ops / Admin | providers, jobs, queues, capability truth, secrets status, cost | product research decisions |
| Settings | user/org/app preferences | run-time approval queues |

## Screen Map

| Screen | Domain | Controls |
| --- | --- | --- |
| Mission Control | Mission Control | attention queue, run summary, blocked decisions |
| Project Intake | Sites | new project/site input |
| Brief Enhancer | Research | enhanced brief and assumptions |
| Research Screen | Research | scans, sources, insights |
| Recipe Composer | Recipes | base type, modules, lifecycle, recipe choice |
| Theme Contract | Recipes/Sites | tokens, typography, visual rules |
| Page Purpose Map | Sites | page jobs and CTAs |
| Scene Board | Sites/Component Studio | section architecture and scene sequence |
| Asset Board / Media Library | Media Studio | asset approval and usage |
| Media Studio | Media Studio | asset workflows, cleanup, variants |
| Logo Lab | Media Studio | logo concepts, usage tests, handoff |
| Video Lab | Media Studio | video prompt packets and manual provider flow |
| Component Studio | Component Studio | component creation/proof |
| Component Library | Component Studio | approved reusable components |
| Component Installer | Component Studio | slot-compatible installation |
| Character Board | Assistants | character assets and placement rules |
| Site Assistant Builder | Assistants | public site assistant configuration |
| Shay Home | Shay | tasks, memory, skills, settings, presence |
| Shay Bubble | Shay | ambient contextual help |
| Shay Desk | Shay | larger workbench, drafts, handoffs, proof |
| Build Run Control | Build Runs | pass execution and continuation |
| Build Ledger | Build Runs | human-readable run state |
| Build Trace | Build Runs | machine evidence |
| Approval Center | Mission Control/Ops | cross-system decisions |
| Capability Truth | Ops / Admin | provider/tool reality |
| Cost / Usage | Ops / Admin | estimates, spend, thresholds |
| QA Board | QA | readiness gates and failures |
| Deploy Center | Deploy | stage/prod/rollback |
| Learning Board | Learning | learning promotion and effectiveness |
| Ops Workspace | Ops / Admin | jobs, queues, provider health |
| Settings | Settings | preferences and configuration |

## User Flows

### New Build

```text
Project Intake -> Brief Enhancer -> Research Screen -> Recipe Composer
-> Full-Run Plan -> Media/Component planning -> Build Run Control
-> QA Board -> Deploy Center -> Learning Board
```

### Iteration Build

```text
Site -> Learning retrieval -> Page Purpose/Scene/Component review
-> slot-level mutation -> QA -> Deploy -> Learning capture
```

### Asset Build

```text
Research insight -> Prompt object -> Media Studio -> variants/QA
-> Media Library approval -> component binding -> slot injection
```

### Component Build

```text
Component Studio sandbox -> proof -> Component Library candidate
-> approval -> Component Installer -> QA -> usage history
```

## Data Ownership

| Data | Owner screen |
| --- | --- |
| enhanced brief | Brief Enhancer |
| research insights | Research Screen |
| recipe selection | Recipe Composer |
| theme contract | Theme Contract |
| page purpose | Page Purpose Map |
| section architecture | Scene Board |
| prompt objects | Research Screen / Media Studio |
| media assets | Media Library |
| components | Component Studio / Component Library |
| site assistants | Site Assistant Builder |
| Shay tasks/memory | Shay Home / Shay Desk |
| run state | Build Run Control / Build Ledger |
| evidence | Build Trace |
| approvals | Approval Center |
| capability status | Capability Truth |
| cost status | Cost / Usage |
| QA gates | QA Board |
| deploy proof | Deploy Center |
| learning promotion | Learning Board |

## Screen Control Boundaries

- Mission Control controls attention and routing; it must not become a log explorer.
- Research controls insight generation; it must not approve final recipes alone.
- Recipe Composer controls build recipe choice; it must not bypass Capability Truth.
- Media Studio controls assets; it must not inject unapproved assets directly into pages.
- Component Studio controls component creation/proof; it must not rewrite whole sites.
- Shay controls guidance, memory candidates, and handoffs; she must not replace public Site Assistant scope.
- Build Run Control controls execution within approved guardrails; it must not approve production by itself.
- Approval Center controls decisions; it must not hide decision context.
- Learning Board controls promotion; source workspaces nominate, they do not self-promote.

## System Fit

Mission Control shows what needs Fritz and routes to Run Control, Approval Center, QA, Deploy, or Shay Desk. Research and Recipe Composer create the plan inputs. Media Studio and Component Studio create reusable production units. Run Control executes with Build Ledger and Build Trace. QA and Deploy prove readiness. Learning Board captures and promotes what worked. Shay explains, guides, remembers, and hands off across all surfaces.

## Must Not Drift

- Do not turn Mission Control into a generic dashboard.
- Do not reduce Shay to a bubble.
- Do not start MBSH V2, shipping company, or logo work from this spec.
- Do not let source workspaces self-promote registry entries.
- Do not make capability config equal capability truth.
- Do not make simple builds generic.

## Acceptance Criteria

- Product definition is explicit.
- Navigation/domain model includes all required domains.
- Each major screen has a home and control boundary.
- Mission Control, Shay, Research, Recipe, Media, Component, Run Control, QA, Deploy, and Learning fit together.
- Preserved build order is stated.

## Not Yet / Out Of Scope

- No app code.
- No UI files.
- No route implementation.
- No schema implementation.
- No MBSH V2, shipping site, or logo execution.
