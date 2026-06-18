import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeAttr, normalizeSpace, truncate, slugify, normalizeHandle, isAbsoluteUrl,
} from '../src/escape.js';

test('escapeAttr neutralizes markup-breaking characters', () => {
  assert.equal(escapeAttr(`a"b'<c>&d`), 'a&quot;b&#39;&lt;c&gt;&amp;d');
  assert.equal(escapeAttr(null), '');
  assert.equal(escapeAttr(undefined), '');
});

test('escapeAttr escapes ampersand before other entities (no double-encode mistakes)', () => {
  assert.equal(escapeAttr('<'), '&lt;');
  assert.equal(escapeAttr('&lt;'), '&amp;lt;'); // literal text, correctly escaped
});

test('normalizeSpace collapses and trims whitespace', () => {
  assert.equal(normalizeSpace('  a\n\t  b   c '), 'a b c');
});

test('truncate adds ellipsis and avoids mid-word cuts', () => {
  const out = truncate('The quick brown fox jumps over', 12);
  assert.ok(out.length <= 12);
  assert.ok(out.endsWith('…'));
  assert.ok(!out.includes('  '));
});

test('truncate leaves short strings untouched', () => {
  assert.equal(truncate('short', 60), 'short');
});

test('slugify produces url-safe, diacritic-free slugs', () => {
  assert.equal(slugify('Héllo, Wörld! Café'), 'hello-world-cafe');
  assert.equal(slugify('  Multiple   Spaces  '), 'multiple-spaces');
  assert.equal(slugify('!!!'), '');
});

test('normalizeHandle accepts name, @name, and urls; rejects junk', () => {
  assert.equal(normalizeHandle('fritz'), '@fritz');
  assert.equal(normalizeHandle('@fritz'), '@fritz');
  assert.equal(normalizeHandle('https://x.com/@Fritz_M'), '@Fritz_M');
  assert.equal(normalizeHandle('https://twitter.com/jack'), '@jack');
  assert.equal(normalizeHandle('not a handle!'), '');
  assert.equal(normalizeHandle(''), '');
  assert.equal(normalizeHandle('waytoolonghandlename'), ''); // >15 chars
});

test('isAbsoluteUrl only accepts http(s) with host', () => {
  assert.equal(isAbsoluteUrl('https://a.com/x'), true);
  assert.equal(isAbsoluteUrl('http://a.com'), true);
  assert.equal(isAbsoluteUrl('/img.png'), false);
  assert.equal(isAbsoluteUrl('ftp://a.com'), false);
  assert.equal(isAbsoluteUrl('not a url'), false);
});
