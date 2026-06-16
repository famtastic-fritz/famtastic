#!/usr/bin/env node
// Smoke-repro for OPERATOR-ACTION-LAYER-BUGFIX. Spins the actions router in
// an in-process Express app against a sandbox sites root under os.tmpdir()
// so it never mutates the real worktree.
//
// Cases:
//   A — POST /runs/start with a run_id that already exists → 409 already_exists
//       (this is what Fritz's click hit; the route worked, the UI feedback
//        layer was the bug)
//   B — Same with explicit ?tag= → also 409 (proves tag-routing also works)
//   C — POST /runs/start with a fresh run_id → 201 with ledger
//
// Run with: node site-studio/server/__smoke__/operator-action-repro.js

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const express = require('express');
const { createActionsRouter } = require('../intelligence-actions');

// Build a sandbox sites root with a single site that contains the existing-run fixture.
const SANDBOX = fs.mkdtempSync(path.join(os.tmpdir(), 'op-action-smoke-'));
const SITES_ROOT = path.join(SANDBOX, 'sites');
const TAG = 'site-mbsh-reunion';
const SITE_DIR = path.join(SITES_ROOT, TAG);
const RUNS_DIR = path.join(SITE_DIR, 'intelligence', 'runs');
const EXISTING_RUN = 'mbsh-v2-refinement-001';
fs.mkdirSync(path.join(RUNS_DIR, EXISTING_RUN), { recursive: true });
fs.writeFileSync(
  path.join(RUNS_DIR, EXISTING_RUN, 'ledger.json'),
  JSON.stringify({ run_id: EXISTING_RUN, status: 'complete' }, null, 2),
);

const app = express();
app.use('/api/intelligence/actions', createActionsRouter(() => SITE_DIR, SITES_ROOT));

const server = app.listen(0, async () => {
  const { port } = server.address();
  console.log(`[smoke] listening on :${port}, sandbox=${SANDBOX}`);

  function postJson(p, body, qs) {
    return new Promise((resolve, reject) => {
      const data = Buffer.from(JSON.stringify(body));
      const req = http.request({
        hostname: '127.0.0.1',
        port,
        method: 'POST',
        path: p + (qs ? `?${qs}` : ''),
        headers: { 'Content-Type': 'application/json', 'Content-Length': data.length },
      }, (res) => {
        let buf = '';
        res.on('data', (c) => { buf += c; });
        res.on('end', () => resolve({ status: res.statusCode, body: buf ? JSON.parse(buf) : null }));
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  let pass = true;
  try {
    const a = await postJson('/api/intelligence/actions/runs/start',
      { run_id: EXISTING_RUN, intent: 'mbsh_v2_visual_refinement' });
    console.log('[smoke] A no-tag, existing run_id:', a.status, JSON.stringify(a.body));
    if (a.status !== 409 || !a.body || a.body.error !== 'already_exists') {
      console.error('[smoke] FAIL: A expected 409 already_exists');
      pass = false;
    }

    const b = await postJson('/api/intelligence/actions/runs/start',
      { run_id: EXISTING_RUN, intent: 'mbsh_v2_visual_refinement' },
      `tag=${TAG}`);
    console.log('[smoke] B tag, existing run_id:', b.status, JSON.stringify(b.body));
    if (b.status !== 409 || !b.body || b.body.error !== 'already_exists') {
      console.error('[smoke] FAIL: B expected 409 already_exists');
      pass = false;
    }

    const fresh = `mbsh-v2-refinement-smoke-${Date.now()}`;
    const c = await postJson('/api/intelligence/actions/runs/start',
      { run_id: fresh, intent: 'mbsh_v2_visual_refinement' },
      `tag=${TAG}`);
    const ledgerPreview = c.body && c.body.ledger
      ? { run_id: c.body.ledger.run_id, status: c.body.ledger.status }
      : c.body;
    console.log('[smoke] C fresh run_id:', c.status, JSON.stringify(ledgerPreview));
    if (c.status !== 201 || !c.body || !c.body.ledger || c.body.ledger.run_id !== fresh) {
      console.error('[smoke] FAIL: C expected 201 with ledger');
      pass = false;
    }

    console.log(pass ? '[smoke] PASS' : '[smoke] FAIL');
    process.exit(pass ? 0 : 1);
  } catch (err) {
    console.error('[smoke] error', err);
    process.exit(2);
  } finally {
    server.close();
    try { fs.rmSync(SANDBOX, { recursive: true, force: true }); } catch (_) {}
  }
});
