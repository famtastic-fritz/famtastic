// Integration tests for the HTTP API, using a real server on an ephemeral port.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from '../src/store.js';
import { createServer } from '../src/server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.join(__dirname, '..', 'data', `test-api-${process.hrtime.bigint()}.json`);

let server;
let base;
let store;

before(async () => {
  store = new Store(dataFile);
  server = createServer(store);
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://localhost:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  for (const f of [dataFile, `${dataFile}.tmp`]) {
    if (fs.existsSync(f)) fs.rmSync(f);
  }
});

// Reset store state between tests.
beforeEach(() => {
  store.db.tasks = [];
  store.db.sessions = [];
  store._save();
});

async function req(method, path, body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

test('GET /api/health', async () => {
  const { status, data } = await req('GET', '/api/health');
  assert.equal(status, 200);
  assert.deepEqual(data, { ok: true });
});

test('full task lifecycle over HTTP', async () => {
  // Create
  let res = await req('POST', '/api/tasks', { title: 'Ship it' });
  assert.equal(res.status, 201);
  const id = res.data.id;
  assert.equal(res.data.title, 'Ship it');

  // List
  res = await req('GET', '/api/tasks');
  assert.equal(res.status, 200);
  assert.equal(res.data.tasks.length, 1);

  // Mark done
  res = await req('PUT', `/api/tasks/${id}/done`, { done: true });
  assert.equal(res.status, 200);
  assert.equal(res.data.done, true);

  // Stats reflect it
  res = await req('GET', '/api/stats');
  assert.equal(res.data.tasksCompletedToday, 1);
  assert.equal(res.data.activeTasks, 0);

  // Delete
  res = await req('DELETE', `/api/tasks/${id}`);
  assert.equal(res.status, 200);
  assert.deepEqual(res.data, { deleted: id });

  res = await req('GET', '/api/tasks');
  assert.equal(res.data.tasks.length, 0);
});

test('POST /api/tasks rejects empty title', async () => {
  const { status, data } = await req('POST', '/api/tasks', { title: '' });
  assert.equal(status, 400);
  assert.match(data.error, /title/);
});

test('PUT done on missing task returns 404', async () => {
  const { status } = await req('PUT', '/api/tasks/missing/done', { done: true });
  assert.equal(status, 404);
});

test('DELETE missing task returns 404', async () => {
  const { status } = await req('DELETE', '/api/tasks/missing');
  assert.equal(status, 404);
});

test('sessions: log and list, validate, link to task', async () => {
  const taskRes = await req('POST', '/api/tasks', { title: 'Deep work' });
  const taskId = taskRes.data.id;

  let res = await req('POST', '/api/sessions', { minutes: 25, taskId });
  assert.equal(res.status, 201);
  assert.equal(res.data.minutes, 25);
  assert.equal(res.data.taskId, taskId);

  res = await req('GET', '/api/sessions');
  assert.equal(res.data.sessions.length, 1);

  res = await req('GET', '/api/stats');
  assert.equal(res.data.focusMinutesToday, 25);

  // Invalid minutes
  res = await req('POST', '/api/sessions', { minutes: 0 });
  assert.equal(res.status, 400);

  // Unknown task
  res = await req('POST', '/api/sessions', { minutes: 5, taskId: 'ghost' });
  assert.equal(res.status, 400);
});

test('invalid JSON body returns 400', async () => {
  const res = await fetch(`${base}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{ broken',
  });
  assert.equal(res.status, 400);
});

test('unknown route returns 404 JSON', async () => {
  const { status, data } = await req('GET', '/api/nope');
  assert.equal(status, 404);
  assert.equal(data.error, 'not found');
});

test('serves the static index.html', async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Tempo/);
  assert.equal(res.headers.get('content-type'), 'text/html; charset=utf-8');
});

test('blocks path traversal on static files', async () => {
  const res = await fetch(`${base}/../package.json`);
  // Browsers/fetch normalize, but the server must not leak files either way.
  assert.notEqual(res.status, 200, 'must not serve files outside public/');
});
