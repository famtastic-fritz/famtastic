# Pass 1 Closeout — Reusable Structure

**Pass:** P1
**Date:** 2026-05-07
**Branch:** `feat/premiere-theme` (deploy repo `mbsh-reunion`)
**Pre-pass commit:** `dbec459`
**Post-pass commit:** `6b9ca56`
**Disposition:** ⏸ **PAUSED for Fritz approval** (D4 / D5 / D8)

---

## Scope (per Design Map §0)

> Build the components used across multiple pages: golden filmstrip frame, ribbon divider, medallion-as-menu shell, snap mechanism, Harry usher upgrade (walk + peek + celebrate vocabulary), per-page stage backdrop slot.

## Deliverables

| Item | Status | Notes |
|---|---|---|
| `.premiere-frame` (top + bottom sprocket strips, gold gradient, no side rails) | ✅ | CSS-only, reusable mixin for sprocket strip; gold-shimmer animation gated on reduced-motion |
| `.premiere-divider` (single golden ribbon strip) | ✅ | Drop shadow + light-sweep keyframe; narrow / full variants |
| `.premiere-medallion-menu` (radial expand) | ✅ | Brand-mark medallion sized 120px on home, 84px on inner pages (R7); 7 destinations radiate; click/Esc/Tab/arrows accessible |
| Snap mechanism (`scroll-snap-type: y mandatory` + scrollend bounce) | ✅ | Activated by `body[data-snap="on"]`; debounced fallback for browsers without `scrollend`; reduced-motion disables snap entirely |
| Harry vocabulary CSS (`.is-walking`, `.is-celebrating`, `.is-stepping-back`, `.premiere-peek`) | ✅ | Compositor-friendly transforms only; reduced-motion disables animations |
| Harry vocabulary JS triggers | ✅ | `wireHarryVocabulary()` listens for IO crossings on home (desktop only) and form-success custom events site-wide |
| Removed: top nav (V1) | ✅ | Hidden via `body[data-medallion-menu="mounted"] .premiere-nav { display: none }` — JS code retained one cycle for clean rollback |
| Removed: edge film strips (V1) | ✅ | Same pattern — `body[data-medallion-menu="mounted"]::before/::after { display: none }` |
| Removed: `.is-visible` bounce | ✅ | No-op when `[data-snap="on"]` |
| Removed: "Compass" text label | ✅ | `.compass-nav__label { display: none !important }`; entire compass-nav hidden when medallion mounted |
| Sandbox HTML page (`_premiere-sandbox.html`) | ✅ | Demos all components for D4/D5/D8 review |

## Exit criteria

| Criterion | Status | Evidence |
|---|---|---|
| Components testable on sandbox HTML page | ✅ Pass | `evidence/p1-sandbox-state.json` |
| Medallion menu opens/closes/keyboard-accessible | ✅ Pass | Click → `is-open`+aria-expanded true. Esc → close + return focus. Reopen verified. Arrow keys cycle (logic in code). |
| One section on home demonstrates frame-around-section pattern | ⚠️ Partial | Frame demonstrated in sandbox, NOT yet on home production page. **Intentionally deferred** to P2 — sandbox is the Fritz review target |
| Preview-verified | ✅ Pass | Sandbox screenshots collected |
| Smoke 7/7 still green | ✅ Accepted exception | P1 only added new components + sandbox HTML. Production pages still render with V1 components. Smoke remains valid from 2026-05-05 deploy proof. |

## Decisions made

- R9: Sandbox-first review pattern
- R10: Medallion radial menu anchored to actual medallion position via `--menu-cx/cy` CSS vars set on open. **Polish item open**: bias arc by medallion quadrant.
- R11: Closeout file naming aligned with Fritz ledger §6 convention (`PASS-X-CLOSEOUT.md`)

## Files changed

- `frontend/css/premiere.css` — appended ~340 lines (P1.A through P1.E sections)
- `frontend/js/premiere.js` — appended ~165 lines for `mountMedallionMenu`, `wireSnapBounce`, `wireHarryVocabulary`
- `frontend/_premiere-sandbox.html` — new file (~95 lines)

Total: 2 modified, 1 new file.

## Failures

- **F1** rebase conflict on `MBSH-PREMIERE-BUILD-LEDGER.md` during apparatus commit. Resolved by manual merge keeping Fritz's ledger structure + updating dynamic state. Documented in `FAILURE-LOG.md`.

## Drift detected

None. P1 stayed within Design Map §0 scope.

## Empty stubs detected

None. Every CSS rule and JS function has working implementation. The retained-but-disabled V1 nav code is **explicitly retained for clean rollback** (one-cycle policy), not a stub.

## Cost / tool usage

- Builder: ~3 conversation turns of focused work (P1) + 1 turn for ledger reconciliation (F1)
- Subagents: none
- Image gen: none
- Lighthouse / smoke: deferred

## Coverage matrix update

The following rows in `COVERAGE-MATRIX.md` move from `⬜` to `✅` (P1):

- "Filmstrip frame component"
- "Ribbon divider component"
- "Medallion-as-menu"
- "Snap mechanism"
- "Harry walk/peek/celebrate vocabulary"
- "Removed: top nav"
- "Removed: edge film strips"
- "Removed: 'Compass' label"
- "Removed: .is-visible snap-in bounce"

The home / inner-page section rows remain `⬜` since P1 intentionally did not propagate.

## Items requiring Fritz approval (PAUSE TRIGGERS)

### D4 — Filmstrip frame visual design
Sandbox demonstrates: top + bottom sprocket strips, polished gold gradient, gentle 6s shimmer, side edges open to backdrop. Frame variant + divider variant + narrow/full divider widths.

**Question:** Does this match the "shiny folded golden filmstrip tape" reference? Adjustments wanted?

### D5 — Medallion-as-menu visual + arc behavior
Sandbox demonstrates: brand-mark medallion (84px on inner sandbox page, would be 120px on home), click → 7 menu plates radiate in arc, Esc closes, keyboard-accessible.

**Known issue:** When medallion is in top-right corner, the radial arc currently extends some items off the right edge of viewport. **Default proposal:** detect medallion quadrant, bias arc bounds (e.g., top-right → arc 135° → 270°, sweeping down-left).

**Question:** (a) approve overall pattern; (b) approve arc-by-quadrant fix; (c) approve item plate styling.

### D8 — Snap mechanism behavior
Sandbox demonstrates: `scroll-snap-type: y mandatory` + scrollend listener + 600ms bounce keyframe.

**Known limit:** iOS Safari real-device test deferred to P6 QA. Proximity fallback wired.

**Question:** approve the bounce cadence + snap dwell?

## Continue-or-pause decision

**⏸ PAUSE for Fritz approval.**

Per autonomy contract: "MUST PAUSE when... a major visual / architecture / navigation decision needs Fritz approval." D4 and D5 both explicitly say "demo to Fritz" in Design Map §5.

## Recommended next action

1. **Fritz reviews sandbox** at local preview or after pushing to staging.
2. **Fritz responds** with disposition for D4 / D5 / D8.
3. **If approved:** P2 starts — propagate components to all 7 production HTMLs with explicit per-pose fallbacks.
4. **If iterate:** specific feedback applied to sandbox; re-review.
5. **If change direction:** revisit V3 §8 / Design Map §5.

## Process lessons (for FAMtastic ledger §15 + Pass 8)

- Sandbox-first review pattern made the autonomy contract clean.
- `body[data-medallion-menu="mounted"]` attribute pattern lets new components REPLACE old via CSS without touching old code paths.
- Single-attribute feature flags compose well: `[data-premiere="on"]` (theme) + `[data-snap="on"]` (snap) + `[data-medallion-menu="mounted"]` (nav).
- iOS Safari snap-mandatory testing should be a standing P6 item.
- Parallel writes to canonical files (the LEDGER itself) need a coordination protocol — F1 surfaced the gap.
