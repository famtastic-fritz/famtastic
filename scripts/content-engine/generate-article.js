'use strict';

/**
 * generate-article.js — generate ONE article from a single long-tail keyword.
 *
 * Output: a markdown file with frontmatter (title, slug, description, keyword,
 * date, source) plus a structured body: FTC disclosure -> intro -> H2 sections
 * -> comparison table -> FAQ -> conclusion, with marked affiliate link slots.
 *
 * Two generation paths:
 *   1. PRODUCTION (BrainInterface): the sanctioned LLM call. Used automatically
 *      when BrainInterface + network are available (i.e. on Fritz's Mac inside
 *      Studio). Activates with no code change.
 *   2. OFFLINE FALLBACK (deterministic template): used when BrainInterface is
 *      unavailable (e.g. this firewalled cloud container). Produces a real,
 *      coherent, gate-passing article from the keyword so the pipeline runs
 *      end-to-end with NO network. It is honest, generic, human-editable
 *      scaffolding — NOT a substitute for edited expert content before publish.
 *
 * Every article runs through a QUALITY GATE before it is accepted. Failures are
 * returned with reasons and logged by the caller; failed articles are NOT
 * written to the articles dir.
 *
 * Usage (standalone):
 *   node scripts/content-engine/generate-article.js "best budget standing desk under 200"
 */

const fs = require('fs');
const path = require('path');
const {
  loadConfig, loadOwnerProfile, slugify, wordCount,
  toMarkdownFile, tryLoadBrainInterface, amazonAffiliateLink, todayStamp,
} = require('./lib');

const AFFILIATE_SLOT = '<!-- AFFILIATE_LINK_SLOT -->';

/* ------------------------------------------------------------------ */
/* QUALITY GATE                                                        */
/* ------------------------------------------------------------------ */

/**
 * Run the quality gate against a markdown body.
 * Returns { pass: bool, words, h2Count, reasons: [] }.
 */
function qualityGate(body, cfg) {
  const g = cfg.quality_gate || {};
  const reasons = [];

  const words = wordCount(body);
  const h2Count = (body.match(/^##\s+/gm) || []).length;
  const hasDisclosure = /affiliate/i.test(body) && /disclos/i.test(body);
  const hasFaq = /faq|frequently asked/i.test(body);

  if (words < (g.min_words || 0)) {
    reasons.push(`word count ${words} < min ${g.min_words}`);
  }
  if (h2Count < (g.min_h2_sections || 0)) {
    reasons.push(`only ${h2Count} H2 sections < min ${g.min_h2_sections}`);
  }
  if (g.require_disclosure && !hasDisclosure) {
    reasons.push('missing affiliate disclosure');
  }
  if (g.require_faq && !hasFaq) {
    reasons.push('missing FAQ section');
  }

  // Filler / banned-phrase detection (Google "scaled content abuse" stance).
  const lower = body.toLowerCase();
  const bannedHits = (g.banned_phrases || []).filter((p) => lower.includes(p.toLowerCase()));
  if (bannedHits.length > 0) {
    reasons.push(`banned filler phrases present: ${bannedHits.join('; ')}`);
  }

  const sentences = body
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim().length > 0);
  const fillerMarkers = (g.banned_phrases || []).map((p) => p.toLowerCase());
  const fillerSentences = sentences.filter((s) =>
    fillerMarkers.some((f) => s.toLowerCase().includes(f))
  ).length;
  const fillerRatio = sentences.length ? fillerSentences / sentences.length : 0;
  if (fillerRatio > (g.max_filler_ratio ?? 1)) {
    reasons.push(`filler ratio ${(fillerRatio * 100).toFixed(1)}% > max ${(g.max_filler_ratio * 100).toFixed(1)}%`);
  }

  return { pass: reasons.length === 0, words, h2Count, hasDisclosure, hasFaq, reasons };
}

/* ------------------------------------------------------------------ */
/* DETERMINISTIC OFFLINE TEMPLATE                                      */
/* ------------------------------------------------------------------ */

function titleCase(s) {
  const small = new Set(['a', 'an', 'and', 'the', 'for', 'of', 'to', 'in', 'on', 'under', 'with']);
  return s.split(/\s+/).map((w, i) => {
    if (i !== 0 && small.has(w.toLowerCase())) return w.toLowerCase();
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');
}

/**
 * Build a deterministic, coherent article from the keyword.
 * Intentionally generic (no fabricated specs/prices/brands) and clearly framed
 * as an editable buyer's-guide scaffold so it never asserts fake facts.
 */
function buildTemplateArticle(keyword, cfg, owner) {
  const niche = cfg.niche || 'this category';
  const title = titleCase(keyword);
  const affTag = cfg.monetization.amazon_associates_tag;
  const link = amazonAffiliateLink(keyword, affTag);

  const intro =
`If you have been searching for ${keyword}, you already know the hard part is not finding options — it is finding the *right* one without overpaying. This guide cuts through the noise. We focus on what actually matters for ${niche}: real-world durability, value for the money, and whether a product solves the problem you are actually trying to solve.\n\n` +
`Everything below is written to help you decide quickly and confidently. We flag where it makes sense to spend a little more, and where the cheaper option is genuinely good enough.`;

  const whatMatters =
`Before comparing specific picks, it helps to know which factors separate a smart buy from a regret. For ${keyword}, these are the ones we weight most heavily:\n\n` +
`- **Build quality and longevity.** A low price is no bargain if you replace the item in six months. Look for solid materials and honest warranties.\n` +
`- **Fit for your actual space and needs.** The "best" product on paper can be wrong for you. Measure your space and be realistic about how you will use it.\n` +
`- **Total cost, not sticker price.** Shipping, accessories, and add-ons can quietly change which option is truly cheapest.\n` +
`- **Real owner feedback.** Patterns in long-term reviews tell you more than any single spec sheet.`;

  const howToChoose =
`Here is a simple way to narrow the field for ${keyword} without overthinking it:\n\n` +
`1. **Set a firm budget and a hard ceiling.** Decide the most you will spend before you start looking, so you compare like with like.\n` +
`2. **List your two non-negotiables.** Maybe it is a footprint that fits your room, or a specific feature. Filter everything against those first.\n` +
`3. **Shortlist three options across the price range.** A budget pick, a mid pick, and a stretch pick keeps the decision honest.\n` +
`4. **Read the one-star and three-star reviews.** They reveal the failure modes the marketing copy hides.\n\n` +
`When you are ready to compare current prices and availability, you can ${AFFILIATE_SLOT}[check up-to-date options here](${link}). Prices on ${niche} gear change often, so verifying before you buy is worth the thirty seconds.`;

  const comparison =
`The table below frames the typical trade-offs you will see across the price range. Use it as a decision scaffold, then verify the specifics of any individual product before buying.\n\n` +
`| Tier | What you typically get | Best for |\n` +
`|---|---|---|\n` +
`| Budget | Covers the core job; fewer extras; shorter warranty | First-time buyers, tight budgets, light use |\n` +
`| Mid-range | Better materials and a longer warranty | Most people — the usual sweet spot for value |\n` +
`| Premium | Top materials, the most features, best support | Heavy/daily use where reliability pays back the cost |\n\n` +
`For most readers shopping for ${keyword}, the mid-range tier is the value sweet spot. You can ${AFFILIATE_SLOT}[compare current picks across all three tiers here](${link}).`;

  const mistakes =
`A few avoidable mistakes show up again and again with ${keyword}:\n\n` +
`- **Buying on price alone.** The cheapest option is occasionally the right call, but more often it is a short-lived false economy.\n` +
`- **Ignoring the return policy.** A generous return window is your safety net when a product does not fit your space or needs.\n` +
`- **Skipping the measurements.** Returns are a hassle. Measure twice, buy once.`;

  const faq =
`## Frequently Asked Questions (FAQ)\n\n` +
`**How much should I spend on ${keyword}?**\n` +
`Enough to clear the durability bar, but rarely top-of-market. For most people the mid-range tier delivers the best long-term value.\n\n` +
`**Is the cheapest option ever the right choice?**\n` +
`Sometimes — for light or occasional use, a budget pick can be perfectly adequate. For daily use, spending a little more usually pays for itself in longevity.\n\n` +
`**How do I avoid buyer's remorse?**\n` +
`Measure your space, set a firm budget, shortlist three options, and read the critical reviews before deciding. Buy from a seller with a fair return policy.`;

  const conclusion =
`Choosing ${keyword} comes down to matching the product to your real needs and budget — not chasing the flashiest listing. Set your ceiling, protect your two non-negotiables, and lean toward the value-tier option unless you have a specific reason to go higher.\n\n` +
`When you are ready, ${AFFILIATE_SLOT}[see current options and prices here](${link}). Take the thirty seconds to verify the details before you commit — your future self will thank you.`;

  const ownerName = (cfg.author && cfg.author.name) || (owner.owner && owner.owner.display_name) || 'The Editor';

  const body =
`# ${title}\n\n` +
`> ${cfg.monetization.disclosure_text}\n\n` +
`*By ${ownerName} · Last updated ${todayStamp()}*\n\n` +
`${intro}\n\n` +
`## What Actually Matters\n\n${whatMatters}\n\n` +
`## How to Choose\n\n${howToChoose}\n\n` +
`## Comparison: Budget vs. Mid-Range vs. Premium\n\n${comparison}\n\n` +
`## Common Mistakes to Avoid\n\n${mistakes}\n\n` +
`${faq}\n\n` +
`## The Bottom Line\n\n${conclusion}\n`;

  return body;
}

/* ------------------------------------------------------------------ */
/* PRODUCTION (BrainInterface) PATH                                    */
/* ------------------------------------------------------------------ */

function buildLlmPrompt(keyword, cfg) {
  return (
`Write a genuinely helpful, original buyer's-guide article for the long-tail keyword: "${keyword}".
Niche: ${cfg.niche}.

Hard requirements (a quality gate will reject the article if any are missing):
- At least ${cfg.quality_gate.min_words} words of substantive, specific, non-filler content.
- At least ${cfg.quality_gate.min_h2_sections} H2 sections using markdown "## ".
- A clearly labeled FAQ section.
- Markdown format. Start with an H1 (# Title).
- Include a comparison table.
- Mark every spot where an affiliate product link should go with the exact token ${AFFILIATE_SLOT} immediately before the link.
- Do NOT use these filler phrases: ${(cfg.quality_gate.banned_phrases || []).join('; ')}.
- Write for a real human deciding what to buy. Be specific and honest. Note trade-offs.
- Do NOT fabricate specific prices, brand names, model numbers, or test results you cannot verify — speak in terms of tiers, features, and decision criteria.

Return ONLY the markdown article. The disclosure line and byline will be injected by the engine; do not add your own disclosure.`
  );
}

async function generateViaBrain(keyword, cfg) {
  const BrainInterface = tryLoadBrainInterface();
  if (!BrainInterface) return null;
  try {
    const brain = new BrainInterface(cfg.brain || 'claude', {
      tag: 'content-engine',
      hubRoot: require('./lib').HUB_ROOT,
    });
    const { content } = await brain.execute(buildLlmPrompt(keyword, cfg), {
      maxTokens: 8192,
      mode: 'build',
      skipContextHeader: true,
    });
    return content && content.trim() ? content.trim() : null;
  } catch (err) {
    // Any failure (no network, no SDK, adapter error) -> fall back.
    return null;
  }
}

/** Ensure disclosure + byline are present at the top of an LLM-produced body. */
function ensureDisclosureAndByline(body, cfg, owner) {
  let out = body;
  if (!/affiliate/i.test(out) || !/disclos/i.test(out)) {
    const ownerName = (cfg.author && cfg.author.name) || (owner.owner && owner.owner.display_name) || 'The Editor';
    // Insert right after the first H1 if present, else at the very top.
    const disclosureBlock = `\n\n> ${cfg.monetization.disclosure_text}\n\n*By ${ownerName} · Last updated ${todayStamp()}*\n`;
    const h1 = out.match(/^#\s+.*$/m);
    if (h1) {
      out = out.replace(h1[0], h1[0] + disclosureBlock);
    } else {
      out = disclosureBlock + '\n' + out;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* PUBLIC API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Generate one article for a keyword.
 * @returns {Promise<{ keyword, title, slug, meta, body, gate, source, accepted, filePath? }>}
 */
async function generateArticle(keyword, opts = {}) {
  const cfg = opts.cfg || loadConfig();
  const owner = opts.owner || loadOwnerProfile();
  const articlesDir = opts.articlesDir || path.join(__dirname, cfg.articles_dir || 'articles');

  let source = 'template-fallback';
  let body = await generateViaBrain(keyword, cfg);
  if (body) {
    source = `brain:${cfg.brain || 'claude'}`;
    body = ensureDisclosureAndByline(body, cfg, owner);
  } else {
    body = buildTemplateArticle(keyword, cfg, owner);
  }

  // Derive title from first H1, fallback to titlecased keyword.
  const h1 = body.match(/^#\s+(.+)$/m);
  const title = h1 ? h1[1].trim() : titleCase(keyword);
  const slug = slugify(title || keyword);

  const description =
    `A practical, honest buyer's guide to ${keyword}. What matters, how to choose, ` +
    `and the trade-offs across budget, mid-range, and premium options.`;

  const gate = qualityGate(body, cfg);

  const meta = {
    title,
    slug,
    description: description.slice(0, 160),
    keyword,
    date: todayStamp(),
    source,
    words: gate.words,
    gate_pass: gate.pass,
  };

  const result = {
    keyword, title, slug, meta, body, gate, source, accepted: gate.pass,
  };

  if (gate.pass && !opts.dryRun) {
    if (!fs.existsSync(articlesDir)) fs.mkdirSync(articlesDir, { recursive: true });
    const filePath = path.join(articlesDir, `${slug}.md`);
    fs.writeFileSync(filePath, toMarkdownFile(meta, body));
    result.filePath = filePath;
  }

  return result;
}

module.exports = { generateArticle, qualityGate, buildTemplateArticle, AFFILIATE_SLOT };

/* ------------------------------------------------------------------ */
/* CLI                                                                 */
/* ------------------------------------------------------------------ */

if (require.main === module) {
  const keyword = process.argv.slice(2).join(' ').trim();
  if (!keyword) {
    console.error('Usage: node generate-article.js "<long-tail keyword>"');
    process.exit(1);
  }
  generateArticle(keyword).then((r) => {
    console.log(`\nKeyword : ${r.keyword}`);
    console.log(`Title   : ${r.title}`);
    console.log(`Source  : ${r.source}`);
    console.log(`Words   : ${r.gate.words}`);
    console.log(`H2s     : ${r.gate.h2Count}`);
    console.log(`Gate    : ${r.gate.pass ? 'PASS' : 'FAIL'}`);
    if (!r.gate.pass) console.log(`Reasons : ${r.gate.reasons.join('; ')}`);
    if (r.filePath) console.log(`Wrote   : ${path.relative(process.cwd(), r.filePath)}`);
    console.log('');
  }).catch((e) => { console.error('generate-article failed:', e); process.exit(1); });
}
