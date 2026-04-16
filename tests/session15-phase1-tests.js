'use strict';
/**
 * Session 15 Phase 1 — Validation plan + orb integration
 */

const fs   = require('fs');
const path = require('path');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  \u2713 ' + name); passed++; }
  catch (e) { console.error('  \u2717 ' + name + '\n    ' + e.message); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'Assertion failed'); }

const ROOT   = path.join(__dirname, '..');
const SERVER = fs.readFileSync(path.join(ROOT, 'site-studio/server.js'), 'utf8');
const ORB    = fs.readFileSync(path.join(ROOT, 'site-studio/public/js/studio-orb.js'), 'utf8');
const HTML   = fs.readFileSync(path.join(ROOT, 'site-studio/public/index.html'), 'utf8');
const PLAN   = JSON.parse(fs.readFileSync(path.join(ROOT, 'site-studio/validation-plan.json'), 'utf8'));

console.log('\nvalidation-plan.json');

test('plan has 12 steps', () => {
  assert(PLAN.steps.length === 12, 'Expected 12 steps, got ' + PLAN.steps.length);
});

test('all steps have required fields', () => {
  PLAN.steps.forEach(s => {
    assert(s.id, 'step missing id');
    assert(s.title, 'step ' + s.id + ' missing title');
    assert(s.description, 'step ' + s.id + ' missing description');
    assert(s.show_me_target, 'step ' + s.id + ' missing show_me_target');
    assert(s.show_me_instruction, 'step ' + s.id + ' missing show_me_instruction');
    assert(s.status === 'pending', 'step ' + s.id + ' should start as pending');
  });
});

test('step IDs are sequential 1-12', () => {
  PLAN.steps.forEach((s, i) => assert(s.id === i + 1, 'Step ' + (i+1) + ' has id ' + s.id));
});

test('revenue model step (id 3) has show_me_target pointing to chips', () => {
  const rev = PLAN.steps.find(s => s.id === 3);
  assert(rev, 'Step 3 not found');
  assert(rev.show_me_target.includes('brief-chip') || rev.show_me_target.includes('revenue'), 'revenue step should target chip element');
});

test('plan initial status is not_started', () => {
  assert(PLAN.status === 'not_started', 'plan should start as not_started');
  assert(PLAN.current_step === 0, 'current_step should be 0');
});

console.log('\nserver.js validation endpoints');

test('GET /api/validation-plan endpoint defined', () => {
  assert(SERVER.includes("app.get('/api/validation-plan'"), 'GET /api/validation-plan not found');
});

test('POST /api/validation-plan/step/:id endpoint defined', () => {
  assert(SERVER.includes("app.post('/api/validation-plan/step/:id'"), 'POST step endpoint not found');
});

test('POST /api/validation-plan/report endpoint defined', () => {
  assert(SERVER.includes("app.post('/api/validation-plan/report'"), 'POST report endpoint not found');
});

test('step endpoint validates status values', () => {
  assert(SERVER.includes("'passed', 'failed', 'skipped'") || SERVER.includes("passed.*failed.*skipped"), 'status validation not found');
});

test('step endpoint advances current_step to next pending', () => {
  assert(SERVER.includes('nextPending') || SERVER.includes('next_pending') || SERVER.includes('current_step'), 'step advancement logic not found');
});

test('report endpoint writes to docs/session15-validation-report.md', () => {
  assert(SERVER.includes('session15-validation-report.md'), 'report path not found in server');
});

test('VALIDATION_PLAN_PATH defined near top of endpoint block', () => {
  assert(SERVER.includes('VALIDATION_PLAN_PATH'), 'VALIDATION_PLAN_PATH constant not defined');
  assert(SERVER.includes('validation-plan.json'), 'validation-plan.json path not found');
});

console.log('\nstudio-orb.js validation mode');

test('checkValidationPlan function defined', () => {
  assert(ORB.includes('function checkValidationPlan'), 'checkValidationPlan not found');
});

test('showValidationWelcome renders with step count', () => {
  assert(ORB.includes('function showValidationWelcome'), 'showValidationWelcome not found');
  assert(ORB.includes("plan.steps.length"), 'should use plan.steps.length');
});

test('showStepPrompt has all four actions (Show Me, Passed, Failed, Skip)', () => {
  assert(ORB.includes('function showStepPrompt'), 'showStepPrompt not found');
  assert(ORB.includes('Show Me') || ORB.includes('showMe'), 'Show Me action not found');
  assert(ORB.includes('Passed'), 'Passed action not found');
  assert(ORB.includes('Failed'), 'Failed action not found');
  assert(ORB.includes('Skip'), 'Skip action not found');
});

test('triggerShowMe handles missing element gracefully', () => {
  assert(ORB.includes('function triggerShowMe'), 'triggerShowMe not found');
  assert(ORB.includes('element_not_found') || ORB.includes("Can't find"), 'missing element fallback not found');
});

test('markValidationStep POSTs to /api/validation-plan/step/', () => {
  assert(ORB.includes('function markValidationStep'), 'markValidationStep not found');
  assert(ORB.includes('/api/validation-plan/step/'), 'API call not found in markValidationStep');
});

test('showValidationComplete triggers report generation', () => {
  assert(ORB.includes('function showValidationComplete'), 'showValidationComplete not found');
  assert(ORB.includes('/api/validation-plan/report'), 'report endpoint call not found');
});

test('validation exposed on PipOrb.validation API', () => {
  assert(ORB.includes('validation:'), 'validation not in PipOrb public API');
  assert(ORB.includes('checkValidationPlan'), 'checkValidationPlan not exposed');
});

console.log('\nindex.html wiring');

test('pip:session-started event dispatched from ws.onopen', () => {
  assert(HTML.includes("'pip:session-started'"), 'pip:session-started event not dispatched');
  const onopenIdx = HTML.indexOf('ws.onopen');
  const eventIdx  = HTML.indexOf("'pip:session-started'");
  const oncloseIdx = HTML.indexOf('ws.onclose');
  assert(eventIdx > onopenIdx, 'event must come after ws.onopen');
  assert(eventIdx < oncloseIdx || oncloseIdx === -1, 'event must be inside onopen block');
});

test('studio-orb.js loaded after studio-shell.js', () => {
  const shellIdx = HTML.indexOf('studio-shell.js');
  const orbIdx   = HTML.indexOf('studio-orb.js');
  assert(orbIdx > shellIdx, 'studio-orb.js must load after studio-shell.js');
});

console.log('\n' + '\u2500'.repeat(42));
console.log(passed + ' passed, ' + failed + ' failed');
console.log('\u2500'.repeat(42) + '\n');
if (failed > 0) process.exit(1);
