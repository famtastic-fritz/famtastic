# MBSH Reunion — Premiere Detailed Design Map

**Status:** Decision document. Concrete spec for every section. No code.
**Captured:** 2026-05-07
**Companion to:** `PREMIERE-EXPERIENCE-V3-PLAN-2026-05-07.md` (Production Protocol — approved)
**Authority chain:** V2 (creative direction, per-page treatment, acceptance criteria) → V3 (production protocol, gate to implementation) → **THIS DOC** (concrete section-level decisions)

---

## ⛔ STOP CONDITION

> **No code. This document and the multi-pass pipeline below are the exit gate from planning. Implementation does not begin until this Design Map is approved AND V3 §8 open decisions are closed.**

---

## 0. Multi-Pass Build Pipeline

Eight passes. Each pass has scope, deliverables, dependencies, and exit criteria. **Implementation may not start a pass until the previous pass exits cleanly.** No silent stubs — every assigned section ships in its assigned pass OR is explicitly deferred with reason in the closeout.

### Pass 0 — Setup / Architecture

| | |
|---|---|
| **Scope** | Z-layer architecture documented; feature-flag mechanism verified; new file scaffolds created (no rules yet); preview/dev workflow confirmed |
| **Deliverables** | Updated `premiere.css` header comment with z-layer table; empty placeholder rules for the 8 layers; `premiere.js` init reorganized into named sections; new asset directory `frontend/assets/premiere/` confirmed; preview server working; `git checkout feat/premiere-theme` confirmed at `1386d17` baseline |
| **Dependencies** | None — fresh start point |
| **Exit criteria** | `body[data-premiere="on"]` toggling does nothing visible (placeholders are no-op); preview server renders unchanged; smoke 7/7 still green |

### Pass 1 — Reusable Structure

| | |
|---|---|
| **Scope** | Build the components used across multiple pages: golden filmstrip frame, ribbon divider, medallion-as-menu shell, snap mechanism, Harry usher upgrade (walk + peek + celebrate vocabulary), per-page stage backdrop slot |
| **Deliverables** | `.premiere-frame` component (SVG `<symbol>` + CSS), `.premiere-divider` component, `.premiere-medallion-menu` shell + radial expand JS, `body[data-premiere="on"][data-snap="on"]` snap-mandatory + scrollend bounce, `.premiere-usher` walk/peek/celebrate CSS classes + JS triggers, removed top nav + edge film strips |
| **Dependencies** | Pass 0 complete |
| **Exit criteria** | Components testable on a sandbox HTML page; medallion menu opens/closes/keyboard-accessible; one section on home demonstrates frame-around-section pattern; preview-verified; smoke 7/7 still green |

### Pass 2 — Existing Assets Only

| | |
|---|---|
| **Scope** | Ship every section that does NOT need a missing pose or new image. Use only the existing 10 Harry poses + 5 backdrop MP4s + 7 era JPGs + brand mark |
| **Deliverables** | Home (all sections, with closest-existing pose fallbacks for Harry-Forever and Harry-Cards); Memorial (no Harry, complete); RSVP form section + Why-This-Night (no Harry-seated needed for these specifically); Tickets tier section (foil shimmer in use); Capsule prompts mini-cards; Playlist tracklist + About-the-soundtrack |
| **Dependencies** | Pass 1 complete |
| **Exit criteria** | Pages render with explicit pose fallbacks marked in CSS comments; no missing-asset placeholders left as red squares; preview tour by Fritz; smoke 7/7 still green |

### Pass 3 — Missing Asset Generation

| | |
|---|---|
| **Scope** | Generate the 13 missing Harry poses (§3 register) + 4 backdrop images (RSVP cinema seats, Tickets red carpet, Through-Years projector, Capsule desk) + 3 raster assets (velvet curtain, tier medallions, brand-mark foil) |
| **Deliverables** | All assets in `frontend/assets/premiere/` and `frontend/assets/mascot/11-23.png`; SVGOptimized SVGs; quality-passed PNGs (≤300KB each); Fritz approval per asset |
| **Dependencies** | Pass 2 complete + Gemini API key restored (GAP-2026-05-05-03) OR alternative tool authenticated (Adobe Firefly) OR Fritz commissions |
| **Exit criteria** | Every missing-asset row in the asset register either has a delivered file path OR an explicit `DEFERRED` marker with the chosen fallback. Approval log filed. |

### Pass 4 — Asset Integration

| | |
|---|---|
| **Scope** | Swap CSS placeholders for real assets; wire new Harry poses into per-page choreography map; add backdrop images per page; hook tier medallions into `.tier-card` |
| **Deliverables** | Updated `premiere.css` referencing real asset paths; updated `premiere.js` `POSE_MAP` and section-trigger map for new poses; per-page backdrop CSS rules pointing at `bg-<page>.jpg`; hero/tickets/capsule/playlist all visually upgraded |
| **Dependencies** | Pass 3 complete (or partial with explicit fallbacks for any deferred asset) |
| **Exit criteria** | No CSS gradient placeholder remains where a real asset was supposed to land (or fallback explicitly marked); all pose swaps visible in preview tour; smoke 7/7 still green |

### Pass 5 — Motion Polish

| | |
|---|---|
| **Scope** | Refine typography stagger timing, snap-bounce cadence, Harry walk easing, marquee chase tempo, curtain rise timing, page-transition smoothness, hover/focus motion polish |
| **Deliverables** | Updated keyframe timings + easings; consolidated motion grammar variables; cinema countdown leader; "MBSH presents" curtain title polished; Allura draw-on for Memorial title |
| **Dependencies** | Pass 4 complete |
| **Exit criteria** | Sit with the site for 5 min on a phone; no animation feels jarring or over-eager; reduced-motion still works flawlessly |

### Pass 6 — QA / Accessibility / Performance

| | |
|---|---|
| **Scope** | Lighthouse mobile + desktop runs; real-device QA (iPhone + Android); reduced-motion + reduced-data walk-through; screen-reader audit (VoiceOver + TalkBack); keyboard nav full tour; iOS Safari scroll-snap-mandatory verification; color-contrast audit |
| **Deliverables** | Lighthouse report (all pages, mobile, ≥85 perf / ≥95 a11y target); accessibility findings list (closed or accepted); device test matrix proof |
| **Dependencies** | Pass 5 complete |
| **Exit criteria** | Lighthouse targets met or single-page exceptions documented; no a11y blockers; iOS scroll-snap behaves OR falls back gracefully to proximity; smoke 7/7 still green |

### Pass 7 — Final Review / Ship

| | |
|---|---|
| **Scope** | Merge `feat/premiere-theme` to `staging` branch → Netlify staging deploy preview → committee preview tour → address blockers → merge to `main` → smoke + monitoring |
| **Deliverables** | Netlify staging preview URL (auto on push); committee feedback log; final blockers addressed; merge to main; production smoke 7/7 green; SITE-LEARNINGS + CHANGELOG + FAMTASTIC-STATE updated; closeout packet filed |
| **Dependencies** | Pass 6 complete |
| **Exit criteria** | Production prod smoke green; deferred items logged in closeout; FAMtastic Plan Closeout Rule satisfied |

---

## 1. Global / Site-Wide Treatments

These components are referenced by per-page sections below. Defined once here.

### 1.1 Z-layer architecture (Pass 0)

| Layer | z-index | Element | Pointer events |
|---|---|---|---|
| **L0** | -2 | `.premiere-stage` (fixed page-themed backdrop) | none |
| **L1** | 50 | `.premiere-fx` (grain + light leak + vignette overlay) | none |
| **L2** | 1–10 | Page content (sections, frames, forms, text) | normal |
| **L3** | 11 | `.premiere-divider` (golden ribbon between sections) + `.premiere-frame` (frame around sections) | none |
| **L4** | 40 | `.premiere-usher` button (Harry) + page-specific peek instances | normal on Harry only |
| **L5** | 60 | `.chatbot__panel` (when open) | normal |
| **L6** | 70 | `.premiere-medallion-menu` (when expanded) | normal |
| **L7** | 9999 | `.premiere-curtain` (page-transition curtain, sessionStorage-once on home) | none |

### 1.2 Premiere FX overlay (Pass 1, kept from current ship)

Single fixed div, multiple background layers consolidated into one paint. Grain SVG noise + warm light-leak radial + soft vignette. Mix-blend-mode overlay, opacity 0.55 default, 0.35 on memorial. Animated background-position drift on grain (compositor only). Disabled by `prefers-reduced-motion` and `prefers-reduced-data`.

### 1.3 Starfield (Pass 2, retained but scoped)

CSS multiple radial-gradients on a fixed div. Visible **only** on `home` and `memorial` (V3 decision — toned down from V1's everywhere-pages). Twinkle via opacity keyframe. ~80 stars, no canvas, no rAF.

### 1.4 Stage backdrop slot (Pass 1, content per page in Pass 2 + Pass 4)

Empty `.premiere-stage` div at L0, auto-injected by `premiere.js`. Content per page:

| Page | Pass 2 (CSS-only fallback) | Pass 4 (with real asset) |
|---|---|---|
| Home | Existing dancefloor video stays in hero; backdrop is gradient bloom | Same — hero video carries it |
| RSVP | CSS scarlet/dusk gradient | `bg-rsvp.jpg` (cinema seats receding) |
| Tickets | CSS red carpet gradient | `bg-tickets.jpg` (red carpet runway) |
| Through-Years | CSS sepia hallway gradient | Existing `02-rebuilt-school-push-in.mp4` (loops behind) OR `bg-through-years.jpg` |
| Memorial | Night-sky black + starfield (no animation) | Same — moon SVG can be added |
| Capsule | Wood + parchment CSS gradient | `bg-capsule.jpg` (desk + lamp glow) |
| Playlist | Spotlight pools CSS gradient | Optional `bg-playlist.jpg` |

Drift animation on stage layer (60s ease-in-out alternate). Gated on reduced-motion + reduced-data.

### 1.5 Golden filmstrip frame component (Pass 1)

SVG `<symbol id="premiere-frame">` defined once in each HTML head (or in a shared partial). Inline `<svg><use href="#premiere-frame"></use></svg>` per section that needs framing. Sprocket holes as actual cutouts. Gold gradient for body (highlight + midtone + shadow band). 12px border thickness on desktop, 6px mobile. Sized by container with `width: 100%; height: 100%`.

### 1.6 Ribbon divider component (Pass 1)

Inline `<svg>` between sections. Flowing golden ribbon with sprockets, ~80px tall desktop, 48px mobile. Drop shadow for depth. Optional gentle hover-shimmer (sweep gradient). Decorative only — `aria-hidden="true"`.

### 1.7 Medallion-as-menu (Pass 1)

Replaces top nav. Brand-mark-sized `<button>` with the existing brand-mark SVG/PNG inside. Position: bottom-center on `data-page="home"`, top-right on inner pages. On click → expands into a radial menu with 7 destinations (`<a>` elements positioned around a circle with `transform: rotate() translateY(-r)`). Each menu item is a small framed plate (mini movie poster) with destination label. Esc / click-outside collapses. Focus trap when open. `prefers-reduced-motion` makes the expand instant. Replaces both the V1 top nav AND the existing compass-nav medallion (compass-nav hidden by premiere.css).

### 1.8 Harry usher (Pass 1 upgrade from current ship)

Existing real `<button class="premiere-usher" aria-label="Open Hi-Tide Harry — your reunion assistant">`. Pose-swap on section IO retained. Expanded vocabulary classes:

- `.premiere-usher.is-walking` — `translateX` keyframe (desktop only)
- `.premiere-usher.is-peeking` — `translateX` slide-in/out from offscreen
- `.premiere-usher.is-celebrating` — scale-pulse + scarlet glow + cheer pose 800ms hold
- `.premiere-usher.is-stepping-back` — fade to opacity 0.5, smaller scale
- Memorial page: usher hidden entirely (existing rule kept)

Click → `#chatbot-toggle.click()` (existing) opens chatbot panel. All decorative peek instances elsewhere on the page are separate hidden imgs with `aria-hidden="true"`, `pointer-events: none`.

### 1.9 Page-transition curtain (Pass 5, kept)

`.premiere-curtain` injected by JS on first home visit per session. Velvet wipe + "MBSH presents" Allura overlay. 1.2s total. sessionStorage-gated (`premiere_curtain_seen=1`). Reduced-motion → curtain hidden entirely.

### 1.10 Snap mechanism (Pass 1)

`html[data-premiere-snap="on"] { scroll-snap-type: y mandatory }` on Home + Through-Years (only pages where snap-stop adds value). `scroll-snap-align: start` on each section. JS listens for `scrollend` (with 150ms debounce fallback for browsers without it), adds `.is-snapped` class to the snapped section which triggers a 600ms bounce keyframe. iOS Safari fallback: `proximity` if `scrollend` unsupported AND `webkit-overflow-scrolling: touch` momentum present (detect via UA + feature).

### 1.11 Removed in Pass 1

- Top nav bar (replaced by medallion menu)
- Edge film strips on viewport (`body::before`, `body::after`) — replaced by frame + divider components
- "Compass" text label baked in compass markup (override `.compass-nav__label { display: none }`)
- `.is-visible` snap-in bounce class — replaced by real scroll-snap event

### 1.12 Animated typography catalog (Pass 5)

| Treatment | Class | Use | Reduced-motion fallback |
|---|---|---|---|
| Letter-by-letter reveal | `.premiere-type-stagger` | Hero, page-header titles | Final state instantly |
| Script draw-on | `.premiere-type-drawon` | Allura "MBSH presents", "In Memory", "Encore" | Final state instantly |
| Metallic shimmer mask | `.premiere-type-shimmer` | Hero CTA, tagline | Static gradient |
| Tracking tighten | `.premiere-type-tighten` | Section titles entering view | Final state instantly |
| Blur-to-focus | `.premiere-type-focus` | Hero glyph entrance | Sharp instantly |
| Countdown leader | `.premiere-leader` | RSVP + Through-Years intro | First era shown immediately |
| Typewriter slate | `.premiere-type-slate` | Small mono metadata | Full string instantly |

---

## 2. Per-Page Section Specs

For each section: 14 fields per V3 §3 contract. Tables intentionally compact for scannability.

---

### 2.1 HOME — *The Premiere Arrival*

#### 2.1.1 Hero

| Field | Spec |
|---|---|
| Visual treatment | Full-bleed video hero. Glyph-stagger title settle. Allura cursive welcome above. Date subhead types in. CTA pulses. Harry walks in. |
| Background / layer | L0 not active over hero (video covers); L1 grain overlay light; L2 hero `<section>` with video + content stack |
| Existing assets used | `assets/backgrounds/05-dancefloor-confetti.mp4`, `assets/brand-mark/brand-mark.png`, `assets/mascot/01-wave-hello.png` |
| Missing assets needed | None |
| Harry pose used | `01-wave-hello.png` |
| Pose exists? | ✅ |
| Missing pose prompt | n/a |
| Animation / typography | Curtain rise → "MBSH presents" Allura fade-in → glyph-stagger Playfair title (≤30ms/glyph) → date `.premiere-type-slate` typewriter → CTA `.premiere-type-shimmer` metallic sweep → Harry walk-in (`is-walking` class, translateX, 1100ms) |
| Implementation method | CSS keyframes + JS curtain controller + JS glyph-wrapper for stagger |
| Mobile fallback | No walk-in (Harry appears in place); shorter glyph stagger |
| Reduced-motion fallback | Skip curtain entirely; instant title; instant Harry; CTA static gradient |
| Approval checkpoint | Fritz visual review at end of Pass 5 |
| Risk | L |
| Build pass | P1 (curtain + glyph stagger plumbing), P2 (uses existing assets), P5 (typography polish) |

#### 2.1.2 Story — Then (1996 hallway)

| Field | Spec |
|---|---|
| Visual treatment | Full-bleed era image with Ken Burns scale + caption fade-up. Harry points at the photo. |
| Background / layer | L0 stage continues; L2 `.story__moment--then` with image + caption |
| Existing assets used | `assets/story/then-1996-hallway.jpg` |
| Missing assets needed | Harry-pointing-left pose |
| Harry pose used | `11-pointing-left` (Pass 3) → fallback `08-pointing.png` mirrored via `transform: scaleX(-1)` |
| Pose exists? | ❌ (fallback works) |
| Missing pose prompt | "Hi-Tide Harry pointing toward the left side with extended arm and looking left, cell-shaded matching canon, transparent background" — existing 08 mirrored is acceptable |
| Animation / typography | Image scale 1.0 → 1.06 (8s linear); caption fade-up + tracking-tighten (`.premiere-type-tighten`) on view |
| Implementation method | CSS scale transition + IntersectionObserver `.is-active` toggle |
| Mobile fallback | No Harry walk; pose-swap in place via mirror |
| Reduced-motion fallback | Static image; instant caption |
| Approval checkpoint | Fritz at Pass 5 |
| Risk | L |
| Build pass | P2 (existing photo + mirrored pose), revisit P4 if real `11-pointing-left` ships |

#### 2.1.3 Story — Now (Miami Beach)

| Field | Spec |
|---|---|
| Visual treatment | Crossfade from Then. Opposite-direction Ken Burns. Harry peeks from behind the photo edge. |
| Background / layer | L0 continues; L2 `.story__moment--now` |
| Existing assets used | `assets/story/now-miami-beach.jpg` |
| Missing assets needed | Harry-peeking pose |
| Harry pose used | `11-peeking.png` (Pass 3) → fallback `06-listening.png` at 50% slide-in from edge |
| Pose exists? | ❌ |
| Missing pose prompt | "Hi-Tide Harry character, head and one hand visible peeking from behind a vertical edge, slight smile, looking at viewer, cell-shaded matching canonical character sheet, transparent background" |
| Animation / typography | Crossfade from Then; opposite Ken Burns; caption fade-up; Harry `is-peeking` slide-in |
| Implementation method | CSS + IO + JS peek-trigger |
| Mobile fallback | No peek (fallback to listening pose, no slide) |
| Reduced-motion fallback | Static image; instant caption; no peek |
| Approval checkpoint | Fritz at Pass 5 |
| Risk | M (peek pose is the V3-feel headline; fallback degrades the moment) |
| Build pass | P2 (with fallback), P4 (with real pose) |

#### 2.1.4 Story — Forever (30+100 brand mark)

| Field | Spec |
|---|---|
| Visual treatment | Brand mark scales up center-stage with scarlet rim-light pulse. Harry stands proud beside it. |
| Background / layer | L0 night-sky bleeds through; L2 brand-mark with glow |
| Existing assets used | `assets/brand-mark/brand-mark.png` |
| Missing assets needed | Harry-respectful or pride-celebrate pose; brand-mark silver-foil treatment (Pass 3, blocked on Gemini) |
| Harry pose used | `21-pride-celebrate.png` (Pass 3) → fallback `04-excited-cheer.png` |
| Pose exists? | ❌ |
| Missing pose prompt | "Hi-Tide Harry with both fists raised in triumphant celebration, cape billowing behind, mouth open in cheer, school pride pose, cell-shaded canonical, transparent background" |
| Animation / typography | Brand mark scale 0.85 → 1 + scarlet rim-light pulse loop; subtle `.premiere-type-shimmer` on the dual milestone text below |
| Implementation method | CSS transform + IO; CSS sheen overlay on brand-mark.png as silver-foil simulation until raster ships |
| Mobile fallback | Same |
| Reduced-motion fallback | No pulse glow; static brand mark |
| Approval checkpoint | Fritz at Pass 5 |
| Risk | M |
| Build pass | P2 (cheer fallback + CSS sheen), P4 (real pose + raster brand-foil) |

#### 2.1.5 Event Details (with marquee)

| Field | Spec |
|---|---|
| Visual treatment | Marquee bulb chase strip above. 4-cell event grid. Allura "A black-tie celebration thirty years in the making" hook line. |
| Background / layer | L0; L2 event-details section centered, max-width 960px |
| Existing assets used | All existing |
| Missing assets needed | None |
| Harry pose used | `04-excited-cheer.png` triggered when marquee bulbs first ignite |
| Pose exists? | ✅ |
| Missing pose prompt | n/a |
| Animation / typography | Marquee chase loop (existing); grid items stagger fade-in 80ms; hook line `.premiere-type-drawon` Allura SVG stroke-dashoffset |
| Implementation method | CSS keyframes + IO + SVG path |
| Mobile fallback | Marquee with fewer bulbs; chase loop kept |
| Reduced-motion fallback | Bulbs static at full opacity, no chase; hook line static |
| Approval checkpoint | Fritz at Pass 5 |
| Risk | L |
| Build pass | P1 (marquee component plumbing), P5 (Allura draw-on polish) |

#### 2.1.6 Cards / Poster Wall

| Field | Spec |
|---|---|
| Visual treatment | 6 movie-poster cards in a wall, each in a golden filmstrip frame. Velvet-red gradient interior, big Playfair 900 uppercase title with cream-amber glow, italic Cormorant tagline beneath. Hover lifts -12px with -0.5° rotation; spotlight halo follows. |
| Background / layer | L0 ambient; L2 cards grid; L3 golden filmstrip frame around each card |
| Existing assets used | None — typographic posters |
| Missing assets needed | Golden filmstrip frame SVG component (Pass 1) |
| Harry pose used | Steps aside (off-frame). `.premiere-usher.is-stepping-back` class. |
| Pose exists? | ✅ (no new pose) |
| Missing pose prompt | n/a |
| Animation / typography | Frame edge gleam sweep on enter; spotlight halo on hover; cards stagger-fade |
| Implementation method | CSS Grid + SVG `<use>` filmstrip frame + CSS keyframes |
| Mobile fallback | 2-column grid; tap-to-navigate; no hover lift |
| Reduced-motion fallback | No lift, no rotation, no halo |
| Approval checkpoint | Fritz at Pass 1 (frame visual approval), Pass 5 (final motion) |
| Risk | M (frame is a new component, must look right) |
| Build pass | P1 (frame component), P2 (poster card markup + typography), P5 (motion polish) |

#### 2.1.7 Footer

| Field | Spec |
|---|---|
| Visual treatment | Off-black footer with brand identity, committee email, resources. Allura tagline. Harry salutes. |
| Background / layer | L0 fades to off-black; L2 footer |
| Existing assets used | Existing footer markup; `assets/brand-mark/brand-mark.png` |
| Missing assets needed | Harry-salute pose |
| Harry pose used | `23-salute.png` (Pass 3) → fallback `02-thumbs-up.png` |
| Pose exists? | ❌ |
| Missing pose prompt | "Hi-Tide Harry giving a casual two-finger salute to forehead with proud smile, other hand on hip, cape settled, cell-shaded canonical, transparent background" |
| Animation / typography | None on entry; static |
| Implementation method | Existing markup; premiere.css polish only |
| Mobile fallback | Stack columns |
| Reduced-motion fallback | n/a |
| Approval checkpoint | Fritz at Pass 5 |
| Risk | L |
| Build pass | P2 (with thumbs-up fallback), P4 (with real salute) |

---

### 2.2 RSVP — *Take Your Seat*

#### 2.2.1 Page header (Take Your Seat)

| Field | Spec |
|---|---|
| Visual treatment | Page-header bands top + bottom; "TAKE YOUR SEAT" Playfair display 900 letter-stagger reveal. Subhead italic Cormorant. Harry seated as usher to the side. |
| Background / layer | L0 cinema-seats backdrop; L2 page-header; L3 (none) |
| Existing assets used | None for backdrop |
| Missing assets needed | `bg-rsvp.jpg` (cinema seats receding) — Pass 3; Harry-seated-usher pose — Pass 3 |
| Harry pose used | `15-seated-usher.png` (Pass 3) → fallback `06-listening.png` |
| Pose exists? | ❌ |
| Missing pose prompt | "Hi-Tide Harry seated in a scarlet cinema seat with gold trim, casual relaxed pose, looking forward and to the side, cell-shaded canonical, transparent background" |
| Animation / typography | Curtain raise on first arrival; `.premiere-type-stagger` letter-by-letter reveal of title; subhead fade |
| Implementation method | CSS + JS glyph-wrap + IMG backdrop |
| Mobile fallback | Title scale smaller; no curtain raise |
| Reduced-motion fallback | Title appears instantly; no curtain |
| Approval checkpoint | Fritz at Pass 1 (header pattern across all inner pages), Pass 4 (assets) |
| Risk | M |
| Build pass | P2 (with CSS-gradient backdrop + listening pose fallback), P4 (real backdrop + seated pose) |

#### 2.2.2 Countdown to the night

| Field | Spec |
|---|---|
| Visual treatment | Countdown-clock cells (D / H / M / S) styled as cinema-leader frames. On first scroll into view, 5→4→3→2→1 leader plays once before settling into normal countdown clock. |
| Background / layer | L0 continues; L2 countdown grid |
| Existing assets used | Existing countdown clock JS in `frontend/js/countdown.js` |
| Missing assets needed | Cinema countdown leader SVG — Pass 1 (built component) |
| Harry pose used | `08-pointing.png` |
| Pose exists? | ✅ |
| Missing pose prompt | n/a |
| Animation / typography | `.premiere-leader` — SVG keyframe rotating numerals; transitions to live clock at end of leader |
| Implementation method | SVG inline + CSS keyframes + JS gate (run leader once, then handoff) |
| Mobile fallback | Leader plays; clock smaller |
| Reduced-motion fallback | Skip the leader; show clock immediately |
| Approval checkpoint | Fritz at Pass 1 (component) |
| Risk | L |
| Build pass | P1 (leader component), P2 (full integration) |

#### 2.2.3 The Form (active reel frame)

| Field | Spec |
|---|---|
| Visual treatment | Form rendered as the active golden filmstrip frame. Adjacent dimmer frames hint before/after. On submit success: frame brightens, ticket stub flips out of Harry's hand. |
| Background / layer | L0; L2 form; L3 golden filmstrip frame around form |
| Existing assets used | Existing RSVP form markup + JS submission flow |
| Missing assets needed | Golden filmstrip frame SVG (Pass 1); Harry-holding-ticket-stub pose (Pass 3) |
| Harry pose used | `13-ticket-stub.png` on success (Pass 3) → fallback `02-thumbs-up.png`; on idle: `08-pointing.png` |
| Pose exists? | ❌ for success state |
| Missing pose prompt | "Hi-Tide Harry holding up a film ticket stub toward viewer with a proud expression, cape flowing slightly, cell-shaded canonical, transparent background" |
| Animation / typography | Active frame brightens; ticket-stub flip 900ms; field-focus subtle scarlet glow (existing) |
| Implementation method | SVG frame + CSS form styling + JS form-success event |
| Mobile fallback | Frame thinner; ticket stub renders inline |
| Reduced-motion fallback | No flip; ticket stub appears instantly |
| Approval checkpoint | Fritz at Pass 1 (frame), Pass 5 (motion) |
| Risk | M |
| Build pass | P1 (frame), P2 (with thumbs-up fallback), P4 (real stub pose) |

#### 2.2.4 What to Expect (3 mini-cards)

| Field | Spec |
|---|---|
| Visual treatment | 3 mini-cards (Arrival 7 PM / Tribute 9:30 PM / Floor 'til 12). Existing pattern. Harry walks across to point at hovered card. |
| Background / layer | L0; L2 mini-cards grid |
| Existing assets used | Existing mini-card pattern |
| Missing assets needed | Harry-pointing-across pose (Pass 3) |
| Harry pose used | `20-pointing-across.png` (Pass 3) → fallback `08-pointing.png` mirrored |
| Pose exists? | ❌ (fallback works) |
| Missing pose prompt | "Hi-Tide Harry pointing across to one side with arm extended horizontally, looking in same direction, cell-shaded canonical, transparent background" |
| Animation / typography | Cards stagger-fade-in on view; hover lift |
| Implementation method | CSS Grid + IO + premiere.css mini-card styles |
| Mobile fallback | Stack vertical; no walk; pose-swap in place |
| Reduced-motion fallback | No stagger; instant reveal |
| Approval checkpoint | Fritz at Pass 5 |
| Risk | L |
| Build pass | P2 (existing), P4 if real pointing-across ships |

#### 2.2.5 Why this night, why now

| Field | Spec |
|---|---|
| Visual treatment | Cormorant italic body text centered. Harry stands quietly beside. |
| Background / layer | L0; L2 text block |
| Existing assets used | All existing |
| Missing assets needed | None |
| Harry pose used | `06-listening.png` |
| Pose exists? | ✅ |
| Missing pose prompt | n/a |
| Animation / typography | Text fade-in on view |
| Implementation method | Existing |
| Mobile fallback | Same |
| Reduced-motion fallback | Instant text |
| Approval checkpoint | n/a |
| Risk | L |
| Build pass | P2 |

---

### 2.3 TICKETS — *Patrons of the Evening*

#### 2.3.1 Page header (The Night)

| Field | Spec |
|---|---|
| Visual treatment | "THE NIGHT" Playfair display 900 letter-stagger reveal. Red-velvet curtain swipe from sides on first arrival. Harry stands at carpet head presenting an announcement board. |
| Background / layer | L0 red-carpet runway; L2 page-header; L3 (none) |
| Existing assets used | None for backdrop |
| Missing assets needed | `bg-tickets.jpg` (red carpet) — Pass 3; Harry-presenting-board pose — Pass 3 |
| Harry pose used | `18-presenting.png` (Pass 3) → fallback `08-pointing.png` |
| Pose exists? | ❌ |
| Missing pose prompt | "Hi-Tide Harry holding a vintage cinema announcement board horizontally to one side, gesturing at it with the other hand, presenting expression, cell-shaded canonical, transparent background" |
| Animation / typography | Red-velvet curtain swipe (CSS keyframe, 700ms); title `.premiere-type-stagger` |
| Implementation method | CSS + IMG backdrop + JS first-visit gate |
| Mobile fallback | No curtain; instant title |
| Reduced-motion fallback | No curtain; instant title |
| Approval checkpoint | Fritz at Pass 1 (header pattern), Pass 4 (assets) |
| Risk | M |
| Build pass | P2 (CSS gradient + pointing fallback), P4 (real assets) |

#### 2.3.2 Tickets (Early Bird / Regular / Couple)

| Field | Spec |
|---|---|
| Visual treatment | 3 tier cards as framed posters on a wall. Each in a golden filmstrip frame. Tier name Playfair display, price JetBrains Mono, perks Cormorant. Hover spotlight follows cursor. |
| Background / layer | L0; L2 cards grid; L3 frames |
| Existing assets used | Existing tier markup |
| Missing assets needed | Golden filmstrip frame (Pass 1); tier medallions (Pass 3 raster) |
| Harry pose used | Walk-frame on tier hover (`22-walk-frame.png` Pass 3) → fallback no walk, `08-pointing.png` |
| Pose exists? | ❌ for walking |
| Missing pose prompt | "Hi-Tide Harry mid-stride walking toward viewer's right, one foot raised, arms in natural walking swing, looking forward, cell-shaded canonical, transparent background" |
| Animation / typography | Posters lift on hover; spotlight halo follows |
| Implementation method | SVG frames + CSS Grid + IO + JS hover spotlight |
| Mobile fallback | Stack vertical; no spotlight; no walk |
| Reduced-motion fallback | No lift, no spotlight follow |
| Approval checkpoint | Fritz at Pass 1 (frame), Pass 4 (medallions) |
| Risk | M |
| Build pass | P2 (CSS gradient medallions, no walk), P4 (real medallions + walk pose) |

#### 2.3.3 Become a Patron (sponsor mini-cards)

| Field | Spec |
|---|---|
| Visual treatment | 3 sponsor tier mini-cards (Marquee $2.5k / Producer $1k / Featured $500). Foil shimmer on hover. Harry salutes on hover of any tier. |
| Background / layer | L0; L2 mini-cards |
| Existing assets used | Existing mini-card pattern (already shipped) |
| Missing assets needed | Harry-salute pose (Pass 3 — same as 2.1.7 footer) |
| Harry pose used | `23-salute.png` (Pass 3) → fallback `02-thumbs-up.png` |
| Pose exists? | ❌ (fallback works) |
| Missing pose prompt | (same as 2.1.7) |
| Animation / typography | Foil shimmer sweep on hover (existing) |
| Implementation method | CSS + premiere.css mini-card |
| Mobile fallback | Stack; foil disabled |
| Reduced-motion fallback | No shimmer |
| Approval checkpoint | n/a |
| Risk | L |
| Build pass | P2 (existing), P4 if real salute ships |

#### 2.3.4 Why your patronage matters

| Field | Spec |
|---|---|
| Visual treatment | Cormorant italic body text. Harry listens beside. |
| Background / layer | L0; L2 text |
| Existing assets used | Existing |
| Missing assets needed | None |
| Harry pose used | `06-listening.png` |
| Pose exists? | ✅ |
| Missing pose prompt | n/a |
| Animation / typography | Fade-in on view |
| Implementation method | Existing |
| Mobile fallback | Same |
| Reduced-motion fallback | Instant |
| Approval checkpoint | n/a |
| Risk | L |
| Build pass | P2 |

---

### 2.4 THROUGH THE YEARS — *The Trailer Reel*

#### 2.4.1 Reel-leader countdown intro

| Field | Spec |
|---|---|
| Visual treatment | Cinema reel-leader (5→4→3→2→1) center-screen with scratchy frame edges + brief flicker. ~1.5s total. |
| Background / layer | L0 dark screening room (existing video `02-rebuilt-school-push-in.mp4` looping muted, OR CSS gradient); L2 leader |
| Existing assets used | `assets/backgrounds/02-rebuilt-school-push-in.mp4` (currently unused — surface in Pass 2) |
| Missing assets needed | Cinema-leader SVG component (Pass 1) |
| Harry pose used | Hidden during countdown |
| Pose exists? | n/a |
| Missing pose prompt | n/a |
| Animation / typography | `.premiere-leader` SVG keyframe rotating numerals; flicker via opacity ~80% jitter |
| Implementation method | SVG inline + CSS keyframes |
| Mobile fallback | Same |
| Reduced-motion fallback | Skip leader; first era loads immediately |
| Approval checkpoint | Fritz at Pass 1 (component) |
| Risk | L |
| Build pass | P1 (component), P2 (page integration) |

#### 2.4.2 Era 1926-1959

| Field | Spec |
|---|---|
| Visual treatment | Era card with sepia treatment; sprocket borders; year badge JetBrains Mono. Harry peeks from behind frame. |
| Background / layer | L0 sepia hallway; L2 era card; L3 sprocket border |
| Existing assets used | `assets/story/era-1926-1959.jpg` |
| Missing assets needed | Harry-peek pose (already declared §2.1.3) |
| Harry pose used | `11-peeking.png` (Pass 3) → fallback `06-listening.png` from edge |
| Pose exists? | ❌ |
| Missing pose prompt | (same as §2.1.3) |
| Animation / typography | Era card fade-up + scale on snap-stop; year badge `.premiere-type-slate` |
| Implementation method | CSS + IO + scroll-snap-stop |
| Mobile fallback | Vertical snap-card |
| Reduced-motion fallback | Static |
| Approval checkpoint | n/a |
| Risk | L |
| Build pass | P2 (with fallback peek), P4 (real peek) |

#### 2.4.3 Era 1960s-1970s

Same pattern as 2.4.2. Harry peeks from opposite side. Pose: `11-peeking.png` mirrored.

| Field | Spec |
|---|---|
| Build pass | P2 / P4 |

#### 2.4.4 Era 1980s

Same pattern as 2.4.2. Harry-thinking pose appropriate. Pose: `03-thinking.png`. ✅ exists.

| Field | Spec |
|---|---|
| Build pass | P2 |

#### 2.4.5 Era 1996 (longer pause)

| Field | Spec |
|---|---|
| Visual treatment | Era card with scarlet glow inset + longer scroll-snap-stop dwell. Harry jumps out and waves big. |
| Background / layer | L0 sepia + scarlet bloom; L2 era card |
| Existing assets used | `assets/story/era-1996.jpg` + `04-excited-cheer.png` |
| Missing assets needed | None |
| Harry pose used | `04-excited-cheer.png` |
| Pose exists? | ✅ |
| Missing pose prompt | n/a |
| Animation / typography | Card scale up 1.0 → 1.04; scarlet inset glow loop; Harry cheer |
| Implementation method | CSS + IO + longer snap dwell |
| Mobile fallback | Same |
| Reduced-motion fallback | No scale, no glow |
| Approval checkpoint | n/a |
| Risk | L |
| Build pass | P2 |

#### 2.4.6 Era 2026 (now)

| Field | Spec |
|---|---|
| Visual treatment | Scarlet pulse inset (existing). Harry salutes. |
| Background / layer | L0; L2 era card |
| Existing assets used | `assets/story/era-2026.jpg` |
| Missing assets needed | Harry-salute pose |
| Harry pose used | `23-salute.png` (Pass 3) → fallback `02-thumbs-up.png` |
| Pose exists? | ❌ (fallback works) |
| Missing pose prompt | (same as §2.1.7) |
| Animation / typography | Scarlet pulse loop |
| Implementation method | CSS keyframes |
| Mobile fallback | Same |
| Reduced-motion fallback | No pulse |
| Approval checkpoint | n/a |
| Risk | L |
| Build pass | P2 (thumbs-up fallback), P4 (real salute) |

#### 2.4.7 Add a Memory (clipboard form)

| Field | Spec |
|---|---|
| Visual treatment | Form styled as director's clipboard page on a dark surface. Harry holds the clipboard, nods. |
| Background / layer | L0; L2 clipboard form |
| Existing assets used | Existing memory form markup |
| Missing assets needed | Clipboard SVG (Pass 1); Harry-clipboard pose (Pass 3) |
| Harry pose used | `12-clipboard.png` (Pass 3) → fallback `03-thinking.png` |
| Pose exists? | ❌ |
| Missing pose prompt | "Hi-Tide Harry holding a director's clipboard with film-style production paperwork, looking down at it, pen in other hand, cell-shaded canonical, transparent background" |
| Animation / typography | Clipboard slight tilt on hover; submit triggers Harry stamp + nod |
| Implementation method | SVG + CSS + JS form |
| Mobile fallback | Clipboard simplified to text frame |
| Reduced-motion fallback | No tilt |
| Approval checkpoint | Fritz at Pass 1 (clipboard SVG) |
| Risk | M |
| Build pass | P1 (clipboard SVG), P2 (with thinking fallback), P4 (real clipboard pose) |

---

### 2.5 MEMORIAL — *In Memoriam*

#### 2.5.1 Header (In Memory)

| Field | Spec |
|---|---|
| Visual treatment | Allura "In Memory" cursive draw-on. Italic Cormorant subhead. Reverence-first. No film strip, no curtain. Optional candle SVG (D11 open). |
| Background / layer | L0 night-sky black + starfield + optional moon SVG; L1 dialed to 0.35 opacity |
| Existing assets used | None for backdrop (CSS-only) |
| Missing assets needed | Moon SVG (Pass 1, small + simple); candle SVG IF D11 closes "yes" (Pass 1) |
| Harry pose used | NOT VISIBLE on this page (V2 + V3 rule) |
| Pose exists? | n/a |
| Missing pose prompt | n/a |
| Animation / typography | `.premiere-type-drawon` Allura SVG stroke-dashoffset (1.6s); subhead fade |
| Implementation method | SVG path + CSS keyframes |
| Mobile fallback | Same |
| Reduced-motion fallback | Title appears instantly |
| Approval checkpoint | Fritz at Pass 5 (final reverent feel) |
| Risk | L |
| Build pass | P1 (draw-on plumbing + moon SVG), P2 (page integration) |

#### 2.5.2 Names list

| Field | Spec |
|---|---|
| Visual treatment | Each name Cormorant italic + silver-foil rule beneath. Slow stagger fade-up (200ms apart). Optional opt-in piano sustain (D10 open). |
| Background / layer | L0 same; L2 names list |
| Existing assets used | Existing memorial list rendering JS |
| Missing assets needed | Optional piano-sustain audio file IF D10 closes "yes" |
| Harry pose used | Hidden |
| Pose exists? | n/a |
| Missing pose prompt | n/a |
| Animation / typography | IO-driven fade-up + silver-foil rule (existing in shipped V1) |
| Implementation method | IO + CSS (already done) |
| Mobile fallback | Same |
| Reduced-motion fallback | Names appear instantly |
| Approval checkpoint | n/a |
| Risk | L |
| Build pass | P2 (already done in shipped V1; revisit for polish) |

#### 2.5.3 Add a Name

Existing — kept. Build pass: P2.

#### 2.5.4 At the Reunion

Existing — kept. Build pass: P2.

---

### 2.6 CAPSULE — *The Letter to Yourself*

#### 2.6.1 Header (The Letter)

| Field | Spec |
|---|---|
| Visual treatment | Curtain rise reveals envelope on wood desk. "Sealed" Great Vibes script success state later. Harry sits at desk corner with pen. |
| Background / layer | L0 wood desk + lamp glow + parchment texture; L2 page-header |
| Existing assets used | None for backdrop |
| Missing assets needed | `bg-capsule.jpg` (Pass 3); Harry-with-pen pose (Pass 3) |
| Harry pose used | `12-clipboard.png` adapted? Or new — proposing `12-clipboard.png` covers writing posture; if not, fallback `03-thinking.png` |
| Pose exists? | ❌ for proper writing pose |
| Missing pose prompt | "Hi-Tide Harry seated at a wood desk leaning forward, holding a fountain pen over an open letter, focused expression, cell-shaded canonical, transparent background" |
| Animation / typography | Curtain rise; subtle lamp flicker (3-4% brightness oscillation, 8s loop) |
| Implementation method | CSS + IMG backdrop + JS curtain |
| Mobile fallback | Backdrop simplified |
| Reduced-motion fallback | No curtain; no flicker |
| Approval checkpoint | Fritz at Pass 4 (assets) |
| Risk | M |
| Build pass | P2 (gradient + thinking fallback), P4 (real assets) |

#### 2.6.2 The Envelope (the form)

| Field | Spec |
|---|---|
| Visual treatment | Envelope flap closed by default with scarlet wax seal. On scroll/click, flap opens, letter slides out, fields rendered as written on the letter. On submit, wax seal animation fires. |
| Background / layer | L0 desk; L2 envelope+letter SVG; L3 (none) |
| Existing assets used | Existing capsule form markup; CSS wax-seal draft |
| Missing assets needed | Envelope+letter SVG component (Pass 1); Harry-stamping-wax pose (Pass 3); wax-seal SVG upgrade (Pass 1) |
| Harry pose used | `14-wax-stamping.png` on success (Pass 3) → fallback `02-thumbs-up.png` |
| Pose exists? | ❌ on success |
| Missing pose prompt | "Hi-Tide Harry pressing a wax stamper down onto an envelope with focused expression, both hands engaged, cell-shaded canonical, transparent background" |
| Animation / typography | Flap opens (clip-path keyframe); letter slides out; on submit: wax pours + stamp drops + Harry pose change |
| Implementation method | SVG + CSS keyframes + JS form-success event |
| Mobile fallback | Vertical letter card; wax simpler |
| Reduced-motion fallback | No flap; form appears instantly; no wax animation |
| Approval checkpoint | Fritz at Pass 1 (envelope component), Pass 5 (motion) |
| Risk | M |
| Build pass | P1 (component), P2 (with thumbs-up fallback), P4 (real wax-stamping pose) |

#### 2.6.3 What to write (3 prompts)

| Field | Spec |
|---|---|
| Visual treatment | 3 mini-cards (existing pattern). Harry points across at the active prompt on hover. |
| Background / layer | L0; L2 mini-cards |
| Existing assets used | Existing |
| Missing assets needed | Harry-pointing-across (already declared) |
| Harry pose used | `20-pointing-across.png` (Pass 3) → fallback `08-pointing.png` mirrored |
| Pose exists? | ❌ (fallback works) |
| Missing pose prompt | (same as §2.2.4) |
| Animation / typography | Stagger fade-in |
| Implementation method | Existing |
| Mobile fallback | Stack |
| Reduced-motion fallback | No stagger |
| Approval checkpoint | n/a |
| Risk | L |
| Build pass | P2 |

#### 2.6.4 We deliver on the day

| Field | Spec |
|---|---|
| Visual treatment | Cormorant italic body. Harry listening. |
| Background / layer | L0; L2 text |
| Existing assets used | Existing |
| Missing assets needed | None |
| Harry pose used | `06-listening.png` |
| Pose exists? | ✅ |
| Missing pose prompt | n/a |
| Animation / typography | Fade-in |
| Implementation method | Existing |
| Mobile fallback | Same |
| Reduced-motion fallback | Instant |
| Approval checkpoint | n/a |
| Risk | L |
| Build pass | P2 |

---

### 2.7 PLAYLIST — *Encore*

#### 2.7.1 Header (Encore)

| Field | Spec |
|---|---|
| Visual treatment | "Encore" Allura draw-on. Stage with smoke spotlight pools. Harry beside vinyl, mimes air-conducting. |
| Background / layer | L0 spotlight pools (CSS gradients OK; optional `bg-playlist.jpg` Pass 3); L2 page-header |
| Existing assets used | None |
| Missing assets needed | Harry-conducting pose (Pass 3) |
| Harry pose used | `16-conducting.png` (Pass 3) → fallback `04-excited-cheer.png` |
| Pose exists? | ❌ |
| Missing pose prompt | "Hi-Tide Harry conducting with both arms raised mid-motion as if leading an orchestra, cape trailing, big smile, cell-shaded canonical, transparent background" |
| Animation / typography | `.premiere-type-drawon` Allura |
| Implementation method | SVG + CSS |
| Mobile fallback | Spotlight simplified |
| Reduced-motion fallback | Title instant |
| Approval checkpoint | n/a |
| Risk | L |
| Build pass | P2 (CSS gradient + cheer fallback), P4 (real conducting pose) |

#### 2.7.2 Vinyl + Spotify embed

| Field | Spec |
|---|---|
| Visual treatment | Vinyl record (CSS draft) center-stage spinning. Spotify iframe beside it. Stylus drop on first scroll into view. |
| Background / layer | L0; L2 vinyl + iframe |
| Existing assets used | Existing playlist markup; vinyl CSS already in V1 |
| Missing assets needed | Real Spotify playlist ID (D13 open) |
| Harry pose used | `16-conducting.png` continued — same as 2.7.1 |
| Pose exists? | ❌ (fallback works) |
| Missing pose prompt | (same as §2.7.1) |
| Animation / typography | Vinyl spin-up keyframe; stylus drop SVG keyframe |
| Implementation method | CSS + iframe |
| Mobile fallback | Vinyl shrinks |
| Reduced-motion fallback | Vinyl static |
| Approval checkpoint | Fritz at Pass 7 (Spotify ID) |
| Risk | M (Spotify ID dependency) |
| Build pass | P2 (vinyl + placeholder iframe), P7 (real playlist ID) |

#### 2.7.3 Tracklist (18 tracks)

| Field | Spec |
|---|---|
| Visual treatment | A-Side / B-Side / C-Side notation. Slow credit-roll style entry from bottom. Hover row highlights. |
| Background / layer | L0; L2 tracklist |
| Existing assets used | Existing 18-track curated content |
| Missing assets needed | None |
| Harry pose used | Slight groove on row hover (continued conducting) |
| Pose exists? | ❌ (fallback works) |
| Missing pose prompt | n/a — covered by 2.7.1 |
| Animation / typography | Rows slide in bottom-to-top (CSS keyframe) |
| Implementation method | Existing + CSS keyframe |
| Mobile fallback | No slide; static list |
| Reduced-motion fallback | No slide; instant list |
| Approval checkpoint | n/a |
| Risk | L |
| Build pass | P2 |

#### 2.7.4 About the soundtrack (3 sides)

Existing — kept. 3 mini-cards. Build pass: P2.

#### 2.7.5 Suggest a track

Existing — kept. Build pass: P2.

---

## 3. Asset Roll-Up by Build Pass

### Pass 1 deliverables (components — no per-page yet)

| Component | Type | Used by |
|---|---|---|
| `.premiere-frame` SVG `<symbol>` | SVG | Home cards, RSVP form, Tickets tiers |
| `.premiere-divider` SVG | SVG | Between sections on home + inner pages |
| `.premiere-medallion-menu` | CSS + JS + SVG | All pages |
| Snap mechanism (`scrollend` + bounce) | JS + CSS | Home + Through-Years |
| Harry usher walk/peek/celebrate classes | CSS | All pages |
| `.premiere-leader` cinema countdown | SVG + CSS | RSVP + Through-Years |
| Envelope+letter SVG | SVG | Capsule |
| Wax seal SVG (upgrade from CSS) | SVG | Capsule |
| Moon SVG | SVG | Memorial |
| Clipboard SVG | SVG | Through-Years |

### Pass 3 raster generation queue (Gemini key required, OR Firefly auth, OR commission)

**Backdrops (4 images, 1920×1080, JPG q80):**
- `bg-rsvp.jpg`
- `bg-tickets.jpg`
- `bg-through-years.jpg` (alternative: surface existing `02-rebuilt-school-push-in.mp4` looping)
- `bg-capsule.jpg`
- `bg-playlist.jpg` (optional)

**Harry poses (13, transparent PNG, ~600×600):**
- `11-peeking.png`
- `12-clipboard.png`
- `13-ticket-stub.png`
- `14-wax-stamping.png`
- `15-seated-usher.png`
- `16-conducting.png`
- `17-respectful.png`
- `18-presenting.png`
- `19-pointing-down.png`
- `20-pointing-across.png`
- `21-pride-celebrate.png`
- `22-walk-frame.png`
- `23-salute.png`

**Brand / texture (3 raster):**
- `velvet-curtain.png` (seamless tile 512×512)
- `tier-{platinum,gold,silver,bronze}.png` (4 medallions, 400×400)
- `brand-mark-foil.png` (600×600)

---

## 4. Risk Roll-Up by Risk Level

### High risk
- D5 medallion-menu visual design (Pass 1 — must be approved by Fritz before propagation)
- D8 iOS Safari scroll-snap-mandatory + momentum interaction (Pass 1 / Pass 6 — graceful fallback to proximity must work)

### Medium risk
- 2.1.6 Cards / Poster Wall — golden frame component is the visual headline
- 2.1.3 Story-Now peek pose missing → fallback degrades the V3 vision
- 2.1.4 Story-Forever pride pose missing → fallback to cheer is a downgrade
- 2.2.1, 2.3.1, 2.6.1 Page-headers — depend on bg images that are Pass 3 deliverables
- 2.4.7 Add a Memory clipboard pose missing
- 2.6.2 Capsule envelope — multiple components (envelope SVG + wax pose) interlock
- 2.7.2 Real Spotify playlist ID dependency

### Low risk
- All sections using existing poses + existing JPGs + CSS-only treatments

---

## 5. Open Decisions Carried From V3 §8

These must close before their dependent passes start.

| ID | Decision | Blocks pass | Default proposal |
|---|---|---|---|
| D4 | Filmstrip frame visual design | P1 | Build, demo to Fritz, iterate |
| D5 | Medallion radial menu animation + layout | P1 | Build prototype, demo to Fritz |
| D8 | iOS Safari snap-mandatory verification | P1 | Build with mandatory + proximity fallback feature-detect |
| D9 | Per-page video assignment | P2 | Use `02-rebuilt-school-push-in.mp4` on Through-Years; others stay CSS |
| D10 | Memorial audio | P5 | OMIT — reverence over ornament |
| D11 | Memorial candle / dove SVG | P1 | OMIT — starfield + moon is enough |
| D13 | Spotify playlist ID | P7 | Block on Fritz/committee |
| D15 | Medallion size per page | P1 | Brand-mark size on home, scaled 70% on inner pages |

---

## 6. Stop Condition

> No code is written until:
> - This Design Map is approved
> - V3 §8 / this doc §5 open decisions are closed (or default proposals accepted)
> - Pass 0 architecture sandbox confirmed
>
> Implementation proceeds pass-by-pass per §0. No silent stub policy: every section in §2 ships in its assigned pass OR explicitly defers with a fallback marker AND an entry in the closeout packet.
