# Pass 10 — Billboard slideshow + chevrons everywhere + unified pull-in

**Date:** 2026-05-07
**Branch:** `staging` — committed `d517a30`
**Pre-commit head:** `350e7d7`

## Why this pass

Fritz watched P9 and called out three drifts:

1. The "Tonight's Program — Nine reels. One night." section was its own
   page slot. He wanted it folded into Harry's note **as a slideshow**
   that can keep growing — "like the info billboard."
2. Chevrons only existed on the hero. He wanted them on every section
   plus a way to scroll back up.
3. The chevron-click pull-in was satisfying. Passive scroll arrival was
   not. He wanted **the same animation** whether the user clicked or
   just scrolled past 55% of the section.

## What shipped

### 1. `.billboard` slideshow (replaces `.page-note` + `.page-pre`)

`mountBillboard(host, slides)` builds a stage of absolutely-positioned
`.billboard__slide` elements and toggles `.is-current` between them on
a 7s timer. Each slide fades + lifts in (`translateY(18px) → 0`) and
the leaving slide drops out (`-14px`). Auto-advance pauses on hover and
restarts on manual dot click.

The new `BILLBOARD` data map in `premiere.js` is the single source for
slide content. Adding a slide is one entry — no markup churn. Slides
support two `kind`s today: `welcome` (eyebrow + Harry pose + italic
line + numbered beats + signature) and `headline` (eyebrow + headline +
sub copy).

Home gets 3 slides. Every inner page gets 2 slides keyed off the
page name (rsvp, tickets, through-years, memorial, capsule, playlist).

### 2. Chevrons on every section + back-to-top

`injectSectionChevrons()` collects every `section.premiere-snap-target`
and every `section[aria-label]` directly under `<body>` or `<main>`,
deduplicates, sorts in DOM order, and injects:

- `.section-chevron--down` on all but the last (animated bob, 2.4s)
- `.section-chevron--up` on all but the first

Both clicks call `scrollToSection(target)` — temporarily strip the
`data-snap` attribute, smooth-scroll to the section's bounding-rect
top, restore snap after 900ms, and toggle `.is-arriving` on the target.

### 3. Unified section pull-in animation

`wireSectionArrival()` opens an IntersectionObserver with thresholds
`[0.55, 0.7]`. When a section crosses 55% visibility for the first
time, it gets `.is-arriving` for 700ms (which fires the same
`section-pull-in` keyframe as chevron-click), then `.is-arrived` to
prevent re-firing.

Result: identical 800ms fade-up + soft overshoot whether the user
clicked a chevron or just scrolled.

### 4. Cleanup

- Hardcoded `.page-pre` section removed from `index.html` (its
  "Nine reels. One night." copy now lives in slide 2 of the home
  billboard).
- Hardcoded `.page-next` section removed from `index.html` — the JS
  injector owns Where-Next on every page now.
- Up-chevron pushed below the scene-slate text on note/billboard
  sections so they don't visually collide.

## Files changed

- `frontend/index.html` — billboard host + removed `.page-pre`/`.page-next`
- `frontend/css/premiere.css` — billboard, dots, chevrons, pull-in keyframe (~+230 lines)
- `frontend/js/premiere.js` — `BILLBOARD`, `mountBillboard`,
  `mountAllBillboards`, `injectSectionChevrons`, `scrollToSection`,
  `wireSectionArrival` (~+260 lines)

## Verification

DOM probe per page (after a fresh load with sessionStorage cleared):

| Page          | Billboard slides | Chev down | Chev up | Where-Next |
|---------------|------------------|-----------|---------|------------|
| home          | 3                | 3         | 4       | ✓          |
| rsvp          | 2                | 4         | 4       | ✓          |
| tickets       | 2                | 5         | 5       | ✓          |
| through-years | 2                | (auto)    | (auto)  | ✓          |
| memorial      | 2                | 4         | 4       | ✓          |
| capsule       | 2                | 4         | 4       | ✓          |
| playlist      | 2                | 3         | 3       | ✓          |

No console errors related to premiere.js.

Proof in repo root `proofs/`:
- `pass10-1-billboard-slide1-mobile.png` — home billboard slide 2
  ("Nine reels. One night.") on the 375px viewport with Harry
  pointing across, slate, dots.

## Known follow-ups

1. **iOS chevron click** — original P9 issue still parked. The new
   chevron implementation reuses the same `scrollToSection` pattern
   that already worked on localhost desktop; needs S22 verification.
2. **Through-Years rebuild** — billboard added but the timeline
   itself still needs the centennial reel rework promised in P8/P9.
3. **Reel-card "Now Showing" home slot** — home doesn't currently
   render itself in the bulletin/Where-Next. Open question for Fritz.
4. **Slide content additions** — the `BILLBOARD` map is set up to
   keep growing. Future "announcements" can be added per-page without
   markup edits.

## Stop condition met

- ✅ Pass 10 implemented + verified across all 7 pages
- ✅ Pushed to staging at `d517a30`
- ✅ Production unchanged — Fritz approval gate still required
- ⏸ PAUSED for Fritz review on staging
