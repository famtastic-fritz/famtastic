'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const {
  ensureDataCenter,
  appendWitnessRecord,
  readWitnessRecords,
  createResearchJob,
} = require('../lib/famtastic/data-center');
const { exportResearchJobToVault } = require('../lib/famtastic/second-brain');

function parseArgs(argv) {
  const args = { check: 'all', root: null, json: false };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--check') { args.check = next || 'all'; i++; }
    else if (arg === '--root') { args.root = next; i++; }
    else if (arg === '--json') { args.json = true; }
  }
  return args;
}

function capabilityBaseline(records) {
  if (!records.length) return null;
  const last = records[records.length - 1];
  return {
    previousIssuedAt: last.issuedAt,
    previousStatus: last.status,
    previousDurationMs: last.durationMs,
    deltaDurationMs: null,
  };
}

function finalizeBaseline(baseline, durationMs) {
  if (!baseline) return null;
  return {
    ...baseline,
    deltaDurationMs: durationMs - baseline.previousDurationMs,
  };
}

function runCheck(name, root) {
  const started = Date.now();
  const previous = readWitnessRecords({ root, capability: name });
  const baseline = capabilityBaseline(previous);
  let status = 'pass';
  let metadata = {};

  if (name === 'data-center-smoke') {
    const ensured = ensureDataCenter({ root });
    metadata = {
      ensuredRoot: ensured.root,
      directoryCount: ensured.dirs.length,
    };
  } else if (name === 'second-brain-export-smoke') {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'famtastic-witness-'));
    const dataRoot = path.join(tmp, 'data-center');
    const vaultRoot = path.join(tmp, 'vault');
    ensureDataCenter({ root: dataRoot });
    const job = createResearchJob({
      root: dataRoot,
      id: 'research-witness-export',
      title: 'Witness Export Smoke',
      source: 'witness',
    });
    const proof = {
      job_id: job.id,
      source: 'witness',
      citation_count: 1,
      search_result_count: 1,
      citations: ['https://example.com/witness'],
      answer_excerpt: 'Witness export smoke path.',
    };
    fs.writeFileSync(path.join(dataRoot, 'jobs', job.id, 'outputs', 'research-proof.json'), JSON.stringify(proof, null, 2) + '\n', 'utf8');
    const exported = exportResearchJobToVault({ dataRoot, vaultRoot, jobId: job.id });
    metadata = {
      noteExists: fs.existsSync(exported.notePath),
      canvasExists: fs.existsSync(exported.canvasPath),
    };
    if (!metadata.noteExists || !metadata.canvasExists) throw new Error('second-brain export missing artifact');
  } else if (name === 'research-router-metadata-test') {
    const result = spawnSync('npm', ['test', '--', '--run', 'tests/research-router.test.js'], {
      cwd: path.join(process.cwd(), 'site-studio'),
      encoding: 'utf8',
    });
    metadata = {
      exitCode: result.status,
      command: 'npm test -- --run tests/research-router.test.js',
    };
    if (result.status !== 0) {
      status = 'fail';
      metadata.stderr = (result.stderr || '').trim().slice(0, 500);
      throw new Error(`research-router test failed with exit ${result.status}`);
    }
  } else {
    throw new Error(`Unknown check: ${name}`);
  }

  const durationMs = Date.now() - started;
  const witness = appendWitnessRecord({
    root,
    capability: name,
    status,
    durationMs,
    metadata,
    baseline: finalizeBaseline(baseline, durationMs),
  });
  return witness.record;
}

function main() {
  const args = parseArgs(process.argv);
  const root = args.root ? path.resolve(args.root) : ensureDataCenter().root;
  const checks = args.check === 'all'
    ? ['data-center-smoke', 'second-brain-export-smoke', 'research-router-metadata-test']
    : [args.check];

  const results = [];
  for (const check of checks) results.push(runCheck(check, root));

  if (args.json) {
    console.log(JSON.stringify({ ok: true, results }, null, 2));
    return;
  }

  for (const result of results) {
    console.log(`${result.capability}: ${result.status} (${result.durationMs}ms)`);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = {
  parseArgs,
  runCheck,
};
