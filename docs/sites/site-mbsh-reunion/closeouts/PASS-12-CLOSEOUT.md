# Pass 12 — Final Reel footer + dirty-Harry cleanup + FX calibration

**Date:** 2026-05-08
**Branch:** `staging` — committed `aa8e69b`, deployed live to `https://mbsh-reunion-staging.netlify.app`
**Pre-commit head:** `0389d3f`

## What landed

### 1. FX overlay calibration

`.premiere-fx` had drifted from its P0 spec (6% opacity) up to 55% during
early animation tuning. At 55% with `mix-blend-mode: overlay` on dark
sections (footer + memorial) the noise pattern crushed contrast — it was
the root cause of the "footer renders as black on desktop" regression
spotted in the audit.

- opacity: `0.55 → 0.08`
- z-index: `50 → 1` (now sits below all interactive content)
- pointer-events: confirmed `none`

### 2. `.premiere-usher` removed

The corner-floating Harry from P1 stacked on top of `.chatbot__bubble`
in the same bottom-right corner — two red buttons reading as a render
glitch ("dirty Harry" complaint). The role was always going to be
absorbed by the per-section `.harry-in-scene` system + the chatbot
bubble.

- `mountUsher()` no longer called from `init()`
- `harryIntro()` is a no-op early-return (the home billboard's slide-1
  welcome carries the same opening line on-system now)
- CSS hides any residual `.premiere-usher` or `.premiere-usher-intro`
  nodes as belt-and-suspenders
- `.hero__harry` markup removed from `index.html` (was already
  `display:none` after P11; wasted DOM weight)

### 3. Final Reel footer

The footer is now the closing scene of the premiere. `injectFooterSiteMap()`
(repurposed) rewrites the footer's innerHTML on every page into:

```
[scarlet→gold curtain rail]
[centered seal medallion (brand-mark-foil), 100px mobile / 140px desktop]
MBSH · 1926 — 2026                      (Cinzel uppercase eyebrow)
Class of 1996 · 30th Reunion            (Italiana italic)
Let us be known for our deeds.          (Allura cursive, gold)
─── thin gold rule ───
— A FINAL CREDIT ROLL —
Reunion Committee · mbsh96reunion@gmail.com
Visit · RSVP · Tickets · Through the Years · In Memory · Time Capsule · Soundtrack
Official MBSH Site · Submit a memory · Become a sponsor
Instagram & Facebook coming soon — drop a note to the committee for a heads-up.
─── thin gold rule ───
— ENCORE —
© 2026 MBSH Class of '96 Reunion Committee
Built with FAMtastic Site Studio
[scarlet→gold curtain rail]
```

Idempotent — the upgrader checks for the `.footer--final-reel` marker
before rewriting so reruns are safe.

CSS forces `display: block` on `.footer__inner` to override the legacy
3-column grid from `footer.css`.

### 4. Footer joins the archetype system

`collectPageSections()` now includes `<footer.footer--final-reel>` as the
last section. The chevron injector wires it up automatically:

- Where-Next down-chevron now lands on the footer (footer is the new
  last section in DOM order)
- Footer gets an up-chevron at top-left (sends user back to Where-Next)
- Footer down-chevron is suppressed (it's the end of the reel)

### 5. Desktop / mobile delta

| Property | Desktop | Mobile |
|---|---|---|
| `min-height` | `100dvh` (full final scene) | `auto` (compact, no extra forced viewport) |
| Seal size | 140px | 96–100px |
| Layout | flex-centered, vertical credit roll | block, vertical credit roll |
| Curtain rails | 4px scarlet→gold gradient bars top + bottom | same |

## Files changed

- `frontend/css/premiere.css` — FX opacity + z-index, hide
  `.premiere-usher` + `.premiere-usher-intro` + `.hero__harry`,
  Pass-12 footer block (curtain rails, seal, motto, credit roll,
  encore, mobile breakpoint)
- `frontend/js/premiere.js` — `injectFooterSiteMap()` repurposed as
  the Final Reel upgrader, `collectPageSections()` includes the
  upgraded footer, `mountUsher()` not called from init,
  `harryIntro()` early-returns
- `frontend/index.html` — removed legacy `<img class="hero__harry">`

No HTML edits to inner pages — the JS upgrader runs on every page
that already loads `premiere.js`.

## Verification

DOM probe per page (desktop + mobile, after staging deploy):

| Check | Result |
|---|---|
| `.footer--final-reel` mounted | ✓ on every page |
| Footer `data-mode="scene"` | ✓ on every page |
| `.premiere-usher` exists | ✗ (removed) |
| `.premiere-usher-intro` exists | ✗ (removed) |
| `.hero__harry` exists | ✗ (removed) |
| Single corner Harry (`.chatbot__bubble`) | ✓ |
| FX opacity | `0.08` |
| FX z-index | `1` |
| Footer up-chevron mounted | ✓ |
| Footer down-chevron mounted | ✗ (correct — last scene) |
| Where-Next down-chevron lands on footer | ✓ |
| Console errors | none beyond unrelated config / API checks |

Proofs in repo root `proofs/pass12/`:
- `footer-final-reel-desktop-fix1.png` — Final Reel on desktop, seal +
  Cinzel + Italiana + Allura motto + credit roll
- `footer-final-reel-mobile.png` — same scene compact-rendered at
  375×812

## Remaining blockers

**None.** The site walks clean on desktop and 375px mobile across all
8 pages. Every section is in the archetype system. Only one corner
Harry remains. Footer reads as a closing scene, not an afterthought.
The dirty-Harry complaint is resolved.

## Production recommendation

**Option 1 — ready to merge to production.**

The viewport composition system (P11) + Final Reel footer (P12) close
the structural gaps. Through-Years stays on the simplified coming-soon
poster as accepted launch posture. Memorial reads as a reverence
Scene. Spotify ID still placeholder per Fritz's earlier decision.
Hero CTAs are live. Forms are 16px (no iOS auto-zoom). Footer is a
closing scene with up/down chevron continuity into and out of it.

Suggested merge sequence:
1. Walk staging on phone one more time (Final Reel mobile + corner
   Harry sanity-check + Where-Next → footer chevron flow)
2. Open PR `staging → main` and merge
3. Cut a fresh `netlify deploy --prod` against the production site
4. Smoke prod: Home → RSVP submit → Tickets sponsor inquiry →
   Through-Years memory submit → Capsule sealed-letter submit → Final
   Reel footer

## Stop condition met

- ✅ All 5 scope items implemented (FX, usher removal, Final Reel,
  footer chevrons, hero harry cleanup)
- ✅ Desktop + mobile verified across all 8 pages
- ✅ Pushed to staging at `aa8e69b`
- ✅ Netlify production deploy of staging URL completed
- ✅ Production unchanged — Fritz approval gate still required
- ⏸ PAUSED for Fritz review on staging
