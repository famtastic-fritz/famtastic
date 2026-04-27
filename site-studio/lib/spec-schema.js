'use strict';

/**
 * Formal spec.json schema (P0.2 baseline closure).
 *
 * The "schema" prior to this module was implicit — a union of every field
 * any code path had ever written. P0.1 diagnostic Thread 6 mapped the drift.
 * This module is the canonical source-of-truth for what a spec should contain.
 *
 * Decisions per the diagnostic:
 *   - `colors` is OPTIONAL with default `null` (matches /api/new-site behaviour
 *     and avoids forced retrofit on every existing site).
 *   - `pages` is OPTIONAL with default `['home', 'about', 'contact']` (matches
 *     the autonomous-build behaviour and the historical default).
 *   - `tier` is REQUIRED but repair-on-read can default it to 'famtastic'
 *     when missing (older sites pre-GAP-4 lack the field).
 *   - `tag`, `site_name` cannot be defaulted — both must be present at write
 *     time. Validation flags as ERROR if missing.
 *
 * Use:
 *   const { validateSpec, normalizeRequiredFields } = require('./spec-schema');
 *   const { valid, errors, warnings } = validateSpec(spec);
 *   const { dirty } = normalizeRequiredFields(spec); // mutates in place
 */

// Required fields — must be present at write time. Validators flag missing.
// `created_at` and `state` and `tier` are auto-defaultable on read.
// `tag` and `site_name` are NOT auto-defaultable — they identify the site.
const REQUIRED_FIELDS = ['tag', 'site_name', 'state', 'created_at', 'tier'];

// Defaults applied by normalizeRequiredFields when a required field is missing
// AND can be sensibly defaulted (i.e. not tag/site_name).
const DEFAULT_FIELDS = {
  tier: 'famtastic',
  state: 'new',
  pages: ['home', 'about', 'contact'],
  colors: null,
  interview_pending: false,
  interview_completed: false,
};

const ARRAY_FIELDS = [
  'media_specs', 'design_decisions', 'pages', 'deploy_history',
];

const OBJECT_FIELDS = [
  'client_brief', 'design_brief', 'environments',
  'brand', 'layout', 'logo', 'site_repo',
  'structural_index', 'content', 'tech_recommendations',
];

const VALID_TIER_VALUES = new Set(['famtastic', 'clean']);
const VALID_STATE_VALUES = new Set([
  'new', 'briefed', 'building', 'built', 'deployed', 'client_approved', 'archived',
]);

/**
 * Validate a spec object against the schema.
 *
 * @param {object} spec
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
function validateSpec(spec) {
  const errors = [];
  const warnings = [];

  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
    errors.push('spec is not a plain object');
    return { valid: false, errors, warnings };
  }

  // Required-field presence
  for (const field of REQUIRED_FIELDS) {
    const v = spec[field];
    if (v === undefined || v === null || v === '') {
      errors.push(`required field missing: ${field}`);
    }
  }

  // Type coercion check — array fields
  for (const field of ARRAY_FIELDS) {
    if (spec[field] !== undefined && spec[field] !== null && !Array.isArray(spec[field])) {
      warnings.push(`field "${field}" should be an array, got ${typeof spec[field]}`);
    }
  }

  // Type coercion check — object fields
  for (const field of OBJECT_FIELDS) {
    if (spec[field] !== undefined && spec[field] !== null) {
      const t = typeof spec[field];
      if (t !== 'object' || Array.isArray(spec[field])) {
        warnings.push(`field "${field}" should be an object, got ${Array.isArray(spec[field]) ? 'array' : t}`);
      }
    }
  }

  // Enum checks
  if (spec.tier && !VALID_TIER_VALUES.has(spec.tier)) {
    warnings.push(`tier has unexpected value: ${JSON.stringify(spec.tier)} (expected 'famtastic' or 'clean')`);
  }
  if (spec.state && !VALID_STATE_VALUES.has(spec.state)) {
    warnings.push(`state has unexpected value: ${JSON.stringify(spec.state)}`);
  }

  // Tier ↔ famtastic_mode coherence (GAP-4 invariant)
  if (spec.tier === 'famtastic' && spec.famtastic_mode === false) {
    warnings.push('famtastic_mode should be true when tier is famtastic');
  }
  if (spec.tier === 'clean' && spec.famtastic_mode === true) {
    warnings.push('famtastic_mode should be false when tier is clean');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Mutate `spec` in place to fill required fields with safe defaults when missing,
 * and coerce array-shaped fields that have wrong types.
 *
 * Returns { spec, dirty } where dirty=true means at least one field was repaired
 * and the caller should persist the spec back to disk.
 *
 * Does NOT default `tag` or `site_name` — those identify the site and must be
 * present at write time. The validator will flag them; the caller decides how
 * to react.
 *
 * @param {object} spec
 * @returns {{ spec: object, dirty: boolean }}
 */
function normalizeRequiredFields(spec) {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
    return { spec, dirty: false };
  }

  let dirty = false;

  // Default tier (older sites pre-GAP-4 may lack it). normalizeTierAndMode
  // runs separately and will derive famtastic_mode from this.
  if (!spec.tier) {
    spec.tier = DEFAULT_FIELDS.tier;
    dirty = true;
  }

  // Default state — sites are 'new' by default. If a build has run, state
  // should already be set to a more advanced value, so this is a true gap fill.
  if (!spec.state) {
    spec.state = DEFAULT_FIELDS.state;
    dirty = true;
  }

  // Default created_at — preserves audit trail integrity for sites that
  // somehow lost the field (very rare).
  if (!spec.created_at) {
    spec.created_at = new Date().toISOString();
    dirty = true;
  }

  // Coerce array-shaped fields that have non-array types
  for (const field of ARRAY_FIELDS) {
    if (spec[field] !== undefined && spec[field] !== null && !Array.isArray(spec[field])) {
      spec[field] = [];
      dirty = true;
    }
  }

  return { spec, dirty };
}

module.exports = {
  REQUIRED_FIELDS,
  DEFAULT_FIELDS,
  ARRAY_FIELDS,
  OBJECT_FIELDS,
  VALID_TIER_VALUES,
  VALID_STATE_VALUES,
  validateSpec,
  normalizeRequiredFields,
};
