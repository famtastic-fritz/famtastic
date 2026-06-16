# Studio Redesign Execution Plan From Research

**Status:** ready for Slice 1 implementation planning  
**Branch:** `research/studio-intelligence-foundation-20260508`  
**Purpose:** Define the full execution path from the completed Studio intelligence research package to MBSH V2 proof-readiness.

This is a planning artifact only. It does not authorize MBSH V2, the shipping company test, logo/site work, or full build implementation.

## Executive Decision

The next workstream is not a site build. The next workstream is the minimum Studio execution substrate that makes future builds inspectable, provable, and reusable.

The execution order is:

1. Build the minimum Studio execution substrate.
2. Add the server modularization path needed before major backend growth.
3. Prove the substrate on controlled internal test data.
4. Use MBSH V2 as the first post-launch iteration proof.
5. Use the shipping company site as the first full end-to-end build proof.
6. Use the matured pipeline for FAMtastic logo/site work.

## 1. Research Findings That Strengthen The Studio Plan

### 1.1 Intelligence Must Precede Generation

The competitive map confirmed that many builders are strong at prompt-to-preview, but weak at research-to-proof. FAMtastic should not compete by being only faster. It should compete by building from intelligence:

- enhanced brief
- source-backed research
- opportunity map
- positioning
- recipe decision
- prompt object lineage
- QA/proof criteria
- learning capture

### 1.2 Preview Is Not Completion

Bolt, v0, Lovable, Replit, and IDE agents all reinforce the value of fast preview. The research also confirms the trap: preview success can hide missing auth, deploy wiring, data flows, security, domain status, mobile QA, and launch proof.

Studio must distinguish:

- local preview works
- staging proof exists
- production proof exists
- reusable learning was captured

### 1.3 Checkpoints Are For Proof, Not Constant Permission

Agent systems and orchestration frameworks support checkpoints, task state, resumability, and human gates. The FAMtastic rule is tighter:

- checkpoints record progress and proof
- checkpoints do not require Fritz approval by default
- continue unless a hard blocker appears
- route only real decisions to Fritz

### 1.4 Cost Must Be A Product Constraint

Replit-style billing visibility and OWASP unbounded-consumption risks both point to the same Studio requirement:

- cheap/local lanes are default
- cost estimate belongs in run state
- anything projected over `$50` requires explicit Fritz approval

### 1.5 Media And Components Need Lifecycle, Not Just Storage

Generated assets and components become dangerous when they enter pages without lineage, slot intent, QA, or fallback. Studio needs active registries:

- prompt object -> asset -> component -> slot -> QA proof -> learning
- local component -> candidate -> sandboxed -> proofed -> approved -> installed

### 1.6 Orchestration Is Substrate, Not The Product

CrewAI, LangGraph, AutoGen, and coding-agent systems are useful references, but Studio should not expose a generic agent graph. Mission Control should answer:

> What needs Fritz right now?

The orchestration layer should feed Run Control, Build Trace, Approval Center, and Learning Board.

## 2. Accepted V1 Recommendations

The following are accepted into V1 because they directly determine whether MBSH V2 can be proofed without repeating prior confusion.

| Recommendation | Accepted V1 shape | Why it matters |
| --- | --- | --- |
| Intelligence Brief | object plus minimal view/state | proves every build starts with intelligence |
| Dynamic Recipe Decision | structured decision record | prevents rigid templates and duplicate recipes |
| Capability Truth | records with last probe, proof, cost tier, fallback, approval rule | prevents "configured" from meaning "working" |
| Run Ledger / Run Control | durable run state and pass state | lets long-running work continue safely |
| Proof Packet / Pass Closeout | fixed/added/proved/deferred/risk/next | answers what a plan accomplished |
| Learning Candidate Capture | reusable lesson nominations | starts the compounding loop |
| Media Registry Minimum | prompt lineage, variants, allowed slots, QA, fallback | prevents untracked generated assets |
| Component/Slot Protocol | classify, locate slot, mutate smallest safe surface | prevents page rewrites when injection is enough |
| Server Responsibility Map | required before major backend growth | reduces risk in the 20,150-line server |
| Shay Visible Domain | Shay Home/Domain plus Bubble and Desk | keeps Shay findable and distinct from site assistants |
| Cost Gate | `$50+` explicit approval | prevents uncontrolled spend |
| Deploy Proof Gate | secrets, sourcemaps/debug artifacts, smoke, rollback | separates preview from production readiness |

## 3. Deferred V2 Backlog

These remain important but must not derail V1 proof-readiness:

- automated deep competitive intelligence
- full multi-agent orchestration runtime
- embedding-based recipe similarity
- full Media Studio automation
- Logo Lab execution and Adobe handoff automation
- video generation automation
- component marketplace behavior
- monthly improvement engine
- advanced cost optimization/provider arbitrage
- polished research UI visualizations
- complete server extraction
- public Site Assistant productization

V2 items may be documented during V1 work, but they do not expand Slice 1 scope.

## 4. Minimum Execution Substrate Required Before MBSH V2

MBSH V2 proofing cannot start until Studio can record and show these objects:

### 4.1 Intelligence Brief

Minimum fields:

- id
- project/site tag
- source brief
- research depth
- audience
- opportunity
- positioning
- source IDs
- open questions
- created_at
- status

### 4.2 Recipe Decision Record

Minimum fields:

- id
- intelligence_brief_id
- requested fingerprint
- matched recipe or `new`
- reuse/extend/hybrid/new/deprecate decision
- reason
- required capabilities
- QA gates
- V1/V2 notes

### 4.3 Capability Truth Record

Minimum fields:

- id
- capability name
- status: `working`, `partial`, `stubbed`, `broken`, `manual_only`, `costly`, `approval_required`
- last probe
- last error
- cost tier
- fallback
- approval requirement
- proof reference

### 4.4 Run Ledger

Minimum fields:

- run id
- objective
- scope
- branch
- approved guardrails
- active pass
- stop conditions
- continue conditions
- cost estimate
- proof links
- blockers
- non-blockers
- closeout status

### 4.5 Proof Packet

Minimum fields:

- pass id
- objective
- files changed
- commands run
- checks run
- outputs
- screenshots/logs if relevant
- capability probes
- cost notes
- fixed
- added
- proved
- deferred
- risk
- next action

### 4.6 Learning Candidate

Minimum fields:

- id
- source run/pass
- lesson type
- summary
- applies_to
- registry nomination
- V1/V2 classification
- proof reference
- status

### 4.7 Server Modularization Baseline

Minimum fields/artifacts:

- responsibility map
- extraction order
- baseline smoke commands
- first extraction target
- proof required per extraction
- rule preventing major backend growth in `server.js`

## 5. Server.js Modularization Requirements

`site-studio/server.js` is 20,150 lines and mixes route handling, WebSocket events, settings, site files, media, components, deploys, research/intel, Shay orchestration, build lifecycle, prompt context, and provider logic.

### 5.1 Rule Before Backend Growth

Do not add major backend behavior to `site-studio/server.js` unless one of these is true:

1. the target responsibility has already been extracted, or
2. the implementation is explicitly temporary and logged in the modularization plan with removal/extraction criteria.

### 5.2 First Extraction Direction

Start with low-risk pure helpers before touching complex runtime behavior:

1. validators
2. site path/file helpers
3. settings redaction/loading helpers

### 5.3 Required Proof Per Extraction

Every extraction must prove:

- app starts
- existing route paths remain unchanged
- route smoke checks still pass
- WebSocket still connects if touched
- no hidden cloud/API calls were introduced
- no cost gate bypass was introduced
- no unrelated behavior was changed

### 5.4 Backend Growth Stop Rule

If an implementation slice needs new backend endpoints and those endpoints would deepen `server.js` entanglement, stop the feature slice and perform the relevant modularization slice first.

## 6. First Implementation Slices In Order

### Slice 1: Execution Substrate Data And Docs

**Goal:** Create repo-native planning/runtime object contracts and storage shape without changing app behavior.

Deliver:

- object contracts for Intelligence Brief, Recipe Decision, Capability Truth, Run Ledger, Proof Packet, Learning Candidate
- storage location proposal
- sample fixture records for a fake/internal Studio run
- validation checklist
- no UI and no behavior changes

Proof:

- files created
- schemas/fixtures parse if JSON is used
- no app files modified
- clear next slice handoff

### Slice 2: Minimal Read-Only Studio Surface Plan

**Goal:** Define where the substrate appears in Studio before wiring behavior.

Deliver:

- Mission Control read-only state contract
- Shay readback contract
- Run Ledger read-only view contract
- Capability Truth read-only view contract
- Learning Candidate read-only view contract

Proof:

- screen contracts link to object contracts
- no implementation yet unless separately approved

### Slice 3: Server Baseline And First Low-Risk Extraction

**Goal:** Reduce backend risk before new behavior lands.

Deliver:

- baseline app start proof
- route smoke checklist
- first helper extraction plan
- first helper extraction only if the implementation pass is authorized

Proof:

- before/after smoke output
- unchanged route paths
- no behavior change note

### Slice 4: Capability Truth Probes

**Goal:** Make "working" mean probed and proven.

Deliver:

- local build/test capability probe
- Git/provider/deploy status probe contract
- media/provider capability probe contract
- DB/email capability probe contract
- cost tier and approval flags

Proof:

- probe outputs recorded
- broken/partial/manual_only statuses handled without blocking unrelated work

### Slice 5: Run Ledger And Pass Closeout Flow

**Goal:** Make long-running work answer what happened.

Deliver:

- create run
- append pass update
- append proof packet
- close pass with fixed/added/proved/deferred/risk/next
- mark run ready/blocked/complete

Proof:

- fixture run can be created and closed
- hard blockers are represented
- non-blockers do not stop continuation

### Slice 6: MBSH V2 Proof-Readiness Packet

**Goal:** Prepare MBSH V2 without starting site work.

Deliver:

- MBSH V2 objective
- scope boundaries
- deferred assets inventory
- component/slot candidates
- media registry candidates
- QA gates
- proof checklist
- stop conditions

Proof:

- MBSH V2 can start with known guardrails and required proof
- no MBSH V2 implementation yet

## 7. Agent / Subagent Ownership Map

| Work item | Primary owner | Support owner | Proof owner |
| --- | --- | --- | --- |
| Execution substrate contracts | Medium-brain orchestrator | Learning Curator | QA Critic |
| Intelligence Brief | Research Strategist | Shay Guide | Learning Curator |
| Recipe Decision | Recipe Architect | Capability Auditor | QA Critic |
| Capability Truth | Security / Capability Auditor | Deploy Manager | QA Critic |
| Run Ledger / Run Control | Medium-brain orchestrator | Build Runner | Learning Curator |
| Proof Packet | QA Critic | Build Runner | Medium-brain orchestrator |
| Media registry minimum | Media Director | Prompt Strategist | QA Critic |
| Component/slot protocol | Component Architect | Build Runner | QA Critic |
| Server modularization baseline | Build Runner | Security / Capability Auditor | QA Critic |
| Shay readback | Shay Guide | Learning Curator | Medium-brain orchestrator |
| MBSH V2 proof-readiness | Medium-brain orchestrator | Component Architect, Media Director | QA Critic |

Agents may work in parallel only when write scopes are disjoint and the run ledger records ownership.

## 8. Update / Checkpoint Policy

Checkpoints are required, but they are not permission stops.

### Continue Automatically When

- the pass remains inside approved scope
- proof is being recorded
- no hard blocker triggers
- cost remains under `$50`
- no destructive, secret, DNS, payment, or production action is next
- failure has a reasonable documented retry path
- fallback does not materially weaken the result

### Pause For Fritz Only When

- projected cost exceeds `$50`
- production deploy is next
- DNS/payment/secret/destructive action is required
- a major product, visual, navigation, or architecture decision is required
- same task fails twice after documented retry/fix attempts
- proof is missing for a stage that claims completion
- scope drift would change the agreed plan

### Required Checkpoint Updates

Every implementation pass must update:

- run ledger
- proof packet
- blockers/non-blockers
- cost status if relevant
- next action

## 9. Hard Blocker Policy

Hard blockers stop autonomous continuation:

- projected cost above `$50` without explicit Fritz approval
- required key/secret missing with no fallback
- repo write/build impossible
- safety/security issue
- repeated validation failure after documented retry/fix attempts
- destructive, DNS, payment, production deploy, or secret action required
- implementation would add major backend behavior to `server.js` without modularization path

Non-blockers are logged and work continues:

- optional repo unavailable
- optional install failure with fallback
- cloud lane unavailable when local/documented substitute exists
- V2-worthy discovery during V1 work
- capability is `partial` but not required by the active slice

## 10. Proof Required At Every Stage

| Stage | Proof required |
| --- | --- |
| Research complete | source map, competitive map, pattern map, V1/V2 classification |
| Plan complete | full execution path, hard blockers, next agent instruction |
| Substrate contract complete | object contracts, fixture records, validation output |
| Server baseline complete | app start command, route smoke checklist, file responsibility map |
| Capability Truth complete | last probe, status, fallback, cost tier, approval rule |
| Run Ledger complete | run created, pass appended, proof packet attached, closeout recorded |
| Learning capture complete | learning candidate, registry nomination or defer reason |
| MBSH V2 proof-ready | objective, scope, capabilities, component/slot/media candidates, QA gates, stop rules |

## 11. Ready For MBSH V2 Proofing Means

MBSH V2 is ready to start only when all of this is true:

1. Intelligence Brief contract exists and has an MBSH V2 fixture/draft.
2. Recipe Decision contract can represent MBSH as post-launch cinematic event iteration.
3. Capability Truth can show which deploy/media/data/provider capabilities are working, partial, manual_only, or blocked.
4. Run Ledger can create a run and record pass proof.
5. Proof Packet can close each pass with fixed/added/proved/deferred/risk/next.
6. Learning Candidate capture can nominate reusable MBSH patterns.
7. Component/slot protocol can classify MBSH changes without broad rewrites.
8. Media registry minimum can track deferred/approved assets.
9. Server modularization guardrail is active for any backend work.
10. Stop conditions and cost gates are explicit.

If any of these are missing, MBSH V2 can be discussed but should not begin implementation.

## 12. Exact Next Agent Instruction For Slice 1

Use this as the next implementation prompt after this planning artifact is reviewed:

```text
You are working in the FAMtastic repo on branch:
research/studio-intelligence-foundation-20260508

Objective:
Implement Slice 1 of the Studio redesign execution substrate as repo-native planning/runtime contracts only.

This is not app implementation.
Do not modify UI files.
Do not change server behavior.
Do not start MBSH V2, the shipping company site, logo/site work, deploy automation, or full build implementation.

Read first:
docs/research/famtastic-studio-execution/10-STUDIO-REDESIGN-EXECUTION-PLAN.md
docs/research/famtastic-studio-execution/FINAL-BRIEFING.md
docs/research/famtastic-studio-execution/05-proof-and-checklist-system.md
docs/research/famtastic-studio-execution/07-v1-adaptations.md
docs/research/famtastic-studio-execution/server-modularization-plan.md

Create a planning/runtime contract package under:
docs/research/famtastic-studio-execution/slice-1-execution-substrate/

Create:
1. OBJECT-CONTRACTS.md
2. STORAGE-SHAPE.md
3. VALIDATION-CHECKLIST.md
4. FIXTURES-README.md
5. fixtures/intelligence-brief.sample.json
6. fixtures/recipe-decision.sample.json
7. fixtures/capability-truth.sample.json
8. fixtures/run-ledger.sample.json
9. fixtures/proof-packet.sample.json
10. fixtures/learning-candidate.sample.json

Contracts required:
- Intelligence Brief
- Recipe Decision
- Capability Truth
- Run Ledger
- Proof Packet
- Learning Candidate

Rules:
- Continue through checkpoints unless a hard blocker appears.
- Anything projected over $50 requires Fritz approval.
- Do not add major backend behavior to site-studio/server.js.
- If JSON fixtures are created, validate they parse.
- Record proof in a short Slice 1 closeout file.

Validation:
- confirm all files exist
- validate JSON fixtures parse
- run git diff --check
- run git status

Commit with:
docs(research): add Slice 1 execution substrate contracts

Report:
- files changed
- contracts created
- fixtures created
- validation output
- blockers
- commit hash
```

## Not Yet / Out Of Scope

- No MBSH V2 implementation.
- No shipping company test.
- No logo/site work.
- No UI code.
- No deploy/provider automation changes.
- No paid/cloud actions.
- No full multi-agent framework integration.
- No major backend behavior added to `site-studio/server.js`.

## Acceptance Criteria

- This plan defines the path from research to MBSH V2 proof-readiness.
- Accepted V1 work is separated from V2 backlog.
- Server modularization is treated as V1 foundation.
- Checkpoints are proof points, not default approval stops.
- `$50+` cost approval is explicit.
- MBSH V2 readiness is defined before MBSH V2 starts.
- Slice 1 has exact next-agent instructions.

