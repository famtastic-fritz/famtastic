'use strict';
/**
 * fulfillment-ledger.js — Per-build capability fulfillment tracking.
 *
 * Records what the user requested, what was completed now, what was
 * approximated/placeholdered, and what was deferred as jobs or gaps.
 *
 * Ledger file: sites/<tag>/fulfillment-<runId>.json
 *
 * Ledger shape:
 * {
 *   run_id:           string,
 *   site_tag:         string,
 *   user_request:     string,   // original message/prompt
 *   created_at:       string,
 *   finalized_at:     string,
 *   status:           "open" | "finalized",
 *   items: [
 *     {
 *       id:                     string,
 *       source:                 string,    // "initial_build_prompt" | "follow_up" etc.
 *       requested_capability:   string,
 *       detected_type:          string,    // "page" | "section" | "component" | "integration" | "specialized_asset" | "behavior"
 *       status:                 string,    // "completed" | "placeholder" | "deferred" | "failed"
 *       completed_now:          string[],
 *       deferred:               string[],
 *       jobs:                   object[],  // { workspace, job_type, job_id? }
 *       gaps:                   string[],  // capability_ids
 *       reason:                 string,
 *     }
 *   ],
 *   summary: {
 *     total_items:    number,
 *     completed:      number,
 *     placeholder:    number,
 *     deferred:       number,
 *     failed:         number,
 *     jobs_created:   number,
 *     gaps_logged:    number,
 *   }
 * }
 */

const fs   = require('fs');
const path = require('path');

// Gap type constants for use when creating items
const FULFILLMENT_STATUS = {
  COMPLETED:   'completed',
  PLACEHOLDER: 'placeholder',
  DEFERRED:    'deferred',
  FAILED:      'failed',
};

const DETECTED_TYPES = {
  PAGE:             'page',
  SECTION:          'section',
  COMPONENT:        'component',
  INTEGRATION:      'integration',
  SPECIALIZED_ASSET:'specialized_asset',
  BEHAVIOR:         'behavior',
  CONTENT:          'content',
  STYLE:            'style',
  UNKNOWN:          'unknown',
};

const WORKSPACE = {
  THINK_TANK:       'Think Tank',
  MEDIA_STUDIO:     'Media Studio',
  COMPONENT_STUDIO: 'Component Studio',
  SITE_EDITOR:      'Site Editor',
  PLATFORM:         'Platform',
  JOB_QUEUE:        'Job Queue',
};

/**
 * Create a new in-memory ledger for a build run.
 *
 * @param {string} runId
 * @param {string} siteTag
 * @param {string} userRequest — the original user prompt/message
 * @returns {object} ledger
 */
function createLedger(runId, siteTag, userRequest) {
  return {
    run_id:       runId,
    site_tag:     siteTag,
    user_request: userRequest || '',
    created_at:   new Date().toISOString(),
    finalized_at: null,
    status:       'open',
    items:        [],
    summary:      {
      total_items:  0,
      completed:    0,
      placeholder:  0,
      deferred:     0,
      failed:       0,
      jobs_created: 0,
      gaps_logged:  0,
    },
  };
}

/**
 * Add a fulfillment item to the ledger.
 *
 * @param {object} ledger
 * @param {object} item — partial item (id auto-generated if missing)
 * @returns {object} the added item
 */
function addFulfillmentItem(ledger, item) {
  if (!ledger || !item) return item;

  const entry = {
    id:                   item.id || `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    source:               item.source               || 'initial_build_prompt',
    requested_capability: item.requested_capability || '',
    detected_type:        item.detected_type        || DETECTED_TYPES.UNKNOWN,
    status:               item.status               || FULFILLMENT_STATUS.COMPLETED,
    completed_now:        item.completed_now        || [],
    deferred:             item.deferred             || [],
    jobs:                 item.jobs                 || [],
    gaps:                 item.gaps                 || [],
    reason:               item.reason               || '',
  };

  ledger.items.push(entry);
  return entry;
}

/**
 * Finalize the ledger: compute summary and write to disk.
 *
 * @param {object} ledger
 * @param {string} hubRoot — path to ~/famtastic
 * @returns {object} the finalized ledger
 */
function finalizeLedger(ledger, hubRoot) {
  if (!ledger) return ledger;

  // Compute summary
  const summary = {
    total_items:  ledger.items.length,
    completed:    0,
    placeholder:  0,
    deferred:     0,
    failed:       0,
    jobs_created: 0,
    gaps_logged:  0,
  };

  for (const item of ledger.items) {
    switch (item.status) {
      case FULFILLMENT_STATUS.COMPLETED:   summary.completed++;   break;
      case FULFILLMENT_STATUS.PLACEHOLDER: summary.placeholder++; break;
      case FULFILLMENT_STATUS.DEFERRED:    summary.deferred++;    break;
      case FULFILLMENT_STATUS.FAILED:      summary.failed++;      break;
    }
    summary.jobs_created += (item.jobs  || []).length;
    summary.gaps_logged  += (item.gaps  || []).length;
  }

  ledger.summary      = summary;
  ledger.finalized_at = new Date().toISOString();
  ledger.status       = 'finalized';

  // Write to disk
  if (hubRoot && ledger.site_tag) {
    try {
      const siteDir = path.join(hubRoot, 'sites', ledger.site_tag);
      if (fs.existsSync(siteDir)) {
        const outPath = path.join(siteDir, `fulfillment-${ledger.run_id}.json`);
        fs.writeFileSync(outPath, JSON.stringify(ledger, null, 2));
      }
    } catch (err) {
      console.error('[fulfillment-ledger] Failed to write ledger:', err.message);
    }
  }

  return ledger;
}

/**
 * Read the most recent fulfillment ledger for a site.
 * @param {string} siteTag
 * @param {string} hubRoot
 * @param {string} runId — specific run, or null for latest
 * @returns {object|null}
 */
function readLedger(siteTag, hubRoot, runId) {
  if (!hubRoot || !siteTag) return null;
  try {
    const siteDir = path.join(hubRoot, 'sites', siteTag);
    if (!fs.existsSync(siteDir)) return null;

    if (runId) {
      const p = path.join(siteDir, `fulfillment-${runId}.json`);
      if (!fs.existsSync(p)) return null;
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    }

    // Find latest by mtime
    const files = fs.readdirSync(siteDir)
      .filter(f => f.startsWith('fulfillment-') && f.endsWith('.json'))
      .map(f => ({ name: f, mtime: fs.statSync(path.join(siteDir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);

    if (!files.length) return null;
    return JSON.parse(fs.readFileSync(path.join(siteDir, files[0].name), 'utf8'));
  } catch {
    return null;
  }
}

module.exports = {
  createLedger,
  addFulfillmentItem,
  finalizeLedger,
  readLedger,
  FULFILLMENT_STATUS,
  DETECTED_TYPES,
  WORKSPACE,
};
