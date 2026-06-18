# CONCEPT — MetaMint

**Name:** MetaMint
**Tagline:** *Mint perfect social previews in 30 seconds.*

---

## The product in one sentence

MetaMint is a tiny web tool that turns a page's title, description, and brand
details into a complete, copy-paste block of SEO + social meta tags **and** a
matching 1200×630 Open Graph share image — with live previews of exactly how the
link will look on Google, X/Twitter, Facebook, LinkedIn, Slack, and iMessage.

## The problem

Every website, blog post, landing page, and product launch needs Open Graph and
Twitter Card meta tags so that when someone shares the link, it renders as a rich
card with a title, description, and image — instead of a naked, ignorable URL.

In practice, this is a recurring papercut:

- The tags are easy to get *subtly* wrong (missing `og:image`, wrong
  `twitter:card` type, absolute vs. relative image URLs, missing `og:url`).
- You can't *see* the result until you've already deployed and pasted the link
  somewhere — a slow, embarrassing trial-and-error loop.
- Generating the 1200×630 share image usually means opening a design tool,
  fiddling with a template, exporting, and re-uploading. For a one-off post,
  that's wildly disproportionate effort.
- Existing online generators are ad-choked, harvest your data, or paywall the
  image export.

The result: most small sites ship with broken or ugly link previews, which
quietly kills click-through on every share.

## Target user

**Primary:** indie developers, solo founders, and "technical marketers" who ship
landing pages and blog posts and care about how a link looks when shared — but
don't want to open Figma for a share image.

**Secondary:** agencies and freelancers producing many client pages who want a
fast, repeatable, no-login way to generate correct tags + an on-brand image.

These users are comfortable pasting a `<head>` snippet and value speed,
correctness, and privacy over a heavyweight design suite.

## Why it's marketable

- **Universal, evergreen need.** Every page on the web wants a good share preview.
  This is not a fad; OG/Twitter tags have been the standard for a decade.
- **Clear, narrow promise.** "Correct meta tags + a share image, in 30 seconds,
  no login." Easy to explain in one sentence — the hallmark of a tool people
  actually adopt and share.
- **Demonstrable value in the first 10 seconds.** The live multi-platform preview
  *is* the demo. The "aha" happens before any signup.
- **Privacy as a wedge.** It runs entirely client-side in the browser — nothing is
  uploaded, no tracking. That's a credible differentiator against the ad-laden
  incumbents and an honest marketing angle.
- **Natural upgrade path.** Free covers the core; Pro adds branded image
  templates, watermark removal, bulk/CSV generation, and saved brand presets —
  things power users and agencies will pay for.
- **Cheap to operate.** The core is static and client-side, so the free tier costs
  almost nothing to run, which makes a freemium model viable.

## Scope of v1 (what we are building now)

A working, runnable web app (Node stdlib server + static client) that:

1. Takes inputs: page title, description, canonical URL, site name, author/handle,
   theme color, and an Open Graph image URL (or uses the generated one).
2. **Generates a complete meta tag block**: primary SEO tags (`title`,
   `description`, canonical), Open Graph (`og:*`), and Twitter Card
   (`twitter:*`) — correctly typed and escaped.
3. **Generates a 1200×630 share image** as an SVG (with a PNG-ready download path),
   rendered from the same inputs (title, site name, theme color, accent shapes).
4. **Renders live previews** for Google search, X/Twitter, Facebook/LinkedIn,
   Slack, and iMessage from a single, deterministic preview model.
5. **Runs a validation pass** that flags common mistakes (missing image, title too
   long for Google's pixel budget, relative `og:url`, missing `twitter:card`) with
   severity levels.
6. Ships with a **one-command start** (`node server.js`) and a **test suite**
   (`node --test`) covering the tag builder, the validator, the slug/escape
   helpers, and the SVG generator.
7. Includes a **landing page** and a **pricing/packaging page** (static HTML).

The core logic (tag building, validation, escaping, SVG generation) lives in
pure, importable, fully tested modules — this is the real engine, not a stub.

## Explicitly OUT of scope for v1

- **No accounts, login, database, or server-side persistence.** Everything is
  stateless; brand presets (Pro) are described but stored client-side only.
- **No live URL crawling/scraping** ("paste a URL and we'll read its tags"). v1
  is input-driven; crawling is a future enhancement requiring a fetch proxy.
- **No real payment processing.** The pricing page is real copy + packaging; the
  Stripe wiring is documented in SHIP.md as a ready-to-run checklist, not live.
- **No raster PNG encoder dependency.** v1 generates a crisp SVG and provides a
  browser-side canvas download path for PNG; we do not bundle a server-side PNG
  rasterizer (would add a heavy dependency, violating the zero-dep rule).
- **No multi-language / i18n, no team collaboration, no analytics dashboard.**
- **No browser extension or CMS plugins** (named as future roadmap in MARKETING).

## Success criteria for v1

- `node server.js` serves a working app a person can use end-to-end in a browser.
- `node --test` passes with meaningful coverage of the core engine.
- Given valid inputs, the generated tag block is correct, escaped, and complete;
  the validator catches the documented mistake classes; the SVG renders.
- A non-technical reader can follow SHIP.md to take it live.
