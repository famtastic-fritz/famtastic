// site-studio/server/site-settings-routes.js
//
// Phase 2 Lane D2 — Per-site overrides REST router.
// Mounted at /api/site-settings in server.js (+1 line).
//
// Routes:
//   GET    /api/site-settings?tag=<tag>  — read overrides (empty skeleton if file absent)
//   PUT    /api/site-settings?tag=<tag>  — write overrides atomically (tmp+rename)
//   DELETE /api/site-settings?tag=<tag>  — delete overrides file (reset to platform)
//
// Safety:
//   - tag validated with isSafeTag (path-traversal protection)
//   - PUT body capped at 8kb
//   - PUT uses tmp file + rename for atomicity
//   - PUT returns 404 if site dir does not exist (won't create phantom dirs)
//   - All values validated against ALLOWED_VALUES allowlist

'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const { isSafeTag } = require('./intelligence-reader');
const schema = require('./site-settings-schema');

function createSiteSettingsRouter(sitesRoot) {
  const router = express.Router();

  function pathFor(tag) {
    return path.join(sitesRoot, tag, 'site-settings.json');
  }

  // GET /api/site-settings?tag=<tag>
  // Returns the per-site overrides file, or an empty skeleton if it doesn't exist yet.
  router.get('/', (req, res) => {
    const tag = req.query.tag;
    if (!tag || !isSafeTag(tag)) {
      return res.status(400).json({ error: 'invalid_or_missing_tag' });
    }
    const file = pathFor(tag);
    if (!fs.existsSync(file)) {
      return res.json(schema.emptyOverrides(tag));
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      return res.json(parsed);
    } catch (_e) {
      return res.status(500).json({ error: 'parse_failed' });
    }
  });

  // PUT /api/site-settings?tag=<tag>
  // Body: { overrides: { <key>: <value|null>, ... } }
  // Validates, then atomically writes to sites/<tag>/site-settings.json via tmp+rename.
  router.put('/', express.json({ limit: '8kb' }), (req, res) => {
    const tag = req.query.tag;
    if (!tag || !isSafeTag(tag)) {
      return res.status(400).json({ error: 'invalid_or_missing_tag' });
    }

    const body = req.body || {};
    // Enforce schema_version, site_tag, and updated_at server-side.
    body.schema_version = schema.SCHEMA_VERSION;
    body.site_tag = tag;
    body.updated_at = new Date().toISOString();

    const v = schema.validate(body, tag);
    if (!v.valid) {
      return res.status(400).json({ error: 'validation_failed', errors: v.errors });
    }

    const dir = path.dirname(pathFor(tag));
    if (!fs.existsSync(dir)) {
      return res.status(404).json({ error: 'site_dir_not_found' });
    }

    const file = pathFor(tag);
    const tmp = file + '.tmp';
    try {
      fs.writeFileSync(tmp, JSON.stringify(body, null, 2));
      fs.renameSync(tmp, file);
    } catch (err) {
      // Clean up orphaned tmp if rename failed.
      try { fs.unlinkSync(tmp); } catch (_) {}
      return res.status(500).json({ error: 'write_failed', detail: err.message });
    }

    return res.json({ ok: true, file, body });
  });

  // DELETE /api/site-settings?tag=<tag>
  // Removes the overrides file, effectively resetting to platform defaults.
  router.delete('/', (req, res) => {
    const tag = req.query.tag;
    if (!tag || !isSafeTag(tag)) {
      return res.status(400).json({ error: 'invalid_or_missing_tag' });
    }
    const file = pathFor(tag);
    if (!fs.existsSync(file)) {
      return res.json({ ok: true, deleted: false, note: 'no overrides file existed' });
    }
    try {
      fs.unlinkSync(file);
    } catch (err) {
      return res.status(500).json({ error: 'delete_failed', detail: err.message });
    }
    return res.json({ ok: true, deleted: true });
  });

  return router;
}

module.exports = { createSiteSettingsRouter };
