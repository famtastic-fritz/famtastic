# Studio Platform Refresh v2 — Umbrella

**Tag:** `platform-refresh-v2`
**Branch:** `docs/platform-refresh-v2-cohesion`
**Status:** consolidation packet — read-only planning, no code, no UI, no plan-registry rewrite
**Authored:** 2026-05-08, immediately after MBSH Premiere production launch

---

## 0. The 30-second version

FAMtastic Site Studio has accumulated **eight overlapping control-surface ideas** (Operator Cockpit, Mission Control, Ops Workspace, Shay Desk, Build Ledger, Build Trace, Capability Truth Layer, Approval Center), **eight active parent plans**, and a freshly-shipped MBSH Premiere site whose build process is the strongest available proof of what Studio actually has to do.

This packet does three things:

1. **Reconcile** the control surfaces into one coherent operating model — Operator Cockpit as the umbrella, Mission Control as its main screen, the rest as named layers underneath.
2. **Reverse-engineer MBSH** into a single audit of every Studio capability the build needed (already exists / partial / manual / missing / should become a registry entry / should become a Studio screen).
3. **Lock the architecture** for long-running autonomous builds, API/cost governance, Media Studio, Component Studio, Shay Desk, the Site Assistant component, and the intelligence loop — as **child workstreams under a single Platform Refresh v2 umbrella**, not as parallel side features.

The goal is to leave a written record that any agent (Claude, Codex, future hires) can pick up cold and start working from, without re-discovering the same decisions.

---

## 1. The umbrella

```
Platform Refresh v2  (this packet)
│
├── A. Control Surface Reconciliation
│     Operator Cockpit, Mission Control, Ops Workspace, Shay Desk,
│     Approval Center, Build Trace, Capability Truth Layer
│
├── B. Autonomous Build Operating Model
│     Long-running agent builds with proof checkpoints, cost guardrails,
│     stop conditions, learning extraction
│
├── C. API + Cost + Usage Governance
│     Per-provider tracking, cost estimate before generation, monthly
│     summary, cheap/premium lane selection, approval gate
│
├── D. Media Studio Scope
│     Logo Lab, Hero, Background Video (still→i2v→loop), Asset Library,
│     Brand Kit, Adobe handoff
│
├── E. Component Studio Scope
│     HTML/CSS/JS sandbox v0, live preview, variants, promote-to-library
│
├── F. Shay Domain / Shay Desk Scope
│     Ambient + Bubble + Desk, with future orb/avatar/themed presence
│
├── G. Site Assistant Component Scope
│     Generalized Hi-Tide Harry — bounded, shippable, per-site
│
├── H. Capability Truth Layer
│     working / partial / stubbed / broken / manual / costly / approval-required
│
├── I. Intelligence Loop Audit
│     capture → retrieve → apply → verify, tested against MBSH learnings
│
└── J. Plan Registry Reconciliation
      What stays, what gets absorbed, what gets superseded
```

Every existing concept, plan, screen, and tool is one of those ten branches. Nothing is freelance.

---

## 2. Why this packet exists right now

The MBSH Premiere site shipped to `https://mbsh96reunion.com` on 2026-05-08 after a 13-pass guarded-autonomous build (P0 → P13) plus an audit and a Final Reel + dirty-image hotfix. The build proved a lot:

1. **Studio can carry a long autonomous build to production** if the operator gates, cost stops, and proof checkpoints are explicit.
2. **The intelligence loop has receipts** — section archetypes, Harry placement rule, Final Reel footer, asset alpha pipeline, form readability, FX opacity guard, site-assistant FAQ pattern. These are *real* learnings, not aspirational ones.
3. **The control surfaces are not yet aligned** with each other or with the build. There is a Workbench foundation, a separate `index.html` shell, a planned Ops Workspace, a Shay Desk concept, a Build Ledger, a Build Trace, a Capability Manifest, and an Approvals queue. They overlap.
4. **There is no first-class cost governance.** Image generation, video generation, model selection, Netlify build minutes, and Adobe handoff are tracked in scattered places.
5. **The plan registry has eight active parents.** Several feed into each other but none of them name themselves "Platform Refresh v2." That is a missing umbrella, not a missing plan.

This packet locks the umbrella, reconciles the surfaces, and audits MBSH so the next build (the shipping company test, MBSH V2 iteration, or any new site) starts from one operating model.

---

## 3. What this packet IS, and IS NOT

**This packet IS:**
- The umbrella that names every in-flight platform workstream as a child of Platform Refresh v2
- The cross-reference any agent reads before designing a new screen, plan, or capability
- The reconciliation between Operator Cockpit / Mission Control / Ops / Shay Desk / Approval Center / Build Trace / Capability Truth Layer
- The reverse-engineering of MBSH into a Studio-capability gap analysis
- The basis for the next build sequence

**This packet is NOT:**
- A specification (specs cite this; this doesn't replace them)
- A mockup (mockups cite this; this doesn't replace them)
- A plan-registry rewrite (rewrites are tracked separately; this only *recommends* registry changes)
- A re-litigation of `docs/STUDIO-UI-FOUNDATION.md` (the four foundational rules, the seven domains, the page rule, and the night scheme remain frozen)

If anything in this packet contradicts the locked Studio UI Foundation, the Foundation wins and this packet is wrong.

---

## 4. Locked decisions inherited (do not relitigate)

These are already frozen elsewhere. They constrain everything in this packet:

- **R1**: Left nav is **seven domains only** (Sites, Brainstorm, Plans, Components, Media, Research, Admin). Not modes. Not actions. Not site items.
- **R2**: Workspace reacts to left nav. Each workspace declares its own tools.
- **R3**: **Shay is ambient, not a left-nav domain.** She has Bubble + Desk presence; she is not a domain.
- **R4**: The Fritz filter — every pixel earns its keep against five values (saves a click / runs without him / makes money / compounds learning / prevents a mistake).
- **The Page Rule**: a new page is justified only when distinct intent + distinct primary surface + persists context independently + earns its slot — *all four*.
- **Night Scheme** is the locked visual language.
- **Six page-types** classify every existing surface (Library, Creation Canvas, Workshop, Triage, Settings, Editor-with-Chat).
- **Six hard-stop conditions** in `plans/registry.json governance`: destructive delete, production deploy, payment/auth change, DNS change, expensive media/API, parallel-write scope conflict, secret-bearing config change.

This packet builds *on top of* those decisions, never around them.

---

## 5. New decisions this packet locks

These are the locks Platform Refresh v2 introduces, scoped to platform architecture (not UI rules):

### D1. Operator Cockpit is the umbrella; Mission Control is the screen.

"Operator Cockpit" names the **whole experience** of operating the empire from one operator's seat. **Mission Control** is its **landing screen** — the answer to "what needs Fritz right now?" Ops Workspace, Shay Desk, Approval Center, Build Trace, Capability Truth Layer are **layers underneath**, not peers competing with Mission Control.

Mission Control mounts inside the **Sites** domain on the portfolio default route. It is not a new left-nav slot.

### D2. Long-running autonomous builds are core architecture, not a side feature.

The MBSH P0→P13 arc is the proof. The Studio's job is to make this kind of build **reproducible** with explicit objectives, branch isolation, proof checkpoints, cost stops, and learning extraction. Every plan template inherits this.

### D3. API + cost + usage governance is first-class.

It gets a Capability-Manifest-class status surface (working / partial / costly / approval-required), a per-run cost report, a monthly summary, a "cheap lane / premium lane" selector, and an approval gate before any generation that crosses the cost threshold.

### D4. Capability Truth Layer is the source of truth for what works.

Declared config alone does not count. A capability is **working** only when handler + proof exist. Anything else is `partial`, `stubbed`, `broken`, `manual`, `costly`, or `approval-required`. The capability manifest already at `site-studio/lib/capability-manifest.js` is the seed; the Truth Layer extends it to media, video, agents, MCPs, deploy, and intelligence-loop steps.

### D5. Site Assistant is a shippable component, not a one-off.

Hi-Tide Harry generalizes into a reusable component with assistant tiers, character config, FAQ, page hints, fallback collector, safe page actions, refinement loop. It is **bounded** (per-site) — not as deep as Shay (cross-empire). The two never fight for the same scope.

### D6. Shay Desk gets a home, but Shay stays ambient.

R3 is preserved: Shay is not a left-nav domain. But Shay Desk earns its own surface — Triage / Workshop page-type — for queue, drafts, proof, handoffs, memory candidates, skills, agent routing, and presence configuration. The Desk is reached *through Shay*, not *by clicking a domain*.

### D7. Plan Registry Reconciliation, not rewrite.

This packet *recommends* registry changes (absorb, supersede, keep independent) but does not modify `plans/registry.json`. Rewrites require their own review.

---

## 6. The ten deliverables

| # | Doc | Question it answers |
|---|---|---|
| 1 | `STUDIO-PLATFORM-REFRESH-V2.md` (this) | What is the umbrella? |
| 2 | `CONTROL-SURFACE-RECONCILIATION.md` | Cockpit vs Mission Control vs Ops vs Shay Desk vs Approvals vs Trace vs Truth Layer — who owns what? |
| 3 | `MBSH-AS-STUDIO-BUILD-AUDIT.md` | What capabilities did MBSH need? Which exist? Which are manual? Which are missing? |
| 4 | `AUTONOMOUS-BUILD-OPERATING-MODEL.md` | How does the platform run a multi-day agent build safely? |
| 5 | `API-COST-USAGE-GOVERNANCE.md` | How does the platform track and cap cost across providers? |
| 6 | `STUDIO-TOOLS-AND-PROCESSES-MATRIX.md` | The full inventory: tool/process × status × ownership. |
| 7 | `WORKSTREAM-MAP.md` | How the umbrella's ten branches connect to plan-registry parents. |
| 8 | `FIRST-BUILD-SEQUENCE.md` | What gets built first under Platform Refresh v2 — and why. |
| 9 | `INTELLIGENCE-LOOP-AUDIT.md` | Does the loop actually capture, retrieve, apply, and verify? Tested against MBSH. |
| 10 | `REFRESH-READY-HANDOFF.md` | A self-contained handoff that pastes into a fresh chat and reproduces this state. |

Each doc is read alone. The umbrella (this) lets you find the right one.

---

## 7. Read order

If you have 10 minutes: read this doc + § 2 + § 5 of `CONTROL-SURFACE-RECONCILIATION.md` + the table in `MBSH-AS-STUDIO-BUILD-AUDIT.md`.

If you have 30 minutes: add `AUTONOMOUS-BUILD-OPERATING-MODEL.md` + `API-COST-USAGE-GOVERNANCE.md`.

If you're picking up the work: also `WORKSTREAM-MAP.md` + `FIRST-BUILD-SEQUENCE.md` + `INTELLIGENCE-LOOP-AUDIT.md`.

If you're a fresh agent on a new chat: paste `REFRESH-READY-HANDOFF.md` into your first message and start there.

---

## 8. What success looks like

A fresh agent or Fritz, three weeks from now, can:

1. Look at the platform and **name** every surface (Cockpit, Mission Control, Ops, Shay Desk, etc.) without confusion about overlap.
2. Look at any new ask ("build me a shipping site") and know **which Studio screens, registries, agents, and gates** would carry it.
3. Look at any tool and know whether it's **working / partial / manual / missing / costly / approval-required** without guessing.
4. Look at any plan and know whether it's a **child of Platform Refresh v2** or independent — and why.
5. Reproduce the **MBSH Premiere build pattern** without re-discovering the section archetype system, the Harry placement rule, the Final Reel footer, the form readability standard, or the FX opacity calibration.

If those five things are true, the umbrella did its job.
