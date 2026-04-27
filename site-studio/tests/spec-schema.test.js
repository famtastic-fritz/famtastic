/**
 * P0.2 Thread 6 — spec-schema unit tests
 *
 * Locks in the validator and repair-on-read behaviour for lib/spec-schema.js.
 */

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  validateSpec,
  normalizeRequiredFields,
  REQUIRED_FIELDS,
  ARRAY_FIELDS,
  VALID_TIER_VALUES,
} = require('../lib/spec-schema.js');

// ── validateSpec ─────────────────────────────────────────────────────────────

describe('validateSpec', () => {
  it('returns invalid for non-object input', () => {
    expect(validateSpec(null).valid).toBe(false);
    expect(validateSpec(undefined).valid).toBe(false);
    expect(validateSpec('string').valid).toBe(false);
    expect(validateSpec([]).valid).toBe(false);
  });

  it('flags missing required fields as errors', () => {
    const result = validateSpec({});
    expect(result.valid).toBe(false);
    for (const field of REQUIRED_FIELDS) {
      expect(result.errors.some(e => e.includes(field))).toBe(true);
    }
  });

  it('passes a complete valid spec', () => {
    const result = validateSpec({
      tag: 'site-tonys-pizza',
      site_name: "Tony's Pizza",
      state: 'briefed',
      created_at: '2026-04-27T00:00:00.000Z',
      tier: 'famtastic',
      famtastic_mode: true,
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('warns when tier is unexpected value', () => {
    const result = validateSpec({
      tag: 'x', site_name: 'x', state: 'new', created_at: 'x', tier: 'bold',
    });
    expect(result.warnings.some(w => w.includes('tier'))).toBe(true);
  });

  it('warns on tier/famtastic_mode mismatch', () => {
    const r1 = validateSpec({
      tag: 'x', site_name: 'x', state: 'new', created_at: 'x',
      tier: 'famtastic', famtastic_mode: false,
    });
    expect(r1.warnings.some(w => w.includes('famtastic_mode'))).toBe(true);

    const r2 = validateSpec({
      tag: 'x', site_name: 'x', state: 'new', created_at: 'x',
      tier: 'clean', famtastic_mode: true,
    });
    expect(r2.warnings.some(w => w.includes('famtastic_mode'))).toBe(true);
  });

  it('warns when array-shaped fields have wrong type', () => {
    const result = validateSpec({
      tag: 'x', site_name: 'x', state: 'new', created_at: 'x', tier: 'famtastic',
      media_specs: { not: 'an array' },
    });
    expect(result.warnings.some(w => w.includes('media_specs') && w.includes('array'))).toBe(true);
  });

  it('warns when object-shaped fields have wrong type', () => {
    const result = validateSpec({
      tag: 'x', site_name: 'x', state: 'new', created_at: 'x', tier: 'famtastic',
      tech_recommendations: ['this should be an object'],
    });
    expect(result.warnings.some(w => w.includes('tech_recommendations'))).toBe(true);
  });

  it('warns on unexpected state values', () => {
    const result = validateSpec({
      tag: 'x', site_name: 'x', state: 'prototype', created_at: 'x', tier: 'famtastic',
    });
    expect(result.warnings.some(w => w.includes('state'))).toBe(true);
  });
});

// ── normalizeRequiredFields ──────────────────────────────────────────────────

describe('normalizeRequiredFields', () => {
  it('is a no-op on null/non-object', () => {
    expect(normalizeRequiredFields(null).dirty).toBe(false);
    expect(normalizeRequiredFields(undefined).dirty).toBe(false);
    expect(normalizeRequiredFields('string').dirty).toBe(false);
  });

  it('defaults missing tier to famtastic', () => {
    const spec = { tag: 'x', site_name: 'x', state: 'new', created_at: 'x' };
    const { dirty } = normalizeRequiredFields(spec);
    expect(dirty).toBe(true);
    expect(spec.tier).toBe('famtastic');
  });

  it('defaults missing state to new', () => {
    const spec = { tag: 'x', site_name: 'x', created_at: 'x', tier: 'famtastic' };
    const { dirty } = normalizeRequiredFields(spec);
    expect(dirty).toBe(true);
    expect(spec.state).toBe('new');
  });

  it('defaults missing created_at to current ISO timestamp', () => {
    const spec = { tag: 'x', site_name: 'x', state: 'new', tier: 'famtastic' };
    const { dirty } = normalizeRequiredFields(spec);
    expect(dirty).toBe(true);
    expect(spec.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('does NOT default tag (cannot be sensibly defaulted)', () => {
    const spec = { site_name: 'x', state: 'new', created_at: 'x', tier: 'famtastic' };
    const { dirty } = normalizeRequiredFields(spec);
    expect(spec.tag).toBeUndefined();
    expect(dirty).toBe(false);
  });

  it('does NOT default site_name (cannot be sensibly defaulted)', () => {
    const spec = { tag: 'x', state: 'new', created_at: 'x', tier: 'famtastic' };
    normalizeRequiredFields(spec);
    expect(spec.site_name).toBeUndefined();
  });

  it('coerces array-shaped fields with wrong types to empty arrays', () => {
    const spec = {
      tag: 'x', site_name: 'x', state: 'new', created_at: 'x', tier: 'famtastic',
      media_specs: { not: 'array' },
      design_decisions: 'string',
    };
    const { dirty } = normalizeRequiredFields(spec);
    expect(dirty).toBe(true);
    expect(spec.media_specs).toEqual([]);
    expect(spec.design_decisions).toEqual([]);
  });

  it('is idempotent on already-valid specs', () => {
    const spec = {
      tag: 'x', site_name: 'x', state: 'new', created_at: 'x', tier: 'famtastic',
    };
    const r1 = normalizeRequiredFields(spec);
    expect(r1.dirty).toBe(false);
    const r2 = normalizeRequiredFields(spec);
    expect(r2.dirty).toBe(false);
  });

  it('preserves existing valid values', () => {
    const spec = {
      tag: 'site-x', site_name: 'X', state: 'deployed', created_at: '2026-01-01T00:00:00.000Z',
      tier: 'clean', famtastic_mode: false,
    };
    normalizeRequiredFields(spec);
    expect(spec.tier).toBe('clean');
    expect(spec.state).toBe('deployed');
    expect(spec.famtastic_mode).toBe(false);
  });
});

// ── Constants surface ────────────────────────────────────────────────────────

describe('exports', () => {
  it('REQUIRED_FIELDS includes the canonical 5', () => {
    expect(REQUIRED_FIELDS).toContain('tag');
    expect(REQUIRED_FIELDS).toContain('site_name');
    expect(REQUIRED_FIELDS).toContain('state');
    expect(REQUIRED_FIELDS).toContain('created_at');
    expect(REQUIRED_FIELDS).toContain('tier');
  });

  it('ARRAY_FIELDS includes the canonical array-shaped fields', () => {
    expect(ARRAY_FIELDS).toContain('media_specs');
    expect(ARRAY_FIELDS).toContain('design_decisions');
    expect(ARRAY_FIELDS).toContain('pages');
    expect(ARRAY_FIELDS).toContain('deploy_history');
  });

  it('VALID_TIER_VALUES is the canonical {famtastic, clean} set', () => {
    expect(VALID_TIER_VALUES.has('famtastic')).toBe(true);
    expect(VALID_TIER_VALUES.has('clean')).toBe(true);
    expect(VALID_TIER_VALUES.size).toBe(2);
  });
});
