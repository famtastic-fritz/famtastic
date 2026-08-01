/**
 * Operator V1 — atomic dist-vnext publication.
 *
 * Boots the REAL server.js as a child process (same harness pattern as
 * operator-v1-release.test.js) against a fully temporary world and proves the
 * publication contract of server/dist-vnext-publish.js + the build route:
 *
 *   1. a previously published dist-vnext exists
 *   2. a new build reaches publication
 *   3. staging/swap failures are injected via the test-only env hook
 *      STUDIO_VNEXT_PUBLISH_FAIL=stage|swap (read by the child at publish time)
 *   4. the previous complete dist-vnext remains intact and previewable
 *   5. no partial new artifact becomes live
 *   6. the run status is publish_failed, not published
 *   7. a restart preserves the truthful failure status
 *   8. a successful later build atomically replaces the previous artifact
 *   9. status becomes published only after the replacement
 *  10. no temporary or backup publication dirs remain after success
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import net from 'net';
import { spawn } from 'child_process';

const SITE_STUDIO_DIR = path.resolve(import.meta.dirname, '..');

const SITE_A = 'site-alpha';
const SITE_B = 'site-beta';

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

function distIndexHtml(tag) {
  const file = path.join(sitesRoot, tag, 'dist-vnext', 'index.html');
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

/** Abandoned publication dirs under a site (staging tmp / swap backup). */
function leftoverPublicationDirs(tag) {
  const dir = path.join(sitesRoot, tag);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) => name.startsWith('.dist-vnext-'));
}

async function previewText(tag) {
  const res = await fetch(`http://127.0.0.1:${previewPort}/vnext/${tag}/`);
  return { status: res.status, text: await res.text() };
}

/** Boot the real server. publishFailMode: 'stage' | 'swap' | null. */
async function bootServer(publishFailMode = null) {
  const studioPort = await freePort();
  previewPort = await freePort();
  const env = { ...process.env };
  delete env.STUDIO_REQUIRE_AUTH;
  delete env.STUDIO_NO_LISTEN;
  delete env.STUDIO_VNEXT_PUBLISH_FAIL;
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
  if (publishFailMode) env.STUDIO_VNEXT_PUBLISH_FAIL = publishFailMode;

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

async function stopServer() {
  if (!child || child.exitCode !== null) return;
  const exited = new Promise((resolve) => child.once('exit', resolve));
  child.kill('SIGTERM');
  await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 10000))]);
  if (child.exitCode === null) child.kill('SIGKILL');
  await exited.catch(() => {});
}

async function buildSite(tag, siteName) {
  return api('POST', '/api/site-studio/build-vnext', {
    body: { siteTag: tag, siteName, brief: `Landing page for ${siteName}.` },
  });
}

async function runStatus(runId) {
  return api('GET', `/api/site-studio/build-vnext/status?run_id=${runId}`);
}

// ---------------------------------------------------------------------------
// setup / teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'operator-v1-atomic-publish-'));
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
}, 30000);

afterAll(async () => {
  await stopServer();
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
}, 60000);

// ---------------------------------------------------------------------------
// the atomic publication flow, in order
// ---------------------------------------------------------------------------

describe('Operator V1 atomic dist-vnext publication (real server, real HTTP)', () => {
  let alphaRun1;
  let betaRun1;
  let alphaRun2;

  it('(1)+(2) builds for A and B publish successfully and reach published status', async () => {
    await bootServer();

    const buildA = await buildSite(SITE_A, 'Alpha One');
    expect(buildA.status).toBe(200);
    expect(buildA.json.success).toBe(true);
    alphaRun1 = buildA.json.run_id;
    expect(distIndexHtml(SITE_A)).toContain('Alpha One');

    const buildB = await buildSite(SITE_B, 'Beta One');
    expect(buildB.status).toBe(200);
    betaRun1 = buildB.json.run_id;
    expect(distIndexHtml(SITE_B)).toContain('Beta One');

    // Status is published only now that the artifact actually landed.
    const statusA = await runStatus(alphaRun1);
    expect(statusA.json.status).toBe('published');
    expect((await runStatus(betaRun1)).json.status).toBe('published');

    // No publication debris after a successful swap.
    expect(leftoverPublicationDirs(SITE_A)).toEqual([]);
    expect(leftoverPublicationDirs(SITE_B)).toEqual([]);
    await stopServer();
  }, 120000);

  it('(3)-(6) a staging failure keeps the old artifact live and marks the run publish_failed', async () => {
    await bootServer('stage');

    const build = await buildSite(SITE_A, 'Alpha Two');
    expect(build.status).toBe(500);
    expect(build.json.success).toBe(false);
    expect(build.json.error).toContain('publication failed');
    alphaRun2 = build.json.run_id;

    // (6) Durable + HTTP-visible status is publish_failed, never published.
    const status = await runStatus(alphaRun2);
    expect(status.status).toBe(200);
    expect(status.json.status).toBe('publish_failed');

    // (4) The previously published artifact is intact and previewable.
    expect(distIndexHtml(SITE_A)).toContain('Alpha One');
    const preview = await previewText(SITE_A);
    expect(preview.status).toBe(200);
    expect(preview.text).toContain('Alpha One');
    expect(preview.text).not.toContain('Alpha Two');

    // (5) The failed staging dir was cleaned up — nothing partial remains.
    expect(leftoverPublicationDirs(SITE_A)).toEqual([]);
    await stopServer();
  }, 120000);

  it('(7) a restart preserves the truthful publish_failed status', async () => {
    await bootServer();
    const status = await runStatus(alphaRun2);
    expect(status.status).toBe(200);
    expect(status.json.status).toBe('publish_failed');
    // The old artifact survived the restart too.
    expect(distIndexHtml(SITE_A)).toContain('Alpha One');
  }, 120000);

  it('(8)+(9)+(10) a later successful build atomically replaces the artifact', async () => {
    const build = await buildSite(SITE_A, 'Alpha Three');
    expect(build.status).toBe(200);
    expect(build.json.success).toBe(true);

    // (8) New content is served, the old artifact is gone.
    const html = distIndexHtml(SITE_A);
    expect(html).toContain('Alpha Three');
    expect(html).not.toContain('Alpha One');
    const preview = await previewText(SITE_A);
    expect(preview.text).toContain('Alpha Three');

    // (9) The new run reached published only after the replacement landed.
    const status = await runStatus(build.json.run_id);
    expect(status.json.status).toBe('published');
    // And the earlier failed run keeps its truthful failure status.
    expect((await runStatus(alphaRun2)).json.status).toBe('publish_failed');

    // (10) No temporary or backup publication dirs remain after success.
    expect(leftoverPublicationDirs(SITE_A)).toEqual([]);
    await stopServer();
  }, 120000);

  it('(swap) a failure during the final swap restores the old artifact and reports publish_failed', async () => {
    await bootServer('swap');

    const build = await buildSite(SITE_B, 'Beta Two');
    expect(build.status).toBe(500);
    expect(build.json.success).toBe(false);

    const betaRun2 = build.json.run_id;
    expect((await runStatus(betaRun2)).json.status).toBe('publish_failed');

    // The previous complete dist-vnext was restored from its backup.
    expect(distIndexHtml(SITE_B)).toContain('Beta One');
    const preview = await previewText(SITE_B);
    expect(preview.status).toBe(200);
    expect(preview.text).toContain('Beta One');
    expect(leftoverPublicationDirs(SITE_B)).toEqual([]);

    // Restart is truthful: still publish_failed, old artifact still live.
    await stopServer();
    await bootServer();
    expect((await runStatus(betaRun2)).json.status).toBe('publish_failed');
    expect(distIndexHtml(SITE_B)).toContain('Beta One');
    expect(leftoverPublicationDirs(SITE_B)).toEqual([]);
    await stopServer();
  }, 180000);
});
