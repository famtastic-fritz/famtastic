/**
 * Phase 3.2 — proof that lib/auth.js is actually WIRED INTO server.js.
 *
 * Everything here drives the SHIPPING objects: `app` is the same Express app
 * the process listens with, and `handleStudioUpgrade` is the same function
 * registered on `server.on('upgrade')`. Nothing about the auth path is
 * re-created in test code — the Wave 6 defect (a test that proved an INJECTED
 * comparator worked while production used a different default) is exactly the
 * shape this file is written to avoid.
 *
 * Both states are exercised:
 *   - STUDIO_REQUIRE_AUTH unset  -> ENFORCED (the default): real 401/403 on
 *     HTTP and on both upgrades.
 *   - STUDIO_REQUIRE_AUTH=0      -> explicit opt-out: mechanism wired, never
 *     rejects (tests that boot the server without credentials use this).
 *
 * The token path is redirected into an mkdtemp dir, so no test ever creates or
 * reads the operator's real ~/.config/famtastic/studio-token, and nothing here
 * writes under the operator sites root.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import http from 'http';

const require = createRequire(import.meta.url);

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-auth-wiring-'));
const TOKEN_PATH = path.join(tmpDir, 'studio-token');

// Must be set BEFORE server.js is loaded: createAuth() captures the path.
process.env.STUDIO_TOKEN_PATH = TOKEN_PATH;
delete process.env.STUDIO_REQUIRE_AUTH;

const WebSocket = require('ws');
const {
  app,
  handleStudioUpgrade,
  studioAuth,
  authEnforced,
  isPrivilegedApiRequest,
} = require('../server.js');

let server;
let base;
let ROOT_TOKEN;

function enforce(on) {
  // `on` === true means "the enforced default": unset the var entirely.
  if (on) delete process.env.STUDIO_REQUIRE_AUTH;
  else process.env.STUDIO_REQUIRE_AUTH = '0';
}

async function call(method, urlPath, { headers = {}, body } = {}) {
  const res = await fetch(base + urlPath, {
    method,
    headers: body ? { 'Content-Type': 'application/json', ...headers } : headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* not all responses are json */ }
  return { status: res.status, json, setCookie: res.headers.get('set-cookie') };
}

/** Drive a real WebSocket handshake through the shipping upgrade handler. */
function wsProbe(urlPath, { headers, protocols } = {}) {
  return new Promise((resolve) => {
    const ws = new WebSocket(
      base.replace('http://', 'ws://') + urlPath,
      protocols,
      headers ? { headers } : undefined,
    );
    const finish = (outcome) => { try { ws.close(); } catch { /* already gone */ } resolve(outcome); };
    ws.on('open', () => finish({ ok: true, message: 'open' }));
    ws.on('error', (err) => finish({ ok: false, message: String(err && err.message) }));
    setTimeout(() => finish({ ok: false, message: 'timeout' }), 5000);
  });
}

beforeAll(async () => {
  // Guard: if a stale module cache handed us an auth instance pointed at the
  // operator's real config dir, fail loudly rather than write there.
  expect(studioAuth.tokenPath).toBe(TOKEN_PATH);
  ROOT_TOKEN = studioAuth.ensureToken().token;

  server = http.createServer(app);
  server.on('upgrade', handleStudioUpgrade);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  enforce(false);
  if (server) await new Promise((resolve) => server.close(resolve));
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.STUDIO_TOKEN_PATH;
});

describe('root token at boot', () => {
  it('exists at the configured path with mode 0600 and is not the logged value', () => {
    expect(fs.existsSync(TOKEN_PATH)).toBe(true);
    expect(fs.statSync(TOKEN_PATH).mode & 0o777).toBe(0o600);
    expect(ROOT_TOKEN).toMatch(/^[0-9a-f]{64}$/);
  });

  it('re-reads the same token on a second ensureToken (no silent rotation)', () => {
    const again = studioAuth.ensureToken();
    expect(again.created).toBe(false);
    expect(again.token).toBe(ROOT_TOKEN);
  });
});

describe('privileged route table', () => {
  it('covers exec, settings writes, lifecycle and the PTY', () => {
    expect(isPrivilegedApiRequest('POST', '/bridge/exec')).toBe(true);
    expect(isPrivilegedApiRequest('POST', '/codex/exec')).toBe(true);
    expect(isPrivilegedApiRequest('PUT', '/settings')).toBe(true);
    expect(isPrivilegedApiRequest('PUT', '/site-settings')).toBe(true);
    expect(isPrivilegedApiRequest('DELETE', '/site-settings')).toBe(true);
    expect(isPrivilegedApiRequest('POST', '/sites')).toBe(true);
    expect(isPrivilegedApiRequest('POST', '/new-site')).toBe(true);
    expect(isPrivilegedApiRequest('POST', '/switch-site')).toBe(true);
    expect(isPrivilegedApiRequest('DELETE', '/projects/site-demo')).toBe(true);
    expect(isPrivilegedApiRequest('POST', '/terminal/create')).toBe(true);
    expect(isPrivilegedApiRequest('GET', '/terminal/1')).toBe(true);
  });

  it('covers the Operator V1 mutations (build, deploy, edit, verify)', () => {
    expect(isPrivilegedApiRequest('POST', '/site-studio/build-vnext')).toBe(true);
    expect(isPrivilegedApiRequest('POST', '/deploy')).toBe(true);
    expect(isPrivilegedApiRequest('POST', '/content-field')).toBe(true);
    expect(isPrivilegedApiRequest('POST', '/verify')).toBe(true);
  });

  it('does not sweep reads into the privileged surface', () => {
    expect(isPrivilegedApiRequest('GET', '/sites')).toBe(false);
    expect(isPrivilegedApiRequest('GET', '/settings')).toBe(false);
    expect(isPrivilegedApiRequest('POST', '/bridge/read')).toBe(false);
    expect(isPrivilegedApiRequest('POST', '/sites/anything/else')).toBe(false);
    // V1 status/read endpoints: authenticated, but NOT elevated.
    expect(isPrivilegedApiRequest('GET', '/site-studio/build-vnext/status')).toBe(false);
    expect(isPrivilegedApiRequest('GET', '/deploy-status')).toBe(false);
    expect(isPrivilegedApiRequest('GET', '/content-fields/index.html')).toBe(false);
    expect(isPrivilegedApiRequest('GET', '/verify')).toBe(false);
    expect(isPrivilegedApiRequest('GET', '/site-studio/preview-url')).toBe(false);
    expect(isPrivilegedApiRequest('GET', '/auth/status')).toBe(false);
  });
});

describe('opt-out state — STUDIO_REQUIRE_AUTH=0 (explicit, logged at boot)', () => {
  beforeAll(() => enforce(false));
  afterAll(() => enforce(true));

  it('reports itself as unenforced', () => {
    expect(authEnforced()).toBe(false);
  });

  it('serves GET /api/sites with NO credentials', async () => {
    const res = await call('GET', '/api/sites');
    expect(res.status).toBe(200);
  });

  it('lets an uncredentialed caller through the privileged gate', async () => {
    const res = await call('POST', '/api/bridge/exec', { body: {} });
    // Reaches the route handler (which rejects the empty body on its own
    // terms). The point is that it is NOT 401/403 from the auth gate.
    expect([401, 403]).not.toContain(res.status);
  });

  it('accepts an unauthenticated Studio WebSocket upgrade', async () => {
    const out = await wsProbe('/');
    expect(out.ok).toBe(true);
  });
});

describe('default state — STUDIO_REQUIRE_AUTH unset (ENFORCED by default)', () => {
  beforeAll(() => enforce(true));
  afterAll(() => enforce(false));

  it('reports itself as enforced', () => {
    expect(authEnforced()).toBe(true);
  });

  it('401s GET /api/sites with no credentials', async () => {
    const res = await call('GET', '/api/sites');
    expect(res.status).toBe(401);
    expect(res.json.code).toBe('no_credentials');
  });

  it('401s on a wrong Bearer token', async () => {
    const res = await call('GET', '/api/sites', { headers: { Authorization: 'Bearer deadbeef' } });
    expect(res.status).toBe(401);
    expect(res.json.code).toBe('invalid_token');
  });

  it('200s GET /api/sites with the real Bearer token', async () => {
    const res = await call('GET', '/api/sites', { headers: { Authorization: `Bearer ${ROOT_TOKEN}` } });
    expect(res.status).toBe(200);
  });

  it('401s the bootstrap exchange on a bad token and leaks nothing', async () => {
    const res = await call('POST', '/api/auth/bootstrap', { body: { token: 'not-the-token' } });
    expect(res.status).toBe(401);
    expect(JSON.stringify(res.json)).not.toContain(ROOT_TOKEN);
    expect(res.setCookie).toBeNull();
  });

  describe('browser session flow', () => {
    let cookie;
    let csrf;

    beforeAll(async () => {
      const res = await call('POST', '/api/auth/bootstrap', { body: { token: ROOT_TOKEN } });
      expect(res.status).toBe(200);
      expect(res.setCookie).toMatch(/HttpOnly/);
      expect(res.setCookie).toMatch(/SameSite=Strict/);
      expect(res.setCookie).not.toContain(ROOT_TOKEN);
      cookie = res.setCookie.split(';')[0];
      csrf = res.json.csrfToken;
      expect(csrf).toMatch(/^[0-9a-f]{64}$/);
    });

    it('authenticates ordinary reads with the session cookie', async () => {
      const res = await call('GET', '/api/sites', { headers: { Cookie: cookie } });
      expect(res.status).toBe(200);
    });

    it('refuses a cookie mutation with no CSRF token', async () => {
      const res = await call('POST', '/api/bridge/read', {
        headers: { Cookie: cookie, Origin: base },
        body: { path: 'package.json' },
      });
      expect(res.status).toBe(403);
      expect(res.json.code).toBe('csrf_token_missing');
    });

    it('refuses a cross-origin cookie mutation', async () => {
      const res = await call('POST', '/api/bridge/read', {
        headers: { Cookie: cookie, Origin: 'http://evil.example', 'x-studio-csrf': csrf },
        body: { path: 'package.json' },
      });
      expect(res.status).toBe(403);
      expect(res.json.code).toBe('csrf_origin_mismatch');
    });

    it('403s the privileged surface for a session that has not re-authed', async () => {
      const res = await call('POST', '/api/bridge/exec', {
        headers: { Cookie: cookie, Origin: base, 'x-studio-csrf': csrf },
        body: {},
      });
      expect(res.status).toBe(403);
      expect(res.json.code).toBe('reauth_required');
    });

    it('Operator V1 mutations: session WITHOUT elevation gets 403, bearer passes the gate', async () => {
      for (const urlPath of ['/api/site-studio/build-vnext', '/api/deploy', '/api/content-field', '/api/verify']) {
        const res = await call('POST', urlPath, {
          headers: { Cookie: cookie, Origin: base, 'x-studio-csrf': csrf },
          body: {},
        });
        expect(res.status, `${urlPath} without elevation`).toBe(403);
        expect(res.json.code, `${urlPath} without elevation`).toBe('reauth_required');

        const bearer = await call('POST', urlPath, {
          headers: { Authorization: `Bearer ${ROOT_TOKEN}` },
          body: {},
        });
        // Bearer is privileged by construction: it must pass the auth gates and
        // reach the route handler (which answers 400/5xx on an empty body).
        expect([401, 403], `${urlPath} with bearer`).not.toContain(bearer.status);
      }
    });

    it('V1 status reads need auth but NOT elevation', async () => {
      // No credentials at all -> 401.
      const anon = await call('GET', '/api/site-studio/preview-url');
      expect(anon.status).toBe(401);
      // A plain (non-elevated) session passes the gate.
      const res = await call('GET', '/api/site-studio/preview-url', { headers: { Cookie: cookie } });
      expect([401, 403]).not.toContain(res.status);
    });

    it('opens the privileged surface only after re-presenting the root token', async () => {
      const bad = await call('POST', '/api/auth/elevate', {
        headers: { Cookie: cookie, Origin: base },
        body: { token: 'wrong' },
      });
      expect(bad.status).toBe(401);

      const ok = await call('POST', '/api/auth/elevate', {
        headers: { Cookie: cookie, Origin: base },
        body: { token: ROOT_TOKEN },
      });
      expect(ok.status).toBe(200);
      expect(ok.json.privilegedUntil).toBeGreaterThan(Date.now());

      const res = await call('POST', '/api/bridge/exec', {
        headers: { Cookie: cookie, Origin: base, 'x-studio-csrf': csrf },
        body: {},
      });
      expect([401, 403]).not.toContain(res.status);
    });

    it('revokes the session on logout', async () => {
      const out = await call('POST', '/api/auth/logout', { headers: { Cookie: cookie } });
      expect(out.status).toBe(200);
      expect(out.json.revoked).toBe(true);
      const after = await call('GET', '/api/sites', { headers: { Cookie: cookie } });
      expect(after.status).toBe(401);
      expect(after.json.code).toBe('invalid_session');
    });
  });

  describe('WebSocket upgrades authenticate DURING the upgrade', () => {
    it('refuses the Studio WS with no credentials and destroys the socket', async () => {
      const out = await wsProbe('/');
      expect(out.ok).toBe(false);
      expect(out.message).toContain('401');
    });

    it('refuses the Studio WS on a wrong Bearer token', async () => {
      const out = await wsProbe('/', { headers: { Authorization: 'Bearer deadbeef' } });
      expect(out.ok).toBe(false);
      expect(out.message).toContain('401');
    });

    it('accepts the Studio WS with the real Bearer token', async () => {
      const out = await wsProbe('/', { headers: { Authorization: `Bearer ${ROOT_TOKEN}` } });
      expect(out.ok).toBe(true);
    });

    it('accepts the Studio WS via the studio.bearer subprotocol', async () => {
      const out = await wsProbe('/', { protocols: ['studio.bearer', ROOT_TOKEN] });
      expect(out.ok).toBe(true);
    });

    it('refuses the PTY WS with no credentials, before any terminal lookup', async () => {
      const out = await wsProbe('/terminal/1');
      expect(out.ok).toBe(false);
      expect(out.message).toContain('401');
    });

    it('refuses the PTY WS for a session without the privileged scope', async () => {
      const boot = await call('POST', '/api/auth/bootstrap', { body: { token: ROOT_TOKEN } });
      const sessionCookie = boot.setCookie.split(';')[0];
      const out = await wsProbe('/terminal/1', { headers: { Cookie: sessionCookie, Origin: base } });
      expect(out.ok).toBe(false);
      expect(out.message).toContain('403');
    });
  });
});
