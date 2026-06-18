# MetaMint

**Mint perfect social previews in 30 seconds.**

MetaMint generates correct Open Graph + Twitter Card meta tags **and** a matching
1200×630 share image, with faithful live previews of how your link will look on
Google, X/Twitter, Facebook, LinkedIn, Slack, and iMessage.

- ⚡ Zero external dependencies — built entirely on the Node.js standard library.
- 🔒 Private by design — generation logic runs in your browser; inputs aren't stored.
- 🖼️ Built-in share-image generator (SVG → PNG), no design tool required.
- ✅ Validator that catches the costly mistakes (missing image, oversized title,
  relative `og:url`, wrong card type).

---

## Run it (one command)

Requires **Node.js ≥ 20**. No install step — there are no dependencies.

```bash
node server.js
```

Then open **http://localhost:4317**.

To use a different port:

```bash
PORT=8080 node server.js
```

## Configure (no code changes)

Three things that used to be launch decisions are now knobs — see **`CONFIG.md`**.
Precedence: env vars → `metamint.config.json` → defaults.

```bash
# in-browser engine (no backend), Pro plan (no watermark), URL-import enabled
METAMINT_MODE=static METAMINT_PLAN=pro METAMINT_URL_CRAWL=true node server.js
# or: cp metamint.config.example.json metamint.config.json  &&  edit it
```

- **`mode`** — `server` (calls `/api/generate`) or `static` (engine runs in the browser, no backend).
- **`plan`** — `free` | `pro` | `agency`; drives feature flags incl. the image watermark.
- **`urlCrawl`** — enable "import existing tags from a live URL".

## Test

```bash
node --test
```

The suite (in `tests/`) covers the tag builder, the validator, the escaping/slug
helpers, the preview model, and the SVG image generator.

---

## How it works

```
src/
  escape.js     string + URL helpers (escaping, slugify, handle/URL normalize)
  metatags.js   builds the ordered tag list + the HTML <head> snippet
  validate.js   flags common mistakes with severity + an overall score
  preview.js    deterministic per-platform preview model
  ogimage.js    1200x630 Open Graph image as a self-contained SVG
  index.js      one-call generateAll(input) → tags + html + issues + preview + image
server.js       Node stdlib HTTP server: static client + JSON API
public/         the app (index.html, app.js, styles.css), landing + pricing pages
```

### API

`POST /api/generate` — body is a JSON input object; returns:

```jsonc
{
  "input":        { /* normalized input */ },
  "tags":         [ /* ordered tag descriptors */ ],
  "html":         "<title>…</title>\n<meta …>",
  "issues":       [ { "severity": "error", "field": "imageUrl", "message": "…" } ],
  "summary":      { "counts": {…}, "score": 84, "ok": true },
  "preview":      { "google": {…}, "twitter": {…}, "facebook": {…}, "slack": {…}, "imessage": {…} },
  "ogImageSvg":   "<svg …>…</svg>",
  "ogImageDataUri": "data:image/svg+xml;base64,…"
}
```

Input fields: `title`, `description`, `url`, `siteName`, `author` (X handle),
`themeColor` (hex), `imageUrl`, `type` (`website`|`article`),
`twitterCard` (`summary_large_image`|`summary`), `locale`.

`GET /api/og.svg?title=…&siteName=…&themeColor=…&url=…` — the raw share-image SVG.
`GET /api/config` — the resolved public config the client adapts to.
`GET /api/crawl?url=…` — parse an existing page's tags (gated by `urlCrawl`).
`GET /engine/*.js` — the engine modules, served for `mode: static`.
`GET /api/health` — liveness probe.

---

## License

MIT. See `LICENSE`.
