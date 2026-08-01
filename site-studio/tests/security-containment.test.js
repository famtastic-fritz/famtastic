/**
 * Phase 0 containment regression tests.
 *
 * These lock in the fixes for the four issues that made Site Studio remotely
 * exploitable: LAN bind, unauthenticated PTY/bridge exec, shell injection
 * through /api/bridge/exec, and site-tag path traversal.
 */

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  bindHost,
  requireLoopback,
  isLoopbackAddress,
  isSafeTag,
  assertSafeTag,
  validateTagParam,
} = require('../lib/security');

function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

describe('bindHost', () => {
  it('defaults to loopback so Studio is not reachable from the LAN', () => {
    const saved = process.env.STUDIO_HOST;
    delete process.env.STUDIO_HOST;
    expect(bindHost()).toBe('127.0.0.1');
    if (saved !== undefined) process.env.STUDIO_HOST = saved;
  });

  it('only widens when STUDIO_HOST is set explicitly', () => {
    const saved = process.env.STUDIO_HOST;
    process.env.STUDIO_HOST = '0.0.0.0';
    expect(bindHost()).toBe('0.0.0.0');
    if (saved === undefined) delete process.env.STUDIO_HOST;
    else process.env.STUDIO_HOST = saved;
  });
});

describe('requireLoopback', () => {
  it('allows same-machine callers', () => {
    for (const addr of ['127.0.0.1', '::1', '::ffff:127.0.0.1']) {
      let called = false;
      requireLoopback({ socket: { remoteAddress: addr } }, mockRes(), () => { called = true; });
      expect(called).toBe(true);
    }
  });

  it('rejects off-host callers with 403', () => {
    const res = mockRes();
    let called = false;
    requireLoopback(
      { socket: { remoteAddress: '192.168.1.50' }, method: 'POST', originalUrl: '/api/terminal/create' },
      res,
      () => { called = true; },
    );
    expect(called).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  it('ignores X-Forwarded-For so a spoofed header cannot grant access', () => {
    const res = mockRes();
    let called = false;
    requireLoopback(
      {
        socket: { remoteAddress: '10.0.0.9' },
        headers: { 'x-forwarded-for': '127.0.0.1' },
        method: 'POST',
        originalUrl: '/api/bridge/exec',
      },
      res,
      () => { called = true; },
    );
    expect(called).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  it('treats a missing remote address as untrusted', () => {
    expect(isLoopbackAddress(undefined)).toBe(false);
    expect(isLoopbackAddress('')).toBe(false);
  });
});

describe('isSafeTag', () => {
  it('accepts real site tags', () => {
    expect(isSafeTag('site-demo')).toBe(true);
    expect(isSafeTag('site-my-client-2026')).toBe(true);
  });

  it('rejects every traversal shape that previously escaped SITES_ROOT', () => {
    // '..' is the payload that renamed ~/famtastic-worktrees before this fix.
    for (const bad of ['..', '../..', '../../etc', 'site-../..', '', null, undefined, 42, 'demo']) {
      expect(isSafeTag(bad)).toBe(false);
    }
  });
});

describe('assertSafeTag', () => {
  it('returns the tag when valid so it can be used inline', () => {
    expect(assertSafeTag('site-demo')).toBe('site-demo');
  });

  it('throws rather than returning a traversable path segment', () => {
    expect(() => assertSafeTag('..')).toThrow(/Unsafe site tag/);
  });
});

describe('validateTagParam', () => {
  it('400s on a traversal tag before any filesystem call', () => {
    const res = mockRes();
    let called = false;
    validateTagParam('body', 'tag')({ body: { tag: '../..' } }, res, () => { called = true; });
    expect(called).toBe(false);
    expect(res.statusCode).toBe(400);
  });

  it('400s on a missing tag', () => {
    const res = mockRes();
    validateTagParam('body', 'tag')({ body: {} }, res, () => {});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('tag required');
  });

  it('passes a valid tag through', () => {
    let called = false;
    validateTagParam('params', 'tag')({ params: { tag: 'site-demo' } }, mockRes(), () => { called = true; });
    expect(called).toBe(true);
  });
});

describe('bridge exec allow-list', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'lib', 'bridge-routes.js'), 'utf8');

  it('no longer permits shell-capable binaries', () => {
    const match = src.match(/const ALLOWED_COMMANDS = \[(.*?)\]/s);
    expect(match).toBeTruthy();
    const list = match[1];
    for (const forbidden of ['bash', 'npm', 'node', 'sed']) {
      expect(list).not.toContain(`'${forbidden}'`);
    }
  });

  it('does not invoke a shell', () => {
    expect(src).not.toContain("execFile('bash', ['-c'");
  });
});
