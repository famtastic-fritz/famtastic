'use strict';
/**
 * lib/request-context.js — Phase 1, Task 1.2.
 *
 * Resolves the identity of a request onto `req.ctx`:
 *
 *   req.ctx = { siteTag, siteTagSource, unresolvedSiteTag, runId, requestId }
 *
 * Rules (these are the point of the module):
 *
 *   1. `siteTag` comes only from an EXPLICIT request field — route param, body,
 *      query string, or the `x-site-tag` header, in that precedence order.
 *      There is no ambient default: if the request did not say which site it is
 *      about, `req.ctx.siteTag` is `null`.
 *   2. A traversal-shaped tag (path separators, `..`, `~`, a NUL) is rejected
 *      with 400 and never reaches a path join. A tag that is merely not in
 *      canonical `site-…` shape is not fatal here, because `POST /api/new-site`
 *      legitimately receives a raw, un-normalised name; it simply does not
 *      resolve, so `req.ctx.siteTag` stays null and `unresolvedSiteTag` carries
 *      the raw string.
 *   3. `requestId` is always generated so every log line, trace event and error
 *      response can be correlated.
 *
 * ── HOW ROUTE PARAMS ARE ACTUALLY COVERED (read this before editing) ─────────
 *
 * The middleware is mounted with `app.use()`, which runs BEFORE Express matches
 * a route, so at middleware time `req.params` is `{}` for every request — a
 * plain `app.use` middleware can never see a path param. Two mechanisms close
 * that gap, and neither of them is "read req.params in the middleware":
 *
 *   a) REJECTION happens pre-routing, on the raw URL. `findDangerousPathSegment`
 *      percent-decodes each segment of `req.path` and refuses the request if any
 *      segment is traversal-shaped. This is deliberately not param-aware: it
 *      cannot know which segment a route will bind to `:tag`, so it guards every
 *      segment of every route in every router (including routers this module
 *      does not import). `/api/projects/site-a%2F..%2Fsite-b` is answered 400
 *      here, before any handler or any path join.
 *
 *   b) RESOLUTION happens post-routing, via an accessor installed on
 *      `req.params`. Express assigns `req.params` once per matched layer; the
 *      setter re-runs the field resolution at that moment, so by the time a
 *      handler runs, a `:tag` / `:siteTag` path param has taken precedence over
 *      body, query and header in `req.ctx.siteTag` (source `params.tag`).
 *
 * The setter deliberately NEVER throws. Express calls `next()` asynchronously in
 * middleware such as `express.static`, so the layer try/catch is off the stack
 * by then and a throw from the setter becomes an uncaught exception that kills
 * the process. (Verified by execution, not by reading the Express source.) If a
 * dangerous tag somehow reaches the setter it is simply not adopted — (a) is the
 * mechanism that refuses the request.
 *
 * Routes whose browser callers do not send a tag yet (Phase 4 changes the client
 * protocol) must not silently read a global. They call
 * `siteTagOrOperatorDefault(req, operatorTag)` so the legacy default is one
 * greppable, deliberately named call rather than an invisible global read.
 *
 * ── NOT WIRED YET ───────────────────────────────────────────────────────────
 *
 * `requireSiteTag` and `siteTagOr400` are exported and tested but are used by
 * ZERO routes today, and this module does not claim otherwise. Every route that
 * genuinely requires a tag right now already enforces it with
 * `validateTagParam` from lib/security.js; every other route falls back to the
 * operator's selection through `siteTagOrOperatorDefault`, so mounting these
 * guards there would turn working ambient calls into 400s. They land when Phase
 * 4 updates the client to always send a tag.
 */

const crypto = require('crypto');
const { isSafeTag } = require('./security');

/** Field names that may carry the site tag, most explicit first. */
const SITE_TAG_FIELDS = ['siteTag', 'site_tag', 'sitetag', 'tag'];
const RUN_ID_FIELDS = ['runId', 'run_id', 'runid'];

function firstField(container, fields) {
  if (!container || typeof container !== 'object') return null;
  for (const field of fields) {
    const value = container[field];
    if (typeof value === 'string' && value.trim() !== '') {
      return { value: value.trim(), field };
    }
  }
  return null;
}

/**
 * Pull a candidate site tag off the request without validating it.
 * @returns {{ value: string, field: string, from: string }|null}
 */
function findSiteTagCandidate(req) {
  const sources = [
    ['params', req && req.params],
    ['body', req && req.body],
    ['query', req && req.query],
    ['header', req && req.headers ? { siteTag: req.headers['x-site-tag'] } : null],
  ];
  for (const [from, container] of sources) {
    const hit = firstField(container, SITE_TAG_FIELDS);
    if (hit) return { ...hit, from };
  }
  return null;
}

function findRunId(req) {
  const sources = [req && req.params, req && req.body, req && req.query];
  for (const container of sources) {
    const hit = firstField(container, RUN_ID_FIELDS);
    if (hit) return hit.value;
  }
  const header = req && req.headers && req.headers['x-run-id'];
  return typeof header === 'string' && header.trim() ? header.trim() : null;
}

/**
 * A tag that could escape the sites root, or corrupt a path. Never legitimate,
 * on any route, so the middleware refuses the request outright.
 */
function isDangerousTag(value) {
  if (typeof value !== 'string') return true;
  return value.includes('/')
    || value.includes('\\')
    || value.includes('..')
    || value.includes('\0')
    || value.startsWith('~');
}

/**
 * Pre-routing traversal guard.
 *
 * `req.params` does not exist yet when this middleware runs, so a traversal tag
 * arriving in the PATH cannot be caught by inspecting fields. Instead each
 * percent-decoded segment of the request path is checked directly. A segment
 * that decodes to something containing a path separator, `..`, a NUL, or that
 * starts with `~`, is never a legitimate URL segment for this server and is
 * refused before any route handler or path join sees it.
 *
 * @returns {{ segment: string, index: number }|null}
 */
function findDangerousPathSegment(req) {
  const rawPath = typeof (req && req.path) === 'string'
    ? req.path
    : (typeof (req && req.url) === 'string' ? String(req.url).split('?')[0] : null);
  if (!rawPath) return null;
  const segments = rawPath.split('/');
  for (let i = 0; i < segments.length; i++) {
    const raw = segments[i];
    if (raw === '') continue;
    let decoded;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      // Malformed percent-encoding. Express answers 400 on its own when it tries
      // to decode a param; leave that behaviour alone rather than pre-empting it.
      continue;
    }
    // Checked decoded AND literal: `/api/projects/..` carries no percent-encoding
    // at all, and `%2e%2e%2f` only becomes dangerous after decoding.
    if (isDangerousTag(decoded)) return { segment: decoded, index: i };
  }
  return null;
}

function newRequestId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Resolve the request context without touching the response.
 * @returns {{ ok: true, ctx: object } | { ok: false, status: number, body: object }}
 */
function resolveRequestContext(req, options = {}) {
  const generateRequestId = options.generateRequestId || newRequestId;
  const requestId = generateRequestId();

  // Pre-routing: the path itself, because req.params is still {} here.
  if (options.scanPath !== false) {
    const badSegment = findDangerousPathSegment(req);
    if (badSegment) {
      return {
        ok: false,
        status: 400,
        body: {
          error: 'invalid_path_segment',
          message: `Invalid path segment: ${badSegment.segment.slice(0, 64)}`,
          field: `path[${badSegment.index}]`,
          source: 'path',
          request_id: requestId,
        },
      };
    }
  }

  const candidate = findSiteTagCandidate(req);

  if (candidate && isDangerousTag(candidate.value)) {
    return {
      ok: false,
      status: 400,
      body: {
        error: 'invalid_site_tag',
        message: `Invalid site tag: ${String(candidate.value).slice(0, 64)}`,
        field: candidate.field,
        source: candidate.from,
        request_id: requestId,
      },
    };
  }

  const resolved = candidate && isSafeTag(candidate.value) ? candidate : null;

  return {
    ok: true,
    ctx: {
      siteTag: resolved ? resolved.value : null,
      siteTagSource: resolved ? `${resolved.from}.${resolved.field}` : null,
      // A tag was supplied but is not a canonical site tag (e.g. an un-normalised
      // new-site name). Not authority — routes must not treat it as a site.
      unresolvedSiteTag: candidate && !resolved ? candidate.value : null,
      runId: findRunId(req),
      requestId,
    },
  };
}

/**
 * Install an accessor on `req.params` so route params reach `req.ctx`.
 *
 * Express assigns `req.params` once per matched layer, AFTER this middleware has
 * already run. The setter re-runs field resolution at that moment, which is the
 * only way an `app.use()`-mounted middleware can honour the documented
 * `params > body > query > header` precedence.
 *
 * It must not throw: `express.static` and friends call `next()` from an fs
 * callback, so a throw here escapes every layer try/catch and takes the process
 * down. A dangerous params value is therefore not adopted rather than rejected —
 * `findDangerousPathSegment` has already refused those requests pre-routing.
 */
function installParamsResolver(req, requestId) {
  const existing = Object.getOwnPropertyDescriptor(req, 'params');
  if (existing && existing.configurable === false) return false;
  let current = req.params;
  Object.defineProperty(req, 'params', {
    configurable: true,
    enumerable: true,
    get() { return current; },
    set(value) {
      current = value;
      const outcome = resolveRequestContext(req, {
        scanPath: false,
        generateRequestId: () => requestId,
      });
      if (outcome.ok) req.ctx = outcome.ctx;
    },
  });
  return true;
}

/**
 * Express middleware. Mount once, before the routers.
 */
function requestContext(options = {}) {
  return function requestContextMiddleware(req, res, next) {
    const result = resolveRequestContext(req, options);
    if (!result.ok) {
      if (res && typeof res.setHeader === 'function') {
        res.setHeader('X-Request-Id', result.body.request_id);
      }
      return res.status(result.status).json(result.body);
    }
    req.ctx = result.ctx;
    if (res && typeof res.setHeader === 'function') {
      res.setHeader('X-Request-Id', result.ctx.requestId);
    }
    if (options.resolveParams !== false) {
      installParamsResolver(req, result.ctx.requestId);
    }
    return next();
  };
}

/**
 * Route guard: 400 unless the request named a site explicitly.
 * NOT MOUNTED ON ANY ROUTE TODAY — see "NOT WIRED YET" in the module header.
 */
function requireSiteTag(req, res, next) {
  const siteTag = req && req.ctx && req.ctx.siteTag;
  if (siteTag) return next();
  return res.status(400).json({
    error: 'site_tag_required',
    message: 'This request must name the site explicitly (siteTag in the body, query, or path).',
    request_id: (req && req.ctx && req.ctx.requestId) || null,
  });
}

/**
 * Inline variant for handlers that are not wrapped in `requireSiteTag`.
 * Sends the 400 and returns null when the tag is missing.
 * NOT CALLED BY ANY ROUTE TODAY — see "NOT WIRED YET" in the module header.
 */
function siteTagOr400(req, res) {
  const siteTag = req && req.ctx && req.ctx.siteTag;
  if (siteTag) return siteTag;
  res.status(400).json({
    error: 'site_tag_required',
    message: 'This request must name the site explicitly (siteTag in the body, query, or path).',
    request_id: (req && req.ctx && req.ctx.requestId) || null,
  });
  return null;
}

/**
 * TRANSITIONAL. The explicit request tag when present, otherwise the operator's
 * currently selected site. Used only by read-only routes whose browser callers
 * do not send a tag yet; Phase 4 updates the client and deletes these calls.
 * Every remaining ambient authority read is `grep -n siteTagOrOperatorDefault`.
 */
function siteTagOrOperatorDefault(req, operatorTag) {
  const explicit = req && req.ctx && req.ctx.siteTag;
  if (explicit) return explicit;
  return typeof operatorTag === 'function' ? operatorTag() : operatorTag;
}

module.exports = {
  requestContext,
  resolveRequestContext,
  requireSiteTag,
  siteTagOr400,
  siteTagOrOperatorDefault,
  findSiteTagCandidate,
  findDangerousPathSegment,
  isDangerousTag,
  SITE_TAG_FIELDS,
};
