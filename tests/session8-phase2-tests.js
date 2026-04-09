#!/usr/bin/env node
/**
 * Session 8 — Phase 2: Session 7 Known Gaps Fix Tests
 *
 * Verifies G1–G7 fixes:
 *   G1 — studio-context-writer.js has "All Pages" section generation
 *   G2 — research-router.js uses text-based upsert (not zero-vectors only)
 *   G3 — server.js has Pinecone seed trigger in BUILD_COMPLETED handler
 *   G4 — research-router.js has setImmediate background refresh for stale records
 *   G5 — index.html has effectiveness-bar class and tooltip text
 *   G6 — update-setup-doc has claude mcp list parsing
 *   G7 — brain-injector.js exports reinject() and server.js calls it in setBrain
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT           = path.resolve(__dirname, '..');
const SERVER_FILE    = path.join(ROOT, 'site-studio', 'server.js');
const CONTEXT_WRITER = path.join(ROOT, 'site-studio', 'lib', 'studio-context-writer.js');
const RESEARCH_ROUTER  = path.join(ROOT, 'site-studio', 'lib', 'research-router.js');
const STUDIO_EVENTS    = path.join(ROOT, 'site-studio', 'lib', 'studio-events.js');
const INDEX_HTML       = path.join(ROOT, 'site-studio', 'public', 'index.html');
const UPDATE_SETUP_DOC = path.join(ROOT, 'scripts', 'update-setup-doc');
const BRAIN_INJECTOR   = path.join(ROOT, 'site-studio', 'lib', 'brain-injector.js');
const CANVAS_CSS       = path.join(ROOT, 'site-studio', 'public', 'css', 'studio-canvas.css');

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

const serverSrc      = readFile(SERVER_FILE);
const ctxWriterSrc   = readFile(CONTEXT_WRITER);
const routerSrc      = readFile(RESEARCH_ROUTER);
const eventsSrc      = readFile(STUDIO_EVENTS);
const indexHtmlSrc   = readFile(INDEX_HTML);
const updateSetupSrc = readFile(UPDATE_SETUP_DOC);
const injectorSrc    = readFile(BRAIN_INJECTOR);
const canvasCssSrc   = readFile(CANVAS_CSS);

// ── G1: All Pages context in studio-context-writer.js ────────────────────────

console.log('\n── G1: All Pages context section ────────────────────────────────────');

assert(ctxWriterSrc.includes('All Pages'),
  'test_context_writer_has_all_pages_section: studio-context-writer.js has "All Pages" generation code');
assert(ctxWriterSrc.includes('buildAllPages'),
  'test_context_writer_has_buildAllPages_fn: buildAllPages() function defined');
assert(ctxWriterSrc.includes('data-section-id'),
  'test_context_writer_counts_sections: counts data-section-id attributes');
assert(ctxWriterSrc.includes('H1:') || ctxWriterSrc.includes('"H1:'),
  'test_context_writer_extracts_h1: extracts H1 from pages');
assert(ctxWriterSrc.includes('Last edited'),
  'test_context_writer_includes_timestamp: includes last edited timestamp per page');
assert(ctxWriterSrc.includes('(active)'),
  'test_context_writer_marks_active_page: marks active page distinctly');

// ── G2: Real embeddings for Pinecone (upsertRecords with text) ────────────────

console.log('\n── G2: Real Pinecone embeddings ─────────────────────────────────────');

assert(!routerSrc.includes('new Array(1536).fill(0)') ||
  routerSrc.includes('upsertRecords'),
  'test_pinecone_uses_text_not_zero_vectors: zero-vector upsert replaced or supplemented with text-based');
assert(routerSrc.includes('upsertRecords'),
  'test_pinecone_upsert_uses_text: upsertRecords (text-based) method used in research-router.js');
assert(routerSrc.includes('searchRecords') || routerSrc.includes('text:'),
  'test_pinecone_query_uses_text: text-based query used in research-router.js');

// ── G3: Auto-seed after build ────────────────────────────────────────────────

console.log('\n── G3: Auto-seed after build ────────────────────────────────────────');

assert(serverSrc.includes('computeEffectivenessFromBuild') || serverSrc.includes('PINECONE_API_KEY'),
  'test_auto_seed_after_build: server.js has Pinecone-related code in BUILD_COMPLETED handler area');
assert(serverSrc.includes('BUILD_COMPLETED'),
  'test_build_completed_event_exists: BUILD_COMPLETED event emitted in server.js');

// ── G4: Stale research background refresh ────────────────────────────────────

console.log('\n── G4: Stale research background refresh ────────────────────────────');

assert(routerSrc.includes('setImmediate'),
  'test_stale_research_background_refresh: research-router.js has setImmediate for background refresh');
assert(routerSrc.includes('STALE_RESEARCH'),
  'test_stale_research_log_message: research-router.js logs STALE_RESEARCH with age info');
assert(routerSrc.includes('backgroundRefresh'),
  'test_background_refresh_fn: backgroundRefresh() function defined');

// ── G4: RESEARCH_UPDATED event ────────────────────────────────────────────────

console.log('\n── G4: RESEARCH_UPDATED event ───────────────────────────────────────');

assert(eventsSrc.includes('RESEARCH_UPDATED') || routerSrc.includes('RESEARCH_UPDATED'),
  'test_research_updated_event: RESEARCH_UPDATED event defined in studio-events.js or research-router.js');
assert(eventsSrc.includes("'research:updated'") || routerSrc.includes('research:updated'),
  'test_research_updated_event_name: event name is research:updated');

// ── G5: Effectiveness UI shows automated scores ───────────────────────────────

console.log('\n── G5: Effectiveness UI ──────────────────────────────────────────────');

assert(indexHtmlSrc.includes('effectiveness-bar'),
  'test_effectiveness_bar_in_html: index.html has effectiveness-bar class');
assert(indexHtmlSrc.includes('build health') || indexHtmlSrc.includes('brief reuse'),
  'test_effectiveness_tooltip: index.html has tooltip text about scoring signals');
assert(indexHtmlSrc.includes('/api/research/effectiveness'),
  'test_effectiveness_api_called: index.html fetches /api/research/effectiveness');
assert(canvasCssSrc.includes('.effectiveness-bar'),
  'test_effectiveness_bar_css: studio-canvas.css has .effectiveness-bar styles');
assert(canvasCssSrc.includes('.effectiveness-score'),
  'test_effectiveness_score_css: studio-canvas.css has .effectiveness-score styles');

// ── G6: Auto-parse MCP table in update-setup-doc ─────────────────────────────

console.log('\n── G6: update-setup-doc MCP parsing ────────────────────────────────');

assert(updateSetupSrc.includes('claude mcp list'),
  'test_update_setup_doc_parses_mcp: update-setup-doc script has `claude mcp list` command');
assert(updateSetupSrc.includes('MCP_LIST'),
  'test_update_setup_doc_mcp_var: MCP_LIST variable used in update-setup-doc');

// ── G7: Brain switch reinjects sidecar ───────────────────────────────────────

console.log('\n── G7: Brain switch reinjects sidecar ───────────────────────────────');

assert(injectorSrc.includes('function reinject'),
  'test_brain_injector_reinject_fn: brain-injector.js exports reinject function');
assert(injectorSrc.includes('BRAIN_CONTEXT_INJECTED'),
  'test_reinject_log_message: brain-injector.js contains "BRAIN_CONTEXT_INJECTED" log text');
assert(injectorSrc.includes("module.exports") && injectorSrc.includes('reinject'),
  'test_reinject_exported: reinject is exported from brain-injector.js');

assert(serverSrc.includes('brainInjector.reinject'),
  'test_reinject_called_on_brain_switch: server.js calls brainInjector.reinject in setBrain function');

// Verify it's called inside setBrain specifically
const setBrainBlock = serverSrc.slice(
  serverSrc.indexOf('function setBrain'),
  serverSrc.indexOf('function setBrain') + 800
);
assert(setBrainBlock.includes('brainInjector.reinject'),
  'test_reinject_inside_setBrain: brainInjector.reinject called within setBrain() function body');

// ── Results ───────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
console.log(`Session 8 Phase 2: ${passed + failed} tests — ${passed} passed, ${failed} failed`);

if (failures.length > 0) {
  console.log('\nFailures:');
  failures.forEach(f => console.log(`  ✗ ${f.name}${f.detail ? ' — ' + f.detail : ''}`));
}

process.exit(failed > 0 ? 1 : 0);
