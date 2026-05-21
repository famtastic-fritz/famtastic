# MBSH Continuation Plan Capture — 2026-05-12

Purpose: preserve the current working context in case the chat is lost again. This is the handoff/continuation anchor for finishing the MBSH Class of 1996 reunion web experience and capturing the reusable FAMtastic Studio lessons.

## Current answer: do we need a new chat?

No. There is enough context to continue in this chat.

If the chat becomes unstable or loses context again, start a fresh chat and point the agent to this file first:

`/Users/famtasticfritz/famtastic/captures/inbox/mbsh-continuation-plan-capture-2026-05-12.md`

Then have it read the related files listed below.

## Core product framing

MBSH is not meant to be a normal long-lived informational website. It is an event-specific reunion web experience. The site should feel controlled, cinematic, and intentional, like walking through scenes in a movie/theater experience rather than browsing a generic site.

The event-site life is limited: most value is before and around the reunion. That means the quality bar is emotional impact, clarity, mobile usability, committee trust, and getting people to RSVP/buy/participate, not building a huge permanent content platform.

The movie/premiere theme is not decoration. It is the structure that lets the experience control movement, explain unusual interactions, organize content into scenes, and give every page a clear emotional job.

## Source truth already recovered

Correct site repo:

`/Users/famtasticfritz/famtastic-sites/mbsh-reunion`

Production branch:

`main`

Staging branch:

`staging`

Production Netlify site ID:

`d83da14e-6513-4407-8cdf-8176975690c0`

Staging Netlify site ID:

`3b4f9abd-d0cd-4b78-9ac1-d1b4b51606bf`

Known repo state from previous pass:

- Working tree was clean before the asset wave.
- `origin/main` was 1 commit ahead of `origin/staging`.
- Latest main commit at that time: `1febb8f — merge: final-stage cleanup — forms, typo, tickets, scenes`.
- Verified existing `page-sequence.js`, `window.PAGE_SEQUENCE`, form readability tokens, and FAMtastic footer credit.

## Generated asset wave already completed

Pass 2 generated Wave 1 stills under:

`/Users/famtasticfritz/famtastic-sites/mbsh-reunion/frontend/assets/premiere/wave1/`

Files reported:

- `rsvp-velvet-seat.png`
- `through-years-projection-booth.png`
- `memorial-candle-still.png`
- `capsule-envelope-wax-seal.png`
- `playlist-curtain-confetti-still.png`
- `manifest.json`
- `wave1-scenes-contact-sheet.jpg`

Estimated spend: about `$0.02`.

Blocked items:

- OpenAI Harry pose/portrait generation: API key rejected before image output.
- Veo loops: Gemini/Google key entries rejected before video output.

Decision: do not chase these credential blockers right now unless the blocked assets become required for the current staging gate. Treat them as optional enhancement blockers, not completion blockers.

## Agent coordination/check-in status

Agent check-in has been a nuisance/false-positive source and should remain paused for this work.

The relevant FAMtastic docs were updated to say not to run `node scripts/agent-checkin.js` as a mandatory pre-flight while paused:

- `/Users/famtasticfritz/famtastic/AGENTS.md`
- `/Users/famtasticfritz/famtastic/CLAUDE.md`
- `/Users/famtasticfritz/famtastic/AGENT-COORDINATION.md`

If future agents see older instructions telling them to check in, they should verify whether the pause still applies before running anything.

## Related files to read before continuing

Primary capture/report files:

- `/Users/famtasticfritz/famtastic/captures/inbox/mbsh-vibe-recovery-report.md`
- `/Users/famtasticfritz/famtastic/captures/inbox/mbsh-page-structure-unified-assessment-2026-05-12.md`
- `/Users/famtasticfritz/famtastic/captures/inbox/mbsh-scene-marker-hero-reference-extraction-2026-05-12.md`
- `/Users/famtasticfritz/famtastic/captures/inbox/mbsh_reels_layered_experience_plan.md`

Reference/planning docs:

- `/Users/famtasticfritz/famtastic/docs/sites/site-mbsh-reunion/PREMIERE-EXPERIENCE-V3-PLAN-2026-05-07.md`
- `/Users/famtasticfritz/famtastic/docs/sites/site-mbsh-reunion/COVERAGE-MATRIX.md`

Site implementation files likely involved:

- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion/frontend/js/page-sequence.js`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion/frontend/js/premiere.js`
- Site page templates/files under `/Users/famtasticfritz/famtastic-sites/mbsh-reunion/frontend/`
- CSS/theme files under the same repo; inspect before editing.

Claude design artifact reference file:

- `/Users/famtasticfritz/Downloads/Scene Marker _ Hero _standalone_.html`

Extracted analysis from that artifact:

- `/Users/famtasticfritz/famtastic/captures/inbox/mbsh-scene-marker-hero-reference-extraction-2026-05-12.md`

## Recovered product concept

The site should become a controlled reunion movie experience.

Users should not just scroll through pages. They should move through scenes/reels. The experience should be thoughtful, animated, and guided, especially on mobile.

The home page had the “boom, in your face” impact. The interior pages fell off and started feeling more like regular pages. The work now is to bring the interior pages up to the same quality level.

## Canonical experience structure

The intended page structure is:

1. Title / Impactful Hero
2. Scene Marker
3. Note from Usher / Info Panel
4. Pre section
5. Main section
6. Post section
7. Where Next
8. Final Reel / Footer

Home is special:

- Home probably does not need a visible Scene Marker because it is the opening act and the hero already establishes arrival.
- Interior pages definitely need Scene Markers.

## Slot definitions

Title / Impactful Hero:

- The opening impact for each page.
- For inner pages, this should replace plain website headers over time.
- Should establish location, tone, emotional job, and cinematic identity.

Scene Marker:

- A compact scene label for interior pages.
- Should visually place the visitor inside the movie/reunion experience.
- Examples from the Claude design artifact include deco band, mini marquee, and ticket stub variants.
- It also participates in height/layout decisions; it should fit into the section rhythm instead of becoming random decoration.

Note from Usher / Info Panel:

- This is not just decorative text.
- It is the themed instruction panel/slideshow.
- It should explain page instructions, controls, functionality, Harry/chat assistant behavior, what the user should do, and how to move through the experience.
- It matters most on mobile, because users need to understand the controlled navigation and unusual experience model.

Pre:

- Optional setup/mood/filler slot before the main function.
- Used for countdowns, mood assets, short cinematic framing, or spatial balance.
- Could be one-third, half, large, or full section height depending on content.

Main:

- The actual page function/content.
- RSVP form, tickets, timeline, memorial content, capsule form, playlist, etc.
- Must be readable and usable; do not force full-height if it hurts forms or embeds.

Post:

- Optional reflection, extra context, emotional close, promise, or secondary prompt.
- Also useful for balancing section heights and controlling movement.

Where Next:

- The controlled transition to the next scene/page.
- Should feel like part of the experience, not a generic footer link.

Final Reel / Footer:

- Closing credits, fallback navigation, and FAMtastic footer credit.

## Height and movement model

The site needs intelligent section height control across desktop and mobile.

Not every component should fill a full viewport. Some should be one-third height, half height, content-led, large, or full-screen.

Recommended data model for implementation:

- `data-page-slot="title|scene-marker|note|pre|main|post|where-next|footer"`
- `data-mode="scene|sequence|tease"`
- `data-height="full|large|half|third|content"`

Conceptual height policy:

- Major cinematic scenes: full or large.
- Notes/info panels: large or full, especially mobile if slideshow-like.
- Pre/Post: third, half, or large depending on mood and content.
- Main content: content-led; forms/embeds should not be squeezed into a forced viewport.
- Where Next: large or full so it feels like a real scene transition.

## Scene marker / hero reference findings

The local Claude design artifact confirmed these useful Scene Marker variants:

1. Deco band
   - Elegant divider.
   - Good default for interior pages.

2. Mini marquee
   - More theatrical with bulbs.
   - Good for high-energy pages such as RSVP, Tickets, Playlist.

3. Ticket stub
   - Physical ticket look.
   - Best for Tickets or schedule/order content.

Hero tone findings:

- RSVP should feel energetic: “Lock your seat,” velvet/gold/lit-letter treatment.
- Schedule/info pages can be more orienting and timeline-like.
- Memorial needs reverent, candle/film-grain mood and must not feel like hype pages.
- Informational pages can still be cinematic if the info panel and hero treatment are strong.

## Deployment-critical work remaining

This is the actual “what must be done before staging/deployment” list:

1. Impactful interior page headers/heroes
   - Inner pages need cinematic title/hero sections, not plain website headers.

2. Scene Markers
   - Interior pages need visible scene labels using the recovered design directions.
   - Home can likely omit the visible marker.

3. Note from Usher as real info panel
   - Upgrade current Note into the info panel/slideshow concept.
   - It should explain page purpose, controls, Harry/chat guidance, forms, and next action.

4. Pre/Main/Post/Where Next structure
   - Make the structure explicit enough to control movement, height, and mobile behavior.

5. Form/function wow factor
   - Forms across the site are too boring for the experience.
   - RSVP, sponsor/tickets, time capsule, memory, playlist, etc. need theatrical styling, motion, color, better success states, and delight while staying readable.

6. Mobile-first experience control
   - Phone users must always know where they are, what to do, how to move, how to get help, and what comes next.

7. Staging deploy only
   - After implementation, deploy to staging first. Do not touch production until Fritz approves.

8. Committee presentation/interview packet
   - After staging, create a document/live-doc presentation with page details, functionality, open decisions, and questions for the committee.

9. FAMtastic recipe capture
   - Capture enough lessons so the next prompt “build me a reunion site with a movie experience” can reproduce this quality.

## Immediate next task

The next task is not Part B implementation yet.

Immediate next task: produce a page-by-page experience assessment against the unified structure.

Evaluate each page against:

- Title / impactful hero
- Scene Marker
- Note from Usher / info panel
- Pre section
- Main section
- Post section
- Where Next
- Mobile movement
- Form/function wow factor
- Deployment readiness

Pages/reels to assess:

- Home
- RSVP
- Tickets
- Through the Years
- In Memory
- Time Capsule
- Playlist

Output should be a practical punch list, not another abstract theory document.

Recommended assessment file:

`/Users/famtasticfritz/famtastic/captures/inbox/mbsh-page-by-page-experience-assessment-2026-05-12.md`

## After the page assessment

Recommended order:

1. Finish the page-by-page assessment.
2. Pick the first pattern page to implement.
   - Likely RSVP because it combines hero, scene marker, note/info panel, form wow, and action.
   - Also identify the highest-risk emotional page, likely In Memory, because it must be reverent.
3. Implement structure attributes/classes in the least risky way.
4. Upgrade interior title/heroes and scene markers.
5. Upgrade Note from Usher into the info panel behavior/content.
6. Add form wow factors and success states.
7. Wire approved Wave 1 stills only where they genuinely improve the experience.
8. Test mobile and desktop movement.
9. Deploy staging only.
10. Prepare committee presentation/interview packet.
11. Capture lessons into SITE-LEARNINGS, CHANGELOG, and a reusable FAMtastic recipe/skill if appropriate.

## Things not to do yet

- Do not deploy production.
- Do not push without approval.
- Do not chase OpenAI/Gemini/Veo credential blockers right now.
- Do not generate more paid assets unless Fritz approves a specific wave.
- Do not fix unrelated reported issues that are just copy/paste artifact noise.
- Do not reduce this to a normal website punch list.
- Do not lose the FAMtastic learning loop by only working in the site repo.

## FAMtastic Studio lesson to preserve

The big platform lesson is that FAMtastic is not just a site factory. It is a vibe-coding and vibe-catching platform.

The valuable input is the messy creative process: back-and-forth, corrections, “almost right” attempts, copied inspiration, prompt refinements, layered visual concepts, and the moment the design starts to feel right.

The emerging repeatable workflow is:

conversation → vibe recovery → source truth recovery → page grammar → small asset wave → contact sheet approval → structure implementation → staging → committee/client review → production → recipe capture

This should eventually become reusable Studio behavior, not just a one-off MBSH process.
