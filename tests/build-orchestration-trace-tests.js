'use strict';
/**
 * build-orchestration-trace-tests.js
 * Tests for: run-id, build-trace, fulfillment-ledger, gap-logger (new types), db agent_performance + trace_events.
 */

const assert = require('assert');
const path   = require('path');
const fs     = require('fs');
const os     = require('os');

// ── helpers ────────────────────────────────────────────────────────────────

const SITE_STUDIO = path.join(__dirname, '..', 'site-studio');
const LIB = path.join(SITE_STUDIO, 'lib');

function loadModule(name) {
  return require(path.join(LIB, name));
}

let passed = 0;
let failed = 0;
const failures = [];

function test(label, fn) {
  try {
    fn();
    console.log(`  ✓ ${label}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${label}`);
    console.error(`    ${err.message}`);
    failed++;
    failures.push({ label, error: err.message });
  }
}

// ── 1. run-id ──────────────────────────────────────────────────────────────

console.log('\n[run-id]');

test('generateRunId returns string matching run_<ts>_<hex>', () => {
  const { generateRunId } = loadModule('run-id');
  const id = generateRunId();
  assert.ok(typeof id === 'string', 'must be string');
  assert.ok(/^run_\d+_[0-9a-f]{4}$/.test(id), `unexpected format: ${id}`);
});

test('generateTraceId returns run_id.step_NN', () => {
  const { generateRunId, generateTraceId } = loadModule('run-id');
  const runId = generateRunId();
  const traceId = generateTraceId(runId, 3);
  assert.ok(traceId.startsWith(runId + '.step_'), 'must start with run_id.step_');
  assert.ok(traceId.endsWith('03'), 'step number zero-padded to 2 digits');
});

test('createRunContext increments step counter', () => {
  const { createRunContext } = loadModule('run-id');
  const run = createRunContext();
  const t1 = run.nextTraceId();
  const t2 = run.nextTraceId();
  const t3 = run.nextTraceId();
  assert.ok(t1.endsWith('.step_01'), `expected .step_01, got ${t1}`);
  assert.ok(t2.endsWith('.step_02'), `expected .step_02, got ${t2}`);
  assert.ok(t3.endsWith('.step_03'), `expected .step_03, got ${t3}`);
  assert.strictEqual(run.currentStep(), 3);
});

test('createRunContext accepts explicit runId', () => {
  const { createRunContext } = loadModule('run-id');
  const run = createRunContext('run_custom_id');
  assert.strictEqual(run.runId, 'run_custom_id');
});

// ── 2. build-trace ─────────────────────────────────────────────────────────

console.log('\n[build-trace]');

const tmpTraceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fam-trace-test-'));
const fakeSiteTag = 'test-site-trace';
const fakeSiteDir = path.join(tmpTraceDir, 'sites', fakeSiteTag);
fs.mkdirSync(fakeSiteDir, { recursive: true });

test('logTrace writes valid JSONL to sites/<tag>/build-trace.jsonl', () => {
  const { logTrace } = loadModule('build-trace');
  const { generateRunId, generateTraceId } = loadModule('run-id');
  const runId = generateRunId();
  const traceId = generateTraceId(runId, 1);

  const result = logTrace({
    trace_id:      traceId,
    run_id:        runId,
    site_tag:      fakeSiteTag,
    phase:         'classification',
    step_id:       'test_step',
    selected_path: 'layout_update',
    cost_type:     'zero_token',
    status:        'completed',
  }, tmpTraceDir);

  assert.ok(result, 'logTrace must return the entry');
  assert.strictEqual(result.trace_id, traceId);
  assert.strictEqual(result.phase, 'classification');

  const logPath = path.join(fakeSiteDir, 'build-trace.jsonl');
  assert.ok(fs.existsSync(logPath), 'build-trace.jsonl must exist');
  const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean);
  assert.ok(lines.length >= 1, 'at least one line written');
  const parsed = JSON.parse(lines[lines.length - 1]);
  assert.strictEqual(parsed.trace_id, traceId);
  assert.strictEqual(parsed.run_id, runId);
  assert.strictEqual(parsed.cost_type, 'zero_token');
});

test('logTrace fills default fields', () => {
  const { logTrace } = loadModule('build-trace');
  const { generateRunId, generateTraceId } = loadModule('run-id');
  const runId = generateRunId();
  const traceId = generateTraceId(runId, 2);

  const result = logTrace({ trace_id: traceId, run_id: runId, phase: 'routing' }, tmpTraceDir);
  assert.strictEqual(result.agent, 'orchestrator', 'default agent is orchestrator');
  assert.strictEqual(result.cost_type, 'zero_token',  'default cost_type is zero_token');
  assert.strictEqual(result.status, 'completed',      'default status is completed');
  assert.ok(Array.isArray(result.gaps), 'gaps defaults to array');
});

test('logTrace warns and returns safely on missing required fields', () => {
  const { logTrace } = loadModule('build-trace');
  // Missing trace_id — should not throw, return the input
  const result = logTrace({ run_id: 'x', phase: 'test' }, tmpTraceDir);
  assert.ok(result, 'must return something even with missing trace_id');
});

test('getRunTrace returns events for a specific run', () => {
  const { logTrace, getRunTrace } = loadModule('build-trace');
  const { generateRunId, generateTraceId } = loadModule('run-id');
  const runId = generateRunId();

  logTrace({ trace_id: generateTraceId(runId, 1), run_id: runId, site_tag: fakeSiteTag, phase: 'build' }, tmpTraceDir);
  logTrace({ trace_id: generateTraceId(runId, 2), run_id: runId, site_tag: fakeSiteTag, phase: 'verification' }, tmpTraceDir);

  const events = getRunTrace(fakeSiteTag, runId, tmpTraceDir);
  assert.ok(events.length >= 2, `expected >=2 events, got ${events.length}`);
  assert.ok(events.every(e => e.run_id === runId), 'all events must match run_id');
});

// ── 3. fulfillment-ledger ──────────────────────────────────────────────────

console.log('\n[fulfillment-ledger]');

const tmpLedgerDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fam-ledger-test-'));
const fakeLedgerTag = 'test-site-ledger';
const fakeLedgerDir = path.join(tmpLedgerDir, 'sites', fakeLedgerTag);
fs.mkdirSync(fakeLedgerDir, { recursive: true });

test('createLedger returns valid open ledger', () => {
  const { createLedger } = loadModule('fulfillment-ledger');
  const ledger = createLedger('run_abc', 'test-site', 'Build me a pizza site');
  assert.strictEqual(ledger.run_id, 'run_abc');
  assert.strictEqual(ledger.site_tag, 'test-site');
  assert.strictEqual(ledger.status, 'open');
  assert.ok(Array.isArray(ledger.items), 'items must be array');
  assert.strictEqual(ledger.items.length, 0);
});

test('addFulfillmentItem adds to ledger.items', () => {
  const { createLedger, addFulfillmentItem, FULFILLMENT_STATUS, DETECTED_TYPES } = loadModule('fulfillment-ledger');
  const ledger = createLedger('run_add', 'site', 'test request');

  const item = addFulfillmentItem(ledger, {
    requested_capability: 'virtual assistant',
    detected_type: DETECTED_TYPES.COMPONENT,
    status: FULFILLMENT_STATUS.DEFERRED,
    completed_now: ['base section'],
    deferred: ['assistant component'],
    jobs: [{ workspace: 'Component Studio', job_type: 'build_assistant' }],
    reason: 'Specialized component needed',
  });

  assert.strictEqual(ledger.items.length, 1);
  assert.ok(item.id, 'item must have an id');
  assert.strictEqual(item.status, FULFILLMENT_STATUS.DEFERRED);
  assert.strictEqual(item.requested_capability, 'virtual assistant');
});

test('finalizeLedger computes correct summary', () => {
  const { createLedger, addFulfillmentItem, finalizeLedger, FULFILLMENT_STATUS } = loadModule('fulfillment-ledger');
  const ledger = createLedger('run_fin', fakeLedgerTag, 'test');

  addFulfillmentItem(ledger, { status: FULFILLMENT_STATUS.COMPLETED, requested_capability: 'homepage' });
  addFulfillmentItem(ledger, { status: FULFILLMENT_STATUS.PLACEHOLDER, requested_capability: 'hero image', gaps: ['specialized_asset_needed'] });
  addFulfillmentItem(ledger, { status: FULFILLMENT_STATUS.DEFERRED, requested_capability: 'booking system', jobs: [{ workspace: 'Component Studio', job_type: 'booking' }] });

  finalizeLedger(ledger, tmpLedgerDir);

  assert.strictEqual(ledger.status, 'finalized');
  assert.ok(ledger.finalized_at, 'finalized_at must be set');
  assert.strictEqual(ledger.summary.total_items, 3);
  assert.strictEqual(ledger.summary.completed, 1);
  assert.strictEqual(ledger.summary.placeholder, 1);
  assert.strictEqual(ledger.summary.deferred, 1);
  assert.strictEqual(ledger.summary.jobs_created, 1);
  assert.strictEqual(ledger.summary.gaps_logged, 1);
});

test('finalizeLedger writes JSON file to disk', () => {
  const { createLedger, finalizeLedger } = loadModule('fulfillment-ledger');
  const ledger = createLedger('run_disk', fakeLedgerTag, 'disk test');
  finalizeLedger(ledger, tmpLedgerDir);

  const outPath = path.join(fakeLedgerDir, 'fulfillment-run_disk.json');
  assert.ok(fs.existsSync(outPath), `ledger file must exist at ${outPath}`);
  const data = JSON.parse(fs.readFileSync(outPath, 'utf8'));
  assert.strictEqual(data.run_id, 'run_disk');
});

test('readLedger returns the ledger for a specific runId', () => {
  const { createLedger, finalizeLedger, readLedger } = loadModule('fulfillment-ledger');
  const ledger = createLedger('run_read', fakeLedgerTag, 'read test');
  finalizeLedger(ledger, tmpLedgerDir);

  const result = readLedger(fakeLedgerTag, tmpLedgerDir, 'run_read');
  assert.ok(result, 'readLedger must return the ledger');
  assert.strictEqual(result.run_id, 'run_read');
});

// ── 4. gap-logger enhanced types ───────────────────────────────────────────

console.log('\n[gap-logger — enhanced types]');

test('GAP_CATEGORIES includes all build-orchestration types', () => {
  const { GAP_CATEGORIES } = loadModule('gap-logger');
  const required = [
    'unfulfilled_request', 'placeholder_used', 'specialized_asset_needed',
    'component_needed', 'integration_needed', 'design_uncertainty',
    'provider_failure', 'verification_failure', 'agent_weakness',
    'prompt_pattern', 'missing_capability',
  ];
  for (const t of required) {
    assert.ok(Object.values(GAP_CATEGORIES).includes(t), `GAP_CATEGORIES must include "${t}"`);
  }
});

test('GAP_DESTINATION maps all gap categories to workspace strings', () => {
  const { GAP_CATEGORIES, GAP_DESTINATION } = loadModule('gap-logger');
  const categories = Object.values(GAP_CATEGORIES);
  for (const cat of categories) {
    assert.ok(GAP_DESTINATION[cat], `GAP_DESTINATION must have entry for "${cat}"`);
    assert.ok(typeof GAP_DESTINATION[cat] === 'string', `destination for "${cat}" must be a string`);
  }
});

test('logGap adds destination field to gap entry', () => {
  // Use a temp GAPS_PATH by monkeypatching env — just test the returned entry shape
  const { logGap, GAP_CATEGORIES } = loadModule('gap-logger');
  const entry = logGap(
    'test-site',
    'User asked for a virtual assistant character',
    GAP_CATEGORIES.SPECIALIZED_ASSET_NEEDED,
    { run_id: 'run_test123' }
  );
  assert.ok(entry, 'logGap must return an entry');
  assert.ok(entry.destination, 'entry must have destination');
  assert.strictEqual(entry.failure_category, 'specialized_asset_needed');
  assert.strictEqual(entry.run_id, 'run_test123');
});

// ── 5. db — agent_performance + trace_events schema ────────────────────────

console.log('\n[db — agent_performance + trace_events]');

// Use in-memory DB for schema tests
let testDb;
try {
  const dbMod = require(path.join(LIB, 'db'));
  testDb = dbMod._createTestDb();
} catch (err) {
  console.warn('  (db not available for schema tests — skipping):', err.message);
}

if (testDb) {
  test('trace_events table exists in schema', () => {
    const tables = testDb.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='trace_events'"
    ).all();
    assert.strictEqual(tables.length, 1, 'trace_events table must exist');
  });

  test('agent_performance table exists in schema', () => {
    const tables = testDb.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='agent_performance'"
    ).all();
    assert.strictEqual(tables.length, 1, 'agent_performance table must exist');
  });

  test('db.logAgentPerformance inserts a row', () => {
    const dbMod = require(path.join(LIB, 'db'));
    dbMod.logAgentPerformance({
      id:                  'test-perf-001',
      agent:               'parallel_builder',
      tool:                'parallelBuild',
      provider:            'anthropic',
      model:               'claude-sonnet-4-6',
      task_type:           'multi_page_build',
      site_tag:            'test-site',
      run_id:              'run_test_perf',
      status:              'completed',
      duration_ms:         12000,
      cost_usd:            0.042,
      input_tokens:        8000,
      output_tokens:       3000,
      verification_passed: true,
    });
    const row = testDb.prepare("SELECT * FROM agent_performance WHERE id = 'test-perf-001'").get();
    assert.ok(row, 'row must exist');
    assert.strictEqual(row.agent, 'parallel_builder');
    assert.strictEqual(row.verification_passed, 1);
    assert.ok(Math.abs(row.cost_usd - 0.042) < 0.0001);
  });

  test('db.getAgentPerformance returns rows', () => {
    const dbMod = require(path.join(LIB, 'db'));
    const rows = dbMod.getAgentPerformance({ agent: 'parallel_builder' });
    assert.ok(Array.isArray(rows), 'must return array');
    assert.ok(rows.length >= 1, 'must have at least the row we inserted');
  });

  test('db.getAgentScorecard aggregates correctly', () => {
    const dbMod = require(path.join(LIB, 'db'));
    // Insert a failed run too
    dbMod.logAgentPerformance({
      id: 'test-perf-002', agent: 'parallel_builder', task_type: 'multi_page_build',
      status: 'completed', verification_passed: false, cost_usd: 0.02,
      input_tokens: 4000, output_tokens: 1000, duration_ms: 8000,
    });
    const scorecard = dbMod.getAgentScorecard({ agent: 'parallel_builder' });
    assert.ok(Array.isArray(scorecard), 'must return array');
    assert.ok(scorecard.length >= 1, 'must have at least one group');
    const row = scorecard.find(r => r.task_type === 'multi_page_build');
    assert.ok(row, 'must have multi_page_build group');
    assert.ok(row.total_runs >= 2, `expected >=2 total_runs, got ${row.total_runs}`);
    assert.ok(row.verification_pass_rate >= 0 && row.verification_pass_rate <= 1, 'pass_rate must be 0-1');
  });
}

// ── summary ────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failures.length) {
  console.log('\nFailed tests:');
  for (const f of failures) {
    console.log(`  ✗ ${f.label}`);
    console.log(`    ${f.error}`);
  }
}
console.log('─'.repeat(60));

process.exit(failed > 0 ? 1 : 0);
