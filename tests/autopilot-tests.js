'use strict';

const assert = require('assert');

const { evaluateRunHealth } = require('../lib/famtastic/autopilot');

(function run() {
  const productive = evaluateRunHealth([
    { action: 'read-file', ok: true },
    { action: 'edit-file', ok: true },
    { action: 'run-test', ok: true },
    { action: 'update-doc', ok: true },
  ]);
  assert.strictEqual(productive.status, 'productive');
  assert.strictEqual(productive.metrics.successRate, 1);

  const suspicious = evaluateRunHealth([
    { action: 'read-file', ok: true },
    { action: 'read-file', ok: true },
    { action: 'run-test', ok: false },
    { action: 'read-file', ok: true },
  ]);
  assert.strictEqual(suspicious.status, 'suspicious');
  assert.ok(suspicious.metrics.diversity < 0.75);

  const stuck = evaluateRunHealth([
    { action: 'run-test', ok: false },
    { action: 'run-test', ok: false },
    { action: 'run-test', ok: false },
    { action: 'run-test', ok: false },
  ]);
  assert.strictEqual(stuck.status, 'stuck');
  assert.strictEqual(stuck.metrics.repeatedStreak, 4);

  console.log('autopilot-tests: PASS');
})();
