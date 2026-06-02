# Deploy — Jamari '26 Graduation Site

The finished, ready-to-ship site lives in **`dist/`**. It's a static site (no build step),
so deploying is fast. Pick whichever path is easiest.

## Option A — Netlify drag & drop (fastest, ~30 seconds)
1. Go to **https://app.netlify.com/drop**
2. Drag the **`dist`** folder onto the page.
3. Netlify gives you a live link instantly (e.g. `https://jamari-2026.netlify.app`).
4. (Optional) In *Site settings → Change site name*, rename it to something clean like `jamari-2026`.

## Option B — Connect this repo to Netlify (auto-deploys on every push)
1. Netlify → **Add new site → Import an existing project → GitHub**.
2. Pick the `famtastic-fritz/famtastic` repo, branch `claude/jamari-graduation-portfolio-8yEPP`.
3. Set **Base directory** to `sites/site-jamari-graduation` (the `netlify.toml` there sets publish = `dist`).
4. Deploy. Every push to the branch redeploys automatically.

## Option C — Netlify CLI (if you have a token)
```bash
cd sites/site-jamari-graduation
npx netlify-cli deploy --dir=dist --prod
```

---

## What's in the site
- `dist/index.html` — celebration hero with an **animated 3D graduation cap + confetti** (Three.js), stats, the moment, dev-future teaser with a typed terminal.
- `dist/journey.html` — "Future Developer" chapter with a **3D particle-network sphere**, roadmap timeline, tech stack, and a typed `jamari.js`.
- `dist/gallery.html` — masonry photo gallery of graduation day with a full-screen lightbox.
- `dist/assets/photos/` — optimized graduation photos.
- `dist/campaign/CAMPAIGN.md` — the **full social-media campaign + blast** (Instagram, Facebook, X, LinkedIn, TikTok, group-text, email, 7-day schedule). Replace `{{SITE_URL}}` with your live Netlify link before posting.

## After deploy
Open `dist/campaign/CAMPAIGN.md`, find/replace **`{{SITE_URL}}`** with your live link, and start posting. 🎓
