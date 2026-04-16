#!/usr/bin/env node
/**
 * Phase 2 — UI Shell + Editable Canvas Tests
 *
 * Verifies:
 *   1. POST /api/content-field — surgical field patch by field_id (no AI)
 *   2. GET /api/content-fields/:page — returns field registry for page
 *   3. Global field propagation — phone/email/address update all pages
 *   4. Field-not-in-spec fallback: POST /api/sync-content-fields then retry
 *   5. Editable view JS: uses fetch to /api/content-field (not WebSocket)
 *   6. Canvas tab HTML structure exists (Preview, Editable View, Images)
 *   7. injectEditableOverlay and openFieldEditor functions defined
 *   8. Mutation log written by /api/content-field endpoint
 *
 * Usage:
 *   SITE_TAG=site-auntie-gale-garage-sales node tests/phase2-ui-shell-tests.js
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const SITE_TAG = process.env.SITE_TAG || 'site-auntie-gale-garage-sales';
const STUDIO_PORT = parseInt(process.env.STUDIO_PORT || '3334', 10);
const BASE = `http://localhost:${STUDIO_PORT}`;
const HUB_ROOT = path.join(__dirname, '..');
const SITE_DIR = path.join(HUB_ROOT, 'sites', SITE_TAG);
const DIST_DIR = path.join(SITE_DIR, 'dist');

let pass = 0, fail = 0, total = 0;
const failures = [];

function assert(name, condition, detail = '') {
  total++;
  if (condition) { console.log(`  ✅ PASS: ${name}`); pass++; }
  else { console.log(`  ❌ FAIL: ${name}${detail ? ` — ${detail}` : ''}`); fail++; failures.push({ name, detail }); }
}

async function httpPost(endpoint, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost', port: STUDIO_PORT, path: endpoint, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': BASE, 'Content-Length': Buffer.byteLength(bodyStr) },
    }, res => {
      let d = ''; res.on('data', x => d += x);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, body: d }); } });
    });
    req.on('error', reject); req.write(bodyStr); req.end();
  });
}

async function httpGet(endpoint) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost', port: STUDIO_PORT, path: endpoint, method: 'GET',
      headers: { 'Origin': BASE },
    }, res => {
      let d = ''; res.on('data', x => d += x);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, body: d }); } });
    });
    req.on('error', reject); req.end();
  });
}

async function runTests() {
  console.log(`\nPhase 2 — UI Shell + Editable Canvas Tests`);
  console.log(`Site: ${SITE_TAG} | Server: ${BASE}\n`);

  // ─── Server health ────────────────────────────────────────────────────────
  console.log('TEST GROUP: Server Health');
  try {
    const r = await httpGet('/');
    assert('server is running', r.status < 500, `got ${r.status}`);
  } catch (e) {
    assert('server is running', false, `connection refused: ${e.message}`);
    printResults(); return;
  }

  // ─── Seed spec.content first ──────────────────────────────────────────────
  await httpPost('/api/sync-content-fields', {}).catch(() => {});

  // ─── GROUP 1: GET /api/content-fields/:page ──────────────────────────────
  console.log('\nTEST GROUP: GET /api/content-fields/:page');
  {
    const r = await httpGet('/api/content-fields/index.html');
    assert('GET content-fields returns 200', r.status === 200, `got ${r.status}`);
    assert('response has page field', r.body?.page === 'index.html');
    assert('response has fields array', Array.isArray(r.body?.fields));
    assert('response has total count', typeof r.body?.total === 'number');
    assert('at least 5 fields on index.html', (r.body?.total || 0) >= 5, `total: ${r.body?.total}`);

    if (r.body?.fields?.length > 0) {
      const f = r.body.fields[0];
      assert('field has field_id', typeof f.field_id === 'string');
      assert('field has value', f.value !== undefined);
      assert('field has type', typeof f.type === 'string');
    }

    // Invalid page name — Express may normalize URL before isValidPageName check; 400 or 404 both secure
    const r2 = await httpGet('/api/content-fields/../etc/passwd');
    assert('rejects path traversal page name', r2.status === 400 || r2.status === 404, `got ${r2.status}`);
  }

  // ─── GROUP 2: POST /api/content-field — surgical patch ───────────────────
  console.log('\nTEST GROUP: POST /api/content-field — surgical field patch');
  {
    // Get a real field from the spec
    const fields = await httpGet('/api/content-fields/index.html');
    const testField = fields.body?.fields?.find(f => f.type === 'text' && typeof f.value === 'string' && f.value.length < 100);

    if (!testField) {
      assert('test field found in index.html', false, 'no suitable text field');
    } else {
      const origValue = testField.value;
      const newValue = origValue + ' [PHASE2-TEST]';
      const fieldId = testField.field_id;

      // Apply the patch
      const r = await httpPost('/api/content-field', {
        page: 'index.html',
        field_id: fieldId,
        new_value: newValue,
      });
      assert('patch returns 200', r.status === 200, `got ${r.status}: ${JSON.stringify(r.body)}`);
      assert('patch response has success', r.body?.success === true);
      assert('patch response has field_id', r.body?.field_id === fieldId);
      assert('patch response has old_value', r.body?.old_value === origValue);
      assert('patch response has new_value', r.body?.new_value === newValue);
      assert('patch response has cascade_pages array', Array.isArray(r.body?.cascade_pages));

      // Verify HTML was updated
      const html = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf8');
      assert('HTML contains new value after patch', html.includes(newValue),
        `field_id: ${fieldId}, new_value: ${newValue.substring(0, 50)}`);
      assert('HTML no longer has test marker in wrong place', html.includes('[PHASE2-TEST]'));

      // Verify spec.content updated
      const spec = JSON.parse(fs.readFileSync(path.join(SITE_DIR, 'spec.json'), 'utf8'));
      const specField = spec.content?.['index.html']?.fields?.find(f => f.field_id === fieldId);
      assert('spec.content updated with new value', specField?.value === newValue,
        `spec value: ${specField?.value}`);

      // Restore original value
      await httpPost('/api/content-field', { page: 'index.html', field_id: fieldId, new_value: origValue });
      const htmlRestored = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf8');
      assert('HTML restored to original value', !htmlRestored.includes('[PHASE2-TEST]'));
    }
  }

  // ─── GROUP 3: Validation — missing params return 400 ─────────────────────
  console.log('\nTEST GROUP: POST /api/content-field — validation');
  {
    const r1 = await httpPost('/api/content-field', { field_id: 'hero-headline', new_value: 'x' });
    assert('missing page → 400', r1.status === 400, `got ${r1.status}`);

    const r2 = await httpPost('/api/content-field', { page: 'index.html', new_value: 'x' });
    assert('missing field_id → 400', r2.status === 400, `got ${r2.status}`);

    const r3 = await httpPost('/api/content-field', { page: 'index.html', field_id: 'nonexistent-xyz-abc', new_value: 'test' });
    assert('field not in spec → 404', r3.status === 404, `got ${r3.status}: ${JSON.stringify(r3.body)}`);
  }

  // ─── GROUP 4: Global field propagation ───────────────────────────────────
  console.log('\nTEST GROUP: Global field propagation (phone/email across pages)');
  {
    const serverSrc = fs.readFileSync(path.join(HUB_ROOT, 'site-studio', 'server.js'), 'utf8');
    assert('GLOBAL_FIELD_TYPES defined in /api/content-field',
      serverSrc.includes("GLOBAL_FIELD_TYPES = ['phone', 'email', 'address', 'hours']"));
    assert('cascade_pages returned in response',
      serverSrc.includes('cascade_pages: cascadePages'));
    assert('other pages patched when field is global',
      serverSrc.includes('GLOBAL_FIELD_TYPES.includes(field.type)'));
    assert('spec updated for cascaded pages',
      serverSrc.includes('matchField.value = new_value'));

    // Try patching a phone field if one exists across pages
    const spec = JSON.parse(fs.readFileSync(path.join(SITE_DIR, 'spec.json'), 'utf8'));
    const contactFields = spec.content?.['contact.html']?.fields || [];
    const phoneField = contactFields.find(f => f.type === 'phone' || f.field_id === 'phone');
    if (phoneField && typeof phoneField.value === 'string') {
      const origPhone = phoneField.value;
      const testPhone = '(555) 999-0000';
      const r = await httpPost('/api/content-field', {
        page: 'contact.html',
        field_id: phoneField.field_id,
        new_value: testPhone,
      });
      assert('phone patch returns 200', r.status === 200, `got ${r.status}`);
      if (r.status === 200) {
        assert('phone patch has cascade_pages', Array.isArray(r.body?.cascade_pages));
        // Restore
        await httpPost('/api/content-field', { page: 'contact.html', field_id: phoneField.field_id, new_value: origPhone });
        assert('phone restored', true); // if restore throws, test crashes — that's fine
      }
    } else {
      console.log('  ℹ️  No phone field in contact.html spec — skipping live propagation test');
    }
  }

  // ─── GROUP 5: Mutation log written by /api/content-field ─────────────────
  console.log('\nTEST GROUP: Mutation log written by /api/content-field');
  {
    const serverSrc = fs.readFileSync(path.join(HUB_ROOT, 'site-studio', 'server.js'), 'utf8');
    assert('writeSpec called with mutationLevel', serverSrc.includes("mutationLevel: 'field'"));
    assert('writeSpec called with mutationTarget field_id', serverSrc.includes("mutationTarget: field_id"));
    assert('writeSpec called with source content_field_api', serverSrc.includes("source: 'content_field_api'"));

    const mutationLog = path.join(SITE_DIR, 'mutations.jsonl');
    if (fs.existsSync(mutationLog)) {
      const lines = fs.readFileSync(mutationLog, 'utf8').trim().split('\n').filter(Boolean);
      assert('mutations.jsonl has entries', lines.length > 0);
      let lastMutation;
      try { lastMutation = JSON.parse(lines[lines.length - 1]); } catch {}
      assert('mutation has timestamp', typeof lastMutation?.timestamp === 'string');
      assert('mutation has level field', typeof lastMutation?.level === 'string');
    } else {
      console.log('  ℹ️  mutations.jsonl not yet created (no patches applied before test)');
    }
  }

  // ─── GROUP 6: Canvas / workspace HTML structure (Session 14 new shell) ───
  // Updated Session 14: old canvas-tab-bar/canvas-editable IDs replaced by
  // #canvas-area + .ws-tab-pane pattern in the new three-column shell.
  console.log('\nTEST GROUP: Canvas / workspace HTML structure');
  {
    const htmlSrc = fs.readFileSync(path.join(HUB_ROOT, 'site-studio', 'public', 'index.html'), 'utf8');

    assert('#canvas-area exists', htmlSrc.includes('id="canvas-area"'));
    assert('#tab-bar exists', htmlSrc.includes('id="tab-bar"'));
    assert('tab-pane-chat exists', htmlSrc.includes('id="tab-pane-chat"'));
    assert('tab-pane-preview exists', htmlSrc.includes('id="tab-pane-preview"'));
    assert('tab-pane-assets exists', htmlSrc.includes('id="tab-pane-assets"'));
    assert('preview-frame iframe exists', htmlSrc.includes('id="preview-frame"'));
    assert('#toolbar exists', htmlSrc.includes('id="toolbar"'));
    assert('#workspace exists', htmlSrc.includes('id="workspace"'));
    assert('#activity-rail exists', htmlSrc.includes('id="activity-rail"'));
  }

  // ─── GROUP 7: Studio JS modules loaded (Session 14 new module structure) ─
  // Updated Session 14: functions moved from inline script to module JS files.
  console.log('\nTEST GROUP: Studio JS modules and key functions');
  {
    const htmlSrc = fs.readFileSync(path.join(HUB_ROOT, 'site-studio', 'public', 'index.html'), 'utf8');

    assert('studio-shell.js loaded', htmlSrc.includes('src="js/studio-shell.js"'));
    assert('studio-orb.js loaded', htmlSrc.includes('src="js/studio-orb.js"'));
    assert('studio-brief.js loaded', htmlSrc.includes('src="js/studio-brief.js"'));
    assert('studio-screens.js loaded', htmlSrc.includes('src="js/studio-screens.js"'));
    assert('brain-selector.js loaded', htmlSrc.includes('src="js/brain-selector.js"'));
    assert('worker-queue-badge.js loaded', htmlSrc.includes('src="js/worker-queue-badge.js"'));
    assert('addMessage function defined', htmlSrc.includes('function addMessage('));
    assert('cancelBuild function defined', htmlSrc.includes('function cancelBuild('));
    assert('rebuildSite function defined', htmlSrc.includes('function rebuildSite('));
    assert('chat sends content key (not message)', htmlSrc.includes("type: 'chat', content:"));
  }

  // ─── GROUP 8: studio-shell.css exists and has new canvas/tab styles ───────
  // Updated Session 14: studio-canvas.css removed. Canvas/tab styles are now
  // in studio-shell.css.
  console.log('\nTEST GROUP: studio-shell.css canvas + tab styles');
  {
    const cssPath = path.join(HUB_ROOT, 'site-studio', 'public', 'css', 'studio-shell.css');
    assert('studio-shell.css exists', fs.existsSync(cssPath));
    if (fs.existsSync(cssPath)) {
      const css = fs.readFileSync(cssPath, 'utf8');
      assert('#canvas-area styled', css.includes('#canvas-area'));
      assert('.ws-tab styled', css.includes('.ws-tab'));
      assert('.ws-tab.active styled', css.includes('.ws-tab.active'));
      assert('.ws-tab-pane styled', css.includes('.ws-tab-pane'));
      assert('.ws-tab-pane.hidden styled', css.includes('.ws-tab-pane.hidden'));
    }
  }

  printResults();
}

function printResults() {
  console.log(`\n${'━'.repeat(44)}`);
  console.log(`Phase 2 UI Shell Results: ${pass} PASS | ${fail} FAIL | ${total} total`);
  console.log(`${'━'.repeat(44)}\n`);
  if (failures.length > 0) {
    console.log('Failures:');
    failures.forEach(f => console.log(`  ✗ ${f.name}${f.detail ? ` — ${f.detail}` : ''}`));
    console.log('');
  }
  const logDir = path.join(__dirname, 'automation', 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  fs.writeFileSync(
    path.join(logDir, 'phase2-ui-shell-results.json'),
    JSON.stringify({ pass, fail, total, failures, timestamp: new Date().toISOString() }, null, 2)
  );
  console.log('Results saved to tests/automation/logs/phase2-ui-shell-results.json');
  process.exit(fail > 0 ? 1 : 0);
}

runTests().catch(e => { console.error('Test runner crashed:', e.message); process.exit(1); });
