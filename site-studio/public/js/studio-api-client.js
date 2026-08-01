/**
 * studio-api-client.js — Phase 4. The ONE credentialed seam for the browser.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * lib/auth.js is wired into server.js, but enforcement defaults OFF behind
 * STUDIO_REQUIRE_AUTH=1 for exactly one reason: the browser sent no
 * credentials, so turning the flag on broke the Studio UI completely. This
 * file is the thing that lets the flag be flipped.
 *
 * A full inventory of every network call site in public/ lives at
 * runtime-vnext/reports/frontend-api-calls.md — 140 fetch call sites and one
 * WebSocket, spread across unbundled <script> files with no module graph.
 * Threading credentials through 140 call sites would be drift on day one, so
 * this installs ONE seam:
 *
 *   window.fetch      -> wrapped. Same-origin /api/** goes through apiFetch();
 *                        everything else is handed to the native fetch
 *                        untouched (CDN scripts, the preview server, static
 *                        data files).
 *   window.WebSocket  -> wrapped. Loopback ws:// URLs are rewritten onto
 *                        location.host so the session cookie is in scope and
 *                        the Origin header matches Host (lib/auth.js rejects a
 *                        cookie-authenticated upgrade whose Origin host does
 *                        not equal the Host it was sent to).
 *
 * Having one seam is also what makes 401 handling, re-auth and the CSRF header
 * possible in one place instead of 140.
 *
 * THE CREDENTIAL MODEL (see lib/auth.js for the authority)
 * --------------------------------------------------------
 * The root token is 32 random bytes at ~/.config/famtastic/studio-token. A
 * browser must NOT hold it in JS-reachable storage, so it is exchanged ONCE at
 * POST /api/auth/bootstrap for an HttpOnly session cookie. The bootstrap
 * response carries a CSRF token, which this client echoes in the
 * `x-studio-csrf` header on every cookie-authenticated mutating request
 * (POST/PUT/PATCH/DELETE). The CSRF token is NOT a bearer credential — it is
 * the read half of a double-submit pair whose write half is an HttpOnly
 * cookie — so it is kept in localStorage to survive a reload. The root token
 * is never stored anywhere by this file.
 *
 * The dangerous surface (bridge exec, codex exec, settings writes, lifecycle,
 * the PTY) additionally requires the `privileged` scope, which a session gets
 * only by re-presenting the root token at POST /api/auth/elevate. The server
 * answers 403 `reauth_required`; this client turns that into a re-auth prompt
 * and retries the request ONCE.
 *
 * WHERE THE ROOT TOKEN COMES FROM, IN ORDER
 *   1. window.__STUDIO_ROOT_TOKEN__            (test harnesses / automation)
 *   2. ?studio_token=... on the URL            (stripped immediately via
 *                                               history.replaceState so it does
 *                                               not linger in history)
 *   3. StudioAPI.setRootToken(t)               (programmatic, resolves a
 *                                               pending prompt)
 *   4. an operator prompt                      (paste the contents of
 *                                               ~/.config/famtastic/studio-token)
 *
 * ENFORCEMENT OFF IS A NO-OP PATH. When GET /api/auth/status reports
 * `enforced: false` this client never prompts, never bootstraps, and never
 * adds a CSRF header it does not have. Requests go out exactly as they did
 * before, with the same-origin cookie behaviour fetch already had.
 */
(function (global) {
  'use strict';

  if (global.StudioAPI && global.StudioAPI.__installed) return;

  var NATIVE_FETCH = global.fetch ? global.fetch.bind(global) : null;
  var NativeWebSocket = global.WebSocket;

  var CSRF_HEADER = 'x-studio-csrf';
  var CSRF_STORAGE_KEY = 'studio.csrfToken';
  var MUTATING = { POST: true, PUT: true, PATCH: true, DELETE: true };

  // How long an auth/elevation overlay waits for a human before giving up.
  // Long enough that a present operator is never rushed; finite so that an
  // unattended privileged call fails instead of hanging its promise forever.
  var PROMPT_TIMEOUT_MS = 5 * 60 * 1000;

  // /api routes that must NEVER be recursed into by the auth machinery.
  var AUTH_ROUTES = /^\/api\/auth\/(status|bootstrap|elevate|logout)\/?$/;

  var state = {
    enforced: null,        // null = not probed yet
    authenticated: false,
    kind: null,
    scopes: [],
    csrfToken: null,
    lastError: null,
  };

  // ---------------------------------------------------------------- storage --

  function readStoredCsrf() {
    try { return global.localStorage && global.localStorage.getItem(CSRF_STORAGE_KEY); }
    catch (e) { return null; }
  }
  function writeStoredCsrf(value) {
    try {
      if (!global.localStorage) return;
      if (value) global.localStorage.setItem(CSRF_STORAGE_KEY, value);
      else global.localStorage.removeItem(CSRF_STORAGE_KEY);
    } catch (e) { /* private mode / no storage — in-memory is enough */ }
  }
  state.csrfToken = readStoredCsrf();

  // ------------------------------------------------------------------- urls --

  function baseHref() {
    if (global.location && global.location.href) return global.location.href;
    return 'http://localhost/';
  }

  /** Resolve any fetch() first argument to an absolute URL string, or null. */
  function resolveUrl(input) {
    try {
      if (typeof input === 'string') return new URL(input, baseHref()).href;
      if (input && typeof input.url === 'string') return new URL(input.url, baseHref()).href; // Request
      if (input && typeof input.href === 'string') return new URL(input.href, baseHref()).href; // URL
    } catch (e) { /* fall through */ }
    return null;
  }

  /**
   * True only for SAME-ORIGIN /api/** . Cross-origin calls and the preview
   * server are deliberately left alone: sending Studio credentials to another
   * origin would be a credential leak, not a fix.
   */
  function isStudioApiUrl(absolute) {
    if (!absolute) return false;
    var u;
    try { u = new URL(absolute); } catch (e) { return false; }
    var origin = (global.location && global.location.origin) || null;
    if (origin && u.origin !== origin) return false;
    return u.pathname === '/api' || u.pathname.indexOf('/api/') === 0;
  }

  function pathOf(absolute) {
    try { return new URL(absolute).pathname; } catch (e) { return ''; }
  }

  function methodOf(input, init) {
    var m = (init && init.method) || (input && input.method) || 'GET';
    return String(m).toUpperCase();
  }

  /**
   * Rewrite a loopback WebSocket URL onto the page's own host.
   *
   * `ws://localhost:3334` from a page served at `http://127.0.0.1:3334` is a
   * DIFFERENT origin as far as cookies and the Origin header are concerned:
   * the session cookie is not attached and lib/auth.js answers 403
   * csrf_origin_mismatch. Same-host rewriting fixes both, and is a no-op when
   * the page is already on the same host.
   */
  function resolveWsUrl(url) {
    var loc = global.location;
    if (!loc || !loc.host) return url;
    var parsed;
    try { parsed = new URL(String(url), baseHref().replace(/^http/, 'ws')); }
    catch (e) { return url; }
    if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') return url;
    var LOOPBACK = { 'localhost': 1, '127.0.0.1': 1, '[::1]': 1, '::1': 1 };
    if (!LOOPBACK[parsed.hostname]) return url;
    // Only adopt the page's host when the page itself is on loopback — this is
    // a local single-operator tool, and we must not redirect a socket somewhere
    // the author did not mean.
    if (!LOOPBACK[loc.hostname]) return url;
    parsed.protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    parsed.host = loc.host;
    return parsed.href;
  }

  // ------------------------------------------------------------ raw requests --

  function rawFetch(input, init) {
    if (!NATIVE_FETCH) return Promise.reject(new Error('fetch is unavailable'));
    return NATIVE_FETCH(input, init);
  }

  function jsonOrNull(res) {
    return res.json().then(function (j) { return j; }, function () { return null; });
  }

  /** GET /api/auth/status — cheap, never rejects, always updates state. */
  function refreshStatus() {
    return rawFetch('/api/auth/status', { credentials: 'same-origin' })
      .then(jsonOrNull)
      .then(function (body) {
        if (!body) return state;
        state.enforced = Boolean(body.enforced);
        state.authenticated = Boolean(body.authenticated);
        state.kind = body.kind || null;
        state.scopes = Array.isArray(body.scopes) ? body.scopes : [];
        // Adopt a server-supplied CSRF token whenever one is offered. The server
        // returns it only to a valid session, and having it here means a client
        // that never bootstrapped in this tab still ends up able to mutate.
        if (body.csrfToken) {
          state.csrfToken = body.csrfToken;
          writeStoredCsrf(state.csrfToken);
        }
        return state;
      })
      .catch(function () { return state; });
  }

  /**
   * Recover a usable CSRF token for an ALREADY-VALID session.
   *
   * Single-flight: a burst of mutations that all 403 must produce one recovery
   * request, not one per call. Resolves true only if a token was actually
   * obtained, so the caller can return an honest 403 rather than retrying into
   * a wall.
   */
  var _csrfRefresh = null;
  function refreshCsrfToken() {
    if (_csrfRefresh) return _csrfRefresh;
    var before = state.csrfToken;
    _csrfRefresh = refreshStatus()
      .then(function () {
        return Boolean(state.csrfToken) && state.csrfToken !== before;
      })
      .catch(function () { return false; })
      .then(function (ok) { _csrfRefresh = null; return ok; });
    return _csrfRefresh;
  }

  /** POST /api/auth/bootstrap — root token in, HttpOnly session cookie out. */
  function bootstrap(token) {
    if (!token) return Promise.resolve({ ok: false, code: 'no_token' });
    return rawFetch('/api/auth/bootstrap', {
      method: 'POST',
      credentials: 'same-origin',
      // The token goes in the Authorization header, never in the URL and never
      // in a body that some proxy or log might keep.
      headers: { 'Authorization': 'Bearer ' + token },
    }).then(function (res) {
      return jsonOrNull(res).then(function (body) {
        if (!res.ok || !body || !body.ok) {
          state.lastError = (body && body.code) || ('http_' + res.status);
          return { ok: false, code: state.lastError };
        }
        state.csrfToken = body.csrfToken || null;
        writeStoredCsrf(state.csrfToken);
        state.authenticated = true;
        state.kind = 'session';
        state.scopes = ['operator'];
        state.enforced = typeof body.enforced === 'boolean' ? body.enforced : state.enforced;
        state.lastError = null;
        readyExhausted = false;   // a fresh credential re-arms the ready path
        return { ok: true, expiresAt: body.expiresAt };
      });
    }).catch(function (err) {
      state.lastError = String(err && err.message || err);
      return { ok: false, code: 'network_error' };
    });
  }

  /** POST /api/auth/elevate — re-present the root token for `privileged`. */
  function elevate(token) {
    if (!token) return Promise.resolve({ ok: false, code: 'no_token' });
    return rawFetch('/api/auth/elevate', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Authorization': 'Bearer ' + token },
    }).then(function (res) {
      return jsonOrNull(res).then(function (body) {
        if (!res.ok || !body || !body.ok) return { ok: false, code: (body && body.code) || ('http_' + res.status) };
        if (state.scopes.indexOf('privileged') < 0) state.scopes = state.scopes.concat(['privileged']);
        return { ok: true, privilegedUntil: body.privilegedUntil };
      });
    }).catch(function () { return { ok: false, code: 'network_error' }; });
  }

  function logout() {
    return rawFetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
      .then(jsonOrNull)
      .then(function (body) {
        state.authenticated = false;
        state.kind = null;
        state.scopes = [];
        state.csrfToken = null;
        writeStoredCsrf(null);
        return body || { ok: true };
      });
  }

  // ------------------------------------------------------------ token supply --

  var pendingTokenResolve = null;

  /** Pull ?studio_token=... off the URL and scrub it out of history. */
  function takeTokenFromLocation() {
    var loc = global.location;
    if (!loc || typeof loc.search !== 'string' || loc.search.indexOf('studio_token') < 0) return null;
    var token = null;
    try {
      var params = new URLSearchParams(loc.search);
      token = params.get('studio_token');
      if (token) {
        params.delete('studio_token');
        var q = params.toString();
        var next = loc.pathname + (q ? '?' + q : '') + (loc.hash || '');
        if (global.history && global.history.replaceState) global.history.replaceState(null, '', next);
      }
    } catch (e) { /* leave the URL alone if anything is odd */ }
    return token || null;
  }

  // Taken out of the URL at install, so it is scrubbed before any page script
  // can read location.search.
  var urlToken = takeTokenFromLocation();

  /**
   * ONE-SHOT. `?studio_token=` is a bootstrap convenience, not a credential
   * store: it is handed out exactly once and then forgotten, so the root token
   * does not sit in a JS-reachable variable for the life of the page. Elevation
   * therefore asks the operator again — which is precisely what lib/auth.js's
   * `elevate()` re-auth window is for.
   *
   * `__STUDIO_ROOT_TOKEN__` is different: a harness that sets it has chosen to
   * keep the token reachable, and clearing it behind their back would be
   * surprising. It is not set by anything the Studio ships.
   */
  function ambientToken() {
    if (typeof global.__STUDIO_ROOT_TOKEN__ === 'string' && global.__STUDIO_ROOT_TOKEN__) {
      return global.__STUDIO_ROOT_TOKEN__;
    }
    var once = urlToken;
    urlToken = null;
    return once;
  }

  /**
   * Minimal, dependency-free re-auth prompt. Deliberately built from raw DOM
   * rather than the Studio's own markup: it has to work when every /api call on
   * the page is failing, which includes the ones that render the shell.
   */
  /**
   * @param {string} message
   * @param {object} [opts]
   * @param {number} [opts.timeoutMs] settle with null if nobody responds.
   *
   * WHY THERE IS A TIMEOUT AT ALL. This promise used to settle only on submit or
   * cancel, so a privileged call made with NOBODY AT THE KEYBOARD never settled
   * — and neither did the fetch() that triggered it. Observed during review: an
   * unattended run sat blocked for over eight minutes on a single privileged
   * request and had to be SIGKILLed. Any background poller, retry timer or
   * automation that touches a privileged route parks a pending promise
   * indefinitely, holding whatever it owns.
   *
   * A timeout converts "hangs forever, invisibly" into "fails, visibly" — which
   * is the direction this project keeps having to correct toward. An operator
   * who IS present is unaffected: the overlay stays up for the full window, and
   * the failure is a normal 403 they can retry.
   */
  function promptForToken(message, opts) {
    var doc = global.document;
    if (!doc || !doc.body) return Promise.resolve(null);

    var timeoutMs = (opts && typeof opts.timeoutMs === 'number')
      ? opts.timeoutMs
      : PROMPT_TIMEOUT_MS;

    return new Promise(function (settle) {
      var timer = null;
      var done = false;
      // Every exit path below calls `resolve`; this wrapper makes each of them
      // idempotent, clears the timer, and removes the overlay exactly once.
      var resolve = function (value) {
        if (done) return;
        done = true;
        if (timer) { clearTimeout(timer); timer = null; }
        var node = doc.getElementById('studio-auth-prompt');
        if (node && node.parentNode) node.parentNode.removeChild(node);
        settle(value);
      };
      if (timeoutMs > 0 && typeof setTimeout === 'function') {
        timer = setTimeout(function () { resolve(null); }, timeoutMs);
        if (timer && typeof timer.unref === 'function') timer.unref();
      }
      var existing = doc.getElementById('studio-auth-prompt');
      if (existing) existing.parentNode.removeChild(existing);

      var overlay = doc.createElement('div');
      overlay.id = 'studio-auth-prompt';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', 'Studio authentication');
      overlay.style.cssText = [
        'position:fixed', 'inset:0', 'z-index:2147483647',
        'display:flex', 'align-items:center', 'justify-content:center',
        'background:rgba(8,10,14,0.82)',
        'font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      ].join(';');

      var card = doc.createElement('form');
      card.style.cssText = [
        'background:#14181f', 'color:#e8ecf3', 'padding:24px',
        'border-radius:12px', 'width:min(440px,90vw)',
        'box-shadow:0 24px 60px rgba(0,0,0,0.55)', 'border:1px solid #2a313d',
      ].join(';');

      var title = doc.createElement('div');
      title.textContent = 'Studio authentication required';
      title.style.cssText = 'font-size:16px;font-weight:600;margin-bottom:8px';

      var body = doc.createElement('div');
      body.textContent = message || 'Paste the operator token to continue.';
      body.style.cssText = 'margin-bottom:6px;opacity:0.85';

      var hint = doc.createElement('div');
      hint.textContent = 'cat ~/.config/famtastic/studio-token';
      hint.style.cssText = 'margin-bottom:14px;opacity:0.6;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px';

      var input = doc.createElement('input');
      input.type = 'password';
      input.id = 'studio-auth-token';
      input.autocomplete = 'off';
      input.setAttribute('aria-label', 'Operator token');
      input.placeholder = '64 hex characters';
      input.style.cssText = [
        'width:100%', 'box-sizing:border-box', 'padding:10px 12px',
        'border-radius:8px', 'border:1px solid #333c4a', 'background:#0d1117',
        'color:#e8ecf3', 'font-family:ui-monospace,SFMono-Regular,Menlo,monospace',
      ].join(';');

      var row = doc.createElement('div');
      row.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:16px';

      var cancel = doc.createElement('button');
      cancel.type = 'button';
      cancel.id = 'studio-auth-cancel';
      cancel.textContent = 'Cancel';
      cancel.style.cssText = 'padding:9px 14px;border-radius:8px;border:1px solid #333c4a;background:transparent;color:#aab3c0;cursor:pointer';

      var submit = doc.createElement('button');
      submit.type = 'submit';
      submit.id = 'studio-auth-submit';
      submit.textContent = 'Authenticate';
      submit.style.cssText = 'padding:9px 14px;border-radius:8px;border:0;background:#3b82f6;color:#fff;font-weight:600;cursor:pointer';

      row.appendChild(cancel);
      row.appendChild(submit);
      card.appendChild(title);
      card.appendChild(body);
      card.appendChild(hint);
      card.appendChild(input);
      card.appendChild(row);
      overlay.appendChild(card);
      doc.body.appendChild(overlay);
      try { input.focus(); } catch (e) { /* headless */ }

      var settled = false;
      function finish(value) {
        if (settled) return;
        settled = true;
        pendingTokenResolve = null;
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        resolve(value);
      }
      // setRootToken() can satisfy this prompt without any typing — that is the
      // automation path, and it is the SAME path the UI takes.
      pendingTokenResolve = finish;

      card.addEventListener('submit', function (ev) {
        if (ev && ev.preventDefault) ev.preventDefault();
        finish(String(input.value || '').trim() || null);
      });
      cancel.addEventListener('click', function () { finish(null); });
    });
  }

  function obtainToken(message, interactive) {
    var ambient = ambientToken();
    if (ambient) return Promise.resolve(ambient);
    if (!interactive) return Promise.resolve(null);
    return promptForToken(message);
  }

  // ------------------------------------------------------------- auth gating --

  var readyPromise = null;
  var readyExhausted = false;   // an INTERACTIVE attempt already came back empty
  var readyRetry = null;        // single-flight guard for the interactive retry
  var reauthInFlight = null;

  var SATISFIED = function (st) { return !st.enforced || st.authenticated; };

  function runReady(interactive) {
    return refreshStatus().then(function (st) {
      if (SATISFIED(st)) return st;         // no-op path — identical to before
      return obtainToken('Studio requires authentication. Paste the operator token to continue.', interactive)
        .then(function (token) {
          if (!token) {
            if (interactive) readyExhausted = true;
            return state;
          }
          return bootstrap(token).then(function (r) {
            if (!r.ok && interactive) readyExhausted = true;
            return state;
          });
        });
    });
  }

  /**
   * Probe status, and bootstrap a session if enforcement is on and we do not
   * have one. Resolves to the live `state` object. Every /api request and every
   * WebSocket waits on this, so nothing races the bootstrap.
   *
   * The cached promise is NOT the whole story: the install-time attempt is
   * deliberately non-interactive, so it can resolve unsatisfied. A later caller
   * that IS allowed to prompt gets exactly one more attempt — and
   * `readyExhausted` stops that from becoming a prompt-on-every-request loop
   * when the operator cancels.
   */
  function ensureReady(options) {
    var interactive = !options || options.interactive !== false;
    if (!readyPromise) readyPromise = runReady(interactive);
    return readyPromise.then(function (st) {
      if (SATISFIED(st) || !interactive || readyExhausted) return st;
      // SINGLE-FLIGHT. The Studio fires a dozen /api calls on load; without
      // this each one starts its own runReady, each opens a prompt, each
      // overlay removes the previous one — and every promise but the last
      // never settles. That is the hang this guard exists to prevent.
      if (!readyRetry) {
        readyRetry = runReady(true).then(
          function (s) { readyRetry = null; return s; },
          function (e) { readyRetry = null; throw e; },
        );
        readyPromise = readyRetry;
      }
      return readyRetry;
    });
  }

  /**
   * A 401 arrived on a request we thought was authenticated. Get a token and
   * re-bootstrap ONCE. Single-flight: a burst of concurrent 401s (the Studio
   * fires a dozen /api calls on load) produces exactly one prompt, and a failed
   * re-auth does not re-arm itself — the caller retries at most once, so there
   * is no retry loop.
   */
  function reauthenticate(message) {
    if (reauthInFlight) return reauthInFlight;
    state.authenticated = false;
    state.csrfToken = null;
    writeStoredCsrf(null);
    reauthInFlight = obtainToken(message || 'Studio session expired. Paste the operator token to continue.', true)
      .then(function (token) {
        if (!token) return { ok: false, code: 'cancelled' };
        return bootstrap(token);
      })
      .then(function (result) {
        reauthInFlight = null;
        return result;
      })
      .catch(function (err) {
        reauthInFlight = null;
        return { ok: false, code: String(err && err.message || err) };
      });
    return reauthInFlight;
  }

  var elevateInFlight = null;

  /** 403 reauth_required: open the privileged window, single-flight. */
  function requestElevation() {
    if (elevateInFlight) return elevateInFlight;
    elevateInFlight = obtainToken('This action needs the operator token again. Paste it to continue.', true)
      .then(function (token) {
        if (!token) return { ok: false, code: 'cancelled' };
        return elevate(token);
      })
      .then(function (r) { elevateInFlight = null; return r; })
      .catch(function (e) { elevateInFlight = null; return { ok: false, code: String(e && e.message || e) }; });
    return elevateInFlight;
  }

  // ------------------------------------------------------------- the wrapper --

  function withCredentials(input, init, method) {
    var next = {};
    var key;
    if (init) for (key in init) if (Object.prototype.hasOwnProperty.call(init, key)) next[key] = init[key];
    if (!next.credentials) next.credentials = 'same-origin';

    // Only add the CSRF header on a mutating request, and only when we hold a
    // token. lib/auth.js exempts bearer callers; a browser is always a cookie
    // caller, so an absent token here means the request WILL be refused — which
    // surfaces as a 403 and a re-auth prompt rather than a silent failure.
    if (MUTATING[method] && state.csrfToken) {
      var headers;
      try {
        headers = new Headers((init && init.headers) || (input && input.headers) || {});
        headers.set(CSRF_HEADER, state.csrfToken);
        next.headers = headers;
      } catch (e) {
        // No Headers constructor (non-browser harness): merge as a plain object.
        var plain = {};
        var src = (init && init.headers) || {};
        for (key in src) if (Object.prototype.hasOwnProperty.call(src, key)) plain[key] = src[key];
        plain[CSRF_HEADER] = state.csrfToken;
        next.headers = plain;
      }
    }
    return next;
  }

  function codeOf(res) {
    // Reading the body must not consume it for the caller.
    var clone;
    try { clone = res.clone(); } catch (e) { return Promise.resolve(null); }
    return jsonOrNull(clone).then(function (body) { return (body && body.code) || null; });
  }

  /**
   * The seam. Every same-origin /api request in public/ lands here.
   */
  function apiFetch(input, init) {
    var absolute = resolveUrl(input);
    var apiPath = pathOf(absolute);
    var method = methodOf(input, init);

    // The auth endpoints themselves must never recurse through the gate.
    if (AUTH_ROUTES.test(apiPath)) return rawFetch(input, withCredentials(input, init, method));

    return ensureReady().then(function (st) {
      // Did we go into this request believing we held a credential? If the
      // ready path just asked for a token and came back empty, a 401 here is
      // the SAME failure — prompting again would be a second dialog for one
      // problem. Surface it instead.
      var credentialed = SATISFIED(st);
      return rawFetch(input, withCredentials(input, init, method)).then(function (res) {
        if (res.status !== 401 && res.status !== 403) return res;
        return codeOf(res).then(function (code) {
          if (res.status === 401) {
            if (!credentialed) return res;
            var msg = code === 'invalid_session'
              ? 'Studio session expired. Paste the operator token to continue.'
              : 'Studio requires authentication. Paste the operator token to continue.';
            return reauthenticate(msg).then(function (r) {
              if (!r || !r.ok) return res;   // honest failure — no retry loop
              return rawFetch(input, withCredentials(input, init, method));
            });
          }
          // A missing or stale CSRF token is RECOVERABLE and must not be
          // swallowed. Returning a bare 403 here wedges the tab: every
          // subsequent mutation 403s forever and only a manual reload recovers,
          // with no signal to the user that anything is wrong.
          //
          // This is reachable without any exotic setup. Observed live: opening a
          // page with ?studio_token= while a valid session cookie from an earlier
          // page is still present makes refreshStatus() report authenticated,
          // which satisfies ensureReady(), so the client never bootstraps and
          // therefore never obtains a csrfToken. Also reached by a second tab
          // after a re-bootstrap elsewhere (stale token -> csrf_token_mismatch),
          // by cleared site data with a live cookie, and by partitioned or
          // blocked localStorage — which matters because this Studio ships
          // embedded (studio-embedded-init.js / studio-embedded-bridge.js).
          //
          // Recovery is a fresh bootstrap, not a re-auth prompt: the session is
          // valid, only the CSRF token is absent or stale. Single-flight and
          // retried ONCE, so a genuinely rejecting server yields an honest 403
          // rather than a retry storm against a wall.
          if (code === 'csrf_token_missing' || code === 'csrf_token_mismatch') {
            if (init && init.__studioCsrfRetried) return res;
            return refreshCsrfToken().then(function (ok) {
              if (!ok) return res;
              var retryInit = withCredentials(input, init, method);
              retryInit.__studioCsrfRetried = true;
              return rawFetch(input, retryInit);
            });
          }
          if (code !== 'reauth_required') return res;  // a real 403, not a scope gap
          return requestElevation().then(function (r) {
            if (!r || !r.ok) return res;
            return rawFetch(input, withCredentials(input, init, method));
          });
        });
      });
    });
  }

  // --------------------------------------------------------------- websocket --

  /**
   * Open the Studio WebSocket with credentials present at UPGRADE.
   *
   * Browsers cannot set headers on a WebSocket, so the cookie IS the browser
   * credential — which is exactly the scheme lib/auth.js documents
   * (authenticateUpgrade -> authenticateHeaders -> session cookie, plus a
   * same-origin Origin check). No second scheme is invented here. All this
   * function has to guarantee is that (a) the cookie exists before the socket
   * is constructed, and (b) the socket URL is on the page's own origin so the
   * cookie is in scope and Origin matches Host.
   */
  function openWebSocket(url, protocols) {
    return ensureReady().then(function () {
      var target = resolveWsUrl(url);
      return protocols === undefined ? new NativeWebSocket(target) : new NativeWebSocket(target, protocols);
    });
  }

  // ----------------------------------------------------------------- install --

  var StudioAPI = {
    __installed: true,
    CSRF_HEADER: CSRF_HEADER,
    state: state,
    // seam
    apiFetch: apiFetch,
    rawFetch: rawFetch,
    isStudioApiUrl: isStudioApiUrl,
    resolveUrl: resolveUrl,
    resolveWsUrl: resolveWsUrl,
    openWebSocket: openWebSocket,
    // auth
    ready: function (options) { return ensureReady(options); },
    refreshStatus: refreshStatus,
    bootstrap: bootstrap,
    elevate: elevate,
    logout: logout,
    reauthenticate: reauthenticate,
    requestElevation: requestElevation,
    csrfToken: function () { return state.csrfToken; },
    /**
     * Supply the root token programmatically. If a prompt is open it is
     * satisfied immediately — automation and the operator take the same code
     * path, so the tested path is the shipping path.
     */
    setRootToken: function (token) {
      global.__STUDIO_ROOT_TOKEN__ = token;
      if (pendingTokenResolve) pendingTokenResolve(token);
      return token;
    },
    /** Test-only: forget the cached ready() decision. */
    _resetForTests: function () {
      readyPromise = null;
      readyRetry = null;
      readyExhausted = false;
      reauthInFlight = null;
      elevateInFlight = null;
      state.enforced = null;
      state.authenticated = false;
      state.scopes = [];
      state.kind = null;
    },
  };

  global.StudioAPI = StudioAPI;

  if (NATIVE_FETCH) {
    global.fetch = function studioCredentialedFetch(input, init) {
      var absolute = resolveUrl(input);
      if (!isStudioApiUrl(absolute)) return NATIVE_FETCH(input, init);
      return apiFetch(input, init);
    };
    global.fetch.__studioSeam = true;
  }

  if (NativeWebSocket) {
    function StudioWebSocket(url, protocols) {
      var target = resolveWsUrl(url);
      return protocols === undefined ? new NativeWebSocket(target) : new NativeWebSocket(target, protocols);
    }
    StudioWebSocket.prototype = NativeWebSocket.prototype;
    StudioWebSocket.CONNECTING = NativeWebSocket.CONNECTING;
    StudioWebSocket.OPEN = NativeWebSocket.OPEN;
    StudioWebSocket.CLOSING = NativeWebSocket.CLOSING;
    StudioWebSocket.CLOSED = NativeWebSocket.CLOSED;
    StudioWebSocket.__studioSeam = true;
    StudioAPI.NativeWebSocket = NativeWebSocket;
    global.WebSocket = StudioWebSocket;
  }

  // Kick the status probe immediately so the first /api call does not pay for
  // it. NON-INTERACTIVE: a page loaded without enforcement must never see a
  // prompt at install time. With enforcement on, an ambient token (?studio_token=
  // or __STUDIO_ROOT_TOKEN__) bootstraps silently right here; without one the
  // prompt is raised by the first real /api request's 401, which is the same
  // path a mid-session expiry takes.
  if (NATIVE_FETCH && global.document) {
    ensureReady({ interactive: false });
  }
})(typeof window !== 'undefined' ? window : globalThis);
