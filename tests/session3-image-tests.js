#!/usr/bin/env node
/**
 * Session 3 — Image Pipeline Tests
 * Tests: rembg integration, /api/remove-background endpoint, batch mode,
 * .fam-knockout CSS injection, dark-section detection, error handling.
 *
 * Usage:
 *   SITE_TAG=site-auntie-gale-garage-sales node tests/session3-image-tests.js
 *
 * Requires server running on STUDIO_PORT (default 3334).
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync, spawnSync } = require('child_process');

// ─── Config ──────────────────────────────────────────────────────────────────
const SITE_TAG = process.env.SITE_TAG || 'site-auntie-gale-garage-sales';
const STUDIO_PORT = parseInt(process.env.STUDIO_PORT || '3334', 10);
const BASE = `http://localhost:${STUDIO_PORT}`;
const SITE_DIR = path.join(__dirname, '..', 'sites', SITE_TAG);
const DIST_DIR = path.join(SITE_DIR, 'dist');
const UPLOADS_DIR = path.join(DIST_DIR, 'assets', 'uploads');

// ─── Test Runner ─────────────────────────────────────────────────────────────
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

async function request(method, endpoint, body = null, headers = {}) {
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
        ...headers,
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uploadTestImage(filename) {
  // Create a simple 10x10 white PNG using Python
  const tmpPath = path.join(UPLOADS_DIR, filename);
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const result = spawnSync('python3', ['-c', `
from PIL import Image
img = Image.new('RGB', (50, 50), color=(255, 200, 150))
img.save('${tmpPath.replace(/'/g, "\\'")}')
print('ok')
`], { encoding: 'utf8' });
  if (result.status !== 0 || !fs.existsSync(tmpPath)) {
    // Fallback: copy any existing image
    const existing = fs.readdirSync(UPLOADS_DIR).find(f => /\.(png|jpg)$/i.test(f));
    if (existing) fs.copyFileSync(path.join(UPLOADS_DIR, existing), tmpPath);
    else throw new Error('Cannot create test image and no existing uploads found');
  }
  return filename;
}

function cleanup(filename) {
  const p = path.join(UPLOADS_DIR, filename);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

async function runTests() {
  console.log(`\nSession 3 — Image Pipeline Tests`);
  console.log(`Site: ${SITE_TAG} | Server: ${BASE}\n`);

  // ─── Group: Server Health ─────────────────────────────────────────────────
  console.log('TEST GROUP: Server Health');
  try {
    const r = await request('GET', '/api/health');
    assert('server is running', r.status === 200 || r.status === 404, `got ${r.status}`);
  } catch (e) {
    assert('server is running', false, `connection refused: ${e.message}`);
    console.log('\n⚠️  Server not running. Start with: fam-hub site studio\n');
    printResults();
    return;
  }

  // ─── Group: rembg availability ────────────────────────────────────────────
  console.log('\nTEST GROUP: rembg availability');
  {
    const rembgCandidates = [
      '/Users/famtasticfritz/Library/Python/3.9/bin/rembg',
      '/usr/local/bin/rembg',
      'rembg',
    ];
    const rembgFound = rembgCandidates.some(c => {
      try { return fs.existsSync(c); } catch { return false; }
    });
    assert('rembg binary exists on system', rembgFound, 'install: pip3 install rembg');

    const pyCheck = spawnSync('python3', ['-c', 'from rembg import remove; print("ok")'], { encoding: 'utf8' });
    assert('rembg importable in python3', pyCheck.status === 0 && pyCheck.stdout.includes('ok'));
  }

  // ─── Group: /api/remove-background endpoint exists ────────────────────────
  console.log('\nTEST GROUP: /api/remove-background endpoint');
  {
    // Missing body — should return 400
    const r = await request('POST', '/api/remove-background', {});
    assert('returns 400 when no filename provided', r.status === 400, `got ${r.status}`);
    assert('error message in response', typeof r.body === 'object' && r.body.error, `body: ${JSON.stringify(r.body)}`);
  }

  // ─── Group: Invalid filename rejection ───────────────────────────────────
  console.log('\nTEST GROUP: Filename validation');
  {
    const r = await request('POST', '/api/remove-background', { filename: '../etc/passwd' });
    assert('rejects path traversal filename', r.status === 400, `got ${r.status}`);

    const r2 = await request('POST', '/api/remove-background', { filename: 'file; rm -rf /' });
    assert('rejects shell injection filename', r2.status === 400, `got ${r2.status}`);
  }

  // ─── Group: File not found ───────────────────────────────────────────────
  console.log('\nTEST GROUP: File not found handling');
  {
    const r = await request('POST', '/api/remove-background', { filename: 'nonexistent-test-999.png' });
    assert('returns error for missing file', r.status !== 200 || (r.body.errors && r.body.errors.length > 0),
      `got ${r.status} body: ${JSON.stringify(r.body)}`);
    if (r.body.errors) {
      assert('error contains filename', r.body.errors.some(e => e.filename === 'nonexistent-test-999.png'));
    }
  }

  // ─── Group: Single image background removal ──────────────────────────────
  console.log('\nTEST GROUP: Single image removal');
  let testFile, knockoutFile;
  {
    testFile = 'fam-test-input.jpg';
    knockoutFile = 'fam-test-input-knockout.png';
    // Clean up any leftovers
    cleanup(testFile);
    cleanup(knockoutFile);

    try {
      uploadTestImage(testFile);
      assert('test image created in uploads', fs.existsSync(path.join(UPLOADS_DIR, testFile)));

      const r = await request('POST', '/api/remove-background', { filename: testFile });
      assert('/api/remove-background returns 200', r.status === 200, `got ${r.status}: ${JSON.stringify(r.body)}`);
      assert('results array has one entry', Array.isArray(r.body.results) && r.body.results.length === 1,
        `results: ${JSON.stringify(r.body.results)}`);
      assert('errors array is empty', Array.isArray(r.body.errors) && r.body.errors.length === 0,
        `errors: ${JSON.stringify(r.body.errors)}`);

      const result = r.body.results[0];
      if (result) {
        assert('source field matches input', result.source === testFile);
        assert('knockout filename is {base}-knockout.png', result.knockout === knockoutFile, `got ${result.knockout}`);
        assert('path starts with /assets/uploads/', result.path && result.path.startsWith('/assets/uploads/'));
        assert('suggested_classes contains fam-knockout', result.suggested_classes && result.suggested_classes.includes('fam-knockout'));
        assert('suggested_classes has shadow variant', result.suggested_classes && (
          result.suggested_classes.includes('shadow-on-light') || result.suggested_classes.includes('shadow-on-dark')
        ));
        assert('dark_section field is boolean', typeof result.dark_section === 'boolean');
      }

      // Verify knockout PNG actually exists
      assert('knockout PNG written to disk', fs.existsSync(path.join(UPLOADS_DIR, knockoutFile)));

      // Verify it's a valid PNG with transparency (RGBA)
      if (fs.existsSync(path.join(UPLOADS_DIR, knockoutFile))) {
        const pngCheck = spawnSync('python3', ['-c', `
from PIL import Image
img = Image.open('${path.join(UPLOADS_DIR, knockoutFile).replace(/'/g, "\\'")}')
print(img.mode)
print(img.size[0], img.size[1])
`], { encoding: 'utf8' });
        assert('knockout PNG is RGBA mode', pngCheck.stdout.trim().startsWith('RGBA'),
          `mode: ${pngCheck.stdout.trim()}`);
      }

      // Verify recorded in spec
      const spec = JSON.parse(fs.readFileSync(path.join(SITE_DIR, 'spec.json'), 'utf8'));
      const recorded = (spec.uploaded_assets || []).find(a => a.filename === knockoutFile);
      assert('knockout recorded in spec.json', !!recorded, 'not found in uploaded_assets');
      if (recorded) {
        assert('knockout role is "knockout"', recorded.role === 'knockout', `got ${recorded.role}`);
        assert('knockout source field set', recorded.source === testFile);
      }
    } catch (e) {
      assert('single removal did not throw', false, e.message);
    }
  }

  // ─── Group: .fam-knockout CSS injection ──────────────────────────────────
  console.log('\nTEST GROUP: .fam-knockout CSS injection');
  {
    // injectKnockoutCss writes to styles.css or assets/css/main.css, whichever exists
    const cssCandidates = [
      path.join(DIST_DIR, 'assets', 'styles.css'),
      path.join(DIST_DIR, 'assets', 'css', 'main.css'),
    ];
    const cssPath = cssCandidates.find(p => fs.existsSync(p));
    if (cssPath) {
      const css = fs.readFileSync(cssPath, 'utf8');
      assert('.fam-knockout class in CSS', css.includes('.fam-knockout'),
        `not found in ${path.relative(DIST_DIR, cssPath)}`);
      assert('.shadow-on-dark in CSS', css.includes('shadow-on-dark'));
      assert('.shadow-on-light in CSS', css.includes('shadow-on-light'));
      assert('drop-shadow filter in knockout CSS', css.includes('drop-shadow'));
    } else {
      assert('CSS file exists for knockout injection', false, 'neither styles.css nor main.css found');
    }
  }

  // ─── Group: Batch processing ──────────────────────────────────────────────
  console.log('\nTEST GROUP: Batch processing');
  let batchFile1, batchFile2, batchKo1, batchKo2;
  {
    batchFile1 = 'fam-batch-a.jpg';
    batchFile2 = 'fam-batch-b.jpg';
    batchKo1 = 'fam-batch-a-knockout.png';
    batchKo2 = 'fam-batch-b-knockout.png';
    cleanup(batchFile1); cleanup(batchFile2);
    cleanup(batchKo1); cleanup(batchKo2);

    try {
      uploadTestImage(batchFile1);
      uploadTestImage(batchFile2);

      const r = await request('POST', '/api/remove-background', { filenames: [batchFile1, batchFile2] });
      assert('batch returns 200', r.status === 200, `got ${r.status}: ${JSON.stringify(r.body)}`);
      assert('batch results has 2 entries', Array.isArray(r.body.results) && r.body.results.length === 2,
        `results count: ${r.body.results ? r.body.results.length : 'N/A'}`);
      assert('batch errors is empty', Array.isArray(r.body.errors) && r.body.errors.length === 0);
      assert('batch knockout-a on disk', fs.existsSync(path.join(UPLOADS_DIR, batchKo1)));
      assert('batch knockout-b on disk', fs.existsSync(path.join(UPLOADS_DIR, batchKo2)));
    } catch (e) {
      assert('batch processing did not throw', false, e.message);
    }
  }

  // ─── Group: dark_section force flag ──────────────────────────────────────
  console.log('\nTEST GROUP: dark_section force flag');
  {
    const darkFile = 'fam-dark-test.jpg';
    const darkKo = 'fam-dark-test-knockout.png';
    cleanup(darkFile); cleanup(darkKo);

    try {
      uploadTestImage(darkFile);
      const r = await request('POST', '/api/remove-background', { filename: darkFile, dark_section: true });
      assert('dark_section forced returns 200', r.status === 200, `got ${r.status}`);
      if (r.body.results && r.body.results[0]) {
        assert('dark_section=true in result', r.body.results[0].dark_section === true);
        assert('shadow-on-dark in suggested_classes', r.body.results[0].suggested_classes.includes('shadow-on-dark'));
      }
    } catch (e) {
      assert('dark_section test did not throw', false, e.message);
    }
  }

  // ─── Group: response shape ───────────────────────────────────────────────
  console.log('\nTEST GROUP: Response shape');
  {
    const r = await request('POST', '/api/remove-background', { filename: 'nonexistent.png' });
    assert('response has results array', Array.isArray(r.body.results));
    assert('response has errors array', Array.isArray(r.body.errors));
    assert('response has knockout_css_class field', typeof r.body.knockout_css_class === 'string');
    assert('knockout_css_class is "fam-knockout"', r.body.knockout_css_class === 'fam-knockout');
  }

  // ─── Cleanup test files ───────────────────────────────────────────────────
  [testFile, knockoutFile, batchFile1, batchFile2, batchKo1, batchKo2,
   'fam-dark-test.jpg', 'fam-dark-test-knockout.png'].forEach(f => {
    if (f) cleanup(f);
  });

  // ─── Results ─────────────────────────────────────────────────────────────
  printResults();
}

function printResults() {
  console.log(`\n${'━'.repeat(35)}`);
  console.log(`Session 3 Results: ${pass} PASS | ${fail} FAIL | ${total} total`);
  console.log(`${'━'.repeat(35)}\n`);

  if (failures.length > 0) {
    console.log('Failures:');
    failures.forEach(f => console.log(`  ✗ ${f.name}${f.detail ? ` — ${f.detail}` : ''}`));
    console.log('');
  }

  const logDir = path.join(__dirname, 'automation', 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  fs.writeFileSync(
    path.join(logDir, 'session3-test-results.json'),
    JSON.stringify({ pass, fail, total, failures, timestamp: new Date().toISOString() }, null, 2)
  );
  console.log(`Results saved to tests/automation/logs/session3-test-results.json`);
  process.exit(fail > 0 ? 1 : 0);
}

runTests().catch(e => {
  console.error('Test runner crashed:', e);
  process.exit(1);
});
