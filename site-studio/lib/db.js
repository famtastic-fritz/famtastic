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

    CREATE INDEX IF NOT EXISTS idx_sessions_tag  ON sessions(site_tag);
    CREATE INDEX IF NOT EXISTS idx_builds_tag    ON builds(site_tag);
    CREATE INDEX IF NOT EXISTS idx_builds_sess   ON builds(session_id);
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
  _createTestDb, _closeDb,
};
