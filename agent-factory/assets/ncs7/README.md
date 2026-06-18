# National CAD Standard (NCS7) — Modern Demo Recreation

A sales-demo recreation of the 30-year-old [National CAD Standard NCS7 site](https://www.nationalcadstandard.org/ncs7/),
rebuilt to pitch a modern stack:

- **A React frontend** with a Three.js **3D immersive effect** (no build step).
- **A simple, customizable CMS** backend (Node, built-in modules only) with a
  **page-template** system so a non-technical client can spin up new pages.
- **An embedded AI tutor** that teaches the client how to use the CMS.
- **A bonus 3D CAD viewer** that explodes an architectural floor plan into
  stacked, orbitable layers — a preview of presenting their CAD PDFs in 3D.

Everything runs **offline**: no `npm install`, no Vite/webpack, no API keys.
React, Three.js, and pdf.js load from CDNs; JSX is compiled in the browser by
Babel standalone. The backend uses only Node's `http`, `fs`, `path`, and `url`.

---

## Directory map

```
ncs7/
├── README.md                ← you are here
├── frontend/                ← React SPA (the public website)
│   ├── index.html           ← entry; loads React/Three/Babel from CDN
│   ├── app.js               ← React app (JSX, hash router, all pages)
│   ├── three-hero.js        ← Three.js hero scene + scroll-reactive background
│   ├── styles.css           ← blueprint design system
│   └── content.json         ← static fallback content (also the CMS seed)
├── cms/                     ← the CMS backend + admin UI
│   ├── server.js            ← Node http server: static serving + REST API
│   ├── data/                ← JSON content store (auto-seeded on first run)
│   │   ├── content.json     ← site/home/about/pricing/resources/contact
│   │   ├── products.json    ← the CAD standard modules (PDF products)
│   │   ├── pages.json       ← CMS pages (instances of templates)
│   │   └── templates.json   ← reusable page templates
│   └── admin/               ← no-build admin dashboard (vanilla JS)
│       ├── index.html
│       ├── admin.js
│       └── admin.css
├── tutor/                   ← the embedded AI CMS tutor
│   ├── knowledge.json       ← curated how-to Q&A about THIS cms (the brain)
│   └── tutor.js             ← self-contained chat widget (offline-capable)
└── cad3d/                   ← bonus: 3D CAD-drawing presentation
    ├── index.html
    ├── cad3d.js             ← Three.js exploded floor-plan scene
    └── cad3d.css
```

---

## How to run it

You need **Node.js** (any recent v16+). No install step.

### Option A — run the whole thing through the CMS (recommended)

The CMS server serves the React frontend, the admin UI, the tutor, and the 3D
viewer all on one port, and powers the live `/api/content` feed.

```bash
cd ncs7/cms
node server.js
# (optional) choose a port:  PORT=4178 node server.js
```

It prints the URL on start. Then open:

| What                | URL                                   |
|---------------------|---------------------------------------|
| Public website      | http://localhost:4178/                |
| Admin / CMS         | http://localhost:4178/admin           |
| AI tutor            | inside the admin (AI Tutor section)   |
| 3D CAD viewer       | http://localhost:4178/cad3d/          |
| Content API         | http://localhost:4178/api/content     |

On first launch the server auto-seeds `cms/data/*.json` from
`frontend/content.json`, so the CMS and the website start in sync.

### Option B — frontend only, no backend

The SPA falls back to its bundled `content.json` if the API is unreachable, so
you can serve just the `frontend/` folder with any static server:

```bash
cd ncs7/frontend
python3 -m http.server 8080
# open http://localhost:8080/
```

A small badge in the bottom-left of the site shows which source is live
(`live CMS · /api/content` vs `static fallback · content.json`).

> Don't open `index.html` with `file://` — browsers block `fetch()` and ES
> features there. Always go through a server (Option A or B).

---

## The login (stub)

The admin login is intentionally a **demo stub**: enter **any non-empty
username and password** and you're in. A `demo-token` is stored in
`sessionStorage`. There is no real auth — wiring a real identity provider is a
production task, noted below.

---

## How the parts connect

```
        ┌──────────────────────────── cms/server.js (Node, port 4178) ────────────────────────────┐
        │                                                                                          │
Browser │  GET /                → serves frontend/index.html  ─────────► React SPA (app.js)        │
        │  GET /api/content     → merged content.json + products.json ──► SPA renders pages        │
        │  GET /cad3d/          → serves cad3d/ (3D viewer)                                         │
        │  GET /tutor/tutor.js  → serves the tutor widget                                           │
        │  GET /admin           → serves admin/ dashboard                                           │
        │  PUT/POST/DELETE /api/{site,products,pages,templates}  ◄─── admin edits the JSON store    │
        │  POST /api/pages/from-template  → instantiate a page from a template                      │
        │  POST /api/tutor      → offline keyword retrieval over tutor/knowledge.json               │
        │  POST /api/login      → stub auth                                                         │
        └──────────────────────────────────────────────────────────────────────────────────────────┘
```

1. A client edits content in **/admin**. The admin UI calls the REST API,
   which writes JSON files in `cms/data/`.
2. The public **React frontend** reads `/api/content` and re-renders — so admin
   edits show up on the live site.
3. The **AI tutor** in the admin answers "how do I…" questions by POSTing to
   `/api/tutor`, which scores the question against `tutor/knowledge.json` and
   returns the best how-to. If the page is opened without the server, the
   widget retrieves from `knowledge.json` directly.
4. The **3D CAD viewer** is linked from the hero, the product preview modal,
   the resources page, and the CTA strip.

---

## The 3D immersive effect

Two Three.js scenes (`frontend/three-hero.js`):

- **Hero scene** — floating wireframe blueprint planes drifting in depth, a
  particle field arranged on a building lattice, and a slowly rotating
  wireframe "tower" of stacked floor frames. It parallaxes to the mouse.
- **Background scene** — a fixed, full-page wireframe building grid that the
  camera flies over and through **as you scroll**, so the whole site feels like
  it sits inside a technical model.

Both cap pixel ratio, run a single animation loop, pause when off-screen, and
respect `prefers-reduced-motion`. If WebGL or Three.js is unavailable, the 3D
silently disables and the site still works.

---

## CMS page-template system (the selling point)

- **Templates** (`/api/templates`) are reusable page skeletons: a named list of
  content **blocks** (`heading`, `rich-text`, `image`, `cta`, `hero`,
  `feature-grid`, …), each with a default value.
- **Create a page from a template**: in the admin **Pages** section, pick a
  template, give the page a title and slug, and the server copies the template's
  blocks into a new editable page (`POST /api/pages/from-template`).
- **Edit existing pages**: each block becomes a labeled input the client can
  change. Toggle **Published** to control visibility.

This is what makes the CMS feel *simple and customizable* to a non-technical
owner: they never touch code, just fill in fields and publish.

---

## Wiring a real LLM (later)

`/api/tutor` is structured for a drop-in upgrade. Right now it does **offline
keyword retrieval** over `tutor/knowledge.json`. To use a real model:

1. Set an env var, e.g. `OPENROUTER_API_KEY=sk-...` before starting the server.
2. The handler has a clearly-commented branch where, when the key is present,
   you'd call OpenRouter's chat-completions endpoint — passing the matched
   knowledge entries as grounding context (RAG) and the user's question.
3. Keep `knowledge.json` as the retrieval corpus so answers stay grounded in
   *this* CMS rather than generic CMS advice.

No network calls are made in the demo.

---

## Wiring real PDF uploads (later)

The 3D viewer (`cad3d/`) currently renders a **procedurally generated** floor
plan because we have no real PDF. The real pipeline (documented in
`cad3d/cad3d.js` and in an info panel on the page):

1. Upload a CAD PDF; render each page with **pdf.js** (`getDocument` →
   `page.render`) onto a `<canvas>`.
2. Wrap each canvas as a `THREE.CanvasTexture` on a plane.
3. Stack the planes by sheet / floor level and orbit them.
4. For true **layer** separation, use pdf.js optional-content groups
   (`getOptionalContentConfig`) or `getOperatorList` to split disciplines
   (Architectural / Structural / MEP) onto offset planes — exactly the NCS
   "AIA CAD Layer Guidelines" concept made visible.

In production the CMS would gain an upload endpoint that stores the PDF, and the
product "View in 3D" action would pass its URL to the viewer.

---

## What's real vs. stubbed (honest list)

| Area                 | Status                                                        |
|----------------------|--------------------------------------------------------------|
| React SPA + routing  | Real, content-driven, responsive                             |
| 3D hero + background  | Real Three.js, performance-safe, reduced-motion aware       |
| CMS REST API + store | Real CRUD, real JSON persistence, real template instancing   |
| Admin UI             | Real editing of content / pages / templates / products       |
| AI tutor (offline)   | Real keyword retrieval over a curated knowledge base         |
| 3D CAD viewer        | Real Three.js; floor plan is generated (no real PDF yet)     |
| Login                | **Stub** — any non-empty credentials                         |
| Checkout / payment   | **Stub** — demo confirmation, no Stripe call                 |
| Contact form         | **Stub** — not stored or emailed                             |
| LLM tutor            | **Not wired** — offline retrieval; OpenRouter branch ready   |
| PDF upload           | **Not wired** — pipeline documented                          |

This is a presentation demo: the architecture is real and runnable; the
money/auth/AI integrations are intentionally stubbed and clearly marked.
