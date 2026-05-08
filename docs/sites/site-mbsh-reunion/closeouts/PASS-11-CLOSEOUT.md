# Pass 11 — Viewport Composition System + Centered Medallion

**Date:** 2026-05-08
**Branch:** `staging` — committed `0389d3f`, deployed live to `https://mbsh-reunion-staging.netlify.app`
**Pre-commit head:** `3a91c40`

## What landed

### Section archetype system (Scene / Sequence / Tease)

Every top-level section on every page is now classified into one of three
modes via a JS auto-tagger that runs at init:

1. **Hard-coded for JS-injected sections** — hero, billboard, where-next,
   director-strip, and the home Bulletin are always Scenes.
2. **Per-page override map** — `SECTION_MODE_OVERRIDES` in `premiere.js`
   gets the final word for each known content section (RSVP form →
   sequence, tickets sponsorship → sequence, capsule form → sequence,
   memorial empty-state → scene, etc.).
3. **Heuristic fallback** — if neither rule fires, sections containing a
   `<form>` or measuring taller than viewport become Sequences; sections
   shorter than 70% of viewport become Teases; everything else is a Scene.

Three CSS rule sets follow the modes:

| Mode | Min height | Snap | Down chevron | Up chevron | Harry-in-scene allowed |
|---|---|---|---|---|---|
| `scene` | `100dvh` | `start` | yes | yes | yes |
| `sequence` | auto | none | **no** | yes | **no** |
| `tease` | `50dvh` | `start` | yes | yes | yes |

`scroll-snap-type` switched from `mandatory` to `proximity` site-wide so
long-form Sequences don't fight the user's natural scroll. Reduced-motion
disables snap entirely.

### Centered top medallion

The medallion is now `position: fixed` at `left: 50%`, `top:
env(safe-area-inset-top)`, 72px on mobile / 88px on desktop, on every
page. Replaces the home-inline / inner-page-top-right asymmetry that
shipped in P1.

The `.hero__mark` brand-mark img on home is hidden once the medallion
mounts so the page doesn't render two brand-marks.

The MENU label re-anchors below the centered medallion.

### Up-chevron moves to top-left

To clear the centered medallion. One rule, every page: `top:
env(safe-area-inset-top)`, `left: 12px`. The down-chevron stays
center-bottom but is **skipped** entirely on Sequences (it read as
floating noise inside long forms).

### Harry-in-scene routing

`injectHarryInScene()` now refuses any section flagged
`data-mode="sequence"`. If the original target is a Sequence (rsvp,
capsule, playlist), the function walks to the nearest Scene sibling
(prefer next, fall back to prev) and re-anchors there. The result on
every inner page: Harry's pose moves out of the form and into the
adjacent Note Scene, which already shows the same pose in its billboard
slide.

### Playlist structural split

The 3047px playlist section that buried users in a wall of scroll
becomes:

1. **Sequence A** — Spotify embed + curated tracklist
2. **Note Scene** (existing JS-injected billboard, transition beat)
3. **Sequence B** — "Suggest a track" form, scoped, focused
4. (existing About + Where-Next continue downstream)

### Form/input readability sweep

Global `input/textarea/select { font-size: 16px }` under
`[data-premiere="on"]` kills iOS Safari's auto-zoom-on-focus across
every form on the site (RSVP, tickets sponsor inquiry, through-years
memory, capsule, playlist suggest, chatbot, memorial sub-form).

## Files changed

- `frontend/css/premiere.css` — Pass 11 primitives, archetype rules,
  centered medallion, up-chevron repositioning, memorial reverence
  treatment, playlist suggest styling, form-input font-size sweep
- `frontend/js/premiere.js` — `SECTION_MODE_OVERRIDES`,
  `tagSectionModes()`, `collectPageSections()`, updated
  `injectSectionChevrons()` (skip down on sequences, deduped class
  selector bug), updated `injectHarryInScene()` (reroute off
  sequences), wired `tagSectionModes()` into `init()`
- `frontend/playlist.html` — split the original 3047px playlist
  section into two Sequences, swapped the two inner blocks (embed
  first, tracklist second), pulled the Suggest form into its own
  section

## Verification

DOM probes per page (mobile 375×812):

| Page | Sections (mode @ height) | Down-chevrons (only on scene/tease) | Harry parent mode |
|---|---|---|---|
| home | hero(scene 932) · note(scene 812) · main(scene 812) · post(scene 812) · next(scene 812) | 3 | scene + scene |
| rsvp | countdown(scene 795) · note(scene 812) · rsvp(seq 919) · expect(seq 968) · why-now(tease 795) · next(scene 812) | 3 (note + countdown + tease) | scene |
| tickets | tiers(seq 983) · note(scene 812) · sponsorship(seq 1867) · patron(seq 1376) · why-it-matters(tease 795) · next(scene 812) | 2 (note + tease) | scene |
| through-years | poster(scene 812) · note(scene 812) · memory(seq 1030) · next(scene 812) | 2 (poster + note) | scene |
| memorial | empty-state(scene 795) · note(scene 812) · add-name(tease 795) · at-reunion(tease 795) · next(scene 812) | 4 (all but next) | scene |
| capsule | form(seq 843) · note(scene 812) · what-write(seq 1030) · promise(tease 795) · next(scene 812) | 2 | scene |
| playlist | embed+tracklist(seq 2446) · note(scene 812) · suggest(seq 688) · about(seq 1022) · next(scene 812) | 1 (note) | scene |

Memorial captured at `proofs/pass11/memorial-reverence-mobile.png` —
centered medallion, In-Memory cursive, scarlet rule frame, starfield,
italic empty-state copy, Harry 17-respectful peeking from corner.

Form-input font-size at 16px confirmed on capsule (`getComputedStyle`).

## Open follow-ups

- iOS S22 chevron click test (older parked item, untouched this pass)
- Sponsorship 5-tier mobile horizontal carousel (polish)
- Scene-filler atmosphere on tease sections (e.g. small Cinzel slate +
  light-sweep on "Why now", "Why it matters", "The promise") — content
  hooks are present, atmosphere is minimal
- Real archival imagery for Through-Years (post-launch)

## Stop condition

- ✅ Pass 11 implemented across all 8 pages
- ✅ Pushed to staging at `0389d3f`
- ✅ Netlify production-deploy of staging URL completed
- ✅ Production unchanged — Fritz approval gate still required
- ⏸ PAUSED for one final phone walk before production merge
