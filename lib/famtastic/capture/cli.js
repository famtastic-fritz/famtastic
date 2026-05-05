#!/usr/bin/env node
'use strict';

// lib/famtastic/capture/cli.js
// CLI for the FAMtastic capture flywheel.
// SHAY V2 (2026-05-02): MVP commands.
//
// Usage:
//   node lib/famtastic/capture/cli.js summary
//     → high-level inventory: how many inputs are queued, how many captures exist
//
//   node lib/famtastic/capture/cli.js scan
//     → detailed list of every input file in ~/famtastic/imports/ and Studio conversations
//
//   node lib/famtastic/capture/cli.js scaffold --session "cowork-2026-05-02-02"
//     → creates a new capture scaffold in docs/captures/ from the template
//
//   node lib/famtastic/capture/cli.js dry-run <capture-file>
//     → reads the capture, lists items marked STATUS:approved, shows where each will land
//
//   node lib/famtastic/capture/cli.js promote <capture-file>
//     → (NOT YET IMPLEMENTED) actually writes approved items to canonical files

const path = require('path');
const cap = require('./index.js');

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

function pad(s, n) {
  s = String(s);
  return s + ' '.repeat(Math.max(0, n - s.length));
}

function cmdSummary() {
  const s = cap.summary();
  console.log('FAMtastic Capture — summary');
  console.log('  root:                   ' + s.famtastic_root);
  console.log('  imports/web-chats:      ' + s.imports.web_chats);
  console.log('  imports/cowork-sessions:' + s.imports.cowork_sessions);
  console.log('  imports/ (other):       ' + s.imports.other);
  console.log('  Studio conversations:   ' + s.studio_conversations);
  console.log('  existing captures:      ' + s.existing_captures);
  console.log('  canonical files present:');
  for (const k of Object.keys(s.canonical_files)) {
    console.log('    ' + pad(k, 12) + (s.canonical_files[k] ? ' ✓' : ' ✗'));
  }
}

function cmdScan() {
  const imp = cap.scanImports();
  const studio = cap.scanStudioConversations();
  const captures = cap.listExistingCaptures();

  function dump(label, items, fields) {
    console.log('\n' + label + ' (' + items.length + ')');
    if (items.length === 0) { console.log('  (empty)'); return; }
    for (const it of items) {
      const row = fields.map(f => pad(it[f] || '', f === 'name' ? 32 : (f === 'site' ? 26 : 16))).join(' ');
      console.log('  ' + row);
    }
  }

  dump('imports/web-chats',       imp.web_chats,       ['name', 'size', 'mtime']);
  dump('imports/cowork-sessions', imp.cowork_sessions, ['name', 'size', 'mtime']);
  dump('imports/ (other)',        imp.other,           ['name', 'size', 'mtime']);
  dump('Studio conversations',    studio,              ['site', 'size', 'mtime']);
  dump('Existing captures',       captures,            ['name']);
}

function cmdScaffold(args) {
  const r = cap.scaffoldCapture({
    session: args.session,
    surface: args.surface || 'cowork',
    operator: args.operator || 'Fritz',
    source_file: args['source-file'] || args.source || null,
    overwrite: !!args.overwrite
  });
  if (!r.ok) {
    console.error('error: ' + r.error);
    process.exit(1);
  }
  console.log('scaffold created: ' + r.relative);
  console.log('  → fill in items, set STATUS for each, then run:');
  console.log('     node lib/famtastic/capture/cli.js dry-run ' + r.relative);
}

function cmdDryRun(args) {
  const target = args._[1];
  if (!target) {
    console.error('error: dry-run requires a capture path');
    process.exit(1);
  }
  const abs = path.isAbsolute(target) ? target : path.join(cap.FAM_ROOT, target);
  const r = cap.dryRunPromote(abs);
  if (!r.ok) {
    console.error('error: ' + r.error);
    process.exit(1);
  }
  console.log('dry-run: ' + abs);
  console.log('  approved items: ' + r.items_to_promote);
  for (const it of r.items) {
    console.log('  • ' + it.id + ' — ' + it.title);
    console.log('    → ' + it.destination);
  }
  if (r.items_to_promote === 0) {
    console.log('\n  no approved items found. Mark items STATUS: approved to promote them.');
  }
}

function cmdPromote(args) {
  const target = args._[1];
  if (!target) {
    console.error('error: promote requires a capture path');
    process.exit(1);
  }
  const promote = require('./promote.js');
  const abs = path.isAbsolute(target) ? target : path.join(cap.FAM_ROOT, target);
  const r = promote.promoteFile(abs, { dryRun: !!args['dry-run'] });
  if (!r.ok) {
    console.error('error: ' + r.error);
    process.exit(1);
  }
  if (r.note) console.log('note: ' + r.note);
  console.log('promote: ' + abs);
  console.log('  written: ' + (r.promoted || 0) + ', errored: ' + (r.errored || 0));
  for (const it of r.items) {
    const status = it.written ? '✓' : (it.would_write ? '~' : (it.error ? '✗' : '?'));
    console.log('  ' + status + ' ' + it.id + ' → ' + it.destination + ' (' + it.format + ')' + (it.error ? ' — ' + it.error : ''));
  }
}

async function cmdExtract(args) {
  const target = args._[1];
  if (!target) {
    console.error('error: extract requires a transcript path');
    process.exit(1);
  }
  const extract = require('./extract.js');
  const txt = extract.readTranscript(target);
  const r = await extract.extractFromTranscript(txt, {
    apiKey: args['api-key'],
    model: args.model,
    manual: !!args.manual
  });
  if (r.mode === 'manual') {
    console.log('# MANUAL EXTRACTION MODE');
    console.log('# Paste the prompt below into Claude Web, copy the response into a scaffold.\n');
    console.log(r.prompt);
  } else if (r.mode === 'api') {
    console.log('# Extracted via API (' + r.model + ', est. $' + r.cost_estimate_usd + ')');
    console.log('# Paste the items below into a scaffold (or pipe directly).\n');
    console.log(r.items_text);
  } else if (r.mode === 'error') {
    console.error('error: ' + r.error);
    console.error('falling back to manual prompt:\n');
    console.log(r.fallback_prompt);
    process.exit(1);
  }
}

function cmdPatterns(args) {
  const patterns = require('./patterns.js');
  const r = patterns.detectAcrossCaptures();
  console.log('Pattern detection across ' + r.captures_scanned + ' captures');
  console.log('  patterns found: ' + r.patterns.length);
  for (const p of r.patterns) {
    console.log('  • [' + p.count + '×] ' + p.signature);
    for (const inst of p.instances) console.log('    - ' + inst);
  }
  if (r.patterns.length === 0) console.log('  (none above threshold of ' + r.threshold + ')');
}

function cmdHelp() {
  console.log('FAMtastic Capture CLI — usage:\n');
  console.log('  node lib/famtastic/capture/cli.js summary');
  console.log('  node lib/famtastic/capture/cli.js scan');
  console.log('  node lib/famtastic/capture/cli.js scaffold --session <label> [--surface cowork|web|code]');
  console.log('  node lib/famtastic/capture/cli.js extract <transcript-file> [--manual] [--model claude-sonnet-4-6]');
  console.log('  node lib/famtastic/capture/cli.js dry-run <capture-file>');
  console.log('  node lib/famtastic/capture/cli.js promote <capture-file> [--dry-run]');
  console.log('  node lib/famtastic/capture/cli.js patterns');
  console.log('');
  console.log('See lib/famtastic/capture/README.md for details.');
}

async function main(argv) {
  const args = parseArgs(argv);
  const cmd = args._[0] || 'help';
  switch (cmd) {
    case 'summary':  return cmdSummary();
    case 'scan':     return cmdScan();
    case 'scaffold': return cmdScaffold(args);
    case 'extract':  return await cmdExtract(args);
    case 'dry-run':  return cmdDryRun(args);
    case 'promote':  return cmdPromote(args);
    case 'patterns': return cmdPatterns(args);
    case 'help':
    case '--help':
    case '-h':       return cmdHelp();
    default:
      console.error('unknown command: ' + cmd);
      cmdHelp();
      process.exit(1);
  }
}

main(process.argv.slice(2));
