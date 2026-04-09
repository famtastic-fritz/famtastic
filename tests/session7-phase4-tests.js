#!/usr/bin/env node
/**
 * Session 7 — Phase 4: Research Intelligence System Tests
 *
 * Verifies:
 *   - research-registry.js: RESEARCH_REGISTRY shape, 4 sources, functions exported
 *   - research-router.js: queryResearch, rateResearch, selectSource exported
 *   - scripts/seed-pinecone: exists, graceful when no PINECONE_API_KEY
 *   - server.js: research endpoints wired, research modules required
 *   - fam-hub: research subcommand exists
 *   - index.html: research sources panel HTML + JS
 *   - Effectiveness scoring: saveEffectivenessScore + getEffectivenessReport work
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT           = path.resolve(__dirname, '..');
const REGISTRY_FILE  = path.join(ROOT, 'site-studio', 'lib', 'research-registry.js');
const ROUTER_FILE    = path.join(ROOT, 'site-studio', 'lib', 'research-router.js');
const SEED_SCRIPT    = path.join(ROOT, 'scripts', 'seed-pinecone');
const FAM_HUB        = path.join(ROOT, 'scripts', 'fam-hub');
const SERVER_FILE    = path.join(ROOT, 'site-studio', 'server.js');
const INDEX_HTML     = path.join(ROOT, 'site-studio', 'public', 'index.html');

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, name, detail = '') {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.error(`  ✗ ${name}${detail ? ': ' + detail : ''}`);
    failed++;
    failures.push({ name, detail });
  }
}

const serverSrc = fs.readFileSync(SERVER_FILE, 'utf8');
const indexHtml = fs.readFileSync(INDEX_HTML,  'utf8');
const famHubSrc = fs.readFileSync(FAM_HUB, 'utf8');

// ── GROUP: research-registry.js ──────────────────────────────────────────────

console.log('\n── research-registry.js ──────────────────────────────────────────');

{
  assert(fs.existsSync(REGISTRY_FILE), 'research-registry.js exists');

  // Require and check exports
  let reg;
  try { reg = require(REGISTRY_FILE); } catch(e) { reg = null; assert(false, 'require research-registry.js', e.message); }

  if (reg) {
    assert(typeof reg.RESEARCH_REGISTRY === 'object', 'RESEARCH_REGISTRY exported');
    const keys = Object.keys(reg.RESEARCH_REGISTRY);
    assert(keys.includes('gemini_loop'),    'gemini_loop source defined');
    assert(keys.includes('build_patterns'), 'build_patterns source defined');
    assert(keys.includes('manual'),         'manual source defined');
    assert(keys.includes('perplexity'),     'perplexity source defined');
    assert(keys.length >= 4,               `At least 4 sources (got ${keys.length})`);

    // Check perplexity is disabled by default
    assert(reg.RESEARCH_REGISTRY.perplexity.status === 'disabled',
      'perplexity.status is "disabled" by default');

    // Check build_patterns is active
    assert(reg.RESEARCH_REGISTRY.build_patterns.status === 'active',
      'build_patterns.status is "active"');

    // All sources have required fields
    for (const [key, src] of Object.entries(reg.RESEARCH_REGISTRY)) {
      assert(typeof src.name === 'string',           `${key}.name is a string`);
      assert(typeof src.query === 'function',        `${key}.query is a function`);
      assert(typeof src.costPerQuery === 'number',   `${key}.costPerQuery is a number`);
      assert(Array.isArray(src.bestFor),             `${key}.bestFor is an array`);
    }

    // Effectiveness functions
    assert(typeof reg.saveEffectivenessScore === 'function',  'saveEffectivenessScore exported');
    assert(typeof reg.getEffectivenessReport === 'function',  'getEffectivenessReport exported');
    assert(typeof reg.loadEffectivenessScores === 'function', 'loadEffectivenessScores exported');

    // Test effectiveness scoring (unit test — writes to .local/)
    const before = reg.getEffectivenessReport();
    reg.saveEffectivenessScore('build_patterns', 'test-vertical', 4);
    const after = reg.getEffectivenessReport();
    const bpEntry = after.find(e => e.source === 'build_patterns');
    assert(bpEntry && bpEntry.totalCalls > 0,
      'saveEffectivenessScore increments call count');
  }
}

// ── GROUP: research-router.js ─────────────────────────────────────────────────

console.log('\n── research-router.js ────────────────────────────────────────────');

{
  assert(fs.existsSync(ROUTER_FILE), 'research-router.js exists');

  let router;
  try { router = require(ROUTER_FILE); } catch(e) { router = null; assert(false, 'require research-router.js', e.message); }

  if (router) {
    assert(typeof router.queryResearch === 'function',  'queryResearch exported');
    assert(typeof router.rateResearch === 'function',   'rateResearch exported');
    assert(typeof router.selectSource === 'function',   'selectSource exported');
    assert(typeof router.logResearchCall === 'function','logResearchCall exported');

    // Source selection
    const source = router.selectSource('retail', 'what colors work?');
    assert(['build_patterns', 'manual', 'gemini_loop', 'perplexity'].includes(source),
      `selectSource returns valid source (got: ${source})`);

    // Force source option
    const forced = router.selectSource('retail', 'test', { forceSource: 'manual' });
    assert(forced === 'manual', 'forceSource option respected');

    // rateResearch validates input
    const badRate = router.rateResearch('build_patterns', 'retail', 0); // score 0 is invalid
    assert(badRate === false, 'rateResearch rejects invalid score (0)');

    const goodRate = router.rateResearch('build_patterns', 'retail', 4);
    assert(goodRate === true, 'rateResearch accepts valid score (4)');
  }

  // Check router source code for key patterns
  const routerSrc = fs.readFileSync(ROUTER_FILE, 'utf8');
  assert(routerSrc.includes('pineconeQuery'),   'research-router uses pineconeQuery');
  assert(routerSrc.includes('pineconeUpsert'),  'research-router uses pineconeUpsert');
  assert(routerSrc.includes('logResearchCall'), 'research-router logs every call');
  assert(routerSrc.includes('fromCache: true'), 'research-router returns fromCache: true for hits');
  assert(routerSrc.includes('stale'),           'research-router handles stale results');
  assert(routerSrc.includes('90'),              'research-router enforces 90-day staleness');
}

// ── GROUP: seed-pinecone script ───────────────────────────────────────────────

console.log('\n── scripts/seed-pinecone ─────────────────────────────────────────');

{
  assert(fs.existsSync(SEED_SCRIPT), 'scripts/seed-pinecone exists');

  // Check executable
  let isExec = false;
  try { isExec = (fs.statSync(SEED_SCRIPT).mode & 0o111) !== 0; } catch {}
  assert(isExec, 'seed-pinecone is executable');

  // Runs gracefully without PINECONE_API_KEY
  const env = { ...process.env };
  delete env.PINECONE_API_KEY;
  const result = spawnSync('node', [SEED_SCRIPT], {
    cwd: ROOT,
    env,
    encoding: 'utf8',
    timeout: 10000,
  });
  assert(result.status === 0,
    `seed-pinecone exits 0 when no PINECONE_API_KEY (exit: ${result.status})`);
  assert((result.stdout || '').includes('PINECONE_API_KEY') || (result.stdout || '').includes('Skipping'),
    'seed-pinecone explains why it skipped (mentions PINECONE_API_KEY)');

  // Check seed script reads sites dir and SITE-LEARNINGS
  const seedSrc = fs.readFileSync(SEED_SCRIPT, 'utf8');
  assert(seedSrc.includes('sites'),            'seed-pinecone reads sites directory');
  assert(seedSrc.includes('SITE-LEARNINGS'),   'seed-pinecone reads SITE-LEARNINGS.md');
  assert(seedSrc.includes('spec.json'),        'seed-pinecone reads site spec.json files');
  assert(seedSrc.includes('design_decisions'), 'seed-pinecone seeds design decisions');
  assert(seedSrc.includes("source: 'build_patterns'"),
    'seed-pinecone tags vectors with source: build_patterns');
  assert(seedSrc.includes('famtastic-intelligence'),
    'seed-pinecone targets famtastic-intelligence index');
}

// ── GROUP: fam-hub research subcommand ───────────────────────────────────────

console.log('\n── fam-hub research subcommand ──────────────────────────────────');

{
  assert(famHubSrc.includes('research)'),
    'fam-hub has research) case');
  assert(famHubSrc.includes('seed-from-sites'),
    'fam-hub research seed-from-sites subcommand');
  assert(famHubSrc.includes('seed-pinecone'),
    'fam-hub research seed-from-sites calls seed-pinecone');
  assert(famHubSrc.includes('/api/research/sources') || famHubSrc.includes('sources)'),
    'fam-hub research sources subcommand');
  assert(famHubSrc.includes('effectiveness') && famHubSrc.includes('/api/research/effectiveness'),
    'fam-hub research effectiveness subcommand');
}

// ── GROUP: server.js endpoints ────────────────────────────────────────────────

console.log('\n── server.js research endpoints ──────────────────────────────────');

{
  assert(serverSrc.includes("require('./lib/research-registry')"),
    'server.js requires research-registry');
  assert(serverSrc.includes("require('./lib/research-router')"),
    'server.js requires research-router');
  assert(serverSrc.includes("app.get('/api/research/sources'"),
    'GET /api/research/sources endpoint exists');
  assert(serverSrc.includes("app.get('/api/research/effectiveness'"),
    'GET /api/research/effectiveness endpoint exists');
  assert(serverSrc.includes("app.post('/api/research/query'"),
    'POST /api/research/query endpoint exists');
  assert(serverSrc.includes("app.post('/api/research/rate'"),
    'POST /api/research/rate endpoint exists');
  assert(
    serverSrc.indexOf("app.get('/api/research/sources'") <
    serverSrc.indexOf("app.get('/api/research/:filename'"),
    'GET /api/research/sources registered BEFORE parameterized /:filename route');
}

// ── GROUP: index.html research panel ─────────────────────────────────────────

console.log('\n── index.html research panel ─────────────────────────────────────');

{
  assert(indexHtml.includes('research-sources-panel'),
    'index.html has #research-sources-panel element');
  assert(indexHtml.includes('research-sources-list'),
    'index.html has #research-sources-list element');
  assert(indexHtml.includes('research-query-result'),
    'index.html has #research-query-result element');
  assert(indexHtml.includes('research-vertical-select'),
    'index.html has vertical selector dropdown');
  assert(indexHtml.includes('research-question-input'),
    'index.html has research question input');
  assert(indexHtml.includes('loadResearchSources()'),
    'index.html calls loadResearchSources()');
  assert(indexHtml.includes('runResearchQuery()'),
    'index.html calls runResearchQuery()');
  assert(indexHtml.includes('/api/research/sources'),
    'loadResearchSources fetches /api/research/sources');
  assert(indexHtml.includes('/api/research/query'),
    'runResearchQuery posts to /api/research/query');
  assert(indexHtml.includes("tab === 'intel'") || indexHtml.includes("switchCanvasTab"),
    'Research panel auto-loads when Intel tab opens');
}

// ── Results ──────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
console.log(`Session 7 Phase 4: ${passed + failed} tests — ${passed} passed, ${failed} failed`);

if (failures.length > 0) {
  console.log('\nFailures:');
  failures.forEach(f => console.log(`  ✗ ${f.name}${f.detail ? ' — ' + f.detail : ''}`));
}

process.exit(failed > 0 ? 1 : 0);
