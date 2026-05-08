# FAMtastic Studio Object Model Sketch

**Status:** planning/spec only
**Primary anchors:** [Research-Driven Build System Blueprint](FAMTASTIC-RESEARCH-DRIVEN-BUILD-SYSTEM-BLUEPRINT.md), [Development Convergence Dossier](FAMTASTIC-DEVELOPMENT-CONVERGENCE-DOSSIER.md)
**Purpose:** sketch the main object types without implementing schema.

## Object Model Table

| Object | ID example | Purpose | Key fields | Relationships | Owner screen | Lifecycle states |
| --- | --- | --- | --- | --- | --- | --- |
| Project | project.shipping_bahamas | business/client initiative | name, owner, goal, target level, constraints | has Sites, Research, Build Runs | Project Intake / Sites | draft, active, paused, shipped, archived |
| Site | site.mbsh_reunion | deployable site/product | slug, repo, environments, domain, status | belongs to Project, has Pages | Sites | local, staging, production, maintenance, retired |
| Page | page.home | route/page unit | title, path, purpose, CTA, sections | belongs to Site, has Sections | Page Purpose Map | planned, drafted, built, QA, shipped |
| Section | section.home.hero | page section | archetype, goal, slots, content, component refs | belongs to Page, has Slots | Scene Board | planned, candidate, built, approved, replaced |
| Slot | slot.home.hero.visual | addressable insertion point | name, allowed types, current component/media, fallback | belongs to Section/Site, accepts Component/Media | Scene Board / Component Installer | empty, filled, candidate, approved, deprecated |
| Component | component.footer.final_reel | reusable UI/function unit | type, version, props, assets, dependencies, QA gates | uses Media, installs into Slots | Component Studio | local, candidate, sandboxed, proofed, approved, installed, deprecated |
| Media Asset | media.shipping_hero_pickup_01 | approved/trackable asset | type, source, variants, QA, allowed slots, usage | from Prompt Object, used by Components/Slots | Media Library | draft, generated, candidate, approved, rejected, retired |
| Prompt Object | prompt.hero_pickup_scene | structured generation instruction | research basis, composition, negative constraints, attempts | creates Media Assets, cites Research | Research / Media Studio | draft, approved, attempted, revised, retired |
| Recipe | recipe.local_service_conversion | reusable build strategy | base type, modules, polish, lifecycle, gates | uses Capabilities, QA Gates, Learnings | Recipe Composer | draft, candidate, approved, active, deprecated |
| Capability | capability.media.gemini | proven tool/provider capability | status, probe, cost tier, fallback, proof | required by Recipes/Runs | Capability Truth | working, partial, stubbed, broken, manual_only, costly, approval_required |
| Build Run | run.mbsh_v2_p01 | execution container | objective, plan, status, cost, current pass | has Passes, Trace, Ledger, Approvals | Build Run Control | planned, running, paused, blocked, completed, failed |
| Pass | pass.p03_assets | scoped run phase | objective, exit criteria, proof, status | belongs to Build Run, has Agent Reports | Build Ledger | queued, running, proofing, closed, blocked |
| Agent Report | agent_report.visual_qa_001 | delegated work result | scope, findings, files, proof, risks | belongs to Pass/Build Run | Build Trace | assigned, running, returned, accepted, rejected |
| QA Gate | qa.media.alpha | readiness check | target, criteria, result, proof | binds to Recipe, Component, Media, Deploy | QA Board | pending, pass, fail, waived, retired |
| Approval | approval.cost_001 | explicit user decision | action, risk, cost, status, approver, proof | blocks Runs/Deploy/Cost actions | Approval Center | requested, approved, rejected, deferred, expired |
| Learning | learning.final_reel_footer | captured reusable lesson | source, pattern, evidence, applicability, effectiveness | nominates Registry Entry | Learning Board | captured, retrieved, applied, verified, promoted, parked |
| Registry Entry | registry.component.footer.final_reel | reusable promoted pattern/object | type, version, owner, proof, deprecation | created from Learning/Component/Recipe/Media | Learning Board | candidate, approved, active, deprecated |
| Shay Task | shay_task.review_run_blocker | Studio assistant work item | prompt, context, status, output, handoff | relates to Runs, Approvals, Memory | Shay Home / Shay Desk | queued, active, waiting, done, archived |
| Site Assistant | site_assistant.harry | public site assistant config | persona, FAQ, actions, fallback, scope | installed as Component on Site | Site Assistant Builder | draft, tested, approved, installed, retired |

## Relationship Notes

- Projects contain Sites.
- Sites contain Pages, site-level Slots, Deploy targets, and Site Assistants.
- Pages contain Sections; Sections contain Slots.
- Components install into Slots and may require Media Assets.
- Media Assets come from Prompt Objects and must pass QA.
- Recipes bind Capabilities, QA Gates, Learnings, and Run plan defaults.
- Build Runs execute Recipes through Passes.
- Build Trace stores Agent Reports and evidence.
- Learning Board promotes verified Learnings into Registry Entries.
- Shay Tasks can reference any object but do not replace object ownership.

## Lifecycle Principles

- "Exists" is not the same as "approved."
- "Configured" is not the same as "working."
- "Captured" is not the same as "learned."
- "Built" is not the same as "ready."
- "Plan approved" is not the same as "production approved."

## Must Not Drift

- Do not implement this as schema yet.
- Do not collapse Site Assistant into Shay.
- Do not collapse Build Ledger into Build Trace.
- Do not let Registry Entries appear without proof.
- Do not approve Media Assets without QA.

## Acceptance Criteria

- All requested object types are present.
- Each object has id, purpose, key fields, relationships, owner screen, and lifecycle states.
- Object boundaries match the screen contracts.
- Approval, proof, and lifecycle distinctions are explicit.

## Not Yet / Out Of Scope

- No database schema.
- No JSON schema.
- No migrations.
- No app implementation.
