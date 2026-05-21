# MBSH Scene Marker + Hero Reference Extraction — 2026-05-12

Source reference:
`/Users/famtasticfritz/Downloads/Scene Marker _ Hero _standalone_.html`

Parsed readable template copy:
`/tmp/scene-marker-hero-template.html`

## Purpose

This reference clarifies the missing interior-page experience pieces for MBSH: scene markers, impactful interior heroes, and the visual language that should replace plain website headers. This is not implementation approval yet. It is a concept extraction pass so the structure can be unified before code changes.

## Important takeaway

The reference supports Fritz's direction: MBSH should not feel like a normal website. It should feel like a controlled movie/reunion experience with theatrical movement, explicit scene labels, cinematic title moments, and info panels that explain how to use each page.

## Scene Marker variants found

### A. Deco band

Class family: `.scene-band`

Use:
Quiet but elegant section divider between content blocks.

Visual traits:
- Deep burgundy/velvet context.
- Thin gold horizontal rules extending from the center.
- Small deco ticks/ornaments in the rules.
- Centered label stack.
- Small uppercase scene number such as `SCENE 03`.
- Larger display title such as `THE GALA`.

Best MBSH usage:
- Interior page scene labels where we need elegance without too much motion.
- Good default candidate for interior pages if height is tight.
- Good for mobile because it can compress better than the full marquee.

### B. Mini marquee

Class family: `.scene-mini`

Use:
More theatrical scene marker with marquee bulbs.

Visual traits:
- Burgundy/velvet strip.
- Top and bottom bulb rows.
- Centered scene number, title, and optional subtitle.
- Small glowing bulbs using the same bulb animation pattern as the larger marquee system.

Best MBSH usage:
- High-energy pages or key scene transitions.
- RSVP / Tickets / Playlist where the page should feel alive.
- Could be used as a bridge between Title/Hero and Note from Usher.

### C. Ticket stub

Class family: `.scene-stub`

Use:
A physical ticket-style scene label.

Visual traits:
- Cream ticket background.
- Dark velvet ticket body.
- Gold border.
- Dashed divider between scene number and title.
- Slight rotation for tactile paper feel.

Best MBSH usage:
- Tickets page.
- Schedule/order-of-events style content.
- Could be too literal if overused; best as a page-specific flavor.

## Interior Hero variants found

### RSVP / energetic hero

Class family: `.hero.hero--rsvp`

Visual traits:
- Full velvet background.
- Gold glow and lit-letter treatment.
- Deco frame and corners.
- Optional bulb rail.
- Strong display title example: `Lock your seat.`
- CTA treatment: `RSVP NOW`, `WHAT'S INCLUDED`.

MBSH implication:
This is the strongest candidate for the RSVP page's impactful header. It should introduce the page with energy before the form appears.

### Schedule / orientation hero

Class family: `.hero.hero--schedule`

Visual traits:
- Still cinematic but more informational.
- Lighter parchment-on-velvet tone.
- Mini timeline across the bottom.
- Example title: `Five stages, one weekend.`

MBSH implication:
This may map to Through the Years, Tickets/event details, or any page that needs to orient the visitor rather than ask for a form submission.

### Memorial / reverent hero

Class family: `.hero.hero--memorial`

Visual traits:
- Quiet, desaturated candle/film-grain treatment.
- Centered composition.
- Drops the bright Limelight marquee typography on purpose.
- Uses softer italic Garamond voice.
- Example title: `For those not in the room.`

MBSH implication:
This is the right direction for In Memory. It should not share the same hype as RSVP/Tickets. It needs reverence, calm movement, and the candle asset from Wave 1.

### Hotel / info-led hero

Class family: `.hero.hero--hotel`

Visual traits:
- Info-led hero with pier/silhouette mood.
- Example title: `A block of rooms on the ocean.`

MBSH implication:
This is not currently a canonical MBSH page, but the pattern matters: not every hero should be high drama. Some pages need an info-first scene that still feels cinematic.

## Mobile variants found

The reference includes mobile-specific treatments:

### Marquee mobile compact
Class family: `.marquee--mobile-compact`

Keeps the same anatomy but shrinks the Harry slot, title, body, CTA, bulbs, and frame.

### Marquee mobile stacked
Class family: `.marquee--mobile-stacked`

Stacks Harry above content and moves slide indicators to the bottom row. This is likely important for Note from Usher / info panel behavior on phones.

### Marquee mobile vertical
Class family: `.marquee--mobile-vertical`

Portrait-oriented theater card with vertical/side rails and centered content. Useful for mobile-first instruction panels.

### Hero mobile
Class family: `.hero--mobile`

Reduces hero padding, title size, CTA size, frame inset, and decorative corners. Memorial gets an even smaller title size to preserve softness/readability.

## Implementation implications

Do not implement RSVP Part B yet until the concept is locked.

First create the shared grammar:

- `data-page-slot="title|scene-marker|note|pre|main|post|where-next|footer"`
- `data-mode="scene|sequence|tease"`
- `data-height="full|large|half|third|content"`

Then introduce these component families:

- `experience-hero`
- `scene-marker`
- `usher-info-panel`
- `experience-form`

The reference's CSS can inform the final implementation, but should not be pasted wholesale without adapting to the existing MBSH codebase.

## Recommended structure update

Interior page opening should become:

1. Impactful Hero / Title Scene
2. Scene Marker
3. Note from Usher / Info Panel
4. Pre Scene
5. Main Sequence
6. Post Scene
7. Where Next
8. Final Reel footer

Home probably does not need the same explicit scene marker because it is the opening act.

## Page-specific mapping draft

RSVP:
- Hero: energetic RSVP velvet/lights treatment.
- Scene marker: mini marquee or deco band.
- Note: explain RSVP, deadline, what happens after submitting.
- Form: needs theatrical treatment and success moment.

Tickets:
- Hero: ticket/box-office flavor.
- Scene marker: ticket stub.
- Note: explain ticket/payment/committee status clearly.
- Forms/CTAs: need wow but must stay trustworthy.

Through the Years:
- Hero: projection/schedule/orientation style.
- Scene marker: mini marquee or deco band.
- Note: explain how to move through memories/photos.

In Memory:
- Hero: memorial/reverent treatment.
- Scene marker: deco band or quiet memorial variant.
- Note: explain submissions/names with care.
- Use Wave 1 candle asset if approved.

Time Capsule:
- Hero: sealed envelope / projection booth mystery.
- Scene marker: ticket stub or deco band depending tone.
- Note: explain what people are contributing and why.

Playlist:
- Hero: sound stage / curtain / confetti energy.
- Scene marker: mini marquee.
- Note: explain playlist interaction and submissions.

## Reusable FAMtastic lesson

This reference is a concrete example of vibe-catching becoming reusable system design. The chat/design artifact turned vague needs — “scene labels,” “hero impact,” “mobile controls,” and “info panels” — into component families with variants, tokens, and page-specific tone rules. This should become part of the future reunion/movie-experience recipe.
