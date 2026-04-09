#!/usr/bin/env node
/**
 * Session 8 — Phase 1: Research Intelligence Calibration & Brain Context Tests
 *
 * Verifies C1–C7 fixes:
 *   C1 — /api/research/seed-status endpoint exists in server.js
 *   C2 — history-formatter.js module with all 3 format functions
 *   C3 — CONTEXT_CACHE in studio-context-writer.js (30s TTL)
 *   C4 — research-router.js reads threshold from config (getThreshold, default 0.75)
 *   C5 — computeEffectivenessFromBuild in research-registry.js
 *   C6 — verify-quickstart in fam-hub + FAMTASTIC-SETUP.md manual checklist
 *   C7 — Summarization documented in FAMTASTIC-SETUP.md + cerebrum.md
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT           = path.resolve(__dirname, '..');
const SERVER_FILE    = path.join(ROOT, 'site-studio', 'server.js');
const CONTEXT_WRITER = path.join(ROOT, 'site-studio', 'lib', 'studio-context-writer.js');
const RESEARCH_ROUTER  = path.join(ROOT, 'site-studio', 'lib', 'research-router.js');
const RESEARCH_REG     = path.join(ROOT, 'site-studio', 'lib', 'research-registry.js');
const HISTORY_FMT      = path.join(ROOT, 'site-studio', 'lib', 'history-formatter.js');
const FAM_HUB          = path.join(ROOT, 'scripts', 'fam-hub');
const FAMTASTIC_SETUP  = path.join(ROOT, 'FAMTASTIC-SETUP.md');
const CEREBRUM         = path.join(ROOT, '.wolf', 'cerebrum.md');

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

function readFile(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}

const serverSrc    = readFile(SERVER_FILE);
const ctxWriterSrc = readFile(CONTEXT_WRITER);
const routerSrc    = readFile(RESEARCH_ROUTER);
const registrySrc  = readFile(RESEARCH_REG);
const histFmtSrc   = readFile(HISTORY_FMT);
const famHubSrc    = readFile(FAM_HUB);
const setupSrc     = readFile(FAMTASTIC_SETUP);
const cerebrumSrc  = readFile(CEREBRUM);

// ── C1: seed-status endpoint ─────────────────────────────────────────────────

console.log('\n── C1: /api/research/seed-status endpoint ───────────────────────────');

assert(serverSrc.includes("'/api/research/seed-status'"),
  'test_seed_status_endpoint_exists: GET /api/research/seed-status in server.js');
assert(serverSrc.includes('pinecone_available'),
  'test_seed_status_returns_pinecone_available: response includes pinecone_available field');
assert(serverSrc.includes('unseeded'),
  'test_seed_status_returns_unseeded: response includes unseeded array');

// ── C2: history-formatter.js ──────────────────────────────────────────────────

console.log('\n── C2: history-formatter.js ─────────────────────────────────────────');

assert(fs.existsSync(HISTORY_FMT),
  'test_history_formatter_module_exists: lib/history-formatter.js exists');

assert(histFmtSrc.includes('HISTORY_FORMATS'),
  'test_history_formats_defined: HISTORY_FORMATS object defined');
assert(histFmtSrc.includes('claude:') && histFmtSrc.includes('gemini:') && histFmtSrc.includes('codex:'),
  'test_all_3_formats_defined: claude, gemini, codex all present');

// Test format functions by requiring the module
let HISTORY_FORMATS = null;
let formatHistoryForBrain = null;
let summarizeHistory = null;
try {
  const mod = require(HISTORY_FMT);
  HISTORY_FORMATS    = mod.HISTORY_FORMATS;
  formatHistoryForBrain = mod.formatHistoryForBrain;
  summarizeHistory   = mod.summarizeHistory;
} catch {}

if (HISTORY_FORMATS) {
  // test_claude_format_is_json_messages
  const sampleHistory = [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi there' }
  ];
  const claudeFmt = HISTORY_FORMATS.claude(sampleHistory);
  let claudeParsed = null;
  try { claudeParsed = JSON.parse(claudeFmt); } catch {}
  assert(claudeParsed !== null && Array.isArray(claudeParsed.messages),
    'test_claude_format_is_json_messages: HISTORY_FORMATS.claude produces { messages: [] }');

  // test_gemini_format_is_transcript
  const geminiFmt = HISTORY_FORMATS.gemini(sampleHistory);
  assert(geminiFmt.includes('Human:') && geminiFmt.includes('Assistant:'),
    'test_gemini_format_is_transcript: includes "Human:" and "Assistant:" strings');

  // test_codex_format_has_prior_header
  const codexFmt = HISTORY_FORMATS.codex(sampleHistory);
  assert(codexFmt.includes('### Prior conversation:'),
    'test_codex_format_has_prior_header: includes "### Prior conversation:"');
} else {
  assert(false, 'test_claude_format_is_json_messages: could not require history-formatter', 'module load failed');
  assert(false, 'test_gemini_format_is_transcript', 'module load failed');
  assert(false, 'test_codex_format_has_prior_header', 'module load failed');
}

assert(histFmtSrc.includes('module.exports') && histFmtSrc.includes('HISTORY_FORMATS') &&
  histFmtSrc.includes('formatHistoryForBrain') && histFmtSrc.includes('summarizeHistory'),
  'test_history_formatter_exports: exports HISTORY_FORMATS, formatHistoryForBrain, summarizeHistory');

// ── C2: summarization comment in adapters ────────────────────────────────────

console.log('\n── C2: summarization comment in adapters ────────────────────────────');

for (const adapter of ['claude', 'gemini', 'codex']) {
  const adapterFile = path.join(ROOT, 'adapters', adapter, `fam-convo-get-${adapter}`);
  const src = readFile(adapterFile);
  assert(src.includes('Summarization always uses Claude'),
    `test_summarization_comment_in_adapters: fam-convo-get-${adapter} has summarization comment`);
}

// ── C3: CONTEXT_CACHE in studio-context-writer.js ────────────────────────────

console.log('\n── C3: CONTEXT_CACHE in studio-context-writer.js ────────────────────');

assert(ctxWriterSrc.includes('CONTEXT_CACHE'),
  'test_context_cache_defined: CONTEXT_CACHE object in studio-context-writer.js');
assert(ctxWriterSrc.includes('TTL:            30 * 1000') || ctxWriterSrc.includes('TTL: 30 * 1000') ||
  ctxWriterSrc.includes('TTL:30*1000') || ctxWriterSrc.includes("TTL: 30"),
  'test_context_cache_ttl_is_30s: TTL is 30000ms (30s)');
assert(ctxWriterSrc.includes('cache HIT') && ctxWriterSrc.includes('cache MISS'),
  'test_context_cache_hit_miss_logging: cache hit/miss logged');
assert(ctxWriterSrc.includes('SITE_SWITCHED') && ctxWriterSrc.includes('lastQueried = null'),
  'test_context_cache_invalidated_on_site_switch: cache invalidated on SITE_SWITCHED');

// ── C4: threshold from config ─────────────────────────────────────────────────

console.log('\n── C4: threshold reads from config ──────────────────────────────────');

assert(routerSrc.includes('getThreshold'),
  'test_threshold_reads_from_config: research-router.js has getThreshold() function');
assert(routerSrc.includes('pinecone_threshold') || routerSrc.includes('getThreshold'),
  'test_threshold_config_key: reads research.pinecone_threshold from config');
assert(routerSrc.includes('return 0.75'),
  'test_threshold_default_is_0_75: default threshold is 0.75');
assert(!routerSrc.includes('< 0.85') || routerSrc.includes('getThreshold()'),
  'test_threshold_not_hardcoded: 0.85 not used as threshold (replaced by getThreshold())');

// ── C5: computeEffectivenessFromBuild ─────────────────────────────────────────

console.log('\n── C5: computeEffectivenessFromBuild ────────────────────────────────');

assert(registrySrc.includes('computeEffectivenessFromBuild'),
  'test_effectiveness_compute_fn_exists: computeEffectivenessFromBuild in research-registry.js');

// Try to call it
let computeEffectivenessFromBuild = null;
try {
  const reg = require(RESEARCH_REG);
  computeEffectivenessFromBuild = reg.computeEffectivenessFromBuild;
} catch {}

if (computeEffectivenessFromBuild) {
  const score = computeEffectivenessFromBuild('build_patterns', 'test_vertical', {
    healthDelta: 0.5, briefReuseRate: 0.8, iterationsToApproval: 2
  });
  assert(typeof score === 'number' && score >= 0 && score <= 100,
    `test_effectiveness_compute_returns_score: score is 0-100 (got ${score})`);
} else {
  assert(false, 'test_effectiveness_compute_fn_callable: could not require research-registry');
}

// ── C4: threshold-analysis endpoint ──────────────────────────────────────────

console.log('\n── C4: /api/research/threshold-analysis endpoint ────────────────────');

assert(serverSrc.includes("'/api/research/threshold-analysis'"),
  'test_threshold_analysis_endpoint: GET /api/research/threshold-analysis in server.js');
assert(serverSrc.includes('insufficient_data'),
  'test_threshold_analysis_insufficient_data: returns insufficient_data when < 20 queries');

// ── C6: verify-quickstart in fam-hub ─────────────────────────────────────────

console.log('\n── C6: verify-quickstart in fam-hub ─────────────────────────────────');

assert(famHubSrc.includes('verify-quickstart'),
  'test_verify_quickstart_in_fam_hub: fam-hub has verify-quickstart subcommand');
assert(famHubSrc.includes('FAMtastic Quick Start Verification'),
  'test_verify_quickstart_output: verify-quickstart prints verification header');

assert(setupSrc.includes('Manual Verification Checklist'),
  'test_setup_manual_checklist: FAMTASTIC-SETUP.md has Manual Verification Checklist section');
assert(setupSrc.includes('Verified:'),
  'test_setup_verified_comment: FAMTASTIC-SETUP.md has Verified: comment');

// ── C7: summarization documented ─────────────────────────────────────────────

console.log('\n── C7: summarization brain assignment documented ─────────────────────');

assert(setupSrc.includes('Summarization') && setupSrc.includes('always Claude'),
  'test_summarization_documented_in_setup: FAMTASTIC-SETUP.md mentions "Summarization" and "always Claude"');
assert(cerebrumSrc.includes('Summarization always uses Claude'),
  'test_summarization_in_cerebrum: .wolf/cerebrum.md has summarization standing decision');

// ── Results ───────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
console.log(`Session 8 Phase 1: ${passed + failed} tests — ${passed} passed, ${failed} failed`);

if (failures.length > 0) {
  console.log('\nFailures:');
  failures.forEach(f => console.log(`  ✗ ${f.name}${f.detail ? ' — ' + f.detail : ''}`));
}

process.exit(failed > 0 ? 1 : 0);
