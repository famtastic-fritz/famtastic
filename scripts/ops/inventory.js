#!/usr/bin/env node
/**
 * scripts/ops/inventory.js
 *
 * Produces a JSON snapshot of every Ops ledger with real counts and
 * a freshness breakdown. Output: docs/ops/inventory-YYYY-MM-DD.json.
 *
 * Usage:
 *   node scripts/ops/inventory.js               # writes today's snapshot
 *   node scripts/ops/inventory.js --stdout      # also prints to stdout
 *   node scripts/ops/inventory.js --date=YYYY-MM-DD  # custom dated filename
 *
 * The script is the sole writer of debt-inventory snapshots per the
 * source-of-truth matrix in docs/ops/state-contract.md.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { deriveFreshness } = require('../../site-studio/lib/ops-freshness');

const ROOT = path.resolve(__dirname, '..', '..');

function readJsonl(relPath) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) return { exists: false, lines: [] };
  const text = fs.readFileSync(abs, 'utf8');
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  const records = [];
  for (const line of lines) {
    try { records.push(JSON.parse(line)); } catch (_) { /* skip malformed */ }
  }
  return { exists: true, lines: records };
}

function ageSeconds(record, fields) {
  for (const f of fields) {
    if (record[f]) {
      const t = Date.parse(record[f]);
      if (!Number.isNaN(t)) return Math.max(0, Math.floor((Date.now() - t) / 1000));
    }
  }
  return Number.MAX_SAFE_INTEGER;
}

function summarizeLedger(records, recordType, ageFields) {
  const byStatus = {};
  const byFreshness = { live: 0, idle: 0, stale: 0, parked: 0, archived: 0 };
  for (const r of records) {
    const status = r.status || 'unknown';
    byStatus[status] = (byStatus[status] || 0) + 1;
    const age = ageSeconds(r, ageFields);
    const freshness = deriveFreshness(recordType, status, age);
    byFreshness[freshness] = (byFreshness[freshness] || 0) + 1;
  }
  return { count: records.length, by_status: byStatus, by_freshness: byFreshness };
}

function findLegacyQueueFiles() {
  const candidates = [];
  for (const name of fs.readdirSync(ROOT)) {
    if (name.startsWith('.worker-queue') && name.endsWith('.jsonl')) {
      candidates.push(name);
    }
  }
  return candidates.sort();
}

function buildSnapshot() {
  const generatedAt = new Date().toISOString();
  const ageFieldsByType = {
    job: ['updated_at', 'queued_at', 'created_at', 'at'],
    task: ['updated_at', 'created_at'],
    run: ['updated_at', 'started_at'],
    proof: ['recorded_at'],
    plan: ['updated_at', 'created_at'],
    review: ['updated_at', 'created_at'],
    gap: ['updated_at', 'logged_at', 'created_at'],
    legacy_queue: ['queued_at', 'created_at', 'at'],
  };

  const sources = {};

  const jobs = readJsonl('jobs/jobs.jsonl');
  sources.job = {
    authoritative_file: 'jobs/jobs.jsonl',
    file_exists: jobs.exists,
    ...summarizeLedger(jobs.lines, 'job', ageFieldsByType.job),
  };

  const tasks = readJsonl('tasks/tasks.jsonl');
  sources.task = {
    authoritative_file: 'tasks/tasks.jsonl',
    file_exists: tasks.exists,
    ...summarizeLedger(tasks.lines, 'task', ageFieldsByType.task),
  };

  const runs = readJsonl('runs/runs.jsonl');
  sources.run = {
    authoritative_file: 'runs/runs.jsonl',
    file_exists: runs.exists,
    ...summarizeLedger(runs.lines, 'run', ageFieldsByType.run),
  };

  const proofs = readJsonl('proofs/proof-ledger.jsonl');
  sources.proof = {
    authoritative_file: 'proofs/proof-ledger.jsonl',
    file_exists: proofs.exists,
    ...summarizeLedger(proofs.lines, 'proof', ageFieldsByType.proof),
  };

  const gaps = readJsonl('docs/ops/gaps.jsonl');
  sources.gap = {
    authoritative_file: 'docs/ops/gaps.jsonl',
    file_exists: gaps.exists,
    ...summarizeLedger(gaps.lines, 'gap', ageFieldsByType.gap),
  };

  const reviews = readJsonl('reviews/reviews.jsonl');
  sources.review = {
    authoritative_file: 'reviews/reviews.jsonl',
    file_exists: reviews.exists,
    ...summarizeLedger(reviews.lines, 'review', ageFieldsByType.review),
  };

  // plan: read registry.json
  let plans = [];
  const registryPath = path.join(ROOT, 'plans/registry.json');
  if (fs.existsSync(registryPath)) {
    try {
      const reg = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      plans = Array.isArray(reg.plans) ? reg.plans : [];
    } catch (_) { /* ignore */ }
  }
  sources.plan = {
    authoritative_file: 'plans/registry.json',
    file_exists: fs.existsSync(registryPath),
    ...summarizeLedger(plans, 'plan', ageFieldsByType.plan),
  };

  // legacy queue
  const legacyFiles = findLegacyQueueFiles();
  const legacyRecords = [];
  for (const f of legacyFiles) {
    const data = readJsonl(f);
    legacyRecords.push(...data.lines);
  }
  sources.legacy_queue = {
    authoritative_file: legacyFiles.length ? legacyFiles : '(none)',
    file_exists: legacyFiles.length > 0,
    ...summarizeLedger(legacyRecords, 'legacy_queue', ageFieldsByType.legacy_queue),
  };

  return {
    snapshot_version: `ops-${generatedAt}`,
    generated_at: generatedAt,
    schema_version: '1',
    sources,
    totals: {
      total_records: Object.values(sources).reduce((a, s) => a + (s.count || 0), 0),
      live_records: Object.values(sources).reduce((a, s) => a + (s.by_freshness?.live || 0), 0),
      stale_records: Object.values(sources).reduce((a, s) => a + (s.by_freshness?.stale || 0), 0),
      parked_records: Object.values(sources).reduce((a, s) => a + (s.by_freshness?.parked || 0), 0),
      archived_records: Object.values(sources).reduce((a, s) => a + (s.by_freshness?.archived || 0), 0),
    },
  };
}

function main() {
  const args = process.argv.slice(2);
  const dateArg = (args.find(a => a.startsWith('--date=')) || '').split('=')[1];
  const stdout = args.includes('--stdout');
  const date = dateArg || new Date().toISOString().slice(0, 10);
  const snapshot = buildSnapshot();
  const outPath = path.join(ROOT, 'docs', 'ops', `inventory-${date}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + '\n');
  if (stdout) process.stdout.write(JSON.stringify(snapshot, null, 2) + '\n');
  console.error(`[ops:inventory] wrote ${path.relative(ROOT, outPath)} — ${snapshot.totals.total_records} records (live=${snapshot.totals.live_records} stale=${snapshot.totals.stale_records} parked=${snapshot.totals.parked_records} archived=${snapshot.totals.archived_records})`);
}

if (require.main === module) main();

module.exports = { buildSnapshot };
