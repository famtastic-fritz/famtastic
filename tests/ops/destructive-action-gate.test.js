/**
 * tests/ops/destructive-action-gate.test.js
 *
 * Spins up the ops-api router and asserts every destructive action returns
 * 403 without a governance token, and 200 with the dev-bypass token.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const SITE_STUDIO = path.resolve(__dirname, '..', '..', 'site-studio');
const express = require(path.join(SITE_STUDIO, 'node_modules', 'express'));
const opsApi = require(path.join(SITE_STUDIO, 'lib', 'ops-api'));

function startServer() {
  const app = express();
  app.use(express.json());
  app.use('/api/ops', opsApi);
  return new Promise((resolve) => {
    const srv = app.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

function postJson(server, urlPath, body, headers = {}) {
  const port = server.address().port;
  const data = JSON.stringify(body || {});
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1', port, path: urlPath, method: 'POST',
      headers: Object.assign({ 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) }, headers),
    }, (res) => {
      let buf = '';
      res.on('data', c => { buf += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: buf ? JSON.parse(buf) : null }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

test('every destructive action returns 403 without governance token', async () => {
  const server = await startServer();
  try {
    for (const action of opsApi.DESTRUCTIVE_ACTIONS) {
      const { status, body } = await postJson(server, `/api/ops/command/${action}`, {});
      assert.equal(status, 403, `action ${action} should be 403`);
      assert.equal(body.error, 'governance_token_required');
      assert.ok(Array.isArray(body.hard_stops), `${action} should expose hard_stops`);
    }
  } finally { server.close(); }
});

test('destructive action accepted with dev-bypass token', async () => {
  const server = await startServer();
  try {
    const { status, body } = await postJson(server, '/api/ops/command/purge', {}, {
      'x-ops-governance-token': 'OPS_DEV_BYPASS_DO_NOT_SHIP',
    });
    assert.equal(status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.destructive, true);
  } finally { server.close(); }
});

test('non-destructive action does not require a token', async () => {
  const server = await startServer();
  try {
    for (const action of opsApi.NON_DESTRUCTIVE_ACTIONS) {
      const { status, body } = await postJson(server, `/api/ops/command/${action}`, {});
      assert.equal(status, 200, `${action} should be 200`);
      assert.equal(body.destructive, false);
    }
  } finally { server.close(); }
});

test('unknown action returns 400', async () => {
  const server = await startServer();
  try {
    const { status } = await postJson(server, '/api/ops/command/explode', {});
    assert.equal(status, 400);
  } finally { server.close(); }
});
