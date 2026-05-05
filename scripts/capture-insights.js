#!/usr/bin/env node
/*
 * capture-insights.js — first-pass conversation/doc insight extractor.
 *
 * This intentionally writes review packets only. Canonical memory writes still
 * require a separate approve/promote step.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const HUB_ROOT = path.resolve(__dirname, '..');

const BUCKETS = [
  {
    key: 'design_decisions',
    label: 'Design decisions',
    destination: '.wolf/cerebrum.md',
    patterns: [/\bdecision\b/i, /\bapproved\b/i, /\bcanonical\b/i, /\bnon-negotiable\b/i, /\bmust\b/i, /\bshould\b/i],
  },
  {
    key: 'breakthroughs',
    label: 'Breakthroughs',
    destination: 'SITE-LEARNINGS.md',
    patterns: [/\bbreakthrough\b/i, /\bkeystone\b/i, /\bunlocks?\b/i, /\bflywheel\b/i, /\bnorth star\b/i],
  },
  {
    key: 'gaps',
    label: 'Gaps',
    destination: 'gaps.jsonl',
    patterns: [/\bgap\b/i, /\bmissing\b/i, /\bnot connected\b/i, /\bnot built\b/i, /\bbroken\b/i, /\bblocker\b/i, /\bdeferred\b/i],
  },
  {
    key: 'lessons',
    label: 'Lessons',
    destination: 'SITE-LEARNINGS.md',
    patterns: [/\blesson\b/i, /\bdo-not-repeat\b/i, /\broot cause\b/i, /\btrap\b/i, /\bprevent\b/i],
  },
  {
    key: 'contradictions',
    label: 'Contradictions',
    destination: 'FAMTASTIC-STATE.md',
    patterns: [/\bdrift\b/i, /\bstale\b/i, /\bcontradict/i, /\bwrong\b/i, /\bnot actually\b/i, /\bbelieves?\b/i],
  },
];

function usage(exitCode = 0) {
  const out = exitCode ? console.error : console.log;
  out(`Usage:
  fam-hub capture extract <source-file> [--out-dir captures/review] [--id capture-id]

Writes:
  <out-dir>/<capture-id>.json
  <out-dir>/<capture-id>.md

No canonical memory files are modified.`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const command = args.shift();
  if (!command || command === 'help' || command === '--help') usage(0);
  if (command !== 'extract') usage(1);
  const source = args.shift();
  if (!source) usage(1);
  const opts = { source, outDir: 'captures/review', id: null };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--out-dir') opts.outDir = args[++i];
    else if (arg.startsWith('--out-dir=')) opts.outDir = arg.slice('--out-dir='.length);
    else if (arg === '--id') opts.id = args[++i];
    else if (arg.startsWith('--id=')) opts.id = arg.slice('--id='.length);
    else usage(1);
  }
  return opts;
}

function slugify(value) {
  return String(value || 'capture')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'capture';
}

function splitBlocks(text) {
  const lines = text.split(/\r?\n/);
  const blocks = [];
  let heading = 'Document';
  let buffer = [];
  function flush() {
    const raw = buffer.join('\n').trim();
    if (!raw) return;
    raw.split(/\n{2,}/).forEach((chunk) => {
      const normalized = chunk.replace(/\s+/g, ' ').trim();
      if (normalized.length >= 45) blocks.push({ heading, text: normalized });
    });
    buffer = [];
  }
  lines.forEach((line) => {
    const headingMatch = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (headingMatch) {
      flush();
      heading = headingMatch[2].trim();
      return;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const item = line.replace(/^\s*[-*]\s+/, '').trim();
      if (item) blocks.push({ heading, text: item });
      return;
    }
    buffer.push(line);
  });
  flush();
  return blocks;
}

function classifyBlock(block) {
  const hits = [];
  BUCKETS.forEach((bucket) => {
    const score = bucket.patterns.reduce((count, pattern) => count + (pattern.test(block.heading) || pattern.test(block.text) ? 1 : 0), 0);
    if (score > 0) hits.push({ bucket, score });
  });
  hits.sort((a, b) => b.score - a.score);
  return hits[0] ? hits[0].bucket : null;
}

function makeItem(block, bucket) {
  const text = block.text.replace(/\s+/g, ' ').trim();
  const title = text
    .replace(/^\*\*([^*]+)\*\*[:. ]*/, '$1: ')
    .split(/[.!?]\s/)[0]
    .slice(0, 120)
    .trim();
  return {
    title: title || block.heading,
    source_heading: block.heading,
    summary: text.slice(0, 700),
    proposed_destination: bucket.destination,
    confidence: bucket.key === 'gaps' && /\bdeferred\b/i.test(text) ? 'medium' : 'high',
    status: 'needs_review',
  };
}

function extract(text) {
  const buckets = Object.fromEntries(BUCKETS.map(bucket => [bucket.key, []]));
  const seen = new Set();
  splitBlocks(text).forEach((block) => {
    const bucket = classifyBlock(block);
    if (!bucket) return;
    const fingerprint = crypto.createHash('sha1').update(bucket.key + '\n' + block.heading + '\n' + block.text).digest('hex');
    if (seen.has(fingerprint)) return;
    seen.add(fingerprint);
    buckets[bucket.key].push(makeItem(block, bucket));
  });
  return buckets;
}

function renderMarkdown(packet) {
  const sections = [
    `# Capture Review Packet — ${packet.capture_id}`,
    '',
    `**Source:** ${packet.source.path}`,
    `**Status:** ${packet.status}`,
    `**Created:** ${packet.created_at}`,
    '',
    'This packet is review-only. It proposes destinations; it does not write canonical memory.',
    '',
  ];
  BUCKETS.forEach((bucket) => {
    const items = packet.extractions[bucket.key] || [];
    sections.push(`## ${bucket.label}`, '');
    if (!items.length) {
      sections.push('- none detected', '');
      return;
    }
    items.forEach((item, index) => {
      sections.push(`${index + 1}. **${item.title}**`);
      sections.push(`   - Source heading: ${item.source_heading}`);
      sections.push(`   - Proposed destination: \`${item.proposed_destination}\``);
      sections.push(`   - Confidence: ${item.confidence}`);
      sections.push(`   - Summary: ${item.summary}`);
      sections.push('');
    });
  });
  return sections.join('\n');
}

function main() {
  const opts = parseArgs(process.argv);
  const sourcePath = path.resolve(HUB_ROOT, opts.source);
  if (!fs.existsSync(sourcePath)) {
    console.error(`Source not found: ${sourcePath}`);
    process.exit(1);
  }
  const text = fs.readFileSync(sourcePath, 'utf8');
  const hash = crypto.createHash('sha256').update(text).digest('hex');
  const captureId = opts.id || `${new Date().toISOString().slice(0, 10)}-${slugify(path.basename(sourcePath, path.extname(sourcePath)))}`;
  const packet = {
    schema_version: '0.1.0',
    capture_id: captureId,
    created_at: new Date().toISOString(),
    source: {
      path: path.relative(HUB_ROOT, sourcePath),
      sha256: hash,
      bytes: Buffer.byteLength(text),
    },
    status: 'review_required',
    write_policy: 'review_packet_only',
    proposed_destinations: Object.fromEntries(BUCKETS.map(bucket => [bucket.key, bucket.destination])),
    extractions: extract(text),
  };
  fs.mkdirSync(path.resolve(HUB_ROOT, opts.outDir), { recursive: true });
  const jsonPath = path.resolve(HUB_ROOT, opts.outDir, `${captureId}.json`);
  const mdPath = path.resolve(HUB_ROOT, opts.outDir, `${captureId}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(packet, null, 2) + '\n');
  fs.writeFileSync(mdPath, renderMarkdown(packet) + '\n');
  console.log(`Capture packet written: ${path.relative(HUB_ROOT, jsonPath)}`);
  console.log(`Review summary written: ${path.relative(HUB_ROOT, mdPath)}`);
}

main();
