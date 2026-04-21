'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const router = express.Router();
const FAM_ROOT = path.resolve(process.env.HOME, 'famtastic');

const ALLOWED_COMMANDS = ['git', 'npm', 'node', 'bash', 'cat', 'ls', 'sed'];

function resolveSafe(relPath) {
  const resolved = path.resolve(FAM_ROOT, relPath);
  if (!resolved.startsWith(FAM_ROOT + path.sep) && resolved !== FAM_ROOT) {
    return null;
  }
  return resolved;
}

// GET /api/bridge/read?path=relative/path
router.get('/read', (req, res) => {
  const rel = req.query.path;
  if (!rel) return res.status(400).json({ error: 'path query param required' });
  const abs = resolveSafe(rel);
  if (!abs) return res.status(403).json({ error: 'Path escapes ~/famtastic' });
  try {
    const content = fs.readFileSync(abs, 'utf8');
    res.json({ content, path: rel });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// POST /api/bridge/write  { path, content }
router.post('/write', (req, res) => {
  const { path: rel, content } = req.body || {};
  if (!rel || content === undefined) return res.status(400).json({ error: 'path and content required' });
  const abs = resolveSafe(rel);
  if (!abs) return res.status(403).json({ error: 'Path escapes ~/famtastic' });
  try {
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, 'utf8');
    res.json({ success: true, path: rel });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bridge/exec  { command }
router.post('/exec', (req, res) => {
  const { command } = req.body || {};
  if (!command) return res.status(400).json({ error: 'command required' });

  const parts = command.trim().split(/\s+/);
  const bin = parts[0];
  if (!ALLOWED_COMMANDS.includes(bin)) {
    return res.status(403).json({ error: `Command not allowed: ${bin}. Allowed: ${ALLOWED_COMMANDS.join(', ')}` });
  }

  execFile(bin, parts.slice(1), { cwd: FAM_ROOT, timeout: 30000 }, (err, stdout, stderr) => {
    res.json({
      stdout: stdout || '',
      stderr: stderr || '',
      exitCode: err ? (err.code ?? 1) : 0,
    });
  });
});

module.exports = router;
