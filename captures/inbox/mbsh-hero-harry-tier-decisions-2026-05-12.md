# MBSH Hero + Hi-Tide Harry Tier Decisions — 2026-05-12

## Purpose
Capture Fritz's hero-system decision and the missing Claude Web decisions about layered heroes, photoreal Hi-Tide Harry tiers, animation tiers, and chatbot-avatar architecture before implementation.

## Hero decision
The interior hero concept is **E: mix by page**, but **B: layered scene is required**.

Each page can choose its own hero recipe based on its emotional tone, but every hero must use the layered DOM approach instead of a flat one-piece image.

## Why layered heroes are required
The Claude Web work proved that FAMtastic can layer animations with scenes:

- background scene layer
- atmospheric layer
- character layer
- headline/title layer
- foreground/frame/texture layer
- page-specific animation layer

The site ran into character-placement problems when trying to solve everything as a single generated composite. The decision is to let the browser compose the scene from independent layers so placement, scaling, animation, and character identity can be controlled separately.

## Hi-Tide Harry three-tier system
Hi-Tide Harry now needs three asset tiers.

### Tier 1 — Ultimate Photoreal Hero Harry
Use in every interior hero where Harry belongs.

Characteristics:
- ultra-photoreal / F1-style cinema-world Harry
- integrated into each page's hero scene
- doing something that fits that page's theme
- may be embedded visually into the hero composition, but should still be planned as a controllable layer whenever possible
- matches the 35mm-film, deep-crimson, brass, warm-light cinema language

Use cases:
- hero scenes
- large page-opening moments
- page-specific theatrical action

Examples:
- RSVP: Harry or the scene directs attention to the velvet seat / lock-your-seat action
- Tickets: Harry with ticket / box-office energy
- Through the Years: Harry near projection/reel logic when appropriate
- Memorial: use restraint; Harry may be absent or extremely respectful
- Time Capsule: Harry as gentle guide or sealed-letter ritual witness
- Playlist: Harry as soundtrack/stage host if it fits

### Tier 2 — Normal Photoreal Chatbot Harry
Use for the Hi-Tide Harry assistant/chatbot.

Characteristics:
- photoreal Harry head-and-shoulders or suitable assistant pose
- transparent background required
- designed for layered chatbot/avatar composition
- should not be placed in a generic blank circle

Chatbot avatar architecture:

```
.chatbot-avatar (80–120px container)
├── .layer.frame       ← marquee bulb ring (SVG + CSS bulb-chase)
├── .layer.scene       ← warm vignette interior
├── .layer.portrait    ← transparent photoreal Harry head & shoulders
├── .layer.shine       ← occasional gilt-edge glint
└── .layer.status      ← typing dot / idle pulse / speaking glow
```

Locked frame style:
- marquee bulb ring

Why:
- distinctly MBSH
- theatrical
- not generic AI bubble UI
- bulb chase doubles as assistant state indicator

States:
- idle: soft pulse
- listening/thinking: sequential bulb chase
- speaking/responding: full ring glow

### Tier 3 — Regular Hi-Tide Harry Content Images
Use in content sections, cards, inserts, explainers, and supporting moments.

Characteristics:
- less hero-dominant
- can be regular photoreal or stylized depending on section need
- should still respect character identity and page tone
- used as content imagery, not the main hero or chatbot avatar

Use cases:
- note/info-panel support
- cards
- form success states
- small section illustrations
- content callouts

## Animation tier matrix
Each reel/page chooses the motion tier based on need.

1. CSS / code animation
Use for ambient motion that code can fake cleanly:
- dust motes
- tungsten flicker
- breathing curtains
- neon pulse
- light leaks
- Ken Burns drift
- marquee bulb chase
- subtle character breathing

2. Vidu Reference-to-Video
Use for character actions where identity must hold:
- Harry waving
- Harry presenting a ticket
- Harry gesturing
- Harry doing a specific assistant/host action

3. Veo
Use for organic scene physics where code is not enough:
- real candle flame chaos
- true curtain movement if needed
- fluid/weather/physics-like scene motion
- camera-like organic motion

Rule of thumb:
If code can convincingly animate it, code it. If it is character motion, use identity-locked reference-to-video. If it is organic physics, use Veo.

## Photoreal direction locked
Interior page heroes go full photoreal, matching the F1 lobby aesthetic.

Confirmed hero still direction:
- deep crimson velvet RSVP chair
- box-office window
- projection booth
- memorial candle
- envelope / wax seal
- curtain-just-closed / playlist stage

These should share the same 35mm-film cinema language.

## Page theme matching rule
Every generated image, hero, Harry pose, note slide, form treatment, animation, and content block must match the page's emotional theme.

Approved tone map:
- Home = cinematic welcome
- RSVP = energetic / urgent / lock your seat
- Tickets = box office / trust / purchase clarity
- Through the Years = nostalgic / memory reel
- In Memory = reverent / gentle / restrained
- Time Capsule = intimate / reflective / future-facing
- Playlist = fun / celebratory / soundtrack energy

## Implementation implications
Before implementation, the blueprint must account for:

1. A reusable layered hero pattern.
2. Page-specific hero recipes.
3. Mini-marquee scene marker directly below each interior hero.
4. Configurable Note from Usher slides below the scene marker.
5. Harry tier selection per page/section.
6. Chatbot avatar as a miniature layered composition, not a generic widget.
7. Animation tier selection per page.
8. Mobile/responsive behavior using the same motion language, not separate desktop/mobile behavior.

## Skill / recipe implications
This must feed the FAMtastic skill library as reusable capability:

- cinematic-hero
- cinematic-avatar
- character-pipeline
- image-and-video-gen
- asset-extraction
- code-animation
- layered-composition
- mobile-degradation

The durable lesson is that FAMtastic should not generate flat hero images when the concept requires control. It should generate and compose layers: scene, atmosphere, character, typography, foreground, and motion.

## Next use
Use this capture as input to the MBSH implementation blueprint before RSVP proof-page work begins.
