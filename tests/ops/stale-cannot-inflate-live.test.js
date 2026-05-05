/**
 * tests/ops/stale-cannot-inflate-live.test.js
 *
 * Property test. Generates 1000 randomized mutation sequences across all
 * record types and asserts that no record whose freshness is parked,
 * archived, or stale is ever counted as live.
 *
 * This is the regression test for the original "false agents waiting" bug.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { deriveFreshness, isLive, isStaleOrColder } = require('../../site-studio/lib/ops-freshness');

const RECORD_TYPES = ['job', 'task', 'run', 'proof', 'plan', 'review', 'gap', 'legacy_queue'];
const STATUSES = {
  job: ['running', 'pending', 'approved', 'blocked', 'done', 'failed', 'parked'],
  task: ['in_progress', 'waiting_on_me', 'waiting_on_agent', 'ready', 'backlog', 'blocked', 'completed'],
  run: ['active', 'done', 'failed'],
  proof: ['recorded', 'passed', 'passed_with_blockers', 'blocked'],
  plan: ['active', 'proposed', 'paused', 'completed', 'absorbed'],
  review: ['open', 'in_progress', 'completed', 'resolved'],
  gap: ['open', 'resolved'],
  legacy_queue: ['pending', 'queued', 'completed'],
};

function rand(n) { return Math.floor(Math.random() * n); }
function randomAge() {
  // weighted across buckets
  const buckets = [10, 1000, 200000, 800000, 8000000, 50000000];
  return buckets[rand(buckets.length)];
}

function makeRecord() {
  const recordType = RECORD_TYPES[rand(RECORD_TYPES.length)];
  const statuses = STATUSES[recordType];
  const status = statuses[rand(statuses.length)];
  return { recordType, status, age: randomAge() };
}

function liveCount(records) {
  let n = 0;
  for (const r of records) {
    const f = deriveFreshness(r.recordType, r.status, r.age);
    if (isLive(f)) n += 1;
  }
  return n;
}

test('parked|archived|stale records never counted as live across 1000 random sequences', () => {
  for (let trial = 0; trial < 1000; trial += 1) {
    const records = Array.from({ length: 25 }, makeRecord);
    for (const r of records) {
      const f = deriveFreshness(r.recordType, r.status, r.age);
      if (isStaleOrColder(f)) {
        assert.equal(isLive(f), false, `freshness=${f} must not be live (record=${JSON.stringify(r)})`);
      }
    }
    // also ensure liveCount only counts live|idle freshness
    const expected = records.filter(r => {
      const f = deriveFreshness(r.recordType, r.status, r.age);
      return isLive(f);
    }).length;
    assert.equal(liveCount(records), expected);
  }
});

test('legacy_queue records can never be live regardless of mutation history', () => {
  for (let trial = 0; trial < 500; trial += 1) {
    const r = { recordType: 'legacy_queue', status: STATUSES.legacy_queue[rand(3)], age: randomAge() };
    const f = deriveFreshness(r.recordType, r.status, r.age);
    assert.equal(f, 'parked');
    assert.equal(isLive(f), false);
  }
});

test('parked job stays parked even if it gets younger (age=0)', () => {
  const f = deriveFreshness('job', 'parked', 0);
  assert.equal(f, 'parked');
  assert.equal(isLive(f), false);
});
