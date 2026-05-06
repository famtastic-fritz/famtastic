# MBSH Reunion — "The Premiere" Theme + Experience Plan

## Context

The MBSH Class of '96 30th reunion site is **live and technically green** (`mbsh96reunion.com` — staging + prod Netlify, smoke 7/7, DB applied, Resend verified, API DNS/TLS resolved as of 2026-05-05), but it's **not yet emotionally green**. Fritz's verdict: *"Im not happy. theres no parallax, no scroll animation, no character interactions. we created a bunch of brand images, but no real thought to it."*

The brief always called for a **black-tie / cinematic / movie-premiere** feel, leveraging the school's celebrity-alumni heritage *without name-dropping anyone* (the brand "AVOID" list explicitly forbids it — quality must be signaled through quality, not name-checking). What exists today is a tasteful but static elegant-magazine site. The job now: **turn it into an experience that feels like attending a movie premiere — for the entire class.**

This plan is the marketing/creative-director output: a unifying theme, per-page choreography, asset-generation queue, and the technical approach to deliver scroll-driven cinema at 60fps on a phone in bed at 11pm.

The plan does not modify any site code — it sets up the direction so the next session (or the agent on the other branch) can execute against an approved brief.

---

## Diagnosis — what's actually missing

Code-grounded list, by file. None of these are bugs; they're absences.

| Layer | What's there | What's missing |
|---|---|---|
| `frontend/css/hero.css` | Static hero with looping video, brand mark, headline, single Harry pose | No layered parallax, no letterbox entry, no projector grain, no curtain rise, no constellation |
| `frontend/css/story.css` | Three full-bleed `.story__moment` cards (Then / Now / Forever) | No scroll-pinned crossfade between moments, no Ken-Burns drift on the bg images, no Cormorant text settle |
| `frontend/js/main.js` | Page-level glue, IntersectionObserver fade-ins (probably) | No GSAP/Lenis/scroll-timeline, no scene controller, no Harry-as-usher walk |
| `frontend/css/sections.css` | Event details grid, preview cards | No marquee bulb chase, no spotlight cursor, no ticket-stub cards |
| `frontend/css/compass.css` | Single floating medallion nav | No "lights down" treatment when entering Memorial; nav doesn't react to section |
| `frontend/css/chatbot.css` | Static bubble in corner | Harry never *moves* between sections, never appears as the page's character — only as a chat icon |
| `assets/backgrounds/` | 5 production MP4s already in repo (yearbook, push-in, VHS, mascot energy, dancefloor confetti) | They're shown one at a time as a hero loop; no projector reel sequencing, no film-grain overlay, no light leak |
| `assets/mascot/` | 10 Harry pose PNGs (wave, thumbs up, thinking, cheer, etc.) | Currently used only in the chatbot — they're a perfect ushered-character library that the site doesn't use as one |
| `assets/story/` | 7 era photos + then/now JPGs (rights manifest in place) | No scroll-driven sequencing, no parallax, no era-card stack |
| Page transitions | None — hard navigations | No "lights down → curtain rise" between pages |
| Mobile | Responsive but flat | No touch-tuned scroll choreography; current site on a phone reads as a long static doc |

---

## Theme system — "The Premiere"

### Core narrative metaphor

**The site is the night of the premiere.** Not a website *about* a reunion. The arrival, the lobby, the marquee, the tribute reel, the soundtrack, the seal-your-letter moment, taking your seat — every page is a scene in the evening. The user is the guest of honor. Hi-Tide Harry is the **usher** who walks them through it.

This metaphor ties together every clue the brief already plants — black-tie, "Thirty Years of Hi-Tides," 100-year anniversary, In Memory section, Time Capsule envelope, embedded soundtrack — and gives them a single emotional spine.

### Marketing positioning (the line every page must clear)

> "If a Class of '96 alum opens this on their phone at 11pm, the first three seconds should make them sit up in bed. By the end of the home page they should have texted someone. By the time they hit RSVP, the question isn't *am I going* — it's *what am I wearing.*"

That bar drives every choreography choice below.

### Color, light, and texture system

Building on the existing palette (off-black `#0A0A0A`, scarlet red, silver, cream), add three new tonal layers:

1. **Night-sky black** — `#05050B` for the deepest backgrounds, with a fixed subtle starfield canvas (~80 stars, slow twinkle, very low alpha) sitting *below* the hero video and other content. Stars are visible only in the negative space — they're the celebrity-energy without any name on them.
2. **Scarlet velvet** — `#7B0E1E` deep, used for curtain reveals, ticket-stub backgrounds, and section dividers
3. **Silver foil** — metallic gradient (`linear-gradient(135deg, #d8d8e0 0%, #f4f4f8 30%, #a8a8b4 50%, #f4f4f8 70%, #d8d8e0 100%)` with a subtle sheen) for premium icon treatment, sponsor tier badges, the brand mark, and section-divider rules

**Light treatment overlays (always on, low intensity):**
- Film grain (16x16 noise PNG, `mix-blend-mode: overlay`, 6% opacity, animated `background-position` shift at 24fps for true projector flicker)
- Soft vignette (radial gradient, `pointer-events: none`, fixed)
- Light leak (one large warm-amber soft-light gradient that drifts across the viewport on a 40s loop — barely perceptible, signals "celluloid")

These run as a single fixed overlay layer (`<div class="premiere-fx">`) above content, below modals. Cost: ~6KB CSS + one PNG. No JS.

### Type-as-cinema

The existing six-font system stays. What changes is how the type *enters*:

- **Hero headline** ("Thirty Years of Hi-Tides") — type-on settle: each glyph fades in with a small Y-axis lift and a subtle blur-clear (8px → 0px), staggered ~30ms. This is the opening title card.
- **Cursive overlay** (Allura "Welcome back, Class of '96") — handwritten draw-on (clip-path or SVG stroke-dashoffset). 1.6s, eases in just *after* the headline settles.
- **Section headlines** — Playfair Display, slow letter-spacing tighten on enter (`tracking: 0.4em → 0`, 0.8s)
- **Captions** (Cormorant Garamond italic) — fade in on `view()` timeline at 30%–60% scroll progress
- **Body** — never animated. Animate signage, not paragraphs.

### Motion grammar (used everywhere)

| Move | Use | Duration |
|---|---|---|
| **Curtain rise** | Page entry; wraps top + bottom velvet bands pulling apart | 1.2s |
| **Letterbox** | Scene transitions; thin black bands glide in from top/bottom to frame the next section, then pull back as that section becomes the focus | 0.6s in, 0.6s out |
| **Spotlight follow** | Desktop: cursor leaves a soft warm-amber radial glow; Mobile: scroll-active section gets the spotlight automatically | continuous |
| **Marquee chase** | Vintage cinema marquee bulbs above event-details, sequential bulb pulses | 2s loop |
| **Reel scrub** | Through-the-Years horizontal scroll = filmstrip pulled across the screen | scroll-paced |
| **Wax seal** | Time Capsule submit: red wax pours, stamp drops, fade | 1.6s |
| **Spotlight tribute** | Memorial: each name fades in with a single piano-key sustain ("In Memoriam" cadence) | 0.9s per name |

### Hi-Tide Harry as usher (new role)

Harry already has a 10-pose library shipped to prod. Right now he's only used in the chatbot icon. He should also appear **as the host of the page**, walking between sections:

- Wave hello at top of hero
- Pointing forward as the user reaches the Story section
- Excited cheer at the Event Details marquee reveal
- Listening (currently the chatbot pose) when the user pauses
- Thumbs up on form submit success
- Salute on the final footer

Implementation: a fixed `position: sticky; bottom: 24px` Harry layer that swaps PNGs on `IntersectionObserver` per-section. He never blocks content — small (~120px), bottom-right on desktop, bottom-corner on mobile, hidden when chatbot opens. He's the *thread* that ties scenes together.

This is the "character interaction" Fritz said is missing — implemented entirely with assets we already shipped.

---

## Technical approach

**Stack additions (lightweight, no framework change):**

1. **CSS scroll-driven animations** (`scroll()` and `view()` timelines) for everything that isn't choreographed. Native, GPU-thread, zero main-thread cost — explicitly recommended for mobile per Chrome's perf case study. Supported in Chrome 115+ and Safari 18+ as of 2026; Firefox behind a flag (graceful degradation).
2. **GSAP + ScrollTrigger** *only* for the scenes that genuinely need pinning, timeline orchestration, or cross-element synchronization (curtain rise, story-pin crossfade, through-years filmstrip, marquee chase). Loaded once site-wide.
3. **Lenis smooth-scroll** *desktop only*. Disabled on touch (`syncTouch: false`) — native iOS/Android scroll feel is what users expect on a phone. Lenis breaks momentum scrolling on mobile in subtle ways and there's no benefit when scroll-driven CSS handles the heavy lifting.
4. **`prefers-reduced-motion: reduce`** kill-switch that disables all of the above, falls back to fade-only.

**Why this layering:** the Chrome team's 2025 case study shows scroll-driven animations replacing JS-driven scroll handlers cuts main-thread cost ~70%. We use the cheap thing for 90% of the choreography, and the expensive thing only for the 10% of moments that earn it.

**Mobile-first guardrails:**
- Hero video: poster image always visible, video lazy-mounts only on `connection.effectiveType !== 'slow-2g'`
- Starfield canvas: replaced with a 1KB SVG of static stars on mobile (no canvas rAF tax)
- GSAP timelines: `matchMedia('(min-width: 768px)')`-gated for any scrub-pinned sequence
- All character/story image swaps preloaded via `<link rel="preload">`
- Total animation budget: ≤ 12% extra CPU on mid-tier Android per Lighthouse; track it.

---

## Per-page breakdown

Each page is a scene. Format: **Opening → Choreography → Exit → Mobile delta → Asset queue.**

### 1. `index.html` — *The Premiere*

**Opening (first 1.2s):**
- Black screen with "MBSH presents" Allura cursive, fade-in 0.5s
- Velvet curtain rise (two halves separating top/bottom) reveals the existing dancefloor-confetti video already preloaded
- Title card lands: "Thirty Years of Hi-Tides" — Playfair, glyph-stagger settle
- Subhead "October–November 2026 · Miami Beach" types in like a slate
- Harry (`01-wave-hello.png`) walks in from bottom-right with a small bounce, waves, settles
- CTA pill (existing — "Reserve Your Seat") fades in last with a soft scarlet pulse

**Scroll choreography (top → bottom):**

| Section | Move | Tech |
|---|---|---|
| Hero → Story | Letterbox bands close → page background goes night-sky black → bands open into Section 2 | GSAP timeline pinned 600px |
| Story · Then (1996 hallway) | Image scales 1.0 → 1.05 (Ken Burns), Cormorant caption fades in 30%–60% scroll progress | `view()` timeline |
| Story · Now (Miami Beach) | Crossfade from prior image, opposite-direction Ken Burns | `view()` timeline |
| Story · Forever | Brand mark (30+100 lockup) lifts up and grows softly, subtle pulse, scarlet rim-light | GSAP scrub |
| Event Details | Marquee bulbs above the details grid do a chase-light loop on first reveal; details grid items fade in stagger 80ms | CSS scroll-timeline + 1 keyframe loop |
| Event Details hook line | "A black-tie celebration thirty years in the making" — Allura, draw-on stroke | SVG stroke-dashoffset |
| Preview cards (six tiles) | Each card lifts on enter, silver-foil divider rule sweeps left-to-right above the row | `view()` timeline |
| Footer | Harry in salute pose (`pointing.png` or new salute), small ocean wave SVG | static |

**Mobile delta:** Letterbox bands become a 0.4s fade-to-black transition between sections (cheaper than pinning). Marquee chase is a 1KB GIF or animated SVG (no GSAP). Spotlight follows scroll position, not cursor. Harry sits bottom-corner and only swaps poses on section change.

**Asset queue:**
- *new* 30+100 brand-mark redraw with silver-foil sheen treatment (canvas-design / nano-banana)
- *new* Marquee bulb light frame (SVG, generate via canvas-design)
- *new* Velvet curtain texture tile (nano-banana)
- *new* Film grain 16x16 PNG (canvas-design)

---

### 2. `rsvp.html` — *Take Your Seat*

The current page is a clean form. The metaphor: choosing your seat at the premiere.

**Opening:** Letterbox close from prior page → cinema-seat row outline SVG draws across the top of the page → form fields appear as if "lighting up" one seat at a time.

**Choreography:**
- Form fields are styled as illuminated row letters / seat numbers; entering data "claims" a seat (subtle scarlet glow on the field)
- The submit button is a velvet-rope CTA: "Take Your Seat" (rename from "Reserve")
- On submit: Harry does the thumbs-up pose, a ticket-stub graphic flips into view with the user's name + reunion date in JetBrains Mono on the stub
- The stub has a perforated edge (CSS `mask-image` with dotted radial gradients) and is downloadable as a PNG via canvas-to-image (optional, post-MVP)

**Mobile delta:** Seat-row SVG becomes a single scarlet horizontal rule. Ticket stub renders inline below the form, no flip.

**Asset queue:**
- *new* Cinema-seat row SVG (canvas-design)
- *new* Ticket-stub template — perforated edge, "MBSH · CLASS OF '96 · ROW [name] · SEAT 30" (canvas-design + frontend-design for the React/CSS implementation)
- *new* Velvet rope SVG icon for the CTA
- Reuse Harry `02-thumbs-up.png` for success state

---

### 3. `tickets.html` — *Patrons of the Evening*

Sponsor tiers become **patron tiers** of the premiere. Each tier gets a treatment that matches studio-credit hierarchy.

**Choreography:**
- Tier cards stack vertically, each one a marquee panel
- Platinum tier: silver-foil card with subtle motion-shimmer (animated linear-gradient sweep, 6s loop)
- Gold / Silver / Bronze: progressively quieter treatments, but each card still has a small chase-light border on hover
- Sponsor logos (when they exist) appear in a "thanks to our patrons" filmstrip that slow-scrolls horizontally — vintage credits-roll feel
- Hover on a tier: the velvet-rope CTA appears with "Become a Patron"

**Mobile delta:** Filmstrip becomes a vertical stack of logo cards. Foil shimmer disabled (battery cost not worth it on phone).

**Asset queue:**
- *new* Tier-badge medallions (Platinum / Gold / Silver / Bronze) — already specified in MBSH-TYPOGRAPHY-AND-ICONS.md, never generated. Generate via nano-banana.
- *new* Velvet rope element

---

### 4. `through-years.html` — *The Trailer Reel*

This is where the cinema metaphor pays off hardest. The five eras (1926–59, 60s–70s, 80s, 1996, 2026) become **a horizontal filmstrip** the user scrolls through.

**Choreography:**
- On enter: the page "loads" as a film reel. Top-of-page film-strip sprocket-hole graphic, the eras lined up horizontally
- Native vertical scroll → drives a **horizontal** filmstrip via GSAP ScrollTrigger pinning (the classic "horizontal scrolly" pattern)
- Each era card is a polaroid-style image with a Cormorant Garamond italic caption underneath, a year badge in JetBrains Mono
- The 1996 card pauses slightly longer than others (snap-point) — "this is your year"
- The 2026 card has a soft scarlet pulse — "the night is now"
- "Add a Memory" form (already in the page) appears at the end, treated like a director's notes page

**Mobile delta:** Horizontal scroll is replaced with **vertical snap-cards** (`scroll-snap-type: y mandatory`). Each card fills the viewport. Sprocket holes top + bottom. Same emotional pacing, no horizontal trick.

**Asset queue:**
- *new* Filmstrip sprocket-hole SVG border (canvas-design)
- *new* Polaroid-frame template applied to existing era JPGs (frontend-design CSS only — no new images needed)
- Reuse all existing era photos in `/assets/story/`

---

### 5. `memorial.html` — *In Memoriam*

This page must stay reverent. Borrow the Oscar-broadcast "In Memoriam" segment cadence directly.

**Choreography:**
- Page opens with letterbox bands that **don't fully retract** (they stay as thin scarlet rules above and below the names list — frame the segment)
- Page background: night-sky black with starfield more visible here than anywhere else (each star is a soul, intentional)
- Names appear one at a time on scroll, each: `view()` timeline 0%–40% — Cormorant Garamond italic, slow fade up, brief silver-foil rule beneath, then settle
- A single piano sustain (audio, opt-in only — `<button>` to play, never autoplay; brief said "no autoplay audio")
- Subtle: a small white dove or candle SVG drifts upward in the background occasionally
- Tagline at top: "Forever Hi-Tides." (Allura)
- No chatbot bubble visible on this page — Harry steps back. Hide via `body[data-page="memorial"] .chatbot { display: none }`.

**Mobile delta:** Same exact treatment, just narrower margins. This page is a perfect mobile experience because it's intentionally slow.

**Asset queue:**
- *new* Candle / dove SVG drift element (canvas-design — keep it tasteful, abstract)
- *new* Optional piano-sustain audio file (royalty-free; placeholder)

---

### 6. `capsule.html` — *The Letter to Yourself*

Already conceptually strong (envelope + "Seal the Capsule" CTA). Push it further.

**Choreography:**
- Page opens with a **closed envelope** centered, gold/scarlet wax seal stamped
- On scroll or click: the envelope opens, a letter slides out, the form fields appear written on the letter (Cormorant Garamond, faux-handwriting feel)
- Hi-Tide Harry stands beside the envelope (`08-pointing.png`), gesturing toward it
- On submit: a wax-seal animation (red wax pours from a virtual wax stick, stamp drops with the '96 mark, satisfying *thunk*) — entirely CSS keyframes + a single SVG
- Success state: "Sealed. Delivered July 12." in Great Vibes script
- Background: night-sky black, very subtle parchment grain overlay

**Mobile delta:** Envelope becomes a vertical letter card. Wax-seal animation simplified (CSS keyframes only, no SVG morph).

**Asset queue:**
- *new* Wax-seal SVG with '96 monogram (nano-banana)
- *new* Envelope + letter component (frontend-design)
- *new* Parchment-grain overlay PNG

---

### 7. `playlist.html` — *Encore — The Soundtrack of '96*

Spotify embed already in scope. Treat it like the encore reel — credits rolling with music.

**Choreography:**
- Page opens with vinyl-record SVG center-stage, slowly rotating (CSS rotate animation, 8s loop)
- Below: Spotify embedded player (use Spotify's embed API; can't custom-style much)
- Around the player: scrolling lyrics / song-title list in vintage cinema-credits format (white Inter on black, slow-scroll bottom-to-top, GSAP-driven)
- Easter egg: clicking the vinyl drops the needle (subtle SVG animation), no audio change (Spotify owns playback)
- Tagline: "The songs that built us. Press play." (Allura)

**Mobile delta:** Vinyl shrinks to header element. Lyrics-credits roll becomes a static list (auto-scroll battery-expensive).

**Asset queue:**
- *new* Vinyl-record SVG with MBSH center label (canvas-design)
- *new* Phonograph needle SVG (canvas-design)

---

### Site-wide additions (apply to every page)

- `<div class="premiere-fx">` overlay — film grain + light leak + vignette
- Starfield canvas component (`fixed`, behind everything, `z-index: -1`)
- Harry-as-usher sticky character (sections-aware, swaps poses)
- `body[data-page]` data attribute already exists — use it to disable Harry-usher on memorial, route audio opt-in only on memorial + capsule
- Page-transition curtain (between page navigations, full-screen scarlet velvet wipes for ~0.6s)
- Compass-nav medallion: when user is on memorial, medallion goes silver instead of red (subtle reverence cue)

---

## AI / asset-generation queue

When this plan is approved, kick these off in parallel. All produce files into `~/famtastic-sites/mbsh-reunion/frontend/assets/`. Each row notes the right tool.

| # | Asset | Tool | Prompt seed |
|---|---|---|---|
| 1 | Velvet curtain texture (seamless tile, 512×512 PNG) | `nano-banana` | "Deep scarlet velvet curtain fabric, seamless tile, soft folds, photorealistic, no text, premium luxury theater curtain" |
| 2 | Film grain 16×16 PNG (transparent) | `canvas-design` | Procedural noise tile, ~6% alpha |
| 3 | Marquee bulb SVG + chase-light keyframes | `frontend-design` | Vintage cinema marquee, 12 round bulbs, gold filaments, scarlet glow |
| 4 | Ticket-stub template (component + PNG variant) | `canvas-design` + `frontend-design` | Perforated edge, "MBSH · CLASS OF '96 · ROW [name]" — JetBrains Mono on cream |
| 5 | Cinema-seat row SVG | `canvas-design` | 8-seat row top-down silhouette, scarlet velvet seats, gold trim |
| 6 | Tier-badge medallions ×4 (platinum / gold / silver / bronze) | `nano-banana` | Multi-material foil medallion, 30+100 lockup center, ribbon at base |
| 7 | Vinyl record + needle SVGs | `canvas-design` | MBSH center label red, '96 + 30 typography on label |
| 8 | Wax seal '96 monogram SVG | `nano-banana` | Scarlet wax stamp, raised '96 monogram, deckled edges |
| 9 | Filmstrip sprocket-hole border SVG | `canvas-design` | Top + bottom film perforations, seamless tile |
| 10 | Polaroid frame component | `frontend-design` | Vintage white polaroid border, slight tilt, soft drop shadow |
| 11 | Candle / dove drift SVG (memorial) | `canvas-design` | Abstract minimalist single-candle flame OR upward dove silhouette |
| 12 | Brand-mark silver-foil treatment | `nano-banana` | Existing 30+100 brand mark, regenerated with metallic silver foil sheen |
| 13 | "MBSH presents" cursive title card (intro overlay) | `canvas-design` | Allura font sample, scarlet on black, centered, 1920×1080 |
| 14 | Page-transition curtain wipe video (optional, lottie or webm) | `gemini visual` for direction, `nano-banana` for stills | 0.6s scarlet curtain wipe across screen |
| 15 | Starfield generative element | `frontend-design` | Canvas-based or SVG, ~80 stars, 3 brightness tiers, slow twinkle |

Total estimated generation time: ~30–45 minutes if run in parallel. All outputs must clear the brief's existing constraints (off-black `#0A0A0A` not pure black, silver as gradient not flat, no celebrity name-drops, no SVG uploads to user-facing forms).

---

## Critical files to modify (when execution begins)

- `frontend/index.html` — add curtain, premiere-fx overlay, Harry-as-usher mount point, starfield canvas
- `frontend/css/base.css` — add the premiere-fx layer, starfield, Harry-usher styles, motion grammar variables (curtain duration, letterbox color, etc.)
- `frontend/css/hero.css` — hero choreography (title settle, Harry walk-in, CTA pulse)
- `frontend/css/story.css` — pinned scroll + crossfade + Ken Burns
- `frontend/css/sections.css` — marquee bulbs, preview-card silver rule sweep
- `frontend/css/chatbot.css` — hide chatbot on memorial, coordinate with Harry-usher
- *new* `frontend/css/premiere.css` — site-wide motion grammar (curtain, letterbox, spotlight, starfield, Harry-usher, page-transition)
- *new* `frontend/js/premiere.js` — GSAP + ScrollTrigger setup, Lenis (desktop only), Harry section observer, prefers-reduced-motion gate
- `frontend/js/main.js` — wire premiere.js, add `data-scene` per section
- `frontend/rsvp.html` — seat-row SVG, ticket-stub success state
- `frontend/tickets.html` — patron-tier marquee panels, foil shimmer
- `frontend/through-years.html` — horizontal filmstrip pin (desktop) / vertical snap (mobile)
- `frontend/memorial.html` — letterbox-frame styling, opt-in piano sustain audio
- `frontend/capsule.html` — envelope/letter component, wax-seal animation
- `frontend/playlist.html` — vinyl record, scrolling credits roll
- `frontend/index.html` and all pages — add `<div class="premiere-fx">` overlay div, `<canvas class="starfield">`, Harry-usher mount
- *new* `frontend/assets/premiere/` directory for the new generated assets above

---

## Verification plan

1. **Dev preview** — run the site locally (Studio's localhost:3333 or `python3 -m http.server` in `frontend/`)
2. **Desktop scroll-through** — every page from top to bottom, watching for:
   - Curtain rises within 1.2s
   - Title settles legibly
   - Harry swaps pose at every section boundary
   - Letterbox transitions fire on every section
   - No layout shift (CLS < 0.05 in Lighthouse)
3. **Mobile sim** (Chrome DevTools, iPhone 14 + Pixel 7 viewports + slow-3G throttle):
   - Hero loads <2.5s on slow-3G with poster-first
   - Scroll-driven CSS animations stay 60fps (Performance tab)
   - GSAP timelines disabled below 768px where they should be
   - Harry-usher visible bottom-corner, doesn't block content
   - All forms work (RSVP, capsule, memory)
4. **Reduced motion** — set OS-level `prefers-reduced-motion: reduce`, confirm only fade-only fallback runs, no parallax/pin/spotlight
5. **Lighthouse** — performance ≥ 85 mobile, accessibility ≥ 95, no a11y regressions
6. **Real device check** — at minimum one iOS + one Android, using `chrome://inspect` or Safari Web Inspector
7. **Three-second test** — open the home page on a phone, count to three, ask: do I want to keep scrolling? If no, the curtain rise / title card needs another pass.
8. **Smoke (existing)** — `platform/famtastic-platform smoke test mbsh-reunion` still passes 7/7 (this work is presentation-layer only; backend untouched)

---

## What this plan does NOT do

- Does not change backend, RSVP/capsule/memorial endpoints, CORS, DB, Resend, or Netlify config
- Does not modify the brief's locked elements (mascot canon, six-font system, color non-negotiables)
- Does not name-drop celebrity alumni — the "movie premiere" feel is *atmospheric*, never literal
- Does not introduce a framework migration (still vanilla HTML/CSS/JS — adds ~30KB total: GSAP+ScrollTrigger ~50KB gz, Lenis ~3KB, premiere.js ~5KB, premiere.css ~8KB)
- Does not autoplay audio anywhere
- Does not break the brief's existing AVOID list

---

## Open questions for Fritz before execution

1. **Voiceover at the curtain rise?** Optional 4-second voiceover ("Class of '96, the night you've waited thirty years for…") — could be powerful or could be too much. Default: skip.
2. **Memorial piano sustain — opt-in OK, or omit entirely?** Brief says no autoplay; opt-in button is compliant, but reverence sometimes prefers silence.
3. **Through-the-Years horizontal filmstrip — keep on desktop, or use vertical snap-cards everywhere for consistency?** Default: horizontal on desktop, vertical on mobile.
4. **"MBSH presents" intro card on every page load, or only first visit?** Default: first visit per session (sessionStorage flag), or on every reload of `index.html` only.
5. **Generate all 15 assets upfront, or produce them in waves matching page rollout?** Default: generate batch 1 (curtain, grain, marquee, brand-foil, starfield, Harry-usher wiring) first, ship Home + Memorial, then iterate.

---

## Sources / research drawn from

- [GSAP ScrollTrigger docs](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) — pinning, scrubbing, timeline orchestration patterns
- [MDN: CSS scroll-driven animations](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations) — `scroll()` and `view()` timeline reference
- [Chrome for Developers: scroll-animation performance case study](https://developer.chrome.com/blog/scroll-animation-performance-case-study) — compositor-thread perf vs JS scroll handlers
- [Lenis Smooth Scroll](https://www.lenis.dev/) — smooth scroll with `syncTouch` mobile guidance
- [Codrops: Layered Zoom Scroll with ScrollSmoother](https://tympanus.net/codrops/2025/10/29/building-a-layered-zoom-scroll-effect-with-gsap-scrollsmoother-and-scrolltrigger/) — pinning + zoom pattern adopted for the Story scene
- [Codrops: Sticky Grid Scroll-Driven](https://tympanus.net/codrops/2026/03/02/sticky-grid-scroll-building-a-scroll-driven-animated-grid/) — modern through-the-years grid pattern
- [Awwwards: Best Parallax Websites](https://www.awwwards.com/websites/parallax/) — current state-of-the-art reference
- [Webflow: Parallax 10 Examples](https://webflow.com/blog/parallax-scrolling) — Diesel "Only the Brave" cinematic-narrative pattern (cited as core reference for the Premiere arc)
- [CSS-Tricks: Interactive Starry Backdrop](https://css-tricks.com/an-interactive-starry-backdrop-for-content/) — starfield canvas pattern, perf-conscious
- [Tubik: Mascots in UI](https://blog.tubikstudio.com/design-me-live-the-power-of-mascots-in-ui-and-branding/) — Harry-as-usher design rationale
- [Tubik: Elegant Dark Interfaces](https://blog.tubikstudio.com/ui-inspiration-14-elegant-interfaces-using-dark-background/) — depth/contrast technique for the night-sky black palette
- [Smashing Magazine: Art of Film Title Design](https://www.smashingmagazine.com/2010/10/the-art-of-the-film-title-throughout-cinema-history/) — typography-as-cinema for the hero settle
- [Speckyboy: 10 Curtain Effect Snippets](https://speckyboy.com/curtain-effect-web-design/) — curtain-rise reference implementations
- [60fps.design](https://60fps.design/) — UI/UX motion inspiration library, sourced for marquee + spotlight idioms

---

## Recommendation

Approve direction → generate batch 1 of assets in parallel (items 1, 2, 3, 6, 12, 15 from the queue) → land Home + Memorial first as the proof of concept → iterate the remaining four pages once Fritz feels the difference. The single best moment to test is the home-page three-second open on a real phone in a dark room. If that lands, everything else lands.
