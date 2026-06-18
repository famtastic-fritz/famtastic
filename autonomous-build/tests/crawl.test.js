import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMetaFromHtml, decodeEntities, crawlUrl } from '../src/crawl.js';

const HTML = `<!doctype html><html><head>
  <title>Acme &amp; Co — Widgets</title>
  <meta name="description" content="The finest widgets, &quot;hand&quot; made.">
  <link rel="canonical" href="https://acme.example/widgets">
  <meta property="og:title" content="Acme Widgets">
  <meta property="og:image" content="https://acme.example/og.png">
  <meta property="og:site_name" content="Acme">
  <meta property="og:type" content="article">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:creator" content="@acme">
</head><body>…</body></html>`;

test('decodeEntities handles the common named/numeric entities', () => {
  assert.equal(decodeEntities('A &amp; B &quot;C&quot; &#39;D&#39; &lt;e&gt;'), `A & B "C" 'D' <e>`);
});

test('parseMetaFromHtml extracts the social-relevant fields', () => {
  const m = parseMetaFromHtml(HTML);
  assert.equal(m.title, 'Acme & Co — Widgets'); // <title> tag wins over og:title, entities decoded
  assert.equal(m.description, 'The finest widgets, "hand" made.');
  assert.equal(m.url, 'https://acme.example/widgets');
  assert.equal(m.imageUrl, 'https://acme.example/og.png');
  assert.equal(m.siteName, 'Acme');
  assert.equal(m.type, 'article');
  assert.equal(m.twitterCard, 'summary_large_image');
  assert.equal(m.author, '@acme');
});

test('parseMetaFromHtml prefers <title> then falls back to og:title', () => {
  const withTitle = parseMetaFromHtml('<title>Real Title</title><meta property="og:title" content="OG">');
  assert.equal(withTitle.title, 'Real Title');
  const noTitle = parseMetaFromHtml('<meta property="og:title" content="OG Only">');
  assert.equal(noTitle.title, 'OG Only');
});

test('parseMetaFromHtml returns empty fields for empty input (no throw)', () => {
  const m = parseMetaFromHtml('');
  assert.equal(m.title, '');
  assert.equal(m.imageUrl, '');
});

test('crawlUrl is gated: disabled throws FEATURE_DISABLED', async () => {
  await assert.rejects(() => crawlUrl('https://x.com', { enabled: false }), /disabled/);
});

test('crawlUrl rejects non-absolute / non-http urls when enabled', async () => {
  await assert.rejects(() => crawlUrl('not-a-url', { enabled: true }), (e) => e.code === 'BAD_URL');
  await assert.rejects(() => crawlUrl('ftp://x.com', { enabled: true }), (e) => e.code === 'BAD_URL');
});

test('crawlUrl fetches and parses when enabled (injected fetch)', async () => {
  const fetchImpl = async () => ({ status: 200, text: async () => HTML });
  const result = await crawlUrl('https://acme.example/widgets', { enabled: true, fetchImpl });
  assert.equal(result.status, 200);
  assert.equal(result.meta.siteName, 'Acme');
  assert.equal(result.meta.imageUrl, 'https://acme.example/og.png');
});
