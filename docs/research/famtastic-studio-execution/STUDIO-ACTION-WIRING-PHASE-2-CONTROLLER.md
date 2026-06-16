# Studio Action Wiring — Phase 2 — Run Controller

**Date:** 2026-05-10
**Branch:** `research/studio-intelligence-foundation-20260508`
**Status:** Active
**Companion to:** `STUDIO-ACTION-WIRING-PHASE-2-RUN-REPORT.md` (final report)

Phase 2 makes the local action layer **real enough** that Studio can
safely stage, save, route, configure, and inspect work across every
section — without paid calls, without fake outputs, without breaking
the iframe-preserved legacy shells.

Scope is Direction 1(b) + Direction 2 + safe pieces of Direction 3
per the Phase 2 brief.

## 1. Orchestrator role

- **Prep** — Phase 1 baseline confirmed green (137/137 static). All Phase 1 endpoints intact.
- **Lane dispatch** — sends Lanes A2–F2 as independent agent tasks in parallel, sonnet subagents.
- **Integration** — applies marker-based hooks; updates `studio.html` if new libs land; static-check before Lane G2.
- **Lane G2** — sequential QA after all implementation lanes integrate. Static prong + browser prong (Playwright already installed + chromium cached from prior phase).
- **Documentation closeout** — SITE-LEARNINGS / CHANGELOG / FAMTASTIC-STATE updates per CLAUDE.md non-negotiable rules.
- **Final report** — `STUDIO-ACTION-WIRING-PHASE-2-RUN-REPORT.md` in the 21-field format.

## 2. Lane ownership matrix

### Lane A2 — Sites/Builder postMessage listener + race fix

**Goal.** Define a postMessage protocol listener inside `/index.html` so `SitesActions` Preview/Inspect/Refine/Continue contracts actually fire actions against the legacy chat shell. Fix the New-site chip-before-navigate race noted in Phase 1's gap log (finding J2).

- **MAY WRITE:**
  - `site-studio/public/index.html` (additive listener block only — gated to `?embedded=1` so standalone behavior stays byte-identical)
  - `site-studio/public/studio/src/lib/sites-actions.js` (extend — delay jump after chip dispatches)
  - `site-studio/public/studio/src/screens/sites.jsx` (extend — global toast pattern if needed)
- **MUST NOT TOUCH:** any other Phase 2 lane's files; `lib/*` server modules; `lib/fam-*`; operator; mission-control.
- **Honesty.** The listener handles only intents we can safely act on (focus the chat input, run a built-in command, broadcast back an ack). Anything unsafe stays no-op with a console.warn.

### Lane B2 — Media inline form + countByApproval

**Goal.** Replace `window.prompt()` in Media Studio save flow with an inline 3-field form (id, slot, prompt). Extend `countByApproval` to cover all 7 status buckets so summary chips show full breakdown.

- **MAY WRITE:**
  - `site-studio/public/studio/src/screens/media-studio.jsx` (extend — inline form)
  - `site-studio/public/studio/src/screens/media-library.jsx` (extend — render expanded summary)
  - `site-studio/server/media-registry.js` (extend — countByApproval covers all 7)
- **MUST NOT TOUCH:** other lanes' files; `lib/openai-image-adapter.js`; `lib/media-telemetry.js`.

### Lane C2 — Components real local insert + history

**Goal.** Add `POST /api/components/insert` that uses `lib/surgical-editor.js` SAFELY: writes only to a sandboxed `sites/<tag>/_test/inserts/` directory (never to a site's real `dist/`). Records insertion history at `sites/<tag>/_test/insertion-history.jsonl`. Component Studio Insert button switches from contract-only to wired-to-the-test-endpoint.

- **MAY WRITE:**
  - `site-studio/server/component-routes.js` (extend — `POST /insert`)
  - `site-studio/server/component-inventory.js` (extend — `stagedInsert` helper)
  - `site-studio/public/studio/src/lib/components-api.js` (extend — `insertStaged`)
  - `site-studio/public/studio/src/lib/components-actions.js` (extend — switch `insertionContract` to call the real endpoint)
  - `site-studio/public/studio/src/screens/component-studio.jsx` (extend — surface history)
- **MUST NOT TOUCH:** `lib/surgical-editor.js` (use as read-only API); `lib/famtastic-skeletons.js`; other lanes.
- **Honesty.** "Insert" only writes to `_test/` subdir — never to a real `dist/`. UI clearly labels the destination as a sandboxed staging area.

### Lane D2 — Site Settings overrides file + endpoints

**Goal.** Define `sites/<tag>/site-settings.json` schema. Add safe GET/PUT endpoints. Diff vs platform defaults works. Reset-to-platform button wired.

- **MAY WRITE:**
  - `site-studio/server/site-settings-routes.js` (NEW — `GET/PUT /api/site-settings?tag=`, `DELETE /api/site-settings?tag=` for reset)
  - `site-studio/server/site-settings-schema.js` (NEW — schema definition + validator)
  - `site-studio/public/studio/src/lib/site-settings-api.js` (NEW)
  - `site-studio/public/studio/src/screens/site-settings.jsx` (extend)
  - `site-studio/server.js` (+1 mount line for new router — last allowed minor edit)
- **MUST NOT TOUCH:** other server.js code; other lanes' files.

### Lane E2 — Recipe node live-status binding

**Goal.** Each recipe node maps to a section. Bind node status to whether that section has active/recent intelligence runs. Read-only; uses existing `/api/intelligence/runs` route.

- **MAY WRITE:**
  - `site-studio/public/studio/src/lib/recipes.js` (extend — `bindRecipeStatuses(recipe, runs)` helper)
  - `site-studio/public/studio/src/recipe-flow.jsx` (extend — fetch runs on mount, apply binding)
  - `site-studio/public/studio/src/lib/memory-tail.js` (extend if needed — reuse)
- **MUST NOT TOUCH:** other lanes' files; intelligence-* server modules.

### Lane F2 — Sites freshness from filesystem mtime

**Goal.** Add `updated_at` field derived from `mtime` of `sites/<tag>/spec.json` to `/api/intelligence/sites` response. Sites screen renders a real freshness chip.

- **MAY WRITE:**
  - `site-studio/server/intelligence-reader.js` (extend — `listSites` returns `updated_at`)
  - `site-studio/public/studio/src/screens/sites.jsx` (extend — render freshness chip)
- **MUST NOT TOUCH:** other lanes' files; `intelligence-actions.js`; `intelligence-writer.js`.

### Lane G2 — QA / Proof

- **MAY WRITE:**
  - `tests/studio/lane-static-checks.js` (extend with Phase 2 invariants)
  - `site-studio/server/__smoke__/studio-phase2-verify.js` (NEW)

## 3. Cross-lane integration markers

Same convention as Phase 0/1; lanes won't collide much in Phase 2 because each owns disjoint server/client files. Two exceptions:

- `server.js` — only Lane D2 may touch (+1 mount line for `site-settings-routes`). Hard cap: +1 line.
- `lib/recipes.js` — both Lane E2 (status binding) and Phase 1's existing nodes coexist; E2 just adds a helper function alongside the existing data.

## 4. Merge / integration order

1. Lane A2 (postMessage listener — touches index.html, low-risk additive)
2. Lane B2 (media polish — own files)
3. Lane C2 (components insert — own files + new server route)
4. Lane D2 (site-settings overrides — owns new server files + server.js +1 line)
5. Lane E2 (recipe status — own helper + recipe-flow extension)
6. Lane F2 (sites freshness — extends intelligence-reader)
7. Orchestrator: update `studio.html` for new lib (`site-settings-api.js`)
8. Orchestrator: run static-checks → expect green
9. Lane G2 dispatch.

## 5. Hard blockers (from brief)

- repo write/build impossible
- existing Site Builder breaks and cannot be restored
- existing Mission Control breaks and cannot be restored
- repeated Lane G2 failure after documented retries
- production/deploy/DNS/payment/destructive action required
- paid/cloud call required
- `server.js` growth beyond +1 line (only Lane D2 may add a mount line)

## 6. End condition

Fritz can open `/studio.html` and:

1. **Sites** — see real freshness chip per card (Lane F2); New-site chip flashes correctly before navigate (Lane A2 fix).
2. **Site Builder** — Preview/Inspect/Refine buttons fire postMessage; embedded `/index.html` actually responds (Lane A2).
3. **Site Settings** — overrides file persists; Reset-to-platform works (Lane D2).
4. **Media Studio** — Save-local-test-asset uses inline form (Lane B2).
5. **Media Library** — summary chips show all 7 status buckets (Lane B2).
6. **Component Studio** — Insert (surgical) now writes to a SANDBOXED `_test/inserts/` directory and records history (Lane C2). Still never touches a real site's `dist/`.
7. **Recipe flow** — node statuses reflect real intelligence-runs activity (Lane E2).
8. Mission Control + `/index.html` + `/operator.html` all still work.
9. Lane G2 static + browser prongs green.
