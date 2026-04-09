/**
 * Session 2 — SEO Pipeline Tests
 * Run: node tests/session2-seo-tests.js
 * Requires Studio server running at localhost:3334 with a built site
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SITE_TAG = process.env.SITE_TAG || 'site-auntie-gale-garage-sales';
const DIST_DIR = path.join(__dirname, '..', 'sites', SITE_TAG, 'dist');

const results = [];
let passed = 0, failed = 0;

function test(name, fn) {
  try {
    const result = fn();
    if (result === true || result === undefined) {
      console.log(`  ✅ PASS: ${name}`);
      results.push({ name, status: 'PASS' });
      passed++;
    } else {
      console.log(`  ❌ FAIL: ${name} — ${result}`);
      results.push({ name, status: 'FAIL', detail: result });
      failed++;
    }
  } catch (e) {
    console.log(`  ❌ FAIL: ${name} — ${e.message}`);
    results.push({ name, status: 'FAIL', detail: e.message });
    failed++;
  }
}

const pages = fs.readdirSync(DIST_DIR).filter(f => f.endsWith('.html') && !f.startsWith('_'));
console.log(`\nSession 2 SEO Tests — ${SITE_TAG} (${pages.length} pages)\n`);

console.log('TEST GROUP: Titles');
const titles = [];
for (const page of pages) {
  const html = fs.readFileSync(path.join(DIST_DIR, page), 'utf8');
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (m) titles.push({ page, title: m[1].trim() });
  test(`${page} has <title>`, () => m ? true : `Missing <title>`);
  test(`${page} title ≤60 chars`, () => m && m[1].trim().length <= 60 ? true : `Title is ${m ? m[1].trim().length : 0} chars`);
}
test('All titles unique', () => {
  const uniq = new Set(titles.map(t => t.title));
  return uniq.size === titles.length ? true : `${titles.length - uniq.size} duplicate(s)`;
});

console.log('\nTEST GROUP: Meta Descriptions');
for (const page of pages) {
  const html = fs.readFileSync(path.join(DIST_DIR, page), 'utf8');
  const m = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  test(`${page} has meta description`, () => m ? true : 'Missing');
  if (m) test(`${page} description 50-160 chars`, () => (m[1].length >= 50 && m[1].length <= 160) ? true : `${m[1].length} chars`);
}

console.log('\nTEST GROUP: OG + Canonical');
for (const page of pages) {
  const html = fs.readFileSync(path.join(DIST_DIR, page), 'utf8');
  test(`${page} has og:title`, () => /<meta[^>]*property=["']og:title["']/i.test(html) ? true : 'Missing');
  test(`${page} has og:description`, () => /<meta[^>]*property=["']og:description["']/i.test(html) ? true : 'Missing');
  test(`${page} has og:type`, () => /<meta[^>]*property=["']og:type["']/i.test(html) ? true : 'Missing');
  test(`${page} has canonical`, () => /<link[^>]*rel=["']canonical["']/i.test(html) ? true : 'Missing');
}

console.log('\nTEST GROUP: Semantic HTML');
for (const page of pages) {
  const html = fs.readFileSync(path.join(DIST_DIR, page), 'utf8');
  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
  test(`${page} has exactly 1 <h1>`, () => h1Count === 1 ? true : `Found ${h1Count}`);
}

console.log('\nTEST GROUP: Image Alt Text');
for (const page of pages) {
  const html = fs.readFileSync(path.join(DIST_DIR, page), 'utf8');
  const imgs = html.match(/<img[^>]+>/gi) || [];
  const missing = imgs.filter(img => !/\balt=["'][^"']+["']/i.test(img));
  test(`${page} all images have alt`, () => missing.length === 0 ? true : `${missing.length}/${imgs.length} missing alt`);
}

console.log('\nTEST GROUP: sitemap.xml + robots.txt');
test('sitemap.xml exists', () => fs.existsSync(path.join(DIST_DIR, 'sitemap.xml')) ? true : 'Not found');
if (fs.existsSync(path.join(DIST_DIR, 'sitemap.xml'))) {
  const sitemap = fs.readFileSync(path.join(DIST_DIR, 'sitemap.xml'), 'utf8');
  test('sitemap.xml is valid XML', () => sitemap.includes('<?xml') && sitemap.includes('<urlset') ? true : 'Invalid XML');
  test('sitemap.xml has one URL per page', () => {
    const urlCount = (sitemap.match(/<url>/g) || []).length;
    return urlCount === pages.length ? true : `${urlCount} URLs, expected ${pages.length}`;
  });
  test('sitemap.xml has today lastmod', () => {
    const today = new Date().toISOString().split('T')[0];
    return sitemap.includes(today) ? true : `Missing date ${today}`;
  });
}
test('robots.txt exists', () => fs.existsSync(path.join(DIST_DIR, 'robots.txt')) ? true : 'Not found');
if (fs.existsSync(path.join(DIST_DIR, 'robots.txt'))) {
  const robots = fs.readFileSync(path.join(DIST_DIR, 'robots.txt'), 'utf8');
  test('robots.txt has User-agent', () => robots.includes('User-agent: *') ? true : 'Missing User-agent');
  test('robots.txt has Allow', () => robots.includes('Allow: /') ? true : 'Missing Allow');
  test('robots.txt has Sitemap', () => robots.includes('Sitemap:') ? true : 'Missing Sitemap line');
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`Session 2 Results: ${passed} PASS | ${failed} FAIL | ${passed + failed} total`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

// Write results
const logDir = path.join(__dirname, 'automation', 'logs');
fs.mkdirSync(logDir, { recursive: true });
fs.writeFileSync(
  path.join(logDir, 'session2-test-results.json'),
  JSON.stringify({ session: 2, run_date: new Date().toISOString().split('T')[0], tests: results, summary: { total: passed + failed, passed, failed } }, null, 2)
);
console.log(`Results saved to tests/automation/logs/session2-test-results.json`);
process.exit(failed > 0 ? 1 : 0);
