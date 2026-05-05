/**
 * tests/ops/fixtures/synthetic-ledgers.js
 *
 * Synthetic ledger fixtures with a deliberate mix of live, idle, stale,
 * parked, and archived records of every type. Used by every Ops test.
 */
'use strict';

const NOW = Date.parse('2026-05-05T12:00:00.000Z');
const SEC = 1000;
function ago(seconds) { return new Date(NOW - seconds * SEC).toISOString(); }

const jobs = [
  { id: 'j-run', status: 'running', updated_at: ago(30) },
  { id: 'j-pending-fresh', status: 'pending', updated_at: ago(60) },
  { id: 'j-pending-idle', status: 'pending', updated_at: ago(900) },
  { id: 'j-pending-stale', status: 'pending', updated_at: ago(800000) },
  { id: 'j-approved-fresh', status: 'approved', updated_at: ago(60) },
  { id: 'j-blocked-live', status: 'blocked', updated_at: ago(120) },
  { id: 'j-blocked-stale', status: 'blocked', updated_at: ago(800000) },
  { id: 'j-done-recent', status: 'done', updated_at: ago(120) },
  { id: 'j-done-archived', status: 'done', updated_at: ago(8000000) },
  { id: 'j-failed-live', status: 'failed', updated_at: ago(120) },
  { id: 'j-failed-stale', status: 'failed', updated_at: ago(800000) },
  { id: 'j-parked', status: 'parked', updated_at: ago(120) },
];

const tasks = [
  { task_id: 't-prog', status: 'in_progress', updated_at: ago(60) },
  { task_id: 't-ready', status: 'ready', updated_at: ago(60) },
  { task_id: 't-ready-stale', status: 'ready', updated_at: ago(800000) },
  { task_id: 't-wait-me', status: 'waiting_on_me', updated_at: ago(60) },
  { task_id: 't-wait-agent', status: 'waiting_on_agent', updated_at: ago(60) },
  { task_id: 't-blocked-stale', status: 'blocked', updated_at: ago(800000) },
  { task_id: 't-completed-recent', status: 'completed', updated_at: ago(120) },
  { task_id: 't-completed-archived', status: 'completed', updated_at: ago(8000000) },
];

const runs = [
  { run_id: 'r-active', status: 'active', updated_at: ago(60) },
  { run_id: 'r-done', status: 'done', updated_at: ago(120) },
  { run_id: 'r-archived', status: 'done', updated_at: ago(8000000) },
];

const proofs = [
  { proof_id: 'p-recorded', status: 'recorded', recorded_at: ago(120) },
  { proof_id: 'p-passed', status: 'passed', recorded_at: ago(120) },
  { proof_id: 'p-blocked', status: 'blocked', recorded_at: ago(120) },
  { proof_id: 'p-archived', status: 'recorded', recorded_at: ago(8000000) },
];

const plans = [
  { id: 'pl-active', status: 'active', updated_at: ago(60) },
  { id: 'pl-proposed', status: 'proposed', updated_at: ago(60) },
  { id: 'pl-paused', status: 'paused', updated_at: ago(60) },
  { id: 'pl-completed', status: 'completed', updated_at: ago(60) },
];

const reviews = [
  { id: 'rv-open', status: 'open', updated_at: ago(60) },
  { id: 'rv-completed', status: 'completed', updated_at: ago(120) },
];

const gaps = [
  { id: 'g-open', status: 'open', updated_at: ago(60) },
  { id: 'g-resolved', status: 'resolved', updated_at: ago(120) },
];

const legacyQueue = [
  { id: 'wq-1', status: 'pending', queued_at: ago(60) },
  { id: 'wq-2', status: 'queued', queued_at: ago(800000) },
  { id: 'wq-3', status: 'completed', queued_at: ago(60) },
];

module.exports = {
  NOW,
  jobs,
  tasks,
  runs,
  proofs,
  plans,
  reviews,
  gaps,
  legacyQueue,
};
