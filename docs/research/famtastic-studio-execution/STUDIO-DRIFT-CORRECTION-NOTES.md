# FAMtastic Studio — Drift Correction Notes

**Date:** 2026-05-10
**Phase:** 5 of 5 (drift-correction realignment)
**Status:** Standing rule — applies to all future agents and sessions

This note documents a real product-direction drift, codifies the corrected direction, and gives future agents a hard rule so the same drift doesn't recur.

---

## What drift happened

Across the sessions immediately preceding this realignment, work narrowed onto **Mission Control / Operator Workspace** (`/operator.html`, intelligence-routes, intelligence-actions, operator action layer bug, browser smoke, etc.). The work itself was good and shipped real value (commits `ff9ae42` operator action layer, plus the verified browser smoke). But it created a **product-shape distortion**:

1. The Operator Workspace started looking like the Studio.
2. The cross-section workflows (Sites, Site Builder, Think-Tank, Research, Component Studio, Media Studio, Media Library, Shay, Settings) lost foreground attention.
3. Newer planning artifacts began to assume Mission Control = home, with everything else as side panels.
4. The IA stopped reflecting the platform Fritz actually needs to use.

This is a classic narrowing pattern: when one section has a concrete bug to fix, attention compounds there, and the rest of the surface area dims.

---

## Why Mission Control became too dominant

A few honest reasons, all real:

1. **It was the most-real section.** The intelligence read/write routes, action layer, ledger writer, and proof packets are the deepest, most-tested code in Studio. When agents look for "where is real work happening?" Mission Control answers strongest.

2. **It had the active bug.** The "Start Refinement Run does nothing" thread pulled multiple sessions into Operator. That's appropriate triage; the drift is what came *after* the fix.

3. **Operator's vocabulary is contagious.** Run ledgers, proof packets, capability truth, blockers, learning candidates — these are powerful concepts. They're easy to over-apply and start treating as the platform's frame instead of one section's frame.

4. **The other sections didn't have working UIs.** Without a real Sites Dashboard or Component Studio screen to anchor work in, agents naturally returned to the screen that did work.

5. **No standing IA document.** Until this realignment, there was no single doc declaring "the platform is twelve sections; Mission Control is one." The implicit IA in agent sessions floated.

None of these reasons are personal failings. They're predictable failure modes of compound work without a fixed reference.

---

## Corrected product direction

FAMtastic Studio is a **platform** with **twelve top-level sections**, in this order:

1. Home
2. Sites
3. Site Builder
4. Site Settings
5. Think-Tank / Brainstorm
6. Research Center
7. Component Studio
8. Media Studio
9. Media Library
10. Shay Shay
11. Mission Control
12. Settings

**Mission Control is one section.** It is the operator workspace. It exposes intelligence brief, capability truth, run ledger, proof packet, cost/approval, blockers, learning candidates, and visual flow — all per-run. It is not the home. It does not own Sites listings, component libraries, media libraries, research briefs, or settings. Those have their own sections.

The full IA is in `FAMTASTIC-STUDIO-PLATFORM-IA-AND-FUNCTIONAL-MAP.md`. The implementation plan is in `STUDIO-DESIGN-TO-IMPLEMENTATION-PLAN.md`. The cross-section workflows are in `FAMTASTIC-STUDIO-WORKSPACE-RECIPES.md`. The design source is in `docs/design/famtastic-studio/` with the ingest report at `DESIGN-INGEST-REPORT.md`.

---

## Standing rule for future agents

> **Platform sections come first. Mission Control is one section only.**

Operationalize this rule:

### When picking what to work on
- Default scope is "the platform." Before narrowing to a single section, name which platform jobs (from the IA doc) the work serves.
- If a session naturally ends with Mission Control as the only thing touched, the next session should explicitly start somewhere else (Sites, Component Studio, Media, Research, Shay).

### When making a UI change
- Ask: "Is this change in the section the user is currently looking at?" If the answer is "I'm extending Mission Control to cover X (where X is Sites/Components/Media/Research)," **stop and route X to its own section**.
- Mission Control's surface is the run-centric view. If a card stops being run-centric, it doesn't belong there.

### When writing planning docs
- The 12-section nav is the canonical IA. Don't write planning docs that imply a different IA without first amending the IA doc.
- Operator vocabulary (run ledger / proof packet / capability truth / blockers / learning candidates) is **per-run**. When applying that vocabulary platform-wide, label it as a generalization and tag it for IA review.

### When triaging bugs
- A bug in Mission Control is a Mission Control bug. Fix it there.
- A bug that *touches* Mission Control but originates elsewhere (e.g. a Site Builder action that creates a malformed run) gets fixed in the originating section.

### When writing tests / smokes
- Smokes for Mission Control belong under `site-studio/server/__smoke__/operator-*`.
- Smokes for other sections belong under their own namespace (`__smoke__/sites-*`, `__smoke__/components-*`, `__smoke__/media-*`).
- Don't fold Sites/Components/Media tests into operator smokes.

### When the user describes a need
- Translate the need to the right section first, then plan within that section.
- If the need spans multiple sections, name the recipe (one of the five in the recipes doc) before doing any code.

### Trip-wires that suggest drift is recurring
- Three sessions in a row that only touch `operator.html`, `intelligence-*.js`, or `ops-api.js` files.
- Planning docs that describe Mission Control sub-tabs and never mention Sites/Builder/Media/Research/Components/Shay.
- A run-id in a place a run-id shouldn't be (e.g. tied to a Sites listing).
- Mission Control card being added that doesn't reference a `run_id`.

If a trip-wire fires: **stop, re-read this note and the IA doc, and pick the next move from a different section.**

---

## What this realignment pass produced

Five docs, in this order:

1. `docs/design/famtastic-studio/DESIGN-INGEST-REPORT.md` — what's in the design ZIP, what the template is, where it diverges from the platform spec.
2. `docs/research/famtastic-studio-execution/FAMTASTIC-STUDIO-PLATFORM-IA-AND-FUNCTIONAL-MAP.md` — the canonical 12-section IA with full per-section functional map.
3. `docs/research/famtastic-studio-execution/FAMTASTIC-STUDIO-WORKSPACE-RECIPES.md` — five named cross-section recipes (New Site, Media-to-Component, Component-to-Site, Research-to-Build, Shay routing) and the visual-flow contract.
4. `docs/research/famtastic-studio-execution/STUDIO-DESIGN-TO-IMPLEMENTATION-PLAN.md` — how to land the design as a parallel shell without breaking existing Studio; ordered 14-item build-first checklist.
5. `docs/research/famtastic-studio-execution/STUDIO-DRIFT-CORRECTION-NOTES.md` — this file.

No code changes. Mapping/spec only.

---

## Acceptance — Phase 5

- [x] Drift documented honestly (what happened, why, no scapegoating).
- [x] Corrected product direction stated.
- [x] Standing rule stated and operationalized for future agents.
- [x] Trip-wires for drift detection enumerated.
- [x] Cross-references to the four other realignment docs in this pass.
