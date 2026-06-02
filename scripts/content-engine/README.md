# content-engine — autonomous content / affiliate site engine

A self-contained, hands-off SEO content site generator. Point it at a niche and
a list of long-tail keywords, run `node run.js` on a cron, and it produces a
lean static affiliate site: one quality-gated article per keyword, assembled
into fast, mobile-first HTML with sitemap, robots.txt, FTC disclosure, and an
owner-profile footer — ready to deploy.

Zero third-party dependencies (Node.js built-ins only).

> **Honesty up front.** This is real, runnable software, not a money button.
> A brand-new content site takes **months** to rank in Google, and early income
> is realistically **~$0**. The engine removes the *production* grind; it does
> not remove the *time-to-rank* reality or the need for human editing before
> publish. See "Honest expectations" below.

---

## What it is

```
scripts/content-engine/
├── config.json          engine config (niche, keywords, monetization, gate, deploy)
├── lib.js               shared helpers (config/owner load, slugify, frontmatter, md file IO)
├── generate-article.js  generate ONE article from a keyword + run the quality gate
├── assemble-site.js     turn articles/*.md into a static site in dist/
├── run.js               orchestrator: generate all keywords, then assemble; write run summary
├── publish.sh           honest deploy stub: prints the exact deploy command + crontab line
├── articles/            generated markdown articles (frontmatter + body)
├── dist/                assembled static site (index, per-article pages, sitemap, robots)
└── results/             per-run summary JSON (results/<date>.json)
```

## How to run

```bash
# Full run: generate every keyword that doesn't exist yet, then assemble dist/
node scripts/content-engine/run.js

# Force regeneration of all keywords (overwrites existing articles)
node scripts/content-engine/run.js --force

# Generate a single article ad hoc
node scripts/content-engine/generate-article.js "best budget standing desk under 200"

# Re-assemble dist/ from whatever is already in articles/ (no generation)
node scripts/content-engine/assemble-site.js

# Build + print the deploy command for your configured target
./scripts/content-engine/publish.sh
```

## Two generation paths (and why it runs offline here)

1. **Production path — BrainInterface.** When `site-studio/lib/brain-interface.js`
   and the network are available (i.e. on Fritz's Mac inside the FAMtastic
   ecosystem), the engine routes article generation through the sanctioned
   `BrainInterface.execute()` LLM call. This activates automatically — no code
   change, no flag.

2. **Offline fallback — deterministic template.** This cloud container is
   **firewalled (no outbound network)**, so BrainInterface/LLM calls cannot
   run here. When that path is unavailable the engine degrades gracefully to a
   deterministic local template generator that produces a real, coherent,
   gate-passing buyer's-guide article from the keyword. This is honest editable
   *scaffolding* — generic by design, asserting no fabricated prices, brands, or
   test results — not a substitute for human-edited expert content before
   publish. The run summary records which path was used
   (`generation_source`, `network_llm_used`, `offline_fallback_used`).

Never crashes on no-network. Detect-and-degrade is built in at every call site.

## The quality gate

Every article must pass `quality_gate` (config.json) before it is written to
`articles/`. Rejected articles are logged with reasons and skipped — they never
reach the site. Current checks:

- **Minimum word count** (`min_words`, default 700).
- **Minimum H2 sections** (`min_h2_sections`, default 3).
- **Affiliate disclosure present** (`require_disclosure`).
- **FAQ section present** (`require_faq`).
- **No banned filler phrases** and **filler ratio under threshold**
  (`banned_phrases`, `max_filler_ratio`).

## Google "scaled content abuse" compliance stance

Google's spam policy targets *mass-produced, low-value pages made primarily to
manipulate rankings*. The way to stay on the right side of it is not a trick —
it is to actually be useful:

- **Quality over quantity.** The gate enforces a substance floor and rejects
  filler. The recommended cron cadence is modest (a few articles a week), not a
  firehose.
- **Real value per page.** Each article is a decision-useful buyer's guide with
  comparison structure, trade-offs, and an FAQ — not a spun keyword doorway.
- **Proper disclosure.** Every page carries a clear FTC affiliate disclosure at
  the top and in the footer; affiliate links are `rel="nofollow sponsored"`.
- **Human in the loop before publish.** Treat generated drafts as drafts. Edit
  them with real first-hand knowledge before they go live. The engine does the
  production scaffolding; your expertise is what makes a page genuinely rank-worthy.

## Affiliate links

Affiliate link slots are marked in the body with the `<!-- AFFILIATE_LINK_SLOT -->`
token immediately before the link, and rendered to Amazon search URLs tagged
with `monetization.amazon_associates_tag` from config. All outbound affiliate
links render with `rel="nofollow sponsored noopener" target="_blank"`.

---

## WHAT THIS NEEDS FROM FRITZ — EXACTLY ONCE

The engine is autonomous *after* these three one-time setup items. They cannot
be automated away because they are legal/account/identity decisions only you
can make:

1. **A monetization account (you must create this — it is legally yours).**
   - **Amazon Associates:** sign up at https://affiliate-program.amazon.com,
     get approved, and paste your real tracking tag (looks like `yourtag-20`)
     into `config.json → monetization.amazon_associates_tag`. The engine
     **cannot** create this account or use a placeholder tag in production — an
     untagged or fake-tagged link earns nothing and can violate Amazon's terms.
   - **(Optional) an ad network** once you have traffic: set
     `monetization.ad_network`. Most have traffic minimums (Mediavine ~50k
     sessions/mo, Raptive ~100k pageviews/mo); AdSense has none but pays little.

2. **A domain + deploy target.**
   - Pick/buy a domain and set `config.json → base_url` (used for canonical
     URLs, sitemap, robots).
   - Choose `deploy.target` (`netlify` or `github-pages`) and fill in the
     matching field (`netlify_site_name` or `github_pages_repo`).
   - Store the deploy token in the FAMtastic vault. `publish.sh` reads the
     target from config and prints the exact command; the real deploy runs on
     your Mac with that token.

3. **Approve the niche.**
   - `niche` and `target_keywords` in config.json are **placeholders**. Replace
     them with the validated niche + low-competition long-tail keyword set from
     the keyword-research deliverable, and confirm you actually want to build a
     site in that niche. Long-tail, buyer-intent keywords are the whole game for
     a new site.

After those three, going live is:

```bash
# on Fritz's Mac, inside ~/famtastic
node scripts/content-engine/run.js           # generate + assemble (uses real LLM here)
./scripts/content-engine/publish.sh          # prints the exact deploy command
./scripts/content-engine/publish.sh --deploy # actually deploys (CLI + vault token required)
```

Then add the printed crontab line for scheduled, hands-off publishing.

## Honest expectations (earnings & timeline)

- **Time to rank:** new domains typically see little organic traffic for the
  first **3–6+ months**; competitive niches longer. This is Google reality, not
  a flaw in the engine.
- **Early income:** realistically **~$0** for months. Affiliate income follows
  traffic, and traffic follows ranking, which follows time + quality + links.
- **What moves the needle:** a focused niche, genuinely useful articles (edit
  the drafts!), real backlinks, and patience. The engine compresses the
  production work; it does not compress time-to-rank.
- **No guarantees.** This is a legitimate, compliant content workflow — not a
  passive-income guarantee. Anyone promising otherwise is selling something.

## Provenance / related

Mirrors the structure of `scripts/finance-agents/` (self-contained workstream
with a run entrypoint, `results/` dir, and an honest README). Production LLM
calls go through `site-studio/lib/brain-interface.js`; owner identity/footer
come from `platform/config/owner-profile.json`.
