'use strict';

/**
 * Session 13 Phase 1 — DOM-aware surgical editor
 * Tests surgical-editor.js module and server.js integration.
 */

const path = require('path');
const fs = require('fs');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
    failed++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

const se = require(path.join(__dirname, '../site-studio/lib/surgical-editor'));

const SAMPLE_HTML = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
  <nav data-section-id="nav" data-fam-section="nav">
    <a href="/" data-field-id="nav-brand">Brand</a>
  </nav>
  <section data-section-id="hero" class="fam-hero-layered">
    <div class="fam-hero-layer--bg"></div>
    <div class="fam-hero-layer--content">
      <h1 data-field-id="hero-headline">Welcome</h1>
      <p data-field-id="hero-subhead">Great subheading here</p>
      <img data-slot-id="hero-1" data-slot-status="empty" data-slot-role="hero" src="" alt="hero">
    </div>
  </section>
  <section data-section-id="about">
    <h2 data-field-id="about-title">About Us</h2>
    <p data-field-id="about-body">Some text about us</p>
  </section>
</body>
</html>`;

// ─────────────────────────────────────────────
// buildStructuralIndex
// ─────────────────────────────────────────────
console.log('\nbuildStructuralIndex');

test('returns page and sections array', () => {
  const index = se.buildStructuralIndex(SAMPLE_HTML, 'index.html');
  assert(index.page === 'index.html', 'page must match');
  assert(Array.isArray(index.sections), 'sections must be array');
  assert(Array.isArray(index.fields), 'fields must be array');
  assert(Array.isArray(index.slots), 'slots must be array');
  assert(typeof index.built_at === 'number', 'built_at must be timestamp');
});

test('detects data-section-id sections', () => {
  const index = se.buildStructuralIndex(SAMPLE_HTML, 'index.html');
  const sectionIds = index.sections.map(s => s.selector);
  assert(sectionIds.some(s => s.includes('hero')), 'hero section not detected');
  assert(sectionIds.some(s => s.includes('about')), 'about section not detected');
});

test('includes token_estimate per section', () => {
  const index = se.buildStructuralIndex(SAMPLE_HTML, 'index.html');
  for (const section of index.sections) {
    assert(typeof section.token_estimate === 'number' && section.token_estimate > 0, `token_estimate missing for ${section.selector}`);
  }
});

test('detects data-field-id fields', () => {
  const index = se.buildStructuralIndex(SAMPLE_HTML, 'index.html');
  assert(index.fields.length >= 4, `Expected at least 4 fields, got ${index.fields.length}`);
  const fieldIds = index.fields.map(f => f.field_id);
  assert(fieldIds.includes('hero-headline'), 'hero-headline field not found');
  assert(fieldIds.includes('about-title'), 'about-title field not found');
});

test('detects data-slot-id slots', () => {
  const index = se.buildStructuralIndex(SAMPLE_HTML, 'index.html');
  assert(index.slots.length === 1, `Expected 1 slot, got ${index.slots.length}`);
  assert(index.slots[0].slot_id === 'hero-1', 'slot_id mismatch');
  assert(index.slots[0].role === 'hero', 'slot role mismatch');
});

test('handles empty html gracefully', () => {
  const index = se.buildStructuralIndex('', 'index.html');
  assert(index.sections.length === 0, 'empty html should produce no sections');
  assert(index.fields.length === 0, 'empty html should produce no fields');
});

test('handles null html gracefully', () => {
  const index = se.buildStructuralIndex(null, 'index.html');
  assert(Array.isArray(index.sections), 'sections should be empty array');
});

// ─────────────────────────────────────────────
// extractSection
// ─────────────────────────────────────────────
console.log('\nextractSection');

test('extracts targeted section by selector', () => {
  const section = se.extractSection(SAMPLE_HTML, '[data-section-id="hero"]');
  assert(section.includes('fam-hero-layered'), 'extracted section should contain hero content');
  assert(section.includes('hero-headline'), 'extracted section should contain inner fields');
});

test('extracted section is smaller than full HTML', () => {
  // Build a more realistic HTML with many sections to test real-world token savings
  const bigHtml = SAMPLE_HTML + Array(20).fill('<section data-section-id="extra"><p>Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p></section>').join('\n');
  const section = se.extractSection(bigHtml, '[data-section-id="hero"]');
  assert(section.length < bigHtml.length * 0.3, `extracted section should be < 30% of full HTML (got ${Math.round(section.length/bigHtml.length*100)}%)`);
});

test('extracts field by data-field-id selector', () => {
  const field = se.extractSection(SAMPLE_HTML, '[data-field-id="hero-headline"]');
  assert(field.includes('Welcome'), 'extracted field should contain text');
});

test('throws on missing selector', () => {
  let threw = false;
  try { se.extractSection(SAMPLE_HTML, '[data-section-id="does-not-exist"]'); }
  catch (e) { threw = true; assert(e.message.includes('not found'), 'error should say "not found"'); }
  assert(threw, 'should throw for missing selector');
});

test('throws on empty html', () => {
  let threw = false;
  try { se.extractSection('', '[data-section-id="hero"]'); }
  catch (e) { threw = true; }
  assert(threw, 'should throw for empty html');
});

// ─────────────────────────────────────────────
// surgicalEdit
// ─────────────────────────────────────────────
console.log('\nsurgicalEdit');

test('replaces only the targeted node content', () => {
  const updated = se.surgicalEdit(SAMPLE_HTML, '[data-field-id="hero-headline"]', '<h1 data-field-id="hero-headline">New Headline</h1>');
  assert(updated.includes('New Headline'), 'new content should be present');
  assert(!updated.includes('>Welcome<'), 'old content should be gone');
  assert(updated.includes('Great subheading here'), 'adjacent content should be untouched');
  assert(updated.includes('About Us'), 'other section should be untouched');
});

test('returns full HTML (not just the section)', () => {
  const updated = se.surgicalEdit(SAMPLE_HTML, '[data-field-id="hero-headline"]', 'New');
  assert(updated.includes('<!DOCTYPE html>') || updated.includes('<html'), 'should return full HTML');
  assert(updated.includes('About Us'), 'full page content present');
});

test('throws on missing selector', () => {
  let threw = false;
  try { se.surgicalEdit(SAMPLE_HTML, '[data-section-id="missing"]', 'new'); }
  catch (e) { threw = true; }
  assert(threw, 'should throw for missing selector');
});

// ─────────────────────────────────────────────
// trySurgicalEdit
// ─────────────────────────────────────────────
console.log('\ntrySurgicalEdit');

test('returns updated HTML on hit', () => {
  const result = se.trySurgicalEdit(SAMPLE_HTML, '[data-field-id="hero-subhead"]', '<p data-field-id="hero-subhead">New subhead</p>');
  assert(result !== null, 'should not return null on hit');
  assert(result.includes('New subhead'), 'should contain new content');
});

test('returns null on selector miss', () => {
  const result = se.trySurgicalEdit(SAMPLE_HTML, '[data-section-id="nonexistent"]', 'new');
  assert(result === null, 'should return null on miss');
});

// ─────────────────────────────────────────────
// server.js integration
// ─────────────────────────────────────────────
console.log('\nserver.js integration');

const serverSrc = fs.readFileSync(path.join(__dirname, '../site-studio/server.js'), 'utf8');

test('surgical-editor is required in server.js', () => {
  assert(serverSrc.includes("require('./lib/surgical-editor')"), 'surgical-editor not required');
});

test('buildStructuralIndex is called in runPostProcessing', () => {
  assert(serverSrc.includes('surgicalEditor.buildStructuralIndex'), 'buildStructuralIndex not called in server.js');
});

test('structural_index is stored in spec', () => {
  assert(serverSrc.includes('spec.structural_index'), 'structural_index not stored in spec');
});

test('structural index update is non-fatal (wrapped in try/catch)', () => {
  const ppIdx = serverSrc.indexOf('surgicalEditor.buildStructuralIndex');
  // Look wider — the try block starts above the call
  const context = serverSrc.slice(ppIdx - 500, ppIdx + 300);
  assert(context.includes('try {') || context.includes('try{'), 'structural index update should be in a try block');
});

// ─────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────
console.log('\n──────────────────────────────────────────');
console.log(`${passed} passed, ${failed} failed`);
console.log('──────────────────────────────────────────\n');
if (failed > 0) process.exit(1);
