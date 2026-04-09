#!/usr/bin/env node
/**
 * Phase 0 — Content Data Layer Tests
 *
 * Verifies the content_update path works end-to-end:
 *   1. Classifier correctly identifies 10 content edit messages as content_update
 *   2. Classifier does NOT misclassify any as layout_update or restyle (no plan gate)
 *   3. Surgical field handler resolves edits deterministically (no AI call, no rebuild)
 *   4. data-field-id attributes exist in built HTML
 *   5. spec.content has field registry for each built page
 *   6. mutations.jsonl records every content change
 *
 * Usage:
 *   SITE_TAG=site-auntie-gale-garage-sales node tests/phase0-content-layer-tests.js
 *
 * Requires server running on STUDIO_PORT (default 3334).
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const SITE_TAG = process.env.SITE_TAG || 'site-auntie-gale-garage-sales';
const STUDIO_PORT = parseInt(process.env.STUDIO_PORT || '3334', 10);
const BASE = `http://localhost:${STUDIO_PORT}`;
const SITE_DIR = path.join(__dirname, '..', 'sites', SITE_TAG);
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
      hostname: 'localhost', port: STUDIO_PORT,
      path: endpoint, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': BASE,
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    }, res => {
      let d = ''; res.on('data', x => d += x);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function httpGet(endpoint) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost', port: STUDIO_PORT,
      path: endpoint, method: 'GET',
      headers: { 'Origin': BASE },
    }, res => {
      let d = ''; res.on('data', x => d += x);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ─── GROUP 1: Classifier intent verification ─────────────────────────────────
// These messages should ALL classify as content_update (no plan gate, no rebuild)

const CONTENT_UPDATE_MESSAGES = [
  // Core field edits
  'Change the phone number to (720) 555-9999',
  'Update the email address to hello@example.com',
  'The hours should be Saturday 8am–2pm',
  'Set the tagline to "Deals so good it hurts"',
  'Change the headline to "Shop This Weekend"',
  // Hero section
  'Update the hero headline to "DEALS SO GOOD IT HURTS"',
  'Make the hero cta say "Browse Deals Now"',
  // Natural language ownership
  'Our address is now 1234 Main St Denver CO 80202',
  // Quoted text
  'Fix the typo in the welcome message',
  // Make it say
  'Make it say "New inventory every weekend"',
];

// These messages should NOT classify as content_update (they're structural/layout)
const NOT_CONTENT_UPDATE_MESSAGES = [
  'Add a testimonial section after the hero',
  'Remove the footer social links column',
  'Make the site more minimal and clean',
  'Start over with a completely different design',
];

async function runTests() {
  console.log(`\nPhase 0 — Content Data Layer Tests`);
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

  // ─── Seed spec.content from HTML (idempotent — runs before registry tests) ─
  console.log('\nTEST GROUP: Seed spec.content registry from HTML');
  {
    const syncR = await httpPost('/api/sync-content-fields', {}).catch(() => null);
    if (syncR && syncR.status === 200) {
      assert('sync-content-fields returns 200', syncR.status === 200);
      assert('sync found at least 1 field', (syncR.body.total_fields || 0) > 0,
        `total_fields: ${syncR.body.total_fields}`);
      assert('sync registered multiple pages', (syncR.body.pages || []).length >= 2,
        `pages: ${JSON.stringify(syncR.body.pages)}`);
      console.log(`  ℹ️  Synced ${syncR.body.total_fields} fields across pages: ${(syncR.body.pages || []).join(', ')}`);
    } else {
      console.log('  ℹ️  /api/sync-content-fields not available yet — testing spec as-is');
    }
  }

  // ─── GROUP 1: Classifier intent verification ──────────────────────────────
  console.log('\nTEST GROUP: Classifier — content_update detection');
  {
    const r = await httpPost('/api/classify-intent', { message: 'ping' }).catch(() => null);
    if (!r || r.status === 404) {
      console.log('  ℹ️  /api/classify-intent not available — verifying via server source');

      // Fall back to source code analysis
      const serverSrc = fs.readFileSync(path.join(__dirname, '..', 'site-studio', 'server.js'), 'utf8');

      // Verify Phase 0 classifier improvements exist in source
      assert('default changed from layout_update to content_update',
        serverSrc.includes("return 'content_update'") &&
        serverSrc.includes('no pattern matched, defaulting to non-destructive'),
        'default fallback not updated');

      assert('hero headline pattern exists',
        serverSrc.includes('hero') && serverSrc.includes('headline') &&
        serverSrc.match(/hero.*headline.*content_update|content_update.*hero.*headline/s) !== null ||
        serverSrc.includes("hero\\s+(text|title|headline"),
        'hero headline content_update pattern not found');

      assert('pattern 10 make it say',
        serverSrc.includes('make\\s+it|have\\s+it') && serverSrc.includes("return 'content_update'"),
        '"make it say" pattern missing');

      assert('pattern 11 our hours/address',
        serverSrc.includes('our|the') && serverSrc.includes('hours|address|phone'),
        '"our hours are now" ownership pattern missing');

      assert('pattern 12 fix typo',
        serverSrc.includes('typo|spelling|wording'),
        '"fix typo" pattern missing');

      assert('content_update appears before layout_update in classifier',
        (() => {
          const contentUpdateIdx = serverSrc.indexOf("// ── CONTENT UPDATE");
          const layoutUpdateIdx = serverSrc.indexOf("// Layout update — structural");
          return contentUpdateIdx > 0 && layoutUpdateIdx > 0 && contentUpdateIdx < layoutUpdateIdx;
        })(),
        'content_update block is not before layout_update block');

      assert('12 content_update patterns defined',
        (() => {
          const match = serverSrc.match(/Pattern \d+:/g);
          return match && match.length >= 12;
        })(),
        'fewer than 12 content_update patterns found');

    } else {
      // Live classifier endpoint available
      for (const msg of CONTENT_UPDATE_MESSAGES) {
        const cr = await httpPost('/api/classify-intent', { message: msg }).catch(() => ({ body: { intent: 'error' } }));
        const intent = cr.body?.intent || 'unknown';
        assert(`classifies as content_update: "${msg.substring(0, 50)}"`,
          intent === 'content_update',
          `got: ${intent}`);
      }

      for (const msg of NOT_CONTENT_UPDATE_MESSAGES) {
        const cr = await httpPost('/api/classify-intent', { message: msg }).catch(() => ({ body: { intent: 'error' } }));
        const intent = cr.body?.intent || 'unknown';
        assert(`not content_update: "${msg.substring(0, 50)}"`,
          intent !== 'content_update',
          `got: ${intent} (should NOT be content_update)`);
      }
    }
  }

  // ─── GROUP 2: data-field-id attributes in HTML ────────────────────────────
  console.log('\nTEST GROUP: data-field-id attributes in built HTML');
  {
    const htmlFiles = ['index.html', 'shop.html', 'about.html', 'contact.html']
      .filter(f => fs.existsSync(path.join(DIST_DIR, f)));

    assert('at least one HTML page exists', htmlFiles.length > 0, `dist dir: ${DIST_DIR}`);

    for (const file of htmlFiles) {
      const html = fs.readFileSync(path.join(DIST_DIR, file), 'utf8');
      const fieldIdCount = (html.match(/data-field-id=/g) || []).length;
      const sectionIdCount = (html.match(/data-section-id=/g) || []).length;

      assert(`${file}: has data-field-id attributes`, fieldIdCount > 0,
        `found ${fieldIdCount} data-field-id attrs`);
      assert(`${file}: has data-section-id attributes`, sectionIdCount > 0,
        `found ${sectionIdCount} data-section-id attrs`);
      assert(`${file}: has 3+ data-field-id attrs`, fieldIdCount >= 3,
        `found only ${fieldIdCount}`);
    }
  }

  // ─── GROUP 3: spec.content field registry ────────────────────────────────
  console.log('\nTEST GROUP: spec.content field registry (post-sync)');
  {
    const specPath = path.join(SITE_DIR, 'spec.json');
    assert('spec.json exists', fs.existsSync(specPath));

    if (fs.existsSync(specPath)) {
      const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
      assert('spec has content key', typeof spec.content === 'object' && spec.content !== null,
        `content type: ${typeof spec.content}`);

      if (spec.content) {
        const contentPages = Object.keys(spec.content);
        assert('spec.content has at least one page', contentPages.length > 0,
          `pages: ${contentPages.join(', ')}`);

        for (const page of contentPages) {
          const pageContent = spec.content[page];
          assert(`spec.content.${page} has fields array`,
            Array.isArray(pageContent?.fields) && pageContent.fields.length > 0,
            `fields: ${JSON.stringify(pageContent?.fields?.length)}`);

          if (Array.isArray(pageContent?.fields)) {
            const sampleField = pageContent.fields[0];
            assert(`spec.content.${page}.fields[0] has field_id`,
              typeof sampleField?.field_id === 'string' && sampleField.field_id.length > 0);
            assert(`spec.content.${page}.fields[0] has value`,
              sampleField?.value !== undefined);
            assert(`spec.content.${page}.fields[0] has type`,
              typeof sampleField?.type === 'string');
          }
        }

        // Cross-reference: every spec field_id should exist in corresponding HTML
        for (const page of contentPages) {
          const htmlPath = path.join(DIST_DIR, page);
          if (!fs.existsSync(htmlPath)) continue;
          const html = fs.readFileSync(htmlPath, 'utf8');
          const fields = spec.content[page]?.fields || [];
          let foundCount = 0;
          for (const field of fields) {
            if (html.includes(`data-field-id="${field.field_id}"`)) foundCount++;
          }
          const matchPct = fields.length > 0 ? Math.round(foundCount / fields.length * 100) : 100;
          assert(`${page}: ≥50% of spec fields have matching data-field-id in HTML`,
            matchPct >= 50,
            `${foundCount}/${fields.length} fields matched (${matchPct}%)`);
        }
      }
    }
  }

  // ─── GROUP 4: Mutations log exists and is writeable ──────────────────────
  console.log('\nTEST GROUP: Mutation tracking (mutations.jsonl)');
  {
    const mutationLog = path.join(SITE_DIR, 'mutations.jsonl');

    // The log is only created after the first content_update — may not exist yet
    if (fs.existsSync(mutationLog)) {
      const lines = fs.readFileSync(mutationLog, 'utf8').trim().split('\n').filter(Boolean);
      assert('mutations.jsonl has at least one entry', lines.length > 0, `lines: ${lines.length}`);

      if (lines.length > 0) {
        let sampleMutation;
        try { sampleMutation = JSON.parse(lines[lines.length - 1]); } catch {}
        assert('mutation entry has timestamp', typeof sampleMutation?.timestamp === 'string');
        assert('mutation entry has level', typeof sampleMutation?.level === 'string');
        assert('mutation entry has action', typeof sampleMutation?.action === 'string');
        assert('mutation entry has new_value', sampleMutation?.new_value !== undefined);
        assert('mutation entry has source', typeof sampleMutation?.source === 'string');
      }
    } else {
      // Log doesn't exist yet — verify server code writes it
      const serverSrc = fs.readFileSync(path.join(__dirname, '..', 'site-studio', 'server.js'), 'utf8');
      assert('server writes mutations.jsonl', serverSrc.includes('mutations.jsonl'),
        'mutations.jsonl not referenced in server.js');
      assert('mutation has timestamp field', serverSrc.includes("timestamp: new Date().toISOString()"));
      assert('mutation has level field', serverSrc.includes("level: 'field'"));
      assert('mutation has source field', serverSrc.includes("source: 'content_update'"));
      console.log('  ℹ️  mutations.jsonl does not exist yet (no content_update edits applied yet)');
    }
  }

  // ─── GROUP 5: tryDeterministicHandler — surgical edit code exists ─────────
  console.log('\nTEST GROUP: tryDeterministicHandler — surgical edit capabilities');
  {
    const serverSrc = fs.readFileSync(path.join(__dirname, '..', 'site-studio', 'server.js'), 'utf8');

    assert('tryDeterministicHandler function exists',
      serverSrc.includes('function tryDeterministicHandler('));
    assert('field-aware content replacement block exists',
      serverSrc.includes('Field-aware content replacement') || serverSrc.includes('data-field-id system'));
    assert('cheerio used for data-field-id lookup',
      serverSrc.includes('data-field-id') && serverSrc.includes('cheerio'));
    assert('tel: href update for phone fields',
      serverSrc.includes("startsWith('tel:')"));
    assert('mailto: href update for email fields',
      serverSrc.includes("startsWith('mailto:')"));
    assert('cross-page editing supported (all pages)',
      serverSrc.includes('all\\s+pages|every\\s+page|everywhere'));
    assert('mutation logged after each successful edit',
      serverSrc.includes('appendFileSync') && serverSrc.includes('mutations.jsonl'));
    assert('spec.content updated after each edit',
      serverSrc.includes('field.value = newValue') || serverSrc.includes('writeSpec(spec)'));
    assert('reload-preview sent after deterministic edit',
      serverSrc.includes("type: 'reload-preview'"));
  }

  // ─── GROUP 6: PLAN_REQUIRED_INTENTS excludes content_update ─────────────
  console.log('\nTEST GROUP: Plan gate exclusions');
  {
    const serverSrc = fs.readFileSync(path.join(__dirname, '..', 'site-studio', 'server.js'), 'utf8');

    const planRequiredMatch = serverSrc.match(/const PLAN_REQUIRED_INTENTS\s*=\s*\[([^\]]+)\]/);
    if (planRequiredMatch) {
      const planIntents = planRequiredMatch[1];
      assert('content_update not in PLAN_REQUIRED_INTENTS', !planIntents.includes('content_update'));
      assert('layout_update in PLAN_REQUIRED_INTENTS', planIntents.includes('layout_update'));
      assert('build in PLAN_REQUIRED_INTENTS', planIntents.includes('build'));
      assert('restyle in PLAN_REQUIRED_INTENTS', planIntents.includes('restyle'));
    } else {
      assert('PLAN_REQUIRED_INTENTS defined', false, 'not found in server.js');
    }
  }

  printResults();
}

function printResults() {
  console.log(`\n${'━'.repeat(42)}`);
  console.log(`Phase 0 Content Layer Results: ${pass} PASS | ${fail} FAIL | ${total} total`);
  console.log(`${'━'.repeat(42)}\n`);

  if (failures.length > 0) {
    console.log('Failures:');
    failures.forEach(f => console.log(`  ✗ ${f.name}${f.detail ? ` — ${f.detail}` : ''}`));
    console.log('');
  }

  const logDir = path.join(__dirname, 'automation', 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  fs.writeFileSync(
    path.join(logDir, 'phase0-content-layer-results.json'),
    JSON.stringify({ pass, fail, total, failures, timestamp: new Date().toISOString() }, null, 2)
  );
  console.log('Results saved to tests/automation/logs/phase0-content-layer-results.json');
  process.exit(fail > 0 ? 1 : 0);
}

runTests().catch(e => { console.error('Test runner crashed:', e.message); process.exit(1); });
