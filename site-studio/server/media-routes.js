'use strict';

// Media Routes — Lane D (read-only V1 surface)
//
// createMediaRouter(resolveSiteDir, sitesRoot) returns an Express router
// exposing GET /api/media and GET /api/media/contract.

const express = require('express');
const path = require('path');
const { readRegistry, countByApproval, appendAsset, updateAsset, VALID_APPROVALS } = require('./media-registry');
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

  // POST /api/media/test-asset — append a local test asset (no provider calls).
  router.post('/test-asset', (req, res) => {
    const body = req.body || {};
    const { tag, asset: rawAsset } = body;

    // --- Resolve siteDir ---
    let siteDir = null;
    if (tag !== undefined && tag !== null) {
      if (typeof tag !== 'string' || !isSafeTag(tag)) {
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
      return res.status(400).json({ error: 'no site context (provide tag or select a site)' });
    }

    // --- Validate raw asset fields before merging defaults ---
    if (!rawAsset || typeof rawAsset !== 'object') {
      return res.status(400).json({ error: 'body.asset must be an object' });
    }

    const { id, slot, prompt, source, provider, notes, variants } = rawAsset;

    if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9_-]*$/.test(id)) {
      return res.status(400).json({ error: 'asset.id must match /^[a-z0-9][a-z0-9_-]*$/' });
    }
    if (id.length > 64) {
      return res.status(400).json({ error: 'asset.id must be 64 characters or fewer' });
    }
    if (typeof prompt !== 'string') {
      return res.status(400).json({ error: 'asset.prompt must be a string' });
    }
    if (prompt.length > 256) {
      return res.status(400).json({ error: 'asset.prompt must be 256 characters or fewer' });
    }
    if (!slot || typeof slot !== 'string') {
      return res.status(400).json({ error: 'asset.slot must be a non-empty string' });
    }

    // --- Build full asset, server-side defaults ---
    const asset = {
      id,
      asset_id: id,
      slot,
      prompt: prompt.slice(0, 256),
      notes: typeof notes === 'string' ? notes.slice(0, 512) : '',
      source: typeof source === 'string' ? source : 'upload',
      provider: typeof provider === 'string' ? provider : 'local-test',
      cost_usd: 0,
      variants: Array.isArray(variants) ? variants.slice(0, 20) : [],
      approval: 'draft',
      placement_pages: [],
      used_by: [],
      created_at: new Date().toISOString(),
    };

    // --- Write ---
    const result = appendAsset(siteDir, asset);
    if (!result.ok) {
      return res.status(400).json({ error: result.errors.join('; '), errors: result.errors });
    }
    return res.json({ ok: true, asset, summary: result.summary });
  });

  router.post('/asset/status', (req, res) => {
    const { tag, asset_id, approval, note } = req.body || {};
    if (typeof tag !== 'string' || !isSafeTag(tag)) {
      return res.status(400).json({ ok: false, error: 'invalid_tag' });
    }
    if (typeof asset_id !== 'string' || !asset_id.trim()) {
      return res.status(400).json({ ok: false, error: 'invalid_asset_id' });
    }
    if (!VALID_APPROVALS.includes(String(approval || ''))) {
      return res.status(400).json({ ok: false, error: 'invalid_approval' });
    }
    const siteDir = path.join(sitesRoot, tag);
    const result = updateAsset(siteDir, asset_id, (asset) => ({
      ...asset,
      approval,
      review_note: typeof note === 'string' ? note.slice(0, 300) : asset.review_note || '',
      updated_at: new Date().toISOString(),
    }));
    if (!result.ok) return res.status(400).json({ ok: false, errors: result.errors });
    return res.json({ ok: true, asset: result.asset, summary: result.summary });
  });

  router.post('/asset/assign', (req, res) => {
    const { tag, asset_id, target_type, component_id, page, slot, site_tag } = req.body || {};
    if (typeof tag !== 'string' || !isSafeTag(tag)) {
      return res.status(400).json({ ok: false, error: 'invalid_tag' });
    }
    if (typeof asset_id !== 'string' || !asset_id.trim()) {
      return res.status(400).json({ ok: false, error: 'invalid_asset_id' });
    }
    const assignment = {
      target: target_type === 'site-slot' ? 'site-slot' : 'component-slot',
      component_id: typeof component_id === 'string' ? component_id.slice(0, 96) : '',
      page: typeof page === 'string' ? page.slice(0, 96) : '',
      slot: typeof slot === 'string' ? slot.slice(0, 96) : '',
      site_tag: typeof site_tag === 'string' ? site_tag.slice(0, 96) : tag,
      assigned_at: new Date().toISOString(),
    };
    const siteDir = path.join(sitesRoot, tag);
    const result = updateAsset(siteDir, asset_id, (asset) => {
      const usedBy = Array.isArray(asset.used_by) ? asset.used_by.slice() : [];
      usedBy.push(assignment);
      return {
        ...asset,
        used_by: usedBy.slice(-20),
        placement_pages: Array.isArray(asset.placement_pages)
          ? asset.placement_pages.concat([{ page: assignment.page || 'index.html', component: assignment.component_id || assignment.slot || 'slot' }]).slice(-20)
          : [{ page: assignment.page || 'index.html', component: assignment.component_id || assignment.slot || 'slot' }],
        approval: asset.approval === 'approved' ? 'used' : asset.approval,
        updated_at: new Date().toISOString(),
      };
    });
    if (!result.ok) return res.status(400).json({ ok: false, errors: result.errors });
    return res.json({ ok: true, asset: result.asset, summary: result.summary, assignment });
  });

  return router;
}

module.exports = { createMediaRouter };
