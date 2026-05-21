'use strict';

const fs = require('fs');
const path = require('path');

const {
  buildPostEval,
  recordPostEval,
  extractPhaseOneOpportunitySeeds,
} = require('../lib/famtastic/post-eval');

function hubRoot() {
  return path.resolve(__dirname, '..');
}

function readText(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return ''; }
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function listResearchProofs(root) {
  const jobsDir = path.join(root, 'data-center', 'jobs');
  if (!fs.existsSync(jobsDir)) return [];
  return fs.readdirSync(jobsDir)
    .filter(name => name.startsWith('research-'))
    .sort()
    .map(jobId => {
      const proofFile = path.join(jobsDir, jobId, 'outputs', 'research-proof.json');
      const jobFile = path.join(jobsDir, jobId, 'job.json');
      const proof = readJson(proofFile);
      const job = readJson(jobFile) || {};
      if (!proof) return null;
      return {
        kind: 'research_job',
        job_id: jobId,
        title: job.title || jobId,
        source: proof.source,
        status: proof.ok ? 'completed' : 'failed',
        citations: proof.citation_count || 0,
        search_results: proof.search_result_count || 0,
        usage: proof.usage || null,
        path: path.relative(root, proofFile).split(path.sep).join('/'),
      };
    })
    .filter(Boolean)
    .filter(item => /post-eval|logo|website builder|component|brand|phase|workflow|studio/i.test(`${item.job_id} ${item.title}`))
    .slice(-12);
}

function uniqueOpportunities(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = `${item.type}:${item.title}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function buildPhaseOnePostEval(options = {}) {
  const root = options.hubRoot || hubRoot();
  const closeoutPath = path.join(root, 'shay-shay', 'observations', 'SHAY-PHASE1-WAVES1-7-CLOSEOUT-2026-05-21.md');
  const phaseTwoPath = path.join(root, 'shay-shay', '.shay', 'plans', '2026-05-21_phase2-visual-workflows-brand-systems.md');
  const closeoutText = readText(closeoutPath);
  const phaseTwoText = readText(phaseTwoPath);
  const researchProofs = listResearchProofs(root);
  const researchProofIds = researchProofs.map(item => item.job_id);

  const seedOpportunities = extractPhaseOneOpportunitySeeds({
    phaseOneCloseoutText: closeoutText,
    phaseTwoPlanText: phaseTwoText,
  });

  const anticipated = [
    { type: 'skill_opportunity', title: 'Research-first SDD closeout workflow', priority: 'high', suggested_action: 'Create or patch an umbrella skill after Phase 2A proves the logo workflow.' },
    { type: 'skill_opportunity', title: 'Media Studio brand/logo workflow', priority: 'high', suggested_action: 'Capture prompt refinement, variant comparison, approval, export, and DESIGN.md extraction steps.' },
    { type: 'skill_opportunity', title: 'Site Studio build/edit/enhance workflow', priority: 'high', suggested_action: 'Capture coconut-style site request flow with research packet, edit loop, media/component routing, and proof gates.' },
    { type: 'component_opportunity', title: 'Component decomposition before generation', priority: 'high', suggested_action: 'Turn slideshow/hero/gallery needs into component specs, full-match search, partial-piece search, and save-back rules.' },
    { type: 'media_recipe_opportunity', title: 'Research-backed asset prompt enhancer', priority: 'high', suggested_action: 'Use research/taste references to turn vague asset asks into detailed prompt variants with provenance.' },
    { type: 'routing_opportunity', title: 'Cross-studio request/response broker', priority: 'high', suggested_action: 'Formalize Site→Research/Media/Component and Component→Media calls after Phase 2A/2B screens are designed.' },
    { type: 'tool_opportunity', title: 'Visual workflow prototype surface', priority: 'medium', suggested_action: 'Use existing browser UI before Mission Control-first; surface Media/Site workflow proof where Fritz works.' },
    { type: 'research_opportunity', title: 'Second Brain promotion rules', priority: 'medium', suggested_action: 'Define which post-eval learnings become Data Center claims, Obsidian notes, memories, skills, or backlog tasks.' },
  ];

  const learnings = [
    'Phase 1 proved the backend foundation, but the next value unlock is visible Media/Site workflows anchored by the FAMtastic logo/brand system.',
    'Post-evaluation must be a required platform contract for Shay, Site Studio, Media Studio, Component Studio, Mission Control, Data Center, and future services.',
    'Research-first SDD should mean rough ask → research → sharper spec/prompt → plan/tasks → build → proof → post-eval → reusable learning.',
    'Phase 2 should treat skill/process/component/media-recipe opportunities as first-class outputs, not afterthoughts.',
  ];

  const gaps = [
    'Post-eval is now a shared local module/proof, but not yet automatically invoked by every studio/job endpoint.',
    'The Phase 2 Media Studio and Site Studio screens/workflows are planned but not yet implemented.',
    'No automatic promotion policy yet decides whether a post-eval opportunity becomes a skill, process rule, component, media recipe, Data Center claim, or Fritz review card.',
    'Mission Control can read post-eval records after this slice, but the visual surface is still later in Phase 2.',
  ];

  return buildPostEval({
    evaluation_id: 'posteval_phase1_20260521',
    created_at: '2026-05-21T17:21:30.198Z',
    run: {
      id: 'phase1-foundation-post-eval',
      title: 'Phase 1 Foundation Post-Evaluation and Phase 2 Opportunity Forecast',
      kind: 'phase_post_eval',
      system: 'shay_famtastic',
      status: 'completed',
    },
    inputs: [
      path.relative(root, closeoutPath).split(path.sep).join('/'),
      path.relative(root, phaseTwoPath).split(path.sep).join('/'),
      ...researchProofIds.map(id => `data-center/jobs/${id}/outputs/research-proof.json`),
    ],
    outputs: [
      'lib/famtastic/post-eval/index.js',
      'data-center/post-eval/<evaluation>.json',
      'data-center/reports/post-eval/<evaluation>.md',
    ],
    proof: [
      { kind: 'test', command: 'node tests/post-eval-tests.js', status: 'pass' },
      { kind: 'test', command: 'node tests/mission-control-tests.js', status: 'pass' },
      ...researchProofs,
    ],
    learnings,
    gaps,
    opportunities: uniqueOpportunities([...seedOpportunities, ...anticipated]),
    nextActions: [
      'Let Fritz choose which Phase 2A logo WIPs/references to load first.',
      'Create the Phase 2A research-first SDD packet for FAMtastic logo/brand workflow.',
      'After Phase 2A proves the workflow, create/publish the durable skill(s) rather than guessing too early.',
    ],
  });
}

function main() {
  const root = hubRoot();
  const evaluation = buildPhaseOnePostEval({ hubRoot: root });
  const result = recordPostEval({ root: path.join(root, 'data-center'), hubRoot: root, evaluation });
  console.log(JSON.stringify({
    ok: true,
    evaluation_id: result.record.evaluation_id,
    opportunities: result.record.opportunities.length,
    high_priority: result.record.opportunities.filter(item => item.priority === 'high').length,
    report: path.relative(root, result.reportFile).split(path.sep).join('/'),
    record: path.relative(root, result.file).split(path.sep).join('/'),
  }, null, 2));
}

if (require.main === module) main();

module.exports = { buildPhaseOnePostEval, listResearchProofs };
