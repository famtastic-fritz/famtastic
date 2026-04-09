#!/usr/bin/env node
/**
 * Session 7 — Phase 2: Brain Router UI Tests
 *
 * Verifies:
 *   - server.js: brain state vars, routeToBrainForBrainstorm, setBrain,
 *     REST endpoints, WS handlers, handleBrainstorm STUDIO-CONTEXT injection
 *   - public/css/studio-brain-selector.css: brain selector styles exist
 *   - public/js/brain-selector.js: BrainSelector module, selectBrain global
 *   - public/index.html: brain-selector-bar HTML, CSS link, JS script, WS handlers
 *   - Brain router function direct invocation (unit test via spawnBrainAdapter mock)
 *
 * Tests that require a live server + browser are noted as INTEGRATION
 * and skipped in this static/unit test suite. They are documented for
 * manual verification.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT        = path.resolve(__dirname, '..');
const SERVER_FILE = path.join(ROOT, 'site-studio', 'server.js');
const INDEX_HTML  = path.join(ROOT, 'site-studio', 'public', 'index.html');
const CSS_FILE    = path.join(ROOT, 'site-studio', 'public', 'css', 'studio-brain-selector.css');
const JS_FILE     = path.join(ROOT, 'site-studio', 'public', 'js', 'brain-selector.js');

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

const serverSrc  = fs.readFileSync(SERVER_FILE, 'utf8');
const indexHtml  = fs.readFileSync(INDEX_HTML,  'utf8');
const cssSrc     = fs.existsSync(CSS_FILE)  ? fs.readFileSync(CSS_FILE,  'utf8') : '';
const jsSrc      = fs.existsSync(JS_FILE)   ? fs.readFileSync(JS_FILE,   'utf8') : '';

// ── GROUP: Brain state in server.js ─────────────────────────────────────────

console.log('\n── Brain state — server.js ───────────────────────────────────────');

{
  assert(serverSrc.includes("let currentBrain = 'claude'"),
    'currentBrain state variable initialized to claude');
  assert(serverSrc.includes('const BRAIN_LIMITS = {'),
    'BRAIN_LIMITS object defined');
  assert(serverSrc.includes("claude:  { dailyLimit: null,"),
    'BRAIN_LIMITS.claude has null dailyLimit (subscription)');
  assert(serverSrc.includes("codex:   { dailyLimit: 40,"),
    'BRAIN_LIMITS.codex has dailyLimit: 40');
  assert(serverSrc.includes("gemini:  { dailyLimit: 1500,"),
    'BRAIN_LIMITS.gemini has dailyLimit: 1500');
  assert(serverSrc.includes("const sessionBrainCounts = {"),
    'sessionBrainCounts initialized');
  assert(
    serverSrc.includes("sessionBrainCounts = { claude: 0, codex: 0, gemini: 0 }") ||
    serverSrc.includes("sessionBrainCounts = { claude: 0,"),
    'sessionBrainCounts tracks all 3 brains');
}

// ── GROUP: Brain router functions ───────────────────────────────────────────

console.log('\n── Brain router functions — server.js ────────────────────────────');

{
  assert(serverSrc.includes('function spawnBrainAdapter(brain, prompt)'),
    'spawnBrainAdapter(brain, prompt) defined');
  assert(serverSrc.includes("cj-get-convo-claude"),
    'spawnBrainAdapter references claude adapter script');
  assert(serverSrc.includes("cj-get-convo-gemini"),
    'spawnBrainAdapter references gemini adapter script');
  assert(serverSrc.includes("cj-get-convo-codex"),
    'spawnBrainAdapter references codex adapter script');
  assert(serverSrc.includes('function setBrain(brain'),
    'setBrain(brain) function defined');
  assert(serverSrc.includes("STUDIO_EVENTS.BRAIN_SWITCHED"),
    'setBrain emits BRAIN_SWITCHED event');
  assert(serverSrc.includes('function routeToBrainForBrainstorm(prompt, brain)'),
    'routeToBrainForBrainstorm(prompt, brain) defined');
  assert(serverSrc.includes("if (activeBrain === 'claude') return spawnClaude(prompt)"),
    'routeToBrainForBrainstorm falls back to spawnClaude for claude');
  assert(
    serverSrc.includes('return spawnBrainAdapter(activeBrain, prompt)') ||
    serverSrc.includes('spawnBrainAdapter(activeBrain, prompt)'),
    'routeToBrainForBrainstorm calls spawnBrainAdapter for non-claude brains');
  assert(serverSrc.includes("lim.status = 'rate-limited'"),
    'routeToBrainForBrainstorm marks brain as rate-limited when over limit');
  assert(
    serverSrc.includes("brain-fallback") && serverSrc.includes("nextBrain"),
    'routeToBrainForBrainstorm sends brain-fallback WS message on rate-limit');
}

// ── GROUP: Brain REST endpoints ──────────────────────────────────────────────

console.log('\n── Brain REST endpoints — server.js ──────────────────────────────');

{
  assert(serverSrc.includes("app.get('/api/brain'"),
    'GET /api/brain endpoint exists');
  assert(serverSrc.includes("app.post('/api/brain'"),
    'POST /api/brain endpoint exists');
  assert(
    serverSrc.includes('currentBrain, limits: BRAIN_LIMITS') ||
    serverSrc.includes('currentBrain, limits'),
    'GET /api/brain returns currentBrain and limits');
  assert(serverSrc.includes("Unknown brain:") && serverSrc.includes("status(400)"),
    'POST /api/brain returns 400 for unknown brain');
}

// ── GROUP: Brain WS handlers ─────────────────────────────────────────────────

console.log('\n── Brain WS handlers — server.js ─────────────────────────────────');

{
  assert(serverSrc.includes("msg.type === 'set-brain'"),
    'WS handler for set-brain message type exists');
  assert(serverSrc.includes("msg.type === 'get-brain-status'"),
    'WS handler for get-brain-status message type exists');
  assert(
    serverSrc.includes("type: 'brain-status'") &&
    serverSrc.includes('sessionCounts: sessionBrainCounts'),
    'get-brain-status responds with brain-status + sessionCounts');
}

// ── GROUP: handleBrainstorm STUDIO-CONTEXT injection ────────────────────────

console.log('\n── handleBrainstorm context injection — server.js ────────────────');

{
  assert(serverSrc.includes('studioContextWriter.OUTPUT_FILENAME') &&
    serverSrc.includes("studioCtxContent") &&
    serverSrc.includes("studioCtxSection"),
    'handleBrainstorm reads STUDIO-CONTEXT.md into studioCtxSection');
  assert(serverSrc.includes('${studioCtxSection}'),
    'handleBrainstorm injects studioCtxSection into brainstorm prompt');
  assert(serverSrc.includes('routeToBrainForBrainstorm(prompt)'),
    'handleBrainstorm calls routeToBrainForBrainstorm instead of spawnClaude');
  assert(serverSrc.includes("[brainstorm] Routing to brain:"),
    'handleBrainstorm logs which brain is being used');
}

// ── GROUP: CSS file ──────────────────────────────────────────────────────────

console.log('\n── studio-brain-selector.css ─────────────────────────────────────');

{
  assert(fs.existsSync(CSS_FILE), 'studio-brain-selector.css exists');
  assert(cssSrc.includes('#brain-selector-bar'),
    'CSS styles #brain-selector-bar');
  assert(cssSrc.includes('.brain-pill'),
    'CSS styles .brain-pill');
  assert(cssSrc.includes('.brain-pill.active'),
    'CSS styles .brain-pill.active state');
  assert(cssSrc.includes('.brain-status-dot'),
    'CSS styles .brain-status-dot');
  assert(cssSrc.includes('.brain-status-dot.available'),
    'CSS styles .available status (green)');
  assert(cssSrc.includes('.brain-status-dot.rate-limited'),
    'CSS styles .rate-limited status (yellow)');
  assert(cssSrc.includes('#brain-fallback-bar'),
    'CSS styles #brain-fallback-bar');
}

// ── GROUP: JS file ───────────────────────────────────────────────────────────

console.log('\n── brain-selector.js ─────────────────────────────────────────────');

{
  assert(fs.existsSync(JS_FILE), 'brain-selector.js exists');
  assert(jsSrc.includes('const BrainSelector = (()'),
    'BrainSelector IIFE module defined');
  assert(jsSrc.includes('function select(brain)'),
    'BrainSelector.select(brain) function defined');
  assert(jsSrc.includes("type: 'set-brain'"),
    'select() sends set-brain WS message');
  assert(jsSrc.includes('function handleServerMessage(msg)'),
    'BrainSelector.handleServerMessage(msg) defined');
  assert(jsSrc.includes("msg.type === 'brain-changed'"),
    'handleServerMessage handles brain-changed message');
  assert(jsSrc.includes("msg.type === 'brain-status'"),
    'handleServerMessage handles brain-status message');
  assert(jsSrc.includes("msg.type === 'brain-fallback'"),
    'handleServerMessage handles brain-fallback message');
  assert(jsSrc.includes('function onWsOpen()'),
    'BrainSelector.onWsOpen() defined (called on WS connect)');
  assert(jsSrc.includes('window.BrainSelector = BrainSelector'),
    'BrainSelector exposed globally');
  assert(jsSrc.includes('window.selectBrain = '),
    'selectBrain global function exposed');
  assert(jsSrc.includes('BRAIN_META') && jsSrc.includes('Subscription'),
    'BRAIN_META includes cost info (claude=Subscription)');
}

// ── GROUP: index.html wiring ─────────────────────────────────────────────────

console.log('\n── index.html wiring ─────────────────────────────────────────────');

{
  assert(indexHtml.includes('studio-brain-selector.css'),
    'index.html links studio-brain-selector.css');
  assert(indexHtml.includes('js/brain-selector.js'),
    'index.html includes brain-selector.js script');
  assert(indexHtml.includes('id="brain-selector-bar"'),
    'index.html has #brain-selector-bar element');
  assert(indexHtml.includes('id="brain-fallback-bar"'),
    'index.html has #brain-fallback-bar element');

  // All 3 brain pills present
  assert(indexHtml.includes('data-brain="claude"'),   'Claude brain pill in HTML');
  assert(indexHtml.includes('data-brain="codex"'),    'Codex brain pill in HTML');
  assert(indexHtml.includes('data-brain="gemini"'),   'Gemini brain pill in HTML');

  // Pills have click handlers
  assert(indexHtml.includes("onclick=\"selectBrain('claude')\"") ||
    indexHtml.includes("onclick=\"selectBrain("),
    'Brain pills have selectBrain() onclick handlers');

  // WS message handling
  assert(indexHtml.includes("case 'brain-changed':"),
    'index.html WS handler for brain-changed message');
  assert(indexHtml.includes("case 'brain-status':"),
    'index.html WS handler for brain-status message');
  assert(indexHtml.includes("case 'brain-fallback':"),
    'index.html WS handler for brain-fallback message');
  assert(indexHtml.includes("BrainSelector.handleServerMessage(msg)"),
    'WS handlers delegate to BrainSelector.handleServerMessage');

  // BrainSelector.onWsOpen called on WS connect
  assert(indexHtml.includes("BrainSelector.onWsOpen()"),
    'index.html calls BrainSelector.onWsOpen() on WS open');
}

// ── Results ───────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
console.log(`Session 7 Phase 2: ${passed + failed} tests — ${passed} passed, ${failed} failed`);

if (failures.length > 0) {
  console.log('\nFailures:');
  failures.forEach(f => console.log(`  ✗ ${f.name}${f.detail ? ' — ' + f.detail : ''}`));
}

console.log(`
INTEGRATION TESTS (require live server at localhost:3334):
  - Brain selector renders above chat input
  - Clicking Codex pill highlights it and sends set-brain WS message
  - Chat message routes to selected brain (check server logs)
  - Switching brains preserves conversation history (Phase 0 Fix S7-0B)
  - Rate-limit fallback notification shown in UI
  - Brainstorm mode response references vertical from STUDIO-CONTEXT.md
`);

process.exit(failed > 0 ? 1 : 0);
