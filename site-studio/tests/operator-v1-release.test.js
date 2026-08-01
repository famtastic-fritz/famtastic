/**
 * Operator V1 release flow — clean-checkout proof over real HTTP.
 *
 * Boots the REAL server.js as a child process (require.main === module, so the
 * shipping listen path runs) against a fully temporary world:
 *
 *   - STUDIO_SITES_ROOT     -> mkdtemp sites root (spec, dist-vnext, previews)
 *   - STUDIO_VNEXT_HUB_ROOT -> mkdtemp hub whose runtime-vnext symlink points
 *                              back at the real one (fixtures resolve, but
 *                              .project.json / runs/ stay in temp)
 *   - RUNTIME_VNEXT_DB_PATH -> mkdtemp SQLite file
 *   - STUDIO_TOKEN_PATH     -> mkdtemp root token (auth stays ENFORCED)
 *   - HOME                  -> mkdtemp home (no writes to ~/.config/famtastic)
 *
 * The only thing mocked is the Netlify dispatch itself: a NODE_OPTIONS
 * --require patch intercepts child_process.spawn of scripts/site-deploy and
 * plays a fake child that emits a deterministic proof URL once the test
 * releases it; a fake `netlify` CLI on PATH satisfies the capability probe.
 * Everything else — build, edit, verify, preview, deploy orchestration,
 * persistence, auth — is the real server over real HTTP, no WebSocket client.
 *
 * Numbered `it`s map 1:1 onto the release checklist in the commit brief.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import net from 'net';
import { spawn, execFileSync } from 'child_process';

const require = createRequire(import.meta.url);

const SITE_STUDIO_DIR = path.resolve(import.meta.dirname, '..');
const REPO_ROOT = path.resolve(SITE_STUDIO_DIR, '..');

const SITE_A = 'site-alpha';
const SITE_B = 'site-beta';
const A_NETLIFY_ID = 'netlify-site-a-1';
const BRIEF = 'A clean one-page landing site for the release proof.';
const PROOF_URL = `https://${SITE_A}-staging.netlify.app`;
const EDITED_HEADLINE = 'Welcome to the Grand Opening';

let tmp;               // mkdtemp parent — EVERYTHING the test generates lives under here
let sitesRoot;
let vnextHubRoot;
let dbPath;
let tokenPath;
let spawnLog;
let releaseFile;
let homeDir;
let binDir;
let patchFile;
let gitBaseline;       // git status --porcelain before the server ever boots
let rootToken;
let child;             // current server child process
let base;              // http://127.0.0.1:<studioPort>
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

function gitStatus() {
  return execFileSync('git', ['status', '--porcelain'], { cwd: REPO_ROOT, encoding: 'utf8' })
    .split('\n').filter(Boolean).sort();
}

function readSpec(siteTag) {
  return JSON.parse(fs.readFileSync(path.join(sitesRoot, siteTag, 'spec.json'), 'utf8'));
}

/** HTTP client. `auth: false` sends no credentials (anonymous probes). */
async function api(method, urlPath, { body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) headers.Authorization = `Bearer ${rootToken}`;
  const res = await fetch(`${base}${urlPath}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, json };
}

/** Spawn-patch: intercepts ONLY scripts/site-deploy, logs the call, plays a
 * fake child that completes when the test drops the release file. */
const SPAWN_PATCH_SOURCE = `'use strict';
const cp = require('child_process');
const fs = require('fs');
const { EventEmitter } = require('events');
const log = process.env.STUDIO_TEST_SPAWN_LOG;
const realSpawn = cp.spawn;
cp.spawn = function patchedSpawn(file, args, options) {
  if (log && typeof file === 'string' && /scripts[\\/\\\\]site-deploy$/.test(file)) {
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.pid = 4242;
    child.kill = () => {};
    const argv = Array.isArray(args) ? args : [];
    const tag = argv[0] || 'site-unknown';
    const envIdx = argv.indexOf('--env');
    const envName = envIdx >= 0 ? argv[envIdx + 1] : 'staging';
    fs.appendFileSync(log, JSON.stringify({
      file, args: argv,
      cwd: options && options.cwd,
      SITE_DEPLOY_SOURCE_DIR: options && options.env && options.env.SITE_DEPLOY_SOURCE_DIR,
    }) + '\\n');
    const release = log + '.release';
    const timer = setInterval(() => {
      if (fs.existsSync(release)) {
        clearInterval(timer);
        const siteIdUsed = options && options.env && options.env.SITE_DEPLOY_SITE_ID;
        if (siteIdUsed) child.stderr.emit('data', Buffer.from('[deploy] site-id-used: ' + siteIdUsed + '\\n'));
        const providerUsed = options && options.env && options.env.SITE_DEPLOY_PROVIDER;
        if (providerUsed) child.stderr.emit('data', Buffer.from('[deploy] provider-used: ' + providerUsed + '\\n'));
        child.stdout.emit('data', Buffer.from('Deploy complete\\nLive URL: https://' + tag + '-' + envName + '.netlify.app\\n'));
        child.emit('close', 0);
      }
    }, 20);
    timer.unref();
    return child;
  }
  return realSpawn.apply(cp, [file, args, options]);
};
`;

function writeFixtureSite(tag, siteName, netlifyId) {
  const dir = path.join(sitesRoot, tag);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), `<!DOCTYPE html><html><body><h1>${siteName}</h1></body></html>`);
  const spec = {
    tag,
    site_name: siteName,
    pages: ['index.html'],
    netlify_site_id: netlifyId,
    // Seeded so POST /api/content-field has a deterministic field to edit; the
    // value matches the h1 the deterministic recipe renders into dist-vnext.
    content: {
      'index.html': {
        fields: [
          { field_id: 'headline', type: 'text', value: `Welcome to ${siteName}` },
        ],
      },
    },
  };
  fs.writeFileSync(path.join(dir, 'spec.json'), JSON.stringify(spec, null, 2));
}

async function bootServer() {
  const studioPort = await freePort();
  previewPort = await freePort();
  const env = { ...process.env };
  // Auth must stay ENFORCED and the server must LISTEN — test files that run
  // earlier in the same worker mutate these, so never inherit them.
  delete env.STUDIO_REQUIRE_AUTH;
  delete env.STUDIO_NO_LISTEN;
  Object.assign(env, {
    HOME: homeDir,
    PATH: `${binDir}${path.delimiter}${process.env.PATH}`,
    NODE_OPTIONS: `--require ${patchFile}`,
    STUDIO_PORT: String(studioPort),
    PREVIEW_PORT: String(previewPort),
    STUDIO_HOST: '127.0.0.1',
    SITE_TAG: SITE_A, // ambient UI selection at boot — flipped to B mid-build
    STUDIO_SITES_ROOT: sitesRoot,
    STUDIO_VNEXT_HUB_ROOT: vnextHubRoot,
    STUDIO_TOKEN_PATH: tokenPath,
    RUNTIME_VNEXT_DB_PATH: dbPath,
    NETLIFY_AUTH_TOKEN: 'operator-v1-test-token',
    STUDIO_TEST_SPAWN_LOG: spawnLog,
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

  // The root token materializes before the port opens (boot order in server.js).
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

// ---------------------------------------------------------------------------
// setup / teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'operator-v1-release-'));
  sitesRoot = path.join(tmp, 'sites');
  vnextHubRoot = path.join(tmp, 'vnext-hub');
  dbPath = path.join(tmp, 'runtime-vnext.db');
  tokenPath = path.join(tmp, 'studio-token');
  spawnLog = path.join(tmp, 'site-deploy-spawns.log');
  releaseFile = `${spawnLog}.release`;
  homeDir = path.join(tmp, 'home');
  binDir = path.join(tmp, 'bin');
  patchFile = path.join(tmp, 'site-deploy-spawn-patch.cjs');

  fs.mkdirSync(sitesRoot, { recursive: true });
  fs.mkdirSync(homeDir, { recursive: true });
  fs.mkdirSync(binDir, { recursive: true });
  fs.mkdirSync(vnextHubRoot, { recursive: true });
  // The recipe fixtures resolve at <hub>/runtime-vnext/... — symlink the real
  // tree in so the hub root itself (and every write under it) stays in temp.
  fs.symlinkSync(path.join(SITE_STUDIO_DIR, 'runtime-vnext'), path.join(vnextHubRoot, 'runtime-vnext'), 'dir');

  // Fake netlify CLI — satisfies the capability probe; the deploy spawn itself
  // is intercepted by the NODE_OPTIONS patch below.
  const netlifyBin = path.join(binDir, 'netlify');
  fs.writeFileSync(netlifyBin, '#!/bin/sh\necho "netlify-cli/0.0.0-test-double"\n');
  fs.chmodSync(netlifyBin, 0o755);

  fs.writeFileSync(patchFile, SPAWN_PATCH_SOURCE);

  // (2) Both sites exist as minimal fixtures BEFORE the server boots.
  writeFixtureSite(SITE_A, 'Site Alpha', A_NETLIFY_ID);
  writeFixtureSite(SITE_B, 'Site Beta', 'netlify-site-b-1');

  // (15) Baseline the repo state before the server can generate anything.
  gitBaseline = gitStatus();

  await bootServer();
}, 120000);

afterAll(async () => {
  await stopServer();
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
}, 60000);

// ---------------------------------------------------------------------------
// the release flow, in order
// ---------------------------------------------------------------------------

describe('Operator V1 release flow (real server, real HTTP, auth enforced)', () => {
  it('(1) anonymous mutations are refused with 401', async () => {
    for (const urlPath of ['/api/site-studio/build-vnext', '/api/deploy', '/api/content-field', '/api/verify']) {
      const res = await api('POST', urlPath, { body: { siteTag: SITE_A }, auth: false });
      expect(res.status, `POST ${urlPath} anonymous`).toBe(401);
    }
    const read = await api('GET', '/api/deploy-status?deployment_id=dep_nope', { auth: false });
    expect(read.status).toBe(401);
  });

  it('(2) Site A and Site B exist under the temp sites root', async () => {
    const res = await api('GET', '/api/sites');
    expect(res.status).toBe(200);
    const tags = res.json.sites.map((s) => s.tag);
    expect(tags).toContain(SITE_A);
    expect(tags).toContain(SITE_B);
    expect(fs.existsSync(path.join(sitesRoot, SITE_A, 'spec.json'))).toBe(true);
    expect(fs.existsSync(path.join(sitesRoot, SITE_B, 'spec.json'))).toBe(true);
  });

  let runId;

  it('(3)+(4) an explicit build targets Site A and flipping the ambient selection to B mid-flight cannot redirect it', async () => {
    const infoBefore = await api('GET', '/api/server-info');
    expect(infoBefore.json.tag).toBe(SITE_A); // ambient UI selection starts on A

    // Dispatch the build for A WITHOUT awaiting, then immediately move the
    // global/operator selection to B while the build is in flight.
    const buildPromise = api('POST', '/api/site-studio/build-vnext', {
      body: { siteTag: SITE_A, brief: BRIEF },
    });
    const flip = await api('POST', '/api/switch-site', { body: { tag: SITE_B } });
    expect(flip.status).toBe(200);

    const build = await buildPromise;
    expect(build.status).toBe(200);
    expect(build.json.success).toBe(true);
    expect(build.json.site_tag).toBe(SITE_A);
    expect(build.json.publish_dir).toBe(path.join(sitesRoot, SITE_A, 'dist-vnext'));
    runId = build.json.run_id;

    // The ambient selection DID move to B — and the build still landed under A.
    const infoAfter = await api('GET', '/api/server-info');
    expect(infoAfter.json.tag).toBe(SITE_B);
    expect(build.json.files).toContain('index.html');

    // The run is pollable over HTTP (no WebSocket).
    const status = await api('GET', `/api/site-studio/build-vnext/status?run_id=${runId}`);
    expect(status.status).toBe(200);
    expect(status.json.status).toBe('published');
    expect(status.json.site_tag).toBe(SITE_A);
  }, 60000);

  it('(5) the brief is persisted under Site A (spec.vnext_build_request)', () => {
    const spec = readSpec(SITE_A);
    expect(spec.vnext_build_request).toBeTruthy();
    expect(spec.vnext_build_request.brief).toBe(BRIEF);
    expect(spec.vnext_build_request.site_name).toBe('Site Alpha');
    expect(spec.vnext_build_request.requested_at).toBeTruthy();
    // B's spec never saw the brief.
    expect(readSpec(SITE_B).vnext_build_request).toBeUndefined();
  });

  it('(6) the whole flow ran without any WebSocket client', async () => {
    const info = await api('GET', '/api/server-info');
    expect(info.status).toBe(200);
    expect(info.json.activeClients).toBe(0);
  });

  it('(7) the artifact exists only under Site A — Site B has no dist-vnext', () => {
    const distA = path.join(sitesRoot, SITE_A, 'dist-vnext');
    expect(fs.existsSync(path.join(distA, 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(sitesRoot, SITE_B, 'dist-vnext'))).toBe(false);
    const html = fs.readFileSync(path.join(distA, 'index.html'), 'utf8');
    expect(html).toContain('Welcome to Site Alpha');
  });

  it('(8) the preview server serves Site A\'s dist-vnext at /vnext/site-a/', async () => {
    const res = await api('GET', `/api/site-studio/preview-url?siteTag=${SITE_A}`);
    expect(res.status).toBe(200);
    expect(res.json.url).toBe(`http://localhost:${previewPort}/vnext/${SITE_A}/`);

    const page = await fetch(res.json.url.replace('localhost', '127.0.0.1'));
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('Welcome to Site Alpha');

    // And B, having no artifact, is an explicit 409 — not a silent fallback.
    const bPreview = await fetch(`http://127.0.0.1:${previewPort}/vnext/${SITE_B}/`);
    expect(bPreview.status).toBe(409);
  });

  it('(9) a deterministic edit via POST /api/content-field modifies that same artifact', async () => {
    const res = await api('POST', '/api/content-field', {
      body: { siteTag: SITE_A, page: 'index.html', field_id: 'headline', new_value: EDITED_HEADLINE },
    });
    expect(res.status).toBe(200);
    expect(res.json.success).toBe(true);

    const html = fs.readFileSync(path.join(sitesRoot, SITE_A, 'dist-vnext', 'index.html'), 'utf8');
    expect(html).toContain(EDITED_HEADLINE);
    expect(html).not.toContain('Welcome to Site Alpha');

    // The preview reflects the edit — it is the same artifact, not a copy.
    const page = await fetch(`http://127.0.0.1:${previewPort}/vnext/${SITE_A}/`);
    expect(await page.text()).toContain(EDITED_HEADLINE);
  });

  it('(10) POST /api/verify verifies that same artifact and persists the result under A', async () => {
    const res = await api('POST', '/api/verify', { body: { siteTag: SITE_A } });
    expect(res.status).toBe(200);
    // The point is that verification RAN against the dist-vnext artifact and
    // its verdict persisted — not that a minimal fixture scores 'passed'.
    expect(typeof res.json.status).toBe('string');
    expect(Array.isArray(res.json.checks)).toBe(true);
    expect(res.json.checks.length).toBeGreaterThan(0);
    expect(res.json.timestamp).toBeTruthy();

    const persisted = readSpec(SITE_A).last_verification;
    expect(persisted).toBeTruthy();
    expect(persisted.status).toBe(res.json.status);

    const readBack = await api('GET', `/api/verify?siteTag=${SITE_A}`);
    expect(readBack.status).toBe(200);
    expect(readBack.json.timestamp).toBe(res.json.timestamp);
    expect(readSpec(SITE_B).last_verification).toBeUndefined();
  });

  let deploymentId;

  it('(11) deploy is bound to Site A, its dist-vnext, and its Netlify site id', async () => {
    const res = await api('POST', '/api/deploy', { body: { siteTag: SITE_A, env: 'staging' } });
    expect(res.status).toBe(200);
    expect(res.json.ok).toBe(true);
    expect(res.json.deployment_id).toMatch(/^dep_/);
    deploymentId = res.json.deployment_id;

    // The (intercepted) netlify dispatch named Site A and shipped dist-vnext.
    await waitFor(() => fs.existsSync(spawnLog) && fs.readFileSync(spawnLog, 'utf8').trim(), { label: 'site-deploy spawn' });
    const calls = fs.readFileSync(spawnLog, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
    expect(calls.length).toBe(1);
    expect(calls[0].args).toContain(SITE_A);
    expect(calls[0].SITE_DEPLOY_SOURCE_DIR).toBe('dist-vnext');
    expect(calls[0].args).not.toContain(SITE_B);

    // The durable record captured A's Netlify site id at dispatch.
    await waitFor(async () => {
      const status = await api('GET', `/api/deploy-status?deployment_id=${deploymentId}`);
      return status.json && status.json.deployment.status === 'running';
    }, { label: 'deployment running' });
    const running = (await api('GET', `/api/deploy-status?deployment_id=${deploymentId}`)).json.deployment;
    expect(running.site_tag).toBe(SITE_A);
    expect(running.site_id).toBe(A_NETLIFY_ID);
    expect(running.captured_site_id).toBe(A_NETLIFY_ID);
    expect(running.provider).toBe('netlify');
  }, 30000);

  it('(12) the proof URL is persisted under Site A (deploy-status + spec.deployments)', async () => {
    // Release the fake netlify child → it emits the proof URL and exits 0.
    fs.writeFileSync(releaseFile, 'go');
    await waitFor(async () => {
      const status = await api('GET', `/api/deploy-status?deployment_id=${deploymentId}`);
      return status.json && status.json.deployment.status === 'succeeded';
    }, { label: 'deployment completion' });

    const done = (await api('GET', `/api/deploy-status?deployment_id=${deploymentId}`)).json.deployment;
    expect(done.url).toBe(PROOF_URL);
    expect(done.error).toBeNull();
    expect(done.captured_site_id).toBe(A_NETLIFY_ID);
    expect(done.actual_site_id_used).toBe(A_NETLIFY_ID);

    const spec = readSpec(SITE_A);
    expect(spec.deployments[deploymentId].status).toBe('succeeded');
    expect(spec.deployments[deploymentId].url).toBe(PROOF_URL);
    expect(spec.deployments[deploymentId].site_id).toBe(A_NETLIFY_ID);
    expect(spec.environments.staging.url).toBe(PROOF_URL);
    expect(spec.environments.staging.site_id).toBe(A_NETLIFY_ID);
    expect(spec.deployed_url).toBe(PROOF_URL);

    // B — the ambient selection since step 4 — received none of this state.
    const specB = readSpec(SITE_B);
    expect(specB.deployments).toBeUndefined();
    expect(specB.deployed_url).toBeUndefined();
    expect(specB.environments).toBeUndefined();
  }, 30000);

  it('(13) duplicate/resumed requests are handled safely', async () => {
    // A second deploy for the same site+env while one is running -> 409.
    const first = await api('POST', '/api/deploy', { body: { siteTag: SITE_A, env: 'staging' } });
    expect(first.status).toBe(200);
    const secondId = first.json.deployment_id;
    await waitFor(async () => {
      const status = await api('GET', `/api/deploy-status?deployment_id=${secondId}`);
      return status.json && ['running', 'dispatched'].includes(status.json.deployment.status);
    }, { label: 'second deploy dispatched' });
    const dup = await api('POST', '/api/deploy', { body: { siteTag: SITE_A, env: 'staging' } });
    expect(dup.status).toBe(409);
    expect(dup.json.reason).toBe('deploy_in_progress');
    // Let this one finish so the restart below sees a quiet record.
    await waitFor(async () => {
      const status = await api('GET', `/api/deploy-status?deployment_id=${secondId}`);
      return status.json && status.json.deployment.status === 'succeeded';
    }, { label: 'second deploy completion' });

    // Re-running the same build for the same site is sane: 200, same shape.
    const rebuild = await api('POST', '/api/site-studio/build-vnext', {
      body: { siteTag: SITE_A, brief: BRIEF },
    });
    expect(rebuild.status).toBe(200);
    expect(rebuild.json.success).toBe(true);
    expect(rebuild.json.site_tag).toBe(SITE_A);
  }, 60000);

  it('(14) a process restart recovers Site A\'s build and deployment state', async () => {
    await stopServer();
    await bootServer(); // fresh process, same temp roots and same SQLite DB

    const run = await api('GET', `/api/site-studio/build-vnext/status?run_id=${runId}`);
    expect(run.status).toBe(200);
    expect(run.json.status).toBe('published');
    expect(run.json.site_tag).toBe(SITE_A);

    const deploy = await api('GET', `/api/deploy-status?deployment_id=${deploymentId}`);
    expect(deploy.status).toBe(200);
    expect(deploy.json.deployment.status).toBe('succeeded');
    expect(deploy.json.deployment.url).toBe(PROOF_URL);
    expect(deploy.json.deployment.site_id).toBe(A_NETLIFY_ID);
    expect(deploy.json.deployment.captured_site_id).toBe(A_NETLIFY_ID);
    expect(deploy.json.deployment.actual_site_id_used).toBe(A_NETLIFY_ID);
  }, 120000);

  it('(15) everything generated lives under the OS temp dir; the repo is untouched', async () => {
    // The generated runtime state is under the mkdtemp tree.
    for (const generated of [
      path.join(sitesRoot, SITE_A, 'dist-vnext', 'index.html'),
      path.join(sitesRoot, SITE_A, 'spec.json'),
      dbPath,
      tokenPath,
      spawnLog,
    ]) {
      expect(fs.existsSync(generated), generated).toBe(true);
      expect(path.relative(tmp, generated), generated).not.toMatch(/^\.\./);
    }
    // The vnext project/workspace tree went to the temp hub, not site-studio/.
    expect(fs.existsSync(path.join(vnextHubRoot, 'sites', SITE_A, '.project.json'))).toBe(true);

    // And git sees nothing new: the after-set must be a subset of the baseline
    // (the baseline already contains this test file and the package.json /
    // server.js edits themselves). Under the full suite, sibling test files
    // briefly create their own throwaway files in the repo and delete them in
    // afterAll — so settle for a quiet repo rather than sampling one instant.
    const noise = await waitFor(() => {
      const lines = gitStatus().filter((line) => !gitBaseline.includes(line));
      return lines.length === 0 ? [] : null;
    }, { timeout: 20000, label: 'git status settling' }).catch(() => gitStatus().filter((line) => !gitBaseline.includes(line)));
    expect(noise).toEqual([]);
  }, 60000);
});
