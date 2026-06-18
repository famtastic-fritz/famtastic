# PROGRESS

A running, append-only log of each phase. One entry per phase, committed as we go.

## Phase 0 — Sandbox setup (2026-06-18)
- Created isolated `./autonomous-build/` directory with its own git repo.
- Decision: **zero external dependencies** — build on Node.js stdlib (`node:http`,
  `node:test`). Rationale: no network install, fully offline, no paid tooling.
  Lowest-risk path to a real, runnable v1.
- Wrote SANDBOX.md (isolation contract) and this PROGRESS.md.

## Phase 1 — Concept (2026-06-18)
- Picked **MetaMint**: a meta-tag + social-share-preview generator with a
  built-in 1200×630 Open Graph image generator and multi-platform live previews.
- Decision: input-driven (no live URL crawling in v1) — lowest-risk, no fetch
  proxy needed, fully client-side core. Crawling deferred to roadmap.
- Decision: SVG-based share image (no server-side PNG rasterizer) to honor the
  zero-dependency rule; browser canvas handles PNG export.
- Wrote CONCEPT.md: problem, target user, marketability, v1 scope, out-of-scope,
  success criteria.

## Phase 2 — Build (2026-06-18)
- Implemented the engine as pure, importable modules: `src/escape.js`,
  `src/metatags.js`, `src/validate.js`, `src/preview.js`, `src/ogimage.js`,
  `src/index.js` (one-call `generateAll`).
- Built a zero-dependency `node:http` server (`server.js`) serving the static
  client plus `POST /api/generate`, `GET /api/og.svg`, `GET /api/health`.
- Built the front-end app (`public/index.html`, `app.js`, `styles.css`): live
  inputs, 5 platform-faithful preview cards, validation score, copy-tags, and
  SVG/PNG share-image download (PNG via browser canvas).
- Wrote README (one-command start) + LICENSE (MIT).
- Smoke test: health/generate/og.svg/index all 200; generate returns 15 tags,
  scored output, SVG image. Verified live with curl.
- Decision: og:image as data-URI works in-app, but validator now WARNS to host
  an absolute image URL for real unfurling — honest about the deploy step.

## Phase 3 — Test (2026-06-18)
- Wrote 6 test files (`tests/*.test.js`) using built-in `node:test` — no deps.
- Coverage: escaping/slug/handle/url helpers, tag builder + HTML rendering +
  escaping, validator severity/score/sort, per-platform preview model, SVG
  image generator (escaping, wrap, lighten, data-uri round-trip), and a full
  server integration test (health, generate, bad-JSON 400, og.svg, static,
  404, path-traversal block).
- Result: **48 tests, 48 pass, 0 fail.** Logged to TEST-RESULTS.md.

## Phase 4 — Productize (2026-06-18)
- Locked name + tagline: **MetaMint** — "Mint perfect social previews in 30 seconds."
- Wrote PRODUCT.md: positioning statement, freemium pricing model (Free $0 /
  Pro $9 / Agency $29), pricing rationale, watermark-as-lever, brand voice.
- Built `public/landing.html`: hero, problem, features, 3-step how-it-works,
  pull-quote, final CTA — with its own correct OG/Twitter tags as a dogfood demo.
- Built `public/pricing.html`: 3-tier comparison + FAQ.
- Verified all pages serve 200 locally.
- Honest note: Pro/Agency features (templates, presets, bulk, API) are scoped as
  roadmap, not built in v1 — recorded as Known Gaps for SHIP.md.

## Phase 5 — Go-to-market (2026-06-18)
- Wrote MARKETING.md: positioning + wedge, 3 channels (dev communities / X+LinkedIn
  build-in-public / SEO+watermark footprint), a full pre-launch→launch→post-launch
  plan with 30-day metrics, 5 ready-to-post pieces (Show HN, X thread, LinkedIn,
  Reddit, dev.to tutorial), and a 2-week day-by-day action calendar.
- Decision: free-tier watermark doubles as the distribution channel (every shared
  image is a billboard) AND the primary free→Pro upgrade lever.

## Phase 6 — Package (2026-06-18)
- Wrote SHIP.md: numbered go-live checklist (pre-flight, static-vs-Node hosting,
  domain/DNS, Stripe payments via Payment Links + webhook entitlement, analytics,
  launch) with [needs your account] flags for every step requiring real creds.
- Included the final build summary, all 9 logged decisions with rationale, and an
  honest Known Gaps list (Pro features scoped-not-built, no auth/billing, no URL
  crawl, browser-side PNG only, approximate text wrap).
- Final verification: `node --test` → 48 pass, 0 fail.

## Phase 7 — Configurability (2026-06-18)
- Reframed the three "final questions" as configuration instead of asking.
- Added `src/config.js` (pure, browser-safe): `DEFAULT_CONFIG`, `PLAN_FEATURES`,
  `resolveConfig`, `resolveFeatures`, `publicConfig`. Precedence: env → file → defaults.
- Fork 1 (`mode`): `static` now runs the engine in-browser via `/engine/*` (no
  backend); `server` keeps `/api/generate`. Client picks at runtime from `/api/config`.
- Fork 2 (`plan` + `featureOverrides`): plan→feature map; the `watermark` flag is
  fully wired through `generateAll`/`ogimage` (pro/agency drop the watermark).
- Fork 3 (`urlCrawl`): real `src/crawl.js` (pure `parseMetaFromHtml` + gated
  `crawlUrl`) and `GET /api/crawl`; client mounts an "Import from URL" box only
  when enabled. 403 FEATURE_DISABLED when off.
- Added `metamint.config.example.json` + `CONFIG.md`; gitignored the real config.
- New tests: config (11), crawl (7), server-config (3), + server endpoints for
  config/crawl/engine. **72 tests, 72 pass** (and pass with crawl enabled too).
- Verified all knobs end-to-end via env + file (live crawl parsed a real page).
