#!/usr/bin/env node
'use strict';
/**
 * CLI runner for characterization scenarios.
 *
 * Example:
 *   node runtime-vnext/harness/run-scenario.js single-page-build --site-tag=site-demo
 *
 * This invokes the OLD runtime and captures the result to
 * runtime-vnext/harness/cases/<scenario>/.
 */

const path = require('path');
const { CharacterizationHarness } = require('./characterization-harness');
const { getScenario } = require('./scenarios');

function parseArgs(argv) {
  const args = argv.slice(2);
  const scenarioName = args.find(a => !a.startsWith('--'));
  const siteTagArg = args.find(a => a.startsWith('--site-tag='));
  const siteTag = siteTagArg ? siteTagArg.split('=')[1] : process.env.SITE_TAG || 'site-demo';
  const outDirArg = args.find(a => a.startsWith('--out-dir='));
  const outDir = outDirArg ? outDirArg.split('=')[1] : path.join(__dirname, 'cases');
  return { scenarioName, siteTag, outDir };
}

async function main() {
  const { scenarioName, siteTag, outDir } = parseArgs(process.argv);

  if (!scenarioName) {
    console.error('Usage: node run-scenario.js <scenario-name> [--site-tag=TAG] [--out-dir=DIR]');
    console.error('Available scenarios:');
    const { listScenarios } = require('./scenarios');
    for (const name of listScenarios()) {
      console.error(`  - ${name}`);
    }
    process.exit(1);
  }

  const scenario = getScenario(scenarioName);
  const caseDir = path.join(outDir, scenarioName);
  const harness = new CharacterizationHarness({ siteTag, caseDir });

  console.log(`[harness] Running scenario: ${scenarioName}`);
  console.log(`[harness] Site tag: ${siteTag}`);
  console.log(`[harness] Case dir: ${caseDir}`);

  const summary = await harness.runScenario(scenario);

  console.log('[harness] Scenario complete:');
  console.log(JSON.stringify(summary, null, 2));
}

main().catch(err => {
  console.error('[harness] Failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
