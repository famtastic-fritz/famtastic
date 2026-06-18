import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPreview, displayHost, googleBreadcrumb } from '../src/preview.js';

const INPUT = {
  title: 'A Great Page Title',
  description: 'A description that explains what the page is about for a reader.',
  url: 'https://www.example.com/blog/my-post',
  siteName: 'Example Blog',
  author: 'example',
  imageUrl: 'https://example.com/og.png',
};

test('displayHost strips protocol and www', () => {
  assert.equal(displayHost('https://www.example.com/x'), 'example.com');
  assert.equal(displayHost('http://sub.example.com'), 'sub.example.com');
  assert.equal(displayHost('example.com/path'), 'example.com');
});

test('googleBreadcrumb renders host + path segments with separator', () => {
  assert.equal(
    googleBreadcrumb('https://www.example.com/blog/my-post'),
    'example.com › blog › my-post',
  );
});

test('buildPreview returns a model for every platform', () => {
  const p = buildPreview(INPUT);
  for (const key of ['google', 'twitter', 'facebook', 'slack', 'imessage']) {
    assert.ok(p[key], `missing ${key}`);
  }
  assert.equal(p.host, 'example.com');
  assert.equal(p.hasImage, true);
});

test('facebook host is uppercased', () => {
  const p = buildPreview(INPUT);
  assert.equal(p.facebook.host, 'EXAMPLE.COM');
});

test('twitter carries handle and card type', () => {
  const p = buildPreview(INPUT);
  assert.equal(p.twitter.handle, '@example');
  assert.equal(p.twitter.card, 'summary_large_image');
});

test('empty input degrades gracefully without throwing', () => {
  const p = buildPreview({});
  assert.equal(p.hasImage, false);
  assert.equal(p.google.title, '(no title)');
});
