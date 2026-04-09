'use strict';
/**
 * Session 8 Addendum Tests
 * Corrections 1–6 + Conversation Tagging
 */
const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;

function assert(condition, label, detail) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}${detail ? ': ' + detail : ''}`);
    failed++;
  }
}

// ── CORRECTION 1 — Real embeddings ────────────────────────────────────────────
console.log('\nCorrection 1 — Real Embeddings (not zero-vectors)');

const routerSrc = fs.readFileSync(path.join(ROOT, 'site-studio/lib/research-router.js'), 'utf8');

assert(
  routerSrc.includes('upsertRecords'),
  'research-router: primary upsert uses upsertRecords (text-based)'
);

assert(
  routerSrc.includes("inputs: { text:"),
  'research-router: primary query uses text inputs (not zero-vectors)'
);

// Each function has: text-based primary path → catch → legacy fallback.
// Verify the pattern within pineconeUpsert: upsertRecords comes before 'Fallback: legacy upsert'
const upsertFnIdx  = routerSrc.indexOf('async function pineconeUpsert');
const upsertTxtIdx = routerSrc.indexOf('upsertRecords', upsertFnIdx);
const upsertFbIdx  = routerSrc.indexOf('Fallback: legacy upsert', upsertFnIdx);
assert(
  upsertFnIdx > 0 && upsertTxtIdx > upsertFnIdx && upsertFbIdx > upsertTxtIdx,
  'research-router: within pineconeUpsert, upsertRecords (text) appears before legacy fallback',
  `fn@${upsertFnIdx}, upsertRecords@${upsertTxtIdx}, fallback@${upsertFbIdx}`
);

assert(
  routerSrc.includes('Fallback: legacy'),
  'research-router: zero-vector fallback is labeled as legacy'
);

// ── CORRECTION 2 — Multi-turn subprocess limitation documented ────────────────
console.log('\nCorrection 2 — Multi-turn Subprocess Limitation Documented');

const claudeAdapter = fs.readFileSync(
  path.join(ROOT, 'adapters/claude/fam-convo-get-claude'), 'utf8');
const geminiAdapter = fs.readFileSync(
  path.join(ROOT, 'adapters/gemini/fam-convo-get-gemini'), 'utf8');
const codexAdapter  = fs.readFileSync(
  path.join(ROOT, 'adapters/codex/fam-convo-get-codex'), 'utf8');

assert(claudeAdapter.includes('best-effort'), 'fam-convo-get-claude: multi-turn documented as best-effort');
assert(geminiAdapter.includes('best-effort'), 'fam-convo-get-gemini: multi-turn documented as best-effort');
assert(codexAdapter.includes('best-effort'),  'fam-convo-get-codex: multi-turn documented as best-effort');
assert(claudeAdapter.includes('Session 9'),   'fam-convo-get-claude: references Session 9 SDK migration');

// --input-format json must NOT be used (it doesn't exist)
assert(
  !claudeAdapter.includes('--input-format json') && !claudeAdapter.includes('input-format=json'),
  'fam-convo-get-claude: does NOT use --input-format json'
);

const cerebrumSrc = fs.readFileSync(path.join(ROOT, '.wolf/cerebrum.md'), 'utf8');
assert(cerebrumSrc.includes('SUBPROCESS_CLI_MULTI_TURN'), '.wolf/cerebrum.md: SUBPROCESS_CLI_MULTI_TURN decision entry');
assert(cerebrumSrc.includes('Session 9 SDK migration'),   '.wolf/cerebrum.md: references Session 9 for real fix');
assert(cerebrumSrc.includes('SUMMARIZATION_ALWAYS_CLAUDE'), '.wolf/cerebrum.md: SUMMARIZATION_ALWAYS_CLAUDE entry');

// ── CORRECTION 3 — iterations_to_approval removed ────────────────────────────
console.log('\nCorrection 3 — iterations_to_approval Removed');

const registrySrc = fs.readFileSync(
  path.join(ROOT, 'site-studio/lib/research-registry.js'), 'utf8');

// Check the destructuring default is gone (not the word, which may appear in comments)
assert(!registrySrc.includes('iterationsToApproval = 5'), 'research-registry: iterationsToApproval default value removed from destructure');
assert(registrySrc.includes('0.6'), 'research-registry: healthDelta weight is 0.6');
assert(registrySrc.includes('0.4'), 'research-registry: briefReuseRate weight is 0.4');
assert(registrySrc.includes('iterations_to_approval removed'), 'research-registry: removal comment present (documents why)');

// Verify computeEffectivenessFromBuild compiles and returns a number
{
  const registryModule = require(path.join(ROOT, 'site-studio/lib/research-registry.js'));
  const score = registryModule.computeEffectivenessFromBuild('build_patterns', 'test', { healthDelta: 0.5, briefReuseRate: 0.8 });
  assert(typeof score === 'number' && !isNaN(score), `research-registry: computeEffectivenessFromBuild returns a number (got ${score})`);
  assert(score >= 0 && score <= 100, `research-registry: score is 0–100 (got ${score})`);
}

// ── CORRECTION 4 — Staleness queue single worker ─────────────────────────────
console.log('\nCorrection 4 — Staleness Re-query Queue');

assert(routerSrc.includes('REQUERY_QUEUE'),        'research-router: REQUERY_QUEUE defined');
assert(routerSrc.includes('new Set()'),             'research-router: pending uses Set (deduplication)');
assert(routerSrc.includes('processing:'),           'research-router: processing flag (single worker)');
assert(routerSrc.includes('enqueueRequery'),        'research-router: enqueueRequery() function');
assert(routerSrc.includes('processRequeryQueue'),   'research-router: processRequeryQueue() function');
assert(routerSrc.includes('REQUERY_QUEUED'),        'research-router: REQUERY_QUEUED log message');
assert(
  !routerSrc.includes('setImmediate(() => backgroundRefresh'),
  'research-router: direct setImmediate(backgroundRefresh) replaced by queue'
);

// ── CORRECTION 5 — verify-quickstart → check-tools ───────────────────────────
console.log('\nCorrection 5 — verify-quickstart → check-tools');

const famHubSrc = fs.readFileSync(path.join(ROOT, 'scripts/fam-hub'), 'utf8');

assert(famHubSrc.includes('check-tools)'),      'fam-hub: check-tools subcommand exists');
assert(famHubSrc.includes('verify-quickstart)'), 'fam-hub: verify-quickstart deprecation shim exists');
assert(
  famHubSrc.includes('deprecated') && famHubSrc.includes('check-tools'),
  'fam-hub: verify-quickstart shim prints deprecation message'
);
assert(
  famHubSrc.includes('Does not verify Studio'),
  'fam-hub: check-tools help text clarifies it does not verify Studio start'
);

// Functional: run fam-hub admin check-tools
{
  const result = spawnSync('bash', [path.join(ROOT, 'scripts/fam-hub'), 'admin', 'check-tools'], { timeout: 10000 });
  assert(result.status === 0, 'fam-hub admin check-tools: exits 0');
  const out = (result.stdout || '').toString();
  assert(out.includes('node') || out.includes('npm'), 'fam-hub admin check-tools: outputs tool check results');
}

// Functional: run deprecated name — should warn and continue
{
  const result = spawnSync('bash', [path.join(ROOT, 'scripts/fam-hub'), 'admin', 'verify-quickstart'], { timeout: 10000 });
  const stderr = (result.stderr || '').toString();
  assert(stderr.includes('deprecated'), 'fam-hub admin verify-quickstart: prints deprecation warning to stderr');
}

// ── CORRECTION 6 — Migration map grep scope ──────────────────────────────────
console.log('\nCorrection 6 — Migration Map Grep Scope');

const migrationMap = fs.readFileSync(
  path.join(ROOT, 'docs/spawn-claude-migration-map.md'), 'utf8');

assert(migrationMap.includes('grep -n "spawnClaude("'),                   'migration map: spawnClaude grep documented');
assert(migrationMap.includes('grep -n "child_process'),                   'migration map: child_process grep documented');
assert(migrationMap.includes('site-studio/lib/'),                         'migration map: lib/ grep documented');
assert(migrationMap.includes('claude --print'),                           'migration map: claude --print grep documented');
assert(migrationMap.includes('Manual Review Required'),                   'migration map: Manual Review Required section');
assert(migrationMap.includes('Last verified:'),                           'migration map: verification date present');

// ── CONVERSATION TAGGING ──────────────────────────────────────────────────────
console.log('\nConversation Tagging');

const tagScript = path.join(ROOT, 'scripts/fam-convo-tag');
assert(fs.existsSync(tagScript), 'scripts/fam-convo-tag exists');
assert((fs.statSync(tagScript).mode & 0o111) !== 0, 'scripts/fam-convo-tag is executable');

const tagSrc = fs.readFileSync(tagScript, 'utf8');
assert(tagSrc.includes('#!/usr/bin/env bash'),   'fam-convo-tag: bash shebang');
assert(tagSrc.includes('build-related') || tagSrc.includes('build'), 'fam-convo-tag: build tag pattern');
assert(tagSrc.includes('component'),              'fam-convo-tag: component tag pattern');
assert(tagSrc.includes('brainstorm'),             'fam-convo-tag: brainstorm tag pattern');
assert(tagSrc.includes('|| true') || tagSrc.includes('exit 0'), 'fam-convo-tag: graceful error handling');

// Adapters include tags: []
assert(claudeAdapter.includes('tags:[]'), 'fam-convo-get-claude: jq output includes tags:[]');
assert(geminiAdapter.includes('tags:[]'), 'fam-convo-get-gemini: jq output includes tags:[]');
assert(codexAdapter.includes('tags:[]'),  'fam-convo-get-codex: jq output includes tags:[]');

// fam-convo-reconcile calls fam-convo-tag
const reconcileSrc = fs.readFileSync(path.join(ROOT, 'scripts/fam-convo-reconcile'), 'utf8');
assert(reconcileSrc.includes('fam-convo-tag'),  'fam-convo-reconcile: calls fam-convo-tag');
assert(reconcileSrc.includes('|| true'),         'fam-convo-reconcile: fam-convo-tag is non-blocking');

// Functional: run fam-convo-tag on a minimal test file
{
  const testFile = path.join(os.tmpdir(), 'fam-tag-test-' + Date.now() + '.json');
  const testData = JSON.stringify({
    messages: [
      { role: 'user', content: 'discuss the component library export' },
      { role: 'assistant', content: 'The component export system allows you to build and save reusable components.' }
    ]
  });
  fs.writeFileSync(testFile, testData);
  try {
    const result = spawnSync('bash', [tagScript, testFile], { timeout: 5000 });
    assert(result.status === 0, `fam-convo-tag functional: exits 0 (got ${result.status})`);
    const tagged = JSON.parse(fs.readFileSync(testFile, 'utf8'));
    assert(Array.isArray(tagged.messages), 'fam-convo-tag functional: output preserves messages array');
    const asst = tagged.messages.find(m => m.role === 'assistant');
    assert(asst && Array.isArray(asst.tags), 'fam-convo-tag functional: assistant message has tags array');
    assert(
      asst && asst.tags.length > 0,
      `fam-convo-tag functional: assistant message got at least one tag (tags: ${JSON.stringify(asst?.tags)})`
    );
  } finally {
    try { fs.unlinkSync(testFile); } catch {}
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(60));
console.log(`Session 8 Addendum: ${passed + failed} tests — ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
