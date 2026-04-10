#!/usr/bin/env node
/**
 * Session 11 Fix 8 Tests — Worker queue visibility endpoint + UI badge
 *
 * Verifies:
 *   1. GET /api/worker-queue returns the extended Fix 8 schema with
 *      count / pending_count / by_worker / by_status / oldest_pending /
 *      queue_path when the queue file is missing (empty base response).
 *   2. With synthetic JSONL tasks seeded into ~/famtastic/.worker-queue.jsonl,
 *      the endpoint correctly aggregates:
 *        - total task count
 *        - pending_count (tasks not in completed/cancelled/failed)
 *        - per-worker counts
 *        - per-status counts
 *        - oldest_pending = earliest queued_at among unfinished tasks
 *   3. Required static assets are wired up:
 *        - public/js/worker-queue-badge.js exists
 *        - public/index.html includes the <script> tag
 *        - public/index.html contains the badge markup
 *        - public/css/studio-brain-selector.css contains .worker-queue-badge
 */

'use strict';

const fs   = require('fs');
const os   = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const ROOT          = path.join(__dirname, '..');
const SERVER_SCRIPT = path.join(ROOT, 'site-studio', 'server.js');
const PUBLIC_DIR    = path.join(ROOT, 'site-studio', 'public');
const QUEUE_PATH    = path.join(os.homedir(), 'famtastic', '.worker-queue.jsonl');
const PORT          = 3398;

let passed = 0;
let failed = 0;
function check(label, cond, detail = '') {
  if (cond) { console.log(`  PASS  ${label}`); passed++; }
  else      { console.log(`  FAIL  ${label}${detail ? ' — ' + detail : ''}`); failed++; }
}

function req(method, pathname, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({
      host: '127.0.0.1', port: PORT, path: pathname, method,
      headers: {
        'content-type': 'application/json',
        origin:  `http://localhost:${PORT}`,
        referer: `http://localhost:${PORT}/`,
        ...(data ? { 'content-length': Buffer.byteLength(data) } : {}),
      },
    }, (res) => {
      let buf = '';
      res.on('data', (c) => { buf += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: buf ? JSON.parse(buf) : null }); }
        catch (e) { resolve({ status: res.statusCode, body: buf }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function startServer(env) {
  const child = spawn('node', [SERVER_SCRIPT], {
    cwd: path.join(ROOT, 'site-studio'),
    env: { ...process.env, ...env, PORT: String(PORT), STUDIO_PORT: String(PORT), PREVIEW_PORT: '3397' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderrBuf = '';
  child.stderr.on('data', (c) => { stderrBuf += c.toString(); });
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const r = await req('GET', '/api/brain-status');
      if (r.status) return child;
    } catch {}
    await wait(300);
  }
  child.kill();
  throw new Error('server failed to start:\n' + stderrBuf);
}

async function main() {
  // ── Test 0: static asset wiring ──
  console.log('\n── Test 0: static asset wiring ──');
  const jsFile = path.join(PUBLIC_DIR, 'js', 'worker-queue-badge.js');
  check('js/worker-queue-badge.js exists', fs.existsSync(jsFile));

  const indexHtml = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');
  check('index.html has <script src="js/worker-queue-badge.js">',
    indexHtml.includes('js/worker-queue-badge.js'));
  check('index.html has #worker-queue-badge markup',
    indexHtml.includes('id="worker-queue-badge"'));
  check('index.html has #worker-queue-count element',
    indexHtml.includes('id="worker-queue-count"'));

  const css = fs.readFileSync(
    path.join(PUBLIC_DIR, 'css', 'studio-brain-selector.css'), 'utf8');
  check('studio-brain-selector.css has .worker-queue-badge',
    css.includes('.worker-queue-badge'));
  check('studio-brain-selector.css has pulse animation',
    /@keyframes\s+wqb-pulse/.test(css));

  // Back up any existing queue file so the tests are isolated
  let queueBackup = null;
  if (fs.existsSync(QUEUE_PATH)) {
    queueBackup = fs.readFileSync(QUEUE_PATH, 'utf8');
  }

  const server = await startServer({ SITE_TAG: 'site-drop-the-beat' });
  try {
    // ── Test 1: endpoint shape with NO queue file ──
    console.log('\n── Test 1: empty queue file → base response ──');
    if (fs.existsSync(QUEUE_PATH)) fs.unlinkSync(QUEUE_PATH);
    const r1 = await req('GET', '/api/worker-queue');
    check('status 200',                  r1.status === 200);
    check('tasks is array',              Array.isArray(r1.body?.tasks));
    check('count === 0',                 r1.body?.count === 0);
    check('pending_count === 0',         r1.body?.pending_count === 0);
    check('by_worker is object',         r1.body && typeof r1.body.by_worker === 'object');
    check('by_status is object',         r1.body && typeof r1.body.by_status === 'object');
    check('oldest_pending is null',      r1.body?.oldest_pending === null);
    check('queue_path is string',        typeof r1.body?.queue_path === 'string');
    check('queue_path ends with .worker-queue.jsonl',
      typeof r1.body?.queue_path === 'string' &&
      r1.body.queue_path.endsWith('.worker-queue.jsonl'));

    // ── Test 2: synthetic JSONL aggregation ──
    console.log('\n── Test 2: synthetic queue → aggregation ──');
    const tasks = [
      { id: 't1', worker: 'claude_code', status: 'pending',   queued_at: '2026-04-10T10:00:00Z' },
      { id: 't2', worker: 'claude_code', status: 'pending',   queued_at: '2026-04-10T11:00:00Z' },
      { id: 't3', worker: 'codex_cli',   status: 'running',   queued_at: '2026-04-10T09:00:00Z' },
      { id: 't4', worker: 'gemini_cli',  status: 'completed', queued_at: '2026-04-10T08:00:00Z' },
      { id: 't5', worker: 'codex_cli',   status: 'cancelled', queued_at: '2026-04-10T07:00:00Z' },
      { id: 't6', worker: 'claude_code', status: 'failed',    queued_at: '2026-04-10T06:00:00Z' },
    ];
    fs.mkdirSync(path.dirname(QUEUE_PATH), { recursive: true });
    fs.writeFileSync(QUEUE_PATH, tasks.map(t => JSON.stringify(t)).join('\n') + '\n');

    const r2 = await req('GET', '/api/worker-queue');
    check('status 200',                       r2.status === 200);
    check('count === 6',                      r2.body?.count === 6,
      `got ${r2.body?.count}`);
    // pending_count = 3 (two pending + one running)
    check('pending_count === 3',              r2.body?.pending_count === 3,
      `got ${r2.body?.pending_count}`);
    check('by_worker.claude_code === 3',      r2.body?.by_worker?.claude_code === 3);
    check('by_worker.codex_cli === 2',        r2.body?.by_worker?.codex_cli === 2);
    check('by_worker.gemini_cli === 1',       r2.body?.by_worker?.gemini_cli === 1);
    check('by_status.pending === 2',          r2.body?.by_status?.pending === 2);
    check('by_status.running === 1',          r2.body?.by_status?.running === 1);
    check('by_status.completed === 1',        r2.body?.by_status?.completed === 1);
    check('by_status.cancelled === 1',        r2.body?.by_status?.cancelled === 1);
    check('by_status.failed === 1',           r2.body?.by_status?.failed === 1);
    // oldest_pending = earliest queued_at among non-completed/cancelled/failed
    // That's t3 (running @ 09:00)
    check('oldest_pending === t3 timestamp',
      r2.body?.oldest_pending === '2026-04-10T09:00:00Z',
      `got ${r2.body?.oldest_pending}`);
    check('tasks array length === 6',         Array.isArray(r2.body?.tasks) && r2.body.tasks.length === 6);

    // ── Test 3: all tasks finished → pending_count 0 ──
    console.log('\n── Test 3: all tasks finished → pending_count=0 ──');
    const finished = [
      { id: 'a', worker: 'claude_code', status: 'completed', queued_at: '2026-04-10T01:00:00Z' },
      { id: 'b', worker: 'codex_cli',   status: 'completed', queued_at: '2026-04-10T02:00:00Z' },
    ];
    fs.writeFileSync(QUEUE_PATH, finished.map(t => JSON.stringify(t)).join('\n') + '\n');
    const r3 = await req('GET', '/api/worker-queue');
    check('count === 2',            r3.body?.count === 2);
    check('pending_count === 0',    r3.body?.pending_count === 0);
    check('oldest_pending === null', r3.body?.oldest_pending === null);
  } finally {
    server.kill();
    await wait(500);
    // Restore any existing queue file
    if (queueBackup !== null) {
      fs.writeFileSync(QUEUE_PATH, queueBackup);
    } else if (fs.existsSync(QUEUE_PATH)) {
      fs.unlinkSync(QUEUE_PATH);
    }
  }

  console.log('\n' + '─'.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(2);
});
