# Workstream Map

**Parent:** `STUDIO-PLATFORM-REFRESH-V2.md`
**Companion:** `STUDIO-TOOLS-AND-PROCESSES-MATRIX.md`
**Purpose:** map the umbrella's ten branches onto the existing eight active parent plans, identify what should be absorbed under Platform Refresh v2, and surface the recommended registry changes (without rewriting `plans/registry.json` — recommendations only, per the brief).

---

## 1. The picture

```
                Platform Refresh v2  (umbrella, this packet)
                          │
     ┌────────────────────┼─────────────────────────────────────┐
     │                    │                                     │
     │   SUBSTRATE        │      DOMAIN                          │     GOVERNANCE
     │                    │                                     │
     ▼                    ▼                                     ▼
[plan-task-run-]   [studio-workbench-]                  [governance.hard_stop_]
[intelligence  ]   [foundation       ]                  [conditions          ]
[chassis       ]   [chassis          ]                  [(in registry.json)  ]
                                                        [+ Approval Center   ]
[build-intent-]    [plan_2026_05_05_                    [+ Cost guardrails   ]
[fulfillment- ]    [ops_workspace_gui]                  [+ Capability Truth  ]
[trace        ]    [domain Admin    ]                   [  Layer cost field  ]

[plan_2026_05_05_  [plan_2026_05_05_
[chat_capture_     [platform_site_
[learn_optimize]   [promotion]

[plan_2026_05_05_  [plan_2026_05_05_
[agent_           [workbench_per_
[coordination]    [page_design]

[site-mbsh-       (independent — site-scoped, post-launch backlog)
[reunion]
```

Eight active parents. Five are **substrate** (the rails). Three are **domain** (the workspaces). One is **site-scoped** (MBSH itself). Governance is configuration in the registry, not a parent plan.

---

## 2. The umbrella's ten branches mapped to plans

The umbrella from `STUDIO-PLATFORM-REFRESH-V2.md` § 1:

| Umbrella branch | Maps to which plan(s) | Map verdict |
|---|---|---|
| A. Control Surface Reconciliation | **none today** | **NEW** umbrella concept; lives in this packet. |
| B. Autonomous Build Operating Model | spans all parents | **NEW** umbrella concept; defines the contract every plan inherits. |
| C. API + Cost + Usage Governance | governance config exists; no parent plan owns it | **NEW** workstream; should become a child plan. |
| D. Media Studio Scope | `studio-workbench-foundation` (Media Studio unification is part of its scope) | already in scope; extend via this packet. |
| E. Component Studio Scope | `studio-workbench-foundation` (Components is a domain) | already in scope; v0 sandbox is new work. |
| F. Shay Domain / Shay Desk | `plan_2026_05_05_chat_capture_learn_optimize` (Shay context provider) + ambient | partially covered; Shay Desk page is new. |
| G. Site Assistant Component | `studio-workbench-foundation` (Components domain) | belongs under Components but no plan claims it; should become a child plan. |
| H. Capability Truth Layer | `studio-workbench-foundation` (capability manifest already in Admin) + `build-intent-fulfillment-trace` (capability checks pre-pass) | partial; extension is part of branch C and substrate. |
| I. Intelligence Loop Audit | `plan_2026_05_05_chat_capture_learn_optimize` + `plan-task-run-intelligence` | partially covered; the **retrieve / apply / verify** half is new. |
| J. Plan Registry Reconciliation | (this packet's recommendations) | **review only**, no rewrite. |

---

## 3. Per-plan disposition (what stays, what absorbs, what supersedes)

### Plan 1 — `studio-workbench-foundation`
- **Status today:** active parent · "Workbench shell completion, default-shell cutover, and Media Studio unification."
- **Disposition:** **STAYS**. Becomes the chassis under Platform Refresh v2.
- **Add scope:**
  - Mission Control mounts inside its Sites domain (Reconciliation §2.2).
  - Media Studio sub-workspaces (Logo Lab, Hero, Asset Library, Brand Kit, Adobe Handoff) — already implied by the "Media Studio unification" workstream.
  - Component Studio v0 sandbox under the Components domain.
  - Capability Manifest screen extension (Capability Truth Layer surface).
- **Note:** the per-page-design plan `plan_2026_05_05_workbench_per_page_design` continues to feed this; no merge.

### Plan 2 — `plan-task-run-intelligence`
- **Status today:** active parent · "Plan/task/run/proof ledgers, status mirrors, and capture promotion."
- **Disposition:** **STAYS**. Becomes the substrate every other plan reads.
- **Add scope:**
  - Cost telemetry log (`tasks/provider-calls.jsonl`) as a peer ledger.
  - Run-contract schema (the nine-field contract from `AUTONOMOUS-BUILD-OPERATING-MODEL.md`).
  - Per-run cost report substrate.

### Plan 3 — `build-intent-fulfillment-trace`
- **Status today:** active parent · "Workflow-as-data phase 2 and fulfillment diagnostics."
- **Disposition:** **STAYS**. Becomes the Build Trace data layer (Reconciliation §2.7).
- **Add scope:**
  - Stage/event matching for the build pass schema (P0 → Pn pattern).
  - Build Ledger scaffold per site (Reconciliation §2.6) — the per-site narrative reads from this trace.
  - Coverage matrix as a stage-output artifact.

### Plan 4 — `site-mbsh-reunion`
- **Status today:** active parent (site-scoped) · "Blocked live deploy proof plus media/story readiness."
- **Disposition:** **CHECKPOINT**. Live deploy proof landed 2026-05-08; this plan should checkpoint the Premiere arc and switch to **MBSH V2 iteration** mode.
- **Recommended status update:** `checkpoint_complete` on the launch arc; new active workstream "MBSH V2 iteration backlog" with the 10 items from `V2-LEARNINGS-AND-PATTERNS.md` § 9.
- **Note:** this is the strongest argument for the autonomous build operating model — it just shipped using it.

### Plan 5 — `plan_2026_05_05_ops_workspace_gui`
- **Status today:** active parent · "Build the Ops read/freshness substrate before command mutations or Jobs tab UI implementation."
- **Disposition:** **STAYS** as a domain plan inside `studio-workbench-foundation`. Already explicitly parented there (`parent_plan: studio-workbench-foundation`).
- **Add scope:**
  - Cost summary sub-route (`/admin/cost-summary`).
  - Provider health sub-route (`/admin/capabilities`).
  - Approval Center page (`/admin/approvals`) drawing from `governance.hard_stop_conditions`.

### Plan 6 — `plan_2026_05_05_platform_site_promotion`
- **Status today:** active parent · "Formalizes dev/staging/main promotion ladder + release tags + rollback. MBSH-driven."
- **Disposition:** **STAYS**. Becomes the source for Deploy Center + Smoke Test registry.
- **Add scope:**
  - Smoke-test registry (the 12-item curl pattern from MBSH).
  - Rollback recipe template (commit pin + `netlify deploy --prod` revert recipe).
  - Per-site Deploy Center panel reads from this.

### Plan 7 — `plan_2026_05_05_chat_capture_learn_optimize`
- **Status today:** active parent · "Capture/tag/promote/retrieve/optimize pipeline for chat learnings. Provides the backend the Ops Memory tab will read."
- **Disposition:** **STAYS**. The substrate for the Intelligence Loop branch.
- **Add scope:**
  - Retrieve / apply / verify (the half currently missing per `INTELLIGENCE-LOOP-AUDIT.md`).
  - V2 backlog as a first-class artifact (today it's a per-site doc).
  - Pattern promotion (one-off → registry entry).

### Plan 8 — `plan_2026_05_05_agent_coordination`
- **Status today:** active parent · "Pre-flight coordination gate + migration of cowork .brain entries into canonical memory."
- **Disposition:** **STAYS**. The governance for multi-agent work.
- **Add scope:**
  - The autonomy ladder (manual / assisted / GA / GA-to-completion / cost-bounded-batch) becomes the modes the coordinator tracks.
  - The dangerous-action gates (nine, from the autonomous-build doc) become explicit in `AGENT-COORDINATION.md`.

### Plan 9 — `plan_2026_05_05_workbench_per_page_design`
- **Status today:** active parent (research role) · per-page-type design research feeding Workbench + Ops.
- **Disposition:** **STAYS** as research. The page-type taxonomy is foundational for every screen Platform Refresh v2 names.
- **Note:** This plan's outputs (the six page types + decision tree) are already integrated into Reconciliation §2 and the Tools Matrix.

---

## 4. New child plans Platform Refresh v2 should add (recommendations)

These do not exist today. Each is a *recommendation*, not a registry rewrite. Each names a clear scope, a parent, and a relationship to the umbrella.

### Recommendation N1 — `plan_2026_05_08_api_cost_governance` *(new)*
- **Role:** governance / substrate
- **Parent:** Platform Refresh v2 umbrella; depends on `plan-task-run-intelligence` for the telemetry ledger
- **Scope:** cost telemetry log, per-call estimate, soft/hard thresholds, Approval Center cost-gate, monthly summary, cheap/premium lane in recipes
- **Authority:** `API-COST-USAGE-GOVERNANCE.md`

### Recommendation N2 — `plan_2026_05_08_capability_truth_layer` *(new)*
- **Role:** substrate
- **Parent:** Platform Refresh v2; consumes the existing capability manifest as seed
- **Scope:** extend the manifest into media, video, agents, MCPs, monthly cost; add status vocabulary (working/partial/stubbed/broken/manual/costly/approval_required); cost field; provider health probe
- **Authority:** `CONTROL-SURFACE-RECONCILIATION.md` §2.8 + `API-COST-USAGE-GOVERNANCE.md`

### Recommendation N3 — `plan_2026_05_08_site_assistant_component` *(new)*
- **Role:** domain (Components)
- **Parent:** `studio-workbench-foundation`
- **Scope:** generalize Hi-Tide Harry pattern into a reusable Site Assistant component with assistant tiers, character config, FAQ, page hints, fallback collector, refinement loop
- **Authority:** `STUDIO-TOOLS-AND-PROCESSES-MATRIX.md` row "Site Assistant Component" + `V2-LEARNINGS-AND-PATTERNS.md` §7

### Recommendation N4 — `plan_2026_05_08_qa_gate_registry` *(new)*
- **Role:** substrate
- **Parent:** Platform Refresh v2; depends on `build-intent-fulfillment-trace` for hooks
- **Scope:** Tier-1 gates from the matrix § 6: section archetype · character placement · asset alpha · form readability · footer treatment · mobile viewport · console error · broken image · dead link · cost threshold · build-credit
- **Authority:** `STUDIO-TOOLS-AND-PROCESSES-MATRIX.md` § 6 + `MBSH-AS-STUDIO-BUILD-AUDIT.md`

### Recommendation N5 — `plan_2026_05_08_recipe_registry` *(new)*
- **Role:** substrate
- **Parent:** Platform Refresh v2
- **Scope:** seed the registry with three recipes (cinematic / event / portfolio) derived from MBSH + the FRDB shipping example; declare per-asset-class lanes; declare default QA gates; declare default mode in the autonomy ladder
- **Authority:** `FAMTASTIC-RESEARCH-DRIVEN-BUILD-SYSTEM-BLUEPRINT.md` §5–§12 + `MBSH-AS-STUDIO-BUILD-AUDIT.md`

### Recommendation N6 — `plan_2026_05_08_intelligence_loop_close_the_loop` *(new)*
- **Role:** substrate
- **Parent:** `plan_2026_05_05_chat_capture_learn_optimize`
- **Scope:** the retrieve / apply / verify half — register the V2 patterns (section archetypes, Harry placement, Final Reel, asset alpha, form readability, FX opacity, FAQ + fallback, V2 backlog model) as searchable, indexed, retrievable units; add an "applied this learning" telemetry field to per-pass closeouts; add a verifier that scores whether the learning improved the result
- **Authority:** `INTELLIGENCE-LOOP-AUDIT.md`

---

## 5. Plan registry health observations

(Per the brief: do **not** rewrite the registry; surface findings only.)

### 5.1 Stale or potentially mis-active

- **`site-mbsh-reunion`** is still `current_workstream: "Blocked live deploy proof plus media/story readiness"`. Live deploy landed 2026-05-08. This is stale by ~12 hours as of writing.
- The `tasks` array on `studio-workbench-foundation` mostly references workstreams that are now `completed_scope`. Worth a checkpoint.

### 5.2 Duplicated / overlapping

- **Capability tracking** is split across `studio-workbench-foundation` (Admin / Capability Manifest), `build-intent-fulfillment-trace` (capability checks pre-pass), and `plan_2026_05_05_chat_capture_learn_optimize` (intelligence loop relevance). The Capability Truth Layer recommendation (N2) consolidates without merging plans.
- **Status mirrors** — `FAMTASTIC-STATUS.md` is hand-updated; the registry says "automatic status-packet regeneration" is part of `plan-task-run-intelligence` next-action. Worth either landing the automation or marking it as a known gap.
- **Worker queue + Approvals + Capability Manifest** all overlap in the Admin domain. The Reconciliation doc resolves the surfaces; the plan registry could note the parent-child relationships explicitly (N1, N2 land here).

### 5.3 Completed / superseded

- The eight `absorbed_records` (famtastic-total-ask-plan, studio-master-plan, multi-agent-resumable-plan-system, shay-process-intelligence, build-orchestration-trace, canonical-build-intent-v2, baseline-closure-review, gap-123-4-closure, p0-p1-diagnostics, outstanding-iterative-roadmap) are well-documented as absorbed. No action needed.
- **MBSH Premiere arc** (P0 → P13) inside `site-mbsh-reunion` is complete and shipped. A `checkpoint_complete` packet is appropriate per `plans/CLOSEOUT-SCHEMA.md`.

### 5.4 Should be absorbed under Platform Refresh v2 (recommendation only)

- All eight active parents continue to live independently — they are *children* of Platform Refresh v2 by relationship, not by absorption. The umbrella is a packet, not a registry rewrite.
- The six **new** child plans (N1–N6 above) should be added as registry entries when Fritz approves Platform Refresh v2.

### 5.5 Should remain independent

- `site-mbsh-reunion` (and any future site-scoped plan) remains independent — site execution is per-project, not platform.
- `plan_2026_05_05_workbench_per_page_design` remains as research role, feeding the chassis without merging.

### 5.6 Should be superseded

- Nothing right now. The eight active parents are coherent and well-named. Platform Refresh v2 changes their *relationships* (umbrella + new children), not their identities.

---

## 6. The dependency graph (recommended state after additions)

```
                           Platform Refresh v2 (umbrella)
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             │                          │                          │
     ────────────────         ──────────────────         ─────────────────
     CHASSIS / SHELL          SUBSTRATE / RAILS          DOMAIN / WORKSPACE
     ────────────────         ──────────────────         ─────────────────

   studio-workbench-           plan-task-run-           plan_2026_05_05_
   foundation                  intelligence             ops_workspace_gui
   │                           │                        │ (parent: chassis)
   ├── Mission Control         │                        │
   ├── Media Studio            ├── Cost telemetry       └── Approval Center
   │                           │     (N1)                    Cost summary
   ├── Component Studio v0     │                              Provider health
   │                           ├── Run contract schema       Capability mgmt
   ├── Capability Manifest UI  │
   │                           ├── Tasks/Runs/Proof    plan_2026_05_05_
   ├── Site Assistant Component│                       platform_site_promotion
   │     (N3)                  └── Provider call ledger  │
   │                                                     └── Smoke test
   └── Workbench per-page-design (N1)                          registry
            (research feed)
                                         build-intent-fulfillment-trace
                                         │
                                         ├── Build Ledger scaffold
                                         ├── Build Trace phase 2
                                         └── QA Gate Registry (N4)

                                         plan_2026_05_05_chat_capture_
                                         learn_optimize
                                         │
                                         ├── Capture pipeline (live)
                                         ├── Memory canonicalization
                                         └── Close the loop (N6)
                                              ├── retrieve
                                              ├── apply
                                              └── verify

                                         plan_2026_05_05_agent_coordination
                                         │
                                         └── Autonomy ladder + dangerous-action gates

                                         Capability Truth Layer (N2)
                                         (substrate; reads by every surface)

                                         Recipe Registry (N5)
                                         (substrate; seeds Build Mode)

                                         site-mbsh-reunion
                                         (independent, post-launch)
                                         └── V2 iteration backlog
```

The graph is dense but not tangled. Every line is a real dependency; no plan owns work another plan also owns.

---

## 7. What this map locks

- **Eight active parents stay.** Platform Refresh v2 is an umbrella, not a merge.
- **Six new child plans (N1–N6)** are recommended additions under the umbrella when Fritz approves.
- **MBSH plan checkpoints.** The Premiere arc is closed; V2 iteration is the new workstream.
- **No supersession** at this time. The plan vocabulary is coherent.
- **Capability Truth Layer**, **Cost Governance**, **QA Gate Registry**, **Recipe Registry**, **Site Assistant Component**, and **Intelligence-Loop Closure** are the six new workstreams that operationalize Platform Refresh v2.

`FIRST-BUILD-SEQUENCE.md` orders these into a runnable sequence.
