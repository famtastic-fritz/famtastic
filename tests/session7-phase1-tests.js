#!/usr/bin/env node
/**
 * Session 7 — Phase 1: Universal Context File Tests
 *
 * Verifies:
 *   - studio-events.js: correct event constants, singleton emitter
 *   - studio-context-writer.js: generates STUDIO-CONTEXT.md with correct sections
 *   - brain-injector.js: Claude (CLAUDE.md append), Gemini/Codex (sidecar)
 *   - server.js wiring: requires, endpoints, event hooks present
 *   - Event hooks fire STUDIO-CONTEXT.md regeneration
 *
 * Runs without a live server (file-level checks + direct module invocation).
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const ROOT        = path.resolve(__dirname, '..');
const STUDIO_LIB  = path.join(ROOT, 'site-studio', 'lib');
const HUB_ROOT    = ROOT;

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

function tempDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'fam-p1-')); }

// ── GROUP: studio-events.js ──────────────────────────────────────────────────

console.log('\n── studio-events.js ──────────────────────────────────────────────');

{
  const eventsFile = path.join(STUDIO_LIB, 'studio-events.js');
  assert(fs.existsSync(eventsFile), 'studio-events.js exists');

  const { STUDIO_EVENTS, studioEvents } = require(eventsFile);

  assert(typeof STUDIO_EVENTS === 'object',          'STUDIO_EVENTS exported as object');
  assert(typeof STUDIO_EVENTS.SESSION_STARTED === 'string', 'SESSION_STARTED event defined');
  assert(typeof STUDIO_EVENTS.SITE_SWITCHED === 'string',   'SITE_SWITCHED event defined');
  assert(typeof STUDIO_EVENTS.BUILD_STARTED === 'string',   'BUILD_STARTED event defined');
  assert(typeof STUDIO_EVENTS.BUILD_COMPLETED === 'string', 'BUILD_COMPLETED event defined');
  assert(typeof STUDIO_EVENTS.EDIT_APPLIED === 'string',    'EDIT_APPLIED event defined');
  assert(typeof STUDIO_EVENTS.COMPONENT_INSERTED === 'string', 'COMPONENT_INSERTED event defined');
  assert(typeof STUDIO_EVENTS.DEPLOY_COMPLETED === 'string', 'DEPLOY_COMPLETED event defined');
  assert(typeof STUDIO_EVENTS.BRAIN_SWITCHED === 'string',  'BRAIN_SWITCHED event defined');

  assert(Object.keys(STUDIO_EVENTS).length >= 7, 'At least 7 event types defined');

  assert(studioEvents !== null && typeof studioEvents.on === 'function',
    'studioEvents is an EventEmitter (has .on method)');
  assert(typeof studioEvents.emit === 'function', 'studioEvents.emit available');

  // Test event emission
  let received = null;
  studioEvents.once(STUDIO_EVENTS.SITE_SWITCHED, payload => { received = payload; });
  studioEvents.emit(STUDIO_EVENTS.SITE_SWITCHED, { tag: 'test-site' });
  assert(received !== null && received.tag === 'test-site', 'Event emission and receipt works');
}

// ── GROUP: studio-context-writer.js ─────────────────────────────────────────

console.log('\n── studio-context-writer.js ──────────────────────────────────────');

{
  const writerFile = path.join(STUDIO_LIB, 'studio-context-writer.js');
  assert(fs.existsSync(writerFile), 'studio-context-writer.js exists');

  const writer = require(writerFile);
  assert(typeof writer.init === 'function',       'writer.init() exported');
  assert(typeof writer.generate === 'function',   'writer.generate() exported');
  assert(typeof writer.OUTPUT_FILENAME === 'string', 'OUTPUT_FILENAME exported');
  assert(writer.OUTPUT_FILENAME === 'STUDIO-CONTEXT.md', 'OUTPUT_FILENAME is STUDIO-CONTEXT.md');

  // Create an isolated test environment
  const tmpDir   = tempDir();
  const sitesDir = path.join(tmpDir, 'sites', 'test-site');
  const compDir  = path.join(tmpDir, 'components');
  fs.mkdirSync(sitesDir, { recursive: true });
  fs.mkdirSync(compDir, { recursive: true });

  // Write minimal spec.json
  const spec = {
    tag: 'test-site',
    site_name: 'Test Garage Sales',
    business_type: 'retail',
    pages: ['index', 'shop', 'about'],
    state: 'draft',
    design_brief: {
      description: 'A garage sale aggregator for the community.',
      industry: 'retail'
    }
  };
  fs.writeFileSync(path.join(sitesDir, 'spec.json'), JSON.stringify(spec, null, 2));

  // Write minimal library.json
  const lib = {
    version: '1.0',
    components: [
      { id: 'hero-section', name: 'Hero Section', type: 'hero', last_updated: '2026-04-09' },
      { id: 'product-card', name: 'Product Card',  type: 'card', last_updated: '2026-04-08' },
    ],
    last_updated: '2026-04-09'
  };
  fs.writeFileSync(path.join(compDir, 'library.json'), JSON.stringify(lib, null, 2));

  // Re-require writer to get a fresh instance for this test
  // (it's already required above but init hasn't been called yet for this dir)
  const freshWriter = require(writerFile);

  // Run generate directly (bypasses init)
  let genError = null;
  freshWriter.generate('test_event', { tag: 'test-site' }).then(() => {}).catch(e => { genError = e; });

  // Wait a tick for the async generate to complete
  setImmediate(() => {
    // Context written to ROOT (writer uses getHubRoot() result — which is ROOT in init)
    // For direct generate() call without init, it checks _ctx which is null → returns early
    // So we use init() to properly test
  });

  // Initialize with the temp dir
  freshWriter.init({
    getTag:     () => 'test-site',
    getSpec:    () => spec,
    getHubRoot: () => tmpDir,
  });

  // Give the async generate a moment
  setTimeout(() => {
    const ctxFile = path.join(tmpDir, 'STUDIO-CONTEXT.md');
    assert(fs.existsSync(ctxFile), 'STUDIO-CONTEXT.md created after init()');

    if (fs.existsSync(ctxFile)) {
      const content = fs.readFileSync(ctxFile, 'utf8');

      assert(content.includes('# FAMtastic Studio — Current Context'),
        'Context file has correct title');
      assert(content.includes('## Generated:'), 'Context file has Generated timestamp');
      assert(content.includes('## Active Site: test-site'), 'Context file has correct Active Site');
      assert(content.includes('## Current Site Brief'), 'Context file has Current Site Brief section');
      assert(content.includes('Test Garage Sales'),       'Brief summary includes site name');
      assert(content.includes('## Current Site State'),   'Context file has Current Site State section');
      assert(content.includes('index, shop, about'),      'Site state lists all pages');
      assert(content.includes('## Component Library'),    'Context file has Component Library section');
      assert(content.includes('Total components: 2'),     'Component count is correct');
      assert(content.includes('Hero Section') || content.includes('Product Card'),
        'Recently updated components listed');
      assert(content.includes('## Available Tools'),      'Context file has Available Tools section');
      assert(content.includes('## Standing Rules'),       'Context file has Standing Rules section');
      assert(content.includes('process.env.SITE_TAG'),    'Standing rules include TAG warning');

    }

    fs.rmSync(tmpDir, { recursive: true, force: true });
  }, 300);
}

// ── GROUP: brain-injector.js ─────────────────────────────────────────────────

console.log('\n── brain-injector.js ─────────────────────────────────────────────');

{
  const injectorFile = path.join(STUDIO_LIB, 'brain-injector.js');
  assert(fs.existsSync(injectorFile), 'brain-injector.js exists');

  const injector = require(injectorFile);
  assert(typeof injector.inject === 'function',           'inject() exported');
  assert(typeof injector.readContext === 'function',      'readContext() exported');
  assert(typeof injector.getContextPathForBrain === 'function', 'getContextPathForBrain() exported');
  assert(typeof injector.CLAUDE_MD_INCLUDE_MARKER === 'string', 'CLAUDE_MD_INCLUDE_MARKER exported');

  const tmpDir  = tempDir();
  const ctxFile = path.join(tmpDir, 'STUDIO-CONTEXT.md');
  const claudeMdFile = path.join(tmpDir, 'CLAUDE.md');

  // Create minimal test files
  fs.writeFileSync(ctxFile, '# FAMtastic Studio — Current Context\n## Generated: 2026-04-09T00:00:00.000Z\n## Active Site: test\n');
  fs.writeFileSync(claudeMdFile, '# FAMtastic Global Rules\n\nDo good things.\n');

  // Test Claude injection
  const claudeResult = injector.inject('claude', ctxFile, { claudeMdPath: claudeMdFile });
  assert(claudeResult.success === true, 'inject("claude") returns success: true');
  const claudeMdContent = fs.readFileSync(claudeMdFile, 'utf8');
  assert(claudeMdContent.includes('@STUDIO-CONTEXT.md'),
    'inject("claude") appended @STUDIO-CONTEXT.md to CLAUDE.md');
  assert(claudeMdContent.includes(injector.CLAUDE_MD_INCLUDE_MARKER),
    'inject("claude") includes the include marker');

  // Test idempotency — calling inject again should not double-add
  const claudeResult2 = injector.inject('claude', ctxFile, { claudeMdPath: claudeMdFile });
  assert(claudeResult2.action === 'already_present',
    'inject("claude") is idempotent — already_present on re-injection');
  const occurrences = (fs.readFileSync(claudeMdFile, 'utf8').match(/@STUDIO-CONTEXT\.md/g) || []).length;
  assert(occurrences === 1, `@STUDIO-CONTEXT.md appears exactly once in CLAUDE.md (got ${occurrences})`);

  // Test Gemini injection
  const geminiResult = injector.inject('gemini', ctxFile);
  assert(geminiResult.success === true, 'inject("gemini") returns success: true');
  assert(geminiResult.action === 'sidecar_written', 'inject("gemini") writes sidecar');
  const geminiSidecar = path.join(tmpDir, '.brain-context-gemini');
  assert(fs.existsSync(geminiSidecar), 'Gemini sidecar file created');
  assert(fs.readFileSync(geminiSidecar, 'utf8').trim() === ctxFile,
    'Gemini sidecar contains path to context file');

  // Test Codex injection
  const codexResult = injector.inject('codex', ctxFile);
  assert(codexResult.success === true, 'inject("codex") returns success: true');
  const codexSidecar = path.join(tmpDir, '.brain-context-codex');
  assert(fs.existsSync(codexSidecar), 'Codex sidecar file created');

  // Test readContext
  const contextContent = injector.readContext(ctxFile);
  assert(typeof contextContent === 'string' && contextContent.length > 0, 'readContext returns non-empty string');
  assert(contextContent.includes('FAMtastic Studio'), 'readContext returns correct content');

  // Test getContextPathForBrain
  const geminiCtxPath = injector.getContextPathForBrain('gemini', tmpDir);
  assert(geminiCtxPath === ctxFile, 'getContextPathForBrain returns correct path for gemini');

  // Test readContext with missing file
  const emptyResult = injector.readContext('/nonexistent/STUDIO-CONTEXT.md');
  assert(emptyResult === '', 'readContext returns empty string for missing file');

  fs.rmSync(tmpDir, { recursive: true, force: true });
}

// ── GROUP: server.js wiring ──────────────────────────────────────────────────

console.log('\n── server.js wiring ──────────────────────────────────────────────');

{
  const serverSrc = fs.readFileSync(path.join(ROOT, 'site-studio', 'server.js'), 'utf8');

  assert(serverSrc.includes("require('./lib/studio-events')"),
    'server.js requires studio-events');
  assert(serverSrc.includes("require('./lib/studio-context-writer')"),
    'server.js requires studio-context-writer');
  assert(serverSrc.includes("require('./lib/brain-injector')"),
    'server.js requires brain-injector');

  assert(serverSrc.includes('studioContextWriter.init('),
    'server.js calls studioContextWriter.init() on startup');
  assert(serverSrc.includes("STUDIO_EVENTS.SESSION_STARTED"),
    'server.js emits SESSION_STARTED');
  assert(serverSrc.includes("STUDIO_EVENTS.SITE_SWITCHED"),
    'server.js emits SITE_SWITCHED');
  assert(serverSrc.includes("STUDIO_EVENTS.BUILD_COMPLETED"),
    'server.js emits BUILD_COMPLETED in finishParallelBuild');
  assert(serverSrc.includes("STUDIO_EVENTS.EDIT_APPLIED"),
    'server.js emits EDIT_APPLIED in /api/content-field');
  assert(serverSrc.includes("STUDIO_EVENTS.DEPLOY_COMPLETED"),
    'server.js emits DEPLOY_COMPLETED in runDeploy');
  assert(serverSrc.includes("STUDIO_EVENTS.COMPONENT_INSERTED"),
    'server.js emits COMPONENT_INSERTED in /api/components/export');

  assert(serverSrc.includes("brainInjector.inject('claude'"),
    'server.js calls brainInjector.inject for claude on startup');
  assert(serverSrc.includes("brainInjector.inject('gemini'"),
    'server.js calls brainInjector.inject for gemini on startup');
  assert(serverSrc.includes("brainInjector.inject('codex'"),
    'server.js calls brainInjector.inject for codex on startup');

  assert(serverSrc.includes("app.get('/api/context'"),
    'server.js has GET /api/context endpoint');
  assert(serverSrc.includes("app.post('/api/context/refresh'"),
    'server.js has POST /api/context/refresh endpoint');

  assert(serverSrc.includes('studioContextWriter.OUTPUT_FILENAME'),
    'server.js uses OUTPUT_FILENAME constant (not hardcoded path)');
}

// ── GROUP: All events trigger update ─────────────────────────────────────────

console.log('\n── All events trigger update ──────────────────────────────────────');

{
  // We test this by verifying subscriptions are wired in the writer
  const writerSrc = fs.readFileSync(path.join(STUDIO_LIB, 'studio-context-writer.js'), 'utf8');

  assert(writerSrc.includes('Object.values(STUDIO_EVENTS).forEach'),
    'writer subscribes to ALL events via Object.values(STUDIO_EVENTS)');
  assert(writerSrc.includes("studioEvents.on(eventName"),
    'writer registers handler for each event name');
  assert(writerSrc.includes("generate(eventName, payload)"),
    'writer calls generate() on each event');

  // Verify the writer emits on init
  assert(writerSrc.includes("generate('init'"),
    'writer calls generate on init (immediate first write)');

  // Event constants correct format
  const { STUDIO_EVENTS } = require(path.join(STUDIO_LIB, 'studio-events.js'));
  const allEvents = Object.values(STUDIO_EVENTS);
  assert(allEvents.every(e => e.includes(':')),
    'All event names use namespaced format (e.g. "session:started")');

  // Verify server.js SITE_SWITCHED is emitted in BOTH switch-site handlers
  const serverSrc = fs.readFileSync(path.join(ROOT, 'site-studio', 'server.js'), 'utf8');
  const siteSwitch = serverSrc.match(/STUDIO_EVENTS\.SITE_SWITCHED/g) || [];
  assert(siteSwitch.length >= 2,
    `SITE_SWITCHED emitted in at least 2 places (switch + new site) — found ${siteSwitch.length}`);
}

// ── Results — wait for async tests ───────────────────────────────────────────

setTimeout(() => {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Session 7 Phase 1: ${passed + failed} tests — ${passed} passed, ${failed} failed`);

  if (failures.length > 0) {
    console.log('\nFailures:');
    failures.forEach(f => console.log(`  ✗ ${f.name}${f.detail ? ' — ' + f.detail : ''}`));
  }

  process.exit(failed > 0 ? 1 : 0);
}, 600);
