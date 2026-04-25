'use strict';
/**
 * Tier canonicalization for FAMtastic Studio.
 *
 * Tier is the single source of truth for build-output intensity.
 * famtastic_mode is always DERIVED from tier — never set independently.
 *
 * Write-on-read pattern: normalizeTierAndMode() is called at every spec-read
 * site. When tier or famtastic_mode is missing or inconsistent, canonical
 * values are computed and the caller writes back immediately (drift repair).
 * This eliminates the need for a migration job — the system self-corrects.
 */

const VALID_TIERS = new Set(['famtastic', 'clean']);

/**
 * Resolve the canonical tier from a set of precedence-ordered sources.
 *
 * Precedence (highest to lowest):
 *   1. explicit_request_tier  — from a chat/API request body
 *   2. client_brief_tier      — from spec.client_brief.tier
 *   3. extracted_brief_tier   — from spec.extracted_brief.tier
 *   4. existing_spec_tier     — from spec.tier
 *   Default: 'famtastic'
 *
 * Invalid values at any slot are SKIPPED (with a warning) rather than
 * defaulting early. This prevents a bad explicit value from corrupting
 * an existing Tier-A spec during an autonomous update.
 *
 * @param {Object} sources
 * @returns {{ tier: string, tier_normalization_warning: string|null }}
 */
function resolveTier(sources = {}) {
  const slots = [
    { key: 'explicit_request_tier',   label: 'explicit_request_tier' },
    { key: 'client_brief_tier',       label: 'client_brief_tier' },
    { key: 'extracted_brief_tier',    label: 'extracted_brief_tier' },
    { key: 'existing_spec_tier',      label: 'existing_spec_tier' },
  ];

  let firstInvalidValue = null;

  for (const { key, label } of slots) {
    const val = sources[key];
    if (val === undefined || val === null) continue;
    if (VALID_TIERS.has(val)) {
      return { tier: val, tier_normalization_warning: firstInvalidValue };
    }
    // Present but invalid — log, record the first bad value, continue to next slot
    console.warn(`[tier] Invalid value at ${label}: ${JSON.stringify(val)} — skipping`);
    if (firstInvalidValue === null) firstInvalidValue = String(val);
  }

  return { tier: 'famtastic', tier_normalization_warning: firstInvalidValue };
}

/**
 * Normalize tier and derived famtastic_mode on a spec object in-place.
 *
 * @param {Object} spec — modified in-place
 * @returns {{ spec: Object, dirty: boolean }}
 *   dirty=true means one or more fields changed; caller should persist.
 */
function normalizeTierAndMode(spec) {
  if (!spec || typeof spec !== 'object') return { spec, dirty: false };

  const sources = {
    client_brief_tier:    spec.client_brief?.tier    || null,
    extracted_brief_tier: spec.extracted_brief?.tier || null,
    existing_spec_tier:   spec.tier                  || null,
  };

  const { tier, tier_normalization_warning } = resolveTier(sources);
  let dirty = false;

  if (spec.tier !== tier) {
    spec.tier = tier;
    dirty = true;
  }

  const derivedMode = (tier === 'famtastic');
  if (spec.famtastic_mode !== derivedMode) {
    spec.famtastic_mode = derivedMode;
    dirty = true;
  }

  if (tier_normalization_warning) {
    if (spec.tier_normalization_warning !== tier_normalization_warning) {
      spec.tier_normalization_warning = tier_normalization_warning;
      dirty = true;
    }
  } else if (spec.tier_normalization_warning) {
    delete spec.tier_normalization_warning;
    dirty = true;
  }

  return { spec, dirty };
}

module.exports = { VALID_TIERS, resolveTier, normalizeTierAndMode };
