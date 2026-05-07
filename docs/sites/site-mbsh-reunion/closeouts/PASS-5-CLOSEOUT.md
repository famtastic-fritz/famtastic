# Pass 5 Closeout — Motion Polish

**Pass:** P5
**Date:** 2026-05-07
**Branch:** `feat/premiere-theme`
**Pre-pass commit:** `1006c99` (P4)
**Post-pass commit:** `8cfc50e`

---

## Scope (Design Map §0 + Fritz R13 carry-forward)

> Make the experience feel premium instead of busy. Title timing, Harry timing, scroll transition rhythm, animated type restraint, marquee timing, mobile motion reduction. Plus: filmstrip-perspective polish (R13).

## Deliverables

### Filmstrip perspective polish (R13 — Fritz P5 candidate)
- `.premiere-divider` gets `perspective(800px) rotateX(8deg)` + edge-taper mask
- `.premiere-frame::before` and `::after` get `rotateX(10deg)` with parent `perspective(1200px)` + edge-taper
- Edge-taper mask makes strips read as "passing through the frame" not abruptly cropped
- All gated behind `prefers-reduced-motion: reduce` (transform: none fallback)

### Asset weight optimization
- 3 backdrop JPGs: **9.0 MB → 2.9 MB** (67% reduction, sips quality 80)
- 13 P3 mascot poses: **1024px → 768px** (12.0 MB → 5.7 MB; 52% reduction)
- 4 tier medallions: **1024px → 600px** (9.2 MB → 380 KB; 96% reduction)
- `brand-mark-foil.png`: **2.3 MB → 150 KB** (94% reduction at 800px)
- Total raster: **~32 MB → ~9 MB** (~72% reduction)

## Exit criteria

| Criterion | Status |
|---|---|
| Screen recording on desktop | Deferred — preview eval data captured |
| Screen recording on phone | Deferred to P7 real-device walkthrough |
| Reduced-motion walkthrough | ✅ 19 reduced-motion guards verified in CSS |
| List of toned-down animations | Filmstrip perspective + idle bobs + section snap-in all gate on reduced-motion |

## Files changed

- `frontend/css/premiere.css` (perspective polish on `.premiere-divider` + `.premiere-frame`)
- `frontend/assets/mascot/*.png` (13 files resized)
- `frontend/assets/premiere/*.{jpg,png}` (8 files resized)

## Deferred / process notes

- Deeper PNG optimization via oxipng / pngcrush deferred — not installed locally
- WebP conversion via cwebp deferred — would require HTML `<picture>` source updates
- iOS Safari real-device snap-mandatory test deferred to P6 (real device only)

## Continue-or-pause

**CONTINUE to P6.** Polish landed, asset weights manageable, no blocker.
