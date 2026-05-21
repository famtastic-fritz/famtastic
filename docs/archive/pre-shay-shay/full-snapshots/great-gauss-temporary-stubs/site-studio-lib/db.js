'use strict';
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

const DB_DIR = path.join(os.homedir(), '.config', 'famtastic');
const DB_PATH = path.join(DB_DIR, 'studio.db');

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
    CREATE TABLE IF NOT EXISTS sessions (
      id                  TEXT PRIMARY KEY,
      site_tag            TEXT NOT NULL,
      model               TEXT NOT NULL,
      started_at          TEXT NOT NULL,
      ended_at            TEXT,
      total_input_tokens  INTEGER DEFAULT 0,
      total_output_tokens INTEGER DEFAULT 0,
      total_cost_usd      REAL    DEFAULT 0,
      message_count       INTEGER DEFAULT 0,
      compaction_count    INTEGER DEFAULT 0,
      status              TEXT    DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS builds (
      id                   TEXT PRIMARY KEY,
      session_id           TEXT REFERENCES sessions(id),
      site_tag             TEXT NOT NULL,
      pages_built          INTEGER DEFAULT 0,
      verification_status  TEXT,
      verification_issues  INTEGER DEFAULT 0,
      duration_ms          INTEGER,
      model                TEXT,
      input_tokens         INTEGER DEFAULT 0,
      output_tokens        INTEGER DEFAULT 0,
      cost_usd             REAL    DEFAULT 0,
      built_at             TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS compaction_events (
      id             TEXT PRIMARY KEY,
      session_id     TEXT REFERENCES sessions(id),
      tokens_before  INTEGER,
      tokens_after   INTEGER,
      occurred_at    TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id            TEXT PRIMARY KEY,
      type          TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'pending',
      site_tag      TEXT,
      payload       TEXT,
      dependencies  TEXT,
      cost_estimate REAL DEFAULT 0,
      cost_actual   REAL DEFAULT 0,
      created_at    TEXT NOT NULL,
      approved_at   TEXT,
      approved_by   TEXT,
      completed_at  TEXT,
      result        TEXT
    );

    CREATE TABLE IF NOT EXISTS memories (
      id              TEXT PRIMARY KEY,
      entity_type     TEXT NOT NULL,
      entity_id       TEXT NOT NULL,
      content         TEXT NOT NULL,
      category        TEXT NOT NULL DEFAULT 'general',
      source          TEXT,
      importance      INTEGER NOT NULL DEFAULT 5,
      created_at      TEXT NOT NULL,
      last_accessed   TEXT,
      access_count    INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS memory_links (
      id          TEXT PRIMARY KEY,
      from_type   TEXT NOT NULL,
      from_id     TEXT NOT NULL,
      to_type     TEXT NOT NULL,
      to_id       TEXT NOT NULL,
      relation    TEXT NOT NULL,
      created_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trace_events (
      trace_id                TEXT PRIMARY KEY,
      parent_trace_id         TEXT,
      run_id                  TEXT NOT NULL,
      site_tag                TEXT,
      phase                   TEXT NOT NULL,
      step_id                 TEXT,
      decision_type           TEXT,
      requested_item          TEXT,
      selected_path           TEXT,
      alternatives_considered TEXT,
      reason                  TEXT,
      agent                   TEXT,
      tool                    TEXT,
      provider                TEXT,
      model                   TEXT,
      cost_type               TEXT,
      prompt_hash             TEXT,
      prompt_template_version TEXT,
      input_tokens_estimated  INTEGER DEFAULT 0,
      output_tokens_estimated INTEGER DEFAULT 0,
      input_tokens_actual     INTEGER DEFAULT 0,
      output_tokens_actual    INTEGER DEFAULT 0,
      cost_usd_actual         REAL    DEFAULT 0,
      duration_ms             INTEGER,
      status                  TEXT    DEFAULT 'completed',
      quality_score           INTEGER,
      verification_refs       TEXT,
      created_jobs            TEXT,
      gaps                    TEXT,
      error                   TEXT,
      created_at              TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_performance (
      id                  TEXT PRIMARY KEY,
      agent               TEXT NOT NULL,
      tool                TEXT,
      provider            TEXT,
      model               TEXT,
      task_type           TEXT NOT NULL,
      site_tag            TEXT,
      run_id              TEXT,
      status              TEXT NOT NULL DEFAULT 'completed',
      duration_ms         INTEGER,
      cost_usd            REAL    DEFAULT 0,
      input_tokens        INTEGER DEFAULT 0,
      output_tokens       INTEGER DEFAULT 0,
      verification_passed INTEGER DEFAULT 0,
      human_accepted      INTEGER,
      failure_reason      TEXT,
      created_at          TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_tag  ON sessions(site_tag);
    CREATE INDEX IF NOT EXISTS idx_builds_tag    ON builds(site_tag);
    CREATE INDEX IF NOT EXISTS idx_builds_sess   ON builds(session_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_status   ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_site_tag ON jobs(site_tag);
    CREATE INDEX IF NOT EXISTS idx_memories_entity ON memories(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_memories_cat    ON memories(category);
    CREATE INDEX IF NOT EXISTS idx_memory_links_from ON memory_links(from_type, from_id);
    CREATE INDEX IF NOT EXISTS idx_memory_links_to   ON memory_links(to_type, to_id);
    CREATE INDEX IF NOT EXISTS idx_trace_run    ON trace_events(run_id);
    CREATE INDEX IF NOT EXISTS idx_trace_site   ON trace_events(site_tag);
    CREATE INDEX IF NOT EXISTS idx_trace_phase  ON trace_events(phase);
    CREATE INDEX IF NOT EXISTS idx_trace_status ON trace_events(status);
    CREATE INDEX IF NOT EXISTS idx_aperf_agent     ON agent_performance(agent);
    CREATE INDEX IF NOT EXISTS idx_aperf_task_type ON agent_performance(task_type);
    CREATE INDEX IF NOT EXISTS idx_aperf_run       ON agent_performance(run_id);
  `);
}

function createSession({ id, siteTag, model }) {
  getDb().prepare(`
    INSERT INTO sessions (id, site_tag, model, started_at, status)
    VALUES (?, ?, ?, ?, 'active')
  `).run(id, siteTag, model, new Date().toISOString());
}

function updateSessionTokens(id, inputDelta, outputDelta, costDelta) {
  getDb().prepare(`
    UPDATE sessions
    SET total_input_tokens  = total_input_tokens  + ?,
        total_output_tokens = total_output_tokens + ?,
        total_cost_usd      = total_cost_usd + ?,
        message_count       = message_count + 1
    WHERE id = ?
  `).run(inputDelta, outputDelta, costDelta, id);
}

function endSession(id) {
  getDb().prepare(
    `UPDATE sessions SET ended_at = ?, status = 'completed' WHERE id = ?`
  ).run(new Date().toISOString(), id);
}

function logBuild({ id, sessionId, siteTag, pagesBuilt, verificationStatus,
                    verificationIssues, durationMs, model,
                    inputTokens, outputTokens }) {
  const costUsd = inputTokens * 0.000003 + outputTokens * 0.000015;
  getDb().prepare(`
    INSERT INTO builds (id, session_id, site_tag, pages_built,
      verification_status, verification_issues, duration_ms, model,
      input_tokens, output_tokens, cost_usd, built_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, sessionId, siteTag, pagesBuilt, verificationStatus,
         verificationIssues, durationMs, model,
         inputTokens, outputTokens, costUsd, new Date().toISOString());
}

function getSessionHistory(siteTag, limit) {
  return getDb().prepare(
    'SELECT * FROM sessions WHERE site_tag = ? ORDER BY started_at DESC LIMIT ?'
  ).all(siteTag, limit || 10);
}

function getPortfolioStats() {
  const db = getDb();
  return {
    totalSessions: db.prepare('SELECT COUNT(*) FROM sessions').pluck().get(),
    totalBuilds:   db.prepare('SELECT COUNT(*) FROM builds').pluck().get(),
    totalCostUsd:  db.prepare('SELECT COALESCE(SUM(total_cost_usd),0) FROM sessions').pluck().get(),
    buildPassRate: db.prepare(
      "SELECT ROUND(AVG(CASE WHEN verification_status = 'passed' THEN 1.0 ELSE 0.0 END), 3) FROM builds"
    ).pluck().get() || 0,
    sitesBuilt: db.prepare('SELECT COUNT(DISTINCT site_tag) FROM builds').pluck().get(),
  };
}

function _parseJob(row) {
  if (!row) return null;
  return {
    ...row,
    payload:      row.payload      ? JSON.parse(row.payload)      : null,
    dependencies: row.dependencies ? JSON.parse(row.dependencies) : [],
    result:       row.result       ? JSON.parse(row.result)       : null,
  };
}

function createJob({ id, type, status = 'pending', site_tag, payload, dependencies, cost_estimate = 0 }) {
  getDb().prepare(`
    INSERT INTO jobs (id, type, status, site_tag, payload, dependencies, cost_estimate, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, type, status, site_tag || null,
    payload      ? JSON.stringify(payload)      : null,
    dependencies ? JSON.stringify(dependencies) : '[]',
    cost_estimate,
    new Date().toISOString()
  );
}

function getJob(id) {
  return _parseJob(getDb().prepare('SELECT * FROM jobs WHERE id = ?').get(id));
}

function listJobs({ status, site_tag, limit = 50 } = {}) {
  let q = 'SELECT * FROM jobs';
  const params = [];
  const wheres = [];
  if (status)   { wheres.push('status = ?');   params.push(status); }
  if (site_tag) { wheres.push('site_tag = ?'); params.push(site_tag); }
  if (wheres.length) q += ' WHERE ' + wheres.join(' AND ');
  q += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);
  return getDb().prepare(q).all(...params).map(_parseJob);
}

function updateJobStatus(id, status, extra = {}) {
  const now = new Date().toISOString();
  const sets = ['status = ?'];
  const vals = [status];
  if (status === 'approved') {
    sets.push('approved_at = ?', 'approved_by = ?');
    vals.push(now, extra.approved_by || 'user');
  }
  if (status === 'done' || status === 'failed') {
    sets.push('completed_at = ?');
    vals.push(now);
    if (extra.result != null) {
      sets.push('result = ?');
      vals.push(JSON.stringify(extra.result));
    }
    if (extra.cost_actual != null) {
      sets.push('cost_actual = ?');
      vals.push(extra.cost_actual);
    }
  }
  vals.push(id);
  getDb().prepare(`UPDATE jobs SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
}

function addMemory({ id, entity_type, entity_id, content, category = 'general', source, importance = 5 }) {
  getDb().prepare(`
    INSERT INTO memories (id, entity_type, entity_id, content, category, source, importance, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, entity_type, entity_id, content, category, source || null, importance, new Date().toISOString());
}

function getMemories({ entity_type, entity_id, category, limit = 20 } = {}) {
  let q = 'SELECT * FROM memories';
  const params = [];
  const wheres = [];
  if (entity_type) { wheres.push('entity_type = ?'); params.push(entity_type); }
  if (entity_id)   { wheres.push('entity_id = ?');   params.push(entity_id); }
  if (category)    { wheres.push('category = ?');     params.push(category); }
  if (wheres.length) q += ' WHERE ' + wheres.join(' AND ');
  q += ' ORDER BY importance DESC, last_accessed DESC, created_at DESC LIMIT ?';
  params.push(limit);
  const rows = getDb().prepare(q).all(...params);
  const now = new Date().toISOString();
  for (const row of rows) {
    getDb().prepare('UPDATE memories SET last_accessed = ?, access_count = access_count + 1 WHERE id = ?').run(now, row.id);
  }
  return rows;
}

function searchMemories(query, limit = 10) {
  const term = '%' + query + '%';
  return getDb().prepare(
    'SELECT * FROM memories WHERE content LIKE ? ORDER BY importance DESC, access_count DESC LIMIT ?'
  ).all(term, limit);
}

function logAgentPerformance({
  id, agent, tool, provider, model, task_type, site_tag, run_id,
  status = 'completed', duration_ms, cost_usd = 0, input_tokens = 0,
  output_tokens = 0, verification_passed = false, human_accepted = null,
  failure_reason = null,
}) {
  getDb().prepare(`
    INSERT INTO agent_performance (
      id, agent, tool, provider, model, task_type, site_tag, run_id,
      status, duration_ms, cost_usd, input_tokens, output_tokens,
      verification_passed, human_accepted, failure_reason, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, agent, tool || null, provider || null, model || null,
    task_type, site_tag || null, run_id || null,
    status, duration_ms || null, cost_usd, input_tokens, output_tokens,
    verification_passed ? 1 : 0,
    human_accepted == null ? null : (human_accepted ? 1 : 0),
    failure_reason || null,
    new Date().toISOString()
  );
}

function getAgentPerformance({ agent, task_type, provider, limit = 100 } = {}) {
  let q = 'SELECT * FROM agent_performance';
  const params = [];
  const wheres = [];
  if (agent)     { wheres.push('agent = ?');     params.push(agent); }
  if (task_type) { wheres.push('task_type = ?'); params.push(task_type); }
  if (provider)  { wheres.push('provider = ?');  params.push(provider); }
  if (wheres.length) q += ' WHERE ' + wheres.join(' AND ');
  q += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);
  return getDb().prepare(q).all(...params);
}

function getAgentScorecard({ agent, task_type } = {}) {
  // Returns aggregated pass rate, avg cost, avg duration per agent+task_type
  let q = `
    SELECT agent, task_type, provider,
      COUNT(*) AS total_runs,
      ROUND(AVG(CASE WHEN status = 'completed' THEN 1.0 ELSE 0.0 END), 3) AS success_rate,
      ROUND(AVG(CASE WHEN verification_passed = 1 THEN 1.0 ELSE 0.0 END), 3) AS verification_pass_rate,
      ROUND(AVG(cost_usd), 6) AS avg_cost_usd,
      ROUND(AVG(duration_ms)) AS avg_duration_ms,
      SUM(cost_usd) AS total_cost_usd
    FROM agent_performance
  `;
  const params = [];
  const wheres = [];
  if (agent)     { wheres.push('agent = ?');     params.push(agent); }
  if (task_type) { wheres.push('task_type = ?'); params.push(task_type); }
  if (wheres.length) q += ' WHERE ' + wheres.join(' AND ');
  q += ' GROUP BY agent, task_type, provider ORDER BY total_runs DESC';
  return getDb().prepare(q).all(...params);
}

function addMemoryLink({ id, from_type, from_id, to_type, to_id, relation }) {
  getDb().prepare(`
    INSERT OR IGNORE INTO memory_links (id, from_type, from_id, to_type, to_id, relation, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, from_type, from_id, to_type, to_id, relation, new Date().toISOString());
}

function getMemoryLinks({ from_type, from_id, to_type, to_id, relation } = {}) {
  let q = 'SELECT * FROM memory_links';
  const params = [];
  const wheres = [];
  if (from_type) { wheres.push('from_type = ?'); params.push(from_type); }
  if (from_id)   { wheres.push('from_id = ?');   params.push(from_id); }
  if (to_type)   { wheres.push('to_type = ?');   params.push(to_type); }
  if (to_id)     { wheres.push('to_id = ?');     params.push(to_id); }
  if (relation)  { wheres.push('relation = ?');  params.push(relation); }
  if (wheres.length) q += ' WHERE ' + wheres.join(' AND ');
  return getDb().prepare(q).all(...params);
}

function _createTestDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  _initSchema(db);
  _db = db;
  return db;
}

function _closeDb() {
  if (_db) { try { _db.close(); } catch {} _db = null; }
}

module.exports = {
  createSession, updateSessionTokens, endSession,
  logBuild, getSessionHistory, getPortfolioStats,
  createJob, getJob, listJobs, updateJobStatus,
  logAgentPerformance, getAgentPerformance, getAgentScorecard,
  addMemory, getMemories, searchMemories, addMemoryLink, getMemoryLinks,
  _createTestDb, _closeDb, getDb,
};
