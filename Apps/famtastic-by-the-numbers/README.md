# FAMtastic By the Numbers

Web-first numerology recognition system with a productionizing path toward one-time premium unlocks.

V1 decisions in this build:
- Pythagorean / modern Western numerology engine
- free core chart
- transparent math breakdown
- one-time premium activation target
- email-based restore path
- backend-ready PayPal + MySQL architecture
- closeout proof lane for MySQL-backed unlock persistence
- compatibility as an included teaser/depth surface
- editable/themeable premium copy and CTA surfaces via runtime config

## Files
- `index.html` — UI shell with free + premium surfaces
- `styles.css` — visual system / themeable shell
- `app.js` — calculations + rendering + premium state client flow
- `server.js` — Express static/app server + API endpoints
- `lib/config.js` — editable runtime product/theme config, including CTA derived from price unless overridden
- `lib/paypal.js` — PayPal Orders API helpers with mock fallback
- `lib/db.js` — MySQL pool + JSON dev-store persistence fallback
- `scripts/bootstrap-local-mysql.sh` — local MySQL bootstrap for closeout proof
- `scripts/migrate-db.js` — MySQL schema creation for checkout sessions, purchases, unlocks
- `scripts/verify-db.js` — verifies the required MySQL tables exist in the target database
- `scripts/verify-paypal-config.js` — config preflight that checks real PayPal credentials are loaded and the app will not resolve to mock mode
- `tests/smoke.mjs` — closeout smoke test for MySQL-backed unlock persistence and restore
- `tests/smoke-local-proof.mjs` — local proof-mode regression for the original mock lane
- `.env.example` — base environment variables
- `.env.closeout.example` — closeout-oriented $1 live verification template
- `OPERATOR-CLOSEOUT-CHECKLIST.md` — exact operator steps for the final proof pass
- `data/dev-store.json` — created automatically in local proof mode

## API surface
- `GET /api/health`
- `GET /api/config`
- `GET /api/purchase/status?email=...`
- `POST /api/purchase/restore`
- `POST /api/paypal/create-order`
- `POST /api/paypal/capture-order`

## Closeout setup
From this directory:

```bash
cp .env.closeout.example .env
npm install
npm run browsers:install
brew services start mysql
npm run db:bootstrap-local
set -a && source ./.env && set +a && npm run migrate
set -a && source ./.env && set +a && npm run verify-db
set -a && source ./.env && set +a && npm run verify-paypal-config  # will fail until real credentials are inserted
npm run dev
```

Then open:
- `http://127.0.0.1:4174`

## Database
The MySQL closeout lane expects these tables:
- `premium_checkout_sessions`
- `premium_purchases`
- `premium_unlocks`

Bootstrap, verify, and preflight them with:

```bash
npm run db:bootstrap-local
set -a && source ./.env && set +a && npm run migrate
set -a && source ./.env && set +a && npm run verify-db
set -a && source ./.env && set +a && npm run verify-paypal-config  # expected to fail until real credentials are present
```

If MySQL env is absent locally, the app falls back to `data/dev-store.json` so the full premium flow can still be browser-tested in the older proof lane.

## Test
Closeout proof:

```bash
set -a && source ./.env && set +a && npm run smoke
```

Original local proof regression:

```bash
set -a && source ./.env && set +a && npm run smoke:local
```

## Current truth
- Free chart flow is browser-tested.
- Premium unlock + restore flow is browser-tested in MySQL-backed closeout mode.
- Browser-side PayPal return handling is wired and now proven against a real MySQL persistence lane using mock capture mode.
- Product copy, CTA labels, support email, and pricing are editable via runtime config/env; CTA now derives from the configured price unless explicitly overridden.
- Local closeout proof is now configured for a live $1 offer with `persistenceMode=mysql` and `paymentMode=live`.
- Live $1 PayPal purchase proof is complete: Fritz completed the real purchase flow and confirmed return, reload persistence, and restore behavior.
- Mobile hero badge overlap bug was fixed by adding mobile-specific hero-card spacing and badge repositioning in `styles.css`.
