# Control Surface Reconciliation

**Parent:** `STUDIO-PLATFORM-REFRESH-V2.md`
**Purpose:** lock the relationship between the eight overlapping control-surface ideas — Operator Cockpit, Mission Control, Ops Workspace, Shay Desk, Approval Center, Build Ledger, Build Trace, Capability Truth Layer — so the next implementer doesn't build a duplicate.

---

## 1. The reconciliation in one diagram

```
                          ┌──────────────────────┐
                          │  OPERATOR COCKPIT    │  umbrella experience
                          │  (the seat Fritz     │  for one operator
                          │   sits in)           │
                          └──────────┬───────────┘
                                     │
   ┌─────────────────────┬───────────┼────────────┬─────────────────┐
   │                     │           │            │                 │
   ▼                     ▼           ▼            ▼                 ▼
┌────────┐         ┌─────────┐   ┌─────────┐  ┌──────────┐   ┌──────────┐
│MISSION │         │   OPS   │   │  SHAY   │  │ APPROVAL │   │ DOMAINS  │
│CONTROL │         │WORKSPACE│   │  DESK   │  │  CENTER  │   │ (R1)     │
│(screen)│         │(screen) │   │(screen) │  │ (queue)  │   │7 left-   │
│        │         │         │   │         │  │          │   │nav slots │
└───┬────┘         └────┬────┘   └────┬────┘  └────┬─────┘   └─────┬────┘
    │                   │             │            │               │
    └────────┬──────────┴─────────────┴────────────┴───────────────┘
             │
             ▼
   ┌───────────────────────────────────────────────┐
   │  DATA + STATE LAYERS (every surface reads)    │
   │                                                │
   │  • Capability Truth Layer  (what works)        │
   │  • Build Trace             (what agents did)   │
   │  • Build Ledger            (per-site passes)   │
   │  • Plan / Task / Run / Proof ledgers           │
   │  • Capture / Memory / Decisions                │
   │  • Cost + Usage telemetry                      │
   └───────────────────────────────────────────────┘
```

**Reading the diagram:**
- Operator Cockpit is **not a screen.** It's the umbrella name for the experience.
- Mission Control, Ops Workspace, Shay Desk, Approval Center are **screens** under the Cockpit.
- Capability Truth Layer, Build Trace, Build Ledger are **data layers** every screen reads — not screens themselves.
- The seven left-nav domains (Sites, Brainstorm, Plans, Components, Media, Research, Admin) are still the locked R1 nav. Mission Control mounts inside Sites; Ops Workspace mounts inside Admin; Shay Desk is reached through Shay's ambient presence; Approval Center mounts inside Admin.

Nothing here adds a new top-level domain. R1 is preserved.

---

## 2. The seven surfaces — defined

For each surface: question it answers · who uses it · what it is (page / workspace / panel / drawer / inspector / data layer) · data it reads · what it must NOT contain · how it avoids duplication.

### 2.1 Operator Cockpit

| Field | Value |
|---|---|
| **Question it answers** | "What is it like to operate the empire from one seat?" |
| **Who uses it** | Fritz exclusively. Agents do not "use" the Cockpit; they update what it reads. |
| **What it is** | **Umbrella experience.** Not a single page. The Cockpit is the *named whole* of how the operator runs the platform — Mission Control + Ops + Shay Desk + Approvals + the seven domains, sized for one person managing 1,000 sites. |
| **Data it reads** | All data layers, indirectly via the screens it contains. |
| **MUST NOT contain** | A "Cockpit" left-nav item. A "Cockpit" page. A "Cockpit" component that competes with Mission Control. The word *Cockpit* should never appear in a route. |
| **Anti-duplication rule** | If you find yourself building "the Cockpit screen," you're building Mission Control. Rename and stop. |

### 2.2 Mission Control

| Field | Value |
|---|---|
| **Question it answers** | "What needs Fritz right now?" |
| **Who uses it** | Fritz, on landing. Default surface when he opens Studio. |
| **What it is** | **A page.** Page-type: hybrid Library/Triage. Lives at `/sites` (the Sites domain default route). Three lanes: *needs Fritz*, *running clean*, *recently shipped*. |
| **Data it reads** | Plan/run/proof ledgers, Approval Center queue, Capability Truth Layer (red flags), Build Trace (active passes), site portfolio. |
| **MUST NOT contain** | Per-page editing, deploy buttons, prompt input, asset generation, settings forms. Mission Control routes Fritz to the right workspace; it does not *do* the work. |
| **Anti-duplication rule** | If you need a button that *does* something (build, deploy, edit), the button lives in the destination workspace and Mission Control links to it. |

### 2.3 Ops Workspace

| Field | Value |
|---|---|
| **Question it answers** | "What's running, queued, healthy, and which jobs need attention right now?" |
| **Who uses it** | Fritz when he wants the technical-ops view. Agents read/write its substrate. |
| **What it is** | **A workspace inside the Admin domain.** Page-type: Library (Jobs tab) + Settings (capability & deploy). Default sub-route: `/admin` health overview, with `/admin/capabilities`, `/admin/approvals`, `/admin/deploy-targets`, `/admin/jobs`. |
| **Data it reads** | Worker queue, job ledger, run state, Capability Truth Layer, deploy targets, secrets vault status. |
| **MUST NOT contain** | The portfolio view (that's Mission Control inside Sites). Plan-level reasoning (that's Plans). Generation surfaces (that's Media Studio). |
| **Anti-duplication rule** | If a panel is about *a single site*, it belongs in Sites. If it's about *the platform* (jobs, queues, capability, secrets, deploy targets), it belongs in Ops Workspace inside Admin. |

### 2.4 Shay Desk

| Field | Value |
|---|---|
| **Question it answers** | "What is Shay working on across the empire, what does she need from me, what should I promote?" |
| **Who uses it** | Fritz, when he wants Shay's queue and drafts. Reached *through Shay*, not via left nav. |
| **What it is** | **A page** in the Triage / Workshop page-type. Inbox-on-left of Shay's items, primary middle column showing the selected item's reasoning + draft + proof, right strip with handoff handles (approve & promote, kick back, park). |
| **Data it reads** | Shay's task queue, capture promote-candidates, memory candidates, skill registry, agent registry, presence config. |
| **MUST NOT contain** | A duplicate Approvals queue (use Approval Center). A second worker queue (use Ops). Site-specific work (use Sites). |
| **Anti-duplication rule** | Shay Desk owns *Shay's work* — drafts she made, items she's proposing. Approvals queue owns *decisions you owe the system*. Ops owns *infrastructure jobs*. They share data but each surface only *displays* its own slice. |
| **R3 preservation** | Shay remains ambient (Bubble + presence). The Desk does not promote Shay to a left-nav domain. The Desk is *Shay-as-workshop*, reached by clicking from Shay's surface, not by clicking a domain icon. |

### 2.5 Approval Center

| Field | Value |
|---|---|
| **Question it answers** | "What decisions am I owing the system?" |
| **Who uses it** | Fritz exclusively. Agents *create* approvals; they do not approve. |
| **What it is** | **A page** inside the Admin domain at `/admin/approvals`. Page-type: Triage. Cross-system queue collecting any pending approval — production deploy, expensive generation, brand-kit change, payment/auth change, DNS change, secret-bearing config change, destructive delete, parallel-write conflict. |
| **Data it reads** | The seven `hard_stop_conditions` from `plans/registry.json governance`. Approval requests created by agents, runs, capture promotions, deploy gates. Cost-threshold breaches. |
| **MUST NOT contain** | Decisions Fritz did not configure. (No surprise approvals — every approval class is registered.) Drafts (those live in Shay Desk). Run progress (that lives in Ops). |
| **Anti-duplication rule** | If a queue item is "approve a draft Shay made," it is in Shay Desk. If it is "approve a production deploy / cost / DNS change," it is in Approval Center. Same data, different surface, *different cognitive load*. |

### 2.6 Build Ledger

| Field | Value |
|---|---|
| **Question it answers** | "What did this site's build do, pass by pass, with what proof?" |
| **Who uses it** | Fritz auditing a site; Shay summarizing; agents resuming after a pause. |
| **What it is** | **Per-site data layer**, surfaced inside the Sites domain's single-site view at `/sites/<tag>/build`. Concretely: `docs/sites/<site>/MBSH-PREMIERE-BUILD-LEDGER.md` + `RUN-STATE.md` + `closeouts/PASS-N-CLOSEOUT.md` + `DECISION-LOG.md` + `COVERAGE-MATRIX.md`. |
| **Data it reads** | Pass closeouts, run states, decisions log, coverage matrix, gaps. (The MBSH ledger is the proof-of-shape.) |
| **MUST NOT contain** | Cross-site state (that's Mission Control). Generation traces (those are in Build Trace). Ledger is the *narrative* of a site's build, not the granular event log. |
| **Anti-duplication rule** | One Build Ledger *per site*. Build Trace is *per pass / per pipeline run*. Ledger summarizes; Trace records. |

### 2.7 Build Trace

| Field | Value |
|---|---|
| **Question it answers** | "Exactly what did the build pipeline do during this run, stage by stage, with what events and timings?" |
| **Who uses it** | Agents resuming or auditing; Fritz when something goes wrong. |
| **What it is** | **Cross-site data layer**, surfaced via `/api/trace` and the workflow stage catalog. The `build-intent-fulfillment-trace` plan owns its substrate. |
| **Data it reads** | Stage events emitted by `parallelBuild()` and successors. Workflow-as-data catalog. Run records. |
| **MUST NOT contain** | Site-narrative content (that's the Ledger). Approval state (that's Approval Center). Deploy results (those go to Build Trace's deploy stage records, then summarize into the Ledger). |
| **Anti-duplication rule** | One trace per run. The Build Trace is the *machine record*; the Build Ledger is the *human record* that summarizes traces with intent and outcome. |

### 2.8 Capability Truth Layer

| Field | Value |
|---|---|
| **Question it answers** | "What actually works right now, what is partial, what is stubbed, what is broken, what is manual, what costs money, what requires approval?" |
| **Who uses it** | Every other surface. The Cockpit, Mission Control, Ops, Shay Desk, Approval Center, the build engine, plan templates — all consult it. |
| **What it is** | **Data layer.** Seeded by `site-studio/lib/capability-manifest.js` + `site-studio/config/studio-capabilities.json`. Extends to: media providers, video providers, agents, MCPs, deploy targets, intelligence-loop steps, payment integrations, DNS, secrets vault, build minutes, monthly limits. |
| **Status vocabulary (locked)** | `working` · `partial` · `stubbed` · `broken` · `manual_only` · `costly` · `approval_required` |
| **MUST NOT contain** | Aspirational status. **A capability is `working` only if there is a handler AND proof.** Declared config alone counts as `stubbed`. |
| **Anti-duplication rule** | All other capability tracking (e.g. media routing rules, deploy readiness, agent registry status) inherits from this layer. There is no second capability source of truth. |

---

## 3. The relationships table

| From → To | What flows | Direction |
|---|---|---|
| Operator Cockpit → all screens | Brand & navigation context | umbrella |
| Mission Control → Sites domain | Click-through to per-site work | route |
| Mission Control → Approval Center | "X items need you" badge | read |
| Mission Control → Ops Workspace | "Y jobs running, Z stuck" badge | read |
| Mission Control → Shay Desk | "Shay has N drafts for you" badge | read |
| Mission Control → Capability Truth Layer | Red-flag indicators on the dashboard | read |
| Ops Workspace → Capability Truth Layer | Source of truth for every status pill | read |
| Approval Center → all hard-stop conditions | Owns the decision queue | read+write |
| Shay Desk → memory candidates / capture pipeline | Shay's promotion proposals land here for review | read+write |
| Build Ledger → per-site pass closeouts | Site narrative | read+write |
| Build Trace → run/event records | Machine record | read+write |
| Build Ledger → Build Trace | The Ledger references trace IDs for "what actually happened in pass N" | reference |
| Capability Truth Layer → build engine | Pre-flight check before any pass that uses a capability | gate |
| Capability Truth Layer → Approval Center | Auto-create approval when a `costly` or `approval_required` capability is invoked | gate |

---

## 4. Misconceptions to kill on sight

1. **"Operator Cockpit is the dashboard."** No. Mission Control is the dashboard. Cockpit is the umbrella experience name.
2. **"Mission Control is its own left-nav slot."** No. R1 is locked at seven domains. Mission Control mounts inside Sites at `/sites`.
3. **"Ops Workspace replaces Admin."** No. Ops Workspace is the technical-ops *workspace inside Admin*, the way Mission Control is the operator-routing *workspace inside Sites*.
4. **"Shay Desk is a left-nav domain."** No. R3 forbids it. The Desk is reached through Shay's ambient presence.
5. **"Approval Center is a Shay feature."** No. Approval Center is platform-wide; Shay creates some approval items but so do agents, runs, capture promotions, and the build engine.
6. **"Build Ledger and Build Trace are the same thing."** No. Ledger is per-site narrative; Trace is per-run machine record. They reference each other; neither is redundant.
7. **"Capability Truth Layer is the capability manifest."** Partially. The manifest is the seed. The Truth Layer extends to media routing, video, agents, MCPs, deploys, payments, monthly limits, and intelligence-loop steps. It absorbs the manifest; it does not duplicate it.
8. **"Shay is in the left nav now."** No. Shay is ambient (R3). The Desk is a page reached *through* Shay, not a domain.

---

## 5. Implementation precedence

The order in which these surfaces materialize, from highest priority (already partially live) to lowest:

1. **Capability Truth Layer** — substrate. Without it, every other surface is rendering uncertain state. Already seeded via the capability manifest. Needs extension into media, video, agents, MCPs, monthly cost.
2. **Build Trace** — substrate. Phase 1 is live (`/api/trace`, stage catalog). Phase 2 (stage/event matching, missing-stage detection) is the next implementation block.
3. **Build Ledger** — pattern proven by MBSH (build ledger + run state + closeouts). Needs to become a Studio-managed scaffold per site, not hand-authored.
4. **Approval Center** — the queue exists in `plans/registry.json governance.hard_stop_conditions`. The page does not. Mount inside Admin.
5. **Mission Control** — already partially mounted inside the legacy `index.html` shell. Needs to port into the frozen Workbench at `/sites` (Sites domain default).
6. **Ops Workspace** — `plan_2026_05_05_ops_workspace_gui` owns this. Read/freshness substrate before mutations or Jobs tab UI implementation.
7. **Shay Desk** — defined; not yet built. Inherits Triage page-type. Surfaces Shay's queue + drafts + handoffs.
8. **Operator Cockpit** — never gets implemented as a thing because it's the umbrella, not a screen.

This is the order Platform Refresh v2 expects. `FIRST-BUILD-SEQUENCE.md` operationalizes the first three.

---

## 6. Data ownership table (who writes what)

| Data | Owned by | Read by |
|---|---|---|
| Capability Truth Layer | `lib/capability-manifest.js` + extension scripts | every surface |
| Build Trace | `parallelBuild()` + workflow-as-data + `/api/trace` | Mission Control · Ops · Build Ledger |
| Build Ledger (per site) | site's pass-closeout author (Codex/Claude) writes, Studio scaffold reads | Mission Control · Sites · Shay Desk |
| Plan / Task / Run / Proof | `plans/registry.json` + `tasks/tasks.jsonl` + run records | every surface |
| Approval queue | governance + agents (create) · Fritz (decide) | Mission Control (badge) · Approval Center (page) |
| Cost + usage telemetry | provider wrappers + per-run accounting | Ops Workspace · Approval Center (cost-gate) · Mission Control (warning band) |
| Capture / memory / decisions | `captures/` + `memory/<type>/` + `decisions.jsonl` | Shay Desk · Brainstorm · Plans |
| Site state (deploy, build, ledger) | `docs/sites/<site>/...` | Sites domain · Mission Control · Build Ledger panel |

If a write goes to two places, you have a duplication problem; pick the canonical one and make the other a read mirror.

---

## 7. What this reconciliation locks

- **Operator Cockpit** is the umbrella experience name; never a route, page, or component.
- **Mission Control** is the landing screen of the Sites domain; it routes, it does not act.
- **Ops Workspace** is the technical-ops workspace inside Admin.
- **Shay Desk** is a Triage page reached through Shay; R3 preserved.
- **Approval Center** is the cross-system decision queue inside Admin.
- **Build Ledger** is per-site narrative, scaffolded from the MBSH pattern.
- **Build Trace** is per-run machine record.
- **Capability Truth Layer** is the only source of truth for what works.

When in doubt, return to this doc.
