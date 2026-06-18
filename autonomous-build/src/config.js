// Single source of truth for everything that was previously a "fork".
// Pure + browser-safe: no process.env access in here, so the same module
// imports cleanly in Node, the browser, and tests. Environment layering
// happens in `loadServerConfig()` (server-only, below the pure core).

/**
 * @typedef {'free'|'pro'|'agency'} Plan
 * @typedef {'server'|'static'} Mode
 */

/** Feature set each plan unlocks. The single place plan→capability lives. */
export const PLAN_FEATURES = {
  free:   { watermark: true,  brandedTemplates: false, brandPresets: false, bulkCsv: false, api: false },
  pro:    { watermark: false, brandedTemplates: true,  brandPresets: true,  bulkCsv: false, api: false },
  agency: { watermark: false, brandedTemplates: true,  brandPresets: true,  bulkCsv: true,  api: true  },
};

/** Pricing tiers — data, not markup, so a page/app can render them. */
export const PRICING = [
  { id: 'free',   name: 'Free',   monthly: 0,  annual: 0   },
  { id: 'pro',    name: 'Pro',    monthly: 9,  annual: 90  },
  { id: 'agency', name: 'Agency', monthly: 29, annual: 290 },
];

/** Defaults for every configurable knob. Override via loadServerConfig(). */
export const DEFAULT_CONFIG = {
  // Fork 1 — launch shape. 'server' = client calls /api/generate.
  // 'static' = client imports the engine and runs fully in-browser (no backend).
  mode: 'server',
  port: 4317,

  // Fork 2 — which paid features are live. `plan` picks the baseline; anything
  // in `featureOverrides` wins over the plan default (so you can ship one Pro
  // feature early without flipping the whole tier).
  plan: 'free',
  featureOverrides: {}, // e.g. { brandedTemplates: true }

  // Fork 3 — the URL-crawl feature ("paste a URL, read its existing tags").
  // Off by default because it needs a server-side fetch; flip to enable.
  urlCrawl: false,

  brand: {
    name: 'MetaMint',
    tagline: 'Mint perfect social previews in 30 seconds.',
    themeColor: '#7c3aed',
    watermarkText: 'made with MetaMint',
  },
  pricing: PRICING,
};

/** Resolve the effective feature flags for a config (plan + overrides). */
export function resolveFeatures(config = {}) {
  const plan = PLAN_FEATURES[config.plan] ? config.plan : 'free';
  return { ...PLAN_FEATURES[plan], ...(config.featureOverrides || {}) };
}

/**
 * Merge partial overrides onto the defaults (shallow per top-level key, with a
 * deep merge for `brand`). Validates enums so a bad value can't break the app.
 * @param {Partial<typeof DEFAULT_CONFIG>} overrides
 */
export function resolveConfig(overrides = {}) {
  const cfg = {
    ...DEFAULT_CONFIG,
    ...overrides,
    brand: { ...DEFAULT_CONFIG.brand, ...(overrides.brand || {}) },
    featureOverrides: { ...(overrides.featureOverrides || {}) },
  };
  cfg.mode = cfg.mode === 'static' ? 'static' : 'server';
  cfg.plan = PLAN_FEATURES[cfg.plan] ? cfg.plan : 'free';
  cfg.urlCrawl = cfg.urlCrawl === true;
  cfg.port = Number(cfg.port) || DEFAULT_CONFIG.port;
  cfg.features = resolveFeatures(cfg);
  return cfg;
}

/** The subset of config that is safe to expose to the browser / public API. */
export function publicConfig(config) {
  const cfg = config.features ? config : resolveConfig(config);
  return {
    mode: cfg.mode,
    plan: cfg.plan,
    features: cfg.features,
    urlCrawl: cfg.urlCrawl,
    brand: cfg.brand,
    pricing: cfg.pricing,
  };
}
