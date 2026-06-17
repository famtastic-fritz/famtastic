#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
const REGISTRY = path.join(REPO, 'plans', 'registry.json');
const PLANS_DIR = path.join(REPO, 'plans');

function readJSON(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function loadPlanFiles() {
  const out = {};
  for (const entry of fs.readdirSync(PLANS_DIR)) {
    const file = path.join(PLANS_DIR, entry, 'plan.json');
    if (!fs.existsSync(file)) continue;
    try {
      out[entry] = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {}
  }
  return out;
}

function inferPlanType(record) {
  if (record?.classification?.plan_type) return record.classification.plan_type;
  if (Array.isArray(record?.workstreams)) return 'execution';
  if (Array.isArray(record?.open_tasks)) return 'summary';
  return 'unknown';
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function buildRecords({ includeInactive = false } = {}) {
  const registry = readJSON(REGISTRY, { plans: [], active_parent_ids: [], labels: {}, terminated_parent_ids: {} });
  const planFiles = loadPlanFiles();
  const activeIds = new Set((registry.active_parent_ids || []).filter((id) => !(registry.terminated_parent_ids || {})[id]));
  const ids = includeInactive
    ? [...new Set([
        ...Object.keys(planFiles),
        ...registry.plans.map((p) => p.id).filter(Boolean),
        ...Object.keys(registry.labels || {}),
      ])]
    : [...activeIds];

  return ids.map((id) => {
    const registryRecord = (registry.plans || []).find((p) => p.id === id) || {};
    const fileRecord = planFiles[id] || {};
    const labelRecord = (registry.labels || {})[id] || {};
    const classification = {
      studio: registryRecord.studio || fileRecord.classification?.studio || labelRecord.studio || 'unclassified',
      plan_type: registryRecord.plan_type || fileRecord.classification?.plan_type || labelRecord.plan_type || inferPlanType(fileRecord || registryRecord),
      stream: registryRecord.stream || fileRecord.classification?.stream || labelRecord.stream || 'unclassified',
    };
    const tags = registryRecord.tags || fileRecord.tags || labelRecord.tags || [];
    const role = registryRecord.role || fileRecord.role || labelRecord.role || 'plan';
    return {
      id,
      title: registryRecord.title || fileRecord.title || labelRecord.label || id,
      status: activeIds.has(id) ? 'active' : (registryRecord.status || fileRecord.status || 'unknown'),
      studio: classification.studio,
      plan_type: classification.plan_type,
      stream: classification.stream,
      role,
      tags,
      source_plan: registryRecord.plan_path || `plans/${id}/plan.json`,
      next_action: registryRecord.next_action || registryRecord.current_workstream || fileRecord.summary || labelRecord.note || '',
      active: activeIds.has(id),
    };
  }).sort((a, b) => a.id.localeCompare(b.id));
}

function parseArgs(argv) {
  const opts = {
    includeInactive: false,
    format: 'standard',
    studio: null,
    planType: null,
    stream: null,
    status: null,
    groupBy: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--all') opts.includeInactive = true;
    else if (arg === '--json' || arg === '--format=json') opts.format = 'json';
    else if (arg === '--compact') opts.format = 'compact';
    else if (arg === '--standard') opts.format = 'standard';
    else if (arg === '--studio') opts.studio = argv[++i] || null;
    else if (arg === '--plan-type') opts.planType = argv[++i] || null;
    else if (arg === '--stream') opts.stream = argv[++i] || null;
    else if (arg === '--status') opts.status = argv[++i] || null;
    else if (arg === '--group-by') opts.groupBy = argv[++i] || null;
    else if (arg === '--help' || arg === '-h') opts.help = true;
  }
  return opts;
}

function filterRecords(records, opts) {
  return records.filter((record) => {
    if (opts.studio && normalize(record.studio) !== normalize(opts.studio)) return false;
    if (opts.planType && normalize(record.plan_type) !== normalize(opts.planType)) return false;
    if (opts.stream && normalize(record.stream) !== normalize(opts.stream)) return false;
    if (opts.status && normalize(record.status) !== normalize(opts.status)) return false;
    return true;
  });
}

function groupRecords(records, field) {
  const out = {};
  for (const record of records) {
    const key = record[field] || 'unclassified';
    out[key] = out[key] || [];
    out[key].push(record);
  }
  return out;
}

function printStandard(records) {
  console.log('| Plan | Studio | Type | Stream | Status | Next action |');
  console.log('|---|---|---|---|---|---|');
  for (const record of records) {
    console.log(`| \`${record.id}\` - ${record.title} | ${record.studio} | ${record.plan_type} | ${record.stream} | ${record.status} | ${String(record.next_action || '').replace(/\|/g, '\\|')} |`);
  }
}

function printCompact(records) {
  for (const record of records) {
    const cols = [
      record.id.padEnd(42),
      record.studio.padEnd(16),
      record.plan_type.padEnd(10),
      record.stream.padEnd(14),
      record.status.padEnd(10),
      record.title,
    ];
    console.log(cols.join('  '));
  }
}

function printHelp() {
  console.log('Usage: node scripts/plans/list.js [--studio <value>] [--plan-type <value>] [--stream <value>] [--status <value>] [--compact|--json] [--group-by studio|plan_type|stream] [--all]');
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return 0;
  }
  const records = filterRecords(buildRecords({ includeInactive: opts.includeInactive }), opts);
  const payload = opts.groupBy ? groupRecords(records, opts.groupBy) : records;
  if (opts.format === 'json') {
    console.log(JSON.stringify(payload, null, 2));
    return 0;
  }
  if (opts.groupBy) {
    for (const [group, groupedRecords] of Object.entries(payload)) {
      console.log(`\n## ${group} (${groupedRecords.length})`);
      if (opts.format === 'compact') printCompact(groupedRecords);
      else printStandard(groupedRecords);
    }
    return 0;
  }
  if (opts.format === 'compact') printCompact(records);
  else printStandard(records);
  return 0;
}

process.exit(main());
