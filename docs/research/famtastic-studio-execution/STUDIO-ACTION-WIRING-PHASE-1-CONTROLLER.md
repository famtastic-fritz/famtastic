# Studio Action Wiring — Phase 1 — Run Controller

**Date:** 2026-05-10
**Branch:** `research/studio-intelligence-foundation-20260508`
**Status:** Active
**Companion to:** `STUDIO-ACTION-WIRING-PHASE-1-RUN-REPORT.md` (final report)

This is the controller for the second parallel-lane run on the unified
Studio shell at `/studio.html`. Phase 0 (Functional Workspace Wiring,
shipped 2026-05-10 in commits `506bf4f`/`72266a7`) made every section
visible and read-wired. Phase 1 makes the **actions** real (local where
safe, contract-ready where not) and ties cross-section flows together.

Source of truth for decisions: the five realignment docs
(`DESIGN-INGEST-REPORT`, `PLATFORM-IA-AND-FUNCTIONAL-MAP`,
`WORKSPACE-RECIPES`, `DESIGN-TO-IMPLEMENTATION-PLAN`,
`DRIFT-CORRECTION-NOTES`) plus the prior run + verify reports.

---

## 1. Orchestrator role

The orchestrator is responsible for:

1. **Prep** — already complete (6 required docs read; state confirmed
   via `STUDIO-RUNTIME-FINAL-VERIFY-REPORT.md` — branch
   `research/studio-intelligence-foundation-20260508` at commit
   `72266a7`; full Studio booted clean on `:3335` with all routes
   200; static prong 85/85; browser prong was blocked only on
   sandbox playwright availability, which this run resolves).
2. **Lane dispatch** — sends each Lane A–F as an independent agent
   task in parallel. Each lane gets self-contained context, strict
   file-ownership scope-locks, and a per-lane proof requirement.
3. **Integration** — once each lane returns, orchestrator integrates
   marker-based hooks (Lane E publish hooks, Lane F recipe-selector
   mounts), updates `studio.html` script tags if any new lib lands,
   resolves any cross-lane conflicts, runs `lane-static-checks.js` to
   catch regressions before dispatching Lane G.
4. **Lane G** — sequential QA after all implementation lanes integrate.
   Static prong + browser prong (Playwright installable inside the
   sandbox; chromium-headless-shell cache survived from prior session
   at `~/.cache/ms-playwright/chromium_headless_shell-1217/`).
5. **Documentation closeout** — SITE-LEARNINGS update, CHANGELOG
   entry, FAMTASTIC-STATE regen (structure changed), `agent-checkin.js`
   row.
6. **Final report** — `STUDIO-ACTION-WIRING-PHASE-1-RUN-REPORT.md` in
   the 21-field format.

Lanes are one-shot agents; strict file ownership prevents merge
collisions. Cross-lane coordination uses the same marker pattern as
Phase 0:

- `// Lane E — currentContext publish` — placed by Lane A/B/C/D in
  screens they own; Lane E replaces with `useEffect(publish…)`.
- `{/* Lane F — RecipeSelector mount */}` — Lane F replaces with its
  selector component.

---

## 2. Lane ownership matrix

Each lane has **MAY-WRITE**, **MAY-READ**, and **MUST-NOT-TOUCH** lists.
Files outside MAY-WRITE are off-limits to that lane.

### Lane A — Sites / Site Builder action wiring

**Goal.** Make Sites usable as an action surface from `/studio.html`.
"New Site" gives visible local feedback (action contract — does NOT
write a site without explicit further wiring). "Continue Site" sets
last-active-tag and routes to Builder. Builder's status-bar actions
(Preview / Inspect / Refine) become visible action contracts that
postMessage to the embedded `/index.html` where safe. Local site
settings + Platform defaults link/path. Right pane site inspector
(handled jointly with Lane E).

- **MAY WRITE:**
  - `site-studio/public/studio/src/screens/sites.jsx` (extend)
  - `site-studio/public/studio/src/screens/site-builder.jsx` (extend)
  - `site-studio/public/studio/src/screens/site-settings.jsx` (extend)
  - `site-studio/public/studio/src/lib/sites-actions.js` (NEW; New-Site contract, Continue, Preview/Inspect/Refine postMessage dispatch)
  - `site-studio/public/studio/src/lib/site-context.js` (extend)
- **MAY READ:** existing screens, primitives, icons, intelligence-routes/reader.
- **MUST NOT TOUCH:** `site-studio/server.js`, `lib/studio-actions.js`, `public/index.html`, `public/operator.html`, `intelligence-*`, `lib/fam-*`, `lib/character-branding.js`, anything Lane B/C/D/E/F/G owns.
- **Honesty rule.** "New Site" stays disabled-or-labeled `not wired · opens chat builder`; clicking calls `__studioJump('builder')` and surfaces an honest toast. "Continue" persists tag + jumps. Preview/Inspect/Refine become visible action contracts that postMessage to embedded `/index.html` with a documented protocol — even if the legacy chat shell doesn't yet listen, the post is honest action-state on the new shell side.

### Lane B — Media Studio → Media Library wiring

**Goal.** Generation/save/assign action contracts. No fake generation.
Save-to-Media-Library may stage a local-only test asset via a new
sandboxed `POST /api/media/test-asset` route IF safe (writes to a
`media/registry.json` under the active site dir, never to disk
elsewhere). Asset status model (`draft|approved|rejected|used|deferred`)
and asset assignment (asset→component-slot, asset→site-slot) surfaced
as readable local state.

- **MAY WRITE:**
  - `site-studio/public/studio/src/screens/media-studio.jsx` (extend)
  - `site-studio/public/studio/src/screens/media-library.jsx` (extend)
  - `site-studio/public/studio/src/lib/media-actions.js` (NEW; action contracts + local registry refresh)
  - `site-studio/public/studio/src/lib/media-api.js` (extend with `saveTestAsset` if safe)
  - `site-studio/server/media-routes.js` (extend with `POST /api/media/test-asset` if safe — append-only, no provider call)
  - `site-studio/server/media-registry.js` (extend with `appendAsset` if safe)
- **MAY READ:** all existing media + intelligence modules, primitives, icons.
- **MUST NOT TOUCH:** `lib/openai-image-adapter.js`, `lib/media-telemetry.js`, `lib/cost-monitor.js`, `server.js` (NO mount changes — `/api/media` mount is already in place from Phase 0), anything Lane A/C/D/E/F/G owns.
- **Honesty rule.** Generate / Re-roll / Approve / Reject / Save-to-library / Send-to-library / Assign-to-slot all remain visible. The button labeled `Save local test asset` (new, distinct from real Save) becomes wired if the server route lands safely. All real-provider actions stay disabled with chips.

### Lane C — Component Studio wiring

**Goal.** Make Component Studio an action surface: check-existing,
new-component contract, component chat state (local-only echo or
disabled), preview state, props/slots/variants/test states, media-needs
panel, insertion target selector, surgical-insertion contract.
**No real-site mutation.** Insertion may stage a contract object in
local state for inspection, never write a real site file.

- **MAY WRITE:**
  - `site-studio/public/studio/src/screens/component-studio.jsx` (extend)
  - `site-studio/public/studio/src/lib/components-actions.js` (NEW; check-existing wrapper, new-component contract, insertion contract builder)
  - `site-studio/public/studio/src/lib/components-api.js` (extend if needed — but ONLY read endpoints; no new mutation route)
- **MAY READ:** `server/component-inventory.js`, `server/component-routes.js`, primitives.
- **MUST NOT TOUCH:** `lib/famtastic-skeletons.js`, `lib/surgical-editor.js`, `server.js`, anything Lane A/B/D/E/F/G owns.
- **Honesty rule.** "Insert (surgical)" stays `disabled` + `Tag` `contract ready · server route pending` UNLESS a sandboxed local-only insertion-contract dump endpoint is added; even then, no real mutation. Mutation history shown if the existing build-trace endpoint exposes per-component entries — read-only.

### Lane D — Research / Think-Tank promotion wiring

**Goal.** Idea capture action that writes a `*.capture.json` file
under `captures/inbox/` via a new sandboxed `POST /api/think-tank/capture`
route (additive, validated, allowlist filename, no overwrites).
Promote-to-X (Research / Site / Component / Media) creates local
task contract objects in a `captures/promotions/` directory if safe.
Research brief detail action already works (live `/api/research/brief/:id`);
extend the screen with "Open MD" → markdown viewer modal/inline.
Depth selector becomes stateful and surfaces honest depth metadata.

- **MAY WRITE:**
  - `site-studio/public/studio/src/screens/research.jsx` (extend)
  - `site-studio/public/studio/src/screens/think-tank.jsx` (extend)
  - `site-studio/public/studio/src/lib/research-actions.js` (NEW; depth state, promote-to-X helpers)
  - `site-studio/public/studio/src/lib/think-tank-actions.js` (NEW; capture write contract, promote helpers)
  - `site-studio/public/studio/src/lib/research-api.js` (extend if needed — keep read-only)
  - `site-studio/public/studio/src/lib/think-tank-api.js` (extend with `createCapture`, `promote`)
  - `site-studio/server/think-tank-routes.js` (extend with `POST /api/think-tank/capture` and `POST /api/think-tank/promote` — both additive, no overwrites, allowlist, fail-soft)
  - `site-studio/server/research-routes.js` (extend if needed — read-only)
- **MAY READ:** existing research/capture docs, primitives.
- **MUST NOT TOUCH:** `lib/research-router.js`, `lib/research-registry.js`, `server.js` body (mounts already in place), anything Lane A/B/C/E/F/G owns.
- **Honesty rule.** Capture writes ONLY to `captures/inbox/<allowlisted-id>.capture.json` (filename regex, max-bytes cap, no traversal). Promote writes a local `captures/promotions/<id>.promotion.json` task contract — never modifies the target section's real data. UI surfaces "Captured ✓" and "Promoted to <section> ✓" with the file path in a debug chip.

### Lane E — Shay routing + contextual right-pane actions

**Goal.** Right pane stays collapsible + persistent (already done in
Phase 0; verify intact). Per-section content stays contextual.
Add three concrete actions to the pane:
- **Explain current screen** — calls `window.CurrentContext.forSection_<name>(...).explain` (already exists) and shows it in a `ChatBubble`. No backend call.
- **What should Fritz do next?** — surfaces the `nextAction` from the same helper. No backend call.
- **Route to <section>** — already wired in Phase 0 as chips; this run makes the routing chips include short Hint text "Route current intent to <section>" with a single-line stage-payload (e.g. preset hash params if applicable).

Readback modes (Short / Operator / Deep / Next-action) become stateful
on the ContextPanel and toggle the **density** of the explain output
(not a fake brain call) — Short collapses to one sentence, Operator
shows the full helper output, Deep adds capability-truth detail,
Next-action shows only the nextAction card.

- **MAY WRITE:**
  - `site-studio/public/studio/src/shell.jsx` (extend ContextPanel — only the body inside it; do NOT touch Rail/Topbar/MemoryStrip)
  - `site-studio/public/studio/src/lib/current-context.js` (extend helpers with capabilityTruth depth tiers)
  - `site-studio/public/studio/src/lib/shay-actions.js` (NEW; local routing-with-payload helpers, learning-capture contract stub)
- **MAY READ:** all existing studio sources.
- **MUST NOT TOUCH:** `app.jsx` (Phase 0 collapse glue already in place; don't disturb), anything Lane A/B/C/D/F/G owns.
- **Honesty rule.** No fake AI response. No backend call. Density toggle is pure local UI. Learning capture is a contract stub that logs to `console.info` for now (with a Hint pointing at the future memory-promote path).

### Lane F — Integration / recipe workflow

**Goal.** Recipe selector covers all 5 named recipes (Phase 0 shipped
6 entries — keep the preserved `research-to-proof` as a bonus or
collapse it into the canonical 5). Each recipe node has drilldown
detail: owner section, inputs, outputs, status, next action,
proof/checkpoint. Cross-section flows visually clear.
Bottom MemoryStrip already reads `/api/intelligence/runs` (Phase 0);
extend to also tail `captures/inbox/*.capture.json` recent entries
when no site context, and to refresh on a button click.

- **MAY WRITE:**
  - `site-studio/public/studio/src/recipe-flow.jsx` (extend with drilldown details)
  - `site-studio/public/studio/src/lib/recipes.js` (extend each recipe with `inputs[]`, `outputs[]`, `next_action`, `proof[]` fields)
  - `site-studio/public/studio/src/lib/memory-tail.js` (extend with capture-tail merge + manual refresh helper)
  - `site-studio/public/studio/src/shell.jsx` (MemoryStrip refresh button only — disjoint from Lane E's ContextPanel edits — same marker pattern as Phase 0)
  - `site-studio/public/studio/src/screens/home.jsx` (RecipeSelector wraps it; no other changes — just verify it stays mounted)
- **MAY READ:** all existing studio sources, intelligence-routes/reader, think-tank-routes.
- **MUST NOT TOUCH:** anything Lane A/B/C/D/E/G owns inside their screens. Mission Control screen MUST stay untouched (Lane G drift trip-wire).
- **Honesty rule.** Status values per node stay honest (idle/active/done/fail). No fabricated metrics. Recipe 3 branching can render as a labeled chip on the node; full diamond visual still deferred.

### Lane G — QA / Proof

**Goal.** Independent verification of integrated lane outputs.
Static checks expand to include the new lib files and the new POST
endpoints' route-existence; browser verifier extends to click
through key actions (Explain current screen / Route-to / Capture
idea / Save local test asset / Recipe drilldown).

- **MAY WRITE:**
  - `tests/studio/lane-static-checks.js` (extend with Phase 1 invariants)
  - `site-studio/server/__smoke__/studio-action-wiring-verify.js` (NEW; Phase 1 browser verifier — extends `studio-functional-verify.js`)
- **MAY READ:** every file in repo.
- **MUST NOT TOUCH:** any code under test.

---

## 3. File-ownership table (compact)

| Path | Owner | Other lanes |
|---|---|---|
| `studio/src/screens/sites.jsx` | A | E (publish hook marker) |
| `studio/src/screens/site-builder.jsx` | A | (none — own pane, no ContextPanel) |
| `studio/src/screens/site-settings.jsx` | A | E (publish hook marker) |
| `studio/src/screens/media-studio.jsx` | B | (own pane) |
| `studio/src/screens/media-library.jsx` | B | E (publish hook marker) |
| `studio/src/screens/component-studio.jsx` | C | (own pane) |
| `studio/src/screens/research.jsx` | D | E (publish hook marker), F (recipe-selector mount, already there) |
| `studio/src/screens/think-tank.jsx` | D | E (publish hook marker) |
| `studio/src/screens/home.jsx` | F (light) | E (publish hook marker, already there) |
| `studio/src/screens/settings.jsx` | (unchanged) | E (publish hook marker, already there) |
| `studio/src/screens/shay.jsx` | (unchanged) | none (own pane) |
| `studio/src/screens/mission-control.jsx` | (UNCHANGED — drift trip-wire) | none |
| `studio/src/shell.jsx` | E (ContextPanel body) + F (MemoryStrip refresh) | disjoint sections |
| `studio/src/recipe-flow.jsx` | F | none |
| `studio/src/app.jsx` | (unchanged — Phase 0 collapse glue stable) | none |
| `studio/src/lib/sites-actions.js` | A (NEW) | none |
| `studio/src/lib/media-actions.js` | B (NEW) | none |
| `studio/src/lib/components-actions.js` | C (NEW) | none |
| `studio/src/lib/research-actions.js` | D (NEW) | none |
| `studio/src/lib/think-tank-actions.js` | D (NEW) | none |
| `studio/src/lib/shay-actions.js` | E (NEW) | none |
| `studio/src/lib/site-context.js` | A (extend) | none |
| `studio/src/lib/sites-api.js` | A (extend if needed) | none |
| `studio/src/lib/media-api.js` | B (extend) | none |
| `studio/src/lib/components-api.js` | C (extend if needed) | none |
| `studio/src/lib/research-api.js` | D (extend if needed) | none |
| `studio/src/lib/think-tank-api.js` | D (extend) | none |
| `studio/src/lib/current-context.js` | E (extend) | none |
| `studio/src/lib/recipes.js` | F (extend) | none |
| `studio/src/lib/memory-tail.js` | F (extend) | none |
| `server/media-routes.js` | B (extend — additive POST) | none |
| `server/media-registry.js` | B (extend — append-only) | none |
| `server/think-tank-routes.js` | D (extend — additive POSTs) | none |
| `server/research-routes.js` | D (extend if needed — read-only) | none |
| `server.js` | **NO CHANGES** — mounts already in place | none |
| `server/__smoke__/studio-action-wiring-verify.js` | G (NEW) | none |
| `tests/studio/lane-static-checks.js` | G (extend) | none |

Everything not listed: **not modified**.

---

## 4. Cross-lane integration markers

Same pattern as Phase 0:

- Lane E publish hook marker: `// Lane E — currentContext publish` (already in place from Phase 0; Lane E may extend the hook body if depth tiers change the helper signature — otherwise no-op).
- Lane F recipe-selector mount: `{/* Lane F — RecipeSelector mount */}` (already in place from Phase 0 in `home.jsx` and `research.jsx`).

---

## 5. Merge / integration order

1. Lane A returns → orchestrator applies A's writes.
2. Lane B returns → orchestrator applies B's writes.
3. Lane C returns → orchestrator applies C's writes.
4. Lane D returns → orchestrator applies D's writes.
5. Lane F returns → orchestrator applies F's writes.
6. Lane E returns → orchestrator applies E's writes (ContextPanel + helper extensions; no new publish hooks needed — Phase 0 hooks compatible).
7. Orchestrator updates `studio.html` script tags if any new lib files were added (sites-actions, media-actions, components-actions, research-actions, think-tank-actions, shay-actions).
8. Orchestrator runs `lane-static-checks.js` to confirm no regression.
9. Orchestrator dispatches Lane G.
10. If Lane G fails: orchestrator reads failure summary, decides which lane(s) to re-dispatch with a tight remediation prompt, re-runs Lane G. Repeat up to 2x. After that → hard blocker per brief.

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

- repo write/build impossible (sandbox blocks)
- `/index.html` or `/operator.html` standalone breaks and cannot be restored
- existing Site Builder iframe loses chat/preview
- existing Mission Control iframe loses operator action layer
- repeated Lane G failure after documented retries
- production/deploy/DNS/payment/destructive action required
- paid/cloud call required without explicit approval
- `server.js` body grows by **any** lines (Phase 1 is mount-stable — all new routes go in existing modular files; `server.js` only had its mount block edited in Phase 0 and stays untouched in Phase 1)
- major backend growth without modularization (any lane that needs a new modular file is fine; bloating an existing one beyond ~100 added lines requires re-dispatching that lane with tighter scope)

---

## 8. Non-blocker logging

Each lane logs gaps as `{ section, what, why_deferred, next_step }`.
Orchestrator aggregates into the run report's "Gaps / non-blockers"
section. Expected examples:
- Live media generation still not wired (provider round-trip)
- Real surgical insertion still not wired
- Plan-card / Versions / Verify native panes (Site Builder)
- Per-site overrides file schema still undefined
- Brain integration in Shay screen
- Recipe live-status binding to a run ledger

---

## 9. End condition

Fritz can open `/studio.html` and see / do (locally where safe, with
honest contracts where not):

1. **Sites** — New Site shows honest feedback + routes to chat builder; Continue persists tag + jumps to Builder; Local site settings link works.
2. **Site Builder** — Preview / Inspect / Refine buttons fire postMessage to the embedded `/index.html` (honest action even if the listener isn't fully wired in the legacy shell).
3. **Site Settings** — diff shows "0 overrides · matches platform" honestly.
4. **Media Studio** — Generate disabled with chip; new "Save local test asset" works (writes to `media/registry.json` under active site, no provider call); Assign-to-slot stages a contract object visible to the user.
5. **Media Library** — refresh button reloads the registry; asset status badges (`draft/approved/rejected/used/deferred`) render from real data when present.
6. **Component Studio** — search-with-check-existing returns near matches; insertion stages a contract object visible in the right pane; Show Contract debug button works.
7. **Research Center** — depth selector toggles honest depth metadata; brief detail "Open MD" surfaces the markdown inline; Promote-findings stages a local task contract.
8. **Think-Tank** — Capture writes a real `captures/inbox/*.capture.json` file (allowlisted, validated); inbox refresh shows it.
9. **Shay** — Right pane Explain-current-screen and What-next render honestly via `CurrentContext` helpers; readback Seg toggles density; routing chips route with optional stage-payload.
10. **Mission Control** — preserved iframe; drift trip-wire green.
11. **Visual recipe** — Recipe selector covers 5 recipes; each node has drilldown detail (owner / inputs / outputs / status / next-action / proof).
12. **Memory strip** — refresh button works; runs tail + capture tail merged.
13. `/index.html` and `/operator.html` continue to work standalone.
14. Tests pass: static + browser (Playwright installed in sandbox; chromium cache survives).

If 1–14 are honest about gaps, Lane G is green, and Mission Control
containment holds, the run is **PASS**.
