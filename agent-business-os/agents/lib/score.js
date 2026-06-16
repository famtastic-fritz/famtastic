'use strict';

/*
 * agents/lib/score.js — canonical fit scoring + routing.
 *
 * This mirrors the formula in api/lead/index.js. It is the single definition the
 * agents use; if the scoring ever changes, change it here and in the lead
 * function together (they can't share an import across the Azure boundary).
 */

const VALID_BOTTLENECKS = ['lead_volume', 'lead_quality', 'follow_up', 'close_rate', 'fulfillment'];

function num(v) { const n = parseFloat(v); return isNaN(n) ? 0 : Math.max(0, n); }

// Returns { fitScore, priority, responseSlaMinutes }.
function score(lead) {
  const revenue = num(lead.revenue);
  const lift = num(lead.lift != null ? lead.lift : lead.desiredLift);
  const start7 = String(lead.start7 || '').toLowerCase() === 'yes';
  const bottleneck = String(lead.bottleneck || '').trim();

  let fitScore = 40;
  if (start7) fitScore += 20;
  if (revenue >= 50000) fitScore += 20; else if (revenue >= 20000) fitScore += 12; else if (revenue >= 10000) fitScore += 6;
  if (lift >= 30000) fitScore += 15; else if (lift >= 10000) fitScore += 8;
  if (bottleneck && VALID_BOTTLENECKS.includes(bottleneck)) fitScore += 5;
  fitScore = Math.max(0, Math.min(100, fitScore));

  let priority = 'nurture', responseSlaMinutes = 240;
  if (fitScore >= 75) { priority = 'hot'; responseSlaMinutes = 15; }
  else if (fitScore >= 55) { priority = 'warm'; responseSlaMinutes = 60; }

  return { fitScore, priority, responseSlaMinutes };
}

module.exports = { score, VALID_BOTTLENECKS };
