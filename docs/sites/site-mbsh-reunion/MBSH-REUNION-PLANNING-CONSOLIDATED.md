# MBSH Class of '96 Reunion Site — Consolidated Planning Doc

**Status:** Pre-build planning artifact
**Site:** mbsh96reunion.com
**Captured:** 2026-04-27 (rev 2)
**Reunion:** October 2026 (date pending committee confirmation)
**Showcase:** FAMtastic flagship demo

---

## Identity (Locked)

- **School:** Miami Beach Senior High School
- **Mascot:** Hi-Tide Harry — original cartoon mascot, see character sheet for full description
- **Colors:** Red and White, with Silver accents
- **Tagline:** "Let us be known for our deeds"
- **Founded:** 1926 — **2026 = 100th anniversary of the school**
- **Class:** 1996 — 30th reunion
- **Domain:** mbsh96reunion.com (DNS set)
- **Contact:** mbsh96reunion@gmail.com

---

## Design Direction (Locked)

**Theme: Elegant. Movie premiere. Super fancy.**

Not a typical reunion site. Not a school spirit site. This is a black-tie event-class site:
- Cinematic hero
- Slow, deliberate animations
- Luxurious typography (serif headlines, refined sans body)
- Generous whitespace
- High-contrast imagery treated like film stills
- Gold/silver metallic accents on red foundation
- Award-show / red-carpet energy
- Background video should feel like a movie trailer, not a school promo

The school produced world-famous athletes, movie stars, rappers, and ultra-wealthy alumni. **The design must signal that caliber without name-dropping.**

---

## Why This Site Matters

1. 30th reunion of Class of '96
2. 100th anniversary of MBSH (dual milestone)
3. First FAMtastic flagship showcase build
4. First publicly available canonical Hi-Tide Harry visual identity
5. Future portfolio anchor for every FAMtastic client pitch
6. Possible launchpad for FAMtastic brand publicly

Confirmed alumnus per public record: Chad Johnson (NFL, inducted 2010 Hall of Fame).

---

## The FAMtastic Bar (Locked Requirements)

- Most FAMtastic site built to date
- Cinematic background video in hero
- AI-generated imagery at highest quality
- Full animations — nothing static
- Mobile experience as impactful as desktop
- Social/app extension beyond the event
- Hi-Tide Harry chatbot/virtual assistant integrated
- **Sponsor donations + sponsor wall** (NEW)
- Black-tie elegance throughout

---

## Sponsor Architecture (NEW)

### Sponsor Donations
- Tiered donation levels (Platinum / Gold / Silver / Bronze, or themed: Diamond/Hi-Tide Captain/Hi-Tide Crew/Hi-Tide Friend)
- Suggested amounts per tier
- Custom amount option
- Payment via PayPal initially, Stripe later if needed
- Tax/receipt language stated clearly
- Sponsor benefits per tier (logo placement, recognition at event, etc.)

### Sponsor Wall
- Dedicated page or prominent section
- Tier-grouped display
- Logo + name + optional message
- Animated entrance per sponsor
- Sortable / filterable
- "Become a Sponsor" CTA prominent

### Sponsor flow needed
- Sponsor signup form (logo upload, tier selection, message, contact info)
- Backend storage of sponsor data
- Manual approval gate (committee review before going live on wall)
- Auto-add to wall after approval

---

## Hi-Tide Harry — Mascot Brief

- Original cartoon character (canonical)
- Red, white, silver — school colors
- "Hi-Tide Harry" on shirt
- Speed/energy as core personality
- Miami Beach energy — sun, ocean, South Florida
- Fully original IP
- 25 poses minimum for chatbot use
- Tool path: Leonardo.ai with style-locking, OR Imagen 4 + IP-Adapter
- **Important:** No publicly findable Hi-Tide Harry image exists. What FAMtastic builds becomes canonical.

Fritz has a starting drawing he's iterating on.

---

## Hi-Tide Harry Chatbot/Virtual Assistant

Three phases:
1. **Phase 1 — Data collector:** Gathers feedback, learns what classmates want
2. **Phase 2 — Informative:** Answers questions about reunion, school, event
3. **Phase 3 — Interactive:** Topic-specific conversations, classmate connections

First branded AI chatbot built through Studio. Requires chatbot fundamentals education before building. Phase 1 minimum for launch; Phase 2/3 can iterate.

---

## Image / Asset Sources

### Best starting points
- Class of 1996 reunion page (links to 1993 + 1994 yearbooks publicly)
- Alumni photo pages at MiamiBeachHighSchool.org
- Class Instagram — active for the reunion
- Facebook reunion group — public trail

### Archival sources for "Through the Years"
- **Florida Memory** (floridamemory.com): 1942 football team, 1942 senior prom, 1963 campus, Skip Bertman as MBHS football/baseball
- **Flashback Miami** (flashbackmiami.com): 1963, 1962 "Top Tides" assembly, 1985 pep rally, 1979 homecoming, 1987 flagettes

### Yearbook trail
- 1993 freshman + 1994 sophomore publicly linked
- 1995–96 scarce, crowd-source from classmates
- Ancestry has 18 MBHS yearbooks
- HistoryMiami has MBSH through 1996
- Classmates.com (semi-locked)

### Sports image hunt priority (per alumni count)
| Sport | Alumni | Priority |
|---|---|---|
| Swimming | 17 | High |
| Football | 16 | High |
| Track | 13 | Medium |
| Cheerleading | 11 | High |
| Basketball | 7 | Medium |
| Soccer | 7 | Medium (district champs 1996) |
| Baseball | 6 | Medium |

---

## Pre-Build Decisions Needed

- [ ] Venue confirmed
- [ ] PayPal business account (or Fritz's PayPal.me as fallback)
- [ ] Reunion date locked (October 2026, day TBD)
- [ ] Pricing model (registration tiers)
- [ ] Sponsor tiers + benefits + suggested amounts
- [ ] Crowd-sourced 1996 photos
- [ ] Hi-Tide Harry final character design
- [ ] Celebrity strategy (no name-drop, design carries it)
- [ ] Social/app scope ("beyond the reunion" definition)
- [ ] School logo sourced from MBSH website
- [ ] Sponsor logo intake/approval flow

---

## Site Structure (Draft)

- **Home** — cinematic background video, dual milestone callout (30 years + 100 years), Hi-Tide Harry presence, headline registration CTA, sponsor preview strip
- **Our Story** — class story, "Through the Years" timeline using archival imagery, treated like a documentary
- **Event Details** — date, venue, schedule, registration, payment, dress code (black-tie?)
- **Gallery** — crowd-sourced 1996 photos, archival, "movie still" presentation treatment
- **Connect** — classmate directory, social, RSVP
- **Hi-Tide Harry** — character page + chatbot interface
- **Legacy** — school's 100 years, alumni achievements without name-dropping
- **Sponsors** — tiered sponsor wall, "Become a Sponsor" CTA, donation flow
- **Donate / Sponsor** — separate flow for tier selection + payment + logo upload

---

## Existing Assets

- Domain set: mbsh96reunion.com
- Earlier build exists at `street-family-reunion-staging.netlify.app` (different site, but Imagen/Veo + JS pass artifacts reusable)
- Veo 2 hero video pipeline working (~33s gen, ~2.4MB)
- Imagen 4 image generation working
- Component library: parallax-section, animated-counter, photo-slideshow, slideshow.js, card-animations.js, counter-animation.js, smooth-scroll.js, lazy-load.js, parallax.js
- Hi-Tide Harry starting drawing (Fritz has it)

---

## Build Approach

Not rushed. Planned properly. FAMtastic flagship.

Phased:
1. **Pre-build prep** — assets, lock decisions, finalize Hi-Tide Harry
2. **Sponsor architecture decision** — tiers, flow, technical approach (manual vs. automated approval)
3. **Brief assembly** — through Studio, with full research + sponsor model loaded
4. **Initial build** — Studio with P0+P1 baseline confirmed
5. **Iteration cycles** — multiple passes for FAM score >90 and "elegant movie feel" judgment
6. **Chatbot integration** — Phase 1 minimum for launch
7. **Sponsor wall integration** — manual seed first, automation if time
8. **Deploy + share** — staging preview to committee, polish, production

---

## What's Different vs. Other P2 Pilots

- Not testing platform — proving it
- Maximum-viable, not minimum-viable
- Multiple build cycles expected
- Chatbot is real scope
- Sponsor donations are real scope
- Mobile parity non-negotiable
- Asset quality bar highest in portfolio
- Design emotional bar: "elegant movie premiere"

---

## Standing Risks

- Build resources: Imagen + Veo + chatbot + sponsor flow = most expensive build to date
- Chatbot scope creep: Phase 1 is floor; don't ship Phase 3 for launch
- Sponsor scope creep: tier selection + manual approval works for launch; automated logo approval is V2
- Asset crowd-sourcing dependency: classmate engagement needed
- 100th anniversary integration: school may have own plans; coordinate
- Celebrity name-drop temptation: hold the line
- Elegance vs. FAMtastic-bold tension: the two-tier system was built for "bold attention-grabbing" — this site needs FAMtastic energy with elegance restraint. Custom tier or "Tier B-elegant" treatment.

---

## Next Concrete Action

Save doc to `~/famtastic/sites/site-mbsh-reunion/research/planning-consolidated.md`.

Then decide first prep step:
1. **Hi-Tide Harry character lock** (asset-first) — unblocks chatbot, hero, branded animations
2. **Sponsor architecture session** — define tiers, flow, technical approach before build
3. **Brief assembly** through Studio with current assets

Recommend order: **Sponsor architecture → Hi-Tide Harry → Brief.** Sponsor decisions feed into the brief structurally; Harry feeds into the brief visually. Both upstream of build.
