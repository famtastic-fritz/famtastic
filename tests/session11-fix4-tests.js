#!/usr/bin/env node
/**
 * Session 11 Fix 4 Tests — Interview auto-trigger + admin control
 *
 * 1. new-site flag:    POST /api/new-site sets spec.interview_pending=true
 *                      when auto_interview is enabled (default).
 * 2. admin disable:    When auto_interview=false in studio-config, a new
 *                      site is created WITHOUT interview_pending set.
 * 3. health endpoint:  GET /api/interview/health returns should_prompt=true
 *                      when a fresh flagged site is active, false otherwise.
 * 4. completion clears flag: Skipping (or finishing) the interview clears
 *                      interview_pending on spec.json.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const assert = require('assert');

const ROOT          = path.join(__dirname, '..');
const SERVER_SCRIPT = path.join(ROOT, 'site-studio', 'server.js');
const SITES_DIR     = path.join(ROOT, 'sites');
const CFG_FILE      = path.join(process.env.HOME || '~', '.config', 'famtastic', 'studio-config.json');
const PORT          = 3399;

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
        // CSRF allowlist expects a same-origin request
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
    env: { ...process.env, ...env, PORT: String(PORT), STUDIO_PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  // Wait for server to accept connections
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const r = await req('GET', '/api/brain-status');
      if (r.status) return child;
    } catch {}
    await wait(300);
  }
  child.kill();
  throw new Error('server failed to start');
}

function readCfg() {
  if (!fs.existsSync(CFG_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(CFG_FILE, 'utf8')); } catch { return {}; }
}
function writeCfg(obj) {
  fs.mkdirSync(path.dirname(CFG_FILE), { recursive: true });
  fs.writeFileSync(CFG_FILE, JSON.stringify(obj, null, 2));
}

async function cleanupSite(tag) {
  const dir = path.join(SITES_DIR, tag);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

async function main() {
  const cfgBackup = readCfg();
  const tag1 = 'site-fix4-auto-on';
  const tag2 = 'site-fix4-auto-off';
  await cleanupSite(tag1);
  await cleanupSite(tag2);

  // ── Test 1: auto_interview ENABLED (default) ──
  console.log('\n── Test 1: auto_interview enabled → interview_pending=true ──');
  writeCfg({ ...cfgBackup, auto_interview: true });
  let server = await startServer({ SITE_TAG: 'site-drop-the-beat' });
  try {
    const r1 = await req('POST', '/api/new-site', { tag: tag1, name: 'Fix4 Auto On' });
    check('POST /api/new-site returns success', r1.status === 200 && r1.body?.success, `status=${r1.status}`);
    const spec1 = JSON.parse(fs.readFileSync(path.join(SITES_DIR, tag1, 'spec.json'), 'utf8'));
    check('interview_pending=true on new spec', spec1.interview_pending === true,
      `got ${spec1.interview_pending}`);
    check('interview_completed=false on new spec', spec1.interview_completed === false);

    // ── Test 3: health endpoint says should_prompt=true ──
    console.log('\n── Test 3: /api/interview/health → should_prompt:true ──');
    const r3 = await req('GET', '/api/interview/health');
    check('health endpoint 200',             r3.status === 200);
    check('auto_interview_enabled=true',     r3.body?.auto_interview_enabled === true);
    check('interview_pending=true',          r3.body?.interview_pending === true);
    check('should_prompt=true',              r3.body?.should_prompt === true,
      `got ${r3.body?.should_prompt} reason=${r3.body?.reason}`);
    check('reason=ready_to_prompt',          r3.body?.reason === 'ready_to_prompt',
      `got ${r3.body?.reason}`);

    // ── Test 4: completion clears the flag ──
    console.log('\n── Test 4: skip interview → interview_pending cleared ──');
    const r4a = await req('POST', '/api/interview/start', { mode: 'skip' });
    check('skip returns completed:true', r4a.body?.completed === true);
    const spec4 = JSON.parse(fs.readFileSync(path.join(SITES_DIR, tag1, 'spec.json'), 'utf8'));
    check('interview_pending=false after skip', spec4.interview_pending === false,
      `got ${spec4.interview_pending}`);
    check('interview_completed=true after skip', spec4.interview_completed === true);
    const r4b = await req('GET', '/api/interview/health');
    check('health should_prompt=false after skip', r4b.body?.should_prompt === false);
  } finally {
    server.kill();
    await wait(500);
  }

  // ── Test 2: auto_interview DISABLED ──
  console.log('\n── Test 2: auto_interview=false → interview_pending=false ──');
  writeCfg({ ...cfgBackup, auto_interview: false });
  server = await startServer({ SITE_TAG: 'site-drop-the-beat' });
  try {
    const r2 = await req('POST', '/api/new-site', { tag: tag2, name: 'Fix4 Auto Off' });
    check('POST /api/new-site returns success', r2.status === 200 && r2.body?.success);
    const spec2 = JSON.parse(fs.readFileSync(path.join(SITES_DIR, tag2, 'spec.json'), 'utf8'));
    check('interview_pending=false when admin disabled', spec2.interview_pending === false,
      `got ${spec2.interview_pending}`);
    const h = await req('GET', '/api/interview/health');
    check('health should_prompt=false when admin disabled', h.body?.should_prompt === false);
    check('health reason indicates admin disable or not flagged',
      h.body?.reason === 'auto_disabled_by_admin' || h.body?.reason === 'not_flagged_pending',
      `got ${h.body?.reason}`);
  } finally {
    server.kill();
    await wait(500);
  }

  // Cleanup
  writeCfg(cfgBackup);
  await cleanupSite(tag1);
  await cleanupSite(tag2);

  console.log('\n' + '─'.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error('\n[test-runner]', e); process.exit(1); });
