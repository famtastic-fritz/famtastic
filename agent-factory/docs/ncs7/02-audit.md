# NCS7 — Current-State Audit

> Audit of https://www.nationalcadstandard.org/ncs7/ (the National CAD Standard v7 sales site). The product today
> is *access to PDF chapters* of the standard, viewable or downloadable. Generated
> by the agent factory's `analyze` skill.

## What it is today
A small, aged catalog site. The value the customer pays for is the **content of the
standard** (chapters such as General Administration, Uniform Drawing System, AIA CAD
Layer Guidelines, Plotting Guidelines, BIM Implementation), delivered as **flat PDFs**.

## Gaps (and the upgrade that closes each)
| # | Gap (today) | Impact | Closed by |
|---|-------------|--------|-----------|
| 1 | Static PDFs are the *entire* experience | No differentiation, easy to pirate/share | **3D immersive presentation** of the standard as the headline product |
| 2 | Owner cannot edit the site | Every change is a dev ticket / stale content | **Simple custom CMS** with page editing + templates |
| 3 | No page-templating | New chapters/landing pages are bespoke | **Template → instantiate** workflow in CMS |
| 4 | Dated, non-responsive UI | Lost mobile + credibility | **React SPA**, responsive, modern AEC visual language |
| 5 | No onboarding for the owner | CMS adoption risk after handoff | **AI CMS tutor** that teaches the owner in-product |
| 6 | PDF = low perceived value | Hard to justify price / renewals | **3D CAD render** raises perceived value & defensibility |
| 7 | No analytics/funnel | Can't optimize pricing or content | CMS-tracked content + clear product pages |

## Conversion notes
- The buy path should be visible from the hero; today value is buried in PDF lists.
- Each standard chapter deserves a *product page* (preview, what's inside, price),
  not just a filename in a list.
- A free/preview tier of the 3D viewer is the demo hook that justifies paid access.

## Risk / constraints carried into the build
- Keep it **simple to operate** — the buyer explicitly values a CMS a non-technical
  person can run. Avoid over-engineering the admin.
- Content must remain the source of truth: frontend renders from CMS content, with a
  static fallback so the site never hard-fails.

## Recommended target architecture (informs the backend assumptions)
- **Frontend:** React SPA (CDN, no build step for the demo), Three.js immersive layer.
- **Backend/CMS:** content store (JSON now → swappable to DB), pages + templates +
  products CRUD, stub auth now → real auth later.
- **Tutor:** retrieval over a CMS knowledge base now → LLM-backed later.
- **CAD 3D:** pdf.js + Three.js, layered/exploded drawing view.

---
*LLM pass:* stub (71→100 tok)
