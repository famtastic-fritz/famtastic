#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPO_ROOT = path.resolve(__dirname, '..');
const CAPTURE_ROOT = path.join(REPO_ROOT, 'obsidian', '05-Captures');
const FREEZE_ROOT = path.join(CAPTURE_ROOT, 'freezes');
const INDEX_ROOT = path.join(CAPTURE_ROOT, 'index');

function usage(exitCode = 0) {
  const out = exitCode ? console.error : console.log;
  out(`conversation-freeze.js

Usage:
  node scripts/conversation-freeze.js \
    --source-file <path> \
    [--source-surface <surface>] \
    [--source-locator <locator>] \
    [--title <title>] \
    [--boundary-rule <rule>] \
    [--capture-pass-id <id>] \
    [--speaker <label>] \
    [--dry-run]

Writes:
  obsidian/05-Captures/freezes/<date>/<freeze-id>/freeze-manifest.json
  obsidian/05-Captures/freezes/<date>/<freeze-id>/transcript.md
  obsidian/05-Captures/freezes/<date>/<freeze-id>/transcript.json
  obsidian/05-Captures/index/freezes.jsonl
`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = {
    sourceFile: null,
    sourceSurface: 'file',
    sourceLocator: null,
    title: null,
    boundaryRule: 'include source content at or before the frozen end anchor; later edits require a child freeze/export',
    capturePassId: null,
    speaker: 'captured-source',
    dryRun: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--source-file') args.sourceFile = argv[++i];
    else if (arg.startsWith('--source-file=')) args.sourceFile = arg.slice('--source-file='.length);
    else if (arg === '--source-surface') args.sourceSurface = argv[++i];
    else if (arg.startsWith('--source-surface=')) args.sourceSurface = arg.slice('--source-surface='.length);
    else if (arg === '--source-locator') args.sourceLocator = argv[++i];
    else if (arg.startsWith('--source-locator=')) args.sourceLocator = arg.slice('--source-locator='.length);
    else if (arg === '--title') args.title = argv[++i];
    else if (arg.startsWith('--title=')) args.title = arg.slice('--title='.length);
    else if (arg === '--boundary-rule') args.boundaryRule = argv[++i];
    else if (arg.startsWith('--boundary-rule=')) args.boundaryRule = arg.slice('--boundary-rule='.length);
    else if (arg === '--capture-pass-id') args.capturePassId = argv[++i];
    else if (arg.startsWith('--capture-pass-id=')) args.capturePassId = arg.slice('--capture-pass-id='.length);
    else if (arg === '--speaker') args.speaker = argv[++i];
    else if (arg.startsWith('--speaker=')) args.speaker = arg.slice('--speaker='.length);
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--help' || arg === '-h') usage(0);
    else usage(1);
  }
  if (!args.sourceFile) usage(1);
  return args;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function nowIso() {
  return new Date().toISOString();
}

function shortDate(iso) {
  return iso.slice(0, 10);
}

function relRepo(absPath) {
  return path.relative(REPO_ROOT, absPath).replace(/\\/g, '/');
}

function appendJsonl(filePath, row) {
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, JSON.stringify(row) + '\n');
}

function yamlValue(value) {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return `[${value.map(v => yamlValue(v)).join(', ')}]`;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  const s = String(value);
  if (/^[a-zA-Z0-9_./:@-]+$/.test(s)) return s;
  return JSON.stringify(s);
}

function frontmatter(obj) {
  const lines = ['---'];
  for (const [key, value] of Object.entries(obj)) {
    lines.push(`${key}: ${yamlValue(value)}`);
  }
  lines.push('---', '');
  return lines.join('\n');
}

function normalizeBlocks(text) {
  const normalized = text.replace(/\r\n/g, '\n');
  return normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function inferSpeaker(block, fallbackSpeaker) {
  const patterns = [
    /^(User|Human|Fritz|Assistant|Shay|System)\s*:\s*/i,
    /^\*\*(User|Human|Fritz|Assistant|Shay|System)\*\*\s*:\s*/i,
  ];
  for (const pattern of patterns) {
    const match = block.match(pattern);
    if (match) {
      return {
        speaker: match[1].toLowerCase(),
        body: block.replace(pattern, '').trim(),
      };
    }
  }
  return { speaker: fallbackSpeaker, body: block };
}

function main() {
  const args = parseArgs(process.argv);
  const sourceAbs = path.resolve(REPO_ROOT, args.sourceFile);
  if (!fs.existsSync(sourceAbs)) {
    console.error(`Source file not found: ${sourceAbs}`);
    process.exit(1);
  }

  const capturedAt = nowIso();
  const date = shortDate(capturedAt);
  const sourceText = fs.readFileSync(sourceAbs, 'utf8');
  const sourceStat = fs.statSync(sourceAbs);
  const sourceRel = relRepo(sourceAbs);
  const sourceLocator = args.sourceLocator || sourceRel;
  const capturePassId = args.capturePassId || `cap_${sha256([sourceRel, capturedAt].join('|')).slice(0, 10)}`;
  const title = args.title || path.basename(sourceAbs, path.extname(sourceAbs));
  const blocks = normalizeBlocks(sourceText);
  if (!blocks.length) {
    console.error('Source file is empty after normalization; aborting freeze capture.');
    process.exit(1);
  }

  const entries = blocks.map((block, index) => {
    const { speaker, body } = inferSpeaker(block, args.speaker);
    const observedTimestamp = sourceStat.mtime.toISOString();
    const speakerHash = sha256(speaker).slice(0, 12);
    const anchor = `msg_${String(index + 1).padStart(4, '0')}_${speakerHash}_${capturePassId}`;
    return {
      ordinal: index + 1,
      anchor,
      anchor_mode: 'ordinal_speaker_hash_capture_pass',
      observed_timestamp: observedTimestamp,
      speaker,
      speaker_hash: speakerHash,
      body,
      body_sha256: sha256(body),
      source_locator: sourceLocator,
      source_path: sourceRel,
    };
  });

  const startMessageAnchor = entries[0].anchor;
  const endMessageAnchor = entries[entries.length - 1].anchor;
  const freezeSeed = [args.sourceSurface, sourceLocator, startMessageAnchor, endMessageAnchor, capturedAt].join('|');
  const freezeId = `frz_${date.replace(/-/g, '')}_${sha256(freezeSeed).slice(0, 8)}`;
  const freezeDir = path.join(FREEZE_ROOT, date, freezeId);
  const manifestPath = path.join(freezeDir, 'freeze-manifest.json');
  const transcriptMdPath = path.join(freezeDir, 'transcript.md');
  const transcriptJsonPath = path.join(freezeDir, 'transcript.json');
  const rootConversationId = `conv_${sha256([args.sourceSurface, sourceLocator, startMessageAnchor, endMessageAnchor, capturedAt].join('|')).slice(0, 16)}`;

  const manifest = {
    schema_version: '0.1.0',
    freeze_id: freezeId,
    root_conversation_id: rootConversationId,
    root_resolution_version: '1',
    title,
    source_surface: args.sourceSurface,
    source_locator: sourceLocator,
    source_path: sourceRel,
    captured_at: capturedAt,
    freeze_timestamp: capturedAt,
    boundary_rule: args.boundaryRule,
    capture_pass_id: capturePassId,
    anchor_mode: 'ordinal_speaker_hash_capture_pass',
    start_message_anchor: startMessageAnchor,
    end_message_anchor: endMessageAnchor,
    message_count: entries.length,
    transcript_path: relRepo(transcriptMdPath),
    transcript_json_path: relRepo(transcriptJsonPath),
    source_sha256: sha256(sourceText),
    source_bytes: Buffer.byteLength(sourceText),
    aliases: [sourceLocator, sourceRel].filter((value, index, arr) => value && arr.indexOf(value) === index),
  };

  const transcriptMd = [
    frontmatter({
      schema_version: manifest.schema_version,
      freeze_id: manifest.freeze_id,
      root_conversation_id: manifest.root_conversation_id,
      source_surface: manifest.source_surface,
      source_locator: manifest.source_locator,
      source_path: manifest.source_path,
      freeze_timestamp: manifest.freeze_timestamp,
      start_message_anchor: manifest.start_message_anchor,
      end_message_anchor: manifest.end_message_anchor,
      anchor_mode: manifest.anchor_mode,
      capture_pass_id: manifest.capture_pass_id,
    }),
    `# Transcript ${freezeId}`,
    '',
    `Source title: ${title}`,
    `Source path: ${sourceRel}`,
    `Source surface: ${args.sourceSurface}`,
    `Boundary rule: ${args.boundaryRule}`,
    '',
    '## Messages',
    '',
    ...entries.flatMap((entry) => ([
      `### ${entry.anchor}`,
      `- ordinal: ${entry.ordinal}`,
      `- speaker: ${entry.speaker}`,
      `- observed_timestamp: ${entry.observed_timestamp}`,
      `- speaker_hash: ${entry.speaker_hash}`,
      '',
      entry.body,
      '',
    ])),
  ].join('\n');

  const transcriptJson = {
    schema_version: '0.1.0',
    freeze_id: freezeId,
    root_conversation_id: rootConversationId,
    source_surface: args.sourceSurface,
    source_locator: sourceLocator,
    source_path: sourceRel,
    captured_at: capturedAt,
    boundary_rule: args.boundaryRule,
    anchor_mode: manifest.anchor_mode,
    capture_pass_id: capturePassId,
    entries,
  };

  const indexRow = {
    freeze_id: freezeId,
    root_conversation_id: rootConversationId,
    source_surface: args.sourceSurface,
    source_locator: sourceLocator,
    source_path: sourceRel,
    captured_at: capturedAt,
    freeze_timestamp: capturedAt,
    start_message_anchor: startMessageAnchor,
    end_message_anchor: endMessageAnchor,
    message_count: entries.length,
    manifest_path: relRepo(manifestPath),
    transcript_path: relRepo(transcriptMdPath),
    transcript_json_path: relRepo(transcriptJsonPath),
  };

  if (args.dryRun) {
    console.log(JSON.stringify({ manifest, transcriptJson, indexRow }, null, 2));
    return;
  }

  ensureDir(freezeDir);
  ensureDir(INDEX_ROOT);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(transcriptMdPath, transcriptMd);
  fs.writeFileSync(transcriptJsonPath, JSON.stringify(transcriptJson, null, 2) + '\n');
  appendJsonl(path.join(INDEX_ROOT, 'freezes.jsonl'), indexRow);

  console.log(`conversation-freeze: wrote ${relRepo(manifestPath)}`);
  console.log(`conversation-freeze: wrote ${relRepo(transcriptMdPath)}`);
  console.log(`conversation-freeze: wrote ${relRepo(transcriptJsonPath)}`);
}

main();
