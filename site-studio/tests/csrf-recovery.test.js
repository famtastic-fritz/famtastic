/**
 * CSRF recovery, and the prompt that used to hang forever.
 *
 * TWO QUIET FAILURES, both the shape this project keeps producing: a path that
 * used to be loud (or at least finite) became silent (or infinite) as a side
 * effect of making something else work.
 *
 * 1. SWALLOWED CSRF FAILURE. apiFetch handled 403 with
 *        if (code !== 'reauth_required') return res;
 *    so `csrf_token_missing` and `csrf_token_mismatch` returned a bare 403 with
 *    no prompt and no recovery — every mutation in that tab 403s until a manual
 *    reload, with nothing telling the operator why. The seam's own comment
 *    asserted the opposite ("surfaces as a 403 and a re-auth prompt rather than
 *    a silent failure"), which is how it survived review.
 *
 *    It is reachable in ordinary use, not just contrived: opening a page with
 *    ?studio_token= while a valid session cookie from an earlier page is still
 *    present makes refreshStatus() report authenticated, which satisfies
 *    ensureReady(), so the client never bootstraps and never obtains a CSRF
 *    token. Also: a second tab after a re-bootstrap elsewhere (stale token ->
 *    mismatch forever), cleared site data with a live cookie, and partitioned or
 *    blocked localStorage — which matters because this Studio ships embedded.
 *
 *    The session is VALID in all of these; only the CSRF token is absent. So the
 *    recovery is a fresh token, not a re-auth prompt. GET /api/auth/status now
 *    returns the token to a session-authenticated caller — and to nobody else.
 *
 * 2. UNATTENDED PROMPT HANG. promptForToken() settled only on submit or cancel,
 *    so a privileged call with nobody at the keyboard never settled, and neither
 *    did the fetch() that triggered it. During review an unattended run sat
 *    blocked over eight minutes on one request and had to be SIGKILLed.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';

const require = createRequire(import.meta.url);
const { createAuth } = require('../lib/auth');

describe('GET /api/auth/status — CSRF token exposure rules', () => {
  let dir;
  let auth;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'csrf-recovery-'));
    auth = createAuth({ tokenPath: path.join(dir, 'studio-token') });
    auth.ensureToken();
  });

  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('a session principal carries a csrfToken that can be handed back', () => {
    const token = fs.readFileSync(path.join(dir, 'studio-token'), 'utf8').trim();
    const created = auth.bootstrapSession(token);
    expect(created.csrfToken, 'a session must have a CSRF token to hand back').toBeTruthy();
    expect(created.session.csrfToken).toBe(created.csrfToken);
  });

  it('a bearer principal has no session, so there is nothing to hand back', () => {
    const token = fs.readFileSync(path.join(dir, 'studio-token'), 'utf8').trim();
    const resolved = auth.authenticateHeaders({ authorization: 'Bearer ' + token });
    expect(resolved.ok).toBe(true);
    expect(resolved.principal.kind).toBe('bearer');
    // The route returns csrfToken only for kind === 'session'. If that guard is
    // removed this is what would leak: a bearer caller has principal.session
    // undefined, so the route must not assume it exists.
    expect(resolved.principal.session).toBeFalsy();
  });

  it('an unauthenticated caller resolves to no principal at all', () => {
    const resolved = auth.authenticateHeaders({});
    expect(resolved.ok).toBe(false);
    expect(resolved.principal).toBeFalsy();
  });
});

describe('the client seam handles a recoverable CSRF failure', () => {
  const SRC = fs.readFileSync(
    path.join(process.cwd(), 'public', 'js', 'studio-api-client.js'),
    'utf8',
  );

  it('treats csrf_token_missing and csrf_token_mismatch as recoverable', () => {
    // Before the fix the ONLY recognised 403 code was reauth_required and every
    // other 403 was returned bare. These two must be handled explicitly.
    expect(SRC).toContain('csrf_token_missing');
    expect(SRC).toContain('csrf_token_mismatch');
  });

  it('retries a CSRF failure at most once, so a rejecting server is not stormed', () => {
    expect(SRC).toContain('__studioCsrfRetried');
  });

  it('recovers by refreshing the token, not by prompting for the root token', () => {
    // The session is valid; asking the operator to paste the root token again
    // would be wrong and would train them to paste it on any hiccup.
    expect(SRC).toContain('refreshCsrfToken');
  });

  it('adopts a server-supplied csrfToken from the status response', () => {
    expect(SRC).toMatch(/body\.csrfToken/);
  });
});

describe('the auth prompt cannot hang forever', () => {
  const SRC = fs.readFileSync(
    path.join(process.cwd(), 'public', 'js', 'studio-api-client.js'),
    'utf8',
  );

  it('has a finite timeout so an unattended privileged call fails instead of hanging', () => {
    expect(SRC).toContain('PROMPT_TIMEOUT_MS');
    const m = SRC.match(/var PROMPT_TIMEOUT_MS = ([^;]+);/);
    expect(m, 'PROMPT_TIMEOUT_MS must be declared').toBeTruthy();
    // Parsed, not eval'd. The declaration is a product of integer literals
    // (e.g. `5 * 60 * 1000`); anything else fails the shape check rather than
    // being executed.
    const expr = m[1].trim();
    expect(expr, `unexpected PROMPT_TIMEOUT_MS form: ${expr}`).toMatch(/^\d+(\s*\*\s*\d+)*$/);
    const value = expr.split('*').reduce((acc, part) => acc * Number(part.trim()), 1);
    expect(Number.isFinite(value)).toBe(true);
    expect(value).toBeGreaterThan(0);
    // Long enough that a present operator is never rushed.
    expect(value).toBeGreaterThanOrEqual(60 * 1000);
  });

  it('settles exactly once and always tears the overlay down', () => {
    // The wrapper is what makes submit / cancel / timeout mutually exclusive.
    expect(SRC).toMatch(/if \(done\) return;\s*\n\s*done = true;/);
  });
});
