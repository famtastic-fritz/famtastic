'use strict';
/**
 * studio-actions.js — shared execution layer
 *
 * Imported by both mcp-server/server.js (external MCP surface) and
 * site-studio/lib/tool-handlers.js (in-process Studio surface).
 * All operations are file-system / SQLite only — no HTTP, no IPC.
 */

const jobQueue = require('./job-queue');
const db = require('./db');
const gapLogger = require('./gap-logger');

function createJob(opts) {
  return jobQueue.createJob(opts);
}

function approveJob(id) {
  return jobQueue.approveJob(id);
}

function parkJob(id) {
  return jobQueue.parkJob(id);
}

function getPendingJobs(siteTag) {
  return db.listJobs({ status: 'pending', site_tag: siteTag || undefined, limit: 50 });
}

function logGap(tag, message, category, details = {}) {
  return gapLogger.logGap(tag, message, category, details);
}

module.exports = { createJob, approveJob, parkJob, getPendingJobs, logGap };
