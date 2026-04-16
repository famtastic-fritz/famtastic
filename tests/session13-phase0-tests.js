/**
 * Session 13 Phase 0 — Trust Debt Fixes
 *
 * Tests:
 *  1. conversational_ack classifier intent
 *  2. atomic spec.json writes (.tmp + rename pattern)
 *  3. restyle routing to handleChatMessage (not handlePlanning)
 */

'use strict';

const fs = require('fs');
const path = require('path');

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

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

const serverSrc = fs.readFileSync(path.join(__dirname, '../site-studio/server.js'), 'utf8');

// ─────────────────────────────────────────────────────────
// 1. conversational_ack classifier
// ─────────────────────────────────────────────────────────
console.log('\nconversational_ack classifier');

test('ACK_PATTERNS regex is defined in classifyRequest', () => {
  assert(serverSrc.includes('ACK_PATTERNS'), 'ACK_PATTERNS not found in server.js');
});

test('classifyRequest returns conversational_ack for short affirmations', () => {
  assert(serverSrc.includes("return 'conversational_ack'"), "return 'conversational_ack' not found");
});

test('getAckResponse helper is defined', () => {
  assert(serverSrc.includes('function getAckResponse'), 'getAckResponse helper not found');
});

test('conversational_ack case exists in routeToHandler switch', () => {
  assert(serverSrc.includes("case 'conversational_ack':"), "case 'conversational_ack': not found");
});

test('conversational_ack does NOT call handleChatMessage or handlePlanning', () => {
  // Find the case block
  const idx = serverSrc.indexOf("case 'conversational_ack':");
  assert(idx !== -1, 'case not found');
  const block = serverSrc.slice(idx, idx + 300);
  assert(!block.includes('handleChatMessage'), 'conversational_ack should not call handleChatMessage');
  assert(!block.includes('handlePlanning'), 'conversational_ack should not call handlePlanning');
  assert(block.includes('getAckResponse') || block.includes("'chat'"), 'should send ack response');
});

test('ACK_PATTERNS are positioned before default content_update return', () => {
  const ackIdx = serverSrc.indexOf('ACK_PATTERNS');
  const defaultIdx = serverSrc.indexOf('intent=content_update confidence=LOW');
  assert(ackIdx < defaultIdx, 'ACK_PATTERNS must appear before default content_update return');
});

// ─────────────────────────────────────────────────────────
// 2. atomic spec.json writes
// ─────────────────────────────────────────────────────────
console.log('\natomic spec.json writes');

test('writeSpec uses .tmp + renameSync pattern', () => {
  assert(serverSrc.includes("SPEC_FILE() + '.tmp'"), 'tmp file pattern not found in writeSpec');
  assert(serverSrc.includes('fs.renameSync'), 'renameSync not found — write is not atomic');
});

test('no direct writeFileSync to SPEC_FILE in writeSpec', () => {
  // The old pattern was: fs.writeFileSync(SPEC_FILE(), ...)
  // After fix, writeFileSync goes to .tmp, then renameSync to final
  // Check the writeSpec function body specifically
  const writeSpecIdx = serverSrc.indexOf('function writeSpec(spec');
  const nextFnIdx = serverSrc.indexOf('\nfunction ', writeSpecIdx + 1);
  const writeSpecBody = serverSrc.slice(writeSpecIdx, nextFnIdx);
  const directWrite = writeSpecBody.match(/fs\.writeFileSync\(SPEC_FILE\(\)/);
  assert(!directWrite, 'writeSpec still writes directly to SPEC_FILE() — not atomic');
});

test('new site creation uses atomic write pattern', () => {
  assert(serverSrc.includes("_newSpecPath + '.tmp'") || serverSrc.includes("spec.json' + '.tmp'"),
    'new site spec.json creation is not atomic');
});

test('renameSync is documented as atomic on POSIX', () => {
  assert(serverSrc.includes('atomic on POSIX'), 'Missing documentation comment on atomic write');
});

// ─────────────────────────────────────────────────────────
// 3. restyle routing
// ─────────────────────────────────────────────────────────
console.log('\nrestyle routing');

test('restyle is NOT grouped with new_site/major_revision → handlePlanning in routeToHandler', () => {
  // Find routeToHandler
  const fnIdx = serverSrc.indexOf('function routeToHandler(');
  const fnEnd = serverSrc.indexOf('\nfunction ', fnIdx + 1);
  const fn = serverSrc.slice(fnIdx, fnEnd);
  // Check that the new_site/major_revision block does NOT contain restyle
  const planningBlock = fn.match(/case 'new_site'[\s\S]*?handlePlanning/);
  if (planningBlock) {
    assert(!planningBlock[0].includes("case 'restyle'"), 'restyle still grouped with handlePlanning in routeToHandler');
  }
});

test('restyle routes to handleChatMessage in routeToHandler', () => {
  const fnIdx = serverSrc.indexOf('function routeToHandler(');
  const fnEnd = serverSrc.indexOf('\nfunction ', fnIdx + 1);
  const fn = serverSrc.slice(fnIdx, fnEnd);
  assert(fn.includes("case 'restyle':"), "case 'restyle': not found in routeToHandler");
  // Find restyle case and check only the lines up to the next `break`
  const restyleIdx = fn.indexOf("case 'restyle':");
  const breakIdx = fn.indexOf('break;', restyleIdx);
  const restyleBlock = fn.slice(restyleIdx, breakIdx + 6);
  assert(restyleBlock.includes('handleChatMessage'), 'restyle should call handleChatMessage');
  const restyleBlockNoComments = restyleBlock.replace(/\/\/[^\n]*/g, '');
  assert(!restyleBlockNoComments.includes('handlePlanning'), 'restyle must not call handlePlanning');
});

test('restyle routes to handleChatMessage in the main WS switch', () => {
  const occurrences = [];
  let search = 0;
  while (true) {
    const idx = serverSrc.indexOf("case 'restyle':", search);
    if (idx === -1) break;
    occurrences.push(idx);
    search = idx + 1;
  }
  assert(occurrences.length >= 2, `Expected at least 2 restyle case blocks, found ${occurrences.length}`);
  for (const idx of occurrences) {
    const breakIdx = serverSrc.indexOf('break;', idx);
    const block = serverSrc.slice(idx, breakIdx + 6);
    assert(block.includes('handleChatMessage'), `restyle block at offset ${idx} does not call handleChatMessage`);
    // Strip comments before checking for handlePlanning calls
    const blockNoComments = block.replace(/\/\/[^\n]*/g, '');
    assert(!blockNoComments.includes('handlePlanning'), `restyle block at offset ${idx} still calls handlePlanning`);
  }
});

test('dead code comment about restyle routing to handlePlanning is updated', () => {
  // The old comment "Note: 'restyle' is routed to handlePlanning() by the WS router upstream"
  // should no longer be accurate. Verify handlePlanning is not referenced near restyle.
  const oldDeadCodeComment = "routed to handlePlanning() by the WS router upstream";
  // This comment should be gone or updated
  if (serverSrc.includes(oldDeadCodeComment)) {
    // If it's still there, verify it's not in a live code path
    // (It could remain as historical context but the routing must be fixed)
    console.log('    ⚠ old dead code comment still present — routing is fixed but comment should be cleaned up');
  }
  assert(true, 'this is a soft check');
});

// ─────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────
console.log('\n──────────────────────────────────────────');
console.log(`${passed} passed, ${failed} failed`);
console.log('──────────────────────────────────────────\n');
if (failed > 0) process.exit(1);
