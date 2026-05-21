'use strict';
/**
 * build-trace.js — Durable build decision tracing for FAMtastic Studio.
 *
 * Every build decision creates a trace event. Events are written to two places:
 *   1. sites/<tag>/build-trace.jsonl  — lightweight per-site append log
 *   2. SQLite trace_events table      — queryable cross-site history
 *
 * Trace event shape (all fields optional except trace_id, run_id, phase):
 * {
 *   trace_id                  string   — "run_<ts>_<rand>.step_<N>"
 *   parent_trace_id           string   — run_id for top-level steps, parent step for nested
 *   run_id                    string   — top-level build run identifier
 *   site_tag                  string   — which site
 *   phase                     string   — e.g. "classification", "routing", "build", "verification"
 *   step_id                   string   — short slug, e.g. "classify_request"
 *   decision_type             string   — e.g. "fulfillment_path", "routing", "model_selection"
 *   requested_item            string   — what the user / orchestrator asked for
 *   selected_path             string   — what was chosen
 *   alternatives_considered   string[] — other paths evaluated
 *   reason                    string   — why this path was chosen
 *   agent                     string   — "orchestrator" | "worker" | "shay" etc.
 *   tool                      string   — function or sub-system used
 *   provider                  string   — "anthropic" | "gemini" | "codex" | "deterministic"
 *   model                     string   — full model string
 *   cost_type                 string   — "api_billed" | "subscription" | "zero_token"
 *   prompt_hash               string   — MD5 of prompt for deduplication
 *   prompt_template_version   string   — e.g. "build-plan-v4"
 *   input_tokens_estimated    number
 *   output_tokens_estimated   number
 *   input_tokens_actual       number
 *   output_tokens_actual      number
 *   cost_usd_actual           number
 *   duration_ms               number
 *   status                    string   — "completed" | "failed" | "skipped"
 *   quality_score             number   — 0-100 if available
 *   verification_refs         string[] — IDs of related verification results
 *   created_jobs              string[] — job IDs spawned from this decision
 *   gaps                      string[] — gap capability_ids created
 *   error                     string   — error message if status === "failed"
 *   created_at                string   — ISO timestamp
 * }
 */

const fs   = require('fs');
const path = require('path');

let _db = null;   // lazy-loaded to avoid circular dependency with db.js

/**
 * Lazy-load db.js to avoid circular require issues.
 * build-trace.js is required by server.js which is also required by db.js tests.
 */
function _getDb() {
  if (!_db) {
    try {
      const dbMod = require('./db');
      _db = dbMod;
    } catch {
      // db unavailable (e.g., in unit tests with no DB) — degrade gracefully
    }
  }
  return _db;
}

/**
 * Ensure the trace_events table exists in SQLite.
 * Called lazily on first write — db.js _initSchema handles the CREATE TABLE
 * after we add it there, but this guards legacy DBs.
 */
function _ensureTraceTable() {
  const db = _getDb();
  if (!db) return;
  try {
    db.getDb().exec(`
      CREATE TABLE IF NOT EXISTS trace_events (
        trace_id                TEXT PRIMARY KEY,
        parent_trace_id         TEXT,
        run_id                  TEXT NOT NULL,
        site_tag                TEXT,
        phase                   TEXT NOT NULL,
        step_id                 TEXT,
        decision_type           TEXT,
        requested_item          TEXT,
        selected_path           TEXT,
        alternatives_considered TEXT,
        reason                  TEXT,
        agent                   TEXT,
        tool                    TEXT,
        provider                TEXT,
        model                   TEXT,
        cost_type               TEXT,
        prompt_hash             TEXT,
        prompt_template_version TEXT,
        input_tokens_estimated  INTEGER DEFAULT 0,
        output_tokens_estimated INTEGER DEFAULT 0,
        input_tokens_actual     INTEGER DEFAULT 0,
        output_tokens_actual    INTEGER DEFAULT 0,
        cost_usd_actual         REAL    DEFAULT 0,
        duration_ms             INTEGER,
        status                  TEXT    DEFAULT 'completed',
        quality_score           INTEGER,
        verification_refs       TEXT,
        created_jobs            TEXT,
        gaps                    TEXT,
        error                   TEXT,
        created_at              TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_trace_run    ON trace_events(run_id);
      CREATE INDEX IF NOT EXISTS idx_trace_site   ON trace_events(site_tag);
      CREATE INDEX IF NOT EXISTS idx_trace_phase  ON trace_events(phase);
      CREATE INDEX IF NOT EXISTS idx_trace_status ON trace_events(status);
    `);
  } catch (err) {
    // Non-fatal — JSONL is the primary store
    console.error('[build-trace] Failed to ensure trace table:', err.message);
  }
}

let _tableEnsured = false;

/**
 * Log a build trace event.
 *
 * @param {object} event  — partial trace event (see shape above)
 * @param {string} hubRoot — path to ~/famtastic (for JSONL file path)
 * @returns {object} the completed event with created_at filled in
 */
function logTrace(event, hubRoot) {
  if (!event || !event.trace_id || !event.run_id || !event.phase) {
    console.warn('[build-trace] logTrace called with missing required fields (trace_id, run_id, phase)');
    return event || {};
  }

  const entry = {
    trace_id:                 event.trace_id,
    parent_trace_id:          event.parent_trace_id  || event.run_id,
    run_id:                   event.run_id,
    site_tag:                 event.site_tag          || null,
    phase:                    event.phase,
    step_id:                  event.step_id           || null,
    decision_type:            event.decision_type     || null,
    requested_item:           event.requested_item    || null,
    selected_path:            event.selected_path     || null,
    alternatives_considered:  event.alternatives_considered || [],
    reason:                   event.reason            || null,
    agent:                    event.agent             || 'orchestrator',
    tool:                     event.tool              || null,
    provider:                 event.provider          || null,
    model:                    event.model             || null,
    cost_type:                event.cost_type         || 'zero_token',
    prompt_hash:              event.prompt_hash       || null,
    prompt_template_version:  event.prompt_template_version || null,
    input_tokens_estimated:   event.input_tokens_estimated  || 0,
    output_tokens_estimated:  event.output_tokens_estimated || 0,
    input_tokens_actual:      event.input_tokens_actual     || 0,
    output_tokens_actual:     event.output_tokens_actual    || 0,
    cost_usd_actual:          event.cost_usd_actual         || 0,
    duration_ms:              event.duration_ms              || null,
    status:                   event.status            || 'completed',
    quality_score:            event.quality_score     || null,
    verification_refs:        event.verification_refs || [],
    created_jobs:             event.created_jobs      || [],
    gaps:                     event.gaps              || [],
    error:                    event.error             || null,
    created_at:               event.created_at        || new Date().toISOString(),
  };

  // 1. Append to per-site JSONL
  if (hubRoot && entry.site_tag) {
    try {
      const siteDir   = path.join(hubRoot, 'sites', entry.site_tag);
      const tracePath = path.join(siteDir, 'build-trace.jsonl');
      if (fs.existsSync(siteDir)) {
        fs.appendFileSync(tracePath, JSON.stringify(entry) + '\n');
      }
    } catch (err) {
      console.error('[build-trace] Failed to write JSONL:', err.message);
    }
  }

  // 2. Insert into SQLite trace_events
  try {
    if (!_tableEnsured) {
      _ensureTraceTable();
      _tableEnsured = true;
    }
    const db = _getDb();
    if (db) {
      db.getDb().prepare(`
        INSERT OR REPLACE INTO trace_events (
          trace_id, parent_trace_id, run_id, site_tag,
          phase, step_id, decision_type, requested_item, selected_path,
          alternatives_considered, reason, agent, tool, provider, model,
          cost_type, prompt_hash, prompt_template_version,
          input_tokens_estimated, output_tokens_estimated,
          input_tokens_actual, output_tokens_actual, cost_usd_actual,
          duration_ms, status, quality_score,
          verification_refs, created_jobs, gaps, error, created_at
        ) VALUES (
          ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
        )
      `).run(
        entry.trace_id,
        entry.parent_trace_id,
        entry.run_id,
        entry.site_tag,
        entry.phase,
        entry.step_id,
        entry.decision_type,
        entry.requested_item,
        entry.selected_path,
        JSON.stringify(entry.alternatives_considered),
        entry.reason,
        entry.agent,
        entry.tool,
        entry.provider,
        entry.model,
        entry.cost_type,
        entry.prompt_hash,
        entry.prompt_template_version,
        entry.input_tokens_estimated,
        entry.output_tokens_estimated,
        entry.input_tokens_actual,
        entry.output_tokens_actual,
        entry.cost_usd_actual,
        entry.duration_ms,
        entry.status,
        entry.quality_score,
        JSON.stringify(entry.verification_refs),
        JSON.stringify(entry.created_jobs),
        JSON.stringify(entry.gaps),
        entry.error,
        entry.created_at
      );
    }
  } catch (err) {
    console.error('[build-trace] Failed to insert into SQLite:', err.message);
  }

  return entry;
}

/**
 * Read trace events for a run from the JSONL log.
 * @param {string} siteTag
 * @param {string} runId
 * @param {string} hubRoot
 * @returns {object[]}
 */
function getRunTrace(siteTag, runId, hubRoot) {
  if (!hubRoot || !siteTag) return [];
  try {
    const tracePath = path.join(hubRoot, 'sites', siteTag, 'build-trace.jsonl');
    if (!fs.existsSync(tracePath)) return [];
    return fs.readFileSync(tracePath, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(l => { try { return JSON.parse(l); } catch { return null; } })
      .filter(e => e && (!runId || e.run_id === runId));
  } catch {
    return [];
  }
}

/**
 * Query trace events from SQLite.
 * @param {object} opts — { runId, siteTag, phase, status, limit }
 * @returns {object[]}
 */
function queryTraceEvents({ runId, siteTag, phase, status, limit = 100 } = {}) {
  try {
    const db = _getDb();
    if (!db) return [];
    let q = 'SELECT * FROM trace_events';
    const params = [];
    const wheres = [];
    if (runId)   { wheres.push('run_id = ?');   params.push(runId); }
    if (siteTag) { wheres.push('site_tag = ?'); params.push(siteTag); }
    if (phase)   { wheres.push('phase = ?');    params.push(phase); }
    if (status)  { wheres.push('status = ?');   params.push(status); }
    if (wheres.length) q += ' WHERE ' + wheres.join(' AND ');
    q += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    return db.getDb().prepare(q).all(...params).map(row => ({
      ...row,
      alternatives_considered: row.alternatives_considered ? JSON.parse(row.alternatives_considered) : [],
      verification_refs:       row.verification_refs       ? JSON.parse(row.verification_refs)       : [],
      created_jobs:            row.created_jobs            ? JSON.parse(row.created_jobs)            : [],
      gaps:                    row.gaps                    ? JSON.parse(row.gaps)                    : [],
    }));
  } catch {
    return [];
  }
}

module.exports = { logTrace, getRunTrace, queryTraceEvents };
