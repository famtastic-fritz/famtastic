# MBSH Vibe Recovery and Completion Report

**Captured by:** Claude Web (this conversation thread)
**Date:** 2026-05-10
**Live site:** https://mbsh96reunion.com/
**Companion documents (saved separately):**
- `mbsh_reels_layered_experience_plan.md` (full reel-by-reel cinematic experience plan)
- `famtastic_skill_library_architecture.md` (skill library architecture, 26 skills mapped)
- `layered_hero_composite_test.html` (interactive demo of the layered architecture)

**Authorship note:** This report was assembled from this Claude Web conversation thread and live web fetches of the production site. **Section 3 (Source-of-Truth / Repo Findings) requires local filesystem access I do not have** — it is structured as a directed handoff for the local agent (Cowork / Codex / Claude Code running on Fritz's Mac) to complete in a follow-up pass. Every other section is complete.

---

## 1. Executive Summary

**Where we are:** the MBSH 30th reunion site is live at https://mbsh96reunion.com with a working frame across seven reels (Home, RSVP, Tickets, Through the Years, In Memory, Time Capsule, Playlist) and a recently shipped cleanup pass (form readability, home headline typo, tickets duplicate cleanup, dynamic scene numbering foundation). The committee can navigate the site end-to-end. **The vibe is real but not yet visible.**

**The breakthrough that happened in this conversation:** we discovered (Fritz's insight, expanded together) that the cinematic experience the site is reaching for shouldn't be built by asking AI models to composite scenes — it should be built with **layered DOM composition**, where each visual element (scene, character, headline, atmosphere, foreground) is an independent layer with its own animation loop, scaled by container queries, choreographed by scroll-driven animations, and connected across pages by view transitions. The model only ever renders single subjects; the browser does the composition. This single architectural shift makes character identity drift impossible, makes iteration nearly free, and makes the cinematic experience genuinely deliverable rather than aspirational.

**What needs to happen next, in plain English:**
1. The committee needs to lock the **reunion date** so the countdown stops showing placeholders.
2. The **In Memory page needs immediate attention** — it is currently the thinnest page and the most emotionally critical. Right now it's a one-paragraph email link. Committee will notice.
3. The **photoreal interior heroes** (RSVP, Tickets, Through-Years, Memorial, Capsule, Playlist) need to be generated and dropped in — assets are designed, prompts drafted, costs budgeted (~$1.57 plus alpha matting), ready to run.
4. The **chatbot Hi-Tide Harry** needs to be repositioned and reframed — currently it's a static PNG sitting on each page rather than the layered marquee-bulb-ring avatar the design now calls for.
5. The **interior page scene markers** need the one-span-per-page follow-up (the foundation shipped; the spans didn't).
6. The site needs a **final committee preview pass on staging** before promotion to production.

**Estimated time to committee-ready:** 4–6 focused build sessions plus committee-input gates (date, In Memory names list, any photos they want curated). Wave 1 (assets) can run today for under $2.

---

## 2. Live Site Audit

Fetched and reviewed 2026-05-10. Three pages sampled directly (Home, RSVP, In Memory). Other pages inferred from the navigation pattern and the conversation history.

### What is live and working

**Site-wide frame:**
- Compass navigation (footer) lists all seven destinations cleanly
- Header includes the medallion brand mark linking back to home (the medallion-as-menu pattern Fritz confirmed)
- Footer carries the canonical voice: "Let us be known for our deeds" + "Hi-Tide Pride Since 1926 🌊" + committee email
- Built with FAMtastic Site Studio credit in footer (good — proves the factory pattern is producing real sites)

**Home (Reel I — the Lobby):**
- Brand mark foil 30+100 commemorative image renders
- H1 reads "Thirty Years Of Hi-Tides" (typo fix from earlier this session is live — confirms recent deploy)
- Date band shows "October–November 2026 — Miami Beach" (note: this is a 2-month range, ambiguous — see risks)
- Primary CTA "Reserve Your Seat" → /rsvp
- Anchor phrase "Let us be known for our deeds" present
- Scene marker reads `SCENE I · INT. LOBBY — NIGHT Rec` (the "Rec" indicator is the cinema recording-light motif — confirmed working)
- "Tonight's Program" listing (Reels I–VI of the inner destinations) renders correctly with time estimates per reel ("4 min", "6 min", "12 min", etc.)
- Footer copy intact

**RSVP (Reel II — Lock Your Seat):**
- Headline "Save the Date" + "Tell us you're coming. Welcome back, Hi-Tide."
- Countdown widget present but rendering placeholder `--Days --Hours --Minutes --Seconds` (date not locked yet)
- "Date confirmed by committee — coming soon" caption confirms intentional placeholder, not a bug
- Form fields present: First Name *, Last Name (Maiden Name if applicable) *, Email Address *, Will you attend? dropdown
- Privacy/consent copy is present and well-written (mentions opt-out, 30-day retention, deletion process)
- Submit button reads "Submit RSVP 🌊"
- "What to expect that night" section with three timed beats: 7:00 PM Arrival / 9:30 PM The Tribute / 'til 12 The Floor — strong cinematic structure already
- "Why this night, why now" closing paragraph — emotionally resonant copy

**In Memory (Reel V — The Tribute):**
- H1 "In Memory" + subtitle "Forever Hi-Tides."
- One-paragraph instruction: send names to the committee email
- "Add a name" section: email link only (not a form)
- "At the reunion" closing paragraph: "Every name on this page is read aloud during the tribute. Their seats are reserved. Their families are welcome." — strong copy
- **No list of names currently displayed**
- **No visual treatment (no candle, no imagery, no tribute reel)**

**Mascot:**
- 06-listening.png appears on every page as a static image, not as an interactive avatar
- Currently positioned inline rather than in the cinematic chatbot frame the design calls for

### What is incomplete, broken, placeholder, or risky for committee review

#### 🔴 Critical (committee will notice)

1. **In Memory page is dramatically underbuilt.** This is the most emotionally weighted page in the site. Currently it has zero names listed, no candle imagery, no form (just an email link), and no cinematic treatment. The committee will read this page first when judging emotional fit. **Top priority.**

2. **Reunion date is not locked.** The countdown shows `--` placeholders. "October–November 2026" on Home is a 2-month range. Committee must confirm the exact date before the site goes wide.

3. **Heroes are not yet photoreal.** The reels plan calls for photoreal 35mm cinema heroes (F1 style — costumed mascot in the lobby aesthetic). Currently the interior pages have no hero imagery. The committee will see flat pages where the plan promises cinematic ones.

4. **Chatbot Hi-Tide Harry is not built.** Currently he is a static 06-listening.png sitting on each page. The design now calls for a layered marquee-bulb-ring avatar with status indicator (idle pulse / listening chase / speaking glow). Until this is implemented, the central character of the site is essentially a sticker.

#### 🟡 Medium (visible to careful viewers)

5. **Inner pages don't have scene markers yet.** Home shows "SCENE I · INT. LOBBY — NIGHT" but RSVP/Tickets/etc. don't render their `SCENE II / III / IV / ...` markers. The `page-sequence.js` foundation shipped; the per-page `<span data-scene-marker>` insertion is the follow-up.

6. **Note from Usher marquee is designed but not implemented.** Claude Design canvas exists with three mobile variants and bulletin state; Cowork hasn't built it into the live pages. Without it, each page is missing the persistent narrative voice the design calls for.

7. **Memorial "Add a Name" should be a form, not an email link.** Fritz locked this decision earlier — needs a form with a moderation queue, not a mailto link.

8. **Mascot positioning is generic.** Currently the PNG sits inline on each page. The reels plan specifies per-page positioning (Home: peeking right edge, Tickets: at the box office, Playlist: waving, etc.). None of this is wired.

9. **Social media listed as "coming soon."** Either link the accounts when they exist or remove the line.

10. **Through-the-Years page** (not fetched in detail) is the most ambitious reel — projection booth, scroll-spine timeline, dust motes, decade markers. None of this is built yet.

11. **Sponsorship "Become a sponsor" anchor in footer** — needs verification that #sponsor anchor resolves cleanly on /tickets.

#### 🟢 Minor

12. The Home program listing numbers the inner reels I–VI (1–6), while the experience plan calls Home Reel I and RSVP–Playlist Reels II–VII. Two valid framings; the design needs to pick one and apply consistently. **Recommendation:** keep the live site's framing (Home is the lobby, inner reels are the program I–VI) because it reads more naturally to a visitor.

### Live audit summary

The frame is sound. The voice is right. The committee email is in place. The cleanup pass shipped real fixes (form readability, typo, tickets cleanup, scene marker foundation). The site is not broken. **It is not yet cinematic, and it is not yet complete on the page that matters most (In Memory).**

The gap between the live site and the experience plan is the gap between "the site exists" and "the site feels like the experience the committee imagined." This report exists to close that gap deliberately.

---

## 3. Source-of-Truth / Repo Findings

**⚠️ This section requires local filesystem access I do not have. Below is the structured handoff for the local agent to complete in a follow-up pass.**

### What the local agent should verify

**Repository identification:**
- The most likely source of truth is somewhere under `/Users/famtasticfritz/famtastic-sites/` — Fritz's earlier session memory mentions per-site repos at `~/famtastic-sites/<tag>/`
- Look for any directory matching `mbsh*`, `*reunion*`, `class-of-96`, or `*96*`
- Inside the candidate repo, check:
  - `package.json` — look for `name` field; deploy scripts; build commands
  - `netlify.toml` — production build settings, branch deploys, redirects
  - `.git/config` — remote URL, branch tracking
  - `README.md` — repo identity
  - Any reference to `mbsh96reunion.com` in files (this is the strongest signal)

**Netlify settings to verify:**
- Production branch (likely `main` based on earlier conversation pattern)
- Staging branch (the earlier session referenced `staging` branch and a `mbsh-reunion-staging.netlify.app` URL)
- Production URL → confirm it resolves to mbsh96reunion.com via custom domain mapping
- Build command and publish directory
- Environment variables set on Netlify (any secrets the build needs)

**Mismatch indicators between live and source:**
- The footer credits "FAMtastic Site Studio" — verify the live site was built/deployed FROM the Studio pipeline (not handcrafted then committed)
- Verify the page-sequence.js file exists at `frontend/js/page-sequence.js` in the source (this was the most recent shipped feature)
- Verify the CSS tokens for the form-readability fix (`--text-on-light`, `--text-muted-on-light`, `--placeholder-on-light`) exist in `frontend/css/base.css`
- Verify `frontend/js/premiere.js` references `window.PAGE_SEQUENCE`

**Evidence to capture in the local agent's pass:**
- Exact repo path
- Exact branch currently deploying to production
- Exact Netlify site ID and team
- Whether there are any UNCOMMITTED changes locally (`git status` is the question)
- Whether `main` and `staging` are in sync, or if staging is ahead
- Last commit timestamp and message on `main`

### What NOT to do in this pass

- Do not run `git push`
- Do not run `netlify deploy --prod`
- Do not modify DNS
- Do not modify Netlify environment variables
- Do not delete uncommitted changes (preserve and report them)

### Handoff instruction for the local agent

The local agent should fill this section in a follow-up edit to this report, then save the completed report back to `~/famtastic/captures/inbox/mbsh-vibe-recovery-report.md`.

---

## 4. Recovered Vibe

This is the most important section. The creative trail from this conversation — what emerged, what crystallized, what should guide every implementation decision from this point.

### 4.1 The cinema metaphor became the entire framework

What started as a theme became the architectural language. Every page is a **Reel**. Every section is a **Scene**. The viewer is the audience. The site is the building. The committee is the production team. Sponsors are the producers (Marquee, Producer, Featured). The memorial is the tribute reel. The playlist is the encore.

This isn't decoration. It's **the operating mental model.** When making any design or content decision: ask whether it would make sense at a 1920s movie premiere. If yes, ship it. If no, redesign.

### 4.2 The phrases that became doctrine

- **"Thirty Years of Hi-Tides"** — the home headline. Anchors everything.
- **"Let us be known for our deeds"** — the school motto, treated as the universal closing line on every page.
- **"Hi-Tide Pride Since 1926 🌊"** — the heritage line. 30 years for '96 + 100 years for MBSH.
- **"Forever Hi-Tides"** — the memorial line.
- **"Welcome back, Hi-Tide"** — the personalized welcome on RSVP.
- **"Tonight's Program"** — the Home reel listing. Not "Up Next" (interior pages get that). Home is the lobby; the lobby lists tonight's whole bill.
- **"Black-tie cocktail. Live tributes. A soundtrack that knows you. The Class of '96 — back together, exactly thirty years on."** — the RSVP "What to expect" anchor copy.
- **"The lobby is the building itself. Interior reels are the shows inside it."** — the architectural framing for why Home gets 100vh and full curtain ritual while interiors get ~60–70vh.

### 4.3 The visual principles that emerged as canonical

| Principle | What it means | Where it shows up |
|---|---|---|
| **35mm film photograph aesthetic** | Every hero is shot like a real photograph, not illustrated | All 6 interior hero stills + the Home Veo loop |
| **Deep crimson + warm gold + near-black + velvet** | The Premiere palette — NOT MBSH scarlet (school colors stay in sponsor/legacy elements) | Every page, every component |
| **Asymmetric tungsten flicker** | Real candle-warm bulbs flicker irregularly. Never metronome. | All CSS keyframes for light/flame motion |
| **Vintage cinema typography** | Playfair Display + Cormorant Garamond + Limelight + Allura + JetBrains Mono. Max 5 fonts per page. | Per the locked typography spec |
| **Container queries for everything** | Layers scale with container, not viewport. Same component works at 100vh hero or 80px avatar. | The architectural primitive |
| **Decorative bleed** | Elements extend past their visible container (confetti off the bottom, Harry peeking past the right edge, light glow extending up into the header) | Fritz's insight, now a core skill |

### 4.4 The architectural breakthrough — the layered DOM composition discovery

This is the conversation's highest-value insight. **Fritz's words, paraphrased and expanded:** *"If we know the width, and we've been having character lock issues, can't we just use layering? Like stack divs in the container? Think about the possibilities we can unlock."*

Before that moment, we were treating character-in-scene as a problem for the AI model to solve — give it the character + the scene, ask it to composite, hope identity holds. That approach fails: even with multi-image reference anchors, characters drift. The Test 2 result confirmed it (partial pass).

After that moment, we realized the problem was framed wrong. **Layering is what professional animation has used for a century** — cutout animation, sprite layers, 2.5D parallax. The browser is exceptional at positioning rectangles. The AI model is exceptional at rendering single subjects. Use each for what it's best at. Don't ask the model to do composition; let the browser composite.

What this unlocks (in Fritz's own framing):
- *"We could have divs that appear to end at one point but the content area extends past the designed end. Then we could have illusions like confetti coming off the edge of the page."*
- One character cutout serves every page (no regeneration drift)
- Each layer animates independently
- Mouse parallax becomes a couple of CSS variables
- Container queries make it canvas-agnostic
- Same architecture at hero scale (1000+ px) and avatar scale (80–120 px) — *"the flex"*

This insight is now the foundation of the entire MBSH visual system, the foundation of the FAMtastic skill library, and the reason 60+ future sites in the factory will scale rather than re-invent.

### 4.5 The animation-with-code insight

Fritz signaled and we crystallized: **animate ambient motion with code, not with video.** A flickering candle, dust motes, a breathing curtain, drifting confetti, neon pulse — these are all parameterizable. CSS keyframes, Lottie, canvas particles, GSAP, SVG morphs handle them better, cheaper, smaller, more controllable than Veo at $0.40/loop.

Reserve video generation for what code genuinely can't fake: **organic motion that needs real-world physics.** A candle flame's chaos. A hand moving behind glass. Fluid dynamics. For MBSH, that means video gen earns its budget on the Memorial candle and the Playlist confetti/curtain. Everything else: code.

### 4.6 The tiered animation model selection matrix

The decision rule emerged from the test results:

- **CSS / Lottie / SVG** → ambient atmospheric motion (breath, flicker, pulse, drift). Free per asset.
- **Vidu Q3 Reference-to-Video** → character animation with identity locking. Multi-image reference (up to 7) holds character across motion. ~$0.27/clip. Replaces what Veo can't do.
- **Veo 3.1 Lite** → organic scene physics where character identity isn't the constraint. ~$0.40/clip.

This matrix now lives in the `image-and-video-gen.skill` and travels with every future site build.

### 4.7 The photoreal Harry decision — F1 wins

Two photoreal Harry tests ran. F1 (live-action costumed mascot in the vintage theater lobby) won decisively over F2 (Pixar-style CGI character on a neutral studio background). The reasons: F1 sits IN the world we're building (deep red velvet walls, brass railings, warm sconces, lettered "Hi-Tide Harry" shirt rendered cleanly). F2 is gorgeous but generic-studio — it could be any character on any film's promotional still.

**The implication:** the cartoon Harry is being replaced by photoreal Harry across all character reels (Home, Tickets, Through-Years, Playlist, and now the chatbot). The flat illustration becomes the brand-pattern reference; the photoreal F1 becomes the deployed asset.

### 4.8 The chatbot avatar — the "flex"

Fritz: *"and let's make the Hi-Tide Harry chat assistant a realistic one as well. But we either need to give some thought to his positioning and the background. If it can't be transparent, then let's put him in a circular shape container. Not a blank circle. Or how maybe we can apply some layer logic there as well just to flex... lol."*

The collaborative resolution: the chatbot avatar is **the same layered composition recipe applied at 1/15 scale.** Five layers: frame (marquee bulb ring) → scene (warm vignette) → portrait (transparent photoreal Harry) → shine (CSS keyframe glint) → status (typing dot / pulse / glow). The bulb-chase animation doubles as the listening/speaking/idle status indicator. Container queries handle the size shift from hero to avatar without resize math.

**Frame style locked:** marquee bulb ring. Distinctly MBSH, nothing else like it on the web, and it gives the chatbot a built-in personality (the bulbs ARE the status indicator — slow idle pulse, faster listening chase, full glow when speaking).

This decision proved the architecture is **canvas-agnostic.** The same recipe scales from a hero filling the screen to an avatar fitting on a thumbnail. That property is what makes the FAMtastic skill library worth building — patterns that survive scale don't get re-invented per site.

### 4.9 The mobile-first reality

Fritz: *"hmm, we make this configurable. But what about mobile, should I be concerned this is too heavy?"*

The crystallized answer: **most MBSH users will be on mobile. Mobile is not the secondary audience; it's THE audience.** The full desktop experience is too heavy if shipped unchanged, but the layered architecture survives the cut gracefully because each layer is independently degradable.

The "matinee tier" is now a first-class concept — same vibe, lighter rendering. Save-Data header swaps videos for posters. `prefers-reduced-motion` disables loops. Mobile gets 720p WebP/AVIF stills, simpler grain, reduced particle counts, no parallax. Harry is still Harry. The marquee is still the marquee. The motion is just *matinee*, not *premiere*.

This principle now lives in `mobile-degradation.skill` and travels with every site.

### 4.10 The "vibe locked" moments — when something clicked

These are the moments in this conversation when an idea visibly resonated. Worth preserving as signal:

- **"You just got there cleaner than the cookbook does."** — when Fritz proposed layering, before I'd realized why it was the unlock. The instinct was ahead of the analysis.
- **"huge win! with the layer thing. this unlocks so much."** — Fritz's reaction to the architectural reframing.
- **"omg!!! this photo to realism ones is AMAZING!!!"** — F1 landing.
- **"YES!! to the chat bot. THAT WAS AN AMAZING IDEA!"** — marquee bulb ring resonating.
- **"this is the right level. Same code, same patterns, different proportions and one extra ritual."** — Home vs interior framing crystallizing.

These reactions tell us where the design is reaching the level Fritz calls "FAMtastic" — fearless deviation, bold and unapologetic. **The site is closer than the live URL currently shows.** Every visible flat surface today has a designed-but-unshipped cinematic version waiting in Wave 1.

---

## 5. Layered Hero / Layered Content Lessons

The layered DOM composition pattern, formalized as a reusable FAMtastic recipe. This is the section that gets transcribed into the skill library when Phase A skills are authored.

### 5.1 The pattern — what it is

A hero or content section authored as a stack of independently positioned, independently animated, independently regenerable DOM layers:

```
.composition-container  (container-type: inline-size, container query scope)
├── .layer.scene        ← background image, video, or CSS-rendered scene
├── .layer.midground    ← atmospheric fx (motes, fog, light leaks)
├── .layer.character    ← transparent mascot PNG (positioned in cqw)
├── .layer.headline     ← typography in cqw
└── .layer.foreground   ← optional (vignette, frame, foreground prop)
```

Each layer:
- Lives at its own `z-index`
- Has its own CSS animation loop on a different period (no metronome)
- Receives parallax offset via a shared CSS custom property (`--px`, `--py`) set by JS or scroll-driven
- Scales proportionally via container query units (`cqw`)
- Can be regenerated, re-styled, re-animated, or replaced without touching any other layer

### 5.2 Why it works

**Identity drift becomes impossible.** The scene isn't being regenerated when the character changes. The character isn't being regenerated when the scene changes. The model only ever renders single subjects at the highest possible fidelity. The browser does the composition.

**Iteration becomes nearly free.** Want a new pose? Generate one transparent PNG. Don't regenerate the scene. Cost-per-iteration drops from "regenerate the entire composite" to "regenerate the one element."

**Motion becomes layered.** Scene flickers on a 5.3s loop. Character breathes on a 5.5s loop. Headline pulses on a 4.5s loop. Particles drift on a 26s loop. Four independent loops, four different periods. The composition feels alive without any single element dominating.

**The architecture scales.** Same recipe at hero scale (1000+ px) and avatar scale (80–120 px). Container queries (`cqw`) handle the proportions. No JS resize math. No breakpoint cascade.

**Identity locking matters less.** Even when the underlying model has character drift (gpt-image-2 partial on Test 2), the layered architecture sidesteps it — the character asset is generated once and reused.

### 5.3 When to use it

- **Always** for hero sections on FAMtastic cinematic sites
- **Always** for character placements that need to appear consistently across multiple pages
- **When** you want depth, separation of subject and background, or animation choreography across multiple visual elements
- **When** the brand identity includes a mascot that travels across pages
- **When** the design calls for decorative bleed (elements extending past containers)
- **When** the same component needs to work at multiple scales (hero, card, avatar)
- **Always** when the alternative is asking the AI model to composite multiple subjects into one image

### 5.4 Implementation notes

**Two transform layers for character animation:** wrap the character in a positioning div, put the breath/hover animation on the inner `<img>`. This prevents parallax transforms from conflicting with breath transforms.

```html
<div class="layer character">    <!-- positioning + parallax transform -->
  <img src="harry.png" />        <!-- breath animation, hover state -->
</div>
```

**Use CSS variables for parallax depth.** A single set of variables (`--px`, `--py`) updated once on mousemove, applied at different multipliers per layer. Compositor-thread; never blocks main thread.

**Scroll-driven animations replace JS scroll libraries.** `animation-timeline: scroll()` and `view()` are baseline in 2026 (Chrome/Edge/Safari 18+, Firefox progressing). Use them. They save 40–140 KB JS bundle and run on the compositor thread.

**View transitions across pages.** Name the persistent elements (`view-transition-name: medallion-menu` or `marquee` or `chatbot-avatar`). The browser morphs them across navigations. Use `@view-transition { navigation: auto }` for cross-document.

**`@supports` fallbacks where needed.** Firefox is close but not baseline on scroll-driven animations. Wrap fancy scroll choreography in `@supports (animation-timeline: view()) { … }`. The fallback should be a graceful "the element just appears statically" — not a broken layout.

**Container queries everywhere.** Define every layer's size and position in `cqw` units. Same component works in a 100vh hero, a 60vh interior, or an 80px avatar with no other changes.

### 5.5 Mobile / responsive cautions

The layered architecture is mobile-friendly by default because each layer is a single element with `transform` + `opacity` — both compositor-thread, both GPU-accelerated. But specific layers can be expensive:

- **Veo video loops** (3–5MB each) → swap for static posters on `Save-Data` or 2G/3G
- **Canvas particle systems** → reduce density via container queries, or skip on small viewports
- **Complex SVG filters (film grain)** → use lower-detail variants on mobile, or disable
- **Mouse parallax** → doesn't exist on mobile; touch parallax (device orientation) is optional and slightly expensive — default off

**`prefers-reduced-motion` is non-negotiable.** Disable all loops, all parallax, all scroll-driven animations, and swap videos for posters. WCAG 2.1 baseline.

### 5.6 How FAMtastic Studio should store / reuse it

The pattern lives in **two places** in the FAMtastic system:

1. **`layered-composition.skill`** (primitive skill) — the architectural rules, the decision tree, the code templates. Loaded by Studio / Codex / Cowork on demand. Pattern lives here.

2. **`~/famtastic/components/<instance-name>/`** (component library) — actual instances of the pattern applied to a specific site (`reel-hero-mbsh-v1`, `chatbot-avatar-marquee-bulb-ring-v1`, etc.). Implementations live here.

Pattern flows DOWN: Studio queries the skill, gets the rules, generates a new instance using the rules.
Instances flow UP: successful component instances get recorded back to the library for reuse.

The reference implementation that proves the pattern: `layered_hero_composite_test.html` — an interactive demo Fritz can drop into any FAMtastic project as a working example.

The recipe variants the pattern supports:
- `cinematic-hero` — full-bleed or constrained-height hero
- `cinematic-avatar` — small-canvas character portrait (chatbot, profile, host card)
- `cinematic-card` — content cards with character peek, badge break, hover-tilt
- `cinematic-carousel` — Cover-Flow / Film-Strip / Stage-Walk variants
- `cinematic-slideshow` — Iris / Curtain / Marquee-letter-board transitions
- `cinematic-timeline` — scroll-drawn SVG spine with decade markers
- `cinematic-gallery` — masonry, lightbox, before/after
- `cinematic-form`, `cinematic-nav`, `cinematic-footer`, `cinematic-transition`

Every one of these recipes composes the same primitive (`layered-composition`) plus a handful of others (`code-animation`, `scroll-choreography`, `view-transitions`, `decorative-bleed`, `character-system`, `accessibility-baseline`, `mobile-degradation`).

---

## 6. Completion Plan for Committee Readiness

The fastest path to a committee-ready site, sorted by who needs to make each call.

### 6.1 Can do now without more committee input

| # | Task | Estimated effort | Cost |
|---|---|---|---|
| 1 | Generate Wave 1 assets: 5 photoreal interior hero stills (Imagen 4.0) | 1 Codex session | ~$0.02 |
| 2 | Generate Wave 1 assets: 3 transparent photoreal Harry poses (E2 BiRefNet pipeline) | 1 Codex session | ~$0.51 + matte |
| 3 | Generate Wave 1 asset: chatbot Harry portrait (transparent, photoreal head & shoulders) | Same session as #2 | ~$0.17 + matte |
| 4 | Implement inner-page scene markers (one-span-per-page follow-up; `page-sequence.js` foundation already shipped) | 1 Cowork session, ~30 min | $0 |
| 5 | Build the layered hero component (`cinematic-hero` reference instance) using existing demo as template | 1 Cowork session, ~2 hours | $0 |
| 6 | Wire the layered hero into RSVP / Tickets / Through-Years / Capsule / Playlist pages | 1 Cowork session, ~2 hours | $0 |
| 7 | Build the chatbot Harry layered avatar with marquee bulb ring frame and bulb-chase status indicator | 1 Cowork session, ~3 hours | $0 |
| 8 | Replace static 06-listening.png with the layered chatbot avatar across all pages | Same session as #7 | $0 |
| 9 | Generate Wave 1 asset: Memorial candle Veo loop (image-to-video, 8s, no audio) | 1 Codex session | ~$0.40 |
| 10 | Generate Wave 1 asset: Playlist curtain/confetti Veo loop | Same session as #9 | ~$0.40 |
| 11 | Build the In Memory page: candle hero + per-name CSS-animated tribute candles + Add-a-Name FORM (with moderation queue) | 1 Cowork session, ~4 hours | $0 |
| 12 | Build the Note from Usher marquee per existing Claude Design canvas | 1 Cowork session, ~2 hours | $0 |
| 13 | Remove or hide "Instagram & Facebook coming soon" line in footer (or link real accounts when ready) | 5 min | $0 |
| 14 | Verify and fix `#submit-memory` and `#sponsor` anchors on through-years and tickets | 30 min | $0 |
| 15 | Apply mobile matinee tier: Save-Data swap, prefers-reduced-motion, reduced particles, simplified grain | 1 Cowork session, ~2 hours | $0 |
| 16 | Stage everything to `mbsh-reunion-staging.netlify.app` for committee preview before production push | 15 min | $0 |

**Total Wave 1 asset cost: ~$1.57**
**Total time-to-staging if all sessions run in sequence: ~3 focused days**
**Total time-to-staging if some sessions run in parallel: ~1.5 days**

### 6.2 Needs Fritz decision (small calls; not blocking)

| # | Decision needed | Default if Fritz doesn't decide |
|---|---|---|
| 1 | Curtain ritual frequency (per-session, daily, every visit, first-only, never) | `daily` — replays on first visit of each calendar day |
| 2 | Vidu video budget — generate one for Tickets Harry-wave, or keep Tickets as code-animated still? | Keep Tickets code-animated; reserve Vidu budget for special moments later |
| 3 | "October–November 2026" date band — keep as is until committee locks, or replace with placeholder text? | Keep current "October–November 2026" until committee locks the exact date |
| 4 | Home reel numbering — keep current live (Home unnumbered, inner reels I–VI) or follow plan (Home = Reel I, RSVP–Playlist = Reels II–VII) | Keep live numbering; update the plan doc to match the live framing |

### 6.3 Needs committee decision (blocking the relevant page)

| # | Decision needed | Page blocked |
|---|---|---|
| 1 | Exact reunion date — month, day, time | Home, RSVP, Tickets, all countdown displays |
| 2 | The full list of names for the In Memory tribute | In Memory page (currently nothing displayed) |
| 3 | Photos / decade content for Through the Years (committee likely has yearbooks, photo collections) | Through-Years page |
| 4 | Sponsorship tier final framing — are the three tiers (Marquee $2,500 / Producer $1,000 / Featured $500) committee-approved? | Tickets / sponsorship section |
| 5 | The Playlist songs — committee curation or open submission? | Playlist page |
| 6 | Whether the Time Capsule messages are delivered at the reunion or by mail later | Capsule page copy |

### 6.4 Should wait until after committee preview

| # | Item | Why wait |
|---|---|---|
| 1 | Full marketing push (announcing the site to alumni) | Committee should see staging first |
| 2 | Social media link activation | Wait until accounts exist and committee approves voice |
| 3 | Backend `sponsor.php` shim deploy | Committee approval on tier names + backend integration approach |
| 4 | Photoreal Harry style migration across all four character reels | Committee reaction to Harry direction matters before committing |
| 5 | Any structural reorder of reels | Lock with committee before rewiring view transitions |

---

## 7. Production Safety Plan

How to get from current local repo state to staging to production without breaking the live domain.

**Note: This is best-practice guidance based on the conversation history. The local agent should verify each step against the actual Netlify settings during Section 3's follow-up pass.**

### 7.1 The branches and what they mean (likely setup)

Based on conversation history:
- `main` → deploys to `mbsh96reunion.com` (production)
- `staging` → deploys to `mbsh-reunion-staging.netlify.app` (committee preview)
- Feature branches (e.g., `cleanup-final-stage-2026-05`) → not auto-deployed; merged to `staging` or `main` when ready

### 7.2 The safe deployment sequence

For each batch of changes (Wave 1 assets, layered hero component, chatbot avatar, In Memory build):

1. **Work on a feature branch.** Example: `git checkout -b feature/layered-hero-wave-2`
2. **Validate locally first.** Open the site locally (Studio dev mode or local Netlify dev) and visually verify each affected page renders.
3. **Push to `staging` first.** Merge or push the feature branch to `staging`. Netlify auto-deploys to `mbsh-reunion-staging.netlify.app`.
4. **Verify on staging.** Open the staging URL on desktop AND mobile. Test the affected pages. Check the chatbot avatar, the new hero, the In Memory candles, etc.
5. **Wait for committee preview if appropriate.** Major changes (hero direction, In Memory treatment, photoreal Harry) should get committee eyes on staging before promotion.
6. **Promote to `main` only when satisfied.** Merge `staging` → `main`. Netlify auto-deploys to production.
7. **Verify on production.** Hit `mbsh96reunion.com`, walk through every page on desktop and mobile, confirm the deploy landed cleanly.

### 7.3 Hard rules during the build

- **Never push directly to `main`.** All production deploys go through `staging` first.
- **Never deploy on the same day the committee is presenting.** Allow at least 24 hours of staging soak.
- **Never modify Netlify DNS or domain settings without explicit Fritz approval.**
- **Never commit secrets or API keys.** OpenAI / Gemini / Vidu / Imagen keys live in env vars (Netlify env settings or local `.env` ignored by git), never in source.
- **Never run the backend `sponsor.php` shim deploy implicitly.** Backend changes require manual cPanel rsync. This is the existing safety pattern.

### 7.4 Rollback plan if something breaks production

Netlify keeps deploy history. If a `main` deploy breaks production:
1. Open Netlify dashboard → MBSH site → Deploys
2. Find the last known-good deploy
3. Click "Publish deploy" on that deploy
4. Production reverts in ~30 seconds
5. Investigate the breakage on a feature branch; do NOT push to `main` again until verified on `staging`

This rollback is the safety net. It exists because Fritz set up the staging → main flow earlier this session.

### 7.5 What the local agent should do BEFORE the first Wave 1 deploy

1. Confirm the repo path (Section 3 follow-up)
2. Confirm `git status` is clean (no uncommitted local changes)
3. Confirm `main` and `staging` are in sync (or know which is ahead)
4. Verify the Netlify build is currently green (last deploy succeeded)
5. Verify the env vars Netlify uses for the build are still valid (no expired keys)
6. Take note of the last commit SHA on `main` (for rollback reference)

Only after these six confirms should any Wave 1 work touch `staging`.

---

## 8. FAMtastic Studio Lessons

What this conversation should teach the Studio's brain about how to build future sites, capture creative trails, and avoid re-discovering hard-won knowledge.

### 8.1 What should become a standard site-completion workflow

The MBSH journey from "site exists" to "site feels like the experience the committee imagined" maps to a repeatable workflow:

1. **Brief intake** — site type, audience, theme, must-haves, blocking decisions
2. **Reel-by-reel scene plan** — for narrative sites, every page is a Reel; for non-narrative sites, every section is a Scene. Each gets a layer breakdown + animation map + transition direction.
3. **Asset budget** — calculate Wave 1 asset cost upfront ($1.57 for MBSH; varies per site). Get explicit budget approval before generation.
4. **Wave 1: Assets** — Imagen stills + transparent character poses + Veo loops where code can't fake the motion
5. **Wave 2: Layered component build** — one reusable `<cinematic-hero>` (or component) instance per site, configured per reel
6. **Wave 3: Scroll choreography** — wire scroll-driven animations per reel
7. **Wave 4: Cross-page view transitions** — name the persistent elements, author the transitions
8. **Wave 5: Performance + accessibility + polish** — Lighthouse, reduced-motion audit, mobile matinee tier, keyboard nav, screen reader pass
9. **Staging preview gate** — committee / stakeholder review on staging URL before production
10. **Production deploy** — `staging` → `main` only after explicit go-ahead

This becomes the FAMtastic Studio standard for any cinematic-tier site.

### 8.2 What should become a vibe-capture workflow

This conversation itself is the artifact. Vibe-capture means:

1. **Long-form working chats are first-class outputs.** Don't reduce a 50-message design conversation to a 5-bullet summary. The messy back-and-forth IS the design trail.
2. **Phrases that get repeated become doctrine.** When Fritz says something twice ("the lobby is the building," "matinee tier," "the flex"), that phrase has earned a permanent home in the project glossary.
3. **Reactions are signal.** "AMAZING IDEA," "huge win," "wow," "omg" — these are vibe-locked moments. Capture them with the idea they're reacting to.
4. **Disagreements and corrections are also signal.** When Fritz pushes back ("of course there's more dude," "we never pushed to prod, remember?"), the correction reveals where the system or my own framing is off. Capture those too.
5. **The vibe-recovery report itself is a deliverable.** This document. Future sites should have one of these per project, captured incrementally as the project develops, not retrospectively after the fact.

### 8.3 What should be added to SITE-LEARNINGS.md

The cross-site learnings file should get these entries from MBSH:

- **Layered DOM composition is the canonical pattern for cinematic UI.** Replace any "model-composited scene" approach.
- **Animate ambient motion with code, reserve video gen for organic physics only.**
- **Container queries (`cqw`) make components canvas-agnostic** — same component works at hero / card / avatar scale without resize math.
- **gpt-image-2 doesn't accept `input_fidelity`** — cookbook code examples are stale on this; model summary table is authoritative.
- **Imagen 4.0 at 1/40th the cost of gpt-image-2** wins for broad iteration; gpt-image-2 reserved for final hero candidates and lighting variants.
- **Vidu Q3 Reference-to-Video** is the right tool for character animation with identity locking (up to 7 reference images).
- **BiRefNet alpha matting** is the canonical transparent character extraction pipeline; `background='transparent'` native param often returns checkerboard pattern, don't trust without verifying alpha channel.
- **Mobile is THE audience for community / event sites, not the secondary audience.** Design mobile-first, matinee tier as default, premiere tier as desktop enhancement.
- **CSS Overflow Level 5 ships native carousels in 2026** — no JS carousel library needed for typical use cases.
- **Scroll-driven animations are 2026 baseline** in Chrome/Edge/Safari 18+; replace GSAP/ScrollMagic for most use cases.

### 8.4 What reusable skill / recipe should be created

The full skill catalog is in `famtastic_skill_library_architecture.md`. The three highest-priority skills to author first, in this order:

1. **`layered-composition.skill`** (primitive) — the architectural unlock. Reference implementation: `layered_hero_composite_test.html`. Without this, every future cinematic site re-discovers the pattern.

2. **`image-and-video-gen.skill`** (production) — the cookbook + model selection matrix + the `input_fidelity` gotcha + the cost decision tree. Without this, every future asset-gen session re-makes the same parameter mistakes.

3. **`cinematic-hero.skill`** (recipe) — the first recipe that composes #1 + several other primitives. Validates the entire three-layer skill model end-to-end.

After these three, MBSH Wave 2 can build *using these skills* rather than from raw prompts. The skill library starts paying for itself on the very next site.

### 8.5 What the Studio should learn structurally

- **The component library and the skill library are different things and they work together.** Patterns live in skills (canonical rules). Instances live in components (per-site implementations). Patterns flow down, instances flow back up.
- **Briefs should drive recipe selection.** "We want a hero" → `cinematic-hero`. "We want a carousel" → `cinematic-carousel`. The brief intake should output a list of recipes the site needs.
- **Costs should be budgeted at the asset layer.** Every site should have a Wave 1 budget cap published before generation runs.
- **The vibe-recovery report is the missing artifact in the build pipeline.** It should be produced and saved at the end of every site's design phase.

---

## 9. Open Questions

Things I couldn't verify, things I'm uncertain about, things that need human judgment.

1. **Repo identification** — Section 3 entirely. Which local repo controls mbsh96reunion.com? What's the exact deploy chain? Local agent must verify.

2. **Current uncommitted state** — Is the live site behind, equal to, or ahead of the local repo's main branch? Local `git status` needed.

3. **Date range ambiguity** — "October–November 2026" on the Home — is this intentional ("we're locking the exact date with the venue") or a placeholder ("we forgot to update this")? Committee should confirm.

4. **Memorial names list** — Does the committee already have a names list compiled, or is curation in progress? This blocks the entire Memorial page build.

5. **Through-the-Years content** — does the committee have decade content (photos, captions, quotes) compiled, or is content curation needed? Either way, Wave 1 hero asset for the projection booth can run today.

6. **Vidu API access** — does Fritz have a Vidu account / API key, or is testing it a separate signup step? Affects the timing of the photoreal Harry animation test.

7. **Backend sponsor.php deployment** — Fritz earlier marked this as "parked indefinitely." Is that still the case, or should the back-compat shim ship before the committee preview?

8. **Committee presence on the site review** — when is the committee actually going to review staging? That date drives the staging-soak schedule.

9. **The cinematic-form skill scope** — should this skill be authored in Phase B (early) since MBSH has multiple forms (RSVP, Capsule, Memorial Add-a-Name, Sponsor inquiry, Playlist suggest), or in Phase E (later) per the current plan? Argument for early: MBSH would benefit immediately. Argument for later: the three Phase B skills already unblock Wave 2.

10. **Component library current state** — does `~/famtastic/components/library.json` already exist, or is it pending implementation? The skill plan assumes it exists; the Studio v3 plan describes its design.

11. **The vibe-capture workflow itself** — should the Studio build a "capture session as report" feature that automatically generates a vibe-recovery doc from any long working chat? This conversation suggests yes.

---

## 10. Recommended Next Prompt

The exact prompt Fritz should give the local implementation agent (Cowork, Codex, or Claude Code with filesystem access) after reviewing this report.

```
I have a Claude Web vibe-recovery report saved to:
  /Users/famtasticfritz/famtastic/captures/inbox/mbsh-vibe-recovery-report.md

(If that path doesn't exist yet, the report is at the original
path I'll provide separately — you can move/copy it into the
captures/inbox directory.)

Two companion plan docs are also relevant and should be saved
alongside it:
  - mbsh_reels_layered_experience_plan.md
  - famtastic_skill_library_architecture.md

(These come from the same Claude Web session and contain the
full reel-by-reel cinematic plan and the 26-skill library
architecture. Save them into the same captures/inbox
directory if they aren't already there.)

Your mission, in three sequenced passes:

============================================================
PASS 1 — Repo source-of-truth audit (read-only)
============================================================

Read the report at the path above. Section 3 was left blank
by Claude Web because filesystem access wasn't available.
Complete it now:

1. Run scripts/agent-checkin.js if it exists, with intent
   "MBSH source-of-truth audit + Wave 1 prep"

2. Identify the local repo controlling mbsh96reunion.com.
   Most likely under ~/famtastic-sites/ — look for any
   directory matching mbsh, reunion, or class-of-96.

3. Inside the candidate repo, verify:
   - package.json (name, scripts, build command)
   - netlify.toml (branches, build settings, redirects)
   - .git/config (remote URL, branches)
   - Any reference to "mbsh96reunion.com" in source files
   - Presence of frontend/js/page-sequence.js
   - Presence of the three CSS tokens in frontend/css/base.css:
     --text-on-light, --text-muted-on-light,
     --placeholder-on-light

4. Capture for the report (do NOT modify anything):
   - Exact repo path
   - Production branch name
   - Staging branch name
   - Netlify site ID and team
   - Output of `git status` (uncommitted changes?)
   - Whether main and staging are in sync
   - Last commit SHA + timestamp + message on main

5. Update Section 3 of the report with these findings.
   Save the updated report back to its original path.

DO NOT:
- run git push
- run netlify deploy
- modify DNS
- modify Netlify env vars
- delete uncommitted changes

============================================================
PASS 2 — Wave 1 asset generation (paid; ~$1.57)
============================================================

Only proceed if Pass 1 confirms clean state and Fritz
approves the spend.

Follow Section 6.1 of the report — items 1, 2, 3, 9, 10:
generate 5 photoreal interior hero stills (Imagen 4.0),
3 transparent photoreal Harry poses (E2 BiRefNet),
the chatbot Harry portrait, and the 2 Veo loops (Memorial
candle + Playlist curtain/confetti).

Cost cap: $1.57. Hard stop if exceeded — get Fritz's
approval before continuing.

Save all assets under the MBSH site repo's appropriate
asset path (verify path from Pass 1's repo audit findings).

DO NOT deploy yet. Local staging only.

============================================================
PASS 3 — Layered hero component build (staging only)
============================================================

Only proceed if Pass 2 assets are saved and Fritz approves.

Read mbsh_reels_layered_experience_plan.md Sections 2 and 3
(per-reel layer breakdowns and cross-reel system).

Read layered_hero_composite_test.html as the reference
implementation.

Build:
1. The layered hero component as a reusable pattern
   (~600 lines per the plan estimate)
2. Per-reel instances for RSVP, Tickets, Through-Years,
   Capsule, Playlist (~50 lines per instance)
3. The In Memory page rebuild with candle Veo loop hero,
   per-name CSS tribute candles, and Add-a-Name FORM
   (not the current email link) with moderation queue
4. The chatbot Hi-Tide Harry layered avatar
   (marquee bulb ring frame, bulb-chase status indicator,
   transparent photoreal Harry portrait, 5-layer
   composition per Section 3.10 of the reels plan)
5. The inner-page scene markers
   (one-span-per-page follow-up, page-sequence.js
   foundation is already shipped)
6. The Note from Usher marquee
   (Claude Design canvas exists in /home/claude/mbsh2/
   from an earlier session; reference the marquee.jsx
   and scenes.css files there)
7. Mobile matinee tier
   (Save-Data swap, prefers-reduced-motion,
   particle reduction, simplified grain)

Deploy to staging only:
  git checkout -b feature/cinematic-wave-2
  ... work ...
  git push origin feature/cinematic-wave-2
  ... merge to staging via PR or direct merge ...

Verify on staging URL on desktop AND mobile.
DO NOT promote to main until Fritz approves.

============================================================
After Pass 3
============================================================

Pause. Wait for Fritz / committee review on the staging URL.
Production deploy happens only after explicit go-ahead and
at least 24 hours of staging soak.

Report back with:
- Pass 1 findings (the updated Section 3)
- Pass 2 asset paths + total spend
- Pass 3 staging URL + Lighthouse scores per page
- Anything that broke or surprised you
- Any open question that needs Fritz's call before continuing
```

---

## Closing note

The MBSH site is closer to its destination than the live URL currently shows. The frame is in place. The voice is right. The cleanup pass shipped real fixes. **The cinematic experience the committee imagined exists in plans, prompts, and a working layered-architecture demo — it just hasn't reached the deployed pages yet.**

Wave 1 assets run for under $2 and one Codex session. Wave 2 build, with the layered architecture and the photoreal Harry, transforms the site from "complete frame" to "cinematic experience" in 2–3 focused Cowork sessions. Committee preview gate after that. Production promotion only with explicit approval.

The site is not in trouble. It is in mid-arc. The arc is captured.

— end of report —
