/**
 * Operator V1 — HARD-CRASH consistency of the dist-vnext publication
 * transaction.
 *
 * The caught-exception coverage of operator-v1-atomic-publish.test.js is not
 * sufficient for crash consistency: here the REAL server child process is
 * SIGKILLed mid-publication, so NO cleanup handlers run. The crash points are
 * the test-only env hook STUDIO_VNEXT_CRASH_AFTER=recipe|swap|backup (read by
 * the child; see server/dist-vnext-publish.js), which makes the child kill
 * itself at an exact point of the transaction:
 *
 *   recipe — after RecipeRunner durably persisted 'recipe_completed' and
 *            before publication begins (Window A)
 *   swap   — after the staged artifact was renamed into live dist-vnext and
 *            before the final 'published' update (Window B)
 *   backup — after the live->backup rename and before the staged->live
 *            rename (Window C)
 *
 * Documented recovery behavior (all idempotent — a second restart converges
 * to the exact same state):
 *
 *   Window A: the run stays 'recipe_completed' — terminal, NOT published and
 *     NOT publish_failed; recovery has nothing to resolve (no journal exists),
 *     the previous complete dist-vnext is untouched, and the operator may
 *     safely retry with a new build.
 *   Window B: recovery identifies the live artifact as the crashed run's by
 *     fingerprint match -> the run becomes 'published', the new artifact
 *     remains live, the run's backup dir and the publication journal are
 *     removed.
 *   Window C: the previous complete artifact is restored from the run's
 *     backup dir, the incomplete staged output and the journal are removed,
 *     and the run becomes 'publish_failed' — the new artifact is never
 *     claimed as published.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import net from 'net';
import { spawn } from 'child_process';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const { fingerprintDir } = require('../server/dist-vnext-publish.js');

const SITE_STUDIO_DIR = path.resolve(import.meta.dirname, '..');

const SITE_A = 'site-alpha'; // Window A
const SITE_B = 'site-beta'; // Window B
const SITE_C = 'site-gamma'; // Window C

let tmp;
let sitesRoot;
let vnextHubRoot;
let dbPath;
let tokenPath;
let homeDir;
let rootToken;
let child;
let base;
let previewPort;
let childLog = '';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
  });
}

async function waitFor(fn, { timeout = 30000, interval = 100, label = 'waitFor' } = {}) {
  const deadline = Date.now() + timeout;
  let lastErr;
  for (;;) {
    try {
      const value = await fn();
      if (value) return value;
    } catch (err) { lastErr = err; }
    if (Date.now() > deadline) {
      throw new Error(`${label} timed out.\nserver log tail:\n${childLog.slice(-2000)}${lastErr ? `\nlast error: ${lastErr.message}` : ''}`);
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

async function api(method, urlPath, { body } = {}) {
  const headers = { Authorization: `Bearer ${rootToken}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${base}${urlPath}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, json };
}

function writeFixtureSite(tag, siteName) {
  const dir = path.join(sitesRoot, tag);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), `<!DOCTYPE html><html><body><h1>${siteName}</h1></body></html>`);
  fs.writeFileSync(path.join(dir, 'spec.json'), JSON.stringify({
    tag,
    site_name: siteName,
    pages: ['index.html'],
  }, null, 2));
}

function distDir(tag) {
  return path.join(sitesRoot, tag, 'dist-vnext');
}

function distIndexHtml(tag) {
  const file = path.join(distDir(tag), 'index.html');
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

/** Abandoned publication entries under a site (staging tmp / backup / journal). */
function leftoverPublicationEntries(tag) {
  const dir = path.join(sitesRoot, tag);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) => name.startsWith('.dist-vnext-'));
}

function readJournal(tag, runId) {
  const file = path.join(sitesRoot, tag, `.dist-vnext-publication-${runId}.json`);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
}

/** Read a run row straight from the durable DB (the server is dead or not yet rebooted). */
function readRunRow(runId) {
  const db = new Database(dbPath);
  try {
    return db.prepare('SELECT * FROM runs WHERE run_id = ?').get(runId);
  } finally {
    db.close();
  }
}

/** The most recently started run — the crashed build's HTTP response never arrived. */
function readLatestRunRow() {
  const db = new Database(dbPath);
  try {
    return db.prepare('SELECT * FROM runs ORDER BY started_at DESC, run_id DESC LIMIT 1').get();
  } finally {
    db.close();
  }
}

async function previewText(tag) {
  const res = await fetch(`http://127.0.0.1:${previewPort}/vnext/${tag}/`);
  return { status: res.status, text: await res.text() };
}

/** Boot the real server. crashAfter: 'recipe' | 'swap' | 'backup' | null. */
async function bootServer(crashAfter = null) {
  const studioPort = await freePort();
  previewPort = await freePort();
  const env = { ...process.env };
  delete env.STUDIO_REQUIRE_AUTH;
  delete env.STUDIO_NO_LISTEN;
  delete env.STUDIO_VNEXT_PUBLISH_FAIL;
  delete env.STUDIO_VNEXT_CRASH_AFTER;
  Object.assign(env, {
    HOME: homeDir,
    STUDIO_PORT: String(studioPort),
    PREVIEW_PORT: String(previewPort),
    STUDIO_HOST: '127.0.0.1',
    SITE_TAG: SITE_A,
    STUDIO_SITES_ROOT: sitesRoot,
    STUDIO_VNEXT_HUB_ROOT: vnextHubRoot,
    STUDIO_TOKEN_PATH: tokenPath,
    RUNTIME_VNEXT_DB_PATH: dbPath,
  });
  if (crashAfter) env.STUDIO_VNEXT_CRASH_AFTER = crashAfter;

  child = spawn(process.execPath, ['server.js'], {
    cwd: SITE_STUDIO_DIR,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  childLog = '';
  child.stdout.on('data', (chunk) => { childLog += chunk.toString(); });
  child.stderr.on('data', (chunk) => { childLog += chunk.toString(); });

  base = `http://127.0.0.1:${studioPort}`;

  await waitFor(() => fs.existsSync(tokenPath), { label: 'root token file' });
  rootToken = fs.readFileSync(tokenPath, 'utf8').trim();
  expect(rootToken).toMatch(/^[0-9a-f]{64}$/);

  await waitFor(async () => {
    const res = await api('GET', '/api/server-info');
    return res.status === 200;
  }, { label: 'server readiness' });
}

async function waitForChildExit() {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise((resolve) => child.once('exit', resolve));
}

async function stopServer() {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise((resolve) => child.once('exit', resolve));
  child.kill('SIGTERM');
  await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 10000))]);
  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGKILL');
    await exited.catch(() => {});
  }
}

async function buildSite(tag, siteName) {
  return api('POST', '/api/site-studio/build-vnext', {
    body: { siteTag: tag, siteName, brief: `Landing page for ${siteName}.` },
  });
}

/**
 * Fire a build that SIGKILLs the server mid-flight: the HTTP request must
 * fail (the socket dies with the process), and the child must have exited
 * via SIGKILL — no cleanup handlers ran.
 */
async function buildExpectingCrash(tag, siteName) {
  let fetchError = null;
  try {
    await buildSite(tag, siteName);
  } catch (err) {
    fetchError = err;
  }
  expect(fetchError, 'the build request must fail because the server was SIGKILLed').toBeTruthy();
  await waitForChildExit();
  expect(child.signalCode).toBe('SIGKILL');
  return readLatestRunRow();
}

async function runStatus(runId) {
  return api('GET', `/api/site-studio/build-vnext/status?run_id=${runId}`);
}

// ---------------------------------------------------------------------------
// setup / teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'operator-v1-publish-crash-'));
  sitesRoot = path.join(tmp, 'sites');
  vnextHubRoot = path.join(tmp, 'vnext-hub');
  dbPath = path.join(tmp, 'runtime-vnext.db');
  tokenPath = path.join(tmp, 'studio-token');
  homeDir = path.join(tmp, 'home');

  fs.mkdirSync(sitesRoot, { recursive: true });
  fs.mkdirSync(homeDir, { recursive: true });
  fs.mkdirSync(vnextHubRoot, { recursive: true });
  fs.symlinkSync(path.join(SITE_STUDIO_DIR, 'runtime-vnext'), path.join(vnextHubRoot, 'runtime-vnext'), 'dir');

  writeFixtureSite(SITE_A, 'Alpha Zero');
  writeFixtureSite(SITE_B, 'Beta Zero');
  writeFixtureSite(SITE_C, 'Gamma Zero');
}, 30000);

afterAll(async () => {
  await stopServer();
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
}, 60000);

// ---------------------------------------------------------------------------
// crash windows
// ---------------------------------------------------------------------------

describe('Operator V1 publication hard-crash recovery (real server, SIGKILL)', () => {
  it('Window A: killed after recipe_completed, before publication — status stays recipe_completed, prior artifact untouched, retry-safe', async () => {
    // A complete prior publication exists.
    await bootServer();
    const first = await buildSite(SITE_A, 'Alpha One');
    expect(first.status).toBe(200);
    expect(distIndexHtml(SITE_A)).toContain('Alpha One');
    await stopServer();

    // Crash the child after the runner durably persisted recipe_completed,
    // before publication began.
    await bootServer('recipe');
    const crashed = await buildExpectingCrash(SITE_A, 'Alpha Two');
    expect(crashed.status).toBe('recipe_completed');

    // Pre-reboot: the previous dist-vnext is byte-identical, no partial new
    // artifact, no staged/backup/journal debris.
    expect(distIndexHtml(SITE_A)).toContain('Alpha One');
    expect(leftoverPublicationEntries(SITE_A)).toEqual([]);

    // After restart: truthful recipe_completed — NOT published, NOT failed.
    await bootServer();
    const status = await runStatus(crashed.run_id);
    expect(status.status).toBe(200);
    expect(status.json.status).toBe('recipe_completed');
    expect(distIndexHtml(SITE_A)).toContain('Alpha One');
    expect(leftoverPublicationEntries(SITE_A)).toEqual([]);
    const preview = await previewText(SITE_A);
    expect(preview.status).toBe(200);
    expect(preview.text).toContain('Alpha One');
    expect(preview.text).not.toContain('Alpha Two');

    // Retry-safe: a fresh build publishes normally, and the crashed run keeps
    // its truthful recipe_completed status (no false published, ever).
    const retry = await buildSite(SITE_A, 'Alpha Two');
    expect(retry.status).toBe(200);
    expect(retry.json.success).toBe(true);
    expect((await runStatus(retry.json.run_id)).json.status).toBe('published');
    expect((await runStatus(crashed.run_id)).json.status).toBe('recipe_completed');
    expect(distIndexHtml(SITE_A)).toContain('Alpha Two');
    expect(leftoverPublicationEntries(SITE_A)).toEqual([]);
    await stopServer();
  }, 180000);

  it('Window B: killed after the staged artifact went live, before published — recovery confirms publication by fingerprint (idempotent)', async () => {
    await bootServer();
    const first = await buildSite(SITE_B, 'Beta One');
    expect(first.status).toBe(200);
    expect(distIndexHtml(SITE_B)).toContain('Beta One');
    await stopServer();

    // Crash the child after tmp -> dist-vnext landed, before the 'published'
    // update and before backup/journal cleanup.
    await bootServer('swap');
    const crashed = await buildExpectingCrash(SITE_B, 'Beta Two');
    expect(crashed.status).toBe('publishing');

    // Pre-reboot: the new artifact IS live; the backup of the previous
    // artifact and the durable publication journal survived the crash.
    expect(distIndexHtml(SITE_B)).toContain('Beta Two');
    const leftovers = leftoverPublicationEntries(SITE_B);
    expect(leftovers).toContain(`.dist-vnext-backup-${crashed.run_id}`);
    expect(leftovers).toContain(`.dist-vnext-publication-${crashed.run_id}.json`);
    expect(leftovers).not.toContain(`.dist-vnext-${crashed.run_id}-tmp`);
    const backupHtml = fs.readFileSync(path.join(sitesRoot, SITE_B, `.dist-vnext-backup-${crashed.run_id}`, 'index.html'), 'utf8');
    expect(backupHtml).toContain('Beta One');

    // The journal durably identifies this run's artifact, and the live
    // dist-vnext provably matches its expected fingerprint.
    const journal = readJournal(SITE_B, crashed.run_id);
    expect(journal.publication_mode).toBe('external_atomic');
    expect(journal.run_id).toBe(crashed.run_id);
    expect(journal.site_tag).toBe(SITE_B);
    expect(journal.status).toBe('publishing');
    expect(journal.expected_fingerprint).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(fingerprintDir(distDir(SITE_B))).toBe(journal.expected_fingerprint);

    // Restart 1: fingerprint match -> publication confirmed.
    await bootServer();
    expect((await runStatus(crashed.run_id)).json.status).toBe('published');
    expect(distIndexHtml(SITE_B)).toContain('Beta Two');
    expect(leftoverPublicationEntries(SITE_B)).toEqual([]);
    const preview = await previewText(SITE_B);
    expect(preview.status).toBe(200);
    expect(preview.text).toContain('Beta Two');
    await stopServer();

    // Restart 2: idempotency — the exact same final state.
    await bootServer();
    expect((await runStatus(crashed.run_id)).json.status).toBe('published');
    expect(distIndexHtml(SITE_B)).toContain('Beta Two');
    expect(leftoverPublicationEntries(SITE_B)).toEqual([]);
    await stopServer();
  }, 180000);

  it('Window C: killed between live->backup and staged->live — backup restored, publish_failed, no partial artifact (idempotent)', async () => {
    await bootServer();
    const first = await buildSite(SITE_C, 'Gamma One');
    expect(first.status).toBe(200);
    expect(distIndexHtml(SITE_C)).toContain('Gamma One');
    await stopServer();

    // Crash the child after dist-vnext -> backup, before tmp -> dist-vnext.
    await bootServer('backup');
    const crashed = await buildExpectingCrash(SITE_C, 'Gamma Two');
    expect(crashed.status).toBe('publishing');

    // Pre-reboot: dist-vnext is MISSING, the backup holds the previous
    // complete artifact, the staged new artifact and the journal survived.
    expect(fs.existsSync(distDir(SITE_C))).toBe(false);
    const leftovers = leftoverPublicationEntries(SITE_C);
    expect(leftovers).toContain(`.dist-vnext-backup-${crashed.run_id}`);
    expect(leftovers).toContain(`.dist-vnext-${crashed.run_id}-tmp`);
    expect(leftovers).toContain(`.dist-vnext-publication-${crashed.run_id}.json`);
    const backupHtml = fs.readFileSync(path.join(sitesRoot, SITE_C, `.dist-vnext-backup-${crashed.run_id}`, 'index.html'), 'utf8');
    expect(backupHtml).toContain('Gamma One');
    const stagedHtml = fs.readFileSync(path.join(sitesRoot, SITE_C, `.dist-vnext-${crashed.run_id}-tmp`, 'index.html'), 'utf8');
    expect(stagedHtml).toContain('Gamma Two');
    const journal = readJournal(SITE_C, crashed.run_id);
    expect(journal.run_id).toBe(crashed.run_id);
    expect(journal.expected_fingerprint).toBe(fingerprintDir(path.join(sitesRoot, SITE_C, `.dist-vnext-${crashed.run_id}-tmp`)));

    // Restart 1: live missing + backup present -> restore backup, fail the
    // publication, remove the abandoned staged output and the journal.
    await bootServer();
    expect((await runStatus(crashed.run_id)).json.status).toBe('publish_failed');
    const html = distIndexHtml(SITE_C);
    expect(html).toContain('Gamma One');
    expect(html).not.toContain('Gamma Two');
    expect(leftoverPublicationEntries(SITE_C)).toEqual([]);
    const preview = await previewText(SITE_C);
    expect(preview.status).toBe(200);
    expect(preview.text).toContain('Gamma One');
    await stopServer();

    // Restart 2: idempotency — same status, same artifact, no debris.
    await bootServer();
    expect((await runStatus(crashed.run_id)).json.status).toBe('publish_failed');
    expect(distIndexHtml(SITE_C)).toContain('Gamma One');
    expect(leftoverPublicationEntries(SITE_C)).toEqual([]);
    await stopServer();
  }, 180000);
});
