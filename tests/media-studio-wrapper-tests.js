'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  resolveModelAlias,
  buildMuapiPlan,
  createMediaJob,
  appendAssetLedgerRecord,
} = require('../media-studio/lib');

const { buildMissionControlSnapshot } = require('../lib/famtastic/mission-control');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readJsonl(file) {
  return fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
}

(async function run() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'famtastic-media-studio-'));
  const hubRoot = tmp;
  const root = path.join(tmp, 'data-center');

  const imageRoute = resolveModelAlias({ intent: 'text-to-image' });
  assert.strictEqual(imageRoute.primary, 'flux-dev');
  assert.ok(imageRoute.fallbacks.includes('flux-kontext-max'));
  assert.deepStrictEqual(imageRoute.chain.slice(0, 2), ['flux-dev', 'flux-kontext-max']);

  const unavailableRoute = resolveModelAlias({
    intent: 'image-to-video',
    unavailableModels: ['wan2.2'],
  });
  assert.strictEqual(unavailableRoute.selected, 'wan2.1-i2v', 'should fall back when primary is unavailable');
  assert.ok(unavailableRoute.notes.some(note => /veo3-fast/i.test(note)), 'should preserve known veo3-fast mismatch note');

  const plan = buildMuapiPlan({
    root,
    title: 'Golden shepherd hero image',
    intent: 'hero-image',
    prompt: 'A golden shepherd running through a field with a little Black boy, cinematic family trust mood.',
    category: 'hero',
    mediaType: 'image',
    researchJobIds: ['research-proof-1'],
    budget: { maxUsd: 0, maxCredits: 0 },
    dryRun: true,
  });
  assert.strictEqual(plan.dry_run, true);
  assert.strictEqual(plan.provider, 'muapi');
  assert.strictEqual(plan.intent, 'hero-image');
  assert.ok(plan.prompt_hash && plan.prompt_hash.length === 64);
  assert.ok(plan.command_preview.includes('muapi'));
  assert.ok(!plan.command_preview.includes(plan.prompt), 'command preview should not inline long prompt text');
  assert.strictEqual(plan.would_spend, false, 'dry-run plan must not spend credits');

  const job = createMediaJob({ root, plan });
  assert.ok(job.id.startsWith('media-'));
  assert.strictEqual(job.status, 'planned');
  assert.strictEqual(job.provider, 'muapi');
  assert.ok(fs.existsSync(path.join(root, 'jobs', job.id, 'outputs', 'generation-proof.json')));

  const proof = readJson(path.join(root, 'jobs', job.id, 'outputs', 'generation-proof.json'));
  assert.strictEqual(proof.ok, true);
  assert.strictEqual(proof.dry_run, true);
  assert.strictEqual(proof.prompt_hash, plan.prompt_hash);
  assert.deepStrictEqual(proof.research_job_ids, ['research-proof-1']);

  const ledgerFile = appendAssetLedgerRecord({
    root,
    record: {
      event: 'asset.proofed',
      job_id: job.id,
      output_url: proof.output_url,
      prompt: plan.prompt,
      prompt_hash: plan.prompt_hash,
      provider: 'muapi',
      model: plan.model,
      category: 'hero',
      media_type: 'image',
      proof_path: path.join('data-center', 'jobs', job.id, 'outputs', 'generation-proof.json'),
      api_key: 'pplx-secret-should-not-survive',
    },
  });
  const records = readJsonl(ledgerFile);
  const proofedRecord = records.find(record => record.event === 'asset.proofed');
  assert.ok(proofedRecord, 'expected explicit asset.proofed record');
  assert.strictEqual(proofedRecord.ledger_kind, 'media_asset');
  assert.strictEqual(proofedRecord.api_key, '[REDACTED]');

  const snapshot = buildMissionControlSnapshot({ root, hubRoot, now: '2026-05-20T00:00:00.000Z' });
  assert.strictEqual(snapshot.summary.media_generations.total, 1);
  assert.strictEqual(snapshot.media_generations[0].id, job.id);
  assert.ok(snapshot.proofs.some(item => item.id === `${job.id}/generation-proof.json`));

  console.log('media-studio-wrapper-tests: PASS');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
