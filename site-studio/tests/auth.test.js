/**
 * Phase 3.1 — authentication module tests.
 *
 * Every test here drives lib/auth.js by EXECUTION: real files in a mkdtemp
 * directory (never the operator's ~/.config), real header objects, real
 * sockets-as-doubles. Nothing asserts on source text.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

const require = createRequire(import.meta.url);
const {
  createAuth,
  createMemorySessionStore,
  defaultTokenPath,
  parseCookies,
  SESSION_COOKIE,
  CSRF_HEADER,
} = require('../lib/auth');

let tmpDir;
let tokenPath;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-auth-'));
  tokenPath = path.join(tmpDir, 'config', 'famtastic', 'studio-token');
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/** Clock we can move, so expiry is tested by expiring, not by sleeping. */
function makeClock(start = 1_700_000_000_000) {
  let t = start;
  const now = () => t;
  now.advance = (ms) => { t += ms; };
  return now;
}

function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

function mockSocket() {
  return {
    destroyed: false,
    written: [],
    write(chunk) { this.written.push(String(chunk)); return true; },
    destroy() { this.destroyed = true; },
  };
}

function run(mw, req) {
  const res = mockRes();
  let nextCalled = false;
  mw(req, res, () => { nextCalled = true; });
  return { res, nextCalled };
}

// --------------------------------------------------------------- token file ---

describe('root token file', () => {
  it('is created at first boot with 0600 and 32 bytes of entropy', () => {
    const auth = createAuth({ tokenPath });
    const { token, created, path: p } = auth.ensureToken();

    expect(created).toBe(true);
    expect(p).toBe(tokenPath);
    expect(fs.existsSync(tokenPath)).toBe(true);
    expect(token).toMatch(/^[0-9a-f]{64}$/);          // 32 bytes hex
    expect(Buffer.from(token, 'hex').length).toBe(32);

    const mode = fs.statSync(tokenPath).mode & 0o777;
    expect(mode.toString(8)).toBe('600');
  });

  it('does not regenerate on a second boot', () => {
    const first = createAuth({ tokenPath }).ensureToken();
    const second = createAuth({ tokenPath }).ensureToken();
    expect(second.created).toBe(false);
    expect(second.token).toBe(first.token);
  });

  it('tightens a pre-existing world-readable token file on the next boot', () => {
    fs.mkdirSync(path.dirname(tokenPath), { recursive: true });
    fs.writeFileSync(tokenPath, 'b'.repeat(64) + '\n');
    fs.chmodSync(tokenPath, 0o644);
    expect((fs.statSync(tokenPath).mode & 0o777).toString(8)).toBe('644');

    const auth = createAuth({ tokenPath });
    const { token, created } = auth.ensureToken();
    expect(created).toBe(false);
    expect(token).toBe('b'.repeat(64));                       // the token is preserved
    expect((fs.statSync(tokenPath).mode & 0o777).toString(8)).toBe('600');
    expect(auth.verifyToken('b'.repeat(64))).toBe(true);
  });

  it('generates a different token per install', () => {
    const a = createAuth({ tokenPath }).ensureToken().token;
    const other = path.join(tmpDir, 'other', 'studio-token');
    const b = createAuth({ tokenPath: other }).ensureToken().token;
    expect(a).not.toBe(b);
  });

  it('defaults to ~/.config/famtastic/studio-token but tests never use it', () => {
    expect(defaultTokenPath()).toBe(path.join(os.homedir(), '.config', 'famtastic', 'studio-token'));
    expect(tokenPath.startsWith(os.tmpdir())).toBe(true);
  });

  it('rotating the token invalidates the old one and every session', () => {
    const auth = createAuth({ tokenPath });
    const { token: original } = auth.ensureToken();
    const boot = auth.bootstrapSession(original);
    expect(boot).not.toBeNull();

    const { token: rotated } = auth.rotateToken();
    expect(rotated).not.toBe(original);
    expect(auth.verifyToken(original)).toBe(false);
    expect(auth.verifyToken(rotated)).toBe(true);
    expect(auth.getSession(boot.session.id)).toBeNull();
    expect((fs.statSync(tokenPath).mode & 0o777).toString(8)).toBe('600');
  });
});

// --------------------------------------------------------- timing safety ----

describe('token comparison is constant time', () => {
  it('routes every token check through the injected timingSafeEqual over equal-length digests', () => {
    const calls = [];
    const auth = createAuth({
      tokenPath,
      timingSafeEqual: (a, b) => { calls.push([a, b]); return crypto.timingSafeEqual(a, b); },
    });
    const { token } = auth.ensureToken();

    expect(auth.verifyToken(token)).toBe(true);
    expect(auth.verifyToken('x')).toBe(false);          // wildly different length

    // If the comparison were `===` on the raw strings, `calls` would be empty.
    expect(calls.length).toBe(2);
    for (const [a, b] of calls) {
      expect(Buffer.isBuffer(a)).toBe(true);
      expect(Buffer.isBuffer(b)).toBe(true);
      expect(a.length).toBe(32);                        // sha256 digest, not the token
      expect(b.length).toBe(32);
      expect(a.toString('hex')).not.toBe(token);        // raw token never compared directly
    }
  });

  it('a near-miss token still goes through the constant-time path and fails', () => {
    let used = 0;
    const auth = createAuth({
      tokenPath,
      timingSafeEqual: (a, b) => { used += 1; return crypto.timingSafeEqual(a, b); },
    });
    const { token } = auth.ensureToken();
    const nearMiss = token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a');

    expect(auth.verifyToken(nearMiss)).toBe(false);
    expect(used).toBe(1);
  });

  it('never returns the token or its digest in a rejection', () => {
    const auth = createAuth({ tokenPath });
    const { token } = auth.ensureToken();
    const { res } = run(auth.requireAuth(), { method: 'GET', headers: { authorization: 'Bearer nope' } });
    expect(res.statusCode).toBe(401);
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain(token);
    expect(serialized).not.toContain(crypto.createHash('sha256').update(token).digest('hex'));
  });
});

// ------------------------------------------------------------------ bearer ---

describe('Authorization: Bearer', () => {
  it('accepts the valid token and grants privileged scope', () => {
    const auth = createAuth({ tokenPath });
    const { token } = auth.ensureToken();
    const { res, nextCalled } = run(auth.requireAuth(), {
      method: 'GET', headers: { authorization: `Bearer ${token}` },
    });
    expect(nextCalled).toBe(true);
    expect(res.statusCode).toBeNull();
  });

  it('rejects an invalid token', () => {
    const auth = createAuth({ tokenPath });
    auth.ensureToken();
    const { res, nextCalled } = run(auth.requireAuth(), {
      method: 'GET', headers: { authorization: 'Bearer ' + 'f'.repeat(64) },
    });
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe('invalid_token');
  });

  it('rejects an absent credential', () => {
    const auth = createAuth({ tokenPath });
    auth.ensureToken();
    const { res, nextCalled } = run(auth.requireAuth(), { method: 'GET', headers: {} });
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe('no_credentials');
  });

  it('rejects everything when no token file exists at all', () => {
    const auth = createAuth({ tokenPath });           // ensureToken deliberately not called
    expect(auth.verifyToken('anything')).toBe(false);
    // Fail CLOSED: a presented bearer cannot authenticate without a configured
    // token, and no token can ever bootstrap a session either.
    const { res, nextCalled } = run(auth.requireAuth(), {
      method: 'GET', headers: { authorization: 'Bearer anything' },
    });
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe('invalid_token');
    expect(auth.bootstrapSession('anything')).toBeNull();
  });

  it('does not accept the token in a query string or a non-Bearer scheme', () => {
    const auth = createAuth({ tokenPath });
    const { token } = auth.ensureToken();
    for (const headers of [{ authorization: `Basic ${token}` }, { authorization: token }]) {
      const { nextCalled } = run(auth.requireAuth(), { method: 'GET', headers });
      expect(nextCalled).toBe(false);
    }
  });
});

// ---------------------------------------------------------------- sessions ---

describe('browser session lifecycle', () => {
  it('bootstrap exchanges the token for an HttpOnly SameSite=Strict Path=/ cookie', () => {
    const auth = createAuth({ tokenPath });
    const { token } = auth.ensureToken();
    const boot = auth.bootstrapSession(token);

    expect(boot).not.toBeNull();
    expect(boot.cookie).toContain(`${SESSION_COOKIE}=${boot.session.id}`);
    expect(boot.cookie).toContain('HttpOnly');
    expect(boot.cookie).toContain('SameSite=Strict');
    expect(boot.cookie).toContain('Path=/');
    expect(boot.cookie).not.toContain(token);
    expect(boot.session.id).not.toBe(token);
  });

  it('bootstrap refuses a bad token', () => {
    const auth = createAuth({ tokenPath });
    auth.ensureToken();
    expect(auth.bootstrapSession('f'.repeat(64))).toBeNull();
    expect(auth.bootstrapSession(undefined)).toBeNull();
  });

  it('a live session cookie authenticates a GET', () => {
    const auth = createAuth({ tokenPath });
    const { token } = auth.ensureToken();
    const boot = auth.bootstrapSession(token);
    const { nextCalled } = run(auth.requireAuth(), {
      method: 'GET', headers: { cookie: `${SESSION_COOKIE}=${boot.session.id}` },
    });
    expect(nextCalled).toBe(true);
  });

  it('an expired session is rejected and purged', () => {
    const now = makeClock();
    const auth = createAuth({ tokenPath, now, sessionTtlMs: 1000 });
    const { token } = auth.ensureToken();
    const boot = auth.bootstrapSession(token);

    expect(auth.getSession(boot.session.id)).not.toBeNull();
    now.advance(1001);
    expect(auth.getSession(boot.session.id)).toBeNull();

    const { res, nextCalled } = run(auth.requireAuth(), {
      method: 'GET', headers: { cookie: `${SESSION_COOKIE}=${boot.session.id}` },
    });
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe('invalid_session');
    expect(auth.store.get(boot.session.id)).toBeNull();
  });

  it('a revoked session is rejected immediately', () => {
    const auth = createAuth({ tokenPath });
    const { token } = auth.ensureToken();
    const boot = auth.bootstrapSession(token);

    expect(auth.revokeSession(boot.session.id)).toBe(true);
    const { res, nextCalled } = run(auth.requireAuth(), {
      method: 'GET', headers: { cookie: `${SESSION_COOKIE}=${boot.session.id}` },
    });
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
  });

  it('revokeAllSessions kills every outstanding session', () => {
    const auth = createAuth({ tokenPath });
    const { token } = auth.ensureToken();
    const a = auth.bootstrapSession(token);
    const b = auth.bootstrapSession(token);
    auth.revokeAllSessions();
    expect(auth.getSession(a.session.id)).toBeNull();
    expect(auth.getSession(b.session.id)).toBeNull();
  });

  it('rotation issues a new id, retires the old one, and drops privilege', () => {
    const now = makeClock();
    const auth = createAuth({ tokenPath, now });
    const { token } = auth.ensureToken();
    const boot = auth.bootstrapSession(token);
    auth.elevate(boot.session.id, token);
    expect(auth.getSession(boot.session.id).privilegedUntil).toBeGreaterThan(now());

    const rotated = auth.rotateSession(boot.session.id);
    expect(rotated.session.id).not.toBe(boot.session.id);
    expect(auth.getSession(boot.session.id)).toBeNull();
    expect(auth.getSession(rotated.session.id)).not.toBeNull();
    expect(rotated.session.privilegedUntil).toBe(0);
    expect(rotated.session.csrfToken).not.toBe(boot.session.csrfToken);
    expect(rotated.session.expiresAt).toBe(boot.session.expiresAt);
  });

  it('rotating an unknown or expired session yields null', () => {
    const now = makeClock();
    const auth = createAuth({ tokenPath, now, sessionTtlMs: 1000 });
    const { token } = auth.ensureToken();
    const boot = auth.bootstrapSession(token);
    now.advance(2000);
    expect(auth.rotateSession(boot.session.id)).toBeNull();
    expect(auth.rotateSession('nope')).toBeNull();
  });

  it('an injected store is the one actually used', () => {
    const inner = createMemorySessionStore();
    const seen = [];
    const store = {
      create(r) { seen.push(['create', r.id]); return inner.create(r); },
      get(id) { seen.push(['get', id]); return inner.get(id); },
      update(id, p) { return inner.update(id, p); },
      remove(id) { seen.push(['remove', id]); return inner.remove(id); },
      clear() { inner.clear(); },
    };
    const auth = createAuth({ tokenPath, sessionStore: store });
    const { token } = auth.ensureToken();
    const boot = auth.bootstrapSession(token);
    auth.getSession(boot.session.id);
    auth.revokeSession(boot.session.id);
    expect(seen.map((s) => s[0])).toEqual(['create', 'get', 'remove']);
  });
});

// --------------------------------------------------------- privileged scope ---

describe('privileged scope requires re-auth', () => {
  function privilegedChain(auth, req) {
    const first = run(auth.requireAuth(), req);
    if (!first.nextCalled) return first;
    return run(auth.requirePrivileged(), req);
  }

  it('a plain session is refused with reauth_required', () => {
    const auth = createAuth({ tokenPath });
    const { token } = auth.ensureToken();
    const boot = auth.bootstrapSession(token);
    const req = {
      method: 'POST',
      headers: {
        cookie: `${SESSION_COOKIE}=${boot.session.id}`,
        [CSRF_HEADER]: boot.csrfToken,
      },
    };
    const { res, nextCalled } = privilegedChain(auth, req);
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('reauth_required');
  });

  it('re-presenting the token elevates the session and lets it through', () => {
    const auth = createAuth({ tokenPath });
    const { token } = auth.ensureToken();
    const boot = auth.bootstrapSession(token);
    expect(auth.elevate(boot.session.id, token)).not.toBeNull();

    const req = {
      method: 'POST',
      headers: {
        cookie: `${SESSION_COOKIE}=${boot.session.id}`,
        [CSRF_HEADER]: boot.csrfToken,
      },
    };
    const { nextCalled } = privilegedChain(auth, req);
    expect(nextCalled).toBe(true);
  });

  it('elevation with a wrong token does nothing', () => {
    const auth = createAuth({ tokenPath });
    const { token } = auth.ensureToken();
    const boot = auth.bootstrapSession(token);
    expect(auth.elevate(boot.session.id, 'f'.repeat(64))).toBeNull();
    expect(auth.getSession(boot.session.id).privilegedUntil).toBe(0);
  });

  it('the privileged window expires on its own', () => {
    const now = makeClock();
    const auth = createAuth({ tokenPath, now, privilegedTtlMs: 60_000 });
    const { token } = auth.ensureToken();
    const boot = auth.bootstrapSession(token);
    auth.elevate(boot.session.id, token);

    const req = {
      method: 'POST',
      headers: {
        cookie: `${SESSION_COOKIE}=${boot.session.id}`,
        [CSRF_HEADER]: boot.csrfToken,
      },
    };
    expect(privilegedChain(auth, req).nextCalled).toBe(true);
    now.advance(60_001);
    const after = privilegedChain(auth, req);
    expect(after.nextCalled).toBe(false);
    expect(after.res.body.code).toBe('reauth_required');
  });

  it('dropPrivilege revokes the window without killing the session', () => {
    const auth = createAuth({ tokenPath });
    const { token } = auth.ensureToken();
    const boot = auth.bootstrapSession(token);
    auth.elevate(boot.session.id, token);
    auth.dropPrivilege(boot.session.id);

    const req = {
      method: 'POST',
      headers: {
        cookie: `${SESSION_COOKIE}=${boot.session.id}`,
        [CSRF_HEADER]: boot.csrfToken,
      },
    };
    const { res, nextCalled } = privilegedChain(auth, req);
    expect(nextCalled).toBe(false);
    expect(res.body.code).toBe('reauth_required');
    expect(auth.getSession(boot.session.id)).not.toBeNull();
  });

  it('a bearer caller is privileged without a session (token presented per request)', () => {
    const auth = createAuth({ tokenPath });
    const { token } = auth.ensureToken();
    const req = { method: 'POST', headers: { authorization: `Bearer ${token}` } };
    const { nextCalled } = privilegedChain(auth, req);
    expect(nextCalled).toBe(true);
  });

  it('requirePrivileged mounted without requireAuth denies rather than passes', () => {
    const auth = createAuth({ tokenPath });
    auth.ensureToken();
    const { res, nextCalled } = run(auth.requirePrivileged(), { method: 'POST', headers: {} });
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
  });
});

// ------------------------------------------------------------------- CSRF ----

describe('CSRF protection for cookie-authenticated mutations', () => {
  function setup() {
    const auth = createAuth({ tokenPath });
    const { token } = auth.ensureToken();
    const boot = auth.bootstrapSession(token);
    return { auth, token, boot };
  }

  it('rejects a cross-origin mutating cookie request', () => {
    const { auth, boot } = setup();
    const { res, nextCalled } = run(auth.requireAuth(), {
      method: 'POST',
      headers: {
        host: 'localhost:4000',
        origin: 'https://evil.example',
        cookie: `${SESSION_COOKIE}=${boot.session.id}`,
        [CSRF_HEADER]: boot.csrfToken,   // even WITH a leaked token, origin kills it
      },
    });
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('csrf_origin_mismatch');
  });

  it('rejects a same-origin mutation with no CSRF token', () => {
    const { auth, boot } = setup();
    const { res, nextCalled } = run(auth.requireAuth(), {
      method: 'POST',
      headers: {
        host: 'localhost:4000',
        origin: 'http://localhost:4000',
        cookie: `${SESSION_COOKIE}=${boot.session.id}`,
      },
    });
    expect(nextCalled).toBe(false);
    expect(res.body.code).toBe('csrf_token_missing');
  });

  it('rejects a mutation carrying another session\'s CSRF token', () => {
    const { auth, token, boot } = setup();
    const other = auth.bootstrapSession(token);
    const { res, nextCalled } = run(auth.requireAuth(), {
      method: 'POST',
      headers: {
        host: 'localhost:4000',
        origin: 'http://localhost:4000',
        cookie: `${SESSION_COOKIE}=${boot.session.id}`,
        [CSRF_HEADER]: other.csrfToken,
      },
    });
    expect(nextCalled).toBe(false);
    expect(res.body.code).toBe('csrf_token_mismatch');
  });

  it('accepts a same-origin mutation with the matching CSRF token', () => {
    const { auth, boot } = setup();
    const { nextCalled } = run(auth.requireAuth(), {
      method: 'POST',
      headers: {
        host: 'localhost:4000',
        origin: 'http://localhost:4000',
        cookie: `${SESSION_COOKIE}=${boot.session.id}`,
        [CSRF_HEADER]: boot.csrfToken,
      },
    });
    expect(nextCalled).toBe(true);
  });

  it('applies to every mutating verb but not to GET/HEAD', () => {
    const { auth, boot } = setup();
    const headers = {
      host: 'localhost:4000',
      origin: 'http://localhost:4000',
      cookie: `${SESSION_COOKIE}=${boot.session.id}`,
    };
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      expect(run(auth.requireAuth(), { method, headers }).nextCalled).toBe(false);
    }
    for (const method of ['GET', 'HEAD']) {
      expect(run(auth.requireAuth(), { method, headers }).nextCalled).toBe(true);
    }
  });

  it('uses a cross-origin Referer as the origin signal when Origin is absent', () => {
    const { auth, boot } = setup();
    const { res } = run(auth.requireAuth(), {
      method: 'POST',
      headers: {
        host: 'localhost:4000',
        referer: 'https://evil.example/page',
        cookie: `${SESSION_COOKIE}=${boot.session.id}`,
        [CSRF_HEADER]: boot.csrfToken,
      },
    });
    expect(res.body.code).toBe('csrf_origin_mismatch');
  });

  it('does not impose CSRF on bearer callers', () => {
    const { auth, token } = setup();
    const { nextCalled } = run(auth.requireAuth(), {
      method: 'POST',
      headers: { host: 'localhost:4000', origin: 'https://evil.example', authorization: `Bearer ${token}` },
    });
    expect(nextCalled).toBe(true);
  });
});

// -------------------------------------------------------------- WS upgrade ---

describe('WebSocket upgrade authentication', () => {
  it('accepts a good bearer upgrade', () => {
    const auth = createAuth({ tokenPath });
    const { token } = auth.ensureToken();
    const result = auth.authenticateUpgrade({ headers: { authorization: `Bearer ${token}` } });
    expect(result.ok).toBe(true);
    expect(result.principal.scopes).toContain('privileged');
  });

  it('accepts the Sec-WebSocket-Protocol bearer form browsers force on us', () => {
    const auth = createAuth({ tokenPath });
    const { token } = auth.ensureToken();
    const ok = auth.authenticateUpgrade({ headers: { 'sec-websocket-protocol': `studio.bearer, ${token}` } });
    expect(ok.ok).toBe(true);
    const bad = auth.authenticateUpgrade({ headers: { 'sec-websocket-protocol': 'studio.bearer, deadbeef' } });
    expect(bad.ok).toBe(false);
    expect(bad.code).toBe('invalid_token');
  });

  it('accepts a same-origin session cookie upgrade', () => {
    const auth = createAuth({ tokenPath });
    const { token } = auth.ensureToken();
    const boot = auth.bootstrapSession(token);
    const result = auth.authenticateUpgrade({
      headers: {
        host: 'localhost:4000',
        origin: 'http://localhost:4000',
        cookie: `${SESSION_COOKIE}=${boot.session.id}`,
      },
    });
    expect(result.ok).toBe(true);
    expect(result.principal.kind).toBe('session');
  });

  it('rejects a cross-origin session cookie upgrade', () => {
    const auth = createAuth({ tokenPath });
    const { token } = auth.ensureToken();
    const boot = auth.bootstrapSession(token);
    const result = auth.authenticateUpgrade({
      headers: {
        host: 'localhost:4000',
        origin: 'https://evil.example',
        cookie: `${SESSION_COOKIE}=${boot.session.id}`,
      },
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('csrf_origin_mismatch');
  });

  it('rejects an upgrade with no credential, an expired session, and a revoked session', () => {
    const now = makeClock();
    const auth = createAuth({ tokenPath, now, sessionTtlMs: 1000 });
    const { token } = auth.ensureToken();

    expect(auth.authenticateUpgrade({ headers: {} }).ok).toBe(false);

    const revoked = auth.bootstrapSession(token);
    auth.revokeSession(revoked.session.id);
    expect(auth.authenticateUpgrade({
      headers: { cookie: `${SESSION_COOKIE}=${revoked.session.id}` },
    }).ok).toBe(false);

    const expiring = auth.bootstrapSession(token);
    now.advance(1001);
    expect(auth.authenticateUpgrade({
      headers: { cookie: `${SESSION_COOKIE}=${expiring.session.id}` },
    }).ok).toBe(false);
  });

  it('guardUpgrade destroys the socket on failure and leaves it open on success', () => {
    const auth = createAuth({ tokenPath });
    const { token } = auth.ensureToken();

    const bad = mockSocket();
    expect(auth.guardUpgrade({ headers: {} }, bad)).toBeNull();
    expect(bad.destroyed).toBe(true);
    expect(bad.written.join('')).toContain('401');

    const good = mockSocket();
    const principal = auth.guardUpgrade({ headers: { authorization: `Bearer ${token}` } }, good);
    expect(principal).not.toBeNull();
    expect(good.destroyed).toBe(false);
    expect(good.written.length).toBe(0);
  });

  it('guardUpgrade destroys the socket of an under-scoped PTY upgrade', () => {
    const auth = createAuth({ tokenPath });
    const { token } = auth.ensureToken();
    const boot = auth.bootstrapSession(token);

    const sock = mockSocket();
    const denied = auth.guardUpgrade(
      { headers: { host: 'h', origin: 'http://h', cookie: `${SESSION_COOKIE}=${boot.session.id}` } },
      sock,
      { requirePrivilegedScope: true },
    );
    expect(denied).toBeNull();
    expect(sock.destroyed).toBe(true);
    expect(sock.written.join('')).toContain('403');

    auth.elevate(boot.session.id, token);
    const ok = mockSocket();
    const allowed = auth.guardUpgrade(
      { headers: { host: 'h', origin: 'http://h', cookie: `${SESSION_COOKIE}=${boot.session.id}` } },
      ok,
      { requirePrivilegedScope: true },
    );
    expect(allowed).not.toBeNull();
    expect(ok.destroyed).toBe(false);
  });

  it('guardUpgrade still destroys the socket when the write fails', () => {
    const auth = createAuth({ tokenPath });
    auth.ensureToken();
    const sock = {
      destroyed: false,
      write() { throw new Error('EPIPE'); },
      destroy() { this.destroyed = true; },
    };
    expect(auth.guardUpgrade({ headers: {} }, sock)).toBeNull();
    expect(sock.destroyed).toBe(true);
  });
});

// ----------------------------------------------------------- cookie parsing ---

describe('cookie parsing', () => {
  it('reads the session cookie out of a realistic multi-cookie header', () => {
    const jar = parseCookies(`theme=dark; ${SESSION_COOKIE}=abc123; other=1`);
    expect(jar[SESSION_COOKIE]).toBe('abc123');
    expect(jar.theme).toBe('dark');
  });

  it('tolerates junk without throwing', () => {
    expect(parseCookies(undefined)).toEqual({});
    expect(parseCookies('')).toEqual({});
    expect(parseCookies('novalue')).toEqual({});
  });
});

/**
 * The DEFAULT comparator must be constant-time.
 *
 * The suite already proves that an INJECTED comparator is the one every token
 * check routes through. That is necessary but not sufficient: production never
 * injects, so those tests all pass while the default is something else. Verified
 * by mutation — swapping the default to
 *
 *     options.timingSafeEqual || ((a, b) => a.equals(b))
 *
 * (Buffer#equals, which short-circuits on the first differing byte and is
 * therefore not constant-time) left the entire auth suite green. The injection
 * seam existed to prove the constant-time path is taken, and the one path nobody
 * was checking was the one that actually ships.
 */
describe('default comparator is constant-time', () => {
  it('defaults to crypto.timingSafeEqual, not a short-circuiting compare', () => {
    const nodeCrypto = require('crypto');
    const { DEFAULT_COMPARATOR } = require('../lib/auth');
    // Buffer#equals and === both short-circuit on the first differing byte and
    // would leak token bytes through response timing. Only the identity check
    // catches a swap, because a swapped comparator still returns correct
    // booleans and every behavioural test keeps passing.
    expect(DEFAULT_COMPARATOR).toBe(nodeCrypto.timingSafeEqual);
    expect(DEFAULT_COMPARATOR).not.toBe(Buffer.prototype.equals);
  });

  it('still verifies correctly through the default (no injection)', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'auth-default-cmp-'));
    try {
      const auth = createAuth({ tokenPath: path.join(dir, 'studio-token') });
      const { token } = auth.ensureToken();
      expect(auth.verifyToken(token)).toBe(true);
      expect(auth.verifyToken('0'.repeat(64))).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
