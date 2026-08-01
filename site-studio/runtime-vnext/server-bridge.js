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

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { RecipeRunner } = require('./lib/runner');
const { buildSiteBuildRegistry } = require('./lib/site-build-registry');
const { loadAndResolve } = require('./lib/recipe-resolver');
const db = require('./state/db');

const RECIPE_PATH = path.join(__dirname, 'recipes', 'full-site-build.yaml');

function makeRunId() {
  return 'run-' + crypto.randomBytes(6).toString('hex');
}

function syncOutputsToSiteDist({ workspace_root, site_dir }) {
  const outputsDir = path.join(workspace_root, 'outputs');
  const distDir = path.join(site_dir, 'dist');
  if (!fs.existsSync(outputsDir)) return { synced: false, reason: 'outputs_missing', distDir };

  fs.mkdirSync(site_dir, { recursive: true });
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(distDir), { recursive: true });
  fs.cpSync(outputsDir, distDir, { recursive: true });

  return { synced: true, distDir };
}

function readJsonIfExists(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return null;
  }
}

async function runSiteBuild(buildRequest, { eventBus = null } = {}) {
  const registry = buildSiteBuildRegistry();
  const runner = new RecipeRunner({ registry, eventBus });

  const run_id = makeRunId();
  // STUDIO_VNEXT_HUB_ROOT lets a test relocate the runtime project/workspace
  // tree (.project.json, runs/) into a temp dir that symlinks runtime-vnext
  // back to this dir, so a booted server writes nothing into the repo.
  const hub_root = process.env.STUDIO_VNEXT_HUB_ROOT
    ? path.resolve(process.env.STUDIO_VNEXT_HUB_ROOT)
    : path.join(__dirname, '..');
  const sites_root = path.join(hub_root, 'sites');
  const site_tag = buildRequest.site_tag || 'site';
  const site_dir = path.join(sites_root, site_tag);
  const workspace_root = path.join(site_dir, 'runs', run_id);
  fs.mkdirSync(workspace_root, { recursive: true });

  const started_at = new Date().toISOString();
  const project_id = buildRequest.project_id || `project-${site_tag}`;

  const existingProject = db.getProject(project_id) || db.getProjectBySiteTag(buildRequest.site_tag || 'site');
  if (!existingProject) {
    db.createProject({
      projectId: project_id,
      siteTag: site_tag,
      hubRoot: hub_root,
      sitesRoot: sites_root,
      createdAt: started_at,
    });
  }

  const runContext = {
    run_id,
    project_id,
    recipe_id: 'full-site-build-v1',
    recipe_version: '1.0.0',
    workspace_root,
    started_at,
    trigger: 'api',
    status: 'pending',
    ended_at: null,
  };

  db.createRun({
    runId: run_id,
    projectId: project_id,
    recipeId: 'full-site-build-v1',
    recipeVersion: '1.0.0',
    status: 'pending',
    workspaceRoot: workspace_root,
    startedAt: started_at,
    trigger: 'api',
  });

  const projectContext = {
    hub_root,
    sites_root,
    project_id,
    site_tag: site_tag,
  };

  const resolvedRecipe = loadAndResolve(RECIPE_PATH);

  const result = await runner.execute({
    projectContext,
    runContext,
    resolvedRecipe,
    spec: { buildRequest },
    publish: true,
  });

  const sync = result.status === 'published' || result.status === 'succeeded'
    ? syncOutputsToSiteDist({ workspace_root, site_dir })
    : { synced: false, reason: 'run_not_publishable', distDir: path.join(site_dir, 'dist') };

  const proof_report_path = path.join(workspace_root, 'reports', 'proof-report.json');
  const gap_log_path = path.join(workspace_root, 'reports', 'gap-log.json');
  const proof_report = readJsonIfExists(proof_report_path);
  const gap_log = readJsonIfExists(gap_log_path);

  return {
    run_id,
    workspace_root,
    site_dir,
    dist_dir: sync.distDir,
    dist_synced: sync.synced,
    status: result.status,
    stageOutputs: result.stageOutputs,
    proof_report_path,
    gap_log_path,
    proof_report,
    gap_log,
    error: result.error || null,
  };
}

module.exports = { runSiteBuild };
