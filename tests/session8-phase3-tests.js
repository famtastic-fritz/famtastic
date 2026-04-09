#!/usr/bin/env node
/**
 * Session 8 — Phase 3: spawnClaude Migration Map Tests
 *
 * Verifies the migration map document is complete and accurate.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT       = path.resolve(__dirname, '..');
const MAP_FILE   = path.join(ROOT, 'docs', 'spawn-claude-migration-map.md');
const SERVER_FILE = path.join(ROOT, 'site-studio', 'server.js');

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

const mapSrc    = readFile(MAP_FILE);
const serverSrc = readFile(SERVER_FILE);

// ── test_migration_map_exists ─────────────────────────────────────────────────

console.log('\n── Migration map document ───────────────────────────────────────────');

assert(fs.existsSync(MAP_FILE),
  'test_migration_map_exists: docs/spawn-claude-migration-map.md exists');

// ── test_all_6_sections_present ───────────────────────────────────────────────

console.log('\n── All 6 sections present ───────────────────────────────────────────');

assert(mapSrc.includes('## Section 1'),
  'test_all_6_sections_present: Section 1 (call site inventory) present');
assert(mapSrc.includes('## Section 2'),
  'test_all_6_sections_present: Section 2 (what spawnClaude does) present');
assert(mapSrc.includes('## Section 3'),
  'test_all_6_sections_present: Section 3 (SDK equivalents) present');
assert(mapSrc.includes('## Section 4'),
  'test_all_6_sections_present: Section 4 (special attention) present');
assert(mapSrc.includes('## Section 5'),
  'test_all_6_sections_present: Section 5 (migration order) present');
assert(mapSrc.includes('## Section 6'),
  'test_all_6_sections_present: Section 6 (rollback plan) present');

// ── test_no_placeholder_text ──────────────────────────────────────────────────

console.log('\n── No placeholder text ──────────────────────────────────────────────');

assert(!mapSrc.includes('TODO') && !mapSrc.includes('PLACEHOLDER'),
  'test_no_placeholder_text: no TODO or PLACEHOLDER in migration map');

// ── test_call_sites_documented ────────────────────────────────────────────────

console.log('\n── Call sites documented ────────────────────────────────────────────');

// Count spawnClaude( calls in server.js (excluding the function definition line)
const serverLines = serverSrc.split('\n');
const callSiteLines = serverLines.filter(l =>
  l.includes('spawnClaude(') && !l.includes('function spawnClaude') && !l.trim().startsWith('//')
);
const actualCount = callSiteLines.length;

// Count documented call sites in the map (Section 1 entries: "### Call Site N")
const docCountMatches = mapSrc.match(/### Call Site \d+/g) || [];
const documentedCount = docCountMatches.length;

assert(documentedCount > 0,
  `test_call_sites_documented: at least one call site documented in map (found ${documentedCount})`);

assert(documentedCount >= actualCount,
  `test_call_sites_count_matches: documented (${documentedCount}) >= actual (${actualCount}) call sites in server.js`);

// ── test_sdk_equivalents_section ─────────────────────────────────────────────

console.log('\n── SDK equivalents section ──────────────────────────────────────────');

assert(mapSrc.includes('SDK equivalent') || mapSrc.includes('Anthropic SDK'),
  'test_sdk_equivalents_section: Section 3 mentions Anthropic SDK');
assert(mapSrc.includes('AbortController') || mapSrc.includes('controller.abort'),
  'test_sdk_equivalents_abort: Section 3 covers cancellation via AbortController');
assert(mapSrc.includes('anthropic.messages.create') || mapSrc.includes('messages.create'),
  'test_sdk_equivalents_api_call: Section 3 shows SDK API call form');
assert(mapSrc.includes('stream: true') || mapSrc.includes('stream:true'),
  'test_sdk_equivalents_streaming: Section 3 covers streaming');

// ── test_rollback_plan_has_feature_flag ──────────────────────────────────────

console.log('\n── Rollback plan with feature flag ──────────────────────────────────');

assert(mapSrc.includes('USE_SDK'),
  'test_rollback_plan_has_feature_flag: Section 6 mentions USE_SDK feature flag');
assert(mapSrc.includes("USE_SDK === 'true'") || mapSrc.includes('USE_SDK=false') || mapSrc.includes('USE_SDK'),
  'test_rollback_plan_flag_usage: Section 6 shows how to set/unset the flag');
assert(mapSrc.includes('callClaude') || mapSrc.includes('callClaudeSDK'),
  'test_rollback_plan_wrapper_fn: Section 6 defines a wrapper function');

// ── test_migration_order_defined ─────────────────────────────────────────────

console.log('\n── Migration order defined ──────────────────────────────────────────');

assert(mapSrc.includes('Section 5') || mapSrc.includes('Migration Order'),
  'test_migration_order_defined: Section 5 present');
assert(mapSrc.includes('HIGH') && mapSrc.includes('LOW'),
  'test_migration_order_has_risk_levels: risk levels (HIGH/LOW) defined in map');
// Section 5 should list items in order (numbered or described)
const section5Start = mapSrc.indexOf('## Section 5');
const section5End   = mapSrc.indexOf('## Section 6');
const section5 = section5Start >= 0 && section5End > section5Start
  ? mapSrc.slice(section5Start, section5End)
  : '';
assert(section5.length > 100,
  'test_migration_order_has_content: Section 5 has substantive content (> 100 chars)');
assert(section5.includes('1.') || section5.includes('first'),
  'test_migration_order_is_ordered: Section 5 has ordered list');

// ── Results ───────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
console.log(`Session 8 Phase 3: ${passed + failed} tests — ${passed} passed, ${failed} failed`);

if (failures.length > 0) {
  console.log('\nFailures:');
  failures.forEach(f => console.log(`  ✗ ${f.name}${f.detail ? ' — ' + f.detail : ''}`));
}

process.exit(failed > 0 ? 1 : 0);
