#!/usr/bin/env node
'use strict';

/**
 * FAMtastic Site Studio — Two-Phase Integration Test Runner
 *
 * Phase 1: Functional — verifies all classifier intents
 * Phase 2: Extreme   — stress, injection, and protocol abuse
 *
 * Usage:
 *   node tests/integration/runner.js             # both phases
 *   node tests/integration/runner.js --phase1    # phase 1 only
 *   node tests/integration/runner.js --phase2    # phase 2 only
 *   node tests/integration/runner.js --filter F0 # run tests whose name matches
 *
 * Studio must be running on localhost:3334 before starting.
 */

const { tests: phase1Tests } = require('./phase1-functional');
const { tests: phase2Tests } = require('./phase2-extreme');
const utils = require('./utils');
const fs = require('fs');
const path = require('path');

const RESULTS_DIR = path.join(__dirname, 'results');
const FOLLOW_UP_PING = 'ping — are you still there?';

// ─── Per-test WS connection ─────────────────────────────────────
// Each test gets a fresh WS connection so server-side mode state
// (e.g. currentMode='brainstorm' set by a previous test) can't
// bleed into subsequent tests.  The welcome message that the server
// sends on connect is drained before the test message is sent.
async function openFreshWs() {
  const ws = await utils.connect();
  // Drain any immediate connection messages (welcome banner, pages-updated, etc.)
  // so they don't interfere with the test's response collection.
  await utils.drain(ws, 400);
  return ws;
}

// ─── ANSI helpers ──────────────────────────────────────────────
const c = {
  reset:  '\x1b[0m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
};
const pass  = `${c.green}✓${c.reset}`;
const fail  = `${c.red}✗${c.reset}`;
const warn  = `${c.yellow}⚠${c.reset}`;

// ─── Check Studio is reachable ─────────────────────────────────
async function preflight() {
  try {
    await fetch('http://localhost:3334/api/spec', { signal: AbortSignal.timeout(3000) });
    return true;
  } catch {
    return false;
  }
}

// ─── Verify connection is still alive after a test ─────────────
async function followUp(ws) {
  try {
    const res = await utils.sendChat(ws, FOLLOW_UP_PING, {
      collectAll: true, timeout: 8000, expectTimeout: true,
    });
    return Array.isArray(res) ? res.length > 0 : true;
  } catch {
    return false;
  }
}

// ─── Run a single test ─────────────────────────────────────────
// Each test opens its own WS connection to prevent mode state
// (brainstorm, build, etc.) set by previous tests from leaking in.
async function runTest(test) {
  const start = Date.now();
  const result = { name: test.name, pass: false, reason: '', duration: 0, alive: true };
  let ws;

  try {
    ws = await openFreshWs();

    if (test.setup) {
      await test.setup(utils, ws);
    }

    if (test.custom) {
      const r = await test.custom(ws, utils);
      result.pass   = r.pass;
      result.reason = r.reason;
    } else {
      const opts = test.options || {};
      let response, allMessages;

      if (opts.collectAll) {
        allMessages = await utils.sendChat(ws, test.input, { ...opts });
        response = Array.isArray(allMessages) ? allMessages[allMessages.length - 1] : allMessages;
      } else {
        response = await utils.sendChat(ws, test.input, opts);
      }

      const validation = await test.validate(response, ws, allMessages);
      result.pass   = validation.pass;
      result.reason = validation.reason;
    }

    // For tests that might leave the server in a weird state, send a
    // follow-up on the SAME connection before closing it.
    if (test.requiresFollowUp) {
      result.alive = await followUp(ws);
      if (!result.alive) {
        result.pass   = false;
        result.reason += ' [DEAD: server did not respond to follow-up ping]';
      }
    }

  } catch (err) {
    if (test.options?.expectTimeout && /timeout/i.test(err.message)) {
      result.pass   = true;
      result.reason = 'Expected timeout occurred';
    } else {
      result.pass   = false;
      result.reason = `Threw: ${err.message}`;
    }
  } finally {
    try { ws?.close(); } catch {}
  }

  result.duration = Date.now() - start;
  return result;
}

// ─── Run a full phase ──────────────────────────────────────────
async function runPhase(label, tests) {
  const bar = '═'.repeat(62);
  console.log(`\n${c.bold}${bar}`);
  console.log(`  PHASE: ${label}`);
  console.log(`  Tests: ${tests.length}`);
  console.log(`${bar}${c.reset}\n`);

  // Verify Studio is reachable before starting
  const results = [];
  let ws;
  try {
    ws = await utils.connect();
    console.log(`${pass} Connected to Studio on :3334 (per-test connections will be used)\n`);
    ws.close();
  } catch (err) {
    console.error(`${fail} ${c.red}Could not connect: ${err.message}${c.reset}`);
    return { label, results: [], passed: 0, failed: 0, errored: 1, score: '0.0' };
  }

  let errored = 0;

  for (const test of tests) {
    process.stdout.write(`  ${c.dim}[${test.name}]${c.reset} `);

    let result;
    try {
      result = await runTest(test);
    } catch (e) {
      result = { name: test.name, pass: false, reason: `Runner error: ${e.message}`, duration: 0, alive: true };
      errored++;
    }

    results.push(result);

    const icon = result.pass ? pass : fail;
    const durationStr = `${c.dim}(${result.duration}ms)${c.reset}`;
    const aliveStr = result.alive === false ? ` ${warn}${c.yellow}server unresponsive after test${c.reset}` : '';
    console.log(`${icon} ${result.reason}${aliveStr} ${durationStr}`);

    // Brief pause between tests to let any async work settle
    await utils.sleep(200);
  }

  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  const total  = results.length;
  const pct    = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';

  const scoreColor = parseFloat(pct) >= 90 ? c.green : parseFloat(pct) >= 70 ? c.yellow : c.red;

  console.log(`\n${c.dim}${'─'.repeat(62)}${c.reset}`);
  console.log(`  ${c.bold}${label} SCORE: ${scoreColor}${passed}/${total} (${pct}%)${c.reset}`);
  console.log(`  Passed: ${c.green}${passed}${c.reset}  Failed: ${c.red}${failed}${c.reset}  Errored: ${c.yellow}${errored}${c.reset}`);
  console.log(`${c.dim}${'─'.repeat(62)}${c.reset}\n`);

  return { label, results, passed, failed, errored, score: pct };
}

// ─── Generate markdown report ─────────────────────────────────
function generateReport(phases) {
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const reportPath = path.join(RESULTS_DIR, `test-report-${stamp}.md`);

  const totalPassed  = phases.reduce((n, p) => n + p.passed, 0);
  const totalFailed  = phases.reduce((n, p) => n + p.failed, 0);
  const totalTests   = phases.reduce((n, p) => n + p.results.length, 0);
  const totalScore   = totalTests > 0
    ? ((totalPassed / totalTests) * 100).toFixed(1)
    : '0.0';

  const summaryRows = phases.map(p =>
    `| ${p.label} | ${p.passed} | ${p.failed} | ${p.score}% |`
  ).join('\n');

  const allFailed = phases.flatMap(p =>
    p.results.filter(r => !r.pass).map(r => ({ ...r, phase: p.label }))
  );

  const failSection = allFailed.length === 0
    ? '_All tests passed._'
    : allFailed.map(r =>
        `### \`${r.name}\`\n` +
        `- **Phase:** ${r.phase}\n` +
        `- **Reason:** ${r.reason}\n` +
        `- **Duration:** ${r.duration}ms`
      ).join('\n\n');

  const recs = allFailed.length === 0
    ? 'No critical issues found. Consider expanding the test suite with domain-specific edge cases.'
    : [
        allFailed.some(r => r.phase.includes('Phase 1'))
          ? '1. Fix failing Phase 1 (functional) tests first — these represent broken core features.'
          : null,
        allFailed.some(r => r.phase.includes('Phase 2') && /VULNERABILITY/.test(r.reason))
          ? '2. Address security VULNERABILITY findings immediately before next deploy.'
          : null,
        allFailed.some(r => r.phase.includes('Phase 2') && !/VULNERABILITY/.test(r.reason))
          ? '3. Review resilience failures in Phase 2 — add input limits or rate guards where needed.'
          : null,
      ].filter(Boolean).join('\n');

  const phaseDetails = phases.map(p => {
    const rows = p.results.map(r =>
      `| ${r.pass ? '✅' : '❌'} | \`${r.name}\` | ${r.reason.replace(/\|/g, '\\|')} | ${r.duration}ms |`
    ).join('\n');
    return `## ${p.label}\n\n| | Test | Result | Duration |\n|---|---|---|---|\n${rows}`;
  }).join('\n\n');

  const report = `# FAMtastic Studio Integration Test Report

**Generated:** ${now.toISOString()}
**Studio:** localhost:3334

## Summary

| Phase | Passed | Failed | Score |
|-------|--------|--------|-------|
${summaryRows}
| **Total** | **${totalPassed}** | **${totalFailed}** | **${totalScore}%** |

${phaseDetails}

## Failed Tests (Priority Fixes)

${failSection}

## Recommendations

${recs}
`;

  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  fs.writeFileSync(reportPath, report);
  return reportPath;
}

// ─── Main ──────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const phase1Only  = args.includes('--phase1');
  const phase2Only  = args.includes('--phase2');
  const filterArg   = args.find(a => a.startsWith('--filter='));
  const filterPat   = filterArg ? new RegExp(filterArg.split('=')[1], 'i') : null;

  function applyFilter(tests) {
    return filterPat ? tests.filter(t => filterPat.test(t.name)) : tests;
  }

  const hdr = '█'.repeat(62);
  console.log(`\n${c.bold}${c.cyan}${hdr}`);
  console.log('  FAMtastic Site Studio — Integration Test Suite');
  console.log(`${hdr}${c.reset}`);
  console.log(`  Date: ${new Date().toLocaleString()}\n`);

  // Preflight check
  const online = await preflight();
  if (!online) {
    console.error(
      `\n${fail} ${c.red}Studio is not reachable on localhost:3334.${c.reset}\n` +
      `  Start it first:\n` +
      `    fam-hub site chat <tag>    (e.g. fam-hub site chat site-test-suite)\n\n` +
      `  Then re-run this suite.\n`
    );
    process.exit(2);
  }
  console.log(`${pass} Studio reachable on :3334\n`);

  const phases = [];

  if (!phase2Only) {
    const p1 = await runPhase('Phase 1: Functional', applyFilter(phase1Tests));
    phases.push(p1);
  }

  if (!phase1Only) {
    const p2 = await runPhase('Phase 2: Extreme', applyFilter(phase2Tests));
    phases.push(p2);
  }

  if (phases.every(p => p.results.length === 0)) {
    console.log(`${warn} No tests matched the filter. Nothing to report.\n`);
    process.exit(0);
  }

  const reportPath = generateReport(phases);
  console.log(`\n${c.cyan}Report saved → ${reportPath}${c.reset}\n`);

  const totalFailed = phases.reduce((n, p) => n + p.failed, 0);
  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(`\n${fail} Runner fatal error: ${err.message}\n`, err);
  process.exit(3);
});
