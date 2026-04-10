'use strict';
/**
 * session10-phase2-tests.js — Phase 2 verification tests.
 * Tests: studio-tools, tool-handlers, server.js wiring, brain-interface, claude-adapter.
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const HUB_ROOT    = path.join(__dirname, '..');
const STUDIO_LIB  = path.join(HUB_ROOT, 'site-studio', 'lib');
const SERVER_PATH = path.join(HUB_ROOT, 'site-studio', 'server.js');
const ADAPTER_PATH = path.join(STUDIO_LIB, 'adapters', 'claude-adapter.js');
const BRAIN_PATH  = path.join(STUDIO_LIB, 'brain-interface.js');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  PASS  ${message}`);
    passed++;
  } else {
    console.error(`  FAIL  ${message}`);
    failed++;
  }
}

function test(name, fn) {
  console.log(`\n[${name}]`);
  try {
    fn();
  } catch (e) {
    console.error(`  ERROR  ${e.message}`);
    failed++;
  }
}

async function asyncTest(name, fn) {
  console.log(`\n[${name}]`);
  try {
    await fn();
  } catch (e) {
    console.error(`  ERROR  ${e.message}`);
    failed++;
  }
}

// ─── Test 1 ────────────────────────────────────────────────────────────────
test('test_studio_tools_defined', () => {
  const { STUDIO_TOOLS } = require(path.join(STUDIO_LIB, 'studio-tools.js'));
  assert(Array.isArray(STUDIO_TOOLS), 'STUDIO_TOOLS is an array');
  assert(STUDIO_TOOLS.length === 5, `STUDIO_TOOLS has 5 tools (got ${STUDIO_TOOLS.length})`);
  for (const tool of STUDIO_TOOLS) {
    assert(typeof tool.name === 'string' && tool.name.length > 0, `Tool has name: ${tool.name}`);
    assert(typeof tool.description === 'string' && tool.description.length > 0, `Tool ${tool.name} has description`);
    assert(tool.input_schema && typeof tool.input_schema === 'object', `Tool ${tool.name} has input_schema`);
  }
});

// ─── Test 2 ────────────────────────────────────────────────────────────────
test('test_tool_names_correct', () => {
  const { STUDIO_TOOLS } = require(path.join(STUDIO_LIB, 'studio-tools.js'));
  const names = STUDIO_TOOLS.map(t => t.name);
  const expected = ['get_site_context', 'get_component_library', 'get_research', 'dispatch_worker', 'read_file'];
  for (const name of expected) {
    assert(names.includes(name), `STUDIO_TOOLS includes '${name}'`);
  }
});

// ─── Test 3 ────────────────────────────────────────────────────────────────
test('test_tool_handlers_exports', () => {
  const toolHandlers = require(path.join(STUDIO_LIB, 'tool-handlers.js'));
  assert(typeof toolHandlers.handleToolCall === 'function', 'handleToolCall is exported');
  assert(typeof toolHandlers.initToolHandlers === 'function', 'initToolHandlers is exported');
});

// ─── Tests 4 & 5 ────────────────────────────────────────────────────────────
// Initialize handlers with mock fns pointing at the auntie-gale test site
const MOCK_SITE_DIR = path.join(HUB_ROOT, 'sites', 'site-auntie-gale-garage-sales');

asyncTest('test_get_site_context_runs', async () => {
  const { handleToolCall, initToolHandlers } = require(path.join(STUDIO_LIB, 'tool-handlers.js'));
  initToolHandlers({
    getSiteDir: () => MOCK_SITE_DIR,
    readSpec:   () => ({ site_name: 'Test Site', design_decisions: [] }),
    getTag:     () => 'site-auntie-gale-garage-sales',
    hubRoot:    HUB_ROOT,
  });
  const result = await handleToolCall('get_site_context', {}, null);
  assert(typeof result === 'object', 'get_site_context returns object');
  assert('tag' in result || 'error' in result, 'result has tag or error key');
  if (!result.error) {
    assert(result.tag === 'site-auntie-gale-garage-sales', `tag is correct: ${result.tag}`);
  }
});

asyncTest('test_get_component_library_runs', async () => {
  const { handleToolCall } = require(path.join(STUDIO_LIB, 'tool-handlers.js'));
  const result = await handleToolCall('get_component_library', {}, null);
  assert(typeof result === 'object', 'get_component_library returns object');
  assert('components' in result || 'error' in result, 'result has components or error key');
  if (!result.error) {
    assert(Array.isArray(result.components), 'components is an array');
  }
});

// ─── Test 6 ────────────────────────────────────────────────────────────────
asyncTest('test_dispatch_worker_returns_queued', async () => {
  const { handleToolCall } = require(path.join(STUDIO_LIB, 'tool-handlers.js'));
  const result = await handleToolCall('dispatch_worker', { worker: 'claude-code', task: 'test task for phase 2 tests' }, null);
  assert(typeof result === 'object', 'dispatch_worker returns object');
  assert(
    result.status === 'queued' || result.status === 'acknowledged',
    `dispatch_worker status is queued or acknowledged (got: ${result.status})`
  );
});

// ─── Test 7 ────────────────────────────────────────────────────────────────
asyncTest('test_dispatch_worker_writes_queue', async () => {
  const { handleToolCall } = require(path.join(STUDIO_LIB, 'tool-handlers.js'));
  await handleToolCall('dispatch_worker', { worker: 'claude-code', task: 'queue write test' }, null);
  const queuePath = path.join(os.homedir(), 'famtastic', '.worker-queue.jsonl');
  assert(fs.existsSync(queuePath), '.worker-queue.jsonl exists');
  if (fs.existsSync(queuePath)) {
    const lines = fs.readFileSync(queuePath, 'utf8').trim().split('\n').filter(Boolean);
    const entries = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    const found = entries.some(e => e.worker === 'claude-code');
    assert(found, 'Queue contains an entry with worker: claude-code');
  }
});

// ─── Test 8 ────────────────────────────────────────────────────────────────
asyncTest('test_read_file_path_sandboxed', async () => {
  const { handleToolCall } = require(path.join(STUDIO_LIB, 'tool-handlers.js'));
  const result = await handleToolCall('read_file', { path: '../../../../.env' }, null);
  assert(typeof result === 'object', 'read_file returns object');
  assert(
    result.error && result.error.includes('Access denied'),
    `Path traversal blocked with "Access denied" (got: ${result.error || 'no error'})`
  );
});

// ─── Test 9 ────────────────────────────────────────────────────────────────
asyncTest('test_read_file_valid_path', async () => {
  const { handleToolCall } = require(path.join(STUDIO_LIB, 'tool-handlers.js'));
  const result = await handleToolCall('read_file', { path: 'spec.json' }, null);
  assert(typeof result === 'object', 'read_file returns object');
  // Should return content or a "File not found" error — but NOT "Access denied"
  const isAccessDenied = result.error && result.error.includes('Access denied');
  assert(!isAccessDenied, 'Valid path does not trigger Access denied');
  assert('content' in result || ('error' in result && result.error.includes('not found')), 'Returns content or not-found');
});

// ─── Test 10 ────────────────────────────────────────────────────────────────
test('test_worker_queue_endpoint_in_server', () => {
  const source = fs.readFileSync(SERVER_PATH, 'utf8');
  assert(source.includes('/api/worker-queue'), 'server.js contains /api/worker-queue route');
});

// ─── Test 11 ────────────────────────────────────────────────────────────────
test('test_tool_calling_claude_only', () => {
  const source = fs.readFileSync(BRAIN_PATH, 'utf8');
  assert(
    source.includes("this.brain === 'claude'") && source.includes('STUDIO_TOOLS'),
    "brain-interface.js only passes STUDIO_TOOLS when brain === 'claude'"
  );
  // Verify Gemini/Codex adapters do NOT import studio-tools
  const geminiPath = path.join(STUDIO_LIB, 'adapters', 'gemini-adapter.js');
  const codexPath  = path.join(STUDIO_LIB, 'adapters', 'codex-adapter.js');
  const geminiSrc  = fs.existsSync(geminiPath) ? fs.readFileSync(geminiPath, 'utf8') : '';
  const codexSrc   = fs.existsSync(codexPath)  ? fs.readFileSync(codexPath, 'utf8')  : '';
  assert(!geminiSrc.includes('studio-tools'), 'GeminiAdapter does NOT import studio-tools');
  assert(!codexSrc.includes('studio-tools'),  'CodexAdapter does NOT import studio-tools');
});

// ─── Test 12 ────────────────────────────────────────────────────────────────
test('test_claude_adapter_has_depth_limit', () => {
  const source = fs.readFileSync(ADAPTER_PATH, 'utf8');
  const hasDepthLimit =
    source.includes('MAX_TOOL_DEPTH') ||
    source.includes('depth_limit') ||
    source.includes('depth >= 3');
  assert(hasDepthLimit, 'claude-adapter.js contains depth limit (MAX_TOOL_DEPTH or depth >= 3)');
});

// ─── Test 13 ────────────────────────────────────────────────────────────────
test('test_ws_not_stored_on_adapter', () => {
  const source = fs.readFileSync(ADAPTER_PATH, 'utf8');
  // 'this.ws =' (with space before =) means assignment to this.ws — forbidden per C4
  const hasThisWsAssignment = /this\.ws\s*=/.test(source);
  assert(!hasThisWsAssignment, 'claude-adapter.js does NOT contain this.ws = (ws flows through options, never stored)');
});

// ─── Test 14 ────────────────────────────────────────────────────────────────
test('test_tool_handlers_initialized', () => {
  const source = fs.readFileSync(SERVER_PATH, 'utf8');
  assert(source.includes('initToolHandlers'), 'server.js calls initToolHandlers');
});

// ─── Results ────────────────────────────────────────────────────────────────
console.log('\n────────────────────────────────────────');
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('SOME TESTS FAILED');
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED');
}
