/**
 * Phase 1, Tasks 1.2 + 1.3 — RequestContext and explicit site paths.
 *
 * 1.2  lib/request-context.js resolves { siteTag, runId, requestId } ONCE per
 *      request, only from explicit request fields, and never from a global.
 * 1.3  lib/site-paths.js builds every derived site path from an EXPLICIT tag,
 *      with a zero-argument shim that throws under STUDIO_STRICT_AUTHORITY=1.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createRequire } from 'module';
import { join, sep, resolve } from 'path';

const require = createRequire(import.meta.url);
const {
  requestContext,
  resolveRequestContext,
  requireSiteTag,
  siteTagOr400,
  siteTagOrOperatorDefault,
  isDangerousTag,
  findDangerousPathSegment,
} = require('../lib/request-context.js');
const { createSitePaths, isStrictAuthority } = require('../lib/site-paths.js');

// ── helpers ──────────────────────────────────────────────────────────────────

function mockRes() {
  return {
    statusCode: null,
    body: null,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

function run(req, options) {
  const res = mockRes();
  let nexted = false;
  requestContext(options)(req, res, () => { nexted = true; });
  return { res, nexted };
}

const SITES_ROOT = '/tmp/fake-sites-root';

afterEach(() => {
  delete process.env.STUDIO_STRICT_AUTHORITY;
});

// ── 1.2 middleware ───────────────────────────────────────────────────────────

describe('requestContext — explicit siteTag resolution', () => {
  it('resolves an explicit siteTag from the body', () => {
    const req = { body: { siteTag: 'site-tonys-pizza' } };
    const { res, nexted } = run(req);
    expect(nexted).toBe(true);
    expect(res.statusCode).toBe(null);
    expect(req.ctx.siteTag).toBe('site-tonys-pizza');
    expect(req.ctx.siteTagSource).toBe('body.siteTag');
  });

  it('resolves from the query string, a route param, and the x-site-tag header', () => {
    const fromQuery = { query: { site_tag: 'site-alpha' } };
    run(fromQuery);
    expect(fromQuery.ctx.siteTag).toBe('site-alpha');

    const fromParam = { params: { tag: 'site-beta' } };
    run(fromParam);
    expect(fromParam.ctx.siteTag).toBe('site-beta');

    const fromHeader = { headers: { 'x-site-tag': 'site-gamma' } };
    run(fromHeader);
    expect(fromHeader.ctx.siteTag).toBe('site-gamma');
  });

  it('prefers the route param over the body and query', () => {
    // NOTE: this is the *field precedence* of the resolver, exercised directly.
    // Under a real Express app `req.params` is {} while an app.use() middleware
    // runs; the "route params, end to end" suite below proves the mechanism that
    // actually delivers a path param into req.ctx after route matching.
    const req = {
      params: { tag: 'site-param' },
      body: { siteTag: 'site-body' },
      query: { siteTag: 'site-query' },
    };
    run(req);
    expect(req.ctx.siteTag).toBe('site-param');
  });

  it('leaves siteTag null when the request names no site — never a global default', () => {
    const req = { body: {}, query: {} };
    const { nexted } = run(req);
    expect(nexted).toBe(true);
    expect(req.ctx.siteTag).toBe(null);
    expect(req.ctx.siteTagSource).toBe(null);
  });

  it('generates a distinct requestId for every request and echoes it as a header', () => {
    const a = { body: {} };
    const b = { body: {} };
    const ra = run(a);
    run(b);
    expect(typeof a.ctx.requestId).toBe('string');
    expect(a.ctx.requestId.length).toBeGreaterThan(8);
    expect(a.ctx.requestId).not.toBe(b.ctx.requestId);
    expect(ra.res.headers['X-Request-Id']).toBe(a.ctx.requestId);
  });

  it('captures an explicit runId for correlation', () => {
    const req = { body: { run_id: 'run_123' } };
    run(req);
    expect(req.ctx.runId).toBe('run_123');

    const none = { body: {} };
    run(none);
    expect(none.ctx.runId).toBe(null);
  });
});

describe('requestContext — hostile tags', () => {
  for (const bad of ['../../etc/passwd', 'site-a/../site-b', '..', 'a/b', 'a\\b', '~/secrets']) {
    it(`rejects the traversal tag ${JSON.stringify(bad)} with 400`, () => {
      const req = { query: { siteTag: bad } };
      const { res, nexted } = run(req);
      expect(nexted).toBe(false);
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('invalid_site_tag');
      expect(req.ctx).toBeUndefined();
      expect(isDangerousTag(bad)).toBe(true);
    });
  }

  it('does not resolve a non-canonical tag, but lets the request through', () => {
    // POST /api/new-site legitimately posts a raw, un-normalised name.
    const req = { body: { tag: "Tony's Pizza" } };
    const { res, nexted } = run(req);
    expect(nexted).toBe(true);
    expect(res.statusCode).toBe(null);
    expect(req.ctx.siteTag).toBe(null);
    expect(req.ctx.unresolvedSiteTag).toBe("Tony's Pizza");
  });

  it('resolveRequestContext reports the rejection without touching a response', () => {
    const result = resolveRequestContext({ body: { siteTag: '../evil' } });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.body.request_id).toBeTruthy();
  });
});

describe('requireSiteTag / siteTagOr400', () => {
  it('400s when the request did not name a site', () => {
    const req = { body: {} };
    run(req);
    const res = mockRes();
    let nexted = false;
    requireSiteTag(req, res, () => { nexted = true; });
    expect(nexted).toBe(false);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('site_tag_required');
    expect(res.body.request_id).toBe(req.ctx.requestId);
  });

  it('passes through when the request named a site', () => {
    const req = { body: { siteTag: 'site-alpha' } };
    run(req);
    const res = mockRes();
    let nexted = false;
    requireSiteTag(req, res, () => { nexted = true; });
    expect(nexted).toBe(true);
    expect(res.statusCode).toBe(null);
  });

  it('siteTagOr400 returns the tag or sends the 400 and returns null', () => {
    const ok = { body: { siteTag: 'site-alpha' } };
    run(ok);
    expect(siteTagOr400(ok, mockRes())).toBe('site-alpha');

    const missing = { body: {} };
    run(missing);
    const res = mockRes();
    expect(siteTagOr400(missing, res)).toBe(null);
    expect(res.statusCode).toBe(400);
  });
});

describe('siteTagOrOperatorDefault (transitional)', () => {
  it('prefers the explicit request tag over the operator selection', () => {
    const req = { query: { siteTag: 'site-explicit' } };
    run(req);
    expect(siteTagOrOperatorDefault(req, () => 'site-operator')).toBe('site-explicit');
  });

  it('falls back to the operator selection only when the request named no site', () => {
    const req = { query: {} };
    run(req);
    expect(siteTagOrOperatorDefault(req, () => 'site-operator')).toBe('site-operator');
  });
});

// ── route params, end to end against a real Express app ──────────────────────
//
// These tests exist because the middleware is mounted with app.use(), which runs
// BEFORE Express matches a route — so req.params is {} at that point and the
// documented "params > body > query > header" precedence cannot be delivered by
// reading fields in the middleware. Everything below is proved by starting a
// real server and issuing a real HTTP request; none of it is inferred from the
// Express source.

const express = require('express');
const http = require('http');

/** Start `app` on an ephemeral loopback port, issue one GET, return the reply. */
function request(app, pathname) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      const req = http.get({ host: '127.0.0.1', port, path: pathname }, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          server.close();
          let json = null;
          try { json = JSON.parse(body); } catch { /* not json */ }
          resolve({ status: res.statusCode, body, json, headers: res.headers });
        });
      });
      req.on('error', (err) => { server.close(); reject(err); });
    });
  });
}

/** An app that reports req.ctx from inside the handler, after route matching. */
function ctxApp({ async: withAsync = false, router = false } = {}) {
  const app = express();
  app.use(express.json());
  app.use(requestContext());
  if (withAsync) {
    // Mirrors express.static / any middleware that calls next() from a callback.
    // A throw raised during params assignment in this shape is UNCATCHABLE by
    // Express and kills the process — hence the resolver never throws.
    app.use((req, res, next) => { setTimeout(next, 1); });
  }
  const handler = (req, res) => {
    res.json({
      handlerRan: true,
      siteTag: req.ctx.siteTag,
      siteTagSource: req.ctx.siteTagSource,
      params: req.params,
      requireSiteTagPasses: (() => {
        let passed = false;
        requireSiteTag(req, { status: () => ({ json: () => {} }) }, () => { passed = true; });
        return passed;
      })(),
    });
  };
  if (router) {
    const sub = express.Router();
    sub.get('/projects/:tag', handler);
    app.use('/api', sub);
  } else {
    app.get('/api/projects/:tag', handler);
  }
  return app;
}

describe('requestContext — route params against a real Express app', () => {
  it('a path param reaches req.ctx.siteTag by the time the handler runs', async () => {
    const reply = await request(ctxApp(), '/api/projects/site-alpha');
    expect(reply.status).toBe(200);
    expect(reply.json.handlerRan).toBe(true);
    expect(reply.json.siteTag).toBe('site-alpha');
    expect(reply.json.siteTagSource).toBe('params.tag');
  });

  it('works the same inside a mounted sub-router', async () => {
    const reply = await request(ctxApp({ router: true }), '/api/projects/site-beta');
    expect(reply.status).toBe(200);
    expect(reply.json.siteTag).toBe('site-beta');
    expect(reply.json.siteTagSource).toBe('params.tag');
  });

  it('the path param outranks a query-string tag, as documented', async () => {
    const reply = await request(ctxApp(), '/api/projects/site-path?siteTag=site-query');
    expect(reply.status).toBe(200);
    expect(reply.json.siteTag).toBe('site-path');
    expect(reply.json.siteTagSource).toBe('params.tag');
  });

  it('requireSiteTag is satisfied by a tag that arrived only in the path', async () => {
    const reply = await request(ctxApp(), '/api/projects/site-alpha');
    expect(reply.json.requireSiteTagPasses).toBe(true);
  });

  it('leaves siteTag null when the matched param is not a site tag field', async () => {
    const app = express();
    app.use(requestContext());
    app.get('/api/content-fields/:page', (req, res) => {
      res.json({ siteTag: req.ctx.siteTag, page: req.params.page });
    });
    const reply = await request(app, '/api/content-fields/index.html');
    expect(reply.status).toBe(200);
    expect(reply.json.page).toBe('index.html');
    expect(reply.json.siteTag).toBe(null);
  });
});

describe('requestContext — traversal in the PATH is refused pre-routing', () => {
  for (const [label, pathname] of [
    ['percent-encoded separators', '/api/projects/site-a%2F..%2Fsite-b'],
    ['a literal dot-dot segment', '/api/projects/..'],
    ['an encoded dot-dot segment', '/api/projects/%2e%2e'],
    ['a tilde-rooted segment', '/api/projects/%7Eroot'],
    ['an encoded backslash', '/api/projects/site-a%5C..%5Csite-b'],
  ]) {
    it(`rejects ${label} with 400 and never runs the handler`, async () => {
      const reply = await request(ctxApp(), pathname);
      expect(reply.status).toBe(400);
      expect(reply.json.error).toBe('invalid_path_segment');
      expect(reply.json.source).toBe('path');
      expect(reply.json.request_id).toBeTruthy();
      expect(reply.body).not.toContain('handlerRan');
    });
  }

  it('still refuses it, without crashing, when next() is called asynchronously', async () => {
    // Regression guard: an earlier design threw from the req.params setter. With
    // an async next() on the stack that throw escapes every Express try/catch and
    // becomes an uncaughtException. If this test ever crashes the worker instead
    // of failing, the resolver started throwing again.
    const uncaught = [];
    const onUncaught = (err) => uncaught.push(err);
    process.on('uncaughtException', onUncaught);
    try {
      const bad = await request(ctxApp({ async: true }), '/api/projects/site-a%2F..%2Fsite-b');
      expect(bad.status).toBe(400);
      expect(bad.json.error).toBe('invalid_path_segment');

      const good = await request(ctxApp({ async: true }), '/api/projects/site-alpha');
      expect(good.status).toBe(200);
      expect(good.json.siteTag).toBe('site-alpha');
      expect(uncaught).toEqual([]);
    } finally {
      process.off('uncaughtException', onUncaught);
    }
  });

  it('leaves ordinary asset paths alone', async () => {
    const app = express();
    app.use(requestContext());
    app.get('/assets/img/logo-v1.2.png', (req, res) => res.json({ ok: true }));
    const reply = await request(app, '/assets/img/logo-v1.2.png');
    expect(reply.status).toBe(200);
    expect(reply.json.ok).toBe(true);
  });
});

describe('findDangerousPathSegment', () => {
  const cases = [
    ['/api/projects/site-alpha', null],
    ['/api/content-fields/index.html', null],
    ['/assets/img/logo.png', null],
    ['/', null],
    ['/api/projects/site-a%2F..%2Fsite-b', 'site-a/../site-b'],
    ['/api/projects/..', '..'],
    ['/api/projects/%2e%2e%2fetc', '../etc'],
    ['/api/projects/%7Esecrets', '~secrets'],
  ];
  for (const [url, expected] of cases) {
    it(`${url} -> ${expected === null ? 'safe' : JSON.stringify(expected)}`, () => {
      const hit = findDangerousPathSegment({ path: url });
      expect(hit ? hit.segment : null).toBe(expected);
    });
  }

  it('does not pre-empt Express on malformed percent-encoding', () => {
    expect(findDangerousPathSegment({ path: '/api/projects/%zz' })).toBe(null);
  });

  it('is a no-op for a request object with no path (unit-test shaped req)', () => {
    expect(findDangerousPathSegment({})).toBe(null);
    expect(findDangerousPathSegment(null)).toBe(null);
  });
});

describe('requireSiteTag / siteTagOr400 are exported but unmounted', () => {
  it('no route in server.js mounts them — the module says so, and this asserts it', () => {
    const fs = require('fs');
    const serverSrc = fs.readFileSync(new URL('../server.js', import.meta.url), 'utf8');
    // If a future wave wires them, delete this test and the "NOT WIRED YET"
    // block in lib/request-context.js together — they must not disagree.
    expect(serverSrc.includes('requireSiteTag,')).toBe(false);
    expect(serverSrc.includes('siteTagOr400(')).toBe(false);
    const src = fs.readFileSync(new URL('../lib/request-context.js', import.meta.url), 'utf8');
    expect(src).toContain('NOT WIRED YET');
  });
});

// ── 1.3 path helpers ─────────────────────────────────────────────────────────

describe('createSitePaths — explicit siteTag', () => {
  const paths = createSitePaths({ sitesRoot: SITES_ROOT, fallbackTag: () => 'site-operator' });

  it('builds every derived path from the tag it is given', () => {
    const tag = 'site-alpha';
    const dir = join(SITES_ROOT, tag);
    expect(paths.SITE_DIR(tag)).toBe(dir);
    expect(paths.DIST_DIR(tag)).toBe(join(dir, 'dist'));
    expect(paths.CONVO_FILE(tag)).toBe(join(dir, 'conversation.jsonl'));
    expect(paths.SPEC_FILE(tag)).toBe(join(dir, 'spec.json'));
    expect(paths.STUDIO_FILE(tag)).toBe(join(dir, '.studio.json'));
    expect(paths.VERSIONS_DIR(tag)).toBe(join(dir, 'dist', '.versions'));
    expect(paths.SUMMARIES_DIR(tag)).toBe(join(dir, 'summaries'));
    expect(paths.UPLOADS_DIR(tag)).toBe(join(dir, 'dist', 'assets', 'uploads'));
  });

  it('keeps two sites separate', () => {
    expect(paths.SPEC_FILE('site-alpha')).not.toBe(paths.SPEC_FILE('site-beta'));
  });

  it('refuses a traversal tag even when passed explicitly', () => {
    expect(() => paths.SITE_DIR('../../etc')).toThrow(/unsafe site tag/i);
    expect(() => paths.SPEC_FILE('site-a/../site-b')).toThrow(/unsafe site tag/i);
  });

  it('falls back to the operator selection when called with no argument (non-strict)', () => {
    delete process.env.STUDIO_STRICT_AUTHORITY;
    expect(isStrictAuthority()).toBe(false);
    expect(paths.SITE_DIR()).toBe(join(SITES_ROOT, 'site-operator'));
  });

  it('throws on a zero-argument call under STUDIO_STRICT_AUTHORITY=1, naming the helper', () => {
    process.env.STUDIO_STRICT_AUTHORITY = '1';
    expect(isStrictAuthority()).toBe(true);
    expect(() => paths.SITE_DIR()).toThrow(/SITE_DIR\(\) called with no siteTag/);
    expect(() => paths.DIST_DIR()).toThrow(/DIST_DIR\(\) called with no siteTag/);
    expect(() => paths.CONVO_FILE()).toThrow(/CONVO_FILE\(\) called with no siteTag/);
    expect(() => paths.SPEC_FILE()).toThrow(/SPEC_FILE\(\) called with no siteTag/);
    expect(() => paths.STUDIO_FILE()).toThrow(/STUDIO_FILE\(\) called with no siteTag/);
    // An explicit tag still works in strict mode — that is the whole point.
    expect(paths.SITE_DIR('site-alpha')).toBe(join(SITES_ROOT, 'site-alpha'));
  });

  it('refuses an operator selection that could escape the sites root', () => {
    const escaping = createSitePaths({ sitesRoot: SITES_ROOT, fallbackTag: () => '../../etc' });
    expect(() => escaping.SITE_DIR()).toThrow(/unsafe site tag/i);
    const empty = createSitePaths({ sitesRoot: SITES_ROOT, fallbackTag: () => '' });
    expect(() => empty.SITE_DIR()).toThrow(/no operator site selected/);
  });
});

// ── 1.3 regression: the tag must be resolved exactly ONCE per call ───────────
//
// DIST_DIR/SPEC_FILE/... used to resolve the tag and then feed the RESULT back
// into SITE_DIR, which resolved a second time down the "explicit" branch and ran
// assertSafeTag. That defeated the documented leniency of the operator fallback
// for every helper except SITE_DIR: with a legacy pre-convention selection such
// as `readings-by-maria` (8 such directories exist under ~/famtastic/sites),
// SITE_DIR() worked but SPEC_FILE() threw `Unsafe site tag`.

const ALL_HELPERS = [
  'SITE_DIR', 'DIST_DIR', 'CONVO_FILE', 'SPEC_FILE',
  'STUDIO_FILE', 'VERSIONS_DIR', 'SUMMARIES_DIR', 'UPLOADS_DIR',
];

describe('createSitePaths — single tag resolution per call', () => {
  const LEGACY = 'readings-by-maria'; // non-canonical: no `site-` prefix
  const legacy = createSitePaths({ sitesRoot: SITES_ROOT, fallbackTag: () => LEGACY });

  // CORRECTED: this previously asserted that a legacy tag passed EXPLICITLY throws.
  // That was the defect, not the requirement. Applying the canonical-shape check at
  // the path layer broke every pre-convention site directory in ~/famtastic/sites,
  // because central callers (readSpec/writeSpec) resolve a tag and then pass the
  // result back in explicitly — laundering a lenient fallback into the strict branch.
  //
  // The rules are now split by layer: containment (security) is enforced here for
  // every tag; canonical shape (request input validation) is enforced at the route
  // layer by validateTagParam, where it can answer 400. See tests/site-paths.test.js.
  it('accepts a legacy non-canonical tag passed explicitly, but still contains it', () => {
    expect(legacy.SITE_DIR(LEGACY)).toBe(join(SITES_ROOT, LEGACY));
    expect(legacy.SPEC_FILE(LEGACY)).toBe(join(SITES_ROOT, LEGACY, 'spec.json'));
    // The canonical-shape rule still exists — it just lives at the route layer.
    expect(require('../lib/security').isSafeTag(LEGACY)).toBe(false);
  });

  for (const helper of ALL_HELPERS) {
    it(`${helper}() accepts a legacy non-canonical operator fallback`, () => {
      delete process.env.STUDIO_STRICT_AUTHORITY;
      const dir = join(SITES_ROOT, LEGACY);
      const out = legacy[helper]();
      expect(typeof out).toBe('string');
      expect(out === dir || out.startsWith(dir + sep)).toBe(true);
    });
  }

  it('produces the same shapes for a legacy fallback as for an explicit canonical tag', () => {
    delete process.env.STUDIO_STRICT_AUTHORITY;
    const dir = join(SITES_ROOT, LEGACY);
    expect(legacy.SITE_DIR()).toBe(dir);
    expect(legacy.DIST_DIR()).toBe(join(dir, 'dist'));
    expect(legacy.CONVO_FILE()).toBe(join(dir, 'conversation.jsonl'));
    expect(legacy.SPEC_FILE()).toBe(join(dir, 'spec.json'));
    expect(legacy.STUDIO_FILE()).toBe(join(dir, '.studio.json'));
    expect(legacy.VERSIONS_DIR()).toBe(join(dir, 'dist', '.versions'));
    expect(legacy.SUMMARIES_DIR()).toBe(join(dir, 'summaries'));
    expect(legacy.UPLOADS_DIR()).toBe(join(dir, 'dist', 'assets', 'uploads'));
  });

  const HOSTILE = ['../../etc', 'site-a/../site-b', '..', '/etc/passwd', 'a\\b', '.'];

  for (const helper of ALL_HELPERS) {
    it(`${helper}() still rejects every explicit traversal tag`, () => {
      const paths = createSitePaths({ sitesRoot: SITES_ROOT, fallbackTag: () => 'site-operator' });
      for (const bad of HOSTILE) {
        expect(() => paths[helper](bad)).toThrow(/unsafe site tag/i);
      }
      // ...while an explicit canonical tag is untouched.
      expect(paths[helper]('site-alpha')).toContain(join(SITES_ROOT, 'site-alpha'));
    });
  }

  for (const helper of ALL_HELPERS) {
    it(`${helper}() still rejects an escaping operator fallback`, () => {
      delete process.env.STUDIO_STRICT_AUTHORITY;
      for (const bad of ['../../etc', '..', '/etc/passwd', 'a/b', '.']) {
        const escaping = createSitePaths({ sitesRoot: SITES_ROOT, fallbackTag: () => bad });
        expect(() => escaping[helper]()).toThrow(/unsafe site tag/i);
      }
    });
  }

  it('still throws under strict authority for every helper, naming the helper', () => {
    process.env.STUDIO_STRICT_AUTHORITY = '1';
    for (const helper of ALL_HELPERS) {
      expect(() => legacy[helper]()).toThrow(
        new RegExp(`${helper}\\(\\) called with no siteTag`),
      );
    }
  });

  it('never lets a resolved path escape the sites root', () => {
    delete process.env.STUDIO_STRICT_AUTHORITY;
    for (const helper of ALL_HELPERS) {
      expect(resolve(legacy[helper]()).startsWith(resolve(SITES_ROOT) + sep)).toBe(true);
    }
  });
});
