#!/usr/bin/env node
/**
 * Session 8 — Phase 0: cj-* to fam-convo-* rename verification tests
 *
 * Verifies:
 *   - New fam-convo-* files exist and are executable
 *   - fam-hub dispatcher no longer references cj-* names
 *   - server.js adapterNames uses fam-convo-get-* not cj-get-convo-*
 *   - No cj-* references in updated session7 test files
 *   - Deprecation shims exist at old cj-* paths
 *   - Shims contain the deprecation warning text
 *   - Shims are executable
 *   - fam-convo-reconcile internally references fam-convo-generate-latest
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

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

function isExecutable(filePath) {
  try {
    return !!(fs.statSync(filePath).mode & 0o111);
  } catch (_) {
    return false;
  }
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (_) {
    return '';
  }
}

// ── GROUP 1: New fam-convo-* files exist and are executable ──────────────────

console.log('\n── New fam-convo-* files exist and are executable ───────────────────');

const newScripts = [
  { file: path.join(ROOT, 'scripts', 'fam-convo-compose'),          name: 'fam-convo-compose' },
  { file: path.join(ROOT, 'scripts', 'fam-convo-reconcile'),        name: 'fam-convo-reconcile' },
  { file: path.join(ROOT, 'scripts', 'fam-convo-ingest'),           name: 'fam-convo-ingest' },
  { file: path.join(ROOT, 'scripts', 'fam-convo-promote'),          name: 'fam-convo-promote' },
  { file: path.join(ROOT, 'scripts', 'fam-convo-generate-latest'),  name: 'fam-convo-generate-latest' },
  { file: path.join(ROOT, 'adapters', 'claude', 'fam-convo-get-claude'), name: 'fam-convo-get-claude' },
  { file: path.join(ROOT, 'adapters', 'gemini', 'fam-convo-get-gemini'), name: 'fam-convo-get-gemini' },
  { file: path.join(ROOT, 'adapters', 'codex',  'fam-convo-get-codex'),  name: 'fam-convo-get-codex' },
];

for (const { file, name } of newScripts) {
  assert(fs.existsSync(file), `${name}: file exists`);
  assert(isExecutable(file), `${name}: is executable`);
}

// ── GROUP 2: fam-hub dispatcher no longer references cj-* ────────────────────

console.log('\n── fam-hub dispatcher has no cj-* references ────────────────────────');

{
  const famHubSrc = readFile(path.join(ROOT, 'scripts', 'fam-hub'));
  assert(!famHubSrc.includes('cj-reconcile-convo'),
    'fam-hub: no reference to cj-reconcile-convo');
  assert(!famHubSrc.includes('cj-ingest'),
    'fam-hub: no reference to cj-ingest');
  assert(!famHubSrc.includes('cj-promote'),
    'fam-hub: no reference to cj-promote');
  assert(famHubSrc.includes('fam-convo-reconcile'),
    'fam-hub: uses fam-convo-reconcile');
  assert(famHubSrc.includes('fam-convo-ingest'),
    'fam-hub: uses fam-convo-ingest');
  assert(famHubSrc.includes('fam-convo-promote'),
    'fam-hub: uses fam-convo-promote');
}

// ── GROUP 3: server.js adapterNames uses fam-convo-get-* ─────────────────────

console.log('\n── server.js adapterNames uses fam-convo-get-* ──────────────────────');

{
  const serverSrc = readFile(path.join(ROOT, 'site-studio', 'server.js'));
  assert(serverSrc.includes("'fam-convo-get-claude'"),
    'server.js: adapterNames.claude is fam-convo-get-claude');
  assert(serverSrc.includes("'fam-convo-get-gemini'"),
    'server.js: adapterNames.gemini is fam-convo-get-gemini');
  assert(serverSrc.includes("'fam-convo-get-codex'"),
    'server.js: adapterNames.codex is fam-convo-get-codex');
  assert(!serverSrc.includes("'cj-get-convo-claude'"),
    'server.js: no old cj-get-convo-claude reference');
  assert(!serverSrc.includes("'cj-get-convo-gemini'"),
    'server.js: no old cj-get-convo-gemini reference');
  assert(!serverSrc.includes("'cj-get-convo-codex'"),
    'server.js: no old cj-get-convo-codex reference');
}

// ── GROUP 4: No cj-* references in updated session7 test files ───────────────

console.log('\n── No cj-* references in updated session7 test files ────────────────');

{
  const p0src = readFile(path.join(ROOT, 'tests', 'session7-phase0-tests.js'));
  const p2src = readFile(path.join(ROOT, 'tests', 'session7-phase2-tests.js'));

  // phase0 tests should not reference old cj-get-convo-* paths for adapters
  assert(!p0src.includes('cj-get-convo-claude') &&
         !p0src.includes('cj-get-convo-gemini') &&
         !p0src.includes('cj-get-convo-codex'),
    'session7-phase0-tests.js: no cj-get-convo-* adapter references');

  // phase0 tests should not reference old generate-latest-convo path
  assert(!p0src.includes("'scripts', 'generate-latest-convo'") &&
         !p0src.includes("sh('scripts/generate-latest-convo')"),
    'session7-phase0-tests.js: no old generate-latest-convo path references');

  // phase0 tests should not reference old cj-reconcile-convo
  assert(!p0src.includes("'cj-reconcile-convo'") && !p0src.includes('/cj-reconcile-convo'),
    'session7-phase0-tests.js: no cj-reconcile-convo references');

  // phase2 tests should not reference old cj-get-convo-* names
  assert(!p2src.includes('cj-get-convo-claude') &&
         !p2src.includes('cj-get-convo-gemini') &&
         !p2src.includes('cj-get-convo-codex'),
    'session7-phase2-tests.js: no cj-get-convo-* references');
}

// ── GROUP 5: Deprecation shims exist at old paths ────────────────────────────

console.log('\n── Deprecation shims exist at old cj-* paths ────────────────────────');

const oldPaths = [
  { file: path.join(ROOT, 'scripts', 'cj-compose-convo'),    newName: 'fam-convo-compose' },
  { file: path.join(ROOT, 'scripts', 'cj-reconcile-convo'),  newName: 'fam-convo-reconcile' },
  { file: path.join(ROOT, 'scripts', 'cj-ingest'),           newName: 'fam-convo-ingest' },
  { file: path.join(ROOT, 'scripts', 'cj-promote'),          newName: 'fam-convo-promote' },
  { file: path.join(ROOT, 'scripts', 'generate-latest-convo'), newName: 'fam-convo-generate-latest' },
  { file: path.join(ROOT, 'adapters', 'claude', 'cj-get-convo-claude'), newName: 'fam-convo-get-claude' },
  { file: path.join(ROOT, 'adapters', 'gemini', 'cj-get-convo-gemini'), newName: 'fam-convo-get-gemini' },
  { file: path.join(ROOT, 'adapters', 'codex',  'cj-get-convo-codex'),  newName: 'fam-convo-get-codex' },
];

for (const { file, newName } of oldPaths) {
  const basename = path.basename(file);
  assert(fs.existsSync(file), `${basename}: shim file exists`);
  assert(isExecutable(file), `${basename}: shim is executable`);

  const src = readFile(file);
  assert(src.includes('deprecated'), `${basename}: shim contains "deprecated" warning`);
  assert(src.includes(newName), `${basename}: shim references new name (${newName})`);
  assert(src.includes('WARNING:'), `${basename}: shim contains "WARNING:" prefix`);
}

// ── GROUP 6: fam-convo-reconcile uses fam-convo-generate-latest internally ───

console.log('\n── fam-convo-reconcile internal references ───────────────────────────');

{
  const reconcileSrc = readFile(path.join(ROOT, 'scripts', 'fam-convo-reconcile'));
  assert(reconcileSrc.includes('fam-convo-generate-latest'),
    'fam-convo-reconcile: calls fam-convo-generate-latest (not old name)');
  assert(!reconcileSrc.includes('generate-latest-convo') ||
    reconcileSrc.indexOf('fam-convo-generate-latest') < reconcileSrc.length,
    'fam-convo-reconcile: old generate-latest-convo name not used (replaced)');
  assert(reconcileSrc.includes('fam-convo-compose'),
    'fam-convo-reconcile: calls fam-convo-compose (not cj-compose-convo)');
}

// ── Results ───────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
console.log(`Session 8 Phase 0: ${passed + failed} tests — ${passed} passed, ${failed} failed`);

if (failures.length > 0) {
  console.log('\nFailures:');
  failures.forEach(f => console.log(`  ✗ ${f.name}${f.detail ? ' — ' + f.detail : ''}`));
}

process.exit(failed > 0 ? 1 : 0);
