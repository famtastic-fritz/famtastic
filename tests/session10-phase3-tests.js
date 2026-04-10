#!/usr/bin/env node
/**
 * Session 10 Phase 3 Tests — Client Interview System MVP
 *
 * 1. test_interview_module_exports       — startInterview, recordAnswer, getCurrentQuestion, shouldInterview exported
 * 2. test_start_quick_returns_question   — startInterview('quick') returns first question object
 * 3. test_answer_advances_state          — recordAnswer() returns next question and advances index
 * 4. test_full_quick_interview           — complete all 5 quick questions → completed:true + client_brief
 * 5. test_skip_mode                      — startInterview('skip') returns completed immediately, empty brief
 * 6. test_should_interview_logic         — shouldInterview() returns correct booleans
 * 7. test_question_mismatch_throws       — wrong question_id throws an Error
 * 8. test_detailed_has_more_questions    — detailed mode has 10 questions
 * 9. test_endpoints_exist_in_server_js   — /api/interview/start and /api/interview/answer in server.js
 * 10. test_interview_status_endpoint     — /api/interview/status in server.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const LIB  = path.join(ROOT, 'site-studio/lib');

let passed = 0;
let failed = 0;

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.log(`  FAIL  ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

// ─── 1: Module exports ───────────────────────────────────────────────────────
console.log('\n── 1: client-interview.js exports ──');
const interviewPath = path.join(LIB, 'client-interview.js');
check('client-interview.js exists', fs.existsSync(interviewPath));

let interview;
if (fs.existsSync(interviewPath)) {
  interview = require(interviewPath);
  check('startInterview exported', typeof interview.startInterview === 'function');
  check('recordAnswer exported', typeof interview.recordAnswer === 'function');
  check('getCurrentQuestion exported', typeof interview.getCurrentQuestion === 'function');
  check('shouldInterview exported', typeof interview.shouldInterview === 'function');
  check('QUICK_QUESTIONS exported', Array.isArray(interview.QUICK_QUESTIONS));
  check('DETAILED_QUESTIONS exported', Array.isArray(interview.DETAILED_QUESTIONS));
}

// ─── 2: startInterview('quick') ──────────────────────────────────────────────
console.log('\n── 2: startInterview quick mode ──');
if (interview) {
  const { state, firstQuestion } = interview.startInterview('quick');
  check('state.mode === quick', state.mode === 'quick', `got ${state.mode}`);
  check('state.completed === false', state.completed === false);
  check('state.current_index === 0', state.current_index === 0);
  check('state.questions is array of 5', Array.isArray(state.questions) && state.questions.length === 5,
    `length: ${state.questions?.length}`);
  check('firstQuestion has question_id', !!firstQuestion?.question_id);
  check('firstQuestion.current === 1', firstQuestion?.current === 1);
  check('firstQuestion.total === 5', firstQuestion?.total === 5);
  check('firstQuestion has text', typeof firstQuestion?.text === 'string' && firstQuestion.text.length > 10);
}

// ─── 3: recordAnswer advances state ──────────────────────────────────────────
console.log('\n── 3: recordAnswer advances index ──');
if (interview) {
  const { state: s0 } = interview.startInterview('quick');
  const firstId = s0.questions[0];
  const result = interview.recordAnswer(s0, firstId, 'We build mobile apps for small businesses');
  check('result.completed === false', result.completed === false);
  check('result.state.current_index === 1', result.state.current_index === 1,
    `got ${result.state.current_index}`);
  check('answer stored in state.answers', result.state.answers[firstId] === 'We build mobile apps for small businesses');
  check('nextQuestion returned', !!result.nextQuestion?.question_id);
  check('nextQuestion.current === 2', result.nextQuestion?.current === 2, `got ${result.nextQuestion?.current}`);
}

// ─── 4: Full quick interview completion ──────────────────────────────────────
console.log('\n── 4: Full quick interview (all 5 questions) ──');
if (interview) {
  let { state } = interview.startInterview('quick');
  const answers = [
    'Mobile app agency for South Florida restaurants',
    'Restaurant owners aged 35-55 who want to modernize',
    'We specialize exclusively in restaurant tech',
    'Schedule a free consultation',
    'Bold, modern, dark backgrounds with gold accents',
  ];

  let finalResult;
  for (let i = 0; i < 5; i++) {
    const qId = state.questions[i];
    const result = interview.recordAnswer(state, qId, answers[i]);
    state = result.state;
    if (i === 4) finalResult = result;
  }

  check('completed === true after 5 answers', finalResult?.completed === true);
  check('client_brief returned', finalResult?.client_brief !== null && typeof finalResult?.client_brief === 'object');
  check('client_brief.business_description set', !!finalResult?.client_brief?.business_description);
  check('client_brief.primary_cta set', !!finalResult?.client_brief?.primary_cta);
  check('state.completed === true', state.completed === true);
  check('state.completed_at set', !!state.completed_at);
}

// ─── 5: Skip mode ────────────────────────────────────────────────────────────
console.log('\n── 5: startInterview skip mode ──');
if (interview) {
  const { state, firstQuestion } = interview.startInterview('skip');
  check('skip state.completed === true', state.completed === true);
  check('skip firstQuestion === null', firstQuestion === null);
  check('skip state.mode === skip', state.mode === 'skip');
}

// ─── 6: shouldInterview logic ────────────────────────────────────────────────
console.log('\n── 6: shouldInterview() ──');
if (interview) {
  check('null spec → false', interview.shouldInterview(null) === false);
  check('interview_completed spec → false', interview.shouldInterview({ interview_completed: true }) === false);
  check('built state → false', interview.shouldInterview({ state: 'built' }) === false);
  check('deployed state → false', interview.shouldInterview({ state: 'deployed' }) === false);
  check('new site spec → true', interview.shouldInterview({ state: 'new' }) === true);
  check('fresh spec with no state → true', interview.shouldInterview({ site_name: 'test', created_at: '2026-01-01' }) === true);
}

// ─── 7: Question mismatch throws ────────────────────────────────────────────
console.log('\n── 7: recordAnswer question mismatch ──');
if (interview) {
  const { state } = interview.startInterview('quick');
  let threw = false;
  let errorMsg = '';
  try {
    interview.recordAnswer(state, 'q_WRONG_ID', 'some answer');
  } catch (e) {
    threw = true;
    errorMsg = e.message;
  }
  check('throws on wrong question_id', threw);
  check('error message mentions mismatch', errorMsg.toLowerCase().includes('mismatch') || errorMsg.toLowerCase().includes('expected'),
    `got: ${errorMsg}`);
}

// ─── 8: Detailed mode has 10 questions ───────────────────────────────────────
console.log('\n── 8: Detailed mode ──');
if (interview) {
  const { state, firstQuestion } = interview.startInterview('detailed');
  check('detailed mode has 10 questions', state.questions.length === 10, `got ${state.questions.length}`);
  check('firstQuestion.total === 10', firstQuestion?.total === 10, `got ${firstQuestion?.total}`);
  check('DETAILED_QUESTIONS has 10 entries', interview.DETAILED_QUESTIONS.length === 10,
    `got ${interview.DETAILED_QUESTIONS.length}`);
  check('QUICK_QUESTIONS has 5 entries', interview.QUICK_QUESTIONS.length === 5,
    `got ${interview.QUICK_QUESTIONS.length}`);
}

// ─── 9: Endpoints in server.js ────────────────────────────────────────────────
console.log('\n── 9: Interview endpoints in server.js ──');
{
  const serverText = fs.readFileSync(path.join(ROOT, 'site-studio/server.js'), 'utf8');
  check("POST /api/interview/start in server.js",
    serverText.includes("'/api/interview/start'"),
    'route not found');
  check("POST /api/interview/answer in server.js",
    serverText.includes("'/api/interview/answer'"),
    'route not found');
  check('server.js requires client-interview',
    serverText.includes('client-interview'),
    'require not found');
  check('server.js calls startInterview',
    serverText.includes('startInterview('),
    'startInterview call not found');
  check('server.js calls recordAnswer',
    serverText.includes('recordAnswer('),
    'recordAnswer call not found');
}

// ─── 10: Interview status endpoint ───────────────────────────────────────────
console.log('\n── 10: /api/interview/status endpoint ──');
{
  const serverText = fs.readFileSync(path.join(ROOT, 'site-studio/server.js'), 'utf8');
  check("GET /api/interview/status in server.js",
    serverText.includes("'/api/interview/status'"),
    'route not found');
  check('status returns interview_completed field',
    serverText.includes('interview_completed'),
    'field not referenced');
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
if (failed > 0) {
  console.log('\n⚠️  Some tests failed — see details above.');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed.');
}
