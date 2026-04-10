'use strict';
/**
 * session10-phase1-tests.js — Brain/Worker Split Selector
 *
 * Validates: HTML structure, CSS classes, JS functions, server.js wiring,
 * OpenAI brain routing, and status message updates.
 */

const fs   = require('fs');
const path = require('path');

const ROOT         = path.join(__dirname, '..');
const INDEX_HTML   = path.join(ROOT, 'site-studio/public/index.html');
const BRAIN_JS     = path.join(ROOT, 'site-studio/public/js/brain-selector.js');
const BRAIN_CSS    = path.join(ROOT, 'site-studio/public/css/studio-brain-selector.css');
const SERVER_JS    = path.join(ROOT, 'site-studio/server.js');

let passed = 0;
let failed = 0;

function assert(name, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ PASS — ${name}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL — ${name}${detail ? ': ' + detail : ''}`);
    failed++;
  }
}

// Read files once
const html   = fs.readFileSync(INDEX_HTML, 'utf8');
const js     = fs.readFileSync(BRAIN_JS, 'utf8');
const css    = fs.readFileSync(BRAIN_CSS, 'utf8');
const server = fs.readFileSync(SERVER_JS, 'utf8');

console.log('\n── Session 10 Phase 1: Brain/Worker Split Selector ──\n');

// 1. HTML has three brain pills (claude, gemini, openai)
assert(
  'test_brain_pill_html_has_three_brains',
  html.includes('data-brain="claude"') &&
  html.includes('data-brain="gemini"') &&
  html.includes('data-brain="openai"'),
  'All three brain data-brain attributes must be present'
);

// 2. Workers section exists with all three worker pills
assert(
  'test_workers_section_exists',
  html.includes('claude-code') &&
  html.includes('codex-cli') &&
  html.includes('gemini-cli'),
  'All three worker pill labels must be present'
);

// 3. Worker pills are <span> elements (display-only, not <button>)
// Check that the worker-pill class is on <span> elements, not <button>
const workerPillMatches = html.match(/<(button|span)[^>]*class="[^"]*worker-pill[^"]*"/g) || [];
const allWorkerPillsAreSpans = workerPillMatches.length > 0 && workerPillMatches.every(m => m.startsWith('<span'));
assert(
  'test_workers_not_selectable',
  allWorkerPillsAreSpans,
  `Worker pills must be <span> elements, found: ${workerPillMatches.join(', ')}`
);

// 4. Model selector dropdowns present for all three brains
assert(
  'test_model_selectors_in_html',
  html.includes('id="model-selector-claude"') &&
  html.includes('id="model-selector-gemini"') &&
  html.includes('id="model-selector-openai"'),
  'All three model selector IDs must be in HTML'
);

// 5. brain-selector.js has setModel function
assert(
  'test_brain_selector_js_has_setModel',
  js.includes('function setModel(') || js.includes('setModel(brain'),
  'setModel function must be defined in brain-selector.js'
);

// 6. brain-selector.js has getBrainModels function
assert(
  'test_brain_selector_js_has_getBrainModels',
  js.includes('getBrainModels'),
  'getBrainModels function must be exported from brain-selector.js'
);

// 7. server.js handles set-brain-model message
assert(
  'test_set_brain_model_handler_in_server',
  server.includes("'set-brain-model'") || server.includes('"set-brain-model"'),
  'set-brain-model WS message handler must exist in server.js'
);

// 8. ws.brainModels initialized on new connections
assert(
  'test_ws_brainModels_initialized',
  server.includes('ws.brainModels'),
  'ws.brainModels must be initialized in the per-connection state setup'
);

// 9. OpenAI is handled in brain routing (currentBrain !== 'claude' covers it)
// Verify brain-route log message exists and 'openai' is in BRAIN_LIMITS
assert(
  'test_openai_in_brain_route',
  server.includes("openai:  { dailyLimit") || server.includes("openai: { dailyLimit"),
  'openai must be in BRAIN_LIMITS to be routable'
);

// 10. Status message reflects active brain (brainLabel or 'Claude API')
assert(
  'test_status_message_shows_brain',
  server.includes('brainLabel') || server.includes('Claude API'),
  'Status message must reference brainLabel or Claude API'
);

// 11. CSS has brain-worker-panel, worker-pill, brain-model-selector classes
assert(
  'test_brain_worker_split_css_exists',
  css.includes('.brain-worker-panel') &&
  css.includes('.worker-pill') &&
  css.includes('.brain-model-selector'),
  'CSS must define .brain-worker-panel, .worker-pill, and .brain-model-selector'
);

// 12. OpenAI brain handled in routeToBrainForBrainstorm
assert(
  'test_openai_brain_handled_in_brainstorm',
  server.includes("activeBrain === 'openai'") || server.includes('brain-route:openai'),
  'routeToBrainForBrainstorm must handle openai brain specifically'
);

// Summary
console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
if (failed > 0) process.exit(1);
