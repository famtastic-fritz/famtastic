'use strict';
/**
 * run-id.js — Build run and trace ID generation for FAMtastic Studio.
 *
 * Every build gets a run_id (top-level identifier for the whole request).
 * Every decision step within that build gets a trace_id (parent_trace_id = run_id
 * for top-level steps, or the parent step's trace_id for nested decisions).
 *
 * Format:
 *   run_id   → "run_<timestamp>_<4-char hex>"         e.g. "run_1746300000000_a3f2"
 *   trace_id → "run_<timestamp>_<4-char hex>.step_<N>" e.g. "run_...a3f2.step_03"
 */

const { randomBytes } = require('crypto');

/**
 * Generate a new run ID.
 * @returns {string}
 */
function generateRunId() {
  const ts   = Date.now();
  const rand = randomBytes(2).toString('hex');
  return `run_${ts}_${rand}`;
}

/**
 * Generate a trace step ID scoped to a run.
 * @param {string} runId   — the run_id this step belongs to
 * @param {number} stepNum — monotonically increasing step counter within the run
 * @returns {string}
 */
function generateTraceId(runId, stepNum) {
  const n = String(stepNum).padStart(2, '0');
  return `${runId}.step_${n}`;
}

/**
 * Create a step counter factory bound to a specific run.
 * Returns an object with { runId, nextTraceId() }.
 *
 * Usage:
 *   const run = createRunContext();
 *   const traceId = run.nextTraceId();  // "run_..._abcd.step_01"
 *   const traceId2 = run.nextTraceId(); // "run_..._abcd.step_02"
 */
function createRunContext(runId) {
  const id = runId || generateRunId();
  let   counter = 0;
  return {
    runId: id,
    nextTraceId() {
      counter += 1;
      return generateTraceId(id, counter);
    },
    currentStep() {
      return counter;
    },
  };
}

module.exports = { generateRunId, generateTraceId, createRunContext };
