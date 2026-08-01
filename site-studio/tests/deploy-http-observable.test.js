/**
 * Deploy route — explicit-site authority, V1 artifact, durable job, HTTP observability.
 *
 * Pins the contract of POST /api/deploy + GET /api/deploy-status:
 *
 *  1. The request must name the site explicitly (400 site_tag_required without it).
 *  2. The deploy ships sites/<tag>/dist-vnext — the spawn injects
 *     SITE_DEPLOY_SOURCE_DIR=dist-vnext and the route fails fast with
 *     409 no_vnext_build when the artifact is missing.
 *  3. A deployment_id is minted at dispatch and a durable record persisted in
 *     the site's spec.json (spec.deployments[id]) through the atomic writeSpec;
 *     completion updates it succeeded/failed with the proof URL, WITHOUT any
 *     WebSocket client, and only under the explicit site — a second site whose
 *     ambient/operator tag differs must not receive the state.
 *  4. GET /api/deploy-status returns the persisted record (400 without id,
 *     404 unknown) so a pure-HTTP client can drive a deploy to completion.
 *  5. The in-progress guard keys on site+env: a duplicate POST 409s, a
 *     different site proceeds.
 *  6. Records left dispatched/running by a dead process are reconciled to
 *     failed/interrupted (the boot path server.js runs).
 *
 * The netlify dispatch (spawn) is mocked — no real network. The route module
 * (server/deploy-repo-routes.js, main's home for /api/deploy) and the REAL
 * deploy-runner are exercised over real HTTP.
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
const { reconcileInterruptedDeployments } = require('../lib/deploy-jobs.js');
const { requestContext } = require('../lib/request-context.js');

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

/** A fake netlify-dispatch child process. Emits the immutable-path
 * `[deploy] site-id-used:` / `[deploy] provider-used:` markers on stderr,
 * exactly like scripts/site-deploy does when SITE_DEPLOY_SITE_ID and
 * SITE_DEPLOY_PROVIDER are set. */
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
  child.fail = (code = 1, stderr = 'boom') => {
    child.stderr.emit('data', Buffer.from(stderr));
    child.emit('close', code);
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

describe('deploy routes — explicit-site, dist-vnext, durable job, HTTP-observable', () => {
  let tmpRoot;
  let server;
  let baseUrl;
  let readSpec;
  let writeSpec;
  let spawnCalls;
  let pendingChildren;
  const operatorTag = 'site-gamma'; // ambient operator site — NOT the deployed one

  const post = (body) => fetch(`${baseUrl}/api/deploy`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  beforeAll(async () => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-http-'));
    readSpec = readSpecFromDisk(tmpRoot);
    writeSpec = writeSpecToDisk(tmpRoot);
    spawnCalls = [];
    pendingChildren = [];

    // site-alpha: has a V1 artifact and a netlify site id.
    fs.mkdirSync(path.join(tmpRoot, 'site-alpha', 'dist-vnext'), { recursive: true });
    fs.writeFileSync(path.join(tmpRoot, 'site-alpha', 'dist-vnext', 'index.html'), '<h1>alpha v1</h1>');
    writeSpec({ tag: 'site-alpha', site_name: 'Alpha', netlify_site_id: 'netlify-alpha-1' }, { siteTag: 'site-alpha' });

    // site-beta: NO dist-vnext artifact.
    writeSpec({ tag: 'site-beta', site_name: 'Beta' }, { siteTag: 'site-beta' });

    // site-delta: HAS a V1 artifact but NO Netlify site id — the V1 immutable
    // path must refuse it with 412 no_netlify_site_id before dispatch.
    fs.mkdirSync(path.join(tmpRoot, 'site-delta', 'dist-vnext'), { recursive: true });
    fs.writeFileSync(path.join(tmpRoot, 'site-delta', 'dist-vnext', 'index.html'), '<h1>delta v1</h1>');
    writeSpec({ tag: 'site-delta', site_name: 'Delta' }, { siteTag: 'site-delta' });

    // site-gamma: the operator's ambient site, with its own V1 artifact.
    fs.mkdirSync(path.join(tmpRoot, 'site-gamma', 'dist-vnext'), { recursive: true });
    fs.writeFileSync(path.join(tmpRoot, 'site-gamma', 'dist-vnext', 'index.html'), '<h1>gamma v1</h1>');
    writeSpec({ tag: 'site-gamma', site_name: 'Gamma', netlify_site_id: 'netlify-gamma-1' }, { siteTag: 'site-gamma' });

    const spawn = (cmd, args, options) => {
      const child = makeFakeChild(
        options && options.env && options.env.SITE_DEPLOY_SITE_ID,
        options && options.env && options.env.SITE_DEPLOY_PROVIDER,
      );
      spawnCalls.push({ cmd, args, options, child });
      pendingChildren.push(child);
      return child;
    };

    const { runDeploy, isDeployInProgress } = createDeployRunner({
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
    });

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
      isDeployInProgress,
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

  it('400 site_tag_required when the request names no site', async () => {
    const res = await post({ env: 'staging' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('site_tag_required');
    expect(spawnCalls.length).toBe(0);
  });

  it('409 no_vnext_build when the explicit site has no dist-vnext artifact', async () => {
    const res = await post({ siteTag: 'site-beta', env: 'staging' });
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('no_vnext_build');
    expect(spawnCalls.length).toBe(0);
  });

  it('412 no_netlify_site_id when the explicit site has no configured Netlify site id', async () => {
    const res = await post({ siteTag: 'site-delta', env: 'staging' });
    expect(res.status).toBe(412);
    const body = await res.json();
    expect(body.reason).toBe('no_netlify_site_id');
    expect(spawnCalls.length).toBe(0);
    // Nothing was dispatched or persisted for the refused request.
    expect(readSpec('site-delta').deployments).toBeUndefined();
  });

  it('dispatch returns deployment_id immediately and the spawn targets dist-vnext for the explicit site', async () => {
    const res = await post({ siteTag: 'site-alpha', env: 'staging' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.deployment_id).toMatch(/^dep_/);
    expect(body.site_tag).toBe('site-alpha');
    expect(body.env).toBe('staging');

    expect(spawnCalls.length).toBe(1);
    const call = spawnCalls[0];
    // The spawn names the EXPLICIT site, and selects the V1 artifact dir.
    expect(call.args).toContain('site-alpha');
    expect(call.options.env.SITE_DEPLOY_SOURCE_DIR).toBe('dist-vnext');
    // The captured Netlify site id is handed to the subprocess verbatim, with
    // the immutable-target marker, so the script cannot re-derive the target.
    expect(call.options.env.SITE_DEPLOY_SITE_ID).toBe('netlify-alpha-1');
    expect(call.options.env.SITE_DEPLOY_IMMUTABLE_TARGET).toBe('1');
    // The captured provider is handed to the subprocess verbatim too.
    expect(call.options.env.SITE_DEPLOY_PROVIDER).toBe('netlify');

    // The durable record exists from dispatch — before any WS traffic.
    const record = readSpec('site-alpha').deployments[body.deployment_id];
    expect(record.status).toBe('running'); // dispatched → running after spawn
    expect(record.provider).toBe('netlify');
    expect(record.site_id).toBe('netlify-alpha-1'); // captured pre-dispatch
    expect(record.captured_site_id).toBe('netlify-alpha-1');
    expect(record.captured_provider).toBe('netlify');
    expect(record.site_tag).toBe('site-alpha');

    // Complete the deploy with NO WebSocket client connected.
    call.child.succeed();
    const done = await waitFor(() =>
      readSpec('site-alpha').deployments[body.deployment_id].status === 'succeeded');

    expect(done).toBe(true);
  });

  it('completion writes state under the explicit site only — the ambient site is untouched', async () => {
    const alpha = readSpec('site-alpha');
    expect(alpha.environments.staging.url).toBe(PROOF_URL);
    expect(alpha.environments.staging.site_id).toBe('netlify-alpha-1');
    expect(alpha.deployed_url).toBe(PROOF_URL);
    expect(alpha.deploy_history.length).toBe(1);
    expect(alpha.deploy_history[0].environment).toBe('staging');

    const gamma = readSpec('site-gamma');
    expect(gamma.environments).toBeUndefined();
    expect(gamma.deployments).toBeUndefined();
    expect(gamma.deployed_url).toBeUndefined();
  });

  it('GET /api/deploy-status returns the persisted record with the proof URL', async () => {
    const deploymentId = Object.keys(readSpec('site-alpha').deployments)[0];
    const res = await fetch(`${baseUrl}/api/deploy-status?deployment_id=${deploymentId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.deployment.deployment_id).toBe(deploymentId);
    expect(body.deployment.status).toBe('succeeded');
    expect(body.deployment.url).toBe(PROOF_URL);
    expect(body.deployment.site_tag).toBe('site-alpha');
    expect(body.deployment.captured_site_id).toBe('netlify-alpha-1');
    expect(body.deployment.actual_site_id_used).toBe('netlify-alpha-1');
    expect(body.deployment.captured_provider).toBe('netlify');
    expect(body.deployment.actual_provider_used).toBe('netlify');
  });

  it('deploy-status is 400 without an id and 404 for an unknown id', async () => {
    const missing = await fetch(`${baseUrl}/api/deploy-status`);
    expect(missing.status).toBe(400);
    expect((await missing.json()).error).toBe('deployment_id_required');

    const unknown = await fetch(`${baseUrl}/api/deploy-status?deployment_id=dep_nope`);
    expect(unknown.status).toBe(404);
    expect((await unknown.json()).error).toBe('deployment_not_found');
  });

  it('duplicate dispatch for the same site+env 409s while another site proceeds', async () => {
    const first = await post({ siteTag: 'site-gamma', env: 'production' });
    expect(first.status).toBe(200);

    // Same site, same env, still running → 409.
    const dup = await post({ siteTag: 'site-gamma', env: 'production' });
    expect(dup.status).toBe(409);
    expect((await dup.json()).reason).toBe('deploy_in_progress');

    // Different env for the same site is NOT blocked (guard keys on site+env).
    const otherEnv = await post({ siteTag: 'site-gamma', env: 'staging' });
    expect(otherEnv.status).toBe(200);

    // Finish every in-flight child so later tests see a quiet spec.
    for (const call of spawnCalls.slice(-2)) call.child.succeed('https://gamma.example.netlify.app');
    await waitFor(() => {
      const deployments = readSpec('site-gamma').deployments || {};
      return Object.values(deployments).every((d) => d.status === 'succeeded');
    });
  });

  it('a failed dispatch persists the failure record with the error', async () => {
    const res = await post({ siteTag: 'site-gamma', env: 'staging' });
    expect(res.status).toBe(200);
    const { deployment_id } = await res.json();
    const call = spawnCalls[spawnCalls.length - 1];
    call.child.fail(1, 'getaddrinfo ENOTFOUND api.netlify.com');

    await waitFor(() =>
      readSpec('site-gamma').deployments[deployment_id].status === 'failed');
    const record = readSpec('site-gamma').deployments[deployment_id];
    expect(record.error).toMatch(/Network error reaching Netlify/);
    expect(record.url ?? null).toBeNull();

    const status = await fetch(`${baseUrl}/api/deploy-status?deployment_id=${deployment_id}`);
    expect((await status.json()).deployment.status).toBe('failed');
  });

  it('boot reconciliation marks dispatched/running records from a dead process as interrupted failures', async () => {
    writeSpec({
      tag: 'site-zombie',
      site_name: 'Zombie',
      deployments: {
        dep_running: { deployment_id: 'dep_running', site_tag: 'site-zombie', env: 'staging', status: 'running', created_at: new Date().toISOString() },
        dep_dispatched: { deployment_id: 'dep_dispatched', site_tag: 'site-zombie', env: 'production', status: 'dispatched', created_at: new Date().toISOString() },
        dep_done: { deployment_id: 'dep_done', site_tag: 'site-zombie', env: 'staging', status: 'succeeded', url: 'https://ok.example' },
      },
    }, { siteTag: 'site-zombie' });

    const result = reconcileInterruptedDeployments({ sitesRoot: tmpRoot, readSpec, writeSpec });
    expect(result.reconciled).toBe(2);
    expect(result.sites).toContain('site-zombie');

    const deployments = readSpec('site-zombie').deployments;
    expect(deployments.dep_running.status).toBe('failed');
    expect(deployments.dep_running.error).toMatch(/interrupted/);
    expect(deployments.dep_dispatched.status).toBe('failed');
    expect(deployments.dep_done.status).toBe('succeeded'); // untouched

    // And the reconciled record is readable over HTTP — it no longer looks running.
    const res = await fetch(`${baseUrl}/api/deploy-status?deployment_id=dep_running`);
    expect(res.status).toBe(200);
    expect((await res.json()).deployment.status).toBe('failed');
  });
});
