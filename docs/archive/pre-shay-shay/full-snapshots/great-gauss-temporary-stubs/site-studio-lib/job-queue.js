'use strict';
const { randomUUID } = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('./db');

const JSONL_PATH = path.join(require('os').homedir(), 'famtastic', '.worker-queue.jsonl');

const VALID_STATUSES = new Set(['pending','approved','running','done','blocked','failed','parked']);

const STATUS_MAP = { pending: 'pending', completed: 'done', cancelled: 'parked', failed: 'failed' };

function _assertStatus(status) {
  if (!VALID_STATUSES.has(status)) throw new Error(`Invalid job status: ${status}`);
}

function createJob({ type, site_tag, payload, dependencies = [], cost_estimate = 0, status } = {}) {
  if (!type) throw new Error('job type is required');
  const hasDeps = dependencies.length > 0;
  const resolvedStatus = status || (hasDeps ? 'blocked' : 'pending');
  _assertStatus(resolvedStatus);
  const id = randomUUID();
  db.createJob({ id, type, status: resolvedStatus, site_tag, payload, dependencies, cost_estimate });
  return db.getJob(id);
}

function approveJob(id) {
  const job = db.getJob(id);
  if (!job) throw new Error(`Job not found: ${id}`);
  if (job.status !== 'pending') throw new Error(`Cannot approve job in status '${job.status}' — must be pending`);
  db.updateJobStatus(id, 'approved');
  return db.getJob(id);
}

function parkJob(id) {
  const job = db.getJob(id);
  if (!job) throw new Error(`Job not found: ${id}`);
  if (job.status !== 'pending' && job.status !== 'blocked') {
    throw new Error(`Cannot park job in status '${job.status}' — must be pending or blocked`);
  }
  db.updateJobStatus(id, 'parked');
  return db.getJob(id);
}

function completeJob(id, { result, cost_actual } = {}) {
  const job = db.getJob(id);
  if (!job) throw new Error(`Job not found: ${id}`);
  db.updateJobStatus(id, 'done', { result, cost_actual });
  _unblockDependents(id);
  return db.getJob(id);
}

function failJob(id, { result } = {}) {
  const job = db.getJob(id);
  if (!job) throw new Error(`Job not found: ${id}`);
  db.updateJobStatus(id, 'failed', { result });
  return db.getJob(id);
}

function _unblockDependents(completedJobId) {
  const blocked = db.listJobs({ status: 'blocked', limit: 200 });
  for (const job of blocked) {
    if (!job.dependencies.includes(completedJobId)) continue;
    const allDone = job.dependencies.every(depId => {
      const dep = db.getJob(depId);
      return dep && dep.status === 'done';
    });
    if (allDone) db.updateJobStatus(job.id, 'pending');
  }
}

function migrateJsonlQueue() {
  if (!fs.existsSync(JSONL_PATH)) return { migrated: 0, skipped: 0 };
  const lines = fs.readFileSync(JSONL_PATH, 'utf8').split('\n').filter(Boolean);
  let migrated = 0;
  let skipped = 0;
  for (const line of lines) {
    let entry;
    try { entry = JSON.parse(line); } catch { skipped++; continue; }
    const status = STATUS_MAP[entry.status] || 'pending';
    const id = entry.id || randomUUID();
    try {
      db.createJob({
        id,
        type:         entry.worker || entry.task || 'legacy',
        status,
        site_tag:     entry.context?.site_tag || null,
        payload:      { task: entry.task, context: entry.context, original: entry },
        dependencies: [],
        cost_estimate: 0,
      });
      migrated++;
    } catch (e) {
      if (e.message && e.message.includes('UNIQUE constraint')) { skipped++; }
      else { skipped++; }
    }
  }
  return { migrated, skipped };
}

function listPending() {
  return db.listJobs({ status: 'pending' });
}

module.exports = { createJob, approveJob, parkJob, completeJob, failJob, migrateJsonlQueue, listPending };
