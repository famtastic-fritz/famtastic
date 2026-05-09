'use strict';

// Media Routes — Lane D (read-only V1 surface)
//
// createMediaRouter(resolveSiteDir, sitesRoot) returns an Express router
// exposing GET /api/media and GET /api/media/contract.

const express = require('express');
const path = require('path');
const { readRegistry, countByApproval } = require('./media-registry');
const { isSafeTag } = require('./intelligence-reader');

function createMediaRouter(resolveSiteDir, sitesRoot) {
  const router = express.Router();

  router.get('/contract', (_req, res) => {
    res.json({
      contract: 'see source for asset shape',
      asset_shape: {
        id: 'string',
        slot: 'string',
        source: 'upload | import | generated | pipeline',
        provider: 'string',
        prompt: 'string',
        cost_usd: 'number >= 0',
        variants: 'array',
        approval: 'auto | pending | approved | deferred',
        placement_pages: 'array',
        created_at: 'string',
      },
    });
  });

  router.get('/', (req, res) => {
    const tag = typeof req.query.tag === 'string' ? req.query.tag : null;
    let siteDir = null;

    if (tag) {
      if (!isSafeTag(tag)) {
        return res.status(400).json({ error: 'invalid tag' });
      }
      siteDir = sitesRoot ? path.join(sitesRoot, tag) : null;
    } else if (typeof resolveSiteDir === 'function') {
      try {
        siteDir = resolveSiteDir();
      } catch (_err) {
        siteDir = null;
      }
    }

    if (!siteDir) {
      return res.status(400).json({ error: 'no site context (provide ?tag=site-…)' });
    }

    const registry = readRegistry(siteDir) || { version: 1, assets: [] };
    return res.json({ registry, summary: countByApproval(registry) });
  });

  return router;
}

module.exports = { createMediaRouter };
