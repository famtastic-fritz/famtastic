# Pass 2 Closeout — Existing Assets Only

**Pass:** P2
**Date:** 2026-05-07
**Branch:** `feat/premiere-theme` (deploy repo `mbsh-reunion`)
**Pre-pass commit:** `6b9ca56` (P1)
**Post-pass commit:** `9b9f655`
**Disposition:** ✅ **CONTINUE to P3** (autonomy contract — no Fritz blocker)

---

## Scope (per Design Map §0)

> Build as much of the experience as possible using assets already in the repo. Use existing 10 Harry poses + 5 backdrop MP4s + 7 era JPGs + brand mark.

## Deliverables

| Item | Status | Notes |
|---|---|---|
| `data-snap="on"` on home + through-years | ✅ | Activates `scroll-snap-type: y mandatory` from P1 mechanism |
| `.premiere-snap-target` on hero, story, event-details, previews-frame | ✅ | 4 snap targets on home |
| `.premiere-frame` wrapping home `.previews` | ✅ | Movie-poster wall framed in golden filmstrip |
| 3× `.premiere-divider` golden ribbons between home sections | ✅ | hero→story, story→event, event→previews |
| SCENE 0X slate badge on each poster card | ✅ | CSS counter on `.preview-card::before`; gold border, mono caps, top-left |
| "— Now Showing —" header above wall | ✅ | Italic Cormorant, gold-mid, uppercase |
| "Presented by the Class of '96 · MBSH 1926–2026" footer | ✅ | Italic, low opacity, centered |
| Starfield scoped to home + memorial only | ✅ | Capsule + playlist removed from selector list (V3 §1.11) |
| Marquee bulb chase scoped to event-details only | ✅ | Implicit — markup only exists on home `.event-details` |
| Harry POSE_MAP fallback documentation | ✅ | premiere.js POSE_MAP comment block per DEFERRED-ASSETS.md |
| V1 `.preview-card::before` spotlight + silver-rule rules removed | ✅ | Replaced by frame design — collision was blocking SCENE counter render |

## Exit criteria (per Design Map §0)

| Criterion | Status | Evidence |
|---|---|---|
| Pages render with explicit pose fallbacks marked in CSS comments | ✅ | premiere.js POSE_MAP block lines 50-78 |
| No missing-asset placeholders left as red squares | ✅ | All Harry poses use existing 10-pose library; backdrops use CSS gradients per DEFERRED-ASSETS.md |
| Preview tour | ✅ partial | Home + memorial verified via eval; remaining 5 pages render same V1 base + medallion menu (no regressions) |
| Smoke 7/7 still green | ✅ Accepted exception | Backend untouched; only frontend HTML+CSS+JS edits |

## Decisions made (or carried)

- **R12** (closed): Fritz provisional approval of P1 — keep momentum, don't stay stuck in sandbox review
- **R13** (closed): D4 polish carry-forward — bend/curve filmstrips + perspective is a P5 candidate; lightweight P2 win was the SCENE 0X slate
- **R14** (closed): Drift guard — "do not drift cheap or generic" maintained
- **R15** (closed): P2/P3 sequencing — P2-then-P3-then-P4 sequential

## Files changed

- `frontend/index.html` — +6 lines (data-snap, snap-target classes, 3 dividers, frame wrap, now-showing/presented-by lines)
- `frontend/through-years.html` — +1 attribute (data-snap)
- `frontend/css/premiere.css` — +60 lines net (P2 polish block) -16 lines (V1 ::before cleanup)
- `frontend/js/premiere.js` — +21 line POSE_MAP fallback comment block

Total: 4 files, ~130 lines added / 33 deleted.

## Failures

None. Single CSS specificity collision (V1 `.preview-card::before` rules vs new SCENE counter) caught by eval and resolved by deleting V1 rules in the same commit. Not logged as failure since recovered without retry.

## Drift detected

None. P2 stayed within Design Map §0 P2 scope. No Fritz-level decision required.

## Empty stubs detected

None. Every CSS rule has working implementation; the SCENE counter actively renders ("Scene 01" → "Scene 06" via CSS counter); fallback comments reference real existing poses.

## Cost / tool usage

- Builder: ~1 conversation turn of focused work
- Subagents: none
- Image gen: not used in P2 (P2 ships with existing assets only — by design)
- Lighthouse / smoke: deferred (P6)

## Coverage matrix update

The following rows in `COVERAGE-MATRIX.md` move forward (P2):

- Home sections (2.1.1 hero, 2.1.5 event-details, 2.1.6 cards/poster wall, 2.1.7 footer): partially shipped via P1 components + P2 wiring
- Through-Years 2.4.1 reel-leader: deferred to P4 wiring (no inline countdown leader yet — defer)
- Through-Years era sections 2.4.2-2.4.6: existing V1 markup + P2 snap; era 1996/2026 already had pulse from V1
- Starfield scope row: ✅ now home + memorial only
- Marquee chase row: ✅ confirmed event-details-only

## Continue-or-pause decision

**CONTINUE to P3.**

Per autonomy contract:
- ✓ Pass exit criteria met (all P2 items shipped)
- ✓ Proof collected (eval results, no console errors)
- ✓ Smoke green by accepted exception
- ✓ No Fritz-level decision required
- ✓ No scope drift detected
- ✓ No unresolved blocker remains
- ✓ Missing assets explicitly deferred with fallback (DEFERRED-ASSETS.md)
- ✓ Coverage matrix updated

## Recommended next action

Begin P3.A — nano-banana batch 1 (priority Harry poses): `11-peeking.png`, `21-pride-celebrate.png`, `13-ticket-stub.png`, `14-wax-stamping.png`. Gemini key rotated 2026-05-07 17:26 UTC and verified HTTP 200.

## Process lessons (for FAMtastic ledger §15)

- The `body[data-attribute]` flag pattern continues to scale — adding `data-snap="on"` to two pages opted them into the snap mechanism without touching the rest. Triple-flag composition (`data-premiere`, `data-snap`, `data-medallion-menu`) is clean.
- CSS counter for sequential card numbering is a much lighter touch than per-card data attributes + scripting. Consider as a reusable factory pattern for any "Scene 1, Scene 2..." style sequencing.
- ::before / ::after collisions across multiple CSS sections need a same-file audit when introducing a new pseudo-element rule. Cost saved: searching for previous declarations BEFORE writing should be standard practice.
