'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const { runCheck, parseArgs } = require('../scripts/witness-check');
const { readWitnessRecords } = require('../lib/famtastic/data-center');

(function run() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'famtastic-witness-tests-'));
  const root = path.join(tmp, 'data-center');

  const args = parseArgs(['node', 'scripts/witness-check.js', '--check', 'data-center-smoke', '--json']);
  assert.strictEqual(args.check, 'data-center-smoke');
  assert.strictEqual(args.json, true);

  const dataCenterResult = runCheck('data-center-smoke', root);
  assert.strictEqual(dataCenterResult.status, 'pass');
  assert.strictEqual(dataCenterResult.metadata.directoryCount >= 13, true);

  const exportResult = runCheck('second-brain-export-smoke', root);
  assert.strictEqual(exportResult.status, 'pass');
  assert.strictEqual(exportResult.metadata.noteExists, true);
  assert.strictEqual(exportResult.metadata.canvasExists, true);

  const records = readWitnessRecords({ root, capability: 'second-brain-export-smoke' });
  assert.strictEqual(records.length, 1);
  assert.strictEqual(records[0].baseline, null);

  const nextDataCenterResult = runCheck('data-center-smoke', root);
  assert.strictEqual(nextDataCenterResult.baseline.previousStatus, 'pass');
  assert.ok(typeof nextDataCenterResult.baseline.deltaDurationMs === 'number');

  console.log('witness-check-tests: PASS');
})();
