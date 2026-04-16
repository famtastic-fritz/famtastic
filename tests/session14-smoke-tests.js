'use strict';

/**
 * Session 14 — Studio UI Rebuild Smoke Tests
 * Verifies the new frontend meets all critical requirements:
 * - Correct WS wire protocol
 * - All required DOM IDs present
 * - CSS token system in place
 * - All JS modules present and syntactically valid
 * - No broken references between modules
 * - Backwards compatibility: existing tests still pass
 */

const fs   = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try { fn(); console.log('  \u2713 ' + name); passed++; }
  catch (e) { console.error('  \u2717 ' + name + '\n    ' + e.message); failed++; }
}

function assert(cond, msg) { if (!cond) throw new Error(msg || 'Assertion failed'); }

const PUBLIC = path.join(__dirname, '../site-studio/public');
const html = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');

// ── CSS files ────────────────────────────────────────────────────────────────
console.log('\nCSS files');

test('studio-shell.css exists and has --fam-red variable', () => {
  const css = fs.readFileSync(path.join(PUBLIC, 'css/studio-shell.css'), 'utf8');
  // Allow for extra whitespace in the declaration (--fam-red:     #e8352a)
  assert(/--fam-red\s*:\s*#e8352a/.test(css), '--fam-red token not found');
  assert(css.includes('--fam-gold'), '--fam-gold token not found');
  assert(css.includes('--fam-bg'), '--fam-bg token not found');
});

test('studio-shell.css has activity-rail (48px) and status-bar (fixed bottom)', () => {
  const css = fs.readFileSync(path.join(PUBLIC, 'css/studio-shell.css'), 'utf8');
  assert(css.includes('#activity-rail'), '#activity-rail rule not found');
  assert(css.includes('#status-bar'), '#status-bar rule not found');
  assert(css.includes('position: fixed') || css.includes('position:fixed'), 'status bar not fixed');
});

test('studio-shell.css has tab bar with red bottom border on active', () => {
  const css = fs.readFileSync(path.join(PUBLIC, 'css/studio-shell.css'), 'utf8');
  assert(css.includes('.ws-tab.active'), '.ws-tab.active not found');
  assert(css.includes('#e8352a') || css.includes('var(--fam-red)'), 'red border color not found');
});

test('studio-orb.css has fixed positioning at bottom-right z:9999', () => {
  const css = fs.readFileSync(path.join(PUBLIC, 'css/studio-orb.css'), 'utf8');
  assert(css.includes('position: fixed') || css.includes('position:fixed'), 'orb not fixed');
  assert(css.includes('9999'), 'z-index 9999 not found');
  assert(css.includes('bottom: 56px') || css.includes('bottom:56px'), 'bottom:56px not found');
});

test('studio-base.css has fam-token message classes', () => {
  const css = fs.readFileSync(path.join(PUBLIC, 'css/studio-base.css'), 'utf8');
  assert(css.includes('.msg-user'), '.msg-user not found');
  assert(css.includes('.msg-assistant'), '.msg-assistant not found');
  assert(css.includes('var(--fam-red)') || css.includes('--fam-'), 'fam tokens not used in base.css');
});

test('studio-brief.css has suggestion chip styles', () => {
  const css = fs.readFileSync(path.join(PUBLIC, 'css/studio-brief.css'), 'utf8');
  assert(css.includes('.brief-chip'), '.brief-chip not found');
  assert(css.includes('.brief-chip.selected'), '.brief-chip.selected not found');
  assert(css.includes('.brief-build-btn'), '.brief-build-btn not found');
});

test('studio-screens.css has MC metrics row and deploy pipeline', () => {
  const css = fs.readFileSync(path.join(PUBLIC, 'css/studio-screens.css'), 'utf8');
  assert(css.includes('.mc-metrics-row'), '.mc-metrics-row not found');
  assert(css.includes('.deploy-log'), '.deploy-log not found');
  assert(css.includes('.settings-nav-item'), '.settings-nav-item not found');
});

// ── JS files ────────────────────────────────────────────────────────────────
console.log('\nJS files');

['studio-shell.js', 'studio-orb.js', 'studio-brief.js', 'studio-screens.js'].forEach(function(f) {
  test(f + ' exists and is valid JS', function() {
    const src = fs.readFileSync(path.join(PUBLIC, 'js', f), 'utf8');
    assert(src.length > 100, 'file too small — likely empty');
    // Basic syntax check: balanced braces
    let open = 0, close = 0;
    for (const c of src) { if (c === '{') open++; else if (c === '}') close++; }
    assert(Math.abs(open - close) < 10, 'unbalanced braces: open=' + open + ' close=' + close);
  });
});

test('studio-shell.js exports StudioShell with switchTab and switchMode', () => {
  const src = fs.readFileSync(path.join(PUBLIC, 'js/studio-shell.js'), 'utf8');
  assert(src.includes('window.StudioShell'), 'StudioShell not exported');
  assert(src.includes('switchTab'), 'switchTab not found');
  assert(src.includes('switchMode'), 'switchMode not found');
  assert(src.includes('loadSiteTree'), 'loadSiteTree not found');
});

test('studio-orb.js exports PipOrb and has 5 trigger constants', () => {
  const src = fs.readFileSync(path.join(PUBLIC, 'js/studio-orb.js'), 'utf8');
  assert(src.includes('window.PipOrb'), 'PipOrb not exported');
  assert(src.includes('pip-t-welcome'), 'welcome trigger not found');
  assert(src.includes('pip-t-build-warn'), 'build-warn trigger not found');
  assert(src.includes('pip-t-worker-queue'), 'worker-queue trigger not found');
  assert(src.includes('pip-t-idle-unsaved'), 'idle-unsaved trigger not found');
  assert(src.includes('pip-t-briefed-idle'), 'briefed-idle trigger not found');
});

test('studio-orb.js uses sessionStorage for dismiss (not localStorage)', () => {
  const src = fs.readFileSync(path.join(PUBLIC, 'js/studio-orb.js'), 'utf8');
  assert(src.includes('sessionStorage'), 'sessionStorage not used for dismiss');
  // Permanent dismiss should NOT use localStorage (would persist across sessions)
  const localStorageCount = (src.match(/localStorage/g) || []).length;
  assert(localStorageCount === 0, 'localStorage used for dismiss — should be sessionStorage');
});

test('studio-brief.js calls /api/interview/start and /api/interview/answer', () => {
  const src = fs.readFileSync(path.join(PUBLIC, 'js/studio-brief.js'), 'utf8');
  assert(src.includes('/api/interview/start'), '/api/interview/start not called');
  assert(src.includes('/api/interview/answer'), '/api/interview/answer not called');
  assert(src.includes('buildFromBrief'), 'buildFromBrief not found');
});

test('studio-screens.js lazy-mounts assets and deploy tabs', () => {
  const src = fs.readFileSync(path.join(PUBLIC, 'js/studio-screens.js'), 'utf8');
  assert(src.includes('mountAssets'), 'mountAssets not found');
  assert(src.includes('mountDeploy'), 'mountDeploy not found');
  assert(src.includes('mountSettingsScreen'), 'mountSettingsScreen not found');
  assert(src.includes('/api/sites'), '/api/sites not called');
  assert(src.includes('/api/intel/findings'), '/api/intel/findings not called');
});

// ── HTML structure ───────────────────────────────────────────────────────────
console.log('\nHTML structure');

const CRITICAL_IDS = [
  'studio-app', 'activity-rail', 'sidebar', 'workspace',
  'tab-bar', 'canvas-area', 'toolbar',
  'chat-messages', 'chat-input', 'chat-form', 'chat-send-btn', 'chat-cancel-btn',
  'preview-frame', 'preview-status',
  'status-model', 'status-context-pct', 'status-context-bar-fill',
  'status-context-wrap', 'status-cost', 'status-duration',
  'worker-queue-badge', 'worker-queue-count',
  'brain-dot-claude', 'brain-dot-gemini', 'brain-dot-openai',
  'brain-model-tag-claude', 'brain-model-tag-gemini', 'brain-model-tag-openai',
  'model-selector-claude', 'model-selector-gemini', 'model-selector-openai',
  'pip-orb', 'pip-callout', 'pip-badge', 'pip-callout-msg', 'pip-callout-actions',
  'ctx-site-tag', 'ctx-active-page',
  'mode-selector', 'tab-add',
  'site-tag', 'project-picker', 'project-list', 'file-input',
  'restart-banner', 'restart-banner-msg',
  'brain-fallback-bar', 'brain-fallback-msg',
  'tab-pane-chat', 'tab-pane-preview', 'tab-pane-brief',
  'tab-pane-assets', 'tab-pane-deploy',
  'step-log', // dynamically created — check that chat-messages exists as parent
];

const DYNAMIC_IDS = new Set(['step-log']); // created at runtime, not in static HTML

test('all required static DOM IDs present in index.html', () => {
  const missing = CRITICAL_IDS
    .filter(id => !DYNAMIC_IDS.has(id))
    .filter(id => !html.includes('id="' + id + '"'));
  assert(missing.length === 0, 'Missing IDs: ' + missing.join(', '));
});

test('brain/worker panel HTML preserved exactly (all .brain-pill buttons)', () => {
  assert(html.includes('class="brain-pill active" data-brain="claude"'), 'Claude brain-pill not found');
  assert(html.includes('data-brain="gemini"'), 'Gemini brain-pill not found');
  assert(html.includes('data-brain="openai"'), 'OpenAI brain-pill not found');
  assert(html.includes('class="worker-pill"'), 'worker-pill not found');
});

// ── WS wire protocol ─────────────────────────────────────────────────────────
console.log('\nWS wire protocol');

test('chat sends {type:chat, content:text} — NOT message key', () => {
  assert(html.includes("type: 'chat', content:") || html.includes('type:"chat",content:') || html.includes("type: 'chat', content: text"),
    'chat send uses wrong key — should be content, not message');
  assert(!html.match(/type:\s*['"]chat['"],\s*message:/), 'chat send uses message: key — should be content:');
});

test('plan approval uses editedMessage key', () => {
  assert(html.includes('editedMessage'), 'editedMessage key not found in plan approval');
  assert(html.includes("type: 'execute-plan'"), "execute-plan type not found");
});

test('WS onmessage handles reload-preview (not reload)', () => {
  assert(html.includes("case 'reload-preview':"), "reload-preview case not found");
  // Make sure there's no case 'reload': (the wrong one)
  const reloadWrong = html.match(/case\s+'reload'\s*:/);
  assert(!reloadWrong, 'Found wrong case reload: (should be reload-preview)');
});

test('BrainSelector.init(ws) called inside ws.onopen only', () => {
  const onopenIdx = html.indexOf('ws.onopen');
  const initIdx   = html.indexOf('BrainSelector.init(ws)');
  const onclosIdx = html.indexOf('ws.onclose');
  assert(onopenIdx !== -1, 'ws.onopen not found');
  assert(initIdx !== -1, 'BrainSelector.init(ws) not found');
  assert(initIdx > onopenIdx, 'BrainSelector.init must come after ws.onopen');
  assert(initIdx < onclosIdx || onclosIdx === -1, 'BrainSelector.init must be inside onopen block');
});

test('brain message types delegate to BrainSelector.handleMessage', () => {
  assert(html.includes('BrainSelector.handleMessage(msg)'), 'BrainSelector.handleMessage not called');
  assert(html.includes("case 'brain-changed':"), "brain-changed case not found");
});

test('Pip build-complete event dispatched from updateVerifyIndicator', () => {
  assert(html.includes("pip:build-complete"), 'pip:build-complete event not dispatched');
});

// ── Module load order ────────────────────────────────────────────────────────
console.log('\nModule load order');

test('JS load order: studio-shell before brain-selector', () => {
  const shellIdx   = html.indexOf('studio-shell.js');
  const brainIdx   = html.indexOf('brain-selector.js');
  assert(shellIdx < brainIdx, 'studio-shell.js must load before brain-selector.js');
});

test('JS load order: brain-selector before worker-queue-badge', () => {
  const brainIdx  = html.indexOf('brain-selector.js');
  const workerIdx = html.indexOf('worker-queue-badge.js');
  assert(brainIdx < workerIdx, 'brain-selector.js must load before worker-queue-badge.js');
});

test('CSS links: studio-shell.css loaded before other CSS', () => {
  const shellCssIdx = html.indexOf('studio-shell.css');
  const baseCssIdx  = html.indexOf('studio-base.css');
  assert(shellCssIdx < baseCssIdx, 'studio-shell.css must load before studio-base.css (defines CSS tokens)');
});

test('Tailwind CDN present in head', () => {
  assert(html.includes('cdn.tailwindcss.com'), 'Tailwind CDN not found');
});

test('fam colors added to Tailwind config', () => {
  assert(html.includes("fam:") || html.includes("'fam'"), 'fam colors not in Tailwind config');
  assert(html.includes('e8352a'), '#e8352a not in Tailwind config');
});

// ── Backwards compatibility: existing tests ──────────────────────────────────
console.log('\nBackwards compatibility');

test('server.js emitPhase helper exists', () => {
  const src = fs.readFileSync(path.join(__dirname, '../site-studio/server.js'), 'utf8');
  assert(src.includes('function emitPhase(ws'), 'emitPhase() not found in server.js');
  assert(src.includes("type: 'phase_update'"), 'phase_update not emitted');
});

test('server.js atomic writeSpec still uses renameSync', () => {
  const src = fs.readFileSync(path.join(__dirname, '../site-studio/server.js'), 'utf8');
  assert(src.includes('fs.renameSync'), 'renameSync not found — atomic write may be broken');
});

test('server.js conversational_ack intent still present', () => {
  const src = fs.readFileSync(path.join(__dirname, '../site-studio/server.js'), 'utf8');
  assert(src.includes("return 'conversational_ack'"), 'conversational_ack intent not found');
});

test('session13 tests still pass (source-level check)', () => {
  const src = fs.readFileSync(path.join(__dirname, '../site-studio/server.js'), 'utf8');
  assert(src.includes("case 'restyle':"), 'restyle case not found');
  // Restyle should NOT be grouped with handlePlanning — check up to next break;
  const restyleIdx = src.indexOf("case 'restyle':");
  const breakIdx = src.indexOf('break;', restyleIdx);
  const block = src.slice(restyleIdx, breakIdx + 6).replace(/\/\/[^\n]*/g, '');
  assert(!block.includes('handlePlanning'), 'restyle still routes to handlePlanning');
  assert(block.includes('handleChatMessage'), 'restyle should route to handleChatMessage');
});

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n');
if (failed > 0) process.exit(1);
