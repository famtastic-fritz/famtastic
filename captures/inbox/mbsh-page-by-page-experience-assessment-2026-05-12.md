# MBSH Page-by-Page Experience Assessment

Date: 2026-05-12
Scope: `/Users/famtasticfritz/famtastic-sites/mbsh-reunion/frontend`
Live product: https://mbsh96reunion.com/
Status: assessment for next implementation pass; no site code edits made in this pass.

## Purpose

This assessment translates Fritz's latest direction into an executable page-by-page view of the MBSH reunion experience. The site should not feel like a normal website with separate pages. It should feel like a controlled, short-life web experience: a movie-premiere journey with deliberate scene movement, mobile-friendly controls, strong first impact, practical info panels, and forms that feel designed instead of boring.

The deployment-critical structure is:

1. Impactful Header / Title Hero
2. Scene Marker
3. Note from Usher / Info Panel
4. Pre Section
5. Main Section
6. Post Section
7. Where Next
8. Final Reel Footer

The current implementation has strong raw material: `page-sequence.js`, `premiere.js`, Where Next injection, billboard slides, section mode tagging, chevrons, Harry-in-scene, form handlers, and Wave 1 stills. The gap is unification. The interior pages still read as regular pages with cinematic decoration instead of fully controlled scenes.

## Current architecture observed

Files inspected:

- `frontend/index.html`
- `frontend/rsvp.html`
- `frontend/tickets.html`
- `frontend/through-years.html`
- `frontend/memorial.html`
- `frontend/capsule.html`
- `frontend/playlist.html`
- `frontend/js/page-sequence.js`
- `frontend/js/premiere.js`
- `frontend/css/sections.css`
- `frontend/css/premiere.css`
- `frontend/assets/premiere/wave1/wave1-scenes-contact-sheet.jpg`

Important existing behavior:

- `page-sequence.js` defines the reel order: Home → RSVP → Tickets → Through the Years → In Memory → Time Capsule → Playlist → Home.
- `page-sequence.js` exposes `window.PAGE_SEQUENCE` and `window.PageSequence.formatSceneMarker()`.
- Home already has `body[data-snap="on"]` and multiple `.premiere-snap-target` sections.
- Through the Years also has `data-snap="on"`; other interior pages do not.
- `premiere.js` injects Where Next before the footer on all pages.
- `premiere.js` injects billboard notes on interior pages after the first section.
- `premiere.js` currently creates interior note slates with generic text like `Scene 02 · Int. rsvp — Night` instead of using `page-sequence.js` scene metadata.
- `premiere.js` tags sections as `scene`, `sequence`, or `tease` using overrides and heuristics.
- Chevrons are injected across collected page sections, but only snap behavior is active when `body[data-snap="on"]` is present.
- Wave 1 stills exist but are not wired into page heroes.

## Cross-site structural gaps

### 1. Impactful headers are the top missing deployment item

All interior pages still begin with `.page-header`. These headers are functional but not cinematic. They do not yet carry the `boom, in your face` impact Fritz wants.

Recommended shared component: `experience-hero`.

Minimum schema:

```html
<header class="experience-hero experience-hero--rsvp premiere-snap-target" data-page-slot="title" data-mode="scene" data-height="large">
  <div class="experience-hero__media" aria-hidden="true"></div>
  <div class="experience-hero__shade" aria-hidden="true"></div>
  <div class="experience-hero__content">
    <a class="experience-hero__back" href="index.html">...</a>
    <span class="scene-marker" data-scene-marker></span>
    <p class="experience-hero__eyebrow">Reel II</p>
    <h1 class="experience-hero__title">Reserve Your Seat</h1>
    <p class="experience-hero__sub">The night unlocks once we hear from you.</p>
  </div>
</header>
```

Do not do a full redesign page-by-page. Build the shared component and map per-page media/copy through classes or data attributes.

### 2. Scene marker foundation exists but is not visible where needed

`page-sequence.js` can bind `[data-scene-marker]`, but interior pages do not have marker elements in their headers. The injected note does include a slate, but it is generic and not canonical.

Current mismatch in `page-sequence.js`:

- RSVP sceneLocation is `Box Office`, but the recovered intent says RSVP should feel like `Auditorium / Lock Your Seat`.
- Tickets sceneLocation is `Concession Stand`, but the recovered intent says Tickets should be `Box Office`.
- Through Years sceneLocation is `The Marquee`, but the recovered intent and generated still point to `Projection Booth`.
- Capsule sceneLocation is `Projection Booth`, but the recovered intent and generated still point to a sealed-envelope / time-capsule writing desk.

Recommendation:

- Lock the canonical scene locations before wiring heroes.
- Add a visible marker to every interior `experience-hero`.
- Home can keep the marker inside the Note/billboard or hide it; it does not need an obvious scene label on first load.
- Update `mountAllBillboards()` to call `window.PageSequence.formatSceneMarker(entry)` for note slate text instead of hardcoding `Scene 02 · Int. ${page} — Night`.

### 3. Note from Usher exists, but needs promotion into a true info panel

The billboard system in `premiere.js` is valuable. It already carries page-specific Harry copy and slide behavior. But it is not yet serving the full role Fritz described: themed info panel, practical instructions, controls explanation, mobile guidance, and page-specific help.

Current issue:

- On most pages the note appears after the first content section, not after a real title hero.
- The note is a nice cinematic message, but it does not always explain what the user can do, how to move, how Harry/chat works, or why a page behaves the way it does.

Recommendation:

- Keep the billboard engine, but rename the implementation concept mentally to `Usher Info Panel`.
- Place it consistently after the Title Hero.
- Make slide 1 practical: what this page is for and what action matters.
- Make slide 2 movement/help: chevrons, Compass, Harry/chat, forms.
- Make slide 3 emotional/theme: why this reel matters.

### 4. Pre/Main/Post slots are not declared consistently

Home has `data-page-slot="note|main|post"`. Interiors mostly do not. `premiere.js` guesses using section classes and aria labels.

Recommendation:

Add explicit attributes to sections:

- `data-page-slot="title|note|pre|main|post|where-next|footer"`
- `data-mode="scene|sequence|tease|form|nav"`
- `data-height="full|large|half|third|content"`

This is the control layer that lets the site decide when a section should fill the viewport and when it should be content-led.

### 5. Forms and function blocks need wow factor

The form readability pass worked, but the visual language is still conservative. Forms currently read as white cards. They need premiere-specific framing, animation, and success states.

Recommended shared treatment: `cinematic-form`.

Ingredients:

- velvet/dark outer frame or brass ticket-window frame
- warm-gold focus glow
- tiny bulb or film-perf edge detail
- button micro-animation
- submit success ritual matched to the page, e.g. ticket stamp, wax seal, song cue, candle glow
- preserve readability and accessibility; do not sacrifice field clarity

### 6. Mobile is the primary experience surface

Interior pages need to answer four phone-user questions at all times:

- Where am I?
- What do I do here?
- How do I move to the next scene?
- How do I get help or jump elsewhere?

That means the Title Hero, Scene Marker, Usher Note, chevrons, Compass, and Harry/chat must be coherent on phone width before desktop polish.

## Wave 1 asset assessment

Contact sheet reviewed visually.

- `rsvp-velvet-seat.png`: Strong fit. Excellent RSVP/title hero candidate. Empty red theater seat communicates `Reserve Your Seat` immediately. Dark right/left negative space can hold copy.
- `through-years-projection-booth.png`: Strong fit for Through the Years. The projector beam and booth imply memory/reel/time. Good candidate for title hero or pre scene.
- `memorial-candle-still.png`: Strong fit and emotionally right. Needs careful treatment: do not over-animate or overcrowd. Best for Memorial title hero or pre scene.
- `capsule-envelope-wax-seal.png`: Strong fit. Reads like time capsule, letter, promise. Best for Capsule title hero or pre scene.
- `playlist-curtain-confetti-still.png`: Good but a little empty/dark. The red curtain and confetti work, but it may need typography/layering or a vinyl/sound motif to read instantly as Playlist.

No generated still exists for Tickets. Tickets should probably use a CSS/ticket-window hero or a later still if needed. Do not block committee-readiness on a new paid Tickets asset.

## Page-by-page assessment

### Home

Current structure:

- Hero: strong and already `premiere-snap-target`.
- Note: present as billboard with `data-page-slot="note"`.
- Main: program bulletin with `data-page-slot="main"`.
- Post: director strip with `data-page-slot="post"`.
- Where Next: injected by `premiere.js`.
- Footer: upgraded by `premiere.js`.

Assessment:

Home is the pattern page and should not be the first area of heavy change. It already feels closest to the controlled experience. The main issue is that its inner page program numbering and `Nine reels` billboard copy may not match the actual seven-page structure. Also, Home is the only page where the current structure feels deliberate from the first frame.

Needed before deployment:

- Keep Home mostly stable.
- Fix any copy mismatch: `Nine reels` should not say nine if the site currently has seven pages/reels.
- Treat Home as the benchmark for interior page impact.

Priority: Medium. Do after interior pattern is working.

### RSVP

Current structure:

- Title/Header: `.page-header` with `Save the Date`.
- Pre: `.countdown` naturally acts as pre, but is not marked as such.
- Note: injected after countdown by `premiere.js`.
- Main: `#rsvp .rsvp-form-wrap`.
- Post: `What to expect that night` and `Why this night, why now`.
- Where Next: injected.

Assessment:

RSVP is the best first implementation page because it has the core visitor action and the strongest Wave 1 asset. The generated empty velvet seat is exactly the right `Reserve Your Seat` hero. The countdown can be a short pre scene, but the committee date inconsistency means it should be handled carefully.

Page-specific issues:

- Header is not cinematic enough.
- Scene label should not say Box Office if RSVP is about reserving a seat; stronger label is `Auditorium` or `Reservation Desk`.
- Countdown currently depends on unresolved date state.
- RSVP form is readable but too plain.
- The Usher Note should explain: reserve seat, update later, Harry can help, Compass/chevrons.

Recommended slots:

- Title: `experience-hero--rsvp`, media `wave1/scenes/rsvp-velvet-seat.png`, height large/full.
- Note: Usher Info Panel, height large on mobile.
- Pre: Countdown, height third/half; if date remains unclear, make it a `date coming soon` marquee rather than broken countdown.
- Main: RSVP form, content-led; cinematic form frame.
- Post: What to expect, half/large; Why now, tease.
- Where Next: Tickets.

Priority: Highest. Use RSVP as the canonical pattern page.

### Tickets

Current structure:

- Title/Header: `.page-header` with `The Night`.
- Main: `.tickets` section.
- Post/secondary: sponsorship section and `Why your patronage matters`.
- Note: injected after first section by `premiere.js`, not immediately after title.
- Where Next: injected.

Assessment:

Tickets has solid content and clear purpose, but it lacks a visual hero asset and can feel transactional. The page should become `Box Office` in the movie venue map. It should feel like entering the ticket window / patron wall, not just viewing price cards.

Page-specific issues:

- Header is too plain.
- Scene location likely needs to become `Box Office`.
- Sponsorship cards need more event prestige and less generic card feel.
- Sponsor inquiry modal/form needs wow factor and success state.
- No Wave 1 still exists for Tickets; use CSS/layered ticket-window treatment first.

Recommended slots:

- Title: `experience-hero--tickets`, CSS-built box-office/ticket-window scene or future generated still, height large.
- Note: Usher Info Panel explaining two paths: secure seat or sponsor the night.
- Main: Ticket tiers, content-led sequence.
- Post: Sponsor patron tiers as sequence or large section; Why patronage matters as tease.
- Where Next: Through the Years.

Priority: High, after RSVP pattern.

### Through the Years

Current structure:

- Title/Header: `.page-header`.
- Main/Pre: timeline coming-soon poster.
- Main: memory submission form.
- Note: injected after timeline.
- `body[data-snap="on"]` is already active.
- Where Next: injected.

Assessment:

Through the Years is structurally important but content-gated by archival materials. The current simplified page is honest and useful. The generated projection booth still gives it enough atmosphere to feel intentional even without a finished archive gallery.

Page-specific issues:

- Header is too plain.
- Scene location should likely be `Projection Booth` or `Archive Reel`, not `The Marquee`.
- The timeline is a coming-soon poster; that is acceptable if dressed cinematically.
- Memory form needs wow factor.
- `data-snap="on"` exists here, but it may be inconsistent with other interior pages.

Recommended slots:

- Title: `experience-hero--through-years`, media `wave1/scenes/through-years-projection-booth.png`, height large.
- Note: Usher Info Panel explaining the archive is in production and asking classmates to submit memories/photos.
- Pre/Main: timeline poster as scene/large.
- Main: memory submit form as content-led sequence.
- Post: optional `1996 pause` or `committee archive note` tease.
- Where Next: In Memory.

Priority: Medium-high. Do after RSVP/Tickets because it has a content limitation but can still look premium.

### In Memory

Current structure:

- Title/Header: `.page-header.page-header--reverent`.
- Main: `.memorial` list/empty message.
- Secondary: `Add a name` email-link section.
- Post: `At the reunion`.
- Note: injected after memorial list.
- Where Next: injected.

Assessment:

This is the most emotionally important page and cannot stay thin. Even if the committee has not provided names yet, the page needs a more reverent cinematic treatment. The generated candle still is excellent and should be used. However, avoid turning this into a flashy animation page; it should be calm, warm, and respectful.

Page-specific issues:

- Header is too plain for the emotional weight.
- Memorial list is empty and visually sparse.
- Add-a-name is currently a mailto link, not a form.
- The note should explain the care/moderation process.
- The page needs quiet visual depth: candle, reserved seats, fade-up names.

Recommended slots:

- Title: `experience-hero--memorial`, media `wave1/scenes/memorial-candle-still.png`, height large/full but quiet.
- Note: Usher Info Panel explaining the tribute, name submission, verification, and tone.
- Main: memorial names / empty state; scene or content-led depending on name count.
- Main/Post: Add-a-name form or clearly styled submission panel. If backend is not ready, create a staged form UI but keep backend decision explicit.
- Post: At the reunion as quiet tease.
- Where Next: Time Capsule.

Priority: Highest alongside RSVP. Committee will notice this page.

### Time Capsule

Current structure:

- Title/Header: `.page-header`.
- Main: `.capsule` form inside envelope card.
- Post: `What to write your younger self` and `We deliver on the day`.
- Note: injected after capsule form.
- Where Next: injected.

Assessment:

Capsule already has a strong concept and the generated envelope/wax seal still matches perfectly. The existing envelope form is one of the better functional metaphors on the site, but it still reads as a form card more than a cinematic scene.

Page-specific issues:

- Header is too plain.
- Scene location should not be Projection Booth; it should be `Writing Desk`, `Time Capsule Desk`, or `The Sealed Letter`.
- Main form could get stronger wax-seal animation on submit.
- The current copy says `Sealed July 12, 2026` in billboard while public copy elsewhere has unresolved dates. That needs gating.

Recommended slots:

- Title: `experience-hero--capsule`, media `wave1/scenes/capsule-envelope-wax-seal.png`, height large.
- Note: Usher Info Panel explaining privacy, what to write, when it returns.
- Main: capsule form, content-led with envelope/wax animation.
- Post: prompt cards and delivery promise.
- Where Next: Playlist.

Priority: Medium-high.

### Playlist

Current structure:

- Title/Header: `.page-header`.
- Main: Spotify embed placeholder plus track list, `data-mode="sequence"`.
- Main: suggest track form, `data-mode="sequence"`.
- Post: About the soundtrack.
- Note: injected after playlist sequence.
- Where Next: injected.

Assessment:

Playlist has the best cultural texture right now because the track list feels specific to 1996 and South Florida. The Spotify embed is still placeholder-gated. The generated curtain/confetti still fits the theatrical mood but does not instantly say soundtrack unless layered with vinyl/equalizer/tracklist elements.

Page-specific issues:

- Header is too plain.
- Playlist hero needs music-specific layering, not just curtain image.
- Spotify placeholder needs committee/platform decision: real playlist ID or keep tracklist as primary.
- Suggest form needs wow factor.
- Note should tell users they can suggest tracks and that committee curates weekly.

Recommended slots:

- Title: `experience-hero--playlist`, media `wave1/scenes/playlist-curtain-confetti-still.png` plus CSS vinyl/equalizer/spotlight layer, height large.
- Note: Usher Info Panel explaining press play / placeholder / suggest a track.
- Main: playlist embed + tracklist, sequence/content-led.
- Main/Post: suggest track form, cinematic form.
- Post: About soundtrack / South Florida sonic identity.
- Where Next: Home/final reel.

Priority: Medium.

## Recommended implementation order

### Pass A — Canonical scene map and shared structure foundation

1. Update `frontend/js/page-sequence.js` scene locations to the final venue map.
2. Add/standardize `experience-hero` CSS and section height attributes.
3. Update `premiere.js` billboard slate text to use `window.PageSequence.formatSceneMarker()`.
4. Add `data-page-slot`, `data-mode`, and `data-height` rules to the new component and to existing sections as pages are migrated.

### Pass B — RSVP pattern page

1. Convert RSVP header into `experience-hero--rsvp` using `rsvp-velvet-seat.png`.
2. Place Scene Marker inside the hero.
3. Move/confirm Usher Info Panel immediately after hero.
4. Mark countdown as `pre` and RSVP form as `main`.
5. Upgrade RSVP form frame and submit state.
6. Verify desktop and mobile.

### Pass C — Memorial emotional page

1. Convert Memorial header into `experience-hero--memorial` using `memorial-candle-still.png`.
2. Add scene marker and quiet Usher Info Panel.
3. Improve empty state so it feels curated, not missing.
4. Convert Add-a-name mailto into either a real form or a staged form panel with explicit backend gate.
5. Verify tone is reverent, not loud.

### Pass D — Apply pattern to remaining pages

1. Tickets: box office/ticket window hero and sponsor form/card wow.
2. Through Years: projection booth hero and archive-in-production treatment.
3. Capsule: sealed-envelope hero and wax-seal submit ritual.
4. Playlist: curtain/confetti hero with music layer and suggest-track wow.

### Pass E — Staging gate

1. Run static/local verification.
2. Check mobile width manually.
3. Deploy staging only.
4. Prepare committee review doc/presentation.

## Deployment readiness scoring

- Home: 8/10. Strong, mostly stable. Needs small copy consistency fixes.
- RSVP: 6/10. Functional, but not yet cinematic. Best pattern page.
- Tickets: 6/10. Functional, needs box-office scene and sponsor wow.
- Through Years: 6/10. Honest placeholder, needs projection-booth hero and form polish.
- In Memory: 4/10. Emotionally important and currently too thin. Needs urgent treatment.
- Time Capsule: 7/10. Strong concept, needs hero + submit ritual.
- Playlist: 7/10. Strong cultural content, needs hero + real playlist decision or better placeholder framing.

Overall: The site has the right bones and safe deployment plumbing. It is not yet at the intended movie-experience quality because interior pages still lack impact heroes, visible canonical scene markers, a practical Usher info-panel rhythm, explicit section-height grammar, and wow-factor forms.

## Parallel validation addendum

This assessment was re-checked with three parallel read-only subagent passes:

1. Home / RSVP / Tickets page assessment.
2. Through the Years / In Memory / Time Capsule / Playlist page assessment.
3. Shared architecture assessment covering `page-sequence.js`, `premiere.js`, CSS movement rules, Where Next, notes, chevrons, forms, and Wave 1 assets.

All three passes agreed with the main conclusion: the site has strong bones, but the interior pages are not yet unified into the controlled movie/reunion experience. The biggest blockers remain impact heroes, visible canonical scene markers, practical Usher info panels, explicit slot/height grammar, and form/function wow.

Additional findings from the parallel validation:

- Home is still the benchmark page. It is the only page that consistently feels like a controlled experience from first load.
- Home has a likely copy/count mismatch: `Nine reels. One night.` does not match the current seven-page sequence.
- Static/fallback reel numbering on Home may drift from the JS sequence because `page-sequence.js` makes Home Scene I and RSVP Scene II.
- Inner-page billboards still hardcode scene slate text like `Scene 02 · Int. rsvp — Night`; they should use `PageSequence.formatSceneMarker()` so scene numbers and locations stay canonical.
- Only Home and Through the Years currently use `body[data-snap="on"]`. That may be intentional, but the snap policy needs an explicit decision before staging.
- Through the Years Note copy is stale because it references filmstrip/cards while the current page is a coming-soon archive poster plus memory form.
- Playlist Note copy is stale if it says Spotify is playable while the embed remains placeholder-gated.
- Capsule copy has possible date risk where `Sealed July 12, 2026` appears before the date state is fully resolved.
- Tickets has no Wave 1 still, but this should not block staging; use a CSS-built box-office/ticket-window hero first.
- Wave 1 assets are present and fit the target pages, but they are not wired into current HTML/CSS/JS.
- Forms are readable and protected by sequence-style movement, but still need theatrical framing, focus states, and success rituals.
- The current init order in `premiere.js` is important and should be preserved: inject/mount sections first, classify modes second, attach navigation last.
- `page-sequence.js` comments imply eager head loading, but current pages load it with `defer` near the bottom before `premiere.js`. This works now, but the contract should be cleaned up later to avoid future drift.
- Repo status during validation still showed only the existing untracked `frontend/assets/premiere/wave1/` folder as the notable generated asset change. No validation pass edited files.

## Immediate next action

Implement Pass A and Pass B together in a small, reversible branch/worktree:

- Define the shared `experience-hero` pattern.
- Fix canonical scene marker generation.
- Convert RSVP as the first proof page.
- Move/promote the RSVP Note from Usher into the intended info-panel position after the title hero.
- Add explicit `data-page-slot`, `data-mode`, and `data-height` attributes on RSVP as the proof of the control grammar.
- Upgrade the RSVP form frame and success moment without hurting mobile usability.
- Do not deploy production.
- Do not chase OpenAI/Gemini credential blockers.
- Use the existing Wave 1 RSVP still.

If RSVP feels right on mobile and desktop, apply the same component to Memorial next because it is the highest emotional-risk page.
