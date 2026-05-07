# MBSH Reunion — Premiere Experience V3 Plan

**Status:** Decision document. No code. Production Protocol gate.
**Captured:** 2026-05-07
**Supersedes:** `PREMIERE-EXPERIENCE-V2-PLAN-2026-05-07.md` (V2)
**Triggered by:** Pattern of jumping idea → code without creative discovery, capability review, or section-by-section reasoning

---

## ⛔ STOP CONDITION (READ FIRST)

> **No code is written until this V3 plan is reviewed and approved.**
>
> **No CSS. No JS. No markup changes. No asset generation.**
>
> The purpose of V3 is to force production-team thinking before implementation:
> capability discovery, specialist consultation, section-by-section reasoning,
> pose gaps surfaced, asset pipeline declared, decisions logged.
>
> If a capability is missing, **say so**. If a pose doesn't exist, **register it as a gap**. If an asset needs generating, **declare the prompt**. Do not silently downgrade the idea or fake it with CSS.
>
> The builder is acting as a creative production team, not a coder.

---

## Context

V1 captured creative direction (theme system, per-page choreography, asset queue). V2 added structured creative direction with explicit change/keep/remove against shipped Pass 1–3 work. Both led to the builder moving too quickly from idea to code, missing capability gaps, and shipping work that didn't meet the creative bar (cheesy edge film strips, generic top nav, static Harry, empty inner pages).

**V3 inserts an "Experience Production Protocol" before implementation.** It does not replace V2's creative direction (Layering, Per-Page Treatment, Acceptance Criteria — all still authoritative). It adds the gating discipline that was missing.

V3 is structured as **9 protocol sections**. All must be completed before the implementation phases in V2 §10 may begin.

---

## 1. Capability Discovery Gate

**Audit existing capabilities and surface gaps before designing solutions. Do not assume "we can't do it." Identify what would be needed.**

### 1.1 Existing Harry PNG poses (in `frontend/assets/mascot/`)

| File | Pose | Used in current V1–V3 work |
|---|---|---|
| `01-wave-hello.png` | Wave hello | Home hero default; usher default |
| `02-thumbs-up.png` | Thumbs up | RSVP success; capsule submit |
| `03-thinking.png` | Thinking (chin scratch) | Through-Years default |
| `04-excited-cheer.png` | Excited cheer (fists up) | Event-details; playlist default |
| `05-disappointed.png` | Disappointed (head down) | (unused — chatbot fallback maybe) |
| `06-listening.png` | Listening (ear cupped) | RSVP default; chatbot bubble icon |
| `07-confirming.png` | Confirming (nodding) | Home previews |
| `08-pointing.png` | Pointing forward | Story-Then; Tickets default; Capsule default |
| `09-confused.png` | Confused (palms-up shrug) | (unused) |
| `10-running.png` | Running (motion blur) | (unused — could power "walk" frames) |

**Reality check:** 10 poses, but the V2 choreography map calls for behaviors not all 10 cover.

### 1.2 Missing Harry poses (gap register lives in §4)

Quick summary — V2 choreography needs **at least these poses that don't exist**:
- Peeking from behind an edge
- Holding a clipboard
- Holding a ticket stub (held up to camera)
- Stamping a wax seal
- Seated as usher in a cinema seat
- Conducting / dancing for playlist
- Standing respectfully (head slightly bowed) for legacy moments
- Presenting an announcement board
- Pointing down / across (different angles than the existing forward point)
- Celebrating with class pride (scarf trailing, fists up — different from 04 cheer)
- Walk-frame (in-stride, leaning forward) — `10-running.png` may be too dynamic

Detailed register in §4.

### 1.3 Existing backgrounds, videos, images

`frontend/assets/backgrounds/` — 5 production MP4s:
- `01-yearbook-pages.mp4` — page-flip B-roll, currently unused
- `02-rebuilt-school-push-in.mp4` — slow camera push, currently unused
- `03-vhs-to-modern-transition.mp4` — 90s-to-now, currently unused
- `04-red-silver-mascot-energy.mp4` — abstract red/silver flow, currently unused
- `05-dancefloor-confetti.mp4` — hero loop, used on home

`frontend/assets/story/` — 7 era JPGs + then/now JPGs:
- `then-1996-hallway.jpg`, `now-miami-beach.jpg`
- `era-1926-1959.jpg`, `era-1960-1979.jpg`, `era-1980s.jpg`, `era-1996.jpg`, `era-2026.jpg`
- All have rights cleared (`RIGHTS-MANIFEST.md`)

`frontend/assets/brand-mark/brand-mark.png` — the 30+100 commemorative roundel.

**Underused asset insight:** four production MP4s (01, 02, 03, 04) are sitting in the repo. The V2 plan called for backdrop images and never noticed these existed. They could power per-page backdrop video on rsvp / through-years / capsule with appropriate framing.

### 1.4 Existing CSS capability

- ✅ CSS variables, Grid, Flexbox, `clamp()`, `aspect-ratio`
- ✅ CSS animations and keyframes (compositor-friendly with `transform` + `opacity`)
- ✅ `mask-image` / `-webkit-mask-image` (used for ticket-stub perforations)
- ✅ `mix-blend-mode` (used in FX overlay)
- ✅ `backdrop-filter: blur()` (used in nav, has `@supports` fallback)
- ✅ `scroll-snap-type` (proximity already used; mandatory possible with iOS Safari care)
- ⚠️ `view()` / `scroll()` timelines (Chrome 115+, Safari 18+; Firefox flag) — IntersectionObserver fallback is the safe path
- ✅ `@media (prefers-reduced-motion: reduce)` and `(prefers-reduced-data: reduce)`
- ✅ `@supports` feature detection
- ⚠️ Container queries (modern browsers only — not load-bearing here)
- ✅ SVG inline + `<use>` references (zero new HTTP cost)

### 1.5 Existing JS capability

- ✅ `IntersectionObserver` (primary scroll-trigger pattern)
- ✅ `MutationObserver` (used for late-arriving memorial names)
- ✅ `requestAnimationFrame` (used for scroll listener throttle)
- ⚠️ `scrollend` event (Chrome 114+, Safari 18+ — needs scroll-stop debounce fallback)
- ✅ `sessionStorage` / `localStorage` (used for curtain-once gate)
- ✅ Custom events (`rsvp:success` already wired)
- ✅ Web Animations API (could replace some CSS keyframes for cleaner cancellation)
- ✅ Canvas API (unused — could power particle-driven backdrops if needed)
- ✅ Audio (HTMLAudioElement — for opt-in piano sustain on memorial)
- ❌ No GSAP, no Lenis, no framework — keep it that way per V2 self-review

### 1.6 Existing chatbot behavior

- `.chatbot__bubble` toggle (hidden by premiere — Harry replaces it)
- `.chatbot__panel` modal
- `#chatbot-toggle` opens, `#chatbot-close` closes
- **Phase 1 reality:** FAQ + fallback. No real AI yet. Returns hardcoded answers via `frontend/js/chatbot.js`. Backend `/chatbot-question.php` exists.
- Harry's `<button>` (premiere usher) calls `#chatbot-toggle.click()` → opens existing panel
- **Gap:** the chatbot doesn't yet adapt content per page. A user on the Capsule page asking "what should I write" gets the same fallback as on Tickets. Phase 1.5 work (separate plan).

### 1.7 Image generation needs (current state)

- ❌ **nano-banana / Gemini** — API key expired (GAP-2026-05-05-03)
- ⚠️ **Adobe Firefly** — skill is registered (`adobe-firefly`), authentication state unverified
- ⚠️ **Canva** — MCP plugin registered (`mcp__plugin_marketing_canva__*`), auth required
- ✅ **Manual creation by Fritz** — always available, but bottleneck
- ✅ **CSS / SVG only** — no external dependency, used as v1 fallback throughout

Implication for V3: design first, declare every image need with its prompt and fallback (§5). Do not avoid asking just because a tool is currently down.

### 1.8 SVG / component needs

| Component | Status |
|---|---|
| Golden filmstrip frame | Not built — V3 design priority |
| Golden filmstrip ribbon divider | Not built — V3 design priority |
| Sprocket-hole `<symbol>` | Drafted in CSS (`through-years.html` border) |
| Wax seal | CSS-only drafted; SVG version desirable |
| Cinema-seat row | CSS-only drafted (8 seats); could elevate to SVG |
| Vinyl record | CSS gradient drafted (rotates) |
| Marquee bulbs | CSS keyframes drafted (12 bulbs, chase) |
| Medallion menu (radial spokes) | Not built — V3 design priority |
| Cinema countdown leader (5,4,3,2,1) | Not built — needed for RSVP + Through-Years |
| Brand mark silver-foil reframe | Existing PNG; CSS sheen overlay possible |

### 1.9 Animated typography opportunities

Already used (V1):
- Hero "Thirty Years Of / Hi-Tides" — Playfair, glyph-stagger settle ✅
- "MBSH presents" — Allura cursive fade-in (curtain title) ✅
- "Welcome back, Class of '96" — Allura overlay fade-in ✅

V3 expansion (proposed — see §6):
- Page-header titles letter-by-letter on first arrival (RSVP "TAKE YOUR SEAT", Tickets "THE NIGHT", etc.)
- Section-title cards (Playfair scale-in + tracking-tighten via `transform: scale()` not `letter-spacing`)
- Cinema countdown leader ("5", "4", "3"...) on RSVP + Through-Years
- Capsule "Sealed" — Great Vibes script draw-on
- Memorial "In Memory" — Allura cursive draw-on (slow, reverent)
- Metallic shimmer mask on hero CTA "Reserve Your Seat"
- Slate/typewriter for `<time>` and small metadata (JetBrains Mono)

### 1.10 Accessibility / performance constraints

- Mobile-first audience (alums 46-50, on phones at 11pm, frequently on slow-3G)
- Lighthouse mobile target: ≥85 perf, ≥95 a11y, ≥95 best-practices
- WCAG 2.1 AA color contrast — every cream-on-velvet pairing must clear 4.5:1
- `prefers-reduced-motion` and `prefers-reduced-data` are non-negotiable gates
- Keyboard navigation throughout (Tab, Enter, Esc, Arrows where applicable)
- Screen-reader silence on decorative elements; semantic content stays accessible
- iOS Safari momentum-scroll quirks with `scroll-snap-type: y mandatory`
- `backdrop-filter` fallback for older Android via `@supports`
- Animation budget: ≤12% CPU on mid-tier Android per Chrome perf case study

### 1.11 Fallback behavior catalog

For every capability that might be missing, document the fallback before designing the feature.

| Capability | If unavailable, fall back to |
|---|---|
| Image gen for raster asset | CSS gradient + SVG composite (already proven in V1 placeholders) |
| `view()` timeline | IntersectionObserver + class toggle |
| `scroll-snap-type: y mandatory` | `scroll-snap-type: y proximity` |
| `scrollend` event | `scroll` event + 150ms debounce |
| `backdrop-filter: blur()` | Solid-color background with reduced opacity |
| Web Animations API | CSS keyframes |
| Canvas particles | Static SVG |
| Custom audio | Silent, button shows but plays nothing (hide button if no audio) |
| `prefers-reduced-motion: reduce` | Fade-only transitions, no parallax/pin/spin |
| `prefers-reduced-data: reduce` | Skip backdrop video, use poster image |
| `connection.saveData === true` | Same as reduced-data |
| Harry pose missing | Use closest available pose + log to gap register |

---

## 2. Agent / Specialist Consultation Protocol

**For every major page and every major section, simulate the seven specialist roles and document their notes BEFORE proposing implementation.**

### 2.1 The seven roles

| Role | Question they answer | Output |
|---|---|---|
| **Creative Director** | What should this section feel like? | Tone, emotional purpose, connection to overall metaphor |
| **Experience Designer** | What should the user do next? | User action, next-page suggestion, friction points |
| **Motion Designer** | What movement or transition belongs here? | Entry, exit, scroll behavior, duration, easing |
| **Character Director** | What should Hi-Tide Harry do? | Pose, position, action, peek/walk/celebrate trigger |
| **Asset Director** | What images, poses, SVGs, or backgrounds are needed? | Asset list with new vs existing, prompts if needed |
| **Frontend Architect** | What is the cleanest implementation? | HTML/CSS/JS/SVG split, file targets, single-flag respect |
| **Accessibility / Performance Critic** | What could break or become annoying? | A11y risks, perf risks, reduced-motion fallback |

### 2.2 Protocol enforcement

For each section, the Scene Brief Sheet (§3) is the **output of the consultation**. The fields in §3 map to specialist concerns:

| Scene field | Owning role(s) |
|---|---|
| Emotional purpose | Creative Director |
| User action | Experience Designer |
| Harry behavior | Character Director |
| Background / layer treatment | Creative Director + Asset Director |
| Animation or transition | Motion Designer |
| Asset needs | Asset Director |
| Missing poses or images | Asset Director + Character Director |
| Suggested image-gen prompts | Asset Director |
| Implementation method | Frontend Architect |
| Mobile behavior | Frontend Architect + A11y Critic |
| Reduced-motion fallback | A11y Critic |
| Next-page suggestion | Experience Designer |
| Risk level | A11y Critic + Frontend Architect |
| Open questions | All |

### 2.3 Simulation discipline

When no separate agent is available, the builder explicitly writes notes from each role's perspective. The Scene Brief Sheets in §3 demonstrate the protocol applied. New sections added in the future MUST go through this same consultation and produce a Scene Brief Sheet before implementation begins.

If two roles disagree (Creative Director wants a video, A11y Critic flags 2-second LCP regression), the disagreement is logged in §8 Decision Log with the resolution.

---

## 3. Scene Brief Sheet for Every Page Section

Every section of every page gets its own brief. Format below applied uniformly.

### Legend
- **Risk:** L = low, M = med, H = high
- **Method:** CSS / SVG / JS / IMG (raster) / VID / mixed
- **Pose status:** ✅ exists / ❌ missing → see §4

---

### 3.1 HOME — *The Premiere Arrival*

#### 3.1.1 Hero
| Field | Detail |
|---|---|
| Emotional purpose | Awe + arrival. First impression. "Sit up in bed" within 3 seconds. |
| User action | Watch the title settle. Scroll, or tap the CTA. |
| Harry behavior | Walks in from off-screen bottom-right, waves (`01-wave-hello.png`), settles |
| Background / layer | L0: existing `05-dancefloor-confetti.mp4` (working); L1: grain + light leak overlay (existing) |
| Animation or transition | Curtain rise (1.2s) → "MBSH presents" Allura fade-in → glyph-stagger title settle → date type-in → CTA pulse → Harry walk-in |
| Asset needs | All existing |
| Missing poses or images | None for hero |
| Image-gen prompts | None |
| Implementation method | CSS keyframes + JS curtain controller (sessionStorage gate) |
| Mobile behavior | Same sequence but no walk-in animation; pose appears in place |
| Reduced-motion fallback | Skip curtain entirely; instant reveal of hero with title; no glyph stagger |
| Next-page suggestion | Scroll prompt at bottom — chevron + "Let us be known for our deeds" |
| Risk | L |
| Open questions | None |

#### 3.1.2 Story — Then (1996)
| Field | Detail |
|---|---|
| Emotional purpose | Time-machine. "We were 17 here." |
| User action | Read caption, feel the year |
| Harry behavior | Walks left, points at the photo (`08-pointing.png`); subtle peek from photo edge |
| Background / layer | L0: stage backdrop continues; L2: full-bleed `then-1996-hallway.jpg` with Ken Burns scale |
| Animation or transition | Image scale 1.0 → 1.06 over 8s linear; caption fade-up on view; Harry walk to position |
| Asset needs | Existing photo |
| Missing poses | ❌ Harry "pointing-left" (current 08 points forward) — see §4 |
| Image-gen prompts | None new for image |
| Implementation method | CSS scale transition + IntersectionObserver `.is-active` toggle |
| Mobile behavior | No walk; Harry pose-swap in place |
| Reduced-motion fallback | Static image, fade-only caption |
| Next-page suggestion | Scroll continues to Now |
| Risk | L |
| Open questions | Should Then have a soundbite (e.g. period reference) overlaid? |

#### 3.1.3 Story — Now (2026 / Miami Beach)
| Field | Detail |
|---|---|
| Emotional purpose | Same place, thirty years later. Continuity. |
| User action | Feel the contrast |
| Harry behavior | Peeks from behind the photo edge — head and one hand visible |
| Background / layer | L2: `now-miami-beach.jpg` Ken Burns opposite direction |
| Animation or transition | Crossfade from Then; opposite-direction scale; caption fade |
| Asset needs | Existing photo |
| Missing poses | ❌ Harry "peeking-from-edge" — see §4 |
| Image-gen prompts | None for image |
| Implementation method | CSS + IO |
| Mobile behavior | No peek (replace with pose swap to listening) |
| Reduced-motion fallback | Static image |
| Next-page suggestion | Continues to Forever |
| Risk | L |
| Open questions | None |

#### 3.1.4 Story — Forever (the 30+100 brand mark)
| Field | Detail |
|---|---|
| Emotional purpose | Legacy. Two milestones converge. |
| User action | Feel weight of the moment |
| Harry behavior | Stands proud beside the brand mark; chest out, salute pose if available |
| Background / layer | L0: night-sky background bleeds through; L2: brand-mark centered |
| Animation or transition | Brand mark scale 0.85 → 1 + scarlet rim-light pulse; brief glow |
| Asset needs | Existing brand-mark.png |
| Missing poses | ❌ Harry "standing-respectfully" or "saluting" — closest existing is `02-thumbs-up.png` (less appropriate) — see §4 |
| Image-gen prompts | New brand-mark with silver-foil sheen (already declared, GAP-03 blocked) |
| Implementation method | CSS + IO |
| Mobile behavior | Same |
| Reduced-motion fallback | No pulse glow; static |
| Next-page suggestion | Scroll to Event Details |
| Risk | L |
| Open questions | Acceptable to add a short audio cue here (chime)? Brief says no autoplay — consider opt-in only |

#### 3.1.5 Event Details (with marquee)
| Field | Detail |
|---|---|
| Emotional purpose | The factual frame: when, where, what. Excitement. |
| User action | Confirm the date / venue / dress code; scan |
| Harry behavior | Excited cheer (`04-excited-cheer.png`) when marquee chase first ignites |
| Background / layer | L0: night sky; L2: marquee bulbs above grid |
| Animation or transition | Marquee chase loop (existing); grid items stagger fade-in 80ms |
| Asset needs | All existing |
| Missing poses | None (cheer exists) |
| Image-gen prompts | None |
| Implementation method | CSS keyframes + IO |
| Mobile behavior | Marquee simplified to fewer bulbs; chase still loops |
| Reduced-motion fallback | Bulbs static at full opacity, no chase |
| Next-page suggestion | Scroll to cards / poster wall |
| Risk | L |
| Open questions | Can we light up bulbs in a ring around the chosen RSVP CTA? |

#### 3.1.6 Cards / Poster Wall
| Field | Detail |
|---|---|
| Emotional purpose | "Six more scenes ahead." A wall of forthcoming chapters, not buttons. |
| User action | Choose a destination |
| Harry behavior | Steps aside (off-frame) so he doesn't block the posters; moves to footer area |
| Background / layer | L0: ambient backdrop continues; L2: 6 poster cards in golden filmstrip frames |
| Animation or transition | Each card lifts on hover -12px + slight rotation -0.5°; spotlight halo on hover; gold-frame edge gleam sweep |
| Asset needs | Golden filmstrip frame (NEW SVG); spotlight halo (CSS); poster typography (Playfair display 900) |
| Missing poses | None — Harry steps aside |
| Image-gen prompts | None — frames are SVG, posters typographic |
| Implementation method | CSS Grid + SVG inline frame + CSS hover |
| Mobile behavior | 2-column poster grid; tap-to-navigate; no hover lift |
| Reduced-motion fallback | No lift, no rotation; static cards with focus outline |
| Next-page suggestion | The card itself IS the next-page choice. Below the wall: "Where to next?" banner highlights closest CTA. |
| Risk | M — golden filmstrip frame is a new SVG component; needs visual approval before propagation |
| Open questions | Should each poster have a numeric "scene 02 / scene 03" label? Should the active "next CTA" poster pulse? |

#### 3.1.7 Footer
| Field | Detail |
|---|---|
| Emotional purpose | Closing slate / end credits |
| User action | Scan, find committee email, leave or loop back |
| Harry behavior | Salute (`02-thumbs-up.png` adjacent — or NEW "salute" pose) |
| Background / layer | L0: backdrop fades to off-black; L2: footer with brand identity |
| Animation or transition | None on entry; static |
| Asset needs | Existing |
| Missing poses | ❌ "Harry-salute" (proper salute, not thumbs up) — see §4 |
| Image-gen prompts | Optional — see §4 |
| Implementation method | Existing markup, premiere.css polish |
| Mobile behavior | Stack columns |
| Reduced-motion fallback | n/a |
| Next-page suggestion | Compass / medallion menu |
| Risk | L |
| Open questions | None |

---

### 3.2 RSVP — *Take Your Seat*

#### 3.2.1 Page header (Take Your Seat)
| Field | Detail |
|---|---|
| Emotional purpose | "This is where I commit." |
| User action | Read the title, feel the weight |
| Harry behavior | Sits in a cinema seat (off to the side) — pose missing |
| Background / layer | L0: empty cinema seats receding into darkness; L2: page header centered |
| Animation or transition | Page-header curtain raise; "TAKE YOUR SEAT" letter-by-letter (Playfair display 900) |
| Asset needs | Cinema-seat row SVG (drafted); cinema seats backdrop (NEW IMG) |
| Missing poses | ❌ "Harry-seated" — see §4 |
| Image-gen prompts | Backdrop: "Empty cinema theater seats receding into darkness, slight low-angle, scarlet velvet seats with gold trim, cinematic depth-of-field, soft amber spot lighting, photoreal" |
| Implementation method | CSS + JS title-stagger; SVG seat row; IMG or CSS-gradient backdrop |
| Mobile behavior | Title scales smaller; seat row simplified to scarlet rule |
| Reduced-motion fallback | Title appears instantly; no curtain raise |
| Next-page suggestion | Scroll to countdown |
| Risk | M — needs Harry-seated pose or graceful fallback |
| Open questions | Should "TAKE YOUR SEAT" be all-caps or sentence case? V2 says caps; designer can argue either. |

#### 3.2.2 Countdown to the night (cinema-leader styled)
| Field | Detail |
|---|---|
| Emotional purpose | "It's coming. The night is real." |
| User action | Watch numbers tick down |
| Harry behavior | Stands beside the countdown, points at it (`08-pointing.png`) |
| Background / layer | L0 continues; L2: countdown grid styled as cinema-leader (5,4,3 rotating numerals) |
| Animation or transition | Cinema countdown leader plays once on first scroll into section (5→4→3→2→1, ~1.5s); then settles into normal countdown clock |
| Asset needs | Existing countdown logic; new SVG for cinema-leader frame |
| Missing poses | None (existing pointing works) |
| Image-gen prompts | None |
| Implementation method | CSS keyframes + existing JS clock |
| Mobile behavior | Cinema-leader plays once; clock smaller |
| Reduced-motion fallback | Skip the leader; show the clock immediately |
| Next-page suggestion | Scroll to form |
| Risk | L |
| Open questions | Should the leader play every visit or once per session? Default: every visit (small treat). |

#### 3.2.3 The Form (active reel frame)
| Field | Detail |
|---|---|
| Emotional purpose | Commitment. "I'm in." |
| User action | Fill RSVP fields, submit |
| Harry behavior | Leans toward the form; on each field focus, slight head tilt; on submit success → cheer + ticket-stub flip |
| Background / layer | L0 continues; L2: form rendered as the active golden filmstrip frame, sub-frames before/after dimmed |
| Animation or transition | Active frame fades into focus; on submit, frame brightens, ticket stub flips out |
| Asset needs | Golden filmstrip frame (NEW SVG); ticket-stub mask (CSS done); Harry holding ticket stub (NEW POSE) |
| Missing poses | ❌ "Harry-holding-ticket-stub" — see §4 |
| Image-gen prompts | None new beyond Harry pose |
| Implementation method | SVG frame + CSS form styling + JS event listener for form success |
| Mobile behavior | Frame becomes thin gold border; ticket stub renders inline |
| Reduced-motion fallback | No flip; ticket stub appears instantly |
| Next-page suggestion | Capsule (post-success) — `next-page` panel |
| Risk | M |
| Open questions | Should the ticket stub be downloadable as PNG (canvas-to-image)? Defer to follow-up. |

#### 3.2.4 What to expect that night (3 mini-cards)
| Field | Detail |
|---|---|
| Emotional purpose | "Here's what the night looks like." Hype. |
| User action | Scan the three time blocks |
| Harry behavior | Walks across to point at the active card on hover |
| Background / layer | L0 continues; L2: 3 mini-cards (existing pattern) |
| Animation or transition | Cards stagger-fade-in on view; hover lift |
| Asset needs | Existing mini-card pattern |
| Missing poses | ❌ "Harry-pointing-across" (different angle from forward point) — see §4 |
| Image-gen prompts | None |
| Implementation method | CSS Grid + IO + premiere.css mini-card styles |
| Mobile behavior | Stack vertical; no walk; pose-swap in place |
| Reduced-motion fallback | No stagger; instant reveal |
| Next-page suggestion | Scroll to "Why this night" |
| Risk | L |
| Open questions | None |

#### 3.2.5 Why this night, why now
| Field | Detail |
|---|---|
| Emotional purpose | Emotional close. The "you should be there" moment. |
| User action | Read, decide |
| Harry behavior | Stands quietly beside text — `06-listening.png` |
| Background / layer | L0; L2: text block centered |
| Animation or transition | Text fade-in on view |
| Asset needs | None |
| Missing poses | None |
| Image-gen prompts | None |
| Implementation method | Existing |
| Mobile behavior | Same |
| Reduced-motion fallback | Instant text |
| Next-page suggestion | Capsule or back to Home |
| Risk | L |
| Open questions | None |

---

### 3.3 TICKETS — *Patrons of the Evening*

#### 3.3.1 Page header (The Night)
| Field | Detail |
|---|---|
| Emotional purpose | "This is what fills the room." |
| User action | Read the title |
| Harry behavior | Stands at the start of the red carpet, presenting an announcement board — pose missing |
| Background / layer | L0: red carpet runway with stanchion ropes; L2: page header |
| Animation or transition | Red velvet curtain swipe from sides revealing tier wall |
| Asset needs | Red carpet backdrop (NEW IMG); stanchion rope SVG (NEW); Harry-presenting-board pose (NEW) |
| Missing poses | ❌ "Harry-presenting-announcement-board" — see §4 |
| Image-gen prompts | Backdrop: "Red carpet runway leading toward the camera, gold stanchion ropes on either side, deep velvet drapes in background, soft amber spotlights overhead, photoreal cinematic composition" |
| Implementation method | CSS + SVG + IMG |
| Mobile behavior | Carpet simplified to gradient |
| Reduced-motion fallback | No curtain swipe; instant reveal |
| Next-page suggestion | Scroll to tier posters |
| Risk | M |
| Open questions | None |

#### 3.3.2 Tickets (Early Bird / Regular / Couple)
| Field | Detail |
|---|---|
| Emotional purpose | "Pick your tier." |
| User action | Compare tiers, choose, click |
| Harry behavior | Steps to hovered tier on desktop |
| Background / layer | L0 continues; L2: 3 framed posters on the wall |
| Animation or transition | Posters lift on hover; spotlight follows cursor |
| Asset needs | Golden filmstrip frame (NEW SVG); poster typography (existing fonts) |
| Missing poses | ❌ "Harry-walk-frames" (for stepping) — see §4 |
| Image-gen prompts | None |
| Implementation method | SVG frames + CSS Grid + IO |
| Mobile behavior | Stack vertical; no step animation |
| Reduced-motion fallback | No lift, no spotlight follow |
| Next-page suggestion | Scroll to "Become a Patron" |
| Risk | M |
| Open questions | None |

#### 3.3.3 Become a Patron (sponsor tiers)
| Field | Detail |
|---|---|
| Emotional purpose | "Help fund the night, get the credit." |
| User action | Scan tiers, click email link |
| Harry behavior | Salute on hover of any tier |
| Background / layer | L0; L2: 3 tier mini-cards |
| Animation or transition | Foil shimmer on hover (existing) |
| Asset needs | Tier medallions (DEFERRED RASTER — GAP-03 blocked); CSS gradient fallback in use |
| Missing poses | ❌ "Harry-salute" — see §4 |
| Image-gen prompts | Tier medallions described in V1 plan; remain blocked |
| Implementation method | CSS + premiere.css mini-card |
| Mobile behavior | Stack; foil disabled |
| Reduced-motion fallback | No shimmer |
| Next-page suggestion | Scroll to "Why your patronage matters" |
| Risk | L |
| Open questions | When tier medallions ship in Pass 2, does each poster get an embossed medallion in its top-left? |

#### 3.3.4 Why your patronage matters
| Field | Detail |
|---|---|
| Emotional purpose | Emotional close. "Here's what your money does." |
| User action | Read |
| Harry behavior | Listening pose |
| Background / layer | L0; L2: text |
| Animation or transition | Fade-in on view |
| Asset needs | None |
| Missing poses | None |
| Image-gen prompts | None |
| Implementation method | Existing |
| Mobile behavior | Same |
| Reduced-motion fallback | Instant |
| Next-page suggestion | Capsule or RSVP |
| Risk | L |
| Open questions | None |

---

### 3.4 THROUGH THE YEARS — *The Trailer Reel*

#### 3.4.1 Reel-leader countdown intro
| Field | Detail |
|---|---|
| Emotional purpose | "The reel begins." Set the mode. |
| User action | Watch ~1.5s |
| Harry behavior | Off-screen during countdown; appears at first era |
| Background / layer | L0: dark screening room with projector beam |
| Animation or transition | Cinema reel-leader (5→4→3→2→1) center-screen, scratchy frame edges, brief flicker |
| Asset needs | Cinema-leader SVG (NEW); projector beam backdrop (CSS gradient OK) |
| Missing poses | None |
| Image-gen prompts | None — SVG-driven |
| Implementation method | SVG keyframes |
| Mobile behavior | Same intro |
| Reduced-motion fallback | Skip leader; first era loads immediately |
| Next-page suggestion | Eras |
| Risk | L |
| Open questions | Once-per-session or every-visit? Default: every visit. |

#### 3.4.2 Era 1926-1959
| Field | Detail |
|---|---|
| Emotional purpose | "The first Hi-Tides. The foundation." |
| User action | Look, read caption |
| Harry behavior | Peeks from behind the era frame |
| Background / layer | L0: sepia hallway gradient; L2: era card |
| Animation or transition | Era card fade-up + scale on snap-stop |
| Asset needs | Existing `era-1926-1959.jpg` |
| Missing poses | ❌ "Harry-peek-from-behind" — see §4 |
| Image-gen prompts | None for image |
| Implementation method | CSS + IO + scroll-snap-stop |
| Mobile behavior | Vertical snap-card |
| Reduced-motion fallback | Static |
| Next-page suggestion | Snap to next era |
| Risk | M (peek pose missing) |
| Open questions | None |

#### 3.4.3 Era 1960s-1970s
Same pattern as 3.4.2. Harry peeks from a different side.

#### 3.4.4 Era 1980s
Same pattern. Harry-thinking pose appropriate (`03-thinking.png`).

#### 3.4.5 Era 1996 (longer pause)
| Field | Detail |
|---|---|
| Emotional purpose | "Our year." Pause and feel it. |
| User action | Linger; remember |
| Harry behavior | Jumps out and waves big — full cheer pose (`04-excited-cheer.png`) |
| Background / layer | L0; L2: era card with longer scroll-snap-stop |
| Animation or transition | Era card scale up slightly; scarlet glow inset; Harry cheer animation |
| Asset needs | Existing |
| Missing poses | None |
| Image-gen prompts | None |
| Implementation method | CSS scroll-snap-stop with longer dwell + IO |
| Mobile behavior | Vertical snap; same emphasis |
| Reduced-motion fallback | No scale, no glow pulse |
| Next-page suggestion | Snap to 2026 |
| Risk | L |
| Open questions | None |

#### 3.4.6 Era 2026 (now)
| Field | Detail |
|---|---|
| Emotional purpose | "Still rising. The night is now." |
| User action | Feel the closure of the arc |
| Harry behavior | Salute |
| Background / layer | L0; L2: era card with scarlet pulse |
| Animation or transition | Scarlet inset pulse loop (existing) |
| Asset needs | Existing |
| Missing poses | ❌ "Harry-salute" |
| Image-gen prompts | None |
| Implementation method | CSS keyframes |
| Mobile behavior | Same |
| Reduced-motion fallback | No pulse |
| Next-page suggestion | Add a Memory |
| Risk | L |
| Open questions | None |

#### 3.4.7 Add a Memory (clipboard-styled form)
| Field | Detail |
|---|---|
| Emotional purpose | "Add yours to the wall." |
| User action | Submit a story + optional photo |
| Harry behavior | Holds a clipboard, nods |
| Background / layer | L0; L2: form styled as director's clipboard page |
| Animation or transition | Clipboard tilts slightly on hover; submit triggers Harry stamp + nod |
| Asset needs | Clipboard SVG (NEW SIMPLE) |
| Missing poses | ❌ "Harry-holding-clipboard" — see §4 |
| Image-gen prompts | None new beyond Harry pose |
| Implementation method | SVG + CSS + JS form |
| Mobile behavior | Clipboard simplified to text frame |
| Reduced-motion fallback | No tilt |
| Next-page suggestion | Memorial or Playlist |
| Risk | M (clipboard pose missing) |
| Open questions | Photo upload size limit? Existing 2MB OK. |

---

### 3.5 MEMORIAL — *In Memoriam*

#### 3.5.1 Header (In Memory)
| Field | Detail |
|---|---|
| Emotional purpose | Reverence. "We carry these names." |
| User action | Read, breathe, scroll slowly |
| Harry behavior | NOT VISIBLE on this page (V2 rule preserved) |
| Background / layer | L0: distant stars + single moon; L1 dialed to 35% opacity |
| Animation or transition | Allura "In Memory" cursive draw-on (slow, 1.6s); italic subhead fade |
| Asset needs | Cursive draw-on technique (SVG stroke-dashoffset) |
| Missing poses | n/a — Harry hidden |
| Image-gen prompts | Distant moon SVG (small, NEW) |
| Implementation method | SVG + CSS |
| Mobile behavior | Same |
| Reduced-motion fallback | Title appears instantly |
| Next-page suggestion | Scroll to names |
| Risk | L |
| Open questions | Should we add a candle SVG that flickers gently? V1 mentioned, never built. Decision in §8. |

#### 3.5.2 Names list
| Field | Detail |
|---|---|
| Emotional purpose | The reverent reading |
| User action | Read each name; pause |
| Harry behavior | NOT VISIBLE |
| Background / layer | Same |
| Animation or transition | Each name fades up on view + silver-foil rule beneath; 200ms stagger between names |
| Asset needs | Existing |
| Missing poses | n/a |
| Image-gen prompts | None |
| Implementation method | IO + CSS (existing in V1) |
| Mobile behavior | Same |
| Reduced-motion fallback | Names appear instantly |
| Next-page suggestion | Scroll to "Add a Name" |
| Risk | L |
| Open questions | Optional opt-in piano sustain audio — decision in §8 |

#### 3.5.3 Add a Name
| Field | Detail |
|---|---|
| Emotional purpose | Pathway for committee curation |
| User action | Email the committee |
| Harry behavior | NOT VISIBLE |
| Background / layer | Same |
| Animation or transition | Fade-in on view |
| Asset needs | None |
| Missing poses | n/a |
| Image-gen prompts | None |
| Implementation method | Existing |
| Mobile behavior | Same |
| Reduced-motion fallback | Instant |
| Next-page suggestion | Scroll to "At the reunion" |
| Risk | L |
| Open questions | None |

#### 3.5.4 At the reunion
| Field | Detail |
|---|---|
| Emotional purpose | Closing reverence statement |
| User action | Read |
| Harry behavior | NOT VISIBLE |
| Background / layer | Same |
| Animation or transition | Fade-in |
| Asset needs | None |
| Missing poses | n/a |
| Image-gen prompts | None |
| Implementation method | Existing |
| Mobile behavior | Same |
| Reduced-motion fallback | Instant |
| Next-page suggestion | "Share a memory" → Through the Years |
| Risk | L |
| Open questions | None |

---

### 3.6 CAPSULE — *The Letter to Yourself*

#### 3.6.1 Header (The Letter)
| Field | Detail |
|---|---|
| Emotional purpose | "Personal. Quiet. To you, from you." |
| User action | Read, prepare to write |
| Harry behavior | Sits at desk corner, holds pen — pose missing |
| Background / layer | L0: wood desk top, single lamp glow upper-left, rest in shadow; subtle parchment overlay |
| Animation or transition | Curtain rise reveals envelope on desk |
| Asset needs | Wood desk + lamp glow backdrop (NEW IMG); Harry-with-pen pose (NEW) |
| Missing poses | ❌ "Harry-with-pen" or "Harry-seated-at-desk" — see §4 |
| Image-gen prompts | Backdrop: "Wood desk surface from slight angle, single brass desk lamp casting warm pool of light upper-left, parchment grain texture, dark recesses, photoreal moody composition" |
| Implementation method | IMG backdrop + CSS curtain |
| Mobile behavior | Backdrop simplified |
| Reduced-motion fallback | No curtain |
| Next-page suggestion | Scroll to envelope |
| Risk | M |
| Open questions | None |

#### 3.6.2 The Envelope (the form)
| Field | Detail |
|---|---|
| Emotional purpose | "Open it. Begin." |
| User action | Click envelope to open; type your letter |
| Harry behavior | Leans in as user writes |
| Background / layer | L0; L2: envelope graphic with wax seal (NEW SVG) |
| Animation or transition | Envelope flap opens on scroll/click; letter slides out; fields written on letter; on submit → wax seal animation |
| Asset needs | Wax seal SVG (drafted CSS-only — could elevate); envelope+letter SVG (NEW); Harry-stamping-wax pose (NEW) |
| Missing poses | ❌ "Harry-stamping-wax-seal" or close substitute — see §4 |
| Image-gen prompts | Wax seal: "Scarlet wax stamp pressed into folded cream parchment, '96 monogram embossed, deckled edges, photoreal close-up" |
| Implementation method | SVG inline + CSS keyframes + JS form event |
| Mobile behavior | Envelope vertical card; wax simpler |
| Reduced-motion fallback | No flap; form appears instantly |
| Next-page suggestion | RSVP after submit |
| Risk | M |
| Open questions | Does the success state show a sealed envelope graphic with the user's name on it? (Premium touch.) |

#### 3.6.3 What to write your younger self (3 prompts)
| Field | Detail |
|---|---|
| Emotional purpose | "Stuck? Here are starters." |
| User action | Pick a prompt, return to form |
| Harry behavior | Points at the active prompt on hover |
| Background / layer | L0; L2: 3 mini-cards |
| Animation or transition | Stagger fade-in on view |
| Asset needs | Existing mini-card pattern |
| Missing poses | None |
| Image-gen prompts | None |
| Implementation method | Existing |
| Mobile behavior | Stack |
| Reduced-motion fallback | No stagger |
| Next-page suggestion | Back to envelope |
| Risk | L |
| Open questions | None |

#### 3.6.4 We deliver on the day
| Field | Detail |
|---|---|
| Emotional purpose | The promise. "We won't read it. It comes to you." |
| User action | Read |
| Harry behavior | Stands quiet listening |
| Background / layer | L0; L2: text |
| Animation or transition | Fade-in |
| Asset needs | None |
| Missing poses | None |
| Image-gen prompts | None |
| Implementation method | Existing |
| Mobile behavior | Same |
| Reduced-motion fallback | Instant |
| Next-page suggestion | RSVP |
| Risk | L |
| Open questions | None |

---

### 3.7 PLAYLIST — *Encore*

#### 3.7.1 Header (Encore)
| Field | Detail |
|---|---|
| Emotional purpose | "The night extends into your headphones." |
| User action | Read title, anticipate music |
| Harry behavior | Beside vinyl, mimes air-conducting — pose missing |
| Background / layer | L0: smoke spotlight pools converging center stage |
| Animation or transition | "Encore" cursive (Allura) fade-in |
| Asset needs | Spotlight pools backdrop (CSS-only OK); Harry-conducting pose (NEW) |
| Missing poses | ❌ "Harry-conducting" or "Harry-dancing" — see §4 |
| Image-gen prompts | Optional backdrop: "Stage with two converging spotlight pools (one warm amber, one scarlet-edged) cutting through smoke from above, dark stage floor, photoreal cinematic" |
| Implementation method | CSS + (optional) IMG |
| Mobile behavior | Spotlight simplified |
| Reduced-motion fallback | Title instant |
| Next-page suggestion | Scroll to vinyl |
| Risk | M |
| Open questions | Should we add a stylus drop sound (opt-in)? Brief: no autoplay; opt-in only. |

#### 3.7.2 Vinyl + Spotify embed
| Field | Detail |
|---|---|
| Emotional purpose | "Press play." |
| User action | Press play (Spotify); browse tracks |
| Harry behavior | Beside vinyl, conducting; on hover of a track row, slight groove |
| Background / layer | L0; L2: vinyl SVG (existing CSS) + Spotify iframe |
| Animation or transition | Vinyl spin-up from black; stylus drop |
| Asset needs | Vinyl SVG (CSS done); stylus SVG (drafted concept); spotify iframe |
| Missing poses | ❌ "Harry-conducting" |
| Image-gen prompts | None new |
| Implementation method | CSS keyframes + iframe |
| Mobile behavior | Vinyl shrinks; iframe full-width |
| Reduced-motion fallback | Vinyl static |
| Next-page suggestion | Scroll to tracklist |
| Risk | L |
| Open questions | Spotify playlist ID still placeholder — needs real ID before ship |

#### 3.7.3 Tracklist (18 tracks)
| Field | Detail |
|---|---|
| Emotional purpose | "Every song that takes you back." |
| User action | Browse, recognize, smile |
| Harry behavior | Slight groove on row hover |
| Background / layer | L0; L2: tracklist (existing) |
| Animation or transition | Rows slide in like credits — bottom-to-top, slow paced |
| Asset needs | Existing |
| Missing poses | None new (groove ≈ existing cheer with slight bounce) |
| Image-gen prompts | None |
| Implementation method | Existing + CSS keyframe for slide |
| Mobile behavior | No slide; static list |
| Reduced-motion fallback | No slide; instant list |
| Next-page suggestion | Scroll to "About the soundtrack" |
| Risk | L |
| Open questions | Real Spotify ID dependency — track this in §8 |

#### 3.7.4 About the soundtrack (3 sides as mini-cards)
| Field | Detail |
|---|---|
| Emotional purpose | "Three flavors of '96 in one night." |
| User action | Scan |
| Harry behavior | Excited pose |
| Background / layer | L0; L2: 3 mini-cards |
| Animation or transition | Stagger fade-in |
| Asset needs | Existing |
| Missing poses | None |
| Image-gen prompts | None |
| Implementation method | Existing |
| Mobile behavior | Stack |
| Reduced-motion fallback | No stagger |
| Next-page suggestion | Suggest a track |
| Risk | L |
| Open questions | None |

#### 3.7.5 Suggest a track
| Field | Detail |
|---|---|
| Emotional purpose | "Add yours to the playlist." |
| User action | Submit a suggestion |
| Harry behavior | Thumbs up on submit |
| Background / layer | L0; L2: form |
| Animation or transition | Fade-in |
| Asset needs | Existing |
| Missing poses | None |
| Image-gen prompts | None |
| Implementation method | Existing |
| Mobile behavior | Same |
| Reduced-motion fallback | Instant |
| Next-page suggestion | RSVP or In Memory |
| Risk | L |
| Open questions | None |

---

## 4. Harry Pose Gap Register

**Existing 10 poses do not cover the V2/V3 choreography. Below: missing poses with filename, use case, prompt, and fallback.**

| # | Filename suggestion | Page / section use | Generation prompt | Fallback if not created |
|---|---|---|---|---|
| 1 | `11-peeking.png` | Story-Now (peek from photo edge); Through-Years era frames | "Hi-Tide Harry character, head and one hand visible peeking from behind a vertical edge, slight smile, looking at viewer, cell-shaded illustration matching canonical character sheet, transparent background" | Use `06-listening.png` (looking sideways) at half opacity |
| 2 | `12-clipboard.png` | Through-Years "Add a Memory" form | "Hi-Tide Harry holding a director's clipboard with film-style production paperwork, looking down at it, pen in other hand, cell-shaded matching canon, transparent background" | Use `03-thinking.png` |
| 3 | `13-ticket-stub.png` | RSVP success state | "Hi-Tide Harry holding up a film ticket stub toward viewer with a proud expression, cape flowing slightly, cell-shaded canonical style, transparent background" | Use `02-thumbs-up.png` |
| 4 | `14-wax-stamping.png` | Capsule submit success | "Hi-Tide Harry pressing a wax stamper down onto an envelope with focused expression, both hands engaged, cell-shaded canonical style, transparent background" | Use `02-thumbs-up.png` |
| 5 | `15-seated-usher.png` | RSVP page header (sitting in cinema seat) | "Hi-Tide Harry seated in a scarlet cinema seat with gold trim, casual relaxed pose, looking forward and to the side, cell-shaded canonical style, transparent background" | Use `06-listening.png` |
| 6 | `16-conducting.png` | Playlist page (mime-conducting beside vinyl) | "Hi-Tide Harry conducting with both arms raised mid-motion as if leading an orchestra, cape trailing, big smile, cell-shaded canonical style, transparent background" | Use `04-excited-cheer.png` |
| 7 | `17-respectful.png` | Memorial page (NOT USED — Harry hidden) — and home Forever section | "Hi-Tide Harry standing respectfully with hands clasped at front, head slightly bowed, calm expression, cape settled, cell-shaded canonical style, transparent background" | Use `06-listening.png` |
| 8 | `18-presenting.png` | Tickets page header (announcement board) | "Hi-Tide Harry holding a vintage cinema announcement board horizontally to one side, gesturing at it with the other hand, presenting expression, cell-shaded canonical style, transparent background" | Use `08-pointing.png` |
| 9 | `19-pointing-down.png` | Various pointing-at-form-below moments | "Hi-Tide Harry pointing down with an extended arm, looking down toward the point direction, cell-shaded canonical style, transparent background" | Use `08-pointing.png` rotated via CSS |
| 10 | `20-pointing-across.png` | RSVP "What to expect" mini-cards | "Hi-Tide Harry pointing across to one side with arm extended horizontally, looking in same direction, cell-shaded canonical style, transparent background" | Use `08-pointing.png` mirrored via CSS transform |
| 11 | `21-pride-celebrate.png` | Story-Forever (30+100 brand mark moment) | "Hi-Tide Harry with both fists raised in triumphant celebration, cape billowing behind, mouth open in cheer, school pride pose, cell-shaded canonical style, transparent background" | Use `04-excited-cheer.png` |
| 12 | `22-walk-frame.png` | Home cross-section walk transitions | "Hi-Tide Harry mid-stride walking toward viewer's right, one foot raised, arms in natural walking swing, looking forward, cell-shaded canonical style, transparent background" | Use `10-running.png` (too dynamic but workable) |
| 13 | `23-salute.png` | Home footer; era 2026; Tickets tier hover | "Hi-Tide Harry giving a casual two-finger salute to forehead with proud smile, other hand on hip, cape settled, cell-shaded canonical style, transparent background" | Use `02-thumbs-up.png` |

**Gen tool routing:** primary = nano-banana once Gemini key restored; secondary = Adobe Firefly skill if auth available; tertiary = manual creation by Fritz / a contracted illustrator. Each pose generation must reference `HI-TIDE-HARRY-CHARACTER-SHEET.md` for canon (skin/cape/quiff/wristbands/cell-shaded style with heavy black outline).

**Fallback discipline:** if a pose ships unfinished, the page that needs it falls back to the closest existing pose AND the §3 Scene Brief Sheet for that section is updated to mark the pose status. The experience does not silently downgrade.

---

## 5. Image / Asset Generation Process

**Asset pipeline. Every asset declared up front, even if currently blocked.**

### 5.1 Asset register

| Asset | Status | Prompt / source | Tool | File path | Dimensions | Transparent | Fallback if not generated | Approval |
|---|---|---|---|---|---|---|---|---|
| Velvet curtain texture | Blocked (GAP-03) | "Deep scarlet velvet curtain fabric, seamless tile, soft folds, photoreal" | nano-banana | `assets/premiere/velvet-curtain.png` | 512×512 | No | CSS scarlet gradient (in use) | Fritz |
| Filmstrip golden frame (SVG) | Not built | Vector design — sprocket holes, gold-foil gradient | inline SVG | `assets/premiere/filmstrip-frame.svg` | scalable | Yes | None — must be built | Fritz |
| Filmstrip ribbon divider (SVG) | Not built | Vector design — flowing gold ribbon strip | inline SVG | `assets/premiere/filmstrip-divider.svg` | scalable | Yes | None — must be built | Fritz |
| Sprocket pattern (SVG `<symbol>`) | Not built | Reusable perforation pattern | inline SVG | (in CSS as data-uri) | n/a | Yes | None | n/a |
| Cinema seat row (SVG) | Drafted CSS | Top-down 8-seat row | SVG version pending | `assets/premiere/seat-row.svg` | scalable | Yes | CSS version (in use) | Fritz |
| Vinyl record (CSS) | Done CSS | n/a | CSS gradient | n/a | n/a | n/a | n/a | done |
| Wax seal (SVG) | Drafted CSS | Scarlet wax with '96 monogram | SVG version pending | `assets/premiere/wax-seal.svg` | scalable | Yes | CSS version (in use) | Fritz |
| Marquee bulbs (CSS) | Done CSS | n/a | CSS keyframes | n/a | n/a | n/a | n/a | done |
| Medallion menu (radial) | Not built | SVG with brand mark center + 7 spokes | inline SVG + CSS | `assets/premiere/medallion-menu.svg` | scalable | Yes | None — must be built | Fritz |
| Cinema countdown leader | Not built | SVG with rotating numerals | inline SVG | `assets/premiere/countdown-leader.svg` | scalable | Yes | None — must be built | Fritz |
| Tier medallions ×4 | Blocked (GAP-03) | Multi-material foil medallions, 30+100 lockup, ribbon | nano-banana | `assets/premiere/tier-{platinum,gold,silver,bronze}.png` | 400×400 | Yes | CSS gradient + foil shimmer (in use) | Fritz |
| Brand mark silver foil | Blocked (GAP-03) | Existing brand mark with metallic silver sheen treatment | nano-banana | `assets/premiere/brand-mark-foil.png` | 600×600 | Yes | Existing brand-mark.png + CSS sheen overlay (works) | Fritz |
| RSVP cinema-seats backdrop | Not generated | "Empty cinema theater seats receding into darkness, scarlet velvet seats with gold trim, cinematic depth-of-field, soft amber spot lighting, photoreal" | nano-banana / Firefly | `assets/premiere/bg-rsvp.jpg` | 1920×1080 | No | CSS gradient (acceptable) | Fritz |
| Tickets red carpet backdrop | Not generated | "Red carpet runway leading toward camera, gold stanchion ropes on either side, deep velvet drapes in background, soft amber spotlights overhead, photoreal cinematic" | nano-banana / Firefly | `assets/premiere/bg-tickets.jpg` | 1920×1080 | No | CSS gradient (acceptable) | Fritz |
| Through-Years projector beam backdrop | Not generated | "Dark screening room with single projector beam cutting across the space, dust motes drifting in beam, photoreal cinematic" | nano-banana / Firefly | `assets/premiere/bg-through-years.jpg` | 1920×1080 | No | CSS gradient (acceptable) | Fritz |
| Memorial moon SVG | Not built | Single distant moon on near-black, very subtle | inline SVG | `assets/premiere/moon.svg` | small | Yes | None — small SVG, must be built | Fritz |
| Capsule desk-top backdrop | Not generated | "Wood desk surface from slight angle, single brass desk lamp casting warm pool of light upper-left, parchment grain, dark recesses, photoreal moody" | nano-banana / Firefly | `assets/premiere/bg-capsule.jpg` | 1920×1080 | No | CSS gradient (acceptable) | Fritz |
| Capsule envelope + letter | Not built | SVG component: closed envelope with wax seal + paper sliding out | inline SVG + CSS | `assets/premiere/envelope.svg` | scalable | Yes | None — must be built | Fritz |
| Playlist spotlight pools backdrop | Optional | "Stage with converging warm and scarlet spotlight pools cutting through smoke, photoreal cinematic" | nano-banana / Firefly | `assets/premiere/bg-playlist.jpg` | 1920×1080 | No | CSS gradient (works) | Fritz |
| Existing video assets | Available | n/a | n/a | `assets/backgrounds/01-04.mp4` | 1080p | n/a | n/a | already in repo |

### 5.2 Pipeline rules

- **Approval checkpoint:** Fritz reviews any new visible asset before it goes into a deploy. No raster image enters the deploy repo without explicit approval.
- **Prompt parity:** every prompt above is the prompt used. If we re-generate, we use the same prompt or document the diff in §8.
- **Naming:** `bg-<page>.jpg` for backdrops, `<n>-<pose>.png` for Harry poses (next free numbers 11–23+), all SVGs in `assets/premiere/<descriptive-kebab>.svg`.
- **Format:** PNG with alpha for character poses; JPG for photographic backgrounds; SVG for everything compositional.
- **Optimization:** PNGs run through `pngcrush` or `oxipng`; JPGs run through `mozjpeg` at quality 78–82; SVGs run through SVGO.
- **Performance:** any single asset >300KB requires LCP impact analysis before being added.
- **Fallback discipline:** every asset has a fallback in this register. If asset unavailable, fallback ships and the gap is marked.

---

## 6. Animated Typography Guidance

**Animated type is allowed where it supports the cinematic experience. Forbidden where it punishes readability.**

### 6.1 Where animated type IS allowed

- Hero title reveals (page 1 + first arrival on each inner page)
- "MBSH presents" (curtain title)
- Section title cards (when first scrolled into view)
- Cinema countdown leaders (5,4,3,2,1)
- Page opening moments
- Harry announcement / speech bubble cards (when Harry presents something)
- RSVP confirmation ticket (the stub typography)
- Time Capsule "Sealed" success state
- Marquee text on event-details

### 6.2 Where animated type is NOT allowed

- Body paragraphs
- Long reading content (Why this night, About the soundtrack body, etc.)
- Form labels
- Navigation labels
- Footer text
- Anywhere a screen reader would announce stalled/broken content

### 6.3 Treatment catalog

| Treatment | Use case | CSS technique | Reduced-motion fallback |
|---|---|---|---|
| **Letter-by-letter title reveal** | Hero, page-header titles | Per-glyph wrap (JS) + staggered opacity + transform-Y | All glyphs visible instantly |
| **Script draw-on** | Allura "MBSH presents", "In Memory", "Encore" | SVG path + `stroke-dashoffset` animation | Final state shown instantly |
| **Metallic shimmer mask** | Hero CTA "Reserve Your Seat", footer tagline | CSS gradient mask sweep on `background-position` | Static gradient |
| **Tracking tighten** | Section titles entering view | `transform: scale(0.92) → 1` (NOT animated `letter-spacing` — layout thrash) | Final state instantly |
| **Soft blur-to-focus** | Hero glyph entrance | `filter: blur(8px) → 0` + opacity | Sharp instantly |
| **Countdown leader** | RSVP + Through-Years | SVG keyframe rotating numerals | First era shown instantly, no leader |
| **Typewriter / slate** | Small metadata (dates, codes, "ROW 96 / SEAT 30") | JetBrains Mono + per-character reveal (JS) | Full string instantly |

### 6.4 Discipline rules

1. Each animated treatment **must** have a `prefers-reduced-motion` fallback.
2. **No animated type below the fold of a content-heavy page** (alums on slow-3G can't wait for letter-by-letter on long pages).
3. **Total animated text per page ≤ 3 instances.** Restraint preserves cinema.
4. Cursive draw-on **never** lasts more than 2 seconds. Reverence ≠ patience exhaustion.
5. Letter-stagger delay **≤ 30ms per glyph**, max 1.5s total.

---

## 7. Learning Loop / Review Loop

**Mandatory loop before any section moves to implementation.**

For each page, the builder executes:

1. **Draft section scene sheets.** Use the §3 template for each section.
2. **Identify missing capabilities and assets.** Cross-check against §1 and §4.
3. **Ask whether new assets or poses are required.** If yes, surface explicitly to Fritz.
4. **Propose options.** Multiple paths (e.g., "we can fake this with CSS, OR we can generate the right asset, OR we can ship without it"). Document in §8.
5. **Choose the strongest option.** Decision goes into §8 Decision Log with the rejected alternatives.
6. **Mark risks.** Performance, accessibility, scope. Risks go into the section's brief sheet.
7. **Only then implement.** Implementation scoped to the section, then preview-verified, then committed.

**The builder must not silently skip missing capabilities or downgrade the idea without saying so.** Every downgrade is logged in §8.

---

## 8. Decision Log

**Initial decisions carried forward + open questions.**

| # | Decision | Options considered | Chosen direction | Why | Rejected | Open |
|---|---|---|---|---|---|---|
| D1 | Smooth-scroll library | Lenis (V1 plan), Native (V1 self-review) | Native scroll | Lenis breaks `position: sticky`, adds a11y friction, no perf upside on modern browsers | Lenis | — |
| D2 | Scroll-trigger system | GSAP ScrollTrigger (V1 plan), CSS scroll-driven + IntersectionObserver | IO + CSS scroll-driven | 50KB savings, simpler mental model, native compositor thread | GSAP ScrollTrigger, GSAP timeline | — |
| D3 | Theme activation | Direct edits to existing CSS, body-attribute feature flag | `body[data-premiere="on"]` | Instant rollback, no production CSS modified, A/B testable | Direct mutation | Future: migrate flag to runtime config (GAP-04) |
| D4 | Film strip motif | Edge stripes on viewport (V1 ship), Frame-as-section + ribbon-as-divider (V3 Fritz) | Frame + ribbon | Edge stripes = decoration; frame = structural meaning | Edge stripes | Frame design — sprocket count, gold gradient stops, depth (TBD) |
| D5 | Primary navigation | Top nav bar (V1 ship), Compass-only (original spec), Medallion-as-menu (V3) | Medallion-as-menu | Compass IS the menu per original spec; brand-mark size from V1 nav left-corner = the size benchmark | Top nav, compass-only-tiny | Radial expansion design — animation, layout, focus order (TBD) |
| D6 | Raster asset dependency | Block on Gemini key, Use Adobe Firefly, Use CSS placeholders | CSS placeholders + register Pass-2 raster upgrade | Don't block creative work on key refresh | Firefly (untested auth in this session) | When key restored, run nano-banana for the 3 raster assets + Harry poses |
| D7 | Top nav vs no nav (after V2 review) | Keep top nav, Replace with medallion menu | Replace with medallion menu (D5) | "Same land-ass nav" honest critique; kill the cookie-cutter | Top nav | Implementation phase A |
| D8 | Snap-on-scroll mechanism | `is-visible` bounce class (V2 ship), `scroll-snap-mandatory` + scrollend (V3) | Mandatory snap + scrollend bounce | Real "thunk into place"; V2 felt like a fade-with-wiggle | Proximity-only | Test iOS Safari momentum interaction in Phase B |
| D9 | Backdrop video usage | Ignore existing 4 unused MP4s, Use them per page | Use them where appropriate | They're already in the repo, rights-cleared | Ignore | Map MP4 → page in Phase D |
| D10 | Memorial audio (piano sustain) | Skip entirely, Opt-in only | OPEN | Brief: no autoplay; opt-in OK but reverence may prefer silence | — | Decide before Phase D5. Default proposal: omit entirely. |
| D11 | Memorial candle SVG | Skip, Add gentle flickering candle, Add upward dove | OPEN | V1 mentioned, never built | — | Decide before Phase D5. Default proposal: skip. Reverence wins. |
| D12 | Cinema countdown frequency | Once per session, Every visit | Every visit | Small treat; not distracting | Once-per-session | Phase D2 + D4 |
| D13 | Spotify playlist ID | Use placeholder, Get real ID | OPEN | Need real curated playlist ID | — | Block on Fritz / committee finalizing playlist |
| D14 | Pose generation tool | nano-banana (blocked), Firefly, Manual | nano-banana when key restored | Brief style guide makes prompt reproducible | Firefly (auth uncertain) | Will retry per asset when key restored |
| D15 | New nav medallion size | Tiny (V1 nav corner), Brand-mark size (V3 Fritz) | Brand-mark size on home, scaled-down on inner pages | The size matters for presence | — | Exact dimensions per page (TBD) |
| D16 | Animated typography scope | Full-page animations, Headlines + signage only | Headlines + signage only | Body animation punishes slow-3G readers | Body animation | — |

**Open decisions list (must close before implementation):**
- D4 — Filmstrip frame visual design
- D5 — Medallion radial menu animation and layout
- D8 — iOS Safari snap-mandatory behavior verification
- D9 — Per-page video assignment
- D10 — Memorial audio
- D11 — Memorial candle / dove
- D13 — Spotify playlist ID
- D15 — Medallion size per page

---

## 9. Stop Condition (RE-STATED)

> **Before writing code, the builder must produce this V3 plan and STOP.**
>
> **No CSS edits. No JS edits. No HTML edits. No asset generation requests. No commits to `feat/premiere-theme` or any other branch.**
>
> Once V3 is approved, **and** the open decisions listed in §8 are closed, **and** the missing poses in §4 either ship or are explicitly accepted with their fallbacks, **and** the Scene Brief Sheets in §3 are reviewed — only then does Phase A in V2 §10 begin.
>
> If during implementation a new section appears that does NOT have a Scene Brief Sheet, the builder stops and writes one before coding it.
>
> **The goal of V3 is to make the builder think like a creative production team, not a coder racing to ship.**

---

## Closeout reference

When V3 enters implementation, the closeout packet documents:
- Which Scene Brief Sheets shipped vs deferred (with reason)
- Which missing poses were generated vs fell back
- Which decisions in §8 closed, with their resolutions
- Smoke test result, Lighthouse scores, accessibility audit findings
- Memory candidates for future sessions (patterns proven, gaps closed)
- Recommendations for propagating MBSH-proven patterns to other FAMtastic factory builds

Per the FAMtastic Plan Closeout Rule, this plan does not stay `active` with zero open tasks for more than one session.
