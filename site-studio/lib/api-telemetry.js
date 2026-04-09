'use strict';
/**
 * api-telemetry.js — Per-call SDK cost logging.
 *
 * Every Anthropic SDK call MUST log here after completion.
 * Writes to sites/<tag>/sdk-calls.jsonl (per-site log).
 * Also accumulates session-level totals in memory for /api/telemetry/sdk-cost-summary.
 *
 * Usage:
 *   const { logAPICall } = require('./api-telemetry');
 *   logAPICall({ provider, model, callSite, inputTokens, outputTokens, tag });
 */

const fs   = require('fs');
const path = require('path');

// Cost rates per million tokens (USD)
const COST_RATES = {
  'claude-sonnet-4-6':         { input: 3.00,  output: 15.00 },
  'claude-sonnet-4-5-20250514':{ input: 3.00,  output: 15.00 },
  'claude-haiku-4-5-20251001': { input: 0.80,  output: 4.00  },
  'gemini-2.0-flash':          { input: 0.10,  output: 0.40  },
  'gpt-4o':                    { input: 2.50,  output: 10.00 },
};

// In-memory session totals — reset on server restart
const sessionTotals = {
  byProvider: {},  // { 'claude': { calls, inputTokens, outputTokens, costUsd } }
  bySite:     {},  // { 'site-tag': { calls, inputTokens, outputTokens, costUsd } }
  byCallSite: {},  // { 'page-build': { calls, inputTokens, outputTokens, costUsd } }
  totalCostUsd: 0,
};

/**
 * Calculate cost in USD for a given model and token counts.
 * @param {string} model
 * @param {number} inputTokens
 * @param {number} outputTokens
 * @returns {number} cost in USD (rounded to 6 decimal places)
 */
function calculateCost(model, inputTokens = 0, outputTokens = 0) {
  // Normalize model string — strip version suffix for lookup
  const normalKey = model.replace(/-20\d{6}$/, '');
  const rates = COST_RATES[model] || COST_RATES[normalKey] || COST_RATES['claude-sonnet-4-6'];
  const cost = (inputTokens * rates.input / 1_000_000) + (outputTokens * rates.output / 1_000_000);
  return parseFloat(cost.toFixed(6));
}

/**
 * Log an API call. Writes to JSONL per-site file and updates in-memory totals.
 *
 * @param {object} params
 *   provider      — 'claude' | 'gemini' | 'codex'
 *   model         — full model string
 *   callSite      — e.g. 'brief-generation', 'page-build', 'chat'
 *   inputTokens   — from usage.input_tokens
 *   outputTokens  — from usage.output_tokens
 *   tag           — current site tag (TAG)
 *   hubRoot       — path to FAMtastic hub root (for file path resolution)
 */
function logAPICall(params = {}) {
  const {
    provider     = 'claude',
    model        = 'claude-sonnet-4-6',
    callSite     = 'unknown',
    inputTokens  = 0,
    outputTokens = 0,
    tag          = null,
    hubRoot      = null,
  } = params;

  const costUsd   = calculateCost(model, inputTokens, outputTokens);
  const timestamp = new Date().toISOString();

  const entry = {
    provider,
    model,
    call_site:     callSite,
    input_tokens:  inputTokens,
    output_tokens: outputTokens,
    cost_usd:      costUsd,
    tag,
    timestamp,
  };

  // Write to per-site JSONL log
  if (tag && hubRoot) {
    try {
      const siteDir  = path.join(hubRoot, 'sites', tag);
      const logPath  = path.join(siteDir, 'sdk-calls.jsonl');
      if (fs.existsSync(siteDir)) {
        fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
      }
    } catch (err) {
      console.error('[api-telemetry] Failed to write log:', err.message);
    }
  }

  // Update in-memory session totals
  const bumpBucket = (buckets, key) => {
    if (!buckets[key]) {
      buckets[key] = { calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
    }
    buckets[key].calls++;
    buckets[key].inputTokens  += inputTokens;
    buckets[key].outputTokens += outputTokens;
    buckets[key].costUsd       = parseFloat((buckets[key].costUsd + costUsd).toFixed(6));
  };

  bumpBucket(sessionTotals.byProvider, provider);
  if (tag) bumpBucket(sessionTotals.bySite, tag);
  bumpBucket(sessionTotals.byCallSite, callSite);
  sessionTotals.totalCostUsd = parseFloat((sessionTotals.totalCostUsd + costUsd).toFixed(6));

  return entry;
}

/**
 * Get the session cost summary (for /api/telemetry/sdk-cost-summary endpoint).
 */
function getSessionSummary() {
  return {
    totalCostUsd:   sessionTotals.totalCostUsd,
    byProvider:     { ...sessionTotals.byProvider },
    bySite:         { ...sessionTotals.bySite },
    byCallSite:     { ...sessionTotals.byCallSite },
    generatedAt:    new Date().toISOString(),
  };
}

/**
 * Read historical SDK call log for a specific site.
 * Returns array of log entries, newest first.
 */
function readSiteLog(tag, hubRoot, limit = 100) {
  if (!tag || !hubRoot) return [];
  try {
    const logPath = path.join(hubRoot, 'sites', tag, 'sdk-calls.jsonl');
    if (!fs.existsSync(logPath)) return [];
    const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean);
    return lines
      .slice(-limit)
      .reverse()
      .map(l => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean);
  } catch {
    return [];
  }
}

module.exports = { logAPICall, calculateCost, getSessionSummary, readSiteLog, COST_RATES };
