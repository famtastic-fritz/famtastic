# Agent Run Instructions — FAMtastic Studio Intelligence Foundation

## Header

Project: FAMtastic Development
Repo: famtastic-fritz/famtastic
Branch: research/studio-intelligence-foundation-20260508
Mode: local-first; cloud only if explicitly allowed
Primary tag: studio-intelligence-foundation

## Objective

Create the research-driven execution foundation for the Studio redesign so agents can later build toward MBSH V2 proof-readiness without drift.

## Required behavior

Do not begin implementation of the Studio redesign yet.

This run is for research, mapping, planning, proof design, and setup attempts.

## Read first

Read these files if present:

- docs/process/FAMTASTIC-RESEARCH-DRIVEN-BUILD-SYSTEM-BLUEPRINT.md
- docs/process/FAMTASTIC-DEVELOPMENT-CONVERGENCE-DOSSIER.md
- docs/process/FAMTASTIC-STUDIO-REDESIGN-MASTER-SPEC.md
- docs/process/FAMTASTIC-STUDIO-NAV-AND-DOMAIN-MAP.md
- docs/process/FAMTASTIC-STUDIO-SCREEN-CONTRACTS.md
- docs/process/FAMTASTIC-STUDIO-WORKFLOW-MAP.md
- docs/process/FAMTASTIC-STUDIO-OBJECT-MODEL-SKETCH.md
- docs/process/FAMTASTIC-STUDIO-REDESIGN-EXECUTION-READINESS.md
- docs/process/FAMTASTIC-BUILD-MUTATION-AND-INJECTION-SYSTEM.md
- docs/process/FAMTASTIC-MEDIA-LIBRARY-ASSET-REGISTRY-SPEC.md
- docs/process/FAMTASTIC-COMPONENT-STUDIO-LIFECYCLE.md
- docs/process/FAMTASTIC-DYNAMIC-RECIPE-RESOLVER.md
- docs/process/FAMTASTIC-CAPABILITY-TRUTH-LAYER-SPEC.md
- docs/process/FAMTASTIC-FULL-RUN-PLAN-RULE.md
- docs/process/FAMTASTIC-GUARDED-AUTONOMOUS-BUILD-RUN-CONTRACT.md
- docs/process/FAMTASTIC-PLAN-MODE-RUN-CONTROL-RECONCILIATION.md
- docs/process/FAMTASTIC-SHAYSHAY-DOMAIN-AND-PRESENCE-SPEC.md
- docs/process/FAMTASTIC-PRODUCT-VISION-PROTECTION-PASS.md
- docs/process/FAMTASTIC-OPEN-QUESTIONS-AND-DEFAULT-DECISIONS.md

## Create or update

Create/fill these deliverables:

```text
docs/research/famtastic-studio-execution/
  01-competitive-map.md
  02-pattern-library.md
  03-gap-and-opportunity-map.md
  04-agent-skill-map.md
  05-proof-and-checklist-system.md
  06-training-and-readback-system.md
  07-v1-adaptations.md
  08-v2-backlog.md
  09-execution-plan-impact.md
  data/sources.json
  data/competitor-map.json
  data/pattern-map.json
  data/agent-skill-map.json
  data/question-bank.json
  data/proof-criteria.json
  data/v1-v2-classification.json
```

## Required research minimum

Research at least:

- 5 AI app/site builders
- 5 agentic coding systems
- 3 multi-agent orchestration frameworks
- 3 research/provenance systems or patterns
- 3 security/cost/safety failure patterns

## Required analysis

For each competitor/similar system, capture:

- What it is
- What it does well
- What it misses
- What FAMtastic should borrow
- What FAMtastic should avoid
- What FAMtastic can exploit
- Source links
- Confidence level

## Required FAMtastic mapping

Map findings to:

- Intelligence Layer
- Control Layer
- Creation Layer
- Guide Layer
- Dynamic Recipe Resolver
- Capability Truth Layer
- Guarded Autonomous Build Run Contract
- Media Library as Asset Registry
- Component Studio lifecycle
- Server modularization track
- Training/readback system

## Setup attempts

If safe and repo-appropriate, attempt setup checks. Do not stop unless a blocker occurs.

Examples:

- inspect package files
- inspect current server.js size/responsibilities
- identify existing scripts
- identify build/test commands
- identify missing docs
- identify whether research artifacts can be consumed by Studio later

If an install or setup attempt fails but is not a blocker, log it in RUN_STATUS.md and continue.

## Stop conditions

Stop only for hard blockers:

- projected cost above $50
- missing secret with no fallback
- repo write/build impossible
- safety/security issue
- repeated validation failure after documented retry/fix attempts

## Final report

Create:

```text
docs/research/famtastic-studio-execution/FINAL-BRIEFING.md
```

The briefing must be readable by Fritz and should include:

- What was researched
- Top competitors/similar systems
- What they do well
- What they miss
- What FAMtastic should borrow
- What FAMtastic should exploit
- New v1 recommendations
- V2 backlog
- Server modularization recommendation
- How Studio should display this research
- How Shay should read it back
- What next build run should do

## Paste-back format

When done, paste this:

```text
[RUN REPORT]
Project: FAMtastic Development
Branch: research/studio-intelligence-foundation-20260508
Status: PASS | FAIL | BLOCKED

1. Research completed:
2. Files created/updated:
3. Setup attempts:
4. Non-blockers logged:
5. Blockers:
6. V1 recommendations:
7. V2 backlog:
8. Proof:
9. Next action:
```
