#!/usr/bin/env node
/**
 * Session 4 — Visual Quality Tests
 * Tests: fam-motion.js, fam-shapes.css, CDN injection, fam-asset injection,
 * character-branding pipeline.
 *
 * Usage:
 *   SITE_TAG=site-auntie-gale-garage-sales node tests/session4-visual-tests.js
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const SITE_TAG = process.env.SITE_TAG || 'site-auntie-gale-garage-sales';
const STUDIO_PORT = parseInt(process.env.STUDIO_PORT || '3334', 10);
const BASE = `http://localhost:${STUDIO_PORT}`;
const SITE_DIR = path.join(__dirname, '..', 'sites', SITE_TAG);
const DIST_DIR = path.join(SITE_DIR, 'dist');
const LIB_DIR = path.join(__dirname, '..', 'lib');

let pass = 0, fail = 0, total = 0;
const failures = [];

function assert(name, condition, detail = '') {
  total++;
  if (condition) {
    console.log(`  ✅ PASS: ${name}`);
    pass++;
  } else {
    console.log(`  ❌ FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
    fail++;
    failures.push({ name, detail });
  }
}

async function request(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + endpoint);
    const bodyStr = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Origin': `http://localhost:${STUDIO_PORT}`,
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    };
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', d => { data += d; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function runTests() {
  console.log(`\nSession 4 — Visual Quality Tests`);
  console.log(`Site: ${SITE_TAG} | Server: ${BASE}\n`);

  // ─── Group: Server Health ─────────────────────────────────────────────────
  console.log('TEST GROUP: Server Health');
  try {
    const r = await request('GET', '/');
    assert('server is running', r.status < 500);
  } catch (e) {
    assert('server is running', false, `connection refused: ${e.message}`);
    printResults();
    return;
  }

  // ─── Group: fam-motion.js library file ───────────────────────────────────
  console.log('\nTEST GROUP: fam-motion.js library file');
  {
    const motionPath = path.join(LIB_DIR, 'fam-motion.js');
    assert('lib/fam-motion.js exists', fs.existsSync(motionPath));
    if (fs.existsSync(motionPath)) {
      const content = fs.readFileSync(motionPath, 'utf8');
      assert('fam-motion.js has IntersectionObserver', content.includes('IntersectionObserver'));
      assert('fam-motion.js has data-fam-animate', content.includes('data-fam-animate'));
      assert('fam-motion.js exports FamMotion', content.includes('FamMotion'));
      assert('fam-motion.js has fade-up animation', content.includes('fade-up'));
      assert('fam-motion.js has fade-in animation', content.includes('fade-in'));
      assert('fam-motion.js has slide-left animation', content.includes('slide-left'));
      assert('fam-motion.js has zoom-in animation', content.includes('zoom-in'));
      assert('fam-motion.js has fallback for no IO', content.includes('IntersectionObserver') && content.includes('Fallback'));
      assert('fam-motion.js uses IIFE pattern', content.includes('(function') || content.includes('(() =>'));
    }
  }

  // ─── Group: fam-shapes.css library file ──────────────────────────────────
  console.log('\nTEST GROUP: fam-shapes.css library file');
  {
    const shapesPath = path.join(LIB_DIR, 'fam-shapes.css');
    assert('lib/fam-shapes.css exists', fs.existsSync(shapesPath));
    if (fs.existsSync(shapesPath)) {
      const content = fs.readFileSync(shapesPath, 'utf8');
      assert('fam-shapes.css has .fam-starburst', content.includes('.fam-starburst'));
      assert('fam-shapes.css has starburst sizes', content.includes('.fam-starburst--md'));
      assert('fam-shapes.css has starburst colors', content.includes('.fam-starburst--yellow'));
      assert('fam-shapes.css has .fam-badge', content.includes('.fam-badge'));
      assert('fam-shapes.css has .fam-wave-top', content.includes('.fam-wave-top'));
      assert('fam-shapes.css has .fam-diagonal-bg', content.includes('.fam-diagonal-bg'));
      assert('fam-shapes.css has .fam-price-tag', content.includes('.fam-price-tag'));
      assert('fam-shapes.css has .fam-blob', content.includes('.fam-blob'));
      assert('fam-shapes.css uses clip-path for starburst', content.includes('clip-path'));
    }
  }

  // ─── Group: character-branding.js library ────────────────────────────────
  console.log('\nTEST GROUP: character-branding.js library');
  {
    const cbPath = path.join(LIB_DIR, 'character-branding.js');
    assert('lib/character-branding.js exists', fs.existsSync(cbPath));
    if (fs.existsSync(cbPath)) {
      try {
        const cb = require(cbPath);
        assert('exports placementsForPage()', typeof cb.placementsForPage === 'function');
        assert('exports addPlacement()', typeof cb.addPlacement === 'function');
        assert('exports removePlacement()', typeof cb.removePlacement === 'function');
        assert('exports renderPlacement()', typeof cb.renderPlacement === 'function');
        assert('exports characterSummary()', typeof cb.characterSummary === 'function');
        assert('exports POSITION_PRESETS', typeof cb.POSITION_PRESETS === 'object');
        assert('POSITION_PRESETS has hero-right', 'hero-right' in cb.POSITION_PRESETS);
        assert('POSITION_PRESETS has footer-left', 'footer-left' in cb.POSITION_PRESETS);

        // Test placementsForPage with empty spec
        const placements = cb.placementsForPage('index.html', {});
        assert('placementsForPage returns [] for empty spec', Array.isArray(placements) && placements.length === 0);

        // Test addPlacement
        const spec = {};
        cb.addPlacement('index.html', { character: 'buddy', pose: 'buddy-wave-footer', position: 'footer-left', alt: 'Buddy waving' }, spec);
        assert('addPlacement creates character_branding', !!spec.character_branding);
        assert('addPlacement creates page entry', Array.isArray(spec.character_branding['index.html']));
        assert('addPlacement stores placement', spec.character_branding['index.html'].length === 1);

        // Test renderPlacement
        const html = cb.renderPlacement({ character: 'buddy', pose: 'buddy-wave-footer', position: 'footer-left', alt: 'Buddy', dark_section: false });
        assert('renderPlacement returns img tag', html.includes('<img'));
        assert('renderPlacement includes src', html.includes('buddy-wave-footer.png'));
        assert('renderPlacement includes fam-knockout', html.includes('fam-knockout'));
        assert('renderPlacement includes drop-shadow', html.includes('drop-shadow'));

        // Test removePlacement
        cb.removePlacement('index.html', 'footer-left', 'buddy', spec);
        assert('removePlacement clears placement', spec.character_branding['index.html'].length === 0);

        // Test characterSummary
        cb.addPlacement('index.html', { character: 'buddy', pose: 'buddy-wave-footer', position: 'footer-left' }, spec);
        cb.addPlacement('about.html', { character: 'buddy', pose: 'buddy-full-body', position: 'hero-right' }, spec);
        const summary = cb.characterSummary(spec);
        assert('characterSummary returns buddy entry', 'buddy' in summary);
        assert('characterSummary tracks pages', summary.buddy.pages.includes('index.html'));
        assert('characterSummary tracks poses', summary.buddy.poses.includes('buddy-wave-footer'));

      } catch (e) {
        assert('character-branding.js loads without error', false, e.message);
      }
    }
  }

  // ─── Group: /api/character-branding GET ──────────────────────────────────
  console.log('\nTEST GROUP: /api/character-branding GET');
  {
    const r = await request('GET', '/api/character-branding');
    assert('GET /api/character-branding returns 200', r.status === 200, `got ${r.status}`);
    assert('response has placements', typeof r.body.placements === 'object');
    assert('response has summary', typeof r.body.summary === 'object');
    assert('response has position_presets', Array.isArray(r.body.position_presets));
    assert('position_presets includes hero-right', r.body.position_presets && r.body.position_presets.includes('hero-right'));
  }

  // ─── Group: /api/character-branding POST ─────────────────────────────────
  console.log('\nTEST GROUP: /api/character-branding POST');
  {
    // Missing required fields
    const r1 = await request('POST', '/api/character-branding', { page: 'index.html' });
    assert('POST returns 400 when fields missing', r1.status === 400);

    // Valid placement
    const r2 = await request('POST', '/api/character-branding', {
      page: 'index.html',
      character: 'buddy',
      pose: 'buddy-wave-footer',
      position: 'footer-left',
      alt: 'Buddy waving goodbye',
      dark_section: false,
    });
    assert('POST placement returns 200', r2.status === 200, `got ${r2.status}: ${JSON.stringify(r2.body)}`);
    if (r2.body) {
      assert('POST response has placement', !!r2.body.placement);
      assert('POST response has rendered_html', typeof r2.body.rendered_html === 'string');
      assert('rendered_html is img tag', r2.body.rendered_html && r2.body.rendered_html.includes('<img'));
      assert('rendered_html has fam-knockout', r2.body.rendered_html && r2.body.rendered_html.includes('fam-knockout'));
    }
  }

  // ─── Group: /api/character-branding DELETE ────────────────────────────────
  console.log('\nTEST GROUP: /api/character-branding DELETE');
  {
    const r = await request('DELETE', '/api/character-branding', {
      page: 'index.html',
      position: 'footer-left',
      character: 'buddy',
    });
    assert('DELETE placement returns 200', r.status === 200, `got ${r.status}`);
    assert('DELETE response success=true', r.body && r.body.success === true);
  }

  // ─── Group: /api/inject-fam-asset ────────────────────────────────────────
  console.log('\nTEST GROUP: /api/inject-fam-asset');
  {
    // Unknown asset
    const r1 = await request('POST', '/api/inject-fam-asset', { asset: 'unknown-asset' });
    assert('unknown asset returns 400', r1.status === 400);

    // fam-motion injection
    const r2 = await request('POST', '/api/inject-fam-asset', { asset: 'fam-motion', pages: ['index.html'] });
    assert('fam-motion injection returns 200', r2.status === 200, `got ${r2.status}: ${JSON.stringify(r2.body)}`);
    if (r2.body && r2.body.success) {
      assert('fam-motion.js copied to dist', fs.existsSync(path.join(DIST_DIR, 'assets', 'js', 'fam-motion.js')));
      assert('fam-motion response has updated', Array.isArray(r2.body.updated));

      if (fs.existsSync(path.join(DIST_DIR, 'assets', 'js', 'fam-motion.js'))) {
        const content = fs.readFileSync(path.join(DIST_DIR, 'assets', 'js', 'fam-motion.js'), 'utf8');
        assert('copied fam-motion.js has IntersectionObserver', content.includes('IntersectionObserver'));
      }

      // Verify tag injected in index.html
      const html = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf8');
      assert('fam-motion script tag in index.html', html.includes('fam-motion.js'));
    }

    // fam-shapes injection
    const r3 = await request('POST', '/api/inject-fam-asset', { asset: 'fam-shapes', pages: ['index.html'] });
    assert('fam-shapes injection returns 200', r3.status === 200, `got ${r3.status}: ${JSON.stringify(r3.body)}`);
    if (r3.body && r3.body.success) {
      assert('fam-shapes.css copied to dist', fs.existsSync(path.join(DIST_DIR, 'assets', 'css', 'fam-shapes.css')));

      const html = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf8');
      assert('fam-shapes link tag in index.html', html.includes('fam-shapes.css'));
    }

    // Idempotent — second injection should skip
    const r4 = await request('POST', '/api/inject-fam-asset', { asset: 'fam-motion', pages: ['index.html'] });
    assert('second fam-motion injection is idempotent', r4.status === 200);
    if (r4.body) {
      assert('second injection skips already-injected page', r4.body.skipped && r4.body.skipped.includes('index.html'));
    }
  }

  // ─── Group: /api/cdn-inject ───────────────────────────────────────────────
  console.log('\nTEST GROUP: /api/cdn-inject');
  {
    const testCdn = 'https://cdn.jsdelivr.net/npm/test-pkg@1.0.0/dist/test.min.js';

    // Missing URL
    const r1 = await request('POST', '/api/cdn-inject', { type: 'script' });
    assert('cdn-inject requires url', r1.status === 400);

    // Bad URL (local path)
    const r2 = await request('POST', '/api/cdn-inject', { url: '/local/path.js', type: 'script' });
    assert('cdn-inject rejects local path', r2.status === 400);

    // Bad type
    const r3 = await request('POST', '/api/cdn-inject', { url: testCdn, type: 'unknown' });
    assert('cdn-inject rejects unknown type', r3.status === 400);

    // Valid CDN inject
    const r4 = await request('POST', '/api/cdn-inject', {
      url: testCdn,
      type: 'script',
      pages: ['index.html'],
      position: 'body',
    });
    assert('cdn-inject returns 200', r4.status === 200, `got ${r4.status}: ${JSON.stringify(r4.body)}`);
    if (r4.body) {
      assert('cdn-inject response has updated', Array.isArray(r4.body.updated));
      assert('cdn-inject response has skipped', Array.isArray(r4.body.skipped));
      assert('cdn-inject response has tag', typeof r4.body.tag === 'string');
    }

    // Verify tag in HTML
    const html = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf8');
    assert('CDN script tag in index.html', html.includes(testCdn));

    // Idempotent
    const r5 = await request('POST', '/api/cdn-inject', {
      url: testCdn, type: 'script', pages: ['index.html'],
    });
    assert('second cdn-inject is idempotent', r5.status === 200);
    if (r5.body) {
      assert('second cdn-inject skips page', r5.body.skipped && r5.body.skipped.includes('index.html'));
    }

    // List injections
    const r6 = await request('GET', '/api/cdn-injections');
    assert('GET /api/cdn-injections returns 200', r6.status === 200);
    assert('cdn-injections is array', Array.isArray(r6.body));
    assert('cdn-injections contains test CDN', r6.body && r6.body.some(c => c.url === testCdn));

    // Delete CDN injection
    const r7 = await request('DELETE', '/api/cdn-inject', { url: testCdn, pages: ['index.html'] });
    assert('DELETE cdn-inject returns 200', r7.status === 200, `got ${r7.status}`);
    if (r7.body) {
      assert('DELETE cdn-inject has updated', Array.isArray(r7.body.updated));
    }

    const htmlAfter = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf8');
    assert('CDN script tag removed from index.html', !htmlAfter.includes(testCdn));
  }

  // ─── Results ─────────────────────────────────────────────────────────────
  printResults();
}

function printResults() {
  console.log(`\n${'━'.repeat(35)}`);
  console.log(`Session 4 Results: ${pass} PASS | ${fail} FAIL | ${total} total`);
  console.log(`${'━'.repeat(35)}\n`);

  if (failures.length > 0) {
    console.log('Failures:');
    failures.forEach(f => console.log(`  ✗ ${f.name}${f.detail ? ` — ${f.detail}` : ''}`));
    console.log('');
  }

  const logDir = path.join(__dirname, 'automation', 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  fs.writeFileSync(
    path.join(logDir, 'session4-test-results.json'),
    JSON.stringify({ pass, fail, total, failures, timestamp: new Date().toISOString() }, null, 2)
  );
  console.log('Results saved to tests/automation/logs/session4-test-results.json');
  process.exit(fail > 0 ? 1 : 0);
}

runTests().catch(e => {
  console.error('Test runner crashed:', e.message);
  process.exit(1);
});
