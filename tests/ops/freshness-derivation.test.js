/**
 * tests/ops/freshness-derivation.test.js
 *
 * Pinned table of (record_type, status, age_bucket) → freshness for every
 * row in docs/ops/state-contract.md. If this fails, the freshness derivation
 * library has drifted from the contract.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { deriveFreshness, THRESHOLDS } = require('../../site-studio/lib/ops-freshness');

const AGE_FRESH = 60;                                 // < 600
const AGE_IDLE = THRESHOLDS.idle + 60;                // < 7d
const AGE_STALE = THRESHOLDS.stale + 60;              // < 90d
const AGE_ARCHIVED = THRESHOLDS.archived + 60;

const TABLE = [
  // jobs
  ['job', 'running',  AGE_FRESH,    'live'],
  ['job', 'running',  AGE_ARCHIVED, 'live'],
  ['job', 'pending',  AGE_FRESH,    'live'],
  ['job', 'pending',  AGE_IDLE,     'idle'],
  ['job', 'pending',  AGE_STALE,    'stale'],
  ['job', 'approved', AGE_FRESH,    'live'],
  ['job', 'approved', AGE_IDLE,     'idle'],
  ['job', 'approved', AGE_STALE,    'stale'],
  ['job', 'blocked',  AGE_FRESH,    'live'],
  ['job', 'blocked',  AGE_IDLE,     'live'],
  ['job', 'blocked',  AGE_STALE,    'stale'],
  ['job', 'done',     AGE_FRESH,    'idle'],
  ['job', 'done',     AGE_IDLE,     'idle'],
  ['job', 'done',     AGE_STALE,    'idle'],
  ['job', 'done',     AGE_ARCHIVED, 'archived'],
  ['job', 'failed',   AGE_FRESH,    'live'],
  ['job', 'failed',   AGE_IDLE,     'live'],
  ['job', 'failed',   AGE_STALE,    'stale'],
  ['job', 'parked',   AGE_FRESH,    'parked'],
  ['job', 'parked',   AGE_ARCHIVED, 'parked'],
  // tasks
  ['task', 'in_progress',     AGE_ARCHIVED, 'live'],
  ['task', 'waiting_on_me',   AGE_ARCHIVED, 'live'],
  ['task', 'waiting_on_agent',AGE_ARCHIVED, 'live'],
  ['task', 'ready',           AGE_FRESH,    'live'],
  ['task', 'ready',           AGE_STALE,    'stale'],
  ['task', 'backlog',         AGE_FRESH,    'live'],
  ['task', 'backlog',         AGE_STALE,    'stale'],
  ['task', 'blocked',         AGE_FRESH,    'live'],
  ['task', 'blocked',         AGE_STALE,    'stale'],
  ['task', 'completed',       AGE_FRESH,    'idle'],
  ['task', 'completed',       AGE_ARCHIVED, 'archived'],
  // runs
  ['run', 'active', AGE_ARCHIVED, 'live'],
  ['run', 'done',   AGE_FRESH,    'idle'],
  ['run', 'done',   AGE_ARCHIVED, 'archived'],
  ['run', 'failed', AGE_ARCHIVED, 'archived'],
  // proofs
  ['proof', 'recorded',              AGE_FRESH,    'live'],
  ['proof', 'passed',                AGE_FRESH,    'live'],
  ['proof', 'passed_with_blockers',  AGE_FRESH,    'live'],
  ['proof', 'recorded',              AGE_ARCHIVED, 'archived'],
  ['proof', 'blocked',               AGE_FRESH,    'stale'],
  // plans
  ['plan', 'active',    AGE_ARCHIVED, 'live'],
  ['plan', 'proposed',  AGE_FRESH,    'live'],
  ['plan', 'proposed',  AGE_STALE,    'stale'],
  ['plan', 'paused',    AGE_FRESH,    'parked'],
  ['plan', 'completed', AGE_FRESH,    'archived'],
  ['plan', 'absorbed',  AGE_FRESH,    'archived'],
  // legacy queue — every status, every age
  ['legacy_queue', 'pending',   AGE_FRESH,    'parked'],
  ['legacy_queue', 'queued',    AGE_STALE,    'parked'],
  ['legacy_queue', 'completed', AGE_ARCHIVED, 'parked'],
];

test('freshness derivation matches the pinned table', () => {
  for (const [recordType, status, age, expected] of TABLE) {
    const actual = deriveFreshness(recordType, status, age);
    assert.equal(
      actual,
      expected,
      `(${recordType}, ${status}, age=${age}s) expected=${expected} got=${actual}`,
    );
  }
});

test('unknown combinations default to stale, never live or idle', () => {
  for (const recordType of ['job', 'task', 'run', 'proof', 'plan', 'review', 'gap']) {
    const result = deriveFreshness(recordType, 'unknown_status_xyz', AGE_FRESH);
    assert.equal(result, 'stale', `${recordType}/unknown should be stale`);
  }
});

test('legacy_queue is parked under every input', () => {
  for (const status of ['pending', 'queued', 'completed', 'failed', 'unknown']) {
    for (const age of [0, AGE_FRESH, AGE_STALE, AGE_ARCHIVED, Number.MAX_SAFE_INTEGER]) {
      assert.equal(deriveFreshness('legacy_queue', status, age), 'parked');
    }
  }
});
