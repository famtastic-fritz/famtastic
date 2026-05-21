'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const {
  ensureDataCenter,
  createResearchJob,
  appendWitnessRecord,
  appendLedgerRecord,
  upsertClaimRecord,
  upsertDecisionRecord,
} = require('../lib/famtastic/data-center');

const { buildMissionControlSnapshot } = require('../lib/famtastic/mission-control');
const { recordPostEval, buildPostEval } = require('../lib/famtastic/post-eval');
const { parseArgs, renderText } = require('../scripts/mission-control-report');

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

(function run() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'famtastic-mission-control-'));
  const root = path.join(tmp, 'data-center');
  const hubRoot = path.join(tmp, 'hub');
  fs.mkdirSync(path.join(hubRoot, 'captures', 'inbox'), { recursive: true });
  fs.mkdirSync(path.join(hubRoot, 'proofs'), { recursive: true });
  ensureDataCenter({ root });

  const freshJob = createResearchJob({
    root,
    id: 'research-fresh',
    title: 'Fresh research lane',
    source: 'perplexity',
    status: 'running',
  });
  const staleJob = createResearchJob({
    root,
    id: 'research-stale-blocked',
    title: 'Blocked stale lane',
    source: 'swarm',
    status: 'blocked',
  });
  writeJson(path.join(root, 'jobs', freshJob.id, 'job.json'), {
    ...freshJob,
    updated_at: '2026-05-20T12:00:00.000Z',
    needs_fritz: false,
  });
  writeJson(path.join(root, 'jobs', staleJob.id, 'job.json'), {
    ...staleJob,
    updated_at: '2026-05-12T12:00:00.000Z',
    needs_fritz: true,
    blocker: 'Needs budget approval',
  });
  writeJson(path.join(root, 'jobs', freshJob.id, 'outputs', 'research-proof.json'), {
    ok: true,
    summary: 'Fresh proof artifact',
  });

  appendWitnessRecord({
    root,
    capability: 'data-center-smoke',
    status: 'pass',
    durationMs: 2,
    issuedAt: '2026-05-20T12:05:00.000Z',
    metadata: { command: 'node scripts/witness-check.js --check data-center-smoke' },
  });
  appendWitnessRecord({
    root,
    capability: 'research-router-metadata-test',
    status: 'fail',
    durationMs: 5,
    issuedAt: '2026-05-13T12:05:00.000Z',
    metadata: { command: 'node site-studio/tests/research-router.test.js' },
  });

  const claim = upsertClaimRecord({
    root,
    record: {
      statement: 'Mission Control must remain a reader over Data Center records.',
      status: 'supported',
      confidence: 0.95,
      tags: ['wave4'],
    },
  });
  const decision = upsertDecisionRecord({
    root,
    record: {
      title: 'Do not create a second knowledge store for Mission Control',
      status: 'accepted',
      claim_ids: [claim.record.claim_id],
      spec_ids: ['specs/004-mission-control-observability/spec.md'],
    },
  });

  appendLedgerRecord({
    root,
    ledger: 'research-events',
    record: {
      event: 'human_input.requested',
      job_id: staleJob.id,
      question: 'Approve next paid research lane?',
    },
  });
  appendLedgerRecord({
    root,
    ledger: 'research-events',
    record: {
      event: 'job.blocked',
      job_id: staleJob.id,
      reason: 'Needs budget approval',
    },
  });
  appendLedgerRecord({
    root,
    ledger: 'proof-ledger',
    record: {
      proof_id: 'proof_cli_snapshot',
      title: 'CLI snapshot proof',
      path: 'shay-shay/observations/example-proof.md',
      status: 'pass',
    },
  });

  recordPostEval({
    root,
    hubRoot,
    evaluation: buildPostEval({
      run: { id: 'phase1-foundation', title: 'Phase 1 Foundation', status: 'completed' },
      learnings: ['Post-eval should be mandatory.'],
      gaps: ['Visual workflows are not done.'],
      opportunities: [
        { type: 'skill_opportunity', title: 'Research-first SDD workflow', priority: 'high' },
        { type: 'media_recipe_opportunity', title: 'Logo prompt recipe', priority: 'high' },
      ],
    }),
  });

  fs.writeFileSync(path.join(hubRoot, 'captures', 'inbox', 'raw.md'), '# raw capture\n', 'utf8');

  const snapshot = buildMissionControlSnapshot({
    root,
    hubRoot,
    now: '2026-05-20T12:10:00.000Z',
    staleAfterHours: 24,
  });

  assert.strictEqual(snapshot.data_center.root, root);
  assert.strictEqual(snapshot.summary.research_jobs.total, 2);
  assert.strictEqual(snapshot.summary.research_jobs.blocked, 1);
  assert.strictEqual(snapshot.summary.witness_checks.failing, 1);
  assert.strictEqual(snapshot.summary.claims.total, 1);
  assert.strictEqual(snapshot.summary.decisions.total, 1);
  assert.strictEqual(snapshot.summary.needs_fritz.total, 2);
  assert.strictEqual(snapshot.summary.stale_or_blocked.total, 2);
  assert.ok(snapshot.research_jobs.find(job => job.id === 'research-stale-blocked').is_stale, 'blocked job should be stale');
  assert.strictEqual(snapshot.witness_checks[0].capability, 'data-center-smoke', 'witness checks are sorted by latest issue time desc');
  assert.strictEqual(snapshot.claims[0].claim_id, claim.record.claim_id);
  assert.strictEqual(snapshot.decisions[0].decision_id, decision.record.decision_id);
  assert.ok(snapshot.needs_fritz.some(item => item.kind === 'research_job' && item.id === staleJob.id));
  assert.ok(snapshot.needs_fritz.some(item => item.kind === 'ledger_event' && item.event === 'human_input.requested'));
  assert.ok(snapshot.stale_or_blocked.some(item => item.kind === 'witness_check' && item.id === 'research-router-metadata-test'));
  assert.ok(snapshot.proofs.some(item => item.kind === 'job_output' && item.path.endsWith('research-proof.json')));
  assert.ok(snapshot.proofs.some(item => item.kind === 'ledger_proof' && item.id === 'proof_cli_snapshot'));
  assert.strictEqual(snapshot.summary.proofs.total, 2);
  assert.strictEqual(snapshot.summary.sources.total, 0);
  assert.strictEqual(snapshot.summary.post_eval.total, 1);
  assert.strictEqual(snapshot.summary.post_eval.opportunities, 2);
  assert.ok(snapshot.post_eval[0].opportunities.some(item => item.type === 'skill_opportunity'));

  const args = parseArgs(['node', 'scripts/mission-control-report.js', '--json', '--root', root, '--hub-root', hubRoot]);
  assert.strictEqual(args.json, true);
  assert.strictEqual(args.root, root);
  assert.strictEqual(args.hubRoot, hubRoot);

  const text = renderText(snapshot);
  assert.ok(text.includes('Mission Control'));
  assert.ok(text.includes('Research jobs: 2'));
  assert.ok(text.includes('Witness checks: 2'));
  assert.ok(text.includes('Needs Fritz: 2'));
  assert.ok(text.includes('Proofs: 2'));
  assert.ok(text.includes('Post-evals: 1'));
  assert.ok(text.includes('Research-first SDD workflow') || text.includes('Phase 1 Foundation'));
  assert.strictEqual(snapshot.raw_capture_inbox.total, 1, 'raw capture inbox should be counted, not moved');

  console.log('mission-control-tests: PASS');
})();
