// site-studio/server/research-routes.js
//
// Lane D — Research Center modular router.
// Mounted at /api/research. Read-only access to the seeded research brief
// markdown set under <repoRoot>/docs/research/famtastic-studio-execution/.
//
// Routes:
//   GET /api/research/briefs            — list all .md briefs (id, filename, title, path)
//   GET /api/research/brief/:id         — single brief detail (title, summary, body_first_500)
//
// Path-traversal protection:
//   - id must match /^[a-zA-Z0-9._-]+$/ (rejects '..', '/', '\', etc.)
//   - resolved file path must start with the canonical brief directory
//   - max 200KB read per file, max 2KB scan for title in list mode

'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');

const BRIEF_SUBDIR = 'docs/research/famtastic-studio-execution';
const SAFE_ID = /^[a-zA-Z0-9._-]+$/;
const MAX_READ_BYTES = 200 * 1024;
const TITLE_SCAN_BYTES = 2 * 1024;

function readTitle(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    try {
      const buf = Buffer.alloc(TITLE_SCAN_BYTES);
      const bytes = fs.readSync(fd, buf, 0, TITLE_SCAN_BYTES, 0);
      const text = buf.slice(0, bytes).toString('utf8');
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        const m = line.match(/^#\s+(.+?)\s*$/);
        if (m) return m[1].trim();
      }
      return null;
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return null;
  }
}

function readFileCapped(filePath, maxBytes) {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return null;
    const size = Math.min(stat.size, maxBytes);
    const fd = fs.openSync(filePath, 'r');
    try {
      const buf = Buffer.alloc(size);
      fs.readSync(fd, buf, 0, size, 0);
      return buf.toString('utf8');
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return null;
  }
}

function parseBriefBody(text) {
  if (!text) return { title: null, summary: '', body_first_500: '' };
  const lines = text.split(/\r?\n/);
  let title = null;
  let titleIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^#\s+(.+?)\s*$/);
    if (m) { title = m[1].trim(); titleIdx = i; break; }
  }
  // Find first non-empty paragraph after title (or after start if no title)
  let startIdx = titleIdx >= 0 ? titleIdx + 1 : 0;
  while (startIdx < lines.length && lines[startIdx].trim() === '') startIdx++;
  // Skip subsequent ATX headings (e.g. metadata sub-heads)
  while (startIdx < lines.length && /^#{1,6}\s/.test(lines[startIdx])) {
    startIdx++;
    while (startIdx < lines.length && lines[startIdx].trim() === '') startIdx++;
  }
  const summaryLines = [];
  let i = startIdx;
  while (i < lines.length && lines[i].trim() !== '') {
    summaryLines.push(lines[i]);
    i++;
  }
  const summary = summaryLines.join(' ').replace(/\s+/g, ' ').trim();
  // body_first_500 = first 500 chars of the rest (after summary block)
  const restStart = i;
  const rest = lines.slice(restStart).join('\n').replace(/^\s+/, '');
  const body_first_500 = rest.slice(0, 500);
  return { title, summary, body_first_500 };
}

function createResearchRouter(repoRoot) {
  if (!repoRoot || typeof repoRoot !== 'string') {
    throw new Error('repoRoot string required');
  }
  const briefsDir = path.resolve(repoRoot, BRIEF_SUBDIR);
  const router = express.Router();

  router.get('/briefs', (req, res) => {
    if (!fs.existsSync(briefsDir)) {
      return res.json({ briefs: [] });
    }
    let entries;
    try {
      entries = fs.readdirSync(briefsDir, { withFileTypes: true });
    } catch (err) {
      console.warn('[research-routes] readdir_failed', { dir: briefsDir, error: err.message });
      return res.json({ briefs: [] });
    }
    const briefs = [];
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!entry.name.endsWith('.md')) continue;
      if (!SAFE_ID.test(entry.name.slice(0, -3))) continue;
      const id = entry.name.slice(0, -3);
      const full = path.join(briefsDir, entry.name);
      const title = readTitle(full) || id;
      briefs.push({
        id,
        filename: entry.name,
        title,
        path: path.posix.join(BRIEF_SUBDIR, entry.name),
      });
    }
    briefs.sort((a, b) => a.filename.localeCompare(b.filename));
    res.json({ briefs });
  });

  router.get('/brief/:id', (req, res) => {
    const { id } = req.params;
    if (!SAFE_ID.test(id)) {
      return res.status(400).json({ error: 'invalid_brief_id' });
    }
    const filename = `${id}.md`;
    const resolved = path.resolve(briefsDir, filename);
    if (!resolved.startsWith(briefsDir + path.sep) && resolved !== briefsDir) {
      return res.status(400).json({ error: 'invalid_brief_path' });
    }
    if (!fs.existsSync(resolved)) {
      return res.status(404).json({ error: 'brief_not_found' });
    }
    const text = readFileCapped(resolved, MAX_READ_BYTES);
    if (text == null) {
      return res.status(404).json({ error: 'brief_unreadable' });
    }
    const { title, summary, body_first_500 } = parseBriefBody(text);
    res.json({
      id,
      filename,
      title: title || id,
      summary,
      body_first_500,
    });
  });

  return router;
}

module.exports = { createResearchRouter };
