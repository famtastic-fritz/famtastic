# NCS7 — Page-by-Page Crawl & Comparison

> The live site (`nationalcadstandard.org/ncs7/`) blocks automated fetchers (HTTP 403
> to any non-browser agent), and this sandbox's egress is allow-list only, so the
> live HTML could not be pulled directly. The real sitemap and per-page content
> below were reconstructed from the public search index and the NIBS/AIA/CSI source
> material, then used to drive a faithful recreation. Sources are listed at the end.

## Real site map (crawled)

| # | Real page | URL | Purpose |
|---|-----------|-----|---------|
| 1 | Home | `/ncs7/` | Landing — what the NCS is, entry to order/content |
| 2 | About | `/ncs7/about.php` | What the standard is, who maintains it (NIBS), founders AIA/CSI/NIBS |
| 3 | What's New | `/ncs7/new.php` | What changed in Version 7 |
| 4 | NCS Content | `/ncs7/content.php` | The components: Foreword, Administration, AIA CAD Layer Guidelines, UDS (8 modules), BIM Implementation, Plotting Guidelines, Appendixes |
| 5 | Order the NCS | `/ncs7/ordering.php` | Licensing: Single (1–2), Site (3–10), Enterprise (11+) |
| 5a | Single — List Price | `/resources/standards/ncs7/ncs71a/` | Single license, list price |
| 5b | Single — Academic/Gov | `/resources/standards/ncs7/ncs71b/` | Single license, academic/government |
| 5c | Single — Student | `/resources/standards/ncs7/ncs71c/` | Single license, student |
| 6 | FAQs | `/ncs7/faqs.php` | Licensing/content/access questions |
| 7 | News | `/ncs7/news.php` | Announcements |
| 8 | Press Releases | `/ncs7/pressreleases.php` | Press |
| 9 | Contact | header `CONTACT` link | Contact NIBS |
| 10 | Copyright | header `© COPYRIGHT` link | Legal / trademark |

**Header branding (both logos, top of every page):** the **NCS** "exploded star"
mark + wordmark *"United States National CAD Standard®"* (top-left), and the
**National Institute of Building Sciences** logo with *"Building American
Innovation"* (top-right). Both are recreated as SVG in the rebuild
(`frontend/assets/logo-ncs.svg`, `logo-nibs.svg`, and inline in `app.js` as
`BrandMark` / `NibsMark` so the single-file demo stays self-contained).

**Product model (real):** the NCS is sold as a **licensed online document** with
24/7 access (V7 is web-delivered, not a plain PDF download), plus downloadable
**Excel / DWG / LIN / PAT** data files. This is exactly the "they sell access to
simple PDFs/files" situation described.

## Real → Recreated mapping

| Real page | Recreated route | Fidelity | What the rebuild adds |
|-----------|-----------------|----------|------------------------|
| Home `/ncs7/` | `#/` (Home) | Same message ("one standard for construction documents"), real stats (8 UDS modules, AIA·CSI·NIBS, 24/7, V7) | **3D immersive hero** + scroll-reactive blueprint layer; clear order CTA above the fold |
| About `about.php` | `#/about` | Real: consensus standard, maintained by NIBS, founders AIA/CSI/NIBS, history 1999→V7 | Timeline + principles, both editable in the CMS |
| NCS Content `content.php` | `#/products` (NCS Content) | Real 6 components incl. the **8 UDS modules** enumerated (Drawing Set Org, Sheet Org, Schedules, Drafting Conventions, Terms & Abbreviations, Symbols, Notations, Code Conventions) | Each component is a product card with preview/buy; managed as CMS "products" |
| Order `ordering.php` (+ 5a/5b/5c) | `#/pricing` (Order) | Real tiers: Single (1–2), Site (3–10), Enterprise (11+) with the real usage/print rules | Clean comparable plan cards; prices marked illustrative (set at checkout) |
| FAQs `faqs.php` | folded into `#/resources` (Downloads & FAQ) | Real FAQ topics (what's in V7, how access is delivered) | Co-located with the downloadable data files |
| What's New `new.php` | folded into `#/about` timeline + Home | Version history | — |
| News / Press `news.php`, `pressreleases.php` | footer links | Present as nav/footer | Could be a CMS "News" collection (templated page) |
| Contact | `#/contact` | NIBS contact | Working demo form (stored server-side in production) |
| Copyright | footer legal line | Trademark notice retained | — |
| *(none — new capability)* | `#/viewer` | — | **3D CAD viewer**: a drawing exploded into Architectural/Structural/MEP layers, drag-to-orbit — the bonus "better way to present the CAD" |

## What's deliberately different (the sell)

1. **Visual** — the original is a flat table-era catalog; the rebuild leads with a
   3D immersive hero and a layer-exploded 3D drawing viewer.
2. **Owner-managed CMS** — every page above is editable; new pages are created from
   templates (proven in `05-backend-proof.md`). The 30-year-old site needs a dev
   for any change; this does not.
3. **AI tutor** — teaches the owner how to run the CMS in-product.
4. **Same content, higher perceived value** — the standard's components are
   preserved 1:1; the presentation makes them worth more and harder to pirate.

## Fidelity caveats (honest)

- Exact prices, the precise FAQ wording, and the literal logo image files were not
  scrapeable (403 + egress allow-list). Logos are faithful SVG **recreations** of
  the marks (correct motif/colors/wordmarks), not the original trademarked files;
  prices are shown as "$ —" placeholders. With the live HTML or the client's assets,
  these drop in 1:1 with no structural change.

## Sources
- https://nibs.org/projects/united-states-national-cad-standard-ncs/
- https://www.nationalcadstandard.org/ncs7/content.php
- https://www.nationalcadstandard.org/ncs7/ordering.php
- https://nationalcadstandard.org/ncs7/faqs.php
- https://www.nationalcadstandard.org/ncs7/about.php
- https://www.nationalcadstandard.org/resources/standards/ncs7/ncs71a/ (and ncs71b, ncs71c)
- https://www.csiresources.org/standards/ncs
