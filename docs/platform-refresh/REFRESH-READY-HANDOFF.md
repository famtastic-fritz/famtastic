# Platform Refresh v2 — Refresh-Ready Handoff

**Paste this entire file into the first message of a fresh chat. It will reproduce the state.**

> **2026-05-11 reconciliation note:** this handoff captures the original read-only Platform Refresh v2 packet. A newer `/studio.html` implementation branch (`research/studio-intelligence-foundation-20260508`) introduces a 12-section Studio shell and partially supersedes the old seven-domain Workbench/R1 navigation assumption. Before executing feature work, read `docs/platform-refresh/PLATFORM-REFRESH-V2-IMPLEMENTATION-RECONCILIATION.md` and reconcile the active branch/worktree state.

---

## 0. What you are looking at

You are picking up the FAMtastic Site Studio platform mid-refresh. The MBSH Class of '96 reunion site shipped to production at `https://mbsh96reunion.com` on **2026-05-08** (commit `eb1dd08`), proving that the platform's substrate works. A consolidation packet exists at `docs/platform-refresh/` (this directory) that names the umbrella, reconciles eight overlapping control-surface ideas, audits MBSH as a Studio build, locks the autonomous-build operating model, locks API/cost governance, and orders the first build sequence under Platform Refresh v2.

This handoff doc is the single page you read to **resume the refresh from a cold start.**

---

## 1. The umbrella, in one sentence

**Platform Refresh v2** is the consolidation that turns the eight scattered control-surface ideas (Operator Cockpit, Mission Control, Ops Workspace, Shay Desk, Approval Center, Build Ledger, Build Trace, Capability Truth Layer) into one coherent operating model under a single named umbrella, with autonomous builds and API cost governance as core architecture, child workstreams hanging off it, and the first build sequence ending in the Homeboy Shipping test case.

---

## 2. The locked decisions

Read these and stop relitigating them:

1. **Operator Cockpit is the umbrella experience name.** Never a route, page, or component.
2. **Mission Control is the landing screen of the Sites domain** at `/sites`. Three lanes: needs-Fritz, running-clean, recently-shipped. It routes; it doesn't act.
3. **Ops Workspace is the technical-ops workspace inside Admin.** Capability manifest, jobs, approvals, deploy targets, cost summary, provider health.
4. **Shay Desk is a Triage page reached *through* Shay**, not a left-nav domain. R3 of `docs/STUDIO-UI-FOUNDATION.md` is preserved.
5. **Approval Center is the cross-system decision queue** inside Admin at `/admin/approvals`.
6. **Build Ledger is per-site narrative** (the MBSH `RUN-STATE` + closeouts pattern). **Build Trace is per-run machine record** (`/api/trace`). They reference each other; neither is redundant.
7. **Capability Truth Layer is the only source of truth** for what works. Status vocabulary: `working` · `partial` · `stubbed` · `broken` · `manual_only` · `costly` · `approval_required`. Declared config alone does not count as `working`.
8. **Autonomous builds are core architecture.** Every build declares the **nine-field run contract**.
9. **API cost is first-class governance.** Cheap lane is the default; cost estimate before generation; soft/hard thresholds; Approval Center cost-gate.
10. **Site Assistant is a shippable component**, generalizing Hi-Tide Harry. Per-site, bounded; not as deep as Shay.
11. **R1 frozen domains:** Sites, Brainstorm, Plans, Components, Media, Research, Admin. **R2** workspace reacts to nav. **R3** Shay is ambient. **R4** Fritz filter on every pixel. (Per `docs/STUDIO-UI-FOUNDATION.md`.)

---

## 3. The packet (read in this order)

| # | Doc | Why you read it |
|---|---|---|
| 1 | `docs/platform-refresh/STUDIO-PLATFORM-REFRESH-V2.md` | The umbrella. Names the ten branches, locks D1–D7, sets the read order. |
| 2 | `docs/platform-refresh/CONTROL-SURFACE-RECONCILIATION.md` | Defines Cockpit / Mission Control / Ops / Shay Desk / Approval Center / Build Ledger / Build Trace / Capability Truth Layer with anti-duplication rules. |
| 3 | `docs/platform-refresh/MBSH-AS-STUDIO-BUILD-AUDIT.md` | The capability table. 74 capabilities × status × should-become. The strongest evidence for what Studio actually has to do. |
| 4 | `docs/platform-refresh/AUTONOMOUS-BUILD-OPERATING-MODEL.md` | Nine-field run contract · five autonomy modes · three pause classes · five proof types · nine dangerous-action gates · final handoff report. |
| 5 | `docs/platform-refresh/API-COST-USAGE-GOVERNANCE.md` | Provider universe · cost-extended Capability Truth Layer · six cost UI surfaces · three thresholds · routing rules · telemetry schema. |
| 6 | `docs/platform-refresh/STUDIO-TOOLS-AND-PROCESSES-MATRIX.md` | The inventory — every tool/screen/registry/agent/MCP/gate/process × status × tier. |
| 7 | `docs/platform-refresh/WORKSTREAM-MAP.md` | The umbrella's branches mapped onto eight existing parent plans + six recommended new child plans (N1–N6). |
| 8 | `docs/platform-refresh/FIRST-BUILD-SEQUENCE.md` | The eight steps to ship the first Studio-driven build. Step 8 is the Homeboy Shipping test. |
| 9 | `docs/platform-refresh/INTELLIGENCE-LOOP-AUDIT.md` | Capture (✅) / Retrieve (🟡) / Apply (❌) / Verify (❌) — tested against the eight MBSH learnings. |
| 10 | `docs/platform-refresh/REFRESH-READY-HANDOFF.md` | (this file) |

---

## 4. The state of the world (5 facts)

1. **MBSH Premiere is live in production** at `https://mbsh96reunion.com` (`eb1dd08` on `main`; rollback point `a317dc37`).
2. **Eight active parent plans** in `plans/registry.json`. None named Platform Refresh v2 yet — the umbrella is a packet, not a registry rewrite.
3. **The Workbench foundation is partially live**: Sites + Plans + bottom panels work; Brain/Components/Media/Research/Admin are placeholders. (See `docs/STUDIO-SHELL-RECONCILIATION-2026-05-05.md`.)
4. **A legacy `index.html` shell** still hosts Mission Control and Ops; the port is Step 5 of the first build sequence.
5. **The capture pipeline works** (`fam-hub capture extract` → `captures/inbox/`). The retrieve / apply / verify halves do not exist yet.

---

## 5. The recommended six new child plans (review-only — do not register without Fritz)

| ID | Role | Parent | Scope |
|---|---|---|---|
| N1 `plan_2026_05_08_api_cost_governance` | governance/substrate | Platform Refresh v2 | cost telemetry, thresholds, Approval Center cost-gate, lane defaults |
| N2 `plan_2026_05_08_capability_truth_layer` | substrate | Platform Refresh v2 | extend manifest into media/video/agents/MCPs/monthly cost; status vocabulary; cost field; provider probe |
| N3 `plan_2026_05_08_site_assistant_component` | domain (Components) | `studio-workbench-foundation` | generalize Hi-Tide Harry into a reusable Site Assistant Component |
| N4 `plan_2026_05_08_qa_gate_registry` | substrate | Platform Refresh v2 | Tier-1 gates (section archetype, character placement, asset alpha, form readability, footer treatment, mobile viewport, console error, broken image, dead link, cost threshold, build credit) |
| N5 `plan_2026_05_08_recipe_registry` | substrate | Platform Refresh v2 | seed cinematic / event / portfolio / shipping recipes |
| N6 `plan_2026_05_08_intelligence_loop_close_the_loop` | substrate | `plan_2026_05_05_chat_capture_learn_optimize` | retrieve / apply / verify; pattern + skill registry |

---

## 6. Existing plans — disposition

- `studio-workbench-foundation` — STAYS (chassis)
- `plan-task-run-intelligence` — STAYS (substrate)
- `build-intent-fulfillment-trace` — STAYS (substrate; owns Build Trace and Build Ledger scaffold)
- `site-mbsh-reunion` — **CHECKPOINT recommended.** Premiere arc complete; switch active workstream to "MBSH V2 iteration backlog" (10 items in `docs/sites/site-mbsh-reunion/V2-LEARNINGS-AND-PATTERNS.md` § 9).
- `plan_2026_05_05_ops_workspace_gui` — STAYS (domain inside chassis; absorbs Approval Center, Cost summary, Provider health)
- `plan_2026_05_05_platform_site_promotion` — STAYS (substrate; owns Smoke Test registry + rollback recipe)
- `plan_2026_05_05_chat_capture_learn_optimize` — STAYS (substrate; gains N6 child)
- `plan_2026_05_05_agent_coordination` — STAYS (governance; gains autonomy ladder + dangerous-action gates)
- `plan_2026_05_05_workbench_per_page_design` — STAYS (research role; feeds chassis)

---

## 7. The first build sequence (8 steps, ~3 weeks)

1. **Approve Platform Refresh v2 + checkpoint MBSH** *(half day, manual)*
2. **Capability Truth Layer extension** *(2 days)*
3. **Cost telemetry + build-credit guard** *(2 days)*
4. **Build Ledger scaffold + run-contract schema** *(1.5 days)*
5. **Approval Center page + cost-gate behaviors** *(2 days)*
6. **Mission Control port** *(2 days)*
7. **Tier-1 QA gates** *(3 days)*
8. **Recipe Registry seed** *(1.5 days)*
9. **First Studio-driven build: Homeboy Shipping** *(4-6 days)* — the test that proves the previous seven steps were real.

Reasoning + per-step detail: `FIRST-BUILD-SEQUENCE.md`.

---

## 8. The eight MBSH learnings to carry forward

(All captured in `docs/sites/site-mbsh-reunion/V2-LEARNINGS-AND-PATTERNS.md`. None yet retrievable, applied, or verified at the platform level. Recommendation N6 closes the loop.)

1. Section archetype system (Scene / Sequence / Tease)
2. Harry placement rule (medallion=center, in-scene=left, chat=right)
3. Final Reel footer pattern
4. Asset alpha pipeline (RGBA, no white halos)
5. Form readability standard (16px iOS guard, cream-on-glass, italic placeholder)
6. FX overlay opacity guard (≤ 0.15)
7. Site assistant FAQ + fallback collector
8. V2 backlog model (10 items per launch, captured at handoff time)

---

## 9. The hard rules (non-negotiable on this work)

- **No production code changes from the platform-refresh packet itself.** Read-only consolidation.
- **No UI implementation in this branch.** Specs cite this packet; this packet doesn't replace specs.
- **No plan-registry rewrite.** The packet *recommends*; only Fritz approves a rewrite.
- **Preserve R1–R4 + Page Rule + Six page-types + Night Scheme** from `docs/STUDIO-UI-FOUNDATION.md`.
- **Preserve the seven `hard_stop_conditions`** from `plans/registry.json governance`.
- **Cheap lane is the default for every recipe** unless explicitly declared premium.
- **Approval Center for every cross-system decision** — never inline-deciding without the queue entry.
- **MBSH is a shipped site AND a pattern-mining source** — both at once.
- **Long-running autonomous builds are core architecture** — not a side feature.

---

## 10. If you are an agent picking up this work — your first six actions

1. `git checkout docs/platform-refresh-v2-cohesion` (or whatever the latest refresh branch is named)
2. Read the ten docs in `docs/platform-refresh/` in the order listed in § 3.
3. Run `node scripts/agent-checkin.js --intent "<your intent>"` to claim a scope-lock per `AGENT-COORDINATION.md`.
4. Decide which step of `FIRST-BUILD-SEQUENCE.md` is in scope for this run.
5. Open the **run-contract** for that step (the nine-field shape from `AUTONOMOUS-BUILD-OPERATING-MODEL.md` §2). If the contract cannot be fully filled, the step is not autonomous-ready — escalate to manual mode and ask Fritz.
6. Execute under guarded-autonomous mode with explicit proof checkpoints + Approval Center hard stops.

---

## 11. If you are Fritz — your first three decisions

1. **Approve the umbrella.** Either accept the packet as-is, or list the changes you want and we update.
2. **Approve checkpointing the MBSH plan** (the launch arc is complete; the V2 iteration backlog is the new active workstream).
3. **Approve / re-order the first build sequence.** The proposed order is substrate before domain (Steps 1-4) → Mission Control + gates (Steps 5-7) → Recipe Registry (Step 8) → Homeboy Shipping test (Step 9). If you want a different order, name it now.

After those three decisions, the next agent runs Step 0 + Step 1 under guarded-autonomous mode.

---

## 12. Open questions (carried forward, not blocking)

- Is "Brainstorm" the final domain name? (UI Foundation §10 §1)
- Does Sites need a "Stages" mode? (UI Foundation §10 §2)
- Where does the Capability Truth Layer page live — Admin (current) or its own slot? **Recommendation: Admin per R1.** (UI Foundation §10 §3)
- CMD-K scope — across all domains or active workspace only? **Recommendation: across all, active first.** (UI Foundation §10 §4)
- Which provider takes priority on cheap lane for hero stills — OpenAI Responses or Imagen 4? *Both are validated; let the recipe decide.*

---

## 13. The success bar

You'll know this refresh worked when:

- An agent or Fritz can name **every control surface** without confusion about overlap.
- Any new ask routes to **a known screen, registry, agent, gate, or skill**.
- Any tool's status (`working` / `partial` / `costly` / `approval_required`) is **read-only and trustworthy**.
- The next build (Homeboy Shipping) ships with **less manual handholding** than MBSH did, with **automated gates catching regressions** that MBSH had to find by audit.
- The intelligence loop produces **at least one verified-improved learning** carry-through from MBSH to Homeboy Shipping.

If those five are true after Step 9, Platform Refresh v2 succeeded.

---

**End of handoff. Paste this into a fresh chat to resume from cold.**
