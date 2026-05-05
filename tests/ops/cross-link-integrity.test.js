/**
 * tests/ops/cross-link-integrity.test.js
 *
 * Asserts buildCrossLink writes both sides of a promote-to-task link or
 * throws — never produces a half-linked state.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildCrossLink } = require('../../site-studio/lib/ops-api');

test('promote-to-task writes both sides of cross-link', () => {
  const job = { id: 'job-123', status: 'pending' };
  const task = { task_id: 'task-456', status: 'ready' };
  const { job: linkedJob, task: linkedTask } = buildCrossLink({ jobRecord: job, taskRecord: task });
  assert.equal(linkedJob.promoted_to_task_id, 'task-456');
  assert.equal(linkedTask.origin_job_id, 'job-123');
  assert.equal(linkedTask.promoted_from, 'job');
});

test('throws if either record is missing', () => {
  assert.throws(() => buildCrossLink({ jobRecord: null, taskRecord: { task_id: 't' } }));
  assert.throws(() => buildCrossLink({ jobRecord: { id: 'j' }, taskRecord: null }));
});

test('throws if job has no id', () => {
  assert.throws(() => buildCrossLink({ jobRecord: { status: 'pending' }, taskRecord: { task_id: 't' } }));
});

test('throws if task has no task_id', () => {
  assert.throws(() => buildCrossLink({ jobRecord: { id: 'j' }, taskRecord: { status: 'ready' } }));
});

test('original records not mutated', () => {
  const job = Object.freeze({ id: 'j', status: 'pending' });
  const task = Object.freeze({ task_id: 't', status: 'ready' });
  const { job: lj, task: lt } = buildCrossLink({ jobRecord: job, taskRecord: task });
  assert.notEqual(lj, job);
  assert.notEqual(lt, task);
  assert.equal(job.promoted_to_task_id, undefined);
  assert.equal(task.origin_job_id, undefined);
});
