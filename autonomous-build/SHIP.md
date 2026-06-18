# SHIP — taking MetaMint live

This is the exact, numbered path from the sandbox to a live, monetizable product.
It is written so you can follow it without prior context. Steps that need a real
account or key are flagged **[needs your account]** and were intentionally *not*
performed in the sandbox (no paid signups, no live credentials).

---

## A. Pre-flight (5 minutes, local)

1. From inside `autonomous-build/`, confirm it runs and passes:
   ```bash
   node server.js     # open http://localhost:4317, click around all 5 preview tabs
   node --test        # expect: 72 pass, 0 fail
   ```
2. Paste a real URL of your own into the tool and eyeball every platform tab.
3. Decide the public name/domain. Recommended: **metamint.app** (short, brandable,
   `.app` forces HTTPS). Check availability before committing to the brand.

## B. Hosting the app

MetaMint is a tiny Node stdlib HTTP server with static assets. Two good paths:

### Option 1 — Static-first (cheapest, recommended for v1) **[needs your account]**
The core tool can run **fully client-side** — the only server piece is
`/api/generate`, which just calls the engine in `src/`. For launch you can:

4. Bundle the engine for the browser: the modules in `src/` are dependency-free
   ESM. Add a thin `public/engine.js` that `import`s from `../src/index.js` (or
   copy `src/` under `public/`) and have `app.js` call `generateAll()` directly
   instead of `fetch('/api/generate')`. Now there's **no backend at all** for the
   free tier.
5. Deploy the `public/` folder to any static host:
   - **Netlify / Cloudflare Pages / GitHub Pages** — drag-and-drop or connect the
     repo. Free tier is plenty. (Cloudflare Pages recommended for the free
     bandwidth + instant HTTPS.)
6. Point your domain at it (see section C).

### Option 2 — Keep the Node server (needed once you add accounts/API)
7. Deploy `server.js` as-is to a Node host: **Render, Railway, Fly.io, or a $5
   VPS**. Start command: `node server.js`. Set `PORT` from the platform's env.
   - There is **nothing to `npm install`** — zero dependencies. The build step is
     effectively "clone and run."
8. Put it behind the platform's HTTPS (all of the above terminate TLS for you).

> Recommendation: launch with **Option 1** (static, free, fast). Move to Option 2
> when you build the paid account features, which need a backend + database.

## C. Domain + DNS **[needs your account]**

9. Buy the domain at any registrar (Namecheap, Porkbun, Cloudflare Registrar —
   Cloudflare sells at cost). Budget ~$12–20/yr for `.app`.
10. Add the domain to your host (Pages/Netlify/Render) and create the DNS records
    they show you (usually a `CNAME` to their target, or an `A`/`AAAA`).
11. Enable "Always use HTTPS" / force-redirect. `.app` is on the HSTS preload list,
    so HTTPS is mandatory anyway.
12. Re-dogfood: paste `https://yourdomain` into X, Slack, and iMessage and confirm
    the card renders. **Host a real `og:image`** (download the generated PNG from
    the tool, upload it to `/og.png`, and set that absolute URL) — a data-URI image
    won't unfurl on most platforms. This closes the validator's one standing warning.

## D. Payments (only when you turn on Pro/Agency) **[needs your account]**

The pricing page ships with `#checkout` placeholder buttons. To make them real:

13. Create a **Stripe** account; in the dashboard create three Products/Prices:
    Pro monthly ($9), Pro annual ($90), Agency monthly ($29), Agency annual ($290).
14. Easiest path (no backend code): use **Stripe Payment Links** — one hosted URL
    per price. Replace each `href="#checkout"` in `public/pricing.html` with its
    Payment Link. This works even on the static (Option 1) deploy.
15. For real entitlement (unlocking Pro features per user), you need accounts +
    a webhook. Add a small backend (extend `server.js`):
    - `POST /api/stripe/webhook` verifying the signing secret, flipping a user's
      plan in a datastore (SQLite/Postgres) on `checkout.session.completed` and
      `customer.subscription.deleted`.
    - Gate the Pro/Agency features (templates, presets, bulk CSV, API) behind that
      plan flag.
16. Keep keys in env vars (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`). **Never**
    commit them. Test with Stripe test mode + the Stripe CLI before going live.

## E. Analytics & feedback (optional, privacy-respecting)

17. Add a privacy-friendly, cookieless analytics snippet (Plausible/Umami/
    Cloudflare Web Analytics) so you can measure tool-opens → generate → download
    → Pro-page views without betraying the "private by design" promise.
18. Add a one-line feedback path (a mailto: or a Tally/Canny link) for the launch.

## F. Launch (use MARKETING.md)

19. Execute the **Week 1 prep** in `MARKETING.md` (deploy, before/after asset, SEO
    pages, draft posts).
20. Execute **Week 2 launch** (X thread + LinkedIn + Show HN Monday; Reddit Tuesday;
    dev.to Wednesday). Reply fast, fix live, let the preview sell.

---

## What was built (final summary)

A complete, runnable v1 of **MetaMint**, end to end, inside `./autonomous-build/`:

**Product engine (`src/`, pure + tested):**
- `escape.js` — escaping, whitespace, smart truncation, slugify, X-handle and
  absolute-URL normalization.
- `metatags.js` — input normalization + an ordered, correctly-typed tag list
  (SEO + Open Graph + Twitter), HTML renderer, and SERP-truncated forms.
- `validate.js` — severity-ranked validator (errors/warnings/info) + a 0–100 score.
- `preview.js` — one deterministic model driving all six platform previews.
- `ogimage.js` — a self-contained 1200×630 SVG share-image generator (text wrap,
  color derivation, data-URI encode).
- `index.js` — `generateAll(input)` one-call bundle for server + tests.

**App:** `server.js` (zero-dependency `node:http`: static serving + `POST
/api/generate`, `GET /api/og.svg`, `GET /api/health`, path-traversal guard) and a
full client in `public/` (live inputs, six platform-faithful preview cards,
validation score, copy-tags, SVG/PNG download).

**Tests:** 9 files, **72 tests, all passing** (`node --test`), covering the engine,
the config resolver, the URL-crawl parser/gating, and a real server integration test.

**Configurability:** `src/config.js` + `CONFIG.md` turn the three launch forks
(deployment `mode`, `plan` feature flags, `urlCrawl`) into knobs via
`metamint.config.json` or env vars — no code changes to switch them.

**Productization:** `public/landing.html` (marketing site, itself a dogfood of
correct tags), `public/pricing.html` (3-tier + FAQ), and `PRODUCT.md`
(name/positioning/pricing rationale).

**Go-to-market:** `MARKETING.md` — positioning, 3 channels, full launch plan, 5
ready-to-post pieces, 2-week calendar.

**Docs/process:** `README.md`, `CONCEPT.md`, `SANDBOX.md`, `PROGRESS.md` (per-phase
log), `TEST-RESULTS.md`, `LICENSE` (MIT), and this `SHIP.md`.

## Every decision logged (and why)

1. **Zero external dependencies** (Node stdlib `node:http` + `node:test`). → No
   network install, fully offline, no paid tooling. Lowest-risk path to a *real*,
   runnable v1.
2. **Isolated nested git repo** under `./autonomous-build/`, committing per phase.
   → Honors the sandbox isolation contract; nothing outside the folder is touched.
3. **Product = MetaMint** (meta-tag + share-image + multi-platform preview). → A
   universal, evergreen, easy-to-explain need with a 10-second "aha".
4. **URL crawling is built but off by default (configurable, not hardcoded).** →
   The parser is pure/tested and the endpoint is gated by `urlCrawl`; shipping it
   disabled avoids the fetch-proxy/abuse surface until you opt in.
5. **SVG share image, no server-side PNG rasterizer.** → Keeps the zero-dep rule;
   the browser canvas handles PNG export client-side.
6. **Missing `og:image` is a *warning*, not an error**, with copy that tells you to
   host the generated image. → Honest about the one real deploy step instead of
   falsely claiming the in-app data-URI image is production-ready.
7. **Freemium with a genuinely useful free tier; value-meter on branding + bulk.**
   → The free tool is the marketing; the watermark is both distribution and the
   free→Pro lever.
8. **Pricing page checkout = placeholder `#checkout`.** → No live payment creds in
   the sandbox; real Stripe wiring specified above as a ready-to-run checklist.
9. **Launch static-first (Option 1), add a backend only with paid accounts.** →
   Cheapest, fastest path to live; defer backend complexity until it earns its keep.

## Known gaps (honest, carried into roadmap)

- **The three launch forks are now configurable** (see `CONFIG.md`): deployment
  `mode` (server/static), `plan` (free/pro/agency) feature flags, and the
  `urlCrawl` toggle — set via `metamint.config.json` or env vars.
- **Watermark gating is wired and tested** end-to-end (`plan: pro` removes it).
  **URL crawl is wired and tested** (parser is pure; endpoint gated by config).
- **Remaining Pro/Agency features are scoped, not built:** branded templates,
  saved brand presets, custom background upload, bulk CSV, JSON-LD export, API
  access, white-label, multi-seat. The flags exist and are exposed in
  `/api/config`; the feature code behind them is roadmap.
- **No accounts / auth / database / billing wiring.** Entitlement is unimplemented.
- **No live URL crawling** ("paste a URL, read its existing tags").
- **PNG export is browser-side only** (no server rasterizer); headless/automated
  PNG would need a future dependency or a rendering service.
- **OG image text wrap is character-approximate**, not glyph-measured, so very wide
  or very narrow titles can wrap slightly loose. Good enough for v1; a measured
  renderer is a roadmap item.
- **Preview cards approximate each platform's chrome**; platforms tweak their
  unfurl rendering over time, so periodic visual re-tuning will be needed.
- **No automated browser/E2E test** of the client UI (the engine + HTTP API are
  covered; the DOM rendering is verified manually).
