/**
 * POST /api/content-field — page-name validation and dist-vnext containment.
 *
 * Mounts the REAL content-field router on a minimal express app (the same
 * requestContext middleware server.js uses) over real HTTP, with the site's
 * spec.json and dist-vnext tree living in a mkdtemp world. The V1 release
 * test (operator-v1-release.test.js) covers the happy path end-to-end through
 * the real server; this file proves the guard rails: invalid page names and
 * escaping paths are 400s that touch NOTHING — no spec read, no version, no
 * file, no write outside the artifact directory.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

const require = createRequire(import.meta.url);
const express = require('express');
const { createContentFieldRouter } = require('../server/content-field-routes');
const { requestContext } = require('../lib/request-context');

const SITE = 'site-alpha';
const HEADLINE_HTML = (value) => `<!DOCTYPE html><html><body><h1 data-field-id="headline">${value}</h1></body></html>`;

let tmp;
let sitesRoot;
let distVnextDir;
let specPath;
let server;
let base;

// spies / call records
let readSpecCalls;
let writeSpecCalls;

function readSpec(siteTag) {
  readSpecCalls.push(siteTag);
  return JSON.parse(fs.readFileSync(specPath, 'utf8'));
}

function writeSpec(spec, meta) {
  writeSpecCalls.push({ spec, meta });
  fs.writeFileSync(specPath, JSON.stringify(spec, null, 2));
}

/** Recursive snapshot of every file under `root`: relative path -> sha256. */
function snapshotTree(root) {
  const out = new Map();
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) {
        out.set(path.relative(root, full), crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex'));
      }
    }
  };
  walk(root);
  return out;
}

async function postContentField(body) {
  const res = await fetch(`${base}/api/content-field`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ siteTag: SITE, ...body }),
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, json };
}

beforeAll(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'content-field-post-validation-'));
  sitesRoot = path.join(tmp, 'sites');
  distVnextDir = path.join(sitesRoot, SITE, 'dist-vnext');
  fs.mkdirSync(distVnextDir, { recursive: true });
  specPath = path.join(sitesRoot, SITE, 'spec.json');

  const app = express();
  app.use(express.json());
  app.use(requestContext());
  app.use('/api', createContentFieldRouter({
    readSpec,
    writeSpec,
    getDistVnextDir: (siteTag) => path.join(sitesRoot, siteTag, 'dist-vnext'),
    listPagesInDir: (dir) => fs.readdirSync(dir).filter((f) => f.endsWith('.html')),
  }));

  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
});

beforeEach(() => {
  // Reset the temp world to a known state before every test.
  fs.rmSync(distVnextDir, { recursive: true, force: true });
  fs.mkdirSync(distVnextDir, { recursive: true });
  fs.writeFileSync(path.join(distVnextDir, 'index.html'), HEADLINE_HTML('Welcome to Site Alpha'));
  fs.writeFileSync(path.join(distVnextDir, 'about-us.html'), HEADLINE_HTML('About the Crew'));
  const spec = {
    tag: SITE,
    site_name: 'Site Alpha',
    pages: ['index.html', 'about-us.html'],
    content: {
      'index.html': { fields: [{ field_id: 'headline', type: 'text', value: 'Welcome to Site Alpha' }] },
      'about-us.html': { fields: [{ field_id: 'headline', type: 'text', value: 'About the Crew' }] },
    },
  };
  fs.writeFileSync(specPath, JSON.stringify(spec, null, 2));
  readSpecCalls = [];
  writeSpecCalls = [];
});

describe('POST /api/content-field — valid edits still work', () => {
  it('edits index.html and persists through the atomic temp+rename path', async () => {
    const res = await postContentField({ page: 'index.html', field_id: 'headline', new_value: 'Grand Opening' });
    expect(res.status).toBe(200);
    expect(res.json.success).toBe(true);

    const html = fs.readFileSync(path.join(distVnextDir, 'index.html'), 'utf8');
    expect(html).toContain('Grand Opening');
    expect(writeSpecCalls.length).toBe(1);
    expect(JSON.parse(fs.readFileSync(specPath, 'utf8')).content['index.html'].fields[0].value).toBe('Grand Opening');
    // No temp-file litter left behind by writeFileAtomic.
    expect(fs.readdirSync(distVnextDir).filter((f) => f.includes('.tmp-'))).toEqual([]);
  });

  it('edits a non-index page allowed by the existing page rules', async () => {
    const res = await postContentField({ page: 'about-us.html', field_id: 'headline', new_value: 'Meet the Team' });
    expect(res.status).toBe(200);
    expect(res.json.success).toBe(true);
    expect(fs.readFileSync(path.join(distVnextDir, 'about-us.html'), 'utf8')).toContain('Meet the Team');
  });
});

describe('POST /api/content-field — invalid page names are 400s that change nothing', () => {
  const rejectedPages = [
    ['../ traversal', '../index.html'],
    ['../ traversal into another tree', '../../site-beta/dist-vnext/index.html'],
    ['absolute POSIX path', '/etc/passwd'],
    ['absolute path with html suffix', '/tmp/evil.html'],
    ['percent-encoded dots', '%2e%2e/index.html'],
    ['percent-encoded slash', '..%2findex.html'],
    ['fully encoded absolute', '%2fetc%2fpasswd.html'],
    ['backslash separator', '..\\index.html'],
    ['Windows-style absolute', 'C:\\temp\\evil.html'],
    ['no .html suffix', 'index'],
    ['leading separator page', '/index.html'],
  ];

  for (const [label, page] of rejectedPages) {
    it(`rejects ${label} (${JSON.stringify(page)}) with 400 and creates nothing`, async () => {
      const before = snapshotTree(tmp);
      const specBefore = fs.readFileSync(specPath, 'utf8');

      const res = await postContentField({ page, field_id: 'headline', new_value: 'PWNED' });

      expect(res.status).toBe(400);
      expect(res.json.error).toBe('Invalid page name');

      // Nothing was read, versioned, mutated, or created — anywhere.
      expect(readSpecCalls).toEqual([]);
      expect(writeSpecCalls).toEqual([]);
      expect(fs.readFileSync(specPath, 'utf8')).toBe(specBefore);
      expect(snapshotTree(tmp)).toEqual(before);
    });
  }

  it('rejects a malformed page name that exists in persisted spec.content state', async () => {
    // Poisoned state: a prior bug wrote a traversal-shaped key into the spec.
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
    spec.content['../../evil.html'] = { fields: [{ field_id: 'headline', type: 'text', value: 'x' }] };
    fs.writeFileSync(specPath, JSON.stringify(spec, null, 2));
    const specBefore = fs.readFileSync(specPath, 'utf8');
    const before = snapshotTree(tmp);

    const res = await postContentField({ page: '../../evil.html', field_id: 'headline', new_value: 'PWNED' });

    expect(res.status).toBe(400);
    expect(res.json.error).toBe('Invalid page name');
    // The poisoned state is never read, never "fixed", never written back.
    expect(readSpecCalls).toEqual([]);
    expect(writeSpecCalls).toEqual([]);
    expect(fs.readFileSync(specPath, 'utf8')).toBe(specBefore);
    expect(snapshotTree(tmp)).toEqual(before);
  });

  it('rejects before resolving the artifact — a missing dist-vnext is not even probed', async () => {
    fs.rmSync(distVnextDir, { recursive: true, force: true });
    const before = snapshotTree(tmp);
    const res = await postContentField({ page: '../index.html', field_id: 'headline', new_value: 'PWNED' });
    expect(res.status).toBe(400);
    expect(res.json.error).toBe('Invalid page name');
    expect(fs.existsSync(distVnextDir)).toBe(false); // nothing recreated the artifact dir
    expect(snapshotTree(tmp)).toEqual(before);
  });
});
