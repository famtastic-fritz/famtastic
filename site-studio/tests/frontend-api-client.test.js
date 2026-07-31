/**
 * Phase 4 — proof that public/js/studio-api-client.js actually threads
 * credentials through to the SHIPPING server.
 *
 * What is real here and what is not:
 *   REAL — `app` and `handleStudioUpgrade` are the exact objects server.js
 *          listens with; every assertion below is an HTTP/WS round trip against
 *          them, through the real lib/auth.js middleware stack.
 *   REAL — the client under test is the shipped file, loaded verbatim into a
 *          vm context. No behaviour is re-implemented in test code.
 *   REAL — the cookie jar is a browser stand-in, because Node's fetch has no
 *          cookie store. It only stores and replays Set-Cookie; it makes no
 *          auth decision. The server does.
 *   STUB — `document`. Enough DOM for the re-auth prompt to render and be
 *          submitted, so the operator-facing path is exercised rather than
 *          skipped.
 *
 * The Wave 6/7 lesson is deliberately answered: nothing here asserts against an
 * injected double. Every 401/403/200 is the real middleware's answer.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import http from 'http';
import vm from 'vm';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_PATH = path.join(HERE, '..', 'public', 'js', 'studio-api-client.js');

// Never touch the operator's real ~/.config/famtastic/studio-token, and never
// write into the sites root one level above the vitest cwd.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-phase4-client-'));
process.env.STUDIO_TOKEN_PATH = path.join(tmpDir, 'studio-token');
delete process.env.STUDIO_REQUIRE_AUTH;

/**
 * server.js has a PRE-EXISTING origin allow-list on mutations, pinned to the
 * literal PORT it read at module load (`http://localhost:${PORT}` /
 * `http://127.0.0.1:${PORT}`). Listening on an ephemeral port while PORT says
 * 3334 makes every POST 403 before lib/auth.js is ever reached. So: reserve a
 * free port FIRST, tell server.js about it, then listen on exactly that port.
 */
const FREE_PORT = await new Promise((resolve, reject) => {
  const probe = http.createServer();
  probe.on('error', reject);
  probe.listen(0, '127.0.0.1', () => {
    const { port } = probe.address();
    probe.close(() => resolve(port));
  });
});
process.env.STUDIO_PORT = String(FREE_PORT);

const { app, handleStudioUpgrade, studioAuth } = require('../server.js');
const WebSocketImpl = require('ws');

let server;
let origin;
let ROOT_TOKEN;

function enforce(on) {
  // `on` === true means "the enforced default": unset the var entirely.
  if (on) delete process.env.STUDIO_REQUIRE_AUTH;
  else process.env.STUDIO_REQUIRE_AUTH = '0';
}

// ---------------------------------------------------------------------------
// A browser stand-in: cookie jar + just enough DOM for the re-auth prompt.
// ---------------------------------------------------------------------------

function makeCookieJar() {
  const jar = new Map();
  return {
    header() {
      if (!jar.size) return null;
      return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
    },
    absorb(res) {
      const raw = typeof res.headers.getSetCookie === 'function'
        ? res.headers.getSetCookie()
        : [res.headers.get('set-cookie')].filter(Boolean);
      for (const line of raw) {
        const [pair, ...attrs] = line.split(';');
        const idx = pair.indexOf('=');
        if (idx < 0) continue;
        const name = pair.slice(0, idx).trim();
        const value = pair.slice(idx + 1).trim();
        const maxAge = attrs.map((a) => a.trim()).find((a) => /^Max-Age=/i.test(a));
        if (maxAge && Number(maxAge.split('=')[1]) === 0) jar.delete(name);
        else jar.set(name, value);
      }
    },
    clear() { jar.clear(); },
    size() { return jar.size; },
  };
}

/** Minimal DOM: element registry, appendChild, addEventListener, dispatch. */
function makeDocument() {
  const byId = new Map();
  function makeEl(tag) {
    const listeners = new Map();
    const el = {
      tagName: String(tag).toUpperCase(),
      children: [],
      parentNode: null,
      style: { cssText: '' },
      attributes: {},
      textContent: '',
      value: '',
      type: '',
      placeholder: '',
      autocomplete: '',
      _id: '',
      get id() { return this._id; },
      set id(v) { this._id = v; if (v) byId.set(v, el); },
      setAttribute(k, v) { this.attributes[k] = v; },
      getAttribute(k) { return this.attributes[k]; },
      appendChild(child) { this.children.push(child); child.parentNode = this; return child; },
      removeChild(child) {
        this.children = this.children.filter((c) => c !== child);
        if (child._id) byId.delete(child._id);
        child.parentNode = null;
        return child;
      },
      addEventListener(type, fn) {
        if (!listeners.has(type)) listeners.set(type, []);
        listeners.get(type).push(fn);
      },
      dispatch(type, event = {}) {
        for (const fn of listeners.get(type) || []) fn({ preventDefault() {}, ...event });
      },
      focus() {},
    };
    return el;
  }
  const body = makeEl('body');
  return {
    body,
    createElement: makeEl,
    getElementById(id) { return byId.get(id) || null; },
    _reset() { byId.clear(); body.children = []; },
  };
}

/**
 * Load the shipped client into a fresh vm context wired to `origin`.
 * Returns the context's `window` so a test can drive the seam directly.
 */
function loadClient({ locationSearch = '', jar = makeCookieJar(), store = new Map() } = {}) {
  const doc = makeDocument();
  const requests = [];
  const url = new URL(origin);

  const win = {
    location: {
      href: origin + '/index.html' + locationSearch,
      origin,
      host: url.host,
      hostname: url.hostname,
      port: url.port,
      protocol: 'http:',
      pathname: '/index.html',
      search: locationSearch,
      hash: '',
    },
    history: {
      replaced: [],
      // A real browser rewrites location to match. The stub must too, or the
      // "token is scrubbed from the address bar" claim would be untestable.
      replaceState(_s, _t, next) {
        this.replaced.push(next);
        const u = new URL(next, win.location.href);
        win.location.href = u.href;
        win.location.pathname = u.pathname;
        win.location.search = u.search;
        win.location.hash = u.hash;
      },
    },
    document: doc,
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    },
    Headers,
    Request,
    Response,
    URL,
    URLSearchParams,
    Promise,
    console,
    WebSocket: WebSocketImpl,
    // The browser stand-in: attaches the cookie jar to every request and
    // absorbs Set-Cookie. This is the ONLY thing test code does to the request.
    // It is installed BEFORE the client is evaluated, so it IS the client's
    // captured NATIVE_FETCH — which makes `requests` a faithful record of what
    // the client actually put on the wire.
    fetch(input, init = {}) {
      const target = typeof input === 'string' ? new URL(input, win.location.href).href : input;
      requests.push({
        url: String(target),
        method: String((init && init.method) || 'GET').toUpperCase(),
        headers: new Headers((init && init.headers) || {}),
        credentials: init && init.credentials,
      });
      const headers = new Headers((init && init.headers) || {});
      const cookie = jar.header();
      if (cookie) headers.set('cookie', cookie);
      // A browser always sends Origin on a same-origin POST; lib/auth.js checks it.
      if (init && init.method && init.method !== 'GET') headers.set('origin', origin);
      return fetch(target, { ...init, headers, redirect: 'manual' }).then((res) => {
        jar.absorb(res);
        return res;
      });
    },
  };
  win.window = win;
  win.globalThis = win;

  const context = vm.createContext(win);
  vm.runInContext(fs.readFileSync(CLIENT_PATH, 'utf8'), context, { filename: CLIENT_PATH });
  win.__jar = jar;
  win.__doc = doc;
  win.__store = store;
  win.__requests = requests;
  return win;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Wait for the client to raise its re-auth prompt (a real HTTP round trip). */
async function waitForPrompt(win, timeoutMs = 4000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (win.__doc.getElementById('studio-auth-token')) return true;
    await sleep(10);
  }
  return false;
}

/** Type a token into the rendered prompt and submit it, as an operator would. */
async function submitPrompt(win, token) {
  expect(await waitForPrompt(win), 'the re-auth prompt should be in the DOM').toBe(true);
  win.__doc.getElementById('studio-auth-token').value = token;
  win.__doc.getElementById('studio-auth-prompt').children[0].dispatch('submit');
}

async function cancelPrompt(win) {
  expect(await waitForPrompt(win), 'the re-auth prompt should be in the DOM').toBe(true);
  win.__doc.getElementById('studio-auth-cancel').dispatch('click');
}

beforeAll(async () => {
  expect(studioAuth.tokenPath).toBe(process.env.STUDIO_TOKEN_PATH);
  ROOT_TOKEN = studioAuth.ensureToken().token;
  server = http.createServer(app);
  server.on('upgrade', handleStudioUpgrade);
  await new Promise((resolve) => server.listen(FREE_PORT, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${FREE_PORT}`;
});

afterAll(async () => {
  enforce(false);
  if (server) {
    // WebSocket clients keep the server alive; drop them or close() never returns.
    if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.STUDIO_TOKEN_PATH;
});

beforeEach(() => {
  enforce(false);
  studioAuth.revokeAllSessions();
});

// ---------------------------------------------------------------------------

describe('the seam is installed exactly once, over the right URLs', () => {
  it('wraps window.fetch and window.WebSocket', () => {
    const win = loadClient();
    expect(win.fetch.__studioSeam).toBe(true);
    expect(win.WebSocket.__studioSeam).toBe(true);
    expect(win.StudioAPI.__installed).toBe(true);
  });

  it('claims same-origin /api/** and nothing else', () => {
    const win = loadClient();
    const is = (u) => win.StudioAPI.isStudioApiUrl(win.StudioAPI.resolveUrl(u));
    expect(is('/api/config')).toBe(true);
    expect(is('/api/sites/abc')).toBe(true);
    expect(is(origin + '/api/config')).toBe(true);
    // Not /api
    expect(is('/js/studio-shell.js')).toBe(false);
    expect(is('data/workbench-plan-state.json')).toBe(false);
    expect(is('/apisomething')).toBe(false);
    // Cross-origin: sending Studio credentials there would be a leak.
    expect(is('http://localhost:3333/api/config')).toBe(false);
    expect(is('https://cdn.jsdelivr.net/api/x')).toBe(false);
  });

  it('rewrites a loopback ws:// URL onto the page host so the cookie is in scope', () => {
    const win = loadClient();
    const { host } = new URL(origin);
    // The shipped call site is literally `ws://localhost:' + config.studioPort`
    // while the page is served from 127.0.0.1 — different cookie scope AND an
    // Origin/Host mismatch that lib/auth.js answers with 403.
    expect(win.StudioAPI.resolveWsUrl('ws://localhost:3334')).toBe(`ws://${host}/`);
    expect(win.StudioAPI.resolveWsUrl('ws://localhost:3334/terminal/1')).toBe(`ws://${host}/terminal/1`);
    // Non-loopback targets are left alone — never redirect someone else's socket.
    expect(win.StudioAPI.resolveWsUrl('wss://example.com/socket')).toBe('wss://example.com/socket');
  });
});

describe('STUDIO_REQUIRE_AUTH=0 (explicit opt-out) — the UI behaves exactly as before', () => {
  it('reaches /api/config with no prompt, no bootstrap and no session', async () => {
    const win = loadClient();
    const res = await win.fetch('/api/config');
    expect(res.status).toBe(200);
    expect(win.StudioAPI.state.enforced).toBe(false);
    expect(win.__doc.getElementById('studio-auth-prompt')).toBeNull();
    expect(win.__jar.size()).toBe(0);
    expect(studioAuth.store.size).toBe(0);
  });

  it('passes non-/api requests to the native fetch untouched', async () => {
    const win = loadClient();
    const res = await win.fetch('/js/studio-api-client.js');
    expect(res.status).toBe(200);
    expect(win.StudioAPI.state.csrfToken).toBeNull();
  });
});

describe('STUDIO_REQUIRE_AUTH unset (enforced by default) — credentials are threaded end to end', () => {
  it('a bare request is refused by the shipping middleware (control)', async () => {
    enforce(true);
    const res = await fetch(origin + '/api/config');
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe('no_credentials');
  });

  it('bootstraps from ?studio_token=, scrubs the URL, and the /api call succeeds', async () => {
    enforce(true);
    const win = loadClient({ locationSearch: `?studio_token=${ROOT_TOKEN}&embedded=1` });
    const res = await win.fetch('/api/config');
    expect(res.status).toBe(200);
    expect(win.StudioAPI.state.authenticated).toBe(true);
    expect(win.__jar.header()).toMatch(/studio_session=/);
    // The token must not linger in history or in the address bar.
    expect(win.history.replaced).toEqual(['/index.html?embedded=1']);
    expect(win.location.search).not.toMatch(/studio_token/);
  });

  it('a 401 raises ONE prompt, and the operator token completes the request', async () => {
    enforce(true);
    const win = loadClient();
    const pending = win.fetch('/api/config');
    await submitPrompt(win, ROOT_TOKEN);
    const res = await pending;
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('tag');
    expect(win.StudioAPI.state.csrfToken).toMatch(/^[0-9a-f]{64}$/);
  });

  it('a burst of concurrent 401s produces exactly one prompt and one session', async () => {
    enforce(true);
    const win = loadClient();
    const all = [win.fetch('/api/config'), win.fetch('/api/pages'), win.fetch('/api/studio-state')];
    expect(await waitForPrompt(win)).toBe(true);
    // One prompt node, not three.
    expect(win.__doc.body.children.filter((c) => c.id === 'studio-auth-prompt')).toHaveLength(1);
    submitPrompt(win, ROOT_TOKEN);
    const results = await Promise.all(all);
    for (const r of results) expect(r.status).toBe(200);
    expect(studioAuth.store.size).toBe(1);
  });

  it('a cancelled prompt fails honestly — the 401 is returned, and there is no retry loop', async () => {
    enforce(true);
    const win = loadClient();
    const pending = win.fetch('/api/config');
    await cancelPrompt(win);
    const res = await pending;
    expect(res.status).toBe(401);
    expect(win.__doc.getElementById('studio-auth-prompt')).toBeNull();
    // One 401'd attempt + the status probe + the bootstrap that never happened.
    // Crucially: the client did NOT keep hammering /api/config.
    const configHits = win.__requests.filter((r) => r.url.endsWith('/api/config'));
    expect(configHits).toHaveLength(1);
  });

  it('a wrong token does not retry forever — one bootstrap attempt, then the 401 surfaces', async () => {
    enforce(true);
    const win = loadClient();
    const pending = win.fetch('/api/config');
    await submitPrompt(win, 'f'.repeat(64));
    const res = await pending;
    expect(res.status).toBe(401);
    expect(win.StudioAPI.state.authenticated).toBe(false);
    expect(studioAuth.store.size).toBe(0);
  });
});

describe('CSRF — the header lib/auth.js expects, on cookie-authenticated mutations', () => {
  // POST /api/__csrf-probe__ has no route handler. It therefore exercises the
  // real requireAuth() + checkCsrf() middleware and nothing else: a request
  // that clears CSRF falls through to 404, one that does not gets 403. No
  // side effects, no fixture, and it is the shipping middleware either way.
  const PROBE = '/api/__csrf-probe__';

  it('control: a cookie session WITHOUT the header is refused 403 csrf_token_missing', async () => {
    enforce(true);
    const boot = await fetch(origin + '/api/auth/bootstrap', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ROOT_TOKEN}` },
    });
    const cookie = boot.headers.get('set-cookie').split(';')[0];
    const res = await fetch(origin + PROBE, {
      method: 'POST',
      headers: { cookie, origin },
    });
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('csrf_token_missing');
  });

  it('the client clears CSRF on POST and reaches past the gate', async () => {
    enforce(true);
    const win = loadClient({ locationSearch: `?studio_token=${ROOT_TOKEN}` });
    const res = await win.fetch(PROBE, { method: 'POST' });
    expect(res.status).not.toBe(403);
    expect(res.status).toBe(404); // past auth + CSRF, no such route
  });

  it('every mutating verb clears the gate; safe verbs carry no CSRF header', async () => {
    enforce(true);
    const win = loadClient({ locationSearch: `?studio_token=${ROOT_TOKEN}` });
    await win.StudioAPI.ready();
    const before = win.__requests.length;

    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      const res = await win.fetch(PROBE, { method });
      // 403 here would mean the header was missing or wrong — the SERVER is the
      // judge, not an assertion about a value we chose.
      expect(`${method} ${res.status}`).toBe(`${method} 404`);
    }
    await win.fetch(PROBE);

    const sent = win.__requests.slice(before).filter((r) => r.url.endsWith(PROBE));
    const csrf = win.StudioAPI.csrfToken();
    expect(sent).toHaveLength(5);
    for (const r of sent.slice(0, 4)) {
      expect(r.headers.get(win.StudioAPI.CSRF_HEADER)).toBe(csrf);
      expect(r.credentials).toBe('same-origin');
    }
    expect(sent[4].method).toBe('GET');
    expect(sent[4].headers.get(win.StudioAPI.CSRF_HEADER)).toBeNull();
  });

  it('the CSRF token survives a reload (localStorage) so no re-prompt is needed', async () => {
    enforce(true);
    const first = loadClient({ locationSearch: `?studio_token=${ROOT_TOKEN}` });
    await first.StudioAPI.ready();
    const token = first.StudioAPI.csrfToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);

    // A reload is a fresh evaluation of the same file against the same cookie
    // jar and the same localStorage — and NO ?studio_token= this time.
    const reloaded = loadClient({ jar: first.__jar, store: first.__store });
    const res = await reloaded.fetch(PROBE, { method: 'POST' });
    expect(res.status).toBe(404);
    expect(reloaded.StudioAPI.csrfToken()).toBe(token);
    expect(reloaded.__doc.getElementById('studio-auth-prompt')).toBeNull();
  });
});

describe('403 reauth_required — the privileged surface prompts for elevation', () => {
  it('re-auths and retries once against a real privileged route', async () => {
    enforce(true);
    const win = loadClient({ locationSearch: `?studio_token=${ROOT_TOKEN}` });
    await win.StudioAPI.ready();
    expect(win.StudioAPI.state.scopes).not.toContain('privileged');

    // POST /api/new-site is in PRIVILEGED_API_ROUTES. With no body it will fail
    // validation AFTER the gate — which is the point: we assert we got PAST the
    // 403, not that a site was created. Nothing is written.
    const pending = win.fetch('/api/new-site', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    await submitPrompt(win, ROOT_TOKEN);
    const res = await pending;
    expect(res.status).not.toBe(403);
    expect(win.StudioAPI.state.scopes).toContain('privileged');
  });
});

describe('WebSocket upgrade carries the session cookie', () => {
  function upgrade(url, headers) {
    return new Promise((resolve) => {
      const ws = new WebSocketImpl(url, { headers });
      const done = (o) => { try { ws.close(); } catch { /* gone */ } resolve(o); };
      ws.on('open', () => done({ ok: true }));
      ws.on('error', (e) => done({ ok: false, message: String(e && e.message) }));
      setTimeout(() => done({ ok: false, message: 'timeout' }), 5000);
    });
  }

  it('control: an uncredentialed upgrade is refused 401', async () => {
    enforce(true);
    const r = await upgrade(origin.replace('http', 'ws'));
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/401/);
  });

  it('the cookie the client obtained opens the socket, with Origin matching Host', async () => {
    enforce(true);
    const win = loadClient({ locationSearch: `?studio_token=${ROOT_TOKEN}` });
    await win.StudioAPI.ready();
    const cookie = win.__jar.header();
    expect(cookie).toMatch(/studio_session=/);
    const wsUrl = win.StudioAPI.resolveWsUrl('ws://localhost:9999');
    const r = await upgrade(wsUrl, { cookie, origin });
    expect(r.ok).toBe(true);
  });

  it('a mismatched Origin is refused — proving the host rewrite is load-bearing', async () => {
    enforce(true);
    const win = loadClient({ locationSearch: `?studio_token=${ROOT_TOKEN}` });
    await win.StudioAPI.ready();
    const cookie = win.__jar.header();
    const r = await upgrade(origin.replace('http', 'ws'), { cookie, origin: 'http://localhost:3334' });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/403/);
  });

  it('openWebSocket() waits for the session before constructing the socket', async () => {
    enforce(true);
    const win = loadClient();
    const order = [];
    const p = win.StudioAPI.openWebSocket(origin.replace('http', 'ws')).then(
      () => order.push('socket'),
      () => order.push('socket'),
    );
    expect(await waitForPrompt(win)).toBe(true);
    order.push('prompt-shown');
    await submitPrompt(win, ROOT_TOKEN);
    await p;
    // The socket is constructed only AFTER the credential exists.
    expect(order).toEqual(['prompt-shown', 'socket']);
    expect(win.StudioAPI.state.authenticated).toBe(true);
  });
});

// ---------------------------------------------------------------------------

/**
 * THE SEAM'S ONE STRUCTURAL WEAKNESS.
 *
 * studio-api-client.js works by replacing `window.fetch`. That is what let 140
 * call sites stay untouched, but it buys the invariant that NOTHING may run
 * before it — a script that captures `fetch` first keeps the native one forever
 * and silently bypasses credentials, CSRF and the 401 path. Under
 * STUDIO_REQUIRE_AUTH enforced (the default) that is not a subtle degradation: those calls 401.
 *
 * The client's own header documents this as a known gap and says "the client is
 * therefore the FIRST <script> in every entry point". Nothing enforced it. A new
 * entry point, or one reordered import, breaks enforcement everywhere with a
 * fully green suite — so this asserts the invariant against the real files.
 *
 * Verified by mutation: moving the client below any other <script> in
 * public/index.html, or deleting the tag, fails this test.
 */
describe('load order — the seam must be installed before anything can capture fetch', () => {
  const PUBLIC_DIR = path.join(HERE, '..', 'public');
  const CLIENT_SRC = /studio-api-client\.js/;

  /** Every <script> tag in document order: { src|null, raw }. */
  function scriptTags(html) {
    const out = [];
    const re = /<script\b([^>]*)>/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      const attrs = m[1];
      const srcMatch = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(attrs);
      out.push({ src: srcMatch ? srcMatch[1] : null, raw: m[0] });
    }
    return out;
  }

  /**
   * Resolve a script src to a path under public/, or null.
   *
   * `pageRel` is the entry point's path RELATIVE to public/ (posix). A
   * root-absolute src ("/js/x.js") resolves against public/; a page-relative
   * src ("./x.js", "src/app.js") resolves against the page's own directory —
   * which is the only correct reading once entry points can live in
   * subdirectories.
   */
  function localPath(src, pageRel) {
    if (!src || /^https?:|^\/\//i.test(src)) return null;
    const clean = src.split('?')[0].split('#')[0];
    if (clean.startsWith('/')) return path.join(PUBLIC_DIR, clean.slice(1));
    const pageDir = path.dirname(path.join(PUBLIC_DIR, pageRel));
    const resolved = path.resolve(pageDir, clean);
    // Never follow a src that escapes public/.
    if (!resolved.startsWith(path.resolve(PUBLIC_DIR) + path.sep)) return null;
    return resolved;
  }

  /**
   * An entry point matters if IT, or any local script it loads, can reach /api.
   * Derived from the files — not a hand-maintained list that would go stale the
   * moment someone adds a page.
   */
  function touchesApi(html, pageRel) {
    if (html.includes('/api')) return true;
    return scriptTags(html).some((t) => {
      const p = localPath(t.src, pageRel);
      if (!p || !fs.existsSync(p)) return false;
      try { return fs.readFileSync(p, 'utf8').includes('/api'); } catch { return false; }
    });
  }

  /**
   * Directories deliberately NOT scanned:
   *   node_modules — third-party packages. Their HTML is never served as one of
   *                  our entry points and we do not control its script order.
   *   vendor / vendored / third_party — the conventional names for checked-in
   *                  copies of other people's code, same reasoning.
   * Everything else under public/ IS scanned. This used to be a single
   * non-recursive readdirSync, which meant an unseamed page anywhere below the
   * top level (public/studio/ is a populated subtree) passed silently.
   */
  const SKIP_DIRS = new Set(['node_modules', 'vendor', 'vendored', 'third_party']);

  /** Every .html under public/, recursively, as posix paths relative to public/. */
  function walkHtml(dir = PUBLIC_DIR, rel = '', acc = { files: [], dirs: [] }) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const childRel = rel ? `${rel}/${ent.name}` : ent.name;
      if (ent.isDirectory()) {
        if (SKIP_DIRS.has(ent.name) || ent.name.startsWith('.')) continue;
        acc.dirs.push(childRel);
        walkHtml(path.join(dir, ent.name), childRel, acc);
      } else if (ent.isFile() && ent.name.toLowerCase().endsWith('.html')) {
        acc.files.push(childRel);
      }
    }
    return acc;
  }

  const scan = walkHtml();
  const entryPoints = scan.files
    .map((rel) => ({ file: rel, html: fs.readFileSync(path.join(PUBLIC_DIR, rel), 'utf8') }))
    .filter((e) => touchesApi(e.html, e.file));

  it('found the real entry points to check (guards against an empty-set pass)', () => {
    // If this ever drops to zero the assertions below become vacuous, which is
    // exactly the way a structural test rots into a no-op.
    expect(entryPoints.length).toBeGreaterThanOrEqual(4);
    const names = entryPoints.map((e) => e.file);
    expect(names).toEqual(expect.arrayContaining([
      'index.html', 'operator.html', 'studio.html', 'workbench-foundation.html',
    ]));
  });

  it('the scan is RECURSIVE — subdirectories of public/ are actually descended into', () => {
    // There happen to be no nested .html files today, so the enumeration above
    // cannot by itself prove recursion. This asserts the walk reached the
    // subtrees, so reverting to a flat readdirSync fails here rather than
    // silently un-enforcing the invariant for every future nested page.
    expect(scan.dirs, 'public/ has subdirectories but the walk never entered one').toEqual(
      expect.arrayContaining(['studio', 'studio/src', 'js', 'css']),
    );
  });

  it.each(entryPoints.map((e) => e.file))(
    '%s loads studio-api-client.js as its very first script',
    (file) => {
      const html = entryPoints.find((e) => e.file === file).html;
      const tags = scriptTags(html);
      const idx = tags.findIndex((t) => t.src && CLIENT_SRC.test(t.src));
      expect(idx, `${file} never loads studio-api-client.js — every /api call in it bypasses the seam`).toBeGreaterThanOrEqual(0);
      expect(idx, `${file} runs ${tags[0] && (tags[0].src || 'an inline script')} before the seam is installed`).toBe(0);
    },
  );

  it.each(entryPoints.map((e) => e.file))(
    '%s loads the seam synchronously (no defer/async — both run too late)',
    (file) => {
      const html = entryPoints.find((e) => e.file === file).html;
      const tag = scriptTags(html).find((t) => t.src && CLIENT_SRC.test(t.src));
      // `defer` and `async` would both let earlier-parsed inline scripts and
      // classic scripts capture the native fetch first.
      expect(tag.raw).not.toMatch(/\bdefer\b/i);
      expect(tag.raw).not.toMatch(/\basync\b/i);
    },
  );

  it('the shipped client really is a window.fetch replacement (the reason order matters)', () => {
    const source = fs.readFileSync(CLIENT_PATH, 'utf8');
    expect(source).toMatch(/global\.fetch\s*=\s*function/);
    expect(source).toMatch(/global\.WebSocket\s*=\s*StudioWebSocket/);
  });
});
