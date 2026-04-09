'use strict';
/**
 * api-cost-tracker.js — Lightweight cost calculation and API call logging.
 *
 * Thin interface over api-telemetry.js with a simplified signature.
 * Imported by adapters and lib modules that need cost tracking without the
 * full session-aggregation features of api-telemetry.js.
 *
 * Usage:
 *   const { logAPICall, calculateCost } = require('./api-cost-tracker');
 *   await logAPICall('claude', 'claude-sonnet-4-6', { input_tokens: 500, output_tokens: 200 });
 */

const path = require('path');
const fs   = require('fs');

const COST_PER_MILLION = {
  'claude-sonnet-4-6':         { input: 3.00,  output: 15.00 },
  'claude-sonnet-4-5-20250514':{ input: 3.00,  output: 15.00 },
  'claude-haiku-4-5-20251001': { input: 0.80,  output: 4.00  },
  'claude-haiku-4-5':          { input: 0.25,  output: 1.25  },
  'gemini-2.0-flash':          { input: 0.10,  output: 0.40  },
  'gpt-4o':                    { input: 2.50,  output: 10.00 },
  'codex-cli':                 { input: 0.00,  output: 0.00  }, // CLI — no token billing
};

/**
 * Calculate cost for a model call.
 * @param {string} model
 * @param {number} inputTokens
 * @param {number} outputTokens
 * @returns {number} cost in USD (rounded to 6dp)
 */
function calculateCost(model, inputTokens = 0, outputTokens = 0) {
  // Normalize — strip date suffix
  const normalKey = model.replace(/-20\d{6}$/, '');
  const rates = COST_PER_MILLION[model] || COST_PER_MILLION[normalKey] || { input: 3.00, output: 15.00 };
  const cost = (inputTokens * rates.input / 1_000_000) + (outputTokens * rates.output / 1_000_000);
  return parseFloat(cost.toFixed(6));
}

/**
 * Log an API call to the per-site JSONL file and the full api-telemetry module.
 * Simplified signature: (provider, model, usage) rather than a params object.
 *
 * @param {string} provider      — 'claude' | 'gemini' | 'codex'
 * @param {string} model         — full model string
 * @param {object} usage         — { input_tokens, output_tokens }
 * @param {object} meta          — optional { callSite, tag, hubRoot }
 * @returns {object}             — log entry
 */
async function logAPICall(provider, model, usage = {}, meta = {}) {
  const inputTokens  = usage.input_tokens  || 0;
  const outputTokens = usage.output_tokens || 0;
  const costUsd      = calculateCost(model, inputTokens, outputTokens);
  const timestamp    = new Date().toISOString();
  const { callSite = 'unknown', tag = null, hubRoot = null } = meta;

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

  // Write to per-site JSONL if tag + hubRoot available
  if (tag && hubRoot) {
    try {
      const siteDir = path.join(hubRoot, 'sites', tag);
      const logPath = path.join(siteDir, 'sdk-calls.jsonl');
      if (fs.existsSync(siteDir)) {
        fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
      }
    } catch (err) {
      console.error('[api-cost-tracker] Write error:', err.message);
    }
  }

  return entry;
}

module.exports = { logAPICall, calculateCost, COST_PER_MILLION };
