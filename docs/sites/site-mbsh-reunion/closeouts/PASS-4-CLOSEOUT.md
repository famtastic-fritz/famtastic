# Pass 4 Closeout — Asset Integration

**Pass:** P4
**Date:** 2026-05-07
**Branch:** `feat/premiere-theme`
**Pre-pass commit:** `ed28511` (P3 batch 3)
**Post-pass commit:** `1006c99`

---

## Scope (Design Map §0)

> Replace fallbacks with approved assets — pose integration, background integration, visual frame integration, ticket/capsule/sponsor asset integration.

## Deliverables

| Item | Status |
|---|---|
| `POSE_MAP` (premiere.js) — 8 fallbacks swapped to real poses | ✅ |
| `bg-rsvp.jpg` wired via `.premiere-stage::before` | ✅ |
| `bg-tickets.jpg` wired | ✅ |
| `bg-capsule.jpg` wired | ✅ |
| `brand-mark-foil.png` swapped on hero `hero__mark` + `story__forever-mark` | ✅ |
| Tier medallions attached to patron mini-cards (`Marquee → tier-platinum`, `Producer → tier-gold`, `Featured → tier-silver`) | ✅ |
| `tier-bronze.png` retained for future tier expansion | ✅ |

POSE_MAP swaps:
- `home_event` 04-excited-cheer → **21-pride-celebrate**
- `home_footer` 02-thumbs-up → **23-salute**
- `rsvp` 06-listening → **15-seated-usher**
- `rsvp_success` 02-thumbs-up → **13-ticket-stub**
- `tickets` 08-pointing → **18-presenting**
- `through-years` 03-thinking → **12-clipboard**
- `capsule` 08-pointing → **20-pointing-across**
- `capsule_success` 04-excited-cheer → **14-wax-stamping**
- `playlist` 04-excited-cheer → **16-conducting**

## Exit criteria

| Criterion | Status |
|---|---|
| Before/after comparisons | ✅ documented in commit message |
| List of fallbacks removed | ✅ above table |
| List of fallbacks still deferred | None — 0 deferrals across P3+P4 |
| Page preview | ✅ verified home / rsvp / tickets / capsule via eval; zero console errors |

## Files changed

- `frontend/index.html` (brand-mark swap)
- `frontend/tickets.html` (3 medallion images)
- `frontend/css/premiere.css` (medallion styles + 3 backdrop image rules)
- `frontend/js/premiere.js` (POSE_MAP)

## Continue-or-pause

**CONTINUE to P5.** All exit criteria met, no Fritz blocker, no drift, no empty stubs.
