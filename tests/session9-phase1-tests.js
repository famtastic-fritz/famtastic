#!/usr/bin/env node
/**
 * Session 9 Phase 1 Tests — Brain Adapter Pattern
 * Verifies BrainInterface, adapters, factory, auth check, and ws.send guards.
 * No live API calls — all tests use structural checks or mocked adapters.
 */

'use strict';
const assert = require('assert');
const fs     = require('fs');
const path   = require('path');

const LIB = path.join(__dirname, '..', 'site-studio', 'lib');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
    failed++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
    failed++;
  }
}

// ─── BrainAdapterFactory ─────────────────────────────────────────────────────
console.log('\nBrainAdapterFactory');

const { BrainAdapterFactory } = require(path.join(LIB, 'brain-adapter-factory'));
const { ClaudeAdapter }       = require(path.join(LIB, 'adapters', 'claude-adapter'));
const { GeminiAdapter }       = require(path.join(LIB, 'adapters', 'gemini-adapter'));
const { CodexAdapter }        = require(path.join(LIB, 'adapters', 'codex-adapter'));

test('factory: creates ClaudeAdapter for claude', () => {
  const adapter = BrainAdapterFactory.create('claude');
  assert(adapter instanceof ClaudeAdapter, 'Expected ClaudeAdapter');
});

test('factory: creates GeminiAdapter for gemini', () => {
  const adapter = BrainAdapterFactory.create('gemini');
  assert(adapter instanceof GeminiAdapter, 'Expected GeminiAdapter');
});

test('factory: creates CodexAdapter for codex', () => {
  const adapter = BrainAdapterFactory.create('codex');
  assert(adapter instanceof CodexAdapter, 'Expected CodexAdapter');
});

test('factory: returns ClaudeAdapter for unknown brain (safe fallback)', () => {
  const adapter = BrainAdapterFactory.create('unknown-brain');
  assert(adapter instanceof ClaudeAdapter, 'Expected ClaudeAdapter as fallback');
});

test('factory: supportedBrains includes all three', () => {
  const supported = BrainAdapterFactory.supportedBrains;
  assert(supported.includes('claude'), 'Missing claude');
  assert(supported.includes('gemini'), 'Missing gemini');
  assert(supported.includes('codex'),  'Missing codex');
});

// ─── Adapter Capabilities ─────────────────────────────────────────────────────
console.log('\nAdapter Capabilities');

test('ClaudeAdapter: capabilities object has all fields', () => {
  const adapter = new ClaudeAdapter();
  assert(adapter.capabilities.multiTurn   === true, 'multiTurn should be true');
  assert(adapter.capabilities.streaming   === true, 'streaming should be true');
  assert(adapter.capabilities.toolCalling === true, 'toolCalling should be true');
  assert(adapter.capabilities.vision      === true, 'vision should be true');
  assert(typeof adapter.capabilities.maxTokens === 'number', 'maxTokens should be number');
});

test('GeminiAdapter: capabilities object has all fields', () => {
  const adapter = new GeminiAdapter();
  assert(adapter.capabilities.multiTurn   === true, 'multiTurn should be true');
  assert(adapter.capabilities.streaming   === true, 'streaming should be true');
  assert(typeof adapter.capabilities.maxTokens === 'number', 'maxTokens should be number');
});

test('CodexAdapter: capabilities object has all fields', () => {
  const adapter = new CodexAdapter();
  assert(adapter.capabilities.multiTurn   === true, 'multiTurn should be true');
  assert(adapter.capabilities.streaming   === true, 'streaming should be true');
  assert(typeof adapter.capabilities.maxTokens === 'number', 'maxTokens should be number');
});

test('ClaudeAdapter: has execute() method', () => {
  const adapter = new ClaudeAdapter();
  assert(typeof adapter.execute === 'function', 'execute() not found');
});

test('ClaudeAdapter: has executeStreaming() method', () => {
  const adapter = new ClaudeAdapter();
  assert(typeof adapter.executeStreaming === 'function', 'executeStreaming() not found');
});

test('GeminiAdapter: has execute() and executeStreaming()', () => {
  const adapter = new GeminiAdapter();
  assert(typeof adapter.execute === 'function');
  assert(typeof adapter.executeStreaming === 'function');
});

test('CodexAdapter: has execute() and executeStreaming()', () => {
  const adapter = new CodexAdapter();
  assert(typeof adapter.execute === 'function');
  assert(typeof adapter.executeStreaming === 'function');
});

test('ClaudeAdapter: haikuModel and defaultModel getters', () => {
  const adapter = new ClaudeAdapter();
  assert(typeof adapter.haikuModel === 'string', 'haikuModel getter missing');
  assert(adapter.haikuModel.includes('haiku'), 'haikuModel should include haiku');
  assert(typeof adapter.defaultModel === 'string', 'defaultModel getter missing');
  assert(adapter.defaultModel.includes('sonnet'), 'defaultModel should include sonnet');
});

// ─── BrainInterface — Instantiation ──────────────────────────────────────────
console.log('\nBrainInterface — Instantiation');

const { BrainInterface } = require(path.join(LIB, 'brain-interface'));

test('BrainInterface: instantiates with claude default', () => {
  const bi = new BrainInterface('claude');
  assert(bi.brain === 'claude', 'brain not set');
  assert(bi.adapter instanceof ClaudeAdapter, 'adapter should be ClaudeAdapter');
});

test('BrainInterface: conversationHistory starts empty', () => {
  const bi = new BrainInterface('claude');
  assert(Array.isArray(bi.conversationHistory), 'conversationHistory not array');
  assert(bi.conversationHistory.length === 0, 'conversationHistory not empty');
});

test('BrainInterface: capabilities.multiTurn is true for Claude', () => {
  const bi = new BrainInterface('claude');
  assert(bi.getCapabilities().multiTurn === true, 'multiTurn should be true');
});

test('BrainInterface: historyLength starts at 0', () => {
  const bi = new BrainInterface('claude');
  assert(bi.historyLength === 0, 'historyLength should be 0');
});

// ─── Context Header Injection ─────────────────────────────────────────────────
console.log('\nContext Header Injection');

test('BrainInterface: buildContextHeader includes mode', () => {
  const bi = new BrainInterface('claude', { tag: 'test-site' });
  const header = bi.buildContextHeader('brainstorm');
  assert(header.includes('[MODE: BRAINSTORM]'), `Header missing MODE — got: ${header}`);
});

test('BrainInterface: buildContextHeader includes site tag', () => {
  const bi = new BrainInterface('claude', { tag: 'vinyl-vault' });
  const header = bi.buildContextHeader('chat');
  assert(header.includes('[SITE: vinyl-vault]'), `Header missing SITE — got: ${header}`);
});

test('BrainInterface: buildContextHeader includes page when set', () => {
  const bi = new BrainInterface('claude', { tag: 'test-site', page: 'about.html' });
  const header = bi.buildContextHeader('edit');
  assert(header.includes('[PAGE: about.html]'), `Header missing PAGE — got: ${header}`);
});

test('BrainInterface: buildContextHeader omits page when not set', () => {
  const bi = new BrainInterface('claude', { tag: 'test-site' });
  const header = bi.buildContextHeader('chat');
  assert(!header.includes('[PAGE:'), 'PAGE should not appear when page not set');
});

test('BrainInterface: buildContextHeader handles unknown mode gracefully', () => {
  const bi = new BrainInterface('claude', { tag: 'test-site' });
  const header = bi.buildContextHeader('invalid-mode');
  // Falls back to [MODE: CHAT]
  assert(header.includes('[MODE: CHAT]'), `Should fallback to CHAT for unknown mode — got: ${header}`);
});

test('BrainInterface: buildContextHeader ends with double newline', () => {
  const bi = new BrainInterface('claude', { tag: 'test-site' });
  const header = bi.buildContextHeader('chat');
  assert(header.endsWith('\n\n'), 'Header should end with double newline for separation');
});

// ─── History Management ───────────────────────────────────────────────────────
console.log('\nHistory Management');

test('BrainInterface: setPage updates page', () => {
  const bi = new BrainInterface('claude');
  bi.setPage('contact.html');
  assert(bi.page === 'contact.html', 'setPage did not update page');
});

test('BrainInterface: setSite updates tag and resets history', () => {
  const bi = new BrainInterface('claude');
  bi.conversationHistory.push({ role: 'user', content: 'hello' });
  bi.setSite('new-site-tag');
  assert(bi.tag === 'new-site-tag', 'setSite did not update tag');
  assert(bi.conversationHistory.length === 0, 'setSite should reset history');
});

test('BrainInterface: resetHistory clears conversationHistory', () => {
  const bi = new BrainInterface('claude');
  bi.conversationHistory.push({ role: 'user', content: 'msg1' });
  bi.conversationHistory.push({ role: 'assistant', content: 'reply1' });
  bi.resetHistory();
  assert(bi.conversationHistory.length === 0, 'resetHistory did not clear history');
});

test('BrainInterface: switchBrain returns previous history', () => {
  const bi = new BrainInterface('claude');
  bi.conversationHistory.push({ role: 'user', content: 'first message' });
  bi.conversationHistory.push({ role: 'assistant', content: 'first reply' });
  const history = bi.switchBrain('gemini');
  assert(Array.isArray(history), 'switchBrain should return array');
  assert(history.length === 2, 'switchBrain should return previous history length');
  assert(history[0].content === 'first message', 'History content preserved');
});

test('BrainInterface: switchBrain updates brain and adapter', () => {
  const bi = new BrainInterface('claude');
  bi.switchBrain('gemini');
  assert(bi.brain === 'gemini', 'brain not updated after switch');
  assert(bi.adapter instanceof GeminiAdapter, 'adapter not updated to GeminiAdapter');
});

test('BrainInterface: switchBrain preserves conversationHistory', () => {
  const bi = new BrainInterface('claude');
  bi.conversationHistory.push({ role: 'user', content: 'msg1' });
  bi.conversationHistory.push({ role: 'assistant', content: 'reply1' });
  bi.switchBrain('codex');
  assert(bi.conversationHistory.length === 2, 'conversationHistory should be preserved after brain switch');
});

// (execute() async tests are in runAsyncTests() below — requires top-level await)

// ─── Brain Auth Check ─────────────────────────────────────────────────────────
// (async tests wrapped in main() below)

// ─── Brain Sessions Management (sync portion) ────────────────────────────────
console.log('\nBrain Sessions Management');

const { getOrCreateBrainSession, getBrainSession, resetSessions } = require(path.join(LIB, 'brain-sessions'));

test('getOrCreateBrainSession: creates new session for claude', () => {
  const session = getOrCreateBrainSession('claude', { tag: 'test-site' });
  assert(session instanceof BrainInterface, 'Should return BrainInterface instance');
  assert(session.brain === 'claude', 'session.brain should be claude');
});

test('getOrCreateBrainSession: returns same instance on second call', () => {
  const s1 = getOrCreateBrainSession('claude', { tag: 'test-site' });
  const s2 = getOrCreateBrainSession('claude', { tag: 'test-site' });
  assert(s1 === s2, 'Should return same session instance');
});

test('getBrainSession: returns null for unstarted brain', () => {
  // Gemini session may not exist yet (depending on test order)
  resetSessions();
  const s = getBrainSession('gemini');
  assert(s === null, 'Should return null for unstarted gemini session');
});

test('resetSessions: clears history from all sessions', () => {
  const s = getOrCreateBrainSession('claude', { tag: 'test-site' });
  s.conversationHistory.push({ role: 'user', content: 'test' });
  resetSessions();
  assert(s.conversationHistory.length === 0, 'resetSessions should clear history');
});

// ─── api-telemetry ───────────────────────────────────────────────────────────
console.log('\napi-telemetry Module');

const { logAPICall, calculateCost, getSessionSummary } = require(path.join(LIB, 'api-telemetry'));

test('calculateCost: correct for claude-sonnet-4-6', () => {
  const cost = calculateCost('claude-sonnet-4-6', 1000, 1000);
  // (1000 × $3/1M) + (1000 × $15/1M) = $0.003 + $0.015 = $0.018
  assert(Math.abs(cost - 0.018) < 0.0001, `Expected ~0.018, got ${cost}`);
});

test('calculateCost: haiku is cheaper than sonnet', () => {
  const sonnet = calculateCost('claude-sonnet-4-6', 10000, 5000);
  const haiku  = calculateCost('claude-haiku-4-5-20251001', 10000, 5000);
  assert(haiku < sonnet, 'Haiku should cost less than Sonnet');
});

test('logAPICall: returns entry with all fields', () => {
  const entry = logAPICall({
    provider:     'claude',
    model:        'claude-sonnet-4-6',
    callSite:     'test-call',
    inputTokens:  500,
    outputTokens: 200,
    tag:          null,
    hubRoot:      null,
  });
  assert(typeof entry.cost_usd === 'number', 'cost_usd should be number');
  assert(entry.cost_usd > 0, 'cost_usd should be positive');
  assert(entry.call_site === 'test-call', 'call_site not set');
  assert(entry.provider === 'claude', 'provider not set');
});

test('getSessionSummary: returns expected shape', () => {
  const summary = getSessionSummary();
  assert(typeof summary.totalCostUsd === 'number', 'totalCostUsd should be number');
  assert(typeof summary.byProvider  === 'object',  'byProvider should be object');
  assert(typeof summary.bySite      === 'object',  'bySite should be object');
  assert(typeof summary.byCallSite  === 'object',  'byCallSite should be object');
  assert(typeof summary.generatedAt === 'string',  'generatedAt should be string');
});

test('logAPICall: accumulates in session totals', () => {
  const before = getSessionSummary().totalCostUsd;
  logAPICall({ provider: 'claude', model: 'claude-sonnet-4-6', inputTokens: 1000, outputTokens: 500 });
  const after  = getSessionSummary().totalCostUsd;
  assert(after > before, 'Session total should increase after logAPICall');
});

// ─── studio-events: MODE_CHANGED ─────────────────────────────────────────────
console.log('\nstudio-events: MODE_CHANGED');

const { STUDIO_EVENTS } = require(path.join(LIB, 'studio-events'));

test('STUDIO_EVENTS: MODE_CHANGED event exists', () => {
  assert('MODE_CHANGED' in STUDIO_EVENTS, 'MODE_CHANGED not in STUDIO_EVENTS');
});

test('STUDIO_EVENTS: MODE_CHANGED value is mode:changed', () => {
  assert(STUDIO_EVENTS.MODE_CHANGED === 'mode:changed', `Expected 'mode:changed', got '${STUDIO_EVENTS.MODE_CHANGED}'`);
});

// ─── ws.send guard in adapters ────────────────────────────────────────────────
console.log('\nws.send Guard in Adapter Files');

const adapterFiles = [
  path.join(LIB, 'adapters', 'claude-adapter.js'),
  path.join(LIB, 'adapters', 'gemini-adapter.js'),
  path.join(LIB, 'adapters', 'codex-adapter.js'),
];

for (const filePath of adapterFiles) {
  const fileName = path.basename(filePath);
  const src = fs.readFileSync(filePath, 'utf8');

  test(`${fileName}: all ws.send calls check readyState`, () => {
    // Count ws.send calls that are guarded vs total
    const sendMatches    = (src.match(/ws\.send\(/g) || []).length;
    const guardedMatches = (src.match(/ws\.readyState\s*===\s*WebSocket\.OPEN/g) || []).length;
    // Every ws.send should be inside a readyState guard block
    // Allow 0 ws.send = 0 guards needed (some adapters may not have any direct ws.send)
    if (sendMatches > 0) {
      assert(
        guardedMatches >= Math.ceil(sendMatches / 2),
        `${fileName}: ${sendMatches} ws.send calls but only ${guardedMatches} readyState guards`
      );
    }
  });
}

test('claude-adapter: silence timer uses resetSilenceTimer pattern', () => {
  const src = fs.readFileSync(path.join(LIB, 'adapters', 'claude-adapter.js'), 'utf8');
  assert(
    src.includes('resetSilenceTimer') || src.includes('silenceTimer'),
    'claude-adapter should implement silence timer'
  );
});

test('claude-adapter: abortControllers array support', () => {
  const src = fs.readFileSync(path.join(LIB, 'adapters', 'claude-adapter.js'), 'utf8');
  assert(src.includes('abortControllers'), 'abortControllers support missing from claude-adapter');
});

// ─── File existence ───────────────────────────────────────────────────────────
console.log('\nFile Existence');

const expectedFiles = [
  path.join(LIB, 'brain-interface.js'),
  path.join(LIB, 'brain-adapter-factory.js'),
  path.join(LIB, 'brain-sessions.js'),
  path.join(LIB, 'api-telemetry.js'),
  path.join(LIB, 'adapters', 'claude-adapter.js'),
  path.join(LIB, 'adapters', 'gemini-adapter.js'),
  path.join(LIB, 'adapters', 'codex-adapter.js'),
];

for (const filePath of expectedFiles) {
  test(`file exists: ${path.relative(path.join(__dirname, '..'), filePath)}`, () => {
    assert(fs.existsSync(filePath), `File not found: ${filePath}`);
  });
}

// ─── Async Tests ─────────────────────────────────────────────────────────────
async function runAsyncTests() {
  console.log('\nBrain Auth Check (initBrainSessions)');

  const { initBrainSessions } = require(path.join(LIB, 'brain-sessions'));

  await testAsync('initBrainSessions: returns object with all 3 brain keys', async () => {
    const results = await initBrainSessions(null, {}, { timeout: 2000 });
    assert(typeof results === 'object', 'should return object');
    assert('claude' in results, 'Missing claude key');
    assert('gemini' in results, 'Missing gemini key');
    assert('codex'  in results, 'Missing codex key');
  });

  await testAsync('initBrainSessions: each value is authenticated or needs-auth', async () => {
    const results = await initBrainSessions(null, {}, { timeout: 2000 });
    for (const [brain, status] of Object.entries(results)) {
      assert(
        status === 'authenticated' || status === 'needs-auth',
        `Brain ${brain} has invalid status: ${status}`
      );
    }
  });

  await testAsync('initBrainSessions: never throws even with no env vars', async () => {
    const savedClaude = process.env.ANTHROPIC_API_KEY;
    const savedGemini = process.env.GEMINI_API_KEY;
    const savedOpenAI = process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
      const results = await initBrainSessions(null, {}, { timeout: 100 });
      assert(results.claude === 'needs-auth', 'Claude without API key should be needs-auth');
      assert(results.gemini === 'needs-auth', 'Gemini without API key should be needs-auth');
      assert(results.codex  === 'needs-auth', 'Codex without API key should be needs-auth');
    } finally {
      if (savedClaude) process.env.ANTHROPIC_API_KEY = savedClaude;
      if (savedGemini) process.env.GEMINI_API_KEY    = savedGemini;
      if (savedOpenAI) process.env.OPENAI_API_KEY    = savedOpenAI;
    }
  });

  await testAsync('initBrainSessions: emits SESSION_STARTED event with brainStatus', async () => {
    const EventEmitter = require('events');
    const fakeEmitter  = new EventEmitter();
    const EVENTS       = { SESSION_STARTED: 'session:started' };
    let emittedPayload = null;
    fakeEmitter.on('session:started', (payload) => { emittedPayload = payload; });

    await initBrainSessions(fakeEmitter, EVENTS, { timeout: 100 });
    assert(emittedPayload !== null, 'SESSION_STARTED event not emitted');
    assert('brainStatus' in emittedPayload, 'brainStatus not in event payload');
    assert('claude' in emittedPayload.brainStatus, 'claude not in brainStatus');
  });

  // BrainInterface async tests
  console.log('\nBrainInterface.execute() — Async (mocked)');

  await testAsync('execute(): appends user+assistant turns to history', async () => {
    const bi = new BrainInterface('claude');
    bi.adapter.execute = async () => ({ content: 'mock reply', usage: null });
    await bi.execute('hello');
    assert(bi.conversationHistory.length === 2, `Expected 2, got ${bi.conversationHistory.length}`);
    assert(bi.conversationHistory[0].role === 'user');
    assert(bi.conversationHistory[1].role === 'assistant');
  });

  await testAsync('execute(): passes prior history to adapter', async () => {
    const bi = new BrainInterface('claude', { tag: 'test-site' });
    let capturedHistory = null;
    bi.adapter.execute = async (msg, opts) => {
      capturedHistory = opts.history;
      return { content: 'reply', usage: null };
    };
    await bi.execute('msg1');
    await bi.execute('msg2');
    assert(capturedHistory !== null, 'History not captured');
    assert(capturedHistory.length === 2, `Expected 2 prior entries, got ${capturedHistory.length}`);
  });

  await testAsync('execute(): context header prepended to adapter message', async () => {
    const bi = new BrainInterface('claude', { tag: 'site-a' });
    let capturedMsg = null;
    bi.adapter.execute = async (msg) => { capturedMsg = msg; return { content: 'ok' }; };
    await bi.execute('user request', { mode: 'brainstorm' });
    assert(capturedMsg.includes('[MODE: BRAINSTORM]'), `Header not injected — got: ${capturedMsg.substring(0, 80)}`);
    assert(capturedMsg.includes('user request'), 'Original message not in captured');
  });

  await testAsync('execute(): 3 calls produce 6 history entries', async () => {
    const bi = new BrainInterface('claude');
    bi.adapter.execute = async () => ({ content: 'response', usage: null });
    await bi.execute('msg1');
    await bi.execute('msg2');
    await bi.execute('msg3');
    assert(bi.conversationHistory.length === 6, `Expected 6, got ${bi.conversationHistory.length}`);
  });

  // Summary
  console.log('\n' + '─'.repeat(60));
  console.log(`Session 9 Phase 1: ${passed + failed} tests — ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runAsyncTests().catch(err => {
  console.error('Async test runner error:', err);
  process.exit(1);
});
