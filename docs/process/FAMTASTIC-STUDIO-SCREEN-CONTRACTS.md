# FAMtastic Studio Screen Contracts

**Status:** planning/spec only
**Primary anchors:** [Research-Driven Build System Blueprint](FAMTASTIC-RESEARCH-DRIVEN-BUILD-SYSTEM-BLUEPRINT.md), [Development Convergence Dossier](FAMTASTIC-DEVELOPMENT-CONVERGENCE-DOSSIER.md)
**Purpose:** define each redesigned Studio screen as a product contract.

## Contract Format

Each screen is defined by purpose, question, data, actions, approvals, registries, capabilities, agents/skills, proof, handoffs, failure states, drift guard, and acceptance criteria.

## Screen Contracts

| Screen | Purpose | Primary question | Data shown | Actions | Approvals needed | Connected registries | Connected capabilities | Agents/skills | Proof/evidence | Handoff targets | Failure states | Must not drift | Acceptance criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Mission Control | operator landing | What needs Fritz now? | attention queue, healthy runs, blockers, recent shipments | open run, approval, deploy, QA, Shay Desk | costly/DNS/prod/destructive decisions | Run, Decision, Deploy | cost, deploy, capability truth | orchestrator | run summaries, proof links | Approval Center, Build Runs, QA, Deploy | stale status, missing proof | generic dashboard | shows only actionable control state |
| Project Intake | start a project/site | What is being requested? | raw brief, owner, target, constraints | create project, ask questions, attach files | unusual scope/cost | Project, Site, Brief | file upload, intake storage | brief enhancer | intake record | Brief Enhancer, Research | missing owner/target | form-only intake | creates usable project input |
| Brief Enhancer | improve vague brief | What does the client really need? | assumptions, questions, clarified offer | approve enhanced brief, request info | strategic assumptions if uncertain | Brief, Research | research availability | brief enhancer, strategist | enhanced brief diff | Research, Recipe Composer | vague unresolved brief | generic questions | produces strategy-ready brief |
| Research Screen | discover opportunity | What should we know before building? | sources, competitors, gaps, insights | run scans, approve insights, mark assumptions | paid research over threshold | Research, Prompt, Learning | web/research tools | research strategist | source list, insight record | Recipe Composer, Prompt Registry | weak sources, stale data | passive notes | insights feed recipe/prompts |
| Recipe Composer | compose build strategy | What build shape fits? | recipe request, fingerprint, matches, modules | reuse, extend, hybridize, create candidate | new major recipe, costly modules | Recipe, Capability, QA Gate | capability truth, cost | recipe classifier | decision log | Full-Run Plan, Run Control | no compatible recipe | rigid template picker | recipe binds to gates/capabilities |
| Theme Contract | lock visual rules | What visual system governs this build? | tokens, type, colors, motion, rules | approve/revise contract | major brand direction | Theme, Brand | media/brand tools | creative director | theme proof | Page Purpose, Scene Board | conflicting tokens | mood board only | rules are testable |
| Page Purpose Map | define page jobs | What is each page for? | pages, user intent, CTA, required sections | add/remove page, approve purpose | navigation changes | Page, Pattern | site builder | UX flow specialist | page purpose map | Scene Board | orphan pages | sitemap-only | every page has job/CTA |
| Scene Board | arrange sections | What sequence tells the story? | sections, archetypes, slots, page flow | reorder, replace, nominate component | major layout changes | Section, Component, Pattern | component installer | UX/visual QA | scene proof | Component Studio, QA | unclear section purpose | wireframe-only | sections map to purpose |
| Asset Board / Media Library | approve assets | Which assets are usable? | asset objects, variants, QA, usage | inspect, clean, approve, retire | costly generation | Media, Prompt | image cleanup, generation | asset director | QA results, variants | Component Studio, Slot injection | unapproved media | file browser | assets have lineage/QA |
| Media Studio | run media workflows | How do we create usable media? | prompt objects, candidates, cleanup, variants | generate, critique, compress, bind | $50+ spend, brand decisions | Media, Prompt, Brand | image/video providers | visual QA, prompt critic | contact sheets, QA | Media Library, Component Studio | provider failure | storage bucket | workflow produces approved assets |
| Logo Lab | plan logo work | What mark system should exist? | brief, concepts, variants, usage tests | compare, vectorize, handoff | brand direction, paid tools | Brand, Media | Adobe/manual tools | creative director | usage tests | Brand Kit, Media Library | premature logo execution | hero image generator | no execution before pipeline ready |
| Video Prompt Packet / Video Lab | plan video assets | What video asset is needed and feasible? | still, prompt, provider notes, cost, loop target | create packet, approve manual provider run | video spend, provider use | Media, Prompt | video providers, compression | asset director | packet, compression proof | Media Library | unproven automation | auto-video claim | planning/manual until proven |
| Component Studio | create/proof components | Is this component safe and reusable? | sandbox, metadata, variants, dependencies | build candidate, preview, test | reusable promotion | Component, Slot | preview/test harness | UX/visual QA | sandbox proof | Component Library | untested component | design playground | proof before promotion |
| Component Library | store approved components | What can be reused? | approved components, versions, usage | approve, deprecate, create variant | promotion/deprecation | Component, Pattern | component installer | curator | proof links | Component Installer | stale metadata | unproofed library | only approved components live here |
| Component Installer | install components | Where can this component go? | slots, compatibility, required data/assets | install, preview, rollback | major page change | Component, Slot, Site | installer, QA | component planner | install proof | QA Board, Build Trace | slot mismatch | direct page rewrite | smallest safe mutation |
| Character Board | manage characters | How do characters appear? | poses, placements, rules, assets | approve pose, map placement | major character direction | Character, Media | media tools | character director | placement proof | Site Assistant, Scene Board | dirty assets | random mascot use | placement rules explicit |
| Site Assistant Builder | configure public assistant | What should site visitors get? | FAQ, actions, limits, fallback collector | configure, test, bind | public actions, privacy | Site Assistant, Component | assistant runtime | assistant safety | answer tests | Deploy, QA | unsafe answer/action | Shay clone | bounded per-site assistant |
| Shay Home | manage Shay | What is Shay doing and learning? | tasks, memory, skills, handoffs, presence | manage tasks, train, approve memory | memory/presence changes | Shay Memory, Skill | assistant runtime | Shay | task/memory history | Shay Desk, Mission Control | hidden state | bubble-only | findable Shay home exists |
| Shay Bubble | ambient guide | What help is needed here? | context, quick prompts, suggestions | ask, explain, escalate to desk | none unless action crosses gates | Shay Memory | assistant runtime | Shay | conversation snippet | Shay Desk | overreaches action | only Shay surface | quick help, safe escalation |
| Shay Desk | workbench | What larger work needs Shay? | drafts, plans, handoffs, proof, memory candidates | draft plan, package handoff, review proof | plan/memory approval | Shay Memory, Plan, Trace | assistant runtime | Shay/orchestrator | handoff packet | Run Control, Learning | untracked advice | chat-only | structured workbench output |
| Build Run Control | execute guarded run | Can the run continue? | pass, status, stops, next action | start, pause, resume, close pass | stop-condition approvals | Run, Pass | orchestration | medium-brain orchestrator | pass proof | Ledger, Trace, Approval | scope drift | hidden execution | follows guardrails |
| Build Ledger | human state | What happened and what is next? | current pass, done, blockers, proof, next | update state, close pass | completion claims | Run, Pass | docs/proof storage | orchestrator | closeout | Mission Control | stale ledger | raw trace dump | human-readable run state |
| Build Trace | machine evidence | What exactly happened? | prompts, commands, files, outputs, screenshots | inspect, attach, link proof | none unless exposing secrets | Trace | test/build tools | verifier | command/test output | Ledger, QA | missing evidence | human summary | evidence complete and safe |
| Approval Center | decision queue | What needs explicit approval? | decisions, risk, cost, blocked action | approve, reject, defer | all listed items | Decision, Cost | provider/action gates | orchestrator | approval record | Mission Control, Run Control | missing context | inline hidden approvals | decisions auditable |
| Capability Truth | status reality | What actually works? | status, probe, error, proof, fallback | probe, mark fallback, resolve | provider/secrets changes | Capability | providers/tools | ops auditor | probe proof | Ops, Recipe, Run Control | config-only status | marketing list | proof-backed status |
| Cost / Usage | spend governance | What will/does this cost? | estimates, actuals, thresholds, provider costs | choose lane, request approval | $50+ projected | Cost, Capability | provider billing | cost auditor | cost report | Approval Center | hidden spend | afterthought | visible cost before spend |
| QA Board | readiness | What is blocking readiness? | gates, failures, proof, risk | run gate, accept risk, create issue | risk acceptance | QA Gate, Proof | browser/test tools | accessibility/performance/visual QA | screenshots, reports | Deploy, Learning | missing proof | checklist theater | gates tied to launch level |
| Deploy Center | release | What environment is ready? | staging/prod, links, deploy status, rollback | deploy, promote, rollback, smoke | production, DNS | Deploy, Capability | Netlify/provider | deployment manager | deploy/smoke proof | Mission Control, Learning | broken link | push button only | release has proof/rollback |
| Learning Board | improve next build | What should become reusable? | lessons, candidates, effectiveness, registry nominations | promote, park, reject, request proof | promotion | Learning, Pattern, Recipe, Component | retrieval/verifier | learning curator | applied/improved evidence | Registries, Recipe Composer | journal-only | notes archive | capture/retrieve/apply/verify |
| Ops Workspace | technical admin | What platform system needs maintenance? | jobs, queues, secrets status, providers, health | retry, repair, configure, probe | secrets/provider changes | Job, Capability, Cost | provider APIs | ops monitor | health/probe logs | Mission Control | mixed product decisions | dashboard sprawl | admin state is actionable |
| Settings | preferences | What defaults govern Studio? | thresholds, lanes, defaults, policies | edit default, save policy | dangerous/global policy changes | Settings, Policy | config | config assistant | policy history | Ops, Cost | silent default changes | junk drawer | safe defaults visible |

## Must Not Drift

- Do not implement screens from this document without review.
- Do not let a screen own data that belongs to another screen.
- Do not reduce contracts to visual mockups.
- Do not hide approvals, cost, capability proof, or Shay state.

## Acceptance Criteria

- Every requested screen has a contract row.
- Every row includes purpose, question, data, actions, approvals, registries, capabilities, agents/skills, proof, handoffs, failure state, drift guard, and acceptance criteria.
- Shay and Site Assistant are separated.
- Run Control, Ledger, and Trace are separated.

## Not Yet / Out Of Scope

- No UI implementation.
- No route definition.
- No component build.
- No app behavior changes.
