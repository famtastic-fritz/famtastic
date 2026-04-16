'use strict';

/**
 * Session 13 Phase 2 — Revenue-first brief interview
 * Tests revenue model question injection, REVENUE_MODEL_OPTIONS,
 * getRevenueBuildHints, and buildClientBrief revenue fields.
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

const interview = require(path.join(__dirname, '../site-studio/lib/client-interview'));

// ─────────────────────────────────────────────
// REVENUE_MODEL_OPTIONS
// ─────────────────────────────────────────────
console.log('\nREVENUE_MODEL_OPTIONS');

test('REVENUE_MODEL_OPTIONS is exported', () => {
  assert(Array.isArray(interview.REVENUE_MODEL_OPTIONS), 'REVENUE_MODEL_OPTIONS must be an array');
  assert(interview.REVENUE_MODEL_OPTIONS.length >= 5, 'should have at least 5 options');
});

test('all options have value and label', () => {
  for (const opt of interview.REVENUE_MODEL_OPTIONS) {
    assert(opt.value, `option missing value: ${JSON.stringify(opt)}`);
    assert(opt.label, `option missing label: ${JSON.stringify(opt)}`);
  }
});

test('includes rank_and_rent and not_sure options', () => {
  const values = interview.REVENUE_MODEL_OPTIONS.map(o => o.value);
  assert(values.includes('rank_and_rent'), 'rank_and_rent option missing');
  assert(values.includes('not_sure'), 'not_sure option missing');
  assert(values.includes('lead_gen'), 'lead_gen option missing');
});

// ─────────────────────────────────────────────
// Interview question order
// ─────────────────────────────────────────────
console.log('\nInterview question order');

test('revenue question appears early in interview (before customer question)', () => {
  const result = interview.startInterview('quick');
  // First question is business description
  assert(result.firstQuestion.question_id === 'q_business', 'first question should be q_business');
});

test('revenue question (q_revenue) exists in quick mode', () => {
  const result = interview.startInterview('quick');
  assert(result.state.questions.includes('q_revenue'), 'q_revenue not in quick mode questions');
});

test('revenue question comes before customer question', () => {
  const result = interview.startInterview('quick');
  const revIdx = result.state.questions.indexOf('q_revenue');
  const custIdx = result.state.questions.indexOf('q_customer');
  assert(revIdx !== -1, 'q_revenue not found');
  assert(custIdx !== -1, 'q_customer not found');
  assert(revIdx < custIdx, 'revenue question must come before customer question');
});

test('q_revenue has suggestion_chips', () => {
  // Simulate advancing to q_revenue
  let state = interview.startInterview('quick').state;
  // Record answer to q_business to advance to q_revenue
  const result = interview.recordAnswer(state, 'q_business', 'Test business description');
  assert(!result.completed, 'should not be completed after first answer');
  assert(result.nextQuestion.question_id === 'q_revenue', `Expected q_revenue next, got ${result.nextQuestion.question_id}`);
  assert(result.nextQuestion.suggestion_chips, 'q_revenue should have suggestion_chips');
  assert(result.nextQuestion.suggestion_chips.length >= 5, 'should have at least 5 chips');
});

// ─────────────────────────────────────────────
// buildClientBrief — revenue fields
// ─────────────────────────────────────────────
console.log('\nbuildClientBrief revenue fields');

function runFullInterview(mode = 'quick', revenueAnswer = 'rank_and_rent') {
  let result = interview.startInterview(mode);
  let state = result.state;
  const answers = {
    q_business: 'We are a plumbing company serving Phoenix AZ',
    q_revenue: revenueAnswer, // can be '' to simulate skipped
    q_customer: 'Homeowners in Phoenix with plumbing emergencies',
    q_differentiator: '24/7 availability and same-day service',
    q_cta: 'Call us now for a free estimate',
    q_style: 'Professional and trustworthy, navy and white',
    // detailed extras
    q_services: 'Emergency plumbing, pipe repair, water heater installation',
    q_proof: '500+ 5-star Google reviews',
    q_geography: 'Phoenix metro area',
    q_urgency: '10% off first service this month',
    q_contact: 'Phone and contact form',
  };
  while (!state.completed) {
    const q = state.questions[state.current_index];
    // Use explicit undefined check so empty string '' is preserved
    const answer = (q in answers) ? answers[q] : 'test answer';
    const res = interview.recordAnswer(state, q, answer);
    state = res.state;
    if (res.completed) return res.client_brief;
  }
  return null;
}

test('client_brief contains revenue_model field', () => {
  const brief = runFullInterview('quick', 'rank_and_rent');
  assert(brief, 'brief should not be null');
  assert(brief.revenue_model, 'revenue_model should be in brief');
  assert(brief.revenue_model === 'rank_and_rent', `Expected rank_and_rent, got ${brief.revenue_model}`);
});

test('revenue_ready is true when model is answered', () => {
  const brief = runFullInterview('quick', 'rank_and_rent');
  assert(brief.revenue_ready === true, 'revenue_ready should be true');
});

test('defaults to stub when revenue not answered', () => {
  // Simulate interview where q_revenue gets empty answer
  const brief = runFullInterview('quick', '');
  assert(brief.revenue_model === 'stub', `Expected stub, got ${brief.revenue_model}`);
  assert(brief.revenue_ready === true, 'revenue_ready should still be true for stub');
});

test('not_sure answer normalizes to stub', () => {
  const brief = runFullInterview('quick', 'not sure yet');
  assert(brief.revenue_model === 'stub', `Expected stub for "not sure yet", got ${brief.revenue_model}`);
});

// ─────────────────────────────────────────────
// getRevenueBuildHints
// ─────────────────────────────────────────────
console.log('\ngetRevenueBuildHints');

test('rank_and_rent includes lead form and call tracking hints', () => {
  const hints = interview.getRevenueBuildHints('rank_and_rent');
  assert(hints.components, 'components should exist');
  assert(hints.prompt_additions, 'prompt_additions should exist');
  assert(hints.schema_hints, 'schema_hints should exist');
  assert(hints.components.includes('lead-capture-form'), 'should include lead-capture-form');
  assert(hints.components.includes('call-tracking-slot'), 'should include call-tracking-slot');
  assert(hints.prompt_additions.some(h => h.toLowerCase().includes('lead')), 'should mention lead form');
  assert(hints.prompt_additions.some(h => h.toLowerCase().includes('phone') || h.toLowerCase().includes('call')), 'should mention phone/call tracking');
  assert(hints.schema_hints.includes('LocalBusiness'), 'should include LocalBusiness schema');
});

test('reservations includes booking widget hint', () => {
  const hints = interview.getRevenueBuildHints('reservations');
  assert(hints.components.includes('reservation-widget-slot'), 'should include reservation-widget-slot');
  assert(hints.prompt_additions.some(h => h.toLowerCase().includes('reservation') || h.toLowerCase().includes('booking')), 'should mention booking');
});

test('stub model returns contact form component', () => {
  const hints = interview.getRevenueBuildHints('stub');
  assert(hints.components.includes('contact-form'), 'stub model should include basic contact-form');
});

test('all models return required shape', () => {
  const models = ['rank_and_rent', 'lead_gen', 'reservations', 'ecommerce', 'affiliate', 'stub', 'not_sure'];
  for (const model of models) {
    const hints = interview.getRevenueBuildHints(model);
    assert(Array.isArray(hints.components), `${model}: components should be array`);
    assert(Array.isArray(hints.prompt_additions), `${model}: prompt_additions should be array`);
    assert(Array.isArray(hints.schema_hints), `${model}: schema_hints should be array`);
  }
});

// ─────────────────────────────────────────────
// server.js integration
// ─────────────────────────────────────────────
console.log('\nserver.js integration');

const serverSrc = fs.readFileSync(path.join(__dirname, '../site-studio/server.js'), 'utf8');

test('getRevenueBuildHints is called in buildPromptContext', () => {
  assert(serverSrc.includes('getRevenueBuildHints'), 'getRevenueBuildHints not called in server.js');
});

test('REVENUE ARCHITECTURE block is injected into briefContext', () => {
  assert(serverSrc.includes('REVENUE ARCHITECTURE'), 'REVENUE ARCHITECTURE prompt block not found in server.js');
});

test('deal-memo subcommand exists in fam-hub', () => {
  const famHubSrc = fs.readFileSync(path.join(__dirname, '../scripts/fam-hub'), 'utf8');
  assert(famHubSrc.includes('deal-memo'), 'deal-memo subcommand not found in fam-hub');
});

// ─────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────
console.log('\n──────────────────────────────────────────');
console.log(`${passed} passed, ${failed} failed`);
console.log('──────────────────────────────────────────\n');
if (failed > 0) process.exit(1);
