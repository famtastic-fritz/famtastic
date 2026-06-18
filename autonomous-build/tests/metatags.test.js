import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeInput, buildTagList, buildMetaHtml, renderTag, serpForms,
} from '../src/metatags.js';

const FULL = {
  title: 'My Page',
  description: 'A clear description of my page for humans.',
  url: 'https://example.com/page',
  siteName: 'Example',
  imageUrl: 'https://example.com/og.png',
  author: 'example',
  themeColor: '#123456',
  type: 'article',
  twitterCard: 'summary_large_image',
};

test('normalizeInput applies defaults and clamps enums', () => {
  const m = normalizeInput({ title: ' Hi ', type: 'bogus', twitterCard: 'nope' });
  assert.equal(m.title, 'Hi');
  assert.equal(m.type, 'website');
  assert.equal(m.twitterCard, 'summary_large_image');
  assert.equal(m.locale, 'en_US');
});

test('buildTagList emits og:image dimensions and alt when image present', () => {
  const tags = buildTagList(FULL);
  const props = tags.filter((t) => t.property).map((t) => t.property);
  assert.ok(props.includes('og:image'));
  assert.ok(props.includes('og:image:width'));
  assert.ok(props.includes('og:image:height'));
  assert.ok(props.includes('og:image:alt'));
  const w = tags.find((t) => t.property === 'og:image:width');
  assert.equal(w.content, '1200');
});

test('buildTagList omits image tags entirely when no image', () => {
  const tags = buildTagList({ ...FULL, imageUrl: '' });
  assert.ok(!tags.some((t) => t.property === 'og:image'));
  assert.ok(!tags.some((t) => t.name === 'twitter:image'));
});

test('buildTagList always includes a twitter:card', () => {
  const tags = buildTagList({ title: 'x' });
  assert.ok(tags.some((t) => t.name === 'twitter:card'));
});

test('normalized handle is used for twitter:site and twitter:creator', () => {
  const tags = buildTagList(FULL);
  const site = tags.find((t) => t.name === 'twitter:site');
  const creator = tags.find((t) => t.name === 'twitter:creator');
  assert.equal(site.content, '@example');
  assert.equal(creator.content, '@example');
});

test('renderTag escapes content and chooses property vs name', () => {
  assert.equal(
    renderTag({ kind: 'meta', property: 'og:title', content: 'A & B "C"' }),
    '<meta property="og:title" content="A &amp; B &quot;C&quot;">',
  );
  assert.equal(
    renderTag({ kind: 'meta', name: 'description', content: 'hi' }),
    '<meta name="description" content="hi">',
  );
  assert.equal(renderTag({ kind: 'title', text: 'T' }), '<title>T</title>');
  assert.equal(
    renderTag({ kind: 'link', rel: 'canonical', href: 'https://x.com' }),
    '<link rel="canonical" href="https://x.com">',
  );
});

test('buildMetaHtml output is newline-joined and well-formed', () => {
  const html = buildMetaHtml(FULL);
  assert.ok(html.startsWith('<title>My Page</title>'));
  assert.ok(html.includes('property="og:url" content="https://example.com/page"'));
  assert.ok(html.includes('name="twitter:card" content="summary_large_image"'));
  // No tag should contain an unescaped raw double-quote in content payload.
  assert.ok(!/content="[^"]*"[^>]*"[^=]/.test(html));
});

test('serpForms truncates to SERP budgets', () => {
  const longTitle = 'word '.repeat(40);
  const s = serpForms({ title: longTitle, description: longTitle });
  assert.ok(s.title.length <= 60);
  assert.ok(s.description.length <= 155);
});
