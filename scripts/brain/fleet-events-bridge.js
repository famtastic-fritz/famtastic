#!/usr/bin/env node
/**
 * fleet-events-bridge.js — fold external-agent activity into the command-center spine.
 *
 * The agent-os dashboard's event feed (api/event_log.py → ~/.shay/events.jsonl) only
 * sees Shay's own swarm. But the WHOLE fleet — Claude Code, Codex, Gemini sessions —
 * already leaves a trace in the brain: a session note under
 * obsidian/05-Captures/sessions/<date>/SESSION-<id>.md plus git commits.
 *
 * This bridge reads those traces and appends normalized events to the SAME spine the
 * dashboard reads, so a session running on Fritz's Mac (or in the cloud) shows up on
 * the board next to Shay's workers. That is the "visible everywhere, one truth" goal.
 *
 * It is idempotent: a cursor at ~/.shay/fleet-bridge-cursor.json records what's been
 * emitted (session mtimes + last git sha) so re-runs never double-post. Read-only on
 * the vault; append-only on the spine. Run on a cron (e.g. every 2 min) or on demand.
 *
 * Schema matches api/event_log.py exactly:
 *   { id, timestamp, type, agentId, message, severity, source, meta? }
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const REPO = path.resolve(__dirname, '..', '..');
const SESSIONS_DIR = path.join(REPO, 'obsidian', '05-Captures', 'sessions');

function shayHome() {
  if (process.env.SHAY_HOME) return path.resolve(process.env.SHAY_HOME);
  return path.join(os.homedir(), '.shay');
}
function eventsPath() {
  if (process.env.SHAY_EVENTS_LOG) return path.resolve(process.env.SHAY_EVENTS_LOG);
  return path.join(shayHome(), 'events.jsonl');
}
function cursorPath() {
  return path.join(shayHome(), 'fleet-bridge-cursor.json');
}

function loadCursor() {
  try {
    return JSON.parse(fs.readFileSync(cursorPath(), 'utf8'));
  } catch {
    return { sessions: {}, lastGitSha: null };
  }
}
function saveCursor(cursor) {
  fs.mkdirSync(path.dirname(cursorPath()), { recursive: true });
  fs.writeFileSync(cursorPath(), JSON.stringify(cursor, null, 2));
}

function appendEvents(events) {
  if (!events.length) return;
  const p = eventsPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const lines = events.map((e) => JSON.stringify(e)).join('\n') + '\n';
  fs.appendFileSync(p, lines);
}

function evt({ type, message, severity = 'info', agentId, source, meta }) {
  const e = {
    id: 'evt-' + crypto.randomBytes(6).toString('hex'),
    timestamp: new Date().toISOString(),
    type,
    agentId: agentId || null,
    message,
    severity,
    source: source || 'fleet-bridge',
  };
  if (meta) e.meta = meta;
  return e;
}

/** Parse the YAML-ish frontmatter of a session note (no yaml dep needed). */
function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i === -1) continue;
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}

function walkSessionNotes() {
  const notes = [];
  let dateDirs = [];
  try {
    dateDirs = fs.readdirSync(SESSIONS_DIR);
  } catch {
    return notes;
  }
  for (const d of dateDirs) {
    const dir = path.join(SESSIONS_DIR, d);
    let files = [];
    try {
      if (!fs.statSync(dir).isDirectory()) continue;
      files = fs.readdirSync(dir);
    } catch {
      continue;
    }
    for (const f of files) {
      if (!/^SESSION-.*\.md$/.test(f)) continue;
      const full = path.join(dir, f);
      try {
        notes.push({ full, mtime: fs.statSync(full).mtimeMs });
      } catch {
        /* skip */
      }
    }
  }
  return notes;
}

/** Emit one event per session note whose mtime advanced since last run. */
function bridgeSessions(cursor) {
  const events = [];
  for (const note of walkSessionNotes()) {
    const seen = cursor.sessions[note.full];
    if (seen && seen >= note.mtime) continue; // already emitted at this state
    let fm = {};
    try {
      fm = parseFrontmatter(fs.readFileSync(note.full, 'utf8'));
    } catch {
      continue;
    }
    const sid = fm.short_id || fm.session_id || path.basename(note.full);
    const agent = fm.agent || 'external-agent';
    const status = (fm.status || 'active').toLowerCase();
    const branch = fm.branch || '';
    const first = !seen;

    let type = 'system';
    let severity = 'info';
    let verb = 'updated';
    if (first) {
      type = 'task_start';
      verb = 'started';
    }
    if (status === 'ended') {
      type = 'task_complete';
      severity = 'success';
      verb = 'ended';
    }
    events.push(
      evt({
        type,
        severity,
        agentId: agent,
        source: 'fleet',
        message: `Session ${sid} ${verb}${branch ? ` on ${branch}` : ''}`,
        meta: { session_id: fm.session_id, branch, status, file: path.relative(REPO, note.full) },
      })
    );
    cursor.sessions[note.full] = note.mtime;
  }
  return events;
}

/** Emit one event per new git commit on the current branch since last sha. */
function bridgeGit(cursor) {
  const events = [];
  let log = '';
  try {
    const range = cursor.lastGitSha ? `${cursor.lastGitSha}..HEAD` : '-15';
    log = execSync(`git -C "${REPO}" log ${range} --pretty=format:%H%x09%an%x09%s`, {
      encoding: 'utf8',
    }).trim();
  } catch {
    return events;
  }
  if (!log) return events;
  const rows = log.split('\n').filter(Boolean);
  // git log is newest-first; emit oldest-first so the feed reads chronologically.
  for (const row of rows.reverse()) {
    const [sha, author, subject] = row.split('\t');
    if (!sha) continue;
    events.push(
      evt({
        type: 'command',
        severity: 'info',
        agentId: author,
        source: 'git',
        message: `commit ${sha.slice(0, 7)}: ${subject}`,
        meta: { sha, author },
      })
    );
  }
  try {
    cursor.lastGitSha = execSync(`git -C "${REPO}" rev-parse HEAD`, { encoding: 'utf8' }).trim();
  } catch {
    /* leave cursor as-is */
  }
  return events;
}

function main() {
  const cursor = loadCursor();
  const events = [...bridgeSessions(cursor), ...bridgeGit(cursor)];
  appendEvents(events);
  saveCursor(cursor);
  console.log(`[fleet-bridge] emitted ${events.length} event(s) → ${eventsPath()}`);
}

if (require.main === module) main();

module.exports = { parseFrontmatter, evt };
