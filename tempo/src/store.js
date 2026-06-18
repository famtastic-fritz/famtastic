// store.js — JSON-file persistence layer for Tempo.
// Zero dependencies. Synchronous reads/writes are fine for a single-user
// local app; the data set is tiny.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_DATA_FILE = path.join(__dirname, '..', 'data', 'tempo.json');
const SCHEMA_VERSION = 1;

function emptyDb() {
  return { version: SCHEMA_VERSION, tasks: [], sessions: [] };
}

export class Store {
  constructor(dataFile = DEFAULT_DATA_FILE) {
    this.dataFile = dataFile;
    this.db = this._load();
  }

  _load() {
    try {
      const raw = fs.readFileSync(this.dataFile, 'utf8');
      const parsed = JSON.parse(raw);
      // Defensive defaults so a partially-written/old file never crashes us.
      return {
        version: parsed.version ?? SCHEMA_VERSION,
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      };
    } catch (err) {
      if (err.code === 'ENOENT') return emptyDb();
      // Corrupt JSON: don't nuke the user's file silently — back it up.
      if (err instanceof SyntaxError) {
        try {
          fs.renameSync(this.dataFile, `${this.dataFile}.corrupt-${Date.now()}`);
        } catch { /* best effort */ }
        return emptyDb();
      }
      throw err;
    }
  }

  _save() {
    fs.mkdirSync(path.dirname(this.dataFile), { recursive: true });
    // Atomic-ish write: write to temp then rename so a crash mid-write can't
    // corrupt the live file.
    const tmp = `${this.dataFile}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.db, null, 2));
    fs.renameSync(tmp, this.dataFile);
  }

  _id(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  // ---- Tasks ----

  listTasks() {
    // Newest first.
    return [...this.db.tasks].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getTask(id) {
    return this.db.tasks.find((t) => t.id === id) || null;
  }

  createTask(title) {
    const clean = String(title ?? '').trim();
    if (!clean) throw new ValidationError('title is required');
    const task = {
      id: this._id('task'),
      title: clean,
      done: false,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    this.db.tasks.push(task);
    this._save();
    return task;
  }

  setTaskDone(id, done) {
    const task = this.getTask(id);
    if (!task) return null;
    task.done = !!done;
    task.completedAt = done ? new Date().toISOString() : null;
    this._save();
    return task;
  }

  deleteTask(id) {
    const before = this.db.tasks.length;
    this.db.tasks = this.db.tasks.filter((t) => t.id !== id);
    if (this.db.tasks.length === before) return false;
    // Detach any sessions that referenced this task (keep the focused time).
    for (const s of this.db.sessions) {
      if (s.taskId === id) s.taskId = null;
    }
    this._save();
    return true;
  }

  // ---- Sessions (completed focus blocks) ----

  listSessions() {
    return [...this.db.sessions].sort((a, b) => b.endedAt.localeCompare(a.endedAt));
  }

  logSession({ taskId = null, minutes, startedAt, endedAt } = {}) {
    const mins = Number(minutes);
    if (!Number.isFinite(mins) || mins <= 0) {
      throw new ValidationError('minutes must be a positive number');
    }
    if (taskId && !this.getTask(taskId)) {
      throw new ValidationError('taskId does not exist');
    }
    const end = endedAt || new Date().toISOString();
    const start = startedAt || new Date(Date.parse(end) - mins * 60_000).toISOString();
    const session = {
      id: this._id('sess'),
      taskId: taskId || null,
      minutes: Math.round(mins * 100) / 100,
      startedAt: start,
      endedAt: end,
    };
    this.db.sessions.push(session);
    this._save();
    return session;
  }

  // ---- Stats ----

  stats(now = new Date()) {
    const dayKey = (iso) => (iso ? iso.slice(0, 10) : null);
    const today = now.toISOString().slice(0, 10);

    const tasksCompletedToday = this.db.tasks.filter(
      (t) => t.done && dayKey(t.completedAt) === today,
    ).length;

    const focusMinutesToday = this.db.sessions
      .filter((s) => dayKey(s.endedAt) === today)
      .reduce((sum, s) => sum + s.minutes, 0);

    const activeTasks = this.db.tasks.filter((t) => !t.done).length;

    return {
      date: today,
      tasksCompletedToday,
      focusMinutesToday: Math.round(focusMinutesToday * 100) / 100,
      activeTasks,
      totalTasks: this.db.tasks.length,
      totalSessions: this.db.sessions.length,
    };
  }
}

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}
