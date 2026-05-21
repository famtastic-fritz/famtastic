# FAMtastic Studio — Design-to-Implementation Plan

**Date:** 2026-05-10
**Phase:** 4 of 5 (drift-correction realignment)
**Status:** Plan only — no implementation in this pass

This plan answers how to land the Claude Design template as the new Studio shell **without breaking the existing chat-driven build flow** and **without making Mission Control the whole product**.

---

## 1. How to use the design template without breaking existing Studio functionality

### Strategy: parallel shell, not in-place replacement
Mount the new shell at a new public path `/studio/` (or `/studio.html` for the entry) and leave `/index.html` and `/operator.html` working **untouched** until the new shell can host their flows end-to-end.

```
site-studio/public/
├── index.html                  ← existing chat shell (UNCHANGED in this pass)
├── operator.html               ← existing Mission Control (UNCHANGED)
├── studio.html                 ← NEW: design entry, loads design template
└── studio/                     ← NEW: design assets
    ├── styles.css              (renamed/scoped tokens)
    ├── src/
    │   ├── shell.jsx           (rail with 12 items per IA doc, not the design's 9)
    │   ├── primitives.jsx
    │   ├── icons.jsx
    │   ├── app.jsx
    │   └── screens/*.jsx
    └── README.md
```

### Token scoping
The design uses generic CSS variable names (`--ember`, `--bg`, `--ink`) that would collide with `operator.css` if loaded in the same scope. Two options:

**(A) Scope all new tokens under `.studio-shell`.** Rewrite `styles.css` to begin every rule with `.studio-shell` (or set tokens on `.studio-shell { ... }` instead of `:root`). Operator stays self-contained.

**(B) Adopt the new tokens as `:root` and rename operator's tokens to its own scope.** Cleaner long-term, more invasive now.

**Recommend (A) for this realignment pass.** Switch to (B) when Mission Control gets folded into the new shell.

### Babel-in-browser is fine for the prototype
Keep `<script type="text/babel">` for the first iteration. It's fast enough for a desktop tool and avoids introducing build tooling. Migrate to a real bundler **only** when (a) a real user is hitting it daily, or (b) the screens grow past ~50 modules. Document this trade-off in the README.

### Don't touch what works
- `site-studio/server.js` route order is sacred (per CLAUDE.md "Static Express routes register before parameterized routes"). The new shell is purely static under `/studio/*`, so it just sits inside the existing `app.use(express.static(...))` block.
- `runPostProcessing()` and `TAG` invariants stay intact.
- `lib/fam-motion.js`, `lib/fam-shapes.css`, `lib/character-branding.js` remain off-limits per the standing rules.

---

## 2. How to preserve build-new-site / chat / preview behavior

The existing chat-driven Site Builder lives in `index.html` + `server.js` chat handlers + `studio-actions.js`. Don't move any of it in this pass.

When `studio.html` lands, the **Site Builder screen** should initially be a thin wrapper that **iframes `index.html?embedded=1`** with the design's chrome (rail + topbar + memory strip) around it. That way:
- Existing chat flow keeps working byte-for-byte.
- The design's Builder layout is visible.
- Migration can be done section-by-section (chat into design panes, plan card into design plan slot, etc.) without a giant rewrite.

Switch from iframe to native composition once the design's chat panel and preview pane are wired to the same WebSocket and HTTP routes the existing shell uses.

---

## 3. How to integrate Operator / Mission Control as one section

The same iframe pattern: in the new shell, the **Mission Control screen** initially iframes `operator.html?embedded=1` (with our latest patches from `ff9ae42`). The new shell's rail/topbar/memory-strip wrap it. When Mission Control proves stable in the wrapper, port the operator's panes into the new shell's primitives natively.

**Hard rule (from drift-correction notes):** Mission Control is **one** rail item, **one** route, and **one** screen file. It does not host content from other sections. Even when it's iframed in, the new rail doesn't expose Mission Control's sub-views as siblings of Sites/Media/etc.

---

## 4. Files likely to change

### New files (created in implementation pass — NOT this realignment pass)
```
site-studio/public/studio.html                    (new shell entry)
site-studio/public/studio/styles.css              (scoped design tokens)
site-studio/public/studio/src/shell.jsx           (12-item rail, topbar, strip, panel)
site-studio/public/studio/src/primitives.jsx      (port from design ZIP)
site-studio/public/studio/src/icons.jsx           (port + add 3 icons: builder, library, sites variant)
site-studio/public/studio/src/app.jsx             (12-route in-memory router OR hash router)
site-studio/public/studio/src/screens/*.jsx       (12 screens; iframe wrappers initially)
site-studio/public/studio/src/lib/current-context.js  (each screen publishes currentContext for Shay)
site-studio/server/studio-context.js              (server-side helper for currentContext fetch, optional)
```

### Files modified (in implementation pass — NOT this realignment pass)
```
site-studio/server.js                             (one line: ensure /studio/* serves from public/studio)
site-studio/public/index.html                     (one line: support ?embedded=1 to hide its own chrome)
site-studio/public/operator.html                  (one line: support ?embedded=1)
```

That's it. **No mass refactor.**

### Files that MUST NOT change in implementation pass
```
site-studio/lib/fam-motion.js
site-studio/lib/fam-shapes.css
site-studio/lib/character-branding.js
site-studio/server/intelligence-routes.js
site-studio/server/intelligence-actions.js
site-studio/server/intelligence-writer.js
site-studio/server/intelligence-reader.js
site-studio/lib/studio-actions.js
site-studio/public/css/operator.css
site-studio/public/js/operator.js
site-studio/public/js/operator-actions.js
```

---

## 5. What should be built first

Strictly ordered. Each row is a checkpoint.

| # | Build item | Acceptance |
|---|---|---|
| 1 | Port design to `public/studio/` with token scoping. Add `/studio.html`. | Loads, renders Home screen with no console errors. Existing `/index.html` and `/operator.html` unaffected (curl 200 + smoke). |
| 2 | Promote rail to 12 items per IA doc. Add 3 icons (builder, library, sites variant). | All 12 rail items click and render their stub screen. |
| 3 | Iframe-wrap **Site Builder** = `index.html?embedded=1`. | Chat-driven build still works inside the new shell. Existing Studio behavior unchanged. |
| 4 | Iframe-wrap **Mission Control** = `operator.html?embedded=1`. | Operator action layer (verified in `OPERATOR-ACTION-BROWSER-VERIFY-REPORT.md`) still works inside the new shell. |
| 5 | Read-only **Sites Dashboard** screen using `GET /api/intelligence/sites`. | Site cards render with honest count + status. |
| 6 | Read-only **Media Library** screen reading from `public/img/` index. | Tile grid renders; metadata shows "uploaded" provenance for files on disk. |
| 7 | Read-only **Research Center** index reading from `docs/research/famtastic-studio-execution/`. | Brief list renders; a brief detail page renders the markdown. |
| 8 | Read-only **Component Studio** library view from `components/library.json`. | Component cards render with version chip and slot count. |
| 9 | Read-only **Think-Tank Board** from `captures/inbox/*.capture.json`. | Captures render in a single "Capture" column. |
| 10 | **Shay** screen wired to existing `shay-shay-sessions.js`. | Chat round-trips; "Explain current screen" returns a non-empty summary. |
| 11 | **Settings** read-only view (display existing `studio-config.json` + `model-config.json`). | Values render; no editing yet. |
| 12 | **Site Settings** scope toggle (display only). | Diff renderer shows zero diffs when no overrides exist. |
| 13 | **Memory Strip** wired to a real activity feed (`captures/`, `runs/*/ledger.json` tail). | Last 5 events render with honest timestamps. |
| 14 | **Visual Flow** renderer in Mission Control reads from a single recipe instance. | Recipe 1's 8 nodes render with current node highlighted. |

Stop after 14. Editing/writing UIs come in a later pass.

---

## 6. What should not be touched yet

- The chat WebSocket + plan-mode flows — leave them where they are; iframe them in.
- Mission Control internals (intelligence-* server modules) — Operator's commit `ff9ae42` is good; do not refactor it during the shell port.
- The motion/shapes/character-branding files (standing rule).
- Any production deploy hooks — this is local-only work.
- Captures/memory CLI (`fam-hub idea`) — keep CLI working alongside the new UI.
- Existing `_mockup-*.html` files — leave them as references.

---

## 7. What is real now vs placeholder

Repeating the table from the IA doc for fast reference (in this implementation context):

| Section | Real today | Plan during shell port |
|---|---|---|
| Home | placeholder | Stub with rail + memory strip wired to live data |
| Sites | data only, no UI | Build read-only dashboard (item #5) |
| Site Builder | **chat + preview real** | Iframe-wrap (item #3); migrate panels later |
| Site Settings | config only | Stub with diff (item #12) |
| Think-Tank | CLI only | Read-only board (item #9) |
| Research Center | docs + dispatcher | Read-only briefs (item #7) |
| Component Studio | registry + surgical edits | Read-only library (item #8) |
| Media Studio | adapters + telemetry | Stub; build later |
| Media Library | files only | Read-only tile grid (item #6) |
| Shay Shay | sessions + brain plumbing | Read-write chat (item #10) |
| Mission Control | **fully real** | Iframe-wrap (item #4) |
| Settings | config only | Read-only (item #11) |

---

## 8. What validation proves Studio still works

After every checkpoint above:

1. `node --check site-studio/server.js` — syntax sane.
2. `curl -s http://127.0.0.1:3335/index.html | head -1` returns `HTTP/1.1 200 OK` and HTML — existing chat shell still served.
3. `curl -s http://127.0.0.1:3335/operator.html | head -1` returns `200` — Operator still served.
4. The two existing browser smokes pass:
   - `node site-studio/server/__smoke__/operator-action-browser-pw.js --spawn-server` (PASS expected, all 12 assertions green).
   - The intelligence-actions in-process smoke (`server/__smoke__/operator-action-repro.js`) — PASS.
5. New shell smoke (to be written): `studio.html` loads, all 12 rail items navigate to their screen, no console errors, no requestfailed.
6. `git diff --check` — no whitespace errors.
7. `npx vitest run` (on the host, where rolldown works) — pre-existing tests pass.
8. Manually: hard-refresh `/studio.html`, click Mission Control rail item, click **Start Refinement Run**, type `mbsh-v2-refinement-001`, expect green pill "already exists — opened." inside the iframed operator. (Proves the iframe wrapper preserves operator behavior.)

---

## 9. Risks specific to this plan

| # | Risk | Mitigation |
|---|---|---|
| R1 | Token collision between design and `operator.css` | Scope new tokens under `.studio-shell` or rename in operator.css |
| R2 | Rail divergence (design 9 vs spec 12) | Authoritative source is the IA doc, not the design template |
| R3 | iframe scrollbar/styling inside new shell looks awkward | Add `?embedded=1` toggle in `index.html` and `operator.html` to hide their own chrome |
| R4 | Babel-in-browser slow under heavy screens | Capped at ~50 modules; tracked in implementation README; revisit if needed |
| R5 | New shell hides Sites / Builder / Shay / Media flows behind layout polish | The 14-item ordered checklist front-loads the read-only views so all sections are visible from day one |
| R6 | Drift back to "Mission Control = everything" | The drift-correction notes (Phase 5) and the 12-item rail are the guardrails |

---

## 10. Out of scope (this pass)

- Any code change in this realignment pass beyond the five docs themselves.
- Any deploy.
- Any MBSH change.
- Any DNS/payment/destructive change.
- Any paid/cloud call.
- Any change to `site-studio/server.js`.
- Any change to existing operator/intelligence code.

This pass is **mapping/spec only**. The implementation pass that follows must follow the ordered checklist above.

---

## Acceptance — Phase 4

- [x] Strategy stated for landing the design without breaking existing Studio (parallel shell + iframe wrappers).
- [x] Plan to preserve chat/preview/build behavior documented.
- [x] Mission Control integration documented as **one section, iframed initially, ported later**.
- [x] Files to create / modify / leave-alone enumerated.
- [x] Build-first ordered checklist (14 items) with acceptance per item.
- [x] What should not be touched yet enumerated.
- [x] Real-vs-placeholder table included.
- [x] Validation criteria documented; existing smokes referenced.
- [x] Risks listed with mitigations.
- [x] Out-of-scope statement explicit.
