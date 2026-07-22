'use strict';
/**
 * runtime-vnext operator bridge.
 *
 * Drop-in replacement for the legacy server.js build path.
 * Called when FAMTASTIC_USE_RUNTIME_VNEXT=1.
 *
 * Usage:
 *   const bridge = require('./runtime-vnext/server-bridge');
 *   await bridge.runSiteBuild(buildRequest);
 */

const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { RecipeRunner } = require('./lib/runner');
const { buildSiteBuildRegistry } = require('./lib/site-build-registry');
const { loadAndResolve } = require('./lib/recipe-resolver');
const db = require('./state/db');

const RECIPE_PATH = path.join(__dirname, 'recipes', 'full-site-build.yaml');

function makeRunId() {
  return 'run-' + crypto.randomBytes(6).toString('hex');
}

function makeWorkspaceRoot(siteTag) {
  const base = process.env.FAMTASTIC_WORKSPACE_ROOT
    || path.join(os.tmpdir(), 'famtastic-builds');
  return path.join(base, siteTag + '-' + Date.now());
}

async function runSiteBuild(buildRequest, { eventBus = null } = {}) {
  const registry = buildSiteBuildRegistry();
  const runner = new RecipeRunner({ registry, eventBus });

  const run_id = makeRunId();
  const workspace_root = makeWorkspaceRoot(buildRequest.site_tag || 'site');
  const require_fs = require('fs');
  require_fs.mkdirSync(workspace_root, { recursive: true });

  const runContext = {
    run_id,
    workspace_root,
    started_at: new Date().toISOString(),
    status: 'pending',
    ended_at: null,
  };

  db.createRun({
    runId: run_id,
    recipeId: 'full-site-build-v1',
    status: 'pending',
    workspaceRoot: workspace_root,
    startedAt: runContext.started_at,
  });

  const projectContext = {
    hub_root: path.join(__dirname, '..'),
  };

  const { resolvedRecipe } = await loadAndResolve(RECIPE_PATH, {
    spec: { buildRequest },
    project: projectContext,
  });

  const result = await runner.execute({
    projectContext,
    runContext,
    resolvedRecipe,
    spec: { buildRequest },
    publish: true,
  });

  return {
    run_id,
    workspace_root,
    status: result.status,
    stageOutputs: result.stageOutputs,
    error: result.error || null,
  };
}

module.exports = { runSiteBuild };
