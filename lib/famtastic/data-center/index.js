'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DEFAULT_DIRS = [
  'sources',
  'jobs',
  'ledgers',
  'witness',
  'claims',
  'citations',
  'decisions',
  'artifacts',
  'graphs',
  'reports',
  'post-eval',
  'schemas',
  'cache',
  'exports',
];

const JOB_DIRS = ['uploads', 'workspace', 'outputs', 'sources'];
const SECRET_KEY_RE = /api[_-]?key|token|secret|password|credential|authorization/i;
const SECRET_VALUE_RE = /\b(?:sk|pk|pplx)-[A-Za-z0-9_\-]{16,}\b/g;
const SOURCE_INDEX_VERSION = '0.1.0';

function defaultHubRoot() {
  return path.resolve(__dirname, '..', '..', '..');
}

function defaultRoot() {
  return path.join(defaultHubRoot(), 'data-center');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJsonIfMissing(file, data) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  }
}

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function defaultTimestamp() {
  return new Date().toISOString();
}

function slugify(value) {
  return String(value || 'item')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item';
}

function stableId(prefix, parts) {
  const input = Array.isArray(parts) ? parts.join('|') : String(parts || '');
  return `${prefix}_${sha256(input).slice(0, 16)}`;
}

function ensureDataCenter(options = {}) {
  const root = options.root || defaultRoot();
  ensureDir(root);
  for (const dir of DEFAULT_DIRS) ensureDir(path.join(root, dir));

  writeJsonIfMissing(path.join(root, 'schemas', 'research-job.schema.json'), {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'FAMtastic Data Center Research Job',
    type: 'object',
    required: ['id', 'title', 'created_at', 'status'],
    properties: {
      id: { type: 'string' },
      title: { type: 'string' },
      source: { type: 'string' },
      status: { type: 'string' },
      budget: { type: 'object' },
      created_at: { type: 'string' },
      updated_at: { type: 'string' },
    },
  });

  writeJsonIfMissing(path.join(root, 'schemas', 'ledger-record.schema.json'), {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'FAMtastic Data Center Ledger Record',
    type: 'object',
    required: ['ts'],
    additionalProperties: true,
  });

  writeJsonIfMissing(path.join(root, 'schemas', 'capability-witness.schema.json'), {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'FAMtastic Capability Witness Record',
    type: 'object',
    required: ['capability', 'status', 'durationMs', 'issuedAt', 'platform', 'os'],
    properties: {
      capability: { type: 'string' },
      status: { type: 'string', enum: ['pass', 'fail', 'warn'] },
      durationMs: { type: 'number', minimum: 0 },
      issuedAt: { type: 'string' },
      platform: { type: 'string' },
      os: { type: 'string' },
      metadata: { type: 'object' },
      baseline: { type: 'object' },
    },
    additionalProperties: true,
  });

  writeJsonIfMissing(path.join(root, 'schemas', 'source-record.schema.json'), {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'FAMtastic Data Center Source Record',
    type: 'object',
    required: ['source_id', 'kind', 'title', 'hash', 'created_at', 'updated_at', 'provenance'],
    additionalProperties: true,
  });

  writeJsonIfMissing(path.join(root, 'schemas', 'claim-record.schema.json'), {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'FAMtastic Data Center Claim Record',
    type: 'object',
    required: ['claim_id', 'statement', 'source_ids', 'status', 'confidence', 'created_at', 'updated_at'],
    additionalProperties: true,
  });

  writeJsonIfMissing(path.join(root, 'schemas', 'decision-record.schema.json'), {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'FAMtastic Data Center Decision Record',
    type: 'object',
    required: ['decision_id', 'title', 'status', 'created_at', 'updated_at'],
    additionalProperties: true,
  });

  writeJsonIfMissing(path.join(root, 'schemas', 'post-eval-record.schema.json'), {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'FAMtastic Data Center Post-Evaluation Record',
    type: 'object',
    required: ['evaluation_id', 'type', 'created_at', 'run', 'learnings', 'gaps', 'opportunities'],
    properties: {
      evaluation_id: { type: 'string' },
      type: { const: 'post_evaluation' },
      run: { type: 'object' },
      learnings: { type: 'array' },
      gaps: { type: 'array' },
      opportunities: { type: 'array' },
    },
    additionalProperties: true,
  });

  writeJsonIfMissing(path.join(root, 'sources', 'index.json'), {
    schema_version: SOURCE_INDEX_VERSION,
    generated_at: defaultTimestamp(),
    records: {},
  });

  return { root, dirs: DEFAULT_DIRS.slice() };
}

function createResearchJob(options = {}) {
  const root = options.root || defaultRoot();
  ensureDataCenter({ root });
  const now = defaultTimestamp();
  const id = options.id || `research-${now.replace(/[-:.TZ]/g, '').slice(0, 14)}-${slugify(options.title || 'research-job')}`;
  const jobDir = path.join(root, 'jobs', id);
  ensureDir(jobDir);
  for (const dir of JOB_DIRS) ensureDir(path.join(jobDir, dir));

  const job = {
    id,
    title: options.title || 'Untitled research job',
    source: options.source || 'manual',
    status: options.status || 'created',
    budget: options.budget || {},
    created_at: now,
    updated_at: now,
  };

  writeJson(path.join(jobDir, 'job.json'), job);
  if (!fs.existsSync(path.join(jobDir, 'events.jsonl'))) fs.writeFileSync(path.join(jobDir, 'events.jsonl'), '', 'utf8');
  if (!fs.existsSync(path.join(jobDir, 'report.md'))) {
    fs.writeFileSync(path.join(jobDir, 'report.md'), `# ${job.title}\n\nStatus: ${job.status}\n\n`, 'utf8');
  }

  appendLedgerRecord({ root, ledger: 'research-jobs', record: { event: 'job.created', job } });
  return job;
}

function sanitizeRecord(value) {
  if (Array.isArray(value)) return value.map(sanitizeRecord);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [
      key,
      SECRET_KEY_RE.test(key) ? '[REDACTED]' : sanitizeRecord(child),
    ]));
  }
  if (typeof value === 'string') return value.replace(SECRET_VALUE_RE, '[REDACTED]');
  return value;
}

function appendLedgerRecord(options = {}) {
  const root = options.root || defaultRoot();
  const ledger = slugify(options.ledger || 'events');
  ensureDataCenter({ root });
  const file = path.join(root, 'ledgers', `${ledger}.jsonl`);
  const record = sanitizeRecord({ ts: defaultTimestamp(), ...(options.record || {}) });
  fs.appendFileSync(file, JSON.stringify(record) + '\n', 'utf8');
  return file;
}

function appendWitnessRecord(options = {}) {
  const root = options.root || defaultRoot();
  const capability = slugify(options.capability || 'unknown-capability');
  ensureDataCenter({ root });
  const record = sanitizeRecord({
    capability,
    status: options.status || 'fail',
    durationMs: Number.isFinite(options.durationMs) ? options.durationMs : 0,
    issuedAt: options.issuedAt || defaultTimestamp(),
    platform: options.platform || process.platform,
    os: options.os || process.version,
    metadata: options.metadata || {},
    baseline: options.baseline || null,
  });
  const file = path.join(root, 'witness', `${capability}.jsonl`);
  fs.appendFileSync(file, JSON.stringify(record) + '\n', 'utf8');
  return { file, record };
}

function readWitnessRecords(options = {}) {
  const root = options.root || defaultRoot();
  const capability = slugify(options.capability || 'unknown-capability');
  const file = path.join(root, 'witness', `${capability}.jsonl`);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

function listCaptureInbox(options = {}) {
  const hubRoot = options.hubRoot || defaultHubRoot();
  const inboxDir = path.join(hubRoot, 'captures', 'inbox');
  if (!fs.existsSync(inboxDir)) return [];
  return fs.readdirSync(inboxDir)
    .filter(name => !name.startsWith('.'))
    .sort()
    .map(name => describeLocalSourceFile(path.join(inboxDir, name), { hubRoot, queue: 'inbox' }));
}

function excerptText(value, limit = 280) {
  const compact = String(value || '').replace(/\s+/g, ' ').trim();
  return compact.slice(0, limit);
}

function summarizeContent(content, extension) {
  const text = String(content || '');
  const trimmed = text.trim();
  const lines = trimmed.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (extension === '.json') {
    const parsed = readJsonContent(text);
    if (parsed && typeof parsed === 'object') {
      const title = parsed.title || parsed.capture_id || parsed.proposal_id || parsed.id || null;
      const summary = parsed.summary || parsed.decision || parsed.statement || null;
      return {
        title: title ? String(title) : null,
        summary: summary ? excerptText(summary, 320) : excerptText(text, 320),
        excerpt: excerptText(JSON.stringify(sanitizeRecord(parsed)), 320),
      };
    }
  }
  const heading = lines.find(line => /^#/.test(line));
  return {
    title: heading ? heading.replace(/^#+\s*/, '') : (lines[0] || null),
    summary: excerptText(lines.slice(0, 3).join(' '), 320),
    excerpt: excerptText(trimmed, 320),
  };
}

function readJsonContent(content) {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function detectSourceKind(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.json') return 'capture_json';
  if (ext === '.md') return 'capture_markdown';
  if (ext === '.html') return 'capture_html';
  return 'capture_file';
}

function describeLocalSourceFile(file, options = {}) {
  const hubRoot = options.hubRoot || defaultHubRoot();
  const stat = fs.statSync(file);
  const relativePath = path.relative(hubRoot, file);
  const content = fs.readFileSync(file, 'utf8');
  const ext = path.extname(file).toLowerCase();
  const summary = summarizeContent(content, ext);
  const sourceId = stableId('src', [relativePath, stat.size, stat.mtimeMs]);
  return sanitizeRecord({
    source_id: sourceId,
    kind: options.kind || detectSourceKind(file),
    queue: options.queue || null,
    path: file,
    relative_path: relativePath,
    url: null,
    title: summary.title || path.basename(file),
    summary: summary.summary || '',
    excerpt: summary.excerpt || '',
    hash: sha256(content),
    bytes: stat.size,
    created_at: stat.birthtime && !Number.isNaN(stat.birthtimeMs) ? stat.birthtime.toISOString() : stat.mtime.toISOString(),
    updated_at: stat.mtime.toISOString(),
    provenance: {
      layer: 'capture_raw_box',
      origin: options.origin || 'captures',
      queue: options.queue || null,
      importer: options.importer || 'data-center-ingest',
      source_type: 'local_file',
    },
  });
}

function loadSourceIndex(root) {
  ensureDataCenter({ root });
  return readJson(path.join(root, 'sources', 'index.json'), {
    schema_version: SOURCE_INDEX_VERSION,
    generated_at: defaultTimestamp(),
    records: {},
  });
}

function saveSourceIndex(root, index) {
  const next = {
    schema_version: SOURCE_INDEX_VERSION,
    generated_at: defaultTimestamp(),
    records: index.records || {},
  };
  writeJson(path.join(root, 'sources', 'index.json'), next);
}

function upsertSourceRecord(options = {}) {
  const root = options.root || defaultRoot();
  ensureDataCenter({ root });
  const record = sanitizeRecord(options.record || {});
  if (!record.source_id) throw new Error('Missing record.source_id');
  const now = defaultTimestamp();
  const file = path.join(root, 'sources', `${record.source_id}.json`);
  const existing = readJson(file, null);
  const next = {
    ...existing,
    ...record,
    created_at: existing && existing.created_at ? existing.created_at : (record.created_at || now),
    updated_at: record.updated_at || now,
  };
  writeJson(file, next);

  const index = loadSourceIndex(root);
  index.records[next.source_id] = {
    hash: next.hash || null,
    path: next.path || next.url || null,
    kind: next.kind || null,
    updated_at: next.updated_at,
  };
  saveSourceIndex(root, index);

  return {
    file,
    record: next,
    changed: JSON.stringify(existing) !== JSON.stringify(next),
    existed: !!existing,
  };
}

function readSourceRecord(options = {}) {
  const root = options.root || defaultRoot();
  const sourceId = options.sourceId;
  if (!sourceId) throw new Error('Missing sourceId');
  return readJson(path.join(root, 'sources', `${sourceId}.json`), null);
}

function listSourceRecords(options = {}) {
  const root = options.root || defaultRoot();
  ensureDataCenter({ root });
  return fs.readdirSync(path.join(root, 'sources'))
    .filter(name => name.endsWith('.json') && name !== 'index.json')
    .sort()
    .map(name => readJson(path.join(root, 'sources', name), null))
    .filter(Boolean);
}

function ingestCaptureSources(options = {}) {
  const root = options.root || defaultRoot();
  const hubRoot = options.hubRoot || defaultHubRoot();
  const dryRun = !!options.dryRun;
  ensureDataCenter({ root });

  const queues = [
    { name: 'inbox', dir: path.join(hubRoot, 'captures', 'inbox') },
    { name: 'review', dir: path.join(hubRoot, 'captures', 'review') },
  ];

  const records = [];
  for (const queue of queues) {
    if (!fs.existsSync(queue.dir)) continue;
    for (const name of fs.readdirSync(queue.dir).filter(item => !item.startsWith('.')).sort()) {
      const file = path.join(queue.dir, name);
      if (!fs.statSync(file).isFile()) continue;
      records.push(describeLocalSourceFile(file, { hubRoot, queue: queue.name }));
    }
  }

  const index = loadSourceIndex(root);
  const summary = {
    root,
    hub_root: hubRoot,
    dry_run: dryRun,
    scanned: records.length,
    created: 0,
    updated: 0,
    unchanged: 0,
    records: [],
  };

  for (const record of records) {
    const indexed = index.records[record.source_id];
    const unchanged = indexed && indexed.hash === record.hash && indexed.path === record.path;
    if (unchanged) {
      summary.unchanged += 1;
      summary.records.push({ source_id: record.source_id, status: 'unchanged', path: record.relative_path, kind: record.kind });
      continue;
    }
    if (!dryRun) {
      const result = upsertSourceRecord({ root, record });
      summary[result.existed ? 'updated' : 'created'] += 1;
      summary.records.push({
        source_id: record.source_id,
        status: result.existed ? 'updated' : 'created',
        path: record.relative_path,
        kind: record.kind,
      });
    } else {
      summary[indexed ? 'updated' : 'created'] += 1;
      summary.records.push({
        source_id: record.source_id,
        status: indexed ? 'updated' : 'created',
        path: record.relative_path,
        kind: record.kind,
      });
    }
  }

  if (!dryRun) {
    appendLedgerRecord({
      root,
      ledger: 'data-center-ingest',
      record: {
        event: 'capture_sources.ingested',
        scanned: summary.scanned,
        created: summary.created,
        updated: summary.updated,
        unchanged: summary.unchanged,
      },
    });
  }

  return summary;
}

function normalizeList(value) {
  return Array.isArray(value) ? value.filter(Boolean).map(String) : [];
}

function upsertClaimRecord(options = {}) {
  const root = options.root || defaultRoot();
  ensureDataCenter({ root });
  const input = sanitizeRecord(options.record || {});
  const sourceIds = normalizeList(input.source_ids);
  const claimId = input.claim_id || stableId('claim', [input.statement || '', sourceIds.join('|')]);
  const file = path.join(root, 'claims', `${claimId}.json`);
  const existing = readJson(file, null);
  const now = defaultTimestamp();
  const next = {
    claim_id: claimId,
    statement: input.statement || '',
    source_ids: sourceIds,
    status: input.status || 'draft',
    confidence: typeof input.confidence === 'number' ? input.confidence : 0.5,
    tags: normalizeList(input.tags),
    summary: input.summary || excerptText(input.statement || '', 240),
    created_at: existing && existing.created_at ? existing.created_at : now,
    updated_at: input.updated_at || now,
    provenance: input.provenance || { layer: 'data_center', origin: 'manual' },
  };
  writeJson(file, next);
  return { file, record: next, existed: !!existing };
}

function readClaimRecord(options = {}) {
  const root = options.root || defaultRoot();
  const claimId = options.claimId;
  if (!claimId) throw new Error('Missing claimId');
  return readJson(path.join(root, 'claims', `${claimId}.json`), null);
}

function upsertDecisionRecord(options = {}) {
  const root = options.root || defaultRoot();
  ensureDataCenter({ root });
  const input = sanitizeRecord(options.record || {});
  const sourceIds = normalizeList(input.source_ids);
  const claimIds = normalizeList(input.claim_ids);
  const specIds = normalizeList(input.spec_ids);
  const decisionId = input.decision_id || stableId('decision', [input.title || '', claimIds.join('|'), sourceIds.join('|')]);
  const file = path.join(root, 'decisions', `${decisionId}.json`);
  const existing = readJson(file, null);
  const now = defaultTimestamp();
  const next = {
    decision_id: decisionId,
    title: input.title || 'Untitled decision',
    status: input.status || 'proposed',
    rationale: input.rationale || '',
    source_ids: sourceIds,
    claim_ids: claimIds,
    spec_ids: specIds,
    created_at: existing && existing.created_at ? existing.created_at : now,
    updated_at: input.updated_at || now,
    provenance: input.provenance || { layer: 'data_center', origin: 'manual' },
  };
  writeJson(file, next);
  return { file, record: next, existed: !!existing };
}

function readDecisionRecord(options = {}) {
  const root = options.root || defaultRoot();
  const decisionId = options.decisionId;
  if (!decisionId) throw new Error('Missing decisionId');
  return readJson(path.join(root, 'decisions', `${decisionId}.json`), null);
}

module.exports = {
  ensureDataCenter,
  createResearchJob,
  appendLedgerRecord,
  appendWitnessRecord,
  readWitnessRecords,
  listCaptureInbox,
  sanitizeRecord,
  stableId,
  describeLocalSourceFile,
  ingestCaptureSources,
  upsertSourceRecord,
  readSourceRecord,
  listSourceRecords,
  upsertClaimRecord,
  readClaimRecord,
  upsertDecisionRecord,
  readDecisionRecord,
};
