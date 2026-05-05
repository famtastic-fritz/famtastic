/**
 * site-studio/lib/ops-freshness.js
 *
 * Single implementation of the freshness derivation table from
 * docs/ops/state-contract.md. Consumed by:
 *   - scripts/ops/inventory.js
 *   - site-studio/lib/ops-api.js
 *   - tests/ops/freshness-derivation.test.js
 *
 * Inputs:  (recordType, status, ageSeconds)
 * Output:  freshness ∈ {live, idle, stale, parked, archived}
 *
 * Invariant: parked|archived|stale must NEVER appear in any "live" count.
 * Enforced by tests/ops/stale-cannot-inflate-live.test.js.
 */
'use strict';

const THRESHOLDS = {
  idle: 600,         // 10 minutes
  stale: 604800,     // 7 days
  archived: 7776000, // 90 days
};

const VALID_FRESHNESS = new Set(['live', 'idle', 'stale', 'parked', 'archived']);
const LIVE_FRESHNESS = new Set(['live', 'idle']); // anything else is NOT countable as "live"

function ageBucket(ageSeconds) {
  if (ageSeconds < THRESHOLDS.idle) return 'lt_idle';
  if (ageSeconds < THRESHOLDS.stale) return 'lt_stale';
  if (ageSeconds < THRESHOLDS.archived) return 'lt_archived';
  return 'gte_archived';
}

/**
 * Derive freshness for a (recordType, status, ageSeconds) tuple.
 * Unknown combinations default to 'stale' (conservative — never silently 'live').
 */
function deriveFreshness(recordType, status, ageSeconds) {
  const age = Number.isFinite(ageSeconds) ? Math.max(0, ageSeconds) : Number.MAX_SAFE_INTEGER;
  const bucket = ageBucket(age);

  switch (recordType) {
    case 'job': {
      switch (status) {
        case 'running': return 'live';
        case 'pending':
        case 'approved':
          if (bucket === 'lt_idle') return 'live';
          if (bucket === 'lt_stale') return 'idle';
          return 'stale';
        case 'blocked':
          if (bucket === 'lt_stale' || bucket === 'lt_idle') return 'live';
          return 'stale';
        case 'done':
          if (bucket === 'gte_archived') return 'archived';
          return 'idle';
        case 'failed':
          if (bucket === 'lt_stale' || bucket === 'lt_idle') return 'live';
          return 'stale';
        case 'parked': return 'parked';
        default: return 'stale';
      }
    }
    case 'task': {
      switch (status) {
        case 'in_progress':
        case 'waiting_on_me':
        case 'waiting_on_agent':
          return 'live';
        case 'ready':
        case 'backlog':
        case 'blocked':
          if (bucket === 'lt_stale' || bucket === 'lt_idle') return 'live';
          return 'stale';
        case 'completed':
          if (bucket === 'gte_archived') return 'archived';
          return 'idle';
        default: return 'stale';
      }
    }
    case 'run': {
      if (status === 'active') return 'live';
      if (status === 'done' || status === 'failed') {
        if (bucket === 'gte_archived') return 'archived';
        return 'idle';
      }
      return 'stale';
    }
    case 'proof': {
      if (status === 'passed' || status === 'recorded' || status === 'passed_with_blockers') {
        if (bucket === 'gte_archived') return 'archived';
        return 'live';
      }
      if (status === 'blocked') return 'stale';
      return 'stale';
    }
    case 'plan': {
      if (status === 'active') return 'live';
      if (status === 'proposed') {
        if (bucket === 'lt_stale' || bucket === 'lt_idle') return 'live';
        return 'stale';
      }
      if (status === 'paused') return 'parked';
      if (status === 'absorbed' || status === 'completed') return 'archived';
      return 'stale';
    }
    case 'review': {
      // reviews follow the task pattern: in_progress = live, completed ages
      if (status === 'in_progress' || status === 'open' || status === 'pending') return 'live';
      if (status === 'completed' || status === 'resolved') {
        if (bucket === 'gte_archived') return 'archived';
        return 'idle';
      }
      return 'stale';
    }
    case 'gap': {
      if (status === 'open') return 'live';
      if (status === 'resolved') {
        if (bucket === 'gte_archived') return 'archived';
        return 'idle';
      }
      return 'stale';
    }
    case 'legacy_queue':
      return 'parked';
    default:
      return 'stale';
  }
}

function isLive(freshness) { return LIVE_FRESHNESS.has(freshness); }
function isStaleOrColder(freshness) {
  return freshness === 'stale' || freshness === 'parked' || freshness === 'archived';
}

module.exports = {
  THRESHOLDS,
  VALID_FRESHNESS,
  LIVE_FRESHNESS,
  deriveFreshness,
  isLive,
  isStaleOrColder,
};
