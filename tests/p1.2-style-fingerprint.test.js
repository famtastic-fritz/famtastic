'use strict';

/**
 * P1.2 — Style fingerprint static tests.
 *
 * Run via: node tests/p1.2-style-fingerprint.test.js
 *
 * Covers:
 *   - generateStyleFingerprint produces non-FAMtastic-default palettes for
 *     ≥5 different vertical+brief combinations
 *   - validateFingerprintShape correctly accepts well-formed and rejects malformed
 *   - Schema validator wires fingerprint shape errors as warnings
 *   - Build prompt assembly references spec.style_fingerprint.palette before
 *     falling back to FAMTASTIC_DEFAULT_PALETTE
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const sf = require('../site-studio/lib/style-fingerprint');
const { validateSpec } = require('../site-studio/lib/spec-schema');
const { FAMTASTIC_DEFAULT_PALETTE } = require('../site-studio/lib/famtastic-skeletons');

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.error(`  ✗ ${name}\n      ${e.message}`); failed++; }
}

console.log('P1.2 — Style fingerprint tests');

console.log('\n[1] generateStyleFingerprint — vertical defaults distinct from FAMtastic default');

const verticalCases = [
  { vertical: 'church',     desc: 'a small Baptist church' },
  { vertical: 'transport',  desc: 'a freight company' },
  { vertical: 'florist',    desc: "a neighborhood flower shop" },
  { vertical: 'barber',     desc: 'a classic men\'s barbershop' },
  { vertical: 'accounting', desc: 'a CPA firm' },
  { vertical: 'cafe',       desc: 'a third-wave coffee shop' },
  { vertical: 'lawn',       desc: 'a residential landscaping crew' },
];

const seen = new Set();
const famPrimary = FAMTASTIC_DEFAULT_PALETTE.primary.toLowerCase();

for (const c of verticalCases) {
  test(`${c.vertical}: produces non-FAMtastic primary, valid shape`, () => {
    const fp = sf.generateStyleFingerprint({ business_description: c.desc }, { vertical: c.vertical });
    const v = sf.validateFingerprintShape(fp);
    assert(v.valid, `shape errors: ${v.errors.join(', ')}`);
    assert.notStrictEqual(fp.palette.primary.toLowerCase(), famPrimary, 'primary must not equal FAMtastic default');
    assert.strictEqual(fp.source, 'vertical_default');
    seen.add(fp.palette.primary.toLowerCase());
  });
}

test('≥5 distinct primaries produced across the vertical set', () => {
  assert(seen.size >= 5, `expected ≥5 distinct primaries, got ${seen.size}: ${[...seen].join(', ')}`);
});

console.log('\n[2] generateStyleFingerprint — brief-extracted hex overrides vertical default');

test('explicit primary hex in brief overrides vertical', () => {
  const fp = sf.generateStyleFingerprint(
    { business_description: 'a coffee shop', style_notes: 'primary: #FF00FF, accent: #00FF00' },
    { vertical: 'cafe' }
  );
  assert.strictEqual(fp.palette.primary.toLowerCase(), '#ff00ff');
  assert.strictEqual(fp.palette.accent.toLowerCase(), '#00ff00');
  assert.strictEqual(fp.source, 'brief_extracted');
});

console.log('\n[3] generateStyleFingerprint — brand.json recovery for legacy specs');

test('brand.json colors flow into fingerprint when no brief signal', () => {
  const fp = sf.generateStyleFingerprint(
    { business_description: 'an unknown vertical' },
    {
      vertical: 'frobnicator', // no match
      brand: { primary_color: '#7B2D3B', accent_color: '#C9A24A', bg_color: '#F0F0EE', heading_font: 'Roboto Slab', body_font: 'Inter' },
    }
  );
  assert.strictEqual(fp.palette.primary.toLowerCase(), '#7b2d3b');
  assert.strictEqual(fp.source, 'brand_recovered');
  assert.strictEqual(fp.typography.heading_family, 'Roboto Slab');
});

console.log('\n[4] generateStyleFingerprint — falls back to FAMtastic default cleanly');

test('unknown vertical, no brief, no brand → famtastic_default with valid shape', () => {
  const fp = sf.generateStyleFingerprint({ business_description: 'a frobnicator outfit' }, { vertical: 'frobnicator' });
  assert.strictEqual(fp.source, 'famtastic_default');
  const v = sf.validateFingerprintShape(fp);
  assert(v.valid, `shape errors: ${v.errors.join(', ')}`);
});

console.log('\n[5] validateFingerprintShape — rejects malformed');

test('rejects missing palette', () => {
  const r = sf.validateFingerprintShape({ typography: {}, mood: 'x', source: 'vertical_default' });
  assert(!r.valid);
});

test('rejects non-hex primary', () => {
  const r = sf.validateFingerprintShape({
    palette: { primary: 'red', secondary: '#000000', accent: '#000000', neutral: '#000000', background: '#ffffff' },
    typography: { heading_family: 'X', body_family: 'Y', scale: 'z' },
    mood: 'x',
    source: 'vertical_default',
  });
  assert(!r.valid);
  assert(r.errors.some(e => /palette.primary/.test(e)));
});

test('rejects bogus source', () => {
  const fp = sf.generateStyleFingerprint({}, { vertical: 'cafe' });
  fp.source = 'made_up_source';
  const r = sf.validateFingerprintShape(fp);
  assert(!r.valid);
  assert(r.errors.some(e => /source/.test(e)));
});

console.log('\n[6] spec-schema integrates fingerprint warnings');

test('validateSpec surfaces fingerprint shape warnings', () => {
  const spec = {
    tag: 'site-test', site_name: 'Test', state: 'built', created_at: '2026-04-27T00:00:00Z', tier: 'famtastic',
    style_fingerprint: { palette: { primary: 'NOT-A-HEX' }, typography: {}, mood: 'x', source: 'vertical_default' },
  };
  const r = validateSpec(spec);
  assert(r.warnings.some(w => /style_fingerprint/.test(w)), `expected fingerprint warning, got: ${r.warnings.join(' | ')}`);
});

test('validateSpec passes a well-formed fingerprint', () => {
  const fp = sf.generateStyleFingerprint({ business_description: 'a coffee shop' }, { vertical: 'cafe' });
  const spec = {
    tag: 'site-test', site_name: 'Test', state: 'built', created_at: '2026-04-27T00:00:00Z', tier: 'famtastic',
    style_fingerprint: fp,
  };
  const r = validateSpec(spec);
  assert(!r.warnings.some(w => /style_fingerprint/.test(w)), `unexpected fingerprint warning: ${r.warnings.join(' | ')}`);
});

console.log('\n[7] Build prompt — server.js references fingerprint before FAMTASTIC default');

test('server.js wires spec.style_fingerprint.palette ahead of FAMTASTIC_DEFAULT_PALETTE', () => {
  const serverSrc = fs.readFileSync(path.join(__dirname, '..', 'site-studio', 'server.js'), 'utf8');
  // Three known interpolation sites should now reference style_fingerprint?.palette
  // before falling through to spec.colors and famSkeletons.FAMTASTIC_DEFAULT_PALETTE.
  const occurrences = (serverSrc.match(/style_fingerprint\?\.palette\?\.primary/g) || []).length;
  assert(occurrences >= 2, `expected ≥2 style_fingerprint?.palette references in server.js, got ${occurrences}`);
  // The visual-requirements branch should call buildFingerprintPromptBlock when the spec carries a fingerprint
  assert(serverSrc.includes('styleFingerprint.buildFingerprintPromptBlock(spec.style_fingerprint)'),
    'expected server.js visual-requirements block to call buildFingerprintPromptBlock');
});

console.log('\n[8] buildFingerprintPromptBlock contains binding constraints');

test('prompt block names palette, fonts, and locks language', () => {
  const fp = sf.generateStyleFingerprint({}, { vertical: 'cafe' });
  const block = sf.buildFingerprintPromptBlock(fp);
  assert(/LOCKED STYLE FINGERPRINT/.test(block));
  assert(/primary:\s+#/.test(block));
  assert(/heading font/.test(block));
  assert(/Using any other colors or fonts is a build failure/.test(block));
});

console.log(`\nResult: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
