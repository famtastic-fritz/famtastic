// site-studio/server/think-tank-routes.js
//
// Lane D — Think-Tank modular router.
// Mounted at /api/think-tank. Read-only access to the live capture inbox at
// <repoRoot>/captures/inbox/*.capture.json. Honest empty-state when the dir
// is missing or empty.
//
// Routes:
//   GET  /api/think-tank/captures        — list captures (id, title, captured_at, source_path)
//   GET  /api/think-tank/contract        — capture-shape contract + promotion targets
//   POST /api/think-tank/captures        — write a new capture to captures/inbox/<id>.capture.json
//   POST /api/think-tank/promote         — write a promotion contract to captures/promotions/
//
// Path-traversal protection:
//   - capture id must match /^[a-z0-9][a-z0-9_-]{0,60}$/ (write allowlist)
//   - filenames must match /^[a-zA-Z0-9._-]+\.capture\.json$/ (read allowlist)
//   - resolved file path must start with the canonical inbox/promotions dir
//   - parse failures are skipped (fail-soft); response is capped at 50 entries

'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const { appendStudioTaskRecord } = require('./studio-workflows-routes');

const INBOX_SUBDIR      = 'captures/inbox';
const PROMOTIONS_SUBDIR = 'captures/promotions';
const SAFE_NAME         = /^[a-zA-Z0-9._-]+\.capture\.json$/;
const SAFE_WRITE_ID     = /^[a-z0-9][a-z0-9_-]{0,60}$/;
const MAX_ENTRIES       = 50;
const MAX_READ_BYTES    = 256 * 1024;
const MAX_TITLE_CHARS   = 200;
const MAX_BODY_CHARS    = 8000;
const MAX_TASK_BYTES    = 8192;

const VALID_TARGETS     = new Set(['research', 'sites', 'components', 'media']);

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

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function atomicWrite(filePath, data) {
  const tmp = filePath + '.tmp.' + process.hrtime.bigint().toString(36);
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}

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
  const inboxDir      = path.resolve(repoRoot, INBOX_SUBDIR);
  const promotionsDir = path.resolve(repoRoot, PROMOTIONS_SUBDIR);
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

  // POST /captures — write a new capture to captures/inbox/<id>.capture.json
  router.post('/captures', (req, res) => {
    const body = req.body || {};
    const { id, title, body: captureBody, source, tags } = body;

    // Validate id
    if (!id || !SAFE_WRITE_ID.test(id)) {
      return res.status(400).json({ error: 'invalid_id', detail: 'id must match /^[a-z0-9][a-z0-9_-]{0,60}$/' });
    }
    // Validate title
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'title_required' });
    }

    const safeTitle = String(title).slice(0, MAX_TITLE_CHARS);
    const safeBody  = typeof captureBody === 'string' ? captureBody.slice(0, MAX_BODY_CHARS) : '';
    const safeSource = typeof source === 'string' ? source : 'studio-shell';
    const safeTags  = Array.isArray(tags) ? tags.slice(0, 16).map(t => String(t)) : [];

    const filename = `${id}.capture.json`;
    ensureDir(inboxDir);
    const resolved = path.resolve(inboxDir, filename);

    // Containment check
    if (!resolved.startsWith(inboxDir + path.sep)) {
      return res.status(400).json({ error: 'invalid_path' });
    }

    // No overwrites
    if (fs.existsSync(resolved)) {
      return res.status(409).json({ error: 'capture_exists', detail: `${id} already exists` });
    }

    const capture = {
      id: id,
      title: safeTitle,
      body: safeBody,
      source: safeSource,
      tags: safeTags,
      captured_at: new Date().toISOString(),
    };

    try {
      atomicWrite(resolved, capture);
    } catch (err) {
      console.warn('[think-tank-routes] write_failed', { id, error: err.message });
      return res.status(500).json({ error: 'write_failed', detail: err.message });
    }

    const relativePath = path.posix.join(INBOX_SUBDIR, filename);
    return res.json({ ok: true, capture, path: relativePath });
  });

  // POST /promote — write a promotion contract to captures/promotions/
  router.post('/promote', (req, res) => {
    const body = req.body || {};
    const { from_capture_id, to, task } = body;

    // Validate from_capture_id
    if (!from_capture_id || !SAFE_WRITE_ID.test(from_capture_id)) {
      return res.status(400).json({ error: 'invalid_from_capture_id', detail: 'must match /^[a-z0-9][a-z0-9_-]{0,60}$/' });
    }

    // Validate to
    if (!to || !VALID_TARGETS.has(to)) {
      return res.status(400).json({ error: 'invalid_to', detail: 'must be one of: research, sites, components, media' });
    }

    // Cap task size
    let safeTask = task && typeof task === 'object' ? task : {};
    const taskStr = JSON.stringify(safeTask);
    if (taskStr.length > MAX_TASK_BYTES) {
      return res.status(400).json({ error: 'task_too_large', detail: `task JSON exceeds ${MAX_TASK_BYTES} bytes` });
    }

    const timestamp = Date.now();
    const filename  = `${from_capture_id}-${to}-${timestamp}.promotion.json`;
    ensureDir(promotionsDir);
    const resolved = path.resolve(promotionsDir, filename);

    // Containment check
    if (!resolved.startsWith(promotionsDir + path.sep)) {
      return res.status(400).json({ error: 'invalid_path' });
    }

    const promotion = {
      from_capture_id,
      to,
      task: safeTask,
      promoted_at: new Date().toISOString(),
    };

    try {
      atomicWrite(resolved, promotion);
    } catch (err) {
      console.warn('[think-tank-routes] promote_write_failed', { from_capture_id, to, error: err.message });
      return res.status(500).json({ error: 'write_failed', detail: err.message });
    }

    const relativePath = path.posix.join(PROMOTIONS_SUBDIR, filename);
    const taskRecord = appendStudioTaskRecord(repoRoot, {
      source_type: safeTask && safeTask.brief_id ? 'research-promotion' : 'think-tank-promotion',
      source_id: from_capture_id,
      target_section: to,
      recommendation: safeTask.note || `Promoted ${from_capture_id} to ${to}`,
      title: safeTask.note || `Promoted ${from_capture_id}`,
      proof_needed: ['promotion json', `${to} follow-up`],
      owner_section: safeTask && safeTask.brief_id ? 'research' : 'thinktank',
      metadata: { promotion_path: relativePath, brief_id: safeTask.brief_id || '' },
    });
    return res.json({ ok: true, promotion, task: taskRecord, path: relativePath });
  });

  return router;
}

module.exports = { createThinkTankRouter };
