#!/usr/bin/env node
/**
 * Phase 5 — Intelligence Loop Tests
 *
 * Verifies:
 *   1. GET /api/intel/report — full intelligence report from real log data
 *   2. GET /api/intel/findings — actionable findings only, grouped by severity
 *   3. POST /api/intel/promote — promote a finding into the pipeline
 *   4. POST /api/intel/run-research — trigger Gemini research on a topic
 *   5. Report content — cost, mutations, components, agent performance sections
 *   6. UI — Intel canvas tab, findings list, promote buttons
 *   7. CSS — intel-finding, severity styles, promote button
 *
 * Usage:
 *   SITE_TAG=site-auntie-gale-garage-sales node tests/phase5-intelligence-loop-tests.js
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const SITE_TAG = process.env.SITE_TAG || 'site-auntie-gale-garage-sales';
const STUDIO_PORT = parseInt(process.env.STUDIO_PORT || '3334', 10);
const BASE = `http://localhost:${STUDIO_PORT}`;
const HUB_ROOT = path.join(__dirname, '..');
const SITE_DIR = path.join(HUB_ROOT, 'sites', SITE_TAG);

let pass = 0, fail = 0, total = 0;
const failures = [];

function assert(name, condition, detail = '') {
  total++;
  if (condition) { console.log(`  ✅ PASS: ${name}`); pass++; }
  else { console.log(`  ❌ FAIL: ${name}${detail ? ` — ${detail}` : ''}`); fail++; failures.push({ name, detail }); }
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

async function runTests() {
  console.log(`\nPhase 5 — Intelligence Loop Tests`);
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

  // ─── GROUP 1: GET /api/intel/report ──────────────────────────────────────
  console.log('\nTEST GROUP: GET /api/intel/report');
  {
    const r = await httpGet('/api/intel/report');
    assert('returns 200', r.status === 200, `got ${r.status}`);
    assert('has findings array', Array.isArray(r.body?.findings));
    assert('has summary object', typeof r.body?.summary === 'object');
    assert('has generated_at timestamp', typeof r.body?.generated_at === 'string');
    assert('has site field', typeof r.body?.site === 'string');

    const VALID_SEVERITIES = ['critical', 'major', 'minor', 'opportunity'];
    const VALID_CATEGORIES = ['cost', 'performance', 'mutations', 'components', 'agents'];

    if (Array.isArray(r.body?.findings) && r.body.findings.length > 0) {
      const f = r.body.findings[0];
      assert('finding has category', typeof f.category === 'string');
      assert('finding has severity', VALID_SEVERITIES.includes(f.severity), `got: ${f.severity}`);
      assert('finding has title', typeof f.title === 'string' && f.title.length > 0);
      assert('finding has description', typeof f.description === 'string' && f.description.length > 0);
      assert('finding has recommendation', typeof f.recommendation === 'string');
      assert('finding has id', typeof f.id === 'string');
      assert('all findings have valid severity', r.body.findings.every(f => VALID_SEVERITIES.includes(f.severity)));
      assert('all findings have valid category', r.body.findings.every(f => VALID_CATEGORIES.includes(f.category)));
    } else {
      console.log('  ℹ️  No findings yet (no agent-calls or mutations data) — checking schema only');
      assert('report returned valid JSON', typeof r.body === 'object');
    }

    // Summary fields
    const s = r.body?.summary || {};
    assert('summary has total_agent_calls', typeof s.total_agent_calls === 'number');
    assert('summary has total_mutations', typeof s.total_mutations === 'number');
    assert('summary has total_cost_usd', typeof s.total_cost_usd === 'number');
    assert('summary has component_count', typeof s.component_count === 'number');
    assert('summary has finding_counts object', typeof s.finding_counts === 'object');
  }

  // ─── GROUP 2: GET /api/intel/findings ────────────────────────────────────
  console.log('\nTEST GROUP: GET /api/intel/findings');
  {
    const r = await httpGet('/api/intel/findings');
    assert('returns 200', r.status === 200, `got ${r.status}`);
    assert('has findings array', Array.isArray(r.body?.findings));
    assert('has critical_count', typeof r.body?.critical_count === 'number');
    assert('has major_count', typeof r.body?.major_count === 'number');
    assert('has minor_count', typeof r.body?.minor_count === 'number');
    assert('has opportunity_count', typeof r.body?.opportunity_count === 'number');
    assert('has generated_at', typeof r.body?.generated_at === 'string');
  }

  // ─── GROUP 3: POST /api/intel/promote ────────────────────────────────────
  console.log('\nTEST GROUP: POST /api/intel/promote');
  {
    // Missing finding_id → 400
    const r1 = await httpPost('/api/intel/promote', {});
    assert('missing finding_id → 400', r1.status === 400, `got ${r1.status}`);
    assert('400 has error', typeof r1.body?.error === 'string');

    // Unknown finding_id → 404
    const r2 = await httpPost('/api/intel/promote', { finding_id: 'nonexistent-xyz-abc' });
    assert('unknown finding_id → 404', r2.status === 404, `got ${r2.status}`);

    // Get a real finding id from report, then promote it
    const report = await httpGet('/api/intel/report');
    const findings = report.body?.findings || [];
    if (findings.length > 0) {
      const fid = findings[0].id;
      const r3 = await httpPost('/api/intel/promote', { finding_id: fid });
      assert('valid finding_id → 200', r3.status === 200, `got ${r3.status}: ${JSON.stringify(r3.body).substring(0,100)}`);
      assert('response has promoted_at', typeof r3.body?.promoted_at === 'string');
      assert('response has finding_id', r3.body?.finding_id === fid);
      assert('response has action_taken', typeof r3.body?.action_taken === 'string');

      // Verify promotion written to disk
      const promotionsFile = path.join(SITE_DIR, 'intelligence-promotions.json');
      assert('promotions file created', fs.existsSync(promotionsFile));
      if (fs.existsSync(promotionsFile)) {
        const promotions = JSON.parse(fs.readFileSync(promotionsFile, 'utf8'));
        assert('promoted finding appears in file', Array.isArray(promotions) && promotions.some(p => p.finding_id === fid));
      }
    } else {
      console.log('  ℹ️  No findings to promote — skipping promote test');
      assert('promote endpoint exists (checked via 400)', r1.status === 400);
    }
  }

  // ─── GROUP 4: POST /api/intel/run-research ───────────────────────────────
  console.log('\nTEST GROUP: POST /api/intel/run-research');
  {
    // Missing topic → 400
    const r1 = await httpPost('/api/intel/run-research', {});
    assert('missing topic → 400', r1.status === 400, `got ${r1.status}`);
    assert('400 has error', typeof r1.body?.error === 'string');

    // With topic → 200 (stub research, no real Gemini call in test)
    const r2 = await httpPost('/api/intel/run-research', { topic: 'model pricing comparison' });
    assert('with topic → 200', r2.status === 200, `got ${r2.status}: ${JSON.stringify(r2.body).substring(0,100)}`);
    assert('response has file', typeof r2.body?.file === 'string');
    assert('response has topic', r2.body?.topic === 'model pricing comparison');
    assert('response has status', typeof r2.body?.status === 'string');

    // Verify file created
    if (r2.status === 200 && r2.body?.file) {
      const researchDir = path.join(HUB_ROOT, 'docs', 'intelligence-reports');
      const filePath = path.join(researchDir, r2.body.file);
      assert('intel research file created on disk', fs.existsSync(filePath), `path: ${filePath}`);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert('intel file has content', content.length > 50);
      }
    }
  }

  // ─── GROUP 5: Report content — multi-category findings ───────────────────
  console.log('\nTEST GROUP: Intelligence report — multi-category analysis');
  {
    const serverSrc = fs.readFileSync(path.join(HUB_ROOT, 'site-studio', 'server.js'), 'utf8');

    assert('generateIntelReport function defined', serverSrc.includes('function generateIntelReport('));
    assert('cost analysis in report', serverSrc.includes("category: 'cost'"));
    assert('mutation analysis in report', serverSrc.includes("category: 'mutations'"));
    assert('component analysis in report', serverSrc.includes("category: 'components'"));
    assert('agent analysis in report', serverSrc.includes("category: 'agents'"));
    assert('performance analysis in report', serverSrc.includes("category: 'performance'"));
    assert('reads agent-calls.jsonl', serverSrc.includes("agent-calls.jsonl") && serverSrc.includes('generateIntelReport'));
    assert('reads mutations.jsonl', serverSrc.includes("mutations.jsonl") && serverSrc.includes('generateIntelReport'));
    assert('reads library.json', serverSrc.includes("library.json") && serverSrc.includes('generateIntelReport'));
    assert('promotions written to intelligence-promotions.json', serverSrc.includes('intelligence-promotions.json'));
    assert('intel research written to docs/intelligence-reports', serverSrc.includes('intelligence-reports'));
  }

  // ─── GROUP 6: UI — Intel canvas tab ──────────────────────────────────────
  console.log('\nTEST GROUP: UI — Intelligence canvas tab');
  {
    const htmlSrc = fs.readFileSync(path.join(HUB_ROOT, 'site-studio', 'public', 'index.html'), 'utf8');

    assert('canvas-intel tab button exists', htmlSrc.includes("switchCanvasTab('intel')"));
    assert('canvas-intel pane exists', htmlSrc.includes('id="canvas-intel"'));
    assert('intel-findings-list div exists', htmlSrc.includes('id="intel-findings-list"'));
    assert('intel-run-btn button exists', htmlSrc.includes('id="intel-run-btn"'));
    assert('intel-summary div exists', htmlSrc.includes('id="intel-summary"'));
    assert('loadIntelReport function defined', htmlSrc.includes('async function loadIntelReport('));
    assert('renderIntelFindings function defined', htmlSrc.includes('function renderIntelFindings('));
    assert('promoteIntelFinding function defined', htmlSrc.includes('async function promoteIntelFinding('));
    assert('runIntelResearch function defined', htmlSrc.includes('async function runIntelResearch('));
    assert('intel-research-input exists', htmlSrc.includes('id="intel-research-input"'));
  }

  // ─── GROUP 7: CSS — Intel tab styles ─────────────────────────────────────
  console.log('\nTEST GROUP: CSS — Intelligence tab styles');
  {
    const cssSrc = fs.readFileSync(path.join(HUB_ROOT, 'site-studio', 'public', 'css', 'studio-canvas.css'), 'utf8');

    assert('.intel-finding styled', cssSrc.includes('.intel-finding'));
    assert('.intel-severity-critical styled', cssSrc.includes('.intel-severity-critical'));
    assert('.intel-severity-major styled', cssSrc.includes('.intel-severity-major'));
    assert('.intel-severity-minor styled', cssSrc.includes('.intel-severity-minor'));
    assert('.intel-severity-opportunity styled', cssSrc.includes('.intel-severity-opportunity'));
    assert('.intel-promote-btn styled', cssSrc.includes('.intel-promote-btn'));
    assert('#intel-summary styled', cssSrc.includes('#intel-summary'));
  }

  printResults();
}

function printResults() {
  console.log(`\n${'━'.repeat(45)}`);
  console.log(`Phase 5 Intelligence Results: ${pass} PASS | ${fail} FAIL | ${total} total`);
  console.log(`${'━'.repeat(45)}\n`);
  if (failures.length > 0) {
    console.log('Failures:');
    failures.forEach(f => console.log(`  ✗ ${f.name}${f.detail ? ` — ${f.detail}` : ''}`));
    console.log('');
  }
  const logDir = path.join(__dirname, 'automation', 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  fs.writeFileSync(
    path.join(logDir, 'phase5-intelligence-results.json'),
    JSON.stringify({ pass, fail, total, failures, timestamp: new Date().toISOString() }, null, 2)
  );
  console.log('Results saved to tests/automation/logs/phase5-intelligence-results.json');
  process.exit(fail > 0 ? 1 : 0);
}

runTests().catch(e => { console.error('Test runner crashed:', e.message); process.exit(1); });
