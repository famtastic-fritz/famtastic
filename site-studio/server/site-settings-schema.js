// site-studio/server/site-settings-schema.js
//
// Phase 2 Lane D2 — Per-site overrides schema + validator.
// Used by site-settings-routes.js (server) and testable in isolation.

'use strict';

const SCHEMA_VERSION = 1;

const ALLOWED_OVERRIDE_KEYS = new Set([
  'builder_model',
  'operator_readback_model',
  'build_approach',
  'component_reuse',
  'media_provider',
  'media_ratio',
  'deploy_target',
  'deploy_gate',
]);

const ALLOWED_VALUES = {
  builder_model:            ['sonnet-4.5', 'opus-4.5', 'local'],
  operator_readback_model:  ['haiku-4.5', 'sonnet-4.5'],
  build_approach:           ['Template-first', 'Page-by-page'],
  component_reuse:          ['Search first', 'Always create'],
  media_provider:           ['Firefly', 'Imagen', 'Mid-J', 'Local'],
  media_ratio:              ['1:1', '4:3', '16:10', '9:16'],
  deploy_target:            ['Netlify', 'Vercel', 'S3', 'Manual'],
  deploy_gate:              ['Manual', 'Auto on PASS'],
};

/**
 * validate(payload, expectedTag)
 * Returns { valid: boolean, errors: string[] }.
 * null is always a valid value for any override key (means "inherit platform default").
 */
function validate(payload, expectedTag) {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    return { valid: false, errors: ['payload must be an object'] };
  }

  if (payload.schema_version !== SCHEMA_VERSION) {
    errors.push(`schema_version must be ${SCHEMA_VERSION}, got ${JSON.stringify(payload.schema_version)}`);
  }

  if (typeof expectedTag === 'string' && payload.site_tag !== expectedTag) {
    errors.push(`site_tag mismatch: expected ${JSON.stringify(expectedTag)}, got ${JSON.stringify(payload.site_tag)}`);
  }

  if (!payload.overrides || typeof payload.overrides !== 'object' || Array.isArray(payload.overrides)) {
    errors.push('overrides must be a plain object');
    return { valid: errors.length === 0, errors };
  }

  for (const [key, value] of Object.entries(payload.overrides)) {
    if (!ALLOWED_OVERRIDE_KEYS.has(key)) {
      errors.push(`unknown override key: ${JSON.stringify(key)}`);
      continue;
    }
    if (value === null) continue; // null always valid — inherits platform default
    const allowed = ALLOWED_VALUES[key];
    if (!allowed.includes(value)) {
      errors.push(`invalid value for ${key}: ${JSON.stringify(value)}. Allowed: ${allowed.join(', ')} or null`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * emptyOverrides(tag)
 * Returns the empty per-site overrides skeleton for first-time GET.
 * All override values are null (inherit platform defaults).
 */
function emptyOverrides(tag) {
  return {
    schema_version: SCHEMA_VERSION,
    site_tag: tag,
    updated_at: null,
    overrides: {
      builder_model:           null,
      operator_readback_model: null,
      build_approach:          null,
      component_reuse:         null,
      media_provider:          null,
      media_ratio:             null,
      deploy_target:           null,
      deploy_gate:             null,
    },
  };
}

module.exports = {
  SCHEMA_VERSION,
  ALLOWED_OVERRIDE_KEYS,
  ALLOWED_VALUES,
  validate,
  emptyOverrides,
};
