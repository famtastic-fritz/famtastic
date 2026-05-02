'use strict';

// lib/famtastic/capture/promote.js
// SHAY V2 (2026-05-02 iter 3): Promote command.
// Reads approved items from a capture, writes each to its destination canonical file.
//
// Destination handlers per format:
//   *.md (cerebrum, FAMTASTIC-STATE, etc.)  → append under a marker section
//   *.jsonl (gaps, suggestions)              → append a JSON object per line
//   *.json (buglog)                          → append to a top-level array
//
// Each promoted item gets a footer marking its source capture for traceability.

const fs = require('fs');
const path = require('path');
const cap = require('./index.js');

const PROMOTION_MARKER_HEADING = '## Auto-promoted from captures';

function ensureSectionInMarkdown(filePath, heading) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, `# ${path.basename(filePath, '.md')}\n\n${heading}\n\n`, 'utf8');
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes(heading)) {
    const sep = content.endsWith('\n') ? '' : '\n';
    fs.writeFileSync(filePath, content + sep + '\n' + heading + '\n\n', 'utf8');
  }
}

function appendToMarkdown(filePath, body, sourceCapture) {
  ensureSectionInMarkdown(filePath, PROMOTION_MARKER_HEADING);
  const footer = `\n\n*Promoted from \`${path.relative(cap.FAM_ROOT, sourceCapture)}\` on ${new Date().toISOString().slice(0, 10)}.*\n`;
  const block = '\n\n' + body.trim() + footer;
  fs.appendFileSync(filePath, block, 'utf8');
}

function appendToJsonl(filePath, item, sourceCapture) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const line = JSON.stringify({
    ...item,
    promoted_from: path.relative(cap.FAM_ROOT, sourceCapture),
    promoted_at: new Date().toISOString()
  });
  if (fs.existsSync(filePath)) {
    fs.appendFileSync(filePath, line + '\n', 'utf8');
  } else {
    fs.writeFileSync(filePath, line + '\n', 'utf8');
  }
}

function appendToJsonArray(filePath, item, sourceCapture) {
  let arr = [];
  if (fs.existsSync(filePath)) {
    try { arr = JSON.parse(fs.readFileSync(filePath, 'utf8')); }
    catch (e) { console.error('warning: ' + filePath + ' is not valid JSON; replacing.'); arr = []; }
    if (!Array.isArray(arr)) arr = [];
  } else {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
  arr.push({
    ...item,
    promoted_from: path.relative(cap.FAM_ROOT, sourceCapture),
    promoted_at: new Date().toISOString()
  });
  fs.writeFileSync(filePath, JSON.stringify(arr, null, 2) + '\n', 'utf8');
}

function parseDestination(dest) {
  // Examples:
  //   ".wolf/cerebrum.md (Decision Log)"  → { file: ".wolf/cerebrum.md", section: "Decision Log" }
  //   ".wolf/gaps.jsonl"                  → { file: ".wolf/gaps.jsonl", section: null }
  const m = dest.match(/^([^()]+?)(?:\s*\(([^)]+)\))?$/);
  if (!m) return { file: dest.trim(), section: null };
  return { file: m[1].trim(), section: m[2] ? m[2].trim() : null };
}

function classifyByExt(filePath) {
  if (filePath.endsWith('.jsonl')) return 'jsonl';
  if (filePath.endsWith('.json')) return 'json';
  if (filePath.endsWith('.md')) return 'markdown';
  return 'unknown';
}

function jsonlItemFromBody(item) {
  // For jsonl destinations, encode the item as a JSON-friendly object.
  // We extract: id, title, destination, body lines.
  return {
    id: item.id,
    title: item.title,
    body: item.body,
    destination: item.destination
  };
}

function jsonItemFromBody(item) {
  // For json destinations (buglog.json), same shape.
  return jsonlItemFromBody(item);
}

function promoteFile(capturePath, opts) {
  opts = opts || {};
  const dryRun = !!opts.dryRun;
  const r = cap.dryRunPromote(capturePath);
  if (!r.ok) return r;
  if (r.items_to_promote === 0) {
    return { ok: true, capture: capturePath, promoted: 0, items: [], note: 'no approved items' };
  }
  const results = [];
  for (const item of r.items) {
    const dest = parseDestination(item.destination);
    const destAbs = path.isAbsolute(dest.file) ? dest.file : path.join(cap.FAM_ROOT, dest.file);
    const fmt = classifyByExt(destAbs);
    const result = { id: item.id, destination: item.destination, format: fmt, written: false };
    if (dryRun) {
      result.would_write = true;
      results.push(result);
      continue;
    }
    try {
      if (fmt === 'markdown') {
        appendToMarkdown(destAbs, item.body, capturePath);
      } else if (fmt === 'jsonl') {
        appendToJsonl(destAbs, jsonlItemFromBody(item), capturePath);
      } else if (fmt === 'json') {
        appendToJsonArray(destAbs, jsonItemFromBody(item), capturePath);
      } else {
        result.error = 'unsupported destination format: ' + fmt;
        results.push(result);
        continue;
      }
      result.written = true;
    } catch (err) {
      result.error = err.message;
    }
    results.push(result);
  }
  // Mark the capture as promoted by appending a small footer.
  if (!dryRun) {
    const stampFooter = `\n\n---\n\n## Promotion log\n\n${r.items.length} item(s) marked approved; ${results.filter(x => x.written).length} written; ${results.filter(x => x.error).length} errored. Promoted on ${new Date().toISOString()}.\n`;
    try { fs.appendFileSync(capturePath, stampFooter, 'utf8'); } catch (e) { /* noop */ }
  }
  return {
    ok: true,
    capture: capturePath,
    promoted: results.filter(x => x.written).length,
    errored: results.filter(x => x.error).length,
    items: results
  };
}

module.exports = { promoteFile, parseDestination };
