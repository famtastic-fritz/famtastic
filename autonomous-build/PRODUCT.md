# PRODUCT — Name, positioning, and pricing

## Name + tagline

- **Name:** MetaMint
- **Tagline:** *Mint perfect social previews in 30 seconds.*
- **One-liner:** Correct Open Graph + Twitter meta tags and a matching share
  image, with faithful live previews — no login, private by design.

**Why "MetaMint":** "Meta" names the category (meta tags) without being generic;
"Mint" implies *fresh, clean, and produced-on-demand* (mint a coin, mint a
preview) and gives a memorable, ownable, brandable two-syllable name with an
obvious mint-green/violet visual identity and an easy `.app` domain story.

## Positioning statement

> For indie developers and technical marketers who ship pages and care how their
> links look when shared, **MetaMint** is a meta-tag-and-share-image generator
> that shows you the result on every platform before you ship — unlike ad-laden
> online generators or a manual Figma-plus-checklist workflow, MetaMint is
> instant, private, and produces both the tags and the image in one screen.

## Pricing model

Freemium with a genuinely useful free tier (the free tier *is* the marketing).
Three tiers, value-metered by **branding + bulk**, not by gating the basics.

| Plan | Price | Who | The wedge |
|------|-------|-----|-----------|
| **Free** | $0 forever | Anyone shipping a page | Full tags, all previews, a real (watermarked) share image |
| **Pro** | $9/mo ($90/yr) | Founders & makers who ship often | No watermark, 8 branded templates, saved brand presets, JSON-LD |
| **Agency** | $29/mo ($290/yr) | Freelancers & teams doing client work | Bulk CSV, unlimited presets, white-label, API, 3 seats |

### Pricing rationale

- **Free has to be good.** The "aha" is the live multi-platform preview; gating
  it would kill the top of funnel. So the free tier ships correct, complete tags
  and a working image — the paid line is drawn at *branding and volume*, the
  things that only matter once you're using it seriously.
- **$9 is an easy individual yes.** It sits in indie-tool "no-approval-needed"
  territory and is anchored against the time cost of one manual OG image.
- **$29 Agency is volume-priced.** Bulk CSV + white-label + API are exactly what
  someone billing clients will expense without blinking; the per-page cost
  approaches zero, which is the value story for that buyer.
- **Watermark as the free→Pro lever.** A small "made with MetaMint" mark on free
  images doubles as distribution (every shared image is an ad) and as the single
  most common reason to upgrade. It's the classic Calendly/Loom playbook.
- **Annual = 10× monthly.** Two months free is a standard, legible discount that
  improves cash flow and retention without a confusing pricing table.

### Monetization mechanics (v1 status)

- Pricing **page is real** (`public/pricing.html`); checkout buttons point at a
  `#checkout` anchor as a placeholder. Real Stripe wiring is specified as a
  ready-to-run checklist in `SHIP.md` (no live keys in the sandbox).
- The watermark, branded templates, presets, bulk CSV, and API are **named as the
  paid surface** and scoped as roadmap — they are honestly *not yet built* in v1
  (the engine emits the free-tier watermark line today). See Known Gaps in SHIP.md.

## Brand voice

Confident, plain-spoken, slightly wry. Talks to a builder who's been burned by a
broken preview before. Never corporate, never hypey — the product does the
proving. (Consistent with the FAMtastic "results are the proof" ethos.)

## Visual identity

- Core: deep near-black canvas, violet→magenta accent gradient, one cyan pop.
- The generated OG image uses the user's theme color → a lighter derived stop,
  with soft light/shadow circles — confidently different from a flat template.
