/**
 * Baseline Failure Closure — unit tests
 *
 * Locks in the classifier reordering, new_site_create intent, identity
 * helpers, and type+location synthesis introduced in the V9 closure plan.
 */

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

process.env.SITE_TAG = process.env.SITE_TAG || 'site-demo';
process.env.STUDIO_NO_LISTEN = '1';

const require = createRequire(import.meta.url);
const {
  classifyRequest,
  normalizeBizName,
  checkSameBusinessIdentity,
  isMeaningfulBusinessName,
  tryTypeLocationSynthesis,
  GENERIC_BUSINESS_TYPES,
} = require('../server.js');

// ── normalizeBizName ─────────────────────────────────────────────────────────

describe('normalizeBizName', () => {
  it('strips common business words and punctuation', () => {
    expect(normalizeBizName("Tony's Barber Shop")).toBe('tonys');
    expect(normalizeBizName('The Daily Grind Cafe')).toBe('daily grind');
    expect(normalizeBizName('Acme, Inc.')).toBe('acme');
  });

  it('returns empty string for empty/null input', () => {
    expect(normalizeBizName(null)).toBe('');
    expect(normalizeBizName('')).toBe('');
    expect(normalizeBizName(undefined)).toBe('');
  });

  it('preserves meaningful business words', () => {
    expect(normalizeBizName('Small Accounting Firm')).toBe('small accounting');
  });
});

describe('checkSameBusinessIdentity', () => {
  it('matches same business with different formatting', () => {
    expect(checkSameBusinessIdentity("Tony's Barber Shop", 'tonys barber shop')).toBe(true);
    expect(checkSameBusinessIdentity('Acme Inc.', 'Acme, Inc')).toBe(true);
  });

  it('rejects different businesses', () => {
    expect(checkSameBusinessIdentity('Black Southern Church', 'Small Accounting Firm')).toBe(false);
    expect(checkSameBusinessIdentity('Tony Pizza', 'Tony Burger')).toBe(false);
  });

  it('returns false for empty input on either side', () => {
    expect(checkSameBusinessIdentity('', 'something')).toBe(false);
    expect(checkSameBusinessIdentity('something', null)).toBe(false);
    expect(checkSameBusinessIdentity('the inc', 'llc co')).toBe(false); // both empty after strip
  });
});

describe('isMeaningfulBusinessName', () => {
  it('rejects "New Business" placeholder', () => {
    expect(isMeaningfulBusinessName('New Business')).toBe(false);
  });

  it('rejects empty/null', () => {
    expect(isMeaningfulBusinessName('')).toBe(false);
    expect(isMeaningfulBusinessName(null)).toBe(false);
  });

  it("rejects names made entirely of generic category words", () => {
    expect(isMeaningfulBusinessName('Restaurant Shop')).toBe(false);
    expect(isMeaningfulBusinessName('The Church')).toBe(false);
  });

  it('accepts proper business names', () => {
    expect(isMeaningfulBusinessName("Mario's Pizza")).toBe(true);
    expect(isMeaningfulBusinessName('Acme Tools')).toBe(true);
  });
});

// ── tryTypeLocationSynthesis ─────────────────────────────────────────────────

describe('tryTypeLocationSynthesis', () => {
  it('synthesizes from "church in Atlanta"', () => {
    const result = tryTypeLocationSynthesis(
      'Build me a 3-page website for a Black southern church in Atlanta, GA.',
      null
    );
    expect(result).not.toBeNull();
    expect(result.business_name).toContain('Church in Atlanta');
    expect(result.tag).toMatch(/^site-church-atlanta/);
    expect(result.business_type).toBe('church');
    expect(result.location).toContain('Atlanta');
  });

  it('synthesizes from "barber in Brooklyn"', () => {
    const result = tryTypeLocationSynthesis('Make a site for a barber in Brooklyn', null);
    expect(result).not.toBeNull();
    expect(result.tag).toMatch(/^site-barber-brooklyn/);
  });

  it('returns null when no business type detected', () => {
    expect(tryTypeLocationSynthesis('Build a site for some business in Chicago', null)).toBeNull();
  });

  it('returns null when no location detected', () => {
    expect(tryTypeLocationSynthesis('Build a site for a church', null)).toBeNull();
  });

  it('inherits tone/cta/pages from base brief if provided', () => {
    const base = { tone: ['warm'], cta: 'Visit Us', pages: ['home', 'visit'] };
    const result = tryTypeLocationSynthesis('a church in Brooklyn', base);
    expect(result.tone).toEqual(['warm']);
    expect(result.cta).toBe('Visit Us');
    expect(result.pages).toEqual(['home', 'visit']);
  });
});

// ── classifyRequest — new_site_create + reordered gates ──────────────────────

describe('classifyRequest — new_site_create', () => {
  const accountingSpec = {
    site_name: 'Small Accounting Firm',
    design_brief: { approved: true },
  };

  it('THE BASELINE: church prompt while on accounting firm → new_site_create', () => {
    const msg = "Build me a 3-page website for a Black southern church in Atlanta, GA. The pages should be Home, About Us, and Visit Us. Keep it simple and clean. Once it's built, deploy it so I can see it live.";
    expect(classifyRequest(msg, accountingSpec)).toBe('new_site_create');
  });

  it('proper-noun build request → new_site_create', () => {
    const msg = "Build me a website for Mario's Pizza in Atlanta";
    expect(classifyRequest(msg, accountingSpec)).toBe('new_site_create');
  });

  it('build phrase with edit language → NOT new_site_create', () => {
    expect(classifyRequest('Build me a website for the church and update the hero', accountingSpec))
      .not.toBe('new_site_create');
    expect(classifyRequest('Change the hero headline to Welcome', accountingSpec))
      .not.toBe('new_site_create');
  });

  it('build request matching active site name → NOT new_site_create', () => {
    const msg = 'Build me a website for Small Accounting Firm';
    // matches active site name → suppressed
    expect(classifyRequest(msg, accountingSpec)).not.toBe('new_site_create');
  });

  it('no active site → new_site_create allowed even without proper noun', () => {
    const msg = 'Build me a website for a church in Atlanta';
    expect(classifyRequest(msg, null)).toBe('new_site_create');
  });
});

describe('classifyRequest — deploy gate vs !hasBrief', () => {
  it('deploy keyword + no approved brief → new_site (not deploy)', () => {
    const msg = "Once it's built, deploy it";
    const noBriefSpec = { site_name: 'site-demo' }; // no design_brief.approved
    // Deploy used to win at L10788 before !hasBrief at L10802. With reorder,
    // !hasBrief now wins first.
    expect(classifyRequest(msg, noBriefSpec)).toBe('new_site');
  });

  it('deploy keyword + approved brief + no new-site target → deploy', () => {
    const msg = 'deploy the site';
    const briefedSpec = {
      site_name: 'Small Accounting Firm',
      design_brief: { approved: true },
    };
    expect(classifyRequest(msg, briefedSpec)).toBe('deploy');
  });
});

// Note: content_update path testing requires hasHtml=true on disk, which
// depends on the active SITE_TAG having dist/index.html. The full
// content_update precedence is exercised by integration scenarios in the
// verification suite, not unit tests.

// Sanity: GENERIC_BUSINESS_TYPES export is reachable
describe('exports', () => {
  it('GENERIC_BUSINESS_TYPES is a non-empty array including "church"', () => {
    expect(Array.isArray(GENERIC_BUSINESS_TYPES)).toBe(true);
    expect(GENERIC_BUSINESS_TYPES).toContain('church');
    expect(GENERIC_BUSINESS_TYPES).toContain('barber');
    expect(GENERIC_BUSINESS_TYPES).toContain('cafe');
  });
});
