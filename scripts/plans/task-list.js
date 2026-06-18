#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
const TASK_LEDGER = path.join(REPO, 'tasks', 'tasks.jsonl');
const REGISTRY = path.join(REPO, 'plans', 'registry.json');

function readJSON(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function readJSONL(file) {
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, 'utf8').trim();
  if (!text) return [];
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function buildPlanMap() {
  const registry = readJSON(REGISTRY, { plans: [], labels: {} });
  const map = new Map();
  for (const plan of registry.plans || []) {
    map.set(plan.id, {
      id: plan.id,
      studio: plan.studio || registry.labels?.[plan.id]?.studio || 'unclassified',
      stream: plan.stream || registry.labels?.[plan.id]?.stream || 'unclassified',
      plan_type: plan.plan_type || registry.labels?.[plan.id]?.plan_type || 'unclassified',
      title: plan.title || registry.labels?.[plan.id]?.label || plan.id,
    });
  }
  return map;
}

function parseArgs(argv) {
  const opts = {
    plan: null,
    studio: null,
    stream: null,
    status: null,
    runner: null,
    format: 'standard',
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--plan') opts.plan = argv[++i] || null;
    else if (arg === '--studio') opts.studio = argv[++i] || null;
    else if (arg === '--stream') opts.stream = argv[++i] || null;
    else if (arg === '--status') opts.status = argv[++i] || null;
    else if (arg === '--runner') opts.runner = argv[++i] || null;
    else if (arg === '--json' || arg === '--format=json') opts.format = 'json';
    else if (arg === '--compact') opts.format = 'compact';
    else if (arg === '--standard') opts.format = 'standard';
    else if (arg === '--help' || arg === '-h') opts.help = true;
  }
  return opts;
}

function buildRecords() {
  const tasks = readJSONL(TASK_LEDGER);
  const plans = buildPlanMap();
  return tasks.map((task) => {
    const plan = plans.get(task.plan_id) || {};
    return {
      task_id: task.task_id || task.id || 'unknown-task',
      plan_id: task.plan_id || 'unknown-plan',
      title: task.title || task.summary || 'untitled',
      status: task.status || 'unknown',
      runner: task.runner || 'unassigned',
      next_action: task.next_action || '-',
      studio: plan.studio || 'unclassified',
      stream: plan.stream || 'unclassified',
      plan_type: plan.plan_type || 'unclassified',
      plan_title: plan.title || task.plan_id || 'unknown-plan',
      priority: task.priority || 'unknown',
    };
  });
}

function filterRecords(records, opts) {
  return records.filter((record) => {
    if (opts.plan && normalize(record.plan_id) !== normalize(opts.plan)) return false;
    if (opts.studio && normalize(record.studio) !== normalize(opts.studio)) return false;
    if (opts.stream && normalize(record.stream) !== normalize(opts.stream)) return false;
    if (opts.status && normalize(record.status) !== normalize(opts.status)) return false;
    if (opts.runner && normalize(record.runner) !== normalize(opts.runner)) return false;
    return true;
  });
}

function printStandard(records, opts) {
  const showPlanColumn = !opts.plan;
  if (showPlanColumn) {
    console.log('| Task | Plan | Studio | Stream | Status | Runner | Next action |');
    console.log('|---|---|---|---|---|---|---|');
    for (const record of records) {
      console.log(`| \`${record.task_id}\` | \`${record.plan_id}\` | ${record.studio} | ${record.stream} | ${record.status} | ${record.runner} | ${String(record.next_action).replace(/\|/g, '\\|')} |`);
    }
    return;
  }
  console.log('| Task | Studio | Stream | Status | Title | Runner | Next action |');
  console.log('|---|---|---|---|---|---|---|');
  for (const record of records) {
    console.log(`| \`${record.task_id}\` | ${record.studio} | ${record.stream} | ${record.status} | ${String(record.title).replace(/\|/g, '\\|')} | ${record.runner} | ${String(record.next_action).replace(/\|/g, '\\|')} |`);
  }
}

function printCompact(records, opts) {
  for (const record of records) {
    const cols = [record.task_id.padEnd(24)];
    if (!opts.plan) cols.push(record.plan_id.padEnd(38));
    cols.push(record.studio.padEnd(14));
    cols.push(record.stream.padEnd(14));
    cols.push(record.status.padEnd(12));
    cols.push(record.runner.padEnd(12));
    cols.push(record.title);
    console.log(cols.join('  '));
  }
}

function printHelp() {
  console.log('Usage: node scripts/plans/task-list.js [--plan <id>] [--studio <value>] [--stream <value>] [--status <value>] [--runner <value>] [--compact|--json]');
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return 0;
  }
  if (!fs.existsSync(TASK_LEDGER) || !fs.readFileSync(TASK_LEDGER, 'utf8').trim()) {
    console.log('No task records yet.');
    console.log('Seed source: plans/registry.json');
    console.log('Next: promote plan tasks into tasks/tasks.jsonl with plan_id, task_id, runner, status, proof_required.');
    return 0;
  }
  const records = filterRecords(buildRecords(), opts);
  if (opts.format === 'json') {
    console.log(JSON.stringify(records, null, 2));
    return 0;
  }
  if (opts.format === 'compact') printCompact(records, opts);
  else printStandard(records, opts);
  return 0;
}

process.exit(main());
