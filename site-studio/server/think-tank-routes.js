// site-studio/server/think-tank-routes.js
//
// Lane D — Think-Tank modular router.
// Mounted at /api/think-tank. Read-only access to the live capture inbox at
// <repoRoot>/captures/inbox/*.capture.json. Honest empty-state when the dir
// is missing or empty.
//
// Routes:
//   GET /api/think-tank/captures   — list captures (id, title, captured_at, source_path)
//   GET /api/think-tank/contract   — capture-shape contract + promotion targets
//
// Path-traversal protection:
//   - filenames must match /^[a-zA-Z0-9._-]+\.capture\.json$/ (allowlist)
//   - resolved file path must start with the canonical inbox directory
//   - parse failures are skipped (fail-soft); response is capped at 50 entries

'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');

const INBOX_SUBDIR = 'captures/inbox';
const SAFE_NAME = /^[a-zA-Z0-9._-]+\.capture\.json$/;
const MAX_ENTRIES = 50;
const MAX_READ_BYTES = 256 * 1024;

const PROMOTION_TARGETS = ['research', 'sites', 'components', 'media'];

const CAPTURE_SHAPE = {
  schema_version: 'string (e.g. "0.2.0")',
  capture_id: 'string · required',
  created_at: 'ISO timestamp · required',
  source: {
    surface: 'string',
    session_id: 'string | null',
    adapter: 'string',
    adapter_version: 'string',
    input_path: 'string',
  },
  summary: 'string',
  extracted: 'array of { extract_id, type, text, rationale, evidence[], facets[], confidence }',
};

function readJsonCapped(filePath, maxBytes) {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return null;
    if (stat.size > maxBytes) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function createThinkTankRouter(repoRoot) {
  if (!repoRoot || typeof repoRoot !== 'string') {
    throw new Error('repoRoot string required');
  }
  const inboxDir = path.resolve(repoRoot, INBOX_SUBDIR);
  const router = express.Router();

  router.get('/captures', (req, res) => {
    if (!fs.existsSync(inboxDir)) {
      return res.json({ captures: [] });
    }
    let entries;
    try {
      entries = fs.readdirSync(inboxDir, { withFileTypes: true });
    } catch (err) {
      console.warn('[think-tank-routes] readdir_failed', { dir: inboxDir, error: err.message });
      return res.json({ captures: [] });
    }
    const captures = [];
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!SAFE_NAME.test(entry.name)) continue;
      const full = path.resolve(inboxDir, entry.name);
      if (!full.startsWith(inboxDir + path.sep)) continue;
      const data = readJsonCapped(full, MAX_READ_BYTES);
      if (!data || typeof data !== 'object') continue;
      const id = (typeof data.capture_id === 'string' && data.capture_id)
        || entry.name.replace(/\.capture\.json$/, '');
      const title = (typeof data.title === 'string' && data.title)
        || (typeof data.summary === 'string' && data.summary)
        || id;
      const captured_at = (typeof data.created_at === 'string' && data.created_at)
        || (typeof data.captured_at === 'string' && data.captured_at)
        || null;
      captures.push({
        id,
        title,
        captured_at,
        source_path: path.posix.join(INBOX_SUBDIR, entry.name),
      });
      if (captures.length >= MAX_ENTRIES) break;
    }
    captures.sort((a, b) => {
      const da = a.captured_at || '';
      const db = b.captured_at || '';
      return db.localeCompare(da);
    });
    res.json({ captures });
  });

  router.get('/contract', (req, res) => {
    res.json({
      contract: {
        capture_shape: CAPTURE_SHAPE,
        promotion_targets: PROMOTION_TARGETS,
      },
    });
  });

  return router;
}

module.exports = { createThinkTankRouter };
