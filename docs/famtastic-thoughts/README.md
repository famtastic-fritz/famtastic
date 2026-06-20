# FAMtastic Thoughts

A lightweight, fast publishing surface for ideas, notes, lessons, and commentary that feed the FAMtastic ecosystem.

## Purpose

- Capture thoughts before they disappear.
- Turn lessons from client work, hosting ops, and design sprints into public content.
- Cross-link to FAMtastic Hosting and FAMtastic Designs where relevant.
- Become an organic traffic and authority engine for the brand.

## Stack (proposed)

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Astro (server output) | Fast, content-first, easy static + dynamic hybrid |
| Content storage | SQLite or flat Markdown | Simple to version; can migrate to MySQL later |
| Auth / admin | Lightweight cookie session + basic admin | Only trusted users publish |
| Capture | Email, web form, mobile bookmarklet, voice-to-text | Lowest friction |
| Search | Pagefind or in-page search | No external service needed |
| Host | GoDaddy (shared) or Vercel | Match ecosystem hosting |

## Content Model

See [`docs/content-model/THOUGHTS-CONTENT-MODEL.md`](./docs/content-model/THOUGHTS-CONTENT-MODEL.md).
