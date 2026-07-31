/**
 * Immutable deploy target — regression test for the release blocker.
 *
 * Boots the REAL server.js as a child process (same pattern as
 * operator-v1-release.test.js) against a fully temporary world, and — unlike
 * that test — lets the deploy dispatch run the REAL scripts/site-deploy bash
 * script. Only the Netlify CLI itself is faked: a `netlify` executable on PATH
 * that records its argv and prints a deterministic proof URL.
 *
 * Proves:
 *  1. Site A is configured with Netlify site id A (provider netlify).
 *  2. A deploy for Site A is dispatched over real HTTP.
 *  3. After dispatch, Site A's spec.json is drifted: site id changes to B AND
 *     deploy_provider flips to cloudflare, and the ambient selection flips to
 *     Site B.
 *  4. The fake Netlify CLI still receives `--site <id-A>` — the id captured
 *     BEFORE dispatch travels via SITE_DEPLOY_SITE_ID and the script never
 *     re-reads spec.json to pick its target; the provider captured BEFORE
 *     dispatch travels via SITE_DEPLOY_PROVIDER and the script never re-reads
 *     spec.deploy_provider / config defaults / CLI autodetect.
 *  5. The alternate provider (a fake `wrangler` on PATH) is never invoked.
 *  6. The deployment record persists captured_provider=netlify,
 *     actual_provider_used=netlify, captured_site_id=A, actual_site_id_used=A.
 *  7. Site B is never targeted; the proof URL stays associated with Site A.
 *  8. The same values survive a process restart.
 *
 * Plus three failure cases: an unusable id fails clearly on the immutable path
 * (script-side validation), a forced marker mismatch fails the deployment with
 * site_id_mismatch, and a forced provider mismatch fails with provider_mismatch
 * (never silently persists a drifted target).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import net from 'net';
import { spawn } from 'child_process';

const require = createRequire(import.meta.url);

const SITE_STUDIO_DIR = path.resolve(import.meta.dirname, '..');

const SITE_A = 'site-alpha';
const SITE_B = 'site-beta';
const SITE_BAD = 'site-delta'; // has artifact, but an INVALID netlify id
const SITE_MISMATCH = 'site-epsilon'; // spawn patch forces a site-id marker mismatch here
const SITE_PROV_MISMATCH = 'site-theta'; // spawn patch forces a provider marker mismatch here
const ID_A = '11111111-aaaa-4000-8000-00000000000a';
const ID_B = '22222222-bbbb-4000-8000-00000000000b';
const ID_BAD = 'not a valid site id!!';
const ID_WRONG = '99999999-ffff-4000-8000-00000000009f';
const ID_THETA = '55555555-eeee-4000-8000-00000000005e';
const WRONG_PROVIDER = 'cloudflare';
const PROOF_URL_A = `https://proof-${ID_A}.netlify.app`;

let tmp;
let sitesRoot;
let vnextHubRoot;
let dbPath;
let tokenPath;
let homeDir;
let binDir;
let patchFile;
let netlifyLog;
let wranglerLog;
let rootToken;
let child;
let base;
let childLog = '';

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

function readSpec(siteTag) {
  return JSON.parse(fs.readFileSync(path.join(sitesRoot, siteTag, 'spec.json'), 'utf8'));
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

/**
 * Spawn patch: intercepts scripts/site-deploy ONLY for the mismatch sites and
 * plays a fake child that reports a DIFFERENT site id (site-epsilon) or a
 * DIFFERENT provider (site-theta) than the ones captured — every other
 * dispatch runs the real bash script against the fake netlify CLI.
 */
const SPAWN_PATCH_SOURCE = `'use strict';
const cp = require('child_process');
const { EventEmitter } = require('events');
const mismatchTag = process.env.STUDIO_TEST_MISMATCH_TAG;
const wrongId = process.env.STUDIO_TEST_WRONG_ID;
const provMismatchTag = process.env.STUDIO_TEST_PROVIDER_MISMATCH_TAG;
const wrongProvider = process.env.STUDIO_TEST_WRONG_PROVIDER;
const realSpawn = cp.spawn;
function fakeChild(emit) {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.pid = 4343;
  child.kill = () => {};
  process.nextTick(() => { emit(child); child.emit('close', 0); });
  return child;
}
cp.spawn = function patchedSpawn(file, args, options) {
  const argv = Array.isArray(args) ? args : [];
  const isSiteDeploy = typeof file === 'string' && /scripts[\\/\\\\]site-deploy$/.test(file);
  if (isSiteDeploy && mismatchTag && argv.includes(mismatchTag)) {
    return fakeChild((child) => {
      child.stderr.emit('data', Buffer.from('[deploy] site-id-used: ' + wrongId + '\\n'));
      child.stdout.emit('data', Buffer.from('Live URL: https://proof-' + wrongId + '.netlify.app\\n'));
    });
  }
  if (isSiteDeploy && provMismatchTag && argv.includes(provMismatchTag)) {
    // Correct site id, WRONG provider — proves provider_mismatch fails closed
    // even when the site-id binding holds.
    const siteId = options && options.env && options.env.SITE_DEPLOY_SITE_ID;
    return fakeChild((child) => {
      if (siteId) child.stderr.emit('data', Buffer.from('[deploy] site-id-used: ' + siteId + '\\n'));
      child.stderr.emit('data', Buffer.from('[deploy] provider-used: ' + wrongProvider + '\\n'));
      child.stdout.emit('data', Buffer.from('Live URL: https://proof-' + siteId + '.netlify.app\\n'));
    });
  }
  return realSpawn.apply(cp, [file, args, options]);
};
`;

/** Fake `netlify` CLI: records every invocation (and the --site value of
 * deploys) to NETLIFY_FAKE_LOG and prints a deterministic proof URL. */
const FAKE_NETLIFY_SOURCE = `#!/usr/bin/env bash
LOG="${'${NETLIFY_FAKE_LOG:-/dev/null}'}"
echo "netlify $*" >> "$LOG"
if [ "$1" = "--version" ]; then
  echo "netlify-cli/0.0.0-test-double"
  exit 0
fi
if [ "$1" = "deploy" ]; then
  SITE=""
  PREV=""
  for a in "$@"; do
    if [ "$PREV" = "--site" ]; then SITE="$a"; fi
    PREV="$a"
  done
  echo "deploy-site:$SITE" >> "$LOG"
  echo "Deploying to production"
  echo "Live URL: https://proof-\${SITE}.netlify.app"
  exit 0
fi
if [ "$1" = "sites:create" ]; then
  echo "Site created"
  echo "33333333-cccc-4000-8000-00000000000c"
  exit 0
fi
echo "ok"
exit 0
`;

/** Fake `wrangler` CLI (Cloudflare): records every invocation to
 * WRANGLER_FAKE_LOG. It must NEVER be invoked — the immutable path binds
 * provider=netlify captured before dispatch, so a spec flipped to
 * deploy_provider=cloudflare after dispatch cannot reach it. */
const FAKE_WRANGLER_SOURCE = `#!/usr/bin/env bash
LOG="${'${WRANGLER_FAKE_LOG:-/dev/null}'}"
echo "wrangler $*" >> "$LOG"
echo "ok"
exit 0
`;

function writeFixtureSite(tag, netlifyId) {
  const dir = path.join(sitesRoot, tag);
  fs.mkdirSync(path.join(dir, 'dist-vnext'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'dist-vnext', 'index.html'), `<!DOCTYPE html><html><body><h1>${tag}</h1></body></html>`);
  const spec = { tag, site_name: tag, pages: ['index.html'] };
  if (netlifyId) spec.netlify_site_id = netlifyId;
  fs.writeFileSync(path.join(dir, 'spec.json'), JSON.stringify(spec, null, 2));
}

async function bootServer() {
  const studioPort = await freePort();
  const previewPort = await freePort();
  const env = { ...process.env };
  delete env.STUDIO_REQUIRE_AUTH;
  delete env.STUDIO_NO_LISTEN;
  Object.assign(env, {
    HOME: homeDir,
    PATH: `${binDir}${path.delimiter}${process.env.PATH}`,
    NODE_OPTIONS: `--require ${patchFile}`,
    STUDIO_PORT: String(studioPort),
    PREVIEW_PORT: String(previewPort),
    STUDIO_HOST: '127.0.0.1',
    SITE_TAG: SITE_A,
    STUDIO_SITES_ROOT: sitesRoot,
    STUDIO_VNEXT_HUB_ROOT: vnextHubRoot,
    STUDIO_TOKEN_PATH: tokenPath,
    RUNTIME_VNEXT_DB_PATH: dbPath,
    NETLIFY_AUTH_TOKEN: 'immutable-target-test-token',
    NETLIFY_FAKE_LOG: netlifyLog,
    WRANGLER_FAKE_LOG: wranglerLog,
    STUDIO_TEST_MISMATCH_TAG: SITE_MISMATCH,
    STUDIO_TEST_WRONG_ID: ID_WRONG,
    STUDIO_TEST_PROVIDER_MISMATCH_TAG: SITE_PROV_MISMATCH,
    STUDIO_TEST_WRONG_PROVIDER: WRONG_PROVIDER,
  });

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

function netlifyInvocations() {
  if (!fs.existsSync(netlifyLog)) return [];
  return fs.readFileSync(netlifyLog, 'utf8').trim().split('\n').filter(Boolean);
}

function wranglerInvocations() {
  if (!fs.existsSync(wranglerLog)) return [];
  return fs.readFileSync(wranglerLog, 'utf8').trim().split('\n').filter(Boolean);
}

beforeAll(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-immutable-target-'));
  sitesRoot = path.join(tmp, 'sites');
  vnextHubRoot = path.join(tmp, 'vnext-hub');
  dbPath = path.join(tmp, 'runtime-vnext.db');
  tokenPath = path.join(tmp, 'studio-token');
  homeDir = path.join(tmp, 'home');
  binDir = path.join(tmp, 'bin');
  patchFile = path.join(tmp, 'mismatch-spawn-patch.cjs');
  netlifyLog = path.join(tmp, 'netlify-invocations.log');
  wranglerLog = path.join(tmp, 'wrangler-invocations.log');

  fs.mkdirSync(sitesRoot, { recursive: true });
  fs.mkdirSync(homeDir, { recursive: true });
  fs.mkdirSync(binDir, { recursive: true });
  fs.mkdirSync(vnextHubRoot, { recursive: true });
  fs.symlinkSync(path.join(SITE_STUDIO_DIR, 'runtime-vnext'), path.join(vnextHubRoot, 'runtime-vnext'), 'dir');

  const netlifyBin = path.join(binDir, 'netlify');
  fs.writeFileSync(netlifyBin, FAKE_NETLIFY_SOURCE);
  fs.chmodSync(netlifyBin, 0o755);
  const wranglerBin = path.join(binDir, 'wrangler');
  fs.writeFileSync(wranglerBin, FAKE_WRANGLER_SOURCE);
  fs.chmodSync(wranglerBin, 0o755);
  fs.writeFileSync(patchFile, SPAWN_PATCH_SOURCE);

  writeFixtureSite(SITE_A, ID_A);
  writeFixtureSite(SITE_B, ID_B);
  writeFixtureSite(SITE_BAD, ID_BAD);
  writeFixtureSite(SITE_MISMATCH, '44444444-dddd-4000-8000-00000000000d');
  writeFixtureSite(SITE_PROV_MISMATCH, ID_THETA);

  await bootServer();
}, 120000);

afterAll(async () => {
  await stopServer();
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
}, 60000);

describe('immutable deploy target (real server, real site-deploy script, fake netlify CLI)', () => {
  let deploymentId;

  it('(1)-(4) a deploy dispatched for Site A then drifted still targets provider netlify, site id A', async () => {
    // (2) Dispatch over real HTTP.
    const res = await api('POST', '/api/deploy', { body: { siteTag: SITE_A, env: 'staging' } });
    expect(res.status).toBe(200);
    expect(res.json.ok).toBe(true);
    expect(res.json.deployment_id).toMatch(/^dep_/);
    deploymentId = res.json.deployment_id;

    // Wait until the subprocess is running so our drift cannot race the
    // runner's own spec writes.
    await waitFor(async () => {
      const status = await api('GET', `/api/deploy-status?deployment_id=${deploymentId}`);
      return status.json && status.json.deployment.status === 'running';
    }, { label: 'deployment running' });

    // (3) DRIFT: after dispatch, A's spec site id changes to B, the provider
    // flips to cloudflare, and the ambient selection flips to Site B.
    const spec = readSpec(SITE_A);
    spec.netlify_site_id = ID_B;
    spec.deploy_provider = WRONG_PROVIDER;
    fs.writeFileSync(path.join(sitesRoot, SITE_A, 'spec.json'), JSON.stringify(spec, null, 2));
    const flip = await api('POST', '/api/switch-site', { body: { tag: SITE_B } });
    expect(flip.status).toBe(200);

    // Completion: the real script runs against the fake CLI and finishes.
    await waitFor(async () => {
      const status = await api('GET', `/api/deploy-status?deployment_id=${deploymentId}`);
      return status.json && status.json.deployment.status === 'succeeded';
    }, { label: 'deployment completion' });

    // (4) The fake CLI received EXACTLY --site <id-A> for its deploy — and the
    // drifted deploy_provider=cloudflare never reached the subprocess: the
    // alternate provider CLI was never invoked at all.
    const deployLines = netlifyInvocations().filter((line) => line.startsWith('deploy-site:'));
    expect(deployLines).toEqual([`deploy-site:${ID_A}`]);
    expect(wranglerInvocations()).toEqual([]);
  }, 60000);

  it('(5)-(7) the record binds captured=actual for provider AND site id; B is never targeted', async () => {
    const status = await api('GET', `/api/deploy-status?deployment_id=${deploymentId}`);
    const record = status.json.deployment;
    expect(record.site_tag).toBe(SITE_A);
    expect(record.captured_provider).toBe('netlify');
    expect(record.actual_provider_used).toBe('netlify');
    expect(record.captured_site_id).toBe(ID_A);
    expect(record.actual_site_id_used).toBe(ID_A);
    expect(record.status).toBe('succeeded');
    // (7) Proof URL belongs to A's immutable target.
    expect(record.url).toBe(PROOF_URL_A);
    expect(record.error).toBeNull();

    // The persisted spec agrees — the drift never reached the durable record.
    const spec = readSpec(SITE_A);
    expect(spec.deployments[deploymentId].captured_provider).toBe('netlify');
    expect(spec.deployments[deploymentId].actual_provider_used).toBe('netlify');
    expect(spec.deployments[deploymentId].captured_site_id).toBe(ID_A);
    expect(spec.deployments[deploymentId].actual_site_id_used).toBe(ID_A);
    expect(spec.deployments[deploymentId].url).toBe(PROOF_URL_A);
    expect(spec.environments.staging.provider).toBe('netlify');
    expect(spec.environments.staging.site_id).toBe(ID_A);
    expect(spec.environments.staging.url).toBe(PROOF_URL_A);

    // (6) Site B — id B and the ambient selection — was never targeted and
    // received none of the deploy state.
    const allCalls = netlifyInvocations().join('\n');
    expect(allCalls).not.toContain(ID_B);
    const specB = readSpec(SITE_B);
    expect(specB.deployments).toBeUndefined();
    expect(specB.deployed_url).toBeUndefined();
    expect(specB.environments).toBeUndefined();
  });

  it('(8) the captured/actual provider+id binding and proof URL survive a process restart', async () => {
    await stopServer();
    await bootServer();

    const status = await api('GET', `/api/deploy-status?deployment_id=${deploymentId}`);
    expect(status.status).toBe(200);
    const record = status.json.deployment;
    expect(record.site_tag).toBe(SITE_A);
    expect(record.status).toBe('succeeded');
    expect(record.captured_provider).toBe('netlify');
    expect(record.actual_provider_used).toBe('netlify');
    expect(record.captured_site_id).toBe(ID_A);
    expect(record.actual_site_id_used).toBe(ID_A);
    expect(record.url).toBe(PROOF_URL_A);
  }, 120000);

  it('negative: an unusable id on the immutable path fails clearly instead of deploying elsewhere', async () => {
    const res = await api('POST', '/api/deploy', { body: { siteTag: SITE_BAD, env: 'staging' } });
    expect(res.status).toBe(200);
    const badId = res.json.deployment_id;

    await waitFor(async () => {
      const status = await api('GET', `/api/deploy-status?deployment_id=${badId}`);
      return status.json && status.json.deployment.status === 'failed';
    }, { label: 'bad-id deployment failure' });

    const record = (await api('GET', `/api/deploy-status?deployment_id=${badId}`)).json.deployment;
    expect(record.status).toBe('failed');
    expect(record.captured_site_id).toBe(ID_BAD);
    expect(record.actual_site_id_used).toBeNull();
    // The script refused the malformed id BEFORE calling the Netlify CLI.
    const deployLines = netlifyInvocations().filter((line) => line.startsWith('deploy-site:'));
    expect(deployLines).toEqual([`deploy-site:${ID_A}`]); // still only A's deploy
  }, 60000);

  it('mismatch: a subprocess reporting a different site id fails with site_id_mismatch', async () => {
    const res = await api('POST', '/api/deploy', { body: { siteTag: SITE_MISMATCH, env: 'staging' } });
    expect(res.status).toBe(200);
    const mismatchId = res.json.deployment_id;

    await waitFor(async () => {
      const status = await api('GET', `/api/deploy-status?deployment_id=${mismatchId}`);
      return status.json && status.json.deployment.status === 'failed';
    }, { label: 'mismatch deployment failure' });

    const record = (await api('GET', `/api/deploy-status?deployment_id=${mismatchId}`)).json.deployment;
    expect(record.status).toBe('failed');
    expect(record.error).toContain('site_id_mismatch');
    expect(record.captured_site_id).toBe('44444444-dddd-4000-8000-00000000000d');
    expect(record.actual_site_id_used).toBe(ID_WRONG);
    // The drifted target was never persisted as a success.
    const spec = readSpec(SITE_MISMATCH);
    expect(spec.deployments[mismatchId].status).toBe('failed');
    expect(spec.deployments[mismatchId].url ?? null).not.toBe(`https://proof-${ID_WRONG}.netlify.app`);
    expect(spec.environments).toBeUndefined();
  }, 60000);

  it('provider mismatch: a subprocess reporting a different provider fails with provider_mismatch', async () => {
    const res = await api('POST', '/api/deploy', { body: { siteTag: SITE_PROV_MISMATCH, env: 'staging' } });
    expect(res.status).toBe(200);
    const provMismatchId = res.json.deployment_id;

    await waitFor(async () => {
      const status = await api('GET', `/api/deploy-status?deployment_id=${provMismatchId}`);
      return status.json && status.json.deployment.status === 'failed';
    }, { label: 'provider-mismatch deployment failure' });

    const record = (await api('GET', `/api/deploy-status?deployment_id=${provMismatchId}`)).json.deployment;
    expect(record.status).toBe('failed');
    expect(record.error).toContain('provider_mismatch');
    expect(record.captured_provider).toBe('netlify');
    expect(record.actual_provider_used).toBe(WRONG_PROVIDER);
    // The site-id binding held — only the provider drifted.
    expect(record.captured_site_id).toBe(ID_THETA);
    expect(record.actual_site_id_used).toBe(ID_THETA);
    // The drifted provider was never persisted as a success.
    const spec = readSpec(SITE_PROV_MISMATCH);
    expect(spec.deployments[provMismatchId].status).toBe('failed');
    expect(spec.environments).toBeUndefined();
    // And the alternate provider CLI was still never invoked.
    expect(wranglerInvocations()).toEqual([]);
  }, 60000);

  it('the runner refuses a V1 deploy with no captured site id before dispatch', async () => {
    // Route-level mirror of the runner guard: a site with no Netlify id at
    // all is refused with 412 no_netlify_site_id and never reaches the script.
    writeFixtureSite('site-zeta', null);
    const res = await api('POST', '/api/deploy', { body: { siteTag: 'site-zeta', env: 'staging' } });
    expect(res.status).toBe(412);
    expect(res.json.reason).toBe('no_netlify_site_id');
    expect(readSpec('site-zeta').deployments).toBeUndefined();
    const deployLines = netlifyInvocations().filter((line) => line.startsWith('deploy-site:'));
    expect(deployLines).toEqual([`deploy-site:${ID_A}`]);
  });
});
