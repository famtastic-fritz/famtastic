#!/usr/bin/env node
'use strict';

// lib/famtastic/iteration-report/generate.js
// SHAY V2 (2026-05-02): End-of-iteration report generator.
//
// Produces a single self-contained HTML page indexing every artifact touched
// in an iteration, organized by category, with descriptions and direct file://
// links. Lives in docs/iterations/.
//
// Usage:
//   node lib/famtastic/iteration-report/generate.js \
//     --iteration "iteration-2" \
//     --date 2026-05-02 \
//     --manifest path/to/manifest.json
//
// Or programmatically:
//   const { generate } = require('./generate.js');
//   generate({ iteration, date, manifest, outputPath });

const fs = require('fs');
const path = require('path');

const FAM_ROOT = path.resolve(process.env.HOME || '/root', 'famtastic');
const REPORTS_DIR = path.join(FAM_ROOT, 'docs/iterations');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fileExists(rel) {
  try { return fs.statSync(path.join(FAM_ROOT, rel)).isFile(); } catch (e) { return false; }
}

function fileSize(rel) {
  try { return fs.statSync(path.join(FAM_ROOT, rel)).size; } catch (e) { return null; }
}

function fmtBytes(n) {
  if (n == null) return '—';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / (1024 * 1024)).toFixed(2) + ' MB';
}

function generate(opts) {
  opts = opts || {};
  const iteration = opts.iteration || 'iteration-' + new Date().toISOString().slice(0, 10);
  const date = opts.date || new Date().toISOString().slice(0, 10);
  const manifest = opts.manifest || { categories: [] };
  const outDir = opts.outputDir || REPORTS_DIR;
  ensureDir(outDir);
  const outPath = opts.outputPath || path.join(outDir, date + '_' + iteration + '-report.html');

  const html = render(iteration, date, manifest);
  fs.writeFileSync(outPath, html, 'utf8');
  return { ok: true, path: outPath, relative: path.relative(FAM_ROOT, outPath) };
}

function render(iteration, date, manifest) {
  const totalFiles = manifest.categories.reduce((sum, c) => sum + (c.items || []).length, 0);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(iteration)} report — ${escapeHtml(date)}</title>
<style>
  :root {
    --bg: #0a0a0c; --surface: #14141a; --surface-2: #1c1c24; --border: rgba(255,255,255,0.08);
    --gold: #f5c400; --gold-soft: rgba(245,196,0,0.14); --gold-line: rgba(245,196,0,0.32);
    --text: #f0f0f5; --text-2: #a0a0aa; --text-3: #606068;
    --green: #4ade80; --red: #f87171;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: var(--bg); color: var(--text); line-height: 1.55; padding: 32px 28px;
    max-width: 1100px; margin: 0 auto;
  }
  .banner {
    background: linear-gradient(180deg, var(--gold-soft), transparent);
    border: 1px solid var(--gold-line);
    border-radius: 14px; padding: 24px 28px; margin-bottom: 24px;
  }
  .banner .eyebrow {
    font-size: 11px; color: var(--gold); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700;
  }
  .banner h1 { font-size: 28px; margin-top: 6px; letter-spacing: -0.01em; }
  .banner .meta {
    margin-top: 10px; color: var(--text-2); font-size: 13px;
    display: flex; gap: 18px; flex-wrap: wrap;
  }
  .banner .meta span strong { color: var(--text); }
  .banner .summary {
    margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--gold-line);
    color: var(--text); font-size: 14px; line-height: 1.65;
  }
  h2 {
    margin: 28px 0 12px; font-size: 18px; color: var(--gold);
    text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700;
  }
  .cat-desc {
    color: var(--text-2); font-size: 12px; margin-bottom: 14px; line-height: 1.55;
  }
  .files {
    display: flex; flex-direction: column; gap: 8px;
  }
  .file {
    background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
    padding: 12px 14px; transition: all 0.15s;
  }
  .file:hover { border-color: var(--text-3); background: var(--surface-2); }
  .file .row1 {
    display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap;
  }
  .file .pill {
    padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.04em; flex-shrink: 0;
  }
  .file .pill.new { background: rgba(74, 222, 128, 0.14); color: var(--green); }
  .file .pill.modified { background: rgba(245, 196, 0, 0.14); color: var(--gold); }
  .file .pill.removed { background: rgba(248, 113, 113, 0.14); color: var(--red); }
  .file .path {
    font-family: "SF Mono", Menlo, monospace; font-size: 12px; color: var(--text);
    word-break: break-all; flex: 1;
  }
  .file .size { font-size: 11px; color: var(--text-3); font-family: "SF Mono", Menlo, monospace; }
  .file .desc { color: var(--text-2); font-size: 12px; margin-top: 6px; line-height: 1.55; }
  .file .actions { margin-top: 8px; display: flex; gap: 6px; }
  .file a {
    color: var(--gold); text-decoration: none; font-size: 11px;
    padding: 4px 9px; background: var(--gold-soft); border: 1px solid var(--gold-line);
    border-radius: 6px;
  }
  .file a:hover { background: var(--gold); color: #1a1a00; }
  .file.missing { opacity: 0.5; }
  .file.missing .pill { background: rgba(248, 113, 113, 0.14); color: var(--red); }
  .legend {
    margin-top: 32px; padding: 16px 18px; background: var(--surface); border: 1px dashed var(--border);
    border-radius: 10px; font-size: 12px; color: var(--text-2); line-height: 1.6;
  }
  .legend strong { color: var(--text); }
  code {
    background: var(--surface-2); padding: 2px 7px; border-radius: 5px;
    color: var(--gold); font-size: 12px; font-family: "SF Mono", Menlo, monospace;
  }
</style>
</head>
<body>

<div class="banner">
  <div class="eyebrow">FAMtastic ${escapeHtml(iteration)} report</div>
  <h1>${escapeHtml(manifest.title || 'Iteration report')}</h1>
  <div class="meta">
    <span><strong>Date:</strong> ${escapeHtml(date)}</span>
    <span><strong>Files touched:</strong> ${totalFiles}</span>
    <span><strong>Categories:</strong> ${manifest.categories.length}</span>
    ${manifest.duration ? `<span><strong>Duration:</strong> ${escapeHtml(manifest.duration)}</span>` : ''}
  </div>
  ${manifest.summary ? `<div class="summary">${escapeHtml(manifest.summary)}</div>` : ''}
</div>

${manifest.categories.map(cat => `
<h2>${escapeHtml(cat.title)}${cat.count_label ? ` <span style="color:var(--text-3);font-weight:500;font-size:13px;text-transform:none;letter-spacing:0;">(${escapeHtml(cat.count_label)})</span>` : ''}</h2>
${cat.description ? `<div class="cat-desc">${escapeHtml(cat.description)}</div>` : ''}
<div class="files">
${(cat.items || []).map(item => {
  const exists = fileExists(item.path);
  const sz = fileSize(item.path);
  const status = item.status || (exists ? 'modified' : 'missing');
  const fileUrl = 'file://' + path.join(FAM_ROOT, item.path);
  return `
  <div class="file ${exists ? '' : 'missing'}">
    <div class="row1">
      <span class="pill ${status}">${escapeHtml(status)}</span>
      <span class="path">${escapeHtml(item.path)}</span>
      <span class="size">${fmtBytes(sz)}</span>
    </div>
    ${item.description ? `<div class="desc">${escapeHtml(item.description)}</div>` : ''}
    <div class="actions">
      <a href="${escapeHtml(fileUrl)}" target="_blank">Open</a>
      ${item.related ? item.related.map(r => `<a href="file://${escapeHtml(path.join(FAM_ROOT, r))}" target="_blank">${escapeHtml(path.basename(r))}</a>`).join('') : ''}
    </div>
  </div>`;
}).join('')}
</div>
`).join('')}

<div class="legend">
  <strong>How to use this report:</strong>
  Click <code>Open</code> next to any file to view it in your browser or default editor.
  Files marked <code>new</code> didn't exist before this iteration.
  Files marked <code>modified</code> were edited.
  Files marked <code>missing</code> are referenced but not found on disk (debug only).
  <br><br>
  <strong>Workflow next:</strong>
  Read what changed → run <code>git status</code> → pick what to commit →
  <code>git checkout -b ${escapeHtml(iteration)}-rebuild</code> → review with <code>git diff</code> → commit on the feature branch.
  <br><br>
  Per CLAUDE.md: commits never reference Claude/AI/Cowork.
</div>

</body>
</html>
`;
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = (argv[i + 1] && !argv[i + 1].startsWith('--')) ? argv[++i] : true;
      args[key] = val;
    } else {
      args._.push(a);
    }
  }
  return args;
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.manifest) {
    console.error('error: --manifest <path-to-manifest.json> required');
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(args.manifest, 'utf8'));
  const r = generate({
    iteration: args.iteration || manifest.iteration || 'iteration',
    date: args.date || manifest.date || new Date().toISOString().slice(0, 10),
    manifest: manifest,
    outputPath: args.out || null
  });
  console.log('report written: ' + r.relative);
}

module.exports = { generate };
