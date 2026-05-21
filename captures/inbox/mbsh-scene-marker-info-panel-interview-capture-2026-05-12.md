# MBSH Scene Marker + Note/Info Panel Interview Capture — 2026-05-12

## Purpose
Capture Fritz's decisions for the MBSH reunion movie-experience structure before implementation. This defines the next layer of the experience grammar: Scene Marker, Note from Usher / Info Panel, mobile behavior, emotional tone, and hero-system implications.

## Status
Interview complete for Scene Marker, Note/Info Panel, and the hero concept. Hero + Hi-Tide Harry tier decisions are captured in `captures/inbox/mbsh-hero-harry-tier-decisions-2026-05-12.md` and should be baked into the implementation blueprint before RSVP proof-page work begins.

## Confirmed decisions

### 1. Scene Marker visual language
Use the mini marquee variant from `/Users/famtasticfritz/Downloads/Scene Marker _ Hero _standalone_.html`.

Scene Marker content should be simple:
- Scene number
- Scene title

Do not use long movie-script labels such as `INT. AUDITORIUM — NIGHT` as the primary visible marker.

Example pattern:
- `SCENE 02`
- `LOCK YOUR SEAT`

### 2. Scene Marker placement
The Scene Marker goes directly under the hero section on interior pages.

Interior page opening order:
1. Impact Hero
2. Mini Marquee Scene Marker
3. Note from Usher / Info Panel
4. Pre
5. Main
6. Post
7. Where Next
8. Final Reel Footer

Home likely does not need an explicit Scene Marker because it is the opening act.

### 3. Scene Marker job
The Scene Marker should do all of the following, while staying simple:
- Orient users
- Reinforce the movie-premiere vibe
- Show sequence/page order
- Create a transition between hero and page body

### 4. Note from Usher voice
The Note from Usher / Info Panel should support:
- Harry as the recognizable guide
- A theatrical usher persona
- Mixed/page-specific voice as needed

The panel must be updatable and slide-based, not a single hardcoded static note.

### 5. Note from Usher behavior
Use either:
- Simple slideshow with dots/arrows, or
- Card/carousel system

Transitions must be consistent across desktop and mobile. Do not create totally different motion language on mobile. If the panel fades on desktop, it fades on mobile; if it uses card transitions on desktop, it uses the same motion language on mobile.

The layout should be responsive, not behaviorally fragmented.

### 6. Note from Usher content model
The slide system must be configurable because each page may need different guidance.

Each page should be able to define slides for:
- Where the visitor is in the experience
- What this page does
- What action to take
- How navigation/controls work
- Harry/usher commentary or tips
- Committee/event instructions
- Special feature explanations
- Open decisions or alerts if needed

The system should support all of this, but pages should only show what they need so the panel does not become a wall of text.

### 7. Page-by-page emotional tone
Approved tone map:
- Home = cinematic welcome
- RSVP = energetic / urgent / “lock your seat”
- Tickets = box office / trust / purchase clarity
- Through the Years = nostalgic / memory reel
- In Memory = reverent / gentle / restrained
- Time Capsule = intimate / reflective / future-facing
- Playlist = fun / celebratory / soundtrack energy

Every generated image, hero, text block, note slide, form treatment, animation, and scene marker must match the page's specific emotional theme. Do not apply one generic movie theme everywhere.

### 8. Mobile guidance
Mobile guidance is configurable per page.

Default:
- Same content and same transition language across desktop/mobile
- Responsive layout

Allowed when needed:
- Optional mobile-specific helper copy
- Optional simplified slide text
- Page-specific mobile guidance

### 9. Movement model
Use linear-first movement with free navigation always available.

The site should encourage visitors through the intended movie/reunion sequence via Where Next, but menus/footer/direct links must still allow visitors to jump to specific tasks like RSVP, tickets, or playlist.

### 10. Committee safety / creativity balance
Primary rule: creative first, but the Note/Info Panel makes it understandable.

Secondary emphasis: the experience can be very creative and cinematic, even if unusual, as long as the guidance makes the unusual parts easy to understand.

## Layered hero / layered div implication
The layered DOM concept from `/Users/famtasticfritz/Downloads/layered_hero_composite_test.html` should influence the Impact Hero logic and may also be used in the Note/Info Panel where it makes sense.

Important principles:
- Layered divs are a reusable composition method, not just decoration.
- Hero should not be treated as one flat image.
- Possible layers include background/scene, atmosphere/dust/light, character/guide, title text, image/card layer, and motion/parallax layer.
- Note/Info Panel can use a lighter version: texture/background layer, panel/card layer, Harry tip/avatar layer, copy layer, subtle transition layer.

## Hero concept decision
The hero concept is **E: mix by page**, with **B: layered scene required**.

Each page may use a different hero recipe based on its emotional tone, but every hero should be built as a layered scene rather than a flat image. The layered approach exists because the Claude Web session proved that FAMtastic can combine independently controlled scene, atmosphere, character, typography, and animation layers. It also solves the character-placement problem: Harry does not have to be baked into every background image if a controllable transparent layer is better.

### Hi-Tide Harry tier rule
MBSH now has three Harry tiers:

1. **Ultimate Photoreal Hero Harry** — ultra-photoreal, page-theme-specific Harry for major interior hero moments.
2. **Normal Photoreal Chatbot Harry** — transparent-background assistant/avatar Harry, used inside a layered chatbot composition.
3. **Regular Hi-Tide Harry Content Images** — supporting Harry images for cards, info panels, form success states, content inserts, and smaller moments.

### Chatbot Harry rule
The chatbot should not use a generic AI bubble or blank circle. Use a miniature layered composition:

```
.chatbot-avatar
├── .layer.frame       ← marquee bulb ring
├── .layer.scene       ← warm vignette interior
├── .layer.portrait    ← transparent photoreal Harry
├── .layer.shine       ← gilt-edge glint
└── .layer.status      ← idle/listening/speaking indicator
```

The marquee bulb ring is the locked default frame style. Its bulb chase doubles as assistant state: idle pulse, listening/thinking chase, speaking glow.

### Animation tier rule
Choose motion by need:

- CSS/code animation for ambient effects that code can fake: dust, flicker, curtain breath, neon pulse, light leaks, Ken Burns, bulb chase.
- Vidu Reference-to-Video for Harry character actions where identity locking matters.
- Veo for organic scene physics where code is not convincing, such as real flame or complex curtain/physics motion.

Full capture: `captures/inbox/mbsh-hero-harry-tier-decisions-2026-05-12.md`.
