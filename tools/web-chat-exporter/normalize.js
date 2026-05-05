#!/usr/bin/env node
'use strict';

// tools/web-chat-exporter/normalize.js
// Manual paste fallback (Option C). Takes raw text exported from claude.ai
// (typically copy-paste of the entire conversation page) and normalizes to
// the capture flywheel's expected markdown format.

const fs = require('fs');
const path = require('path');

function usage() {
  console.error('Usage: node tools/web-chat-exporter/normalize.js <input-file> [--out <output-file>]');
  console.error('');
  console.error('Reads the raw text dump, attempts to detect message boundaries (heuristic),');
  console.error('and writes capture-ready markdown to <output-file> or stdout.');
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length === 0) usage();

const inputPath = args[0];
let outputPath = null;
const outIdx = args.indexOf('--out');
if (outIdx >= 0 && args[outIdx + 1]) outputPath = args[outIdx + 1];

if (!fs.existsSync(inputPath)) {
  console.error('error: input not found: ' + inputPath);
  process.exit(1);
}

const raw = fs.readFileSync(inputPath, 'utf8');
const T = new Date().toISOString();

// Heuristic boundary detection: claude.ai usually formats turns with the role on its own line.
// Look for lines that are exactly "You" or "Assistant" or "Claude" or contain "(edited)" markers etc.
const ROLE_HINTS = [
  /^You$/m,
  /^Assistant$/m,
  /^Claude$/m,
  /^Human$/m
];

function splitTurns(text) {
  // Split on lines that look like a role marker.
  const lines = text.split(/\r?\n/);
  const turns = [];
  let current = { role: 'unknown', lines: [] };
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === 'You' || trimmed === 'Human') {
      if (current.lines.length) turns.push(current);
      current = { role: 'human', lines: [] };
    } else if (trimmed === 'Assistant' || trimmed === 'Claude') {
      if (current.lines.length) turns.push(current);
      current = { role: 'assistant', lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.length) turns.push(current);
  return turns;
}

const turns = splitTurns(raw);

let md = '# Claude Web Chat Export\n\n';
md += '**Exported:** ' + T + '\n';
md += '**URL:** (manual paste — URL not captured)\n';
md += '**Source file:** ' + path.basename(inputPath) + '\n';
md += '**Message count:** ' + turns.length + '\n';
md += '**Source:** manual paste (normalized)\n\n---\n\n';

let humanIdx = 0;
let assistantIdx = 0;
for (const turn of turns) {
  const role = turn.role === 'unknown' ? '(role-unclear)' : turn.role.charAt(0).toUpperCase() + turn.role.slice(1);
  const turnNo = turn.role === 'human' ? ++humanIdx : (turn.role === 'assistant' ? ++assistantIdx : '?');
  md += '## ' + role + ' (turn ' + turnNo + ')\n\n';
  md += turn.lines.join('\n').trim() + '\n\n---\n\n';
}

if (outputPath) {
  fs.writeFileSync(outputPath, md, 'utf8');
  console.log('wrote: ' + outputPath);
  console.log('  turns detected: ' + turns.length);
  if (turns.some(t => t.role === 'unknown')) {
    console.log('  WARNING: some turns had unclear roles. Inspect output.');
  }
} else {
  process.stdout.write(md);
}
