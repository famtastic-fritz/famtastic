#!/usr/bin/env node
/**
 * Session 10 Phase 0 Tests — OpenAI SDK Integration + Brain Verifier
 *
 * 1.  test_openai_in_package_json        — openai listed in dependencies
 * 2.  test_codex_adapter_uses_sdk        — CodexAdapter uses SDK, not CLI
 * 3.  test_model_config_exists           — lib/model-config.json has claude/gemini/openai
 * 4.  test_api_cost_tracker_has_openai   — calculateCost('gpt-4o', ...) returns > 0
 * 5.  test_brain_verifier_exports        — all expected exports present
 * 6.  test_brain_status_endpoint_exists  — /api/brain-status route in server.js
 * 7.  test_verify_all_apis_runs          — verifyAllAPIs() returns object with expected keys
 * 8.  test_claude_status_connected       — claude.status === 'connected'
 * 9.  test_gemini_status_connected       — gemini.status === 'connected'
 * 10. test_openai_status_connected       — openai.status === 'connected'
 * 11. test_perplexity_trigger_documented — research-registry has perplexity + enableCondition
 * 12. test_codex_adapter_no_spawn_main_path — old CLI path removed, openai required
 */

'use strict';

// API keys must be set in the shell environment before running these tests.
// Source ~/.zshrc or export ANTHROPIC_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY.
// Tests 7-10 will be skipped with a warning if keys are not present.
if (!process.env.ANTHROPIC_API_KEY) console.warn('[test] ANTHROPIC_API_KEY not set — live API tests will skip');
if (!process.env.GEMINI_API_KEY)    console.warn('[test] GEMINI_API_KEY not set — live Gemini test will skip');
if (!process.env.OPENAI_API_KEY)    console.warn('[test] OPENAI_API_KEY not set — live OpenAI test will skip');

const fs   = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT   = path.join(__dirname, '..');
const LIB    = path.join(ROOT, 'site-studio/lib');
const SERVER = path.join(ROOT, 'site-studio/server.js');

let passed = 0;
let failed = 0;

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

// ─── 1: openai in package.json ────────────────────────────────────────────────
console.log('
── 1: openai in package.json ──');
{
  const pkgPath = path.join(ROOT, 'site-studio/package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  check(
    'package.json lists openai dependency',
    !!pkg.dependencies?.openai,
    `openai not found — dependencies: ${JSON.stringify(Object.keys(pkg.dependencies || {}))}`
  );
}

// ─── 2: CodexAdapter uses SDK ─────────────────────────────────────────────────
console.log('
── 2: CodexAdapter uses OpenAI SDK ──');
{
  const codexPath = path.join(LIB, 'adapters/codex-adapter.js');
  const codexText = fs.readFileSync(codexPath, 'utf8');
  let adapter;
  try { adapter = require(codexPath); } catch (e) { adapter = null; }

  check(
    'CodexAdapter file exists',
    fs.existsSync(codexPath)
  );
  check(
    'CodexAdapter requires openai package',
    codexText.includes("require('openai')")
  );
  check(
    'capabilities.multiTurn === true',
    adapter && new adapter.CodexAdapter().capabilities.multiTurn === true,
    'multiTurn should be true for SDK adapter'
  );
  check(
    'capabilities.streaming === true',
    adapter && new adapter.CodexAdapter().capabilities.streaming === true,
    'streaming should be true for SDK adapter'
  );
}

// ─── 3: model-config.json exists and has required keys ───────────────────────
console.log('
── 3: lib/model-config.json ──');
{
  const configPath = path.join(LIB, 'model-config.json');
  check('model-config.json exists', fs.existsSync(configPath));

  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    check('claude key present', !!config.claude, 'missing claude');
    check('gemini key present', !!config.gemini, 'missing gemini');
    check('openai key present', !!config.openai, 'missing openai');
    check('claude.provider === anthropic', config.claude?.provider === 'anthropic');
    check('openai.model === gpt-4o', config.openai?.model === 'gpt-4o');
  }
}

// ─── 4: api-cost-tracker has OpenAI rates ────────────────────────────────────
console.log('
── 4: api-cost-tracker OpenAI rates ──');
{
  const trackerPath = path.join(LIB, 'api-cost-tracker.js');
  const tracker = require(trackerPath);
  const cost4o = tracker.calculateCost('gpt-4o', 1000, 1000);
  const costMini = tracker.calculateCost('gpt-4o-mini', 1000, 1000);

  check(
    'calculateCost("gpt-4o", 1000, 1000) > 0',
    cost4o > 0,
    `got ${cost4o}`
  );
  check(
    'calculateCost("gpt-4o-mini", 1000, 1000) > 0',
    costMini > 0,
    `got ${costMini}`
  );
  check(
    'gpt-4o-mini costs less than gpt-4o',
    costMini < cost4o,
    `mini=${costMini} 4o=${cost4o}`
  );
}

// ─── 5: brain-verifier exports ───────────────────────────────────────────────
console.log('
── 5: brain-verifier exports ──');
{
  const verifierPath = path.join(LIB, 'brain-verifier.js');
  check('brain-verifier.js exists', fs.existsSync(verifierPath));

  if (fs.existsSync(verifierPath)) {
    const verifier = require(verifierPath);
    check('verifyAllAPIs exported', typeof verifier.verifyAllAPIs === 'function');
    check('getBrainStatus exported', typeof verifier.getBrainStatus === 'function');
    check('verifyClaudeAPI exported', typeof verifier.verifyClaudeAPI === 'function');
    check('verifyGeminiAPI exported', typeof verifier.verifyGeminiAPI === 'function');
    check('verifyOpenAIAPI exported', typeof verifier.verifyOpenAIAPI === 'function');
  }
}

// ─── 6: /api/brain-status endpoint in server.js ──────────────────────────────
console.log('
── 6: /api/brain-status in server.js ──');
{
  const serverText = fs.readFileSync(SERVER, 'utf8');
  check(
    "server.js contains '/api/brain-status' route",
    serverText.includes("'/api/brain-status'"),
    'route not found in server.js'
  );
  check(
    'server.js requires brain-verifier',
    serverText.includes('brain-verifier'),
    'brain-verifier not required'
  );
  check(
    'server.js calls verifyAllAPIs()',
    serverText.includes('verifyAllAPIs()'),
    'verifyAllAPIs call not found'
  );
}

// ─── 7–10: Live API verification ─────────────────────────────────────────────
console.log('
── 7–10: Live API verification (real network calls) ──');

async function runLiveTests() {
  // Use a fresh require (module may already be loaded but _results may be stale)
  // Re-require with a fresh module cache entry by deleting and re-requiring
  const verifierPath = path.join(LIB, 'brain-verifier.js');
  // Clear cached module to force fresh _results state
  delete require.cache[require.resolve(verifierPath)];
  const { verifyAllAPIs } = require(verifierPath);

  console.log('  [running verifyAllAPIs() — may take 5-15s]');
  let results;
  try {
    results = await verifyAllAPIs();
  } catch (e) {
    check('verifyAllAPIs() completes without throwing', false, e.message);
    return;
  }

  // 7: returns object with expected keys
  check(
    'verifyAllAPIs() returns object with claude/gemini/openai/codex keys',
    results && typeof results === 'object' && 'claude' in results && 'gemini' in results && 'openai' in results && 'codex' in results,
    `keys: ${Object.keys(results || {}).join(', ')}`
  );

  // 8: claude connected
  check(
    "claude.status === 'connected'",
    results?.claude?.status === 'connected',
    `got status: ${results?.claude?.status}, error: ${results?.claude?.error}`
  );

  // 9: gemini connected
  check(
    "gemini.status === 'connected'",
    results?.gemini?.status === 'connected',
    `got status: ${results?.gemini?.status}, error: ${results?.gemini?.error}`
  );

  // 10: openai connected
  check(
    "openai.status === 'connected'",
    results?.openai?.status === 'connected',
    `got status: ${results?.openai?.status}, error: ${results?.openai?.error}`
  );

  console.log(`
  API verification summary:`);
  console.log(`    claude:  ${results.claude.status} — model: ${results.claude.model || 'n/a'}`);
  console.log(`    gemini:  ${results.gemini.status} — model: ${results.gemini.model || 'n/a'}`);
  console.log(`    openai:  ${results.openai.status} — model: ${results.openai.model || 'n/a'}`);
  console.log(`    codex:   ${results.codex.status} — ${results.codex.note || results.codex.error || 'n/a'}`);
}

// ─── 11: Perplexity trigger documented ───────────────────────────────────────
console.log('
── 11: Perplexity trigger in research-registry.js ──');
{
  const registryPath = path.join(LIB, 'research-registry.js');
  const registryText = fs.readFileSync(registryPath, 'utf8').toLowerCase();
  check(
    'research-registry.js contains perplexity',
    registryText.includes('perplexity'),
    'perplexity not found in research-registry.js'
  );

  const registryFull = fs.readFileSync(registryPath, 'utf8');
  check(
    'perplexity has enableCondition defined',
    registryFull.includes('enableCondition'),
    'enableCondition not found'
  );
  check(
    'perplexity status is disabled by default',
    registryFull.includes("status: 'disabled'"),
    'expected status: disabled'
  );
  console.log('  [perplexity status] disabled by default — gated by enableCondition:');
  console.log('  "vertical not in Pinecone AND no manual research exists"');
  console.log('  research-router.js triggers perplexity only when options.enablePerplexity === true');
  console.log('  and PERPLEXITY_API_KEY is set. Currently: NOT triggered automatically for new verticals.');
}

// ─── 12: CodexAdapter no old CLI path ────────────────────────────────────────
console.log('
── 12: CodexAdapter — old CLI path removed ──');
{
  const codexPath = path.join(LIB, 'adapters/codex-adapter.js');
  const codexText = fs.readFileSync(codexPath, 'utf8');
  check(
    'codex-adapter does NOT reference fam-convo-get-codex',
    !codexText.includes('fam-convo-get-codex'),
    'old CLI path still present'
  );
  check(
    "codex-adapter requires('openai')",
    codexText.includes("require('openai')"),
    'openai SDK not required'
  );
  check(
    'codex-adapter does NOT use spawn() for main path',
    !codexText.includes('spawn(adapterPath') && !codexText.includes("spawn(adapterPath,"),
    'still spawning old adapter path'
  );
}

// ─── Run async tests then report ─────────────────────────────────────────────
runLiveTests().then(() => {
  console.log('
' + '─'.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
  if (failed > 0) {
    console.log('
⚠️  Some tests failed — see details above.');
    process.exit(1);
  } else {
    console.log('
✅ All tests passed.');
  }
}).catch(e => {
  console.error('Unexpected error in test runner:', e.message);
  process.exit(1);
});
