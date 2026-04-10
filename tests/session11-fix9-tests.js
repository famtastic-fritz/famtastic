#!/usr/bin/env node
/**
 * Session 11 Fix 9 Tests — Multi-layer hero CSS (fam-hero.css)
 *
 * Verifies:
 *   1. site-studio/public/css/fam-hero.css exists and is non-trivial
 *   2. The 7-layer model classes are all defined
 *      (.fam-hero, __bg, __pattern, __shapes, __media, __lights,
 *       __sparkle, __content)
 *   3. Each layer has an explicit z-index assignment in the documented order
 *   4. Background, pattern, and light presets are present
 *   5. Bleed utilities are present
 *   6. Reduced-motion guards exist for the animated layers
 *   7. lib/fam-shapes.css is UNCHANGED relative to HEAD (Fix 9 must
 *      add a new file, never modify the existing shape library)
 *   8. The build pipeline already wires fam-hero.css into the famAssets
 *      list in server.js (head guardrail)
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT      = path.join(__dirname, '..');
const HERO_CSS  = path.join(ROOT, 'site-studio', 'public', 'css', 'fam-hero.css');
const SHAPES    = path.join(ROOT, 'lib', 'fam-shapes.css');
const SERVER_JS = path.join(ROOT, 'site-studio', 'server.js');

let passed = 0;
let failed = 0;
function check(label, cond, detail = '') {
  if (cond) { console.log(`  PASS  ${label}`); passed++; }
  else      { console.log(`  FAIL  ${label}${detail ? ' — ' + detail : ''}`); failed++; }
}

console.log('\n── Test 1: file exists and has substance ──');
check('fam-hero.css exists', fs.existsSync(HERO_CSS));
const css = fs.existsSync(HERO_CSS) ? fs.readFileSync(HERO_CSS, 'utf8') : '';
check('fam-hero.css >= 2KB', css.length >= 2000, `got ${css.length} bytes`);
check('has block comment header', /\/\*\*[\s\S]*fam-hero\.css[\s\S]*\*\//.test(css));

console.log('\n── Test 2: layer model classes are defined ──');
const layerClasses = [
  '.fam-hero',
  '.fam-hero__bg',
  '.fam-hero__pattern',
  '.fam-hero__shapes',
  '.fam-hero__media',
  '.fam-hero__lights',
  '.fam-hero__sparkle',
  '.fam-hero__content',
];
for (const cls of layerClasses) {
  const re = new RegExp(cls.replace(/[.$]/g, '\\$&') + '\\s*[,{]');
  check(`defines ${cls}`, re.test(css));
}

console.log('\n── Test 3: z-index ordering ──');
function zIndexFor(selector) {
  const re = new RegExp(
    selector.replace(/[.$]/g, '\\$&') +
    '\\s*\\{[^}]*z-index:\\s*(\\d+)',
    'm'
  );
  const m = css.match(re);
  return m ? Number(m[1]) : null;
}
const expected = {
  '.fam-hero__bg':       0,
  '.fam-hero__pattern':  1,
  '.fam-hero__shapes':   2,
  '.fam-hero__media':    3,
  '.fam-hero__lights':   4,
  '.fam-hero__sparkle':  5,
  '.fam-hero__content':  6,
};
for (const [sel, z] of Object.entries(expected)) {
  const got = zIndexFor(sel);
  check(`${sel} z-index === ${z}`, got === z, `got ${got}`);
}

console.log('\n── Test 4: background, pattern, light presets ──');
const presets = [
  '.fam-hero__bg--gradient-sunset',
  '.fam-hero__bg--gradient-neon',
  '.fam-hero__bg--gradient-vinyl',
  '.fam-hero__pattern--dots',
  '.fam-hero__pattern--grid',
  '.fam-hero__pattern--noise',
  '.fam-hero__pattern--vinyl',
  '.fam-light',
  '.fam-light--violet',
  '.fam-light--cyan',
  '.fam-light--tl',
  '.fam-light--br',
  '.fam-spotlight',
];
for (const p of presets) {
  check(`defines ${p}`, css.includes(p));
}

console.log('\n── Test 5: bleed utilities ──');
const bleeds = ['.fam-bleed-l', '.fam-bleed-r', '.fam-bleed-t', '.fam-bleed-b', '.fam-bleed-x', '.fam-bleed-y', '.fam-bleed-all'];
for (const b of bleeds) check(`defines ${b}`, css.includes(b));

console.log('\n── Test 6: reduced-motion guards ──');
check('has prefers-reduced-motion media query', /@media\s*\(\s*prefers-reduced-motion/.test(css));
check('disables fam-light--drift under reduced motion',
  /prefers-reduced-motion[\s\S]*fam-light--drift\s*\{[^}]*animation\s*:\s*none/.test(css));
check('softens sparkle under reduced motion',
  /prefers-reduced-motion[\s\S]*fam-hero__sparkle/.test(css));

console.log('\n── Test 7: fam-shapes.css unchanged at HEAD ──');
let shapesUnchanged = false;
try {
  const diff = execFileSync('git', ['diff', '--name-only', 'HEAD', '--', 'lib/fam-shapes.css'],
    { cwd: ROOT, encoding: 'utf8' });
  shapesUnchanged = diff.trim() === '';
} catch (e) {
  shapesUnchanged = false;
}
check('git diff for lib/fam-shapes.css is empty', shapesUnchanged);
check('fam-shapes.css still exists', fs.existsSync(SHAPES));

console.log('\n── Test 8: server.js head-guardrail wires fam-hero.css ──');
const server = fs.readFileSync(SERVER_JS, 'utf8');
check('server.js references fam-hero.css source',
  server.includes("'fam-hero.css'") || server.includes('"fam-hero.css"'));
check('server.js injects assets/css/fam-hero.css link tag',
  server.includes('assets/css/fam-hero.css'));

console.log('\n' + '─'.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
