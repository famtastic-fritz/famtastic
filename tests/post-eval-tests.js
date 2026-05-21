'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const {
  buildPostEval,
  recordPostEval,
  listPostEvalRecords,
  extractPhaseOneOpportunitySeeds,
} = require('../lib/famtastic/post-eval');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

(async function run() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'famtastic-post-eval-'));
  const root = path.join(tmp, 'data-center');
  const hubRoot = path.join(tmp, 'hub');
  fs.mkdirSync(hubRoot, { recursive: true });

  const evaluation = buildPostEval({
    run: {
      id: 'phase1-foundation',
      title: 'Phase 1 Waves 1-7 Foundation',
      kind: 'phase_closeout',
      system: 'shay_famtastic',
      status: 'completed',
    },
    inputs: [
      'shay-shay/observations/SHAY-PHASE1-WAVES1-7-CLOSEOUT-2026-05-21.md',
      'shay-shay/.shay/plans/2026-05-21_phase2-visual-workflows-brand-systems.md',
    ],
    outputs: [
      'lib/famtastic/data-center/index.js',
      'lib/famtastic/site-quality-flow/index.js',
    ],
    proof: [
      { kind: 'test', command: 'node tests/site-quality-flow-tests.js', status: 'pass' },
      { kind: 'research_job', job_id: 'research-post-eval', citations: 8, status: 'completed' },
    ],
    learnings: [
      'Phase 2 should start with Media Studio logo/brand workflow, not Mission Control.',
      'Post-evaluation must be mandatory across platform components.',
      'Component Studio should support build-time full-match and partial-piece reuse.',
    ],
    gaps: [
      'No polished visual agent workflow yet.',
      'No full cross-studio async broker yet.',
    ],
    opportunities: [
      { type: 'skill_opportunity', title: 'Research-first SDD for FAMtastic workflows', priority: 'high' },
      { type: 'media_recipe_opportunity', title: 'FAMtastic logo variant prompt recipe', priority: 'high' },
      { type: 'process_opportunity', title: 'Mandatory post-eval closeout for all studio jobs', priority: 'high' },
    ],
    nextActions: [
      'Create Phase 2A FAMtastic logo/brand workflow spec.',
    ],
  });

  assert.strictEqual(evaluation.type, 'post_evaluation');
  assert.strictEqual(evaluation.run.id, 'phase1-foundation');
  assert.strictEqual(evaluation.opportunities.length, 3);
  assert.ok(evaluation.opportunities.every(item => item.opportunity_id), 'opportunities should have stable ids');
  assert.ok(evaluation.summary.includes('Phase 1 Waves 1-7 Foundation'));

  const recorded = recordPostEval({ root, hubRoot, evaluation });
  assert.ok(fs.existsSync(recorded.file), 'expected post-eval record file');
  assert.ok(fs.existsSync(recorded.reportFile), 'expected post-eval report');
  assert.ok(fs.existsSync(recorded.ledgerFile), 'expected post-eval ledger');
  assert.ok(recorded.record.evaluation_id.startsWith('posteval_'));

  const saved = readJson(recorded.file);
  assert.strictEqual(saved.run.id, 'phase1-foundation');
  assert.ok(saved.proof.length >= 2);

  const records = listPostEvalRecords({ root });
  assert.strictEqual(records.length, 1);
  assert.strictEqual(records[0].run.id, 'phase1-foundation');

  const seeds = extractPhaseOneOpportunitySeeds({
    phaseOneCloseoutText: 'Media Studio dry-run planning. Component Studio search-before-build. Mission Control reader. No polished screens. Post-evaluation mandatory.',
    phaseTwoPlanText: 'Media Studio through logo and brand. Site Studio useful build/edit. Component Studio repeated needs. Mission Control visual orchestration. Data Center/Research Center/Second Brain visual UI.',
  });
  assert.ok(seeds.find(item => item.type === 'media_recipe_opportunity'), 'expected media recipe seed');
  assert.ok(seeds.find(item => item.type === 'component_opportunity'), 'expected component seed');
  assert.ok(seeds.find(item => item.type === 'skill_opportunity'), 'expected skill seed');

  console.log('post-eval-tests: PASS');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
