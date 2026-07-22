'use strict';
/**
 * runtime-vnext/lib/id.js — deterministic ID generation for vNext runtime.
 *
 * ID format: <prefix>_<timestamp-ms>_<4-char-hex>
 *
 * Matches existing lib/run-id.js convention for sortability and uniqueness.
 */

const { randomBytes } = require('crypto');

const PREFIX = {
  project: 'project',
  run: 'run',
  stageAttempt: 'stage',
  artifact: 'artifact',
};

function generateId(prefix) {
  const ts = Date.now();
  const rand = randomBytes(2).toString('hex');
  return `${prefix}_${ts}_${rand}`;
}

function generateProjectId() {
  return generateId(PREFIX.project);
}

function generateRunId() {
  return generateId(PREFIX.run);
}

function generateStageAttemptId() {
  return generateId(PREFIX.stageAttempt);
}

function generateArtifactId() {
  return generateId(PREFIX.artifact);
}

module.exports = {
  generateId,
  generateProjectId,
  generateRunId,
  generateStageAttemptId,
  generateArtifactId,
};
