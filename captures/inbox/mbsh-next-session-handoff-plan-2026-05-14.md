# MBSH Next-Session Handoff Plan — 2026-05-14

## Start Here

Fritz wants the next session to continue MBSH from this exact point. The site is not ready for staging yet because the current local implementation proved the structure, but it did not yet deliver the full cinematic hero / Hi-Tide Harry / note panel / form-wow vision.

If starting a new Hermes session, say:

Read `/Users/famtasticfritz/famtastic/captures/inbox/mbsh-next-session-handoff-plan-2026-05-14.md`, then inspect `/Users/famtasticfritz/famtastic-sites/mbsh-reunion` and continue the MBSH corrective pass. Do not push staging until the hero, scene marker, info panel, and form-wow corrections are complete and locally verified.

## Source Truth

MBSH site repo:
`/Users/famtasticfritz/famtastic-sites/mbsh-reunion`

FAMtastic factory repo:
`/Users/famtasticfritz/famtastic`

Production branch:
`main`

Staging branch:
`staging`

Production Netlify site ID:
`d83da14e-6513-4407-8cdf-8176975690c0`

Staging Netlify site ID:
`3b4f9abd-d0cd-4b78-9ac1-d1b4b51606bf`

Production live site:
`https://mbsh96reunion.com`

Staging site:
`https://mbsh-reunion-staging.netlify.app`

Local dev link from previous run:
`http://127.0.0.1:4173/`

Important: the staging link does not yet include the latest local changes unless they have been committed and pushed after this capture.

## Current Local State From Previous Pass

The previous implementation pass modified:

- `frontend/css/premiere.css`
- `frontend/js/page-sequence.js`
- `frontend/js/premiere.js`

It also added untracked Wave 1 assets:

- `frontend/assets/premiere/wave1/rsvp-velvet-seat.png`
- `frontend/assets/premiere/wave1/through-years-projection-booth.png`
- `frontend/assets/premiere/wave1/memorial-candle-still.png`
- `frontend/assets/premiere/wave1/capsule-envelope-wax-seal.png`
- `frontend/assets/premiere/wave1/playlist-curtain-confetti-still.png`
- `frontend/assets/premiere/wave1/manifest.json`
- `frontend/assets/premiere/wave1/wave1-scenes-contact-sheet.jpg`

No production deploy, no staging push, no DNS/env changes were supposed to have happened.

## What Fritz Approved From The Current Local Version

Fritz said the current local version is good according to plan and mostly beautiful.

The current pass proved:

- the page experience skeleton can work
- mini-marquee scene markers are the right direction
- interior pages can have a cinematic page grammar
- the Note from Usher concept belongs in the experience
- Wave 1 assets are useful as direction and/or interim imagery

But the current pass is not final because it misses several core creative requirements.

## Core Correction

The current implementation is structurally useful, but it does not yet fulfill the real cinematic soul of the site.

The next pass must not treat interior heroes as simple themed headers. Every interior page must open as a real cinematic scene with Ultimate Photoreal Hi-Tide Harry in a relevant action/pose.

## Required Next Work

### 1. Hero Direction Per Page

Every interior page needs a full-width, page-specific cinematic scene.

Each hero must visually communicate the page goal without needing words.

Each hero must include Ultimate Photoreal Hi-Tide Harry doing something that fits that page’s emotional theme.

Approved page tone map:

- Home: cinematic welcome
- RSVP: energetic / urgent / lock your seat
- Tickets: box office / trust / purchase clarity
- Through the Years: nostalgic / memory reel
- In Memory: reverent / gentle / restrained
- Time Capsule: intimate / reflective / future-facing
- Playlist: fun / celebratory / soundtrack energy

Likely hero concepts:

- RSVP: Harry guiding classmates into velvet seats or gesturing toward reserved seats.
- Tickets: Harry at a box office buying/presenting tickets.
- Through the Years: Harry in or near a projection booth / memory reel.
- In Memory: Harry in a candlelit memorial space, quiet and respectful.
- Time Capsule: Harry presenting or sealing an envelope / capsule.
- Playlist: Harry near curtain/soundstage/DJ/soundtrack moment.

Important: these are not final prompts yet; they are the conceptual direction.

### 2. Interior First-Screen Layout Rule

For every interior page, the first viewport should be:

- top 2/3: full-width hero scene
- bottom 1/3: mini-marquee scene marker

This first screen should load as one composed cinematic moment.

The scene marker remains directly under the hero.

Home is different and may keep the full opening treatment without the same explicit interior scene marker rule.

### 3. Note From Usher / Info Panel Redesign

The current Note from Usher is not the final design Fritz wants.

It should be a configurable, slide-based info panel, but it should not blindly occupy a full viewport section.

RSVP-specific correction:

- The Note from Usher and countdown timer should live in one shared section.
- Each should use roughly 1/2 of the section height.
- They should feel designed together.
- The timer style and note style must match the page theme.

Other pages need equivalent companion / space-filler elements paired with the Note panel when the note alone should not occupy a full height.

Possible companion ideas:

- Tickets: box office status, ticket availability, sponsor cue, admit-one visual.
- Through the Years: reel counter, memory cue, year-strip, projector indicator.
- In Memory: candle/light tribute cue.
- Time Capsule: sealed-message cue, deadline cue, wax seal moment.
- Playlist: now-playing cue, soundcheck meter, soundtrack cue.

The next session should interview Fritz before finalizing this panel design.

### 4. Forms Need A Separate Wow Pass

Fritz’s exact feedback: the forms on the site suck.

All forms need a FAMtastic theatrical treatment.

This requires a separate interview before implementation.

Likely needs:

- page-specific form framing
- better focus states
- color, glow, velvet/gold/theater treatments
- animation without hurting usability
- stronger submit/success moments
- better mobile spacing
- less generic web-form energy

Do not assume one form style fits every page.

## Hi-Tide Harry Tier System

This is mandatory and must guide the next hero pass.

Tier 1: Ultimate Photoreal Hero Harry

- Used in major hero scenes.
- Included in every interior hero image/scene.
- Ultra-realistic, page-specific action or pose.
- Must fit the page’s emotional theme.
- This is the missing piece in the current implementation.

Tier 2: Normal Photoreal Chatbot Harry

- Transparent background.
- Used for chat / assistant / avatar UI.
- Should be compatible with layered avatar composition.

Tier 3: Regular Hi-Tide Harry Content Images

- Used in cards, info panels, form success states, support content, etc.

Chatbot frame style is locked:

- marquee bulb ring
- bulb chase doubles as status: idle, listening/thinking, speaking

## Layered Hero Rule

Interior heroes should be layered scenes, not flat headers.

Use the layered div approach from:
`/Users/famtasticfritz/Downloads/layered_hero_composite_test.html`

The pattern includes:

- background / scene layer
- atmosphere layer
- Harry / character layer
- title/copy layer
- optional foreground objects
- light / motion / dust / film grain layer
- responsive crop behavior
- mobile-friendly composition

The goal is to be able to animate scene layers independently.

Animation tiers:

- CSS/code animation for ambient motion.
- Vidu/reference-to-video for Harry character actions when available.
- Veo only for organic physics/code-impossible motion.

If auth fails for paid generation, record it and use the best fallback, but keep moving.

Budget limit Fritz gave for the super-vibe-coder mission: up to $100 max. Current known spend was about $0.02 from Wave 1 image generation.

## Scene Marker Decisions Already Made

Scene Marker visual language:
mini marquee.

Scene Marker content:
scene number + scene title only.

Scene Marker placement:
directly under hero.

Scene Marker job:
orientation + vibe + sequence + transition, but simple.

Do not use full movie-script labels like `INT. AUDITORIUM — NIGHT` as the visible marker unless separately approved.

## Note From Usher Decisions Already Made

Voice:
Harry + theatrical usher + page-specific as needed.

Behavior:
slideshow/card carousel, configurable by page.

Transitions:
same motion language on desktop and mobile; responsive layout only.

Content support:
where you are, what page does, action to take, controls/navigation, Harry/usher tips, committee/event instructions, special feature explanations.

Mobile:
configurable per page; can use mobile-specific helper copy.

Experience principle:
creative first, but Note panel makes the unusual experience understandable and committee-safe.

## Movement Model

Linear first, free navigation always available.

Where Next drives the intended scene-by-scene flow, but menus/footer/direct links still let users jump to RSVP, tickets, playlist, etc.

## What Not To Do Yet

- Do not push staging before the corrective pass.
- Do not deploy production.
- Do not chase unrelated copy/paste artifact issues unless they block review.
- Do not let the Note panel stay as a full-height section everywhere.
- Do not use generic interior headers without photoreal Harry scenes.
- Do not treat forms as finished.
- Do not overbuild the chatbot before the page experience is ready.

## Recommended Next Session Flow

### Step 1: Rehydrate Context

Read this file.
Read any implementation reports already created under:
`/Users/famtasticfritz/famtastic/captures/inbox/`

Important prior capture files include:

- `mbsh-continuation-plan-capture-2026-05-12.md`
- `mbsh-page-by-page-experience-assessment-2026-05-12.md`
- `mbsh-scene-marker-info-panel-interview-capture-2026-05-12.md`
- `mbsh-hero-harry-tier-decisions-2026-05-12.md`
- `mbsh-super-vibe-coder-implementation-report-2026-05-12.md`
- `mbsh-staging-readiness-state-2026-05-12.md`

Also load the reusable skill if available:
`cinematic-layered-character-systems`

### Step 2: Verify Repo State

In `/Users/famtasticfritz/famtastic-sites/mbsh-reunion`, check:

- `git status --short`
- current branch
- whether local server is still running
- whether Wave 1 asset folder exists

### Step 3: Ask Fritz Two Short Interviews If Needed

Interview A: Note/info panel design + companion fillers.
Ask one question at a time.

Interview B: Form wow design.
Ask one question at a time.

Do not ask about scene marker basics again; those decisions are already captured.

### Step 4: Create Hero Asset/Scene Plan

For each interior page, define:

- scene title
- hero concept
- Harry action/pose
- background layers
- foreground layers
- animation tier
- mobile crop behavior
- fallback asset strategy

### Step 5: Implement Corrective Pass

Implement:

- full-width interior hero scenes
- first screen = 2/3 hero + 1/3 scene marker
- scene marker calibration
- redesigned note/info section layout
- page-specific companion fillers
- form wow pass
- responsive/mobile behavior

### Step 6: Verify Locally

Check at least:

- Home
- RSVP
- Tickets
- Memorial
- Time Capsule
- Playlist

Use browser, console, and mobile viewport if possible.

### Step 7: Prepare Staging

Only after local verification:

- commit local changes including Wave 1 assets
- push to staging branch
- verify Netlify staging link
- do not touch production

### Step 8: Capture Lessons Back To FAMtastic

Update:

- `SITE-LEARNINGS.md`
- `CHANGELOG.md`
- any relevant capture docs
- reusable skills/recipes if implementation reveals a better workflow

## Proof That A New Session Is On The Same Page

Before implementing, the new session should be able to say all of the following:

1. MBSH is a controlled movie/reunion web experience, not a normal website.
2. The current local implementation proved the skeleton but is not staging-ready yet.
3. Interior pages need full-width heroes with Ultimate Photoreal Hi-Tide Harry in page-specific action scenes.
4. Interior first screen must be 2/3 hero and 1/3 mini-marquee scene marker.
5. Scene markers are mini marquee, directly under the hero, with scene number + title only.
6. Note from Usher must be redesigned as a configurable slide/card info panel and often paired with a companion filler element, not always full-height.
7. RSVP specifically needs Note + countdown in the same section, roughly half and half.
8. Forms currently need a separate wow pass.
9. Do not push staging until these corrections are done and locally verified.
10. Lessons must return to the FAMtastic factory repo, not stay isolated in the MBSH site repo.
