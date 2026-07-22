'use strict';
/**
 * runtime-vnext/lib/run-context.js — RunContext, RunRecord, and audit-trail helpers.
 */

const fs = require('fs');
const path = require('path');
const db = require('../state/db');
const { generateRunId } = require('./id');

function ensureWorkspaceLayout(workspaceRoot) {
  fs.mkdirSync(path.join(workspaceRoot, 'staging'), { recursive: true });
  fs.mkdirSync(path.join(workspaceRoot, 'outputs'), { recursive: true });
  fs.mkdirSync(path.join(workspaceRoot, 'prompts'), { recursive: true });
  fs.mkdirSync(path.join(workspaceRoot, 'traces'), { recursive: true });
}

function appendAuditEvent(workspaceRoot, event) {
  const auditPath = path.join(workspaceRoot, 'run.jsonl');
  const line = JSON.stringify({ ...event, emitted_at: new Date().toISOString() }) + '\n';
  fs.appendFileSync(auditPath, line);
}

function createRunContext({
  projectContext,
  recipeId,
  recipeVersion,
  trigger = 'user',
  parentRunId = null,
  hubRoot,
}) {
  const runId = generateRunId();
  const siteDir = path.join(projectContext.sites_root, projectContext.site_tag);
  const runsDir = path.join(siteDir, 'runs');
  const workspaceRoot = path.join(runsDir, runId);

  ensureWorkspaceLayout(workspaceRoot);

  const startedAt = new Date().toISOString();
  const runRecord = db.createRun({
    runId,
    projectId: projectContext.project_id,
    recipeId,
    recipeVersion,
    status: 'preparing',
    workspaceRoot,
    startedAt,
    parentRunId,
    trigger,
  });

  appendAuditEvent(workspaceRoot, {
    type: 'run:preparing',
    run_id: runId,
    project_id: projectContext.project_id,
    recipe_id: recipeId,
    recipe_version: recipeVersion,
    trigger,
  });

  const runContext = {
    run_id: runId,
    project_id: projectContext.project_id,
    recipe_id: recipeId,
    recipe_version: recipeVersion,
    status: 'preparing',
    workspace_root: workspaceRoot,
    started_at: startedAt,
    trigger,
    parent_run_id: parentRunId,
  };

  return { runContext, runRecord };
}

function getRunJsonlPath(workspaceRoot) {
  return path.join(workspaceRoot, 'run.jsonl');
}

module.exports = {
  createRunContext,
  ensureWorkspaceLayout,
  appendAuditEvent,
  getRunJsonlPath,
};
