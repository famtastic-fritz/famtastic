// Lane C — Component routes
// Read-only Express surface that exposes the component inventory and the
// surgical insertion contract to the Operator Workspace.
//
// Phase 2 (Lane C2) adds:
//   POST /insert   — write a safe placeholder HTML to sites/<tag>/_test/inserts/
//   GET  /insertions?tag=  — list last 50 insertion history entries
//
// Mount line for orchestrator (Lane A applies, NOT this file):
//   app.use('/api/components', require('./server/component-routes').createComponentRouter());

'use strict';

const path = require('path');
const express = require('express');
const inventory = require('./component-inventory');
const { isSafeTag } = require('./intelligence-reader');

// Lazy-resolve sitesRoot at request time (same convention as intelligence-reader.js).
// The __dirname here is site-studio/server/, so ../.. gets us the repo root, then sites/.
function resolveSitesRoot() {
  return path.resolve(__dirname, '..', '..', 'sites');
}

// Tag validation: accept both prefixed ("site-foo") and bare tags ("mbsh-reunion")
// that appear in the legacy SITES list. We apply a strict allowlist regex in
// component-inventory.stagedInsert for containment; here we only reject obviously
// dangerous input (path traversal chars, empty).
const SAFE_TAG_LOOSE_RE = /^[a-z0-9][a-z0-9_-]{0,80}$/i;
const SAFE_COMPONENT_ID_RE = /^[a-z0-9][a-z0-9_-]{0,64}$/;
const SAFE_SLOT_PAGE_RE = /^[a-zA-Z0-9._-]{1,64}$/;

function createComponentRouter() {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.json({ components: inventory.listInventory() });
  });

  router.get('/check', (req, res) => {
    const id = typeof req.query.id === 'string' ? req.query.id : '';
    const result = inventory.checkExisting({ id });
    res.json(result);
  });

  router.get('/contract', (req, res) => {
    res.json({ contract: inventory.SURGICAL_INSERTION_CONTRACT });
  });

  // -------------------------------------------------------------------------
  // POST /insert — sandboxed staging write (Phase 2, Lane C2)
  // -------------------------------------------------------------------------
  router.post('/insert', (req, res) => {
    const { tag, component_id, slot, page } = req.body || {};

    // --- Validate all four fields ---
    const errors = [];

    if (typeof tag !== 'string' || !SAFE_TAG_LOOSE_RE.test(tag) || tag.includes('..')) {
      errors.push('tag: must be a safe alphanumeric site identifier');
    }
    if (typeof component_id !== 'string' || !SAFE_COMPONENT_ID_RE.test(component_id) || component_id.includes('..')) {
      errors.push('component_id: must match /^[a-z0-9][a-z0-9_-]{0,64}$/');
    }
    if (typeof slot !== 'string' || !SAFE_SLOT_PAGE_RE.test(slot) || slot.includes('..')) {
      errors.push('slot: must match /^[a-zA-Z0-9._-]{1,64}$/');
    }
    if (typeof page !== 'string' || !SAFE_SLOT_PAGE_RE.test(page) || page.includes('..')) {
      errors.push('page: must match /^[a-zA-Z0-9._-]{1,64}$/');
    }

    if (errors.length) {
      return res.status(400).json({ ok: false, errors });
    }

    // --- Component id must exist in inventory ---
    const check = inventory.checkExisting({ id: component_id });
    if (!check.exists) {
      return res.status(400).json({
        ok: false,
        errors: [`component_id "${component_id}" not found in inventory`],
        near: check.near || null,
      });
    }

    // --- Write sandbox fragment + history entry ---
    const sitesRoot = resolveSitesRoot();
    const result = inventory.stagedInsert({ sitesRoot, tag, componentId: component_id, slot, page });

    if (!result.ok) {
      return res.status(500).json({ ok: false, error: result.error });
    }

    return res.json({
      ok: true,
      written: result.written,
      history_path: `${tag}/_test/insertion-history.jsonl`,
      history_entry: result.history_entry,
    });
  });

  // -------------------------------------------------------------------------
  // GET /insertions?tag= — list insertion history (Phase 2, Lane C2)
  // -------------------------------------------------------------------------
  router.get('/insertions', (req, res) => {
    const tag = typeof req.query.tag === 'string' ? req.query.tag : '';

    if (!SAFE_TAG_LOOSE_RE.test(tag) || tag.includes('..')) {
      return res.status(400).json({ ok: false, errors: ['tag: invalid'] });
    }

    const sitesRoot = resolveSitesRoot();
    const insertions = inventory.listInsertions({ sitesRoot, tag });
    return res.json({ insertions });
  });

  return router;
}

module.exports = { createComponentRouter };
