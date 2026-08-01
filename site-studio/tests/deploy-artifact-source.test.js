/**
 * Deploy artifact source — regression test for the legacy-artifact blocker.
 *
 * The reconciled deployment path must not redirect legacy WebSocket/chat
 * deployments to the Operator V1 artifact (dist-vnext):
 *
 *  1. Operator V1 HTTP deploy (server/deploy-repo-routes.js POST /api/deploy)
 *     ships dist-vnext — asserted on the runner's spawn env
 *     (SITE_DEPLOY_SOURCE_DIR), the same seam deploy-http-observable.test.js
 *     and operator-v1-release.test.js already inspect.
 *  2. The legacy WS chat deploy ships dist. Driving the real WS chat
 *     classifier in a unit test is impractical, so the closest real seam is
 *     used: the REAL createDeployRunner from lib/deploy-runner.js (the exact
 *     module server.js instantiates at its _deployRunner wiring) invoked with
 *     the EXACT ctx server.js's legacy 'deploy' case passes
 *     (`{ siteTag: TAG, sourceDir: 'dist' }`). A source-level assertion pins
 *     server.js's call site to that same ctx, tying the seam to the real
 *     call.
 *  3. The two paths are independent — changing one never affects the other.
 *  4. A caller that omits sourceDir never silently ships dist-vnext: the
 *     runner's default is the legacy-safe 'dist'.
 *
 * The netlify dispatch (spawn) is mocked; the REAL deploy-runner and the REAL
 * route module are exercised over real HTTP, mirroring
 * deploy-http-observable.test.js.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { EventEmitter } = require('events');

const { registerDeployRepoRoutes } = require('../server/deploy-repo-routes.js');
const { createDeployRunner } = require('../lib/deploy-runner.js');
const { requestContext } = require('../lib/request-context.js');

const SITE_STUDIO_DIR = path.resolve(import.meta.dirname, '..');
const PROOF_URL = 'https://site-alpha-staging.netlify.app';

function readSpecFromDisk(sitesRoot) {
  return (siteTag) => {
    const file = path.join(sitesRoot, siteTag, 'spec.json');
    if (!fs.existsSync(file)) return {};
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  };
}

function writeSpecToDisk(sitesRoot) {
  return (spec, options = {}) => {
    const dir = path.join(sitesRoot, options.siteTag);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'spec.json');
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(spec, null, 2));
    fs.renameSync(tmp, file);
  };
}

/** A fake netlify-dispatch child process (same shape as
 * deploy-http-observable.test.js). */
function makeFakeChild(siteIdUsed, providerUsed) {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.succeed = (url = PROOF_URL) => {
    if (siteIdUsed) child.stderr.emit('data', Buffer.from(`[deploy] site-id-used: ${siteIdUsed}\n`));
    if (providerUsed) child.stderr.emit('data', Buffer.from(`[deploy] provider-used: ${providerUsed}\n`));
    child.stdout.emit('data', Buffer.from(`Deployed\n${url}\n`));
    child.emit('close', 0);
  };
  return child;
}

async function waitFor(fn, { timeout = 3000, interval = 20 } = {}) {
  const deadline = Date.now() + timeout;
  for (;;) {
    try {
      const value = fn();
      if (value) return value;
    } catch {}
    if (Date.now() > deadline) throw new Error('waitFor timed out');
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

/** Shim matching server.js's WebSocket-ish deploy sink ({ send }). */
function makeWsShim() {
  const sent = [];
  return { readyState: 1, sent, send: (data) => sent.push(data) };
}

describe('deploy artifact source — V1 ships dist-vnext, legacy ships dist', () => {
  let tmpRoot;
  let server;
  let baseUrl;
  let readSpec;
  let writeSpec;
  let spawnCalls;
  let runDeploy;
  const operatorTag = 'site-alpha';

  const post = (body) => fetch(`${baseUrl}/api/deploy`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  beforeAll(async () => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-artifact-source-'));
    readSpec = readSpecFromDisk(tmpRoot);
    writeSpec = writeSpecToDisk(tmpRoot);
    spawnCalls = [];

    // site-alpha: has BOTH artifacts and a netlify site id, so either path
    // could physically deploy it — only the caller's sourceDir decides which
    // artifact ships.
    fs.mkdirSync(path.join(tmpRoot, 'site-alpha', 'dist-vnext'), { recursive: true });
    fs.writeFileSync(path.join(tmpRoot, 'site-alpha', 'dist-vnext', 'index.html'), '<h1>alpha v1</h1>');
    fs.mkdirSync(path.join(tmpRoot, 'site-alpha', 'dist'), { recursive: true });
    fs.writeFileSync(path.join(tmpRoot, 'site-alpha', 'dist', 'index.html'), '<h1>alpha legacy</h1>');
    writeSpec({ tag: 'site-alpha', site_name: 'Alpha', netlify_site_id: 'netlify-alpha-1' }, { siteTag: 'site-alpha' });

    const spawn = (cmd, args, options) => {
      const child = makeFakeChild(
        options && options.env && options.env.SITE_DEPLOY_SITE_ID,
        options && options.env && options.env.SITE_DEPLOY_PROVIDER,
      );
      spawnCalls.push({ cmd, args, options, child });
      return child;
    };

    // The REAL runner factory — the same one server.js instantiates for its
    // _deployRunner wiring (server.js: createDeployRunner({...})).
    ({ runDeploy } = createDeployRunner({
      readSpec,
      writeSpec,
      invalidateSpecCache: () => {},
      checkNetlify: async () => ({ ok: true }),
      spawn,
      hubRoot: '/unused-in-tests',
      listPages: () => ['index.html'],
      loadSettings: () => ({}),
      appendConvo: () => {},
      studioEvents: null,
      STUDIO_EVENTS: null,
      syncSiteRepo: null,
      getTag: () => operatorTag,
    }));

    const app = express();
    app.use(express.json());
    app.use(requestContext());
    registerDeployRepoRoutes({
      app,
      getWss: () => ({ clients: new Set() }),
      path,
      previewPort: 4000,
      getSiteDir: () => path.join(tmpRoot, operatorTag),
      getDistDir: () => path.join(tmpRoot, operatorTag, 'dist'),
      getSpecFile: () => path.join(tmpRoot, operatorTag, 'spec.json'),
      getHubRepoCache: () => null,
      getTag: () => operatorTag,
      isDeployInProgress: () => false,
      readSpec,
      writeSpec,
      checkNetlify: async () => ({ ok: true }),
      runDeploy,
      createSiteRepo: () => {},
      getDistVnextDir: (tag) => path.join(tmpRoot, tag || operatorTag, 'dist-vnext'),
      loadSettings: () => ({}),
      getSitesRoot: () => tmpRoot,
    });

    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (tmpRoot) fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('(1) Operator V1 HTTP deploy ships dist-vnext explicitly', async () => {
    const res = await post({ siteTag: 'site-alpha', env: 'staging' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.deployment_id).toMatch(/^dep_/);

    expect(spawnCalls.length).toBe(1);
    expect(spawnCalls[0].options.env.SITE_DEPLOY_SOURCE_DIR).toBe('dist-vnext');
    spawnCalls[0].child.succeed();
    await waitFor(() => readSpec('site-alpha').deployments?.[body.deployment_id]?.status === 'succeeded');
  });

  it('(2) the legacy WS/chat deploy call ships dist (runner seam + pinned server.js call site)', async () => {
    // Pin the real call site: server.js's legacy chat 'deploy' case must pass
    // sourceDir 'dist' explicitly and must not redirect to dist-vnext.
    const serverSource = fs.readFileSync(path.join(SITE_STUDIO_DIR, 'server.js'), 'utf8');
    expect(serverSource).toContain("runDeploy(ws, deployEnv, { siteTag: TAG, sourceDir: 'dist' })");
    expect(serverSource).not.toContain("runDeploy(ws, deployEnv, { siteTag: TAG, sourceDir: 'dist-vnext' })");

    // Closest real seam: the same createDeployRunner server.js instantiates,
    // invoked with the exact ctx its legacy 'deploy' case passes
    // ({ siteTag: TAG, sourceDir: 'dist' }) — no deploymentId, the legacy
    // ambient path.
    const ws = makeWsShim();
    await runDeploy(ws, 'production', { siteTag: 'site-alpha', sourceDir: 'dist' });

    const call = spawnCalls[spawnCalls.length - 1];
    expect(call.args).toContain('site-alpha');
    expect(call.options.env.SITE_DEPLOY_SOURCE_DIR).toBe('dist');
    // Legacy path: no immutable-target handoff (no captured site id/provider).
    expect(call.options.env.SITE_DEPLOY_SITE_ID).toBeUndefined();
    expect(call.options.env.SITE_DEPLOY_IMMUTABLE_TARGET).toBeUndefined();

    call.child.succeed('https://site-alpha-production.netlify.app');
    await waitFor(() => readSpec('site-alpha').environments?.production?.state === 'deployed');
  });

  it('(3) the two paths are independent — each spawn carries its own artifact', () => {
    const bySource = spawnCalls.map((c) => c.options.env.SITE_DEPLOY_SOURCE_DIR);
    expect(bySource).toContain('dist-vnext');
    expect(bySource).toContain('dist');
    // Neither path's value leaked into the other's spawn.
    const v1Spawn = spawnCalls.find((c) => c.options.env.SITE_DEPLOY_IMMUTABLE_TARGET === '1');
    const legacySpawn = spawnCalls.find((c) => !c.options.env.SITE_DEPLOY_IMMUTABLE_TARGET);
    expect(v1Spawn.options.env.SITE_DEPLOY_SOURCE_DIR).toBe('dist-vnext');
    expect(legacySpawn.options.env.SITE_DEPLOY_SOURCE_DIR).toBe('dist');
  });

  it("(4) a caller that omits sourceDir gets the legacy-safe default 'dist', never dist-vnext", async () => {
    const ws = makeWsShim();
    // No ctx.sourceDir at all — the old ambiguous default shipped dist-vnext.
    await runDeploy(ws, 'staging', { siteTag: 'site-alpha' });
    const call = spawnCalls[spawnCalls.length - 1];
    expect(call.options.env.SITE_DEPLOY_SOURCE_DIR).toBe('dist');
    call.child.succeed();
    await waitFor(() => (readSpec('site-alpha').deploy_history || []).length >= 3);
  });
});
