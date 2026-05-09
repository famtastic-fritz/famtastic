// site-studio/server/intelligence-actions.js
//
// Lane B — Action Layer. Express router exposing safe, validated POST
// endpoints around intelligence-writer.js. Mounted at
//   /api/intelligence/actions
// by the orchestrator. Site is resolved from req.query.tag (validated
// via isSafeTag); falls back to the default siteDir from resolveSiteDir().
//
// Validation rules (every route):
//   - runId must satisfy isSafeId
//   - JSON payload size capped at 64KB (413 if exceeded)
//   - unknown verdict/status -> 400
//   - path traversal anywhere -> 400
//   - cost cumulative >= $25 requires { confirm: true } -> 428 otherwise
//
// All writes funnel through intelligence-writer (atomic).

'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const writer = require('./intelligence-writer');
const reader = require('./intelligence-reader');

const PAYLOAD_LIMIT_BYTES = 64 * 1024;
const COST_CONFIRM_THRESHOLD_USD = 25;
const VERDICT_ENUM = new Set(['pass', 'fail', 'blocked', 'parked']);

function hasTraversal(value) {
  if (value == null) return false;
  if (typeof value === 'string') return value.includes('..') || value.includes('\0');
  if (Array.isArray(value)) return value.some(hasTraversal);
  if (typeof value === 'object') return Object.values(value).some(hasTraversal);
  return false;
}

function resolveSiteDirFromReq(req, resolveSiteDir, sitesRoot) {
  const tag = req.query && req.query.tag;
  if (tag !== undefined) {
    if (!reader.isSafeTag(tag)) {
      return { error: { status: 400, body: { error: 'invalid_tag' } } };
    }
    if (sitesRoot) {
      return { siteDir: path.join(sitesRoot, tag) };
    }
  }
  try {
    const fallback = resolveSiteDir && resolveSiteDir();
    if (!fallback) return { error: { status: 400, body: { error: 'no_site' } } };
    return { siteDir: fallback };
  } catch (_) {
    return { error: { status: 400, body: { error: 'no_site' } } };
  }
}

function withRunIdGuard(handler) {
  return (req, res) => {
    const runId = req.params.runId;
    if (!reader.isSafeId(runId)) {
      return res.status(400).json({ error: 'invalid_run_id' });
    }
    if (hasTraversal(req.body)) {
      return res.status(400).json({ error: 'path_traversal_rejected' });
    }
    return handler(req, res, runId);
  };
}

function mapWriterError(err) {
  const msg = err && err.message ? err.message : String(err);
  if (msg === 'run already exists') return { status: 409, body: { error: 'already_exists' } };
  if (msg === 'run not found') return { status: 404, body: { error: 'run_not_found' } };
  if (msg.startsWith('invalid run_id')) return { status: 400, body: { error: 'invalid_run_id' } };
  if (msg.startsWith('invalid status')) return { status: 400, body: { error: 'invalid_status' } };
  if (msg.startsWith('invalid verdict')) return { status: 400, body: { error: 'invalid_verdict' } };
  if (msg.startsWith('cost cannot be negative')) return { status: 400, body: { error: 'invalid_cost' } };
  if (msg.includes('required')) return { status: 400, body: { error: msg } };
  if (msg.startsWith('run is terminal')) return { status: 409, body: { error: 'run_terminal' } };
  return { status: 500, body: { error: 'writer_failed', detail: msg } };
}

function createActionsRouter(resolveSiteDir, sitesRoot) {
  const router = express.Router();

  // Capped JSON body parser
  router.use(express.json({ limit: PAYLOAD_LIMIT_BYTES }));
  router.use((err, req, res, next) => {
    if (err && (err.type === 'entity.too.large' || err.status === 413)) {
      return res.status(413).json({ error: 'payload_too_large' });
    }
    if (err && err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'invalid_json' });
    }
    return next(err);
  });

  function siteDirOr(req, res) {
    const r = resolveSiteDirFromReq(req, resolveSiteDir, sitesRoot);
    if (r.error) {
      res.status(r.error.status).json(r.error.body);
      return null;
    }
    return r.siteDir;
  }

  // POST /runs/start
  router.post('/runs/start', (req, res) => {
    const body = req.body || {};
    if (hasTraversal(body)) return res.status(400).json({ error: 'path_traversal_rejected' });
    const { run_id, intent, recipe_id, brief } = body;
    if (!reader.isSafeId(run_id)) return res.status(400).json({ error: 'invalid_run_id' });
    const siteDir = siteDirOr(req, res); if (!siteDir) return;
    try {
      const ledger = writer.startRun(siteDir, {
        runId: run_id,
        intent: intent || null,
        recipeId: recipe_id || null,
        brief: brief || null,
      });
      return res.status(201).json({ ledger });
    } catch (err) {
      const m = mapWriterError(err);
      return res.status(m.status).json(m.body);
    }
  });

  // POST /runs/:runId/passes
  router.post('/runs/:runId/passes', withRunIdGuard((req, res, runId) => {
    const siteDir = siteDirOr(req, res); if (!siteDir) return;
    const { label, ok, notes } = req.body || {};
    if (typeof label !== 'string' || !label.trim()) {
      return res.status(400).json({ error: 'label_required' });
    }
    try {
      const ledger = writer.appendLedgerPass(siteDir, runId, {
        label: label.trim(),
        ok: ok !== false,
        notes: typeof notes === 'string' ? notes : null,
      });
      return res.status(200).json({ ledger });
    } catch (err) {
      const m = mapWriterError(err);
      return res.status(m.status).json(m.body);
    }
  }));

  // POST /runs/:runId/cost
  router.post('/runs/:runId/cost', withRunIdGuard((req, res, runId) => {
    const siteDir = siteDirOr(req, res); if (!siteDir) return;
    const { usd, tokens, provider, confirm } = req.body || {};
    if (typeof usd !== 'number' || !isFinite(usd) || usd < 0) {
      return res.status(400).json({ error: 'invalid_usd' });
    }
    if (tokens !== undefined && (typeof tokens !== 'number' || !isFinite(tokens) || tokens < 0)) {
      return res.status(400).json({ error: 'invalid_tokens' });
    }
    // Read-before-write to enforce confirm gate
    let current = null;
    try { current = reader.readRunLedger(siteDir, runId); } catch (_) {}
    if (!current) return res.status(404).json({ error: 'run_not_found' });
    const projected = (current.cost && current.cost.usd ? Number(current.cost.usd) : 0) + Number(usd);
    if (projected >= COST_CONFIRM_THRESHOLD_USD && confirm !== true) {
      return res.status(428).json({
        error: 'confirmation_required',
        threshold_usd: COST_CONFIRM_THRESHOLD_USD,
        projected_usd: Number(projected.toFixed(4)),
      });
    }
    try {
      const ledger = writer.recordCost(siteDir, runId, {
        usd,
        tokens: tokens || 0,
        provider: provider || 'unknown',
      });
      return res.status(200).json({ ledger });
    } catch (err) {
      const m = mapWriterError(err);
      return res.status(m.status).json(m.body);
    }
  }));

  // POST /runs/:runId/blockers
  router.post('/runs/:runId/blockers', withRunIdGuard((req, res, runId) => {
    const siteDir = siteDirOr(req, res); if (!siteDir) return;
    const body = req.body || {};
    if (typeof body.kind !== 'string' || !body.kind.trim()) {
      return res.status(400).json({ error: 'kind_required' });
    }
    try {
      const ledger = writer.recordBlocker(siteDir, runId, { ...body, kind: body.kind.trim() });
      return res.status(200).json({ ledger });
    } catch (err) {
      const m = mapWriterError(err);
      return res.status(m.status).json(m.body);
    }
  }));

  // POST /runs/:runId/non-blockers
  router.post('/runs/:runId/non-blockers', withRunIdGuard((req, res, runId) => {
    const siteDir = siteDirOr(req, res); if (!siteDir) return;
    const { kind, note } = req.body || {};
    if (typeof note !== 'string' || !note.trim()) {
      return res.status(400).json({ error: 'note_required' });
    }
    try {
      const ledger = writer.recordNonBlocker(siteDir, runId, {
        kind: typeof kind === 'string' && kind.trim() ? kind.trim() : 'observation',
        note: note.trim(),
      });
      return res.status(200).json({ ledger });
    } catch (err) {
      const m = mapWriterError(err);
      return res.status(m.status).json(m.body);
    }
  }));

  // POST /runs/:runId/proof
  router.post('/runs/:runId/proof', withRunIdGuard((req, res, runId) => {
    const siteDir = siteDirOr(req, res); if (!siteDir) return;
    const { pass_id, proofs, blockers, non_blockers } = req.body || {};
    if (!Array.isArray(proofs)) return res.status(400).json({ error: 'proofs_must_be_array' });
    try {
      const packet = writer.attachProofPacket(siteDir, runId, {
        pass_id: pass_id || null,
        proofs,
        blockers: Array.isArray(blockers) ? blockers : [],
        non_blockers: Array.isArray(non_blockers) ? non_blockers : [],
      });
      return res.status(200).json({ proof_packet: packet });
    } catch (err) {
      const m = mapWriterError(err);
      return res.status(m.status).json(m.body);
    }
  }));

  // POST /runs/:runId/learning
  router.post('/runs/:runId/learning', withRunIdGuard((req, res, runId) => {
    const siteDir = siteDirOr(req, res); if (!siteDir) return;
    const { id, kind, summary, evidence, promote_target } = req.body || {};
    if (typeof summary !== 'string' || !summary.trim()) {
      return res.status(400).json({ error: 'summary_required' });
    }
    try {
      const out = writer.addLearningCandidate(siteDir, runId, {
        id: typeof id === 'string' ? id : undefined,
        kind: typeof kind === 'string' ? kind : 'observation',
        summary: summary.trim(),
        evidence: Array.isArray(evidence) ? evidence : [],
        promote_target: typeof promote_target === 'string' ? promote_target : null,
      });
      return res.status(200).json({ learning_candidates: out });
    } catch (err) {
      const m = mapWriterError(err);
      return res.status(m.status).json(m.body);
    }
  }));

  // POST /runs/:runId/next-action
  router.post('/runs/:runId/next-action', withRunIdGuard((req, res, runId) => {
    const siteDir = siteDirOr(req, res); if (!siteDir) return;
    const { action } = req.body || {};
    if (typeof action !== 'string' || !action.trim()) {
      return res.status(400).json({ error: 'action_required' });
    }
    try {
      const ledger = writer.setNextAction(siteDir, runId, action);
      return res.status(200).json({ ledger });
    } catch (err) {
      const m = mapWriterError(err);
      return res.status(m.status).json(m.body);
    }
  }));

  // POST /runs/:runId/finalize
  router.post('/runs/:runId/finalize', withRunIdGuard((req, res, runId) => {
    const siteDir = siteDirOr(req, res); if (!siteDir) return;
    const { verdict } = req.body || {};
    if (typeof verdict !== 'string' || !VERDICT_ENUM.has(verdict)) {
      return res.status(400).json({ error: 'invalid_verdict' });
    }
    try {
      const ledger = writer.finalizeRun(siteDir, runId, verdict);
      return res.status(200).json({ ledger });
    } catch (err) {
      const m = mapWriterError(err);
      return res.status(m.status).json(m.body);
    }
  }));

  return router;
}

module.exports = { createActionsRouter, COST_CONFIRM_THRESHOLD_USD, PAYLOAD_LIMIT_BYTES };
