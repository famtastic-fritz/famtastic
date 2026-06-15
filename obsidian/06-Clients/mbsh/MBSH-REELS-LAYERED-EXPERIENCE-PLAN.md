---
title: MBSH-REELS-LAYERED-EXPERIENCE-PLAN
type: note
permalink: famtastic/06-clients/mbsh/mbsh-reels-layered-experience-plan
---

# MBSH — Reels of Hi-Tides

## The Full Layered Cinematic Experience Plan

**Status:** Reference plan, captured 2026-05-10
**Site:** mbsh96reunion.com · Class of '96, 30 years · MBSH 100 years
**Theme anchor:** Vintage movie premiere. Every page is a *Reel*. Every section is a *Scene*. The viewer is the audience.
**Architectural anchor:** Layered DOM composition. Scene + character + headline + fx as independent layers. Each animates on its own loop. The browser composes; the model only renders single subjects.

---

## 1. The Architectural Pattern (what we just unlocked)

Six interlocking ideas. Together they replace ~80% of what we'd have done with video gen or model-composited heroes.

### 1.1 Layered DOM composition

Each hero is a stack of independently authored, independently animated, independently regenerable layers:

```
.hero (container, container-type: inline-size)
├── .scene    (background image or CSS-rendered scene)
├── .midground (atmospheric fx — motes, fog, light leaks)
├── .character (transparent Harry PNG, positioned in cqw)
├── .headline  (typography in cqw)
└── .foreground (optional — frame, vignette, foreground prop)
```

The win isn't visual — it's that **identity drift becomes impossible**. The scene isn't being regenerated when the character changes; the character isn't being regenerated when the scene changes. Each layer is authored once, then composed by CSS.

### 1.2 Animate with code, not video

Code wins for ambient atmospheric motion: tungsten flicker, dust motes, curtain breath, neon pulse, light leaks, Ken Burns drift, character breathing. Cost: zero per asset, perfectly cacheable, infinitely re-renderable, sharper than compressed MP4.

Veo only earns its budget when the motion is genuinely organic and physics-driven: a candle flame's chaos, a hand moving behind glass, fluid dynamics, real-camera motion. For MBSH, that's at most 1–2 reels.

**Rule of thumb:** if you can describe the motion in CSS `@keyframes` or a particle field, code it. If you can't, generate it.

### 1.3 Decorative bleed / breakout

Elements that extend past their visual container — confetti falling off the bottom of the page, Harry's cape blowing past the right edge, a marquee header that breaks out into the page above. The container has `overflow: visible` (or none); the child uses negative offsets or `grid-column: 1 / -1`.

The Auntie Gale precedent in your portfolio: Buddy "breaking top-right corner" on Buddy Pick cards, sale-sign "stage breakout left", wave-goodbye "absolute position above footer border." Same pattern.

This is what makes the layered system feel cinematic instead of boxy. The frame is a suggestion, not a cage.

### 1.4 Scroll-driven animations (2026 baseline)

Replaces GSAP/ScrollMagic for everything except the most complex scrubbing. Two timelines, native to CSS:

- `animation-timeline: scroll()` — animation progress tied to scroll position
- `animation-timeline: view()` — animation tied to element entering/leaving viewport

With `animation-range: entry 0% cover 30%` for precise control of when inside the scroll an animation runs. Compositor-thread; never blocks the main thread.

For MBSH this unlocks:

- Hero parallax driven by scroll (background slower, Harry faster) — depth without JS
- Headline letter-reveal as section enters viewport
- Confetti rain triggered as user scrolls into Playlist
- Curtain pull-back at the bottom of each reel revealing the next
- Memorial candles fading up as user scrolls past tribute names

`@supports (animation-timeline: view()) { … }` for progressive enhancement. Firefox is close but not baseline; the fallback is "the animation just doesn't run, the element appears statically."

### 1.5 Container queries for responsive scaling

`cqw` units (1cqw = 1% of container width) scale every layer proportionally to the hero box, not the viewport. The same hero component drops cleanly into a wide desktop reel, a narrow mobile reel, and a sidebar card — Harry stays proportional, headline stays proportional, motes stay proportional. No JS resize math. No breakpoint cascade.

### 1.6 View Transitions API for cross-page flow

`view-transition-name` on persistent elements (the marquee, the medallion menu, Harry himself) lets us morph them between page navigations instead of hard-cutting. The film-reel mental model becomes a film-reel visual reality — the seat number ticks, the curtain wipes, the spotlight repositions, all as one continuous shot across page loads.

Cross-document view transitions need `@view-transition { navigation: auto }` plus matching `view-transition-name` on elements across pages. Chrome shipped 2023, Safari 18, Firefox in progress. Same `@supports` fallback pattern.

---

## 2. Reel-by-Reel Scene Plan

Seven reels. The audience moves through them in order: Home → RSVP → Tickets → Through-Years → Memorial → Capsule → Playlist → (loops to Home). Each reel inherits the universal page flow (Scene Marker → Note from Usher → page content → Up Next → Footer) and contributes one cinematic hero.

For each reel below: **concept · layer breakdown · animation map · bleed opportunities · transition out · asset list · cost.**

---

### REEL I — HOME · *"Lobby"*

**Concept:** The audience arrives. The marquee is lit. The lobby is warm and full of expectation. You're not browsing a website — you've stepped into a building.

**Scene marker:** `SCENE I · INT. LOBBY — NIGHT`

**Layer breakdown (back to front):**

| z | Layer | Source | Notes |
|---|---|---|---|
| 0 | `.scene` | Veo loop (image-to-video from generated still) | The full Veo treatment — already running on production |
| 1 | `.atmosphere` | CSS-rendered haze gradient + CSS dust motes | Adds depth to the existing Veo loop |
| 2 | `.character` | Harry transparent PNG (peeking pose, e.g. `04-peeking.png`) | Bottom-right, partially off-canvas — half-revealed |
| 3 | `.headline` | Cinematic title lockup | "Thirty Years of Hi-Tides" anchor |
| 4 | `.foreground` | Optional vignette + film-grain SVG filter | Universal across all reels |

**Animation map:**

- Veo loop runs as is (already produced)
- Atmosphere haze: 12s CSS opacity oscillation
- Harry: `breath 5.5s` loop, **plus** he `view()`-fade-in as the page lands (no scroll needed since he's above the fold)
- Headline: typewriter or curtain-reveal on landing (CSS `@starting-style` for one-shot entrance)
- Scroll-down chevron: `scroll(root)` timeline, fades out by 15% scroll progress

**Bleed opportunities:**

- Harry peeks **off the right edge** — half-on, half-off. Invites closer look.
- Marquee header bleeds past the hero into the page header above
- Spotlight glow extends past the hero into the section below (using `overflow: visible` on the hero wrapper and a positioned light-glow element)

**Transition into Reel II (RSVP):** As the user scrolls down past the hero, the lobby's warm pool of light *narrows* (scroll-driven `clip-path` animation) into a single spotlight that becomes the RSVP scene's spotlight. The viewer feels they walked from the lobby into the auditorium.

**Asset list:**

| Asset | State | Action |
|---|---|---|
| Hero Veo loop | ✅ on production | Reuse |
| Harry peeking pose | Need transparent PNG (existing mascot library has 10+ poses) | Generate via E2b pipeline once locked |
| Atmosphere haze | Code (CSS) | Implement |
| Foreground vignette + grain | Code (CSS + SVG filter) | Implement |

**Cost:** ~$0 (assets exist or are code-rendered).

---

### REEL II — RSVP · *"Lock Your Seat"*

**Concept:** A single empty velvet seat in a warm spotlight. The seat is waiting. The audience knows it's *for them*.

**Scene marker:** `SCENE II · INT. AUDITORIUM — NIGHT`

**Layer breakdown:**

| z | Layer | Source | Notes |
|---|---|---|---|
| 0 | `.scene` | Imagen photoreal still (the velvet chair scene) | Generate via the v1 Test 1 RSVP prompt at Imagen $0.004 |
| 1 | `.dust` | CSS particle field drifting through the spotlight beam | The defining motion |
| 2 | `.character` | None | This reel is intentionally Harry-free — the seat speaks alone |
| 3 | `.headline` | "Lock your seat" + form trigger | Left-third, large |
| 4 | `.spotlight-beam` | CSS conic-gradient mask, animated brightness | Visual spotlight effect |

**Animation map:**

- Scene: static still, very subtle `kenBurns 22s` Ken Burns drift
- Dust motes: existing CSS pattern, 25s linear drift, `mix-blend-mode: screen`
- Spotlight beam: 5.3s tungsten flicker (existing pattern)
- Form trigger button: gold underline scroll-reveal (`view()`-timed)
- Headline: typewriter on landing

**Bleed opportunities:**

- The spotlight beam extends **past the top edge** of the hero into the marquee above — implies the projector source is overhead, out of frame
- "What to Expect" cards (below hero) start to fade in as user scrolls past 30% (`view()`-driven `animation-range`)

**Transition into Reel III (Tickets):** As scroll passes the RSVP confirmation section, the velvet curtain *closes* (scroll-driven `clip-path` from center) and re-opens on the box-office window. View-transition on the marquee header morphs "Lock your seat" → "Box Office."

**Asset list:**

| Asset | State | Action |
|---|---|---|
| RSVP velvet chair still | To generate | Imagen 4.0 — same prompt as v1 Test 1, $0.004 |
| Dust mote field | Code (CSS) | Reuse from demo |
| Spotlight beam | Code (CSS + SVG mask) | Implement |

**Cost:** ~$0.004 + code time.

---

### REEL III — TICKETS · *"Box Office"*

**Concept:** The vintage box-office window at night. Tickets are visible inside. The audience is about to commit.

**Scene marker:** `SCENE III · INT. BOX OFFICE — NIGHT`

**Layer breakdown:**

| z | Layer | Source | Notes |
|---|---|---|---|
| 0 | `.scene` | gpt-image-2 still from Test A (style-transfer Tickets) | ✅ already generated |
| 1 | `.atmosphere` | CSS warm-light pulse over the window glow | Existing tungsten flicker pattern |
| 2 | `.character` | Harry holding ticket stub (transparent PNG from E2 pipeline) | Bottom-right corner, looking at his ticket |
| 3 | `.headline` | "Box Office" + tier cards CTA | Left-third |
| 4 | `.marquee-bulb-chase` | SVG path animation around window frame | Premium touch, cinema-grade detail |

**Animation map:**

- Scene: static still with `kenBurns 22s` drift
- Tungsten flicker on window glow: 5.3s asymmetric brightness loop
- Marquee bulb chase: 4s sequential bulb illumination around the window frame
- Harry: `breath 5.5s` + occasional ticket-bobble (`rotate -1deg → 1deg`, 7s)
- Headline neon pulse: 4.5s `text-shadow` glow oscillation
- Tier cards (Marquee / Producer / Featured): stagger-reveal on scroll using `sibling-index()` for delay calculation

**Bleed opportunities:**

- Harry's cape **bleeds off the right edge** — implies wind
- Tier card "Marquee" badge could bleed off its container top edge (like Buddy's "Buddy Pick" badge)
- Window light pool extends down into the next section, lighting the tier cards from above

**Transition into Reel IV (Through-Years):** The ticket Harry's holding *becomes* the first film reel of the archive. Scroll-driven scale + view-transition morphs the ticket stub into a 35mm reel as user enters the next page.

**Asset list:**

| Asset | State | Action |
|---|---|---|
| Tickets box-office scene | ✅ Test A complete | Use as is |
| Harry with ticket transparent | Pending E2 pipeline | Generate once Stage 2 transparent test confirms approach |
| Marquee bulb chase | Code (SVG + CSS) | Implement |
| Tungsten flicker | Code (CSS) | Reuse from demo |

**Cost:** $0 (already generated).

---

### REEL IV — THROUGH-YEARS · *"Projection Booth"*

**Concept:** The projection booth. Film reels stacked. A single beam of light cuts through visible dust. Time held in suspension. The viewer is about to look back through 100 years.

**Scene marker:** `SCENE IV · INT. PROJECTION BOOTH — NIGHT`

**Layer breakdown:**

| z | Layer | Source | Notes |
|---|---|---|---|
| 0 | `.scene` | Imagen photoreal still (projection booth with film reels and beam) | Generate, ~$0.004 |
| 1 | `.beam-particles` | Canvas particle system (dust drifting through the projector beam) | Defining motion of the reel |
| 2 | `.reel-spin` | CSS-animated SVG of a slowly spinning film reel | Decorative anchor in the corner |
| 3 | `.character` | Harry holding a 35mm reel (transparent PNG) | Bottom-left for variety |
| 4 | `.headline` | "Through the Years" |
| 5 | `.timeline-spine` | Vertical SVG path that scroll-driven-animates as the user travels through the decades below |

**Animation map:**

- Scene: static still with `kenBurns 22s` drift
- Beam particles: continuous Canvas/WebGL particle field, 60fps, ~120 motes drifting through a defined beam path. Falls back to CSS `.motes` field on low-end devices.
- Reel spin: 14s linear rotation on the corner reel
- Harry: `breath 5.5s` + occasional head-tilt examining the reel he's holding
- Timeline spine (below hero): the entire vertical path scroll-draws as the user scrolls through the decades, using `scroll(root)` timeline and `path-length` SVG technique
- Decade markers (1926, 1936, 1946, ...): each `view()`-fade-in as it enters viewport

**Bleed opportunities:**

- The projector beam **bleeds off the top-right** of the hero, extending into the page header (where the medallion menu sits) — implies the projector is somewhere up there
- Timeline spine bleeds past the bottom of the page into the next reel, suggesting time itself is continuous
- Decade cards bleed past their container with photo strips (period film-strip aesthetic)

**Transition into Reel V (Memorial):** As the last decade scrolls past, the projector beam *dims*. The booth fades. The next reel opens in candlelight.

**Asset list:**

| Asset | State | Action |
|---|---|---|
| Projection booth scene | To generate | Imagen 4.0, ~$0.004 |
| Beam particles | Code (Canvas) | Implement, ~200 lines |
| Reel spin SVG | Code (SVG + CSS) | Implement |
| Harry with reel transparent | Pending E2 pipeline | Generate |
| Timeline spine scroll-draw | Code (SVG + scroll-driven) | Implement |
| Decade content (photos/text) | Existing project research (Florida Memory, yearbooks, etc.) | Curate from already-sourced archives |

**Cost:** ~$0.004 + significant code build (this is the most ambitious reel).

---

### REEL V — MEMORIAL · *"The Tribute"*

**Concept:** A single candle burns in a dark room. As scroll progresses, more candles appear, each beside a name. The reel is reverent, quiet, weight-bearing.

**Scene marker:** `SCENE V · INT. TRIBUTE — NIGHT`

**Layer breakdown:**

| z | Layer | Source | Notes |
|---|---|---|---|
| 0 | `.scene` | Veo 3.1 Lite 8s loop (candle flame flicker) | **This is the reel that earns video gen.** Real flame chaos is what code can't fake. |
| 1 | `.darkness` | CSS gradient overlay deepening to near-black at edges | |
| 2 | `.character` | None (intentionally) | The candle is the only "character" |
| 3 | `.headline` | "In Loving Memory" |
| 4 | `.candle-field` | Below the hero: each name has its own CSS-animated candle (SVG flame morph) that lights as scroll reaches it |

**Animation map:**

- Scene: Veo loop, autoplay muted loop playsinline, ~$0.40 to generate, ~3MB encoded
- Each candle in the tribute list: `view()`-triggered flame ignition (SVG flame morph from 0% to 100% as the name enters viewport)
- Name typography: fade in alongside its candle
- Memorial Add-a-Name form: appears at end of the list, gentle entrance

**Bleed opportunities:**

- Almost none. This reel is intentionally restrained. The only bleed: a single rising line of smoke from the hero candle drifts up past the top edge of the hero into the marquee — a gentle vertical seam linking earth to heaven.

**Transition into Reel VI (Capsule):** The candle slowly burns down (scroll-driven scale on the flame). At end of section, the scene fades to soft amber desk-lamp light of the Capsule.

**Asset list:**

| Asset | State | Action |
|---|---|---|
| Candle Veo loop | To generate | Veo 3.1 Lite, image-to-video, ~$0.40 |
| Candle base still (Veo first frame) | To generate | Imagen 4.0, ~$0.004 |
| Tribute candle SVG (per-name flame) | Code (SVG flame template) | Implement once, instance per name |
| Memorial Add-a-Name form | Design + build | Not designed yet — Claude Design pass needed OR direct build |

**Cost:** ~$0.40 for Veo + $0.004 for still + form design/build time.

---

### REEL VI — CAPSULE · *"The Letter"*

**Concept:** A cream envelope with a deep red wax seal rests on a mahogany desk under a single warm lamp. A fountain pen lies nearby. The room around is in soft dark. Time is held still. The viewer is invited to write a message to be opened in the future.

**Scene marker:** `SCENE VI · INT. STUDY — NIGHT`

**Layer breakdown:**

| z | Layer | Source | Notes |
|---|---|---|---|
| 0 | `.scene` | Imagen photoreal still (envelope, wax seal, lamp) | Generate, ~$0.004 |
| 1 | `.atmosphere` | Very subtle CSS lamp-warmth pulse | Restrained |
| 2 | `.character` | None | Same as Memorial — the page is intimate |
| 3 | `.headline` | "The Capsule" |
| 4 | `.foreground.pen` | A fountain-pen SVG that the cursor *picks up* on hover near the form below | Easter-egg micro-interaction |

**Animation map:**

- Scene: static still, almost no motion (the point is suspended time)
- Lamp warmth: 8s very subtle brightness oscillation
- Pen pickup: cursor-following SVG that activates only when hovering over the form input — the pen-tip follows the cursor as if writing
- Form fields: fade in stagger as the form section enters viewport

**Bleed opportunities:**

- The wax seal could bleed off the bottom edge of the envelope (already its natural position)
- A subtle ink-blot creeps out from under the envelope onto the desk surface, bleeding past the visible edge of the envelope

**Transition into Reel VII (Playlist):** The envelope is sealed. The lamp dims. The next scene opens on a curtain still settling after applause.

**Asset list:**

| Asset | State | Action |
|---|---|---|
| Envelope + wax seal scene | To generate | Imagen 4.0, ~$0.004 |
| Pen pickup micro-interaction | Code (SVG + JS) | Implement |
| Capsule form | Existing on production | Refine using layered system once locked |

**Cost:** ~$0.004 + code time.

---

### REEL VII — PLAYLIST · *"The Encore"*

**Concept:** The show just ended. The heavy red curtain is closed but still settling. Scattered metallic confetti drifts down. Warm house lights are coming up. The audience lingers. Then the playlist loops them back to the start.

**Scene marker:** `SCENE VII · INT. STAGE / HOUSE — NIGHT`

**Layer breakdown:**

| z | Layer | Source | Notes |
|---|---|---|---|
| 0 | `.scene` | Veo 3.1 Lite 8s loop (curtain breathing + slow confetti drift) | The second reel that earns video |
| 1 | `.confetti-foreground` | CSS particle field — confetti pieces with **decorative bleed off the bottom** | The Fritz pattern: confetti falling off the page |
| 2 | `.character` | Harry waving (transparent PNG) | Bottom-right, signaling encore |
| 3 | `.headline` | "The Soundtrack" / playlist trigger |
| 4 | `.foreground.lights` | CSS-rendered footlight bulbs along bottom, sequential pulse | |

**Animation map:**

- Scene: Veo loop (curtain breath + scene confetti)
- Confetti foreground: CSS keyframe particle field with negative `bottom` offsets — confetti pieces visibly drift past the bottom edge of the hero, continuing into the page below
- Harry: `breath 5.5s` + occasional wave (`rotate 0deg → -8deg → 0deg`, 12s)
- Footlight bulbs: sequential pulse using `sibling-index()` × 0.15s for delay calculation
- Loop-back CTA: pulses gently to invite return to Home

**Bleed opportunities:**

- Confetti is the defining bleed: pieces extend past the bottom of the hero and rain down through the playlist content below
- Stage light glow bleeds upward into the page header
- Harry's wave bleeds up past the top of his container as his arm extends

**Transition out (loops to Home):** As the user clicks the loop-back trigger or reaches the bottom, a view-transition fades the stage and curtain into the lobby's warm tungsten light. The marquee header morphs "The Soundtrack" → "Thirty Years of Hi-Tides." The audience walks back into the lobby. The reel restarts.

**Asset list:**

| Asset | State | Action |
|---|---|---|
| Curtain + confetti Veo loop | To generate | Veo 3.1 Lite, ~$0.40 |
| Confetti still (Veo first frame) | To generate | Imagen 4.0, ~$0.004 |
| Confetti particle foreground | Code (CSS) | Implement |
| Harry waving transparent | Generate | E2 pipeline + the existing wave pose |
| Footlight sequence | Code (CSS + sibling-index) | Implement |

**Cost:** ~$0.40 + $0.004 + code.

---

## 3. Cross-Reel System (the connective tissue)

Things that persist across all 7 reels and make the experience cohere.

### 3.1 Marquee header (persistent, View-Transition-shared)

The Note from Usher marquee + scene marker sits in every reel's header. Its content changes per page; its container persists. Using `view-transition-name: marquee` on the marquee element across all pages makes it morph instead of hard-cut between reels.

### 3.2 Medallion menu (persistent, View-Transition-shared)

The brand-mark medallion is also the hamburger menu (Fritz-confirmed design pattern). `view-transition-name: medallion-menu` ensures it stays anchored in its corner across page transitions.

### 3.3 Harry's role per reel

| Reel | Harry's appearance | Pose |
|---|---|---|
| I — Home | Peeking, partial | `04-peeking` or similar |
| II — RSVP | Absent | — |
| III — Tickets | Holding ticket | E2 — new pose generation |
| IV — Through-Years | Holding 35mm reel | E2 — new pose |
| V — Memorial | Absent | — |
| VI — Capsule | Absent | — |
| VII — Playlist | Waving | Existing wave pose |

The two absent reels (RSVP, Memorial, Capsule) earn their gravity by his absence. He's everywhere; that's why the silence in those reels lands.

### 3.4 Typography (locked, per project spec)

Per `MBSH-TYPOGRAPHY-AND-ICONS.md`:
- Display: **Playfair Display** (movie poster energy)
- Body: **Cormorant Garamond** (editorial serif)
- Formal cursive: **Allura** (calligraphic, for "Welcome Class of '96")
- Cinematic cursive: **Great Vibes** (1940s movie title, signature flourishes)
- UI accent: **Inter**
- Data/scene markers: **JetBrains Mono**

Five fonts per page maximum. Two cursive moments per section maximum.

### 3.5 Color (locked)

- `--c-crimson: #8B1A1F` (deep theater red, NOT MBSH scarlet — the Premiere palette uses the deeper red)
- `--c-crimson-deep: #4A0E11`
- `--c-gold: #C8A45C` (warm theater gold, NOT bright)
- `--c-gold-bright: #E8C77A`
- `--c-black: #0A0507` (off-black)
- `--c-velvet: #2A0508`

*Note: school colors (MBSH scarlet, silver) remain in sponsor/legacy components. The Premiere theme runs the cinematic narrative.*

### 3.6 Universal layers in every hero

Every reel inherits four base layers regardless of content:

1. **`.scene`** — the hero image or video
2. **`.atmosphere`** — CSS-rendered ambient (haze, pulse, gradient)
3. **`.headline`** — typography lockup
4. **`.foreground.grain`** — universal SVG film grain overlay (single SVG filter applied across the site for visual continuity)

Plus optional per-reel layers (`.character`, `.particles`, decorative bleed elements).

### 3.7 Scroll-driven choreography (page-level)

Each reel has a "scroll arc" — a 0→100% progression as the user scrolls top to bottom:

| Scroll % | What happens (universal pattern) |
|---|---|
| 0–10% | Hero in full bloom — all layers animating |
| 10–40% | Scroll-down chevron fades; first content section enters via `view()` |
| 40–70% | Mid-content; hero is now distant but still visible via subtle parallax slow-down |
| 70–90% | Transition cue layer ramps up (curtain closing, beam dimming, etc.) |
| 90–100% | "Up Next" reel appears, signaling the cut to the next scene |

This makes every reel feel directed, not just scrolled.

### 3.8 Page-to-page view transitions

`@view-transition { navigation: auto }` enables cross-document transitions. Each reel declares which elements are shared:

```css
.marquee        { view-transition-name: marquee; }
.medallion-menu { view-transition-name: medallion-menu; }
.scene          { view-transition-name: scene; }
```

The browser handles the morphing. Per-reel custom transitions (curtain wipe, iris in/out, beam fade) override the default via `::view-transition-image-pair(scene)` keyframes.

### 3.9 Accessibility (non-negotiable)

`@media (prefers-reduced-motion: reduce) { … }` disables all loops, scroll-driven animations, parallax, and Veo videos (fall back to posters). Required for WCAG 2.1; required by Fritz's "real users" principle. Implement as a single utility block applied via cascade.

### 3.10 Chatbot avatar (persistent across all reels)

Hi-Tide Harry's chatbot UI is itself a mini cinematic composition — the layered architecture applied at avatar scale (~80–120px container). Same DOM pattern as the heroes, just a smaller canvas:

```
.chatbot-avatar  (80–120px, container-type: inline-size)
├── .layer.frame       ← marquee bulb ring (SVG + CSS bulb-chase)
├── .layer.scene       ← warm vignette interior (gradient)
├── .layer.portrait    ← transparent photoreal Harry head & shoulders
├── .layer.shine       ← occasional gilt-edge glint (CSS keyframe)
└── .layer.status      ← typing dot / idle pulse / speaking glow
```

**Frame style locked: marquee bulb ring.** A ring of glowing tungsten bulbs encircling Harry's portrait, with a sequential bulb-chase animation that doubles as the chatbot's status indicator — slow pulse when idle, faster sequential chase when listening, full ring glow when speaking. Distinctly MBSH, nothing else like it on the web.

**Portrait source:** new photoreal Harry head-and-shoulders rendering in the F1 lobby-mascot style (theme-park costumed performer aesthetic), extracted as transparent PNG via the same Stage 2 BiRefNet pipeline used for full-body poses. Generated as part of the Harry pose set in Wave 1.

**Container queries (`cqw`) handle the scale shift.** The same architectural component shrinks from full hero (1000+px) to chatbot avatar (80–120px) without resize math — the layered architecture is canvas-agnostic. This is the "flex": the same primitive composition recursing at 1/15 scale.

**Cross-reel persistence:** the chatbot avatar element gets `view-transition-name: chatbot-avatar` so it morphs across page navigations instead of hard-cutting. Harry's chat assistant follows the viewer through every reel.

---

## 4. Production Sequence

Five waves. Each wave's output unblocks the next.

### Wave 1 — Assets (image + video generation)

**Status:** Partially complete.

| # | Asset | Cost | Status |
|---|---|---|---|
| 1.1 | Hero scene stills via Imagen 4.0 — photoreal 35mm film aesthetic, matching F1 cinema language (RSVP, Projection Booth, Capsule, Memorial-still, Playlist-still) | ~$0.02 | To run |
| 1.2 | Harry pose set, photoreal F1 style, transparent — 3 new poses via E2 pipeline (ticket, reel, wave-redo) | ~$0.51 + alpha matting | Pending Stage 2 confirmation |
| 1.3 | Chatbot Harry portrait — head & shoulders, photoreal F1 style, transparent — via E2 pipeline | ~$0.17 + alpha matting | Generate alongside Wave 1.2 |
| 1.4 | Veo 3.1 Lite loops for Memorial and Playlist (image-to-video, 8s, no audio) | ~$0.80 | Pending Wave 1.1 completion |

**Wave 1 budget cap:** ~$1.57 plus alpha matting compute (free local).

### Wave 2 — Layered hero component (one template, seven instances)

Build one reusable `<reel-hero>` component (or simple HTML pattern) that accepts:

- `scene-src` (image or video URL)
- `character-src` (transparent PNG)
- `character-position` (cqw values)
- `headline-marker`, `headline-title`, `headline-sub`
- `bleed-config` (which decorative elements bleed where)
- `transition-out` (which transition leads to the next reel)

Build seven instances by passing per-reel config. The component handles all four base layers, scroll-driven choreography, parallax, hover states, and `prefers-reduced-motion`. Estimated ~600 lines for the component, ~50 lines per reel instance.

### Wave 3 — Scroll-driven animations

Wire the `scroll()` and `view()` timelines per reel. The universal scroll arc (3.7) applies to all reels; per-reel overrides for distinctive moments (timeline-spine in Reel IV, candle-cascade in Reel V, confetti rain in Reel VII).

### Wave 4 — Cross-page view transitions

Add `view-transition-name` to persistent elements. Author the seven per-reel transitions (curtain wipe, beam dim, ink fade, etc.). Test on Chrome/Edge/Safari 18; verify graceful no-transition fallback on Firefox.

### Wave 5 — Performance + accessibility + polish

- Lighthouse pass — target ≥90 on every reel
- `prefers-reduced-motion` audit
- Keyboard navigation through all 7 reels
- Screen reader pass — ensure `aria-label` on the layered hero communicates content
- Image format: WebP/AVIF + PNG fallback for stills, MP4 + WebM for videos
- Bandwidth-saver: Save-Data header detection → swap Veo loops for posters
- Loop encoding pass: trim Veo to clean 5s loops with crossfade (ffmpeg recipe)

---

## 5. The Skill That Comes Out of This

The patterns above generalize beyond MBSH. They become an `image-gen.skill` and a `layered-hero.skill` that Codex (and Claude Code via Anthropic skill format) loads on demand for any future FAMtastic site.

What gets packaged:

| Pattern | Generalization |
|---|---|
| Cookbook URL + `input_fidelity` gotcha | Universal — every OpenAI image-gen task |
| gpt-image-2 vs Imagen cost/quality matrix | Universal cost decision |
| Style transfer for site-wide visual locking | Any site with multiple heroes that need consistent look |
| Multi-image character anchor | Any site with a mascot/character system (Buddy, Harry, future characters) |
| Transparent character pipeline (BiRefNet matte) | Any site that composites characters over scenes |
| **Layered DOM composition** | Universal — replaces "generate the whole scene" everywhere |
| Decorative bleed patterns | Any site with cinematic ambition |
| Animate-with-code playbook | Universal — code library of CSS scene-motion patterns |
| Scroll-driven animation choreography | Universal — replaces JS scroll libraries |
| View-transition cross-page flow | Any multi-page narrative site |
| Veo 3.1 Lite image-to-video for organic motion | Reserved budget — only when code can't fake it |
| `prefers-reduced-motion` baseline | Universal accessibility |

What stays MBSH-specific (lives in the brief, not the skill):
- The Premiere/cinema theme
- The 7 reel names and concepts
- The Harry character
- The Class of '96 / 100-years narrative
- The specific color palette and typography

The skill is the architectural knowledge. The brief is the content. Future sites in the 60-site factory plan get the skill applied to a different theme — and they don't have to re-discover any of this.

---

## 6. The Full Experience, Start to Finish

Imagine the viewer's path:

1. **Lands on Home** — the lobby. Harry peeks from the right edge. The marquee says "Thirty Years of Hi-Tides." A scene marker reads `SCENE I · INT. LOBBY — NIGHT`. The user feels they walked into a building.

2. **Scrolls down** — the lobby's warm pool narrows into a single spotlight. The page transition feels like walking from the lobby into the auditorium.

3. **Arrives at RSVP** — Reel II. The empty velvet seat in spotlight. Dust drifts through the beam. The seat is waiting *for them*. They lock their seat.

4. **Curtain wipes to Tickets** — Reel III. The box-office window glows warm at night. Harry's there with a ticket. They pick a tier.

5. **The ticket becomes a film reel** — view-transition into Through-Years. Reel IV. The projection booth. Dust drifts through the projector beam. The timeline spine scroll-draws through 100 years of MBSH as they scroll. Decade markers light up one by one.

6. **The projector beam dims** — into Memorial. Reel V. A single candle. Then more candles as they scroll past each name. The page is heavy and quiet. They light a candle for someone they remember.

7. **The candle dims into desk-lamp warmth** — Capsule. Reel VI. An envelope, a wax seal, a fountain pen. They write a message for the future. The pen-tip follows their cursor as they type.

8. **The envelope seals; the lamp fades** — into Playlist. Reel VII. The curtain has just closed. Confetti is still drifting down past the edge of the page. Harry waves. They click the loop-back trigger.

9. **View-transition fades the stage back into the lobby** — the marquee morphs "The Soundtrack" → "Thirty Years of Hi-Tides." They're back where they started. The reel restarts.

Seven reels. One audience member. One cinematic arc, beginning to end. No "click to next page" — every transition is a *cut*.

That's the full experience. Locked.

---

## 7. Next Concrete Action

1. **Save this doc** to `~/famtastic/sites/site-mbsh-reunion/research/reels-layered-experience-plan.md`
2. **Complete Test Suite v2.1** (transparent Harry pipeline) — gives us the green light on the layered pattern's character path
3. **Wave 1 batch run** — generate the 5 Imagen stills + 2 Veo loops in one Codex session, estimated ~$1.40 + ~30 minutes
4. **Wave 2 build** — author the universal `<reel-hero>` component as a Cowork session against the live MBSH repo
5. **Wave 3+4+5** — sequenced after Wave 2 lands
6. **Skill draft** — package the architectural patterns into `image-gen.skill` and `layered-hero.skill`. Reference implementations: `layered_hero_composite_test.html` and the per-reel configs from this doc.

That's the full experience plan, start to finish. The skill writes itself once the implementation lands.