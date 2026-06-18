import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadServerConfig } from '../server.js';

test('loadServerConfig defaults when no file and no env', () => {
  const c = loadServerConfig({}, '/no/such/file.json');
  assert.equal(c.mode, 'server');
  assert.equal(c.plan, 'free');
  assert.equal(c.urlCrawl, false);
});

test('env overrides take effect', () => {
  const c = loadServerConfig(
    { METAMINT_MODE: 'static', METAMINT_PLAN: 'agency', METAMINT_URL_CRAWL: 'true', METAMINT_FEATURES: 'api' },
    '/no/such/file.json',
  );
  assert.equal(c.mode, 'static');
  assert.equal(c.plan, 'agency');
  assert.equal(c.urlCrawl, true);
  assert.equal(c.features.api, true);
});

test('METAMINT_FEATURES adds overrides on top of plan', () => {
  const c = loadServerConfig({ METAMINT_PLAN: 'free', METAMINT_FEATURES: 'brandedTemplates' }, '/no/such/file.json');
  assert.equal(c.features.brandedTemplates, true);
  assert.equal(c.features.watermark, true);
});
