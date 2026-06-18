import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { server } from '../server.js';

let base;

before(async () => {
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  base = `http://127.0.0.1:${port}`;
});

after(() => server.close());

test('GET /api/health returns ok', async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.equal(j.ok, true);
  assert.equal(j.name, 'MetaMint');
});

test('POST /api/generate returns the full bundle', async () => {
  const res = await fetch(`${base}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Integration Test Page',
      description: 'A description used by the integration test to exercise generation.',
      url: 'https://example.com/',
      siteName: 'Example',
      imageUrl: 'https://example.com/og.png',
    }),
  });
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.ok(Array.isArray(j.tags) && j.tags.length > 0);
  assert.match(j.html, /og:title/);
  assert.ok(j.summary.ok, 'a complete input should be ok');
  assert.ok(j.ogImageSvg.startsWith('<svg'));
  assert.ok(j.ogImageDataUri.startsWith('data:image/svg+xml;base64,'));
  assert.ok(j.preview.google && j.preview.twitter);
});

test('POST /api/generate with bad JSON returns 400', async () => {
  const res = await fetch(`${base}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{not json',
  });
  assert.equal(res.status, 400);
});

test('GET /api/og.svg returns an svg with the right content type', async () => {
  const res = await fetch(`${base}/api/og.svg?title=Hello&themeColor=%23ff0000`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /image\/svg\+xml/);
  const body = await res.text();
  assert.ok(body.startsWith('<svg'));
});

test('GET / serves the app html', async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  const body = await res.text();
  assert.match(body, /MetaMint/);
});

test('unknown path returns 404', async () => {
  const res = await fetch(`${base}/does-not-exist.xyz`);
  assert.equal(res.status, 404);
});

test('path traversal attempt is blocked', async () => {
  const res = await fetch(`${base}/../server.js`);
  // Either normalized away (404) or forbidden (403) — never 200 with source.
  assert.ok(res.status === 404 || res.status === 403);
});
