import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateOgImageSvg, wrapText, lighten, safeColor, svgDataUri, OG_WIDTH, OG_HEIGHT,
} from '../src/ogimage.js';

test('safeColor validates hex and falls back', () => {
  assert.equal(safeColor('#abc'), '#abc');
  assert.equal(safeColor('#aabbcc'), '#aabbcc');
  assert.equal(safeColor('purple'), '#6d28d9');
  assert.equal(safeColor(''), '#6d28d9');
});

test('lighten returns a valid 6-digit hex', () => {
  const out = lighten('#102030');
  assert.match(out, /^#[0-9a-f]{6}$/);
});

test('lighten handles 3-digit hex input', () => {
  assert.match(lighten('#123'), /^#[0-9a-f]{6}$/);
});

test('wrapText respects line budget and caps line count', () => {
  const lines = wrapText('one two three four five six seven eight nine ten', 10, 3);
  assert.ok(lines.length <= 3);
  for (const l of lines) {
    // a single long word can exceed, but joined small words should not blow past budget badly
    assert.ok(l.length <= 14, `line too long: "${l}"`);
  }
});

test('wrapText ellipsizes when content overflows max lines', () => {
  const lines = wrapText('alpha beta gamma delta epsilon zeta eta theta iota kappa', 8, 2);
  assert.equal(lines.length, 2);
  assert.ok(lines[lines.length - 1].endsWith('…'));
});

test('generateOgImageSvg produces a 1200x630 svg with escaped title', () => {
  const svg = generateOgImageSvg({
    title: 'Sales & Marketing <Q3>',
    siteName: 'Acme',
    themeColor: '#ff0000',
    url: 'https://acme.com',
  });
  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.includes(`width="${OG_WIDTH}"`));
  assert.ok(svg.includes(`height="${OG_HEIGHT}"`));
  assert.ok(svg.includes('&amp;'));
  assert.ok(svg.includes('&lt;Q3&gt;'));
  assert.ok(!svg.includes('Sales & Marketing')); // raw ampersand must be escaped
  assert.ok(svg.trim().endsWith('</svg>'));
});

test('generateOgImageSvg uses the host as the eyebrow when given a url', () => {
  const svg = generateOgImageSvg({ title: 'Hi', url: 'https://www.acme.com/x' });
  assert.ok(svg.includes('ACME.COM'));
});

test('generateOgImageSvg works with no input (safe defaults)', () => {
  const svg = generateOgImageSvg();
  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.includes('Your headline goes here'));
});

test('svgDataUri encodes to a base64 data uri that round-trips', () => {
  const svg = generateOgImageSvg({ title: 'Round Trip' });
  const uri = svgDataUri(svg);
  assert.ok(uri.startsWith('data:image/svg+xml;base64,'));
  const decoded = Buffer.from(uri.split(',')[1], 'base64').toString('utf8');
  assert.equal(decoded, svg);
});
