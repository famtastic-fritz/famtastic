# CONFIG — every fork is a knob, not a question

The three decisions that used to be "questions for you" are now configurable in one
place. Precedence (highest wins): **environment variables → `metamint.config.json`
→ built-in defaults** (`src/config.js`).

## Quick start

```bash
# Use defaults (server mode, free plan, crawl off)
node server.js

# Or copy the example and edit one file:
cp metamint.config.example.json metamint.config.json
# edit it, then:
node server.js

# Or flip a knob for a single boot:
METAMINT_MODE=static METAMINT_PLAN=pro METAMINT_URL_CRAWL=true node server.js
```

## The three forks

### Fork 1 — Launch shape (`mode`)
| Value | Behavior |
|-------|----------|
| `server` (default) | Client calls `POST /api/generate`. Needed once you add accounts/billing. |
| `static` | Client imports the engine from `/engine/index.js` and runs **fully in-browser** — deploy `public/` + `src/` to any static host, **no backend**. |

Env: `METAMINT_MODE=static`

### Fork 2 — Paid features (`plan` + `featureOverrides`)
`plan` sets the baseline; `featureOverrides` flips individual flags so you can ship
one Pro feature without flipping the whole tier.

| Feature | free | pro | agency |
|---------|:----:|:---:|:------:|
| `watermark` (on share image) | ✅ | — | — |
| `brandedTemplates` | — | ✅ | ✅ |
| `brandPresets` | — | ✅ | ✅ |
| `bulkCsv` | — | — | ✅ |
| `api` | — | — | ✅ |

The `watermark` flag is **live and wired** today: `plan: 'pro'` removes
"made with MetaMint" from every generated image. The other flags are surfaced in
`/api/config` and ready for the UI/feature code to consume as those features land.

Env: `METAMINT_PLAN=pro` · `METAMINT_FEATURES=brandedTemplates,bulkCsv`

### Fork 3 — URL crawl (`urlCrawl`)
"Paste a live URL, read its existing tags." When enabled, `GET /api/crawl?url=…`
fetches the page server-side and returns parsed meta; the client shows an
"Import from a live URL" box. When disabled (default), the endpoint returns `403
FEATURE_DISABLED` and the box is hidden. The parser (`src/crawl.js`,
`parseMetaFromHtml`) is pure and tested independently of the network.

Env: `METAMINT_URL_CRAWL=true`

## How the client adapts

On load, the client fetches `/api/config` (`publicConfig`) and:
- picks in-browser vs. server generation based on `mode`,
- omits the watermark in the generated image when the `watermark` flag is off,
- mounts the URL-import box only when `urlCrawl` is true.

## Programmatic use

```js
import { resolveConfig, generateAll } from './src/index.js';
const cfg = resolveConfig({ plan: 'pro', urlCrawl: true });
const out = generateAll({ title: 'My page' }, cfg); // no watermark, returns out.features
```

See `src/config.js` for `DEFAULT_CONFIG`, `PLAN_FEATURES`, `resolveConfig`,
`resolveFeatures`, and `publicConfig`.
