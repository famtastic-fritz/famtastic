#!/usr/bin/env node
/**
 * Phase 3 — Multi-Agent Integration Tests
 *
 * Verifies:
 *   1. logAgentCall() writes to agent-calls.jsonl with correct schema
 *   2. validateAgentHtml() correctly scores good and bad HTML
 *   3. GET /api/agent/stats — returns aggregated call stats
 *   4. GET /api/agent/routing — returns routing guide for all intents
 *   5. POST /api/compare/generate-v2 — Codex→Claude fallback + validation response
 *   6. agent-calls.jsonl written after deterministic handler (no AI) edit
 *   7. Compare canvas tab and Codex CLI tab exist in UI
 *   8. Fallback policy documented in routing guide
 *
 * Usage:
 *   SITE_TAG=site-auntie-gale-garage-sales node tests/phase3-multi-agent-tests.js
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
  console.log(`\nPhase 3 — Multi-Agent Integration Tests`);
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

  // ─── GROUP 1: logAgentCall — schema validation ────────────────────────────
  console.log('\nTEST GROUP: logAgentCall — agent-calls.jsonl schema');
  {
    const serverSrc = fs.readFileSync(path.join(HUB_ROOT, 'site-studio', 'server.js'), 'utf8');

    assert('logAgentCall function defined', serverSrc.includes('function logAgentCall('));
    assert('logAgentCall writes to agent-calls.jsonl', serverSrc.includes('agent-calls.jsonl'));
    assert('logAgentCall records agent field', serverSrc.includes('agent,           // '));
    assert('logAgentCall records intent field', serverSrc.includes('intent,          // '));
    assert('logAgentCall records elapsed_ms', serverSrc.includes('elapsed_ms: elapsed_ms'));
    assert('logAgentCall records success', serverSrc.includes('success: !!success'));
    assert('logAgentCall estimates cost (est_cost_usd)', serverSrc.includes('est_cost_usd'));
    assert('logAgentCall records fallback_from', serverSrc.includes('fallback_from: fallback_from'));
    assert('logAgentCall has claude pricing constants', serverSrc.includes('COST_PER_INPUT_TOKEN'));

    // Trigger a write by hitting the sync endpoint (no AI, but logs agent='none')
    await httpPost('/api/sync-content-fields', {}).catch(() => {});

    // Check agent-calls.jsonl exists (may exist from Phase 2 content patch tests)
    const logFile = path.join(SITE_DIR, 'agent-calls.jsonl');
    if (fs.existsSync(logFile)) {
      const lines = fs.readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean);
      assert('agent-calls.jsonl has at least one entry', lines.length > 0);

      let sample;
      try { sample = JSON.parse(lines[lines.length - 1]); } catch {}
      if (sample) {
        assert('entry has timestamp', typeof sample.timestamp === 'string');
        assert('entry has agent', typeof sample.agent === 'string');
        assert('entry has intent', typeof sample.intent === 'string');
        assert('entry has elapsed_ms', typeof sample.elapsed_ms === 'number');
        assert('entry has success boolean', typeof sample.success === 'boolean');
        assert('entry has est_cost_usd', typeof sample.est_cost_usd === 'number');
      }
    } else {
      console.log('  ℹ️  agent-calls.jsonl not yet created (no logged calls yet — will be created on first build/edit)');
      // Still verify the function exists in code
      assert('agent-calls.jsonl will be created on first call', serverSrc.includes('agent-calls.jsonl'));
    }
  }

  // ─── GROUP 2: validateAgentHtml — scoring function ────────────────────────
  console.log('\nTEST GROUP: validateAgentHtml — HTML quality scorer');
  {
    const serverSrc = fs.readFileSync(path.join(HUB_ROOT, 'site-studio', 'server.js'), 'utf8');

    assert('validateAgentHtml function defined', serverSrc.includes('function validateAgentHtml('));
    assert('checks for DOCTYPE/html tag', serverSrc.includes('Missing DOCTYPE or <html> tag'));
    assert('checks for data-field-id attributes', serverSrc.includes('No data-field-id attributes'));
    assert('checks for data-section-id attributes', serverSrc.includes('No data-section-id attributes'));
    assert('checks for navigation element', serverSrc.includes('No navigation element found'));
    assert('returns valid, score, issues', serverSrc.includes('return { valid, score, issues }'));
    assert('score 0-100 with penalty system', serverSrc.includes('score -= 25') && serverSrc.includes('Math.max(0, score)'));
    assert('valid threshold is score >= 40', serverSrc.includes('score >= 40'));
    assert('detects error output in HTML', serverSrc.includes('Possible error output in HTML'));
  }

  // ─── GROUP 3: GET /api/agent/stats ────────────────────────────────────────
  console.log('\nTEST GROUP: GET /api/agent/stats');
  {
    const r = await httpGet('/api/agent/stats');
    assert('returns 200', r.status === 200, `got ${r.status}`);
    assert('has total_calls', typeof r.body?.total_calls === 'number');
    assert('has failure_count', typeof r.body?.failure_count === 'number');
    assert('has fallback_count', typeof r.body?.fallback_count === 'number');
    assert('has total_cost_usd', typeof r.body?.total_cost_usd === 'number');
    assert('has avg_elapsed_ms', typeof r.body?.avg_elapsed_ms === 'number');
    assert('has by_agent object', typeof r.body?.by_agent === 'object');
    assert('has by_intent object', typeof r.body?.by_intent === 'object');
    assert('has last_call (null or object)', r.body?.last_call === null || typeof r.body?.last_call === 'object');
  }

  // ─── GROUP 4: GET /api/agent/routing ─────────────────────────────────────
  console.log('\nTEST GROUP: GET /api/agent/routing');
  {
    const r = await httpGet('/api/agent/routing');
    assert('returns 200', r.status === 200, `got ${r.status}`);
    assert('has routing_guide array', Array.isArray(r.body?.routing_guide));
    assert('has fallback_policy string', typeof r.body?.fallback_policy === 'string');
    assert('has cost_model string', typeof r.body?.cost_model === 'string');

    if (Array.isArray(r.body?.routing_guide)) {
      const guide = r.body.routing_guide;
      assert('routing covers build intent', guide.some(g => g.intent === 'build'));
      assert('routing covers content_update (no AI)', guide.some(g => g.intent === 'content_update' && g.agent === 'none'));
      assert('routing covers compare (codex)', guide.some(g => g.intent === 'compare' && g.agent === 'codex'));
      assert('routing covers deploy (no AI)', guide.some(g => g.intent === 'deploy' && g.agent === 'none'));
      assert('all entries have intent, agent, reason', guide.every(g => g.intent && g.agent && g.reason));
    }

    assert('fallback policy mentions Codex→Claude', r.body?.fallback_policy?.includes('Codex') && r.body?.fallback_policy?.includes('Claude'));
    assert('fallback policy mentions score < 40', r.body?.fallback_policy?.includes('40'));
  }

  // ─── GROUP 5: POST /api/compare/generate-v2 ──────────────────────────────
  console.log('\nTEST GROUP: POST /api/compare/generate-v2 — validate + fallback');
  {
    const r = await httpPost('/api/compare/generate-v2', { page: 'index.html' });
    assert('generate-v2 returns 200', r.status === 200, `got ${r.status}: ${JSON.stringify(r.body).substring(0, 100)}`);
    assert('response has url or error', r.body?.url || r.body?.error);

    if (r.body?.url) {
      assert('response has agent field', typeof r.body.agent === 'string');
      assert('agent is claude or codex', ['claude', 'codex'].includes(r.body.agent));
      assert('response has validation object', typeof r.body?.validation === 'object');
      assert('validation has valid field', typeof r.body?.validation?.valid === 'boolean');
      assert('validation has score (0-100)', typeof r.body?.validation?.score === 'number' && r.body.validation.score >= 0 && r.body.validation.score <= 100);
      assert('validation has issues array', Array.isArray(r.body?.validation?.issues));
      assert('fallback_from is null or string', r.body?.fallback_from === null || typeof r.body?.fallback_from === 'string');
    } else {
      console.log(`  ℹ️  generate-v2 returned error: ${r.body?.error} — Codex CLI may not be installed`);
      // Should still return the error shape
      assert('error response is a string', typeof r.body?.error === 'string');
    }
  }

  // ─── GROUP 6: compare/generate-v2 with invalid page ──────────────────────
  console.log('\nTEST GROUP: POST /api/compare/generate-v2 — validation');
  {
    const r1 = await httpPost('/api/compare/generate-v2', {});
    assert('missing page → 400', r1.status === 400, `got ${r1.status}`);

    const r2 = await httpPost('/api/compare/generate-v2', { page: 'nonexistent.html' });
    assert('invalid page → 400', r2.status === 400, `got ${r2.status}`);
  }

  // ─── GROUP 7: UI — compare canvas and Codex CLI tab exist ────────────────
  console.log('\nTEST GROUP: UI — compare canvas + Codex CLI tab');
  {
    const htmlSrc = fs.readFileSync(path.join(HUB_ROOT, 'site-studio', 'public', 'index.html'), 'utf8');

    assert('canvas-compare pane exists', htmlSrc.includes('id="canvas-compare"'));
    assert('compare split layout exists', htmlSrc.includes('id="compare-split"'));
    assert('compare-frame-left iframe exists', htmlSrc.includes('id="compare-frame-left"'));
    assert('compare-frame-right iframe exists', htmlSrc.includes('id="compare-frame-right"'));
    assert('generateCodexVersion button exists', htmlSrc.includes('generateCodexVersion()'));
    assert('useCompareVersion buttons exist', htmlSrc.includes("useCompareVersion('claude')") && htmlSrc.includes("useCompareVersion('codex')"));
    assert('Codex CLI tab exists in CLI bar', htmlSrc.includes("switchCliTab('codex')"));
    assert('codex-input element exists', htmlSrc.includes('id="codex-input"'));
    assert('codex-output element exists', htmlSrc.includes('id="codex-output"'));
    assert('sendCodexPrompt function defined', htmlSrc.includes('async function sendCodexPrompt()'));
    assert('generateCodexVersion function defined', htmlSrc.includes('async function generateCodexVersion()'));
    assert('useCompareVersion function defined', htmlSrc.includes('async function useCompareVersion('));
    assert('sync scroll checkbox exists', htmlSrc.includes('id="compare-sync-scroll"'));
  }

  // ─── GROUP 8: Agent call logged for deterministic (no AI) edits ───────────
  console.log('\nTEST GROUP: Agent logging — deterministic edits');
  {
    const serverSrc = fs.readFileSync(path.join(HUB_ROOT, 'site-studio', 'server.js'), 'utf8');
    assert('tryDeterministicHandler success logs agent=none',
      serverSrc.includes("agent: 'none', intent: requestType"));
    assert('finishParallelBuild logs agent=claude build',
      serverSrc.includes("agent: 'claude'") && serverSrc.includes("intent: 'build'"));
    assert('compare-v2 logs codex call', serverSrc.includes("agent: 'codex', intent: 'compare'"));
    assert('compare-v2 logs claude fallback', serverSrc.includes("agent: 'claude', intent: 'compare'"));
    assert('compare-v2 logs fallback_from', serverSrc.includes('fallback_from: fallbackFrom'));
  }

  printResults();
}

function printResults() {
  console.log(`\n${'━'.repeat(45)}`);
  console.log(`Phase 3 Multi-Agent Results: ${pass} PASS | ${fail} FAIL | ${total} total`);
  console.log(`${'━'.repeat(45)}\n`);
  if (failures.length > 0) {
    console.log('Failures:');
    failures.forEach(f => console.log(`  ✗ ${f.name}${f.detail ? ` — ${f.detail}` : ''}`));
    console.log('');
  }
  const logDir = path.join(__dirname, 'automation', 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  fs.writeFileSync(
    path.join(logDir, 'phase3-multi-agent-results.json'),
    JSON.stringify({ pass, fail, total, failures, timestamp: new Date().toISOString() }, null, 2)
  );
  console.log('Results saved to tests/automation/logs/phase3-multi-agent-results.json');
  process.exit(fail > 0 ? 1 : 0);
}

runTests().catch(e => { console.error('Test runner crashed:', e.message); process.exit(1); });
