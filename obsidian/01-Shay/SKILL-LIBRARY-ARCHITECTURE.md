---
title: SKILL-LIBRARY-ARCHITECTURE
type: note
permalink: famtastic/01-shay/skill-library-architecture
---

# FAMtastic Skill Library — Architecture & Build Plan

**Status:** Reference plan, captured 2026-05-10
**Companion to:** `mbsh_reels_layered_experience_plan.md`
**Anchor:** The discoveries we made building MBSH aren't a hero pattern. They're a *composition system* with multiple recipes. The skill library captures it once so site #1000 inherits every learning from sites #1–999.

---

## 1. The Reframing

The original plan called out one skill: `layered-hero.skill`. That was thinking too small. The architectural unlock we found — layered DOM + animate-with-code + decorative bleed + scroll-driven animation + view transitions + container queries — isn't a hero pattern. It's a *cinematic composition system*. The same primitives serve:

- Heroes (the case we walked through)
- Carousels (Fritz's "cars")
- Slideshows
- Timelines (the scroll-drawn spine in Reel IV)
- Galleries (masonry, lightbox, before/after sliders)
- Cards (sponsor cards, tier cards, alumni cards — the Buddy "breaks corner" pattern is already a card variant)
- Forms (multi-step, layered, cinematically themed)
- Navigation (the medallion menu, persistent marquee)
- Footers (the cinema curtain footer)
- Transitions (curtain wipe, iris in/out, beam fade — all of these are reusable)
- Particle systems (confetti, motes, sparks, light leaks)
- Text reveals (typewriter, scroll-letter, marquee, neon pulse)

That's 12 categories, not one. The skill library needs to cover all of them — and the connecting tissue between them.

---

## 2. The Three-Layer Taxonomy

Skills organize into three layers. The middle layer (Recipes) is what most consumers — Studio, Codex sessions, Cowork prompts — actually invoke. The bottom layer (Primitives) provides the architectural foundation. The top layer (Production) handles the asset pipeline.

```
┌──────────────────────────────────────────────────────────────┐
│  PRODUCTION SKILLS                                            │
│  (asset pipeline — image, video, extraction, animation)       │
│                                                               │
│  image-and-video-gen   asset-extraction   character-pipeline  │
│  veo-animation         vidu-reference     particle-export     │
└──────────────────────────────────────────────────────────────┘
                              ↑
                       generates assets for
                              ↑
┌──────────────────────────────────────────────────────────────┐
│  RECIPE SKILLS                                                │
│  (composable component patterns built on primitives)          │
│                                                               │
│  cinematic-hero        cinematic-carousel    cinematic-slideshow │
│  cinematic-timeline    cinematic-gallery     cinematic-card    │
│  cinematic-form        cinematic-nav         cinematic-footer  │
│  cinematic-transition                                          │
└──────────────────────────────────────────────────────────────┘
                              ↑
                          composed of
                              ↑
┌──────────────────────────────────────────────────────────────┐
│  PRIMITIVE SKILLS                                             │
│  (the architectural patterns — atoms of composition)          │
│                                                               │
│  layered-composition     code-animation     scroll-choreography │
│  view-transitions        decorative-bleed   particle-systems  │
│  character-system        text-reveals       mobile-degradation │
│  accessibility-baseline                                       │
└──────────────────────────────────────────────────────────────┘
```

**Why three layers?**

- **Primitives are stable.** Once `layered-composition.skill` is written, it doesn't change much. CSS evolves, but the architectural idea (independent DOM layers with their own animations and transitions) is durable.
- **Recipes are where invention happens.** A new site needs a new card variant — write a new recipe skill, reuse the primitives.
- **Production is where models change rapidly.** gpt-image-3 ships, Imagen 5 ships, Veo 4 ships — production skills get updated, recipes keep working.

Each layer changes at its own rate, and consumers always invoke recipes (rarely primitives directly, rarely production skills standalone outside Studio).

---

## 3. The Connection to FAMtastic's Existing Component Library

The Component Library system already designed in `STUDIO-V3-BUILD-PLAN.md` is the *implementation* store. The skill library is the *pattern* store. They work together:

| Component Library (`~/famtastic/components/`) | Skill Library (`~/famtastic/skills/`) |
|---|---|
| **Stores instances** of patterns (hero-slider-v2, sponsor-card-v1, etc.) | **Stores patterns themselves** (cinematic-hero.skill, cinematic-card.skill) |
| Has CSS variables, content fields, slots, conversions | Has the architectural rules, decision trees, code templates |
| Versioned per implementation | Versioned per pattern |
| One per site that uses it | One canonical per pattern |
| Owned model (shadcn-style) — copy into the site | Loaded model — referenced by Studio/Codex/Cowork on demand |

**The flow for any new site build:**

1. Studio reads the brief and matches the site's needs against the skill library (the recipes list).
2. For each matched recipe, Studio loads the skill, reads the pattern, and either:
   - Generates a new component instance (saves to `~/famtastic/components/<new-instance>/`) using the recipe's template
   - Imports an existing component instance from the library that matches this site's palette/needs
3. The recipe skill encodes WHEN to generate new vs WHEN to import existing.
4. After the site is built, any successful new component instance gets a record back in the library.

**The library is the inventory. The skill is the playbook.**

The Studio's brain works the same way a chef does: cookbook on the shelf (skills), pantry stocked (components), tonight's dish (the site brief). The chef picks recipes from the cookbook, pulls ingredients from the pantry, and produces dinner.

---

## 4. Skill Format — Anthropic SKILL.md Canonical

Per Anthropic's `skill-creator` SKILL.md, every skill in the library follows this structure:

```
~/famtastic/skills/<skill-name>/
├── SKILL.md (required)
│   ├── YAML frontmatter:
│   │   ├── name: <skill-name>
│   │   ├── description: <when-to-use + what-it-does, slightly "pushy">
│   │   └── compatibility: <optional, tools/dependencies>
│   └── Markdown body (<500 lines ideal)
├── scripts/                   (optional — executable code)
├── references/                (optional — extended docs, loaded as needed)
└── assets/                    (optional — templates, demos, examples)
```

**Progressive disclosure** is the key mental model:

1. **Always in context**: skill name + description (~100 words) — informs Claude/Codex whether to load the skill
2. **Loaded when triggered**: SKILL.md body (<500 lines) — the main playbook
3. **Loaded on demand**: bundled references/scripts/assets — deep dives, code templates, example HTML

Per Anthropic's guidance: descriptions should be *slightly pushy*. Not "How to build a layered hero," but "How to build a layered hero composition for cinematic, distinctive site experiences. Use this skill whenever the user mentions hero sections, landing page heroes, cinematic site openings, or wants any kind of multi-layered visual composition — even if they don't explicitly ask for 'layered.'" This combats the model's tendency to undertrigger skills.

---

## 5. Cross-Platform Format

The FAMtastic skill library serves three consumers:

| Consumer | Skill Format | Storage |
|---|---|---|
| Claude Code | Anthropic SKILL.md | `~/famtastic/skills/` (read directly) |
| Cowork | Anthropic SKILL.md | Same location, same format |
| Codex | Codex Skills format (slightly different YAML conventions) | Generated automatically from canonical SKILL.md |
| Studio's brain (Shay-Shay) | Plain markdown injection into prompt | Generated automatically |

**Approach:** the canonical source is Anthropic SKILL.md. A simple build script (`~/famtastic/skills/_build/sync.js`) generates the Codex variants and the prompt-injection summaries from the canonical source. Single edit, three outputs. This avoids skill drift across platforms.

---

## 6. The Skill Registry / Index

A single index file at `~/famtastic/skills/index.json` (or `.yaml`) lists every skill with:

```json
{
  "skills": [
    {
      "name": "layered-composition",
      "category": "primitive",
      "version": "1.0",
      "description": "Architectural pattern for...",
      "depends_on": [],
      "composed_in": ["cinematic-hero", "cinematic-carousel", "cinematic-slideshow"],
      "status": "stable",
      "added": "2026-05-10",
      "last_used": "2026-05-10"
    },
    {
      "name": "cinematic-hero",
      "category": "recipe",
      "version": "1.0",
      "description": "Builds a layered cinematic hero...",
      "depends_on": ["layered-composition", "code-animation", "scroll-choreography", "decorative-bleed", "character-system", "accessibility-baseline"],
      "composed_in": [],
      "status": "stable",
      "added": "2026-05-10",
      "last_used": "2026-05-10"
    }
  ]
}
```

Studio reads the registry on session start. Skills know their own dependencies. When a recipe is loaded, its primitives auto-load. Versioning travels with each skill independently.

---

## 7. Per-Skill Specs

The catalog. Each skill has a description trigger (the YAML field that decides when it loads) and a scope (what it covers, what it doesn't). Full SKILL.md drafts come in build phases, not in this plan.

### 7.1 Primitive skills (~10 skills)

**`layered-composition`** — *"Build cinematic, distinctive web compositions as independent DOM layers (scene + midground + character + headline + foreground), each with its own animation loop, container-query-responsive scaling, and mouse-tracked parallax. Use whenever building hero sections, layered scenes, or any composition where the user wants depth, separation of subject and background, or animation choreography across multiple visual elements. The pattern survives identity drift and allows independent regeneration of each layer."*
- Reference implementation: `layered_hero_composite_test.html`
- Covers: container queries, `cqw` units, layer ordering, parallax via CSS variables, hover-state-per-layer, debug overlay

**`code-animation`** — *"CSS keyframe animation library for ambient cinematic motion: tungsten flicker, character breath, neon pulse, dust drift, Ken Burns zoom, marquee bulb chase, curtain breath, lamp warmth, ink bleed. Use whenever the user wants ambient motion on static images, characters, or scenes — especially when video generation would be overkill for the desired effect."*
- Bundled assets: `assets/keyframes.css` (the library), `assets/demo.html`
- Covers: irregular timing (no metronome), GPU-friendly transforms, when CSS beats Veo

**`scroll-choreography`** — *"Scroll-driven animation patterns using `animation-timeline: scroll()` and `view()`. Build scroll-spine reveals, scroll-driven parallax, viewport-entry fade-ins, scroll-triggered confetti rain, scroll-drawn SVG timelines, and progressive disclosure layouts. Use whenever the user wants any animation tied to scroll position, page progression, or viewport visibility. Replaces GSAP/ScrollMagic/Intersection Observer for most use cases. Native CSS, compositor-thread, baseline in Chrome/Edge/Safari 18+."*
- Bundled references: `references/timeline-scope.md` (cross-DOM-branch scroll timelines), `references/firefox-fallback.md`
- Covers: `entry/exit/cover/contain` ranges, animation composition with `accumulate`, `prefers-reduced-motion`

**`view-transitions`** — *"Cross-document and same-document View Transitions API for cinematic page navigation. Build curtain wipes, iris in/out, beam fades, marquee morphs, persistent-element transitions. Use whenever the user wants page-to-page navigation that feels like one continuous shot rather than a hard cut, or wants specific elements (logos, marquees, characters) to morph in place across navigations."*
- Covers: `view-transition-name`, `::view-transition-image-pair`, named transitions, `@view-transition { navigation: auto }`

**`decorative-bleed`** — *"Decorative element bleed patterns — elements that extend past their visible container (confetti off-edge, character peeking past frame, marquee bleeding into page header). The CSS pattern is `grid-template-columns: 1fr min(content, 100%) 1fr` with `.bleed { grid-column: 1 / -1 }` plus `overflow: visible` selective parents. Use whenever the user describes a 'breaking out of the frame' aesthetic, decorative elements that escape their container, or anything that should feel like it's not contained by a normal rectangle."*
- References print-design "full bleed" terminology so AI can match user vocabulary
- Covers: negative margins, `overflow: clip` vs `hidden`, the Buddy-corner-peek pattern

**`particle-systems`** — *"Particle effects for ambient motion: dust motes drifting in light beams, confetti falling, snow accumulating, ember sparks rising, light leaks, fog wisps. Multiple implementation tiers: pure CSS (background-position drift, cheapest), SVG (better edges), Canvas (highest quality, mobile-expensive). Use whenever the user wants atmospheric particle motion. Includes mobile degradation tiers per system."*
- Bundled scripts: `scripts/particle-canvas.js`, CSS recipes
- Covers: density per device, performance budgets, `mix-blend-mode: screen` for light effects

**`character-system`** — *"Mascot/character integration patterns: transparent PNG positioning in `cqw` units, breath loops, occasional gesture loops (wave, point, tilt), hover-state lift, multi-pose libraries with src swap, character on different pages with consistent identity. Use whenever the site has a brand mascot (Hi-Tide Harry, Buddy, Auntie Gale, future mascots) that needs to appear across multiple pages with cohesive personality and motion."*
- Bundled references: `references/breath-patterns.md`, `references/gesture-loops.md`
- Covers: pose-anchor patterns, hover behavior, character-position decision tree

**`text-reveals`** — *"Cinematic text animation patterns: typewriter on landing, letter-by-letter scroll reveal, marquee letter-board replacement, neon pulse, gold-leaf shimmer, kerning-reveal. Use whenever the user wants headline typography that animates in or pulses, especially for cinematic, vintage-cinema, or expressive-typography aesthetics."*
- Covers: `sibling-index()` for stagger, `@starting-style` for one-shot entrance, neon `text-shadow` keyframes

**`mobile-degradation`** — *"Matinee tier — the rules for downgrading desktop cinematic compositions to mobile-friendly versions without losing brand feel. Save-Data header check, `navigator.connection.effectiveType` fallback, `prefers-reduced-motion`, asset format pipeline (WebP/AVIF over PNG), particle count reduction via container queries, video-to-poster swap, simplified SVG filters. Use whenever building any cinematic component — mobile is THE audience, not the afterthought."*
- Bundled references: `references/breakpoint-matrix.md`, `references/save-data-detection.md`
- Covers: the layered architecture's natural degradability per layer

**`accessibility-baseline`** — *"Baseline accessibility requirements: `prefers-reduced-motion` (disable loops, parallax, video autoplay → poster), keyboard navigation through layered components, screen reader patterns for visual scenes (`aria-label` summarizing the hero), focus management across view transitions, color contrast verification. Use whenever building any UI component. Non-negotiable. WCAG 2.1 baseline."*
- Bundled references: `references/wcag-checklist.md`, `references/reduced-motion-snippets.css`

### 7.2 Recipe skills (~10 skills)

**`cinematic-hero`** — *"Build a cinematic site hero using layered composition: scene (image or video) + midground (atmosphere/motes/grain) + character (transparent mascot in cqw) + headline (cinematic typography) + foreground (vignette/film grain). Supports parallax, hover states, scroll-driven Ken Burns, decorative bleed (character peeking past edge, light glow extending into next section), view-transition-named for cross-page persistence. Use whenever the user wants a hero section, landing page opening, or any large-scale visual composition at the top of a page. Especially when phrases like 'cinematic,' 'immersive,' 'film-like,' or specific theme references ('premiere,' 'vintage cinema,' 'theatrical') appear."*
- Composes: layered-composition, code-animation, scroll-choreography, decorative-bleed, character-system (optional), text-reveals, mobile-degradation, accessibility-baseline
- Reference implementation: `layered_hero_composite_test.html`
- Variants: full-bleed 100vh (home), constrained 60-70vh (interior pages), with-character / without-character

**`cinematic-carousel`** — *"Build a CSS-first carousel using `scroll-snap-type` + `::scroll-button` + `::scroll-marker` (CSS Overflow Level 5, baseline in Chrome 135+, fallbacks for Safari/Firefox), enhanced with scroll-driven animations for Cover-Flow-style depth, layered character peek (mascot reacting to current slide), and view-transition between slides. No JavaScript carousel library required. Use whenever the user wants horizontal image galleries, slide-through content, testimonial rotators, product galleries, sponsor wall, or any 'cards in a row' pattern — even if they don't say 'carousel' specifically."*
- Composes: layered-composition, scroll-choreography, view-transitions, code-animation, character-system (optional), accessibility-baseline, mobile-degradation
- Variants: Film-Strip (35mm reel aesthetic), Cover-Flow (Apple-style 3D tilt), Marquee-Row (horizontal text marquee), Stage-Walk (slides arrive from stage-left)
- Saves 40-140KB JS bundle vs Swiper/Embla

**`cinematic-slideshow`** — *"Full-screen or section-sized slideshow with cinematic transitions between slides: iris in/out, curtain wipe, beam fade, dissolve, marquee replacement. Combines View Transitions API with scroll-snap for full-page slideshow, or with timer-based advancement for auto-play. Use whenever the user wants a stacked slideshow, image story sequence, full-screen photo rotation, archive presentation, or 'series of cinematic moments.'"*
- Composes: scroll-choreography, view-transitions, code-animation, particle-systems (optional), accessibility-baseline, mobile-degradation
- Variants: Iris-Transition, Stage-Curtain, Marquee-Letter-Board, Film-Strip (vertical), Dissolve

**`cinematic-timeline`** — *"Vertical scroll-spine timeline: SVG path that scroll-draws as the user travels through decades/milestones/events. Decade markers light up via `animation-timeline: view()` as they enter the viewport. Optional photo cards with cinematic film-strip aesthetic. Use whenever the user wants 'through the years,' 'our history,' 'milestones,' 'roadmap,' 'archive scroll,' or any time-based progression visualization."*
- Composes: scroll-choreography, layered-composition, decorative-bleed, code-animation, accessibility-baseline, mobile-degradation
- Reference variant for MBSH: Reel IV — Through-Years

**`cinematic-gallery`** — *"Image gallery patterns with cinematic treatment: masonry grid with hover-zoom, lightbox with curtain transition, before/after slider with film-strip dividers, archive grid with film-grain overlay. Use whenever the user wants any image gallery, photo wall, archive browser, or visual library."*
- Composes: layered-composition, view-transitions, code-animation, scroll-choreography, accessibility-baseline, mobile-degradation
- Variants: Masonry, Lightbox-with-Curtain, Before-After-Slider, Archive-Grid

**`cinematic-card`** — *"Card patterns with cinematic personality: badge that breaks the top corner (Buddy-style), character peek from edge, gradient bleed past container, hover-tilt with 3D perspective, ticket-stub-shape via clip-path. Use whenever the user wants product cards, tier cards, sponsor cards, alumni cards, profile cards, or any content card that should feel more like a film prop than a Bootstrap rectangle."*
- Composes: layered-composition, decorative-bleed, code-animation, character-system (optional), accessibility-baseline
- Variants: Ticket-Stub, Badge-Corner-Break, Character-Peek, 3D-Tilt, Film-Frame

**`cinematic-avatar`** — *"Build cinematic small-canvas character portraits for chatbots, profile cards, presenter intros, host cards. Same layered DOM architecture as `cinematic-hero` but at 80–120px scale: frame + scene + portrait + shine + status indicator, each as an independent layer. Frame variants include marquee bulb ring (sequential bulb-chase that doubles as listening/speaking/idle status indicator), gilt portrait frame, iris vignette, film canister edge, ticket stub, spotlight cone. Use whenever the user wants a chatbot avatar, mascot portrait, host card, profile photo with personality, or any character display under ~150px that needs to feel composed rather than slapped-on."*
- Composes: layered-composition, code-animation, decorative-bleed, character-system, accessibility-baseline
- Variants: Marquee-Bulb-Ring (default MBSH style), Gilt-Portrait-Frame, Iris-Vignette, Film-Canister, Ticket-Stub, Spotlight-Cone
- Reference implementation: Hi-Tide Harry chatbot avatar in MBSH
- **The "flex":** same primitive composition recursing at 1/15 scale. Demonstrates the architecture is canvas-agnostic.

**`cinematic-form`** — *"Form patterns with cinematic personality and clean usability: label morphing, field focus animations, success/error states with character reactions, multi-step flows with curtain transitions between steps, in-form micro-illustrations. Use whenever the user wants any form (contact, RSVP, registration, submission, signup, capsule message) — make it feel like writing in a 1920s ledger, not filling a spreadsheet."*
- Composes: layered-composition, code-animation, view-transitions, text-reveals, character-system (optional), accessibility-baseline (esp. for form a11y), mobile-degradation
- Variants: Single-Step, Multi-Step-with-Transitions, Inline-Edit, Conversational
- **High priority** for MBSH (current form readability fix is bare-minimum; this skill is the full treatment)

**`cinematic-nav`** — *"Navigation patterns: medallion-as-hamburger menu (the FAMtastic-confirmed brand-mark-as-menu pattern), persistent marquee header with view-transition-shared name across pages, expanding side drawer with cinematic curtain reveal, footer-as-credits-roll. Use whenever building site navigation — header, footer, side menus."*
- Composes: layered-composition, view-transitions, code-animation, accessibility-baseline (esp. keyboard nav and screen reader nav landmarks)
- Variants: Medallion-Menu, Marquee-Header, Credits-Footer, Side-Drawer

**`cinematic-footer`** — *"Footer patterns with cinematic personality: credits-roll style (text scrolling like end-of-film), brass-railing divider, footlight-bulb-chase border, sponsor wall with film-strip aesthetic, social-icons-as-marquee-bulbs. Use whenever building site footer — the last act of every page."*
- Composes: layered-composition, code-animation, decorative-bleed, accessibility-baseline

**`cinematic-transition`** — *"Page-to-page transition library: curtain wipe (center-out close, center-in open), iris in/out (circular reveal), beam fade (light extinguishing), marquee morph (text replacing), ink bleed (organic stain), film-frame-cut (hard cinematic cut), dissolve (cross-fade). Each transition is a named CSS recipe usable with View Transitions API or as standalone keyframes. Use whenever the user wants distinctive page navigation that feels cinematic rather than instant."*
- Composes: view-transitions, code-animation, accessibility-baseline (must respect reduced-motion)
- Bundled assets: `assets/transition-library.css` (~15 named transitions)

### 7.3 Production skills (~5 skills)

**`image-and-video-gen`** — *"Image and video generation cookbook + model selection matrix: gpt-image-2 (photorealism, lighting variants, in-image text — $0.17/img), Imagen 4.0 (broad iteration, character pose work — $0.004/img, 40x cheaper), Veo 3.1 Lite (ambient scene motion — $0.05/sec), Vidu Q3 Turbo (Reference-to-Video for character animation with identity locking — $0.034/sec, supports up to 7 reference images). Includes the known gotchas: gpt-image-2 doesn't accept `input_fidelity` (cookbook code examples are stale on this), gpt-image-2 returns base64 by default (no `response_format` needed), character anchor patterns, style transfer patterns. Use whenever the user needs to generate hero imagery, character poses, ambient video loops, lighting variants, or any AI-generated visual asset for a FAMtastic site."*
- Bundled references: `references/cookbook-mirror.md` (mirrored OpenAI cookbook for offline use), `references/model-decision-tree.md`, `references/known-gotchas.md`
- Bundled scripts: `scripts/imagen.py`, `scripts/gpt-image.py`, `scripts/veo.py`, `scripts/vidu.py` — paste-ready callers

**`asset-extraction`** — *"Transparent character extraction pipeline: generate on opaque white background → BiRefNet alpha matting → clean transparent PNG with no halos, color bleed, or fringe. Backup: rembg with `isnet-general-use` model. Includes the `background='transparent'` native parameter check (often returns baked checkerboard pattern — verify alpha channel before trusting). Use whenever the user needs a character or product extracted for layering. Required upstream for any layered-composition skill that uses transparent character PNGs."*
- Bundled scripts: `scripts/extract-character.py` (the canonical pipeline)

**`character-pipeline`** — *"End-to-end character pose generation pipeline: multi-image reference anchoring, pose-specific prompts, identity preservation across pose set, transparent extraction, naming convention for pose library. Designed for any FAMtastic mascot: Harry, Buddy, Auntie Gale, future mascots. Use whenever the user needs a new pose for an existing character, a new character introduced to the system, or a full pose set for a new mascot."*
- Composes (production-side): image-and-video-gen, asset-extraction
- Bundled references: `references/pose-vocabulary.md` (canonical pose names + briefs)

**`veo-animation`** — *"Veo 3.1 Lite image-to-video pipeline for ambient scene motion: candle flame flicker, dust drift, curtain breath, slow zoom, weather, water. Includes the 'camera completely still — locked tripod' prompt convention, audio-off for hero loops, 8-second max per generation with ffmpeg crossfade-loop encoding, WebM + MP4 dual encode, poster fallback. Use whenever code-animation can't fake the motion (organic physics, real flame, true fluid dynamics) but the asset is scene-level, not character-level."*
- Bundled scripts: `scripts/veo-loop.py` (gen + ffmpeg post-process)

**`vidu-reference`** — *"Vidu Q3 Reference-to-Video pipeline for character animation with identity locking — feed 2–7 character reference images, the model maintains identity across the entire generated clip. Use whenever code-animation isn't enough for a character motion and Veo's single-frame image-to-video would drift the character. The right tool for 'Harry waving in the lobby' style shots where the photoreal mascot needs to do something specific."*
- Bundled scripts: `scripts/vidu-reftovideo.py`

---

## 8. Cinematic Carousel — Worked Case Study

To prove the recipe-composes-primitives model, here's a worked example of how `cinematic-carousel` would actually look. (Full SKILL.md drafts come during build phases — this is illustrative.)

### Composition

```
cinematic-carousel
├── layered-composition         → each slide has scene + character + headline layers
├── scroll-choreography         → animation-timeline: view() for Cover-Flow tilt
├── view-transitions            → curtain wipe between slides on dot-click
├── code-animation              → ambient slide motion (Ken Burns drift on focused slide)
├── character-system            → optional: Harry/Buddy reacts to which slide is focused
├── accessibility-baseline      → keyboard arrow keys, ARIA, focus management
└── mobile-degradation          → simpler scroll-snap-only on touch, no Cover-Flow tilt
```

### Three variants the skill offers

| Variant | Best for | Visual |
|---|---|---|
| **Film-Strip** | Archive content, year-by-year reels, photo browsing | Horizontal strip of 35mm film frames, central one highlighted, edges fade to vignette |
| **Cover-Flow** | Featured content, product showcase, hero rotators | Apple-style 3D tilt — front slide flat, side slides angled in perspective |
| **Stage-Walk** | Testimonials, "meet the team" rotators, sequenced content | Slides arrive from stage-left, exit stage-right, with curtain wipe between |

### The CSS skeleton (Film-Strip variant)

```css
.carousel {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 70%;
  gap: 2rem;
  overflow-x: scroll;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  scroll-marker-group: after;        /* generates dot indicators */
  container-type: inline-size;
}
.carousel > .slide {
  scroll-snap-align: center;
  view-timeline: --slide;
}
.carousel > .slide::scroll-marker {
  content: '';                       /* native dot indicator */
  /* …styled like a film perforation hole */
}
.carousel::scroll-button(left)  { content: '◀'; /* …vintage chevron */ }
.carousel::scroll-button(right) { content: '▶'; }

/* Cover-Flow-style depth */
.slide img {
  animation: coverflow linear;
  animation-timeline: view();
}
@keyframes coverflow {
  entry 0%        { transform: rotateY( 45deg) scale(0.7); opacity: 0.4; }
  cover 50%       { transform: rotateY(  0deg) scale(1.0); opacity: 1.0; }
  exit  100%      { transform: rotateY(-45deg) scale(0.7); opacity: 0.4; }
}

@media (prefers-reduced-motion: reduce) {
  .slide img { animation: none; transform: none; }
}
```

**Zero JavaScript.** Native CSS Overflow Level 5 + Scroll-Driven Animations. Saves 40–140KB vs Swiper/Embla. Compositor-thread. Mobile-friendly by default.

The SKILL.md would walk Claude/Codex through: when to pick which variant, how to vary per breakpoint, which character poses to layer in (for character-system composition), how to handle pause-on-hover (requires a tiny JS layer — documented), accessibility requirements (ARIA roles, keyboard nav).

---

## 9. Build Sequence

Five phases. Each unblocks the next.

### Phase A — Foundation Primitives (Build first)

Without these, recipes have nothing to stand on.

| # | Skill | Notes |
|---|---|---|
| A1 | `layered-composition` | Reference impl already exists (`layered_hero_composite_test.html`) — extract patterns, write SKILL.md |
| A2 | `code-animation` | CSS keyframes library — extract from the demo + the MBSH plan, organize into `assets/keyframes.css` |
| A3 | `accessibility-baseline` | WCAG checklist, reduced-motion snippets — borrow from existing accessibility patterns |
| A4 | `mobile-degradation` | The matinee-tier doc from MBSH plan — formalize as skill |

Phase A delivers 4 skills, ~1 day of focused work. After Phase A, primitives exist. Recipes can reference them.

### Phase B — First Three Recipes (Prove the model)

| # | Skill | Notes |
|---|---|---|
| B1 | `cinematic-hero` | Highest-value first — unblocks the MBSH Wave 2 work directly |
| B2 | `cinematic-carousel` | Validates that the recipe pattern works for non-hero patterns |
| B3 | `cinematic-form` | Validates that the recipe pattern works for functional UI (not just decorative) |

Phase B delivers 3 recipes. The MBSH build can proceed *using these skills* (Wave 2 of the reels plan).

### Phase C — Production Skills (Asset pipeline)

| # | Skill | Notes |
|---|---|---|
| C1 | `image-and-video-gen` | Cookbook + model matrix — the most reused skill, lives in every future site |
| C2 | `asset-extraction` | Transparent character pipeline — required upstream for any character-system use |
| C3 | `character-pipeline` | End-to-end pose generation — composes C1 + C2 |

Phase C delivers 3 production skills. Combined with Phase A+B, this is the **minimum viable skill library** for FAMtastic Studio. Eight skills total, ~2-3 days of focused work.

### Phase D — Remaining Primitives

| # | Skill |
|---|---|
| D1 | `scroll-choreography` |
| D2 | `view-transitions` |
| D3 | `decorative-bleed` |
| D4 | `particle-systems` |
| D5 | `character-system` |
| D6 | `text-reveals` |

Phase D delivers 6 more primitives. These cover the rest of the architectural patterns we discovered. Some primitives could ship earlier (in Phase A) if specific MBSH reels need them sooner; this phase is about getting the *complete* primitive set into the library.

### Phase E — Remaining Recipes

| # | Skill |
|---|---|
| E1 | `cinematic-slideshow` |
| E2 | `cinematic-timeline` |
| E3 | `cinematic-gallery` |
| E4 | `cinematic-card` |
| E5 | `cinematic-avatar` |
| E6 | `cinematic-nav` |
| E7 | `cinematic-footer` |
| E8 | `cinematic-transition` |
| E9 | `veo-animation` (production) |
| E10 | `vidu-reference` (production) |

Phase E delivers the remaining 10 skills. This is where the library becomes truly comprehensive — every common cinematic UI pattern has a recipe.

### Total scope

| Phase | Skills | Cumulative | Estimated time |
|---|---|---|---|
| A | 4 | 4 | ~1 day |
| B | 3 | 7 | ~1 day |
| C | 3 | 10 | ~0.5 day |
| D | 6 | 16 | ~1.5 days |
| E | 10 | 26 | ~2 days |
| **Total** | **26** | | **~6 days** |

Six days of focused skill authoring buys FAMtastic a complete cinematic UI vocabulary that scales to every future site in the 1000-site factory.

---

## 10. Integration With Studio's Brain

How does Studio's `Shay-Shay` brain actually use the skill library at build time?

```
Site brief arrives
       ↓
Shay-Shay reads brief
       ↓
Query skills/index.json:
  "Brief mentions 'hero,' 'gallery,' 'timeline'"
  → Match recipes: cinematic-hero, cinematic-gallery, cinematic-timeline
       ↓
Resolve dependencies:
  cinematic-hero  → loads layered-composition, code-animation,
                    scroll-choreography, decorative-bleed,
                    character-system, accessibility-baseline,
                    mobile-degradation
  cinematic-gallery → loads layered-composition, view-transitions,
                       code-animation, ...
       ↓
Load all skill SKILL.md files (progressive disclosure)
       ↓
Inject relevant skill content into the build prompt:
  "When you build the hero, follow cinematic-hero.skill."
       ↓
Claude Code / Codex generates the site, applying skill rules
       ↓
Successful component instances saved to ~/famtastic/components/
       ↓
Skill registry updates last_used timestamps
```

The skill library and the component library work as a unit: **patterns flow down, instances flow back up.**

---

## 11. Concrete Starting Point — Build These Three First

If we only had one afternoon, these three skills give the biggest leverage:

1. **`layered-composition`** (primitive) — captures the architectural unlock we just discovered. Without it, every future site relearns it. With it, every future site inherits it. Highest leverage. Reference implementation already exists.

2. **`image-and-video-gen`** (production) — captures every cookbook learning, gotcha, model matrix, and pricing decision from the v1 + v2 + v2.1 tests we ran today. Without it, every future asset-generation session re-discovers `input_fidelity` is disabled and re-decides Imagen vs gpt-image-2. With it, future sessions never make that mistake.

3. **`cinematic-hero`** (recipe) — validates the three-layer model end-to-end. Composes #1 + several other primitives. Once this skill exists and Studio successfully builds a hero from it, the rest of the recipe pattern is proven.

These three power the MBSH Wave 2 build directly, AND they prove the architecture before scaling to 26 skills.

---

## 12. The Bigger Picture

Where this lands FAMtastic:

- **Today** (May 10, 2026): one site (MBSH) being built with patterns discovered live. Everything is in our heads or in markdown plans.
- **After Phase A+B+C** (week +1): eight skills shipped. The next site Studio builds (any site, not just MBSH) starts with the full cinematic UI vocabulary loaded. No re-discovery.
- **After Phase D+E** (week +2): 26 skills shipped. The cinematic UI taxonomy is *complete*. Studio can build any common cinematic component pattern by composing primitives via recipes.
- **At site #100** (Q4 2026): the skill library has been battle-tested across 100 different site contexts, theme variants, and content shapes. Each skill has accumulated edge-case knowledge. Studio's brain references the library on every build, no humans needed for pattern decisions.
- **At site #1000** (target horizon): every pattern works. Every learning from sites 1-999 lives in the skill library or the component library. New sites compile.

That's the FAMtastic philosophy applied to the skill layer — site #1000 benefits from everything learned on sites #1-999. Not because Fritz remembered it. Because the system did.

---

## 13. Next Concrete Action

1. **Save this doc** to `~/famtastic/skills/_planning/skill-library-architecture-and-build-plan.md`
2. **Create the skill library directory structure**:
   ```
   ~/famtastic/skills/
   ├── _planning/   (this doc + future planning)
   ├── _build/      (the cross-platform sync script when we write it)
   ├── index.json   (empty registry)
   └── (per-skill directories as they're built)
   ```
3. **Build Phase A skills** (4 primitives) as a focused Cowork session — reference the existing `layered_hero_composite_test.html` and `mbsh_reels_layered_experience_plan.md` as source material
4. **Build Phase B skills** (3 recipes) — first one is `cinematic-hero`, validates against the MBSH Wave 2 build
5. **Build Phase C skills** (3 production) — captures all v1+v2+v2.1 cookbook learnings before they fade
6. **Wire skill registry** to Studio's Shay-Shay brain — single index.json read on session start

That's the build plan. The skill library becomes the canonical place where every FAMtastic architectural learning lives. The component library is where every implementation instance lives. Together they're the brain of the factory.