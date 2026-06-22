#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPO_ROOT = path.resolve(__dirname, '..');
const CAPTURE_ROOT = path.join(REPO_ROOT, 'obsidian', '05-Captures');
const EXPORT_ROOT = path.join(CAPTURE_ROOT, 'exports');
const INDEX_ROOT = path.join(CAPTURE_ROOT, 'index');

function usage(exitCode = 0) {
  const out = exitCode ? console.error : console.log;
  out(`conversation-export.js

Usage:
  node scripts/conversation-export.js \
    --source-file <path> \
    [--freeze-manifest <path>] \
    [--source-surface <surface>] \
    [--source-locator <locator>] \
    [--session-id <id>] \
    [--title <title>] \
    [--lane <label>] \
    [--tags <comma,separated>] \
    [--freeze-anchor <text>] \
    [--dry-run]

Writes:
  obsidian/05-Captures/exports/<date>/<export-id>/export.md
  obsidian/05-Captures/exports/<date>/<export-id>/export.json
  obsidian/05-Captures/exports/<date>/<export-id>/restart-packet.md
  obsidian/05-Captures/exports/<date>/<export-id>/lineage.json
  obsidian/05-Captures/index/*.jsonl
`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = {
    sourceFile: null,
    freezeManifest: null,
    sourceSurface: 'file',
    sourceLocator: null,
    sessionId: null,
    title: null,
    lane: null,
    tags: [],
    freezeAnchor: null,
    dryRun: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--source-file') args.sourceFile = argv[++i];
    else if (arg.startsWith('--source-file=')) args.sourceFile = arg.slice('--source-file='.length);
    else if (arg === '--freeze-manifest') args.freezeManifest = argv[++i];
    else if (arg.startsWith('--freeze-manifest=')) args.freezeManifest = arg.slice('--freeze-manifest='.length);
    else if (arg === '--source-surface') args.sourceSurface = argv[++i];
    else if (arg.startsWith('--source-surface=')) args.sourceSurface = arg.slice('--source-surface='.length);
    else if (arg === '--source-locator') args.sourceLocator = argv[++i];
    else if (arg.startsWith('--source-locator=')) args.sourceLocator = arg.slice('--source-locator='.length);
    else if (arg === '--session-id') args.sessionId = argv[++i];
    else if (arg.startsWith('--session-id=')) args.sessionId = arg.slice('--session-id='.length);
    else if (arg === '--title') args.title = argv[++i];
    else if (arg.startsWith('--title=')) args.title = arg.slice('--title='.length);
    else if (arg === '--lane') args.lane = argv[++i];
    else if (arg.startsWith('--lane=')) args.lane = arg.slice('--lane='.length);
    else if (arg === '--tags') args.tags = String(argv[++i] || '').split(',').map(v => v.trim()).filter(Boolean);
    else if (arg.startsWith('--tags=')) args.tags = arg.slice('--tags='.length).split(',').map(v => v.trim()).filter(Boolean);
    else if (arg === '--freeze-anchor') args.freezeAnchor = argv[++i];
    else if (arg.startsWith('--freeze-anchor=')) args.freezeAnchor = arg.slice('--freeze-anchor='.length);
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--help' || arg === '-h') usage(0);
    else usage(1);
  }
  if (!args.sourceFile && !args.freezeManifest) usage(1);
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

function excerptLines(text, count = 12) {
  return text.split(/\r?\n/).map(line => line.trim()).filter(Boolean).slice(0, count);
}

function loadFreezeManifest(manifestArg) {
  const manifestAbs = path.resolve(REPO_ROOT, manifestArg);
  if (!fs.existsSync(manifestAbs)) {
    console.error(`Freeze manifest not found: ${manifestAbs}`);
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestAbs, 'utf8'));
  if (!manifest.transcript_path) {
    console.error(`Freeze manifest missing transcript_path: ${manifestAbs}`);
    process.exit(1);
  }
  const transcriptAbs = path.resolve(REPO_ROOT, manifest.transcript_path);
  if (!fs.existsSync(transcriptAbs)) {
    console.error(`Freeze transcript not found: ${transcriptAbs}`);
    process.exit(1);
  }
  return { manifest, manifestAbs, transcriptAbs };
}

function main() {
  const args = parseArgs(process.argv);
  const createdAt = nowIso();
  const date = shortDate(createdAt);

  let sourceAbs;
  let sourceRel;
  let sourceText;
  let sourceStat;
  let title;
  let normalizedLocator;
  let freezeAnchor;
  let sourceSurface = args.sourceSurface;
  let sessionId = args.sessionId || null;
  let sessionIdStatus = args.sessionId ? 'provided' : 'missing';
  let rootConversationId = null;
  let rootResolutionVersion = '1';
  let freezeManifestPath = null;
  let freezeTranscriptPath = null;
  let startMessageAnchor = null;
  let endMessageAnchor = null;
  let boundaryRule = null;

  if (args.freezeManifest) {
    const freeze = loadFreezeManifest(args.freezeManifest);
    sourceAbs = freeze.transcriptAbs;
    sourceRel = relRepo(sourceAbs);
    sourceText = fs.readFileSync(sourceAbs, 'utf8');
    sourceStat = fs.statSync(sourceAbs);
    title = args.title || freeze.manifest.title || path.basename(sourceAbs, path.extname(sourceAbs));
    normalizedLocator = freeze.manifest.source_locator || relRepo(freeze.manifestAbs);
    freezeAnchor = freeze.manifest.freeze_timestamp || createdAt;
    sourceSurface = freeze.manifest.source_surface || args.sourceSurface;
    sessionId = freeze.manifest.session_id || sessionId;
    sessionIdStatus = freeze.manifest.session_id_status || sessionIdStatus;
    rootConversationId = freeze.manifest.root_conversation_id || null;
    rootResolutionVersion = freeze.manifest.root_resolution_version || '1';
    freezeManifestPath = relRepo(freeze.manifestAbs);
    freezeTranscriptPath = freeze.manifest.transcript_path || sourceRel;
    startMessageAnchor = freeze.manifest.start_message_anchor || null;
    endMessageAnchor = freeze.manifest.end_message_anchor || null;
    boundaryRule = freeze.manifest.boundary_rule || null;
  } else {
    sourceAbs = path.resolve(REPO_ROOT, args.sourceFile);
    if (!fs.existsSync(sourceAbs)) {
      console.error(`Source file not found: ${sourceAbs}`);
      process.exit(1);
    }
    sourceText = fs.readFileSync(sourceAbs, 'utf8');
    sourceStat = fs.statSync(sourceAbs);
    sourceRel = relRepo(sourceAbs);
    title = args.title || path.basename(sourceAbs, path.extname(sourceAbs));
    normalizedLocator = args.sourceLocator || sourceRel;
    freezeAnchor = args.freezeAnchor || sourceStat.mtime.toISOString();
  }

  const seedString = [sourceSurface, normalizedLocator, freezeAnchor].join('|');
  if (!rootConversationId) {
    rootConversationId = `conv_${sha256(seedString).slice(0, 16)}`;
  }
  const exportId = `exp_${date.replace(/-/g, '')}_${sha256(sourceText + createdAt).slice(0, 8)}`;
  const exportDir = path.join(EXPORT_ROOT, date, exportId);
  const exportMdPath = path.join(exportDir, 'export.md');
  const exportJsonPath = path.join(exportDir, 'export.json');
  const restartPath = path.join(exportDir, 'restart-packet.md');
  const lineagePath = path.join(exportDir, 'lineage.json');

  const followUpBundle = [
    { job_key: 'parse_export', status: 'completed', blocking: false, output: relRepo(exportJsonPath) },
    { job_key: 'restart_packet', status: 'completed', blocking: false, output: relRepo(restartPath) },
    { job_key: 'lesson_extraction', status: 'pending', blocking: false, output: null },
    { job_key: 'promotion_review', status: 'pending', blocking: false, output: null },
    { job_key: 'prune_archive_review', status: 'pending', blocking: false, output: null },
  ];

  const exportRecord = {
    schema_version: '0.1.0',
    root_conversation_id: rootConversationId,
    root_resolution_version: rootResolutionVersion,
    export_id: exportId,
    session_id: sessionId,
    session_id_status: sessionIdStatus,
    source_surface: sourceSurface,
    source_locator: normalizedLocator,
    source_path: sourceRel,
    created_at: createdAt,
    captured_at: createdAt,
    revision: 1,
    parent_export_id: null,
    title,
    lane: args.lane || null,
    tags: args.tags,
    freeze_timestamp: freezeAnchor,
    freeze_manifest_path: freezeManifestPath,
    freeze_transcript_path: freezeTranscriptPath,
    start_message_anchor: startMessageAnchor,
    end_message_anchor: endMessageAnchor,
    boundary_rule: boundaryRule,
    source_sha256: sha256(sourceText),
    source_bytes: Buffer.byteLength(sourceText),
    follow_up_bundle: followUpBundle,
    excerpts: excerptLines(sourceText),
  };

  const exportMd = [
    frontmatter({
      schema_version: exportRecord.schema_version,
      root_conversation_id: exportRecord.root_conversation_id,
      export_id: exportRecord.export_id,
      source_surface: exportRecord.source_surface,
      source_locator: exportRecord.source_locator,
      source_path: exportRecord.source_path,
      created_at: exportRecord.created_at,
      captured_at: exportRecord.captured_at,
      session_id: exportRecord.session_id,
      session_id_status: exportRecord.session_id_status,
      revision: exportRecord.revision,
      parent_export_id: exportRecord.parent_export_id,
      lane: exportRecord.lane,
      tags: exportRecord.tags,
      freeze_timestamp: exportRecord.freeze_timestamp,
      freeze_manifest_path: exportRecord.freeze_manifest_path,
      freeze_transcript_path: exportRecord.freeze_transcript_path,
      start_message_anchor: exportRecord.start_message_anchor,
      end_message_anchor: exportRecord.end_message_anchor,
    }),
    `# Export ${exportId}`,
    '',
    `Source title: ${title}`,
    `Source file: ${sourceRel}`,
    ...(freezeManifestPath ? [`Freeze manifest: ${freezeManifestPath}`, `Frozen transcript: ${freezeTranscriptPath}`] : []),
    `Root conversation: ${rootConversationId}`,
    '',
    '## Artifact X',
    '',
    '- Raw source captured first.',
    '- This export is the structured descendant of the saved source artifact.',
    '- Follow-up consumers are attached but non-blocking.',
    '',
    '## Follow-up bundle',
    '',
    ...followUpBundle.map(job => `- ${job.job_key}: ${job.status} (blocking: ${job.blocking ? 'yes' : 'no'})`),
    '',
    '## Source excerpts',
    '',
    ...exportRecord.excerpts.map(line => `- ${line}`),
    '',
    '## Source body',
    '',
    '```text',
    sourceText,
    '```',
    '',
  ].join('\n');

  const restartCommand = freezeManifestPath
    ? `node scripts/conversation-export.js --freeze-manifest ${freezeManifestPath}`
    : `node scripts/conversation-export.js --source-file ${sourceRel} --source-surface ${sourceSurface}`;

  const restartMd = [
    frontmatter({
      schema_version: '0.1.0',
      export_id: exportId,
      root_conversation_id: rootConversationId,
      captured_at: createdAt,
      source_export_path: relRepo(exportMdPath),
      status: 'ready_to_resume',
    }),
    `# Restart Packet — ${exportId}`,
    '',
    `Current state: structured export captured from ${sourceRel}.`,
    'Next step: run a downstream consumer against export.md, then evaluate recall against the baseline path.',
    `Resume command: ${restartCommand}`,
    '',
    '## Required grounding',
    '',
    `- source artifact: ${sourceRel}`,
    ...(freezeManifestPath ? [`- freeze manifest: ${freezeManifestPath}`] : []),
    `- structured export: ${relRepo(exportMdPath)}`,
    `- lineage file: ${relRepo(lineagePath)}`,
    '',
  ].join('\n');

  const lineageRecord = {
    schema_version: '0.1.0',
    export_id: exportId,
    root_conversation_id: rootConversationId,
    aliases: [normalizedLocator, sourceRel].filter((value, index, arr) => value && arr.indexOf(value) === index),
    parent_export_id: null,
    child_export_ids: [],
    derived_artifacts: [
      { type: 'export_md', path: relRepo(exportMdPath) },
      { type: 'export_json', path: relRepo(exportJsonPath) },
      { type: 'restart_packet', path: relRepo(restartPath) },
    ],
    tombstones: [],
    merge_records: [],
    created_at: createdAt,
  };

  const indexRows = {
    exports: {
      export_id: exportId,
      root_conversation_id: rootConversationId,
      session_id: exportRecord.session_id,
      source_surface: exportRecord.source_surface,
      source_locator: exportRecord.source_locator,
      source_path: exportRecord.source_path,
      title,
      lane: exportRecord.lane,
      tags: exportRecord.tags,
      created_at: createdAt,
      path: relRepo(exportMdPath),
      json_path: relRepo(exportJsonPath),
      freeze_manifest_path: freezeManifestPath,
      freeze_transcript_path: freezeTranscriptPath,
    },
    restart: {
      export_id: exportId,
      root_conversation_id: rootConversationId,
      created_at: createdAt,
      status: 'ready_to_resume',
      path: relRepo(restartPath),
      source_export_path: relRepo(exportMdPath),
    },
    lineage: {
      export_id: exportId,
      root_conversation_id: rootConversationId,
      created_at: createdAt,
      path: relRepo(lineagePath),
      source_locator: normalizedLocator,
    },
  };

  if (args.dryRun) {
    console.log(JSON.stringify({ exportRecord, lineageRecord, indexRows }, null, 2));
    return;
  }

  ensureDir(exportDir);
  ensureDir(INDEX_ROOT);
  fs.writeFileSync(exportMdPath, exportMd);
  fs.writeFileSync(exportJsonPath, JSON.stringify(exportRecord, null, 2) + '\n');
  fs.writeFileSync(restartPath, restartMd);
  fs.writeFileSync(lineagePath, JSON.stringify(lineageRecord, null, 2) + '\n');

  appendJsonl(path.join(INDEX_ROOT, 'exports.jsonl'), indexRows.exports);
  appendJsonl(path.join(INDEX_ROOT, 'restart-packets.jsonl'), indexRows.restart);
  appendJsonl(path.join(INDEX_ROOT, 'lineage.jsonl'), indexRows.lineage);

  console.log(`conversation-export: wrote ${relRepo(exportMdPath)}`);
  console.log(`conversation-export: wrote ${relRepo(exportJsonPath)}`);
  console.log(`conversation-export: wrote ${relRepo(restartPath)}`);
  console.log(`conversation-export: wrote ${relRepo(lineagePath)}`);
}

main();
