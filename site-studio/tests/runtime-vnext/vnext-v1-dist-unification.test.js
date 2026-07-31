/**
 * Operator V1 artifact unification (Commit B).
 *
 * sites/<siteTag>/dist-vnext is the sole Operator V1 artifact:
 *   - POST /api/content-field edits dist-vnext HTML (atomically), never dist/;
 *   - POST /api/verify verifies dist-vnext pages, never dist/;
 *   - both answer 409 (no_vnext_build) when dist-vnext is missing — no silent
 *     fallback to the legacy tree;
 *   - the preview server serves dist-vnext at /vnext/<siteTag>/, and
 *     GET /api/site-studio/preview-url hands out that URL.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'module';
import http from 'http';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);

process.env.SITE_TAG = 'site-v1-dist-ambient';
process.env.STUDIO_NO_LISTEN = '1';
// Auth is enforced by default; this file exercises artifact unification, not
// the credential gate, so it takes the explicit, logged opt-out.
process.env.STUDIO_REQUIRE_AUTH = '0';
process.env.RUNTIME_VNEXT_DB_PATH = path.resolve(process.cwd(), '.tmp-runtime-vnext-v1-dist.db');

const { app, previewServer } = require('../../server.js');

const sitesRoot = path.resolve(process.cwd(), '..', 'sites');
const siteTag = 'site-v1-dist';
const noBuildTag = 'site-v1-nobuild';
const siteDir = path.join(sitesRoot, siteTag);
const noBuildDir = path.join(sitesRoot, noBuildTag);
const distVnext = path.join(siteDir, 'dist-vnext');
const legacyDist = path.join(siteDir, 'dist');
const dbPath = process.env.RUNTIME_VNEXT_DB_PATH;

const VNEXT_HTML = '<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script><link href="assets/styles.css" rel="stylesheet"><link href="https://fonts.googleapis.com/css2?family=Inter" rel="stylesheet"></head><body><header><nav><a data-logo-v href="index.html">V1 Site</a></nav></header><main><section><h1 data-field-id="headline-1">Old Headline</h1><img src="assets/x.png" data-slot-id="s1" data-slot-status="stock" data-slot-role="hero"></section></main><footer><p>f</p></footer></body></html>';
const LEGACY_HTML = '<!DOCTYPE html><html><body><main><h1 data-field-id="headline-1">LEGACY DIST MARKER</h1><img src="assets/bad.png"></main></body></html>';

let testServer;
let baseUrl;
let previewBase;

beforeAll(async () => {
  for (const dir of [siteDir, noBuildDir]) {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
  fs.mkdirSync(distVnext, { recursive: true });
  fs.mkdirSync(path.join(distVnext, 'assets'), { recursive: true });
  fs.mkdirSync(legacyDist, { recursive: true });
  fs.mkdirSync(noBuildDir, { recursive: true });

  fs.writeFileSync(path.join(siteDir, 'spec.json'), JSON.stringify({
    tag: siteTag,
    site_name: 'V1 Dist Site',
    pages: ['index.html'],
    content: {
      'index.html': {
        fields: [{ field_id: 'headline-1', type: 'text', value: 'Old Headline' }],
      },
    },
  }));
  fs.writeFileSync(path.join(distVnext, 'index.html'), VNEXT_HTML);
  fs.writeFileSync(path.join(legacyDist, 'index.html'), LEGACY_HTML);
  fs.writeFileSync(path.join(legacyDist, 'legacy-only.html'), LEGACY_HTML);

  // A site whose spec exists but which has NO vNext build.
  fs.writeFileSync(path.join(noBuildDir, 'spec.json'), JSON.stringify({
    tag: noBuildTag,
    site_name: 'No Build Site',
    pages: ['index.html'],
    content: {
      'index.html': { fields: [{ field_id: 'headline-1', type: 'text', value: 'x' }] },
    },
  }));

  testServer = http.createServer(app);
  await new Promise((resolve) => testServer.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${testServer.address().port}`;

  if (!previewServer.listening) {
    // server.js only binds the preview server when run as main; tests bind it
    // on an ephemeral port.
    await new Promise((resolve) => previewServer.listen(0, '127.0.0.1', resolve));
  }
  previewBase = `http://127.0.0.1:${previewServer.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve) => testServer.close(resolve));
  if (previewServer.listening) {
    await new Promise((resolve) => previewServer.close(resolve));
  }
  for (const dir of [siteDir, noBuildDir]) {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
  try { fs.rmSync(dbPath, { force: true }); } catch {}
});

function post(url, body) {
  return fetch(`${baseUrl}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
}

describe('POST /api/content-field edits dist-vnext, not dist', () => {
  it('rewrites the dist-vnext page and leaves legacy dist untouched', async () => {
    const res = await post('/api/content-field', {
      siteTag, page: 'index.html', field_id: 'headline-1', new_value: 'New Headline',
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    const vnextHtml = fs.readFileSync(path.join(distVnext, 'index.html'), 'utf8');
    expect(vnextHtml).toContain('New Headline');
    expect(vnextHtml).not.toContain('Old Headline');

    // The legacy dist tree is NOT the V1 artifact — it must be untouched.
    const legacyHtml = fs.readFileSync(path.join(legacyDist, 'index.html'), 'utf8');
    expect(legacyHtml).toBe(LEGACY_HTML);

    // Atomic write: no temp files left behind.
    expect(fs.readdirSync(distVnext).filter((f) => f.includes('.tmp'))).toEqual([]);

    // The spec's field value was persisted too.
    const spec = JSON.parse(fs.readFileSync(path.join(siteDir, 'spec.json'), 'utf8'));
    expect(spec.content['index.html'].fields[0].value).toBe('New Headline');
  });

  it('409 (no_vnext_build) when the site has no dist-vnext', async () => {
    const res = await post('/api/content-field', {
      siteTag: noBuildTag, page: 'index.html', field_id: 'headline-1', new_value: 'y',
    });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('no_vnext_build');
  });
});

describe('/api/verify targets dist-vnext', () => {
  it('checks dist-vnext pages only and persists last_verification', async () => {
    const res = await post('/api/verify', { siteTag });
    expect(res.status).toBe(200);
    const result = await res.json();

    // legacy-only.html has an img with NO slot attributes — if the legacy tree
    // were being verified, slot-attributes would fail on it. It must not appear.
    const slotCheck = result.checks.find((c) => c.check === 'slot-attributes');
    expect(slotCheck).toBeTruthy();
    expect(slotCheck.status).toBe('passed');
    expect(result.issues.join('\n')).not.toContain('legacy-only.html');

    const get = await fetch(`${baseUrl}/api/verify?siteTag=${siteTag}`);
    expect(get.status).toBe(200);
    const persisted = await get.json();
    expect(persisted).toBeTruthy();
    expect(persisted.timestamp).toBe(result.timestamp);
  });

  it('409 (no_vnext_build) when the site has no dist-vnext', async () => {
    const res = await post('/api/verify', { siteTag: noBuildTag });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('no_vnext_build');
  });
});

describe('vNext preview', () => {
  it('GET /api/site-studio/preview-url returns the dist-vnext preview URL', async () => {
    const res = await fetch(`${baseUrl}/api/site-studio/preview-url?siteTag=${siteTag}`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.site_tag).toBe(siteTag);
    expect(data.url).toMatch(new RegExp(`/vnext/${siteTag}/$`));
  });

  it('GET /api/site-studio/preview-url -> 400 without siteTag', async () => {
    const res = await fetch(`${baseUrl}/api/site-studio/preview-url`);
    expect(res.status).toBe(400);
  });

  it('preview server serves the dist-vnext artifact at /vnext/<tag>/', async () => {
    const res = await fetch(`${previewBase}/vnext/${siteTag}/index.html`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('New Headline');
    expect(html).not.toContain('LEGACY DIST MARKER');

    // Relative asset paths stay inside the vNext prefix.
    const asset = await fetch(`${previewBase}/vnext/${siteTag}/assets/x.png`);
    expect(asset.status).toBe(404); // file does not exist, but routed (not 400)
  });

  it('preview server answers 409 for a site with no vNext build', async () => {
    const res = await fetch(`${previewBase}/vnext/${noBuildTag}/`);
    expect(res.status).toBe(409);
    expect(await res.text()).toContain('No vNext build');
  });

  it('preview server answers 400 for an invalid tag', async () => {
    const res = await fetch(`${previewBase}/vnext/${encodeURIComponent('site-../..')}/index.html`);
    expect(res.status).toBe(400);
  });
});
