'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const {
  ensureDataCenter,
  appendLedgerRecord,
  sanitizeRecord,
} = require('../../lib/famtastic/data-center');

const DEFAULT_ALIAS_FILE = path.resolve(__dirname, '..', 'model-aliases.json');
const JOB_DIRS = ['uploads', 'workspace', 'outputs', 'sources'];

function nowIso() {
  return new Date().toISOString();
}

function slugify(value) {
  return String(value || 'media-job')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'media-job';
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function loadAliases(options = {}) {
  const file = options.aliasFile || DEFAULT_ALIAS_FILE;
  return readJson(file);
}

function resolveModelAlias(options = {}) {
  const catalog = options.catalog || loadAliases(options);
  const intent = options.intent || 'text-to-image';
  const route = catalog.aliases[intent] || catalog.aliases['text-to-image'];
  if (!route) throw new Error(`No media model alias route for intent: ${intent}`);
  const unavailable = new Set(options.unavailableModels || []);
  const chain = [route.primary].concat(route.fallbacks || []).filter(Boolean);
  const selected = chain.find(model => !unavailable.has(model)) || chain[0];
  return {
    intent,
    primary: route.primary,
    fallbacks: route.fallbacks || [],
    chain,
    selected,
    media_type: route.media_type || 'image',
    category: route.category || 'general',
    status: catalog.status || {},
    notes: route.notes || [],
  };
}

function buildMuapiPlan(options = {}) {
  const prompt = String(options.prompt || '').trim();
  if (!prompt) throw new Error('Missing prompt for media plan');
  const route = resolveModelAlias({
    intent: options.intent || options.mediaType || 'text-to-image',
    aliasFile: options.aliasFile,
    unavailableModels: options.unavailableModels,
  });
  const dryRun = options.dryRun !== false;
  const title = options.title || `${route.intent} media plan`;
  const promptHash = sha256(prompt);
  const mediaType = options.mediaType || route.media_type || 'image';
  const category = options.category || route.category || 'general';
  const outputPath = options.outputPath || path.join('data-center', 'artifacts', 'media', `${slugify(title)}-${promptHash.slice(0, 10)}`);
  return sanitizeRecord({
    schema_version: '0.1.0',
    dry_run: dryRun,
    would_spend: !dryRun,
    provider: 'muapi',
    intent: route.intent,
    title,
    prompt,
    prompt_hash: promptHash,
    model: route.selected,
    primary_model: route.primary,
    fallback_chain: route.chain,
    media_type: mediaType,
    category,
    budget: options.budget || { maxUsd: 0, maxCredits: 0 },
    research_job_ids: Array.isArray(options.researchJobIds) ? options.researchJobIds : [],
    output_path: outputPath,
    command_preview: `muapi ${mediaType} generate --model ${route.selected} --prompt-file <prompt.txt> --output ${outputPath}`,
    route_notes: route.notes,
    created_at: nowIso(),
  });
}

function ensureMediaSchema(root) {
  ensureDataCenter({ root });
  writeJson(path.join(root, 'schemas', 'media-generation.schema.json'), {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'FAMtastic Data Center Media Generation Job',
    type: 'object',
    required: ['id', 'title', 'provider', 'model', 'status', 'prompt_hash', 'media_type', 'created_at'],
    additionalProperties: true,
  });
}

function createMediaJob(options = {}) {
  const root = options.root || path.resolve(__dirname, '..', '..', 'data-center');
  const plan = options.plan || buildMuapiPlan(options);
  ensureMediaSchema(root);
  const createdAt = nowIso();
  const id = options.id || `media-${createdAt.replace(/[-:.TZ]/g, '').slice(0, 14)}-${slugify(plan.title || plan.intent)}`;
  const jobDir = path.join(root, 'jobs', id);
  fs.mkdirSync(jobDir, { recursive: true });
  for (const dir of JOB_DIRS) fs.mkdirSync(path.join(jobDir, dir), { recursive: true });

  const job = sanitizeRecord({
    id,
    kind: 'media_generation',
    title: plan.title || 'Untitled media generation',
    provider: plan.provider || 'muapi',
    model: plan.model,
    status: options.status || 'planned',
    prompt_hash: plan.prompt_hash,
    media_type: plan.media_type,
    category: plan.category,
    budget: plan.budget || {},
    dry_run: plan.dry_run !== false,
    research_job_ids: plan.research_job_ids || [],
    created_at: createdAt,
    updated_at: createdAt,
  });
  writeJson(path.join(jobDir, 'job.json'), job);
  fs.writeFileSync(path.join(jobDir, 'events.jsonl'), JSON.stringify({ ts: createdAt, event: 'media.job.created', job_id: id, dry_run: job.dry_run }) + '\n', 'utf8');

  const proof = sanitizeRecord({
    job_id: id,
    ok: true,
    dry_run: job.dry_run,
    provider: job.provider,
    model: job.model,
    original_prompt: plan.prompt,
    prompt_hash: plan.prompt_hash,
    fallback_chain_used: plan.fallback_chain || [],
    output_url: plan.output_path,
    output_hash: sha256(plan.output_path),
    category: job.category,
    media_type: job.media_type,
    cost_credits: 0,
    cost_usd: 0,
    usage: {},
    ocr_validated: false,
    composition_preserved: false,
    preview_path: null,
    answer_excerpt: `Dry-run ${job.provider} ${job.media_type} plan for ${job.title}`,
    research_job_ids: job.research_job_ids,
    used_in_sites: [],
    created_at: createdAt,
  });
  writeJson(path.join(jobDir, 'outputs', 'generation-proof.json'), proof);
  fs.writeFileSync(path.join(jobDir, 'report.md'), `# ${job.title}\n\nStatus: ${job.status}\nProvider: ${job.provider}\nModel: ${job.model}\nDry run: ${job.dry_run}\n\nProof: outputs/generation-proof.json\n`, 'utf8');
  appendLedgerRecord({ root, ledger: 'media-jobs', record: { event: 'media.job.created', job } });
  appendAssetLedgerRecord({
    root,
    record: {
      event: 'asset.planned',
      job_id: id,
      output_url: proof.output_url,
      prompt: plan.prompt,
      prompt_hash: plan.prompt_hash,
      provider: job.provider,
      model: job.model,
      category: job.category,
      media_type: job.media_type,
      status: 'planned',
      proof_path: path.join('data-center', 'jobs', id, 'outputs', 'generation-proof.json'),
    },
  });
  return job;
}

function appendAssetLedgerRecord(options = {}) {
  return appendLedgerRecord({
    root: options.root,
    ledger: 'media-assets',
    record: {
      ledger_kind: 'media_asset',
      ...(options.record || {}),
    },
  });
}

module.exports = {
  loadAliases,
  resolveModelAlias,
  buildMuapiPlan,
  createMediaJob,
  appendAssetLedgerRecord,
};
