import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate, summarize } from '../src/validate.js';

const GOOD = {
  title: 'A solid, descriptive page title here',
  description: 'A clear description that sits comfortably in the fifty to one hundred fifty character window.',
  url: 'https://example.com/page',
  siteName: 'Example',
  imageUrl: 'https://example.com/og.png',
  themeColor: '#123456',
};

test('a complete, well-formed input has no errors', () => {
  const issues = validate(GOOD);
  assert.equal(issues.filter((i) => i.severity === 'error').length, 0);
  assert.ok(summarize(issues).ok);
});

test('missing title is an error', () => {
  const issues = validate({ ...GOOD, title: '' });
  assert.ok(issues.some((i) => i.field === 'title' && i.severity === 'error'));
});

test('relative og:url is an error', () => {
  const issues = validate({ ...GOOD, url: '/page' });
  assert.ok(issues.some((i) => i.field === 'url' && i.severity === 'error'));
});

test('relative image url is an error; missing image is a warning', () => {
  assert.ok(validate({ ...GOOD, imageUrl: '/og.png' }).some(
    (i) => i.field === 'imageUrl' && i.severity === 'error'));
  assert.ok(validate({ ...GOOD, imageUrl: '' }).some(
    (i) => i.field === 'imageUrl' && i.severity === 'warning'));
});

test('oversized title produces a warning', () => {
  const issues = validate({ ...GOOD, title: 'x'.repeat(80) });
  assert.ok(issues.some((i) => i.field === 'title' && i.severity === 'warning'));
});

test('summary fixed only when card type needs an image it lacks', () => {
  const issues = validate({ ...GOOD, imageUrl: '', twitterCard: 'summary_large_image' });
  assert.ok(issues.some((i) => i.field === 'twitterCard' && i.severity === 'warning'));
});

test('invalid theme color is an info note', () => {
  const issues = validate({ ...GOOD, themeColor: 'purple' });
  assert.ok(issues.some((i) => i.field === 'themeColor' && i.severity === 'info'));
});

test('issues are sorted most-severe-first', () => {
  const issues = validate({ title: '', url: '/x', imageUrl: '', themeColor: 'bad' });
  const order = { error: 0, warning: 1, info: 2 };
  for (let i = 1; i < issues.length; i++) {
    assert.ok(order[issues[i - 1].severity] <= order[issues[i].severity]);
  }
});

test('summarize computes counts, score, and ok flag', () => {
  const s = summarize([
    { severity: 'error', field: 'a', message: '' },
    { severity: 'warning', field: 'b', message: '' },
    { severity: 'info', field: 'c', message: '' },
  ]);
  assert.deepEqual(s.counts, { error: 1, warning: 1, info: 1 });
  assert.equal(s.score, 100 - 25 - 8 - 2);
  assert.equal(s.ok, false);
});

test('score never goes below zero', () => {
  const many = Array.from({ length: 10 }, () => ({ severity: 'error', field: 'x', message: '' }));
  assert.equal(summarize(many).score, 0);
});
