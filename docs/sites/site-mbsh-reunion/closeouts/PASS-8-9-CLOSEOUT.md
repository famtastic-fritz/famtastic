# Pass 8 + 9 — Canonical page pattern + Reel-card system + Harry-in-scene

**Date:** 2026-05-07
**Branch:** `staging` (committed `350e7d7`)
**Pre-commit head:** `4b8fd70`

## Why combined

P8 and P9 ran together because P9's reel-card vocabulary depends on P8's
canonical page pattern (Title → Note → Pre → Main → Post → Where-Next).
Cutting them apart would have produced two visually inconsistent waves.

## P8 — Canonical page pattern

Established the section grammar every page must follow:

1. **Title** — hero / scene slate
2. **Note** — usher's instructions, Hi-Tide Harry briefs the guest
3. **Pre-item** — the lead-in to the page's reason for being
4. **Main item** — the page's actual content
5. **Post-item** — director's strip / motto / context
6. **Where-Next** — programmatic link to the next reel

Home page rebuilt around this:
- `.page-note` → "A note from your usher" (Cinzel slate top, Italiana
  italic welcome from Harry, three numbered beats: chevron, compass,
  tap-to-talk; signed "— Harry").
- `.page-pre` → "Nine reels. One night."
- `.page-main` → reel-card bulletin (rendered via P9 component).
- `.page-post` → Director's Strip (motto + dates + presented-by).
- `.page-next` (legacy hardcoded) auto-replaced with `.where-next`.

Story Then/Now/Forever and the old preview-card grid are removed from
home — they migrate to a re-imagined Through-the-Years page in a future
pass.

## P9 — Reel-card system + Harry-in-scene

### Unified `.reel-card`

One component, two contexts (home Program bulletin + per-page Where-Next
strip). Vocabulary:
- `.reel-card__eyebrow` (Cinzel `Reel N`)
- `.reel-card__title` (Playfair / DM Serif Display)
- `.reel-card__usher` (Cormorant italic, one-line)
- `.reel-card__footer` (`X min` + `SELECT` / `NOW PLAYING`)
- `.reel-card--now-playing` modifier — scarlet glow + cream foil border
  for the current page's card.

### `.reel-rail`

Horizontal scroll-snap container; mobile gets `78%` peek + snap-x;
desktop gets 4-up rail with `Scroll ↔` affordance.

### Where-Next injector (`injectWhereNext()`)

Reads `data-page` and the `PROGRAM` array (single source of truth in
`premiere.js`). Picks `current page → NOW PLAYING`, then next 3 in
program order. Lives in `init()` after `wireHarryVocabulary()`.

### `injectHarryInScene()` — Harry as content character

Per-page pose map:

| Page          | Pose                  | Anchor       |
|---------------|-----------------------|--------------|
| home note     | 18-presenting         | inline       |
| home bulletin | 20-pointing-across    | bottom-left  |
| home director | 23-salute             | bottom-right |
| rsvp          | 12-clipboard          | bottom-right |
| tickets       | 13-ticket-stub        | bottom-right |
| through-years | 22-walk-frame         | bottom-left  |
| memorial      | 17-respectful         | bottom-right |
| capsule       | 14-wax-stamping       | bottom-right |
| playlist      | 16-conducting         | bottom-left  |

The corner-floating `.premiere-usher` remains, **only as the chat
trigger**. The new `.harry-in-scene` is a separate visual element
positioned inside content sections so Harry is *in the scene*, not
decoration.

## Files changed

- `frontend/index.html` — home page restructured to P8 pattern
- `frontend/css/premiere.css` — `.reel-card`, `.reel-rail`, `.where-next`,
  `.harry-in-scene`, `.page-note`, `.page-pre`, `.page-post`, `.page-next`
  blocks (~+540 lines)
- `frontend/js/premiere.js` — `PROGRAM` array, `renderReelCard`,
  `buildReelRail`, `fillHomeBulletin`, `injectWhereNext`,
  `injectHarryInScene` (~+170 lines)

No HTML edits to inner pages — Where-Next + Harry-in-scene mount via JS
on every page that already loads `premiere.js` + `premiere.css` (rsvp,
tickets, through-years, memorial, capsule, playlist).

## Verification

Headless preview probe per page (DOM check):

| Page          | Where-Next cards | NOW PLAYING title       | Harry pose          |
|---------------|------------------|-------------------------|---------------------|
| home          | 4 (next 4)       | — (home is implicit)    | 20-pointing-across + 23-salute |
| rsvp          | 4                | Reserve Your Seat       | 12-clipboard        |
| tickets       | 4                | Tickets & Sponsorship   | 13-ticket-stub      |
| through-years | 4                | Through the Years       | 22-walk-frame       |
| memorial      | 4                | In Memory               | 17-respectful       |
| capsule       | 4                | Time Capsule            | 14-wax-stamping     |
| playlist      | 4                | The Soundtrack          | 16-conducting       |

Console: only pre-existing `/config/site-config.json` 404s (unrelated).

Proofs in repo root `proofs/`:
- `pass8-2-note-fix.png` — usher note slide on mobile (375 viewport)
- `pass9-1-home-bulletin-fixed.png` — home bulletin reel-cards (desktop)
- `pass9-2-rsvp-wherenext.png` — RSVP Where-Next with NOW PLAYING glow

## Known follow-ups (not in this pass)

1. **iOS chevron click** — works on localhost but not Fritz's S22.
   Suspected scroll-snap-mandatory + smooth-scroll race. Diagnose next.
2. **Harry-intro speech bubble overlap** — one-time per session bubble
   can sit over the bulletin row briefly until dismissed. Acceptable
   for now (auto-dismisses at 12s or first tap).
3. **Through-Years rebuild** — needs to absorb Then/Now/Forever and
   become the real centennial reel. Out of scope for P9.
4. **Reel-card "Now Showing" affordance on home** — home doesn't
   currently render a NOW PLAYING card because the home page itself is
   not part of the bulletin. Decision deferred — Fritz to confirm.

## Stop condition met

- ✅ Full Pass 9 complete (no a/b split)
- ✅ Pushed to staging at `350e7d7`
- ✅ Production unchanged — Fritz approval gate still required
- ⏸ PAUSED for Fritz review on staging
