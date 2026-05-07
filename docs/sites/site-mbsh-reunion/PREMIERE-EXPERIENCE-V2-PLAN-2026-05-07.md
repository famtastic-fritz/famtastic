# MBSH Reunion — Premiere Experience V2 Plan

**Status:** Decision document. No code yet.
**Captured:** 2026-05-07
**Supersedes:** `PREMIERE-THEME-EXPERIENCE-PLAN-2026-05-05.md` (V1)
**Triggered by:** Pass-1 + Pass-2 implementation review feedback (Fritz, 2026-05-06 → 2026-05-07)

---

## 1. Overall Creative Direction

The site is not a website *about* the night. **The site is the night.** Seven scenes, told as an interactive event trailer. An alum opens it on a phone at 11pm and walks the carpet, takes a seat, watches a tribute, signs a letter, and leaves with a song stuck in their head. Time-on-page is the metric, not bounce rate.

**Core anchor metaphor — "The Reel."**

Every page is a frame in a film reel. A golden filmstrip ribbon — Shutterstock-style "shiny folded golden filmstrip tape" with real depth, gloss, and perforations — is the structural spine of the experience. It either *frames* sections (each section sits inside one frame of a reel) or *threads between* them (golden ribbon dividers connecting scenes). Hi-Tide Harry is the projectionist-usher who walks the reel: he peeks from behind frames, points at the active scene, celebrates submissions, steps back when reverence is due.

**Tone vectors — site adapts intensity per scene:**
- **Reverent** for legacy moments (100-year arc, In Memory)
- **Celebratory** for arrival (30-year homecoming, RSVP success, dance floor)
- **Intimate** for personal acts (Time Capsule, signing a memory)
- **Cinematic for everything in between** — every transition is a scene cut, not a page change

**The line every page must clear:**
> *"Would the most prominent alum text their network within 30 seconds of opening this on a phone in bed?"*

If a page doesn't clear that bar, it gets reworked, not shipped.

---

## 2. Site-wide Visual System

### Palette additions (extending V1)
| Token | Hex | Use |
|---|---|---|
| `--c-cinema-gold` | `#C9A961` (mid) → metallic gradient | Filmstrip ribbon, frame edges, gilt accents — the new headline texture |
| `--c-velvet` | `#7B0E1E` | Curtains, ticket stubs, button hover |
| `--c-velvet-deep` | `#4A0612` | Recessed velvet, shadows |
| `--c-night-sky` | `#05050B` | Memorial + capsule backdrop base |
| `--c-spotlight-amber` | `rgba(255, 195, 130, x)` | Bloom moments, light leaks |
| `--grad-cinema-gold` | linear-gradient: `#E8D08A 0% / #C9A961 25% / #8C6E2A 50% / #C9A961 75% / #E8D08A 100%` | Polished gold filmstrip surfaces |

Existing palette (scarlet, silver, cream, off-black) preserved. Six-font system unchanged.

### Texture vocabulary
- **Golden filmstrip ribbon** — primary motif. Either a frame around content, or a divider between sections. Real depth: highlight band, midtone, shadow band, perforations as cutouts.
- **Silver-foil rule** — kept for tribute moments (memorial) and tier badges
- **Film grain overlay** — kept, dialed lower (5% opacity max)
- **Spotlight bloom** — radial amber, gentle drift, used per-page
- **Sprocket holes** — functional structural elements inside filmstrips
- **Removed:** the V1 "edge stripes" pattern. Decoration on viewport edges did nothing.

### Interaction signature
- **Hover** = small zoom + warm-amber glow, like a frame coming forward in the reel
- **Click** = soft frame-advance feel (visual click, not literal sound)
- **Scroll** = the reel moves forward; content lives in frames; backgrounds stay anchored

### Motion grammar
- **Curtain rise** — first home visit only (sessionStorage gate)
- **Frame advance** — section transitions; the next frame slides into the spotlight
- **Reel scroll** — the filmstrip ribbon pages between scenes
- **Spotlight follow** — desktop cursor / mobile scroll-active section gets a gentle warm halo
- **Harry walk / peek / celebrate** — character vocabulary (see §6)

---

## 3. Layering System

Strict z-layer architecture. Every new element fits in a layer; nothing free-floats.

| Layer | z-index | Role | Pointer events |
|---|---|---|---|
| **L0** Stage backdrop | `-2` | Per-page fixed themed background, gentle drift, never blocks | none |
| **L1** Premiere FX | `50` | Grain + light leak + vignette overlay | none |
| **L2** Page content | `1–10` | Sections, frames, forms, text | normal |
| **L3** Filmstrip dividers | `11` | Golden ribbon dividers between sections + frame borders | none |
| **L4** Harry interaction layer | `40` | Sticky usher button + per-page peek instances | normal on Harry only |
| **L5** Chatbot panel | `60` | Modal-like chat overlay when Harry is tapped | normal |
| **L6** Navigation overlay | `70` | Medallion menu when expanded | normal |
| **L7** Page transition curtain | `9999` | Cross-page wipe (sessionStorage-once on home) | none |

**Rules:**
- Harry-as-usher button (L4) sits visible above L2 content but below chatbot (L5) when chat opens.
- Filmstrip dividers (L3) sit above content but below interactive layers — they're scenery, not buttons.
- Anything decorative gets `aria-hidden="true"` and `pointer-events: none`. Anything interactive is a real `<button>` or `<a>` with proper labels.
- Reduced-motion: L0 stops drifting, L1 grain freezes, L4 Harry walk disabled, L5/L6/L7 transitions become instant fades.

---

## 4. Page-by-Page Theme & Purpose

| Page | Scene name | Emotional purpose |
|---|---|---|
| Home (`index.html`) | **The Premiere Arrival** | First impression. Walking the carpet. The night begins. |
| RSVP (`rsvp.html`) | **Take Your Seat** | Commitment. Choosing your row. Confirmation creates a ticket. |
| Tickets/Sponsors (`tickets.html`) | **Patrons of the Evening** | Funding the night. Names on the program. Investing in the showcase. |
| Through the Years (`through-years.html`) | **The Trailer Reel** | Legacy. Five decades of MBSH compressed into a reel you scroll through. |
| Memorial (`memorial.html`) | **In Memoriam** | Reverence. Names we carry. Their seats are reserved. |
| Time Capsule (`capsule.html`) | **The Letter to Yourself** | Intimacy. Writing to your '96 self. Delivered the morning of. |
| Playlist (`playlist.html`) | **Encore** | The soundtrack. The night extended into your headphones. |

---

## 5. Per-Page Treatment

Format: **Opening → Backdrop → Section transitions → Harry → Next-page suggestion → Mobile delta.**

### 5.1 Home — *The Premiere Arrival*

- **Opening (first 1.2s):** Black screen → "MBSH presents" Allura cursive fade-in → curtain rise reveals existing dancefloor-confetti video → "Thirty Years Of / Hi-Tides" Playfair settles glyph-by-glyph → date subhead types in like a slate → CTA pulses → Harry walks in from off-screen waving.
- **Backdrop (L0):** Miami Beach palm-lined ocean horizon at dusk, stars beginning to come out. Slow drift left-to-right. Faint red-carpet edge at bottom. Composed image (silhouette layer + gradient + particle stars).
- **Section transitions:** Each section enters as a "next frame": a golden filmstrip ribbon sweeps across, the new section settles in its frame, brief snap-bounce. Story moments (Then/Now/Forever) crossfade with Ken Burns inside their frames.
- **Harry:** waves at hero → walks left to point at the Then photo → peeks from behind the Now photo → stands proud beside the brand mark on Forever → jumps in cheer when the marquee bulbs first chase → steps aside (off-frame) at the cards so he doesn't block them → salutes at the footer.
- **Next-page suggestion:** After cards, a golden ribbon banner: *"Where do you want to go next?"* — closest CTA highlighted (RSVP if no session-flag set, Capsule if RSVP'd).
- **Mobile:** Harry walk simplified to pose-swap-with-bounce. Filmstrip dividers thinner. Stage backdrop static (no drift) on slow-3G.

### 5.2 RSVP — *Take Your Seat*

- **Opening:** Page enters as a curtain raise across the page-header. "TAKE YOUR SEAT" enters letter-by-letter like a film title.
- **Backdrop (L0):** Empty cinema seats receding into darkness, faint red velvet rope at the bottom. Slow zoom-in (5% over 60s).
- **Section transitions:** Form section is the active frame in a filmstrip — adjacent frames (smaller, dimmer) hint before/after. Vintage cinema countdown leader (5...4...3...2...1) plays once before the form reveals.
- **Sections (3+):** (a) Page header. (b) Countdown to the night, styled as cinema countdown leader. (c) The form (the active reel frame). (d) "What to expect that night" — three mini-cards in a sub-strip (Arrival 7 PM / The Tribute 9:30 PM / The Floor 'til 12). (e) "Why this night, why now" hook.
- **Harry:** sits in a seat next to the form, pointing at it → leans in / shifts pose as user fills fields → on submit success: cheer + thumbs up + ticket-stub graphic flips out of his hand.
- **Next-page:** After success → *"Got a moment? Send your younger self a message."* → Capsule link. Pre-success scrolled past → *"Still thinking? Read what to expect."* anchors back to mini-cards.
- **Mobile:** form is centerpiece, cinema-seat row simplified to a single scarlet rule, ticket-stub renders inline.

### 5.3 Tickets / Sponsors — *Patrons of the Evening*

- **Opening:** Red velvet curtain swipes from sides revealing the ticket tier wall.
- **Backdrop (L0):** Red carpet runway leading into the camera, stanchion ropes on the sides. Subtle shimmer.
- **Section transitions:** Each tier card is a framed poster on a wall. Sponsor section is a separate filmstrip — each frame a sponsor logo (placeholder until logos arrive). Hover on a tier: spotlight follows.
- **Sections:** (a) Page header "The Night". (b) Ticket tiers (Early Bird / Regular / Couple-or-equivalent) as 3 framed posters. (c) "Become a Patron" — Marquee $2,500 / Producer $1,000 / Featured $500 mini-cards. (d) "Why your patronage matters". (e) Program credits teaser (your name, framed).
- **Harry:** stands on the carpet pointing at the tier wall → on hover, steps to the hovered tier → on click of any "Become a Patron" CTA, salutes.
- **Next-page:** *"Ready to commit?"* → RSVP. *"Want to send a memory back to '96?"* → Capsule.
- **Mobile:** tier cards stack vertically in single-column filmstrip, carpet backdrop simplified.

### 5.4 Through the Years — *The Trailer Reel*

- **Opening:** Cinema reel-leader countdown (5,4,3,2,1) flashes briefly center-screen, then the reel starts. Tasteful, ~1.5s total.
- **Backdrop (L0):** Dark screening-room walls, a projector beam cutting across the page from upper-back to lower-front. Subtle dust motes drift through the beam.
- **Section transitions:** Each era is a single frame in the reel. Vertical scroll moves the reel forward — eras pass like frames being projected. **1996 frame pauses longer** (snap-stop). **2026 frame pulses scarlet** ("the night is now"). After eras, "Add a Memory" form is rendered as a director's clipboard page.
- **Sections:** Hero leader → Era 1926-59 → Era 1960s-70s → Era 1980s → Era 1996 (longer pause) → Era 2026 (pulsing) → Add a Memory (clipboard) → Submit a Photo CTA.
- **Harry:** at each era, peeks from behind the frame as if narrating → at 1996, jumps out and waves big → at Add a Memory, holds the clipboard and nods.
- **Next-page:** After memory submit → *"Saved. Your story is on the wall."* → Memorial OR Playlist depending on whether they've visited yet.
- **Mobile:** vertical snap-cards (already implemented in V1, kept). Reel-leader countdown as small inline SVG.

### 5.5 Memorial — *In Memoriam*

- **Opening:** Page dims to black. White type fades in slowly. **No curtain. No fanfare. No film strip.** Reverence first.
- **Backdrop (L0):** Distant stars on near-black, slow gentle drift. One distant moon upper-right. No FX overlay drift, no light leak, no animations beyond starfield twinkle.
- **Section transitions:** Names enter one at a time — soft silver-foil rule beneath each, brief pause, gentle fade. No bounce, no celebrate.
- **Sections:** (a) Header (Allura "In Memory" + italic "Forever Hi-Tides"). (b) Names list. (c) "Add a name" (committee curates). (d) "At the reunion" (their seats are reserved, names read aloud).
- **Harry:** **NOT visible on this page.** The chatbot remains accessible but the visible character usher is hidden. Reverence wins. (V1 already does this — keep.)
- **Next-page:** *"Their seats are reserved. Share a memory at Through the Years."* → soft link.
- **Mobile:** identical treatment, narrower margins. Backdrop perfectly fine on phone — quiet is the point.

### 5.6 Time Capsule — *The Letter to Yourself*

- **Opening:** Curtain rise reveals a closed envelope on a wood desk, scarlet wax seal stamped. A letter opener sits beside it. Single lamp casts a warm pool from upper-left.
- **Backdrop (L0):** Wood desk top with subtle parchment grain, lamp glow upper-left, rest in shadow. Slow lamp flicker (3-4% brightness oscillation, 8s loop).
- **Section transitions:** Click the envelope → letter slides out → form fields appear written on the letter (Cormorant Garamond, faux-handwriting feel). Each prompt section reveals as the user scrolls.
- **Sections:** (a) Page header. (b) The envelope (the form). (c) "What to write your younger self" — three prompts as mini-cards (The thing you didn't know / The person you'd thank / The night ahead). (d) "We deliver on the day" promise.
- **Harry:** sits at the desk corner holding a pen → leans in as user writes → on submit, the wax seal animation fires (red wax pours, stamp drops, satisfying *thunk*), Harry stamps it and gives a thumbs up.
- **Next-page:** *"Sealed. The night arrives July 12. Take your seat now."* → RSVP.
- **Mobile:** envelope simplified to a vertical letter card; wax seal smaller; lamp flicker disabled to save battery.

### 5.7 Playlist — *Encore*

- **Opening:** Vinyl spins up from black center-stage. Stylus drops with a soft visual "tick." Spotify embed loads beside it.
- **Backdrop (L0):** Smoke-filled spotlight pools converging on center stage. Two warm spots (one amber, one scarlet-edged), drifting slowly past each other. Never aggressive.
- **Section transitions:** Tracklist entries slide in like a credit roll — bottom-to-top, slow, paced. A-Side / B-Side / C-Side blocks divided by golden filmstrip dividers.
- **Sections:** (a) Page header (Allura "Encore"). (b) Vinyl + Spotify embed. (c) Tracklist (existing 18 tracks). (d) "About the soundtrack" — A-Side senior year / B-Side slow set / C-Side South Florida mini-cards. (e) Suggest a track form.
- **Harry:** beside the vinyl, miming air-conducting on a continuous gentle bob → on track-row hover, grooves slightly (small shoulder bounce) → on suggest-track submit, gives a thumbs up.
- **Next-page:** Session-aware: *"More to feel? Read In Memory"* OR *"Still thinking about RSVP?"* depending on visit state.
- **Mobile:** vinyl shrinks to header element; tracklist scrolls; mini-cards stack; spotlight pools simplified to gradient.

---

## 6. Harry Interaction Vocabulary

Harry is a **living character**, not a sticker that swaps PNGs. He has six action types, a per-page choreography map, and clear accessibility boundaries.

### 6.1 Action types

| Action | Trigger | Visual |
|---|---|---|
| **Pointing** | User enters a section requiring action (form, CTA, scroll-tease) | Pose change to point pose; small lean toward target |
| **Peeking** | Section enters viewport (from behind a card or frame edge) | Slide in 30% from off-frame, hold, slide back when section exits |
| **Reacting on scroll** | Section change crosses ≥40% threshold | Pose change + small step animation (`translateX` + `rotate` keyframe, 700ms) |
| **Celebrating** | Form submission success event | Pop-up cheer pose + brief scarlet pulse glow + 800ms hold |
| **Stepping back** | Page is `data-page="memorial"`, or chatbot panel is open | Hidden entirely (memorial) or fades to 0 opacity (chatbot open) |
| **Idle behavior** | No section change for >12s | Gentle bob (existing) + occasional contextual hint speech bubble (existing) |

### 6.2 Per-page choreography map

| Page | Default pose | Section triggers |
|---|---|---|
| Home | wave-hello | hero=wave / story-then=point-left / story-now=peek / story-forever=stand-proud / event-details=cheer / previews=step-aside / footer=salute |
| RSVP | listening (sitting) | header=listening / form=point-at-form / on-submit=thumbs-up + cheer |
| Tickets | pointing | header=pointing / tier-hover=lean-toward-tier / patron-hover=salute |
| Through-Years | thinking | header=peek-from-side / 1996=jump-and-wave / 2026=salute / add-memory=hold-clipboard-nod |
| Memorial | (hidden) | n/a |
| Capsule | pointing-at-envelope | header=pointing / form=lean-in / on-submit=stamp-and-thumbs-up |
| Playlist | excited-cheer | header=mime-conducting / track-hover=groove / suggest-submit=thumbs-up |

### 6.3 Accessibility boundaries (non-negotiable)

- The Harry button (`.premiere-usher`) is the only interactive Harry element. It's a real `<button>` with `aria-label="Open Hi-Tide Harry — your reunion assistant"`, keyboard reachable, click → chatbot panel.
- All "peek" / "walk" / "celebrate" decoration instances on the page are `aria-hidden="true"`, `pointer-events: none`. They are scenery.
- `prefers-reduced-motion` disables walk + peek + celebrate. The button still works, the pose still swaps (instant), the chatbot still opens.

---

## 7. What CHANGES from the current Premiere PR

| What | Why | Replacement |
|---|---|---|
| Edge film strips on viewport (V1 `body::before/::after`) | Felt cheesy; decoration that did nothing | **Golden filmstrip frames around sections** + **golden ribbon dividers between sections**. Real depth, gloss, perforations. The strip becomes structural, not edge garnish. |
| Cookie-cutter top nav bar | "Same land-ass nav as every site" | **Medallion-as-menu**: brand-mark size from V1 nav left-corner, but on its own — center-bottom on home, top-corner on inner pages. Click expands radial spoke menu with 7 destinations. The compass IS the menu. |
| "Compass" text label baked into existing markup | Looks terrible; not part of premiere brief | **Removed** in premiere.css via override; the medallion stands alone visually |
| `.is-visible` snap-in bounce | Doesn't feel like a snap; feels like a fade-in with a wiggle | **True scroll-snap** (`scroll-snap-type: y mandatory` per page) + **JS-driven bounce on snap-settle event**. Section arrives with a thunk. |
| Static Harry pose-swap only | Reads as a sticker | **Walk + peek + celebrate** vocabulary tied to scroll milestones (not just section IO), per-page choreography map |
| Cards section as flat scarlet rectangles | Doesn't relate to the theme strongly enough | **Golden-frame poster wall** — each card a framed movie poster in golden filmstrip frame, with title-card typography |
| Backdrop gradients (V1) | Flat; "stationary" but boring | **Multi-layer composed backdrops** — silhouette + gradient + particle layer per page, with gentle drift |

---

## 8. What KEEPS from the current Premiere PR

These are foundations. Do not regress.

- **Single feature flag** (`body[data-premiere="on"]`) gating every theme rule
- **Premiere FX overlay** (grain + leak + vignette consolidated into one layer) — tune lower (5% opacity max)
- **Starfield** as CSS radial-gradient stars — but **only on home + memorial** (currently on too many pages)
- **Hi-Tide Harry as `<button>`** with proper aria-label, click → existing chatbot panel — perfect, do not change
- **Page-specific `[data-page]` attribute pattern** for per-page CSS targeting
- **Mini-cards pattern** (number badge / title / italic body / scarlet top border) — used inside new framed sections
- **Stage backdrop pattern** (`.premiere-stage` per page) — keep mechanism, upgrade content
- **Curtain rise on first home visit** with sessionStorage gate
- **Reduced-motion + reduced-data gates** on every animation
- **Curated 18-track Class of '96 playlist content**
- **3+ sections per inner page** (RSVP / Tickets / Capsule / Memorial / Playlist all filled out)
- **Existing brief AVOID list** (no celebrity name-drops, no autoplay audio, no SVG uploads, off-black not pure black, silver as gradient not flat)
- **No GSAP, no Lenis, no framework migration** — vanilla HTML/CSS/JS + IntersectionObserver only

---

## 9. What REMOVES or TONES DOWN

| Item | Action | Reason |
|---|---|---|
| Edge film strips | **Remove** | Replaced by section-frame motif |
| Top nav bar | **Remove** | Replaced by medallion-as-menu |
| "Compass" text inside compass markup | **Override / hide** | Cosmetic regression in original markup |
| Section snap-in bounce class on `.is-visible` | **Remove** | Replaced by real scroll-snap event |
| Marquee bulb chase on every section | **Tone down** — keep only on event-details | Pattern was overused |
| Starfield on tickets / through-years / capsule / playlist | **Remove** — keep only on home + memorial | Doesn't fit those scenes |
| Page-transition curtain on every nav | **Tone down** — sessionStorage-once on first home visit only | Annoying after 5th transition |
| `body padding-top` for fixed nav | **Remove with nav** | Nav becomes medallion, no top bar |

---

## 10. Implementation Phases (no skipped stubs)

Every component listed gets implemented in its phase OR explicitly marked `DEFERRED` with reason in the closeout. No silent stubs.

### Phase A — Foundation (Day 1)
- A1. Replace edge film strips with **golden filmstrip frame** component (reusable CSS class + SVG asset for the gold ribbon look — sprocket holes as actual cutouts, gradient for depth)
- A2. Build **medallion-menu** component: brand-mark sized button, click expands radial menu with 7 destinations, escape/click-outside collapses, fully keyboard accessible (focus trap, Enter to open, Esc to close, arrow keys to cycle)
- A3. Remove top nav bar from premiere.js + premiere.css
- A4. Remove edge film strip pseudo-elements from premiere.css
- A5. Document z-layer ordering in premiere.css header comment
- A6. Override `.compass-nav__label` to hide the "Compass" text label
- A7. Verify: tab through medallion menu, screen reader announces each destination, `prefers-reduced-motion` disables radial expansion (snaps open instantly)

### Phase B — Section transitions (Day 1-2)
- B1. Implement true **`scroll-snap-type: y mandatory`** on home + select inner pages
- B2. Add **filmstrip-divider** component between sections: golden ribbon, ~80px tall, perforations, fits the page width
- B3. Refine snap-bounce: JS listens for `scrollend` event (with fallback for non-supporting browsers), adds `.is-snapped` class which triggers a 600ms bounce keyframe on the snapped section
- B4. Cross-browser test: iOS Safari momentum + scroll-snap-mandatory (known to fight); fall back to `proximity` on Safari if mandatory breaks
- B5. Reduced-motion: snap-mandatory becomes proximity, bounce becomes instant

### Phase C — Harry vocabulary expansion (Day 2)
- C1. Add **walk animation**: `translateX(±N) + rotate(±deg)` keyframe on section change, ~700ms
- C2. Add **peek animation**: separate Harry instances per peek-eligible section, slide in 30% from off-frame on IntersectionObserver, slide back on exit
- C3. Add **celebrate animation**: cheer pose + scale-pulse + scarlet glow on form-submit success events
- C4. Wire **per-page choreography map** (§6.2) into premiere.js — each page has its `POSE_MAP` and `HINT_MAP` plus a new `ACTION_MAP` for triggers
- C5. Verify: Harry walks on home, peeks behind story photos, celebrates on every form submit, hidden on memorial

### Phase D — Per-page upgrades (Day 2-3)
- D1. Home: cards rebuilt as **golden-frame poster wall** (each in its own gold filmstrip frame); backdrop = palm-lined ocean horizon at dusk
- D2. RSVP: vintage **cinema countdown leader** intro animation; form rendered as the active reel frame; backdrop = empty cinema seats receding
- D3. Tickets: **red carpet** backdrop; framed tier posters; sponsor sub-strip with logo frames
- D4. Through-Years: **reel-leader countdown** intro (~1.5s); projector beam backdrop with dust motes; era cards already snap-stack; 1996 longer pause; 2026 pulse
- D5. Memorial: starfield + distant moon backdrop; reverent slow fade keep; **no curtain, no Harry, no FX drift**
- D6. Capsule: wood **desk-top backdrop** with single lamp glow; envelope opens on scroll; lamp flicker (gentle, opt-out via reduced-motion)
- D7. Playlist: **vinyl spin-up** intro; smoke spotlight pools backdrop; tracklist credit-roll feel

### Phase E — Polish (Day 3)
- E1. Font weights and letter-spacing audit (every page reads cleanly on a phone)
- E2. Mobile fine-tuning per page (375px viewport pass)
- E3. Performance pass (Lighthouse mobile + real device + Network slow-3G throttle)
- E4. Reduced-motion fallback verification (set OS pref, walk every page)
- E5. Real-device QA: iPhone 13/14 + Pixel 7 minimum
- E6. Accessibility audit: `axe-core` or equivalent, contrast checks, focus trap on medallion menu, screen reader walk-through on memorial + RSVP

### Phase F — Ship (Day 3-4)
- F1. Merge `feat/premiere-theme` to `staging` branch → Netlify staging deploy preview
- F2. Committee preview (Fritz + delegates) walks the site on real devices
- F3. Address blockers, defer nice-to-haves, document deferred items
- F4. Merge `staging` → `main` → production
- F5. Smoke 7/7 still passes (`platform/famtastic-platform smoke test mbsh-reunion`)
- F6. Update `SITE-LEARNINGS.md`, `CHANGELOG.md`, regenerate `FAMTASTIC-STATE.md`

---

## 11. Files Likely Affected

### Heavy revision
- `frontend/css/premiere.css` — major rework (medallion menu, golden filmstrip frames, ribbon dividers, removed top nav, removed edge strips, snap-mandatory, per-page backdrop upgrades, Harry walk/peek/celebrate styles)
- `frontend/js/premiere.js` — major rework (medallion menu logic, scrollend snap detection, Harry vocabulary expansion, per-page choreography map)
- `frontend/index.html` — cards markup change to golden-frame posters; remove top nav mount; mount medallion menu; add filmstrip dividers between sections
- `frontend/rsvp.html` — countdown leader markup; framed form section; existing 3-section structure stays

### Medium revision
- `frontend/tickets.html` — red-carpet backdrop wrapper; tier posters in gold frames; sponsor sub-strip
- `frontend/through-years.html` — reel-leader countdown markup; projector beam backdrop wrapper
- `frontend/capsule.html` — desk backdrop wrapper; lamp flicker element
- `frontend/playlist.html` — vinyl spin-up element; smoke-spotlight backdrop wrapper

### Light revision
- `frontend/memorial.html` — confirm Harry-hidden, FX-toned, no curtain — already mostly correct in V1
- `frontend/css/compass.css` — override the "Compass" text label visibility (or via premiere.css selector)

### New files (likely)
- `frontend/css/premiere-medallion.css` — split if `premiere.css` exceeds ~1500 lines
- `frontend/js/premiere-medallion.js` — split if `premiere.js` exceeds ~600 lines
- `frontend/assets/premiere/filmstrip-frame.svg` — golden filmstrip frame as inline SVG component
- `frontend/assets/premiere/filmstrip-divider.svg` — between-section divider
- `frontend/assets/premiere/sprocket-pattern.svg` — reusable perforation pattern

### Backend / unaffected
- All PHP endpoints — untouched
- `config/site-config.json` — untouched
- Netlify / DNS / cPanel — untouched

---

## 12. Risks & Performance / Accessibility Concerns

### Performance
| Risk | Mitigation |
|---|---|
| Mandatory scroll-snap fights iOS Safari momentum scroll | Detect Safari, fall back to `proximity` snap; manual snap nudge on scrollend |
| Multiple animated backdrops (per-page L0) compete for GPU on mid-tier Android | Per-device gating: disable backdrop drift on `connection.saveData === true` or `connection.effectiveType === 'slow-2g'` |
| Filmstrip frame as inline SVG repeated per section = DOM weight | Define once as `<symbol>` in head, reference via `<use>` per section |
| Harry walk animation triggers reflow if implemented with `left/top` | Use `transform` only (compositor-thread) — never animate layout properties |
| `backdrop-filter` on medallion menu may not be supported on older Android | Provide solid color fallback via `@supports not (backdrop-filter: blur())` |

### Accessibility
| Risk | Mitigation |
|---|---|
| Medallion radial menu not keyboard-navigable | Real `<button>` for the medallion, real `<ul><li><a>` for the menu items, focus trap when open, Escape closes, arrow keys cycle |
| Screen readers narrate decorative Harry peeks as content | All peek elements `aria-hidden="true"`; only the main `.premiere-usher` button is exposed |
| Filmstrip frame borders confuse semantic structure | Frames are `<div role="presentation">`; the content inside uses normal semantic tags |
| Reduced-motion users get a broken experience | Every animation has a fallback in `@media (prefers-reduced-motion: reduce)` — fades or instant transitions |
| Color contrast on cream-on-velvet body text | Test every page; if ratio < 4.5:1, darken velvet or lighten cream |
| Memorial reverence broken by chatty UI | Verify Harry hidden, FX dialed down, starfield primary visual; no celebrate animations triggered on this page |

### Compatibility
- Test matrix: iOS Safari 17+, Chrome 120+, Firefox 120+, Samsung Internet, Edge — desktop and mobile
- Feature detection: `CSS.supports()` for `scroll-snap-type`, `backdrop-filter`, `animation-timeline: view()`
- Graceful degradation: every feature has a baseline experience that works without the enhancement

### Scope
- This plan is **3-4 days of focused work**. Phase ordering must be honored. Do not skip ahead to per-page upgrades before foundation lands.
- Asset gen still blocked on expired Gemini key (GAP-2026-05-05-03). Filmstrip frame and ribbon divider must be CSS+SVG-only — no raster dependency.
- "Same-feeling nav across all FAMtastic sites" — solving for MBSH first; if medallion-menu pattern lands well, propose propagation to other factory sites in a separate plan.

---

## 13. Acceptance Criteria

The experience is **successful** when all three sets clear.

### Experience criteria (the "would they text" bar)
- An alum opens the home page on a phone at 11pm. Within 30 seconds: they want to text someone. Within 90 seconds: they've tapped Harry, scrolled to RSVP, or shared the URL.
- The home cards section reads as a movie-poster wall. No alum describes it as "buttons" or "tiles."
- No two pages feel the same. Each scene has its own backdrop, transition style, and Harry behavior.
- Harry feels alive — pose, position, and reaction vary across the journey. He's not a sticker.
- The film strip motif is structurally meaningful — it frames or divides content. It is not decoration.
- Navigation does not look like every other website. The medallion is the menu; nobody asks "where's the menu?"

### Functional criteria
- All forms submit and confirm with the new visual treatment: RSVP, capsule, memory, sponsor inquiry, suggest-track.
- Medallion menu opens, closes, navigates, and is fully keyboard accessible (Tab, Enter, Esc, Arrow).
- Mobile Lighthouse: performance ≥ 85, accessibility ≥ 95, best-practices ≥ 95.
- `platform/famtastic-platform smoke test mbsh-reunion` still passes 7/7 (backend untouched).
- Reduced-motion: every page works as a calm, fade-only experience. No parallax, pinning, or unexpected motion.
- Real-device QA: iPhone + Android both complete a full home → RSVP → capsule → playlist walk without scroll-snap stutter, layout shift, or broken interactions.

### Brand criteria
- Cinema-gold tone introduced and used consistently for filmstrip motifs (frames + dividers + medallion accents). Existing palette preserved.
- Six-font system unchanged. Font weights and letter-spacing audited for cinematic display.
- "Let us be known for our deeds" tagline appears at least once per page (footer minimum).
- 30 + 100 dual-milestone messaging surfaces on Home, Tickets, and Memorial.
- FAMtastic Declaration applied: fearless deviation **plus** mastery of craft. The site is different *and* usable. If only one is true, the criterion fails.

---

## Closeout

When this plan executes, the closeout packet documents:
- Which phases shipped vs deferred (with reason)
- Smoke test result, Lighthouse scores, accessibility audit findings
- Open follow-ups (e.g., raster asset upgrade pending Gemini key refresh)
- Memory candidates for future sessions (patterns proven, gaps closed)
- Recommendations for propagating MBSH-proven patterns to other FAMtastic factory builds

Per the FAMtastic Plan Closeout Rule, this plan does not stay `active` with zero open tasks for more than one session.
