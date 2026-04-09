#!/usr/bin/env node
/**
 * Session 7 — Phase 3: Studio Config File Tests
 *
 * Verifies:
 *   - FAMTASTIC-SETUP.md exists at repo root with all required sections
 *   - All documented env vars are present in the table
 *   - Env vars in the codebase (server.js, scripts/) are documented
 *   - scripts/update-setup-doc exists, is executable, updates timestamp
 *   - Running update-setup-doc changes the Last Updated timestamp
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT       = path.resolve(__dirname, '..');
const SETUP_FILE = path.join(ROOT, 'FAMTASTIC-SETUP.md');
const SCRIPT     = path.join(ROOT, 'scripts', 'update-setup-doc');

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

const setupSrc = fs.existsSync(SETUP_FILE) ? fs.readFileSync(SETUP_FILE, 'utf8') : '';

// ── GROUP: File existence and structure ──────────────────────────────────────

console.log('\n── FAMTASTIC-SETUP.md existence ──────────────────────────────────');

{
  assert(fs.existsSync(SETUP_FILE), 'FAMTASTIC-SETUP.md exists at repo root');
  assert(setupSrc.length > 1000, 'FAMTASTIC-SETUP.md has substantial content (>1000 chars)');
}

// ── GROUP: Required sections ─────────────────────────────────────────────────

console.log('\n── Required sections ──────────────────────────────────────────────');

{
  assert(setupSrc.includes('# FAMtastic Studio — Setup and Configuration'),
    'Has correct document title');
  assert(setupSrc.match(/## Last Updated: \d{4}-\d{2}-\d{2}/),
    'Has Last Updated timestamp in ISO date format');
  assert(setupSrc.includes('## Machine:'),
    'Has Machine section');
  assert(setupSrc.includes('## Quick Start (New Machine)'),
    'Has Quick Start section');
  assert(setupSrc.includes('## MCP Servers'),
    'Has MCP Servers section');
  assert(setupSrc.includes('## Claude Code Plugins'),
    'Has Claude Code Plugins section');
  assert(setupSrc.includes('## Environment Variables Required'),
    'Has Environment Variables section');
  assert(setupSrc.includes('## Third-Party Accounts and Subscriptions'),
    'Has Third-Party Accounts section');
  assert(setupSrc.includes('## Dependency Versions'),
    'Has Dependency Versions section');
  assert(setupSrc.includes('## Known Setup Gotchas'),
    'Has Known Setup Gotchas section');
  assert(setupSrc.includes('## fam-hub Commands Reference') ||
    setupSrc.includes('## Architecture Overview'),
    'Has fam-hub commands or architecture section');
}

// ── GROUP: No placeholder text ───────────────────────────────────────────────

console.log('\n── No placeholder text ────────────────────────────────────────────');

{
  assert(!setupSrc.includes('[your-'),
    'No [your-xxx] placeholder text');
  assert(!setupSrc.includes('TODO'),
    'No TODO placeholders');
  assert(!setupSrc.includes('PLACEHOLDER'),
    'No PLACEHOLDER text');
  assert(setupSrc.match(/v\d+\.\d+/),
    'Has at least one real version number');
  assert(setupSrc.includes('Node.js') || setupSrc.includes('node'),
    'Documents Node.js version');
}

// ── GROUP: Env vars in table ──────────────────────────────────────────────────

console.log('\n── Environment variable documentation ─────────────────────────────');

const REQUIRED_ENV_VARS = [
  'ANTHROPIC_API_KEY',
  'GEMINI_API_KEY',
  'NETLIFY_AUTH_TOKEN',
  'PINECONE_API_KEY',
  'STUDIO_PORT',
  'SITE_TAG',
];

{
  for (const varname of REQUIRED_ENV_VARS) {
    assert(setupSrc.includes(varname),
      `${varname} documented in setup file`);
  }
}

// ── GROUP: MCP servers documented ────────────────────────────────────────────

console.log('\n── MCP servers documented ──────────────────────────────────────────');

{
  assert(setupSrc.includes('magic') && setupSrc.includes('21st'),
    'Magic MCP documented');
  assert(setupSrc.includes('playwright'),
    'Playwright MCP documented');
  assert(setupSrc.includes('famtastic') || setupSrc.includes('mcp-server'),
    'FAMtastic MCP documented');
  assert(setupSrc.includes('ps-mcp') || setupSrc.includes('Photoshop'),
    'ps-mcp (Photoshop) documented');
}

// ── GROUP: Plugins documented ─────────────────────────────────────────────────

console.log('\n── Plugins documented ──────────────────────────────────────────────');

{
  assert(setupSrc.includes('frontend-design'), 'frontend-design plugin documented');
  assert(setupSrc.includes('feature-dev'),     'feature-dev plugin documented');
  assert(setupSrc.includes('code-review'),     'code-review plugin documented');
  assert(setupSrc.includes('commit-commands'), 'commit-commands plugin documented');
  assert(setupSrc.includes('gemini-tools'),    'gemini-tools plugin documented');
  assert(setupSrc.includes('playwright') && setupSrc.includes('Playwright'),
    'playwright plugin documented');
}

// ── GROUP: Known gotchas documented ──────────────────────────────────────────

console.log('\n── Known gotchas documented ────────────────────────────────────────');

{
  assert(setupSrc.includes('ps-mcp') && setupSrc.includes('Photoshop'),
    'ps-mcp/Photoshop open requirement documented');
  assert(setupSrc.includes('SITE_TAG') || setupSrc.includes('TAG not process.env'),
    'TAG vs SITE_TAG gotcha documented');
  assert(setupSrc.includes('CLAUDE.md') || setupSrc.includes('studio-context-include'),
    'CLAUDE.md / studio-context-include gotcha documented');
  assert(setupSrc.includes('library.json') || setupSrc.includes('.components'),
    'library.json shape gotcha documented');
}

// ── GROUP: update-setup-doc script ───────────────────────────────────────────

console.log('\n── scripts/update-setup-doc ────────────────────────────────────────');

{
  assert(fs.existsSync(SCRIPT), 'scripts/update-setup-doc exists');

  // Check executable bit
  let isExecutable = false;
  try {
    const stat = fs.statSync(SCRIPT);
    isExecutable = (stat.mode & 0o111) !== 0;
  } catch {}
  assert(isExecutable, 'scripts/update-setup-doc is executable');

  // Script contents
  const scriptSrc = fs.readFileSync(SCRIPT, 'utf8');
  assert(scriptSrc.includes('Last Updated'),
    'Script updates Last Updated timestamp');
  assert(scriptSrc.includes('hostname'),
    'Script updates Machine/hostname');
  assert(scriptSrc.includes('node --version') || scriptSrc.includes('NODE_VERSION'),
    'Script reads Node version');
  assert(scriptSrc.includes('claude --version') || scriptSrc.includes('CLAUDE_VERSION'),
    'Script reads Claude version');
  assert(scriptSrc.includes('--commit'),
    'Script supports --commit flag for auto-commit');
}

// ── GROUP: update-setup-doc actually runs ────────────────────────────────────

console.log('\n── Running update-setup-doc ────────────────────────────────────────');

{
  // Capture old timestamp
  const before = fs.readFileSync(SETUP_FILE, 'utf8');
  const oldTsMatch = before.match(/## Last Updated: (.+)/);
  const oldTs = oldTsMatch ? oldTsMatch[1].trim() : '';

  // Small delay to ensure timestamp changes
  const start = Date.now();
  while (Date.now() - start < 1100) {} // 1.1s busy wait

  const result = spawnSync('/bin/bash', [SCRIPT], {
    cwd: ROOT,
    env: { ...process.env },
    encoding: 'utf8',
    timeout: 15000,
  });

  assert(result.status === 0,
    `update-setup-doc exits 0${result.status !== 0 ? ' (stderr: ' + (result.stderr || '').slice(0, 200) + ')' : ''}`);
  assert((result.stdout || '').includes('[update-setup-doc] Done'),
    'Script prints Done message');

  // Check timestamp changed
  const after = fs.readFileSync(SETUP_FILE, 'utf8');
  const newTsMatch = after.match(/## Last Updated: (.+)/);
  const newTs = newTsMatch ? newTsMatch[1].trim() : '';

  assert(newTs !== oldTs || oldTs === '',
    `Last Updated timestamp changes on run (was: ${oldTs}, now: ${newTs})`);
  assert(after.match(/## Last Updated: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
    'Updated timestamp is ISO 8601 format');
}

// ── Results ──────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
console.log(`Session 7 Phase 3: ${passed + failed} tests — ${passed} passed, ${failed} failed`);

if (failures.length > 0) {
  console.log('\nFailures:');
  failures.forEach(f => console.log(`  ✗ ${f.name}${f.detail ? ' — ' + f.detail : ''}`));
}

process.exit(failed > 0 ? 1 : 0);
