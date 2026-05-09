// site-studio/server/intelligence-routes.js
//
// Slice 3 routes. Read-only Express router mounted at /api/intelligence.
// Static path prefixes only — must register before /api/:param routes
// (FAMtastic standing rule on route registration order).
//
// Routes:
//   GET /api/intelligence/brief
//   GET /api/intelligence/capability-truth
//   GET /api/intelligence/runs
//   GET /api/intelligence/runs/:runId
//
// The active site directory is supplied by the caller via the
// resolveSiteDir() function passed to createIntelligenceRouter(). This
// keeps the route module decoupled from server.js's TAG closure while
// still honoring the "use TAG, never process.env.SITE_TAG" standing rule.

'use strict';

const express = require('express');
const reader = require('./intelligence-reader');

function createIntelligenceRouter(resolveSiteDir) {
  if (typeof resolveSiteDir !== 'function') {
    throw new Error('resolveSiteDir(req) function required');
  }
  const router = express.Router();

  router.get('/brief', (req, res) => {
    const brief = reader.readBrief(resolveSiteDir(req));
    if (!brief) return res.status(404).json({ error: 'intelligence_brief_not_found' });
    res.json(brief);
  });

  router.get('/capability-truth', (req, res) => {
    const truth = reader.readCapabilityTruth(resolveSiteDir(req));
    if (!truth) return res.status(404).json({ error: 'capability_truth_not_found' });
    res.json(truth);
  });

  router.get('/runs', (req, res) => {
    res.json({ runs: reader.listRuns(resolveSiteDir(req)) });
  });

  router.get('/runs/:runId', (req, res) => {
    const siteDir = resolveSiteDir(req);
    const { runId } = req.params;
    if (!reader.isSafeId(runId)) return res.status(400).json({ error: 'invalid_run_id' });
    const ledger = reader.readRunLedger(siteDir, runId);
    if (!ledger) return res.status(404).json({ error: 'run_not_found' });
    const proof = reader.readProofPacket(siteDir, runId);
    const learning = reader.readLearningCandidates(siteDir, runId);
    res.json({ ledger, proof, learning_candidates: learning });
  });

  return router;
}

module.exports = { createIntelligenceRouter };
