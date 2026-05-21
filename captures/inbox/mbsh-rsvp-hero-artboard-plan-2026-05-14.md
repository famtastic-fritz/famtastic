# MBSH RSVP Hero Artboard Plan — 2026-05-14

Status: planning/spec only. No asset generation and no staging push.

## Why the previous prototype was rejected

The previous RSVP hero proved some technical slots, but the product was still wrong because it treated the scene as decoration plus a reused Harry asset. The corrected approach starts with the RSVP purpose, researches the visual metaphor, decomposes the scene into layers, and only then generates or composes assets.

Keep only the technical slots:
- static background layer
- animation/effects layer
- prop/meaning layer
- bleed/bridge layer
- Tier 1 photoreal Harry layer
- integrated scene marker layer
- bottom chevron/continue control

Discard the current hero imagery as final art direction.

## RSVP story function

RSVP is not a generic form. It is the operational check-in moment that tells the committee:
- who is coming
- how many guests are attached
- how many seats/tickets to account for
- how the room, venue flow, food, and arrival timing should be planned
- whether the reunion is becoming a real room of people instead of a maybe

The hero must communicate this without requiring the visitor to read a paragraph.

## Core visual metaphor

Scene: The Premiere Check-In Desk / Guest-List Manifest.

The visitor is looking down a velvet-roped red carpet toward a glowing theater entrance and check-in station. Hi-Tide Harry is the premiere usher/host, actively opening the rope, presenting an RSVP card, or checking a gold-trimmed guest-list ledger. The scene says: “Your name goes on the list; your seat becomes real; the night can be planned.”

Tone: elegant, warm, organized, slightly urgent, Black Night Screen Elegant with red/black/gold movie-premiere energy.

## Hero artboard composition

The first viewport is one complete cinematic artboard. The hero and scene marker must not feel like two separate stacked sections. The marker is mounted inside the hero as an environmental lower-third / mini-marquee / podium plaque.

Required marker text only:
SCENE 02
LOCK YOUR SEAT

Do not include date, time, venue, location, countdown, badges, or helper text inside the marker.

## Layer breakdown

### Layer 0 — Static background plate

Purpose: establish the world before Harry, props, text, or animation.

Visual content:
- vintage theater entrance or lobby check-in desk at night
- deep red/black palette with warm tungsten/marquee glow
- red carpet perspective lines
- theater doors or a box-office/check-in window
- dark vignette edges and gold floor reflections
- no Harry
- no readable baked scene text
- no real people in focus
- reserved negative space for Harry, marker, and title copy

Draft generation model: Imagen 4.0 for cheap drafts.
Final generation model: gpt-image-2 high only after the composition is approved.

### Layer 1 — Atmosphere and motion

Purpose: make the scene alive without spending video budget.

CSS/SVG effects first:
- marquee bulb chase or pulse
- slow projector/spotlight sweep
- soft lobby haze
- dust motes in the beam
- film grain
- warm floor glow

No video for this prototype. Use generated video only later if CSS cannot fake the motion.

Reduced-motion behavior:
- static glow only
- no sweeping beams or particle drift

### Layer 2 — Prop / meaning layer

Purpose: make RSVP understandable without words.

Props:
- check-in podium or guest-list stand
- open ledger / clipboard / manifest
- seat cards or seating chart
- RSVP card or invitation edge
- velvet ropes and brass stanchions
- stack of Admit One tickets or ticket counter, used carefully so it does not turn into the Tickets page
- optional tally board or service station hinting that head count affects food/venue planning

Meaning:
- guest list = confirm attendance
- seat cards = lock your place
- velvet rope = event access
- red carpet = premiere moment
- ticket/ledger/tally = planning count

### Layer 3 — Bleed / bridge layer

Purpose: make the form feel like the next step in the same scene.

RSVP bridge direction: medium-bold.

Elements:
- red carpet continues below the hero boundary
- velvet rope or brass stanchion line points downward
- warm spotlight lands at the top of the RSVP form
- gold floor reflection bleeds into the form section

Rule: bridge is decorative and directional, not layout-breaking. The form must remain readable.

### Layer 4 — Tier 1 photoreal Harry layer

Purpose: the main hero character communicates the action.

Harry tier: Tier 1 main photoreal hero Harry, live-action mascot direction.

Pose/action options, in priority order:
1. Harry opens the velvet rope while presenting the RSVP card/guest list path.
2. Harry stands at the check-in podium, one hand on the guest-list ledger, the other welcoming the visitor forward.
3. Harry holds a gold RSVP card and points toward the check-in path/form.

Harry should not be idle or pasted on. He must perform the RSVP job.

Final asset should be transparent/cutout or separately composable, with lighting matched to warm theater/marquee light. Current F1 Harry proof asset may be used only as a temporary composition placeholder, never as final page art.

### Layer 5 — Integrated scene marker

Purpose: chapter cue inside the artboard.

Visual language:
- mini-marquee / lower-third from the standalone reference
- dark red/black glass or velvet panel
- gold trim and bulb rails
- feels bolted into podium, guest-list board, or theater signage

Content:
SCENE 02
LOCK YOUR SEAT

Placement:
- inside hero, not after it
- desktop: lower third / attached to check-in environment, above carpet bridge
- mobile: lower quarter with safe margins, readable above chevron

### Layer 6 — Title/copy layer

Purpose: accessibility and action clarity, without competing with the marker.

Avoid repeating the scene marker too many times.

Possible restrained copy:
Kicker: The guest list is open.
Title: Reserve Your Seat
Support: Your RSVP gives the committee the count to plan the room, guests, food, and flow.

### Layer 7 — Bottom chevron / continue control

The bottom chevron must be restored for interior hero pages.

Behavior:
- visible bottom-center inside hero
- keyboard focusable
- aria label such as “Continue to RSVP form”
- click/tap scrolls to the RSVP form or next major section
- smooth scroll only when reduced-motion is not requested

Placement:
- part of the same artboard, sitting in the red-carpet/glow path
- should not collide with the scene marker
- should remain visible on mobile with safe-area spacing

Known implementation miss: current `wireScrollTeaseClick()` returns early unless `page === 'home'`, so interior pages need their own continue wiring or the home-only guard needs to be generalized safely.

## Draft asset prompts

### Background plate draft prompt — Imagen 4.0

Create a 16:9 cinematic background plate for a movie-premiere RSVP check-in scene at night. Vintage theater entrance and lobby check-in desk, velvet ropes, brass stanchions, red carpet leading toward warm glowing doors, gold reflections on dark polished floor, deep black red and gold palette, elegant 35mm film mood, soft tungsten marquee glow, subtle haze, no people, no mascot, no readable text, no logos, no watermark. Leave clean negative space on the right side for a character layer and a lower-third mini-marquee scene marker.

### Final background plate prompt — gpt-image-2 high

Generate a photorealistic 35mm film still background plate for a vintage movie-premiere RSVP check-in station at night. A red carpet runs through velvet ropes and brass stanchions toward a warmly glowing theater lobby entrance. A gold-trimmed check-in podium with an open guest-list ledger and a few seat cards sits in the foreground. Deep black, crimson, and antique gold palette; tungsten marquee light; soft haze; polished floor reflections; near-black cinematic shadows; elegant reunion-premiere atmosphere. No people, no mascot, no readable text, no logos, no watermark. Reserve natural negative space for a foreground character on the right and an integrated lower-third mini-marquee marker.

### Tier 1 Harry pose prompt — gpt-image-2 edit with multi-anchor

Use multiple Harry anchors. Treat all references as the same character identity, not a collage.

The reference images show the SAME character, Hi-Tide Harry. Image 1 is the primary photoreal live-action mascot style anchor. The other images are pose/proportion/design references. Generate a NEW full-body pose of the same Hi-Tide Harry character for a movie-premiere RSVP check-in scene. Preserve the recognizable character design: red skin, red hair with two front spikes, Hi-Tide Harry shirt lettering, silver cape with real fabric texture, red pants, black-and-white striped shoes, friendly expression.

Pose: Harry is acting as a premiere usher at the RSVP guest-list desk, opening a velvet rope with one hand while presenting or pointing to a gold RSVP card / guest-list ledger with the other. The gesture should clearly invite the visitor to confirm their seat. Lighting should match warm tungsten theater marquee light with a subtle rim light on the cape. Full body visible, clean silhouette, suitable for compositing into a layered hero.

No text in image except the existing shirt lettering if preserved naturally. No logos, no watermark.

Transparent pipeline:
- try native transparent alpha first
- verify RGBA and non-uniform alpha
- if alpha fails, regenerate on pure white background and run BiRefNet alpha matting

Do not pass `input_fidelity` or `response_format` to gpt-image-2.

## Cost gate

No generation has been run.

Recommended first approved generation batch:
- 3 Imagen 4.0 background drafts: ~$0.012
- 1 gpt-image-2 final candidate background after draft selection: ~$0.17
- 1 gpt-image-2 Harry pose/cutout candidate: ~$0.17

Recommended cap for RSVP first pass: $0.50.
Hard stop without explicit approval: $1.00.

## Mobile simplification

Keep:
- first viewport hero
- Tier 1 Harry readable and dominant
- integrated marker with only SCENE 02 / LOCK YOUR SEAT
- red carpet or light trail bridge
- bottom chevron

Simplify/remove:
- tiny seat cards
- excessive stanchions
- dense particle effects
- long copy
- overlapping objects that hurt form readability

## Acceptance test before moving to other interiors

RSVP is acceptable only when:
- the hero fills the first viewport
- the scene marker feels physically part of the hero artboard
- the bottom chevron is visible and scrolls to the RSVP form/next section
- the RSVP meaning is visible from props/action before reading copy
- Harry is page-specific and doing an RSVP action, not standing generically
- the bridge leads into the form without hiding the form
- desktop and mobile both preserve the same scene grammar
- no console errors
- no staging push before Fritz inspects locally
