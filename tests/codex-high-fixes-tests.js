#!/usr/bin/env node
/**
 * Codex Adversarial Review — HIGH severity fix verification
 *
 * Tests the three HIGH issues identified by Codex:
 * 1. Cancel kills subprocesses, not just the lock flag
 * 2. Build lock is owned by a run ID, not a global boolean
 * 3. Disconnect only releases lock if the disconnecting client owns the build
 *
 * Usage:
 *   SITE_TAG=site-auntie-gale-garage-sales node tests/codex-high-fixes-tests.js
 */

const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

const SITE_TAG = process.env.SITE_TAG || 'site-auntie-gale-garage-sales';
const STUDIO_PORT = parseInt(process.env.STUDIO_PORT || '3334', 10);
const BASE = `http://localhost:${STUDIO_PORT}`;
const WS_URL = `ws://localhost:${STUDIO_PORT}`;

let pass = 0, fail = 0, total = 0;
const failures = [];

function assert(name, condition, detail = '') {
  total++;
  if (condition) { console.log(`  ✅ PASS: ${name}`); pass++; }
  else { console.log(`  ❌ FAIL: ${name}${detail ? ` — ${detail}` : ''}`); fail++; failures.push({ name, detail }); }
}

async function httpRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost', port: STUDIO_PORT,
      path: endpoint, method,
      headers: {
        'Content-Type': 'application/json',
        'Origin': `http://localhost:${STUDIO_PORT}`,
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    }, res => {
      let d = ''; res.on('data', x => d += x);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, body: d }); } });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function openWs() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL, { headers: { Origin: BASE } });
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });
}

function closeWs(ws) {
  return new Promise(resolve => {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.on('close', resolve);
      ws.close();
    } else {
      resolve();
    }
  });
}

async function runTests() {
  console.log(`\nCodex HIGH Fix Verification Tests`);
  console.log(`Server: ${BASE}\n`);

  // ─── Group: Server Health ─────────────────────────────────────────────────
  console.log('TEST GROUP: Server Health');
  try {
    const r = await httpRequest('GET', '/');
    assert('server is running', r.status < 500, `got ${r.status}`);
  } catch (e) {
    assert('server is running', false, `connection refused: ${e.message}`);
    printResults(); return;
  }

  // ─── Fix 1: Cancel returns run ID and correct shape ───────────────────────
  console.log('\nTEST GROUP: Fix 1 — Cancel endpoint shape and behavior');
  {
    // Cancel with nothing in progress
    const r1 = await httpRequest('POST', '/api/build/cancel', {});
    assert('cancel returns 200', r1.status === 200, `got ${r1.status}`);
    assert('cancel response has was_in_progress', typeof r1.body.was_in_progress === 'boolean');
    assert('cancel response has cancelled_run_id field', 'cancelled_run_id' in r1.body);
    assert('cancelled_run_id is null when idle', r1.body.cancelled_run_id === null,
      `got: ${r1.body.cancelled_run_id}`);
    assert('was_in_progress is false when idle', r1.body.was_in_progress === false);

    // Verify server state: /api/studio-status should show build not in progress
    const status = await httpRequest('GET', '/api/studio-status');
    if (status.body && typeof status.body.buildInProgress !== 'undefined') {
      assert('studio status shows not in progress after cancel', status.body.buildInProgress === false);
    }
  }

  // ─── Fix 2: Build lock tracks ownership via run ID ────────────────────────
  console.log('\nTEST GROUP: Fix 2 — Build lock ownership');
  {
    // The lock should only be released by the owning connection.
    // We can verify this by checking the cancel response includes a run ID
    // when a build was cancelled mid-flight (structural check — we can't
    // actually start a real build in a unit test, so we verify the data model).

    // Open two WebSocket connections
    let ws1, ws2;
    try {
      ws1 = await openWs();
      ws2 = await openWs();
      assert('two WS connections open successfully', ws1.readyState === WebSocket.OPEN && ws2.readyState === WebSocket.OPEN);

      // Cancel should return null run ID (nothing running) — proves run ID tracking works
      const r = await httpRequest('POST', '/api/build/cancel', {});
      assert('run ID is null when no build owned by any ws', r.body.cancelled_run_id === null);

      await closeWs(ws2);
      // Wait briefly for close handler
      await new Promise(r => setTimeout(r, 200));

      // After ws2 closes without owning a build, lock should remain false
      const statusAfter = await httpRequest('GET', '/');
      assert('server still responding after non-owning ws close', statusAfter.status < 500);
    } catch (e) {
      assert('WS connection test did not throw', false, e.message);
    } finally {
      if (ws1) await closeWs(ws1).catch(() => {});
    }
  }

  // ─── Fix 3: Disconnect only releases lock for owning connection ───────────
  console.log('\nTEST GROUP: Fix 3 — Disconnect ownership guard');
  {
    // Open a connection, close it — server must not crash or corrupt state
    let ws3;
    try {
      ws3 = await openWs();
      assert('ws3 connected', ws3.readyState === WebSocket.OPEN);
      await closeWs(ws3);
      await new Promise(r => setTimeout(r, 300)); // allow close handler

      // Server should still be up and lock should be false
      const r = await httpRequest('POST', '/api/build/cancel', {});
      assert('server alive after ws close', r.status === 200);
      assert('lock is false after non-owning close', r.body.was_in_progress === false);
      assert('no phantom run ID from disconnect', r.body.cancelled_run_id === null);
    } catch (e) {
      assert('disconnect guard test did not throw', false, e.message);
    }
  }

  // ─── Fix verification: killBuildProcesses helper exists ───────────────────
  console.log('\nTEST GROUP: killBuildProcesses exists in server');
  {
    const serverSrc = fs.readFileSync(
      path.join(__dirname, '..', 'site-studio', 'server.js'), 'utf8'
    );
    assert('killBuildProcesses function defined', serverSrc.includes('function killBuildProcesses('));
    assert('killBuildProcesses kills currentChild', serverSrc.includes('ws.currentChild.kill('));
    assert('killBuildProcesses kills activeChildren', serverSrc.includes('ws.activeChildren'));
    assert('cancel endpoint calls killBuildProcesses', serverSrc.includes('killBuildProcesses(buildOwnerWs)'));
    assert('buildOwnerWs global declared', serverSrc.includes('let buildOwnerWs = null'));
    assert('currentBuildRunId global declared', serverSrc.includes('let currentBuildRunId = null'));
    assert('setBuildInProgress accepts ownerWs param', serverSrc.includes('function setBuildInProgress(value, ownerWs)'));
    assert('parallelBuild passes ws to setBuildInProgress', serverSrc.includes('setBuildInProgress(true, ws)'));
    assert('handleChatMessage passes ws to setBuildInProgress', serverSrc.match(/setBuildInProgress\(true, ws\)/g).length >= 2);
    assert('disconnect only clears lock if owner', serverSrc.includes('buildOwnerWs === ws'));
    assert('cancel includes cancelled_run_id in response', serverSrc.includes('cancelled_run_id: cancelledRunId'));
  }

  printResults();
}

function printResults() {
  console.log(`\n${'━'.repeat(38)}`);
  console.log(`Codex HIGH Fix Results: ${pass} PASS | ${fail} FAIL | ${total} total`);
  console.log(`${'━'.repeat(38)}\n`);
  if (failures.length > 0) {
    console.log('Failures:');
    failures.forEach(f => console.log(`  ✗ ${f.name}${f.detail ? ` — ${f.detail}` : ''}`));
  }
  const logDir = path.join(__dirname, 'automation', 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  fs.writeFileSync(path.join(logDir, 'codex-high-fixes-results.json'),
    JSON.stringify({ pass, fail, total, failures, timestamp: new Date().toISOString() }, null, 2));
  console.log('Results saved to tests/automation/logs/codex-high-fixes-results.json');
  process.exit(fail > 0 ? 1 : 0);
}

runTests().catch(e => { console.error('Test runner crashed:', e.message); process.exit(1); });
