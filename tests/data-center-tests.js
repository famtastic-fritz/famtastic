'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const {
  ensureDataCenter,
  createResearchJob,
  appendLedgerRecord,
  appendWitnessRecord,
  readWitnessRecords,
  listCaptureInbox,
  sanitizeRecord,
  ingestCaptureSources,
  listSourceRecords,
  readSourceRecord,
  upsertClaimRecord,
  readClaimRecord,
  upsertDecisionRecord,
  readDecisionRecord,
} = require('../lib/famtastic/data-center');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readJsonl(file) {
  return fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
}

(async function run() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'famtastic-data-center-'));
  const root = path.join(tmp, 'data-center');
  const hubRoot = path.join(tmp, 'hub');
  fs.mkdirSync(path.join(hubRoot, 'captures', 'inbox'), { recursive: true });
  fs.mkdirSync(path.join(hubRoot, 'captures', 'review'), { recursive: true });

  fs.writeFileSync(path.join(hubRoot, 'captures', 'inbox', 'sample.md'), '# sample capture\n\nThis is an inbox capture.');
  fs.writeFileSync(path.join(hubRoot, 'captures', 'review', 'review.json'), JSON.stringify({
    capture_id: 'review-capture',
    summary: 'Review queue record with pplx-secret-should-not-survive',
    api_key: 'sk-1234567890abcdefghijklmnopqrstuvwxyz',
  }, null, 2));

  const ensured = ensureDataCenter({ root });
  for (const dir of ['sources', 'jobs', 'ledgers', 'witness', 'claims', 'citations', 'decisions', 'artifacts', 'graphs', 'reports', 'post-eval', 'schemas', 'cache', 'exports']) {
    assert.ok(fs.existsSync(path.join(root, dir)), `expected ${dir} directory`);
  }
  assert.ok(fs.existsSync(path.join(root, 'schemas', 'research-job.schema.json')), 'expected research-job schema');
  assert.ok(fs.existsSync(path.join(root, 'schemas', 'capability-witness.schema.json')), 'expected capability witness schema');
  assert.ok(fs.existsSync(path.join(root, 'schemas', 'source-record.schema.json')), 'expected source schema');
  assert.ok(fs.existsSync(path.join(root, 'schemas', 'claim-record.schema.json')), 'expected claim schema');
  assert.ok(fs.existsSync(path.join(root, 'schemas', 'decision-record.schema.json')), 'expected decision schema');
  assert.ok(fs.existsSync(path.join(root, 'schemas', 'post-eval-record.schema.json')), 'expected post-eval schema');
  assert.strictEqual(ensured.root, root);

  const job = createResearchJob({
    root,
    title: 'Research dog image prompts',
    source: 'test',
    budget: { maxUsd: 0.01 },
  });
  assert.ok(job.id.startsWith('research-'), 'job id should be research-prefixed');
  for (const dir of ['uploads', 'workspace', 'outputs', 'sources']) {
    assert.ok(fs.existsSync(path.join(root, 'jobs', job.id, dir)), `expected job ${dir}`);
  }
  assert.ok(fs.existsSync(path.join(root, 'jobs', job.id, 'events.jsonl')), 'expected job event ledger');
  assert.ok(fs.existsSync(path.join(root, 'jobs', job.id, 'report.md')), 'expected job report');

  const ledgerFile = appendLedgerRecord({
    root,
    ledger: 'research-events',
    record: {
      event: 'query.completed',
      api_key: 'pplx-secret-should-not-survive',
      nested: { Authorization: 'Bearer should-redact' },
      citation_count: 2,
    },
  });
  const records = readJsonl(ledgerFile);
  assert.strictEqual(records.length, 1);
  assert.strictEqual(records[0].api_key, '[REDACTED]');
  assert.strictEqual(records[0].nested.Authorization, '[REDACTED]');
  assert.strictEqual(records[0].citation_count, 2);
  assert.ok(records[0].ts, 'ledger records should include timestamp');

  const inbox = listCaptureInbox({ hubRoot });
  assert.deepStrictEqual(inbox.map(item => item.relative_path), ['captures/inbox/sample.md']);
  assert.strictEqual(inbox[0].kind, 'capture_markdown');

  assert.deepStrictEqual(sanitizeRecord({ token: 'sk-1234567890abcdefghijklmnopqrstuvwxyz', safe: 'ok' }), {
    token: '[REDACTED]',
    safe: 'ok',
  });

  const witness = appendWitnessRecord({
    root,
    capability: 'research-router-metadata-test',
    status: 'pass',
    durationMs: 12,
    metadata: {
      api_key: 'sk-1234567890abcdefghijklmnopqrstuvwxyz',
      command: 'node tests/research-router.test.js',
    },
    baseline: {
      previousIssuedAt: '2026-05-19T00:00:00.000Z',
      previousStatus: 'pass',
      previousDurationMs: 10,
      deltaDurationMs: 2,
    },
  });
  assert.ok(witness.file.endsWith(path.join('witness', 'research-router-metadata-test.jsonl')));
  const witnessRecords = readWitnessRecords({ root, capability: 'research-router-metadata-test' });
  assert.strictEqual(witnessRecords.length, 1);
  assert.strictEqual(witnessRecords[0].status, 'pass');
  assert.strictEqual(witnessRecords[0].metadata.api_key, '[REDACTED]');
  assert.strictEqual(witnessRecords[0].baseline.deltaDurationMs, 2);
  assert.ok(witnessRecords[0].issuedAt, 'witness records should include issuedAt');

  const dryRun = ingestCaptureSources({ root, hubRoot, dryRun: true });
  assert.strictEqual(dryRun.scanned, 2);
  assert.strictEqual(dryRun.created, 2);
  assert.strictEqual(dryRun.updated, 0);
  assert.strictEqual(dryRun.unchanged, 0);
  assert.strictEqual(listSourceRecords({ root }).length, 0, 'dry run must not write source records');

  const firstIngest = ingestCaptureSources({ root, hubRoot });
  assert.strictEqual(firstIngest.scanned, 2);
  assert.strictEqual(firstIngest.created, 2);
  assert.strictEqual(firstIngest.updated, 0);
  assert.strictEqual(firstIngest.unchanged, 0);

  const sources = listSourceRecords({ root });
  assert.strictEqual(sources.length, 2);
  const inboxSource = sources.find(record => record.queue === 'inbox');
  const reviewSource = sources.find(record => record.queue === 'review');
  assert.ok(inboxSource, 'expected inbox source record');
  assert.ok(reviewSource, 'expected review source record');
  assert.strictEqual(inboxSource.provenance.layer, 'capture_raw_box');
  assert.strictEqual(reviewSource.provenance.queue, 'review');
  assert.ok(!JSON.stringify(reviewSource).includes('pplx-secret-should-not-survive'), 'source record must redact token-like values');
  assert.ok(!JSON.stringify(reviewSource).includes('sk-1234567890abcdefghijklmnopqrstuvwxyz'), 'source record must redact secret values');

  const sourceReadback = readSourceRecord({ root, sourceId: inboxSource.source_id });
  assert.strictEqual(sourceReadback.relative_path, 'captures/inbox/sample.md');

  const secondIngest = ingestCaptureSources({ root, hubRoot });
  assert.strictEqual(secondIngest.created, 0);
  assert.strictEqual(secondIngest.updated, 0);
  assert.strictEqual(secondIngest.unchanged, 2, 'second ingest should be idempotent');

  const claim = upsertClaimRecord({
    root,
    record: {
      statement: 'Research-before-build is the default for page-type-shaped problems.',
      source_ids: [inboxSource.source_id, reviewSource.source_id],
      confidence: 0.92,
      status: 'supported',
      tags: ['wave3', 'process'],
      provenance: { layer: 'data_center', origin: 'test' },
    },
  });
  const savedClaim = readClaimRecord({ root, claimId: claim.record.claim_id });
  assert.strictEqual(savedClaim.source_ids.length, 2);
  assert.strictEqual(savedClaim.status, 'supported');

  const decision = upsertDecisionRecord({
    root,
    record: {
      title: 'Preserve captures/inbox and captures/review as the raw capture box',
      rationale: 'Wave 3 must build the knowledge layer on top of the raw capture box rather than duplicating it.',
      status: 'accepted',
      source_ids: [inboxSource.source_id],
      claim_ids: [claim.record.claim_id],
      spec_ids: ['specs/003-data-center-knowledge-layer/spec.md'],
      provenance: { layer: 'data_center', origin: 'test' },
    },
  });
  const savedDecision = readDecisionRecord({ root, decisionId: decision.record.decision_id });
  assert.deepStrictEqual(savedDecision.claim_ids, [claim.record.claim_id]);
  assert.deepStrictEqual(savedDecision.source_ids, [inboxSource.source_id]);
  assert.deepStrictEqual(savedDecision.spec_ids, ['specs/003-data-center-knowledge-layer/spec.md']);

  const sourceIndex = readJson(path.join(root, 'sources', 'index.json'));
  assert.strictEqual(Object.keys(sourceIndex.records).length, 2);

  console.log('data-center-tests: PASS');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
