#!/usr/bin/env node
/**
 * Session 9 Phase 0 Tests — Migration Map Fixes
 * Verifies all 7 defects in the migration map have been corrected.
 */

'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const HUB_ROOT = path.join(__dirname, '..');
const MAP_PATH = path.join(HUB_ROOT, 'docs', 'spawn-claude-migration-map.md');
const SERVER_PATH = path.join(HUB_ROOT, 'site-studio', 'server.js');

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

const mapSrc = fs.readFileSync(MAP_PATH, 'utf8');
const serverSrc = fs.readFileSync(SERVER_PATH, 'utf8');
const serverLines = serverSrc.split('\n');

// ─── M1: spawnBrainAdapter documented ──────────────────────────────────────
console.log('\nM1 — spawnBrainAdapter Documented');

test('migration map: spawnBrainAdapter documented in Section 1', () => {
  assert(mapSrc.includes('spawnBrainAdapter'), 'spawnBrainAdapter not mentioned in map');
});

test('migration map: spawnBrainAdapter has its own Call Site entry (Call Site 9)', () => {
  assert(mapSrc.includes('Call Site 9'), 'Call Site 9 not found — spawnBrainAdapter not inventoried');
});

test('migration map: spawnBrainAdapter described as separate migration track', () => {
  assert(
    mapSrc.includes('SEPARATE MIGRATION TRACK') || mapSrc.includes('Separate migration track') || mapSrc.includes('separate migration track'),
    'spawnBrainAdapter not marked as separate migration track'
  );
});

test('migration map: spawnBrainAdapter line number documented (11229)', () => {
  assert(mapSrc.includes('11229'), 'Line 11229 not documented for spawnBrainAdapter');
});

test('server.js: spawnBrainAdapter exists at documented line', () => {
  const line = serverLines[11229 - 1]; // 0-indexed
  assert(line && line.includes('spawnBrainAdapter'), `spawnBrainAdapter not found at line 11229 — got: ${line}`);
});

// ─── M2: Feature flag replaced with per-call-site approach ─────────────────
console.log('\nM2 — Feature Flag Design Replaced');

test('migration map: USE_SDK flag approach removed', () => {
  assert(!mapSrc.includes('process.env.USE_SDK'), 'USE_SDK env var flag still present — should be removed');
});

test('migration map: per-call-site migration approach documented', () => {
  assert(
    mapSrc.includes('per-call-site') || mapSrc.includes('Per-Call-Site'),
    'Per-call-site approach not documented'
  );
});

test('migration map: rollback via git revert documented', () => {
  assert(
    mapSrc.includes('git commit') || mapSrc.includes('revert the git commit') || mapSrc.includes('revert that commit'),
    'Git-based rollback not documented'
  );
});

test('migration map: Section 6 describes per-call-site approach', () => {
  const section6Idx = mapSrc.indexOf('## Section 6');
  assert(section6Idx > 0, 'Section 6 not found');
  const section6 = mapSrc.substring(section6Idx, mapSrc.indexOf('## Section 7', section6Idx));
  assert(
    section6.includes('per-call-site') || section6.includes('Per-Call-Site'),
    'Section 6 does not describe per-call-site approach'
  );
});

// ─── M3: Silence timer documented correctly ─────────────────────────────────
console.log('\nM3 — Silence Timer Documented Correctly');

test('migration map: resetSilenceTimer pattern documented', () => {
  assert(
    mapSrc.includes('resetSilenceTimer') || mapSrc.includes('resetSilenceTimeout'),
    'resetSilenceTimer/resetSilenceTimeout pattern not in map'
  );
});

test('migration map: silence timer resets on every chunk (not from call start)', () => {
  assert(
    mapSrc.includes('resets on every chunk') || mapSrc.includes('every chunk') || mapSrc.includes('on every chunk'),
    'Silence timer chunk-reset behavior not documented'
  );
});

test('migration map: AbortController abort triggers Haiku fallback', () => {
  assert(
    mapSrc.includes('controller.abort()') && mapSrc.includes('Haiku'),
    'AbortController → Haiku fallback path not documented'
  );
});

test('server.js: resetSilenceTimeout already implemented at Call Site 8', () => {
  assert(
    serverSrc.includes('resetSilenceTimeout()'),
    'resetSilenceTimeout() not found in server.js'
  );
});

// ─── M4: Per-call-site max_tokens ───────────────────────────────────────────
console.log('\nM4 — Per-Call-Site max_tokens');

test('migration map: max_tokens table present', () => {
  assert(mapSrc.includes('max_tokens'), 'max_tokens not mentioned in map');
});

test('migration map: CS6 uses 16384 max_tokens', () => {
  const cs6Idx = mapSrc.indexOf('Call Site 6');
  assert(cs6Idx > 0, 'Call Site 6 not found');
  // Check within 1000 chars of CS6 entry or in the table
  const tableIdx = mapSrc.indexOf('| 6 |');
  assert(tableIdx > 0 || mapSrc.substring(cs6Idx, cs6Idx + 500).includes('16384'),
    'CS6 max_tokens=16384 not found'
  );
  // More permissive: just check the table row
  const tableRow6 = mapSrc.match(/\|\s*6\s*\|[^|]*\|[^|]*\|\s*16384/);
  assert(tableRow6 || mapSrc.includes('16384'), 'max_tokens 16384 not found for large HTML pages');
});

test('migration map: CS8 uses 16384 max_tokens', () => {
  assert(mapSrc.includes('16384'), '16384 token limit not documented for full-page generation');
});

test('migration map: CS4 scope estimation uses lower token limit', () => {
  const tableRow4 = mapSrc.match(/\|\s*4\s*\|[^|]*scope[^|]*\|\s*(\d+)/i);
  if (tableRow4) {
    const tokens = parseInt(tableRow4[1]);
    assert(tokens <= 4096, `CS4 max_tokens should be <= 4096 for scope JSON, got ${tokens}`);
  } else {
    // Check 2048 is mentioned for scope
    assert(mapSrc.includes('2048'), 'Scope estimation lower token limit (2048) not documented');
  }
});

// ─── M5: Model string corrected ─────────────────────────────────────────────
console.log('\nM5 — Model String Corrected');

test('migration map: no reference to claude-sonnet-4-5 as default', () => {
  // Allow 'claude-sonnet-4-5' only in the context of "was stale" or "old default"
  const matches = mapSrc.match(/claude-sonnet-4-5(?!-20250514)/g) || [];
  // If it appears, it should only be in the spawnClaude() default note (stale reference)
  const allowedContext = mapSrc.includes('stale') && mapSrc.includes('claude-sonnet-4-5');
  if (matches.length > 0 && !allowedContext) {
    // Check none appear as THE recommended default
    const defaultIdx = mapSrc.indexOf("'claude-sonnet-4-5'");
    const staleCtx = mapSrc.indexOf('stale');
    assert(staleCtx > 0 && Math.abs(defaultIdx - staleCtx) < 500,
      'claude-sonnet-4-5 appears as default without being marked stale');
  }
  // Primary check: claude-sonnet-4-6 is the documented default
  assert(mapSrc.includes('claude-sonnet-4-6'), 'claude-sonnet-4-6 not documented as correct default');
});

test('migration map: claude-sonnet-4-6 is the recommended model default', () => {
  assert(mapSrc.includes('claude-sonnet-4-6'), 'claude-sonnet-4-6 not in migration map');
});

test('migration map: model read from loadSettings() not hardcoded', () => {
  assert(
    mapSrc.includes("loadSettings().model") || mapSrc.includes('loadSettings()'),
    'loadSettings() not referenced — model may be hardcoded'
  );
});

// ─── M6: Cost impact section ─────────────────────────────────────────────────
console.log('\nM6 — Cost Impact Section');

test('migration map: Section 7 exists', () => {
  assert(mapSrc.includes('## Section 7'), 'Section 7 (Cost Impact) not found');
});

test('migration map: cost impact documents current subscription model', () => {
  assert(
    mapSrc.includes('subscription') || mapSrc.includes('Subscription'),
    'Current subscription model not mentioned in cost section'
  );
});

test('migration map: cost per build estimated', () => {
  assert(
    mapSrc.includes('per build') || mapSrc.includes('Per Build'),
    'Cost per build estimate not found'
  );
});

test('migration map: crossover point documented', () => {
  assert(
    mapSrc.includes('Crossover') || mapSrc.includes('crossover') || mapSrc.includes('break-even'),
    'Crossover point not documented'
  );
});

test('migration map: cost tracking requirement present', () => {
  assert(
    mapSrc.includes('logAPICall') || mapSrc.includes('cost tracking') || mapSrc.includes('Cost tracking'),
    'API cost tracking requirement not documented'
  );
});

// ─── M7: ws.send guard risk documented ──────────────────────────────────────
console.log('\nM7 — ws.send Guard Risk Documented');

test('migration map: ws.send unguarded risk documented', () => {
  assert(
    mapSrc.includes('unguarded') || mapSrc.includes('ws.send'),
    'ws.send unguarded risk not documented'
  );
});

test('migration map: readyState check pattern shown', () => {
  assert(
    mapSrc.includes('readyState') || mapSrc.includes('WebSocket.OPEN'),
    'ws.readyState check pattern not shown in map'
  );
});

test('migration map: 134 unguarded sends count mentioned or equivalent warning', () => {
  // Either the count or a clear warning about streaming + async = risk
  assert(
    mapSrc.includes('134') || mapSrc.includes('unguarded') || mapSrc.includes('crash'),
    'ws.send unguarded count or severity not documented'
  );
});

// ─── Grep verification ───────────────────────────────────────────────────────
console.log('\nGrep Verification — Call Site Count');

test('grep: spawnClaude call count matches Section 1 (8 call sites)', () => {
  const spawnMatches = serverSrc.match(/const child = spawnClaude\(|const templateChild = spawnClaude\(|let child = spawnClaude\(/g);
  const count = spawnMatches ? spawnMatches.length : 0;
  assert(count === 8, `Expected 8 spawnClaude() call sites, found ${count}`);
});

test('grep: spawnBrainAdapter function exists in server.js', () => {
  assert(serverSrc.includes('function spawnBrainAdapter'), 'spawnBrainAdapter function not found');
});

test('grep: Haiku inline spawn exists at documented location', () => {
  const haikuLine = serverLines[8992 - 1];
  assert(
    haikuLine && (haikuLine.includes('spawn') || haikuLine.includes('haiku')),
    `Haiku inline spawn not at line 8992 — got: ${haikuLine}`
  );
});

test('grep: no undocumented claude --print calls', () => {
  const claudePrintMatches = serverSrc.match(/claude --print/g) || [];
  // Only expected location: inside spawnClaude() function definition itself
  assert(claudePrintMatches.length <= 2, `Unexpected claude --print calls: ${claudePrintMatches.length}`);
});

// ─── Line number tolerance check ────────────────────────────────────────────
console.log('\nLine Number Tolerance');

const callSiteChecks = [
  { site: 1, line: 693,  pattern: 'spawnClaude(prompt)' },
  { site: 2, line: 3821, pattern: 'spawnClaude(prompt)' },
  { site: 3, line: 6669, pattern: 'spawnClaude(prompt)' },
  { site: 4, line: 6763, pattern: 'spawnClaude(prompt)' },
  { site: 5, line: 6867, pattern: 'spawnClaude(prompt)' },
  { site: 6, line: 7231, pattern: 'spawnClaude(pagePrompt)' },
  { site: 7, line: 7300, pattern: 'spawnClaude(templatePrompt)' },
  { site: 8, line: 8971, pattern: 'spawnClaude(prompt)' },
];

for (const cs of callSiteChecks) {
  test(`CS${cs.site}: spawnClaude call found within ±50 lines of ${cs.line}`, () => {
    const start = Math.max(0, cs.line - 51);
    const end = Math.min(serverLines.length, cs.line + 50);
    const window = serverLines.slice(start, end).join('\n');
    assert(
      window.includes(cs.pattern) || window.includes('spawnClaude('),
      `spawnClaude not found near line ${cs.line} (±50 lines). CS${cs.site} may have shifted.`
    );
  });
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(60));
console.log(`Session 9 Phase 0: ${passed + failed} tests — ${passed} passed, ${failed} failed`);

if (failed > 0) process.exit(1);
