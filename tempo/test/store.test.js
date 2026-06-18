// Unit tests for the storage/logic layer.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store, ValidationError } from '../src/store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
let dataFile;

beforeEach(() => {
  dataFile = path.join(DATA_DIR, `test-store-${process.hrtime.bigint()}.json`);
});
afterEach(() => {
  for (const f of [dataFile, `${dataFile}.tmp`]) {
    if (fs.existsSync(f)) fs.rmSync(f);
  }
});

test('creates and lists tasks', () => {
  const store = new Store(dataFile);
  const t = store.createTask('Write tests');
  assert.equal(t.title, 'Write tests');
  assert.equal(t.done, false);
  assert.equal(t.completedAt, null);
  assert.match(t.id, /^task_/);
  assert.equal(store.listTasks().length, 1);
});

test('rejects empty task titles', () => {
  const store = new Store(dataFile);
  assert.throws(() => store.createTask('   '), ValidationError);
  assert.throws(() => store.createTask(), ValidationError);
});

test('trims whitespace from titles', () => {
  const store = new Store(dataFile);
  assert.equal(store.createTask('  hello  ').title, 'hello');
});

test('marks tasks done and undone', () => {
  const store = new Store(dataFile);
  const t = store.createTask('Task');
  const done = store.setTaskDone(t.id, true);
  assert.equal(done.done, true);
  assert.ok(done.completedAt);
  const undone = store.setTaskDone(t.id, false);
  assert.equal(undone.done, false);
  assert.equal(undone.completedAt, null);
});

test('setTaskDone on missing task returns null', () => {
  const store = new Store(dataFile);
  assert.equal(store.setTaskDone('nope', true), null);
});

test('deletes tasks and detaches their sessions', () => {
  const store = new Store(dataFile);
  const t = store.createTask('Task');
  store.logSession({ taskId: t.id, minutes: 25 });
  assert.equal(store.deleteTask(t.id), true);
  assert.equal(store.deleteTask(t.id), false);
  assert.equal(store.listTasks().length, 0);
  // Session survives but is detached.
  const sessions = store.listSessions();
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].taskId, null);
});

test('logs sessions and validates minutes', () => {
  const store = new Store(dataFile);
  const s = store.logSession({ minutes: 25 });
  assert.equal(s.minutes, 25);
  assert.ok(s.startedAt && s.endedAt);
  assert.throws(() => store.logSession({ minutes: 0 }), ValidationError);
  assert.throws(() => store.logSession({ minutes: -5 }), ValidationError);
  assert.throws(() => store.logSession({ minutes: 'abc' }), ValidationError);
});

test('rejects sessions for nonexistent tasks', () => {
  const store = new Store(dataFile);
  assert.throws(() => store.logSession({ minutes: 25, taskId: 'ghost' }), ValidationError);
});

test('stats counts today\'s completions and focus minutes', () => {
  const store = new Store(dataFile);
  const a = store.createTask('A');
  const b = store.createTask('B');
  store.setTaskDone(a.id, true);
  store.logSession({ minutes: 25 });
  store.logSession({ minutes: 10 });
  const s = store.stats();
  assert.equal(s.tasksCompletedToday, 1);
  assert.equal(s.focusMinutesToday, 35);
  assert.equal(s.activeTasks, 1); // b still active
  assert.equal(s.totalTasks, 2);
  assert.equal(s.totalSessions, 2);
});

test('stats excludes completions from other days', () => {
  const store = new Store(dataFile);
  const t = store.createTask('Yesterday task');
  store.setTaskDone(t.id, true);
  // Force completedAt into the past.
  store.db.tasks[0].completedAt = '2000-01-01T10:00:00.000Z';
  store.db.sessions.push({
    id: 'sess_old', taskId: null, minutes: 99,
    startedAt: '2000-01-01T09:00:00.000Z', endedAt: '2000-01-01T10:00:00.000Z',
  });
  const s = store.stats();
  assert.equal(s.tasksCompletedToday, 0);
  assert.equal(s.focusMinutesToday, 0);
});

test('persists across store instances', () => {
  const store = new Store(dataFile);
  store.createTask('Persist me');
  const reopened = new Store(dataFile);
  assert.equal(reopened.listTasks().length, 1);
  assert.equal(reopened.listTasks()[0].title, 'Persist me');
});

test('survives a corrupt data file by backing it up', () => {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(dataFile, '{ this is not json');
  const store = new Store(dataFile);
  assert.equal(store.listTasks().length, 0); // recovered to empty
  // The corrupt file was renamed; clean up the backup.
  const backups = fs.readdirSync(DATA_DIR).filter((f) => f.includes(path.basename(dataFile)) && f.includes('corrupt'));
  assert.equal(backups.length, 1);
  for (const b of backups) fs.rmSync(path.join(DATA_DIR, b));
});
