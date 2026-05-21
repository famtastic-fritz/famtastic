/**
 * site-studio/lib/ops-api.js
 *
 * Express router for the Ops Workspace MVP.
 *
 *   GET  /api/ops/jobs         seven-lane snapshot of jobs
 *   GET  /api/ops/runs         runs ledger
 *   GET  /api/ops/tasks        tasks ledger
 *   GET  /api/ops/plans        plans (from registry)
 *   GET  /api/ops/proofs       proof ledger
 *   GET  /api/ops/gaps         gaps ledger (may be empty)
 *   GET  /api/ops/memory       memory placeholder (cerebrum + memory/*)
 *   GET  /api/ops/reviews      reviews ledger (may be empty)
 *   GET  /api/ops/debt         latest inventory snapshot
 *   GET  /api/ops/needsMe      open reviews needing human action
 *   POST /api/ops/command/:action   destructive gate
 *
 * Every GET response wraps data:
 *   { snapshot_version, generated_at, source_ledgers[], record_count, data }
 *
 * Destructive actions (purge, cancel, archive, promote, migrate) require a
 * governance approval token; in MVP the gate refuses with 403 unless token
 * matches plans/registry.json governance.hard_stop_conditions. Token issuance
 * is deferred — see docs/ops/state-contract.md.
 *
 * WebSocket /ws/ops is intentionally NOT in MVP — Jobs tab polls this router
 * every 5 s. The reconcile contract is documented in the state-contract.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const { deriveFreshness, isLive } = require('./ops-freshness');

const ROOT = path.resolve(__dirname, '..', '..');

const DESTRUCTIVE_ACTIONS = new Set([
  'purge', 'cancel', 'archive', 'promote', 'migrate',
]);

const NON_DESTRUCTIVE_ACTIONS = new Set([
  'approve', 'reroute', 'park', 'retry',
]);

function readJsonl(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return [];
  const out = [];
  const text = fs.readFileSync(abs, 'utf8');
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    try { out.push(JSON.parse(t)); } catch (_) { /* skip */ }
  }
  return out;
}

function ageSeconds(record, fields) {
  for (const f of fields) {
    if (record[f]) {
      const t = Date.parse(record[f]);
      if (!Number.isNaN(t)) return Math.max(0, Math.floor((Date.now() - t) / 1000));
    }
  }
  return Number.MAX_SAFE_INTEGER;
}

function envelope(data, sourceLedgers) {
  const generatedAt = new Date().toISOString();
  return {
    snapshot_version: `ops-${generatedAt}`,
    generated_at: generatedAt,
    source_ledgers: sourceLedgers,
    record_count: Array.isArray(data) ? data.length : (data?.record_count ?? 0),
    data,
  };
}

function attachFreshness(records, recordType, ageFields) {
  return records.map((r) => {
    const age = ageSeconds(r, ageFields);
    const freshness = deriveFreshness(recordType, r.status || 'unknown', age);
    return Object.assign({}, r, { _freshness: freshness, _age_seconds: age });
  });
}

function loadInventory() {
  const dir = path.join(ROOT, 'docs', 'ops');
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir)
    .filter(n => /^inventory-\d{4}-\d{2}-\d{2}\.json$/.test(n))
    .sort();
  if (!files.length) return null;
  const latest = files[files.length - 1];
  try {
    return { file: `docs/ops/${latest}`, snapshot: JSON.parse(fs.readFileSync(path.join(dir, latest), 'utf8')) };
  } catch (_) { return null; }
}

/**
 * Destructive-action governance gate. Returns { allowed, reason, hard_stops }.
 * MVP behavior: never allow without token. Token issuance deferred.
 */
function checkGovernance(action, req) {
  const registryPath = path.join(ROOT, 'plans', 'registry.json');
  let hardStops = [];
  try {
    const reg = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    hardStops = reg.governance?.hard_stop_conditions || [];
  } catch (_) { /* ignore */ }
  const token = req.get('x-ops-governance-token') || req.body?.governance_token;
  if (!token) {
    return { allowed: false, reason: 'governance_token_required', hard_stops: hardStops };
  }
  // MVP: token issuance deferred — accept only the explicit dev-bypass token
  // documented in docs/ops/state-contract.md. Real issuance comes later.
  if (token !== 'OPS_DEV_BYPASS_DO_NOT_SHIP') {
    return { allowed: false, reason: 'governance_token_invalid', hard_stops: hardStops };
  }
  return { allowed: true, reason: 'dev_bypass', hard_stops: hardStops };
}

/**
 * Cross-link integrity helper. Used by promote-to-task; either both sides
 * succeed or the operation throws (atomic at the function level — caller
 * must persist atomically).
 */
function buildCrossLink({ jobRecord, taskRecord }) {
  if (!jobRecord || !taskRecord) {
    throw new Error('cross_link_requires_both_records');
  }
  if (!jobRecord.id && !jobRecord.job_id) throw new Error('job_record_missing_id');
  if (!taskRecord.task_id) throw new Error('task_record_missing_task_id');
  const jobId = jobRecord.id || jobRecord.job_id;
  return {
    job: Object.assign({}, jobRecord, { promoted_to_task_id: taskRecord.task_id }),
    task: Object.assign({}, taskRecord, { origin_job_id: jobId, promoted_from: 'job' }),
  };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

function createRouter() {
  const router = express.Router();

  // Static, non-parameterized routes registered FIRST. The single
  // parameterized route is /command/:action and lives at the end.

  router.get('/jobs', (req, res) => {
    const jobs = attachFreshness(
      readJsonl('jobs/jobs.jsonl'),
      'job',
      ['updated_at', 'queued_at', 'created_at', 'at'],
    );
    // Lane mapping: status → UI lane name. 'Approving' is a UI label for the
    // existing 'approved' status — not a new stored state.
    const LANE_BY_STATUS = {
      pending: 'queued',
      approved: 'approving',
      running: 'running',
      blocked: 'blocked',
      done: 'done',
      failed: 'failed',
      parked: 'parked',
    };
    const lanes = { queued: [], approving: [], running: [], blocked: [], done: [], failed: [], parked: [] };
    for (const j of jobs) {
      const lane = LANE_BY_STATUS[j.status] || null;
      if (lane) lanes[lane].push(j);
    }
    // Stale debt: legacy queue + any job whose freshness is stale|parked|archived
    const inventory = loadInventory();
    const legacyCount = inventory?.snapshot?.sources?.legacy_queue?.count || 0;
    res.json(envelope({
      lanes,
      lane_counts: Object.fromEntries(Object.entries(lanes).map(([k, v]) => [k, v.length])),
      stale_debt: {
        legacy_queue_count: legacyCount,
        stale_job_count: jobs.filter(j => j._freshness === 'stale' || j._freshness === 'archived').length,
        parked_job_count: jobs.filter(j => j._freshness === 'parked').length,
        inventory_file: inventory?.file || null,
      },
    }, ['jobs/jobs.jsonl', inventory?.file].filter(Boolean)));
  });

  router.get('/runs', (req, res) => {
    const runs = attachFreshness(readJsonl('runs/runs.jsonl'), 'run', ['updated_at', 'started_at']);
    res.json(envelope(runs, ['runs/runs.jsonl']));
  });

  router.get('/tasks', (req, res) => {
    const tasks = attachFreshness(readJsonl('tasks/tasks.jsonl'), 'task', ['updated_at', 'created_at']);
    res.json(envelope(tasks, ['tasks/tasks.jsonl']));
  });

  router.get('/plans', (req, res) => {
    let plans = [];
    const reg = path.join(ROOT, 'plans', 'registry.json');
    if (fs.existsSync(reg)) {
      try {
        const json = JSON.parse(fs.readFileSync(reg, 'utf8'));
        plans = Array.isArray(json.plans) ? json.plans : [];
      } catch (_) { /* ignore */ }
    }
    plans = attachFreshness(plans, 'plan', ['updated_at', 'created_at']);
    res.json(envelope(plans, ['plans/registry.json']));
  });

  router.get('/proofs', (req, res) => {
    const proofs = attachFreshness(readJsonl('proofs/proof-ledger.jsonl'), 'proof', ['recorded_at']);
    res.json(envelope(proofs, ['proofs/proof-ledger.jsonl']));
  });

  router.get('/gaps', (req, res) => {
    const gaps = attachFreshness(readJsonl('docs/ops/gaps.jsonl'), 'gap', ['updated_at', 'logged_at', 'created_at']);
    res.json(envelope(gaps, ['docs/ops/gaps.jsonl']));
  });

  router.get('/memory', (req, res) => {
    // Stub: count memory files. Full Memory tab consumes lib/famtastic/memory/recall.js later.
    const memoryDir = path.join(ROOT, 'memory');
    let entries = [];
    if (fs.existsSync(memoryDir)) {
      entries = fs.readdirSync(memoryDir)
        .filter(n => n.endsWith('.md'))
        .map(name => ({ name, status: 'recorded' }));
    }
    res.json(envelope(entries, ['.wolf/cerebrum.md', 'memory/']));
  });

  router.get('/reviews', (req, res) => {
    const reviews = attachFreshness(readJsonl('reviews/reviews.jsonl'), 'review', ['updated_at', 'created_at']);
    res.json(envelope(reviews, ['reviews/reviews.jsonl']));
  });

  router.get('/debt', (req, res) => {
    const inventory = loadInventory();
    if (!inventory) {
      return res.json(envelope({ message: 'no inventory snapshot found — run scripts/ops/inventory.js' }, []));
    }
    res.json(envelope(inventory.snapshot, [inventory.file]));
  });

  router.get('/needsMe', (req, res) => {
    // Open reviews + tasks waiting on user
    const reviews = readJsonl('reviews/reviews.jsonl').filter(r => r.status === 'open' || r.status === 'pending');
    const tasks = readJsonl('tasks/tasks.jsonl').filter(t => t.status === 'waiting_on_me');
    res.json(envelope({ reviews, tasks, count: reviews.length + tasks.length }, ['reviews/reviews.jsonl', 'tasks/tasks.jsonl']));
  });

  // Destructive command gate — single parameterized route at end.
  router.post('/command/:action', express.json(), (req, res) => {
    const action = String(req.params.action || '').toLowerCase();
    if (!DESTRUCTIVE_ACTIONS.has(action) && !NON_DESTRUCTIVE_ACTIONS.has(action)) {
      return res.status(400).json({ error: 'unknown_action', action });
    }
    if (DESTRUCTIVE_ACTIONS.has(action)) {
      const gate = checkGovernance(action, req);
      if (!gate.allowed) {
        return res.status(403).json({
          error: gate.reason,
          action,
          hard_stops: gate.hard_stops,
          message: 'Destructive Ops actions require a governance approval token. Token issuance is deferred in MVP.',
        });
      }
    }
    // MVP: non-destructive actions log + acknowledge. Real handlers wire later.
    return res.json({
      ok: true,
      action,
      destructive: DESTRUCTIVE_ACTIONS.has(action),
      message: 'Action accepted (MVP stub — handler wiring pending).',
      received_at: new Date().toISOString(),
    });
  });

  return router;
}

module.exports = createRouter();
module.exports.createRouter = createRouter;
module.exports.DESTRUCTIVE_ACTIONS = DESTRUCTIVE_ACTIONS;
module.exports.NON_DESTRUCTIVE_ACTIONS = NON_DESTRUCTIVE_ACTIONS;
module.exports.checkGovernance = checkGovernance;
module.exports.buildCrossLink = buildCrossLink;
