'use strict';

const fs = require('fs');
const path = require('path');

const {
  ensureDataCenter,
  appendLedgerRecord,
  sanitizeRecord,
  stableId,
} = require('../data-center');

const VALID_TYPES = new Set([
  'skill_opportunity',
  'process_opportunity',
  'component_opportunity',
  'media_recipe_opportunity',
  'research_opportunity',
  'routing_opportunity',
  'quality_failure',
  'user_correction',
  'reuse_candidate',
  'prompt_pattern',
  'workflow_gap',
  'tool_opportunity',
]);

function defaultHubRoot() {
  return path.resolve(__dirname, '..', '..', '..');
}

function defaultRoot() {
  return path.join(defaultHubRoot(), 'data-center');
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function slugify(value) {
  return String(value || 'item')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item';
}

function normalizeOpportunity(item, index, runId) {
  const raw = typeof item === 'string' ? { title: item } : { ...(item || {}) };
  const type = VALID_TYPES.has(raw.type) ? raw.type : 'process_opportunity';
  const title = raw.title || raw.summary || `${type} ${index + 1}`;
  const priority = raw.priority || 'medium';
  return sanitizeRecord({
    opportunity_id: raw.opportunity_id || stableId('opp', [runId || '', type, title]),
    type,
    title,
    priority,
    summary: raw.summary || title,
    evidence: normalizeList(raw.evidence),
    suggested_action: raw.suggested_action || raw.next_action || null,
    owner: raw.owner || null,
    status: raw.status || 'proposed',
  });
}

function buildPostEval(options = {}) {
  const run = {
    id: options.run?.id || stableId('run', [options.run?.title || options.title || 'post-eval']),
    title: options.run?.title || options.title || 'Untitled post-evaluation',
    kind: options.run?.kind || 'run',
    system: options.run?.system || 'famtastic',
    status: options.run?.status || 'completed',
  };
  const createdAt = options.created_at || nowIso();
  const opportunities = normalizeList(options.opportunities).map((item, index) => normalizeOpportunity(item, index, run.id));
  const evaluation = sanitizeRecord({
    type: 'post_evaluation',
    schema_version: '0.1.0',
    evaluation_id: options.evaluation_id || stableId('posteval', [run.id, run.title, createdAt]),
    created_at: createdAt,
    run,
    inputs: normalizeList(options.inputs).map(String),
    outputs: normalizeList(options.outputs).map(String),
    proof: normalizeList(options.proof),
    learnings: normalizeList(options.learnings).map(String),
    gaps: normalizeList(options.gaps).map(String),
    opportunities,
    next_actions: normalizeList(options.nextActions || options.next_actions).map(String),
  });
  evaluation.summary = `Post-evaluation for ${evaluation.run.title}: ${evaluation.learnings.length} learnings, ${evaluation.gaps.length} gaps, ${evaluation.opportunities.length} opportunities.`;
  return evaluation;
}

function renderPostEvalReport(record) {
  const lines = [
    `# ${record.run.title} — Post-Evaluation`,
    '',
    `Evaluation ID: ${record.evaluation_id}`,
    `Status: ${record.run.status}`,
    `System: ${record.run.system}`,
    `Created: ${record.created_at}`,
    '',
    '## Summary',
    '',
    record.summary,
    '',
    '## Learnings',
    '',
    ...(record.learnings.length ? record.learnings.map(item => `- ${item}`) : ['- None recorded.']),
    '',
    '## Gaps',
    '',
    ...(record.gaps.length ? record.gaps.map(item => `- ${item}`) : ['- None recorded.']),
    '',
    '## Opportunities',
    '',
  ];
  for (const opportunity of record.opportunities) {
    lines.push(`- ${opportunity.type}: ${opportunity.title} (${opportunity.priority})`);
    if (opportunity.suggested_action) lines.push(`  - action: ${opportunity.suggested_action}`);
  }
  lines.push('', '## Proof', '');
  if (record.proof.length) {
    for (const proof of record.proof) lines.push(`- ${proof.kind || 'proof'}: ${proof.command || proof.job_id || proof.path || proof.status || JSON.stringify(proof)}`);
  } else {
    lines.push('- None recorded.');
  }
  lines.push('', '## Next actions', '');
  lines.push(...(record.next_actions.length ? record.next_actions.map(item => `- ${item}`) : ['- None recorded.']));
  lines.push('');
  return lines.join('\n');
}

function recordPostEval(options = {}) {
  const root = options.root || defaultRoot();
  const hubRoot = options.hubRoot || defaultHubRoot();
  ensureDataCenter({ root });
  const dir = path.join(root, 'post-eval');
  fs.mkdirSync(dir, { recursive: true });
  const record = sanitizeRecord(options.evaluation || buildPostEval(options));
  const file = path.join(dir, `${record.evaluation_id}.json`);
  const reportDir = path.join(root, 'reports', 'post-eval');
  fs.mkdirSync(reportDir, { recursive: true });
  const reportFile = path.join(reportDir, `${record.evaluation_id}.md`);
  fs.writeFileSync(file, JSON.stringify(record, null, 2) + '\n', 'utf8');
  fs.writeFileSync(reportFile, renderPostEvalReport(record), 'utf8');
  const ledgerFile = appendLedgerRecord({
    root,
    ledger: 'post-eval',
    record: {
      event: 'post_eval.recorded',
      evaluation_id: record.evaluation_id,
      run_id: record.run.id,
      run_title: record.run.title,
      opportunity_count: record.opportunities.length,
      gap_count: record.gaps.length,
      report_path: path.relative(hubRoot, reportFile).split(path.sep).join('/'),
    },
  });
  return { file, reportFile, ledgerFile, record };
}

function listPostEvalRecords(options = {}) {
  const root = options.root || defaultRoot();
  const dir = path.join(root, 'post-eval');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(name => name.endsWith('.json'))
    .sort()
    .map(name => {
      try {
        return JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
}

function hasAny(text, words) {
  const value = String(text || '').toLowerCase();
  return words.some(word => value.includes(word));
}

function extractPhaseOneOpportunitySeeds(options = {}) {
  const text = `${options.phaseOneCloseoutText || ''}\n${options.phaseTwoPlanText || ''}`;
  const seeds = [];
  if (hasAny(text, ['post-evaluation', 'post-eval', 'learning'])) {
    seeds.push({ type: 'process_opportunity', title: 'Mandatory post-evaluation closeout for all studio jobs', priority: 'high' });
    seeds.push({ type: 'skill_opportunity', title: 'Research-first post-evaluation and opportunity extraction workflow', priority: 'high' });
  }
  if (hasAny(text, ['media studio', 'logo', 'brand'])) {
    seeds.push({ type: 'media_recipe_opportunity', title: 'FAMtastic logo/brand prompt and variant evaluation recipe', priority: 'high' });
  }
  if (hasAny(text, ['component studio', 'search-before-build', 'reuse'])) {
    seeds.push({ type: 'component_opportunity', title: 'Build-time component decomposition and partial reuse process', priority: 'high' });
  }
  if (hasAny(text, ['site studio', 'edit', 'enhance'])) {
    seeds.push({ type: 'process_opportunity', title: 'Site Studio build/edit/enhance proof loop', priority: 'high' });
  }
  if (hasAny(text, ['mission control', 'visual', 'agent'])) {
    seeds.push({ type: 'tool_opportunity', title: 'Visual agent/workflow status surface with proof and cost lanes', priority: 'medium' });
  }
  if (hasAny(text, ['data center', 'second brain', 'research center'])) {
    seeds.push({ type: 'research_opportunity', title: 'Data Center to Second Brain visual knowledge projection', priority: 'medium' });
  }
  return seeds.map((seed, index) => normalizeOpportunity(seed, index, 'phase1-foundation'));
}

module.exports = {
  buildPostEval,
  recordPostEval,
  listPostEvalRecords,
  extractPhaseOneOpportunitySeeds,
  renderPostEvalReport,
};
