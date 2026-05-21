# MBSH Page Structure Unified Assessment

Date: 2026-05-12
Status: assessment and implementation framing
Scope: MBSH Class of 1996 reunion web experience

## Operating note

Agent check-in is paused for this pass. AGENTS.md, CLAUDE.md, and AGENT-COORDINATION.md were updated so `node scripts/agent-checkin.js` is no longer a mandatory pre-flight step while Fritz considers it disruptive.

## Product intent

The MBSH reunion site should not behave like a normal long-life website. It is a short-life reunion experience that should feel like a controlled movie-premiere journey. The user should feel guided through scenes, not dumped into pages. Movement, animation, page order, section height, Harry/assistant explanations, and form interactions need to be intentionally controlled.

The experience has to work especially well on phones. Mobile users need clear guidance about where they are, what to do, how to move, how to access navigation, and how to use Harry/chat assistance without feeling lost.

## Canonical page journey

Home → RSVP → Tickets → Through the Years → In Memory → Time Capsule → Playlist → Home/final reel

Each interior page should feel like a scene in the same movie-premiere venue, not a separate static webpage.

## Unified page structure

Every interior page should resolve to this structure:

1. Impactful Header / Title Hero
   Purpose: immediate emotional impact, scene arrival, page identity.
   Current state: interior pages mostly use ordinary `.page-header` blocks, so they do not match the home page's impact.
   Needed: replace or upgrade each interior page header into an intentional cinematic hero/title section.

2. Scene Marker
   Purpose: scene label for the movie structure, especially on interior pages.
   Current state: scene-marker support exists through `data-scene-marker` and `page-sequence.js`, but it is not consistently used in the page structure.
   Needed: each interior page should show a compact scene label that fits the section-height rhythm. Home may not need a visible scene marker.

3. Note from Usher / Info Panel
   Purpose: themed instruction panel. This is not just decorative copy; it explains page behavior, controls, what the user should do, Harry/chat assistance, and any unusual interaction.
   Current state: note/billboard patterns exist, but the current content and layout do not fully meet the latest need.
   Needed: redesign as an info panel/slideshow style component with themed language and practical guidance, especially for mobile.

4. Pre Section
   Purpose: optional setup, mood, countdown, spacer, or small theatrical moment before the main content.
   Current state: some pages already have natural pre content, like RSVP countdown, but it is not formally marked as pre.
   Needed: add slot/mode/height metadata so pre sections can be one-third, half, large, or full height depending on content.

5. Main Section
   Purpose: the actual page function/content: RSVP, ticket/sponsor action, timeline, memorial, capsule, playlist.
   Current state: functional content exists, but forms/cards can feel too plain and page-like.
   Needed: add wow factor to forms and functional components using animation, richer color, film/theater styling, micro-interactions, and completion states without harming readability.

6. Post Section
   Purpose: optional reflection, context, emotional closure, supporting promise, or next-action reinforcement after the main content.
   Current state: some post-like sections exist, but they are not structurally declared.
   Needed: mark post sections and use them for controlled pacing rather than filler.

7. Where Next
   Purpose: controlled transition to the next scene.
   Current state: Where Next injection exists and is a strong foundation.
   Needed: keep it as the required scene transition; tune height and copy to make the next page feel like a purposeful movement through the experience.

8. Final Reel Footer
   Purpose: closing credits, fallback navigation, committee/contact credibility, FAMtastic credit.
   Current state: footer upgrader exists.
   Needed: keep it as the final fallback, not the primary experience navigation.

## Section height policy

The system needs section-height grammar so chevrons and snap movement land on intentional frames.

Recommended attributes:

- `data-page-slot="title|scene-marker|note|pre|main|post|where-next|footer"`
- `data-mode="scene|sequence|tease|form|nav"`
- `data-height="full|large|half|third|content"`

Recommended behavior:

- Title/Hero: full or large.
- Scene Marker: compact, third, or integrated inside title/note depending on page.
- Note from Usher: large/full on mobile if it explains controls; half/large on desktop.
- Pre: third/half/large depending on content.
- Main: content-led; never force awkward full-height forms or embeds.
- Post: half/large.
- Where Next: large/full so transition feels theatrical.
- Footer: content-led final reel.

## Current implementation assessment

What already exists:

- `frontend/js/page-sequence.js` defines the page journey and scene metadata.
- `frontend/js/premiere.js` injects Where Next and final reel behavior.
- Home already uses `data-snap="on"`, `.premiere-snap-target`, and explicit `data-page-slot` markers for note/main/post.
- The billboard/note concept already exists.
- Harry/usher and chat hooks exist.
- Form success event hooks exist for Harry celebration.
- Wave 1 still assets exist in `frontend/assets/premiere/wave1/` but are not wired yet.

Main gaps:

- Interior pages are still mostly regular website pages with decorative cinema styling.
- Interior headers are not yet impactful scene heroes.
- Scene markers are not consistently visible/placed on interior pages.
- Note from Usher is not yet the full info-panel/slideshow component Fritz now needs.
- Pre/Main/Post slots are not consistently declared in markup.
- Section heights are not formalized, so movement cannot be intelligently controlled.
- Only some pages use `data-snap="on"`; inner pages do not all behave like controlled scenes.
- Forms and cards need more wow factor while staying usable and committee-safe.

## Deployment-critical outstanding work

These are the items Fritz identified as needed before deployment/committee readiness:

1. Impactful headers per page section
   Upgrade each interior `.page-header` into a cinematic title/hero scene, or introduce a reusable `experience-hero` component and migrate pages one at a time.

2. Scene Marker
   Add visible scene labels for interior pages. Pull labels from the canonical page sequence so they stay consistent. Home can skip or hide the marker.

3. Note from Usher / Info Panel
   Rework current note/billboard into a practical themed info panel/slideshow. It should explain page purpose, movement/navigation, Harry/chat assistance, and page-specific actions.

4. Form and function wow factor
   Improve RSVP, sponsor, capsule, memory, and playlist interactions with film-premiere styling, animation, better colors, and success states. Do not make forms harder to read or use.

5. Controlled movement + section-height grammar
   Add slots/modes/heights and make chevrons/snap respect them. This is what turns the site into a controlled experience instead of a decorated website.

6. Mobile-first experience verification
   Test the movement model on phone width. The user must always understand where they are, what to do, how to move next, and how to access navigation/help.

7. Committee/readiness presentation
   After staging is ready, interview Fritz for open questions and generate a doc/live-doc style presentation covering page details, functionality, open decisions, and what the committee needs to review.

8. Learning capture
   Capture the movie-reunion experience as a reusable FAMtastic recipe/workflow so a future request like “build me a reunion site with a movie experience” reproduces this quality level.

## Recommended next implementation order

1. Lock canonical page sequence and scene labels.
2. Add reusable experience structure CSS/classes and data attributes.
3. Convert one page, preferably RSVP, as the pattern page.
4. Validate RSVP on mobile and desktop.
5. Apply the pattern to Tickets, Through the Years, In Memory, Time Capsule, and Playlist.
6. Add form/card wow-factor upgrades.
7. Wire only approved Wave 1 stills where they support the structure.
8. Run local/static verification.
9. Deploy staging only.
10. Prepare committee presentation and decision list.
11. Capture FAMtastic lessons in SITE-LEARNINGS, CHANGELOG, and a reusable recipe/skill.

## Acceptance criteria

- The site feels like a controlled movie-premiere experience, not a normal website.
- Each interior page has a clear title/hero, scene marker, usher note/info panel, main action, and Where Next transition.
- Mobile users understand the controls and page purpose without explanation from Fritz.
- Forms and key functional sections feel designed, animated, and premium, not boring.
- The experience can be staged safely before production.
- FAMtastic captures the reusable recipe for future reunion/movie-experience builds.
