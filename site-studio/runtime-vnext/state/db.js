'use strict';
/**
 * runtime-vnext/state/db.js — authoritative SQLite store for vNext runtime.
 *
 * Isolated from lib/db.js to avoid destabilizing the existing monolith.
 * Shares the same config directory but uses a separate database file.
 */

const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

const DB_DIR = process.env.RUNTIME_VNEXT_DB_DIR || path.join(os.homedir(), '.config', 'famtastic');
const DB_PATH = process.env.RUNTIME_VNEXT_DB_PATH || path.join(DB_DIR, 'runtime-vnext.db');

let _db;

function getDb() {
  if (_db) return _db;
  fs.mkdirSync(DB_DIR, { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  _initSchema(_db);
  return _db;
}

function _initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      project_id TEXT PRIMARY KEY,
      site_tag TEXT NOT NULL UNIQUE,
      hub_root TEXT NOT NULL,
      sites_root TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS runs (
      run_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(project_id),
      recipe_id TEXT NOT NULL,
      recipe_version TEXT NOT NULL,
      status TEXT NOT NULL,
      workspace_root TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      parent_run_id TEXT REFERENCES runs(run_id),
      trigger TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_runs_project ON runs(project_id);
    CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);

    CREATE TABLE IF NOT EXISTS stage_attempts (
      stage_attempt_id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES runs(run_id),
      stage_id TEXT NOT NULL,
      attempt_number INTEGER NOT NULL,
      status TEXT NOT NULL,
      inputs_json TEXT,
      outputs_json TEXT,
      started_at TEXT,
      ended_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_stage_attempts_run ON stage_attempts(run_id);

    CREATE TABLE IF NOT EXISTS artifacts (
      artifact_id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES runs(run_id),
      stage_attempt_id TEXT REFERENCES stage_attempts(stage_attempt_id),
      kind TEXT NOT NULL,
      path TEXT,
      checksum TEXT NOT NULL,
      metadata_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_artifacts_run ON artifacts(run_id);
    CREATE INDEX IF NOT EXISTS idx_artifacts_stage ON artifacts(stage_attempt_id);
  `);
}

function resetForTests() {
  if (_db) {
    try { _db.close(); } catch {}
    _db = null;
  }
  try { fs.unlinkSync(DB_PATH); } catch {}
  try { fs.unlinkSync(DB_PATH + '-wal'); } catch {}
  try { fs.unlinkSync(DB_PATH + '-shm'); } catch {}
  return getDb();
}

function close() {
  if (_db) {
    try { _db.close(); } catch {}
    _db = null;
  }
}

// --- Project operations ---

function createProject({ projectId, siteTag, hubRoot, sitesRoot, createdAt }) {
  getDb().prepare(`
    INSERT INTO projects (project_id, site_tag, hub_root, sites_root, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(projectId, siteTag, hubRoot, sitesRoot, createdAt);
  return { project_id: projectId, site_tag: siteTag, hub_root: hubRoot, sites_root: sitesRoot, created_at: createdAt };
}

function getProjectBySiteTag(siteTag) {
  return getDb().prepare('SELECT * FROM projects WHERE site_tag = ?').get(siteTag);
}

function getProject(projectId) {
  return getDb().prepare('SELECT * FROM projects WHERE project_id = ?').get(projectId);
}

function listProjects() {
  return getDb().prepare('SELECT * FROM projects ORDER BY created_at ASC').all();
}

// --- Run operations ---

function createRun({ runId, projectId, recipeId, recipeVersion, status, workspaceRoot, startedAt, parentRunId, trigger }) {
  getDb().prepare(`
    INSERT INTO runs (run_id, project_id, recipe_id, recipe_version, status, workspace_root, started_at, ended_at, parent_run_id, trigger)
    VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
  `).run(runId, projectId, recipeId, recipeVersion, status, workspaceRoot, startedAt, parentRunId || null, trigger);
  return { run_id: runId, project_id: projectId, recipe_id: recipeId, recipe_version: recipeVersion, status, workspace_root: workspaceRoot, started_at: startedAt, parent_run_id: parentRunId, trigger };
}

function getRun(runId) {
  return getDb().prepare('SELECT * FROM runs WHERE run_id = ?').get(runId);
}

function updateRunStatus(runId, status, endedAt = null) {
  const sets = ['status = ?'];
  const vals = [status];
  if (endedAt != null) {
    sets.push('ended_at = ?');
    vals.push(endedAt);
  }
  vals.push(runId);
  getDb().prepare(`UPDATE runs SET ${sets.join(', ')} WHERE run_id = ?`).run(...vals);
}

function listRunningRuns() {
  return getDb().prepare(`
    SELECT * FROM runs WHERE status IN ('preparing', 'running', 'committing') ORDER BY started_at ASC
  `).all();
}

function listRunsByStatus(status) {
  return getDb().prepare('SELECT * FROM runs WHERE status = ? ORDER BY started_at ASC').all(status);
}

// --- Stage attempt operations ---

function createStageAttempt({ stageAttemptId, runId, stageId, attemptNumber, status, inputsJson, outputsJson, startedAt }) {
  getDb().prepare(`
    INSERT INTO stage_attempts (stage_attempt_id, run_id, stage_id, attempt_number, status, inputs_json, outputs_json, started_at, ended_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
  `).run(stageAttemptId, runId, stageId, attemptNumber, status, inputsJson || null, outputsJson || null, startedAt);
  return { stageAttemptId, runId, stageId, attemptNumber, status, inputsJson, outputsJson, startedAt };
}

function getStageAttemptsForRun(runId) {
  return getDb().prepare('SELECT * FROM stage_attempts WHERE run_id = ? ORDER BY started_at ASC').all(runId);
}

function updateStageAttemptStatus(stageAttemptId, status, endedAt = null) {
  const sets = ['status = ?'];
  const vals = [status];
  if (endedAt != null) {
    sets.push('ended_at = ?');
    vals.push(endedAt);
  }
  vals.push(stageAttemptId);
  getDb().prepare(`UPDATE stage_attempts SET ${sets.join(', ')} WHERE stage_attempt_id = ?`).run(...vals);
}

function updateStageAttemptOutputs(stageAttemptId, outputsJson) {
  getDb().prepare('UPDATE stage_attempts SET outputs_json = ? WHERE stage_attempt_id = ?').run(outputsJson, stageAttemptId);
}

// --- Artifact operations ---

function createArtifact({ artifactId, runId, stageAttemptId, kind, path, checksum, metadataJson, createdAt }) {
  getDb().prepare(`
    INSERT INTO artifacts (artifact_id, run_id, stage_attempt_id, kind, path, checksum, metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(artifactId, runId, stageAttemptId || null, kind, path || null, checksum, metadataJson || null, createdAt);
  return { artifactId, runId, stageAttemptId, kind, path, checksum, metadataJson, createdAt };
}

function getArtifactsForRun(runId) {
  return getDb().prepare('SELECT * FROM artifacts WHERE run_id = ? ORDER BY created_at ASC').all(runId);
}

function getArtifactByChecksum(runId, checksum) {
  return getDb().prepare('SELECT * FROM artifacts WHERE run_id = ? AND checksum = ?').get(runId, checksum);
}

module.exports = {
  getDb,
  close,
  resetForTests,
  createProject,
  getProject,
  getProjectBySiteTag,
  listProjects,
  createRun,
  getRun,
  updateRunStatus,
  listRunningRuns,
  listRunsByStatus,
  createStageAttempt,
  getStageAttemptsForRun,
  updateStageAttemptStatus,
  updateStageAttemptOutputs,
  createArtifact,
  getArtifactsForRun,
  getArtifactByChecksum,
};
