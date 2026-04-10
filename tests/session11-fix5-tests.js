#!/usr/bin/env node
/**
 * Session 11 Fix 5 Tests — enhancement_pass classifier intent + 6 opt-in passes
 *
 * Verifies:
 *   1. classifyRequest() returns 'enhancement_pass' for the relevant keywords
 *      and does NOT return 'enhancement_pass' for unrelated content edits.
 *   2. detectEnhancementPasses() correctly derives the six pass flags
 *      (images, shapes, animations, icons, generated, famtasticMode).
 *   3. "famtasticMode" turns all sibling flags on.
 *   4. An unqualified "enhancement pass" request defaults to famtasticMode.
 */

'use strict';

// Tests require server.js to expose classifyRequest + detectEnhancementPasses
// without actually starting a network listener. Gate server startup behind
// the same env flag the other unit tests use.
process.env.STUDIO_NO_LISTEN = '1';
process.env.SITE_TAG = process.env.SITE_TAG || 'site-drop-the-beat';

const path = require('path');
const { classifyRequest, detectEnhancementPasses } = require(path.join(__dirname, '..', 'site-studio', 'server.js'));

let passed = 0;
let failed = 0;
function check(label, cond, detail = '') {
  if (cond) { console.log(`  PASS  ${label}`); passed++; }
  else      { console.log(`  FAIL  ${label}${detail ? ' — ' + detail : ''}`); failed++; }
}

// Reusable "site already has a brief + html" spec so the classifier doesn't
// short-circuit on new_site / build.
const spec = {
  design_brief: { approved: true },
  pages: ['home'],
  site_name: 'Drop The Beat',
};

console.log('\n── Test 1: classifyRequest → enhancement_pass triggers ──');
const enhancementPhrases = [
  'add some animations',
  'add shapes to the hero',
  'add lucide icons',
  'add more image slots',
  'add svg dividers',
  'run an enhancement pass',
  'run a polish pass',
  'make it more famtastic',
  'go full famtastic',
  'decorate the page',
  'add blobs and waves',
  'add scroll effects',
];
for (const phrase of enhancementPhrases) {
  const r = classifyRequest(phrase, spec);
  check(`"${phrase}" → enhancement_pass`, r === 'enhancement_pass', `got ${r}`);
}

console.log('\n── Test 2: classifyRequest does NOT mistag unrelated requests ──');
const nonEnhancementPhrases = [
  { msg: 'change the phone number to 555-1234', expect: 'content_update' },
  { msg: 'update the hero headline to say Grand Opening', expect: 'content_update' },
  { msg: 'add a section', expect: 'layout_update' },
  { msg: 'break this into 3 separate pages', expect: 'restructure' },
  { msg: 'deploy to production', expect: 'deploy' },
];
for (const { msg, expect } of nonEnhancementPhrases) {
  const r = classifyRequest(msg, spec);
  check(`"${msg}" → ${expect}`, r === expect, `got ${r}`);
}

console.log('\n── Test 3: detectEnhancementPasses — individual passes ──');
const p1 = detectEnhancementPasses('add some animations');
check('animations flag set', p1.animations === true);
check('images flag NOT set (specific pass)', p1.images === false);

const p2 = detectEnhancementPasses('add some shapes and blobs');
check('shapes flag set', p2.shapes === true);
check('animations flag NOT set', p2.animations === false);

const p3 = detectEnhancementPasses('add lucide icons throughout');
check('icons flag set', p3.icons === true);

const p4 = detectEnhancementPasses('add more image slots');
check('images flag set', p4.images === true);

const p5 = detectEnhancementPasses('add svg dividers between sections');
check('generated flag set', p5.generated === true);

console.log('\n── Test 4: famtasticMode implies all flags ──');
const famFlags = detectEnhancementPasses('make it more famtastic');
check('famtasticMode=true', famFlags.famtasticMode === true);
check('famtasticMode → images',     famFlags.images === true);
check('famtasticMode → shapes',     famFlags.shapes === true);
check('famtasticMode → animations', famFlags.animations === true);
check('famtasticMode → icons',      famFlags.icons === true);
check('famtasticMode → generated',  famFlags.generated === true);

console.log('\n── Test 5: unqualified "enhancement pass" defaults to famtasticMode ──');
const def = detectEnhancementPasses('run an enhancement pass');
check('default to famtasticMode', def.famtasticMode === true,
  `got flags ${JSON.stringify(def)}`);
check('default → all passes on',
  def.images && def.shapes && def.animations && def.icons && def.generated);

console.log('\n── Test 6: multiple specific passes in one sentence ──');
const combo = detectEnhancementPasses('add animations and shapes and icons');
check('animations set', combo.animations === true);
check('shapes set',     combo.shapes === true);
check('icons set',      combo.icons === true);
check('famtasticMode NOT set (user was specific)', combo.famtasticMode === false);

console.log('\n' + '─'.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
