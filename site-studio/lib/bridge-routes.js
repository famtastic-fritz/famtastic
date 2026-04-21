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

function unifiedDiff(oldStr, newStr, label) {
  const oldLines = String(oldStr || '').split('\n');
  const newLines = String(newStr || '').split('\n');
  const header = `--- a/${label}\n+++ b/${label}\n`;
  const patches = [];
  let i = 0, j = 0;
  while (i < oldLines.length || j < newLines.length) {
    if (oldLines[i] === newLines[j]) {
      i++; j++;
    } else {
      const ctxStart = Math.max(0, i - 2);
      const chunk = [`@@ -${ctxStart + 1} +${ctxStart + 1} @@`];
      for (let k = ctxStart; k < i; k++) chunk.push(' ' + oldLines[k]);
      while (i < oldLines.length && (j >= newLines.length || oldLines[i] !== newLines[j])) {
        chunk.push('-' + oldLines[i++]);
      }
      while (j < newLines.length && (i >= oldLines.length || oldLines[i] !== newLines[j])) {
        chunk.push('+' + newLines[j++]);
      }
      patches.push(chunk.join('\n'));
      break;
    }
  }
  return header + (patches.length > 0 ? patches.join('\n\n') : '(no differences)');
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

// POST /api/bridge/read  { path } — same as GET but accepts JSON body
router.post('/read', (req, res) => {
  const rel = (req.body && req.body.path) || req.query.path;
  if (!rel) return res.status(400).json({ error: 'path required' });
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

// POST /api/bridge/diff  { path, content }
router.post('/diff', (req, res) => {
  const { path: rel, content } = req.body || {};
  if (!rel || content === undefined) return res.status(400).json({ error: 'path and content required' });
  const abs = resolveSafe(rel);
  if (!abs) return res.status(403).json({ error: 'Path escapes ~/famtastic' });
  try {
    const current = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
    const proposed = content || '';
    const diff = unifiedDiff(current, proposed, rel);
    res.json({ diff, path: rel });
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

  execFile(bin, parts.slice(1), { cwd: FAM_ROOT, timeout: 20000 }, (err, stdout, stderr) => {
    res.json({
      stdout: stdout || '',
      stderr: stderr || '',
      exitCode: err ? (err.code ?? 1) : 0,
    });
  });
});

module.exports = router;
