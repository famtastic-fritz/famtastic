# FAMtastic Studio Nav And Domain Map

**Status:** planning/spec only  
**Primary anchors:** [Research-Driven Build System Blueprint](FAMTASTIC-RESEARCH-DRIVEN-BUILD-SYSTEM-BLUEPRINT.md), [Development Convergence Dossier](FAMTASTIC-DEVELOPMENT-CONVERGENCE-DOSSIER.md)  
**Purpose:** define the left-nav/domain layout for the redesigned Studio.

## Navigation Rule

Left-nav items are durable product domains. They are not one-off actions, temporary modes, or hidden implementation concerns.

Shay must be a visible/findable domain or home area.

## Domain Map

| Domain | Purpose | Primary user | Data shown | Actions | Related registries | Related agents/skills | Related QA gates | What must not drift |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Mission Control | operator landing and attention routing | Fritz/operator | needs-Fritz queue, healthy runs, blocked approvals, recent shipments | open run, open approval, inspect risk, route to workspace | Run, Decision, Deploy | orchestrator, deployment manager | proof present, approval completeness | not a generic dashboard |
| Sites | project/site inventory and site state | Fritz/builder | sites, pages, environments, current status, ownership | open site, create project, inspect page map | Project, Site, Page | project planner, site auditor | site state freshness | not provider admin |
| Research | discovery and opportunity | strategist/builder | sources, insights, competitors, gaps, questions | run scan, approve insight, flag assumption | Research, Prompt, Learning | research strategist, opportunity finder | source quality, insight relevance | not passive notes |
| Recipes | build strategy composition | strategist/builder | recipe requests, fingerprints, modules, lifecycle, compatibility | resolve, reuse, extend, hybridize, approve recipe | Recipe, Capability, QA Gate | recipe classifier, conversion strategist | recipe compatibility | not rigid templates |
| Media Studio | media production and registry | creative/operator | assets, prompts, variants, QA, usage | generate, inspect, clean, approve, bind | Media, Prompt, Brand | asset director, visual QA critic | alpha, crop, compression, contrast | not file storage only |
| Component Studio | component lifecycle | builder/designer | candidates, sandbox previews, metadata, proof | create, test, approve candidate, install | Component, Slot, Pattern | UX specialist, visual QA critic | component proof, slot compatibility | not whole-page rewrite home |
| Assistants | public site assistants and characters | builder/operator | site assistants, character configs, FAQ, actions | configure assistant, test answers, bind to site | Site Assistant, Component | character director, assistant safety | scope, fallback, action safety | not Shay |
| Shay | Studio-wide guide and work partner | Fritz/operator | tasks, desk drafts, memory candidates, skills, handoffs, presence | ask, triage, approve memory, open desk, train | Shay Memory, Skill, Handoff | Shay orchestrator, learning curator | handoff clarity, memory approval | not bubble-only |
| Build Runs | long-running execution | operator/builder | active runs, passes, ledger, trace, blockers | start, pause, resume, close pass | Run, Pass, Trace | medium-brain orchestrator, subagents | pass closeout, trace completeness | not plan approval |
| QA | readiness and risk | builder/operator | gates, failures, screenshots, audits, smoke results | run gate, accept risk, create blocker | QA Gate, Proof | accessibility, performance, visual QA | all relevant gates | not subjective signoff |
| Deploy | staging/prod/release | operator | deploy targets, links, build status, rollback, smoke proof | stage, promote, rollback, inspect logs | Deploy, Capability | deployment manager | deploy readiness, smoke | no production without approval |
| Learning | capture/retrieve/apply/verify | operator/curator | lessons, candidates, applied learnings, effectiveness | promote, park, reject, request proof | Learning, Pattern, Recipe, Component | learning extractor, curator | learning effectiveness | not journal-only capture |
| Ops / Admin | technical operations | operator/admin | jobs, queues, provider health, secrets status, capability truth, cost | probe, retry, repair, configure | Capability, Job, Cost | ops monitor, provider auditor | provider health, capability proof | not product strategy |
| Settings | preferences and configuration | Fritz/admin | app/user/org defaults, thresholds, lanes | edit preferences, set thresholds | Settings, Policy | configuration assistant | policy validity | not approval queue |

## Domain Grouping

For visual organization, domains can group by intent:

- Operate: Mission Control, Build Runs, QA, Deploy, Ops / Admin.
- Create: Sites, Media Studio, Component Studio, Assistants.
- Think: Research, Recipes, Learning.
- Guide: Shay.
- Configure: Settings.

Grouping must not hide Shay.

## Cost Placement

Cost appears in:

- Mission Control when attention is needed.
- Build Runs when a run has estimates/actuals.
- Approval Center when spend crosses threshold.
- Ops / Admin for provider and account visibility.
- Settings for threshold defaults.

Anything projected over $50 requires explicit approval.

## Must Not Drift

- Do not hide Shay under only a bubble or only settings.
- Do not make Mission Control a catch-all for every feature.
- Do not mix public site assistants with Shay.
- Do not let Recipes become static templates.
- Do not bury cost in logs.

## Acceptance Criteria

- All required domains are represented.
- Each domain has purpose, user, data, actions, registries, agents/skills, QA gates, and drift warning.
- Shay is visible/findable.
- Cost visibility and approval threshold are represented.

## Not Yet / Out Of Scope

- No visual nav design.
- No route changes.
- No UI implementation.
- No settings migration.
