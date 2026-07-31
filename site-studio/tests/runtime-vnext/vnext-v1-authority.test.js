/**
 * Operator V1 authority contract (Commit A).
 *
 * Every Operator V1 mutation route must name its site explicitly — siteTag in
 * the body, query, or path — and must never fall back to the server's ambient
 * TAG. A request without an explicit, well-shaped tag is answered 400; a
 * traversal-shaped tag is refused 400 by the requestContext middleware before
 * any handler runs.
 *
 * Also covers the two additions this contract needs from the build route:
 *   - GET /api/site-studio/build-vnext/status?run_id=... (HTTP polling), and
 *   - persistence of an optional `brief` into spec.vnext_build_request.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'module';
import http from 'http';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);

process.env.SITE_TAG = 'site-v1-authority-ambient';
process.env.STUDIO_NO_LISTEN = '1';
// Auth is enforced by default; this file exercises the authority contract, not
// the credential gate, so it takes the explicit, logged opt-out.
process.env.STUDIO_REQUIRE_AUTH = '0';
process.env.RUNTIME_VNEXT_DB_PATH = path.resolve(process.cwd(), '.tmp-runtime-vnext-v1-authority.db');

// Relocate the runtime workspace tree into a temp hub (see operator-build-route
// test for the pattern); the canonical spec/dist-vnext tree stays in ../sites.
const REPO_ROOT = path.resolve(import.meta.dirname, '../..');
const tempHub = fs.mkdtempSync(path.join(process.cwd(), '.tmp-authority-hub-'));
fs.symlinkSync(path.join(REPO_ROOT, 'runtime-vnext'), path.join(tempHub, 'runtime-vnext'), 'dir');
process.env.STUDIO_VNEXT_HUB_ROOT = tempHub;

const { app } = require('../../server.js');
const db = require('../../runtime-vnext/state/db');

const siteTag = 'site-v1-authority';
// Canonical sites root = server.js HUB_ROOT/sites (the parent of site-studio).
const siteDir = path.resolve(process.cwd(), '..', 'sites', siteTag);
const dbPath = process.env.RUNTIME_VNEXT_DB_PATH;

let testServer;
let baseUrl;

beforeAll(async () => {
  try { fs.rmSync(siteDir, { recursive: true, force: true }); } catch {}
  db.resetForTests();
  fs.mkdirSync(siteDir, { recursive: true });
  fs.writeFileSync(
    path.join(siteDir, 'spec.json'),
    JSON.stringify({ tag: siteTag, site_name: 'V1 Authority Site', pages: ['index.html'] }),
  );

  testServer = http.createServer(app);
  await new Promise((resolve) => testServer.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${testServer.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve) => testServer.close(resolve));
  try { fs.rmSync(siteDir, { recursive: true, force: true }); } catch {}
  try { fs.rmSync(dbPath, { force: true }); } catch {}
  try { fs.rmSync(tempHub, { recursive: true, force: true }); } catch {}
});

function post(url, body) {
  return fetch(`${baseUrl}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
}

describe('V1 routes require an explicit siteTag', () => {
  it('POST /api/site-studio/build-vnext -> 400 without siteTag', async () => {
    const res = await post('/api/site-studio/build-vnext', {});
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('site_tag_required');
  });

  it('GET /api/content-fields/:page -> 400 without siteTag', async () => {
    const res = await fetch(`${baseUrl}/api/content-fields/index.html`);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('site_tag_required');
  });

  it('POST /api/content-field -> 400 without siteTag', async () => {
    const res = await post('/api/content-field', {
      page: 'index.html', field_id: 'f1', new_value: 'x',
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('site_tag_required');
  });

  it('GET /api/verify -> 400 without siteTag', async () => {
    const res = await fetch(`${baseUrl}/api/verify`);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('site_tag_required');
  });

  it('POST /api/verify -> 400 without siteTag', async () => {
    const res = await post('/api/verify', {});
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('site_tag_required');
  });
});

describe('V1 routes reject traversal / invalid tags', () => {
  it('build-vnext with a traversal tag -> 400', async () => {
    const res = await post('/api/site-studio/build-vnext', { siteTag: 'site-a/../../etc' });
    expect(res.status).toBe(400);
  });

  it('build-vnext with a non-canonical tag -> 400', async () => {
    const res = await post('/api/site-studio/build-vnext', { siteTag: 'not a tag!' });
    expect(res.status).toBe(400);
  });

  it('content-field with a traversal tag -> 400', async () => {
    const res = await post('/api/content-field', {
      siteTag: 'site-..%2F..%2Fetc', page: 'index.html', field_id: 'f1', new_value: 'x',
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/site-studio/build-vnext/status', () => {
  it('400 without run_id', async () => {
    const res = await fetch(`${baseUrl}/api/site-studio/build-vnext/status`);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('run_id_required');
  });

  it('404 for an unknown run_id', async () => {
    const res = await fetch(`${baseUrl}/api/site-studio/build-vnext/status?run_id=run_nope`);
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('run_not_found');
  });

  it('returns the persisted run row', async () => {
    db.createProject({
      projectId: 'project_v1status',
      siteTag: 'site-v1-status',
      hubRoot: process.cwd(),
      sitesRoot: path.resolve(process.cwd(), 'sites'),
      createdAt: new Date().toISOString(),
    });
    db.createRun({
      runId: 'run_v1status',
      projectId: 'project_v1status',
      recipeId: 'deterministic-site-build-v1',
      recipeVersion: '1.0.0',
      status: 'published',
      workspaceRoot: '/tmp/ws',
      startedAt: new Date().toISOString(),
      trigger: 'operator',
    });

    const res = await fetch(`${baseUrl}/api/site-studio/build-vnext/status?run_id=run_v1status`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.run_id).toBe('run_v1status');
    expect(data.status).toBe('published');
    expect(data.site_tag).toBe('site-v1-status');
    expect(data.recipe_id).toBe('deterministic-site-build-v1');
    expect(data.started_at).toBeTruthy();
  });
});

describe('build brief persistence', () => {
  it('persists an optional brief into spec.vnext_build_request before building', async () => {
    const res = await post('/api/site-studio/build-vnext', {
      siteTag,
      brief: 'A warm landing page for a bakery.',
    });
    const data = await res.json();
    expect(res.ok).toBe(true);
    expect(data.success).toBe(true);

    const spec = JSON.parse(fs.readFileSync(path.join(siteDir, 'spec.json'), 'utf8'));
    expect(spec.vnext_build_request).toBeTruthy();
    expect(spec.vnext_build_request.brief).toBe('A warm landing page for a bakery.');
    expect(spec.vnext_build_request.site_name).toBe('V1 Authority Site');
    expect(spec.vnext_build_request.requested_at).toBeTruthy();

    // The same run is pollable over HTTP.
    const status = await fetch(`${baseUrl}/api/site-studio/build-vnext/status?run_id=${data.run_id}`);
    expect(status.status).toBe(200);
    expect((await status.json()).status).toBe('published');
  });
});
