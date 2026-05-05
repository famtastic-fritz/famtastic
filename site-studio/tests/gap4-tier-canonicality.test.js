/**
 * GAP-4 Tier Canonicality — unit tests
 *
 * Tests pure functions only (no server.js require, no port binding).
 * Covers: resolveTier, normalizeTierAndMode, gate helpers, brief parity.
 *
 * Test seams per V5 spec:
 *   L3574  — buildTemplatePrompt gate → getLogoSkeletonBlock
 *   L11964 — parallelBuild per-page gate → getLogoNoteBlock
 *   L14275 — handleChatMessage logo gate → shouldInjectFamtasticLogoMode
 */

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);

// Import pure-function modules only — NO server.js require
const { resolveTier, normalizeTierAndMode } = require('../lib/tier.js');
const { getLogoSkeletonBlock, getLogoNoteBlock, shouldInjectFamtasticLogoMode } = require('../lib/tier-gates.js');
const famSkeletons = require('../lib/famtastic-skeletons.js');

// Server source for static structural checks (Part B Claude prompt parity)
const serverSrc = fs.readFileSync(
  path.join(import.meta.dirname, '../server.js'),
  'utf8'
);

// ── resolveTier ────────────────────────────────────────────────────────────────

describe('resolveTier', () => {
  it('returns famtastic when all slots missing', () => {
    const { tier, tier_normalization_warning } = resolveTier({});
    expect(tier).toBe('famtastic');
    expect(tier_normalization_warning).toBeNull();
  });

  it('returns explicit_request_tier when valid', () => {
    const { tier } = resolveTier({ explicit_request_tier: 'clean' });
    expect(tier).toBe('clean');
  });

  it('returns client_brief_tier when explicit is missing', () => {
    const { tier } = resolveTier({ client_brief_tier: 'clean' });
    expect(tier).toBe('clean');
  });

  it('returns extracted_brief_tier ahead of existing_spec_tier', () => {
    const { tier } = resolveTier({
      extracted_brief_tier: 'famtastic',
      existing_spec_tier: 'clean',
    });
    expect(tier).toBe('famtastic');
  });

  it('returns existing_spec_tier when all higher slots are missing', () => {
    const { tier } = resolveTier({ existing_spec_tier: 'clean' });
    expect(tier).toBe('clean');
  });

  // ── Canary test (PART A, Finding 1-High) ──────────────────────────────────
  it('CANARY: invalid explicit input does not corrupt existing Tier-A spec', () => {
    const { tier, tier_normalization_warning } = resolveTier({
      explicit_request_tier: 'wow',   // invalid
      existing_spec_tier:    'clean', // valid
    });
    expect(tier).toBe('clean');
    expect(tier_normalization_warning).toBe('wow');
  });

  it('skips multiple invalid slots and reaches the valid one', () => {
    const { tier, tier_normalization_warning } = resolveTier({
      explicit_request_tier:  'bold',    // invalid
      client_brief_tier:      'maximum', // invalid
      extracted_brief_tier:   undefined,
      existing_spec_tier:     'famtastic',
    });
    expect(tier).toBe('famtastic');
    expect(tier_normalization_warning).toBe('bold'); // first invalid value wins
  });

  it('all slots invalid → default famtastic with warning', () => {
    const { tier, tier_normalization_warning } = resolveTier({
      explicit_request_tier: 'wow',
      existing_spec_tier: 'wowow',
    });
    expect(tier).toBe('famtastic');
    expect(tier_normalization_warning).toBe('wow');
  });
});

// ── normalizeTierAndMode ───────────────────────────────────────────────────────

describe('normalizeTierAndMode', () => {
  it('sets tier=famtastic and famtastic_mode=true on empty spec', () => {
    const spec = {};
    const { dirty } = normalizeTierAndMode(spec);
    expect(spec.tier).toBe('famtastic');
    expect(spec.famtastic_mode).toBe(true);
    expect(dirty).toBe(true);
  });

  it('sets famtastic_mode=false when tier=clean', () => {
    const spec = { tier: 'clean' };
    normalizeTierAndMode(spec);
    expect(spec.famtastic_mode).toBe(false);
  });

  it('dirty=false when spec is already canonical', () => {
    const spec = { tier: 'famtastic', famtastic_mode: true };
    const { dirty } = normalizeTierAndMode(spec);
    expect(dirty).toBe(false);
  });

  it('repairs stale famtastic_mode inconsistent with tier', () => {
    const spec = { tier: 'clean', famtastic_mode: true }; // inconsistent
    const { dirty } = normalizeTierAndMode(spec);
    expect(spec.famtastic_mode).toBe(false);
    expect(dirty).toBe(true);
  });

  it('propagates tier_normalization_warning from resolveTier', () => {
    const spec = { client_brief: { tier: 'ultra' }, tier: 'clean' };
    normalizeTierAndMode(spec);
    // 'ultra' is invalid in client_brief_tier; falls through to existing_spec_tier 'clean'
    expect(spec.tier).toBe('clean');
    expect(spec.tier_normalization_warning).toBe('ultra');
  });

  it('handles null/non-object spec gracefully', () => {
    expect(normalizeTierAndMode(null).dirty).toBe(false);
    expect(normalizeTierAndMode(undefined).dirty).toBe(false);
  });
});

// ── Gate helpers: L3574 (buildTemplatePrompt) ─────────────────────────────────

describe('getLogoSkeletonBlock — L3574 gate', () => {
  it('returns non-empty string containing LOGO_SKELETON anchor when famtastic_mode true', () => {
    const block = getLogoSkeletonBlock({ famtastic_mode: true });
    expect(block).toBeTruthy();
    expect(block).toContain('LOGO OUTPUT');
  });

  it('returns empty string when famtastic_mode false', () => {
    expect(getLogoSkeletonBlock({ famtastic_mode: false })).toBe('');
  });

  it('returns empty string when famtastic_mode missing', () => {
    expect(getLogoSkeletonBlock({})).toBe('');
  });
});

// ── Gate helpers: L11964 (parallelBuild per-page) ────────────────────────────

describe('getLogoNoteBlock — L11964 gate', () => {
  it('returns non-empty string when famtastic_mode true', () => {
    const block = getLogoNoteBlock({ famtastic_mode: true });
    expect(block).toBeTruthy();
    expect(block).toContain('LOGO NOTE');
  });

  it('returns empty string when famtastic_mode false', () => {
    expect(getLogoNoteBlock({ famtastic_mode: false })).toBe('');
  });
});

// ── Gate helpers: L14275 (handleChatMessage single-page edit) ─────────────────

describe('shouldInjectFamtasticLogoMode — L14275 gate', () => {
  it('returns true when all conditions met', () => {
    expect(shouldInjectFamtasticLogoMode(
      { famtastic_mode: true }, null, 'build'
    )).toBe(true);
  });

  it('returns true for new_site requestType', () => {
    expect(shouldInjectFamtasticLogoMode(
      { famtastic_mode: true }, null, 'new_site'
    )).toBe(true);
  });

  it('returns false when famtastic_mode is false', () => {
    expect(shouldInjectFamtasticLogoMode(
      { famtastic_mode: false }, null, 'build'
    )).toBe(false);
  });

  it('returns false when famtastic_mode is truthy non-boolean (strict equality gate)', () => {
    expect(shouldInjectFamtasticLogoMode(
      { famtastic_mode: 1 }, null, 'build'
    )).toBe(false);
  });

  it('returns false when logo file already exists', () => {
    expect(shouldInjectFamtasticLogoMode(
      { famtastic_mode: true }, 'assets/logo.svg', 'build'
    )).toBe(false);
  });

  it('returns false for non-build requestType', () => {
    expect(shouldInjectFamtasticLogoMode(
      { famtastic_mode: true }, null, 'content_update'
    )).toBe(false);
  });
});

// ── Part B: Brief extraction lockstep (static parity check) ───────────────────

describe('Brief extraction lockstep (Part B parity)', () => {
  it('Claude extraction prompt includes tier field instruction', () => {
    // Verify the tier field is included in the JSON schema sent to Claude
    expect(serverSrc).toContain('"tier":"famtastic"');
    expect(serverSrc).toContain('tier: "famtastic" for bold/expressive design');
  });

  it('LOGO_SKELETON_TEMPLATE contains canonical anchor text', () => {
    expect(famSkeletons.LOGO_SKELETON_TEMPLATE).toContain('LOGO OUTPUT');
    expect(famSkeletons.LOGO_SKELETON_TEMPLATE).toContain('NAV LOGO WIRING');
  });

  it('LOGO_NOTE_PAGE contains LOGO NOTE anchor', () => {
    expect(famSkeletons.LOGO_NOTE_PAGE).toContain('LOGO NOTE');
  });
});
