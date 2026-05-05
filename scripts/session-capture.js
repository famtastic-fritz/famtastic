#!/usr/bin/env node
/**
 * session-capture.js — orchestrator for capturing chat sessions into v0.2 capture packets.
 *
 * Dispatches to the right adapter based on --source flag, normalizes the output,
 * writes the packet to captures/inbox/<id>.json, and logs the capture to
 * memory/usage.jsonl.
 *
 * Usage:
 *   node scripts/session-capture.js --source claude-code --input <path>
 *   node scripts/session-capture.js --source cowork --input handoffs/cowork-ops-execution-status.jsonl
 *   node scripts/session-capture.js --source codex --input <path>
 *   node scripts/session-capture.js --source manual --input <transcript-or-doc-path>
 *
 * Per the chat-capture-learn-optimize plan; see captures/SCHEMA.md for packet shape.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPO_ROOT = path.resolve(__dirname, '..');
const INBOX = path.join(REPO_ROOT, 'captures', 'inbox');
const USAGE_LOG = path.join(REPO_ROOT, 'memory', 'usage.jsonl');
const SCHEMA_VERSION = '0.2.0';

const ADAPTERS = {
  'claude-code': './capture-adapters/claude-code',
  'cowork': './capture-adapters/cowork',
  'codex': './capture-adapters/codex',
  'manual': './capture-adapters/manual',
};

function parseArgs(argv) {
  const args = { source: null, input: null, sessionId: null, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--source') args.source = argv[++i];
    else if (a === '--input') args.input = argv[++i];
    else if (a === '--session-id') args.sessionId = argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--help' || a === '-h') { printHelp(); process.exit(0); }
  }
  return args;
}

function printHelp() {
  console.log(`session-capture.js — capture a chat session into a v0.2 capture packet

Usage:
  node scripts/session-capture.js --source <source> --input <path> [--session-id <id>] [--dry-run]

Sources:
  claude-code   Claude Code session (transcript file or session-end hook input)
  cowork        Cowork session (status JSONL)
  codex         Codex session (codex-bridge transcript dump)
  manual        Manual paste / file drop (any text or markdown)

Output:
  captures/inbox/<capture-id>.json (v${SCHEMA_VERSION})

The packet is then ready for: fam-hub memory review <capture-id>
`);
}

function captureId() {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
  const rand = crypto.randomBytes(2).toString('hex');
  return `cap_${ts}_${rand}`;
}

function logUsage(event, captureId, source) {
  if (process.env.MEMORY_TELEMETRY === 'off') return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    memory_id: null,
    event,
    context: { capture_id: captureId, surface: source },
  }) + '\n';
  try { fs.appendFileSync(USAGE_LOG, line); }
  catch (e) { /* telemetry never throws */ }
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.source || !args.input) {
    printHelp();
    process.exit(1);
  }
  if (!ADAPTERS[args.source]) {
    console.error(`Unknown source: ${args.source}. Valid: ${Object.keys(ADAPTERS).join(', ')}`);
    process.exit(1);
  }
  if (!fs.existsSync(args.input)) {
    console.error(`Input not found: ${args.input}`);
    process.exit(1);
  }

  const adapterModule = require(ADAPTERS[args.source]);
  const id = captureId();
  const now = new Date().toISOString();

  const result = await adapterModule.extract({
    inputPath: args.input,
    sessionId: args.sessionId,
    captureId: id,
    now,
  });

  const packet = {
    schema_version: SCHEMA_VERSION,
    capture_id: id,
    created_at: now,
    source: {
      surface: args.source,
      session_id: args.sessionId || result.sessionId || null,
      adapter: `scripts/capture-adapters/${args.source}.js`,
      adapter_version: SCHEMA_VERSION,
      input_path: path.resolve(args.input),
      timestamp_range: result.timestampRange || { start: null, end: now },
    },
    summary: result.summary || '',
    extracted: result.extracted || [],
    status: 'pending_review',
    needs_review: true,
    open_gaps: result.openGaps || [],
  };

  if (args.dryRun) {
    console.log(JSON.stringify(packet, null, 2));
    return;
  }

  if (!fs.existsSync(INBOX)) fs.mkdirSync(INBOX, { recursive: true });
  const outPath = path.join(INBOX, `${id}.json`);
  fs.writeFileSync(outPath, JSON.stringify(packet, null, 2));
  logUsage('captured', id, args.source);

  console.log(`session-capture: wrote ${outPath}`);
  console.log(`  source: ${args.source}`);
  console.log(`  extracted: ${packet.extracted.length} items`);
  console.log(`  next: fam-hub memory review ${id}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
