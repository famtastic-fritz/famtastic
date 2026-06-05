'use strict';

/**
 * run.js — orchestrator for the FAMtastic content/affiliate engine.
 *
 * For each keyword in config.json:
 *   1. Skip if an article already exists (idempotent — safe to run on a cron).
 *   2. Otherwise generate it (BrainInterface if available, deterministic
 *      template otherwise) and run the quality gate.
 *   3. Accepted articles are written to articles/. Rejected ones are logged
 *      with reasons and NOT written.
 * Then assemble the full static site into dist/.
 *
 * Writes a run summary to results/<date>.json.
 *
 * Usage:
 *   node scripts/content-engine/run.js              # generate + assemble
 *   node scripts/content-engine/run.js --force      # regenerate even if exists
 *   node scripts/content-engine/run.js --no-assemble
 */

const fs = require('fs');
const path = require('path');
const { loadConfig, loadOwnerProfile, slugify, todayStamp } = require('./lib');
const { generateArticle } = require('./generate-article');
const { assembleSite } = require('./assemble-site');

async function main() {
  const force = process.argv.includes('--force');
  const skipAssemble = process.argv.includes('--no-assemble');

  const cfg = loadConfig();
  const owner = loadOwnerProfile();
  const articlesDir = path.join(__dirname, cfg.articles_dir || 'articles');
  const resultsDir = path.join(__dirname, cfg.results_dir || 'results');
  if (!fs.existsSync(articlesDir)) fs.mkdirSync(articlesDir, { recursive: true });
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });

  const keywords = cfg.target_keywords || [];
  console.log('');
  console.log('============================================================');
  console.log(' FAMtastic Content Engine — autonomous run');
  console.log('============================================================');
  console.log(`Niche       : ${cfg.niche}`);
  console.log(`Keywords    : ${keywords.length}`);
  console.log(`Articles dir: ${path.relative(process.cwd(), articlesDir)}`);
  console.log('------------------------------------------------------------');

  const generated = [];
  let sourceSeen = null;

  for (const kw of keywords) {
    const slug = slugify(kw);
    const existing = path.join(articlesDir, `${slug}.md`);
    // Pre-slug check is approximate (final slug derives from title); if a file
    // for this keyword-slug exists and not forcing, skip the LLM/template call.
    if (!force && fs.existsSync(existing)) {
      console.log(`SKIP  ${kw}  (already exists: ${slug}.md)`);
      generated.push({ keyword: kw, status: 'skipped', slug });
      continue;
    }

    process.stdout.write(`GEN   ${kw} ... `);
    const r = await generateArticle(kw, { cfg, owner, articlesDir });
    sourceSeen = r.source;

    if (r.accepted) {
      console.log(`PASS (${r.gate.words} words, ${r.gate.h2Count} H2, ${r.source}) -> ${r.slug}.md`);
      generated.push({
        keyword: kw, status: 'generated', slug: r.slug, title: r.title,
        words: r.gate.words, h2: r.gate.h2Count, source: r.source, gate: 'pass',
      });
    } else {
      console.log(`FAIL gate -> ${r.gate.reasons.join('; ')}`);
      generated.push({
        keyword: kw, status: 'rejected', slug: r.slug, title: r.title,
        words: r.gate.words, source: r.source, gate: 'fail', reasons: r.gate.reasons,
      });
    }
  }

  console.log('------------------------------------------------------------');

  let assembly = null;
  if (!skipAssemble) {
    assembly = assembleSite({ cfg, owner, articlesDir });
    console.log(`Assembled site: ${assembly.articleCount} article(s) -> ${assembly.pages} pages in ${path.relative(process.cwd(), assembly.distDir)}`);
  }

  // ---- Run summary ----
  const passed = generated.filter((g) => g.status === 'generated');
  const failed = generated.filter((g) => g.status === 'rejected');
  const skipped = generated.filter((g) => g.status === 'skipped');
  const totalWords = passed.reduce((s, g) => s + (g.words || 0), 0);

  const networkUsed = !!(sourceSeen && sourceSeen.startsWith('brain:'));

  const summary = {
    generatedAt: new Date().toISOString(),
    date: todayStamp(),
    niche: cfg.niche,
    site_title: cfg.site_title,
    base_url: cfg.base_url,
    generation_source: sourceSeen || 'n/a (all skipped)',
    network_llm_used: networkUsed,
    offline_fallback_used: sourceSeen === 'template-fallback',
    keywords_total: keywords.length,
    articles_generated: passed.length,
    articles_rejected: failed.length,
    articles_skipped: skipped.length,
    total_words: totalWords,
    quality_gate: cfg.quality_gate,
    articles: generated,
    assembly: assembly ? {
      dist_dir: path.relative(__dirname, assembly.distDir),
      pages: assembly.pages,
      article_count: assembly.articleCount,
      files: assembly.files,
    } : null,
  };

  const outPath = path.join(resultsDir, `${todayStamp()}.json`);
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));

  console.log('------------------------------------------------------------');
  console.log(` Generated: ${passed.length}   Rejected: ${failed.length}   Skipped: ${skipped.length}`);
  console.log(` Total words generated this run: ${totalWords}`);
  console.log(` Source: ${summary.generation_source}${networkUsed ? '' : ' (offline deterministic fallback — real LLM path activates on Fritz\'s Mac)'}`);
  console.log(` Summary: ${path.relative(process.cwd(), outPath)}`);
  console.log('============================================================');
  console.log('');
}

main().catch((err) => { console.error('content-engine run failed:', err); process.exit(1); });
