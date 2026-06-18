import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveConfig, resolveFeatures, publicConfig, PLAN_FEATURES, DEFAULT_CONFIG,
} from '../src/config.js';
import { generateAll } from '../src/index.js';

test('defaults are server mode, free plan, crawl off', () => {
  const c = resolveConfig();
  assert.equal(c.mode, 'server');
  assert.equal(c.plan, 'free');
  assert.equal(c.urlCrawl, false);
});

test('plan drives feature flags', () => {
  assert.equal(resolveFeatures({ plan: 'free' }).watermark, true);
  assert.equal(resolveFeatures({ plan: 'pro' }).watermark, false);
  assert.equal(resolveFeatures({ plan: 'pro' }).brandedTemplates, true);
  assert.equal(resolveFeatures({ plan: 'agency' }).bulkCsv, true);
  assert.equal(resolveFeatures({ plan: 'agency' }).api, true);
});

test('featureOverrides win over the plan baseline (ship one feature early)', () => {
  const f = resolveFeatures({ plan: 'free', featureOverrides: { brandedTemplates: true } });
  assert.equal(f.brandedTemplates, true);
  assert.equal(f.watermark, true); // others stay at plan default
});

test('bad enum values fall back safely', () => {
  const c = resolveConfig({ mode: 'bogus', plan: 'wizard', urlCrawl: 'yes' });
  assert.equal(c.mode, 'server');
  assert.equal(c.plan, 'free');
  assert.equal(c.urlCrawl, false);
});

test('mode static is honored', () => {
  assert.equal(resolveConfig({ mode: 'static' }).mode, 'static');
});

test('brand is deep-merged, not replaced', () => {
  const c = resolveConfig({ brand: { themeColor: '#000000' } });
  assert.equal(c.brand.themeColor, '#000000');
  assert.equal(c.brand.name, 'MetaMint'); // untouched default preserved
});

test('publicConfig exposes only safe fields', () => {
  const pub = publicConfig(resolveConfig({ plan: 'pro' }));
  assert.deepEqual(Object.keys(pub).sort(), ['brand', 'features', 'mode', 'plan', 'pricing', 'urlCrawl']);
  assert.equal(pub.features.watermark, false);
});

test('watermark feature flag controls the generated image', () => {
  const free = generateAll({ title: 'Hi' }, resolveConfig({ plan: 'free' }));
  const pro = generateAll({ title: 'Hi' }, resolveConfig({ plan: 'pro' }));
  assert.ok(free.ogImageSvg.includes('made with MetaMint'));
  assert.ok(!pro.ogImageSvg.includes('made with MetaMint'));
  assert.equal(free.features.watermark, true);
  assert.equal(pro.features.watermark, false);
});

test('custom watermark text from brand config is used', () => {
  const c = resolveConfig({ plan: 'free', brand: { watermarkText: 'Acme Inc' } });
  const out = generateAll({ title: 'Hi' }, c);
  assert.ok(out.ogImageSvg.includes('Acme Inc'));
});

test('generateAll with no config defaults to free watermark (back-compat)', () => {
  const out = generateAll({ title: 'Hi' });
  assert.ok(out.ogImageSvg.includes('made with MetaMint'));
});

test('PLAN_FEATURES and DEFAULT_CONFIG are internally consistent', () => {
  assert.ok(PLAN_FEATURES[DEFAULT_CONFIG.plan]);
});
