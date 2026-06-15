---
title: 03-tailored-play
type: note
permalink: famtastic/08-revenue/hands-off-research/03-tailored-play
---

# Hands-Off Income — Tailored Play (agent 3 of 3)
> Overnight swarm, 2026-06-05. Raw. Synthesized into FRITZ-HANDS-OFF-INCOME-PLAY.md.

## THE PICK: Creative Market HTML template catalog — built by Site Studio, packaged by Shay, with a $299 productized custom-site upsell on Gumroad

### Why this one (fits "build it and they come" + his assets)
- **Creative Market has REAL browse traffic** — buyers arrive with intent + money; discovery actually works (sellers report $100–$322/mo from marketplace discovery alone, no promotion). Accepts **HTML templates** (not just WordPress), lighter review than ThemeForest, 40% cut, non-exclusive.
- **Site Studio is already a template factory** — gap from "build a client site" to "sell a polished exportable template" is *packaging*, not product.
- **FAMtastic design DNA is the differentiator** — layered heroes, BEM vocab, SVG dividers, fam-motion, logo extraction = "looks like something a normal agency wouldn't ship," exactly what Creative Market buyers hunt for vs. ThemeForest's sea of identical corporate themes.
- **Zero support burden** — static "download & deploy" templates, "no support" policy, $29–$59 each.
- **Shay/Claude Code automate production + packaging.**

### Honest numbers
| | Pessimistic | Realistic | Breakout |
|---|---|---|---|
| First sale | 4–8 wks | 2–4 wks | day 1 if featured |
| First 6mo | $100–400/mo | $300–800/mo | $1–2k/mo |
| Month 12+ (10–20 templates) | $400–900/mo | $800–2,500/mo | $3–8k/mo |
| Ongoing hours | 2–4h/mo | 4–8h/mo | 8–12h/mo |

### Phased plan
- **Phase 1 (wks 1–2, Fritz ~4h):** Shay packages 5–8 cleanest existing sites (Groove Theory, JJ BA Transport, Luna's, Crumb & Crust…) into Creative-Market ZIPs (clean dist, README, 1590×1190 preview via Puppeteer, license). `scripts/marketplace/package-template.js <tag>`. Fritz: make 1 seller account, upload first 3–5, price $29–49.
- **Phase 2 (wks 3–6, Fritz ~2h):** `batch-produce.js` — niche brief → Site Studio → package → `marketplace/ready/`. `niches.json` = 50 pre-researched thin-supply verticals. Reuse the content-engine quality gate. Fritz: approve + upload 1–2/wk (the ONLY mandatory touchpoint).
- **Phase 3 (mo 3–6, optional, Fritz ~8h):** the north-star path — a landing page selling **"custom site from your brand brief — $299, 24h delivery."** Buyer fills a Typeform → Shay runs Site Studio → emails the ZIP → Gumroad/LemonSqueezy payment. Not SaaS (no churn/support). **20 orders/mo × $299 = ~$6k/mo**; + passive template sales = **$7–10k/mo within 12–18mo** = the realistic path to the "1,000 products @ $100/mo" north star.

### Minimum non-negotiable Fritz effort (even "passive" needs this)
1. Create accounts (Creative Market seller + Gumroad). ~1h. (Agents can't create monetization accounts for you.)
2. Upload first 5 templates. ~2h.
3. Answer first-30-day buyer questions (builds review signal). ~1h.
4. Approve 1–2 new templates/mo from the ready queue. ~30min/mo.
Everything else (production, packaging, QA, niche selection, screenshots) = Shay + Claude Code.

### Rejected options (with reasons)
- **ThemeForest:** right marketplace, wrong format (WordPress themes, not his HTML) + ongoing support SLA. Creative Market wins.
- **Niche affiliate content sites (his content engine):** already built — but 9–18mo to rank, Google HCU wiped 90% of AI-content sites, AI Overviews cut CTR 34–46%. Keep as a **parallel long-term compounding track, NOT the lead.**
- **GPT Store / plugins:** discovery broken (3M+ GPTs, no marketplace SEO), monetization not public. **Hard pass as a revenue channel** (note: agent 1 sees the Claude-plugin channel as a free *funnel/brand* play, not direct income — reconcile in synthesis).
- **Micro-SaaS subscription:** churn + support + funded competitors (Durable/Wix) = wrong for hands-off. The Phase-3 productized *service* captures the upside without the SaaS burden.

**One-liner:** Build each template once → Creative Market buyers find it → Shay scales the catalog → a $299 auto-delivered custom-site upsell is the path to real money.