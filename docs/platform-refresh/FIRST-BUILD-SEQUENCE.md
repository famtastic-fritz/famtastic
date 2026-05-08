# First Build Sequence

**Parent:** `STUDIO-PLATFORM-REFRESH-V2.md`
**Companions:** `STUDIO-TOOLS-AND-PROCESSES-MATRIX.md` · `WORKSTREAM-MAP.md` · `AUTONOMOUS-BUILD-OPERATING-MODEL.md`
**Purpose:** the actual order of work. What gets built first under Platform Refresh v2, why that order, what each step proves, and what the first **Studio-driven** build looks like — as opposed to the hand-built MBSH Premiere we just shipped.

---

## 1. The principle

The first build sequence is **substrate before domain, capability before screen, telemetry before policy**. The MBSH build proved that the substrate is mostly there; the missing layer is *production conversion* — the screens, gates, registries, and skills that turn a hand-built run into a Studio-driven run.

Sequence rule: each step earns its place by passing two checks:
1. **Unblocks more than one downstream item.**
2. **Has a real proof of need from MBSH** (not a hypothetical).

Items that fail either check move to Tier 2 or Tier 3.

---

## 2. The sequence (the spine)

```
Step 0  →  Approve Platform Refresh v2 + checkpoint MBSH plan
   │
Step 1  →  Capability Truth Layer extension
   │       (substrate; every surface depends on it)
   │
Step 2  →  Cost telemetry log  +  Build-credit guard
   │       (substrate; the silent failure mode that bit MBSH)
   │
Step 3  →  Build Ledger scaffold  +  Run-contract schema
   │       (per-site narrative + autonomous-build contract)
   │
Step 4  →  Approval Center (page) + cost-gate behaviors
   │       (the queue Fritz needs)
   │
Step 5  →  Mission Control port (legacy index.html → Sites domain)
   │       (the screen Fritz lands on)
   │
Step 6  →  Tier-1 QA gates (the floor for any new build)
   │       (codify the patterns MBSH proved)
   │
Step 7  →  Recipe Registry seed (cinematic / event / portfolio)
   │       (the first composable build types)
   │
Step 8  →  First Studio-driven build: Homeboy Shipping
           (the test case; proves the loop)
```

Each step is one focused workstream, each completable in 1-3 days of guarded-autonomous work. Each ends with a closeout document that the next step reads.

---

## 3. Per-step detail

### Step 0 — Approve Platform Refresh v2 + checkpoint MBSH

- **What:** Fritz approves this packet. Mark `site-mbsh-reunion` as `checkpoint_complete` for the launch arc; switch its active workstream to "MBSH V2 iteration backlog" (the 10-item list).
- **Why first:** the umbrella has to exist before agents can refer to it. The MBSH plan has to checkpoint or the registry stays stale.
- **Output:** registry update + handoff doc commit on `docs/platform-refresh-v2-cohesion`.
- **Proof:** registry shows the new workstream; closeout packet exists.
- **Mode:** manual (Fritz signs).

### Step 1 — Capability Truth Layer extension

- **What:** extend `lib/capability-manifest.js` + `studio-capabilities.json` to cover media providers (already partially in routing rules), video providers, agents, MCPs, monthly cost field, and the seven-status vocabulary (`working` · `partial` · `stubbed` · `broken` · `manual_only` · `costly` · `approval_required`). Add `cost` schema to every entry. Add the unified probe runner.
- **Why second:** every surface — Mission Control, Ops Workspace, Approval Center, Build Trace, the build engine — reads from this. Without it, every other step renders uncertain state.
- **Output:** extended manifest + probe runner + `docs/operating-rules/capability-truth-layer.md`.
- **Proof:** running the probe produces a JSON object with status + cost for every registered capability; calling code can branch on `costly` and `approval_required`.
- **Mode:** guarded-autonomous (Codex or Claude on `feat/capability-truth-layer`).

### Step 2 — Cost telemetry + build-credit guard

- **What:** create `tasks/provider-calls.jsonl` schema and writer; wrap every provider call (OpenAI, Imagen, Leonardo, Claude SVG, etc.) with the recorder. Add a Netlify build-minute probe that runs on every push and creates an Approval Center item if the account is within 80% of the limit. Surface a per-run cost report at run-end.
- **Why third:** the MBSH P7→P13 silent build-credit failure is the proof. Cost telemetry is also the data the Approval Center cost-gate consumes.
- **Output:** telemetry log writer + Netlify probe + per-run cost-report template + `docs/operating-rules/cost-telemetry.md`.
- **Proof:** a sample run records calls; sample report shows totals; a forced build-credit threshold breach surfaces an Approval item.
- **Mode:** guarded-autonomous.

### Step 3 — Build Ledger scaffold + run-contract schema

- **What:** turn the MBSH per-site directory pattern (`docs/sites/<site>/{MBSH-PREMIERE-BUILD-LEDGER, RUN-STATE, COVERAGE-MATRIX, DECISION-LOG, FAILURE-LOG, DEFERRED-ASSETS, closeouts/PASS-N-CLOSEOUT}.md`) into a Studio-managed scaffold that any new site inherits. Define the run-contract JSON shape (the nine fields from `AUTONOMOUS-BUILD-OPERATING-MODEL.md`).
- **Why fourth:** the next site needs the same skeleton MBSH had. Without scaffolding, every site re-discovers the pattern.
- **Output:** `scripts/scaffold-site.js` (or equivalent) that generates the directory; `docs/operating-rules/run-contract.md` with the schema; first scaffold applied to MBSH itself (idempotent, no overwrite).
- **Proof:** running the scaffold against a stub site name produces all expected files; running it again is a no-op.
- **Mode:** guarded-autonomous.

### Step 4 — Approval Center page + cost-gate behaviors

- **What:** build the Approval Center page inside Admin (`/admin/approvals`). Reads from `governance.hard_stop_conditions` plus the cost-telemetry breaches plus capability `approval_required` flags. UI is Triage page-type (inbox-on-left of items, middle column shows context, right strip with approve/kick-back/park).
- **Why fifth:** Steps 1-3 produce a stream of approval-needing events with no surface to display them. Step 4 closes that loop.
- **Output:** `/admin/approvals` page + drawer behavior + Mission Control's "X items need you" badge.
- **Proof:** a forced cost breach creates an approval; clicking through approves and unblocks the run.
- **Mode:** guarded-autonomous.

### Step 5 — Mission Control port

- **What:** port the working Mission Control surface from `site-studio/public/index.html` into the Workbench's Sites domain at `/sites` per the Reconciliation doc. Three lanes: *needs Fritz*, *running clean*, *recently shipped*. Reads from plan/run/proof ledgers + Approval Center + Capability Truth Layer + Build Trace.
- **Why sixth:** by Step 5 the underlying data exists; Mission Control is the reader. Doing this earlier produces a screen with no data.
- **Output:** Mission Control mounted in the Workbench foundation; legacy `index.html` reroutes to the new shell.
- **Proof:** loading `/sites` shows the three lanes with real items; clicking any item routes to the right workspace.
- **Mode:** guarded-autonomous.

### Step 6 — Tier-1 QA gates

- **What:** turn the MBSH-proven gates into runnable scripts and wire them into the build pass:
  1. Section archetype — every section has `data-mode`
  2. Character placement — medallion=center, in-scene=left, chat=right
  3. Asset alpha — every Harry/character pose is RGBA
  4. Form readability — labels readable, inputs ≥ 16px, placeholders softer
  5. Footer treatment — never default-grid CMS footer
  6. Mobile viewport (375 × 812) — every page walked
  7. Console-error / broken-image / dead-link guards
  8. Cost threshold + build-credit guards
- **Why seventh:** by Step 5 the feedback loops exist; gates need their consumers (Approval Center for breaches, Mission Control for status, Build Ledger for proof) before they're useful.
- **Output:** runnable gate scripts under `scripts/qa-gates/<gate>.js`; gate invocation hooks in the build pass; Tier-1 gate registry under `plans/qa-gate-registry.json`.
- **Proof:** running each gate against MBSH produces green; running against a deliberately-broken site produces a red Approval Center item.
- **Mode:** guarded-autonomous.

### Step 7 — Recipe Registry seed

- **What:** seed the registry with three recipes, derived from MBSH + the FRDB shipping example:
  - `cinematic_event_with_character` (the MBSH recipe)
  - `local_business_conversion` (the Homeboy Shipping recipe)
  - `portfolio_with_shop` (a forward-looking third recipe)
  Each recipe declares: base type · capability modules · polish level · per-asset-class lanes · default Tier-1 gates · default autonomy mode.
- **Why eighth:** with the substrate and gates in place, the recipe is the place to encode "what kind of build is this?" so the Build Mode screen can render it.
- **Output:** `plans/recipe-registry.json` + `docs/operating-rules/recipes.md`.
- **Proof:** picking a recipe produces a deterministic plan template + list of gates + lane defaults that the build engine consumes.
- **Mode:** guarded-autonomous.

### Step 8 — First Studio-driven build: Homeboy Shipping

- **What:** run the FRDB blueprint's recommended test case — *"I need a website for my homeboy's shipping company. He ships from Miami to the Bahamas"* — through Studio, end to end. Compare the experience to MBSH. Document where Studio carried the build vs where the operator intervened.
- **Why ninth:** the test that proves whether the previous eight steps did their job. If Homeboy Shipping ships with less manual intervention than MBSH did, Platform Refresh v2 succeeded.
- **Output:** a fully launched Homeboy Shipping site + a parallel `docs/sites/site-homeboy-shipping/` directory with the same shape MBSH has, plus a `STUDIO-DRIVEN-BUILD-COMPARISON.md` doc.
- **Proof:** the comparison doc shows fewer manual lines (compared to MBSH) at: intake, theme contract, asset alpha, form readability, footer treatment, smoke test, V2 backlog generation. Cost telemetry is non-empty; Approval Center sees real items; Mission Control routes the operator.
- **Mode:** guarded-autonomous-to-completion (the highest mode), to maximize the test signal.

---

## 4. Sequencing rationale (why this order specifically)

Three principles drive the order:

1. **Read-only before write-only.** Capability Truth Layer (read), Cost telemetry (read), Build Ledger (read) come before Approval Center (write) and Mission Control (read with action). Lock the data before building writers.
2. **Substrate before policy.** Telemetry exists before thresholds. Thresholds exist before gates. Gates exist before recipes. Recipes exist before the test build.
3. **Test signal at the end.** Step 8 is the test. If the prior seven steps weren't real, Step 8 will look exactly like MBSH did (heroic manual handholding). If they were real, Step 8 will look different (Studio-carried).

This is the same shape MBSH itself used: P0 architecture → P1–P7 build → audit → hotfix → ship. Substrate first, then build, then verify.

---

## 5. What's deliberately NOT in the first sequence

These are correct choices that show up later:

- **Component Studio v0** — Tier 2. Doesn't unblock Step 8. Lands after the first Studio-driven build proves the substrate.
- **Shay Desk page** — Tier 2. Shay's ambient presence is enough for now. The Desk is a magnification, not the floor.
- **Video Lab readiness** — Tier 3. MBSH used existing video; Homeboy Shipping doesn't need bespoke video for V1.
- **Theme Contract / Page Purpose Map / Scene Board / Asset Board / Character Board screens** — Tier 2. Their substrate is the Build Ledger and Recipe Registry; the screens come later.
- **Logo Lab / Hero Image / Adobe Handoff sub-workspaces** — Tier 2.
- **Public-site assistant character creation tool** (generalize Hi-Tide Harry → other mascots) — Tier 3.
- **Cross-site decision registry** — Tier 3.
- **Monthly improvement engine** — Tier 3.

If a contributor proposes adding any of these to Tier 1, the answer is: "Show me how it unblocks Step 8 better than the current Tier 1 list. If it doesn't, it's Tier 2."

---

## 6. Estimated cadence

Approximate, optimistic-realistic:

| Step | Cadence | Cumulative |
|---|---|---|
| 0 — Approve + checkpoint | half day | 0.5d |
| 1 — Capability Truth Layer extension | 2 days | 2.5d |
| 2 — Cost telemetry + build-credit guard | 2 days | 4.5d |
| 3 — Build Ledger scaffold + run-contract schema | 1.5 days | 6d |
| 4 — Approval Center page | 2 days | 8d |
| 5 — Mission Control port | 2 days | 10d |
| 6 — Tier-1 QA gates | 3 days | 13d |
| 7 — Recipe Registry seed | 1.5 days | 14.5d |
| 8 — Homeboy Shipping test build | 4-6 days | 19-21d |

Roughly three weeks of guarded-autonomous work to land the substrate + first Studio-driven build. Each step ends with a closeout doc; the operator can pause between any two without losing state.

---

## 7. What success looks like at Step 8

After Homeboy Shipping ships under Platform Refresh v2:

1. **Mission Control** showed the build's progress without Fritz reading per-pass closeouts manually.
2. **Approval Center** carried at least one cost approval and one production-deploy approval.
3. **Capability Truth Layer** caught at least one capability degradation (rate limit, key issue, provider outage) before it became a silent failure.
4. **Build Ledger** auto-scaffolded and the agent filled it pass-by-pass with the same shape MBSH used by hand.
5. **Tier-1 QA gates** caught at least one regression (a missing `data-mode`, a non-RGBA pose, a sub-16px input) without an audit pass.
6. **Recipe** drove the build; agents *consulted* the recipe rather than re-inventing the architecture.
7. **Cost telemetry** produced a per-run cost report that shows the actual cost of running this site through Studio.
8. **Learning extraction** wrote V2 patterns automatically (or at least with significantly less hand-authoring than MBSH took).

If even three of those eight are true, Platform Refresh v2 is real. If all eight are true, the platform has crossed a threshold — Studio is now the build, not the assistant.

---

## 8. What this doc locks

- The **first sequence is eight steps**, not nine, not seven.
- **Step 8 is the test** — Homeboy Shipping. Without Step 8, Steps 1-7 are theory.
- **Cadence is roughly three weeks** — enough to be meaningful, not so long that it loses momentum.
- **Tier 2 + Tier 3 wait** until Step 8 ships.

If the sequence reorders, the reason gets written down.
