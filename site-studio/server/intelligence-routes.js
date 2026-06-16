// site-studio/server/intelligence-routes.js
//
// Slice 3 routes (Operator Workspace extension). Read-only Express router
// mounted at /api/intelligence. Static path prefixes only — must register
// before /api/:param routes (FAMtastic standing rule on route order).
//
// Routes:
//   GET /api/intelligence/sites
//   GET /api/intelligence/brief                   (?tag= overrides)
//   GET /api/intelligence/capability-truth        (?tag= overrides)
//   GET /api/intelligence/runs                    (?tag= overrides)
//   GET /api/intelligence/runs/:runId             (?tag= overrides)
//
// The active site directory comes from a caller-supplied resolveSiteDir()
// closure that knows about the runtime TAG. When ?tag= is present and
// passes the safe-tag regex, the router resolves to that site's dir under
// the same SITES_ROOT instead. This lets the Operator Workspace switch
// targets without mutating server-side TAG.

'use strict';

const path = require('path');
const express = require('express');
const reader = require('./intelligence-reader');

function createIntelligenceRouter(resolveSiteDir, sitesRoot) {
  if (typeof resolveSiteDir !== 'function') {
    throw new Error('resolveSiteDir(req) function required');
  }

  function siteDirFor(req) {
    const tag = req && req.query && req.query.tag;
    if (tag && reader.isSafeTag(tag) && sitesRoot) {
      const candidate = path.join(sitesRoot, tag);
      return candidate;
    }
    return resolveSiteDir(req);
  }

  const router = express.Router();

  router.get('/sites', (req, res) => {
    if (!sitesRoot) return res.json({ sites: [] });
    res.json({ sites: reader.listSites(sitesRoot) });
  });

  router.get('/brief', (req, res) => {
    const brief = reader.readBrief(siteDirFor(req));
    if (!brief) return res.status(404).json({ error: 'intelligence_brief_not_found' });
    res.json(brief);
  });

  router.get('/capability-truth', (req, res) => {
    const truth = reader.readCapabilityTruth(siteDirFor(req));
    if (!truth) return res.status(404).json({ error: 'capability_truth_not_found' });
    res.json(truth);
  });

  router.get('/runs', (req, res) => {
    res.json({ runs: reader.listRuns(siteDirFor(req)) });
  });

  router.get('/runs/:runId', (req, res) => {
    const siteDir = siteDirFor(req);
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
