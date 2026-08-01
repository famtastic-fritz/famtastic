import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'module';
import http from 'http';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);

// Keep tests isolated: use a throw-away site tag, do not open the real Studio port,
// and point the runtime-vnext DB at a temp file so prior test runs do not collide.
process.env.SITE_TAG = 'site-demo-vnext-route';
process.env.STUDIO_NO_LISTEN = '1';
// Auth is enforced by default; this file exercises route behaviour, not the
// credential gate, so it takes the explicit, logged opt-out.
process.env.STUDIO_REQUIRE_AUTH = '0';
process.env.RUNTIME_VNEXT_DB_PATH = path.resolve(process.cwd(), '.tmp-runtime-vnext-operator.db');

// Relocate the runtime project/workspace tree (.project.json, runs/) into a
// temp dir that symlinks runtime-vnext back to this repo, so the builds below
// write nothing into the repo. The CANONICAL site tree (spec.json, dist-vnext)
// still comes from server.js's SITES_ROOT (../sites).
const REPO_ROOT = path.resolve(import.meta.dirname, '../..');
const tempHub = fs.mkdtempSync(path.join(process.cwd(), '.tmp-operator-hub-'));
fs.symlinkSync(path.join(REPO_ROOT, 'runtime-vnext'), path.join(tempHub, 'runtime-vnext'), 'dir');
process.env.STUDIO_VNEXT_HUB_ROOT = tempHub;

const { app } = require('../../server.js');
const db = require('../../runtime-vnext/state/db');

describe('operator-facing runtime-vnext build route', () => {
  const siteTag = process.env.SITE_TAG;
  // The route resolves the canonical sites root from server.js's HUB_ROOT
  // (the parent of the site-studio dir), not process.cwd()/sites.
  const siteDir = path.resolve(process.cwd(), '..', 'sites', siteTag);
  const dbPath = process.env.RUNTIME_VNEXT_DB_PATH;
  let testServer;
  let baseUrl;

  beforeAll(async () => {
    // Clean any leftovers from a previous interrupted run.
    try { fs.rmSync(siteDir, { recursive: true, force: true }); } catch {}
    db.resetForTests();

    testServer = http.createServer(app);
    await new Promise((resolve) => testServer.listen(0, resolve));
    const { port } = testServer.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => testServer.close(resolve));
    try { fs.rmSync(siteDir, { recursive: true, force: true }); } catch {}
    try { fs.rmSync(dbPath, { force: true }); } catch {}
    try { fs.rmSync(tempHub, { recursive: true, force: true }); } catch {}
  });

  it('POST /api/site-studio/build-vnext returns a successful deterministic build', async () => {
    const res = await fetch(`${baseUrl}/api/site-studio/build-vnext`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteTag }),
    });

    expect(res.ok).toBe(true);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.site_tag).toBe(siteTag);
    expect(data.recipe_id).toBe('deterministic-site-build-v1');
    expect(data.recipe_version).toBe('1.0.0');
    expect(typeof data.run_id).toBe('string');
    expect(data.run_id).toMatch(/^run_/);
    expect(typeof data.project_id).toBe('string');
    expect(data.project_id).toMatch(/^project_/);
    expect(typeof data.publish_dir).toBe('string');
    expect(fs.existsSync(data.publish_dir)).toBe(true);
    expect(data.files).toContain('index.html');

    const indexPath = path.join(data.publish_dir, 'index.html');
    expect(fs.existsSync(indexPath)).toBe(true);
    const indexHtml = fs.readFileSync(indexPath, 'utf8');
    expect(indexHtml).toContain('Welcome to');
  });

  it('builds multiple pages when the spec lists extra pages', async () => {
    const specPath = path.join(siteDir, 'spec.json');
    fs.writeFileSync(
      specPath,
      JSON.stringify({ site_name: 'Route Test Site', pages: ['about.html', 'contact.html'] }),
    );

    const res = await fetch(`${baseUrl}/api/site-studio/build-vnext`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteTag }),
    });

    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.files).toContain('index.html');
    expect(data.files).toContain('about.html');
    expect(data.files).toContain('contact.html');

    const aboutPath = path.join(data.publish_dir, 'about.html');
    expect(fs.existsSync(aboutPath)).toBe(true);
    const aboutHtml = fs.readFileSync(aboutPath, 'utf8');
    expect(aboutHtml).toContain('Route Test Site');
  });

  it('builds valid custom pages from the request body and persists the build request', async () => {
    const res = await fetch(`${baseUrl}/api/site-studio/build-vnext`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteTag,
        pages: ['index.html', 'pricing.html'],
        brief: 'A site with a pricing page.',
      }),
    });

    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.files).toContain('index.html');
    expect(data.files).toContain('pricing.html');

    const spec = JSON.parse(fs.readFileSync(path.join(siteDir, 'spec.json'), 'utf8'));
    expect(spec.vnext_build_request).toBeTruthy();
    expect(spec.vnext_build_request.brief).toBe('A site with a pricing page.');
    expect(spec.vnext_build_request.pages).toEqual(['index.html', 'pricing.html']);
  });

  it('rejects malformed pages[] values with 400 and persists nothing', async () => {
    const invalidTag = 'site-demo-vnext-invalid-pages';
    const invalidSiteDir = path.resolve(process.cwd(), '..', 'sites', invalidTag);
    try {
      for (const pages of [
        ['../etc.html'],
        ['foo/bar.html'],
        [''],
        [123],
        ['index.html', '../escape.html'], // one bad apple rejects the whole request
      ]) {
        const res = await fetch(`${baseUrl}/api/site-studio/build-vnext`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteTag: invalidTag, pages, brief: 'must never persist' }),
        });
        expect(res.status, JSON.stringify(pages)).toBe(400);
        const data = await res.json();
        expect(data.error).toBe('invalid_page_name');
        expect(Array.isArray(data.invalid_pages)).toBe(true);
        expect(data.invalid_pages.length).toBeGreaterThan(0);
      }

      // No brief/build request persisted, no artifact built.
      const specPath = path.join(invalidSiteDir, 'spec.json');
      if (fs.existsSync(specPath)) {
        const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
        expect(spec.vnext_build_request).toBeUndefined();
      }
      expect(fs.existsSync(path.join(invalidSiteDir, 'dist-vnext'))).toBe(false);
    } finally {
      try { fs.rmSync(invalidSiteDir, { recursive: true, force: true }); } catch {}
    }
  });

  it('rejects malformed pages inherited from spec.pages — 400, nothing persisted, no run created', async () => {
    const inheritedTag = 'site-demo-vnext-inherited-invalid';
    const inheritedSiteDir = path.resolve(process.cwd(), '..', 'sites', inheritedTag);
    try {
      // The request body carries NO pages — the route resolves them from the
      // site's persisted spec.json, and THOSE must be validated too.
      fs.mkdirSync(inheritedSiteDir, { recursive: true });
      fs.writeFileSync(
        path.join(inheritedSiteDir, 'spec.json'),
        JSON.stringify({ site_name: 'Inherited Bad Pages', pages: ['index.html', '../escape.html'] }),
      );
      const runsBefore = db.getDb().prepare('SELECT COUNT(*) AS c FROM runs').get().c;

      const res = await fetch(`${baseUrl}/api/site-studio/build-vnext`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteTag: inheritedTag, brief: 'must never persist' }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('invalid_page_name');
      expect(data.invalid_pages).toEqual(['../escape.html']);

      // spec.vnext_build_request NOT written …
      const spec = JSON.parse(fs.readFileSync(path.join(inheritedSiteDir, 'spec.json'), 'utf8'));
      expect(spec.vnext_build_request).toBeUndefined();
      // … no run row created in the runtime-vnext DB …
      const runsAfter = db.getDb().prepare('SELECT COUNT(*) AS c FROM runs').get().c;
      expect(runsAfter).toBe(runsBefore);
      // … and no artifact built.
      expect(fs.existsSync(path.join(inheritedSiteDir, 'dist-vnext'))).toBe(false);
    } finally {
      try { fs.rmSync(inheritedSiteDir, { recursive: true, force: true }); } catch {}
    }
  });

  it('builds valid pages inherited from spec.pages when the request omits them', async () => {
    const inheritedTag = 'site-demo-vnext-inherited-valid';
    const inheritedSiteDir = path.resolve(process.cwd(), '..', 'sites', inheritedTag);
    try {
      fs.mkdirSync(inheritedSiteDir, { recursive: true });
      fs.writeFileSync(
        path.join(inheritedSiteDir, 'spec.json'),
        JSON.stringify({ site_name: 'Inherited Valid Pages', pages: ['index.html', 'team.html'] }),
      );

      const res = await fetch(`${baseUrl}/api/site-studio/build-vnext`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteTag: inheritedTag }),
      });

      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.files).toContain('index.html');
      expect(data.files).toContain('team.html');
    } finally {
      try { fs.rmSync(inheritedSiteDir, { recursive: true, force: true }); } catch {}
    }
  });

  it('falls back to the default page list when neither request nor spec provide pages', async () => {
    const defaultTag = 'site-demo-vnext-default-pages';
    const defaultSiteDir = path.resolve(process.cwd(), '..', 'sites', defaultTag);
    try {
      const res = await fetch(`${baseUrl}/api/site-studio/build-vnext`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteTag: defaultTag }),
      });

      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.files).toEqual(['index.html']);
    } finally {
      try { fs.rmSync(defaultSiteDir, { recursive: true, force: true }); } catch {}
    }
  });
});
