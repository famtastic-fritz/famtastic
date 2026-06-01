# MBSH Reunion — Typography & Icon System

**Status:** Pre-build design spec
**Captured:** 2026-04-27
**Theme reference:** Elegant movie premiere / cinematic / red-carpet
**Goal:** Visuals win. This is the highest-design-budget site to date.

---

## Typography Strategy

**Stack: Six fonts total.** This is not a frugal site. The system below covers cinematic display, body readability, two cursive scripts (one elegant, one expressive), an accent for sponsors/legacy, and a monospace for any data/dates.

### 1. Display / Title Font
**Playfair Display** (Google Fonts, free)

- Movie poster energy, high contrast strokes, dramatic ascenders
- Used for: hero headline, page titles, section dividers, "30 YEARS" / "100 YEARS" milestone callouts
- Feels: elegant, weighted, deliberate, like vintage Vogue + indie film title card
- Sizes: 60-120px hero, 48-64px section heads
- Weight: 700-900 for impact moments, 400 for subheads

### 2. Body / Long-Form Font
**Cormorant Garamond** (Google Fonts, free)

- Editorial serif, refined, holds elegance at body sizes
- Used for: paragraphs, captions, event descriptions, sponsor blurbs
- Feels: New Yorker meets film festival program
- Sizes: 18-22px body, 14-16px captions
- Weight: 400 body, 500 emphasis, 700 lead-ins

### 3. Cursive #1 — Elegant / Formal
**Allura** (Google Fonts, free)

- Calligraphic flow, formal but warm, mid-weight letterforms
- Used for: "Welcome Class of '96" hero overlay, invitation language, "Let us be known for our deeds" tagline placement
- Feels: black-tie invitation, hand-addressed envelope
- Sizes: 80-140px statement moments only
- Weight: 400 (single weight)

### 4. Cursive #2 — Cinematic / Signature
**Great Vibes** (Google Fonts, free) **OR** Pacifico (warmer alternative)

- Pick: Great Vibes — more cinematic, less casual
- Used for: name-of-event lockup, "Hi-Tide Harry" wordmark on chatbot UI, photo caption flourishes, "with gratitude" sponsor headers
- Feels: 1940s movie title, signed photograph
- Sizes: 60-100px accents
- Weight: 400

### 5. Accent / UI Font
**Inter** (Google Fonts, free)

- Clean modern sans for UI elements that don't need editorial weight
- Used for: buttons, form labels, navigation items, sponsor tier labels, Hi-Tide Harry chatbot UI
- Feels: invisible, gets out of the way
- Sizes: 14-18px UI
- Weight: 400-600

### 6. Monospace / Data
**JetBrains Mono** (Google Fonts, free)

- For dates, countdowns, RSVP confirmation codes, ticket numbers
- Feels: precise, modern, just-right contrast against the elegance
- Sizes: 14-18px
- Weight: 400

---

## Pairing Rules

- **Hero:** Allura cursive overlay (small) + Playfair Display headline (large)
- **Section heads:** Playfair Display only — let it carry
- **Body copy:** Cormorant Garamond exclusively
- **Pull quotes:** Cormorant Garamond italic at 1.5x body size
- **Sponsor names:** Playfair Display 600
- **Sponsor blurbs:** Cormorant Garamond 400
- **Tagline placement:** Great Vibes
- **Buttons:** Inter 600 uppercase with letter-spacing
- **Dates / RSVP codes:** JetBrains Mono

**Rule of restraint:** Allura and Great Vibes are seasoning, not the meal. Use sparingly. Two cursive fonts on one screen = chaos. One cursive moment per section maximum.

---

## Loading Strategy

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,700;1,400&family=Allura&family=Great+Vibes&family=Inter:wght@400;500;600;700&family=JetBrains+Mono&display=swap" rel="stylesheet">
```

Single Google Fonts call. ~85KB total. No paid font dependencies.

---

## Icon System

**Primary: Lucide Icons + custom AI-generated multi-material icons**

### Why Lucide as base
- 1,400+ icons, MIT license, no attribution needed
- Consistent 24px grid, 1.5px stroke
- Already in Studio's stack (used by other components)
- Clean, scannable at all sizes
- React/Vue/SVG support

### Icon strategy by context

**UI navigation icons (Lucide, default)**
- Nav arrows, close X, menu burger, search, user, calendar, mail, phone, map-pin
- Style: 1.5px stroke, current color, 24px standard
- These don't need to feel premium — they need to disappear

**Feature icons (Lucide + custom color treatment)**
- Schedule clock, sponsor crown, heart for connect, camera for gallery, scroll for legacy
- Style: 1.5px stroke, scarlet (#C8102E) on hover, silver on default
- Used for: section header decorations, list bullets, tier markers

**Premium / signature icons (custom AI-generated, multi-material)**
- The 6-10 hero moments where icons need to feel luxurious
- Generated via gpt-image-2 with prompts like: "luxury icon, silver foil texture on red background, classic elegant, transparent background"
- Used for: sponsor tier badges (Platinum/Gold/Silver/Bronze), milestone markers (30 years, 100 years), VIP indicators, RSVP confirmation seal
- Style: multi-material per 2026 trend — silver foil, glass, metallic finish
- Treated like jewelry on the page

**Animated icons (Lottie or CSS, sparingly)**
- Hi-Tide Harry chatbot indicator (subtle pulse)
- Loading states
- Sponsor reveal sweep
- Maximum 4-5 animated moments site-wide — restraint preserves elegance

### Icon library structure

```
~/famtastic/sites/site-mbsh-reunion/assets/icons/
├── lucide-base/                    (downloaded subset, ~40 icons used)
│   ├── arrow-right.svg
│   ├── calendar.svg
│   ├── ... (UI essentials)
├── premium-custom/                  (gpt-image-2 generated)
│   ├── tier-platinum.png
│   ├── tier-gold.png
│   ├── tier-silver.png
│   ├── tier-bronze.png
│   ├── milestone-30.png
│   ├── milestone-100.png
│   ├── vip-seal.png
│   └── rsvp-confirmed.png
└── animated/                        (Lottie JSON or CSS)
    ├── harry-indicator.json
    └── sponsor-reveal.css
```

---

## Color Application Rules

**Locked palette:**
- **Primary red:** #C8102E (MBSH scarlet — verify exact hex from school materials)
- **White:** #FFFFFF
- **Silver:** #C0C0C0 with metallic gradient (NOT flat gray)
- **Black:** #0A0A0A (off-black for elegance, never pure #000)
- **Cream:** #F8F4EC (warmer than white for sections that need air)

**Application:**
- Hero/headlines: White or silver on dark, red on light
- Body text: Off-black on cream
- CTAs: Red with silver hover, or silver with red hover (test both)
- Sponsor wall backgrounds: Off-black with silver dividers
- Cursive accents: Red OR silver, never both in same view

---

## Sample Hero Composition

```
(Full-width Veo 2 background video, slow tracking shot)
(Dark gradient overlay bottom 60%)

  [Allura, 80px, silver]
    Welcome back, Class of '96

  [Playfair Display 900, 120px, white]
    THIRTY YEARS
    OF HI-TIDES

  [Cormorant Garamond italic, 22px, cream]
    Saturday, October [TBD], 2026 — Miami Beach

  [Inter 600, 16px uppercase, on red button]
    RESERVE YOUR SEAT

  [Great Vibes, 36px, silver, bottom-right corner]
    Let us be known for our deeds
```

That single screen carries all five visual fonts in distinct, purposeful roles. No font does the same job twice.

---

## Mobile Typography Adjustments

- Hero headline drops from 120px → 56-72px
- Allura overlay drops from 80px → 32-40px
- Body stays 18px (don't shrink readability)
- Sponsor wall stacks single-column with same hierarchy
- Great Vibes accents remain because mobile elegance matters most

---

## Standing Rules

1. **Five fonts per page maximum.** JetBrains Mono only appears where data lives.
2. **Two cursive moments per section maximum.** Allura OR Great Vibes, not both.
3. **Premium icons reserved for sponsor/milestone/VIP contexts only.** Lucide handles everything else.
4. **No emoji icons.** This is a black-tie site.
5. **Custom AI-generated icons match the multi-material 2026 trend** — silver foil, glass, metallic finishes.
6. **Animated icons capped at 5 site-wide.** More = noise, not luxury.
7. **Test all typography at mobile breakpoints first.** Phone is where most classmates will see this.

---

## Asset Generation Budget Allocation

Out of $50 total AI generation budget:

| Asset type | Estimated spend | Notes |
|---|---|---|
| Hi-Tide Harry 25 poses | $12-18 | gpt-image-2 with reference image, ~$0.05-0.10/image, multiple iterations per pose |
| Hi-Tide Harry 5-8 animated loops | $4-8 | Veo 2 from still poses, ~$0.50/clip |
| Hero background video iterations | $5-15 | Veo 2, generate 10-20, keep best 1-2 |
| Section background videos (3-5) | $3-8 | Veo 2 short clips |
| Premium custom icons (8-10) | $1-3 | gpt-image-2 multi-material |
| Hero/feature stills | $2-5 | gpt-image-2 cinematic stills, archival treatment |
| Total | ~$30-50 | Comfortable headroom |

---

## Next Concrete Action

1. Save this doc to `~/famtastic/sites/site-mbsh-reunion/research/typography-and-icons.md`
2. Verify exact MBSH scarlet hex (check school materials, current website, recent merch)
3. Download Lucide icon subset (40 icons) into `assets/icons/lucide-base/`
4. After Hi-Tide Harry character lock: generate the 8 premium custom icons via gpt-image-2
5. Build CSS variable file from the locked color + font system before any HTML generation
