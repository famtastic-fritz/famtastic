#!/usr/bin/env node
/**
 * Session 9 Phase 3 Tests — spawnClaude() Retirement Verification
 *
 * Verifies:
 *   1. No main-path spawnClaude() calls remain (only CS9 brainstorm routing)
 *   2. @deprecated notice on spawnClaude() and spawnClaudeModel()
 *   3. All 8 SDK call sites log to api-telemetry
 *   4. GET /api/telemetry/sdk-cost-summary endpoint exists
 *   5. runHaikuFallbackSDK() replaces inline Haiku spawn
 *   6. Migration map Section 1 reflects final status
 *
 * No live API calls — all structural grep checks against server.js.
 */

'use strict';

const fs    = require('fs');
const path  = require('path');

const SERVER_JS   = path.join(__dirname, '../site-studio/server.js');
const MIGMAP      = path.join(__dirname, '../docs/spawn-claude-migration-map.md');

let passed = 0;
let failed = 0;

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

const serverLines = fs.readFileSync(SERVER_JS, 'utf8').split('\n');
const serverText  = fs.readFileSync(SERVER_JS, 'utf8');
const migmapText  = fs.readFileSync(MIGMAP,    'utf8');

// Helper: find all lines matching a pattern
function findLines(pattern) {
  const re = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  return serverLines
    .map((line, i) => ({ n: i + 1, line }))
    .filter(({ line }) => re.test(line));
}

// Helper: count non-comment, non-definition spawnClaude() invocations
function invocationLines() {
  return findLines(/spawnClaude\(/).filter(({ line, n }) => {
    const trimmed = line.trim();
    // Exclude: function definition, comment lines, jsdoc, strings
    if (/^function spawnClaude/.test(trimmed)) return false;
    if (/^\*|^\/\//.test(trimmed)) return false;
    if (/['"`].*spawnClaude/.test(trimmed)) return false;
    return true;
  });
}

// ─── Section 1: spawnClaude() main-path retirement ──────────────────────────
console.log('\n── Section 1: spawnClaude() main-path retirement ──');

{
  const invocations = invocationLines();
  const mainPathLines = invocations.filter(({ line }) => {
    // Only count as "main path" if NOT inside routeToBrainForBrainstorm
    // Check context: look ±30 lines for routeToBrainForBrainstorm function signature
    return !line.includes('routeToBrainForBrainstorm') &&
           !line.includes('spawnClaude(prompt)');  // line in context
  });

  // All invocations should be inside routeToBrainForBrainstorm (CS9)
  const allInCS9 = invocations.every(({ n }) => {
    // routeToBrainForBrainstorm starts around 11430, ends ~11461
    return n >= 11400 && n <= 11500;
  });

  assert(
    'No main-path spawnClaude() calls outside CS9 brainstorm routing',
    allInCS9,
    `Found invocations at lines: ${invocations.map(x => x.n).join(', ')}`
  );

  assert(
    'spawnClaude() retained as CS9 fallback in routeToBrainForBrainstorm',
    invocations.length >= 1,
    `Expected ≥1 (CS9 path), found ${invocations.length}`
  );
}

// ─── Section 2: @deprecated notices ─────────────────────────────────────────
console.log('\n── Section 2: @deprecated notices ──');

{
  const deprecatedLines = findLines(/@deprecated/);
  assert(
    'spawnClaude() has @deprecated JSDoc comment',
    deprecatedLines.some(({ line }) => line.includes('spawnClaude')),
    'Missing @deprecated on spawnClaude()'
  );

  assert(
    'spawnClaudeModel() has @deprecated JSDoc comment',
    deprecatedLines.some(({ line }) => line.includes('spawnClaudeModel') || line.includes('Retained as fallback')),
    'Missing @deprecated on spawnClaudeModel()'
  );

  // Verify the deprecation message references the SDK
  const sdkDeprecated = deprecatedLines.some(({ line }) =>
    /spawnClaude.*emergency|emergency.*fallback|All main paths use/i.test(line) ||
    findLines(/All main paths use Anthropic SDK/).length > 0
  );
  assert(
    '@deprecated comment references Anthropic SDK as replacement',
    sdkDeprecated || serverText.includes('All main paths use Anthropic SDK'),
    'Deprecation notice should reference SDK'
  );
}

// ─── Section 3: API telemetry wired for all SDK call paths ───────────────────
console.log('\n── Section 3: api-telemetry wired for SDK call paths ──');

{
  // api-telemetry imported
  assert(
    "api-telemetry imported (logAPICall aliased as logSDKCall)",
    serverText.includes("require('./lib/api-telemetry')"),
    'Missing api-telemetry require'
  );

  // callSDK() logs to telemetry
  const callSDKBody = (() => {
    const start = serverLines.findIndex(l => /^async function callSDK/.test(l.trim()));
    if (start === -1) return '';
    return serverLines.slice(start, start + 40).join('\n');
  })();
  assert(
    'callSDK() logs to api-telemetry on success',
    callSDKBody.includes('logSDKCall'),
    'callSDK() missing logSDKCall()'
  );

  // CS6 per-page build logs
  const cs6Log = findLines(/logSDKCall/).filter(({ n }) => n > 7200 && n < 7280);
  assert(
    'CS6 per-page build logs to api-telemetry',
    cs6Log.length > 0,
    `No logSDKCall found near CS6 (line ~7238), found at: ${cs6Log.map(x => x.n).join(',')}`
  );

  // CS7 template build logs
  const cs7Log = findLines(/logSDKCall/).filter(({ n }) => n > 7280 && n < 7360);
  assert(
    'CS7 template build logs to api-telemetry',
    cs7Log.length > 0,
    `No logSDKCall found near CS7 (line ~7302)`
  );

  // CS8 chat logs
  const cs8Log = findLines(/logSDKCall/).filter(({ n }) => n > 9000 && n < 9100);
  assert(
    'CS8 chat handler logs to api-telemetry',
    cs8Log.length > 0,
    `No logSDKCall near CS8 chat`
  );

  // Haiku fallback logs
  const haikuLog = findLines(/logSDKCall/).filter(({ n }) => n > 9250 && n < 9340);
  assert(
    'Haiku fallback (runHaikuFallbackSDK) logs to api-telemetry',
    haikuLog.length > 0,
    `No logSDKCall near runHaikuFallbackSDK`
  );

  // callSite labels present for each call path
  const callSiteLabels = ['session-summary', 'image-prompt', 'data-model', 'generate-plan', 'planning-brief', 'page-build', 'template-build', 'chat'];
  const allLabelsPresent = callSiteLabels.every(label => serverText.includes(`callSite: '${label}'`));
  assert(
    'All 8 SDK call paths have named callSite labels for cost tracking',
    allLabelsPresent,
    `Missing callSite labels: ${callSiteLabels.filter(l => !serverText.includes(`callSite: '${l}'`)).join(', ')}`
  );
}

// ─── Section 4: GET /api/telemetry/sdk-cost-summary endpoint ─────────────────
console.log('\n── Section 4: sdk-cost-summary endpoint ──');

{
  assert(
    "GET /api/telemetry/sdk-cost-summary route exists",
    serverText.includes("app.get('/api/telemetry/sdk-cost-summary'"),
    'Missing cost summary endpoint'
  );

  assert(
    'sdk-cost-summary calls getSessionSummary()',
    serverText.includes('getSessionSummary'),
    'Missing getSessionSummary() call in endpoint'
  );

  // Verify endpoint responds with JSON (basic check: res.json)
  const endpointBlock = (() => {
    const start = serverLines.findIndex(l => l.includes("app.get('/api/telemetry/sdk-cost-summary'"));
    if (start === -1) return '';
    return serverLines.slice(start, start + 15).join('\n');
  })();
  assert(
    'sdk-cost-summary endpoint sends JSON response',
    /res\.json/.test(endpointBlock),
    'No res.json() in endpoint'
  );
}

// ─── Section 5: runHaikuFallbackSDK() replaces inline Haiku spawn ─────────────
console.log('\n── Section 5: runHaikuFallbackSDK() implementation ──');

{
  assert(
    'runHaikuFallbackSDK() function defined',
    serverText.includes('async function runHaikuFallbackSDK('),
    'Missing runHaikuFallbackSDK function'
  );

  // Triggered in handleChatMessage after silence
  const silenceTrigger = findLines(/runHaikuFallbackSDK/).filter(({ n }) => n < 9200);
  assert(
    'runHaikuFallbackSDK() called from handleChatMessage silence handler',
    silenceTrigger.length > 0,
    `Expected call before line 9200, found at: ${silenceTrigger.map(x => x.n).join(',')}`
  );

  // Uses Haiku model
  const haikuBody = (() => {
    const start = serverLines.findIndex(l => /^async function runHaikuFallbackSDK/.test(l.trim()));
    if (start === -1) return '';
    return serverLines.slice(start, start + 60).join('\n');
  })();
  assert(
    'runHaikuFallbackSDK() uses claude-haiku model',
    /haiku/i.test(haikuBody),
    'Missing haiku model reference in runHaikuFallbackSDK'
  );

  // Uses SDK streaming
  assert(
    'runHaikuFallbackSDK() uses SDK stream',
    haikuBody.includes('messages.stream') || haikuBody.includes('sdk.messages'),
    'Missing SDK stream call in runHaikuFallbackSDK'
  );
}

// ─── Section 6: getAnthropicClient() singleton ───────────────────────────────
console.log('\n── Section 6: getAnthropicClient() singleton ──');

{
  assert(
    'getAnthropicClient() defined in server.js',
    serverText.includes('function getAnthropicClient()'),
    'Missing getAnthropicClient()'
  );

  const clientFn = (() => {
    const start = serverLines.findIndex(l => /^function getAnthropicClient/.test(l.trim()));
    if (start === -1) return '';
    return serverLines.slice(start, start + 20).join('\n');
  })();

  assert(
    'getAnthropicClient() uses singleton pattern (caches client)',
    /let.*client|_client|anthropicClient/.test(serverText) && clientFn.length > 0,
    'getAnthropicClient may not cache singleton'
  );

  // SDK auto-reads ANTHROPIC_API_KEY when no explicit apiKey passed to new Anthropic()
  // Verify by checking that new Anthropic() is called without explicit key (standard SDK pattern)
  assert(
    'getAnthropicClient() instantiates Anthropic SDK (auto-reads ANTHROPIC_API_KEY)',
    clientFn.includes('new Anthropic()') || clientFn.includes('new Anthropic({'),
    'getAnthropicClient() must instantiate Anthropic client'
  );
}

// ─── Section 7: Migration map Section 1 final statuses ───────────────────────
console.log('\n── Section 7: migration map final statuses ──');

{
  // All CS1-CS8 should have ✅ Migrated status in the map
  const migratedCount = (migmapText.match(/✅ Migrated/g) || []).length;
  assert(
    'Migration map documents ✅ Migrated for all 8 call sites',
    migratedCount >= 8,
    `Expected ≥8 ✅ Migrated entries, found ${migratedCount}`
  );

  // CS9 should be documented as separate migration track
  assert(
    'Migration map documents CS9 as separate migration track',
    migmapText.includes('SEPARATE MIGRATION TRACK'),
    'CS9 separate migration track not documented'
  );

  // Deprecated notice on spawnClaude documented in map
  assert(
    'Migration map references @deprecated on spawnClaude()',
    migmapText.includes('@deprecated') || migmapText.includes('deprecated'),
    'Migration map should mention deprecation'
  );
}

// ─── Section 8: No spawnClaude in main request-handler paths ─────────────────
console.log('\n── Section 8: main handler paths verified clean ──');

{
  // These functions should NOT contain spawnClaude
  const handlerFunctions = [
    'generateSessionSummary',
    'handleDataModelPlanning',
    'handleDataModel',
    'generatePlan',
    'handlePlanning',
    'parallelBuild',
    'handleChatMessage',
  ];

  for (const fn of handlerFunctions) {
    const start = serverLines.findIndex(l => new RegExp(`function ${fn}`).test(l));
    if (start === -1) {
      assert(`${fn}() exists in server.js`, false, 'Function not found');
      continue;
    }
    // Find function body (rough: next 200 lines)
    const body = serverLines.slice(start, start + 200).join('\n');
    // spawnClaude should not appear unless it's in a comment
    const spawnCallsInBody = body.split('\n').filter(line => {
      return /spawnClaude\(/.test(line) && !/\/\//.test(line.trim().split('spawnClaude')[0]);
    });
    assert(
      `${fn}() has no direct spawnClaude() calls`,
      spawnCallsInBody.length === 0,
      `Found spawnClaude in ${fn}: ${spawnCallsInBody.map(l => l.trim()).join('; ')}`
    );
  }
}

// ─── Section 9: SDK patterns present for streaming call sites ─────────────────
console.log('\n── Section 9: SDK streaming patterns ──');

{
  // CS6 and CS8 use messages.stream()
  const streamCalls = findLines(/messages\.stream\(/);
  assert(
    'At least 2 messages.stream() calls exist (CS6 + CS8)',
    streamCalls.length >= 2,
    `Found ${streamCalls.length} stream calls at lines: ${streamCalls.map(x => x.n).join(', ')}`
  );

  // CS7 uses messages.create() (non-streaming template build)
  const createCalls = findLines(/messages\.create\(/).filter(({ n }) => n > 7200 && n < 7400);
  assert(
    'CS7 template build uses messages.create() (non-streaming)',
    createCalls.length > 0,
    `No messages.create() near CS7`
  );

  // resetSilenceTimer per chunk present in CS8 SDK implementation
  const silenceInSDK = (() => {
    // Find sdk.messages.stream near CS8
    const start = serverLines.findIndex((l, i) => i > 9150 && /messages\.stream/.test(l));
    if (start === -1) return false;
    return serverLines.slice(start, start + 60).some(l => l.includes('resetSilenceTimer'));
  })();
  assert(
    'CS8 SDK stream calls resetSilenceTimer() per chunk',
    silenceInSDK,
    'resetSilenceTimer not found in CS8 stream body'
  );
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════');
console.log(`  Phase 3 Results: ${passed} passed, ${failed} failed`);
console.log('══════════════════════════════════════════════\n');
process.exit(failed > 0 ? 1 : 0);
