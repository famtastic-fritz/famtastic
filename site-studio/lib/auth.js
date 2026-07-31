'use strict';
/**
 * lib/auth.js — Phase 3.1. The real gate.
 *
 * Phase 0 put /api behind a loopback guard. That is CONTAINMENT, not
 * authentication: any local process, and any page loaded in the operator's
 * browser, still reaches bridge exec, codex exec, settings writes and the PTY.
 * This module is the credential check that actually stands between those
 * routes and an unauthenticated caller.
 *
 * Scope: SINGLE-OPERATOR LOCAL TOOL. There is exactly one principal — the
 * operator. There are no users, no roles beyond `operator`/`privileged`, and
 * no tenancy.
 *
 * Design
 * ------
 * 1. Root credential: 32 random bytes, hex-encoded, written 0600 to
 *    ~/.config/famtastic/studio-token at first boot. It is held in memory only
 *    as a SHA-256 digest; presented values are hashed and compared with
 *    crypto.timingSafeEqual. The raw token is never logged and never appears
 *    in any error or response body produced here.
 *
 * 2. Programmatic callers send `Authorization: Bearer <token>`. Because the
 *    root credential is re-presented on every single request, a bearer caller
 *    is privileged by construction — there is nothing to "re-auth" against.
 *
 * 3. Browsers must not hold the root token in JS-reachable storage, so they
 *    exchange it ONCE at a bootstrap endpoint for a server-side session
 *    record. The client gets an opaque id in an `HttpOnly; SameSite=Strict;
 *    Path=/` cookie. Sessions have an explicit expiry and support rotation and
 *    revocation.
 *
 * 4. Holding a session is NOT enough for the dangerous surface (bridge exec,
 *    codex exec, settings writes, lifecycle). Those require the `privileged`
 *    scope, which a session only acquires by re-presenting the root token at
 *    `elevate()`, and only for a short window.
 *
 * 5. Cookie-authenticated mutating requests additionally carry a CSRF token
 *    (double-submit against the session record) and an Origin check.
 *
 * 6. WebSocket upgrades are authenticated DURING the upgrade. A socket that
 *    fails is destroyed; it is never handed to WebSocketServer.handleUpgrade.
 *
 * The session store is injectable. The default is in-memory (correct for a
 * single-operator tool that loses its sessions on restart). runtime-vnext's
 * state/db.js is deliberately not touched here; a durable store only has to
 * implement the five methods documented on createMemorySessionStore().
 */

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TOKEN_BYTES = 32;
const SESSION_COOKIE = 'studio_session';
const CSRF_HEADER = 'x-studio-csrf';
const DEFAULT_SESSION_TTL_MS = 12 * 60 * 60 * 1000;   // 12h
const DEFAULT_PRIVILEGED_TTL_MS = 5 * 60 * 1000;      // 5m re-auth window
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function defaultTokenPath() {
  return path.join(os.homedir(), '.config', 'famtastic', 'studio-token');
}

/**
 * Session store interface (all synchronous):
 *   create(record) -> record     persist a new session
 *   get(id)        -> record|null
 *   update(id, patch) -> record|null   shallow merge
 *   remove(id)     -> boolean
 *   clear()        -> void       drop every session (token rotation)
 *
 * A record is { id, csrfToken, createdAt, expiresAt, privilegedUntil }.
 * Nothing in a record is secret except `csrfToken`; the root token is never
 * stored in a session.
 */
function createMemorySessionStore() {
  const sessions = new Map();
  return {
    create(record) { sessions.set(record.id, { ...record }); return { ...record }; },
    get(id) { const r = sessions.get(id); return r ? { ...r } : null; },
    update(id, patch) {
      const r = sessions.get(id);
      if (!r) return null;
      const next = { ...r, ...patch };
      sessions.set(id, next);
      return { ...next };
    },
    remove(id) { return sessions.delete(id); },
    clear() { sessions.clear(); },
    get size() { return sessions.size; },
  };
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest();
}

function parseCookies(header) {
  const out = {};
  if (typeof header !== 'string' || !header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    if (!k) continue;
    out[k] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

function bearerFrom(headers) {
  const raw = headers && (headers.authorization || headers.Authorization);
  if (typeof raw !== 'string') return null;
  const m = /^Bearer[ ]+(.+)$/.exec(raw.trim());
  return m ? m[1].trim() : null;
}

/**
 * @param {object} [options]
 * @param {string} [options.tokenPath]      where the root token lives (tests: mkdtemp)
 * @param {object} [options.sessionStore]   injectable store, see above
 * @param {() => number} [options.now]      clock injection for expiry tests
 * @param {(a:Buffer,b:Buffer)=>boolean} [options.timingSafeEqual]
 *        the constant-time comparator. Injected so tests can prove the
 *        constant-time path is the one actually taken.
 */
/**
 * The comparator used when nothing is injected — i.e. the one that actually
 * ships. Named and exported ONLY so a test can pin it: the suite proves an
 * injected comparator is the path every token check takes, but production
 * never injects, so swapping this default to a short-circuiting compare
 * (e.g. Buffer#equals) left the entire auth suite green. Verified by mutation.
 */
const DEFAULT_COMPARATOR = crypto.timingSafeEqual;

function createAuth(options = {}) {
  const tokenPath = options.tokenPath || defaultTokenPath();
  const store = options.sessionStore || createMemorySessionStore();
  const now = options.now || (() => Date.now());
  const timingSafeEqual = options.timingSafeEqual || DEFAULT_COMPARATOR;
  const sessionTtlMs = options.sessionTtlMs || DEFAULT_SESSION_TTL_MS;
  const privilegedTtlMs = options.privilegedTtlMs || DEFAULT_PRIVILEGED_TTL_MS;
  const secureCookie = Boolean(options.secureCookie);

  let tokenDigest = null; // Buffer(32) — the ONLY in-memory form of the token.

  // ---------------------------------------------------------------- token ---

  /**
   * First-boot generation. Creates ~/.config/famtastic (0700) and the token
   * file (0600). Returns { token, created, path }. `token` is the raw value —
   * the caller may print it once for the operator; it must never be logged.
   */
  function ensureToken() {
    if (fs.existsSync(tokenPath)) {
      const token = fs.readFileSync(tokenPath, 'utf8').trim();
      if (token) {
        // An existing file may predate this module, or have been created under
        // a permissive umask. "Stored 0600" has to hold on every boot, not only
        // the first, so tighten it rather than trusting what is on disk.
        const mode = fs.statSync(tokenPath).mode & 0o777;
        if (mode & 0o077) fs.chmodSync(tokenPath, 0o600);
        tokenDigest = sha256(token);
        return { token, created: false, path: tokenPath };
      }
    }
    const token = crypto.randomBytes(TOKEN_BYTES).toString('hex');
    fs.mkdirSync(path.dirname(tokenPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(tokenPath, token + '\n', { mode: 0o600 });
    fs.chmodSync(tokenPath, 0o600); // defeat a permissive umask
    tokenDigest = sha256(token);
    return { token, created: true, path: tokenPath };
  }

  function loadDigest() {
    if (tokenDigest) return tokenDigest;
    let raw;
    try { raw = fs.readFileSync(tokenPath, 'utf8').trim(); } catch { return null; }
    if (!raw) return null;
    tokenDigest = sha256(raw);
    return tokenDigest;
  }

  /**
   * Constant-time root-token check. Both sides are SHA-256 digests, so the
   * buffers are always 32 bytes and timingSafeEqual never throws on a length
   * mismatch — meaning the length of the presented value does not leak either.
   */
  function verifyToken(presented) {
    if (typeof presented !== 'string' || presented.length === 0) return false;
    const expected = loadDigest();
    if (!expected) return false;
    return timingSafeEqual(sha256(presented), expected);
  }

  /** Rotate the root credential. Every session is dropped with it. */
  function rotateToken() {
    const token = crypto.randomBytes(TOKEN_BYTES).toString('hex');
    fs.mkdirSync(path.dirname(tokenPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(tokenPath, token + '\n', { mode: 0o600 });
    fs.chmodSync(tokenPath, 0o600);
    tokenDigest = sha256(token);
    store.clear();
    return { token, path: tokenPath };
  }

  // -------------------------------------------------------------- sessions ---

  function isExpired(record, at) {
    return !record || typeof record.expiresAt !== 'number' || record.expiresAt <= at;
  }

  function newSessionRecord(t) {
    return {
      id: crypto.randomBytes(32).toString('hex'),
      csrfToken: crypto.randomBytes(32).toString('hex'),
      createdAt: t,
      expiresAt: t + sessionTtlMs,
      privilegedUntil: 0,
    };
  }

  /**
   * The bootstrap exchange: root token in, session out. This is the one place
   * a browser is allowed to touch the root token, and it hands back only an
   * opaque id. Returns null on a bad token (the caller answers 401 without
   * saying anything about the token itself).
   */
  function bootstrapSession(presentedToken) {
    if (!verifyToken(presentedToken)) return null;
    const record = store.create(newSessionRecord(now()));
    return { session: record, cookie: buildSessionCookie(record), csrfToken: record.csrfToken };
  }

  function getSession(id) {
    if (typeof id !== 'string' || !id) return null;
    const record = store.get(id);
    if (!record) return null;
    if (isExpired(record, now())) { store.remove(id); return null; }
    return record;
  }

  /** Re-auth: presenting the root token again opens the privileged window. */
  function elevate(sessionId, presentedToken) {
    const record = getSession(sessionId);
    if (!record) return null;
    if (!verifyToken(presentedToken)) return null;
    return store.update(record.id, { privilegedUntil: now() + privilegedTtlMs });
  }

  function dropPrivilege(sessionId) {
    const record = getSession(sessionId);
    if (!record) return null;
    return store.update(record.id, { privilegedUntil: 0 });
  }

  /**
   * Rotate a session id (fixation defence / periodic refresh). The old id is
   * revoked. The privileged window is NOT carried over — re-auth is required
   * again, deliberately.
   */
  function rotateSession(sessionId) {
    const record = getSession(sessionId);
    if (!record) return null;
    store.remove(record.id);
    const next = store.create({ ...newSessionRecord(now()), expiresAt: record.expiresAt });
    return { session: next, cookie: buildSessionCookie(next), csrfToken: next.csrfToken };
  }

  function revokeSession(sessionId) {
    if (typeof sessionId !== 'string' || !sessionId) return false;
    return store.remove(sessionId);
  }

  function revokeAllSessions() { store.clear(); }

  function buildSessionCookie(record) {
    const maxAge = Math.max(0, Math.floor((record.expiresAt - now()) / 1000));
    const parts = [
      `${SESSION_COOKIE}=${record.id}`,
      'HttpOnly',
      'SameSite=Strict',
      'Path=/',
      `Max-Age=${maxAge}`,
    ];
    if (secureCookie) parts.push('Secure');
    return parts.join('; ');
  }

  function clearSessionCookie() {
    return `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
  }

  // ------------------------------------------------------------ principals ---

  /**
   * Resolve a principal from raw headers. Works for both an Express request
   * and a raw http.IncomingMessage (the WS upgrade path), which is why it
   * takes headers rather than `req`.
   *
   * -> { ok: true, principal } | { ok: false, status, code }
   */
  function authenticateHeaders(headers) {
    const bearer = bearerFrom(headers);
    if (bearer !== null) {
      if (!verifyToken(bearer)) return { ok: false, status: 401, code: 'invalid_token' };
      // The root credential is presented per-request: nothing to re-auth.
      return { ok: true, principal: { kind: 'bearer', scopes: ['operator', 'privileged'], session: null } };
    }
    const cookies = parseCookies(headers && headers.cookie);
    const sid = cookies[SESSION_COOKIE];
    if (sid) {
      const record = getSession(sid);
      if (!record) return { ok: false, status: 401, code: 'invalid_session' };
      const scopes = ['operator'];
      if (record.privilegedUntil > now()) scopes.push('privileged');
      return { ok: true, principal: { kind: 'session', scopes, session: record } };
    }
    return { ok: false, status: 401, code: 'no_credentials' };
  }

  function hasScope(principal, scope) {
    return Boolean(principal && Array.isArray(principal.scopes) && principal.scopes.includes(scope));
  }

  // ------------------------------------------------------------------ CSRF ---

  /**
   * Cookie-authenticated mutations only. Two independent checks:
   *   - Origin/Referer, when present, must match the Host this request was
   *     sent to. A cross-origin page therefore cannot ride the cookie.
   *   - A CSRF token matching the session record, which a cross-origin page
   *     cannot read (the cookie is HttpOnly and the bootstrap response is
   *     same-origin only).
   * Bearer callers are exempt: CSRF is an ambient-credential problem, and a
   * bearer header is never sent ambiently by a browser.
   */
  function checkCsrf(req, principal) {
    if (!principal || principal.kind !== 'session') return { ok: true };
    if (!MUTATING_METHODS.has(String(req.method || '').toUpperCase())) return { ok: true };

    const headers = req.headers || {};
    const host = headers.host;
    const originHeader = headers.origin || headers.referer;
    if (originHeader) {
      let originHost = null;
      try { originHost = new URL(originHeader).host; } catch { originHost = null; }
      if (!originHost || !host || originHost !== host) {
        return { ok: false, status: 403, code: 'csrf_origin_mismatch' };
      }
    }
    const presented = headers[CSRF_HEADER];
    const expected = principal.session && principal.session.csrfToken;
    if (typeof presented !== 'string' || !presented || !expected) {
      return { ok: false, status: 403, code: 'csrf_token_missing' };
    }
    if (!timingSafeEqual(sha256(presented), sha256(expected))) {
      return { ok: false, status: 403, code: 'csrf_token_mismatch' };
    }
    return { ok: true };
  }

  // ------------------------------------------------------------ middleware ---

  function deny(res, status, code) {
    // Deliberately terse. No token, no session id, no hint about which half of
    // the credential was wrong.
    const message = status === 403 ? 'Forbidden' : 'Authentication required';
    return res.status(status).json({ error: message, code });
  }

  /** Express middleware: authenticate + CSRF. Sets req.auth. */
  function requireAuth() {
    return (req, res, next) => {
      const result = authenticateHeaders(req.headers || {});
      if (!result.ok) return deny(res, result.status, result.code);
      const csrf = checkCsrf(req, result.principal);
      if (!csrf.ok) return deny(res, csrf.status, csrf.code);
      req.auth = result.principal;
      return next();
    };
  }

  /**
   * Express middleware for the dangerous surface. Must be mounted AFTER
   * requireAuth(). A session that has not re-authed is rejected with 403 and
   * `reauth_required`, which the client turns into a re-auth prompt.
   */
  function requirePrivileged() {
    return (req, res, next) => {
      const principal = req.auth;
      if (!principal) return deny(res, 401, 'no_credentials');
      if (!hasScope(principal, 'privileged')) return deny(res, 403, 'reauth_required');
      return next();
    };
  }

  // --------------------------------------------------------------- upgrade ---

  /**
   * Authenticate a WebSocket upgrade BEFORE handing the socket to
   * WebSocketServer.handleUpgrade. Browsers cannot set headers on a WebSocket,
   * so the cookie is the browser path; `Sec-WebSocket-Protocol: studio.bearer,
   * <token>` is available to programmatic callers that cannot set
   * Authorization either.
   *
   * Cookie-authenticated upgrades require a same-origin Origin header: the
   * upgrade is a state-changing, ambient-credential request, so it gets the
   * same treatment as a mutating POST.
   */
  function authenticateUpgrade(request) {
    const headers = (request && request.headers) || {};
    let result = authenticateHeaders(headers);

    if (!result.ok && result.code === 'no_credentials') {
      const proto = headers['sec-websocket-protocol'];
      if (typeof proto === 'string') {
        const parts = proto.split(',').map((s) => s.trim());
        if (parts[0] === 'studio.bearer' && parts[1]) {
          result = verifyToken(parts[1])
            ? { ok: true, principal: { kind: 'bearer', scopes: ['operator', 'privileged'], session: null } }
            : { ok: false, status: 401, code: 'invalid_token' };
        }
      }
    }
    if (!result.ok) return result;

    if (result.principal.kind === 'session') {
      const originHeader = headers.origin;
      if (originHeader) {
        let originHost = null;
        try { originHost = new URL(originHeader).host; } catch { originHost = null; }
        if (!originHost || !headers.host || originHost !== headers.host) {
          return { ok: false, status: 403, code: 'csrf_origin_mismatch' };
        }
      }
    }
    return result;
  }

  /**
   * Convenience wrapper for server.on('upgrade'): returns the principal, or
   * destroys the socket and returns null. A failed upgrade must never leave an
   * open socket.
   */
  function guardUpgrade(request, socket, { requirePrivilegedScope = false } = {}) {
    const result = authenticateUpgrade(request);
    if (!result.ok) { destroyUpgrade(socket, result.status); return null; }
    if (requirePrivilegedScope && !hasScope(result.principal, 'privileged')) {
      destroyUpgrade(socket, 403);
      return null;
    }
    return result.principal;
  }

  function destroyUpgrade(socket, status) {
    if (!socket) return;
    const line = status === 403 ? '403 Forbidden' : '401 Unauthorized';
    try { socket.write(`HTTP/1.1 ${line}\r\nConnection: close\r\n\r\n`); } catch { /* socket already gone */ }
    try { socket.destroy(); } catch { /* nothing more to do */ }
  }

  return {
    // token
    ensureToken,
    verifyToken,
    rotateToken,
    tokenPath,
    // sessions
    bootstrapSession,
    getSession,
    elevate,
    dropPrivilege,
    rotateSession,
    revokeSession,
    revokeAllSessions,
    buildSessionCookie,
    clearSessionCookie,
    // principals
    authenticateHeaders,
    hasScope,
    checkCsrf,
    // express
    requireAuth,
    requirePrivileged,
    // websocket
    authenticateUpgrade,
    guardUpgrade,
    // introspection for wiring/tests
    store,
  };
}

module.exports = {
  DEFAULT_COMPARATOR,
  createAuth,
  createMemorySessionStore,
  defaultTokenPath,
  parseCookies,
  SESSION_COOKIE,
  CSRF_HEADER,
  TOKEN_BYTES,
};
