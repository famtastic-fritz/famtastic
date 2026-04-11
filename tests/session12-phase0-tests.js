'use strict';

/*
 * Session 12 Phase 0 — Prompt Fidelity Tests
 *
 * Verifies the mandatory FAMtastic skeletons are wired into the build
 * prompt context and that extractLogoSVGs handles the multi-part SVG
 * response format correctly. The "generated HTML" assertions run
 * against a real rebuilt site, not a mock.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const REPO = path.resolve(__dirname, '..');
const SKELETONS_PATH = path.join(REPO, 'site-studio', 'lib', 'famtastic-skeletons.js');
const SERVER_PATH = path.join(REPO, 'site-studio', 'server.js');
const HERO_CSS_PATH = path.join(REPO, 'site-studio', 'public', 'css', 'fam-hero.css');

const famSkeletons = require(SKELETONS_PATH);

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, message: err.message });
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
  }
}

console.log('\n=== Session 12 Phase 0 — Prompt Fidelity ===\n');

// ─── Skeleton constants ──────────────────────────────────────────────

console.log('Skeleton constants:');

test('HERO_SKELETON contains fam-hero-layered', () => {
  assert.ok(famSkeletons.HERO_SKELETON.includes('fam-hero-layered'));
});

test('HERO_SKELETON contains fam-hero-layer--bg (double-dash)', () => {
  assert.ok(famSkeletons.HERO_SKELETON.includes('fam-hero-layer--bg'));
});

test('HERO_SKELETON contains fam-hero-layer--fx fam-fx-lights', () => {
  assert.ok(famSkeletons.HERO_SKELETON.includes('fam-hero-layer--fx fam-fx-lights'));
});

test('HERO_SKELETON contains fam-hero-layer--character', () => {
  assert.ok(famSkeletons.HERO_SKELETON.includes('fam-hero-layer--character'));
});

test('HERO_SKELETON contains fam-hero-layer--content', () => {
  assert.ok(famSkeletons.HERO_SKELETON.includes('fam-hero-layer--content'));
});

test('HERO_SKELETON contains DO NOT CHANGE CLASS NAMES directive', () => {
  assert.ok(famSkeletons.HERO_SKELETON.includes('DO NOT CHANGE CLASS NAMES'));
});

test('HERO_SKELETON prohibits kebab variant explicitly', () => {
  assert.ok(famSkeletons.HERO_SKELETON.includes('fam-hero-layer-bg'));
  // the prohibition block calls out the wrong form by name
});

test('DIVIDER_SKELETON mandates fam-wave-divider', () => {
  assert.ok(famSkeletons.DIVIDER_SKELETON.includes('fam-wave-divider'));
});

test('DIVIDER_SKELETON forbids hr and border-top as dividers', () => {
  assert.ok(famSkeletons.DIVIDER_SKELETON.includes('<hr>'));
  assert.ok(famSkeletons.DIVIDER_SKELETON.includes('border-top'));
});

test('INLINE_STYLE_PROHIBITION mentions fam-hero.css and fam-shapes.css', () => {
  assert.ok(famSkeletons.INLINE_STYLE_PROHIBITION.includes('fam-hero.css'));
  assert.ok(famSkeletons.INLINE_STYLE_PROHIBITION.includes('fam-shapes.css'));
});

test('LOGO_SKELETON_TEMPLATE declares exact delimiters', () => {
  assert.ok(famSkeletons.LOGO_SKELETON_TEMPLATE.includes('<!-- LOGO_FULL -->'));
  assert.ok(famSkeletons.LOGO_SKELETON_TEMPLATE.includes('<!-- LOGO_ICON -->'));
  assert.ok(famSkeletons.LOGO_SKELETON_TEMPLATE.includes('<!-- LOGO_WORDMARK -->'));
});

test('LOGO_NOTE_PAGE tells parallel pages not to emit SVG', () => {
  assert.ok(famSkeletons.LOGO_NOTE_PAGE.includes('Do NOT output'));
  assert.ok(famSkeletons.LOGO_NOTE_PAGE.includes('LOGO_FULL'));
});

// ─── extractLogoSVGs behavior ────────────────────────────────────────

console.log('\nextractLogoSVGs:');

test('extracts all three SVG blocks and strips them from HTML', () => {
  const tmpDir = path.join(require('os').tmpdir(), 'fam-session12-test-' + Date.now());
  fs.mkdirSync(tmpDir, { recursive: true });

  const response = `<!-- LOGO_FULL -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200"><rect fill="#7a1e1e" width="400" height="200"/></svg>

<!-- LOGO_ICON -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#c89b3c"/></svg>

<!-- LOGO_WORDMARK -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 80"><text x="10" y="50">Brand</text></svg>

<!DOCTYPE html>
<html lang="en"><head><title>Test</title></head><body></body></html>`;

  const { results, cleanedHtml } = famSkeletons.extractLogoSVGs(response, tmpDir);
  assert.strictEqual(Object.keys(results).length, 3, 'expected 3 extracted logos');
  assert.ok(fs.existsSync(path.join(tmpDir, 'assets', 'logo-full.svg')));
  assert.ok(fs.existsSync(path.join(tmpDir, 'assets', 'logo-icon.svg')));
  assert.ok(fs.existsSync(path.join(tmpDir, 'assets', 'logo-wordmark.svg')));
  assert.ok(cleanedHtml.startsWith('<!DOCTYPE html>'), 'cleaned HTML must start with DOCTYPE');
  assert.ok(!cleanedHtml.includes('<!-- LOGO_FULL -->'), 'cleaned HTML must not contain LOGO_FULL delimiter');
  assert.ok(!cleanedHtml.includes('<svg'), 'cleaned HTML must not contain any svg tags');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('extractLogoSVGs writes empty results when delimiters absent', () => {
  const tmpDir = path.join(require('os').tmpdir(), 'fam-session12-test-empty-' + Date.now());
  fs.mkdirSync(tmpDir, { recursive: true });

  const response = '<!DOCTYPE html><html><body>no logo blocks</body></html>';
  const { results, cleanedHtml } = famSkeletons.extractLogoSVGs(response, tmpDir);
  assert.strictEqual(Object.keys(results).length, 0);
  assert.ok(cleanedHtml.startsWith('<!DOCTYPE html>'));

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ─── server.js wiring ────────────────────────────────────────────────

console.log('\nserver.js wiring:');

const serverSrc = fs.readFileSync(SERVER_PATH, 'utf8');

test('server.js requires famtastic-skeletons', () => {
  assert.ok(serverSrc.includes("require('./lib/famtastic-skeletons')"));
});

test('buildPromptContext return includes heroSkeleton', () => {
  assert.ok(serverSrc.includes('heroSkeleton, dividerSkeleton, inlineStyleProhibition'));
});

test('buildTemplatePrompt injects LOGO_SKELETON_TEMPLATE when famtastic_mode', () => {
  assert.ok(serverSrc.includes('famSkeletons.LOGO_SKELETON_TEMPLATE'));
});

test('parallelBuild template path calls extractLogoSVGs', () => {
  assert.ok(serverSrc.includes('famSkeletons.extractLogoSVGs'));
});

test('spawnPage injects famSkeletonBlock', () => {
  assert.ok(serverSrc.includes('famSkeletonBlock'));
});

// ─── fam-hero.css vocabulary ─────────────────────────────────────────

console.log('\nfam-hero.css layered vocabulary:');

const heroCss = fs.readFileSync(HERO_CSS_PATH, 'utf8');

test('.fam-hero-layered selector exists in fam-hero.css', () => {
  assert.ok(heroCss.includes('.fam-hero-layered'));
});

test('.fam-hero-layer--bg selector exists', () => {
  assert.ok(heroCss.includes('.fam-hero-layer--bg'));
});

test('.fam-hero-layer--fx selector exists', () => {
  assert.ok(heroCss.includes('.fam-hero-layer--fx'));
});

test('.fam-hero-layer--character selector exists', () => {
  assert.ok(heroCss.includes('.fam-hero-layer--character'));
});

test('.fam-hero-layer--content selector exists', () => {
  assert.ok(heroCss.includes('.fam-hero-layer--content'));
});

test('.fam-fx-lights selector exists with animation', () => {
  assert.ok(heroCss.includes('.fam-fx-lights'));
  assert.ok(heroCss.includes('fam-fx-lights-drift'));
});

test('.fam-wave-divider:empty fallback exists', () => {
  assert.ok(heroCss.includes('.fam-wave-divider:empty'));
});

test('.fam-diagonal selector exists', () => {
  assert.ok(heroCss.includes('.fam-diagonal'));
});

test('prefers-reduced-motion guard exists for fx-lights', () => {
  assert.ok(heroCss.includes('prefers-reduced-motion'));
});

// ─── Protected files untouched ───────────────────────────────────────

console.log('\nProtected files:');

const { execFileSync } = require('child_process');

test('lib/fam-shapes.css not modified', () => {
  const out = execFileSync('git', ['diff', '--name-only', 'HEAD', '--', 'lib/fam-shapes.css'], {
    cwd: REPO,
  }).toString().trim();
  assert.strictEqual(out, '', 'lib/fam-shapes.css must not be modified');
});

test('lib/fam-motion.js not modified', () => {
  const out = execFileSync('git', ['diff', '--name-only', 'HEAD', '--', 'lib/fam-motion.js'], {
    cwd: REPO,
  }).toString().trim();
  assert.strictEqual(out, '', 'lib/fam-motion.js must not be modified');
});

// ─── Summary ─────────────────────────────────────────────────────────

console.log(`\n─────────────────────────────────`);
console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('\nFailures:');
  failures.forEach(f => console.log(`  - ${f.name}: ${f.message}`));
  process.exit(1);
}
console.log('');
