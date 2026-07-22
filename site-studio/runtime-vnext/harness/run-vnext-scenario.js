#!/usr/bin/env node
'use strict';
/**
 * CLI runner for vNext deterministic scenarios.
 *
 * Example:
 *   node runtime-vnext/harness/run-vnext-scenario.js single-page-build --site-tag=site-m11-vnext --out-dir=runtime-vnext/harness/cases/vnext
 *
 * This invokes the vNext runtime and captures the result in the same case
 * shape as the old-runtime harness so compare-runs.js can be reused.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const db = require('../state/db');
const { loadProjectContext } = require('../lib/project-context');
const { createRunContext } = require('../lib/run-context');
const { loadAndResolve } = require('../lib/recipe-resolver');
const { RecipeRunner } = require('../lib/runner');
const { EventBus } = require('../lib/event-bus');
const { registry } = require('../lib/model-runner-registry');
const { DeterministicToolRunner } = require('../families/deterministic-tool-runner');

const REPO_ROOT = path.resolve(__dirname, '../..');

function hashFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function listFiles(dir, base = dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFiles(full, base));
    } else {
      results.push(path.relative(base, full));
    }
  }
  return results;
}

function snapshotDirectory(dir, opts = {}) {
  const { includeContent = false, maxContentBytes = 50 * 1024 } = opts;
  const files = listFiles(dir);
  const snapshot = {};
  for (const rel of files) {
    const full = path.join(dir, rel);
    const stat = fs.statSync(full);
    const entry = {
      size: stat.size,
      mtime: stat.mtime.toISOString(),
      sha256: hashFile(full),
    };
    if (includeContent && stat.size <= maxContentBytes) {
      try {
        entry.content = fs.readFileSync(full, 'utf8');
      } catch {
        entry.contentBase64 = fs.readFileSync(full).toString('base64');
      }
    }
    snapshot[rel] = entry;
  }
  return snapshot;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const scenarioName = args.find((a) => !a.startsWith('--'));
  const siteTagArg = args.find((a) => a.startsWith('--site-tag='));
  const siteTag = siteTagArg ? siteTagArg.split('=')[1] : process.env.SITE_TAG || 'site-m11-vnext';
  const outDirArg = args.find((a) => a.startsWith('--out-dir='));
  const outDir = outDirArg ? outDirArg.split('=')[1] : path.join(__dirname, 'cases', 'vnext');
  return { scenarioName, siteTag, outDir };
}

function getSpecForScenario(scenarioName) {
  switch (scenarioName) {
    case 'single-page-build':
      return {
        tag: 'site-m11-vnext',
        site_name: 'Demo Single Page',
        business_type: 'service',
        design_brief: {
          business_name: 'Demo Single Page',
          goal: 'A clean landing page for a local service business.',
          must_have_sections: ['hero', 'about', 'services', 'contact'],
          tone: ['friendly', 'professional'],
        },
        pages: ['index.html'],
        media_specs: [],
      };
    case 'multi-page-build':
      return {
        tag: 'site-m11-vnext',
        site_name: 'Demo Multi Page',
        business_type: 'service',
        design_brief: {
          business_name: 'Demo Multi Page',
          goal: 'A multi-page site with consistent nav and footer.',
          must_have_sections: ['hero', 'about', 'services', 'testimonials', 'contact'],
          tone: ['modern', 'trustworthy'],
        },
        pages: ['index.html', 'about.html', 'services.html', 'contact.html'],
        media_specs: [],
      };
    default:
      throw new Error(`Unknown vNext scenario: ${scenarioName}`);
  }
}

async function main() {
  const { scenarioName, siteTag, outDir } = parseArgs(process.argv);

  if (!scenarioName) {
    console.error('Usage: node run-vnext-scenario.js <scenario-name> [--site-tag=TAG] [--out-dir=DIR]');
    console.error('Available scenarios: single-page-build, multi-page-build');
    process.exit(1);
  }

  const caseDir = path.join(outDir, scenarioName);
  fs.mkdirSync(caseDir, { recursive: true });

  db.resetForTests();
  registry.register('DeterministicToolRunner', 'local', new DeterministicToolRunner());

  // Copy recipe fixture into temp hub so {{project.hub_root}} resolves correctly
  const hubRoot = REPO_ROOT;
  const fixtureSrc = path.join(REPO_ROOT, 'runtime-vnext', 'recipes', 'fixtures', 'template.html');
  const fixtureDest = path.join(hubRoot, 'runtime-vnext', 'recipes', 'fixtures', 'template.html');
  fs.mkdirSync(path.dirname(fixtureDest), { recursive: true });
  if (!fs.existsSync(fixtureDest)) {
    fs.copyFileSync(fixtureSrc, fixtureDest);
  }

  const projectContext = loadProjectContext({ siteTag, hubRoot });
  const { runContext } = createRunContext({
    projectContext,
    recipeId: 'deterministic-site-build-v1',
    recipeVersion: '1.0.0',
    trigger: 'test',
    hubRoot,
  });

  const spec = getSpecForScenario(scenarioName);
  const siteDir = path.join(projectContext.sites_root, siteTag);
  const specPath = path.join(siteDir, 'spec.json');
  fs.mkdirSync(siteDir, { recursive: true });
  fs.writeFileSync(specPath, JSON.stringify(spec, null, 2));

  const preState = {
    timestamp: new Date().toISOString(),
    spec,
    studio: null,
    distSnapshot: snapshotDirectory(path.join(siteDir, 'dist')),
    mutations: [],
    traces: [],
  };

  const recipePath = path.join(REPO_ROOT, 'runtime-vnext', 'recipes', 'deterministic-site-build.yaml');
  const resolvedRecipe = loadAndResolve(recipePath);

  const eventBus = new EventBus();
  const wsEvents = [];
  eventBus.on('*', (payload) => {
    wsEvents.push(payload);
  });

  const runner = new RecipeRunner({ registry, eventBus });
  const actionResult = await runner.execute({
    projectContext,
    runContext,
    resolvedRecipe,
    spec: { site_name: spec.site_name, pages: spec.pages.filter((p) => p !== 'index.html').map((p) => p.replace('.html', '')) },
    publish: true,
  });

  const postState = {
    timestamp: new Date().toISOString(),
    spec,
    studio: null,
    distSnapshot: snapshotDirectory(path.join(siteDir, 'dist'), { includeContent: true }),
    mutations: [],
    traces: [],
  };

  const caseData = {
    meta: {
      name: scenarioName,
      description: `vNext deterministic replay of ${scenarioName}`,
      siteTag,
      hubRoot,
      startedAt: runContext.started_at,
      endedAt: new Date().toISOString(),
    },
    pre: preState,
    post: postState,
    wsEvents,
    actionResult,
  };

  fs.writeFileSync(path.join(caseDir, 'case.json'), JSON.stringify(caseData, null, 2));
  fs.writeFileSync(path.join(caseDir, 'spec-before.json'), JSON.stringify(preState.spec, null, 2));
  fs.writeFileSync(path.join(caseDir, 'spec-after.json'), JSON.stringify(postState.spec, null, 2));
  fs.writeFileSync(
    path.join(caseDir, 'events.jsonl'),
    wsEvents.map((e) => JSON.stringify(e)).join('\n') + (wsEvents.length ? '\n' : '')
  );

  const summary = {
    name: scenarioName,
    caseDir,
    eventCount: wsEvents.length,
    filesBefore: Object.keys(preState.distSnapshot).length,
    filesAfter: Object.keys(postState.distSnapshot).length,
    runStatus: actionResult.status,
    runId: runContext.run_id,
  };

  console.log('[vnext-harness] Scenario complete:');
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error('[vnext-harness] Failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
