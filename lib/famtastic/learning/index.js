'use strict';

// lib/famtastic/learning/index.js
// SHAY V2 (2026-05-02 iter 3): Shared learning service (scaffold).
//
// The compounding flywheel:
//   1. Every interaction logs episodic events
//   2. Outcomes are scored: shipped=1.5, accepted=1.0, edited=0.7, dismissed=0.3
//   3. After 3 high-scoring outcomes for the same pattern → promote to semantic
//   4. Semantic patterns influence future routing and prompt construction
//
// This module is the public-facing API for that loop. Wraps the existing
// site-studio/lib/suggestion-logger.js + .wolf/ files for now.
//
// Status: SCAFFOLD. Iteration 4+ implements the full promotion engine here.

const fs = require('fs');
const path = require('path');

const FAM_ROOT = path.resolve(process.env.HOME || '/root', 'famtastic');
const PROMOTIONS_LOG = path.join(FAM_ROOT, '.wolf/memory/promotions.jsonl');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

let _underlying = null;
function loadUnderlying() {
  if (_underlying) return _underlying;
  try {
    _underlying = require(path.join(FAM_ROOT, 'site-studio/lib/suggestion-logger.js'));
  } catch (err) {
    _underlying = null;
  }
  return _underlying;
}

function logSuggestion(entry) {
  const u = loadUnderlying();
  if (!u || typeof u.logSuggestion !== 'function') {
    return { ok: false, error: 'suggestion_logger_not_loaded' };
  }
  return { ok: true, result: u.logSuggestion(entry) };
}

function scoreOutcome(suggestion_id, outcome) {
  const u = loadUnderlying();
  if (!u || typeof u.scoreOutcome !== 'function') {
    return { ok: false, error: 'suggestion_logger_score_not_implemented' };
  }
  return { ok: true, result: u.scoreOutcome(suggestion_id, outcome) };
}

function recordPromotion(opts) {
  ensureDir(path.dirname(PROMOTIONS_LOG));
  const entry = {
    promoted_at: new Date().toISOString(),
    pattern_signature: opts.pattern_signature,
    confirmations: opts.confirmations,
    promoted_to: opts.promoted_to || 'semantic',
    source_capture: opts.source_capture || null
  };
  fs.appendFileSync(PROMOTIONS_LOG, JSON.stringify(entry) + '\n', 'utf8');
  return { ok: true, entry };
}

module.exports = { logSuggestion, scoreOutcome, recordPromotion, PROMOTIONS_LOG };
