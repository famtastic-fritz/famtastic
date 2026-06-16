# Faceless Video Generator — How This Makes Money

Straight answer first: **a tool can't conjure money overnight.** What it can do
is collapse the cost of producing a sellable unit (a finished short-form video)
from "hire an editor / spend an evening in CapCut" to "one command." That cost
collapse is the business. Below are three revenue paths, ordered by how fast
they can realistically turn into dollars given what FAMtastic already is.

## Path 1 — Upsell video to existing site clients (fastest cash)

FAMtastic already builds sites for real local businesses — the DNA log shows
Mario's Pizza, Tony's Barber Shop, Luna's Flower Shop, JJ BA Transport, The
Daily Grind, a bakery, an accounting firm. **Every one of them needs social
video and almost none of them make it.**

- **Offer:** "5 branded vertical videos/month for your Instagram & TikTok — $150–$400/mo."
- **Cost to deliver:** ~minutes of compute + an OpenAI key (cents per video).
- **Why it lands:** you already have their brand, colors, and copy in `spec.json`.
  Feed the business into `faceless` with their accent color, done.
- **Action by morning:** pick the 3 most-engaged existing clients, generate 3
  sample videos each with this tool, send them as a "here's what we made you —
  want this every week?" message. Samples sell this, not pitches.

```bash
node bin/faceless.mjs "why fresh-roasted beans matter" --accent "#6f4e37" --format vertical
node bin/faceless.mjs "3 fades every guy should know" --accent "#1e293b"
```

## Path 2 — Productized "faceless channel in a box" service

Sell the *output stream*, not the tool. Niche faceless channels (finance tips,
history facts, motivation, "did you know") monetize through:
- Channel ad revenue / creator funds (slow, needs volume)
- **Affiliate links in the description** (faster — one good video can pay)
- **Sponsorships** once a channel has traction

The generator's edge is **volume at near-zero marginal cost**: batch 30 topics →
30 specs → 30 renders overnight. Consistency (posting daily) is what the
algorithms reward, and consistency is exactly what automation gives you.

```bash
# batch a week of finance shorts
for t in "compound interest" "emergency funds" "index funds explained" \
         "credit score myths" "the 50/30/20 rule"; do
  node bin/faceless.mjs "$t" --format vertical
done
```

## Path 3 — Sell the generator as a micro-SaaS / Gumroad product

Wrap the pipeline behind the existing Studio UI or a tiny web form: topic in,
MP4 out. Charge per-video credits or a flat monthly. This is the highest ceiling
but the slowest to revenue (needs payments, hosting with a GPU-free render
worker, and marketing). Treat it as the 90-day play, not the overnight one.

## The honest constraints (so nobody's surprised)

1. **Rendering needs a real Chromium.** This works on your Mac and on any normal
   server. In *this* sandbox the network policy blocks Remotion's Chromium
   download, so I rendered against the Playwright Chromium already installed
   here (`/opt/pw-browsers/...`). On your machine, `npm install` pulls it
   automatically.
2. **Quality scales with keys.** No key = templated script + silent video (fine
   for a proof or a B-roll caption reel). `OPENAI_API_KEY` = genuinely good
   scripts + voiceover for cents per video. That spend is the difference between
   "demo" and "sellable."
3. **Distribution is the real job.** The tool removes the *production*
   bottleneck. Posting consistently, picking niches with buyer intent, and
   following up with the existing client list is where the money actually is —
   and that part is on you, not the renderer.

## Recommended overnight → morning sequence

1. Set `OPENAI_API_KEY` on your machine.
2. `cd remotion && npm install`.
3. Generate 3 videos for your 3 best existing clients (Path 1).
4. Send them tomorrow with a one-line offer. **That is the money move** — it
   converts an asset you already have (client relationships) using a cost you
   just drove to near zero.
