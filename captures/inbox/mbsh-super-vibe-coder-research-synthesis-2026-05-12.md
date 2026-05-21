# MBSH Super Vibe Coder Research Synthesis — 2026-05-12

## What FAMtastic Site Studio received

A reunion movie web experience, not a generic event site. The job is to make each page feel like a controlled scene in a shared film: emotional, cinematic, mobile-clear, and functional enough for committee/staging verification.

## Research synthesis

The strongest direction is a Black cinematic Miami reunion premiere: velvet theater curtains, gold trim, warm projection light, Art Deco/Miami touches, 90s memory texture, community pride, and page-specific emotional control. The experience should avoid becoming a generic black-and-gold luxury site. The difference is narrative flow: enter the theater, meet the usher, move through scenes, lock your seat, buy/understand tickets, browse memory reels, pause for memorial, leave a message, and end with the soundtrack.

## Decision framework used

For every page I evaluated:

1. What emotional job does this scene have?
2. What should the visitor understand without reading a paragraph?
3. What role should Hi-Tide Harry play if he appears?
4. Should motion be wild, moderate, or restrained?
5. What does the page need to do functionally?
6. What should mobile users need explained?
7. What can be achieved with CSS/layering before expensive generation?

## Page blueprint

### Home — Cinematic Welcome

- Role: opening act, invitation into the movie.
- Visual: curtain/theater depth, warm marquee, spotlight, film grain.
- Harry: welcoming host at the theater entrance or implied by usher voice.
- Motion: subtle-to-moderate; curtain breath, spotlight sweep, dust, glow.
- Priority: preserve existing strong page; only avoid stale copy.

### RSVP — Lock Your Seat

- Role: first proof page and highest functional priority.
- Visual: velvet seat, guest-list/check-in, energized marquee.
- Harry: excited usher/hype man with clipboard, ticket list, or velvet rope.
- Motion: active around hero/CTA, stable around form.
- Form wow: premiere check-in/ticket confirmation; completion should feel like seat locked.

### Tickets — Box Office

- Role: trust and purchase clarity.
- Visual: box office window, ticket stub, secure checkout feeling.
- Harry: composed box-office guide presenting tickets.
- Motion: restrained; ticket shimmer, soft glints, confirmation glow.
- Form wow: payment/sponsor/ticket actions must feel official, not flashy.

### Through the Years — Memory Reel

- Role: nostalgia and recognition.
- Visual: projection booth, film reel, photos/yearbook/archive.
- Harry: memory curator/projectionist.
- Motion: moderate; photo float, projector flicker, film scratches.
- Function: browsing and contribution should feel like rediscovering a living archive.

### In Memory — Memorial Hall

- Role: sacred pause.
- Visual: candlelight, soft memorial wall, gentle warm black.
- Harry: quiet guardian, if present; no hype.
- Motion: very restrained; candle flicker, soft particles, slow fades.
- Function: clarity, dignity, and tone matter more than spectacle.

### Time Capsule — Seal the Future

- Role: intimate, reflective, future-facing contribution.
- Visual: envelope, wax seal, archival box, glowing message.
- Harry: keeper/guardian of the capsule.
- Motion: subtle-to-moderate; envelope open, wax glow, message send ritual.
- Form wow: submission should feel like sealing a message, not filling a plain form.

### Playlist — Sound Stage

- Role: celebration release.
- Visual: curtain, confetti, jukebox/equalizer/turntables.
- Harry: DJ/bandleader/party host.
- Motion: wildest page; equalizer, record spin, light pulses.
- Function: keep playlist controls and placeholder clarity obvious.

## Shared component decisions

### Hero

Every interior hero should be a layered scene, not a flat header. Use background/image, atmosphere, foreground, title, CTA, and optional Harry layer. CSS and DOM layering should carry as much motion as possible.

### Scene Marker

Mini marquee directly under hero. Content is only scene number + scene title. It orients, sequences, transitions, and reinforces the movie experience.

### Note from Usher

Configurable slide/card info panel. Voice can be Harry, theatrical usher, or page-specific. It explains where you are, what the page does, actions, navigation, controls, committee/event instructions, and mobile help. Same transition language across desktop/mobile with responsive layout.

### Movement

Linear-first, free navigation always available. Where Next guides the intended movie path; nav/footer remain escapes.

### Animation tiers

- CSS: ambient light, bulbs, dust, film grain, curtain, projector, equalizer, focus states.
- Reference/video: future Harry gestures if identity can be locked.
- Organic video: only if code cannot fake it.

## What would have made this more efficient

- A structured vibe-capture artifact produced directly from the Claude Web chat before code work.
- A canonical page map with emotional job, functional job, asset prompt, motion tier, and mobile guidance per page.
- A visual reference board attached to each page.
- A FAMtastic generator that creates hero/scene-marker/note-panel scaffolds from the page map.
- Automatic extraction of “this is the vibe” moments, repeated corrections, and copied design/code breakthroughs.

## How Shay could have helped

Shay should have acted as an ambient production producer:

- Watch the chat and flag emerging doctrine such as layered heroes, tiered Harry, and mini marquee scene markers.
- Maintain a live page map while the conversation evolves.
- Ask for the minimum missing decisions one at a time.
- Preview generated assets in-context and compare them to page emotional goals.
- Warn when implementation is drifting into generic website behavior.
- Prepare staging review notes and committee questions automatically.

## What this would look like as one future prompt

“Build a reunion movie experience for [school/class/event]. Use the cinematic reunion recipe: page-specific emotional scenes, layered photoreal heroes, mini marquee scene markers, configurable usher info panels, linear-first/free-navigation flow, form wow-factor, mobile-first controls, and capture every reusable vibe decision back into FAMtastic Studio. Generate a small asset wave, compose with CSS/layered DOM first, deploy to staging, and produce a committee review deck.”
