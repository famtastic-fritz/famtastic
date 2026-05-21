'use strict';
/**
 * media-telemetry.js — Append-only telemetry log for all AI media operations.
 *
 * Per-site log:  sites/{tag}/media-telemetry.jsonl
 * Global log:    intelligence/media-usage.jsonl
 *
 * Every API call across all providers (Google, Leonardo, Adobe Firefly,
 * Adobe Photoshop MCP) logs: model, cost, credits, tokens, timing, quality.
 * The intelligence loop reads these to optimize provider routing and cost.
 */

const fs = require('fs');
const path = require('path');

const INTELLIGENCE_DIR = path.join(__dirname, '..', '..', 'intelligence');
const MAX_LOG_ENTRIES = 5000; // compact after this many entries

/**
 * Log a media operation to both per-site and global telemetry files.
 *
 * @param {Object} data
 * @param {string} data.provider — google|leonardo|adobe-firefly|adobe-photoshop
 * @param {string} data.model — imagen-4.0|veo-3.1|phoenix-1.0|firefly-image-3|etc
 * @param {string} data.operation — generate|edit|upscale|video|batch|style-reference
 * @param {string} data.site — site tag (e.g., guys-classy-shoes)
 * @param {number} data.cost_usd — cost in USD (0 if free/credits)
 * @param {number} data.credits_used — provider credits consumed
 * @param {number} data.credits_remaining — provider credits left after operation
 * @param {number} [data.tokens_in] — input tokens (if applicable)
 * @param {number} [data.tokens_out] — output tokens (if applicable)
 * @param {number} data.generation_time_seconds — wall clock time
 * @param {number} [data.file_size_bytes] — output file size
 * @param {string} [data.resolution] — e.g., "1024x1024"
 * @param {string} data.prompt — text prompt used
 * @param {boolean} [data.style_reference_used] — whether style ref was used
 * @param {number} [data.batch_size] — number of images in batch
 * @param {string} [data.batch_id] — group ID for batch operations
 * @param {boolean} [data.was_fallback] — true if this was a fallback from another provider
 * @param {string} [data.original_provider] — provider that was tried first (if fallback)
 * @param {string} [data.fallback_reason] — why fallback occurred
 * @param {string} [data.siteDir] — absolute path to site directory (for per-site log)
 */
function logMediaOperation(data) {
  const entry = {
    timestamp: new Date().toISOString(),
    provider: data.provider || 'unknown',
    model: data.model || 'unknown',
    operation: data.operation || 'generate',
    site: data.site || 'unknown',

    // Cost tracking
    cost_usd: data.cost_usd || 0,
    credits_used: data.credits_used || 0,
    credits_remaining: data.credits_remaining ?? null,
    tokens_in: data.tokens_in || 0,
    tokens_out: data.tokens_out || 0,

    // Performance
    generation_time_seconds: data.generation_time_seconds || 0,
    file_size_bytes: data.file_size_bytes || 0,
    resolution: data.resolution || '',

    // Quality (filled in after review)
    quality_rating: data.quality_rating || null,
    used_in_final: data.used_in_final || null,

    // Context
    prompt: (data.prompt || '').substring(0, 500),
    prompt_length: (data.prompt || '').length,
    style_reference_used: data.style_reference_used || false,
    batch_size: data.batch_size || 1,
    batch_id: data.batch_id || null,

    // Fallback tracking
    was_fallback: data.was_fallback || false,
    original_provider: data.original_provider || null,
    fallback_reason: data.fallback_reason || null,
  };

  const line = JSON.stringify(entry) + '\n';

  // Write to per-site log
  if (data.siteDir) {
    const siteLog = path.join(data.siteDir, 'media-telemetry.jsonl');
    try {
      fs.appendFileSync(siteLog, line);
      compactIfNeeded(siteLog); // Codex review: compact per-site logs too
    } catch (e) {
      console.error('[media-telemetry] Per-site write failed:', e.message);
    }
  }

  // Write to global log
  try {
    if (!fs.existsSync(INTELLIGENCE_DIR)) {
      fs.mkdirSync(INTELLIGENCE_DIR, { recursive: true });
    }
    const globalLog = path.join(INTELLIGENCE_DIR, 'media-usage.jsonl');
    fs.appendFileSync(globalLog, line);

    // Compact if too large
    compactIfNeeded(globalLog);
  } catch (e) {
    console.error('[media-telemetry] Global write failed:', e.message);
  }

  // Credit alerts
  checkCreditAlerts(entry);

  return entry;
}

/**
 * Read and aggregate media usage data.
 *
 * @param {Object} [options]
 * @param {string} [options.provider] — filter by provider
 * @param {string} [options.site] — filter by site
 * @param {string} [options.siteDir] — read from site-specific log instead of global
 * @returns {Object} usage summary
 */
function getMediaUsage(options = {}) {
  const logPath = options.siteDir
    ? path.join(options.siteDir, 'media-telemetry.jsonl')
    : path.join(INTELLIGENCE_DIR, 'media-usage.jsonl');

  if (!fs.existsSync(logPath)) {
    return emptyUsage();
  }

  const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean);
  let entries = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

  // Apply filters
  if (options.provider) entries = entries.filter(e => e.provider === options.provider);
  if (options.site) entries = entries.filter(e => e.site === options.site);

  // Aggregate
  const totalCost = entries.reduce((s, e) => s + (e.cost_usd || 0), 0);
  const totalOps = entries.length;

  // By provider
  const byProvider = {};
  for (const e of entries) {
    const p = e.provider;
    if (!byProvider[p]) {
      byProvider[p] = { operations: 0, cost: 0, total_time: 0, quality_sum: 0, quality_count: 0, credits_remaining: null };
    }
    byProvider[p].operations++;
    byProvider[p].cost += e.cost_usd || 0;
    byProvider[p].total_time += e.generation_time_seconds || 0;
    if (e.quality_rating) { byProvider[p].quality_sum += e.quality_rating; byProvider[p].quality_count++; }
    if (e.credits_remaining !== null) byProvider[p].credits_remaining = e.credits_remaining;
  }
  // Compute averages
  for (const p in byProvider) {
    const d = byProvider[p];
    d.avg_speed_seconds = d.operations > 0 ? Math.round(d.total_time / d.operations * 10) / 10 : 0;
    d.avg_quality = d.quality_count > 0 ? Math.round(d.quality_sum / d.quality_count * 10) / 10 : null;
    d.cost = Math.round(d.cost * 10000) / 10000;
    delete d.total_time;
    delete d.quality_sum;
    delete d.quality_count;
  }

  // By site
  const bySite = {};
  for (const e of entries) {
    const s = e.site;
    if (!bySite[s]) bySite[s] = { operations: 0, cost: 0 };
    bySite[s].operations++;
    bySite[s].cost += e.cost_usd || 0;
  }
  for (const s in bySite) bySite[s].cost = Math.round(bySite[s].cost * 10000) / 10000;

  // By operation type
  const byType = {};
  for (const e of entries) {
    const t = e.operation;
    byType[t] = (byType[t] || 0) + 1;
  }

  // Cost trend (last 7 days)
  const now = Date.now();
  const costTrend7d = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(now - i * 86400000);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    const dayEntries = entries.filter(e => {
      const t = new Date(e.timestamp).getTime();
      return t >= dayStart.getTime() && t < dayEnd.getTime();
    });
    costTrend7d.push({
      date: dayStart.toISOString().split('T')[0],
      cost: Math.round(dayEntries.reduce((s, e) => s + (e.cost_usd || 0), 0) * 10000) / 10000,
      operations: dayEntries.length,
    });
  }

  // Recommendations
  const recommendations = generateRecommendations(byProvider);

  return {
    total_cost_usd: Math.round(totalCost * 10000) / 10000,
    total_operations: totalOps,
    by_provider: byProvider,
    by_site: bySite,
    by_operation_type: byType,
    cost_trend_7day: costTrend7d,
    recommendations,
  };
}

function emptyUsage() {
  return {
    total_cost_usd: 0,
    total_operations: 0,
    by_provider: {},
    by_site: {},
    by_operation_type: {},
    cost_trend_7day: [],
    recommendations: [],
  };
}

function generateRecommendations(byProvider) {
  const recs = [];
  for (const [name, data] of Object.entries(byProvider)) {
    // Codex review: use provider quota percentage, not operation count
    const quotas = { 'google': 25, 'leonardo': 5000, 'adobe-firefly': 4000 };
    const quota = quotas[name];
    if (data.credits_remaining !== null && quota && data.credits_remaining / quota < 0.2) {
      recs.push({ type: 'warning', provider: name, message: `${name} credits running low (${data.credits_remaining} of ${quota} remaining, ${Math.round(data.credits_remaining / quota * 100)}%)` });
    }
    if (data.avg_quality && data.avg_quality < 6) {
      recs.push({ type: 'info', provider: name, message: `${name} avg quality is ${data.avg_quality}/10 — consider switching providers for this use case` });
    }
  }

  // Cost comparison
  const providers = Object.entries(byProvider).filter(([, d]) => d.operations >= 2);
  if (providers.length >= 2) {
    const sorted = providers.sort((a, b) => (a[1].cost / a[1].operations) - (b[1].cost / b[1].operations));
    const cheapest = sorted[0];
    const most = sorted[sorted.length - 1];
    if (cheapest[0] !== most[0]) {
      const cheapCpp = (cheapest[1].cost / cheapest[1].operations).toFixed(4);
      const mostCpp = (most[1].cost / most[1].operations).toFixed(4);
      recs.push({ type: 'cost', message: `${cheapest[0]} is cheapest at $${cheapCpp}/op vs ${most[0]} at $${mostCpp}/op` });
    }
  }

  return recs;
}

function checkCreditAlerts(entry) {
  if (entry.credits_remaining === null) return;

  // Define credit thresholds per provider
  const thresholds = {
    'google': { total: 25, currency: 'USD' },
    'leonardo': { total: 5000, currency: 'tokens' },
    'adobe-firefly': { total: 4000, currency: 'credits' },
  };

  const t = thresholds[entry.provider];
  if (!t) return;

  const pct = entry.credits_remaining / t.total;
  if (pct < 0.1) {
    console.warn(`[media-telemetry] ALERT: ${entry.provider} credits critically low: ${entry.credits_remaining} ${t.currency} remaining (${Math.round(pct * 100)}%)`);
  } else if (pct < 0.2) {
    console.warn(`[media-telemetry] WARNING: ${entry.provider} credits low: ${entry.credits_remaining} ${t.currency} remaining (${Math.round(pct * 100)}%)`);
  }
}

function compactIfNeeded(logPath) {
  try {
    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.trim().split('\n');
    if (lines.length > MAX_LOG_ENTRIES * 1.2) {
      const trimmed = lines.slice(-MAX_LOG_ENTRIES);
      fs.writeFileSync(logPath, trimmed.join('\n') + '\n');
      console.log(`[media-telemetry] Compacted ${logPath}: ${lines.length} -> ${trimmed.length} entries`);
    }
  } catch (e) {
    // Non-critical — skip compaction
  }
}

module.exports = { logMediaOperation, getMediaUsage };
