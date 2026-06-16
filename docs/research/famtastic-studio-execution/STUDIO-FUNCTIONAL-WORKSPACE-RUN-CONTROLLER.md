# FAMtastic Studio — Functional Workspace Run Controller

**Date:** 2026-05-10
**Branch:** `research/studio-intelligence-foundation-20260508`
**Status:** Active
**Companion to:** `STUDIO-FUNCTIONAL-WORKSPACE-RUN-REPORT.md` (final report)

This is the controller for the lane-based run that turns the existing
unified Studio shell at `/studio.html` from a layout-complete shell into
an operational workspace. Source-of-truth for every decision is the five
realignment docs (`DESIGN-INGEST-REPORT`, `PLATFORM-IA-AND-FUNCTIONAL-MAP`,
`WORKSPACE-RECIPES`, `DESIGN-TO-IMPLEMENTATION-PLAN`, `DRIFT-CORRECTION-NOTES`)
plus the prior run reports (`STUDIO-SHELL-END-TO-END-RUN-REPORT.md`,
`STUDIO-SHELL-COWORK-VERIFY-REPORT.md`).

---

## 1. Orchestrator role

The orchestrator is responsible for:

1. **Prep** — `.wolf/{anatomy,cerebrum,buglog}` reads, `agent-checkin.js`,
   the seven required execution docs, current-state inventory, this controller.
2. **Lane dispatch** — sends each Lane A–G as an independent agent task
   with self-contained context, strict file-ownership scope locks, and a
   per-lane proof requirement.
3. **Integration** — once each lane returns, reads its produced files,
   resolves any cross-lane conflicts (none expected because of disjoint
   ownership), runs Lane G's verification harness against the integrated
   tree.
4. **Documentation closeout** — SITE-LEARNINGS update, CHANGELOG entry,
   FAMTASTIC-STATE regeneration, plan-audit + closeout packets where
   required.
5. **Final report** — `STUDIO-FUNCTIONAL-WORKSPACE-RUN-REPORT.md` in the
   21-field format from the orchestrator brief.

Lanes cannot talk mid-flight (one-shot agents). Strict file ownership
prevents merge collisions. Cross-lane integration points (e.g. Lane E's
right-pane reading Lane B/C/D screen context) are wired via a single
shared `studio/src/lib/current-context.js` published by Lane E and
consumed via a tiny stable contract.

---

## 2. Lane ownership matrix

Each lane has **MAY-WRITE**, **MAY-READ**, and **MUST-NOT-TOUCH** lists.
Files outside MAY-WRITE are off-limits to that lane even if it would be
convenient. Conflicts are resolved by re-dispatching, not by editing
across boundaries.

### Lane A — Sites / Site Builder

**Goal.** Make Sites operational (real list with filter), make Site Builder
shell more useful around the iframe (current site selector, status chips,
preview/inspect/refine entry points), preserve `/index.html?embedded=1`
behavior. **Does NOT modify the legacy chat shell or its server logic.**

- **MAY WRITE:**
  - `site-studio/public/studio/src/screens/sites.jsx` (extend)
  - `site-studio/public/studio/src/screens/site-builder.jsx` (extend; iframe stays)
  - `site-studio/public/studio/src/screens/site-settings.jsx` (extend; per-site overrides display)
  - `site-studio/public/studio/src/lib/sites-api.js` (NEW; thin client for `/api/intelligence/sites`)
  - `site-studio/public/studio/src/lib/site-context.js` (NEW; read/write last-active tag in URL hash + localStorage)
- **MAY READ:** existing screens, primitives, icons, `intelligence-routes.js`, `intelligence-reader.js`.
- **MUST NOT TOUCH:** `site-studio/server.js`, `lib/studio-actions.js`, `public/index.html`, `public/operator.html`, any `lib/intelligence-*`, `lib/fam-*`, `lib/character-branding.js`, anything under `public/ops/**` or `lib/ops/**`, anything Lane B/C/D/E/F/G owns.

### Lane B — Media Studio / Media Library

**Goal.** Wire the Media Studio variations grid to honest action contracts
(no fake generation), wire Media Library to read from `/api/media`
(`media-registry.js` + `media-routes.js` already exist), surface the
asset-shape contract via `/api/media/contract`. Send-to-library stays a
labeled action. Slot-assignment stays a labeled action.

- **MAY WRITE:**
  - `site-studio/public/studio/src/screens/media-studio.jsx` (extend)
  - `site-studio/public/studio/src/screens/media-library.jsx` (extend)
  - `site-studio/public/studio/src/lib/media-api.js` (NEW; client for `/api/media`, `/api/media/contract`)
- **MAY READ:** existing media-* server modules, primitives, icons.
- **MUST NOT TOUCH:** server-side media logic (`lib/openai-image-adapter.js`, `lib/media-telemetry.js`, `lib/cost-monitor.js`), `server.js`, anything Lane A/C/D/E/F/G owns.
- **Honesty rule.** Generate / Approve / Save-to-library / Assign-to-slot buttons remain visible but disabled-or-pill-labeled `not wired yet — contract ready` until backend round-trip lands. No fake variations, no fake costs.

### Lane C — Component Studio

**Goal.** Wire Component Studio to read from `/api/components` (the
inventory router exists), surface the surgical-insertion contract via
`/api/components/contract`, expose check-existing-before-creating from the
inventory diff, and hold mutation history as a labeled placeholder.
Insertion stays a labeled action.

- **MAY WRITE:**
  - `site-studio/public/studio/src/screens/component-studio.jsx` (extend)
  - `site-studio/public/studio/src/lib/components-api.js` (NEW; client for `/api/components`, `/api/components/check`, `/api/components/contract`)
- **MAY READ:** `server/component-inventory.js`, `server/component-routes.js`, primitives, icons.
- **MUST NOT TOUCH:** `lib/famtastic-skeletons.js`, `lib/surgical-editor.js`, `server.js`, anything Lane A/B/D/E/F/G owns.
- **Honesty rule.** "Insert (surgical)" stays disabled with a `contract ready · server-side wiring later` chip. The inventory list and check-existing diff become real — those routes exist.

### Lane D — Research Center / Think-Tank

**Goal.** Make Research Center read the actual brief markdown set from
`docs/research/famtastic-studio-execution/` (filename + first-heading),
make depth selector (Fast/Standard/Deep/Expert) honest about what each
depth would do, hold a Source/Pattern/Opportunity panel that links to
the specific md files. Make Think-Tank read `captures/inbox/*.capture.json`
when present, otherwise show honest empty state with promote-to-X chips
disabled and labeled.

- **MAY WRITE:**
  - `site-studio/public/studio/src/screens/research.jsx` (extend)
  - `site-studio/public/studio/src/screens/think-tank.jsx` (extend)
  - `site-studio/public/studio/src/lib/research-api.js` (NEW; client for `/api/research/briefs`)
  - `site-studio/public/studio/src/lib/think-tank-api.js` (NEW; client for `/api/think-tank/captures`)
  - `site-studio/server/research-routes.js` (NEW modular router)
  - `site-studio/server/think-tank-routes.js` (NEW modular router)
- **MAY READ:** existing research/captures docs, primitives, icons.
- **MUST NOT TOUCH:** `lib/research-router.js`, `lib/research-registry.js` (leave them; mount via thin reader if needed), `server.js` body (only edit the mount block — see integration rule), anything Lane A/B/C/E/F/G owns.
- **Server.js policy.** Lane D may add **one or two `app.use(...)` mount lines** in the existing mount block at line 1070–1078 of server.js. Anything more (route-handler logic, mutable state) stays in the new modular file. This satisfies the brief's "minimal mounts only" rule.

### Lane E — Shay routing + contextual right pane

**Goal.** Make `ContextPanel` (the right rail in `shell.jsx`) actually
contextual per the 12 sections per the orchestrator brief:
- Sites/Site Builder → site status, preview/inspect/refine controls
- Media Studio → generation settings + cost/provider info
- Component Studio → props/slots/variants/insertion target
- Research → source detail, related patterns, dig deeper
- Think-Tank → idea detail, promote actions
- Mission Control → proof details, blockers, run actions
- Shay → routing/readback (already on Shay screen; right-pane suppressed)
- Settings → setting explanations
Plus: collapsible behavior (toggle button + persisted state in localStorage).

Each non-special screen publishes `window.__studioPublishContext({...})`
on mount; ContextPanel subscribes via the `currentContext` prop already
plumbed in `app.jsx`. Readback modes (Short / Operator / Deep / Next-action)
remain honest — they switch UI density but do not call the brain in V1.

- **MAY WRITE:**
  - `site-studio/public/studio/src/shell.jsx` (extend ContextPanel + add collapse)
  - `site-studio/public/studio/src/lib/current-context.js` (NEW; helper to publish + helpers for each section's contract)
  - `site-studio/public/studio/styles.css` (extend; collapse rules + per-section variants — additive only, scoped to `.studio-shell`)
  - `site-studio/public/studio/src/screens/{home,sites,site-settings,research,think-tank,library,settings}.jsx` (PUBLISH-ONLY edits — add `useEffect` calls to publish currentContext; **no other changes**)
- **MAY READ:** all existing studio sources.
- **MUST NOT TOUCH:** `app.jsx` body beyond adding the localStorage glue for collapse, anything Lane A/B/C/D/F/G owns inside their screens (Lane E adds a minimal publish hook only — see Integration coordination rule).
- **Integration coordination rule.** Other lanes may already touch their
  screen files. Lane E's edit to those screens is **additive at the top of
  the component function** (a single `useEffect` block with comment marker
  `// Lane E — currentContext publish`). Orchestrator integrates by appending
  Lane E's hook block where the marker comment lives. If Lane A/B/C/D's
  diff overlaps, orchestrator re-applies Lane E's hook by hand before commit.

### Lane F — Integration / Visual Workflow

**Goal.** Extend `RecipeFlow` from one recipe (Research → Proof) to the
five recipes from `WORKSPACE-RECIPES.md`, pickable from a recipe selector;
add a recipe drilldown card; wire Home and Research Center to expose
the recipe selector. Wire bottom Memory Strip (`shell.jsx`'s `MemoryStrip`)
to read a real activity feed (`/api/intelligence/runs` tail or
`captures/inbox` tail) — honest empty state when nothing.

- **MAY WRITE:**
  - `site-studio/public/studio/src/recipe-flow.jsx` (extend; five recipes, selector, drilldown)
  - `site-studio/public/studio/src/lib/recipes.js` (NEW; recipe definitions extracted from WORKSPACE-RECIPES.md)
  - `site-studio/public/studio/src/lib/memory-tail.js` (NEW; client for memory-strip data)
  - `site-studio/public/studio/src/screens/home.jsx` (RecipeSelector mount only — additive)
  - `site-studio/public/studio/src/screens/research.jsx` (RecipeSelector mount only — additive)
  - `site-studio/public/studio/src/shell.jsx` (`MemoryStrip` only — wire to memory-tail)
- **MAY READ:** all existing studio sources, intelligence-routes.js, intelligence-reader.js.
- **MUST NOT TOUCH:** `app.jsx`, anything Lane A/B/C/D/E/G owns inside their screens (overlap with Lane A on home.jsx + research.jsx is RecipeSelector mount only — same additive-marker rule as Lane E: `// Lane F — RecipeSelector mount`).

### Lane G — QA / Proof

**Goal.** Run independent verification of the integrated lane outputs.
Use the existing `studio-shell-verify.js` pattern (Playwright headless,
fast smoke server) plus add lane-specific assertions: 12 rail sections
clickable, right pane collapsible, right pane content matches per-section
contract, /studio.html loads, /index.html standalone preserved,
/operator.html standalone preserved, embeds intact, recipe-selector
renders all 5 recipes with valid drilldown, memory-strip honest state.
Static checks: every JSX file parses cleanly via @babel/parser; no
inadvertent edits to `lib/fam-*`, `lib/character-branding.js`,
`lib/intelligence-*` (other than additive routes), `operator.css`,
`operator*.js`, `operator.html` outside the `?embedded=1` toggle, or
`index.html` outside the `?embedded=1` toggle; mount block in `server.js`
grew by ≤2 lines.

- **MAY WRITE:**
  - `site-studio/server/__smoke__/studio-functional-verify.js` (NEW; comprehensive verifier)
  - `tests/studio/lane-static-checks.js` (NEW; static-only invariants)
- **MAY READ:** every file in repo.
- **MUST NOT TOUCH:** any code under test (no fix-and-retest in same lane; orchestrator handles fix dispatch).

---

## 3. File-ownership table (compact)

| Path | Owner | Other lanes |
|---|---|---|
| `studio/src/screens/sites.jsx` | A | E (publish hook), F (none) |
| `studio/src/screens/site-builder.jsx` | A | none |
| `studio/src/screens/site-settings.jsx` | A | E (publish hook) |
| `studio/src/screens/media-studio.jsx` | B | none (own pane) |
| `studio/src/screens/media-library.jsx` | B | E (publish hook) |
| `studio/src/screens/component-studio.jsx` | C | none (own pane) |
| `studio/src/screens/research.jsx` | D | E (publish hook), F (selector mount) |
| `studio/src/screens/think-tank.jsx` | D | E (publish hook) |
| `studio/src/screens/shay.jsx` | (unchanged) | none |
| `studio/src/screens/mission-control.jsx` | (unchanged) | none |
| `studio/src/screens/home.jsx` | E+F (additive) | E (publish hook), F (selector) |
| `studio/src/screens/settings.jsx` | (unchanged) | E (publish hook) |
| `studio/src/shell.jsx` | E (ContextPanel + collapse) + F (MemoryStrip wire) | none — these are disjoint sections of the file |
| `studio/src/app.jsx` | E (collapse localStorage glue only) | none |
| `studio/src/recipe-flow.jsx` | F | none |
| `studio/src/lib/sites-api.js` | A (NEW) | none |
| `studio/src/lib/site-context.js` | A (NEW) | none |
| `studio/src/lib/media-api.js` | B (NEW) | none |
| `studio/src/lib/components-api.js` | C (NEW) | none |
| `studio/src/lib/research-api.js` | D (NEW) | none |
| `studio/src/lib/think-tank-api.js` | D (NEW) | none |
| `studio/src/lib/recipes.js` | F (NEW) | none |
| `studio/src/lib/memory-tail.js` | F (NEW) | none |
| `studio/src/lib/current-context.js` | E (NEW) | none |
| `studio/styles.css` | E (additive; collapse + variants) | none |
| `server/research-routes.js` | D (NEW) | none |
| `server/think-tank-routes.js` | D (NEW) | none |
| `server.js` | D (≤2 mount lines, marker block) | none |
| `server/__smoke__/studio-functional-verify.js` | G (NEW) | none |
| `tests/studio/lane-static-checks.js` | G (NEW) | none |

Anything not listed is **not modified**.

---

## 4. Cross-lane integration markers

Lanes that need to touch a screen file owned by another lane do so by
inserting **one block** at a stable insertion point with a marker comment.
Orchestrator integrates by appending blocks in lane order if necessary.

- Lane E publish hook marker: `// Lane E — currentContext publish`
- Lane F RecipeSelector mount marker: `// Lane F — RecipeSelector mount`

---

## 5. Merge / integration order

1. Lane A returns → orchestrator applies A's writes.
2. Lane B returns → orchestrator applies B's writes.
3. Lane C returns → orchestrator applies C's writes.
4. Lane D returns → orchestrator applies D's writes (incl. ≤2 server.js mount lines).
5. Lane F returns → orchestrator applies F's writes (RecipeSelector mounts on home.jsx + research.jsx).
6. Lane E returns → orchestrator applies E's writes (publish hooks on owned screens; ContextPanel + collapse in shell.jsx).
7. Orchestrator runs Lane G.
8. If Lane G fails: orchestrator reads failure summary, decides which lane(s) to re-dispatch with a tight remediation prompt, re-runs Lane G. Repeat up to 2x. After that → hard blocker per brief.

---

## 6. Per-lane proof

Each lane returns:
- Files written (paths only).
- A short "what real vs honest-shell" statement.
- Acceptance bullets (≤6).
- Open gaps logged (don't fix; document).

The orchestrator copies these into the run report.

---

## 7. Hard blockers (from brief, scoped here)

- repo write/build impossible (sandbox blocks) — STOP
- `/index.html` or `/operator.html` standalone breaks and cannot be restored — STOP
- existing Site Builder iframe loses chat/preview — STOP
- existing Mission Control iframe loses operator action layer — STOP
- repeated Lane G failure after documented retries — STOP
- production/deploy/DNS/payment/destructive action required — STOP
- paid/cloud call required without explicit approval — STOP
- `server.js` grows by more than 4 lines or any non-mount logic added — STOP

---

## 8. Non-blocker logging

Each lane logs gaps as `{ section, what, why_deferred, next_step }`.
Orchestrator aggregates into the run report's "Gaps / non-blockers"
section. Examples expected:
- Live media generation not wired (provider round-trip)
- Live component insertion not wired (surgical-editor wiring)
- Per-site `site-settings.json` schema not yet defined
- Brain integration not wired in Shay screen
- Visual flow currently static — no live run tracking yet

---

## 9. End condition

Fritz can open `/studio.html` and see / do (in honest mode where backends
remain unwired):

1. Start or continue a site (Lane A — Sites → Site Builder).
2. Use the existing builder/chat (preserved iframe).
3. See contextual right pane that collapses (Lane E).
4. Use Media Studio shell with honest action contracts (Lane B).
5. See generated/uploaded assets flow into Media Library (Lane B; live read).
6. See how Media Library assets feed Component Studio (Lane B + C).
7. See how components can be built/tested/enhanced and inserted (Lane C; honest insert action).
8. See Research / Think-Tank produce build recommendations (Lane D).
9. Use Shay as a visible cross-section guide (existing screen).
10. Access Mission Control as **one section** for proof/status (preserved iframe).
11. See the visual recipe flow with all 5 recipes (Lane F).
12. See the bottom memory strip with live activity tail (Lane F).
13. Right pane content changes per section, collapses on demand (Lane E).
14. `/index.html` and `/operator.html` continue to work standalone (Lane G verifies).
15. Tests pass: 12 sections render, embeds intact, no JSX parse errors, no inadvertent legacy edits, server.js mount block grew ≤2 lines (Lane G verifies).

If 1–15 are honest about gaps and Lane G is green, the run is **PASS**.
