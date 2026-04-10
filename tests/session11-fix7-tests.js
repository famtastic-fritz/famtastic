#!/usr/bin/env node
/**
 * Session 11 Fix 7 Tests — SVG multi-part extraction + FAMtastic logo mode
 *
 * Verifies:
 *   1. extractMultiPartSvg() returns null for non-delimited input
 *   2. extractMultiPartSvg() correctly splits LOGO_FULL / LOGO_ICON /
 *      LOGO_WORDMARK delimited bodies into separate sanitized SVGs
 *   3. Missing delimiters are tolerated — it returns only the parts
 *      actually present
 *   4. Sanitization is applied to each extracted chunk (script stripped)
 *   5. Partial / single-part delimiter responses still return an object
 *      with just that one key
 */

'use strict';

process.env.STUDIO_NO_LISTEN = '1';
process.env.SITE_TAG = process.env.SITE_TAG || 'site-drop-the-beat';

const path = require('path');
const { extractMultiPartSvg, sanitizeSvg } = require(path.join(__dirname, '..', 'site-studio', 'server.js'));

let passed = 0;
let failed = 0;
function check(label, cond, detail = '') {
  if (cond) { console.log(`  PASS  ${label}`); passed++; }
  else      { console.log(`  FAIL  ${label}${detail ? ' — ' + detail : ''}`); failed++; }
}

console.log('\n── Test 1: non-delimited input returns null ──');
check('empty string → null',       extractMultiPartSvg('') === null);
check('null → null',               extractMultiPartSvg(null) === null);
check('plain svg → null',          extractMultiPartSvg('<svg><rect/></svg>') === null);
check('unrelated comment → null',  extractMultiPartSvg('<!-- just a comment --><svg></svg>') === null);

console.log('\n── Test 2: full three-part split ──');
const fullBody = `
<!-- LOGO_FULL -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 140">
  <rect width="400" height="140" fill="#123"/>
  <text x="20" y="80" fill="white">GROOVE</text>
</svg>

<!-- LOGO_ICON -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140">
  <circle cx="70" cy="70" r="60" fill="#abc"/>
</svg>

<!-- LOGO_WORDMARK -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 80">
  <text x="10" y="55" font-size="48">GROOVE</text>
</svg>
`;
const parts = extractMultiPartSvg(fullBody);
check('returns object',                    parts && typeof parts === 'object');
check('has LOGO_FULL',                     parts && typeof parts.LOGO_FULL === 'string');
check('has LOGO_ICON',                     parts && typeof parts.LOGO_ICON === 'string');
check('has LOGO_WORDMARK',                 parts && typeof parts.LOGO_WORDMARK === 'string');
check('LOGO_FULL starts with <svg',        parts.LOGO_FULL.startsWith('<svg'));
check('LOGO_FULL contains GROOVE',         parts.LOGO_FULL.includes('GROOVE'));
check('LOGO_ICON contains circle',         parts.LOGO_ICON.includes('circle'));
check('LOGO_WORDMARK contains text',       parts.LOGO_WORDMARK.includes('text'));
check('LOGO_FULL does not contain delim',  !parts.LOGO_FULL.includes('LOGO_ICON'));
check('LOGO_ICON does not contain delim',  !parts.LOGO_ICON.includes('LOGO_WORDMARK'));

console.log('\n── Test 3: partial (icon + wordmark only) ──');
const partialBody = `
<!-- LOGO_ICON -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64"/></svg>
<!-- LOGO_WORDMARK -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 60"><text>BRAND</text></svg>
`;
const partialParts = extractMultiPartSvg(partialBody);
check('partial: object returned',       partialParts && typeof partialParts === 'object');
check('partial: LOGO_ICON present',     partialParts.LOGO_ICON && partialParts.LOGO_ICON.includes('<svg'));
check('partial: LOGO_WORDMARK present', partialParts.LOGO_WORDMARK && partialParts.LOGO_WORDMARK.includes('<svg'));
check('partial: LOGO_FULL absent',      partialParts.LOGO_FULL === undefined);

console.log('\n── Test 4: single-part (just LOGO_FULL) ──');
const singleBody = `
<!-- LOGO_FULL -->
<svg xmlns="http://www.w3.org/2000/svg"><g><rect/></g></svg>
`;
const singleParts = extractMultiPartSvg(singleBody);
check('single: object returned', singleParts && typeof singleParts === 'object');
check('single: one key',         Object.keys(singleParts).length === 1);
check('single: LOGO_FULL set',   singleParts.LOGO_FULL.includes('<svg'));

console.log('\n── Test 5: sanitization strips scripts from each part ──');
const dirtyBody = `
<!-- LOGO_FULL -->
<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect/></svg>
<!-- LOGO_ICON -->
<svg xmlns="http://www.w3.org/2000/svg"><g onclick="steal()"><rect/></g></svg>
`;
const cleaned = extractMultiPartSvg(dirtyBody);
check('script removed from LOGO_FULL',      !/<script/i.test(cleaned.LOGO_FULL));
check('onclick removed from LOGO_ICON',     !/onclick/i.test(cleaned.LOGO_ICON));
check('LOGO_FULL still has <rect>',         /<rect/i.test(cleaned.LOGO_FULL));
check('LOGO_ICON still has <g>',            /<g/i.test(cleaned.LOGO_ICON));

console.log('\n── Test 6: sanitizeSvg is idempotent ──');
const clean = sanitizeSvg('<svg><rect/></svg>');
check('clean SVG round-trip',    clean === sanitizeSvg(clean));

console.log('\n' + '─'.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
