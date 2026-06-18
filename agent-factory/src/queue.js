// Task queue backed by SQLite (node:sqlite, built-in to Node 22+).
// Tasks enter here; the orchestrator pulls from it. Also stores per-task
// execution records used by the self-improvement loop.
import { DatabaseSync } from 'node:sqlite';
import { resolveInside, ensureDir } from './safepath.js';
import { uid } from './util.js';

ensureDir('data');
const db = new DatabaseSync(resolveInside('data/factory.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    payload TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 5,
    status TEXT NOT NULL DEFAULT 'queued',  -- queued|running|done|failed
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT,
    model TEXT,
    tier INTEGER,
    cost_usd REAL,
    latency_ms INTEGER,
    result TEXT,
    error TEXT,
    batch INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_status ON tasks(status, priority);
  CREATE TABLE IF NOT EXISTS batches (
    n INTEGER PRIMARY KEY,
    started_at TEXT, finished_at TEXT,
    processed INTEGER, succeeded INTEGER, failed INTEGER,
    cost_usd REAL, avg_latency_ms REAL, notes TEXT
  );
`);

export function enqueue({ type, payload = {}, priority = 5 }) {
  const id = uid('task');
  db.prepare(
    `INSERT INTO tasks (id, type, payload, priority, created_at) VALUES (?,?,?,?,?)`
  ).run(id, type, JSON.stringify(payload), priority, new Date().toISOString());
  return id;
}

// Atomically claim up to `limit` queued tasks (highest priority, oldest first).
export function claim(limit, batch) {
  const rows = db.prepare(
    `SELECT * FROM tasks WHERE status='queued' ORDER BY priority ASC, created_at ASC LIMIT ?`
  ).all(limit);
  const upd = db.prepare(
    `UPDATE tasks SET status='running', started_at=?, batch=?, attempts=attempts+1 WHERE id=? AND status='queued'`
  );
  const claimed = [];
  for (const r of rows) {
    const res = upd.run(new Date().toISOString(), batch, r.id);
    if (res.changes === 1) { r.status = 'running'; r.payload = JSON.parse(r.payload); claimed.push(r); }
  }
  return claimed;
}

export function complete(id, { result, model, tier, cost_usd, latency_ms }) {
  db.prepare(
    `UPDATE tasks SET status='done', finished_at=?, result=?, model=?, tier=?, cost_usd=?, latency_ms=? WHERE id=?`
  ).run(new Date().toISOString(), JSON.stringify(result ?? null), model, tier, cost_usd, latency_ms, id);
}

export function fail(id, error, { requeue, maxAttempts }) {
  const row = db.prepare(`SELECT attempts FROM tasks WHERE id=?`).get(id);
  if (requeue && row && row.attempts < maxAttempts) {
    db.prepare(`UPDATE tasks SET status='queued', error=? WHERE id=?`).run(String(error), id);
    return 'requeued';
  }
  db.prepare(`UPDATE tasks SET status='failed', finished_at=?, error=? WHERE id=?`)
    .run(new Date().toISOString(), String(error), id);
  return 'failed';
}

export function getTask(id) {
  const r = db.prepare(`SELECT * FROM tasks WHERE id=?`).get(id);
  if (r) r.payload = JSON.parse(r.payload);
  return r;
}

export function depth() {
  return db.prepare(`SELECT COUNT(*) c FROM tasks WHERE status='queued'`).get().c;
}

export function counts() {
  const rows = db.prepare(`SELECT status, COUNT(*) c FROM tasks GROUP BY status`).all();
  const out = { queued: 0, running: 0, done: 0, failed: 0 };
  for (const r of rows) out[r.status] = r.c;
  return out;
}

export function batchTasks(batch) {
  return db.prepare(`SELECT * FROM tasks WHERE batch=?`).all(batch);
}

export function recordBatch(n, stats) {
  db.prepare(
    `INSERT OR REPLACE INTO batches (n, started_at, finished_at, processed, succeeded, failed, cost_usd, avg_latency_ms, notes)
     VALUES (?,?,?,?,?,?,?,?,?)`
  ).run(n, stats.started_at, stats.finished_at, stats.processed, stats.succeeded,
        stats.failed, stats.cost_usd, stats.avg_latency_ms, stats.notes || '');
}

export function nextBatchNumber() {
  const r = db.prepare(`SELECT MAX(batch) m FROM tasks`).get();
  return (r.m || 0) + 1;
}

export function allBatches() {
  return db.prepare(`SELECT * FROM batches ORDER BY n ASC`).all();
}

export function totals() {
  const r = db.prepare(
    `SELECT COALESCE(SUM(cost_usd),0) cost, COALESCE(AVG(latency_ms),0) lat,
            COUNT(*) total,
            SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) done,
            SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) failed
     FROM tasks WHERE status IN ('done','failed')`
  ).get();
  return r;
}

export function reset() {
  db.exec(`DELETE FROM tasks; DELETE FROM batches;`);
}

export default { enqueue, claim, complete, fail, depth, counts, batchTasks, recordBatch,
  nextBatchNumber, allBatches, totals, reset, getTask };
