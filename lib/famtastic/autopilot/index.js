'use strict';

function normalizeEvents(events) {
  return Array.isArray(events) ? events.filter(Boolean).map(event => ({
    action: String(event.action || event.tool || event.type || 'unknown'),
    ok: event.ok !== false,
  })) : [];
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}

function evaluateRunHealth(events, options = {}) {
  const recent = normalizeEvents(events).slice(-(options.windowSize || 8));
  if (!recent.length) {
    return {
      status: 'suspicious',
      metrics: {
        total: 0,
        successRate: 0,
        diversity: 0,
        repeatedStreak: 0,
      },
      reason: 'no recent events',
    };
  }

  const actions = recent.map(event => event.action);
  const uniqueActions = new Set(actions);
  const successCount = recent.filter(event => event.ok).length;
  let repeatedStreak = 1;
  for (let i = recent.length - 1; i > 0; i--) {
    if (recent[i].action !== recent[i - 1].action) break;
    repeatedStreak += 1;
  }

  const metrics = {
    total: recent.length,
    successRate: round(successCount / recent.length),
    diversity: round(uniqueActions.size / recent.length),
    repeatedStreak,
  };

  if (metrics.successRate <= 0.34 || repeatedStreak >= 4 || (metrics.diversity <= 0.25 && recent.length >= 4)) {
    return { status: 'stuck', metrics, reason: 'low success or repeated action loop' };
  }

  if (metrics.successRate < 0.75 || repeatedStreak >= 3 || metrics.diversity <= 0.5) {
    return { status: 'suspicious', metrics, reason: 'degraded diversity or success rate' };
  }

  return { status: 'productive', metrics, reason: 'healthy action diversity and success rate' };
}

module.exports = { evaluateRunHealth };
