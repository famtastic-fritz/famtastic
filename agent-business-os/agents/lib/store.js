'use strict';

/*
 * agents/lib/store.js — the pipeline state store for Agent Business OS agents.
 *
 * One JSON file holds the whole pipeline ({ leads, deals, invoices }); an
 * append-only events.jsonl alongside it is the audit trail. Writes are atomic
 * (tmp + rename). This is deliberately dependency-free and decoupled from the
 * Studio job queue — the orchestrator can enqueue agent runs as jobs later, but
 * the agents themselves operate on this store so they run anywhere (cron, CI,
 * a laptop) without the Studio DB.
 *
 * Override the location with ABOS_STORE (useful for tests).
 */

const fs = require('fs');
const path = require('path');

function storePath() {
  return process.env.ABOS_STORE || path.join(__dirname, '..', '..', 'ops', 'pipeline.json');
}
function eventsPath() {
  return process.env.ABOS_EVENTS || path.join(path.dirname(storePath()), 'events.jsonl');
}

const EMPTY = { version: 1, leads: [], deals: [], invoices: [], updatedAt: null };

function load() {
  const p = storePath();
  try {
    const raw = fs.readFileSync(p, 'utf8');
    const data = JSON.parse(raw);
    return Object.assign({}, EMPTY, data);
  } catch (_) {
    return JSON.parse(JSON.stringify(EMPTY));
  }
}

function save(data) {
  const p = storePath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  data.updatedAt = new Date().toISOString();
  const tmp = p + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, p); // atomic
  return data;
}

function logEvent(agent, type, ref, detail) {
  const p = eventsPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const line = JSON.stringify({
    at: new Date().toISOString(), agent, type,
    ref: ref || null, detail: detail || null
  });
  fs.appendFileSync(p, line + '\n');
}

function readEvents() {
  try {
    return fs.readFileSync(eventsPath(), 'utf8')
      .split('\n').filter(Boolean).map(function (l) { try { return JSON.parse(l); } catch (_) { return null; } })
      .filter(Boolean);
  } catch (_) { return []; }
}

function newId(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

module.exports = { storePath, eventsPath, load, save, logEvent, readEvents, newId };
